// The Rooftop model (§4.6, §6.14): everything the painted sky and the dome draw for one instant at
// one place — one model, two renderers, so the cheap renderer is never a downgrade in correctness.
//
// Frames: astronomy-engine gives geocentric J2000 (EQJ) vectors; we rotate them to the true
// equator and equinox of date (precession + nutation) and then to the local horizon with the
// apparent sidereal time (GAST + east longitude) — the same RAMC the Lagna uses. Sidereal
// longitudes are tropical apparent longitudes on the true ecliptic of date minus the ayanāṃśa
// preset, exactly as in the Patri. Positions are geometric (no refraction, ≤ 0.6° at the horizon);
// the Moon is topocentric (parallax up to ~1°), the planets' parallax is negligible.
//
// Cost: seven GeoVector calls, one node, one Lagna, a few rotations — ≈ 0.3–0.6 ms, so a scrub
// frame can recompute it with no tween.
import * as A from "astronomy-engine";
import { ayanamsa } from "../ayanamsa";
import { astroTime, BODY, PLANET_IDS } from "../ephemeris";
import { lagna as solveLagna } from "../lagna";
import { D2R, norm360, R2D } from "../math";
import { nakshatraIndexOf, signOf } from "../nakshatra";
import { ketuOf, meanNode, trueNode } from "../nodes";
import type { AyanamsaPreset, GrahaId, NodeMode, SignIdx } from "../types";
import { equatorialToHorizon, type Mat3, mul3 } from "./stars";

/** East, Up, North components of a unit vector on the sky. */
export type Eun = readonly [number, number, number];

export interface RooftopBody {
  id: GrahaId;
  /** Tropical apparent longitude, true ecliptic of date, degrees. */
  lonTrop: number;
  lonSid: number;
  sign: SignIdx;
  /** Geometric altitude/azimuth, degrees (azimuth from North through East). */
  alt: number;
  az: number;
  v: Eun;
}

export interface RooftopSky {
  utcMs: number;
  lat: number;
  lon: number;
  /** Local apparent sidereal time = RAMC, degrees. */
  lstDeg: number;
  /** True obliquity of date, degrees. */
  eps: number;
  ayanamsa: number;
  /** J2000 (EQJ) → true equator of date; apply to star vectors. */
  frame: Mat3;
  /** Equator of date → horizon (rows E, U, N). */
  toHorizon: Mat3;
  /** SU MO MA ME JU VE SA RA KE, in that order. */
  bodies: RooftopBody[];
  /** Moon illuminated fraction 0..1. */
  moonK: number;
  sunAlt: number;
  lagna: { lonTrop: number; lonSid: number; sign: SignIdx; nakshatra: number; az: number; v: Eun };
}

const asRowMajor = (r: A.RotationMatrix): Mat3 => {
  const m = r.rot;
  const g = (i: number, j: number): number => m[i]?.[j] ?? 0;
  // astronomy-engine stores rot[col][row]: x' = rot[0][0]x + rot[1][0]y + rot[2][0]z.
  return [g(0, 0), g(1, 0), g(2, 0), g(0, 1), g(1, 1), g(2, 1), g(0, 2), g(1, 2), g(2, 2)];
};

const apply = (m: Mat3, x: number, y: number, z: number): [number, number, number] => [
  m[0] * x + m[1] * y + m[2] * z,
  m[3] * x + m[4] * y + m[5] * z,
  m[6] * x + m[7] * y + m[8] * z,
];

const unit = (v: [number, number, number]): [number, number, number] => {
  const r = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / r, v[1] / r, v[2] / r];
};

/** Unit vector (equator of date) of an ecliptic-of-date point (degrees). */
export function eclipticToEquatorial(lonDeg: number, latDeg: number, epsDeg: number): [number, number, number] {
  const l = lonDeg * D2R;
  const b = latDeg * D2R;
  const e = epsDeg * D2R;
  const cb = Math.cos(b);
  const x = cb * Math.cos(l);
  const y = cb * Math.sin(l);
  const z = Math.sin(b);
  return [x, y * Math.cos(e) - z * Math.sin(e), y * Math.sin(e) + z * Math.cos(e)];
}

/** E/U/N of a sidereal-zodiac point (sidereal longitude, ecliptic latitude, degrees). */
export function siderealPointEun(sky: RooftopSky, lonSid: number, latDeg = 0): Eun {
  const q = eclipticToEquatorial(lonSid + sky.ayanamsa, latDeg, sky.eps);
  return apply(sky.toHorizon, q[0], q[1], q[2]);
}

export const altAzOfEun = (v: Eun): { alt: number; az: number } => ({
  alt: Math.asin(Math.max(-1, Math.min(1, v[1]))) * R2D,
  az: norm360(Math.atan2(v[0], v[2]) * R2D),
});

/** The whole sky model at `utcMs` for a place (lat +N, lon +E). */
export function rooftopSky(
  utcMs: number,
  lat: number,
  lon: number,
  preset: AyanamsaPreset = "se-true",
  node: NodeMode = "true",
): RooftopSky {
  const t = astroTime(utcMs);
  const jdTt = t.tt + 2451545.0;
  const ay = ayanamsa(jdTt, preset);
  const L = solveLagna(t, lat, lon, ay);
  const eps = L.eps;
  const frame = asRowMajor(A.Rotation_EQJ_EQD(t));
  const toHorizon = equatorialToHorizon(L.ramc, lat);
  // Observer, equator of date (AU), for the Moon's topocentric parallax.
  const obs = A.ObserverVector(t, new A.Observer(lat, lon, 0), true);
  const ce = Math.cos(eps * D2R);
  const se = Math.sin(eps * D2R);

  const bodies: RooftopBody[] = [];
  let sunDir: [number, number, number] = [1, 0, 0];
  let moonDir: [number, number, number] = [1, 0, 0];
  for (const id of PLANET_IDS) {
    const g = A.GeoVector(BODY[id], t, true);
    const q = apply(frame, g.x, g.y, g.z); // geocentric, equator of date
    const lonTrop = norm360(Math.atan2(q[1] * ce + q[2] * se, q[0]) * R2D);
    if (id === "SU") sunDir = unit(q);
    if (id === "MO") moonDir = unit(q);
    const topo = id === "MO" ? unit([q[0] - obs.x, q[1] - obs.y, q[2] - obs.z]) : unit(q);
    const v = apply(toHorizon, topo[0], topo[1], topo[2]);
    const lonSid = norm360(lonTrop - ay);
    bodies.push({ id, lonTrop, lonSid, sign: signOf(lonSid), ...altAzOfEun(v), v });
  }
  const rahuTrop = node === "true" ? trueNode(t) : meanNode(jdTt);
  for (const [id, lonTrop] of [
    ["RA", rahuTrop],
    ["KE", ketuOf(rahuTrop)],
  ] as const) {
    const q = eclipticToEquatorial(lonTrop, 0, eps);
    const v = apply(toHorizon, q[0], q[1], q[2]);
    const lonSid = norm360(lonTrop - ay);
    bodies.push({ id, lonTrop, lonSid, sign: signOf(lonSid), ...altAzOfEun(v), v });
  }

  const cosElong = sunDir[0] * moonDir[0] + sunDir[1] * moonDir[1] + sunDir[2] * moonDir[2];
  const lq = eclipticToEquatorial(L.ascTrop, 0, eps);
  const lv = apply(toHorizon, lq[0], lq[1], lq[2]);
  const sun = bodies[0];
  return {
    utcMs,
    lat,
    lon,
    lstDeg: L.ramc,
    eps,
    ayanamsa: ay,
    frame,
    toHorizon,
    bodies,
    moonK: (1 - cosElong) / 2,
    sunAlt: sun ? sun.alt : -90,
    lagna: {
      lonTrop: L.ascTrop,
      lonSid: L.ascSid,
      sign: signOf(L.ascSid),
      nakshatra: nakshatraIndexOf(L.ascSid),
      az: altAzOfEun(lv).az,
      v: lv,
    },
  };
}

/** Stars' combined J2000 → horizon matrix for this sky. */
export const starMatrix = (sky: RooftopSky): Mat3 => mul3(sky.toHorizon, sky.frame);
