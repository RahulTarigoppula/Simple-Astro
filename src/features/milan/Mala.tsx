// The 36-bead mala (§3.7 D, bead-slide #6). Every bead is a point from milan(): earned beads leave
// the knot one by one on a red thread and turn brass as they cross it; a doṣa's beads cross as dried
// lac; unearned beads stay wood. Tap anywhere (or press a key) to finish the count at once.
import { motion, useAnimate } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DigitSet } from "../../components/ui/DigitSet";
import { glossary } from "../../data/glossary";
import type { KootaResult, MilanResult } from "../../engine/types";
import { THREAD } from "../../motion/springs";
import { haptics } from "../../platform/haptics";
import { reducedMotion } from "../../platform/native";
import { play } from "../../platform/sound";
import { BAND_LABEL, doshaLine, exceptionText, fmtPts } from "./rules";

type BeadKind = "brass" | "half" | "lac" | "wood";

interface Bead {
  i: number;
  kind: BeadKind;
  /** Order in the tally, or null for a wood bead that never moves. */
  seq: number | null;
  points: number;
}

const SLOT = 20; // 15 px bead + 5 px gap
const KNOT_PAD = 14; // the knot sits in the brow's left padding
const BUDGET_MS = 2900; // bead slides; + knot + stamp keeps the whole tally ≤ 3.5 s
const STEP_MS = 90;

/** The glossary entry that explains each kūṭa in plain English. */
const KOOTA_GLOSS: Record<KootaResult["id"], string> = {
  varna: "varna",
  vashya: "vashya",
  tara: "tara",
  yoni: "yoni",
  maitri: "graha-maitri",
  gana: "gana",
  bhakoot: "bhakuta",
  nadi: "nadi",
};

export function beadsOf(k: KootaResult): Array<Omit<Bead, "seq">> {
  const score = Math.max(0, Math.min(k.max, k.score));
  const whole = Math.floor(score);
  const half = score - whole >= 0.25;
  return Array.from({ length: k.max }, (_, i) => {
    if (i < whole) return { i, kind: "brass" as const, points: 1 };
    if (i === whole && half) return { i, kind: "half" as const, points: 0.5 };
    return { i, kind: k.dosha ? ("lac" as const) : ("wood" as const), points: 0 };
  });
}

function plan(kootas: KootaResult[]): { rows: Bead[][]; total: number; rowEnd: number[] } {
  let seq = 0;
  const rowEnd: number[] = [];
  const rows = kootas.map((k) => {
    const row = beadsOf(k).map((b) => ({ ...b, seq: b.kind === "wood" ? null : seq++ }));
    rowEnd.push(seq);
    return row;
  });
  return { rows, total: seq, rowEnd };
}

export type TallyPhase = "tally" | "knot" | "done";

/** Drives the count. Returns how many beads have left the knot and the phase. */
function useTally(total: number, totalPoints: number, onFinish: () => void) {
  const [instant, setInstant] = useState(() => reducedMotion());
  const [launched, setLaunched] = useState(() => (reducedMotion() ? total : 0));
  const [phase, setPhase] = useState<TallyPhase>(() => (reducedMotion() ? "done" : "tally"));
  const step = Math.min(STEP_MS, BUDGET_MS / Math.max(1, total));
  const finished = useRef(false);
  const finish = useRef(onFinish);
  finish.current = onFinish;

  const knot = () => {
    if (finished.current) return;
    finished.current = true;
    play("snap");
    if (totalPoints >= 25) haptics.notify("success");
    finish.current();
  };

  // Reduced motion: no count, but the knot still sounds once.
  // biome-ignore lint/correctness/useExhaustiveDependencies: run once on mount
  useEffect(() => {
    if (instant && phase === "done") knot();
  }, []);

  useEffect(() => {
    if (phase !== "tally") return;
    if (launched >= total) {
      const t = window.setTimeout(() => setPhase("knot"), 240);
      return () => clearTimeout(t);
    }
    const t = window.setTimeout(
      () => {
        setLaunched((n) => n + 1);
        play("bead");
        haptics.selection();
      },
      launched === 0 ? 260 : step,
    );
    return () => clearTimeout(t);
  }, [phase, launched, total, step]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: knot is stable for the mount
  useEffect(() => {
    if (phase !== "knot") return;
    const t = window.setTimeout(() => {
      setPhase("done");
      knot();
    }, 260);
    return () => clearTimeout(t);
  }, [phase]);

  const skip = () => {
    if (phase === "done") return false;
    setInstant(true);
    setLaunched(total);
    setPhase("done");
    knot();
    return true;
  };

  return { launched, phase, instant, skip };
}

function BeadView({ b, launched, instant }: { b: Bead; launched: number; instant: boolean }) {
  const out = b.seq !== null && launched > b.seq;
  const start = -(KNOT_PAD - 4 + b.i * SLOT);
  if (b.seq === null) return <span className="bd bd--wood" />;
  const tx = instant ? { duration: 0 } : THREAD;
  return (
    <motion.span
      className={`bd bd--${b.kind}`}
      initial={instant ? false : { x: start, opacity: 0 }}
      animate={out ? { x: 0, opacity: 1 } : { x: start, opacity: 0 }}
      transition={{ x: tx, opacity: { duration: instant ? 0 : 0.05 } }}
    >
      <motion.span
        className="bd__metal"
        initial={instant ? false : { opacity: 0 }}
        animate={{ opacity: out ? 1 : 0 }}
        transition={{ duration: instant ? 0 : 0.12, delay: instant ? 0 : 0.03 }}
      />
    </motion.span>
  );
}

interface MalaProps {
  result: MilanResult;
  onOpen: (k: KootaResult) => void;
}

export function Mala({ result, onOpen }: MalaProps) {
  const { rows, total, rowEnd } = useMemo(() => plan(result.kootas), [result]);
  const [knotScope, animateKnot] = useAnimate<HTMLDivElement>();
  const quietUntil = useRef(0);
  const [stamped, setStamped] = useState(false);
  const { launched, phase, instant, skip } = useTally(total, result.total, () => setStamped(true));

  // The knot tightens: thread scaleX 1 → 1.04 → 1 with THREAD.
  useEffect(() => {
    if (phase !== "knot" || !knotScope.current) return;
    void (async () => {
      await animateKnot(knotScope.current, { scaleX: 1.04 }, THREAD);
      await animateKnot(knotScope.current, { scaleX: 1 }, THREAD);
    })();
  }, [phase, animateKnot, knotScope]);

  // Tap anywhere — or any key — finishes the count at once.
  useEffect(() => {
    if (phase === "done") return;
    const onAny = () => {
      if (skip()) quietUntil.current = performance.now() + 400;
    };
    window.addEventListener("pointerdown", onAny, true);
    window.addEventListener("keydown", onAny, true);
    return () => {
      window.removeEventListener("pointerdown", onAny, true);
      window.removeEventListener("keydown", onAny, true);
    };
  }, [phase, skip]);

  const flat = rows.flat();
  const counted = flat.reduce((s, b) => s + (b.seq !== null && launched > b.seq ? b.points : 0), 0);
  const shown = phase === "done" ? result.total : counted;
  const band = BAND_LABEL[result.band];

  return (
    <div className="mala">
      <div className="score">
        <b className="mala__score">
          <DigitSet text={fmtPts(shown)} />
          <span className="mala__of"> / 36</span>
        </b>
        <div className="mala__knot" ref={knotScope} aria-hidden="true" data-decorative="true">
          <span className="mala__knotcore" />
        </div>
        <div className="mala__stampslot">
          {stamped ? (
            <motion.span
              className={`stampband mala__band mala__band--${result.band}`}
              initial={instant ? false : { scale: 0.7, opacity: 0 }}
              animate={{ scale: [0.7, 1.06, 1], opacity: 1 }}
              transition={{ scale: { duration: 0.24, times: [0, 0.6, 1], ease: [0.22, 0.8, 0.2, 1] }, opacity: { duration: 0.08 } }}
            >
              {band}
            </motion.span>
          ) : (
            <span className="mala__tap" aria-hidden="true">
              tap anywhere to finish the count
            </span>
          )}
        </div>
        <p className="vh" aria-live="polite">
          {phase === "done" ? `${fmtPts(result.total)} of 36 points — ${band}.` : ""}
        </p>
      </div>

      <ul className="beads mala__beads">
        {result.kootas.map((k, r) => {
          const row = rows[r] ?? [];
          const rowDone = phase === "done" || launched >= (rowEnd[r] ?? 0);
          return (
            <li key={k.id} className={k.dosha ? "is-dosha" : undefined}>
              <button
                type="button"
                className="krow"
                aria-haspopup="dialog"
                onClick={() => {
                  if (performance.now() < quietUntil.current) return;
                  onOpen(k);
                }}
              >
                <span className="kname">
                  {k.name}
                  <span lang="sa" className="kname__dev">
                    {k.nameDev}
                  </span>
                  <span className="gloss kname__plain">{glossary(KOOTA_GLOSS[k.id])?.plain}</span>
                </span>
                <span
                  className="brow"
                  role="img"
                  aria-label={`${k.name}: ${fmtPts(k.score)} of ${k.max} points${k.dosha ? ", a doṣa" : ""}`}
                >
                  <span className="brow__thread" />
                  <span className="brow__knot" />
                  {row.map((b) => (
                    <BeadView key={b.i} b={b} launched={launched} instant={instant} />
                  ))}
                </span>
                <span className="kscore">
                  <DigitSet text={rowDone ? fmtPts(k.score) : "·"} /> / {k.max}
                </span>
              </button>
              {k.dosha ? (
                <p className="knote">
                  {doshaLine(k)}
                  <span className="knote__src">
                    {" "}
                    — {k.citation.text}, {k.citation.ref}
                  </span>
                  {k.cancellation && !k.cancellation.applied ? (
                    <span className="knote__exc"> An exception is recorded — {exceptionText(k.cancellation.rule)} — and not applied.</span>
                  ) : null}
                </p>
              ) : k.cancellation?.applied ? (
                <p className="knote">The doṣa is set aside: {exceptionText(k.cancellation.rule)} (Drawer setting).</p>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
