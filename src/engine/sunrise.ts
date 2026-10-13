// Sunrise, sunset and the Hindu day (§6.9). The day runs sunrise → sunrise at the leaf's place.
// Two conventions: 'upper-limb-refracted' (the Sun's top edge on a refracted horizon, what
// almanacs print) and 'disc-centre' (the geometric centre at altitude 0, no refraction).
import * as A from "astronomy-engine";
import { astroTime, astroTimeToMs } from "./ephemeris";
import { MS_PER_DAY } from "./math";
import type { SunriseMode } from "./types";

export interface GeoPoint {
  lat: number;
  lon: number;
  elevation?: number;
}

export function observerOf(p: GeoPoint): A.Observer {
  return new A.Observer(p.lat, p.lon, p.elevation ?? 0);
}

/** One rise (+1) or set (−1) event of the Sun under a convention, searching `limitDays` forward
 *  (positive) or backward (negative) from `fromMs`. Null when none occurs in the window. */
export function sunEvent(obs: A.Observer, direction: 1 | -1, fromMs: number, limitDays: number, mode: SunriseMode): number | null {
  const t = astroTime(fromMs);
  const hit =
    mode === "upper-limb-refracted"
      ? A.SearchRiseSet(A.Body.Sun, obs, direction, t, limitDays) // limb + refraction
      : A.SearchAltitude(A.Body.Sun, obs, direction, t, limitDays, 0); // disc centre, no refraction
  return hit ? astroTimeToMs(hit) : null;
}

/** Spec-shaped helper: the first sunrise after `dayStartMs` (within a day), or null. */
export function sunrise(obs: A.Observer, dayStartMs: number, mode: SunriseMode): number | null {
  return sunEvent(obs, 1, dayStartMs, 1, mode);
}

/** Rise (+1) or set (−1) of the Moon (upper limb, refracted) within `limitDays`, or null. */
export function moonEvent(obs: A.Observer, direction: 1 | -1, fromMs: number, limitDays: number): number | null {
  const hit = A.SearchRiseSet(A.Body.Moon, obs, direction, astroTime(fromMs), limitDays);
  return hit ? astroTimeToMs(hit) : null;
}

/** Local apparent noon (the Sun's upper transit) nearest after `fromMs`. */
export function solarTransit(obs: A.Observer, fromMs: number): number {
  return astroTimeToMs(A.SearchHourAngle(A.Body.Sun, obs, 0, astroTime(fromMs), +1).time);
}

export interface HinduDay {
  /** The governing sunrise: the latest sunrise at or before the instant. */
  sunriseMs: number;
  sunsetMs: number;
  nextSunriseMs: number;
  /** Set when the Sun does not rise or set at this latitude today and the day is synthesised
   *  as local apparent noon ± 6 h (midnight sun or polar night). */
  polar?: "midnight-sun" | "polar-night";
}

/**
 * The Hindu day containing `atMs`: an instant before today's sunrise belongs to the previous day.
 * At polar latitudes where the Sun neither rises nor sets, the day degrades to local apparent noon
 * ± 6 h, never NaN, and says so in `polar`.
 */
export function hinduDay(obs: A.Observer, atMs: number, mode: SunriseMode): HinduDay {
  const rise = sunEvent(obs, 1, atMs, -1.5, mode);
  const next = rise === null ? null : sunEvent(obs, 1, rise + 60_000, 1.5, mode);
  const set = rise === null ? null : sunEvent(obs, -1, rise, 1, mode);
  if (rise !== null && next !== null && set !== null && set < next) {
    return { sunriseMs: rise, sunsetMs: set, nextSunriseMs: next };
  }
  // Polar fallback: the latest local apparent noon N with N − 6 h ≤ atMs.
  const SIX_H = 6 * 3_600_000;
  let noon = solarTransit(obs, atMs - 1.5 * MS_PER_DAY);
  for (let i = 0; i < 4; i++) {
    const following = solarTransit(obs, noon + 3_600_000);
    if (following - SIX_H > atMs) break;
    noon = following;
  }
  const t = astroTime(noon);
  const eq = A.Equator(A.Body.Sun, t, obs, true, true);
  const alt = A.Horizon(t, obs, eq.ra, eq.dec).altitude;
  const nextNoon = solarTransit(obs, noon + 3_600_000);
  return {
    sunriseMs: noon - SIX_H,
    sunsetMs: noon + SIX_H,
    nextSunriseMs: nextNoon - SIX_H,
    polar: alt > 0 ? "midnight-sun" : "polar-night",
  };
}
