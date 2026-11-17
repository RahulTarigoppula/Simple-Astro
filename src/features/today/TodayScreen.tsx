// Today's almanac: the Hindu calendar (pañcāṅga) for where the reader is now (the place set in
// Settings, else the chosen person's birthplace, else Bengaluru), never GPS,
// computed on the device. The day in plain words first, then the five limbs, the times of day,
// the good and bad slots, the planet hours and the month.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile, useHere, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { DISCLAIMER } from "../../components/ui/Colophon";
import { InfoDot } from "../../components/ui/Explain";
import { SegPill, useKeepInView } from "../../components/ui/gesture/SegPill";
import { useArrowKeys } from "../../components/ui/gesture/useArrowKeys";
import { useSwipe } from "../../components/ui/gesture/useSwipe";
import { Reveal } from "../../components/ui/Motion";
import { ChevronLeft, ChevronRight, Page, Section } from "../../components/ui/Page";
import { Sheet } from "../../components/ui/Sheet";
import { skyPhase } from "../../components/ui/SkyScene";
import { glossary } from "../../data/glossary";
import { NAKSHATRA_DEV, NAKSHATRA_NAMES, ORDINAL, RITU_NAMES, VARA_DEV, VARA_NAMES } from "../../data/tables/names";
import { AYANAMSA_LABEL } from "../../engine/ayanamsa";
import type { CalendarPlace } from "../../engine/calendar";
import { ASTRONOMY_ENGINE_VERSION } from "../../engine/ephemeris";
import { brahmaMuhurta, choghadiya, godhuli, horas, MUHURTA_KALA_CITATION } from "../../engine/muhurta";
import { angasAt, computePanchang } from "../../engine/panchang";
import { type EnginePreset, type Panchang, PRESET_HASH, type SunriseMode } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { useUi } from "../../state/ui";
import { SkyEvents } from "../cosmic/SkyEvents";
import { HereLine } from "../here/HereSheet";
import { ayanaDev, ayanaLatin, karanaDev, rituDev, tithiDev, yogaDev } from "./dev";
import { MonthGrid, type Ymd } from "./MonthGrid";
import { MoonPicture, StarField } from "./moon";
import { ChoghadiyaPanel, HoraPanel, QualityMark } from "./Periods";
import { endsLabel, rangeLabel, type ZoneClock, zoneClock } from "./zone";
import "./today.css";

const DAY = 86_400_000;
const MAX_OFFSET = 3660;

interface DeskPlace {
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  zone: string;
}

export const SUNRISE_LABEL: Record<SunriseMode, string> = {
  "upper-limb-refracted": "upper limb on a refracted horizon (as almanacs print)",
  "disc-centre": "disc centre at altitude 0°, no refraction",
};

interface DayLeaf {
  p: Panchang;
  atMs: number;
  moonSid: number;
}

/** The leaf for `offset` days from the base instant. Offset 0 reads the present moment; any other
 *  day reads that day's governing sunrise, as a printed pañcāṅga does. */
function leafFor(baseMs: number, offset: number, place: DeskPlace, preset: EnginePreset, base: Panchang): DayLeaf {
  const geo = { lat: place.lat, lon: place.lon, ...(place.elevation !== undefined ? { elevation: place.elevation } : {}) };
  if (offset === 0) return { p: base, atMs: baseMs, moonSid: angasAt(baseMs, preset.ayanamsa).moonSid };
  const noon = (base.sunriseMs + base.sunsetMs) / 2 + offset * DAY;
  const probe = computePanchang(noon, geo, preset);
  const at = probe.sunriseMs + 1000;
  return { p: computePanchang(at, geo, preset), atMs: at, moonSid: angasAt(at, preset.ayanamsa).moonSid };
}

const WEEKDAY = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
const SEASON = ["Spring", "Summer", "Rains", "Autumn", "Early winter", "Late winter"] as const;

/** The lunar day as a family member would say it. */
export function tithiWords(t: Panchang["tithi"]): string {
  if (t.index === 15) return "Full Moon day";
  if (t.index === 30) return "New Moon day";
  return `${ORDINAL(((t.index - 1) % 15) + 1)} day of the ${t.paksha === "shukla" ? "growing" : "fading"} Moon`;
}

interface Foot {
  title: string;
  dev?: string;
  lines: Array<[string, string]>;
  note?: string;
  /** Glossary entry for the plain-English explanation. */
  explain?: string;
  /** Where this item's myth lives in Explore. */
  story?: string;
}

interface RowSpec {
  id: string;
  /** The traditional name: "Tithi", "Rāhu Kāla". */
  k: string;
  /** What it is, in plain words. */
  plain: string;
  /** The small line under the plain words, when it says more than the traditional name. */
  term?: string;
  /** The window's two instants, for rows that are a stretch of the clock. */
  span?: readonly [number, number];
  v: React.ReactNode;
  /** The value again as plain text, for the row's accessible name. */
  text: string;
  end?: string;
  tone?: "avoid" | "good";
  /** Glossary entry behind the ⓘ and "Tell me more". */
  info?: string;
  foot: Foot;
}

function instantLines(clock: ZoneClock, label: string, ms: number): Array<[string, string]> {
  return [
    [label, `${clock.hms(ms)} · ${clock.dateLong(ms)}`],
    ["Zone", `${clock.zone} · ${clock.offset(ms)}`],
    [
      "UTC",
      new Date(ms)
        .toISOString()
        .replace("T", " ")
        .replace(/\.\d+Z$/, "Z"),
    ],
  ];
}

function buildRows(leaf: DayLeaf, clock: ZoneClock, preset: EnginePreset): { limbs: RowSpec[]; times: RowSpec[]; season: RowSpec[] } {
  const { p } = leaf;
  const dayMs = p.sunriseMs;
  const conv: Array<[string, string]> = [
    ["Day", `sunrise ${clock.hms(p.sunriseMs)} → sunrise ${clock.hms(p.nextSunriseMs)}`],
    ["Sunrise", SUNRISE_LABEL[preset.sunrise]],
    ["Ayanāṃśa", AYANAMSA_LABEL[preset.ayanamsa]],
  ];
  const ending = (title: string, dev: string, endMs: number, what: string): Foot => ({
    title,
    dev,
    lines: [...instantLines(clock, "Ends", endMs), ...conv],
    note: `${what} The end is a root found on the Sun's and Moon's longitudes to within a quarter of a second.`,
  });
  const range = (title: string, dev: string, r: readonly [number, number], what: string): Foot => ({
    title,
    dev,
    lines: [
      ["From", `${clock.hms(r[0])} · ${clock.dateLong(r[0])}`],
      ["Until", `${clock.hms(r[1])} · ${clock.dateLong(r[1])}`],
      ["Zone", `${clock.zone} · ${clock.offset(r[0])}`],
      ...conv,
    ],
    note: what,
  });

  const tDev = tithiDev(p.tithi);
  const nDev = NAKSHATRA_DEV[p.nakshatra.index] ?? "";
  const nName = NAKSHATRA_NAMES[p.nakshatra.index] ?? p.nakshatra.name;
  const yDev = yogaDev(p.yoga.index);
  const kDev = karanaDev(p.karana.name);
  const vDev = VARA_DEV[p.vara.index];
  const waxing = p.elongation < 180;
  const pct = Math.round(p.moonIllumination * 100);
  const lightMs = p.sunsetMs - p.sunriseMs;
  const moonText = `${p.moonriseMs !== null ? clock.hm12(p.moonriseMs) : "-"} to ${p.moonsetMs !== null ? clock.hm12(p.moonsetMs) : "-"}`;
  const season = SEASON[RITU_NAMES.indexOf(p.ritu as (typeof RITU_NAMES)[number])] ?? "";
  const timed = (r: readonly [number, number]) => {
    const t = rangeLabel(clock, r);
    return { v: t, text: t, span: r };
  };

  const limbs: RowSpec[] = [
    {
      id: "tithi",
      k: "Tithi",
      plain: "Lunar day",
      info: "tithi",
      v: p.tithi.name,
      text: p.tithi.name,
      end: endsLabel(clock, p.tithi.endMs, dayMs),
      foot: ending(p.tithi.name, tDev, p.tithi.endMs, `Tithi ${p.tithi.index} of 30. Each is 12° of the Moon pulling away from the Sun.`),
    },
    {
      id: "vara",
      k: "Vāra",
      plain: "Weekday",
      info: "vara",
      term: `Vāra · ${VARA_NAMES[p.vara.index]}`,
      v: WEEKDAY[p.vara.index],
      text: `${WEEKDAY[p.vara.index]}, ${VARA_NAMES[p.vara.index]}`,
      end: endsLabel(clock, p.nextSunriseMs, dayMs),
      foot: {
        title: VARA_NAMES[p.vara.index],
        dev: vDev,
        lines: [...instantLines(clock, "Until", p.nextSunriseMs), ...conv],
        note: "The weekday belongs to the governing sunrise, not to the calendar date: the day runs sunrise to sunrise.",
      },
    },
    {
      id: "nakshatra",
      k: "Nakṣatra",
      plain: "Moon's star",
      info: "nakshatra",
      term: `Nakṣatra · quarter ${p.nakshatra.pada}`,
      v: nName,
      text: `${nName}, pada ${p.nakshatra.pada}`,
      end: endsLabel(clock, p.nakshatra.endMs, dayMs),
      foot: {
        ...ending(
          `${nName}, pada ${p.nakshatra.pada}`,
          nDev,
          p.nakshatra.endMs,
          "The Moon's sidereal mansion: 13°20′ each, four padas of 3°20′.",
        ),
        story: `/explore/nakshatra/${p.nakshatra.index}`,
      },
    },
    {
      id: "yoga",
      k: "Yoga",
      plain: "Sun + Moon",
      info: "yoga-panchang",
      v: p.yoga.name,
      text: p.yoga.name,
      end: endsLabel(clock, p.yoga.endMs, dayMs),
      foot: ending(p.yoga.name, yDev, p.yoga.endMs, `Yoga ${p.yoga.index} of 27: the sum of the sidereal Sun and Moon in steps of 13°20′.`),
    },
    {
      id: "karana",
      k: "Karaṇa",
      plain: "Half lunar day",
      info: "karana",
      v: p.karana.name,
      text: p.karana.name,
      end: endsLabel(clock, p.karana.endMs, dayMs),
      foot: ending(p.karana.name, kDev, p.karana.endMs, `Karaṇa ${p.karana.index} of 60: half a tithi, 6° of elongation.`),
    },
  ];

  const times: RowSpec[] = [
    {
      id: "sun",
      k: "Sunrise and sunset",
      plain: `Daylight here: ${Math.floor(Math.round(lightMs / 60_000) / 60)} h ${String(Math.round(lightMs / 60_000) % 60).padStart(2, "0")} min`,
      ...timed([p.sunriseMs, p.sunsetMs]),
      foot: range(
        "Sunrise and sunset",
        "सूर्योदय · सूर्यास्त",
        [p.sunriseMs, p.sunsetMs],
        p.polar
          ? `The Sun neither rises nor sets here today (${p.polar}); the day is local apparent noon ± 6 hours.`
          : "Daylight at this place, under the sunrise convention below.",
      ),
    },
    {
      id: "moon",
      k: "Moonrise and moonset",
      plain: "Moon above the horizon",
      v: moonText,
      text: moonText,
      foot: {
        title: "Moonrise and moonset",
        dev: "चन्द्रोदय · चन्द्रास्त",
        lines: [
          ["Rises", p.moonriseMs !== null ? `${clock.hms(p.moonriseMs)} · ${clock.dateLong(p.moonriseMs)}` : "not within this Hindu day"],
          ["Sets", p.moonsetMs !== null ? `${clock.hms(p.moonsetMs)} · ${clock.dateLong(p.moonsetMs)}` : "not within this Hindu day"],
          ["Zone", `${clock.zone} · ${clock.offset(p.sunriseMs)}`],
        ],
        note: "Searched between this sunrise and the next.",
      },
    },
    {
      id: "rahu",
      k: "Rāhu Kāla",
      plain: "Avoid starting new things",
      info: "rahu-kala",
      tone: "avoid",
      ...timed(p.rahuKaal),
      foot: range(
        "Rāhu Kāla",
        "राहु काल",
        p.rahuKaal,
        "One eighth of the daylight, its slot fixed by the weekday. Tradition sets new undertakings aside in it.",
      ),
    },
    {
      id: "yama",
      k: "Yamagaṇḍa",
      plain: "Also avoided",
      info: "rahu-kala",
      tone: "avoid",
      ...timed(p.yamaganda),
      foot: range("Yamagaṇḍa", "यमगण्ड", p.yamaganda, "One eighth of the daylight, its slot fixed by the weekday."),
    },
    {
      id: "gulika",
      k: "Gulika",
      plain: "Also avoided",
      info: "rahu-kala",
      tone: "avoid",
      ...timed(p.gulika),
      foot: range("Gulika Kāla", "गुलिक काल", p.gulika, "One eighth of the daylight, its slot fixed by the weekday."),
    },
    p.abhijit
      ? {
          id: "abhijit",
          k: "Abhijit",
          plain: "Good midday window",
          info: "muhurta",
          tone: "good",
          ...timed(p.abhijit),
          foot: range("Abhijit Muhūrta", "अभिजित् मुहूर्त", p.abhijit, "Local apparent noon ± one thirtieth of the daylight."),
        }
      : {
          id: "abhijit",
          k: "Abhijit",
          plain: "Good midday window",
          info: "muhurta",
          v: "not observed on Budhavāra",
          text: "not observed on Budhavāra",
          foot: {
            title: "Abhijit Muhūrta",
            dev: "अभिजित् मुहूर्त",
            lines: conv,
            note: "By convention the Abhijit muhūrta is not observed on a Wednesday.",
          },
        },
    {
      id: "brahma",
      k: "Brahma-muhūrta",
      plain: "Pre-dawn hour for prayer and study",
      info: "muhurta",
      tone: "good",
      ...timed(brahmaMuhurta(p.sunriseMs)),
      foot: range(
        "Brahma-muhūrta",
        "ब्राह्म मुहूर्त",
        brahmaMuhurta(p.sunriseMs),
        `The second-to-last muhūrta of the night before this sunrise: 96 to 48 minutes before it. Source: ${MUHURTA_KALA_CITATION.text}.`,
      ),
    },
    {
      id: "godhuli",
      k: "Godhūli",
      plain: "Dusk, good for weddings",
      info: "muhurta",
      tone: "good",
      ...timed(godhuli(p.sunsetMs)),
      foot: range(
        "Godhūli",
        "गोधूलि",
        godhuli(p.sunsetMs),
        `The hour of cow-dust: one ghaṭī (24 minutes) centred on sunset. Source: ${MUHURTA_KALA_CITATION.text}.`,
      ),
    },
  ];

  const seasonRows: RowSpec[] = [
    {
      id: "masa",
      k: "Māsa",
      plain: "Hindu lunar month",
      info: "panchang",
      v:
        p.masaPurnimanta !== p.masaAmanta
          ? `${p.masaAmanta} (amānta) · ${p.masaPurnimanta} (pūrṇimānta)`
          : `${p.masaAmanta}, in both conventions`,
      text:
        p.masaPurnimanta !== p.masaAmanta
          ? `${p.masaAmanta} amānta, ${p.masaPurnimanta} pūrṇimānta`
          : `${p.masaAmanta}, in both conventions`,
      foot: {
        title: "Māsa",
        dev: "मास",
        lines: [
          ["Amānta", `${p.masaAmanta}: months end at Amāvasyā (the south and west)`],
          ["Pūrṇimānta", `${p.masaPurnimanta}: months end at Pūrṇimā (the north)`],
          ["Ayanāṃśa", AYANAMSA_LABEL[preset.ayanamsa]],
        ],
        note: "Named by the sidereal Sun's sign at the governing new moon. Both conventions are printed because the circle spans both.",
      },
    },
    {
      id: "ritu",
      k: "Ṛtu · ayana",
      plain: "Season and half-year",
      info: "panchang",
      v: `${season ? `${season} · ` : ""}${p.ritu} · ${ayanaLatin(p.ayana)}`,
      text: `${season ? `${season}, ` : ""}${p.ritu}, ${ayanaLatin(p.ayana)}`,
      foot: {
        title: `${p.ritu} · ${ayanaLatin(p.ayana)}`,
        dev: `${rituDev(p.ritu)} · ${ayanaDev(p.ayana)}`,
        lines: [
          ["Ṛtu", `${p.ritu}: the season, two lunar months each`],
          ["Ayana", `${ayanaLatin(p.ayana)}, by the sidereal Sun (Makara to Karka is Uttarāyaṇa)`],
        ],
      },
    },
    {
      id: "illum",
      k: "Moon",
      plain: "How full the Moon is",
      v: `${pct}% lit · ${waxing ? "growing (waxing)" : "fading (waning)"}`,
      text: `${pct}% lit, ${waxing ? "waxing" : "waning"}`,
      foot: {
        title: "The Moon's light",
        dev: "चन्द्र",
        lines: [
          ["Lit", `${(p.moonIllumination * 100).toFixed(1)} % of the disc`],
          ["Elongation", `${p.elongation.toFixed(2)}° (Moon − Sun)`],
          ["At", `${clock.hms(leaf.atMs)} · ${clock.dateLong(leaf.atMs)}`],
        ],
      },
    },
  ];
  return { limbs, times, season: seasonRows };
}

/** A fact of the day: what it is in plain words, its traditional name small, its value, and when it ends. */
function LimbRows({ rows, onOpen, label, plain }: { rows: RowSpec[]; onOpen: (r: RowSpec) => void; label: string; plain?: boolean }) {
  return (
    <ul className={plain ? "alm-rows alm-rows--plain" : "v-list alm-rows"} aria-label={label}>
      {rows.map((r) => (
        <li key={r.id}>
          <button
            type="button"
            className="alm-row"
            onClick={() => onOpen(r)}
            aria-haspopup="dialog"
            aria-label={`${r.k} (${r.plain}): ${r.text}${r.end ? `, ${r.end}` : ""}. Details`}
          >
            <span className="alm-row__l">
              <span className="alm-row__k">{r.plain}</span>
              <span className="alm-row__s">{r.term ?? r.k}</span>
            </span>
            <span className="alm-row__r">
              <span className="alm-row__v">{r.v}</span>
              {r.end ? <span className="alm-row__s">{r.end}</span> : null}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const TONE_WORD = { avoid: "Avoid", good: "Good" } as const;

/** The windows tradition favours, or sets aside: a word and a mark on top, then each window with its clock times. */
function Windows({
  tone,
  rows,
  clock,
  onOpen,
}: {
  tone: "good" | "avoid";
  rows: RowSpec[];
  clock: ZoneClock;
  onOpen: (r: RowSpec) => void;
}) {
  const label = tone === "good" ? "Good times" : "Times to avoid";
  return (
    <div className="v-card v-card--flush alm-win" data-kind={tone}>
      <h3 className="alm-win__h">
        <span className="alm-win__mark">
          <QualityMark q={tone === "good" ? "good" : "bad"} />
        </span>
        {TONE_WORD[tone]}
      </h3>
      <ul className="alm-rows alm-rows--plain" aria-label={label}>
        {rows.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              className="alm-row alm-row--win"
              onClick={() => onOpen(r)}
              aria-haspopup="dialog"
              aria-label={`${r.k}: ${r.tone ? `${TONE_WORD[r.tone]}. ` : ""}${r.plain}, ${r.text}. Details`}
            >
              <span className="alm-row__l">
                <span className="alm-row__k">{r.k}</span>
                <span className="alm-row__s">{r.plain}</span>
              </span>
              {r.span ? (
                <span className="alm-row__r alm-row__r--time">
                  <span className="alm-row__v">{clock.hm12(r.span[0])}</span> <span className="alm-row__s">to {clock.hm12(r.span[1])}</span>
                </span>
              ) : (
                <span className="alm-row__r">
                  <span className="alm-row__s">{r.v}</span>
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

type Tab = "day" | "chog" | "hora" | "month";
/** `label` is the tab's name; on a narrow phone only `short` is shown, and it is always part of the name. */
const TABS: ReadonlyArray<{ id: Tab; label: string; lead?: string; short: string }> = [
  { id: "day", label: "Day", short: "Day" },
  { id: "chog", label: "Good & bad slots", lead: "Good & bad ", short: "slots" },
  { id: "hora", label: "Planet hours", lead: "Planet ", short: "hours" },
  { id: "month", label: "Month", short: "Month" },
];

/** The civil date of an instant on the place's calendar. */
function ymdOf(clock: ZoneClock, ms: number): Ymd {
  const d = new Date(clock.dayNumber(ms) * DAY);
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() };
}
const dayNumberOf = (v: Ymd): number => Math.round(Date.UTC(v.y, v.m - 1, v.d) / DAY);

function Tabs({ tab, onTab }: { tab: Tab; onTab: (t: Tab) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useKeepInView(ref, tab);
  const onKey = (e: React.KeyboardEvent) => {
    const i = TABS.findIndex((t) => t.id === tab);
    const j =
      e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : e.key === "Home" ? 0 : e.key === "End" ? TABS.length - 1 : null;
    if (j === null) return;
    e.preventDefault();
    const next = TABS[(j + TABS.length) % TABS.length];
    if (!next) return;
    onTab(next.id);
    ref.current?.querySelector<HTMLButtonElement>(`#tab-${next.id}`)?.focus();
  };
  return (
    <div ref={ref} className="v-seg v-seg--pill alm-seg" role="tablist" aria-label="Almanac views" data-noswipe="" onKeyDown={onKey}>
      {TABS.map((t) => (
        <button
          key={t.id}
          id={`tab-${t.id}`}
          type="button"
          role="tab"
          aria-label={t.label}
          aria-selected={tab === t.id}
          aria-controls={tab === t.id ? `panel-${t.id}` : undefined}
          tabIndex={tab === t.id ? 0 : -1}
          onClick={() => onTab(t.id)}
        >
          {tab === t.id ? <SegPill id="alm-view" /> : null}
          <span>
            {t.lead ? <span className="alm-seg__lead">{t.lead}</span> : null}
            <span className="alm-seg__short">{t.short}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

/** Whole days from today to the `d=YYYY-MM-DD` in the address, 0 when absent or not a date. Kept within ten years. */
export function offsetFromQuery(hash: string, now: Date = new Date()): number {
  const m = /[?&]d=(\d{4})-(\d{2})-(\d{2})(?:&|$)/.exec(hash);
  if (!m) return 0;
  const target = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const today = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const n = Math.round((target - today) / 86_400_000);
  return Number.isFinite(n) && Math.abs(n) <= 3660 ? n : 0;
}

export default function TodayScreen() {
  const active = useActiveProfile();
  const settings = useSettings();
  // The settings row is re-merged on every read; hold the preset by value so memos stay put.
  const presetRef = useRef(settings.preset);
  if (PRESET_HASH(presetRef.current) !== PRESET_HASH(settings.preset)) presetRef.current = settings.preset;
  const preset = presetRef.current;
  // The base instant is the moment the almanac was opened; a 30 s tick moves "now" (the slot and
  // planet-hour highlight) and, once it passes the next sunrise, re-bases on the new day.
  const [baseMs, setBaseMs] = useState(() => Date.now());
  const tickMs = useNowMs(30_000);
  // `?d=YYYY-MM-DD` opens the almanac on that day (the festival list links here).
  const [offset, setOffset] = useState(() => offsetFromQuery(window.location.hash));
  const [foot, setFoot] = useState<Foot | null>(null);
  const setExplain = useUi((s) => s.setExplain);
  const [tab, setTab] = useState<Tab>("day");

  // Where the reader is now: the place set in Settings, else the person's birthplace, else Bengaluru.
  const { name: hereName, lat: hereLat, lon: hereLon, zone: hereZone, birthplace } = useHere(active);
  const loading = active === undefined;
  // The birthplace's own height above the sea is kept while the birthplace stands in.
  const elevation = birthplace ? active?.birth.place.elevation : undefined;
  const place = useMemo<DeskPlace | null>(
    () =>
      loading ? null : { name: hereName, lat: hereLat, lon: hereLon, zone: hereZone, ...(elevation !== undefined ? { elevation } : {}) },
    [loading, hereName, hereLat, hereLon, hereZone, elevation],
  );
  const clock = zoneClock(hereZone);
  const calPlace = useMemo<CalendarPlace | null>(
    () =>
      place
        ? { lat: place.lat, lon: place.lon, zone: place.zone, ...(place.elevation !== undefined ? { elevation: place.elevation } : {}) }
        : null,
    [place],
  );

  const base = useMemo(() => {
    if (!place) return null;
    try {
      const geo = { lat: place.lat, lon: place.lon, ...(place.elevation !== undefined ? { elevation: place.elevation } : {}) };
      return computePanchang(baseMs, geo, preset);
    } catch {
      return null;
    }
  }, [place, baseMs, preset]);

  const leaf = useMemo<DayLeaf | null>(() => {
    if (!place || !base) return null;
    try {
      return leafFor(baseMs, offset, place, preset, base);
    } catch {
      return null;
    }
  }, [place, base, baseMs, offset, preset]);

  const nextSunriseMs = base?.nextSunriseMs ?? null;
  useEffect(() => {
    if (offset === 0 && nextSunriseMs !== null && tickMs >= nextSunriseMs) setBaseMs(tickMs);
  }, [offset, nextSunriseMs, tickMs]);

  // A different person, place or preset starts again from today.
  const placeKey = place ? `${place.lat}|${place.lon}|${place.zone}` : "";
  const lastPlaceKey = useRef("");
  useEffect(() => {
    if (!placeKey || placeKey === lastPlaceKey.current) return;
    // The place blinks out while the profiles reload; only a different place is a new start.
    if (lastPlaceKey.current) setOffset(0);
    lastPlaceKey.current = placeKey;
  }, [placeKey]);

  const step = (delta: number) => {
    if (delta === 0) return;
    setOffset((o) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, o + delta)));
    for (let i = 0; i < Math.min(3, Math.abs(delta)); i++) play("tick");
    haptics.selection();
  };

  // The same step from a swipe on the band or an arrow key as from the two arrow buttons.
  const [dir, setDir] = useState<"next" | "prev" | null>(null);
  const turn = (delta: 1 | -1) => {
    setDir(delta === 1 ? "next" : "prev");
    step(delta);
  };
  const swipe = useSwipe({ onLeft: () => turn(1), onRight: () => turn(-1) });
  useArrowKeys(
    () => turn(-1),
    () => turn(1),
  );

  const rows = leaf ? buildRows(leaf, clock, preset) : null;

  const p = leaf?.p;
  const periods = useMemo(
    () =>
      p
        ? {
            chog: choghadiya(p.sunriseMs, p.sunsetMs, p.nextSunriseMs, p.vara.index),
            hora: horas(p.sunriseMs, p.sunsetMs, p.nextSunriseMs, p.vara.index),
          }
        : null,
    [p],
  );
  const nowMs = offset === 0 && leaf ? Math.max(leaf.atMs, tickMs) : null;

  // The month on show follows the day; the month's own buttons may wander from it.
  const leafYmd = p ? ymdOf(clock, p.sunriseMs) : null;
  const todayYmd = ymdOf(clock, baseMs);
  const [ym, setYm] = useState<{ y: number; m: number } | null>(null);
  const leafMonthKey = leafYmd ? `${leafYmd.y}-${leafYmd.m}` : "";
  useEffect(() => {
    if (!leafMonthKey) return;
    const [y = 0, m = 1] = leafMonthKey.split("-").map(Number);
    setYm({ y, m });
  }, [leafMonthKey]);
  const shownYm = ym ?? (leafYmd ? { y: leafYmd.y, m: leafYmd.m } : null);

  const pick = (v: Ymd) => {
    if (!base) return;
    const target = dayNumberOf(v) - clock.dayNumber(base.sunriseMs);
    setDir(null);
    step(target - offset);
    setTab("day"); // the grid is its own view: picking a day shows that day
  };

  const rel = offset === 0 ? "Today" : offset === 1 ? "Tomorrow" : offset === -1 ? "Yesterday" : null;
  const south = (place?.lat ?? 0) < 0;
  const waxing = p ? p.elongation < 180 : true;
  const lit = p ? Math.round(p.moonIllumination * 100) : 0;
  const city = place ? (place.name.split(",")[0] ?? place.name) : "";

  const openFoot = (r: RowSpec) => setFoot(r.info ? { ...r.foot, explain: r.info } : r.foot);

  // In the order of the clock: before dawn, midday, dusk.
  const good = rows ? ["brahma", "abhijit", "godhuli"].flatMap((id) => rows.times.filter((r) => r.id === id)) : [];
  const avoid = rows ? rows.times.filter((r) => r.tone === "avoid") : [];
  const more = rows ? [...rows.times.filter((r) => r.id === "moon"), ...rows.season] : [];

  // The sky behind the Moon is the sky of the moment on show: now for today, sunrise for any other day.
  const sky = p ? skyPhase(offset === 0 ? tickMs : (leaf?.atMs ?? tickMs), p.sunriseMs, p.sunsetMs) : "night";
  const starK = sky === "night" ? 1 : sky === "dusk" || sky === "dawn" ? 0.45 : 0;
  const ready = !!place && !!p && !!periods && !!rows;

  const hero =
    ready && p ? (
      <section
        className="alm-band v-swipe"
        data-compact={tab === "day" ? undefined : ""}
        data-dir={dir ?? undefined}
        {...swipe}
        aria-label={`${rel ? `${rel}, ` : ""}${clock.dateLong(p.sunriseMs)}`}
      >
        <StarField strength={starK} />
        <div className="alm-band__text">
          <p className="alm-band__eyebrow">
            Almanac{rel ? ` · ${rel}` : ""} <InfoDot id="panchang" />
          </p>
          <div className="alm-band__nav">
            <button type="button" className="v-iconbtn" aria-label="Previous day" onClick={() => turn(-1)}>
              <ChevronLeft />
            </button>
            <p className="alm-band__date" aria-live="polite">
              {clock.dateLong(p.sunriseMs)}
            </p>
            <button type="button" className="v-iconbtn" aria-label="Next day" onClick={() => turn(1)}>
              <ChevronRight size={20} />
            </button>
          </div>
          <h1 className="alm-band__title">{tithiWords(p.tithi)}</h1>
          <p className="alm-band__small">
            {p.tithi.name} · Moon {lit}% lit <InfoDot id="tithi" />
          </p>
          <p className="alm-band__chips">
            <span>
              <span>Sunrise</span> <b>{clock.hm12(p.sunriseMs)}</b>
            </span>
            <span>
              <span>Sunset</span> <b>{clock.hm12(p.sunsetMs)}</b>
            </span>
            <span>
              <span>Moon's star</span> <b>{NAKSHATRA_NAMES[p.nakshatra.index] ?? p.nakshatra.name}</b>
            </span>
          </p>
          {offset !== 0 ? (
            <button
              type="button"
              className="v-btn v-btn--ghost v-btn--sm alm-band__back"
              onClick={() => {
                setDir(offset > 0 ? "prev" : "next");
                step(-offset);
              }}
            >
              Back to today
            </button>
          ) : null}
        </div>
        <div className="alm-band__moon v-slide" key={p.sunriseMs}>
          <MoonPicture
            elongation={p.elongation}
            south={south}
            dark={sky === "night" || sky === "dusk"}
            label={`The Moon: ${lit}% lit, ${waxing ? "growing" : "fading"}`}
          />
        </div>
        <Tabs tab={tab} onTab={setTab} />
      </section>
    ) : (
      <section className="alm-band">
        <div className="alm-band__text">
          <p className="alm-band__eyebrow">Almanac</p>
          <h1 className="alm-band__title">Today's almanac</h1>
        </div>
      </section>
    );

  return (
    <Page label="Today's almanac" back="/" wide className="alm" hero={hero} sky={sky}>
      {!place ? (
        <div className="v-sk" role="status" aria-busy="true">
          <span className="v-sk__label">Reading the sky…</span>
          <div className="v-sk--card" aria-hidden="true">
            <i className="v-sk--line" style={{ "--w": "48%" } as React.CSSProperties} />
            <i className="v-sk--line" />
            <i className="v-sk--line" style={{ "--w": "72%" } as React.CSSProperties} />
            <i className="v-sk--line" style={{ "--w": "86%" } as React.CSSProperties} />
          </div>
          <div className="v-sk--card" aria-hidden="true">
            <i className="v-sk--line" style={{ "--w": "36%" } as React.CSSProperties} />
            <i className="v-sk--line" style={{ "--w": "80%" } as React.CSSProperties} />
          </div>
        </div>
      ) : !p || !periods || !rows ? (
        <div className="v-note v-note--warn" role="status">
          The almanac could not be read for this place.
        </div>
      ) : (
        <>
          <div className="alm-where">
            <HereLine profile={active} />
            {!active || offset !== 0 ? (
              <p className="v-small v-muted">
                {!active ? (
                  <>
                    No one saved yet. <Link to="/leaf/new">Add a person</Link>{" "}
                  </>
                ) : null}
                {offset !== 0 ? <>Read at sunrise, {clock.hm12(p.sunriseMs)}.</> : null}
              </p>
            ) : null}
          </div>

          <div className="alm-panel" role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
            {tab === "day" ? (
              <>
                {p.polar ? (
                  <div className="v-note v-note--warn">
                    The Sun neither rises nor sets here today ({p.polar === "midnight-sun" ? "midnight sun" : "polar night"}); the day is
                    taken as local noon ± 6 hours.
                  </div>
                ) : null}
                <div className="v-cols">
                  <Reveal i={0} className="v-stack">
                    <Section title="The five parts of the day" note="Tap a row for the exact times" />
                    <LimbRows rows={rows.limbs} onOpen={openFoot} label="The five parts of the day" />
                  </Reveal>
                  <Reveal i={1} className="v-stack">
                    <Section title="Times of day" note="What tradition favours and what it sets aside" />
                    <Windows tone="good" rows={good} clock={clock} onOpen={openFoot} />
                    <Windows tone="avoid" rows={avoid} clock={clock} onOpen={openFoot} />
                  </Reveal>
                </div>
                <Reveal i={2}>
                  <details className="v-fold">
                    <summary>
                      <span>
                        More about this day
                        <span className="v-fold__s">Moonrise, the Hindu month and the season</span>
                      </span>
                    </summary>
                    <div className="v-fold__body">
                      <LimbRows rows={more} onOpen={openFoot} label="More about this day" plain />
                    </div>
                  </details>
                </Reveal>
                <SkyEvents
                  nowMs={tickMs}
                  place={{ lat: place.lat, lon: place.lon, name: city }}
                  zone={place.zone}
                  preset={preset}
                  days={40}
                  limit={3}
                />
              </>
            ) : tab === "chog" ? (
              <ChoghadiyaPanel day={periods.chog.day} night={periods.chog.night} clock={clock} dayMs={p.sunriseMs} nowMs={nowMs} />
            ) : tab === "hora" ? (
              <HoraPanel day={periods.hora.day} night={periods.hora.night} clock={clock} dayMs={p.sunriseMs} nowMs={nowMs} />
            ) : calPlace && shownYm ? (
              <MonthGrid
                place={calPlace}
                preset={preset}
                clock={clock}
                ym={shownYm}
                onMonth={setYm}
                today={todayYmd}
                selected={leafYmd}
                south={south}
                onPick={pick}
                onOpenLeaf={() => setTab("day")}
              />
            ) : null}
          </div>

          <details className="v-fold">
            <summary>
              <span>
                How this is worked out
                <span className="v-fold__s">Place, time zone and conventions</span>
              </span>
            </summary>
            <div className="v-fold__body">
              <dl className="alm-dl">
                <div>
                  <dt>Place</dt>
                  <dd>
                    {place.name} · {place.lat.toFixed(4)}°, {place.lon.toFixed(4)}°
                  </dd>
                </div>
                <div>
                  <dt>Zone</dt>
                  <dd>
                    {clock.zone} · {clock.offset(p.sunriseMs)} ({birthplace && active ? "the birthplace's" : "this place's"}, not this
                    device's)
                  </dd>
                </div>
                <div>
                  <dt>Sunrise</dt>
                  <dd>{SUNRISE_LABEL[preset.sunrise]}</dd>
                </div>
                <div>
                  <dt>Ayanāṃśa</dt>
                  <dd>{AYANAMSA_LABEL[preset.ayanamsa]}</dd>
                </div>
                <div>
                  <dt>Engine</dt>
                  <dd>astronomy-engine {ASTRONOMY_ENGINE_VERSION} · computed on this device, offline</dd>
                </div>
              </dl>
            </div>
          </details>
          <p className="v-foot">{DISCLAIMER} All computation happened on this device. Nothing left it.</p>
        </>
      )}

      <Sheet open={foot !== null} onClose={() => setFoot(null)} label={foot ? `Details: ${foot.title}` : "Details"}>
        {foot ? (
          <div className="alm-foot">
            <h2>
              {foot.title}
              {foot.dev ? (
                <span lang="hi" className="alm-dev">
                  {" "}
                  {foot.dev}
                </span>
              ) : null}
            </h2>
            {foot.explain && glossary(foot.explain) ? (
              <div className="v-note alm-foot__plain">
                <p>
                  <strong>Simply put: </strong>
                  {glossary(foot.explain)?.short}
                </p>
                <button
                  type="button"
                  className="v-link"
                  onClick={() => {
                    const ex = foot.explain ?? null;
                    setFoot(null);
                    setExplain(ex);
                  }}
                >
                  Tell me more
                </button>
              </div>
            ) : null}
            <dl className="alm-dl">
              {foot.lines.map(([k, v]) => (
                <div key={k}>
                  <dt>{k}</dt>
                  <dd className={/\d{2}:\d{2}/.test(v) ? "alm-dl__num" : undefined}>{v}</dd>
                </div>
              ))}
            </dl>
            {foot.note ? <p className="v-small v-muted">{foot.note}</p> : null}
            <div className="v-actions">
              {foot.story ? (
                <Link to={foot.story} className="v-btn v-btn--ghost v-btn--sm" onClick={() => setFoot(null)}>
                  Read the story of {foot.title.split(",")[0]}
                </Link>
              ) : null}
              <button type="button" className="v-btn v-btn--sm" onClick={() => setFoot(null)}>
                Close
              </button>
            </div>
          </div>
        ) : null}
      </Sheet>
    </Page>
  );
}
