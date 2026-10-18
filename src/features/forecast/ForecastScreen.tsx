// Forecasts for a day, week, month, quarter or year, read the classical way (gochara from the natal
// Moon, Tārā/Candra-bala, the running daśā) and explained in plain English.
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { Screen } from "../../components/ui/Screen";
import { GRAHA_LORE, RASHI_LORE } from "../../data/lore";
import type { SkyEvent } from "../../engine/events";
import { type Forecast, forecast, HOUSE_AREA, ord, type Period, periodBounds } from "../../engine/forecast";
import { dayGuide, personalReading } from "../../engine/personal";
import { personalYear } from "../../engine/profile";
import type { GrahaId } from "../../engine/types";
import "../cosmic/cosmic.css";
import { AreasCard, ContactsCard, DayGuideCard, DayNotes, StrengthCard } from "./PersonalSections";
import "./forecast.css";
import { rashiBoth } from "../../data/regional";
import { safeZone } from "../../engine/time";
import { countEvent } from "../../platform/stats";

/** The nine tārās in a word of English, beside the Sanskrit. */
const TARA_ENGLISH: Record<string, string> = {
  Janma: "your own",
  Sampat: "gain",
  Vipat: "trouble",
  Kṣema: "well-being",
  Pratyari: "obstacle",
  Sādhaka: "achievement",
  Vadha: "hardest",
  Mitra: "friend",
  "Parama-Mitra": "best friend",
};
const PERIODS: Array<{ id: Period; label: string }> = [
  { id: "day", label: "Day" },
  { id: "week", label: "Week" },
  { id: "month", label: "Month" },
  { id: "quarter", label: "Quarter" },
  { id: "year", label: "Year" },
];
const DAY = 86_400_000;
const TONE_WORD = { bright: "Bright", steady: "Steady", mixed: "Mixed", testing: "Quiet" } as const;
const TONE_HINT = {
  bright: "Most of the sky favours you",
  steady: "More help than hindrance",
  mixed: "Help and hindrance in balance",
  testing: "Tradition advises patience",
} as const;
const lore = (id: GrahaId) => GRAHA_LORE.find((g) => g.id === id);

function fmt(ms: number, zone: string, o: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-GB", { ...o, timeZone: safeZone(zone) }).format(ms);
}

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
  return dir === 1 ? e + DAY / 2 : s - DAY / 2;
}

function eventText(e: SkyEvent): string {
  const g = e.graha ? lore(e.graha) : undefined;
  const sign = e.sign !== undefined ? RASHI_LORE[e.sign] : undefined;
  switch (e.kind) {
    case "full":
      return "Full Moon (Pūrṇimā)";
    case "new":
      return "New Moon (Amāvasyā)";
    case "ekadashi":
      return `${e.shukla ? "Śukla" : "Kṛṣṇa"} Ekādaśī begins`;
    case "lunar-eclipse":
      return `${e.eclipse} lunar eclipse${e.visibleHere ? " (visible here)" : " (not visible here)"}`;
    case "solar-eclipse":
      return `${e.eclipse} solar eclipse${e.visibleHere ? " (visible here)" : " (not visible here)"}`;
    case "sankranti":
      return `Sun enters ${sign?.name} (${sign?.western})`;
    case "ingress":
      return `${g?.english} enters ${sign?.name} (${sign?.western})`;
    case "station":
      return `${g?.english} turns ${e.retro ? "retrograde" : "direct"}`;
  }
}

function keepEvent(p: Period, e: SkyEvent): boolean {
  if (p === "year")
    return e.kind.endsWith("eclipse") || ((e.kind === "ingress" || e.kind === "station") && ["JU", "SA", "RA"].includes(e.graha ?? ""));
  if (p === "quarter") return e.kind !== "ekadashi" && !(e.kind === "ingress" && e.graha === "ME");
  return true;
}

const WEEKDAYS = [
  ["mon", "M"],
  ["tue", "T"],
  ["wed", "W"],
  ["thu", "T"],
  ["fri", "F"],
  ["sat", "S"],
  ["sun", "S"],
] as const;

/** 0 = Monday … 6 = Sunday, in the zone. */
function monIndex(ms: number, zone: string): number {
  return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(fmt(ms, zone, { weekday: "short" }));
}

function Steps({ f, zone }: { f: Forecast; zone: string }) {
  if (f.period === "day") return null;
  const best = [...f.steps].sort((a, b) => b.score - a.score)[0];
  const cal = f.period === "month";
  return (
    <section className="cosmic-card fc-steps" aria-labelledby="fc-steps-h">
      <header className="cosmic-card__head">
        <h2 id="fc-steps-h">
          {f.period === "week" ? "Day by day" : cal ? "The month at a glance" : "Month by month"}
          <span className="gloss">
            {f.period === "week" || cal
              ? "taller = more supportive, by the Moon's daily position and star"
              : "by Jupiter, Saturn and the nodes"}
          </span>
        </h2>
      </header>
      {cal ? (
        <div className="fc-wd" aria-hidden="true">
          {WEEKDAYS.map(([key, d]) => (
            <span key={key}>{d}</span>
          ))}
        </div>
      ) : null}
      <ol className={`fc-bars${cal ? " fc-bars--cal" : ""}`}>
        {f.steps.map((s) => {
          const tone = s.score >= 0.35 ? "bright" : s.score >= 0 ? "steady" : s.score >= -0.35 ? "mixed" : "testing";
          const label =
            f.period === "week"
              ? fmt(s.ms + DAY / 2, zone, { weekday: "short" })
              : cal
                ? fmt(s.ms + DAY / 2, zone, { day: "numeric" })
                : fmt(s.ms + DAY, zone, { month: "short" });
          const title = `${f.period === "week" || cal ? fmt(s.ms + DAY / 2, zone, { weekday: "long", day: "numeric", month: "short" }) : fmt(s.ms + DAY, zone, { month: "long" })}: ${TONE_WORD[tone]}${s.tara ? ` · Moon in your ${ord(s.moonHouse)} · ${s.tara} tārā` : ""}`;
          return (
            <li
              key={s.ms}
              className={`fc-bar fc-bar--${tone}${s === best ? " is-best" : ""}`}
              title={title}
              aria-label={title}
              style={cal && s === f.steps[0] ? { gridColumnStart: monIndex(s.ms + DAY / 2, zone) + 1 } : undefined}
            >
              <span className="fc-bar__fill" style={{ height: `${Math.round(18 + ((s.score + 1) / 2) * 82)}%` }} />
              <span className="fc-bar__k">{label}</span>
            </li>
          );
        })}
      </ol>
      {best ? (
        <p className="fc-best">
          ★ Best {f.period === "week" || cal ? "day" : "month"}:{" "}
          <strong>
            {f.period === "week" || cal
              ? fmt(best.ms + DAY / 2, zone, { weekday: "long", day: "numeric", month: "short" })
              : fmt(best.ms + DAY, zone, { month: "long" })}
          </strong>
        </p>
      ) : null}
    </section>
  );
}

export default function ForecastScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profiles = useProfiles();
  const active = useActiveProfile();
  const profile = (id ? profiles?.find((p) => p.id === id) : active) ?? active;
  const settings = useSettings();
  const { patri } = usePatri(profile, settings.preset);
  const nowMs = useNowMs(60_000);
  const [period, setPeriod] = useState<Period>("day");
  const [at, setAt] = useState<number | null>(null);
  const zone = profile?.birth.zone ?? "Asia/Kolkata";
  const atMs = at ?? nowMs;
  const place = profile ? { lat: profile.birth.place.lat, lon: profile.birth.place.lon } : { lat: 12.97, lon: 77.59 };
  const { lat, lon } = place;

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
      const mid = period === "day" ? f.startMs + 43_200_000 : (f.startMs + f.endMs) / 2;
      const r = personalReading(patri, mid, settings.preset);
      const g = period === "day" ? dayGuide(patri, mid, { lat, lon }, settings.preset, r.areas) : null;
      return { r, g };
    } catch {
      return null;
    }
  }, [patri, profile, f, period, settings.preset, lat, lon]);

  if (profiles !== undefined && !profile) {
    return (
      <Screen className="forecast" label="Forecast">
        <div className="fc-empty">
          <p className="fc-kicker">Forecast · भविष्य</p>
          <h1>Your sky ahead</h1>
          <p className="fc-empty__lede">
            Add your birth date, time and place once. Vyomaphala then reads every day, week, month and year from where the planets really
            are.
          </p>
          <ul className="fc-empty__list">
            <li>A guide for today: good for, go easy on, and your best hours</li>
            <li>Your life area by area: work, money, love, health, mind, home and luck</li>
            <li>Planets crossing your own birth chart, and your current life chapter</li>
          </ul>
          <Link to="/leaf/new" className="stamp">
            <span>Add your birth details</span>
          </Link>
          <p className="fc-empty__note">Takes about a minute. Stays on this device.</p>
        </div>
      </Screen>
    );
  }

  const moonSign = patri ? RASHI_LORE[patri.grahas.MO.sign] : undefined;
  const good = f?.lines.filter((l) => l.favourable) ?? [];
  const care = f?.lines.filter((l) => !l.favourable) ?? [];
  const py = profile ? personalYear(profile.birth.localMo, profile.birth.localD, Number(fmt(atMs, zone, { year: "numeric" }))) : 0;

  return (
    <Screen className="forecast" label="Forecast">
      <header className="fc-head">
        <p className="fc-kicker">Forecast · भविष्य</p>
        <h1>{profile ? `${profile.name}'s sky ahead` : "Your sky ahead"}</h1>
        <p className="fc-lede">
          Read the classical way: where the planets are, counted from {profile?.name ?? "your"}'s Moon sign
          {moonSign && patri ? ` (${rashiBoth(patri.grahas.MO.sign, profile?.tradition)} · ${moonSign.western})` : ""}, plus the running
          life chapter (daśā). <InfoDot id="gochar" />
        </p>
        {profiles && profiles.length > 1 ? (
          <div className="fc-people" role="group" aria-label="Whose forecast">
            {profiles.map((p) => (
              <button key={p.id} type="button" aria-pressed={p.id === profile?.id} onClick={() => navigate(`/forecast/${p.id}`)}>
                {p.name}
              </button>
            ))}
          </div>
        ) : null}
      </header>

      <div className="seg fc-tabs" role="tablist" aria-label="Forecast period">
        {PERIODS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="tab"
            aria-selected={period === p.id}
            onClick={() => {
              setPeriod(p.id);
              countEvent(`forecast-${p.id}`);
              setAt(null);
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {f ? (
        <>
          <div className="fc-nav">
            <button type="button" className="fc-step" aria-label="Previous" onClick={() => setAt(shift(period, atMs, zone, -1))}>
              ←
            </button>
            <div className="fc-when">
              <span className="fc-when__label">{periodLabel(period, f.startMs, f.endMs, zone)}</span>
              {at !== null ? (
                <button type="button" className="linkish" onClick={() => setAt(null)}>
                  back to now
                </button>
              ) : (
                <span className="fc-when__now">now</span>
              )}
            </div>
            <button type="button" className="fc-step" aria-label="Next" onClick={() => setAt(shift(period, atMs, zone, 1))}>
              →
            </button>
          </div>

          <section className={`fc-hero fc-hero--${f.tone}`} aria-live="polite">
            <div className="fc-orb" aria-hidden="true">
              <span />
            </div>
            <div className="fc-hero__text">
              <p className="fc-tone">
                {TONE_WORD[f.tone]} <span>{TONE_HINT[f.tone]}</span>
              </p>
              <p className="fc-headline">
                {profile ? <strong>{profile.name}, </strong> : null}
                {f.headline[0]?.toLowerCase() + f.headline.slice(1)}
              </p>
              <div className="fc-meter" role="img" aria-label={`Support score ${Math.round(((f.score + 1) / 2) * 100)} out of 100`}>
                <span style={{ width: `${Math.round(((f.score + 1) / 2) * 100)}%` }} />
              </div>
            </div>
          </section>

          {period === "day" && f.steps[0] ? (
            <section className="cosmic-card fc-moon">
              <header className="cosmic-card__head">
                <h2>
                  The Moon today <InfoDot id="chandra-bala" />
                  <span className="gloss">the fastest mover sets the day's mood</span>
                </h2>
              </header>
              <div className="fc-moon__row">
                <GrahaGlyph id="MO" size={44} />
                <p>
                  The Moon is in your <strong>{ord(f.steps[0].moonHouse)} house</strong> from your Moon sign, the area of{" "}
                  {HOUSE_AREA[f.steps[0].moonHouse]}. Today's star is <strong>{f.steps[0].tara}</strong>
                  {TARA_ENGLISH[f.steps[0].tara] ? ` (${TARA_ENGLISH[f.steps[0].tara]})` : ""} for you (
                  {f.steps[0].taraTone === "kind"
                    ? "a kind one"
                    : f.steps[0].taraTone === "unkind"
                      ? "one tradition calls unkind"
                      : "your own birth star, so mixed"}
                  ) <InfoDot id="tara-bala" />.
                </p>
              </div>
            </section>
          ) : null}

          {personal?.g && profile ? <DayGuideCard g={personal.g} zone={zone} name={profile.name} /> : null}

          {personal && profile ? <AreasCard r={personal.r} name={profile.name} /> : null}

          <Steps f={f} zone={zone} />

          {period === "week" ? <DayNotes steps={f.steps} zone={zone} /> : null}

          {personal ? <ContactsCard r={personal.r} /> : null}

          {personal && period !== "day" ? <StrengthCard r={personal.r} /> : null}

          <div className="fc-two">
            <section className="cosmic-card fc-list fc-list--good">
              <header className="cosmic-card__head">
                <h2>
                  Working for you <span className="gloss">favourable transits by the classical table</span>
                </h2>
              </header>
              {good.length ? (
                <ul>
                  {good.map((l) => (
                    <li key={l.graha}>
                      <GrahaGlyph id={l.graha} size={34} />
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p p--muted">No planet in a favourable house for this period. A time to rest and plan.</p>
              )}
            </section>
            <section className="cosmic-card fc-list fc-list--care">
              <header className="cosmic-card__head">
                <h2>
                  Go gently with <span className="gloss">transits tradition reads as strain</span>
                </h2>
              </header>
              {care.length ? (
                <ul>
                  {care.map((l) => (
                    <li key={l.graha}>
                      <GrahaGlyph id={l.graha} size={34} />
                      <span>{l.text}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="p p--muted">Nothing strained. Every listed planet is in a supportive house.</p>
              )}
            </section>
          </div>

          {f.sadeSati !== "none" ? (
            <section className="cosmic-card fc-saturn">
              <GrahaGlyph id="SA" size={44} />
              <div>
                <h2>
                  {f.sadeSati === "kantaka" ? "Kaṇṭaka Śani" : f.sadeSati === "ashtama" ? "Aṣṭama Śani" : `Sāḍe Sātī, ${f.sadeSati} phase`}{" "}
                  <InfoDot id="sade-sati" />
                </h2>
                <p>
                  {f.sadeSati === "kantaka"
                    ? "Saturn is in a 'thorn' house (4th, 7th or 10th) from your Moon. Tradition reads extra effort at home, in partnerships or at work."
                    : f.sadeSati === "ashtama"
                      ? "Saturn is in the 8th from your Moon, a stretch tradition associates with slow, deep change."
                      : "Saturn is passing over your Moon sign's neighbourhood: a 7½-year season of responsibility and maturing. Everyone meets it about every 30 years."}
                </p>
              </div>
            </section>
          ) : null}

          <section className="cosmic-card fc-dasha">
            <header className="cosmic-card__head">
              <h2>
                Your life chapter <InfoDot id="dasha" />
                <span className="gloss">the Viṃśottarī periods running in this window</span>
              </h2>
            </header>
            <ol>
              {f.dasha.map((d) => (
                <li key={`${d.level}-${d.startMs}`} className={`fc-dasha__${d.level}`}>
                  <GrahaGlyph id={d.lord} size={32} />
                  <div>
                    <p className="fc-dasha__t">
                      {d.level === "MD" ? "Chapter" : d.level === "AD" ? "Sub-chapter" : "Phase"}: {lore(d.lord)?.english} (
                      {lore(d.lord)?.name})
                    </p>
                    <p className="fc-dasha__s">
                      {fmt(d.startMs, zone, { day: "numeric", month: "short", year: "numeric" })} →{" "}
                      {fmt(d.endMs, zone, { day: "numeric", month: "short", year: "numeric" })} · tradition reads it through{" "}
                      {lore(d.lord)?.signifies}.
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {f.events.filter((e) => keepEvent(period, e)).length ? (
            <section className="cosmic-card fc-events">
              <header className="cosmic-card__head">
                <h2>In the sky this {period}</h2>
              </header>
              <ul>
                {f.events
                  .filter((e) => keepEvent(period, e))
                  .slice(0, 24)
                  .map((e) => (
                    <li key={`${e.kind}-${e.ms}-${e.graha ?? ""}`}>
                      <span className="fc-events__d mono">{fmt(e.ms, zone, { day: "2-digit", month: "short" })}</span>
                      <span>{eventText(e)}</span>
                    </li>
                  ))}
              </ul>
            </section>
          ) : null}

          {period === "year" ? (
            <section className="cosmic-card fc-num">
              <span className="cp-sign cp-sign--num" aria-hidden="true">
                {py}
              </span>
              <p>
                <strong>Personal year {py}</strong> in numerology:{" "}
                {lore(({ 1: "SU", 2: "MO", 3: "JU", 4: "RA", 5: "ME", 6: "VE", 7: "KE", 8: "SA", 9: "MA" } as const)[py as 1])?.english}'s
                year, read as a time for{" "}
                {lore(({ 1: "SU", 2: "MO", 3: "JU", 4: "RA", 5: "ME", 6: "VE", 7: "KE", 8: "SA", 9: "MA" } as const)[py as 1])?.signifies}.{" "}
                <Link to="/explore/numbers" className="linkish">
                  More numbers
                </Link>
              </p>
            </section>
          ) : null}

          <aside className="fc-karma">
            <span className="fc-karma__k">कर्म · Karma, not fate</span>
            <p>
              A forecast shows what <em>could</em> happen, like the weather. What does happen is shaped by your karma: your own choices and
              actions. Use this to reflect and plan, never to fear.
            </p>
          </aside>

          <p className="fc-foot">
            How this is read: each planet's house is counted from the natal Moon sign and checked against the classical table of favourable
            houses (Phaladīpikā ch. 26); days add the Moon's Tārā-bala and Candra-bala. It is a traditional reading for reflection. It is
            not a prediction of events and not advice.
          </p>
        </>
      ) : (
        <p className="p p--muted fc-wait">Reading the sky…</p>
      )}
    </Screen>
  );
}
