// How a longer period unfolds: the week as seven days you can tap, the month as a calendar,
// the quarter and year as one bar per month.
import { useState } from "react";
import { ChevronRight } from "../../components/ui/Page";
import { type DayRating, type Forecast, HOUSE_AREA, ord } from "../../engine/forecast";
import { AREA_WORD, DAY, fmt, HALF_DAY, pct, STAR_LINE, TARA_ENGLISH, TONE_WORD, toneOf } from "./util";

const bestOf = (steps: DayRating[]) => [...steps].sort((a, b) => b.score - a.score)[0];
const barHeight = (score: number) => `${Math.round(18 + ((score + 1) / 2) * 82)}%`;
const longDay = (ms: number, zone: string) => fmt(ms + HALF_DAY, zone, { weekday: "long", day: "numeric", month: "short" });

interface StepsProps {
  f: Forecast;
  zone: string;
  /** The present moment, to mark today. */
  now: number;
}

/** Seven days side by side; the chosen day's note sits underneath. */
export function WeekStrip({ f, zone, now, onOpenDay }: StepsProps & { onOpenDay: (ms: number) => void }) {
  const today = f.steps.find((s) => now >= s.ms && now < s.ms + DAY);
  const best = bestOf(f.steps);
  const [picked, setPicked] = useState<number | null>(null);
  const sel = f.steps.find((s) => s.ms === picked) ?? today ?? best ?? f.steps[0];
  if (!sel) return null;
  const selTone = toneOf(sel.score);
  return (
    <section className="v-card fc-week" aria-labelledby="fc-week-h">
      <h2 id="fc-week-h" className="v-card__title">
        Day by day
      </h2>
      <p className="v-card__sub">Taller bar, better day. Tap a day.</p>
      <div className="fc-week__strip">
        {f.steps.map((s) => {
          const t = toneOf(s.score);
          return (
            <button
              key={s.ms}
              type="button"
              className={`fc-daycell${s === today ? " is-today" : ""}`}
              data-tone={t}
              aria-pressed={s === sel}
              aria-label={`${longDay(s.ms, zone)}: ${AREA_WORD[t]}${s === best ? ", best day" : ""}${s === today ? ", today" : ""}`}
              onClick={() => setPicked(s.ms)}
            >
              <span className="fc-daycell__k">{fmt(s.ms + HALF_DAY, zone, { weekday: "short" })}</span>
              <span className="fc-daycell__track" aria-hidden="true">
                <span style={{ height: barHeight(s.score) }} />
              </span>
              <span className="fc-daycell__d">{fmt(s.ms + HALF_DAY, zone, { day: "numeric" })}</span>
            </button>
          );
        })}
      </div>
      <div className="fc-week__note" data-tone={selTone} aria-live="polite">
        <p className="fc-week__when">
          <strong>{longDay(sel.ms, zone)}</strong>
          <span className="fc-word">{AREA_WORD[selTone]}</span>
          {sel === best ? <span className="v-chip v-chip--gold">Best day</span> : null}
          {sel === today ? <span className="v-chip">Today</span> : null}
        </p>
        {sel.tara ? (
          <>
            <p>
              The mood turns toward {HOUSE_AREA[sel.moonHouse]}. {STAR_LINE[sel.taraTone]}
            </p>
            <p className="v-small v-muted">
              Moon in your {ord(sel.moonHouse)} house from your Moon sign · {sel.tara} star
              {TARA_ENGLISH[sel.tara] ? ` (${TARA_ENGLISH[sel.tara]})` : ""}
            </p>
          </>
        ) : null}
        <button type="button" className="v-link fc-week__open" onClick={() => onOpenDay(sel.ms + HALF_DAY)}>
          See this day in full <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}

const WEEKDAYS = [
  ["mon", "M"],
  ["tue", "T"],
  ["wed", "W"],
  ["thu", "T"],
  ["fri", "F"],
  ["sat", "S"],
  ["sun", "S"],
] as const;

/** 0 = Monday … 6 = Sunday, in the zone. */
function monIndex(ms: number, zone: string): number {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(fmt(ms, zone, { weekday: "short" }));
}

/** The month as a calendar: one small bar per day. */
export function MonthGrid({ f, zone, now }: StepsProps) {
  const best = bestOf(f.steps);
  const top = [...f.steps]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.ms - b.ms);
  return (
    <section className="v-card fc-month" aria-labelledby="fc-month-h">
      <h2 id="fc-month-h" className="v-card__title">
        The month at a glance
      </h2>
      <p className="v-card__sub">Taller bar, better day. The star marks the best one.</p>
      <div className="fc-cal__wd" aria-hidden="true">
        {WEEKDAYS.map(([key, d]) => (
          <span key={key}>{d}</span>
        ))}
      </div>
      <ol className="fc-cal">
        {f.steps.map((s, i) => {
          const t = toneOf(s.score);
          const isToday = now >= s.ms && now < s.ms + DAY;
          return (
            <li
              key={s.ms}
              className={`fc-cal__day${s === best ? " is-best" : ""}${isToday ? " is-today" : ""}`}
              data-tone={t}
              title={`${longDay(s.ms, zone)}: ${AREA_WORD[t]}`}
              style={i === 0 ? { gridColumnStart: monIndex(s.ms + HALF_DAY, zone) + 1 } : undefined}
            >
              <span className="fc-cal__track" aria-hidden="true">
                <span style={{ height: barHeight(s.score) }} />
              </span>
              <span className="fc-cal__n" aria-hidden="true">
                {s === best ? "★" : ""}
                {fmt(s.ms + HALF_DAY, zone, { day: "numeric" })}
              </span>
              <span className="fc-sr">
                {longDay(s.ms, zone)}: {AREA_WORD[t]}
                {s === best ? ", best day" : ""}
                {isToday ? ", today" : ""}
              </span>
            </li>
          );
        })}
      </ol>
      {top.length ? (
        <p className="fc-best">
          <span className="fc-best__k">Best days</span>
          {top.map((s) => (
            <span key={s.ms} className={`v-chip${s === best ? " v-chip--gold" : " v-chip--good"}`}>
              {s === best ? "★ " : ""}
              {fmt(s.ms + HALF_DAY, zone, { weekday: "short", day: "numeric" })}
            </span>
          ))}
        </p>
      ) : null}
    </section>
  );
}

/** Quarter and year: one row per month. */
export function MonthRows({ f, zone, now }: StepsProps) {
  const best = bestOf(f.steps);
  return (
    <section className="v-card fc-months" aria-labelledby="fc-months-h">
      <h2 id="fc-months-h" className="v-card__title">
        Month by month
      </h2>
      <p className="v-card__sub">Read from the slow planets: Jupiter, Saturn and the Moon's nodes.</p>
      <ol className="fc-months__list">
        {f.steps.map((s, i) => {
          const t = toneOf(s.score);
          const end = f.steps[i + 1]?.ms ?? f.endMs;
          const isNow = now >= s.ms && now < end;
          return (
            <li key={s.ms} data-tone={t} className={s === best ? "is-best" : undefined}>
              <span className="fc-months__k">
                {fmt(s.ms + DAY, zone, { month: "short" })}
                {isNow ? <span className="fc-sr">, this month</span> : null}
              </span>
              <span className="v-meter" aria-hidden="true">
                <span style={{ width: `${Math.max(6, pct(s.score))}%` }} />
              </span>
              <span className="fc-months__w">
                {s === best ? "★ " : ""}
                {TONE_WORD[t]}
              </span>
            </li>
          );
        })}
      </ol>
      {best ? (
        <p className="fc-best">
          <span className="fc-best__k">Best month</span>
          <span className="v-chip v-chip--gold">★ {fmt(best.ms + DAY, zone, { month: "long" })}</span>
        </p>
      ) : null}
    </section>
  );
}
