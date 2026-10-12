// Gochara — transits read against the natal chart (Phaladīpikā ch. 26), Śani's Sāḍe-sātī and its
// shorter cousins, the day's Tārā-bala and Candra-bala, and the running daśā. Pure: every function
// takes explicit instants; nothing here reads the clock.
import { TARA_NAMES, TARA_UNKIND } from "../data/tables/koota";
import { ayanamsa, ayanamsaRateDegPerDay } from "./ayanamsa";
import { houseFrom, toSign } from "./chart-helpers";
import { CITE } from "./citations";
import { currentDasha } from "./dasha";
import { astronomyEngineEphemeris, astroTime, type Ephemeris, PLANET_IDS } from "./ephemeris";
import { MS_PER_DAY, norm360 } from "./math";
import { degInSignOf, nakshatraOf, signOf } from "./nakshatra";
import { ketuOf, MEAN_NODE_SPEED, meanNode, trueNode, trueNodeSpeed } from "./nodes";
import { type Citation, type DashaNode, type Deg, type EnginePreset, GRAHA_IDS, type GrahaId, type Patri, type SignIdx } from "./types";

// ─── 1. positions at an instant ───────────────────────────────────────────────

export interface TransitGraha {
  id: GrahaId;
  lonSidereal: Deg;
  /** deg/day, sidereal; negative = retrograde. */
  speed: number;
  /** Same convention as the natal chart: the nodes are always drawn retrograde. */
  retrograde: boolean;
  sign: SignIdx;
  degInSign: number;
  nakshatra: number; // 0..26
  pada: 1 | 2 | 3 | 4;
}

/** The nine grahas at `atMs`, in exactly the frame `computePatri` uses (apparent, true ecliptic of
 *  date, minus the preset's ayanāṃśa; nodes per `preset.node`). */
export function transitsAt(atMs: number, preset: EnginePreset, eph: Ephemeris = astronomyEngineEphemeris): Record<GrahaId, TransitGraha> {
  const t = astroTime(atMs);
  const jdTt = t.tt + 2451545.0;
  const ay = ayanamsa(jdTt, preset.ayanamsa);
  const ayRate = ayanamsaRateDegPerDay(jdTt);
  const raw = {} as Record<GrahaId, { lon: Deg; speed: number }>;
  for (const id of PLANET_IDS) raw[id] = { lon: eph.position(id, t).lon, speed: eph.speed(id, t) };
  const rahu = preset.node === "true" ? { lon: trueNode(t), speed: trueNodeSpeed(t) } : { lon: meanNode(jdTt), speed: MEAN_NODE_SPEED };
  raw.RA = rahu;
  raw.KE = { lon: ketuOf(rahu.lon), speed: rahu.speed };

  const out = {} as Record<GrahaId, TransitGraha>;
  for (const id of GRAHA_IDS) out[id] = toTransit(id, raw[id], ay, ayRate);
  return out;
}

function toTransit(id: GrahaId, r: { lon: Deg; speed: number }, ay: Deg, ayRate: number): TransitGraha {
  const lonSidereal = norm360(r.lon - ay);
  const speed = r.speed - ayRate;
  const n = nakshatraOf(lonSidereal);
  return {
    id,
    lonSidereal,
    speed,
    retrograde: id === "RA" || id === "KE" ? true : speed < 0,
    sign: signOf(lonSidereal),
    degInSign: degInSignOf(lonSidereal),
    nakshatra: n.index,
    pada: n.pada,
  };
}

/** The Moon alone at `atMs` — identical to `transitsAt(atMs, preset).MO`, without the other eight. */
export function moonTransitAt(atMs: number, preset: EnginePreset, eph: Ephemeris = astronomyEngineEphemeris): TransitGraha {
  const t = astroTime(atMs);
  const jdTt = t.tt + 2451545.0;
  return toTransit(
    "MO",
    { lon: eph.position("MO", t).lon, speed: eph.speed("MO", t) },
    ayanamsa(jdTt, preset.ayanamsa),
    ayanamsaRateDegPerDay(jdTt),
  );
}

// ─── 2. the gochara report ────────────────────────────────────────────────────

/** Favourable houses counted from the natal Moon's sign (Phaladīpikā ch. 26). */
export const GOCHAR_FAVOURABLE: Record<GrahaId, readonly number[]> = {
  SU: [3, 6, 10, 11],
  MO: [1, 3, 6, 7, 10, 11],
  MA: [3, 6, 11],
  ME: [2, 4, 6, 8, 10, 11],
  JU: [2, 5, 7, 9, 11],
  VE: [1, 2, 3, 4, 5, 8, 9, 11, 12],
  SA: [3, 6, 11],
  RA: [3, 6, 11],
  KE: [3, 6, 11],
};

/**
 * Vedha (obstruction) pairs: favourable house → the house which, when occupied by another graha,
 * cancels it (Phaladīpikā ch. 26). Given for the seven planets only; the nodes neither give nor
 * receive vedha in this table, and Sūrya–Śani and Candra–Budha never obstruct one another.
 */
export const VEDHA: Partial<Record<GrahaId, Readonly<Record<number, number>>>> = {
  SU: { 3: 9, 6: 12, 10: 4, 11: 5 },
  MO: { 1: 5, 3: 9, 6: 12, 7: 2, 10: 4, 11: 8 },
  MA: { 3: 12, 6: 9, 11: 5 },
  ME: { 2: 5, 4: 3, 6: 9, 8: 1, 10: 8, 11: 12 },
  JU: { 2: 12, 5: 4, 7: 3, 9: 10, 11: 8 },
  VE: { 1: 8, 2: 7, 3: 1, 4: 10, 5: 9, 8: 5, 9: 11, 11: 6, 12: 3 },
  SA: { 3: 12, 6: 9, 11: 5 },
};

const VEDHA_EXEMPT: ReadonlyArray<readonly [GrahaId, GrahaId]> = [
  ["SU", "SA"],
  ["MO", "ME"],
];

const exempt = (a: GrahaId, b: GrahaId): boolean => VEDHA_EXEMPT.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

export interface GocharEntry {
  id: GrahaId;
  transit: TransitGraha;
  /** House of the transit sign counted from the natal Moon's sign (Candra-lagna). */
  houseFromMoon: number;
  /** House of the transit sign counted from the natal Lagna. */
  houseFromLagna: number;
  /** The house is in the classical favourable list for this graha. */
  favourable: boolean;
  /** For a favourable transit of one of the seven: the vedha house and who sits there. */
  vedha: { house: number; by: GrahaId[] } | null;
  /** favourable and not obstructed. */
  effective: boolean;
}

export interface GocharReport {
  atMs: number;
  moonSign: SignIdx;
  lagnaSign: SignIdx;
  entries: GocharEntry[];
  citation: Citation;
}

/** Is the house favourable from the Moon for this graha? */
export const isGocharFavourable = (id: GrahaId, houseFromMoon: number): boolean => GOCHAR_FAVOURABLE[id].includes(houseFromMoon);

/** Grahas obstructing a favourable transit of `id` in `house` (empty when none or no vedha pair). */
export function vedhaBy(id: GrahaId, house: number, housesFromMoon: Partial<Record<GrahaId, number>>): GrahaId[] | null {
  const v = VEDHA[id]?.[house];
  if (v == null) return null;
  const by: GrahaId[] = [];
  for (const other of PLANET_IDS) {
    if (other === id || exempt(id, other)) continue;
    if (housesFromMoon[other] === v) by.push(other);
  }
  return by;
}

export function gocharReport(patri: Patri, atMs: number, preset: EnginePreset = patri.preset): GocharReport {
  const tr = transitsAt(atMs, preset);
  const moonSign = patri.grahas.MO.sign;
  const lagnaSign = patri.lagna.sign;
  const fromMoon = {} as Record<GrahaId, number>;
  for (const id of GRAHA_IDS) fromMoon[id] = houseFrom(moonSign, tr[id].sign);
  const entries = GRAHA_IDS.map((id): GocharEntry => {
    const h = fromMoon[id];
    const favourable = isGocharFavourable(id, h);
    const by = favourable ? vedhaBy(id, h, fromMoon) : null;
    const vedha = by != null ? { house: VEDHA[id]?.[h] ?? 0, by } : null;
    return {
      id,
      transit: tr[id],
      houseFromMoon: h,
      houseFromLagna: houseFrom(lagnaSign, tr[id].sign),
      favourable,
      vedha,
      effective: favourable && (vedha == null || vedha.by.length === 0),
    };
  });
  return { atMs, moonSign, lagnaSign, entries, citation: CITE.phaladipika26 };
}

// ─── 3. Śani's spells: Sāḍe-sātī, Kaṇṭaka, Aṣṭama ─────────────────────────────

export type SaturnPhase = "rising" | "peak" | "setting" | "kantaka" | "ashtama";

/** Houses from the natal Moon for each phase. */
export const PHASE_HOUSE: Record<SaturnPhase, number> = { rising: 12, peak: 1, setting: 2, kantaka: 4, ashtama: 8 };

export interface SignInterval {
  sign: SignIdx;
  startMs: number;
  endMs: number;
  /** True when the interval is cut by the search window rather than by an ingress/egress. */
  startClipped: boolean;
  endClipped: boolean;
}

export interface SaturnInterval extends SignInterval {
  phase: SaturnPhase;
}

export interface SaturnSpell {
  kind: "sade-sati" | "kantaka" | "ashtama";
  startMs: number;
  endMs: number;
  startClipped: boolean;
  endClipped: boolean;
  /** Raw sign intervals in time order — a retrograde re-entry shows as a repeated phase. */
  intervals: SaturnInterval[];
  /** Per phase, its intervals merged where they touch. */
  phases: Partial<Record<SaturnPhase, Array<[number, number]>>>;
  citation: Citation;
}

export interface SadeSatiResult {
  moonSign: SignIdx;
  fromMs: number;
  toMs: number;
  /** Every Saturn sign interval in the window, in time order. */
  saturnSigns: SignInterval[];
  spells: SaturnSpell[];
}

const COARSE_STEP_MS = 10 * MS_PER_DAY;
const FINE_STEP_MS = MS_PER_DAY;
const NEAR_EDGE_DEG = 0.15;
const ROOT_TOL_MS = 30_000;
/** Intervals of one kind closer than this are one spell (retrograde loops; the cycle is ~29.5 y). */
const SPELL_GAP_MS = 500 * MS_PER_DAY;

const saturnSidAt =
  (preset: EnginePreset, eph: Ephemeris) =>
  (ms: number): Deg => {
    const t = astroTime(ms);
    return norm360(eph.tropicalLongitude("SA", t) - ayanamsa(t.tt + 2451545.0, preset.ayanamsa));
  };

const edgeDistance = (lon: Deg): number => {
  const d = lon % 30;
  return Math.min(d, 30 - d);
};

/** Bisection for the instant `signOf(lon)` changes between a (sign sa) and b. */
function bisectSign(lon: (ms: number) => Deg, a: number, b: number, sa: SignIdx): number {
  let lo = a;
  let hi = b;
  while (hi - lo > ROOT_TOL_MS) {
    const m = (lo + hi) / 2;
    if (signOf(lon(m)) === sa) lo = m;
    else hi = m;
  }
  return (lo + hi) / 2;
}

/**
 * Saturn's sidereal sign intervals over [fromMs, toMs]: coarse 10-day steps, 1-day steps where
 * Saturn lingers within 0.15° of a sign edge (a station there could cross and re-cross inside one
 * coarse step), then bisection to 30 s at every change.
 */
export function saturnSignIntervals(
  fromMs: number,
  toMs: number,
  preset: EnginePreset,
  eph: Ephemeris = astronomyEngineEphemeris,
): SignInterval[] {
  const lon = saturnSidAt(preset, eph);
  const out: SignInterval[] = [];
  let curStart = fromMs;
  let a = fromMs;
  let la = lon(a);
  let sa = signOf(la);
  let curSign = sa;
  const change = (lo: number, slo: SignIdx, hi: number, shi: SignIdx): void => {
    const at = bisectSign(lon, lo, hi, slo);
    out.push({ sign: curSign, startMs: curStart, endMs: at, startClipped: curStart === fromMs, endClipped: false });
    curStart = at;
    curSign = shi;
  };
  while (a < toMs) {
    const b = Math.min(a + COARSE_STEP_MS, toMs);
    const lb = lon(b);
    const sb = signOf(lb);
    if (sa !== sb || edgeDistance(la) < NEAR_EDGE_DEG || edgeDistance(lb) < NEAR_EDGE_DEG) {
      // walk the step a day at a time so a station near the edge cannot hide a double crossing
      let x = a;
      let sx = sa;
      while (x < b) {
        const y = Math.min(x + FINE_STEP_MS, b);
        const sy = y === b ? sb : signOf(lon(y));
        if (sy !== sx) change(x, sx, y, sy);
        x = y;
        sx = sy;
      }
    }
    a = b;
    la = lb;
    sa = sb;
  }
  out.push({ sign: curSign, startMs: curStart, endMs: toMs, startClipped: curStart === fromMs, endClipped: true });
  return out;
}

function mergeTouching(xs: Array<[number, number]>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const [s, e] of [...xs].sort((p, q) => p[0] - q[0])) {
    const last = out[out.length - 1];
    if (last && s <= last[1]) last[1] = Math.max(last[1], e);
    else out.push([s, e]);
  }
  return out;
}

function phaseOf(house: number): SaturnPhase | null {
  switch (house) {
    case 12:
      return "rising";
    case 1:
      return "peak";
    case 2:
      return "setting";
    case 4:
      return "kantaka";
    case 8:
      return "ashtama";
    default:
      return null;
  }
}

const kindOf = (p: SaturnPhase): SaturnSpell["kind"] => (p === "kantaka" ? "kantaka" : p === "ashtama" ? "ashtama" : "sade-sati");

/** Group phase intervals of one kind into spells (gaps < 500 days are retrograde loops). */
function spellsOf(kind: SaturnSpell["kind"], ivs: SaturnInterval[]): SaturnSpell[] {
  const out: SaturnSpell[] = [];
  let cur: SaturnInterval[] = [];
  const flush = (): void => {
    const first = cur[0];
    const last = cur[cur.length - 1];
    if (!first || !last) return;
    const phases: SaturnSpell["phases"] = {};
    for (const iv of cur) {
      const list = phases[iv.phase] ?? [];
      list.push([iv.startMs, iv.endMs]);
      phases[iv.phase] = list;
    }
    for (const k of Object.keys(phases) as SaturnPhase[]) phases[k] = mergeTouching(phases[k] ?? []);
    out.push({
      kind,
      startMs: first.startMs,
      endMs: last.endMs,
      startClipped: first.startClipped,
      endClipped: last.endClipped,
      intervals: cur,
      phases,
      citation: kind === "sade-sati" ? CITE.sadeSati : CITE.kantakaAshtama,
    });
    cur = [];
  };
  for (const iv of ivs) {
    const last = cur[cur.length - 1];
    if (last && iv.startMs - last.endMs > SPELL_GAP_MS) flush();
    cur.push(iv);
  }
  flush();
  return out;
}

/** Śani's Sāḍe-sātī (12th, 1st, 2nd from the natal Moon) and Kaṇṭaka/Aṣṭama (4th, 8th) spells. */
export function sadeSati(
  patri: Patri,
  fromMs: number,
  toMs: number,
  preset: EnginePreset = patri.preset,
  eph: Ephemeris = astronomyEngineEphemeris,
): SadeSatiResult {
  const moonSign = patri.grahas.MO.sign;
  const saturnSigns = saturnSignIntervals(fromMs, toMs, preset, eph);
  const byKind: Record<SaturnSpell["kind"], SaturnInterval[]> = { "sade-sati": [], kantaka: [], ashtama: [] };
  for (const s of saturnSigns) {
    const phase = phaseOf(houseFrom(moonSign, s.sign));
    if (phase) byKind[kindOf(phase)].push({ ...s, phase });
  }
  const spells = [
    ...spellsOf("sade-sati", byKind["sade-sati"]),
    ...spellsOf("kantaka", byKind.kantaka),
    ...spellsOf("ashtama", byKind.ashtama),
  ].sort((p, q) => p.startMs - q.startMs);
  return { moonSign, fromMs, toMs, saturnSigns, spells };
}

/** The sign in the given house from the natal Moon (12 → rising sign of the Sāḍe-sātī, …). */
export const signFromMoon = (moonSign: SignIdx, house: number): SignIdx => toSign(moonSign + house - 1);

// ─── 4. the day's personal strengths ──────────────────────────────────────────

export interface TaraBala {
  /** 1..9. */
  tara: number;
  name: string;
  /** Which round of nine (1..3) the count falls in. */
  round: 1 | 2 | 3;
  /** Janma (1) is mixed; Vipat, Pratyari, Vadha (3, 5, 7) unkind; the rest kind. */
  tone: "kind" | "unkind" | "mixed";
  citation: Citation;
}

/** Tārā-bala: count from the birth nakṣatra to the transit Moon's, inclusive, reduced by nine. */
export function taraBala(natalMoonNak: number, transitMoonNak: number): TaraBala {
  const count = ((((transitMoonNak - natalMoonNak) % 27) + 27) % 27) + 1; // 1..27
  const tara = ((count - 1) % 9) + 1;
  const round = (Math.floor((count - 1) / 9) + 1) as 1 | 2 | 3;
  const tone = tara === 1 ? "mixed" : TARA_UNKIND.includes(tara) ? "unkind" : "kind";
  return { tara, name: TARA_NAMES[tara - 1] ?? "", round, tone, citation: CITE.taraBala };
}

export const CHANDRA_BALA_HOUSES: readonly number[] = [1, 3, 6, 7, 10, 11];

export interface ChandraBala {
  house: number;
  favourable: boolean;
  citation: Citation;
}

/** Candra-bala: the transit Moon's house from the natal Moon sign; 1, 3, 6, 7, 10, 11 support. */
export function chandraBala(natalMoonSign: SignIdx, transitMoonSign: SignIdx): ChandraBala {
  const house = houseFrom(natalMoonSign, transitMoonSign);
  return { house, favourable: CHANDRA_BALA_HOUSES.includes(house), citation: CITE.chandraBala };
}

// ─── 5. the running daśā ──────────────────────────────────────────────────────

export interface DashaLevelSummary {
  lord: GrahaId;
  startMs: number;
  endMs: number;
  /** Elapsed fraction of this period at `atMs`, [0, 1). */
  fraction: number;
}

export interface DashaSummary {
  atMs: number;
  md: DashaLevelSummary;
  ad: DashaLevelSummary;
  pd: DashaLevelSummary;
  /** The next instant any level changes (the pratyantar's end). */
  nextChangeMs: number;
  citation: Citation;
}

const level = (n: DashaNode, atMs: number): DashaLevelSummary => ({
  lord: n.lord,
  startMs: n.startMs,
  endMs: n.endMs,
  fraction: (atMs - n.startMs) / (n.endMs - n.startMs),
});

/** MD · AD · PD running at `atMs`, or null outside the 120-year tree. */
export function currentDashaSummary(patri: Patri, atMs: number): DashaSummary | null {
  const c = currentDasha(patri.dasha, atMs);
  if (!c) return null;
  return {
    atMs,
    md: level(c.md, atMs),
    ad: level(c.ad, atMs),
    pd: level(c.pd, atMs),
    nextChangeMs: c.pd.endMs,
    citation: CITE.bphs46,
  };
}
