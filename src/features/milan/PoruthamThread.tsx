// The ten poruthams as a second, shorter thread beneath the mala: ten knots, tied in brass where the
// porutham holds, left open (an empty ring with a lac ×) where it does not. Every knot is a button
// opening its rule. Pass/fail always also reads as text — colour is never the only signal.
import type { PoruthamResult } from "../../engine/porutham";

function Knot({ tied }: { tied: boolean }) {
  return (
    <svg className={`pknot${tied ? " is-tied" : " is-open"}`} viewBox="0 0 28 28" aria-hidden="true" data-decorative="true">
      {tied ? (
        <>
          <ellipse className="pknot__loop" cx="9.5" cy="10" rx="5" ry="3" transform="rotate(-35 9.5 10)" />
          <ellipse className="pknot__loop" cx="18.5" cy="10" rx="5" ry="3" transform="rotate(35 18.5 10)" />
          <circle className="pknot__core" cx="14" cy="14" r="6.5" />
          <path className="pknot__wrap" d="M8.5 15.5 Q14 11 19.5 15.5" />
        </>
      ) : (
        <>
          <circle className="pknot__ring" cx="14" cy="14" r="8" />
          <path className="pknot__x" d="M10.5 10.5 L17.5 17.5 M17.5 10.5 L10.5 17.5" />
        </>
      )}
    </svg>
  );
}

export function PoruthamThread({ list, onOpen }: { list: PoruthamResult[]; onOpen: (p: PoruthamResult) => void }) {
  const tied = list.filter((p) => p.pass).length;
  return (
    <section className="porutham" aria-labelledby="porutham-h">
      <h2 id="porutham-h" className="porutham__h">
        <span lang="ta">பொருத்தம்</span>
        <span>Ten Porutham</span>
        <span className="porutham__meta">
          {tied} / {list.length} tied
        </span>
      </h2>
      <p className="porutham__sub">The South Indian reading — each agreement holds or does not; there are no points.</p>
      <ol className="pthread">
        {list.map((p) => (
          <li key={p.id} className={p.pass ? "is-tied" : "is-open"}>
            <button
              type="button"
              className="pthread__row"
              aria-haspopup="dialog"
              onClick={() => onOpen(p)}
              aria-label={`${p.name}: ${p.pass ? "tied — the porutham holds" : "open — the porutham does not hold"}${p.weighty ? ", one of the two weighed heaviest" : ""}`}
            >
              <Knot tied={p.pass} />
              <span className="pthread__name">
                {p.name}
                <span lang="sa" className="pthread__dev">
                  {p.nameDev}
                </span>
              </span>
              <span className="pthread__state">
                {p.pass ? "tied" : "open"}
                {p.weighty ? <span className="pthread__weighty">weighed heaviest</span> : null}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  );
}
