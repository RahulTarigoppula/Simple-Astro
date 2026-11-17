import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PRESET, DEFAULT_SETTINGS, type EnginePreset, PRESET_HASH, type Profile } from "../engine/types";
import { fakePatri, makeCapture, makeMilan, makeProfile, makeReading, photoBytes } from "../test/data-fixtures";

const computePatri = vi.hoisted(() => vi.fn());
vi.mock("../engine/patri", () => ({ computePatri }));

import Dexie from "dexie";
import { ChowkiDB, db, SCHEMA, SCHEMA_V1, SCHEMA_VERSION, TABLE_NAMES } from "./db";
import {
  burnProfile,
  castPatri,
  clearPatriCache,
  deleteJournalEntry,
  deletePalmCapture,
  deleteProfile,
  getBlob,
  getBlobUrl,
  getJournalEntry,
  getMilan,
  getPlaceCache,
  getPresetRevision,
  getSettings,
  isPatriStale,
  listJournal,
  mergeSettings,
  patriCacheKeys,
  putPlaceCache,
  saveJournalEntry,
  saveMilan,
  savePalmCapture,
  saveReading,
  saveSettings,
  storageEstimate,
  upsertProfile,
  wipeEverything,
} from "./repo";

beforeEach(async () => {
  await Promise.all(TABLE_NAMES.map((t) => db.table(t).clear()));
  clearPatriCache();
  computePatri.mockReset();
  computePatri.mockImplementation((p: Profile, preset: EnginePreset, now: number) => fakePatri(p, preset, now));
});

describe("db schema", () => {
  it("opens version 2 with the §5 tables plus journal (places keyed by query name)", async () => {
    await db.open();
    expect(db.verno).toBe(2);
    expect(SCHEMA_VERSION).toBe(2);
    expect(db.tables.map((t) => t.name).sort()).toEqual(Object.keys(SCHEMA).sort());
    expect(Object.keys(SCHEMA).sort()).toEqual([...Object.keys(SCHEMA_V1), "journal"].sort());
    expect(db.journal.schema.primKey.keyPath).toEqual(["profileId", "day"]);
    expect(db.patris.schema.primKey.keyPath).toEqual(["profileId", "presetHash"]);
    expect(db.milans.schema.primKey.keyPath).toEqual(["a", "b", "presetHash"]);
    expect(db.places.schema.primKey.keyPath).toBe("name");
  });
});

describe("migration 1 → 2", () => {
  it("a version-1 database with people in it opens under version 2 with nothing lost", async () => {
    const name = "chowki-migration-1-2";
    await Dexie.delete(name);
    // The database exactly as builds before 4.0 created it.
    const v1 = new Dexie(name);
    v1.version(1).stores(SCHEMA_V1);
    await v1.open();
    expect(v1.verno).toBe(1);
    expect(v1.tables.map((t) => t.name)).not.toContain("journal");
    const people = [makeProfile("p-1"), makeProfile("p-2", { name: "Second Leaf" })];
    const patri = fakePatri(people[0] as Profile);
    const capture = { ...makeCapture("p-1", "c-1"), originalBlobKey: "p-1/c-1/original", rectifiedBlobKey: "p-1/c-1/rectified" };
    await v1.table("profiles").bulkAdd(people);
    await v1.table("patris").add(patri);
    await v1.table("palms").add(capture);
    await v1.table("blobs").add({ key: "p-1/c-1/original", blob: new Blob([photoBytes(7)], { type: "image/jpeg" }), type: "image/jpeg" });
    await v1.table("readings").add({ ...makeReading("c-1"), profileId: "p-1" });
    await v1.table("milans").add(makeMilan("p-1", "p-2"));
    await v1.table("places").add({ name: "madurai", results: [], fetchedAt: 5 });
    await v1.table("settings").add({ key: "app", value: { ...DEFAULT_SETTINGS, activeProfileId: "p-2" } });
    await v1.table("meta").add({ key: "presetRevision", value: 3 });
    const before: Record<string, unknown[]> = {};
    for (const t of Object.keys(SCHEMA_V1)) before[t] = await v1.table(t).toArray();
    v1.close();

    const v2 = new ChowkiDB(name);
    await v2.open();
    try {
      expect(v2.verno).toBe(2);
      for (const t of Object.keys(SCHEMA_V1)) {
        const rows = await v2.table(t).toArray();
        if (t === "blobs") {
          expect(rows).toHaveLength(1);
          const row = rows[0] as { key: string; blob: Blob; type: string };
          expect(row.key).toBe("p-1/c-1/original");
          expect(row.type).toBe("image/jpeg");
        } else expect(rows, t).toEqual(before[t]);
      }
      expect((await v2.profiles.toArray()).map((p) => p.id).sort()).toEqual(["p-1", "p-2"]);
      expect((await v2.settings.get("app"))?.value.activeProfileId).toBe("p-2");
      // the new store is there, empty, and takes a row
      expect(await v2.journal.count()).toBe(0);
      await v2.journal.put({
        profileId: "p-1",
        day: "2026-11-17",
        mood: 3,
        predictedTone: "steady",
        predictedScore: 0.2,
        createdAt: 1,
        updatedAt: 1,
      });
      expect(await v2.journal.where("profileId").equals("p-1").count()).toBe(1);
    } finally {
      v2.close();
      await Dexie.delete(name);
    }
  });
});

describe("journal", () => {
  it("saves one entry per person per day, trims the note, and reads a range oldest first", async () => {
    await upsertProfile(makeProfile("p-1"));
    await upsertProfile(makeProfile("p-2"));
    const a = await saveJournalEntry(
      { profileId: "p-1", day: "2026-11-15", mood: 4, note: `  ${"x".repeat(400)}  `, predictedTone: "bright", predictedScore: 0.6 },
      100,
    );
    expect(a).toMatchObject({ profileId: "p-1", day: "2026-11-15", mood: 4, predictedTone: "bright", predictedScore: 0.6 });
    expect(a.note).toHaveLength(280);
    expect(a.createdAt).toBe(100);
    await saveJournalEntry({ profileId: "p-1", day: "2026-11-17", mood: 2, predictedTone: "mixed", predictedScore: -0.1 }, 101);
    await saveJournalEntry({ profileId: "p-1", day: "2026-10-31", mood: 1, predictedTone: null, predictedScore: null }, 102);
    await saveJournalEntry({ profileId: "p-2", day: "2026-11-16", mood: 3 }, 103);

    expect((await listJournal("p-1")).map((r) => r.day)).toEqual(["2026-10-31", "2026-11-15", "2026-11-17"]);
    expect((await listJournal("p-1", { from: "2026-11-01", to: "2026-11-15" })).map((r) => r.day)).toEqual(["2026-11-15"]);
    expect((await listJournal("p-1", { from: "2026-11-15" })).map((r) => r.day)).toEqual(["2026-11-15", "2026-11-17"]);
    expect((await listJournal("p-2")).map((r) => r.day)).toEqual(["2026-11-16"]);
    expect(await getJournalEntry("p-2", "2026-11-16")).toMatchObject({ mood: 3, predictedTone: null, predictedScore: null });
    expect((await getJournalEntry("p-2", "2026-11-16"))?.note).toBeUndefined();
    expect(await getJournalEntry("p-1", "2026-11-16")).toBeUndefined();
    expect(await db.journal.count()).toBe(4);
  });

  it("an edit changes the word and the note but never what the sky had said, nor createdAt", async () => {
    await upsertProfile(makeProfile("p-1"));
    const base = { profileId: "p-1", day: "2026-11-17" };
    await saveJournalEntry({ ...base, mood: 3, note: "long walk", predictedTone: "steady", predictedScore: 0.2 }, 100);
    // a later engine would say something else for that day: the stored prediction stands
    const b = await saveJournalEntry({ ...base, mood: 1, predictedTone: "testing", predictedScore: -0.8 }, 200);
    expect(b).toEqual({
      ...base,
      mood: 1,
      note: "long walk",
      predictedTone: "steady",
      predictedScore: 0.2,
      createdAt: 100,
      updatedAt: 200,
    });
    const c = await saveJournalEntry({ ...base, mood: 1, note: "" }, 300);
    expect("note" in c).toBe(false);
    expect(await db.journal.count()).toBe(1);
    // an entry made while the day could not be read takes a prediction once one is offered
    await saveJournalEntry({ profileId: "p-1", day: "2026-11-16", mood: 2 }, 1);
    const d = await saveJournalEntry({ profileId: "p-1", day: "2026-11-16", mood: 2, predictedTone: "mixed", predictedScore: -0.2 }, 2);
    expect(d).toMatchObject({ predictedTone: "mixed", predictedScore: -0.2 });

    await deleteJournalEntry("p-1", "2026-11-17");
    expect(await getJournalEntry("p-1", "2026-11-17")).toBeUndefined();
    expect(await db.journal.count()).toBe(1);
  });

  it("refuses a malformed day, a mood off the scale and an unknown person", async () => {
    await upsertProfile(makeProfile("p-1"));
    await expect(saveJournalEntry({ profileId: "p-1", day: "17/11/2026", mood: 3 })).rejects.toMatchObject({ code: "INVALID" });
    await expect(saveJournalEntry({ profileId: "p-1", day: "2026-11-17", mood: 5 as 4 })).rejects.toMatchObject({ code: "INVALID" });
    await expect(saveJournalEntry({ profileId: "nobody", day: "2026-11-17", mood: 3 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(await db.journal.count()).toBe(0);
  });

  it("burning a person removes their days and nobody else's; wiping removes all of them", async () => {
    await upsertProfile(makeProfile("p-1"));
    await upsertProfile(makeProfile("p-2"));
    await saveJournalEntry({ profileId: "p-1", day: "2026-11-16", mood: 3 });
    await saveJournalEntry({ profileId: "p-1", day: "2026-11-17", mood: 4 });
    await saveJournalEntry({ profileId: "p-2", day: "2026-11-17", mood: 2 });
    await deleteProfile("p-1");
    expect(await db.journal.where("profileId").equals("p-1").count()).toBe(0);
    expect((await listJournal("p-2")).map((r) => r.day)).toEqual(["2026-11-17"]);
    await wipeEverything();
    expect(await db.journal.count()).toBe(0);
    expect(await db.profiles.count()).toBe(0);
  });
});

describe("profiles", () => {
  it("upsert preserves createdAt and stamps updatedAt", async () => {
    const p = makeProfile();
    const a = await upsertProfile(p, 2_000_000_000_000);
    expect(a.createdAt).toBe(p.createdAt);
    expect(a.updatedAt).toBe(2_000_000_000_000);
    const b = await upsertProfile({ ...a, name: "Renamed", createdAt: 5 }, 2_000_000_000_000);
    expect(b.createdAt).toBe(p.createdAt);
    expect(b.updatedAt).toBeGreaterThan(a.updatedAt);
    expect((await db.profiles.get(p.id))?.name).toBe("Renamed");
  });

  it("editing the birth data drops that profile's cached charts and milans", async () => {
    const p = await upsertProfile(makeProfile("p-1"));
    const q = await upsertProfile(makeProfile("p-2"));
    await castPatri(p, DEFAULT_PRESET);
    await castPatri(q, DEFAULT_PRESET);
    await saveMilan(makeMilan("p-1", "p-2"));
    // a rename keeps derived data
    await upsertProfile({ ...p, name: "Other" });
    expect(await db.patris.count()).toBe(2);
    await upsertProfile({ ...p, birth: { ...p.birth, localH: 6 } });
    expect(await db.patris.where("profileId").equals("p-1").count()).toBe(0);
    expect(await db.patris.where("profileId").equals("p-2").count()).toBe(1);
    expect(await db.milans.count()).toBe(0);
    expect(patriCacheKeys().some((k) => k.startsWith("p-1"))).toBe(false);
  });

  it("burn deletes the profile and everything attached, in one transaction, leaving nothing", async () => {
    const p = await upsertProfile(makeProfile("p-1"));
    const q = await upsertProfile(makeProfile("p-2"));
    await saveSettings({ activeProfileId: "p-1" });
    await castPatri(p, DEFAULT_PRESET);
    await castPatri(p, { ...DEFAULT_PRESET, ayanamsa: "drik-mean" });
    await castPatri(q, DEFAULT_PRESET);
    const cap = await savePalmCapture(makeCapture("p-1", "c-1"), new Blob([photoBytes(1)]), new Blob([photoBytes(2)]));
    await saveReading(makeReading(cap.id));
    await savePalmCapture(makeCapture("p-2", "c-2"), new Blob([photoBytes(3)]), new Blob([photoBytes(4)]));
    await db.blobs.put({ key: "p-1/orphan/original", blob: new Blob(["x"]), type: "" }); // orphan under prefix
    await saveMilan(makeMilan("p-1", "p-2"));
    await saveMilan(makeMilan("p-2", "p-1"));

    await burnProfile("p-1");

    expect(await db.profiles.get("p-1")).toBeUndefined();
    expect(await db.patris.where("profileId").equals("p-1").count()).toBe(0);
    expect(await db.palms.where("profileId").equals("p-1").count()).toBe(0);
    expect(await db.readings.where("profileId").equals("p-1").count()).toBe(0);
    expect((await db.blobs.toCollection().primaryKeys()).filter((k) => k.startsWith("p-1/"))).toEqual([]);
    expect(await db.milans.count()).toBe(0);
    expect(patriCacheKeys().some((k) => k.startsWith("p-1"))).toBe(false);
    expect((await getSettings()).activeProfileId).toBeNull();
    // the other profile is untouched
    expect(await db.profiles.get("p-2")).toBeDefined();
    expect(await db.patris.where("profileId").equals("p-2").count()).toBe(1);
    expect(await db.blobs.count()).toBe(2);
    expect(deleteProfile).toBe(burnProfile);
  });

  it("burn is atomic: a failure inside rolls everything back", async () => {
    const p = await upsertProfile(makeProfile("p-1"));
    await castPatri(p, DEFAULT_PRESET);
    const spy = vi.spyOn(db.profiles, "delete").mockImplementationOnce(() => {
      throw new Error("boom");
    });
    await expect(burnProfile("p-1")).rejects.toThrow("boom");
    spy.mockRestore();
    expect(await db.profiles.get("p-1")).toBeDefined();
    expect(await db.patris.count()).toBe(1);
  });
});

describe("palm captures", () => {
  it("keeps one capture per hand: a retake replaces the earlier photo, print and reading", async () => {
    await upsertProfile(makeProfile("p-1"));
    const r1 = await savePalmCapture(makeCapture("p-1", "r-1"), new Blob([photoBytes(1)]), new Blob([photoBytes(2)]));
    await saveReading(makeReading(r1.id));
    await savePalmCapture({ ...makeCapture("p-1", "l-1"), hand: "left" }, new Blob([photoBytes(3)]), new Blob([photoBytes(4)]));
    await savePalmCapture(makeCapture("p-1", "r-2"), new Blob([photoBytes(5)]), new Blob([photoBytes(6)]));
    const palms = await db.palms.where("profileId").equals("p-1").toArray();
    expect(palms.map((p) => p.id).sort()).toEqual(["l-1", "r-2"]);
    expect(await db.blobs.count()).toBe(4);
    expect(await db.readings.get("r-1")).toBeUndefined();
  });
});

describe("settings", () => {
  it("returns DEFAULT_SETTINGS on an empty drawer and merges forward-compatibly", async () => {
    expect(await getSettings()).toEqual(DEFAULT_SETTINGS);
    // a row written by an older build lacks newer keys
    const old = { theme: "night" } as unknown as typeof DEFAULT_SETTINGS;
    await db.settings.put({ key: "app", value: old });
    const s = await getSettings();
    expect(s.theme).toBe("night");
    expect(s.bhakootCancellation).toBe(DEFAULT_SETTINGS.bhakootCancellation);
    expect(s.ashtakootaSchool).toBe("north-common");
    expect(s.preset).toEqual(DEFAULT_PRESET);
    expect(mergeSettings(undefined)).toEqual(DEFAULT_SETTINGS);
  });

  it("a preset change bumps meta.presetRevision; other changes do not", async () => {
    expect(await getPresetRevision()).toBe(0);
    await saveSettings({ sound: false });
    expect(await getPresetRevision()).toBe(0);
    const s = await saveSettings({ preset: { ...DEFAULT_PRESET, node: "mean" } });
    expect(s.preset.node).toBe("mean");
    expect(s.sound).toBe(false);
    expect(await getPresetRevision()).toBe(1);
    await saveSettings({ preset: { ...DEFAULT_PRESET, node: "mean" } });
    expect(await getPresetRevision()).toBe(1);
  });
});

describe("castPatri", () => {
  it("memo → db → compute, and writes the computed chart", async () => {
    const p = await upsertProfile(makeProfile());
    const a = await castPatri(p, DEFAULT_PRESET, { now: p.updatedAt + 10 });
    expect(computePatri).toHaveBeenCalledTimes(1);
    expect(computePatri).toHaveBeenCalledWith(p, DEFAULT_PRESET, p.updatedAt + 10);
    expect(await db.patris.get([p.id, PRESET_HASH(DEFAULT_PRESET)])).toEqual(a);

    expect(await castPatri(p, DEFAULT_PRESET)).toBe(a); // memo hit, same object
    expect(computePatri).toHaveBeenCalledTimes(1);

    clearPatriCache();
    expect(await castPatri(p, DEFAULT_PRESET)).toEqual(a); // db hit
    expect(computePatri).toHaveBeenCalledTimes(1);

    await castPatri(p, DEFAULT_PRESET, { force: true });
    expect(computePatri).toHaveBeenCalledTimes(2);
  });

  it("a different preset is a different chart; old rows are stale, not migrated", async () => {
    const p = await upsertProfile(makeProfile());
    const a = await castPatri(p, DEFAULT_PRESET);
    const mean: EnginePreset = { ...DEFAULT_PRESET, ayanamsa: "se-mean" };
    const b = await castPatri(p, mean);
    expect(b.presetHash).not.toBe(a.presetHash);
    expect(await db.patris.count()).toBe(2);
    expect(isPatriStale(a, mean)).toBe(true);
    expect(isPatriStale(a, DEFAULT_PRESET)).toBe(false);
    expect(isPatriStale(a, DEFAULT_PRESET, { ...p, updatedAt: a.computedAt + 1 })).toBe(true);
  });

  it("the memo is an LRU of 12", async () => {
    const presets: EnginePreset[] = [];
    for (const ayanamsa of ["se-true", "se-mean", "drik-mean"] as const)
      for (const node of ["true", "mean"] as const)
        for (const dashaYearDays of [365.25, 360] as const) presets.push({ ...DEFAULT_PRESET, ayanamsa, node, dashaYearDays });
    const p = await upsertProfile(makeProfile());
    for (const pr of presets) await castPatri(p, pr);
    expect(patriCacheKeys()).toHaveLength(12);
    await castPatri(p, presets[0] as EnginePreset); // touch → most recent
    await castPatri(p, { ...DEFAULT_PRESET, sunrise: "disc-centre" }); // 13th evicts the oldest untouched
    const keys = patriCacheKeys();
    expect(keys).toHaveLength(12);
    expect(keys.some((k) => k.endsWith(PRESET_HASH(presets[0] as EnginePreset)))).toBe(true);
    expect(keys.some((k) => k.endsWith(PRESET_HASH(presets[1] as EnginePreset)))).toBe(false);
  });
});

describe("palms and blobs", () => {
  it("saves a capture with repo-assigned blob keys, a reading, and burns one print", async () => {
    await upsertProfile(makeProfile("p-1"));
    const orig = new Blob([photoBytes(1)], { type: "image/jpeg" });
    const rect = new Blob([photoBytes(2, 512)], { type: "image/png" });
    const cap = await savePalmCapture(makeCapture("p-1", "c-1"), orig, rect);
    expect(cap.originalBlobKey).toBe("p-1/c-1/original");
    expect(cap.rectifiedBlobKey).toBe("p-1/c-1/rectified");
    const back = await getBlob(cap.originalBlobKey);
    expect(back?.type).toBe("image/jpeg");
    expect(new Uint8Array(await (back as Blob).arrayBuffer())).toEqual(photoBytes(1));

    const r = await saveReading(makeReading("c-1"));
    expect(r.profileId).toBe("p-1");

    await deletePalmCapture("c-1");
    expect(await db.palms.count()).toBe(0);
    expect(await db.blobs.count()).toBe(0);
    expect(await db.readings.count()).toBe(0);
  });

  it("refuses captures for unknown profiles and readings for unknown captures", async () => {
    await expect(savePalmCapture(makeCapture("nobody"), new Blob(["a"]), new Blob(["b"]))).rejects.toMatchObject({
      code: "NOT_FOUND",
    });
    await expect(saveReading(makeReading("nope"))).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("getBlobUrl returns an object URL (caller revokes) or null", async () => {
    await upsertProfile(makeProfile("p-1"));
    const cap = await savePalmCapture(makeCapture("p-1"), new Blob(["a"], { type: "image/jpeg" }), new Blob(["b"]));
    const url = await getBlobUrl(cap.originalBlobKey);
    expect(url).toMatch(/^blob:/);
    URL.revokeObjectURL(url as string);
    expect(await getBlobUrl("missing")).toBeNull();
  });
});

describe("milans + place cache + storage", () => {
  it("saves and reads milans by [a+b+presetHash]", async () => {
    const m = makeMilan("p-1", "p-2");
    await saveMilan(m);
    expect(await getMilan("p-1", "p-2", m.presetHash)).toEqual(m);
    expect(await getMilan("p-2", "p-1", m.presetHash)).toBeUndefined();
  });

  it("getMilan with a school misses a row scored under another school (legacy rows count as pyjhora)", async () => {
    const legacy = makeMilan("p-1", "p-2");
    await saveMilan(legacy);
    expect(await getMilan("p-1", "p-2", legacy.presetHash, "pyjhora")).toEqual(legacy);
    expect(await getMilan("p-1", "p-2", legacy.presetHash, "north-common")).toBeUndefined();
    const north = { ...legacy, ashtakootaSchool: "north-common" as const };
    await saveMilan(north);
    expect(await getMilan("p-1", "p-2", legacy.presetHash, "north-common")).toEqual(north);
    expect(await getMilan("p-1", "p-2", legacy.presetHash, "pyjhora")).toBeUndefined();
  });

  it("place cache rows are keyed by the normalised query", async () => {
    await putPlaceCache("  Madurai   TAMIL nadu ", [], 123);
    expect(await getPlaceCache("madurai tamil nadu")).toEqual({ name: "madurai tamil nadu", results: [], fetchedAt: 123 });
  });

  it("storageEstimate never throws", async () => {
    const e = await storageEstimate();
    expect(e === null || typeof e.usage === "number").toBe(true);
  });
});
