// Stages [3]–[6] off the main thread (§6.13). OpenCV.js is instantiated INSIDE this worker by a
// dynamic import (its own lazy chunk, never in the entry graph) and kept warm between runs. If it
// fails to load — or a cv step throws — the same pipeline runs on the pure-TS ops: slower, honest,
// and the reading is never blocked. Only the lines, the homography and the 512 × 512 RGBA print
// are transferred back.
import { asCv, type CvLike, makeCvOps } from "../../engine/palm/cv-ops";
import { type PipelineOutcome, runPalmPipeline } from "../../engine/palm/pipeline";
import type { Landmark, PalmLine } from "../../engine/types";

export interface PalmJob {
  id: number;
  rgba: ArrayBuffer;
  width: number;
  height: number;
  landmarks: Landmark[];
  hand: "right" | "left";
}

export type PalmWorkerMessage =
  | { id: number; type: "stage"; stage: "loading-cv" | "working" }
  | {
      id: number;
      type: "done";
      ok: true;
      rectified: ArrayBuffer;
      homography: number[];
      lines: PalmLine[];
      suggestTrace: boolean;
      engine: "opencv" | "pure-ts";
      mats: { created: number; deleted: number };
      ms: number;
    }
  | { id: number; type: "done"; ok: false; reason: string };

interface WorkerScope {
  onmessage: ((e: MessageEvent<PalmJob>) => void) | null;
  postMessage(message: PalmWorkerMessage, transfer?: Transferable[]): void;
}
const scope = self as unknown as WorkerScope;

/** Cumulative cv.Mat bookkeeping for this worker's lifetime (debug; must stay balanced). */
const counter = { created: 0, deleted: 0 };
const CV_LOAD_TIMEOUT_MS = 20_000;
// Boxed: the emscripten Module is a thenable, so resolving a promise WITH it would recurse forever.
let cvPromise: Promise<{ cv: CvLike | null }> | null = null;

function loadCv(): Promise<{ cv: CvLike | null }> {
  cvPromise ??= Promise.race([
    (async (): Promise<{ cv: CvLike | null }> => {
      try {
        const { box } = await import("./opencv");
        const m = box.cv as { Mat?: unknown; onRuntimeInitialized?: () => void };
        // The emscripten Module is thenable; it is never awaited or resolved with directly.
        await new Promise<void>((resolve) => {
          if (m.Mat) resolve();
          else m.onRuntimeInitialized = () => resolve();
        });
        return { cv: asCv(box.cv) };
      } catch {
        return { cv: null };
      }
    })(),
    new Promise<{ cv: CvLike | null }>((resolve) => setTimeout(() => resolve({ cv: null }), CV_LOAD_TIMEOUT_MS)),
  ]);
  return cvPromise;
}

scope.onmessage = (e: MessageEvent<PalmJob>) => {
  void handle(e.data);
};

async function handle(job: PalmJob): Promise<void> {
  const t0 = performance.now();
  try {
    scope.postMessage({ id: job.id, type: "stage", stage: "loading-cv" });
    const { cv } = await loadCv();
    scope.postMessage({ id: job.id, type: "stage", stage: "working" });
    const img = { data: new Uint8ClampedArray(job.rgba), width: job.width, height: job.height };
    let engine: "opencv" | "pure-ts" = "pure-ts";
    let result: PipelineOutcome | null = null;
    if (cv) {
      try {
        result = runPalmPipeline(img, job.landmarks, { hand: job.hand }, makeCvOps(cv, counter));
        engine = "opencv";
      } catch {
        result = null; // fall through to the pure path
      }
    }
    if (!result) result = runPalmPipeline(img, job.landmarks, { hand: job.hand });
    if (!result.ok) {
      scope.postMessage({ id: job.id, type: "done", ok: false, reason: result.reason });
      return;
    }
    const rectified = new Uint8ClampedArray(result.print.data).buffer;
    scope.postMessage(
      {
        id: job.id,
        type: "done",
        ok: true,
        rectified,
        homography: result.homography,
        lines: result.lines,
        suggestTrace: result.suggestTrace,
        engine,
        mats: { ...counter },
        ms: Math.round(performance.now() - t0),
      },
      [rectified],
    );
  } catch (err) {
    scope.postMessage({ id: job.id, type: "done", ok: false, reason: err instanceof Error ? err.message : String(err) });
  }
}
