// "Roots": the story of Jyotiṣa, palmistry and numerology as a deck of cards — swipe, tap the arrows,
// or use ← →. Ends with the active person's birth numbers.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile } from "../../app/hooks";
import { Screen } from "../../components/ui/Screen";
import { birthNumbers, NUMBER_PLANET, STORY, type StoryCard } from "../../data/story";
import { StoryArt } from "./StoryArt";
import "./story.css";

interface Flat {
  card: StoryCard | "numbers";
  chapter: number;
}

const KIND_LABEL = { myth: "Myth", history: "History", idea: "Tradition" } as const;

function NumbersCard() {
  const active = useActiveProfile();
  const n = active ? birthNumbers(active.birth.localY, active.birth.localMo, active.birth.localD) : null;
  return (
    <>
      <div className="story-card__top">
        <span className="story-tag story-tag--idea">Try it</span>
        <span className="story-era">Aṅka Jyotiṣa</span>
      </div>
      <h2 className="story-card__title">
        Your numbers{" "}
        <span lang="hi" className="story-card__dev">
          अंक
        </span>
      </h2>
      {n && active ? (
        <>
          <p className="story-p">
            For {active.name}, born on {active.birth.localD}/{active.birth.localMo}/{active.birth.localY}:
          </p>
          <div className="story-nums">
            {(
              [
                ["Root number", "मूलांक", n.root, `the day of birth, ${active.birth.localD}, added down to one digit`],
                ["Destiny number", "भाग्यांक", n.destiny, "every digit of the full birth date, added down to one digit"],
              ] as const
            ).map(([label, dev, v, how]) => (
              <div key={label} className="story-num">
                <span className="story-num__v">{v}</span>
                <span className="story-num__k">
                  {label}{" "}
                  <span lang="hi" className="story-card__dev">
                    {dev}
                  </span>
                </span>
                <span className="story-num__p">
                  {NUMBER_PLANET[v]?.planet} · {NUMBER_PLANET[v]?.nature}
                </span>
                <span className="story-num__how">From {how}.</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="story-p">
          Save a person's birth date and this card will show their root and destiny numbers.{" "}
          <Link to="/leaf/new" className="linkish">
            Add someone
          </Link>
        </p>
      )}
      <p className="story-fact">
        Just for fun: numerology has no scientific basis. It's a modern, playful cousin of the ancient tradition.
      </p>
    </>
  );
}

export default function StoryScreen() {
  const flat = useMemo<Flat[]>(
    () => [...STORY.flatMap((ch, i) => ch.cards.map((card) => ({ card, chapter: i }))), { card: "numbers", chapter: STORY.length - 1 }],
    [],
  );
  const [at, setAt] = useState(0);
  const deck = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (i: number) => {
      const k = Math.max(0, Math.min(flat.length - 1, i));
      const el = deck.current?.children[k] as HTMLElement | undefined;
      const track = deck.current;
      const first = track?.children[0] as HTMLElement | undefined;
      if (el && track && first) track.scrollTo({ left: el.offsetLeft - first.offsetLeft, behavior: "smooth" });
      setAt(k);
    },
    [flat.length],
  );

  // Keep the counter in step with swipes.
  useEffect(() => {
    const root = deck.current;
    if (!root || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setAt(Number((e.target as HTMLElement).dataset.i));
      },
      { root, threshold: 0.6 },
    );
    for (const c of Array.from(root.children)) io.observe(c);
    return () => io.disconnect();
  }, []);

  const chapter = flat[at]?.chapter ?? 0;

  return (
    <Screen className="story" label="Roots — the story of the stars">
      <header className="story-head">
        <p className="story-kicker">Roots · कथा</p>
        <h1>The story of the stars</h1>
        <p className="story-lede">Gods, sages, Greeks, astronomers — how Indian astrology, palm reading and numerology came to be.</p>
      </header>

      <nav className="story-chapters" aria-label="Chapters">
        {STORY.map((ch, i) => (
          <button
            key={ch.id}
            type="button"
            className={i === chapter ? "is-on" : undefined}
            aria-current={i === chapter ? "step" : undefined}
            onClick={() => go(flat.findIndex((f) => f.chapter === i))}
          >
            {ch.title}
          </button>
        ))}
      </nav>

      <section
        className="story-deck"
        aria-roledescription="carousel"
        aria-label="Story cards"
        onKeyDown={(e) => {
          if (e.key === "ArrowRight") {
            e.preventDefault();
            go(at + 1);
          } else if (e.key === "ArrowLeft") {
            e.preventDefault();
            go(at - 1);
          }
        }}
      >
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a horizontally scrolling region must be reachable by keyboard (WCAG 2.1.1) */}
        <div className="story-track" ref={deck} role="group" aria-label="Cards — use the arrow keys" tabIndex={0}>
          {flat.map((f, i) => {
            const c = f.card;
            return (
              <article
                key={c === "numbers" ? "numbers" : c.id}
                data-i={i}
                className="story-card"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${flat.length}`}
              >
                {c === "numbers" ? (
                  <NumbersCard />
                ) : (
                  <>
                    <StoryArt art={c.art} />
                    <div className="story-card__top">
                      <span className={`story-tag story-tag--${c.kind}`}>{KIND_LABEL[c.kind]}</span>
                      <span className="story-era">{c.era}</span>
                    </div>
                    <h2 className="story-card__title">
                      {c.title}
                      {c.dev ? (
                        <span lang="hi" className="story-card__dev">
                          {" "}
                          {c.dev}
                        </span>
                      ) : null}
                    </h2>
                    {c.body.map((p) => (
                      <p key={p.slice(0, 24)} className="story-p">
                        {p}
                      </p>
                    ))}
                    {c.fact ? (
                      <p className="story-fact">
                        <strong>Did you know? </strong>
                        {c.fact}
                      </p>
                    ) : null}
                  </>
                )}
              </article>
            );
          })}
        </div>
      </section>

      <div className="story-nav">
        <button type="button" className="story-btn" onClick={() => go(at - 1)} disabled={at === 0} aria-label="Previous card">
          ←
        </button>
        <div className="story-dots" aria-live="polite">
          <span>
            <span className="vh">Card </span>
            {at + 1} <span aria-hidden="true">/</span>
            <span className="vh"> of </span> {flat.length}
          </span>
          <span className="story-bar" aria-hidden="true">
            <span style={{ width: `${((at + 1) / flat.length) * 100}%` }} />
          </span>
        </div>
        <button type="button" className="story-btn" onClick={() => go(at + 1)} disabled={at === flat.length - 1} aria-label="Next card">
          →
        </button>
      </div>
      <p className="story-foot">
        Myths are told as myths and history as history.{" "}
        <Link to="/guide" className="linkish">
          What every word means →
        </Link>
      </p>
    </Screen>
  );
}
