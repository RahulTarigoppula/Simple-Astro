// The year is read in the background (see `platform/compute`), so the first slide never waits: the
// twelve months first, then the slow planets, the days worth circling and the festivals. A reading
// is kept for the session (per person, place and day), so the teaser row and the story share it.
import { useEffect, useMemo, useState } from "react";
import type { Festival } from "../../engine/festivals";
import { periodBounds } from "../../engine/forecast";
import type { PickDay } from "../../engine/pickday";
import { safeZone } from "../../engine/time";
import { resetCompute, useCompute, type YearArgs } from "../../platform/compute";
import type { SeasonNow } from "../gochar/GocharSection";
import {
  type AreasOfYear,
  type ChapterInfo,
  chapterOfYear,
  type MonthReading,
  type MonthSpan,
  type SlowPath,
  type YearShape,
  yearWindow,
} from "./year";

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

type Input = YearArgs;

const NO_MONTHS: MonthReading[] = [];

/**
 * The year ahead for one person at the reader's place. Returns null until there is a chart; then a
 * reading that fills in as the background work comes back. `level` "months" stops after the twelve
 * months (enough for the teaser); "all" reads everything the story shows.
 */
export function useYear(input: Input | null, personKey: string, level: YearLevel): YearData | null {
  // The clock is read once per civil day: the same reading serves every minute of it.
  const [today] = input ? periodBounds("day", input.nowMs, safeZone(input.zone)) : [0];
  const key = input
    ? `${personKey}|${today}|${safeZone(input.zone)}|${input.lat.toFixed(3)},${input.lon.toFixed(3)}|${JSON.stringify(input.preset)}`
    : "";
  // The frame of the year is light and is drawn at once; the same instant serves the whole civil day.
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the person, the day, the place and the preset
  const frame = useMemo(() => {
    if (!input) return null;
    const zone = safeZone(input.zone);
    const window = yearWindow(input.nowMs, zone);
    const endMs = (window[11] as MonthSpan).endMs;
    return {
      args: input,
      nowMs: input.nowMs,
      todayMs: today,
      zone,
      window,
      endMs,
      chapter: chapterOfYear(input.patri.dasha, input.nowMs, endMs),
    };
  }, [key]);
  const args = frame?.args ?? null;
  const read = useCompute("yearRead", args, key);
  const story = useCompute("yearStory", level === "all" ? args : null, key);

  // The season's wording belongs to the gochar feature; it is fetched only when the story needs it.
  const [words, setWords] = useState<{ key: string; words: SeasonNow | null } | null>(null);
  const spells = story?.spells ?? null;
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the instant and the zone
  useEffect(() => {
    if (!spells || !frame) return;
    let live = true;
    const { nowMs, zone } = frame;
    import("../gochar/GocharSection").then(
      ({ seasonNow }) => {
        if (!live) return;
        try {
          setWords({ key, words: seasonNow(spells, nowMs, zone) });
        } catch {
          setWords({ key, words: null });
        }
      },
      () => {
        if (live) setWords({ key, words: null });
      },
    );
    return () => {
      live = false;
    };
  }, [key, spells]);

  return useMemo(() => {
    if (!frame) return null;
    const worded = !spells || words?.key === key;
    const told = !!story && worded;
    return {
      key,
      nowMs: frame.nowMs,
      todayMs: frame.todayMs,
      zone: frame.zone,
      window: frame.window,
      endMs: frame.endMs,
      months: read?.months ?? NO_MONTHS,
      shape: read?.shape ?? null,
      areas: read?.areas ?? null,
      chapter: frame.chapter,
      slow: told ? story.slow : null,
      season: !told ? undefined : story.season ? { ...story.season, words: spells && words ? words.words : null } : null,
      days: story?.days ?? null,
      circled: story?.circled ?? null,
      festivals: story?.festivals ?? null,
      eclipses: story?.eclipses ?? null,
      done: !!read && told,
    };
  }, [frame, key, read, story, spells, words]);
}

/** Forget every reading (tests). */
export function resetYearCache(): void {
  resetCompute();
}
