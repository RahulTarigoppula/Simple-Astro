// The Sky Wheel: 27 nakṣatras (outer ring), 12 rāśis (middle) and the nine grahas where they are right
// now (inner). Drag to turn it; tap anything to bring it to the top and open its story. Keyboard: ← → move
// through the ring, ↑ ↓ change ring, Enter plays the story.
import { useCallback, useMemo, useRef, useState } from "react";
import { GRAHA_LORE, RASHI_LORE } from "../../data/lore";
import { NAKSHATRA_NAMES } from "../../data/tables/names";
import type { TransitGraha } from "../../engine/gochar";
import { GRAHA_IDS, type GrahaId } from "../../engine/types";

export type WheelSel = { kind: "nak"; i: number } | { kind: "rashi"; i: number } | { kind: "graha"; id: GrahaId };

const C = 200;
const NAK: [number, number] = [170, 197];
const RASHI: [number, number] = [118, 166];
const R_PLANET = 98;
const SPAN = 360 / 27;
const ABBR: Record<GrahaId, string> = { SU: "Su", MO: "Mo", MA: "Ma", ME: "Me", JU: "Ju", VE: "Ve", SA: "Sa", RA: "Ra", KE: "Ke" };

function pos(lon: number, r: number): [number, number] {
  const a = ((180 + lon) * Math.PI) / 180;
  return [C + r * Math.cos(a), C - r * Math.sin(a)];
}
function arc(a0: number, a1: number, r0: number, r1: number): string {
  const [x0, y0] = pos(a0, r1);
  const [x1, y1] = pos(a1, r1);
  const [x2, y2] = pos(a1, r0);
  const [x3, y3] = pos(a0, r0);
  return `M${x0} ${y0}A${r1} ${r1} 0 0 0 ${x1} ${y1}L${x2} ${y2}A${r0} ${r0} 0 0 1 ${x3} ${y3}Z`;
}
const norm = (x: number) => ((x % 360) + 360) % 360;

/** The sidereal longitude at the middle of a selection. */
export function selLon(sel: WheelSel, sky: Record<GrahaId, TransitGraha>): number {
  return sel.kind === "nak" ? sel.i * SPAN + SPAN / 2 : sel.kind === "rashi" ? sel.i * 30 + 15 : sky[sel.id].lonSidereal;
}

interface Props {
  sky: Record<GrahaId, TransitGraha>;
  sel: WheelSel;
  onSelect: (s: WheelSel) => void;
  onPlay: () => void;
  natalMoon?: number | undefined;
}

export function SkyWheel({ sky, sel, onSelect, onPlay, natalMoon }: Props) {
  const box = useRef<HTMLDivElement>(null);
  const drag = useRef<{ a: number; rot: number; moved: number; x: number; y: number } | null>(null);
  // rot (degrees, clockwise on screen) — start with the selection at the top.
  const [rot, setRot] = useState(() => 90 + selLon(sel, sky));
  const [dragging, setDragging] = useState(false);

  const placed = useMemo(() => {
    const order = [...GRAHA_IDS].sort((a, b) => sky[a].lonSidereal - sky[b].lonSidereal);
    const out: Array<{ id: GrahaId; r: number; lon: number }> = [];
    let last = -999;
    let track = 0;
    for (const id of order) {
      const l = sky[id].lonSidereal;
      track = l - last < 8 ? track + 1 : 0;
      last = l;
      out.push({ id, r: R_PLANET - track * 17, lon: l });
    }
    return out;
  }, [sky]);

  const bringToTop = useCallback(
    (s: WheelSel) => {
      const target = 90 + selLon(s, sky);
      setRot((r) => r + ((((target - r) % 360) + 540) % 360) - 180);
    },
    [sky],
  );

  const choose = useCallback(
    (s: WheelSel) => {
      onSelect(s);
      bringToTop(s);
    },
    [onSelect, bringToTop],
  );

  const toSvg = (cx: number, cy: number): [number, number] => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return [C, C];
    return [((cx - r.left) / r.width) * 400, ((cy - r.top) / r.height) * 400];
  };
  const angleAt = (x: number, y: number) => (Math.atan2(-(y - C), x - C) * 180) / Math.PI;

  const hit = (x: number, y: number): WheelSel | null => {
    const d = Math.hypot(x - C, y - C);
    const lon = norm(angleAt(x, y) + rot - 180);
    // planets first: nearest marker within reach
    let best: { id: GrahaId; d: number } | null = null;
    for (const p of placed) {
      const [px, py] = pos(p.lon, p.r);
      // rotate the marker by the wheel's rotation to compare in screen space
      const a = (rot * Math.PI) / 180;
      const rx = C + (px - C) * Math.cos(a) - (py - C) * Math.sin(a);
      const ry = C + (px - C) * Math.sin(a) + (py - C) * Math.cos(a);
      const dd = Math.hypot(rx - x, ry - y);
      if (dd < 16 && (!best || dd < best.d)) best = { id: p.id, d: dd };
    }
    if (best) return { kind: "graha", id: best.id };
    if (d >= NAK[0] && d <= NAK[1] + 4) return { kind: "nak", i: Math.floor(lon / SPAN) % 27 };
    if (d >= RASHI[0] && d < NAK[0]) return { kind: "rashi", i: Math.floor(lon / 30) % 12 };
    return null;
  };

  const step = (dir: 1 | -1) => {
    if (sel.kind === "nak") choose({ kind: "nak", i: (sel.i + dir + 27) % 27 });
    else if (sel.kind === "rashi") choose({ kind: "rashi", i: (sel.i + dir + 12) % 12 });
    else {
      const k = GRAHA_IDS.indexOf(sel.id);
      choose({ kind: "graha", id: GRAHA_IDS[(k + dir + 9) % 9] ?? "SU" });
    }
  };
  const ring = (dir: 1 | -1) => {
    const lon = selLon(sel, sky);
    const kinds = ["graha", "rashi", "nak"] as const;
    const k = kinds[(kinds.indexOf(sel.kind) + dir + 3) % 3];
    if (k === "nak") choose({ kind: "nak", i: Math.floor(lon / SPAN) % 27 });
    else if (k === "rashi") choose({ kind: "rashi", i: Math.floor(lon / 30) % 12 });
    else
      choose({
        kind: "graha",
        id:
          [...GRAHA_IDS].sort(
            (a, b) => Math.abs(norm(sky[a].lonSidereal - lon + 180) - 180) - Math.abs(norm(sky[b].lonSidereal - lon + 180) - 180),
          )[0] ?? "SU",
      });
  };

  const selName =
    sel.kind === "nak"
      ? NAKSHATRA_NAMES[sel.i]
      : sel.kind === "rashi"
        ? RASHI_LORE[sel.i]?.name
        : GRAHA_LORE.find((g) => g.id === sel.id)?.name;

  return (
    <div
      ref={box}
      className={`wheel${dragging ? " is-dragging" : ""}`}
      role="application"
      aria-roledescription="sky wheel"
      aria-label={`Sky wheel. Selected: ${selName}. Left and right arrows move along the ring, up and down change ring, Enter plays the story.`}
      // biome-ignore lint/a11y/noNoninteractiveTabindex: the wheel is a keyboard-driven widget (role=application)
      tabIndex={0}
      style={{ "--rot": `${rot}deg` } as React.CSSProperties}
      onKeyDown={(e) => {
        const k: Record<string, () => void> = {
          ArrowRight: () => step(1),
          ArrowLeft: () => step(-1),
          ArrowUp: () => ring(-1),
          ArrowDown: () => ring(1),
          Enter: onPlay,
        };
        const f = k[e.key];
        if (f) {
          e.preventDefault();
          f();
        }
      }}
      onPointerDown={(e) => {
        const [x, y] = toSvg(e.clientX, e.clientY);
        drag.current = { a: angleAt(x, y), rot, moved: 0, x: e.clientX, y: e.clientY };
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const [x, y] = toSvg(e.clientX, e.clientY);
        d.moved = Math.max(d.moved, Math.hypot(e.clientX - d.x, e.clientY - d.y));
        if (d.moved > 6) {
          if (!dragging) setDragging(true);
          setRot(d.rot - (angleAt(x, y) - d.a));
        }
      }}
      onPointerUp={(e) => {
        const d = drag.current;
        drag.current = null;
        setDragging(false);
        if (d && d.moved <= 6) {
          const [x, y] = toSvg(e.clientX, e.clientY);
          const s = hit(x, y);
          if (s) choose(s);
        }
      }}
      onPointerCancel={() => {
        drag.current = null;
        setDragging(false);
      }}
    >
      <svg viewBox="0 0 400 400" aria-hidden="true">
        <defs>
          <radialGradient id="wheel-core">
            <stop offset="0" stopColor="var(--accent)" stopOpacity="0.35" />
            <stop offset="1" stopColor="var(--accent)" stopOpacity="0" />
          </radialGradient>
        </defs>
        <g className="wheel__spin">
          <circle cx={C} cy={C} r={NAK[1] + 1} className="wheel__rim" />
          {NAKSHATRA_NAMES.map((n, i) => {
            const on = sel.kind === "nak" && sel.i === i;
            const moon = sky.MO.nakshatra === i;
            const [lx, ly] = pos(i * SPAN + SPAN / 2, (NAK[0] + NAK[1]) / 2);
            return (
              <g key={n} className={`wheel__nak${on ? " is-on" : ""}${moon ? " is-moon" : ""}`}>
                <path d={arc(i * SPAN, (i + 1) * SPAN, NAK[0], NAK[1])} />
                <text x={lx} y={ly + 3.2} className="wheel__up" style={{ transformOrigin: `${lx}px ${ly}px` }}>
                  {i + 1}
                </text>
              </g>
            );
          })}
          {RASHI_LORE.map((r, i) => {
            const on = sel.kind === "rashi" && sel.i === i;
            const [lx, ly] = pos(i * 30 + 15, (RASHI[0] + RASHI[1]) / 2);
            return (
              <g
                key={r.name}
                className={`wheel__rashi wheel__rashi--${r.element.toLowerCase()}${on ? " is-on" : ""}${natalMoon === i ? " is-natal" : ""}`}
              >
                <path d={arc(i * 30, i * 30 + 30, RASHI[0], RASHI[1])} />
                <text x={lx} y={ly + 3.5} className="wheel__up" style={{ transformOrigin: `${lx}px ${ly}px` }}>
                  {r.name}
                </text>
              </g>
            );
          })}
          <circle cx={C} cy={C} r={RASHI[0] - 4} className="wheel__inner" />
          {placed.map(({ id, r, lon }) => {
            const [x, y] = pos(lon, r);
            const on = sel.kind === "graha" && sel.id === id;
            return (
              <g key={id} className={`wheel__planet wheel__planet--${id}${on ? " is-on" : ""}`}>
                <circle cx={x} cy={y} r="11.5" />
                <text x={x} y={y + 3.4} className="wheel__up" style={{ transformOrigin: `${x}px ${y}px` }}>
                  {ABBR[id]}
                </text>
              </g>
            );
          })}
        </g>
        <circle cx={C} cy={C} r="52" fill="url(#wheel-core)" />
        <circle cx={C} cy={C} r="16" className="wheel__earth" />
        <path d={`M${C} 0 l-7 -0 l7 12 l7 -12 z`} className="wheel__pointer" />
      </svg>
      <span className="wheel__hint" aria-hidden="true">
        drag to turn · tap to explore
      </span>
    </div>
  );
}
