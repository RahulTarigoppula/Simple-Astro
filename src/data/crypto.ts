// The wax envelope — encrypted export / import (IMPLEMENTATION-PROMPT §5, §6.16).
//
//   <one line of JSON header>\n<AES-GCM-256 ciphertext>
//
// Key: PBKDF2-SHA256, 600 000 iterations, 16-byte random salt; 12-byte random IV.
// The exact header bytes are bound to the ciphertext as AES-GCM additional data, so a
// header edited to slip past the version checks fails authentication like a wrong key.
//
// Plaintext: a JSON document of every table, Blobs base64'd inline. Deviation from §5:
// dexie-export-import is not used — it reads Blobs with FileReader/FileReaderSync (absent in
// Node and in some worker contexts) and its typeson layer is opaque to tests. This codec is
// small, deterministic and restores every table byte-identically (see crypto.test.ts).

import { type TableName, SCHEMA_VERSION, TABLE_NAMES, db } from "./db";
import { clearPatriCache, getSettings, setMeta } from "./repo";

export const ENVELOPE_VERSION = 1;
export const ITERATIONS = 600_000;
const MIN_ITERATIONS = 100_000;
const MAX_ITERATIONS = 10_000_000;
const MAX_HEADER_BYTES = 4096;
const FAILURE_DELAY_MS = 2000;
const FAILURES_BEFORE_DELAY = 3;

export interface EnvelopeHeader {
  v: number;
  app: "chowki";
  version: string;
  schema: number;
  engine: string;
  preset: string;
  kdf: "PBKDF2-SHA256";
  iter: number;
  salt: string;
  iv: string;
  alg: "AES-GCM-256";
}

export type ImportErrorCode = "NOT_AN_ENVELOPE" | "NEWER_FORMAT" | "BAD_PASSPHRASE" | "CORRUPT" | "EMPTY_PASSPHRASE";

/** Shown as a lac note — never a stack trace. */
export class ImportError extends Error {
  readonly code: ImportErrorCode;
  constructor(code: ImportErrorCode, detail?: string) {
    super(detail ? `${code}: ${detail}` : code);
    this.name = "ImportError";
    this.code = code;
  }
}

// ─── base64 ────────────────────────────────────────────────────────────────────

export function b64encode(bytes: Uint8Array): string {
  let s = "";
  const CHUNK = 0x8000;
  for (let i = 0; i < bytes.length; i += CHUNK) {
    s += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

export function b64decode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

// ─── key derivation + seal / unseal ────────────────────────────────────────────

function normalisePassphrase(p: string): string {
  return p.normalize("NFC");
}

async function deriveKey(
  passphrase: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
  usage: KeyUsage,
): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(normalisePassphrase(passphrase)),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    [usage],
  );
}

export interface SealMeta {
  version: string;
  schema: number;
  engine: string;
  preset: string;
}

function defaultMeta(preset: string): SealMeta {
  return {
    version: typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev",
    schema: SCHEMA_VERSION,
    engine: `astronomy-engine@${typeof __ENGINE_BUILD__ === "string" ? __ENGINE_BUILD__ : "unknown"}`,
    preset,
  };
}

/** Encrypt `plain` into a wax envelope. */
export async function seal(plain: Blob, passphrase: string, meta: SealMeta = defaultMeta("se-true")): Promise<Blob> {
  if (!passphrase) throw new ImportError("EMPTY_PASSPHRASE");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt, ITERATIONS, "encrypt");
  const header: EnvelopeHeader = {
    v: ENVELOPE_VERSION,
    app: "chowki",
    version: meta.version,
    schema: meta.schema,
    engine: meta.engine,
    preset: meta.preset,
    kdf: "PBKDF2-SHA256",
    iter: ITERATIONS,
    salt: b64encode(salt),
    iv: b64encode(iv),
    alg: "AES-GCM-256",
  };
  const headerBytes = new TextEncoder().encode(JSON.stringify(header));
  const ct = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: headerBytes },
    key,
    await plain.arrayBuffer(),
  );
  return new Blob([headerBytes, "\n", new Uint8Array(ct)], { type: "application/octet-stream" });
}

/** Read and validate the header line without touching the key. */
export function readHeader(bytes: Uint8Array): { header: EnvelopeHeader; headerBytes: Uint8Array<ArrayBuffer>; body: Uint8Array<ArrayBuffer> } {
  const nl = bytes.subarray(0, MAX_HEADER_BYTES).indexOf(0x0a);
  if (nl <= 0) throw new ImportError("NOT_AN_ENVELOPE");
  const headerBytes = new Uint8Array(bytes.subarray(0, nl));
  let parsed: unknown;
  try {
    parsed = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(headerBytes));
  } catch {
    throw new ImportError("NOT_AN_ENVELOPE");
  }
  if (typeof parsed !== "object" || parsed === null) throw new ImportError("NOT_AN_ENVELOPE");
  const h = parsed as Partial<Record<keyof EnvelopeHeader, unknown>>;
  if (h.app !== "chowki" || typeof h.v !== "number") throw new ImportError("NOT_AN_ENVELOPE");
  if (h.v > ENVELOPE_VERSION) throw new ImportError("NEWER_FORMAT", `envelope v${h.v}`);
  if (typeof h.schema !== "number") throw new ImportError("CORRUPT", "schema");
  if (h.schema > SCHEMA_VERSION) throw new ImportError("NEWER_FORMAT", `schema ${h.schema}`);
  if (h.kdf !== "PBKDF2-SHA256" || h.alg !== "AES-GCM-256") throw new ImportError("NEWER_FORMAT", "cipher");
  if (typeof h.iter !== "number" || !Number.isInteger(h.iter) || h.iter < MIN_ITERATIONS || h.iter > MAX_ITERATIONS) {
    throw new ImportError("CORRUPT", "iterations");
  }
  if (typeof h.salt !== "string" || typeof h.iv !== "string") throw new ImportError("CORRUPT", "salt/iv");
  let salt: Uint8Array;
  let iv: Uint8Array;
  try {
    salt = b64decode(h.salt);
    iv = b64decode(h.iv);
  } catch {
    throw new ImportError("CORRUPT", "salt/iv");
  }
  if (salt.length !== 16 || iv.length !== 12) throw new ImportError("CORRUPT", "salt/iv length");
  return { header: parsed as EnvelopeHeader, headerBytes, body: new Uint8Array(bytes.subarray(nl + 1)) };
}

let consecutiveFailures = 0;

/** Test hook. */
export function resetUnsealThrottle(): void {
  consecutiveFailures = 0;
}

/** Decrypt a wax envelope. Wrong passphrase → ImportError('BAD_PASSPHRASE'). */
export async function unseal(file: Blob, passphrase: string): Promise<{ header: EnvelopeHeader; plain: Uint8Array }> {
  if (!passphrase) throw new ImportError("EMPTY_PASSPHRASE");
  const { header, headerBytes, body } = readHeader(new Uint8Array(await file.arrayBuffer()));
  if (consecutiveFailures >= FAILURES_BEFORE_DELAY) {
    await new Promise((r) => setTimeout(r, FAILURE_DELAY_MS));
  }
  const key = await deriveKey(passphrase, b64decode(header.salt), header.iter, "decrypt");
  try {
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: b64decode(header.iv), additionalData: headerBytes },
      key,
      body,
    );
    consecutiveFailures = 0;
    return { header, plain: new Uint8Array(plain) };
  } catch (e) {
    if (typeof e === "object" && e !== null && (e as { name?: unknown }).name === "OperationError") {
      consecutiveFailures++;
      throw new ImportError("BAD_PASSPHRASE");
    }
    throw new ImportError("CORRUPT", e instanceof Error ? e.message : String(e));
  }
}

// ─── plaintext codec: tables as JSON, Blobs inline ────────────────────────────

type Json = null | boolean | number | string | Json[] | { [k: string]: Json };
const TAG = "$chowki";

async function encodeValue(v: unknown): Promise<Json> {
  if (v === null) return null;
  if (v === undefined) return { [TAG]: "undef" };
  if (typeof v === "number") {
    if (Number.isFinite(v) && !Object.is(v, -0)) return v;
    return { [TAG]: "num", v: Object.is(v, -0) ? "-0" : String(v) }; // -0, NaN, ±Infinity
  }
  if (typeof v === "string" || typeof v === "boolean") return v;
  if (v instanceof Blob) {
    return { [TAG]: "blob", type: v.type, b64: b64encode(new Uint8Array(await v.arrayBuffer())) };
  }
  if (v instanceof ArrayBuffer) return { [TAG]: "ab", b64: b64encode(new Uint8Array(v)) };
  if (ArrayBuffer.isView(v)) {
    return { [TAG]: "u8", b64: b64encode(new Uint8Array(v.buffer, v.byteOffset, v.byteLength)) };
  }
  if (v instanceof Date) return { [TAG]: "date", v: v.getTime() };
  if (Array.isArray(v)) {
    const out: Json[] = [];
    for (const x of v) out.push(await encodeValue(x));
    return out;
  }
  if (typeof v === "object") {
    const out: { [k: string]: Json } = {};
    for (const [k, x] of Object.entries(v)) out[k] = await encodeValue(x);
    // An object that happens to carry our tag key is wrapped so it cannot be misread.
    return TAG in out ? { [TAG]: "obj", v: out } : out;
  }
  throw new Error(`export: cannot encode ${typeof v}`);
}

function decodeValue(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(decodeValue);
  if (typeof v !== "object" || v === null) return v;
  const o = v as Record<string, unknown>;
  const tag = o[TAG];
  if (typeof tag === "string") {
    switch (tag) {
      case "undef":
        return undefined;
      case "num":
        return Number(o.v);
      case "blob":
        return new Blob([b64decode(String(o.b64))], { type: String(o.type ?? "") });
      case "ab":
        return b64decode(String(o.b64)).buffer;
      case "u8":
        return b64decode(String(o.b64));
      case "date":
        return new Date(Number(o.v));
      case "obj": {
        const inner = o.v as Record<string, unknown>;
        const out: Record<string, unknown> = {};
        for (const [k, x] of Object.entries(inner)) out[k] = decodeValue(x);
        return out;
      }
      default:
        throw new ImportError("CORRUPT", `unknown tag ${tag}`);
    }
  }
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(o)) out[k] = decodeValue(x);
  return out;
}

export interface BackupDocument {
  format: "chowki-backup";
  schema: number;
  exportedAt: number;
  tables: Partial<Record<TableName, Json[]>>;
}

/** Snapshot every table inside one read transaction, then encode outside it. */
export async function exportPlaintext(now: number = Date.now()): Promise<string> {
  const snapshot = await db.transaction("r", TABLE_NAMES.map((t) => db.table(t)), async () => {
    const out: Partial<Record<TableName, unknown[]>> = {};
    for (const t of TABLE_NAMES) out[t] = await db.table(t).toArray();
    return out;
  });
  const tables: Partial<Record<TableName, Json[]>> = {};
  for (const t of TABLE_NAMES) {
    const rows: Json[] = [];
    for (const r of snapshot[t] ?? []) rows.push(await encodeValue(r));
    tables[t] = rows;
  }
  const doc: BackupDocument = { format: "chowki-backup", schema: SCHEMA_VERSION, exportedAt: now, tables };
  return JSON.stringify(doc);
}

/** Export the whole drawer as an encrypted wax envelope. */
export async function exportEnvelope(passphrase: string): Promise<Blob> {
  if (!passphrase) throw new ImportError("EMPTY_PASSPHRASE");
  const settings = await getSettings();
  const plain = new Blob([await exportPlaintext()], { type: "application/json" });
  const env = await seal(plain, passphrase, defaultMeta(settings.preset.ayanamsa));
  await setMeta("lastExportAt", Date.now());
  return env;
}

/** `chowki-2026-10-06.chowki` */
export function envelopeFileName(now: number = Date.now()): string {
  return `chowki-${new Date(now).toISOString().slice(0, 10)}.chowki`;
}

export interface ImportSummary {
  header: EnvelopeHeader;
  counts: Record<TableName, number>;
}

/** Restore every table from decrypted plaintext: clear, then add — one rw transaction. */
export async function importPlaintext(text: string): Promise<Record<TableName, number>> {
  let doc: unknown;
  try {
    doc = JSON.parse(text);
  } catch {
    throw new ImportError("CORRUPT", "plaintext is not JSON");
  }
  if (typeof doc !== "object" || doc === null || (doc as { format?: unknown }).format !== "chowki-backup") {
    throw new ImportError("CORRUPT", "not a chowki backup");
  }
  const d = doc as { schema?: unknown; tables?: unknown };
  if (typeof d.schema !== "number") throw new ImportError("CORRUPT", "schema");
  if (d.schema > SCHEMA_VERSION) throw new ImportError("NEWER_FORMAT", `schema ${d.schema}`);
  if (typeof d.tables !== "object" || d.tables === null) throw new ImportError("CORRUPT", "tables");
  const src = d.tables as Record<string, unknown>;

  const decoded = {} as Record<TableName, unknown[]>;
  for (const t of TABLE_NAMES) {
    const rows = src[t] ?? [];
    if (!Array.isArray(rows)) throw new ImportError("CORRUPT", `table ${t}`);
    decoded[t] = rows.map(decodeValue);
  }

  const counts = {} as Record<TableName, number>;
  await db.transaction("rw", TABLE_NAMES.map((t) => db.table(t)), async () => {
    for (const t of TABLE_NAMES) await db.table(t).clear();
    for (const t of TABLE_NAMES) {
      await db.table(t).bulkAdd(decoded[t]);
      counts[t] = decoded[t].length;
    }
  });
  clearPatriCache();
  return counts;
}

/** Decrypt and restore a wax envelope, replacing everything in the drawer. */
export async function importEnvelope(file: Blob, passphrase: string): Promise<ImportSummary> {
  const { header, plain } = await unseal(file, passphrase);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch {
    throw new ImportError("CORRUPT", "plaintext is not UTF-8");
  }
  const counts = await importPlaintext(text);
  return { header, counts };
}
