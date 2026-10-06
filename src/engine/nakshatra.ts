// Nakṣatra, pada and sign classification (§6.6). Every interval is half-open [a, b).
// Indices are computed as floor(λ · n / 360) rather than floor(λ / (360 / n)) so exact multiples
// (λ = 40°, 120°, …) land in the later interval: 360/27 is not representable, its quotient is.
import { NAK_LORDS, NAKSHATRA_NAMES, SIGN_NAMES } from "../data/tables/names";
import { norm360 } from "./math";
import type { Deg, GrahaId, SignIdx } from "./types";

export const NAK_SPAN = 360 / 27; // 13.333…°
export const PADA_SPAN = NAK_SPAN / 4; // 3.333…°

export interface NakshatraInfo {
  index: number; // 0..26, Aśvinī = 0
  pada: 1 | 2 | 3 | 4;
  lord: GrahaId;
  name: string;
}

/** Sign index 0..11 of a sidereal longitude. */
export function signOf(lonSid: Deg): SignIdx {
  return Math.min(11, Math.floor(norm360(lonSid) / 30)) as SignIdx;
}

/** Degrees into the sign, [0, 30). */
export function degInSignOf(lonSid: Deg): number {
  const l = norm360(lonSid);
  return l - signOf(l) * 30;
}

/** 0..26. */
export function nakshatraIndexOf(lonSid: Deg): number {
  return Math.min(26, Math.floor((norm360(lonSid) * 27) / 360));
}

/** Pada counted across the zodiac, 0..107 (the navāṃśa index). */
export function padaIndexOf(lonSid: Deg): number {
  return Math.min(107, Math.floor((norm360(lonSid) * 108) / 360));
}

export function nakshatraLordOf(index: number): GrahaId {
  return NAK_LORDS[((index % 9) + 9) % 9] as GrahaId;
}

export function nakshatraOf(lonSid: Deg): NakshatraInfo {
  const index = nakshatraIndexOf(lonSid);
  const pada = ((padaIndexOf(lonSid) % 4) + 1) as 1 | 2 | 3 | 4;
  return { index, pada, lord: nakshatraLordOf(index), name: NAKSHATRA_NAMES[index] ?? "" };
}

/** Fraction of the current nakṣatra already traversed, [0, 1). */
export function nakshatraFraction(lonSid: Deg): number {
  const l = norm360(lonSid);
  const f = (l - nakshatraIndexOf(l) * NAK_SPAN) / NAK_SPAN;
  return f < 0 ? 0 : f >= 1 ? 1 - Number.EPSILON : f;
}

export const signName = (s: number): string => SIGN_NAMES[((s % 12) + 12) % 12] ?? "";
export const nakshatraName = (n: number): string => NAKSHATRA_NAMES[((n % 27) + 27) % 27] ?? "";
