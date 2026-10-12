import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/ayanamsa.json";
import {
  AYANAMSA_LABEL,
  ayanamsa,
  ayanamsaDeltaArcsec,
  ayanamsaRateDegPerDay,
  nutationLongitudeArcsec,
  precessionArcsec,
} from "./ayanamsa";
import { jdTtFromUtcMs } from "./time";
import type { AyanamsaPreset } from "./types";

const dmsToDeg = ([d, m, s]: number[]): number => (d ?? 0) + (m ?? 0) / 60 + (s ?? 0) / 3600;
const jdUtToMs = (jd: number): number => (jd - 2440587.5) * 86_400_000;
const PRESETS: AyanamsaPreset[] = ["se-true", "se-mean", "drik-mean"];

describe("§6.2 worked example (T = −0.05802654)", () => {
  const w = fixture.worked;
  const T = (w.jdTt - 2451545) / 36525;

  it("intermediate terms", () => {
    expect(T).toBeCloseTo(w.T, 8);
    expect(precessionArcsec(T)).toBeCloseTo(w.pA, 2);
    expect(Math.abs(nutationLongitudeArcsec(T) - w.dpsi)).toBeLessThan(0.01);
  });

  it.each(PRESETS)("%s to ±0.2″", (p) => {
    expect(ayanamsa(w.jdTt, p)).toBeCloseToArcsec(w[p], 0.2);
  });

  it("reference instant through astronomy-engine's ΔT gives the same numbers", () => {
    const jdTt = jdTtFromUtcMs(Date.UTC(1994, 2, 14, 1, 55));
    expect(ayanamsa(jdTt, "se-true")).toBeCloseToArcsec(23.780152, 0.2);
  });
});

describe("§6.2 reference table (0 h UT)", () => {
  for (const row of fixture.rows) {
    const jdTt = jdTtFromUtcMs(jdUtToMs(row.jdUt));
    it.each(PRESETS)(`${row.date} %s`, (p) => {
      expect(ayanamsa(jdTt, p)).toBeCloseToArcsec(dmsToDeg(row[p]), 0.2);
    });
    it(`${row.date} drik-mean matches Drik's published value to 0.5″`, () => {
      expect(ayanamsa(jdTt, "drik-mean")).toBeCloseToArcsec(row.drikPublished, 0.5);
    });
  }
});

describe("AY-1…AY-7", () => {
  it("AY-1: the J2000 mean base, and the time argument is honoured", () => {
    const atNoonTt = ayanamsa(2451545.0, "se-mean");
    const atMidnightUt = ayanamsa(jdTtFromUtcMs(jdUtToMs(2451544.5)), "se-mean");
    // The SE oracle reads 23.8570923° at JD 2451545.0 TT, +0.14″ from the documented constant;
    // the constant is kept (it is the §6.2 contract) and the tolerance is ±0.2″.
    expect(atNoonTt).toBeCloseToArcsec(23.857054, 0.2);
    expect(atNoonTt).toBeCloseToArcsec(23.8570923, 0.2);
    expect(atMidnightUt).toBeCloseToArcsec(23.857035, 0.1);
    expect(atNoonTt).not.toBe(atMidnightUt);
  });

  it("AY-2: se-mean rate 5028.80″ ± 0.5″ per century", () => {
    // Centred on J2000: a one-sided J2000 → J2000+1c difference also picks up the 1.105″·T² term
    // (5029.90″), so the rate is measured symmetrically, which isolates the 5028.796″ leading term.
    const rate = (ayanamsa(2451545.0 + 36525 / 2, "se-mean") - ayanamsa(2451545.0 - 36525 / 2, "se-mean")) * 3600;
    expect(Math.abs(rate - 5028.8)).toBeLessThan(0.5);
    expect(ayanamsaRateDegPerDay(2451545.0) * 36525 * 3600).toBeCloseTo(5028.796, 2);
  });

  // 200 dates, 1900–2030, evenly spaced (deterministic — no Math.random).
  const dates = Array.from({ length: 200 }, (_, i) => 2415020.5 + (i * (2462502.5 - 2415020.5)) / 199);

  it("AY-3: the nutation term is bounded and its sign flips (Δψ is not a constant)", () => {
    let flips = 0;
    let prev = 0;
    let maxAbs = 0;
    for (const jd of dates) {
      const d = (ayanamsa(jd, "se-true") - ayanamsa(jd, "se-mean")) * 3600;
      maxAbs = Math.max(maxAbs, Math.abs(d));
      if (prev !== 0 && Math.sign(d) !== Math.sign(prev)) flips++;
      prev = d;
    }
    // The Meeus short series peaks at 17.20 + 1.32 + 0.23 + 0.21 = 18.96″ when its terms align;
    // TESTING AY-3's 17.3″ is the 18.6-year term alone, so the asserted bound is the series' own.
    expect(maxAbs).toBeLessThanOrEqual(18.96);
    expect(maxAbs).toBeGreaterThan(15);
    expect(flips).toBeGreaterThanOrEqual(8);
  });

  it("AY-4: drik-mean − se-mean is a constant 24.3″ ± 0.05″", () => {
    for (const jd of dates) {
      expect(Math.abs(ayanamsaDeltaArcsec(jd, "drik-mean", "se-mean") - 24.3)).toBeLessThan(0.05);
    }
  });

  it("AY-5: the three presets never differ by more than 24.3″ + max|Δψ| (≤ 43.3″)", () => {
    let worst = 0;
    for (const jd of dates) {
      const v = PRESETS.map((p) => ayanamsa(jd, p));
      worst = Math.max(worst, (Math.max(...v) - Math.min(...v)) * 3600);
    }
    // §6.2 says 41″; with the series' own Δψ ceiling the honest bound is 24.29 + 18.96 = 43.3″.
    // The boundary module's cross-preset threshold (101″) covers either.
    expect(worst).toBeLessThanOrEqual(43.3);
    expect(worst).toBeGreaterThan(38);
  });

  it("AY-6: the preset label is part of the output", () => {
    expect(AYANAMSA_LABEL["drik-mean"]).toBe("Lahiri (Drik-compatible mean)");
  });

  it("AY-7: an unknown preset throws, never falls back", () => {
    expect(() => ayanamsa(2451545, "lahiri" as AyanamsaPreset)).toThrow(/unknown ayanamsa preset/);
  });

  it("ayanamsaDeltaArcsec is antisymmetric and matches the worked spread", () => {
    const jd = fixture.worked.jdTt;
    expect(ayanamsaDeltaArcsec(jd, "drik-mean", "se-true")).toBeCloseTo(9.3, 1);
    expect(ayanamsaDeltaArcsec(jd, "se-true", "drik-mean")).toBeCloseTo(-9.3, 1);
    expect(ayanamsaDeltaArcsec(jd, "se-true", "se-true")).toBe(0);
  });
});
