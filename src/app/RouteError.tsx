import { Link, useRouteError } from "react-router";
import { EngineError } from "../engine/errors";

/** One presentation language for failure: the lac seal cracks and says why. */
export function RouteError() {
  const err = useRouteError();
  const reason =
    err instanceof EngineError ? `${err.code.replace(/_/g, " ").toLowerCase()} — ${err.detail}` : err instanceof Error ? err.message : "the desk could not open this leaf";
  const offlineChunk = err instanceof Error && /dynamically imported module|Failed to fetch|Loading chunk/i.test(err.message);
  return (
    <main className="screen screen--scroll" aria-label="Error">
      <div className="paper sheet-col" style={{ marginTop: "var(--space-8)" }}>
        <div className="band">
          <h1>
            <span lang="hi" className="dev">
              मुहर टूटी
            </span>{" "}
            · The seal cracked
          </h1>
        </div>
        <div style={{ display: "grid", placeItems: "center", padding: "var(--space-6) 0 0" }}>
          <div className="seal is-cracked" aria-hidden="true">
            <svg width="46" height="46" viewBox="0 0 46 46">
              <path d="M8 12l12 10-6 6 10 10M30 6l-4 12 10 4" stroke="var(--lac-text)" strokeWidth="1.6" fill="none" />
            </svg>
          </div>
        </div>
        <p className="p" role="alert">
          {offlineChunk
            ? "The loupe is still in the drawer — open this screen once with a connection, or use Drawer → Prepare for offline."
            : `Reason: ${reason}.`}
        </p>
        <p className="p">
          <Link className="linkish" to="/">
            Return to the Chowki
          </Link>
        </p>
      </div>
    </main>
  );
}
