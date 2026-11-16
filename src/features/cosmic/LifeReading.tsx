// "In simple words": the first thing on a person's chart. One short answer (who you are at heart),
// the three key signs as cards, plus and minus points, love and work, the life chapter running now,
// then the doors onward. Plain sentences from src/data/traits.ts; the chart itself is another view.
import { useMemo } from "react";
import { Link } from "react-router";
import { ChevronRight, Row, Section } from "../../components/ui/Page";
import { GRAHA_LORE, RASHI_LORE } from "../../data/lore";
import { rashiBoth } from "../../data/regional";
import { CHAPTER_PLAIN, CHAPTER_SHORT, MOON_TRAITS, NAK_TRAITS, NUMBER_TRAITS } from "../../data/traits";
import { currentDasha } from "../../engine/dasha";
import { birthNumbers } from "../../engine/profile";
import type { GrahaId, Patri, Profile } from "../../engine/types";
import { IconForecast, IconMilan, IconPalm, IconSky } from "../chowki/icons";
import { CosmicProfile, KeyFacts } from "./CosmicProfile";
import "./cosmic.css";
import { safeZone } from "../../engine/time";

const DAYS: Array<[string, GrahaId]> = [
  ["Sunday", "SU"],
  ["Monday", "MO"],
  ["Tuesday", "MA"],
  ["Wednesday", "ME"],
  ["Thursday", "JU"],
  ["Friday", "VE"],
  ["Saturday", "SA"],
];

const lore = (g: GrahaId) => GRAHA_LORE.find((x) => x.id === g);
const dayOf = (g: GrahaId) => {
  const e = lore(g)?.english ?? "";
  return g === "SU" || g === "MO" ? `the ${e}'s day` : `${e}'s day`;
};
const ordinal = (n: number) => {
  const s = n % 100 >= 11 && n % 100 <= 13 ? "th" : (({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th");
  return `${n}${s}`;
};
const monthYear = (ms: number, zone: string) =>
  new Date(ms).toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: safeZone(zone) });

/** Pairs that must not appear on both sides of one card. */
const OPPOSITES: ReadonlyArray<readonly [string, string]> = [
  ["patient", "impatient"],
  ["calm", "restless"],
  ["steady", "changeable"],
  ["cautious", "impulsive"],
  ["careful", "careless"],
  ["generous", "stingy"],
  ["bold", "timid"],
  ["sociable", "withdrawn"],
  ["decisive", "indecisive"],
  ["practical", "dreamy"],
];
const stem = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z]/g, " ")
    .trim();
/** Drop any minus point whose opposite already sits among the plus points (and the reverse). */
export function reconcile(plus: string[], minus: string[]): { plus: string[]; minus: string[] } {
  const clash = (a: string, b: string) =>
    OPPOSITES.some(([x, y]) => (stem(a).includes(x) && stem(b).includes(y)) || (stem(a).includes(y) && stem(b).includes(x)));
  const keepPlus = plus.filter((p, i) => !plus.slice(0, i).some((q) => clash(p, q)));
  const keepMinus = minus.filter((m) => !keepPlus.some((p) => clash(p, m)));
  return { plus: keepPlus, minus: keepMinus };
}

function uniq(xs: string[], n: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of xs) {
    const k = x.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(x);
    if (out.length === n) break;
  }
  return out;
}

interface LifeReadingProps {
  profile: Profile;
  patri: Patri;
  nowMs: number;
  /** Opens the Life chapters view; without it the chapter card only links to the forecast. */
  onChapters?: () => void;
}

export function LifeReading({ profile, patri, nowMs, onChapters }: LifeReadingProps) {
  const r = useMemo(() => {
    const b = profile.birth;
    const mo = patri.grahas.MO;
    const moon = MOON_TRAITS[mo.sign];
    const nak = NAK_TRAITS[mo.nakshatra];
    const n = birthNumbers(b.localY, b.localMo, b.localD);
    const root = NUMBER_TRAITS[n.root];
    const dest = NUMBER_TRAITS[n.destiny];
    const day = DAYS[patri.birthPanchang.vara.index];
    const waxing = patri.birthPanchang.tithi.paksha === "shukla";
    const lg = profile.timeUnknown ? undefined : RASHI_LORE[patri.lagna.sign];
    const cur = currentDasha(patri.dasha, nowMs);
    return {
      first: profile.name.split(/\s+/)[0] ?? profile.name,
      moonSign: rashiBoth(mo.sign, profile.tradition),
      moon,
      nak,
      n,
      root,
      dest,
      day,
      waxing,
      lg,
      lgSame: patri.lagna.sign === mo.sign,
      lgName: rashiBoth(patri.lagna.sign, profile.tradition),
      d: b.localD,
      cur,
      zone: b.zone,
      ...(() => {
        const r = reconcile(
          uniq([...(moon?.plus ?? []), ...(nak?.plus ?? []), ...(root?.plus ?? [])], 8),
          uniq([...(moon?.minus ?? []), ...(nak?.minus ?? []), ...(root?.minus ?? [])], 6),
        );
        return { plus: r.plus.slice(0, 6), minus: r.minus.slice(0, 4) };
      })(),
    };
  }, [profile, patri, nowMs]);

  return (
    <div className="life">
      <section className="v-card v-card--hero life__hero" aria-labelledby="life-h">
        <p className="v-eyebrow">In simple words</p>
        <h2 id="life-h" className="life__h">
          {r.first}, this is you
        </h2>
        <p className="life__lead">
          {r.moon?.plain}
          {r.lg
            ? r.lgSame
              ? ` Your rising sign is also ${r.moonSign}, so the person others meet is the person you are inside.`
              : ` Your rising sign is ${r.lgName}: people first see you as ${r.lg.nature}.`
            : ""}
        </p>
        <p className="life__born">
          You were born on a {r.day?.[0]}, {dayOf(r.day?.[1] ?? "SU")}, under a {r.waxing ? "growing" : "fading"} Moon. {r.nak?.plain}
        </p>
      </section>

      <KeyFacts profile={profile} patri={patri} />

      <div className="v-grid2 life__pm">
        <section className="v-card" aria-labelledby="life-plus-h">
          <h3 id="life-plus-h" className="life__k life__k--plus">
            Plus points
          </h3>
          <ul>
            {r.plus.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
        <section className="v-card" aria-labelledby="life-minus-h">
          <h3 id="life-minus-h" className="life__k life__k--minus">
            Watch out for
          </h3>
          <ul>
            {r.minus.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </section>
      </div>

      <div className="v-cols">
        <section className="v-card" aria-label="In love and at work">
          <dl className="life__dl">
            <div>
              <dt>In love</dt>
              <dd>{r.moon?.love}</dd>
            </div>
            <div>
              <dt>At work</dt>
              <dd>{r.moon?.work}</dd>
            </div>
          </dl>
        </section>
        {r.cur ? (
          <section className="v-card life__now" aria-labelledby="life-now-h">
            <p className="life__k">Right now</p>
            <h3 id="life-now-h" className="v-card__title">
              Your {lore(r.cur.md.lord)?.english} chapter
            </h3>
            <p className="life__p">
              You are in your <b>{lore(r.cur.md.lord)?.english}</b> chapter until {monthYear(r.cur.md.endMs, r.zone)}:{" "}
              {CHAPTER_PLAIN[r.cur.md.lord]} Inside it, a shorter <b>{lore(r.cur.ad.lord)?.english}</b> stretch runs until{" "}
              {monthYear(r.cur.ad.endMs, r.zone)}, bringing {CHAPTER_SHORT[r.cur.ad.lord]} to the front.
            </p>
            <div className="v-actions">
              {onChapters ? (
                <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={onChapters}>
                  All life chapters
                </button>
              ) : null}
              <Link to={`/forecast/${profile.id}`} className="v-link life__fc">
                See your forecast <ChevronRight size={16} />
              </Link>
            </div>
          </section>
        ) : null}
      </div>

      <Section title="Go further" />
      <ul className="v-list">
        <li>
          <Row
            to={`/forecast/${profile.id}`}
            icon={<IconForecast />}
            tone="cyan"
            title="Forecast"
            sub="Your day, week, month and year ahead"
          />
        </li>
        <li>
          <Row to={`/hast/${profile.id}`} icon={<IconPalm />} tone="green" title="Palm reading" sub="From a photo of your hand" />
        </li>
        <li>
          <Row to={`/patri/${profile.id}/sky`} icon={<IconSky />} title="Sky at birth" sub="The real stars at the moment of birth" />
        </li>
        <li>
          <Row to="/milan" icon={<IconMilan />} tone="rose" title="Partner match" sub="How two people fit, with a score" />
        </li>
      </ul>

      <Section title="Your birth in other traditions" />
      <div className="v-cols">
        <section className="v-card" aria-labelledby="life-num-h">
          <p className="life__k">Your numbers</p>
          <h3 id="life-num-h" className="v-card__title">
            {r.n.root} · {r.n.destiny}
          </h3>
          <p className="life__p">
            Born on the {ordinal(r.d)}: number {r.n.root}, {r.root?.word}. {r.root?.plain} Your whole birth date adds up to {r.n.destiny},{" "}
            {r.dest?.word}: what your life tends to grow towards.
          </p>
        </section>
        <CosmicProfile profile={profile} patri={patri} />
      </div>

      <p className="v-foot">This is what the tradition says, in simple words. It isn't a fact about you. Your choices write the rest.</p>
    </div>
  );
}
