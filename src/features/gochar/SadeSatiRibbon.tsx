// The Sāḍe-sātī ribbon: a 90-year rule from birth with Śani's spells laid on it, brass for the
// three phases of the Sāḍe-sātī, a haldi underline for Kaṇṭaka and Aṣṭama, a brass "now" clip,
// and a row of spell tabs (the keyboard path) that open each spell's dated phases.
import { type KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { ORDINAL, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { PHASE_HOUSE, type SadeSatiResult, type SaturnPhase, type SaturnSpell } from "../../engine/gochar";
import { MS_PER_DAY } from "../../engine/math";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { fmtDate, yearIn, yearSpan } from "./format";

const YEAR_MS = 365.25 * MS_PER_DAY;
export const RIBBON_YEARS = 90;

export const PHASE_LABEL: Record<SaturnPhase, string> = {
  rising: "Rising",
  peak: "Peak",
  setting: "Setting",
  kantaka: "Kaṇṭaka",
  ashtama: "Aṣṭama",
};

export const SPELL_LABEL: Record<SaturnSpell["kind"], string> = {
  "sade-sati": "Sāḍe-sātī",
  kantaka: "Kaṇṭaka Śani",
  ashtama: "Aṣṭama Śani",
};

interface SadeSatiRibbonProps {
  result: SadeSatiResult;
  birthMs: number;
  nowMs: number;
  zone: string;
}

export function SadeSatiRibbon({ result, birthMs, nowMs, zone }: SadeSatiRibbonProps) {
  const endMs = birthMs + RIBBON_YEARS * YEAR_MS;
  const span = endMs - birthMs;
  const pct = (ms: number): number => ((Math.min(Math.max(ms, birthMs), endMs) - birthMs) / span) * 100;

  const spells = useMemo(() => result.spells.filter((s) => s.endMs > birthMs && s.startMs < endMs), [result, birthMs, endMs]);
  const nowIdx = spells.findIndex((s) => nowMs >= s.startMs && nowMs < s.endMs);
  const nextIdx = spells.findIndex((s) => s.startMs > nowMs);
  const initial = nowIdx >= 0 ? nowIdx : nextIdx >= 0 ? nextIdx : 0;
  const [picked, setSel] = useState(initial);
  // The parent keys this ribbon on the leaf and preset, so a new patri starts afresh; clamp anyway.
  const sel = Math.min(picked, Math.max(0, spells.length - 1));
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const chosen = spells[sel];

  // Bring the opening tab (the running or next spell) into the row's view, without moving the page.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only on first paint
  useEffect(() => {
    // After the first paint, so the measurement reads a layout the browser has already done.
    const id = requestAnimationFrame(() => {
      const b = tabs.current[initial];
      const row = b?.parentElement;
      if (b && row) row.scrollLeft = Math.max(0, b.offsetLeft - row.offsetLeft - (row.clientWidth - b.offsetWidth) / 2);
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const ticks = useMemo(() => {
    const out: Array<{ y: number; at: number; label: boolean }> = [];
    const y0 = yearIn(birthMs, zone);
    for (let y = Math.ceil((y0 + 1) / 10) * 10; ; y += 10) {
      const at = Date.UTC(y, 0, 1);
      if (at >= endMs) break;
      const frac = (at - birthMs) / (endMs - birthMs);
      out.push({ y, at, label: y % 20 === 0 && frac > 0.09 && frac < 0.91 });
    }
    return out;
  }, [birthMs, endMs, zone]);

  const pick = (i: number): void => {
    setSel(i);
    play("tick");
    haptics.selection();
  };
  const onKey = (e: KeyboardEvent<HTMLButtonElement>, i: number): void => {
    let j = i;
    if (e.key === "ArrowRight") j = Math.min(spells.length - 1, i + 1);
    else if (e.key === "ArrowLeft") j = Math.max(0, i - 1);
    else if (e.key === "Home") j = 0;
    else if (e.key === "End") j = spells.length - 1;
    else return;
    e.preventDefault();
    pick(j);
    tabs.current[j]?.focus();
  };

  const nowInside = nowMs >= birthMs && nowMs <= endMs;

  return (
    <div className="gochar-rib">
      <div className="gochar-rib__track" aria-hidden="true" data-decorative="true">
        <div className="gochar-rib__rule" />
        {ticks.map((t) => (
          <span key={t.y} className="gochar-rib__tick" style={{ left: `${pct(t.at)}%` }}>
            {t.label ? <span className="gochar-rib__yr">{t.y}</span> : null}
          </span>
        ))}
        {spells.map((s, i) =>
          s.intervals.map((iv) => {
            const l = pct(iv.startMs);
            const w = Math.max(0.35, pct(iv.endMs) - l);
            const band = s.kind === "sade-sati";
            return (
              <span
                key={`${s.startMs}-${iv.startMs}`}
                className={`gochar-rib__${band ? "seg" : "line"} is-${iv.phase}${i === sel ? " is-sel" : ""}`}
                style={{ left: `${l}%`, width: `${w}%` }}
              />
            );
          }),
        )}
        {nowInside ? <span className="gochar-rib__now" style={{ left: `${pct(nowMs)}%` }} /> : null}
        <span className="gochar-rib__end gochar-rib__end--l">birth</span>
        <span className="gochar-rib__end gochar-rib__end--r">+{RIBBON_YEARS} y</span>
      </div>

      <ul className="gochar-rib__legend" aria-label="Ribbon key">
        <li>
          <i className="sw is-rising" aria-hidden="true" /> Rising (12th)
        </li>
        <li>
          <i className="sw is-peak" aria-hidden="true" /> Peak (1st)
        </li>
        <li>
          <i className="sw is-setting" aria-hidden="true" /> Setting (2nd)
        </li>
        <li>
          <i className="sw sw--line is-kantaka" aria-hidden="true" /> Kaṇṭaka (4th)
        </li>
        <li>
          <i className="sw sw--line is-ashtama" aria-hidden="true" /> Aṣṭama (8th)
        </li>
      </ul>

      {spells.length === 0 ? (
        <p className="p p--muted">Śani does not cross these signs inside the ninety years shown.</p>
      ) : (
        <div className="ribbon gochar-rib__tabs" role="tablist" aria-label="Śani's spells from the Moon sign">
          {spells.map((s, i) => {
            // A spell can be "running" while Śani has retrograded back out of its signs for a while.
            const inside = i === nowIdx && s.intervals.some((iv) => nowMs >= iv.startMs && nowMs < iv.endMs);
            const paused = i === nowIdx && !inside;
            return (
              <button
                key={s.startMs}
                ref={(el) => {
                  tabs.current[i] = el;
                }}
                type="button"
                role="tab"
                id={`gochar-spell-${i}`}
                aria-selected={i === sel}
                aria-expanded={i === sel}
                aria-controls="gochar-spell-panel"
                tabIndex={i === sel ? 0 : -1}
                className={inside ? "is-now" : undefined}
                aria-label={`${SPELL_LABEL[s.kind]}, ${fmtDate(s.startMs, zone)} to ${fmtDate(s.endMs, zone)}${inside ? ", running now" : paused ? ", paused while Śani stepped back" : ""}`}
                onClick={() => pick(i)}
                onKeyDown={(e) => onKey(e, i)}
              >
                <span className="l" style={{ fontSize: "var(--text-sm)" }}>
                  {SPELL_LABEL[s.kind]}
                </span>
                <span className="y">{yearSpan(s.startMs, s.endMs, zone)}</span>
              </button>
            );
          })}
        </div>
      )}

      {chosen ? <SpellFold spell={chosen} nowMs={nowMs} zone={zone} /> : null}

      {spells.length > 0 ? (
        <table className="ledger print-only gochar-rib__print" aria-hidden="true">
          <caption>Śani's spells from the Moon sign; dates in {zone}.</caption>
          <thead>
            <tr>
              <th scope="col">Phase</th>
              <th scope="col">Sign</th>
              <th scope="col">From → to</th>
            </tr>
          </thead>
          <tbody>
            {spells.flatMap((s) =>
              s.intervals.map((iv) => (
                <tr key={`${s.startMs}-${iv.startMs}`}>
                  <td>{s.kind === "sade-sati" ? `${SPELL_LABEL[s.kind]} · ${PHASE_LABEL[iv.phase]}` : SPELL_LABEL[s.kind]}</td>
                  <td>
                    {SIGN_NAMES[iv.sign]} ({ORDINAL(PHASE_HOUSE[iv.phase])})
                  </td>
                  <td className="num">
                    {iv.startClipped ? "before " : ""}
                    {fmtDate(iv.startMs, zone)} → {iv.endClipped ? "beyond " : ""}
                    {fmtDate(iv.endMs, zone)}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

function SpellFold({ spell, nowMs, zone }: { spell: SaturnSpell; nowMs: number; zone: string }) {
  const seen = new Set<SaturnPhase>();
  return (
    <div className="fold" id="gochar-spell-panel" role="tabpanel" aria-label={`${SPELL_LABEL[spell.kind]} phases`}>
      <div className="fold-in">
        <ul>
          {spell.intervals.map((iv) => {
            const again = seen.has(iv.phase);
            seen.add(iv.phase);
            const on = nowMs >= iv.startMs && nowMs < iv.endMs;
            const house = PHASE_HOUSE[iv.phase];
            return (
              <li key={iv.startMs} className={`gochar-fold__li${on ? " is-now" : ""}`}>
                <span className="n">
                  <i className={`sw${spell.kind === "sade-sati" ? "" : " sw--line"} is-${iv.phase}`} aria-hidden="true" />
                  {PHASE_LABEL[iv.phase]}
                  {again ? " again" : ""} · {SIGN_NAMES[iv.sign]}{" "}
                  <span lang="hi" className="dev">
                    {SIGN_DEV[iv.sign]}
                  </span>{" "}
                  <span className="gochar-fold__h">({ORDINAL(house)} from the Moon)</span>
                  {on ? " · now" : ""}
                </span>
                <span className="mono">
                  {iv.startClipped ? "before " : ""}
                  {fmtDate(iv.startMs, zone)} → {iv.endClipped ? "beyond " : ""}
                  {fmtDate(iv.endMs, zone)}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
