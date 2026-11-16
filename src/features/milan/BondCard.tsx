// The answer, shown first on Match: one large word, the score and a plain sentence; then the five
// things people ask about as one quiet list, and one thing to try. Everything else (the signs of
// marriage, what each person brings, Manglik, and the astrology passed in as children) waits in folds.
// Every number and sentence is bondReading()'s output.
import { useMemo, useState } from "react";
import { InfoDot } from "../../components/ui/Explain";
import { Section } from "../../components/ui/Page";
import { Avatar } from "../../components/ui/PersonChip";
import { rashiName } from "../../data/regional";
import { MOON_TRAITS } from "../../data/traits";
import { type BondLevel, bondReading } from "../../engine/bond";
import type { MilanResult, Patri, Profile } from "../../engine/types";
import { fmtPts } from "./rules";

const first = (n: string) => n.split(/\s+/)[0] ?? n;

type Tone = "bright" | "steady" | "mixed" | "testing";
const LEVEL_TONE: Record<BondLevel, Tone> = { strong: "bright", good: "steady", mixed: "mixed", weak: "testing" };
const LEVEL_WORD: Record<BondLevel, string> = { strong: "Strong", good: "Good", mixed: "Mixed", weak: "Needs care" };
const BAND_WORD: Record<MilanResult["band"], string> = {
  excellent: "Excellent",
  "very-good": "Strong",
  acceptable: "Good",
  "not-recommended": "Needs work",
};
/** Said first when the traditional verdict is the lowest band, in place of a bare "not recommended". */
export const FLAGGED_LEAD = "Tradition flags this pairing; many families then look at the exceptions below.";
/** Why the same two people can score a little differently the other way round. */
export const ORDER_NOTE = "Tradition reads the match from the first person toward the second, so swapping can change a few points.";
const scoreTone = (score: number): Tone => (score >= 69 ? "bright" : score >= 50 ? "steady" : "mixed");

/** A fold that stays out of the way; `lazy` content is mounted only once it is opened. */
export function Fold({ title, sub, lazy, children }: { title: string; sub?: React.ReactNode; lazy?: boolean; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <details className="v-fold" open={open} onToggle={(e) => setOpen(e.currentTarget.open)}>
      <summary>
        <span>
          {title}
          {sub ? <span className="v-fold__s">{sub}</span> : null}
        </span>
      </summary>
      {!lazy || open ? <div className="v-fold__body">{children}</div> : null}
    </details>
  );
}

interface BondProps {
  r: MilanResult;
  pa: Profile;
  pb: Profile;
  patA: Patri;
  patB: Patri;
  onCopy: () => void;
  /** The two people's Manglik facts, shown under the plain sentence in the Manglik fold. */
  manglikFacts?: React.ReactNode;
  /** More folds (the 36 points, Porutham, charts, method), listed after the plain ones. */
  children?: React.ReactNode;
}

export function BondCard({ r, pa, pb, patA, patB, onCopy, manglikFacts, children }: BondProps) {
  const an = first(pa.name);
  const bn = first(pb.name);
  const b = useMemo(() => bondReading(r, an, bn), [r, an, bn]);
  const ma = MOON_TRAITS[patA.grahas.MO.sign];
  const mb = MOON_TRAITS[patB.grahas.MO.sign];
  const word = BAND_WORD[r.band];
  const okCount = b.signs.filter((x) => x.ok).length;

  return (
    <>
      <section className="mm-hero" data-tone={scoreTone(b.score)} aria-labelledby="bond-h">
        <h2 id="bond-h" className="mm-hero__word">
          {word}
        </h2>
        <p className="mm-hero__hint">{b.headline}</p>
        <span className="v-meter mm-hero__meter" role="img" aria-label={`${word}. Match score ${b.score} out of 100.`}>
          <span style={{ width: `${Math.max(4, b.score)}%` }} />
        </span>
        <p className="mm-hero__score">
          <span>
            <b>{b.score}</b> of 100
          </span>
          <span className="mm-hero__trad">
            <b>{fmtPts(r.total)} of 36</b> by tradition <InfoDot id="guna-milan" />
          </span>
        </p>
        {r.band === "not-recommended" ? <p className="mm-hero__line">{FLAGGED_LEAD}</p> : null}
        <p className="mm-hero__line">{b.summary}</p>
      </section>

      <Section title="The five things people ask" />
      <ul className="v-card mm-parts">
        {b.parts.map((p) => (
          <li key={p.id} data-tone={LEVEL_TONE[p.level]}>
            <span className="mm-parts__l">{p.label}</span>
            <span className="mm-parts__w">{LEVEL_WORD[p.level]}</span>
            <span className="v-meter" role="img" aria-label={`${p.label}: ${LEVEL_WORD[p.level]}, ${p.score} out of 100`}>
              <span style={{ width: `${Math.max(4, p.score)}%` }} />
            </span>
            <span className="mm-parts__line">{p.line}</span>
          </li>
        ))}
      </ul>

      {b.tip ? (
        <div className="v-card mm-tip">
          <h3 className="v-card__title">One thing to try</h3>
          <p>{b.tip}</p>
        </div>
      ) : null}

      <Section title="More detail" />
      <div className="mm-folds">
        <Fold title="Signs of marriage" sub={`${okCount} of ${b.signs.length} are present`}>
          <ul className="mm-signs">
            {b.signs.map((x) => (
              <li key={x.label} className={x.ok ? "is-ok" : undefined}>
                <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  {x.ok ? <path d="M7.5 12.5l3 3 6-6.5" /> : <path d="M8.5 12h7" />}
                </svg>
                <span>
                  {x.label}
                  <span className="vh">{x.ok ? ": present" : ": not strong"}</span>
                </span>
              </li>
            ))}
          </ul>
        </Fold>

        <Fold title="What each of you brings" sub={`${an} and ${bn}, by Moon sign`}>
          <div className="mm-brings">
            <div className="mm-brings__one">
              <Avatar name={pa.name} size={40} />
              <div>
                <h3>{an}</h3>
                <p className="v-small v-muted">Moon in {rashiName(patA.grahas.MO.sign, pa.tradition)}</p>
                <p>{ma?.love}</p>
              </div>
            </div>
            <div className="mm-brings__one">
              <Avatar name={pb.name} size={40} />
              <div>
                <h3>{bn}</h3>
                <p className="v-small v-muted">Moon in {rashiName(patB.grahas.MO.sign, pb.tradition)}</p>
                <p>{mb?.love}</p>
              </div>
            </div>
          </div>
        </Fold>

        <Fold title="Manglik" sub="The Mars doṣa, read beside the score">
          <p>
            {b.manglik} <InfoDot id="dosha" label="Manglik, the Mars doṣa" />
          </p>
          {manglikFacts}
        </Fold>

        {children}
      </div>

      <div className="mm-copy">
        <button type="button" className="v-btn v-btn--quiet v-btn--sm" onClick={onCopy}>
          Copy summary
        </button>
      </div>

      <p className="v-foot mm-caveat">
        Read from your two Moons, the way families have matched horoscopes for centuries. It is tradition, not a prediction about two real
        people. Respect, kindness and effort decide the rest.
      </p>
    </>
  );
}
