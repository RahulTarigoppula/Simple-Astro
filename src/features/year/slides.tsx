// The eight slides of "Your year ahead". Every picture is drawn from the reading in `useYear`:
// the ring and the curve from the twelve month scores, the arc from the daśā tree, the wheel from
// where Jupiter and Saturn really travel, the bars from the life areas, the calendar from the day
// picker and the festival calendar. Each picture draws itself in once and has its words beside it.
import { motion, useReducedMotion } from "motion/react";
import { Link } from "react-router";
import { GRAHA_ENGLISH } from "../../data/tables/names";
import { CHAPTER_SHORT } from "../../data/traits";
import type { Festival } from "../../engine/festivals";
import { jdToMs } from "../../engine/math";
import type { PickDay } from "../../engine/pickday";
import type { DashaNode, Patri, SignIdx } from "../../engine/types";
import { fmt, lore, pct, TONE_WORD, type Tone } from "../forecast/util";
import { LifeArc } from "../patri/LifeArc";
import "../patri/band.css";
import type { YearData } from "./useYear";
import type { StorySlide } from "./YearPlayer";
import {
  type AreasOfYear,
  type ChapterInfo,
  chapterWords,
  closingLine,
  DAY,
  listWords,
  type MonthPick,
  type MonthReading,
  type MonthSpan,
  type SlowPath,
  slowShort,
  slowTone,
  slowWords,
  type YearShape,
} from "./year";

const EASE = [0.22, 0.8, 0.2, 1] as const;
const n1 = (v: number) => v.toFixed(1);
const toneFill = (t: Tone) => (t === "bright" ? "var(--sky-good)" : t === "testing" ? "var(--sky-avoid)" : "var(--ink)");

/** True when pictures must stand still: the reader asked for less motion, or a test is looking. */
function useQuiet(): boolean {
  const still = useReducedMotion();
  return !!still || import.meta.env.MODE === "test";
}

/** A block of words that rises into place, a beat after the one before it. */
function Rise({ i = 0, className, children }: { i?: number; className?: string; children: React.ReactNode }) {
  const quiet = useQuiet();
  return (
    <motion.div
      className={className}
      initial={quiet ? false : { opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.1 + i * 0.12, ease: EASE }}
    >
      {children}
    </motion.div>
  );
}

function Head({ id, eyebrow, children, small }: { id: string; eyebrow: string; children: React.ReactNode; small?: boolean }) {
  return (
    <Rise className="yr-head">
      <p className="yr-eyebrow">{eyebrow}</p>
      <h1 id={`yr-h-${id}`} className={small ? "yr-h yr-h--sm" : "yr-h"}>
        {children}
      </h1>
    </Rise>
  );
}

/** The calm placeholder of a slide whose numbers are still being read. */
function Waiting({ text }: { text: string }) {
  return (
    <p className="yr-wait" role="status">
      <i aria-hidden="true" />
      {text}
    </p>
  );
}

// ─── 1. the ring of twelve months ───────────────────────────────────────────

const RC = 170;
const R_IN = 86;
const R_OUT = 138;
const polar = (deg: number, r: number): [number, number] => [
  RC + r * Math.cos((deg * Math.PI) / 180),
  RC + r * Math.sin((deg * Math.PI) / 180),
];
/** A ring sector from angle a to b (degrees, clockwise from the top), between two radii. */
function sector(a: number, b: number, r0: number, r1: number): string {
  const [x0, y0] = polar(a, r1);
  const [x1, y1] = polar(b, r1);
  const [x2, y2] = polar(b, r0);
  const [x3, y3] = polar(a, r0);
  return `M${n1(x0)} ${n1(y0)}A${r1} ${r1} 0 0 1 ${n1(x1)} ${n1(y1)}L${n1(x2)} ${n1(y2)}A${r0} ${r0} 0 0 0 ${n1(x3)} ${n1(y3)}Z`;
}

interface RingProps {
  window: readonly MonthSpan[];
  months: readonly MonthReading[];
  /** Months to mark with a small light (the best ones). */
  lit?: ReadonlySet<number>;
  label: string;
  children?: React.ReactNode;
}

/** The year as a ring: the month that holds today at the top, then clockwise; each petal as tall as its month's score. */
export function MonthRing({ window, months, lit, label, children }: RingProps) {
  const quiet = useQuiet();
  // The same stretch as the forecast's own curve: the scale opens to at least −0.5 … +0.5.
  const scores = months.map((m) => m.score);
  const lo = Math.max(-1, Math.min(-0.5, Math.min(0, ...scores) - 0.1));
  const hi = Math.min(1, Math.max(0.5, Math.max(0, ...scores) + 0.1));
  const tall = (score: number) => 0.16 + 0.84 * ((score - lo) / (hi - lo));
  return (
    <div className="yr-ring">
      <svg viewBox="0 0 340 340" role="img" aria-label={label}>
        {window.map((w, i) => {
          const a = -90 + i * 30 + 1.6;
          const b = -90 + (i + 1) * 30 - 1.6;
          const m = months[i];
          const [lx, ly] = polar(-90 + (i + 0.5) * 30, R_OUT + 17);
          const top = m ? R_IN + tall(m.score) * (R_OUT - R_IN) : R_IN;
          const [sx, sy] = polar(-90 + (i + 0.5) * 30, top + 7);
          return (
            <g key={w.startMs}>
              <path d={sector(a, b, R_IN, R_OUT)} className="yr-ring__track" />
              {m ? (
                <motion.path
                  d={sector(a, b, R_IN, top)}
                  fill={toneFill(m.tone)}
                  className="yr-ring__petal"
                  data-tone={m.tone}
                  style={{ transformOrigin: `${RC}px ${RC}px` }}
                  initial={quiet ? false : { opacity: 0, scale: 0.72 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7, delay: 0.15 + i * 0.06, ease: EASE }}
                />
              ) : null}
              {m && lit?.has(w.startMs) ? (
                <motion.circle
                  cx={sx}
                  cy={sy}
                  r="3"
                  className="yr-ring__star"
                  initial={quiet ? false : { opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5, delay: 1.1 + i * 0.04 }}
                />
              ) : null}
              <text x={lx} y={ly + 6} textAnchor="middle" className={i === 0 ? "yr-ring__m is-now" : "yr-ring__m"}>
                {w.short}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="yr-ring__center">{children}</div>
    </div>
  );
}

function ringLabel(window: readonly MonthSpan[], shape: YearShape | null): string {
  const first = window[0];
  const last = window[11];
  const span = first && last ? `from ${first.label} ${first.year} to ${last.label} ${last.year}` : "";
  if (!shape) return `The twelve months ${span} as a ring. The months are still being read.`;
  return `The twelve months ${span} as a ring, each month as tall as its score: ${shape.months
    .map((m) => `${m.label} ${TONE_WORD[m.tone]}`)
    .join(", ")}. Overall: ${shape.word}, ${pct(shape.score)} of 100.`;
}

function TitleSlide({ name, data }: { name: string; data: YearData | null }) {
  const shape = data?.shape ?? null;
  const lit = new Set(shape?.best.map((b) => b.month.startMs) ?? []);
  return (
    <div className="yr-body yr-body--title">
      <Head id="title" eyebrow="The next twelve months">
        {name}'s year ahead
      </Head>
      {data ? (
        <MonthRing window={data.window} months={data.months} lit={lit} label={ringLabel(data.window, shape)}>
          {shape ? (
            <Rise i={5}>
              <p className="yr-ring__k">Overall</p>
              <p className="yr-ring__word" data-long={shape.word.length > 6 || undefined}>
                {shape.word}
              </p>
              <p className="yr-ring__n">{pct(shape.score)} of 100</p>
            </Rise>
          ) : (
            <p className="yr-ring__k">Reading the sky…</p>
          )}
        </MonthRing>
      ) : (
        <div className="yr-ring yr-ring--empty" />
      )}
      {shape ? (
        <Rise i={7}>
          <p className="yr-lead">{shape.line}</p>
          <p className="yr-note">Each petal is one month, as tall as its score. A light marks the best.</p>
        </Rise>
      ) : (
        <Waiting text="Reading your twelve months from where the planets will be." />
      )}
    </div>
  );
}

// ─── 2 and 3. the year as a curve ───────────────────────────────────────────

type Pt = readonly [number, number];
/** A smooth line through the points that never overshoots them (monotone cubic). */
function smooth(pts: readonly Pt[]): string {
  const first = pts[0];
  if (!first) return "";
  const slope: number[] = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    slope.push((b[1] - a[1]) / (b[0] - a[0]));
  }
  const tan = pts.map((_, i) => {
    const before = slope[i - 1];
    const after = slope[i];
    if (before === undefined) return after ?? 0;
    if (after === undefined) return before;
    return before * after <= 0 ? 0 : (2 * before * after) / (before + after);
  });
  let d = `M${n1(first[0])} ${n1(first[1])}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const a = pts[i] as Pt;
    const b = pts[i + 1] as Pt;
    const h = (b[0] - a[0]) / 3;
    d += `C${n1(a[0] + h)} ${n1(a[1] + (tan[i] ?? 0) * h)} ${n1(b[0] - h)} ${n1(b[1] - (tan[i + 1] ?? 0) * h)} ${n1(b[0])} ${n1(b[1])}`;
  }
  return d;
}

const CW = 350;
const CH = 210;
const CTOP = 52;
const CBOT = 38;

/** The twelve months on one flowing line; the chosen months are drawn large and named. */
export function YearCurve({
  months,
  picks,
  kind,
}: {
  months: readonly MonthReading[];
  picks: readonly MonthPick[];
  kind: "best" | "gentle";
}) {
  const quiet = useQuiet();
  const scores = months.map((m) => m.score);
  const lo = Math.max(-1, Math.min(-0.3, Math.min(...scores) - 0.08));
  const hi = Math.min(1, Math.max(0.3, Math.max(...scores) + 0.08));
  const x = (i: number) => 18 + (i * (CW - 36)) / Math.max(1, months.length - 1);
  const y = (s: number) => CTOP + (1 - (s - lo) / (hi - lo)) * (CH - CTOP - CBOT);
  const pts: Pt[] = months.map((m, i) => [x(i), y(m.score)] as const);
  const line = smooth(pts);
  const area = `${line}L${n1(x(months.length - 1))} ${CH - 22}L${n1(x(0))} ${CH - 22}Z`;
  const chosen = new Set(picks.map((p) => p.month.startMs));
  const names = listWords(picks.map((p) => `${p.month.label} (${TONE_WORD[p.month.tone]})`));
  const label =
    kind === "best"
      ? `The twelve months as a curve, higher meaning more support. The best months stand out: ${names}.`
      : `The twelve months as a curve. The lowest ${picks.length === 1 ? "month is" : "months are"} marked: ${names}.`;
  return (
    <svg className="yr-curve" data-kind={kind} viewBox={`0 0 ${CW} ${CH}`} role="img" aria-label={label}>
      <defs>
        <linearGradient id={`yr-area-${kind}`} gradientUnits="userSpaceOnUse" x1="0" y1={CTOP} x2="0" y2={CH - 22}>
          <stop offset="0" stopColor="white" stopOpacity="0.26" />
          <stop offset="1" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.path
        d={area}
        fill={`url(#yr-area-${kind})`}
        initial={quiet ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.9, delay: 0.7, ease: EASE }}
      />
      <motion.path
        d={line}
        className="yr-curve__line"
        initial={quiet ? false : { pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.5, delay: 0.15, ease: EASE }}
      />
      {months.map((m, i) => {
        const [cx, cy] = pts[i] as Pt;
        const on = chosen.has(m.startMs);
        const anchor = i === 0 ? "start" : i === months.length - 1 ? "end" : "middle";
        const tx = anchor === "start" ? cx - 8 : anchor === "end" ? cx + 8 : cx;
        // two chosen months side by side: the later name sits a line higher, so neither covers the other
        let run = 0;
        for (let k = i - 1; k >= 0 && chosen.has((months[k] as MonthReading).startMs); k--) run++;
        const lift = run % 2 === 1 ? 17 : 0;
        return (
          <motion.g
            key={m.startMs}
            initial={quiet ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: on ? 1.25 + i * 0.03 : 0.4 + i * 0.06 }}
          >
            {on ? (
              <>
                <circle cx={cx} cy={cy} r="15" className="yr-curve__halo" />
                <circle cx={cx} cy={cy} r="7.5" className="yr-curve__pick" />
                <text x={tx} y={cy - 22 - lift} textAnchor={anchor} className="yr-curve__name">
                  {m.short}
                </text>
              </>
            ) : (
              <circle cx={cx} cy={cy} r="2.8" className="yr-curve__dot" />
            )}
            <text x={cx} y={CH - 5} textAnchor="middle" className={on ? "yr-curve__axis is-on" : "yr-curve__axis"}>
              {m.initial}
            </text>
          </motion.g>
        );
      })}
    </svg>
  );
}

function Picks({ picks, kind }: { picks: readonly MonthPick[]; kind: "best" | "gentle" }) {
  return (
    <ol className="yr-picks" data-kind={kind}>
      {picks.map((p, i) => (
        <li key={p.month.startMs}>
          <Rise i={3 + i} className="yr-picks__row">
            <span className="yr-picks__m">
              {p.month.label}
              <span className="yr-picks__y"> {p.month.year}</span>
            </span>
            <span className="yr-picks__w">
              {TONE_WORD[p.month.tone]} · {pct(p.month.score)} of 100
            </span>
            <span className="yr-picks__why">{p.why}.</span>
          </Rise>
        </li>
      ))}
    </ol>
  );
}

function BestSlide({ shape }: { shape: YearShape | null }) {
  return (
    <div className="yr-body">
      <Head id="best" eyebrow="Lean in">
        Your best months
      </Head>
      {shape ? (
        <>
          <YearCurve months={shape.months} picks={shape.best} kind="best" />
          <Picks picks={shape.best} kind="best" />
          <Rise i={7}>
            <p className="yr-note">Tradition favours these months for what matters most to you.</p>
          </Rise>
        </>
      ) : (
        <Waiting text="Finding your best months." />
      )}
    </div>
  );
}

function GentleSlide({ shape }: { shape: YearShape | null }) {
  const kind = shape ? shape.gentle.every((g) => g.month.tone === "bright" || g.month.tone === "steady") : false;
  return (
    <div className="yr-body">
      <Head id="gentle" eyebrow="A slower pace">
        {shape && shape.gentle.length === 1 ? "The month to go gently" : "The months to go gently"}
      </Head>
      {shape ? (
        <>
          <YearCurve months={shape.months} picks={shape.gentle} kind="gentle" />
          <Rise i={2}>
            <p className="yr-lead yr-lead--sm">
              {kind ? "Even your quietest stretch reads well: simply an easier pace." : "A time for patience, not big starts."}
            </p>
          </Rise>
          <Picks picks={shape.gentle} kind="gentle" />
          <Rise i={7}>
            <p className="yr-note">Every year has its slower months. Tradition says they suit finishing, resting and planning.</p>
          </Rise>
        </>
      ) : (
        <Waiting text="Finding the quieter months." />
      )}
    </div>
  );
}

// ─── 4. the life chapter ────────────────────────────────────────────────────

/** The twelve months as a ribbon of the stretches (antardaśā) that run through them. */
function StretchRibbon({ chapter, data }: { chapter: ChapterInfo; data: YearData }) {
  const quiet = useQuiet();
  const from = data.nowMs;
  const to = data.endMs;
  const W = 330;
  const x = (ms: number) => 10 + ((Math.min(to, Math.max(from, ms)) - from) / (to - from)) * (W - 20);
  const cuts = [from, ...chapter.changes.map((c) => c.startMs), to];
  const lords = [chapter.ad.lord, ...chapter.changes.map((c) => c.lord)];
  const my = (ms: number) => fmt(ms, data.zone, { month: "short", year: "numeric" });
  const label = `This year's stretches inside the chapter: ${lords
    .map((l, i) => `${GRAHA_ENGLISH[l]} ${i === 0 ? "now" : `from ${my(cuts[i] as number)}`}`)
    .join(", ")}.`;
  return (
    <svg className="yr-ribbon" viewBox={`0 0 ${W} 58`} role="img" aria-label={label}>
      {lords.map((l, i) => {
        const a = x(cuts[i] as number) + (i === 0 ? 0 : 2);
        const b = x(cuts[i + 1] as number) - (i === lords.length - 1 ? 0 : 2);
        const wide = b - a;
        return (
          <motion.g
            key={`${l}-${cuts[i]}`}
            initial={quiet ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 1.5 + i * 0.2 }}
          >
            <rect
              x={a}
              y="20"
              width={Math.max(2, wide)}
              height="9"
              rx="4.5"
              className={i === 0 ? "yr-ribbon__seg is-now" : "yr-ribbon__seg"}
            />
            {wide > 44 ? (
              <text x={a + 2} y="13" className="yr-ribbon__name">
                {GRAHA_ENGLISH[l]}
              </text>
            ) : null}
          </motion.g>
        );
      })}
      <circle cx={x(from)} cy="24.5" r="5.5" className="yr-ribbon__here" />
      <text x="10" y="48" className="yr-ribbon__when">
        Today
      </text>
      <text x={W - 10} y="48" textAnchor="end" className="yr-ribbon__when">
        {my(to - DAY)}
      </text>
    </svg>
  );
}

function ChapterSlide({ patri, data }: { patri: Patri | null; data: YearData | null }) {
  const c = data?.chapter ?? null;
  if (!patri || !data || !c) {
    return (
      <div className="yr-body">
        <Head id="chapter" eyebrow="Your life chapter">
          The chapter you are in
        </Head>
        <Waiting text="Reading your life chapters." />
      </div>
    );
  }
  const birthMs = Math.round(jdToMs(patri.jdUt));
  const tree: DashaNode[] = patri.dasha;
  const last = tree[tree.length - 1];
  const yr = (ms: number) => fmt(ms, data.zone, { year: "numeric" });
  const words = chapterWords(c, data.zone);
  const sanskrit = lore(c.md.lord)?.name;
  return (
    <div className="yr-body">
      <Head id="chapter" eyebrow="Your life chapter">
        You are in {words.title}
      </Head>
      <Rise i={1}>
        <p className="yr-term">
          A time of {CHAPTER_SHORT[c.md.lord]}
          {sanskrit ? (
            <span>
              {" "}
              · {sanskrit} <span lang="sa">mahādaśā</span>
            </span>
          ) : null}
        </p>
      </Rise>
      <div className="yr-arc">
        <LifeArc
          tree={tree}
          birthMs={birthMs}
          nowMs={data.nowMs}
          fromLabel={`Born ${yr(birthMs)}`}
          toLabel={last ? yr(last.endMs) : ""}
          label={`Your life as an arc of nine chapters, from ${yr(birthMs)} to ${last ? yr(last.endMs) : ""}. You are in ${words.title}, which runs from ${yr(c.md.startMs)} to ${yr(c.md.endMs)}.`}
        />
      </div>
      <Rise i={3}>
        <p className="yr-lead yr-lead--sm">Tradition divides a life into planet-ruled chapters. {words.lines[0]}</p>
      </Rise>
      {c.changes.length ? <StretchRibbon chapter={c} data={data} /> : null}
      <Rise i={5}>
        <p className="yr-para">{words.lines[1]}</p>
      </Rise>
    </div>
  );
}

// ─── 5. the slow planets ────────────────────────────────────────────────────

const WC = 170;
const wpolar = (deg: number, r: number): [number, number] => [
  WC + r * Math.cos((deg * Math.PI) / 180),
  WC + r * Math.sin((deg * Math.PI) / 180),
];
function warc(a: number, b: number, r: number): string {
  const [x0, y0] = wpolar(a, r);
  const [x1, y1] = wpolar(b, r);
  return `M${n1(x0)} ${n1(y0)}A${r} ${r} 0 ${b - a > 180 ? 1 : 0} 1 ${n1(x1)} ${n1(y1)}`;
}

/**
 * The twelve houses counted from the Moon as a clock face (the 1st at the top, then clockwise), with
 * the stretch of sky each slow planet really covers this year: an open mark where it is today, a
 * full one where it will be when the year closes.
 */
export function SlowWheel({ moonSign, paths, label }: { moonSign: SignIdx; paths: readonly SlowPath[]; label: string }) {
  const quiet = useQuiet();
  // 0° of the Moon's sign sits 15° before the top, so the 1st house is centred on 12 o'clock.
  const ang = (lon: number) => -105 + (lon - moonSign * 30);
  const touched = new Set(paths.flatMap((p) => p.legs.map((l) => l.house)));
  const R = { JU: 126, SA: 102 } as const;
  return (
    <svg className="yr-wheel" viewBox="0 0 340 340" role="img" aria-label={label}>
      <circle cx={WC} cy={WC} r="140" className="yr-wheel__rim" />
      <circle cx={WC} cy={WC} r="88" className="yr-wheel__rim" />
      {Array.from({ length: 12 }, (_, i) => {
        const a = -105 + i * 30;
        const [x0, y0] = wpolar(a, 88);
        const [x1, y1] = wpolar(a, 140);
        const [tx, ty] = wpolar(a + 15, 157);
        const house = i + 1;
        return (
          // biome-ignore lint/suspicious/noArrayIndexKey: the twelve houses never reorder
          <g key={i}>
            <line x1={x0} y1={y0} x2={x1} y2={y1} className="yr-wheel__spoke" />
            {touched.has(house) ? <path d={warc(a + 1.2, a + 28.8, 114)} className="yr-wheel__house" /> : null}
            <text x={tx} y={ty + 5.5} textAnchor="middle" className={touched.has(house) ? "yr-wheel__n is-on" : "yr-wheel__n"}>
              {house}
            </text>
          </g>
        );
      })}
      {/* you: the Moon at the centre */}
      <circle cx={WC} cy={WC} r="22" className="yr-wheel__moon" />
      <text x={WC} y={WC + 5.5} textAnchor="middle" className="yr-wheel__you">
        You
      </text>
      {paths.map((p, k) => {
        const r = R[p.graha];
        const a0 = ang(p.lonMin);
        const a1 = ang(p.lonMax);
        const [sx, sy] = wpolar(ang(p.lonStart), r);
        const [ex, ey] = wpolar(ang(p.lonEnd), r);
        const mid = ang((p.lonMin + p.lonMax) / 2);
        // the name sits inside the ring, clear of the Moon: beside it on the sides, above or below it otherwise
        const cos = Math.cos((mid * Math.PI) / 180);
        const side = Math.abs(cos) > 0.5;
        const lx = side ? WC + Math.sign(cos) * 30 : wpolar(mid, 58)[0];
        const ly = wpolar(mid, 58)[1];
        const anchor = side ? (cos > 0 ? "start" : "end") : "middle";
        return (
          <g key={p.graha} data-graha={p.graha}>
            <motion.path
              d={warc(a0, Math.max(a1, a0 + 0.5), r)}
              className="yr-wheel__path"
              initial={quiet ? false : { pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 1.3, delay: 0.4 + k * 0.5, ease: EASE }}
            />
            <motion.g
              initial={quiet ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 1.3 + k * 0.5 }}
            >
              <circle cx={sx} cy={sy} r="5" className="yr-wheel__from" />
              <circle cx={ex} cy={ey} r="7.5" className="yr-wheel__to" />
              {p.graha === "SA" ? <ellipse cx={ex} cy={ey} rx="12.5" ry="4.2" className="yr-wheel__ring" /> : null}
              <line
                x1={wpolar(mid, 72)[0]}
                y1={wpolar(mid, 72)[1]}
                x2={wpolar(mid, r - 9)[0]}
                y2={wpolar(mid, r - 9)[1]}
                className="yr-wheel__lead"
              />
              <text x={lx} y={ly + 6} textAnchor={anchor} className="yr-wheel__name">
                {GRAHA_ENGLISH[p.graha]}
              </text>
            </motion.g>
          </g>
        );
      })}
    </svg>
  );
}

function SlowSlide({ patri, data }: { patri: Patri | null; data: YearData | null }) {
  const paths = data?.slow ?? null;
  if (!patri || !data || !paths) {
    return (
      <div className="yr-body">
        <Head id="slow" eyebrow="The slow planets">
          Where Jupiter and Saturn travel
        </Head>
        <Waiting text="Following Jupiter and Saturn through the year." />
      </div>
    );
  }
  const season = data.season;
  const my = (ms: number) => fmt(ms, data.zone, { month: "long", year: "numeric" });
  const label = `The twelve houses counted from your Moon, as a clock face. ${paths.map((p) => slowWords(p, data.zone)).join(" ")}`;
  return (
    <div className="yr-body">
      <Head id="slow" eyebrow="The slow planets" small>
        Where Jupiter and Saturn travel
      </Head>
      <SlowWheel moonSign={patri.grahas.MO.sign} paths={paths} label={label} />
      <Rise i={2}>
        <p className="yr-note yr-note--key">Open mark: today. Full mark: in a year.</p>
      </Rise>
      {paths.map((p, i) => {
        const tone = slowTone(p);
        return (
          <Rise key={p.graha} i={3 + i}>
            <p className="yr-para yr-para--sm">
              {slowShort(p, data.zone)} <span className="yr-para__s">{tone.text}</span>
            </p>
          </Rise>
        );
      })}
      {season ? (
        <Rise i={5}>
          <p className="yr-season">
            {season.running && season.words ? (
              <>
                <b>{season.words.title}</b> {season.words.says}
              </>
            ) : (
              <>
                <b>Saturn's long season, about seven and a half years, begins around {my(season.startMs)}.</b> Tradition says this is a
                season that asks for patience and steady, unhurried effort.
              </>
            )}
            {season.words?.term ? <span className="yr-season__term"> {season.words.term}</span> : null}
            {season.words && !season.words.term ? (
              <span className="yr-season__term" lang="sa">
                {" "}
                Sāḍe-sātī
              </span>
            ) : null}
          </p>
        </Rise>
      ) : null}
    </div>
  );
}

// ─── 6. the life areas ──────────────────────────────────────────────────────

function AreaBar({
  label,
  score,
  tone,
  note,
  i,
  soft,
}: {
  label: string;
  score: number;
  tone: Tone;
  note: string;
  i: number;
  soft?: boolean;
}) {
  const quiet = useQuiet();
  const w = Math.max(8, pct(score));
  return (
    <li className={soft ? "yr-area is-soft" : "yr-area"} data-tone={tone}>
      <span className="yr-area__t">{label}</span>
      <span className="yr-area__w">{TONE_WORD[tone]}</span>
      <span className="yr-area__bar" aria-hidden="true">
        <motion.span
          initial={quiet ? false : { width: "0%" }}
          animate={{ width: `${w}%` }}
          transition={{ duration: 1, delay: 0.35 + i * 0.18, ease: EASE }}
        />
      </span>
      <span className="yr-area__s">{note}</span>
    </li>
  );
}

function AreasSlide({ areas }: { areas: AreasOfYear | null }) {
  if (!areas) {
    return (
      <div className="yr-body">
        <Head id="areas" eyebrow="Area by area">
          Your strongest areas this year
        </Head>
        <Waiting text="Weighing the seven areas of life." />
      </div>
    );
  }
  const alt = `The seven areas of life over the year. Strongest: ${areas.top
    .map((a) => `${a.label}, ${TONE_WORD[a.tone]}, ${pct(a.score)} of 100`)
    .join("; ")}. The one to tend: ${areas.tend.label}, ${TONE_WORD[areas.tend.tone]}, ${pct(areas.tend.score)} of 100.`;
  return (
    <div className="yr-body">
      <Head id="areas" eyebrow="Area by area">
        Your strongest areas this year
      </Head>
      <p className="yr-sr">{alt}</p>
      <ol className="yr-areas" aria-label="Your three strongest areas">
        {areas.top.map((a, i) => (
          <AreaBar
            key={a.id}
            label={a.label}
            score={a.score}
            tone={a.tone}
            note={`${pct(a.score)} of 100 · brightest in ${a.peak.label}`}
            i={i}
          />
        ))}
      </ol>
      <Rise i={4} className="yr-tend">
        <p className="yr-tend__k">The one to tend</p>
        <ul className="yr-areas">
          <AreaBar
            label={areas.tend.label}
            score={areas.tend.score}
            tone={areas.tend.tone}
            note={`${pct(areas.tend.score)} of 100 · at its best in ${areas.tend.peak.label}`}
            i={3}
            soft
          />
        </ul>
        <p className="yr-para yr-para--tight">
          The quieter corner of this year. Tradition says unhurried, regular attention suits it best.
        </p>
      </Rise>
      <Rise i={6}>
        <p className="yr-note">Each area is its average over the twelve months, read from the planets crossing your chart.</p>
      </Rise>
    </div>
  );
}

// ─── 7. days worth circling ─────────────────────────────────────────────────

const CELL = 21;
const GX = 26;
const GY = 22;

/** The coming weeks as a small calendar: a column per week, a dot per day as bright as the day reads, the three best ringed. */
export function DayGrid({
  days,
  circled,
  festivals,
  zone,
  label,
}: {
  days: readonly PickDay[];
  circled: readonly PickDay[];
  festivals: readonly Festival[];
  zone: string;
  label: string;
}) {
  const quiet = useQuiet();
  const first = days[0];
  if (!first) return null;
  const row0 = (first.sky.weekday + 6) % 7;
  const cols = Math.ceil((days.length + row0) / 7);
  const order = new Map(circled.map((d, i) => [d.startMs, i + 1]));
  const fest = new Set(festivals.map((f) => f.dateMs));
  const W = GX + cols * CELL + 6;
  const H = GY + 7 * CELL + 4;
  const months: Array<{ col: number; text: string }> = [];
  days.forEach((d, i) => {
    const col = Math.floor((i + row0) / 7);
    const dom = Number(fmt(d.noonMs, zone, { day: "numeric" }));
    if (dom === 1 || (i === 0 && dom <= 20)) months.push({ col, text: fmt(d.noonMs, zone, { month: "short" }) });
  });
  return (
    <svg className="yr-grid" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label} style={{ maxWidth: W * 1.06 }}>
      {(
        [
          ["M", 0],
          ["W", 2],
          ["F", 4],
          ["S", 6],
        ] as const
      ).map(([d, row]) => (
        <text key={row} x="8" y={GY + row * CELL + CELL / 2 + 4} textAnchor="middle" className="yr-grid__wd">
          {d}
        </text>
      ))}
      {months.map((m) => (
        <text key={`${m.col}${m.text}`} x={GX + m.col * CELL + 4} y="12" className="yr-grid__mo">
          {m.text}
        </text>
      ))}
      {days.map((d, i) => {
        const col = Math.floor((i + row0) / 7);
        const row = (i + row0) % 7;
        const cx = GX + col * CELL + CELL / 2;
        const cy = GY + row * CELL + CELL / 2;
        const k = order.get(d.startMs);
        const isFest = fest.has(d.startMs);
        return (
          <motion.g
            key={d.startMs}
            initial={quiet ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: k ? 1.3 + k * 0.2 : 0.2 + col * 0.05 }}
          >
            {isFest ? (
              <rect
                x={cx - 7.5}
                y={cy - 7.5}
                width="15"
                height="15"
                rx="2"
                transform={`rotate(45 ${cx} ${cy})`}
                className="yr-grid__fest"
              />
            ) : null}
            {k ? (
              <>
                <circle cx={cx} cy={cy} r="10.5" className="yr-grid__pick" />
                <text x={cx} y={cy + 4.2} textAnchor="middle" className="yr-grid__k">
                  {k}
                </text>
              </>
            ) : (
              <circle cx={cx} cy={cy} r={n1(1.6 + d.score * 3.6)} className="yr-grid__dot" style={{ opacity: 0.28 + d.score * 0.62 }} />
            )}
            {i === 0 && !k ? <circle cx={cx} cy={cy} r="8.5" className="yr-grid__today" /> : null}
          </motion.g>
        );
      })}
    </svg>
  );
}

/** "Of the Sun: 6 Feb, 2 Aug. Of the Moon: 21 Feb.", from the festival calendar's own entries. */
function eclipseWords(list: readonly Festival[], date: (ms: number) => string): string {
  const of = (id: string) =>
    list
      .filter((f) => f.id === id)
      .map((f) => date(f.dateMs + DAY / 2))
      .join(", ");
  const sun = of("solar-eclipse");
  const moon = of("lunar-eclipse");
  return [sun ? `Of the Sun: ${sun}.` : "", moon ? `Of the Moon: ${moon}.` : ""].filter(Boolean).join(" ");
}

function DaysSlide({ data }: { data: YearData | null }) {
  if (!data?.days || !data.circled) {
    return (
      <div className="yr-body">
        <Head id="days" eyebrow="Days worth circling">
          Three good days to begin something
        </Head>
        <Waiting text="Looking through the next ninety days." />
      </div>
    );
  }
  const zone = data.zone;
  const date = (ms: number) => fmt(ms, zone, { weekday: "short", day: "numeric", month: "short" });
  const longDate = (ms: number) => fmt(ms, zone, { weekday: "long", day: "numeric", month: "long" });
  const dayMonth = (ms: number) => fmt(ms, zone, { day: "numeric", month: "short" });
  const festivals = data.festivals ?? [];
  const eclipses = data.eclipses ?? [];
  const onGrid = festivals.filter((f) => data.days?.some((d) => d.startMs === f.dateMs));
  const label = `The next ${data.days.length} days as a calendar, a column per week, each day as bright as it reads for a new start. Ringed: ${listWords(
    data.circled.map((d) => longDate(d.noonMs)),
  )}.${onGrid.length ? ` Marked with a diamond: ${listWords(onGrid.map((f) => f.name))}.` : ""}`;
  const count = data.circled.length;
  return (
    <div className="yr-body yr-body--days">
      <Head id="days" eyebrow="Days worth circling" small>
        {count === 3
          ? "Three good days to begin something"
          : count === 1
            ? "A good day to begin something"
            : "Good days to begin something"}
      </Head>
      <DayGrid days={data.days} circled={data.circled} festivals={onGrid} zone={zone} label={label} />
      <ol className="yr-days">
        {data.circled.map((d, i) => (
          <li key={d.startMs}>
            <Rise i={2 + i} className="yr-days__row">
              <span className="yr-days__k" aria-hidden="true">
                {i + 1}
              </span>
              <span className="yr-days__body">
                <span className="yr-days__t">
                  {date(d.noonMs)} <span className="yr-days__w">· {TONE_WORD[d.tone]}</span>
                </span>
                {d.for[0] ? <span className="yr-days__s">{d.for[0].text}</span> : null}
              </span>
            </Rise>
          </li>
        ))}
      </ol>
      <Rise i={6} className="yr-also">
        {data.festivals === null ? (
          <Waiting text="Reading the festival calendar." />
        ) : (
          <>
            {festivals.length ? (
              <p>
                <span className="yr-also__k">
                  <i className="yr-also__fest" aria-hidden="true" />
                  Next festivals
                </span>
                {festivals.map((f) => `${f.name.replace(" · ", " / ")}, ${dayMonth(f.dateMs + DAY / 2)}`).join(" · ")}
              </p>
            ) : null}
            {eclipses.length ? (
              <p>
                <span className="yr-also__k">Eclipses this year</span>
                {eclipseWords(eclipses, dayMonth)}
              </p>
            ) : null}
          </>
        )}
      </Rise>
    </div>
  );
}

// ─── 8. the closing ─────────────────────────────────────────────────────────

function ClosingSlide({ data, profileId, onAgain }: { data: YearData | null; profileId: string; onAgain: () => void }) {
  const shape = data?.shape ?? null;
  const lit = new Set(shape?.best.map((b) => b.month.startMs) ?? []);
  return (
    <div className="yr-body yr-body--close">
      {data && shape ? (
        <div className="yr-ring-sm">
          <MonthRing window={data.window} months={data.months} lit={lit} label={ringLabel(data.window, shape)}>
            <p className="yr-ring__word" data-long={shape.word.length > 6 || undefined}>
              {shape.word}
            </p>
          </MonthRing>
        </div>
      ) : null}
      <Head id="close" eyebrow="Your year in a sentence" small>
        {shape ? closingLine(shape, data?.chapter ?? null) : "Your year, in a sentence"}
      </Head>
      {shape ? null : <Waiting text="Gathering the year." />}
      <Rise i={3}>
        <p className="yr-reflect">For reflection: your choices write the rest.</p>
      </Rise>
      <Rise i={4} className="yr-actions">
        <Link to={`/forecast/${profileId}?p=year`} className="v-btn v-btn--block">
          See the full forecast
        </Link>
        <button type="button" className="v-btn v-btn--ghost v-btn--block" onClick={onAgain}>
          Watch again
        </button>
      </Rise>
      <p className="yr-foot">A traditional reading for reflection, never a prediction or advice.</p>
    </div>
  );
}

// ─── the story ──────────────────────────────────────────────────────────────

export interface SlidesInput {
  name: string;
  profileId: string;
  patri: Patri | null;
  data: YearData | null;
  onAgain: () => void;
}

/** The eight slides, in order. A slide is `ready` once the numbers its picture needs have been read. */
export function yearSlides({ name, profileId, patri, data, onAgain }: SlidesInput): StorySlide[] {
  const shape = data?.shape ?? null;
  return [
    { id: "title", name: `${name}'s year ahead`, ready: !!shape, mood: "gold", node: <TitleSlide name={name} data={data} /> },
    { id: "best", name: "Your best months", ready: !!shape, mood: "green", node: <BestSlide shape={shape} /> },
    { id: "gentle", name: "The months to go gently", ready: !!shape, mood: "moon", node: <GentleSlide shape={shape} /> },
    {
      id: "chapter",
      name: "Your life chapter",
      ready: !!(patri && data?.chapter),
      mood: "gold",
      node: <ChapterSlide patri={patri} data={data} />,
    },
    { id: "slow", name: "The slow planets", ready: !!data?.slow, mood: "moon", node: <SlowSlide patri={patri} data={data} /> },
    {
      id: "areas",
      name: "Your strongest areas of life",
      ready: !!data?.areas,
      mood: "green",
      node: <AreasSlide areas={data?.areas ?? null} />,
    },
    { id: "days", name: "Days worth circling", ready: !!data?.circled, mood: "gold", node: <DaysSlide data={data} /> },
    {
      id: "close",
      name: "Your year in a sentence",
      ready: !!shape,
      mood: "rose",
      node: <ClosingSlide data={data} profileId={profileId} onAgain={onAgain} />,
    },
  ];
}
