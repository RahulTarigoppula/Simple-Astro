// The sky now, read from the birth Moon: the twelve signs as a ring with the Moon's own sign at the
// top (area 1), the nine planets as beads at their true places today, green when tradition counts that
// place as helpful, and the three signs of Saturn's long season shaded.
import { motion, useReducedMotion } from "motion/react";
import { rashiName, type Tradition } from "../../data/regional";
import type { GocharReport } from "../../engine/gochar";
import type { GrahaId } from "../../engine/types";

const W = 400;
const H = 318;
const CX = 200;
const CY = 160;
const R_OUT = 121;
const R_IN = 94;
const R_MID = (R_OUT + R_IN) / 2;
const EASE = [0.22, 0.8, 0.2, 1] as const;
const SHORT: Record<GrahaId, string> = {
  SU: "Sun",
  MO: "Moon",
  MA: "Mars",
  ME: "Mercury",
  JU: "Jupiter",
  VE: "Venus",
  SA: "Saturn",
  RA: "Rahu",
  KE: "Ketu",
};

interface NowRingProps {
  report: GocharReport;
  tradition: Tradition | undefined;
  /** Centre of the ring: a small word and the date. */
  date: string;
  label: string;
}

export function NowRing({ report, tradition, date, label }: NowRingProps) {
  const still = useReducedMotion();
  const moon = report.moonSign;
  // longitude → angle on the page: the middle of the Moon's sign is straight up, longitude grows anticlockwise
  const ang = (lon: number) => ((90 + (lon - (moon * 30 + 15))) * Math.PI) / 180;
  const at = (lon: number, r: number): [number, number] => [CX + r * Math.cos(ang(lon)), CY - r * Math.sin(ang(lon))];
  const wedge = (lon0: number, lon1: number): string => {
    const [ax, ay] = at(lon0, R_OUT);
    const [bx, by] = at(lon1, R_OUT);
    const [cx, cy] = at(lon1, R_IN);
    const [dx, dy] = at(lon0, R_IN);
    const f = (n: number) => n.toFixed(1);
    return `M${f(ax)} ${f(ay)}A${R_OUT} ${R_OUT} 0 0 0 ${f(bx)} ${f(by)}L${f(cx)} ${f(cy)}A${R_IN} ${R_IN} 0 0 1 ${f(dx)} ${f(dy)}Z`;
  };

  // Labels sit just inside the ring. Where planets crowd together the labels fan apart along the ring
  // and step in and out, each tied to its bead by a hairline.
  const sorted = [...report.entries].sort((a, b) => a.transit.lonSidereal - b.transit.lonSidereal);
  const spot = sorted.map((e) => e.transit.lonSidereal);
  const MIN = 22;
  for (let pass = 0; pass < 12; pass++) {
    for (let i = 0; i < spot.length; i++) {
      const j = (i + 1) % spot.length;
      const a = spot[i] ?? 0;
      const b = (spot[j] ?? 0) + (j === 0 ? 360 : 0);
      if (j !== i && b - a < MIN) {
        const push = (MIN - (b - a)) / 2;
        spot[i] = a - push;
        spot[j] = b + push - (j === 0 ? 360 : 0);
      }
    }
  }
  const level = sorted.map(() => 0);
  for (let i = 1; i < sorted.length; i++) {
    if ((spot[i] ?? 0) - (spot[i - 1] ?? 0) < MIN + 4) level[i] = level[i - 1] === 0 ? 1 : 0;
  }

  const pop = (i: number) => ({
    initial: still ? false : ({ opacity: 0 } as const),
    animate: { opacity: 1 },
    transition: { duration: 0.6, delay: 0.5 + i * 0.08, ease: EASE },
  });

  return (
    <svg className="nowring" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {/* Saturn's long-season signs: the Moon's sign and its two neighbours */}
      <motion.path
        d={wedge((moon - 1) * 30, (moon + 2) * 30)}
        className="nowring__season"
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
      />

      <motion.circle
        cx={CX}
        cy={CY}
        r={R_OUT}
        className="nowring__rim"
        initial={still ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      <motion.circle
        cx={CX}
        cy={CY}
        r={R_IN}
        className="nowring__rim"
        initial={still ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, delay: 0.1, ease: EASE }}
      />

      <motion.g initial={still ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.8, delay: 0.3, ease: EASE }}>
        {Array.from({ length: 12 }, (_, i) => {
          const sign = (moon + i) % 12;
          const lon0 = sign * 30;
          const [x0, y0] = at(lon0, R_IN);
          const [x1, y1] = at(lon0, R_OUT);
          const [tx, ty] = at(lon0 + 15, R_OUT + 13);
          const anchor = tx < CX - 30 ? "end" : tx > CX + 30 ? "start" : "middle";
          return (
            <g key={sign}>
              <line x1={x0} y1={y0} x2={x1} y2={y1} className="nowring__spoke" />
              <text x={tx} y={ty + (i === 0 ? 0 : 3.5)} textAnchor={anchor} className={i === 0 ? "nowring__sign is-moon" : "nowring__sign"}>
                {anchor === "end" ? `${rashiName(sign, tradition)} ` : null}
                <tspan className="nowring__num">{i + 1}</tspan>
                {anchor === "end" ? null : i === 0 ? ` ${rashiName(sign, tradition)} · your Moon sign` : ` ${rashiName(sign, tradition)}`}
              </text>
            </g>
          );
        })}
      </motion.g>

      {/* the planets today */}
      {sorted.map((e, i) => {
        const lon = e.transit.lonSidereal;
        const [x, y] = at(lon, R_MID);
        const lr = R_IN - 15 - (level[i] ?? 0) * 14;
        const [lx, ly] = at(spot[i] ?? lon, lr);
        const [sx, sy] = at(lon, R_MID - 7);
        const [ex, ey] = at(spot[i] ?? lon, lr + 8);
        const cls = e.id === "MO" ? " is-moon" : e.effective ? " is-good" : "";
        return (
          <motion.g key={e.id} {...pop(i)}>
            <line x1={sx} y1={sy} x2={ex} y2={ey} className="nowring__lead" />
            {e.id === "MO" ? <circle cx={x} cy={y} r="13" className="nowring__halo" /> : null}
            <circle cx={x} cy={y} r={e.id === "MO" ? 6.5 : 4.5} className={`nowring__bead${cls}`} />
            <text x={lx} y={ly + 3.5} textAnchor="middle" className={`nowring__planet${cls}`}>
              {SHORT[e.id]}
            </text>
          </motion.g>
        );
      })}

      <text x={CX} y={CY - 4} textAnchor="middle" className="nowring__k">
        Today
      </text>
      <text x={CX} y={CY + 14} textAnchor="middle" className="nowring__date">
        {date}
      </text>
    </svg>
  );
}
