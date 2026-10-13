// What each koota row's sheet says. Descriptions of the classical rules only — the scores themselves
// come from engine/ashtakoota.ts and are never computed here.
import { NAKSHATRA_NAMES, SIGN_NAMES } from "../../data/tables/names";
import { ganaParihara } from "../../engine/porutham";
import type { AshtakootaSchool, KootaId, KootaResult, ManglikStatus, MilanResult } from "../../engine/types";

export const RULE_TEXT: Record<KootaId, string> = {
  varna:
    "Each Moon sign belongs to one of four varṇas — Brāhmaṇa, Kṣatriya, Vaiśya, Śūdra. The single point is given when the first leaf's varṇa ranks at or above the second's. Schools differ on the earth and air signs (Drawer: Aṣṭakūṭa school).",
  vashya:
    "Each Moon sign falls in one of five classes — quadruped, human, water-born, wild, insect. A table of the two classes gives 0, ½, 1 or 2. This table varies most from school to school (Drawer: Aṣṭakūṭa school).",
  tara: "Count the nakṣatras from one Moon to the other, both ways, and reduce by nines. The 3rd, 5th and 7th tārās (Vipat, Pratyari, Vadha) are unkind; each kind direction earns 1.5.",
  yoni: "Each nakṣatra carries an animal yoni. The same animal earns 4, friendly 3, neutral 2, inimical 1, and the seven sworn pairs 0. Schools differ on Aśva × Mṛga (friendly or inimical).",
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

/** The Aṣṭakūṭa school, as named in the Drawer, the colophon and the copied summary. */
export const SCHOOL_LABEL: Record<AshtakootaSchool, string> = {
  "north-common": "North Indian (common)",
  pyjhora: "PyJHora · saravali",
};

/** What the school decides, for the colophon. */
export const SCHOOL_NOTE: Record<AshtakootaSchool, string> = {
  "north-common": "the almanac tables most families compare against — earth signs Vaiśya, air Śūdra; Aśva × Mṛga friendly",
  pyjhora: "the saravali.de tables used by PyJHora — earth signs Śūdra, air Vaiśya; Aśva × Mṛga inimical",
};

export const BAND_LABEL: Record<MilanResult["band"], string> = {
  "not-recommended": "not recommended",
  acceptable: "acceptable",
  "very-good": "very good",
  excellent: "excellent",
};

export const fmtPts = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

/** One line per koota: what the tradition weighs in it. Shown as "Tradition weighs …". */
export const WEIGHS: Record<KootaId, string> = {
  varna: "the bent of work and outlook each nature leans to — the lightest of the eight",
  vashya: "mutual regard — which of the two is drawn to the other",
  tara: "the kindness of the two birth stars toward each other, the tone of shared days",
  yoni: "instinctive nature and closeness",
  maitri: "friendship of mind, read through the two Moon-sign lords",
  gana: "temperament — how a Deva, Manuṣya or Rākṣasa nature meets the other",
  bhakoot: "the ease of the shared household course, from the two Moon signs",
  nadi: "the constitution (prakṛti) the two share — the heaviest of the eight",
};

/** The kootas that carry a classical exception. */
export const HAS_EXCEPTION: ReadonlySet<KootaId> = new Set<KootaId>(["gana", "bhakoot", "nadi"]);

export interface ExceptionLine {
  text: string;
  source: string | null;
}

/**
 * Whether a classical exception applies to this pair, from engine data only: Bhakūṭa and Nāḍī carry
 * `cancellation` from kootas(); Gaṇa's parihāra comes from ganaParihara(). Null for the other kootas.
 */
export function exceptionLine(k: KootaResult, ks: readonly KootaResult[]): ExceptionLine | null {
  if (!HAS_EXCEPTION.has(k.id)) return null;
  const none = { text: "No doṣa here, so no exception is needed.", source: null };
  if (k.id === "gana") {
    const g = ganaParihara(ks);
    if (!g) return none;
    return {
      text: g.holds
        ? `The classical exception holds for this pair — ${g.because}. Recorded, not applied: the score stands.`
        : `The classical exception does not hold for this pair — ${g.because}.`,
      source: `${g.citation.text}, ${g.citation.ref}`,
    };
  }
  if (k.cancellation) {
    const c = k.cancellation;
    return {
      text: `The classical exception holds for this pair — ${exceptionText(c.rule)}. ${c.applied ? "Applied (Drawer setting)." : "Recorded, not applied."}`,
      source: `${c.citation.text}, ${c.citation.ref}`,
    };
  }
  if (!k.dosha) return none;
  return { text: "None of the classical exceptions holds for this pair.", source: null };
}

export interface SummaryInput {
  result: MilanResult;
  first: { name: string; moon: { nak: number; pada: number; sign: number } | null };
  second: { name: string; moon: { nak: number; pada: number; sign: number } | null };
  manglikLabel: (m: ManglikStatus) => string;
  disclaimer: string;
}

/** The plain-text summary for "Copy summary". Nothing is computed here; it reads milan()'s result. */
export function summaryText({ result: r, first, second, manglikLabel, disclaimer }: SummaryInput): string {
  const moonText = (m: SummaryInput["first"]["moon"]): string =>
    m ? `Moon in ${NAKSHATRA_NAMES[m.nak] ?? m.nak} pada ${m.pada}, ${SIGN_NAMES[m.sign] ?? m.sign}` : "Moon not cast";
  const doshas = r.kootas.filter((k) => k.dosha);
  const lines = [
    `Guna Milan — ${first.name} and ${second.name}`,
    `First leaf: ${first.name} — ${moonText(first.moon)}; ${manglikLabel(r.manglik.a)}`,
    `Second leaf: ${second.name} — ${moonText(second.moon)}; ${manglikLabel(r.manglik.b)}`,
    `Aṣṭakūṭa: ${fmtPts(r.total)} / 36 — ${BAND_LABEL[r.band]} (${SCHOOL_LABEL[r.ashtakootaSchool ?? "pyjhora"]} tables)`,
    ...r.kootas.map((k) => `  ${k.name}: ${fmtPts(k.score)} / ${k.max}${k.dosha ? " (doṣa)" : ""}`),
    `Doṣas: ${doshas.length ? doshas.map((k) => `${k.name} — ${becauseBody(k)}`).join("; ") : "none"}`,
  ];
  if (r.porutham && r.porutham.length > 0) {
    const tied = r.porutham.filter((p) => p.pass);
    const open = r.porutham.filter((p) => !p.pass);
    lines.push(
      `Ten Porutham: ${tied.length} / ${r.porutham.length} tied — ${tied.map((p) => p.name).join(", ") || "none"}${
        open.length ? `; open: ${open.map((p) => p.name).join(", ")}` : ""
      }`,
    );
  }
  lines.push("", disclaimer, "Computed on this device by Vyom.");
  return lines.join("\n");
}
