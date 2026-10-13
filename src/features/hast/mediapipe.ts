// Stage [1]: MediaPipe HandLandmarker (IMAGE mode, one hand), lazily loaded from our own origin.
// Paths are built from import.meta.env.BASE_URL, a bare "/models/…" 404s on a sub-path host.
// GPU delegate first, CPU on failure; one cached singleton; the module itself is a dynamic import
// so the 300 kB loader never touches the entry chunk.
import type { HandLandmarker } from "@mediapipe/tasks-vision";
import type { Landmark } from "../../engine/types";

const BASE = import.meta.env.BASE_URL;
export const MEDIAPIPE_WASM = `${BASE}mediapipe`;
export const HAND_MODEL = `${BASE}models/hand_landmarker.task`;

let instance: HandLandmarker | null = null;
let loading: Promise<HandLandmarker> | null = null;
let delegateUsed: "GPU" | "CPU" | null = null;

async function create(): Promise<HandLandmarker> {
  const { FilesetResolver, HandLandmarker: HL } = await import("@mediapipe/tasks-vision");
  const fileset = await FilesetResolver.forVisionTasks(MEDIAPIPE_WASM);
  const opts = (delegate: "GPU" | "CPU") => ({
    baseOptions: { modelAssetPath: HAND_MODEL, delegate },
    numHands: 1,
    runningMode: "IMAGE" as const,
  });
  try {
    const hl = await HL.createFromOptions(fileset, opts("GPU"));
    delegateUsed = "GPU";
    return hl;
  } catch {
    const hl = await HL.createFromOptions(fileset, opts("CPU"));
    delegateUsed = "CPU";
    return hl;
  }
}

/** Load (once) the landmarker. Idempotent; a failed load may be retried by calling again. */
export async function loadHandLandmarker(): Promise<void> {
  if (instance) return;
  loading ??= create();
  try {
    instance = await loading;
  } catch (e) {
    loading = null;
    throw e;
  }
}

export const handLandmarkerReady = (): boolean => instance !== null;
export const handLandmarkerDelegate = (): "GPU" | "CPU" | null => delegateUsed;

export type HandSource = HTMLCanvasElement | ImageBitmap | HTMLImageElement | HTMLVideoElement;

export type DetectResult =
  | {
      ok: true;
      landmarks: Landmark[];
      worldLandmarks: Landmark[];
      /**
       * MediaPipe's RAW handedness label. MediaPipe assumes a mirrored (selfie) image, so for a
       * rear-camera or gallery photo the physical hand is the opposite, see `physicalHand`.
       * Pass THIS value to gateHand(): its palm-vs-back test is defined on the raw label.
       */
      handedness: "right" | "left";
      /** The physical hand for an unmirrored photo (rear camera, gallery). */
      physicalHand: "right" | "left";
      score: number;
    }
  | { ok: false; reason: "model-unavailable" | "no-hand" };

/** Detect one hand. Never throws: a model that cannot load reads as `model-unavailable`. */
export async function detectHand(source: HandSource): Promise<DetectResult> {
  try {
    await loadHandLandmarker();
  } catch {
    return { ok: false, reason: "model-unavailable" };
  }
  const hl = instance;
  if (!hl) return { ok: false, reason: "model-unavailable" };
  let res: ReturnType<HandLandmarker["detect"]>;
  try {
    res = hl.detect(source);
  } catch {
    return { ok: false, reason: "no-hand" };
  }
  const lm = res.landmarks[0];
  const world = res.worldLandmarks[0];
  const cat = res.handedness[0]?.[0];
  if (!lm || !world || !cat || lm.length !== 21) return { ok: false, reason: "no-hand" };
  const raw: "right" | "left" = cat.categoryName.toLowerCase() === "left" ? "left" : "right";
  const strip = (p: { x: number; y: number; z: number }): Landmark => ({ x: p.x, y: p.y, z: p.z });
  return {
    ok: true,
    landmarks: lm.map(strip),
    worldLandmarks: world.map(strip),
    handedness: raw,
    physicalHand: raw === "right" ? "left" : "right",
    score: cat.score,
  };
}

/** Release the landmarker (e.g. when leaving the capture screen for good). */
export function closeHandLandmarker(): void {
  instance?.close();
  instance = null;
  loading = null;
}
