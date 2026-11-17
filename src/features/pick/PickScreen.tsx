// Pick a good day: choose what you want to do and see the best days ahead for it, the way the old
// muhūrta manuals weigh a day (lunar day, weekday, the Moon's star, your own birth star and Moon sign).
// The band is the coming weeks drawn from the real scores; the reasons are folded under each day.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useActiveProfile, useHere, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { Reveal } from "../../components/ui/Motion";
import { Page, Section } from "../../components/ui/Page";
import { periodBounds } from "../../engine/forecast";
import {
  ACTIVITIES,
  type Activity,
  type ActivityId,
  activityOf,
  type DaySky,
  type PickDay,
  type PickReason,
  personOf,
  rankDays,
  scoreDay,
} from "../../engine/pickday";
import { safeZone } from "../../engine/time";
import { PRESET_HASH } from "../../engine/types";
import { useCompute } from "../../platform/compute";
import { english, fmt, span12, TONE_WORD, type Tone } from "../forecast/util";
import { HereLine } from "../here/HereSheet";
import "./pick.css";

const RANGES = [
  { days: 14, label: "2 weeks", words: "the next 2 weeks" },
  { days: 45, label: "45 days", words: "the next 45 days" },
  { days: 90, label: "3 months", words: "the next 3 months" },
] as const;
type RangeDays = (typeof RANGES)[number]["days"];
const STEP = 5;
const NO_SKIES: DaySky[] = [];
const TONES: Tone[] = ["bright", "steady", "mixed", "testing"];

const vars = (o: Record<string, string | number>) => o as React.CSSProperties;
const dayName = (d: PickDay, zone: string) => fmt(d.noonMs, zone, { weekday: "long", day: "numeric", month: "long" });
const whenWord = (i: number) => (i === 0 ? "Today" : i === 1 ? "Tomorrow" : `In ${i} days`);
/** The one line said about a day: what speaks for it, or, on a day to go gently, what speaks against. */
const oneLine = (d: PickDay): string => {
  const lead = d.tone === "bright" || d.tone === "steady" ? (d.for[0] ?? d.against[0]) : (d.against[0] ?? d.for[0]);
  return lead?.text ?? "";
};
const windowLine = (d: PickDay, zone: string) => (d.window ? `Best time ${span12(d.window.startMs, d.window.endMs, zone)}` : "");

function Tick() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M3 8.5l3.2 3.2L13 4.8" strokeLinejoin="round" />
    </svg>
  );
}

/** Arrow keys move the choice inside a radiogroup, as they do between native radios. */
function onArrows<T extends string | number>(e: React.KeyboardEvent<HTMLElement>, ids: readonly T[], current: T, choose: (id: T) => void) {
  const step = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0;
  if (!step) return;
  e.preventDefault();
  const at = (ids.indexOf(current) + step + ids.length) % ids.length;
  const next = ids[at];
  if (next === undefined) return;
  choose(next);
  e.currentTarget.querySelectorAll<HTMLElement>('[role="radio"]')[at]?.focus();
}

/** The coming days as a row of lights: one per day, as tall as its score; the three best are lit. */
function Picture({ days, top, best, zone }: { days: PickDay[]; top: Set<number>; best: PickDay; zone: string }) {
  const n = days.length;
  const counts = TONES.map((t) => {
    const c = days.filter((d) => d.tone === t).length;
    return c ? `${c} ${TONE_WORD[t].toLowerCase()}` : "";
  }).filter(Boolean);
  const first = days[0];
  const label = `${n} days ahead: ${counts.join(", ")}. Best: ${dayName(best, zone)}, ${TONE_WORD[best.tone]}.${first ? ` Today: ${TONE_WORD[first.tone]}.` : ""}`;
  // Axis: every day when there are few; otherwise today and the Mondays that have room.
  const every = n <= 14;
  const gap = n <= 45 ? 7 : 14;
  let last = -99;
  const axis = days.map((d, i) => {
    if (i === 0) return "Today";
    if (every) return fmt(d.noonMs, zone, { day: "numeric" });
    if (d.sky.weekday !== 1 || i < n * 0.18 || i - last < gap || i > n - 3) return "";
    last = i;
    return fmt(d.noonMs, zone, { day: "numeric", month: "short" });
  });
  return (
    <div className="pk-pic" role="img" aria-label={label}>
      <ol className="pk-pic__bars" aria-hidden="true">
        {days.map((d, i) => {
          const isBest = d.startMs === best.startMs;
          return (
            <li
              key={d.startMs}
              data-t={d.tone}
              data-top={top.has(d.startMs) || undefined}
              data-best={isBest || undefined}
              data-now={i === 0 || undefined}
              data-edge={i < n * 0.08 ? "start" : i > n * 0.92 ? "end" : undefined}
              style={vars({ "--h": Math.round(10 + d.score * 90), "--d": `${Math.round((i / n) * 620)}ms` })}
            >
              <i />
              {isBest ? <b>{best.tone === "bright" ? "Next" : "Best"}</b> : null}
            </li>
          );
        })}
      </ol>
      <ol className="pk-pic__axis" aria-hidden="true" data-every={every || undefined}>
        {axis.map((t, i) => (
          <li key={days[i]?.startMs} data-now={i === 0 || undefined}>
            {t ? <span>{t}</span> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Reasons({ title, kind, list, none }: { title: string; kind: "for" | "against"; list: PickReason[]; none: string }) {
  return (
    <div className="pk-why" data-kind={kind}>
      <h3>{title}</h3>
      {list.length ? (
        <ul>
          {list.map((r) => (
            <li key={r.factor}>
              {r.text}
              <span className="pk-why__term" lang="sa-Latn">
                {r.term}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="v-muted">{none}</p>
      )}
    </div>
  );
}

function DayRow({ d, index, zone, best }: { d: PickDay; index: number; zone: string; best: boolean }) {
  const w = d.window;
  return (
    <details className="pk-day" data-tone={d.tone}>
      <summary>
        <span className="pk-day__date">
          <span>{fmt(d.noonMs, zone, { weekday: "short" })}</span>
          <b>{fmt(d.noonMs, zone, { day: "numeric" })}</b>
          <span>{fmt(d.noonMs, zone, { month: "short" })}</span>
        </span>
        <span className="pk-day__body">
          <span className="pk-day__top">
            <span className="pk-day__word">
              <i aria-hidden="true" />
              {TONE_WORD[d.tone]}
            </span>
            {best ? <span className="pk-day__tag">Strongest</span> : null}
            <span className="pk-day__when">{whenWord(index)}</span>
          </span>
          <span className="pk-day__line">{oneLine(d)}</span>
          {w ? <span className="pk-day__time">{windowLine(d, zone)}</span> : null}
        </span>
      </summary>
      <div className="pk-day__more">
        <Reasons title="In favour" kind="for" list={d.for} none="Nothing in tradition's list speaks for this day." />
        <Reasons title="Against" kind="against" list={d.against} none="Nothing in tradition's list speaks against this day." />
        {w ? (
          <p className="v-small v-muted">
            {w.kind === "hora" && w.lord
              ? `Best time: ${span12(w.startMs, w.endMs, zone)}, the hour of ${english(w.lord)} (horā), clear of Rāhu Kāla.`
              : `Best time: ${span12(w.startMs, w.endMs, zone)}, the midday stretch tradition calls Abhijit.`}
          </p>
        ) : null}
      </div>
    </details>
  );
}

export default function PickScreen() {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const profiles = useProfiles();
  const active = useActiveProfile();
  const profile = (id ? profiles?.find((p) => p.id === id) : active) ?? active;
  const settings = useSettings();
  const { patri, error } = usePatri(profile, settings.preset);
  const now = useNowMs(60_000);
  // Days, sunrise and the hours follow where the reader is now; the birth star stays the person's.
  const { lat, lon, zone: hereZone } = useHere(profile);
  const zone = safeZone(hereZone);

  const [activityId, setActivityId] = useState<ActivityId>(() => activityOf(search.get("for")).id);
  // The address can change under an open screen (Find, a link from Today): follow it.
  const forParam = search.get("for");
  useEffect(() => {
    setActivityId(activityOf(forParam).id);
  }, [forParam]);
  const [range, setRange] = useState<RangeDays>(45);
  const [shown, setShown] = useState(STEP);
  const activity: Activity = activityOf(activityId);
  const choose = (a: ActivityId) => {
    setActivityId(a);
    setShown(STEP);
    setSearch(a === "new" ? {} : { for: a }, { replace: true });
  };
  const chooseRange = (r: RangeDays) => {
    setRange(r);
    setShown(STEP);
  };

  const [dayStart] = periodBounds("day", now, zone);
  // The sky of each day is the same whatever is being planned, so it is read once per range and place,
  // in the background. While a new range is being read the days already on screen stay.
  const read = useCompute(
    "daySkies",
    { fromMs: dayStart, days: range, place: { lat, lon }, zone, preset: settings.preset },
    `${dayStart}|${range}|${lat},${lon}|${zone}|${PRESET_HASH(settings.preset)}`,
  );
  const lastRead = useRef(read);
  if (read) lastRead.current = read;
  const skies = read ?? lastRead.current ?? NO_SKIES;
  const reading = !read && !lastRead.current;

  const person = useMemo(() => (profile && patri && patri.profileId === profile.id ? personOf(patri) : null), [profile, patri]);
  const days = useMemo(() => skies.map((s) => scoreDay(s, activityId, person)), [skies, activityId, person]);
  // People plan forward: the Strong days come first, soonest first; the rest follow by score.
  const strongest = useMemo(() => rankDays(days)[0], [days]);
  const ranked = useMemo(() => {
    const byScore = rankDays(days);
    return [...days.filter((d) => d.tone === "bright"), ...byScore.filter((d) => d.tone !== "bright")];
  }, [days]);

  if (profiles === undefined) return <Page label="Pick a good day">{null}</Page>;

  // With a person on screen, wait for the chart so the ranking does not change under the reader's eyes.
  const waiting = (!!profile && !person && !error) || reading;
  const best = ranked[0];
  const top = new Set(ranked.slice(0, 3).map((d) => d.startMs));
  const rangeWords = RANGES.find((r) => r.days === range)?.words ?? "";
  const who = profile && person ? `For ${profile.name}` : "For anyone";
  const bestIndex = best ? days.findIndex((d) => d.startMs === best.startMs) : -1;
  const standsOut = best ? best.tone === "bright" || best.tone === "steady" : false;

  const hero = (
    <section className="pk-hero" aria-labelledby="pk-h">
      <h1 id="pk-h" className="pk-hero__title">
        Pick a good day
      </h1>
      {best && !waiting ? (
        <>
          <div className="pk-answer" aria-live="polite">
            <p className="pk-hero__eyebrow">
              {best.tone === "bright" ? "Next good day" : "Best day"} {activity.phrase}
            </p>
            <h2 className="pk-hero__word">{dayName(best, zone)}</h2>
            <p className="pk-hero__score">
              <b>{TONE_WORD[best.tone]}</b> · {whenWord(bestIndex)} · {who}
            </p>
          </div>
          <Picture days={days} top={top} best={best} zone={zone} />
          <p className="pk-hero__line">
            {standsOut ? oneLine(best) : `No day stands out in ${rangeWords}; this is the kindest of them. ${oneLine(best)}`}
          </p>
          {best.window ? (
            <p className="pk-hero__now">
              <i aria-hidden="true" />
              {windowLine(best, zone)}
            </p>
          ) : null}
        </>
      ) : (
        <p className="pk-hero__line">{waiting ? "Reading the sky…" : "The days ahead could not be read for this place."}</p>
      )}
    </section>
  );

  return (
    <Page label="Pick a good day" className="pick" hero={hero} sky="night">
      <Reveal i={0}>
        <Section title="What do you want to do?" id="pk-what-h" />
        <div
          className="pk-chips"
          role="radiogroup"
          aria-labelledby="pk-what-h"
          onKeyDown={(e) =>
            onArrows(
              e,
              ACTIVITIES.map((a) => a.id),
              activityId,
              choose,
            )
          }
        >
          {ACTIVITIES.map((a) => (
            <button
              key={a.id}
              type="button"
              role="radio"
              className="pk-chip"
              aria-checked={a.id === activityId}
              tabIndex={a.id === activityId ? 0 : -1}
              onClick={() => choose(a.id)}
            >
              <Tick />
              {a.label}
            </button>
          ))}
        </div>
      </Reveal>

      {!profile ? (
        <Reveal i={1}>
          <section className="v-card v-empty" aria-labelledby="pk-empty-h">
            <h2 id="pk-empty-h" className="v-card__title">
              These days are the same for everyone
            </h2>
            <p className="v-muted">
              Add a birth date, time and place and Vyomaphala also counts each day from your own birth star and Moon sign, as tradition does
              before choosing a day.
            </p>
            <Link to="/leaf/new" className="v-btn">
              Add your birth details
            </Link>
            <p className="v-small v-muted">About a minute. Stays on this device.</p>
          </section>
        </Reveal>
      ) : null}

      {waiting ? (
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
      ) : (
        <Reveal i={2}>
          <Section
            title="The best days"
            id="pk-days-h"
            note={`${profile && person ? `Ranked for ${profile.name}` : "Ranked for anyone"}, ${activity.phrase}, in ${rangeWords}.`}
          />
          <div
            className="v-seg pk-range"
            role="radiogroup"
            aria-label="How far ahead"
            onKeyDown={(e) =>
              onArrows(
                e,
                RANGES.map((r) => r.days),
                range,
                chooseRange,
              )
            }
          >
            {RANGES.map((r) => (
              <button
                key={r.days}
                type="button"
                role="radio"
                aria-checked={r.days === range}
                tabIndex={r.days === range ? 0 : -1}
                onClick={() => chooseRange(r.days)}
              >
                {r.label}
              </button>
            ))}
          </div>
          {ranked.length ? (
            <ol className="pk-days" aria-label="The best days">
              {ranked.slice(0, shown).map((d) => (
                <li key={d.startMs}>
                  <DayRow
                    d={d}
                    index={days.findIndex((x) => x.startMs === d.startMs)}
                    zone={zone}
                    best={d.tone === "bright" && d.startMs === strongest?.startMs}
                  />
                </li>
              ))}
            </ol>
          ) : (
            <div className="v-skel">The days ahead could not be read for this place.</div>
          )}
          {shown < ranked.length ? (
            <button type="button" className="v-btn v-btn--ghost v-btn--block pk-more" onClick={() => setShown((s) => s + STEP)}>
              Show more days
            </button>
          ) : null}
          <HereLine profile={profile} className="pk-here" />
        </Reveal>
      )}

      <Reveal i={3}>
        <details className="v-fold">
          <summary>
            <span>
              How tradition chooses a day
              <span className="v-fold__s">Five things are weighed, and some are left out</span>
            </span>
          </summary>
          <div className="v-fold__body pk-method">
            <ul>
              <li>
                <b>The lunar day.</b> The thirty lunar days come in five kinds. The "empty" ones (the 4th, 9th and 14th) and the new Moon
                are set aside for beginnings.
                <span className="pk-why__term" lang="sa-Latn">
                  Tithi: Nandā, Bhadrā, Jayā, Riktā, Pūrṇā
                </span>
              </li>
              <li>
                <b>The weekday.</b> Monday, Wednesday, Thursday and Friday are favoured for most beginnings; Tuesday and Saturday are set
                aside.
                <span className="pk-why__term" lang="sa-Latn">
                  Vāra
                </span>
              </li>
              <li>
                <b>The Moon's star.</b> Each of the 27 stars has a nature: steady, moving, gentle, quick, mixed, fierce or sharp. The day's
                star should suit what you plan.
                <span className="pk-why__term" lang="sa-Latn">
                  Nakṣatra: Dhruva, Cara, Mṛdu, Kṣipra, Miśra, Ugra, Tīkṣṇa
                </span>
              </li>
              <li>
                <b>Your own stars.</b> The day's star is counted from your birth star, and the day's Moon sign from your birth Moon sign.
                The 3rd, 5th and 7th stars and the 4th, 8th and 12th signs are set aside.
                <span className="pk-why__term" lang="sa-Latn">
                  Tārā-bala, Candra-bala
                </span>
              </li>
              <li>
                <b>Flaws of the day.</b> Two meetings of Sun and Moon and one half lunar day are avoided for beginnings.
                <span className="pk-why__term" lang="sa-Latn">
                  Vyatīpāta, Vaidhṛti, Viṣṭi (Bhadrā)
                </span>
              </li>
            </ul>
            <p className="v-small v-muted">
              A full reading by a practitioner also weighs the exact minute, the direction of a journey and the month. Vyomaphala does not,
              so take this as a first shortlist from the muhūrta manuals (Muhūrta Cintāmaṇi and the printed almanacs), not the last word.
            </p>
          </div>
        </details>
      </Reveal>

      <p className="v-foot">Tradition's way of choosing a day, for reflection. Never a prediction or advice; the choice is yours.</p>
    </Page>
  );
}
