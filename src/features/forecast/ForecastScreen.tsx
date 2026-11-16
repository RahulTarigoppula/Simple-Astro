// Forecasts for a day, week, month, quarter or year, read the classical way (gochara from the natal
// Moon, Tārā/Candra-bala, the running daśā). The answer comes first; the astrology is folded below.
import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { useActiveProfile, useHere, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { ChevronLeft, ChevronRight, Page } from "../../components/ui/Page";
import { RASHI_LORE } from "../../data/lore";
import { rashiBoth } from "../../data/regional";
import { CHAPTER_SHORT } from "../../data/traits";
import { type Forecast, forecast, type Period, periodBounds } from "../../engine/forecast";
import { computePanchang } from "../../engine/panchang";
import { dayGuide, personalReading } from "../../engine/personal";
import { personalYear } from "../../engine/profile";
import { safeZone } from "../../engine/time";
import { countEvent } from "../../platform/stats";
import { IconForecast } from "../chowki/icons";
import { HereLine } from "../here/HereSheet";
import { ContactsFold, DashaFold, EventsFold, MethodFold, SaturnFold, StrengthFold, saturnName, TransitsFold } from "./Folds";
import { MonthGrid, MonthRows, WeekStrip } from "./PeriodViews";
import { AreasCard, DoCards, HoursCard, MoonCard } from "./PersonalSections";
import { english, fmt, HALF_DAY, lore, pct, TONE_HINT, TONE_WORD } from "./util";
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

/** The ring: how supportive the period reads, 0 to 100. */
function Ring({ score, word }: { score: number; word: string }) {
  const r = 44;
  const c = 2 * Math.PI * r;
  const p = Math.max(4, pct(score));
  return (
    <div className="fc-ring" role="img" aria-label={`${word}. Support ${pct(score)} out of 100.`}>
      <svg viewBox="0 0 104 104" aria-hidden="true">
        <circle cx="52" cy="52" r={r} className="fc-ring__track" />
        <circle cx="52" cy="52" r={r} className="fc-ring__fill" strokeDasharray={`${(p / 100) * c} ${c}`} transform="rotate(-90 52 52)" />
      </svg>
      <span className="fc-ring__num">{pct(score)}</span>
      <span className="fc-ring__of">of 100</span>
    </div>
  );
}

function Hero({ f, eyebrow }: { f: Forecast; eyebrow: string }) {
  const word = TONE_WORD[f.tone];
  const md = f.dasha.find((d) => d.level === "MD");
  return (
    <section className="v-card v-card--hero fc-hero" data-tone={f.tone} aria-labelledby="fc-hero-h" aria-live="polite">
      <div className="fc-hero__top">
        <Ring score={f.score} word={word} />
        <div className="fc-hero__text">
          <p className="v-eyebrow">{eyebrow}</p>
          <h2 id="fc-hero-h" className="fc-hero__word">
            {word}
          </h2>
          <p className="fc-hero__hint">{TONE_HINT[f.tone]}</p>
        </div>
      </div>
      <p className="fc-hero__line">{f.headline}</p>
      {md || f.sadeSati !== "none" ? (
        <ul className="fc-hero__ctx">
          {md ? (
            <li>
              <span className="fc-hero__k">Life chapter</span> {english(md.lord)}: {CHAPTER_SHORT[md.lord]}
            </li>
          ) : null}
          {f.sadeSati !== "none" ? (
            <li>
              <span className="v-chip v-chip--mixed fc-chip">Saturn season: {saturnName(f.sadeSati)}</span>
            </li>
          ) : null}
        </ul>
      ) : null}
    </section>
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

  if (profiles === undefined) return <Page label="Forecast">{null}</Page>;
  if (!profile) return <Empty />;

  const moonSign = patri ? RASHI_LORE[patri.grahas.MO.sign] : undefined;
  const moonSignText = moonSign && patri ? `${rashiBoth(patri.grahas.MO.sign, profile.tradition)} · ${moonSign.western}` : "";
  const py = personalYear(profile.birth.localMo, profile.birth.localD, Number(fmt(atMs, zone, { year: "numeric" })));
  const pyLord = lore(YEAR_LORD[py as keyof typeof YEAR_LORD]);
  const isNow = f ? nowMs >= f.startMs && nowMs < f.endMs : false;
  const step0 = f?.steps[0];

  return (
    <Page label="Forecast" title={`${profile.name}'s forecast`} wide className="forecast">
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
              {isNow ? (
                <span className="fc-nav__now">{THIS[period]}</span>
              ) : (
                <button type="button" className="v-link" onClick={() => setAt(null)}>
                  Back to now
                </button>
              )}
            </div>
            <button type="button" className="v-iconbtn" aria-label={`Next ${period}`} onClick={() => setAt(shift(period, atMs, zone, 1))}>
              <ChevronRight size={20} />
            </button>
          </div>

          <Hero f={f} eyebrow={isNow ? THIS[period] : periodLabel(period, f.startMs, f.endMs, zone)} />

          {period === "day" ? (
            <>
              <div className="v-cols">
                <div className="v-stack">
                  {personal?.g ? <DoCards g={personal.g} /> : null}
                  {step0 ? <MoonCard step={step0} elongation={sky?.elongation ?? null} /> : null}
                </div>
                {personal?.g ? (
                  <HoursCard
                    g={personal.g}
                    zone={zone}
                    sun={sky ? { riseMs: sky.riseMs, setMs: sky.setMs } : null}
                    now={isNow ? nowMs : null}
                  >
                    <HereLine profile={profile} />
                  </HoursCard>
                ) : null}
              </div>
              {personal ? <AreasCard r={personal.r} title={AREAS_TITLE.day} split /> : null}
            </>
          ) : null}

          {period === "week" ? (
            <>
              <WeekStrip key={f.startMs} f={f} zone={zone} now={nowMs} onOpenDay={(ms) => show("day", ms)} />
              {personal ? <AreasCard r={personal.r} title={AREAS_TITLE.week} split /> : null}
            </>
          ) : null}

          {period === "month" ? (
            <div className="v-cols">
              <MonthGrid f={f} zone={zone} now={nowMs} />
              {personal ? <AreasCard r={personal.r} title={AREAS_TITLE.month} /> : null}
            </div>
          ) : null}

          {period === "quarter" || period === "year" ? (
            <div className="v-cols">
              <div className="v-stack">
                <MonthRows f={f} zone={zone} now={nowMs} />
                {period === "year" ? (
                  <section className="v-card fc-num" aria-labelledby="fc-num-h">
                    <span className="fc-num__n" aria-hidden="true">
                      {py}
                    </span>
                    <div>
                      <h2 id="fc-num-h" className="v-card__title">
                        Personal year {py}
                      </h2>
                      <p>
                        In numerology this is {pyLord?.english}'s year, read as a time for {pyLord?.signifies}.
                      </p>
                      <Link to="/explore/numbers" className="v-link fc-num__more">
                        More numbers <ChevronRight size={16} />
                      </Link>
                    </div>
                  </section>
                ) : null}
              </div>
              {personal ? <AreasCard r={personal.r} title={AREAS_TITLE[period]} /> : null}
            </div>
          ) : null}

          <h2 className="fc-more">The astrology behind this</h2>
          <div className="v-cols fc-folds">
            <div className="v-stack">
              <TransitsFold lines={f.lines} />
              {personal ? <ContactsFold r={personal.r} /> : null}
              {personal && period !== "day" ? <StrengthFold r={personal.r} /> : null}
            </div>
            <div className="v-stack">
              <DashaFold dasha={f.dasha} zone={zone} />
              <SaturnFold sade={f.sadeSati} />
              <EventsFold f={f} zone={zone} />
              <MethodFold name={profile.name} moonSign={moonSignText} />
            </div>
          </div>

          <p className="v-foot">A traditional reading for reflection, never a prediction or advice.</p>
        </>
      ) : (
        <div className="v-skel">{ready ? "This period could not be read." : "Reading the sky…"}</div>
      )}
    </Page>
  );
}
