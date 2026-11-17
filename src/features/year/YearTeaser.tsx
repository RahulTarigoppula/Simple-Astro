// A row for another screen (Home, Forecast): "Your year ahead", with the year's word and best month
// once they are known. The twelve months behind it are read when the browser is idle, never while
// the screen that shows the row is drawing, and are shared with the story itself.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile, useHere, usePatri, useSettings } from "../../app/hooks";
import { ChevronRight } from "../../components/ui/Page";
import type { Profile } from "../../engine/types";
import { useYear } from "./useYear";
import { teaserSub } from "./year";

/** The feature's mark: a ring of twelve months. */
export function YearMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" aria-hidden="true">
      <circle cx="12" cy="12" r="8.4" strokeDasharray="2.9 1.5" />
      <circle cx="12" cy="12" r="2" fill="currentColor" stroke="none" />
    </svg>
  );
}

interface TeaserProps {
  /** The person the row is for; the active person when omitted. */
  profile?: Profile | null;
  className?: string;
}

/** `<YearTeaser />`: a `.v-row` link to the story. Renders nothing when nobody is saved. */
export function YearTeaser({ profile: given, className }: TeaserProps) {
  const active = useActiveProfile();
  const profile = given === undefined ? active : given;
  const settings = useSettings();
  const { patri } = usePatri(profile, settings.preset);
  const { zone, lat, lon } = useHere(profile);
  const [nowMs] = useState(Date.now);
  const ready = patri && profile && patri.profileId === profile.id ? patri : null;
  const input = useMemo(
    () => (ready ? { patri: ready, nowMs, zone, lat, lon, preset: settings.preset } : null),
    [ready, nowMs, zone, lat, lon, settings.preset],
  );
  const data = useYear(input, profile ? `${profile.id}|${profile.updatedAt}` : "", "months");
  if (!profile) return null;
  return (
    <Link to={`/year/${profile.id}`} className={className ? `v-row ${className}` : "v-row"}>
      <span className="v-row__icon v-row__icon--gold" aria-hidden="true">
        <YearMark />
      </span>
      <span className="v-row__body">
        <span className="v-row__t">Your year ahead</span>
        <span className="v-row__s">{data?.shape ? teaserSub(data.shape) : "The next twelve months, as a short story"}</span>
      </span>
      <ChevronRight />
    </Link>
  );
}
