// Family today: everyone saved on this device at a glance (their day in a word and a number, what it is
// best for), then the birthdays and star birthdays coming up. Tapping a person opens their full day.
import { motion, useReducedMotion } from "motion/react";
import { useMemo } from "react";
import { Link } from "react-router";
import { useActiveProfile, useHere, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { Reveal } from "../../components/ui/Motion";
import { ChevronRight, Page, Section } from "../../components/ui/Page";
import { Avatar } from "../../components/ui/PersonChip";
import { skyPhase } from "../../components/ui/SkyScene";
import { nakBoth } from "../../data/regional";
import { saveSettings } from "../../data/repo";
import { computePanchang } from "../../engine/panchang";
import type { Profile } from "../../engine/types";
import { fmt, pct, TONE_WORD, toneOf } from "../forecast/util";
import {
  byBestDay,
  comingUp,
  dateWords,
  type EventSource,
  type FamilyEvent,
  familySentence,
  inDaysWords,
  nextBirthday,
  nextStarBirthday,
  type PersonDay,
  shortHeadline,
} from "./family";
import { type FamilyRow, useFamilyDays, useStarDays } from "./useFamily";
import "./family.css";

interface Disc {
  id: string;
  name: string;
  score: number;
}

// The picture's own frame: a horizon, and height above it is the day's score.
const W = 340;
const H = 232;
const LEFT = 66;
const RIGHT = 336;
const HORIZON = 206;
const yOf = (p: number) => 180 - p * 1.4;
const BANDS = [
  { word: TONE_WORD.bright, at: 84 },
  { word: TONE_WORD.steady, at: 59 },
  { word: TONE_WORD.mixed, at: 41 },
  { word: TONE_WORD.testing, at: 16 },
] as const;
const LINES = [67.5, 50, 32.5] as const;

/** Everyone on one sky: a glowing disc each, as high above the horizon as their day's score. */
function FamilySky({ people }: { people: readonly Disc[] }) {
  const still = useReducedMotion();
  const n = people.length;
  const slot = (RIGHT - LEFT) / Math.max(1, n);
  const r = Math.min(20, Math.max(10, slot / 2 - 7));
  const chars = Math.max(3, Math.floor(slot / 6.8));
  const label = n
    ? `${people.map((p) => `${p.name}: ${TONE_WORD[toneOf(p.score)]}, ${pct(p.score)} of 100`).join(". ")}.`
    : "The family's day is being read.";
  return (
    <svg className="fam-sky" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      <defs>
        <radialGradient id="fam-glow">
          <stop offset="0%" className="fam-sky__glow0" />
          <stop offset="100%" className="fam-sky__glow1" />
        </radialGradient>
      </defs>
      {LINES.map((p) => (
        <line key={p} className="fam-sky__line" x1={LEFT - 6} x2={RIGHT} y1={yOf(p)} y2={yOf(p)} />
      ))}
      {BANDS.map((b) => (
        <text key={b.word} className="fam-sky__band" x={0} y={yOf(b.at) + 4}>
          {b.word}
        </text>
      ))}
      <line className="fam-sky__horizon" x1={0} x2={W} y1={HORIZON} y2={HORIZON} />
      {people.map((p, i) => {
        const x = LEFT + (i + 0.5) * slot;
        const v = pct(p.score);
        const y = yOf(v);
        const first = p.name.trim().split(/\s+/)[0] ?? "";
        const short = first.length > chars ? `${first.slice(0, chars - 1)}…` : first;
        return (
          <motion.g
            key={p.id}
            initial={still ? false : { opacity: 0, y: HORIZON - y }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15 + i * 0.08, ease: [0.22, 0.8, 0.2, 1] }}
          >
            <line className="fam-sky__stem" x1={x} x2={x} y1={y + r} y2={HORIZON} />
            <circle cx={x} cy={y} r={r * (1.5 + v / 100)} fill="url(#fam-glow)" opacity={0.25 + (v / 100) * 0.6} />
            <circle className={`fam-sky__disc${i === 0 && n > 1 ? " is-top" : ""}`} cx={x} cy={y} r={r} />
            <text className="fam-sky__initial" x={x} y={y} dy="0.36em" style={{ fontSize: r * 0.95 }}>
              {(first[0] ?? "?").toUpperCase()}
            </text>
            <text className="fam-sky__num" x={x} y={y - r - 7}>
              {v}
            </text>
            {n <= 9 ? (
              <text className="fam-sky__name" x={x} y={HORIZON + 18}>
                {short}
              </text>
            ) : null}
          </motion.g>
        );
      })}
    </svg>
  );
}

function PersonRow({ row, activeId }: { row: FamilyRow; activeId: string | undefined }) {
  const { profile: p, day } = row;
  if (day === undefined) {
    return (
      <li className="fam-wait" aria-busy="true">
        <div className="v-row fam-row">
          <Avatar name={p.name} size={44} />
          <span className="v-row__body">
            <span className="v-row__t">{p.name}</span>
            <span className="v-meter" aria-hidden="true" />
            <span className="v-row__s">Reading the sky…</span>
          </span>
        </div>
      </li>
    );
  }
  if (day === null) {
    return (
      <li>
        <Link to={`/leaf/${p.id}/edit`} className="v-row fam-row">
          <Avatar name={p.name} size={44} />
          <span className="v-row__body">
            <span className="v-row__t">{p.name}</span>
            <span className="v-row__s">This chart could not be worked out. Check the birth details.</span>
          </span>
          <ChevronRight />
        </Link>
      </li>
    );
  }
  const word = TONE_WORD[day.tone];
  const v = pct(day.score);
  return (
    <li data-tone={day.tone}>
      <Link
        to={`/forecast/${p.id}`}
        className="v-row fam-row"
        onClick={() => {
          // the same switch the person chip makes
          if (p.id !== activeId) void saveSettings({ activeProfileId: p.id });
        }}
      >
        <Avatar name={p.name} size={44} />
        <span className="v-row__body">
          <span className="fam-row__top">
            <span className="v-row__t">{p.name}</span>
            <span className="fam-row__w">
              {word} <span className="fam-row__n">{v}</span>
            </span>
          </span>
          <span className="v-meter" role="img" aria-label={`${word} day, ${v} of 100`}>
            <span style={{ width: `${Math.max(6, v)}%` }} />
          </span>
          <span className="v-row__s fam-row__line">{shortHeadline(day.headline)}</span>
          <span className="fam-row__areas">
            <span>
              <b>Best for:</b> {day.best}
            </span>
            <span>
              <b>Go gently on:</b> {day.gentle}
            </span>
          </span>
        </span>
        <ChevronRight />
      </Link>
    </li>
  );
}

const MAX_EVENTS = 8;

function EventRow({ e, star }: { e: FamilyEvent; star: string }) {
  const when = `${dateWords(e)} · ${inDaysWords(e.inDays)}`;
  return (
    <li>
      <div className="v-row fam-event">
        <span className="fam-date" data-soon={e.inDays <= 1 ? "" : undefined} aria-hidden="true">
          <b>{e.d}</b>
          {dateWords(e, { month: "short" })}
        </span>
        <span className="v-row__body">
          <span className="v-row__t">{e.kind === "birthday" ? `${e.name}'s birthday` : `${e.name}'s star birthday`}</span>
          <span className="v-row__s">
            {when}
            {e.kind === "birthday" ? ` · turns ${e.age}` : star ? ` · the Moon returns to ${star}` : ""}
          </span>
        </span>
      </div>
    </li>
  );
}

function AddFamily() {
  return (
    <div className="v-card v-empty">
      <div>
        <h2 className="v-card__title">Add your family</h2>
        <p className="v-card__sub">
          Add your parents, your partner or your children, and this screen shows everyone's day side by side, with the birthdays coming up.
        </p>
      </div>
      <Link to="/leaf/new" className="v-btn">
        Add a family member
      </Link>
    </div>
  );
}

function Nobody() {
  const hero = (
    <section className="fam-hero" aria-labelledby="fam-h">
      <div className="fam-hero__text">
        <p className="fam-hero__date">Family today</p>
        <h1 id="fam-h" className="fam-hero__title">
          Everyone's day, on one screen
        </h1>
        <p className="fam-hero__sub">
          Add the people you look after. You will see each person's day in a word, and the birthdays coming up.
        </p>
        <div className="v-actions fam-hero__actions">
          <Link to="/leaf/new" className="v-btn">
            Add the first person
          </Link>
        </div>
      </div>
    </section>
  );
  return (
    <Page label="Family today" back hero={hero}>
      <div className="v-card">
        <ul className="v-ticks">
          <li>One line per person: Strong, Good, Mixed or Go gently, with a score out of 100.</li>
          <li>What the day is best for, and what to go gently on.</li>
          <li>Birthdays, and the monthly star birthday tradition keeps.</li>
        </ul>
      </div>
      <p className="v-foot">Everything stays on this device. A traditional reading for reflection, never a prediction or advice.</p>
    </Page>
  );
}

function Family({ profiles, active }: { profiles: Profile[]; active: Profile | null }) {
  const settings = useSettings();
  const now = useNowMs(60_000);
  const here = useHere(active);
  const rows = useFamilyDays(profiles, settings, now);
  const ledger = useStarDays(here, now, settings.preset);

  const hourKey = Math.floor(now / 3_600_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the band's sky is re-read once an hour
  const sky = useMemo(() => {
    try {
      const p = computePanchang(now, { lat: here.lat, lon: here.lon }, settings.preset);
      return skyPhase(now, p.sunriseMs, p.sunsetMs);
    } catch {
      return "night";
    }
  }, [hourKey, here.lat, here.lon, settings.preset]);

  const settled = rows.every((r) => r.day !== undefined);
  const read = rows.filter((r): r is FamilyRow & { day: PersonDay } => !!r.day);
  const discs: Disc[] = byBestDay(read.map((r) => ({ id: r.profile.id, name: r.profile.name, score: r.day.score })));
  const order = new Map(discs.map((d, i) => [d.id, i]));
  // best day first; people still being read keep their place under them
  const sorted = [...rows].sort((a, b) => (order.get(a.profile.id) ?? 999) - (order.get(b.profile.id) ?? 999));
  const sentence = settled && discs.length ? familySentence(discs) : null;

  const starName = new Map(read.map((r) => [r.profile.id, nakBoth(r.day.birthStar, r.profile.tradition)]));
  const sources: EventSource[] = rows.map((r) => ({
    id: r.profile.id,
    name: r.profile.name,
    birthday: nextBirthday(r.profile.birth, now, here.zone),
    star: ledger && r.day ? nextStarBirthday(ledger, r.day.birthStar) : null,
  }));
  const events = comingUp(sources, 30);
  const starsPending = ledger === null || !settled;
  const one = profiles.length === 1;
  const town = here.name.split(",")[0];

  const hero = (
    <section className="fam-hero" aria-labelledby="fam-h">
      <div className="fam-hero__text">
        <p className="fam-hero__date">Family today · {fmt(now, here.zone, { weekday: "long", day: "numeric", month: "long" })}</p>
        <h1 id="fam-h" className="fam-hero__title">
          {sentence ? sentence.title : settled ? "Family today" : "Reading everyone's day…"}
        </h1>
        <p className="fam-hero__sub">
          {sentence ? sentence.sub : settled ? "No chart could be read. Check the birth details below." : " "}
        </p>
      </div>
      <div className="fam-hero__pic">
        <FamilySky people={settled ? discs : []} />
      </div>
    </section>
  );

  return (
    <Page wide label="Family today" back hero={hero} sky={sky}>
      <div className="v-cols">
        <div className="v-stack">
          <Reveal i={0} className="fam-col">
            <Section
              title={one ? "Today" : "Everyone today"}
              note={one ? "Tap to open the full day." : "Best day first. Tap a person to open their full day."}
              action={
                one ? undefined : (
                  <Link to="/leaf/new" className="v-link">
                    Add a person <ChevronRight size={16} />
                  </Link>
                )
              }
            />
            <ul className="v-list fam-list">
              {sorted.map((r) => (
                <PersonRow key={r.profile.id} row={r} activeId={active?.id} />
              ))}
            </ul>
          </Reveal>
          {one ? (
            <Reveal i={1}>
              <AddFamily />
            </Reveal>
          ) : null}
        </div>

        <div className="v-stack">
          <Reveal i={2} className="fam-col">
            <Section title="Coming up" note="Birthdays and star birthdays in the next 30 days." />
            {events.length ? (
              <ul className="v-list fam-list">
                {events.slice(0, MAX_EVENTS).map((e) => (
                  <EventRow key={`${e.personId}-${e.kind}`} e={e} star={starName.get(e.personId) ?? ""} />
                ))}
              </ul>
            ) : starsPending ? null : (
              <div className="v-card">
                <p className="v-card__sub">No birthdays in the next 30 days.</p>
              </div>
            )}
            {starsPending ? (
              <p className="fam-pending" aria-live="polite">
                Finding the star birthdays…
              </p>
            ) : null}
          </Reveal>
          {events.length > MAX_EVENTS ? (
            <details className="v-fold">
              <summary>{events.length - MAX_EVENTS} more in the next 30 days</summary>
              <ul className="fam-plain">
                {events.slice(MAX_EVENTS).map((e) => (
                  <EventRow key={`${e.personId}-${e.kind}`} e={e} star={starName.get(e.personId) ?? ""} />
                ))}
              </ul>
            </details>
          ) : null}
          <details className="v-fold">
            <summary>
              <span>
                Every birthday
                <span className="v-fold__s">The next one for each person</span>
              </span>
            </summary>
            <div className="v-fold__body">
              <ul className="fam-all">
                {sources.map((s) => (
                  <li key={s.id}>
                    <b>{s.name}</b>
                    <span>
                      {dateWords(s.birthday, { weekday: "short", day: "numeric", month: "long", year: "numeric" })}, turns {s.birthday.age},{" "}
                      {inDaysWords(s.birthday.inDays)}
                    </span>
                    {s.star ? (
                      <span>
                        Star birthday ({starName.get(s.id)}): {dateWords(s.star)}, {inDaysWords(s.star.inDays)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          </details>
          <details className="v-fold">
            <summary>What is a star birthday?</summary>
            <div className="v-fold__body">
              <p className="fam-note">
                Tradition keeps a birthday by the Moon as well as by the calendar. About once a month the Moon comes back to the star it was
                in when a person was born, and many families keep that day in a small way.
              </p>
              <p className="fam-note v-muted">
                Janma nakṣatra, the birth star. The day is the one whose sunrise finds the Moon in that star, worked out for{" "}
                {here.birthplace ? "the place this app reads the day for; set where you are now in Settings" : town}. Customs differ from
                family to family.
              </p>
            </div>
          </details>
        </div>
      </div>
      <p className="v-foot">A traditional reading for reflection, never a prediction or advice.</p>
    </Page>
  );
}

export default function FamilyScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  if (profiles === undefined) return <Page label="Family today">{null}</Page>;
  if (profiles.length === 0) return <Nobody />;
  return <Family profiles={profiles} active={active ?? null} />;
}
