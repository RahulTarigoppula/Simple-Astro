// The intro, in three acts.
//   I   · Scale  , the universe narrows to one pale blue dot.
//   II  · Wonder , life on that dot, and the people who looked up.
//   III · Rahul  , his own words, quoted (only tidied for grammar), one thought per frame.
// Act I-II facts are as published (sources in the comments). Act III is never paraphrased.
import type { SceneId } from "./scenes";

export interface Beat {
  id: string;
  scene: SceneId;
  /** Narration: a title card with one short line. */
  title?: string;
  line?: string;
  /** Rahul's own words, shown large as a quote. */
  quote?: string;
  /** Sign the quote (the last frame). */
  sign?: boolean;
  /** seconds on screen before moving on by itself */
  hold: number;
}

export const BEATS: Beat[] = [
  // ── Act I · Scale ─────────────────────────────────────────────────────
  // Observable universe ≈ 93 billion light-years across; Milky Way 100-400 billion stars.
  { id: "universe", scene: "universe", title: "The part of the universe we can see is about 93 billion light-years across.", hold: 7 },
  { id: "milkyway", scene: "milkyway", title: "Our galaxy, the Milky Way, has a few hundred billion stars in it.", hold: 7 },
  { id: "solar", scene: "solar", title: "The Sun is one of them. Eight planets go around it.", hold: 6 },
  { id: "earth", scene: "earth", title: "Earth is still the only place where we know there is life.", hold: 7 },
  // Crowther et al. 2015: ≈3 trillion trees.
  { id: "life", scene: "life", title: "There are about three trillion trees here. We haven't found a single leaf anywhere else.", hold: 8 },
  // Strobilanthes kunthiana flowers about every 12 years; Jupiter circles the zodiac in 11.86 years.
  {
    id: "rare",
    scene: "rare",
    title:
      "In the Western Ghats, the Neelakurinji flowers about once every twelve years. Jupiter takes about as long to go once around the sky.",
    hold: 9,
  },
  { id: "us", scene: "us", title: "People have always looked up, named the stars and told stories about them.", hold: 7 },
  // ── Act III · In Rahul's words ────────────────────────────────────────
  {
    id: "stories",
    scene: "child",
    quote:
      "All of the people in India know one or the other of the greatest stories from childhood, like the Rāmāyaṇa and the Mahābhārata.",
    hold: 9,
  },
  {
    id: "perspective",
    scene: "child",
    quote:
      "My love and belief were already there. But my wanting to learn more and read things started with Amish Tripathi's Shiva and Ram series. They gave a new perspective.",
    hold: 10,
  },
  {
    id: "study",
    scene: "study",
    quote: "So I started studying, and listening to countless books and audiobooks about the Mahābhārata and the Vedas.",
    hold: 8,
  },
  {
    id: "question",
    scene: "question",
    quote: "Then my curiosity asked this question: is astrology real? Are the doṣas' predictions true?",
    hold: 8,
  },
  {
    id: "understood",
    scene: "dawn",
    quote:
      "Then I understood. They act like predictions. We as humans have the capability to learn, predict and better ourselves. Astrology is the same.",
    hold: 10,
  },
  {
    id: "karma",
    scene: "vyom",
    quote: "The predictions are the kind of things that could happen. But karma, our own actions, is the only true thing. This is our own.",
    hold: 10,
  },
  {
    id: "why",
    scene: "vyom",
    quote:
      "I'm a software engineer specialising in AI. I developed Vyomaphala to make things simpler, remove the superstition, and present facts and learnings of my own.",
    sign: true,
    hold: 14,
  },
];
