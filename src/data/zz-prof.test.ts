import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { it } from "vitest";
import { canonName } from "./places";
it("prof", async () => {
  const out: Record<string, number> = {};
  let t = performance.now();
  const bytes = new Uint8Array(readFileSync("src/data/geonames-in.json.gz"));
  const txt = new TextDecoder().decode(gunzipSync(bytes));
  out.gunzip = performance.now() - t; t = performance.now();
  const doc = JSON.parse(txt) as { rows: unknown[][] };
  out.parse = performance.now() - t; t = performance.now();
  const keys: string[] = [];
  for (const r of doc.rows) { keys.push(canonName(String(r[0]))); for (const a of String(r[1]).split("|")) if (a) keys.push(canonName(a)); }
  out.canon = performance.now() - t; t = performance.now();
  const packed = keys.map((k, i) => `${k}\u00000${i}`);
  out.pack = performance.now() - t; t = performance.now();
  packed.sort();
  out.sort = performance.now() - t; t = performance.now();
  const idx = Int32Array.from(keys.keys());
  idx.sort((a, b) => (keys[a]! < keys[b]! ? -1 : keys[a]! > keys[b]! ? 1 : 0));
  out.sortIdx = performance.now() - t;
  const nonAscii = keys.filter((k) => /[^\x00-\x7f]/.test(k)).length;
  writeFileSync(process.env.OUTF as string, JSON.stringify({ ...out, n: keys.length, nonAscii }));
}, 60000);
