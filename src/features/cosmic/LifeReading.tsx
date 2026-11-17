// "In simple words": the first thing on a person's chart. One short answer (the Moon sign's three
// words, set large, then who you are at heart), the three key signs in one card, plus and minus points
// with love and work in another, then the doors onward (the first is the life chapter running now).
// The same birth in other traditions folds away. Plain sentences from src/data/traits.ts.
import { useMemo } from "react";
import { Reveal } from "../../components/ui/Motion";
import { Row, Section } from "../../components/ui/Page";
import { GRAHA_LORE, RASHI_LORE } from "../../data/lore";
import { nakName, rashiBoth, rashiName } from "../../data/regional";
import { MOON_TRAITS, NAK_TRAITS, NUMBER_TRAITS } from "../../data/traits";
import { currentDasha } from "../../engine/dasha";
import { birthNumbers } from "../../engine/profile";
import { safeZone } from "../../engine/time";
import type { GrahaId, Patri, Profile } from "../../engine/types";
import { IconChart, IconForecast, IconMilan, IconPalm, IconSky } from "../chowki/icons";
import { SkyPiece } from "../patri/SkyPiece";
import { CosmicProfile, KeyFacts, KeyTiles, KeyWarnings } from "./CosmicProfile";
import "./cosmic.css";

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
const cap = (t: string) => (t ? (t[0] ?? "").toUpperCase() + t.slice(1) : t);
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
  /** The picture band above already gives the three words and the three key signs. */
  onBand?: boolean;
}

/** The About you picture band: the person's own piece of sky, the three words, the three key signs. */
export function LifeHero({ profile, patri }: { profile: Profile; patri: Patri }) {
  const mo = patri.grahas.MO;
  const first = profile.name.split(/\s+/)[0] ?? profile.name;
  const word = cap(RASHI_LORE[mo.sign]?.nature ?? "");
  const star = nakName(mo.nakshatra, profile.tradition);
  const sign = rashiName(mo.sign, profile.tradition);
  const lit = Math.round(patri.birthPanchang.moonIllumination * 100);
  return (
    <>
      <div className="pt-band__pic pt-band__pic--bleed">
        <SkyPiece
          patri={patri}
          tradition={profile.tradition}
          label={`The real stars behind the Moon when ${first} was born: the Moon, ${lit} percent lit, among the stars of ${star} in ${sign}.`}
        />
      </div>
      <div className="pt-band__say">
        <h2 id="life-h" className="pt-band__h">
          <span className="pt-band__eyebrow">{first}, this is you</span> <span className="pt-band__word">{word}</span>
        </h2>
        <p className="pt-band__cap">
          Your own piece of sky: the real stars behind the Moon when you were born, in {star}, part of {sign}.
        </p>
        <KeyTiles profile={profile} patri={patri} />
      </div>
    </>
  );
}

export function LifeReading({ profile, patri, nowMs, onChapters, onBand }: LifeReadingProps) {
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
      word: cap(RASHI_LORE[mo.sign]?.nature ?? ""),
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

  const curLord = r.cur ? lore(r.cur.md.lord)?.english : undefined;
  const chapterSub = r.cur
    ? `Until ${monthYear(r.cur.md.endMs, r.zone)}. Inside it, a shorter ${lore(r.cur.ad.lord)?.english} stretch runs until ${monthYear(r.cur.ad.endMs, r.zone)}.`
    : "";

  return (
    <div className="life">
      <Reveal i={0}>
        <section
          className={`v-card life__hero${onBand ? "" : " v-card--hero"}`}
          {...(onBand ? { "aria-label": "Who you are at heart" } : { "aria-labelledby": "life-h" })}
        >
          {onBand ? null : (
            <h2 id="life-h" className="life__h">
              <span className="v-eyebrow">{r.first}, this is you</span>
              <span className="life__word">{r.word}</span>
            </h2>
          )}
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
      </Reveal>

      {onBand ? <KeyWarnings profile={profile} patri={patri} /> : <KeyFacts profile={profile} patri={patri} />}

      <Reveal i={1}>
        <div className="v-card life__traits">
          <div className="life__pm">
            <section aria-labelledby="life-plus-h">
              <h3 id="life-plus-h" className="life__k life__k--plus">
                Plus points
              </h3>
              <ul>
                {r.plus.map((x) => (
                  <li key={x}>{x}</li>
                ))}
              </ul>
            </section>
            <section aria-labelledby="life-minus-h">
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
        </div>
      </Reveal>

      <Reveal i={2}>
        <Section title="Go further" />
        <ul className="v-list">
          {r.cur ? (
            <li>
              {onChapters ? (
                <Row onClick={onChapters} icon={<IconChart />} title={`Your ${curLord} chapter`} sub={chapterSub} />
              ) : (
                <Row icon={<IconChart />} title={`Your ${curLord} chapter`} sub={chapterSub} />
              )}
            </li>
          ) : null}
          <li>
            <Row to={`/forecast/${profile.id}`} icon={<IconForecast />} title="Forecast" sub="Your day, week, month and year ahead" />
          </li>
          <li>
            <Row to={`/hast/${profile.id}`} icon={<IconPalm />} title="Palm reading" sub="From a photo of your hand" />
          </li>
          <li>
            <Row to={`/patri/${profile.id}/sky`} icon={<IconSky />} title="Sky at birth" sub="The real stars at the moment of birth" />
          </li>
          <li>
            <Row to="/milan" icon={<IconMilan />} title="Partner match" sub="How two people fit, with a score" />
          </li>
          <li>
            <Row
              to={`/report/${profile.id}`}
              icon={<IconChart />}
              title="Birth report"
              sub="The whole chart as a document to print or save as PDF"
            />
          </li>
          <li>
            <Row to={`/year/${profile.id}`} icon={<IconForecast />} title="Your year ahead" sub="The next twelve months as a short story" />
          </li>
        </ul>
      </Reveal>

      <Reveal i={3}>
        <details className="v-fold life__more">
          <summary>
            <span>
              Your birth in other traditions
              <span className="v-fold__s">Your name sound, Western Sun sign, Chinese year and numbers</span>
            </span>
          </summary>
          <div className="v-fold__body">
            <p className="life__p">
              Born on the {ordinal(r.d)}: number {r.n.root}, {r.root?.word}. {r.root?.plain} Your whole birth date adds up to {r.n.destiny},{" "}
              {r.dest?.word}: what your life tends to grow towards.
            </p>
            <CosmicProfile profile={profile} patri={patri} />
          </div>
        </details>
      </Reveal>

      <p className="v-foot">This is what the tradition says, in simple words. It isn't a fact about you. Your choices write the rest.</p>
    </div>
  );
}
