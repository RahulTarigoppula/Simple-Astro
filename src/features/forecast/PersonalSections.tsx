// The personal blocks of a forecast: what the day is good for, its good hours named one by one,
// and the life areas as a quiet list that opens to say why.
import { InfoDot } from "../../components/ui/Explain";
import { Section } from "../../components/ui/Page";
import type { DayGuide, PersonalReading } from "../../engine/personal";
import { AREA_WORD, english, pct, span12, t12, toneOf } from "./util";

/** What the day suits and what to go easy on: two short plain lists side by side. */
export function DoLists({ g }: { g: DayGuide }) {
  return (
    <div className="v-card fc-do">
      <section aria-labelledby="fc-good-h">
        <h2 id="fc-good-h" className="fc-do__h" data-tone="bright">
          Good for
        </h2>
        <ul>
          {g.goodFor.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      <section aria-labelledby="fc-easy-h">
        <h2 id="fc-easy-h" className="fc-do__h" data-tone="mixed">
          Go easy on
        </h2>
        <ul>
          {g.easyOn.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

/** The one sentence a person needs about the day's hours, and whether this moment is good, held or neither. */
export function hoursLine(g: DayGuide, zone: string, now: number | null): { text: string; state: "good" | "avoid" | "idle" } {
  if (now === null) {
    const first = g.bestHours[0];
    return {
      state: "idle",
      text: first
        ? `${g.bestHours.length} good ${g.bestHours.length === 1 ? "hour" : "hours"} in daylight. The first starts at ${t12(first.startMs, zone)}.`
        : "No good hours outside Rāhu Kāla on this day.",
    };
  }
  if (now >= g.avoid[0] && now < g.avoid[1])
    return { state: "avoid", text: `Rāhu Kāla now. Hold new starts until ${t12(g.avoid[1], zone)}.` };
  const inBest = g.bestHours.find((h) => now >= h.startMs && now < h.endMs);
  if (inBest) return { state: "good", text: `A good hour now (${english(inBest.lord)} hour), until ${t12(inBest.endMs, zone)}.` };
  const next = g.bestHours.find((h) => h.startMs > now);
  if (next) return { state: "idle", text: `Next good hour starts at ${t12(next.startMs, zone)}.` };
  return { state: "idle", text: "The good hours of daylight are over for today." };
}

interface HoursProps {
  g: DayGuide;
  zone: string;
  /** A closing line inside the card (which place the times are for). */
  children?: React.ReactNode;
}

/** The hours of the day in words and numbers: the picture above shows them, this names them. */
export function HoursCard({ g, zone, children }: HoursProps) {
  return (
    <div className="v-stack fc-block">
      <Section title="Good times" id="fc-hours-h" />
      <section className="v-card fc-hours" aria-labelledby="fc-hours-h">
        <dl className="fc-times">
          <div>
            <dt>
              <i className="fc-dot fc-dot--good" aria-hidden="true" />
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
              <i className="fc-dot fc-dot--care" aria-hidden="true" />
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
