// The ONLY writer of the Dexie database (IMPLEMENTATION-PROMPT §5, §6.17).
// Components read with useLiveQuery; every mutation funnels through here so transactions,
// cache invalidation and Burn semantics live in one place.

import { computePatri } from "../engine/patri";
import {
  type AshtakootaSchool,
  DEFAULT_SETTINGS,
  type EnginePreset,
  type HandCapture,
  type MilanResult,
  type PalmReading,
  type Patri,
  type Place,
  PRESET_HASH,
  type Profile,
  type ProfileId,
  type Settings,
} from "../engine/types";
import { type BlobRow, db, type MetaKey, type PlaceCacheRow, type ReadingRow } from "./db";

// ─── errors ────────────────────────────────────────────────────────────────────

export type StorageErrorCode = "QUOTA" | "NOT_FOUND" | "INVALID";

/** Storage failures the UI can explain ("the drawer is full, burn a print or export"). */
export class StorageError extends Error {
  readonly code: StorageErrorCode;
  readonly detail: string;
  constructor(code: StorageErrorCode, detail: string) {
    super(`${code}: ${detail}`);
    this.name = "StorageError";
    this.code = code;
    this.detail = detail;
  }
}

function isQuotaError(e: unknown): boolean {
  if (typeof e !== "object" || e === null) return false;
  const name = (e as { name?: unknown }).name;
  const inner = (e as { inner?: unknown }).inner;
  return name === "QuotaExceededError" || (inner !== undefined && isQuotaError(inner));
}

async function guard<T>(what: string, op: () => Promise<T>): Promise<T> {
  try {
    return await op();
  } catch (e) {
    if (isQuotaError(e)) throw new StorageError("QUOTA", what);
    throw e;
  }
}

// ─── profiles ──────────────────────────────────────────────────────────────────

/**
 * Insert or update a profile. `createdAt` is preserved, `updatedAt` stamped. When the birth
 * data changed, every derived row for the profile (patris, milans, memo entries) is dropped
 * in the same transaction, a chart for the old birth time must never be served again.
 */
export async function upsertProfile(profile: Profile, now: number = Date.now()): Promise<Profile> {
  return guard("upsertProfile", () =>
    db.transaction("rw", [db.profiles, db.patris, db.milans], async () => {
      const prev = await db.profiles.get(profile.id);
      const next: Profile = {
        ...profile,
        createdAt: prev?.createdAt ?? profile.createdAt,
        updatedAt: Math.max(now, (prev?.updatedAt ?? 0) + 1),
      };
      await db.profiles.put(next);
      if (prev && JSON.stringify(prev.birth) !== JSON.stringify(next.birth)) {
        await db.patris.where("profileId").equals(profile.id).delete();
        await db.milans.filter((m) => m.a === profile.id || m.b === profile.id).delete();
        dropPatriCacheFor(profile.id);
      }
      return next;
    }),
  );
}

/**
 * Burn: delete a profile and everything derived from or attached to it, cached charts,
 * palm captures, their photos, readings and milans, in ONE transaction. No tombstones.
 * Clears `settings.activeProfileId` when it pointed at the burnt profile.
 */
export async function burnProfile(id: ProfileId): Promise<void> {
  await db.transaction("rw", [db.profiles, db.patris, db.palms, db.blobs, db.readings, db.milans, db.settings], async () => {
    const palms = await db.palms.where("profileId").equals(id).toArray();
    const blobKeys = palms.flatMap((p) => [p.originalBlobKey, p.rectifiedBlobKey]);
    await db.blobs.bulkDelete(blobKeys);
    // Sweep anything else filed under the profile's key prefix (orphans, future kinds).
    await db.blobs.where("key").startsWith(`${id}/`).delete();
    await db.readings.where("profileId").equals(id).delete();
    await db.readings.bulkDelete(palms.map((p) => p.id));
    await db.palms.where("profileId").equals(id).delete();
    await db.patris.where("profileId").equals(id).delete();
    await db.milans.filter((m) => m.a === id || m.b === id).delete();
    await db.profiles.delete(id);
    const s = await db.settings.get("app");
    if (s && s.value.activeProfileId === id) {
      await db.settings.put({ key: "app", value: { ...s.value, activeProfileId: null } });
    }
  });
  dropPatriCacheFor(id);
}

/** Alias kept for callers that think in CRUD terms; deleting a profile IS a Burn. */
export const deleteProfile = burnProfile;

// ─── settings + meta ───────────────────────────────────────────────────────────

/** Forward-compatible merge: unknown/missing keys fall back to DEFAULT_SETTINGS. */
export function mergeSettings(stored: Partial<Settings> | undefined): Settings {
  return {
    ...DEFAULT_SETTINGS,
    ...(stored ?? {}),
    preset: { ...DEFAULT_SETTINGS.preset, ...(stored?.preset ?? {}) },
  };
}

export async function getSettings(): Promise<Settings> {
  const row = await db.settings.get("app");
  return mergeSettings(row?.value);
}

/**
 * Patch settings. A preset change bumps `meta.presetRevision` in the same transaction;
 * cached patris are not migrated, rows with another presetHash are simply stale.
 */
export async function saveSettings(patch: Partial<Settings>): Promise<Settings> {
  return guard("saveSettings", () =>
    db.transaction("rw", [db.settings, db.meta], async () => {
      const prev = mergeSettings((await db.settings.get("app"))?.value);
      const next = mergeSettings({ ...prev, ...patch, preset: { ...prev.preset, ...(patch.preset ?? {}) } });
      await db.settings.put({ key: "app", value: next });
      if (PRESET_HASH(prev.preset) !== PRESET_HASH(next.preset)) {
        const rev = (await db.meta.get("presetRevision"))?.value ?? 0;
        await db.meta.put({ key: "presetRevision", value: rev + 1 });
      }
      return next;
    }),
  );
}

export async function getPresetRevision(): Promise<number> {
  return (await db.meta.get("presetRevision"))?.value ?? 0;
}

export async function setMeta(key: MetaKey, value: number): Promise<void> {
  await db.meta.put({ key, value });
}

// ─── patris (derived, memoised) ────────────────────────────────────────────────

const PATRI_CACHE_SIZE = 12;
/** LRU of the last 12 casts, keyed `profileId|presetHash`. Insertion order = recency. */
const patriCache = new Map<string, Patri>();

const cacheKey = (profileId: ProfileId, presetHash: string): string => `${profileId}\u0000${presetHash}`;

function cacheGet(key: string): Patri | undefined {
  const hit = patriCache.get(key);
  if (hit) {
    patriCache.delete(key);
    patriCache.set(key, hit);
  }
  return hit;
}

function cacheSet(key: string, value: Patri): void {
  patriCache.delete(key);
  patriCache.set(key, value);
  while (patriCache.size > PATRI_CACHE_SIZE) {
    const oldest = patriCache.keys().next().value;
    if (oldest === undefined) break;
    patriCache.delete(oldest);
  }
}

function dropPatriCacheFor(profileId: ProfileId): void {
  const prefix = `${profileId}\u0000`;
  for (const k of [...patriCache.keys()]) if (k.startsWith(prefix)) patriCache.delete(k);
}

export function clearPatriCache(): void {
  patriCache.clear();
}

/** Test/diagnostic view of the memo: keys in LRU order (oldest first). */
export function patriCacheKeys(): string[] {
  return [...patriCache.keys()];
}

/**
 * A stored chart is stale when it was cast under another preset (or engine epoch, both live
 * in the hash) or before the profile's last edit.
 */
export function isPatriStale(row: Patri, preset: EnginePreset, profile?: Profile): boolean {
  if (row.presetHash !== PRESET_HASH(preset)) return true;
  if (profile && (row.profileId !== profile.id || row.computedAt < profile.updatedAt)) return true;
  return false;
}

/**
 * The cast path: memo → db.patris → computePatri(). Pure engine work stays synchronous; the
 * only awaits are IndexedDB. `force` skips both caches (the "recompute" tab on the seal).
 */
export async function castPatri(profile: Profile, preset: EnginePreset, opts: { force?: boolean; now?: number } = {}): Promise<Patri> {
  const hash = PRESET_HASH(preset);
  const key = cacheKey(profile.id, hash);
  if (!opts.force) {
    const mem = cacheGet(key);
    if (mem && !isPatriStale(mem, preset, profile)) return mem;
    const row = await db.patris.get([profile.id, hash]);
    if (row && !isPatriStale(row, preset, profile)) {
      cacheSet(key, row);
      return row;
    }
  }
  const patri = computePatri(profile, preset, opts.now ?? Date.now());
  cacheSet(key, patri);
  await guard("castPatri", () => db.patris.put(patri));
  return patri;
}

// ─── palms, blobs, readings ────────────────────────────────────────────────────

export const blobKey = (profileId: ProfileId, captureId: string, kind: "original" | "rectified"): string =>
  `${profileId}/${captureId}/${kind}`;

/**
 * Store a capture and its two photos atomically. Blob keys are assigned here
 * (`profileId/captureId/kind`) so Burn can sweep by prefix; the stored capture is returned.
 */
export async function savePalmCapture(capture: HandCapture, originalBlob: Blob, rectifiedBlob: Blob): Promise<HandCapture> {
  const stored: HandCapture = {
    ...capture,
    originalBlobKey: blobKey(capture.profileId, capture.id, "original"),
    rectifiedBlobKey: blobKey(capture.profileId, capture.id, "rectified"),
  };
  const rows: BlobRow[] = [
    { key: stored.originalBlobKey, blob: originalBlob, type: originalBlob.type },
    { key: stored.rectifiedBlobKey, blob: rectifiedBlob, type: rectifiedBlob.type },
  ];
  return guard("savePalmCapture", () =>
    db.transaction("rw", [db.profiles, db.palms, db.blobs], async () => {
      if (!(await db.profiles.get(capture.profileId))) {
        throw new StorageError("NOT_FOUND", `profile ${capture.profileId}`);
      }
      const prev = await db.palms.get(capture.id);
      if (prev) await db.blobs.bulkDelete([prev.originalBlobKey, prev.rectifiedBlobKey]);
      await db.blobs.bulkPut(rows);
      await db.palms.put(stored);
      return stored;
    }),
  );
}

/** Store (or replace) the reading for a capture; the owner is looked up from the capture. */
export async function saveReading(reading: PalmReading): Promise<ReadingRow> {
  return guard("saveReading", () =>
    db.transaction("rw", [db.palms, db.readings], async () => {
      const palm = await db.palms.get(reading.captureId);
      if (!palm) throw new StorageError("NOT_FOUND", `capture ${reading.captureId}`);
      const row: ReadingRow = { ...reading, profileId: palm.profileId };
      await db.readings.put(row);
      return row;
    }),
  );
}

/** Burn one print: the capture, both photos and its reading, in one transaction. */
export async function deletePalmCapture(captureId: string): Promise<void> {
  await db.transaction("rw", [db.palms, db.blobs, db.readings], async () => {
    const palm = await db.palms.get(captureId);
    if (palm) {
      await db.blobs.bulkDelete([palm.originalBlobKey, palm.rectifiedBlobKey]);
      await db.blobs.where("key").startsWith(`${palm.profileId}/${captureId}/`).delete();
    }
    await db.readings.delete(captureId);
    await db.palms.delete(captureId);
  });
}

export async function getBlob(key: string): Promise<Blob | null> {
  const row = await db.blobs.get(key);
  if (!row) return null;
  return row.blob.type || !row.type ? row.blob : new Blob([row.blob], { type: row.type });
}

/** An object URL for a stored photo. The CALLER must URL.revokeObjectURL() it. */
export async function getBlobUrl(key: string): Promise<string | null> {
  const blob = await getBlob(key);
  return blob ? URL.createObjectURL(blob) : null;
}

// ─── milans ────────────────────────────────────────────────────────────────────

export async function saveMilan(milan: MilanResult): Promise<MilanResult> {
  await guard("saveMilan", () => db.milans.put(milan));
  return milan;
}

/**
 * A saved Milan for the ordered pair under a preset. The row key stays [a+b+presetHash] (changing a
 * Dexie primary key needs a schema bump); the Aṣṭakūṭa school is checked on read instead, so a row
 * scored under another school is a miss. Rows saved before the setting existed count as "pyjhora".
 * Omit `school` to read the row whatever its school.
 */
export async function getMilan(
  a: ProfileId,
  b: ProfileId,
  presetHash: string,
  school?: AshtakootaSchool,
): Promise<MilanResult | undefined> {
  const row = await db.milans.get([a, b, presetHash]);
  if (!row || school === undefined) return row;
  return (row.ashtakootaSchool ?? "pyjhora") === school ? row : undefined;
}

// ─── place cache ───────────────────────────────────────────────────────────────

export const PLACE_CACHE_TTL = 90 * 24 * 60 * 60 * 1000;

/** Cache key for a query: lower-cased, trimmed, inner whitespace collapsed. */
export const placeCacheKey = (q: string): string => q.normalize("NFC").trim().replace(/\s+/g, " ").toLowerCase();

export async function getPlaceCache(q: string): Promise<PlaceCacheRow | undefined> {
  return db.places.get(placeCacheKey(q));
}

export async function putPlaceCache(q: string, results: Place[], now: number = Date.now()): Promise<void> {
  const name = placeCacheKey(q);
  if (!name) return;
  await guard("putPlaceCache", () => db.places.put({ name, results, fetchedAt: now }));
}

/** Drop cache rows older than the TTL (housekeeping; never called on a hot path). */
export async function prunePlaceCache(now: number = Date.now()): Promise<number> {
  return db.places
    .where("fetchedAt")
    .below(now - PLACE_CACHE_TTL)
    .delete();
}

// ─── storage ───────────────────────────────────────────────────────────────────

export interface StorageEstimateInfo {
  usage: number;
  quota: number;
  persisted: boolean;
}

/** `navigator.storage.estimate()` for the Drawer; null where the API is absent. */
export async function storageEstimate(): Promise<StorageEstimateInfo | null> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage || typeof storage.estimate !== "function") return null;
  try {
    const e = await storage.estimate();
    const persisted = typeof storage.persisted === "function" ? await storage.persisted() : false;
    return { usage: e.usage ?? 0, quota: e.quota ?? 0, persisted };
  } catch {
    return null;
  }
}

/** Ask the browser not to evict the drawer under pressure. Resolves to the granted state. */
export async function requestPersistentStorage(): Promise<boolean> {
  const storage = typeof navigator !== "undefined" ? navigator.storage : undefined;
  if (!storage || typeof storage.persist !== "function") return false;
  try {
    return await storage.persist();
  } catch {
    return false;
  }
}

/** Erase everything Vyom keeps on this device: every table, the in-memory chart cache, and the few
 *  browser-storage flags (theme, intro seen). Nothing exists anywhere else to erase. */
export async function wipeEverything(): Promise<void> {
  await db.transaction("rw", db.tables, async () => {
    await Promise.all(db.tables.map((t) => t.clear()));
  });
  clearPatriCache();
  try {
    for (const k of Object.keys(localStorage)) if (/^(vyom|chowki)/.test(k)) localStorage.removeItem(k);
    sessionStorage.clear();
  } catch {
    // storage may be unavailable; the database is already empty
  }
}
