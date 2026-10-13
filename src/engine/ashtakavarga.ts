// Aṣṭakavarga (BPHS ch. 66): the Bhinnāṣṭakavarga of the seven grahas from eight contributors
// (the seven + Lagna), the Sarvāṣṭakavarga per sign, the optional Trikoṇa-śodhana (BPHS ch. 67),
// and calm readings. Ekādhipatya-śodhana is deliberately omitted: its occupancy cases are read
// differently across the translations, so it is not implemented rather than guessed.
import { AV_CONTRIBUTORS, AV_GRAHAS, type AvContributor, type AvGraha, BINDU_PLACES } from "../data/tables/ashtakavarga";
import { GRAHA_NAMES, ORDINAL, SIGN_NAMES } from "../data/tables/names";
import { CITE } from "./citations";
import type { Citation, PatriCore, SignIdx } from "./types";

export type { AvGraha } from "../data/tables/ashtakavarga";
export { AV_GRAHAS } from "../data/tables/ashtakavarga";

export interface Ashtakavarga {
  /** Bhinnāṣṭakavarga: bav[g][signIdx] = bindus (0..8), signIdx 0 = Meṣa. */
  bav: Record<AvGraha, number[]>;
  /** Sarvāṣṭakavarga by sign, 0 = Meṣa. Always sums to 337. */
  sav: number[];
  /** The SAV rotated so index 0 is house 1 (the Lagna sign). */
  byHouse: number[];
  lagnaSign: SignIdx;
}

export interface AvReading {
  id: "sav-strong" | "sav-effort" | "sav-even" | "transit";
  text: string;
  citation: Citation;
  houses?: number[];
}

/** Bindus a contributor at `from` gives to `to` in graha g's BAV. */
const gives = (g: AvGraha, c: AvContributor, from: number, to: number): boolean => BINDU_PLACES[g][c].includes(((to - from + 12) % 12) + 1);

/** Pure core: positions of the eight contributors (signs) → BAV and SAV. */
export function ashtakavargaFromSigns(pos: Record<AvContributor, number>): Omit<Ashtakavarga, "byHouse" | "lagnaSign"> {
  const bav = {} as Record<AvGraha, number[]>;
  const sav = new Array<number>(12).fill(0);
  for (const g of AV_GRAHAS) {
    const row = new Array<number>(12).fill(0);
    for (let s = 0; s < 12; s++) {
      for (const c of AV_CONTRIBUTORS) if (gives(g, c, pos[c], s)) row[s] = (row[s] ?? 0) + 1;
      sav[s] = (sav[s] ?? 0) + (row[s] ?? 0);
    }
    bav[g] = row;
  }
  return { bav, sav };
}

export function ashtakavarga(core: PatriCore): Ashtakavarga {
  const G = core.grahas;
  const lagnaSign = core.lagna.sign;
  const { bav, sav } = ashtakavargaFromSigns({
    SU: G.SU.sign,
    MO: G.MO.sign,
    MA: G.MA.sign,
    ME: G.ME.sign,
    JU: G.JU.sign,
    VE: G.VE.sign,
    SA: G.SA.sign,
    LA: lagnaSign,
  });
  const byHouse = Array.from({ length: 12 }, (_, h) => sav[(lagnaSign + h) % 12] ?? 0);
  return { bav, sav, byHouse, lagnaSign };
}

/** Bindus in graha g's own BAV for a sign — the gochar (transit) lookup. */
export function binduFor(av: Ashtakavarga, graha: AvGraha, sign: number): number {
  return av.bav[graha][((sign % 12) + 12) % 12] ?? 0;
}

/**
 * Trikoṇa-śodhana (BPHS ch. 67): in each trinal group (signs s, s+4, s+8) the least count is taken
 * from all three — so a zero leaves the group unchanged and three equal counts all become zero.
 */
export function trikonaShodhana(row: readonly number[]): number[] {
  const out = row.slice(0, 12);
  for (let s = 0; s < 4; s++) {
    const idx = [s, s + 4, s + 8];
    const min = Math.min(...idx.map((i) => row[i] ?? 0));
    for (const i of idx) out[i] = (row[i] ?? 0) - min;
  }
  return out;
}

// ─── readings ────────────────────────────────────────────────────────────────
export const SAV_STRONG = 28;
export const SAV_EFFORT = 25;
export const TRANSIT_SMOOTH = 4;

/** House themes in the calm register used across the app. */
export const HOUSE_THEME = [
  "self and bearing",
  "speech and family",
  "courage and siblings",
  "home and inner ease",
  "learning and creativity",
  "service and daily discipline",
  "partnership",
  "change and hidden matters",
  "teachers and dharma",
  "work and standing",
  "gains and friendships",
  "retreat and letting go",
] as const;

const houseList = (hs: number[]): string => {
  const parts = hs.map((h) => `the ${ORDINAL(h)} (${HOUSE_THEME[h - 1] ?? ""})`);
  if (parts.length <= 1) return parts.join("");
  return `${parts.slice(0, -1).join(", ")} and ${parts[parts.length - 1]}`;
};

/** SAV readings by house: ≥ 28 supportive, < 25 asking more effort. */
export function savReadings(byHouse: readonly number[]): AvReading[] {
  const strong: number[] = [];
  const effort: number[] = [];
  byHouse.forEach((n, i) => {
    if (n >= SAV_STRONG) strong.push(i + 1);
    else if (n < SAV_EFFORT) effort.push(i + 1);
  });
  const out: AvReading[] = [];
  if (strong.length > 0) {
    out.push({
      id: "sav-strong",
      houses: strong,
      citation: CITE.sav28,
      text: `Tradition says houses holding ${SAV_STRONG} or more bindus are where a chart finds steadier support. Here: ${houseList(strong)}.`,
    });
  }
  if (effort.length > 0) {
    out.push({
      id: "sav-effort",
      houses: effort,
      citation: CITE.sav28,
      text: `Tradition says houses below ${SAV_EFFORT} bindus ask for more patient effort. Here: ${houseList(effort)}.`,
    });
  } else {
    out.push({
      id: "sav-even",
      houses: [],
      citation: CITE.sav28,
      text: `Tradition says that when no house falls below ${SAV_EFFORT} bindus, the chart's load is read as evenly carried.`,
    });
  }
  return out;
}

/** A graha transiting a sign with ≥ 4 bindus in its own BAV is read as moving more smoothly. */
export function transitReading(av: Ashtakavarga, graha: AvGraha, sign: number): AvReading & { bindus: number; smooth: boolean } {
  const bindus = binduFor(av, graha, sign);
  const smooth = bindus >= TRANSIT_SMOOTH;
  const where = SIGN_NAMES[((sign % 12) + 12) % 12] ?? "";
  return {
    id: "transit",
    bindus,
    smooth,
    citation: CITE.phaladipika24,
    text: smooth
      ? `Tradition says ${GRAHA_NAMES[graha]} moving through ${where}, which holds ${bindus} of 8 bindus in its own Aṣṭakavarga, passes more smoothly.`
      : `Tradition says ${GRAHA_NAMES[graha]} moving through ${where}, which holds ${bindus} of 8 bindus in its own Aṣṭakavarga, asks for more care and patience.`,
  };
}

/** Signs where a graha's own BAV holds ≥ 4 bindus (the smoother transit signs). */
export function smoothSigns(av: Ashtakavarga, graha: AvGraha): SignIdx[] {
  const out: SignIdx[] = [];
  av.bav[graha].forEach((n, s) => {
    if (n >= TRANSIT_SMOOTH) out.push(s as SignIdx);
  });
  return out;
}

/** The 2–3 sentences the section prints: the SAV readings plus Śani's smoother transit signs. */
export function ashtakavargaReadings(av: Ashtakavarga): AvReading[] {
  const out = savReadings(av.byHouse);
  const sa = smoothSigns(av, "SA");
  if (sa.length > 0) {
    const names = sa.map((s) => SIGN_NAMES[s]);
    const list = names.length > 1 ? `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}` : (names[0] ?? "");
    out.push({
      id: "transit",
      citation: CITE.phaladipika24,
      text: `Tradition says ${GRAHA_NAMES.SA}'s slow transits pass more smoothly through signs where its own Aṣṭakavarga holds ${TRANSIT_SMOOTH} or more bindus. Here: ${list}.`,
    });
  }
  return out;
}
