// Festivals and fasts: the Hindu festival calendar, worked out from the real Moon and Sun for a
// place. A lunar festival is "this tithi of this amānta month, on the day it covers this part of
// the day"; the month comes from the new moons and the sidereal Sun (so a leap month is known and
// skipped), the tithi from the Moon − Sun angle, the part of the day from the place's own sunrise,
// sunset and moonrise. Nothing is looked up from a table of dates.
import * as A from "astronomy-engine";
import { DateTime } from "luxon";
import { MASA_NAMES, ORDINAL, SIGN_NAMES, SIGN_WESTERN, TITHI_NAMES } from "../data/tables/names";
import { ayanamsa } from "./ayanamsa";
import { sankrantisBetween } from "./calendar";
import { astroTime } from "./ephemeris";
import { norm360 } from "./math";
import { signOf } from "./nakshatra";
import { masaIndexFromSunSign, solveCrossing } from "./panchang";
import { type GeoPoint, hinduDay, moonEvent, observerOf, sunEvent } from "./sunrise";
import { formatClock12, safeZone } from "./time";
import type { AyanamsaPreset, EnginePreset } from "./types";

const DAY = 86_400_000;
const HOUR = 3_600_000;

export type FestivalKind = "festival" | "fast" | "solar" | "eclipse";

export interface Festival {
  /** What it is: "diwali", "ekadashi", "sankranti", "lunar-eclipse". */
  id: string;
  /** Unique for this occurrence: `${id}@2026-11-08`. */
  key: string;
  /** Plain English. */
  name: string;
  /** The Sanskrit or regional name, for the small second line. */
  sanskrit: string;
  /** Local midnight that opens the civil day at the place. */
  dateMs: number;
  kind: FestivalKind;
  /** One plain sentence on what it is. */
  note: string;
  /** How the day was chosen, in plain words, with the real instants for this place. */
  rule: string;
  /** The exact instant, for a saṅkrānti or an eclipse. */
  atMs?: number;
  /** Moon − Sun angle at local noon of the day (0 new, 180 full), for a true picture of the Moon. */
  elongation: number;
}

// ─── the lunar months ───────────────────────────────────────────────────────

const elongAt = (ms: number): number => {
  const t = astroTime(ms);
  return norm360(A.EclipticGeoMoon(t).lon - A.SunPosition(t).elon);
};

const sunSignAt = (ms: number, ap: AyanamsaPreset): number => {
  const t = astroTime(ms);
  return signOf(A.SunPosition(t).elon - ayanamsa(t.tt + 2451545.0, ap));
};

export interface LunarMonth {
  /** The new moon that opens the month (amānta). */
  startMs: number;
  /** The new moon that closes it. */
  endMs: number;
  /** 0 = Caitra … 11 = Phālguna. */
  masa: number;
  /** A leap month: no saṅkrānti falls in it, and it takes the name of the month that follows. */
  adhika: boolean;
  /** Two saṅkrāntis fall in it (a lost month; none between 1983 and 2123). */
  kshaya: boolean;
}

/** Every amānta lunar month that touches [fromMs, toMs]. */
export function lunarMonthsBetween(fromMs: number, toMs: number, ap: AyanamsaPreset): LunarMonth[] {
  const seed = A.SearchMoonPhase(0, astroTime(fromMs - 31 * DAY), 40);
  if (!seed) return [];
  const g = seed.date.getTime();
  // Refined on the engine's own apparent longitudes, so month ends and tithi ends agree to the second.
  const moons = [solveCrossing(elongAt, 0, g - 2 * HOUR, g + 2 * HOUR)];
  for (let guard = 0; guard < 400; guard++) {
    const last = moons[moons.length - 1] ?? g;
    if (last > toMs) break;
    moons.push(solveCrossing(elongAt, 0, last + 29 * DAY, last + 30 * DAY));
  }
  const signs = moons.map((m) => sunSignAt(m, ap));
  const out: LunarMonth[] = [];
  for (let i = 0; i + 1 < moons.length; i++) {
    const startMs = moons[i] ?? 0;
    const endMs = moons[i + 1] ?? 0;
    if (endMs < fromMs) continue;
    const s0 = signs[i] ?? 0;
    const step = ((signs[i + 1] ?? 0) - s0 + 12) % 12;
    out.push({ startMs, endMs, masa: masaIndexFromSunSign(s0), adhika: step === 0, kshaya: step === 2 });
  }
  return out;
}

/** The 31 instants that bound the 30 tithis of a lunar month: b[k − 1] opens tithi k, b[k] closes it. */
function tithiBounds(m: LunarMonth): number[] {
  const b = [m.startMs];
  const len = m.endMs - m.startMs;
  for (let k = 1; k < 30; k++) {
    // The Moon's uneven speed moves a tithi's end many hours from the even share; ±36 h (±18°) always
    // brackets it, and holds one crossing only.
    const guess = m.startMs + (k * len) / 30;
    b.push(solveCrossing(elongAt, k * 12, Math.max(m.startMs, guess - 36 * HOUR), Math.min(m.endMs, guess + 36 * HOUR)));
  }
  b.push(m.endMs);
  return b;
}

// ─── the days at the place ──────────────────────────────────────────────────

interface DayInfo {
  midnight: number;
  rise: number;
  set: number;
}

type Rule =
  | "udaya" // running at sunrise
  | "udaya3" // running at sunrise and for three muhūrtas after it
  | "purvahna" // the forenoon: sunrise to midday
  | "madhyahna" // the middle fifth of the daylight
  | "aparahna" // the fourth fifth of the daylight
  | "sunset"
  | "pradosha" // the first fifth of the night
  | "nishitha" // the middle muhūrta (fifteenth) of the night
  | "arunodaya" // the 96 minutes before sunrise
  | "moonrise"
  | "holika"; // dusk, clear of Bhadrā (see holikaDay)

class Place {
  private readonly days = new Map<number, DayInfo>();
  private readonly moonrises = new Map<number, number | null>();
  private readonly obs: A.Observer;
  constructor(
    place: GeoPoint,
    readonly zone: string,
    private readonly preset: EnginePreset,
  ) {
    this.obs = observerOf(place);
  }

  /** The civil date of an instant, as whole days since 1970-01-01. */
  dayNo(ms: number): number {
    const d = DateTime.fromMillis(ms, { zone: this.zone });
    return Math.round(Date.UTC(d.year, d.month - 1, d.day) / DAY);
  }

  midnight(n: number): number {
    const u = new Date(n * DAY);
    return DateTime.fromObject(
      { year: u.getUTCFullYear(), month: u.getUTCMonth() + 1, day: u.getUTCDate() },
      { zone: this.zone },
    ).toMillis();
  }

  day(n: number): DayInfo {
    let d = this.days.get(n);
    if (!d) {
      const midnight = this.midnight(n);
      const mode = this.preset.sunrise;
      const r = sunEvent(this.obs, 1, midnight, 1, mode);
      const s = r === null ? null : sunEvent(this.obs, -1, r, 1, mode);
      if (r !== null && s !== null && r < midnight + 26 * HOUR) d = { midnight, rise: r, set: s };
      else {
        // Midnight sun or polar night: the engine's stand-in day, local apparent noon ± 6 h.
        const h = hinduDay(this.obs, midnight + 12 * HOUR, mode);
        d = { midnight, rise: h.sunriseMs, set: h.sunsetMs };
      }
      this.days.set(n, d);
    }
    return d;
  }

  moonrise(n: number): number | null {
    let m = this.moonrises.get(n);
    if (m === undefined) {
      const rise = this.day(n).rise;
      m = moonEvent(this.obs, 1, rise, (this.day(n + 1).rise - rise) / DAY);
      this.moonrises.set(n, m);
    }
    return m;
  }

  /** The stretch of day `n` a rule looks at; a single instant has a === b. Null when it does not occur. */
  window(rule: Rule, n: number): [number, number] | null {
    const d = this.day(n);
    const light = d.set - d.rise;
    const night = this.day(n + 1).rise - d.set;
    switch (rule) {
      case "udaya":
      case "udaya3":
        return [d.rise, d.rise];
      case "sunset":
        return [d.set, d.set];
      case "moonrise": {
        const m = this.moonrise(n);
        return m === null ? null : [m, m];
      }
      case "purvahna":
        return [d.rise, d.rise + light / 2];
      case "madhyahna":
        return [d.rise + (2 * light) / 5, d.rise + (3 * light) / 5];
      case "aparahna":
        return [d.rise + (3 * light) / 5, d.rise + (4 * light) / 5];
      case "pradosha":
      case "holika":
        return [d.set, d.set + night / 5];
      case "nishitha":
        return [d.set + night / 2 - night / 30, d.set + night / 2 + night / 30];
      case "arunodaya":
        return [d.rise - 96 * 60_000, d.rise];
    }
  }

  /** How much of [ts, te) falls in the rule's window on day `n` (ms; 1 for an instant inside it). */
  share(rule: Rule, n: number, ts: number, te: number): number {
    const w = this.window(rule, n);
    if (!w) return 0;
    if (w[0] === w[1]) return ts <= w[0] && w[0] < te ? 1 : 0;
    return Math.max(0, Math.min(te, w[1]) - Math.max(ts, w[0]));
  }
}

/** Which day is kept when the tithi touches the rule's part of the day on two days. */
type Two =
  | "longer" // the day with the longer share
  | "first" // the first day (with at least a ghaṭī, 24 minutes, of it)
  | "second" // the second day (with at least a ghaṭī of it)
  | "second3"; // the second day if the tithi outlasts its sunrise by three muhūrtas, else the first
const GHATI = 24 * 60_000;

type Outcome =
  | "one"
  | "longer"
  | "first"
  | "two-first"
  | "two-second"
  | "two-second3"
  | "two-first3"
  | "sunrise"
  | "begins"
  | "short"
  | "holika-second"
  | "holika-late"
  | "holika-bhadra";

interface Pick {
  n: number;
  outcome: Outcome;
}

/** The day a tithi [ts, te) holds at sunrise: the first such day, else (a tithi that begins and ends
 *  between two sunrises) the day it begins in. */
function udayaDay(p: Place, ts: number, te: number): Pick {
  const n0 = p.dayNo(ts) - 1;
  const n1 = p.dayNo(te) + 1;
  const hits: number[] = [];
  for (let n = n0; n <= n1; n++) if (p.share("udaya", n, ts, te) > 0) hits.push(n);
  if (hits.length) return { n: hits[0] ?? n0, outcome: hits.length > 1 ? "first" : "one" };
  for (let n = n1; n >= n0; n--) if (p.day(n).rise <= ts) return { n, outcome: "begins" };
  return { n: n0, outcome: "begins" };
}

/**
 * The day of observance of a tithi [ts, te) under a rule.
 * - An instant rule (sunrise, sunset, moonrise) keeps the first day whose instant lies in the tithi.
 * - A window rule keeps the only day on which the tithi touches the window; when it touches it on two
 *   days, the festival's own tradition (`two`) says which is kept.
 * - When the tithi misses the window (or the instant) on every day, the day it holds at sunrise is kept.
 */
function chooseDay(p: Place, rule: Exclude<Rule, "holika">, ts: number, te: number, two: Two = "longer"): Pick {
  if (rule === "udaya") return udayaDay(p, ts, te);
  const n0 = p.dayNo(ts) - 1;
  const n1 = p.dayNo(te) + 1;
  if (rule === "udaya3") {
    // The last sunrise the tithi outlasts by three muhūrtas (three fifteenths of the daylight);
    // when it ends sooner than that, the day before, on which it ran through the afternoon.
    const u = udayaDay(p, ts, te);
    if (u.outcome === "begins") return u;
    let best: number | null = null;
    let last = u.n;
    for (let n = u.n; n <= n1; n++) {
      if (p.share("udaya", n, ts, te) <= 0) continue;
      last = n;
      const d = p.day(n);
      if (te - d.rise >= (3 * (d.set - d.rise)) / 15) best = n;
    }
    if (best !== null) return { n: best, outcome: last > u.n && best === u.n ? "short" : "one" };
    return { n: u.n - 1, outcome: "short" };
  }
  const touched: Array<{ n: number; s: number }> = [];
  for (let n = n0; n <= n1; n++) {
    const s = p.share(rule, n, ts, te);
    if (s > 0) touched.push({ n, s });
  }
  const first = touched[0];
  if (!first) return { n: udayaDay(p, ts, te).n, outcome: "sunrise" };
  if (touched.length === 1) return { n: first.n, outcome: "one" };
  if (rule === "sunset" || rule === "moonrise") return { n: first.n, outcome: "first" };
  // Equal shares (within a minute) keep the first day.
  const longest = touched.reduce((a, b) => (b.s > a.s + 60_000 ? b : a));
  if (two === "longer") return { n: longest.n, outcome: "longer" };
  if (two === "second3") {
    const last = touched[touched.length - 1] ?? first;
    const d = p.day(last.n);
    return te - d.rise >= (3 * (d.set - d.rise)) / 15 ? { n: last.n, outcome: "two-second3" } : { n: first.n, outcome: "two-first3" };
  }
  // A touch of less than a ghaṭī does not make a day a contender.
  const strong = touched.filter((t) => t.s >= GHATI);
  if (strong.length < 2) return { n: (strong[0] ?? longest).n, outcome: "longer" };
  return two === "first"
    ? { n: (strong[0] ?? first).n, outcome: "two-first" }
    : { n: (strong[strong.length - 1] ?? first).n, outcome: "two-second" };
}

/**
 * Holikā Dahana: the full-moon tithi at dusk, clear of Bhadrā (Viṣṭi karaṇa, the first half of the
 * tithi), as the Dharmasindhu gives it.
 * - If the tithi reaches dusk on two days, the second (the first evening is in Bhadrā).
 * - If it reaches dusk on one day only and Bhadrā is over by that night's midnight, that day.
 * - If Bhadrā runs past midnight: the next evening, provided the full-moon tithi lasts at least three
 *   and a half of that day's four watches and the tithi after it is longer still; otherwise the
 *   first evening, late, in the tail of Bhadrā.
 */
function holikaDay(p: Place, ts: number, te: number, nextEnd: number): Pick {
  const n0 = p.dayNo(ts) - 1;
  const n1 = p.dayNo(te) + 1;
  const dusk: number[] = [];
  for (let n = n0; n <= n1; n++) if (p.share("pradosha", n, ts, te) > 0) dusk.push(n);
  const first = dusk[0];
  if (first === undefined) return { n: udayaDay(p, ts, te).n, outcome: "sunrise" };
  if (dusk.length > 1) return { n: dusk[1] ?? first, outcome: "holika-second" };
  const bhadraEnd = solveCrossing(elongAt, 174, ts, te);
  const d = p.day(first);
  const midnight = d.set + (p.day(first + 1).rise - d.set) / 2;
  if (bhadraEnd <= midnight) return { n: first, outcome: "one" };
  const d2 = p.day(first + 1);
  const longEnough = te >= d2.rise + 0.875 * (d2.set - d2.rise);
  const growing = nextEnd - te > te - ts;
  if (longEnough && growing) return { n: first + 1, outcome: "holika-late" };
  return { n: first, outcome: "holika-bhadra" };
}

// ─── words ──────────────────────────────────────────────────────────────────

const WD = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

/** "Thu 26 Mar, 11:48 am" on the place's clock. */
function stamp(ms: number, zone: string): string {
  const d = DateTime.fromMillis(Math.round(ms / 60_000) * 60_000, { zone });
  return `${WD[d.weekday - 1]} ${d.day} ${MON[d.month - 1]}, ${formatClock12(d.hour, d.minute)}`;
}

/** "9th lunar day of the growing Moon (Śukla Navamī)". */
function tithiWords(t: number): string {
  if (t === 15) return "Full Moon lunar day (Pūrṇimā)";
  if (t === 30) return "New Moon lunar day (Amāvasyā)";
  const k = ((t - 1) % 15) + 1;
  return `${ORDINAL(k)} lunar day of the ${t < 15 ? "growing" : "fading"} Moon (${t < 15 ? "Śukla" : "Kṛṣṇa"} ${TITHI_NAMES[k - 1]})`;
}

const WHEN: Record<Rule, string> = {
  udaya: "is running at sunrise",
  udaya3: "is running at sunrise and for a good while after it",
  purvahna: "covers the forenoon (sunrise to midday)",
  madhyahna: "covers the middle of the day (the middle fifth of the daylight)",
  aparahna: "covers the afternoon (the fourth fifth of the daylight)",
  sunset: "is running at sunset",
  pradosha: "covers dusk (the first fifth of the night)",
  nishitha: "covers midnight (the middle fifteenth of the night)",
  arunodaya: "covers the hour and a half before sunrise",
  moonrise: "is running at moonrise",
  holika: "covers dusk, clear of Bhadrā (the first half of that lunar day)",
};

const OUTCOME: Record<Outcome, string> = {
  one: "",
  longer: " It touches that part of the day on two days here; the day with the longer share is kept.",
  first: " That holds on two days here; the first is kept.",
  "two-first": " It touches that part of the day on two days here; for this festival the first is kept.",
  "two-second": " It touches that part of the day on two days here; for this festival the second is kept.",
  "two-second3":
    " It touches that part of the day on two days here; the second is kept, because the lunar day runs well past that day's sunrise.",
  "two-first3":
    " It touches that part of the day on two days here; the first is kept, because the lunar day ends too soon after the second sunrise.",
  sunrise: " It misses that part of the day on both days here, so the day it holds at sunrise is kept.",
  begins: " It begins and ends between two sunrises here, so the day it begins in is kept.",
  short: " It ends too soon after the later sunrise here, so the earlier day is kept.",
  "holika-second": " It reaches dusk on two days here; the second is kept, because the first evening is in Bhadrā.",
  "holika-late":
    " Bhadrā runs past midnight on the first evening, and the lunar day lasts through most of the next day here, so the next evening is kept.",
  "holika-bhadra": " Bhadrā runs past midnight here and the next evening is too late, so the fire is lit late on the first evening.",
};

/** The month in words. The dark fortnight has two names: months end at the new moon in the south and
 *  west (amānta, the reckoning used here) and at the full moon in the north (pūrṇimānta). */
function masaName(m: LunarMonth, t: number): string {
  const name = MASA_NAMES[m.masa] ?? "";
  if (m.adhika) return `the leap month (Adhika ${name})`;
  if (t <= 15) return name;
  return `${name} (called ${MASA_NAMES[(m.masa + 1) % 12]} where months end at the full moon)`;
}

function ruleText(m: LunarMonth, t: number, rule: Rule, ts: number, te: number, outcome: Outcome, zone: string): string {
  return `Kept on the day the ${tithiWords(t)} of ${masaName(m, t)} ${WHEN[rule]}. Here it runs from ${stamp(ts, zone)} to ${stamp(te, zone)}.${OUTCOME[outcome]}`;
}

// ─── the table ──────────────────────────────────────────────────────────────

interface Def {
  id: string;
  name: string;
  sanskrit: string;
  /** Amānta month, 0 = Caitra. */
  masa: number;
  /** 1..30: 1-15 Śukla, 16-30 Kṛṣṇa. */
  tithi: number;
  rule: Rule;
  two: Two;
  kind: FestivalKind;
  note: string;
}

const F = (
  id: string,
  name: string,
  sanskrit: string,
  masa: number,
  tithi: number,
  rule: Rule | readonly [Rule, Two],
  note: string,
): Def => ({
  id,
  name,
  sanskrit,
  masa,
  tithi,
  rule: typeof rule === "string" ? rule : rule[0],
  two: typeof rule === "string" ? "longer" : rule[1],
  kind: "festival",
  note,
});

/** The yearly festivals. Months are amānta (ending at the new moon); a leap month is skipped. */
export const FESTIVALS: readonly Def[] = [
  F(
    "ugadi",
    "Ugadi · Gudi Padwa",
    "Ugādi, Guḍī Pāḍavā",
    0,
    1,
    "udaya",
    "The lunar new year in the Deccan: the first day of the month of Caitra.",
  ),
  F("rama-navami", "Rama Navami", "Rāma Navamī", 0, 9, ["madhyahna", "second"], "The birth of Rāma, held to have been at midday."),
  F(
    "hanuman-jayanti",
    "Hanuman Jayanti",
    "Hanumān Jayantī",
    0,
    15,
    "udaya",
    "The birth of Hanumān, as kept on the Caitra full moon; some regions keep it on other days.",
  ),
  F(
    "akshaya-tritiya",
    "Akshaya Tritiya",
    "Akṣaya Tṛtīyā",
    1,
    3,
    ["purvahna", "second3"],
    "A day tradition calls unfailing, when a good beginning needs no chosen hour.",
  ),
  F("guru-purnima", "Guru Purnima", "Guru Pūrṇimā, Vyāsa Pūjā", 3, 15, "udaya", "The full moon on which teachers are honoured."),
  F("naga-panchami", "Naga Panchami", "Nāga Pañcamī", 4, 5, "udaya", "A day of honouring the serpents, with milk and prayers."),
  F(
    "raksha-bandhan",
    "Raksha Bandhan",
    "Rakṣā Bandhana, Śrāvaṇa Pūrṇimā",
    4,
    15,
    "udaya3",
    "Sisters tie a thread on their brothers' wrists, a promise of care both ways.",
  ),
  F("janmashtami", "Krishna Janmashtami", "Kṛṣṇa Janmāṣṭamī", 4, 23, "nishitha", "The birth of Kṛṣṇa, held to have been at midnight."),
  F(
    "ganesh-chaturthi",
    "Ganesh Chaturthi",
    "Gaṇeśa Caturthī, Vināyaka Cavitī",
    5,
    4,
    ["madhyahna", "first"],
    "The birth of Gaṇeśa, welcomed home at midday.",
  ),
  F(
    "navaratri",
    "Navaratri begins",
    "Śāradīya Navarātri, Ghaṭasthāpanā",
    6,
    1,
    "udaya",
    "The first of the nine autumn nights of the Goddess.",
  ),
  F(
    "durga-ashtami",
    "Durga Ashtami",
    "Durgā Aṣṭamī, Mahāṣṭamī",
    6,
    8,
    "udaya",
    "The eighth day of Navarātri, the great day of Durgā's worship.",
  ),
  F(
    "vijaya-dashami",
    "Dussehra",
    "Vijayā Daśamī, Dasarā",
    6,
    10,
    "aparahna",
    "The day of victory: Rāma over Rāvaṇa, Durgā over Mahiṣāsura.",
  ),
  F(
    "karva-chauth",
    "Karva Chauth",
    "Karvā Cauth, Karaka Caturthī",
    6,
    19,
    "moonrise",
    "A day's fast kept by married women in the north, ended on seeing the Moon rise.",
  ),
  F("dhanteras", "Dhanteras", "Dhanatrayodaśī", 6, 28, "pradosha", "The evening that opens the days of Dīvālī, with a lamp lit at dusk."),
  F(
    "naraka-chaturdashi",
    "Naraka Chaturdashi",
    "Naraka Caturdaśī, Choṭī Dīvālī",
    6,
    29,
    "arunodaya",
    "The dawn bath that recalls Kṛṣṇa's victory over Naraka.",
  ),
  F(
    "diwali",
    "Diwali",
    "Dīpāvalī, Lakṣmī Pūjā",
    6,
    30,
    ["pradosha", "second"],
    "The festival of lamps, with Lakṣmī's worship at dusk on the new-moon night.",
  ),
  F("bhai-dooj", "Bhai Dooj", "Bhāī Dūj, Yama Dvitīyā", 7, 2, "aparahna", "Sisters welcome their brothers home and wish them a long life."),
  F(
    "chhath",
    "Chhath",
    "Chaṭh Pūjā, Sūrya Ṣaṣṭhī",
    7,
    6,
    "sunset",
    "Thanks offered to the setting Sun at the water's edge, and to the rising Sun the next morning.",
  ),
  F(
    "kartik-purnima",
    "Kartik Purnima",
    "Kārttika Pūrṇimā, Deva Dīpāvalī",
    7,
    15,
    "udaya",
    "The full moon of Kārttika, a day of lamps and river baths.",
  ),
  F(
    "vasant-panchami",
    "Vasant Panchami",
    "Vasanta Pañcamī, Sarasvatī Pūjā",
    10,
    5,
    ["purvahna", "first"],
    "The first day of spring, and the day of Sarasvatī.",
  ),
  F(
    "maha-shivaratri",
    "Maha Shivaratri",
    "Mahā Śivarātri",
    10,
    29,
    "nishitha",
    "The great night of Śiva, kept awake with a fast and prayers.",
  ),
  F(
    "holika-dahan",
    "Holika Dahan",
    "Holikā Dahana, Choṭī Holī",
    11,
    15,
    "holika",
    "The bonfire on the eve of Holī, for the story of Prahlāda and Holikā.",
  ),
];

/** The 24 Ekādaśīs by amānta month: [bright fortnight, dark fortnight]. */
export const EKADASHI_NAMES: ReadonlyArray<readonly [string, string]> = [
  ["Kāmadā", "Varūthinī"],
  ["Mohinī", "Aparā"],
  ["Nirjalā", "Yoginī"],
  ["Devaśayanī", "Kāmikā"],
  ["Śrāvaṇa Putradā", "Ajā"],
  ["Parivartinī", "Indirā"],
  ["Pāpāṅkuśā", "Ramā"],
  ["Devotthāna", "Utpannā"],
  ["Mokṣadā", "Saphalā"],
  ["Pauṣa Putradā", "Ṣaṭtilā"],
  ["Jayā", "Vijayā"],
  ["Āmalakī", "Pāpamocanī"],
];
const EKADASHI_ADHIKA = ["Padminī", "Paramā"] as const;

interface Recurring {
  id: string;
  tithi: number;
  rule: Exclude<Rule, "holika">;
  name: string;
  sanskrit: (m: LunarMonth) => string;
  note: string;
}

const ekadashiName = (m: LunarMonth, bright: boolean): string =>
  `${m.adhika ? EKADASHI_ADHIKA[bright ? 0 : 1] : (EKADASHI_NAMES[m.masa]?.[bright ? 0 : 1] ?? "")} Ekādaśī`;

/** The fasts that come round every lunar month (a leap month keeps them too). */
const RECURRING: readonly Recurring[] = [
  {
    id: "ekadashi",
    tithi: 11,
    rule: "udaya",
    name: "Ekadashi fast",
    sanskrit: (m) => ekadashiName(m, true),
    note: "The 11th lunar day of the growing Moon, kept as a fast for Viṣṇu.",
  },
  {
    id: "pradosha",
    tithi: 13,
    rule: "pradosha",
    name: "Pradosh fast",
    sanskrit: () => "Śukla Pradoṣa Vrata",
    note: "The 13th lunar day at dusk, an evening kept for Śiva.",
  },
  {
    id: "purnima",
    tithi: 15,
    rule: "udaya",
    name: "Full Moon day",
    sanskrit: (m) => `${m.adhika ? "Adhika " : ""}${MASA_NAMES[m.masa]} Pūrṇimā`,
    note: "The full-moon day, kept by many with a fast, a bath or a visit to a temple.",
  },
  {
    id: "sankashti",
    tithi: 19,
    rule: "moonrise",
    name: "Sankashti Chaturthi",
    sanskrit: () => "Saṅkaṣṭī Caturthī",
    note: "A fast for Gaṇeśa on the 4th lunar day of the fading Moon, ended on seeing the Moon rise.",
  },
  {
    id: "ekadashi",
    tithi: 26,
    rule: "udaya",
    name: "Ekadashi fast",
    sanskrit: (m) => ekadashiName(m, false),
    note: "The 11th lunar day of the fading Moon, kept as a fast for Viṣṇu.",
  },
  {
    id: "pradosha",
    tithi: 28,
    rule: "pradosha",
    name: "Pradosh fast",
    sanskrit: () => "Kṛṣṇa Pradoṣa Vrata",
    note: "The 13th lunar day at dusk, an evening kept for Śiva.",
  },
  {
    id: "amavasya",
    tithi: 30,
    rule: "udaya",
    name: "New Moon day",
    sanskrit: () => "Amāvasyā",
    note: "The new-moon day, when many families remember their ancestors.",
  },
];

// ─── building ───────────────────────────────────────────────────────────────

const KIND_ORDER: Record<FestivalKind, number> = { festival: 0, fast: 1, solar: 2, eclipse: 3 };

interface Row extends Festival {
  /** Month and tithi of a lunar row, to drop a monthly fast that a named festival already covers. */
  lunar?: string;
  generic?: boolean;
}

function build(fromMs: number, toMs: number, place: GeoPoint, zoneIn: string, preset: EnginePreset): Festival[] {
  const zone = safeZone(zoneIn);
  const p = new Place(place, zone, preset);
  const firstDay = p.dayNo(fromMs);
  const lastDay = p.dayNo(toMs);
  const rows: Row[] = [];
  const add = (n: number, r: Omit<Row, "dateMs" | "key" | "elongation">) => {
    if (n < firstDay || n > lastDay) return;
    const dateMs = p.midnight(n);
    rows.push({ ...r, dateMs, key: `${r.id}@${new Date(n * DAY).toISOString().slice(0, 10)}`, elongation: elongAt(dateMs + 12 * HOUR) });
  };

  for (const m of lunarMonthsBetween(fromMs - 4 * DAY, toMs + 4 * DAY, preset.ayanamsa)) {
    const b = tithiBounds(m);
    const span = (t: number): [number, number] => [b[t - 1] ?? m.startMs, b[t] ?? m.endMs];
    const lunar = (t: number) => `${Math.round(m.startMs / DAY)}:${t}`;

    if (!m.adhika) {
      for (const f of FESTIVALS) {
        if (f.masa !== m.masa) continue;
        const [ts, te] = span(f.tithi);
        const pick = f.rule === "holika" ? holikaDay(p, ts, te, b[f.tithi + 1] ?? m.endMs) : chooseDay(p, f.rule, ts, te, f.two);
        add(pick.n, {
          id: f.id,
          name: f.name,
          sanskrit: f.sanskrit,
          kind: f.kind,
          note: f.note,
          rule: ruleText(m, f.tithi, f.rule, ts, te, pick.outcome, zone),
          lunar: lunar(f.tithi),
        });
        if (f.id === "holika-dahan") {
          add(pick.n + 1, {
            id: "holi",
            name: "Holi",
            sanskrit: "Holī, Dhuleṭī",
            kind: "festival",
            note: "The festival of colours, played the morning after the bonfire.",
            rule: `Kept on the morning after Holikā Dahana, which here falls on ${stamp(p.day(pick.n).set, zone).split(",")[0]}.`,
          });
        }
      }
    }

    for (const r of RECURRING) {
      const [ts, te] = span(r.tithi);
      const pick = chooseDay(p, r.rule, ts, te);
      add(pick.n, {
        id: r.id,
        name: r.name,
        sanskrit: r.sanskrit(m),
        kind: "fast",
        note: r.note,
        rule: ruleText(m, r.tithi, r.rule, ts, te, pick.outcome, zone),
        lunar: lunar(r.tithi),
        generic: true,
      });
    }
  }

  // Saṅkrāntis: the sidereal Sun entering a sign. Makara Saṅkrānti is the festival among them.
  // Searched a season at a time (the search follows the Sun through less than one turn of the zodiac),
  // on a fixed grid of seasons so that any range finds the very same instants.
  const SEASON = 90 * DAY;
  const crossings: ReturnType<typeof sankrantisBetween> = [];
  for (let t = Math.floor((fromMs - 3 * DAY) / SEASON) * SEASON; t < toMs + 3 * DAY; t += SEASON) {
    crossings.push(...sankrantisBetween(t, t + SEASON, preset.ayanamsa));
  }
  for (const s of crossings) {
    const n = p.dayNo(s.ms);
    const sign = SIGN_NAMES[s.sign] ?? "";
    const western = SIGN_WESTERN[s.sign] ?? "";
    if (s.sign === 9) {
      // The holy hours need daylight: a crossing after sunset is kept the next day.
      const late = s.ms > p.day(n).set;
      add(late ? n + 1 : n, {
        id: "makara-sankranti",
        name: "Makar Sankranti · Pongal",
        sanskrit: "Makara Saṅkrānti, Poṅgal, Uttarāyaṇa",
        kind: "festival",
        note: "The Sun enters Capricorn and turns north: the harvest festival, with sesame, kites and the first rice.",
        rule: `Kept on the day the Sun enters Makara (Capricorn) in the sidereal zodiac, or the next day when that happens after sunset. Here the Sun crosses at ${stamp(s.ms, zone)}${late ? ", after sunset, so the next day is kept" : ""}.`,
        atMs: s.ms,
      });
      continue;
    }
    add(n, {
      id: "sankranti",
      name: `The Sun enters ${western}`,
      sanskrit: `${sign} Saṅkrānti`,
      kind: "solar",
      note:
        s.sign === 0
          ? "The Sun enters Aries: the solar new year in several regions (Vaisākhī, Puthāṇḍu, Viṣu, Pohela Boiśākh), which each count the day in their own way."
          : `The Sun moves into ${sign} (${western}) in the sidereal zodiac, opening a new solar month.`,
      rule: `The civil day on which the Sun crosses into ${sign}: here at ${stamp(s.ms, zone)}.`,
      atMs: s.ms,
    });
  }

  // Eclipses, with whether any of it can be seen from the place (as in the sky events).
  const obs = observerOf(place);
  const cap = (s: string) => (s[0]?.toUpperCase() ?? "") + s.slice(1);
  let le = A.SearchLunarEclipse(new Date(fromMs - 2 * DAY));
  for (let g = 0; g < 40 && le.peak.date.getTime() <= toMs + 2 * DAY; g++) {
    const ms = le.peak.date.getTime();
    const eq = A.Equator(A.Body.Moon, le.peak, obs, true, true);
    const up = A.Horizon(le.peak, obs, eq.ra, eq.dec, "normal").altitude > 0;
    add(p.dayNo(ms), {
      id: "lunar-eclipse",
      name: `${cap(String(le.kind))} eclipse of the Moon`,
      sanskrit: "Candra Grahaṇa",
      kind: "eclipse",
      note: up
        ? "The Earth's shadow crosses the Moon, and the Moon is above the horizon here at the peak."
        : "The Earth's shadow crosses the Moon; at the peak the Moon is below the horizon here.",
      rule: `The civil day of the eclipse's peak: here at ${stamp(ms, zone)}.`,
      atMs: ms,
    });
    le = A.NextLunarEclipse(le.peak);
  }
  let ge = A.SearchGlobalSolarEclipse(new Date(fromMs - 2 * DAY));
  for (let g = 0; g < 40 && ge.peak.date.getTime() <= toMs + 2 * DAY; g++) {
    const ms = ge.peak.date.getTime();
    let visible = false;
    try {
      const local = A.SearchLocalSolarEclipse(ge.peak.AddDays(-1), obs);
      visible = Math.abs(local.peak.time.ut - ge.peak.ut) < 1 && local.peak.altitude > 0;
    } catch {
      visible = false;
    }
    add(p.dayNo(ms), {
      id: "solar-eclipse",
      name: `${cap(String(ge.kind))} eclipse of the Sun`,
      sanskrit: "Sūrya Grahaṇa",
      kind: "eclipse",
      note: visible
        ? "The Moon passes in front of the Sun, and part of it can be seen from here; never look at the Sun without eclipse glasses."
        : "The Moon passes in front of the Sun; it is not seen from this place.",
      rule: `The civil day of the eclipse's peak on Earth: here at ${stamp(ms, zone)}.`,
      atMs: ms,
    });
    ge = A.NextGlobalSolarEclipse(ge.peak);
  }

  // A named festival stands in for the monthly fast of the same lunar day when both fall on one date.
  const named = new Set(rows.filter((r) => !r.generic && r.lunar).map((r) => `${r.lunar}@${r.dateMs}`));
  return rows
    .filter((r) => !(r.generic && named.has(`${r.lunar}@${r.dateMs}`)))
    .sort((a, b) => a.dateMs - b.dateMs || KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.id.localeCompare(b.id))
    .map(({ lunar: _l, generic: _g, ...f }) => f);
}

// ─── the public face ────────────────────────────────────────────────────────

const memo = new Map<string, Festival[]>();
const placeKey = (place: GeoPoint, zone: string, preset: EnginePreset): string =>
  `${place.lat.toFixed(4)}|${place.lon.toFixed(4)}|${place.elevation ?? 0}|${safeZone(zone)}|${preset.ayanamsa}|${preset.sunrise}`;

function remember(key: string, make: () => Festival[]): Festival[] {
  let hit = memo.get(key);
  if (!hit) {
    hit = make();
    if (memo.size > 48) memo.clear();
    memo.set(key, hit);
  }
  return hit;
}

/** Every festival, fast, saṅkrānti and eclipse of a civil year at a place. Memoised per (year, place, preset). */
export function festivalsOfYear(year: number, place: GeoPoint, zone: string, preset: EnginePreset): Festival[] {
  return remember(`y${year}|${placeKey(place, zone, preset)}`, () => {
    const z = safeZone(zone);
    const a = DateTime.fromObject({ year, month: 1, day: 1 }, { zone: z }).toMillis();
    const b = DateTime.fromObject({ year, month: 12, day: 31, hour: 12 }, { zone: z }).toMillis();
    return build(a, b, place, z, preset);
  });
}

/**
 * The festivals and fasts whose civil day at the place lies between the day of `fromMs` and the day
 * of `toMs` (both included), soonest first. A short range (up to 100 days) is worked out on its own,
 * which is quick; a longer one is assembled from whole years, each worked out once.
 */
export function festivalsBetween(fromMs: number, toMs: number, place: GeoPoint, zone: string, preset: EnginePreset): Festival[] {
  if (!(toMs >= fromMs)) return [];
  const z = safeZone(zone);
  const a = DateTime.fromMillis(fromMs, { zone: z }).startOf("day");
  const b = DateTime.fromMillis(toMs, { zone: z }).startOf("day");
  const pk = placeKey(place, z, preset);
  const yearsReady = (): boolean => {
    for (let y = a.year; y <= b.year; y++) if (!memo.has(`y${y}|${pk}`)) return false;
    return true;
  };
  if (toMs - fromMs <= 100 * DAY && !yearsReady()) {
    return remember(`r${a.toISODate()}|${b.toISODate()}|${pk}`, () => build(a.toMillis(), b.toMillis() + 12 * HOUR, place, z, preset));
  }
  const out: Festival[] = [];
  for (let y = a.year; y <= b.year; y++) {
    for (const f of festivalsOfYear(y, place, z, preset)) if (f.dateMs >= a.toMillis() && f.dateMs <= b.toMillis()) out.push(f);
  }
  return out;
}

/** Whole civil days from the day of `nowMs` to a festival's day at the place: 0 today, 1 tomorrow. */
export function daysUntil(dateMs: number, nowMs: number, zone: string): number {
  const z = safeZone(zone);
  const a = DateTime.fromMillis(nowMs, { zone: z });
  const b = DateTime.fromMillis(dateMs + 12 * HOUR, { zone: z });
  return Math.round((Date.UTC(b.year, b.month - 1, b.day) - Date.UTC(a.year, a.month - 1, a.day)) / DAY);
}

/** "today", "tomorrow", "in 7 days". */
export const inDaysWords = (n: number): string => (n <= 0 ? "today" : n === 1 ? "tomorrow" : `in ${n} days`);

export interface NextFestival {
  festival: Festival;
  /** 0 when it is today. */
  inDays: number;
}

/**
 * The next festival on or after today at the place, for a teaser row. Cheap: it reads the next 45
 * days (about a tenth of a second, then memoised for the day) and only looks further when those
 * hold none. `kinds` defaults to the named festivals; pass ["festival", "fast"] to count fasts too.
 */
export function nextFestival(
  nowMs: number,
  place: GeoPoint,
  zone: string,
  preset: EnginePreset,
  kinds: readonly FestivalKind[] = ["festival"],
): NextFestival | null {
  for (const reach of [45, 100, 400]) {
    const hit = festivalsBetween(nowMs, nowMs + reach * DAY, place, zone, preset).find((f) => kinds.includes(f.kind));
    if (hit) return { festival: hit, inDays: daysUntil(hit.dateMs, nowMs, zone) };
  }
  return null;
}
