// Find: the one door to every screen. This file is the small part that is always loaded (a round
// button and two keyboard shortcuts); the sheet's contents and its index arrive when it is first opened.
import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "../../components/ui/Sheet";

const load = () => import("./FindSheet");
const FindSheet = lazy(load);
/** Fetch the sheet a moment early, when a finger or pointer is on its way to the button. */
const warm = () => {
  load().catch(() => {});
};

function typingIn(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
}

export function MagnifierIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M15.5 15.5L20.5 20.5" />
    </svg>
  );
}

export interface FindButtonProps {
  /** Extra class on the button (it is a `.v-iconbtn`, so it already sits on a band or a plain top bar). */
  className?: string;
  /** Set false where a second button is on screen, so only one listens for "/" and Ctrl+K. */
  shortcuts?: boolean;
}

export function FindButton({ className, shortcuts = true }: FindButtonProps) {
  const [open, setOpen] = useState(false);
  // The sheet is not built until it is first asked for.
  const [used, setUsed] = useState(false);
  if (open && !used) setUsed(true);

  useEffect(() => {
    if (!shortcuts) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented) return;
      const combo = (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "k";
      const slash = e.key === "/" && !e.ctrlKey && !e.metaKey && !e.altKey && !typingIn(e.target);
      if (!combo && !slash) return;
      e.preventDefault();
      // Never on top of another sheet (or of itself).
      if (document.querySelector("dialog[open]")) return;
      setOpen(true);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [shortcuts]);

  const close = () => setOpen(false);
  return (
    <>
      <button
        type="button"
        className={`v-iconbtn${className ? ` ${className}` : ""}`}
        aria-label="Find anything"
        aria-haspopup="dialog"
        title="Find anything"
        onPointerEnter={warm}
        onFocus={warm}
        onClick={() => setOpen(true)}
      >
        <MagnifierIcon />
      </button>
      {used
        ? // On the page itself, not inside the dark picture band, so the sheet follows the light or dark theme.
          createPortal(
            <Sheet open={open} onClose={close} label="Find anything">
              <Suspense
                fallback={
                  <p role="status" className="v-muted" style={{ margin: 0, padding: "20px var(--page-pad, 20px)", minHeight: 320 }}>
                    Opening…
                  </p>
                }
              >
                <FindSheet onClose={close} />
              </Suspense>
            </Sheet>,
            document.body,
          )
        : null}
    </>
  );
}

export default FindButton;
