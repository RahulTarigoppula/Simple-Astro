// The pictures on the forecast band. Each one is drawn from the engine's own scores: a week, quarter
// or year as a flowing curve (one point per day or month, height = its score), a month as one slim
// bar per day. Today is the gold mark, the best day or month is ringed and named. The words for every
// point (Strong, Good, Mixed, Go gently) are in the list under the band; a picture never stands alone.
import { motion, useReducedMotion } from "motion/react";
import { useId, useLayoutEffect, useRef, useState } from "react";
import type { Forecast } from "../../engine/forecast";
import { AREA_WORD, DAY, fmt, HALF_DAY, pct, type Tone, toneOf } from "./util";

const EASE = [0.22, 0.8, 0.2, 1] as const;
const TONES: Tone[] = ["bright", "steady", "mixed", "testing"];

interface Mark {
  ms: number;
  score: number;
  tone: Tone;
  /** The small upper line of the axis label (weekday initial); may be empty. */
  k: string;
  /** The axis label itself: a date, a month. */
  n: string;
  /** Said aloud: "Monday 16 Nov". */
  name: string;
  now: boolean;
  best: boolean;
}

/** The width the picture really has on screen, so it is drawn in true pixels and its text never scales. */
function useWidth(initial: number) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(initial);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const read = () => {
      const x = Math.round(el.clientWidth);
      if (x > 0) setW(x);
    };
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

type Pt = readonly [number, number];
const n1 = (v: number) => v.toFixed(1);

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

const toneFill = (t: Tone) => (t === "bright" ? "var(--sky-good)" : t === "testing" ? "var(--sky-avoid)" : "var(--ink)");
const vars = (o: Record<string, string | number>) => o as React.CSSProperties;

/** What the picture says, in a sentence, for a screen reader. */
function summary(marks: Mark[], unit: "day" | "month"): string {
  const counts = TONES.map((t) => {
    const c = marks.filter((m) => m.tone === t).length;
    return c ? `${c} ${AREA_WORD[t].toLowerCase()}` : "";
  }).filter(Boolean);
  const best = marks.find((m) => m.best);
  const now = marks.find((m) => m.now);
  return [
    `${marks.length} ${unit}s: ${counts.join(", ")}.`,
    best ? `Best ${unit}: ${best.name}, ${AREA_WORD[best.tone]}.` : "",
    now ? `${unit === "day" ? "Today" : "This month"}: ${AREA_WORD[now.tone]}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
}

interface AxisProps {
  marks: Mark[];
  /** Which labels are written (all of them when omitted). */
  shown?: (m: Mark, i: number) => boolean;
  onOpen?: ((m: Mark) => void) | undefined;
  openWord?: string;
}

/** The labels under a picture. With `onOpen` every column of the picture is one tall button. */
function Axis({ marks, shown, onOpen, openWord }: AxisProps) {
  const label = (m: Mark) => (
    <>
      {m.k ? <span className="fc-axis__k">{m.k}</span> : null}
      <span className="fc-axis__n" data-now={m.now || undefined}>
        {m.n}
      </span>
    </>
  );
  if (onOpen)
    return (
      <ol className="fc-axis fc-axis--tap">
        {marks.map((m) => (
          <li key={m.ms}>
            <button
              type="button"
              aria-label={`${m.name}: ${AREA_WORD[m.tone]}${m.best ? ", best" : ""}${m.now ? ", now" : ""}. Open this ${openWord}`}
              onClick={() => onOpen(m)}
            >
              {label(m)}
            </button>
          </li>
        ))}
      </ol>
    );
  return (
    <ol className="fc-axis" aria-hidden="true">
      {marks.map((m, i) => (
        <li key={m.ms}>{!shown || shown(m, i) ? label(m) : null}</li>
      ))}
    </ol>
  );
}

interface CurveProps {
  marks: Mark[];
  unit: "day" | "month";
  /** The score just before and just after, so the line flows in from the edge and out again. */
  lead?: number | null;
  tail?: number | null;
  onOpen?: ((m: Mark) => void) | undefined;
}

const CH = 184;
const CTOP = 40;
const CBOT = 16;

/** One point per day or month on a smooth line, soft light beneath it. */
function Curve({ marks, unit, lead = null, tail = null, onOpen }: CurveProps) {
  const uid = useId().replace(/:/g, "");
  const still = useReducedMotion();
  const [ref, w] = useWidth(350);
  const n = marks.length;
  const col = w / n;
  const all = [...marks.map((m) => m.score), ...(lead === null ? [] : [lead]), ...(tail === null ? [] : [tail])];
  const lo = Math.max(-1, Math.min(-0.5, Math.min(...all) - 0.1));
  const hi = Math.min(1, Math.max(0.5, Math.max(...all) + 0.1));
  const y = (s: number) => CTOP + (1 - (s - lo) / (hi - lo)) * (CH - CTOP - CBOT);
  const pts: Pt[] = marks.map((m, i) => [(i + 0.5) * col, y(m.score)] as const);
  const path: Pt[] = [
    ...(lead === null ? [] : [[-0.5 * col, y(lead)] as const]),
    ...pts,
    ...(tail === null ? [] : [[(n + 0.5) * col, y(tail)] as const]),
  ];
  const line = smooth(path);
  const x0 = (path[0] as Pt)[0];
  const x1 = (path[path.length - 1] as Pt)[0];
  const area = `${line}L${n1(x1)} ${CH}L${n1(x0)} ${CH}Z`;
  const off = (s: number, d: number) => Math.min(1, Math.max(0, y(s) / CH + d));
  const flows = lead !== null || tail !== null;
  const yStrong = y(0.35);
  const yGentle = y(-0.35);
  // Each of the two words sits at the end of its rule where the line leaves it more room.
  const room = (ly: number, right: boolean) =>
    Math.min(
      CH,
      ...pts
        .map(([px, py], i) => ({ px, py, glow: marks[i]?.now === true, drop: marks[i]?.now === true && py < ly }))
        .filter(({ px }) => (right ? px > w - 96 : px < 96))
        .map(({ py, glow, drop }) => (drop ? 0 : Math.abs(py - ly) - (glow ? 14 : 0))),
    );
  const side = (ly: number) => {
    const right = room(ly, true) >= room(ly, false);
    // no room at either end: the word is left out (the list below names every point)
    return { x: right ? w - 20 : 20, a: right ? ("end" as const) : ("start" as const), fits: room(ly, right) >= 14 };
  };
  const sStrong = side(yStrong - 11);
  const sGentle = side(yGentle + 12);

  return (
    <div className={`fc-pic fc-pic--curve${onOpen ? " fc-pic--tap" : ""}`} ref={ref} style={vars({ "--n": n })}>
      <svg
        className="fc-pic__svg"
        width={w}
        height={CH}
        viewBox={`0 0 ${w} ${CH}`}
        role={onOpen ? undefined : "img"}
        aria-label={onOpen ? undefined : summary(marks, unit)}
        aria-hidden={onOpen ? true : undefined}
      >
        <defs>
          <linearGradient id={`ln-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="0" y2={CH}>
            <stop offset="0" style={{ stopColor: "var(--sky-good)" }} />
            <stop offset={off(0.35, -0.03)} style={{ stopColor: "var(--sky-good)" }} />
            <stop offset={off(0.35, 0.07)} style={{ stopColor: "var(--ink)" }} />
            <stop offset={off(-0.35, -0.07)} style={{ stopColor: "var(--ink)" }} />
            <stop offset={off(-0.35, 0.03)} style={{ stopColor: "var(--sky-avoid)" }} />
            <stop offset="1" style={{ stopColor: "var(--sky-avoid)" }} />
          </linearGradient>
          <linearGradient id={`ar-${uid}`} gradientUnits="userSpaceOnUse" x1="0" y1={CTOP} x2="0" y2={CH}>
            <stop offset="0" stopColor="white" stopOpacity="0.3" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={`now-${uid}`}>
            <stop offset="0" style={{ stopColor: "var(--sky-sun)" }} stopOpacity="0.6" />
            <stop offset="1" style={{ stopColor: "var(--sky-sun)" }} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`fd-${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="white" stopOpacity="0" />
            <stop offset="0.09" stopColor="white" stopOpacity="1" />
            <stop offset="0.91" stopColor="white" stopOpacity="1" />
            <stop offset="1" stopColor="white" stopOpacity="0" />
          </linearGradient>
          <mask id={`mk-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={w} height={CH}>
            <rect x="0" y="0" width={w} height={CH} fill={flows ? `url(#fd-${uid})` : "white"} />
          </mask>
        </defs>

        {/* where Strong begins and where Go gently begins */}
        <line x1="0" x2={w} y1={yStrong} y2={yStrong} className="fc-pic__rule" />
        <line x1="0" x2={w} y1={yGentle} y2={yGentle} className="fc-pic__rule" />
        {sStrong.fits ? (
          <text x={sStrong.x} y={yStrong - 7} textAnchor={sStrong.a} className="fc-pic__band">
            Strong
          </text>
        ) : null}
        {sGentle.fits ? (
          <text x={sGentle.x} y={yGentle + 16} textAnchor={sGentle.a} className="fc-pic__band">
            Go gently
          </text>
        ) : null}

        <g mask={`url(#mk-${uid})`}>
          <motion.path
            d={area}
            fill={`url(#ar-${uid})`}
            initial={still ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.9, delay: 0.45, ease: EASE }}
          />
          <motion.path
            d={line}
            className="fc-pic__line"
            stroke={`url(#ln-${uid})`}
            initial={still ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.3, ease: EASE }}
          />
        </g>

        {marks.map((m, i) => {
          const [cx, cy] = pts[i] as Pt;
          const edge = i === 0 ? "start" : i === n - 1 ? "end" : "middle";
          return (
            <g key={m.ms} className="fc-pic__pt" style={vars({ "--i": i, "--d": `${Math.round(250 + (i / n) * 900)}ms` })}>
              {m.now ? (
                <>
                  <line x1={cx} x2={cx} y1={cy + 10} y2={CH} className="fc-pic__drop" />
                  <circle cx={cx} cy={cy} r="24" fill={`url(#now-${uid})`} />
                </>
              ) : null}
              {m.best ? <circle cx={cx} cy={cy} r="10.5" className="fc-pic__ring" /> : null}
              {m.now ? (
                <circle cx={cx} cy={cy} r="6.5" className="fc-pic__now" />
              ) : (
                <circle cx={cx} cy={cy} r={n > 8 ? 3.2 : 4} fill={toneFill(m.tone)} className="fc-pic__dot" />
              )}
              {m.best ? (
                <text x={edge === "start" ? cx - 10 : edge === "end" ? cx + 10 : cx} y={cy - 18} textAnchor={edge} className="fc-pic__best">
                  Best
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <Axis marks={marks} onOpen={onOpen} openWord={unit} />
    </div>
  );
}

const BH = 184;
const BTOP = 36;

/** One slim bar per day, as tall as the day's score. */
function Bars({ marks }: { marks: Mark[] }) {
  const [ref, w] = useWidth(350);
  const n = marks.length;
  const col = w / n;
  const bw = Math.max(4, Math.min(12, col * 0.56));
  const room = BH - BTOP;
  const today = marks.findIndex((m) => m.now);
  // The three best days carry a small light; the best of all is named.
  const top = new Set(
    [...marks]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map((m) => m.ms),
  );
  return (
    <div className="fc-pic fc-pic--bars" ref={ref} style={vars({ "--n": n })}>
      <svg className="fc-pic__svg" width={w} height={BH} viewBox={`0 0 ${w} ${BH}`} role="img" aria-label={summary(marks, "day")}>
        {marks.map((m, i) => {
          const cx = (i + 0.5) * col;
          const h = Math.max(8, (pct(m.score) / 100) * room);
          const edge = i < 2 ? "start" : i > n - 3 ? "end" : "middle";
          return (
            <g key={m.ms}>
              {m.now ? (
                <rect x={cx - col / 2 - 1} y={BH - h - 12} width={col + 2} height={h + 12} rx="6" className="fc-pic__today" />
              ) : null}
              <rect
                x={cx - bw / 2}
                y={BH - h}
                width={bw}
                height={h}
                rx={bw / 2}
                className="fc-pic__bar"
                data-t={m.tone}
                data-now={m.now || undefined}
                style={vars({ "--d": `${Math.round((i / n) * 620)}ms` })}
              />
              {top.has(m.ms) ? (
                <circle
                  cx={cx}
                  cy={BH - h - 8}
                  r="2.6"
                  className="fc-pic__star fc-pic__pt"
                  style={vars({ "--d": `${Math.round(700 + (i / n) * 500)}ms` })}
                />
              ) : null}
              {m.best ? (
                <text
                  x={edge === "start" ? cx - 4 : edge === "end" ? cx + 4 : cx}
                  y={BH - h - 17}
                  textAnchor={edge}
                  className="fc-pic__best fc-pic__pt"
                  style={vars({ "--d": "1100ms" })}
                >
                  Best
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <Axis
        marks={marks}
        shown={(m, i) =>
          m.now || ((i % 7 === 0 || i === n - 1) && (today < 0 || Math.abs(i - today) > 2) && (i === n - 1 || n - 1 - i > 2))
        }
      />
    </div>
  );
}

interface PictureProps {
  f: Forecast;
  zone: string;
  now: number;
  lead: number | null;
  tail: number | null;
  onOpenDay: (ms: number) => void;
  onOpenMonth: (ms: number) => void;
}

/** The picture of a week, month, quarter or year. */
export function PeriodPicture({ f, zone, now, lead, tail, onOpenDay, onOpenMonth }: PictureProps) {
  const bestMs = [...f.steps].sort((a, b) => b.score - a.score)[0]?.ms;
  const byDay = f.period === "week" || f.period === "month";
  const marks: Mark[] = f.steps.map((s, i) => {
    const end = byDay ? s.ms + DAY : (f.steps[i + 1]?.ms ?? f.endMs);
    const at = byDay ? s.ms + HALF_DAY : s.ms + DAY;
    return {
      ms: s.ms,
      score: s.score,
      tone: toneOf(s.score),
      k: f.period === "week" ? fmt(at, zone, { weekday: "narrow" }) : "",
      n: byDay ? fmt(at, zone, { day: "numeric" }) : fmt(at, zone, { month: f.period === "quarter" ? "long" : "narrow" }),
      name: byDay ? fmt(at, zone, { weekday: "long", day: "numeric", month: "short" }) : fmt(at, zone, { month: "long" }),
      now: now >= s.ms && now < end,
      best: s.ms === bestMs,
    };
  });
  if (!marks.length) return null;
  if (f.period === "month") return <Bars marks={marks} />;
  if (f.period === "week") return <Curve marks={marks} unit="day" lead={lead} tail={tail} onOpen={(m) => onOpenDay(m.ms + HALF_DAY)} />;
  if (f.period === "quarter") return <Curve marks={marks} unit="month" onOpen={(m) => onOpenMonth(m.ms + 2 * DAY)} />;
  return <Curve marks={marks} unit="month" />;
}
