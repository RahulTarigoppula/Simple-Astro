// Partner match: choose two people, read the answer first (BondCard), and keep the astrology in folds:
// the 36-point Guna Milan, the South Indian Porutham, the school notes and how it was calculated.
// Every bead, number and word of judgement here is milan()'s output, nothing is typed in.
import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { DISCLAIMER } from "../../components/ui/Colophon";
import { InfoDot } from "../../components/ui/Explain";
import { Reveal } from "../../components/ui/Motion";
import { Page, Row, Section } from "../../components/ui/Page";
import { Avatar, birthLine } from "../../components/ui/PersonChip";
import { Sheet } from "../../components/ui/Sheet";
import { glossary } from "../../data/glossary";
import { nakBoth, rashiBoth } from "../../data/regional";
import { NAKSHATRA_DEV, SIGN_DEV } from "../../data/tables/names";
import { milan } from "../../engine/ashtakoota";
import { AYANAMSA_LABEL } from "../../engine/ayanamsa";
import { MANGLIK_CANCELLATIONS, MANGLIK_REF_LABEL } from "../../engine/manglik";
import { isPoruthamResult, type PoruthamResult } from "../../engine/porutham";
import {
  GRAHA_IDS,
  type KootaResult,
  type ManglikStatus,
  type MilanResult,
  type Patri,
  type Profile,
  type SignIdx,
} from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { toast } from "../../state/ui";
import { IconMilan } from "../chowki/icons";
import { type ChartBody, KundliChart } from "../patri/KundliChart";
import { ShareButton } from "../share/ShareCard";
import { BondBand, BondCard, Fold, ORDER_NOTE } from "./BondCard";
import { Mala } from "./Mala";
import { PairPicture } from "./PairPicture";
import { PoruthamThread } from "./PoruthamThread";
import {
  BAND_LABEL,
  becauseBody,
  doshaLine,
  exceptionLine,
  fmtPts,
  HAS_EXCEPTION,
  KOOTA_GLOSS,
  RULE_TEXT,
  SCHOOL_LABEL,
  SCHOOL_NOTE,
  summaryText,
  WEIGHS,
} from "./rules";
import "./milan.css";

const VERDICT: Record<string, string> = {
  "not-recommended": "under the traditional line of 18. Tradition flags this pairing; many families then look at the exceptions",
  acceptable: "an acceptable match by tradition",
  "very-good": "a very good match by tradition",
  excellent: "an excellent match by tradition",
};
const MANGLIK_NAME = new Map(MANGLIK_CANCELLATIONS.map((c) => [c.id, c.name]));

interface MoonFacts {
  nak: number;
  pada: number;
  sign: SignIdx;
}
const moonOfPatri = (p: Patri): MoonFacts => ({ nak: p.grahas.MO.nakshatra, pada: p.grahas.MO.pada, sign: p.grahas.MO.sign });

/** "Manglik (Mars doṣa from Lagna, Candra)" / "not Manglik". */
export function manglikLabel(m: ManglikStatus): string {
  if (!m.present) return "not Manglik";
  const from = m.from.map((f) => MANGLIK_REF_LABEL[f]).join(", ");
  return m.cancellations.length > 0 ? `Mars doṣa from ${from}, cancelled by an exception` : `Manglik (Mars doṣa from ${from})`;
}

const bodiesOfPatri = (p: Patri): ChartBody[] =>
  GRAHA_IDS.map((id) => {
    const g = p.grahas[id];
    return { id, sign: g.sign, degInSign: g.degInSign, retro: g.retrograde, nakshatra: g.nakshatra, pada: g.pada };
  });

/** One person's Rāśi chart, static, the Moon lit; captioned with the Moon's star and sign. */
function PersonChart({
  profile,
  patri,
  style,
  script,
}: {
  profile: Profile;
  patri: Patri;
  style: "north" | "south";
  script: "devanagari" | "latin";
}) {
  const bodies = useMemo(() => bodiesOfPatri(patri), [patri]);
  const m = moonOfPatri(patri);
  return (
    <figure className="mm-chart">
      <div className="mm-chart__frame">
        <KundliChart
          title=""
          style={style}
          script={script}
          lagnaSign={patri.lagna.sign}
          bodies={bodies}
          lit="MO"
          showDegrees={false}
          static
        />
      </div>
      <figcaption>
        <b>{profile.name}</b>
        <span className="v-small v-muted">
          Moon in {nakBoth(m.nak, profile.tradition)} pada {m.pada} · {rashiBoth(m.sign, profile.tradition)}
        </span>
      </figcaption>
    </figure>
  );
}

function Slot({ who, person, onChoose }: { who: string; person: Profile | null; onChoose: () => void }) {
  return (
    <button
      type="button"
      className={`mm-slot${person ? "" : " is-empty"}`}
      aria-haspopup="dialog"
      aria-label={person ? `${who}: ${person.name}. Change` : `${who}: choose a person`}
      onClick={onChoose}
    >
      <span className="mm-slot__name">
        <span>{person ? person.name : "Choose"}</span>
        <Caret />
      </span>
      <span className="mm-slot__who">{who}</span>
    </button>
  );
}

function IconFive() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 6h14M5 10.5h10M5 15h14M5 19.5h8" />
    </svg>
  );
}

function IconBeads() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <circle key={i} cx={12 + 8 * Math.cos((i * Math.PI) / 4)} cy={12 + 8 * Math.sin((i * Math.PI) / 4)} r={i < 6 ? 1.9 : 1.1} />
      ))}
    </svg>
  );
}

function Caret() {
  return (
    <svg
      className="mm-slot__caret"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M6 9l6 6 6-6" />
    </svg>
  );
}

function SwapIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M7 7h12l-3-3M17 17H5l3 3" />
    </svg>
  );
}

type SheetState = { kind: "koota"; k: KootaResult } | { kind: "porutham"; p: PoruthamResult } | { kind: "pick"; side: "a" | "b" } | null;

/** Keyed by the pair, so a new pair (or a swap) starts fresh and closes any sheet. */
export default function MilanRoute() {
  const { a, b } = useParams();
  return <MilanScreen key={`${a ?? ""}|${b ?? ""}`} />;
}

function MilanScreen() {
  const { a, b } = useParams();
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const navigate = useNavigate();
  const [sheet, setSheet] = useState<SheetState>(null);
  const [pick, setPick] = useState<{ a: string | null; b: string | null }>({ a: null, b: null });

  const pa = profiles?.find((p) => p.id === a) ?? null;
  const pb = profiles?.find((p) => p.id === b) ?? null;
  const matched = !!pa && !!pb && pa.id !== pb.id;
  const A = usePatri(matched ? pa : null, settings.preset);
  const B = usePatri(matched ? pb : null, settings.preset);
  const patA = A.patri && matched && A.patri.profileId === pa.id ? A.patri : null;
  const patB = B.patri && matched && B.patri.profileId === pb.id ? B.patri : null;

  const result = useMemo<{ r: MilanResult | null; err: string | null }>(() => {
    if (!pa || !pb || !patA || !patB) return { r: null, err: null };
    try {
      return {
        r: milan(pa, pb, patA, patB, { bhakootCancellation: settings.bhakootCancellation, school: settings.ashtakootaSchool }),
        err: null,
      };
    } catch (e) {
      return { r: null, err: e instanceof Error ? e.message : String(e) };
    }
  }, [pa, pb, patA, patB, settings.bhakootCancellation, settings.ashtakootaSchool]);
  const r = result.r;
  const poruthamList = useMemo(() => (r?.porutham ?? []).filter(isPoruthamResult), [r]);

  const loading = profiles === undefined;
  const list = profiles ?? [];
  const byId = (id: string | null) => list.find((p) => p.id === id) ?? null;
  // The two slots: the pair in the URL, else what was picked here, else a sensible start.
  const slotA = matched ? pa : (byId(pick.a) ?? pa ?? active ?? list[0] ?? null);
  const onlyOther = list.length === 2 ? (list.find((p) => p.id !== slotA?.id) ?? null) : null;
  const slotB = matched ? pb : (byId(pick.b) ?? onlyOther);
  const ready = !matched && !!slotA && !!slotB && slotA.id !== slotB.id;

  const go = (x: Profile, y: Profile, replace: boolean) => navigate(`/milan/${x.id}/${y.id}`, { replace });
  const swap = () => {
    if (!slotA || !slotB) return;
    haptics.selection();
    if (matched) go(slotB, slotA, true);
    else setPick({ a: slotB.id, b: slotA.id });
  };
  const choose = (side: "a" | "b", p: Profile) => {
    const other = side === "a" ? slotB : slotA;
    const mine = side === "a" ? slotA : slotB;
    // Choosing the person who is already on the other side trades places.
    const nextOther = other?.id === p.id ? mine : other;
    const nextA = side === "a" ? p : nextOther;
    const nextB = side === "a" ? nextOther : p;
    haptics.selection();
    // A new pair is a new screen (the route is keyed by the pair), so the sheet goes with the old one.
    setSheet(null);
    if (nextA && nextB && nextA.id !== nextB.id) return go(nextA, nextB, matched);
    setPick({ a: nextA?.id ?? null, b: nextB?.id ?? null });
  };

  const ma = patA ? moonOfPatri(patA) : null;
  const mb = patB ? moonOfPatri(patB) : null;
  const err = result.err ?? A.error?.message ?? B.error?.message ?? null;

  const copySummary = async () => {
    if (!r || !pa || !pb) return;
    const text = summaryText({
      result: r,
      first: { name: pa.name, moon: ma },
      second: { name: pb.name, moon: mb },
      manglikLabel,
      disclaimer: DISCLAIMER,
    });
    try {
      if (!navigator.clipboard) throw new Error("no clipboard");
      await navigator.clipboard.writeText(text);
      haptics.selection();
      toast("Summary copied as plain text, with the disclaimer.");
    } catch {
      toast("This browser would not let Vyomaphala copy. Nothing was sent anywhere.", "warn");
    }
  };

  const flagged = r ? r.kootas.filter((k) => k.dosha) : [];

  const pairRow =
    list.length > 0 ? (
      <section className="mm-pair" aria-label="The two people">
        <Slot who="First person" person={slotA} onChoose={() => setSheet({ kind: "pick", side: "a" })} />
        {list.length > 1 ? (
          <button type="button" className="v-iconbtn mm-pair__swap" onClick={swap} disabled={!slotA || !slotB}>
            <SwapIcon />
            <span className="vh">Swap first and second person</span>
          </button>
        ) : (
          <span aria-hidden="true" />
        )}
        {list.length > 1 ? (
          <Slot who="Second person" person={slotB} onChoose={() => setSheet({ kind: "pick", side: "b" })} />
        ) : (
          <Link to="/leaf/new" className="mm-slot is-empty">
            <span className="mm-slot__name">
              <span>Add a person</span>
            </span>
            <span className="mm-slot__who">Second person</span>
          </Link>
        )}
      </section>
    ) : null;

  const hero = loading ? (
    <section className="mm-band">
      <div className="mm-band__text">
        <h1 className="mm-band__eyebrow">Partner match</h1>
      </div>
    </section>
  ) : matched && r && patA && patB && !err ? (
    <BondBand r={r} pa={pa} pb={pb} pair={pairRow} />
  ) : (
    <section className="mm-band mm-band--choose" aria-labelledby="mm-h">
      <div className="mm-band__stage">
        <PairPicture a={slotA?.name ?? null} b={slotB?.name ?? null} />
        {pairRow}
      </div>
      <div className="mm-band__text">
        <h1 id="mm-h" className={matched ? "mm-band__eyebrow" : "mm-band__title"}>
          Partner match
        </h1>
        {matched ? null : list.length === 0 ? (
          <>
            <h2 className="mm-band__sub">A match needs two people</h2>
            <p className="mm-band__lede">
              No one is saved yet. Add two people with their birth date, time and place, and Vyomaphala will compare them.
            </p>
            <Link to="/leaf/new" className="v-btn mm-go">
              Add a person
            </Link>
            <p className="mm-band__small">About a minute each. Everything stays on this device.</p>
          </>
        ) : list.length === 1 ? (
          <>
            <h2 className="mm-band__sub">Add one more person</h2>
            <p className="mm-band__lede">
              Only {list[0]?.name ?? "one person"} is saved. Add their partner's birth date, time and place to see the match.
            </p>
            <Link to="/leaf/new" className="v-btn mm-go">
              Add a person
            </Link>
            <p className="mm-band__small">About a minute. Everything stays on this device.</p>
          </>
        ) : (
          <>
            <p className="mm-band__lede mm-band__lede--top">How two people fit, read the traditional way from their two Moons.</p>
            {ready && slotA && slotB ? (
              <button type="button" className="v-btn mm-go" onClick={() => go(slotA, slotB, false)}>
                See the match
              </button>
            ) : (
              <p className="mm-band__small">Tap each side to choose a person. The match opens as soon as both are chosen.</p>
            )}
          </>
        )}
      </div>
    </section>
  );

  return (
    <Page label="Partner match" hero={hero} sky="dusk" wide>
      {loading ? null : (
        <>
          {a && !matched ? (
            <div className="v-note v-note--warn">
              {pa && pb
                ? "A match needs two different people. Choose the second person."
                : "That person is no longer saved. Choose two people."}
            </div>
          ) : null}

          {matched ? null : (
            <Reveal i={0} className="mm-block mm-what">
              <Section title="What a match shows" />
              <ul className="v-list">
                <li>
                  <Row
                    icon={<IconMilan />}
                    tone="rose"
                    title="One clear answer"
                    sub="A word and a score out of 100, read from the two Moons"
                  />
                </li>
                <li>
                  <Row
                    icon={<IconFive />}
                    tone="gold"
                    title="The five things people ask"
                    sub="Understanding, companionship, trust, closeness and family"
                  />
                </li>
                <li>
                  <Row
                    icon={<IconBeads />}
                    tone="cyan"
                    title="The tradition behind it"
                    sub="The 36 points of Guna Milan and the South Indian Porutham"
                  />
                </li>
              </ul>
            </Reveal>
          )}

          {matched ? (
            err ? (
              <div className="v-note v-note--care" role="alert">
                The match could not be worked out: {err}
              </div>
            ) : r && patA && patB ? (
              <BondCard
                r={r}
                pa={pa}
                pb={pb}
                patA={patA}
                patB={patB}
                onCopy={() => void copySummary()}
                actions={<ShareButton kind="match" className="share-btn--lead" a={pa.name} b={pb.name} result={r} />}
                manglikFacts={
                  <>
                    <dl className="mm-facts">
                      <ManglikFact profile={pa} m={r.manglik.a} />
                      <ManglikFact profile={pb} m={r.manglik.b} />
                    </dl>
                    <p className="v-small v-muted">Manglik is shown beside the score, never added to it.</p>
                  </>
                }
              >
                <Fold
                  title="The 36-point score"
                  sub={`Guna Milan: ${fmtPts(r.total)} of 36, ${r.band === "not-recommended" ? "under the traditional line of 18" : BAND_LABEL[r.band]}`}
                  lazy
                >
                  <Mala result={r} onOpen={(k) => setSheet({ kind: "koota", k })} />
                  <p>
                    {pa.name} and {pb.name}: <strong>{fmtPts(r.total)} of 36</strong>: {VERDICT[r.band]}.
                    {flagged.length
                      ? ` Tradition flags ${flagged.map((k) => k.name).join(" and ")}; tap a test to see why.`
                      : " No factor is flagged."}
                  </p>
                  <p className="v-small v-muted">
                    A score is tradition's arithmetic on two Moons. It is not a verdict on two people. Karma, your own actions, decides the
                    rest.
                  </p>
                </Fold>

                {poruthamList.length > 0 ? (
                  <Fold title="South Indian check" sub={`Porutham: ${poruthamList.filter((p) => p.pass).length} of 10 agree`} lazy>
                    <PoruthamThread list={poruthamList} onOpen={(p) => setSheet({ kind: "porutham", p })} />
                  </Fold>
                ) : null}

                <Fold title="Both birth charts" sub="Rāśi charts with the Moon lit" lazy>
                  <div className="mm-charts">
                    <PersonChart profile={pa} patri={patA} style={settings.chartStyle} script={settings.chartScript} />
                    <PersonChart profile={pb} patri={patB} style={settings.chartStyle} script={settings.chartScript} />
                  </div>
                </Fold>

                <Fold title="How this was calculated" sub="The method, the school and its exceptions">
                  <p>{ORDER_NOTE}</p>
                  <dl className="mm-facts">
                    {(
                      [
                        ["Method", "Aṣṭakūṭa from the two Moons' nakṣatra, pada and rāśi: eight kūṭas, 36 points"],
                        [
                          "School",
                          `${SCHOOL_LABEL[settings.ashtakootaSchool]} (Settings), after Muhūrta Cintāmaṇi ch. 6; ${SCHOOL_NOTE[settings.ashtakootaSchool]}; Varṇa, Vaśya and one Yoni cell follow it`,
                        ],
                        ["Sides", "first person in the first column of every table, second person in the second"],
                        [
                          "Bhakūṭa",
                          settings.bhakootCancellation
                            ? "the classical exception is applied (Settings)"
                            : "the classical exception is recorded, not applied (Settings)",
                        ],
                        ["Bands", "under 18 not recommended · 18-24½ acceptable · 25-32½ very good · 33-36 excellent"],
                        ["Ayanāṃśa", AYANAMSA_LABEL[settings.preset.ayanamsa]],
                      ] as const
                    ).map(([k, v]) => (
                      <div key={k}>
                        <dt>{k}</dt>
                        <dd>{v}</dd>
                      </div>
                    ))}
                    {r.kootas
                      .filter((k) => HAS_EXCEPTION.has(k.id))
                      .map((k) => {
                        const exc = exceptionLine(k, r.kootas);
                        return exc ? (
                          <div key={k.id}>
                            <dt>{k.name} exception</dt>
                            <dd>
                              {exc.text}
                              {exc.source ? <span className="v-muted"> ({exc.source})</span> : null}
                            </dd>
                          </div>
                        ) : null;
                      })}
                  </dl>
                  <p className="v-small v-muted">
                    The school and the Bhakūṭa exception can be changed in <Link to="/drawer">Settings</Link>. A score is a tradition's
                    arithmetic, not a verdict on two people.
                  </p>
                </Fold>
              </BondCard>
            ) : (
              <div className="v-skel" role="status">
                Reading both charts…
              </div>
            )
          ) : null}

          <p className="v-foot">{DISCLAIMER} All computation happened on this device. Nothing left it.</p>
        </>
      )}

      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        label={
          sheet?.kind === "koota"
            ? `${sheet.k.name}: the rule`
            : sheet?.kind === "porutham"
              ? `${sheet.p.name} porutham: the rule`
              : sheet?.side === "a"
                ? "Choose the first person"
                : "Choose the second person"
        }
      >
        {sheet?.kind === "pick" ? (
          <div className="v-people">
            <h2>{sheet.side === "a" ? "Who is the first person?" : "Who is the second person?"}</h2>
            <div className="v-people__list" role="radiogroup" aria-label="Choose a person">
              {list.map((p) => {
                const on = p.id === (sheet.side === "a" ? slotA : slotB)?.id;
                const other = p.id === (sheet.side === "a" ? slotB : slotA)?.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    className="v-people__one"
                    onClick={() => choose(sheet.side, p)}
                  >
                    <Avatar name={p.name} size={40} />
                    <span>
                      <span className="t">{p.name}</span>
                      <span className="s">
                        {other ? `Now the ${sheet.side === "a" ? "second" : "first"} person. Choosing swaps the two.` : birthLine(p)}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <Link to="/leaf/new" className="v-btn v-btn--ghost v-btn--block">
              + Add a person
            </Link>
          </div>
        ) : null}
        {sheet?.kind === "koota" && pa && pb ? (
          <KootaSheet k={sheet.k} all={r?.kootas ?? []} pa={pa} pb={pb} ma={ma} mb={mb} onClose={() => setSheet(null)} />
        ) : null}
        {sheet?.kind === "porutham" && pa && pb ? (
          <PoruthamSheet p={sheet.p} pa={pa} pb={pb} ma={ma} mb={mb} onClose={() => setSheet(null)} />
        ) : null}
      </Sheet>
    </Page>
  );
}

function ManglikFact({ profile, m }: { profile: Profile; m: ManglikStatus }) {
  return (
    <div>
      <dt>Manglik: {profile.name}</dt>
      <dd>
        <b>{manglikLabel(m)}.</b>{" "}
        {m.present
          ? `Tradition says Maṅgala stands in the 1st, 2nd, 4th, 7th, 8th or 12th counted from ${m.from.map((f) => MANGLIK_REF_LABEL[f]).join(", ")}.`
          : "Maṅgala stands in none of the 1st, 2nd, 4th, 7th, 8th or 12th from the Lagna, Candra or Śukra."}
        {m.cancellations.length > 0 ? ` Cancelled by: ${m.cancellations.map((c) => MANGLIK_NAME.get(c) ?? c).join("; ")}.` : ""}
        <span className="v-muted">
          {" "}
          ({m.citation.text}, {m.citation.ref})
        </span>
      </dd>
    </div>
  );
}

function MoonLine({ who, p, m }: { who: string; p: Profile; m: MoonFacts | null }) {
  return (
    <div>
      <dt>{who}</dt>
      <dd>
        {p.name}:{" "}
        {m ? (
          <>
            {nakBoth(m.nak, p.tradition)}{" "}
            <span lang="hi" className="mm-dev">
              {NAKSHATRA_DEV[m.nak]}
            </span>{" "}
            pada {m.pada} · Moon in {rashiBoth(m.sign, p.tradition)}{" "}
            <span lang="hi" className="mm-dev">
              {SIGN_DEV[m.sign]}
            </span>
          </>
        ) : (
          "-"
        )}
      </dd>
    </div>
  );
}

function SheetClose({ onClose }: { onClose: () => void }) {
  return (
    <button type="button" className="v-btn v-btn--ghost v-btn--block" onClick={onClose}>
      Close
    </button>
  );
}

function KootaSheet({
  k,
  all,
  pa,
  pb,
  ma,
  mb,
  onClose,
}: {
  k: KootaResult;
  all: readonly KootaResult[];
  pa: Profile;
  pb: Profile;
  ma: MoonFacts | null;
  mb: MoonFacts | null;
  onClose: () => void;
}) {
  const exc = exceptionLine(k, all);
  const g = glossary(KOOTA_GLOSS[k.id]);
  return (
    <div className="mm-sheet">
      <p className="v-eyebrow">
        {k.name}{" "}
        <span lang="sa" className="mm-dev">
          {k.nameDev}
        </span>{" "}
        <InfoDot id={KOOTA_GLOSS[k.id]} label={k.name} />
      </p>
      <h2 className="mm-sheet__h">
        <span>{g?.plain ?? k.name}</span>
        <span className="v-chip">
          {fmtPts(k.score)} / {k.max}
        </span>
      </h2>
      <p>
        <strong>Simply put: </strong>
        {g?.short} {g?.long}
      </p>
      {k.dosha ? <p className="v-note v-note--care">{doshaLine(k)}</p> : null}
      <dl className="mm-facts">
        <MoonLine who="First person" p={pa} m={ma} />
        <MoonLine who="Second person" p={pb} m={mb} />
        <div>
          <dt>Because</dt>
          <dd>{becauseBody(k)}</dd>
        </div>
        <div>
          <dt>The rule</dt>
          <dd>{RULE_TEXT[k.id]}</dd>
        </div>
        <div>
          <dt>Weighs</dt>
          <dd>Tradition weighs {WEIGHS[k.id]}.</dd>
        </div>
        {exc ? (
          <div>
            <dt>Exception</dt>
            <dd>
              {exc.text}
              {exc.source ? <span className="v-muted"> · {exc.source}</span> : null}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Source</dt>
          <dd>
            {k.citation.text}, {k.citation.ref}
          </dd>
        </div>
      </dl>
      <SheetClose onClose={onClose} />
    </div>
  );
}

function PoruthamSheet({
  p,
  pa,
  pb,
  ma,
  mb,
  onClose,
}: {
  p: PoruthamResult;
  pa: Profile;
  pb: Profile;
  ma: MoonFacts | null;
  mb: MoonFacts | null;
  onClose: () => void;
}) {
  return (
    <div className="mm-sheet">
      <p className="v-eyebrow">
        Porutham{" "}
        <span lang="sa" className="mm-dev">
          {p.nameDev}
        </span>{" "}
        <InfoDot id="porutham" />
      </p>
      <h2 className="mm-sheet__h">
        <span>{p.name}</span>
        <span className={`v-chip ${p.pass ? "v-chip--good" : "v-chip--mixed"}`}>{p.pass ? "agrees" : "does not agree"}</span>
      </h2>
      <p>{p.rule}</p>
      {p.pass ? null : <p className="v-note v-note--warn">Tradition says this check does not agree: {p.because}</p>}
      <dl className="mm-facts">
        <MoonLine who="First person" p={pa} m={ma} />
        <MoonLine who="Second person" p={pb} m={mb} />
        <div>
          <dt>Because</dt>
          <dd>{p.because}</dd>
        </div>
        <div>
          <dt>Weighs</dt>
          <dd>
            Tradition weighs {p.weighs}.{p.weighty ? " Rajju and Vedha are the two the tradition weighs heaviest." : ""}
          </dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>
            {p.citation.text}, {p.citation.ref}
          </dd>
        </div>
      </dl>
      <p className="v-small v-muted">Counted from the second person (the second person's column) to the first, as the tables are read.</p>
      <SheetClose onClose={onClose} />
    </div>
  );
}
