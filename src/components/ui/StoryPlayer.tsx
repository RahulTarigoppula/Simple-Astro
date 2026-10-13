// Full-screen story mode: progress bars, tap right/left (or ← →) to move, hold to pause, Esc or ✕ to
// close. Slides advance on their own unless the reader prefers reduced motion.
import { useCallback, useEffect, useRef, useState } from "react";
import "./storyplayer.css";

export interface Slide {
  id: string;
  kicker: string;
  title: string;
  dev?: string | undefined;
  body: string[];
  fact?: string | undefined;
  art?: React.ReactNode;
  tone?: "myth" | "history" | "idea" | "sky" | undefined;
}

const SLIDE_MS = 11_000;

export function StoryPlayer({
  slides,
  start = 0,
  title,
  onClose,
}: {
  slides: Slide[];
  start?: number;
  title: string;
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [at, setAt] = useState(start);
  const [paused, setPaused] = useState(false);
  const [t, setT] = useState(0);
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const slide = slides[at];

  const go = useCallback(
    (k: number) => {
      if (k >= slides.length) onClose();
      else {
        setAt(Math.max(0, k));
        setT(0);
      }
    },
    [slides.length, onClose],
  );

  useEffect(() => {
    const d = ref.current;
    if (d && !d.open && typeof d.showModal === "function") d.showModal();
  }, []);

  // The progress clock: one rAF loop, paused while held or for reduced motion.
  useEffect(() => {
    if (paused || reduce) return;
    let raf = 0;
    let last = performance.now();
    const tick = (now: number) => {
      setT((x) => {
        const n = x + (now - last) / SLIDE_MS;
        last = now;
        return n;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [paused, reduce]);

  useEffect(() => {
    if (t >= 1) go(at + 1);
  }, [t, at, go]);

  if (!slide) return null;
  return (
    <dialog
      ref={ref}
      className={`storyplayer storyplayer--${slide.tone ?? "sky"}`}
      aria-label={title}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "ArrowRight" || e.key === " ") {
          e.preventDefault();
          go(at + 1);
        } else if (e.key === "ArrowLeft") {
          e.preventDefault();
          go(at - 1);
        }
      }}
    >
      <div className="sp-bars" aria-hidden="true">
        {slides.map((s, i) => (
          <span key={s.id}>
            <i style={{ width: `${i < at ? 100 : i > at ? 0 : Math.min(100, t * 100)}%` }} />
          </span>
        ))}
      </div>
      <header className="sp-top">
        <span className="sp-title">{title}</span>
        <span className="sp-count">
          {at + 1} / {slides.length}
        </span>
        <button type="button" className="sp-close" onClick={onClose} aria-label="Close story">
          ✕
        </button>
      </header>

      <article key={slide.id} className="sp-slide" aria-live="polite">
        {slide.art ? <div className="sp-art">{slide.art}</div> : null}
        <p className="sp-kicker">{slide.kicker}</p>
        <h2 className="sp-h">
          {slide.title}
          {slide.dev ? (
            <span lang="hi" className="sp-dev">
              {" "}
              {slide.dev}
            </span>
          ) : null}
        </h2>
        {slide.body.map((p) => (
          <p key={p.slice(0, 32)} className="sp-p">
            {p}
          </p>
        ))}
        {slide.fact ? (
          <p className="sp-fact">
            <strong>Did you know? </strong>
            {slide.fact}
          </p>
        ) : null}
      </article>

      {/* Tap zones: left goes back, right goes forward; holding anywhere pauses. */}
      <button
        type="button"
        className="sp-zone sp-zone--prev"
        aria-label="Previous"
        onClick={() => go(at - 1)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
      <button
        type="button"
        className="sp-zone sp-zone--next"
        aria-label="Next"
        onClick={() => go(at + 1)}
        onPointerDown={() => setPaused(true)}
        onPointerUp={() => setPaused(false)}
        onPointerLeave={() => setPaused(false)}
      />
      <footer className="sp-foot">
        <button type="button" className="sp-nav" onClick={() => go(at - 1)} disabled={at === 0}>
          ← Back
        </button>
        <button type="button" className="sp-nav" onClick={() => setPaused((p) => !p)} aria-pressed={paused || reduce}>
          {paused || reduce ? "▶ Play" : "❚❚ Pause"}
        </button>
        <button type="button" className="sp-nav sp-nav--next" onClick={() => go(at + 1)}>
          {at === slides.length - 1 ? "Finish ✓" : "Next →"}
        </button>
      </footer>
    </dialog>
  );
}
