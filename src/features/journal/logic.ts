// "Your days": the pure part. Day keys, the four words, what "agreed" means, the sentence on the band,
// the calendar grid and which question (if any) the home card asks. No storage, no clock of its own.
import type { JournalMood, JournalRow, JournalTone } from "../../data/db";
import { periodBounds } from "../../engine/forecast";
import { safeZone } from "../../engine/time";
import { TONE_WORD } from "../forecast/util";

export const MOODS: ReadonlyArray<{ mood: JournalMood; word: string }> = [
  { mood: 4, word: "Great" },
  { mood: 3, word: "Good" },
  { mood: 2, word: "Mixed" },
  { mood: 1, word: "Hard" },
];
export const moodWord = (m: JournalMood): string => MOODS.find((x) => x.mood === m)?.word ?? "";
/** The sky's word for a stored tone, in the app's one scale (Strong, Good, Mixed, Go gently). */
export const skyWord = (t: JournalTone | null): string | null => (t ? TONE_WORD[t] : null);

/** The civil day of an instant in a zone, "YYYY-MM-DD". */
export function dayKey(ms: number, zone: string): string {
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: safeZone(zone) }).format(ms);
}

const parts = (day: string): [number, number, number] => {
  const [y, m, d] = day.split("-").map(Number);
  return [y ?? 1970, m ?? 1, d ?? 1];
};

/** A day key moved by whole days (calendar arithmetic, no zone involved). */
export function addDays(day: string, n: number): string {
  const [y, m, d] = parts(day);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(day: string): number {
  const [y, m, d] = parts(day);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

/** Local noon of a day key in a zone: the instant the day's forecast is read at. */
export function noonMs(day: string, zone: string): number {
  const z = safeZone(zone);
  const [y, m, d] = parts(day);
  let t = Date.UTC(y, m - 1, d, 12);
  // Far east or west of Greenwich, UTC noon can fall on the neighbouring civil day.
  const got = dayKey(t, z);
  if (got !== day) t += got < day ? 43_200_000 : -43_200_000;
  return periodBounds("day", t, z)[0] + 43_200_000;
}

/** "Mon 16 Nov" (or with the year / long forms via `o`). */
export function dayLabel(day: string, o: Intl.DateTimeFormatOptions = { weekday: "short", day: "numeric", month: "short" }): string {
  const [y, m, d] = parts(day);
  return new Intl.DateTimeFormat("en-GB", { ...o, timeZone: "UTC" }).format(Date.UTC(y, m - 1, d, 12));
}

// ─── agreement ─────────────────────────────────────────────────────────────────

/** The scale has two halves. Upper: the sky said Strong or Good; the person said Great or Good. */
export const skyUpper = (t: JournalTone): boolean => t === "bright" || t === "steady";
export const moodUpper = (m: JournalMood): boolean => m >= 3;

/**
 * Did the sky and the person agree on a day? Yes when both fall in the same half of the scale:
 * (Strong or Good) with (Great or Good), or (Mixed or Go gently) with (Mixed or Hard).
 * null when nothing was stored for the sky that day, so there is nothing to compare.
 */
export function agreed(e: Pick<JournalRow, "mood" | "predictedTone">): boolean | null {
  if (!e.predictedTone) return null;
  return skyUpper(e.predictedTone) === moodUpper(e.mood);
}

export interface JournalSummary {
  /** Days with an entry. */
  noted: number;
  /** Of those, days that have a stored word from the sky. */
  compared: number;
  /** Of those, days where both fell in the same half. */
  agreed: number;
}

export function summarize(entries: ReadonlyArray<Pick<JournalRow, "mood" | "predictedTone">>): JournalSummary {
  let compared = 0;
  let same = 0;
  for (const e of entries) {
    const a = agreed(e);
    if (a === null) continue;
    compared++;
    if (a) same++;
  }
  return { noted: entries.length, compared, agreed: same };
}

/** Fewer days than this and any count would be noise, so no statistic is shown. */
export const MIN_FOR_PATTERN = 5;

/** The sentence on the picture band. A count, never a verdict. */
export function headline(s: JournalSummary): string {
  if (s.noted === 0) return "How did your day really go?";
  if (s.compared < MIN_FOR_PATTERN) return "Note a few more days to see a pattern";
  const days = `${s.noted} days noted.`;
  return s.compared === s.noted
    ? `${days} The sky and you agreed on ${s.agreed}.`
    : `${days} The sky and you agreed on ${s.agreed} of ${s.compared}.`;
}

/** The small line under it. */
export function subline(s: JournalSummary): string {
  if (s.noted === 0) return "";
  if (s.compared < MIN_FOR_PATTERN) return `${s.noted} ${s.noted === 1 ? "day" : "days"} noted so far.`;
  return "A mirror to look into, not a score. Neither of you is being marked.";
}

// ─── the grid ──────────────────────────────────────────────────────────────────

export interface GridCell {
  day: string;
  /** After today: drawn as an empty place, never tappable. */
  future: boolean;
  today: boolean;
  entry: JournalRow | null;
}

/** Whole weeks, Monday first, ending with the week that holds today. Oldest week first. */
export function gridWeeks(today: string, weeks: number, entries: ReadonlyArray<JournalRow>): GridCell[][] {
  const byDay = new Map(entries.map((e) => [e.day, e]));
  const first = addDays(today, -weekdayOf(today) - 7 * (weeks - 1));
  const out: GridCell[][] = [];
  for (let w = 0; w < weeks; w++) {
    const row: GridCell[] = [];
    for (let i = 0; i < 7; i++) {
      const day = addDays(first, w * 7 + i);
      row.push({ day, future: day > today, today: day === today, entry: byDay.get(day) ?? null });
    }
    out.push(row);
  }
  return out;
}

/** Five weeks at least; up to eight once the notes reach that far back. */
export function weeksToShow(today: string, entries: ReadonlyArray<JournalRow>): number {
  const oldest = entries[0]?.day;
  if (!oldest) return 5;
  const monday = addDays(today, -weekdayOf(today));
  const [y, m, d] = parts(monday);
  const [oy, om, od] = parts(oldest);
  const back = Math.ceil((Date.UTC(y, m - 1, d) - Date.UTC(oy, om - 1, od)) / (7 * 86_400_000));
  return Math.max(5, Math.min(8, back + 1));
}

/** Entries grouped by month, newest month and newest day first. */
export function byMonth(entries: ReadonlyArray<JournalRow>): Array<{ month: string; label: string; rows: JournalRow[] }> {
  const out: Array<{ month: string; label: string; rows: JournalRow[] }> = [];
  for (const e of [...entries].sort((a, b) => (a.day < b.day ? 1 : -1))) {
    const month = e.day.slice(0, 7);
    let g = out[out.length - 1];
    if (!g || g.month !== month) {
      g = { month, label: dayLabel(`${month}-01`, { month: "long", year: "numeric" }), rows: [] };
      out.push(g);
    }
    g.rows.push(e);
  }
  return out;
}

/** The notes as plain text, for "Copy my notes". */
export function exportText(name: string, entries: ReadonlyArray<JournalRow>): string {
  const lines = [...entries]
    .sort((a, b) => (a.day < b.day ? 1 : -1))
    .map((e) => {
      const sky = skyWord(e.predictedTone);
      const head = `${dayLabel(e.day, { weekday: "short", day: "numeric", month: "short", year: "numeric" })}: ${moodWord(e.mood)}`;
      return `${head}${sky ? ` (the sky said ${sky})` : ""}${e.note ? `\n  ${e.note}` : ""}`;
    });
  return [`${name}'s days, from Vyomaphala`, "", ...lines].join("\n");
}

// ─── the home card ─────────────────────────────────────────────────────────────

export const hourIn = (ms: number, zone: string): number =>
  Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: safeZone(zone) }).format(ms)) % 24;

/** From this hour the card asks about today; before it, about yesterday. */
export const EVENING_HOUR = 17;

export type PromptState =
  | { kind: "ask"; which: "today" | "yesterday"; day: string }
  | { kind: "done"; which: "today" | "yesterday"; day: string };

/**
 * What the home card shows. Today once it is noted; otherwise the question for today from 5 pm,
 * and before that the question for yesterday if yesterday was never noted.
 */
export function promptState(nowMs: number, zone: string, has: (day: string) => boolean): PromptState {
  const today = dayKey(nowMs, zone);
  const yesterday = addDays(today, -1);
  if (has(today)) return { kind: "done", which: "today", day: today };
  if (hourIn(nowMs, zone) >= EVENING_HOUR) return { kind: "ask", which: "today", day: today };
  if (!has(yesterday)) return { kind: "ask", which: "yesterday", day: yesterday };
  return { kind: "done", which: "yesterday", day: yesterday };
}

// "Not today" is remembered per person for the civil day, in the browser (a `vyom-` key, so a wipe clears it).
const SKIP_KEY = "vyom-journal-skip";

function readSkips(): Record<string, string> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(SKIP_KEY) ?? "{}");
    return typeof v === "object" && v !== null ? (v as Record<string, string>) : {};
  } catch {
    return {};
  }
}
export function isSkipped(profileId: string, today: string): boolean {
  return readSkips()[profileId] === today;
}
export function setSkipped(profileId: string, today: string | null): void {
  try {
    const all = readSkips();
    if (today) all[profileId] = today;
    else delete all[profileId];
    localStorage.setItem(SKIP_KEY, JSON.stringify(all));
  } catch {
    // storage may be unavailable; the card simply shows again
  }
}
