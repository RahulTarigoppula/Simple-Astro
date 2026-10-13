// Domain types for Vyom. Angles are degrees, always normalised to [0, 360).
// Times are UTC epoch milliseconds plus the resolved zone — never local strings.

// ─── identity & storage ──────────────────────────────────────────────────────
export type ProfileId = string; // crypto.randomUUID()
export type Deg = number; // 0 <= d < 360
export type Jd = number; // Julian Day, UT unless the field says TT

export interface Place {
  name: string; // "Bengaluru"
  admin1?: string; // "Karnataka"
  country: string; // ISO-3166 alpha-2, "IN"
  lat: number; // +N
  lon: number; // +E
  elevation?: number; // metres; unused by the engine, shown in the colophon
  geonameId?: number; // present when it came from the bundle
  timezone?: string; // IANA zone when the source supplied one
  source: "bundle" | "open-meteo" | "nominatim" | "manual";
}

export interface BirthMoment {
  localY: number;
  localMo: number;
  localD: number; // as written on the leaf
  localH: number;
  localMi: number; // 24h, local clock at the place
  place: Place;
  zone: string; // IANA, e.g. "Asia/Kolkata" (from tz-lookup, editable)
  offsetOverrideMin?: number; // e.g. 291 for Bombay Time +04:51; wins over the tzdb
  utcMs: number; // resolved instant — the single source of truth
  offsetMin: number; // the offset actually used, minutes east of UTC
  jdUt: Jd; // utcMs -> JD_UT
  offsetSource: "tzdb" | "override";
}

export interface Profile {
  id: ProfileId;
  name: string;
  birth: BirthMoment;
  handedness: "right" | "left"; // dominant hand, for the palm framing
  /** The clock time was not recorded: the leaf is cast for local noon and says so everywhere. */
  timeUnknown?: boolean;
  gender?: "a" | "b"; // labels the two sides of a Milan; never a rule input
  createdAt: number;
  updatedAt: number;
}

// ─── engine configuration (part of every cache key) ──────────────────────────
export type AyanamsaPreset = "se-true" | "se-mean" | "drik-mean";
export type NodeMode = "true" | "mean";
export type SunriseMode = "upper-limb-refracted" | "disc-centre";

export interface EnginePreset {
  ayanamsa: AyanamsaPreset; // default 'se-true'
  node: NodeMode; // default 'true'
  dashaYearDays: 365.25 | 360; // default 365.25
  sunrise: SunriseMode; // default 'upper-limb-refracted'
  houseSystem: "whole-sign" | "bhava-chalit"; // the chart is always whole-sign; this drives yogas
}

export const DEFAULT_PRESET: EnginePreset = {
  ayanamsa: "se-true",
  node: "true",
  dashaYearDays: 365.25,
  sunrise: "upper-limb-refracted",
  houseSystem: "whole-sign",
};

/** Bump ENGINE_EPOCH whenever a change moves existing numbers, so caches recompute. */
export const ENGINE_EPOCH = 1;
export const PRESET_HASH = (p: EnginePreset): string =>
  `${ENGINE_EPOCH}|${p.ayanamsa}|${p.node}|${p.dashaYearDays}|${p.sunrise}|${p.houseSystem}`;

// ─── the chart ───────────────────────────────────────────────────────────────
export type GrahaId = "SU" | "MO" | "MA" | "ME" | "JU" | "VE" | "SA" | "RA" | "KE";
export type SignIdx = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11; // 0 = Mesha (Aries)

export const GRAHA_IDS: readonly GrahaId[] = ["SU", "MO", "MA", "ME", "JU", "VE", "SA", "RA", "KE"];

export type Dignity = "exalted" | "moolatrikona" | "own" | "friend" | "neutral" | "enemy" | "debilitated";

export interface Graha {
  id: GrahaId;
  lonTropical: Deg; // apparent, true ecliptic of date
  lonSidereal: Deg;
  latEcliptic: number; // degrees, geocentric ecliptic latitude (0 for nodes)
  speed: number; // deg/day, sidereal; negative = retrograde
  retrograde: boolean;
  sign: SignIdx;
  degInSign: number; // 0..30
  nakshatra: number; // 0..26, Ashwini = 0
  pada: 1 | 2 | 3 | 4;
  nakshatraLord: GrahaId;
  house: number; // 1..12, whole-sign from the Lagna
  dignity: Dignity;
  combust: boolean;
  boundary: BoundaryFlag | null; // set when within 2' of a sign/nakshatra/pada edge
}

export interface BoundaryFlag {
  kind: "sign" | "nakshatra" | "pada";
  arcminutesTo: number; // distance to the nearest edge, in arcminutes
  otherSide: string; // "Jyeṣṭhā" — what the neighbouring classification would read
}

export type VargaNumber = 1 | 2 | 3 | 7 | 9 | 10 | 12 | 30 | 60;

export interface VargaChart {
  varga: VargaNumber;
  ascendantSign: SignIdx;
  placements: Record<GrahaId, SignIdx>;
}

export interface DashaNode {
  lord: GrahaId;
  startMs: number;
  endMs: number;
  level: 1 | 2 | 3; // maha / antar / pratyantar
  children?: DashaNode[]; // level 3 is generated lazily
}

export interface Panchang {
  tithi: { index: number; name: string; paksha: "shukla" | "krishna"; endMs: number };
  vara: { index: 0 | 1 | 2 | 3 | 4 | 5 | 6; name: string }; // 0 = Ravivāra
  nakshatra: { index: number; name: string; pada: 1 | 2 | 3 | 4; endMs: number };
  yoga: { index: number; name: string; endMs: number };
  karana: { index: number; name: string; endMs: number };
  sunriseMs: number;
  sunsetMs: number;
  nextSunriseMs: number;
  moonriseMs: number | null;
  moonsetMs: number | null;
  rahuKaal: [number, number];
  yamaganda: [number, number];
  gulika: [number, number];
  abhijit: [number, number] | null; // absent on Wednesdays by convention
  masaAmanta: string;
  masaPurnimanta: string;
  ritu: string;
  ayana: "uttarayana" | "dakshinayana";
  moonIllumination: number; // 0..1, drives --moon-k
  elongation: number; // Moon − Sun, degrees [0, 360)
  /** Set only where the Sun neither rises nor sets today: the day is local apparent noon ± 6 h. */
  polar?: "midnight-sun" | "polar-night";
}

export interface Citation {
  text: string;
  ref: string;
} // { text: "BPHS", ref: "36.13" }

export interface YogaEvidence {
  grahaId?: GrahaId;
  house?: number;
  sign?: SignIdx;
  note: string;
}

export interface YogaHit {
  id: string; // 'gaja-kesari'
  name: string;
  nameDev: string;
  strength: "full" | "partial" | "cancelled";
  because: YogaEvidence[];
  citation: Citation;
  cancelledBy?: string; // rule id, when strength === 'cancelled'
  reading: string; // "Tradition says…" sentence composed from the rule's template
}

export interface Lagna {
  lonTropical: Deg;
  lonSidereal: Deg;
  sign: SignIdx;
  degInSign: number;
  nakshatra: number;
  pada: 1 | 2 | 3 | 4;
  nakshatraLord: GrahaId;
  boundary: BoundaryFlag | null;
}

export interface Patri {
  profileId: ProfileId;
  preset: EnginePreset;
  presetHash: string;
  engine: { name: "astronomy-engine"; version: string; ayanamsaArcsec: number };
  jdUt: Jd;
  jdTt: Jd;
  ayanamsa: Deg;
  lagna: Lagna;
  mc: { lonSidereal: Deg; sign: SignIdx };
  ramc: Deg;
  obliquity: Deg;
  grahas: Record<GrahaId, Graha>;
  vargas: Partial<Record<VargaNumber, VargaChart>>; // D1 and D9 always present
  dasha: DashaNode[]; // 9 maha-dashas, antars filled, pratyantars lazy
  birthPanchang: Panchang;
  yogas: YogaHit[];
  computedAt: number;
  computeMs: number; // evidence for the budget; printed in the colophon
}

/** Everything a cast produces before the yoga pass; the input to `runYogas()`. */
export type PatriCore = Omit<Patri, "yogas" | "computedAt" | "computeMs">;

// ─── matching ────────────────────────────────────────────────────────────────
export type KootaId = "varna" | "vashya" | "tara" | "yoni" | "maitri" | "gana" | "bhakoot" | "nadi";

export interface KootaResult {
  id: KootaId;
  name: string;
  nameDev: string;
  max: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  score: number; // may be 0.5 / 1.5
  dosha: boolean;
  because: string; // "Nadi: both Madhya" — shown under the bead group
  cancellation?: { applied: boolean; rule: string; citation: Citation };
  citation: Citation;
}

export interface ManglikStatus {
  present: boolean;
  from: Array<"lagna" | "moon" | "venus">;
  cancellations: string[]; // rule ids that cancel it
  citation: Citation;
}

/**
 * Which published Aṣṭakūṭa tables to use where schools differ (Varṇa of earth/air signs, the Vaśya 5×5,
 * Yoni Aśva × Mṛga). "north-common" = the North-Indian almanac tables most families compare against;
 * "pyjhora" = the saravali.de tables used by PyJHora (validated pair-for-pair by the oracle test).
 */
export type AshtakootaSchool = "north-common" | "pyjhora";

export interface MilanResult {
  a: ProfileId;
  b: ProfileId;
  presetHash: string;
  kootas: KootaResult[]; // always 8, in bead order
  total: number; // 0..36
  band: "not-recommended" | "acceptable" | "very-good" | "excellent";
  manglik: { a: ManglikStatus; b: ManglikStatus };
  porutham?: Array<{ id: string; name: string; pass: boolean; note: string }>;
  /** The Aṣṭakūṭa tables used; absent on rows saved before the setting existed (those were "pyjhora"). */
  ashtakootaSchool?: AshtakootaSchool;
}

// ─── palmistry ───────────────────────────────────────────────────────────────
export interface Landmark {
  x: number;
  y: number;
  z: number;
} // normalised 0..1 (image frame)

export interface HandCapture {
  id: string;
  profileId: ProfileId;
  hand: "right" | "left";
  originalBlobKey: string; // key into the blobs table
  rectifiedBlobKey: string; // 512x512 canonical print
  landmarks: Landmark[]; // 21, in the ORIGINAL image frame
  worldLandmarks: Landmark[]; // 21, metres, view-invariant — the ratios use these
  handednessScore: number; // MediaPipe confidence; reject < 0.8
  homography: number[]; // 9 numbers, row-major 3x3, original -> canonical
  quality: { sharpness: number; exposure: number }; // Laplacian variance; luma-histogram score
  imageSize?: [number, number]; // original photo width × height in px (the homography maps pixels)
  capturedAt: number;
}

export type PalmLineId = "heart" | "head" | "life" | "fate";

export interface PalmLine {
  id: PalmLineId;
  path: Array<[number, number]>; // canonical 512 frame, resampled to 64 points
  source: "detected" | "traced";
  confidence: number; // 0..1; < 0.6 renders dashed and prompts the stylus
  metrics: { length: number; curvature: number; breaks: number; branches: number; depth: number };
}

export type PalmElement = "earth" | "air" | "fire" | "water";

export interface PalmReading {
  captureId: string;
  element: PalmElement;
  ratios: { widthOverLength: number; fingerOverPalm: number; indexOverRing: number; thumbAngleDeg: number };
  lines: PalmLine[];
  hits: Array<{ ruleId: string; text: string; citation: Citation; measured: string }>;
  framing: "dominant" | "classical";
  computedAt: number;
}

// ─── settings ────────────────────────────────────────────────────────────────
export interface Settings {
  preset: EnginePreset;
  theme: "auto" | "night" | "day"; // auto = by real sun altitude at the active place
  chartScript: "devanagari" | "latin";
  chartStyle: "north" | "south";
  devanagariDigits: boolean;
  language: "en" | "hi" | "ta" | "te"; // hi/ta/te are Someday; the shape exists from day 1
  sound: boolean;
  haptics: boolean;
  calmDesk: boolean;
  activeProfileId: ProfileId | null;
  onlineLookupAllowed: boolean; // default false — the "search online" stamp asks once
  handFraming: "dominant" | "classical"; // both framings are offered for the palm
  bhakootCancellation: boolean; // apply the classical Bhakūṭa cancellation in Milan
  ashtakootaSchool: AshtakootaSchool; // which Aṣṭakūṭa tables Milan uses where schools differ
}

export const DEFAULT_SETTINGS: Settings = {
  preset: DEFAULT_PRESET,
  theme: "auto",
  chartScript: "devanagari",
  chartStyle: "north",
  devanagariDigits: false,
  language: "en",
  sound: true,
  haptics: true,
  calmDesk: false,
  activeProfileId: null,
  onlineLookupAllowed: false,
  handFraming: "dominant",
  bhakootCancellation: false,
  ashtakootaSchool: "north-common",
};

// ─── muhūrta divisions and the month leaf ────────────────────────────────────
export type MuhurtaQuality = "good" | "neutral" | "bad";
export type ChoghadiyaName = "Udvega" | "Cara" | "Lābha" | "Amṛta" | "Kāla" | "Śubha" | "Roga";

export interface Choghadiya {
  name: ChoghadiyaName;
  dev: string;
  quality: MuhurtaQuality;
  startMs: number;
  endMs: number;
  part: number; // 1..8 within its half
  half: "day" | "night";
}

export interface Hora {
  lord: GrahaId;
  startMs: number;
  endMs: number;
  part: number; // 1..12 within its half
  half: "day" | "night";
}

export type CalendarMark = "ekadashi" | "purnima" | "amavasya" | "sankranti";

export interface Sankranti {
  ms: number;
  sign: SignIdx; // the sign the sidereal Sun enters
  day: number; // civil date in the place's zone
}

export interface CalendarDay {
  day: number; // 1..31
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6; // civil weekday, 0 = Sunday
  sunriseMs: number;
  tithi: { index: number; name: string; paksha: "shukla" | "krishna" }; // at sunrise
  kshaya?: number[]; // tithis that begin and end before the next sunrise
  nakshatra: number; // 0..26, the Moon's at sunrise
  elongation: number;
  moonK: number; // illuminated fraction, 0..1
  marks: CalendarMark[];
  sankranti?: Sankranti;
  polar?: boolean;
}

export interface MonthCalendar {
  year: number;
  month: number; // 1..12
  zone: string;
  leadingBlanks: number; // weekday of the 1st, Sunday first
  days: CalendarDay[];
  sankranti: Sankranti[];
}
