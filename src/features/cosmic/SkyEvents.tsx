// "Coming up in the sky": Moon phases, Ekādaśī, eclipses (seen here or not), saṅkrāntis, sign changes
// and retrograde stations for the weeks ahead — each in one plain line.
import { useMemo } from "react";
import { Link } from "react-router";
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { GRAHA_LORE, RASHI_LORE } from "../../data/lore";
import { type SkyEvent, skyEvents } from "../../engine/events";
import type { EnginePreset } from "../../engine/types";
import "./cosmic.css";

const HOUR = 3_600_000;

function when(ms: number, zone: string, nowMs: number): { day: string; time: string; rel: string } {
  const d = new Intl.DateTimeFormat("en-GB", { weekday: "short", day: "numeric", month: "short", timeZone: zone }).format(ms);
  const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }).format(ms);
  const days = Math.round((ms - nowMs) / (24 * HOUR));
  const rel = days <= 0 ? "today" : days === 1 ? "tomorrow" : `in ${days} days`;
  return { day: d, time, rel };
}

function describe(e: SkyEvent): { icon: React.ReactNode; title: string; note: string; tone: string; explain?: string } {
  const sign = e.sign !== undefined ? RASHI_LORE[e.sign] : undefined;
  const g = e.graha ? GRAHA_LORE.find((x) => x.id === e.graha) : undefined;
  switch (e.kind) {
    case "full":
      return {
        icon: <span className="ev-moon ev-moon--full" />,
        title: "Pūrṇimā · Full Moon",
        note: "The Moon is opposite the Sun. A festival day in many traditions.",
        tone: "moon",
        explain: "tithi",
      };
    case "new":
      return {
        icon: <span className="ev-moon ev-moon--new" />,
        title: "Amāvasyā · New Moon",
        note: "The Moon is beside the Sun and unseen; a day for honouring ancestors.",
        tone: "moon",
        explain: "tithi",
      };
    case "ekadashi":
      return {
        icon: <span className="ev-moon ev-moon--half" />,
        title: `${e.shukla ? "Śukla" : "Kṛṣṇa"} Ekādaśī begins`,
        note: "The 11th lunar day, kept as a fasting day by many Vaiṣṇavas.",
        tone: "moon",
        explain: "tithi",
      };
    case "lunar-eclipse":
      return {
        icon: <GrahaGlyph id="RA" size={34} />,
        title: `${cap(e.eclipse)} lunar eclipse`,
        note: e.visibleHere
          ? "Visible from here (weather permitting). In myth, Rāhu swallows the Moon."
          : "Not visible from this place. The Moon is below the horizon.",
        tone: e.visibleHere ? "eclipse" : "muted",
        explain: "rahu-ketu",
      };
    case "solar-eclipse":
      return {
        icon: <GrahaGlyph id="RA" size={34} />,
        title: `${cap(e.eclipse)} solar eclipse`,
        note: e.visibleHere
          ? "Visible from here. Never look at the Sun without eclipse glasses."
          : "Not visible from this place; seen elsewhere on Earth.",
        tone: e.visibleHere ? "eclipse" : "muted",
        explain: "rahu-ketu",
      };
    case "sankranti":
      return {
        icon: <GrahaGlyph id="SU" size={34} />,
        title: `${sign?.name ?? ""} Saṅkrānti`,
        note: `The Sun enters ${sign?.name} (${sign?.western}) in the sidereal zodiac.`,
        tone: "gold",
        explain: "sidereal",
      };
    case "ingress":
      return {
        icon: e.graha ? <GrahaGlyph id={e.graha} size={34} /> : null,
        title: `${g?.english} enters ${sign?.name}`,
        note: `${g?.name} moves into ${sign?.name} (${sign?.western}), ruled by ${GRAHA_LORE.find((x) => x.id === sign?.ruler)?.english}.`,
        tone: "violet",
        explain: "gochar",
      };
    case "station":
      return {
        icon: e.graha ? <GrahaGlyph id={e.graha} size={34} /> : null,
        title: `${g?.english} turns ${e.retro ? "retrograde" : "direct"}`,
        note: e.retro ? `${g?.name} appears to stop and drift backwards for a while.` : `${g?.name} stops and resumes its forward motion.`,
        tone: "violet",
        explain: "retrograde",
      };
  }
}

const cap = (s?: string) => (s ? s[0]?.toUpperCase() + s.slice(1) : "");

interface Props {
  nowMs: number;
  place: { lat: number; lon: number; name: string };
  zone: string;
  preset: EnginePreset;
  days?: number;
  limit?: number;
}

export function SkyEvents({ nowMs, place, zone, preset, days = 45, limit = 8 }: Props) {
  // Recompute at most hourly; the search is ~a second's worth of ephemeris on slow phones.
  const hourKey = Math.floor(nowMs / HOUR);
  const { lat, lon } = place;
  const events = useMemo(() => {
    try {
      return skyEvents(hourKey * HOUR, days, { lat, lon }, preset);
    } catch {
      return [];
    }
  }, [hourKey, days, lat, lon, preset]);
  const shown = events.filter((e) => e.ms >= nowMs).slice(0, limit);

  return (
    <section className="cosmic-card sky-events" aria-labelledby="sky-events-h">
      <header className="cosmic-card__head">
        <h2 id="sky-events-h">
          Coming up in the sky{" "}
          <span className="gloss">
            next {days} days at {place.name.split(",")[0]}
          </span>
        </h2>
        <Link to="/explore" className="linkish cosmic-card__more">
          Explore →
        </Link>
      </header>
      {shown.length === 0 ? (
        <p className="p p--muted">Nothing could be reckoned for this place.</p>
      ) : (
        <ol className="ev-list">
          {shown.map((e) => {
            const d = describe(e);
            const w = when(e.ms, zone, nowMs);
            return (
              <li key={`${e.kind}-${e.ms}-${e.graha ?? ""}`} className={`ev ev--${d.tone}`}>
                <span className="ev__icon" aria-hidden="true">
                  {d.icon}
                </span>
                <span className="ev__body">
                  <span className="ev__title">
                    {d.title} {d.explain ? <InfoDot id={d.explain} /> : null}
                  </span>
                  <span className="ev__note">{d.note}</span>
                </span>
                <span className="ev__when">
                  <span className="ev__day">{w.day}</span>
                  <span className="ev__time mono">{w.time}</span>
                  <span className="ev__rel">{w.rel}</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
