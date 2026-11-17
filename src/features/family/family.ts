// Family today: the pure part. Everyone's day read the way the home screen reads one person's, the
// sentence that sums the family up, civil birthdays, and "star birthdays" (the day each month the Moon
// returns to a person's birth star). Nothing here touches React or storage.
import { forecast, periodBounds } from "../../engine/forecast";
import { angasAt, computePanchang } from "../../engine/panchang";
import { personalReading } from "../../engine/personal";
import type { EnginePreset, Patri } from "../../engine/types";
import { pct, TONE_WORD, type Tone, toneOf } from "../forecast/util";

const DAY = 86_400_000;
const HALF_DAY = DAY / 2;
const STARS = 27;

// ─── one person's day ────────────────────────────────────────────────────────

export interface PersonDay {
  /** −1 … +1, the same number the home screen shows as "of 100". */
  score: number;
  tone: Tone;
  headline: string;
  /** Label of the strongest life area these weeks. */
  best: string;
  /** Label of the weakest life area these weeks. */
  gentle: string;
  /** The Moon's star at birth, 0 … 26. */
  birthStar: number;
}

/** Today for one chart, exactly as the home screen reads it: the civil day at the reader's place, read at its noon. */
export function readDay(patri: Patri, nowMs: number, here: { lat: number; lon: number; zone: string }, preset: EnginePreset): PersonDay {
  const [dayStart] = periodBounds("day", nowMs, here.zone);
  const f = forecast(patri, "day", dayStart + HALF_DAY, here.zone, preset, { lat: here.lat, lon: here.lon });
  const r = personalReading(patri, f.startMs + HALF_DAY, preset);
  const areas = [...r.areas].sort((a, b) => b.score - a.score);
  return {
    score: f.score,
    tone: f.tone,
    headline: f.headline,
    best: areas[0]?.label ?? "",
    gentle: areas[areas.length - 1]?.label ?? "",
    birthStar: patri.grahas.MO.nakshatra,
  };
}

/**
 * The plain first part of a day headline ("A steady day: ordinary progress, nothing to force."), without the
 * planet-by-planet clause the forecast adds after it. The whole headline when it has no such clause.
 */
export function shortHeadline(headline: string): string {
  const at = headline.search(/\s\S+ (helps with|asks for care with) /);
  return at > 0 ? headline.slice(0, at).trim() : headline.trim();
}

// ─── the family in one sentence ──────────────────────────────────────────────

export interface NamedScore {
  name: string;
  /** −1 … +1 */
  score: number;
}

export type FamilyKind = "none" | "one" | "all-strong" | "all-gentle" | "stands-out" | "all-good" | "most-good" | "mixed";

export interface FamilySentence {
  kind: FamilyKind;
  title: string;
  sub: string;
}

/** Best day first; equal scores keep the alphabet, so the order never flickers. */
export function byBestDay<T extends NamedScore>(people: readonly T[]): T[] {
  return [...people].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** How far ahead of the next person someone must be before the sentence singles them out (15 points of 100). */
export const STANDS_OUT_BY = 0.3;

/**
 * The sentence on the picture, from the day scores alone. In this order:
 *  1. one person saved: their own word;
 *  2. everyone Strong: "A strong day for the whole family";
 *  3. nobody Strong or Good: "A gentle day for everyone";
 *  4. the best day is Strong or Good and at least 15 points clear of the next: "<Name> has the strongest day";
 *  5. everyone Strong or Good: "A good day for the whole family";
 *  6. more than half Strong or Good: "A good day for most of the family";
 *  7. otherwise: "A mixed day for the family".
 */
export function familySentence(people: readonly NamedScore[]): FamilySentence {
  const n = people.length;
  if (n === 0) return { kind: "none", title: "", sub: "" };
  const sorted = byBestDay(people);
  const top = sorted[0] as NamedScore;
  if (n === 1) {
    const tone = toneOf(top.score);
    const word = tone === "testing" ? "gentle" : TONE_WORD[tone].toLowerCase();
    return { kind: "one", title: `A ${word} day for ${top.name}`, sub: `${pct(top.score)} of 100 today.` };
  }
  const good = sorted.filter((p) => p.score >= 0).length;
  const strong = sorted.filter((p) => toneOf(p.score) === "bright").length;
  const count =
    good === n
      ? `${n === 2 ? "Both" : `All ${n}`} have a Strong or Good day.`
      : good === 0
        ? "Nobody's day is marked Strong or Good."
        : `${good} of ${n} ${good === 1 ? "has" : "have"} a Strong or Good day.`;
  if (strong === n) return { kind: "all-strong", title: "A strong day for the whole family", sub: count };
  if (good === 0)
    return { kind: "all-gentle", title: "A gentle day for everyone", sub: "Tradition favours patience and finishing old work today." };
  const second = sorted[1] as NamedScore;
  if (top.score >= 0 && top.score - second.score >= STANDS_OUT_BY)
    return { kind: "stands-out", title: `${top.name} has the strongest day`, sub: count };
  if (good === n) return { kind: "all-good", title: "A good day for the whole family", sub: count };
  if (good * 2 > n) return { kind: "most-good", title: "A good day for most of the family", sub: count };
  return { kind: "mixed", title: "A mixed day for the family", sub: count };
}

/** "Priya Strong · Amma Good · +2 more": the home-screen teaser, best day first. */
export function familyTeaserLine(people: readonly NamedScore[], max = 3): string {
  const sorted = byBestDay(people);
  const shown = sorted.slice(0, max).map((p) => `${p.name} ${TONE_WORD[toneOf(p.score)]}`);
  if (sorted.length > max) shown.push(`+${sorted.length - max} more`);
  return shown.join(" · ");
}

// ─── civil dates ─────────────────────────────────────────────────────────────

export interface CivilDate {
  y: number;
  mo: number;
  d: number;
}

/** The calendar date at an instant in a zone. */
export function civilOf(ms: number, zone: string): CivilDate {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: zone })
      .formatToParts(ms)
      .map((x) => [x.type, x.value]),
  ) as Record<string, string>;
  return { y: Number(p.year), mo: Number(p.month), d: Number(p.day) };
}

const dayNumber = (c: CivilDate) => Math.round(Date.UTC(c.y, c.mo - 1, c.d) / DAY);
const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;

/** "Thu 19 Nov" (or with other Intl options) for a calendar date, whatever the device's own zone. */
export function dateWords(c: CivilDate, o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  return new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(Date.UTC(c.y, c.mo - 1, c.d, 12));
}

/** "today", "tomorrow", "in 12 days". */
export function inDaysWords(n: number): string {
  return n <= 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`;
}

export interface Birthday extends CivilDate {
  /** The age they turn on that day. */
  age: number;
  /** 0 = today. */
  inDays: number;
}

/**
 * The next birthday by the civil calendar, counted from today's date in the reader's zone. Today counts.
 * Someone born on 29 February keeps 28 February in a year without one.
 */
export function nextBirthday(birth: { localY: number; localMo: number; localD: number }, nowMs: number, zone: string): Birthday {
  const today = civilOf(nowMs, zone);
  const inYear = (y: number): CivilDate =>
    birth.localMo === 2 && birth.localD === 29 && !isLeap(y) ? { y, mo: 2, d: 28 } : { y, mo: birth.localMo, d: birth.localD };
  let date = inYear(today.y);
  if (dayNumber(date) < dayNumber(today)) date = inYear(today.y + 1);
  return { ...date, age: date.y - birth.localY, inDays: dayNumber(date) - dayNumber(today) };
}

// ─── star birthdays ──────────────────────────────────────────────────────────

/** One civil day at the reader's place, and the star the Moon is in at its sunrise. */
export interface StarDay extends CivilDate {
  /** Days from today, 0 = today. */
  offset: number;
  sunriseMs: number;
  /** 0 … 26 */
  star: number;
}

/** The longest the search looks ahead: the Moon comes back to any star in about 27.3 days. */
export const STAR_SEARCH_DAYS = 30;

/**
 * Today and the next `days` days at a place, each with the Moon's star at sunrise. One pass serves the whole
 * family: `nextStarBirthday` then only looks a star up. Steps civil days in `zone`, reading the almanac
 * (`computePanchang`) at each local noon for that day's sunrise.
 */
export function starDays(
  nowMs: number,
  place: { lat: number; lon: number },
  zone: string,
  preset: EnginePreset,
  days: number = STAR_SEARCH_DAYS,
): StarDay[] {
  const out: StarDay[] = [];
  let [start] = periodBounds("day", nowMs, zone);
  const span = Math.min(Math.max(0, Math.floor(days)), STAR_SEARCH_DAYS);
  for (let offset = 0; offset <= span; offset++) {
    const noon = start + HALF_DAY;
    const p = computePanchang(noon, { lat: place.lat, lon: place.lon }, preset);
    const star = angasAt(p.sunriseMs, preset.ayanamsa).nakshatra.index;
    out.push({ ...civilOf(noon, zone), offset, sunriseMs: p.sunriseMs, star });
    // a day and a half on is always inside the next civil day, clock changes included
    [start] = periodBounds("day", start + DAY + HALF_DAY, zone);
  }
  return out;
}

export interface StarBirthday extends CivilDate {
  inDays: number;
  /** "sunrise": the Moon is in the birth star as the day begins. "within": the star begins and ends inside this day. */
  how: "sunrise" | "within";
}

/**
 * The next day kept as the star birthday: the first day whose sunrise finds the Moon in the birth star. Now and
 * then a star begins after one sunrise and ends before the next; it is then kept on the day it falls within.
 * Null when the days given do not reach it.
 */
export function nextStarBirthday(ledger: readonly StarDay[], birthStar: number): StarBirthday | null {
  const before = (birthStar + STARS - 1) % STARS;
  const after = (birthStar + 1) % STARS;
  for (let i = 0; i < ledger.length; i++) {
    const day = ledger[i] as StarDay;
    const hit = (how: StarBirthday["how"]): StarBirthday => ({ y: day.y, mo: day.mo, d: day.d, inDays: day.offset, how });
    if (day.star === birthStar) return hit("sunrise");
    if (day.star === before && ledger[i + 1]?.star === after) return hit("within");
  }
  return null;
}

// ─── coming up ───────────────────────────────────────────────────────────────

export interface FamilyEvent extends CivilDate {
  personId: string;
  name: string;
  kind: "birthday" | "star";
  inDays: number;
  /** Birthdays only. */
  age?: number;
}

export interface EventSource {
  id: string;
  name: string;
  birthday: Birthday;
  star: StarBirthday | null;
}

/** Birthdays and star birthdays in the next `within` days across everyone, soonest first. */
export function comingUp(people: readonly EventSource[], within = 30): FamilyEvent[] {
  const out: FamilyEvent[] = [];
  for (const p of people) {
    const b = p.birthday;
    if (b.inDays <= within)
      out.push({ personId: p.id, name: p.name, kind: "birthday", inDays: b.inDays, y: b.y, mo: b.mo, d: b.d, age: b.age });
    const s = p.star;
    if (s && s.inDays <= within) out.push({ personId: p.id, name: p.name, kind: "star", inDays: s.inDays, y: s.y, mo: s.mo, d: s.d });
  }
  return out.sort(
    (a, b) => a.inDays - b.inDays || (a.kind === b.kind ? 0 : a.kind === "birthday" ? -1 : 1) || a.name.localeCompare(b.name),
  );
}
