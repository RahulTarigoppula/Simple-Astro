// A horizontal swipe, read from pointer events with no library. The element that takes the handlers
// also needs the class `v-swipe` (interact.css: `touch-action: pan-y`), so the browser keeps vertical
// scrolling for itself and leaves sideways movement to us. A vertical scroll cancels the pointer and
// nothing fires; a tap never fires because it does not travel.
import { useMemo, useRef } from "react";

export type SwipeDirection = "left" | "right";

export interface SwipeOptions {
  /** The finger moved to the left: usually "next". */
  onLeft?: () => void;
  /** The finger moved to the right: usually "previous". */
  onRight?: () => void;
  /** Least sideways travel, in px. */
  threshold?: number;
  /** How many times longer than tall the movement must be. */
  ratio?: number;
  /** Also read a mouse drag (off: a mouse selects text and has the arrow buttons). */
  mouse?: boolean;
  disabled?: boolean;
}

export interface SwipeHandlers {
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
  onPointerCancel: (e: React.PointerEvent) => void;
}

/** Things that use a sideways drag themselves; a swipe never starts on them. */
const OWN_DRAG = "input, textarea, select, [contenteditable='true'], [role='slider'], [data-noswipe]";

/** Which way a movement of (dx, dy) px swipes, or null when it is too short or not mostly sideways. */
export function swipeOf(dx: number, dy: number, threshold = 48, ratio = 1.5): SwipeDirection | null {
  const ax = Math.abs(dx);
  if (ax < threshold || ax < Math.abs(dy) * ratio) return null;
  return dx < 0 ? "left" : "right";
}

export function useSwipe(options: SwipeOptions): SwipeHandlers {
  const opts = useRef(options);
  opts.current = options;
  const start = useRef<{ id: number; x: number; y: number } | null>(null);
  return useMemo<SwipeHandlers>(
    () => ({
      onPointerDown(e) {
        const o = opts.current;
        start.current = null;
        if (o.disabled || e.isPrimary === false) return;
        if (e.pointerType === "mouse" && !o.mouse) return;
        const t = e.target;
        if (t instanceof Element && t.closest(OWN_DRAG)) return;
        start.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
      },
      onPointerUp(e) {
        const s = start.current;
        start.current = null;
        const o = opts.current;
        if (!s || s.id !== e.pointerId || o.disabled) return;
        const dir = swipeOf(e.clientX - s.x, e.clientY - s.y, o.threshold, o.ratio);
        if (dir === "left") o.onLeft?.();
        else if (dir === "right") o.onRight?.();
      },
      onPointerCancel() {
        start.current = null;
      },
    }),
    [],
  );
}
