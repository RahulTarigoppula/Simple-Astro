// Planetary dignity, re-typed as facts from Bṛhat Parāśara Horā Śāstra (BPHS), ch. 3
// ("Planetary characters and description"). Signs are 0-based: 0 = Meṣa … 11 = Mīna.
import type { Dignity, GrahaId, SignIdx } from "../../engine/types";
import { SIGN_LORD } from "./names";

/**
 * Deep-exaltation points as [sign, degree] (BPHS 3: Sun Meṣa 10°, Moon Vṛṣabha 3°, Mars Makara 28°,
 * Mercury Kanyā 15°, Jupiter Karka 5°, Venus Mīna 27°, Saturn Tulā 20°). Debilitation is the
 * opposite sign at the same degree. The nodes follow the commonly cited BPHS reading
 * (Rāhu Vṛṣabha, Ketu Vṛścika); schools differ, so the degree is nominal.
 */
export const EXALTATION: Record<GrahaId, readonly [SignIdx, number]> = {
  SU: [0, 10],
  MO: [1, 3],
  MA: [9, 28],
  ME: [5, 15],
  JU: [3, 5],
  VE: [11, 27],
  SA: [6, 20],
  RA: [1, 20],
  KE: [7, 20],
};

/** Debilitation sign = exaltation sign + 6. */
export const DEBILITATION: Record<GrahaId, SignIdx> = Object.fromEntries(
  Object.entries(EXALTATION).map(([id, [s]]) => [id, ((s + 6) % 12) as SignIdx]),
) as Record<GrahaId, SignIdx>;

/** Own signs (svakṣetra), BPHS 3. Nodes: Rāhu Kumbha, Ketu Vṛścika (the common BPHS reading). */
export const OWN_SIGNS: Record<GrahaId, readonly SignIdx[]> = {
  SU: [4],
  MO: [3],
  MA: [0, 7],
  ME: [2, 5],
  JU: [8, 11],
  VE: [1, 6],
  SA: [9, 10],
  RA: [10],
  KE: [7],
};

/**
 * Mūlatrikoṇa ranges [sign, fromDeg, toDeg), BPHS 3: Sun Siṃha 0-20, Moon Vṛṣabha 3-30,
 * Mars Meṣa 0-12, Mercury Kanyā 15-20, Jupiter Dhanu 0-10, Venus Tulā 0-15, Saturn Kumbha 0-20.
 * Nodes: Rāhu Mithuna, Ketu Dhanu (whole sign; contested).
 */
export const MOOLATRIKONA: Record<GrahaId, readonly [SignIdx, number, number]> = {
  SU: [4, 0, 20],
  MO: [1, 3, 30],
  MA: [0, 0, 12],
  ME: [5, 15, 20],
  JU: [8, 0, 10],
  VE: [6, 0, 15],
  SA: [10, 0, 20],
  RA: [2, 0, 30],
  KE: [8, 0, 30],
};

export type Relation = "friend" | "neutral" | "enemy";
type Seven = Exclude<GrahaId, "RA" | "KE">;

/**
 * Natural (naisargika) friendship, BPHS 3:
 * - Sun: friends Moon, Mars, Jupiter; neutral Mercury; enemies Venus, Saturn.
 * - Moon: friends Sun, Mercury; neutral Mars, Jupiter, Venus, Saturn; no enemies.
 * - Mars: friends Sun, Moon, Jupiter; neutral Venus, Saturn; enemy Mercury.
 * - Mercury: friends Sun, Venus; neutral Mars, Jupiter, Saturn; enemy Moon.
 * - Jupiter: friends Sun, Moon, Mars; neutral Saturn; enemies Mercury, Venus.
 * - Venus: friends Mercury, Saturn; neutral Mars, Jupiter; enemies Sun, Moon.
 * - Saturn: friends Mercury, Venus; neutral Jupiter; enemies Sun, Moon, Mars.
 */
export const NATURAL_FRIENDSHIP: Record<Seven, Record<Seven, Relation | "self">> = {
  SU: { SU: "self", MO: "friend", MA: "friend", ME: "neutral", JU: "friend", VE: "enemy", SA: "enemy" },
  MO: { SU: "friend", MO: "self", MA: "neutral", ME: "friend", JU: "neutral", VE: "neutral", SA: "neutral" },
  MA: { SU: "friend", MO: "friend", MA: "self", ME: "enemy", JU: "friend", VE: "neutral", SA: "neutral" },
  ME: { SU: "friend", MO: "enemy", MA: "neutral", ME: "self", JU: "neutral", VE: "friend", SA: "neutral" },
  JU: { SU: "friend", MO: "friend", MA: "friend", ME: "enemy", JU: "self", VE: "enemy", SA: "neutral" },
  VE: { SU: "enemy", MO: "enemy", MA: "neutral", ME: "friend", JU: "neutral", VE: "self", SA: "friend" },
  SA: { SU: "enemy", MO: "enemy", MA: "enemy", ME: "friend", JU: "neutral", VE: "friend", SA: "self" },
};

const isSeven = (id: GrahaId): id is Seven => id !== "RA" && id !== "KE";

/** Natural relation of graha `a` towards graha `b` (nodes are treated as neutral). */
export function naturalRelation(a: GrahaId, b: GrahaId): Relation | "self" {
  if (a === b) return "self";
  if (!isSeven(a) || !isSeven(b)) return "neutral";
  return NATURAL_FRIENDSHIP[a][b];
}

/**
 * Dignity of graha `id` at sidereal longitude `lonSid`. Precedence, as BPHS orders the states:
 * exaltation sign → debilitation sign → mūlatrikoṇa range → own sign → the natural relation to
 * the sign's lord. Where a sign carries two states (Moon in Vṛṣabha, Mercury in Kanyā) the degree
 * decides: Moon is exalted 0-3° and mūlatrikoṇa 3-30°; Mercury exalted 0-15°, mūlatrikoṇa 15-20°,
 * own 20-30°.
 */
export function dignityOf(id: GrahaId, lonSid: number): Dignity {
  const sign = Math.floor((((lonSid % 360) + 360) % 360) / 30) as SignIdx;
  const deg = lonSid - Math.floor(lonSid / 30) * 30;
  const [exSign] = EXALTATION[id];
  const [mtSign, mtFrom, mtTo] = MOOLATRIKONA[id];

  if (id === "MO" && sign === 1) return deg < 3 ? "exalted" : "moolatrikona";
  if (id === "ME" && sign === 5) return deg < 15 ? "exalted" : deg < 20 ? "moolatrikona" : "own";
  if (sign === exSign) return "exalted";
  if (sign === DEBILITATION[id]) return "debilitated";
  if (sign === mtSign && deg >= mtFrom && deg < mtTo) return "moolatrikona";
  if (OWN_SIGNS[id].includes(sign)) return "own";
  const lord = SIGN_LORD[sign];
  if (lord === undefined) return "neutral";
  const rel = naturalRelation(id, lord);
  return rel === "self" ? "own" : rel;
}
