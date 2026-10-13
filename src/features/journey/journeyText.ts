// The words of the opening journey: from the edge of the observable universe to one child on a terrace
// hearing an old story, to a grown-up question and its answer. Facts are as published (sources in the
// comments); the last three beats are the maker's own words, quoted, not rewritten.
import type { SceneId } from "./scenes";

export interface Beat {
  id: SceneId;
  kicker: string;
  title: string;
  lines: string[];
  /** seconds this beat stays before moving on by itself */
  hold: number;
  /** The maker's own words: shown as a signed quote, never paraphrased. */
  voice?: "maker";
}

export const BEATS: Beat[] = [
  {
    id: "universe",
    kicker: "Look up",
    title: "93 billion light-years.",
    // Observable universe ≈ 93 Gly across; galaxy counts: hundreds of billions to ~2 trillion.
    lines: ["The universe we can see. Hundreds of billions of galaxies — maybe two trillion. Almost all of it dark, and silent."],
    hold: 9,
  },
  {
    id: "milkyway",
    kicker: "Closer",
    title: "One of them is home.",
    // ~100,000 ly across; galactic year ~230 million years.
    lines: ["A hundred thousand light-years of stars. Ours sits out on a quiet arm, taking 230 million years to go around once."],
    hold: 9,
  },
  {
    id: "solar",
    kicker: "Closer",
    title: "One ordinary star.",
    lines: ["Eight worlds circle it. The light leaving it now will reach you in eight minutes."],
    hold: 8,
  },
  {
    id: "earth",
    kicker: "Here",
    title: "And one pale blue dot.",
    lines: ["In all that space, and all that time, the only place we know where anything is alive."],
    hold: 9,
  },
  {
    id: "life",
    kicker: "Here, things grow",
    title: "Three trillion trees.",
    // Crowther et al. 2015, Nature: ≈3.04 trillion trees.
    lines: ["As far as we know, no other world has ever made a single leaf — or a single piece of wood."],
    hold: 9,
  },
  {
    id: "rare",
    kicker: "Rarer still",
    title: "Some bloom once in twelve years.",
    // Strobilanthes kunthiana (Western Ghats); Jupiter's sidereal period 11.86 years; Pterocarpus
    // santalinus is endemic to the southern Eastern Ghats of Andhra Pradesh.
    lines: [
      "Neelakurinji turns the Western Ghats blue about once every twelve years — the time Jupiter takes to walk once around the sky.",
      "Red sanders grows wild almost nowhere but the hills of Andhra Pradesh. Everything here is rarer than it looks.",
    ],
    hold: 12,
  },
  {
    id: "us",
    kicker: "And then",
    title: "Star-stuff learned to look up.",
    lines: [
      "Atoms made inside ancient stars became people who wondered about them — and named the lights. Seven Sages. The Moon's twenty-seven wives.",
    ],
    hold: 10,
  },
  // ── From here on, Rahul's own words (from his messages), only tidied for grammar. Nothing added. ──
  {
    id: "child",
    kicker: "In Rahul's words",
    title: "The greatest stories, from childhood.",
    voice: "maker",
    lines: [
      "All of the people in India know one or the other of the greatest stories from childhood — like the Rāmāyaṇa and the Mahābhārata.",
    ],
    hold: 12,
  },
  {
    id: "question",
    kicker: "In Rahul's words",
    title: "Is astrology real?",
    voice: "maker",
    lines: [
      "My love and belief were already there. But my wanting to learn more and read things started with Amish Tripathi's Shiva and Ram series — they gave a new perspective.",
      "So I started studying, and listening to countless books and audiobooks about the Mahābhārata and the Vedas. Then my curiosity asked this question: is astrology real? Are the doṣas' predictions true?",
    ],
    hold: 18,
  },
  {
    id: "vyom",
    kicker: "In Rahul's words",
    title: "Karma is the only true thing.",
    voice: "maker",
    lines: [
      "Then I understood: they act like predictions. We as humans have the capability to learn, predict and better ourselves — astrology is the same. The predictions are the kind of things that could happen. But karma, our own actions, is the only true thing. This is our own.",
      "I'm a software engineer with a specialisation in AI. I developed Vyom to make things simpler, remove the superstition, and present facts and learnings of my own.",
    ],
    hold: 22,
  },
];
