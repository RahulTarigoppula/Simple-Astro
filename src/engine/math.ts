// Shared numeric helpers. Degree trigonometry, wrap-safe differences, and the only PRNG in the app.

export const D2R = Math.PI / 180;
export const R2D = 180 / Math.PI;

/** Normalise an angle to [0, 360). */
export function norm360(a: number): number {
  const r = a % 360;
  const v = r < 0 ? r + 360 : r;
  // A tiny negative r (e.g. −1e-15) rounds to exactly 360 when 360 is added; fold it back to 0.
  return v >= 360 ? 0 : v;
}

export const sind = (d: number): number => Math.sin(d * D2R);
export const cosd = (d: number): number => Math.cos(d * D2R);
export const tand = (d: number): number => Math.tan(d * D2R);
export const atan2d = (y: number, x: number): number => Math.atan2(y, x) * R2D;
export const asind = (x: number): number => Math.asin(x) * R2D;

/** b − a as a signed difference in (−180, 180], so the 360→0 wrap never breaks a comparison. */
export function signedDelta(a: number, b: number): number {
  let d = norm360(b - a);
  if (d > 180) d -= 360;
  return d;
}

export const clamp = (v: number, lo: number, hi: number): number => (v < lo ? lo : v > hi ? hi : v);

/** Deterministic 32-bit PRNG. `Math.random` is never used anywhere in Chowki. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** FNV-1a string hash → 32-bit unsigned seed. */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** Split decimal degrees into whole degrees, minutes and rounded seconds (carrying 60s). */
export function dms(x: number): [number, number, number] {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);
  let d = Math.floor(ax);
  const mf = (ax - d) * 60;
  let m = Math.floor(mf);
  let s = Math.round((mf - m) * 60);
  if (s === 60) {
    s = 0;
    m += 1;
  }
  if (m === 60) {
    m = 0;
    d += 1;
  }
  return [sign * d, m, s];
}

/** `23°46′48″` — degrees, minutes, seconds, zero-padded. */
export function formatDms(x: number): string {
  const [d, m, s] = dms(x);
  return `${d}°${String(m).padStart(2, "0")}′${String(s).padStart(2, "0")}″`;
}

/** `1′42″` — an arcminute distance as minutes and seconds. */
export function formatArcmin(arcmin: number): string {
  const total = Math.round(arcmin * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}′${String(s).padStart(2, "0")}″`;
}

export const MS_PER_DAY = 86_400_000;
export const JD_UNIX_EPOCH = 2440587.5;
export const msToJd = (ms: number): number => ms / MS_PER_DAY + JD_UNIX_EPOCH;
export const jdToMs = (jd: number): number => (jd - JD_UNIX_EPOCH) * MS_PER_DAY;
