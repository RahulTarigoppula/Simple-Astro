import * as A from "astronomy-engine";
import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/panchang-synthetic.json";
import { astroTime, astroTimeToMs } from "./ephemeris";
import { norm360 } from "./math";
import {
  angasAt,
  computePanchang,
  daySlot,
  karanaOf,
  localWeekday,
  masaIndexFromSunSign,
  rituOfMasa,
  solveCrossing,
  tithiOf,
  yogaOf,
} from "./panchang";
import { hinduDay, observerOf, sunEvent } from "./sunrise";
import { DEFAULT_PRESET, type EnginePreset } from "./types";

const BENGALURU = { lat: 12.9716, lon: 77.5946 };
const BIRTH = Date.UTC(1994, 2, 14, 1, 55);
const IST = 5.5 * 3_600_000;
const hhmm = (ms: number, offsetMs: number): string => new Date(ms + offsetMs).toISOString().slice(11, 16);

describe("pure-angle fixtures (§6.9)", () => {
  const p = fixture.pure;
  it("λmoon 200°, λsun 41.5°, ayanāṃśa 23.8°", () => {
    const elong = norm360(p.moonTrop - p.sunTrop);
    expect(elong).toBe(p.elongation);
    expect(tithiOf(elong)).toEqual(p.tithi);
    expect(karanaOf(elong)).toEqual(p.karana);
    const sunSid = p.sunTrop - p.ayanamsa;
    const moonSid = p.moonTrop - p.ayanamsa;
    expect(yogaOf(sunSid, moonSid)).toEqual(p.yoga);
    expect(Math.floor((moonSid * 27) / 360)).toBe(p.nakshatra.index);
  });

  it.each(fixture.seams.map((s) => [s.case, s] as const))("seam: %s", (_c, s) => {
    expect(tithiOf(s.elongation)).toMatchObject({ index: s.tithi, name: s.tithiName });
    expect(karanaOf(s.elongation)).toEqual({ index: s.karana, name: s.karanaName });
  });

  it("yoga seams: index 27 is Vaidhṛti, index 1 Viṣkambha", () => {
    for (const y of fixture.yogaSeams) expect(yogaOf(y.sunSid, y.moonSid)).toEqual({ index: y.index, name: y.name });
  });

  it("every tithi/karaṇa/yoga index is in range over a dense sweep", () => {
    for (let i = 0; i < 7200; i++) {
      const e = i / 20;
      const t = tithiOf(e);
      const k = karanaOf(e);
      expect(t.index >= 1 && t.index <= 30 && t.name.length > 0).toBe(true);
      expect(k.index >= 1 && k.index <= 60 && k.name.length > 0).toBe(true);
      expect(Math.ceil(k.index / 2)).toBe(t.index);
    }
  });

  it("māsa and ṛtu helpers: Sun in Mīna at the new moon → Caitra (Vasanta)", () => {
    expect(masaIndexFromSunSign(11)).toBe(0);
    expect(masaIndexFromSunSign(10)).toBe(11);
    expect(rituOfMasa(0)).toBe("Vasanta");
    expect(rituOfMasa(11)).toBe("Śiśira");
    expect(rituOfMasa(5)).toBe("Varṣā");
  });
});

describe("solveCrossing", () => {
  it("finds a linear crossing to the tolerance, across the 360 → 0 wrap", () => {
    // 13°/day starting at 355°; target 360 ≡ 0 is reached after 5/13 day.
    const f = (ms: number): number => norm360(355 + (13 * ms) / 86_400_000);
    const root = solveCrossing(f, 0, 0, 86_400_000);
    expect(Math.abs(root - (5 / 13) * 86_400_000)).toBeLessThan(250);
    const root2 = solveCrossing(f, 360, 0, 86_400_000);
    expect(Math.abs(root2 - root)).toBeLessThan(250);
  });

  it("extends a window that is too short", () => {
    const f = (ms: number): number => norm360((10 * ms) / 86_400_000);
    const root = solveCrossing(f, 12, 0, 3_600_000);
    expect(Math.abs(root - 1.2 * 86_400_000)).toBeLessThan(250);
  });
});

describe("the birth pañcāṅga of the reference chart", () => {
  const p = computePanchang(BIRTH, BENGALURU, DEFAULT_PRESET);

  it("names exact: Śukla Dvitīyā · Somavāra · Revatī 1 · Śukla · Kaulava", () => {
    expect(p.tithi).toMatchObject({ index: 2, name: "Śukla Dvitīyā", paksha: "shukla" });
    expect(p.vara).toEqual({ index: 1, name: "Somavāra" });
    expect(p.nakshatra).toMatchObject({ index: 26, name: "Revatī", pada: 1 });
    expect(p.yoga).toMatchObject({ index: 24, name: "Śukla" });
    expect(p.karana).toMatchObject({ index: 4, name: "Kaulava" });
    expect(p.elongation).toBeCloseTo(19.6877, 2);
    expect(p.moonIllumination).toBeGreaterThan(0.025);
    expect(p.moonIllumination).toBeLessThan(0.034);
  });

  it("sunrise ≈ 06:28–06:29 IST, Hindu day bounds, divisions", () => {
    expect(["06:28", "06:29"]).toContain(hhmm(p.sunriseMs, IST));
    expect(p.sunriseMs).toBeLessThan(BIRTH);
    expect(p.nextSunriseMs).toBeGreaterThan(BIRTH);
    expect((p.nextSunriseMs - p.sunriseMs) / 3_600_000).toBeCloseTo(24, 0);
    expect(p.sunsetMs).toBeGreaterThan(p.sunriseMs);
    expect(p.rahuKaal).toEqual(daySlot(2, p.sunriseMs, p.sunsetMs)); // Monday → 2nd eighth
    expect(p.yamaganda).toEqual(daySlot(4, p.sunriseMs, p.sunsetMs));
    expect(p.gulika).toEqual(daySlot(6, p.sunriseMs, p.sunsetMs));
    const noon = (p.sunriseMs + p.sunsetMs) / 2;
    const d = (p.sunsetMs - p.sunriseMs) / 30;
    expect(p.abhijit).toEqual([noon - d, noon + d]);
    expect(p.moonriseMs).not.toBeNull();
    expect(p.moonsetMs).not.toBeNull();
    expect(p.polar).toBeUndefined();
  });

  it("calendar: Phālguna (both conventions in Śukla pakṣa), Śiśira, Uttarāyaṇa", () => {
    expect(p.masaAmanta).toBe("Phālguna");
    expect(p.masaPurnimanta).toBe("Phālguna");
    expect(p.ritu).toBe("Śiśira");
    expect(p.ayana).toBe("uttarayana");
  });

  it("end instants: ordered after the instant and within a minute of SearchMoonPhase", () => {
    for (const e of [p.tithi.endMs, p.nakshatra.endMs, p.yoga.endMs, p.karana.endMs]) {
      expect(e).toBeGreaterThan(BIRTH);
      expect(e - BIRTH).toBeLessThan(30 * 3_600_000);
    }
    const nm = A.SearchMoonPhase(24, astroTime(BIRTH), 2);
    expect(nm).not.toBeNull();
    // SearchMoonPhase measures Moon − Sun with the Sun's geometric (non-aberrated) longitude, so it
    // runs ~20.5″ of elongation (≈ 40–50 s) away from the apparent elongation the tithi index uses.
    // The engine solves on the apparent elongation so the end instant and the index always agree.
    const dt = astroTimeToMs(nm as A.AstroTime) - p.tithi.endMs;
    expect(Math.abs(dt)).toBeLessThan(60_000);
    expect(Math.abs(dt)).toBeGreaterThan(20_000);
    // Dvitīyā ends with its second karaṇa.
    expect(Math.abs(p.karana.endMs - p.tithi.endMs)).toBeLessThan(500);
  });

  it("the Amānta month in Kṛṣṇa pakṣa runs one behind the Pūrṇimānta month", () => {
    const k = computePanchang(Date.UTC(1994, 2, 30, 6), BENGALURU, DEFAULT_PRESET); // after the 27 Mar full moon
    expect(k.tithi.paksha).toBe("krishna");
    expect(k.masaAmanta).toBe("Phālguna");
    expect(k.masaPurnimanta).toBe("Caitra");
  });
});

describe("PA-1: end instants are where the aṅga really changes", () => {
  // 24 instants spread over 2024, deterministic.
  const instants = Array.from({ length: 24 }, (_, i) => Date.UTC(2024, 0, 1) + i * 15.2 * 86_400_000 + i * 3_917_000);
  it.each(instants.map((ms) => [new Date(ms).toISOString(), ms] as const))("%s", (_iso, ms) => {
    const p = computePanchang(ms, BENGALURU, DEFAULT_PRESET);
    const ap = DEFAULT_PRESET.ayanamsa;
    const justBefore = (end: number) => angasAt(end - 1000, ap);
    const justAfter = (end: number) => angasAt(end + 1000, ap);
    expect(justBefore(p.tithi.endMs).tithi.index).toBe(p.tithi.index);
    expect(justAfter(p.tithi.endMs).tithi.index).toBe((p.tithi.index % 30) + 1);
    expect(justBefore(p.karana.endMs).karana.index).toBe(p.karana.index);
    expect(justAfter(p.karana.endMs).karana.index).toBe((p.karana.index % 60) + 1);
    expect(justBefore(p.nakshatra.endMs).nakshatra.index).toBe(p.nakshatra.index);
    expect(justAfter(p.nakshatra.endMs).nakshatra.index).toBe((p.nakshatra.index + 1) % 27);
    expect(justBefore(p.yoga.endMs).yoga.index).toBe(p.yoga.index);
    expect(justAfter(p.yoga.endMs).yoga.index).toBe((p.yoga.index % 27) + 1);
  });
});

describe("the Hindu day", () => {
  const obs = observerOf(BENGALURU);
  const rise = sunEvent(obs, 1, Date.UTC(1994, 2, 14, 0), 1, "upper-limb-refracted") as number;

  it("PA-2: 10 minutes before sunrise belongs to the previous vāra", () => {
    expect(computePanchang(rise - 600_000, BENGALURU, DEFAULT_PRESET).vara.index).toBe(0); // Sunday
    expect(computePanchang(rise + 600_000, BENGALURU, DEFAULT_PRESET).vara.index).toBe(1); // Monday
  });

  it("PA-3: the two sunrise conventions differ by a few minutes (disc centre later)", () => {
    const centre = sunEvent(obs, 1, Date.UTC(1994, 2, 14, 0), 1, "disc-centre") as number;
    const diffMin = (centre - rise) / 60_000;
    expect(diffMin).toBeGreaterThan(1);
    expect(diffMin).toBeLessThan(6);
    const preset: EnginePreset = { ...DEFAULT_PRESET, sunrise: "disc-centre" };
    expect(computePanchang(BIRTH, BENGALURU, preset).sunriseMs).toBeCloseTo(centre, -1);
  });

  it("vāra follows the local sunrise far east of Greenwich (Tokyo sunrise is the previous UTC date)", () => {
    const tokyo = { lat: 35.6762, lon: 139.6503 };
    // 2024-06-03 (Monday) 06:00 JST = 2024-06-02T21:00Z (a Sunday in UTC).
    const p = computePanchang(Date.UTC(2024, 5, 2, 21), tokyo, DEFAULT_PRESET);
    expect(p.vara.name).toBe("Somavāra");
    expect(localWeekday(Date.UTC(2024, 5, 2, 20, 30), 139.65)).toBe(1);
  });

  it("PA-6: Abhijit is absent on Wednesday", () => {
    const wed = computePanchang(Date.UTC(1994, 2, 16, 6), BENGALURU, DEFAULT_PRESET);
    expect(wed.vara.name).toBe("Budhavāra");
    expect(wed.abhijit).toBeNull();
  });

  it("PA-5: polar day and polar night degrade to noon ± 6 h, never NaN", () => {
    const tromso = { lat: 69.6492, lon: 18.9553 };
    const summer = computePanchang(Date.UTC(2026, 5, 21, 10), tromso, DEFAULT_PRESET);
    expect(summer.polar).toBe("midnight-sun");
    const winter = computePanchang(Date.UTC(2026, 11, 21, 10), tromso, DEFAULT_PRESET);
    expect(winter.polar).toBe("polar-night");
    for (const p of [summer, winter]) {
      for (const v of [p.sunriseMs, p.sunsetMs, p.nextSunriseMs, ...p.rahuKaal, p.tithi.endMs, p.moonIllumination]) {
        expect(Number.isFinite(v)).toBe(true);
      }
      expect(p.sunsetMs - p.sunriseMs).toBe(12 * 3_600_000);
      expect(p.sunriseMs).toBeLessThanOrEqual(Date.UTC(2026, p === summer ? 5 : 11, 21, 10));
    }
    const day = hinduDay(observerOf(tromso), Date.UTC(2026, 5, 21, 10), "upper-limb-refracted");
    expect(day.nextSunriseMs).toBeGreaterThan(Date.UTC(2026, 5, 21, 10));
  });

  it("high-latitude ordinary days work (Reykjavík, Oslo midwinter)", () => {
    for (const place of [
      { lat: 64.1466, lon: -21.9426 },
      { lat: 59.9139, lon: 10.7522 },
    ]) {
      const p = computePanchang(Date.UTC(2018, 11, 21, 13), place, DEFAULT_PRESET);
      expect(p.polar).toBeUndefined();
      expect(p.sunsetMs - p.sunriseMs).toBeGreaterThan(3 * 3_600_000);
      expect(p.sunsetMs - p.sunriseMs).toBeLessThan(7 * 3_600_000);
    }
  });

  it("is fast: a full pañcāṅga with end times in well under 20 ms (median of 10)", () => {
    const times: number[] = [];
    for (let i = 0; i < 10; i++) {
      const t0 = performance.now();
      computePanchang(BIRTH + i * 86_400_000, BENGALURU, DEFAULT_PRESET);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    expect(times[5]).toBeLessThan(20);
  });
});
