// The Viṃśottarī ribbon: nine mahādaśās as brass-clipped folds; pull a fold for its antardaśās,
// and an antardaśā for its pratyantardaśās (generated lazily, never eagerly).
import { useMemo, useState } from "react";
import { GRAHA_DEV, GRAHA_NAMES } from "../../data/tables/names";
import { intervalYears, pratyantars } from "../../engine/dasha";
import type { DashaNode } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function fmtDate(ms: number, zone: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric", month: "numeric", day: "numeric" }).formatToParts(ms);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? 0);
  return `${get("day")} ${MON[get("month") - 1] ?? ""} ${get("year")}`;
}
const yearOf = (ms: number, zone: string) => new Intl.DateTimeFormat("en-GB", { timeZone: zone, year: "numeric" }).format(ms);

interface DashaRibbonProps {
  tree: DashaNode[];
  nowMs: number;
  zone: string;
  yearDays: 365.25 | 360;
}

export function DashaRibbon({ tree, nowMs, zone, yearDays }: DashaRibbonProps) {
  const nowIdx = tree.findIndex((d) => nowMs >= d.startMs && nowMs < d.endMs);
  const [open, setOpen] = useState(nowIdx >= 0 ? nowIdx : 0);
  const [openAd, setOpenAd] = useState<number | null>(null);
  const md = tree[open];
  const pds = useMemo(() => {
    if (!md || openAd == null) return null;
    const ad = md.children?.[openAd];
    return ad ? pratyantars(md, ad, yearDays) : null;
  }, [md, openAd, yearDays]);

  return (
    <>
      <div className="ribbon" role="tablist" aria-label="Mahādaśās">
        {tree.map((d, i) => {
          const isNow = i === nowIdx;
          return (
            <button
              key={d.startMs}
              type="button"
              role="tab"
              aria-selected={i === open}
              aria-expanded={i === open}
              className={isNow ? "is-now" : undefined}
              aria-label={`${GRAHA_NAMES[d.lord]} mahādaśā, ${yearOf(d.startMs, zone)} to ${yearOf(d.endMs, zone)}${isNow ? ", running now" : ""}`}
              onClick={() => {
                setOpen(i);
                setOpenAd(null);
                play("tick");
                haptics.selection();
              }}
            >
              <span className="l">
                <span lang="hi" className="dev" style={{ fontSize: "0.85em" }}>
                  {GRAHA_DEV[d.lord]}
                </span>
              </span>
              <span className="l" style={{ fontSize: "var(--text-sm)" }}>
                {GRAHA_NAMES[d.lord]}
              </span>
              <span className="y">
                {yearOf(d.startMs, zone)}-{yearOf(d.endMs, zone)}
              </span>
              <span className="y">{intervalYears(d, yearDays).toFixed(1)} yr</span>
            </button>
          );
        })}
      </div>
      {md ? (
        <div className="fold">
          <div className="fold-in">
            <ul aria-label={`Antardaśās of ${GRAHA_NAMES[md.lord]}`}>
              {(md.children ?? []).map((a, i) => {
                const on = nowMs >= a.startMs && nowMs < a.endMs;
                return (
                  <li key={a.startMs} className={on ? "is-now" : undefined}>
                    <button
                      type="button"
                      aria-expanded={openAd === i}
                      onClick={() => {
                        setOpenAd(openAd === i ? null : i);
                        play("tick", 0.7);
                      }}
                    >
                      <span className="n">
                        {GRAHA_NAMES[md.lord]} / {GRAHA_NAMES[a.lord]}
                        {on ? " · now" : ""}
                      </span>
                      <span className="mono">
                        {fmtDate(a.startMs, zone)} → {fmtDate(a.endMs, zone)}
                      </span>
                    </button>
                    {openAd === i && pds ? (
                      <ul className="pd-list" aria-label="Pratyantardaśās">
                        {pds.map((p) => {
                          const pnow = nowMs >= p.startMs && nowMs < p.endMs;
                          return (
                            <li key={p.startMs} className={pnow ? "is-now" : undefined}>
                              <span className="n">
                                {GRAHA_NAMES[p.lord]}
                                {pnow ? " · now" : ""}
                              </span>
                              <span className="mono">
                                {fmtDate(p.startMs, zone)} → {fmtDate(p.endMs, zone)}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}
    </>
  );
}
