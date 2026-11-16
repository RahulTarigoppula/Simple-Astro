// The Chart tab, #/patri/:id. Four views so it is never one endless scroll:
//   About you (the reading in simple words) · Life chapters (daśā) · Planets (the kundli, the planet
//   table and folds for the deep material; ?v=chart) · Now (today in one sentence, Saturn's seasons).
// The view lives in the URL (?v=). Nothing is computed until its view, or its fold, is opened.
import { useEffect, useId, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { usePatri, useProfile, useSettings, useSettingsLoaded } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { Colophon } from "../../components/ui/Colophon";
import { InfoDot } from "../../components/ui/Explain";
import { ChevronRight, Page, Row, Section } from "../../components/ui/Page";
import { Sheet } from "../../components/ui/Sheet";
import { chartStyleFor, nakBoth, rashiBoth, type Tradition } from "../../data/regional";
import { saveSettings } from "../../data/repo";
import { GRAHA_ABBR_LAT, GRAHA_ENGLISH, GRAHA_NAMES, NAKSHATRA_NAMES, SIGN_NAMES } from "../../data/tables/names";
import { boundaryNote, PRESET_SHORT } from "../../engine/boundary";
import { formatDms } from "../../engine/math";
import { addVarga } from "../../engine/patri";
import { formatClock12, formatClock24, formatOffset, safeZone } from "../../engine/time";
import {
  type EnginePreset,
  type GrahaId,
  type Patri,
  PRESET_HASH,
  type Profile,
  type Settings,
  type VargaNumber,
  type YogaHit,
} from "../../engine/types";
import { VARGA_NAMES } from "../../engine/vargas";
import { haptics } from "../../platform/haptics";
import { isNative } from "../../platform/native";
import { IconChart, IconForecast } from "../chowki/icons";
import { LifeReading } from "../cosmic/LifeReading";
import { MeetGrahas } from "../cosmic/MeetGrahas";
import { DailyStrengthCard, GocharSection } from "../gochar";
import { reckonSadeSati } from "../gochar/GocharSection";
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
const drawn = new Set<string>(); // charts already drawn this session: a revisit renders, it does not redraw

const VIEWS = [
  ["about", "About you"],
  ["chapters", "Life chapters"],
  ["chart", "Planets"], // the URL value stays ?v=chart
  ["now", "Now"],
] as const;
type View = (typeof VIEWS)[number][0];
const isView = (v: string | null): v is View => VIEWS.some(([k]) => k === v);

const presetLabel = (p: EnginePreset) =>
  `Lahiri ${p.ayanamsa === "se-true" ? "(SE, nutation-inclusive)" : p.ayanamsa === "se-mean" ? "(SE mean)" : "(Drik-compatible mean)"}`;

function hhmmss(ms: number, zone: string, secs = false): string {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    ...(secs ? { second: "2-digit" } : {}),
    hour12: false,
    timeZone: safeZone(zone),
  }).format(ms);
}
function fullDate(ms: number, zone: string): string {
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: safeZone(zone) }).format(ms);
}

/** "Bengaluru, Karnataka, IN" once, whether or not the gazetteer name already carries the region. */
function placeLine(b: Profile["birth"]): string {
  const out = b.place.name
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const extra of [b.place.admin1, b.place.country]) if (extra && !out.includes(extra)) out.push(extra);
  return out.join(", ");
}

type Foot =
  | { kind: "boundary"; id: GrahaId | "LAGNA" }
  | { kind: "yoga"; hit: YogaHit }
  | { kind: "anga"; title: string; endMs: number | null; detail: string }
  | null;

/** A fold whose body is not built until it is first opened (or `forced`, for print). */
function Fold({
  title,
  sub,
  forced,
  children,
}: {
  title: string;
  sub?: string;
  forced?: boolean | undefined;
  children: () => React.ReactNode;
}) {
  const [opened, setOpened] = useState(false);
  return (
    <details className="v-fold" open={forced || undefined} onToggle={(e) => e.currentTarget.open && setOpened(true)}>
      <summary>
        <span>
          {title}
          {sub ? <span className="v-fold__s">{sub}</span> : null}
        </span>
      </summary>
      {opened || forced ? <div className="v-fold__body">{children()}</div> : null}
    </details>
  );
}

export default function PatriScreen() {
  const { id } = useParams();
  const profile = useProfile(id);
  const settings = useSettings();
  const loadedSettings = useSettingsLoaded();
  // The preset this chart was worked out under: taken once the stored settings have loaded, then
  // kept. A later change in Settings (another tab) shows a note with "Work this chart out again".
  const [rendered, setRendered] = useState<EnginePreset | null>(null);
  useEffect(() => {
    if (loadedSettings && !rendered) setRendered(loadedSettings.preset);
  }, [loadedSettings, rendered]);
  const [nonce, setNonce] = useState(0);
  const { patri, error } = usePatri(rendered ? profile : undefined, rendered ?? settings.preset, nonce);
  const nowMs = useNowMs(60_000);
  const [params, setParams] = useSearchParams();
  const v = params.get("v");
  const view: View = isView(v) ? v : "about";
  const [printing, setPrinting] = useState(false);
  const panelId = useId();

  useEffect(() => {
    if (profile && settings.activeProfileId !== profile.id) void saveSettings({ activeProfileId: profile.id });
  }, [profile, settings.activeProfileId]);

  // Print lays every view out, folds open, prints, then returns to the one view.
  const name = profile?.name ?? "";
  useEffect(() => {
    if (!printing) return;
    const before = document.title;
    document.title = `Janam Patri: ${name}`;
    const done = () => setPrinting(false);
    window.addEventListener("afterprint", done, { once: true });
    const t = window.setTimeout(() => window.print(), 400);
    return () => {
      window.clearTimeout(t);
      window.removeEventListener("afterprint", done);
      document.title = before;
    };
  }, [printing, name]);

  const stale = rendered !== null && PRESET_HASH(rendered) !== PRESET_HASH(settings.preset);
  const recompute = () => {
    setRendered(settings.preset);
    setNonce((n) => n + 1);
    haptics.impact("medium");
  };
  const show = (next: View) => {
    setParams(
      (p) => {
        const q = new URLSearchParams(p);
        if (next === "about") q.delete("v");
        else q.set("v", next);
        return q;
      },
      { replace: true },
    );
    haptics.selection();
  };

  if (profile === undefined) {
    return (
      <Page label="Birth chart" eyebrow="Birth chart" wide className="pt">
        <div className="v-skel">Reading the sky…</div>
      </Page>
    );
  }
  if (profile === null) {
    return (
      <Page label="Person not found" wide className="pt">
        <section className="v-card v-empty" aria-labelledby="pt-missing-h">
          <span className="v-empty__art" aria-hidden="true">
            <IconChart size={30} />
          </span>
          <h1 id="pt-missing-h" className="v-title">
            Person not found
          </h1>
          <p className="v-lede">
            This person is not saved on this device. Their details may have been removed, or the link is from another device.
          </p>
          <div className="v-actions">
            <Link to="/leaf/new" className="v-btn">
              Add a person
            </Link>
            <Link to="/" className="v-btn v-btn--ghost">
              Go to Today
            </Link>
          </div>
        </section>
      </Page>
    );
  }

  const b = profile.birth;
  const ready = patri && patri.profileId === profile.id ? patri : null;
  const common = { profile, settings, nowMs };

  return (
    <Page
      label={`Birth chart of ${profile.name}`}
      eyebrow="Birth chart"
      title={profile.name}
      wide
      className="pt"
      lede={
        <>
          {b.localD} {MONTHS[b.localMo - 1]} {b.localY} ·{" "}
          {profile.timeUnknown
            ? "time unknown (worked out for noon)"
            : `${formatClock12(b.localH, b.localMi)} (${formatClock24(b.localH, b.localMi)})`}{" "}
          · {placeLine(b)}{" "}
          <Link to={`/leaf/${profile.id}/edit`} className="v-link pt-edit" aria-label="Edit birth details">
            Edit
          </Link>
        </>
      }
    >
      {error ? (
        <p className="v-note v-note--care" role="alert">
          <span aria-hidden="true">⚑</span>
          <span>
            Something went wrong ({error.message}). Check the birth details with Edit above.
            {ready ? " The last chart stays on screen." : ""}
          </span>
        </p>
      ) : null}
      {profile.timeUnknown && ready ? <TimeUnknownNote profile={profile} patri={ready} /> : null}
      {stale ? (
        <div className="v-note v-note--warn pt-stale">
          <span>Settings changed in another tab. This chart still uses the earlier ones.</span>
          <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={recompute}>
            Work this chart out again
          </button>
        </div>
      ) : null}

      {!ready ? (
        error ? (
          <section className="v-card v-empty" aria-label="The chart could not be worked out">
            <span className="v-empty__art" aria-hidden="true">
              <IconChart size={30} />
            </span>
            <p className="v-lede">The chart could not be worked out from these birth details.</p>
            <div className="v-actions">
              <Link to={`/leaf/${profile.id}/edit`} className="v-btn">
                Edit birth details
              </Link>
              <button type="button" className="v-btn v-btn--ghost" onClick={recompute}>
                Try again
              </button>
            </div>
          </section>
        ) : (
          <div className="v-skel" aria-busy="true">
            Reading the sky…
          </div>
        )
      ) : printing ? (
        <>
          <p className="v-note pt-printing">Laying out every view for printing…</p>
          {VIEWS.map(([k, label]) => (
            <section key={k} className="pt-view pt-view--print" aria-label={label}>
              <h2 className="pt-printh">{label}</h2>
              <ViewBody view={k} {...common} patri={ready} printing onShow={show} onRecompute={recompute} onPrint={() => {}} />
            </section>
          ))}
        </>
      ) : (
        <>
          <div className="v-seg pt-seg" role="tablist" aria-label="Views of this chart">
            {VIEWS.map(([k, label], i) => (
              <button
                key={k}
                type="button"
                role="tab"
                id={`${panelId}-${k}`}
                aria-selected={k === view}
                aria-controls={panelId}
                tabIndex={k === view ? 0 : -1}
                onClick={() => show(k)}
                onKeyDown={(e) => {
                  const j = e.key === "ArrowRight" ? i + 1 : e.key === "ArrowLeft" ? i - 1 : -1;
                  const to = VIEWS[j];
                  if (!to) return;
                  e.preventDefault();
                  show(to[0]);
                  (e.currentTarget.parentElement?.children[j] as HTMLElement | undefined)?.focus();
                }}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="pt-view" role="tabpanel" id={panelId} aria-labelledby={`${panelId}-${view}`} key={view}>
            <ViewBody
              view={view}
              {...common}
              patri={ready}
              onShow={show}
              onRecompute={recompute}
              onPrint={() => {
                reckonSadeSati(ready);
                setPrinting(true);
              }}
            />
          </div>
        </>
      )}
    </Page>
  );
}

interface ViewProps {
  view: View;
  profile: Profile;
  patri: Patri;
  settings: Settings;
  nowMs: number;
  printing?: boolean;
  onShow: (v: View) => void;
  onRecompute: () => void;
  onPrint: () => void;
}

function ViewBody(p: ViewProps) {
  const zone = p.profile.birth.zone;
  switch (p.view) {
    case "about":
      return <LifeReading profile={p.profile} patri={p.patri} nowMs={p.nowMs} onChapters={() => p.onShow("chapters")} />;
    case "chapters":
      return (
        <>
          <DashaRibbon tree={p.patri.dasha} nowMs={p.nowMs} zone={zone} yearDays={p.patri.preset.dashaYearDays} />
          <table className="ledger print-only" aria-hidden="true">
            <tbody>
              {p.patri.dasha.map((md) => (
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
          <p className="v-foot">
            Dates use a year of {p.patri.preset.dashaYearDays} days and are shown for {zone}. A chapter is a theme tradition reads into
            those years, for reflection; it is not a prediction.{" "}
            <Link to={`/forecast/${p.profile.id}`}>See the forecast for the days ahead</Link>.
          </p>
        </>
      );
    case "chart":
      return <ChartView {...p} />;
    case "now":
      return (
        <>
          <DailyStrengthCard patri={p.patri} nowMs={p.nowMs} zone={zone} />
          <GocharSection patri={p.patri} nowMs={p.nowMs} zone={zone} forceOpen={!!p.printing} />
          <ul className="v-list">
            <li>
              <Row
                to={`/forecast/${p.profile.id}`}
                icon={<IconForecast />}
                title="What this means for your days"
                sub="The forecast in plain words: day, week, month and year"
              />
            </li>
          </ul>
        </>
      );
  }
}

function ChartView({ profile, patri, settings, printing, onRecompute, onPrint }: ViewProps) {
  const b = profile.birth;
  const zone = b.zone;
  const tradition = profile.tradition;
  const p = patri.preset;
  const [lit, setLit] = useState<GrahaId | null>(null);
  const [foot, setFoot] = useState<Foot>(null);
  const personStyle = chartStyleFor(tradition);
  const [style, setStyle] = useState(personStyle ?? settings.chartStyle);
  useEffect(() => setStyle(personStyle ?? settings.chartStyle), [personStyle, settings.chartStyle]);
  const script = tradition === "telugu" || tradition === "tamil" ? "latin" : settings.chartScript;

  const inkKey = `${patri.profileId}|${patri.presetHash}|${patri.computedAt}`;
  const skipInk = useMemo(() => {
    const seen = drawn.has(inkKey);
    drawn.add(inkKey);
    return seen;
  }, [inkKey]);

  const formed = patri.yogas.filter((y) => y.strength !== "cancelled").length;
  const nearEdge = Object.values(patri.grahas).some((g) => g.boundary) || patri.lagna.boundary;

  return (
    <>
      <div className="v-cols">
        <section className="v-card pt-fig" aria-labelledby="pt-fig-h">
          <h2 id="pt-fig-h" className="pt-h">
            Birth chart <InfoDot id="patri" label="the birth chart" />
          </h2>
          <p className="v-card__sub">Where the planets stood at the moment of birth. Touch one to read it.</p>
          <ChartFigure
            patri={patri}
            style={style}
            script={script}
            inkKey={inkKey}
            skipInk={skipInk || !!printing}
            lit={lit}
            onLit={setLit}
            onFlip={() => setStyle((s) => (s === "north" ? "south" : "north"))}
          />
          <p className="pt-cap">
            The gold mark is the rising sign (Lagna), {SIGN_NAMES[patri.lagna.sign]} {formatDms(patri.lagna.degInSign)}. Sanskrit: Rāśi
            chart (D1), whole-sign houses.
          </p>
        </section>

        <section className="v-card pt-planets" aria-labelledby="pt-planets-h">
          <h2 id="pt-planets-h" className="pt-h">
            The nine planets <InfoDot id="graha" label="graha" />
          </h2>
          <p className="v-card__sub">Sign, degree and star for each. Tap a row to light it on the chart.</p>
          <div className="pt-scroll">
            <GrahaLedger
              devDigits={settings.devanagariDigits}
              tradition={tradition}
              patri={patri}
              lit={lit}
              onRead={(g) => setLit(g)}
              onBoundary={(id) => setFoot({ kind: "boundary", id })}
            />
          </div>
          {nearEdge ? (
            <p className="pt-cap">
              An asterisk marks a body within 2′ of a sign, star or quarter edge: tap it to see what the other presets would read.
            </p>
          ) : null}
        </section>
      </div>

      <section className="v-card" aria-label="Meet the planets">
        <MeetGrahas patri={patri} />
      </section>

      <Section title="Full detail" />
      <div className="pt-folds">
        <Fold
          title="Birth almanac"
          sub={`Pañcāṅga: the lunar day, weekday and star at birth · sunrise ${hhmmss(patri.birthPanchang.sunriseMs, zone)}`}
          forced={printing}
        >
          {() => <Almanac patri={patri} zone={zone} tradition={tradition} setFoot={setFoot} />}
        </Fold>
        <Fold title="Divisional charts" sub="Varga: Navāṃśa (D9) and seven more finer charts" forced={printing}>
          {() => <Vargas patri={patri} style={style} script={script} inkKey={inkKey} skipInk={skipInk || !!printing} />}
        </Fold>
        <Fold title="Planet patterns" sub={`Yoga: ${formed} formed in this chart`} forced={printing}>
          {() => <Yogas patri={patri} setFoot={setFoot} />}
        </Fold>
        <Fold title="Strength points" sub="Aṣṭakavarga: how much support each sign holds" forced={printing}>
          {() => <AshtakavargaSection patri={patri} script={script} style={style} skipInk={skipInk || !!printing} />}
        </Fold>
        <Fold title="House cusps" sub="Bhāva Chalit: where each house starts and ends by degree" forced={printing}>
          {() => <BhavaChalitTable patri={patri} />}
        </Fold>
      </div>

      <div className="v-actions pt-tools">
        {isNative() ? null : (
          <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={onPrint}>
            Print or save as PDF
          </button>
        )}
        <button type="button" className="v-btn v-btn--quiet v-btn--sm" onClick={onRecompute}>
          Work it out again
        </button>
      </div>

      <Colophon
        rows={[
          ["Time zone", `${b.zone} · ${formatOffset(b.offsetMin)}${b.offsetSource === "override" ? " (manual)" : ""}`],
          ["Rising sign", `Lagna ${SIGN_NAMES[patri.lagna.sign]} ${formatDms(patri.lagna.degInSign)}`],
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

      <Sheet open={foot !== null} onClose={() => setFoot(null)} label="Footnote">
        <div className="pt-foot">
          {foot ? (
            <FootBody
              foot={foot}
              patri={patri}
              zone={zone}
              onShow={(g) => {
                setFoot(null);
                setLit(g);
              }}
            />
          ) : null}
          <div className="v-actions">
            <button type="button" className="v-btn v-btn--sm" onClick={() => setFoot(null)}>
              Close
            </button>
            {foot?.kind === "yoga" ? null : (
              <Link to="/drawer" className="v-btn v-btn--quiet v-btn--sm">
                Presets in Settings
              </Link>
            )}
          </div>
        </div>
      </Sheet>
    </>
  );
}

function Almanac({
  patri,
  zone,
  tradition,
  setFoot,
}: {
  patri: Patri;
  zone: string;
  tradition: Tradition | undefined;
  setFoot: (f: Foot) => void;
}) {
  const pc = patri.birthPanchang;
  const moon = patri.grahas.MO;
  const row = (plain: string, term: string, v: React.ReactNode, end: string, title: string, endMs: number | null, detail: string) => (
    <li key={term}>
      <button type="button" className="v-row" onClick={() => setFoot({ kind: "anga", title, endMs, detail })}>
        <span className="v-row__body">
          <span className="v-row__s">
            {plain} · {term}
          </span>
          <span className="v-row__t">{v}</span>
        </span>
        {end ? <span className="v-row__end">{end}</span> : null}
        <ChevronRight />
      </button>
    </li>
  );
  return (
    <>
      <p className="pt-term">
        Sanskrit: Pañcāṅga <InfoDot id="panchang" label="Pañcāṅga" /> · tap a line for how it is worked out
      </p>
      <ul className="v-list pt-alm">
        {row(
          "Lunar day",
          "Tithi",
          pc.tithi.name,
          `no. ${pc.tithi.index}`,
          `Tithi: ${pc.tithi.name}`,
          pc.tithi.endMs,
          `Moon − Sun elongation ${pc.elongation.toFixed(4)}° at birth; each tithi is 12°.`,
        )}
        {row(
          "Weekday",
          "Vāra",
          pc.vara.name,
          `sunrise ${hhmmss(pc.sunriseMs, zone)}`,
          `Vāra: ${pc.vara.name}`,
          null,
          "The weekday of the governing sunrise, not of the calendar date.",
        )}
        {row(
          "Moon's star",
          "Nakṣatra",
          nakBoth(pc.nakshatra.index, tradition),
          `pada ${pc.nakshatra.pada}`,
          `Nakṣatra: ${NAKSHATRA_NAMES[pc.nakshatra.index]}`,
          pc.nakshatra.endMs,
          "The Moon's sidereal mansion; each is 13°20′, each pada 3°20′.",
        )}
        {row(
          "Sun and Moon together",
          "Yoga",
          pc.yoga.name,
          `no. ${pc.yoga.index}`,
          `Yoga: ${pc.yoga.name}`,
          pc.yoga.endMs,
          "Sun + Moon sidereal longitudes, in 13°20′ steps.",
        )}
        {row(
          "Half lunar day",
          "Karaṇa",
          pc.karana.name,
          `half-tithi ${pc.karana.index}`,
          `Karaṇa: ${pc.karana.name}`,
          pc.karana.endMs,
          "Half a tithi: 6° of elongation.",
        )}
        {row(
          "Moon sign",
          "Candra rāśi",
          rashiBoth(moon.sign, tradition),
          `${(pc.moonIllumination * 100).toFixed(1)}% lit`,
          "Candra rāśi",
          null,
          `The Moon's illumination at birth was ${(pc.moonIllumination * 100).toFixed(1)}%.`,
        )}
      </ul>
    </>
  );
}

function Vargas({
  patri,
  style,
  script,
  inkKey,
  skipInk,
}: {
  patri: Patri;
  style: "north" | "south";
  script: "devanagari" | "latin";
  inkKey: string;
  skipInk: boolean;
}) {
  const [varga, setVarga] = useState<VargaNumber>(9);
  const vchart = useMemo(() => {
    const p = patri.vargas[varga] ? patri : addVarga(patri, varga);
    return p.vargas[varga] ?? null;
  }, [patri, varga]);
  return (
    <>
      <p className="pt-term">
        Sanskrit: Varga <InfoDot id="varga" label="Varga" /> · each divides every sign into finer parts
      </p>
      <div className="v-seg pt-pager" role="tablist" aria-label="Divisional charts">
        {PAGER.map((v) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={v === varga}
            aria-label={`D${v}, ${VARGA_NAMES[v]}`}
            onClick={() => {
              setVarga(v);
              haptics.selection();
            }}
          >
            D{v}
          </button>
        ))}
      </div>
      {vchart ? (
        <>
          <div className="chart-wrap pt-varga">
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
          <p className="pt-cap">
            {VARGA_NAMES[varga]} (D{varga}), {presetLabel(patri.preset)}. The rising sign (Lagna) falls in{" "}
            {SIGN_NAMES[vchart.ascendantSign]}.
          </p>
        </>
      ) : null}
    </>
  );
}

function Yogas({ patri, setFoot }: { patri: Patri; setFoot: (f: Foot) => void }) {
  return (
    <>
      <p className="pt-term">
        Sanskrit: Yoga <InfoDot id="yoga-chart" label="Yoga" /> · named patterns the old texts read into a chart
      </p>
      {patri.yogas.length === 0 ? <p className="v-muted">No classical yoga in the rule set fires for this chart.</p> : null}
      {patri.yogas.map((y) => (
        <section key={y.id} className={`pt-yoga${y.strength === "cancelled" ? " is-cancelled" : ""}`} aria-label={y.name}>
          <h3>
            {y.name}
            {y.strength !== "full" ? <span className="v-chip">{y.strength}</span> : null}
          </h3>
          <p className="pt-yoga__p">{y.reading}</p>
          <p className="pt-src">
            {y.citation.text} {y.citation.ref}
            {y.cancelledBy ? ` · cancelled by ${y.cancelledBy}` : ""}
          </p>
          <button
            type="button"
            className="v-link"
            aria-label={`Why ${y.name}? Citation: ${y.citation.text} ${y.citation.ref}`}
            onClick={() => setFoot({ kind: "yoga", hit: y })}
          >
            Why this applies <ChevronRight size={16} />
          </button>
        </section>
      ))}
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
      <>
        <h2>{name}: near a boundary</h2>
        <p>{note ? `${name} stands ${note.text}.` : `${name} is not within reach of another preset's edge.`}</p>
        <ul className="pt-foot__list">
          <li>
            <span className="k">Active preset:</span> {PRESET_SHORT[patri.preset.ayanamsa]} ({formatDms(patri.ayanamsa)})
          </li>
          {note?.flips.map((f) => (
            <li key={f.preset}>
              <span className="k">{PRESET_SHORT[f.preset]} would read:</span> {f.reads}
            </li>
          ))}
        </ul>
        <p className="v-muted v-small">
          The three Lahiri presets differ by up to 41″; a body this close to an edge is classified honestly, not hidden.
        </p>
      </>
    );
  }
  if (foot.kind === "yoga") {
    const y = foot.hit;
    return (
      <>
        <h2>{y.name}</h2>
        <p>{y.reading}</p>
        <ul className="pt-foot__list">
          {y.because.map((e) => (
            <li key={e.note}>
              {e.grahaId ? (
                <button type="button" className="v-link" onClick={() => e.grahaId && onShow(e.grahaId)}>
                  {e.note}. Show me
                </button>
              ) : (
                e.note
              )}
            </li>
          ))}
        </ul>
        <p className="v-muted v-small">
          Source: {y.citation.text}, {y.citation.ref}. Tradition is recorded here, not prescribed.
        </p>
      </>
    );
  }
  return (
    <>
      <h2>{foot.title}</h2>
      <p>{foot.detail}</p>
      {foot.endMs ? (
        <p>
          Ends{" "}
          <span className="pt-num">
            {fullDate(foot.endMs, zone)} {hhmmss(foot.endMs, zone, true)}
          </span>{" "}
          ({zone}).
        </p>
      ) : null}
      <p className="v-muted v-small">
        Sunrise convention: {patri.preset.sunrise === "upper-limb-refracted" ? "upper limb with refraction" : "disc centre"} · ayanāṃśa{" "}
        {PRESET_SHORT[patri.preset.ayanamsa]}.
      </p>
    </>
  );
}
