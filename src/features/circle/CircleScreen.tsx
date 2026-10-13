// People: everyone saved on this device, as clear cards — tap for the birth chart, open the forecast,
// or ⋯ for compatibility, editing, encrypted backup and delete.
import { Link, useNavigate } from "react-router";
import { useActiveProfile, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { RASHI_LORE } from "../../data/lore";
import { burnProfile, saveSettings } from "../../data/repo";
import type { Profile } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import type { LeafTool } from "./Leaf";
import { LeafSheet, type SheetMode } from "./LeafSheet";
import { leafMoon } from "./leafFacts";
import "./circle.css";
import "./people.css";
import { useState } from "react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function birthLine(p: Profile): string {
  const b = p.birth;
  const time = p.timeUnknown ? "time unknown" : `${String(b.localH).padStart(2, "0")}:${String(b.localMi).padStart(2, "0")}`;
  return `${b.localD} ${MONTHS[b.localMo - 1]} ${b.localY} · ${time} · ${b.place.name.split(",")[0]}`;
}

export default function CircleScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<{ id: string; mode: SheetMode } | null>(null);
  const list = profiles ?? [];
  const sheetProfile = sheet ? list.find((p) => p.id === sheet.id) : undefined;
  const other = (p: Profile) => list.find((x) => x.id !== p.id);

  const open = (p: Profile, el: HTMLElement | null) => {
    void saveSettings({ activeProfileId: p.id });
    rememberOrigin(el);
    play("tick", 0.6);
    navigate(`/patri/${p.id}`);
  };

  const tool = (p: Profile, t: LeafTool) => {
    if (t === "edit") navigate(`/leaf/${p.id}/edit`);
    else if (t === "palm") navigate(`/hast/${p.id}`);
    else setSheet({ id: p.id, mode: t === "milan" ? "milan" : "export" });
  };

  const remove = async (p: Profile) => {
    setSheet(null);
    try {
      await burnProfile(p.id);
      haptics.impact("heavy");
      toast("Deleted — the person and their palm photos are gone from this device.", "danger");
    } catch (e) {
      toast(`Could not delete: ${e instanceof Error ? e.message : String(e)}`, "danger");
    }
  };

  if (profiles === undefined) {
    return (
      <Screen className="people-screen" label="People">
        {null}
      </Screen>
    );
  }

  if (list.length === 0) {
    return (
      <Screen className="people-screen" label="People — empty">
        <div className="people">
          <header className="people-head">
            <p className="people-kicker">People · लोग</p>
            <h1>Add your first person</h1>
            <p className="people-lede">
              Vyom works from one person's birth details — date, time and place. Everything else is calculated from them, on this device.
            </p>
          </header>
          <Link to="/leaf/new" className="stamp people-add" aria-label="Add your first person">
            <span>+ Add a person</span>
          </Link>
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="people-screen" label="People">
      <div className="people">
        <header className="people-head">
          <p className="people-kicker">People · लोग</p>
          <h1>Your people</h1>
          <p className="people-lede">Tap a person for their birth chart. ⋯ to compare, edit, back up or delete.</p>
        </header>

        <ul className="people-list" aria-label="People">
          {list.map((p) => {
            const m = leafMoon(p, settings.preset.ayanamsa);
            const isActive = active?.id === p.id;
            return (
              <li key={p.id} className={`person${isActive ? " is-active" : ""}`}>
                <button
                  type="button"
                  className="person__main"
                  aria-label={`${p.name} — Moon in ${m?.nakName ?? "unknown"}, ${m?.signName ?? ""}. Open birth chart`}
                  onClick={(e) => open(p, e.currentTarget)}
                >
                  <span className="person__orb" aria-hidden="true">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="person__text">
                    <span className="person__name">
                      {p.name}
                      {isActive ? <span className="person__badge">active</span> : null}
                    </span>
                    {m ? (
                      <span className="person__moon">
                        Moon in {m.nakName}{" "}
                        <span lang="hi" className="person__dev">
                          {m.nakDev}
                        </span>{" "}
                        · {m.signName} ({RASHI_LORE[m.sign]?.western})
                      </span>
                    ) : null}
                    <span className="person__birth">{birthLine(p)}</span>
                  </span>
                </button>
                <div className="person__actions">
                  <Link to={`/forecast/${p.id}`} className="person__chip">
                    Forecast
                  </Link>
                  <Link to={other(p) ? `/milan/${p.id}/${other(p)?.id}` : "/milan"} className="person__chip">
                    Compare
                  </Link>
                  <button
                    type="button"
                    className="person__more"
                    aria-label={`Actions for ${p.name}`}
                    onClick={() => setSheet({ id: p.id, mode: "menu" })}
                  >
                    ⋯
                  </button>
                </div>
              </li>
            );
          })}
        </ul>

        <Link to="/leaf/new" className="people-new" onClick={(e) => rememberOrigin(e.currentTarget)}>
          <span aria-hidden="true">+</span> Add a person
        </Link>
      </div>

      <Sheet
        open={sheet !== null && sheetProfile !== undefined}
        onClose={() => setSheet(null)}
        label={sheetProfile ? `${sheetProfile.name}` : "Person"}
      >
        {sheet && sheetProfile ? (
          <LeafSheet
            profile={sheetProfile}
            others={list.filter((p) => p.id !== sheetProfile.id)}
            mode={sheet.mode}
            ayanamsa={settings.preset.ayanamsa}
            setMode={(mode) => setSheet({ id: sheetProfile.id, mode })}
            onOpen={() => {
              setSheet(null);
              open(sheetProfile, null);
            }}
            onTool={(t) => {
              if (t === "edit" || t === "palm") setSheet(null);
              tool(sheetProfile, t);
            }}
            onPair={(o) => {
              setSheet(null);
              navigate(`/milan/${sheetProfile.id}/${o.id}`);
            }}
            onBurn={() => void remove(sheetProfile)}
            onBurnProgress={() => undefined}
            onClose={() => setSheet(null)}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}
