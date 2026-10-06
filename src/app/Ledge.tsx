import { useRef } from "react";
import { NavLink, useNavigate } from "react-router";
import { LedgeArt } from "../features/chowki/art";
import { haptics } from "../platform/haptics";
import { play } from "../platform/sound";
import { useUi } from "../state/ui";
import { rememberOrigin } from "./origin";
import { useActiveProfile } from "./hooks";
import { useLamp } from "./theme";

/** The Ledge: five miniature objects — Scroll · Leaves · Dial · Loupe · Lamp. */
export function Ledge() {
  const active = useActiveProfile();
  const theme = useUi((s) => s.desk.resolvedTheme);
  const { toggle } = useLamp();
  const navigate = useNavigate();
  const press = useRef(0);
  const patriTo = active ? `/patri/${active.id}` : "/leaf/new";
  const hastTo = active ? `/hast/${active.id}` : "/leaf/new";
  const item = (to: string, label: string, name: string, art: React.ReactNode, end = false) => (
    <NavLink to={to} end={end} aria-label={name} onClick={(e) => rememberOrigin(e.currentTarget)}>
      <span className="obj" aria-hidden="true">
        {art}
      </span>
      <span className="lbl" aria-hidden="true">
        {label}
      </span>
    </NavLink>
  );
  return (
    <nav className="ledge" aria-label="The Ledge">
      {item(patriTo, "Patri", active ? `Janam Patri of ${active.name}` : "Write a leaf", LedgeArt.scroll)}
      {item("/circle", "Leaves", "Leaf bundle — the circle", LedgeArt.leaves)}
      {item("/today", "Dial", "Brass dial — today's leaf", LedgeArt.dial)}
      {item(hastTo, "Hast", "Brass loupe — palm reading", LedgeArt.loupe)}
      <button
        type="button"
        aria-label={`Diya, ${theme === "night" ? "lit" : "snuffed"} — tap to ${theme === "night" ? "snuff" : "light"}, hold for the drawer`}
        aria-pressed={theme === "night"}
        onPointerDown={() => {
          press.current = window.setTimeout(() => {
            press.current = -1;
            haptics.impact("light");
            navigate("/drawer");
          }, 520);
        }}
        onPointerUp={() => {
          if (press.current > 0) clearTimeout(press.current);
        }}
        onPointerLeave={() => {
          if (press.current > 0) clearTimeout(press.current);
        }}
        onClick={() => {
          if (press.current === -1) {
            press.current = 0;
            return;
          }
          toggle();
          play(theme === "night" ? "breath" : "fwoomp");
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <span className="obj" aria-hidden="true">
          {LedgeArt.lamp(theme === "night")}
        </span>
        <span className="lbl" aria-hidden="true">
          Lamp
        </span>
      </button>
    </nav>
  );
}
