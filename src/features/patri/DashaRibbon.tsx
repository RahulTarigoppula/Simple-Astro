// Life chapters (Viṃśottarī daśā) in plain words: the chapter running now with how far along it
// is, then all nine as a list. A chapter opens to its shorter stretches (antardaśā), and a stretch
// to its sub-stretches (pratyantardaśā, generated lazily, never eagerly).
import { useMemo, useState } from "react";
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { CountUp } from "../../components/ui/Motion";
import { Section } from "../../components/ui/Page";
import { GRAHA_ENGLISH, GRAHA_NAMES } from "../../data/tables/names";
import { CHAPTER_PLAIN, CHAPTER_SHORT } from "../../data/traits";
import { currentDasha, intervalYears, pratyantars } from "../../engine/dasha";
import { safeZone } from "../../engine/time";
import type { DashaNode } from "../../engine/types";
import { LifeArc } from "./LifeArc";

const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function parts(ms: number, zone: string) {
  const ps = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(zone),
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(ms);
  const get = (t: string) => Number(ps.find((p) => p.type === t)?.value ?? 0);
  return { d: get("day"), m: get("month"), y: get("year") };
}
function fmtDate(ms: number, zone: string): string {
  const p = parts(ms, zone);
  return `${p.d} ${MON[p.m - 1] ?? ""} ${p.y}`;
}
function fmtMonth(ms: number, zone: string): string {
  const p = parts(ms, zone);
  return `${MON[p.m - 1] ?? ""} ${p.y}`;
}
const yearOf = (ms: number, zone: string) => parts(ms, zone).y;
const cap = (s: string) => (s ? s[0]?.toUpperCase() + s.slice(1) : s);
const share = (n: DashaNode, nowMs: number) => Math.min(100, Math.max(0, ((nowMs - n.startMs) / (n.endMs - n.startMs)) * 100));

interface DashaRibbonProps {
  tree: DashaNode[];
  nowMs: number;
  zone: string;
  yearDays: 365.25 | 360;
  /** The picture band above already names the running chapter: start at what is inside it. */
  onBand?: boolean;
}

/** The Life chapters picture band: the life arc with the running chapter named inside it. */
export function ChapterHero({ tree, nowMs, zone, birthMs }: { tree: DashaNode[]; nowMs: number; zone: string; birthMs: number }) {
  const cur = useMemo(() => currentDasha(tree, nowMs), [tree, nowMs]);
  const last = tree[tree.length - 1];
  const age = Math.floor((nowMs - birthMs) / (365.25 * 86_400_000));
  const done = cur ? Math.round(share(cur.md, nowMs)) : 0;
  return (
    <>
      <div className="pt-band__pic pt-band__pic--bleed pt-arc">
        <LifeArc
          tree={tree}
          birthMs={birthMs}
          nowMs={nowMs}
          fromLabel={`Born ${yearOf(birthMs, zone)}`}
          toLabel={last ? String(yearOf(last.endMs, zone)) : ""}
          label={
            cur
              ? `Your life as an arc of nine chapters, from ${yearOf(birthMs, zone)} to ${last ? yearOf(last.endMs, zone) : ""}. You are in the ${GRAHA_ENGLISH[cur.md.lord]} chapter, ${done} percent through it, at age ${age}.`
              : "Your life as an arc of nine chapters."
          }
        />
        {cur ? (
          <div className="pt-arc__center">
            <p className="pt-band__eyebrow">Your chapter</p>
            <h2 id="dasha-now-h" className="pt-arc__h">
              <span className="vh">The</span> {GRAHA_ENGLISH[cur.md.lord]} <span className="vh">chapter</span>
            </h2>
            <p className="pt-arc__when">
              {yearOf(cur.md.startMs, zone)} to {yearOf(cur.md.endMs, zone)} ·{" "}
              <b>
                <CountUp value={done} />%
              </b>{" "}
              through
            </p>
          </div>
        ) : null}
      </div>
      <div className="pt-band__say">
        {cur ? (
          <p className="pt-band__line">{cap(CHAPTER_PLAIN[cur.md.lord])}</p>
        ) : (
          <p className="pt-band__line">Today falls outside the 120 years of chapters counted from this birth.</p>
        )}
      </div>
    </>
  );
}

export function DashaRibbon({ tree, nowMs, zone, yearDays, onBand }: DashaRibbonProps) {
  const nowIdx = tree.findIndex((d) => nowMs >= d.startMs && nowMs < d.endMs);
  const cur = useMemo(() => currentDasha(tree, nowMs), [tree, nowMs]);
  const next = nowIdx >= 0 ? tree[nowIdx + 1] : undefined;
  const [open, setOpen] = useState<number | null>(null);
  const [openAd, setOpenAd] = useState<number | null>(null);
  const md = open == null ? undefined : tree[open];
  const pds = useMemo(() => {
    if (!md || openAd == null) return null;
    const ad = md.children?.[openAd];
    return ad ? pratyantars(md, ad, yearDays) : null;
  }, [md, openAd, yearDays]);

  return (
    <>
      {onBand ? (
        cur ? (
          <section className="v-card dasha-now dasha-now--rows" aria-label="Inside this chapter, and the next one">
            <dl className="dasha-now__dl">
              <div>
                <dt>Inside it now</dt>
                <dd>
                  A shorter <b>{GRAHA_ENGLISH[cur.ad.lord]}</b> stretch until {fmtMonth(cur.ad.endMs, zone)}, bringing{" "}
                  {CHAPTER_SHORT[cur.ad.lord]} to the front.
                </dd>
              </div>
              {next ? (
                <div>
                  <dt>Next chapter</dt>
                  <dd>
                    <b>{GRAHA_ENGLISH[next.lord]}</b> from {fmtMonth(next.startMs, zone)}: {CHAPTER_SHORT[next.lord]}.
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>
        ) : null
      ) : cur ? (
        <section className="v-card v-card--hero dasha-now" aria-labelledby="dasha-now-h">
          <p className="v-eyebrow">Your chapter now</p>
          <h2 id="dasha-now-h" className="dasha-now__h">
            The {GRAHA_ENGLISH[cur.md.lord]} chapter
          </h2>
          <p className="dasha-now__line">{cap(CHAPTER_PLAIN[cur.md.lord])}</p>
          <div>
            <span className="v-meter" role="img" aria-label={`${Math.round(share(cur.md, nowMs))} percent of this chapter has passed`}>
              <span style={{ width: `${Math.max(3, share(cur.md, nowMs))}%` }} />
            </span>
            <p className="dasha-now__ends">
              <span>{fmtMonth(cur.md.startMs, zone)}</span>
              <span>
                {Math.round(share(cur.md, nowMs))}% through · {Math.round(intervalYears(cur.md, yearDays))} years
              </span>
              <span>{fmtMonth(cur.md.endMs, zone)}</span>
            </p>
          </div>
          <dl className="dasha-now__dl">
            <div>
              <dt>Inside it now</dt>
              <dd>
                A shorter <b>{GRAHA_ENGLISH[cur.ad.lord]}</b> stretch until {fmtMonth(cur.ad.endMs, zone)}, bringing{" "}
                {CHAPTER_SHORT[cur.ad.lord]} to the front.
              </dd>
            </div>
            {next ? (
              <div>
                <dt>Next chapter</dt>
                <dd>
                  <b>{GRAHA_ENGLISH[next.lord]}</b> from {fmtMonth(next.startMs, zone)}: {CHAPTER_SHORT[next.lord]}.
                </dd>
              </div>
            ) : null}
          </dl>
        </section>
      ) : (
        <p className="v-note">Today falls outside the 120 years of chapters counted from this birth.</p>
      )}

      <Section
        title="All nine chapters"
        note={
          <>
            Tradition divides 120 years between the nine planets, starting from the Moon's birth star. Sanskrit: Viṃśottarī daśā{" "}
            <InfoDot id="dasha" label="daśā" />
          </>
        }
      />
      <ol className="dasha-list">
        {tree.map((d, i) => {
          const isNow = i === nowIdx;
          const past = d.endMs <= nowMs;
          const isOpen = i === open;
          return (
            <li key={d.startMs} className={`dasha${isNow ? " is-now" : ""}${past ? " is-past" : ""}`}>
              <button
                type="button"
                className="dasha__head"
                aria-expanded={isOpen}
                aria-label={`${GRAHA_ENGLISH[d.lord]} chapter (${GRAHA_NAMES[d.lord]} mahādaśā), ${yearOf(d.startMs, zone)} to ${yearOf(d.endMs, zone)}${isNow ? ", running now" : ""}`}
                onClick={() => {
                  setOpen(isOpen ? null : i);
                  setOpenAd(null);
                }}
              >
                <GrahaGlyph id={d.lord} size={36} />
                <span className="dasha__body">
                  <span className="dasha__t">
                    {GRAHA_ENGLISH[d.lord]} <span className="dasha__sk">{GRAHA_NAMES[d.lord]}</span>
                    {isNow ? <span className="v-chip v-chip--gold">Now</span> : null}
                  </span>
                  <span className="dasha__s">{cap(CHAPTER_SHORT[d.lord])}</span>
                </span>
                <span className="dasha__end">
                  <span className="dasha__y">
                    {yearOf(d.startMs, zone)}–{yearOf(d.endMs, zone)}
                  </span>
                  <span className="dasha__n">{intervalYears(d, yearDays).toFixed(1)} yr</span>
                </span>
              </button>
              {isOpen ? (
                <div className="dasha__fold">
                  <p className="dasha__fold-k">
                    Shorter stretches inside the {GRAHA_ENGLISH[d.lord]} chapter <span className="dasha__sk">antardaśā</span>
                  </p>
                  <ul aria-label={`Stretches (antardaśās) of the ${GRAHA_ENGLISH[d.lord]} chapter`}>
                    {(d.children ?? []).map((a, j) => {
                      const on = nowMs >= a.startMs && nowMs < a.endMs;
                      return (
                        <li key={a.startMs} className={on ? "is-now" : undefined}>
                          <button type="button" aria-expanded={openAd === j} onClick={() => setOpenAd(openAd === j ? null : j)}>
                            <span className="n">
                              {GRAHA_ENGLISH[a.lord]}{" "}
                              <span className="dasha__sk">
                                {GRAHA_NAMES[d.lord]} / {GRAHA_NAMES[a.lord]}
                              </span>
                              {on ? " · now" : ""}
                            </span>
                            <span className="when">
                              {fmtDate(a.startMs, zone)} → {fmtDate(a.endMs, zone)}
                            </span>
                          </button>
                          {openAd === j && pds ? (
                            <ul className="pd-list" aria-label="Sub-stretches (pratyantardaśās)">
                              {pds.map((p) => {
                                const pnow = nowMs >= p.startMs && nowMs < p.endMs;
                                return (
                                  <li key={p.startMs} className={pnow ? "is-now" : undefined}>
                                    <span className="n">
                                      {GRAHA_ENGLISH[p.lord]} <span className="dasha__sk">{GRAHA_NAMES[p.lord]}</span>
                                      {pnow ? " · now" : ""}
                                    </span>
                                    <span className="when">
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
              ) : null}
            </li>
          );
        })}
      </ol>
    </>
  );
}
