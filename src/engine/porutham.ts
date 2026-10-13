// Daśa Porutham — the ten agreements of South Indian (Tamil) marriage matching, read from the two
// Moons' nakshatra and sign. Each porutham either holds (tied) or does not (open); there are no
// points. Rajju and Vedha are the two the tradition weighs heaviest.
//
// Rules re-typed by hand as facts from the common Tamil almanac (pañcāṅgam) practice; where schools
// differ, ONE reading is followed and named in the rule text. Sides are positional, as in
// ashtakoota.ts: `a` is the vara (boy) column and `b` the kanyā (girl) column. The classical counts
// run FROM the kanyā's nakshatra (or sign) TO the vara's. Nothing here reads a profile's gender.
//
// Also here: the Gaṇa parihāra of the Aṣṭakūṭa (the one koota exception ashtakoota.ts does not
// record), so the Milan screen can state from engine data whether it holds for a pair.
import { GANA_BY_NAK, GANA_LABEL, YONI_BY_NAK, YONI_LABEL, YONI_SWORN } from "../data/tables/koota";
import { NAKSHATRA_NAMES } from "../data/tables/names";
import { naturalRelation } from "../data/tables/rulership";
import type { MoonPlacement } from "./ashtakoota";
import { gName, houseFrom, ord, signLord, signName } from "./chart-helpers";
import { CITE } from "./citations";
import type { Citation, KootaResult } from "./types";

export type PoruthamId = "dina" | "gana" | "mahendra" | "stri-dirgha" | "yoni" | "rashi" | "rashyadhipati" | "vashya" | "rajju" | "vedha";

/** One porutham. Assignable to `MilanResult["porutham"]` elements (id, name, pass, note). */
export interface PoruthamResult {
  id: PoruthamId;
  name: string;
  nameDev: string;
  pass: boolean;
  /** The `because` sentence (kept as `note` for the MilanResult shape). */
  note: string;
  because: string;
  /** The classical rule, stated once. */
  rule: string;
  /** What the tradition weighs in this agreement — one line. */
  weighs: string;
  /** Rajju and Vedha: the two the tradition weighs heaviest. */
  weighty: boolean;
  citation: Citation;
}

export const PORUTHAM_ORDER: readonly PoruthamId[] = [
  "dina",
  "gana",
  "mahendra",
  "stri-dirgha",
  "yoni",
  "rashi",
  "rashyadhipati",
  "vashya",
  "rajju",
  "vedha",
];

const META: Record<PoruthamId, { name: string; nameDev: string; rule: string; weighs: string }> = {
  dina: {
    name: "Dina",
    nameDev: "दिन",
    rule: "Count the nakṣatras from the second person's to the first person's, inclusively, and divide by nine. A remainder of 2, 4, 6, 8 or 0 ties the knot; 1, 3, 5 or 7 leaves it open.",
    weighs: "the day-to-day accord of the two lives",
  },
  gana: {
    name: "Gaṇa",
    nameDev: "गण",
    rule: "Each nakṣatra is Deva, Manuṣya or Rākṣasa in temperament. The same gaṇa, or Deva with Manuṣya, ties the knot; a Rākṣasa nakṣatra beside a Deva or Manuṣya one leaves it open.",
    weighs: "temperament: how the two natures meet",
  },
  mahendra: {
    name: "Mahendra",
    nameDev: "माहेन्द्र",
    rule: "Count from the second person's nakṣatra to the first person's. The 4th, 7th, 10th, 13th, 16th, 19th, 22nd and 25th tie the knot.",
    weighs: "the growth and continuity of the household",
  },
  "stri-dirgha": {
    name: "Strī-dīrgha",
    nameDev: "स्त्रीदीर्घ",
    rule: "Count from the second person's nakṣatra to the first person's. Beyond the 13th the knot is tied; at the 13th or nearer it stays open.",
    weighs: "the second person's ease and standing through the long years",
  },
  yoni: {
    name: "Yoni",
    nameDev: "योनि",
    rule: "Each nakṣatra carries an animal yoni. The knot stays open only for the seven sworn pairs: horse and buffalo, elephant and lion, sheep and monkey, serpent and mongoose, dog and deer, cat and rat, cow and tiger.",
    weighs: "instinctive nature and closeness",
  },
  rashi: {
    name: "Rāśi",
    nameDev: "राशि",
    rule: "Count the signs from the second person's Moon sign to the first person's. The same sign, the 7th, and the 9th to the 12th tie the knot; the 2nd to the 6th and the 8th leave it open. School followed: the 6/8 pair is read as open whichever way it falls.",
    weighs: "the harmony of the two Moon signs",
  },
  rashyadhipati: {
    name: "Rāśyādhipati",
    nameDev: "राश्यधिपति",
    rule: "The lords of the two Moon signs are read for natural friendship, each way round. One lord for both, or no enmity either way, ties the knot; enmity from either side leaves it open.",
    weighs: "the friendship of the two sign lords",
  },
  vashya: {
    name: "Vaśya",
    nameDev: "वश्य",
    rule: "Each sign holds certain signs under its sway. Meṣa: Siṃha, Vṛścika. Vṛṣabha: Karka, Tulā. Mithuna: Kanyā. Karka: Vṛścika, Dhanu. Siṃha: Tulā. Kanyā: Mithuna, Mīna. Tulā: Kanyā, Makara. Vṛścika: Karka. Dhanu: Mīna. Makara: Meṣa, Kumbha. Kumbha: Meṣa. Mīna: Makara. The knot is tied when either Moon sign holds the other.",
    weighs: "mutual regard and attraction",
  },
  rajju: {
    name: "Rajju",
    nameDev: "रज्जु",
    rule: "The nakṣatras fall on five cords of the body (Pāda the feet, Kaṭi the waist, Nābhi the navel, Kaṇṭha the neck, Śiras the head), rising and falling through each run of nine. Two nakṣatras on the same cord leave the knot open.",
    weighs: "the endurance of the bond",
  },
  vedha: {
    name: "Vedha",
    nameDev: "वेध",
    rule: "Certain nakṣatras pierce one another: Aśvinī-Jyeṣṭhā, Bharaṇī-Anurādhā, Kṛttikā-Viśākhā, Rohiṇī-Svātī, Ārdrā-Śravaṇa, Punarvasu-Uttara Āṣāḍhā, Puṣya-Pūrva Āṣāḍhā, Āśleṣā-Mūla, Maghā-Revatī, Pūrva Phalgunī-Uttara Bhādrapadā, Uttara Phalgunī-Pūrva Bhādrapadā, Hasta-Śatabhiṣā, and Mṛgaśīrṣa, Citrā and Dhaniṣṭhā with each other. Such a pair leaves the knot open.",
    weighs: "mutual obstruction: friction the pair would carry",
  },
};

// ─── tables ──────────────────────────────────────────────────────────────────
/** Dina: remainders (count mod 9) that tie the knot. */
export const DINA_GOOD_REMAINDERS: readonly number[] = [2, 4, 6, 8, 0];
/** Mahendra: the counts that tie the knot. */
export const MAHENDRA_COUNTS: readonly number[] = [4, 7, 10, 13, 16, 19, 22, 25];
/** Strī-dīrgha: the count must exceed this. */
export const STRI_DIRGHA_BEYOND = 13;
/** Rāśi: sign counts (second person's sign → first person's) that tie the knot. */
export const RASHI_GOOD_COUNTS: readonly number[] = [1, 7, 9, 10, 11, 12];

/** Vaśya: the signs each sign holds under its sway (0 = Meṣa). */
export const VASHYA_SIGNS: readonly (readonly number[])[] = [
  [4, 7], // Meṣa — Siṃha, Vṛścika
  [3, 6], // Vṛṣabha — Karka, Tulā
  [5], // Mithuna — Kanyā
  [7, 8], // Karka — Vṛścika, Dhanu
  [6], // Siṃha — Tulā
  [2, 11], // Kanyā — Mithuna, Mīna
  [5, 9], // Tulā — Kanyā, Makara
  [3], // Vṛścika — Karka
  [11], // Dhanu — Mīna
  [0, 10], // Makara — Meṣa, Kumbha
  [0], // Kumbha — Meṣa
  [9], // Mīna — Makara
];

export type Rajju = "pada" | "kati" | "nabhi" | "kantha" | "shiras";
export const RAJJU_LABEL: Record<Rajju, string> = {
  pada: "Pāda (feet)",
  kati: "Kaṭi (waist)",
  nabhi: "Nābhi (navel)",
  kantha: "Kaṇṭha (neck)",
  shiras: "Śiras (head)",
};
/** Rajju rises and falls through each run of nine nakshatras: `RAJJU_CYCLE[nak % 9]`. */
export const RAJJU_CYCLE: readonly Rajju[] = ["pada", "kati", "nabhi", "kantha", "shiras", "kantha", "nabhi", "kati", "pada"];

/** Vedha pairs (Aśvinī = 0). Mṛgaśīrṣa, Citrā and Dhaniṣṭhā pierce each other. */
export const VEDHA_PAIRS: ReadonlyArray<readonly [number, number]> = [
  [0, 17],
  [1, 16],
  [2, 15],
  [3, 14],
  [5, 21],
  [6, 20],
  [7, 19],
  [8, 18],
  [9, 26],
  [10, 25],
  [11, 24],
  [12, 23],
  [4, 13],
  [4, 22],
  [13, 22],
];

// ─── helpers ─────────────────────────────────────────────────────────────────
const nakName = (n: number): string => NAKSHATRA_NAMES[n] ?? String(n);

/** Inclusive nakshatra count from `from` to `to`, 1..27. */
export function nakCount(from: number, to: number): number {
  return ((to - from + 27) % 27) + 1;
}

export const rajjuOf = (nak: number): Rajju => RAJJU_CYCLE[nak % 9] ?? "pada";

export function isVedha(x: number, y: number): boolean {
  return VEDHA_PAIRS.some(([p, q]) => (p === x && q === y) || (p === y && q === x));
}

const mk = (id: PoruthamId, pass: boolean, because: string): PoruthamResult => {
  const m = META[id];
  return {
    id,
    name: m.name,
    nameDev: m.nameDev,
    pass,
    note: because,
    because,
    rule: m.rule,
    weighs: m.weighs,
    weighty: id === "rajju" || id === "vedha",
    citation: CITE.porutham,
  };
};

/**
 * The ten poruthams for two Moons, in the traditional order. `a` = vara column (first leaf),
 * `b` = kanyā column (second leaf); counts run from `b` to `a`.
 */
export function poruthams(a: MoonPlacement, b: MoonPlacement): PoruthamResult[] {
  const from = nakName(b.nak);
  const to = nakName(a.nak);
  const n = nakCount(b.nak, a.nak);
  const counted = `counted from ${from} to ${to} is the ${ord(n)} nakṣatra`;

  // 1 Dina
  const rem = n % 9;
  const dinaPass = DINA_GOOD_REMAINDERS.includes(rem);
  const dina = mk(
    "dina",
    dinaPass,
    `${cap(counted)}; by nines it leaves ${rem}${rem === 0 ? " (a full nine)" : ""}, ${dinaPass ? "a kind remainder" : "an unkind remainder"}.`,
  );

  // 2 Gaṇa
  const ga = GANA_BY_NAK[a.nak] ?? "deva";
  const gb = GANA_BY_NAK[b.nak] ?? "deva";
  const ganaPass = ga === gb || (ga !== "rakshasa" && gb !== "rakshasa");
  const gana = mk(
    "gana",
    ganaPass,
    ga === gb
      ? `${to} and ${from} are both ${GANA_LABEL[ga]}.`
      : `${to} is ${GANA_LABEL[ga]} and ${from} is ${GANA_LABEL[gb]}${ganaPass ? "" : ", a Rākṣasa nakṣatra beside another gaṇa"}.`,
  );

  // 3 Mahendra
  const mahPass = MAHENDRA_COUNTS.includes(n);
  const mahendra = mk("mahendra", mahPass, `${cap(counted)}, ${mahPass ? "one of" : "not one of"} the Mahendra counts.`);

  // 4 Strī-dīrgha
  const sdPass = n > STRI_DIRGHA_BEYOND;
  const striDirgha = mk("stri-dirgha", sdPass, `${cap(counted)}, ${sdPass ? "beyond" : "not beyond"} the 13th.`);

  // 5 Yoni
  const ya = YONI_BY_NAK[a.nak] ?? "horse";
  const yb = YONI_BY_NAK[b.nak] ?? "horse";
  const sworn = YONI_SWORN.some(([x, y]) => (x === ya && y === yb) || (x === yb && y === ya));
  const yoni = mk(
    "yoni",
    !sworn,
    ya === yb
      ? `${to} and ${from} share the ${YONI_LABEL[ya]} yoni.`
      : `${to} is ${YONI_LABEL[ya]} and ${from} is ${YONI_LABEL[yb]}${sworn ? ", a sworn pair" : ", not a sworn pair"}.`,
  );

  // 6 Rāśi
  const r = houseFrom(b.sign, a.sign);
  const rashiPass = RASHI_GOOD_COUNTS.includes(r);
  const rashi = mk(
    "rashi",
    rashiPass,
    r === 1
      ? `Both Moons are in ${signName(a.sign)}.`
      : `Counted from ${signName(b.sign)} to ${signName(a.sign)} is the ${ord(r)} sign${rashiPass ? "" : ", one of the open counts"}.`,
  );

  // 7 Rāśyādhipati
  const la = signLord(a.sign);
  const lb = signLord(b.sign);
  const ab = naturalRelation(la, lb);
  const ba = naturalRelation(lb, la);
  const lordsPass = la === lb || (ab !== "enemy" && ba !== "enemy");
  const rashyadhipati = mk(
    "rashyadhipati",
    lordsPass,
    la === lb
      ? `Both Moon signs are ruled by ${gName(la)}.`
      : `${gName(la)} regards ${gName(lb)} as ${ab}; ${gName(lb)} regards ${gName(la)} as ${ba}.`,
  );

  // 8 Vaśya
  const aHoldsB = VASHYA_SIGNS[a.sign]?.includes(b.sign) ?? false;
  const bHoldsA = VASHYA_SIGNS[b.sign]?.includes(a.sign) ?? false;
  const vashya = mk(
    "vashya",
    aHoldsB || bHoldsA,
    aHoldsB && bHoldsA
      ? `${signName(a.sign)} and ${signName(b.sign)} hold each other.`
      : aHoldsB
        ? `${signName(a.sign)} holds ${signName(b.sign)}.`
        : bHoldsA
          ? `${signName(b.sign)} holds ${signName(a.sign)}.`
          : `Neither ${signName(a.sign)} nor ${signName(b.sign)} holds the other.`,
  );

  // 9 Rajju
  const ra = rajjuOf(a.nak);
  const rb = rajjuOf(b.nak);
  const rajju = mk(
    "rajju",
    ra !== rb,
    ra === rb
      ? `${to} and ${from} lie on the same cord, ${RAJJU_LABEL[ra]}.`
      : `${to} lies on ${RAJJU_LABEL[ra]} and ${from} on ${RAJJU_LABEL[rb]}: different cords.`,
  );

  // 10 Vedha
  const vedhaHit = isVedha(a.nak, b.nak);
  const vedha = mk("vedha", !vedhaHit, vedhaHit ? `${to} and ${from} pierce each other.` : `${to} and ${from} are not a piercing pair.`);

  return [dina, gana, mahendra, striDirgha, yoni, rashi, rashyadhipati, vashya, rajju, vedha];
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Narrow a `MilanResult["porutham"]` element to the full engine result. */
export function isPoruthamResult(x: { id: string; name: string; pass: boolean; note: string }): x is PoruthamResult {
  return "rule" in x && "because" in x && "citation" in x && "weighty" in x;
}

// ─── the Gaṇa parihāra (Aṣṭakūṭa) ──────────────────────────────────────────────
export interface GanaParihara {
  /** True when one of the classical conditions holds for this pair. Never changes the score. */
  holds: boolean;
  rule: "gana-lords-friends" | "gana-bhakoot-clean" | null;
  because: string;
  citation: Citation;
}

/**
 * Gaṇa doṣa is eased, by the later commentaries, when the two Moon-sign lords are one graha or
 * mutual friends (Graha Maitrī at its full 5), or when Bhakūṭa is free of doṣa. Returns null when
 * Gaṇa is not a doṣa. Recorded only — the score is never changed.
 */
export function ganaParihara(ks: readonly KootaResult[]): GanaParihara | null {
  const gana = ks.find((k) => k.id === "gana");
  if (!gana?.dosha) return null;
  const maitri = ks.find((k) => k.id === "maitri");
  const bhakoot = ks.find((k) => k.id === "bhakoot");
  if (maitri && maitri.score >= 5) {
    return {
      holds: true,
      rule: "gana-lords-friends",
      because: "the two Moon-sign lords are one graha or mutual friends",
      citation: CITE.ganaParihara,
    };
  }
  if (bhakoot && !bhakoot.dosha && !bhakoot.cancellation) {
    return { holds: true, rule: "gana-bhakoot-clean", because: "Bhakūṭa is free of doṣa", citation: CITE.ganaParihara };
  }
  return {
    holds: false,
    rule: null,
    because: "the sign lords are not mutual friends and Bhakūṭa carries a doṣa",
    citation: CITE.ganaParihara,
  };
}
