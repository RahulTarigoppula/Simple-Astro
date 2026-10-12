#!/usr/bin/env node
// Convert PyJHora's Aṣṭakūṭa table (all_nak_pad_boy_girl.csv — DATA, not code) into the compact
// fixture src/engine/__fixtures__/ashtakoota-oracle.bin. PyJHora is AGPL: it is never a dependency and
// none of its code is copied; only the numbers in its CSV are committed, as this binary.
//
// Usage (the CSV lives OUTSIDE the repo, in a throwaway folder):
//   node scripts/import-oracle.mjs [path/to/all_nak_pad_boy_girl.csv]
// Source: https://github.com/naturalstupid/PyJHora — src/jhora/data/all_nak_pad_boy_girl.csv
//
// CSV row (no header): boyNak(1..27), boyPada(1..4), girlNak, girlPada,
//   varna, vashya, gana, tara, yoni, maitri, bhakoot, nadi, total, mahendra, vedha, rajju, sthree
// (note PyJHora's column order: gana before tara). The four porutham booleans are not imported.
//
// ── Binary format ────────────────────────────────────────────────────────────
//   bytes 0..3   ASCII magic "AKO1"
//   then 11 664 little-endian uint16 records, one per pair, in order
//     index = boyPadaIdx * 108 + girlPadaIdx,   padaIdx = (nak − 1) * 4 + (pada − 1)   (0..107)
//   each record packs the eight koota scores (the total is their sum):
//     bit  0      varna    0 | 1
//     bits 1–2    vashya   code → [0, 0.5, 1, 2]
//     bits 3–4    tara     code → [0, 1.5, 3]
//     bits 5–7    yoni     0..4
//     bits 8–10   maitri   code → [0, 0.5, 1, 3, 4, 5]
//     bits 11–12  gana     code → [0, 1, 5, 6]
//     bit  13     bhakoot  0 → 0, 1 → 7
//     bit  14     nadi     0 → 0, 1 → 8
//     bit  15     reserved, 0
// Size: 4 + 2 × 11 664 = 23 332 bytes.
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const csvPath = resolve(process.argv[2] ?? "C:/Users/ttrah/AppData/Local/Temp/claude/oracle/all_nak_pad_boy_girl.csv");
const outPath = resolve(here, "../src/engine/__fixtures__/ashtakoota-oracle.bin");

export const CODES = {
  vashya: [0, 0.5, 1, 2],
  tara: [0, 1.5, 3],
  maitri: [0, 0.5, 1, 3, 4, 5],
  gana: [0, 1, 5, 6],
};

function code(table, value, what, line) {
  const i = table.indexOf(value);
  if (i < 0) throw new Error(`line ${line}: ${what} value ${value} has no code`);
  return i;
}

const lines = readFileSync(csvPath, "utf8")
  .split(/\r?\n/)
  .filter((l) => l.trim() !== "");
if (lines.length !== 11664) throw new Error(`expected 11664 rows, found ${lines.length}`);

const records = new Uint16Array(11664);
const seen = new Uint8Array(11664);
lines.forEach((line, n) => {
  const f = line.split(",");
  const [bn, bp, gn, gp] = f.slice(0, 4).map(Number);
  const [varna, vashya, gana, tara, yoni, maitri, bhakoot, nadi, total] = f.slice(4, 13).map(Number);
  const sum = varna + vashya + gana + tara + yoni + maitri + bhakoot + nadi;
  if (Math.abs(sum - total) > 1e-9) throw new Error(`line ${n + 1}: kootas sum ${sum} ≠ total ${total}`);
  if (![0, 1].includes(varna) || ![0, 7].includes(bhakoot) || ![0, 8].includes(nadi) || !(yoni >= 0 && yoni <= 4)) {
    throw new Error(`line ${n + 1}: unexpected value in ${line}`);
  }
  const idx = ((bn - 1) * 4 + (bp - 1)) * 108 + ((gn - 1) * 4 + (gp - 1));
  if (!(idx >= 0 && idx < 11664) || seen[idx]) throw new Error(`line ${n + 1}: bad or duplicate pair`);
  seen[idx] = 1;
  records[idx] =
    varna |
    (code(CODES.vashya, vashya, "vashya", n + 1) << 1) |
    (code(CODES.tara, tara, "tara", n + 1) << 3) |
    (yoni << 5) |
    (code(CODES.maitri, maitri, "maitri", n + 1) << 8) |
    (code(CODES.gana, gana, "gana", n + 1) << 11) |
    ((bhakoot === 7 ? 1 : 0) << 13) |
    ((nadi === 8 ? 1 : 0) << 14);
});

const buf = Buffer.alloc(4 + 2 * 11664);
buf.write("AKO1", 0, "ascii");
for (let i = 0; i < 11664; i++) buf.writeUInt16LE(records[i], 4 + 2 * i);
writeFileSync(outPath, buf);
console.log(`wrote ${outPath} (${buf.length} bytes) from ${csvPath}`);
