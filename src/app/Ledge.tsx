import { NavLink } from "react-router";
import { IconChart, IconCircle, IconDrawer, IconPalm, IconToday } from "../features/chowki/icons";
import { useActiveProfile } from "./hooks";
import { rememberOrigin } from "./origin";

function IconHome() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <circle cx="12" cy="12" r="3" />
      <path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3" />
    </svg>
  );
}

/** The navigation bar: Home · Patri · Today · Circle · Palm · Settings. */
export function Ledge() {
  const active = useActiveProfile();
  const patriTo = active ? `/patri/${active.id}` : "/leaf/new";
  const hastTo = active ? `/hast/${active.id}` : "/leaf/new";
  const item = (to: string, label: string, name: string, icon: React.ReactNode, end = false) => (
    <NavLink to={to} end={end} aria-label={name} onClick={(e) => rememberOrigin(e.currentTarget)}>
      <span className="obj" aria-hidden="true">
        {icon}
      </span>
      <span className="lbl" aria-hidden="true">
        {label}
      </span>
    </NavLink>
  );
  return (
    <nav className="ledge" aria-label="Main navigation">
      {item("/", "Home", "Home — the sky now", <IconHome />, true)}
      {item(patriTo, "Patri", active ? `Janam Patri of ${active.name}` : "Write a leaf", <IconChart />)}
      {item("/today", "Today", "Today's pañcāṅga", <IconToday />)}
      {item("/circle", "Circle", "Your circle of leaves", <IconCircle />)}
      {item(hastTo, "Palm", "Palm reading", <IconPalm />)}
      {item("/drawer", "Settings", "Settings and backup", <IconDrawer />)}
    </nav>
  );
}
