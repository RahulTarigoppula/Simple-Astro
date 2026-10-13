// Plain-English help: an ⓘ beside any traditional term opens one shared sheet that explains it
// simply, then in depth, then how Chowki calculates it.
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
              <h3>How Chowki works it out</h3>
              <p>{g.how}</p>
            </>
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
