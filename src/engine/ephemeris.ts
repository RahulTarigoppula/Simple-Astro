// The ephemeris interface and its one shipped implementation, astronomy-engine (MIT) (§6.3).
// Longitudes are apparent, geocentric, on the true ecliptic and equinox of date, the convention
// Swiss Ephemeris uses by default, so the two lanes are directly comparable.
import * as A from "astronomy-engine";
import { JD_UNIX_EPOCH, MS_PER_DAY, signedDelta } from "./math";
import type { Deg, GrahaId } from "./types";

export type AstroTime = A.AstroTime;
/** The seven bodies an ephemeris computes; the nodes are ours (`nodes.ts`). */
export type PlanetId = Exclude<GrahaId, "RA" | "KE">;

export const ASTRONOMY_ENGINE_VERSION = "2.1.19";

export interface EclipticPosition {
  /** Apparent longitude, true ecliptic of date, degrees [0, 360). */
  lon: Deg;
  /** Geocentric ecliptic latitude, degrees. */
  lat: number;
}

export interface Ephemeris {
  /** Apparent geocentric longitude, true ecliptic of date, degrees. */
  tropicalLongitude(body: PlanetId, t: AstroTime): Deg;
  /** Longitude and latitude together (one ephemeris evaluation). */
  position(body: PlanetId, t: AstroTime): EclipticPosition;
  /** Degrees per day (tropical), from a ±1 hour central difference. */
  speed(body: PlanetId, t: AstroTime): number;
  greenwichApparentSiderealTime(t: AstroTime): Deg;
  /** True obliquity of the ecliptic (IAU 2006 mean + IAU 2000B Δε), degrees. */
  trueObliquity(t: AstroTime): Deg;
  name: string;
  version: string;
}

export const BODY: Record<PlanetId, A.Body> = {
  SU: A.Body.Sun,
  MO: A.Body.Moon,
  MA: A.Body.Mars,
  ME: A.Body.Mercury,
  JU: A.Body.Jupiter,
  VE: A.Body.Venus,
  SA: A.Body.Saturn,
};

export const PLANET_IDS: readonly PlanetId[] = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"];

/** AstroTime for a UTC epoch-millisecond instant (astronomy-engine treats UT1 ≈ UTC). */
export function astroTime(utcMs: number): AstroTime {
  return A.MakeTime(utcMs / MS_PER_DAY + JD_UNIX_EPOCH - 2451545.0);
}

/** UTC epoch milliseconds of an AstroTime. */
export function astroTimeToMs(t: AstroTime): number {
  return (t.ut + 2451545.0 - JD_UNIX_EPOCH) * MS_PER_DAY;
}

function position(body: PlanetId, t: AstroTime): EclipticPosition {
  if (body === "SU") {
    const s = A.SunPosition(t); // apparent, already ECT (light-time ≙ annual aberration)
    return { lon: s.elon, lat: s.elat };
  }
  if (body === "MO") {
    const m = A.EclipticGeoMoon(t); // geocentric, already ECT
    return { lon: m.lon, lat: m.lat };
  }
  // Light-time + aberration corrected EQJ vector → true ecliptic of date.
  const e = A.Ecliptic(A.GeoVector(BODY[body], t, true));
  return { lon: e.elon, lat: e.elat };
}

const HOUR = 1 / 24;

export const astronomyEngineEphemeris: Ephemeris = {
  name: "astronomy-engine",
  version: ASTRONOMY_ENGINE_VERSION,
  position,
  tropicalLongitude(body, t) {
    return position(body, t).lon;
  },
  speed(body, t) {
    const a = position(body, t.AddDays(-HOUR)).lon;
    const b = position(body, t.AddDays(+HOUR)).lon;
    return signedDelta(a, b) / (2 * HOUR); // handles the 360 → 0 wrap
  },
  greenwichApparentSiderealTime(t) {
    return A.SiderealTime(t) * 15;
  },
  trueObliquity(t) {
    return A.e_tilt(t).tobl;
  },
};

// ─── derived per-graha facts ────────────────────────────────────────────────

/** Combustion orbs in degrees (§6.3). Mercury tightens to 12 and Venus to 8 when retrograde. */
export const COMBUSTION_ORB: Record<Exclude<PlanetId, "SU">, number> = {
  MO: 12,
  MA: 17,
  ME: 14,
  JU: 11,
  VE: 10,
  SA: 15,
};

/** The Sun and the nodes are never combust. */
export function isCombust(id: GrahaId, lonBody: Deg, lonSun: Deg, retrograde: boolean): boolean {
  if (id === "SU" || id === "RA" || id === "KE") return false;
  let orb = COMBUSTION_ORB[id];
  if (retrograde && id === "ME") orb = 12;
  if (retrograde && id === "VE") orb = 8;
  return Math.abs(signedDelta(lonSun, lonBody)) < orb;
}
