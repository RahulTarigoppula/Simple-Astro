import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PRESET, DEFAULT_SETTINGS, type EnginePreset, PRESET_HASH, type Profile } from "../engine/types";
import { fakePatri, makeCapture, makeMilan, makeProfile, makeReading, photoBytes } from "../test/data-fixtures";

const computePatri = vi.hoisted(() => vi.fn());
vi.mock("../engine/patri", () => ({ computePatri }));

import { db, SCHEMA_V1, TABLE_NAMES } from "./db";
import {
  burnProfile,
  castPatri,
  clearPatriCache,
  deletePalmCapture,
  deleteProfile,
  getBlob,
  getBlobUrl,
  getMilan,
  getPlaceCache,
  getPresetRevision,
  getSettings,
  isPatriStale,
  mergeSettings,
  patriCacheKeys,
  putPlaceCache,
  saveMilan,
  savePalmCapture,
  saveReading,
  saveSettings,
  storageEstimate,
  upsertProfile,
} from "./repo";

beforeEach(async () => {
  await Promise.all(TABLE_NAMES.map((t) => db.table(t).clear()));
  clearPatriCache();
  computePatri.mockReset();
  computePatri.mockImplementation((p: Profile, preset: EnginePreset, now: number) => fakePatri(p, preset, now));
});

describe("db schema", () => {
  it("opens version 1 with exactly the §5 tables (places keyed by query name)", async () => {
    await db.open();
    expect(db.verno).toBe(1);
    expect(db.tables.map((t) => t.name).sort()).toEqual(Object.keys(SCHEMA_V1).sort());
    expect(db.patris.schema.primKey.keyPath).toEqual(["profileId", "presetHash"]);
    expect(db.milans.schema.primKey.keyPath).toEqual(["a", "b", "presetHash"]);
    expect(db.places.schema.primKey.keyPath).toBe("name");
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
