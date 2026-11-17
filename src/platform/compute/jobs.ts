// The named jobs the background worker can run. Every job is pure: plain data in, plain data out
// (both must survive a structured clone), and nothing here touches React, storage or the page.
// A job that "cannot be read" answers with its calm empty value (null or []) where the screen has
// words for that; the others throw and the caller decides.
import { type SkyEvent, skyEvents } from "../../engine/events";
import { type Festival, type FestivalKind, festivalsBetween, nextFestival } from "../../engine/festivals";
import { periodBounds } from "../../engine/forecast";
import { type SadeSatiResult, sadeSati } from "../../engine/gochar";
import { type PersonalReading, personalReading } from "../../engine/personal";
import { type ActivityId, type DaySky, daySkies, type PickDay, personOf, pickDays } from "../../engine/pickday";
import { safeZone } from "../../engine/time";
import type { EnginePreset, Patri } from "../../engine/types";
import { type PersonDay, readDay, type StarDay, starDays } from "../../features/family/family";
import { type PickTeaser, pickTeaser } from "../../features/pick/teaser";
import {
  type AreasOfYear,
  areasOfYear,
  CIRCLE_DAYS,
  circledDays,
  comingFestivals,
  DAY,
  eclipsesIn,
  type MonthReading,
  type MonthSpan,
  readMonth,
  type SlowPath,
  shapeOfYear,
  slowPaths,
  type YearShape,
  yearWindow,
} from "../../features/year/year";

const YEAR_MS = 365.25 * DAY;

interface Place {
  lat: number;
  lon: number;
  elevation?: number;
}
interface Here {
  lat: number;
  lon: number;
  zone: string;
}

/** What a year reading is made from: one chart, read from `nowMs` at the reader's place. */
export interface YearArgs {
  patri: Patri;
  nowMs: number;
  zone: string;
  lat: number;
  lon: number;
  preset: EnginePreset;
}

/** The twelve months of the year ahead and what follows from them. */
export interface YearMonths {
  months: MonthReading[];
  shape: YearShape | null;
  areas: AreasOfYear | null;
}

/** The rest of the story: the slow planets, Saturn's season, the days worth circling, the festivals. */
export interface YearStory {
  slow: SlowPath[];
  /** Null when no season of Saturn's touches the year. `running` is false when it begins inside the year. */
  season: { running: boolean; startMs: number } | null;
  /** Saturn's spells, for the season's wording (worded on the page, where the gochar feature lives). */
  spells: SadeSatiResult | null;
  days: PickDay[];
  circled: PickDay[];
  festivals: Festival[];
  eclipses: Festival[];
}

/** The next festival, as the home screen's one line needs it. */
export interface NextFestivalLine {
  name: string;
  sanskrit: string;
  /** 0 when it is today. */
  inDays: number;
  /** Local midnight that opens its civil day. */
  dateMs: number;
}

function yearRead({ patri, nowMs, zone, lat, lon, preset }: YearArgs): YearMonths {
  const z = safeZone(zone);
  const place = { lat, lon };
  const window = yearWindow(nowMs, z);
  const months: MonthReading[] = [];
  const readings: PersonalReading[] = [];
  for (const span of window) {
    months.push(readMonth(patri, span, z, preset, place));
    readings.push(personalReading(patri, span.midMs, preset));
  }
  return { months, shape: shapeOfYear(months), areas: areasOfYear(readings, window) };
}

function yearStory({ patri, nowMs, zone, lat, lon, preset }: YearArgs): YearStory {
  const z = safeZone(zone);
  const place = { lat, lon };
  const endMs = (yearWindow(nowMs, z)[11] as MonthSpan).endMs;
  const [todayMs] = periodBounds("day", nowMs, z);

  const slow = slowPaths(patri.grahas.MO.sign, nowMs, endMs, preset);
  // Nine years back holds the whole of a long season already under way.
  const ss = sadeSati(patri, nowMs - 9 * YEAR_MS, endMs + YEAR_MS, preset);
  const long = ss.spells.filter((s) => s.kind === "sade-sati" && s.endMs > nowMs && s.startMs < endMs)[0];
  const short = ss.spells.find((s) => s.kind !== "sade-sati" && nowMs >= s.startMs && nowMs < s.endMs);
  const season = long
    ? { running: long.startMs <= nowMs, startMs: long.startMs }
    : short
      ? { running: true, startMs: short.startMs }
      : null;

  // The day picker, a month at a time (noon keeps each chunk on its own civil day across clock changes).
  const picked: PickDay[] = [];
  const CHUNK = 30;
  for (let from = 0; from < CIRCLE_DAYS; from += CHUNK) {
    picked.push(
      ...pickDays({
        activity: "new",
        fromMs: todayMs + DAY / 2 + from * DAY,
        days: Math.min(CHUNK, CIRCLE_DAYS - from),
        place,
        zone: z,
        preset,
        person: personOf(patri),
      }),
    );
  }
  const days = picked.filter((d, i) => picked.findIndex((x) => x.startMs === d.startMs) === i);

  // The festival calendar in quarters: a short range is quick, a whole year is not.
  const found: Festival[] = [];
  const SPAN = 96;
  const total = Math.ceil((endMs - todayMs) / DAY);
  for (let from = 0; from < total; from += SPAN) {
    const a = todayMs + DAY / 2 + from * DAY;
    found.push(...festivalsBetween(a, a + (Math.min(SPAN, total - from) - 1) * DAY, place, z, preset));
  }

  return {
    slow,
    season,
    spells: season?.running ? ss : null,
    days,
    circled: circledDays(days),
    festivals: comingFestivals(found, todayMs),
    eclipses: eclipsesIn(found, todayMs, endMs),
  };
}

const calm = <T>(run: () => T, otherwise: T): T => {
  try {
    return run();
  } catch {
    return otherwise;
  }
};

export const JOBS = {
  /** The home screen's "Pick a good day" row. Null when the days could not be read. */
  pickTeaser: (a: { patri: Patri | null; nowMs: number; here: Here; preset: EnginePreset; activity?: ActivityId }): PickTeaser | null =>
    calm(() => pickTeaser(a.patri, a.nowMs, a.here, a.preset, a.activity ?? "new"), null),

  /** The next festival on or after today at the place. Null when none is found or it could not be read. */
  nextFestival: (a: {
    nowMs: number;
    place: Place;
    zone: string;
    preset: EnginePreset;
    kinds?: readonly FestivalKind[];
  }): NextFestivalLine | null =>
    calm(() => {
      const n = nextFestival(a.nowMs, a.place, a.zone, a.preset, a.kinds ?? ["festival"]);
      return n ? { name: n.festival.name, sanskrit: n.festival.sanskrit, inDays: n.inDays, dateMs: n.festival.dateMs } : null;
    }, null),

  yearRead,
  yearStory,

  /** "Coming up in the sky"; an empty list when nothing could be reckoned. */
  skyEvents: (a: { fromMs: number; days: number; place: { lat: number; lon: number }; preset: EnginePreset }): SkyEvent[] =>
    calm(() => skyEvents(a.fromMs, a.days, a.place, a.preset), []),

  /** One person's day for Family today; null when it could not be read. */
  familyDay: (a: { patri: Patri; nowMs: number; here: Here; preset: EnginePreset }): PersonDay | null =>
    calm(() => readDay(a.patri, a.nowMs, a.here, a.preset), null),

  /** The Moon's star at each sunrise for the next 30 days. */
  starDays: (a: { nowMs: number; place: { lat: number; lon: number }; zone: string; preset: EnginePreset }): StarDay[] =>
    calm(() => starDays(a.nowMs, a.place, a.zone, a.preset), []),

  /** The sky of each civil day from `fromMs`, as the day picker scores it. */
  daySkies: (a: { fromMs: number; days: number; place: { lat: number; lon: number }; zone: string; preset: EnginePreset }): DaySky[] =>
    calm(() => daySkies(a.fromMs, a.days, a.place, a.zone, a.preset), []),

  /** The festival calendar between two instants. Throws when it cannot be read. */
  festivalsBetween: (a: { fromMs: number; toMs: number; place: Place; zone: string; preset: EnginePreset }): Festival[] =>
    festivalsBetween(a.fromMs, a.toMs, a.place, a.zone, a.preset),
} as const;

export type JobName = keyof typeof JOBS;
export type Args<K extends JobName> = Parameters<(typeof JOBS)[K]>[0];
export type Result<K extends JobName> = ReturnType<(typeof JOBS)[K]>;

/** Run one job here, on whichever thread this is. */
export function runJob<K extends JobName>(job: K, args: Args<K>): Result<K> {
  const fn = JOBS[job] as ((a: Args<K>) => Result<K>) | undefined;
  if (!fn) throw new Error(`compute: no job named ${String(job)}`);
  return fn(args);
}
