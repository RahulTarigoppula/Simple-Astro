import { DateTime } from "luxon";
import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/timezones.json";
import { EngineError } from "./errors";
import {
  checkLocalTime,
  daysInMonth,
  formatOffset,
  isValidCivil,
  jdTtFromUtcMs,
  jdUtFromUtcMs,
  possibleOffsets,
  resolveBirthMoment,
} from "./time";
import type { Place } from "./types";

interface TzRow {
  id: string;
  local: [number, number, number, number, number];
  zone: string;
  offset: string;
  offsetOverrideMin?: number;
  utc: string;
  jdUt?: number;
}

const ROWS = fixture.rows as unknown as TzRow[];
const PLACE: Place = { name: "Bengaluru", country: "IN", lat: 12.9716, lon: 77.5946, source: "manual" };

function resolveRow(r: TzRow) {
  const [y, mo, d, h, mi] = r.local;
  return resolveBirthMoment({
    localY: y,
    localMo: mo,
    localD: d,
    localH: h,
    localMi: mi,
    place: PLACE,
    zoneOverride: r.zone,
    ...(r.offsetOverrideMin != null ? { offsetOverrideMin: r.offsetOverrideMin } : {}),
  });
}

function codeOf(fn: () => unknown): string | null {
  try {
    fn();
    return null;
  } catch (e) {
    return e instanceof EngineError ? e.code : "not-an-EngineError";
  }
}

describe("tzdb guard", () => {
  it("the runtime IANA data knows India's war-time and Madras history", () => {
    const probe = (iso: string, zone: string): string => formatOffset(DateTime.fromISO(iso, { zone }).offset);
    const cases: Array<[string, string, string]> = [
      ["1943-06-01T06:00", "Asia/Kolkata", "+06:30"],
      ["1942-07-01T12:00", "Asia/Kolkata", "+05:30"],
      ["1900-07-15T10:00", "Asia/Kolkata", "+05:21:10"],
      ["1990-06-01T09:00", "Asia/Kathmandu", "+05:45"],
    ];
    for (const [iso, zone, expected] of cases) {
      const got = probe(iso, zone);
      if (got !== expected) {
        throw new Error(`Runtime tzdb is too old: ${zone} ${iso.slice(0, 10)} resolved to ${got}, expected ${expected}`);
      }
    }
  });
});

describe("resolveBirthMoment, the fifteen historical rows (§6.1)", () => {
  it.each(ROWS.map((r) => [r.id, r] as const))("%s resolves to the expected UTC instant", (_id, r) => {
    const b = resolveRow(r);
    expect(new Date(b.utcMs).toISOString().replace(".000Z", "Z")).toBe(r.utc);
    expect(b.utcMs).toBe(Date.parse(r.utc));
    expect(formatOffset(b.offsetMin)).toBe(r.offset);
    expect(b.zone).toBe(r.zone);
    expect(b.offsetSource).toBe(r.offsetOverrideMin != null ? "override" : "tzdb");
    expect(b.jdUt).toBeCloseTo(b.utcMs / 86_400_000 + 2440587.5, 12);
    // Round trip: the instant reads back as the written wall clock (tzdb rows only).
    if (r.offsetOverrideMin == null) {
      const back = DateTime.fromMillis(b.utcMs, { zone: r.zone });
      expect([back.year, back.month, back.day, back.hour, back.minute]).toEqual(r.local);
    }
  });

  it("TZ-1: JD_UT 2449425.579861 and displays as 2449425.5799 (rounded)", () => {
    const b = resolveRow(ROWS[0] as TzRow);
    expect(Math.abs(b.jdUt - 2449425.579861)).toBeLessThan(1e-6);
    expect(b.jdUt.toFixed(4)).toBe("2449425.5799");
  });

  it("TZ-7: Madras is a three-part offset, also as the Intl longOffset string", () => {
    const b = resolveRow(ROWS.find((r) => r.id === "TZ-7") as TzRow);
    expect(formatOffset(b.offsetMin)).toBe("+05:21:10");
    const s = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Kolkata", timeZoneName: "longOffset" })
      .formatToParts(new Date(b.utcMs))
      .find((p) => p.type === "timeZoneName")?.value;
    expect(s).toBe("GMT+05:21:10");
  });

  it("TZ-8: the override wins but the zone id is kept", () => {
    const b = resolveRow(ROWS.find((r) => r.id === "TZ-8") as TzRow);
    expect(b.zone).toBe("Asia/Kolkata");
    expect(b.offsetOverrideMin).toBe(291);
    expect(b.offsetMin).toBe(291);
  });

  it("looks the zone up from the coordinates when no zone is given", () => {
    const b = resolveBirthMoment({ localY: 1994, localMo: 3, localD: 14, localH: 7, localMi: 25, place: PLACE });
    expect(b.zone).toBe("Asia/Kolkata");
    expect(b.utcMs).toBe(Date.UTC(1994, 2, 14, 1, 55));
  });
});

describe("invalid, non-existent and ambiguous local times", () => {
  it("classifies wall-clock times", () => {
    expect(checkLocalTime(2021, 3, 14, 2, 30, "America/New_York")).toBe("nonexistent");
    expect(checkLocalTime(2021, 11, 7, 1, 30, "America/New_York")).toBe("ambiguous");
    expect(checkLocalTime(2021, 11, 7, 2, 30, "America/New_York")).toBe("ok");
    expect(checkLocalTime(2021, 2, 31, 9, 0, "Asia/Kolkata")).toBe("invalid");
    expect(checkLocalTime(2021, 2, 28, 24, 0, "Asia/Kolkata")).toBe("invalid");
    expect(checkLocalTime(2021, 2, 28, 9, 0, "Mars/Olympus_Mons")).toBe("invalid");
    expect(checkLocalTime(1994, 3, 14, 7, 25, "Asia/Kolkata")).toBe("ok");
  });

  it("an ambiguous time offers both offsets, earlier offset first", () => {
    expect(possibleOffsets(2021, 11, 7, 1, 30, "America/New_York")).toEqual([-240, -300]);
    expect(possibleOffsets(2021, 3, 14, 2, 30, "America/New_York")).toEqual([]);
  });

  it("throws TIME_INVALID for 31 February and for a DST gap; TIME_AMBIGUOUS for a fold", () => {
    const base = { place: PLACE, zoneOverride: "America/New_York" };
    expect(codeOf(() => resolveBirthMoment({ ...base, localY: 2021, localMo: 2, localD: 31, localH: 9, localMi: 0 }))).toBe("TIME_INVALID");
    expect(codeOf(() => resolveBirthMoment({ ...base, localY: 2021, localMo: 3, localD: 14, localH: 2, localMi: 30 }))).toBe(
      "TIME_INVALID",
    );
    expect(codeOf(() => resolveBirthMoment({ ...base, localY: 2021, localMo: 11, localD: 7, localH: 1, localMi: 30 }))).toBe(
      "TIME_AMBIGUOUS",
    );
    // The offset drum resolves the fold.
    const b = resolveBirthMoment({ ...base, localY: 2021, localMo: 11, localD: 7, localH: 1, localMi: 30, offsetOverrideMin: -300 });
    expect(new Date(b.utcMs).toISOString()).toBe("2021-11-07T06:30:00.000Z");
    // Invalid date is refused even with an override (no silent normalisation to 3 March).
    expect(
      codeOf(() => resolveBirthMoment({ ...base, localY: 2021, localMo: 2, localD: 31, localH: 9, localMi: 0, offsetOverrideMin: 330 })),
    ).toBe("TIME_INVALID");
    expect(
      codeOf(() => resolveBirthMoment({ ...base, zoneOverride: "Not/AZone", localY: 2021, localMo: 2, localD: 1, localH: 9, localMi: 0 })),
    ).toBe("TIME_INVALID");
  });

  it("throws EPHEMERIS_RANGE outside 1600-2400 and PLACE_MISSING for bad coordinates", () => {
    const mk = (y: number) => () =>
      resolveBirthMoment({ localY: y, localMo: 1, localD: 1, localH: 0, localMi: 0, place: PLACE, offsetOverrideMin: 0 });
    expect(codeOf(mk(1599))).toBe("EPHEMERIS_RANGE");
    expect(codeOf(mk(2401))).toBe("EPHEMERIS_RANGE");
    expect(codeOf(mk(1600))).toBeNull();
    expect(codeOf(mk(2400))).toBeNull();
    expect(
      codeOf(() =>
        resolveBirthMoment({ localY: 2000, localMo: 1, localD: 1, localH: 0, localMi: 0, place: { ...PLACE, lat: Number.NaN } }),
      ),
    ).toBe("PLACE_MISSING");
  });
});

describe("calendar helpers", () => {
  it("daysInMonth follows the Gregorian rule", () => {
    expect(daysInMonth(2024, 2)).toBe(29);
    expect(daysInMonth(1900, 2)).toBe(28);
    expect(daysInMonth(2000, 2)).toBe(29);
    expect(daysInMonth(2023, 4)).toBe(30);
    expect(daysInMonth(2023, 12)).toBe(31);
    expect(daysInMonth(2023, 13)).toBe(0);
    expect(isValidCivil(2023, 2, 29, 0, 0)).toBe(false);
  });

  it("formats offsets", () => {
    expect(formatOffset(330)).toBe("+05:30");
    expect(formatOffset(-300)).toBe("-05:00");
    expect(formatOffset(321 + 10 / 60)).toBe("+05:21:10");
    expect(formatOffset(0)).toBe("+00:00");
  });
});

describe("TT", () => {
  it("jdTt − jdUt is astronomy-engine's ΔT: ≈ 60.1 s in 1994, monotonic 1955-2030", () => {
    // Real ΔT is not monotonic before ~1950 (it fell slightly through the 1930s–40s), so the
    // monotonicity claim of TESTING T-7 is asserted over the modern span only.
    const ms = Date.UTC(1994, 2, 14, 1, 55);
    const dt = (jdTtFromUtcMs(ms) - jdUtFromUtcMs(ms)) * 86400;
    expect(dt).toBeGreaterThan(59.5);
    expect(dt).toBeLessThan(60.8);
    expect(Math.abs(jdTtFromUtcMs(ms) - 2449425.580557)).toBeLessThan(2e-6);
    let prev = -Infinity;
    for (let y = 1955; y <= 2030; y++) {
      const m = Date.UTC(y, 0, 1);
      const d = (jdTtFromUtcMs(m) - jdUtFromUtcMs(m)) * 86400;
      expect(d).toBeGreaterThan(prev);
      prev = d;
    }
    const d2026 = (jdTtFromUtcMs(Date.UTC(2026, 0, 1)) - jdUtFromUtcMs(Date.UTC(2026, 0, 1))) * 86400;
    expect(d2026).toBeGreaterThan(65);
    expect(d2026).toBeLessThan(80);
  });
});
