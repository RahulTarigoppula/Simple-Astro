// Guna Milan (§4.9): two small scrolls tied with a mauli thread, the score, and the 36-bead mala.
// Every bead, number and word of judgement here is milan()'s output — nothing is typed in.
import { motion } from "motion/react";
import { useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useActiveProfile, usePatri, useProfiles, useSettings } from "../../app/hooks";
import { Colophon } from "../../components/ui/Colophon";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { NAKSHATRA_DEV, NAKSHATRA_NAMES, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { milan } from "../../engine/ashtakoota";
import { AYANAMSA_LABEL } from "../../engine/ayanamsa";
import { MANGLIK_CANCELLATIONS, MANGLIK_REF_LABEL } from "../../engine/manglik";
import type { KootaResult, ManglikStatus, MilanResult, Patri, Profile, SignIdx } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { Mala } from "./Mala";
import { becauseBody, doshaLine, exceptionText, fmtPts, RULE_TEXT } from "./rules";
import "./milan.css";

const MANGLIK_NAME = new Map(MANGLIK_CANCELLATIONS.map((c) => [c.id, c.name]));

interface MoonFacts {
  nak: number;
  pada: number;
  sign: SignIdx;
}
const moonOfPatri = (p: Patri): MoonFacts => ({ nak: p.grahas.MO.nakshatra, pada: p.grahas.MO.pada, sign: p.grahas.MO.sign });

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
          <span aria-hidden="true">Manglik</span>
          {cancelled ? <span className="mk__muted">bhaṅga noted</span> : null}
        </>
      ) : (
        <span className="mk__muted">no Manglik mark</span>
      )}
    </button>
  );
}

function ScrollFace({ who, profile, moon, manglik, onManglik }: { who: string; profile: Profile; moon: MoonFacts | null; manglik: ManglikStatus | null; onManglik: () => void }) {
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
function Picker({ first, profiles, onPick, onFirst }: { first: Profile | null; profiles: Profile[]; onPick: (p: Profile) => void; onFirst: (p: Profile) => void }) {
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
            <span className="mscroll__who">first leaf</span>
            <b>{first.name}</b>
          </div>
        ) : (
          <div className="pair__scroll pair__scroll--empty mscroll">no leaf yet</div>
        )}
        <MauliKnot />
        <div ref={drop} className={`pair__scroll pair__scroll--empty mscroll mscroll--drop${over ? " is-over" : ""}`}>
          drag a leaf from the bundle
        </div>
      </div>
      {profiles.length === 0 ? (
        <p className="p">
          The bundle is empty.{" "}
          <Link className="linkish" to="/leaf/new">
            Write the first leaf
          </Link>
        </p>
      ) : others.length === 0 ? (
        <p className="p">
          Only one leaf is in the bundle — a Milan needs two.{" "}
          <Link className="linkish" to="/leaf/new">
            Write a second leaf
          </Link>
        </p>
      ) : (
        <>
          <p className="p p--muted">Drag a leaf onto the dotted scroll, or tap it.</p>
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
                  aria-label={`Lay ${p.name}'s leaf beside ${first?.name ?? "the first"} — the second leaf`}
                >
                  <span className="leaf__hole" aria-hidden="true" />
                  {p.name}
                </motion.button>
              </li>
            ))}
          </ul>
          {profiles.length > 2 ? (
            <details className="milan-first">
              <summary>Change the first leaf</summary>
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

type SheetState = { kind: "koota"; k: KootaResult } | { kind: "manglik"; side: "a" | "b" } | null;

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
      return { r: milan(pa, pb, patA, patB, { bhakootCancellation: settings.bhakootCancellation }), err: null };
    } catch (e) {
      return { r: null, err: e instanceof Error ? e.message : String(e) };
    }
  }, [pa, pb, patA, patB, settings.bhakootCancellation]);
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

  return (
    <Screen className="milan" scroll label="Guna Milan — the 36-bead mala">
      <article className="paper paper--cut sheet-col milan__sheet" aria-labelledby="milan-h">
        <TurmericBand id="milan-h" level={1} dev="गुण मिलान" title="Milan" meta="aṣṭakūṭa" />

        {loading ? null : picking ? (
          <>
            {a && !pa ? <div className="note-haldi">That leaf is not in the bundle any more. Choose two leaves.</div> : null}
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
              <ScrollFace who="first leaf" profile={pa} moon={ma} manglik={r?.manglik.a ?? null} onManglik={() => setSheet({ kind: "manglik", side: "a" })} />
              <MauliKnot />
              <ScrollFace who="second leaf" profile={pb} moon={mb} manglik={r?.manglik.b ?? null} onManglik={() => setSheet({ kind: "manglik", side: "b" })} />
            </motion.div>
            <p className="milan__swap">
              <button type="button" className="linkish" onClick={swap}>
                ⇄ Swap first and second leaf
              </button>
              <span className="milan__swaphelp">The classical tables read the two sides differently.</span>
            </p>

            {err ? (
              <div className="note-lac" role="alert">
                The mala would not count: {err}
              </div>
            ) : r ? (
              <Mala key={`${r.a}|${r.b}|${r.presetHash}|${settings.bhakootCancellation}`} result={r} onOpen={(k) => setSheet({ kind: "koota", k })} />
            ) : (
              <p className="p p--muted" role="status">
                Casting both charts…
              </p>
            )}

            {r?.porutham && r.porutham.length > 0 ? (
              <details className="porutham">
                <summary>
                  <span lang="ta">பொருத்தம்</span> · Ten Porutham <span className="porutham__meta">{r.porutham.filter((x) => x.pass).length} / {r.porutham.length}</span>
                </summary>
                <ul className="porutham__list">
                  {r.porutham.map((x) => (
                    <li key={x.id}>
                      <span className={`porutham__bead${x.pass ? " is-pass" : ""}`} aria-hidden="true" />
                      <span className="porutham__name">{x.name}</span>
                      <span className="porutham__pass">{x.pass ? "agrees" : "does not agree"}</span>
                      <span className="porutham__note">{x.note}</span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        ) : null}

        <Colophon
          rows={[
            ["Method", "Aṣṭakūṭa from the two Moons' nakṣatra, pada and rāśi — eight kūṭas, 36 points"],
            ["School", "North Indian practice after Muhūrta Cintāmaṇi ch. 6; Vaśya is the table that varies by school, and the reading follows the adopted one"],
            ["Sides", "first leaf in the first column of every table, second leaf in the second"],
            ["Bhakūṭa", settings.bhakootCancellation ? "the classical exception is applied (Drawer)" : "the classical exception is recorded, not applied (Drawer)"],
            ["Bands", "under 18 not recommended · 18–24½ acceptable · 25–32½ very good · 33–36 excellent"],
            ["Ayanāṃśa", AYANAMSA_LABEL[settings.preset.ayanamsa]],
          ]}
        >
          <p className="milan__school">A score is a tradition's arithmetic, not a verdict on two people.</p>
        </Colophon>
      </article>

      <Sheet
        open={sheet !== null}
        onClose={() => setSheet(null)}
        label={sheet?.kind === "koota" ? `${sheet.k.name} — the rule` : "Manglik — Kuja doṣa"}
      >
        {sheet?.kind === "koota" && pa && pb ? (
          <KootaSheet k={sheet.k} pa={pa} pb={pb} ma={ma} mb={mb} onClose={() => setSheet(null)} />
        ) : null}
        {sheet?.kind === "manglik" && r && pa && pb ? (
          <ManglikSheet profile={sheet.side === "a" ? pa : pb} m={sheet.side === "a" ? r.manglik.a : r.manglik.b} onClose={() => setSheet(null)} />
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
          "—"
        )}
      </dd>
    </div>
  );
}

function KootaSheet({ k, pa, pb, ma, mb, onClose }: { k: KootaResult; pa: Profile; pb: Profile; ma: MoonFacts | null; mb: MoonFacts | null; onClose: () => void }) {
  return (
    <div className="kootasheet">
      <h2 className="kootasheet__h">
        <span lang="sa" className="dev">
          {k.nameDev}
        </span>{" "}
        · {k.name} <span className="kootasheet__score mono">{fmtPts(k.score)} / {k.max}</span>
      </h2>
      <p className="p">{RULE_TEXT[k.id]}</p>
      <dl className="kootasheet__dl">
        <MoonLine who="First leaf" p={pa} m={ma} />
        <MoonLine who="Second leaf" p={pb} m={mb} />
        <div className="row">
          <dt>Because</dt>
          <dd>{becauseBody(k)}</dd>
        </div>
        <div className="row">
          <dt>Source</dt>
          <dd>
            {k.citation.text}, {k.citation.ref}
          </dd>
        </div>
        {k.cancellation ? (
          <div className="row">
            <dt>Exception</dt>
            <dd>
              {exceptionText(k.cancellation.rule)} — {k.cancellation.applied ? "applied (Drawer setting)" : "recorded, not applied"} · {k.cancellation.citation.text},{" "}
              {k.cancellation.citation.ref}
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

function ManglikSheet({ profile, m, onClose }: { profile: Profile; m: ManglikStatus; onClose: () => void }) {
  return (
    <div className="kootasheet">
      <h2 className="kootasheet__h">
        <span lang="sa" className="dev">
          कुज दोष
        </span>{" "}
        · Manglik — {profile.name}
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

