// Story-mode slides from the Roots deck: one slide per card, from a chapter to the end.
import type { Slide } from "../../components/ui/StoryPlayer";
import { STORY } from "../../data/story";
import { StoryArt } from "./StoryArt";

const KIND_KICKER = { myth: "Myth", history: "History", idea: "Tradition", personal: "From the maker" } as const;

export function rootsSlides(): Slide[] {
  return STORY.flatMap((ch) =>
    ch.cards.map(
      (c): Slide => ({
        id: c.id,
        kicker:
          c.kind === "personal"
            ? `${ch.title.split("·")[0]?.trim()} · ${c.era}`
            : `${ch.title.split("·")[0]?.trim()} · ${KIND_KICKER[c.kind]} · ${c.era}`,
        title: c.title,
        dev: c.dev,
        body: c.body,
        fact: c.fact,
        art: <StoryArt art={c.art} />,
        tone: c.kind === "personal" ? "idea" : c.kind,
      }),
    ),
  );
}

/** Index of a chapter's first slide. */
export function chapterStart(chapterId: string): number {
  let n = 0;
  for (const ch of STORY) {
    if (ch.id === chapterId) return n;
    n += ch.cards.length;
  }
  return 0;
}
