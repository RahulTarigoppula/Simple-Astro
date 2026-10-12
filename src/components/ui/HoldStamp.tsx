import { useRef } from "react";
import { useHold } from "./useHold";

interface HoldStampProps {
  label: React.ReactNode;
  ms?: number;
  disabled?: boolean;
  className?: string;
  ariaLabel?: string;
  onFire: () => void;
  onCancel?: () => void;
}

/** The vermilion stamp you hold (seal the leaf, shutter). One per screen. */
export function HoldStamp({ label, ms = 600, disabled, className, ariaLabel, onFire, onCancel }: HoldStampProps) {
  const fill = useRef<HTMLSpanElement>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const handlers = useHold({
    ms,
    disabled: disabled ?? false,
    onProgress: (k) => {
      if (fill.current) fill.current.style.transform = `scaleX(${k})`;
      if (btn.current) btn.current.style.transform = k > 0 ? `scale(${1 - 0.04 * k})` : "";
    },
    onFire,
    ...(onCancel ? { onCancel } : {}),
  });
  return (
    <button ref={btn} type="button" className={`stamp ${className ?? ""}`} disabled={disabled} aria-label={ariaLabel} {...handlers}>
      <span className="fill" ref={fill} aria-hidden="true" />
      <span>{label}</span>
    </button>
  );
}
