// Stage [3]: rectification. A homography from four stable landmarks into the canonical 512 × 512
// print, fingers at the top, wrist at the bottom, thumb on the left. Solved here in plain TS (a
// getPerspectiveTransform equivalent), so it is testable without OpenCV; the worker may apply it
// with cv.warpPerspective, and `warpPerspective` below is the bit-exact pure fallback.
//
// A left hand needs no special case: mapping its thumb base onto the canonical thumb position makes
// the homography itself a reflection, so both prints share one anatomy.
import type { Landmark } from "../types";
import type { ImageLike } from "./image";
import { LM } from "./landmarks";

export type Mat3 = [number, number, number, number, number, number, number, number, number];
export type Pt = [number, number];

export const PRINT_SIZE = 512;
/** WRIST, INDEX_MCP, PINKY_MCP, THUMB_CMC. */
export const SRC_LANDMARKS = [LM.WRIST, LM.INDEX_MCP, LM.PINKY_MCP, LM.THUMB_CMC] as const;
export const CANONICAL_DST: readonly Pt[] = [
  [256, 496],
  [120, 96],
  [392, 128],
  [56, 400],
];

/** Solve A x = b (n × n, row-major) by Gaussian elimination with partial pivoting. Null if singular. */
export function solveLinear(A: number[][], b: number[]): number[] | null {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i] ?? 0]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    let best = Math.abs(M[c]?.[c] ?? 0);
    for (let r = c + 1; r < n; r++) {
      const v = Math.abs(M[r]?.[c] ?? 0);
      if (v > best) {
        best = v;
        piv = r;
      }
    }
    if (best < 1e-12) return null;
    const rowP = M[piv];
    const rowC = M[c];
    if (!rowP || !rowC) return null;
    M[piv] = rowC;
    M[c] = rowP;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const row = M[r];
      if (!row) continue;
      const f = (row[c] ?? 0) / (rowP[c] ?? 1);
      if (f === 0) continue;
      for (let k = c; k <= n; k++) row[k] = (row[k] ?? 0) - f * (rowP[k] ?? 0);
    }
  }
  return M.map((row, i) => (row[n] ?? 0) / (row[i] ?? 1));
}

/**
 * The homography H (row-major, h33 = 1) with H·src[i] ∝ dst[i] for four point pairs, the direct
 * linear transform, as cv.getPerspectiveTransform. Null when three points are collinear.
 */
export function getPerspectiveTransform(src: readonly Pt[], dst: readonly Pt[]): Mat3 | null {
  if (src.length !== 4 || dst.length !== 4) return null;
  const A: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i++) {
    const [x, y] = src[i] ?? [0, 0];
    const [u, v] = dst[i] ?? [0, 0];
    A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]);
    b.push(u);
    A.push([0, 0, 0, x, y, 1, -v * x, -v * y]);
    b.push(v);
  }
  const h = solveLinear(A, b);
  if (!h?.every(Number.isFinite)) return null;
  const [a = 0, bb = 0, c = 0, d = 0, e = 0, f = 0, g = 0, hh = 0] = h;
  return [a, bb, c, d, e, f, g, hh, 1];
}

export function invert3(m: Mat3): Mat3 | null {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  if (!Number.isFinite(det) || Math.abs(det) < 1e-14) return null;
  const inv: Mat3 = [
    A / det,
    -(b * i - c * h) / det,
    (b * f - c * e) / det,
    B / det,
    (a * i - c * g) / det,
    -(a * f - c * d) / det,
    C / det,
    -(a * h - b * g) / det,
    (a * e - b * d) / det,
  ];
  // normalise so h33 = 1 where possible (keeps numbers comparable across runs)
  const s = inv[8];
  return Math.abs(s) > 1e-14 ? (inv.map((v) => v / s) as Mat3) : inv;
}

export function applyH(m: Mat3, p: Pt): Pt {
  const [x, y] = p;
  const w = m[6] * x + m[7] * y + m[8];
  const ww = Math.abs(w) < 1e-14 ? 1e-14 : w;
  return [(m[0] * x + m[1] * y + m[2]) / ww, (m[3] * x + m[4] * y + m[5]) / ww];
}

/** Landmarks (normalised) → the four source points in pixels of a `width × height` image. */
export function sourcePoints(lm: readonly Landmark[], width: number, height: number): Pt[] | null {
  const out: Pt[] = [];
  for (const i of SRC_LANDMARKS) {
    const p = lm[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return null;
    out.push([p.x * width, p.y * height]);
  }
  return out;
}

/** original-pixel → canonical-512 homography from the landmarks; null for a degenerate hand. */
export function homographyFromLandmarks(lm: readonly Landmark[], width: number, height: number): Mat3 | null {
  const src = sourcePoints(lm, width, height);
  return src ? getPerspectiveTransform(src, CANONICAL_DST) : null;
}

/**
 * Inverse-mapped bilinear warp of an RGBA image by `H` (source → destination), BORDER_REPLICATE,
 * matching cv.warpPerspective(…, INTER_LINEAR, BORDER_REPLICATE) to within rounding.
 */
export function warpPerspective(src: ImageLike, H: Mat3, outW = PRINT_SIZE, outH = PRINT_SIZE): ImageLike {
  const Hi = invert3(H);
  const out = new Uint8ClampedArray(outW * outH * 4);
  if (!Hi) return { data: out, width: outW, height: outH };
  const { data, width: w, height: h } = src;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      const den = Hi[6] * x + Hi[7] * y + Hi[8];
      const d = Math.abs(den) < 1e-14 ? 1e-14 : den;
      let sx = (Hi[0] * x + Hi[1] * y + Hi[2]) / d;
      let sy = (Hi[3] * x + Hi[4] * y + Hi[5]) / d;
      sx = sx < 0 ? 0 : sx > w - 1 ? w - 1 : sx;
      sy = sy < 0 ? 0 : sy > h - 1 ? h - 1 : sy;
      const x0 = Math.floor(sx);
      const y0 = Math.floor(sy);
      const x1 = x0 + 1 < w ? x0 + 1 : x0;
      const y1 = y0 + 1 < h ? y0 + 1 : y0;
      const fx = sx - x0;
      const fy = sy - y0;
      const i00 = (y0 * w + x0) * 4;
      const i10 = (y0 * w + x1) * 4;
      const i01 = (y1 * w + x0) * 4;
      const i11 = (y1 * w + x1) * 4;
      const o = (y * outW + x) * 4;
      for (let c = 0; c < 4; c++) {
        const top = (data[i00 + c] ?? 0) * (1 - fx) + (data[i10 + c] ?? 0) * fx;
        const bot = (data[i01 + c] ?? 0) * (1 - fx) + (data[i11 + c] ?? 0) * fx;
        out[o + c] = top * (1 - fy) + bot * fy;
      }
    }
  }
  return { data: out, width: outW, height: outH };
}

/** Map a canonical path back to the original photo (for overlays on the unrectified image). */
export function mapPath(m: Mat3, path: readonly Pt[]): Pt[] {
  return path.map((p) => applyH(m, p));
}
