// The real stars in a slice of the zodiac: Yale Bright Star Catalogue positions, turned into sidereal
// ecliptic longitude and latitude, drawn as the sky looks facing south (east on the left).
import { useEffect, useMemo, useState } from "react";
import { useSettings } from "../../app/hooks";
import { ayanamsa } from "../../engine/ayanamsa";
import type { StarCatalog } from "../../engine/sky/stars";
import { loadStars } from "../sky/starField";

const EPS = (23.4392911 * Math.PI) / 180;
const W = 320;
const H = 168;

interface Props {
  /** Sidereal longitude where the slice starts, degrees. */
  from: number;
  /** Width of the slice, degrees. */
  span: number;
  /** Highest |ecliptic latitude| shown, degrees. */
  lat?: number;
  label?: string;
}

function useCatalog(): StarCatalog | null {
  const [cat, setCat] = useState<StarCatalog | null>(null);
  useEffect(() => {
    let live = true;
    loadStars()
      .then((c) => live && setCat(c))
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);
  return cat;
}

export function StarPatch({ from, span, lat = 30, label }: Props) {
  const cat = useCatalog();
  const settings = useSettings();
  const margin = span * 0.25;
  const ay = useMemo(() => ayanamsa(2451545.0, settings.preset.ayanamsa), [settings.preset.ayanamsa]);

  const stars = useMemo(() => {
    if (!cat) return [];
    const out: Array<{ x: number; y: number; r: number; o: number; inside: boolean; k: number }> = [];
    const lo = from - margin;
    const width = span + 2 * margin;
    const cosE = Math.cos(EPS);
    const sinE = Math.sin(EPS);
    for (let i = 0; i < cat.count && out.length < 220; i++) {
      const m = cat.mag[i] ?? 9;
      if (m > 5.6) break; // sorted brightest first
      const x = cat.xyz[3 * i] ?? 0;
      const y = cat.xyz[3 * i + 1] ?? 0;
      const z = cat.xyz[3 * i + 2] ?? 0;
      const ye = y * cosE + z * sinE;
      const ze = -y * sinE + z * cosE;
      const lam = ((((Math.atan2(ye, x) * 180) / Math.PI - ay) % 360) + 360) % 360;
      const bet = (Math.asin(Math.max(-1, Math.min(1, ze))) * 180) / Math.PI;
      if (Math.abs(bet) > lat) continue;
      let d = lam - lo;
      d = ((d % 360) + 360) % 360;
      if (d > width) continue;
      out.push({
        // east (larger longitude) on the left, as when facing the zodiac
        x: W - (d / width) * W,
        y: H / 2 - (bet / lat) * (H / 2 - 8),
        r: Math.max(0.8, 4.2 - 0.62 * m),
        o: Math.max(0.5, 1.1 - m / 8),
        inside: d >= margin && d <= margin + span,
        k: i,
      });
    }
    return out;
  }, [cat, from, span, margin, lat, ay]);

  const brightest = stars.find((s) => s.inside);
  const x0 = W - (margin / (span + 2 * margin)) * W;
  const x1 = W - ((margin + span) / (span + 2 * margin)) * W;

  return (
    <figure className="starpatch">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label ?? "The real stars in this part of the zodiac"}>
        <defs>
          <linearGradient id="sp-band" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0" />
            <stop offset="0.5" stopColor="var(--accent)" stopOpacity="0.16" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </linearGradient>
        </defs>
        <rect x={x1} y="0" width={x0 - x1} height={H} fill="url(#sp-band)" />
        <line x1={x0} y1="0" x2={x0} y2={H} className="starpatch__edge" />
        <line x1={x1} y1="0" x2={x1} y2={H} className="starpatch__edge" />
        <line x1="0" y1={H / 2} x2={W} y2={H / 2} className="starpatch__ecl" />
        {stars.map((s, n) => (
          <circle
            key={s.k}
            cx={s.x}
            cy={s.y}
            r={s.r}
            className={`starpatch__star${s.inside ? "" : " is-out"}`}
            style={{ opacity: s.inside ? s.o : s.o * 0.4, animationDelay: `${(n * 0.37) % 5}s` }}
          />
        ))}
        {brightest ? <circle cx={brightest.x} cy={brightest.y} r={brightest.r + 5} className="starpatch__mark" /> : null}
      </svg>
      <figcaption>
        {cat ? "The real stars in this slice of the sky (brightest circled) · the line is the Sun's path" : "Loading the star catalogue…"}
      </figcaption>
    </figure>
  );
}
