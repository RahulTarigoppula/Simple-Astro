// The painted sky (§4.6): a d3-geo stereographic chart of the real sky, centred on the zenith and
// seen from below — ink and paper dots on indigo block-print cloth, the sidereal zodiac as a brass
// band, grahas as brass discs, the Moon in its phase, the Lagna in sindoor, a rooftop parapet.
// Always available; it is the dome's fallback and the poster's source, never a downgrade.
import { memo, useId } from "react";
import { SKY_R, SKY_VIEW } from "../../engine/sky/projection";
import { GRAHA_ABBR_DEV, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { ALT_RINGS, CARDINALS, moonLitPath, type PaintedScene, PARAPET } from "./scene";

interface PaintedSkyProps {
  scene: PaintedScene;
  label: string;
  describedBy?: string;
}

const MOON_R = 8;

export const PaintedSky = memo(function PaintedSky({ scene, label, describedBy }: PaintedSkyProps) {
  const uid = useId().replace(/:/g, "");
  const print = `sky-print-${uid}`;
  const disc = `sky-disc-${uid}`;
  const { moon, sun, lagna } = scene;
  return (
    <svg
      className="painted"
      viewBox={`${-SKY_VIEW} ${-SKY_VIEW} ${2 * SKY_VIEW} ${2 * SKY_VIEW}`}
      role="img"
      aria-label={label}
      {...(describedBy ? { "aria-describedby": describedBy } : {})}
    >
      <defs>
        <pattern id={print} width="6" height="6" patternUnits="userSpaceOnUse">
          <circle cx="3" cy="3" r="0.7" fill="var(--surface)" opacity="0.08" />
        </pattern>
        <clipPath id={disc}>
          <circle r={SKY_R} />
        </clipPath>
      </defs>

      <circle r={SKY_R + 3} className="painted__cloth" />
      <circle r={SKY_R + 3} fill={`url(#${print})`} />
      <circle r={SKY_R} fill="var(--sky-day-0)" opacity={(scene.daylight * 0.3).toFixed(3)} />

      <g clipPath={`url(#${disc})`}>
        <path d={ALT_RINGS} className="painted__rings" />
        {scene.layers.map((l, i) => (
          <path
            // biome-ignore lint/suspicious/noArrayIndexKey: one path per fixed magnitude class
            key={i}
            d={l.d}
            className="painted__stars"
            strokeWidth={l.w}
            opacity={l.o.toFixed(2)}
          />
        ))}
        <path d={scene.ecliptic} className="painted__band" />
        <path d={scene.ecliptic} className="painted__band-line" />
        <path d={scene.nakTicks} className="painted__nak" />
        <path d={scene.rasiTicks} className="painted__rasi" />
        {scene.rasiLabels.map((r) => (
          <g key={r.sign} transform={`translate(${r.x.toFixed(1)} ${r.y.toFixed(1)})`} className="painted__rasi-label">
            <text lang="hi" y="-1">
              {SIGN_DEV[r.sign]}
            </text>
            <text className="lat" y="9">
              {SIGN_NAMES[r.sign]}
            </text>
          </g>
        ))}

        {sun.up ? (
          <g transform={`translate(${sun.x.toFixed(1)} ${sun.y.toFixed(1)})`} className="painted__sun">
            <circle r="10" />
            <text lang="hi" y="4">
              {GRAHA_ABBR_DEV.SU}
            </text>
          </g>
        ) : null}

        {scene.bodies
          .filter((b) => b.up && b.id !== "SU" && b.id !== "MO")
          .map((b) => (
            <g
              key={b.id}
              transform={`translate(${b.x.toFixed(1)} ${b.y.toFixed(1)})`}
              className={b.id === "RA" || b.id === "KE" ? "painted__node" : "painted__graha"}
            >
              <circle r={b.id === "RA" || b.id === "KE" ? 8 : 9.5} />
              <text lang="hi" y="4">
                {GRAHA_ABBR_DEV[b.id]}
              </text>
            </g>
          ))}

        {moon.up ? (
          <g transform={`translate(${moon.x.toFixed(1)} ${moon.y.toFixed(1)})`} className="painted__moon">
            <g transform={`rotate(${moon.angle.toFixed(1)})`}>
              <circle r={MOON_R} className="dark" />
              <path d={moonLitPath(MOON_R, moon.k)} className="lit" />
            </g>
            <text lang="hi" y={MOON_R + 12}>
              {GRAHA_ABBR_DEV.MO}
            </text>
          </g>
        ) : null}
      </g>

      <line x1={lagna.x} y1={lagna.y} x2={lagna.bx} y2={lagna.by} className="painted__beam" />
      <path d={PARAPET} fillRule="evenodd" className="painted__parapet" />
      {CARDINALS.map((c) => (
        <g key={c.lat}>
          <text x={c.x} y={c.y + 3.5} className="painted__cardinal">
            {c.lat}
          </text>
          <text x={c.ox} y={c.oy + 4} className="painted__cardinal-dev" lang="hi">
            {c.dev}
          </text>
        </g>
      ))}
      <circle cx={lagna.x} cy={lagna.y} r="5.5" className="painted__tilak" />
    </svg>
  );
});
