// The story player for "Your year ahead": a full-screen, phone-width column on the night sky.
// Progress segments on top; tap the right side to go on, the left to go back; hold to pause; swipe
// down, Escape or the close button to leave; ← → on a keyboard. Slides move on by themselves after a
// few seconds, except when the reader prefers reduced motion, a slide is still being read from the
// sky, or the last slide is showing. Previous / Pause / Next are also real buttons for everyone.
import { useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";

export interface StorySlide {
  id: string;
  /** Short name for the slide, said with its number: "Your best months". */
  name: string;
  /** False while the slide's numbers are still being read: the clock waits. */
  ready: boolean;
  /** Paints the glow behind the slide. */
  mood?: "gold" | "green" | "moon" | "rose";
  node: React.ReactNode;
}

interface PlayerProps {
  /** Accessible name of the whole story. */
  label: string;
  /** The small line at the top left. */
  caption: string;
  slides: StorySlide[];
  start?: number;
  /** Milliseconds per slide. */
  slideMs?: number;
  /** Force the clock on or off (tests); by default it follows the reader's motion setting. */
  auto?: boolean;
  onClose: () => void;
}

const HOLD_MS = 220;
const SWIPE_PX = 90;

export function YearPlayer({ label, caption, slides, start = 0, slideMs = 6500, auto, onClose }: PlayerProps) {
  const still = useReducedMotion();
  const clock = auto ?? (!still && import.meta.env.MODE !== "test");
  const n = slides.length;
  const [at, setAt] = useState(() => Math.min(Math.max(0, start), n - 1));
  const [held, setHeld] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [t, setT] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const slide = slides[at];
  const last = at === n - 1;
  const ready = slide?.ready ?? false;
  const running = clock && !held && !stopped && ready && !last;

  const go = useCallback(
    (k: number) => {
      const to = Math.min(n - 1, Math.max(0, k));
      setAt(to);
      setT(0);
    },
    [n],
  );

  // The slide clock: one rAF loop, which only runs while the story is moving.
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    let prev = performance.now();
    const tick = (now: number) => {
      // A slide taller than the screen is read at the reader's own pace: the clock holds while it overflows.
      const el = stage.current;
      const tall = !!el && el.scrollHeight > el.clientHeight + 8;
      const dt = document.hidden || tall ? 0 : now - prev;
      prev = now;
      if (dt) setT((x) => x + dt / slideMs);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running, slideMs]);

  useEffect(() => {
    if (t >= 1 && !last) go(at + 1);
  }, [t, at, last, go]);

  // A slide taller than the screen scrolls under the finger; any other slide leaves the finger free for
  // the swipe down that closes the story.
  const [tall, setTall] = useState(false);
  // biome-ignore lint/correctness/useExhaustiveDependencies: measured again for each slide
  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const read = () => setTall(el.scrollHeight > el.clientHeight + 8);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => ro.disconnect();
  }, [at]);

  // Keys work wherever the focus is; a key meant for a button or link inside a slide stays with it.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        go(at + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        go(at - 1);
      } else if (e.key === " " && !(e.target as HTMLElement | null)?.closest?.("a, button")) {
        e.preventDefault();
        go(at + 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [at, go, onClose]);

  useEffect(() => {
    root.current?.focus({ preventScroll: true });
  }, []);

  // Tap, hold and swipe on the stage.
  const press = useRef<{ x: number; y: number; at: number; timer: number } | null>(null);
  const release = () => {
    const p = press.current;
    if (p) window.clearTimeout(p.timer);
    press.current = null;
    setHeld(false);
    return p;
  };
  const interactive = (el: EventTarget | null) => !!(el as HTMLElement | null)?.closest?.("a, button, summary, input");

  if (!slide) return null;
  return (
    <div ref={root} className="yr v-night" role="dialog" aria-modal="true" aria-label={label} tabIndex={-1}>
      <div className="yr__col" data-mood={slide.mood ?? "gold"}>
        <div className="yr__bars" aria-hidden="true">
          {slides.map((s, i) => (
            <span key={s.id}>
              <i style={{ transform: `scaleX(${i < at ? 1 : i > at ? 0 : clock ? Math.min(1, t) : 1})` }} />
            </span>
          ))}
        </div>
        <header className="yr__top">
          <p className="yr__caption">{caption}</p>
          <button type="button" className="yr__close" onClick={onClose} aria-label="Close the story">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </header>
        {/* The tap zones of a story; every action is also a real button below. */}
        <div
          ref={stage}
          className="yr__stage"
          data-tall={tall || undefined}
          aria-live={running ? "off" : "polite"}
          onPointerDown={(e) => {
            if (e.button !== 0 || interactive(e.target)) return;
            const timer = window.setTimeout(() => setHeld(true), HOLD_MS);
            press.current = { x: e.clientX, y: e.clientY, at: performance.now(), timer };
          }}
          onPointerUp={(e) => {
            const p = release();
            if (!p || interactive(e.target)) return;
            const dx = e.clientX - p.x;
            const dy = e.clientY - p.y;
            if (dy > SWIPE_PX && Math.abs(dy) > Math.abs(dx)) {
              onClose();
              return;
            }
            if (performance.now() - p.at > HOLD_MS || Math.abs(dx) > 12 || Math.abs(dy) > 12) return;
            const r = e.currentTarget.getBoundingClientRect();
            if (e.clientX - r.left < r.width * 0.3) go(at - 1);
            else if (!last) go(at + 1);
          }}
          onPointerCancel={release}
          onPointerLeave={release}
        >
          <section key={slide.id} className="yr-slide" data-slide={slide.id} aria-labelledby={`yr-h-${slide.id}`}>
            <p className="yr-sr">
              Slide {at + 1} of {n}
            </p>
            {slide.node}
          </section>
        </div>

        <footer className="yr__foot">
          <button type="button" className="yr__nav" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous slide">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M15 5l-7 7 7 7" />
            </svg>
          </button>
          {clock ? (
            <button
              type="button"
              className="yr__nav yr__nav--pause"
              onClick={() => setStopped((v) => !v)}
              aria-pressed={stopped}
              aria-label={stopped ? "Play the story" : "Pause the story"}
            >
              {stopped ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M8 5.5v13l11-6.5z" />
                </svg>
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" />
                </svg>
              )}
            </button>
          ) : (
            <span className="yr__count" aria-hidden="true">
              {at + 1} / {n}
            </span>
          )}
          <button type="button" className="yr__nav" onClick={() => go(at + 1)} disabled={last} aria-label="Next slide">
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </footer>
      </div>
    </div>
  );
}
