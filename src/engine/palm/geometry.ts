// Stage [2]: hand shape and ratios, pure geometry on MediaPipe's worldLandmarks (metres,
// view-invariant), so it survives any camera angle and any scale. This alone is a reading.
import { CITE } from "../citations";
import type { Citation, Landmark, PalmElement } from "../types";
import { LM } from "./landmarks";

export type Vec3 = { x: number; y: number; z: number };

export const dist = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
export const sub = (a: Vec3, b: Vec3): Vec3 => ({ x: a.x - b.x, y: a.y - b.y, z: a.z - b.z });

/** Angle between two vectors, degrees in [0, 180]; 0 for a zero-length vector (never NaN). */
export function angleBetween(u: Vec3, v: Vec3): number {
  const nu = Math.hypot(u.x, u.y, u.z);
  const nv = Math.hypot(v.x, v.y, v.z);
  if (nu < 1e-12 || nv < 1e-12) return 0;
  const c = (u.x * v.x + u.y * v.y + u.z * v.z) / (nu * nv);
  return (Math.acos(Math.max(-1, Math.min(1, c))) * 180) / Math.PI;
}

/** Thresholds are inclusive (`>=`): exactly 0.90 / 0.80 is square / long, asserted in tests. */
export const SQUARE_MIN = 0.9;
export const LONG_FINGERS_MIN = 0.8;

/** Float slack so a ratio that is 0.90 on paper but 0.8999999999 in binary still counts as 0.90. */
const EPS = 1e-9;

export function elementOf(widthOverLength: number, fingerOverPalm: number): PalmElement {
  const square = widthOverLength >= SQUARE_MIN - EPS;
  const longFingers = fingerOverPalm >= LONG_FINGERS_MIN - EPS;
  return square ? (longFingers ? "air" : "earth") : longFingers ? "water" : "fire";
}

export interface Measure {
  value: number;
  band: string;
  citation: Citation;
}

export interface HandGeometry {
  element: PalmElement;
  ratios: { widthOverLength: number; fingerOverPalm: number; indexOverRing: number; thumbAngleDeg: number };
  measures: {
    widthOverLength: Measure;
    fingerOverPalm: Measure;
    indexOverRing: Measure;
    thumbAngleDeg: Measure;
  };
}

const bandWL = (v: number): string => (v >= SQUARE_MIN - EPS ? "square palm" : "oblong palm");
const bandFL = (v: number): string => (v >= LONG_FINGERS_MIN - EPS ? "long fingers" : "short fingers");
/** 2D:4D. Within ±3 % the two fingers read as even, no sentence is claimed for "even". */
export const INDEX_LONG_MIN = 1.0;
export const RING_LONG_MAX = 0.97;
const bandIR = (v: number): string => (v >= INDEX_LONG_MIN ? "index longer" : v < RING_LONG_MAX ? "ring longer" : "about even");
/** Thumb spread against the palm axis. 35-45° is the unremarkable middle. */
export const THUMB_FLEXIBLE_MIN = 45;
export const THUMB_FIRM_MAX = 35;
const bandTA = (v: number): string => (v >= THUMB_FLEXIBLE_MIN ? "wide spread" : v < THUMB_FIRM_MAX ? "close-held" : "moderate");

/**
 * Element and ratios from the 21 world landmarks. Returns null (never NaN) when the hand is
 * degenerate, the caller shows "no hand in frame" rather than a reading of nothing.
 */
export function handGeometry(w: readonly Landmark[]): HandGeometry | null {
  const p = (i: number): Landmark | undefined => w[i];
  const wrist = p(LM.WRIST);
  const iMcp = p(LM.INDEX_MCP);
  const iTip = p(LM.INDEX_TIP);
  const mMcp = p(LM.MIDDLE_MCP);
  const mTip = p(LM.MIDDLE_TIP);
  const rMcp = p(LM.RING_MCP);
  const rTip = p(LM.RING_TIP);
  const pMcp = p(LM.PINKY_MCP);
  const tMcp = p(LM.THUMB_MCP);
  const tTip = p(LM.THUMB_TIP);
  if (!wrist || !iMcp || !iTip || !mMcp || !mTip || !rMcp || !rTip || !pMcp || !tMcp || !tTip) return null;
  const L = dist(wrist, mMcp); // palm length: WRIST -> MIDDLE_MCP
  const W = dist(iMcp, pMcp); // palm width: INDEX_MCP -> PINKY_MCP
  const F = dist(mMcp, mTip); // middle finger: MIDDLE_MCP -> MIDDLE_TIP
  const ring = dist(rMcp, rTip);
  if (!(L > 1e-9) || !(W > 1e-9) || !(F > 1e-9) || !(ring > 1e-9)) return null;
  const widthOverLength = W / L;
  const fingerOverPalm = F / L;
  const indexOverRing = dist(iMcp, iTip) / ring;
  const thumbAngleDeg = angleBetween(sub(tTip, tMcp), sub(mMcp, wrist));
  const ratios = { widthOverLength, fingerOverPalm, indexOverRing, thumbAngleDeg };
  if (!Object.values(ratios).every(Number.isFinite)) return null;
  return {
    element: elementOf(widthOverLength, fingerOverPalm),
    ratios,
    measures: {
      widthOverLength: { value: widthOverLength, band: bandWL(widthOverLength), citation: CITE.gettingsElements },
      fingerOverPalm: { value: fingerOverPalm, band: bandFL(fingerOverPalm), citation: CITE.gettingsElements },
      indexOverRing: { value: indexOverRing, band: bandIR(indexOverRing), citation: CITE.samudrikaFingers },
      thumbAngleDeg: { value: thumbAngleDeg, band: bandTA(thumbAngleDeg), citation: CITE.cheiroThumb },
    },
  };
}
