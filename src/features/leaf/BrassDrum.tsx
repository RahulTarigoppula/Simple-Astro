// A brass counter drum (drum-spin): dragged 1:1 with zero easing, coasts with BRASS inertia on
// release (v *= 0.94 per frame, capped at 4 detents/frame), clicks into a detent every unit, and
// REFUSES an impossible value with a dull tick instead of clamping it.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { BRASS_FRICTION } from "../../motion/springs";
import { haptics } from "../../platform/haptics";
import { reducedMotion } from "../../platform/native";
import { play } from "../../platform/sound";

const CELL = 26;
const WINDOW = 3;

interface BrassDrumProps {
  label: string; // "Day"
  short: string; // "day"
  min: number;
  max: number;
  value: number;
  pad?: number;
  flex?: number;
  calm?: boolean;
  /** Returns false when the value is impossible (31 Feb): the detent is refused. */
  accept?: (v: number) => boolean;
  onChange: (v: number) => void;
  /** Continuous position while dragging/coasting (for the sky scrub). */
  onScrub?: (pos: number) => void;
  format?: (v: number) => string;
}

export function BrassDrum({ label, short, min, max, value, pad = 2, flex = 1, calm = false, accept, onChange, onScrub, format }: BrassDrumProps) {
  const el = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLDivElement>(null);
  const pos = useRef(value - min);
  const vel = useRef(0);
  const raf = useRef(0);
  const drag = useRef<{ y: number; t: number } | null>(null);
  const lastDetent = useRef(value);
  const [shown, setShown] = useState(value);
  const [typing, setTyping] = useState(false);
  const [seed, setSeed] = useState<string | null>(null);
  const [refused, setRefused] = useState(false);
  const [announce, setAnnounce] = useState("");
  const announceTimer = useRef(0);
  const fmt = format ?? ((v: number) => String(v).padStart(pad, "0"));
  const span = max - min;

  const paint = useCallback(() => {
    if (strip.current) strip.current.style.transform = `translateY(${(-pos.current * CELL).toFixed(2)}px)`;
    const v = Math.round(pos.current) + min;
    if (v !== lastDetent.current) {
      lastDetent.current = v;
      setShown(v);
      play("tick");
      haptics.selection();
    }
    onScrub?.(pos.current + min);
  }, [min, onScrub]);

  // External value changes (e.g. editing an existing leaf) move the drum without a coast.
  useLayoutEffect(() => {
    if (drag.current || raf.current) return;
    pos.current = value - min;
    lastDetent.current = value;
    setShown(value);
    if (strip.current) strip.current.style.transform = `translateY(${(-pos.current * CELL).toFixed(2)}px)`;
  }, [value, min]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const refuse = useCallback(() => {
    setRefused(true);
    play("dull");
    haptics.impact("light");
    window.setTimeout(() => setRefused(false), 220);
  }, []);

  const settle = useCallback(
    (target0: number) => {
      cancelAnimationFrame(raf.current);
      raf.current = 0;
      let target = Math.max(0, Math.min(span, Math.round(target0)));
      if (accept && !accept(target + min)) {
        refuse();
        target = value - min;
      }
      const from = pos.current;
      pos.current = target;
      lastDetent.current = target + min;
      setShown(target + min);
      if (target + min !== value) onChange(target + min);
      if (reducedMotion() || Math.abs(from - target) < 0.01) {
        paint();
        return;
      }
      const t0 = performance.now();
      const tween = () => {
        const k = Math.min(1, (performance.now() - t0) / 200);
        const e = 1 - (1 - k) ** 3;
        if (strip.current) strip.current.style.transform = `translateY(${(-(from + (target - from) * e) * CELL).toFixed(2)}px)`;
        if (k < 1) raf.current = requestAnimationFrame(tween);
        else {
          raf.current = 0;
          onScrub?.(target + min);
        }
      };
      raf.current = requestAnimationFrame(tween);
      setAnnounce("");
      clearTimeout(announceTimer.current);
      announceTimer.current = window.setTimeout(() => setAnnounce(`${label} ${fmt(target + min)}`), 300);
    },
    [accept, fmt, label, min, onChange, onScrub, paint, refuse, span, value],
  );

  const coast = useCallback(() => {
    if (calm || reducedMotion() || Math.abs(vel.current) < 0.02) {
      settle(pos.current);
      return;
    }
    const step = () => {
      vel.current *= BRASS_FRICTION;
      pos.current += vel.current;
      if (pos.current < 0 || pos.current > span) {
        pos.current = Math.max(0, Math.min(span, pos.current));
        vel.current = 0;
      }
      paint();
      if (Math.abs(vel.current) > 0.02) raf.current = requestAnimationFrame(step);
      else settle(pos.current);
    };
    raf.current = requestAnimationFrame(step);
  }, [calm, paint, settle, span]);

  const nudge = (d: number) => {
    const target = Math.max(0, Math.min(span, Math.round(pos.current) + d));
    if (accept && !accept(target + min)) {
      refuse();
      return;
    }
    play("tick");
    haptics.selection();
    settle(target);
  };

  const commitTyped = (raw: string) => {
    setTyping(false);
    setSeed(null);
    window.setTimeout(() => el.current?.focus(), 0);
    const n = Number.parseInt(raw, 10);
    if (!Number.isFinite(n) || n < min || n > max || (accept && !accept(n))) {
      refuse();
      return;
    }
    settle(n - min);
  };

  const lo = Math.max(min, shown - WINDOW);
  const hi = Math.min(max, shown + WINDOW);
  const cells: number[] = [];
  for (let v = lo; v <= hi; v++) cells.push(v);

  return (
    <div
      ref={el}
      className={`drum${refused ? " is-refused" : ""}`}
      style={{ flex }}
      role="spinbutton"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={shown}
      aria-valuetext={`${label} ${fmt(shown)}`}
      aria-invalid={refused || undefined}
      onPointerDown={(e) => {
        if (typing) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        cancelAnimationFrame(raf.current);
        raf.current = 0;
        drag.current = { y: e.clientY, t: performance.now() };
        vel.current = 0;
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const now = performance.now();
        const dy = e.clientY - d.y;
        const dt = Math.max(8, now - d.t);
        drag.current = { y: e.clientY, t: now };
        pos.current = Math.max(-0.6, Math.min(span + 0.6, pos.current - dy / CELL));
        vel.current = Math.max(-4, Math.min(4, ((-dy / CELL) / dt) * 16));
        paint();
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        if (!d) return;
        // A tap (no travel) opens typed entry — the keyboard fallback.
        if (Math.abs(vel.current) < 0.01 && Math.abs(pos.current - Math.round(pos.current)) < 0.05 && e.pointerType !== "mouse") {
          settle(pos.current);
          return;
        }
        coast();
      }}
      onPointerCancel={() => {
        drag.current = null;
        settle(pos.current);
      }}
      onDoubleClick={() => setTyping(true)}
      onKeyDown={(e) => {
        if (typing) return;
        const k = e.key;
        if (k === "ArrowUp" || k === "ArrowRight") nudge(1);
        else if (k === "ArrowDown" || k === "ArrowLeft") nudge(-1);
        else if (k === "PageUp") nudge(10);
        else if (k === "PageDown") nudge(-10);
        else if (k === "Home") settle(0);
        else if (k === "End") settle(span);
        else if (k === "Enter" || /^[0-9]$/.test(k)) {
          setSeed(/^[0-9]$/.test(k) ? k : null);
          setTyping(true);
          e.preventDefault();
          return;
        } else return;
        e.preventDefault();
      }}
    >
      <div className="drum__win" aria-hidden="true">
        <div className="drum__strip" ref={strip} style={{ transform: `translateY(${(-(value - min) * CELL).toFixed(2)}px)` }}>
          {cells.map((v) => (
            <div key={v} className="drum__cell" style={{ top: `${(v - min) * CELL}px` }}>
              {fmt(v)}
            </div>
          ))}
        </div>
      </div>
      <div className="drum__shade" aria-hidden="true" />
      <div className="drum__detent" aria-hidden="true" />
      <span className="drum__lbl" aria-hidden="true">
        {short}
      </span>
      {typing ? (
        <input
          className="drum__input"
          inputMode="numeric"
          aria-label={`${label}, type a value`}
          defaultValue={seed ?? fmt(shown)}
          // biome-ignore lint/a11y/noAutofocus: typed entry is an explicit user request
          autoFocus
          onFocus={(e) => {
            if (seed) e.currentTarget.setSelectionRange(seed.length, seed.length);
            else e.currentTarget.select();
          }}
          onBlur={(e) => commitTyped(e.currentTarget.value)}
          onKeyDown={(e) => {
            e.stopPropagation();
            if (e.key === "Enter") commitTyped(e.currentTarget.value);
            if (e.key === "Escape") {
              setTyping(false);
              setSeed(null);
              window.setTimeout(() => el.current?.focus(), 0);
            }
          }}
        />
      ) : null}
      <span className="vh" aria-live="polite">
        {announce}
      </span>
    </div>
  );
}
