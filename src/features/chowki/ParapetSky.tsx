// The parapet strip: the real horizon at a place and instant — Sun, Moon (with phase) and the five
// naked-eye grahas at their true altitude/azimuth over a rooftop parapet. Recomputed every frame a
// drum turns, with no tween (sky-scrub).
import * as A from "astronomy-engine";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { mulberry32 } from "../../engine/math";

export interface SkyBody {
  alt: number;
  az: number;
}
export interface SkyState {
  sun: SkyBody;
  moon: SkyBody & { k: number; waxing: boolean };
  planets: Array<SkyBody & { id: string; abbr: string }>;
}

const PLANETS: Array<[A.Body, string, string]> = [
  [A.Body.Venus, "VE", "शु"],
  [A.Body.Jupiter, "JU", "गु"],
  [A.Body.Mars, "MA", "मं"],
  [A.Body.Saturn, "SA", "श"],
  [A.Body.Mercury, "ME", "बु"],
];

function horizon(body: A.Body, t: A.AstroTime, obs: A.Observer): SkyBody {
  const eq = A.Equator(body, t, obs, true, true);
  const h = A.Horizon(t, obs, eq.ra, eq.dec, "normal");
  return { alt: h.altitude, az: h.azimuth };
}

/** Sun, Moon and planets above a place at an instant. ~0.3 ms. */
export function skyAt(utcMs: number, lat: number, lon: number): SkyState {
  const t = A.MakeTime(new Date(utcMs));
  const obs = new A.Observer(lat, lon, 0);
  const sun = horizon(A.Body.Sun, t, obs);
  const moon = horizon(A.Body.Moon, t, obs);
  const ill = A.Illumination(A.Body.Moon, t);
  const phase = A.MoonPhase(t);
  return {
    sun,
    moon: { ...moon, k: ill.phase_fraction, waxing: phase < 180 },
    planets: PLANETS.map(([b, id, abbr]) => ({ ...horizon(b, t, obs), id, abbr })),
  };
}

// Sky gradient stops keyed by solar altitude; colours are tokens, mixed with color-mix.
const KEYS: Array<[number, string, string]> = [
  [-18, "--sky-night-0", "--sky-night-1"],
  [-12, "--sky-night-1", "--sky-astro-1"],
  [-6, "--sky-civil-0", "--sky-civil-1"],
  [-0.5, "--sky-rise-0", "--sky-rise-1"],
  [4, "--sky-golden-0", "--sky-golden-1"],
  [12, "--sky-day-0", "--sky-day-1"],
  [60, "--sky-noon-0", "--sky-noon-1"],
];

function skyColors(alt: number): [string, string] {
  let i = 0;
  while (i < KEYS.length - 1 && alt > (KEYS[i]?.[0] ?? 0)) i++;
  const hi = KEYS[i] ?? KEYS[0];
  const lo = KEYS[Math.max(0, i - 1)] ?? KEYS[0];
  if (!hi || !lo) return ["var(--sky-night-0)", "var(--sky-night-1)"];
  const span = hi[0] - lo[0] || 1;
  const t = Math.max(0, Math.min(1, (alt - lo[0]) / span));
  const p = (t * 100).toFixed(1);
  return [`color-mix(in oklch, var(${lo[1]}), var(${hi[1]}) ${p}%)`, `color-mix(in oklch, var(${lo[2]}), var(${hi[2]}) ${p}%)`];
}

function parapetPath(vw: number): string {
  let d = "M0 76";
  let x = 0;
  let i = 0;
  while (x < vw) {
    const seg = 34 + ((i * 37) % 5) * 16;
    const notch = 5 + ((i * 17) % 4) * 3;
    d += `H${Math.min(x + seg, vw).toFixed(1)}v${-notch}h9v${notch}`;
    x += seg + 9;
    i++;
  }
  return `${d}H${vw.toFixed(1)}V90H0Z`;
}

const STAR_SEED = mulberry32(0x5a7a);
const STARS = Array.from({ length: 46 }, () => [STAR_SEED(), 4 + STAR_SEED() * 58, 0.45 + STAR_SEED() * 0.75] as const);

interface ParapetSkyProps {
  utcMs: number;
  lat: number;
  lon: number;
  height?: number;
  className?: string;
}

/** A fixed 90-unit-tall band whose width follows the element, so nothing is stretched. */
export function ParapetSky({ utcMs, lat, lon, className }: ParapetSkyProps) {
  const host = useRef<HTMLDivElement>(null);
  const [vw, setVw] = useState(390);
  useLayoutEffect(() => {
    const el = host.current;
    if (!el) return;
    const fit = () => {
      const r = el.getBoundingClientRect();
      setVw(Math.max(160, r.height > 0 ? (r.width * 90) / r.height : 390));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const sky = useMemo(() => skyAt(utcMs, lat, lon), [utcMs, lat, lon]);
  const parapet = useMemo(() => parapetPath(vw), [vw]);
  const [c0, c1] = skyColors(sky.sun.alt);
  const place = (o: SkyBody) => {
    // East (az 90) sits left of centre, the sweep runs E → S → W across the strip.
    const x = Math.max(-30, Math.min(vw + 30, ((o.az - 55) / 250) * vw));
    const y = 76 - (Math.max(-20, Math.min(62, o.alt)) / 62) * 70;
    return { x, y };
  };
  const sp = place(sky.sun);
  const mp = place(sky.moon);
  const starAlpha = Math.max(0, Math.min(0.9, (-sky.sun.alt - 2) / 10));
  const shadeDx = (1 - sky.moon.k) * 8 * (sky.moon.waxing ? -1 : 1);
  return (
    <div
      ref={host}
      className={`sky ${className ?? ""}`}
      aria-hidden="true"
      data-decorative="true"
      style={{ background: `linear-gradient(180deg, ${c0} 0%, ${c1} 78%, ${c1} 100%)` }}
    >
      <svg preserveAspectRatio="none" viewBox={`0 0 ${vw.toFixed(1)} 90`}>
        <g opacity={starAlpha}>
          {STARS.map(([sx, sy, r]) => (
            <circle key={`${sx}-${sy}`} cx={(sx * vw).toFixed(1)} cy={sy.toFixed(1)} r={r.toFixed(2)} fill="var(--star)" />
          ))}
        </g>
        {sky.planets.map((p) => {
          if (p.alt < -1) return null;
          const q = place(p);
          return <circle key={p.id} cx={q.x.toFixed(1)} cy={q.y.toFixed(1)} r="1.9" fill="var(--brass-hi)" />;
        })}
        {sky.sun.alt > -3 ? <circle cx={sp.x.toFixed(1)} cy={sp.y.toFixed(1)} r="8" fill="var(--sun-disc)" /> : null}
        {sky.moon.alt > -3 ? (
          <g>
            <circle cx={mp.x.toFixed(1)} cy={mp.y.toFixed(1)} r="6.5" fill="var(--moon)" />
            <circle cx={(mp.x + shadeDx).toFixed(1)} cy={mp.y.toFixed(1)} r="6.5" fill={c0} />
          </g>
        ) : null}
        <path d={parapet} fill="var(--parapet)" />
      </svg>
    </div>
  );
}
