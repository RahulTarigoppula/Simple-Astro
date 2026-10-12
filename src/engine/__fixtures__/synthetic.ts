// Synthetic PatriCore builder for rule tests: sign placements in, a complete chart out — no ephemeris.
// Dignity and combustion are derived here with the rule layer's own tables so a fixture only states
// where each graha sits.
import { NAK_LORDS } from "../../data/tables/names";
import { COMBUSTION_ORB, isDebilitated, isExalted, isOwnSign, isSeven, naturalRelation } from "../../data/tables/rulership";
import { houseFrom, signLord } from "../chart-helpers";
import { norm360, signedDelta } from "../math";
import { DEFAULT_PRESET, type Dignity, type Graha, type GrahaId, type Panchang, type PatriCore, PRESET_HASH, type SignIdx } from "../types";

export interface PlacementSpec {
  sign: number;
  deg?: number; // degrees within the sign, default 15
  lat?: number; // ecliptic latitude, default 0
  retro?: boolean;
}

export type Placement = number | [number, number] | PlacementSpec;

export interface SynthSpec {
  lagna: number;
  lagnaDeg?: number;
  /** Every graha but Ketu (always opposite Rāhu). A bare number = that sign at 15°. */
  at: Record<Exclude<GrahaId, "KE">, Placement>;
  profileId?: string;
}

const NAK_SPAN = 360 / 27;
const PADA_SPAN = 360 / 108;

function toSpec(p: Placement): PlacementSpec {
  if (typeof p === "number") return { sign: p };
  if (Array.isArray(p)) return { sign: p[0], deg: p[1] };
  return p;
}

function dignityOf(id: GrahaId, sign: SignIdx): Dignity {
  if (!isSeven(id)) return "neutral";
  if (isExalted(id, sign)) return "exalted";
  if (isDebilitated(id, sign)) return "debilitated";
  if (isOwnSign(id, sign)) return "own";
  const lord = signLord(sign);
  return naturalRelation(id, lord);
}

function graha(id: GrahaId, lon: number, lat: number, retro: boolean, lagna: SignIdx): Graha {
  const lonSidereal = norm360(lon);
  const sign = Math.floor(lonSidereal / 30) as SignIdx;
  const nakshatra = Math.floor(lonSidereal / NAK_SPAN);
  const pada = ((Math.floor(lonSidereal / PADA_SPAN) % 4) + 1) as 1 | 2 | 3 | 4;
  return {
    id,
    lonTropical: norm360(lonSidereal + 24),
    lonSidereal,
    latEcliptic: lat,
    speed: retro ? -0.1 : 1,
    retrograde: retro,
    sign,
    degInSign: lonSidereal - sign * 30,
    nakshatra,
    pada,
    nakshatraLord: NAK_LORDS[nakshatra % 9] ?? "KE",
    house: houseFrom(lagna, sign),
    dignity: dignityOf(id, sign),
    combust: false,
    boundary: null,
  };
}

const EMPTY_PANCHANG: Panchang = {
  tithi: { index: 0, name: "", paksha: "shukla", endMs: 0 },
  vara: { index: 0, name: "" },
  nakshatra: { index: 0, name: "", pada: 1, endMs: 0 },
  yoga: { index: 0, name: "", endMs: 0 },
  karana: { index: 0, name: "", endMs: 0 },
  sunriseMs: 0,
  sunsetMs: 0,
  nextSunriseMs: 0,
  moonriseMs: null,
  moonsetMs: null,
  rahuKaal: [0, 0],
  yamaganda: [0, 0],
  gulika: [0, 0],
  abhijit: null,
  masaAmanta: "",
  masaPurnimanta: "",
  ritu: "",
  ayana: "uttarayana",
  moonIllumination: 0,
  elongation: 0,
};

export function synth(spec: SynthSpec): PatriCore {
  const lagna = (((spec.lagna % 12) + 12) % 12) as SignIdx;
  const lagnaLon = lagna * 30 + (spec.lagnaDeg ?? 15);
  const ids: Array<Exclude<GrahaId, "KE">> = ["SU", "MO", "MA", "ME", "JU", "VE", "SA", "RA"];
  const out = {} as Record<GrahaId, Graha>;
  for (const id of ids) {
    const s = toSpec(spec.at[id]);
    out[id] = graha(id, s.sign * 30 + (s.deg ?? 15), s.lat ?? 0, s.retro ?? id === "RA", lagna);
  }
  out.KE = graha("KE", out.RA.lonSidereal + 180, 0, true, lagna);
  // Combustion by the classical orbs from the Sun.
  for (const id of ids) {
    const orb = COMBUSTION_ORB[id];
    if (!orb) continue;
    const g = out[id];
    const sep = Math.abs(signedDelta(out.SU.lonSidereal, g.lonSidereal));
    g.combust = sep < (g.retrograde ? orb[1] : orb[0]);
  }
  const lagnaNak = Math.floor(lagnaLon / NAK_SPAN);
  return {
    profileId: spec.profileId ?? "synthetic",
    preset: DEFAULT_PRESET,
    presetHash: PRESET_HASH(DEFAULT_PRESET),
    engine: { name: "astronomy-engine", version: "synthetic", ayanamsaArcsec: 0 },
    jdUt: 2451545,
    jdTt: 2451545,
    ayanamsa: 24,
    lagna: {
      lonTropical: norm360(lagnaLon + 24),
      lonSidereal: lagnaLon,
      sign: lagna,
      degInSign: lagnaLon - lagna * 30,
      nakshatra: lagnaNak,
      pada: ((Math.floor(lagnaLon / PADA_SPAN) % 4) + 1) as 1 | 2 | 3 | 4,
      nakshatraLord: NAK_LORDS[lagnaNak % 9] ?? "KE",
      boundary: null,
    },
    mc: { lonSidereal: norm360(lagnaLon + 270), sign: ((lagna + 9) % 12) as SignIdx },
    ramc: 0,
    obliquity: 23.44,
    grahas: out,
    vargas: {},
    dasha: [],
    birthPanchang: EMPTY_PANCHANG,
  };
}

/**
 * The §0.1a reference chart (Rahul, 14 March 1994, 07:25 IST, Bengaluru) re-entered as placements,
 * with the published longitudes; latitudes for Maṅgala and Śani are illustrative (the yuddha test
 * only needs their order). Useful as a realistic smoke fixture for the rule layer.
 */
export function referenceChart(): PatriCore {
  return synth({
    profileId: "rahul-reference",
    lagna: 11,
    lagnaDeg: 15.657,
    at: {
      SU: [10, 29.4811],
      MO: [11, 19.1688],
      MA: { sign: 10, deg: 11.5233, lat: -0.72 },
      ME: [10, 2.4901],
      JU: { sign: 6, deg: 20.603, retro: true },
      VE: [11, 13.1253],
      SA: { sign: 10, deg: 11.5169, lat: -1.38 },
      RA: [7, 3.4956],
    },
  });
}
