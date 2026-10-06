import { it } from "vitest";
import { writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";
import { loadFixture, loadTruth, type FixtureName } from "../../test/palm-fixtures";
import { homographyFromLandmarks, warpPerspective } from "./rectify";
import { luma8, enhanceGrey, maskEnhanced } from "./enhance";
import { ridgeFilter, nonMaxSuppress, ridgeMask } from "./ridge";
import { zhangSuen } from "./thin";
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc = (b: Buffer) => { let c = 0xffffffff; for (const v of b) c = CRC[(c ^ v) & 0xff]! ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const chunk = (t: string, d: Buffer) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
function png(path: string, g: ArrayLike<number>, w: number, h: number, scale: number) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw[y * (w + 1) + 1 + x] = Math.max(0, Math.min(255, Math.round(g[y * w + x]! * scale)));
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 0;
  writeFileSync(path, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk("IHDR", ih), chunk("IDAT", deflateSync(raw)), chunk("IEND", Buffer.alloc(0))]));
}
it("dump", () => {
  const truth = loadTruth();
  const name = (process.env.FIX ?? "synthetic-clean") as FixtureName;
  const img = loadFixture(name);
  const H = homographyFromLandmarks(truth.landmarks, img.width, img.height)!;
  const print = warpPerspective(img, H, 512);
  const grey = luma8(print);
  const { blackHat, blurred } = enhanceGrey(grey, 512, 512);
  const enh = maskEnhanced(print, grey, blackHat, blurred);
  let mx = 0; for (const v of enh.blackHat) mx = Math.max(mx, v);
  console.log("bh max", mx);
  png("C:/Users/ttrah/AppData/Local/Temp/claude/C--Work-Personal-Projects-02-jyoti-astrology-palmistry/611d7fe1-7196-464d-a9e2-71d133fef56e/scratchpad/" + name + "-grey.png", grey, 512, 512, 1);
  png("C:/Users/ttrah/AppData/Local/Temp/claude/C--Work-Personal-Projects-02-jyoti-astrology-palmistry/611d7fe1-7196-464d-a9e2-71d133fef56e/scratchpad/" + name + "-bh.png", enh.ridgeInput, 512, 512, 255 / mx);
  const r = ridgeFilter(enh.ridgeInput, 512, 512);
  png("C:/Users/ttrah/AppData/Local/Temp/claude/C--Work-Personal-Projects-02-jyoti-astrology-palmistry/611d7fe1-7196-464d-a9e2-71d133fef56e/scratchpad/" + name + "-resp.png", r.response, 512, 512, 255);
  const rm = ridgeMask(enh.ridgeInput, 512, 512);
  png("C:/Users/ttrah/AppData/Local/Temp/claude/C--Work-Personal-Projects-02-jyoti-astrology-palmistry/611d7fe1-7196-464d-a9e2-71d133fef56e/scratchpad/" + name + "-mask.png", rm.mask, 512, 512, 255);
  const sk = zhangSuen(Uint8Array.from(rm.mask), 512, 512);
  const ov = new Float32Array(512 * 512); for (let i = 0; i < ov.length; i++) ov[i] = sk[i] ? 255 : grey[i]! * 0.5;
  png("C:/Users/ttrah/AppData/Local/Temp/claude/C--Work-Personal-Projects-02-jyoti-astrology-palmistry/611d7fe1-7196-464d-a9e2-71d133fef56e/scratchpad/" + name + "-skel.png", ov, 512, 512, 1);
});
