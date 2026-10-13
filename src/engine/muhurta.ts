// Muhūrta divisions of the Hindu day: Choghaḍiyā (eight parts of the day and of the night), Horā
// (twelve planetary hours each), Brahma-muhūrta and Godhūli. Pure functions of explicit instants.
import { CITE } from "./citations";
import type { Choghadiya, ChoghadiyaName, Citation, GrahaId, Hora, MuhurtaQuality } from "./types";

type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/**
 * The seven choghaḍiyās in their running order, each ruled by a graha in the horā order
 * (Sūrya, Śukra, Budha, Candra, Śani, Guru, Maṅgala). The day's first choghaḍiyā is the weekday
 * lord's; each next one steps +1 in this cycle, and the eighth repeats the first.
 */
export const CHOGHADIYA_CYCLE: readonly ChoghadiyaName[] = ["Udvega", "Cara", "Lābha", "Amṛta", "Kāla", "Śubha", "Roga"];

export const CHOGHADIYA_DEV: Record<ChoghadiyaName, string> = {
  Udvega: "उद्वेग",
  Cara: "चर",
  Lābha: "लाभ",
  Amṛta: "अमृत",
  Kāla: "काल",
  Śubha: "शुभ",
  Roga: "रोग",
};

export const CHOGHADIYA_QUALITY: Record<ChoghadiyaName, MuhurtaQuality> = {
  Amṛta: "good",
  Śubha: "good",
  Lābha: "good",
  Cara: "neutral",
  Udvega: "bad",
  Kāla: "bad",
  Roga: "bad",
};

/** Horā order (descending Chaldean order read forward one day): Sūrya → Śukra → Budha → Candra →
 *  Śani → Guru → Maṅgala → Sūrya… Each hour's lord is the next in this cycle. */
export const HORA_CYCLE: readonly GrahaId[] = ["SU", "VE", "ME", "MO", "SA", "JU", "MA"];

/** Weekday (0 = Ravivāra) → its lord's place in the cycle. */
const LORD_AT: readonly number[] = [0, 3, 6, 2, 5, 1, 4];

const wrap7 = (n: number): number => ((n % 7) + 7) % 7;

export const CHOGHADIYA_CITATION: Citation = CITE.muhurtaChoghadiya;
export const HORA_CITATION: Citation = CITE.muhurtaHora;
export const MUHURTA_KALA_CITATION: Citation = CITE.muhurtaKala;

function split(t0: number, t1: number, n: number): Array<[number, number]> {
  const step = (t1 - t0) / n;
  return Array.from({ length: n }, (_, i) => [t0 + i * step, i === n - 1 ? t1 : t0 + (i + 1) * step]);
}

/**
 * Choghaḍiyā: the day (sunrise → sunset) and the night (sunset → next sunrise) each in eight equal
 * parts. Day: starts with the weekday lord's choghaḍiyā and steps +1 through the cycle. Night:
 * starts with the choghaḍiyā of the fifth weekday counted from this one (Ravivāra → Guru's Śubha)
 * and steps −2 (Śubha, Amṛta, Cara, Roga…).
 */
export function choghadiya(
  sunriseMs: number,
  sunsetMs: number,
  nextSunriseMs: number,
  weekday: Weekday,
): { day: Choghadiya[]; night: Choghadiya[] } {
  const dayStart = LORD_AT[weekday] ?? 0;
  const nightStart = LORD_AT[(weekday + 4) % 7] ?? 0;
  const mk = (r: [number, number], cycleAt: number, part: number, half: "day" | "night"): Choghadiya => {
    const name = CHOGHADIYA_CYCLE[wrap7(cycleAt)] ?? "Udvega";
    return { name, dev: CHOGHADIYA_DEV[name], quality: CHOGHADIYA_QUALITY[name], startMs: r[0], endMs: r[1], part, half };
  };
  return {
    day: split(sunriseMs, sunsetMs, 8).map((r, i) => mk(r, dayStart + i, i + 1, "day")),
    night: split(sunsetMs, nextSunriseMs, 8).map((r, i) => mk(r, nightStart - 2 * i, i + 1, "night")),
  };
}

/**
 * Horā: the day and the night each in twelve equal planetary hours. The first horā after sunrise
 * belongs to the weekday lord; each next horā steps one place in HORA_CYCLE, running on through the
 * night, so the 25th lands on the next weekday's lord.
 */
export function horas(sunriseMs: number, sunsetMs: number, nextSunriseMs: number, weekday: Weekday): { day: Hora[]; night: Hora[] } {
  const first = LORD_AT[weekday] ?? 0;
  const mk = (r: [number, number], n: number, half: "day" | "night"): Hora => ({
    lord: HORA_CYCLE[wrap7(first + n)] ?? "SU",
    startMs: r[0],
    endMs: r[1],
    part: (n % 12) + 1,
    half,
  });
  return {
    day: split(sunriseMs, sunsetMs, 12).map((r, i) => mk(r, i, "day")),
    night: split(sunsetMs, nextSunriseMs, 12).map((r, i) => mk(r, 12 + i, "night")),
  };
}

const MIN = 60_000;

/** Brahma-muhūrta: the 29th of the night's thirty muhūrtas, 96 to 48 minutes before sunrise, on
 *  the 48-minute muhūrta. */
export function brahmaMuhurta(sunriseMs: number): [number, number] {
  return [sunriseMs - 96 * MIN, sunriseMs - 48 * MIN];
}

/** Godhūli, the hour of cow-dust: one ghaṭī (24 minutes) centred on sunset. */
export function godhuli(sunsetMs: number): [number, number] {
  return [sunsetMs - 12 * MIN, sunsetMs + 12 * MIN];
}

/** The period of `list` containing `ms`, or −1. */
export function periodAt(list: ReadonlyArray<{ startMs: number; endMs: number }>, ms: number): number {
  return list.findIndex((p) => ms >= p.startMs && ms < p.endMs);
}
