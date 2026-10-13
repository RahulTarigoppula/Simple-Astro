// The month leaf: for each civil date of a Gregorian month at a place, the sunrise and the aṅgas in
// force at it, plus the saṅkrāntis (the sidereal Sun entering a sign) that fall in the month.
import * as A from "astronomy-engine";
import { DateTime } from "luxon";
import { ayanamsa } from "./ayanamsa";
import { CITE } from "./citations";
import { astroTime } from "./ephemeris";
import { norm360 } from "./math";
import { angasAt, solveCrossing } from "./panchang";
import { type GeoPoint, hinduDay, observerOf, sunEvent } from "./sunrise";
import { daysInMonth } from "./time";
import type { AyanamsaPreset, CalendarDay, CalendarMark, Citation, Deg, EnginePreset, MonthCalendar, Sankranti, SignIdx } from "./types";

export interface CalendarPlace extends GeoPoint {
  /** IANA zone whose civil calendar names the dates. */
  zone: string;
}

export const SANKRANTI_CITATION: Citation = CITE.suryaSiddhanta14;
export const TITHI_DAY_CITATION: Citation = CITE.muhurtaTithiDay;

const HOUR = 3_600_000;

/** Tithi indices (1..30) that begin and end strictly between two sunrises, kṣaya tithis that never
 *  touch a sunrise. `a` is the tithi at the first sunrise, `b` at the second. */
export function skippedTithis(a: number, b: number): number[] {
  const steps = (((b - a) % 30) + 30) % 30;
  const out: number[] = [];
  for (let i = 1; i < steps; i++) out.push(((a - 1 + i) % 30) + 1);
  return out;
}

/** Marks from every tithi the day holds (the one at sunrise and any kṣaya tithi after it). */
export function tithiMarks(tithis: readonly number[]): CalendarMark[] {
  const marks: CalendarMark[] = [];
  if (tithis.includes(11) || tithis.includes(26)) marks.push("ekadashi");
  if (tithis.includes(15)) marks.push("purnima");
  if (tithis.includes(30)) marks.push("amavasya");
  return marks;
}

const sunSidAt =
  (ap: AyanamsaPreset) =>
  (ms: number): Deg => {
    const t = astroTime(ms);
    return norm360(A.SunPosition(t).elon - ayanamsa(t.tt + 2451545.0, ap));
  };

/** Every instant in [t0, t1) where the sidereal Sun crosses a multiple of 30°. */
export function sankrantisBetween(t0: number, t1: number, ap: AyanamsaPreset): Array<{ ms: number; sign: SignIdx }> {
  const f = sunSidAt(ap);
  const s0 = f(t0);
  let s1 = f(t1);
  if (s1 < s0) s1 += 360;
  const out: Array<{ ms: number; sign: SignIdx }> = [];
  for (let k = Math.floor(s0 / 30) + 1; k * 30 <= s1; k++) {
    const target = (k * 30) % 360;
    // The Sun moves ~1°/day: start the bracket near the crossing so the solver needs few steps.
    const guess = t0 + ((k * 30 - s0) / (s1 - s0)) * (t1 - t0);
    const ms = solveCrossing(f, target, Math.max(t0, guess - 36 * HOUR), Math.min(t1, guess + 36 * HOUR), 1000);
    if (ms >= t0 && ms < t1) out.push({ ms, sign: (k % 12) as SignIdx });
  }
  return out;
}

/**
 * The month leaf. `month` is 1-12. Each date's sunrise is the first after local midnight in
 * `place.zone`; where the Sun does not rise, the polar day (local noon − 6 h) stands in.
 */
export function monthCalendar(year: number, month: number, place: CalendarPlace, preset: EnginePreset): MonthCalendar {
  const zone = DateTime.fromMillis(0, { zone: place.zone }).isValid ? place.zone : "UTC";
  const obs = observerOf(place);
  const n = daysInMonth(year, month);
  const midnight = (d: number): number =>
    DateTime.fromObject({ year, month, day: 1 }, { zone })
      .plus({ days: d - 1 })
      .toMillis();

  const rises: Array<{ ms: number; polar: boolean }> = [];
  for (let d = 1; d <= n + 1; d++) {
    const m0 = midnight(d);
    const r = sunEvent(obs, 1, m0, 1, preset.sunrise);
    if (r !== null && r < midnight(d + 1)) rises.push({ ms: r, polar: false });
    else rises.push({ ms: hinduDay(obs, m0 + 12 * HOUR, preset.sunrise).sunriseMs, polar: true });
  }

  const at = rises.map((r) => angasAt(r.ms + 1000, preset.ayanamsa));
  const firstMs = midnight(1);
  const endMs = midnight(n + 1);
  const sankranti: Sankranti[] = sankrantisBetween(firstMs, endMs, preset.ayanamsa).map((s) => ({
    ...s,
    day: DateTime.fromMillis(s.ms, { zone }).day,
  }));

  const days: CalendarDay[] = [];
  for (let d = 1; d <= n; d++) {
    const a = at[d - 1];
    const b = at[d];
    const rise = rises[d - 1];
    if (!a || !b || !rise) continue;
    const kshaya = skippedTithis(a.tithi.index, b.tithi.index);
    const marks = tithiMarks([a.tithi.index, ...kshaya]);
    const sk = sankranti.find((s) => s.day === d);
    if (sk) marks.push("sankranti");
    const day: CalendarDay = {
      day: d,
      weekday: new Date(Date.UTC(year, month - 1, d)).getUTCDay() as CalendarDay["weekday"],
      sunriseMs: rise.ms,
      tithi: { index: a.tithi.index, name: a.tithi.name, paksha: a.tithi.paksha },
      nakshatra: a.nakshatra.index,
      elongation: a.elongation,
      moonK: (1 - Math.cos((a.elongation * Math.PI) / 180)) / 2,
      marks,
    };
    if (kshaya.length) day.kshaya = kshaya;
    if (sk) day.sankranti = sk;
    if (rise.polar) day.polar = true;
    days.push(day);
  }
  return {
    year,
    month,
    zone,
    leadingBlanks: new Date(Date.UTC(year, month - 1, 1)).getUTCDay(),
    days,
    sankranti,
  };
}
