// Capture quality (§6.13): Laplacian variance for sharpness and a luma histogram over the palm ROI
// for exposure. Runs live on a 512 px downscale (≤ 15 ms for a 1600 × 1200 frame).
import { type GreyImage, greyDownscale, type ImageLike, type Roi } from "./image";

/** The gauge threshold — an 8 px checkerboard scores ≥ 900, the same image 9×9-blurred ≤ 60. */
export const SHARPNESS_MIN = 120;
/** The long side quality is measured at. */
export const QUALITY_SIDE = 512;

export type ExposureLabel = "low" | "ok" | "high";

export interface Exposure {
  /** 0..1, 1 = the palm's luma sits comfortably mid-range with nothing clipped. */
  score: number;
  label: ExposureLabel;
  median: number;
  clippedLow: number; // fraction of ROI pixels ≤ 16
  clippedHigh: number; // fraction of ROI pixels ≥ 245
}

export interface Quality {
  sharpness: { value: number; ok: boolean };
  exposure: Exposure & { ok: boolean };
}

function roiBounds(w: number, h: number, roi: Roi | undefined): [number, number, number, number] {
  if (!roi) return [0, 0, w, h];
  const x0 = Math.max(0, Math.floor(roi.x * w));
  const y0 = Math.max(0, Math.floor(roi.y * h));
  const x1 = Math.min(w, Math.ceil((roi.x + roi.w) * w));
  const y1 = Math.min(h, Math.ceil((roi.y + roi.h) * h));
  return x1 - x0 >= 3 && y1 - y0 >= 3 ? [x0, y0, x1, y1] : [0, 0, w, h];
}

/**
 * Variance of the mean second difference, (∂²x + ∂²y) / 2 — the 4-neighbour Laplacian halved — over
 * the interior of the ROI. Halving is what puts the §6.13 calibration points on either side of the
 * 120 gauge: an 8 px checkerboard ≈ 10 000, the same image 9×9 box-blurred ≈ 42 (the unhalved
 * Laplacian gives ≈ 166 for the blurred one, which would read as sharp).
 */
export function laplacianVariance(g: GreyImage, roi?: Roi): number {
  const { data, width: w, height: h } = g;
  const [x0, y0, x1, y1] = roiBounds(w, h, roi);
  let n = 0;
  let sum = 0;
  let sum2 = 0;
  for (let y = Math.max(1, y0); y < Math.min(h - 1, y1); y++) {
    for (let x = Math.max(1, x0); x < Math.min(w - 1, x1); x++) {
      const i = y * w + x;
      const v = 0.5 * ((data[i - 1] ?? 0) + (data[i + 1] ?? 0) + (data[i - w] ?? 0) + (data[i + w] ?? 0) - 4 * (data[i] ?? 0));
      sum += v;
      sum2 += v * v;
      n++;
    }
  }
  if (n === 0) return 0;
  const mean = sum / n;
  return Math.max(0, sum2 / n - mean * mean);
}

/** Luma histogram over the ROI → an exposure score and a low/ok/high label. */
export function exposureOf(g: GreyImage, roi?: Roi): Exposure {
  const { data, width: w, height: h } = g;
  const [x0, y0, x1, y1] = roiBounds(w, h, roi);
  const hist = new Uint32Array(256);
  let n = 0;
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const v = Math.max(0, Math.min(255, Math.round(data[y * w + x] ?? 0)));
      hist[v] = (hist[v] ?? 0) + 1;
      n++;
    }
  }
  if (n === 0) return { score: 0, label: "low", median: 0, clippedLow: 1, clippedHigh: 0 };
  let acc = 0;
  let median = 0;
  for (let v = 0; v < 256; v++) {
    acc += hist[v] ?? 0;
    if (acc >= n / 2) {
      median = v;
      break;
    }
  }
  let lo = 0;
  let hi = 0;
  for (let v = 0; v <= 16; v++) lo += hist[v] ?? 0;
  for (let v = 245; v < 256; v++) hi += hist[v] ?? 0;
  const clippedLow = lo / n;
  const clippedHigh = hi / n;
  // Comfortable band for skin: median 70..200. Outside it, or with heavy clipping, say so.
  const label: ExposureLabel =
    median < 70 || clippedLow > 0.3 ? "low" : median > 200 || clippedHigh > 0.2 ? "high" : "ok";
  const centre = 135;
  const spread = 95; // distance from the centre at which the score reaches 0
  const s = Math.max(0, 1 - Math.abs(median - centre) / spread) * (1 - Math.min(1, clippedLow + clippedHigh));
  return { score: Math.round(s * 1000) / 1000, label, median, clippedLow, clippedHigh };
}

/** Both gauges on a ≤ 512 px downscale. `roi` (normalised) is the palm; omit for the whole frame. */
export function assessQuality(img: ImageLike, roi?: Roi): Quality {
  const g = greyDownscale(img, QUALITY_SIDE);
  return qualityOfGrey(g, roi);
}

export function qualityOfGrey(g: GreyImage, roi?: Roi): Quality {
  const value = laplacianVariance(g, roi);
  const e = exposureOf(g, roi);
  return {
    sharpness: { value, ok: value >= SHARPNESS_MIN },
    exposure: { ...e, ok: e.label === "ok" },
  };
}

/** The shutter's rule, all three or nothing (the 8-row truth table is a test). */
export const shutterEnabled = (handOk: boolean, sharpnessOk: boolean, exposureOk: boolean): boolean =>
  handOk && sharpnessOk && exposureOk;

/** Gauge segments lit, 0..5, for the five-pip display. */
export function sharpnessPips(v: number): number {
  if (!(v > 0)) return 0;
  // log scale: 30 → 1, 120 → 3 (the threshold), 480+ → 5
  return Math.max(0, Math.min(5, Math.round(1 + Math.log2(v / 30))));
}
export const exposurePips = (score: number): number => Math.max(0, Math.min(5, Math.round(score * 5)));

/** The palm ROI from landmarks (normalised), padded 10 %: wrist, the MCPs and the thumb base. */
export function palmRoi(lm: ReadonlyArray<{ x: number; y: number }>): Roi | undefined {
  const idx = [0, 1, 2, 5, 9, 13, 17];
  let minX = 1;
  let minY = 1;
  let maxX = 0;
  let maxY = 0;
  for (const i of idx) {
    const p = lm[i];
    if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.y)) return undefined;
    minX = Math.min(minX, p.x);
    maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y);
    maxY = Math.max(maxY, p.y);
  }
  const padX = (maxX - minX) * 0.1;
  const padY = (maxY - minY) * 0.1;
  const x = Math.max(0, minX - padX);
  const y = Math.max(0, minY - padY);
  const w = Math.min(1, maxX + padX) - x;
  const h = Math.min(1, maxY + padY) - y;
  return w > 0.02 && h > 0.02 ? { x, y, w, h } : undefined;
}
