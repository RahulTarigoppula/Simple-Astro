// The guide: what Vyomaphala is, how to use it, and every term in plain English, written for someone
// who has never met Indian astrology, or doesn't believe in it.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Screen } from "../../components/ui/Screen";
import { GLOSSARY, type GlossaryGroup, GROUP_TITLES } from "../../data/glossary";
import "../story/roots.css";
import "./guide.css";

const GROUPS = Object.keys(GROUP_TITLES) as GlossaryGroup[];

const STEPS: Array<{ title: string; body: string; to: string; cta: string }> = [
  {
    title: "Save a person",
    body: "Enter a name, birth date, birth time and birth place. If you don't know the time, switch on \"Birth time unknown\". You'll still get most of it.",
    to: "/leaf/new",
    cta: "Add a person",
  },
  {
    title: "Read the birth chart",
    body: "See where the Sun, Moon and planets were at that moment, the life-chapter timeline (daśā), and classical patterns (yogas), each with a plain explanation.",
    to: "/circle",
    cta: "Your circle",
  },
  {
    title: "See your forecast",
    body: "A plain-English outlook for the day, week, month, quarter and year. It shows which planets are working for you and which ask for patience, plus your life chapter (daśā).",
    to: "/forecast",
    cta: "Forecast",
  },
  {
    title: "Check today",
    body: "The Hindu almanac for any day and place: lunar day, Moon's star, sunrise, and the time slots tradition calls good or bad.",
    to: "/today",
    cta: "Today",
  },
  {
    title: "Explore the myths",
    body: "Every planet, sign and star has a story: the Moon's 27 wives, the demon behind eclipses, the boy who became the Pole Star. Explore them, or play the story of astrology from the beginning.",
    to: "/explore",
    cta: "Explore",
  },
  {
    title: "Partner Compatibility, or read a palm",
    body: "Partner Compatibility shows how two people fit: understanding, companionship, trust, closeness and family, with a score out of 100 from the traditional 36-point Guna Milan. The palm reader photographs your hand and describes its lines, on your device only.",
    to: "/milan",
    cta: "Partner Compatibility",
  },
];

export default function GuideScreen() {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();
  const hits = useMemo(
    () =>
      GLOSSARY.filter((g) =>
        query
          ? `${g.term} ${g.dev ?? ""} ${g.plain} ${g.short} ${g.long}`
              .toLowerCase()
              .normalize("NFD")
              .replace(/\p{M}/gu, "")
              .includes(query.normalize("NFD").replace(/\p{M}/gu, ""))
          : true,
      ),
    [query],
  );

  return (
    <Screen className="guide" scroll label="Guide: Vyomaphala in plain English">
      <header className="guide-hero">
        <p className="guide-kicker">Guide</p>
        <h1>How Vyomaphala works</h1>
        <p className="guide-lede">
          Vyomaphala (व्योमफल) is Sanskrit for the fruit of the sky: vyoma, the heavens, and phala, what they yield, the same phala as in
          phalita jyotiṣa, the predictive side of Indian astrology. It is an Indian astrology (Jyotiṣa) app. It works out exactly where the
          Sun, Moon and planets are (or were, when someone was born) and shows what the old tradition says about it. You don't need to know
          anything, or believe anything, to use it.
        </p>
      </header>

      <Link to="/story" className="guide-story">
        <span className="guide-story__k">Roots</span>
        <span className="guide-story__t">The story of the stars</span>
        <span className="guide-story__s">Gods, ṛṣis, Greeks and astronomers. Play the story →</span>
      </Link>

      <section className="guide-card guide-honest" aria-labelledby="g-real">
        <h2 id="g-real">What's real and what's tradition?</h2>
        <div className="guide-two">
          <div>
            <h3>Real, checkable astronomy</h3>
            <p>
              Planet positions, sunrise and sunset, Moon phases, eclipse points, the rising sign. These are calculated to professional
              accuracy (checked against Swiss Ephemeris and Drik Panchang) and you could verify them with a telescope.
            </p>
          </div>
          <div>
            <h3>Tradition, not science</h3>
            <p>
              What those positions are said to mean: personality, good and bad times, compatibility, palm lines. There's no scientific
              evidence for them. Vyomaphala shows them as a cultural reference and for reflection, never as advice or fate.
            </p>
          </div>
        </div>
      </section>

      <section className="guide-card" aria-labelledby="g-how">
        <h2 id="g-how">How to use it</h2>
        <ol className="guide-steps">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <span className="guide-steps__n" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <h3>{s.title}</h3>
                <p>{s.body}</p>
                <Link to={s.to} className="linkish">
                  {s.cta} →
                </Link>
              </div>
            </li>
          ))}
        </ol>
        <p className="guide-tip">
          Tip: wherever you see <span className="guide-i">ⓘ</span> next to a word, tap it for a plain-English explanation.
        </p>
      </section>

      <section className="guide-card" aria-labelledby="g-private">
        <h2 id="g-private">Your privacy</h2>
        <p>
          Everything is calculated on this device. Birth details and palm photos are stored only here, never uploaded. Vyomaphala uses the
          internet for only two things: the optional place search (just the town name), and anonymous counts of which screens are opened (no
          names, no birth details, no cookies, and you can turn it off). You can back up or delete everything from Settings.
        </p>
      </section>

      <section className="guide-gloss" aria-labelledby="g-words">
        <div className="guide-gloss__head">
          <h2 id="g-words">Every word, explained</h2>
          <label className="guide-search">
            <span className="vh">Search the glossary</span>
            <input type="search" placeholder="Search, e.g. tithi, rising sign, Saturn" value={q} onChange={(e) => setQ(e.target.value)} />
          </label>
        </div>
        {hits.length === 0 ? <p className="guide-none">Nothing matches “{q}”.</p> : null}
        {GROUPS.map((grp) => {
          const items = hits.filter((g) => g.group === grp);
          if (items.length === 0) return null;
          return (
            <div key={grp} className="guide-group">
              <h3 className="guide-group__title">{GROUP_TITLES[grp]}</h3>
              {items.map((g) => (
                <details key={g.id} id={`g-${g.id}`} className="guide-item" open={query.length > 1}>
                  <summary>
                    <span className="guide-item__term">
                      {g.term}
                      {g.dev ? (
                        <span lang="hi" className="guide-item__dev">
                          {" "}
                          {g.dev}
                        </span>
                      ) : null}
                    </span>
                    <span className="guide-item__plain">{g.plain}</span>
                  </summary>
                  <div className="guide-item__body">
                    <p className="guide-item__short">{g.short}</p>
                    <p>{g.long}</p>
                    {g.how ? (
                      <p className="guide-item__how">
                        <strong>How Vyomaphala works it out: </strong>
                        {g.how}
                      </p>
                    ) : null}
                  </div>
                </details>
              ))}
            </div>
          );
        })}
      </section>

      <p className="guide-foot">For reflection and cultural interest. Not medical, legal, financial or relationship advice.</p>
    </Screen>
  );
}
