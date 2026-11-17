// Persisted shapes and the Dexie schema (IMPLEMENTATION-PROMPT §5).
// Reads may happen anywhere (useLiveQuery); WRITES go only through ./repo.ts.

import Dexie, { type EntityTable, type Table } from "dexie";
import type { HandCapture, MilanResult, PalmReading, Patri, Place, Profile, ProfileId, Settings } from "../engine/types";

export const DB_NAME = "chowki";
/** Bumped together with a new `db.version(n)` block + upgrade function + migration test. */
export const SCHEMA_VERSION = 2;

/** Cached chart, disposable derived data, primary key [profileId+presetHash]. */
export type PatriRow = Patri;
/** A palm capture; photos live out of line in `blobs`. */
export type PalmRow = HandCapture;
/** A palm reading, denormalised with its owner so Burn can find it by index. */
export type ReadingRow = PalmReading & { profileId: ProfileId };
/** A Guna Milan result, primary key [a+b+presetHash]. */
export type MilanRow = MilanResult;

export interface BlobRow {
  /** `${profileId}/${captureId}/${kind}`, the prefix lets Burn sweep orphans by key range. */
  key: string;
  blob: Blob;
  /** MIME type, duplicated so the row survives a Blob that lost its type in transit. */
  type: string;
}

export interface PlaceCacheRow {
  /** The lower-cased, whitespace-collapsed query, the primary key. */
  name: string;
  results: Place[];
  fetchedAt: number;
}

export interface SettingsRow {
  key: "app";
  value: Settings;
}

/** How a day really went, in the person's own word: 4 great, 3 good, 2 mixed, 1 hard. */
export type JournalMood = 1 | 2 | 3 | 4;
export type JournalTone = "bright" | "steady" | "mixed" | "testing";
export const JOURNAL_NOTE_MAX = 280;

/** One day of "Your days", primary key [profileId+day]. Never leaves the device except inside a backup. */
export interface JournalRow {
  profileId: ProfileId;
  /** The civil day in the reader's zone, "YYYY-MM-DD". */
  day: string;
  mood: JournalMood;
  /** A few words of their own, at most JOURNAL_NOTE_MAX characters. */
  note?: string;
  /** What the app said for that day when the entry was first made (null when it could not be read).
   *  Stored, never recomputed, so a later engine change cannot rewrite the comparison. */
  predictedTone: JournalTone | null;
  /** The day's score then, -1 … +1. */
  predictedScore: number | null;
  createdAt: number;
  updatedAt: number;
}

export type MetaKey = "presetRevision" | "lastExportAt" | "lastImportAt";
export interface MetaRow {
  key: MetaKey;
  value: number;
}

/**
 * Version-1 stores. Deviation from §5: `places` is keyed by `name` (the normalised query)
 * because a cache row holds the *results of a query*, not one place, a `geonameId` key
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

/** Version 2 (app 4.0) adds `journal`: purely additive, so it needs no upgrade function. */
export const SCHEMA_V2 = {
  ...SCHEMA_V1,
  journal: "[profileId+day], profileId, day",
} as const;

/** The stores of the current version. Backup, restore and wipe walk this list. */
export const SCHEMA = SCHEMA_V2;
export type TableName = keyof typeof SCHEMA;
export const TABLE_NAMES = Object.keys(SCHEMA) as TableName[];

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
  declare journal: Table<JournalRow, [ProfileId, string]>;

  constructor(name: string = DB_NAME) {
    super(name);
    this.version(1).stores(SCHEMA_V1);
    // Only the new store is declared; Dexie carries the version-1 stores and their rows over untouched.
    this.version(2).stores({ journal: SCHEMA_V2.journal });
  }
}

export const db = new ChowkiDB();
