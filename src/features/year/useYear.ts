// The year is read a little at a time, when the browser is idle, so the first slide never waits:
// one month per step, then the slow planets, the days worth circling and the festivals. A reading
// is kept for the session (per person, place and day), so the teaser row and the story share it.
import { useEffect, useState, useSyncExternalStore } from "react";
import { type Festival, festivalsBetween } from "../../engine/festivals";
import { periodBounds } from "../../engine/forecast";
import { sadeSati } from "../../engine/gochar";
import { type PersonalReading, personalReading } from "../../engine/personal";
import { type PickDay, personOf, pickDays } from "../../engine/pickday";
import { safeZone } from "../../engine/time";
import type { EnginePreset, Patri } from "../../engine/types";
import type { SeasonNow } from "../gochar/GocharSection";
import {
  type AreasOfYear,
  areasOfYear,
  type ChapterInfo,
  CIRCLE_DAYS,
  chapterOfYear,
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
} from "./year";

const YEAR_MS = 365.25 * DAY;

export interface SaturnSeason {
  /** True when the season is already running today; false when it begins inside the year. */
  running: boolean;
  startMs: number;
  /** The gochar feature's own words for the season running today (only when `running`). */
  words: SeasonNow | null;
}

export interface YearData {
  key: string;
  nowMs: number;
  todayMs: number;
  zone: string;
  window: MonthSpan[];
  endMs: number;
  /** Grows from none to twelve as the months are read. */
  months: MonthReading[];
  shape: YearShape | null;
  areas: AreasOfYear | null;
  chapter: ChapterInfo | null;
  slow: SlowPath[] | null;
  /** undefined while unread, null when no season of Saturn's touches the year. */
  season: SaturnSeason | null | undefined;
  days: PickDay[] | null;
  circled: PickDay[] | null;
  festivals: Festival[] | null;
  eclipses: Festival[] | null;
  done: boolean;
}

export type YearLevel = "months" | "all";

interface Job {
  data: YearData;
  steps: Array<{ level: YearLevel; run: () => void | Promise<void> }>;
  next: number;
  want: YearLevel;
  running: boolean;
  subs: Set<() => void>;
}

const JOBS = new Map<string, Job>();

type IdleWin = { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
const later = (run: () => void): void => {
  const w = window as unknown as IdleWin;
  if (typeof w.requestIdleCallback === "function") w.requestIdleCallback(run, { timeout: 400 });
  else window.setTimeout(run, 0);
};

interface Input {
  patri: Patri;
  nowMs: number;
  zone: string;
  lat: number;
  lon: number;
  preset: EnginePreset;
}

function makeJob(key: string, { patri, nowMs, zone, lat, lon, preset }: Input): Job {
  const z = safeZone(zone);
  const place = { lat, lon };
  const window = yearWindow(nowMs, z);
  const endMs = (window[11] as MonthSpan).endMs;
  const [todayMs] = periodBounds("day", nowMs, z);
  const job: Job = {
    data: {
      key,
      nowMs,
      todayMs,
      zone: z,
      window,
      endMs,
      months: [],
      shape: null,
      areas: null,
      chapter: chapterOfYear(patri.dasha, nowMs, endMs),
      slow: null,
      season: undefined,
      days: null,
      circled: null,
      festivals: null,
      eclipses: null,
      done: false,
    },
    steps: [],
    next: 0,
    want: "months",
    running: false,
    subs: new Set(),
  };
  const set = (patch: Partial<YearData>) => {
    job.data = { ...job.data, ...patch };
  };
  const readings: PersonalReading[] = [];
  for (const span of window) {
    job.steps.push({
      level: "months",
      run: () => {
        const months = [...job.data.months, readMonth(patri, span, z, preset, place)];
        readings.push(personalReading(patri, span.midMs, preset));
        set(months.length === 12 ? { months, shape: shapeOfYear(months), areas: areasOfYear(readings, window) } : { months });
      },
    });
  }
  job.steps.push({
    level: "all",
    // The season's wording belongs to the gochar feature; it is fetched only when the story needs it.
    run: async () => {
      const { seasonNow } = await import("../gochar/GocharSection");
      const slow = slowPaths(patri.grahas.MO.sign, nowMs, endMs, preset);
      // Nine years back holds the whole of a long season already under way.
      const ss = sadeSati(patri, nowMs - 9 * YEAR_MS, endMs + YEAR_MS, preset);
      const long = ss.spells.filter((s) => s.kind === "sade-sati" && s.endMs > nowMs && s.startMs < endMs)[0];
      const short = ss.spells.find((s) => s.kind !== "sade-sati" && nowMs >= s.startMs && nowMs < s.endMs);
      const season: SaturnSeason | null = long
        ? { running: long.startMs <= nowMs, startMs: long.startMs, words: long.startMs <= nowMs ? seasonNow(ss, nowMs, z) : null }
        : short
          ? { running: true, startMs: short.startMs, words: seasonNow(ss, nowMs, z) }
          : null;
      set({ slow, season });
    },
  });
  // The day picker, a month at a time (noon keeps each chunk on its own civil day across clock changes).
  const picked: PickDay[] = [];
  const CHUNK = 30;
  for (let from = 0; from < CIRCLE_DAYS; from += CHUNK) {
    job.steps.push({
      level: "all",
      run: () => {
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
        if (from + CHUNK >= CIRCLE_DAYS) {
          const days = picked.filter((d, i) => picked.findIndex((x) => x.startMs === d.startMs) === i);
          set({ days, circled: circledDays(days) });
        }
      },
    });
  }
  // The festival calendar in quarters: a short range is quick, a whole year is not.
  const found: Festival[] = [];
  const SPAN = 96;
  const total = Math.ceil((endMs - todayMs) / DAY);
  for (let from = 0; from < total; from += SPAN) {
    job.steps.push({
      level: "all",
      run: () => {
        const a = todayMs + DAY / 2 + from * DAY;
        found.push(...festivalsBetween(a, a + (Math.min(SPAN, total - from) - 1) * DAY, place, z, preset));
        if (from + SPAN >= total) set({ festivals: comingFestivals(found, todayMs), eclipses: eclipsesIn(found, todayMs, endMs) });
      },
    });
  }
  return job;
}

function pump(job: Job): void {
  if (job.running) return;
  const step = job.steps[job.next];
  if (!step || (step.level === "all" && job.want !== "all")) return;
  job.running = true;
  later(() => {
    const after = () => {
      job.running = false;
      job.next += 1;
      if (job.next >= job.steps.length) job.data = { ...job.data, done: true };
      for (const s of job.subs) s();
      pump(job);
    };
    // a step that cannot be read leaves its slide on the calm placeholder
    try {
      const r = step.run();
      if (r) r.then(after, after);
      else after();
    } catch {
      after();
    }
  });
}

const NONE = () => () => {};
const NULL = () => null;

/**
 * The year ahead for one person at the reader's place. Returns null until there is a chart; then a
 * reading that fills in step by step. `level` "months" stops after the twelve months (enough for the
 * teaser); "all" reads everything the story shows.
 */
export function useYear(input: Input | null, personKey: string, level: YearLevel): YearData | null {
  // The clock is read once per civil day: the same reading serves every minute of it.
  const [today] = input ? periodBounds("day", input.nowMs, safeZone(input.zone)) : [0];
  const key = input
    ? `${personKey}|${today}|${safeZone(input.zone)}|${input.lat.toFixed(3)},${input.lon.toFixed(3)}|${JSON.stringify(input.preset)}`
    : "";
  const [job, setJob] = useState<Job | null>(null);
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the person, the day, the place and the preset
  useEffect(() => {
    if (!input) {
      setJob(null);
      return;
    }
    let j = JOBS.get(key);
    if (!j) {
      if (JOBS.size > 5) JOBS.clear();
      j = makeJob(key, input);
      JOBS.set(key, j);
    }
    if (level === "all") j.want = "all";
    setJob(j);
    pump(j);
  }, [key, level]);
  const live = job && job.data.key === key ? job : null;
  return useSyncExternalStore(
    live
      ? (cb) => {
          live.subs.add(cb);
          return () => live.subs.delete(cb);
        }
      : NONE,
    live ? () => live.data : NULL,
  );
}

/** Forget every reading (tests). */
export function resetYearCache(): void {
  JOBS.clear();
}
