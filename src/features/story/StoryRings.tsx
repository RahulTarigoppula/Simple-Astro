// Chapters as glowing rings (like story highlights): tap one to play the story from there.
import { useMemo, useState } from "react";
import { StoryPlayer } from "../../components/ui/StoryPlayer";
import { STORY } from "../../data/story";
import { StoryArt } from "./StoryArt";
import { chapterStart, rootsSlides } from "./storySlides";
import "./story.css";
import "./roots.css";

export function StoryRings() {
  const slides = useMemo(() => rootsSlides(), []);
  const [start, setStart] = useState<number | null>(null);
  return (
    <>
      <ul className="rings" aria-label="Story chapters">
        {STORY.map((ch) => {
          const first = ch.cards[0];
          return (
            <li key={ch.id}>
              <button type="button" className={`ring ring--${ch.id}`} onClick={() => setStart(chapterStart(ch.id))}>
                <span className="ring__disc" aria-hidden="true">
                  {first ? <StoryArt art={first.art} /> : null}
                </span>
                <span className="ring__t">{ch.title.split("·")[1]?.trim() ?? ch.title}</span>
                <span className="ring__s">{ch.title.split("·")[0]?.trim()}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {start !== null ? (
        <StoryPlayer title="Roots: the story of the stars" slides={slides} start={start} onClose={() => setStart(null)} />
      ) : null}
    </>
  );
}
