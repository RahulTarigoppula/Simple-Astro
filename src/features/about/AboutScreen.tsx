// About Vyom: how it was made. Every data source, what we did to it, every algorithm, and how it was
// checked. Facts here mirror src/data/attribution.json and docs/VERIFICATION-LOG.md.
import { Link } from "react-router";
import { Screen } from "../../components/ui/Screen";
import "./about.css";

const NUMBERS: Array<[string, string]> = [
  ["252", "hours of work and dedication"],
  ["18", "weeks, 7 days a week, 2 hours a day"],
  ["82,505", "places, offline"],
  ["9,096", "real stars"],
  ["50", "charts checked against Swiss Ephemeris"],
  ["710", "automated tests"],
  ["0", "bytes of your data uploaded"],
];

interface Source {
  name: string;
  by: string;
  licence: string;
  used: string;
  cleaned?: string;
}

const SOURCES: Source[] = [
  {
    name: "astronomy-engine",
    by: "Don Cross",
    licence: "MIT",
    used: "Where the Sun, Moon and planets are at any moment, sidereal time, rise and set times, and the search for new and full moons and eclipses. The whole sky in Vyom comes from here.",
  },
  {
    name: "GeoNames",
    by: "GeoNames.org",
    licence: "CC BY 4.0",
    used: "The offline birthplace search: towns and cities across India, Nepal, Sri Lanka, Pakistan and Bangladesh, with old names like Bombay and Madras.",
    cleaned:
      "Kept only populated places and administrative seats, ranked the rest by how many alternate names they have, rounded coordinates to 4 decimals (about 11 metres), kept at most three alternate names each, and packed it as compressed columns. 82,505 places in 1.8 MB, searched in under 10 ms.",
  },
  {
    name: "Yale Bright Star Catalogue (BSC5)",
    by: "NASA / HEASARC",
    licence: "Public domain",
    used: "The real stars in the birth sky and behind every sign and nakṣatra in Explore.",
    cleaned:
      "Reduced to position and brightness, sorted brightest first and packed into 45 KB. 9,096 stars, 5,080 of them visible to the eye.",
  },
  {
    name: "tz-lookup",
    by: "Matt McEachen, PhotoStructure",
    licence: "CC0",
    used: "Turns a birthplace into its time zone, so a 1950s birth in Madras uses Madras time, not today's.",
  },
  {
    name: "IANA time zone database",
    by: "via your browser",
    licence: "Public domain",
    used: "Historical clock offsets, including India's wartime time (1942 to 1945) and the old Bombay and Calcutta times.",
  },
  {
    name: "MediaPipe hand landmarker",
    by: "Google",
    licence: "Apache 2.0",
    used: "Finds 21 points on your hand in the palm photo. The model is stored with the app, so the photo never leaves your phone.",
  },
  {
    name: "OpenCV",
    by: "The OpenCV team",
    licence: "Apache 2.0",
    used: "Flattens the palm photo and traces the creases. It loads only on the palm screen.",
  },
  {
    name: "Classical texts",
    by: "Parāśara, Mantreśvara, Rāma Daivajña and others",
    licence: "Public domain",
    used: "The rules themselves: Bṛhat Parāśara Horā Śāstra (houses, yogas, daśā, aṣṭakavarga), Phaladīpikā ch. 26 (transits), Muhūrta Cintāmaṇi (Guna Milan, muhūrta). Every rule Vyom applies names its source on screen.",
  },
  {
    name: "Open-Meteo and OpenStreetMap",
    by: "Open-Meteo, OSM contributors",
    licence: "CC BY 4.0, ODbL",
    used: "Only if you search for a place that isn't in the offline list, and only after you agree. Just the place name is sent.",
  },
];

const ALGORITHMS: Array<[string, string]> = [
  [
    "Planet positions",
    "Apparent positions from astronomy-engine, then shifted to the sidereal (star-fixed) zodiac using the Lahiri ayanāṃśa. Three versions of Lahiri are offered because the major almanacs disagree by up to 41 arc-seconds.",
  ],
  [
    "Rising sign and houses",
    "The ascendant from local sidereal time and the obliquity of the ecliptic at your birth place. Houses are whole signs, the classical method.",
  ],
  ["Divisional charts", "Each sign split into parts (D9 into nine, D10 into ten, and so on) by the Parāśara rules."],
  ["Life chapters (daśā)", "Viṃśottarī: 120 years shared by nine planets, starting from the Moon's exact degree inside its nakṣatra."],
  [
    "Almanac end times",
    "Each tithi, nakṣatra, yoga and karaṇa ends at a precise moment. Vyom finds it by searching for when the Sun and Moon cross the boundary, to the second, for your place. Sunrise uses the upper edge of the Sun with refraction, as Drik Panchang does.",
  ],
  [
    "Forecasts",
    "Each planet's sign is counted as a house from your Moon sign and checked against the favourable houses in Phaladīpikā ch. 26. Days add the Moon's star (Tārā-bala). Strength comes from your own aṣṭakavarga.",
  ],
  ["Compatibility", "Aṣṭakūṭa, the eight factors and 36 points, in two published schools, plus the South Indian ten-point Porutham."],
  [
    "Sky events",
    "New and full moons, Ekādaśī, eclipses (and whether you can see them from your place), sign changes and retrograde turns, all solved from the ephemeris rather than looked up.",
  ],
  [
    "Palm lines",
    "21 hand points, then a flattened 512-pixel print, contrast evened out (CLAHE), creases lifted (black-hat), ridges found (Hessian) and thinned to lines (Zhang-Suen).",
  ],
  ["Chinese zodiac", "The year turns at the first new moon after 21 January in China Standard Time, found from the real Moon."],
  ["Numerology", "Root and destiny numbers from the birth date; name numbers by the Chaldean letter values."],
];

const CHECKS: string[] = [
  "50 birth charts compared with Swiss Ephemeris, the professional standard: within 20 arc-seconds (the Moon within 4, the rising sign within 0.3).",
  "Almanac names and end times compared with Drik Panchang for 6 days in 3 cities: names exact, times within 2 minutes.",
  "Guna Milan compared with PyJHora on all 11,664 possible pairings.",
  "Every published table checked by hand against the classical texts.",
  "710 automated tests and 22 browser tests run on every change, on a phone-sized and a desktop screen.",
  "A privacy test watches every network request in a full session and fails if any of your data leaves.",
];

export default function AboutScreen() {
  return (
    <Screen className="about-screen" label="About Vyom">
      <article className="about">
        <header className="about-hero">
          <p className="about-kicker">About Vyom 1.0 · व्योम</p>
          <h1>How Vyom was made</h1>
          <blockquote className="about-quote">
            <p>It took almost 18 weeks of extensive planning, development, data gathering and cleaning. This is the result: Vyom.</p>
            <footer>Rahul (RT), who made Vyom</footer>
          </blockquote>
          <p className="about-hours">
            <b>18 weeks × 7 days × 2 hours = 252 hours</b> of work and dedication.
          </p>
        </header>

        <ul className="about-numbers" aria-label="Vyom in numbers">
          {NUMBERS.map(([n, l]) => (
            <li key={l}>
              <span className="about-numbers__n">{n}</span>
              <span className="about-numbers__l">{l}</span>
            </li>
          ))}
        </ul>

        <section className="about-sec" aria-labelledby="ab-src">
          <h2 id="ab-src">Where the data comes from</h2>
          <p className="about-p">Every source below is open and credited, and the app works only from them.</p>
          <ul className="about-sources">
            {SOURCES.map((s) => (
              <li key={s.name}>
                <div className="about-sources__top">
                  <h3>{s.name}</h3>
                  <span className="about-lic">{s.licence}</span>
                </div>
                <p className="about-by">{s.by}</p>
                <p>{s.used}</p>
                {s.cleaned ? (
                  <p className="about-clean">
                    <strong>How we cleaned it: </strong>
                    {s.cleaned}
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section className="about-sec" aria-labelledby="ab-alg">
          <h2 id="ab-alg">How it works out the answers</h2>
          <dl className="about-alg">
            {ALGORITHMS.map(([k, v]) => (
              <div key={k}>
                <dt>{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="about-sec" aria-labelledby="ab-chk">
          <h2 id="ab-chk">How we checked it</h2>
          <ul className="about-checks">
            {CHECKS.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
        </section>

        <section className="about-sec about-private" aria-labelledby="ab-priv">
          <h2 id="ab-priv">Your privacy</h2>
          <p className="about-p">
            Everything is calculated on your device. Birth details and palm photos stay there. There are no accounts. The only thing Vyom
            counts is anonymous: which screens are opened and which buttons are tapped, through GoatCounter, with no cookies, no names, no
            birth details and no ids. You can switch even that off in Settings. Backups are encrypted with a passphrase only you know.
          </p>
        </section>

        <p className="about-foot">
          Questions about any of this? <Link to="/guide">Read the plain-English guide</Link>
        </p>
      </article>
    </Screen>
  );
}
