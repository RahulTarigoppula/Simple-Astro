// Persisted shapes and the Dexie schema (IMPLEMENTATION-PROMPT §5).
// Reads may happen anywhere (useLiveQuery); WRITES go only through ./repo.ts.

import Dexie, { type EntityTable, type Table } from "dexie";
import type { HandCapture, MilanResult, PalmReading, Patri, Place, Profile, ProfileId, Settings } from "../engine/types";

export const DB_NAME = "chowki";
/** Bumped together with a new `db.version(n)` block + upgrade function + migration test. */
export const SCHEMA_VERSION = 1;

/** Cached chart — disposable derived data, primary key [profileId+presetHash]. */
export type PatriRow = Patri;
/** A palm capture; photos live out of line in `blobs`. */
export type PalmRow = HandCapture;
/** A palm reading, denormalised with its owner so Burn can find it by index. */
export type ReadingRow = PalmReading & { profileId: ProfileId };
/** A Guna Milan result, primary key [a+b+presetHash]. */
export type MilanRow = MilanResult;

export interface BlobRow {
  /** `${profileId}/${captureId}/${kind}` — the prefix lets Burn sweep orphans by key range. */
  key: string;
  blob: Blob;
  /** MIME type, duplicated so the row survives a Blob that lost its type in transit. */
  type: string;
}

export interface PlaceCacheRow {
  /** The lower-cased, whitespace-collapsed query — the primary key. */
  name: string;
  results: Place[];
  fetchedAt: number;
}

export interface SettingsRow {
  key: "app";
  value: Settings;
}

export type MetaKey = "presetRevision" | "lastExportAt" | "lastImportAt";
export interface MetaRow {
  key: MetaKey;
  value: number;
}

/**
 * Version-1 stores. Deviation from §5: `places` is keyed by `name` (the normalised query)
 * because a cache row holds the *results of a query*, not one place — a `geonameId` key
 * cannot hold Nominatim results (no id) or several hits per query.
 */
export const SCHEMA_V1 = {
  profiles: "id, name, updatedAt",
  patris: "[profileId+presetHash], profileId, computedAt",
  palms: "id, profileId, hand, capturedAt",
  blobs: "key",
  readings: "captureId, profileId",
  milans: "[a+b+presetHash]",
  places: "name, fetchedAt",
  settings: "key",
  meta: "key",
} as const;

export type TableName = keyof typeof SCHEMA_V1;
export const TABLE_NAMES = Object.keys(SCHEMA_V1) as TableName[];

export class ChowkiDB extends Dexie {
  declare profiles: EntityTable<Profile, "id">;
  declare patris: Table<PatriRow, [ProfileId, string]>;
  declare palms: EntityTable<PalmRow, "id">;
  declare blobs: EntityTable<BlobRow, "key">;
  declare readings: EntityTable<ReadingRow, "captureId">;
  declare milans: Table<MilanRow, [ProfileId, ProfileId, string]>;
  declare places: EntityTable<PlaceCacheRow, "name">;
  declare settings: EntityTable<SettingsRow, "key">;
  declare meta: EntityTable<MetaRow, "key">;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
  }
}

export const db = new ChowkiDB();
