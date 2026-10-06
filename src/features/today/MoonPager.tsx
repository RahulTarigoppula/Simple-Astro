// The Moon as it really is that day — the terminator is an ellipse whose half-width is
// |1 − 2k| of the radius — and the pager that ages it: drag the disc sideways or press ‹ ›.
// Each day crossed is a detent: one brass tick and a selectionChanged.
import { animate, motion, useMotionValue } from "motion/react";
import { useId, useRef } from "react";
import { PAPER } from "../../motion/springs";
import { reducedMotion } from "../../platform/native";

const R = 46;
const CX = 50;

/** The lit region as one SVG path: the lit limb plus the terminator half-ellipse. */
export function litPath(k: number, waxing: boolean, south: boolean): string {
  const kk = Math.min(1, Math.max(0, k));
  if (kk < 0.004) return "";
  const rightLit = waxing !== south;
  const rx = Math.abs(1 - 2 * kk) * R;
  const limb = rightLit ? 1 : 0;
  const term = (kk < 0.5) === rightLit ? 0 : 1;
  return `M${CX} ${CX - R}A${R} ${R} 0 0 ${limb} ${CX} ${CX + R}A${rx.toFixed(2)} ${R} 0 0 ${term} ${CX} ${CX - R}Z`;
}

export function MoonDisc({ k, waxing, south }: { k: number; waxing: boolean; south: boolean }) {
  const id = useId().replace(/:/g, "");
  const d = litPath(k, waxing, south);
  return (
    <svg className="moon" viewBox="0 0 100 100" aria-hidden="true" data-decorative="true">
      <defs>
        <clipPath id={`lit${id}`}>{d ? <path d={d} /> : <circle cx={CX} cy={CX} r="0" />}</clipPath>
      </defs>
      <circle className="moon__dark" cx={CX} cy={CX} r={R} />
      {d ? <path className="moon__lit" d={d} /> : null}
      <g clipPath={`url(#lit${id})`} className="moon__maria">
        <ellipse cx="38" cy="36" rx="13" ry="10" />
        <ellipse cx="58" cy="30" rx="9" ry="7" />
        <ellipse cx="62" cy="52" rx="11" ry="8" />
        <ellipse cx="44" cy="62" rx="8" ry="11" />
        <circle cx="56" cy="76" r="3.4" />
      </g>
      <circle className="moon__rim" cx={CX} cy={CX} r={R} />
    </svg>
  );
}

const STEP_PX = 56;

interface MoonPagerProps {
  offset: number;
  k: number;
  waxing: boolean;
  south: boolean;
  onStep: (delta: number) => void;
  onToday: () => void;
  caption: string;
}

export function MoonPager({ offset, k, waxing, south, onStep, onToday, caption }: MoonPagerProps) {
  const x = useMotionValue(0);
  const drag = useRef<{ x0: number; applied: number; id: number } | null>(null);

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // capture is best-effort
    }
    drag.current = { x0: e.clientX, applied: 0, id: e.pointerId };
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dx = e.clientX - d.x0;
    // Dragging the Moon to the left turns the page forward (tomorrow), as a page does.
    const want = Math.round(-dx / STEP_PX);
    if (want !== d.applied) {
      onStep(want - d.applied);
      d.applied = want;
    }
    x.set(dx + d.applied * STEP_PX);
  };
  const end = () => {
    drag.current = null;
    if (reducedMotion()) x.set(0);
    else animate(x, 0, PAPER);
  };

  return (
    <div className="moonpager">
      <div className="moonpager__row">
        <button type="button" className="moonpager__step" aria-label="Previous day" onClick={() => onStep(-1)}>
          ‹
        </button>
        <div
          className="moonpager__disc"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
          aria-hidden="true"
        >
          <motion.div style={{ x }}>
            <MoonDisc k={k} waxing={waxing} south={south} />
          </motion.div>
        </div>
        <button type="button" className="moonpager__step" aria-label="Next day" onClick={() => onStep(1)}>
          ›
        </button>
      </div>
      <p className="moonpager__cap mono">{caption}</p>
      {offset !== 0 ? (
        <button type="button" className="moonpager__today" onClick={onToday}>
          back to today
        </button>
      ) : null}
    </div>
  );
}
