// The main-thread side of the palm worker. One worker per session, created on first use (so the
// OpenCV chunk is only fetched when lines are actually requested) and kept warm afterwards.
// If a worker cannot be created or dies, the pure-TS pipeline runs here instead — slower, but the
// reading is never blocked.
import type { Landmark, PalmLine } from "../../engine/types";
import type { PalmJob, PalmWorkerMessage } from "./palm.worker";

export interface ExtractResult {
  /** the canonical 512 × 512 print */
  rectified: ImageData;
  /** original-pixel → canonical, row-major 3 × 3 */
  homography: number[];
  lines: PalmLine[];
  suggestTrace: boolean;
  engine: "opencv" | "pure-ts";
}

export type Stage = "loading-cv" | "working";

/** OpenCV gets 20 s to load inside the worker; the whole job gets this long before the main thread takes over. */
const WORKER_TIMEOUT_MS = 45_000;

let worker: Worker | null = null;
let seq = 1;
const pending = new Map<
  number,
  { resolve: (m: Extract<PalmWorkerMessage, { type: "done" }>) => void; onStage?: ((s: Stage) => void) | undefined }
>();

function getWorker(): Worker | null {
  if (worker) return worker;
  if (typeof Worker === "undefined") return null;
  try {
    worker = new Worker(new URL("./palm.worker.ts", import.meta.url), { type: "module", name: "palm" });
  } catch {
    return null;
  }
  worker.onmessage = (e: MessageEvent<PalmWorkerMessage>) => {
    const m = e.data;
    const p = pending.get(m.id);
    if (!p) return;
    if (m.type === "stage") p.onStage?.(m.stage);
    else {
      pending.delete(m.id);
      p.resolve(m);
    }
  };
  worker.onerror = () => {
    // a dead worker fails every job in flight over to the main-thread path
    const jobs = [...pending.entries()];
    pending.clear();
    worker?.terminate();
    worker = null;
    for (const [id, p] of jobs) p.resolve({ id, type: "done", ok: false, reason: "worker-crashed" });
  };
  return worker;
}

async function onMainThread(image: ImageData, landmarks: Landmark[], hand: "right" | "left"): Promise<ExtractResult> {
  const { runPalmPipeline } = await import("../../engine/palm/pipeline");
  const r = runPalmPipeline(image, landmarks, { hand });
  if (!r.ok) throw new Error(`palm: ${r.reason}`);
  return {
    rectified: new ImageData(new Uint8ClampedArray(r.print.data), r.print.width, r.print.height),
    homography: r.homography,
    lines: r.lines,
    suggestTrace: r.suggestTrace,
    engine: "pure-ts",
  };
}

/**
 * Rectify the photo and extract the lines. "No lines" is not an error: it returns `lines: []` and
 * `suggestTrace: true`. Throws only on genuine failure (e.g. landmarks that cannot define a print).
 */
export async function extractLines(
  image: ImageData,
  landmarks: Landmark[],
  hand: "right" | "left",
  onStage?: (s: Stage) => void,
): Promise<ExtractResult> {
  const w = getWorker();
  if (!w) {
    onStage?.("working");
    return onMainThread(image, landmarks, hand);
  }
  const id = seq++;
  // copy, so the caller's ImageData stays usable after the transfer
  const rgba = new Uint8ClampedArray(image.data).buffer;
  const job: PalmJob = { id, rgba, width: image.width, height: image.height, landmarks, hand };
  const msg = await new Promise<Extract<PalmWorkerMessage, { type: "done" }>>((resolve) => {
    // Watchdog: a worker that neither answers nor errors is terminated and the job runs here.
    const timer = setTimeout(() => {
      if (!pending.delete(id)) return;
      worker?.terminate();
      worker = null;
      resolve({ id, type: "done", ok: false, reason: "worker-timeout" });
    }, WORKER_TIMEOUT_MS);
    pending.set(id, {
      resolve: (m) => {
        clearTimeout(timer);
        resolve(m);
      },
      onStage,
    });
    w.postMessage(job, [rgba]);
  });
  if (msg.ok) {
    if (import.meta.env.DEV && msg.mats.created !== msg.mats.deleted) {
      console.warn(`palm worker: cv.Mat leak — ${msg.mats.created} created, ${msg.mats.deleted} deleted`);
    }
    return {
      rectified: new ImageData(new Uint8ClampedArray(msg.rectified), 512, 512),
      homography: msg.homography,
      lines: msg.lines,
      suggestTrace: msg.suggestTrace,
      engine: msg.engine,
    };
  }
  if (msg.reason === "degenerate") throw new Error("palm: degenerate");
  // the worker failed for another reason: do it here rather than leave the owner without a print
  onStage?.("working");
  return onMainThread(image, landmarks, hand);
}

/** Start the worker (and its OpenCV load) ahead of need — e.g. once a hand is in frame. */
export function warmPalmWorker(): void {
  getWorker();
}

/** Stop the worker (frees the OpenCV heap). */
export function disposePalmWorker(): void {
  worker?.terminate();
  worker = null;
}
