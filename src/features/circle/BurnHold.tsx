// Burn: hold 600 ms. While held the leaf's edge chars toward lac (an overlay whose opacity follows
// the hold, transform/opacity only); release early and it cools back.
import { useRef } from "react";
import { useHold } from "../../components/ui/useHold";

interface BurnHoldProps {
  label: React.ReactNode;
  ariaLabel: string;
  className?: string;
  /** 0..1 while held, 0 on release. */
  onProgress?: (k: number) => void;
  onBurn: () => void;
}

export function BurnHold({ label, ariaLabel, className, onProgress, onBurn }: BurnHoldProps) {
  const fill = useRef<HTMLSpanElement>(null);
  const handlers = useHold({
    ms: 600,
    onProgress: (k) => {
      const f = fill.current;
      if (f) {
        f.style.transition = k === 0 ? "transform var(--dur-base) var(--ease-out)" : "none";
        f.style.transform = `scaleX(${k})`;
      }
      onProgress?.(k);
    },
    onFire: onBurn,
  });
  return (
    <button type="button" className={`burnhold${className ? ` ${className}` : ""}`} aria-label={ariaLabel} {...handlers}>
      <span className="burnhold__fill" ref={fill} aria-hidden="true" />
      <span className="burnhold__lbl">{label}</span>
    </button>
  );
}

/** Drive a char overlay from a hold's progress: instant while held, a 240 ms cool-down on release. */
export function charTo(el: HTMLElement | null | undefined, k: number): void {
  if (!el) return;
  el.style.transition = k === 0 ? "opacity var(--dur-base) var(--ease-out)" : "none";
  el.style.opacity = String(k);
}
