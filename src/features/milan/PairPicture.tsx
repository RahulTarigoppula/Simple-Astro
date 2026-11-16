// The match as a picture: the two people as two glowing discs that overlap like two moons. The
// shared part is as wide as the match score (0 = the discs just touch, 100 = nearly one disc), and
// the 36 beads around them are the 36 traditional points, the earned ones lit. Before a match is
// read the discs stand apart and the beads wait unlit.
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

const W = 360;
const H = 212;
const CX = W / 2;
const CY = H / 2;
const R = 62;
/** How far apart the two centres stand before a match is read. */
const APART = 2 * R + 22;
const RING_RX = 166;
const RING_RY = 96;
const BEADS = 36;
const EASE = [0.22, 0.8, 0.2, 1] as const;

/** Distance between the two centres for a score of 0..100: touching at 0, nearly one at 100. */
export function pairDistance(score: number): number {
  const s = Math.min(100, Math.max(0, score));
  return 2 * R * (1 - 0.9 * (s / 100));
}

/** The shared part of two discs of radius R whose centres are d apart, centred on 0,0. */
function lensPath(d: number): string | null {
  if (d >= 2 * R) return null;
  const h = Math.sqrt(R * R - (d / 2) * (d / 2));
  return `M0 ${(-h).toFixed(2)}A${R} ${R} 0 0 1 0 ${h.toFixed(2)}A${R} ${R} 0 0 1 0 ${(-h).toFixed(2)}Z`;
}

const BEAD_AT: ReadonlyArray<readonly [number, number]> = Array.from({ length: BEADS }, (_, i) => {
  const a = (i / BEADS) * Math.PI * 2 - Math.PI / 2;
  return [CX + RING_RX * Math.cos(a), CY + RING_RY * Math.sin(a)] as const;
});

// A few fixed stars around the ring (a small generator with a fixed seed, the same on every visit).
const STARS: ReadonlyArray<readonly [number, number, number]> = (() => {
  let s = 36_1994;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  const out: Array<readonly [number, number, number]> = [];
  while (out.length < 26) {
    const x = -10 + next() * (W + 20);
    const y = -34 + next() * (H + 40);
    const inside = ((x - CX) / (RING_RX + 12)) ** 2 + ((y - CY) / (RING_RY + 12)) ** 2 < 1;
    const r = 0.5 + next() * 0.9;
    if (!inside) out.push([x, y, r]);
  }
  return out;
})();

const initial = (name: string | null | undefined) => (name ? (name.trim()[0] ?? "?").toUpperCase() : null);

interface PairPictureProps {
  a: string | null;
  b: string | null;
  /** The match score, 0 to 100; omit while two people are still being chosen or read. */
  score?: number | null;
  /** The traditional points, 0 to 36 (halves allowed). */
  points?: number | null;
  /** Accessible name; without one the picture is decoration and the words beside it carry the facts. */
  label?: string;
}

export function PairPicture({ a, b, score = null, points = null, label }: PairPictureProps) {
  const uid = useId().replace(/:/g, "");
  const still = useReducedMotion();
  const matched = score !== null;
  const d = matched ? pairDistance(score) : APART;
  const lens = matched ? lensPath(d) : null;
  // Each initial sits in the middle of its own disc's unshared part.
  const off = Math.max(0, R - d / 2);
  const fs = matched ? Math.min(34, Math.max(17, d * 0.8)) : 34;
  const whole = points === null ? 0 : Math.floor(points);
  const half = points !== null && points - whole >= 0.5;
  const ia = initial(a);
  const ib = initial(b);

  /** One disc's layer, carried to its place: the glowing body below the shared part, the rim and initial above it. */
  const layer = (who: "a" | "b", letter: string | null, part: "body" | "top") => {
    const sign = who === "a" ? -1 : 1;
    return (
      <motion.g
        initial={still ? false : { x: (sign * APART) / 2 + sign * 14, opacity: 0 }}
        animate={{ x: (sign * d) / 2, opacity: 1 }}
        transition={{ duration: 1.3, ease: EASE, opacity: { duration: 0.6 } }}
      >
        {part === "body" ? (
          letter ? (
            <>
              <circle r={R * 1.7} fill={`url(#halo-${who}-${uid})`} />
              <circle r={R} fill={`url(#orb-${who}-${uid})`} />
            </>
          ) : (
            <circle r={R - 1} className="pair__empty" />
          )
        ) : letter ? (
          <>
            <circle r={R - 0.75} className="pair__rim" />
            <motion.text
              className="pair__letter"
              textAnchor="middle"
              dominantBaseline="central"
              initial={still ? false : { x: 0 }}
              animate={{ x: sign * off }}
              transition={{ duration: 1.3, ease: EASE }}
              style={{ fontSize: fs }}
            >
              {letter}
            </motion.text>
          </>
        ) : (
          <path d="M-11 0h22M0 -11v22" className="pair__plus" />
        )}
      </motion.g>
    );
  };

  return (
    <svg
      className="pair"
      viewBox={`0 0 ${W} ${H}`}
      data-matched={matched ? "" : undefined}
      {...(label ? { role: "img", "aria-label": label } : { "aria-hidden": true })}
    >
      <defs>
        {(["a", "b"] as const).map((who) => (
          <g key={who}>
            <radialGradient id={`halo-${who}-${uid}`}>
              <stop offset="0.5" className={`pair__stop pair__stop--${who}`} stopOpacity="0.26" />
              <stop offset="1" className={`pair__stop pair__stop--${who}`} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`orb-${who}-${uid}`} cx={who === "a" ? "0.36" : "0.64"} cy="0.3" r="0.9">
              <stop offset="0" stopColor="var(--star)" stopOpacity="0.98" />
              <stop offset="0.5" className={`pair__stop pair__stop--${who}`} stopOpacity="0.97" />
              <stop offset="1" className={`pair__stop pair__stop--${who}`} stopOpacity="0.86" />
            </radialGradient>
          </g>
        ))}
        <radialGradient id={`lens-${uid}`}>
          <stop offset="0" stopColor="var(--star)" stopOpacity="0.8" />
          <stop offset="1" stopColor="var(--star)" stopOpacity="0.38" />
        </radialGradient>
        <filter id={`glow-${uid}`} x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
      </defs>

      <g className="pair__stars">
        {STARS.map(([x, y, r]) => (
          <circle key={`${x.toFixed(1)}-${y.toFixed(1)}`} cx={x} cy={y} r={r} />
        ))}
      </g>

      {/* the 36 points of tradition, as a string of beads */}
      <ellipse cx={CX} cy={CY} rx={RING_RX} ry={RING_RY} className="pair__thread" />
      {BEAD_AT.map(([x, y], i) => {
        const on = points !== null && i < whole;
        const isHalf = half && i === whole;
        const key = `bead-${i}`;
        if (!on && !isHalf) return <circle key={key} cx={x} cy={y} r="3" className="pair__bead" />;
        return (
          <motion.g
            key={key}
            initial={still ? false : { opacity: 0.15, scale: 0.4 }}
            animate={{ opacity: isHalf ? 0.55 : 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.5 + i * 0.03, ease: EASE }}
            style={{ transformOrigin: `${x}px ${y}px` }}
          >
            <circle cx={x} cy={y} r="7.5" className="pair__bead-glow" />
            <circle cx={x} cy={y} r={isHalf ? 3 : 3.9} className="pair__bead pair__bead--on" />
          </motion.g>
        );
      })}

      <g transform={`translate(${CX} ${CY})`}>
        {layer("a", ia, "body")}
        {layer("b", ib, "body")}
        {lens ? (
          <motion.g
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.85, ease: EASE }}
          >
            <path d={lens} fill="var(--sky-sun)" opacity="0.5" filter={`url(#glow-${uid})`} />
            <path d={lens} fill={`url(#lens-${uid})`} />
          </motion.g>
        ) : null}
        {layer("a", ia, "top")}
        {layer("b", ib, "top")}
      </g>
    </svg>
  );
}
