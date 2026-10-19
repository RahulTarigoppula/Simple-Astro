// Home: the live sky wheel, today's pañcāṅga at a glance, the person's day, and the doors to
// every instrument, an astral dashboard rather than a desk.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { Screen } from "../../components/ui/Screen";
import { play } from "../../platform/sound";
import {
  IconArrow,
  IconChart,
  IconCircle,
  IconDrawer,
  IconForecast,
  IconMilan,
  IconNumbers,
  IconPalm,
  IconSky,
  IconStory,
  IconToday,
} from "./icons";
import { ZodiacOrbit } from "./ZodiacOrbit";
import "./chowki.css";
import "./home.css";
import { safeZone } from "../../engine/time";

const BENGALURU = { lat: 12.9716, lon: 77.5946, zone: "Asia/Kolkata" };

function hhmm(ms: number, zone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "numeric", minute: "2-digit", hour12: true, timeZone: safeZone(zone) }).format(ms);
}
function hourIn(ms: number, zone: string): number {
  return Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: safeZone(zone) }).format(ms)) % 24;
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

  const empty = profiles !== undefined && profiles.length === 0;
  const h = hourIn(now, zone);
  const salutation = h < 5 ? "A quiet night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const second = profiles?.find((x) => x.id !== active?.id);
  const strengthOk = active && activePatri && activePatri.profileId === active.id;
  const matchTo = active && second ? `/milan/${active.id}/${second.id}` : "/milan";

  return (
    <Screen className="chowki" label="Vyomaphala home">
      <header className="home-head">
        <div className="home-brand">
          <span className="home-mark" aria-hidden="true" />
          <span className="home-name">Vyomaphala</span>
          <span lang="hi" className="home-name-dev">
            व्योमफल
          </span>
        </div>
        <div className="home-tools">
          <span className="home-clock mono">
            <span className="vh">Local time at {placeName}: </span>
            {hhmm(now, zone)} · {active ? placeName : `${placeName} (until you add a person)`}
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
          <p className="home-line">
            {empty
              ? "Start with your name, birth date, time and place of birth. It takes about a minute."
              : "Here is everything Vyomaphala can do. Tap any card to start."}
          </p>
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
        </Link>
      </section>

      <h2 className="home-sec">What you can do</h2>
      <nav className="home-primary" aria-label="Main features">
        <Link to={active ? `/patri/${active.id}` : "/leaf/new"} className="home-big home-big--violet">
          <IconChart size={26} />
          <span className="home-big__t">Your life, in simple words</span>
          <span className="home-big__s">Who you are, your plus and minus points, and what is ahead</span>
        </Link>
        <Link to={matchTo} className="home-big home-big--rose">
          <IconMilan size={26} />
          <span className="home-big__t">Partner Compatibility</span>
          <span className="home-big__s">Signs of marriage: trust, companionship and a score for two people</span>
        </Link>
        <Link to={active ? `/forecast/${active.id}` : "/forecast"} className="home-big home-big--gold">
          <IconForecast size={26} />
          <span className="home-big__t">Your forecast</span>
          <span className="home-big__s">Your day, week, month and year</span>
        </Link>
      </nav>
      <nav className="home-tiles" aria-label="More">
        <Tile to="/today" title="Today" dev="पंचांग" sub="Good and bad times today" icon={<IconToday />} tone="gold" />
        <Tile
          to={active ? `/hast/${active.id}` : "/leaf/new"}
          title="Palm reading"
          dev="हस्त रेखा"
          sub="A photo of your hand, read on this phone"
          icon={<IconPalm />}
          tone="rose"
        />
        <Tile to="/explore/numbers" title="Numbers" dev="अंक" sub="What your birth date says" icon={<IconNumbers />} tone="violet" />
        <Tile to="/explore" title="Explore the sky" dev="आकाश" sub="Planets, signs, stars and stories" icon={<IconSky />} tone="cyan" />
        <Tile to="/story" title="Roots" dev="कथा" sub="How Indian astrology began" icon={<IconStory />} tone="gold" />
        <Tile
          to="/circle"
          title="People"
          dev="लोग"
          sub={profiles?.length ? `${profiles.length} saved` : "Everyone you add"}
          icon={<IconCircle />}
          tone="cyan"
        />
      </nav>

      <section className="home-how" aria-labelledby="home-how-h">
        <h2 id="home-how-h" className="home-sec">
          How to use
        </h2>
        <ol>
          <li>
            <b>Add a person.</b> Name, birth date, time and place of birth.
          </li>
          <li>
            <b>Tap a card above.</b> Everything starts in simple words. “Full detail” shows the astrology behind it.
          </li>
          <li>
            <b>Tap ⓘ</b> on any word you don't know. <Link to="/guide">Read the guide</Link>
          </li>
        </ol>
      </section>

      <section className="home-trust" aria-label="How Vyomaphala was made and your privacy">
        <div className="home-card home-card--made">
          <h2 className="home-card__h">How Vyomaphala was made</h2>
          <p>
            <b>252 hours</b> of work and dedication by Rahul (RT): 18 weeks, 7 days a week, 2 hours a day. Planning, building, gathering and
            cleaning the data. Every chart is worked out from real astronomy and checked against the professional standard.
          </p>
          <ul className="home-card__n">
            <li>
              <b>82,505</b> places
            </li>
            <li>
              <b>9,096</b> real stars
            </li>
            <li>
              <b>50</b> charts checked
            </li>
            <li>
              <b>717</b> tests
            </li>
          </ul>
          <Link to="/about">Sources, methods and checks</Link>
        </div>
        <div className="home-card home-card--private">
          <h2 className="home-card__h">Your data stays yours</h2>
          <ul className="home-card__list">
            <li>No sign up and no login.</li>
            <li>Everything is worked out on this device. Birth details and palm photos never leave it.</li>
            <li>Nobody else can see your people, and you can't see anyone else's. No server holds them.</li>
            <li>The only thing ever sent is an anonymous count of which screens are opened, and you can switch that off in Settings.</li>
            <li>Delete everything any time in Settings.</li>
          </ul>
        </div>
      </section>

      <p className="home-foot">
        Vyomaphala · Made by Rahul (RT) · <Link to="/about">How Vyomaphala was made</Link>
      </p>
    </Screen>
  );
}
