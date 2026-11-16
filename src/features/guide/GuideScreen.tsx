// The guide: what Vyomaphala is, how to use it, and every term in plain English, written for someone
// who has never met Indian astrology, or doesn't believe in it.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight, Page, Row, Section } from "../../components/ui/Page";
import { GLOSSARY, type GlossaryGroup, GROUP_TITLES } from "../../data/glossary";
import "./guide.css";

const GROUPS = Object.keys(GROUP_TITLES) as GlossaryGroup[];

const STEPS: Array<{ title: string; body: string; to: string; cta: string }> = [
  {
    title: "Save a person",
    body: 'Enter a name, the day, month and year of birth, the time on a 12-hour clock with am or pm, and the birth place picked from the list. Look at "Check before you save" (Moon sign, birth star, rising sign) before you save. If you don\'t know the time, switch on "I don\'t know the time". You\'ll still get most of it.',
    to: "/leaf/new",
    cta: "Add a person",
  },
  {
    title: "Read the birth chart",
    body: "See where the Sun, Moon and planets were at that moment, the life-chapter timeline (daśā), and classical patterns (yogas), each with a plain explanation.",
    to: "/circle",
    cta: "Choose a person",
  },
  {
    title: "See your forecast",
    body: "A plain-English outlook for the day, week, month, quarter and year. It shows which planets are working for you and which ask for patience, plus your life chapter (daśā).",
    to: "/forecast",
    cta: "Open the forecast",
  },
  {
    title: "Check today",
    body: "The Hindu almanac for any day and place: lunar day, Moon's star, sunrise, and the time slots tradition calls good or bad.",
    to: "/today",
    cta: "Open the almanac",
  },
  {
    title: "Explore the myths",
    body: "Every planet, sign and star has a story: the Moon's 27 wives, the demon behind eclipses, the boy who became the Pole Star. Explore them, or play the story of astrology from the beginning.",
    to: "/explore",
    cta: "Open Explore",
  },
  {
    title: "Partner match, or read a palm",
    body: "Partner match shows how two people fit: understanding, companionship, trust, closeness and family, with a score out of 100 from the traditional 36-point Guna Milan. The palm reader photographs your hand and describes its lines, on your device only.",
    to: "/milan",
    cta: "Open Partner match",
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
    <Page
      label="Guide: Vyomaphala in plain English"
      eyebrow="Guide"
      title="How Vyomaphala works"
      lede="It is an Indian astrology (Jyotiṣa) app. It works out exactly where the Sun, Moon and planets are (or were, when someone was born) and shows what the old tradition says about it. You don't need to know anything, or believe anything, to use it."
      back
      wide
      className="guide"
    >
      <Section title="How to use it" id="g-how" />
      <ol className="guide-steps" aria-labelledby="g-how">
        {STEPS.map((s, i) => (
          <li key={s.title} className="v-card">
            <span className="guide-steps__n" aria-hidden="true">
              {i + 1}
            </span>
            <h3 className="v-card__title">{s.title}</h3>
            <p className="v-card__sub">{s.body}</p>
            <Link to={s.to} className="v-link">
              {s.cta} <ChevronRight size={16} />
            </Link>
          </li>
        ))}
      </ol>
      <p className="v-note">
        <span>
          Tip: wherever you see <span className="guide-i">ⓘ</span> next to a word, tap it for a plain-English explanation.
        </span>
      </p>

      <Section title="What is real and what is tradition" id="g-real" />
      <div className="v-cols">
        <section className="v-card guide-real" aria-labelledby="g-real-a">
          <span className="v-chip v-chip--good">Real</span>
          <h3 id="g-real-a" className="v-card__title">
            Real, checkable astronomy
          </h3>
          <p>
            Planet positions, sunrise and sunset, Moon phases, eclipse points, the rising sign. These are calculated to professional
            accuracy (checked against Swiss Ephemeris and Drik Panchang) and you could verify them with a telescope.
          </p>
        </section>
        <section className="v-card guide-real" aria-labelledby="g-real-b">
          <span className="v-chip v-chip--gold">Tradition</span>
          <h3 id="g-real-b" className="v-card__title">
            Tradition, not science
          </h3>
          <p>
            What those positions are said to mean: personality, good and bad times, compatibility, palm lines. There's no scientific
            evidence for them. Vyomaphala shows them as a cultural reference and for reflection, never as advice or fate.
          </p>
        </section>
      </div>

      <Section title="More" />
      <ul className="v-list">
        <li>
          <Row to="/story" title="The story of the stars" sub="Gods, ṛṣis, Greeks and astronomers. Play the story" />
        </li>
        <li>
          <Row to="/about" title="How Vyomaphala was made" sub="Sources, methods and checks" />
        </li>
      </ul>
      <details className="v-fold">
        <summary>
          <span>
            What the name means
            <span className="v-fold__s">Vyomaphala, the fruit of the sky</span>
          </span>
        </summary>
        <div className="v-fold__body">
          <p>
            Vyomaphala (<span lang="hi">व्योमफल</span>) is Sanskrit for the fruit of the sky: vyoma, the heavens, and phala, what they yield,
            the same phala as in phalita jyotiṣa, the predictive side of Indian astrology.
          </p>
        </div>
      </details>
      <details className="v-fold">
        <summary>
          <span>
            Your privacy
            <span className="v-fold__s">Everything is calculated on this device</span>
          </span>
        </summary>
        <div className="v-fold__body">
          <p>
            Everything is calculated on this device. Birth details and palm photos are stored only here, never uploaded. Vyomaphala uses the
            internet for only two things: the optional place search (just the town name), and anonymous counts of which screens are opened
            and which buttons are tapped (no names, no birth details, no cookies, and you can turn it off). You can back up or delete
            everything from Settings.
          </p>
          <Link to="/drawer" className="v-link guide-link">
            Open Settings <ChevronRight size={16} />
          </Link>
        </div>
      </details>

      <Section title="Every word, explained" id="g-words" note="Open a group, or search" />
      <label className="v-field">
        <span className="vh">Search the glossary</span>
        <input
          className="v-input"
          type="search"
          placeholder="Search, e.g. tithi, rising sign, Saturn"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </label>
      {hits.length === 0 ? <p className="v-card v-muted">Nothing matches “{q}”.</p> : null}
      {GROUPS.map((grp) => {
        const items = hits.filter((g) => g.group === grp);
        if (items.length === 0) return null;
        return (
          <details key={`${grp}${query.length > 1 ? "-q" : ""}`} className="v-fold guide-group" open={query.length > 1}>
            <summary>
              <span>
                {GROUP_TITLES[grp]}
                <span className="v-fold__s">
                  {items.length} {items.length === 1 ? "word" : "words"}
                </span>
              </span>
            </summary>
            <div className="v-fold__body">
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
          </details>
        );
      })}

      <p className="v-foot">For reflection and cultural interest. Not medical, legal, financial or relationship advice.</p>
    </Page>
  );
}
