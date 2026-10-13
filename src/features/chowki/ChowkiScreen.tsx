// Home: the live sky wheel, today's pañcāṅga at a glance, the person's day, and the doors to
// every instrument — an astral dashboard rather than a desk.
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { InfoDot } from "../../components/ui/Explain";
import { Screen } from "../../components/ui/Screen";
import { NAKSHATRA_NAMES, SIGN_NAMES, TITHI_DEV, VARA_NAMES, YOGA_NAMES } from "../../data/tables/names";
import { computePanchang } from "../../engine/panchang";
import type { Panchang } from "../../engine/types";
import { play } from "../../platform/sound";
import { CosmicProfile } from "../cosmic/CosmicProfile";
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
  IconMoon,
  IconNumbers,
  IconPalm,
  IconPlus,
  IconSky,
  IconStory,
  IconToday,
} from "./icons";
import { ZodiacOrbit } from "./ZodiacOrbit";
import "../story/roots.css";
import "./chowki.css";

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
  const tithiNo = p ? (p.tithi.index - 1) % 15 : 0;
  const second = profiles?.find((x) => x.id !== active?.id);
  const strengthOk = active && activePatri && activePatri.profileId === active.id;

  return (
    <Screen className="chowki" label="Vyom — home">
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
              "Write your first leaf"
            ) : (
              <>
                <span lang="hi">नमस्ते</span>
                {active ? `, ${active.name}` : ""}
              </>
            )}
          </h1>
          {p ? (
            <ul className="home-angas" aria-label="Today's pañcāṅga — the Hindu almanac">
              <li>
                <span className="k">
                  Tithi <InfoDot id="tithi" />
                </span>
                <span className="g">lunar day</span>
                <span className="v">
                  {p.tithi.index === 30 ? "अमावस्या" : `${p.tithi.paksha === "shukla" ? "शुक्ल" : "कृष्ण"} ${TITHI_DEV[tithiNo] ?? ""}`}
                </span>
                <span className="s">{p.tithi.name}</span>
              </li>
              <li>
                <span className="k">
                  Nakṣatra <InfoDot id="nakshatra" />
                </span>
                <span className="g">Moon's star</span>
                <span className="v">{NAKSHATRA_NAMES[p.nakshatra.index]}</span>
                <span className="s">pada {p.nakshatra.pada}</span>
              </li>
              <li>
                <span className="k">
                  Yoga <InfoDot id="yoga-panchang" />
                </span>
                <span className="g">Sun + Moon</span>
                <span className="v">{YOGA_NAMES[p.yoga.index - 1] ?? p.yoga.name}</span>
                <span className="s">{VARA_NAMES[p.vara.index]}</span>
              </li>
              <li className="is-caution">
                <span className="k">
                  Rāhu Kāla <InfoDot id="rahu-kala" />
                </span>
                <span className="g">avoid new starts</span>
                <span className="v mono">
                  {hhmm(p.rahuKaal[0], zone)}–{hhmm(p.rahuKaal[1], zone)}
                </span>
                <span className="s">by tradition</span>
              </li>
            </ul>
          ) : (
            <p className="note-haldi">The sky could not be reckoned for this place — check the leaf's date.</p>
          )}
          {empty ? (
            <Link to="/leaf/new" className="stamp home-cta">
              <span>Cast a birth chart</span>
            </Link>
          ) : null}
        </div>
        <Link
          to={active ? `/patri/${active.id}/sky` : "/today"}
          className="home-orbit"
          aria-label="The sky right now — open the rooftop"
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
              <i className="lg lg--asc" /> rising sign here
            </span>
            {strengthOk ? (
              <span>
                <i className="lg lg--natal" /> your Moon sign
              </span>
            ) : null}
            <span>
              <i className="lg lg--planet" /> planet now
            </span>
          </span>
          <span className="home-orbit__cap">
            The sky right now · Moon in {p ? NAKSHATRA_NAMES[p.nakshatra.index] : "—"}
            {strengthOk ? ` · your Moon sign ${SIGN_NAMES[activePatri.grahas.MO.sign]}` : ""} · tap to explore
          </span>
        </Link>
      </section>

      {strengthOk && active ? (
        <div className="home-stack">
          <TodayForYou profile={active} patri={activePatri} nowMs={now} preset={settings.preset} />
          <CosmicProfile profile={active} patri={activePatri} compact />
        </div>
      ) : null}

      <div className="home-stack">
        <SkyEvents nowMs={now} place={{ lat, lon, name: placeName }} zone={zone} preset={settings.preset} days={40} limit={6} />
      </div>

      <h2 className="home-sec">Everything in Vyom</h2>
      <nav className="home-tiles" aria-label="Features">
        {active ? (
          <Tile
            to={`/patri/${active.id}`}
            title="Birth chart"
            dev="जन्म पत्री"
            sub={`${active.name}'s Janam Patri`}
            icon={<IconChart />}
            tone="violet"
          />
        ) : (
          <Tile to="/leaf/new" title="Add a person" dev="नया पत्ता" sub="Birth date, time and place" icon={<IconPlus />} tone="violet" />
        )}
        <Tile
          to={active ? `/forecast/${active.id}` : "/forecast"}
          title="Forecast"
          dev="भविष्य"
          sub="Day, week, month, year"
          icon={<IconForecast />}
          tone="gold"
        />
        <Tile to="/today" title="Today's almanac" dev="पंचांग" sub="Good and bad times" icon={<IconToday />} tone="gold" />
        <Tile to="/explore" title="Explore" dev="अन्वेषण" sub="Gods, signs and stars" icon={<IconSky />} tone="cyan" />
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
        <Tile to="/story" title="The story" dev="कथा" sub="Where it all began" icon={<IconStory />} tone="gold" />
        <Tile to="/explore/numbers" title="Numerology" dev="अंक" sub="Your numbers" icon={<IconNumbers />} tone="violet" />
        <Tile
          to={active ? `/patri/${active.id}/sky` : "/leaf/new"}
          title="Birth sky"
          dev="आकाश"
          sub="Planetarium view"
          icon={<IconMoon />}
          tone="cyan"
        />
        <Tile to="/circle" title="Your people" dev="पत्ते" sub={`${profiles?.length ?? 0} saved`} icon={<IconCircle />} tone="cyan" />
        <Tile to="/guide" title="Guide" dev="मार्गदर्शिका" sub="Every word explained" icon={<IconGuide />} tone="violet" />
        <Tile to="/drawer" title="Settings" dev="दराज़" sub="Accuracy, backup" icon={<IconDrawer />} tone="violet" />
      </nav>
      <Link to="/story" className="maker maker--link home-maker">
        <span className="maker__av" aria-hidden="true">
          R
        </span>
        <span className="maker__text">
          <span className="maker__k">Why Vyom exists</span>
          <span className="maker__t">"I believed God exists — that was the extent of it. Then I started reading…"</span>
          <span className="maker__s">A note from the maker · play the story →</span>
        </span>
      </Link>

      <p className="home-foot">
        New to all this?{" "}
        <Link to="/guide" className="linkish">
          Read the 2-minute guide
        </Link>
        .
      </p>
      <p className="home-foot">Computed on this device · nothing leaves it · for reflection, not advice</p>
    </Screen>
  );
}
