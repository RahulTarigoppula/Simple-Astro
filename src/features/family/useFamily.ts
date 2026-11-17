// The read side of Family today: every saved person's day, worked out in the background one chart at a
// time, so the screen paints first and each row fills in as it is ready.
import { useEffect, useMemo, useRef, useState } from "react";
import { hereFor } from "../../app/hooks";
import { castPatri } from "../../data/repo";
import { periodBounds } from "../../engine/forecast";
import { type EnginePreset, PRESET_HASH, type Profile, type Settings } from "../../engine/types";
import { compute, useCompute } from "../../platform/compute";
import type { PersonDay, StarDay } from "./family";

export interface FamilyRow {
  profile: Profile;
  /** undefined while the chart is being read, null when it could not be. */
  day: PersonDay | null | undefined;
}

/**
 * Today for everyone, in the order given. Each person's day is read at the same place the home screen
 * uses for them (the place set in Settings, else their own birthplace), through the same chart cache.
 */
export function useFamilyDays(profiles: readonly Profile[] | undefined, settings: Settings, now: number): FamilyRow[] {
  const preset = settings.preset;
  const jobs = useMemo(
    () =>
      (profiles ?? []).map((profile) => {
        const here = hereFor(settings, profile);
        const [dayStart] = periodBounds("day", now, here.zone);
        return {
          profile,
          here,
          dayStart,
          key: `${profile.id}|${profile.updatedAt}|${PRESET_HASH(preset)}|${dayStart}|${here.lat},${here.lon}`,
        };
      }),
    [profiles, settings, preset, now],
  );
  const done = useRef(new Map<string, PersonDay | null>());
  const [, bump] = useState(0);
  const wanted = jobs.map((j) => j.key).join("\n");

  // biome-ignore lint/correctness/useExhaustiveDependencies: `wanted` names every person, edit, preset, day and place
  useEffect(() => {
    let live = true;
    void (async () => {
      for (const job of jobs) {
        if (!live) return;
        if (done.current.has(job.key)) continue;
        let day: PersonDay | null = null;
        try {
          const patri = await castPatri(job.profile, preset);
          day = await compute("familyDay", { patri, nowMs: job.dayStart + 43_200_000, here: job.here, preset }, job.key);
        } catch {
          day = null;
        }
        if (!live) return;
        done.current.set(job.key, day);
        bump((n) => n + 1);
      }
      // yesterday's and edited-away answers are dropped once everyone is read
      const keep = new Set(jobs.map((j) => j.key));
      for (const k of [...done.current.keys()]) if (!keep.has(k)) done.current.delete(k);
    })();
    return () => {
      live = false;
    };
  }, [wanted]);

  return jobs.map((j) => ({ profile: j.profile, day: done.current.get(j.key) }));
}

/** The Moon's star at each sunrise for the next 30 days at the reader's place. Null until worked out (in the background). */
export function useStarDays(here: { lat: number; lon: number; zone: string } | null, now: number, preset: EnginePreset): StarDay[] | null {
  const key = here ? `${periodBounds("day", now, here.zone)[0]}|${here.lat},${here.lon}|${here.zone}|${PRESET_HASH(preset)}` : "";
  const args = here ? { nowMs: now, place: { lat: here.lat, lon: here.lon }, zone: here.zone, preset } : null;
  return useCompute("starDays", args, key) ?? null;
}
