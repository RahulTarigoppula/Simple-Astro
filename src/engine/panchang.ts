// Pañcāṅga and the end-time solver (§6.9). Every aṅga is floor(angle / span); every one also
// needs an end instant, which is a monotone root find on a cheap longitude function.
import * as A from "astronomy-engine";
import {
  KARANA_FIXED,
  KARANA_MOVABLE,
  MASA_NAMES,
  NAKSHATRA_NAMES,
  RITU_NAMES,
  TITHI_NAMES,
  VARA_NAMES,
  YOGA_NAMES,
} from "../data/tables/names";
import { ayanamsa } from "./ayanamsa";
import { astroTime } from "./ephemeris";
import { MS_PER_DAY, norm360, signedDelta } from "./math";
import { nakshatraIndexOf, nakshatraOf, signOf } from "./nakshatra";
import { type GeoPoint, hinduDay, moonEvent, observerOf } from "./sunrise";
import type { AyanamsaPreset, Deg, EnginePreset, Panchang } from "./types";

export const AMAVASYA = "Amāvasyā";
const NAK_SPAN = 360 / 27;
const HOUR_MS = 3_600_000;

// ─── pure-angle helpers (no ephemeris) ──────────────────────────────────────

export interface TithiInfo {
  /** 1..30: 1-15 Śukla, 16-30 Kṛṣṇa; 15 Pūrṇimā, 30 Amāvasyā. */
  index: number;
  paksha: "shukla" | "krishna";
  /** "Śukla Dvitīyā", "Pūrṇimā", "Amāvasyā". */
  name: string;
}

export function tithiOf(elongation: Deg): TithiInfo {
  const index = Math.min(30, Math.floor((norm360(elongation) * 30) / 360) + 1);
  const paksha = index <= 15 ? "shukla" : "krishna";
  let name: string;
  if (index === 15) name = TITHI_NAMES[14];
  else if (index === 30) name = AMAVASYA;
  else name = `${paksha === "shukla" ? "Śukla" : "Kṛṣṇa"} ${TITHI_NAMES[(index - 1) % 15] ?? ""}`;
  return { index, paksha, name };
}

export interface KaranaInfo {
  /** 1..60 half-tithis. */
  index: number;
  name: string;
}

/** k = floor(elong / 6) + 1; 1 Kiṃstughna, 2-57 cycle Bava…Viṣṭi ((k − 2) mod 7), 58 Śakuni,
 *  59 Catuṣpāda, 60 Nāga. */
export function karanaOf(elongation: Deg): KaranaInfo {
  const index = Math.min(60, Math.floor((norm360(elongation) * 60) / 360) + 1);
  let name: string;
  if (index === 1) name = KARANA_FIXED.first;
  else if (index >= 58) name = KARANA_FIXED.last[index - 58] ?? "";
  else name = KARANA_MOVABLE[(index - 2) % 7] ?? "";
  return { index, name };
}

export interface YogaInfo {
  /** 1..27. */
  index: number;
  name: string;
}

/** Yoga = floor(((λsun_sid + λmoon_sid) mod 360) / 13°20′) + 1. */
export function yogaOf(sunSid: Deg, moonSid: Deg): YogaInfo {
  const index = Math.min(27, Math.floor((norm360(sunSid + moonSid) * 27) / 360) + 1);
  return { index, name: YOGA_NAMES[index - 1] ?? "" };
}

/** Amānta māsa index (0 = Caitra) from the sidereal Sun sign at the governing new moon:
 *  Sun in Mīna (11) at Amāvasyā → Caitra. */
export const masaIndexFromSunSign = (sunSign: number): number => (sunSign + 1) % 12;

/** Ṛtu by lunar month: Caitra-Vaiśākha Vasanta, …, Māgha-Phālguna Śiśira. */
export const rituOfMasa = (masaIndex: number): string => RITU_NAMES[Math.floor((((masaIndex % 12) + 12) % 12) / 2)] ?? "";

// ─── the solver ─────────────────────────────────────────────────────────────

/**
 * Generic monotone crossing solver: find t in [t0, t1] where angleFn(t) reaches `target`, measured
 * as a signed difference in (−180, 180] so the 360 → 0 wrap never breaks the bracket. Uses the
 * Illinois variant of false position (bracketed, so it cannot escape) and stops when the bracket
 *, or the linearised distance to the root, is under `tolMs`. Typically 4-7 evaluations where
 * plain bisection would need ~19. If [t0, t1] does not bracket the target the window is extended
 * forward (doubling, up to 64×) before giving up and returning the far end.
 */
export function solveCrossing(angleFn: (ms: number) => Deg, target: Deg, t0: number, t1: number, tolMs = 250): number {
  const f = (t: number): number => signedDelta(target, angleFn(t));
  let a = t0;
  let fa = f(a);
  if (fa === 0) return a;
  let b = t1;
  let fb = f(b);
  for (let grow = 0; Math.sign(fb) === Math.sign(fa) && grow < 6; grow++) {
    a = b;
    fa = fb;
    b = b + (b - t0);
    fb = f(b);
  }
  if (fb === 0) return b;
  if (Math.sign(fb) === Math.sign(fa)) return b;
  let side = 0;
  for (let i = 0; i < 100; i++) {
    if (b - a <= tolMs) break;
    let m = (a * fb - b * fa) / (fb - fa);
    if (!(m > a && m < b)) m = (a + b) / 2;
    const fm = f(m);
    if (fm === 0) return m;
    const slope = (fb - fa) / (b - a);
    if (Math.abs(fm / slope) <= tolMs / 2) return m;
    if (Math.sign(fm) === Math.sign(fb)) {
      b = m;
      fb = fm;
      if (side === -1) fa /= 2;
      side = -1;
    } else {
      a = m;
      fa = fm;
      if (side === 1) fb /= 2;
      side = 1;
    }
  }
  return (a + b) / 2;
}

// ─── cheap longitude functions ──────────────────────────────────────────────

interface Lons {
  sunTrop: Deg;
  moonTrop: Deg;
  ay: Deg;
}

function lonsAt(ms: number, preset: AyanamsaPreset): Lons {
  const t = astroTime(ms);
  return {
    sunTrop: A.SunPosition(t).elon,
    moonTrop: A.EclipticGeoMoon(t).lon,
    ay: ayanamsa(t.tt + 2451545.0, preset),
  };
}

const elongationAt = (ms: number): Deg => {
  const t = astroTime(ms);
  return norm360(A.EclipticGeoMoon(t).lon - A.SunPosition(t).elon);
};

const moonSidAt =
  (preset: AyanamsaPreset) =>
  (ms: number): Deg => {
    const t = astroTime(ms);
    return norm360(A.EclipticGeoMoon(t).lon - ayanamsa(t.tt + 2451545.0, preset));
  };

const yogaSumAt =
  (preset: AyanamsaPreset) =>
  (ms: number): Deg => {
    const l = lonsAt(ms, preset);
    return norm360(l.sunTrop + l.moonTrop - 2 * l.ay);
  };

/** Raw aṅga indices at an instant (no end times), for PA-1 style checks and the day ledger. */
export function angasAt(ms: number, preset: AyanamsaPreset) {
  const l = lonsAt(ms, preset);
  const elong = norm360(l.moonTrop - l.sunTrop);
  const sunSid = norm360(l.sunTrop - l.ay);
  const moonSid = norm360(l.moonTrop - l.ay);
  return {
    elongation: elong,
    sunSid,
    moonSid,
    tithi: tithiOf(elong),
    karana: karanaOf(elong),
    yoga: yogaOf(sunSid, moonSid),
    nakshatra: nakshatraOf(moonSid),
  };
}

// ─── day divisions ──────────────────────────────────────────────────────────

const RAHU = [8, 2, 7, 5, 6, 4, 3] as const;
const YAMA = [5, 4, 3, 2, 1, 7, 6] as const;
const GULIKA = [7, 6, 5, 4, 3, 2, 1] as const;

/** The n-th (1-based) eighth of the daylight. */
export function daySlot(n: number, riseMs: number, setMs: number): [number, number] {
  const p = (setMs - riseMs) / 8;
  return [riseMs + (n - 1) * p, riseMs + n * p];
}

/** Weekday (0 = Sunday) of an instant on the local mean solar clock at longitude `lon`. Sunrise is
 *  always hours from local midnight, so this needs no time zone. */
export function localWeekday(ms: number, lon: number): 0 | 1 | 2 | 3 | 4 | 5 | 6 {
  const days = Math.floor((ms + lon * 240_000) / MS_PER_DAY); // 4 min per degree
  return ((((days + 4) % 7) + 7) % 7) as 0 | 1 | 2 | 3 | 4 | 5 | 6; // 1970-01-01 was a Thursday
}

// ─── the pañcāṅga ───────────────────────────────────────────────────────────

/**
 * The pañcāṅga at an instant and place. Vāra and the day divisions belong to the governing
 * sunrise (the latest sunrise at or before the instant); each aṅga carries its end instant.
 */
export function computePanchang(atUtcMs: number, place: GeoPoint, preset: EnginePreset): Panchang {
  const obs = observerOf(place);
  const day = hinduDay(obs, atUtcMs, preset.sunrise);
  const ap = preset.ayanamsa;
  const now = angasAt(atUtcMs, ap);

  // End instants, all solved on the engine's own apparent longitudes so an end instant and the
  // index it closes can never disagree. (A.SearchMoonPhase uses the Sun's geometric longitude and
  // lands ~45 s away from the apparent-elongation crossing.)
  // Spans: tithi 12°, karaṇa 6°, nakṣatra and yoga 13°20′; the windows are the
  // longest each can last (elongation ≥ ~10°/day, Moon ≥ ~11.7°/day, sum ≥ ~12.7°/day), and the
  // solver extends them if needed.
  const tithiEnd = solveCrossing(elongationAt, now.tithi.index * 12, atUtcMs, atUtcMs + 30 * HOUR_MS);
  const karanaEnd = solveCrossing(elongationAt, now.karana.index * 6, atUtcMs, atUtcMs + 15 * HOUR_MS);
  const nakEnd = solveCrossing(moonSidAt(ap), (now.nakshatra.index + 1) * NAK_SPAN, atUtcMs, atUtcMs + 28 * HOUR_MS);
  const yogaEnd = solveCrossing(yogaSumAt(ap), now.yoga.index * NAK_SPAN, atUtcMs, atUtcMs + 26 * HOUR_MS);

  const varaIdx = localWeekday(day.sunriseMs, place.lon);
  const daylight = day.sunsetMs - day.sunriseMs;
  const noon = day.sunriseMs + daylight / 2;
  const abhijit: [number, number] | null = varaIdx === 3 ? null : [noon - daylight / 30, noon + daylight / 30];

  const window = (day.nextSunriseMs - day.sunriseMs) / MS_PER_DAY;
  const moonriseMs = moonEvent(obs, 1, day.sunriseMs, window);
  const moonsetMs = moonEvent(obs, -1, day.sunriseMs, window);

  // Māsa: the sidereal Sun's sign at the governing (most recent) new moon names the Amānta month;
  // the Pūrṇimānta month runs a fortnight ahead in the Kṛṣṇa pakṣa.
  const nm = A.SearchMoonPhase(0, astroTime(atUtcMs), -32);
  const nmMs = nm ? (nm.ut + 2451545.0 - 2440587.5) * MS_PER_DAY : atUtcMs;
  const nmLons = lonsAt(nmMs, ap);
  const masaIdx = masaIndexFromSunSign(signOf(nmLons.sunTrop - nmLons.ay));
  const purnimantaIdx = now.tithi.paksha === "shukla" ? masaIdx : (masaIdx + 1) % 12;

  // Ayana by the sidereal Sun: Uttarāyaṇa from Makara saṅkrānti to Karka saṅkrānti.
  const sunSign = signOf(now.sunSid);
  const ayana = sunSign >= 9 || sunSign <= 2 ? "uttarayana" : "dakshinayana";

  const out: Panchang = {
    tithi: { index: now.tithi.index, name: now.tithi.name, paksha: now.tithi.paksha, endMs: tithiEnd },
    vara: { index: varaIdx, name: VARA_NAMES[varaIdx] },
    nakshatra: {
      index: now.nakshatra.index,
      name: NAKSHATRA_NAMES[nakshatraIndexOf(now.moonSid)] ?? "",
      pada: now.nakshatra.pada,
      endMs: nakEnd,
    },
    yoga: { index: now.yoga.index, name: now.yoga.name, endMs: yogaEnd },
    karana: { index: now.karana.index, name: now.karana.name, endMs: karanaEnd },
    sunriseMs: day.sunriseMs,
    sunsetMs: day.sunsetMs,
    nextSunriseMs: day.nextSunriseMs,
    moonriseMs,
    moonsetMs,
    rahuKaal: daySlot(RAHU[varaIdx], day.sunriseMs, day.sunsetMs),
    yamaganda: daySlot(YAMA[varaIdx], day.sunriseMs, day.sunsetMs),
    gulika: daySlot(GULIKA[varaIdx], day.sunriseMs, day.sunsetMs),
    abhijit,
    masaAmanta: MASA_NAMES[masaIdx] ?? "",
    masaPurnimanta: MASA_NAMES[purnimantaIdx] ?? "",
    ritu: rituOfMasa(masaIdx),
    ayana,
    moonIllumination: A.Illumination(A.Body.Moon, astroTime(atUtcMs)).phase_fraction,
    elongation: now.elongation,
  };
  if (day.polar) out.polar = day.polar;
  return out;
}
