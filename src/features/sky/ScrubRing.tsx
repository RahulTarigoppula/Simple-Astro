// ScrubRing (§4.6): a brass ring turned with the thumb to scrub ±12 h around the birth moment.
// BRASS feel: the ring follows the finger 1:1 (zero easing), keeps turning on release with
// rotational inertia (v *= 0.94 per frame, capped at 4 detents per frame) and settles into a
// detent every 10 minutes — each detent a brass tick and a selection haptic. One turn = 2 hours.
import { useCallback, useEffect, useRef } from "react";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";

export const SCRUB_LIMIT_MIN = 720;
const DETENT_MIN = 10;
const MIN_PER_TURN = 120;
const MAX_V = 4 * DETENT_MIN; // minutes per frame
const FRICTION = 0.94;

interface ScrubRingProps {
  /** Minutes from the birth moment, −720…720. */
  value: number;
  onChange: (minutes: number) => void;
  /** Snap without inertia (reduced motion, Calm desk). */
  noInertia: boolean;
  valueText: string;
  resetLabel: string;
}

const clampMin = (m: number): number => Math.max(-SCRUB_LIMIT_MIN, Math.min(SCRUB_LIMIT_MIN, m));
const snap = (m: number): number => clampMin(Math.round(m / DETENT_MIN) * DETENT_MIN);

export function ScrubRing({ value, onChange, noInertia, valueText, resetLabel }: ScrubRingProps) {
  const ref = useRef<HTMLDivElement>(null);
  const cur = useRef(value);
  const drag = useRef<{ id: number; angle: number; lastT: number; v: number } | null>(null);
  const raf = useRef(0);
  const lastDetent = useRef(Math.round(value / DETENT_MIN));

  const set = useCallback(
    (m: number) => {
      const next = clampMin(m);
      cur.current = next;
      const det = Math.round(next / DETENT_MIN);
      if (det !== lastDetent.current) {
        lastDetent.current = det;
        haptics.selection();
        play("tick");
      }
      onChange(next);
    },
    [onChange],
  );

  useEffect(() => {
    cur.current = value;
    lastDetent.current = Math.round(value / DETENT_MIN);
  }, [value]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const angleOf = (e: React.PointerEvent): number => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return 0;
    return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
  };

  const settle = useCallback(() => {
    const target = snap(cur.current);
    if (target !== cur.current) set(target);
  }, [set]);

  const coast = useCallback(
    (v0: number) => {
      let v = Math.max(-MAX_V, Math.min(MAX_V, v0));
      const step = (): void => {
        v *= FRICTION;
        const before = cur.current;
        set(cur.current + v);
        if (Math.abs(v) < 0.4 || cur.current === before || document.hidden) {
          settle();
          return;
        }
        raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    [set, settle],
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>): void => {
    e.stopPropagation();
    cancelAnimationFrame(raf.current);
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { id: e.pointerId, angle: angleOf(e), lastT: e.timeStamp, v: 0 };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const a = angleOf(e);
    let delta = a - d.angle;
    if (delta > 180) delta -= 360;
    if (delta < -180) delta += 360;
    d.angle = a;
    const dm = (delta / 360) * MIN_PER_TURN;
    const dt = Math.max(1, e.timeStamp - d.lastT);
    d.lastT = e.timeStamp;
    // velocity in minutes per 60 Hz frame, lightly smoothed
    d.v = 0.6 * d.v + 0.4 * ((dm / dt) * 16.7);
    set(cur.current + dm);
  };
  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>): void => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    const stale = e.timeStamp - d.lastT > 80;
    if (noInertia || stale || Math.abs(d.v) < 0.5) settle();
    else coast(d.v);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>): void => {
    const k = e.key;
    const by: Record<string, number> = { ArrowRight: 10, ArrowUp: 10, ArrowLeft: -10, ArrowDown: -10, PageUp: 60, PageDown: -60 };
    let next: number | null = null;
    if (k in by) next = snap(cur.current) + (by[k] ?? 0);
    else if (k === "Home") next = -SCRUB_LIMIT_MIN;
    else if (k === "End") next = SCRUB_LIMIT_MIN;
    if (next === null) return;
    e.preventDefault();
    cancelAnimationFrame(raf.current);
    set(next);
  };

  const sign = value < 0 ? "−" : "+";
  const abs = Math.round(Math.abs(value));
  const hm = `${sign}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, "0")}`;

  return (
    <div className="scrub">
      <div
        ref={ref}
        className="scrub__ring"
        role="slider"
        tabIndex={0}
        aria-label="Scrub the sky, ±12 hours around the birth moment"
        aria-valuemin={-SCRUB_LIMIT_MIN}
        aria-valuemax={SCRUB_LIMIT_MIN}
        aria-valuenow={Math.round(value)}
        aria-valuetext={valueText}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
      >
        <div
          className="scrub__face"
          aria-hidden="true"
          data-decorative="true"
          style={{ transform: `rotate(${((value / MIN_PER_TURN) * 360).toFixed(2)}deg)` }}
        />
      </div>
      <button
        type="button"
        className="scrub__hub mono"
        onClick={() => {
          cancelAnimationFrame(raf.current);
          if (cur.current !== 0) set(0);
        }}
        aria-label={resetLabel}
      >
        {hm}
      </button>
    </div>
  );
}
