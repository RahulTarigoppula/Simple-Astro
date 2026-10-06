// The mauli knot on the lower board and its loose end. Drag the end: it follows 1:1, and at 40 px
// the knot lets go (THREAD) — the bundle unties. Drag again to tie it. Enter/Space does the same.
import { motion, useMotionValue, useTransform } from "motion/react";
import { useRef } from "react";
import { THREAD } from "../../motion/springs";

/** Knot centre and the thread end's resting point, in the knot's own 132 × 84 box. */
const KX = 24;
const KY = 12;
const EX = 70;
const EY = 50;
const RELEASE_PX = 40;

interface ThreadKnotProps {
  tied: boolean;
  onToggle: () => void;
  count: number;
}

export function ThreadKnot({ tied, onToggle, count }: ThreadKnotProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const fired = useRef(false);
  const moved = useRef(false);
  const tail = useTransform([x, y], ([dx = 0, dy = 0]: number[]) => {
    const hx = EX + dx;
    const hy = EY + dy;
    // a sagging thread: the control point hangs below the chord
    const cx = (KX + hx) / 2 - 6;
    const cy = Math.max(KY, hy) + 14;
    return `M${KX} ${KY} Q ${cx.toFixed(1)} ${cy.toFixed(1)} ${hx.toFixed(1)} ${hy.toFixed(1)}`;
  });

  return (
    <div className="knot" data-tied={tied}>
      <svg className="knot__art" viewBox="0 0 132 84" width="132" height="84" aria-hidden="true" data-decorative="true">
        {/* the wrap over the board's edge */}
        <motion.path
          d={`M${KX} -12 V ${KY}`}
          className="knot__wrap"
          initial={false}
          animate={{ opacity: tied ? 1 : 0 }}
          transition={{ duration: 0.12 }}
        />
        <motion.path d={tail} className="knot__thread" />
        <motion.path d={tail} className="knot__twist" />
        <motion.g
          initial={false}
          animate={{ scale: tied ? 1 : 0.2, opacity: tied ? 1 : 0 }}
          transition={THREAD}
          style={{ transformOrigin: `${KX}px ${KY}px`, transformBox: "view-box" }}
        >
          <ellipse cx={KX - 7} cy={KY - 2} rx="7.5" ry="4" transform={`rotate(-28 ${KX - 7} ${KY - 2})`} className="knot__loop" />
          <ellipse cx={KX + 7} cy={KY - 2} rx="7.5" ry="4" transform={`rotate(28 ${KX + 7} ${KY - 2})`} className="knot__loop" />
        </motion.g>
        <circle cx={KX} cy={KY} r="4.2" className="knot__core" />
      </svg>
      <motion.button
        type="button"
        className="knot__end"
        style={{ x, y, left: EX - 22, top: EY - 22 }}
        drag
        dragSnapToOrigin
        dragElastic={0.35}
        dragMomentum={false}
        dragTransition={{ bounceStiffness: THREAD.stiffness, bounceDamping: THREAD.damping }}
        onDragStart={() => {
          fired.current = false;
          moved.current = true;
        }}
        onDrag={() => {
          if (fired.current) return;
          if (Math.hypot(x.get(), y.get()) >= RELEASE_PX) {
            fired.current = true;
            onToggle();
          }
        }}
        onDragEnd={() => {
          window.setTimeout(() => {
            moved.current = false;
          }, 0);
        }}
        onClick={() => {
          if (moved.current) return;
          onToggle();
        }}
        aria-label={tied ? `Untie the bundle — ${count} ${count === 1 ? "leaf" : "leaves"} fan out` : "Tie the bundle again"}
        aria-pressed={!tied}
      >
        <span className="knot__bead" aria-hidden="true" />
      </motion.button>
    </div>
  );
}
