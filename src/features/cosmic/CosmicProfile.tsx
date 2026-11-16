// A person at a glance. `KeyFacts` is the three things everyone asks first (Moon sign, birth star,
// rising sign) as compact cards; `CosmicProfile` is the same birth read by other traditions (Sun
// sign, the Chinese year, numbers). Every card opens its story in Explore.
import { useMemo } from "react";
import { Link } from "react-router";
import { InfoDot } from "../../components/ui/Explain";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { ChevronRight, Row } from "../../components/ui/Page";
import { GRAHA_LORE, NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { nakBoth, nakName, rashiBoth, rashiName } from "../../data/regional";
import { NAK_LORDS, NAKSHATRA_NAMES, SIGN_NAMES } from "../../data/tables/names";
import { birthNumbers, chineseZodiac, NUMBER_GRAHA, tropicalSunSign } from "../../engine/profile";
import type { Patri, Profile } from "../../engine/types";
import "./cosmic.css";

interface Fact {
  key: string;
  /** Plain name, then the Sanskrit term that the ⓘ explains. */
  k: string;
  term: string;
  explain: string;
  v: string;
  s: string;
  to: string;
  glyph: React.ReactNode;
  warn?: string;
}

export function KeyFacts({ profile, patri }: { profile: Profile; patri: Patri }) {
  const facts = useMemo<Fact[]>(() => {
    const L = patri.lagna.sign;
    const mo = patri.grahas.MO;
    const nak = mo.nakshatra;
    const lore = NAKSHATRA_LORE[nak];
    const r = (i: number) => RASHI_LORE[i];
    const regional = profile.tradition && profile.tradition !== "north";
    const sk = (s: number) => (regional && rashiBoth(s, profile.tradition) !== SIGN_NAMES[s] ? `${SIGN_NAMES[s]} in Sanskrit · ` : "");
    const skN = (i: number) =>
      regional && nakBoth(i, profile.tradition) !== NAKSHATRA_NAMES[i] ? `${NAKSHATRA_NAMES[i]} in Sanskrit · ` : "";
    // A Moon close to the edge of its nakṣatra or sign could fall on the other side with a slightly different birth time.
    const SPAN = 360 / 27;
    const inNak = mo.lonSidereal % SPAN;
    const inSign = mo.lonSidereal % 30;
    const near = Math.min(inNak, SPAN - inNak, inSign, 30 - inSign);
    const edge =
      !profile.timeUnknown && near < 0.55
        ? `The Moon was within about an hour of the edge of this ${Math.min(inSign, 30 - inSign) < 0.55 ? "sign" : "nakṣatra"}. If the birth time is off by an hour, it could read differently.`
        : undefined;
    return [
      {
        key: "moon",
        k: "Moon sign",
        term: "Rāśi",
        explain: "rashi",
        v: rashiName(mo.sign, profile.tradition),
        s: `${sk(mo.sign)}${r(mo.sign)?.western}, the sign of ${r(mo.sign)?.symbol}. In three words: ${r(mo.sign)?.nature}.`,
        to: `/explore/rashi/${mo.sign}`,
        glyph: <GrahaGlyph id="MO" size={40} />,
      },
      {
        key: "nak",
        k: "Birth star",
        term: "Nakṣatra",
        explain: "nakshatra",
        v: nakName(nak, profile.tradition),
        s: `${skN(nak)}Its name means “${lore?.meaning}”. Quarter (pada) ${mo.pada} · ${lore?.symbol} · deity ${lore?.deity.split(",")[0]}`,
        ...(edge ? { warn: edge } : {}),
        to: `/explore/nakshatra/${nak}`,
        glyph: <GrahaGlyph id={NAK_LORDS[nak % 9] ?? "KE"} size={40} />,
      },
      {
        key: "lagna",
        k: "Rising sign",
        term: "Lagna",
        explain: "lagna",
        v: rashiName(L, profile.tradition),
        s: `${sk(L)}${r(L)?.western} rising: how you meet the world.`,
        to: `/explore/rashi/${L}`,
        glyph: <span className="cp-sign">{L + 1}</span>,
        ...(profile.timeUnknown ? { warn: "Birth time unknown, so this is uncertain." } : {}),
      },
    ];
  }, [patri, profile]);

  return (
    <ul className="kf" aria-label="Your three key signs">
      {facts.map((f) => (
        <li key={f.key} className="kf__card" data-fact={f.key}>
          <span className="kf__glyph" aria-hidden="true">
            {f.glyph}
          </span>
          <div className="kf__body">
            <p className="kf__k">
              {f.k} <span className="kf__term">{f.term}</span> <InfoDot id={f.explain} label={f.term} />
            </p>
            <Link to={f.to} className="kf__v" aria-label={`${f.k}: ${f.v}. Read its story`}>
              {f.v}
              <ChevronRight size={16} />
            </Link>
            <p className="kf__s">{f.s}</p>
            {f.warn ? <p className="kf__warn">{f.warn}</p> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The same birth in other traditions: Sun sign (Indian and Western), the Chinese year, numbers. */
export function CosmicProfile({ profile, patri }: { profile: Profile; patri: Patri }) {
  const rows = useMemo(() => {
    const su = patri.grahas.SU;
    const west = tropicalSunSign(profile.birth.utcMs);
    const cz = chineseZodiac(profile.birth.utcMs);
    const n = birthNumbers(profile.birth.localY, profile.birth.localMo, profile.birth.localD);
    return [
      {
        key: "sun",
        title: `Sun sign: ${rashiName(su.sign, profile.tradition)}`,
        sub: `Indian (sidereal) · Western: ${RASHI_LORE[west]?.western}`,
        to: `/explore/rashi/${su.sign}`,
        glyph: <GrahaGlyph id="SU" size={40} />,
      },
      {
        key: "chinese",
        title: `Chinese zodiac: ${cz.element} ${cz.animal}`,
        sub: `${cz.yin ? "Yin" : "Yang"} · lunar year ${cz.year}`,
        to: "/explore/chinese",
        glyph: <span className="cp-sign cp-sign--cn">{cz.animal.slice(0, 2)}</span>,
      },
      {
        key: "numbers",
        title: `Numbers: ${n.root} and ${n.destiny}`,
        sub: `Root ${n.root} · ${GRAHA_LORE.find((g) => g.id === NUMBER_GRAHA[n.root as 1])?.english ?? ""} · destiny ${n.destiny}`,
        to: "/explore/numbers",
        glyph: <span className="cp-sign cp-sign--num">{n.root}</span>,
      },
    ];
  }, [patri, profile]);

  return (
    <ul className="v-list cosmic-profile" aria-label={`${profile.name} in other traditions`}>
      {rows.map((r) => (
        <li key={r.key}>
          <Row to={r.to} icon={<span aria-hidden="true">{r.glyph}</span>} title={r.title} sub={r.sub} />
        </li>
      ))}
    </ul>
  );
}
