// The birth report, #/report/:id: one person's whole birth chart as a document the family can print,
// keep or hand to an astrologer (the janma patrikā). On screen it opens on the person's own piece of
// sky, then the document as a sheet of paper; in print only the sheet remains (report.css, @media print).
// Everything shown is read from the Patri the engine already cast: nothing is worked out again here.
// This is the one place the full birth details are written out, because its owner hands it over.
import { useEffect, useMemo } from "react";
import { Link, useParams } from "react-router";
import { usePatri, useProfile, useSettings, useSettingsLoaded } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { Page } from "../../components/ui/Page";
import { chartStyleFor, nakName, rashiBoth, rashiName, type Tradition } from "../../data/regional";
import { GRAHA_ENGLISH, GRAHA_NAMES, NAKSHATRA_NAMES, SIGN_NAMES, SIGN_WESTERN } from "../../data/tables/names";
import { currentDasha } from "../../engine/dasha";
import { formatDms, MS_PER_DAY } from "../../engine/math";
import { formatClock12, formatClock24, formatOffset, safeZone } from "../../engine/time";
import {
  type DashaNode,
  type Dignity,
  type EnginePreset,
  GRAHA_IDS,
  type GrahaId,
  type Patri,
  type Profile,
  type Settings,
} from "../../engine/types";
import { VARGA_NAMES } from "../../engine/vargas";
import { isNative } from "../../platform/native";
import { IconChart } from "../chowki/icons";
import { KeyFacts } from "../cosmic/CosmicProfile";
import { LifeReading } from "../cosmic/LifeReading";
import { bodiesOf } from "../patri/ChartFigure";
import { GRAHA_ABBR_EN, KundliChart } from "../patri/KundliChart";
import { SkyPiece } from "../patri/SkyPiece";
import "../patri/band.css"; // the piece-of-sky drawing
import "./report.css";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

/** The standing line at the foot of every report. */
export const REPORT_FOOTER = "A traditional reading for reflection, never a prediction or advice.";
/** Shown on the Android app in place of the print button, which does nothing there. */
export const REPORT_NATIVE_LINE = "To print, open Vyomaphala in a browser on a computer";

const DIGNITY: Record<Dignity, string> = {
  exalted: "exalted",
  moolatrikona: "mūlatrikoṇa",
  own: "own sign",
  friend: "friend's sign",
  neutral: "neutral sign",
  enemy: "enemy's sign",
  debilitated: "debilitated",
};

const possessive = (name: string) => `${name}’s`;
const day = (ms: number, zone: string) =>
  new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: safeZone(zone) }).format(ms);
const coord = (v: number, pos: string, neg: string) => `${Math.abs(v).toFixed(4)}° ${v >= 0 ? pos : neg}`;

/** "Bengaluru, Karnataka, IN" once, whether or not the gazetteer name already carries the region. */
function placeLine(b: Profile["birth"]): string {
  const out = b.place.name
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  for (const extra of [b.place.admin1, b.place.country]) if (extra && !out.includes(extra)) out.push(extra);
  return out.join(", ");
}

const ayanamsaLabel = (p: EnginePreset) =>
  `Lahiri ${p.ayanamsa === "se-true" ? "(true, nutation included)" : p.ayanamsa === "se-mean" ? "(mean)" : "(Drik-compatible mean)"}`;

export default function ReportScreen() {
  const { id } = useParams();
  const profile = useProfile(id);
  const settings = useSettings();
  const loaded = useSettingsLoaded();
  const { patri, error } = usePatri(loaded ? profile : undefined, loaded?.preset ?? settings.preset);
  const nowMs = useNowMs(60_000);
  const native = isNative();

  // While this screen is up the tab is named for the document, so a saved PDF gets a useful file name.
  const name = profile?.name ?? "";
  useEffect(() => {
    if (!name) return;
    const before = document.title;
    document.title = `${name} - birth report`;
    return () => {
      document.title = before;
    };
  }, [name]);

  if (profile === undefined) {
    return (
      <Page label="Birth report" eyebrow="Birth report" className="report">
        <div className="v-skel">Reading the sky…</div>
      </Page>
    );
  }
  if (profile === null) {
    return (
      <Page label="Person not found" className="report">
        <section className="v-card v-empty" aria-labelledby="rp-missing-h">
          <span className="v-empty__art" aria-hidden="true">
            <IconChart size={30} />
          </span>
          <h1 id="rp-missing-h" className="v-title">
            Person not found
          </h1>
          <p className="v-lede">This person is not saved on this device, so there is no birth report to show.</p>
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

  const ready = patri && patri.profileId === profile.id ? patri : null;
  const first = profile.name.split(/\s+/)[0] ?? profile.name;
  const title = `${possessive(profile.name)} birth report`;

  const hero = (
    <div className="rp-band">
      {ready ? (
        <div className="rp-band__pic">
          <SkyPiece
            patri={ready}
            tradition={profile.tradition}
            label={`The real stars behind the Moon when ${first} was born, among the stars of ${nakName(ready.grahas.MO.nakshatra, profile.tradition)} in ${rashiName(ready.grahas.MO.sign, profile.tradition)}.`}
          />
        </div>
      ) : null}
      <div className="rp-band__say">
        <h1 className="rp-band__title">{title}</h1>
        <p className="rp-band__lede">The whole birth chart on paper, to keep or to hand to family and the family astrologer.</p>
        {ready ? (
          native ? (
            <p className="rp-band__native">{REPORT_NATIVE_LINE}</p>
          ) : (
            <div className="v-actions rp-band__actions">
              <button type="button" className="v-btn" onClick={() => window.print()}>
                Print or save as PDF
              </button>
            </div>
          )
        ) : null}
      </div>
    </div>
  );

  return (
    <Page label={title} wide className="report" hero={hero} sky="night" back={`/patri/${profile.id}`} backLabel="Back to chart">
      {error ? (
        <p className="v-note v-note--care" role="alert">
          <span aria-hidden="true">⚑</span>
          <span>
            The chart could not be worked out from these birth details ({error.message}).{" "}
            <Link to={`/leaf/${profile.id}/edit`}>Check the birth details</Link>.
          </span>
        </p>
      ) : null}
      {ready ? (
        <ReportDocument profile={profile} patri={ready} settings={loaded ?? settings} nowMs={nowMs} />
      ) : error ? null : (
        <div className="v-skel" aria-busy="true">
          Reading the sky…
        </div>
      )}
    </Page>
  );
}

interface DocProps {
  profile: Profile;
  patri: Patri;
  settings: Settings;
  nowMs: number;
}

/** The sheet of paper: the seven parts of the report, in the order a family reads them. */
export function ReportDocument({ profile, patri, settings, nowMs }: DocProps) {
  const b = profile.birth;
  const zone = b.zone;
  const t = profile.tradition;
  const style = chartStyleFor(t) ?? settings.chartStyle;
  const script: "devanagari" | "latin" = t === "telugu" || t === "tamil" ? "latin" : settings.chartScript;

  return (
    <article className="rp-paper" aria-label={`Birth report of ${profile.name}`}>
      <Cover profile={profile} patri={patri} />

      <section className="rp-sec rp-words" aria-labelledby="rp-words-h">
        <h2 id="rp-words-h" className="rp-h">
          In simple words
        </h2>
        <LifeReading profile={profile} patri={patri} nowMs={nowMs} onBand />
      </section>

      <Charts patri={patri} style={style} script={script} tradition={t} timeUnknown={!!profile.timeUnknown} />
      <Planets patri={patri} tradition={t} timeUnknown={!!profile.timeUnknown} />
      <Chapters patri={patri} zone={zone} birthMs={b.utcMs} nowMs={nowMs} />
      <Combinations patri={patri} />
      <Method patri={patri} zone={zone} />
    </article>
  );
}

function Fact({ k, sk, children, sub }: { k: string; sk?: string; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <div className="rp-fact">
      <dt>
        {k}
        {sk ? <span className="rp-sk"> {sk}</span> : null}
      </dt>
      <dd>
        {children}
        {sub ? <span className="rp-fact__sub">{sub}</span> : null}
      </dd>
    </div>
  );
}

function Cover({ profile, patri }: { profile: Profile; patri: Patri }) {
  const b = profile.birth;
  const pc = patri.birthPanchang;
  const civil = new Date(Date.UTC(b.localY, b.localMo - 1, b.localD)).getUTCDay();
  const vara = WEEKDAYS[pc.vara.index] ?? "";
  return (
    <header className="rp-sec rp-cover">
      <p className="rp-cover__kind">Birth report</p>
      <h2 className="rp-cover__name">{profile.name}</h2>
      <p className="rp-cover__sk">Janma patrikā · the birth chart, worked out for the moment and place of birth</p>

      <dl className="rp-facts rp-facts--birth" aria-label="Birth details">
        <Fact k="Date of birth">
          {b.localD} {MONTHS[b.localMo - 1]} {b.localY}
        </Fact>
        <Fact k="Time of birth">
          {profile.timeUnknown ? (
            "Not recorded: worked out for 12 noon"
          ) : (
            <>
              {formatClock12(b.localH, b.localMi)} <span className="rp-quiet">({formatClock24(b.localH, b.localMi)})</span>
            </>
          )}
        </Fact>
        <Fact k="Place of birth">{placeLine(b)}</Fact>
        <Fact k="Time zone used">
          {b.zone} <span className="rp-quiet">· UTC{formatOffset(b.offsetMin)}</span>
          {b.offsetSource === "override" ? <span className="rp-quiet"> (set by hand)</span> : null}
        </Fact>
        <Fact k="Coordinates">
          {coord(b.place.lat, "N", "S")}, {coord(b.place.lon, "E", "W")}
        </Fact>
      </dl>

      <div className="rp-keys">
        <KeyFacts profile={profile} patri={patri} />
      </div>

      <dl className="rp-facts rp-facts--almanac" aria-label="The almanac at birth">
        <Fact
          k="Weekday"
          sk="Vāra"
          sub={
            civil === pc.vara.index ? pc.vara.name : `${pc.vara.name} · counted from sunrise; the calendar date was a ${WEEKDAYS[civil]}`
          }
        >
          {vara}
        </Fact>
        <Fact k="Lunar day" sk="Tithi" sub={pc.tithi.paksha === "shukla" ? "growing Moon" : "fading Moon"}>
          {pc.tithi.name}
        </Fact>
        <Fact k="Sun and Moon together" sk="Yoga" sub={`no. ${pc.yoga.index} of 27`}>
          {pc.yoga.name}
        </Fact>
        <Fact k="Half lunar day" sk="Karaṇa" sub={`half-tithi ${pc.karana.index} of 60`}>
          {pc.karana.name}
        </Fact>
      </dl>
    </header>
  );
}

function Charts({
  patri,
  style,
  script,
  tradition,
  timeUnknown,
}: {
  patri: Patri;
  style: "north" | "south";
  script: "devanagari" | "latin";
  tradition: Tradition | undefined;
  timeUnknown: boolean;
}) {
  const d1 = useMemo(() => bodiesOf(patri), [patri]);
  const d9 = patri.vargas[9];
  const d9Bodies = useMemo(
    () => (d9 ? GRAHA_IDS.map((g) => ({ id: g, sign: d9.placements[g], retro: patri.grahas[g].retrograde })) : []),
    [d9, patri],
  );
  return (
    <section className="rp-sec rp-charts" aria-labelledby="rp-charts-h">
      <h2 id="rp-charts-h" className="rp-h">
        The birth chart <span className="rp-sk">Rāśi and {VARGA_NAMES[9]}</span>
      </h2>
      <div className="rp-pair" data-style={style}>
        <figure className="rp-fig">
          <div className="chart-wrap">
            <KundliChart
              title={`Birth chart (${VARGA_NAMES[1]}, D1)`}
              style={style}
              script={script}
              lagnaSign={patri.lagna.sign}
              bodies={d1}
              skipInk
            />
          </div>
          <figcaption>
            <b>Birth chart</b> <span className="rp-sk">{VARGA_NAMES[1]} · D1</span>
            <span className="rp-fig__s">
              Rising sign {rashiBoth(patri.lagna.sign, tradition)} {formatDms(patri.lagna.degInSign)}
            </span>
          </figcaption>
        </figure>
        {d9 ? (
          <figure className="rp-fig">
            <div className="chart-wrap">
              <KundliChart
                title={`Ninth-part chart (${VARGA_NAMES[9]}, D9)`}
                style={style}
                script={script}
                lagnaSign={d9.ascendantSign}
                bodies={d9Bodies}
                showDegrees={false}
                skipInk
              />
            </div>
            <figcaption>
              <b>Ninth-part chart</b> <span className="rp-sk">{VARGA_NAMES[9]} · D9</span>
              <span className="rp-fig__s">Rising sign {rashiBoth(d9.ascendantSign, tradition)}</span>
            </figcaption>
          </figure>
        ) : null}
      </div>
      <p className="rp-note">
        {style === "north"
          ? "North Indian diamond: the top centre is the first house and the houses run anticlockwise; each number is the sign there (1 is Meṣa, Aries)."
          : "South Indian square: every sign keeps its own box, running clockwise; the stroke across a corner marks the rising sign, the first house."}{" "}
        The small mark shows the rising sign (Lagna). {GRAHA_IDS.map((g) => `${GRAHA_ABBR_EN[g]} ${GRAHA_ENGLISH[g]}`).join(" · ")} · ℞
        retrograde. The number beside a planet is its whole degree in the sign.
        {timeUnknown ? " The birth time was not recorded, so the rising sign and the houses are uncertain." : ""}
      </p>
    </section>
  );
}

function Planets({ patri, tradition, timeUnknown }: { patri: Patri; tradition: Tradition | undefined; timeUnknown: boolean }) {
  const L = patri.lagna;
  const regional = tradition !== undefined && tradition !== "north";
  const signCell = (s: number) => (
    <>
      {rashiName(s, tradition)}{" "}
      <span className="rp-sk">
        {regional && rashiName(s, tradition) !== SIGN_NAMES[s] ? `${SIGN_NAMES[s]} · ` : ""}
        {SIGN_WESTERN[s]}
      </span>
    </>
  );
  const starCell = (i: number, pada: number, lord: GrahaId) => (
    <>
      {nakName(i, tradition)} <span className="rp-pada">{pada}</span>{" "}
      <span className="rp-sk">
        {regional && nakName(i, tradition) !== NAKSHATRA_NAMES[i] ? `${NAKSHATRA_NAMES[i]} · ` : ""}lord {GRAHA_ENGLISH[lord]}
      </span>
    </>
  );
  return (
    <section className="rp-sec rp-planets" aria-labelledby="rp-planets-h">
      <h2 id="rp-planets-h" className="rp-h">
        The planets at birth <span className="rp-sk">Graha</span>
      </h2>
      {/* biome-ignore lint/a11y/noNoninteractiveTabindex: a region that scrolls sideways on a phone must be reachable by keyboard */}
      <div className="rp-scroll" role="region" aria-label="Planet table, scrolls sideways on a narrow screen" tabIndex={0}>
        <table className="rp-table rp-table--planets">
          <thead>
            <tr>
              <th scope="col">Planet</th>
              <th scope="col">Sign</th>
              <th scope="col" className="rp-num">
                Degree
              </th>
              <th scope="col">Star · quarter</th>
              <th scope="col" className="rp-num">
                House
              </th>
              <th scope="col">Standing</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <th scope="row">
                Rising <span className="rp-sk">Lagna</span>
              </th>
              <td>{signCell(L.sign)}</td>
              <td className="rp-num">{formatDms(L.degInSign)}</td>
              <td>{starCell(L.nakshatra, L.pada, L.nakshatraLord)}</td>
              <td className="rp-num">1</td>
              <td>{timeUnknown ? "uncertain: time not recorded" : ""}</td>
            </tr>
            {GRAHA_IDS.map((id) => {
              const g = patri.grahas[id];
              return (
                <tr key={id} data-graha={id}>
                  <th scope="row">
                    {GRAHA_ENGLISH[id]} <span className="rp-sk">{GRAHA_NAMES[id]}</span>
                  </th>
                  <td>{signCell(g.sign)}</td>
                  <td className="rp-num">{formatDms(g.degInSign)}</td>
                  <td>{starCell(g.nakshatra, g.pada, g.nakshatraLord)}</td>
                  <td className="rp-num">{g.house}</td>
                  <td>{[DIGNITY[g.dignity], g.retrograde ? "retrograde ℞" : "", g.combust ? "combust" : ""].filter(Boolean).join(", ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="rp-note">
        Sidereal positions. House: counted from the rising sign, one sign to a house. Standing: how much at home the planet is in its sign
        (dignity); retrograde ℞ means it appeared to move backwards; combust means it stood too close to the Sun to be seen.
      </p>
    </section>
  );
}

function Chapters({ patri, zone, birthMs, nowMs }: { patri: Patri; zone: string; birthMs: number; nowMs: number }) {
  const yearMs = patri.preset.dashaYearDays * MS_PER_DAY;
  const cur = currentDasha(patri.dasha, nowMs);
  const age = (ms: number) => Math.max(0, Math.floor((ms - birthMs) / yearMs + 1e-6));
  const isNow = (n: DashaNode, c: DashaNode | undefined) => !!c && n.startMs <= nowMs && nowMs < n.endMs && n.lord === c.lord;
  const subs = cur?.md.children ?? [];
  const lord = (g: GrahaId) => (
    <>
      {GRAHA_ENGLISH[g]} <span className="rp-sk">{GRAHA_NAMES[g]}</span>
    </>
  );
  return (
    <section className="rp-sec rp-chapters" aria-labelledby="rp-chapters-h">
      <h2 id="rp-chapters-h" className="rp-h">
        Life chapters <span className="rp-sk">Viṃśottarī daśā</span>
      </h2>
      <p className="rp-lead">
        Tradition divides a life into chapters, each coloured by one planet; the order and the dates follow from where the Moon stood at
        birth. A chapter is a theme tradition reads into those years, for reflection. “Now” is as of {day(nowMs, zone)}; dates use a year of{" "}
        {patri.preset.dashaYearDays} days and are shown for {zone}.
      </p>
      <div className="rp-cols">
        <div className="rp-col">
          <h3 className="rp-h3">
            Main chapters <span className="rp-sk">Mahādaśā</span>
          </h3>
          <table className="rp-table rp-table--dasha">
            <thead>
              <tr>
                <th scope="col">Planet</th>
                <th scope="col">From</th>
                <th scope="col">Until</th>
                <th scope="col" className="rp-num">
                  Age
                </th>
              </tr>
            </thead>
            <tbody>
              {patri.dasha.map((md, i) => {
                const now = isNow(md, cur?.md);
                return (
                  <tr key={md.startMs} className={now ? "is-now" : undefined}>
                    <th scope="row">
                      {lord(md.lord)}
                      {now ? <span className="rp-now"> now</span> : null}
                    </th>
                    <td>{i === 0 && md.startMs < birthMs ? "birth" : day(md.startMs, zone)}</td>
                    <td>{day(md.endMs, zone)}</td>
                    <td className="rp-num">
                      {age(md.startMs)} to {age(md.endMs)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {cur && subs.length > 0 ? (
          <div className="rp-col">
            <h3 className="rp-h3">
              Inside the {GRAHA_ENGLISH[cur.md.lord]} chapter <span className="rp-sk">Antardaśā</span>
            </h3>
            <table className="rp-table rp-table--dasha">
              <thead>
                <tr>
                  <th scope="col">Planet</th>
                  <th scope="col">From</th>
                  <th scope="col">Until</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((ad) => {
                  const now = isNow(ad, cur.ad);
                  return (
                    <tr key={ad.startMs} className={now ? "is-now" : undefined}>
                      <th scope="row">
                        {lord(ad.lord)}
                        {now ? <span className="rp-now"> now</span> : null}
                      </th>
                      <td>{day(ad.startMs, zone)}</td>
                      <td>{day(ad.endMs, zone)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function Combinations({ patri }: { patri: Patri }) {
  const formed = patri.yogas.filter((y) => y.strength !== "cancelled");
  const cancelled = patri.yogas.filter((y) => y.strength === "cancelled");
  return (
    <section className="rp-sec rp-yogas" aria-labelledby="rp-yogas-h">
      <h2 id="rp-yogas-h" className="rp-h">
        Notable combinations <span className="rp-sk">Yoga</span>
      </h2>
      {formed.length === 0 ? (
        <p className="rp-lead">None of the classical combinations in this app's rule set forms in this chart.</p>
      ) : (
        <ul className="rp-yogalist">
          {formed.map((y) => (
            <li key={y.id}>
              <p className="rp-yoga__n">
                {y.name}
                {y.strength === "partial" ? <span className="rp-sk"> partly formed</span> : null}
                <span className="rp-yoga__src">
                  {" "}
                  · {y.citation.text} {y.citation.ref}
                </span>
              </p>
              <p className="rp-yoga__p">{y.reading}</p>
            </li>
          ))}
        </ul>
      )}
      {cancelled.length > 0 ? (
        <p className="rp-note">Present but cancelled by another factor in the chart: {cancelled.map((y) => y.name).join(", ")}.</p>
      ) : null}
    </section>
  );
}

function Method({ patri, zone }: { patri: Patri; zone: string }) {
  const p = patri.preset;
  return (
    <section className="rp-sec rp-method" aria-labelledby="rp-method-h">
      <h2 id="rp-method-h" className="rp-h3">
        How this was worked out
      </h2>
      <dl className="rp-method__dl">
        <div>
          <dt>Calculated</dt>
          <dd>on this device by Vyomaphala, {day(patri.computedAt, zone)}; nothing was sent anywhere</dd>
        </div>
        <div>
          <dt>Ephemeris</dt>
          <dd>
            {patri.engine.name} {patri.engine.version}, accurate to about 1′
          </dd>
        </div>
        <div>
          <dt>Zodiac</dt>
          <dd>sidereal (nirayana)</dd>
        </div>
        <div>
          <dt>Ayanāṃśa</dt>
          <dd>
            {ayanamsaLabel(p)}, {formatDms(patri.ayanamsa)} at birth
          </dd>
        </div>
        <div>
          <dt>Houses</dt>
          <dd>
            whole-sign from the rising sign
            {p.houseSystem === "bhava-chalit" ? "; combinations read by Bhāva Chalit houses" : ""}
          </dd>
        </div>
        <div>
          <dt>Nodes</dt>
          <dd>{p.node === "true" ? "true" : "mean"} Rāhu and Ketu</dd>
        </div>
      </dl>
      <p className="rp-footer">{REPORT_FOOTER}</p>
    </section>
  );
}
