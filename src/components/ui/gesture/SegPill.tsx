// The selected pill of a segmented control (`.v-seg.v-seg--pill`): one shape that slides from the old
// choice to the new one, once, and simply sits there when the reader asks for less motion.
// `useKeepInView` keeps the chosen item on screen when the control scrolls sideways on a small phone.
import { motion, useReducedMotion } from "motion/react";
import { useEffect } from "react";

const EASE = [0.22, 0.8, 0.2, 1] as const;

/** Put inside the selected button only. `id` must be unique among the controls on screen. */
export function SegPill({ id, className = "v-seg__pill" }: { id: string; className?: string }) {
  const still = useReducedMotion();
  return (
    <motion.span
      layoutId={`pill-${id}`}
      className={className}
      aria-hidden="true"
      style={{ borderRadius: 999 }}
      transition={still ? { duration: 0 } : { type: "tween", duration: 0.22, ease: EASE }}
    />
  );
}

/** Scrolls `box` sideways (never the page) until its selected child is fully shown. */
export function useKeepInView(box: React.RefObject<HTMLElement | null>, selected: string): void {
  // biome-ignore lint/correctness/useExhaustiveDependencies: runs again when the selection changes
  useEffect(() => {
    const el = box.current;
    const on = el?.querySelector<HTMLElement>(
      "[aria-selected='true'], [aria-pressed='true'], [aria-checked='true'], [aria-current='page']",
    );
    if (!el || !on || el.scrollWidth <= el.clientWidth + 1 || typeof el.scrollTo !== "function") return;
    const pad = 24;
    const left = on.getBoundingClientRect().left - el.getBoundingClientRect().left + el.scrollLeft;
    let to = el.scrollLeft;
    if (left - pad < el.scrollLeft) to = left - pad;
    else if (left + on.offsetWidth + pad > el.scrollLeft + el.clientWidth) to = left + on.offsetWidth + pad - el.clientWidth;
    if (to === el.scrollLeft) return;
    const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
    el.scrollTo({ left: Math.max(0, to), behavior: calm ? "auto" : "smooth" });
  }, [box, selected]);
}
