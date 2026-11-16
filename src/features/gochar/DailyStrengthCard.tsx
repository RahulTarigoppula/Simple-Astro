// Today for one person, answer first: one plain sentence (where today's Moon falls counted from the
// birth Moon, and whether the day's star is a kind one), then at most three plain chips: the Moon's
// support (Candra-bala), the day's star (Tārā-bala) and the running life chapter (daśā). The Sanskrit
// names are the small lines, each with its ⓘ.
import { useMemo } from "react";
import { InfoDot } from "../../components/ui/Explain";
import { GRAHA_ENGLISH, GRAHA_NAMES, ORDINAL } from "../../data/tables/names";
import { HOUSE_THEME } from "../../engine/ashtakavarga";
import { chandraBala, currentDashaSummary, moonTransitAt, taraBala } from "../../engine/gochar";
import type { Patri } from "../../engine/types";
import { fmtDate, fmtDayMonth } from "./format";
import "./gochar.css";

export interface DailyStrengthCardProps {
  patri: Patri;
  nowMs: number;
  zone: string;
}

const TONE_TEXT = { kind: "kind", unkind: "asks care", mixed: "mixed" } as const;
const TONE_MARK = { kind: "✓", unkind: "·", mixed: "~" } as const;
const TONE_CHIP = { kind: "good", unkind: "care", mixed: "mixed" } as const;
const STAR_LINE = {
  kind: "The day's star is a kind one.",
  mixed: "The day's star is a mixed one.",
  unkind: "The day's star asks for a gentler pace.",
} as const;

export function DailyStrengthCard({ patri, nowMs, zone }: DailyStrengthCardProps) {
  const moonNow = useMemo(() => moonTransitAt(nowMs, patri.preset), [nowMs, patri.preset]);
  const tara = taraBala(patri.grahas.MO.nakshatra, moonNow.nakshatra);
  const chandra = chandraBala(patri.grahas.MO.sign, moonNow.sign);
  const dasha = useMemo(() => currentDashaSummary(patri, nowMs), [patri, nowMs]);
  const pct = dasha ? Math.round(dasha.pd.fraction * 100) : 0;
  const theme = HOUSE_THEME[chandra.house - 1] ?? "";

  return (
    <section className="v-card v-card--hero gochar-day" aria-label="Today for this chart">
      <p className="v-eyebrow">Today · {fmtDayMonth(nowMs, zone)}</p>
      <h2 className="gochar-day__h">
        Today the Moon is in your {ORDINAL(chandra.house)} area: {theme}. {STAR_LINE[tara.tone]}
      </h2>
      <ul className="gochar-day__facts">
        <li title={`${chandra.citation.text}, ${chandra.citation.ref}`}>
          <span className={`v-chip${chandra.favourable ? " v-chip--good" : ""}`}>
            <span aria-hidden="true">{chandra.favourable ? "✓" : "·"}</span> Moon's support: {chandra.favourable ? "good" : "quiet"}
          </span>
          <span className="gochar-day__sk">
            Candra-bala · today's Moon is in the {ORDINAL(chandra.house)} sign from yours <InfoDot id="chandra-bala" label="Candra-bala" />
          </span>
        </li>
        <li title={`${tara.citation.text}, ${tara.citation.ref}`}>
          <span className={`v-chip v-chip--${TONE_CHIP[tara.tone]}`}>
            <span aria-hidden="true">{TONE_MARK[tara.tone]}</span> Day's star: {TONE_TEXT[tara.tone]}
          </span>
          <span className="gochar-day__sk">
            Tārā-bala · Tārā {tara.tara} {tara.name} <InfoDot id="tara-bala" label="Tārā-bala" />
          </span>
        </li>
        {dasha ? (
          <li>
            <span className="v-chip v-chip--gold">Life chapter: {GRAHA_ENGLISH[dasha.md.lord]}</span>
            <span className="gochar-day__sk">
              Daśā · {GRAHA_ENGLISH[dasha.md.lord]} · {GRAHA_ENGLISH[dasha.ad.lord]} · {GRAHA_ENGLISH[dasha.pd.lord]}{" "}
              <InfoDot id="dasha" label="daśā" />
            </span>
            <div
              className="v-meter"
              role="progressbar"
              aria-label={`${GRAHA_NAMES[dasha.pd.lord]} pratyantardaśā elapsed`}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={pct}
              aria-valuetext={`${pct}%`}
            >
              <span style={{ width: `${Math.max(2, pct)}%` }} />
            </div>
            <span className="gochar-day__sk">
              The shortest stretch ({GRAHA_ENGLISH[dasha.pd.lord]}) runs until {fmtDate(dasha.nextChangeMs, zone)}
            </span>
          </li>
        ) : (
          <li>
            <span className="gochar-day__sk">Outside the 120-year daśā cycle</span>
          </li>
        )}
      </ul>
    </section>
  );
}
