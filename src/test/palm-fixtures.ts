// Test-only loader for the synthetic palm fixtures: a minimal PNG decoder (8-bit grey, RGB,
// palette, RGBA; non-interlaced) on node:zlib. Never imported by app code.
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { inflateSync } from "node:zlib";
import type { ImageLike } from "../engine/palm/image";
import type { Landmark } from "../engine/types";

const here = join(dirname(fileURLToPath(import.meta.url)), "..", "engine", "palm", "__fixtures__");

export function decodePng(buf: Uint8Array): ImageLike {
  const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  let off = 8;
  let width = 0;
  let height = 0;
  let colorType = 0;
  let palette: Uint8Array | null = null;
  const idat: Uint8Array[] = [];
  while (off < buf.length) {
    const len = dv.getUint32(off);
    const type = String.fromCharCode(...buf.subarray(off + 4, off + 8));
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      width = dv.getUint32(off + 8);
      height = dv.getUint32(off + 12);
      if (buf[off + 16] !== 8) throw new Error("decodePng: only 8-bit depth");
      colorType = buf[off + 17] ?? 0;
      if (buf[off + 20] !== 0) throw new Error("decodePng: interlaced");
    } else if (type === "PLTE") palette = data;
    else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    off += 12 + len;
  }
  const bpp = colorType === 0 ? 1 : colorType === 2 ? 3 : colorType === 3 ? 1 : colorType === 6 ? 4 : 0;
  if (!bpp) throw new Error(`decodePng: colour type ${colorType}`);
  const total = idat.reduce((n, d) => n + d.length, 0);
  const z = new Uint8Array(total);
  let p = 0;
  for (const d of idat) {
    z.set(d, p);
    p += d.length;
  }
  const raw = new Uint8Array(inflateSync(z));
  const stride = width * bpp;
  const px = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)] ?? 0;
    const src = y * (stride + 1) + 1;
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? (px[y * stride + x - bpp] ?? 0) : 0;
      const b = y > 0 ? (px[(y - 1) * stride + x] ?? 0) : 0;
      const c = x >= bpp && y > 0 ? (px[(y - 1) * stride + x - bpp] ?? 0) : 0;
      const v = raw[src + x] ?? 0;
      let r: number;
      if (f === 0) r = v;
      else if (f === 1) r = v + a;
      else if (f === 2) r = v + b;
      else if (f === 3) r = v + ((a + b) >> 1);
      else {
        const pp = a + b - c;
        const pa = Math.abs(pp - a);
        const pb = Math.abs(pp - b);
        const pc = Math.abs(pp - c);
        r = v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c);
      }
      px[y * stride + x] = r & 0xff;
    }
  }
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0; i < width * height; i++) {
    if (colorType === 3) {
      const k = (px[i] ?? 0) * 3;
      data[i * 4] = palette?.[k] ?? 0;
      data[i * 4 + 1] = palette?.[k + 1] ?? 0;
      data[i * 4 + 2] = palette?.[k + 2] ?? 0;
      data[i * 4 + 3] = 255;
    } else if (colorType === 0) {
      const v = px[i] ?? 0;
      data[i * 4] = v;
      data[i * 4 + 1] = v;
      data[i * 4 + 2] = v;
      data[i * 4 + 3] = 255;
    } else {
      for (let c = 0; c < 3; c++) data[i * 4 + c] = px[i * bpp + c] ?? 0;
      data[i * 4 + 3] = bpp === 4 ? (px[i * 4 + 3] ?? 255) : 255;
    }
  }
  return { data, width, height };
}

export type FixtureName = "synthetic-clean" | "synthetic-shadow" | "synthetic-blur" | "synthetic-henna";

export interface FixtureTruth {
  width: number;
  height: number;
  handedness: string;
  score: number;
  landmarks: Landmark[];
  worldLandmarks: Landmark[];
  lines: Record<"heart" | "head" | "life", Array<[number, number]>>;
}

export function loadTruth(): FixtureTruth {
  return JSON.parse(readFileSync(join(here, "synthetic.json"), "utf8")) as FixtureTruth;
}

export function loadFixture(name: FixtureName): ImageLike {
  return decodePng(new Uint8Array(readFileSync(join(here, `${name}.png`))));
}

export const fixturePath = (name: string): string => join(here, name);
