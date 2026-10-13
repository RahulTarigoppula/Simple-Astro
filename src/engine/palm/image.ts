// Image shapes and the small set of separable filters every palm stage shares. Plain TypedArrays:
// nothing here touches the DOM, so the whole pipeline runs (and is tested) in Node.

/** RGBA, 8 bits per channel, row-major, the shape of a DOM ImageData, without the DOM. */
export interface ImageLike {
  data: Uint8ClampedArray | Uint8Array;
  width: number;
  height: number;
}

/** One float channel, row-major. */
export interface GreyImage {
  data: Float32Array;
  width: number;
  height: number;
}

/** A rectangle in normalised [0,1] image coordinates. */
export interface Roi {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Rec.601 luma, 0..255. */
export function toGrey(img: ImageLike): GreyImage {
  const { data, width, height } = img;
  const out = new Float32Array(width * height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    out[i] = 0.299 * (data[j] ?? 0) + 0.587 * (data[j + 1] ?? 0) + 0.114 * (data[j + 2] ?? 0);
  }
  return { data: out, width, height };
}

/**
 * Area-average downscale so the longer side is at most `maxSide` (never upscales). Reads the RGBA
 * source directly into luma, so a 1600 × 1200 frame costs one pass.
 */
export function greyDownscale(img: ImageLike, maxSide: number): GreyImage {
  const { data, width, height } = img;
  const s = Math.max(1, Math.max(width, height) / maxSide);
  if (s === 1) return toGrey(img);
  const ow = Math.max(1, Math.floor(width / s));
  const oh = Math.max(1, Math.floor(height / s));
  const out = new Float32Array(ow * oh);
  for (let oy = 0; oy < oh; oy++) {
    const y0 = Math.floor(oy * s);
    const y1 = Math.max(y0 + 1, Math.min(height, Math.floor((oy + 1) * s)));
    for (let ox = 0; ox < ow; ox++) {
      const x0 = Math.floor(ox * s);
      const x1 = Math.max(x0 + 1, Math.min(width, Math.floor((ox + 1) * s)));
      let acc = 0;
      for (let y = y0; y < y1; y++) {
        let j = (y * width + x0) * 4;
        for (let x = x0; x < x1; x++, j += 4) {
          acc += 0.299 * (data[j] ?? 0) + 0.587 * (data[j + 1] ?? 0) + 0.114 * (data[j + 2] ?? 0);
        }
      }
      out[oy * ow + ox] = acc / ((y1 - y0) * (x1 - x0));
    }
  }
  return { data: out, width: ow, height: oh };
}

// ─── kernels ─────────────────────────────────────────────────────────────────

const radiusFor = (sigma: number): number => Math.max(1, Math.ceil(3 * sigma));

/** Normalised Gaussian, radius ceil(3σ). */
export function gauss(sigma: number): Float32Array {
  const r = radiusFor(sigma);
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k[i + r] = v;
    sum += v;
  }
  for (let i = 0; i < k.length; i++) k[i] = (k[i] ?? 0) / sum;
  return k;
}

/** First derivative of the Gaussian, d/dx G (antisymmetric, sums to 0). */
export function dGauss(sigma: number): Float32Array {
  const r = radiusFor(sigma);
  const g = gauss(sigma);
  const k = new Float32Array(2 * r + 1);
  for (let i = -r; i <= r; i++) k[i + r] = (-i / (sigma * sigma)) * (g[i + r] ?? 0);
  return k;
}

/** Second derivative of the Gaussian, made exactly zero-mean so flat regions respond 0. */
export function d2Gauss(sigma: number): Float32Array {
  const r = radiusFor(sigma);
  const g = gauss(sigma);
  const s2 = sigma * sigma;
  const k = new Float32Array(2 * r + 1);
  let mean = 0;
  for (let i = -r; i <= r; i++) {
    const v = ((i * i - s2) / (s2 * s2)) * (g[i + r] ?? 0);
    k[i + r] = v;
    mean += v;
  }
  mean /= k.length;
  for (let i = 0; i < k.length; i++) k[i] = (k[i] ?? 0) - mean;
  return k;
}

/**
 * Separable convolution (correlation with `kx` along rows, then `ky` along columns), border
 * replicated. Kernels are odd-length and centred.
 */
export function convolveSeparable(img: Float32Array, w: number, h: number, kx: Float32Array, ky: Float32Array): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const rx = (kx.length - 1) >> 1;
  const ry = (ky.length - 1) >> 1;
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -rx; k <= rx; k++) {
        let xx = x + k;
        if (xx < 0) xx = 0;
        else if (xx >= w) xx = w - 1;
        acc += (kx[k + rx] ?? 0) * (img[row + xx] ?? 0);
      }
      tmp[row + x] = acc;
    }
  }
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let k = -ry; k <= ry; k++) {
        let yy = y + k;
        if (yy < 0) yy = 0;
        else if (yy >= h) yy = h - 1;
        acc += (ky[k + ry] ?? 0) * (tmp[yy * w + x] ?? 0);
      }
      out[y * w + x] = acc;
    }
  }
  return out;
}

export function gaussianBlur(img: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const k = gauss(sigma);
  return convolveSeparable(img, w, h, k, k);
}

/** Box blur of odd size n (border replicated), used by tests and the quality checks. */
export function boxBlur(img: Float32Array, w: number, h: number, n: number): Float32Array {
  const k = new Float32Array(n).fill(1 / n);
  return convolveSeparable(img, w, h, k, k);
}

/** The q-quantile (0..1) of the strictly positive values, by a 4096-bin histogram. 0 if none. */
export function positivePercentile(a: Float32Array, q: number): number {
  let max = 0;
  let n = 0;
  for (let i = 0; i < a.length; i++) {
    const v = a[i] ?? 0;
    if (v > 0) {
      n++;
      if (v > max) max = v;
    }
  }
  if (n === 0 || max <= 0) return 0;
  const BINS = 4096;
  const hist = new Uint32Array(BINS);
  for (let i = 0; i < a.length; i++) {
    const v = a[i] ?? 0;
    if (v > 0) {
      const b = Math.min(BINS - 1, Math.floor((v / max) * BINS));
      hist[b] = (hist[b] ?? 0) + 1;
    }
  }
  const target = q * n;
  let acc = 0;
  for (let b = 0; b < BINS; b++) {
    acc += hist[b] ?? 0;
    if (acc >= target) return ((b + 1) / BINS) * max;
  }
  return max;
}
