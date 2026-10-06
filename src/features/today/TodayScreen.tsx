// Today's leaf (§4.2): the pañcāṅga at the active leaf's birthplace — never GPS — computed on the
// device. The brass dial and the Moon sit on the indigo cloth; the ledger is ruled paper.
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { useActiveProfile, useSettings } from "../../app/hooks";
import { Colophon } from "../../components/ui/Colophon";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { useInkDraw } from "../../components/ui/useInkDraw";
import { NAKSHATRA_DEV, NAKSHATRA_NAMES, VARA_DEV, VARA_NAMES } from "../../data/tables/names";
import { AYANAMSA_LABEL } from "../../engine/ayanamsa";
import { ASTRONOMY_ENGINE_VERSION } from "../../engine/ephemeris";
import { angasAt, computePanchang } from "../../engine/panchang";
import type { EnginePreset, Panchang, Profile, SunriseMode } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { BrassDial } from "./BrassDial";
import { ayanaDev, ayanaLatin, karanaDev, masaDev, rituDev, tithiDev, yogaDev } from "./dev";
import { MoonPager } from "./MoonPager";
import { endsLabel, rangeLabel, type ZoneClock, zoneClock } from "./zone";
import "./today.css";

const DAY = 86_400_000;
const MAX_OFFSET = 3660;

interface DeskPlace {
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  zone: string;
  whose: string | null;
}

export const BENGALURU: DeskPlace = { name: "Bengaluru, Karnataka, IN", lat: 12.9716, lon: 77.5946, elevation: 920, zone: "Asia/Kolkata", whose: null };

function placeOf(p: Profile | null): DeskPlace {
  if (!p) return BENGALURU;
  const pl = p.birth.place;
  const name = [pl.name, pl.admin1, pl.country].filter(Boolean).join(", ");
  return {
    name,
    lat: pl.lat,
    lon: pl.lon,
    ...(pl.elevation !== undefined ? { elevation: pl.elevation } : {}),
    zone: p.birth.zone,
    whose: p.name,
  };
}

export const SUNRISE_LABEL: Record<SunriseMode, string> = {
  "upper-limb-refracted": "upper limb on a refracted horizon (as almanacs print)",
  "disc-centre": "disc centre at altitude 0°, no refraction",
};

interface DayLeaf {
  p: Panchang;
  atMs: number;
  moonSid: number;
}

/** The leaf for `offset` days from the base instant. Offset 0 reads the present moment; any other
 *  day reads that day's governing sunrise, as a printed pañcāṅga does. */
function leafFor(baseMs: number, offset: number, place: DeskPlace, preset: EnginePreset, base: Panchang): DayLeaf {
  const geo = { lat: place.lat, lon: place.lon, ...(place.elevation !== undefined ? { elevation: place.elevation } : {}) };
  if (offset === 0) return { p: base, atMs: baseMs, moonSid: angasAt(baseMs, preset.ayanamsa).moonSid };
  const noon = (base.sunriseMs + base.sunsetMs) / 2 + offset * DAY;
  const probe = computePanchang(noon, geo, preset);
  const at = probe.sunriseMs + 1000;
  return { p: computePanchang(at, geo, preset), atMs: at, moonSid: angasAt(at, preset.ayanamsa).moonSid };
}

interface Foot {
  title: string;
  dev?: string;
  lines: Array<[string, string]>;
  note?: string;
}

interface RowSpec {
  id: string;
  k: string;
  v: React.ReactNode;
  end?: string;
  haldi?: boolean;
  foot: Foot;
}

function Dev({ children }: { children: string }) {
  return (
    <span lang="hi" className="dev today-dev">
      {children}
    </span>
  );
}

function instantLines(clock: ZoneClock, label: string, ms: number): Array<[string, string]> {
  return [
    [label, `${clock.hms(ms)} · ${clock.dateLong(ms)}`],
    ["Zone", `${clock.zone} · ${clock.offset(ms)}`],
    ["UTC", new Date(ms).toISOString().replace("T", " ").replace(/\.\d+Z$/, "Z")],
  ];
}

function buildRows(leaf: DayLeaf, clock: ZoneClock, preset: EnginePreset): RowSpec[] {
  const { p } = leaf;
  const dayMs = p.sunriseMs;
  const conv: Array<[string, string]> = [
    ["Day", `sunrise ${clock.hms(p.sunriseMs)} → sunrise ${clock.hms(p.nextSunriseMs)}`],
    ["Sunrise", SUNRISE_LABEL[preset.sunrise]],
    ["Ayanāṃśa", AYANAMSA_LABEL[preset.ayanamsa]],
  ];
  const ending = (title: string, dev: string, endMs: number, what: string): Foot => ({
    title,
    dev,
    lines: [...instantLines(clock, "Ends", endMs), ...conv],
    note: `${what} The end is a root found on the Sun's and Moon's longitudes to within a quarter of a second.`,
  });
  const range = (title: string, dev: string, r: readonly [number, number], what: string): Foot => ({
    title,
    dev,
    lines: [
      ["From", `${clock.hms(r[0])} · ${clock.dateLong(r[0])}`],
      ["Until", `${clock.hms(r[1])} · ${clock.dateLong(r[1])}`],
      ["Zone", `${clock.zone} · ${clock.offset(r[0])}`],
      ...conv,
    ],
    note: what,
  });

  const tDev = tithiDev(p.tithi);
  const nDev = NAKSHATRA_DEV[p.nakshatra.index] ?? "";
  const nName = NAKSHATRA_NAMES[p.nakshatra.index] ?? p.nakshatra.name;
  const yDev = yogaDev(p.yoga.index);
  const kDev = karanaDev(p.karana.name);
  const vDev = VARA_DEV[p.vara.index];
  const waxing = p.elongation < 180;
  const pct = Math.round(p.moonIllumination * 100);

  const rows: RowSpec[] = [
    {
      id: "tithi",
      k: "Tithi",
      v: (
        <>
          {p.tithi.name} <Dev>{tDev}</Dev>
        </>
      ),
      end: endsLabel(clock, p.tithi.endMs, dayMs),
      foot: ending(p.tithi.name, tDev, p.tithi.endMs, `Tithi ${p.tithi.index} of 30 — each is 12° of the Moon pulling away from the Sun.`),
    },
    {
      id: "vara",
      k: "Vāra",
      v: (
        <>
          {VARA_NAMES[p.vara.index]} <Dev>{vDev}</Dev>
        </>
      ),
      end: endsLabel(clock, p.nextSunriseMs, dayMs).replace("ends", "until"),
      foot: {
        title: VARA_NAMES[p.vara.index],
        dev: vDev,
        lines: [...instantLines(clock, "Until", p.nextSunriseMs), ...conv],
        note: "The weekday belongs to the governing sunrise, not to the calendar date: the day runs sunrise to sunrise.",
      },
    },
    {
      id: "nakshatra",
      k: "Nakṣatra",
      v: (
        <>
          {nName} <Dev>{nDev}</Dev> <span className="today-pada">pada {p.nakshatra.pada}</span>
        </>
      ),
      end: endsLabel(clock, p.nakshatra.endMs, dayMs),
      foot: ending(`${nName}, pada ${p.nakshatra.pada}`, nDev, p.nakshatra.endMs, "The Moon's sidereal mansion — 13°20′ each, four padas of 3°20′."),
    },
    {
      id: "yoga",
      k: "Yoga",
      v: (
        <>
          {p.yoga.name} <Dev>{yDev}</Dev>
        </>
      ),
      end: endsLabel(clock, p.yoga.endMs, dayMs),
      foot: ending(p.yoga.name, yDev, p.yoga.endMs, `Yoga ${p.yoga.index} of 27 — the sum of the sidereal Sun and Moon in steps of 13°20′.`),
    },
    {
      id: "karana",
      k: "Karaṇa",
      v: (
        <>
          {p.karana.name} <Dev>{kDev}</Dev>
        </>
      ),
      end: endsLabel(clock, p.karana.endMs, dayMs),
      foot: ending(p.karana.name, kDev, p.karana.endMs, `Karaṇa ${p.karana.index} of 60 — half a tithi, 6° of elongation.`),
    },
  ];

  const kala: RowSpec[] = [
    {
      id: "sun",
      k: "Sunrise · set",
      v: (
        <span className="mono today-num">
          {clock.hm(p.sunriseMs)} – {clock.hm(p.sunsetMs)}
        </span>
      ),
      end: `${Math.floor((p.sunsetMs - p.sunriseMs) / 3_600_000)}h ${String(Math.round(((p.sunsetMs - p.sunriseMs) % 3_600_000) / 60_000)).padStart(2, "0")}m light`,
      foot: range("Sunrise and sunset", "सूर्योदय · सूर्यास्त", [p.sunriseMs, p.sunsetMs], p.polar ? `The Sun neither rises nor sets here today (${p.polar}); the day is local apparent noon ± 6 hours.` : "Daylight at the leaf's place, under the sunrise convention below."),
    },
    {
      id: "moon",
      k: "Moonrise · set",
      v: (
        <span className="mono today-num">
          {p.moonriseMs !== null ? clock.hm(p.moonriseMs) : "—"} – {p.moonsetMs !== null ? clock.hm(p.moonsetMs) : "—"}
        </span>
      ),
      foot: {
        title: "Moonrise and moonset",
        dev: "चन्द्रोदय · चन्द्रास्त",
        lines: [
          ["Rises", p.moonriseMs !== null ? `${clock.hms(p.moonriseMs)} · ${clock.dateLong(p.moonriseMs)}` : "not within this Hindu day"],
          ["Sets", p.moonsetMs !== null ? `${clock.hms(p.moonsetMs)} · ${clock.dateLong(p.moonsetMs)}` : "not within this Hindu day"],
          ["Zone", `${clock.zone} · ${clock.offset(p.sunriseMs)}`],
        ],
        note: "Searched between this sunrise and the next.",
      },
    },
    {
      id: "rahu",
      k: "Rāhu Kāla",
      v: <span className="mono today-num haldi-band">{rangeLabel(clock, p.rahuKaal)}</span>,
      haldi: true,
      foot: range("Rāhu Kāla", "राहु काल", p.rahuKaal, "One eighth of the daylight, its slot fixed by the weekday. Tradition sets new undertakings aside in it."),
    },
    {
      id: "yama",
      k: "Yamagaṇḍa",
      v: <span className="mono today-num haldi-band haldi-band--thin">{rangeLabel(clock, p.yamaganda)}</span>,
      haldi: true,
      foot: range("Yamagaṇḍa", "यमगण्ड", p.yamaganda, "One eighth of the daylight, its slot fixed by the weekday."),
    },
    {
      id: "gulika",
      k: "Gulika",
      v: <span className="mono today-num haldi-band haldi-band--thin">{rangeLabel(clock, p.gulika)}</span>,
      haldi: true,
      foot: range("Gulika Kāla", "गुलिक काल", p.gulika, "One eighth of the daylight, its slot fixed by the weekday."),
    },
    p.abhijit
      ? {
          id: "abhijit",
          k: "Abhijit",
          v: <span className="mono today-num">{rangeLabel(clock, p.abhijit)}</span>,
          foot: range("Abhijit Muhūrta", "अभिजित् मुहूर्त", p.abhijit, "Local apparent noon ± one thirtieth of the daylight."),
        }
      : {
          id: "abhijit",
          k: "Abhijit",
          v: <span className="today-muted">not observed on Budhavāra</span>,
          foot: {
            title: "Abhijit Muhūrta",
            dev: "अभिजित् मुहूर्त",
            lines: conv,
            note: "By convention the Abhijit muhūrta is not observed on a Wednesday.",
          },
        },
  ];

  const masa: RowSpec[] = [
    {
      id: "masa",
      k: "Māsa",
      v: (
        <>
          {p.masaAmanta} <Dev>{masaDev(p.masaAmanta)}</Dev> <span className="today-muted">amānta</span>
          {p.masaPurnimanta !== p.masaAmanta ? (
            <>
              {" · "}
              {p.masaPurnimanta} <Dev>{masaDev(p.masaPurnimanta)}</Dev> <span className="today-muted">pūrṇimānta</span>
            </>
          ) : (
            <span className="today-muted"> · pūrṇimānta too</span>
          )}
        </>
      ),
      foot: {
        title: "Māsa",
        dev: "मास",
        lines: [
          ["Amānta", `${p.masaAmanta} — months end at Amāvasyā (the south and west)`],
          ["Pūrṇimānta", `${p.masaPurnimanta} — months end at Pūrṇimā (the north)`],
          ["Ayanāṃśa", AYANAMSA_LABEL[preset.ayanamsa]],
        ],
        note: "Named by the sidereal Sun's sign at the governing new moon. Both conventions are printed because the circle spans both.",
      },
    },
    {
      id: "ritu",
      k: "Ṛtu · ayana",
      v: (
        <>
          {p.ritu} <Dev>{rituDev(p.ritu)}</Dev> · {ayanaLatin(p.ayana)} <Dev>{ayanaDev(p.ayana)}</Dev>
        </>
      ),
      foot: {
        title: `${p.ritu} · ${ayanaLatin(p.ayana)}`,
        dev: `${rituDev(p.ritu)} · ${ayanaDev(p.ayana)}`,
        lines: [
          ["Ṛtu", `${p.ritu} — the season, two lunar months each`],
          ["Ayana", `${ayanaLatin(p.ayana)} — by the sidereal Sun (Makara to Karka is Uttarāyaṇa)`],
        ],
      },
    },
    {
      id: "illum",
      k: "Moon",
      v: (
        <>
          <span className="mono today-num">{pct}%</span> lit · {waxing ? "waxing" : "waning"}
        </>
      ),
      foot: {
        title: "The Moon's light",
        dev: "चन्द्र",
        lines: [
          ["Lit", `${(p.moonIllumination * 100).toFixed(1)} % of the disc`],
          ["Elongation", `${p.elongation.toFixed(2)}° (Moon − Sun)`],
          ["At", `${clock.hms(leaf.atMs)} · ${clock.dateLong(leaf.atMs)}`],
        ],
        note: "This number also lights the cloth under the dial: the room is brighter near Pūrṇimā.",
      },
    },
  ];
  return [...rows, ...kala.map((r) => ({ ...r, id: `kala-${r.id}` })), ...masa.map((r) => ({ ...r, id: `masa-${r.id}` }))];
}

function Rows({ rows, onOpen }: { rows: RowSpec[]; onOpen: (r: RowSpec) => void }) {
  return (
    <ul className="rows today-rows">
      {rows.map((r) => (
        <li key={r.id}>
          <button type="button" className="row row--button" onClick={() => onOpen(r)} aria-haspopup="dialog">
            <span className="k">{r.k}</span>
            <span className="v">{r.v}</span>
            {r.end ? <span className="end">{r.end}</span> : null}
          </button>
        </li>
      ))}
    </ul>
  );
}

function InkLine() {
  const ref = useRef<SVGSVGElement>(null);
  useInkDraw(ref, []);
  return (
    <svg ref={ref} className="today-inkline" viewBox="0 0 300 6" preserveAspectRatio="none" aria-hidden="true">
      <path data-ink="300" d="M2 3 C 80 1, 160 5, 298 3" />
    </svg>
  );
}

export default function TodayScreen() {
  const active = useActiveProfile();
  const settings = useSettings();
  const preset = settings.preset;
  const [baseMs] = useState(() => Date.now());
  const [offset, setOffset] = useState(0);
  const [foot, setFoot] = useState<Foot | null>(null);

  const place = useMemo(() => (active === undefined ? null : placeOf(active)), [active]);
  const clock = zoneClock(place?.zone ?? BENGALURU.zone);

  const base = useMemo(() => {
    if (!place) return null;
    try {
      const geo = { lat: place.lat, lon: place.lon, ...(place.elevation !== undefined ? { elevation: place.elevation } : {}) };
      return computePanchang(baseMs, geo, preset);
    } catch {
      return null;
    }
  }, [place, baseMs, preset]);

  const leaf = useMemo<DayLeaf | null>(() => {
    if (!place || !base) return null;
    try {
      return leafFor(baseMs, offset, place, preset, base);
    } catch {
      return null;
    }
  }, [place, base, baseMs, offset, preset]);

  // A different leaf or preset starts again from today.
  const placeKey = place ? `${place.lat}|${place.lon}|${place.zone}` : "";
  useEffect(() => {
    if (placeKey) setOffset(0);
  }, [placeKey]);

  const step = (delta: number) => {
    if (delta === 0) return;
    setOffset((o) => Math.max(-MAX_OFFSET, Math.min(MAX_OFFSET, o + delta)));
    for (let i = 0; i < Math.min(3, Math.abs(delta)); i++) play("tick");
    haptics.selection();
  };

  const rows = leaf ? buildRows(leaf, clock, preset) : [];
  const angas = rows.filter((r) => !r.id.includes("-"));
  const kala = rows.filter((r) => r.id.startsWith("kala-"));
  const masa = rows.filter((r) => r.id.startsWith("masa-"));

  const p = leaf?.p;
  const head =
    offset === 0
      ? { dev: "आज", title: "Today" }
      : offset === 1
        ? { dev: "कल", title: "Tomorrow" }
        : offset === -1
          ? { dev: "कल", title: "Yesterday" }
          : { dev: "पंचांग", title: "Panchang" };
  const south = (place?.lat ?? 0) < 0;
  const waxing = p ? p.elongation < 180 : true;
  const style = { "--moon-k": p ? p.moonIllumination.toFixed(3) : "0" } as React.CSSProperties;
  const dialLabel = p
    ? `Brass dial: ${p.tithi.name}; Moon in ${NAKSHATRA_NAMES[p.nakshatra.index] ?? ""}; daylight ${clock.hm(p.sunriseMs)} to ${clock.hm(p.sunsetMs)}; Rāhu Kāla ${rangeLabel(clock, p.rahuKaal)}`
    : "Brass dial";

  return (
    <Screen className="today" scroll label="Today's leaf — the pañcāṅga">
      <div className="today__desk" style={style}>
        <div className="today__cloth">
          {p && leaf ? (
            <>
              <BrassDial
                sunriseH={clock.hours(p.sunriseMs)}
                sunsetH={clock.hours(p.sunsetMs)}
                rahuH={[clock.hours(p.rahuKaal[0]), clock.hours(p.rahuKaal[1])]}
                nowH={clock.hours(leaf.atMs)}
                elongation={p.elongation}
                moonSid={leaf.moonSid}
                nakIndex={p.nakshatra.index}
                label={dialLabel}
              />
              <MoonPager
                offset={offset}
                k={p.moonIllumination}
                waxing={waxing}
                south={south}
                onStep={step}
                onToday={() => step(-offset)}
                caption={`${Math.round(p.moonIllumination * 100)}% · ${waxing ? "waxing" : "waning"}`}
              />
            </>
          ) : (
            <div className="dial dial--blank" aria-hidden="true" />
          )}
        </div>

        <article className="paper paper--cut sheet-col today__sheet" aria-labelledby="today-h">
          <TurmericBand id="today-h" level={1} dev={head.dev} title={head.title} meta={p ? clock.dateShort(p.sunriseMs) : undefined} />
          {place ? (
            <div className="today__where">
              <div className="engraved">
                <b>{(place.name.split(",")[0] ?? place.name).toUpperCase()}</b>
                <span className="sep">·</span>
                {clock.zone.toUpperCase()}
                <span className="sep">·</span>
                {p ? clock.offset(p.sunriseMs) : ""}
              </div>
              <p className="p p--muted today__whose">
                {place.whose ? (
                  <>
                    At {place.whose}'s birthplace — a pañcāṅga belongs to a place.{" "}
                  </>
                ) : (
                  <>
                    No leaf in the bundle yet, so the dial reads Bengaluru.{" "}
                    <Link className="linkish" to="/leaf/new">
                      Write a leaf
                    </Link>
                  </>
                )}
                {offset !== 0 && p ? <>Read at sunrise, {clock.hm(p.sunriseMs)}.</> : null}
              </p>
            </div>
          ) : null}

          {!place ? (
            <InkLine />
          ) : !p ? (
            <div className="note-haldi" role="status">
              The dial is stuck — check the date and the leaf's place.
            </div>
          ) : (
            <>
              {p.polar ? (
                <div className="note-haldi">
                  The Sun neither rises nor sets here today ({p.polar === "midnight-sun" ? "midnight sun" : "polar night"}); the day is
                  taken as local noon ± 6 hours.
                </div>
              ) : null}
              <Rows rows={angas} onOpen={(r) => setFoot(r.foot)} />
              <TurmericBand plain level={2} dev="काल" title="Kāla" meta={clock.zone} />
              <Rows rows={kala} onOpen={(r) => setFoot(r.foot)} />
              <div className="today__gap" aria-hidden="true" />
              <Rows rows={masa} onOpen={(r) => setFoot(r.foot)} />
            </>
          )}

          <Colophon
            rows={[
              ["Place", place ? `${place.name} · ${place.lat.toFixed(4)}°, ${place.lon.toFixed(4)}°` : "—"],
              ["Zone", place ? `${clock.zone} (the leaf's, not this device's)` : "—"],
              ["Sunrise", SUNRISE_LABEL[preset.sunrise]],
              ["Ayanāṃśa", AYANAMSA_LABEL[preset.ayanamsa]],
              ["Engine", `astronomy-engine ${ASTRONOMY_ENGINE_VERSION} · computed on this device, offline`],
            ]}
          />
        </article>
      </div>

      <Sheet open={foot !== null} onClose={() => setFoot(null)} label={foot ? `Footnote — ${foot.title}` : "Footnote"}>
        {foot ? (
          <div className="footnote">
            <h2 className="footnote__h">
              {foot.dev ? (
                <>
                  <span lang="hi" className="dev">
                    {foot.dev}
                  </span>{" "}
                  ·{" "}
                </>
              ) : null}
              {foot.title}
            </h2>
            <dl className="footnote__dl">
              {foot.lines.map(([k, v]) => (
                <div key={k} className="row">
                  <dt>{k}</dt>
                  <dd className={/\d{2}:\d{2}/.test(v) ? "mono footnote__num" : undefined}>{v}</dd>
                </div>
              ))}
            </dl>
            {foot.note ? <p className="p p--muted">{foot.note}</p> : null}
            <p className="footnote__close">
              <button type="button" className="linkish" onClick={() => setFoot(null)}>
                Close
              </button>
            </p>
          </div>
        ) : null}
      </Sheet>
    </Screen>
  );
}
