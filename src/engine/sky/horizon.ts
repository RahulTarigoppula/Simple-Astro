// The sky model (§6.14): alt/az of the Sun, Moon and the five naked-eye planets at a place and
// instant, plus the rising sidereal sign. Built to be re-evaluated every scrub frame (< 1 ms):
// one VSOP evaluation per body (heliocentric differences, no light-time iteration — at most
// ~0.5′ for Mars, invisible on a 44 px strip), one Moon series, one precession–nutation matrix,
// one sidereal-time call and the Lagna arithmetic. Altitudes are geometric (no refraction);
// the Moon is topocentric, everything else geocentric.
import * as A from "astronomy-engine";
import { ayanamsa } from "../ayanamsa";
import { astroTime } from "../ephemeris";
import { ascMcFromRamc } from "../lagna";
import { atan2d, cosd, D2R, norm360, R2D, sind } from "../math";
import { signOf } from "../nakshatra";
import type { AyanamsaPreset, Deg, EnginePreset, SignIdx } from "../types";

export interface AltAz {
  /** Altitude above the horizon, degrees (−90..90). */
  alt: number;
  /** Azimuth from north through east, degrees [0, 360). */
  az: number;
}

export type SkyPlanet = "MA" | "ME" | "JU" | "VE" | "SA";

export interface SkySnapshot {
  sun: AltAz;
  moon: AltAz & { illumination: number; waxing: boolean };
  planets: Record<SkyPlanet, AltAz>;
  lagnaSign: SignIdx;
  lagnaSid: Deg;
  /** Local apparent sidereal time, degrees. */
  lstDeg: Deg;
}

/**
 * Equatorial → horizontal. `raRad`, `decRad` in radians (true equator of date), local sidereal
 * time and latitude in degrees. A plain spherical rotation, ~40 ns per star.
 */
export function altAz(raRad: number, decRad: number, lstDeg: number, latDeg: number): AltAz {
  const H = lstDeg * D2R - raRad;
  const phi = latDeg * D2R;
  const sinPhi = Math.sin(phi);
  const cosPhi = Math.cos(phi);
  const sinDec = Math.sin(decRad);
  const cosDec = Math.cos(decRad);
  const cosH = Math.cos(H);
  const sinAlt = sinPhi * sinDec + cosPhi * cosDec * cosH;
  const alt = Math.asin(sinAlt < -1 ? -1 : sinAlt > 1 ? 1 : sinAlt) * R2D;
  // Azimuth measured from north, increasing eastward.
  const y = -cosDec * Math.sin(H);
  const x = sinDec * cosPhi - cosDec * cosH * sinPhi;
  return { alt, az: norm360(Math.atan2(y, x) * R2D) };
}

type V3 = [number, number, number];

function rotate(m: number[][], v: V3): V3 {
  // astronomy-engine's RotationMatrix is column-major: rot[i][j] maps component i into j.
  const r0 = m[0] as number[];
  const r1 = m[1] as number[];
  const r2 = m[2] as number[];
  return [
    (r0[0] as number) * v[0] + (r1[0] as number) * v[1] + (r2[0] as number) * v[2],
    (r0[1] as number) * v[0] + (r1[1] as number) * v[1] + (r2[1] as number) * v[2],
    (r0[2] as number) * v[0] + (r1[2] as number) * v[1] + (r2[2] as number) * v[2],
  ];
}

const raOf = (v: V3): number => Math.atan2(v[1], v[0]);
const decOf = (v: V3): number => Math.atan2(v[2], Math.hypot(v[0], v[1]));

const PLANET_BODY: Record<SkyPlanet, A.Body> = {
  MA: A.Body.Mars,
  ME: A.Body.Mercury,
  JU: A.Body.Jupiter,
  VE: A.Body.Venus,
  SA: A.Body.Saturn,
};
const SKY_PLANETS: readonly SkyPlanet[] = ["MA", "ME", "JU", "VE", "SA"];

/** J2000 mean obliquity, for the cheap ecliptic longitude used only to decide waxing/waning. */
const EPS_J2000 = 23.4392911;

function eclLonJ2000(v: V3): Deg {
  return norm360(atan2d(v[1] * cosd(EPS_J2000) + v[2] * sind(EPS_J2000), v[0]));
}

export function skySnapshot(utcMs: number, lat: number, lon: number, preset: EnginePreset | AyanamsaPreset): SkySnapshot {
  const t = astroTime(utcMs);
  const rot = A.Rotation_EQJ_EQD(t).rot;
  const lstDeg = norm360(A.SiderealTime(t) * 15 + lon);

  const earth = A.HelioVector(A.Body.Earth, t);
  const sunJ: V3 = [-earth.x, -earth.y, -earth.z];
  const moonVec = A.GeoMoon(t);
  const moonJ: V3 = [moonVec.x, moonVec.y, moonVec.z];

  const toAltAz = (eqj: V3): AltAz => {
    const v = rotate(rot, eqj);
    return altAz(raOf(v), decOf(v), lstDeg, lat);
  };

  // Topocentric Moon: subtract the observer's geocentric position (true equator of date).
  const obs = A.ObserverVector(t, new A.Observer(lat, lon, 0), true);
  const moonD = rotate(rot, moonJ);
  const moonTopo: V3 = [moonD[0] - obs.x, moonD[1] - obs.y, moonD[2] - obs.z];
  const moonAltAz = altAz(raOf(moonTopo), decOf(moonTopo), lstDeg, lat);

  // Illuminated fraction from the phase angle at the Moon (Earth–Moon–Sun).
  const toSun: V3 = [sunJ[0] - moonJ[0], sunJ[1] - moonJ[1], sunJ[2] - moonJ[2]];
  const toEarth: V3 = [-moonJ[0], -moonJ[1], -moonJ[2]];
  const dot = toSun[0] * toEarth[0] + toSun[1] * toEarth[1] + toSun[2] * toEarth[2];
  const cosI = dot / (Math.hypot(...toSun) * Math.hypot(...toEarth));
  const illumination = (1 + cosI) / 2;
  const waxing = norm360(eclLonJ2000(moonJ) - eclLonJ2000(sunJ)) < 180;

  const planets = {} as Record<SkyPlanet, AltAz>;
  for (const id of SKY_PLANETS) {
    const h = A.HelioVector(PLANET_BODY[id], t);
    planets[id] = toAltAz([h.x - earth.x, h.y - earth.y, h.z - earth.z]);
  }

  const ayPreset = typeof preset === "string" ? preset : preset.ayanamsa;
  const { asc } = ascMcFromRamc(lstDeg, A.e_tilt(t).tobl, lat);
  const lagnaSid = norm360(asc - ayanamsa(t.tt + 2451545.0, ayPreset));

  return {
    sun: toAltAz(sunJ),
    moon: { ...moonAltAz, illumination, waxing },
    planets,
    lagnaSign: signOf(lagnaSid),
    lagnaSid,
    lstDeg,
  };
}
