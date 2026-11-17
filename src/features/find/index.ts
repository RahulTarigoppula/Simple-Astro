// Find: one index of everything the app can open, and a ranked search over it.
// Pure: no React, no storage, no clock. Nothing typed here is kept or sent anywhere.
import { GLOSSARY } from "../../data/glossary";
import { GRAHA_LORE, NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { NAKSHATRA_NAMES } from "../../data/tables/names";
import { FESTIVALS } from "../../engine/festivals";
import { ACTIVITIES, type ActivityId } from "../../engine/pickday";

export type FindGroup = "screen" | "person" | "todo" | "sky" | "festival" | "word";

export const GROUP_LABEL: Record<FindGroup, string> = {
  screen: "Screens",
  person: "People",
  todo: "Things to do",
  sky: "Sky",
  festival: "Festivals",
  word: "Words",
};
/** The order groups fall back to when their best matches tie. */
const GROUP_ORDER: readonly FindGroup[] = ["screen", "person", "todo", "sky", "festival", "word"];

export type FindAction =
  | { kind: "go"; to: string }
  /** Make this person the one the app is about. */
  | { kind: "person"; id: string }
  /** Open the plain-English explanation of a glossary term. */
  | { kind: "explain"; id: string };

export type FindIcon =
  | "today"
  | "almanac"
  | "chart"
  | "forecast"
  | "match"
  | "pick"
  | "festival"
  | "family"
  | "journal"
  | "year"
  | "palm"
  | "explore"
  | "people"
  | "settings"
  | "guide"
  | "story"
  | "numbers"
  | "add"
  | "person"
  | "word";

export interface FindItem {
  /** Unique in the index: "screen:forecast-week", "sky:graha-SA". */
  id: string;
  group: FindGroup;
  title: string;
  sub?: string | undefined;
  icon: FindIcon;
  action: FindAction;
  /** Folded text to match against, best first: [0] is the title. */
  keys: string[];
  /** How many of `keys` are names (the title and its other spellings); the rest are plain-word synonyms. */
  names: number;
}

export interface FindPerson {
  id: string;
  name: string;
  /** "14 Mar 1994 · 7:25 am · Bengaluru" */
  sub?: string | undefined;
}

export interface FindContext {
  /** The person the app is about now; null when nobody is saved. */
  activeId: string | null;
  people: readonly FindPerson[];
}

export interface FindHit {
  item: FindItem;
  score: number;
}
export interface FindHitGroup {
  group: FindGroup;
  label: string;
  hits: FindHit[];
}

// ─── text ───────────────────────────────────────────────────────────────────

/** Lower case, no accents or dots, punctuation to spaces: "Sāḍe Sātī" → "sade sati". */
export function fold(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** The way most people type a Sanskrit word: "Śani" → "shani", "Candra" → "chandra", "Kṛṣṇa" → "krishna". */
export function foldLoose(s: string): string {
  return fold(
    s
      .normalize("NFC")
      .replace(/[śṣ]/g, "sh")
      .replace(/[ŚṢ]/g, "Sh")
      .replace(/ṛ/g, "ri")
      .replace(/Ṛ/g, "Ri")
      .replace(/c(?!h)/g, "ch")
      .replace(/C(?!h)/g, "Ch"),
  );
}

const uniq = (list: string[]): string[] => [...new Set(list.filter(Boolean))];

/** Every way a name may be typed: as written, without marks, and the loose spelling; " · " and "," split a name in two. */
function spellings(...names: Array<string | undefined>): string[] {
  const out: string[] = [];
  for (const n of names) {
    if (!n) continue;
    out.push(fold(n), foldLoose(n));
    const parts = n.split(/\s*[·,&/]\s*/);
    if (parts.length > 1) for (const p of parts) out.push(fold(p), foldLoose(p));
  }
  return uniq(out);
}

function make(
  group: FindGroup,
  id: string,
  title: string,
  sub: string | undefined,
  icon: FindIcon,
  action: FindAction,
  names: string[],
  words: string[] = [],
): FindItem {
  const n = uniq([fold(title), ...names]);
  const w = uniq(words.map(fold)).filter((k) => !n.includes(k));
  return { id: `${group}:${id}`, group, title, sub, icon, action, keys: [...n, ...w], names: n.length };
}

// ─── the index ──────────────────────────────────────────────────────────────

const ACTIVITY_WORDS: Record<ActivityId, string[]> = {
  new: ["begin", "start", "new job", "new work", "business", "launch", "open a shop", "sign"],
  travel: ["trip", "journey", "flight", "holiday", "pilgrimage", "yatra", "leave on a trip"],
  talk: ["meeting", "interview", "conversation", "ask", "proposal", "discussion"],
  study: ["school", "class", "learn", "lessons", "exam", "admission", "vidyarambha"],
  home: ["housewarming", "griha pravesh", "shift house", "new house", "moving"],
  buy: ["purchase", "shopping", "vehicle", "car", "furniture"],
  celebrate: ["party", "function", "family event", "birthday", "naming ceremony", "get together"],
  creative: ["art", "music", "writing", "painting", "craft", "design"],
};

const EXTRA_FESTIVALS: ReadonlyArray<readonly [id: string, name: string, sanskrit: string, words: string]> = [
  ["holi", "Holi", "Holī", "colours"],
  ["sankranti", "Makar Sankranti · Pongal", "Makara Saṅkrānti", "uttarayan lohri kite"],
  ["ekadashi", "Ekadashi fast", "Ekādaśī", "fast fasting vrat"],
  ["pradosh", "Pradosh fast", "Pradoṣa", "fast fasting vrat shiva"],
  ["purnima", "Full Moon day", "Pūrṇimā", "full moon poornima"],
  ["amavasya", "New Moon day", "Amāvāsyā", "new moon"],
  ["sankashti", "Sankashti Chaturthi", "Saṅkaṣṭī Caturthī", "ganesha fast vrat"],
  ["eclipse", "Eclipses", "Grahaṇa", "eclipse grahan solar lunar"],
];

/** A few festivals people spell another way. */
const FESTIVAL_WORDS: Record<string, string> = {
  diwali: "deepavali dipavali lakshmi puja lights",
  dussehra: "dasara vijayadashami dashain",
  "navaratri-begins": "navratri durga puja garba",
  "krishna-janmashtami": "gokulashtami",
  "ganesh-chaturthi": "vinayaka chavithi ganpati",
  "raksha-bandhan": "rakhi",
  "maha-shivaratri": "shivratri sivaratri",
  ugadi: "new year yugadi",
};

/**
 * Everything the app can open, with the active person's id filled into every address.
 * `words` on a screen are the plain words someone might type instead of its name.
 */
export function buildIndex(ctx: FindContext): FindItem[] {
  const a = ctx.activeId;
  const items: FindItem[] = [];
  const go = (to: string): FindAction => ({ kind: "go", to });
  const screen = (id: string, title: string, sub: string, icon: FindIcon, to: string, words: string) =>
    items.push(make("screen", id, title, sub, icon, go(to), [], words.split(", ")));

  // ── screens ──
  screen(
    "home",
    "Today",
    "Your day in a word, a number and a sentence",
    "today",
    "/",
    "home, start, my day, daily, horoscope, rashifal, how is today",
  );
  if (!a)
    screen(
      "add",
      "Add a person",
      "A birth date, time and place",
      "add",
      "/leaf/new",
      "new person, birth details, get started, add someone, begin",
    );
  if (a) {
    screen(
      "chart",
      "Chart",
      "Your birth chart, in plain words",
      "chart",
      `/patri/${a}`,
      "birth chart, horoscope, kundli, kundali, janam patri, janma patrika, jatakam, natal chart, about you, about me, rising sign, lagna, ascendant",
    );
    screen(
      "chart-chapters",
      "Life chapters",
      "Chart · the long periods of a life",
      "chart",
      `/patri/${a}?v=chapters`,
      "dasha, dasa, mahadasha, periods, timeline, phases of life, vimshottari",
    );
    screen(
      "chart-planets",
      "Planets in your chart",
      "Chart · where each planet stood",
      "chart",
      `/patri/${a}?v=chart`,
      "planet table, positions, houses, graha, degrees, north chart, south chart, divisional charts, varga, navamsha, yogas, strengths",
    );
    screen(
      "chart-now",
      "Your chart now",
      "Chart · the planets crossing it today",
      "chart",
      `/patri/${a}?v=now`,
      "transits, gochar, sade sati, current planets, now",
    );
    screen(
      "sky-at-birth",
      "Sky at birth",
      "The night sky as it stood when you were born",
      "explore",
      `/patri/${a}/sky`,
      "birth sky, stars at birth, night sky, planetarium, constellations",
    );
    screen(
      "report",
      "Birth report",
      "A full report to print or save",
      "chart",
      `/report/${a}`,
      "print, pdf, save as pdf, share, document, full report, paper, download, export chart",
    );
    screen(
      "forecast",
      "Forecast",
      "Today for you, hour by hour",
      "forecast",
      `/forecast/${a}`,
      "day ahead, today, daily forecast, prediction, horoscope, what is coming, future, life areas, work, love, good times",
    );
    screen(
      "forecast-week",
      "Week ahead",
      "Forecast · the next seven days",
      "forecast",
      `/forecast/${a}?p=week`,
      "this week, weekly, forecast week, seven days",
    );
    screen(
      "forecast-month",
      "Month ahead",
      "Forecast · this month",
      "forecast",
      `/forecast/${a}?p=month`,
      "this month, monthly, forecast month",
    );
    screen(
      "forecast-quarter",
      "Quarter ahead",
      "Forecast · the next three months",
      "forecast",
      `/forecast/${a}?p=quarter`,
      "three months, quarterly, forecast quarter, season",
    );
    screen(
      "forecast-year",
      "Year forecast",
      "Forecast · this year, month by month",
      "forecast",
      `/forecast/${a}?p=year`,
      "this year, yearly, annual, forecast year, twelve months",
    );
  }
  screen(
    "match",
    "Match",
    "How two charts sit together",
    "match",
    "/milan",
    "marriage, wedding, compatibility, guna milan, kundli milan, kundali matching, porutham, partner, couple, love, spouse, husband, wife, relationship, 36 points",
  );
  screen(
    "pick",
    "Pick a good day",
    "The best days ahead for what you want to do",
    "pick",
    a ? `/pick/${a}` : "/pick",
    "muhurta, muhurat, muhurtham, auspicious day, good day, best day, good date, shubh, when should i, choose a date",
  );
  screen(
    "festivals",
    "Festivals",
    "Festivals and fasts, worked out for your place",
    "festival",
    "/festivals",
    "fasts, vrat, holidays, calendar, hindu calendar, festival dates, ekadashi, eclipse, sankranti, puja days",
  );
  screen(
    "family",
    "Family",
    "Everyone's day on one screen",
    "family",
    "/family",
    "household, everyone, together, all of us, relatives, home, family day",
  );
  screen(
    "journal",
    "Journal",
    "A line about your day, kept on this device",
    "journal",
    a ? `/journal/${a}` : "/journal",
    "diary, notes, write, mood, log, my days, how the day went, memories",
  );
  screen(
    "year",
    "Year ahead",
    "Your year as a short story of pictures",
    "year",
    a ? `/year/${a}` : "/year",
    "annual, yearly story, year in pictures, new year, birthday year, 12 months, slides",
  );
  if (a) {
    screen(
      "palm",
      "Palm",
      "A reading from a photo of your hand",
      "palm",
      `/hast/${a}`,
      "palmistry, hand, hast rekha, hasta, lines, heart line, life line, head line, fate line",
    );
    screen(
      "palm-photo",
      "Take a palm photo",
      "Palm · use the camera",
      "palm",
      `/hast/${a}/capture`,
      "camera, capture, scan hand, new palm photo, picture of hand",
    );
  }
  screen(
    "almanac",
    "Almanac",
    "The Hindu calendar for today",
    "almanac",
    "/today",
    "panchang, panchangam, panchanga, calendar, hindu calendar, tithi, lunar day, moon, moon phase, sunrise, sunset, rahu kala, rahu kalam, choghadiya, hora, planet hours, good times, nakshatra today, yoga, karana, weekday",
  );
  screen(
    "explore",
    "Explore",
    "Planets, signs, stars and their stories",
    "explore",
    "/explore",
    "learn, discover, sky, mythology, myths, stories, browse, library, meanings",
  );
  screen(
    "explore-planets",
    "Planets",
    "Explore · the nine planets of the tradition",
    "explore",
    "/explore/graha",
    "grahas, navagraha, nine planets, sun moon mars, all planets",
  );
  screen(
    "explore-signs",
    "Signs",
    "Explore · the twelve signs",
    "explore",
    "/explore/rashi",
    "zodiac, rashi, rasi, twelve signs, sun sign, moon sign, star sign, all signs",
  );
  screen(
    "explore-stars",
    "Birth stars",
    "Explore · the 27 stars of the Moon's path",
    "explore",
    "/explore/nakshatra",
    "nakshatra, nakshatram, 27 stars, janma nakshatra, lunar mansions, constellations, all stars",
  );
  screen(
    "explore-numbers",
    "Numbers",
    "Explore · what a birth date and a name add up to",
    "numbers",
    "/explore/numbers",
    "numerology, name number, birth number, lucky number, life path, personal year",
  );
  screen(
    "explore-chinese",
    "Chinese zodiac",
    "Explore · the animal of your birth year",
    "explore",
    "/explore/chinese",
    "chinese, animal year, dragon, rat, tiger, shengxiao, lunar new year",
  );
  screen(
    "explore-wheel",
    "Sky wheel",
    "Explore · turn the whole sky and tap any part",
    "explore",
    "/explore/wheel",
    "wheel, whole sky, map of the sky, zodiac wheel, ecliptic",
  );
  screen(
    "people",
    "People",
    "Everyone saved on this device",
    "people",
    "/circle",
    "persons, profiles, members, switch person, circle, saved charts, delete a person, relatives",
  );
  if (a) {
    screen(
      "add",
      "Add a person",
      "A birth date, time and place",
      "add",
      "/leaf/new",
      "new person, new chart, birth details, add someone, add family member, child, baby",
    );
    screen(
      "edit",
      "Edit birth details",
      "Change the date, time or place of birth",
      "add",
      `/leaf/${a}/edit`,
      "change birth time, correct, fix, update, rename, birth place, wrong time, tradition, language, regional names, telugu, tamil, hindi",
    );
  }
  screen(
    "settings",
    "Settings",
    "Look, sound, your data and backups",
    "settings",
    "/drawer",
    "options, preferences, theme, dark, light, night, day, look, appearance, backup, restore, export, import, encrypted, password, delete everything, erase, privacy, sound, motion, haptics, chart style, north, south, ayanamsa, lahiri, numerals, where you are now, location, place, advanced, version",
  );
  screen(
    "guide",
    "How to use",
    "A short guide, and every word explained",
    "guide",
    "/guide",
    "help, guide, instructions, manual, tutorial, faq, what does it mean, glossary, dictionary, questions",
  );
  screen(
    "about",
    "About",
    "How Vyomaphala was made",
    "guide",
    "/about",
    "credits, sources, licences, accuracy, who made this, privacy, offline, references, 252 hours",
  );
  screen(
    "story",
    "The story of the stars",
    "How Indian astrology began",
    "story",
    "/story",
    "history, origins, jyotisha, vedic astrology, background, mythology, legend",
  );
  screen(
    "intro",
    "Play the intro",
    "The opening journey through the sky",
    "story",
    "/journey",
    "introduction, opening, welcome, animation, journey, first screen",
  );

  // ── people ──
  for (const p of ctx.people) {
    items.push(
      make(
        "person",
        p.id,
        p.name,
        p.id === a ? `Showing now${p.sub ? ` · ${p.sub}` : ""}` : `Switch to ${p.name}${p.sub ? ` · ${p.sub}` : ""}`,
        "person",
        { kind: "person", id: p.id },
        [],
        p.sub ? p.sub.split(" · ").slice(-1) : [],
      ),
    );
  }

  // ── things to do ──
  for (const act of ACTIVITIES) {
    const to = `${a ? `/pick/${a}` : "/pick"}${act.id === "new" ? "" : `?for=${act.id}`}`;
    items.push(
      make(
        "todo",
        act.id,
        act.label,
        `Pick a good day ${act.phrase}`,
        "pick",
        go(to),
        [fold(`good day ${act.phrase}`), fold(`best day ${act.phrase}`)],
        [act.phrase, ...ACTIVITY_WORDS[act.id]],
      ),
    );
  }

  // ── sky ──
  for (const g of GRAHA_LORE) {
    // Rāhu and Ketu are known by those names, not as "North node" and "South node".
    const node = /node/i.test(g.english);
    items.push(
      make(
        "sky",
        `graha-${g.id}`,
        node ? g.name : g.english,
        `Planet · ${node ? g.english : g.name}, ${g.title.toLowerCase()}`,
        "explore",
        go(`/explore/graha/${g.id}`),
        spellings(g.name, g.english),
        [g.day],
      ),
    );
  }
  RASHI_LORE.forEach((r, i) => {
    items.push(
      make("sky", `rashi-${i}`, r.western, `Sign · ${r.name}, ${r.symbol}`, "explore", go(`/explore/rashi/${i}`), spellings(r.name), [
        r.symbol.replace(/^the /, ""),
      ]),
    );
  });
  NAKSHATRA_LORE.forEach((n, i) => {
    const name = NAKSHATRA_NAMES[i] ?? "";
    if (!name) return;
    items.push(
      make("sky", `nakshatra-${i}`, name, `Birth star · ${n.meaning}`, "explore", go(`/explore/nakshatra/${i}`), spellings(name), [n.star]),
    );
  });

  // ── festivals ──
  const seen = new Set<string>();
  for (const f of FESTIVALS) {
    if (seen.has(f.id)) continue;
    seen.add(f.id);
    items.push(
      make(
        "festival",
        f.id,
        f.name,
        f.note,
        "festival",
        go("/festivals"),
        spellings(f.name, f.sanskrit),
        (FESTIVAL_WORDS[f.id] ?? "").split(" "),
      ),
    );
  }
  for (const [id, name, sanskrit, words] of EXTRA_FESTIVALS) {
    if (seen.has(id)) continue;
    seen.add(id);
    items.push(
      make("festival", id, name, `Festivals · ${sanskrit}`, "festival", go("/festivals"), spellings(name, sanskrit), words.split(" ")),
    );
  }

  // ── words ──
  for (const g of GLOSSARY) {
    items.push(
      make("word", g.id, g.term, g.plain, "word", { kind: "explain", id: g.id }, spellings(g.term, g.id.replace(/-/g, " ")), [g.plain]),
    );
  }
  return items;
}

// ─── search ─────────────────────────────────────────────────────────────────

const STOP = new Set(["a", "an", "the", "to", "for", "of", "my", "me", "is", "in", "on", "and", "what", "when", "how", "do", "i"]);

const EXACT = 100;
const PREFIX = 80;
const WORD = 60;
const INSIDE = 30;

/** How well one folded key answers one folded query: whole, start, start of a word, or somewhere inside. */
function matchKey(key: string, q: string): number {
  if (key === q) return EXACT;
  if (key.startsWith(q)) return PREFIX;
  if (key.includes(` ${q}`)) return WORD;
  if (q.length >= 3 && key.includes(q)) return INSIDE;
  return 0;
}

/** The best any key does: names count a little more than synonyms, the title most of all. */
function matchItem(item: FindItem, q: string): number {
  let best = 0;
  for (let i = 0; i < item.keys.length; i++) {
    const s = matchKey(item.keys[i] as string, q);
    if (!s) continue;
    // One letter is matched against names only: synonyms would bring in half the app.
    if (q.length < 2 && i >= item.names) break;
    const bonus = i === 0 ? 8 : i < item.names ? 5 : 0;
    if (s + bonus > best) best = s + bonus;
  }
  return best;
}

export function scoreItem(item: FindItem, query: string): number {
  const q = fold(query);
  if (!q) return 0;
  const whole = matchItem(item, q);
  const all = q.split(" ");
  const words = all.filter((w) => !STOP.has(w));
  const tokens = words.length ? words : all;
  if (tokens.length < 2) return whole;
  // Several words: each must be found somewhere; the weakest one sets the score, under any whole-phrase match of its kind.
  let weakest = Number.POSITIVE_INFINITY;
  for (const t of tokens) {
    const s = matchItem(item, t);
    if (!s) return whole;
    if (s < weakest) weakest = s;
  }
  return Math.max(whole, Math.round(weakest * 0.7));
}

export interface SearchOptions {
  /** Most results shown in one group (default 6). */
  perGroup?: number;
}

/**
 * Ranked results in groups. Within a group: whole-name matches, then starts, then word starts, then
 * matches inside a word. Groups are ordered by their best match, so the likeliest answer is on top.
 */
export function search(index: readonly FindItem[], query: string, opts: SearchOptions = {}): FindHitGroup[] {
  const perGroup = opts.perGroup ?? 6;
  if (!fold(query)) return [];
  const by = new Map<FindGroup, FindHit[]>();
  index.forEach((item) => {
    const score = scoreItem(item, query);
    if (score <= 0) return;
    const list = by.get(item.group);
    if (list) list.push({ item, score });
    else by.set(item.group, [{ item, score }]);
  });
  const groups: FindHitGroup[] = [];
  for (const group of GROUP_ORDER) {
    const hits = by.get(group);
    if (!hits) continue;
    // Array.prototype.sort is stable: equal scores keep the order of the index.
    hits.sort((x, y) => y.score - x.score);
    groups.push({ group, label: GROUP_LABEL[group], hits: hits.slice(0, perGroup) });
  }
  groups.sort((x, y) => (y.hits[0]?.score ?? 0) - (x.hits[0]?.score ?? 0));
  return groups;
}

/** All hits in the order they are shown. */
export const flatten = (groups: readonly FindHitGroup[]): FindHit[] => groups.flatMap((g) => g.hits);

/** The big tiles shown before anything is typed, in order. Ids missing from the index (no person yet) are skipped. */
export const TILE_IDS: readonly string[] = [
  "screen:home",
  "screen:chart",
  "screen:forecast",
  "screen:match",
  "screen:pick",
  "screen:festivals",
  "screen:family",
  "screen:journal",
  "screen:year",
  "screen:palm",
  "screen:explore",
  "screen:almanac",
  "screen:people",
  "screen:settings",
  "screen:guide",
];

export function tiles(index: readonly FindItem[]): FindItem[] {
  const byId = new Map(index.map((i) => [i.id, i]));
  const out = TILE_IDS.map((id) => byId.get(id)).filter((i): i is FindItem => !!i);
  const add = byId.get("screen:add");
  // With nobody saved the person's screens are missing: the first tile is the way to add someone.
  return out.length < TILE_IDS.length && add ? [add, ...out] : out;
}

export const ASK_EXAMPLES: readonly string[] = ["good day to travel", "Diwali", "Saturn", "week ahead"];
export const TRY_INSTEAD: readonly string[] = ["forecast", "Moon", "backup"];
