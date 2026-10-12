// North Indian diamond and South Indian grid, drawn in ink. Both expose a visually hidden <table>
// twin (graha / sign / degree / nakshatra-pada) wired by aria-describedby.
import { forwardRef, useEffect, useId, useImperativeHandle, useMemo, useRef } from "react";
import { useInkDraw } from "../../components/ui/useInkDraw";
import { GRAHA_ABBR_DEV, GRAHA_ABBR_LAT, GRAHA_ENGLISH, NAKSHATRA_NAMES, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { GRAHA_IDS, type GrahaId, type SignIdx } from "../../engine/types";
import { layoutChips, NORTH_ANCHOR, SOUTH_CELL, signInHouse, tilakPath } from "./geometry";

export interface ChartBody {
  id: GrahaId;
  sign: SignIdx;
  degInSign?: number;
  retro?: boolean;
  nakshatra?: number;
  pada?: number;
}

export interface KundliProps {
  title: string;
  style: "north" | "south";
  script: "devanagari" | "latin";
  lagnaSign: SignIdx;
  bodies: ChartBody[];
  showDegrees?: boolean;
  lit?: GrahaId | null;
  /** Change to replay the ink-draw; `skip` renders the finished drawing at once. */
  inkKey?: string;
  skipInk?: boolean;
  static?: boolean;
  onChips?: (chips: ChipPos[]) => void;
}

export interface ChipPos {
  id: GrahaId;
  x: number; // viewBox units
  y: number;
}

export interface KundliHandle {
  svg: SVGSVGElement | null;
  chips: ChipPos[];
}

const abbr = (id: GrahaId, script: "devanagari" | "latin") => (script === "devanagari" ? GRAHA_ABBR_DEV[id] : GRAHA_ABBR_LAT[id]);

export const KundliChart = forwardRef<KundliHandle, KundliProps>(function KundliChart(
  {
    title,
    style,
    script,
    lagnaSign,
    bodies,
    showDegrees = true,
    lit = null,
    inkKey = "",
    skipInk = false,
    static: isStatic = false,
    onChips,
  },
  ref,
) {
  const svgRef = useRef<SVGSVGElement>(null);
  const tableId = useId();
  const titleId = useId();

  const bySign = useMemo(() => {
    const m = new Map<number, ChartBody[]>();
    const order = (b: ChartBody) => b.sign * 30 + (b.degInSign ?? 0);
    for (const b of [...bodies].sort((a, z) => order(a) - order(z))) {
      const list = m.get(b.sign) ?? [];
      list.push(b);
      m.set(b.sign, list);
    }
    return m;
  }, [bodies]);

  const { marks, chips } = useMemo(() => {
    const out: React.ReactNode[] = [];
    const chipPos: ChipPos[] = [];
    const chipText = (b: ChartBody, x: number, y: number, size: number, deg: boolean) => {
      chipPos.push({ id: b.id, x, y: y - size * 0.35 });
      out.push(
        <text
          key={`g-${b.id}`}
          className={`graha${b.retro ? " is-retro" : ""}${lit === b.id ? " is-lit" : ""}`}
          x={x}
          y={y}
          textAnchor="middle"
          style={{ fontSize: size }}
          data-settle=""
          lang={script === "devanagari" ? "hi" : undefined}
        >
          {abbr(b.id, script)}
          {deg && b.degInSign != null ? (
            <tspan className="grahadeg" dx="2">
              {Math.floor(b.degInSign)}
            </tspan>
          ) : null}
          {b.retro ? (
            <tspan className="retro" fontSize={size * 0.62} dy={-size * 0.35}>
              ℞
            </tspan>
          ) : null}
        </text>,
      );
    };

    if (style === "north") {
      out.push(<path key="frame" className="stroke" data-ink="1600" d="M2 2H398V398H2Z" />);
      out.push(<path key="d1" className="stroke" data-ink="1130" d="M2 2L398 398" />);
      out.push(<path key="d2" className="stroke" data-ink="1130" d="M398 2L2 398" />);
      out.push(<path key="dia" className="stroke" data-ink="1130" d="M200 2L398 200L200 398L2 200Z" />);
      for (let h = 1; h <= 12; h++) {
        const a = NORTH_ANCHOR[h];
        if (!a) continue;
        const sign = signInHouse(lagnaSign, h);
        out.push(
          <text key={`n-${h}`} className="signnum" x={a.n[0]} y={a.n[1]} textAnchor="middle" dominantBaseline="middle" data-settle="">
            {sign + 1}
          </text>,
        );
        const here = bySign.get(sign) ?? [];
        const cs = layoutChips(
          here.map((b) => b.id),
          a.b,
          a.flat,
        );
        cs.forEach((c, i) => {
          const b = here[i];
          if (b) chipText(b, c.x, c.y + c.size * 0.35, c.size, showDegrees && here.length <= 3);
        });
      }
      const n1 = NORTH_ANCHOR[1];
      if (n1) out.push(<path key="tilak" className="tilak" data-tilak="" d={tilakPath(n1.n[0], n1.n[1] - 30, 9)} />);
    } else {
      // South: 4 × 4 grid, centre 2 × 2 blank; signs fixed, Lagna marked by a diagonal tick.
      out.push(<path key="frame" className="stroke" data-ink="1600" d="M2 2H398V398H2Z" />);
      out.push(<path key="h1" className="stroke" data-ink="400" d="M2 100H398" />);
      out.push(<path key="h3" className="stroke" data-ink="400" d="M2 300H398" />);
      out.push(<path key="v1" className="stroke" data-ink="400" d="M100 2V398" />);
      out.push(<path key="v3" className="stroke" data-ink="400" d="M300 2V398" />);
      out.push(<path key="h2a" className="stroke" data-ink="100" d="M2 200H100" />);
      out.push(<path key="h2b" className="stroke" data-ink="100" d="M300 200H398" />);
      out.push(<path key="v2a" className="stroke" data-ink="100" d="M200 2V100" />);
      out.push(<path key="v2b" className="stroke" data-ink="100" d="M200 300V398" />);
      SOUTH_CELL.forEach(([row, col], sign) => {
        const x0 = col * 100;
        const y0 = row * 100;
        const signKey = `sn-${SIGN_NAMES[sign] ?? sign}`;
        out.push(
          <text
            key={signKey}
            className="signname"
            x={x0 + 96}
            y={y0 + 94}
            textAnchor="end"
            data-settle=""
            lang={script === "devanagari" ? "hi" : undefined}
          >
            {script === "devanagari" ? SIGN_DEV[sign] : SIGN_NAMES[sign]}
          </text>,
        );
        if (sign === lagnaSign) {
          out.push(<path key="lt" className="lagna-tick" d={`M${x0 + 4} ${y0 + 22}L${x0 + 22} ${y0 + 4}`} data-ink="40" />);
          out.push(<path key="tilak" className="tilak" data-tilak="" d={tilakPath(x0 + 84, y0 + 16, 7)} />);
        }
        const here = bySign.get(sign) ?? [];
        const cs = layoutChips(
          here.map((b) => b.id),
          [x0 + 50, y0 + 48],
          false,
          80,
        );
        cs.forEach((c, i) => {
          const b = here[i];
          if (b) chipText(b, c.x, c.y + c.size * 0.35, c.size, showDegrees && here.length <= 3);
        });
      });
      out.push(
        <text key="centre" className="signname" x="200" y="196" textAnchor="middle" data-settle="" style={{ fontSize: 13 }}>
          {script === "devanagari" ? "राशि" : "Rāśi"}
        </text>,
      );
    }
    return { marks: out, chips: chipPos };
  }, [style, script, lagnaSign, bySign, showDegrees, lit]);

  useImperativeHandle(ref, () => ({ svg: svgRef.current, chips }), [chips]);
  useEffect(() => onChips?.(chips), [chips, onChips]);

  useInkDraw(svgRef, [inkKey, style, script], { skip: skipInk || isStatic });

  // The Lagna receives its sindoor tilak last (tilak-dab), after the frame has drawn.
  const tilakDelay = skipInk || isStatic ? 0 : 1500;

  return (
    <>
      <svg
        ref={svgRef}
        className="chart"
        viewBox="-4 -4 408 408"
        role={isStatic ? undefined : "img"}
        aria-hidden={isStatic || undefined}
        aria-labelledby={isStatic ? undefined : titleId}
        aria-describedby={isStatic ? undefined : tableId}
        style={{ "--tilak-delay": `${tilakDelay}ms` } as React.CSSProperties}
        data-tilak-anim={skipInk || isStatic ? "off" : "on"}
        key={isStatic ? undefined : `${inkKey}-${style}`}
      >
        {isStatic ? null : <title id={titleId}>{title}</title>}
        {marks}
      </svg>
      {isStatic ? null : (
        <table className="vh" id={tableId}>
          <caption>{title}</caption>
          <thead>
            <tr>
              <th scope="col">Graha</th>
              <th scope="col">Sign</th>
              <th scope="col">Degree</th>
              <th scope="col">Nakshatra and pada</th>
            </tr>
          </thead>
          <tbody>
            {GRAHA_IDS.map((id) => {
              const b = bodies.find((x) => x.id === id);
              if (!b) return null;
              return (
                <tr key={id}>
                  <th scope="row">{GRAHA_ENGLISH[id]}</th>
                  <td>{SIGN_NAMES[b.sign]}</td>
                  <td>{b.degInSign != null ? `${Math.floor(b.degInSign)} degrees ${Math.floor((b.degInSign % 1) * 60)} minutes` : "—"}</td>
                  <td>{b.nakshatra != null ? `${NAKSHATRA_NAMES[b.nakshatra]} pada ${b.pada ?? ""}` : "—"}</td>
                </tr>
              );
            })}
            <tr>
              <th scope="row">Lagna</th>
              <td>{SIGN_NAMES[lagnaSign]}</td>
              <td colSpan={2}>house 1</td>
            </tr>
          </tbody>
        </table>
      )}
    </>
  );
});
