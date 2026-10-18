// Plain-English help: an ⓘ beside any traditional term opens one shared sheet that explains it
// simply, then in depth, then how Vyomaphala calculates it.
import { Link } from "react-router";
import { GROUP_TITLES, glossary } from "../../data/glossary";
import { useUi } from "../../state/ui";
import { Sheet } from "./Sheet";

/** The ⓘ button. */
export function InfoDot({ id, label }: { id: string; label?: string }) {
  const setExplain = useUi((s) => s.setExplain);
  const g = glossary(id);
  if (!g) return null;
  return (
    <button
      type="button"
      className="info-dot"
      aria-label={`What is ${label ?? g.term}? Explain in plain English`}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setExplain(id);
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M8 7v4.2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="8" cy="4.6" r="0.95" fill="currentColor" />
      </svg>
    </button>
  );
}

/** The plain-English gloss for a term, e.g. "lunar day". */
export function Gloss({ id, className }: { id: string; className?: string }) {
  const g = glossary(id);
  return g ? <span className={`gloss${className ? ` ${className}` : ""}`}>{g.plain}</span> : null;
}

/** A term with its plain gloss and an ⓘ: "Tithi · lunar day ⓘ". */
export function Term({ id, children, gloss = true }: { id: string; children?: React.ReactNode; gloss?: boolean }) {
  const g = glossary(id);
  return (
    <span className="term">
      <span className="term__name">{children ?? g?.term ?? id}</span>
      {gloss && g ? <span className="gloss">{g.plain}</span> : null}
      <InfoDot id={id} />
    </span>
  );
}

/** Where each term's myth or deeper story lives. */
const STORY_LINK: Record<string, [string, string]> = {
  jyotisha: ["/story", "Read the story of the stars"],
  graha: ["/explore", "Meet the nine grahas"],
  "rahu-ketu": ["/explore/graha/RA", "The demon who swallowed the Sun"],
  rashi: ["/explore", "Explore the twelve signs"],
  nakshatra: ["/explore", "The 27 star-maidens"],
  tithi: ["/story", "Why the Moon waxes and wanes"],
  sidereal: ["/story", "How India met the Greeks"],
  dasha: ["/explore/graha/KE", "The nine rulers of the life chapters"],
  "sade-sati": ["/explore/graha/SA", "Śani, the slow judge"],
  "hast-rekha": ["/story", "Sāmudrika Śāstra: the body as a map"],
  "guna-milan": ["/explore/nakshatra/0", "The stars behind the score"],
  panchang: ["/story", "The first clock was the sky"],
  gochar: ["/forecast", "See your forecast"],
};

/** The one sheet, mounted by the Shell. */
export function ExplainSheet() {
  const id = useUi((s) => s.explain);
  const setExplain = useUi((s) => s.setExplain);
  const g = id ? glossary(id) : undefined;
  return (
    <Sheet open={!!g} onClose={() => setExplain(null)} label={g ? `${g.term} explained` : "Explanation"}>
      {g ? (
        <article className="explain">
          <p className="explain__kicker">{GROUP_TITLES[g.group]}</p>
          <h2 className="explain__title">
            {g.term}
            {g.dev ? (
              <span lang="hi" className="explain__dev">
                {" "}
                {g.dev}
              </span>
            ) : null}
          </h2>
          <p className="explain__plain">{g.plain}</p>
          <p className="explain__short">{g.short}</p>
          <h3>In depth</h3>
          <p>{g.long}</p>
          {g.how ? (
            <>
              <h3>How Vyomaphala works it out</h3>
              <p>{g.how}</p>
            </>
          ) : null}
          {g && STORY_LINK[g.id] ? (
            <Link to={STORY_LINK[g.id]?.[0] ?? "/story"} className="explain__story" onClick={() => setExplain(null)}>
              ✦ {STORY_LINK[g.id]?.[1]} →
            </Link>
          ) : null}
          <div className="explain__foot">
            <Link to="/guide" className="linkish" onClick={() => setExplain(null)}>
              Open the full guide
            </Link>
            <button type="button" className="stamp explain__close" onClick={() => setExplain(null)}>
              <span>Got it</span>
            </button>
          </div>
        </article>
      ) : null}
    </Sheet>
  );
}
