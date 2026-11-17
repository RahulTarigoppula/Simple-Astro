// Share cards: three 1080 × 1350 pictures a person can post to family ("My day", "Our match",
// "My stars"). Canvas 2D only, drawn from plain data (see data.ts for how the engine's numbers become
// that data): no DOM screenshots, no images, no network. Colours and fonts are read from the CSS
// custom properties at run time, so the cards follow tokens.css. Privacy by default: a first name at
// most, never a birth date, time or place.
import type { SkyPhase } from "../../components/ui/SkyScene";

export const CARD_W = 1080;
export const CARD_H = 1350;
export const FOOTER = "Vyomaphala · for reflection, not prediction";

// ── What goes on a card ─────────────────────────────────────────────────────────────────────────

/** The home screen's sky dial, as fractions along the Sun's arc (0 the rising foot, 1 the setting foot). */
export interface DayDial {
  phase: SkyPhase;
  /** Is the Sun up at the moment shown? If not, the Moon rides the arc. */
  isDay: boolean;
  /** Where the Sun (or the Moon, at night) stands along the arc. */
  body: number;
  good: Array<[number, number]>;
  avoid: [number, number] | null;
  /** Moon − Sun angle in degrees, for the Moon's true phase. */
  elongation: number;
}

export interface DayCardData {
  kind: "day";
  name: string;
  /** "Tuesday 17 November 2026" */
  date: string;
  /** Strong / Good / Mixed / Go gently */
  word: string;
  /** 0 … 100 */
  score: number;
  hint: string;
  headline: string;
  /** The best hours, already as short spans ("9:12–10:08 am"). */
  hours: string[];
  /** The pause window as a span, or null. */
  pause: string | null;
  rise: string;
  set: string;
  dial: DayDial;
}

export interface MatchCardData {
  kind: "match";
  a: string;
  b: string;
  word: string;
  /** 0 … 100 */
  score: number;
  /** 0 … 36, halves allowed */
  points: number;
  headline: string;
  /** One sentence that names the two people … */
  line: string;
  /** … and the same sentence without their names. */
  lineAnon: string;
}

export interface StarsFact {
  /** Plain words: "Moon sign". */
  label: string;
  /** The answer, set large: "Taurus". */
  value: string;
  /** The Sanskrit beneath: "Vṛṣabha · वृषभ". */
  sanskrit: string;
}

/** The person's own piece of sky, in degrees around the birth Moon (dx grows to the east, drawn to the left). */
export interface StarsSky {
  /** dx, latitude, magnitude for each real star in view, flat. */
  stars: number[];
  moonLat: number;
  elongation: number;
  /** The birth star's stretch of the zodiac, as [dx of its start, dx of its end]. */
  band: [number, number];
  /** Sign edges in view (dx) and the sign names between them. */
  edges: number[];
  signs: Array<{ dx: number; name: string }>;
  /** Planets that stood in this stretch of sky. */
  bodies: Array<{ name: string; dx: number; lat: number; sun: boolean }>;
}

export interface StarsCardData {
  kind: "stars";
  name: string;
  /** The birth star's name, written over its stretch of sky. */
  star: string;
  facts: StarsFact[];
  sky: StarsSky;
}

export type CardData = DayCardData | MatchCardData | StarsCardData;
export type CardKind = CardData["kind"];

export interface CardOptions {
  hideName: boolean;
}

// ── Words (pure: these are what the tests read) ─────────────────────────────────────────────────

/** "Rahul Tarigoppula" → "Rahul". A card never carries more of a name than this. */
export function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] ?? "";
}

/** The letter on a disc. */
export function initialOf(name: string): string {
  return (firstName(name)[0] ?? "").toUpperCase();
}

/** "9:12–10:08 am", or "11:40 am–12:36 pm" when the span crosses noon. */
export function compactSpan(from: string, to: string): string {
  const a = /^(.*?)\s*([ap]m)$/i.exec(from.trim());
  const b = /^(.*?)\s*([ap]m)$/i.exec(to.trim());
  if (a && b && a[2]?.toLowerCase() === b[2]?.toLowerCase()) return `${a[1]}–${b[1]} ${b[2]?.toLowerCase()}`;
  return `${from.trim()}–${to.trim()}`;
}

export interface DayText {
  eyebrow: string;
  title: string;
  word: string;
  score: string;
  hint: string;
  headline: string;
  hoursLabel: string;
  hours: string[];
  pause: string;
  footer: string;
  alt: string;
}

export function dayText(d: DayCardData, o: CardOptions): DayText {
  const first = o.hideName ? "" : firstName(d.name);
  const title = first ? `${first}’s day` : "My day";
  const hours = d.hours.length ? d.hours : ["None stand out today"];
  const pause = d.pause ? `Pause new starts ${d.pause}` : "";
  return {
    eyebrow: d.date,
    title,
    word: d.word,
    score: `${d.score} of 100`,
    hint: d.hint,
    headline: d.headline,
    hoursLabel: "Best hours",
    hours,
    pause,
    footer: FOOTER,
    alt: [
      `A picture to share: ${title}, ${d.date}.`,
      `${d.word}, ${d.score} of 100. ${d.hint}.`,
      d.headline,
      `Best hours: ${hours.join(", ")}.`,
      pause ? `${pause}.` : "",
      d.dial.isDay
        ? "The Sun is drawn on its arc from sunrise to sunset, with the good hours lit."
        : "The Moon is drawn in its true phase above the horizon.",
      `${FOOTER}.`,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export interface MatchText {
  eyebrow: string;
  title: string;
  initials: [string, string];
  word: string;
  score: string;
  headline: string;
  tradition: string;
  line: string;
  footer: string;
  alt: string;
}

const pts = (n: number): string => (Number.isInteger(n) ? String(n) : n.toFixed(1));

export function matchText(d: MatchCardData, o: CardOptions): MatchText {
  const a = firstName(d.a);
  const b = firstName(d.b);
  const named = !o.hideName && !!a && !!b;
  const title = named ? `${a} & ${b}` : "Our match";
  const tradition = `${pts(d.points)} of 36 by tradition`;
  const line = named ? d.line : d.lineAnon;
  return {
    eyebrow: named ? "Our match" : "",
    title,
    initials: named ? [initialOf(d.a), initialOf(d.b)] : ["", ""],
    word: d.word,
    score: `${d.score} of 100`,
    headline: d.headline,
    tradition,
    line,
    footer: FOOTER,
    alt: [
      `A picture to share: ${named ? `the match of ${a} and ${b}` : "our match"}.`,
      `${d.word}, ${d.score} of 100. ${d.headline}. ${tradition}.`,
      line,
      "Two discs overlap as far as the score, inside a ring of 36 beads with the earned ones lit.",
      `${FOOTER}.`,
    ].join(" "),
  };
}

export interface StarsText {
  eyebrow: string;
  title: string;
  caption: string;
  star: string;
  facts: StarsFact[];
  footer: string;
  alt: string;
}

export function starsText(d: StarsCardData, o: CardOptions): StarsText {
  const first = o.hideName ? "" : firstName(d.name);
  const caption = "The real stars behind the Moon when I was born";
  return {
    eyebrow: first ? "My stars" : "",
    title: first || "My stars",
    caption,
    star: d.star,
    facts: d.facts,
    footer: FOOTER,
    alt: [
      `A picture to share: ${first ? `the stars of ${first}` : "my stars"}.`,
      ...d.facts.map((f) => `${f.label}: ${f.value}${f.sanskrit ? ` (${f.sanskrit})` : ""}.`),
      `${caption}, with the Moon in its phase among the stars of ${d.star}.`,
      `${FOOTER}.`,
    ].join(" "),
  };
}

/** The text alternative of a card: everything the picture says, in words. */
export function cardAlt(d: CardData, o: CardOptions): string {
  return d.kind === "day" ? dayText(d, o).alt : d.kind === "match" ? matchText(d, o).alt : starsText(d, o).alt;
}

/** A file name with no name in it. */
export function cardFilename(kind: CardKind): string {
  return `vyomaphala-${kind === "day" ? "my-day" : kind === "match" ? "our-match" : "my-stars"}.png`;
}

/**
 * Greedy word wrap against a measuring function. A word wider than the line is broken; with
 * `maxLines`, what does not fit ends in an ellipsis.
 */
export function wrapLines(text: string, maxWidth: number, measure: (s: string) => number, maxLines = Number.POSITIVE_INFINITY): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  const push = (s: string) => {
    if (s) lines.push(s);
  };
  for (const word of words) {
    let w = word;
    const joined = line ? `${line} ${w}` : w;
    if (measure(joined) <= maxWidth) {
      line = joined;
      continue;
    }
    push(line);
    line = "";
    // a single word wider than the line: break it by letters
    while (measure(w) > maxWidth && w.length > 1) {
      let n = w.length - 1;
      while (n > 1 && measure(w.slice(0, n)) > maxWidth) n--;
      push(w.slice(0, n));
      w = w.slice(n);
    }
    line = w;
  }
  push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  let last = kept[maxLines - 1] ?? "";
  while (last.length > 1 && measure(`${last}…`) > maxWidth) last = last.slice(0, -1).trimEnd();
  kept[maxLines - 1] = `${last.replace(/[\s.,;:!?]+$/, "")}…`;
  return kept;
}

/** What is left of 0 … 1 once the given stretches are taken out (the unlit parts of the Sun's path). */
export function gapsOf(spans: ReadonlyArray<readonly [number, number]>): Array<[number, number]> {
  const sorted = spans.map(([a, b]) => [Math.min(a, b), Math.max(a, b)] as [number, number]).sort((x, y) => x[0] - y[0]);
  const out: Array<[number, number]> = [];
  let at = 0;
  for (const [a, b] of sorted) {
    if (a > at) out.push([at, Math.min(1, a)]);
    at = Math.max(at, b);
  }
  if (at < 1) out.push([at, 1]);
  return out;
}

/** Up to three to a row, split evenly: 4 → 2 + 2. */
export function rowsOf<T>(items: readonly T[], perRow = 3): T[][] {
  if (items.length === 0) return [];
  const rows = Math.ceil(items.length / perRow);
  const size = Math.ceil(items.length / rows);
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

// ── Palette: the tokens, read where the night values live ───────────────────────────────────────

export interface Stop {
  at: number;
  color: string;
}

/** The colour stops of a CSS `linear-gradient(…)` token ("colour NN%" pairs, top to bottom). */
export function parseGradient(css: string): Stop[] {
  const out: Stop[] = [];
  const re = /(#[0-9a-f]{3,8}|rgba?\([^)]*\)|[a-z]+)\s+([\d.]+)%/gi;
  for (let m = re.exec(css); m; m = re.exec(css)) out.push({ at: Math.min(1, Math.max(0, Number(m[2]) / 100)), color: m[1] ?? "" });
  return out;
}

/** A token colour at an alpha. Tokens are written as hex; any other form is used whole or not at all. */
export function withAlpha(color: string, a: number): string {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m?.[1]) return a >= 0.5 ? color : "transparent";
  const h = m[1].length === 3 ? m[1].replace(/./g, "$&$&") : m[1];
  const n = Number.parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

export interface Palette {
  c: (name: string, fallback: string) => string;
  paint: (phase: SkyPhase) => Stop[];
  display: string;
  body: string;
}

const FALLBACK_PAINT: Stop[] = [
  { at: 0, color: "midnightblue" },
  { at: 1, color: "darkslateblue" },
];

/** Read the tokens from `root` (an element inside `.v-night`, so the card is night art in both themes). */
export function paletteFrom(root?: Element | null): Palette {
  const el = root ?? (typeof document === "undefined" ? null : (document.querySelector(".v-night") ?? document.documentElement));
  const css = el && typeof getComputedStyle === "function" ? getComputedStyle(el) : null;
  const c = (name: string, fallback: string) => css?.getPropertyValue(name).trim() || fallback;
  return {
    c,
    paint: (phase) => {
      const stops = parseGradient(c(`--sky-paint-${phase}`, ""));
      return stops.length >= 2 ? stops : FALLBACK_PAINT;
    },
    display: c("--font-display", "Georgia, serif"),
    body: c("--font-body", "system-ui, sans-serif"),
  };
}

/** The faces a card is set in must be ready before the first glyph is drawn. */
export async function cardFontsReady(pal: Palette): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  await Promise.allSettled([
    document.fonts.load(`500 96px ${pal.display}`, "Strong Go gently 0123456789"),
    document.fonts.load(`500 32px ${pal.body}`, "Best hours 0123456789 ·"),
    document.fonts.load(`600 32px ${pal.body}`, "Best hours 0123456789"),
    document.fonts.load(`500 32px ${pal.body}`, "वृषभ रोहिणी"),
  ]);
}

// ── Drawing ─────────────────────────────────────────────────────────────────────────────────────

type Ctx = CanvasRenderingContext2D;
const TAU = Math.PI * 2;
const CX = CARD_W / 2;
const WHITE = (a: number) => `rgba(255, 255, 255, ${a})`;

/** A small generator with a fixed seed: the same specks on every card, never Math.random. */
function lcg(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function spacing(ctx: Ctx, px: number): void {
  // letterSpacing is not in every canvas; where it is missing the label is simply set tighter
  (ctx as Ctx & { letterSpacing?: string }).letterSpacing = `${px}px`;
}

interface Style {
  font: string;
  fill: string;
  alpha?: number;
  spacing?: number;
  shadow?: number;
}

function put(ctx: Ctx, s: string, x: number, y: number, st: Style, align: CanvasTextAlign = "center"): void {
  ctx.save();
  ctx.font = st.font;
  ctx.fillStyle = st.fill;
  ctx.globalAlpha = st.alpha ?? 1;
  ctx.textAlign = align;
  ctx.textBaseline = "alphabetic";
  spacing(ctx, st.spacing ?? 0);
  if (st.shadow) {
    ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
    ctx.shadowBlur = st.shadow;
    ctx.shadowOffsetY = 2;
  }
  // with letter spacing the last gap hangs off the end: nudge a centred line back by half of it
  ctx.fillText(s, align === "center" ? x + (st.spacing ?? 0) / 2 : x, y);
  ctx.restore();
}

function widthOf(ctx: Ctx, s: string, font: string, space = 0): number {
  ctx.save();
  ctx.font = font;
  spacing(ctx, space);
  const w = ctx.measureText(s).width;
  ctx.restore();
  return w;
}

/** The largest size from `size` down to `min` at which `s` fits `max`. */
function fitSize(ctx: Ctx, s: string, weight: number, family: string, size: number, min: number, max: number): number {
  let px = size;
  while (px > min && widthOf(ctx, s, `${weight} ${px}px ${family}`) > max) px -= 2;
  return px;
}

/** Centred wrapped lines from baseline `y`; returns the baseline after the last line. */
function para(ctx: Ctx, s: string, y: number, lh: number, max: number, lines: number, st: Style): number {
  const rows = wrapLines(s, max, (t) => widthOf(ctx, t, st.font), lines);
  rows.forEach((row, i) => {
    put(ctx, row, CX, y + i * lh, st);
  });
  return y + rows.length * lh;
}

/** The first of `tries` ([size, most lines]) at which the whole sentence fits; the last one, cut with an ellipsis, if none does. */
function fitPara(
  ctx: Ctx,
  s: string,
  max: number,
  family: string,
  tries: ReadonlyArray<readonly [number, number]>,
): { px: number; lines: number; n: number } {
  let last = { px: 40, lines: 3, n: 3 };
  for (const [px, lines] of tries) {
    const n = wrapLines(s, max, (t) => widthOf(ctx, t, `500 ${px}px ${family}`)).length;
    last = { px, lines, n: Math.min(n, lines) };
    if (n <= lines) break;
  }
  return last;
}

/** Runs of differently set text on one centred line. */
function runs(ctx: Ctx, parts: Array<{ s: string } & Style>, y: number): void {
  const widths = parts.map((p) => widthOf(ctx, p.s, p.font));
  let x = CX - widths.reduce((a, b) => a + b, 0) / 2;
  parts.forEach((p, i) => {
    put(ctx, p.s, x, y, p, "left");
    x += widths[i] ?? 0;
  });
}

function disc(ctx: Ctx, x: number, y: number, r: number, fill: string | CanvasGradient, alpha = 1): void {
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function glow(ctx: Ctx, x: number, y: number, r: number, color: string, a: number, from = 0): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(from, withAlpha(color, a));
  g.addColorStop(1, withAlpha(color, 0));
  disc(ctx, x, y, r, g);
}

/** The band's own painting, top to bottom, then a soft dusk at the foot so ivory words stay readable. */
function ground(ctx: Ctx, pal: Palette, phase: SkyPhase, foot: number): void {
  const g = ctx.createLinearGradient(0, 0, 0, CARD_H);
  for (const s of pal.paint(phase)) g.addColorStop(s.at, s.color);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, CARD_W, CARD_H);
  if (foot > 0) {
    const cloth = pal.c("--sky-cloth", "black");
    const d = ctx.createLinearGradient(0, CARD_H * 0.42, 0, CARD_H);
    d.addColorStop(0, withAlpha(cloth, 0));
    d.addColorStop(0.55, withAlpha(cloth, foot * 0.8));
    d.addColorStop(1, withAlpha(cloth, foot));
    ctx.fillStyle = d;
    ctx.fillRect(0, CARD_H * 0.42, CARD_W, CARD_H * 0.58);
  }
}

function specks(ctx: Ctx, pal: Palette, seed: number, n: number, k: number, y1: number, keep?: (x: number, y: number) => boolean): void {
  const next = lcg(seed);
  const star = pal.c("--star", "white");
  for (let i = 0; i < n; i++) {
    const x = next() * CARD_W;
    const y = next() * y1;
    const r = 1.4 + next() * 2.6;
    const tw = next();
    if (keep && !keep(x, y)) continue;
    disc(ctx, x, y, r, star, (0.3 + tw * 0.6) * k);
  }
}

function footer(ctx: Ctx, pal: Palette, s: string): void {
  // the brand mark's crescent, then the line
  const font = `500 27px ${pal.body}`;
  const w = widthOf(ctx, s, font, 0.5);
  const y = CARD_H - 62;
  ctx.save();
  ctx.globalAlpha = 0.9;
  litMoon(ctx, CX + 13 - w / 2 - 30, y - 9, 13, 62, pal.c("--sky-sun", "khaki"));
  ctx.restore();
  put(ctx, s, CX + 13, y, { font, fill: WHITE(0.78), spacing: 0.5 });
}

function header(ctx: Ctx, pal: Palette, eyebrow: string, title: string, size = 76): number {
  const ink = pal.c("--ink", "ivory");
  if (eyebrow) put(ctx, eyebrow.toUpperCase(), CX, 124, { font: `600 27px ${pal.body}`, fill: WHITE(0.8), spacing: 4.5 });
  const max = CARD_W - 160;
  const px = fitSize(ctx, title, 500, pal.display, size, 46, max);
  const font = `500 ${px}px ${pal.display}`;
  // a name too long even at the smallest size is broken over two lines, never clipped
  const rows = wrapLines(title, max, (t) => widthOf(ctx, t, font), 2);
  const y = eyebrow ? 214 : 190;
  rows.forEach((row, i) => {
    put(ctx, row, CX, y + i * (px + 8), { font, fill: ink, shadow: 20 });
  });
  return y + (rows.length - 1) * (px + 8);
}

/** The lit part of the Moon for a Moon − Sun angle (0 new, 180 full), in a disc of radius r at x, y. */
function litMoon(ctx: Ctx, x: number, y: number, r: number, elongation: number, fill: string): void {
  const e = ((elongation % 360) + 360) % 360;
  const lit = (1 - Math.cos((e * Math.PI) / 180)) / 2;
  if (lit < 0.01) return;
  const waxing = e < 180;
  const rx = Math.max(0.01, Math.abs(Math.cos((e * Math.PI) / 180)) * r);
  const crescent = lit < 0.5;
  // the bright limb down one side, then the terminator back up: bulging away for a crescent, towards for a gibbous Moon
  const viaLeft = waxing ? !crescent : crescent;
  ctx.save();
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.arc(x, y, r, -Math.PI / 2, Math.PI / 2, !waxing);
  ctx.ellipse(x, y, rx, r, 0, Math.PI / 2, (3 * Math.PI) / 2, !viaLeft);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function moon(ctx: Ctx, pal: Palette, x: number, y: number, r: number, elongation: number): void {
  disc(ctx, x, y, r, WHITE(0.17));
  litMoon(ctx, x, y, r, elongation, pal.c("--sky-moon", "ivory"));
}

// ── 1. My day ───────────────────────────────────────────────────────────────────────────────────

const DIAL = { cy: 752, rx: 400, ry: 376 };

function dialArc(ctx: Ctx, a: number, b: number): void {
  ctx.beginPath();
  ctx.ellipse(CX, DIAL.cy, DIAL.rx, DIAL.ry, 0, Math.PI + Math.PI * a, Math.PI + Math.PI * b);
}
const dialPt = (f: number): [number, number] => [CX - DIAL.rx * Math.cos(Math.PI * f), DIAL.cy - DIAL.ry * Math.sin(Math.PI * f)];

function drawDay(ctx: Ctx, pal: Palette, d: DayCardData, t: DayText): void {
  const { dial } = d;
  const ink = pal.c("--ink", "ivory");
  const night = dial.phase === "night";
  ground(ctx, pal, dial.phase, night ? 0.25 : 0.55);
  const starK = night ? 1 : dial.phase === "dusk" || dial.phase === "dawn" ? 0.45 : 0;
  // stars keep clear of the words: the heading, and the answer inside the arc
  if (starK > 0)
    specks(
      ctx,
      pal,
      20261116,
      170,
      starK,
      DIAL.cy - 20,
      (x, y) => !(y < 250 && Math.abs(x - CX) < 480) && !(y > DIAL.cy - 290 && Math.abs(x - CX) < 330),
    );

  header(ctx, pal, t.eyebrow, t.title);

  // the path of the day, the pause window and the good hours along it
  ctx.save();
  ctx.lineCap = "round";
  ctx.setLineDash([5, 17]);
  ctx.strokeStyle = WHITE(0.34);
  ctx.lineWidth = 4;
  // dotted only where nothing is lit, so a dimmed stretch at night stays clean
  for (const [a, b] of gapsOf([...dial.good, ...(dial.avoid ? [dial.avoid] : [])])) {
    if (b - a < 0.004) continue;
    dialArc(ctx, a, b);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  if (dial.isDay) {
    ctx.strokeStyle = WHITE(0.8);
    ctx.lineWidth = 4;
    dialArc(ctx, 0, Math.max(0.002, dial.body));
    ctx.stroke();
  }
  ctx.globalAlpha = night ? 0.62 : 1;
  ctx.lineWidth = 15;
  if (dial.avoid) {
    ctx.strokeStyle = pal.c("--sky-avoid", "lightcoral");
    dialArc(ctx, dial.avoid[0], dial.avoid[1]);
    ctx.stroke();
  }
  ctx.strokeStyle = pal.c("--sky-good", "lightgreen");
  for (const [a, b] of dial.good) {
    dialArc(ctx, a, b);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  // horizon
  ctx.strokeStyle = WHITE(0.32);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(70, DIAL.cy);
  ctx.lineTo(CARD_W - 70, DIAL.cy);
  ctx.stroke();
  ctx.restore();
  disc(ctx, CX - DIAL.rx, DIAL.cy, 9, WHITE(0.9));
  disc(ctx, CX + DIAL.rx, DIAL.cy, 9, WHITE(0.9));
  // the Sun by day, the Moon in its phase by night
  const [bx, by] = dialPt(dial.body);
  if (dial.isDay) {
    glow(ctx, bx, by, 124, pal.c("--sky-sun", "khaki"), 0.6);
    disc(ctx, bx, by, 34, pal.c("--sky-sun", "khaki"));
  } else {
    glow(ctx, bx, by, 118, pal.c("--sky-moon", "ivory"), 0.42);
    moon(ctx, pal, bx, by, 40, dial.elongation);
  }

  const small = { font: `500 29px ${pal.body}`, fill: WHITE(0.86) };
  put(ctx, d.rise, CX - DIAL.rx, DIAL.cy + 64, small);
  put(ctx, d.set, CX + DIAL.rx, DIAL.cy + 64, small);

  // the answer inside the arc
  const wordPx = fitSize(ctx, t.word, 500, pal.display, 156, 96, 560);
  put(ctx, t.word, CX, DIAL.cy - 136, { font: `500 ${wordPx}px ${pal.display}`, fill: ink, shadow: 26, spacing: -wordPx * 0.03 });
  put(ctx, t.score, CX, DIAL.cy - 64, { font: `600 40px ${pal.body}`, fill: ink });
  put(ctx, t.hint, CX, DIAL.cy - 22, { font: `500 28px ${pal.body}`, fill: WHITE(0.84) });

  // under the horizon: the sentence, then the hours, set as one block in the room that is left
  const max = CARD_W - 190;
  const fit = fitPara(ctx, t.headline, max, pal.display, [
    [44, 3],
    [40, 4],
    [36, 4],
    [33, 5],
  ]);
  const lh = Math.round(fit.px * 1.3);
  const rows = rowsOf(t.hours, 3);
  const blockH = fit.n * lh + 34 + 32 + rows.length * 52 + (t.pause ? 50 : 0);
  const top = DIAL.cy + 86;
  const room = CARD_H - 108 - top;
  let y = top + Math.max(0, (room - blockH) / 2) + fit.px;
  y = para(ctx, t.headline, y, lh, max, fit.lines, { font: `500 ${fit.px}px ${pal.display}`, fill: ink, shadow: 14 });

  y += 34 - 14;
  const labelFont = `600 25px ${pal.body}`;
  const label = t.hoursLabel.toUpperCase();
  const lw = widthOf(ctx, label, labelFont, 4);
  ctx.save();
  ctx.fillStyle = pal.c("--sky-good", "lightgreen");
  ctx.beginPath();
  ctx.roundRect(CX - lw / 2 - 30, y - 15, 40, 12, 6);
  ctx.fill();
  ctx.restore();
  put(ctx, label, CX + 26, y, { font: labelFont, fill: WHITE(0.84), spacing: 4 });
  y += 54;
  for (const row of rows) {
    put(ctx, row.join("   ·   "), CX, y, { font: `500 37px ${pal.body}`, fill: ink });
    y += 52;
  }
  if (t.pause) {
    const pf = `500 28px ${pal.body}`;
    const pw = widthOf(ctx, t.pause, pf);
    ctx.save();
    ctx.fillStyle = pal.c("--sky-avoid", "lightcoral");
    ctx.beginPath();
    ctx.roundRect(CX - pw / 2 - 30, y - 16, 40, 12, 6);
    ctx.fill();
    ctx.restore();
    put(ctx, t.pause, CX + 26, y - 2, { font: pf, fill: WHITE(0.86) });
  }
  footer(ctx, pal, t.footer);
}

// ── 2. Our match ────────────────────────────────────────────────────────────────────────────────

const RING = { cy: 540, rx: 420, ry: 258, r: 150 };

/** Distance between the two centres for a score of 0..100: touching at 0, nearly one disc at 100 (as PairPicture). */
export function pairGap(score: number, r: number): number {
  const s = Math.min(100, Math.max(0, score));
  return 2 * r * (1 - 0.9 * (s / 100));
}

function drawMatch(ctx: Ctx, pal: Palette, d: MatchCardData, t: MatchText): void {
  const ink = pal.c("--ink", "ivory");
  const sun = pal.c("--sky-sun", "khaki");
  const moonC = pal.c("--sky-moon", "ivory");
  const star = pal.c("--star", "white");
  ground(ctx, pal, "dusk", 0.6);
  const { cy, rx, ry, r } = RING;
  specks(
    ctx,
    pal,
    361994,
    120,
    0.55,
    cy + ry + 60,
    (x, y) => ((x - CX) / (rx + 30)) ** 2 + ((y - cy) / (ry + 30)) ** 2 > 1 && !(y < 250 && Math.abs(x - CX) < 440),
  );

  header(ctx, pal, t.eyebrow, t.title);

  // the 36 points of tradition, as a string of beads: the earned ones lit
  ctx.save();
  ctx.strokeStyle = WHITE(0.16);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.ellipse(CX, cy, rx, ry, 0, 0, TAU);
  ctx.stroke();
  ctx.restore();
  const whole = Math.floor(d.points);
  const half = d.points - whole >= 0.5;
  for (let i = 0; i < 36; i++) {
    const a = (i / 36) * TAU - Math.PI / 2;
    const x = CX + rx * Math.cos(a);
    const y = cy + ry * Math.sin(a);
    if (i < whole) {
      disc(ctx, x, y, 21, sun, 0.2);
      disc(ctx, x, y, 10.5, sun);
    } else if (half && i === whole) {
      disc(ctx, x, y, 21, sun, 0.11);
      disc(ctx, x, y, 8.5, sun, 0.55);
    } else disc(ctx, x, y, 8, WHITE(0.3));
  }

  // the two people as two discs; the shared part is as wide as the score
  const gap = pairGap(d.score, r);
  const ax = CX - gap / 2;
  const bxx = CX + gap / 2;
  const orb = (x: number, color: string, side: -1 | 1) => {
    const hx = x + side * -0.28 * r;
    const g = ctx.createRadialGradient(hx, cy - 0.4 * r, 0, hx, cy - 0.4 * r, 1.8 * r);
    g.addColorStop(0, withAlpha(star, 0.98));
    g.addColorStop(0.5, withAlpha(color, 0.97));
    g.addColorStop(1, withAlpha(color, 0.86));
    return g;
  };
  glow(ctx, ax, cy, r * 1.7, sun, 0.26, 0.5);
  glow(ctx, bxx, cy, r * 1.7, moonC, 0.26, 0.5);
  disc(ctx, ax, cy, r, orb(ax, sun, -1));
  disc(ctx, bxx, cy, r, orb(bxx, moonC, 1));
  if (gap < 2 * r) {
    ctx.save();
    ctx.beginPath();
    ctx.arc(ax, cy, r, 0, TAU);
    ctx.clip();
    ctx.beginPath();
    ctx.arc(bxx, cy, r, 0, TAU);
    ctx.clip();
    const h = Math.sqrt(r * r - (gap / 2) ** 2);
    const lens = ctx.createRadialGradient(CX, cy, 0, CX, cy, h);
    lens.addColorStop(0, withAlpha(star, 0.86));
    lens.addColorStop(1, withAlpha(star, 0.42));
    ctx.fillStyle = withAlpha(sun, 0.4);
    ctx.fillRect(CX - r, cy - r, 2 * r, 2 * r);
    ctx.fillStyle = lens;
    ctx.fillRect(CX - r, cy - r, 2 * r, 2 * r);
    ctx.restore();
  }
  ctx.save();
  ctx.strokeStyle = WHITE(0.82);
  ctx.lineWidth = 3;
  for (const x of [ax, bxx]) {
    ctx.beginPath();
    ctx.arc(x, cy, r - 1.5, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
  // each initial sits in the middle of its own disc's unshared part
  const fs = Math.min(84, Math.max(42, gap * 0.8));
  const letter = { font: `600 ${fs}px ${pal.display}`, fill: pal.c("--sky-cloth", "black") };
  if (t.initials[0]) put(ctx, t.initials[0], CX - r, cy + fs * 0.34, letter);
  if (t.initials[1]) put(ctx, t.initials[1], CX + r, cy + fs * 0.34, letter);

  // the answer in words
  const wordPx = fitSize(ctx, t.word, 500, pal.display, 128, 84, CARD_W - 200);
  put(ctx, t.word, CX, 944, { font: `500 ${wordPx}px ${pal.display}`, fill: ink, shadow: 26, spacing: -wordPx * 0.03 });
  const [num = "", ...rest] = t.score.split(" ");
  const tail = ` ${rest.join(" ")} · ${t.headline}`;
  const tailPx = fitSize(ctx, `${num}${tail}`, 500, pal.body, 36, 26, CARD_W - 150);
  runs(
    ctx,
    [
      { s: num, font: `650 ${tailPx + 4}px ${pal.body}`, fill: ink },
      { s: tail, font: `500 ${tailPx}px ${pal.body}`, fill: WHITE(0.88) },
    ],
    1006,
  );
  const [n36 = "", ...trad] = t.tradition.split(" by ");
  runs(
    ctx,
    [
      { s: n36, font: `650 31px ${pal.body}`, fill: sun },
      { s: ` by ${trad.join(" by ")}`, font: `500 31px ${pal.body}`, fill: WHITE(0.84) },
    ],
    1054,
  );
  const max = CARD_W - 200;
  const fit = fitPara(ctx, t.line, max, pal.display, [
    [40, 3],
    [35, 3],
    [31, 4],
  ]);
  const lh = Math.round(fit.px * 1.3);
  const room = CARD_H - 104 - 1082;
  para(ctx, t.line, 1082 + Math.max(0, (room - fit.n * lh) / 2) + fit.px, lh, max, fit.lines, {
    font: `500 ${fit.px}px ${pal.display}`,
    fill: ink,
    shadow: 14,
  });
  footer(ctx, pal, t.footer);
}

// ── 3. My stars ─────────────────────────────────────────────────────────────────────────────────

/** Degrees of longitude across the card (as SkyPiece), and where the Sun's path runs. */
export const STARS_SPAN = 58;
const SKY = { k: CARD_W / STARS_SPAN, y0: 602, top: 352, bottom: 852 };
const FACTS_Y = 1040;
type Box = readonly [number, number, number, number];
/** Where the words always stand on the stars card: x0, y0, x1, y1. */
const WORDS: readonly Box[] = [
  [60, 84, CARD_W - 60, 286],
  [50, FACTS_Y - 34, CARD_W - 50, FACTS_Y + 176],
  [200, CARD_H - 96, CARD_W - 200, CARD_H - 48],
];
/** 0 inside a box of words, rising to 1 a little way out: the sky is quiet where the words stand. */
export function quietAt(x: number, y: number, boxes: readonly Box[], soft = 26): number {
  let k = 1;
  for (const [x0, y0, x1, y1] of boxes) {
    const d = Math.hypot(Math.max(x0 - x, 0, x - x1), Math.max(y0 - y, 0, y - y1));
    k = Math.min(k, d / soft);
  }
  return Math.min(1, k);
}

function drawStars(ctx: Ctx, pal: Palette, d: StarsCardData, t: StarsText): void {
  const ink = pal.c("--ink", "ivory");
  const moonC = pal.c("--sky-moon", "ivory");
  const star = pal.c("--star", "white");
  const cloth = pal.c("--sky-cloth", "black");
  const { k, y0, top, bottom } = SKY;
  const X = (dx: number) => CX - dx * k;
  const Y = (lat: number) => y0 - lat * k;
  ground(ctx, pal, "night", 0);

  // the birth star's stretch of the zodiac
  const bandR = X(d.sky.band[0]);
  const bandL = X(d.sky.band[1]);
  const lit = ctx.createLinearGradient(0, top, 0, bottom);
  lit.addColorStop(0, withAlpha(moonC, 0));
  lit.addColorStop(0.5, withAlpha(moonC, 0.15));
  lit.addColorStop(1, withAlpha(moonC, 0));
  ctx.fillStyle = lit;
  ctx.fillRect(bandL, top, bandR - bandL, bottom - top);
  ctx.save();
  ctx.strokeStyle = WHITE(0.36);
  ctx.lineWidth = 2.5;
  ctx.lineCap = "round";
  ctx.setLineDash([4, 14]);
  for (const x of [bandL, bandR]) {
    ctx.beginPath();
    ctx.moveTo(x, top + 34);
    ctx.lineTo(x, bottom - 34);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // the Sun's path and the sign edges
  ctx.strokeStyle = WHITE(0.28);
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, y0);
  ctx.lineTo(CARD_W, y0);
  ctx.stroke();
  ctx.strokeStyle = WHITE(0.62);
  ctx.lineWidth = 3;
  for (const e of d.sky.edges) {
    ctx.beginPath();
    ctx.moveTo(X(e), y0 - 18);
    ctx.lineTo(X(e), y0 + 18);
    ctx.stroke();
  }
  ctx.restore();

  // where the small labels will stand, so no star sits inside a word
  const my = Y(d.sky.moonLat);
  const nameY0 = my + 86;
  const moonNameY = y0 > nameY0 - 34 && y0 < nameY0 + 10 ? y0 + 42 : nameY0;
  const labelFont = `500 26px ${pal.body}`;
  const signs = d.sky.signs.map((sg) => {
    const w = widthOf(ctx, sg.name, labelFont, 2);
    return { name: sg.name, w, x: Math.min(CARD_W - 28 - w / 2, Math.max(28 + w / 2, X(sg.dx))) };
  });
  const planets = d.sky.bodies.map((b) => ({ ...b, x: X(b.dx), y: Y(b.lat), ly: Y(b.lat) + (b.sun ? 50 : 40) }));
  const starW = widthOf(ctx, t.star.toUpperCase(), `600 26px ${pal.body}`, 4.5);
  const bandX = (bandL + bandR) / 2;
  const boxes: Box[] = [
    ...WORDS,
    [bandX - starW / 2 - 8, top - 6, bandX + starW / 2 + 8, top + 26],
    [CX - 48, moonNameY - 26, CX + 48, moonNameY + 6],
    ...signs.map((sg): Box => [sg.x - sg.w / 2 - 6, bottom - 10, sg.x + sg.w / 2 + 6, bottom + 20]),
    ...planets.map((b): Box => [b.x - 52, b.ly - 24, b.x + 52, b.ly + 6]),
  ];

  // the real stars
  const s = d.sky.stars;
  ctx.save();
  ctx.fillStyle = star;
  const [b0, b1] = d.sky.band;
  for (let i = 0; i + 2 < s.length; i += 3) {
    const dx = s[i] ?? 0;
    const m = s[i + 2] ?? 6;
    const inside = dx >= Math.min(b0, b1) && dx <= Math.max(b0, b1);
    const x = X(dx);
    const y = Y(s[i + 1] ?? 0);
    const r = Math.max(1.5, (4.1 - 0.54 * m) * 2.3);
    // a star under a line of words reads as a stray full stop
    const q = quietAt(x, y, boxes);
    if (q <= 0.02) continue;
    ctx.globalAlpha = Math.min(1, Math.max(0.45, 1.25 - m / 7)) * (inside ? 1 : 0.72) * q;
    if (m < 3.6 && q === 1) {
      ctx.shadowColor = WHITE(0.75);
      ctx.shadowBlur = 16;
    } else ctx.shadowBlur = 0;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  ctx.restore();

  // quiet the sky where the words stand
  const head = ctx.createLinearGradient(0, 0, 0, 360);
  head.addColorStop(0, withAlpha(cloth, 0.6));
  head.addColorStop(0.7, withAlpha(cloth, 0.4));
  head.addColorStop(1, withAlpha(cloth, 0));
  ctx.fillStyle = head;
  ctx.fillRect(0, 0, CARD_W, 360);
  const foot = ctx.createLinearGradient(0, 900, 0, CARD_H);
  foot.addColorStop(0, withAlpha(cloth, 0));
  foot.addColorStop(0.3, withAlpha(cloth, 0.55));
  foot.addColorStop(1, withAlpha(cloth, 0.75));
  ctx.fillStyle = foot;
  ctx.fillRect(0, 900, CARD_W, CARD_H - 900);

  put(ctx, t.star.toUpperCase(), bandX, top + 20, { font: `600 26px ${pal.body}`, fill: moonC, spacing: 4.5 });
  for (const sg of signs) put(ctx, sg.name, sg.x, bottom + 14, { font: labelFont, fill: WHITE(0.72), spacing: 2 });

  // planets that stood in this stretch of sky
  for (const b of planets) {
    if (b.sun) {
      glow(ctx, b.x, b.y, 58, pal.c("--sky-sun", "khaki"), 0.5);
      disc(ctx, b.x, b.y, 15, pal.c("--sky-sun", "khaki"));
    } else {
      disc(ctx, b.x, b.y, 12, WHITE(0.35));
      disc(ctx, b.x, b.y, 8, ink);
    }
    put(ctx, b.name, b.x, b.ly, { font: labelFont, fill: WHITE(0.86) });
  }

  // the Moon where it stood, in its phase that night; its name stands clear of the Sun's path
  glow(ctx, CX, my, 150, moonC, 0.42);
  moon(ctx, pal, CX, my, 44, d.sky.elongation);
  put(ctx, "Moon", CX, moonNameY, { font: `650 29px ${pal.body}`, fill: ink });

  const lastY = header(ctx, pal, t.eyebrow, t.title, 84);
  put(ctx, t.caption, CX, lastY + 56, { font: `500 30px ${pal.body}`, fill: WHITE(0.86) });

  // the three signs everyone asks first: plain words, the answer, the Sanskrit beneath
  const n = Math.max(1, t.facts.length);
  const colW = (CARD_W - 120) / n;
  const yLabel = FACTS_Y;
  ctx.save();
  ctx.strokeStyle = WHITE(0.2);
  ctx.lineWidth = 2;
  for (let i = 1; i < n; i++) {
    ctx.beginPath();
    ctx.moveTo(60 + colW * i, yLabel - 30);
    ctx.lineTo(60 + colW * i, yLabel + 168);
    ctx.stroke();
  }
  ctx.restore();
  t.facts.forEach((f, i) => {
    const x = 60 + colW * (i + 0.5);
    const max = colW - 36;
    put(ctx, f.label.toUpperCase(), x, yLabel, { font: `600 24px ${pal.body}`, fill: WHITE(0.78), spacing: 3.5 });
    const px = fitSize(ctx, f.value, 500, pal.display, 62, 34, max);
    put(ctx, f.value, x, yLabel + 78, { font: `500 ${px}px ${pal.display}`, fill: ink, shadow: 14 });
    // the Sanskrit: on one line if it fits, else the two scripts one under the other
    const sf = (p: number) => `500 ${p}px ${pal.body}`;
    const sp = fitSize(ctx, f.sanskrit, 500, pal.body, 29, 23, max);
    const parts = widthOf(ctx, f.sanskrit, sf(sp)) > max ? f.sanskrit.split(" · ") : [f.sanskrit];
    parts.forEach((p, j) => {
      const pp = fitSize(ctx, p, 500, pal.body, sp, 18, max);
      put(ctx, p, x, yLabel + 128 + j * 36, { font: sf(pp), fill: WHITE(0.86) });
    });
  });
  footer(ctx, pal, t.footer);
}

/** Draw one card into a 2D context that is CARD_W × CARD_H. */
export function drawCard(ctx: CanvasRenderingContext2D, data: CardData, o: CardOptions, pal: Palette): void {
  ctx.save();
  ctx.clearRect(0, 0, CARD_W, CARD_H);
  if (data.kind === "day") drawDay(ctx, pal, data, dayText(data, o));
  else if (data.kind === "match") drawMatch(ctx, pal, data, matchText(data, o));
  else drawStars(ctx, pal, data, starsText(data, o));
  ctx.restore();
}

/** Size the canvas, wait for the faces, draw. `root` is where the tokens are read (inside `.v-night`). */
export async function renderCard(canvas: HTMLCanvasElement, data: CardData, o: CardOptions, root?: Element | null): Promise<void> {
  const pal = paletteFrom(root);
  await cardFontsReady(pal);
  if (canvas.width !== CARD_W) canvas.width = CARD_W;
  if (canvas.height !== CARD_H) canvas.height = CARD_H;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("2D canvas unavailable");
  drawCard(ctx, data, o, pal);
}
