// The answer, shown first on Match: one score as a ring, a one-word verdict and a plain sentence, the
// five things people ask about, what is strong and what to work on, what each person brings, one tip,
// the signs-of-marriage checklist and Manglik. Every number and sentence is bondReading()'s output.
import { useMemo } from "react";
import { InfoDot } from "../../components/ui/Explain";
import { Section } from "../../components/ui/Page";
import { Avatar } from "../../components/ui/PersonChip";
import { rashiName } from "../../data/regional";
import { MOON_TRAITS } from "../../data/traits";
import { type BondLevel, type BondPart, bondReading } from "../../engine/bond";
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
const scoreTone = (score: number): Tone => (score >= 69 ? "bright" : score >= 50 ? "steady" : "mixed");

function Ring({ score, word }: { score: number; word: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  return (
    <div className="mm-ring" role="img" aria-label={`${word}. Match score ${score} out of 100.`}>
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r={r} className="mm-ring__track" />
        <circle
          cx="52"
          cy="52"
          r={r}
          className="mm-ring__fill"
          strokeDasharray={`${(Math.max(4, score) / 100) * c} ${c}`}
          transform="rotate(-90 52 52)"
        />
      </svg>
      <span className="mm-ring__num">{score}</span>
      <span className="mm-ring__of">of 100</span>
    </div>
  );
}

function PartList({ title, parts, none, tone }: { title: string; parts: BondPart[]; none: string; tone: "good" | "mixed" }) {
  return (
    <section className="v-card mm-pick">
      <h3 className={`mm-pick__h mm-pick__h--${tone}`}>{title}</h3>
      {parts.length ? (
        <ul>
          {parts.map((p) => (
            <li key={p.id}>{p.label}</li>
          ))}
        </ul>
      ) : (
        <p className="v-muted">{none}</p>
      )}
    </section>
  );
}

interface BondProps {
  r: MilanResult;
  pa: Profile;
  pb: Profile;
  patA: Patri;
  patB: Patri;
  onCopy: () => void;
}

export function BondCard({ r, pa, pb, patA, patB, onCopy }: BondProps) {
  const an = first(pa.name);
  const bn = first(pb.name);
  const b = useMemo(() => bondReading(r, an, bn), [r, an, bn]);
  const ma = MOON_TRAITS[patA.grahas.MO.sign];
  const mb = MOON_TRAITS[patB.grahas.MO.sign];
  const word = BAND_WORD[r.band];
  const okCount = b.signs.filter((x) => x.ok).length;

  return (
    <>
      <section className="v-card v-card--hero mm-hero" data-tone={scoreTone(b.score)} aria-labelledby="bond-h">
        <div className="mm-hero__top">
          <Ring score={b.score} word={word} />
          <div className="mm-hero__text">
            <p className="v-eyebrow">
              {an} and {bn}
            </p>
            <h2 id="bond-h" className="mm-hero__word">
              {word}
            </h2>
            <p className="mm-hero__hint">{b.headline}</p>
          </div>
        </div>
        <p className="mm-hero__line">{b.summary}</p>
        <p className="mm-hero__trad">
          Traditional score: <b>{fmtPts(r.total)} of 36</b> <span className="v-muted">(Guna Milan)</span> <InfoDot id="guna-milan" />
        </p>
        <div className="v-actions">
          <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={onCopy}>
            Copy summary
          </button>
        </div>
      </section>

      <div className="v-cols">
        <div className="v-stack">
          <Section title="The five things people ask" />
          <ul className="mm-parts">
            {b.parts.map((p) => (
              <li key={p.id} data-tone={LEVEL_TONE[p.level]}>
                <span className="mm-parts__l">{p.label}</span>
                <span className="mm-parts__w">
                  {LEVEL_WORD[p.level]} · {p.score}
                </span>
                <span className="v-meter" role="img" aria-label={`${p.label}: ${LEVEL_WORD[p.level]}, ${p.score} out of 100`}>
                  <span style={{ width: `${Math.max(4, p.score)}%` }} />
                </span>
                <span className="mm-parts__line">{p.line}</span>
              </li>
            ))}
          </ul>

          <div className="v-grid2 mm-picks">
            <PartList title="Strongest together" parts={b.best} none="Nothing stands out yet." tone="good" />
            <PartList title="To work on" parts={b.workOn} none="Tradition flags nothing here." tone="mixed" />
          </div>
        </div>

        <div className="v-stack">
          <Section title="What each of you brings" />
          <div className="v-card mm-brings">
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

          {b.tip ? (
            <div className="v-card mm-tip">
              <h3 className="v-card__title">One thing to try</h3>
              <p>{b.tip}</p>
            </div>
          ) : null}

          <section className="v-card" aria-labelledby="mm-signs-h">
            <div className="mm-signs__head">
              <h3 id="mm-signs-h" className="v-card__title">
                Signs of marriage
              </h3>
              <span className="v-chip v-chip--violet">
                {okCount} of {b.signs.length}
              </span>
            </div>
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
          </section>

          <div className="v-card">
            <h3 className="v-card__title">
              Manglik <span className="mm-term">Mars doṣa</span> <InfoDot id="dosha" label="Manglik, the Mars doṣa" />
            </h3>
            <p>{b.manglik}</p>
          </div>
        </div>
      </div>

      <p className="v-foot mm-caveat">
        Read from your two Moons, the way families have matched horoscopes for centuries. It is tradition, not a prediction about two real
        people. Respect, kindness and effort decide the rest.
      </p>
    </>
  );
}
