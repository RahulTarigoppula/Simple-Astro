// The live sidereal wheel: the nine grahas where they truly are right now, around the twelve rÄÅ›is
// and twenty-seven naká¹£atras, with the Moon's phase at the centre and the sign rising at the place.
import * as A from "astronomy-engine";
import { useMemo } from "react";
import { GRAHA_ENGLISH, NAKSHATRA_NAMES, SIGN_NAMES, SIGN_WESTERN } from "../../data/tables/names";
import { ayanamsa } from "../../engine/ayanamsa";
import { transitsAt } from "../../engine/gochar";
import { lagna } from "../../engine/lagna";
import { jdTtFromUtcMs } from "../../engine/time";
import { type EnginePreset, GRAHA_IDS, type GrahaId } from "../../engine/types";

const C = 160;
const R_SIGN = 138;
const R_NAK = 118;
const R_PLANET = 96;
/** English two-letter planet marks: Sun, Moon, Mars, Mercury, Jupiter, Venus, Saturn, Rāhu, Ketu. */
export const ABBR_EN: Record<GrahaId, string> = {
  SU: "Su",
  MO: "Mo",
  MA: "Ma",
  ME: "Me",
  JU: "Ju",
  VE: "Ve",
  SA: "Sa",
  RA: "Ra",
  KE: "Ke",
};

/** Ecliptic longitude â†’ screen angle: Meá¹£a 0Â° at the left (east), increasing anticlockwise. */
function pos(lon: number, r: number): [number, number] {
  const a = ((180 + lon) * Math.PI) / 180;
  return [C + r * Math.cos(a), C - r * Math.sin(a)];
}

function arcPath(a0: number, a1: number, r0: number, r1: number): string {
  const [x0, y0] = pos(a0, r1);
  const [x1, y1] = pos(a1, r1);
  const [x2, y2] = pos(a1, r0);
  const [x3, y3] = pos(a0, r0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 0 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 1 ${x3} ${y3}Z`;
}

interface Props {
  nowMs: number;
  preset: EnginePreset;
  lat: number;
  lon: number;
  natalMoonSign?: number | undefined;
}

export function ZodiacOrbit({ nowMs, preset, lat, lon, natalMoonSign }: Props) {
  const sky = useMemo(() => {
    const tr = transitsAt(nowMs, preset);
    const ay = ayanamsa(jdTtFromUtcMs(nowMs), preset.ayanamsa);
    const asc = lagna(A.MakeTime(new Date(nowMs)), lat, lon, ay).ascSid;
    const phase = A.MoonPhase(A.MakeTime(new Date(nowMs)));
    const k = A.Illumination(A.Body.Moon, A.MakeTime(new Date(nowMs))).phase_fraction;
    return { tr, asc, phase, k };
  }, [nowMs, preset, lat, lon]);

  // Spread grahas that sit close together onto inner tracks so labels never collide.
  const placed = useMemo(() => {
    const order = [...GRAHA_IDS].sort((a, b) => sky.tr[a].lonSidereal - sky.tr[b].lonSidereal);
    const out: Array<{ id: GrahaId; r: number }> = [];
    let lastLon = -999;
    let track = 0;
    for (const id of order) {
      const l = sky.tr[id].lonSidereal;
      track = l - lastLon < 9 ? track + 1 : 0;
      lastLon = l;
      out.push({ id, r: R_PLANET - track * 18 });
    }
    return out;
  }, [sky]);

  const waxing = sky.phase < 180;
  const shade = (1 - sky.k) * 22 * (waxing ? -1 : 1);
  const ascSign = Math.floor(sky.asc / 30);
  const moon = sky.tr.MO;
  const label = `The sky now: Moon in ${NAKSHATRA_NAMES[moon.nakshatra]} (${SIGN_NAMES[moon.sign]}), ${SIGN_NAMES[ascSign]} rising here. ${GRAHA_IDS.map((g) => `${GRAHA_ENGLISH[g]} in ${SIGN_NAMES[sky.tr[g].sign]}`).join(", ")}.`;

  return (
    <svg className="orbit" viewBox="0 0 320 320" role="img" aria-label={label}>
      <defs>
        <radialGradient id="orbit-core">
          <stop offset="0" stopColor="var(--moon)" stopOpacity="0.35" />
          <stop offset="1" stopColor="var(--moon)" stopOpacity="0" />
        </radialGradient>
        <clipPath id="orbit-moonclip">
          <circle cx={C} cy={C} r="22" />
        </clipPath>
        <linearGradient id="orbit-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--accent)" />
          <stop offset="0.5" stopColor="var(--accent-text)" />
          <stop offset="1" stopColor="var(--cyan)" />
        </linearGradient>
      </defs>
      <g className="orbit__spin">
        <circle cx={C} cy={C} r={R_SIGN + 12} className="orbit__halo" />
      </g>
      {SIGN_NAMES.map((name, s) => (
        <path
          key={name}
          d={arcPath(s * 30, s * 30 + 30, R_SIGN - 14, R_SIGN + 8)}
          className={`orbit__sign${s === ascSign ? " is-rising" : ""}${s === natalMoonSign ? " is-natal" : ""}`}
        />
      ))}
      {SIGN_WESTERN.map((d, s) => {
        const [x, y] = pos(s * 30 + 15, R_SIGN - 3);
        return (
          <text key={d} x={x} y={y + 3.5} className="orbit__signlbl">
            {d}
          </text>
        );
      })}
      <circle cx={C} cy={C} r={R_NAK} className="orbit__ring" />
      {NAKSHATRA_NAMES.map((n, i) => {
        const [x0, y0] = pos((i * 40) / 3, R_NAK - 4);
        const [x1, y1] = pos((i * 40) / 3, R_NAK + 4);
        return <line key={n} x1={x0} y1={y0} x2={x1} y2={y1} className="orbit__tick" />;
      })}
      <circle cx={C} cy={C} r={R_PLANET - 40} className="orbit__ring orbit__ring--inner" />
      {(() => {
        const [x, y] = pos(sky.asc, R_SIGN + 14);
        const [x0, y0] = pos(sky.asc, R_PLANET - 44);
        return (
          <g className="orbit__asc">
            <line x1={x0} y1={y0} x2={x} y2={y} />
            <circle cx={x} cy={y} r="4" />
          </g>
        );
      })()}
      {placed.map(({ id, r }) => {
        const [x, y] = pos(sky.tr[id].lonSidereal, r);
        const [lx, ly] = pos(sky.tr[id].lonSidereal, R_NAK);
        return (
          <g key={id} className={`orbit__planet orbit__planet--${id}`}>
            <line x1={lx} y1={ly} x2={x} y2={y} className="orbit__spoke" />
            <title>{`${GRAHA_ENGLISH[id]} in ${SIGN_WESTERN[sky.tr[id].sign]} (${SIGN_NAMES[sky.tr[id].sign]})`}</title>
            <circle cx={x} cy={y} r="9.5" />
            <text x={x} y={y + 3.2}>
              {ABBR_EN[id]}
            </text>
          </g>
        );
      })}
      <circle cx={C} cy={C} r="46" fill="url(#orbit-core)" />
      <g className="orbit__moon">
        <circle cx={C} cy={C} r="22" className="orbit__moonlit" />
        <circle cx={C + shade} cy={C} r="22" className="orbit__moonshade" clipPath="url(#orbit-moonclip)" />
      </g>
    </svg>
  );
}
