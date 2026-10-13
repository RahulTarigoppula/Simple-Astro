// The personal half of a forecast: life areas, natal contacts, transit strength, the day's guide and
// day-by-day notes — all read from the person's own chart.
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { GRAHA_LORE } from "../../data/lore";
import { type DayRating, HOUSE_AREA, ord } from "../../engine/forecast";
import type { AreaReading, DayGuide, PersonalReading } from "../../engine/personal";
import "./personal.css";

const fmt = (ms: number, zone: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("en-GB", { ...o, timeZone: zone }).format(ms);
const hm = (ms: number, zone: string) => fmt(ms, zone, { hour: "2-digit", minute: "2-digit", hour12: false });
const toneOf = (s: number) => (s >= 0.35 ? "bright" : s >= 0 ? "steady" : s >= -0.35 ? "mixed" : "testing");
const WORD = { bright: "Strong", steady: "Good", mixed: "Mixed", testing: "Go gently" } as const;
/** Line icons for the life areas (24-grid, currentColor) — the app's own icon language, not emoji. */
const AREA_PATH: Record<AreaReading["id"], string> = {
  career: "M4 8h16v11H4zM9 8V5.5h6V8M4 13h16",
  money:
    "M12 3.5a8.5 8.5 0 1 0 0 17a8.5 8.5 0 1 0 0-17zM14.5 9.5c-.5-1-1.4-1.5-2.5-1.5-1.5 0-2.5.8-2.5 2s1 1.7 2.5 2 2.5.8 2.5 2-1 2-2.5 2c-1.2 0-2.1-.5-2.6-1.5M12 6.5v1.5M12 16v1.5",
  love: "M12 19s-7-4.3-7-9.2A3.8 3.8 0 0 1 12 7.6a3.8 3.8 0 0 1 7 2.2C19 14.7 12 19 12 19z",
  health: "M5 19c8 0 13-5 14-14-9 1-14 6-14 14zM5 19l7-7",
  mind: "M12 18c-4 0-7-2-8-5 3 0 5 1 8 5zM12 18c4 0 7-2 8-5-3 0-5 1-8 5zM12 18c-2-3-2-7 0-11 2 4 2 8 0 11z",
  home: "M4 11.5 12 5l8 6.5M6.5 10v9h11v-9M10 19v-5h4v5",
  luck: "M12 4l2.3 5 5.2.5-3.9 3.5 1.1 5.2L12 15.6 7.3 18.2l1.1-5.2L4.5 9.5l5.2-.5z",
};
function AreaIcon({ id }: { id: AreaReading["id"] }) {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={AREA_PATH[id]} />
    </svg>
  );
}

export function AreasCard({ r, name }: { r: PersonalReading; name: string }) {
  return (
    <section className="cosmic-card fc-areas" aria-labelledby="fc-areas-h">
      <header className="cosmic-card__head">
        <h2 id="fc-areas-h">
          {name}'s life, area by area <InfoDot id="bhava" />
          <span className="gloss">each read from the planets in your own houses and their aṣṭakavarga strength</span>
        </h2>
      </header>
      <ul className="fc-areas__list">
        {r.areas.map((a) => {
          const t = toneOf(a.score);
          return (
            <li key={a.id} className={`fc-area fc-area--${t}`}>
              <span className="fc-area__icon" aria-hidden="true">
                <AreaIcon id={a.id} />
              </span>
              <div className="fc-area__body">
                <div className="fc-area__top">
                  <span className="fc-area__label">{a.label}</span>
                  <span className="fc-area__word">{WORD[t]}</span>
                </div>
                <div className="fc-area__bar" role="img" aria-label={`${a.label}: ${WORD[t]}`}>
                  <span style={{ width: `${Math.round(((a.score + 1) / 2) * 100)}%` }} />
                </div>
                <p className="fc-area__why">{a.why}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function ContactsCard({ r }: { r: PersonalReading }) {
  if (!r.contacts.length) return null;
  return (
    <section className="cosmic-card fc-contacts" aria-labelledby="fc-contacts-h">
      <header className="cosmic-card__head">
        <h2 id="fc-contacts-h">
          Touching your birth chart <span className="gloss">planets in the sky now sitting on planets you were born with</span>
        </h2>
      </header>
      <ul>
        {r.contacts.slice(0, 5).map((c) => (
          <li key={`${c.transit}-${c.natal}`}>
            <span className="fc-contacts__pair" aria-hidden="true">
              <GrahaGlyph id={c.transit} size={34} />
              {c.natal === "LAGNA" ? <span className="cp-sign">Lg</span> : <GrahaGlyph id={c.natal} size={34} />}
            </span>
            <span>{c.text}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function StrengthCard({ r }: { r: PersonalReading }) {
  return (
    <section className="cosmic-card fc-strength" aria-labelledby="fc-strength-h">
      <header className="cosmic-card__head">
        <h2 id="fc-strength-h">
          How well each planet travels for you <InfoDot id="ashtakavarga" />
          <span className="gloss">points out of 8 your chart gives each planet in the sign it's crossing (BPHS ch. 66)</span>
        </h2>
      </header>
      <ul className="fc-strength__grid">
        {r.strength.map((s) => (
          <li key={s.graha} className={s.bindus >= 5 ? "is-strong" : s.bindus <= 3 ? "is-weak" : undefined}>
            <GrahaGlyph id={s.graha} size={32} />
            <span className="fc-strength__n">{s.bindus}</span>
            <span className="fc-strength__dots" aria-hidden="true">
              {"●".repeat(s.bindus)}
              <i>{"●".repeat(8 - s.bindus)}</i>
            </span>
            <span className="fc-strength__t">{GRAHA_LORE.find((g) => g.id === s.graha)?.english}</span>
          </li>
        ))}
      </ul>
      <p className="fc-strength__note">{[...r.strength].sort((a, b) => b.bindus - a.bindus)[0]?.text}</p>
    </section>
  );
}

export function DayGuideCard({ g, zone, name }: { g: DayGuide; zone: string; name: string }) {
  const lord = GRAHA_LORE.find((x) => x.id === g.lord);
  return (
    <section className="cosmic-card fc-guide" aria-labelledby="fc-guide-h">
      <header className="cosmic-card__head">
        <h2 id="fc-guide-h">
          {name}'s guide for today <span className="gloss">by tradition. Use what helps, ignore what doesn't.</span>
        </h2>
      </header>
      <div className="fc-guide__grid">
        <div className="fc-guide__box fc-guide__box--good">
          <p className="fc-guide__k">Good for</p>
          <ul>
            {g.goodFor.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="fc-guide__box fc-guide__box--easy">
          <p className="fc-guide__k">Go easy on</p>
          <ul>
            {g.easyOn.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
      </div>
      <div className="fc-guide__row">
        <span className="fc-guide__k">Best hours</span>
        <InfoDot id="hora" />
        <span className="fc-guide__hours">
          {g.bestHours.length
            ? g.bestHours.map((h) => (
                <span key={h.startMs} className="fc-chip">
                  <span className="mono">
                    {hm(h.startMs, zone)}–{hm(h.endMs, zone)}
                  </span>{" "}
                  {GRAHA_LORE.find((x) => x.id === h.lord)?.english}
                </span>
              ))
            : "none outside Rāhu Kāla today"}
        </span>
      </div>
      <div className="fc-guide__row">
        <span className="fc-guide__k">Pause new starts</span>
        <InfoDot id="rahu-kala" />
        <span className="fc-chip fc-chip--warn mono">
          {hm(g.avoid[0], zone)}–{hm(g.avoid[1], zone)}
        </span>
      </div>
      <div className="fc-guide__row">
        <span className="fc-guide__k">Colour of the day</span>
        <span className="fc-chip">
          {g.colour} · {lord?.english}'s day
        </span>
      </div>
    </section>
  );
}

export function DayNotes({ steps, zone }: { steps: DayRating[]; zone: string }) {
  return (
    <section className="cosmic-card fc-notes" aria-labelledby="fc-notes-h">
      <header className="cosmic-card__head">
        <h2 id="fc-notes-h">
          Day by day <span className="gloss">where the Moon walks in your chart, and the star it brings</span>
        </h2>
      </header>
      <ol>
        {steps.map((s) => {
          const t = toneOf(s.score);
          return (
            <li key={s.ms} className={`fc-note fc-note--${t}`}>
              <span className="fc-note__d">
                <strong>{fmt(s.ms + 43_200_000, zone, { weekday: "short" })}</strong>
                <span>{fmt(s.ms + 43_200_000, zone, { day: "numeric", month: "short" })}</span>
              </span>
              <span className="fc-note__t">
                <span className="fc-note__w">{WORD[t]}</span> · Moon in your {ord(s.moonHouse)}: {HOUSE_AREA[s.moonHouse]}; {s.tara} star (
                {s.taraTone === "kind" ? "kind" : s.taraTone === "unkind" ? "unkind" : "your own"})
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
