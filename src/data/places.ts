// Birthplace lookup (IMPLEMENTATION-PROMPT §7).
//
// Two strictly separated paths:
//   1. searchPlaces() , the bundled GeoNames gazetteer, in memory, synchronous. Typing calls
//      only this. It NEVER touches the network.
//   2. searchOnline() , Open-Meteo, then Nominatim; called only from an explicit
//      "search online ⌑" submit, only when settings.onlineLookupAllowed is true. Results are
//      cached in db.places for 90 days so a place looked up once is offline forever.

import tzLookup from "@photostructure/tz-lookup";
import type { Place } from "../engine/types";
import { getPlaceCache, getSettings, PLACE_CACHE_TTL, putPlaceCache } from "./repo";

// ─── the bundled gazetteer ─────────────────────────────────────────────────────
//
// A compact, purpose-built index (no MiniSearch): ~80 k places must fit a phone WebView, so
// every column lives in a typed array or one joined string.
//
//   keys      every searchable form, folded ("vaithisvarankoil", "vaitheeswaran koil"),
//             sorted, joined by "\n" in ONE string; Uint32 offsets, the owning entry and the
//             kind (name / alt).
//   lookup    prefix → binary search over the sorted keys, compared in place with
//             charCodeAt (no allocation); exact = prefix of equal length; word-start =
//             indexOf(" q") and substring = indexOf(q) over the joined string; fuzzy =
//             a bounded Levenshtein (≤ 1 for 4-6 letters, ≤ 2 for 7+) over keys sharing the
//             query's first letter.
//   ranking   match quality tier, then population (log scale, South Asia slightly boosted).

/** One gazetteer row, decoded from the columnar file. */
export interface GazetteerEntry {
  id: number; // geonameId
  name: string;
  alt: string; // "Bombay|Bombaim", a few historical / English alternates
  admin1: string;
  country: string;
  lat: number;
  lon: number;
  tz: string;
  pop: number;
}

export interface Gazetteer {
  size: number;
  /** Search the bundle; never the network. */
  search(q: string, limit?: number): Place[];
  get(geonameId: number): Place | undefined;
}

const REQUIRED_FIELDS = ["name", "alt", "admin1", "country", "lat", "lon", "tz", "id", "pop"] as const;
type FieldName = (typeof REQUIRED_FIELDS)[number];
type FieldIndex = Record<FieldName, number>;

/** Fold case and diacritics: "Vaithīsvarankoil" → "vaithisvarankoil". */
export function foldTerm(s: string): string {
  // biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII fast path
  if (/^[\x00-\x7f]*$/.test(s)) return s.toLowerCase();
  return s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[‘’ʼ`]/g, "'")
    .toLowerCase();
}

/** Folded, apostrophe-free, punctuation collapsed to single spaces. */
export function canonName(s: string): string {
  // Fast path for the ≈ 99.7 % of strings that are ASCII once Latin accents are stripped.
  let t = s;
  if (NON_ASCII.test(t)) {
    t = t.normalize("NFD").replace(/[̀-ͯ]/g, "");
    if (NON_ASCII.test(t)) return canonSlow(s);
  }
  t = t.toLowerCase();
  if (CLEAN.test(t)) return t;
  return t
    .replace(/['`]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
// biome-ignore lint/suspicious/noControlCharactersInRegex: ASCII range test
const NON_ASCII = /[^\x00-\x7f]/;
const CLEAN = /^[a-z0-9]+(?: [a-z0-9]+)*$/;

function canonSlow(s: string): string {
  return foldTerm(s)
    .replace(/'/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

const SOUTH_ASIA = new Set(["IN", "NP", "LK", "PK", "BD", "BT"]);
const SOUTH_ASIA_BOOST = 0.5; // in log10(population) units, about ×3

const KIND_NAME = 0;
const KIND_ALT = 1;

// Match-quality tiers (higher wins; population breaks ties within a tier).
const T_EXACT = 10;
const T_PREFIX_NAME = 8;
const T_PREFIX_ALT = 7.5;
const T_WORD = 6;
const T_TOKENS = 5;
const T_WORD_PREFIX = 3.75;
const T_FUZZY_FULL = 4; // −0.5 per extra edit
const T_FUZZY_PREFIX = 3;
const T_SUBSTRING = 1;

const SUBSTRING_CAP = 400;
const WORD_CAP = 3000;
const SPAN = 1 << 20; // max rows / keys; also the radix packing (code × SPAN + index) sorts
const MAX_QUERY = 60;

interface Compact {
  n: number;
  nameText: string;
  nameOff: Uint32Array; // n + 1
  wordsText: string; // per entry: " name alt1 alt2 | admin1 | cc " (folded) for token checks
  wordsOff: Uint32Array; // n + 1
  lat: Int32Array; // × 1e4
  lon: Int32Array;
  id: Int32Array;
  pop: Uint32Array;
  rank: Float32Array;
  admin1: Uint16Array;
  admin1Names: string[];
  country: Uint16Array;
  countries: string[];
  tz: Uint16Array;
  tzs: string[];
  keyText: string; // sorted keys, each followed by "\n"
  keyOff: Uint32Array; // K + 1
  keyEntry: Int32Array;
  keyKind: Uint8Array;
  byId: Int32Array; // entry indices sorted by geonameId
}

function intern(table: string[], map: Map<string, number>, s: string): number {
  let i = map.get(s);
  if (i === undefined) {
    i = table.length;
    table.push(s);
    map.set(s, i);
  }
  return i;
}

function fieldIndex(fields: unknown[]): FieldIndex {
  const idx = {} as FieldIndex;
  for (const f of REQUIRED_FIELDS) {
    const i = fields.indexOf(f);
    if (i < 0) throw new Error(`gazetteer: missing field ${f}`);
    idx[f] = i;
  }
  return idx;
}

function checkDoc(doc: unknown): { fields: unknown[]; rows: unknown[] } {
  if (typeof doc !== "object" || doc === null) throw new Error("gazetteer: not an object");
  const { v, fields, rows } = doc as { v?: unknown; fields?: unknown; rows?: unknown };
  if (v !== 1) throw new Error(`gazetteer: unsupported version ${String(v)}`);
  if (!Array.isArray(fields) || !Array.isArray(rows)) throw new Error("gazetteer: bad shape");
  return { fields, rows };
}

/** Build the compact index straight from the file's row arrays (no per-row objects kept). */
/** Sort symbol of a key character, consistent with UTF-16 string order for canon keys. */
function sym(ch: number): number {
  if (ch === 32) return 1;
  if (ch >= 48 && ch <= 57) return ch - 46; // 2..11
  if (ch >= 97 && ch <= 122) return ch - 85; // 12..37
  return 38; // non-ASCII letters/digits sort after "z"; ties are settled by string compare
}

/** First six characters as a base-39 number; "end of key" is 0, so shorter sorts first. */
function prefixCode(key: string): number {
  let v = 0;
  for (let i = 0; i < 6; i++) v = v * 39 + (i < key.length ? sym(key.charCodeAt(i)) : 0);
  return v;
}

/** Build the compact index straight from the file's row arrays (no per-row objects kept). */
function buildCompact(rows: unknown[], idx: FieldIndex): Compact {
  const valid: unknown[][] = [];
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    if (!Number.isFinite(Number(r[idx.id])) || !Number.isFinite(Number(r[idx.lat])) || !Number.isFinite(Number(r[idx.lon]))) continue;
    valid.push(r);
  }
  const n = valid.length;
  if (n >= SPAN) throw new Error(`gazetteer: ${n} rows exceeds ${SPAN}`);
  const lat = new Int32Array(n);
  const lon = new Int32Array(n);
  const id = new Int32Array(n);
  const pop = new Uint32Array(n);
  const rank = new Float32Array(n);
  const admin1 = new Uint16Array(n);
  const country = new Uint16Array(n);
  const tz = new Uint16Array(n);
  const nameOff = new Uint32Array(n + 1);
  const wordsOff = new Uint32Array(n + 1);
  const admin1Names: string[] = [];
  const admin1Tail: string[] = []; // "| tamil nadu | " per admin1 index, built once
  const countries: string[] = [];
  const tzs: string[] = [];
  const a1Map = new Map<string, number>();
  const ccMap = new Map<string, number>();
  const tzMap = new Map<string, number>();
  const names: string[] = new Array(n);
  const words: string[] = new Array(n);
  const keys: string[] = [];
  const keyEntryTmp: number[] = [];
  const keyKindTmp: number[] = [];
  let nameLen = 0;
  let wordsLen = 0;

  for (let e = 0; e < n; e++) {
    const r = valid[e] as unknown[];
    const name = String(r[idx.name] ?? "");
    const cc = String(r[idx.country] ?? "");
    const p = Math.max(0, Math.min(0xffffffff, Math.round(Number(r[idx.pop]) || 0)));
    lat[e] = Math.round(Number(r[idx.lat]) * 1e4);
    lon[e] = Math.round(Number(r[idx.lon]) * 1e4);
    id[e] = Number(r[idx.id]);
    pop[e] = p;
    rank[e] = Math.log10(1 + p) + (SOUTH_ASIA.has(cc) ? SOUTH_ASIA_BOOST : 0);
    const a1 = String(r[idx.admin1] ?? "");
    let ai = a1Map.get(a1);
    if (ai === undefined) {
      ai = admin1Names.length;
      admin1Names.push(a1);
      admin1Tail.push(`| ${canonName(a1)} | `);
      a1Map.set(a1, ai);
    }
    admin1[e] = ai;
    country[e] = intern(countries, ccMap, cc);
    tz[e] = intern(tzs, tzMap, String(r[idx.tz] ?? ""));
    names[e] = name;
    nameOff[e] = nameLen;
    nameLen += name.length;

    let w = " ";
    const key = canonName(name);
    if (key) {
      keys.push(key);
      keyEntryTmp.push(e);
      keyKindTmp.push(KIND_NAME);
      w += `${key} `;
    }
    const alt = r[idx.alt];
    if (typeof alt === "string" && alt) {
      for (const a of alt.split("|")) {
        const ak = a ? canonName(a) : "";
        if (!ak) continue;
        keys.push(ak);
        keyEntryTmp.push(e);
        keyKindTmp.push(KIND_ALT);
        w += `${ak} `;
      }
    }
    w += `${admin1Tail[ai]}${cc.toLowerCase()} `;
    words[e] = w;
    wordsOff[e] = wordsLen;
    wordsLen += w.length;
  }
  nameOff[n] = nameLen;
  wordsOff[n] = wordsLen;

  // Sort keys: a numeric sort on (six-character prefix code, key index), comparator-less
  // and fast, then settle runs that share a six-character prefix by string compare.
  const K = keys.length;
  if (K >= SPAN) throw new Error(`gazetteer: ${K} keys exceeds ${SPAN}`);
  const codes = new Float64Array(K);
  for (let k = 0; k < K; k++) codes[k] = prefixCode(keys[k] as string) * SPAN + k;
  codes.sort();
  const order = new Int32Array(K);
  for (let i = 0; i < K; i++) order[i] = (codes[i] as number) % SPAN;
  const byKey = (x: number, y: number): number => {
    const a = keys[x] as string;
    const b = keys[y] as string;
    return a < b ? -1 : a > b ? 1 : 0;
  };
  for (let i = 0; i < K; ) {
    const group = Math.floor((codes[i] as number) / SPAN);
    let j = i + 1;
    while (j < K && Math.floor((codes[j] as number) / SPAN) === group) j++;
    if (j - i > 1) order.subarray(i, j).sort(byKey);
    i = j;
  }

  const keyOff = new Uint32Array(K + 1);
  const keyEntry = new Int32Array(K);
  const keyKind = new Uint8Array(K);
  const sortedKeys: string[] = new Array(K);
  let off = 0;
  for (let i = 0; i < K; i++) {
    const k = order[i] as number;
    const key = keys[k] as string;
    sortedKeys[i] = key;
    keyEntry[i] = keyEntryTmp[k] as number;
    keyKind[i] = keyKindTmp[k] as number;
    keyOff[i] = off;
    off += key.length + 1;
  }
  keyOff[K] = off;

  // id × 2^20 + entry fits a double exactly (ids < 2^31); a comparator-less typed sort is fast.
  const idKeys = new Float64Array(n);
  for (let e = 0; e < n; e++) idKeys[e] = (id[e] as number) * SPAN + e;
  idKeys.sort();
  const byId = new Int32Array(n);
  for (let i = 0; i < n; i++) byId[i] = (idKeys[i] as number) % SPAN;

  return {
    n,
    nameText: flatten(names.join("")),
    nameOff,
    wordsText: flatten(words.join("")),
    wordsOff,
    lat,
    lon,
    id,
    pop,
    rank,
    admin1,
    admin1Names,
    country,
    countries,
    tz,
    tzs,
    keyText: flatten(`${sortedKeys.join("\n")}\n`),
    keyOff,
    keyEntry,
    keyKind,
    byId,
  };
}

/** Force a flat string (V8 keeps concatenations as ropes until first indexed access). */
function flatten(s: string): string {
  if (s.length > 0) s.charCodeAt(s.length - 1);
  return s;
}

function makeGazetteer(c: Compact): Gazetteer {
  const { keyText, keyOff, keyEntry, keyKind } = c;
  const K = keyEntry.length;
  const keyLen = (k: number): number => (keyOff[k + 1] as number) - (keyOff[k] as number) - 1;

  /** Compare key k against q over q's length: <0 key sorts before, 0 q is a prefix, >0 after. */
  const cmpPrefix = (k: number, q: string): number => {
    const start = keyOff[k] as number;
    for (let i = 0; i < q.length; i++) {
      const a = keyText.charCodeAt(start + i); // "\n" (10) ends a key and sorts first
      const b = q.charCodeAt(i);
      if (a !== b) return a - b;
    }
    return 0;
  };

  const prefixRange = (q: string): [number, number] => {
    let lo = 0;
    let hi = K;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cmpPrefix(mid, q) < 0) lo = mid + 1;
      else hi = mid;
    }
    const start = lo;
    hi = K;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (cmpPrefix(mid, q) <= 0) lo = mid + 1;
      else hi = mid;
    }
    return [start, lo];
  };

  const keyAt = (pos: number): number => {
    let lo = 0;
    let hi = K - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >>> 1;
      if ((keyOff[mid] as number) <= pos) lo = mid;
      else hi = mid - 1;
    }
    return lo;
  };

  // Bounded Levenshtein of q against key k: full distance and best prefix distance.
  const col = new Int32Array(MAX_QUERY + 2);
  const prev = new Int32Array(MAX_QUERY + 2);
  const fuzzy = (k: number, q: string, maxD: number): { full: number; prefix: number } => {
    const m = q.length;
    const start = keyOff[k] as number;
    const len = keyLen(k);
    const jMax = Math.min(len, m + maxD);
    for (let i = 0; i <= m; i++) prev[i] = i;
    let prefix = m;
    for (let j = 1; j <= jMax; j++) {
      const kc = keyText.charCodeAt(start + j - 1);
      col[0] = j;
      let rowMin = j;
      for (let i = 1; i <= m; i++) {
        const sub = (prev[i - 1] as number) + (q.charCodeAt(i - 1) === kc ? 0 : 1);
        const del = (prev[i] as number) + 1;
        const ins = (col[i - 1] as number) + 1;
        const v = sub < del ? (sub < ins ? sub : ins) : del < ins ? del : ins;
        col[i] = v;
        if (v < rowMin) rowMin = v;
      }
      if ((col[m] as number) < prefix) prefix = col[m] as number;
      for (let i = 0; i <= m; i++) prev[i] = col[i] as number;
      if (rowMin > maxD) return { full: maxD + 1, prefix };
    }
    const full = len <= m + maxD ? (prev[m] as number) : maxD + 1;
    return { full, prefix };
  };

  const toPlace = (e: number): Place => {
    const place: Place = {
      name: c.nameText.slice(c.nameOff[e], c.nameOff[e + 1]),
      country: c.countries[c.country[e] as number] ?? "",
      lat: (c.lat[e] as number) / 1e4,
      lon: (c.lon[e] as number) / 1e4,
      geonameId: c.id[e] as number,
      source: "bundle",
    };
    const a1 = c.admin1Names[c.admin1[e] as number];
    if (a1) place.admin1 = a1;
    const zone = c.tzs[c.tz[e] as number];
    if (zone) place.timezone = zone;
    return place;
  };

  /** Every key where `tok` starts a non-first word: indexOf(" tok") over the joined keys. */
  const wordStarts = (tok: string, cb: (e: number, whole: boolean) => void): void => {
    const needle = ` ${tok}`;
    let pos = keyText.indexOf(needle);
    let hits = 0;
    while (pos >= 0 && hits < WORD_CAP) {
      const next = keyText.charCodeAt(pos + needle.length);
      cb(keyEntry[keyAt(pos)] as number, next === 10 || next === 32);
      hits++;
      pos = keyText.indexOf(needle, pos + needle.length);
    }
  };

  const words = (e: number): string => c.wordsText.slice(c.wordsOff[e], c.wordsOff[e + 1]);

  function search(q: string, limit = 8): Place[] {
    const qc = canonName(q).slice(0, MAX_QUERY);
    if (qc.replace(/ /g, "").length < 2 || limit <= 0) return [];
    const best = new Map<number, number>();
    const add = (e: number, tier: number): void => {
      const p = best.get(e);
      if (p === undefined || tier > p) best.set(e, tier);
    };
    const countStrong = (): number => {
      let s = 0;
      for (const t of best.values()) if (t >= T_TOKENS) s++;
      return s;
    };

    // 1. whole-key exact / prefix, one binary-searched range scan.
    const [lo, hi] = prefixRange(qc);
    for (let k = lo; k < hi; k++) {
      const e = keyEntry[k] as number;
      if (keyLen(k) === qc.length) add(e, T_EXACT);
      else add(e, keyKind[k] === KIND_NAME ? T_PREFIX_NAME : T_PREFIX_ALT);
    }

    // 1b. word-start inside a multi-word key. A whole later word ("york" in "new york
    //     city") is strong; a partial one ("madurei…" in "sena madureira") ranks below a
    //     one-typo whole-name match.
    wordStarts(qc, (e, whole) => add(e, whole ? T_WORD : T_WORD_PREFIX));

    // 2. several words: the first must start a name word, the rest may start any word of
    //    the names, the admin1 or the country code ("Hyderabad Sindh", "Vaith Koil").
    const tokens = qc.split(" ");
    if (tokens.length > 1 && (tokens[0] as string).length >= 2) {
      const rest = tokens.slice(1).map((t) => ` ${t}`);
      const first = tokens[0] as string;
      const consider = (e: number): void => {
        if ((best.get(e) ?? 0) >= T_TOKENS) return;
        const w = words(e);
        if (rest.every((t) => w.includes(t))) add(e, T_TOKENS);
      };
      const [tlo, thi] = prefixRange(first);
      for (let k = tlo; k < thi; k++) consider(keyEntry[k] as number);
      wordStarts(first, (e) => consider(e));
    }

    const strong = countStrong(); // entries found at T_TOKENS or better
    // 3. substring inside a word ("eeswaran"), bounded.
    if (strong < limit && qc.length >= 3) {
      let pos = keyText.indexOf(qc);
      let hits = 0;
      while (pos >= 0 && hits < SUBSTRING_CAP) {
        add(keyEntry[keyAt(pos)] as number, T_SUBSTRING);
        hits++;
        pos = keyText.indexOf(qc, pos + 1);
      }
    }

    // 4. fuzzy: one typo for 4-6 letters, two for 7+, among keys sharing the first letter.
    const letters = qc.replace(/ /g, "").length;
    if (strong < limit && letters >= 4) {
      const maxD = letters <= 6 ? 1 : 2;
      const [flo, fhi] = prefixRange(qc.charAt(0));
      for (let k = flo; k < fhi; k++) {
        const len = keyLen(k);
        if (len < qc.length - maxD) continue;
        const { full, prefix } = fuzzy(k, qc, maxD);
        const e = keyEntry[k] as number;
        if (full <= maxD) add(e, T_FUZZY_FULL - 0.5 * (full - 1));
        else if (prefix <= 1 && qc.length >= 5) add(e, T_FUZZY_PREFIX); // typo while still typing
      }
    }

    const ranked = [...best.entries()];
    ranked.sort(
      (a, b) =>
        b[1] - a[1] ||
        (c.rank[b[0]] as number) - (c.rank[a[0]] as number) ||
        (c.nameOff[a[0] + 1] as number) - (c.nameOff[a[0]] as number) - ((c.nameOff[b[0] + 1] as number) - (c.nameOff[b[0]] as number)) ||
        (c.id[a[0]] as number) - (c.id[b[0]] as number),
    );
    const out: Place[] = [];
    for (const [e] of ranked) {
      out.push(toPlace(e));
      if (out.length >= limit) break;
    }
    return out;
  }

  return {
    size: c.n,
    search,
    get(geonameId: number): Place | undefined {
      let lo = 0;
      let hi = c.n - 1;
      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        const e = c.byId[mid] as number;
        const v = c.id[e] as number;
        if (v === geonameId) return toPlace(e);
        if (v < geonameId) lo = mid + 1;
        else hi = mid - 1;
      }
      return undefined;
    },
  };
}

export function entryToPlace(e: GazetteerEntry): Place {
  const place: Place = {
    name: e.name,
    country: e.country,
    lat: e.lat,
    lon: e.lon,
    geonameId: e.id,
    source: "bundle",
  };
  if (e.admin1) place.admin1 = e.admin1;
  if (e.tz) place.timezone = e.tz;
  return place;
}

/** Build an index from decoded entries (kept for callers/tests that hold objects). */
export async function buildGazetteer(entries: GazetteerEntry[]): Promise<Gazetteer> {
  const rows = entries.map((e) => [e.name, e.alt, e.admin1, e.country, e.lat, e.lon, e.tz, e.id, e.pop]);
  return makeGazetteer(buildCompact(rows, fieldIndex([...REQUIRED_FIELDS])));
}

/**
 * Decode the shipped file. Tolerates a server that already stripped the gzip layer
 * (Content-Encoding: gzip on a .gz asset) by sniffing the 1f 8b magic.
 */
async function decodeBytes(bytes: Uint8Array): Promise<unknown> {
  if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
    // Decompress, decode and parse in one streamed pass.
    const stream = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(new DecompressionStream("gzip"));
    return new Response(stream).json();
  }
  return JSON.parse(new TextDecoder().decode(bytes));
}

/** Decode the file into plain objects (diagnostics; the loader itself never builds these). */
export async function parseGazetteerBytes(bytes: Uint8Array): Promise<GazetteerEntry[]> {
  const { fields, rows } = checkDoc(await decodeBytes(bytes));
  const idx = fieldIndex(fields);
  const out: GazetteerEntry[] = [];
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    const id = Number(r[idx.id]);
    const lat = Number(r[idx.lat]);
    const lon = Number(r[idx.lon]);
    if (!Number.isFinite(id) || !Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    out.push({
      id,
      name: String(r[idx.name] ?? ""),
      alt: String(r[idx.alt] ?? ""),
      admin1: String(r[idx.admin1] ?? ""),
      country: String(r[idx.country] ?? ""),
      lat,
      lon,
      tz: String(r[idx.tz] ?? ""),
      pop: Number(r[idx.pop]) || 0,
    });
  }
  return out;
}

let loaded: Gazetteer | null = null;
let loading: Promise<Gazetteer> | null = null;
let generation = 0;

/** Install a gazetteer from the file's bytes (Node tests read the file directly). */
export async function loadGazetteerFromBytes(bytes: Uint8Array): Promise<Gazetteer> {
  const gen = generation;
  const { fields, rows } = checkDoc(await decodeBytes(bytes));
  const g = makeGazetteer(buildCompact(rows, fieldIndex(fields)));
  if (gen === generation) loaded = g; // an unload in the meantime wins
  return g;
}

/**
 * Fetch the bundled asset (same-origin, precached by the service worker, not a network
 * lookup in the privacy sense) and build the index once. Concurrent callers share one load.
 */
export function loadGazetteer(): Promise<Gazetteer> {
  if (loaded) return Promise.resolve(loaded);
  if (!loading) {
    loading = (async () => {
      // Named .bin, not .gz: Android packaging strips a .gz suffix (and inflates the file), which would
      // break the fetch inside the APK. decodeBytes sniffs the gzip magic either way.
      const url = new URL("./geonames-in.json.bin", import.meta.url);
      const res = await fetch(url, { credentials: "omit" });
      if (!res.ok) throw new Error(`gazetteer: HTTP ${res.status}`);
      return loadGazetteerFromBytes(new Uint8Array(await res.arrayBuffer()));
    })().catch((e: unknown) => {
      loading = null; // allow a retry
      throw e;
    });
  }
  return loading;
}

/** Release the index (tests, memory pressure); the next load rebuilds it. */
export function unloadGazetteer(): void {
  generation++;
  loaded = null;
  loading = null;
}

export function isGazetteerLoaded(): boolean {
  return loaded !== null;
}

/**
 * Search the bundled gazetteer. Synchronous and offline; returns [] until loadGazetteer()
 * has resolved. This is the ONLY function a keystroke may call.
 */
export function searchPlaces(q: string, limit = 8): Place[] {
  return loaded ? loaded.search(q, limit) : [];
}

// ─── online lookup (explicit submit only) ──────────────────────────────────────

export type NetErrorCode = "RATE_LIMIT" | "NETWORK" | "BAD_RESPONSE" | "NOT_ALLOWED" | `HTTP_${number}`;

/** "The wire is quiet, type the coordinates." */
export class NetError extends Error {
  readonly code: NetErrorCode;
  constructor(code: NetErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "NetError";
    this.code = code;
  }
}

export const OPEN_METEO_ORIGIN = "https://geocoding-api.open-meteo.com";
export const NOMINATIM_ORIGIN = "https://nominatim.openstreetmap.org";
/** OSM policy: ≤ 1 req/s. We keep a 1 100 ms minimum gap between request starts. */
export const NOMINATIM_GAP_MS = 1100;

export function openMeteoUrl(q: string): string {
  // Open-Meteo matches the place name only; "Madurai, Tamil Nadu" -> "Madurai".
  const name = q.split(",")[0]?.trim() ?? q.trim();
  const p = new URLSearchParams({ name, count: "5", language: "en", format: "json" });
  return `${OPEN_METEO_ORIGIN}/v1/search?${p.toString()}`;
}

export function nominatimUrl(q: string): string {
  const p = new URLSearchParams({
    q: q.trim(),
    format: "jsonv2",
    limit: "5",
    addressdetails: "1",
    "accept-language": "en",
  });
  return `${NOMINATIM_ORIGIN}/search?${p.toString()}`;
}

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null;
const str = (x: unknown): string | undefined => (typeof x === "string" && x.trim() ? x.trim() : undefined);
const num = (x: unknown): number | undefined => {
  const n = typeof x === "number" ? x : typeof x === "string" && x.trim() ? Number(x) : Number.NaN;
  return Number.isFinite(n) ? n : undefined;
};
const validLatLon = (lat: number, lon: number): boolean => Math.abs(lat) <= 90 && Math.abs(lon) <= 180;

function zoneFor(lat: number, lon: number): string | undefined {
  try {
    return tzLookup(lat, lon);
  } catch {
    return undefined;
  }
}

/** Open-Meteo `{ results: [...] }` → Place[]. Malformed items are skipped, never thrown. */
export function mapOpenMeteo(json: unknown): Place[] {
  if (!isRecord(json) || !Array.isArray(json.results)) return [];
  const out: Place[] = [];
  for (const r of json.results) {
    if (!isRecord(r)) continue;
    const name = str(r.name);
    const lat = num(r.latitude);
    const lon = num(r.longitude);
    const country = str(r.country_code)?.toUpperCase();
    if (!name || lat === undefined || lon === undefined || !country || !validLatLon(lat, lon)) continue;
    const place: Place = { name, country, lat, lon, source: "open-meteo" };
    const admin1 = str(r.admin1);
    if (admin1) place.admin1 = admin1;
    const elevation = num(r.elevation);
    if (elevation !== undefined) place.elevation = elevation;
    const id = num(r.id);
    if (id !== undefined && Number.isInteger(id)) place.geonameId = id;
    const tz = str(r.timezone) ?? zoneFor(lat, lon);
    if (tz) place.timezone = tz;
    out.push(place);
  }
  return out;
}

/** Nominatim jsonv2 array → Place[]. lat/lon arrive as strings; the zone comes from tz-lookup. */
export function mapNominatim(json: unknown): Place[] {
  if (!Array.isArray(json)) return [];
  const out: Place[] = [];
  for (const r of json) {
    if (!isRecord(r)) continue;
    const lat = num(r.lat);
    const lon = num(r.lon);
    if (lat === undefined || lon === undefined || !validLatLon(lat, lon)) continue;
    const address = isRecord(r.address) ? r.address : {};
    const name =
      str(r.name) ??
      str(address.city) ??
      str(address.town) ??
      str(address.village) ??
      str(address.hamlet) ??
      str(r.display_name)?.split(",")[0]?.trim();
    const country = str(address.country_code)?.toUpperCase();
    if (!name || !country) continue;
    const place: Place = { name, country, lat, lon, source: "nominatim" };
    const admin1 = str(address.state) ?? str(address.province) ?? str(address.region);
    if (admin1) place.admin1 = admin1;
    const tz = zoneFor(lat, lon);
    if (tz) place.timezone = tz;
    out.push(place);
  }
  return out;
}

export type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

export interface OnlineOptions {
  /** Injected for tests; defaults to globalThis.fetch. */
  fetch?: FetchLike;
  now?: () => number;
}

const REQUEST_INIT: RequestInit = {
  credentials: "omit",
  // Origin-only Referer: identifies the app to Nominatim without leaking the hash route.
  referrerPolicy: "strict-origin",
  headers: { Accept: "application/json" },
};

function sleep(ms: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) return reject(signal.reason);
    const t = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    const onAbort = (): void => {
      clearTimeout(t);
      reject(signal.reason);
    };
    signal.addEventListener("abort", onAbort, { once: true });
  });
}

async function getJson(f: FetchLike, url: string, signal: AbortSignal): Promise<unknown> {
  let res: Response;
  try {
    res = await f(url, { ...REQUEST_INIT, signal });
  } catch (e) {
    if (signal.aborted) throw e;
    throw new NetError("NETWORK", e instanceof Error ? e.message : String(e));
  }
  if (res.status === 429) throw new NetError("RATE_LIMIT");
  if (!res.ok) throw new NetError(`HTTP_${res.status}`);
  try {
    return await res.json();
  } catch {
    throw new NetError("BAD_RESPONSE");
  }
}

// Nominatim token bucket: one request in flight at a time, ≥ 1 100 ms between starts,
// and identical queries coalesced onto the same request (single-flight).
let nominatimQueue: Promise<unknown> = Promise.resolve();
let nominatimLastStart = Number.NEGATIVE_INFINITY;
const nominatimInflight = new Map<string, Promise<Place[]>>();

/** Test hook: forget the rate-limiter state. */
export function resetNominatimLimiter(): void {
  nominatimQueue = Promise.resolve();
  nominatimLastStart = Number.NEGATIVE_INFINITY;
  nominatimInflight.clear();
}

function nominatimSearch(q: string, signal: AbortSignal, f: FetchLike, now: () => number): Promise<Place[]> {
  const key = q.trim().toLowerCase();
  const existing = nominatimInflight.get(key);
  if (existing) return existing;
  const run = nominatimQueue.then(async () => {
    // A queued duplicate may find its answer already cached by the request ahead of it.
    const fresh = async (): Promise<Place[] | null> => {
      const hit = await getPlaceCache(q);
      return hit && now() - hit.fetchedAt < PLACE_CACHE_TTL ? hit.results : null;
    };
    const early = await fresh();
    if (early) return early;
    const wait = nominatimLastStart + NOMINATIM_GAP_MS - now();
    if (wait > 0) await sleep(wait, signal);
    if (signal.aborted) throw signal.reason;
    nominatimLastStart = now();
    const places = mapNominatim(await getJson(f, nominatimUrl(q), signal));
    // Written inside the queue slot so the next queued task sees it.
    if (places.length > 0) await putPlaceCache(q, places, now());
    return places;
  });
  nominatimQueue = run.catch(() => undefined);
  const tracked = run.finally(() => nominatimInflight.delete(key));
  nominatimInflight.set(key, tracked);
  return tracked;
}

/**
 * The online ladder, for an explicit "search online" submit only:
 * fresh cache → Open-Meteo → Nominatim (rate-limited) → stale cache → NetError.
 * Returns [] when aborted or when a service answered but found nothing.
 */
export async function searchOnline(q: string, signal: AbortSignal, opts: OnlineOptions = {}): Promise<Place[]> {
  const query = q.trim();
  if (!query) return [];
  const now = opts.now ?? Date.now;
  const cached = await getPlaceCache(query);
  if (cached && now() - cached.fetchedAt < PLACE_CACHE_TTL) return cached.results;

  const settings = await getSettings();
  if (!settings.onlineLookupAllowed) {
    if (cached) return cached.results;
    throw new NetError("NOT_ALLOWED");
  }
  const f: FetchLike = opts.fetch ?? ((input, init) => globalThis.fetch(input, init));

  let answered = false;
  let lastError: NetError | null = null;
  const attempt = async (run: () => Promise<Place[]>): Promise<Place[] | null> => {
    try {
      const places = await run();
      answered = true;
      return places;
    } catch (e) {
      if (signal.aborted) return null;
      lastError = e instanceof NetError ? e : new NetError("NETWORK", String(e));
      return null;
    }
  };

  const om = await attempt(async () => mapOpenMeteo(await getJson(f, openMeteoUrl(query), signal)));
  if (signal.aborted) return [];
  let places = om && om.length > 0 ? om : null;
  if (!places) {
    const nm = await attempt(() => nominatimSearch(query, signal, f, now));
    if (signal.aborted) return [];
    if (nm && nm.length > 0) places = nm;
  }
  if (places) {
    await putPlaceCache(query, places, now());
    return places;
  }
  if (cached) return cached.results; // stale beats nothing
  if (answered) return [];
  throw lastError ?? new NetError("NETWORK");
}
