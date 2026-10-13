// The month leaf: a Gregorian grid (Sunday first, the place's calendar) where each date carries its
// sunrise tithi, a small Moon, and marks for Ekādaśī, Pūrṇimā, Amāvasyā and saṅkrānti. A grid in
// the ARIA sense: one tab stop, arrows move a day or a week, PageUp/PageDown turn the month.
import { useEffect, useMemo, useRef, useState } from "react";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { NAKSHATRA_DEV, NAKSHATRA_NAMES, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { type CalendarPlace, monthCalendar } from "../../engine/calendar";
import { tithiOf } from "../../engine/panchang";
import { daysInMonth } from "../../engine/time";
import type { CalendarDay, EnginePreset, MonthCalendar } from "../../engine/types";
import { litPath } from "./MoonPager";
import type { ZoneClock } from "./zone";

export interface Ymd {
  y: number;
  m: number; // 1..12
  d: number;
}

const DIGITS = "०१२३४५६७८९";
export const devDigits = (n: number): string =>
  String(n)
    .split("")
    .map((c) => DIGITS[Number(c)] ?? c)
    .join("");

/** "शु ५", "कृ ११", "पू", "अ" — the tithi at sunrise, short. */
/** "5↑", "11↓", "Full", "New": the tithi at sunrise, in plain words. */
export function tithiPlain(index: number): string {
  if (index === 15) return "Full";
  if (index === 30) return "New";
  return `${((index - 1) % 15) + 1}${index < 15 ? "↑" : "↓"}`;
}

export function tithiShort(index: number): string {
  if (index === 15) return "पू";
  if (index === 30) return "अ";
  return `${index < 15 ? "शु" : "कृ"} ${devDigits(((index - 1) % 15) + 1)}`;
}

const WEEK = [
  ["Su", "Sunday"],
  ["Mo", "Monday"],
  ["Tu", "Tuesday"],
  ["We", "Wednesday"],
  ["Th", "Thursday"],
  ["Fr", "Friday"],
  ["Sa", "Saturday"],
] as const;

const monthTitle = (y: number, m: number): string =>
  new Intl.DateTimeFormat("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }).format(Date.UTC(y, m - 1, 1));
const dateLong = (y: number, m: number, d: number): string =>
  new Intl.DateTimeFormat("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    Date.UTC(y, m - 1, d),
  );

export function shiftMonth(y: number, m: number, delta: number): { y: number; m: number } {
  const i = y * 12 + (m - 1) + delta;
  return { y: Math.floor(i / 12), m: (((i % 12) + 12) % 12) + 1 };
}

function MoonGlyph({ k, waxing, south }: { k: number; waxing: boolean; south: boolean }) {
  const d = litPath(k, waxing, south);
  return (
    <svg className="mglyph" viewBox="0 0 100 100" aria-hidden="true" data-decorative="true">
      <circle className="mglyph__dark" cx="50" cy="50" r="46" />
      {d ? <path className="mglyph__lit" d={d} /> : null}
      <circle className="mglyph__rim" cx="50" cy="50" r="46" />
    </svg>
  );
}

const MARK_TEXT = { ekadashi: "Ekādaśī", purnima: "Pūrṇimā", amavasya: "Amāvasyā", sankranti: "Saṅkrānti" } as const;

function dayLabel(c: MonthCalendar, d: CalendarDay, clock: ZoneClock): string {
  const parts = [dateLong(c.year, c.month, d.day), `${d.tithi.name} at sunrise ${clock.hm(d.sunriseMs)}`];
  if (d.kshaya) parts.push(`then ${d.kshaya.map((t) => tithiOf((t - 0.5) * 12).name).join(", ")}`);
  parts.push(`Moon in ${NAKSHATRA_NAMES[d.nakshatra] ?? ""}`);
  for (const m of d.marks) if (m !== "sankranti") parts.push(MARK_TEXT[m]);
  if (d.sankranti) parts.push(`the Sun enters ${SIGN_NAMES[d.sankranti.sign]} at ${clock.hm(d.sankranti.ms)}`);
  return parts.join("; ");
}

interface MonthGridProps {
  place: CalendarPlace;
  preset: EnginePreset;
  clock: ZoneClock;
  ym: { y: number; m: number };
  onMonth: (ym: { y: number; m: number }) => void;
  today: Ymd;
  selected: Ymd | null;
  south: boolean;
  onPick: (d: Ymd) => void;
  /** Present on the narrow layout, where the ledger is in another tab. */
  onOpenLeaf?: () => void;
}

export function MonthGrid({ place, preset, clock, ym, onMonth, today, selected, south, onPick, onOpenLeaf }: MonthGridProps) {
  const cal = useMemo<MonthCalendar | null>(() => {
    try {
      return monthCalendar(ym.y, ym.m, place, preset);
    } catch {
      return null;
    }
  }, [ym.y, ym.m, place, preset]);

  const n = daysInMonth(ym.y, ym.m);
  const inMonth = (p: Ymd | null): number | null => (p && p.y === ym.y && p.m === ym.m ? p.d : null);
  const [focusDay, setFocusDay] = useState<number>(() => inMonth(selected) ?? inMonth(today) ?? 1);
  const wantFocus = useRef(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // A new month (from the buttons or a paged leaf) puts the roving tab stop on a sensible date.
  const ymKey = `${ym.y}-${ym.m}`;
  const lastKey = useRef(ymKey);
  useEffect(() => {
    if (lastKey.current === ymKey) return;
    lastKey.current = ymKey;
    if (!wantFocus.current) setFocusDay(inMonth(selected) ?? inMonth(today) ?? 1);
  });

  useEffect(() => {
    if (!wantFocus.current) return;
    const el = tableRef.current?.querySelector<HTMLButtonElement>(`button[data-day="${focusDay}"]`);
    if (el) {
      el.focus();
      wantFocus.current = false;
    }
  });

  const fd = Math.min(focusDay, n);

  const move = (delta: number) => {
    const t = fd + delta;
    wantFocus.current = true;
    if (t < 1) {
      const p = shiftMonth(ym.y, ym.m, -1);
      setFocusDay(daysInMonth(p.y, p.m) + t);
      onMonth(p);
    } else if (t > n) {
      const p = shiftMonth(ym.y, ym.m, 1);
      setFocusDay(t - n);
      onMonth(p);
    } else setFocusDay(t);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const wd = new Date(Date.UTC(ym.y, ym.m - 1, fd)).getUTCDay();
    const keys: Record<string, () => void> = {
      ArrowLeft: () => move(-1),
      ArrowRight: () => move(1),
      ArrowUp: () => move(-7),
      ArrowDown: () => move(7),
      Home: () => move(-wd),
      End: () => move(6 - wd),
      PageUp: () => {
        const p = shiftMonth(ym.y, ym.m, -1);
        wantFocus.current = true;
        setFocusDay(Math.min(fd, daysInMonth(p.y, p.m)));
        onMonth(p);
      },
      PageDown: () => {
        const p = shiftMonth(ym.y, ym.m, 1);
        wantFocus.current = true;
        setFocusDay(Math.min(fd, daysInMonth(p.y, p.m)));
        onMonth(p);
      },
    };
    const f = keys[e.key];
    if (f) {
      e.preventDefault();
      f();
    }
  };

  const weeks: Array<Array<CalendarDay | null>> = [];
  if (cal) {
    const cells: Array<CalendarDay | null> = [...Array.from({ length: cal.leadingBlanks }, () => null), ...cal.days];
    while (cells.length % 7) cells.push(null);
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
  }
  const sel = inMonth(selected);
  const tday = inMonth(today);
  const picked = cal && sel ? cal.days[sel - 1] : undefined;
  const title = monthTitle(ym.y, ym.m);

  return (
    <section className="month" aria-labelledby="month-h">
      <TurmericBand id="month-h" plain level={2} dev="मास" title="Month" meta={clock.zone} />
      <div className="month__nav">
        <button type="button" className="month__step" aria-label="Previous month" onClick={() => onMonth(shiftMonth(ym.y, ym.m, -1))}>
          ‹
        </button>
        <p className="month__title" id="month-title" aria-live="polite">
          {title}
        </p>
        <button type="button" className="month__step" aria-label="Next month" onClick={() => onMonth(shiftMonth(ym.y, ym.m, 1))}>
          ›
        </button>
      </div>
      {cal ? (
        <div ref={tableRef} className="month__grid" role="grid" aria-labelledby="month-title" aria-colcount={7} onKeyDown={onKey}>
          <div className="month__row month__row--head" role="row" tabIndex={-1}>
            {WEEK.map(([s, l], i) => (
              <span key={l} className="month__wd" role="columnheader" tabIndex={-1} aria-colindex={i + 1} aria-label={l}>
                {s}
              </span>
            ))}
          </div>
          {weeks.map((w) => (
            <div key={`w${w.find((c) => c)?.day ?? 0}`} className="month__row" role="row" tabIndex={-1}>
              {w.map((c, i) =>
                c ? (
                  <button
                    key={c.day}
                    type="button"
                    role="gridcell"
                    aria-colindex={i + 1}
                    aria-selected={sel === c.day}
                    data-day={c.day}
                    tabIndex={c.day === fd ? 0 : -1}
                    className={`mcell${c.marks.includes("purnima") ? " mcell--purnima" : ""}${c.marks.includes("amavasya") ? " mcell--amavasya" : ""}`}
                    aria-current={tday === c.day ? "date" : undefined}
                    aria-label={`${dayLabel(cal, c, clock)}${tday === c.day ? "; today" : ""}`}
                    onClick={() => {
                      setFocusDay(c.day);
                      onPick({ y: ym.y, m: ym.m, d: c.day });
                    }}
                    onFocus={() => setFocusDay(c.day)}
                  >
                    <span className="mcell__d mono">{c.day}</span>
                    <MoonGlyph k={c.moonK} waxing={c.elongation < 180} south={south} />
                    <span className="mcell__t">{tithiPlain(c.tithi.index)}</span>
                    <span className="mcell__m">
                      {c.marks.includes("purnima") && c.tithi.index !== 15 ? <i className="mmark">Full</i> : null}
                      {c.marks.includes("amavasya") && c.tithi.index !== 30 ? <i className="mmark">New</i> : null}
                      {c.marks.includes("ekadashi") ? <i className="mmark">Ek</i> : null}
                      {c.marks.includes("sankranti") ? <i className="mmark mmark--sun">☉</i> : null}
                    </span>
                  </button>
                ) : (
                  // biome-ignore lint/suspicious/noArrayIndexKey: a blank cell has no identity but its column
                  <span key={`b${i}`} className="mcell--blank" aria-hidden="true" />
                ),
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="note-haldi" role="status">
          The month could not be read for this place.
        </p>
      )}
      <p className="month__legend">
        <span>Number = lunar day (tithi) at sunrise; ↑ waxing, ↓ waning</span>
        <span>
          <i className="mmark">Ek</i> Ekādaśī (fasting day)
        </span>
        <span>
          <i className="mmark mmark--sun">☉</i> the Sun changes sign
        </span>
      </p>
      {picked && cal ? (
        <div className="month__pick" aria-live="polite">
          <p className="month__pick-h">{dateLong(cal.year, cal.month, picked.day)}</p>
          <p className="month__pick-v">
            {picked.tithi.name} · Moon in {NAKSHATRA_NAMES[picked.nakshatra]}{" "}
            <span lang="hi" className="dev today-dev">
              {NAKSHATRA_DEV[picked.nakshatra]}
            </span>{" "}
            · sunrise <span className="mono today-num">{clock.hm(picked.sunriseMs)}</span>
            {picked.sankranti ? (
              <>
                {" "}
                · the Sun enters {SIGN_NAMES[picked.sankranti.sign]}{" "}
                <span lang="hi" className="dev today-dev">
                  {SIGN_DEV[picked.sankranti.sign]}
                </span>{" "}
                at <span className="mono today-num">{clock.hm(picked.sankranti.ms)}</span>
              </>
            ) : null}
          </p>
          {onOpenLeaf ? (
            <button type="button" className="linkish month__open" onClick={onOpenLeaf}>
              Read this day in full
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
