// Stage [7]: rules — predicates over a PalmReading with Sāmudrika Śāstra citations, the same shape
// as yogas.ts. Sentences come from reading.ts (`palmSentence`): each opens "Tradition says", prints
// its own measurement, and carries a citation. Low confidence changes the wording, never the claim.
// Both framings (dominant/non-dominant and classical right/left) are recorded with the reading.
import { type PalmRuleId, palmSentence } from "../reading";
import type { Citation, Landmark, PalmLine, PalmLineId, PalmReading } from "../types";
import { handGeometry, INDEX_LONG_MIN, RING_LONG_MAX, THUMB_FIRM_MAX, THUMB_FLEXIBLE_MIN } from "./geometry";
import { PALM_WIDTH_PX, type Pt, pathLength } from "./label";

/** Bump when a threshold or rule changes, so stored readings can be recomputed. */
export const PALM_RULESET_VERSION = 1;

// thresholds, canonical-frame geometry (see label.ts for the frame)
/** heart/head length ≥ this × palm width reads "long". The templates sit at ≈ 0.93 / 0.90. */
export const LONG_LINE_MIN = 0.75;
/** mean turning ≥ this (radians per palm width) reads "curved". The heart template sits at ≈ 0.5. */
export const CURVED_MIN = 0.45;
/** head-line chord ≥ this many degrees below the palm's horizontal reads "sloping". */
export const SLOPING_MIN_DEG = 15;
/** life-line arc ≥ this × palm width from the thumb edge reads "wide"; the template sits at ≈ 0.37. */
export const LIFE_WIDE_MIN = 0.38;
/** life-line depth below this reads "faint". */
export const LIFE_FAINT_MAX = 0.4;

/** The palm's horizontal in the canonical frame: INDEX_MCP → PINKY_MCP. */
const PALM_HORIZONTAL_DEG = (Math.atan2(128 - 96, 392 - 120) * 180) / Math.PI;
/** The thumb edge of the palm in the canonical frame: THUMB_CMC → INDEX_MCP. */
const THUMB_EDGE: [Pt, Pt] = [
  [56, 400],
  [120, 96],
];

export type Hand = "right" | "left";
export type Framing = "dominant" | "classical";

export interface PalmHit {
  ruleId: string;
  text: string;
  citation: Citation;
  measured: string;
}

/** Degrees the chord dips below the palm's horizontal (thumb side → little-finger side). */
export function slopeDeg(path: readonly Pt[]): number {
  const a = path[0];
  const b = path[path.length - 1];
  if (!a || !b) return 0;
  const [p, q] = a[0] <= b[0] ? [a, b] : [b, a];
  return (Math.atan2(q[1] - p[1], q[0] - p[0]) * 180) / Math.PI - PALM_HORIZONTAL_DEG;
}

/** Greatest distance of the middle third of the life line from the thumb edge, ÷ palm width. */
export function arcRatio(path: readonly Pt[]): number {
  const [e0, e1] = THUMB_EDGE;
  const dx = e1[0] - e0[0];
  const dy = e1[1] - e0[1];
  const n = Math.hypot(dx, dy);
  const lo = Math.floor(path.length / 3);
  const hi = Math.ceil((2 * path.length) / 3);
  let best = 0;
  for (let i = lo; i < hi; i++) {
    const p = path[i];
    if (!p) continue;
    const d = Math.abs((p[0] - e0[0]) * dy - (p[1] - e0[1]) * dx) / n;
    if (d > best) best = d;
  }
  return best / PALM_WIDTH_PX;
}

export const lengthRatio = (l: PalmLine): number => pathLength(l.path) / PALM_WIDTH_PX;

interface Ctx {
  ratios: PalmReading["ratios"];
  element: PalmReading["element"];
  line: (id: PalmLineId) => PalmLine | undefined;
}

type Values = Record<string, number>;
interface Rule {
  id: PalmRuleId;
  /** values to print, or null when the rule does not apply */
  when: (c: Ctx) => Values | null;
  line?: PalmLineId;
}

const withLine = (c: Ctx, id: PalmLineId, f: (l: PalmLine) => Values | null): Values | null => {
  const l = c.line(id);
  if (!l) return null;
  const v = f(l);
  return v ? { ...v, confidence: l.confidence } : null;
};

/** The rule table, in reading order. */
export const PALM_RULE_TABLE: readonly Rule[] = [
  ...(["earth", "air", "fire", "water"] as const).map(
    (el): Rule => ({
      id: `element-${el}` as PalmRuleId,
      when: (c) => (c.element === el ? { widthOverLength: c.ratios.widthOverLength, fingerOverPalm: c.ratios.fingerOverPalm } : null),
    }),
  ),
  {
    id: "index-long",
    when: (c) => (c.ratios.indexOverRing >= INDEX_LONG_MIN ? { indexOverRing: c.ratios.indexOverRing } : null),
  },
  {
    id: "ring-long",
    when: (c) => (c.ratios.indexOverRing < RING_LONG_MAX ? { indexOverRing: c.ratios.indexOverRing } : null),
  },
  {
    id: "thumb-flexible",
    when: (c) => (c.ratios.thumbAngleDeg >= THUMB_FLEXIBLE_MIN ? { thumbAngleDeg: c.ratios.thumbAngleDeg } : null),
  },
  {
    id: "thumb-firm",
    when: (c) => (c.ratios.thumbAngleDeg < THUMB_FIRM_MAX ? { thumbAngleDeg: c.ratios.thumbAngleDeg } : null),
  },
  {
    id: "heart-long",
    line: "heart",
    when: (c) =>
      withLine(c, "heart", (l) => (lengthRatio(l) >= LONG_LINE_MIN ? { lengthRatio: lengthRatio(l), depth: l.metrics.depth } : null)),
  },
  {
    id: "heart-short",
    line: "heart",
    when: (c) =>
      withLine(c, "heart", (l) => (lengthRatio(l) < LONG_LINE_MIN ? { lengthRatio: lengthRatio(l), depth: l.metrics.depth } : null)),
  },
  {
    id: "heart-curved",
    line: "heart",
    when: (c) =>
      withLine(c, "heart", (l) =>
        l.metrics.curvature >= CURVED_MIN ? { curvature: l.metrics.curvature, lengthRatio: lengthRatio(l) } : null,
      ),
  },
  {
    id: "heart-straight",
    line: "heart",
    when: (c) =>
      withLine(c, "heart", (l) =>
        l.metrics.curvature < CURVED_MIN ? { curvature: l.metrics.curvature, lengthRatio: lengthRatio(l) } : null,
      ),
  },
  {
    id: "head-long",
    line: "head",
    when: (c) =>
      withLine(c, "head", (l) => (lengthRatio(l) >= LONG_LINE_MIN ? { lengthRatio: lengthRatio(l), depth: l.metrics.depth } : null)),
  },
  {
    id: "head-short",
    line: "head",
    when: (c) =>
      withLine(c, "head", (l) => (lengthRatio(l) < LONG_LINE_MIN ? { lengthRatio: lengthRatio(l), depth: l.metrics.depth } : null)),
  },
  {
    id: "head-sloping",
    line: "head",
    when: (c) => withLine(c, "head", (l) => (slopeDeg(l.path) >= SLOPING_MIN_DEG ? { slopeDeg: slopeDeg(l.path) } : null)),
  },
  {
    id: "head-straight",
    line: "head",
    when: (c) => withLine(c, "head", (l) => (slopeDeg(l.path) < SLOPING_MIN_DEG ? { slopeDeg: slopeDeg(l.path) } : null)),
  },
  {
    id: "life-wide",
    line: "life",
    when: (c) => withLine(c, "life", (l) => (arcRatio(l.path) >= LIFE_WIDE_MIN ? { arcRatio: arcRatio(l.path) } : null)),
  },
  {
    id: "life-close",
    line: "life",
    when: (c) => withLine(c, "life", (l) => (arcRatio(l.path) < LIFE_WIDE_MIN ? { arcRatio: arcRatio(l.path) } : null)),
  },
  {
    id: "life-faint",
    line: "life",
    when: (c) => withLine(c, "life", (l) => (l.metrics.depth < LIFE_FAINT_MAX ? { depth: l.metrics.depth } : null)),
  },
];

/** Evaluate every rule; each hit's sentence prints its measurement (and the line's confidence). */
export function palmHits(parts: Pick<PalmReading, "element" | "ratios" | "lines">, seed: string): PalmHit[] {
  const ctx: Ctx = {
    ratios: parts.ratios,
    element: parts.element,
    line: (id) => parts.lines.find((l) => l.id === id),
  };
  const hits: PalmHit[] = [];
  for (const r of PALM_RULE_TABLE) {
    const values = r.when(ctx);
    if (!values) continue;
    const s = palmSentence(r.id, values, seed);
    const conf = values.confidence;
    const measured = conf === undefined ? s.measured : `${s.measured} · confidence ${conf.toFixed(2)}`;
    hits.push({ ruleId: s.ruleId, text: s.text, citation: s.citation, measured });
  }
  return hits;
}

/**
 * Both framings, recorded with every reading. `hand` is the hand in the print; `dominant` the
 * owner's dominant hand from the profile.
 */
export function framingNote(hand: Hand, dominant: Hand, framing: Framing): string {
  const isDominant = hand === dominant;
  const dom = isDominant
    ? "the dominant hand, read for what has been made of one's nature"
    : "the non-dominant hand, read for the nature one began with";
  const classical =
    hand === "right" ? "classically, the right hand is read for the present" : "classically, the left hand is read for what was given";
  const H = hand === "right" ? "Right" : "Left";
  return framing === "dominant"
    ? `${H} hand, ${dom} (${classical}).`
    : `${H} hand: ${classical} (by dominance, ${isDominant ? "the dominant hand" : "the non-dominant hand"}).`;
}

export interface ComposeArgs {
  captureId: string;
  worldLandmarks: readonly Landmark[];
  lines: readonly PalmLine[];
  framing: Framing;
  computedAt: number;
}

/**
 * The reading: geometry (stage [2]) + lines + rule hits. Null only when the world landmarks
 * cannot describe a hand. Deterministic: the seed is the capture id.
 */
export function composeReading(a: ComposeArgs): PalmReading | null {
  const g = handGeometry(a.worldLandmarks);
  if (!g) return null;
  const lines = [...a.lines];
  const hits = palmHits({ element: g.element, ratios: g.ratios, lines }, a.captureId);
  return {
    captureId: a.captureId,
    element: g.element,
    ratios: g.ratios,
    lines,
    hits,
    framing: a.framing,
    computedAt: a.computedAt,
  };
}

/** Replace (or add) one line and recompute the hits — the stylus path. Pure, synchronous. */
export function withLineReplaced(reading: PalmReading, line: PalmLine, computedAt: number): PalmReading {
  const order: PalmLineId[] = ["heart", "head", "life", "fate"];
  const lines = [...reading.lines.filter((l) => l.id !== line.id), line].sort((x, y) => order.indexOf(x.id) - order.indexOf(y.id));
  const hits = palmHits({ element: reading.element, ratios: reading.ratios, lines }, reading.captureId);
  return { ...reading, lines, hits, computedAt };
}
