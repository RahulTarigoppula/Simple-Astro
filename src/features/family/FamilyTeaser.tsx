// A one-row door to Family today for the home screen: "Priya Strong · Amma Good · +2 more".
// Draws nothing until two or more people are saved. Kept apart from the screen so the home chunk stays small.
import { Link } from "react-router";
import { useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { ChevronRight } from "../../components/ui/Page";
import { familyTeaserLine } from "./family";
import { useFamilyDays } from "./useFamily";
import "./family.css";

export interface FamilyTeaserProps {
  /** How many people to name before "+N more". Default 3. */
  max?: number;
  /** Where the row leads. Default "/family". */
  to?: string;
}

export function FamilyTeaser({ max = 3, to = "/family" }: FamilyTeaserProps) {
  const profiles = useProfiles();
  const settings = useSettings();
  const now = useNowMs(60_000);
  const several = !!profiles && profiles.length >= 2;
  const rows = useFamilyDays(several ? profiles : undefined, settings, now);
  if (!several) return null;
  const settled = rows.every((r) => r.day !== undefined);
  const read = rows.flatMap((r) => (r.day ? [{ name: r.profile.name, score: r.day.score }] : []));
  const line = !settled ? "Reading everyone's day…" : read.length ? familyTeaserLine(read, max) : "Everyone's day, side by side";
  return (
    <Link to={to} className="v-row fam-teaser">
      <span className="fam-teaser__icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
          <circle cx="8" cy="9" r="3" />
          <circle cx="17" cy="10" r="2.4" />
          <path d="M2.5 19c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M14.5 14.6c.8-.4 1.6-.6 2.5-.6 2.2 0 4 1.4 4.5 4" />
        </svg>
      </span>
      <span className="v-row__body">
        <span className="v-row__t">Family today</span>
        <span className="v-row__s">{line}</span>
      </span>
      <ChevronRight />
    </Link>
  );
}
