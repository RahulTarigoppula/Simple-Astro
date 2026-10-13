// The Bond reading, shown first on Milan: one score, five plain bars, what is strong, what to work on,
// what each person brings, and one tip. The 36-bead mala and its rules sit under "Full detail".
import { useMemo } from "react";
import { rashiName } from "../../data/regional";
import { MOON_TRAITS } from "../../data/traits";
import "../cosmic/cosmic.css";
import { bondReading } from "../../engine/bond";
import type { MilanResult, Patri, Profile } from "../../engine/types";

const first = (n: string) => n.split(/\s+/)[0] ?? n;

export function BondCard({ r, pa, pb, patA, patB }: { r: MilanResult; pa: Profile; pb: Profile; patA: Patri; patB: Patri }) {
  const an = first(pa.name);
  const bn = first(pb.name);
  const b = useMemo(() => bondReading(r, an, bn), [r, an, bn]);
  const ma = MOON_TRAITS[patA.grahas.MO.sign];
  const mb = MOON_TRAITS[patB.grahas.MO.sign];
  const R = 46;
  const C = 2 * Math.PI * R;

  return (
    <section className="bond" aria-labelledby="bond-h">
      <div className="bond__top">
        <svg className="bond__ring" viewBox="0 0 110 110" role="img" aria-label={`Bond score ${b.score} out of 100`}>
          <circle cx="55" cy="55" r={R} className="bond__ring-bg" />
          <circle
            cx="55"
            cy="55"
            r={R}
            className={`bond__ring-fg bond__ring-fg--${b.score >= 69 ? "hi" : b.score >= 50 ? "mid" : "lo"}`}
            strokeDasharray={`${(b.score / 100) * C} ${C}`}
            transform="rotate(-90 55 55)"
          />
          <text x="55" y="60" textAnchor="middle" className="bond__ring-n">
            {b.score}
          </text>
          <text x="55" y="76" textAnchor="middle" className="bond__ring-of">
            of 100
          </text>
        </svg>
        <div>
          <p className="bond__kicker">
            {an} <span aria-hidden="true">♥</span> {bn} · Bond
          </p>
          <h2 id="bond-h" className="bond__h">
            {b.headline}
          </h2>
          <p className="bond__sum">
            {b.summary} Guna Milan: {r.total} of 36.
          </p>
        </div>
      </div>

      <ul className="bond__bars">
        {b.parts.map((p) => (
          <li key={p.id} className={`bond__bar bond__bar--${p.level}`}>
            <div className="bond__bar-top">
              <span className="bond__bar-k">{p.label}</span>
              <span className="bond__bar-v">{p.score}</span>
            </div>
            <span className="bond__track" aria-hidden="true">
              <i style={{ width: `${Math.max(4, p.score)}%` }} />
            </span>
            <p className="bond__line">{p.line}</p>
          </li>
        ))}
      </ul>

      {b.best.length || b.workOn.length ? (
        <div className="life__pm">
          {b.best.length ? (
            <div className="life__plus">
              <p className="life__k">Strongest together</p>
              <ul>
                {b.best.map((p) => (
                  <li key={p.id}>{p.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {b.workOn.length ? (
            <div className="life__minus">
              <p className="life__k">Work on</p>
              <ul>
                {b.workOn.map((p) => (
                  <li key={p.id}>{p.label}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : null}

      <dl className="life__dl">
        <div>
          <dt>
            What {an} brings · {rashiName(patA.grahas.MO.sign, pa.tradition)} Moon
          </dt>
          <dd>{ma?.love}</dd>
        </div>
        <div>
          <dt>
            What {bn} brings · {rashiName(patB.grahas.MO.sign, pb.tradition)} Moon
          </dt>
          <dd>{mb?.love}</dd>
        </div>
        <div>
          <dt>One thing to try</dt>
          <dd>{b.tip}</dd>
        </div>
        <div>
          <dt>Manglik</dt>
          <dd>{b.manglik}</dd>
        </div>
      </dl>

      <p className="life__note">
        Read from your two Moons, the way families have matched horoscopes for centuries. It is tradition, not a prediction about two real
        people. Respect, kindness and effort decide the rest.
      </p>
    </section>
  );
}
