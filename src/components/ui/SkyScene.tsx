// The living sky: the real sky of this moment at the reader's place, drawn as a picture. The colour
// follows the Sun (night, dawn, day, golden hour, dusk), the Sun rides its arc from sunrise to sunset
// with the good hours lit along it, and after dark the Moon rides the same arc in its true phase.
import { motion, useReducedMotion } from "motion/react";
import { useId } from "react";

export type SkyPhase = "night" | "dawn" | "day" | "golden" | "dusk";

const MIN = 60_000;

/** Which sky is overhead: decided from the Sun's rise and set only. */
export function skyPhase(now: number, sunrise: number, sunset: number): SkyPhase {
  if (now < sunrise - 70 * MIN || now > sunset + 70 * MIN) return "night";
  if (now < sunrise + 45 * MIN) return "dawn";
  if (now < sunset - 75 * MIN) return "day";
  if (now <= sunset) return "golden";
  return "dusk";
}

const CX = 200;
const CY = 218;
const RX = 172;
const RY = 168;
const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const pt = (f: number): [number, number] => [CX - RX * Math.cos(Math.PI * f), CY - RY * Math.sin(Math.PI * f)];
const arc = (a: number, b: number): string => {
  const [x0, y0] = pt(a);
  const [x1, y1] = pt(b);
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${RX} ${RY} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

// Fixed star field (a small generator with a fixed seed, so the sky is the same on every visit).
const STARS: Array<[number, number, number, number]> = (() => {
  let s = 20261116;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: 70 }, () => [next() * 400, next() * 210, 0.5 + next() * 1.1, next()] as [number, number, number, number]);
})();

/** The lit part of the Moon for a Moon − Sun angle (0 new, 180 full), inside a disc of radius r at 0,0. */
function litPath(elongation: number, r: number): string | null {
  const e = ((elongation % 360) + 360) % 360;
  const lit = (1 - Math.cos((e * Math.PI) / 180)) / 2;
  if (lit < 0.01) return null;
  const waxing = e < 180;
  const rx = Math.abs(Math.cos((e * Math.PI) / 180)) * r;
  const crescent = lit < 0.5;
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  return `M0 ${-r}A${r} ${r} 0 0 ${outer} 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${inner} 0 ${-r}Z`;
}

export interface SkySceneProps {
  nowMs: number;
  sunriseMs: number;
  sunsetMs: number;
  /** Moon − Sun angle in degrees, for the Moon's phase. */
  elongation: number;
  /** Good windows of daylight, lit along the arc. */
  good?: ReadonlyArray<{ startMs: number; endMs: number }>;
  /** A window to pause new starts, marked along the arc. */
  avoid?: readonly [number, number] | null;
  riseLabel?: string;
  setLabel?: string;
  /** Accessible name of the picture. */
  label: string;
}

export function SkyScene({ nowMs, sunriseMs, sunsetMs, elongation, good = [], avoid, riseLabel, setLabel, label }: SkySceneProps) {
  const uid = useId().replace(/:/g, "");
  const still = useReducedMotion();
  const span = Math.max(1, sunsetMs - sunriseMs);
  const f = (ms: number) => clamp01((ms - sunriseMs) / span);
  const isDay = nowMs >= sunriseMs && nowMs <= sunsetMs;
  // After dark the Moon rides the arc across the night (sunset to the next sunrise, or the last one).
  const nightLen = 86_400_000 - span;
  const nightF = nowMs > sunsetMs ? clamp01((nowMs - sunsetMs) / nightLen) : clamp01(1 - (sunriseMs - nowMs) / nightLen);
  const bodyF = isDay ? f(nowMs) : 0.12 + nightF * 0.76;
  const [bx, by] = pt(bodyF);
  const lit = litPath(elongation, 15);
  const phase = skyPhase(nowMs, sunriseMs, sunsetMs);
  const starK = phase === "night" ? 1 : phase === "dusk" || phase === "dawn" ? 0.45 : 0;

  return (
    <svg className="sky-scene" viewBox="0 0 400 250" role="img" aria-label={label} data-phase={phase}>
      <defs>
        <radialGradient id={`sun-${uid}`}>
          <stop offset="0" stopColor="var(--sky-sun)" stopOpacity="0.55" />
          <stop offset="1" stopColor="var(--sky-sun)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`moon-${uid}`}>
          <stop offset="0" stopColor="var(--sky-moon)" stopOpacity="0.4" />
          <stop offset="1" stopColor="var(--sky-moon)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {starK > 0 ? (
        <g opacity={starK}>
          {STARS.map(([x, y, r, tw]) => (
            <circle
              key={`${x.toFixed(1)}-${y.toFixed(1)}`}
              cx={x}
              cy={y}
              r={r}
              className={tw > 0.7 ? "sky-scene__star sky-scene__star--tw" : "sky-scene__star"}
              style={{ animationDelay: `${(tw * 4).toFixed(2)}s`, opacity: 0.35 + tw * 0.6 }}
            />
          ))}
        </g>
      ) : null}

      {/* the path of the day */}
      <path d={arc(0, 1)} className="sky-scene__path" />
      {avoid ? <path d={arc(f(avoid[0]), f(avoid[1]))} className="sky-scene__avoid" /> : null}
      {good.map((g) => (
        <path key={g.startMs} d={arc(f(g.startMs), f(g.endMs))} className="sky-scene__good" />
      ))}
      {isDay ? (
        <motion.path
          d={arc(0, Math.max(0.002, f(nowMs)))}
          className="sky-scene__done"
          initial={still ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.4, ease: [0.22, 0.8, 0.2, 1] }}
        />
      ) : null}

      {/* horizon */}
      <line x1="8" y1={CY} x2="392" y2={CY} className="sky-scene__horizon" />
      <circle cx={CX - RX} cy={CY} r="3.5" className="sky-scene__foot" />
      <circle cx={CX + RX} cy={CY} r="3.5" className="sky-scene__foot" />
      {riseLabel ? (
        <text x={CX - RX} y={CY + 20} className="sky-scene__label" textAnchor="middle">
          {riseLabel}
        </text>
      ) : null}
      {setLabel ? (
        <text x={CX + RX} y={CY + 20} className="sky-scene__label" textAnchor="middle">
          {setLabel}
        </text>
      ) : null}

      {/* the Sun by day, the Moon in its phase by night */}
      <motion.g
        initial={still ? false : { opacity: 0, scale: 0.6 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.9, delay: 0.5, ease: [0.22, 0.8, 0.2, 1] }}
        style={{ transformOrigin: `${bx}px ${by}px` }}
      >
        {isDay ? (
          <>
            <circle cx={bx} cy={by} r="46" fill={`url(#sun-${uid})`} />
            <circle cx={bx} cy={by} r="13" className="sky-scene__sun" />
          </>
        ) : (
          <g transform={`translate(${bx.toFixed(1)} ${by.toFixed(1)})`}>
            <circle r="44" fill={`url(#moon-${uid})`} />
            <circle r="15" className="sky-scene__moon-dark" />
            {lit ? <path d={lit} className="sky-scene__moon" /> : null}
          </g>
        )}
      </motion.g>
    </svg>
  );
}
