#!/usr/bin/env node
// Builds src/data/geonames-in.json.gz — the offline birthplace gazetteer.
//
// Sources (GeoNames, CC BY 4.0, https://download.geonames.org/export/dump/):
//   cities15000.zip                      world populated places >= 15 000
//   IN.zip NP.zip LK.zip PK.zip BD.zip   full country dumps (feature class P)
//   alternatenames/{CC}.zip              language-tagged alternate names (historic flags)
//   admin1CodesASCII.txt                 admin1 code -> name
//
// Downloads are cached OUTSIDE the repo (default: <os tmp>/claude/geonames, override with
// GEONAMES_CACHE). Pass --refresh to re-download. No npm dependencies: a minimal zip reader
// built on zlib.inflateRawSync unpacks the dumps.
//
// Output: compact JSON { v, fields, rows, attribution } where every row is an array in
// `fields` order. Gzipped at level 9; the script asserts the size budget and that the
// must-resolve names (including historical names such as Bombay / Madras) are present.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync, inflateRawSync } from "node:zlib";

const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(HERE, "../src/data/geonames-in.json.gz");
const CACHE = process.env.GEONAMES_CACHE ?? join(tmpdir(), "claude", "geonames");
const BASE = "https://download.geonames.org/export/dump/";
const REFRESH = process.argv.includes("--refresh");

/** Hard budget from IMPLEMENTATION-PROMPT §7.4. */
const BUDGET_BYTES = 1_800_000; // decimal MB — the stricter reading
/** Leave a little headroom below the budget when filling with optional rows. */
const FILL_TARGET = BUDGET_BYTES - 24 * 1024;

const FULL_COUNTRIES = ["IN", "NP", "LK", "PK", "BD"];
/** Countries whose language-tagged alternate names we read (historic names matter here). */
const ALT_COUNTRIES = [...FULL_COUNTRIES, "MM"];
/** Feature codes we never want: historical, abandoned, destroyed populated places. */
const DROP_CODES = new Set(["PPLH", "PPLQ", "PPLW"]);
const ADMIN_SEAT = /^(PPLC|PPLA\d?|PPLG)$/;
const MAX_ALTS = 3;

/**
 * Places that must be present whatever their population, with extra search aliases.
 * 1253530 = Vaithīsvarankoil (Vaitheeswaran Koil), Nagapattinam district, Tamil Nadu —
 * a temple town famous for its nadi astrologers.
 */
const WHITELIST = new Map([[1253530, ["Vaitheeswaran Koil", "Vaitheeswarankoil"]]]);

/** name -> aliases that must reach it. */
const MUST_RESOLVE = [
  ["Madurai", "IN", []],
  ["Vaitheeswaran Koil", "IN", []],
  ["Bengaluru", "IN", ["Bangalore"]],
  ["Mumbai", "IN", ["Bombay"]],
  ["Chennai", "IN", ["Madras"]],
  ["Kolkata", "IN", ["Calcutta"]],
  ["New Delhi", "IN", []],
  ["Kathmandu", "NP", []],
  ["Colombo", "LK", []],
  ["New York", "US", []],
  ["London", "GB", []],
];

const SKIP_ALT_LANGS = new Set(["link", "iata", "icao", "faac", "unlc", "post", "wkdt", "abbr", "fr_1793", "tcid", "phon", "piny"]);

// ─── download + unzip ──────────────────────────────────────────────────────────

async function fetchCached(rel) {
  const dest = join(CACHE, rel.replace(/\//g, "_"));
  if (!REFRESH && existsSync(dest) && statSync(dest).size > 0) return readFileSync(dest);
  process.stdout.write(`  downloading ${rel} … `);
  const res = await fetch(BASE + rel);
  if (!res.ok) throw new Error(`GET ${BASE + rel} -> HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(dest, buf);
  console.log(`${(buf.length / 1e6).toFixed(1)} MB`);
  return buf;
}

/** Minimal zip reader: central directory -> local header -> stored/deflated payload. */
function readZipEntry(zip, wanted) {
  let eocd = -1;
  for (let i = zip.length - 22; i >= Math.max(0, zip.length - 65557); i--) {
    if (zip.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("zip: end of central directory not found");
  const count = zip.readUInt16LE(eocd + 10);
  let p = zip.readUInt32LE(eocd + 16);
  for (let n = 0; n < count; n++) {
    if (zip.readUInt32LE(p) !== 0x02014b50) throw new Error("zip: bad central directory entry");
    const method = zip.readUInt16LE(p + 10);
    const csize = zip.readUInt32LE(p + 20);
    const nameLen = zip.readUInt16LE(p + 28);
    const extraLen = zip.readUInt16LE(p + 30);
    const commentLen = zip.readUInt16LE(p + 32);
    const local = zip.readUInt32LE(p + 42);
    const name = zip.toString("utf8", p + 46, p + 46 + nameLen);
    p += 46 + nameLen + extraLen + commentLen;
    if (name !== wanted) continue;
    if (zip.readUInt32LE(local) !== 0x04034b50) throw new Error("zip: bad local header");
    const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
    const data = zip.subarray(start, start + csize);
    if (method === 0) return Buffer.from(data);
    if (method === 8) return inflateRawSync(data);
    throw new Error(`zip: unsupported method ${method}`);
  }
  throw new Error(`zip: entry ${wanted} not found`);
}

function* tsv(buf) {
  const text = buf.toString("utf8");
  let i = 0;
  while (i < text.length) {
    let j = text.indexOf("\n", i);
    if (j < 0) j = text.length;
    const line = text.slice(i, j).replace(/\r$/, "");
    i = j + 1;
    if (line && !line.startsWith("#")) yield line.split("\t");
  }
}

// ─── text helpers ──────────────────────────────────────────────────────────────

const fold = (s) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[‘’ʼ`]/g, "'")
    .toLowerCase()
    .trim();
const squash = (s) => fold(s).replace(/[^a-z0-9]/g, "");
const isLatin = (s) => /^[A-Za-z][A-Za-z .'-]*$/.test(s.normalize("NFD").replace(/\p{M}/gu, ""));

function levenshtein(a, b) {
  if (a === b) return 0;
  const prev = new Array(b.length + 1);
  for (let j = 0; j <= b.length; j++) prev[j] = j;
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** Two spellings are "close" when fuzzy search would already bridge them. */
function close(a, b) {
  const x = squash(a);
  const y = squash(b);
  if (!x || !y) return true;
  if (x === y || x.startsWith(y) || y.startsWith(x)) return true;
  return levenshtein(x, y) <= Math.max(1, Math.floor(Math.min(x.length, y.length) * 0.25));
}

const round4 = (x) => Math.round(Number(x) * 1e4) / 1e4;

// ─── build ─────────────────────────────────────────────────────────────────────

async function main() {
  mkdirSync(CACHE, { recursive: true });
  console.log(`GeoNames cache: ${CACHE}`);

  const admin1 = new Map();
  for (const c of tsv(await fetchCached("admin1CodesASCII.txt"))) admin1.set(c[0], c[1] ?? "");

  /** geonameId -> Map<foldedAlt, { text, score }> */
  const altScores = new Map();
  for (const cc of ALT_COUNTRIES) {
    const buf = readZipEntry(await fetchCached(`alternatenames/${cc}.zip`), `${cc}.txt`);
    for (const c of tsv(buf)) {
      const id = Number(c[1]);
      const lang = c[2] ?? "";
      const raw = c[3] ?? "";
      if (SKIP_ALT_LANGS.has(lang) || raw.length < 3 || raw.length > 30) continue;
      const text = raw.normalize("NFD").replace(/\p{M}/gu, "").trim();
      if (!isLatin(text)) continue;
      let score = lang === "en" ? 3 : lang === "" ? 2 : 1;
      if (c[7] === "1") score += 2; // isHistoric — Bombay, Madras, Calcutta
      if (c[6] === "1") score += 1; // isColloquial
      let m = altScores.get(id);
      if (!m) {
        m = new Map();
        altScores.set(id, m);
      }
      const key = squash(text);
      const prev = m.get(key);
      if (prev) prev.score += score;
      else m.set(key, { text, score });
    }
  }

  function pickAlts(id, name, ascii) {
    const chosen = [];
    for (const extra of WHITELIST.get(id) ?? []) chosen.push(extra);
    const cands = [...(altScores.get(id)?.values() ?? [])].sort((a, b) => b.score - a.score || a.text.localeCompare(b.text));
    for (const c of cands) {
      if (chosen.length >= MAX_ALTS) break;
      if (c.score < 2) break;
      if (close(c.text, name) || close(c.text, ascii)) continue;
      if (chosen.some((x) => close(x, c.text))) continue;
      chosen.push(c.text);
    }
    return chosen;
  }

  /** Candidate rows; `tier` 0 = always, 1 = optional fill ranked by `rank`. */
  const cands = new Map();
  function consider(c, tier, rank) {
    const id = Number(c[0]);
    if (cands.has(id)) return;
    const [name, ascii, , lat, lon, fclass, fcode, cc, , a1] = [c[1], c[2], c[3], c[4], c[5], c[6], c[7], c[8], c[9], c[10]];
    if (fclass !== "P" || DROP_CODES.has(fcode)) return;
    const tz = c[17];
    if (!tz || !name) return;
    cands.set(id, {
      tier,
      rank,
      row: [
        name,
        pickAlts(id, name, ascii).join("|"),
        admin1.get(`${cc}.${a1}`) ?? "",
        cc,
        round4(lat),
        round4(lon),
        tz,
        id,
        Number(c[14]) || 0,
      ],
    });
  }

  for (const cc of FULL_COUNTRIES) {
    const buf = readZipEntry(await fetchCached(`${cc}.zip`), `${cc}.txt`);
    const optional = [];
    for (const c of tsv(buf)) {
      const id = Number(c[0]);
      const pop = Number(c[14]) || 0;
      if (WHITELIST.has(id) || pop > 0 || ADMIN_SEAT.test(c[7] ?? "")) consider(c, 0, 0);
      else if (c[6] === "P" && c[3]) optional.push(c);
    }
    // Unpopulated villages: rank by how many alternate spellings GeoNames carries —
    // a cheap proxy for "somebody wrote this place down more than once".
    for (const c of optional) consider(c, 1, (c[3].match(/,/g)?.length ?? 0) + 1);
  }
  for (const c of tsv(readZipEntry(await fetchCached("cities15000.zip"), "cities15000.txt"))) {
    if (!FULL_COUNTRIES.includes(c[8])) consider(c, 0, 0);
  }

  const required = [...cands.values()].filter((x) => x.tier === 0).map((x) => x.row);
  const optional = [...cands.values()]
    .filter((x) => x.tier === 1)
    .sort((a, b) => b.rank - a.rank || a.row[7] - b.row[7])
    .map((x) => x.row);

  const fields = ["name", "alt", "admin1", "country", "lat", "lon", "tz", "id", "pop"];
  const encode = (rows) => {
    const sorted = [...rows].sort((a, b) => a[3].localeCompare(b[3]) || a[2].localeCompare(b[2]) || b[8] - a[8] || a[7] - b[7]);
    const doc = {
      v: 1,
      fields,
      attribution: "GeoNames (geonames.org), CC BY 4.0",
      rows: sorted,
    };
    return gzipSync(Buffer.from(JSON.stringify(doc)), { level: 9 });
  };

  // Binary-search how many optional villages fit under the budget.
  let lo = 0;
  let hi = optional.length;
  let best = encode(required);
  if (best.length > FILL_TARGET) throw new Error(`required rows alone are ${best.length} B gz`);
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const gz = encode(required.concat(optional.slice(0, mid)));
    if (gz.length <= FILL_TARGET) {
      lo = mid;
      best = gz;
    } else hi = mid - 1;
  }
  const rows = required.concat(optional.slice(0, lo));
  const gz = lo === 0 ? encode(required) : best;

  // ─── assertions ──────────────────────────────────────────────────────────────
  if (gz.length > BUDGET_BYTES) throw new Error(`gazetteer is ${gz.length} B gz > ${BUDGET_BYTES}`);
  const byKey = new Map();
  for (const r of rows) {
    for (const k of [r[0], ...String(r[1]).split("|").filter(Boolean)]) {
      const key = squash(k);
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(r);
    }
  }
  const resolveName = (q, cc) => {
    const hits = (byKey.get(squash(q)) ?? []).concat(byKey.get(squash(`${q} City`)) ?? []);
    return hits.filter((r) => r[3] === cc).sort((a, b) => b[8] - a[8])[0];
  };
  const failures = [];
  for (const [name, cc, aliases] of MUST_RESOLVE) {
    const hit = resolveName(name, cc);
    if (!hit) {
      failures.push(name);
      continue;
    }
    for (const a of aliases) {
      const ah = resolveName(a, cc);
      if (!ah || ah[7] !== hit[7]) failures.push(`${a} -> ${name}`);
    }
  }
  if (failures.length) throw new Error(`must-resolve names missing: ${failures.join(", ")}`);

  mkdirSync(dirname(OUT), { recursive: true });
  writeFileSync(OUT, gz);
  console.log(
    `wrote ${OUT}\n  ${rows.length} rows (${required.length} required + ${lo}/${optional.length} optional villages), ${gz.length} B gz (budget ${Math.round(BUDGET_BYTES)} B)`,
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
