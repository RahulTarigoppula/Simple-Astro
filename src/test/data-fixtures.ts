// Shared fixtures for the src/data tests (excluded from the app build via tsconfig.app.json).
import {
  DEFAULT_PRESET,
  type EnginePreset,
  type HandCapture,
  type MilanResult,
  type PalmReading,
  type Patri,
  PRESET_HASH,
  type Profile,
} from "../engine/types";

export const SECRET_NAME = "Meenakshi Sundaram Testcase";
export const SECRET_PLACE = "Vaithisvarankoil";

export function makeProfile(id = "p-1", over: Partial<Profile> = {}): Profile {
  return {
    id,
    name: SECRET_NAME,
    birth: {
      localY: 1987,
      localMo: 3,
      localD: 14,
      localH: 5,
      localMi: 42,
      place: {
        name: SECRET_PLACE,
        admin1: "Tamil Nadu",
        country: "IN",
        lat: 11.1958,
        lon: 79.7074,
        geonameId: 1253530,
        timezone: "Asia/Kolkata",
        source: "bundle",
      },
      zone: "Asia/Kolkata",
      utcMs: Date.UTC(1987, 2, 14, 0, 12),
      offsetMin: 330,
      jdUt: 2446868.508333,
      offsetSource: "tzdb",
    },
    handedness: "right",
    createdAt: 1_700_000_000_000,
    updatedAt: 1_700_000_000_000,
    ...over,
  };
}

/** A structurally minimal Patri — the data layer never looks inside it. */
export function fakePatri(profile: Profile, preset: EnginePreset = DEFAULT_PRESET, nowMs = Date.now()): Patri {
  const partial = {
    profileId: profile.id,
    preset,
    presetHash: PRESET_HASH(preset),
    engine: { name: "astronomy-engine", version: "2.1.19", ayanamsaArcsec: 85_000.25 },
    jdUt: profile.birth.jdUt,
    jdTt: profile.birth.jdUt + 0.00064,
    ayanamsa: 23.6511,
    moonrise: null,
    grahas: { SU: { lonSidereal: 330.1234567890123, speed: -0 } },
    vargas: { 1: { varga: 1 }, 9: { varga: 9 } },
    dasha: [{ lord: "SA", startMs: -1, endMs: 2, level: 1, children: [] }],
    yogas: [],
    computedAt: nowMs,
    computeMs: 12.5,
  };
  return partial as unknown as Patri;
}

export function makeCapture(profileId: string, id = "cap-1"): HandCapture {
  const lm = Array.from({ length: 21 }, (_, i) => ({ x: i / 21, y: 1 - i / 21, z: i * 0.001 }));
  return {
    id,
    profileId,
    hand: "right",
    originalBlobKey: "caller-supplied",
    rectifiedBlobKey: "caller-supplied",
    landmarks: lm,
    worldLandmarks: lm,
    handednessScore: 0.97,
    homography: [1, 0, 0, 0, 1, 0, 0, 0, 1],
    quality: { sharpness: 412.5, exposure: 0.81 },
    capturedAt: 1_700_000_100_000,
  };
}

export function makeReading(captureId: string): PalmReading {
  return {
    captureId,
    element: "water",
    ratios: { widthOverLength: 0.78, fingerOverPalm: 0.92, indexOverRing: 0.97, thumbAngleDeg: 41.2 },
    lines: [],
    hits: [],
    framing: "dominant",
    computedAt: 1_700_000_200_000,
  };
}

export function makeMilan(a: string, b: string, presetHash = PRESET_HASH(DEFAULT_PRESET)): MilanResult {
  const cite = { text: "Muhurta Chintamani", ref: "6.1" };
  const manglik = { present: false, from: [], cancellations: [], citation: cite };
  return { a, b, presetHash, kootas: [], total: 27.5, band: "very-good", manglik: { a: manglik, b: manglik } };
}

/** Bytes that look like a JPEG and include every byte value. */
export function photoBytes(seed = 7, size = 3000): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(size);
  out[0] = 0xff;
  out[1] = 0xd8;
  let x = seed;
  for (let i = 2; i < size; i++) {
    x = (x * 1103515245 + 12345) >>> 0;
    out[i] = i < 258 ? i - 2 : x & 0xff;
  }
  return out;
}
