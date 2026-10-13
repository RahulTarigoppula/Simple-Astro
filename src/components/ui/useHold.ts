import { useCallback, useEffect, useRef } from "react";

interface HoldOptions {
  ms?: number;
  disabled?: boolean;
  onProgress?: (k: number) => void;
  onFire: () => void;
  onCancel?: () => void;
}

/**
 * Hold-to-act (seal, burn): pointer or held Space/Enter for `ms`. Fires exactly once per hold,
 * survives StrictMode double effects (no work happens in effects), and early release cancels.
 */
export function useHold({ ms = 600, disabled = false, onProgress, onFire, onCancel }: HoldOptions) {
  const raf = useRef(0);
  const t0 = useRef(0);
  const fired = useRef(false);
  const active = useRef(false);
  const cb = useRef({ onProgress, onFire, onCancel });
  cb.current = { onProgress, onFire, onCancel };

  const stop = useCallback((cancelled: boolean) => {
    cancelAnimationFrame(raf.current);
    raf.current = 0;
    const wasActive = active.current;
    active.current = false;
    cb.current.onProgress?.(0);
    if (cancelled && wasActive && !fired.current) cb.current.onCancel?.();
  }, []);

  const start = useCallback(() => {
    if (disabled || active.current) return;
    active.current = true;
    // Release anywhere ends the hold, some touch stacks never deliver pointerup to the button.
    const release = () => {
      window.removeEventListener("pointerup", release, true);
      window.removeEventListener("pointercancel", release, true);
      window.removeEventListener("mouseup", release, true);
      window.removeEventListener("touchend", release, true);
      window.removeEventListener("blur", release);
      if (active.current) stop(true);
    };
    window.addEventListener("pointerup", release, true);
    window.addEventListener("pointercancel", release, true);
    window.addEventListener("mouseup", release, true);
    window.addEventListener("touchend", release, true);
    window.addEventListener("blur", release);
    fired.current = false;
    t0.current = performance.now();
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0.current) / ms);
      cb.current.onProgress?.(k);
      if (k >= 1) {
        fired.current = true;
        stop(false);
        cb.current.onFire();
        return;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);
  }, [disabled, ms, stop]);

  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  return {
    onPointerDown: (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      try {
        (e.currentTarget as Element).setPointerCapture(e.pointerId);
      } catch {
        // capture is best-effort
      }
      start();
    },
    onPointerUp: () => stop(true),
    onPointerCancel: () => stop(true),
    onLostPointerCapture: () => stop(true),
    onKeyDown: (e: React.KeyboardEvent) => {
      if ((e.key === " " || e.key === "Enter") && !e.repeat) {
        e.preventDefault();
        start();
      } else if (e.key === " " || e.key === "Enter") e.preventDefault();
    },
    onKeyUp: (e: React.KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") stop(true);
    },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  };
}
