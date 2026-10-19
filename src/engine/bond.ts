// The Bond reading: the eight Aṣṭakūṭa factors regrouped into five things people actually ask about,
// each a 0-100 score, plus a plain verdict. Every one of the 36 points is counted exactly once, so the
// overall bond score is simply the Guna Milan total as a percentage. Groupings follow what tradition says
// each kūṭa weighs (Muhūrta Cintāmaṇi ch. 6 and the usual almanac glosses):
//   Understanding   = Graha Maitrī (5) + Varṇa (1)  minds and values
//   Companionship   = Gaṇa (6)                      temperament, day-to-day ease
//   Trust           = Bhakūṭa (7) + Tārā (3)        emotional bond, well-being together
//   Closeness       = Yoni (4) + Vaśya (2)          attraction and intimacy
//   Family & health = Nāḍī (8)                      health and children
import type { KootaId, ManglikStatus, MilanResult } from "./types";

export type BondId = "understanding" | "companionship" | "trust" | "closeness" | "family";
export type BondLevel = "strong" | "good" | "mixed" | "weak";

export interface BondPart {
  id: BondId;
  label: string;
  /** 0-100 */
  score: number;
  level: BondLevel;
  line: string;
  from: string;
}

export interface BondReading {
  /** 0-100, the Guna Milan total as a percentage. */
  score: number;
  headline: string;
  summary: string;
  parts: BondPart[];
  best: BondPart[];
  workOn: BondPart[];
  tip: string;
  manglik: string;
  /** The traditional signs of a lasting marriage, each present or not. */
  signs: Array<{ label: string; ok: boolean }>;
}

const SIGN_LABEL: Record<BondId, string> = {
  understanding: "Minds that click",
  companionship: "An easy everyday life together",
  trust: "Trust that grows",
  closeness: "Natural closeness",
  family: "Family life, no Nāḍī flag",
};

const GROUPS: Record<BondId, { label: string; kootas: KootaId[]; from: string }> = {
  understanding: { label: "Understanding", kootas: ["maitri", "varna"], from: "Graha Maitrī and Varṇa" },
  companionship: { label: "Companionship", kootas: ["gana"], from: "Gaṇa" },
  trust: { label: "Trust", kootas: ["bhakoot", "tara"], from: "Bhakūṭa and Tārā" },
  closeness: { label: "Closeness", kootas: ["yoni", "vashya"], from: "Yoni and Vaśya" },
  family: { label: "Family", kootas: ["nadi"], from: "Nāḍī" },
};

const LINES: Record<BondId, Record<BondLevel, string>> = {
  understanding: {
    strong: "Your minds click. You see the world in a similar way and talking comes easily.",
    good: "You understand each other well most of the time.",
    mixed: "You think differently. Explain yourselves and don't assume.",
    weak: "Your ways of thinking are far apart. Patience and real listening matter most here.",
  },
  companionship: {
    strong: "Easy to live with. Your natures fit, so the everyday feels light.",
    good: "Your temperaments get along, with small differences to respect.",
    mixed: "One of you is more fiery or more gentle. Give each other room.",
    weak: "Very different temperaments. Agree early on how you handle disagreements.",
  },
  trust: {
    strong: "A deep emotional bond. You tend to feel safe with each other.",
    good: "Trust builds steadily between you.",
    mixed: "Trust grows with time and keeping small promises.",
    weak: "Trust will need care. Be open about money, family and plans.",
  },
  closeness: {
    strong: "Strong attraction and a natural closeness.",
    good: "A warm attraction that grows with time.",
    mixed: "Attraction is there but needs attention and affection.",
    weak: "Physical and emotional closeness needs effort from both sides.",
  },
  family: {
    strong: "Tradition raises no flag here.",
    good: "Tradition raises no flag here.",
    mixed: "Tradition raises a flag here. It is an old rule, not a prediction; many families check further.",
    weak: "Tradition raises a flag here (Nāḍī doṣa). It is an old rule, not a prediction, and some rules cancel it.",
  },
};

const TIPS: Record<BondId, string> = {
  understanding: "Set aside time just to talk, without phones. Ask how the other one sees things before deciding.",
  companionship: "Learn how each of you cools down after a fight, and give that space without taking it personally.",
  trust: "Keep small promises and share plans early. Trust is built in little things.",
  closeness: "Make time for each other: small affection every day matters more than grand gestures.",
  family: "Talk openly about family plans. Many astrologers also look at the full charts before deciding.",
};

const levelOf = (pct: number): BondLevel => (pct >= 75 ? "strong" : pct >= 50 ? "good" : pct >= 25 ? "mixed" : "weak");

const manglikOk = (a: ManglikStatus, b: ManglikStatus): boolean =>
  (a.present && a.cancellations.length === 0) === (b.present && b.cancellations.length === 0);

function manglikLine(a: ManglikStatus, b: ManglikStatus, an: string, bn: string): string {
  const am = a.present && a.cancellations.length === 0;
  const bm = b.present && b.cancellations.length === 0;
  if (am && bm) return "Both are Manglik, which tradition says balances out.";
  if (!am && !bm) return "Neither is Manglik (or it is cancelled), so there is nothing to balance.";
  return `${am ? an : bn} is Manglik and ${am ? bn : an} is not. Tradition calls this a mismatch; many families consult further.`;
}

export function bondReading(r: MilanResult, nameA: string, nameB: string): BondReading {
  const parts: BondPart[] = (Object.keys(GROUPS) as BondId[]).map((id) => {
    const g = GROUPS[id];
    const ks = r.kootas.filter((k) => g.kootas.includes(k.id));
    const max = ks.reduce((t, k) => t + k.max, 0);
    const got = ks.reduce((t, k) => t + k.score, 0);
    let score = max ? Math.round((got / max) * 100) : 0;
    // A doṣa that tradition cancels is not a worry; one that stands caps the part at "mixed".
    const standing = ks.some((k) => k.dosha && !k.cancellation?.applied);
    if (standing) score = Math.min(score, 49);
    const level = levelOf(score);
    return { id, label: g.label, score, level, line: LINES[id][level], from: g.from };
  });
  const score = Math.round((r.total / 36) * 100);
  const sorted = [...parts].sort((x, y) => y.score - x.score);
  const best = sorted.filter((p) => p.score >= 50).slice(0, 2);
  const workOn = sorted
    .slice()
    .reverse()
    .filter((p) => p.score < 50)
    .slice(0, 2);
  const weakest = sorted[sorted.length - 1];
  const headline =
    r.band === "excellent"
      ? "A rare match"
      : r.band === "very-good"
        ? "A strong match"
        : r.band === "acceptable"
          ? "A good match, with things to work on"
          : "A match that needs real work";
  const summary =
    r.band === "excellent" || r.band === "very-good"
      ? `${nameA} and ${nameB} fit well on most of what tradition checks.`
      : r.band === "acceptable"
        ? `${nameA} and ${nameB} share a fair base. Most couples are here.`
        : `${nameA} and ${nameB} differ on much of what tradition checks. Plenty of happy couples score low; it means more conscious effort.`;
  return {
    score,
    headline,
    summary,
    parts,
    best,
    workOn,
    tip: weakest ? TIPS[weakest.id] : "",
    manglik: manglikLine(r.manglik.a, r.manglik.b, nameA, nameB),
    signs: [
      ...parts.map((p) => ({ label: SIGN_LABEL[p.id], ok: p.score >= 50 })),
      { label: "Manglik in balance", ok: manglikOk(r.manglik.a, r.manglik.b) },
    ],
  };
}
