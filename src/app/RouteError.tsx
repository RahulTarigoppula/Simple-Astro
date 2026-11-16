import { Link, useRouteError } from "react-router";
import { EngineError } from "../engine/errors";

/** One plain page for any failure: what happened, and two ways out. */
export function RouteError() {
  const err = useRouteError();
  const reason =
    err instanceof EngineError
      ? `${err.code.replace(/_/g, " ").toLowerCase()}: ${err.detail}`
      : err instanceof Error
        ? err.message
        : "Vyomaphala could not open this page";
  const offlineChunk = err instanceof Error && /dynamically imported module|Failed to fetch|Loading chunk/i.test(err.message);
  return (
    <main className="screen v-screen" aria-label="Error">
      <div className="v-page">
        <div className="v-card v-empty" style={{ marginTop: "var(--space-8)" }}>
          <span className="v-empty__art" aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7.5v5.5M12 16.5v.2" />
            </svg>
          </span>
          <h1 className="v-title">Something went wrong</h1>
          <p className="v-lede" role="alert">
            {offlineChunk
              ? "This screen could not be loaded. If you are online, a newer version is probably waiting: reload. If you are offline, open it once with a connection, or use Settings, Prepare for offline."
              : `Reason: ${reason}.`}
          </p>
          <div className="v-actions">
            <button type="button" className="v-btn" onClick={() => window.location.reload()}>
              Reload
            </button>
            <Link className="v-btn v-btn--ghost" to="/">
              Back home
            </Link>
          </div>
          <p className="v-small v-muted">Your saved people and settings are not affected.</p>
        </div>
      </div>
    </main>
  );
}
