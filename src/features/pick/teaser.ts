// One line for another screen (the home screen, say): the next good day for one undertaking.
import { type ActivityId, activityOf, nextGoodDay, type PickDay, personOf } from "../../engine/pickday";
import type { EnginePreset, Patri } from "../../engine/types";
import { fmt, TONE_WORD } from "../forecast/util";

export interface PickTeaser {
  /** "Pick a good day". */
  title: string;
  /** "Next good day to start something new: Friday 20 November". */
  sub: string;
  /** Where the row leads: the Pick screen for this person and undertaking. */
  to: string;
  day: PickDay;
}

/**
 * The next day in the coming two weeks that tradition calls Strong for the undertaking (else the
 * best of them), for the person of `patri` or, with null, for anyone. Reads 14 days of almanac, so
 * call it inside a `useMemo` keyed on the start of the civil day, the place and the person.
 */
export function pickTeaser(
  patri: Patri | null,
  nowMs: number,
  here: { lat: number; lon: number; zone: string },
  preset: EnginePreset,
  activity: ActivityId = "new",
): PickTeaser | null {
  const day = nextGoodDay({
    activity,
    fromMs: nowMs,
    days: 14,
    place: { lat: here.lat, lon: here.lon },
    zone: here.zone,
    preset,
    person: patri ? personOf(patri) : null,
  });
  if (!day) return null;
  const a = activityOf(activity);
  const date = fmt(day.noonMs, here.zone, { weekday: "long", day: "numeric", month: "long" });
  const strong = day.tone === "bright";
  const base = patri ? `/pick/${patri.profileId}` : "/pick";
  return {
    title: "Pick a good day",
    sub: `${strong ? "Next good day" : "Kindest day soon"} ${a.phrase}: ${date}${strong ? "" : ` (${TONE_WORD[day.tone]})`}`,
    to: activity === "new" ? base : `${base}?for=${activity}`,
    day,
  };
}
