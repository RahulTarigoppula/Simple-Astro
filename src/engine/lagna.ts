// Lagna (ascendant) and MC (§6.5), plus the Bhāva Chalit table (Śrīpati trisection).
import { type AstroTime, astronomyEngineEphemeris, type Ephemeris } from "./ephemeris";
import { atan2d, clamp, cosd, norm360, sind, tand } from "./math";
import type { Deg } from "./types";

export interface LagnaResult {
  ascTrop: Deg;
  mcTrop: Deg;
  ascSid: Deg;
  mcSid: Deg;
  /** Right ascension of the meridian = GAST + east longitude, degrees. */
  ramc: Deg;
  /** True obliquity of date, degrees. */
  eps: Deg;
}

/** |φ| is clamped just short of the pole so tan φ stays finite. */
const MAX_LAT = 89.9999;

/**
 * Pure ascendant/MC arithmetic from RAMC, obliquity and latitude (degrees).
 * ASC = atan2(cos RAMC, −(sin RAMC cos ε + tan φ sin ε)); MC = atan2(sin RAMC, cos RAMC cos ε).
 */
export function ascMcFromRamc(ramc: Deg, eps: Deg, lat: number): { asc: Deg; mc: Deg } {
  const phi = clamp(lat, -MAX_LAT, MAX_LAT);
  const asc = norm360(atan2d(cosd(ramc), -(sind(ramc) * cosd(eps) + tand(phi) * sind(eps))));
  const mc = norm360(atan2d(sind(ramc), cosd(ramc) * cosd(eps)));
  return { asc, mc };
}

/**
 * Lagna and MC at an instant for a place (lat +N, lon +E), sidereal under ayanāṃśa `ay`.
 * GAST comes from astronomy-engine (ERA-based, IAU 2000B equation of the equinoxes); the true
 * obliquity is the IAU 2006 mean obliquity plus the IAU 2000B Δε — the same frame the planet
 * longitudes are rotated into, so the Lagna and the grahas share one ecliptic.
 */
export function lagna(t: AstroTime, lat: number, lon: number, ay: Deg, eph: Ephemeris = astronomyEngineEphemeris): LagnaResult {
  const gast = eph.greenwichApparentSiderealTime(t);
  const ramc = norm360(gast + lon);
  const eps = eph.trueObliquity(t);
  const { asc, mc } = ascMcFromRamc(ramc, eps, lat);
  return { ascTrop: asc, mcTrop: mc, ascSid: norm360(asc - ay), mcSid: norm360(mc - ay), ramc, eps };
}

export interface BhavaRow {
  house: number; // 1..12
  /** Bhāva sandhi opening the house (midpoint between this madhya and the previous one). */
  startSid: Deg;
  /** Bhāva madhya (the house's mid-point / cusp). */
  madhyaSid: Deg;
  /** Sandhi closing the house. */
  endSid: Deg;
}

/**
 * Bhāva Chalit by Śrīpati: the madhyas of houses 1, 4, 7, 10 are ASC, IC, DSC, MC; the arcs
 * ASC→IC, IC→DSC, DSC→MC, MC→ASC are each trisected for the intermediate madhyas, and every
 * sandhi sits half-way between consecutive madhyas. Shown as a table, never as the chart.
 */
export function bhavaChalit(ascSid: Deg, mcSid: Deg): BhavaRow[] {
  const ic = norm360(mcSid + 180);
  const dsc = norm360(ascSid + 180);
  const anchors: Deg[] = [ascSid, ic, dsc, mcSid];
  const madhya: Deg[] = [];
  for (let q = 0; q < 4; q++) {
    const from = anchors[q] as Deg;
    const to = anchors[(q + 1) % 4] as Deg;
    const arc = norm360(to - from);
    for (let k = 0; k < 3; k++) madhya.push(norm360(from + (arc * k) / 3));
  }
  const rows: BhavaRow[] = [];
  for (let i = 0; i < 12; i++) {
    const m = madhya[i] as Deg;
    const prev = madhya[(i + 11) % 12] as Deg;
    const next = madhya[(i + 1) % 12] as Deg;
    rows.push({
      house: i + 1,
      startSid: norm360(prev + norm360(m - prev) / 2),
      madhyaSid: m,
      endSid: norm360(m + norm360(next - m) / 2),
    });
  }
  return rows;
}

/** The Bhāva Chalit house (1..12) containing a sidereal longitude: [startSid, endSid). */
export function bhavaOf(lonSid: Deg, table: readonly BhavaRow[]): number {
  for (const row of table) {
    const span = norm360(row.endSid - row.startSid);
    if (norm360(lonSid - row.startSid) < span) return row.house;
  }
  return 1;
}

/** Whole-sign house of a sign given the Lagna sign: ((sign − lagnaSign + 12) % 12) + 1. */
export const wholeSignHouse = (sign: number, lagnaSign: number): number => ((((sign - lagnaSign) % 12) + 12) % 12) + 1;
