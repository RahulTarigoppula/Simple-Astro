// Aṣṭakavarga: the Sarvāṣṭakavarga drawn on the Rāśi-chart geometry (numbers in place of grahas),
// the Bhinnāṣṭakavarga matrix (rows grahas, columns signs from Meṣa) and 2–3 cited readings.
import { useId, useMemo, useRef } from "react";
import { TurmericBand } from "../../../components/ui/TurmericBand";
import { useInkDraw } from "../../../components/ui/useInkDraw";
import { GRAHA_ABBR_DEV, GRAHA_ABBR_LAT, GRAHA_ENGLISH, ORDINAL, SIGN_DEV, SIGN_NAMES } from "../../../data/tables/names";
import { AV_GRAHAS, ashtakavarga, ashtakavargaReadings, SAV_STRONG, TRANSIT_SMOOTH } from "../../../engine/ashtakavarga";
import type { PatriCore } from "../../../engine/types";
import { NORTH_ANCHOR, SOUTH_CELL, signInHouse, tilakPath } from "../geometry";
import "./extras.css";

export interface AshtakavargaSectionProps {
  patri: PatriCore;
  script: "devanagari" | "latin";
  style: "north" | "south";
  /** Render the finished drawing at once (cached revisit, tests). */
  skipInk?: boolean;
}

/** Three-letter column heads: "Meṣ", "Vṛṣ" … with the full name in <abbr title>. */
const SHORT = SIGN_NAMES.map((n) => n.slice(0, 3));

function SavChart({
  sav,
  lagnaSign,
  style,
  script,
  skipInk,
}: {
  sav: number[];
  lagnaSign: number;
  style: "north" | "south";
  script: "devanagari" | "latin";
  skipInk: boolean;
}) {
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const tableId = useId();
  const title = "Sarvāṣṭakavarga — bindus per house";

  const marks = useMemo(() => {
    const out: React.ReactNode[] = [];
    const num = (key: string, x: number, y: number, n: number) => {
      out.push(
        <text
          key={key}
          className={`av-num${n >= SAV_STRONG ? " is-strong" : ""}`}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          data-settle=""
        >
          {n}
        </text>,
      );
      if (n >= SAV_STRONG) out.push(<circle key={`${key}-d`} className="av-chartdot" cx={x} cy={y + 17} r={3} data-settle="" />);
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
        num(`v-${h}`, a.b[0], a.b[1] - (a.flat ? 2 : 6), sav[sign] ?? 0);
      }
      const n1 = NORTH_ANCHOR[1];
      if (n1) out.push(<path key="tilak" className="tilak" data-tilak="" d={tilakPath(n1.n[0], n1.n[1] - 30, 9)} />);
    } else {
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
        out.push(
          <text
            key={`sn-${SIGN_NAMES[sign]}`}
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
        num(`v-${sign}`, x0 + 50, y0 + 46, sav[sign] ?? 0);
      });
      out.push(
        <text key="centre" className="signname" x="200" y="196" textAnchor="middle" data-settle="" style={{ fontSize: 13 }}>
          {script === "devanagari" ? "सर्वाष्टक" : "Sarva"}
        </text>,
      );
    }
    return out;
  }, [sav, lagnaSign, style, script]);

  useInkDraw(svgRef, [style, script, lagnaSign], { skip: skipInk });

  return (
    <>
      <svg
        ref={svgRef}
        className="chart av-chart"
        viewBox="-4 -4 408 408"
        role="img"
        aria-labelledby={titleId}
        aria-describedby={tableId}
        data-tilak-anim="off"
        key={style}
      >
        <title id={titleId}>{title}</title>
        {marks}
      </svg>
      <table className="vh" id={tableId}>
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">House</th>
            <th scope="col">Sign</th>
            <th scope="col">Bindus</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 12 }, (_, i) => {
            const sign = signInHouse(lagnaSign, i + 1);
            return (
              <tr key={sign}>
                <th scope="row">{i === 0 ? "1st, Lagna" : ORDINAL(i + 1)}</th>
                <td>{SIGN_NAMES[sign]}</td>
                <td>{sav[sign] ?? 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </>
  );
}

export function AshtakavargaSection({ patri, script, style, skipInk = false }: AshtakavargaSectionProps) {
  const av = useMemo(() => ashtakavarga(patri), [patri]);
  const readings = useMemo(() => ashtakavargaReadings(av), [av]);
  const lagnaSign = av.lagnaSign;
  const headId = useId();
  const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);

  return (
    <section className="av" aria-labelledby={headId}>
      <TurmericBand id={headId} dev="अष्टकवर्ग" title="Aṣṭakavarga" meta="BPHS ch. 66" />

      <div className="figure">
        <div className="chart-wrap av-wrap">
          <SavChart sav={av.sav} lagnaSign={lagnaSign} style={style} script={script} skipInk={skipInk} />
        </div>
      </div>
      <p className="figcap">
        Sarvāṣṭakavarga — the bindus of all seven grahas in each house ({sum(av.sav)} in all). A dot marks {SAV_STRONG} or more; the tilak
        marks the Lagna in {SIGN_NAMES[lagnaSign]}.
      </p>

      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-reachable (WCAG 2.1.1) */}
      <div className="av-scroll" role="region" aria-label="Bhinnāṣṭakavarga bindus by graha and sign" tabIndex={0}>
        <table className="ledger av-matrix">
          <caption className="vh">
            Bhinnāṣṭakavarga: bindus each graha receives in each sign, from Meṣa; four or more are marked with a dot
          </caption>
          <thead>
            <tr>
              <th scope="col">Graha</th>
              {SHORT.map((s, i) => (
                <th key={s} scope="col" className={i === lagnaSign ? "is-lagna" : undefined}>
                  <abbr title={SIGN_NAMES[i]}>{s}</abbr>
                  {i === lagnaSign ? (
                    <span className="av-lg">
                      <span aria-hidden="true">Lg</span>
                      <span className="vh">, Lagna</span>
                    </span>
                  ) : null}
                </th>
              ))}
              <th scope="col">Σ</th>
            </tr>
          </thead>
          <tbody>
            {AV_GRAHAS.map((g) => (
              <tr key={g}>
                <th scope="row">
                  <span lang="hi" className="dev" aria-hidden="true">
                    {GRAHA_ABBR_DEV[g]}
                  </span>{" "}
                  <span aria-hidden="true">{GRAHA_ABBR_LAT[g]}</span>
                  <span className="vh">{GRAHA_ENGLISH[g]}</span>
                </th>
                {av.bav[g].map((n, s) => (
                  <td key={SHORT[s]} className={`num${n >= TRANSIT_SMOOTH ? " is-four" : ""}`}>
                    {n}
                    {n >= TRANSIT_SMOOTH ? (
                      <>
                        <span className="av-dot" aria-hidden="true" />
                        <span className="vh"> (four or more)</span>
                      </>
                    ) : null}
                  </td>
                ))}
                <td className="num av-total">{sum(av.bav[g])}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row">SAV</th>
              {av.sav.map((n, s) => (
                <td key={SHORT[s]} className="num av-sav">
                  {n}
                </td>
              ))}
              <td className="num av-total">{sum(av.sav)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="p p--muted av-legend">
        <span className="av-dot" aria-hidden="true" /> {TRANSIT_SMOOTH} or more bindus — a sign tradition reads as smoother for that graha's
        transit.
      </p>

      <div className="yoga av-readings">
        {readings.map((r) => (
          <div key={r.id} className="av-reading">
            <p>{r.text}</p>
            <p className="src">
              {r.citation.text} {r.citation.ref}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}

export default AshtakavargaSection;
