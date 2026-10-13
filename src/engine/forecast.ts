// Period forecasts — day, week, month, quarter, year — the classical way: gochara (transits counted
// from the natal Moon, Phaladīpikā ch. 26), Tārā-bala and Candra-bala for days, and the running
// Viṃśottarī periods. Every line says which graha, which house and whether tradition calls it
// favourable; nothing here is invented beyond that table.
import { currentDasha } from "./dasha";
import { type SkyEvent, skyEvents } from "./events";
import { chandraBala, GOCHAR_FAVOURABLE, moonTransitAt, sadeSati, taraBala, transitsAt } from "./gochar";
import { type EnginePreset, GRAHA_IDS, type GrahaId, type Patri } from "./types";

export type Period = "day" | "week" | "month" | "quarter" | "year";
const DAY = 86_400_000;

/** What each house from the Moon touches in ordinary life. */
export const HOUSE_AREA: readonly string[] = [
  "",
  "yourself, health and mood",
  "money, family and speech",
  "courage, siblings and short trips",
  "home, mother and peace of mind",
  "children, creativity and romance",
  "health, work, rivals and debts",
  "partner, marriage and dealings",
  "sudden changes and hidden matters",
  "luck, teachers, faith and long journeys",
  "career, status and reputation",
  "gains, friends and hopes",
  "expenses, sleep and retreat",
];

/** The theme each graha brings to whatever house it transits. */
export const GRAHA_THEME: Record<GrahaId, string> = {
  SU: "authority and vitality",
  MO: "mood and daily comfort",
  MA: "energy and drive",
  ME: "communication and deals",
  JU: "growth and good counsel",
  VE: "pleasure, love and comfort",
  SA: "effort, duty and patience",
  RA: "ambition and restlessness",
  KE: "detachment and inner focus",
};

const NAME: Record<GrahaId, string> = {
  SU: "Sun",
  MO: "Moon",
  MA: "Mars",
  ME: "Mercury",
  JU: "Jupiter",
  VE: "Venus",
  SA: "Saturn",
  RA: "Rāhu",
  KE: "Ketu",
};

/** How much each graha weighs in a period's overall tone: the slow ones dominate long periods. */
const WEIGHT: Record<Period, Partial<Record<GrahaId, number>>> = {
  day: { MO: 3, SU: 1, ME: 1, VE: 1, MA: 1 },
  week: { MO: 2, SU: 1, ME: 1, VE: 1, MA: 1, JU: 1, SA: 1 },
  month: { SU: 2, ME: 1, VE: 1, MA: 2, JU: 2, SA: 2 },
  quarter: { MA: 1, JU: 3, SA: 3, RA: 1, KE: 1, SU: 1 },
  year: { JU: 3, SA: 3, RA: 1, KE: 1 },
};

const LISTED: Record<Period, readonly GrahaId[]> = {
  day: ["MO", "SU", "MA", "ME", "VE"],
  week: ["SU", "MA", "ME", "VE", "JU", "SA"],
  month: ["SU", "MA", "ME", "VE", "JU", "SA"],
  quarter: ["JU", "SA", "RA", "KE", "MA"],
  year: ["JU", "SA", "RA", "KE"],
};

export interface ForecastLine {
  graha: GrahaId;
  house: number;
  favourable: boolean;
  text: string;
}

export interface DayRating {
  ms: number;
  /** -1 … +1 */
  score: number;
  moonHouse: number;
  tara: string;
  taraTone: "kind" | "unkind" | "mixed";
}

export interface DashaSpan {
  level: "MD" | "AD" | "PD";
  lord: GrahaId;
  startMs: number;
  endMs: number;
}

export interface Forecast {
  period: Period;
  startMs: number;
  endMs: number;
  /** -1 … +1: the weighted share of favourable transits. */
  score: number;
  tone: "bright" | "steady" | "mixed" | "testing";
  headline: string;
  lines: ForecastLine[];
  /** Day-by-day (week, month) or month-by-month (quarter, year) ratings. */
  steps: DayRating[];
  dasha: DashaSpan[];
  events: SkyEvent[];
  sadeSati: "none" | "rising" | "peak" | "setting" | "kantaka" | "ashtama";
}

export function lineFor(id: GrahaId, house: number): ForecastLine {
  const favourable = GOCHAR_FAVOURABLE[id].includes(house);
  const area = HOUSE_AREA[house] ?? "";
  const text = favourable
    ? `${NAME[id]} in the ${ord(house)} from your Moon supports ${area} — ${GRAHA_THEME[id]} work in your favour.`
    : `${NAME[id]} in the ${ord(house)} from your Moon asks for care with ${area}; ${GRAHA_THEME[id]} may feel strained.`;
  return { graha: id, house, favourable, text };
}

export function ord(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
}

/** Score one instant for a period's weights: +1 all favourable, −1 none. */
function scoreAt(patri: Patri, ms: number, preset: EnginePreset, period: Period): { score: number; houses: Record<GrahaId, number> } {
  const tr = transitsAt(ms, preset);
  const m = patri.grahas.MO.sign;
  const houses = {} as Record<GrahaId, number>;
  let num = 0;
  let den = 0;
  for (const id of GRAHA_IDS) {
    const h = ((tr[id].sign - m + 12) % 12) + 1;
    houses[id] = h;
    const w = WEIGHT[period][id] ?? 0;
    if (!w) continue;
    num += w * (GOCHAR_FAVOURABLE[id].includes(h) ? 1 : -1);
    den += w;
  }
  return { score: den ? num / den : 0, houses };
}

export function rateDay(patri: Patri, dayStartMs: number, preset: EnginePreset): DayRating {
  const mid = dayStartMs + DAY / 2;
  const mt = moonTransitAt(mid, preset);
  const cb = chandraBala(patri.grahas.MO.sign, mt.sign);
  const tb = taraBala(patri.grahas.MO.nakshatra, mt.nakshatra);
  const base = scoreAt(patri, mid, preset, "day").score;
  const tara = tb.tone === "kind" ? 0.35 : tb.tone === "unkind" ? -0.35 : 0;
  const score = Math.max(-1, Math.min(1, base * 0.7 + tara + (cb.favourable ? 0.1 : -0.1)));
  return { ms: dayStartMs, score, moonHouse: cb.house, tara: tb.name, taraTone: tb.tone };
}

/** Period bounds in the person's zone: the calendar day/week(Mon)/month/quarter/year containing `atMs`. */
export function periodBounds(period: Period, atMs: number, zone: string): [number, number] {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", timeZone: zone })
      .formatToParts(atMs)
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const y = Number(p.year);
  const mo = Number(p.month);
  const d = Number(p.day);
  const offset = zoneOffsetMs(atMs, zone);
  const at = (Y: number, M: number, D: number) => Date.UTC(Y, M - 1, D) - offset;
  switch (period) {
    case "day":
      return [at(y, mo, d), at(y, mo, d + 1)];
    case "week": {
      const wd = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(p.weekday ?? "Mon");
      return [at(y, mo, d - wd), at(y, mo, d - wd + 7)];
    }
    case "month":
      return [at(y, mo, 1), at(y, mo + 1, 1)];
    case "quarter": {
      const q = Math.floor((mo - 1) / 3) * 3 + 1;
      return [at(y, q, 1), at(y, q + 3, 1)];
    }
    case "year":
      return [at(y, 1, 1), at(y + 1, 1, 1)];
  }
}

function zoneOffsetMs(ms: number, zone: string): number {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: zone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric",
    })
      .formatToParts(ms)
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - Math.floor(ms / 1000) * 1000;
}

function toneOf(score: number): Forecast["tone"] {
  return score >= 0.35 ? "bright" : score >= 0 ? "steady" : score >= -0.35 ? "mixed" : "testing";
}

const HEADLINE: Record<Period, Record<Forecast["tone"], string>> = {
  day: {
    bright: "A supported day — good for starting things and meeting people.",
    steady: "A steady day — ordinary progress, nothing to force.",
    mixed: "A mixed day — keep plans simple and stay patient.",
    testing: "A quiet day by tradition — finish old work rather than begin new.",
  },
  week: {
    bright: "A bright week: most of the sky is on your side.",
    steady: "A steady week with a few easy openings.",
    mixed: "A mixed week: pick your moments — see the good days below.",
    testing: "A testing week by tradition: rest, plan and avoid big gambles.",
  },
  month: {
    bright: "A strong month for effort and visibility.",
    steady: "A workable month: steady gains if you keep at it.",
    mixed: "A mixed month: some areas move, others need patience.",
    testing: "A demanding month by tradition: consolidate rather than expand.",
  },
  quarter: {
    bright: "A growth season: Jupiter and Saturn largely favour you.",
    steady: "A building season: patient work pays off.",
    mixed: "A season of trade-offs: one slow planet helps, one tests.",
    testing: "A season of lessons: tradition advises patience and discipline.",
  },
  year: {
    bright: "A year of expansion by the classical reckoning.",
    steady: "A year of steady building.",
    mixed: "A year of give and take — both growth and lessons.",
    testing: "A year of hard-won lessons; tradition promises they last.",
  },
};

function dashaSpans(patri: Patri, fromMs: number, toMs: number, period: Period): DashaSpan[] {
  const out: DashaSpan[] = [];
  const levels: Array<"MD" | "AD" | "PD"> = period === "day" || period === "week" || period === "month" ? ["MD", "AD", "PD"] : ["MD", "AD"];
  for (let ms = fromMs; ms < toMs; ) {
    const c = currentDasha(patri.dasha, ms);
    if (!c) break;
    for (const lv of levels) {
      const n = lv === "MD" ? c.md : lv === "AD" ? c.ad : c.pd;
      if (!out.some((o) => o.level === lv && o.startMs === n.startMs))
        out.push({ level: lv, lord: n.lord, startMs: n.startMs, endMs: n.endMs });
    }
    const next = Math.min(levels.includes("PD") ? c.pd.endMs : c.ad.endMs, toMs);
    ms = next <= ms ? ms + DAY : next;
  }
  return out;
}

export function forecast(
  patri: Patri,
  period: Period,
  atMs: number,
  zone: string,
  preset: EnginePreset,
  place: { lat: number; lon: number },
): Forecast {
  const [startMs, endMs] = periodBounds(period, atMs, zone);
  const mid = (startMs + endMs) / 2;
  const { houses } = scoreAt(patri, mid, preset, period);
  const lines = LISTED[period].map((id) => lineFor(id, houses[id]));

  let steps: DayRating[] = [];
  let score: number;
  if (period === "day") {
    const r = rateDay(patri, startMs, preset);
    steps = [r];
    score = r.score;
  } else if (period === "week" || period === "month") {
    for (let ms = startMs; ms < endMs - DAY / 2; ms += DAY) steps.push(rateDay(patri, ms, preset));
    const slow = scoreAt(patri, mid, preset, period).score;
    score = 0.5 * slow + 0.5 * (steps.reduce((s, r) => s + r.score, 0) / Math.max(1, steps.length));
  } else {
    // Month by month across the quarter or year, scored from the slow grahas.
    const months = period === "quarter" ? 3 : 12;
    for (let i = 0; i < months; i++) {
      const [ms0, ms1] = periodBounds("month", startMs + (i + 0.5) * ((endMs - startMs) / months), zone);
      const s = scoreAt(patri, (ms0 + ms1) / 2, preset, period);
      steps.push({ ms: ms0, score: s.score, moonHouse: 0, tara: "", taraTone: "mixed" });
    }
    score = steps.reduce((s, r) => s + r.score, 0) / steps.length;
  }

  // Sāḍe Sātī / Kaṇṭaka / Aṣṭama Śani at the period's middle.
  const sh = houses.SA;
  const sadeSatiState: Forecast["sadeSati"] =
    sh === 12
      ? "rising"
      : sh === 1
        ? "peak"
        : sh === 2
          ? "setting"
          : sh === 4 || sh === 7 || sh === 10
            ? "kantaka"
            : sh === 8
              ? "ashtama"
              : "none";
  void sadeSati; // the full ribbon lives on the patri; here we only need the phase

  const evDays = Math.min(366, Math.ceil((endMs - startMs) / DAY));
  const events =
    period === "day"
      ? []
      : skyEvents(startMs, evDays, place, preset).filter((e) => e.ms < endMs && (e.kind !== "ekadashi" || period !== "year"));
  const tone = toneOf(score);
  return {
    period,
    startMs,
    endMs,
    score,
    tone,
    headline: HEADLINE[period][tone],
    lines,
    steps,
    dasha: dashaSpans(patri, startMs, endMs, period),
    events,
    sadeSati: sadeSatiState,
  };
}
