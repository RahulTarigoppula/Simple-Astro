// The intro, in three acts.
//   I   · Scale   — the universe narrows to one pale blue dot.
//   II  · Wonder  — life on that dot, and the people who looked up.
//   III · Rahul   — his own words, quoted (only tidied for grammar), one thought per frame.
// Act I–II facts are as published (sources in the comments). Act III is never paraphrased.
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
  // Observable universe ≈ 93 billion light-years across.
  { id: "universe", scene: "universe", title: "Ninety-three billion light-years.", line: "That is as far as we can see.", hold: 7 },
  // Milky Way: 100–400 billion stars.
  { id: "milkyway", scene: "milkyway", title: "Hundreds of billions of stars.", line: "One of them is ours.", hold: 7 },
  { id: "solar", scene: "solar", title: "One ordinary star.", line: "Eight worlds around it.", hold: 6 },
  { id: "earth", scene: "earth", title: "One pale blue dot.", line: "The only place we know of with life.", hold: 7 },

  // ── Act II · Wonder ───────────────────────────────────────────────────
  // Crowther et al. 2015: ≈3 trillion trees.
  { id: "life", scene: "life", title: "Three trillion trees.", line: "No other world we know has ever grown a leaf.", hold: 7 },
  // Strobilanthes kunthiana flowers about every 12 years; Jupiter circles the zodiac in 11.86 years.
  {
    id: "rare",
    scene: "rare",
    title: "Some flowers wait twelve years.",
    line: "Neelakurinji, in the Western Ghats. About as long as Jupiter takes to circle the sky.",
    hold: 8,
  },
  { id: "us", scene: "us", title: "And we looked up.", line: "We named the lights, and told stories about them.", hold: 7 },

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
      "I'm a software engineer specialising in AI. I developed Vyom to make things simpler, remove the superstition, and present facts and learnings of my own.",
    sign: true,
    hold: 14,
  },
];
