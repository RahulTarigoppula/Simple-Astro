// Whose chart is this? One chip on every screen names the person; tapping it switches person,
// adds one, or opens People and Settings. Replaces the old People tab and the Settings gear.
import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useActiveProfile, useProfiles } from "../../app/hooks";
import { saveSettings } from "../../data/repo";
import { formatClock12 } from "../../engine/time";
import type { Profile } from "../../engine/types";
import { Sheet } from "./Sheet";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "14 Mar 1994 · 7:25 am · Bengaluru" */
export function birthLine(p: Profile): string {
  const b = p.birth;
  const date = `${b.localD} ${MONTHS[b.localMo - 1] ?? ""} ${b.localY}`;
  const time = p.timeUnknown ? "time not known" : formatClock12(b.localH, b.localMi);
  return `${date} · ${time} · ${b.place.name.split(",")[0]}`;
}

export function Avatar({ name, size = 30 }: { name: string; size?: number }) {
  return (
    <span className="v-avatar" style={{ "--av": `${size}px` } as React.CSSProperties} aria-hidden="true">
      {name.trim()[0] ?? "?"}
    </span>
  );
}

export function PersonChip() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const loc = useLocation();

  if (profiles === undefined) return null;

  const choose = (p: Profile) => {
    setOpen(false);
    if (p.id === active?.id) return;
    void saveSettings({ activeProfileId: p.id });
    // A screen that is about one person follows the switch.
    const m = /^\/(patri|forecast|hast)\/([^/]+)(\/.*)?$/.exec(loc.pathname);
    if (m) navigate(`/${m[1]}/${p.id}${m[1] === "hast" ? "" : (m[3] ?? "")}`, { replace: true });
  };
  const go = (to: string) => {
    setOpen(false);
    navigate(to);
  };

  return (
    <>
      <button
        type="button"
        className="v-person"
        aria-haspopup="dialog"
        aria-label={active ? `${active.name}. Switch person, people and settings` : "People and settings"}
        onClick={() => setOpen(true)}
      >
        {active ? <Avatar name={active.name} /> : null}
        <span className="v-person__name">{active ? active.name : "Menu"}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      <Sheet open={open} onClose={() => setOpen(false)} label="People and settings">
        <div className="v-people">
          <h2>{profiles.length ? "Whose chart?" : "No one added yet"}</h2>
          {profiles.length ? (
            <div className="v-people__list" role="radiogroup" aria-label="Choose a person">
              {profiles.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={p.id === active?.id}
                  className="v-people__one"
                  onClick={() => choose(p)}
                >
                  <Avatar name={p.name} size={40} />
                  <span>
                    <span className="t">{p.name}</span>
                    <span className="s">{birthLine(p)}</span>
                  </span>
                  {p.id === active?.id ? (
                    <svg
                      className="tick"
                      width="20"
                      height="20"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.4"
                      strokeLinecap="round"
                      aria-hidden="true"
                    >
                      <path d="M5 12.5l4.5 4.5L19 7.5" />
                    </svg>
                  ) : null}
                </button>
              ))}
            </div>
          ) : (
            <p className="v-muted">Add a birth date, time and place to see a chart, a forecast and more.</p>
          )}
          <button type="button" className="v-btn v-btn--block" onClick={() => go("/leaf/new")}>
            + Add a person
          </button>
          <div className="v-people__links">
            <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => go("/circle")}>
              Manage people
            </button>
            <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => go("/drawer")}>
              Settings
            </button>
            <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => go("/guide")}>
              How to use
            </button>
            <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => go("/about")}>
              About
            </button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

/** A plain link to People for places that only need the door. */
export function PeopleLink() {
  return (
    <Link to="/circle" className="v-link">
      People
    </Link>
  );
}
