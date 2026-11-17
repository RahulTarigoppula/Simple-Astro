// Forecasts for a day, week, month, quarter or year, read the classical way (gochara from the natal
// Moon, Tārā/Candra-bala, the running daśā). The band at the top is the answer as a picture (the sky
// of the day, the curve of the week, the bars of the month); the astrology is folded below.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useActiveProfile, useHere, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { CountUp, Reveal } from "../../components/ui/Motion";
import { ChevronLeft, ChevronRight, Page, Section } from "../../components/ui/Page";
import { SkyScene, skyPhase } from "../../components/ui/SkyScene";
import { RASHI_LORE } from "../../data/lore";
import { rashiBoth } from "../../data/regional";
import { type Forecast, forecast, type Period, periodBounds, rateDay } from "../../engine/forecast";
import { computePanchang } from "../../engine/panchang";
import { dayGuide, personalReading } from "../../engine/personal";
import { personalYear } from "../../engine/profile";
import { safeZone } from "../../engine/time";
import { countEvent } from "../../platform/stats";
import { IconForecast } from "../chowki/icons";
import { HereLine } from "../here/HereSheet";
import { ShareButton } from "../share/ShareCard";
import { ContactsFold, DashaFold, EventsFold, Fold, MethodFold, MoonFold, SaturnFold, StrengthFold, TransitsFold } from "./Folds";
import { MonthGrid, MonthRows, WeekList } from "./PeriodViews";
import { AreasCard, DoLists, HoursCard, hoursLine } from "./PersonalSections";
import { PeriodPicture } from "./Pictures";
import { fmt, HALF_DAY, lore, pct, TONE_HINT, TONE_WORD, t12 } from "./util";
import "./forecast.css";

const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];
const asPeriod = (v: string | null): Period | null => PERIODS.find((p) => p.id === v)?.id ?? null;
const THIS: Record<Period, string> = { day: "Today", week: "This week", month: "This month", quarter: "This quarter", year: "This year" };
const AREAS_TITLE: Record<Period, string> = {
  day: "Your life today",
  week: "Your life this week",
  month: "Your life this month",
  quarter: "Your life this quarter",
  year: "Your life this year",
};
/** The planet numerology gives each personal-year number. */
const YEAR_LORD = { 1: "SU", 2: "MO", 3: "JU", 4: "RA", 5: "ME", 6: "VE", 7: "KE", 8: "SA", 9: "MA" } as const;

function periodLabel(p: Period, s: number, e: number, zone: string): string {
  switch (p) {
    case "day":
      return fmt(s, zone, { weekday: "long", day: "numeric", month: "long" });
    case "week":
      return `${fmt(s, zone, { day: "numeric", month: "short" })} - ${fmt(e - 1, zone, { day: "numeric", month: "short" })}`;
    case "month":
      return fmt(s, zone, { month: "long", year: "numeric" });
    case "quarter":
      return `Q${Math.floor(Number(fmt(s, zone, { month: "numeric" })) / 3) + 1} · ${fmt(s, zone, { month: "short" })} - ${fmt(e - 1, zone, { month: "short", year: "numeric" })}`;
    case "year":
      return fmt(s, zone, { year: "numeric" });
  }
}

function shift(p: Period, atMs: number, zone: string, dir: 1 | -1): number {
  const [s, e] = periodBounds(p, atMs, safeZone(zone));
  return dir === 1 ? e + HALF_DAY : s - HALF_DAY;
}

/** The answer in words: the one large word, the score counting up, what it means. */
function Answer({ f, eyebrow }: { f: Forecast; eyebrow: string }) {
  return (
    <>
      <p className="fc-hero__eyebrow">{eyebrow}</p>
      <h2 className="fc-hero__word">{TONE_WORD[f.tone]}</h2>
      <p className="fc-hero__score">
        <b>
          <CountUp value={pct(f.score)} />
        </b>{" "}
        of 100 · {TONE_HINT[f.tone]}
      </p>
    </>
  );
}

function Empty() {
  return (
    <Page label="Forecast" title="Your forecast">
      <section className="v-card v-empty" aria-labelledby="fc-empty-h">
        <span className="v-empty__art" aria-hidden="true">
          <IconForecast />
        </span>
        <h2 id="fc-empty-h" className="v-card__title">
          See what is ahead, in plain words
        </h2>
        <p className="v-muted">
          Add your birth date, time and place once. Vyomaphala then reads every day, week, month and year from where the planets really are.
        </p>
        <ul className="v-ticks">
          <li>A guide for today: good for, go easy on, and your best hours</li>
          <li>Your life area by area: work, money, love, health, mind, home and luck</li>
          <li>Planets crossing your own birth chart, and your current life chapter</li>
        </ul>
        <Link to="/leaf/new" className="v-btn">
          Add your birth details
        </Link>
        <p className="v-small v-muted">Takes about a minute. Stays on this device.</p>
      </section>
    </Page>
  );
}

export default function ForecastScreen() {
  const { id } = useParams();
  const [search, setSearch] = useSearchParams();
  const profiles = useProfiles();
  const active = useActiveProfile();
  const profile = (id ? profiles?.find((p) => p.id === id) : active) ?? active;
  const settings = useSettings();
  const { patri } = usePatri(profile, settings.preset);
  const nowMs = useNowMs(60_000);

  // The period is state, mirrored in the URL (?p=week). A link that changes the query moves the state;
  // a switch of person navigates without the query, and the effect below puts it back.
  const urlPeriod = asPeriod(search.get("p"));
  const [period, setPeriod] = useState<Period>(urlPeriod ?? "day");
  const [seenUrl, setSeenUrl] = useState(urlPeriod);
  if (urlPeriod !== seenUrl) {
    setSeenUrl(urlPeriod);
    if (urlPeriod) setPeriod(urlPeriod);
  }
  useEffect(() => {
    if (!urlPeriod && period !== "day") setSearch({ p: period }, { replace: true });
  }, [urlPeriod, period, setSearch]);

  const [at, setAt] = useState<number | null>(null);
  // Period bounds, labels, the day's hours and events follow where the reader is now; the chart stays the person's.
  const { zone, lat, lon } = useHere(profile);
  const atMs = at ?? nowMs;

  const show = (p: Period, when: number | null) => {
    setPeriod(p);
    setAt(when);
    setSearch(p === "day" ? {} : { p }, { replace: true });
  };

  const ready = Boolean(patri && profile && patri.profileId === profile.id);

  const f = useMemo(() => {
    if (!patri || !profile || patri.profileId !== profile.id) return null;
    try {
      return forecast(patri, period, atMs, safeZone(zone), settings.preset, { lat, lon });
    } catch {
      return null;
    }
  }, [patri, profile, period, atMs, zone, settings.preset, lat, lon]);

  const personal = useMemo(() => {
    if (!patri || !profile || patri.profileId !== profile.id || !f) return null;
    try {
      const mid = period === "day" ? f.startMs + HALF_DAY : (f.startMs + f.endMs) / 2;
      const r = personalReading(patri, mid, settings.preset);
      const g = period === "day" ? dayGuide(patri, mid, { lat, lon }, settings.preset, r.areas) : null;
      return { r, g };
    } catch {
      return null;
    }
  }, [patri, profile, f, period, settings.preset, lat, lon]);

  // Sunrise, sunset and the Moon's shape for the day shown (day view only).
  const dayStart = period === "day" && f ? f.startMs : null;
  const sky = useMemo(() => {
    if (dayStart === null) return null;
    try {
      const p = computePanchang(dayStart + HALF_DAY, { lat, lon }, settings.preset);
      return { riseMs: p.sunriseMs, setMs: p.sunsetMs, elongation: p.elongation };
    } catch {
      return null;
    }
  }, [dayStart, lat, lon, settings.preset]);

  // The day before and the day after a week, so its curve flows in from one edge and out at the other.
  const weekStart = period === "week" && f ? f.startMs : null;
  const weekEnd = period === "week" && f ? f.endMs : null;
  const edges = useMemo(() => {
    if (!patri || weekStart === null || weekEnd === null) return null;
    try {
      const [before] = periodBounds("day", weekStart - HALF_DAY, safeZone(zone));
      return { lead: rateDay(patri, before, settings.preset).score, tail: rateDay(patri, weekEnd, settings.preset).score };
    } catch {
      return null;
    }
  }, [patri, weekStart, weekEnd, zone, settings.preset]);

  if (profiles === undefined) return <Page label="Forecast">{null}</Page>;
  if (!profile) return <Empty />;

  const moonSign = patri ? RASHI_LORE[patri.grahas.MO.sign] : undefined;
  const moonSignText = moonSign && patri ? `${rashiBoth(patri.grahas.MO.sign, profile.tradition)} · ${moonSign.western}` : "";
  const py = personalYear(profile.birth.localMo, profile.birth.localD, Number(fmt(atMs, zone, { year: "numeric" })));
  const pyLord = lore(YEAR_LORD[py as keyof typeof YEAR_LORD]);
  const isNow = f ? nowMs >= f.startMs && nowMs < f.endMs : false;
  const step0 = f?.steps[0];
  const guide = period === "day" ? (personal?.g ?? null) : null;
  const eyebrow = !f
    ? ""
    : isNow
      ? THIS[period]
      : period === "day"
        ? fmt(f.startMs + HALF_DAY, zone, { weekday: "long" })
        : `That ${period}`;
  const hours = guide ? hoursLine(guide, zone, isNow ? nowMs : null) : null;
  // Today the sky is the sky of this minute; any other day is shown whole, the Sun at its highest.
  const skyAt = sky ? (isNow ? nowMs : (sky.riseMs + sky.setMs) / 2) : 0;
  const openDay = (ms: number) => show("day", ms);
  const openMonth = (ms: number) => show("month", ms);

  const hero = (
    <section className="fc-hero" data-period={period} aria-labelledby="fc-h">
      <h1 id="fc-h" className="fc-hero__title">
        {profile.name}'s forecast
      </h1>
      <div className="v-seg fc-tabs" role="tablist" aria-label="Forecast period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            onClick={() => {
              countEvent(`forecast-${p.id}`);
              show(p.id, null);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>
      {f ? (
        <>
          <div className="fc-nav">
            <button
              type="button"
              className="v-iconbtn"
              aria-label={`Previous ${period}`}
              onClick={() => setAt(shift(period, atMs, zone, -1))}
            >
              <ChevronLeft />
            </button>
            <div className="fc-nav__when">
              <span className="fc-nav__label">{periodLabel(period, f.startMs, f.endMs, zone)}</span>
              {isNow ? null : (
                <button type="button" className="fc-nav__back" onClick={() => setAt(null)}>
                  Back to now
                </button>
              )}
            </div>
            <button type="button" className="v-iconbtn" aria-label={`Next ${period}`} onClick={() => setAt(shift(period, atMs, zone, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>

          {period === "day" && sky && guide ? (
            <div className="fc-dial" key={f.startMs}>
              <SkyScene
                nowMs={skyAt}
                sunriseMs={sky.riseMs}
                sunsetMs={sky.setMs}
                elongation={sky.elongation}
                good={guide.bestHours}
                avoid={guide.avoid}
                riseLabel={t12(sky.riseMs, zone)}
                setLabel={t12(sky.setMs, zone)}
                label={`The sky of ${periodLabel("day", f.startMs, f.endMs, zone)}: sunrise ${t12(sky.riseMs, zone)}, sunset ${t12(sky.setMs, zone)}, ${guide.bestHours.length} good ${guide.bestHours.length === 1 ? "hour" : "hours"} lit along the Sun's path, and Rāhu Kāla marked.`}
              />
              <div className="fc-dial__center">
                <Answer f={f} eyebrow={eyebrow} />
              </div>
            </div>
          ) : (
            <>
              <div className="fc-answer">
                <Answer f={f} eyebrow={eyebrow} />
              </div>
              {period === "day" ? null : (
                <PeriodPicture
                  key={`${period}-${f.startMs}`}
                  f={f}
                  zone={zone}
                  now={nowMs}
                  lead={edges?.lead ?? null}
                  tail={edges?.tail ?? null}
                  onOpenDay={openDay}
                  onOpenMonth={openMonth}
                />
              )}
            </>
          )}
          {period === "day" && sky && guide ? (
            <ul className="fc-legend" aria-hidden="true">
              <li>
                <i className="fc-legend__good" />
                Good hours
              </li>
              <li>
                <i className="fc-legend__avoid" />
                Pause new starts
              </li>
            </ul>
          ) : null}

          <p className="fc-hero__line">{f.headline}</p>
          {hours ? (
            <p className="fc-hero__now" data-state={hours.state}>
              <i aria-hidden="true" />
              {hours.text}
            </p>
          ) : null}
          {period === "day" && sky && guide ? (
            <div className="v-actions share-row">
              <ShareButton
                kind="day"
                name={profile.name}
                zone={zone}
                nowMs={nowMs}
                forecast={f}
                guide={guide}
                sunriseMs={sky.riseMs}
                sunsetMs={sky.setMs}
                elongation={sky.elongation}
              />
            </div>
          ) : null}
          <p className="fc-sr" aria-live="polite">
            {periodLabel(period, f.startMs, f.endMs, zone)}: {TONE_WORD[f.tone]}, {pct(f.score)} of 100.
          </p>
        </>
      ) : null}
    </section>
  );
  const band = period === "day" && sky && guide ? (isNow ? skyPhase(nowMs, sky.riseMs, sky.setMs) : "day") : "night";

  return (
    <Page label="Forecast" wide className="forecast" hero={hero} sky={band}>
      {f ? (
        <>
          <div className="v-cols fc-cols" key={`${period}-${f.startMs}`}>
            {guide ? (
              <div className="v-stack fc-block">
                <Reveal i={0}>
                  <DoLists g={guide} />
                </Reveal>
                <Reveal i={1}>
                  <HoursCard g={guide} zone={zone}>
                    <HereLine profile={profile} />
                  </HoursCard>
                </Reveal>
              </div>
            ) : null}
            {period === "week" ? (
              <Reveal i={0} className="fc-block">
                <WeekList f={f} zone={zone} now={nowMs} onOpenDay={openDay} />
              </Reveal>
            ) : null}
            {period === "month" ? (
              <Reveal i={0} className="fc-block">
                <MonthGrid f={f} zone={zone} now={nowMs} onOpenDay={openDay} />
              </Reveal>
            ) : null}
            {period === "quarter" || period === "year" ? (
              <Reveal i={0} className="fc-block">
                <MonthRows f={f} zone={zone} now={nowMs} onOpenMonth={openMonth} />
              </Reveal>
            ) : null}
            {personal ? (
              <Reveal i={2} className="fc-block">
                <AreasCard r={personal.r} title={AREAS_TITLE[period]} />
              </Reveal>
            ) : null}
          </div>

          <Reveal i={3} className="v-stack fc-block">
            <Section title="The astrology behind this" />
            <div className="fc-behind">
              {period === "day" && step0 ? <MoonFold step={step0} elongation={sky?.elongation ?? null} /> : null}
              <TransitsFold lines={f.lines} />
              {personal ? <ContactsFold r={personal.r} /> : null}
              {personal && period !== "day" ? <StrengthFold r={personal.r} /> : null}
              <DashaFold dasha={f.dasha} zone={zone} />
              <SaturnFold sade={f.sadeSati} />
              <EventsFold f={f} zone={zone} />
              {period === "year" ? (
                <Fold title={`Personal year ${py}`} sub={`In numerology, ${pyLord?.english}'s year`}>
                  <p>
                    In numerology this is {pyLord?.english}'s year, read as a time for {pyLord?.signifies}.
                  </p>
                  <Link to="/explore/numbers" className="v-link fc-open">
                    More numbers <ChevronRight size={16} />
                  </Link>
                </Fold>
              ) : null}
              <MethodFold name={profile.name} moonSign={moonSignText} />
            </div>
          </Reveal>

          <p className="v-foot">A traditional reading for reflection, never a prediction or advice.</p>
        </>
      ) : (
        <div className="v-skel">{ready ? "This period could not be read." : "Reading the sky…"}</div>
      )}
    </Page>
  );
}
