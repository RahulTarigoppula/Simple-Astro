// The 36-bead mālā, inside the "36-point score" fold. Every bead is a point from milan(): earned
// beads are gold, a half point is a half bead, a doṣa's missing beads are ringed in rose and the row
// says "doṣa" in words; unearned beads stay hollow. Each row is a button that opens its rule.
import { ChevronRight } from "../../components/ui/Page";
import { glossary } from "../../data/glossary";
import type { KootaResult, MilanResult } from "../../engine/types";
import { BAND_LABEL, doshaLine, exceptionText, fmtPts, KOOTA_GLOSS } from "./rules";

type BeadKind = "brass" | "half" | "lac" | "wood";

interface Bead {
  i: number;
  kind: BeadKind;
  points: number;
}

export function beadsOf(k: KootaResult): Bead[] {
  const score = Math.max(0, Math.min(k.max, k.score));
  const whole = Math.floor(score);
  const half = score - whole >= 0.25;
  return Array.from({ length: k.max }, (_, i) => {
    if (i < whole) return { i, kind: "brass" as const, points: 1 };
    if (i === whole && half) return { i, kind: "half" as const, points: 0.5 };
    return { i, kind: k.dosha ? ("lac" as const) : ("wood" as const), points: 0 };
  });
}

interface MalaProps {
  result: MilanResult;
  onOpen: (k: KootaResult) => void;
}

export function Mala({ result, onOpen }: MalaProps) {
  return (
    <div className="mm-mala">
      <p className="mm-mala__sum">{`${fmtPts(result.total)} of 36 points: ${BAND_LABEL[result.band]}.`}</p>
      <p className="v-small v-muted">Eight tests, each worth more than the one before. Tap a test to see its rule.</p>
      <ul className="mm-kootas">
        {result.kootas.map((k) => (
          <li key={k.id}>
            <button type="button" className="mm-krow" aria-haspopup="dialog" onClick={() => onOpen(k)}>
              <span className="mm-krow__name">
                <span className="mm-krow__t">{glossary(KOOTA_GLOSS[k.id])?.plain ?? k.name}</span>
                <span className="mm-krow__s">
                  {k.name}
                  {k.dosha ? <span className="v-chip v-chip--care mm-krow__flag">doṣa</span> : null}
                </span>
              </span>
              <span className="mm-krow__score">
                {fmtPts(k.score)} / {k.max}
              </span>
              <ChevronRight size={16} />
              <span
                className="mm-beads"
                role="img"
                aria-label={`${k.name}: ${fmtPts(k.score)} of ${k.max} points${k.dosha ? ", a doṣa" : ""}`}
              >
                {beadsOf(k).map((b) => (
                  <i key={b.i} className={`mm-bead mm-bead--${b.kind}`} />
                ))}
              </span>
            </button>
            {k.dosha ? (
              <p className="mm-knote">
                {doshaLine(k)}
                <span className="v-muted">
                  {" "}
                  ({k.citation.text}, {k.citation.ref})
                </span>
                {k.cancellation && !k.cancellation.applied ? (
                  <span> An exception is recorded ({exceptionText(k.cancellation.rule)}) but not applied.</span>
                ) : null}
              </p>
            ) : k.cancellation?.applied ? (
              <p className="mm-knote">The doṣa is set aside: {exceptionText(k.cancellation.rule)} (Settings).</p>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
