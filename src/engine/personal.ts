// The personal layer of a forecast: life areas scored from the person's own chart, transits crossing
// their natal planets, the classical aṣṭakavarga strength of each transit, and a day guide (best
// hours, the day's colour, do / go easy). Every line names its graha and house; nothing is invented
// beyond the classical tables it cites.
import { ashtakavarga, binduFor } from "./ashtakavarga";
import { GOCHAR_FAVOURABLE, transitsAt } from "./gochar";
import { horas } from "./muhurta";
import { computePanchang } from "./panchang";
import { type EnginePreset, GRAHA_IDS, type GrahaId, type Patri } from "./types";

const NAME: Record<GrahaId, string> = {
  SU: "the Sun",
  MO: "the Moon",
  MA: "Mars",
  ME: "Mercury",
  JU: "Jupiter",
  VE: "Venus",
  SA: "Saturn",
  RA: "Rāhu",
  KE: "Ketu",
};
const Name = (g: GrahaId) => {
  const n = NAME[g];
  return n[0]?.toUpperCase() + n.slice(1);
};
const ord = (n: number) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"}`;
const houseFrom = (from: number, to: number) => ((to - from + 12) % 12) + 1;

export type AreaId = "career" | "money" | "love" | "health" | "mind" | "home" | "luck";

interface AreaSpec {
  id: AreaId;
  label: string;
  houses: readonly number[];
  karakas: readonly GrahaId[];
  good: string;
  easy: string;
}

export const AREAS: readonly AreaSpec[] = [
  {
    id: "career",
    label: "Career & work",
    houses: [10, 6],
    karakas: ["SU", "SA", "ME"],
    good: "pitching ideas, important meetings, finishing big tasks",
    easy: "arguing with the boss, rushing deadlines",
  },
  {
    id: "money",
    label: "Money",
    houses: [2, 11],
    karakas: ["JU", "VE"],
    good: "planning savings, fair negotiations",
    easy: "impulse buys, lending or big gambles",
  },
  {
    id: "love",
    label: "Love & partnership",
    houses: [7, 5],
    karakas: ["VE", "MO"],
    good: "a thoughtful conversation, time with someone you love",
    easy: "reading too much into small things",
  },
  {
    id: "health",
    label: "Health & energy",
    houses: [1, 6],
    karakas: ["SU", "MA"],
    good: "exercise, a fresh routine",
    easy: "overwork and skipped sleep",
  },
  {
    id: "mind",
    label: "Mind & mood",
    houses: [4, 1],
    karakas: ["MO", "ME"],
    good: "journaling, learning, a quiet walk",
    easy: "overthinking late at night",
  },
  {
    id: "home",
    label: "Home & family",
    houses: [4, 2],
    karakas: ["MO", "VE"],
    good: "family time, sorting the house",
    easy: "old family arguments",
  },
  {
    id: "luck",
    label: "Luck & learning",
    houses: [9, 5],
    karakas: ["JU", "SU"],
    good: "study, travel plans, asking a mentor",
    easy: "taking luck for granted",
  },
];

export interface AreaReading {
  id: AreaId;
  label: string;
  /** -1 … +1 */
  score: number;
  why: string;
  good: string;
  easy: string;
}

export interface NatalContact {
  transit: GrahaId;
  natal: GrahaId | "LAGNA";
  orb: number;
  text: string;
}

export interface TransitStrength {
  graha: GrahaId;
  sign: number;
  bindus: number;
  text: string;
}

export interface PersonalReading {
  areas: AreaReading[];
  contacts: NatalContact[];
  strength: TransitStrength[];
}

/** What a natal point stands for, for "X is crossing your birth Y" lines. */
const NATAL_MEANS: Record<GrahaId | "LAGNA", string> = {
  SU: "sense of self and purpose",
  MO: "mind and feelings",
  MA: "drive and courage",
  ME: "thinking and speech",
  JU: "wisdom and good fortune",
  VE: "love, taste and comfort",
  SA: "discipline and duties",
  RA: "ambitions",
  KE: "inner, detached side",
  LAGNA: "body and the way you meet the world",
};
const TRANSIT_DOES: Record<GrahaId, string> = {
  SU: "shines a light on",
  MO: "stirs",
  MA: "energises — and can overheat —",
  ME: "sharpens",
  JU: "expands and blesses",
  VE: "sweetens",
  SA: "tests and matures",
  RA: "amplifies and unsettles",
  KE: "turns inward",
};
const ORB: Record<GrahaId, number> = { SU: 3, MO: 0, MA: 3, ME: 2, JU: 5, VE: 3, SA: 5, RA: 4, KE: 4 };

const delta = (a: number, b: number) => Math.abs(((a - b + 540) % 360) - 180);

export function personalReading(patri: Patri, atMs: number, preset: EnginePreset): PersonalReading {
  const tr = transitsAt(atMs, preset);
  const moon = patri.grahas.MO.sign;
  const lagna = patri.lagna.sign;
  const av = ashtakavarga(patri);

  // Transit strength by the graha's own Bhinnāṣṭakavarga (BPHS ch. 66): 4+ bindus carry the transit well.
  const strength: TransitStrength[] = (["SU", "MA", "ME", "JU", "VE", "SA"] as const).map((g) => {
    const b = binduFor(av, g, tr[g].sign);
    const text =
      b >= 5
        ? `${Name(g)} moves through a sign where your chart gives it ${b} of 8 points — a strong passage.`
        : b === 4
          ? `${Name(g)} has ${b} of 8 points in its current sign — an average passage.`
          : `${Name(g)} has only ${b} of 8 points in its current sign — its gifts arrive with effort.`;
    return { graha: g, sign: tr[g].sign, bindus: b, text };
  });

  // Transits within orb of natal planets and the Lagna (the Moon moves too fast to count).
  const contacts: NatalContact[] = [];
  for (const t of ["SU", "MA", "ME", "JU", "VE", "SA", "RA", "KE"] as const) {
    const points: Array<[GrahaId | "LAGNA", number]> = [
      ...GRAHA_IDS.map((g) => [g, patri.grahas[g].lonSidereal] as [GrahaId, number]),
      ["LAGNA", patri.lagna.lonSidereal],
    ];
    for (const [n, lon] of points) {
      if (n === t) continue;
      const o = delta(tr[t].lonSidereal, lon);
      if (o <= ORB[t]) {
        contacts.push({
          transit: t,
          natal: n,
          orb: o,
          text: `${Name(t)} is crossing your birth ${n === "LAGNA" ? "rising degree" : NAME[n].replace("the ", "")} (within ${o.toFixed(1)}°) — it ${TRANSIT_DOES[t]} your ${NATAL_MEANS[n]}.`,
        });
      }
    }
  }
  contacts.sort((a, b) => a.orb - b.orb);

  // Life areas: karakas' favourability from the Moon, their aṣṭakavarga strength, and who walks
  // through the area's houses (counted from both the Moon and the Lagna).
  const areas = AREAS.map((a): AreaReading => {
    let num = 0;
    let den = 0;
    const notes: Array<{ w: number; text: string }> = [];
    for (const k of a.karakas) {
      const h = houseFrom(moon, tr[k].sign);
      const fav = GOCHAR_FAVOURABLE[k].includes(h);
      num += fav ? 1 : -1;
      den += 1;
      if (k !== "MO" && k !== "RA" && k !== "KE") {
        const b = binduFor(av, k, tr[k].sign);
        num += (b - 4) / 4;
        den += 0.5;
      }
      notes.push({
        w: fav ? 1 : -1,
        text: `${Name(k)}, the natural significator of this area, is in the ${ord(h)} from your Moon (${fav ? "supportive" : "a strain"})`,
      });
    }
    for (const g of GRAHA_IDS) {
      const hm = houseFrom(moon, tr[g].sign);
      const hl = houseFrom(lagna, tr[g].sign);
      const inArea = a.houses.includes(hm) || a.houses.includes(hl);
      if (!inArea || g === "MO") continue;
      // Classical gochara: a graha helps from its favourable houses (malefics from 3, 6, 11).
      const good = GOCHAR_FAVOURABLE[g].includes(hm);
      num += good ? 0.6 : -0.4;
      den += 0.6;
      const h = a.houses.includes(hl) ? hl : hm;
      notes.push({
        w: good ? 1.2 : -1.2,
        text: `${Name(g)} is passing through your ${ord(h)} house${a.houses.includes(hl) ? "" : " from the Moon"} (${good ? "supportive" : "a strain"})`,
      });
    }
    const score = Math.max(-1, Math.min(1, den ? num / den : 0));
    const lead = [...notes].sort((x, y) => (score >= 0 ? y.w - x.w : x.w - y.w))[0];
    return { id: a.id, label: a.label, score, why: lead ? `${lead.text}.` : "", good: a.good, easy: a.easy };
  });

  return { areas, contacts, strength };
}

export interface DayGuide {
  colour: string;
  lord: GrahaId;
  bestHours: Array<{ lord: GrahaId; startMs: number; endMs: number }>;
  avoid: [number, number];
  goodFor: string[];
  easyOn: string[];
}

const DAY_COLOUR: Record<GrahaId, string> = {
  SU: "red or orange",
  MO: "white or silver",
  MA: "red",
  ME: "green",
  JU: "yellow",
  VE: "white or pastel",
  SA: "dark blue or black",
  RA: "grey",
  KE: "multicolour",
};
const WEEKDAY_LORD: readonly GrahaId[] = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"];

/** Best horās of the day (natural benefics, outside Rāhu Kāla), the weekday's colour, do / go easy. */
export function dayGuide(
  patri: Patri,
  dayMidMs: number,
  place: { lat: number; lon: number },
  preset: EnginePreset,
  areas: readonly AreaReading[],
): DayGuide {
  const p = computePanchang(dayMidMs, place, preset);
  const hs = horas(p.sunriseMs, p.sunsetMs, p.nextSunriseMs, p.vara.index);
  const [r0, r1] = p.rahuKaal;
  const bestHours = hs.day
    .filter((h) => (h.lord === "JU" || h.lord === "VE" || h.lord === "ME" || h.lord === "MO") && (h.endMs <= r0 || h.startMs >= r1))
    .map((h) => ({ lord: h.lord, startMs: h.startMs, endMs: h.endMs }))
    .slice(0, 4);
  const lord = WEEKDAY_LORD[p.vara.index] ?? "SU";
  const sorted = [...areas].sort((a, b) => b.score - a.score);
  void patri;
  return {
    colour: DAY_COLOUR[lord],
    lord,
    bestHours,
    avoid: [r0, r1],
    goodFor: sorted.slice(0, 2).map((a) => a.good),
    easyOn: sorted.slice(-2).map((a) => a.easy),
  };
}
