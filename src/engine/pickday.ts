// Picking a good day (muhūrta): each civil day ahead is weighed for one kind of undertaking the way
// the muhūrta manuals do it (Muhūrta Cintāmaṇi and the printed pañcāṅgas that follow it), from five
// things and nothing else:
//   1. the lunar day (tithi) and its group: Nandā, Bhadrā, Jayā, Riktā, Pūrṇā;
//   2. the weekday (vāra);
//   3. the class of the star the Moon is in (dhruva, cara, ugra, miśra, kṣipra, mṛdu, tīkṣṇa);
//   4. for a person: Tārā-bala and Candra-bala, counted from the birth star and the birth Moon sign;
//   5. the flaws of the day: Vyatīpāta and Vaidhṛti yoga, and Viṣṭi (Bhadrā) karaṇa.
// Not weighed, and the screen says so: the rising sign of the chosen moment (lagna-śuddhi), the
// direction of travel (dik-śūla), the lunar month, and the rest of the person's chart.
// Pure and deterministic: every function takes explicit instants and nothing reads the clock.
import { DateTime } from "luxon";
import { NAKSHATRA_NAMES, VARA_NAMES } from "../data/tables/names";
import { CITE } from "./citations";
import type { Forecast } from "./forecast";
import { chandraBala, moonTransitAt, taraBala } from "./gochar";
import { horas } from "./muhurta";
import { angasAt, computePanchang } from "./panchang";
import { safeZone } from "./time";
import type { Citation, EnginePreset, GrahaId, Patri, SignIdx } from "./types";

const DAY = 86_400_000;
const HALF_DAY = DAY / 2;

/** The app's one scale of words: bright = Strong, steady = Good, mixed = Mixed, testing = Go gently. */
export type PickTone = Forecast["tone"];

export const PICK_CITATION: Citation = CITE.muhurtaDayChoice;

// ─── what a person may want to do ───────────────────────────────────────────

export type ActivityId = "new" | "travel" | "talk" | "study" | "home" | "buy" | "celebrate" | "creative";

export interface Activity {
  id: ActivityId;
  /** On a chip: "Start something new". */
  label: string;
  /** After "Best day …": "to start something new". */
  phrase: string;
}

export const ACTIVITIES: readonly Activity[] = [
  { id: "new", label: "Start something new", phrase: "to start something new" },
  { id: "travel", label: "Travel", phrase: "to travel" },
  { id: "talk", label: "An important talk", phrase: "for an important talk or meeting" },
  { id: "study", label: "Begin a course", phrase: "to begin study or a course" },
  { id: "home", label: "Move home", phrase: "to move home or hold a housewarming" },
  { id: "buy", label: "Buy for the home", phrase: "to buy something for the home" },
  { id: "celebrate", label: "A celebration", phrase: "for a celebration or family event" },
  { id: "creative", label: "Creative work", phrase: "for creative work" },
];

export const activityOf = (id: string | null | undefined): Activity => ACTIVITIES.find((a) => a.id === id) ?? (ACTIVITIES[0] as Activity);

// ─── 1. the lunar day ───────────────────────────────────────────────────────

/**
 * The five tithi groups, by the tithi's number within its fortnight (Muhūrta Cintāmaṇi,
 * śubhāśubha-prakaraṇa): Nandā 1, 6, 11 · Bhadrā 2, 7, 12 · Jayā 3, 8, 13 · Riktā 4, 9, 14 ·
 * Pūrṇā 5, 10, 15. Riktā ("empty") is set aside for every auspicious beginning; so is Amāvasyā,
 * the dark fifteenth, although it falls in the Pūrṇā place.
 */
export type TithiGroup = "nanda" | "bhadra" | "jaya" | "rikta" | "purna";
const TITHI_GROUPS: readonly TithiGroup[] = ["nanda", "bhadra", "jaya", "rikta", "purna"];
export const TITHI_GROUP_NAME: Record<TithiGroup, string> = {
  nanda: "Nandā",
  bhadra: "Bhadrā",
  jaya: "Jayā",
  rikta: "Riktā",
  purna: "Pūrṇā",
};
const TITHI_GROUP_WORD: Record<TithiGroup, string> = {
  nanda: "joy",
  bhadra: "good fortune",
  jaya: "success",
  rikta: "empty",
  purna: "full",
};

/** The group of a tithi 1..30. */
export function tithiGroupOf(tithiIndex: number): TithiGroup {
  const inFortnight = ((((tithiIndex - 1) % 15) + 15) % 15) + 1; // 1..15
  return TITHI_GROUPS[(inFortnight - 1) % 5] as TithiGroup;
}

/**
 * How well each group suits each undertaking, −1 … +1. The lists the manuals give per undertaking
 * (travel 2, 3, 5, 7, 10, 11, 13; entering a house 2, 3, 5, 7, 10, 11, 12, 13; beginning study
 * 2, 3, 5, 6, 10, 11, 12) all reduce to: Bhadrā and Pūrṇā first, Nandā and Jayā acceptable, Riktā
 * never. Nandā leads for joyful and artistic things, Jayā for a contest of words.
 */
const TITHI_FIT: Record<ActivityId, Record<TithiGroup, number>> = {
  new: { nanda: 0.5, bhadra: 1, jaya: 0.5, rikta: -1, purna: 1 },
  travel: { nanda: 0.5, bhadra: 1, jaya: 1, rikta: -1, purna: 1 },
  talk: { nanda: 0.5, bhadra: 0.5, jaya: 1, rikta: -1, purna: 1 },
  study: { nanda: 0.5, bhadra: 1, jaya: 0.5, rikta: -1, purna: 1 },
  home: { nanda: 0.5, bhadra: 1, jaya: 0.5, rikta: -1, purna: 1 },
  buy: { nanda: 0.5, bhadra: 1, jaya: 0.5, rikta: -1, purna: 1 },
  celebrate: { nanda: 1, bhadra: 0.5, jaya: 0.5, rikta: -1, purna: 1 },
  creative: { nanda: 1, bhadra: 0.5, jaya: 0.5, rikta: -1, purna: 0.5 },
};

// ─── 2. the weekday ─────────────────────────────────────────────────────────

/**
 * Weekday fit, index 0 = Sunday, −1 … +1. The days of the gentle grahas (Monday, Wednesday,
 * Thursday, Friday) are the śubha-vāras for beginnings; Tuesday and Saturday, the days of Maṅgala
 * and Śani, are set aside for them; Sunday is middling. Per undertaking the manuals lean further:
 * Thursday and Wednesday for learning, Friday for celebration and the arts, Saturday tolerated for
 * entering a house (a fixed, lasting thing) while Sunday is not.
 */
const WEEKDAY_FIT: Record<ActivityId, readonly number[]> = {
  //         Sun   Mon  Tue  Wed  Thu  Fri  Sat
  new: [0, 1, -1, 1, 1, 1, -1],
  travel: [0, 1, -1, 1, 1, 1, -1],
  talk: [0.5, 0.5, -1, 1, 1, 1, -1],
  study: [0.5, 0.5, -1, 1, 1, 1, -1],
  home: [-1, 1, -1, 1, 1, 1, 0],
  buy: [0, 1, -1, 1, 1, 1, -1],
  celebrate: [0.5, 1, -1, 1, 1, 1, -1],
  creative: [0.5, 1, -0.5, 1, 0.5, 1, -0.5],
};
const WEEKDAY_ENGLISH = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

// ─── 3. the class of the day's star ─────────────────────────────────────────

/**
 * The seven classes of the 27 nakṣatras (Muhūrta Cintāmaṇi, nakṣatra-prakaraṇa), index 0 = Aśvinī:
 *   dhruva / sthira (fixed):  Rohiṇī, Uttara Phalgunī, Uttara Āṣāḍhā, Uttara Bhādrapadā
 *   cara (movable):           Punarvasu, Svātī, Śravaṇa, Dhaniṣṭhā, Śatabhiṣā
 *   ugra / krūra (fierce):    Bharaṇī, Maghā, Pūrva Phalgunī, Pūrva Āṣāḍhā, Pūrva Bhādrapadā
 *   miśra (mixed):            Kṛttikā, Viśākhā
 *   kṣipra / laghu (swift):   Aśvinī, Puṣya, Hasta
 *   mṛdu (soft):              Mṛgaśīrṣa, Citrā, Anurādhā, Revatī
 *   tīkṣṇa / dāruṇa (sharp):  Ārdrā, Āśleṣā, Jyeṣṭhā, Mūla
 */
export type StarClass = "fixed" | "movable" | "fierce" | "mixed" | "swift" | "soft" | "sharp";
const STAR_CLASS: readonly StarClass[] = [
  "swift", // Aśvinī
  "fierce", // Bharaṇī
  "mixed", // Kṛttikā
  "fixed", // Rohiṇī
  "soft", // Mṛgaśīrṣa
  "sharp", // Ārdrā
  "movable", // Punarvasu
  "swift", // Puṣya
  "sharp", // Āśleṣā
  "fierce", // Maghā
  "fierce", // Pūrva Phalgunī
  "fixed", // Uttara Phalgunī
  "swift", // Hasta
  "soft", // Citrā
  "movable", // Svātī
  "mixed", // Viśākhā
  "soft", // Anurādhā
  "sharp", // Jyeṣṭhā
  "sharp", // Mūla
  "fierce", // Pūrva Āṣāḍhā
  "fixed", // Uttara Āṣāḍhā
  "movable", // Śravaṇa
  "movable", // Dhaniṣṭhā
  "movable", // Śatabhiṣā
  "fierce", // Pūrva Bhādrapadā
  "fixed", // Uttara Bhādrapadā
  "soft", // Revatī
];
export const starClassOf = (nakshatra: number): StarClass => STAR_CLASS[((nakshatra % 27) + 27) % 27] as StarClass;

export const STAR_CLASS_NAME: Record<StarClass, string> = {
  fixed: "Dhruva",
  movable: "Cara",
  fierce: "Ugra",
  mixed: "Miśra",
  swift: "Kṣipra",
  soft: "Mṛdu",
  sharp: "Tīkṣṇa",
};
const STAR_FOR: Record<StarClass, string> = {
  fixed: "a steady star, good for what is meant to last",
  movable: "a moving star, good for journeys and change",
  swift: "a light, quick star, good for starting, learning and errands",
  soft: "a gentle star, good for friendship, art and gatherings",
  mixed: "a mixed star",
  fierce: "a fierce star",
  sharp: "a sharp star",
};
const STAR_AGAINST: Record<StarClass, string> = {
  fixed: "a steady star, which suits staying more than going",
  movable: "a moving star, which suits going more than settling",
  swift: "a light, quick star, better for short tasks than for this",
  soft: "a gentle star, better for quiet things than for this",
  mixed: "a mixed star, which tradition keeps for routine work",
  fierce: "a fierce star, which tradition keeps for hard tasks, not glad beginnings",
  sharp: "a sharp star, which tradition keeps for hard tasks, not glad beginnings",
};

/**
 * What each class is for, per undertaking, −1 … +1. From the uses the text gives each class: fixed
 * stars for houses, foundations and lasting things; movable for journeys and vehicles; swift for
 * trade, learning and setting out; soft for friendship, the arts, new clothes and festivity; the
 * fierce and the sharp for harsh work only; the mixed for everyday work. Entering a house wants a
 * fixed or a soft star; a journey wants a movable or swift one and not a fixed one.
 */
const STAR_FIT: Record<ActivityId, Record<StarClass, number>> = {
  new: { swift: 1, fixed: 1, soft: 0.5, movable: 0.5, mixed: -0.25, fierce: -1, sharp: -1 },
  travel: { movable: 1, swift: 1, soft: 0.5, fixed: -0.25, mixed: -0.25, fierce: -1, sharp: -1 },
  talk: { soft: 1, swift: 1, fixed: 0.5, movable: 0.5, mixed: 0, fierce: -1, sharp: -1 },
  study: { swift: 1, soft: 1, movable: 0.5, fixed: 0.5, mixed: -0.25, fierce: -1, sharp: -1 },
  home: { fixed: 1, soft: 1, swift: 0.25, movable: -0.25, mixed: -0.5, fierce: -1, sharp: -1 },
  buy: { swift: 1, movable: 1, soft: 0.5, fixed: 0.5, mixed: -0.25, fierce: -1, sharp: -1 },
  celebrate: { soft: 1, fixed: 1, swift: 0.5, movable: 0.5, mixed: -0.25, fierce: -1, sharp: -1 },
  creative: { soft: 1, swift: 0.5, movable: 0.5, fixed: 0.5, mixed: 0, fierce: -0.5, sharp: -0.5 },
};

// ─── 4. the person ──────────────────────────────────────────────────────────

/** The two things of a birth chart a day is counted from. */
export interface PickPerson {
  /** Birth star, 0..26 (Aśvinī = 0): `patri.grahas.MO.nakshatra`. */
  nakshatra: number;
  /** Birth Moon sign, 0..11 (Meṣa = 0): `patri.grahas.MO.sign`. */
  sign: SignIdx;
}
export const personOf = (patri: Patri): PickPerson => ({ nakshatra: patri.grahas.MO.nakshatra, sign: patri.grahas.MO.sign });

/** Tārā-bala: the 3rd, 5th and 7th tārās (Vipat, Pratyari, Vadha) are set aside. */
export const TARA_SET_ASIDE: readonly number[] = [3, 5, 7];
/**
 * Candra-bala, the same list the rest of the app uses (gochar.ts): the day's Moon in the 1st, 3rd,
 * 6th, 7th, 10th or 11th sign from the birth Moon sign counts for the day; the 4th, 8th and 12th
 * are set aside; the 2nd, 5th and 9th are neutral.
 */
export const CANDRA_SET_ASIDE: readonly number[] = [4, 8, 12];
const CANDRA_GOOD: readonly number[] = [1, 3, 6, 7, 10, 11];

// ─── 5. the flaws of the day ────────────────────────────────────────────────

/** Vyatīpāta (17th) and Vaidhṛti (27th): the two yogas avoided whole for auspicious work. */
const BAD_YOGAS: readonly number[] = [17, 27];
/** Viṣṭi (Bhadrā) is the seventh movable karaṇa: half-tithis 8, 15, 22 … 57. */
export const isVishti = (karanaIndex: number): boolean => karanaIndex >= 2 && karanaIndex <= 57 && (karanaIndex - 2) % 7 === 6;

// ─── the sky of one civil day (the same for every undertaking and person) ───

export interface DaySky {
  /** Local midnight that opens the civil day, in the reader's zone. */
  startMs: number;
  /** The instant the day is read at: local noon, as the forecast and the home screen read a day. */
  noonMs: number;
  /** 0 = Sunday. */
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  tithi: { index: number; name: string; group: TithiGroup; newMoon: boolean };
  star: { index: number; name: string; cls: StarClass };
  /** The Moon's sign at noon, 0..11. */
  moonSign: SignIdx;
  /** Vyatīpāta or Vaidhṛti in force at sunrise or noon, else null. */
  badYoga: string | null;
  /** Viṣṭi karaṇa: in force at noon, in some other part of the daylight, or not at all. */
  vishti: "noon" | "part" | null;
  sunriseMs: number;
  sunsetMs: number;
  nextSunriseMs: number;
  rahuKaal: [number, number];
  abhijit: [number, number] | null;
}

/** The sky of the civil day that starts at `startMs`, or null where the day cannot be read. */
export function daySky(startMs: number, place: { lat: number; lon: number }, preset: EnginePreset): DaySky | null {
  const noonMs = startMs + HALF_DAY;
  try {
    const p = computePanchang(noonMs, place, preset);
    const rise = angasAt(p.sunriseMs, preset.ayanamsa);
    const set = angasAt(p.sunsetMs, preset.ayanamsa);
    // every karaṇa touched between sunrise and sunset (at most three; the count wraps 60 → 1)
    let part = false;
    for (let k = rise.karana.index, n = 0; n < 4; k = (k % 60) + 1, n++) {
      if (isVishti(k)) part = true;
      if (k === set.karana.index) break;
    }
    const yoga = BAD_YOGAS.includes(p.yoga.index) ? p.yoga.name : BAD_YOGAS.includes(rise.yoga.index) ? rise.yoga.name : null;
    return {
      startMs,
      noonMs,
      weekday: p.vara.index,
      tithi: { index: p.tithi.index, name: p.tithi.name, group: tithiGroupOf(p.tithi.index), newMoon: p.tithi.index === 30 },
      star: { index: p.nakshatra.index, name: NAKSHATRA_NAMES[p.nakshatra.index] ?? p.nakshatra.name, cls: starClassOf(p.nakshatra.index) },
      moonSign: moonTransitAt(noonMs, preset).sign,
      badYoga: yoga,
      vishti: isVishti(p.karana.index) ? "noon" : part ? "part" : null,
      sunriseMs: p.sunriseMs,
      sunsetMs: p.sunsetMs,
      nextSunriseMs: p.nextSunriseMs,
      rahuKaal: p.rahuKaal,
      abhijit: p.abhijit,
    };
  } catch {
    return null;
  }
}

/** The local midnight that opens the civil day containing `atMs`. */
function startOfDay(atMs: number, zone: string): number {
  const dt = DateTime.fromMillis(atMs, { zone }).startOf("day");
  return dt.isValid ? dt.toMillis() : Math.floor(atMs / DAY) * DAY;
}

/**
 * The skies of `days` civil days, starting with the day that contains `fromMs` in `zone`. Days are
 * walked on the calendar (a clock change makes one of them 23 or 25 hours).
 */
export function daySkies(fromMs: number, days: number, place: { lat: number; lon: number }, zone: string, preset: EnginePreset): DaySky[] {
  const z = safeZone(zone);
  const out: DaySky[] = [];
  let ms = startOfDay(fromMs, z);
  for (let i = 0; i < days; i++) {
    const sky = daySky(ms, place, preset);
    if (sky) out.push(sky);
    const next = DateTime.fromMillis(ms, { zone: z }).plus({ days: 1 }).startOf("day");
    ms = next.isValid ? next.toMillis() : ms + DAY;
  }
  return out;
}

// ─── the verdict on a day ───────────────────────────────────────────────────

export type PickFactor = "tithi" | "weekday" | "star" | "tara" | "candra" | "yoga" | "karana";

export interface PickReason {
  factor: PickFactor;
  /** Plain English, one sentence. */
  text: string;
  /** The Sanskrit term behind it, for the small second line. */
  term: string;
  /** True when this alone is something tradition sets the day aside for. */
  setAside?: boolean;
}

export interface PickWindow {
  startMs: number;
  endMs: number;
  /** A planetary hour that suits the undertaking, or Abhijit, the midday muhūrta. */
  kind: "hora" | "abhijit";
  lord?: GrahaId;
}

export interface PickDay {
  startMs: number;
  noonMs: number;
  activity: ActivityId;
  /** 0 … 1. */
  score: number;
  tone: PickTone;
  /** What speaks for the day and against it, the weightiest first. */
  for: PickReason[];
  against: PickReason[];
  /** True when at least one of the reasons against is a classical exclusion. Such a day never reads "Strong". */
  setAside: boolean;
  /** The best stretch of daylight inside the day, when there is one. */
  window: PickWindow | null;
  /** Counted for a person only. */
  tara: number | null;
  candraHouse: number | null;
  personal: boolean;
  sky: DaySky;
}

/** Share of each factor in the score. Without a person the first three are re-weighed to one. */
const WEIGHT = { star: 0.3, tithi: 0.22, weekday: 0.18, tara: 0.15, candra: 0.15 } as const;
/** Taken off the 0 … 1 score for a flaw of the day. */
const FLAW = { yoga: 0.12, vishtiNoon: 0.12, vishtiPart: 0.05 } as const;
/** A day with a classical exclusion in it is held under "Strong" (0.675). */
const SET_ASIDE_CAP = 0.64;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const ord = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};

/** The same thresholds as the forecast's tone, on the 0 … 1 scale. */
export function pickTone(score: number): PickTone {
  const s = score * 2 - 1;
  return s >= 0.35 ? "bright" : s >= 0 ? "steady" : s >= -0.35 ? "mixed" : "testing";
}

/** The planetary hours that suit each undertaking (the hour of the graha that stands for it). */
const HORA_FOR: Record<ActivityId, readonly GrahaId[]> = {
  new: ["JU", "ME", "VE"],
  travel: ["ME", "MO", "VE"],
  talk: ["ME", "JU"],
  study: ["ME", "JU"],
  home: ["VE", "MO", "JU"],
  buy: ["VE", "ME"],
  celebrate: ["VE", "JU", "MO"],
  creative: ["VE", "MO", "ME"],
};

/**
 * The best stretch of daylight: the first planetary hour of a graha that suits the undertaking and
 * lies clear of Rāhu Kāla; failing that Abhijit, the midday muhūrta (not kept on Wednesdays).
 */
export function bestWindow(sky: DaySky, activity: ActivityId): PickWindow | null {
  const [r0, r1] = sky.rahuKaal;
  const clear = (a: number, b: number) => b <= r0 || a >= r1;
  const lords = HORA_FOR[activity];
  const h = horas(sky.sunriseMs, sky.sunsetMs, sky.nextSunriseMs, sky.weekday).day.find(
    (x) => lords.includes(x.lord) && clear(x.startMs, x.endMs),
  );
  if (h) return { startMs: h.startMs, endMs: h.endMs, kind: "hora", lord: h.lord };
  if (sky.abhijit && clear(sky.abhijit[0], sky.abhijit[1])) return { startMs: sky.abhijit[0], endMs: sky.abhijit[1], kind: "abhijit" };
  return null;
}

/** Weigh one day for one undertaking, for a person or (person = null) for anyone. */
export function scoreDay(sky: DaySky, activity: ActivityId, person: PickPerson | null): PickDay {
  type Item = { reason: PickReason; side: "for" | "against"; weight: number };
  const items: Item[] = [];
  const add = (side: "for" | "against", weight: number, reason: PickReason) => items.push({ side, weight, reason });
  let num = 0;
  let den = 0;
  const part = (w: number, v: number) => {
    num += w * v;
    den += w;
  };

  // 1. lunar day
  const g = sky.tithi.group;
  const tithiV = sky.tithi.newMoon ? -1 : TITHI_FIT[activity][g];
  part(WEIGHT.tithi, tithiV);
  if (sky.tithi.newMoon)
    add("against", WEIGHT.tithi, {
      factor: "tithi",
      text: "It is the new Moon, which tradition sets aside for beginnings.",
      term: "Amāvasyā",
      setAside: true,
    });
  else if (g === "rikta")
    add("against", WEIGHT.tithi, {
      factor: "tithi",
      text: 'The lunar day is one of the "empty" days, which tradition sets aside for beginnings.',
      term: `Riktā tithi · ${sky.tithi.name}`,
      setAside: true,
    });
  else
    add("for", WEIGHT.tithi * tithiV, {
      factor: "tithi",
      text: `The lunar day is one of the "${TITHI_GROUP_WORD[g]}" days, ${tithiV >= 1 ? "well suited to this" : "fair for this"}.`,
      term: `${TITHI_GROUP_NAME[g]} tithi · ${sky.tithi.name}`,
    });

  // 2. weekday
  const wdV = WEEKDAY_FIT[activity][sky.weekday] ?? 0;
  const wd = WEEKDAY_ENGLISH[sky.weekday];
  part(WEIGHT.weekday, wdV);
  if (wdV > 0)
    add("for", WEIGHT.weekday * wdV, {
      factor: "weekday",
      text: `${wd} is a weekday tradition ${wdV >= 1 ? "favours" : "accepts"} for this.`,
      term: VARA_NAMES[sky.weekday],
    });
  else if (wdV < 0)
    add("against", WEIGHT.weekday * -wdV, {
      factor: "weekday",
      text: `${wd} is a weekday tradition sets aside for this.`,
      term: VARA_NAMES[sky.weekday],
    });

  // 3. the class of the day's star
  const cls = sky.star.cls;
  const starV = STAR_FIT[activity][cls];
  part(WEIGHT.star, starV);
  const starTerm = `${STAR_CLASS_NAME[cls]} nakṣatra · ${sky.star.name}`;
  if (starV >= 0.5) add("for", WEIGHT.star * starV, { factor: "star", text: `The Moon is in ${STAR_FOR[cls]}.`, term: starTerm });
  else if (starV < 0)
    add("against", WEIGHT.star * -starV, {
      factor: "star",
      text: `The Moon is in ${STAR_AGAINST[cls]}.`,
      term: starTerm,
      ...(starV <= -1 ? { setAside: true } : {}),
    });

  // 4. the person: Tārā-bala and Candra-bala
  let tara: number | null = null;
  let candraHouse: number | null = null;
  if (person) {
    const tb = taraBala(person.nakshatra, sky.star.index);
    tara = tb.tara;
    const taraV = TARA_SET_ASIDE.includes(tb.tara) ? -1 : tb.tara === 1 ? 0 : 1;
    part(WEIGHT.tara, taraV);
    const taraTerm = `${tb.name} tārā (${ord(tb.tara)})`;
    if (taraV > 0)
      add("for", WEIGHT.tara, { factor: "tara", text: "Counted from your birth star, the day's star is a kind one.", term: taraTerm });
    else if (taraV < 0)
      add("against", WEIGHT.tara, {
        factor: "tara",
        text: "Counted from your birth star, the day's star is one of the three tradition sets aside.",
        term: taraTerm,
        setAside: true,
      });

    const cb = chandraBala(person.sign, sky.moonSign);
    candraHouse = cb.house;
    const candraV = CANDRA_SET_ASIDE.includes(cb.house) ? -1 : CANDRA_GOOD.includes(cb.house) ? 1 : 0;
    part(WEIGHT.candra, candraV);
    const candraTerm = `Candra-bala · ${ord(cb.house)} from your Moon sign`;
    if (candraV > 0)
      add("for", WEIGHT.candra, {
        factor: "candra",
        text: "The Moon is in a supportive sign counted from your birth Moon sign.",
        term: candraTerm,
      });
    else if (candraV < 0)
      add("against", WEIGHT.candra, {
        factor: "candra",
        text: `The Moon is in the ${ord(cb.house)} sign from your birth Moon sign, which tradition sets aside.`,
        term: candraTerm,
        setAside: true,
      });
  }

  // 5. the flaws of the day
  let score = (num / den + 1) / 2;
  if (sky.badYoga) {
    score -= FLAW.yoga;
    add("against", FLAW.yoga * 2, {
      factor: "yoga",
      text: "The Sun and Moon stand in a combination tradition avoids for beginnings.",
      term: `${sky.badYoga} yoga`,
      setAside: true,
    });
  }
  if (sky.vishti === "noon") {
    score -= FLAW.vishtiNoon;
    add("against", FLAW.vishtiNoon * 2, {
      factor: "karana",
      text: "The middle of the day falls in a half lunar day tradition avoids for beginnings.",
      term: "Viṣṭi karaṇa (Bhadrā)",
      setAside: true,
    });
  } else if (sky.vishti === "part") {
    score -= FLAW.vishtiPart;
    add("against", FLAW.vishtiPart * 2, {
      factor: "karana",
      text: "Part of the daylight falls in a half lunar day tradition avoids for beginnings.",
      term: "Viṣṭi karaṇa (Bhadrā)",
    });
  }

  const setAside = items.some((i) => i.side === "against" && i.reason.setAside === true);
  score = clamp01(setAside ? Math.min(score, SET_ASIDE_CAP) : score);
  const side = (s: "for" | "against") =>
    items
      .filter((i) => i.side === s)
      .sort((a, b) => b.weight - a.weight)
      .map((i) => i.reason);

  return {
    startMs: sky.startMs,
    noonMs: sky.noonMs,
    activity,
    score,
    tone: pickTone(score),
    for: side("for"),
    against: side("against"),
    setAside,
    window: bestWindow(sky, activity),
    tara,
    candraHouse,
    personal: person !== null,
    sky,
  };
}

export interface PickOptions {
  activity: ActivityId;
  /** Any instant of the first day (usually now). */
  fromMs: number;
  /** How many civil days, the first included. Default 45. */
  days?: number;
  place: { lat: number; lon: number };
  zone: string;
  preset: EnginePreset;
  /** Null for a general ranking that counts nothing from a birth chart. */
  person: PickPerson | null;
}

/** Every day of the range, in date order, weighed for the undertaking. */
export function pickDays(o: PickOptions): PickDay[] {
  return daySkies(o.fromMs, o.days ?? 45, o.place, o.zone, o.preset).map((s) => scoreDay(s, o.activity, o.person));
}

/** Scores within a twentieth of each other count as equal when ranking. */
const rankStep = (score: number) => Math.round(score * 20);

/**
 * The days ranked best first. Days whose scores are within a twentieth of each other count as
 * equally good, and of those the sooner comes first: nobody should wait six weeks for a hair.
 */
export function rankDays(days: readonly PickDay[]): PickDay[] {
  return [...days].sort((x, y) => rankStep(y.score) - rankStep(x.score) || x.startMs - y.startMs);
}

/**
 * For a one-line teaser: the first day of the range tradition would call Strong for the
 * undertaking, else the best of the range; null when no day could be read.
 */
export function nextGoodDay(o: PickOptions): PickDay | null {
  const days = pickDays({ ...o, days: o.days ?? 14 });
  return days.find((d) => d.tone === "bright") ?? rankDays(days)[0] ?? null;
}
