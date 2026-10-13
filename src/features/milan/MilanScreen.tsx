// Guna Milan (§4.9): two small scrolls tied with a mauli thread, the score, and the 36-bead mala.
// Every bead, number and word of judgement here is milan()'s output — nothing is typed in.
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { useWide } from "../../app/useWide";
import { Colophon, DISCLAIMER } from "../../components/ui/Colophon";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { glossary } from "../../data/glossary";
import { NAKSHATRA_DEV, NAKSHATRA_NAMES, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
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
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { type ChartBody, KundliChart } from "../patri/KundliChart";
import { Mala } from "./Mala";
import { PoruthamThread } from "./PoruthamThread";
import { becauseBody, doshaLine, exceptionLine, fmtPts, RULE_TEXT, SCHOOL_LABEL, SCHOOL_NOTE, summaryText, WEIGHS } from "./rules";
import "./milan.css";
import { BondCard } from "./BondCard";

const VERDICT: Record<string, string> = {
  "not-recommended": "tradition does not recommend this match",
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

/** "Manglik (from Lagna, Candra) — bhaṅga noted" / "no Manglik mark". */
export function manglikLabel(m: ManglikStatus): string {
  if (!m.present) return "no Manglik mark";
  return `Manglik (from ${m.from.map((f) => MANGLIK_REF_LABEL[f]).join(", ")})${m.cancellations.length > 0 ? ", bhaṅga noted" : ""}`;
}

const bodiesOfPatri = (p: Patri): ChartBody[] =>
  GRAHA_IDS.map((id) => {
    const g = p.grahas[id];
    return { id, sign: g.sign, degInSign: g.degInSign, retro: g.retrograde, nakshatra: g.nakshatra, pada: g.pada };
  });

/** One leaf's Rāśi chart, static, the Moon lit; captioned with the Moon nakshatra and Manglik status. */
function LeafChart({
  who,
  profile,
  patri,
  manglik,
  style,
  script,
}: {
  who: string;
  profile: Profile;
  patri: Patri;
  manglik: ManglikStatus | null;
  style: "north" | "south";
  script: "devanagari" | "latin";
}) {
  const bodies = useMemo(() => bodiesOfPatri(patri), [patri]);
  const m = moonOfPatri(patri);
  return (
    <figure className="milan-chart">
      <div className="milan-chart__frame">
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
      <figcaption className="milan-chart__cap">
        <span className="milan-chart__who">
          {who} · <b>{profile.name}</b> · Rāśi chart, Moon lit
        </span>
        <span>
          Moon in{" "}
          <span lang="hi" className="dev">
            {NAKSHATRA_DEV[m.nak]}
          </span>{" "}
          {NAKSHATRA_NAMES[m.nak]} pada {m.pada} · {SIGN_NAMES[m.sign]}
        </span>
        <span className={`milan-chart__mk${manglik?.present ? " is-present" : ""}`}>{manglik ? manglikLabel(manglik) : "-"}</span>
      </figcaption>
    </figure>
  );
}

function ManglikMarks({ m, onOpen }: { m: ManglikStatus; onOpen: () => void }) {
  const cancelled = m.cancellations.length > 0;
  return (
    <button type="button" className="mk" onClick={onOpen} aria-haspopup="dialog">
      {m.present ? (
        <>
          <span className="mk__dabs" aria-hidden="true">
            {m.from.map((f) => (
              <span key={f} className="mk__dab" />
            ))}
          </span>
          <span className="vh">Manglik from {m.from.map((f) => MANGLIK_REF_LABEL[f]).join(", ")}</span>
          <span aria-hidden="true">Mars doṣa</span>
          {cancelled ? <span className="mk__muted">cancelled</span> : null}
        </>
      ) : (
        <span className="mk__muted">no Mars doṣa</span>
      )}
    </button>
  );
}

function ScrollFace({
  who,
  profile,
  moon,
  manglik,
  onManglik,
}: {
  who: string;
  profile: Profile;
  moon: MoonFacts | null;
  manglik: ManglikStatus | null;
  onManglik: () => void;
}) {
  return (
    <div className="pair__scroll mscroll">
      <span className="mscroll__who">{who}</span>
      <b>{profile.name}</b>
      {moon ? (
        <span className="mscroll__moon">
          <span className="mscroll__sign" title={`Moon sign ${moon.sign + 1}, ${SIGN_NAMES[moon.sign]}`}>
            {moon.sign + 1}
          </span>
          <span lang="hi" className="dev">
            {NAKSHATRA_DEV[moon.nak]}
          </span>
        </span>
      ) : (
        <span className="mscroll__moon mk__muted">casting…</span>
      )}
      {moon ? (
        <span className="mscroll__lat">
          {NAKSHATRA_NAMES[moon.nak]} {moon.pada} · {SIGN_NAMES[moon.sign]}
        </span>
      ) : null}
      {manglik ? <ManglikMarks m={manglik} onOpen={onManglik} /> : null}
    </div>
  );
}

function MauliKnot() {
  return (
    <svg className="mauli-knot" viewBox="0 0 64 28" aria-hidden="true" data-decorative="true">
      <path className="mauli-knot__t" d="M0 14 C 14 8, 22 20, 32 14 S 50 8, 64 14" />
      <path className="mauli-knot__tw" d="M0 14 C 14 8, 22 20, 32 14 S 50 8, 64 14" />
      <ellipse cx="27" cy="11" rx="6" ry="3.4" transform="rotate(-30 27 11)" className="mauli-knot__loop" />
      <ellipse cx="37" cy="11" rx="6" ry="3.4" transform="rotate(30 37 11)" className="mauli-knot__loop" />
      <circle cx="32" cy="14" r="3.4" className="mauli-knot__core" />
      <path className="mauli-knot__t" d="M31 16 q -3 7 -7 10 M33 16 q 3 7 8 9" />
    </svg>
  );
}

/** The picker: the first leaf is laid down, the second is dragged (or tapped) in from the bundle. */
function Picker({
  first,
  profiles,
  onPick,
  onFirst,
}: {
  first: Profile | null;
  profiles: Profile[];
  onPick: (p: Profile) => void;
  onFirst: (p: Profile) => void;
}) {
  const drop = useRef<HTMLDivElement>(null);
  const [over, setOver] = useState(false);
  const others = profiles.filter((p) => p.id !== first?.id);
  const inDrop = (x: number, y: number): boolean => {
    const r = drop.current?.getBoundingClientRect();
    return !!r && x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;
  };
  return (
    <>
      <div className="pair">
        {first ? (
          <div className="pair__scroll mscroll">
            <span className="mscroll__who">first person</span>
            <b>{first.name}</b>
          </div>
        ) : (
          <div className="pair__scroll pair__scroll--empty mscroll">no one yet</div>
        )}
        <MauliKnot />
        <div ref={drop} className={`pair__scroll pair__scroll--empty mscroll mscroll--drop${over ? " is-over" : ""}`}>
          drag a person here
        </div>
      </div>
      {profiles.length === 0 ? (
        <p className="p">
          No one saved yet.{" "}
          <Link className="linkish" to="/leaf/new">
            Add the first person
          </Link>
        </p>
      ) : others.length === 0 ? (
        <p className="p">
          Only one person is saved. Add their partner too.{" "}
          <Link className="linkish" to="/leaf/new">
            Add a second person
          </Link>
        </p>
      ) : (
        <>
          <p className="p p--muted">Tap the second person, or drag them onto the dotted card.</p>
          <ul className="milan-pick">
            {others.map((p) => (
              <li key={p.id}>
                <motion.button
                  type="button"
                  className="milan-pick__leaf"
                  drag
                  dragSnapToOrigin
                  dragMomentum={false}
                  whileDrag={{ scale: 1.03, zIndex: 5 }}
                  onDrag={(e) => {
                    const pe = e as PointerEvent;
                    if ("clientX" in pe) setOver(inDrop(pe.clientX, pe.clientY));
                  }}
                  onDragEnd={(e) => {
                    setOver(false);
                    const pe = e as PointerEvent;
                    if ("clientX" in pe && inDrop(pe.clientX, pe.clientY)) onPick(p);
                  }}
                  onClick={() => onPick(p)}
                  aria-label={`Check ${p.name} with ${first?.name ?? "the first person"} as the second person`}
                >
                  <span className="leaf__hole" aria-hidden="true" />
                  {p.name}
                </motion.button>
              </li>
            ))}
          </ul>
          {profiles.length > 2 ? (
            <details className="milan-first">
              <summary>Change the first person</summary>
              <ul className="milan-pick">
                {profiles.map((p) => (
                  <li key={p.id}>
                    <button type="button" className="milan-pick__leaf" onClick={() => onFirst(p)} aria-pressed={p.id === first?.id}>
                      <span className="leaf__hole" aria-hidden="true" />
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </>
      )}
    </>
  );
}

type SheetState = { kind: "koota"; k: KootaResult } | { kind: "manglik"; side: "a" | "b" } | { kind: "porutham"; p: PoruthamResult } | null;

/** Keyed by the pair, so a new pair (or a swap) starts a fresh count and closes any sheet. */
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
  const [firstPick, setFirstPick] = useState<string | null>(null);

  const pa = profiles?.find((p) => p.id === a) ?? null;
  const pb = profiles?.find((p) => p.id === b) ?? null;
  const A = usePatri(pa, settings.preset);
  const B = usePatri(pb, settings.preset);
  const patA = A.patri && pa && A.patri.profileId === pa.id ? A.patri : null;
  const patB = B.patri && pb && B.patri.profileId === pb.id ? B.patri : null;

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

  const swap = () => {
    if (!a || !b) return;
    play("snap", 0.6);
    haptics.selection();
    navigate(`/milan/${b}/${a}`, { replace: true });
  };

  const loading = profiles === undefined;
  const picking = !loading && (!pa || !pb || pa.id === pb.id);
  const first = pa ?? profiles?.find((p) => p.id === firstPick) ?? active ?? null;
  const ma = patA ? moonOfPatri(patA) : null;
  const mb = patB ? moonOfPatri(patB) : null;
  const err = result.err ?? A.error?.message ?? B.error?.message ?? null;
  const wide = useWide();
  const poruthamList = useMemo(() => (r?.porutham ?? []).filter(isPoruthamResult), [r]);

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
      toast("This browser would not let Vyom copy. Nothing was sent anywhere.", "warn");
    }
  };

  return (
    <Screen className="milan" scroll label="Partner Compatibility">
      <article className="paper paper--cut sheet-col milan__sheet" aria-labelledby="milan-h">
        <TurmericBand id="milan-h" level={1} dev="गुण मिलान" title="Partner Compatibility" meta="aṣṭakūṭa" explain="guna-milan" />

        {loading ? null : picking ? (
          <>
            {a && !pa ? <div className="note-haldi">That person is no longer saved. Choose two people.</div> : null}
            <Picker
              first={first}
              profiles={profiles ?? []}
              onPick={(p) => {
                if (!first) return;
                play("bead");
                haptics.selection();
                navigate(`/milan/${first.id}/${p.id}`);
              }}
              onFirst={(p) => {
                if (a) navigate("/milan", { replace: true });
                setFirstPick(p.id);
              }}
            />
          </>
        ) : pa && pb ? (
          <>
            <motion.div
              className="pair milan__pair"
              drag="x"
              dragSnapToOrigin
              dragElastic={0.2}
              dragMomentum={false}
              style={{ touchAction: "pan-y" }}
              onDragEnd={(_, info) => {
                if (Math.abs(info.offset.x) > 72) swap();
              }}
            >
              <ScrollFace
                who="first person"
                profile={pa}
                moon={ma}
                manglik={r?.manglik.a ?? null}
                onManglik={() => setSheet({ kind: "manglik", side: "a" })}
              />
              <MauliKnot />
              <ScrollFace
                who="second person"
                profile={pb}
                moon={mb}
                manglik={r?.manglik.b ?? null}
                onManglik={() => setSheet({ kind: "manglik", side: "b" })}
              />
            </motion.div>
            <p className="milan__swap">
              <button type="button" className="linkish" onClick={swap}>
                ⇄ Swap first and second person
              </button>
            </p>

            {r && patA && patB ? <BondCard r={r} pa={pa} pb={pb} patA={patA} patB={patB} /> : null}

            <details className="astro-tech milan-tech" open={r ? undefined : true}>
              <summary>
                <span>
                  Full detail (astro tech)
                  <small>The 36-point Guna Milan, every factor and its rule, Porutham and Manglik</small>
                </span>
              </summary>
              {wide && patA && patB ? (
                <div className="milan-charts">
                  <LeafChart
                    who="first person"
                    profile={pa}
                    patri={patA}
                    manglik={r?.manglik.a ?? null}
                    style={settings.chartStyle}
                    script={settings.chartScript}
                  />
                  <LeafChart
                    who="second person"
                    profile={pb}
                    patri={patB}
                    manglik={r?.manglik.b ?? null}
                    style={settings.chartStyle}
                    script={settings.chartScript}
                  />
                </div>
              ) : null}

              {err ? (
                <div className="note-lac" role="alert">
                  The mala would not count: {err}
                </div>
              ) : r ? (
                <Mala
                  key={`${r.a}|${r.b}|${r.presetHash}|${settings.bhakootCancellation}|${settings.ashtakootaSchool}`}
                  result={r}
                  onOpen={(k) => setSheet({ kind: "koota", k })}
                />
              ) : (
                <p className="p p--muted" role="status">
                  Casting both charts…
                </p>
              )}

              {r ? (
                <div className="milan-verdict">
                  <p className="milan-verdict__t">
                    {pa.name} and {pb.name}: <strong>{r.total} of 36</strong>: {VERDICT[r.band]}.
                    {r.kootas.some((k) => k.dosha)
                      ? ` Tradition flags ${r.kootas
                          .filter((k) => k.dosha)
                          .map((k) => k.name)
                          .join(" and ")}; tap a row to see why.`
                      : " No factor is flagged."}
                  </p>
                  <p className="milan-verdict__k">
                    A score is tradition's arithmetic on two Moons. It is not a verdict on two people. Karma, your own actions, decides the
                    rest.
                  </p>
                </div>
              ) : null}

              {poruthamList.length > 0 ? (
                <details className="milan-more">
                  <summary>
                    South Indian check · Porutham <span>{poruthamList.filter((p) => p.pass).length} of 10 agree</span>
                  </summary>
                  <PoruthamThread list={poruthamList} onOpen={(p) => setSheet({ kind: "porutham", p })} />
                </details>
              ) : null}
            </details>

            {r ? (
              <p className="milan__share">
                <button type="button" className="linkish" onClick={() => void copySummary()}>
                  Copy summary
                </button>
              </p>
            ) : null}
          </>
        ) : null}

        <Colophon
          rows={[
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
          ]}
        >
          <p className="milan__school">A score is a tradition's arithmetic, not a verdict on two people.</p>
        </Colophon>
      </article>

      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        label={
          sheet?.kind === "koota"
            ? `${sheet.k.name}: the rule`
            : sheet?.kind === "porutham"
              ? `${sheet.p.name} porutham: the rule`
              : "Manglik (Kuja doṣa)"
        }
      >
        {sheet?.kind === "koota" && pa && pb ? (
          <KootaSheet k={sheet.k} all={r?.kootas ?? []} pa={pa} pb={pb} ma={ma} mb={mb} onClose={() => setSheet(null)} />
        ) : null}
        {sheet?.kind === "porutham" && pa && pb ? (
          <PoruthamSheet p={sheet.p} pa={pa} pb={pb} ma={ma} mb={mb} onClose={() => setSheet(null)} />
        ) : null}
        {sheet?.kind === "manglik" && r && pa && pb ? (
          <ManglikSheet
            profile={sheet.side === "a" ? pa : pb}
            m={sheet.side === "a" ? r.manglik.a : r.manglik.b}
            onClose={() => setSheet(null)}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}

function MoonLine({ who, p, m }: { who: string; p: Profile; m: MoonFacts | null }) {
  return (
    <div className="row">
      <dt>{who}</dt>
      <dd>
        {p.name}:{" "}
        {m ? (
          <>
            <span lang="hi" className="dev">
              {NAKSHATRA_DEV[m.nak]}
            </span>{" "}
            {NAKSHATRA_NAMES[m.nak]} pada {m.pada} · Moon in{" "}
            <span lang="hi" className="dev">
              {SIGN_DEV[m.sign]}
            </span>{" "}
            {SIGN_NAMES[m.sign]}
          </>
        ) : (
          "-"
        )}
      </dd>
    </div>
  );
}

const KOOTA_PLAIN: Record<KootaResult["id"], string> = {
  varna: "varna",
  vashya: "vashya",
  tara: "tara",
  yoni: "yoni",
  maitri: "graha-maitri",
  gana: "gana",
  bhakoot: "bhakuta",
  nadi: "nadi",
};

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
  return (
    <div className="kootasheet">
      <h2 className="kootasheet__h">
        <span lang="sa" className="dev">
          {k.nameDev}
        </span>{" "}
        · {k.name}{" "}
        <span className="kootasheet__score mono">
          {fmtPts(k.score)} / {k.max}
        </span>
      </h2>
      <p className="p">{RULE_TEXT[k.id]}</p>
      <p className="p kootasheet__plain">
        <strong>Simply put: </strong>
        {glossary(KOOTA_PLAIN[k.id])?.short} {glossary(KOOTA_PLAIN[k.id])?.long}
      </p>
      <dl className="kootasheet__dl">
        <MoonLine who="First person" p={pa} m={ma} />
        <MoonLine who="Second person" p={pb} m={mb} />
        <div className="row">
          <dt>Because</dt>
          <dd>{becauseBody(k)}</dd>
        </div>
        <div className="row">
          <dt>Weighs</dt>
          <dd>Tradition weighs {WEIGHS[k.id]}.</dd>
        </div>
        <div className="row">
          <dt>Source</dt>
          <dd>
            {k.citation.text}, {k.citation.ref}
          </dd>
        </div>
        {exc ? (
          <div className="row">
            <dt>Exception</dt>
            <dd>
              {exc.text}
              {exc.source ? <span className="kootasheet__src"> · {exc.source}</span> : null}
            </dd>
          </div>
        ) : null}
      </dl>
      {k.dosha ? <p className="note-lac">{doshaLine(k)}</p> : null}
      <p className="kootasheet__close">
        <button type="button" className="linkish" onClick={onClose}>
          Close
        </button>
      </p>
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
    <div className="kootasheet">
      <h2 className="kootasheet__h">
        <span lang="sa" className="dev">
          {p.nameDev}
        </span>{" "}
        · {p.name} porutham <span className={`kootasheet__score pstate${p.pass ? "" : " is-open"}`}>{p.pass ? "tied" : "open ×"}</span>
      </h2>
      <p className="p">{p.rule}</p>
      <dl className="kootasheet__dl">
        <MoonLine who="First person" p={pa} m={ma} />
        <MoonLine who="Second person" p={pb} m={mb} />
        <div className="row">
          <dt>Because</dt>
          <dd>{p.because}</dd>
        </div>
        <div className="row">
          <dt>Weighs</dt>
          <dd>
            Tradition weighs {p.weighs}.{p.weighty ? " Rajju and Vedha are the two the tradition weighs heaviest." : ""}
          </dd>
        </div>
        <div className="row">
          <dt>Source</dt>
          <dd>
            {p.citation.text}, {p.citation.ref}
          </dd>
        </div>
      </dl>
      {p.pass ? null : <p className="note-lac">Tradition says this knot stays open: {p.because}</p>}
      <p className="p p--muted">Counted from the second person (the kanyā column) to the first, as the tables are read.</p>
      <p className="kootasheet__close">
        <button type="button" className="linkish" onClick={onClose}>
          Close
        </button>
      </p>
    </div>
  );
}

function ManglikSheet({ profile, m, onClose }: { profile: Profile; m: ManglikStatus; onClose: () => void }) {
  return (
    <div className="kootasheet">
      <h2 className="kootasheet__h">
        <span lang="sa" className="dev">
          कुज दोष
        </span>{" "}
        · Manglik: {profile.name}
      </h2>
      <p className="p">
        {m.present
          ? `Tradition says Maṅgala stands in the 1st, 2nd, 4th, 7th, 8th or 12th counted from ${m.from.map((f) => MANGLIK_REF_LABEL[f]).join(", ")}.`
          : "Maṅgala stands in none of the 1st, 2nd, 4th, 7th, 8th or 12th from the Lagna, Candra or Śukra."}
      </p>
      {m.cancellations.length > 0 ? (
        <ul className="kootasheet__list">
          {m.cancellations.map((c) => (
            <li key={c}>{MANGLIK_NAME.get(c) ?? c}</li>
          ))}
        </ul>
      ) : null}
      <p className="p p--muted">
        {m.citation.text}, {m.citation.ref}. Shown beside the score, never added to it.
      </p>
      <p className="kootasheet__close">
        <button type="button" className="linkish" onClick={onClose}>
          Close
        </button>
      </p>
    </div>
  );
}
