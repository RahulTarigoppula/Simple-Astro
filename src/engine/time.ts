// Resolving a birth moment (§6.1). The clock, not the astronomy, is the hard part of Indian
// birth data: five offsets since 1854, one of them (Bombay Time, +04:51) absent from the IANA
// database. Everything here is a pure function of its arguments; the machine's zone is never read.
import tzlookup from "@photostructure/tz-lookup";
import { MakeTime } from "astronomy-engine";
import { DateTime } from "luxon";
import { EngineError } from "./errors";
import { JD_UNIX_EPOCH, MS_PER_DAY } from "./math";
import type { BirthMoment, Jd, Place } from "./types";

/** J2000.0 as a Julian Day. */
export const J2000 = 2451545.0;

/** The ephemeris is trusted from 1600 to 2400 (astronomy-engine degrades outside it). */
export const MIN_YEAR = 1600;
export const MAX_YEAR = 2400;

export interface BirthInput {
  localY: number;
  localMo: number;
  localD: number;
  localH: number;
  localMi: number;
  place: Place;
  zoneOverride?: string;
  offsetOverrideMin?: number;
}

export type LocalTimeStatus = "ok" | "invalid" | "ambiguous" | "nonexistent";

/** Gregorian leap-year rule. */
export function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

/** Days in month `m` (1-12) of year `y`; 0 for an out-of-range month. */
export function daysInMonth(y: number, m: number): number {
  if (!Number.isInteger(m) || m < 1 || m > 12) return 0;
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return m === 4 || m === 6 || m === 9 || m === 11 ? 30 : 31;
}

/** True when the five clock fields name a real calendar date and a 24-hour clock time. */
export function isValidCivil(y: number, mo: number, d: number, h: number, mi: number): boolean {
  if (![y, mo, d, h, mi].every(Number.isInteger)) return false;
  if (mo < 1 || mo > 12) return false;
  if (d < 1 || d > daysInMonth(y, mo)) return false;
  return h >= 0 && h <= 23 && mi >= 0 && mi <= 59;
}

/** JD (UT) of a UTC epoch-millisecond instant. */
export function jdUtFromUtcMs(utcMs: number): Jd {
  return utcMs / MS_PER_DAY + JD_UNIX_EPOCH;
}

/** JD (TT): astronomy-engine's own ΔT model (Espenak-Meeus) carried in `AstroTime.tt`. */
export function jdTtFromUtcMs(utcMs: number): Jd {
  return MakeTime(utcMs / MS_PER_DAY + JD_UNIX_EPOCH - J2000).tt + J2000;
}

function isZoneKnown(zone: string): boolean {
  return DateTime.fromMillis(0, { zone }).isValid;
}

/**
 * Every UTC offset (minutes east, possibly fractional for LMT-era zones) under which the given
 * wall-clock time occurs in `zone`. Empty for a non-existent time (a spring-forward gap), two
 * entries for an ambiguous one (a fall-back fold), one otherwise.
 */
export function possibleOffsets(y: number, mo: number, d: number, h: number, mi: number, zone: string): number[] {
  if (!isValidCivil(y, mo, d, h, mi) || !isZoneKnown(zone)) return [];
  const wallAsUtc = Date.UTC(y, mo - 1, d, h, mi);
  const out: number[] = [];
  // A wall time occurs at offset o iff the zone's offset at (wall − o) is o. Probe the offsets in
  // force within ±36 h; zones never change more than once or twice in that window.
  const seen = new Set<number>();
  for (const probeH of [-36, -24, -12, 0, 12, 24, 36]) {
    const off = DateTime.fromMillis(wallAsUtc + probeH * 3_600_000, { zone }).offset;
    if (seen.has(off)) continue;
    seen.add(off);
    const instant = Math.round(wallAsUtc - off * 60_000);
    if (DateTime.fromMillis(instant, { zone }).offset === off) out.push(off);
  }
  return out.sort((a, b) => b - a);
}

/**
 * Classify a wall-clock time at a zone: 'invalid' (31 February, 24:00, unknown zone),
 * 'nonexistent' (inside a DST gap), 'ambiguous' (inside a DST fold) or 'ok'.
 */
export function checkLocalTime(y: number, mo: number, d: number, h: number, mi: number, zone: string): LocalTimeStatus {
  if (!isValidCivil(y, mo, d, h, mi) || !isZoneKnown(zone)) return "invalid";
  const n = possibleOffsets(y, mo, d, h, mi, zone).length;
  if (n === 0) return "nonexistent";
  return n > 1 ? "ambiguous" : "ok";
}

/** `+05:30`, `−03:00` written with an ASCII minus, `+05:21:10` when seconds are present. */
export function formatOffset(offsetMin: number): string {
  const sign = offsetMin < 0 ? "-" : "+";
  const totalSec = Math.round(Math.abs(offsetMin) * 60);
  const hh = Math.floor(totalSec / 3600);
  const mm = Math.floor((totalSec % 3600) / 60);
  const ss = totalSec % 60;
  const base = `${sign}${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return ss === 0 ? base : `${base}:${String(ss).padStart(2, "0")}`;
}

/**
 * Resolve the written birth time to a UTC instant (§6.1).
 *
 * - `offsetOverrideMin` wins over the tzdb ("the drum wins"): the instant is wall − override.
 * - Otherwise the zone (`zoneOverride`, else tz-lookup at the place) is resolved through Luxon,
 *   which reads the runtime's IANA data.
 * - Impossible dates, unknown zones and non-existent (DST-gap) times throw `TIME_INVALID`;
 *   a fold (repeated hour) throws `TIME_AMBIGUOUS`, the engine never guesses, the offset
 *   drum resolves it. Years outside 1600-2400 throw `EPHEMERIS_RANGE`.
 */
export function resolveBirthMoment(input: BirthInput): BirthMoment {
  const { localY: y, localMo: mo, localD: d, localH: h, localMi: mi } = input;
  if (!isValidCivil(y, mo, d, h, mi)) {
    throw new EngineError("TIME_INVALID", `not a calendar time: ${y}-${mo}-${d} ${h}:${mi}`);
  }
  if (y < MIN_YEAR || y > MAX_YEAR) {
    throw new EngineError("EPHEMERIS_RANGE", `year ${y} is outside ${MIN_YEAR}-${MAX_YEAR}`);
  }
  const { lat, lon } = input.place;
  if (!Number.isFinite(lat) || !Number.isFinite(lon) || Math.abs(lat) > 90 || Math.abs(lon) > 180) {
    throw new EngineError("PLACE_MISSING", `coordinates out of range: ${lat}, ${lon}`);
  }
  const zone = input.zoneOverride ?? tzlookup(lat, lon);

  let utcMs: number;
  let offsetMin: number;
  let offsetSource: BirthMoment["offsetSource"];
  if (input.offsetOverrideMin != null) {
    if (!Number.isFinite(input.offsetOverrideMin) || Math.abs(input.offsetOverrideMin) > 18 * 60) {
      throw new EngineError("TIME_INVALID", `offset override out of range: ${input.offsetOverrideMin}`);
    }
    offsetMin = input.offsetOverrideMin;
    utcMs = Date.UTC(y, mo - 1, d, h, mi) - offsetMin * 60_000;
    offsetSource = "override";
  } else {
    if (!isZoneKnown(zone)) throw new EngineError("TIME_INVALID", `unknown time zone: ${zone}`);
    const offsets = possibleOffsets(y, mo, d, h, mi, zone);
    if (offsets.length === 0) {
      throw new EngineError("TIME_INVALID", `this clock time did not exist in ${zone} (a clock change skipped it)`);
    }
    if (offsets.length > 1) {
      throw new EngineError(
        "TIME_AMBIGUOUS",
        `this clock time happened twice in ${zone} (${offsets.map(formatOffset).join(" / ")}); set the offset drum`,
      );
    }
    const dt = DateTime.fromObject({ year: y, month: mo, day: d, hour: h, minute: mi }, { zone });
    if (!dt.isValid) throw new EngineError("TIME_INVALID", dt.invalidExplanation ?? "bad local time");
    utcMs = dt.toMillis();
    offsetMin = dt.offset;
    offsetSource = "tzdb";
  }

  const out: BirthMoment = {
    localY: y,
    localMo: mo,
    localD: d,
    localH: h,
    localMi: mi,
    place: input.place,
    zone,
    utcMs,
    offsetMin,
    jdUt: jdUtFromUtcMs(utcMs),
    offsetSource,
  };
  if (input.offsetOverrideMin != null) out.offsetOverrideMin = input.offsetOverrideMin;
  return out;
}

// ─── the clock in plain words ───────────────────────────────────────────────
// Birth times arrive as "7:25" from a family member who means the evening as often as the morning.
// Every screen that prints a birth time prints it the 12-hour way, with am/pm, so a mistake is
// visible at a glance; the 24-hour form sits beside it for the almanac-minded.

/** "7:25 am", "12:00 pm", "12:05 am". */
export function formatClock12(h: number, mi: number): string {
  const hh = ((h % 12) + 12) % 12 || 12;
  return `${hh}:${String(mi).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
}

/** "07:25". */
export function formatClock24(h: number, mi: number): string {
  return `${String(h).padStart(2, "0")}:${String(mi).padStart(2, "0")}`;
}

/** The part of the day a 24-hour hour falls in, as people say it. */
export function partOfDay(h: number): "at night" | "in the morning" | "in the afternoon" | "in the evening" {
  if (h < 5) return "at night";
  if (h < 12) return "in the morning";
  if (h < 17) return "in the afternoon";
  if (h < 21) return "in the evening";
  return "at night";
}

/** "7:25 in the morning (07:25)", the sentence shown under a birth time before it is saved. */
export function clockWords(h: number, mi: number): string {
  const hh = ((h % 12) + 12) % 12 || 12;
  return `${hh}:${String(mi).padStart(2, "0")} ${partOfDay(h)} (${formatClock24(h, mi)})`;
}
