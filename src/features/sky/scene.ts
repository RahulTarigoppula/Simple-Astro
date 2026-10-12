// The painted sky as data: every mark the SVG (and the 1080×1920 poster) draws, in scene units
// (horizon radius SKY_R, centre 0,0, East at the bottom). Pure — no DOM — and cheap enough to
// rebuild on every scrub frame: one matrix over the star vectors, string building for the dots
// above the horizon, and d3-geo for a few clipped great circles.
import { geoCircle, geoPath } from "d3-geo";
import { eunX, eunY, rhoOfAlt, SKY_R, skyProjection } from "../../engine/sky/projection";
import { altAzOfEun, type Eun, type RooftopSky, siderealPointEun, starMatrix } from "../../engine/sky/rooftop";
import { type StarCatalog, transformStars } from "../../engine/sky/stars";
import type { GrahaId } from "../../engine/types";

const proj = skyProjection();
const geo = geoPath(proj);

/** Magnitude classes: one SVG path each (round-capped zero-length segments = dots). */
const CLASSES = [
  { max: 0.5, r: 2.6, o: 1 },
  { max: 1.5, r: 2.15, o: 1 },
  { max: 2.5, r: 1.75, o: 1 },
  { max: 3.5, r: 1.38, o: 0.95 },
  { max: 4.25, r: 1.08, o: 0.9 },
  { max: 5.0, r: 0.88, o: 0.8 },
  { max: 5.5, r: 0.72, o: 0.68 },
  { max: 6.0, r: 0.62, o: 0.55 },
  { max: 99, r: 0.52, o: 0.38 },
] as const;

export interface StarLayer {
  d: string;
  /** stroke width = dot diameter */
  w: number;
  o: number;
}

export interface StarDots {
  n: number;
  x: Float32Array;
  y: Float32Array;
  r: Float32Array;
  o: Float32Array;
}

export interface SceneBody {
  id: GrahaId;
  x: number;
  y: number;
  alt: number;
  az: number;
  up: boolean;
}

export interface PaintedScene {
  layers: StarLayer[];
  dots: StarDots;
  ecliptic: string;
  rasiTicks: string;
  nakTicks: string;
  rasiLabels: Array<{ sign: number; x: number; y: number }>;
  bodies: SceneBody[];
  moon: { x: number; y: number; k: number; angle: number; up: boolean };
  sun: { x: number; y: number; up: boolean };
  lagna: { x: number; y: number; bx: number; by: number };
  /** 0 = full night, 1 = the Sun at the horizon or above. */
  daylight: number;
}

// ── static line work ─────────────────────────────────────────────────────────────────────────

/** Altitude rings at 30° and 60°: faint ruled guides. */
export const ALT_RINGS = [60, 30].map((r) => geo(geoCircle().center([0, 90]).radius(r)()) ?? "").join("");

const WALL_ALT = 5;
const MERLON_ALT = 9;
/** The parapet: a wall around the horizon with 36 merlons, as an even-odd ring. */
export const PARAPET = ((): string => {
  const R0 = SKY_R + 3;
  const pt = (rho: number, azDeg: number): string => {
    const a = (azDeg * Math.PI) / 180;
    return `${(-rho * Math.cos(a)).toFixed(2)} ${(rho * Math.sin(a)).toFixed(2)}`;
  };
  const rW = rhoOfAlt(WALL_ALT);
  const rM = rhoOfAlt(MERLON_ALT);
  let d = `M${R0} 0A${R0} ${R0} 0 1 0 ${-R0} 0A${R0} ${R0} 0 1 0 ${R0} 0Z`;
  const pts: string[] = [];
  for (let k = 0; k < 36; k++) {
    const a0 = k * 10 + 2;
    pts.push(pt(rW, a0), pt(rM, a0), pt(rM, a0 + 5), pt(rW, a0 + 5));
    for (let s = 1; s < 5; s++) pts.push(pt(rW, a0 + 5 + s));
  }
  d += `M${pts.join("L")}Z`;
  return d;
})();

/** Cardinal marks: Latin on the wall, Devanagari outside the rim. */
export const CARDINALS = [
  { az: 0, lat: "N", dev: "उ" },
  { az: 90, lat: "E", dev: "पू" },
  { az: 180, lat: "S", dev: "द" },
  { az: 270, lat: "W", dev: "प" },
].map((c) => {
  const a = (c.az * Math.PI) / 180;
  const rIn = rhoOfAlt(WALL_ALT / 2);
  const rOut = SKY_R + 13;
  return { ...c, x: -rIn * Math.cos(a), y: rIn * Math.sin(a), ox: -rOut * Math.cos(a), oy: rOut * Math.sin(a) };
});

// ── per-frame pieces ──────────────────────────────────────────────────────────────────────────

const classRanges = new WeakMap<StarCatalog, number[]>();
function rangesOf(stars: StarCatalog): number[] {
  const hit = classRanges.get(stars);
  if (hit) return hit;
  const ends: number[] = [];
  let i = 0;
  for (const c of CLASSES) {
    while (i < stars.count && (stars.mag[i] ?? 99) <= c.max) i++;
    ends.push(i);
  }
  classRanges.set(stars, ends);
  return ends;
}

const r1 = (v: number): number => Math.round(v * 10) / 10;

interface Buffers {
  eun: Float32Array;
  dots: StarDots;
}
const buffers = new WeakMap<StarCatalog, Buffers>();
function buffersOf(stars: StarCatalog): Buffers {
  let b = buffers.get(stars);
  if (!b) {
    const n = stars.count;
    b = {
      eun: new Float32Array(n * 3),
      dots: { n: 0, x: new Float32Array(n), y: new Float32Array(n), r: new Float32Array(n), o: new Float32Array(n) },
    };
    buffers.set(stars, b);
  }
  return b;
}

const toGeo = (v: Eun): [number, number] => {
  const { alt, az } = altAzOfEun(v);
  return [az - 90, alt];
};

const xy = (v: Eun): [number, number] => [eunX(v[0], v[1], v[2]), eunY(v[0], v[1], v[2])];

/** Build the painted scene for one sky. `stars` may be null while the catalogue loads. */
export function buildScene(sky: RooftopSky, stars: StarCatalog | null): PaintedScene {
  const daylight = Math.max(0, Math.min(1, (sky.sunAlt + 12) / 12));
  const starFade = 1 - 0.55 * daylight;

  // Stars — the dots are shared by the poster; the SVG uses one path per magnitude class.
  const layers: StarLayer[] = [];
  let dots: StarDots = { n: 0, x: new Float32Array(0), y: new Float32Array(0), r: new Float32Array(0), o: new Float32Array(0) };
  if (stars) {
    const buf = buffersOf(stars);
    const eun = transformStars(stars, starMatrix(sky), buf.eun);
    dots = buf.dots;
    let n = 0;
    let start = 0;
    const ends = rangesOf(stars);
    CLASSES.forEach((c, ci) => {
      const end = ends[ci] ?? start;
      const parts: string[] = [];
      for (let i = start; i < end; i++) {
        const u = eun[3 * i + 1] as number;
        if (u <= 0.002) continue;
        const e = eun[3 * i] as number;
        const nn = eun[3 * i + 2] as number;
        const x = (-SKY_R * nn) / (1 + u);
        const y = (SKY_R * e) / (1 + u);
        parts.push(`M${r1(x)} ${r1(y)}h0`);
        dots.x[n] = x;
        dots.y[n] = y;
        dots.r[n] = c.r;
        dots.o[n] = c.o * starFade;
        n++;
      }
      start = end;
      layers.push({ d: parts.join(""), w: c.r * 2, o: c.o * starFade });
    });
    dots.n = n;
  }

  // The sidereal zodiac: the ecliptic great circle, 12 rāśi dividers, 27 nakshatra ticks.
  const ring: Array<[number, number]> = [];
  for (let l = 0; l <= 360; l += 3) ring.push(toGeo(siderealPointEun(sky, l)));
  const ecliptic = geo({ type: "LineString", coordinates: ring }) ?? "";
  const tick = (l: number, h: number): Array<[number, number]> => [toGeo(siderealPointEun(sky, l, -h)), toGeo(siderealPointEun(sky, l, h))];
  const rasiTicks = geo({ type: "MultiLineString", coordinates: Array.from({ length: 12 }, (_, k) => tick(k * 30, 3.4)) }) ?? "";
  const nakTicks = geo({ type: "MultiLineString", coordinates: Array.from({ length: 27 }, (_, k) => tick((k * 360) / 27, 1.7)) }) ?? "";
  const rasiLabels: PaintedScene["rasiLabels"] = [];
  for (let k = 0; k < 12; k++) {
    const v = siderealPointEun(sky, k * 30 + 15, 8);
    if (v[1] < Math.sin((WALL_ALT + 6) * (Math.PI / 180))) continue;
    const [x, y] = xy(v);
    rasiLabels.push({ sign: k, x, y });
  }

  const bodies: SceneBody[] = sky.bodies.map((b) => {
    const [x, y] = xy(b.v);
    return { id: b.id, x, y, alt: b.alt, az: b.az, up: b.alt > -0.3 };
  });

  // Moon phase: the lit limb points along the great circle towards the Sun.
  const mo = sky.bodies[1];
  const su = sky.bodies[0];
  let moon: PaintedScene["moon"] = { x: 0, y: 0, k: sky.moonK, angle: 0, up: false };
  let sun: PaintedScene["sun"] = { x: 0, y: 0, up: false };
  if (mo && su) {
    const [mx, my] = xy(mo.v);
    const s = 0.02;
    const p: [number, number, number] = [
      mo.v[0] + s * (su.v[0] - mo.v[0]),
      mo.v[1] + s * (su.v[1] - mo.v[1]),
      mo.v[2] + s * (su.v[2] - mo.v[2]),
    ];
    const len = Math.hypot(p[0], p[1], p[2]) || 1;
    const [px, py] = xy([p[0] / len, p[1] / len, p[2] / len]);
    moon = { x: mx, y: my, k: sky.moonK, angle: (Math.atan2(py - my, px - mx) * 180) / Math.PI, up: mo.alt > -0.3 };
    const [sx, sy] = xy(su.v);
    sun = { x: sx, y: sy, up: su.alt > -0.3 };
  }

  const [lx, ly] = xy(sky.lagna.v);
  const a = (sky.lagna.az * Math.PI) / 180;
  const rb = rhoOfAlt(17);
  const lagna = { x: lx, y: ly, bx: -rb * Math.cos(a), by: rb * Math.sin(a) };

  return { layers, dots, ecliptic, rasiTicks, nakTicks, rasiLabels, bodies, moon, sun, lagna, daylight };
}

/** The lit part of a Moon of radius r, Sun along +x; rotate by `angle` when drawing. */
export function moonLitPath(r: number, k: number): string {
  const kk = Math.max(0, Math.min(1, k));
  const rx = Math.abs(2 * kk - 1) * r;
  const sweep = kk > 0.5 ? 1 : 0;
  return `M0 ${-r}A${r} ${r} 0 0 1 0 ${r}A${rx.toFixed(3)} ${r} 0 0 ${sweep} 0 ${-r}Z`;
}
