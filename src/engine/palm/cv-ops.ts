// OpenCV.js implementations of the three OpenCV-shaped pipeline steps (warp, enhance, closing).
// `cv` is passed in, this module never loads OpenCV itself, so it is testable in Node and the
// worker decides when (and whether) the 10 MB module is paid for.
//
// Every cv.Mat (and the CLAHE object) is created through `track` and released in a `finally`
// through `free`; `counter` lets a test assert constructions − deletions === 0. A leak here is an
// OOM kill on a 4 GB phone.
import type { ImageLike } from "./image";
import type { PalmOps } from "./pipeline";
import type { Mat3 } from "./rectify";

interface Deletable {
  delete(): void;
}

export interface CvMat extends Deletable {
  rows: number;
  cols: number;
  data: Uint8Array;
  data32F: Float32Array;
  convertTo(dst: CvMat, rtype: number, alpha?: number, beta?: number): void;
}

/** The slice of the OpenCV.js API the palm pipeline uses. */
export interface CvLike {
  Mat: new (...args: number[]) => CvMat;
  Size: new (w: number, h: number) => object;
  Scalar: new (...v: number[]) => object;
  Point: new (x: number, y: number) => object;
  CLAHE: new (clipLimit: number, tileGridSize: object) => Deletable & { apply(src: CvMat, dst: CvMat): void };
  matFromArray(rows: number, cols: number, type: number, array: ArrayLike<number>): CvMat;
  getStructuringElement(shape: number, ksize: object): CvMat;
  morphologyEx(
    src: CvMat,
    dst: CvMat,
    op: number,
    kernel: CvMat,
    anchor?: object,
    iterations?: number,
    borderType?: number,
    borderValue?: object,
  ): void;
  GaussianBlur(src: CvMat, dst: CvMat, ksize: object, sigmaX: number, sigmaY?: number, borderType?: number): void;
  warpPerspective(src: CvMat, dst: CvMat, M: CvMat, dsize: object, flags?: number, borderMode?: number, borderValue?: object): void;
  CV_8UC1: number;
  CV_8UC4: number;
  CV_32F: number;
  CV_64F: number;
  MORPH_ELLIPSE: number;
  MORPH_RECT: number;
  MORPH_BLACKHAT: number;
  MORPH_CLOSE: number;
  INTER_LINEAR: number;
  BORDER_REPLICATE: number;
}

export interface MatCounter {
  created: number;
  deleted: number;
}

/** Narrow an unknown module value to the CvLike surface (a runtime check, not a cast of faith). */
export function asCv(mod: unknown): CvLike | null {
  if (typeof mod !== "object" || mod === null) return null;
  const m = mod as Record<string, unknown>;
  const fns = ["Mat", "Size", "CLAHE", "matFromArray", "getStructuringElement", "morphologyEx", "GaussianBlur", "warpPerspective"];
  return fns.every((k) => typeof m[k] === "function") ? (mod as CvLike) : null;
}

export function makeCvOps(cv: CvLike, counter: MatCounter = { created: 0, deleted: 0 }): PalmOps & { counter: MatCounter } {
  const track = <T extends Deletable>(m: T): T => {
    counter.created++;
    return m;
  };
  const free = (...ms: Array<Deletable | null>): void => {
    for (const m of ms) {
      if (!m) continue;
      try {
        m.delete();
      } finally {
        counter.deleted++;
      }
    }
  };

  const warp = (img: ImageLike, H: Mat3, size: number): ImageLike => {
    let src: CvMat | null = null;
    let M: CvMat | null = null;
    let dst: CvMat | null = null;
    try {
      src = track(new cv.Mat(img.height, img.width, cv.CV_8UC4));
      src.data.set(img.data);
      M = track(cv.matFromArray(3, 3, cv.CV_64F, H));
      dst = track(new cv.Mat());
      cv.warpPerspective(src, dst, M, new cv.Size(size, size), cv.INTER_LINEAR, cv.BORDER_REPLICATE, new cv.Scalar());
      return { data: Uint8ClampedArray.from(dst.data), width: size, height: size };
    } finally {
      free(src, M, dst);
    }
  };

  const enhanceGrey = (grey: Uint8Array, w: number, h: number): { blackHat: Float32Array; blurred: Float32Array } => {
    let src: CvMat | null = null;
    let eq: CvMat | null = null;
    let kernel: CvMat | null = null;
    let bh: CvMat | null = null;
    let bhF: CvMat | null = null;
    let blur: CvMat | null = null;
    let clahe: (Deletable & { apply(s: CvMat, d: CvMat): void }) | null = null;
    try {
      src = track(new cv.Mat(h, w, cv.CV_8UC1));
      src.data.set(grey);
      clahe = track(new cv.CLAHE(3.0, new cv.Size(8, 8)));
      eq = track(new cv.Mat());
      clahe.apply(src, eq);
      kernel = track(cv.getStructuringElement(cv.MORPH_ELLIPSE, new cv.Size(25, 25)));
      bh = track(new cv.Mat());
      cv.morphologyEx(eq, bh, cv.MORPH_BLACKHAT, kernel);
      bhF = track(new cv.Mat());
      bh.convertTo(bhF, cv.CV_32F);
      blur = track(new cv.Mat());
      cv.GaussianBlur(bhF, blur, new cv.Size(0, 0), 1.5, 1.5, cv.BORDER_REPLICATE);
      return { blackHat: Float32Array.from(bhF.data32F), blurred: Float32Array.from(blur.data32F) };
    } finally {
      free(src, eq, kernel, bh, bhF, blur, clahe);
    }
  };

  const close = (m: Uint8Array, w: number, h: number): Uint8Array => {
    let src: CvMat | null = null;
    let kernel: CvMat | null = null;
    let dst: CvMat | null = null;
    try {
      src = track(new cv.Mat(h, w, cv.CV_8UC1));
      src.data.set(m);
      kernel = track(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)));
      dst = track(new cv.Mat());
      cv.morphologyEx(src, dst, cv.MORPH_CLOSE, kernel);
      return Uint8Array.from(dst.data);
    } finally {
      free(src, kernel, dst);
    }
  };

  return { warp, enhanceGrey, close, counter };
}
