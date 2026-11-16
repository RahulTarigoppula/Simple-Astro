// Today: the first screen answers "how is my day?" for the chosen person, then offers the doors to
// everything else. With nobody added yet it is a short welcome with one thing to do.
import { useMemo } from "react";
import { Link } from "react-router";
import { useActiveProfile, useHere, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { InfoDot } from "../../components/ui/Explain";
import { ChevronRight, Page, Row, Section } from "../../components/ui/Page";
import { GRAHA_LORE } from "../../data/lore";
import { nakBoth } from "../../data/regional";
import { forecast, periodBounds } from "../../engine/forecast";
import { computePanchang } from "../../engine/panchang";
import { type AreaReading, dayGuide, personalReading } from "../../engine/personal";
import type { Patri, Profile, Settings } from "../../engine/types";
import { IconChart, IconForecast, IconMilan, IconNumbers, IconPalm, IconSky, IconStory, IconToday } from "../chowki/icons";
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

/** The day ring: how supportive the day reads, 0 to 100, with the tone word inside. */
function DayRing({ score, word }: { score: number; word: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const p = Math.max(4, pct(score));
  return (
    <div className="home-ring" role="img" aria-label={`${word} day. Support ${pct(score)} out of 100.`}>
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r={r} className="home-ring__track" />
        <circle cx="52" cy="52" r={r} className="home-ring__fill" strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 52 52)" />
      </svg>
      <span className="home-ring__num">{pct(score)}</span>
      <span className="home-ring__of">of 100</span>
    </div>
  );
}

function Shortcut({ to, icon, title, sub }: { to: string; icon: React.ReactNode; title: string; sub: string }) {
  return (
    <Link to={to} className="home-short">
      <span className="home-short__icon" aria-hidden="true">
        {icon}
      </span>
      <span className="home-short__t">{title}</span>
      <span className="home-short__s">{sub}</span>
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
      <Link to="/about" className="v-card home-made">
        <span className="home-made__n">252 hours</span>
        <span className="home-made__t">
          of work and dedication by Rahul (RT). Every chart is worked out from real astronomy and checked.
        </span>
        <span className="v-link">
          How Vyomaphala was made <ChevronRight size={16} />
        </span>
      </Link>
    </>
  );
}

function Welcome() {
  return (
    <Page label="Vyomaphala home">
      <section className="v-card v-card--hero home-welcome" aria-labelledby="home-h">
        <p className="v-eyebrow">
          Vyomaphala · <span lang="hi">व्योमफल</span>
        </p>
        <h1 id="home-h" className="v-title">
          Your stars, in plain words
        </h1>
        <p className="v-lede">
          Add a birth date, time and place. Vyomaphala works out the chart from real astronomy and tells you what the old tradition says,
          simply.
        </p>
        <div className="v-actions">
          <Link to="/leaf/new" className="v-btn">
            Add your birth details
          </Link>
          <Link to="/guide" className="v-btn v-btn--quiet">
            How it works
          </Link>
        </div>
        <p className="v-small v-muted">About a minute. Stays on this device. No sign up.</p>
      </section>

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

interface DayProps {
  profile: Profile;
  patri: Patri;
  settings: Settings;
  now: number;
}

function Day({ profile, patri, settings, now }: DayProps) {
  // Where the reader is now (the birthplace until they say otherwise): never the chart's own place.
  const { lat, lon, zone, name: placeName } = useHere(profile);
  const [dayStart] = periodBounds("day", now, zone);

  const day = useMemo(() => {
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

  if (!day) return <div className="v-skel">The day could not be read for this place.</div>;
  const { f, r, g } = day;
  const word = TONE_WORD[f.tone];
  const sorted = [...r.areas].sort((a, b) => b.score - a.score);
  const span = p ? Math.max(1, p.sunsetMs - p.sunriseMs) : 1;
  const at = (ms: number) => (p ? Math.min(100, Math.max(0, ((ms - p.sunriseMs) / span) * 100)) : 0);
  const nowIn = p ? now >= p.sunriseMs && now <= p.sunsetMs : false;
  const inAvoid = now >= g.avoid[0] && now < g.avoid[1];
  const inBest = g.bestHours.find((h) => now >= h.startMs && now < h.endMs);
  const nextBest = g.bestHours.find((h) => h.startMs > now);

  return (
    <>
      <section className="v-card v-card--hero home-day" data-tone={f.tone} aria-labelledby="home-day-h">
        <div className="home-day__top">
          <DayRing score={f.score} word={word} />
          <div className="home-day__text">
            <p className="v-eyebrow">Your day · from the Moon</p>
            <h2 id="home-day-h" className="home-day__word">
              {word}
            </h2>
            <p className="home-day__hint">{TONE_HINT[f.tone]}</p>
          </div>
        </div>
        <p className="home-day__line">{f.headline}</p>
        <div className="v-actions">
          <Link to={`/forecast/${profile.id}`} className="v-btn v-btn--sm">
            See the full day
          </Link>
          <Link to={`/forecast/${profile.id}?p=week`} className="v-btn v-btn--ghost v-btn--sm">
            Week ahead
          </Link>
        </div>
      </section>

      <div className="v-cols">
        <div className="v-stack">
          <div className="v-grid2 home-do">
            <section className="v-card" aria-labelledby="home-good-h">
              <h2 id="home-good-h" className="home-do__h home-do__h--good">
                Good for
              </h2>
              <ul>
                {g.goodFor.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
            <section className="v-card" aria-labelledby="home-easy-h">
              <h2 id="home-easy-h" className="home-do__h home-do__h--easy">
                Go easy on
              </h2>
              <ul>
                {g.easyOn.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          </div>

          {p ? (
            <section className="v-card home-hours" aria-labelledby="home-hours-h">
              <h2 id="home-hours-h" className="v-card__title">
                Good times today
              </h2>
              <p className="home-hours__now">
                {inAvoid
                  ? `Right now: Rāhu Kāla. Hold new starts until ${t12(g.avoid[1], zone)}.`
                  : inBest
                    ? `Right now: a good hour (${english(inBest.lord)} hour), until ${t12(inBest.endMs, zone)}.`
                    : nextBest
                      ? `Next good hour starts at ${t12(nextBest.startMs, zone)}.`
                      : "The good hours of daylight are over for today."}
              </p>
              <div className="home-bar" aria-hidden="true">
                {g.bestHours.map((h) => (
                  <span
                    key={h.startMs}
                    className="home-bar__good"
                    style={{ left: `${at(h.startMs)}%`, width: `${at(h.endMs) - at(h.startMs)}%` }}
                  />
                ))}
                <span className="home-bar__avoid" style={{ left: `${at(g.avoid[0])}%`, width: `${at(g.avoid[1]) - at(g.avoid[0])}%` }} />
                {nowIn ? <span className="home-bar__now" style={{ left: `${at(now)}%` }} /> : null}
              </div>
              <div className="home-bar__ends" aria-hidden="true">
                <span>Sunrise {t12(p.sunriseMs, zone)}</span>
                <span>Sunset {t12(p.sunsetMs, zone)}</span>
              </div>
              <dl className="home-hours__list">
                <div>
                  <dt>
                    <i className="home-dot home-dot--good" aria-hidden="true" />
                    Best hours <InfoDot id="hora" />
                  </dt>
                  <dd>
                    {g.bestHours.length ? (
                      g.bestHours.map((h) => (
                        <span key={h.startMs} className="v-chip v-chip--good">
                          {span12(h.startMs, h.endMs, zone)}
                        </span>
                      ))
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
                    <span className="v-chip v-chip--care">{span12(g.avoid[0], g.avoid[1], zone)}</span>
                  </dd>
                </div>
                <div>
                  <dt>Colour of the day</dt>
                  <dd>
                    <span className="v-chip">{g.colour}</span>
                  </dd>
                </div>
              </dl>
              <HereLine profile={profile} />
            </section>
          ) : null}

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
        </div>
        <div className="v-stack">
          {moon ? (
            <>
              <Section
                title="Today's almanac"
                action={
                  <Link to="/today" className="v-link">
                    Open <ChevronRight size={16} />
                  </Link>
                }
              />
              <Link to="/today" className="v-card home-alm" aria-label="Open today's almanac">
                <MoonDisc elongation={moon.elongation} />
                <span className="home-alm__body">
                  <span className="home-alm__t">
                    {moon.tithi.paksha === "shukla" ? "Growing Moon" : "Fading Moon"}, {Math.round(moon.moonIllumination * 100)}% lit
                  </span>
                  <span className="home-alm__s">
                    Lunar day {((moon.tithi.index - 1) % 15) + 1} of 15 · {moon.tithi.name}
                  </span>
                  <span className="home-alm__s">Moon's star today: {nakBoth(moon.nakshatra.index, profile.tradition)}</span>
                </span>
                <ChevronRight />
              </Link>
            </>
          ) : null}

          <Section title={`More for ${profile.name}`} />
          <nav className="home-shorts" aria-label="More">
            <Shortcut to={`/patri/${profile.id}`} icon={<IconChart />} title="Birth chart" sub="Your life in simple words" />
            <Shortcut to="/milan" icon={<IconMilan />} title="Partner match" sub="How two people fit" />
            <Shortcut to={`/hast/${profile.id}`} icon={<IconPalm />} title="Palm reading" sub="From a photo of your hand" />
            <Shortcut to="/explore/numbers" icon={<IconNumbers />} title="Numbers" sub="What your birth date says" />
            <Shortcut to={`/patri/${profile.id}/sky`} icon={<IconSky />} title="Sky at birth" sub="The real stars that night" />
            <Shortcut to="/story" icon={<IconStory />} title="Stories" sub="How it all began" />
          </nav>

          <SkyEvents nowMs={now} place={{ lat, lon, name: townOf(placeName) }} zone={zone} preset={settings.preset} limit={3} />
        </div>
      </div>
    </>
  );
}

export default function HomeScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const now = useNowMs(60_000);
  const { patri, error } = usePatri(active, settings.preset);
  const { zone } = useHere(active);

  if (profiles === undefined) return <Page label="Vyomaphala home">{null}</Page>;
  if (!active) return <Welcome />;

  const ready = patri && patri.profileId === active.id;
  return (
    <Page
      wide
      label="Vyomaphala home"
      eyebrow={fmt(now, zone, { weekday: "long", day: "numeric", month: "long" })}
      title={`${greeting(hourIn(now, zone))}, ${active.name}`}
    >
      {ready ? (
        <Day profile={active} patri={patri} settings={settings} now={now} />
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
      <div className="home-trust">
        <Trust />
      </div>
      <p className="v-foot">A traditional reading for reflection, never a prediction or advice.</p>
    </Page>
  );
}
