import { NavLink } from "react-router";
import { IconChart, IconCircle, IconForecast, IconMilan, IconToday } from "../features/chowki/icons";
import { useActiveProfile, useProfiles } from "./hooks";
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

/** The navigation bar: Home · Chart · Partner · Forecast · Today · People. */
export function Ledge() {
  const active = useActiveProfile();
  const profiles = useProfiles();
  const second = profiles?.find((p) => p.id !== active?.id);
  const matchTo = active && second ? `/milan/${active.id}/${second.id}` : "/milan";
  const patriTo = active ? `/patri/${active.id}` : "/leaf/new";
  const forecastTo = active ? `/forecast/${active.id}` : "/forecast";
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
      {item("/", "Home", "Home", <IconHome />, true)}
      {item(patriTo, "Chart", active ? `Birth chart of ${active.name}` : "Add a person", <IconChart />)}
      {item(matchTo, "Partner", "Partner Compatibility", <IconMilan />)}
      {item(forecastTo, "Forecast", "Forecast, day to year", <IconForecast />)}
      {item("/today", "Today", "Today's almanac", <IconToday />)}
      {item("/circle", "People", "Your saved people", <IconCircle />)}
    </nav>
  );
}
