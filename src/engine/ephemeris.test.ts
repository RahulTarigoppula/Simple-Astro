import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/golden-charts.json";
import { astroTime, astronomyEngineEphemeris as eph, isCombust, PLANET_IDS } from "./ephemeris";
import { norm360 } from "./math";

// Oracle: Swiss Ephemeris 2.10.03 (Moshier), chart g01 = the reference chart (see oracle-notes.md).
const g01 = golden.charts[0] as (typeof golden.charts)[number];
const t = astroTime(g01.input.utcMs);

describe("astronomyEngineEphemeris vs Swiss Ephemeris at the reference instant", () => {
  it.each(PLANET_IDS)("%s tropical longitude within 5″, latitude within 30″, speed within 0.002°/d", (id) => {
    const e = g01.expected.grahas[id];
    const p = eph.position(id, t);
    expect(p.lon).toBeCloseToArcsec(e.lonTropical, 5);
    expect(eph.tropicalLongitude(id, t)).toBe(p.lon);
    expect(Math.abs(p.lat - e.latEcliptic) * 3600).toBeLessThan(30);
    expect(Math.abs(eph.speed(id, t) - e.speedTropical)).toBeLessThan(0.002);
  });

  it("GAST + longitude gives SE's ARMC to 1″; true obliquity to 0.5″", () => {
    const ramc = norm360(eph.greenwichApparentSiderealTime(t) + g01.input.lon);
    expect(ramc).toBeCloseToArcsec(g01.expected.houses.armc, 1);
    expect(eph.trueObliquity(t)).toBeCloseToArcsec(g01.expected.obliquityTrue, 0.5);
  });

  it("Jupiter is retrograde, the rest direct", () => {
    for (const id of PLANET_IDS) expect(eph.speed(id, t) < 0).toBe(id === "JU");
  });

  it("speed handles the 360 → 0 wrap (Moon crossing Meṣa 0°)", () => {
    // Find an instant with the Moon within 1° of 0° tropical and check the speed is ~13°/day, not −347.
    let ms = g01.input.utcMs;
    for (let i = 0; i < 40 && norm360(eph.tropicalLongitude("MO", astroTime(ms)) + 0.5) > 1; i++) ms += 0.05 * 86_400_000;
    const s = eph.speed("MO", astroTime(ms));
    expect(s).toBeGreaterThan(10);
    expect(s).toBeLessThan(16);
  });
});

describe("combustion (§6.3 orbs)", () => {
  it("orbs, retrograde tightening, and the never-combust bodies", () => {
    expect(isCombust("MA", 116.9, 100, false)).toBe(true);
    expect(isCombust("MA", 117.1, 100, false)).toBe(false);
    expect(isCombust("ME", 113, 100, false)).toBe(true);
    expect(isCombust("ME", 113, 100, true)).toBe(false); // 12° when retrograde
    expect(isCombust("VE", 9, 0, false)).toBe(true);
    expect(isCombust("VE", 9, 0, true)).toBe(false); // 8° when retrograde
    expect(isCombust("MO", 355, 5, false)).toBe(true); // across the wrap
    expect(isCombust("SU", 0, 0, false)).toBe(false);
    expect(isCombust("RA", 0, 0, true)).toBe(false);
    expect(isCombust("KE", 0, 0, true)).toBe(false);
    expect(isCombust("JU", 10.9, 0, false)).toBe(true);
    expect(isCombust("SA", 14.9, 0, false)).toBe(true);
  });
});
