// Roots: the history of Jyotiṣa, palmistry and numerology, through the gods, the ṛṣis, the Greeks
// and the astronomers to the epilogue. This page is the way in: start from the top, or pick a
// chapter. The stories themselves play full-screen in the story player.
import { useMemo, useState } from "react";
import { ChevronRight, Page, Section } from "../../components/ui/Page";
import { StoryPlayer } from "../../components/ui/StoryPlayer";
import { STORY } from "../../data/story";
import { countEvent } from "../../platform/stats";
import { StoryArt } from "./StoryArt";
import { chapterStart, rootsSlides } from "./storySlides";
import "./story.css";

export default function StoryScreen() {
  const slides = useMemo(() => rootsSlides(), []);
  const [play, setPlay] = useState<number | null>(null);
  const minutes = Math.round((slides.length * 30) / 60);
  const first = STORY[0]?.cards[0];

  return (
    <Page label="Roots: the story of the stars" back="/explore" backLabel="Explore">
      <section className="story-top" aria-labelledby="story-h">
        {first ? (
          <span className="story-top__art" aria-hidden="true">
            <StoryArt art={first.art} />
          </span>
        ) : null}
        <header className="v-head">
          <h1 id="story-h" className="v-title">
            The story of the stars
          </h1>
          <p className="v-lede">
            Four thousand years of people looking up: gods and ṛṣis, Greeks and astronomers, palm-readers and number-mystics.
          </p>
        </header>
        <button
          type="button"
          className="v-btn"
          onClick={() => {
            countEvent("roots-start");
            setPlay(0);
          }}
        >
          Start the story
        </button>
        <p className="v-small v-muted">
          {slides.length} short stories · about {minutes} minutes · tap to move, hold to pause
        </p>
      </section>

      <Section title="Chapters" note="Start from any one" />
      <ol className="v-list story-chapters">
        {STORY.map((ch, i) => {
          const [num = "", name] = ch.title.split("·").map((x) => x.trim());
          return (
            <li key={ch.id}>
              <button type="button" className="v-row" onClick={() => setPlay(chapterStart(ch.id))}>
                <span className="v-row__icon story-chapters__n" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="v-row__body">
                  <span className="v-row__t">{name ? (num.length > 3 ? `${num}: ${name}` : name) : ch.title}</span>
                  <span className="v-row__s">{ch.cards.map((c) => c.title).join(" · ")}</span>
                </span>
                <ChevronRight />
              </button>
            </li>
          );
        })}
      </ol>

      {play !== null ? (
        <StoryPlayer title="Roots: the story of the stars" slides={slides} start={play} onClose={() => setPlay(null)} />
      ) : null}
    </Page>
  );
}
