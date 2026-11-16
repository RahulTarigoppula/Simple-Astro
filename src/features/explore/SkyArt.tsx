// The pictures on Explore's bands. Every one is drawn from real numbers: the Yale Bright Star
// Catalogue for the stars (turned into sidereal ecliptic longitude and latitude) and the engine's
// present positions for the Sun, the Moon and the planets. Nothing here is scattered for effect.
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useMemo, useState } from "react";
import { useSettings } from "../../app/hooks";
import { GRAHA_LORE, RASHI_LORE } from "../../data/lore";
import { SIGN_MARK } from "../../data/tables/names";
import { ayanamsa } from "../../engine/ayanamsa";
import type { TransitGraha } from "../../engine/gochar";
import type { StarCatalog } from "../../engine/sky/stars";
import { GRAHA_IDS, type GrahaId } from "../../engine/types";
import { loadStars } from "../sky/starField";
import "./skyart.css";

export type Sky = Record<GrahaId, TransitGraha>;

const EPS = (23.4392911 * Math.PI) / 180;
const DEG = 180 / Math.PI;
const EASE = [0.22, 0.8, 0.2, 1] as const;
const norm = (x: number) => ((x % 360) + 360) % 360;
/** The signed difference of two longitudes, −180 to 180. */
const wrap = (d: number) => norm(d + 180) - 180;
const f1 = (n: number) => n.toFixed(1);
const signMark = (i: number) => `${SIGN_MARK[i] ?? ""}︎`;
export const englishOf = (id: GrahaId) => GRAHA_LORE.find((g) => g.id === id)?.english ?? id;
const starR = (mag: number, k = 1) => Math.max(0.55, (3.1 - 0.5 * mag) * k);
const starO = (mag: number) => Math.max(0.35, Math.min(1, 1.15 - mag / 6.5));

/** Pictures stand still for a reader who asks for less motion, and in tests. */
function useStill(): boolean {
  const reduced = useReducedMotion();
  return !!reduced || import.meta.env.MODE === "test";
}

/** "Sun in Scorpio, Moon in Sagittarius, …": the picture's facts as words. */
export function skyWords(sky: Sky, ids: readonly GrahaId[] = GRAHA_IDS): string {
  return ids.map((id) => `${englishOf(id)} in ${RASHI_LORE[sky[id].sign]?.western ?? ""}`).join(", ");
}

// ── the star catalogue ────────────────────────────────────────────────────
let catReady: StarCatalog | null = null;

/** The bundled star catalogue (loaded once; later screens get it at once). */
export function useCatalog(): StarCatalog | null {
  const [cat, setCat] = useState<StarCatalog | null>(catReady);
  useEffect(() => {
    if (cat) return;
    let live = true;
    try {
      loadStars()
        .then((c) => {
          catReady = c;
          if (live) setCat(c);
        })
        .catch(() => undefined);
    } catch {
      // no catalogue here: the picture is drawn without its stars
    }
    return () => {
      live = false;
    };
  }, [cat]);
  return cat;
}

export interface EclStar {
  /** Sidereal ecliptic longitude, degrees. */
  lam: number;
  /** Ecliptic latitude, degrees. */
  bet: number;
  mag: number;
  k: number;
}

const eclCache = new WeakMap<StarCatalog, Array<[number, number, number]>>();
/** Every star down to magnitude 5.6 as J2000 ecliptic longitude, latitude and magnitude, brightest first. */
function ecliptic(cat: StarCatalog): Array<[number, number, number]> {
  const hit = eclCache.get(cat);
  if (hit) return hit;
  const out: Array<[number, number, number]> = [];
  const cosE = Math.cos(EPS);
  const sinE = Math.sin(EPS);
  for (let i = 0; i < cat.count; i++) {
    const m = cat.mag[i] ?? 9;
    if (m > 5.6) break;
    const x = cat.xyz[3 * i] ?? 0;
    const y = cat.xyz[3 * i + 1] ?? 0;
    const z = cat.xyz[3 * i + 2] ?? 0;
    const ye = y * cosE + z * sinE;
    const ze = -y * sinE + z * cosE;
    out.push([Math.atan2(ye, x) * DEG, Math.asin(Math.max(-1, Math.min(1, ze))) * DEG, m]);
  }
  eclCache.set(cat, out);
  return out;
}

/** The real stars in the sidereal zodiac's own frame, brightest first. Null until the catalogue arrives. */
export function useSkyStars(): EclStar[] | null {
  const cat = useCatalog();
  const settings = useSettings();
  const ay = useMemo(() => ayanamsa(2451545.0, settings.preset.ayanamsa), [settings.preset.ayanamsa]);
  return useMemo(() => (cat ? ecliptic(cat).map(([l, b, m], k) => ({ lam: norm(l - ay), bet: b, mag: m, k })) : null), [cat, ay]);
}

/** The brightest star inside a slice of the zodiac (within 34° of the Sun's path). */
function brightestIn(stars: EclStar[] | null, from: number, span: number): EclStar | null {
  if (!stars) return null;
  for (const s of stars) {
    if (Math.abs(s.bet) > 34) continue;
    if (norm(s.lam - from) <= span) return s;
  }
  return null;
}
/** How far the view leans north or south so that the slice's brightest star is in the picture. */
const leanFor = (s: EclStar | null) => (s ? Math.max(-12, Math.min(12, s.bet * 0.6)) : 0);

// ── the Sun, the Moon and the planets ─────────────────────────────────────
/** The lit part of the Moon for a Moon − Sun angle (0 new, 180 full), in a disc of radius r at 0,0. */
function moonLit(elongation: number, r: number): string | null {
  const e = norm(elongation);
  const lit = (1 - Math.cos(e / DEG)) / 2;
  if (lit < 0.01) return null;
  const waxing = e < 180;
  const rx = Math.abs(Math.cos(e / DEG)) * r;
  const crescent = lit < 0.5;
  const outer = waxing ? 1 : 0;
  const inner = waxing ? (crescent ? 0 : 1) : crescent ? 1 : 0;
  return `M0 ${-r}A${r} ${r} 0 0 ${outer} 0 ${r}A${rx.toFixed(2)} ${r} 0 0 ${inner} 0 ${-r}Z`;
}

function Defs({ uid }: { uid: string }) {
  return (
    <defs>
      <radialGradient id={`gs-${uid}`}>
        <stop offset="0" stopColor="var(--sky-sun)" stopOpacity="0.55" />
        <stop offset="1" stopColor="var(--sky-sun)" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`gm-${uid}`}>
        <stop offset="0" stopColor="var(--sky-moon)" stopOpacity="0.4" />
        <stop offset="1" stopColor="var(--sky-moon)" stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`sh-${uid}`} cx="0.34" cy="0.3" r="0.9">
        <stop offset="0" stopColor="rgba(255, 255, 255, 0.5)" />
        <stop offset="0.45" stopColor="rgba(255, 255, 255, 0)" />
        <stop offset="1" stopColor="rgba(0, 0, 0, 0.45)" />
      </radialGradient>
      <linearGradient id={`sl-${uid}`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="rgba(255, 255, 255, 0)" />
        <stop offset="0.5" stopColor="rgba(255, 255, 255, 0.1)" />
        <stop offset="1" stopColor="rgba(255, 255, 255, 0)" />
      </linearGradient>
    </defs>
  );
}

/** One body at x,y: the Sun glows, the Moon shows its real phase, Saturn has its ring, the two nodes are empty rings. */
function Body({ id, x, y, r, elong, uid }: { id: GrahaId; x: number; y: number; r: number; elong: number; uid: string }) {
  const at = `translate(${f1(x)} ${f1(y)})`;
  if (id === "SU")
    return (
      <g transform={at}>
        <circle r={r * 3.2} fill={`url(#gs-${uid})`} />
        <circle r={r} className="sk-sun" />
      </g>
    );
  if (id === "MO") {
    const lit = moonLit(elong, r);
    return (
      <g transform={at}>
        <circle r={r * 2.8} fill={`url(#gm-${uid})`} />
        <circle r={r} className="sk-moon-dark" />
        {lit ? <path d={lit} className="sk-moon" /> : null}
      </g>
    );
  }
  if (id === "RA" || id === "KE")
    return (
      <g transform={at}>
        <circle r={r} className="sk-node" style={{ stroke: `var(--g-${id})`, strokeWidth: Math.max(1.2, r / 6) }} />
        <circle r={Math.max(0.9, r / 5)} style={{ fill: `var(--g-${id})` }} />
      </g>
    );
  return (
    <g transform={at}>
      <circle r={r} style={{ fill: `var(--g-${id})` }} />
      {r >= 10 ? <circle r={r} fill={`url(#sh-${uid})`} /> : null}
      {id === "SA" ? (
        <ellipse
          rx={r * 1.95}
          ry={r * 0.5}
          transform="rotate(-18)"
          className="sk-ring"
          style={{ stroke: "var(--g-SA)", strokeWidth: Math.max(1, r / 7) }}
        />
      ) : null}
    </g>
  );
}

const bodyR = (id: GrahaId, k = 1) => (id === "SU" ? 8 : id === "MO" ? 7 : 4.6) * k;

// ── the zodiac belt as a ring ─────────────────────────────────────────────
const C = 200;
const R_ECL = 144;
const R_IN = 170;
const R_OUT = 197;

function ringPos(lon: number, r: number): [number, number] {
  const a = (180 + lon) / DEG;
  return [C + r * Math.cos(a), C - r * Math.sin(a)];
}
function wedge(a0: number, a1: number, r0: number, r1: number): string {
  const [x0, y0] = ringPos(a0, r1);
  const [x1, y1] = ringPos(a1, r1);
  const [x2, y2] = ringPos(a1, r0);
  const [x3, y3] = ringPos(a0, r0);
  return `M${f1(x0)} ${f1(y0)}A${r1} ${r1} 0 0 0 ${f1(x1)} ${f1(y1)}L${f1(x2)} ${f1(y2)}A${r0} ${r0} 0 0 1 ${f1(x3)} ${f1(y3)}Z`;
}

interface BeltRingProps {
  sky: Sky;
  /** Twelve signs or twenty-seven birth stars around the rim. */
  parts?: 12 | 27;
  /** Which bodies are drawn (all nine by default). */
  show?: readonly GrahaId[];
  /** The part that is lit (where the Moon is now, say). */
  lit?: number | undefined;
  /** The reader's own part, ringed in gold. */
  mine?: number | undefined;
  /** Accessible name; leave out when the same facts are in the text beside it. */
  label?: string;
  /** Words in the middle of the ring. */
  children?: React.ReactNode;
}

/**
 * The zodiac as it really is: the real stars within 12° of the Sun's path, bent into a ring, with
 * the Sun, the Moon and the planets at their present sidereal longitudes on that path.
 */
export function BeltRing({ sky, parts = 12, show = GRAHA_IDS, lit, mine, label, children }: BeltRingProps) {
  const stars = useSkyStars();
  const still = useStill();
  const uid = useId().replace(/:/g, "");
  const span = 360 / parts;
  const elong = norm(sky.MO.lonSidereal - sky.SU.lonSidereal);

  const belt = useMemo(
    () =>
      (stars ?? [])
        .filter((s) => Math.abs(s.bet) <= 12.5 && s.mag <= 5.1)
        .map((s) => {
          const [x, y] = ringPos(s.lam, R_ECL + s.bet * 2);
          return { x, y, r: starR(s.mag, 1.05), o: starO(s.mag), k: s.k };
        }),
    [stars],
  );

  const bodies = useMemo(() => {
    const order = [...show].sort((a, b) => sky[a].lonSidereal - sky[b].lonSidereal);
    const placed: Array<{ id: GrahaId; lon: number; t: number }> = [];
    for (const id of order) {
      const lon = sky[id].lonSidereal;
      let t = 0;
      while (t < 2 && placed.some((p) => p.t === t && Math.abs(wrap(p.lon - lon)) < 26)) t++;
      placed.push({ id, lon, t });
    }
    return placed;
  }, [sky, show]);

  return (
    <div className="belt-ring">
      <svg viewBox="0 0 400 400" role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true}>
        <Defs uid={uid} />
        <circle cx={C} cy={C} r={R_OUT} className="sk-rim" />
        <circle cx={C} cy={C} r={R_IN} className="sk-rim" />
        {lit != null ? <path d={wedge(lit * span, (lit + 1) * span, R_IN, R_OUT)} className="sk-lit" /> : null}
        {Array.from({ length: parts }, (_, i) => {
          const [x0, y0] = ringPos(i * span, R_IN);
          const [x1, y1] = ringPos(i * span, R_OUT);
          const [lx, ly] = ringPos(i * span + span / 2, (R_IN + R_OUT) / 2);
          const on = lit === i || mine === i;
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: the parts of the zodiac never reorder
            <g key={i}>
              <line x1={f1(x0)} y1={f1(y0)} x2={f1(x1)} y2={f1(y1)} className="sk-tick" />
              {parts === 12 ? (
                <text x={f1(lx)} y={f1(ly + 5.2)} className={`sk-sign${on ? " is-on" : ""}`}>
                  {signMark(i)}
                </text>
              ) : (
                <circle cx={f1(lx)} cy={f1(ly)} r={on ? 3.4 : 1.7} className={`sk-bead${on ? " is-on" : ""}`} />
              )}
            </g>
          );
        })}
        {mine != null ? <path d={wedge(mine * span, (mine + 1) * span, R_IN, R_OUT)} className="sk-mine" /> : null}

        <motion.g
          key={stars ? "stars" : "none"}
          initial={still ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, ease: EASE }}
        >
          {belt.map((s) => (
            <circle key={s.k} cx={f1(s.x)} cy={f1(s.y)} r={s.r.toFixed(2)} className="sk-star" style={{ opacity: s.o }} />
          ))}
        </motion.g>

        <motion.circle
          cx={C}
          cy={C}
          r={R_ECL}
          className="sk-ecl"
          initial={still ? false : { pathLength: 0, opacity: 0 }}
          animate={{ pathLength: 1, opacity: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
        />

        {bodies.map(({ id, lon, t }, n) => {
          const [x, y] = ringPos(lon, R_ECL);
          const rl = 113 - t * 15;
          const [lx, ly] = ringPos(lon, rl);
          const [ax, ay] = ringPos(lon, R_ECL - bodyR(id) - 4);
          const [bx, by] = ringPos(lon, rl + 9);
          return (
            <motion.g
              key={id}
              initial={still ? false : { opacity: 0, scale: 0.4 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.7, delay: 0.5 + n * 0.08, ease: EASE }}
              style={{ transformOrigin: `${f1(x)}px ${f1(y)}px` }}
            >
              <line x1={f1(ax)} y1={f1(ay)} x2={f1(bx)} y2={f1(by)} className="sk-lead" />
              <Body id={id} x={x} y={y} r={bodyR(id)} elong={elong} uid={uid} />
              <text x={f1(lx)} y={f1(ly + 4)} className={`sk-name${id === "SU" || id === "MO" ? " is-main" : ""}`}>
                {englishOf(id)}
              </text>
            </motion.g>
          );
        })}
      </svg>
      {children ? <div className="belt-ring__center">{children}</div> : null}
    </div>
  );
}

// ── the zodiac belt laid flat: Aries to Pisces, left to right ─────────────
const STRIP_W = 400;
const stripX = (lon: number) => (norm(lon) / 360) * STRIP_W;

/** The nine planets in their true present order along the Sun's path, over the real stars of the zodiac. */
export function BeltStrip({ sky, label }: { sky: Sky; label?: string }) {
  const stars = useSkyStars();
  const still = useStill();
  const uid = useId().replace(/:/g, "");
  const W = STRIP_W;
  const Y = 96;
  const elong = norm(sky.MO.lonSidereal - sky.SU.lonSidereal);
  const belt = useMemo(
    () =>
      (stars ?? [])
        .filter((s) => Math.abs(s.bet) <= 13 && s.mag <= 4.9)
        .map((s) => ({ x: (s.lam / 360) * W, y: Y - s.bet * 2.1, r: starR(s.mag, 0.85), o: starO(s.mag), k: s.k })),
    [stars],
  );
  const bodies = useMemo(() => {
    const order = [...GRAHA_IDS].sort((a, b) => sky[a].lonSidereal - sky[b].lonSidereal);
    const placed: Array<{ id: GrahaId; x: number; t: number }> = [];
    for (const id of order) {
      const x = stripX(sky[id].lonSidereal);
      let t = 0;
      while (t < 3 && placed.some((p) => p.t === t && Math.abs(p.x - x) < 44)) t++;
      placed.push({ id, x, t });
    }
    return placed;
  }, [sky]);
  return (
    <svg
      className="belt-strip"
      viewBox={`0 0 ${W} 150`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Defs uid={uid} />
      {RASHI_LORE.map((r, i) => (
        <g key={r.name}>
          <line x1={(i * W) / 12} y1={Y - 30} x2={(i * W) / 12} y2={Y + 30} className="sk-tick" />
          <text x={((i + 0.5) * W) / 12} y="146" className={`sk-sign sk-sign--sm${sky.MO.sign === i ? " is-on" : ""}`}>
            {signMark(i)}
          </text>
        </g>
      ))}
      <line x1={W} y1={Y - 30} x2={W} y2={Y + 30} className="sk-tick" />
      <motion.g
        key={stars ? "stars" : "none"}
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      >
        {belt.map((s) => (
          <circle key={s.k} cx={f1(s.x)} cy={f1(s.y)} r={s.r.toFixed(2)} className="sk-star" style={{ opacity: s.o }} />
        ))}
      </motion.g>
      <motion.path
        d={`M0 ${Y}H${W}`}
        className="sk-ecl"
        initial={still ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.2, ease: EASE }}
      />
      {bodies.map(({ id, x, t }, n) => {
        const ly = 50 - t * 14;
        const tx = Math.max(18, Math.min(W - 18, x));
        return (
          <motion.g
            key={id}
            initial={still ? false : { opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 + n * 0.08, ease: EASE }}
          >
            <line x1={f1(x)} y1={Y - bodyR(id, 1.1) - 4} x2={f1(x)} y2={ly + 5} className="sk-lead" />
            <Body id={id} x={x} y={Y} r={bodyR(id, 1.1)} elong={elong} uid={uid} />
            <text x={f1(tx)} y={ly} className={`sk-name${id === "SU" || id === "MO" ? " is-main" : ""}`}>
              {englishOf(id)}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

// ── a window on the real sky ──────────────────────────────────────────────
export interface SkyBody {
  id: GrahaId;
  /** Sidereal longitude, degrees. */
  lon: number;
  /** Drawn large, as the subject of the picture. */
  big?: boolean;
  /** The words beside it; none for the subject. */
  name?: string;
}

interface SkyWindowProps {
  /** The sidereal longitude in the middle of the picture. */
  centre: number;
  /** The slice of the zodiac the picture is about (start and width, degrees): softly lit, the sky either side dimmed. */
  from?: number;
  span?: number;
  bodies?: readonly SkyBody[];
  /** Moon − Sun angle, for the Moon's phase when the Moon is in the picture. */
  elong?: number;
  label?: string;
}

const WW = 400;
const WH = 280;
const WS = 6; // pixels per degree, the same both ways: the sky is not stretched

/**
 * 67° × 47° of the real sky along the zodiac, facing south (east on the left): the catalogue's stars
 * where they are, the Sun's path, the sign boundaries, and any body that is in this part of the sky.
 */
export function SkyWindow({ centre, from, span = 30, bodies = [], elong = 90, label }: SkyWindowProps) {
  const slice = from != null;
  const f0 = from ?? 0;
  const stars = useSkyStars();
  const still = useStill();
  const uid = useId().replace(/:/g, "");
  const best = useMemo(() => (slice ? brightestIn(stars, f0, span) : null), [stars, slice, f0, span]);
  const lean = leanFor(best);
  const X = (lon: number) => WW / 2 - wrap(lon - centre) * WS;
  const Yb = (bet: number) => WH / 2 - (bet - lean) * WS;
  const ye = Yb(0);

  const dots = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; o: number; k: number; tw: boolean; halo: boolean }> = [];
    for (const s of stars ?? []) {
      const dx = wrap(s.lam - centre);
      if (Math.abs(dx) > WW / 2 / WS + 1) continue;
      const y = WH / 2 - (s.bet - lean) * WS;
      if (y < -4 || y > WH + 4) continue;
      const inside = !slice || norm(s.lam - f0) <= span;
      out.push({
        x: WW / 2 - dx * WS,
        y,
        r: starR(s.mag, inside ? 1.7 : 1.25),
        o: starO(s.mag) * (inside ? 1 : 0.5),
        halo: inside && s.mag < 2.6,
        k: s.k,
        tw: inside && s.mag < 4.2,
      });
    }
    return out;
  }, [stars, centre, lean, slice, f0, span]);

  const xa = X(f0);
  const xb = X(f0 + span);
  const signs = Array.from({ length: 12 }, (_, i) => {
    const xc = X(i * 30 + 15);
    const left = Math.max(10, xc - 15 * WS);
    const right = Math.min(WW - 10, xc + 15 * WS);
    return { i, edge: X(i * 30), mid: (left + right) / 2, room: right - left };
  });
  let lastX = -999;
  let track = 0;
  const marks = [...bodies]
    .map((b) => ({ ...b, x: X(b.lon) }))
    .filter((b) => b.x > 8 && b.x < WW - 8)
    .sort((a, b) => a.x - b.x)
    .map((b) => {
      track = b.name && b.x - lastX < 46 ? track + 1 : 0;
      if (b.name) lastX = b.x;
      return { ...b, t: track };
    });

  return (
    <svg
      className="sky-window"
      viewBox={`0 0 ${WW} ${WH}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <Defs uid={uid} />
      {slice ? (
        <>
          <rect x={f1(xb)} y="0" width={f1(xa - xb)} height={WH} fill={`url(#sl-${uid})`} />
          <line x1={f1(xa)} y1="14" x2={f1(xa)} y2={WH - 30} className="sk-edge" />
          <line x1={f1(xb)} y1="14" x2={f1(xb)} y2={WH - 30} className="sk-edge" />
        </>
      ) : null}
      <motion.g
        key={stars ? "stars" : "none"}
        initial={still ? false : { opacity: 0, scale: 1.06 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.3, ease: EASE }}
        style={{ transformOrigin: `${WW / 2}px ${WH / 2}px` }}
      >
        {dots.map((s) =>
          s.halo ? <circle key={`h${s.k}`} cx={f1(s.x)} cy={f1(s.y)} r={(s.r * 3.4).toFixed(1)} className="sk-halo" /> : null,
        )}
        {dots.map((s) => (
          <circle
            key={s.k}
            cx={f1(s.x)}
            cy={f1(s.y)}
            r={s.r.toFixed(2)}
            className={s.tw ? "sk-star sk-star--tw" : "sk-star"}
            style={{ opacity: s.o, animationDelay: `${((s.k * 0.37) % 5).toFixed(2)}s` }}
          />
        ))}
        {best ? <circle cx={f1(X(best.lam))} cy={f1(Yb(best.bet))} r={starR(best.mag, 1.7) + 6} className="sk-best" /> : null}
      </motion.g>
      <motion.path
        d={`M0 ${f1(ye)}H${WW}`}
        className="sk-ecl"
        initial={still ? false : { pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
      />
      {signs.map((s) => (
        <g key={s.i}>
          {s.edge > 2 && s.edge < WW - 2 ? <line x1={f1(s.edge)} y1={ye - 7} x2={f1(s.edge)} y2={ye + 7} className="sk-tick" /> : null}
          {s.room > 76 ? (
            <text x={f1(s.mid)} y={WH - 8} className="sk-cap">
              {signMark(s.i)} {RASHI_LORE[s.i]?.western}
            </text>
          ) : null}
        </g>
      ))}
      {marks.map((b, n) => {
        const r = b.big ? 21 : bodyR(b.id, 1.25);
        return (
          <motion.g
            key={b.id}
            initial={still ? false : { opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.55 + n * 0.1, ease: EASE }}
            style={{ transformOrigin: `${f1(b.x)}px ${f1(ye)}px` }}
          >
            <Body id={b.id} x={b.x} y={ye} r={r} elong={elong} uid={uid} />
            {b.name ? (
              <text x={f1(Math.max(26, Math.min(WW - 26, b.x)))} y={f1(ye - r - 9 - b.t * 14)} className="sk-name is-main">
                {b.name}
              </text>
            ) : null}
          </motion.g>
        );
      })}
    </svg>
  );
}

/** The bodies of the present sky as marks for a window; `focus` is drawn large and unnamed. */
export function bodiesOf(sky: Sky, focus?: GrahaId): SkyBody[] {
  return GRAHA_IDS.map((id) =>
    id === focus ? { id, lon: sky[id].lonSidereal, big: true } : { id, lon: sky[id].lonSidereal, name: englishOf(id) },
  );
}

// ── a row's own mark: the real stars of one slice, in a small round window ─
/** 28° of real sky around a slice of the zodiac, as a 42 px disc for a list row. */
export function StarDot({ from, span, size = 42 }: { from: number; span: number; size?: number }) {
  const stars = useSkyStars();
  const centre = from + span / 2;
  const S = 1.5;
  const dots = useMemo(() => {
    const lean = leanFor(brightestIn(stars, from, span));
    const out: Array<{ x: number; y: number; r: number; o: number; k: number }> = [];
    for (const s of stars ?? []) {
      if (s.mag > 5) break;
      const dx = wrap(s.lam - centre);
      const dy = s.bet - lean;
      if (dx * dx + dy * dy > 13.6 * 13.6) continue;
      const inside = norm(s.lam - from) <= span;
      out.push({
        x: 21 - dx * S,
        y: 21 - dy * S,
        r: Math.max(0.5, 2.1 - 0.34 * s.mag) * (inside ? 1 : 0.8),
        o: starO(s.mag) * (inside ? 1 : 0.45),
        k: s.k,
      });
    }
    return out;
  }, [stars, from, span, centre]);
  return (
    <svg className="star-dot" width={size} height={size} viewBox="0 0 42 42" aria-hidden="true">
      <circle cx="21" cy="21" r="21" className="star-dot__sky" />
      {dots.map((s) => (
        <circle key={s.k} cx={f1(s.x)} cy={f1(s.y)} r={s.r.toFixed(2)} className="sk-star" style={{ opacity: s.o }} />
      ))}
    </svg>
  );
}

/** The Moon in its present phase, as a small mark. */
export function MoonMark({ elong, size = 42 }: { elong: number; size?: number }) {
  const lit = moonLit(elong, 12);
  return (
    <svg className="star-dot" width={size} height={size} viewBox="0 0 42 42" aria-hidden="true">
      <circle cx="21" cy="21" r="21" className="star-dot__sky" />
      <g transform="translate(21 21)">
        <circle r="12" className="sk-moon-dark" />
        {lit ? <path d={lit} className="sk-moon" /> : null}
      </g>
    </svg>
  );
}

/** A sign's mark over the night, lit gold when the Sun is in it. */
export function SignMark({ i, size = 42 }: { i: number; size?: number }) {
  return (
    <svg className="star-dot" width={size} height={size} viewBox="0 0 42 42" aria-hidden="true">
      <circle cx="21" cy="21" r="21" className="star-dot__sky" />
      <text x="21" y="28" className="star-dot__sign">
        {signMark(i)}
      </text>
    </svg>
  );
}

// ── the stars that do not set ─────────────────────────────────────────────
// The Seven Sages (Saptarṣi, the Plough): J2000 right ascension (hours) and declination (degrees) of
// Dubhe, Merak, Phecda, Megrez, Alioth, Mizar and Alkaid. The line joins the catalogue's own stars.
const SAGES: ReadonlyArray<readonly [number, number]> = [
  [11.0621, 61.751],
  [11.0307, 56.3824],
  [11.8972, 53.6948],
  [12.257, 57.0326],
  [12.9005, 55.9598],
  [13.3987, 54.9254],
  [13.7923, 49.3133],
];

const POLE_W = 400;
const POLE_H = 230;
const POLE_S = 2.9;
const POLE_ROT = Math.PI / 4;

/** The real stars around the north celestial pole, with the Pole Star (Dhruva) ringed in the middle. */
export function PoleStars({ label, sages }: { label?: string; sages?: boolean }) {
  const cat = useCatalog();
  const still = useStill();
  const W = POLE_W;
  const H = POLE_H;
  const S = POLE_S;
  const ROT = POLE_ROT;
  const { dots, pole } = useMemo(() => {
    const out: Array<{ x: number; y: number; r: number; o: number; k: number }> = [];
    let p: { x: number; y: number } | null = null;
    if (cat)
      for (let i = 0; i < cat.count; i++) {
        const m = cat.mag[i] ?? 9;
        if (m > 4.9) break;
        const dec = (cat.dec[i] ?? 0) * DEG;
        if (dec < 12) continue;
        // Looking up at the pole, right ascension runs clockwise.
        const a = (cat.ra[i] ?? 0) + POLE_ROT;
        const rr = (90 - dec) * POLE_S;
        const x = POLE_W / 2 + rr * Math.sin(a);
        const y = POLE_H / 2 - rr * Math.cos(a);
        if (x < -3 || x > POLE_W + 3 || y < -3 || y > POLE_H + 3) continue;
        if (!p && dec > 88) p = { x, y };
        out.push({ x, y, r: starR(m, 0.95), o: starO(m), k: i });
      }
    return { dots: out, pole: p };
  }, [cat]);
  const at = (raH: number, dec: number): [number, number] => {
    const a = (raH / 12) * Math.PI + ROT;
    const rr = (90 - dec) * S;
    return [W / 2 + rr * Math.sin(a), H / 2 - rr * Math.cos(a)];
  };
  const seven = SAGES.map(([ra, dec]) => at(ra, dec));
  // the bowl (Dubhe, Merak, Phecda, Megrez, back to Dubhe), then the handle
  const plough = [0, 1, 2, 3, 0, 3, 4, 5, 6]
    .map((n, k) => `${k === 0 || k === 5 ? "M" : "L"}${f1(seven[n]?.[0] ?? 0)} ${f1(seven[n]?.[1] ?? 0)}`)
    .join("");
  return (
    <svg
      className="pole-stars"
      viewBox={`0 0 ${W} ${H}`}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <circle cx={W / 2} cy={H / 2} r={30 * S} className="sk-orbit" />
      <circle cx={W / 2} cy={H / 2} r={15 * S} className="sk-orbit" />
      <motion.g
        key={cat ? "stars" : "none"}
        initial={still ? false : { opacity: 0, rotate: -8 }}
        animate={{ opacity: 1, rotate: 0 }}
        transition={{ duration: 1.4, ease: EASE }}
        style={{ transformOrigin: `${W / 2}px ${H / 2}px` }}
      >
        {dots.map((s) => (
          <circle key={s.k} cx={f1(s.x)} cy={f1(s.y)} r={s.r.toFixed(2)} className="sk-star" style={{ opacity: s.o }} />
        ))}
      </motion.g>
      {sages && cat ? (
        <>
          <motion.path
            d={plough}
            className="sk-figure"
            initial={still ? false : { pathLength: 0, opacity: 0 }}
            animate={{ pathLength: 1, opacity: 1 }}
            transition={{ duration: 1.4, delay: 0.7, ease: EASE }}
          />
          <text
            x={f1(seven.reduce((m, q) => m + q[0], 0) / 7)}
            y={f1(Math.max(...seven.map((q) => q[1])) + 18)}
            className="sk-name is-main"
          >
            Saptarṣi, the Seven Sages
          </text>
        </>
      ) : null}
      {pole ? (
        <>
          <circle cx={f1(pole.x)} cy={f1(pole.y)} r="9" className="sk-best" />
          <text x={f1(pole.x)} y={f1(pole.y - 16)} className="sk-name is-main">
            Dhruva, the Pole Star
          </text>
        </>
      ) : null}
    </svg>
  );
}

// ── every star in the catalogue ───────────────────────────────────────────
/** All the catalogue's stars as a map of the whole sky (right ascension across, declination up). */
export function AllSky({ label }: { label?: string }) {
  const cat = useCatalog();
  const still = useStill();
  const paths = useMemo(() => {
    const b = ["", "", "", ""];
    if (cat)
      for (let i = 0; i < cat.count; i++) {
        const m = cat.mag[i] ?? 9;
        const x = 400 - ((cat.ra[i] ?? 0) / (2 * Math.PI)) * 400;
        const y = 100 - ((cat.dec[i] ?? 0) / (Math.PI / 2)) * 100;
        const n = m < 2.2 ? 0 : m < 4 ? 1 : m < 5.3 ? 2 : 3;
        b[n] += `M${f1(x)} ${f1(y)}h0`;
      }
    return b;
  }, [cat]);
  return (
    <svg
      className="all-sky"
      viewBox="0 0 400 200"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <motion.g
        key={cat ? "stars" : "none"}
        initial={still ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: EASE }}
      >
        {paths.map((d, n) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: four fixed brightness classes
          <path key={n} d={d} className={`all-sky__s all-sky__s--${n}`} />
        ))}
      </motion.g>
    </svg>
  );
}
