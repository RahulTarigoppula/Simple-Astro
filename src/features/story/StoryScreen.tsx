// Roots: the history of Jyotiṣa, palmistry and numerology — through the
// gods, the ṛṣis, the Greeks and the astronomers to the epilogue — played as full-screen stories.
import { useMemo, useState } from "react";
import { Screen } from "../../components/ui/Screen";
import { StoryPlayer } from "../../components/ui/StoryPlayer";
import { STORY } from "../../data/story";
import { StoryArt } from "./StoryArt";
import { StoryRings } from "./StoryRings";
import { chapterStart, rootsSlides } from "./storySlides";
import "./story.css";
import "./roots.css";

export default function StoryScreen() {
  const slides = useMemo(() => rootsSlides(), []);
  const [play, setPlay] = useState<number | null>(null);
  const minutes = Math.round((slides.length * 30) / 60);

  return (
    <Screen className="story" label="Roots — the story of the stars">
      <header className="story-hero">
        <p className="story-kicker">Roots · कथा</p>
        <h1>The story of the stars</h1>
        <p className="story-lede">
          Four thousand years of people looking up — gods and ṛṣis, Greeks and astronomers, palm-readers and number-mystics.
        </p>
        <div className="story-hero__actions">
          <button type="button" className="stamp story-play" onClick={() => setPlay(0)}>
            <span>▶ Start the story</span>
          </button>
          <span className="story-hero__meta">
            {slides.length} short stories · about {minutes} minutes · tap to move, hold to pause
          </span>
        </div>
      </header>

      <section className="story-ringsec" aria-labelledby="rings-h">
        <h2 id="rings-h" className="story-sub">
          Jump to a chapter
        </h2>
        <StoryRings />
      </section>

      <section className="story-toc" aria-labelledby="toc-h">
        <h2 id="toc-h" className="story-sub">
          Inside
        </h2>
        <ol>
          {STORY.map((ch) => (
            <li key={ch.id}>
              <button type="button" onClick={() => setPlay(chapterStart(ch.id))}>
                <span className="story-toc__art" aria-hidden="true">
                  {ch.cards[0] ? <StoryArt art={ch.cards[0].art} /> : null}
                </span>
                <span className="story-toc__text">
                  <span className="story-toc__k">{ch.title.split("·")[0]?.trim()}</span>
                  <span className="story-toc__t">{ch.title.split("·")[1]?.trim() ?? ch.title}</span>
                  <span className="story-toc__s">{ch.cards.map((c) => c.title).join(" · ")}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>
      </section>

      {play !== null ? (
        <StoryPlayer title="Roots — the story of the stars" slides={slides} start={play} onClose={() => setPlay(null)} />
      ) : null}
    </Screen>
  );
}
