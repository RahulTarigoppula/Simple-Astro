// Guna Milan — Aṣṭakūṭa (IMPLEMENTATION-PROMPT §6.11). Eight kootas summing to 36, from the two
// Moons' nakshatra, pada and sign. Tables: src/data/tables/koota.ts (school named per table).
//
// Sides are positional: `a` is read in the vara (boy) column of the classical tables and `b` in the
// kanyā (girl) column. Nothing here reads a profile's gender.
//
// School: Varṇa, the Vaśya table and Yoni Aśva × Mṛga come in two schools (opts.school, default
// "north-common"; see koota.ts). Everything else is shared.
//
// Oracle status (see ashtakoota.oracle.test.ts, run with school "pyjhora"): Varṇa, Vaśya table, Yoni,
// Graha Maitrī, Gaṇa and Nāḍī agree with PyJHora's all_nak_pad_boy_girl.csv cell for cell. Three PyJHora defects are NOT
// reproduced, each modelled exactly in the oracle test:
//   1. Tārā — PyJHora awards 1.5 per direction whose tārā IS Vipat/Pratyari/Vadha (inverted), so its
//      Tārā equals 3 − the classical score. Vyom awards points for the kind tārās.
//   2. Bhakūṭa — PyJHora scores Karka (a) × Kumbha (b) as 7; it is a 6/8 axis (doṣa, 0) like every
//      other 6/8 pair, including its own mirror Kumbha × Karka.
//   3. Vaśya class — PyJHora splits Dhanu and Makara by pada number (1–2 vs 3–4 in every nakshatra)
//      instead of at 15°; Vyom uses the Moon's degree (or the pada's midpoint when only the pada is
//      known).
import {
  BHAKOOT_DOSHA_DISTANCES,
  GANA,
  GANA_BY_NAK,
  GANA_LABEL,
  MAITRI_POINTS,
  NADI_CYCLE,
  NADI_LABEL,
  TARA_NAMES,
  TARA_UNKIND,
  VARNA_BY_SIGN,
  VARNA_LABEL,
  VARNA_RANK,
  VASHYA,
  VASHYA_LABEL,
  vashyaClass,
  YONI_BY_NAK,
  YONI_LABEL,
  YONI_POINTS,
  yoniRelation,
} from "../data/tables/koota";
import { NAKSHATRA_NAMES } from "../data/tables/names";
import { naturalRelation, type SevenId } from "../data/tables/rulership";
import { gName, houseFrom, ord, signLord, signName } from "./chart-helpers";
import { CITE } from "./citations";
import { manglikStatus } from "./manglik";
import { poruthams } from "./porutham";
import type { AshtakootaSchool, KootaId, KootaResult, ManglikStatus, MilanResult, PatriCore, Profile, ProfileId, SignIdx } from "./types";

export interface MoonPlacement {
  nak: number; // 0..26, Aśvinī = 0
  pada: 1 | 2 | 3 | 4;
  sign: SignIdx;
  /** Degrees within the sign; resolves the Dhanu/Makara Vaśya split exactly. Optional. */
  deg?: number;
}

export interface AshtakootaOptions {
  /** Apply the classical Bhakūṭa cancellation (sign lords identical or mutual friends). Default off. */
  bhakootCancellation?: boolean;
  /** Which tables to use where the schools differ. Default "north-common" (as DEFAULT_SETTINGS). */
  school?: AshtakootaSchool;
}

export const DEFAULT_ASHTAKOOTA_SCHOOL: AshtakootaSchool = "north-common";

export type AshtakootaResult = Omit<MilanResult, "manglik">;

export const KOOTA_ORDER: readonly KootaId[] = ["varna", "vashya", "tara", "yoni", "maitri", "gana", "bhakoot", "nadi"];

const META: Record<KootaId, { name: string; nameDev: string; max: KootaResult["max"] }> = {
  varna: { name: "Varṇa", nameDev: "वर्ण", max: 1 },
  vashya: { name: "Vaśya", nameDev: "वश्य", max: 2 },
  tara: { name: "Tārā", nameDev: "तारा", max: 3 },
  yoni: { name: "Yoni", nameDev: "योनि", max: 4 },
  maitri: { name: "Graha Maitrī", nameDev: "ग्रह मैत्री", max: 5 },
  gana: { name: "Gaṇa", nameDev: "गण", max: 6 },
  bhakoot: { name: "Bhakūṭa", nameDev: "भकूट", max: 7 },
  nadi: { name: "Nāḍī", nameDev: "नाड़ी", max: 8 },
};

/** The sign a nakshatra-pada lies in: 9 padas per sign, none straddling a sign edge. */
export function signOfPada(nak: number, pada: number): SignIdx {
  return Math.floor((nak * 4 + pada - 1) / 9) as SignIdx;
}

/** Midpoint of a pada, in degrees within its sign. */
export function padaMidDeg(nak: number, pada: number): number {
  const idx = nak * 4 + pada - 1;
  return ((idx % 9) * 10) / 3 + 5 / 3;
}

function check(m: MoonPlacement, label: string): void {
  if (!Number.isInteger(m.nak) || m.nak < 0 || m.nak > 26) {
    throw new RangeError(`${label}: nakshatra ${m.nak} out of range`);
  }
  if (signOfPada(m.nak, m.pada) !== m.sign) {
    throw new RangeError(
      `${label}: ${NAKSHATRA_NAMES[m.nak] ?? m.nak} pada ${m.pada} lies in ${signName(signOfPada(m.nak, m.pada))}, not ${signName(m.sign)}`,
    );
  }
}

const mk = (id: KootaId, score: number, because: string, dosha = false, cancellation?: KootaResult["cancellation"]): KootaResult => {
  const m = META[id];
  const r: KootaResult = {
    id,
    name: m.name,
    nameDev: m.nameDev,
    max: m.max,
    score,
    dosha,
    because,
    citation: CITE.muhurtaChintamani6,
  };
  if (cancellation) r.cancellation = cancellation;
  return r;
};

const nakName = (n: number): string => NAKSHATRA_NAMES[n] ?? String(n);

/** Tārā from one nakshatra to another, counted inclusively and reduced to 1..9. */
export function taraOf(from: number, to: number): number {
  return (((to - from + 27) % 27) % 9) + 1;
}

function maitriPoints(la: SevenId, lb: SevenId): { points: number; ab: string; ba: string } {
  if (la === lb) return { points: 5, ab: "same lord", ba: "same lord" };
  const ab = naturalRelation(la, lb);
  const ba = naturalRelation(lb, la);
  const key = [ab, ba].sort().join("+");
  return { points: MAITRI_POINTS[key] ?? 0, ab, ba };
}

function mutualFriends(la: SevenId, lb: SevenId): boolean {
  return la === lb || (naturalRelation(la, lb) === "friend" && naturalRelation(lb, la) === "friend");
}

/** The eight kootas for two Moons, in bead order. `a` = vara column, `b` = kanyā column. */
export function kootas(a: MoonPlacement, b: MoonPlacement, opts: AshtakootaOptions = {}): KootaResult[] {
  check(a, "first Moon");
  check(b, "second Moon");
  const school = opts.school ?? DEFAULT_ASHTAKOOTA_SCHOOL;

  // 1 Varṇa
  const va = VARNA_BY_SIGN[school][a.sign] ?? "shudra";
  const vb = VARNA_BY_SIGN[school][b.sign] ?? "shudra";
  const varna = mk("varna", VARNA_RANK[va] >= VARNA_RANK[vb] ? 1 : 0, `Varṇa: ${VARNA_LABEL[va]} and ${VARNA_LABEL[vb]}`);

  // 2 Vaśya
  const ca = vashyaClass(a.sign, a.deg ?? padaMidDeg(a.nak, a.pada));
  const cb = vashyaClass(b.sign, b.deg ?? padaMidDeg(b.nak, b.pada));
  const vashya = mk("vashya", VASHYA[school][ca][cb], `Vaśya: ${VASHYA_LABEL[ca]} and ${VASHYA_LABEL[cb]}`);

  // 3 Tārā — counted both ways; tārās 3, 5 and 7 are unkind. 1.5 for each kind direction.
  const tAB = taraOf(a.nak, b.nak);
  const tBA = taraOf(b.nak, a.nak);
  const kind = (t: number): boolean => !TARA_UNKIND.includes(t);
  const taraScore = (kind(tAB) ? 1.5 : 0) + (kind(tBA) ? 1.5 : 0);
  const tName = (t: number): string => `${ord(t)} ${TARA_NAMES[t - 1] ?? ""}`;
  const tara = mk(
    "tara",
    taraScore,
    `Tārā: ${tName(tAB)} one way (${kind(tAB) ? "kind" : "unkind"}), ${tName(tBA)} the other (${kind(tBA) ? "kind" : "unkind"})`,
  );

  // 4 Yoni
  const ya = YONI_BY_NAK[a.nak] ?? "horse";
  const yb = YONI_BY_NAK[b.nak] ?? "horse";
  const rel = yoniRelation(ya, yb, school);
  const yoni = mk(
    "yoni",
    YONI_POINTS[rel],
    rel === "same"
      ? `Yoni: both ${YONI_LABEL[ya]}`
      : `Yoni: ${YONI_LABEL[ya]} and ${YONI_LABEL[yb]}, ${rel === "sworn" ? "sworn rivals" : rel}`,
  );

  // 5 Graha Maitrī — the Moon-sign lords, read both ways
  const la = signLord(a.sign);
  const lb = signLord(b.sign);
  const mp = maitriPoints(la, lb);
  const maitri = mk(
    "maitri",
    mp.points,
    la === lb
      ? `Graha Maitrī: both Moon signs ruled by ${gName(la)}`
      : `Graha Maitrī: ${gName(la)} regards ${gName(lb)} as ${mp.ab}, ${gName(lb)} regards ${gName(la)} as ${mp.ba}`,
  );

  // 6 Gaṇa
  const ga = GANA_BY_NAK[a.nak] ?? "deva";
  const gb = GANA_BY_NAK[b.nak] ?? "deva";
  const ganaScore = GANA[ga][gb];
  const gana = mk(
    "gana",
    ganaScore,
    ga === gb ? `Gaṇa: both ${GANA_LABEL[ga]}` : `Gaṇa: ${GANA_LABEL[ga]} and ${GANA_LABEL[gb]}`,
    ganaScore === 0,
  );

  // 7 Bhakūṭa — the Moon signs' distance, both ways
  const dAB = houseFrom(a.sign, b.sign);
  const dBA = houseFrom(b.sign, a.sign);
  const axis = `${Math.min(dAB, dBA)}/${Math.max(dAB, dBA)}`;
  const bhakootDosha = BHAKOOT_DOSHA_DISTANCES.includes(dAB);
  let bhakoot: KootaResult;
  if (bhakootDosha) {
    const canCancel = mutualFriends(la, lb);
    const applied = canCancel && opts.bhakootCancellation === true;
    const cancellation = canCancel
      ? {
          applied,
          rule: la === lb ? "bhakoot-same-lord" : "bhakoot-lords-friends",
          citation: CITE.milanCommentary,
        }
      : undefined;
    bhakoot = mk(
      "bhakoot",
      applied ? 7 : 0,
      `Bhakūṭa: ${signName(a.sign)} and ${signName(b.sign)} lie on the ${axis} axis${
        canCancel
          ? `; ${la === lb ? `both ruled by ${gName(la)}` : `${gName(la)} and ${gName(lb)} are friends`}${applied ? ", cancellation applied" : ""}`
          : ""
      }`,
      !applied,
      cancellation,
    );
  } else {
    bhakoot = mk("bhakoot", 7, `Bhakūṭa: ${signName(a.sign)} and ${signName(b.sign)} lie on the ${axis} axis, so no doṣa`);
  }

  // 8 Nāḍī
  const na = NADI_CYCLE[a.nak % 6] ?? "adi";
  const nb = NADI_CYCLE[b.nak % 6] ?? "adi";
  let nadi: KootaResult;
  if (na === nb) {
    // Classical exceptions, recorded and never applied automatically.
    const rule =
      a.nak === b.nak && a.pada !== b.pada
        ? "nadi-same-nakshatra-different-pada"
        : a.sign === b.sign && a.nak !== b.nak
          ? "nadi-same-rashi-different-nakshatra"
          : mutualFriends(la, lb)
            ? "nadi-lords-friends"
            : null;
    nadi = mk(
      "nadi",
      0,
      `Nāḍī: both ${NADI_LABEL[na]} (${nakName(a.nak)}, ${nakName(b.nak)})`,
      true,
      rule ? { applied: false, rule, citation: CITE.milanCommentary } : undefined,
    );
  } else {
    nadi = mk("nadi", 8, `Nāḍī: ${NADI_LABEL[na]} and ${NADI_LABEL[nb]}`);
  }

  return [varna, vashya, tara, yoni, maitri, gana, bhakoot, nadi];
}

export function bandOf(total: number): MilanResult["band"] {
  if (total < 18) return "not-recommended";
  if (total < 25) return "acceptable"; // 18 … 24.5
  if (total < 33) return "very-good"; // 25 … 32.5
  return "excellent";
}

export function ashtakoota(
  aId: ProfileId,
  bId: ProfileId,
  a: MoonPlacement,
  b: MoonPlacement,
  presetHash: string,
  opts: AshtakootaOptions = {},
): AshtakootaResult {
  const ks = kootas(a, b, opts);
  const total = ks.reduce((s, k) => s + k.score, 0);
  return {
    a: aId,
    b: bId,
    presetHash,
    kootas: ks,
    total,
    band: bandOf(total),
    ashtakootaSchool: opts.school ?? DEFAULT_ASHTAKOOTA_SCHOOL,
  };
}

/** The Moon of a cast chart as an Aṣṭakūṭa input. */
export function moonOf(core: Pick<PatriCore, "grahas">): MoonPlacement {
  const mo = core.grahas.MO;
  return { nak: mo.nakshatra, pada: mo.pada, sign: mo.sign, deg: mo.degInSign };
}

/** Full Milan: the eight kootas, both charts' Manglik status (with the "both charts" cancellation) and the ten poruthams. */
export function milan(a: Profile, b: Profile, pa: PatriCore, pb: PatriCore, opts: AshtakootaOptions = {}): MilanResult {
  const base = ashtakoota(a.id, b.id, moonOf(pa), moonOf(pb), pa.presetHash, opts);
  const ma: ManglikStatus = manglikStatus(pa);
  const mb: ManglikStatus = manglikStatus(pb);
  if (ma.present && mb.present) {
    ma.cancellations = [...ma.cancellations, "manglik-bhanga-both-charts"];
    mb.cancellations = [...mb.cancellations, "manglik-bhanga-both-charts"];
  }
  return { ...base, manglik: { a: ma, b: mb }, porutham: poruthams(moonOf(pa), moonOf(pb)) };
}
