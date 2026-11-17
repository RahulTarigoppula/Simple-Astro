import { render, renderHook, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ComputeReply, ComputeRequest } from "./compute.worker";
import { type Args, compute, peek, resetCompute, useCompute } from "./index";

// The jobs themselves are engine code with their own tests; here a job is a counter that echoes.
const ran = vi.hoisted(() => ({ main: [] as string[] }));
vi.mock("./jobs", () => ({
  runJob: (job: string, args: { fail?: boolean; tag?: string }) => {
    ran.main.push(`${job}:${args.tag ?? ""}`);
    if (args.fail) throw new Error("cannot be read");
    return [{ job, tag: args.tag ?? "" }];
  },
}));

const sky = (tag: string, fail = false) => ({ tag, fail }) as unknown as Args<"skyEvents">;

/** A stand-in Worker: answers on a later tick, records what it was asked, and can be told to misbehave. */
class FakeWorker {
  static made: FakeWorker[] = [];
  /** Every job sent to any worker, in the order sent. */
  static sent: string[] = [];
  static mode: "ok" | "job-fails" | "crash" = "ok";
  asked: ComputeRequest[] = [];
  onmessage: ((e: MessageEvent<ComputeReply>) => void) | null = null;
  onerror: (() => void) | null = null;
  onmessageerror: (() => void) | null = null;
  terminated = false;
  constructor() {
    FakeWorker.made.push(this);
  }
  postMessage(m: ComputeRequest): void {
    this.asked.push(m);
    FakeWorker.sent.push(m.job);
    setTimeout(() => {
      if (this.terminated) return;
      if (FakeWorker.mode === "crash") return this.onerror?.();
      const data: ComputeReply =
        FakeWorker.mode === "ok"
          ? { id: m.id, ok: true, value: [{ job: m.job, from: "worker" }] as never }
          : { id: m.id, ok: false, reason: "threw" };
      this.onmessage?.({ data } as MessageEvent<ComputeReply>);
    }, 5);
  }
  terminate(): void {
    this.terminated = true;
  }
}

beforeEach(() => {
  resetCompute();
  ran.main.length = 0;
  FakeWorker.made = [];
  FakeWorker.sent = [];
  FakeWorker.mode = "ok";
});
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("compute without a Worker (tests, an old WebView)", () => {
  it("runs the job on the page, but never inside the call that asked for it", async () => {
    const p = compute("skyEvents", sky("a"), "k1");
    expect(ran.main).toEqual([]);
    expect(peek("skyEvents", "k1")).toBeUndefined();
    expect(await p).toEqual([{ job: "skyEvents", tag: "a" }]);
    expect(ran.main).toEqual(["skyEvents:a"]);
  });

  it("keeps the answer under job|key: a second call and peek get the very same value without a second run", async () => {
    const first = await compute("skyEvents", sky("a"), "k1");
    expect(peek("skyEvents", "k1")).toBe(first);
    expect(await compute("skyEvents", sky("other args, same key"), "k1")).toBe(first);
    expect(peek("starDays", "k1")).toBeUndefined();
    expect(ran.main).toHaveLength(1);
  });

  it("shares one run between calls made while it is in flight", async () => {
    const a = compute("skyEvents", sky("a"), "k1");
    const b = compute("skyEvents", sky("a"), "k1");
    expect(b).toBe(a);
    const c = compute("skyEvents", sky("c"), "k2");
    await Promise.all([a, b, c]);
    expect(ran.main).toEqual(["skyEvents:a", "skyEvents:c"]);
  });

  it("rejects when the job throws, keeps nothing, and tries again when asked again", async () => {
    await expect(compute("skyEvents", sky("bad", true), "k1")).rejects.toThrow("cannot be read");
    expect(peek("skyEvents", "k1")).toBeUndefined();
    expect(await compute("skyEvents", sky("good"), "k1")).toEqual([{ job: "skyEvents", tag: "good" }]);
  });

  it("holds at most sixty answers, dropping the oldest", async () => {
    for (let i = 0; i < 62; i++) await compute("skyEvents", sky(String(i)), `k${i}`);
    expect(peek("skyEvents", "k0")).toBeUndefined();
    expect(peek("skyEvents", "k1")).toBeUndefined();
    expect(peek("skyEvents", "k2")).toBeDefined();
    expect(peek("skyEvents", "k61")).toBeDefined();
  });
});

describe("compute with a Worker", () => {
  beforeEach(() => {
    vi.stubGlobal("Worker", FakeWorker);
  });

  it("sends the job to the worker and keeps its answer; nothing runs on the page", async () => {
    const v = await compute("skyEvents", sky("a"), "k1");
    expect(v).toEqual([{ job: "skyEvents", from: "worker" }]);
    expect(peek("skyEvents", "k1")).toBe(v);
    expect(ran.main).toEqual([]);
    expect(FakeWorker.made[0]?.asked.map((m) => m.job)).toEqual(["skyEvents"]);
  });

  it("de-duplicates in-flight calls: the worker is asked once", async () => {
    const [a, b] = await Promise.all([compute("skyEvents", sky("a"), "k1"), compute("skyEvents", sky("a"), "k1")]);
    expect(a).toBe(b);
    expect(FakeWorker.made.flatMap((w) => w.asked)).toHaveLength(1);
  });

  it("uses at most two workers and sends the quick jobs ahead of the heavy ones", async () => {
    const all = [
      compute("yearRead", sky("y") as never, "a"),
      compute("yearStory", sky("s") as never, "a"),
      compute("skyEvents", sky("e"), "a"),
      compute("familyDay", sky("f") as never, "a"),
    ];
    await Promise.all(all);
    expect(FakeWorker.made.length).toBeLessThanOrEqual(2);
    const order = FakeWorker.sent;
    expect(order).toHaveLength(4);
    // whatever was already running stays; of those still waiting, the day comes before the sky, the sky before the story
    const waiting = order.slice(FakeWorker.made.length);
    const rank = ["familyDay", "skyEvents", "yearRead", "yearStory"];
    expect(waiting).toEqual([...waiting].sort((x, y) => rank.indexOf(x) - rank.indexOf(y)));
  });

  it("when a job fails in the worker it is run once more on the page", async () => {
    FakeWorker.mode = "job-fails";
    expect(await compute("skyEvents", sky("a"), "k1")).toEqual([{ job: "skyEvents", tag: "a" }]);
    expect(ran.main).toEqual(["skyEvents:a"]);
    await expect(compute("skyEvents", sky("b", true), "k2")).rejects.toThrow("cannot be read");
  });

  it("when the worker dies, what was waiting and everything after runs on the page", async () => {
    FakeWorker.mode = "crash";
    const [a, b] = await Promise.all([compute("skyEvents", sky("a"), "k1"), compute("starDays", sky("b") as never, "k1")]);
    expect(a).toEqual([{ job: "skyEvents", tag: "a" }]);
    expect(b).toEqual([{ job: "starDays", tag: "b" }]);
    expect(FakeWorker.made.every((w) => w.terminated)).toBe(true);
    const made = FakeWorker.made.length;
    expect(await compute("skyEvents", sky("c"), "k3")).toEqual([{ job: "skyEvents", tag: "c" }]);
    expect(FakeWorker.made).toHaveLength(made);
  });

  it("when a Worker cannot be made at all, the page does the work", async () => {
    vi.stubGlobal(
      "Worker",
      class {
        constructor() {
          throw new Error("blocked");
        }
      },
    );
    expect(await compute("skyEvents", sky("a"), "k1")).toEqual([{ job: "skyEvents", tag: "a" }]);
  });
});

describe("useCompute", () => {
  function Show({ k, fail = false, off = false }: { k: string; fail?: boolean; off?: boolean }) {
    const v = useCompute("skyEvents", off ? null : sky(k, fail), k);
    return <p>{v === undefined ? "pending" : JSON.stringify(v)}</p>;
  }

  it("is undefined while pending, then the answer", async () => {
    render(<Show k="k1" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(await screen.findByText(/"tag":"k1"/)).toBeInTheDocument();
  });

  it("gives the kept value on the very first render of a re-mount (no flash)", async () => {
    const first = render(<Show k="k1" />);
    await screen.findByText(/"tag":"k1"/);
    first.unmount();
    const seen: unknown[] = [];
    renderHook(() => {
      const v = useCompute("skyEvents", sky("k1"), "k1");
      seen.push(v);
      return v;
    });
    expect(seen[0]).toBe(peek("skyEvents", "k1"));
    expect(ran.main).toHaveLength(1);
  });

  it("follows the key: pending again for a new key, the old answer never shown under it", async () => {
    const view = render(<Show k="k1" />);
    await screen.findByText(/"tag":"k1"/);
    view.rerender(<Show k="k2" />);
    expect(screen.getByText("pending")).toBeInTheDocument();
    expect(await screen.findByText(/"tag":"k2"/)).toBeInTheDocument();
  });

  it("stays undefined and does not throw when the job fails", async () => {
    render(<Show k="bad" fail />);
    await waitFor(() => expect(ran.main).toEqual(["skyEvents:bad"]));
    await new Promise((r) => setTimeout(r, 20));
    expect(screen.getByText("pending")).toBeInTheDocument();
  });

  it("asks for nothing while args is null", async () => {
    const view = render(<Show k="k1" off />);
    await new Promise((r) => setTimeout(r, 20));
    expect(ran.main).toEqual([]);
    expect(screen.getByText("pending")).toBeInTheDocument();
    view.rerender(<Show k="k1" />);
    expect(await screen.findByText(/"tag":"k1"/)).toBeInTheDocument();
  });
});
