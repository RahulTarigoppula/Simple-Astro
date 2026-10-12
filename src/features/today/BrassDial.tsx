// The brass panchang dial: a turned conic face, an outer ring of 27 nakṣatra ticks with the Moon's
// bead riding it, a 24-hour day track (noon at the top) with daylight in bright brass, Rāhu Kāla as
// a haldi arc and the sunrise/sunset marks, and the tithi hand pointing at the Moon–Sun elongation.
import { useRef } from "react";

const C = 60;
const NAK = 360 / 27;

/** Polar → SVG, 0° at the top, clockwise. */
function pt(deg: number, r: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [C + r * Math.sin(a), C - r * Math.cos(a)];
}

function arc(a0: number, a1: number, r: number): string {
  const span = (((a1 - a0) % 360) + 360) % 360;
  if (span < 0.05) return "";
  const [x0, y0] = pt(a0, r);
  const [x1, y1] = pt(a0 + span, r);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)}A${r} ${r} 0 ${span > 180 ? 1 : 0} 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
}

/** Day-track angle of a local clock hour: midnight at the bottom, noon at the top. */
const hourAngle = (h: number): number => (h / 24) * 360 + 180;

/** Keep a rotating hand on the short way round (350° → 5° turns +15°, not −345°). */
function useUnwrapped(deg: number): number {
  const last = useRef<number | null>(null);
  const prev = last.current;
  let next = deg;
  if (prev !== null) {
    const d = ((((deg - prev) % 360) + 540) % 360) - 180;
    next = prev + d;
  }
  last.current = next;
  return next;
}

export interface BrassDialProps {
  /** Local clock hours (0–24) of the events, in the place's zone. */
  sunriseH: number;
  sunsetH: number;
  rahuH: readonly [number, number];
  nowH: number;
  /** Moon − Sun, degrees. */
  elongation: number;
  /** Sidereal Moon, degrees. */
  moonSid: number;
  nakIndex: number;
  label: string;
}

export function BrassDial({ sunriseH, sunsetH, rahuH, nowH, elongation, moonSid, nakIndex, label }: BrassDialProps) {
  const hand = useUnwrapped(elongation);
  const moon = useUnwrapped(moonSid);
  const now = useUnwrapped(hourAngle(nowH));
  const rise = hourAngle(sunriseH);
  const set = hourAngle(sunsetH);
  return (
    <div className="dial" role="img" aria-label={label}>
      <svg viewBox="0 0 120 120" aria-hidden="true" data-decorative="true">
        {/* turned bezel */}
        <circle cx={C} cy={C} r="58.6" fill="none" stroke="var(--brass-dark)" strokeWidth="2.6" />
        <circle cx={C} cy={C} r="56.6" fill="none" stroke="var(--brass-hi)" strokeWidth="1" opacity=".9" />
        {/* nakṣatra ring */}
        <circle cx={C} cy={C} r="46" fill="none" stroke="var(--brass-shadow)" strokeWidth=".7" />
        <path d={arc(nakIndex * NAK, (nakIndex + 1) * NAK, 51)} stroke="var(--brass-ink)" strokeWidth="9" fill="none" opacity=".26" />
        <g stroke="var(--brass-shadow)" strokeWidth=".8">
          {Array.from({ length: 27 }, (_, n) => n).map((i) => {
            const [x0, y0] = pt(i * NAK, 47);
            const [x1, y1] = pt(i * NAK, i % 9 === 0 ? 56 : 54);
            return <line key={`nak-${i}`} x1={x0} y1={y0} x2={x1} y2={y1} strokeWidth={i % 9 === 0 ? 1.4 : 0.8} />;
          })}
        </g>
        <g className="dial__spin" style={{ transform: `rotate(${moon}deg)` }}>
          <circle cx={C} cy={C - 51} r="3.4" fill="var(--moon)" stroke="var(--brass-ink)" strokeWidth=".7" />
        </g>
        {/* the day track */}
        <circle cx={C} cy={C} r="38" fill="none" stroke="var(--brass-ink)" strokeWidth="6" opacity=".22" />
        <path d={arc(rise, set, 38)} stroke="var(--brass-hi)" strokeWidth="6" fill="none" />
        <path d={arc(hourAngle(rahuH[0]), hourAngle(rahuH[1]), 38)} stroke="var(--warning)" strokeWidth="6" fill="none" />
        {[rise, set].map((a) => {
          const [x0, y0] = pt(a, 33.5);
          const [x1, y1] = pt(a, 42.5);
          return <line key={a} x1={x0} y1={y0} x2={x1} y2={y1} stroke="var(--brass-ink)" strokeWidth="1.5" strokeLinecap="round" />;
        })}
        <g stroke="var(--brass-shadow)" strokeWidth="1">
          {[0, 6, 12, 18].map((h) => {
            const [x0, y0] = pt(hourAngle(h), 30);
            const [x1, y1] = pt(hourAngle(h), 32.5);
            return <line key={h} x1={x0} y1={y0} x2={x1} y2={y1} />;
          })}
        </g>
        <g className="dial__spin" style={{ transform: `rotate(${now}deg)` }}>
          <path d={`M${C} ${C - 41.5}l-2.6 -4.2h5.2z`} fill="var(--brass-ink)" />
        </g>
        {/* tithi scale: thirty notches */}
        <circle cx={C} cy={C} r="26" fill="none" stroke="var(--brass-shadow)" strokeWidth="1.6" strokeDasharray="0.9 4.545" />
        {/* tithi hand */}
        <g className="dial__spin dial__hand" style={{ transform: `rotate(${hand}deg)` }}>
          <path d={`M${C} ${C + 8}V${C - 27}`} stroke="var(--brass-ink)" strokeWidth="2.2" strokeLinecap="round" />
          <circle cx={C} cy={C - 27} r="2.1" fill="var(--brass-ink)" />
        </g>
        <circle cx={C} cy={C} r="4" fill="var(--brass-ink)" />
        <circle cx={C} cy={C} r="1.6" fill="var(--accent)" />
      </svg>
    </div>
  );
}
