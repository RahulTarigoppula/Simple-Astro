// The personal cards of a forecast: what the day is good for, its good hours, the Moon in one
// sentence, and the life areas as compact meters that open to say why.
import { InfoDot } from "../../components/ui/Explain";
import { Section } from "../../components/ui/Page";
import { type DayRating, HOUSE_AREA, ord } from "../../engine/forecast";
import type { DayGuide, PersonalReading } from "../../engine/personal";
import { MoonDisc } from "../home/MoonDisc";
import { AREA_WORD, english, pct, STAR_LINE, span12, TARA_ENGLISH, t12, toneOf } from "./util";

export function DoCards({ g }: { g: DayGuide }) {
  return (
    <div className="v-grid2 fc-do">
      <section className="v-card" aria-labelledby="fc-good-h">
        <h2 id="fc-good-h" className="fc-do__h fc-do__h--good">
          Good for
        </h2>
        <ul>
          {g.goodFor.map((x) => (
            <li key={x}>{x}</li>
          ))}
        </ul>
      </section>
      <section className="v-card" aria-labelledby="fc-easy-h">
        <h2 id="fc-easy-h" className="fc-do__h fc-do__h--easy">
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

export function HoursCard({ g, zone, sun, now, children }: HoursProps) {
  const span = sun ? Math.max(1, sun.setMs - sun.riseMs) : 1;
  const at = (ms: number) => (sun ? Math.min(100, Math.max(0, ((ms - sun.riseMs) / span) * 100)) : 0);
  const inAvoid = now !== null && now >= g.avoid[0] && now < g.avoid[1];
  const inBest = now !== null ? g.bestHours.find((h) => now >= h.startMs && now < h.endMs) : undefined;
  const nextBest = now !== null ? g.bestHours.find((h) => h.startMs > now) : undefined;
  return (
    <section className="v-card fc-hours" aria-labelledby="fc-hours-h">
      <h2 id="fc-hours-h" className="v-card__title">
        Good times
      </h2>
      {now !== null ? (
        <p className="fc-hours__now">
          {inAvoid
            ? `Right now: Rāhu Kāla. Hold new starts until ${t12(g.avoid[1], zone)}.`
            : inBest
              ? `Right now: a good hour (${english(inBest.lord)} hour), until ${t12(inBest.endMs, zone)}.`
              : nextBest
                ? `Next good hour starts at ${t12(nextBest.startMs, zone)}.`
                : "The good hours of daylight are over for today."}
        </p>
      ) : null}
      {sun ? (
        <>
          <div className="fc-daybar" aria-hidden="true">
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
          <div className="fc-daybar__ends" aria-hidden="true">
            <span>Sunrise {t12(sun.riseMs, zone)}</span>
            <span>Sunset {t12(sun.setMs, zone)}</span>
          </div>
        </>
      ) : null}
      <dl className="fc-hours__list">
        <div>
          <dt>
            <i className="fc-dot fc-dot--good" aria-hidden="true" />
            Best hours <InfoDot id="hora" />
          </dt>
          <dd>
            {g.bestHours.length ? (
              g.bestHours.map((h) => (
                <span key={h.startMs} className="v-chip v-chip--good fc-chip">
                  {span12(h.startMs, h.endMs, zone)} · {english(h.lord)} hour
                </span>
              ))
            ) : (
              <span className="v-muted">None outside Rāhu Kāla today.</span>
            )}
          </dd>
        </div>
        <div>
          <dt>
            <i className="fc-dot fc-dot--care" aria-hidden="true" />
            Pause new starts <InfoDot id="rahu-kala" label="Rāhu Kāla" />
          </dt>
          <dd>
            <span className="v-chip v-chip--care fc-chip">{span12(g.avoid[0], g.avoid[1], zone)} · Rāhu Kāla</span>
          </dd>
        </div>
        <div>
          <dt>Colour of the day</dt>
          <dd>
            <span className="v-chip fc-chip">
              {g.colour} · {english(g.lord)}'s day
            </span>
          </dd>
        </div>
      </dl>
      {children}
    </section>
  );
}

export function MoonCard({ step, elongation }: { step: DayRating; elongation: number | null }) {
  const taraWord = TARA_ENGLISH[step.tara];
  return (
    <section className="v-card fc-moon" aria-labelledby="fc-moon-h">
      {elongation !== null ? <MoonDisc elongation={elongation} size={52} /> : null}
      <div className="fc-moon__body">
        <h2 id="fc-moon-h" className="v-card__title">
          The Moon today
        </h2>
        <p>
          The mood turns toward {HOUSE_AREA[step.moonHouse]}. {STAR_LINE[step.taraTone]}
        </p>
        <p className="v-small v-muted fc-moon__fine">
          Moon in your {ord(step.moonHouse)} house from your Moon sign <InfoDot id="chandra-bala" /> · {step.tara} star
          {taraWord ? ` (${taraWord})` : ""} <InfoDot id="tara-bala" />
        </p>
      </div>
    </section>
  );
}

/** Life areas, best first: a meter each; opening one gives the reason and what suits it. */
export function AreasCard({ r, title, split }: { r: PersonalReading; title: string; split?: boolean }) {
  const sorted = [...r.areas].sort((a, b) => b.score - a.score);
  return (
    <div className="v-stack fc-areas-wrap">
      <Section
        title={
          <>
            {title} <InfoDot id="bhava" />
          </>
        }
        note="Tap an area to see why."
      />
      <ul className={`fc-areas${split ? " fc-areas--split" : ""}`}>
        {sorted.map((a) => {
          const t = toneOf(a.score);
          return (
            <li key={a.id} data-tone={t}>
              <details>
                <summary>
                  <span className="fc-areas__l">{a.label}</span>
                  <span className="fc-areas__w">{AREA_WORD[t]}</span>
                  <span className="v-meter" aria-hidden="true">
                    <span style={{ width: `${Math.max(6, pct(a.score))}%` }} />
                  </span>
                </summary>
                <div className="fc-areas__more">
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
