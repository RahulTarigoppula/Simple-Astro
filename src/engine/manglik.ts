// Kuja doṣa (Manglik), shared by the yoga list and Guna Milan. Mars in the 1st, 2nd, 4th, 7th, 8th or
// 12th counted from the Lagna, from Candra and from Śukra. Not a BPHS yoga: it comes from later
// muhūrta manuals, and is cited as such. Its six standard cancellations are listed in full; four are
// read from one chart, one ("both charts") needs the partner and is applied by milan(), and one
// ("past 28", by some schools) is recorded and NEVER applied automatically.
import { isExalted, isOwnSign } from "../data/tables/rulership";
import { aspects, houseFrom, KENDRA, ord, signName } from "./chart-helpers";
import { CITE } from "./citations";
import type { Citation, ManglikStatus, PatriCore, YogaEvidence } from "./types";

export const MANGLIK_HOUSES: readonly number[] = [1, 2, 4, 7, 8, 12];

export type ManglikRef = "lagna" | "moon" | "venus";
export const MANGLIK_REF_LABEL: Record<ManglikRef, string> = { lagna: "Lagna", moon: "Candra", venus: "Śukra" };

export interface ManglikCancellation {
  id: string;
  name: string;
  /** 'chart' = read from one chart; 'pair' = applied by milan(); 'never' = recorded, not applied. */
  scope: "chart" | "pair" | "never";
  description: string;
  citation: Citation;
}

export const MANGLIK_CANCELLATIONS: readonly ManglikCancellation[] = [
  {
    id: "manglik-bhanga-own-sign",
    name: "Kuja-doṣa bhaṅga (own or exaltation sign)",
    scope: "chart",
    description: "Maṅgala in Meṣa or Vṛścika (own) or Makara (exaltation)",
    citation: CITE.kujaDoshaBhanga,
  },
  {
    id: "manglik-bhanga-budha-rashi",
    name: "Kuja-doṣa bhaṅga (the 2nd in Budha's sign)",
    scope: "chart",
    description: "Maṅgala in the 2nd from the Lagna in Mithuna or Kanyā",
    citation: CITE.kujaDoshaBhanga,
  },
  {
    id: "manglik-bhanga-guru-drishti",
    name: "Kuja-doṣa bhaṅga (Guru on Maṅgala)",
    scope: "chart",
    description: "Guru joins or aspects Maṅgala",
    citation: CITE.kujaDoshaBhanga,
  },
  {
    id: "manglik-bhanga-shani-kendra",
    name: "Kuja-doṣa bhaṅga (Śani with Maṅgala)",
    scope: "chart",
    description: "Śani joins Maṅgala or stands in a kendra from it",
    citation: CITE.kujaDoshaBhanga,
  },
  {
    id: "manglik-bhanga-both-charts",
    name: "Kuja-doṣa bhaṅga (both charts)",
    scope: "pair",
    description: "both partners' charts carry Kuja doṣa",
    citation: CITE.kujaDoshaBhanga,
  },
  {
    id: "manglik-bhanga-age-28",
    name: "Kuja-doṣa bhaṅga (past the 28th year)",
    scope: "never",
    description: "the doṣa lapses after the 28th year, by some schools",
    citation: CITE.kujaDoshaBhanga,
  },
];

/** Which references see Maṅgala in a Manglik house, with the house counted from each. */
export function manglikReferences(core: PatriCore): Array<{ ref: ManglikRef; house: number }> {
  const ma = core.grahas.MA.sign;
  const refs: Array<{ ref: ManglikRef; house: number }> = [
    { ref: "lagna", house: houseFrom(core.lagna.sign, ma) },
    { ref: "moon", house: houseFrom(core.grahas.MO.sign, ma) },
    { ref: "venus", house: houseFrom(core.grahas.VE.sign, ma) },
  ];
  return refs.filter((r) => MANGLIK_HOUSES.includes(r.house));
}

export interface ManglikCancellationHit {
  id: string;
  values: Record<string, string>;
  because: YogaEvidence[];
}

/** The chart-scope cancellations that hold for this chart (whether or not Kuja doṣa is present). */
export function manglikChartCancellations(core: PatriCore): ManglikCancellationHit[] {
  const { MA, JU, SA } = core.grahas;
  const out: ManglikCancellationHit[] = [];
  if (isOwnSign("MA", MA.sign) || isExalted("MA", MA.sign)) {
    out.push({
      id: "manglik-bhanga-own-sign",
      values: { sign: signName(MA.sign) },
      because: [
        {
          grahaId: "MA",
          sign: MA.sign,
          note: `Maṅgala in ${signName(MA.sign)}, its ${isExalted("MA", MA.sign) ? "exaltation" : "own"} sign`,
        },
      ],
    });
  }
  const maHouse = houseFrom(core.lagna.sign, MA.sign);
  if (maHouse === 2 && (MA.sign === 2 || MA.sign === 5)) {
    out.push({
      id: "manglik-bhanga-budha-rashi",
      values: { sign: signName(MA.sign) },
      because: [{ grahaId: "MA", house: 2, sign: MA.sign, note: `Maṅgala in the 2nd, in Budha's ${signName(MA.sign)}` }],
    });
  }
  if (JU.sign === MA.sign || aspects(JU, MA.sign)) {
    const joined = JU.sign === MA.sign;
    out.push({
      id: "manglik-bhanga-guru-drishti",
      values: { relation: joined ? "joining" : "aspecting" },
      because: [
        {
          grahaId: "JU",
          sign: JU.sign,
          note: joined
            ? `Guru joins Maṅgala in ${signName(MA.sign)}`
            : `Guru aspects Maṅgala, the ${ord(houseFrom(JU.sign, MA.sign))} from Guru`,
        },
      ],
    });
  }
  const saFromMa = houseFrom(MA.sign, SA.sign);
  if (KENDRA.includes(saFromMa)) {
    const joined = saFromMa === 1;
    out.push({
      id: "manglik-bhanga-shani-kendra",
      values: { relation: joined ? "joining" : "in a kendra from" },
      because: [
        {
          grahaId: "SA",
          sign: SA.sign,
          note: joined ? `Śani joins Maṅgala in ${signName(SA.sign)}` : `Śani in the ${ord(saFromMa)} from Maṅgala`,
        },
      ],
    });
  }
  return out;
}

/** Manglik status of one chart. `cancellations` lists the chart-scope ids that hold. */
export function manglikStatus(core: PatriCore): ManglikStatus {
  const refs = manglikReferences(core);
  const present = refs.length > 0;
  return {
    present,
    from: refs.map((r) => r.ref),
    cancellations: present ? manglikChartCancellations(core).map((c) => c.id) : [],
    citation: CITE.kujaDosha,
  };
}
