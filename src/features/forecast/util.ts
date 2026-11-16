// One scale of words everywhere (the same four as Home): Strong, Good, Mixed, Go gently.
// Small shared helpers for the Forecast screens: dates in the person's zone, tones and their words.
import { GRAHA_LORE } from "../../data/lore";
import { safeZone } from "../../engine/time";
import type { GrahaId } from "../../engine/types";

export const DAY = 86_400_000;
export const HALF_DAY = DAY / 2;

export type Tone = "bright" | "steady" | "mixed" | "testing";
export const TONE_WORD: Record<Tone, string> = { bright: "Strong", steady: "Good", mixed: "Mixed", testing: "Go gently" };
export const TONE_HINT: Record<Tone, string> = {
  bright: "Most of the sky favours you",
  steady: "More help than hindrance",
  mixed: "Help and hindrance in balance",
  testing: "Tradition advises patience",
};
export const AREA_WORD: Record<Tone, string> = { bright: "Strong", steady: "Good", mixed: "Mixed", testing: "Go gently" };

export const toneOf = (s: number): Tone => (s >= 0.35 ? "bright" : s >= 0 ? "steady" : s >= -0.35 ? "mixed" : "testing");
/** A −1 … +1 score as 0 … 100. */
export const pct = (score: number) => Math.round(((score + 1) / 2) * 100);

export const fmt = (ms: number, zone: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...o, timeZone: safeZone(zone) }).format(ms);
export const t12 = (ms: number, zone: string) => fmt(ms, zone, { hour: "numeric", minute: "2-digit", hour12: true });
export const span12 = (a: number, b: number, zone: string) => `${t12(a, zone)} to ${t12(b, zone)}`;

export const lore = (id: GrahaId) => GRAHA_LORE.find((g) => g.id === id);
export const english = (id: GrahaId) => lore(id)?.english ?? "";

/** The nine tārās in a word of English, beside the Sanskrit. */
export const TARA_ENGLISH: Record<string, string> = {
  Janma: "your own",
  Sampat: "gain",
  Vipat: "trouble",
  Kṣema: "well-being",
  Pratyari: "obstacle",
  Sādhaka: "achievement",
  Vadha: "hardest",
  Mitra: "friend",
  "Parama-Mitra": "best friend",
};

/** How the day's star reads for the person, as a short sentence. */
export const STAR_LINE = {
  kind: "The day's star is a kind one for you.",
  unkind: "The day's star is one tradition calls unkind.",
  mixed: "The day's star is your own birth star, so mixed.",
} as const;
