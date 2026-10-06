// What each koota row's sheet says. Descriptions of the classical rules only — the scores themselves
// come from engine/ashtakoota.ts and are never computed here.
import type { KootaId, KootaResult, MilanResult } from "../../engine/types";

export const RULE_TEXT: Record<KootaId, string> = {
  varna:
    "Each Moon sign belongs to one of four varṇas — Brāhmaṇa, Kṣatriya, Vaiśya, Śūdra. The single point is given when the first leaf's varṇa ranks at or above the second's.",
  vashya:
    "Each Moon sign falls in one of five classes — quadruped, human, water-born, wild, insect. A table of the two classes gives 0, ½, 1 or 2. This is the one table that varies from school to school.",
  tara:
    "Count the nakṣatras from one Moon to the other, both ways, and reduce by nines. The 3rd, 5th and 7th tārās (Vipat, Pratyari, Vadha) are unkind; each kind direction earns 1.5.",
  yoni: "Each nakṣatra carries an animal yoni. The same animal earns 4, friendly 3, neutral 2, inimical 1, and the seven sworn pairs 0.",
  maitri:
    "The lords of the two Moon signs are read for natural friendship, each way round: friend and friend 5, friend and neutral 4, neutral and neutral 3, friend and enemy 1, neutral and enemy ½, enemy and enemy 0.",
  gana: "Each nakṣatra is Deva, Manuṣya or Rākṣasa in temperament; a fixed table of the two gaṇas gives 0 to 6. A zero is counted as Gaṇa doṣa.",
  bhakoot:
    "The distance between the two Moon signs, counted both ways. The 2/12, 5/9 and 6/8 axes are Bhakūṭa doṣa and earn 0; every other axis earns 7. The classical exception — the two sign lords identical or mutual friends — is applied only when the Drawer setting asks for it.",
  nadi: "The nakṣatras run through three nāḍīs in turn — Ādi, Madhya, Antya. Different nāḍīs earn 8; the same nāḍī is Nāḍī doṣa and earns 0. Its classical exceptions are recorded here and never applied on their own.",
};

const EXCEPTION_TEXT: Record<string, string> = {
  "bhakoot-same-lord": "both Moon signs share one lord",
  "bhakoot-lords-friends": "the two sign lords are mutual friends",
  "nadi-same-nakshatra-different-pada": "the same nakṣatra in different padas",
  "nadi-same-rashi-different-nakshatra": "the same rāśi with different nakṣatras",
  "nadi-lords-friends": "the two sign lords are friends",
};

export const exceptionText = (rule: string): string => EXCEPTION_TEXT[rule] ?? rule;

/** "Nāḍī: both Antya (Revatī, Rohiṇī)" → "both Antya (Revatī, Rohiṇī)". */
export function becauseBody(k: KootaResult): string {
  const i = k.because.indexOf(": ");
  return i >= 0 ? k.because.slice(i + 2) : k.because;
}

/** The one line beneath a doṣa row. */
export function doshaLine(k: KootaResult): string {
  return `Tradition says: ${becauseBody(k)} — counted as ${k.name} doṣa.`;
}

export const BAND_LABEL: Record<MilanResult["band"], string> = {
  "not-recommended": "not recommended",
  acceptable: "acceptable",
  "very-good": "very good",
  excellent: "excellent",
};

export const fmtPts = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));
