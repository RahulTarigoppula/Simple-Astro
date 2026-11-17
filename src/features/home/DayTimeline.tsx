// The daylight of today as twelve planetary hours you can run a finger along: which are good, which
// to pause in, where "now" is. One control (a slider), so it is one stop for the keyboard too.
import { useMemo, useRef, useState } from "react";
import { ACTIVITIES, HORA_FOR } from "../../engine/pickday";
import type { GrahaId, Hora } from "../../engine/types";
import { english, span12, t12 } from "../forecast/util";
import "./day.css";

type Kind = "good" | "pause" | "plain";

interface Props {
  /** The twelve hours of daylight, sunrise to sunset. */
  hours: readonly Hora[];
  /** The hours the day guide calls good. */
  good: ReadonlyArray<{ startMs: number }>;
  /** Rāhu Kāla. */
  avoid: readonly [number, number];
  nowMs: number;
  zone: string;
}

/** What tradition gives an hour's planet to, in the words of "Pick a good day". */
function suits(lord: GrahaId): string {
  const names = ACTIVITIES.filter((a) => HORA_FOR[a.id].includes(lord)).map((a) => a.label.toLowerCase());
  return names.length ? `Tradition gives it to: ${names.slice(0, 3).join(", ")}.` : "";
}

export function hourKind(h: Hora, good: ReadonlyArray<{ startMs: number }>, avoid: readonly [number, number]): Kind {
  if (h.startMs < avoid[1] && h.endMs > avoid[0]) return "pause";
  return good.some((g) => g.startMs === h.startMs) ? "good" : "plain";
}

const KIND_WORD: Record<Kind, string> = { good: "A good hour", pause: "Pause new starts", plain: "An ordinary hour" };

export function DayTimeline({ hours, good, avoid, nowMs, zone }: Props) {
  const first = hours[0];
  const last = hours[hours.length - 1];
  const nowIdx = hours.findIndex((h) => nowMs >= h.startMs && nowMs < h.endMs);
  // Until a finger chooses an hour the timeline follows the clock (or shows the first good hour at night).
  const [picked, setPicked] = useState<number | null>(null);
  const firstGood = useMemo(() => hours.findIndex((h) => hourKind(h, good, avoid) === "good"), [hours, good, avoid]);
  const track = useRef<HTMLDivElement>(null);
  if (!first || !last) return null;
  const sel = Math.min(hours.length - 1, picked ?? (nowIdx >= 0 ? nowIdx : Math.max(0, firstGood)));
  const h = hours[sel] as Hora;
  const kind = hourKind(h, good, avoid);
  const span = last.endMs - first.startMs;
  const at = (ms: number) => `${Math.max(0, Math.min(100, ((ms - first.startMs) / span) * 100))}%`;
  const isNow = sel === nowIdx;
  const head = `${isNow ? "Now · " : ""}${span12(h.startMs, h.endMs, zone)}`;
  const detail =
    kind === "pause"
      ? `Rāhu Kāla runs ${span12(avoid[0], avoid[1], zone)}. Hold new starts until it has passed.`
      : kind === "good"
        ? suits(h.lord)
        : "Fine for everyday work.";

  const pickAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || r.width <= 0) return;
    const i = Math.floor(((clientX - r.left) / r.width) * hours.length);
    setPicked(Math.max(0, Math.min(hours.length - 1, i)));
  };

  return (
    <div className="tl">
      <div
        ref={track}
        className="tl__track"
        role="slider"
        tabIndex={0}
        aria-label="Hours of daylight. Move along the day to read each hour."
        aria-valuemin={1}
        aria-valuemax={hours.length}
        aria-valuenow={sel + 1}
        aria-valuetext={`${span12(h.startMs, h.endMs, zone)}, ${english(h.lord)} hour. ${KIND_WORD[kind]}.`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture?.(e.pointerId);
          pickAt(e.clientX);
        }}
        onPointerMove={(e) => {
          if (e.buttons > 0 || e.pointerType === "touch") pickAt(e.clientX);
        }}
        onKeyDown={(e) => {
          const step = e.key === "ArrowRight" || e.key === "ArrowUp" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -1 : 0;
          if (step) {
            e.preventDefault();
            setPicked(Math.max(0, Math.min(hours.length - 1, sel + step)));
          } else if (e.key === "Home" || e.key === "End") {
            e.preventDefault();
            setPicked(e.key === "Home" ? 0 : hours.length - 1);
          }
        }}
      >
        <span className="tl__segs" aria-hidden="true">
          {hours.map((x, i) => (
            <i key={x.startMs} data-kind={hourKind(x, good, avoid)} data-on={i === sel ? "" : undefined} />
          ))}
        </span>
        <span className="tl__rahu" aria-hidden="true" style={{ left: at(avoid[0]), right: `calc(100% - ${at(avoid[1])})` }} />
        {nowIdx >= 0 ? <span className="tl__now" aria-hidden="true" style={{ left: at(nowMs) }} /> : null}
      </div>
      <div className="tl__ends" aria-hidden="true">
        <span>{t12(first.startMs, zone)}</span>
        <span>Tap or slide</span>
        <span>{t12(last.endMs, zone)}</span>
      </div>
      <p className="tl__detail" data-kind={kind} aria-live="polite">
        <b>{head}</b>
        <span className="tl__what">
          <i aria-hidden="true" />
          {KIND_WORD[kind]} · {english(h.lord)} hour
        </span>
        {detail ? <span className="tl__why">{detail}</span> : null}
      </p>
      {picked !== null && nowIdx >= 0 && picked !== nowIdx ? (
        <button type="button" className="tl__back" onClick={() => setPicked(null)}>
          Back to now
        </button>
      ) : null}
    </div>
  );
}
