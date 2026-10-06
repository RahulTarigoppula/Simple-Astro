import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PRESET, type EnginePreset, type Profile } from "../engine/types";
import {
  SECRET_NAME,
  SECRET_PLACE,
  fakePatri,
  makeCapture,
  makeMilan,
  makeProfile,
  makeReading,
  photoBytes,
} from "../test/data-fixtures";

vi.mock("../engine/patri", () => ({
  computePatri: (p: Profile, preset: EnginePreset, now: number) => fakePatri(p, preset, now),
}));

import {
  ENVELOPE_VERSION,
  ITERATIONS,
  ImportError,
  b64decode,
  b64encode,
  exportEnvelope,
  exportPlaintext,
  importEnvelope,
  readHeader,
  resetUnsealThrottle,
  seal,
  unseal,
} from "./crypto";
import { SCHEMA_VERSION, TABLE_NAMES, db } from "./db";
import {
  castPatri,
  putPlaceCache,
  saveMilan,
  savePalmCapture,
  saveReading,
  saveSettings,
  upsertProfile,
} from "./repo";

const PASS = "haldi and lac, 1987";

async function wipe(): Promise<void> {
  await Promise.all(TABLE_NAMES.map((t) => db.table(t).clear()));
}

async function seedEverything(): Promise<void> {
  const p = await upsertProfile(makeProfile("p-1"));
  const q = await upsertProfile(makeProfile("p-2", { name: "Second Leaf", gender: "b" }));
  await saveSettings({ activeProfileId: "p-1", preset: { ...DEFAULT_PRESET, ayanamsa: "drik-mean" } });
  await castPatri(p, DEFAULT_PRESET);
  await castPatri(q, DEFAULT_PRESET);
  const cap = await savePalmCapture(
    makeCapture("p-1", "c-1"),
    new Blob([photoBytes(11, 40_000)], { type: "image/jpeg" }),
    new Blob([photoBytes(12, 9_000)], { type: "image/png" }),
  );
  await saveReading(makeReading(cap.id));
  await saveMilan(makeMilan("p-1", "p-2"));
  await putPlaceCache("Madurai", [{ name: "Madurai", country: "IN", lat: 9.9187, lon: 78.1198, source: "open-meteo" }], 99);
}

/** Every row of every table, with Blobs replaced by {type, bytes} so equality is byte-level. */
async function dumpAll(): Promise<Record<string, unknown[]>> {
  const out: Record<string, unknown[]> = {};
  for (const t of TABLE_NAMES) {
    const rows = await db.table(t).toArray();
    out[t] = await Promise.all(
      rows.map(async (r: Record<string, unknown>) => {
        const copy: Record<string, unknown> = { ...r };
        for (const [k, v] of Object.entries(copy)) {
          if (v instanceof Blob) copy[k] = { blobType: v.type, bytes: Array.from(new Uint8Array(await v.arrayBuffer())) };
        }
        return copy;
      }),
    );
  }
  return out;
}

beforeEach(async () => {
  await wipe();
  resetUnsealThrottle();
});

describe("base64", () => {
  it("round-trips every byte value", () => {
    const bytes = photoBytes(3, 70_000);
    expect(b64decode(b64encode(bytes))).toEqual(bytes);
    expect(b64encode(new Uint8Array([]))).toBe("");
  });
});

describe("seal / unseal", () => {
  it("writes a one-line JSON header with the §5 fields and decrypts back", async () => {
    const env = await seal(new Blob(["hello leaf"]), PASS);
    const { header, body } = readHeader(new Uint8Array(await env.arrayBuffer()));
    expect(header).toMatchObject({
      v: ENVELOPE_VERSION,
      app: "chowki",
      schema: SCHEMA_VERSION,
      kdf: "PBKDF2-SHA256",
      iter: ITERATIONS,
      alg: "AES-GCM-256",
    });
    expect(ITERATIONS).toBe(600_000);
    expect(b64decode(header.salt)).toHaveLength(16);
    expect(b64decode(header.iv)).toHaveLength(12);
    expect(body.length).toBe("hello leaf".length + 16); // GCM tag
    const { plain } = await unseal(env, PASS);
    expect(new TextDecoder().decode(plain)).toBe("hello leaf");
  });

  it("uses fresh salt and IV every time", async () => {
    const a = readHeader(new Uint8Array(await (await seal(new Blob(["x"]), PASS)).arrayBuffer())).header;
    const b = readHeader(new Uint8Array(await (await seal(new Blob(["x"]), PASS)).arrayBuffer())).header;
    expect(a.salt).not.toBe(b.salt);
    expect(a.iv).not.toBe(b.iv);
  });

  it("a wrong passphrase is BAD_PASSPHRASE, not a stack trace", async () => {
    const env = await seal(new Blob(["secret"]), PASS);
    await expect(unseal(env, "wrong")).rejects.toMatchObject({ name: "ImportError", code: "BAD_PASSPHRASE" });
  });

  it("an edited header fails authentication (bound as AES-GCM additional data)", async () => {
    const env = new Uint8Array(await (await seal(new Blob(["secret"]), PASS)).arrayBuffer());
    const text = new TextDecoder().decode(env.subarray(0, env.indexOf(0x0a)));
    const forged = new TextEncoder().encode(text.replace('"preset":"se-true"', '"preset":"se-mean"'));
    const tampered = new Blob([forged, env.subarray(env.indexOf(0x0a))]);
    await expect(unseal(tampered, PASS)).rejects.toMatchObject({ code: "BAD_PASSPHRASE" });
  });

  it("refuses newer formats and non-envelopes", async () => {
    const env = new Uint8Array(await (await seal(new Blob(["x"]), PASS)).arrayBuffer());
    const nl = env.indexOf(0x0a);
    const header = JSON.parse(new TextDecoder().decode(env.subarray(0, nl))) as Record<string, unknown>;
    const withHeader = (h: Record<string, unknown>) => new Blob([JSON.stringify(h), env.subarray(nl)]);
    await expect(unseal(withHeader({ ...header, v: 2 }), PASS)).rejects.toMatchObject({ code: "NEWER_FORMAT" });
    await expect(unseal(withHeader({ ...header, schema: SCHEMA_VERSION + 1 }), PASS)).rejects.toMatchObject({
      code: "NEWER_FORMAT",
    });
    await expect(unseal(withHeader({ ...header, iter: 1 }), PASS)).rejects.toMatchObject({ code: "CORRUPT" });
    await expect(unseal(new Blob(["just a text file\n"]), PASS)).rejects.toMatchObject({ code: "NOT_AN_ENVELOPE" });
    await expect(unseal(new Blob([new Uint8Array(100)]), PASS)).rejects.toBeInstanceOf(ImportError);
    await expect(seal(new Blob(["x"]), "")).rejects.toMatchObject({ code: "EMPTY_PASSPHRASE" });
  });

  it("adds a 2 s delay after three consecutive failures, and resets on success", async () => {
    const env = await seal(new Blob(["x"]), PASS);
    for (let i = 0; i < 3; i++) await expect(unseal(env, `bad-${i}`)).rejects.toMatchObject({ code: "BAD_PASSPHRASE" });
    const t0 = performance.now();
    await unseal(env, PASS);
    expect(performance.now() - t0).toBeGreaterThanOrEqual(1990);
    const t1 = performance.now();
    await expect(unseal(env, "bad-again")).rejects.toMatchObject({ code: "BAD_PASSPHRASE" });
    expect(performance.now() - t1).toBeLessThan(1990);
  });
});

describe("exportEnvelope / importEnvelope", () => {
  it("export → wipe → import restores every table byte-identically, including Blobs", async () => {
    await seedEverything();
    const before = await dumpAll();
    for (const t of TABLE_NAMES) if (t !== "meta") expect(before[t]?.length, t).toBeGreaterThan(0);

    const env = await exportEnvelope(PASS);
    const beforeWithMeta = await dumpAll(); // export stamps meta.lastExportAt
    await wipe();
    expect(await db.profiles.count()).toBe(0);

    const summary = await importEnvelope(env, PASS);
    expect(summary.header.preset).toBe("drik-mean");
    expect(summary.counts.blobs).toBe(2);
    const after = await dumpAll();
    // meta.lastExportAt is stamped after the snapshot, so it is the only expected difference
    expect({ ...after, meta: [] }).toEqual({ ...beforeWithMeta, meta: [] });
    expect({ ...after, meta: [] }).toEqual({ ...before, meta: [] });

    // structural details JSON would lose
    const patri = (await db.patris.toArray())[0] as unknown as { grahas: { SU: { speed: number } } };
    expect(Object.is(patri.grahas.SU.speed, -0)).toBe(true);
    const blob = (await db.blobs.get("p-1/c-1/original"))?.blob;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob?.type).toBe("image/jpeg");
  });

  it("import replaces (not merges) existing rows, in one transaction", async () => {
    await seedEverything();
    const env = await exportEnvelope(PASS);
    await upsertProfile(makeProfile("p-extra"));
    await importEnvelope(env, PASS);
    expect(await db.profiles.get("p-extra")).toBeUndefined();
    expect(await db.profiles.count()).toBe(2);
  });

  it("a wrong passphrase leaves the drawer untouched", async () => {
    await seedEverything();
    const env = await exportEnvelope(PASS);
    const before = await dumpAll();
    await expect(importEnvelope(env, "nope")).rejects.toMatchObject({ code: "BAD_PASSPHRASE" });
    expect(await dumpAll()).toEqual(before);
  });

  it("the envelope carries no name, place or image data in the clear", async () => {
    await seedEverything();
    const plain = await exportPlaintext();
    expect(plain).toContain(SECRET_NAME); // sanity: the secret IS in the plaintext…
    const env = await exportEnvelope(PASS);
    const bytes = new Uint8Array(await env.arrayBuffer());
    const latin1 = Array.from(bytes, (b) => String.fromCharCode(b)).join("");
    const utf8 = new TextDecoder().decode(bytes);
    for (const needle of [SECRET_NAME, SECRET_PLACE, "Second Leaf", "Madurai", "data:image", "Tamil Nadu", "p-1"]) {
      expect(latin1.includes(needle), needle).toBe(false); // …and not in the envelope
      expect(utf8.includes(needle), needle).toBe(false);
    }
    expect(plain).not.toContain("data:image");
  });
});
