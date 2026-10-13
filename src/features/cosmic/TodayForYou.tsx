// Home's "Today for you": the day's tone for the active person, the Moon's house and star, the running
// daśā, and doors to the week, month and year.
import { useMemo } from "react";
import { Link } from "react-router";
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { GRAHA_LORE } from "../../data/lore";
import { forecast, HOUSE_AREA, ord } from "../../engine/forecast";
import type { EnginePreset, Patri, Profile } from "../../engine/types";
import "./cosmic.css";

const TONE_WORD = { bright: "Bright", steady: "Steady", mixed: "Mixed", testing: "Quiet" } as const;

export function TodayForYou({ profile, patri, nowMs, preset }: { profile: Profile; patri: Patri; nowMs: number; preset: EnginePreset }) {
  const hourKey = Math.floor(nowMs / 3_600_000);
  const { lat, lon } = profile.birth.place;
  const f = useMemo(() => {
    try {
      return forecast(patri, "day", hourKey * 3_600_000, profile.birth.zone, preset, { lat, lon });
    } catch {
      return null;
    }
  }, [patri, hourKey, profile.birth.zone, preset, lat, lon]);
  if (!f) return null;
  const d = f.steps[0];
  const md = f.dasha.find((x) => x.level === "MD");
  const ad = f.dasha.find((x) => x.level === "AD");
  const name = (id?: string) => GRAHA_LORE.find((g) => g.id === id)?.english ?? "";
  return (
    <section className={`cosmic-card tfy tfy--${f.tone}`} aria-labelledby="tfy-h">
      <div className="tfy__top">
        <div className="tfy__orb" aria-hidden="true">
          <span />
        </div>
        <div>
          <p className="tfy__k">Today for {profile.name}</p>
          <h2 id="tfy-h" className="tfy__tone">
            {TONE_WORD[f.tone]}
          </h2>
          <p className="tfy__h">{f.headline}</p>
        </div>
      </div>
      {d ? (
        <ul className="tfy__facts">
          <li>
            <GrahaGlyph id="MO" size={30} />
            <span>
              Moon in your <strong>{ord(d.moonHouse)}</strong>: {HOUSE_AREA[d.moonHouse]} <InfoDot id="chandra-bala" />
            </span>
          </li>
          <li>
            <span className="tfy__star" aria-hidden="true">
              ✦
            </span>
            <span>
              Star of the day: <strong>{d.tara}</strong> (
              {d.taraTone === "kind" ? "kind" : d.taraTone === "unkind" ? "unkind" : "your own star"}) <InfoDot id="tara-bala" />
            </span>
          </li>
          {md && ad ? (
            <li>
              <GrahaGlyph id={ad.lord} size={30} />
              <span>
                Life chapter: <strong>{name(md.lord)}</strong> · sub-chapter <strong>{name(ad.lord)}</strong> <InfoDot id="dasha" />
              </span>
            </li>
          ) : null}
        </ul>
      ) : null}
      <nav className="tfy__nav" aria-label="Forecasts">
        <Link to={`/forecast/${profile.id}`} className="stamp tfy__cta">
          <span>Full forecast</span>
        </Link>
        <span className="tfy__links">Day · week · month · quarter · year</span>
      </nav>
    </section>
  );
}
