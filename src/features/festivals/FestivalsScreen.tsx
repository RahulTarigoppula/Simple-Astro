// Festivals and fasts: the Hindu festival calendar for the year ahead, worked out on the device from
// the real Moon and Sun for where the reader is. The band answers "what is next?" with the Moon as it
// will look that day; under it, the days ahead by month, each with how its day was chosen.
import { DateTime } from "luxon";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile, useHere, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { Reveal } from "../../components/ui/Motion";
import { ChevronRight, Page } from "../../components/ui/Page";
import { skyPhase } from "../../components/ui/SkyScene";
import { daysUntil, type Festival, type FestivalKind, inDaysWords } from "../../engine/festivals";
import { computePanchang } from "../../engine/panchang";
import { type EnginePreset, PRESET_HASH } from "../../engine/types";
import { compute, peek } from "../../platform/compute";
import { fmt, t12 } from "../forecast/util";
import { HereSheet, townOf } from "../here/HereSheet";
import { MoonPicture, StarField } from "../today/moon";
import "../today/today.css";
import "./festivals.css";

const DAY = 86_400_000;
const HOUR = 3_600_000;
/** The year ahead is read in pieces, soonest first, so the first screen never waits for the rest. */
const PIECES: ReadonlyArray<readonly [number, number]> = [
  [0, 60],
  [61, 150],
  [151, 240],
  [241, 330],
  [331, 365],
];
const FIRST_DAYS = 60;

type Filter = "all" | FestivalKind;
const FILTERS: ReadonlyArray<{ id: Filter; label: string; none: string }> = [
  { id: "all", label: "All", none: "Nothing" },
  { id: "festival", label: "Festivals", none: "No festival" },
  { id: "fast", label: "Fasts", none: "No fast" },
  { id: "solar", label: "Sky", none: "No eclipse or change of the Sun's sign" },
];
/** "Sky" gathers the Sun's sign changes and the eclipses. */
const inFilter = (f: Festival, filter: Filter): boolean =>
  filter === "all" || f.kind === filter || (filter === "solar" && f.kind === "eclipse");

interface Ahead {
  list: Festival[];
  /** How many pieces of the year have been read. */
  pieces: number;
  failed: boolean;
}

const pieceKey = (key: string, i: number): string => `${key}|${i}`;

/** What is already kept of the year for this day, place and preset: the pieces read so far, in order. */
function kept(key: string): Ahead & { key: string } {
  const list: Festival[] = [];
  const seen = new Set<string>();
  let pieces = 0;
  for (; pieces < PIECES.length; pieces++) {
    const got = peek("festivalsBetween", pieceKey(key, pieces));
    if (!got) break;
    for (const f of got) {
      if (seen.has(f.key)) continue;
      seen.add(f.key);
      list.push(f);
    }
  }
  return { key, list, pieces, failed: false };
}

/** The festivals from today on: the next two months first, then the rest of the year, all read in the background. */
function useAhead(dayStart: number, lat: number, lon: number, elevation: number | undefined, zone: string, preset: EnginePreset): Ahead {
  const key = `${dayStart}|${lat}|${lon}|${elevation ?? ""}|${zone}|${PRESET_HASH(preset)}`;
  const [state, setState] = useState<Ahead & { key: string }>(() => kept(key));
  // biome-ignore lint/correctness/useExhaustiveDependencies: `key` stands for the day, the place and the preset
  useEffect(() => {
    let live = true;
    const start = kept(key);
    setState(start);
    // no day yet (the person is still being read): nothing to look up
    if (!dayStart || start.pieces >= PIECES.length) return;
    const place = { lat, lon, ...(elevation !== undefined ? { elevation } : {}) };
    const acc = [...start.list];
    void (async () => {
      for (let i = start.pieces; i < PIECES.length; i++) {
        const piece = PIECES[i] as readonly [number, number];
        try {
          const got = await compute(
            "festivalsBetween",
            { fromMs: dayStart + piece[0] * DAY + 12 * HOUR, toMs: dayStart + piece[1] * DAY + 12 * HOUR, place, zone, preset },
            pieceKey(key, i),
          );
          if (!live) return;
          const seen = new Set(acc.map((f) => f.key));
          for (const f of got) if (!seen.has(f.key)) acc.push(f);
          setState({ key, list: [...acc], pieces: i + 1, failed: false });
        } catch {
          if (live) setState({ key, list: [...acc], pieces: PIECES.length, failed: true });
          return;
        }
      }
    })();
    return () => {
      live = false;
    };
  }, [key]);
  return state.key === key ? state : { list: [], pieces: 0, failed: false };
}

const MONTH_SHORT = (ms: number, zone: string) => fmt(ms, zone, { month: "short" });

/** The twelve months ahead as one line, with a dot on each festival: gold for the next, a ring for an eclipse. */
function YearLine({ list, nextKey, from, zone }: { list: Festival[]; nextKey: string | null; from: number; zone: string }) {
  const still = useReducedMotion();
  const skip = !!still || import.meta.env.MODE === "test";
  const W = 336;
  const PAD = 8;
  const x = (ms: number) => PAD + ((ms - from) / (365 * DAY)) * (W - 2 * PAD);
  // Month starts within the year ahead, found on the place's own calendar.
  const months = useMemo(() => {
    const out: Array<{ ms: number; label: string }> = [];
    let last = "";
    for (let d = 0; d <= 365; d++) {
      const ms = from + d * DAY + 12 * HOUR;
      const label = MONTH_SHORT(ms, zone);
      if (label !== last && d > 0) out.push({ ms: ms - 12 * HOUR, label });
      last = label;
    }
    return out;
  }, [from, zone]);
  const marks = list.filter((f) => f.kind === "festival" || f.kind === "eclipse");
  // Festivals that crowd together (the days of Dīvālī) are stacked so each keeps its own dot.
  let lastX = -99;
  let level = 0;
  const dots = marks.map((f) => {
    const cx = x(f.dateMs + 12 * HOUR);
    level = cx - lastX < 7 ? Math.min(3, level + 1) : 0;
    if (level === 0) lastX = cx;
    return { f, cx, cy: 30 - level * 7 };
  });
  const festivals = marks.filter((f) => f.kind === "festival").length;
  const eclipses = marks.length - festivals;
  return (
    <svg
      className="fest-year"
      viewBox={`0 0 ${W} 58`}
      role="img"
      aria-label={`The year ahead: ${festivals} festival${festivals === 1 ? "" : "s"} and ${eclipses} eclipse${eclipses === 1 ? "" : "s"}, each a mark on its day.`}
    >
      <line className="fest-year__line" x1={PAD} y1={38} x2={W - PAD} y2={38} />
      {months.map((m) => (
        <g key={m.ms}>
          <line className="fest-year__tick" x1={x(m.ms)} y1={34} x2={x(m.ms)} y2={42} />
          <text className="fest-year__label" x={x(m.ms) + 2} y={54}>
            {m.label}
          </text>
        </g>
      ))}
      <path className="fest-year__today" d={`M${PAD} 38l-4.5 7h9z`} />
      {dots.map(({ f, cx, cy }, i) => {
        const isNext = f.key === nextKey;
        return (
          <motion.circle
            key={f.key}
            className={`fest-year__dot fest-year__dot--${f.kind}${isNext ? " fest-year__dot--next" : ""}`}
            cx={cx}
            cy={cy}
            r={isNext ? 4.6 : f.kind === "eclipse" ? 2.4 : 2.8}
            initial={skip ? false : { opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.25 + i * 0.03 }}
          />
        );
      })}
    </svg>
  );
}

function FestivalRow({ f, inDays, isNext, zone }: { f: Festival; inDays: number; isNext: boolean; zone: string }) {
  const noon = f.dateMs + 12 * HOUR;
  const iso = f.key.split("@")[1] ?? "";
  const today = inDays === 0;
  // Festivals and eclipses say what they are; a monthly fast or a sign change is told apart by its own name.
  const second = f.kind === "festival" || f.kind === "eclipse" ? f.note : f.sanskrit;
  return (
    <li>
      <details className="fest-row" data-when={today ? "today" : isNext ? "next" : undefined} data-kind={f.kind}>
        <summary>
          <span className="fest-row__date">
            <span>{fmt(noon, zone, { weekday: "short" })}</span>
            <b>{fmt(noon, zone, { day: "numeric" })}</b>
            <span>{fmt(noon, zone, { month: "short" })}</span>
          </span>
          <span className="fest-row__body">
            <span className="fest-row__t">
              {f.name}
              {today ? (
                <span className="v-chip fest-row__chip">Today</span>
              ) : isNext ? (
                <span className="v-chip fest-row__chip">Next</span>
              ) : null}
            </span>
            <span className="fest-row__s">{second}</span>
          </span>
          <span className="fest-row__when">{inDaysWords(inDays)}</span>
        </summary>
        <div className="fest-row__more">
          <dl className="fest-dl">
            <div>
              <dt>Also called</dt>
              <dd>{f.sanskrit}</dd>
            </div>
            {second !== f.note ? (
              <div>
                <dt>What it is</dt>
                <dd>{f.note}</dd>
              </div>
            ) : null}
            <div>
              <dt>How the day was chosen</dt>
              <dd>{f.rule}</dd>
            </div>
            {f.atMs !== undefined ? (
              <div>
                <dt>Exact time here</dt>
                <dd>
                  {t12(f.atMs, zone)}, {fmt(f.atMs, zone, { weekday: "long", day: "numeric", month: "long" })}
                </dd>
              </div>
            ) : null}
          </dl>
          <Link to={`/today?d=${iso}`} className="v-link">
            The almanac for {fmt(noon, zone, { day: "numeric", month: "long" })} <ChevronRight size={16} />
          </Link>
        </div>
      </details>
    </li>
  );
}

export default function FestivalsScreen() {
  const active = useActiveProfile();
  const settings = useSettings();
  // The settings row is re-merged on every read; hold the preset by value so the work is not redone.
  const presetRef = useRef(settings.preset);
  if (PRESET_HASH(presetRef.current) !== PRESET_HASH(settings.preset)) presetRef.current = settings.preset;
  const preset = presetRef.current;
  const now = useNowMs(60_000);
  const here = useHere(active);
  const { lat, lon, zone } = here;
  const elevation = here.birthplace ? active?.birth.place.elevation : undefined;
  const town = townOf(here.name);
  const [filter, setFilter] = useState<Filter>("all");
  const [whole, setWhole] = useState(false);
  const [placeOpen, setPlaceOpen] = useState(false);
  const loading = active === undefined;

  // Local midnight that opened today at the place: the list is re-read when the date changes there.
  const dateKey = fmt(now, zone, { year: "numeric", month: "2-digit", day: "2-digit" });
  // biome-ignore lint/correctness/useExhaustiveDependencies: only a new civil date moves the start
  const dayStart = useMemo(() => DateTime.fromMillis(now, { zone }).startOf("day").toMillis(), [dateKey, zone]);

  const ahead = useAhead(loading ? 0 : dayStart, lat, lon, elevation, zone, preset);
  const list = loading ? [] : ahead.list;
  const done = ahead.pieces >= PIECES.length;

  // The sky behind the picture is the sky of this moment at the place.
  const hourKey = Math.floor(now / HOUR);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the sky is re-read once an hour
  const sky = useMemo(() => {
    try {
      const p = computePanchang(now, { lat, lon }, preset);
      return skyPhase(now, p.sunriseMs, p.sunsetMs);
    } catch {
      return "night";
    }
  }, [hourKey, lat, lon, preset]);
  const starK = sky === "night" ? 1 : sky === "dusk" || sky === "dawn" ? 0.45 : 0;

  // The answer on the band: the next festival; a fast or a sky event only until a festival has been found.
  const next = list.find((f) => f.kind === "festival") ?? (ahead.pieces > 0 ? list[0] : undefined);
  const nextIn = next ? daysUntil(next.dateMs, now, zone) : 0;

  const cutoff = dayStart + FIRST_DAYS * DAY + 12 * HOUR;
  const shown = useMemo(() => list.filter((f) => inFilter(f, filter) && (whole || f.dateMs <= cutoff)), [list, filter, whole, cutoff]);
  const groups = useMemo(() => {
    const out: Array<{ label: string; rows: Festival[] }> = [];
    for (const f of shown) {
      const label = fmt(f.dateMs + 12 * HOUR, zone, { month: "long", year: "numeric" });
      const lastGroup = out[out.length - 1];
      if (lastGroup && lastGroup.label === label) lastGroup.rows.push(f);
      else out.push({ label, rows: [f] });
    }
    return out;
  }, [shown, zone]);
  const filterInfo = FILTERS.find((x) => x.id === filter) ?? FILTERS[0];

  const hero = next ? (
    <section className="fest-band" aria-labelledby="fest-h">
      <StarField strength={starK} />
      <div className="fest-band__text">
        <p className="fest-band__eyebrow">{next.kind === "festival" ? "Next festival" : "Coming next"}</p>
        <h1 id="fest-h" className="fest-band__title">
          {next.name}
          <span className="fest-band__in">, {inDaysWords(nextIn)}</span>
        </h1>
        <p className="fest-band__date">
          {fmt(next.dateMs + 12 * HOUR, zone, { weekday: "long", day: "numeric", month: "long" })}
          <span className="fest-band__skt"> · {next.sanskrit}</span>
        </p>
        <p className="fest-band__note">{next.note}</p>
      </div>
      <div className="fest-band__moon">
        <MoonPicture
          key={next.key}
          elongation={next.elongation}
          south={lat < 0}
          dark={sky === "night" || sky === "dusk"}
          label={`The Moon as it will be that day: ${Math.round(((1 - Math.cos((next.elongation * Math.PI) / 180)) / 2) * 100)}% lit, ${next.elongation < 180 ? "growing" : "fading"}`}
        />
      </div>
      <div className="fest-band__year">
        <YearLine list={list} nextKey={next.key} from={dayStart} zone={zone} />
        <p className="fest-band__cap">
          {done ? "The twelve months ahead. Each dot is a festival; a ring is an eclipse." : "Reading the months ahead…"}
        </p>
      </div>
    </section>
  ) : (
    <section className="fest-band" aria-labelledby="fest-h">
      <div className="fest-band__text">
        <p className="fest-band__eyebrow">Festivals and fasts</p>
        <h1 id="fest-h" className="fest-band__title">
          The year ahead
        </h1>
        <p className="fest-band__note">
          {ahead.failed ? "The calendar could not be read for this place." : "Reading the Moon and the Sun…"}
        </p>
      </div>
    </section>
  );

  return (
    <Page label="Festivals and fasts" back="/" wide className="fest" hero={hero} sky={sky}>
      <Reveal i={0}>
        <p className="here-line fest-where">
          <span>
            Dates are worked out for <strong>{town}</strong>, from its own sunrise, sunset and moonrise. Some families and regions keep a
            festival a day earlier or later; where they differ, follow your own tradition.
          </span>{" "}
          <button type="button" className="v-link here-line__btn" aria-haspopup="dialog" onClick={() => setPlaceOpen(true)}>
            Change<span className="here-sr"> the place the dates are for</span>
          </button>
        </p>
      </Reveal>

      <Reveal i={1}>
        <div className="v-seg fest-seg" role="group" aria-label="What to show">
          {FILTERS.map((x) => (
            <button key={x.id} type="button" aria-pressed={filter === x.id} onClick={() => setFilter(x.id)}>
              {x.label}
            </button>
          ))}
        </div>
      </Reveal>

      <Reveal i={2} className="fest-list">
        {ahead.pieces === 0 && !ahead.failed ? (
          <div className="v-sk" role="status" aria-busy="true">
            <span className="v-sk__label">Reading the sky…</span>
            <div className="v-sk--card" aria-hidden="true">
              <i className="v-sk--line" style={{ "--w": "42%" } as React.CSSProperties} />
              <i className="v-sk--line" />
              <i className="v-sk--line" style={{ "--w": "78%" } as React.CSSProperties} />
            </div>
            <div className="v-sk--card" aria-hidden="true">
              <i className="v-sk--line" style={{ "--w": "60%" } as React.CSSProperties} />
              <i className="v-sk--line" />
            </div>
          </div>
        ) : groups.length === 0 ? (
          <p className="v-card v-muted" role="status">
            {ahead.failed
              ? "The calendar could not be read for this place."
              : `${filterInfo?.none} in the next ${whole ? "twelve months" : "two months"}.`}
          </p>
        ) : (
          groups.map((g) => (
            <section key={g.label} aria-label={g.label}>
              <h2 className="fest-month">{g.label}</h2>
              <ul className="v-list">
                {g.rows.map((f) => (
                  <FestivalRow key={f.key} f={f} inDays={daysUntil(f.dateMs, now, zone)} isNext={f.key === next?.key} zone={zone} />
                ))}
              </ul>
            </section>
          ))
        )}
        {!whole && ahead.pieces > 0 && !ahead.failed ? (
          <button type="button" className="v-btn v-btn--ghost fest-moreBtn" onClick={() => setWhole(true)}>
            Show the whole year ahead
          </button>
        ) : whole && !done ? (
          <p className="v-small v-muted" role="status">
            Reading the months further ahead…
          </p>
        ) : null}
      </Reveal>

      <details className="v-fold">
        <summary>
          <span>
            How the days are worked out
            <span className="v-fold__s">The Moon, the Sun and the rules of each festival</span>
          </span>
        </summary>
        <div className="v-fold__body fest-how">
          <p>
            A lunar festival is a certain lunar day (tithi) of a certain lunar month. The lunar day comes from the angle between the Moon
            and the Sun; the month from the new moons and the Sun's sign. Both are worked out on this device.
          </p>
          <p>
            Each festival then has its own part of the day: sunrise for most, midday for Rāma Navamī and Gaṇeśa Caturthī, dusk for Dīvālī,
            midnight for Mahā Śivarātri and Janmāṣṭamī, moonrise for Karvā Cauth. The day whose sunrise, midday, dusk or midnight the lunar
            day covers in {town} is the day shown. Open any row to see the exact times.
          </p>
          <p>
            In a year with a leap month (adhika māsa) the festivals wait for the true month; the monthly fasts carry on. Months here end at
            the new moon, as in the south and west; the north names the dark fortnight by the next month, and the days are the same.
          </p>
          <p>
            Printed calendars are made for one city and one tradition, so they can differ from this by a day, most often for Janmāṣṭamī,
            Ekādaśī and Holī. Onam and festivals counted by the solar calendars of each region are not listed yet.
          </p>
        </div>
      </details>
      <p className="v-foot">Worked out on this device from real astronomy, for reflection and planning. Nothing left it.</p>

      <HereSheet open={placeOpen} onClose={() => setPlaceOpen(false)} profile={active} here={here} />
    </Page>
  );
}
