import { motion, useReducedMotion } from "motion/react";
import { Link, useLocation } from "react-router";
import {
  IconChart,
  IconCircle,
  IconDrawer,
  IconFamily,
  IconFestival,
  IconForecast,
  IconGuide,
  IconJournal,
  IconMilan,
  IconPick,
  IconSky,
  IconToday,
} from "../features/chowki/icons";
import { haptics } from "../platform/haptics";
import { useActiveProfile, useProfiles } from "./hooks";

interface Tab {
  to: string;
  label: string;
  name: string;
  icon: React.ReactNode;
  on: RegExp;
}

const EASE = [0.22, 0.8, 0.2, 1] as const;

/** Brings the screen on show back to its top (a tap on the tab you are already on). */
export function scrollScreenToTop(): void {
  const calm = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  for (const el of Array.from(document.querySelectorAll<HTMLElement>("main.screen, main.screen .scrollport"))) {
    if (el.scrollTop > 0 && typeof el.scrollTo === "function") el.scrollTo({ top: 0, behavior: calm ? "auto" : "smooth" });
  }
}

/** The five tabs: Today · Chart · Forecast · Match · Explore. People and Settings live behind the
 *  person chip (and at the foot of the rail on a desk). */
export function Ledge() {
  const active = useActiveProfile();
  const profiles = useProfiles();
  const { pathname } = useLocation();
  const still = useReducedMotion();
  const second = profiles?.find((p) => p.id !== active?.id);
  const tabs: Tab[] = [
    { to: "/", label: "Today", name: "Today", icon: <IconToday />, on: /^\/($|today)/ },
    {
      to: active ? `/patri/${active.id}` : "/leaf/new",
      label: "Chart",
      name: active ? `Birth chart of ${active.name}` : "Birth chart: add a person",
      icon: <IconChart />,
      on: /^\/(patri|hast)\//,
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
      name: "Partner match",
      icon: <IconMilan />,
      on: /^\/milan/,
    },
    { to: "/explore", label: "Explore", name: "Explore the sky and its stories", icon: <IconSky />, on: /^\/(explore|story|about)/ },
  ];
  // Desktop only: the side rail has room for the tools that phones reach from Today and Explore.
  const more: Tab[] = [
    { to: "/pick", label: "Pick a day", name: "Pick a good day", icon: <IconPick />, on: /^\/pick/ },
    { to: "/festivals", label: "Festivals", name: "Festivals and fasts", icon: <IconFestival />, on: /^\/festivals/ },
    { to: "/family", label: "Family", name: "Family today", icon: <IconFamily />, on: /^\/family/ },
    { to: "/journal", label: "Journal", name: "Your days, noted", icon: <IconJournal />, on: /^\/journal/ },
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
        onClick={(e) => {
          if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
          if (on && t.to === pathname) {
            // Already here: the tab is a way back to the top, not a reload.
            e.preventDefault();
            scrollScreenToTop();
          } else if (!on) haptics.selection();
        }}
      >
        <span className="v-nav__icon" aria-hidden="true">
          {on ? (
            <motion.span
              layoutId="v-nav-pill"
              className="v-nav__pill"
              style={{ borderRadius: 999 }}
              transition={still ? { duration: 0 } : { type: "tween", duration: 0.22, ease: EASE }}
            />
          ) : null}
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
      <div className="v-nav__more">{more.map(item)}</div>
      <div className="v-nav__foot">{foot.map(item)}</div>
    </nav>
  );
}
