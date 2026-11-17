// Heavy reckoning off the main thread. `compute(job, args, key)` runs a named pure job (see `jobs.ts`)
// in a background worker and keeps the answer for the session under `job|key`, so a screen that comes
// back shows it at once. Where there is no Worker (tests, an old WebView) or the worker fails, the
// job runs here instead, one at a time and only when the page is idle, so a paint never waits for it.
import { useEffect, useState } from "react";
import type { ComputeReply, ComputeRequest } from "./compute.worker";
import type { Args, JobName, Result } from "./jobs";

export type { Args, JobName, NextFestivalLine, Result, YearArgs, YearMonths, YearStory } from "./jobs";

/** Answers kept for the session. */
const CACHE_MAX = 60;
const cache = new Map<string, unknown>();
const inflight = new Map<string, Promise<unknown>>();

const idOf = (job: JobName, key: string): string => `${job}|${key}`;

function remember(id: string, value: unknown): void {
  cache.delete(id);
  cache.set(id, value);
  while (cache.size > CACHE_MAX) {
    const oldest = cache.keys().next();
    if (oldest.done) break;
    cache.delete(oldest.value);
  }
}

/** The kept answer for `job|key`, or undefined when there is none yet. Never computes. */
export function peek<K extends JobName>(job: K, key: string): Result<K> | undefined {
  return cache.get(idOf(job, key)) as Result<K> | undefined;
}

// ─── the main-thread path ────────────────────────────────────────────────────

type IdleWin = { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };

/** After the next paint, when the browser has a moment. */
const idle = (): Promise<void> =>
  new Promise((done) => {
    const w = globalThis as unknown as IdleWin;
    if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(() => done(), { timeout: 500 });
    else setTimeout(done, 0);
  });

let mainChain: Promise<unknown> = Promise.resolve();

function onMainThread<K extends JobName>(job: K, args: Args<K>): Promise<Result<K>> {
  const run = mainChain.then(idle).then(async () => {
    const { runJob } = await import("./jobs");
    return runJob(job, args);
  });
  mainChain = run.catch(() => undefined);
  return run;
}

// ─── the worker path ─────────────────────────────────────────────────────────

/** Quick answers go first, so a one-line teaser never waits behind a whole year. */
const WEIGHT: Record<JobName, number> = {
  familyDay: 0,
  nextFestival: 1,
  pickTeaser: 1,
  daySkies: 2,
  starDays: 2,
  festivalsBetween: 2,
  skyEvents: 3,
  yearRead: 4,
  yearStory: 5,
};

interface Task {
  n: number;
  job: JobName;
  args: Args<JobName>;
  resolve: (v: unknown) => void;
  reject: (e: unknown) => void;
}
interface Slot {
  worker: Worker;
  task: Task | null;
}

let slots: Slot[] = [];
let queue: Task[] = [];
let broken = false;
let seq = 1;

const maxWorkers = (): number => (typeof navigator !== "undefined" && (navigator.hardwareConcurrency ?? 2) >= 4 ? 2 : 1);

const handOver = (t: Task): void => {
  onMainThread(t.job, t.args).then(t.resolve, t.reject);
};

/** The worker cannot be relied on: everything waiting, and everything after, runs on the page. */
function giveUp(): void {
  broken = true;
  const waiting = [...slots.flatMap((s) => (s.task ? [s.task] : [])), ...queue];
  for (const s of slots) s.worker.terminate();
  slots = [];
  queue = [];
  for (const t of waiting.sort((a, b) => a.n - b.n)) handOver(t);
}

function spawn(): Slot | null {
  let worker: Worker;
  try {
    worker = new Worker(new URL("./compute.worker.ts", import.meta.url), { type: "module", name: "compute" });
  } catch {
    return null;
  }
  const slot: Slot = { worker, task: null };
  worker.onmessage = (e: MessageEvent<ComputeReply>) => {
    const t = slot.task;
    if (!t || e.data.id !== t.n) return;
    slot.task = null;
    if (e.data.ok) t.resolve(e.data.value);
    else handOver(t); // the job failed there: one more try here settles it either way
    pump();
  };
  worker.onerror = giveUp;
  worker.onmessageerror = giveUp;
  slots.push(slot);
  return slot;
}

function pump(): void {
  while (queue.length && !broken) {
    const free = slots.find((s) => !s.task) ?? (slots.length < maxWorkers() ? spawn() : undefined);
    if (free === null) {
      giveUp();
      return;
    }
    if (!free) return;
    let at = 0;
    for (let i = 1; i < queue.length; i++) {
      if (WEIGHT[(queue[i] as Task).job] < WEIGHT[(queue[at] as Task).job]) at = i;
    }
    const [t] = queue.splice(at, 1) as [Task];
    free.task = t;
    try {
      free.worker.postMessage({ id: t.n, job: t.job, args: t.args } satisfies ComputeRequest);
    } catch {
      // arguments that cannot be cloned
      free.task = null;
      handOver(t);
    }
  }
}

function inWorker<K extends JobName>(job: K, args: Args<K>): Promise<Result<K>> {
  return new Promise<Result<K>>((resolve, reject) => {
    queue.push({ n: seq++, job, args, resolve: resolve as (v: unknown) => void, reject });
    pump();
  });
}

// ─── the public face ─────────────────────────────────────────────────────────

/**
 * Run `job` with `args` off the main thread and keep the answer under `job|key`. `key` must name
 * everything the answer depends on (person, civil day, place, preset). Calls with the same job and
 * key share one run. Rejects only when the job itself throws; a failed answer is not kept.
 */
export function compute<K extends JobName>(job: K, args: Args<K>, key: string): Promise<Result<K>> {
  const id = idOf(job, key);
  if (cache.has(id)) return Promise.resolve(cache.get(id) as Result<K>);
  const running = inflight.get(id);
  if (running) return running as Promise<Result<K>>;
  const run = (broken || typeof Worker === "undefined" ? onMainThread(job, args) : inWorker(job, args)).then(
    (value) => {
      if (inflight.get(id) === run) {
        inflight.delete(id);
        remember(id, value);
      }
      return value;
    },
    (err) => {
      if (inflight.get(id) === run) inflight.delete(id);
      throw err;
    },
  );
  inflight.set(id, run);
  return run;
}

/**
 * The answer of a job for a component: the kept value at once when there is one (no flash when a
 * screen comes back), `undefined` while it is being worked out, and `undefined` for good when the
 * job fails (it never throws). Pass `args` null to ask for nothing. `args` is read when `job` or
 * `key` changes, so it need not be memoised.
 */
export function useCompute<K extends JobName>(job: K, args: Args<K> | null, key: string): Result<K> | undefined {
  const id = idOf(job, key);
  const off = args === null;
  const [got, setGot] = useState<{ id: string; value: Result<K> } | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the arguments
  useEffect(() => {
    if (args === null) return;
    if (cache.has(id)) {
      // held here too, so it outlives the bounded cache while this component is on screen
      setGot({ id, value: cache.get(id) as Result<K> });
      return;
    }
    let live = true;
    compute(job, args, key).then(
      (value) => {
        if (live) setGot({ id, value });
      },
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, [id, off]);
  if (off) return undefined;
  if (cache.has(id)) return cache.get(id) as Result<K>;
  return got && got.id === id ? got.value : undefined;
}

/** Forget every answer and stop the workers (tests). */
export function resetCompute(): void {
  cache.clear();
  inflight.clear();
  for (const s of slots) s.worker.terminate();
  slots = [];
  queue = [];
  broken = false;
  mainChain = Promise.resolve();
}
