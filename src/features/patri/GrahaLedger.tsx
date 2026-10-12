import { digitsFor } from "../../app/digits";
import { GRAHA_ABBR_DEV, GRAHA_ABBR_LAT, GRAHA_ENGLISH, GRAHA_NAMES, NAKSHATRA_SHORT, SIGN_NAMES } from "../../data/tables/names";
import { dms, formatArcmin } from "../../engine/math";
import { GRAHA_IDS, type GrahaId, type Patri } from "../../engine/types";

function Degree({ x, dev }: { x: number; dev: boolean }) {
  const [d, m, s] = dms(x);
  const n = digitsFor(dev);
  return (
    <span className={dev ? "num num--dev" : "num"} lang={dev ? "hi" : undefined}>
      {n(d)}°{n(String(m).padStart(2, "0"))}
      <span className="min">′</span>
      {n(String(s).padStart(2, "0"))}
      <span className="sec">″</span>
    </span>
  );
}

interface GrahaLedgerProps {
  patri: Patri;
  lit: GrahaId | null;
  onRead: (g: GrahaId) => void;
  onBoundary: (g: GrahaId | "LAGNA") => void;
  devDigits?: boolean;
}

/** The graha ledger: tabular degrees, ′ ″ muted, ℞, and the vermilion asterisk ONLY within 2′ of an edge. */
export function GrahaLedger({ patri, lit, onRead, onBoundary, devDigits = false }: GrahaLedgerProps) {
  const L = patri.lagna;
  return (
    <table className="ledger">
      <caption className="vh">Graha positions, sidereal, {patri.preset.ayanamsa}</caption>
      <thead>
        <tr>
          <th scope="col">Graha</th>
          <th scope="col">Rāśi</th>
          <th scope="col">Degree</th>
          <th scope="col">Nakṣatra · pada</th>
          <th scope="col">Lord</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row" style={{ fontWeight: 400, textAlign: "left", paddingLeft: "var(--paper-margin)" }}>
            <span lang="hi" className="dev">
              ल
            </span>{" "}
            Lg
          </th>
          <td>{SIGN_NAMES[L.sign]}</td>
          <td>
            <Degree x={L.degInSign} dev={devDigits} />
          </td>
          <td>
            {NAKSHATRA_SHORT[L.nakshatra]} <span className="pd">{L.pada}</span>
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
          </td>
          <td className="pd">{GRAHA_ABBR_LAT[L.nakshatraLord]}</td>
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
                <span lang="hi" className="dev">
                  {GRAHA_ABBR_DEV[id]}
                </span>{" "}
                {GRAHA_ABBR_LAT[id]}
                {g.retrograde ? <span className="retro">℞</span> : null}
              </td>
              <td>{SIGN_NAMES[g.sign]}</td>
              <td>
                <Degree x={g.degInSign} dev={devDigits} />
              </td>
              <td>
                {NAKSHATRA_SHORT[g.nakshatra]} <span className="pd">{g.pada}</span>
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
              </td>
              <td className="pd" title={GRAHA_NAMES[g.nakshatraLord]}>
                {GRAHA_ABBR_LAT[g.nakshatraLord]}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
