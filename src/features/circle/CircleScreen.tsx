// People: everyone saved on this device, one clear card each. Tap a person to put them in view and
// open their chart; Chart, Forecast, Match and Edit are plain buttons; "More" holds the rare things
// (palm, choosing a partner, the encrypted backup, and delete, which stays a deliberate hold).
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useActiveProfile, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { Page } from "../../components/ui/Page";
import { Avatar, birthLine } from "../../components/ui/PersonChip";
import { Sheet } from "../../components/ui/Sheet";
import { nakBoth, rashiBoth } from "../../data/regional";
import { burnProfile, saveSettings } from "../../data/repo";
import type { Profile } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { LeafSheet, type SheetMode } from "./LeafSheet";
import { leafMoon } from "./leafFacts";
import "./people.css";

function PeopleArt() {
  return (
    <svg
      width="30"
      height="30"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="9" cy="8" r="3.4" />
      <path d="M2.8 19.5c.6-3.4 3-5.3 6.2-5.3s5.6 1.9 6.2 5.3" />
      <circle cx="17.2" cy="9.2" r="2.6" />
      <path d="M17.2 14.4c2.2 0 3.7 1.3 4.2 3.6" />
    </svg>
  );
}

function Dots() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="5" cy="12" r="1.9" />
      <circle cx="12" cy="12" r="1.9" />
      <circle cx="19" cy="12" r="1.9" />
    </svg>
  );
}

export default function CircleScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<{ id: string; mode: SheetMode } | null>(null);
  const list = profiles ?? [];
  const sheetProfile = sheet ? list.find((p) => p.id === sheet.id) : undefined;

  /** Put this person in view and go to one of their screens. */
  const open = (p: Profile, to: "patri" | "forecast", el: HTMLElement | null) => {
    void saveSettings({ activeProfileId: p.id });
    rememberOrigin(el);
    play("tick", 0.6);
    navigate(`/${to}/${p.id}`);
  };

  /** With one other person the match opens straight away; with several, the partner is chosen first. */
  const match = (p: Profile) => {
    const others = list.filter((x) => x.id !== p.id);
    const only = others[0];
    if (!only) navigate("/milan");
    else if (others.length === 1) navigate(`/milan/${p.id}/${only.id}`);
    else setSheet({ id: p.id, mode: "milan" });
  };

  const remove = async (p: Profile) => {
    setSheet(null);
    try {
      await burnProfile(p.id);
      haptics.impact("heavy");
      toast(`Deleted. ${p.name} and their palm photos are gone from this device.`, "danger");
    } catch (e) {
      toast(`Could not delete: ${e instanceof Error ? e.message : String(e)}`, "danger");
    }
  };

  if (profiles === undefined) {
    return (
      <Page label="People" title="People" back>
        {null}
      </Page>
    );
  }

  if (list.length === 0) {
    return (
      <Page label="People" title="People" back>
        <section className="v-card v-empty" aria-labelledby="ppl-empty-h">
          <span className="v-empty__art" aria-hidden="true">
            <PeopleArt />
          </span>
          <h2 id="ppl-empty-h" className="v-card__title">
            No one here yet
          </h2>
          <p className="v-muted">
            Add a birth date, time and place. Vyomaphala works out the chart on this device and keeps it here, for you and for anyone in the
            family you add.
          </p>
          <Link to="/leaf/new" className="v-btn">
            Add a person
          </Link>
        </section>
      </Page>
    );
  }

  return (
    <Page label="People" title="People" lede="Tap a person to see their chart. They become the person shown across the app." back>
      <ul className="ppl-list" aria-label="People">
        {list.map((p) => {
          const m = leafMoon(p, settings.preset.ayanamsa);
          const isActive = active?.id === p.id;
          return (
            <li key={p.id} className={`v-card v-card--flush ppl${isActive ? " is-active" : ""}`}>
              <div className="ppl__head">
                <button type="button" className="ppl__main" onClick={(e) => open(p, "patri", e.currentTarget)}>
                  <Avatar name={p.name} size={48} />
                  <span className="ppl__text">
                    <span className="ppl__name">
                      <span className="ppl__n">{p.name}</span>
                      {isActive ? <span className="v-chip v-chip--violet">Active</span> : null}
                    </span>
                    {m ? (
                      <span className="ppl__moon">
                        <span>Moon sign {rashiBoth(m.sign, p.tradition)}</span>
                        <span>Birth star {nakBoth(m.nak, p.tradition)}</span>
                      </span>
                    ) : null}
                    <span className="ppl__birth">{birthLine(p)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  className="v-iconbtn ppl__more"
                  aria-label={`More for ${p.name}`}
                  aria-haspopup="dialog"
                  onClick={() => setSheet({ id: p.id, mode: "menu" })}
                >
                  <Dots />
                </button>
              </div>
              <div className="ppl__actions">
                <button
                  type="button"
                  className="v-btn v-btn--ghost v-btn--sm"
                  aria-label={`Chart: ${p.name}`}
                  onClick={(e) => open(p, "patri", e.currentTarget)}
                >
                  Chart
                </button>
                <button
                  type="button"
                  className="v-btn v-btn--ghost v-btn--sm"
                  aria-label={`Forecast: ${p.name}`}
                  onClick={() => open(p, "forecast", null)}
                >
                  Forecast
                </button>
                <button type="button" className="v-btn v-btn--ghost v-btn--sm" aria-label={`Match: ${p.name}`} onClick={() => match(p)}>
                  Match
                </button>
                <Link to={`/leaf/${p.id}/edit`} className="v-btn v-btn--ghost v-btn--sm" aria-label={`Edit: ${p.name}`}>
                  Edit
                </Link>
              </div>
            </li>
          );
        })}
      </ul>

      <Link to="/leaf/new" className="v-btn v-btn--block" onClick={(e) => rememberOrigin(e.currentTarget)}>
        + Add a person
      </Link>
      <p className="v-foot">Everyone here is kept on this device only. "More" has the encrypted backup and delete.</p>

      <Sheet open={sheet !== null && sheetProfile !== undefined} onClose={() => setSheet(null)} label={sheetProfile?.name ?? "Person"}>
        {sheet && sheetProfile ? (
          <LeafSheet
            profile={sheetProfile}
            others={list.filter((p) => p.id !== sheetProfile.id)}
            mode={sheet.mode}
            ayanamsa={settings.preset.ayanamsa}
            setMode={(mode) => setSheet({ id: sheetProfile.id, mode })}
            onPalm={() => {
              setSheet(null);
              navigate(`/hast/${sheetProfile.id}`);
            }}
            onPair={(o) => {
              setSheet(null);
              navigate(`/milan/${sheetProfile.id}/${o.id}`);
            }}
            onBurn={() => void remove(sheetProfile)}
            onClose={() => setSheet(null)}
          />
        ) : null}
      </Sheet>
    </Page>
  );
}
