// "Your life in simple words": the first thing on a person's chart. Who you are at heart (Moon sign),
// your birth star, your numbers, plus and minus points, love and work, and the life chapter you are in
// now. Plain sentences from src/data/traits.ts; the full chart sits behind "Full detail (astro tech)".
import { useMemo } from "react";
import { Link } from "react-router";
import { GRAHA_LORE, NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { nakBoth, rashiBoth } from "../../data/regional";
import { CHAPTER_PLAIN, MOON_TRAITS, NAK_TRAITS, NUMBER_TRAITS } from "../../data/traits";
import { currentDasha } from "../../engine/dasha";
import { birthNumbers } from "../../engine/profile";
import type { GrahaId, Patri, Profile } from "../../engine/types";
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
function reconcile(plus: string[], minus: string[]): { plus: string[]; minus: string[] } {
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

export function LifeReading({ profile, patri, nowMs }: { profile: Profile; patri: Patri; nowMs: number }) {
  const r = useMemo(() => {
    const b = profile.birth;
    const mo = patri.grahas.MO;
    const moon = MOON_TRAITS[mo.sign];
    const nak = NAK_TRAITS[mo.nakshatra];
    const nl = NAKSHATRA_LORE[mo.nakshatra];
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
      moonWest: RASHI_LORE[mo.sign]?.western ?? "",
      star: nakBoth(mo.nakshatra, profile.tradition),
      moon,
      nak,
      nl,
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
    <section className="cosmic-card life" aria-labelledby="life-h">
      <p className="life__kicker">In simple words</p>
      <h2 id="life-h" className="life__h">
        {r.first}, this is you
      </h2>
      <p className="life__lead">
        You were born on a {r.day?.[0]}, {dayOf(r.day?.[1] ?? "SU")}, under a {r.waxing ? "growing" : "fading"} Moon. Your Moon sign is{" "}
        <b>{r.moonSign}</b> ({r.moonWest}) and your birth star is <b>{r.star}</b>. {r.moon?.plain}
        {r.lg
          ? r.lgSame
            ? ` Your rising sign is also ${r.moonSign}, so the person others meet is the person you are inside.`
            : ` Your rising sign is ${r.lgName}: people first see you as ${r.lg.nature}.`
          : ""}
      </p>

      <div className="life__grid">
        <div className="life__card">
          <p className="life__k">Your heart · Moon sign</p>
          <p className="life__v">{r.moonSign}</p>
          <p className="life__p">
            The sign of {RASHI_LORE[patri.grahas.MO.sign]?.symbol}. In three words: {RASHI_LORE[patri.grahas.MO.sign]?.nature}.
          </p>
        </div>
        <div className="life__card">
          <p className="life__k">Your birth star</p>
          <p className="life__v">{r.star}</p>
          <p className="life__p">
            {r.nak?.plain} Its name means “{r.nl?.meaning}”.
          </p>
        </div>
        <div className="life__card">
          <p className="life__k">Your numbers</p>
          <p className="life__v">
            {r.n.root} · {r.n.destiny}
          </p>
          <p className="life__p">
            Born on the {ordinal(r.d)}: number {r.n.root}, {r.root?.word}. {r.root?.plain} Your whole birth date adds up to {r.n.destiny},{" "}
            {r.dest?.word}: what your life tends to grow towards.
          </p>
        </div>
      </div>

      <div className="life__pm">
        <div className="life__plus">
          <p className="life__k">Plus</p>
          <ul>
            {r.plus.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
        <div className="life__minus">
          <p className="life__k">Watch out for</p>
          <ul>
            {r.minus.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
        </div>
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
        {r.cur ? (
          <div>
            <dt>Right now</dt>
            <dd>
              You are in your <b>{lore(r.cur.md.lord)?.english}</b> chapter until {monthYear(r.cur.md.endMs, r.zone)}:{" "}
              {CHAPTER_PLAIN[r.cur.md.lord]} Inside it, a shorter <b>{lore(r.cur.ad.lord)?.english}</b> stretch runs until{" "}
              {monthYear(r.cur.ad.endMs, r.zone)}, adding {lore(r.cur.ad.lord)?.signifies}.{" "}
              <Link to={`/forecast/${profile.id}`}>See your forecast</Link>
            </dd>
          </div>
        ) : null}
      </dl>

      <p className="life__note">
        This is what the tradition says, in simple words. It isn't a fact about you. Your choices write the rest.
      </p>
    </section>
  );
}
