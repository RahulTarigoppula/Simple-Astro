// The opening journey: from the observable universe down to a forest on Earth, to us under the stars,
// to why Vyomaphala exists. A live canvas behind animated words. Tap, swipe or ← → to move; Esc or Skip to
// leave. With reduced motion it waits for the reader instead of advancing.
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BEATS } from "./journeyText";
import { SCENES } from "./scenes";
import "./journey.css";
import { countEvent } from "../../platform/stats";

const FADE = 1.1; // seconds of crossfade between scenes

export function Journey({ onDone, onAbout }: { onDone: () => void; onAbout: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [at, setAt] = useState(0);
  const atRef = useRef(0);
  const since = useRef(performance.now());
  const sceneSince = useRef(performance.now());
  const prev = useRef<{ i: number; t: number } | null>(null);
  const reduce = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const [paused, setPaused] = useState(false);
  // After the story: one short "how to use" card, then Home.
  const [howto, setHowto] = useState(false);
  const pausedRef = useRef(false);
  pausedRef.current = paused || reduce;

  const go = useCallback((i: number) => {
    if (i >= BEATS.length) {
      setHowto(true);
      return;
    }
    const k = Math.max(0, i);
    if (k === atRef.current) return;
    const from = BEATS[atRef.current];
    const to = BEATS[k];
    const now = performance.now();
    if (from && to && from.scene === to.scene) {
      prev.current = null;
    } else {
      prev.current = { i: atRef.current, t: (now - sceneSince.current) / 1000 };
      sceneSince.current = now;
    }
    atRef.current = k;
    since.current = now;
    setAt(k);
  }, []);

  // The render loop: draw the current scene, crossfading from the last one.
  useEffect(() => {
    const cv = canvas.current;
    const g = cv?.getContext("2d");
    if (!cv || !g) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const size = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    size();
    window.addEventListener("resize", size);
    let pausedAt = 0;
    const frame = (now: number) => {
      if (pausedRef.current) {
        if (!pausedAt) pausedAt = now;
      } else if (pausedAt) {
        since.current += now - pausedAt;
        sceneSince.current += now - pausedAt;
        pausedAt = 0;
      }
      const t = ((pausedAt || now) - since.current) / 1000;
      const beat = BEATS[atRef.current];
      const draw = beat ? SCENES[beat.scene] : undefined;
      // A scene that carries over from the last frame keeps its own clock, so the picture never restarts.
      const st = ((pausedAt || now) - sceneSince.current) / 1000;
      if (draw) {
        g.globalAlpha = 1;
        draw({ g, w, h, t: reduce ? 4 : st });
        const p = prev.current;
        if (p && t < FADE && !reduce) {
          const old = BEATS[p.i];
          const od = old ? SCENES[old.scene] : undefined;
          if (od) {
            g.save();
            g.globalAlpha = 1 - t / FADE;
            od({ g, w, h, t: p.t + t });
            g.restore();
          }
        }
        // The last slide waits for the reader; everything before it moves on by itself.
        if (beat && atRef.current < BEATS.length - 1 && !pausedRef.current && t > beat.hold) go(atRef.current + 1);
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, [go, reduce]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight" || e.key === " ") {
        e.preventDefault();
        go(atRef.current + 1);
      } else if (e.key === "ArrowLeft") go(atRef.current - 1);
      else if (e.key === "Escape") onDone();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, onDone]);

  const beat = BEATS[at];
  const last = at === BEATS.length - 1;
  const touch = useRef<number | null>(null);

  // Rendered on <body> so no transformed ancestor (a screen's entry animation) can clip it.
  return createPortal(
    <div
      className="journey"
      role="dialog"
      aria-modal="true"
      aria-label="The journey from the universe to Vyomaphala"
      onTouchStart={(e) => {
        touch.current = e.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(e) => {
        const x0 = touch.current;
        const x1 = e.changedTouches[0]?.clientX;
        touch.current = null;
        if (x0 == null || x1 == null) return;
        if (x1 - x0 > 50) go(at - 1);
        else if (x0 - x1 > 50) go(at + 1);
      }}
    >
      <div className="journey__canvas" aria-hidden="true">
        <canvas ref={canvas} />
      </div>
      <div className="journey__shade" aria-hidden="true" />

      <div className="journey__bars" aria-hidden="true">
        {BEATS.map((b, i) => (
          <span key={b.id} className={i < at ? "is-done" : i === at ? (paused || reduce ? "is-now is-paused" : "is-now") : undefined}>
            <i style={i === at ? { animationDuration: `${b.hold}s` } : undefined} key={i === at ? `${b.id}-${at}` : b.id} />
          </span>
        ))}
      </div>
      <header className="journey__top">
        <span className="journey__brand">
          <span className="journey__mark" aria-hidden="true" />
          Vyomaphala <span lang="hi">व्योमफल</span>
        </span>
        <button
          type="button"
          className="journey__skip"
          onClick={() => {
            countEvent("intro-skipped");
            setHowto(true);
          }}
        >
          Skip ›
        </button>
      </header>

      {howto ? (
        <section className="journey__text journey__howto" aria-labelledby="howto-h">
          <h2 id="howto-h" className="journey__say journey__say--narr">
            How to use Vyomaphala
          </h2>
          <p className="journey__meaning">
            <span lang="hi">व्योमफल</span> Vyomaphala is Sanskrit for the fruit of the sky: vyoma, the heavens, and phala, what they yield.
          </p>
          <ol className="journey__steps">
            <li>
              <b>Add yourself.</b> Your name, birth date, time and place of birth. It takes about a minute.
            </li>
            <li>
              <b>Tap a card.</b> Your life in simple words, Partner Compatibility, your forecast and more. All in plain words first.
            </li>
            <li>
              <b>Tap ⓘ on any word</b> you don't know. It explains it in simple words.
            </li>
          </ol>
          <p className="journey__steps-note">Everything stays on this device. Nothing to sign up for.</p>
          <div className="journey__cta">
            <button type="button" className="stamp" onClick={onDone}>
              <span>Start</span>
            </button>
          </div>
        </section>
      ) : beat ? (
        <section
          key={beat.id}
          className={`journey__text journey__text--${beat.scene}${beat.quote ? " journey__text--maker" : ""}`}
          aria-live="polite"
        >
          {beat.quote ? (
            <blockquote className="journey__quote">
              {beat.id === BEATS.find((b) => b.quote)?.id ? <p className="journey__kicker">In Rahul's words</p> : null}
              <p className="journey__say">{beat.quote}</p>
              {beat.sign ? <footer className="journey__sig">Rahul (RT), who made Vyomaphala</footer> : null}
            </blockquote>
          ) : (
            <>
              <h2 className="journey__say journey__say--narr">{beat.title}</h2>
              {beat.line ? <p className="journey__line">{beat.line}</p> : null}
            </>
          )}{" "}
          {last ? (
            <>
              <section className="journey__made" aria-label="How Vyomaphala was made">
                <p className="journey__made-h">Vyomaphala · Made by Rahul (RT)</p>
                <p className="journey__made-p">
                  <b>252 hours</b> of work and dedication: 18 weeks, 7 days a week, 2 hours a day. Planning, development, data gathering and
                  cleaning.
                </p>
                <ul className="journey__made-n">
                  <li>
                    <b>82,505</b> places
                  </li>
                  <li>
                    <b>9,096</b> real stars
                  </li>
                  <li>
                    <b>50</b> charts checked
                  </li>
                  <li>
                    <b>714</b> tests
                  </li>
                </ul>
              </section>
              <div className="journey__cta">
                <button type="button" className="stamp" onClick={() => setHowto(true)}>
                  <span>Enter Vyomaphala</span>
                </button>
                <button type="button" className="journey__ghost" onClick={onAbout}>
                  How Vyomaphala was made
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      <footer className="journey__nav">
        <button type="button" className="journey__btn" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous">
          ←
        </button>
        <button type="button" className="journey__btn" onClick={() => setPaused((p) => !p)} aria-pressed={paused || reduce}>
          {paused || reduce ? "▶" : "❚❚"}
          <span className="vh">{paused || reduce ? "Play" : "Pause"}</span>
        </button>
        <button
          type="button"
          className="journey__btn journey__btn--next"
          onClick={() => (howto ? onDone() : go(at + 1))}
          aria-label={howto ? "Start" : last ? "Enter Vyomaphala" : "Next"}
        >
          {last ? "✓" : "→"}
        </button>
      </footer>
    </div>,
    document.body,
  );
}

const SEEN = "vyom-journey-seen";
const OFF = "vyom-journey-off";

/** Play once per visit, never in automation, and never if the reader turned it off. */
export function shouldPlayJourney(): boolean {
  try {
    if (typeof navigator !== "undefined" && navigator.webdriver) return false;
    if (localStorage.getItem(OFF) === "1") return false;
    return sessionStorage.getItem(SEEN) !== "1";
  } catch {
    return false;
  }
}
export function markJourneySeen(): void {
  try {
    sessionStorage.setItem(SEEN, "1");
  } catch {
    // storage may be unavailable (private mode); the journey simply plays again next time
  }
}
export function setJourneyAtStart(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OFF);
    else localStorage.setItem(OFF, "1");
  } catch {
    // ignore
  }
}
export function journeyAtStart(): boolean {
  try {
    return localStorage.getItem(OFF) !== "1";
  } catch {
    return true;
  }
}
