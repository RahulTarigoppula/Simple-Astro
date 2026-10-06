// Stage [1] gating (IMPLEMENTATION-PROMPT §6.13). A pure function over MediaPipe's 21 landmarks:
// it decides whether a frame is a hand we may read, and says why not when it is not.
import type { Landmark } from "../types";

/** MediaPipe hand landmark indices. */
export const LM = {
  WRIST: 0,
  THUMB_CMC: 1,
  THUMB_MCP: 2,
  THUMB_IP: 3,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_DIP: 7,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_DIP: 11,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_DIP: 15,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_DIP: 19,
  PINKY_TIP: 20,
} as const;

export const LANDMARK_COUNT = 21;
/** MediaPipe handedness confidence below this is not read (§5: reject < 0.8). */
export const MIN_HANDEDNESS_SCORE = 0.8;

export type GateReason = "uncertain-hand" | "landmark-off-frame" | "palm-not-facing" | "degenerate";
export type GateResult = { ok: true } | { ok: false; reason: GateReason };
export type Hand = "right" | "left";

/** Owner-facing copy for each refusal — plain, never an error code. */
export const GATE_COPY: Record<GateReason, string> = {
  "uncertain-hand": "no hand in frame",
  "landmark-off-frame": "fill the frame, but keep the whole hand inside it",
  "palm-not-facing": "turn your palm to the camera",
  degenerate: "no hand in frame",
};

const finite = (p: Landmark | undefined): p is Landmark =>
  p !== undefined && Number.isFinite(p.x) && Number.isFinite(p.y) && Number.isFinite(p.z);

/** True when the landmark set cannot describe a hand: wrong count, NaN, or collapsed to a point/line. */
export function isDegenerate(lm: readonly Landmark[]): boolean {
  if (lm.length !== LANDMARK_COUNT) return true;
  let minX = Number.POSITIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;
  for (const p of lm) {
    if (!finite(p)) return true;
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  // A hand spans an area; identical or collinear points do not.
  if (maxX - minX < 1e-6 || maxY - minY < 1e-6) return true;
  return Math.abs(palmOrientation(lm)) < 1e-9;
}

/**
 * Signed area of the triangle WRIST → INDEX_MCP → PINKY_MCP in image space (y grows downward).
 * Positive for a right palm (or the back of a left hand) facing the camera, at any in-plane rotation.
 * Upright, this is exactly the §6.13 test `THUMB_CMC.x < PINKY_MCP.x`, made rotation-proof.
 */
export function palmOrientation(lm: readonly Landmark[]): number {
  const w = lm[LM.WRIST];
  const i = lm[LM.INDEX_MCP];
  const p = lm[LM.PINKY_MCP];
  if (!w || !i || !p) return 0;
  return (i.x - w.x) * (p.y - w.y) - (i.y - w.y) * (p.x - w.x);
}

/**
 * Palm (not back) toward the camera for the given hand. Mirrored for a left hand.
 * `hand` is MediaPipe's *raw* handedness label, which assumes a mirrored (selfie) image. Using the
 * raw label makes the test independent of mirroring: it asks "do the classifier and the geometry
 * agree?" — the back of a hand is the one view where they cannot.
 */
export function isPalmFacing(lm: readonly Landmark[], hand: Hand): boolean {
  const s = palmOrientation(lm);
  return hand === "right" ? s > 0 : s < 0;
}

/**
 * The gate, in a fixed order: degenerate → uncertain-hand → landmark-off-frame → palm-not-facing.
 * Never returns NaN or throws on garbage input.
 */
export function gateHand(lm: readonly Landmark[], hand: Hand, score: number): GateResult {
  if (isDegenerate(lm)) return { ok: false, reason: "degenerate" };
  if (!Number.isFinite(score) || score < MIN_HANDEDNESS_SCORE) return { ok: false, reason: "uncertain-hand" };
  for (const p of lm) {
    if (p.x < 0 || p.x > 1 || p.y < 0 || p.y > 1) return { ok: false, reason: "landmark-off-frame" };
  }
  if (!isPalmFacing(lm, hand)) return { ok: false, reason: "palm-not-facing" };
  return { ok: true };
}
