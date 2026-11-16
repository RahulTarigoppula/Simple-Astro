// The life arc: the years from birth to the end of the nine chapters (Viṃśottarī daśā) as one sweep.
// Each chapter is a segment as long as its real years, the running one is lit (with its shorter
// stretches ticked inside it), and a mark travels from birth to today.
import { animate, motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { useEffect, useId } from "react";
import { GRAHA_ENGLISH } from "../../data/tables/names";
import type { DashaNode } from "../../engine/types";

const W = 400;
const H = 222;
const CX = 200;
const CY = 192;
const R = 145;
const EASE = [0.22, 0.8, 0.2, 1] as const;
const GAP = 0.0035;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pt = (f: number, r: number): [number, number] => [CX - r * Math.cos(Math.PI * f), CY - r * Math.sin(Math.PI * f)];
const arc = (a: number, b: number, r: number): string => {
  const [x0, y0] = pt(a, r);
  const [x1, y1] = pt(b, r);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

interface LifeArcProps {
  tree: readonly DashaNode[];
  birthMs: number;
  nowMs: number;
  /** Year labels at the two feet. */
  fromLabel: string;
  toLabel: string;
  label: string;
}

export function LifeArc({ tree, birthMs, nowMs, fromLabel, toLabel, label }: LifeArcProps) {
  const uid = useId().replace(/:/g, "");
  const still = useReducedMotion();
  const quiet = still || import.meta.env.MODE === "test";
  const endMs = tree[tree.length - 1]?.endMs ?? birthMs + 1;
  const f = (ms: number) => clamp01((ms - birthMs) / Math.max(1, endMs - birthMs));
  const inside = nowMs >= birthMs && nowMs < endMs;
  const fNow = f(nowMs);

  const segs = tree
    .filter((d) => d.endMs > birthMs)
    .map((d) => {
      const a = f(d.startMs);
      const b = f(d.endMs);
      const state = d.endMs <= nowMs ? "past" : d.startMs > nowMs ? "next" : "now";
      return { d, a, b, state };
    });
  const cur = segs.find((s) => s.state === "now");

  const at = useMotionValue(quiet ? fNow : 0);
  useEffect(() => {
    if (quiet) {
      at.set(fNow);
      return;
    }
    const c = animate(at, fNow, { duration: 1.4, delay: 0.25, ease: EASE });
    return () => c.stop();
  }, [at, fNow, quiet]);
  const mx = useTransform(at, (v) => pt(v, R)[0]);
  const my = useTransform(at, (v) => pt(v, R)[1]);

  const labelAt = (fr: number, r: number) => {
    const [x, y] = pt(fr, r);
    const anchor = x < CX - 36 ? "end" : x > CX + 36 ? "start" : "middle";
    return { x, y: y + 3.5, anchor } as const;
  };

  return (
    <svg className="lifearc" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id={`pt-here-${uid}`}>
          <stop offset="0" stopColor="var(--sky-sun)" stopOpacity="0.6" />
          <stop offset="1" stopColor="var(--sky-sun)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {segs.map((s, i) => {
        const a = s.a + (i === 0 ? 0 : GAP);
        const b = s.b - (i === segs.length - 1 ? 0 : GAP);
        if (b <= a) return null;
        const wide = s.b - s.a;
        // the running chapter's label says where you are; the others carry the planet's name
        const mid = s.state === "now" ? (wide > 0.1 ? Math.min(s.b - 0.04, Math.max(s.a + 0.04, fNow)) : (s.a + s.b) / 2) : (s.a + s.b) / 2;
        const l = labelAt(mid, R + 17);
        return (
          <motion.g
            key={s.d.startMs}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1 + i * 0.09, ease: EASE }}
          >
            <path d={arc(a, b, R)} className={`lifearc__seg is-${s.state}`} />
            {wide > 0.028 ? (
              <text x={l.x} y={l.y} textAnchor={l.anchor} className={`lifearc__name is-${s.state}`}>
                {s.state === "now" ? "You are here" : GRAHA_ENGLISH[s.d.lord]}
              </text>
            ) : null}
          </motion.g>
        );
      })}

      {/* the running chapter: the years already lived in it, and its shorter stretches */}
      {cur && inside ? (
        <>
          <motion.path
            d={arc(cur.a + (cur.a > 0 ? GAP : 0), Math.max(cur.a + GAP + 0.001, fNow), R)}
            className="lifearc__lived"
            initial={still ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 0.7, delay: 1.1, ease: EASE }}
          />
          <motion.g
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.2, ease: EASE }}
          >
            {(cur.d.children ?? [])
              .filter((ad) => ad.endMs > birthMs)
              .map((ad) => {
                const a = f(ad.startMs) + 0.0015;
                const b = f(ad.endMs) - 0.0015;
                if (b <= a) return null;
                const on = nowMs >= ad.startMs && nowMs < ad.endMs;
                return <path key={ad.startMs} d={arc(a, b, R - 12)} className={on ? "lifearc__sub is-now" : "lifearc__sub"} />;
              })}
          </motion.g>
        </>
      ) : null}

      {/* the feet: birth, and the end of the ninth chapter */}
      <circle cx={CX - R} cy={CY} r="3" className="lifearc__foot" />
      <circle cx={CX + R} cy={CY} r="3" className="lifearc__foot" />
      <text x={CX - R} y={CY + 19} textAnchor="middle" className="lifearc__year">
        {fromLabel}
      </text>
      <text x={CX + R} y={CY + 19} textAnchor="middle" className="lifearc__year">
        {toLabel}
      </text>

      {inside ? (
        <>
          <motion.circle cx={mx} cy={my} r="20" fill={`url(#pt-here-${uid})`} />
          <motion.circle cx={mx} cy={my} r="6.5" className="lifearc__here" />
        </>
      ) : null}
    </svg>
  );
}
