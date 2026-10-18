import { describe, expect, it } from "vitest";
import { forecast, lineFor, periodBounds } from "./forecast";
import { computePatri, REFERENCE_PROFILE } from "./patri";
import { DEFAULT_PRESET } from "./types";

const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
const BLR = { lat: 12.9716, lon: 77.5946 };
const Z = "Asia/Kolkata";
const AT = Date.UTC(2026, 9, 13, 6); // Tue 13 Oct 2026, 11:30 IST
const ist = (ms: number) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 16);

describe("forecast periods", () => {
  it("cuts calendar periods in the person's zone", () => {
    expect(periodBounds("day", AT, Z).map(ist)).toEqual(["2026-10-13T00:00", "2026-10-14T00:00"]);
    expect(periodBounds("week", AT, Z).map(ist)).toEqual(["2026-10-12T00:00", "2026-10-19T00:00"]);
    expect(periodBounds("month", AT, Z).map(ist)).toEqual(["2026-10-01T00:00", "2026-11-01T00:00"]);
    expect(periodBounds("quarter", AT, Z).map(ist)).toEqual(["2026-10-01T00:00", "2027-01-01T00:00"]);
    expect(periodBounds("year", AT, Z).map(ist)).toEqual(["2026-01-01T00:00", "2027-01-01T00:00"]);
  });

  it("follows the classical favourable houses", () => {
    expect(lineFor("JU", 9).favourable).toBe(true);
    expect(lineFor("JU", 8).favourable).toBe(false);
    expect(lineFor("SA", 11).text).toMatch(/11th from your Moon supports gains/);
  });

  it("builds every period with steps, daśā spans and a tone", () => {
    const n = { day: 1, week: 7, month: 31, quarter: 3, year: 12 } as const;
    for (const p of ["day", "week", "month", "quarter", "year"] as const) {
      const f = forecast(patri, p, AT, Z, DEFAULT_PRESET, BLR);
      expect(f.steps.length, p).toBe(n[p]);
      expect(f.score).toBeGreaterThanOrEqual(-1);
      expect(f.score).toBeLessThanOrEqual(1);
      expect(f.headline.length).toBeGreaterThan(10);
      expect(f.dasha.some((d) => d.level === "MD")).toBe(true);
      expect(f.lines.length).toBeGreaterThan(2);
    }
  });

  it("knows the reference chart is in Sāḍe Sātī's peak in 2026 (Saturn over natal Mīna Moon)", () => {
    expect(patri.grahas.MO.sign).toBe(11);
    expect(forecast(patri, "year", AT, Z, DEFAULT_PRESET, BLR).sadeSati).toBe("peak");
  });
});

describe("period bounds across a clock change", () => {
  it("starts and ends at local midnight on both sides of daylight saving (New York, March 2026)", () => {
    const [s, e] = periodBounds("month", Date.UTC(2026, 2, 20, 12), "America/New_York");
    expect(s).toBe(Date.UTC(2026, 2, 1, 5)); // 00:00 EST = 05:00Z
    expect(e).toBe(Date.UTC(2026, 3, 1, 4)); // 00:00 EDT = 04:00Z
    const [ys, ye] = periodBounds("year", Date.UTC(2026, 6, 15, 12), "America/New_York");
    expect(ys).toBe(Date.UTC(2026, 0, 1, 5));
    expect(ye).toBe(Date.UTC(2027, 0, 1, 5));
  });
  it("walks the month in civil days, so the day that changes the clock is counted once", () => {
    const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
    const f = forecast(patri, "month", Date.UTC(2026, 2, 20, 12), "America/New_York", DEFAULT_PRESET, { lat: 40.7, lon: -74 });
    expect(f.steps).toHaveLength(31);
    expect(f.steps[8]?.ms).toBe(Date.UTC(2026, 2, 9, 4)); // 9 March 00:00 EDT, the morning after the change
  });
});
