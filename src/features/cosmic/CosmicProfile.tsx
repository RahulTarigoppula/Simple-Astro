// A person at a glance, across traditions: Lagna, Moon sign, Janma nakṣatra (deity and symbol), Sun
// sign (sidereal and Western), the Chinese year, and numerology — each card opens its lore.
import { useMemo } from "react";
import { Link } from "react-router";
import { GrahaGlyph } from "../../components/ui/GrahaGlyph";
import { GRAHA_LORE, NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { NAK_LORDS, NAKSHATRA_DEV, NAKSHATRA_NAMES, SIGN_NAMES } from "../../data/tables/names";
import { birthNumbers, chineseZodiac, NUMBER_GRAHA, tropicalSunSign } from "../../engine/profile";
import type { Patri, Profile } from "../../engine/types";
import "./cosmic.css";
import { nakBoth, nakName, rashiBoth, rashiName } from "../../data/regional";

interface Item {
  key: string;
  k: string;
  v: string;
  dev?: string | undefined;
  s: string;
  to: string;
  glyph?: React.ReactNode;
  warn?: string;
}

export function CosmicProfile({ profile, patri, compact = false }: { profile: Profile; patri: Patri; compact?: boolean }) {
  const items = useMemo<Item[]>(() => {
    const L = patri.lagna.sign;
    const mo = patri.grahas.MO;
    const su = patri.grahas.SU;
    const nak = mo.nakshatra;
    const lore = NAKSHATRA_LORE[nak];
    const west = tropicalSunSign(profile.birth.utcMs);
    const cz = chineseZodiac(profile.birth.utcMs);
    const n = birthNumbers(profile.birth.localY, profile.birth.localMo, profile.birth.localD);
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
        key: "lagna",
        k: "Rising sign · Lagna",
        v: rashiName(L, profile.tradition),
        dev: r(L)?.dev,
        s: `${sk(L)}${r(L)?.western} rising: how you meet the world`,
        to: `/explore/rashi/${L}`,
        glyph: <span className="cp-sign">{L + 1}</span>,
        ...(profile.timeUnknown ? { warn: "birth time unknown, so uncertain" } : {}),
      },
      {
        key: "moon",
        k: "Moon sign · Rāśi",
        v: rashiName(mo.sign, profile.tradition),
        dev: r(mo.sign)?.dev,
        s: `${sk(mo.sign)}${r(mo.sign)?.western}: your sign in Indian astrology`,
        to: `/explore/rashi/${mo.sign}`,
        glyph: <GrahaGlyph id="MO" size={38} />,
      },
      {
        key: "nak",
        k: "Birth star · Nakṣatra",
        v: nakName(nak, profile.tradition),
        dev: NAKSHATRA_DEV[nak],
        s: `${skN(nak)}pada ${mo.pada} · ${lore?.symbol} · deity ${lore?.deity.split(",")[0]}`,
        ...(edge ? { warn: edge } : {}),
        to: `/explore/nakshatra/${nak}`,
        glyph: <GrahaGlyph id={NAK_LORDS[nak % 9] ?? "KE"} size={38} />,
      },
      {
        key: "sun",
        k: "Sun sign",
        v: rashiName(su.sign, profile.tradition),
        dev: r(su.sign)?.dev,
        s: `Indian (sidereal) · Western: ${r(west)?.western}`,
        to: `/explore/rashi/${su.sign}`,
        glyph: <GrahaGlyph id="SU" size={38} />,
      },
      {
        key: "chinese",
        k: "Chinese zodiac",
        v: `${cz.element} ${cz.animal}`,
        s: `${cz.yin ? "Yin" : "Yang"} · lunar year ${cz.year}`,
        to: "/explore/chinese",
        glyph: <span className="cp-sign cp-sign--cn">{cz.animal.slice(0, 2)}</span>,
      },
      {
        key: "numbers",
        k: "Numbers · Aṅka",
        v: `${n.root} · ${n.destiny}`,
        s: `root ${n.root} · ${GRAHA_LORE.find((g) => g.id === NUMBER_GRAHA[n.root as 1])?.english ?? ""} · destiny ${n.destiny}`,
        to: "/explore/numbers",
        glyph: <span className="cp-sign cp-sign--num">{n.root}</span>,
      },
    ];
  }, [patri, profile]);

  return (
    <section className={`cosmic-card cosmic-profile${compact ? " cosmic-profile--compact" : ""}`} aria-labelledby="cp-h">
      <header className="cosmic-card__head">
        <h2 id="cp-h">
          {profile.name}'s cosmic profile <span className="gloss">tap any card for its story</span>
        </h2>
      </header>
      <ul className="cp-grid">
        {items.map((it) => (
          <li key={it.key}>
            <Link to={it.to} className="cp-card">
              <span className="cp-card__glyph" aria-hidden="true">
                {it.glyph}
              </span>
              <span className="cp-card__k">{it.k}</span>
              <span className="cp-card__v">
                {it.v}{" "}
                {it.dev ? (
                  <span lang="hi" className="cp-card__dev">
                    {it.dev}
                  </span>
                ) : null}
              </span>
              <span className="cp-card__s">{it.s}</span>
              {it.warn ? <span className="cp-card__warn">{it.warn}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
