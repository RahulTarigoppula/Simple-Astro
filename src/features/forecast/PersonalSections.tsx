// The personal blocks of a forecast: what the day is good for (inside the hero), its good hours as
// one bar and one sentence, and the life areas as a quiet list that opens to say why.
import { InfoDot } from "../../components/ui/Explain";
import { Section } from "../../components/ui/Page";
import type { DayGuide, PersonalReading } from "../../engine/personal";
import { AREA_WORD, english, pct, span12, t12, toneOf } from "./util";

/** Two short plain lists, side by side under a hairline: lives inside the hero card. */
export function DoLists({ g }: { g: DayGuide }) {
  return (
    <div className="fc-do">
      <section aria-labelledby="fc-good-h">
        <h3 id="fc-good-h" className="fc-do__h" data-tone="bright">
          Good for
        </h3>
        <ul>
          {g.goodFor.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="fc-easy-h">
        <h3 id="fc-easy-h" className="fc-do__h" data-tone="mixed">
          Go easy on
        </h3>
        <ul>
          {g.easyOn.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

interface HoursProps {
  g: DayGuide;
  zone: string;
  /** Sunrise and sunset of the day, for the daylight bar. */
  sun: { riseMs: number; setMs: number } | null;
  /** The present moment when the day shown is today, else null. */
  now: number | null;
  /** A closing line inside the card (which place the times are for). */
  children?: React.ReactNode;
}

/** The one sentence a person needs about the day's hours. */
function hoursLine(g: DayGuide, zone: string, now: number | null): string {
  if (now === null) {
    const first = g.bestHours[0];
    return first
      ? `${g.bestHours.length} good ${g.bestHours.length === 1 ? "hour" : "hours"} in daylight. The first starts at ${t12(first.startMs, zone)}.`
      : "No good hours outside Rāhu Kāla on this day.";
  }
  if (now >= g.avoid[0] && now < g.avoid[1]) return `Right now: Rāhu Kāla. Hold new starts until ${t12(g.avoid[1], zone)}.`;
  const inBest = g.bestHours.find((h) => now >= h.startMs && now < h.endMs);
  if (inBest) return `Right now: a good hour (${english(inBest.lord)} hour), until ${t12(inBest.endMs, zone)}.`;
  const next = g.bestHours.find((h) => h.startMs > now);
  if (next) return `Next good hour starts at ${t12(next.startMs, zone)}.`;
  return "The good hours of daylight are over for today.";
}

export function HoursCard({ g, zone, sun, now, children }: HoursProps) {
  const span = sun ? Math.max(1, sun.setMs - sun.riseMs) : 1;
  const at = (ms: number) => (sun ? Math.min(100, Math.max(0, ((ms - sun.riseMs) / span) * 100)) : 0);
  return (
    <div className="v-stack fc-block">
      <Section title="Good times" id="fc-hours-h" />
      <section className="v-card fc-hours" aria-labelledby="fc-hours-h">
        <p className="fc-hours__now">{hoursLine(g, zone, now)}</p>
        {sun ? (
          <div className="fc-day" aria-hidden="true">
            <div className="fc-daybar">
              {g.bestHours.map((h) => (
                <span
                  key={h.startMs}
                  className="fc-daybar__good"
                  style={{ left: `${at(h.startMs)}%`, width: `${at(h.endMs) - at(h.startMs)}%` }}
                />
              ))}
              <span className="fc-daybar__avoid" style={{ left: `${at(g.avoid[0])}%`, width: `${at(g.avoid[1]) - at(g.avoid[0])}%` }} />
              {now !== null && now >= sun.riseMs && now <= sun.setMs ? (
                <span className="fc-daybar__now" style={{ left: `${at(now)}%` }} />
              ) : null}
            </div>
            <div className="fc-day__ends">
              <span>Sunrise {t12(sun.riseMs, zone)}</span>
              <span>Sunset {t12(sun.setMs, zone)}</span>
            </div>
            <div className="fc-day__key">
              <span>
                <i className="fc-dot fc-dot--good" />
                Good hours
              </span>
              <span>
                <i className="fc-dot fc-dot--care" />
                Pause new starts
              </span>
            </div>
          </div>
        ) : null}
        <details className="fc-in">
          <summary>All the times</summary>
          <dl className="fc-times">
            <div>
              <dt>
                Good hours <InfoDot id="hora" />
              </dt>
              {g.bestHours.length ? (
                g.bestHours.map((h) => (
                  <dd key={h.startMs}>
                    <span className="fc-times__t">{span12(h.startMs, h.endMs, zone)}</span>
                    <span className="fc-times__w">{english(h.lord)} hour</span>
                  </dd>
                ))
              ) : (
                <dd className="v-muted">None outside Rāhu Kāla today.</dd>
              )}
            </div>
            <div>
              <dt>
                Pause new starts <InfoDot id="rahu-kala" label="Rāhu Kāla" />
              </dt>
              <dd>
                <span className="fc-times__t">{span12(g.avoid[0], g.avoid[1], zone)}</span>
                <span className="fc-times__w">Rāhu Kāla</span>
              </dd>
            </div>
            <div>
              <dt>Colour of the day</dt>
              <dd>
                <span className="fc-times__t">{g.colour}</span>
                <span className="fc-times__w">{english(g.lord)}'s day</span>
              </dd>
            </div>
          </dl>
        </details>
        {children}
      </section>
    </div>
  );
}

/** Life areas, best first: a name, a word and a thin meter; opening one gives the reason and what suits it. */
export function AreasCard({ r, title }: { r: PersonalReading; title: string }) {
  const sorted = [...r.areas].sort((a, b) => b.score - a.score);
  return (
    <div className="v-stack fc-block">
      <Section
        title={
          <>
            {title} <InfoDot id="bhava" />
          </>
        }
      />
      <ul className="fc-list fc-areas">
        {sorted.map((a) => {
          const t = toneOf(a.score);
          return (
            <li key={a.id} data-tone={t}>
              <details>
                <summary className="fc-line">
                  <span className="fc-line__t">{a.label}</span>
                  <span className="fc-word">{AREA_WORD[t]}</span>
                  <span className="v-meter" aria-hidden="true">
                    <span style={{ width: `${Math.max(6, pct(a.score))}%` }} />
                  </span>
                </summary>
                <div className="fc-line__more">
                  <p>
                    <strong>Good for:</strong> {a.good}.
                  </p>
                  <p>
                    <strong>Go easy on:</strong> {a.easy}.
                  </p>
                  {a.why ? <p className="v-small v-muted">Why: {a.why}</p> : null}
                </div>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
