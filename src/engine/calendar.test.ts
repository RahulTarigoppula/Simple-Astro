import * as A from "astronomy-engine";
import { describe, expect, it } from "vitest";
import citations from "../data/citations.json";
import { monthCalendar, SANKRANTI_CITATION, sankrantisBetween, skippedTithis, TITHI_DAY_CITATION, tithiMarks } from "./calendar";
import { astroTime, astroTimeToMs } from "./ephemeris";
import { angasAt, computePanchang } from "./panchang";
import { DEFAULT_PRESET } from "./types";

const BLR = { lat: 12.9716, lon: 77.5946, elevation: 920, zone: "Asia/Kolkata" };
const IST = 5.5 * 3_600_000;
const istDate = (ms: number): number => new Date(ms + IST).getUTCDate();

describe("tithi bookkeeping", () => {
  it("finds a kṣaya tithi between two sunrises, and none when consecutive", () => {
    expect(skippedTithis(22, 24)).toEqual([23]);
    expect(skippedTithis(29, 2)).toEqual([30, 1]);
    expect(skippedTithis(7, 8)).toEqual([]);
    expect(skippedTithis(7, 7)).toEqual([]); // a vṛddhi tithi repeats
  });
  it("marks Ekādaśī, Pūrṇimā, Amāvasyā from the tithis a day holds", () => {
    expect(tithiMarks([11])).toEqual(["ekadashi"]);
    expect(tithiMarks([25, 26])).toEqual(["ekadashi"]);
    expect(tithiMarks([14, 15])).toEqual(["purnima"]);
    expect(tithiMarks([30])).toEqual(["amavasya"]);
    expect(tithiMarks([10, 12, 16, 29])).toEqual([]);
  });
});

describe("saṅkrānti", () => {
  it("the sidereal Sun enters Tulā on 17 October 2026 (IST) and the instant sits on 180°", () => {
    const s = sankrantisBetween(Date.UTC(2026, 9, 1), Date.UTC(2026, 10, 1), "se-true");
    expect(s).toHaveLength(1);
    expect(s[0]?.sign).toBe(6);
    const ms = s[0]?.ms ?? 0;
    expect(istDate(ms)).toBe(17);
    expect(angasAt(ms - 60_000, "se-true").sunSid).toBeLessThan(180);
    expect(angasAt(ms + 60_000, "se-true").sunSid).toBeGreaterThan(180);
  });
  it("finds none in a window that crosses no sign", () => {
    expect(sankrantisBetween(Date.UTC(2026, 9, 18), Date.UTC(2026, 9, 25), "se-true")).toEqual([]);
  });
  it("citations resolve", () => {
    const known = new Set(citations.entries.map((e) => `${e.text}|${e.ref}`));
    for (const c of [SANKRANTI_CITATION, TITHI_DAY_CITATION]) expect(known.has(`${c.text}|${c.ref}`)).toBe(true);
  });
});

describe("monthCalendar", () => {
  monthCalendar(2026, 9, BLR, DEFAULT_PRESET); // warm the ephemeris
  const t = performance.now();
  const oct = monthCalendar(2026, 10, BLR, DEFAULT_PRESET);
  const took = performance.now() - t;

  it("computes a month in under 150 ms", () => {
    expect(took).toBeLessThan(150);
  });

  it("lays out October 2026: 31 days, the 1st a Thursday", () => {
    expect(oct.days).toHaveLength(31);
    expect(oct.leadingBlanks).toBe(4);
    expect(oct.days[0]?.weekday).toBe(4);
    expect(oct.days[11]?.weekday).toBe(1);
  });

  it("each day's sunrise falls on that civil date in the place's zone, not the machine's", () => {
    for (const d of oct.days) {
      expect(istDate(d.sunriseMs)).toBe(d.day);
      expect(new Date(d.sunriseMs + IST).getUTCHours()).toBe(6);
    }
  });

  it("agrees with the day ledger at each sunrise", () => {
    for (const d of [oct.days[0], oct.days[16], oct.days[30]]) {
      if (!d) continue;
      const p = computePanchang(d.sunriseMs + 1000, BLR, DEFAULT_PRESET);
      expect(Math.abs(p.sunriseMs - d.sunriseMs)).toBeLessThan(1000);
      expect(p.tithi.index).toBe(d.tithi.index);
      expect(p.nakshatra.index).toBe(d.nakshatra);
    }
  });

  it("puts Amāvasyā and Pūrṇimā on the days of the new and full moon", () => {
    const nm = A.SearchMoonPhase(0, astroTime(Date.UTC(2026, 9, 1)), 30);
    const fm = A.SearchMoonPhase(180, astroTime(Date.UTC(2026, 9, 1)), 30);
    expect(nm).toBeTruthy();
    expect(fm).toBeTruthy();
    const amavasya = oct.days.filter((d) => d.marks.includes("amavasya")).map((d) => d.day);
    const purnima = oct.days.filter((d) => d.marks.includes("purnima")).map((d) => d.day);
    if (nm) expect(Math.abs((amavasya[0] ?? 0) - istDate(astroTimeToMs(nm)))).toBeLessThanOrEqual(1);
    if (fm) expect(Math.abs((purnima[0] ?? 0) - istDate(astroTimeToMs(fm)))).toBeLessThanOrEqual(1);
    expect(oct.days.filter((d) => d.marks.includes("ekadashi"))).toHaveLength(2);
    expect(oct.days[0]?.marks).toEqual([]);
  });

  it("marks the saṅkrānti on its civil date only", () => {
    const sk = oct.days.filter((d) => d.marks.includes("sankranti"));
    expect(sk.map((d) => d.day)).toEqual([17]);
    expect(sk[0]?.sankranti?.sign).toBe(6);
  });

  it("the Moon disc is dark at Amāvasyā and full at Pūrṇimā", () => {
    const a = oct.days.find((d) => d.marks.includes("amavasya"));
    const p = oct.days.find((d) => d.marks.includes("purnima"));
    expect(a?.moonK ?? 1).toBeLessThan(0.05);
    expect(p?.moonK ?? 0).toBeGreaterThan(0.95);
  });

  it("degrades to the polar day where the Sun does not rise", () => {
    const tromso = { lat: 69.65, lon: 18.96, zone: "Europe/Oslo" };
    const dec = monthCalendar(2026, 12, tromso, DEFAULT_PRESET);
    expect(dec.days).toHaveLength(31);
    expect(dec.days.some((d) => d.polar)).toBe(true);
    for (const d of dec.days) expect(Number.isFinite(d.sunriseMs)).toBe(true);
  });
});
