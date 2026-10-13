// Bhāva Chalit (Śrīpati): the twelve bhāvas as start–madhya–end sidereal degrees, and the grahas
// whose bhāva differs from their whole-sign house. A table only — the Rāśi chart stays whole-sign.
import { useId, useMemo } from "react";
import { TurmericBand } from "../../../components/ui/TurmericBand";
import { GRAHA_ABBR_DEV, GRAHA_NAMES, ORDINAL, SIGN_NAMES } from "../../../data/tables/names";
import { bhavaChalit, bhavaOf } from "../../../engine/lagna";
import { GRAHA_IDS, type GrahaId, type PatriCore } from "../../../engine/types";
import "./extras.css";

export interface BhavaChalitTableProps {
  patri: PatriCore;
}

export interface BhavaShift {
  id: GrahaId;
  house: number; // whole-sign
  bhava: number; // Bhāva Chalit
}

/** Grahas whose Bhāva Chalit house differs from their whole-sign house. */
export function bhavaShifts(patri: PatriCore): BhavaShift[] {
  const table = bhavaChalit(patri.lagna.lonSidereal, patri.mc.lonSidereal);
  const out: BhavaShift[] = [];
  for (const id of GRAHA_IDS) {
    const g = patri.grahas[id];
    const bhava = bhavaOf(g.lonSidereal, table);
    if (bhava !== g.house) out.push({ id, house: g.house, bhava });
  }
  return out;
}

/** A sidereal longitude as sign + whole degrees and minutes (floored, so 29°59′ never reads 30°). */
function SidDeg({ lon }: { lon: number }) {
  const total = Math.floor((((lon % 360) + 360) % 360) * 60 + 1e-7);
  const sign = Math.floor(total / 1800) % 12;
  const inSign = total % 1800;
  const d = Math.floor(inSign / 60);
  const m = inSign % 60;
  const name = SIGN_NAMES[sign] ?? "";
  return (
    <span className="bc-deg">
      <abbr title={name} className="bc-sign">
        {name.slice(0, 3)}
      </abbr>{" "}
      <span className="num" aria-hidden="true">
        {d}°{String(m).padStart(2, "0")}
        <span className="min">′</span>
      </span>
      <span className="vh">
        {d} degrees {m} minutes
      </span>
    </span>
  );
}

export function BhavaChalitTable({ patri }: BhavaChalitTableProps) {
  const rows = useMemo(() => bhavaChalit(patri.lagna.lonSidereal, patri.mc.lonSidereal), [patri]);
  const shifts = useMemo(() => bhavaShifts(patri), [patri]);
  const headId = useId();

  return (
    <section className="bc" aria-labelledby={headId}>
      <TurmericBand id={headId} dev="भाव चलित" title="Bhāva Chalit · houses" explain="bhava" meta="Śrīpati · sidereal" />
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-reachable (WCAG 2.1.1) */}
      <div className="av-scroll" role="region" aria-label="Bhāva Chalit cusps" tabIndex={0}>
        <table className="ledger bc-table">
          <caption className="vh">Bhāva Chalit: start, madhya (mid-point) and end of each bhāva, sidereal</caption>
          <thead>
            <tr>
              <th scope="col">Bhāva</th>
              <th scope="col">Start</th>
              <th scope="col">Madhya</th>
              <th scope="col">End</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.house}>
                <th scope="row">{ORDINAL(r.house)}</th>
                <td>
                  <SidDeg lon={r.startSid} />
                </td>
                <td>
                  <SidDeg lon={r.madhyaSid} />
                </td>
                <td>
                  <SidDeg lon={r.endSid} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {shifts.length > 0 ? (
        <ul className="bc-shifts" aria-label="Grahas that change house in Bhāva Chalit">
          {shifts.map((s) => (
            <li key={s.id}>
              <span lang="hi" className="dev" aria-hidden="true">
                {GRAHA_ABBR_DEV[s.id]}
              </span>{" "}
              {GRAHA_NAMES[s.id]} — whole-sign house {s.house}, <strong>shifts to bhāva {s.bhava}</strong>
            </li>
          ))}
        </ul>
      ) : (
        <p className="p p--muted">Every graha keeps its whole-sign house in Bhāva Chalit.</p>
      )}

      <p className="note-haldi note--keep">
        <span aria-hidden="true">⚑</span>
        <span>The Rāśi chart stays whole-sign; Bhāva Chalit is shown here as a table only.</span>
      </p>
    </section>
  );
}

export default BhavaChalitTable;
