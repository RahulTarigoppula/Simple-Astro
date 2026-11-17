// Left and Right arrow keys step a screen back and forward, unless the key belongs to something else:
// a field being typed in, a tab list or slider that moves with the arrows, or an open sheet.
import { useEffect, useRef } from "react";

const OWN_ARROWS =
  "input, textarea, select, [contenteditable='true'], [role='tablist'], [role='slider'], [role='radiogroup'], [role='menu'], [role='listbox'], [role='grid'], [role='dialog'], dialog";

export function useArrowKeys(onPrev: () => void, onNext: () => void, enabled = true): void {
  const fns = useRef({ onPrev, onNext });
  fns.current = { onPrev, onNext };
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
      const t = e.target;
      if (t instanceof Element && t.closest(OWN_ARROWS)) return;
      if (document.querySelector("[role='dialog'], dialog[open]")) return;
      e.preventDefault();
      if (e.key === "ArrowLeft") fns.current.onPrev();
      else fns.current.onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled]);
}
