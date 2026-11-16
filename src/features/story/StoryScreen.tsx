// Roots: the history of Jyotiṣa, palmistry and numerology, through the gods, the ṛṣis, the Greeks
// and the astronomers to the epilogue. This page is the way in: start from the top, or pick a
// chapter. The stories themselves play full-screen in the story player.
import { useMemo, useState } from "react";
import { Reveal } from "../../components/ui/Motion";
import { ChevronRight, Page, Section } from "../../components/ui/Page";
import { StoryPlayer } from "../../components/ui/StoryPlayer";
import { STORY } from "../../data/story";
import { countEvent } from "../../platform/stats";
import { PoleStars } from "../explore/SkyArt";
import { chapterStart, rootsSlides } from "./storySlides";
import "../explore/skyart.css";
import "./story.css";

export default function StoryScreen() {
  const slides = useMemo(() => rootsSlides(), []);
  const [play, setPlay] = useState<number | null>(null);
  const minutes = Math.round((slides.length * 30) / 60);

  const hero = (
    <section className="bh bh--split story-hero" aria-labelledby="story-h">
      <p className="bh__eyebrow">Roots · four thousand years of looking up</p>
      <h1 id="story-h" className="bh__title bh__title--md">
        The story of the stars
      </h1>
      <div className="bh__pic">
        <PoleStars
          sages
          label="The real northern sky: the Seven Sages (Saptarṣi) turning around Dhruva, the Pole Star, two of the oldest stories in the sky"
        />
      </div>
      <p className="bh__line">
        Four thousand years of people looking up: gods and ṛṣis, Greeks and astronomers, palm-readers and number-mystics.
      </p>
      <div className="v-actions">
        <button
          type="button"
          className="v-btn v-btn--block"
          onClick={() => {
            countEvent("roots-start");
            setPlay(0);
          }}
        >
          Start the story
        </button>
      </div>
      <p className="bh__note">
        Above: the real northern sky, where two of the stories live. {slides.length} short stories · about {minutes} minutes · tap to move,
        hold to pause
      </p>
    </section>
  );

  return (
    <Page label="Roots: the story of the stars" back="/explore" backLabel="Explore" hero={hero} wide sky="night">
      <Section title="Chapters" note="Start from any one" />
      <Reveal i={0}>
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
      </Reveal>

      {play !== null ? (
        <StoryPlayer title="Roots: the story of the stars" slides={slides} start={play} onClose={() => setPlay(null)} />
      ) : null}
    </Page>
  );
}
