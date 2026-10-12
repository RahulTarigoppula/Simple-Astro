// "गोचर · Transits now" — a section for the Janam Patri scroll: where the nine grahas walk today,
// counted from the natal Moon (and Lagna), Śani's spells on a 90-year ribbon, and a few calm
// "Tradition says…" sentences, each with its source.
import { useMemo } from "react";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { GRAHA_DEV, GRAHA_NAMES, ORDINAL, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { CITE } from "../../engine/citations";
import { type GocharReport, gocharReport, type SadeSatiResult, sadeSati } from "../../engine/gochar";
import { jdToMs, MS_PER_DAY } from "../../engine/math";
import type { Citation, Patri } from "../../engine/types";
import { fmtDate, fmtMonthYear } from "./format";
import { PHASE_LABEL, RIBBON_YEARS, SadeSatiRibbon } from "./SadeSatiRibbon";
import "./gochar.css";

const YEAR_MS = 365.25 * MS_PER_DAY;

export interface GocharSectionProps {
  patri: Patri;
  nowMs: number;
  /** IANA zone every date is printed in (the birth zone on the Patri scroll). */
  zone: string;
}

interface Reading {
  key: string;
  text: string;
  cite: Citation;
}

/** The "Tradition says…" sentences for a report and Śani's spells. Exported for tests. */
export function gocharReadings(report: GocharReport, ss: SadeSatiResult, nowMs: number, zone: string): Reading[] {
  const out: Reading[] = [];
  const moon = SIGN_NAMES[report.moonSign];
  const fav = report.entries.filter((e) => e.favourable);
  const blocked = fav.filter((e) => !e.effective);
  out.push({
    key: "gochar",
    text:
      `Tradition says transits are read from the natal Moon's sign, ${moon}; today ${fav.length} of the nine grahas walk houses it counts as supportive` +
      (blocked.length > 0
        ? `, and for ${blocked.length === 1 ? "one" : blocked.length} of them another graha stands in the obstructing (vedha) house.`
        : "."),
    cite: report.citation,
  });

  const sade = ss.spells.filter((s) => s.kind === "sade-sati");
  const running = sade.find((s) => nowMs >= s.startMs && nowMs < s.endMs);
  if (running) {
    const iv = running.intervals.find((i) => nowMs >= i.startMs && nowMs < i.endMs);
    const phase = iv
      ? `${PHASE_LABEL[iv.phase].toLowerCase()} phase, through ${SIGN_NAMES[iv.sign]}, until ${fmtDate(iv.endMs, zone)}`
      : "";
    out.push({
      key: "sade",
      text: `Tradition says Śani's passage over the Moon's sign and its two neighbours is a season that asks for patience and steady, unhurried effort; it is now in its ${phase}, and the whole passage closes around ${fmtMonthYear(running.endMs, zone)}.`,
      cite: running.citation,
    });
  } else {
    const next = sade.find((s) => s.startMs > nowMs);
    const last = [...sade].reverse().find((s) => s.endMs <= nowMs);
    out.push({
      key: "sade",
      text: next
        ? `Tradition says Śani's passage over the Moon's sign and its two neighbours is a season that rewards patience; the next one begins around ${fmtMonthYear(next.startMs, zone)}${last ? `, the last having closed in ${fmtMonthYear(last.endMs, zone)}` : ""}.`
        : "Tradition says Śani's passage over the Moon's sign and its two neighbours is a season that rewards patience; none falls inside the years shown.",
      cite: CITE.sadeSati,
    });
  }

  const short = ss.spells.find((s) => s.kind !== "sade-sati" && nowMs >= s.startMs && nowMs < s.endMs);
  if (short) {
    const house = short.kind === "kantaka" ? "4th" : "8th";
    out.push({
      key: "short",
      text: `Tradition says Śani in the ${house} from the Moon (${short.kind === "kantaka" ? "Kaṇṭaka" : "Aṣṭama"}) is a shorter stretch of the same patient tone, read until about ${fmtMonthYear(short.endMs, zone)}.`,
      cite: short.citation,
    });
  }
  return out;
}

export function GocharSection({ patri, nowMs, zone }: GocharSectionProps) {
  const report = useMemo(() => gocharReport(patri, nowMs), [patri, nowMs]);
  const birthMs = Math.round(jdToMs(patri.jdUt));
  // Śani's spells over the whole ribbon (birth − 3 y covers a spell already running at birth).
  const ss = useMemo(() => sadeSati(patri, birthMs - 3 * YEAR_MS, birthMs + (RIBBON_YEARS + 2) * YEAR_MS), [patri, birthMs]);
  const readings = useMemo(() => gocharReadings(report, ss, nowMs, zone), [report, ss, nowMs, zone]);
  const moon = report.moonSign;

  return (
    <section className="gochar" aria-labelledby="gochar-h">
      <TurmericBand id="gochar-h" dev="गोचर" title="Transits now" meta={fmtDate(nowMs, zone)} />

      <table className="ledger gochar__ledger">
        <caption>
          Houses counted from the natal Moon in {SIGN_NAMES[moon]} (Candra-lagna) and from the Lagna in {SIGN_NAMES[report.lagnaSign]}. ✓
          marks a house the tradition lists as favourable from the Moon; · one it does not.
        </caption>
        <thead>
          <tr>
            <th scope="col">Graha</th>
            <th scope="col">Transit</th>
            <th scope="col">
              <abbr title="House from the natal Moon">Moon</abbr>
            </th>
            <th scope="col">
              <abbr title="House from the Lagna">Lagna</abbr>
            </th>
            <th scope="col">Reads</th>
          </tr>
        </thead>
        <tbody>
          {report.entries.map((e) => {
            const t = e.transit;
            const showRetro = t.retrograde && e.id !== "RA" && e.id !== "KE";
            return (
              <tr key={e.id} className={e.effective ? "is-fav" : undefined}>
                <td>
                  <span lang="hi" className="dev gochar__dev">
                    {GRAHA_DEV[e.id]}
                  </span>{" "}
                  {GRAHA_NAMES[e.id]}
                  {showRetro ? (
                    <span className="retro" title="retrograde">
                      {" "}
                      ℞<span className="vh"> retrograde</span>
                    </span>
                  ) : null}
                </td>
                <td>
                  {SIGN_NAMES[t.sign]} <span className="num pd">{Math.floor(t.degInSign)}°</span>
                </td>
                <td className="num">{e.houseFromMoon}</td>
                <td className="num pd">{e.houseFromLagna}</td>
                <td className="gochar__reads">
                  {e.favourable ? (
                    <>
                      <span className="gochar__mark" aria-hidden="true">
                        ✓
                      </span>{" "}
                      favourable
                      {e.vedha && e.vedha.by.length > 0 ? (
                        <span className="gochar__vedha">
                          vedha · {e.vedha.by.map((g) => GRAHA_NAMES[g]).join(", ")} in {ORDINAL(e.vedha.house)}
                        </span>
                      ) : null}
                    </>
                  ) : (
                    <span className="pd">
                      <span className="gochar__mark" aria-hidden="true">
                        ·
                      </span>
                      <span className="vh">not among the favourable houses</span>
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="gochar__note">
        Vedha is checked for the seven planets only; Rāhu and Ketu neither give nor receive it in the classical table.
      </p>

      <h3 className="gochar__h">
        <span lang="hi" className="dev">
          साढ़े साती
        </span>{" "}
        · Sāḍe-sātī and Śani from the Moon
      </h3>
      <p className="gochar__sub">
        Śani over {SIGN_NAMES[(moon + 11) % 12]}, {SIGN_NAMES[moon]}{" "}
        <span lang="hi" className="dev">
          {SIGN_DEV[moon]}
        </span>{" "}
        and {SIGN_NAMES[(moon + 1) % 12]}; dates in {zone}.
      </p>
      <SadeSatiRibbon result={ss} birthMs={birthMs} nowMs={nowMs} zone={zone} />

      <div className="gochar__readings">
        {readings.map((r) => (
          <p key={r.key} className="gochar__reading">
            {r.text}
            <span className="gochar__src">
              {r.cite.text} {r.cite.ref}
            </span>
          </p>
        ))}
      </div>
    </section>
  );
}
