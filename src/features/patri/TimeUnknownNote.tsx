// For a leaf without a clock time: say what can and cannot be trusted, and whether the Moon moved
// between the two ends of that local day.
import { useMemo } from "react";
import { NAKSHATRA_NAMES, SIGN_NAMES } from "../../data/tables/names";
import { moonTransitAt, type TransitGraha } from "../../engine/gochar";
import { resolveBirthMoment } from "../../engine/time";
import type { EnginePreset, Patri, Profile } from "../../engine/types";

type Moon = Pick<TransitGraha, "sign" | "nakshatra">;

/** The Moon at the first local clock time in `tries` that exists on the birth day, or null. */
function moonAtLocal(profile: Profile, preset: EnginePreset, tries: ReadonlyArray<readonly [number, number]>): Moon | null {
  const b = profile.birth;
  for (const [h, mi] of tries) {
    try {
      const m = resolveBirthMoment({
        localY: b.localY,
        localMo: b.localMo,
        localD: b.localD,
        localH: h,
        localMi: mi,
        place: b.place,
        zoneOverride: b.zone,
        ...(b.offsetOverrideMin != null ? { offsetOverrideMin: b.offsetOverrideMin } : {}),
      });
      return moonTransitAt(m.utcMs, preset);
    } catch {
      // that clock time did not exist (a clock change at the day's edge) — try the next one
    }
  }
  return null;
}

/** The Moon at the two ends of the birth day (00:00 or 01:00, 23:59 or 23:00); null where neither resolves. Exported for tests. */
export function moonAcrossDay(profile: Profile, preset: EnginePreset): { dawn: Moon | null; dusk: Moon | null } {
  return {
    dawn: moonAtLocal(profile, preset, [
      [0, 0],
      [1, 0],
    ]),
    dusk: moonAtLocal(profile, preset, [
      [23, 59],
      [23, 0],
    ]),
  };
}

/** The sentence about the Moon for a time-unknown leaf. Exported for tests. */
export function moonDaySentence(dawn: Moon | null, dusk: Moon | null, noon: Moon): string {
  if (!dawn || !dusk) {
    return `The Moon was in ${NAKSHATRA_NAMES[noon.nakshatra]} (${SIGN_NAMES[noon.sign]}) at noon; whether it stayed there all day could not be checked, as a clock change falls at the day's edge.`;
  }
  if (dawn.sign !== dusk.sign || dawn.nakshatra !== dusk.nakshatra) {
    return `The Moon moved that day from ${NAKSHATRA_NAMES[dawn.nakshatra]} in ${SIGN_NAMES[dawn.sign]} to ${NAKSHATRA_NAMES[dusk.nakshatra]} in ${SIGN_NAMES[dusk.sign]}, so even its nakṣatra is uncertain.`;
  }
  return `The Moon stayed in ${NAKSHATRA_NAMES[noon.nakshatra]} (${SIGN_NAMES[noon.sign]}) all day, so the Moon sign, nakṣatra and Guna Milan hold.`;
}

export function TimeUnknownNote({ profile, patri }: { profile: Profile; patri: Patri }) {
  const { dawn, dusk } = useMemo(() => moonAcrossDay(profile, patri.preset), [profile, patri.preset]);
  return (
    <p className="note-haldi note--keep" role="note" style={{ margin: "var(--space-3) 0 0" }}>
      <span aria-hidden="true">⚑</span>
      <span>
        Birth time unknown, so the chart is cast for local noon. The Lagna, houses, Navāṃśa and daśā dates are not reliable.{" "}
        {moonDaySentence(dawn, dusk, patri.grahas.MO)}
      </span>
    </p>
  );
}
