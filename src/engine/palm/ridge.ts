// Stage [5]: multi-scale Hessian ridge filter (Frangi-style vesselness for bright ridges), then
// non-maximum suppression across the ridge, hysteresis at 0.28 / 0.12 of the 99th-percentile
// response, and a 3 × 3 closing. Plain TypedArrays (§6.13).
import { convolveSeparable, d2Gauss, dGauss, gauss, positivePercentile } from "./image";

export interface Ridges {
  /** max vesselness over scales, 0..1 */
  response: Float32Array;
  /** unit normal (across the ridge) at the winning scale */
  nx: Float32Array;
  ny: Float32Array;
}

/** Frangi-style 2D vesselness for bright ridges, with the across-ridge direction kept for NMS. */
export function ridgeFilter(img: Float32Array, w: number, h: number, sigmas: readonly number[] = [2, 3, 4]): Ridges {
  const out = new Float32Array(w * h);
  const nx = new Float32Array(w * h);
  const ny = new Float32Array(w * h);
  for (const s of sigmas) {
    const Lxx = convolveSeparable(img, w, h, d2Gauss(s), gauss(s));
    const Lyy = convolveSeparable(img, w, h, gauss(s), d2Gauss(s));
    const Lxy = convolveSeparable(img, w, h, dGauss(s), dGauss(s));
    const s2 = s * s; // gamma-normalisation, gamma = 1
    for (let i = 0; i < out.length; i++) {
      const a = s2 * (Lxx[i] ?? 0);
      const b = s2 * (Lxy[i] ?? 0);
      const c = s2 * (Lyy[i] ?? 0);
      const tr = a + c;
      const det = a * c - b * b;
      const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
      let l1 = tr / 2 - disc;
      let l2 = tr / 2 + disc;
      if (Math.abs(l1) > Math.abs(l2)) [l1, l2] = [l2, l1]; // |l1| <= |l2|
      if (l2 >= 0) continue; // not a bright ridge
      const Rb = l1 / l2;
      const S = Math.hypot(l1, l2);
      const v = Math.exp(-(Rb * Rb) / (2 * 0.5 * 0.5)) * (1 - Math.exp(-(S * S) / (2 * 15 * 15)));
      if (v > (out[i] ?? 0)) {
        out[i] = v;
        // eigenvector of l2 (across the ridge): (b, l2 − a), or (l2 − c, b) when that is degenerate
        let ex = b;
        let ey = l2 - a;
        if (Math.abs(ex) + Math.abs(ey) < 1e-9) {
          ex = l2 - c;
          ey = b;
        }
        const n = Math.hypot(ex, ey);
        if (n > 1e-12) {
          nx[i] = ex / n;
          ny[i] = ey / n;
        } else {
          nx[i] = 1;
          ny[i] = 0;
        }
      }
    }
  }
  return { response: out, nx, ny };
}

/** §6.13's signature: the max response over scales. */
export function ridgeness(img: Float32Array, w: number, h: number, sigmas: readonly number[] = [2, 3, 4]): Float32Array {
  return ridgeFilter(img, w, h, sigmas).response;
}

function sample(a: Float32Array, w: number, h: number, x: number, y: number): number {
  if (x < 0 || y < 0 || x > w - 1 || y > h - 1) return 0;
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const x1 = Math.min(w - 1, x0 + 1);
  const y1 = Math.min(h - 1, y0 + 1);
  const fx = x - x0;
  const fy = y - y0;
  const top = (a[y0 * w + x0] ?? 0) * (1 - fx) + (a[y0 * w + x1] ?? 0) * fx;
  const bot = (a[y1 * w + x0] ?? 0) * (1 - fx) + (a[y1 * w + x1] ?? 0) * fx;
  return top * (1 - fy) + bot * fy;
}

/** Keep a pixel only where it is the maximum across the ridge (±1 px along the normal). */
export function nonMaxSuppress(r: Ridges, w: number, h: number): Float32Array {
  const { response, nx, ny } = r;
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      const v = response[i] ?? 0;
      if (v <= 0) continue;
      const dx = nx[i] ?? 0;
      const dy = ny[i] ?? 0;
      const a = sample(response, w, h, x + dx, y + dy);
      const b = sample(response, w, h, x - dx, y - dy);
      if (v >= a && v > b) out[i] = v;
    }
  }
  return out;
}

/** Hysteresis: seeds ≥ hi grow through 8-connected pixels ≥ lo. */
export function hysteresis(a: Float32Array, w: number, h: number, hi: number, lo: number): Uint8Array {
  const out = new Uint8Array(w * h);
  const stack: number[] = [];
  for (let i = 0; i < a.length; i++) {
    if ((a[i] ?? 0) >= hi && hi > 0) {
      out[i] = 1;
      stack.push(i);
    }
  }
  while (stack.length) {
    const i = stack.pop() ?? 0;
    const x = i % w;
    const y = (i - x) / w;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (!out[j] && (a[j] ?? 0) >= lo && lo > 0) {
          out[j] = 1;
          stack.push(j);
        }
      }
    }
  }
  return out;
}

/** Binary 3 × 3 closing (dilate, then erode); out-of-image counts as background for the dilation. */
export function close3x3(m: Uint8Array, w: number, h: number): Uint8Array {
  const d = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 0;
      for (let dy = -1; dy <= 1 && !v; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && m[yy * w + xx]) {
            v = 1;
            break;
          }
        }
      }
      d[y * w + x] = v;
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let v = 1;
      for (let dy = -1; dy <= 1 && v; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && !d[yy * w + xx]) {
            v = 0;
            break;
          }
        }
      }
      out[y * w + x] = v;
    }
  }
  return out;
}

export const HYST_HIGH = 0.28;
export const HYST_LOW = 0.12;

export interface RidgeMask {
  mask: Uint8Array;
  response: Float32Array;
  p99: number;
}

/**
 * Ridge filter → NMS → hysteresis → closing. `close` lets the worker swap in cv.morphologyEx.
 * `floor` keeps the thresholds from collapsing on a print with no lines at all: p99 is taken as at
 * least `floor`, so noise in an empty palm never becomes "the strongest line".
 */
export function ridgeMask(
  img: Float32Array,
  w: number,
  h: number,
  opts: { close?: (m: Uint8Array, w: number, h: number) => Uint8Array; floor?: number } = {},
): RidgeMask {
  const r = ridgeFilter(img, w, h);
  const nms = nonMaxSuppress(r, w, h);
  const p99 = Math.max(opts.floor ?? 0.05, positivePercentile(nms, 0.99));
  const bin = hysteresis(nms, w, h, HYST_HIGH * p99, HYST_LOW * p99);
  const mask = (opts.close ?? close3x3)(bin, w, h);
  return { mask, response: r.response, p99 };
}
