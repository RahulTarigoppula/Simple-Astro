// The day's personal strengths for one person: star strength (Tārā-bala) and Moon strength
// (Candra-bala) from today's Moon, and the running life chapter (MD · AD · PD) with a thin bar for
// how much of the shortest stretch has passed.
import { useMemo } from "react";
import { InfoDot } from "../../components/ui/Explain";
import { GRAHA_ENGLISH, GRAHA_NAMES, ORDINAL } from "../../data/tables/names";
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

export function DailyStrengthCard({ patri, nowMs, zone }: DailyStrengthCardProps) {
  const moonNow = useMemo(() => moonTransitAt(nowMs, patri.preset), [nowMs, patri.preset]);
  const tara = taraBala(patri.grahas.MO.nakshatra, moonNow.nakshatra);
  const chandra = chandraBala(patri.grahas.MO.sign, moonNow.sign);
  const dasha = useMemo(() => currentDashaSummary(patri, nowMs), [patri, nowMs]);
  const pct = dasha ? Math.round(dasha.pd.fraction * 100) : 0;

  return (
    <section className="v-card v-card--hero gochar-day" aria-label="Today's strengths">
      <p className="v-eyebrow">Today · {fmtDayMonth(nowMs, zone)}</p>
      <h2 className="gochar-day__h">How today's Moon sits with yours</h2>
      <dl className="gochar-day__bala">
        <div title={`${tara.citation.text}, ${tara.citation.ref}`}>
          <dt>
            Star strength <span className="gochar-day__sk">Tārā-bala</span> <InfoDot id="tara-bala" label="Tārā-bala" />
          </dt>
          <dd>
            <span className="gochar-day__v">
              Tārā {tara.tara} {tara.name}
            </span>
            <span className={`v-chip v-chip--${TONE_CHIP[tara.tone]}`}>
              <span aria-hidden="true">{TONE_MARK[tara.tone]}</span> {TONE_TEXT[tara.tone]}
            </span>
          </dd>
        </div>
        <div title={`${chandra.citation.text}, ${chandra.citation.ref}`}>
          <dt>
            Moon strength <span className="gochar-day__sk">Candra-bala</span> <InfoDot id="chandra-bala" label="Candra-bala" />
          </dt>
          <dd>
            <span className="gochar-day__v">Today's Moon is in the {ORDINAL(chandra.house)} sign from yours</span>
            <span className={`v-chip${chandra.favourable ? " v-chip--good" : ""}`}>
              <span aria-hidden="true">{chandra.favourable ? "✓" : "·"}</span> {chandra.favourable ? "supportive" : "quiet"}
            </span>
          </dd>
        </div>
      </dl>
      {dasha ? (
        <div className="gochar-day__dasha">
          <p className="gochar-day__k">
            Life chapter now <span className="gochar-day__sk">daśā</span>
          </p>
          <p className="gochar-day__lords">
            {GRAHA_ENGLISH[dasha.md.lord]} · {GRAHA_ENGLISH[dasha.ad.lord]} · {GRAHA_ENGLISH[dasha.pd.lord]}
          </p>
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
          <p className="gochar-day__until">
            The shortest stretch ({GRAHA_ENGLISH[dasha.pd.lord]}) runs until {fmtDate(dasha.nextChangeMs, zone)}
          </p>
        </div>
      ) : (
        <p className="gochar-day__lords">Outside the 120-year daśā cycle</p>
      )}
    </section>
  );
}
