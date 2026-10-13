#!/usr/bin/env node
// Builds src/data/bsc5.bin, the naked-eye star field for the Rooftop sky (§3.8, §6.14).
//
// Source: the Yale Bright Star Catalogue, 5th Revised Edition (Hoffleit & Warren 1991), CDS
// catalogue V/50 (https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz). The BSC5 is a US
// government/academic data product distributed without restriction; it is treated as public
// domain (HYG is deliberately avoided: CC BY-SA). Fallback mirror: SAO/TDC
// http://tdc-www.harvard.edu/catalogs/bsc5.dat.gz (same fixed-width records).
//
// The download is cached OUTSIDE the repo (default: <os tmp>/claude/bsc5, override with
// BSC5_CACHE). Pass --refresh to re-download. No npm dependencies.
//
// Kept: every record with a J2000 position and a V magnitude, sorted brightest first. The BSC5 is
// itself the naked-eye catalogue (complete to V ≈ 6.5, the dark-sky limit): 5 080 of its stars are
// V ≤ 6.0 and 9 096 have a position, so the "~9 100 stars" of §6.14 is the whole catalogue. The
// renderers size/fade by magnitude, so stars fainter than 6.0 are barely-there specks, exactly as
// on a dark rooftop. `--mag-limit 6` reproduces the strict cut.
// Positions are J2000.0 (equinox and epoch); proper motion is not applied (≤ 2.3″/yr for any
// kept star: < 4′ over a century, below a dot's width on screen).
//
// ── Binary format (little-endian), documented here and decoded by src/engine/sky/stars.ts ──
//   offset 0   4 bytes  ASCII magic "BSC5"
//   offset 4   u16      format version (1)
//   offset 6   u16      reserved (0)
//   offset 8   u32      N = star count
//   offset 12  u16[N]   RA  quantised: q = round(ra / 2π · 65536) mod 65536     (ra in [0, 2π))
//   ...        u16[N]   Dec quantised: q = round((dec + π/2) / π · 65535)        (dec in [−π/2, π/2])
//   ...        u8[N]    Vmag quantised: q = round((V + 2) · 20)                   (V in [−2, 10.75])
// Resolution: RA 0.33′, Dec 0.16′, magnitude 0.05, finer than any pixel the app draws.
// 5 bytes per star → 45 492 B for 9 096 stars (budget ≤ 60 kB).

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gunzipSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/data/bsc5.bin");
const CACHE = process.env.BSC5_CACHE ?? join(tmpdir(), "claude", "bsc5");
const SOURCES = ["https://cdsarc.cds.unistra.fr/ftp/V/50/catalog.gz", "http://tdc-www.harvard.edu/catalogs/bsc5.dat.gz"];
const REFRESH = process.argv.includes("--refresh");
const limitArg = process.argv.indexOf("--mag-limit");
const MAG_LIMIT = limitArg > 0 ? Number(process.argv[limitArg + 1]) : Number.POSITIVE_INFINITY;
const BUDGET_BYTES = 60 * 1024;

async function fetchCatalog() {
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, "catalog.gz");
  if (existsSync(file) && !REFRESH) return readFileSync(file);
  let lastErr = null;
  for (const url of SOURCES) {
    try {
      console.log(`downloading ${url}`);
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(file, buf);
      return buf;
    } catch (e) {
      lastErr = e;
      console.warn(`  failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
  throw lastErr ?? new Error("no source reachable");
}

/** 1-indexed inclusive byte columns, as the CDS ReadMe writes them. */
const col = (line, a, b) => line.slice(a - 1, b).trim();

function parse(text) {
  const stars = [];
  let skipped = 0;
  for (const line of text.split(/\r?\n/)) {
    if (line.length < 107) continue;
    const rah = col(line, 76, 77);
    const ded = col(line, 85, 86);
    const vmag = col(line, 103, 107);
    if (!rah || !ded || !vmag) {
      skipped++; // the 14 novae / non-stellar entries without a J2000 position
      continue;
    }
    const ra = ((Number(rah) + Number(col(line, 78, 79)) / 60 + Number(col(line, 80, 83)) / 3600) * 15 * Math.PI) / 180;
    const sign = col(line, 84, 84) === "-" ? -1 : 1;
    const dec = (sign * (Number(ded) + Number(col(line, 87, 88)) / 60 + Number(col(line, 89, 90)) / 3600) * Math.PI) / 180;
    const mag = Number(vmag);
    if (!Number.isFinite(ra) || !Number.isFinite(dec) || !Number.isFinite(mag)) {
      skipped++;
      continue;
    }
    if (mag > MAG_LIMIT) continue;
    stars.push({ hr: Number(col(line, 1, 4)), ra, dec, mag });
  }
  return { stars, skipped };
}

function encode(stars) {
  const n = stars.length;
  const buf = Buffer.alloc(12 + n * 5);
  buf.write("BSC5", 0, "ascii");
  buf.writeUInt16LE(1, 4);
  buf.writeUInt16LE(0, 6);
  buf.writeUInt32LE(n, 8);
  const raOff = 12;
  const decOff = raOff + 2 * n;
  const magOff = decOff + 2 * n;
  stars.forEach((s, i) => {
    buf.writeUInt16LE(Math.round((s.ra / (2 * Math.PI)) * 65536) % 65536, raOff + 2 * i);
    buf.writeUInt16LE(Math.round(((s.dec + Math.PI / 2) / Math.PI) * 65535), decOff + 2 * i);
    buf.writeUInt8(Math.max(0, Math.min(255, Math.round((s.mag + 2) * 20))), magOff + i);
  });
  return buf;
}

const raw = gunzipSync(await fetchCatalog()).toString("latin1");
const { stars, skipped } = parse(raw);
stars.sort((a, b) => a.mag - b.mag || a.hr - b.hr);
const bin = encode(stars);
if (bin.length > BUDGET_BYTES) throw new Error(`bsc5.bin is ${bin.length} B, over the ${BUDGET_BYTES} B budget`);

// Sanity: Sirius (HR 2491) must be the brightest and sit near RA 6h45m, Dec −16°43′.
const sirius = stars[0];
if (sirius?.hr !== 2491) throw new Error("Sirius is not the brightest star, parse error");

writeFileSync(OUT, bin);
console.log(
  `bsc5.bin: ${stars.length} stars (${Number.isFinite(MAG_LIMIT) ? `V ≤ ${MAG_LIMIT}` : "whole catalogue"}), ${skipped} records without a position, ${bin.length} bytes`,
);
