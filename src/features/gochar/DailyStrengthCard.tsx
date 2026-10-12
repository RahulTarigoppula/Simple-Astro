// The day's personal strengths for one leaf: Tārā-bala and Candra-bala from today's Moon, and the
// running daśā (MD · AD · PD) with a thin rule for the pratyantar's elapsed share. ≤ 120 px tall.
import { useMemo } from "react";
import { GRAHA_NAMES, ORDINAL } from "../../data/tables/names";
import { chandraBala, currentDashaSummary, moonTransitAt, taraBala } from "../../engine/gochar";
import type { Patri } from "../../engine/types";
import { fmtDate, fmtDayMonthEngraved } from "./format";
import "./gochar.css";

export interface DailyStrengthCardProps {
  patri: Patri;
  nowMs: number;
  zone: string;
}

const TONE_TEXT = { kind: "kind", unkind: "asks care", mixed: "mixed" } as const;
const TONE_MARK = { kind: "✓", unkind: "·", mixed: "~" } as const;

export function DailyStrengthCard({ patri, nowMs, zone }: DailyStrengthCardProps) {
  const moonNow = useMemo(() => moonTransitAt(nowMs, patri.preset), [nowMs, patri.preset]);
  const tara = taraBala(patri.grahas.MO.nakshatra, moonNow.nakshatra);
  const chandra = chandraBala(patri.grahas.MO.sign, moonNow.sign);
  const dasha = useMemo(() => currentDashaSummary(patri, nowMs), [patri, nowMs]);
  const pct = dasha ? Math.round(dasha.pd.fraction * 100) : 0;

  return (
    <section className="gochar-day" aria-label="Today's strengths">
      <div className="engraved gochar-day__strip">
        <b>TĀRĀ · CANDRA · DAŚĀ</b>
        <span className="sep">·</span>
        {fmtDayMonthEngraved(nowMs, zone)}
      </div>
      <div className="gochar-day__bala">
        <p title={`${tara.citation.text}, ${tara.citation.ref}`}>
          <span className="k">Tārā</span> {tara.tara} {tara.name}{" "}
          <span className={`gochar-day__tone is-${tara.tone}`}>
            <span aria-hidden="true">{TONE_MARK[tara.tone]}</span> {TONE_TEXT[tara.tone]}
          </span>
        </p>
        <p title={`${chandra.citation.text}, ${chandra.citation.ref}`}>
          <span className="k">Candra</span> {ORDINAL(chandra.house)}{" "}
          <span className={`gochar-day__tone is-${chandra.favourable ? "kind" : "quiet"}`}>
            <span aria-hidden="true">{chandra.favourable ? "✓" : "·"}</span> {chandra.favourable ? "supportive" : "quiet"}
          </span>
        </p>
      </div>
      {dasha ? (
        <>
          <p className="gochar-day__dasha">
            <span className="gochar-day__lords">
              {GRAHA_NAMES[dasha.md.lord]} · {GRAHA_NAMES[dasha.ad.lord]} · {GRAHA_NAMES[dasha.pd.lord]}
            </span>
            <span className="gochar-day__until">until {fmtDate(dasha.nextChangeMs, zone)}</span>
          </p>
          <div
            className="gochar-day__rule"
            role="progressbar"
            aria-label={`${GRAHA_NAMES[dasha.pd.lord]} pratyantardaśā elapsed`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={pct}
            aria-valuetext={`${pct}%`}
          >
            <i style={{ transform: `scaleX(${dasha.pd.fraction})` }} />
          </div>
        </>
      ) : (
        <p className="gochar-day__dasha">
          <span className="gochar-day__lords">Outside the 120-year daśā cycle</span>
        </p>
      )}
    </section>
  );
}
