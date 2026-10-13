// The words of the opening journey: from the edge of the observable universe to one child on a terrace
// hearing an old story, to a grown-up question and its answer. Facts are as published (sources in the
// comments); the last three beats are the maker's own story.
import type { SceneId } from "./scenes";

export interface Beat {
  id: SceneId;
  kicker: string;
  title: string;
  lines: string[];
  /** seconds this beat stays before moving on by itself */
  hold: number;
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
      "Red sanders grows wild only in the hills of Andhra. Everything here is rarer than it looks.",
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
  {
    id: "child",
    kicker: "Every one of us",
    title: "First, there was a story.",
    lines: [
      "A summer night on the terrace. A grandparent tells it again — Rāma's exile, Arjuna's doubt, Hanumān's leap across the sea.",
      "In India, almost every childhood begins under these stories, and under these stars.",
    ],
    hold: 13,
  },
  {
    id: "question",
    kicker: "Then, curiosity",
    title: "Is any of it real?",
    lines: [
      "The love and the belief were always there. Amish Tripathi's Shiva and Ram books turned them into questions — then countless books and audiobooks on the Mahābhārata and the Vedas.",
      "And one question would not leave: do the planets really decide our lives?",
    ],
    hold: 14,
  },
  {
    id: "vyom",
    kicker: "What I found",
    title: "Karma, not fate.",
    lines: [
      "The old science reads the sky like a weather forecast — what could happen, never what must. We can learn, foresee and grow. Our actions are the only thing truly ours.",
      "I'm Rahul, an engineer who works with AI. I built Vyom — व्योम, the sky — to keep the facts, tell the stories, and leave the fear behind.",
    ],
    hold: 18,
  },
];
