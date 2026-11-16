// How a longer period unfolds: the week as seven rows that open, the month as a calendar with its
// best days in words, the quarter and year as one row per month.
import { useState } from "react";
import { ChevronRight, Section } from "../../components/ui/Page";
import { type DayRating, type Forecast, HOUSE_AREA, ord } from "../../engine/forecast";
import { AREA_WORD, DAY, fmt, HALF_DAY, pct, STAR_LINE, TARA_ENGLISH, TONE_WORD, type Tone, toneOf } from "./util";

const bestOf = (steps: DayRating[]) => [...steps].sort((a, b) => b.score - a.score)[0];
const longDay = (ms: number, zone: string) => fmt(ms + HALF_DAY, zone, { weekday: "long", day: "numeric", month: "short" });
const meter = (score: number) => `${Math.max(6, pct(score))}%`;

interface StepsProps {
  f: Forecast;
  zone: string;
  /** The present moment, to mark today. */
  now: number;
}

/** Seven days, one row each: the word, a thin meter, and the day's note on tap. */
export function WeekList({ f, zone, now, onOpenDay }: StepsProps & { onOpenDay: (ms: number) => void }) {
  const best = bestOf(f.steps);
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="v-stack fc-block">
      <Section title="Day by day" />
      <ol className="fc-list fc-days">
        {f.steps.map((s) => {
          const t = toneOf(s.score);
          const isToday = now >= s.ms && now < s.ms + DAY;
          const isOpen = open === s.ms;
          return (
            <li key={s.ms} data-tone={t}>
              <button
                type="button"
                className="fc-line fc-line--date"
                aria-expanded={isOpen}
                aria-label={`${longDay(s.ms, zone)}: ${AREA_WORD[t]}${s === best ? ", best day" : ""}${isToday ? ", today" : ""}`}
                onClick={() => setOpen(isOpen ? null : s.ms)}
              >
                <span className="fc-date" aria-hidden="true">
                  <span className="fc-date__k">{fmt(s.ms + HALF_DAY, zone, { weekday: "short" })}</span>
                  <span className="fc-date__n">{fmt(s.ms + HALF_DAY, zone, { day: "numeric" })}</span>
                </span>
                <span className="fc-line__t">
                  <span className="fc-word">{AREA_WORD[t]}</span>
                  {isToday ? <span className="fc-tag">Today</span> : null}
                  {s === best ? <span className="fc-tag fc-tag--best">Best day</span> : null}
                </span>
                <span className="v-meter" aria-hidden="true">
                  <span style={{ width: meter(s.score) }} />
                </span>
              </button>
              {isOpen ? (
                <div className="fc-line__more">
                  {s.tara ? (
                    <>
                      <p>
                        The mood turns toward {HOUSE_AREA[s.moonHouse]}. {STAR_LINE[s.taraTone]}
                      </p>
                      <p className="v-small v-muted">
                        Moon in your {ord(s.moonHouse)} house from your Moon sign · {s.tara} star
                        {TARA_ENGLISH[s.tara] ? ` (${TARA_ENGLISH[s.tara]})` : ""}
                      </p>
                    </>
                  ) : null}
                  <button type="button" className="v-link fc-open" onClick={() => onOpenDay(s.ms + HALF_DAY)}>
                    See this day in full <ChevronRight size={16} />
                  </button>
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
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
const SCALE: Tone[] = ["bright", "steady", "mixed", "testing"];

/** 0 = Monday … 6 = Sunday, in the zone. */
function monIndex(ms: number, zone: string): number {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(fmt(ms, zone, { weekday: "short" }));
}

/** The month as a calendar of soft tiles, then its best days in words. */
export function MonthGrid({ f, zone, now, onOpenDay }: StepsProps & { onOpenDay: (ms: number) => void }) {
  const best = bestOf(f.steps);
  const top = [...f.steps]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .sort((a, b) => a.ms - b.ms);
  return (
    <div className="v-stack fc-block">
      <Section title="Day by day" id="fc-month-h" />
      <section className="v-card fc-month" aria-labelledby="fc-month-h">
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
                className={`fc-cal__day${isToday ? " is-today" : ""}`}
                data-tone={t}
                title={`${longDay(s.ms, zone)}: ${AREA_WORD[t]}`}
                style={i === 0 ? { gridColumnStart: monIndex(s.ms + HALF_DAY, zone) + 1 } : undefined}
              >
                <span className="fc-cal__n" aria-hidden="true">
                  {fmt(s.ms + HALF_DAY, zone, { day: "numeric" })}
                </span>
                <span className="fc-cal__bar" aria-hidden="true">
                  <span style={{ width: meter(s.score) }} />
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
        <ul className="fc-key" aria-hidden="true">
          {SCALE.map((t) => (
            <li key={t} data-tone={t}>
              <i className="fc-dot" />
              {AREA_WORD[t]}
            </li>
          ))}
        </ul>
        {top.length ? (
          <div className="fc-best">
            <h3 className="fc-best__h">Best days</h3>
            <ul>
              {top.map((s) => (
                <li key={s.ms}>
                  <button type="button" className="fc-best__row" data-tone={toneOf(s.score)} onClick={() => onOpenDay(s.ms + HALF_DAY)}>
                    <span className="fc-best__d">{fmt(s.ms + HALF_DAY, zone, { weekday: "short", day: "numeric", month: "short" })}</span>
                    {s === best ? <span className="fc-tag fc-tag--best">Best day</span> : null}
                    <span className="fc-word">{AREA_WORD[toneOf(s.score)]}</span>
                    <ChevronRight size={16} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
    </div>
  );
}

/** Quarter and year: one row per month; a tap opens that month. */
export function MonthRows({ f, zone, now, onOpenMonth }: StepsProps & { onOpenMonth: (ms: number) => void }) {
  const best = bestOf(f.steps);
  return (
    <div className="v-stack fc-block">
      <Section title="Month by month" note="Read from the slow planets: Jupiter, Saturn and the Moon's nodes." />
      <ol className="fc-list fc-months">
        {f.steps.map((s, i) => {
          const t = toneOf(s.score);
          const end = f.steps[i + 1]?.ms ?? f.endMs;
          const isNow = now >= s.ms && now < end;
          const name = fmt(s.ms + DAY, zone, { month: "long" });
          return (
            <li key={s.ms} data-tone={t}>
              <button
                type="button"
                className="fc-line fc-line--go"
                aria-label={`${name}: ${TONE_WORD[t]}${s === best ? ", best month" : ""}${isNow ? ", this month" : ""}. Open this month`}
                onClick={() => onOpenMonth(s.ms + 2 * DAY)}
              >
                <span className="fc-line__t">
                  {name}
                  {isNow ? <span className="fc-tag">Now</span> : null}
                  {s === best ? <span className="fc-tag fc-tag--best">Best month</span> : null}
                </span>
                <span className="fc-word">{TONE_WORD[t]}</span>
                <ChevronRight size={16} />
                <span className="v-meter" aria-hidden="true">
                  <span style={{ width: meter(s.score) }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
