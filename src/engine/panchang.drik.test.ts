// V-1/V-4: the engine under the Drik-compatible preset against Drik Panchang day pages, read by hand.
import { describe, expect, it } from "vitest";
import drik from "./__fixtures__/panchang-drik.json";
import { computePanchang } from "./panchang";
import { DEFAULT_PRESET } from "./types";

const IST = "+05:30";
const at = (date: string, hhmm: string): number => {
  const next = hhmm.startsWith("+");
  const t = Date.parse(`${date}T${hhmm.replace("+", "")}:00${IST}`);
  return next ? t + 86_400_000 : t;
};

describe("panchang vs drikpanchang.com (drik-mean, upper-limb sunrise)", () => {
  for (const d of drik.days) {
    it(`${d.city} ${d.date}`, () => {
      const p = computePanchang(
        at(d.date, "06:50"),
        { lat: d.lat, lon: d.lon },
        { ...DEFAULT_PRESET, ayanamsa: "drik-mean", sunrise: "upper-limb-refracted" },
      );
      const near = (ms: number, hhmm: string) => expect(Math.abs(ms - at(d.date, hhmm)) / 1000).toBeLessThanOrEqual(120);
      expect(p.tithi.name).toContain(d.tithi[0]);
      expect(p.nakshatra.name).toBe(d.nakshatra[0]);
      expect(p.yoga.name).toBe(d.yoga[0]);
      expect(p.karana.name).toBe(d.karana[0]);
      expect(p.vara.name).toBe(d.vara);
      near(p.sunriseMs, d.sunrise);
      near(p.sunsetMs, d.sunset);
      near(p.tithi.endMs, d.tithi[1] ?? "");
      near(p.nakshatra.endMs, d.nakshatra[1] ?? "");
      near(p.yoga.endMs, d.yoga[1] ?? "");
      near(p.karana.endMs, d.karana[1] ?? "");
    });
  }
});
