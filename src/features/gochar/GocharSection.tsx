// The "Now" view of a birth chart: where the nine planets are today, counted from the birth Moon
// (and the rising sign), Saturn's long seasons on a 90-year ribbon, and a few calm
// "Tradition says…" sentences, each with its source.
import { useEffect, useMemo, useState } from "react";
import { InfoDot } from "../../components/ui/Explain";
import { GRAHA_ENGLISH, GRAHA_NAMES, ORDINAL, SIGN_NAMES } from "../../data/tables/names";
import { CITE } from "../../engine/citations";
import { type GocharReport, gocharReport, type SadeSatiResult, sadeSati } from "../../engine/gochar";
import { jdToMs, MS_PER_DAY } from "../../engine/math";
import type { Citation, Patri } from "../../engine/types";
import { fmtDate, fmtMonthYear } from "./format";
import { PHASE_LABEL, RIBBON_YEARS, SadeSatiRibbon } from "./SadeSatiRibbon";
import "./gochar.css";

const YEAR_MS = 365.25 * MS_PER_DAY;

// Śani's spells over ninety years take a moment to reckon: done once per leaf, preset and birth
// instant, after first paint, and kept for the session so a revisit is instant.
const SS_CACHE = new Map<string, SadeSatiResult>();
const ssKey = (p: Patri): string => `${p.profileId}|${p.presetHash}|${p.jdUt}`;

/** Forget the session's reckoned spells (tests). */
export function forgetSadeSati(): void {
  SS_CACHE.clear();
}

/** Reckon Śani's spells now (cached). The chart screen calls this before printing every view. */
export function reckonSadeSati(patri: Patri): SadeSatiResult {
  const key = ssKey(patri);
  const hit = SS_CACHE.get(key);
  if (hit) return hit;
  const birthMs = Math.round(jdToMs(patri.jdUt));
  // Birth − 3 y covers a spell already running at birth.
  const ss = sadeSati(patri, birthMs - 3 * YEAR_MS, birthMs + (RIBBON_YEARS + 2) * YEAR_MS);
  SS_CACHE.set(key, ss);
  return ss;
}

/** The spells for this patri: from the cache at once, or reckoned when the browser is idle. */
function useSadeSati(patri: Patri): SadeSatiResult | null {
  const key = ssKey(patri);
  const [done, setDone] = useState<{ key: string; ss: SadeSatiResult } | null>(null);
  useEffect(() => {
    if (SS_CACHE.has(key)) return;
    let live = true;
    const run = (): void => {
      if (live) setDone({ key, ss: reckonSadeSati(patri) });
    };
    if (typeof window.requestIdleCallback === "function") {
      const h = window.requestIdleCallback(run, { timeout: 1200 });
      return () => {
        live = false;
        window.cancelIdleCallback(h);
      };
    }
    const t = window.setTimeout(run, 0);
    return () => {
      live = false;
      window.clearTimeout(t);
    };
  }, [key, patri]);
  return SS_CACHE.get(key) ?? (done?.key === key ? done.ss : null);
}

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
export function gocharReadings(report: GocharReport, ss: SadeSatiResult | null, nowMs: number, zone: string): Reading[] {
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
  if (!ss) return out;

  const sade = ss.spells.filter((s) => s.kind === "sade-sati");
  const running = sade.find((s) => nowMs >= s.startMs && nowMs < s.endMs);
  if (running) {
    const iv = running.intervals.find((i) => nowMs >= i.startMs && nowMs < i.endMs);
    const back = iv ? undefined : running.intervals.find((i) => i.startMs > nowMs);
    const where = iv
      ? `it is now in its ${PHASE_LABEL[iv.phase].toLowerCase()} phase, through ${SIGN_NAMES[iv.sign]}, until ${fmtDate(iv.endMs, zone)}`
      : back
        ? `Śani has for now stepped back out of these signs by retrogression and returns to ${SIGN_NAMES[back.sign]} on ${fmtDate(back.startMs, zone)}`
        : "Śani has for now stepped back out of these signs by retrogression";
    out.push({
      key: "sade",
      text: `Tradition says Śani's passage over the Moon's sign and its two neighbours is a season that asks for patience and steady, unhurried effort; ${where}, and the whole passage closes around ${fmtMonthYear(running.endMs, zone)}.`,
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
  const ss = useSadeSati(patri);
  const readings = useMemo(() => gocharReadings(report, ss, nowMs, zone), [report, ss, nowMs, zone]);
  const moon = report.moonSign;

  return (
    <section className="gochar" aria-labelledby="gochar-h">
      <div className="v-card gochar__card">
        <h2 id="gochar-h" className="v-card__title">
          Where the planets are now
        </h2>
        <p className="v-card__sub">
          {fmtDate(nowMs, zone)} · Sanskrit: Gochar (transits) <InfoDot id="gochar" label="Gochar" />
        </p>
        {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a scrollable region must be keyboard-reachable (WCAG 2.1.1) */}
        <div className="gochar__scroll" role="region" aria-label="Planets today, house by house" tabIndex={0}>
          <table className="ledger gochar__ledger">
            <caption className="vh">
              Houses counted from the birth Moon in {SIGN_NAMES[moon]} (Candra-lagna) and from the rising sign,{" "}
              {SIGN_NAMES[report.lagnaSign]}.
            </caption>
            <thead>
              <tr>
                <th scope="col">Planet</th>
                <th scope="col">Now in</th>
                <th scope="col">
                  House <span className="gochar__sk">from Moon · rising</span>
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
                      {GRAHA_ENGLISH[e.id]}
                      {showRetro ? (
                        <span className="retro" title="retrograde">
                          {" "}
                          ℞<span className="vh"> retrograde</span>
                        </span>
                      ) : null}
                      <span className="gochar__sk">{GRAHA_NAMES[e.id]}</span>
                    </td>
                    <td>
                      {SIGN_NAMES[t.sign]} <span className="num pd">{Math.floor(t.degInSign)}°</span>
                    </td>
                    <td className="num">
                      {e.houseFromMoon}
                      <span className="vh"> from the Moon, </span>
                      <span className="pd" aria-hidden="true">
                        {" · "}
                      </span>
                      <span className="pd">{e.houseFromLagna}</span>
                      <span className="vh"> from the rising sign</span>
                    </td>
                    <td className="gochar__reads">
                      {e.favourable ? (
                        <>
                          <span className="gochar__mark" aria-hidden="true">
                            ✓
                          </span>{" "}
                          <span className="gochar__word">favourable</span>
                          {e.vedha && e.vedha.by.length > 0 ? (
                            <span className="gochar__vedha">
                              blocked (vedha) · {e.vedha.by.map((g) => GRAHA_ENGLISH[g]).join(", ")} in {ORDINAL(e.vedha.house)}
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
        </div>
        <p className="gochar__note">
          Houses are counted from your birth Moon in {SIGN_NAMES[moon]} and from your rising sign, {SIGN_NAMES[report.lagnaSign]}. ✓ marks a
          house the tradition lists as favourable from the Moon; · one it does not. Blocking (vedha) is checked for the seven planets only;
          Rāhu and Ketu neither give nor receive it in the classical table.
        </p>
      </div>

      <div className="v-card gochar__card">
        <h3 className="v-card__title">Saturn's long seasons</h3>
        <p className="v-card__sub">
          Sanskrit: Sāḍe-sātī <InfoDot id="sade-sati" label="Sāḍe-sātī" /> · Saturn (Śani) passing over {SIGN_NAMES[(moon + 11) % 12]},{" "}
          {SIGN_NAMES[moon]} and {SIGN_NAMES[(moon + 1) % 12]}, the signs around your Moon. Dates in {zone}.
        </p>
        {ss ? (
          <SadeSatiRibbon key={ssKey(patri)} result={ss} birthMs={birthMs} nowMs={nowMs} zone={zone} />
        ) : (
          <div className="gochar-rib">
            <div className="gochar-rib__track" aria-hidden="true" data-decorative="true">
              <div className="gochar-rib__rule" />
              <span className="gochar-rib__end gochar-rib__end--l">birth</span>
              <span className="gochar-rib__end gochar-rib__end--r">+{RIBBON_YEARS} y</span>
            </div>
            <p className="v-muted" role="status">
              Reckoning Śani's spells…
            </p>
            <div className="ink-wait" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="v-card gochar__card">
        <h3 className="v-card__title">What tradition says</h3>
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
      </div>
    </section>
  );
}
