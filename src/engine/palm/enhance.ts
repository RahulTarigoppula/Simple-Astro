// Stage [4]: enhancement, grey → CLAHE(3.0, 8×8) → black-hat (25 px ellipse) → Gaussian σ 1.5.
// Palm lines are valleys, so the black-hat output is already "bright lines on dark".
//
// This is the pure-TS path: the worker uses OpenCV for the same three steps when it loads, and
// falls back to these when it cannot. Both take ImageData-like inputs as arguments (no DOM).
// Two honesty masks live here too: the palm region (lines are only looked for on the palm) and a
// pigment mask (henna and ink are chromatic; creases are not), which suppresses dyed strokes.
import { gaussianBlur, type ImageLike } from "./image";
import { PRINT_SIZE } from "./rectify";

/** Rec.601 luma, rounded to 8 bits, the input CLAHE expects. */
export function luma8(img: ImageLike): Uint8Array {
  const { data, width, height } = img;
  const out = new Uint8Array(width * height);
  for (let i = 0, j = 0; i < out.length; i++, j += 4) {
    out[i] = Math.round(0.299 * (data[j] ?? 0) + 0.587 * (data[j + 1] ?? 0) + 0.114 * (data[j + 2] ?? 0));
  }
  return out;
}

/**
 * Contrast-limited adaptive histogram equalisation, OpenCV's algorithm: per-tile clipped histogram
 * (clip = max(1, ⌊clipLimit · tileArea / 256⌋), excess redistributed evenly plus a strided
 * residual), per-tile LUT, bilinear blend between the four nearest tiles.
 */
export function clahe(src: Uint8Array, w: number, h: number, clipLimit = 3.0, tiles = 8): Uint8Array {
  const tw = Math.ceil(w / tiles);
  const th = Math.ceil(h / tiles);
  const luts = new Uint8Array(tiles * tiles * 256);
  const hist = new Int32Array(256);
  for (let ty = 0; ty < tiles; ty++) {
    for (let tx = 0; tx < tiles; tx++) {
      hist.fill(0);
      const x0 = Math.min(w - 1, tx * tw);
      const y0 = Math.min(h - 1, ty * th);
      // replicate the edge for tiles that run past the image, as OpenCV's padding does
      const area = tw * th;
      for (let y = ty * th; y < ty * th + th; y++) {
        const yy = Math.min(h - 1, Math.max(y0, y));
        for (let x = tx * tw; x < tx * tw + tw; x++) {
          const xx = Math.min(w - 1, Math.max(x0, x));
          const v = src[yy * w + xx] ?? 0;
          hist[v] = (hist[v] ?? 0) + 1;
        }
      }
      const clip = Math.max(1, Math.floor((clipLimit * area) / 256));
      let excess = 0;
      for (let i = 0; i < 256; i++) {
        const c = hist[i] ?? 0;
        if (c > clip) {
          excess += c - clip;
          hist[i] = clip;
        }
      }
      const batch = Math.floor(excess / 256);
      const residual = excess - batch * 256;
      for (let i = 0; i < 256; i++) hist[i] = (hist[i] ?? 0) + batch;
      if (residual > 0) {
        const step = Math.max(1, Math.floor(256 / residual));
        for (let i = 0, r = residual; i < 256 && r > 0; i += step, r--) hist[i] = (hist[i] ?? 0) + 1;
      }
      const scale = 255 / area;
      let sum = 0;
      const base = (ty * tiles + tx) * 256;
      for (let i = 0; i < 256; i++) {
        sum += hist[i] ?? 0;
        luts[base + i] = Math.min(255, Math.max(0, Math.round(sum * scale)));
      }
    }
  }
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const tyf = y / th - 0.5;
    let ty1 = Math.floor(tyf);
    let ty2 = ty1 + 1;
    const ya = tyf - ty1;
    ty1 = Math.max(0, ty1);
    ty2 = Math.min(tiles - 1, ty2);
    for (let x = 0; x < w; x++) {
      const txf = x / tw - 0.5;
      let tx1 = Math.floor(txf);
      let tx2 = tx1 + 1;
      const xa = txf - tx1;
      tx1 = Math.max(0, tx1);
      tx2 = Math.min(tiles - 1, tx2);
      const v = src[y * w + x] ?? 0;
      const l11 = luts[(ty1 * tiles + tx1) * 256 + v] ?? 0;
      const l12 = luts[(ty1 * tiles + tx2) * 256 + v] ?? 0;
      const l21 = luts[(ty2 * tiles + tx1) * 256 + v] ?? 0;
      const l22 = luts[(ty2 * tiles + tx2) * 256 + v] ?? 0;
      const r = (l11 * (1 - xa) + l12 * xa) * (1 - ya) + (l21 * (1 - xa) + l22 * xa) * ya;
      out[y * w + x] = Math.min(255, Math.max(0, Math.round(r)));
    }
  }
  return out;
}

/** Row half-widths of OpenCV's MORPH_ELLIPSE structuring element of odd size `k`. */
export function ellipseHalfWidths(k: number): number[] {
  const r = Math.floor(k / 2);
  const c = r;
  const out: number[] = [];
  for (let i = 0; i < k; i++) {
    const dy = i - r;
    out.push(Math.round(c * Math.sqrt(Math.max(0, (r * r - dy * dy) / (r * r)))));
  }
  return out;
}

/**
 * Grey dilation (max) or erosion (min) by a row-span structuring element: precompute running
 * extrema per half-width, then combine shifted rows. Out-of-image pixels are ignored (OpenCV's
 * default morphology border).
 */
function morph(src: Float32Array, w: number, h: number, half: readonly number[], isMax: boolean): Float32Array {
  const maxHw = Math.max(0, ...half);
  const pick = isMax ? Math.max : Math.min;
  const layers: Float32Array[] = [Float32Array.from(src)];
  for (let k = 1; k <= maxHw; k++) {
    const prev = layers[k - 1] ?? src;
    const next = new Float32Array(w * h);
    for (let y = 0; y < h; y++) {
      const row = y * w;
      for (let x = 0; x < w; x++) {
        let v = prev[row + x] ?? 0;
        if (x > 0) v = pick(v, prev[row + x - 1] ?? v);
        if (x < w - 1) v = pick(v, prev[row + x + 1] ?? v);
        next[row + x] = v;
      }
    }
    layers.push(next);
  }
  const r = (half.length - 1) >> 1;
  const out = new Float32Array(w * h).fill(isMax ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY);
  for (let i = 0; i < half.length; i++) {
    const dy = i - r;
    const layer = layers[half[i] ?? 0] ?? src;
    for (let y = Math.max(0, -dy); y < Math.min(h, h - dy); y++) {
      const dst = y * w;
      const s = (y + dy) * w;
      for (let x = 0; x < w; x++) {
        const v = layer[s + x] ?? 0;
        const o = out[dst + x] ?? 0;
        out[dst + x] = isMax ? (v > o ? v : o) : v < o ? v : o;
      }
    }
  }
  return out;
}

export const dilate = (src: Float32Array, w: number, h: number, half: readonly number[]): Float32Array => morph(src, w, h, half, true);
export const erode = (src: Float32Array, w: number, h: number, half: readonly number[]): Float32Array => morph(src, w, h, half, false);

/** Black-hat = closing − image: the dark creases narrower than the kernel, as bright on dark. */
export function blackHat(src: Float32Array, w: number, h: number, k = 25): Float32Array {
  const half = ellipseHalfWidths(k);
  const closed = erode(dilate(src, w, h, half), w, h, half);
  const out = new Float32Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = Math.max(0, (closed[i] ?? 0) - (src[i] ?? 0));
  return out;
}

// ─── masks ───────────────────────────────────────────────────────────────────

/**
 * The palm in the canonical frame: lines are only looked for here. Everything outside (finger
 * gaps, the wrist crease, the background) would otherwise read as dark valleys.
 */
export const PALM_POLYGON: ReadonlyArray<[number, number]> = [
  [96, 118],
  [250, 104],
  [404, 124],
  [432, 220],
  [424, 360],
  [380, 470],
  [300, 494],
  [220, 494],
  [150, 452],
  [96, 360],
  [84, 240],
];

function insidePolygon(x: number, y: number, poly: ReadonlyArray<[number, number]>): boolean {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i] ?? [0, 0];
    const [xj, yj] = poly[j] ?? [0, 0];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/**
 * Palm mask on the rectified print: the canonical palm polygon ∩ skin (luma above an Otsu split of
 * the print), eroded so the hand's own outline never reads as a crease.
 */
export function palmMask(grey: Uint8Array, w: number, h: number): Uint8Array {
  const sx = w / PRINT_SIZE;
  const sy = h / PRINT_SIZE;
  const poly = PALM_POLYGON.map(([x, y]) => [x * sx, y * sy] as [number, number]);
  const t = otsu(grey);
  const skin = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      skin[i] = (grey[i] ?? 0) > t && insidePolygon(x + 0.5, y + 0.5, poly) ? 1 : 0;
    }
  }
  // close small holes (creases are dark too), then erode 6 px off the outline
  const holes = erode(dilate(skin, w, h, ellipseHalfWidths(9)), w, h, ellipseHalfWidths(9));
  const eroded = erode(holes, w, h, ellipseHalfWidths(13));
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = (eroded[i] ?? 0) > 0.5 ? 1 : 0;
  return out;
}

/** Otsu's threshold of an 8-bit image. */
export function otsu(grey: Uint8Array): number {
  const hist = new Float64Array(256);
  for (let i = 0; i < grey.length; i++) {
    const v = grey[i] ?? 0;
    hist[v] = (hist[v] ?? 0) + 1;
  }
  const n = grey.length;
  let sumAll = 0;
  for (let i = 0; i < 256; i++) sumAll += i * (hist[i] ?? 0);
  let wB = 0;
  let sumB = 0;
  let best = 0;
  let t = 0;
  for (let i = 0; i < 256; i++) {
    wB += hist[i] ?? 0;
    if (wB === 0) continue;
    const wF = n - wB;
    if (wF === 0) break;
    sumB += i * (hist[i] ?? 0);
    const mB = sumB / wB;
    const mF = (sumAll - sumB) / wF;
    const between = wB * wF * (mB - mF) * (mB - mF);
    if (between > best) {
      best = between;
      t = i;
    }
  }
  return t;
}

/**
 * Pigment mask: pixels whose chroma (R − B)/luma stands well above the palm's own median, henna,
 * alta, ink. Illumination-invariant (a shadow scales R, B and luma together). Dilated 3 px.
 */
export function pigmentMask(img: ImageLike, region: Uint8Array): Uint8Array {
  const { data, width: w, height: h } = img;
  const chroma = new Float32Array(w * h);
  const hist = new Uint32Array(512);
  let n = 0;
  for (let i = 0, j = 0; i < w * h; i++, j += 4) {
    const r = data[j] ?? 0;
    const g = data[j + 1] ?? 0;
    const b = data[j + 2] ?? 0;
    const y = Math.max(12, 0.299 * r + 0.587 * g + 0.114 * b);
    const c = (r - b) / y;
    chroma[i] = c;
    if (region[i]) {
      const bin = Math.max(0, Math.min(511, Math.round((c + 1) * 128)));
      hist[bin] = (hist[bin] ?? 0) + 1;
      n++;
    }
  }
  const mask = new Float32Array(w * h);
  if (n === 0) return new Uint8Array(w * h);
  let acc = 0;
  let median = 0;
  for (let b = 0; b < 512; b++) {
    acc += hist[b] ?? 0;
    if (acc >= n / 2) {
      median = b / 128 - 1;
      break;
    }
  }
  const limit = median + PIGMENT_MARGIN;
  for (let i = 0; i < w * h; i++) mask[i] = (chroma[i] ?? 0) > limit ? 1 : 0;
  const grown = dilate(mask, w, h, ellipseHalfWidths(7));
  const out = new Uint8Array(w * h);
  for (let i = 0; i < out.length; i++) out[i] = (grown[i] ?? 0) > 0.5 ? 1 : 0;
  return out;
}
/** How far above the palm's median chroma a pixel must sit to count as pigment. */
export const PIGMENT_MARGIN = 0.45;

export interface Enhanced {
  /** black-hat → Gaussian, masked to the palm; bright creases on dark. */
  ridgeInput: Float32Array;
  /** the unblurred black-hat, for line contrast/depth. */
  blackHat: Float32Array;
  palm: Uint8Array;
  pigment: Uint8Array;
  width: number;
  height: number;
}

/** The three classical steps on 8-bit luma, as plain TS. */
export function enhanceGrey(grey: Uint8Array, w: number, h: number): { blackHat: Float32Array; blurred: Float32Array } {
  const eq = clahe(grey, w, h, 3.0, 8);
  const f = Float32Array.from(eq);
  const bh = blackHat(f, w, h, 25);
  return { blackHat: bh, blurred: gaussianBlur(bh, w, h, 1.5) };
}

/** Apply the palm and pigment masks to the enhancement output (shared by the TS and cv paths). */
export function maskEnhanced(img: ImageLike, grey: Uint8Array, bh: Float32Array, blurred: Float32Array): Enhanced {
  const { width: w, height: h } = img;
  const palm = palmMask(grey, w, h);
  const pigment = pigmentMask(img, palm);
  const ridgeInput = new Float32Array(w * h);
  const bhOut = new Float32Array(w * h);
  for (let i = 0; i < ridgeInput.length; i++) {
    const keep = palm[i] === 1 && pigment[i] === 0;
    ridgeInput[i] = keep ? (blurred[i] ?? 0) : 0;
    bhOut[i] = keep ? (bh[i] ?? 0) : 0;
  }
  return { ridgeInput, blackHat: bhOut, palm, pigment, width: w, height: h };
}

/** Pure-TS enhancement of a rectified RGBA print. */
export function enhance(img: ImageLike): Enhanced {
  const grey = luma8(img);
  const { blackHat: bh, blurred } = enhanceGrey(grey, img.width, img.height);
  return maskEnhanced(img, grey, bh, blurred);
}
