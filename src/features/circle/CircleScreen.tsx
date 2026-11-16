// People: everyone saved on this device, one calm row each. Tap a person to put them in view and
// open their chart; the "..." button opens one menu with everything else (forecast, match, palm,
// edit, the encrypted backup, and delete, which stays a deliberate hold).
import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useActiveProfile, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { Reveal } from "../../components/ui/Motion";
import { Page } from "../../components/ui/Page";
import { Avatar, birthLine } from "../../components/ui/PersonChip";
import { Sheet } from "../../components/ui/Sheet";
import { nakBoth, rashiBoth } from "../../data/regional";
import { burnProfile, saveSettings } from "../../data/repo";
import type { Profile } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { litFraction, litPath } from "../today/moon";
import { LeafSheet, type SheetMode } from "./LeafSheet";
import { leafMoon } from "./leafFacts";
import "./people.css";

/** A small sky that is waiting for its first person: a young Moon and five stars. */
function PeopleArt() {
  return (
    <svg className="ppl-art" viewBox="0 0 200 96" aria-hidden="true">
      <path className="ppl-art__line" d="M22 62L58 30L96 50L150 22L182 58" />
      {(
        [
          [22, 62, 2.6],
          [58, 30, 3.4],
          [150, 22, 3],
          [182, 58, 2.4],
          [120, 76, 1.8],
        ] as const
      ).map(([x, y, r]) => (
        <circle key={x} className="ppl-art__star" cx={x} cy={y} r={r} />
      ))}
      <circle className="ppl-art__dark" cx="96" cy="50" r="20" />
      <path className="ppl-art__lit" d={litPath(0.3, true, false, 20, 50)} transform="translate(46 0)" />
    </svg>
  );
}

/** The Moon as it stood at the birth: its true phase, from the Moon − Sun angle of that moment. */
function BirthMoon({ elongation }: { elongation: number }) {
  const d = litPath(litFraction(elongation), elongation < 180, false, 9, 10);
  return (
    <svg className="ppl-mark" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <circle className="ppl-mark__dark" cx="10" cy="10" r="9" />
      {d ? <path className="ppl-mark__lit" d={d} /> : null}
    </svg>
  );
}

function StarMark() {
  return (
    <svg className="ppl-mark" width="18" height="18" viewBox="0 0 20 20" aria-hidden="true">
      <path
        className="ppl-mark__star"
        d="M10 1.5c.7 4.6 3.9 7.8 8.5 8.5-4.6.7-7.800 3.900-8.500 8.500-.7-4.6-3.900-7.800-8.500-8.500 4.600-.7 7.800-3.900 8.500-8.500z"
      />
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
        <Reveal>
          <section className="v-card ppl-empty" aria-labelledby="ppl-empty-h">
            <PeopleArt />
            <h2 id="ppl-empty-h" className="ppl-empty__h">
              No one here yet
            </h2>
            <p className="v-muted">
              Add a birth date, time and place. Vyomaphala works out the chart on this device and keeps it here, for you and for anyone in
              the family you add.
            </p>
            <Link to="/leaf/new" className="v-btn v-btn--block">
              Add a person
            </Link>
            <p className="v-small v-muted">About a minute. Nothing leaves this device.</p>
          </section>
        </Reveal>
      </Page>
    );
  }

  return (
    <Page label="People" title="People" lede="Tap a person to open their chart. They become the person shown across the app." back>
      <ul className="ppl-list" aria-label="People">
        {list.map((p, i) => {
          const m = leafMoon(p, settings.preset.ayanamsa);
          const isActive = active?.id === p.id;
          return (
            <li key={p.id}>
              <Reveal i={i} className={`v-card ppl${isActive ? " is-active" : ""}`}>
                <button type="button" className="ppl__main" onClick={(e) => open(p, "patri", e.currentTarget)}>
                  <Avatar name={p.name} size={52} />
                  <span className="ppl__text">
                    <span className="ppl__name">
                      <span className="ppl__n">{p.name}</span>
                      {isActive ? <span className="v-chip">Viewing now</span> : null}
                    </span>
                    <span className="ppl__birth">{birthLine(p)}</span>
                    {m ? (
                      <span className="ppl__moon">
                        <span>
                          <BirthMoon elongation={m.elongation} />
                          <span>Moon sign {rashiBoth(m.sign, p.tradition)}</span>
                        </span>
                        <span>
                          <StarMark />
                          <span>Birth star {nakBoth(m.nak, p.tradition)}</span>
                        </span>
                        <span className="vh">
                          . Born under a {m.elongation < 180 ? "growing" : "fading"} Moon, {Math.round(litFraction(m.elongation) * 100)}%
                          lit.
                        </span>
                      </span>
                    ) : null}
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
              </Reveal>
            </li>
          );
        })}
      </ul>

      <Reveal i={list.length} className="ppl-end">
        <Link to="/leaf/new" className="v-btn v-btn--block ppl-add" onClick={(e) => rememberOrigin(e.currentTarget)}>
          Add a person
        </Link>
        <p className="v-foot ppl-foot">
          Everyone here is kept on this device only. The ⋯ button has the forecast, match, palm, edit, backup and delete.
        </p>
      </Reveal>

      <Sheet open={sheet !== null && sheetProfile !== undefined} onClose={() => setSheet(null)} label={sheetProfile?.name ?? "Person"}>
        {sheet && sheetProfile ? (
          <LeafSheet
            profile={sheetProfile}
            others={list.filter((p) => p.id !== sheetProfile.id)}
            mode={sheet.mode}
            ayanamsa={settings.preset.ayanamsa}
            setMode={(mode) => setSheet({ id: sheetProfile.id, mode })}
            onChart={() => open(sheetProfile, "patri", null)}
            onForecast={() => open(sheetProfile, "forecast", null)}
            onMatch={() => match(sheetProfile)}
            onPalm={() => {
              setSheet(null);
              void saveSettings({ activeProfileId: sheetProfile.id });
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
