// Sign rulership, exaltation and natural (naisargika) friendship, classical facts, re-typed by hand.
// Sources: BPHS ch. 3 (graha guṇa-svarūpa: exaltation/debilitation signs, natural friendship),
// BPHS ch. 4 (rāśi lords). These tables serve the yoga and Guna Milan rules; the astronomy core's
// own dignity table (dignity.ts) is independent and owned elsewhere.
import type { GrahaId, SignIdx } from "../../engine/types";

/** The seven visible grahas, in weekday order. Rāhu/Ketu are excluded from sign rulership here. */
export type SevenId = "SU" | "MO" | "MA" | "ME" | "JU" | "VE" | "SA";
export const SEVEN: readonly SevenId[] = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"];

/** The five tārā-grahas (star-planets): the luminaries and the nodes excluded. */
export const TARA_GRAHAS: readonly SevenId[] = ["MA", "ME", "JU", "VE", "SA"];

/** Signs owned by each graha (0 = Meṣa). */
export const OWN_SIGNS: Record<SevenId, readonly SignIdx[]> = {
  SU: [4],
  MO: [3],
  MA: [0, 7],
  ME: [2, 5],
  JU: [8, 11],
  VE: [1, 6],
  SA: [9, 10],
};

/** Exaltation sign of each graha (BPHS ch. 3). Debilitation is the seventh from it. */
export const EXALTATION_SIGN: Record<SevenId, SignIdx> = {
  SU: 0, // Meṣa
  MO: 1, // Vṛṣabha
  MA: 9, // Makara
  ME: 5, // Kanyā
  JU: 3, // Karka
  VE: 11, // Mīna
  SA: 6, // Tulā
};

export const DEBILITATION_SIGN: Record<SevenId, SignIdx> = {
  SU: 6,
  MO: 7,
  MA: 3,
  ME: 11,
  JU: 9,
  VE: 5,
  SA: 0,
};

export type NaturalRelation = "friend" | "neutral" | "enemy";

/** Naisargika maitrī (BPHS ch. 3): how graha X regards graha Y. Unlisted = neutral. */
const FRIENDS: Record<SevenId, readonly SevenId[]> = {
  SU: ["MO", "MA", "JU"],
  MO: ["SU", "ME"],
  MA: ["SU", "MO", "JU"],
  ME: ["SU", "VE"],
  JU: ["SU", "MO", "MA"],
  VE: ["ME", "SA"],
  SA: ["ME", "VE"],
};
const ENEMIES: Record<SevenId, readonly SevenId[]> = {
  SU: ["VE", "SA"],
  MO: [],
  MA: ["ME"],
  ME: ["MO"],
  JU: ["ME", "VE"],
  VE: ["SU", "MO"],
  SA: ["SU", "MO", "MA"],
};

export function naturalRelation(from: SevenId, to: SevenId): NaturalRelation {
  if (FRIENDS[from].includes(to)) return "friend";
  if (ENEMIES[from].includes(to)) return "enemy";
  return "neutral";
}

export function isSeven(g: GrahaId): g is SevenId {
  return g !== "RA" && g !== "KE";
}

export const isOwnSign = (g: SevenId, s: SignIdx): boolean => OWN_SIGNS[g].includes(s);
export const isExalted = (g: SevenId, s: SignIdx): boolean => EXALTATION_SIGN[g] === s;
export const isDebilitated = (g: SevenId, s: SignIdx): boolean => DEBILITATION_SIGN[g] === s;

/** Natural benefics and malefics as used by the Amalā / Adhi / Vesi family (waxing Moon left out). */
export const NATURAL_BENEFICS: readonly GrahaId[] = ["ME", "JU", "VE"];
export const NATURAL_MALEFICS: readonly GrahaId[] = ["SU", "MA", "SA", "RA", "KE"];

/**
 * Special (whole-sign) aspects, counted inclusively from the aspecting graha's sign:
 * every graha aspects the 7th; Maṅgala also the 4th and 8th; Guru the 5th and 9th; Śani the 3rd and 10th.
 * The nodes are given no aspect here (the schools disagree). BPHS ch. 26.
 */
export const ASPECT_HOUSES: Record<GrahaId, readonly number[]> = {
  SU: [7],
  MO: [7],
  MA: [4, 7, 8],
  ME: [7],
  JU: [5, 7, 9],
  VE: [7],
  SA: [3, 7, 10],
  RA: [],
  KE: [],
};

/** Classical combustion orbs in degrees from the Sun (Sūrya Siddhānta ch. 9); [direct, retrograde]. */
export const COMBUSTION_ORB: Partial<Record<GrahaId, readonly [number, number]>> = {
  MO: [12, 12],
  MA: [17, 17],
  ME: [14, 12],
  JU: [11, 11],
  VE: [10, 8],
  SA: [15, 15],
};
