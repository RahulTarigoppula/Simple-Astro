import { Link, useLocation } from "react-router";
import { IconChart, IconCircle, IconDrawer, IconForecast, IconGuide, IconMilan, IconSky, IconToday } from "../features/chowki/icons";
import { useActiveProfile, useProfiles } from "./hooks";

interface Tab {
  to: string;
  label: string;
  name: string;
  icon: React.ReactNode;
  on: RegExp;
}

/** The five tabs: Today · Chart · Forecast · Match · Explore. People and Settings live behind the
 *  person chip (and at the foot of the rail on a desk). */
export function Ledge() {
  const active = useActiveProfile();
  const profiles = useProfiles();
  const { pathname } = useLocation();
  const second = profiles?.find((p) => p.id !== active?.id);
  const tabs: Tab[] = [
    { to: "/", label: "Today", name: "Today", icon: <IconToday />, on: /^\/($|today)/ },
    {
      to: active ? `/patri/${active.id}` : "/leaf/new",
      label: "Chart",
      name: active ? `Birth chart of ${active.name}` : "Birth chart: add a person",
      icon: <IconChart />,
      on: /^\/(patri|hast|leaf)\//,
    },
    {
      to: active ? `/forecast/${active.id}` : "/forecast",
      label: "Forecast",
      name: "Forecast, day to year",
      icon: <IconForecast />,
      on: /^\/forecast/,
    },
    {
      to: active && second ? `/milan/${active.id}/${second.id}` : "/milan",
      label: "Match",
      name: "Partner Compatibility",
      icon: <IconMilan />,
      on: /^\/milan/,
    },
    { to: "/explore", label: "Explore", name: "Explore the sky and its stories", icon: <IconSky />, on: /^\/(explore|story|about)/ },
  ];
  const foot: Tab[] = [
    { to: "/circle", label: "People", name: "Your saved people", icon: <IconCircle />, on: /^\/circle/ },
    { to: "/guide", label: "How to use", name: "How to use Vyomaphala", icon: <IconGuide />, on: /^\/guide/ },
    { to: "/drawer", label: "Settings", name: "Settings", icon: <IconDrawer />, on: /^\/drawer/ },
  ];
  const item = (t: Tab) => {
    const on = t.on.test(pathname);
    return (
      <Link
        key={t.label}
        to={t.to}
        className={`v-nav__item${on ? " is-active" : ""}`}
        aria-label={t.name}
        aria-current={on ? "page" : undefined}
      >
        <span className="v-nav__icon" aria-hidden="true">
          {t.icon}
        </span>
        <span aria-hidden="true">{t.label}</span>
      </Link>
    );
  };
  return (
    <nav className="v-nav" aria-label="Main navigation">
      <Link to="/" className="v-nav__brand" aria-label="Vyomaphala, home">
        <span className="v-brand__mark" aria-hidden="true" />
        Vyomaphala
      </Link>
      {tabs.map(item)}
      <div className="v-nav__foot">{foot.map(item)}</div>
    </nav>
  );
}
