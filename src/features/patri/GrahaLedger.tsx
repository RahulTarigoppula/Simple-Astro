import { digitsFor } from "../../app/digits";
import { nakName, rashiName, type Tradition } from "../../data/regional";
import { GRAHA_ENGLISH, GRAHA_NAMES, NAKSHATRA_SHORT, SIGN_NAMES, SIGN_WESTERN } from "../../data/tables/names";
import { dms, formatArcmin } from "../../engine/math";
import { GRAHA_IDS, type GrahaId, type Patri } from "../../engine/types";

function Degree({ x, dev }: { x: number; dev: boolean }) {
  const [d, m, s] = dms(x);
  const n = digitsFor(dev);
  return (
    <span className={dev ? "num num--dev" : "num"} lang={dev ? "hi" : undefined}>
      {n(d)}°{n(String(m).padStart(2, "0"))}
      <span className="min">′</span>
      <span className="deg-s">
        {n(String(s).padStart(2, "0"))}
        <span className="sec">″</span>
      </span>
    </span>
  );
}

interface GrahaLedgerProps {
  patri: Patri;
  lit: GrahaId | null;
  onRead: (g: GrahaId) => void;
  onBoundary: (g: GrahaId | "LAGNA") => void;
  devDigits?: boolean;
  /** The person's tradition: Telugu and Tamil readers see their own sign and star names. */
  tradition?: Tradition | undefined;
}

/** The planet table: tabular degrees, ′ ″ muted, ℞, and an asterisk ONLY within 2′ of an edge. */
export function GrahaLedger({ patri, lit, onRead, onBoundary, devDigits = false, tradition }: GrahaLedgerProps) {
  const L = patri.lagna;
  const regional = tradition !== undefined && tradition !== "north";
  const sign = (s: number) => (regional ? rashiName(s, tradition) : SIGN_NAMES[s]);
  const star = (i: number) => (regional ? nakName(i, tradition) : NAKSHATRA_SHORT[i]);
  return (
    <table className="ledger ledger--grahas">
      <caption className="vh">Planet positions, sidereal, {patri.preset.ayanamsa}</caption>
      <thead>
        <tr>
          <th scope="col">
            Planet <span className="ledger-sk">Graha</span>
          </th>
          <th scope="col">
            Sign <span className="ledger-sk">Rāśi</span>
          </th>
          <th scope="col">Degree</th>
          <th scope="col">
            Star · quarter <span className="ledger-sk">Nakṣatra · pada · its lord</span>
          </th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">
            Rising <span className="ledger-sk">Lagna</span>
          </th>
          <td>
            {sign(L.sign)} <span className="ledger-sk">{SIGN_WESTERN[L.sign]}</span>
          </td>
          <td>
            <Degree x={L.degInSign} dev={devDigits} />
          </td>
          <td>
            {star(L.nakshatra)} <span className="pd">{L.pada}</span>
            {L.boundary ? (
              <button
                type="button"
                className="flag"
                aria-label={`near boundary, ${formatArcmin(L.boundary.arcminutesTo).replace("′", " arcminutes ").replace("″", " seconds")} from ${L.boundary.otherSide}`}
                onClick={() => onBoundary("LAGNA")}
              >
                *
              </button>
            ) : null}
            <span className="ledger-sk">lord {GRAHA_ENGLISH[L.nakshatraLord]}</span>
          </td>
        </tr>
        {GRAHA_IDS.map((id) => {
          const g = patri.grahas[id];
          return (
            <tr
              key={id}
              data-graha={id}
              className={lit === id ? "is-lit" : undefined}
              tabIndex={0}
              aria-label={`${GRAHA_ENGLISH[id]}, ${SIGN_NAMES[g.sign]}, ${Math.floor(g.degInSign)} degrees ${dms(g.degInSign)[1]} minutes, ${NAKSHATRA_SHORT[g.nakshatra]} pada ${g.pada}${g.retrograde ? ", retrograde" : ""}`}
              onClick={() => onRead(id)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  onRead(id);
                }
              }}
            >
              <td>
                {GRAHA_ENGLISH[id]}
                {g.retrograde ? (
                  <span className="retro" title="retrograde">
                    {" "}
                    ℞
                  </span>
                ) : null}
                <span className="ledger-sk">{GRAHA_NAMES[id]}</span>
              </td>
              <td>
                {sign(g.sign)} <span className="ledger-sk">{SIGN_WESTERN[g.sign]}</span>
              </td>
              <td>
                <Degree x={g.degInSign} dev={devDigits} />
              </td>
              <td>
                {star(g.nakshatra)} <span className="pd">{g.pada}</span>
                {g.boundary ? (
                  <button
                    type="button"
                    className="flag"
                    aria-label={`near boundary, ${formatArcmin(g.boundary.arcminutesTo).replace("′", " arcminutes ").replace("″", " seconds")} from ${g.boundary.otherSide}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onBoundary(id);
                    }}
                  >
                    *
                  </button>
                ) : null}
                <span className="ledger-sk">lord {GRAHA_ENGLISH[g.nakshatraLord]}</span>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
