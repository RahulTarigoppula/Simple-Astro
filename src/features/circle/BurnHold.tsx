// Delete is the one hold left in the app: 600 ms. While held the button fills from the left;
// release early and it empties again and nothing is deleted.
import { useRef } from "react";
import { useHold } from "../../components/ui/useHold";

interface BurnHoldProps {
  label: React.ReactNode;
  ariaLabel: string;
  className?: string;
  onBurn: () => void;
}

export function BurnHold({ label, ariaLabel, className, onBurn }: BurnHoldProps) {
  const fill = useRef<HTMLSpanElement>(null);
  const handlers = useHold({
    ms: 600,
    onProgress: (k) => {
      const f = fill.current;
      if (!f) return;
      f.style.transition = k === 0 ? "transform var(--dur-base) var(--ease-out)" : "none";
      f.style.transform = `scaleX(${k})`;
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
