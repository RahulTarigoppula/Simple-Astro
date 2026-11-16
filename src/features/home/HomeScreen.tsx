// Today: the first screen answers "how is my day?" for the chosen person, then offers the doors to
// everything else. With nobody added yet it is a short welcome with one thing to do.
import { useMemo } from "react";
import { Link } from "react-router";
import { useActiveProfile, useHere, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { InfoDot } from "../../components/ui/Explain";
import { CountUp, Reveal } from "../../components/ui/Motion";
import { ChevronRight, Page, Row, Section } from "../../components/ui/Page";
import { SkyScene, skyPhase } from "../../components/ui/SkyScene";
import { GRAHA_LORE } from "../../data/lore";
import { nakBoth } from "../../data/regional";
import { forecast, periodBounds } from "../../engine/forecast";
import { computePanchang } from "../../engine/panchang";
import { type AreaReading, dayGuide, personalReading } from "../../engine/personal";
import type { Patri, Profile, Settings } from "../../engine/types";
import { IconChart, IconForecast, IconMilan, IconPalm, IconSky, IconStory, IconToday } from "../chowki/icons";
import { SkyEvents } from "../cosmic/SkyEvents";
import { HereLine, townOf } from "../here/HereSheet";
import { MoonDisc } from "./MoonDisc";
import "./home.css";

// One scale of words everywhere: the day, a week, a life area.
const TONE_WORD = { bright: "Strong", steady: "Good", mixed: "Mixed", testing: "Go gently" } as const;
const TONE_HINT = {
  bright: "Most of the sky favours you",
  steady: "More help than hindrance",
  mixed: "Help and hindrance in balance",
  testing: "A day for patience, not big starts",
} as const;
const AREA_WORD = { bright: "Strong", steady: "Good", mixed: "Mixed", testing: "Go gently" } as const;
const areaTone = (s: number) => (s >= 0.35 ? "bright" : s >= 0 ? "steady" : s >= -0.35 ? "mixed" : "testing");
const pct = (score: number) => Math.round(((score + 1) / 2) * 100);

const fmt = (ms: number, zone: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...o, timeZone: zone }).format(ms);
const t12 = (ms: number, zone: string) => fmt(ms, zone, { hour: "numeric", minute: "2-digit", hour12: true });
const span12 = (a: number, b: number, zone: string) => `${t12(a, zone)} to ${t12(b, zone)}`;
const hourIn = (ms: number, zone: string) => Number(fmt(ms, zone, { hour: "2-digit", hour12: false })) % 24;
const english = (id: string) => GRAHA_LORE.find((g) => g.id === id)?.english ?? "";

function greeting(h: number): string {
  return h < 5 ? "A quiet night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

function Made() {
  return (
    <Link to="/about" className="v-card home-made">
      <span className="home-made__n">252 hours</span>
      <span className="home-made__t">of work and dedication by Rahul (RT). Every chart is worked out from real astronomy and checked.</span>
      <span className="v-link">
        How Vyomaphala was made <ChevronRight size={16} />
      </span>
    </Link>
  );
}

function Trust() {
  return (
    <>
      <Section title="Private by design" />
      <div className="v-card">
        <ul className="v-ticks">
          <li>No sign up and no login.</li>
          <li>Everything is worked out on this device. Birth details and palm photos never leave it.</li>
          <li>
            The only thing ever sent is an anonymous count of which screens are opened, and you can switch that off in{" "}
            <Link to="/drawer" className="home-inline">
              Settings
            </Link>
            .
          </li>
        </ul>
      </div>
      <Made />
    </>
  );
}

// With nobody saved the sky is drawn for the middle of India: the picture is real, the place is a stand-in.
const INDIA = { lat: 20.6, lon: 78.9 };

function Welcome({ now }: { now: number }) {
  const settings = useSettings();
  const hourKey = Math.floor(now / 3_600_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the picture is re-read once an hour
  const p = useMemo(() => {
    try {
      return computePanchang(now, INDIA, settings.preset);
    } catch {
      return null;
    }
  }, [hourKey, settings.preset]);
  const hero = (
    <section className="sky-hero sky-hero--welcome" aria-labelledby="home-h">
      {p ? (
        <div className="sky-hero__dial" aria-hidden="true">
          <SkyScene nowMs={now} sunriseMs={p.sunriseMs} sunsetMs={p.sunsetMs} elongation={p.elongation} label="The sky now" />
          <div className="sky-hero__center">
            <p className="sky-hero__word sky-hero__word--name" lang="hi">
              व्योमफल
            </p>
            <p className="sky-hero__score">Vyomaphala, the fruit of the sky</p>
          </div>
        </div>
      ) : null}
      <h1 id="home-h" className="sky-hero__title">
        Your stars, in plain words
      </h1>
      <p className="sky-hero__line">
        Add a birth date, time and place. Vyomaphala works out the chart from real astronomy and tells you what the old tradition says,
        simply.
      </p>
      <div className="v-actions">
        <Link to="/leaf/new" className="v-btn">
          Add your birth details
        </Link>
        <Link to="/guide" className="v-btn v-btn--ghost">
          How it works
        </Link>
      </div>
      <p className="sky-hero__small">About a minute. Stays on this device. No sign up.</p>
    </section>
  );
  return (
    <Page label="Vyomaphala home" hero={hero} sky={p ? skyPhase(now, p.sunriseMs, p.sunsetMs) : "night"}>
      <Section title="What you get" />
      <ul className="v-list">
        <li>
          <Row icon={<IconToday />} tone="gold" title="Your day" sub="Good for, go easy on, and the best hours" />
        </li>
        <li>
          <Row icon={<IconChart />} title="Your life, in simple words" sub="Who you are, your plus and minus points, what is ahead" />
        </li>
        <li>
          <Row icon={<IconForecast />} tone="cyan" title="Your forecast" sub="Day, week, month and year" />
        </li>
        <li>
          <Row icon={<IconMilan />} tone="rose" title="Partner match" sub="How two people fit, with a score" />
        </li>
        <li>
          <Row icon={<IconPalm />} tone="green" title="Palm reading" sub="A photo of your hand, read on this phone" />
        </li>
      </ul>

      <Section title="Look around first" />
      <ul className="v-list">
        <li>
          <Row to="/today" icon={<IconToday />} tone="gold" title="Today's almanac" sub="The Hindu calendar for today" />
        </li>
        <li>
          <Row to="/explore" icon={<IconSky />} tone="cyan" title="Explore the sky" sub="Planets, signs, stars and their stories" />
        </li>
        <li>
          <Row to="/story" icon={<IconStory />} title="The story of the stars" sub="How Indian astrology began" />
        </li>
      </ul>
      <Trust />
    </Page>
  );
}

interface DayView {
  hero: React.ReactNode;
  sky: string;
  body: React.ReactNode;
}

/** The day for one person: the sky hero and the blocks under it. Null until the chart is ready. */
function useDayView(profile: Profile | null, patri: Patri | null, settings: Settings, now: number): DayView | null {
  // Where the reader is now (the birthplace until they say otherwise): never the chart's own place.
  const { lat, lon, zone, name: placeName } = useHere(profile);
  const [dayStart] = periodBounds("day", now, zone);

  const day = useMemo(() => {
    if (!patri) return null;
    try {
      const f = forecast(patri, "day", dayStart + 43_200_000, zone, settings.preset, { lat, lon });
      const r = personalReading(patri, f.startMs + 43_200_000, settings.preset);
      const g = dayGuide(patri, f.startMs + 43_200_000, { lat, lon }, settings.preset, r.areas);
      return { f, r, g };
    } catch {
      return null;
    }
  }, [patri, dayStart, zone, settings.preset, lat, lon]);

  // The almanac of today's civil day (read at local noon), so its sunrise and sunset match the hours above
  // even between midnight and sunrise.
  const p = useMemo(() => {
    try {
      return computePanchang(dayStart + 43_200_000, { lat, lon }, settings.preset);
    } catch {
      return null;
    }
  }, [dayStart, lat, lon, settings.preset]);
  const hourKey = Math.floor(now / 3_600_000);
  // biome-ignore lint/correctness/useExhaustiveDependencies: the Moon's lunar day and star are re-read once an hour, not every minute
  const moon = useMemo(() => {
    try {
      return computePanchang(now, { lat, lon }, settings.preset);
    } catch {
      return null;
    }
  }, [hourKey, lat, lon, settings.preset]);

  if (!profile || !patri) return null;
  const date = fmt(now, zone, { weekday: "long", day: "numeric", month: "long" });
  const hello = `${greeting(hourIn(now, zone))}, ${profile.name}`;

  if (!day || !p) {
    return {
      hero: (
        <section className="sky-hero">
          <p className="sky-hero__date">{date}</p>
          <h1 className="sky-hero__hello">{hello}</h1>
        </section>
      ),
      sky: "night",
      body: <div className="v-skel">The day could not be read for this place.</div>,
    };
  }
  const { f, r, g } = day;
  const word = TONE_WORD[f.tone];
  const sorted = [...r.areas].sort((a, b) => b.score - a.score);
  const inAvoid = now >= g.avoid[0] && now < g.avoid[1];
  const inBest = g.bestHours.find((h) => now >= h.startMs && now < h.endMs);
  const nextBest = g.bestHours.find((h) => h.startMs > now);
  const nowLine = inAvoid
    ? `Rāhu Kāla now. Hold new starts until ${t12(g.avoid[1], zone)}.`
    : inBest
      ? `A good hour now (${english(inBest.lord)} hour), until ${t12(inBest.endMs, zone)}.`
      : nextBest
        ? `Next good hour starts at ${t12(nextBest.startMs, zone)}.`
        : "The good hours of daylight are over for today.";

  const hero = (
    <section className="sky-hero" data-tone={f.tone} aria-labelledby="home-day-h">
      <p className="sky-hero__date">{date}</p>
      <h1 className="sky-hero__hello">{hello}</h1>
      <div className="sky-hero__dial">
        <SkyScene
          nowMs={now}
          sunriseMs={p.sunriseMs}
          sunsetMs={p.sunsetMs}
          elongation={moon?.elongation ?? p.elongation}
          good={g.bestHours}
          avoid={g.avoid}
          riseLabel={t12(p.sunriseMs, zone)}
          setLabel={t12(p.sunsetMs, zone)}
          label={`${word} day. Support ${pct(f.score)} out of 100.`}
        />
        <div className="sky-hero__center">
          <p className="sky-hero__eyebrow">Your day</p>
          <h2 id="home-day-h" className="sky-hero__word">
            {word}
          </h2>
          <p className="sky-hero__score">
            <b>
              <CountUp value={pct(f.score)} />
            </b>{" "}
            of 100 · {TONE_HINT[f.tone]}
          </p>
        </div>
      </div>
      <p className="sky-hero__line">{f.headline}</p>
      <p className="sky-hero__now" data-state={inAvoid ? "avoid" : inBest ? "good" : "idle"}>
        <i aria-hidden="true" />
        {nowLine}
      </p>
      <div className="v-actions">
        <Link to={`/forecast/${profile.id}`} className="v-btn">
          See the full day
        </Link>
        <Link to={`/forecast/${profile.id}?p=week`} className="v-btn v-btn--ghost">
          Week ahead
        </Link>
      </div>
    </section>
  );

  const body = (
    <>
      <div className="v-cols">
        <div className="v-stack">
          <Reveal i={0}>
            <div className="v-card home-do">
              <div>
                <h2 className="home-do__h home-do__h--good">Good for</h2>
                <ul>
                  {g.goodFor.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h2 className="home-do__h home-do__h--easy">Go easy on</h2>
                <ul>
                  {g.easyOn.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
            </div>
          </Reveal>

          <Reveal i={1}>
            <section className="v-card home-hours" aria-labelledby="home-hours-h">
              <h2 id="home-hours-h" className="home-hours__h">
                Good times today
              </h2>
              <dl className="home-hours__list">
                <div>
                  <dt>
                    <i className="home-dot home-dot--good" aria-hidden="true" />
                    Best hours <InfoDot id="hora" />
                  </dt>
                  <dd>
                    {g.bestHours.length ? (
                      g.bestHours.map((h) => <span key={h.startMs}>{span12(h.startMs, h.endMs, zone)}</span>)
                    ) : (
                      <span className="v-muted">None stand out today.</span>
                    )}
                  </dd>
                </div>
                <div>
                  <dt>
                    <i className="home-dot home-dot--care" aria-hidden="true" />
                    Pause new starts <InfoDot id="rahu-kala" label="Rāhu Kāla" />
                  </dt>
                  <dd>
                    <span>{span12(g.avoid[0], g.avoid[1], zone)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Daylight</dt>
                  <dd>
                    <span>
                      Sunrise {t12(p.sunriseMs, zone)} · Sunset {t12(p.sunsetMs, zone)}
                    </span>
                  </dd>
                </div>
                <div>
                  <dt>Colour of the day</dt>
                  <dd>
                    <span>{g.colour}</span>
                  </dd>
                </div>
              </dl>
              <HereLine profile={profile} />
            </section>
          </Reveal>
        </div>

        <div className="v-stack">
          <Reveal i={2}>
            <Section
              title="Your life these weeks"
              note="From the slower planets, so it changes over weeks, not day to day."
              action={
                <Link to={`/forecast/${profile.id}`} className="v-link">
                  Why <ChevronRight size={16} />
                </Link>
              }
            />
            <ul className="home-areas">
              {sorted.map((a: AreaReading) => {
                const t = areaTone(a.score);
                return (
                  <li key={a.id} data-tone={t}>
                    <span className="home-areas__l">{a.label}</span>
                    <span className="home-areas__w">{AREA_WORD[t]}</span>
                    <span className="v-meter" role="img" aria-label={`${a.label}: ${AREA_WORD[t]}`}>
                      <span style={{ width: `${Math.max(6, pct(a.score))}%` }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        </div>
      </div>

      <Reveal i={3}>
        <Section title={`More for ${profile.name}`} />
        <ul className="v-list home-more">
          {moon ? (
            <li>
              <Link to="/today" className="v-row" aria-label="Open today's almanac">
                <span className="home-moon" aria-hidden="true">
                  <MoonDisc elongation={moon.elongation} size={42} />
                </span>
                <span className="v-row__body">
                  <span className="v-row__t">Today's almanac</span>
                  <span className="v-row__s">
                    {moon.tithi.paksha === "shukla" ? "Growing Moon" : "Fading Moon"}, {Math.round(moon.moonIllumination * 100)}% lit · Moon
                    in {nakBoth(moon.nakshatra.index, profile.tradition)}
                  </span>
                </span>
                <ChevronRight />
              </Link>
            </li>
          ) : null}
          <li>
            <Row to={`/patri/${profile.id}`} icon={<IconChart />} title="Birth chart" sub="Your life in simple words" />
          </li>
          <li>
            <Row to="/milan" icon={<IconMilan />} title="Partner match" sub="How two people fit" />
          </li>
          <li>
            <Row to={`/hast/${profile.id}`} icon={<IconPalm />} title="Palm reading" sub="From a photo of your hand" />
          </li>
          <li>
            <Row to={`/patri/${profile.id}/sky`} icon={<IconSky />} title="Sky at birth" sub="The real stars that night" />
          </li>
        </ul>
      </Reveal>

      <SkyEvents nowMs={now} place={{ lat, lon, name: townOf(placeName) }} zone={zone} preset={settings.preset} limit={2} />
    </>
  );
  return { hero, sky: skyPhase(now, p.sunriseMs, p.sunsetMs), body };
}

export default function HomeScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const now = useNowMs(60_000);
  const { patri, error } = usePatri(active, settings.preset);
  const { zone } = useHere(active);

  const ready = !!active && !!patri && patri.profileId === active.id;
  const view = useDayView(ready ? active : null, ready ? patri : null, settings, now);

  if (profiles === undefined) return <Page label="Vyomaphala home">{null}</Page>;
  if (!active) return <Welcome now={now} />;

  // The same frame while the chart is being read, so nothing jumps when it arrives.
  const waiting = (
    <section className="sky-hero">
      <p className="sky-hero__date">{fmt(now, zone, { weekday: "long", day: "numeric", month: "long" })}</p>
      <h1 className="sky-hero__hello">{`${greeting(hourIn(now, zone))}, ${active.name}`}</h1>
    </section>
  );
  return (
    <Page wide label="Vyomaphala home" hero={view?.hero ?? waiting} sky={view?.sky ?? "night"}>
      {view ? (
        view.body
      ) : error ? (
        <div className="v-card v-empty">
          <p>
            The chart for {active.name} could not be worked out ({error.message}). Check the birth details and try again.
          </p>
          <Link to={`/leaf/${active.id}/edit`} className="v-btn v-btn--sm">
            Check birth details
          </Link>
        </div>
      ) : (
        <div className="v-skel">Reading the sky…</div>
      )}
      <Made />
      <p className="v-foot">A traditional reading for reflection, never a prediction or advice.</p>
    </Page>
  );
}
