import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { usePatri, useProfile, useSettings, useSettingsLoaded } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { Colophon } from "../../components/ui/Colophon";
import { DigitSet } from "../../components/ui/DigitSet";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { useHold } from "../../components/ui/useHold";
import { saveSettings } from "../../data/repo";
import {
  GRAHA_ABBR_LAT,
  GRAHA_ENGLISH,
  GRAHA_NAMES,
  NAKSHATRA_DEV,
  NAKSHATRA_NAMES,
  SIGN_DEV,
  SIGN_ENGRAVED,
  SIGN_MARK,
  SIGN_NAMES,
} from "../../data/tables/names";
import { boundaryNote, PRESET_SHORT } from "../../engine/boundary";
import { formatDms } from "../../engine/math";
import { addVarga } from "../../engine/patri";
import { formatOffset } from "../../engine/time";
import { type EnginePreset, type GrahaId, type Patri, PRESET_HASH, type VargaNumber, type YogaHit } from "../../engine/types";
import { VARGA_NAMES } from "../../engine/vargas";
import { haptics } from "../../platform/haptics";
import { isNative, reducedMotion } from "../../platform/native";
import { play, rustle } from "../../platform/sound";
import { CosmicProfile } from "../cosmic/CosmicProfile";
import { MeetGrahas } from "../cosmic/MeetGrahas";
import { GocharSection } from "../gochar";
import { ChartFigure } from "./ChartFigure";
import { DashaRibbon } from "./DashaRibbon";
import { AshtakavargaSection } from "./extras/AshtakavargaSection";
import { BhavaChalitTable } from "./extras/BhavaChalitTable";
import { GrahaLedger } from "./GrahaLedger";
import { KundliChart } from "./KundliChart";
import { TimeUnknownNote } from "./TimeUnknownNote";
import "./patri.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const PAGER: VargaNumber[] = [9, 2, 3, 7, 10, 12, 30, 60];
const SPRING = "linear(0, 0.36 10%, 0.78 21%, 1.02 34%, 1.06 42%, 1.01 58%, 0.99 74%, 1)";
const drawn = new Set<string>(); // charts already inked this session: a revisit renders, it does not redraw

const presetLabel = (p: EnginePreset) =>
  `Lahiri ${p.ayanamsa === "se-true" ? "(SE, nutation-inclusive)" : p.ayanamsa === "se-mean" ? "(SE mean)" : "(Drik-compatible mean)"}`;

function hhmmss(ms: number, zone: string, secs = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(secs ? { second: "2-digit" } : {}),
    hour12: false,
    timeZone: zone,
  }).format(ms);
}
function fullDate(ms: number, zone: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: zone }).format(ms);
}

type Foot =
  | { kind: "boundary"; id: GrahaId | "LAGNA" }
  | { kind: "yoga"; hit: YogaHit }
  | { kind: "anga"; title: string; endMs: number | null; detail: string }
  | null;

export default function PatriScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useProfile(id);
  const settings = useSettings();
  const loadedSettings = useSettingsLoaded();
  // The preset this scroll was cast under: taken once the stored settings have loaded, then kept
  // until the seal is held — a later Drawer change shows the haldi "recompute" tab instead.
  const [rendered, setRendered] = useState<EnginePreset | null>(null);
  useEffect(() => {
    if (loadedSettings && !rendered) setRendered(loadedSettings.preset);
  }, [loadedSettings, rendered]);
  const [nonce, setNonce] = useState(0);
  const { patri, error } = usePatri(rendered ? profile : undefined, rendered ?? settings.preset, nonce);
  const [lit, setLit] = useState<GrahaId | null>(null);
  const [varga, setVarga] = useState<VargaNumber>(9);
  const [foot, setFoot] = useState<Foot>(null);
  const [style, setStyle] = useState(settings.chartStyle);
  const port = useRef<HTMLDivElement>(null);
  const sheet = useRef<HTMLDivElement>(null);
  const topRoll = useRef<HTMLDivElement>(null);
  const botRoll = useRef<HTMLDivElement>(null);
  const topCurl = useRef<HTMLDivElement>(null);
  const botCurl = useRef<HTMLDivElement>(null);
  const ring = useRef<SVGCircleElement>(null);
  const sealBtn = useRef<HTMLButtonElement>(null);
  const pull = useRef(0);
  const lastScroll = useRef({ y: 0, t: 0 });
  const lastTouch = useRef<{ y: number; top: boolean } | null>(null);
  const wheelT = useRef(0);
  const nowMs = useNowMs(60_000);

  useEffect(() => setStyle(settings.chartStyle), [settings.chartStyle]);
  useEffect(() => {
    if (profile && settings.activeProfileId !== profile.id) void saveSettings({ activeProfileId: profile.id });
  }, [profile, settings.activeProfileId]);

  const stale = rendered !== null && PRESET_HASH(rendered) !== PRESET_HASH(settings.preset);
  const inkKey = patri ? `${patri.profileId}|${patri.presetHash}|${patri.computedAt}` : "";
  const skipInk = useMemo(() => {
    if (!inkKey) return false;
    const seen = drawn.has(inkKey);
    drawn.add(inkKey);
    return seen;
  }, [inkKey]);

  // unroll: roller diameters are a function of scroll progress, transform-only, no easing.
  const unroll = useCallback(() => {
    const el = port.current;
    if (!el) return;
    const max = el.scrollHeight - el.clientHeight;
    const p = max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
    if (!reducedMotion()) {
      if (topRoll.current) topRoll.current.style.transform = `scaleY(${(1 + 0.35 * p).toFixed(3)})`;
      if (botRoll.current) botRoll.current.style.transform = `scaleY(${(1.35 - 0.35 * p).toFixed(3)})`;
      if (topCurl.current) topCurl.current.style.transform = `translateX(${(-40 + p * 200).toFixed(1)}%)`;
      if (botCurl.current) botCurl.current.style.transform = `translateX(${(160 - p * 200).toFixed(1)}%)`;
    }
    const now = performance.now();
    const v = ((el.scrollTop - lastScroll.current.y) / Math.max(1, now - lastScroll.current.t)) * 1000;
    lastScroll.current = { y: el.scrollTop, t: now };
    rustle(v);
  }, []);
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new patri changes the scroll length
  useEffect(() => {
    requestAnimationFrame(unroll);
  }, [unroll, patri]);

  const setPull = (v: number) => {
    pull.current = v;
    if (sheet.current) sheet.current.style.transform = v ? `translateY(${v}px)` : "";
  };
  const releasePull = () => {
    const from = pull.current;
    if (!from) return;
    setPull(0);
    if (!reducedMotion())
      sheet.current?.animate([{ transform: `translateY(${from}px)` }, { transform: "none" }], { duration: 480, easing: SPRING });
    haptics.impact("light");
  };

  const sealHold = useHold({
    ms: 600,
    onProgress: (k) => {
      ring.current?.setAttribute("stroke-dashoffset", String(1 - k));
      if (sealBtn.current) sealBtn.current.style.transform = k > 0 ? `scale(${1 - 0.06 * k})` : "";
    },
    onFire: () => {
      sealBtn.current?.animate([{ transform: "scale(1.08)" }, { transform: "scale(1)" }], {
        duration: reducedMotion() ? 160 : 480,
        easing: SPRING,
      });
      play("thunk");
      haptics.impact("medium");
      setRendered(settings.preset);
      setNonce((n) => n + 1);
    },
  });

  const vchart = useMemo(() => {
    if (!patri) return null;
    const p = patri.vargas[varga] ? patri : addVarga(patri, varga);
    return p.vargas[varga] ?? null;
  }, [patri, varga]);

  if (profile === null) {
    return (
      <Screen scroll label="Person not found">
        <div className="paper sheet-col" style={{ marginTop: "var(--space-9)" }}>
          <TurmericBand title="Person not found" level={1} />
          <p className="p">This person is not saved on this device.</p>
          <p className="p">
            <Link className="linkish" to="/">
              Back home
            </Link>
          </p>
        </div>
      </Screen>
    );
  }

  const b = profile?.birth;

  return (
    <Screen className="patri" label={profile ? `Janam Patri of ${profile.name}` : "Janam Patri"}>
      <div className="roller roller--top" aria-hidden="true" data-decorative="true">
        <div className="roller__body" ref={topRoll}>
          <div className="roller__curl" ref={topCurl} />
        </div>
        <div className="roller__cap roller__cap--l" />
        <div className="roller__cap roller__cap--r" />
      </div>

      <div
        className="scrollport"
        ref={port}
        onScroll={() => requestAnimationFrame(unroll)}
        onTouchStart={(e) => {
          const t = e.touches[0];
          if (t) lastTouch.current = { y: t.clientY, top: (port.current?.scrollTop ?? 1) <= 0 };
        }}
        onTouchMove={(e) => {
          const t = e.touches[0];
          const s = lastTouch.current;
          if (!t || !s?.top) return;
          const dy = t.clientY - s.y;
          if (dy > 0 && (port.current?.scrollTop ?? 1) <= 0) setPull(Math.min(96, dy * 0.55));
        }}
        onTouchEnd={() => {
          if (pull.current > 80) play("creak");
          releasePull();
        }}
        onWheel={(e) => {
          if ((port.current?.scrollTop ?? 1) > 0 || e.deltaY >= 0) return;
          setPull(Math.min(96, pull.current + Math.abs(e.deltaY) * 0.5));
          clearTimeout(wheelT.current);
          wheelT.current = window.setTimeout(releasePull, 520);
        }}
      >
        <div className="sheet" ref={sheet}>
          <div className="seal-slot">
            <button
              type="button"
              ref={sealBtn}
              className={`seal${error ? " is-cracked" : ""}`}
              aria-label={stale ? "Presets changed. Hold to recompute this chart" : "Hold to recompute this chart"}
              onFocus={() => setPull(96)}
              onBlur={releasePull}
              {...sealHold}
            >
              <svg width="46" height="46" viewBox="0 0 46 46" aria-hidden="true">
                {patri ? (
                  <text
                    x="23"
                    y="29"
                    textAnchor="middle"
                    fill="var(--lac-text)"
                    style={{ fontFamily: "var(--font-display)", fontSize: 15 }}
                    lang="hi"
                  >
                    {(NAKSHATRA_DEV[patri.grahas.MO.nakshatra] ?? "").slice(0, 2)}
                  </text>
                ) : null}
                <circle cx="23" cy="23" r="19" fill="none" stroke="var(--lac-text)" strokeWidth="1" opacity=".6" />
              </svg>
              <svg className="ring" viewBox="0 0 100 100" aria-hidden="true">
                <circle
                  ref={ring}
                  cx="50"
                  cy="50"
                  r="47"
                  fill="none"
                  stroke="var(--brass)"
                  strokeWidth="4"
                  pathLength={1}
                  strokeDasharray="1"
                  strokeDashoffset="1"
                  strokeLinecap="round"
                  transform="rotate(-90 50 50)"
                />
              </svg>
              {stale ? <span className="seal__tab">recompute</span> : null}
            </button>
          </div>

          <div className="paper paper--cut">
            <header className="patri-head">
              <h1>
                <span lang="hi" className="dev">
                  जन्म पत्री
                </span>{" "}
                · {profile?.name ?? ""}
              </h1>
              {b ? (
                <p className="birthline">
                  {b.localD} {MONTHS[b.localMo - 1]} {b.localY} · {String(b.localH).padStart(2, "0")}:{String(b.localMi).padStart(2, "0")}{" "}
                  local · {[b.place.name, b.place.admin1, b.place.country].filter(Boolean).join(", ")}
                </p>
              ) : null}
              {b && patri ? (
                <div className="engraved">
                  <b>{b.zone.toUpperCase()}</b>
                  <span className="sep">·</span>
                  <span>
                    {formatOffset(b.offsetMin)}
                    {b.offsetSource === "override" ? " (manual)" : ""}
                  </span>
                  <span className="sep">·</span>
                  <span>
                    JD <DigitSet text={patri.jdUt.toFixed(4)} />
                  </span>
                  <span className="sep">·</span>
                  <span>
                    LAGNA {SIGN_MARK[patri.lagna.sign]} <b>{SIGN_ENGRAVED[patri.lagna.sign]}</b>
                  </span>
                </div>
              ) : null}
              {error ? (
                <p className="note-lac" role="alert" style={{ margin: "var(--space-3) 0 0" }}>
                  <span aria-hidden="true">⚑</span>
                  <span>Something went wrong: {error.message}. The last chart stays on screen.</span>
                </p>
              ) : null}
              {profile?.timeUnknown && patri ? <TimeUnknownNote profile={profile} patri={patri} /> : null}
              {stale ? (
                <p className="note-haldi" style={{ margin: "var(--space-3) 0 0" }}>
                  <span aria-hidden="true">⚑</span>
                  <span>The presets changed in Settings. Pull down and hold the recompute button to update this chart.</span>
                </p>
              ) : null}
            </header>

            {patri && profile && patri.profileId === profile.id ? (
              <div className="patri-cosmic">
                <Link to={`/forecast/${profile.id}`} className="patri-forecast">
                  <span className="patri-forecast__k">Forecast</span>
                  <span className="patri-forecast__t">What the sky holds for {profile.name}</span>
                  <span className="patri-forecast__s">Day · week · month · quarter · year →</span>
                </Link>
              </div>
            ) : null}

            {patri && b ? (
              <PatriBody
                patri={patri}
                zone={b.zone}
                style={style}
                script={settings.chartScript}
                inkKey={inkKey}
                skipInk={skipInk}
                lit={lit}
                setLit={setLit}
                onFlip={() => setStyle((s) => (s === "north" ? "south" : "north"))}
                varga={varga}
                setVarga={setVarga}
                vchart={vchart}
                setFoot={setFoot}
                nowMs={nowMs}
                profileId={profile?.id ?? ""}
                devDigits={settings.devanagariDigits}
                name={profile?.name ?? ""}
              />
            ) : (
              <div className="figure" aria-busy="true">
                <svg className="chart" viewBox="-4 -4 408 408" aria-label="The patri is being written">
                  <path className="stroke stroke--faint" d="M2 2H398V398H2Z" />
                </svg>
              </div>
            )}

            {patri && profile && patri.profileId === profile.id ? (
              <div className="patri-cosmic">
                <CosmicProfile profile={profile} patri={patri} />
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="roller roller--bot" aria-hidden="true" data-decorative="true">
        <div className="roller__body" ref={botRoll}>
          <div className="roller__curl" ref={botCurl} />
        </div>
        <div className="roller__cap roller__cap--l" />
        <div className="roller__cap roller__cap--r" />
      </div>

      <Sheet open={foot !== null} onClose={() => setFoot(null)} label="Footnote">
        {foot && patri ? (
          <FootBody
            foot={foot}
            patri={patri}
            zone={b?.zone ?? "UTC"}
            onShow={(g) => {
              setFoot(null);
              setLit(g);
            }}
          />
        ) : null}
        <div className="tools" style={{ paddingBottom: "var(--space-3)" }}>
          <button type="button" className="linkish" onClick={() => setFoot(null)}>
            Close
          </button>
          {foot?.kind === "yoga" ? null : (
            <button type="button" className="linkish" onClick={() => navigate("/drawer")}>
              Presets in Settings
            </button>
          )}
        </div>
      </Sheet>
    </Screen>
  );
}

interface BodyProps {
  patri: Patri;
  zone: string;
  style: "north" | "south";
  script: "devanagari" | "latin";
  inkKey: string;
  skipInk: boolean;
  lit: GrahaId | null;
  setLit: (g: GrahaId | null) => void;
  onFlip: () => void;
  varga: VargaNumber;
  setVarga: (v: VargaNumber) => void;
  vchart: Patri["vargas"][VargaNumber] | null;
  setFoot: (f: Foot) => void;
  nowMs: number;
  profileId: string;
  devDigits: boolean;
  name: string;
}

function PatriBody({
  patri,
  zone,
  style,
  script,
  inkKey,
  skipInk,
  lit,
  setLit,
  onFlip,
  varga,
  setVarga,
  vchart,
  setFoot,
  nowMs,
  profileId,
  devDigits,
  name,
}: BodyProps) {
  const pc = patri.birthPanchang;
  const p = patri.preset;
  const moon = patri.grahas.MO;
  const row = (k: string, v: React.ReactNode, end: string, title: string, endMs: number | null, detail: string) => (
    <button type="button" className="row row--button" key={k} onClick={() => setFoot({ kind: "anga", title, endMs, detail })}>
      <span className="k">{k}</span>
      <span className="v">{v}</span>
      {end ? <span className="end">{end}</span> : null}
    </button>
  );

  return (
    <>
      <TurmericBand dev="जन्म पंचांग" title="Birth almanac" explain="panchang" meta={`sunrise ${hhmmss(pc.sunriseMs, zone)}`} />
      <div className="rows">
        {row(
          "Tithi",
          pc.tithi.name,
          `no. ${pc.tithi.index}`,
          `Tithi: ${pc.tithi.name}`,
          pc.tithi.endMs,
          `Moon − Sun elongation ${pc.elongation.toFixed(4)}° at birth; each tithi is 12°.`,
        )}
        {row(
          "Vāra",
          pc.vara.name,
          `sunrise ${hhmmss(pc.sunriseMs, zone)}`,
          `Vāra: ${pc.vara.name}`,
          null,
          "The weekday of the governing sunrise, not of the calendar date.",
        )}
        {row(
          "Nakṣatra",
          <>
            {NAKSHATRA_NAMES[pc.nakshatra.index]} ·{" "}
            <span lang="hi" className="dev">
              {NAKSHATRA_DEV[pc.nakshatra.index]}
            </span>
          </>,
          `pada ${pc.nakshatra.pada}`,
          `Nakṣatra: ${NAKSHATRA_NAMES[pc.nakshatra.index]}`,
          pc.nakshatra.endMs,
          "The Moon's sidereal mansion; each is 13°20′, each pada 3°20′.",
        )}
        {row(
          "Yoga",
          pc.yoga.name,
          `no. ${pc.yoga.index}`,
          `Yoga: ${pc.yoga.name}`,
          pc.yoga.endMs,
          "Sun + Moon sidereal longitudes, in 13°20′ steps.",
        )}
        {row(
          "Karaṇa",
          pc.karana.name,
          `half-tithi ${pc.karana.index}`,
          `Karaṇa: ${pc.karana.name}`,
          pc.karana.endMs,
          "Half a tithi: 6° of elongation.",
        )}
        {row(
          "Candra",
          <>
            {SIGN_NAMES[moon.sign]} ·{" "}
            <span lang="hi" className="dev">
              {SIGN_DEV[moon.sign]}
            </span>
          </>,
          `${(pc.moonIllumination * 100).toFixed(1)}% lit`,
          "Candra rāśi",
          null,
          `The Moon's illumination at birth was ${(pc.moonIllumination * 100).toFixed(1)}%.`,
        )}
      </div>

      <TurmericBand
        dev="राशि चक्र"
        title="Fig. 1: D1 birth chart"
        explain="patri"
        meta={style === "north" ? "whole sign · north" : "whole sign · south"}
      />
      <div className="figure">
        <ChartFigure
          patri={patri}
          style={style}
          script={script}
          inkKey={inkKey}
          skipInk={skipInk}
          lit={lit}
          onLit={setLit}
          onFlip={onFlip}
        />
      </div>
      <p className="figcap">
        Fig. 1. Rāśi (D1), {presetLabel(p)}, whole-sign houses, {p.node} node. Ayanāṃśa at birth {formatDms(patri.ayanamsa)}. The tilak
        marks the Lagna in {SIGN_NAMES[patri.lagna.sign]} {formatDms(patri.lagna.degInSign)}.
      </p>

      <TurmericBand dev="ग्रह" title="Grahas · planets" explain="graha" meta={`sidereal · ${PRESET_SHORT[p.ayanamsa]}`} />
      <GrahaLedger
        devDigits={devDigits}
        patri={patri}
        lit={lit}
        onRead={(g) => setLit(g)}
        onBoundary={(id) => setFoot({ kind: "boundary", id })}
      />
      <MeetGrahas patri={patri} />
      {Object.values(patri.grahas).some((g) => g.boundary) || patri.lagna.boundary ? (
        <p className="note-haldi note--keep">
          <span aria-hidden="true">⚑</span>
          <span>An asterisk marks a body within 2′ of a sign, nakṣatra or pada edge. Tap it to see what the other presets would read.</span>
        </p>
      ) : null}

      <TurmericBand dev="वर्ग" title={`Fig. 2: D${varga}`} explain="varga" meta={VARGA_NAMES[varga]} plain level={3} />
      <div className="varga-pager" role="tablist" aria-label="Divisional charts">
        {PAGER.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={v === varga}
            onClick={() => {
              setVarga(v);
              play("tick");
              haptics.selection();
            }}
          >
            D{v}
          </button>
        ))}
      </div>
      {vchart ? (
        <>
          <div className="figure">
            <div className="chart-wrap d9-wrap">
              <KundliChart
                title={`${VARGA_NAMES[varga]} chart D${varga}`}
                style={style}
                script={script}
                lagnaSign={vchart.ascendantSign}
                bodies={(Object.keys(vchart.placements) as GrahaId[]).map((g) => ({
                  id: g,
                  sign: vchart.placements[g],
                  retro: patri.grahas[g].retrograde,
                }))}
                showDegrees={false}
                inkKey={`${inkKey}|D${varga}`}
                skipInk={skipInk}
              />
            </div>
          </div>
          <p className="figcap">
            Fig. 2. {VARGA_NAMES[varga]} (D{varga}), {presetLabel(p)}. The Lagna falls in {SIGN_NAMES[vchart.ascendantSign]}.
          </p>
        </>
      ) : null}

      <TurmericBand dev="दशा" title="Viṃśottarī daśā · life chapters" explain="dasha" meta={`${p.dashaYearDays} d year`} />
      <DashaRibbon tree={patri.dasha} nowMs={nowMs} zone={zone} yearDays={p.dashaYearDays} />
      <table className="ledger print-only" aria-hidden="true">
        <tbody>
          {patri.dasha.map((md) => (
            <tr key={md.startMs}>
              <td>{GRAHA_NAMES[md.lord]}</td>
              <td className="num">
                {fullDate(md.startMs, zone)} → {fullDate(md.endMs, zone)}
              </td>
              <td className="pd">{(md.children ?? []).map((ad) => GRAHA_ABBR_LAT[ad.lord]).join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <TurmericBand
        dev="योग"
        title="Yogas · planet patterns"
        explain="yoga-chart"
        meta={`${patri.yogas.filter((y) => y.strength !== "cancelled").length} formed`}
      />
      {patri.yogas.length === 0 ? <p className="p p--muted">No classical yoga in the rule set fires for this chart.</p> : null}
      {patri.yogas.map((y, yi) => (
        <section key={y.id} className={`yoga${y.strength === "cancelled" ? " is-cancelled" : ""}`} aria-label={y.name}>
          <h3>
            {y.name}{" "}
            <span lang="hi" className="dev">
              {y.nameDev}
            </span>
            {y.strength !== "full" ? <span className="strength">{y.strength}</span> : null}
          </h3>
          <p>
            {y.reading}
            <button
              type="button"
              className="cite"
              aria-label={`Citation: ${y.citation.text} ${y.citation.ref}`}
              onClick={() => setFoot({ kind: "yoga", hit: y })}
            >
              {yi + 1}
            </button>
          </p>
          <p className="src">
            {y.citation.text} {y.citation.ref}
            {y.cancelledBy ? ` · cancelled by ${y.cancelledBy}` : ""}
          </p>
        </section>
      ))}

      <GocharSection patri={patri} nowMs={nowMs} zone={zone} />
      <AshtakavargaSection patri={patri} script={script} style={style} skipInk={skipInk} />
      <BhavaChalitTable patri={patri} />

      <div className="patri-links">
        <Link className="linkish" to={`/patri/${profileId}/sky`}>
          The birth sky from the rooftop ⇧
        </Link>
        <Link className="linkish" to={`/hast/${profileId}`}>
          Palm (Hast Rekha)
        </Link>
        <Link className="linkish" to="/circle">
          Guna Milan with another person
        </Link>
        <Link className="linkish" to={`/leaf/${profileId}/edit`}>
          Edit birth details
        </Link>
        {isNative() ? null : (
          <button
            type="button"
            className="linkish"
            onClick={() => {
              const before = document.title;
              document.title = `Janam Patri: ${name}`;
              window.addEventListener("afterprint", () => (document.title = before), { once: true });
              window.print();
            }}
          >
            Print · save as PDF
          </button>
        )}
      </div>

      <Colophon
        rows={[
          ["Engine", `astronomy-engine ${patri.engine.version} (MIT) · ±1′`],
          ["Ayanāṃśa", `${presetLabel(p)} · ${formatDms(patri.ayanamsa)}`],
          ["Node", `${p.node === "true" ? "true (osculating)" : "mean"} Rāhu/Ketu`],
          ["Houses", `whole-sign (Rāśi); daśā year ${p.dashaYearDays} days`],
          ["Sunrise", p.sunrise === "upper-limb-refracted" ? "upper limb + refraction" : "disc centre, no refraction"],
          ["Julian Day", `${patri.jdUt.toFixed(6)} UT · ${patri.jdTt.toFixed(6)} TT`],
          ["Cast", `${patri.computeMs.toFixed(1)} ms on this device · ${fullDate(patri.computedAt, zone)}`],
          ["Gazetteer", "GeoNames (CC BY 4.0)"],
        ]}
      />
    </>
  );
}

function FootBody({ foot, patri, zone, onShow }: { foot: NonNullable<Foot>; patri: Patri; zone: string; onShow: (g: GrahaId) => void }) {
  if (foot.kind === "boundary") {
    const isL = foot.id === "LAGNA";
    const lonTrop = isL ? patri.lagna.lonTropical : patri.grahas[foot.id as GrahaId].lonTropical;
    const note = boundaryNote(lonTrop, patri.jdTt, patri.preset.ayanamsa);
    const name = isL ? "Lagna" : GRAHA_ENGLISH[foot.id as GrahaId];
    return (
      <div className="sheet-body">
        <TurmericBand title={`${name}: near a boundary`} level={2} />
        <p className="p">{note ? `${name} stands ${note.text}.` : `${name} is not within reach of another preset's edge.`}</p>
        <ul className="foot-list">
          <li>
            <span className="k">Active preset:</span> {PRESET_SHORT[patri.preset.ayanamsa]} ({formatDms(patri.ayanamsa)})
          </li>
          {note?.flips.map((f) => (
            <li key={f.preset}>
              <span className="k">{PRESET_SHORT[f.preset]} would read:</span> {f.reads}
            </li>
          ))}
        </ul>
        <p className="p p--muted">
          The three Lahiri presets differ by up to 41″; a body this close to an edge is classified honestly, not hidden.
        </p>
      </div>
    );
  }
  if (foot.kind === "yoga") {
    const y = foot.hit;
    return (
      <div className="sheet-body">
        <TurmericBand title={y.name} meta={`${y.citation.text} ${y.citation.ref}`} level={2} />
        <p className="p">{y.reading}</p>
        <ul className="foot-list">
          {y.because.map((e) => (
            <li key={e.note}>
              {e.grahaId ? (
                <button type="button" className="linkish" onClick={() => e.grahaId && onShow(e.grahaId)}>
                  {e.note}. Show me
                </button>
              ) : (
                e.note
              )}
            </li>
          ))}
        </ul>
        <p className="p p--muted">
          Source: {y.citation.text}, {y.citation.ref}. Tradition is recorded here, not prescribed.
        </p>
      </div>
    );
  }
  return (
    <div className="sheet-body">
      <TurmericBand title={foot.title} level={2} />
      <p className="p">{foot.detail}</p>
      {foot.endMs ? (
        <p className="p">
          Ends{" "}
          <span className="mono">
            {fullDate(foot.endMs, zone)} {hhmmss(foot.endMs, zone, true)}
          </span>{" "}
          ({zone}).
        </p>
      ) : null}
      <p className="p p--muted">
        Sunrise convention: {patri.preset.sunrise === "upper-limb-refracted" ? "upper limb with refraction" : "disc centre"} · ayanāṃśa{" "}
        {PRESET_SHORT[patri.preset.ayanamsa]}.
      </p>
    </div>
  );
}
