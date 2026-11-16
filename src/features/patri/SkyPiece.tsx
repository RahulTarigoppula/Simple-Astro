// "Your piece of sky": the real stars behind the Moon at the moment of birth. Yale Bright Star
// Catalogue positions turned into sidereal ecliptic longitude and latitude, drawn facing the zodiac
// (east on the left). The birth star's 13°20′ is the lit band, the Moon stands at its true place in its
// true phase, and any planet that stood in this stretch of sky is marked too.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { nakName, rashiName, type Tradition } from "../../data/regional";
import { GRAHA_ENGLISH } from "../../data/tables/names";
import { ayanamsa } from "../../engine/ayanamsa";
import type { StarCatalog } from "../../engine/sky/stars";
import type { GrahaId, Patri } from "../../engine/types";
import { loadStars } from "../sky/starField";

const EPS = (23.4392911 * Math.PI) / 180;
const W = 400;
const H = 236;
const SPAN = 58; // degrees of longitude across the picture
const K = W / SPAN; // px per degree, the same both ways
const NAK = 360 / 27;
const EASE = [0.22, 0.8, 0.2, 1] as const;
const BODIES: readonly GrahaId[] = ["SU", "ME", "VE", "MA", "JU", "SA"];

const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;

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

interface Star {
  k: number;
  x: number;
  y: number;
  r: number;
  o: number;
  d: number;
  bright: boolean;
}

export function SkyPiece({ patri, tradition, label }: { patri: Patri; tradition: Tradition | undefined; label: string }) {
  const uid = useId().replace(/:/g, "");
  const still = useReducedMotion();
  const cat = useCatalog();
  const mo = patri.grahas.MO;
  const c = mo.lonSidereal;
  const ay = useMemo(() => ayanamsa(2451545.0, patri.preset.ayanamsa), [patri.preset.ayanamsa]);
  const X = (lon: number) => W / 2 - wrap(lon - c) * K;
  const Y = (lat: number) => H / 2 - lat * K;
  const mx = W / 2;
  const my = Y(mo.latEcliptic);
  const nak0 = mo.nakshatra * NAK;
  const bandR = X(nak0); // lower longitude is on the right
  const bandL = X(nak0 + NAK);

  const stars = useMemo<Star[]>(() => {
    if (!cat) return [];
    const out: Star[] = [];
    const cosE = Math.cos(EPS);
    const sinE = Math.sin(EPS);
    const maxLat = H / 2 / K + 1;
    for (let i = 0; i < cat.count && out.length < 600; i++) {
      const m = cat.mag[i] ?? 9;
      if (m > 6.6) break; // sorted brightest first
      const x = cat.xyz[3 * i] ?? 0;
      const y = cat.xyz[3 * i + 1] ?? 0;
      const z = cat.xyz[3 * i + 2] ?? 0;
      const ye = y * cosE + z * sinE;
      const ze = -y * sinE + z * cosE;
      const lam = (Math.atan2(ye, x) * 180) / Math.PI - ay;
      const bet = (Math.asin(Math.max(-1, Math.min(1, ze))) * 180) / Math.PI;
      const dx = wrap(lam - c);
      if (Math.abs(dx) > SPAN / 2 + 1 || Math.abs(bet) > maxLat) continue;
      const inNak = wrap(lam - (nak0 + NAK / 2));
      const inside = Math.abs(inNak) <= NAK / 2;
      const px = W / 2 - dx * K;
      const py = H / 2 - bet * K;
      out.push({
        k: i,
        x: px,
        y: py,
        r: Math.max(0.7, 4.1 - 0.54 * m),
        o: Math.min(1, Math.max(0.45, 1.25 - m / 7)) * (inside ? 1 : 0.7),
        d: Math.hypot(px - W / 2, py - H / 2) / (W / 2),
        bright: m < 3.6,
      });
    }
    return out;
  }, [cat, ay, c, nak0]);

  const bodies = BODIES.map((id) => ({ id, g: patri.grahas[id] }))
    .filter(({ g }) => Math.abs(wrap(g.lonSidereal - c)) < SPAN / 2 - 3 && Math.abs(g.latEcliptic) < H / 2 / K - 2)
    .map(({ id, g }) => ({ id, x: X(g.lonSidereal), y: Y(g.latEcliptic) }));

  // sign edges inside the view, with the sign names along the foot
  const first = Math.ceil((c - SPAN / 2) / 30);
  const edges: number[] = [];
  for (let n = first; n * 30 < c + SPAN / 2; n++) edges.push(n * 30);
  const signAt = (lon: number) => ((Math.floor(lon / 30) % 12) + 12) % 12;
  const names: Array<{ x: number; t: string }> = [];
  const bounds = [c - SPAN / 2, ...edges, c + SPAN / 2];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i] ?? 0;
    const b = bounds[i + 1] ?? 0;
    if (b - a < 9) continue;
    names.push({ x: X((a + b) / 2), t: rashiName(signAt((a + b) / 2), tradition) });
  }

  const lit = litPath(patri.birthPanchang.elongation, 16);
  const fade = (delay: number, duration = 0.9) => ({
    initial: still ? false : ({ opacity: 0 } as const),
    animate: { opacity: 1 },
    transition: { duration, delay, ease: EASE },
  });

  return (
    <svg className="skypiece" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`pt-nak-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="var(--sky-moon)" stopOpacity="0" />
          <stop offset="0.5" stopColor="var(--sky-moon)" stopOpacity="0.13" />
          <stop offset="1" stopColor="var(--sky-moon)" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`pt-glow-${uid}`}>
          <stop offset="0" stopColor="var(--sky-moon)" stopOpacity="0.42" />
          <stop offset="1" stopColor="var(--sky-moon)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`pt-sun-${uid}`}>
          <stop offset="0" stopColor="var(--sky-sun)" stopOpacity="0.5" />
          <stop offset="1" stopColor="var(--sky-sun)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* the birth star's stretch of the zodiac */}
      <motion.g {...fade(0.15, 1.1)}>
        <rect x={bandL} y="0" width={bandR - bandL} height={H} fill={`url(#pt-nak-${uid})`} />
        <line x1={bandL} y1="14" x2={bandL} y2={H - 14} className="skypiece__edge" />
        <line x1={bandR} y1="14" x2={bandR} y2={H - 14} className="skypiece__edge" />
        <text x={(bandL + bandR) / 2} y="12" textAnchor="middle" className="skypiece__nak">
          {nakName(mo.nakshatra, tradition)}
        </text>
      </motion.g>

      {/* the Sun's path and the sign edges */}
      <motion.line
        x1="0"
        y1={H / 2}
        x2={W}
        y2={H / 2}
        className="skypiece__ecl"
        initial={still ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      <motion.g {...fade(0.5)}>
        {edges.map((e) => (
          <line key={e} x1={X(e)} y1={H / 2 - 7} x2={X(e)} y2={H / 2 + 7} className="skypiece__tick" />
        ))}
        {names.map((n) => (
          <text key={n.t} x={n.x} y={H - 5} textAnchor="middle" className="skypiece__sign">
            {n.t}
          </text>
        ))}
      </motion.g>

      {/* the real stars, arriving outward from the Moon */}
      <g className={still ? undefined : "skypiece__stars"}>
        {stars.map((s) => (
          <circle
            key={s.k}
            cx={s.x.toFixed(1)}
            cy={s.y.toFixed(1)}
            r={s.r.toFixed(2)}
            className={s.bright ? "skypiece__star is-bright" : "skypiece__star"}
            style={{ opacity: s.o, animationDelay: `${(0.15 + s.d * 0.9).toFixed(2)}s` }}
          />
        ))}
      </g>

      {/* planets that stood in this stretch of sky */}
      <motion.g {...fade(0.9)}>
        {bodies.map((b) => (
          <g key={b.id}>
            {b.id === "SU" ? <circle cx={b.x} cy={b.y} r="20" fill={`url(#pt-sun-${uid})`} /> : null}
            <circle cx={b.x} cy={b.y} r={b.id === "SU" ? 5.5 : 3} className={b.id === "SU" ? "skypiece__sun" : "skypiece__planet"} />
            <text x={b.x} y={b.y + (b.id === "SU" ? 19 : 14)} textAnchor="middle" className="skypiece__label">
              {GRAHA_ENGLISH[b.id]}
            </text>
          </g>
        ))}
      </motion.g>

      {/* the Moon where it stood, in its phase that night */}
      <motion.g
        initial={still ? false : { opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.45, ease: EASE }}
        style={{ transformOrigin: `${mx}px ${my}px`, transformBox: "view-box" }}
      >
        <g transform={`translate(${mx} ${my.toFixed(1)})`}>
          <circle r="52" fill={`url(#pt-glow-${uid})`} />
          <circle r="16" className="skypiece__moon-dark" />
          {lit ? <path d={lit} className="skypiece__moon" /> : null}
          <text y="33" textAnchor="middle" className="skypiece__label skypiece__label--moon">
            Moon
          </text>
        </g>
      </motion.g>
    </svg>
  );
}
