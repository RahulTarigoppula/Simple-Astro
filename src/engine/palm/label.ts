// Stage [6b]: components → paths → template scores → greedy labels → confidence (§6.13).
// Honesty over accuracy: every number here can only lower confidence when evidence is thin, and
// a label below 0.6 is shown dashed with the stylus offered.
import type { PalmLine, PalmLineId } from "../types";

export type Pt = [number, number];

export interface Template {
  poly: Pt[];
  band: [number, number];
  sigma: number;
}

/** Anatomical templates in the canonical 512 frame (§6.13). */
export const TEMPLATES: Record<PalmLineId, Template> = {
  heart: {
    poly: [
      [400, 150],
      [330, 132],
      [260, 128],
      [190, 140],
      [150, 160],
    ],
    band: [95, 215],
    sigma: 34,
  },
  head: {
    poly: [
      [130, 258],
      [190, 272],
      [255, 285],
      [320, 295],
      [372, 300],
    ],
    band: [225, 345],
    sigma: 36,
  },
  life: {
    poly: [
      [142, 238],
      [128, 300],
      [142, 362],
      [178, 420],
      [218, 470],
    ],
    band: [210, 500],
    sigma: 40,
  },
  fate: {
    poly: [
      [248, 470],
      [250, 380],
      [252, 290],
      [254, 200],
      [256, 132],
    ],
    band: [120, 500],
    sigma: 30,
  },
};

export const LINE_ORDER: readonly PalmLineId[] = ["heart", "head", "life", "fate"];
/** The three lines a reading needs; the fate line is optional and never forces the stylus. */
export const MAIN_LINES: readonly PalmLineId[] = ["heart", "head", "life"];

/** Canonical palm length (wrist → midpoint of the index and pinky MCPs) and width, px. */
export const PALM_LENGTH_PX = Math.hypot(256 - 256, 496 - 112);
export const PALM_WIDTH_PX = Math.hypot(392 - 120, 128 - 96);

export const MIN_COMPONENT_PX = 60;
export const PATH_POINTS = 64;
/** Below this the line is dashed, faint, and the stylus is offered. */
export const LOW_CONFIDENCE = 0.6;
/** A component must score at least this against a template to be considered for it at all. */
export const MIN_TEMPLATE_SCORE = 0.45;
/** Mean black-hat (CLAHE grey levels) that counts as a fully contrasted crease. */
export const CONTRAST_REF = 22;
/** A gap longer than this in the pre-thinning mask is a break (§6.13 [7]). */
export const BREAK_PX = 8;

// ─── geometry helpers ────────────────────────────────────────────────────────

export function pathLength(p: readonly Pt[]): number {
  let L = 0;
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1];
    const b = p[i];
    if (a && b) L += Math.hypot(b[0] - a[0], b[1] - a[1]);
  }
  return L;
}

/** Resample a polyline to `n` points evenly spaced by arc length. */
export function resample(p: readonly Pt[], n: number = PATH_POINTS): Pt[] {
  const first = p[0];
  if (!first) return [];
  if (p.length === 1) return Array.from({ length: n }, () => [first[0], first[1]] as Pt);
  const cum = [0];
  for (let i = 1; i < p.length; i++) {
    const a = p[i - 1] ?? first;
    const b = p[i] ?? first;
    cum.push((cum[i - 1] ?? 0) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  const total = cum[cum.length - 1] ?? 0;
  const out: Pt[] = [];
  let j = 1;
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : (k / (n - 1)) * total;
    while (j < p.length - 1 && (cum[j] ?? 0) < t) j++;
    const c0 = cum[j - 1] ?? 0;
    const c1 = cum[j] ?? c0;
    const a = p[j - 1] ?? first;
    const b = p[j] ?? a;
    const f = c1 > c0 ? (t - c0) / (c1 - c0) : 0;
    out.push([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f]);
  }
  return out;
}

/** Squared distance from p to segment ab, and the segment parameter of the foot. */
function segDist2(p: Pt, a: Pt, b: Pt): [number, number] {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = a[0] + t * dx - p[0];
  const y = a[1] + t * dy - p[1];
  return [x * x + y * y, t];
}

export function sqDistToPolyline(p: Pt, poly: readonly Pt[]): number {
  let best = Number.POSITIVE_INFINITY;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    if (!a || !b) continue;
    const [d] = segDist2(p, a, b);
    if (d < best) best = d;
  }
  return best;
}

/** Closest point's arc-length fraction (0..1) along `poly`, and the squared distance to it. */
export function projectOnPolyline(p: Pt, poly: readonly Pt[]): { t: number; d2: number } {
  const total = pathLength(poly);
  let best = Number.POSITIVE_INFINITY;
  let bestT = 0;
  let acc = 0;
  for (let i = 1; i < poly.length; i++) {
    const a = poly[i - 1];
    const b = poly[i];
    if (!a || !b) continue;
    const seg = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const [d, t] = segDist2(p, a, b);
    if (d < best) {
      best = d;
      bestT = total > 0 ? (acc + t * seg) / total : 0;
    }
    acc += seg;
  }
  return { t: bestT, d2: best };
}

/** Unit chord direction, first → last. */
export function tangentOf(p: readonly Pt[]): Pt {
  const a = p[0];
  const b = p[p.length - 1];
  if (!a || !b) return [1, 0];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const n = Math.hypot(dx, dy);
  return n > 1e-9 ? [dx / n, dy / n] : [1, 0];
}

const cosBetween = (u: Pt, v: Pt): number => u[0] * v[0] + u[1] * v[1];

export interface TemplateScore {
  score: number;
  prox: number;
  inBand: number;
  dir: number;
}

/** §6.13: 0.5 · proximity + 0.3 · in-band fraction + 0.2 · |direction cosine|. */
export function score(component: readonly Pt[], t: Template): TemplateScore {
  if (component.length === 0) return { score: 0, prox: 0, inBand: 0, dir: 0 };
  let prox = 0;
  let inBand = 0;
  for (const p of component) {
    prox += Math.exp(-sqDistToPolyline(p, t.poly) / (2 * t.sigma ** 2));
    if (p[1] >= t.band[0] && p[1] <= t.band[1]) inBand++;
  }
  prox /= component.length;
  inBand /= component.length;
  const dir = Math.abs(cosBetween(tangentOf(component), tangentOf(t.poly)));
  return { score: 0.5 * prox + 0.3 * inBand + 0.2 * dir, prox, inBand, dir };
}

/**
 * Fraction of the template's arc length matched: the template is cut into 64 bins; a bin is
 * matched when a path point within 1.5 σ projects into it (gaps of one bin are bridged).
 */
export function coverage(path: readonly Pt[], t: Template): number {
  const BINS = 64;
  const hit = new Uint8Array(BINS);
  const lim = (1.5 * t.sigma) ** 2;
  let prev = -1;
  for (const p of path) {
    const { t: u, d2 } = projectOnPolyline(p, t.poly);
    if (d2 > lim) {
      prev = -1;
      continue;
    }
    const b = Math.min(BINS - 1, Math.floor(u * BINS));
    if (prev >= 0 && Math.abs(b - prev) <= 2) {
      for (let k = Math.min(b, prev); k <= Math.max(b, prev); k++) hit[k] = 1;
    } else hit[b] = 1;
    prev = b;
  }
  let n = 0;
  for (let i = 0; i < BINS; i++) n += hit[i] ?? 0;
  return n / BINS;
}

// ─── components ──────────────────────────────────────────────────────────────

export interface Component {
  /** pixel indices, ascending */
  pixels: number[];
  /** the longest geodesic path through the skeleton, pixel centres in order */
  path: Pt[];
  /** junction pixels (≥ 3 skeleton neighbours), clustered */
  branches: number;
}

const N8: ReadonlyArray<[number, number]> = [
  [0, -1],
  [1, -1],
  [1, 0],
  [1, 1],
  [0, 1],
  [-1, 1],
  [-1, 0],
  [-1, -1],
];

/** 8-connected components of a skeleton; those under `minSize` pixels are dropped. */
export function components(skel: Uint8Array, w: number, h: number, minSize = MIN_COMPONENT_PX): Component[] {
  const seen = new Uint8Array(w * h);
  const out: Component[] = [];
  for (let s = 0; s < w * h; s++) {
    if (!skel[s] || seen[s]) continue;
    const pixels: number[] = [];
    const stack = [s];
    seen[s] = 1;
    while (stack.length) {
      const i = stack.pop() ?? 0;
      pixels.push(i);
      const x = i % w;
      const y = (i - x) / w;
      for (const [dx, dy] of N8) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const j = yy * w + xx;
        if (skel[j] && !seen[j]) {
          seen[j] = 1;
          stack.push(j);
        }
      }
    }
    if (pixels.length < minSize) continue;
    pixels.sort((a, b) => a - b);
    out.push({ pixels, path: longestPath(pixels, skel, w, h), branches: countJunctions(pixels, skel, w, h) });
  }
  return out;
}

function neighbours(i: number, skel: Uint8Array, w: number, h: number): number[] {
  const x = i % w;
  const y = (i - x) / w;
  const out: number[] = [];
  for (const [dx, dy] of N8) {
    const xx = x + dx;
    const yy = y + dy;
    if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
    const j = yy * w + xx;
    if (skel[j]) out.push(j);
  }
  return out;
}

/** Geodesic (Dijkstra, 1 / √2 steps) distances and parents from `start` within the component. */
function geodesic(start: number, skel: Uint8Array, w: number, h: number): Map<number, [number, number]> {
  const dist = new Map<number, [number, number]>([[start, [0, -1]]]);
  // a simple bucketed frontier is enough: components are a few hundred pixels
  let frontier = [start];
  while (frontier.length) {
    const next: number[] = [];
    for (const i of frontier) {
      const di = dist.get(i)?.[0] ?? 0;
      const xi = i % w;
      for (const j of neighbours(i, skel, w, h)) {
        const step = j % w !== xi && Math.abs(j - i) !== 1 ? Math.SQRT2 : 1;
        const nd = di + step;
        const cur = dist.get(j);
        if (!cur || nd < cur[0] - 1e-9) {
          dist.set(j, [nd, i]);
          next.push(j);
        }
      }
    }
    frontier = next;
  }
  return dist;
}

function farthest(d: Map<number, [number, number]>): number {
  let best = -1;
  let bestD = -1;
  for (const [i, [di]] of d) {
    if (di > bestD + 1e-9 || (Math.abs(di - bestD) <= 1e-9 && i < best)) {
      bestD = di;
      best = i;
    }
  }
  return best;
}

/** The skeleton's diameter path (two geodesic sweeps), as ordered pixel centres. */
export function longestPath(pixels: readonly number[], skel: Uint8Array, w: number, h: number): Pt[] {
  const start = pixels[0];
  if (start === undefined) return [];
  const a = farthest(geodesic(start, skel, w, h));
  const d = geodesic(a, skel, w, h);
  let b = farthest(d);
  const path: Pt[] = [];
  let guard = 0;
  while (b >= 0 && guard++ < pixels.length + 2) {
    const x = b % w;
    path.push([x, (b - x) / w]);
    b = d.get(b)?.[1] ?? -1;
  }
  return path;
}

function countJunctions(pixels: readonly number[], skel: Uint8Array, w: number, h: number): number {
  const junction = new Set<number>();
  for (const i of pixels) if (neighbours(i, skel, w, h).length >= 3) junction.add(i);
  // cluster adjacent junction pixels into one branch point
  let clusters = 0;
  const seen = new Set<number>();
  for (const i of junction) {
    if (seen.has(i)) continue;
    clusters++;
    const stack = [i];
    seen.add(i);
    while (stack.length) {
      const k = stack.pop() ?? 0;
      for (const j of neighbours(k, skel, w, h)) {
        if (junction.has(j) && !seen.has(j)) {
          seen.add(j);
          stack.push(j);
        }
      }
    }
  }
  return clusters;
}

// ─── labelling ───────────────────────────────────────────────────────────────

export interface LabelInputs {
  skeleton: Uint8Array;
  /** pre-thinning mask (for breaks) */
  mask: Uint8Array;
  /** unblurred black-hat (for contrast / depth) */
  blackHat: Float32Array;
  width: number;
  height: number;
}

export interface Candidate {
  id: PalmLineId;
  path: Pt[]; // resampled, template-oriented
  score: TemplateScore;
  coverage: number;
  contrast: number;
  confidence: number;
  branches: number;
  breaks: number;
}

function meanResponse(path: readonly Pt[], a: Float32Array, w: number, h: number): number {
  if (path.length === 0) return 0;
  let s = 0;
  for (const [x, y] of path) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    let m = 0;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h) m = Math.max(m, a[yy * w + xx] ?? 0);
      }
    }
    s += m;
  }
  return s / path.length;
}

/** Gaps (> BREAK_PX) in the pre-thinning mask along the path, walked at 1 px steps. */
export function countBreaks(path: readonly Pt[], mask: Uint8Array, w: number, h: number): number {
  const L = pathLength(path);
  const steps = Math.max(2, Math.ceil(L));
  const dense = resample(path, steps);
  let run = 0;
  let breaks = 0;
  for (const [x, y] of dense) {
    const cx = Math.round(x);
    const cy = Math.round(y);
    let on = false;
    for (let dy = -1; dy <= 1 && !on; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const xx = cx + dx;
        const yy = cy + dy;
        if (xx >= 0 && yy >= 0 && xx < w && yy < h && mask[yy * w + xx]) {
          on = true;
          break;
        }
      }
    }
    if (on) {
      if (run > BREAK_PX) breaks++;
      run = 0;
    } else run++;
  }
  return breaks;
}

const round = (v: number, k: number): number => Math.round(v * k) / k;

/** Orient a path like the template (same chord direction). */
function orient(path: Pt[], t: Template): Pt[] {
  return cosBetween(tangentOf(path), tangentOf(t.poly)) < 0 ? [...path].reverse() : path;
}

/**
 * Chain fragments for one label: the anchor plus any further components that also sit on this
 * template, do not overlap the anchor along it, and are each a plausible piece of the line. A
 * broken line is still one line — its breaks are counted, and coverage rises only as far as real
 * pixels reach.
 */
function chainFor(anchor: Component, pool: readonly Component[], used: Set<Component>, t: Template): Component[] {
  const span = (c: Component): [number, number] => {
    let lo = 1;
    let hi = 0;
    for (const p of c.path) {
      const { t: u } = projectOnPolyline(p, t.poly);
      lo = Math.min(lo, u);
      hi = Math.max(hi, u);
    }
    return [lo, hi];
  };
  const chain = [anchor];
  const spans = [span(anchor)];
  const extras = pool
    .filter((c) => !used.has(c) && c !== anchor)
    .map((c) => ({ c, s: score(resample(c.path, 32), t) }))
    .filter((e) => e.s.prox >= 0.75 && e.s.dir >= 0.7)
    .sort((a, b) => b.s.score - a.s.score || (a.c.pixels[0] ?? 0) - (b.c.pixels[0] ?? 0));
  for (const { c } of extras) {
    const [lo, hi] = span(c);
    const overlaps = spans.some(([a, b]) => Math.min(hi, b) - Math.max(lo, a) > 0.04);
    if (overlaps) continue;
    chain.push(c);
    spans.push([lo, hi]);
  }
  return chain;
}

function joinChain(chain: readonly Component[], t: Template): Pt[] {
  const pieces = chain.map((c) => {
    const p = orient(c.path, t);
    const { t: u } = projectOnPolyline(p[0] ?? [0, 0], t.poly);
    return { p, u };
  });
  pieces.sort((a, b) => a.u - b.u);
  return pieces.flatMap((x) => x.p);
}

/**
 * Greedy assignment (best score first, each component once, each label once), chaining collinear
 * fragments, then confidence = 0.45 · coverage + 0.35 · template score + 0.20 · contrast.
 */
export function labelLines(input: LabelInputs, comps: readonly Component[]): Candidate[] {
  const { width: w, height: h } = input;
  const pairs: Array<{ c: Component; ci: number; id: PalmLineId; s: TemplateScore }> = [];
  comps.forEach((c, ci) => {
    const rs = resample(c.path, PATH_POINTS);
    for (const id of LINE_ORDER) {
      const s = score(rs, TEMPLATES[id]);
      if (s.score >= MIN_TEMPLATE_SCORE) pairs.push({ c, ci, id, s });
    }
  });
  pairs.sort(
    (a, b) => b.s.score - a.s.score || a.ci - b.ci || LINE_ORDER.indexOf(a.id) - LINE_ORDER.indexOf(b.id),
  );
  const used = new Set<Component>();
  const done = new Set<PalmLineId>();
  const anchors: Array<{ id: PalmLineId; c: Component }> = [];
  for (const p of pairs) {
    if (used.has(p.c) || done.has(p.id)) continue;
    used.add(p.c);
    done.add(p.id);
    anchors.push({ id: p.id, c: p.c });
  }
  const out: Candidate[] = [];
  for (const { id, c } of anchors) {
    const t = TEMPLATES[id];
    const chain = chainFor(c, comps, used, t);
    for (const k of chain) used.add(k);
    const raw = joinChain(chain, t);
    const path = resample(raw, PATH_POINTS);
    const s = score(path, t);
    const cov = coverage(resample(raw, 256), t);
    const contrast = Math.max(0, Math.min(1, meanResponse(path, input.blackHat, w, h) / CONTRAST_REF));
    const confidence = Math.max(0, Math.min(1, 0.45 * cov + 0.35 * s.score + 0.2 * contrast));
    out.push({
      id,
      path,
      score: s,
      coverage: cov,
      contrast,
      confidence,
      branches: chain.reduce((n, k) => n + k.branches, 0),
      breaks: countBreaks(raw, input.mask, w, h),
    });
  }
  out.sort((a, b) => LINE_ORDER.indexOf(a.id) - LINE_ORDER.indexOf(b.id));
  return out;
}

/** Mean absolute turning per palm width, on a 16-segment smoothing of the path (radians). */
export function curvatureOf(path: readonly Pt[]): number {
  const L = pathLength(path);
  if (L < 1) return 0;
  const p = resample(path, 17);
  let turn = 0;
  for (let i = 2; i < p.length; i++) {
    const a = p[i - 2];
    const b = p[i - 1];
    const c = p[i];
    if (!a || !b || !c) continue;
    const t1 = Math.atan2(b[1] - a[1], b[0] - a[0]);
    const t2 = Math.atan2(c[1] - b[1], c[0] - b[0]);
    let d = t2 - t1;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    turn += Math.abs(d);
  }
  return turn / (L / PALM_WIDTH_PX);
}

/** Candidate → the stored PalmLine (rounded so a repeat run is byte-identical and compact). */
export function toPalmLine(c: Candidate): PalmLine {
  return {
    id: c.id,
    path: c.path.map(([x, y]) => [round(x, 10), round(y, 10)] as [number, number]),
    source: "detected",
    confidence: round(c.confidence, 1000),
    metrics: {
      length: round(pathLength(c.path) / PALM_LENGTH_PX, 1000),
      curvature: round(curvatureOf(c.path), 1000),
      breaks: c.breaks,
      branches: c.branches,
      depth: round(c.contrast, 1000),
    },
  };
}

/** A traced path (canonical frame) becomes a line with confidence 1 — the rule layer cannot tell. */
export function tracedLine(id: PalmLineId, raw: readonly Pt[], depth = 1): PalmLine {
  const t = TEMPLATES[id];
  const path = orient(resample(raw, PATH_POINTS), t);
  return {
    id,
    path: path.map(([x, y]) => [round(x, 10), round(y, 10)] as [number, number]),
    source: "traced",
    confidence: 1,
    metrics: {
      length: round(pathLength(path) / PALM_LENGTH_PX, 1000),
      curvature: round(curvatureOf(path), 1000),
      breaks: 0,
      branches: 0,
      depth: round(depth, 1000),
    },
  };
}

/** Which template a free-hand trace most resembles (the stylus does not ask first). */
export function guessLineId(raw: readonly Pt[], exclude: readonly PalmLineId[] = []): PalmLineId {
  const rs = resample(raw, PATH_POINTS);
  let best: PalmLineId = "heart";
  let bestS = -1;
  for (const id of LINE_ORDER) {
    if (exclude.includes(id)) continue;
    const s = score(rs, TEMPLATES[id]).score;
    if (s > bestS) {
      bestS = s;
      best = id;
    }
  }
  return best;
}
