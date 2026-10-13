// Home: the live sky wheel, today's pañcāṅga at a glance, the person's day, and the doors to
// every instrument — an astral dashboard rather than a desk.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { InfoDot } from "../../components/ui/Explain";
import { Screen } from "../../components/ui/Screen";
import { NAKSHATRA_LORE } from "../../data/lore";
import { NAKSHATRA_NAMES } from "../../data/tables/names";
import { computePanchang } from "../../engine/panchang";
import type { Panchang } from "../../engine/types";
import { play } from "../../platform/sound";
import { SkyEvents } from "../cosmic/SkyEvents";
import { TodayForYou } from "../cosmic/TodayForYou";
import {
  IconArrow,
  IconChart,
  IconCircle,
  IconDrawer,
  IconForecast,
  IconGuide,
  IconMilan,
  IconNumbers,
  IconPalm,
  IconPlus,
  IconSky,
  IconStory,
  IconToday,
} from "./icons";
import { ZodiacOrbit } from "./ZodiacOrbit";
import "./chowki.css";
import "./home.css";

const ORD = [
  "",
  "first",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "eighth",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "fifteenth",
];

const BENGALURU = { lat: 12.9716, lon: 77.5946, zone: "Asia/Kolkata" };

function hhmm(ms: number, zone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }).format(ms);
}
function hourIn(ms: number, zone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: zone }).format(ms)) % 24;
}

function useNow(stepMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}

interface TileProps {
  to: string;
  title: string;
  dev: string;
  sub: string;
  icon: React.ReactNode;
  tone?: "violet" | "cyan" | "gold" | "rose";
}

function Tile({ to, title, dev, sub, icon, tone = "violet" }: TileProps) {
  return (
    <Link
      to={to}
      className={`tile tile--${tone}`}
      onClick={(e) => {
        rememberOrigin(e.currentTarget);
        play("tick", 0.5);
      }}
    >
      <span className="tile__icon">{icon}</span>
      <span className="tile__text">
        <span className="tile__title">
          {title}{" "}
          <span lang="hi" className="tile__dev">
            {dev}
          </span>
        </span>
        <span className="tile__sub">{sub}</span>
      </span>
      <span className="tile__go" aria-hidden="true">
        <IconArrow size={16} />
      </span>
    </Link>
  );
}

export default function ChowkiScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const now = useNow();
  const { patri: activePatri } = usePatri(active, settings.preset);
  const lat = active?.birth.place.lat ?? BENGALURU.lat;
  const lon = active?.birth.place.lon ?? BENGALURU.lon;
  const zone = active?.birth.zone ?? BENGALURU.zone;
  const placeName = active?.birth.place.name ?? "Bengaluru";

  const p = useMemo<Panchang | null>(() => {
    try {
      return computePanchang(now, { lat, lon }, settings.preset);
    } catch {
      return null;
    }
  }, [now, lat, lon, settings.preset]);

  const empty = profiles !== undefined && profiles.length === 0;
  const h = hourIn(now, zone);
  const salutation = h < 5 ? "A quiet night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const second = profiles?.find((x) => x.id !== active?.id);
  const strengthOk = active && activePatri && activePatri.profileId === active.id;

  const waxing = p ? p.tithi.paksha === "shukla" : true;
  const dayOf = p ? ((p.tithi.index - 1) % 15) + 1 : 1;
  const nakLore = p ? NAKSHATRA_LORE[p.nakshatra.index] : undefined;
  const skyLine = p
    ? p.tithi.index === 15
      ? `Full Moon tonight, in ${NAKSHATRA_NAMES[p.nakshatra.index]}, “${nakLore?.meaning}”.`
      : p.tithi.index === 30
        ? `New Moon. The sky is dark, and the Moon rests beside the Sun.`
        : `The Moon walks through ${NAKSHATRA_NAMES[p.nakshatra.index]} (“${nakLore?.meaning}”) on the ${ORD[dayOf] ?? dayOf} day of the ${waxing ? "waxing" : "waning"} Moon.`
    : "";

  return (
    <Screen className="chowki" label="Vyom home">
      <header className="home-head">
        <div className="home-brand">
          <span className="home-mark" aria-hidden="true" />
          <span className="home-name">Vyom</span>
          <span lang="hi" className="home-name-dev">
            व्योम
          </span>
        </div>
        <div className="home-tools">
          <span className="home-clock mono">
            <span className="vh">Local time at {placeName}: </span>
            {hhmm(now, zone)} · {placeName}
          </span>
          <Link to="/drawer" className="home-gear" aria-label="Settings">
            <IconDrawer size={18} />
          </Link>
        </div>
      </header>

      <section className="home-hero" aria-labelledby="home-greet">
        <div className="home-hero__text">
          <p className="home-kicker">{salutation}</p>
          <h1 id="home-greet" className="home-title">
            {empty ? (
              "Add your first person"
            ) : (
              <>
                <span lang="hi">नमस्ते</span>
                {active ? `, ${active.name}` : ""}
              </>
            )}
          </h1>
          {skyLine ? <p className="home-line">{skyLine}</p> : null}
          {p ? (
            <ul className="home-chips" aria-label="Today's almanac">
              <li>
                <span className="k">Lunar day</span>
                <span className="v">{p.tithi.name}</span>
                <InfoDot id="tithi" />
              </li>
              <li>
                <span className="k">Moon's star</span>
                <span className="v">{NAKSHATRA_NAMES[p.nakshatra.index]}</span>
                <InfoDot id="nakshatra" />
              </li>
              <li className="is-caution">
                <span className="k">Rāhu Kāla</span>
                <span className="v mono">
                  {hhmm(p.rahuKaal[0], zone)}–{hhmm(p.rahuKaal[1], zone)}
                </span>
                <InfoDot id="rahu-kala" />
              </li>
            </ul>
          ) : null}
          {empty ? (
            <div className="home-cta-row">
              <Link to="/leaf/new" className="stamp home-cta">
                <span>Add a person</span>
              </Link>
            </div>
          ) : null}
        </div>
        <Link
          to={active ? `/patri/${active.id}/sky` : "/explore"}
          className="home-orbit"
          aria-label="Open the sky right now"
          onClick={(e) => rememberOrigin(e.currentTarget)}
        >
          <ZodiacOrbit
            nowMs={now}
            preset={settings.preset}
            lat={lat}
            lon={lon}
            natalMoonSign={strengthOk ? activePatri.grahas.MO.sign : undefined}
          />
          <span className="home-legend" aria-hidden="true">
            <span>
              <i className="lg lg--asc" /> rising here
            </span>
            {strengthOk ? (
              <span>
                <i className="lg lg--natal" /> your Moon sign
              </span>
            ) : null}
            <span>
              <i className="lg lg--planet" /> planets now
            </span>
          </span>
        </Link>
      </section>

      {strengthOk && active ? (
        <div className="home-stack">
          <TodayForYou profile={active} patri={activePatri} nowMs={now} preset={settings.preset} />
        </div>
      ) : null}

      <nav className="home-primary" aria-label="Start here">
        {strengthOk ? (
          <Link to="/story" className="home-big home-big--gold">
            <IconStory size={26} />
            <span className="home-big__t">Roots</span>
            <span className="home-big__s">Gods, sages and stars: the story</span>
          </Link>
        ) : (
          <Link to="/forecast" className="home-big home-big--gold">
            <IconForecast size={26} />
            <span className="home-big__t">Your forecast</span>
            <span className="home-big__s">Day to year, read from the sky</span>
          </Link>
        )}
        {active ? (
          <Link to={`/patri/${active.id}`} className="home-big home-big--violet">
            <IconChart size={26} />
            <span className="home-big__t">Birth chart</span>
            <span className="home-big__s">{active.name}'s sky at birth</span>
          </Link>
        ) : (
          <Link to="/leaf/new" className="home-big home-big--violet">
            <IconPlus size={26} />
            <span className="home-big__t">Add a person</span>
            <span className="home-big__s">Birth date, time and place</span>
          </Link>
        )}
        <Link to="/explore" className="home-big home-big--cyan">
          <IconSky size={26} />
          <span className="home-big__t">Explore the sky</span>
          <span className="home-big__s">Planets, signs, stars and their myths</span>
        </Link>
      </nav>

      <div className="home-stack">
        <SkyEvents nowMs={now} place={{ lat, lon, name: placeName }} zone={zone} preset={settings.preset} days={40} limit={4} />
      </div>

      <h2 className="home-sec">More in Vyom</h2>
      <nav className="home-tiles" aria-label="More">
        <Tile to="/today" title="Today's almanac" dev="पंचांग" sub="Good and bad times" icon={<IconToday />} tone="gold" />
        <Tile
          to={active && second ? `/milan/${active.id}/${second.id}` : "/milan"}
          title="Compatibility"
          dev="गुण मिलान"
          sub="Guna Milan out of 36"
          icon={<IconMilan />}
          tone="rose"
        />
        <Tile
          to={active ? `/hast/${active.id}` : "/leaf/new"}
          title="Palm reading"
          dev="हस्त रेखा"
          sub="Read on this device"
          icon={<IconPalm />}
          tone="rose"
        />
        <Tile to="/explore/numbers" title="Numerology" dev="अंक" sub="Your numbers" icon={<IconNumbers />} tone="violet" />
        <Tile to="/circle" title="People" dev="लोग" sub={`${profiles?.length ?? 0} saved`} icon={<IconCircle />} tone="cyan" />
        <Tile to="/guide" title="Guide" dev="मार्गदर्शिका" sub="Every word explained" icon={<IconGuide />} tone="violet" />
      </nav>

      <p className="home-foot">
        Computed on this device · nothing leaves it · karma, not fate · <Link to="/about">How Vyom was made</Link>
      </p>
    </Screen>
  );
}
