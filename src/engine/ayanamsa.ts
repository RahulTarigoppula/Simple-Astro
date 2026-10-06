// Lahiri ayanāṃśa, three presets (§6.2). Swiss Ephemeris' Lahiri (nutation-inclusive), its
// nutation-free mean, and the value Drik Panchang prints are three different numbers 19–41″
// apart, so the preset is a first-class input engraved on every chart.
import { norm360, sind } from "./math";
import type { AyanamsaPreset, Deg, Jd } from "./types";

/** deg — SE t0 23°15′00.658″ @ JD 2435553.5, propagated to J2000 with IAU-1976 precession. */
export const J2000_SE_MEAN = 23.857054;
/** deg — empirical fit to drikpanchang.com, +24.3″ above SE-mean. */
export const J2000_DRIK_MEAN = 23.8638;

export const AYANAMSA_PRESETS: readonly AyanamsaPreset[] = ["se-true", "se-mean", "drik-mean"];

/** Colophon labels — part of the output, not a UI decoration. */
export const AYANAMSA_LABEL: Record<AyanamsaPreset, string> = {
  "se-true": "Lahiri (Swiss Ephemeris, true)",
  "se-mean": "Lahiri (Swiss Ephemeris, mean)",
  "drik-mean": "Lahiri (Drik-compatible mean)",
};

/** Julian centuries (TT) from J2000. */
export const centuriesTt = (jdTt: Jd): number => (jdTt - 2451545.0) / 36525;

/** General precession in longitude since J2000, arcsec (IAU 2006 p_A). */
export function precessionArcsec(T: number): number {
  return (
    5028.796195 * T + 1.1054348 * T ** 2 + 0.00007964 * T ** 3 - 0.000023857 * T ** 4 - 0.0000000383 * T ** 5
  );
}

/** Nutation in longitude Δψ, arcsec (Meeus ch. 22 short series, ±0.5″). */
export function nutationLongitudeArcsec(T: number): number {
  const O = norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T ** 2);
  const L = norm360(280.4665 + 36000.7698 * T);
  const Lp = norm360(218.3165 + 481267.8813 * T);
  return -17.2 * sind(O) - 1.32 * sind(2 * L) - 0.23 * sind(2 * Lp) + 0.21 * sind(2 * O);
}

/** Lahiri ayanāṃśa in degrees at `jdTt` under `preset`. Unknown presets throw — never a silent default. */
export function ayanamsa(jdTt: Jd, preset: AyanamsaPreset): Deg {
  const T = centuriesTt(jdTt);
  const pA = precessionArcsec(T);
  switch (preset) {
    case "se-true":
      return J2000_SE_MEAN + (pA + nutationLongitudeArcsec(T)) / 3600;
    case "se-mean":
      return J2000_SE_MEAN + pA / 3600;
    case "drik-mean":
      return J2000_DRIK_MEAN + pA / 3600;
    default:
      // A programming error, not a user state: fail loudly rather than fall back to a default.
      throw new TypeError(`unknown ayanamsa preset: ${String(preset as unknown)}`);
  }
}

/** Ayanāṃśa rate, degrees per day (≈ 50.29″/yr), for converting tropical speeds to sidereal. */
export function ayanamsaRateDegPerDay(jdTt: Jd): number {
  const T = centuriesTt(jdTt);
  const dpA = 5028.796195 + 2 * 1.1054348 * T + 3 * 0.00007964 * T ** 2;
  return dpA / 3600 / 36525;
}

/** (a − b) in arcseconds at `jdTt` — the Drawer dial's tick labels. */
export function ayanamsaDeltaArcsec(jdTt: Jd, a: AyanamsaPreset, b: AyanamsaPreset): number {
  return (ayanamsa(jdTt, a) - ayanamsa(jdTt, b)) * 3600;
}
