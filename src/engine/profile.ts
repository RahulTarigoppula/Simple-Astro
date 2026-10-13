// A person's "cosmic profile" across traditions: the Western (tropical) Sun sign, the Chinese zodiac
// year, and numerology numbers, each labelled with the tradition it comes from.
import * as A from "astronomy-engine";
import { astroTime } from "./ephemeris";

// ── Western (tropical) Sun sign ─────────────────────────────────────────────
export function tropicalSunSign(utcMs: number): number {
  const lon = A.SunPosition(astroTime(utcMs)).elon;
  return Math.floor((((lon % 360) + 360) % 360) / 30);
}

// ── Chinese zodiac ──────────────────────────────────────────────────────────
export const CHINESE_ANIMALS = [
  "Rat",
  "Ox",
  "Tiger",
  "Rabbit",
  "Dragon",
  "Snake",
  "Horse",
  "Goat",
  "Monkey",
  "Rooster",
  "Dog",
  "Pig",
] as const;
export const CHINESE_ELEMENTS = ["Wood", "Fire", "Earth", "Metal", "Water"] as const;
const CST = 8 * 3_600_000;

/**
 * Chinese New Year for Gregorian year `y`: the first new moon whose date in China Standard Time falls
 * on or after 21 January. (Equivalent to "the second new moon after the winter solstice" in ordinary
 * years; the festival always lands between 21 January and 20 February.) Returns 00:00 CST that day.
 */
export function chineseNewYearMs(y: number): number {
  const dayStartCst = (ms: number) => Math.floor((ms + CST) / 86_400_000) * 86_400_000 - CST;
  const jan21 = Date.UTC(y, 0, 21) - CST;
  const nm = A.SearchMoonPhase(0, astroTime(jan21), 35);
  if (!nm) throw new Error("no new moon after 21 January");
  return dayStartCst(nm.date.getTime());
}
export interface ChineseSign {
  year: number;
  animal: (typeof CHINESE_ANIMALS)[number];
  element: (typeof CHINESE_ELEMENTS)[number];
  yin: boolean;
}

export function chineseZodiac(utcMs: number): ChineseSign {
  let y = new Date(utcMs + CST).getUTCFullYear();
  if (utcMs < chineseNewYearMs(y)) y -= 1;
  const k = (((y - 4) % 60) + 60) % 60;
  return {
    year: y,
    animal: CHINESE_ANIMALS[k % 12] ?? "Rat",
    element: CHINESE_ELEMENTS[Math.floor((k % 10) / 2)] ?? "Wood",
    yin: k % 2 === 1,
  };
}

// ── Numerology ──────────────────────────────────────────────────────────────
/** Digital root: keep adding digits until one is left (0 stays 0). */
export function digitalRoot(n: number): number {
  const a = Math.abs(Math.trunc(n));
  return a === 0 ? 0 : 1 + ((a - 1) % 9);
}

const digitSum = (s: string): number => s.split("").reduce((t, c) => t + (/\d/.test(c) ? Number(c) : 0), 0);

/** Root number (mūlāṅka) from the day of birth; destiny number (bhāgyāṅka) from the whole date. */
export function birthNumbers(y: number, m: number, d: number): { root: number; destiny: number } {
  return { root: digitalRoot(d), destiny: digitalRoot(digitSum(`${y}${m}${d}`)) };
}

/** Chaldean letter values (no 9, the number held sacred), as used in Indian name numerology. */
const CHALDEAN: Record<string, number> = {
  A: 1,
  I: 1,
  J: 1,
  Q: 1,
  Y: 1,
  B: 2,
  K: 2,
  R: 2,
  C: 3,
  G: 3,
  L: 3,
  S: 3,
  D: 4,
  M: 4,
  T: 4,
  E: 5,
  H: 5,
  N: 5,
  X: 5,
  U: 6,
  V: 6,
  W: 6,
  O: 7,
  Z: 7,
  F: 8,
  P: 8,
};

/** Name number: Chaldean values of the Latin letters, compound total and single digit. */
export function nameNumber(name: string): { compound: number; single: number; letters: number } {
  const clean = name.normalize("NFD").replace(/\p{M}/gu, "").toUpperCase();
  let compound = 0;
  let letters = 0;
  for (const ch of clean) {
    const v = CHALDEAN[ch];
    if (v) {
      compound += v;
      letters++;
    }
  }
  return { compound, single: digitalRoot(compound), letters };
}

/** Personal year: birth day + birth month + the calendar year, reduced. Runs birthday to birthday. */
export function personalYear(m: number, d: number, year: number): number {
  return digitalRoot(digitSum(`${d}${m}${year}`));
}

/** Number → graha in Indian numerology (Aṅka Jyotiṣa). */
export const NUMBER_GRAHA = { 1: "SU", 2: "MO", 3: "JU", 4: "RA", 5: "ME", 6: "VE", 7: "KE", 8: "SA", 9: "MA" } as const;
