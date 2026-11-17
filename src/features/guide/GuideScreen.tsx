// The guide: what Vyomaphala is, how to use it, and every term in plain English, written for someone
// who has never met Indian astrology, or doesn't believe in it. Short on the page; the detail is folded.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { Reveal } from "../../components/ui/Motion";
import { ChevronRight, Page, Row, Section } from "../../components/ui/Page";
import { GLOSSARY, type GlossaryGroup, GROUP_TITLES } from "../../data/glossary";
import "./guide.css";

const GROUPS = Object.keys(GROUP_TITLES) as GlossaryGroup[];

const STEPS: Array<{ title: string; body: string; to: string }> = [
  { title: "Add a person", body: "A name, the birth date and time, and the birth place.", to: "/leaf/new" },
  { title: "Read the birth chart", body: "Where the Sun, Moon and planets were, each with a plain explanation.", to: "/circle" },
  { title: "See your forecast", body: "The day, week, month, quarter and year in plain English.", to: "/forecast" },
  { title: "Check today", body: "The Hindu almanac for any day and place.", to: "/today" },
  { title: "Explore the myths", body: "Every planet, sign and star has a story.", to: "/explore" },
  { title: "Match a partner", body: "How two people fit, scored out of 100 from the 36-point Guna Milan.", to: "/milan" },
  { title: "Ask about today", body: "On Today, tap what you have in mind (travel, a talk, a new start) for a plain answer.", to: "/" },
  { title: "Pick a good day", body: "The best days ahead for what you want to do, with the reasons.", to: "/pick" },
  { title: "Follow the festivals", body: "The Hindu calendar for the year ahead, worked out for your place.", to: "/festivals" },
  { title: "See the whole family", body: "Everyone saved on this device on one screen, with coming birthdays.", to: "/family" },
  { title: "Note how days went", body: "One tap a day, kept beside what the sky had said.", to: "/journal" },
];

function Fold({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="v-fold">
      <summary>{title}</summary>
      <div className="v-fold__body">{children}</div>
    </details>
  );
}

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
      title="How Vyomaphala works"
      lede="It works out exactly where the Sun, Moon and planets are, or were when someone was born, and shows what the old Indian tradition (Jyotiṣa) says about it. You don't need to know anything, or believe anything, to use it."
      back
      className="guide"
    >
      <Reveal i={0} className="v-stack guide-block">
        <Section title="What you can do" id="g-how" />
        <ol className="v-list guide-steps" aria-labelledby="g-how">
          {STEPS.map((s, i) => (
            <li key={s.title}>
              <Link to={s.to} className="v-row">
                <span className="v-row__icon guide-steps__n" aria-hidden="true">
                  {i + 1}
                </span>
                <span className="v-row__body">
                  <span className="v-row__t">{s.title}</span>
                  <span className="v-row__s">{s.body}</span>
                </span>
                <ChevronRight />
              </Link>
            </li>
          ))}
        </ol>
        <p className="guide-tip">
          Wherever you see <span className="guide-i">ⓘ</span> next to a word, tap it for a plain-English explanation. The magnifier at the
          top of every screen finds any screen, person, planet, festival or word.
        </p>
      </Reveal>

      <Reveal i={1} className="v-stack guide-block">
        <Section title="What is real, what is tradition" id="g-real" />
        <div className="v-card guide-real">
          <section aria-labelledby="g-real-a">
            <h3 id="g-real-a">
              <span className="v-chip v-chip--good">Real</span> Checkable astronomy
            </h3>
            <p>
              Planet positions, sunrise and sunset, Moon phases, eclipse points, the rising sign. These are calculated to professional
              accuracy (checked against Swiss Ephemeris and Drik Panchang) and you could verify them with a telescope.
            </p>
          </section>
          <section aria-labelledby="g-real-b">
            <h3 id="g-real-b">
              <span className="v-chip v-chip--gold">Tradition</span> Not science
            </h3>
            <p>
              What those positions are said to mean: personality, good and bad times, compatibility, palm lines. There's no scientific
              evidence for them. Vyomaphala shows them as a cultural reference and for reflection, never as advice or fate.
            </p>
          </section>
        </div>
      </Reveal>

      <Section title="Every word, explained" id="g-words" />
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

      <Section title="More" />
      <Fold title="How to add a person well">
        <p>
          Enter a name, the day, month and year of birth, the time on a 12-hour clock with am or pm, and the birth place picked from the
          list. Look at "Check before you save" (Moon sign, birth star, rising sign) before you save. If you don't know the time, switch on
          "I don't know the time". You'll still get most of it.
        </p>
      </Fold>
      <Fold title="Reading a palm">
        <p>
          The palm reader photographs your hand and describes its lines, on your device only. Open it from Home or from a person's chart.
        </p>
      </Fold>
      <Fold title="What the name means">
        <p>
          Vyomaphala (<span lang="hi">व्योमफल</span>) is Sanskrit for the fruit of the sky: vyoma, the heavens, and phala, what they yield,
          the same phala as in phalita jyotiṣa, the predictive side of Indian astrology.
        </p>
      </Fold>
      <Fold title="Your privacy">
        <p>
          Everything is calculated on this device. Birth details and palm photos are stored only here, never uploaded. Vyomaphala uses the
          internet for only two things: the optional place search (just the town name), and anonymous counts of which screens are opened and
          which buttons are tapped (no names, no birth details, no cookies, and you can turn it off). You can back up or delete everything
          from Settings.
        </p>
        <Link to="/drawer" className="v-link guide-link">
          Open Settings <ChevronRight size={16} />
        </Link>
      </Fold>
      <ul className="v-list">
        <li>
          <Row to="/story" title="The story of the stars" sub="Gods, ṛṣis, Greeks and astronomers" />
        </li>
        <li>
          <Row to="/about" title="How Vyomaphala was made" sub="Sources, methods and checks" />
        </li>
      </ul>

      <p className="v-foot">For reflection and cultural interest. Not medical, legal, financial or relationship advice.</p>
    </Page>
  );
}
