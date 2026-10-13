import { describe, expect, it } from "vitest";
import { ayanamsa } from "./ayanamsa";
import { astronomyEngineEphemeris, astroTime } from "./ephemeris";
import { ascMcFromRamc, bhavaChalit, bhavaOf, lagna, wholeSignHouse } from "./lagna";
import { atan2d, cosd, norm360, signedDelta, sind } from "./math";
import { signOf } from "./nakshatra";

const REF_MS = Date.UTC(1994, 2, 14, 1, 55);
const t = astroTime(REF_MS);
const ay = ayanamsa(t.tt + 2451545, "se-true");
const L = lagna(t, 12.9716, 77.5946, ay);

describe("reference chart (§6.5 golden values)", () => {
  it("RAMC, ε, ASC and MC within 5″ of §0.1a", () => {
    expect(L.ramc).toBeCloseToArcsec(277.8081, 5);
    expect(L.eps).toBeCloseToArcsec(23.438851, 5);
    expect(L.ascTrop).toBeCloseToArcsec(9.4371, 5);
    expect(L.ascSid).toBeCloseToArcsec(345.657, 5);
    expect(L.mcSid).toBeCloseToArcsec(253.3907, 5);
    expect(signOf(L.ascSid)).toBe(11); // Mīna
    expect(signOf(L.mcSid)).toBe(8); // Dhanu
  });

  it("sanity: a 56-minute-old day puts the Lagna ~16° ahead of the Sun", () => {
    const sunSid = norm360(astronomyEngineEphemeris.tropicalLongitude("SU", t) - ay);
    const ahead = signedDelta(sunSid, L.ascSid);
    expect(ahead).toBeGreaterThan(14);
    expect(ahead).toBeLessThan(18);
  });
});

describe("geometry", () => {
  it("L-2: the ASC is finite and east of the MC for a latitude × RAMC sweep", () => {
    for (const lat of [-45, -23.5, 0, 12.97, 23.5, 45, 60, 64.1466]) {
      for (const ramc of [0, 45, 90, 135, 180, 225, 270, 315]) {
        const { asc, mc } = ascMcFromRamc(ramc, 23.44, lat);
        expect(Number.isFinite(asc) && asc >= 0 && asc < 360).toBe(true);
        const east = signedDelta(mc, asc);
        expect(east).toBeGreaterThan(0);
        expect(east).toBeLessThan(180);
        if (Math.abs(lat) <= 45) {
          expect(east).toBeGreaterThan(55);
          expect(east).toBeLessThan(125);
        }
      }
    }
  });

  it("high latitudes (Oslo 59.91°N, Reykjavík 64.15°N) and the pole never give NaN/Infinity", () => {
    for (const [lat, lon] of [
      [59.9139, 10.7522],
      [64.1466, -21.9426],
      [90, 0],
      [-90, 0],
    ] as const) {
      for (let h = 0; h < 24; h++) {
        const r = lagna(astroTime(Date.UTC(2018, 11, 21, h)), lat, lon, 24.1);
        for (const v of [r.ascTrop, r.mcTrop, r.ascSid, r.mcSid, r.ramc, r.eps]) expect(Number.isFinite(v)).toBe(true);
      }
    }
  });

  it("L-3: at φ = 0 the ASC reduces to atan2(cos RAMC, −sin RAMC cos ε)", () => {
    for (const ramc of [10, 100, 200, 300]) {
      const { asc } = ascMcFromRamc(ramc, 23.44, 0);
      expect(asc).toBeCloseToArcsec(norm360(atan2d(cosd(ramc), -sind(ramc) * cosd(23.44))), 1e-6);
    }
    expect(ascMcFromRamc(0, 23.44, 0).asc).toBeCloseToArcsec(90, 1e-6);
  });

  it("L-4: whole-sign houses (Lagna in Vṛścika → Kanyā is the 11th)", () => {
    expect(wholeSignHouse(5, 7)).toBe(11);
    expect(wholeSignHouse(7, 7)).toBe(1);
    expect(wholeSignHouse(10, 11)).toBe(12);
    expect(new Set(Array.from({ length: 12 }, (_, s) => wholeSignHouse(s, 3))).size).toBe(12);
  });

  it("L-5: Bhāva Chalit (Śrīpati), monotonic madhyas, 1st = ASC, 7th = ASC + 180°, sandhis between", () => {
    const rows = bhavaChalit(L.ascSid, L.mcSid);
    expect(rows).toHaveLength(12);
    expect(rows[0]?.madhyaSid).toBe(L.ascSid);
    expect(Math.abs(signedDelta(norm360(L.ascSid + 180), rows[6]?.madhyaSid ?? 0))).toBeLessThan(1e-9);
    expect(Math.abs(signedDelta(L.mcSid, rows[9]?.madhyaSid ?? 0))).toBeLessThan(1e-9);
    let total = 0;
    for (let i = 0; i < 12; i++) {
      const a = rows[i];
      const b = rows[(i + 1) % 12];
      if (!a || !b) throw new Error("missing row");
      total += norm360(b.madhyaSid - a.madhyaSid);
      expect(Math.abs(signedDelta(a.endSid, b.startSid))).toBeLessThan(1e-9);
      expect(bhavaOf(a.madhyaSid, rows)).toBe(a.house);
    }
    expect(total).toBeCloseTo(360, 9);
    // A graha's Chalit house can differ from its whole-sign house: Sun at 329.48° (whole-sign 12th)
    // sits before the 1st-house sandhi here.
    expect(bhavaOf(329.48, rows)).toBe(12);
    expect(bhavaOf(L.ascSid - 1, rows)).toBe(1);
  });

  it("L-6: ε near J2000 = 23.4392794° (IAU 2006) ± |Δε| ≤ 9.3″", () => {
    const eps = astronomyEngineEphemeris.trueObliquity(astroTime(Date.UTC(2000, 0, 1, 12)));
    expect(Math.abs(eps - 23.4392794) * 3600).toBeLessThan(9.8);
  });
});
