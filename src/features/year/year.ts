// "Your year ahead": the pure reading behind the story. Everything here is selection and wording
// over the engine's own numbers (the month forecasts, the daśā tree, the slow planets' houses from
// the Moon, the life areas, the day picker, the festival calendar). Nothing is invented and nothing
// is random: the same person on the same day always gets the same year.
import { DateTime } from "luxon";
import { GRAHA_ENGLISH } from "../../data/tables/names";
import { CHAPTER_SHORT } from "../../data/traits";
import { currentDasha } from "../../engine/dasha";
import type { Festival } from "../../engine/festivals";
import { type ForecastLine, forecast, HOUSE_AREA, lineFor, ord } from "../../engine/forecast";
import { transitsAt } from "../../engine/gochar";
import type { AreaId, PersonalReading } from "../../engine/personal";
import { type PickDay, rankDays } from "../../engine/pickday";
import { safeZone } from "../../engine/time";
import type { DashaNode, EnginePreset, GrahaId, Patri, SignIdx } from "../../engine/types";
import { fmt, TONE_WORD, type Tone, toneOf } from "../forecast/util";

export const DAY = 86_400_000;
/** How far ahead the days worth circling are looked for. */
export const CIRCLE_DAYS = 90;

// ─── the twelve months ──────────────────────────────────────────────────────

export interface MonthSpan {
  /** Local midnight that opens the month at the reader's place. */
  startMs: number;
  endMs: number;
  midMs: number;
  /** "June". */
  label: string;
  /** "Jun". */
  short: string;
  /** "J". */
  initial: string;
  year: number;
}

/** The next twelve months from today: the month that holds `nowMs`, then the eleven after it. */
export function yearWindow(nowMs: number, zone: string): MonthSpan[] {
  const z = safeZone(zone);
  const first = DateTime.fromMillis(nowMs, { zone: z }).startOf("month");
  const out: MonthSpan[] = [];
  for (let i = 0; i < 12; i++) {
    const a = first.plus({ months: i });
    const b = first.plus({ months: i + 1 });
    const startMs = a.toMillis();
    const endMs = b.toMillis();
    const midMs = (startMs + endMs) / 2;
    out.push({
      startMs,
      endMs,
      midMs,
      label: fmt(midMs, z, { month: "long" }),
      short: fmt(midMs, z, { month: "long" }).slice(0, 3),
      initial: fmt(midMs, z, { month: "narrow" }),
      year: a.year,
    });
  }
  return out;
}

export interface MonthReading extends MonthSpan {
  /** −1 … +1, the month forecast's own score. */
  score: number;
  tone: Tone;
  /** The month forecast's own lines: which planet, which house from the Moon, kind or not. */
  lines: ForecastLine[];
}

/** One month of the window, read exactly as the Forecast screen reads that month. */
export function readMonth(
  patri: Patri,
  span: MonthSpan,
  zone: string,
  preset: EnginePreset,
  place: { lat: number; lon: number },
): MonthReading {
  const f = forecast(patri, "month", span.midMs, safeZone(zone), preset, place);
  return { ...span, score: f.score, tone: f.tone, lines: f.lines };
}

export interface MonthPick {
  month: MonthReading;
  /** The line of that month's forecast that sets it apart from the other months, or null. */
  line: ForecastLine | null;
  /** The same line, short enough for a slide: "Jupiter supports gains, friends and hopes". */
  why: string;
}

const pairKey = (l: ForecastLine) => `${l.graha}${l.house}`;

/** A forecast line said short, in the forecast's own words for the planet and the house. */
export function shortLine(l: ForecastLine): string {
  const area = HOUSE_AREA[l.house] ?? "your plans";
  return l.favourable ? `${GRAHA_ENGLISH[l.graha]} supports ${area}` : `${GRAHA_ENGLISH[l.graha]} asks for care with ${area}`;
}

/**
 * Why this month, from its own forecast lines: of the lines on the wanted side (kind or not), the
 * one the fewest other months share, so a month is explained by what is special to it rather than
 * by a slow planet that sits in the same house all year. Ties keep the forecast's own order.
 */
export function whyLine(month: MonthReading, all: readonly MonthReading[], favourable: boolean): ForecastLine | null {
  let best: ForecastLine | null = null;
  let bestCount = Number.POSITIVE_INFINITY;
  for (const l of month.lines) {
    if (l.favourable !== favourable) continue;
    const count = all.filter((m) => m.lines.some((x) => pairKey(x) === pairKey(l))).length;
    if (count < bestCount) {
      best = l;
      bestCount = count;
    }
  }
  return best;
}

const mean = (xs: readonly number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
const byDate = <T extends { startMs: number }>(a: T, b: T) => a.startMs - b.startMs;

/**
 * The best months: the top two by score, and a third when it also stands above the year's average.
 * Equal scores go to the sooner month. Returned in calendar order.
 */
export function bestMonths(months: readonly MonthReading[]): MonthPick[] {
  const avg = mean(months.map((m) => m.score));
  const ranked = [...months].sort((a, b) => b.score - a.score || a.startMs - b.startMs);
  const top = ranked.slice(0, 2);
  const third = ranked[2];
  if (third && third.score > avg + 1e-9) top.push(third);
  return top.sort(byDate).map((month) => {
    const line = whyLine(month, months, true);
    return { month, line, why: line ? shortLine(line) : "More of the sky helps than hinders" };
  });
}

/**
 * The months to go gently: the lowest, and a second when it is nearly as low (within 0.08) and
 * under the year's average. Never a month already named among the best. Calendar order.
 */
export function gentleMonths(months: readonly MonthReading[], best: readonly MonthPick[] = bestMonths(months)): MonthPick[] {
  const avg = mean(months.map((m) => m.score));
  const taken = new Set(best.map((b) => b.month.startMs));
  const ranked = [...months].filter((m) => !taken.has(m.startMs)).sort((a, b) => a.score - b.score || a.startMs - b.startMs);
  const low = ranked[0];
  if (!low) return [];
  const out = [low];
  const second = ranked[1];
  if (second && second.score - low.score <= 0.08 && second.score < avg - 1e-9) out.push(second);
  return out.sort(byDate).map((month) => {
    const line = whyLine(month, months, false);
    return { month, line, why: line ? shortLine(line) : "Simply the quietest of the twelve" };
  });
}

const YEAR_LINE: Record<Tone, string> = {
  bright: "A year with much of the sky on your side.",
  steady: "A year of steady building.",
  mixed: "A year of give and take.",
  testing: "A year that rewards patience.",
};

export interface YearShape {
  months: MonthReading[];
  /** The average of the twelve month scores. */
  score: number;
  tone: Tone;
  /** One of the app's four words: Strong, Good, Mixed, Go gently. */
  word: string;
  /** One sentence: the tone, then how many of the twelve months lean kind. */
  line: string;
  best: MonthPick[];
  gentle: MonthPick[];
  /** The single best month. */
  peak: MonthReading;
}

const NUM = ["None", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "All twelve"];

/** The shape of the year from its twelve months; null until all twelve are read. */
export function shapeOfYear(months: readonly MonthReading[]): YearShape | null {
  if (months.length < 12) return null;
  const score = mean(months.map((m) => m.score));
  const tone = toneOf(score);
  const best = bestMonths(months);
  const gentle = gentleMonths(months, best);
  const peak = [...months].sort((a, b) => b.score - a.score || a.startMs - b.startMs)[0] as MonthReading;
  const kind = months.filter((m) => m.tone === "bright" || m.tone === "steady").length;
  const count = kind === 12 ? "All twelve months lean" : `${NUM[kind]} of the twelve months ${kind === 1 ? "leans" : "lean"}`;
  return {
    months: [...months],
    score,
    tone,
    word: TONE_WORD[tone],
    line: `${YEAR_LINE[tone]} ${count} your way; ${peak.label} is the brightest.`,
    best,
    gentle,
    peak,
  };
}

/** "Good overall · best month: June", for the teaser row. */
export function teaserSub(shape: YearShape): string {
  return `${shape.word} overall · best month: ${shape.peak.label}`;
}

/** "June", "June and September", "June, July and September". */
export function listWords(xs: readonly string[]): string {
  if (xs.length <= 1) return xs[0] ?? "";
  return `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`;
}

// ─── the life chapter ───────────────────────────────────────────────────────

export interface ChapterChange {
  /** "MD": a whole new chapter begins. "AD": a new stretch inside the same chapter. */
  level: "MD" | "AD";
  lord: GrahaId;
  startMs: number;
}

export interface ChapterInfo {
  /** The running chapter (mahādaśā) and the stretch inside it (antardaśā) today. */
  md: DashaNode;
  ad: DashaNode;
  /** Every change of chapter or stretch that falls inside the year, in order. */
  changes: ChapterChange[];
}

/** Which planetary period runs now and what changes before `endMs`. */
export function chapterOfYear(tree: readonly DashaNode[], nowMs: number, endMs: number): ChapterInfo | null {
  const c = currentDasha(tree, nowMs);
  if (!c) return null;
  const changes: ChapterChange[] = [];
  let cur = c;
  for (let guard = 0; guard < 12 && cur.ad.endMs < endMs; guard++) {
    const next = currentDasha(tree, cur.ad.endMs + 1000);
    if (!next || next.ad.startMs <= cur.ad.startMs) break;
    const level = next.md.startMs !== cur.md.startMs ? "MD" : "AD";
    changes.push({ level, lord: level === "MD" ? next.md.lord : next.ad.lord, startMs: next.ad.startMs });
    cur = next;
  }
  return { md: c.md, ad: c.ad, changes };
}

/** The chapter in plain words: what runs, until when, and what begins inside the year. */
export function chapterWords(c: ChapterInfo, zone: string): { title: string; lines: string[] } {
  const my = (ms: number) => fmt(ms, zone, { month: "long", year: "numeric" });
  const lines = [`This one, a time of ${CHAPTER_SHORT[c.md.lord]}, runs until ${my(c.md.endMs)}.`];
  const newChapter = c.changes.find((x) => x.level === "MD");
  const stretch = c.changes.find((x) => x.level === "AD");
  if (newChapter) {
    lines.push(
      `A new chapter opens in ${my(newChapter.startMs)}: ${GRAHA_ENGLISH[newChapter.lord]}'s, a time of ${CHAPTER_SHORT[newChapter.lord]}.`,
    );
  } else if (stretch) {
    lines.push(
      `Inside it you are in ${GRAHA_ENGLISH[c.ad.lord]}'s stretch; ${GRAHA_ENGLISH[stretch.lord]}'s begins in ${my(stretch.startMs)}, bringing ${CHAPTER_SHORT[stretch.lord]} forward.`,
    );
  } else {
    lines.push(
      `Inside it you are in ${GRAHA_ENGLISH[c.ad.lord]}'s stretch (${CHAPTER_SHORT[c.ad.lord]}) for the whole of this year, until ${my(c.ad.endMs)}.`,
    );
  }
  return { title: `${GRAHA_ENGLISH[c.md.lord]}'s chapter`, lines };
}

// ─── the slow planets ───────────────────────────────────────────────────────

export type SlowId = "JU" | "SA";

export interface SlowLeg {
  graha: SlowId;
  sign: SignIdx;
  /** The house counted from the natal Moon's sign, 1 … 12. */
  house: number;
  favourable: boolean;
  startMs: number;
  endMs: number;
}

export interface SlowPath {
  graha: SlowId;
  legs: SlowLeg[];
  /** Sidereal longitude at the start and the end of the year, and the two extremes it reaches. */
  lonStart: number;
  lonEnd: number;
  lonMin: number;
  lonMax: number;
}

type TransitFn = (ms: number) => Record<SlowId, { sign: SignIdx; lonSidereal: number }>;

/**
 * Where Jupiter and Saturn travel between two instants: their sign by sign legs (a retrograde
 * re-entry shows as a repeated sign), each with its house from the natal Moon. Sampled every four
 * days, each crossing then narrowed to within the hour.
 */
export function slowPaths(moonSign: SignIdx, fromMs: number, toMs: number, preset: EnginePreset, at?: TransitFn): SlowPath[] {
  const pos: TransitFn = at ?? ((ms) => transitsAt(ms, preset));
  const STEP = 4 * DAY;
  const samples: Array<{ ms: number; p: ReturnType<TransitFn> }> = [];
  for (let ms = fromMs; ms < toMs; ms += STEP) samples.push({ ms, p: pos(ms) });
  samples.push({ ms: toMs, p: pos(toMs) });
  return (["JU", "SA"] as const).map((graha) => {
    const legs: SlowLeg[] = [];
    const first = samples[0] as (typeof samples)[number];
    let openMs = fromMs;
    let sign = first.p[graha].sign;
    // unwrap the longitude so a path across 0° Aries stays continuous
    let unwrapped = first.p[graha].lonSidereal;
    let lonMin = unwrapped;
    let lonMax = unwrapped;
    const close = (endMs: number) => {
      const house = ((sign - moonSign + 12) % 12) + 1;
      legs.push({ graha, sign, house, favourable: lineFor(graha, house).favourable, startMs: openMs, endMs });
    };
    for (let i = 1; i < samples.length; i++) {
      const a = samples[i - 1] as (typeof samples)[number];
      const b = samples[i] as (typeof samples)[number];
      const d = ((b.p[graha].lonSidereal - a.p[graha].lonSidereal + 540) % 360) - 180;
      unwrapped += d;
      lonMin = Math.min(lonMin, unwrapped);
      lonMax = Math.max(lonMax, unwrapped);
      if (b.p[graha].sign === sign) continue;
      let lo = a.ms;
      let hi = b.ms;
      while (hi - lo > 3_600_000) {
        const mid = (lo + hi) / 2;
        if (pos(mid)[graha].sign === sign) lo = mid;
        else hi = mid;
      }
      close(hi);
      openMs = hi;
      sign = b.p[graha].sign;
    }
    close(toMs);
    return { graha, legs, lonStart: first.p[graha].lonSidereal, lonEnd: unwrapped, lonMin, lonMax };
  });
}

/** The legs worth a sentence: the houses in the order they are first reached, short visits (under three weeks) left out. */
export function mainLegs(path: SlowPath): SlowLeg[] {
  const seen = new Set<number>();
  const out: SlowLeg[] = [];
  for (const l of path.legs) {
    if (seen.has(l.house)) continue;
    if (l.endMs - l.startMs < 21 * DAY && path.legs.length > 1) continue;
    seen.add(l.house);
    out.push(l);
  }
  return out.length ? out : path.legs.slice(0, 1);
}

/** "Jupiter travels through your 11th house (gains, friends and hopes), then from June your 12th (…)." */
export function slowWords(path: SlowPath, zone: string): string {
  const legs = mainLegs(path);
  const name = GRAHA_ENGLISH[path.graha];
  const area = (l: SlowLeg) => `(${HOUSE_AREA[l.house] ?? ""})`;
  const first = legs[0];
  if (!first) return "";
  const rest = legs.slice(1).map((l) => `from ${fmt(l.startMs + DAY, zone, { month: "long" })} your ${ord(l.house)} ${area(l)}`);
  const head = `your ${ord(first.house)} house from your Moon ${area(first)}`;
  return rest.length ? `${name} travels through ${head}, then ${listWords(rest)}.` : `${name} stays in ${head} all year.`;
}

/** The same, short enough for the slide (the picture already says the houses are counted from the Moon). */
export function slowShort(path: SlowPath, zone: string): string {
  const legs = mainLegs(path);
  const first = legs[0];
  if (!first) return "";
  const say = (l: SlowLeg) => `${ord(l.house)} house from your Moon (${HOUSE_AREA[l.house] ?? ""})`;
  const rest = legs
    .slice(1)
    .map((l) => `the ${ord(l.house)} (${HOUSE_AREA[l.house] ?? ""}) from ${fmt(l.startMs + DAY, zone, { month: "long" })}`);
  return rest.length
    ? `${GRAHA_ENGLISH[path.graha]}: your ${say(first)}, then ${listWords(rest)}.`
    : `${GRAHA_ENGLISH[path.graha]}: your ${say(first)}, all year.`;
}

/** What tradition reads into the house a slow planet spends most of the year in, in a few words. */
export function slowTone(path: SlowPath): { favourable: boolean; text: string } {
  const longest = [...path.legs].sort((a, b) => b.endMs - b.startMs - (a.endMs - a.startMs))[0];
  const favourable = longest?.favourable ?? false;
  return { favourable, text: favourable ? "Tradition counts this a helpful house." : "Tradition reads it as a house for patience." };
}

// ─── the life areas ─────────────────────────────────────────────────────────

export interface AreaYear {
  id: AreaId;
  label: string;
  /** The average of the area's score at the middle of each of the twelve months. */
  score: number;
  tone: Tone;
  /** The month in which this area reads highest. */
  peak: MonthSpan;
}

export interface AreasOfYear {
  all: AreaYear[];
  top: AreaYear[];
  tend: AreaYear;
}

/** The seven life areas over the year: each month's reading averaged, the top three, and the one to tend. */
export function areasOfYear(readings: readonly PersonalReading[], months: readonly MonthSpan[]): AreasOfYear | null {
  const first = readings[0];
  if (!first || readings.length !== months.length) return null;
  const all: AreaYear[] = first.areas.map((a) => {
    const scores = readings.map((r) => r.areas.find((x) => x.id === a.id)?.score ?? 0);
    let peakAt = 0;
    scores.forEach((s, i) => {
      if (s > (scores[peakAt] ?? -2)) peakAt = i;
    });
    const score = mean(scores);
    return { id: a.id, label: a.label, score, tone: toneOf(score), peak: months[peakAt] as MonthSpan };
  });
  const ranked = [...all].sort((a, b) => b.score - a.score);
  const tend = ranked[ranked.length - 1];
  if (!tend) return null;
  return { all: ranked, top: ranked.slice(0, 3), tend };
}

// ─── days worth circling ────────────────────────────────────────────────────

/**
 * The best days to begin something: the top `n` of the range by the day picker's own ranking,
 * leaving out any day tradition sets aside and keeping the picks at least three days apart so the
 * three are three real choices. Returned in date order.
 */
export function circledDays(days: readonly PickDay[], n = 3): PickDay[] {
  const out: PickDay[] = [];
  for (const d of rankDays(days)) {
    if (d.setAside) continue;
    if (out.some((x) => Math.abs(x.startMs - d.startMs) < 2.5 * DAY)) continue;
    out.push(d);
    if (out.length === n) break;
  }
  return out.sort(byDate);
}

/** The next `n` named festivals on or after today, soonest first. */
export function comingFestivals(list: readonly Festival[], todayStartMs: number, n = 2): Festival[] {
  return list
    .filter((f) => f.kind === "festival" && f.dateMs >= todayStartMs - DAY / 2)
    .sort((a, b) => a.dateMs - b.dateMs)
    .filter((f, i, xs) => xs.findIndex((x) => x.key === f.key) === i)
    .slice(0, n);
}

/** Every eclipse in the list from today on, soonest first, each once. */
export function eclipsesIn(list: readonly Festival[], todayStartMs: number, endMs: number): Festival[] {
  return list
    .filter((f) => f.kind === "eclipse" && f.dateMs >= todayStartMs - DAY / 2 && f.dateMs < endMs)
    .sort((a, b) => a.dateMs - b.dateMs)
    .filter((f, i, xs) => xs.findIndex((x) => x.key === f.key) === i);
}

// ─── the closing sentence ───────────────────────────────────────────────────

/** One sentence that sums the year up from what the slides showed. */
export function closingLine(shape: YearShape, chapter: ChapterInfo | null): string {
  const best = listWords(shape.best.map((b) => b.month.label));
  const gentle = listWords(shape.gentle.map((g) => g.month.label));
  const head = `${shape.word === "Go gently" ? "A year to go gently" : `A ${shape.word.toLowerCase()} year`} by tradition's reckoning: lean into ${best}, keep ${gentle} unhurried`;
  return chapter ? `${head}, in ${GRAHA_ENGLISH[chapter.md.lord]}'s chapter of ${CHAPTER_SHORT[chapter.md.lord]}.` : `${head}.`;
}
