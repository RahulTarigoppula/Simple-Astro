import * as A from "astronomy-engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
import { DigitSet } from "../../components/ui/DigitSet";
import { InfoDot } from "../../components/ui/Explain";
import { HoldStamp } from "../../components/ui/HoldStamp";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { loadGazetteer, NetError, searchOnline, searchPlaces, unloadGazetteer } from "../../data/places";
import { saveSettings, upsertProfile } from "../../data/repo";
import { SIGN_ENGRAVED, SIGN_MARK } from "../../data/tables/names";
import { ayanamsa } from "../../engine/ayanamsa";
import { EngineError } from "../../engine/errors";
import { lagna } from "../../engine/lagna";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { checkLocalTime, daysInMonth, formatOffset, jdTtFromUtcMs, resolveBirthMoment } from "../../engine/time";
import type { BirthMoment, Place, Profile } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { ParapetSky } from "../chowki/ParapetSky";
import { BrassDrum } from "./BrassDrum";
import "./leaf.css";
import { TRADITION_LABEL, type Tradition } from "../../data/regional";
import { countEvent } from "../../platform/stats";

const BENGALURU: Place = { name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.9716, lon: 77.5946, source: "manual" };
const BOMBAY_TIME = 291; // +04:51, not in the IANA database
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

interface Draft {
  name: string;
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  place: Place;
  override: "none" | "bombay" | "manual";
  manualOffsetMin: number;
  handedness: "right" | "left";
  timeUnknown: boolean;
  tradition: Tradition;
}

function draftFromProfile(p: Profile): Draft {
  const b = p.birth;
  const override = b.offsetOverrideMin == null ? "none" : b.offsetOverrideMin === BOMBAY_TIME ? "bombay" : "manual";
  return {
    name: p.name,
    y: b.localY,
    mo: b.localMo,
    d: b.localD,
    h: b.localH,
    mi: b.localMi,
    place: b.place,
    override,
    manualOffsetMin: b.offsetOverrideMin ?? b.offsetMin,
    handedness: p.handedness,
    timeUnknown: p.timeUnknown === true,
    tradition: p.tradition ?? "north",
  };
}

function freshDraft(): Draft {
  const now = new Date();
  return {
    name: "",
    y: now.getFullYear(),
    mo: now.getMonth() + 1,
    d: now.getDate(),
    h: now.getHours(),
    mi: now.getMinutes(),
    place: BENGALURU,
    override: "none",
    manualOffsetMin: 330,
    handedness: "right",
    timeUnknown: false,
    tradition: "north",
  };
}

const placeLabel = (p: Place) => [p.name, p.admin1, p.country].filter(Boolean).join(", ");
const latLon = (p: Place) =>
  `${Math.abs(p.lat).toFixed(4)} ${p.lat >= 0 ? "N" : "S"} · ${Math.abs(p.lon).toFixed(4)} ${p.lon >= 0 ? "E" : "W"}`;

export default function LeafScreen() {
  const { id } = useParams();
  const editing = useProfile(id);
  const settings = useSettings();
  const navigate = useNavigate();
  const [draft, setDraft] = useState<Draft>(freshDraft);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [scrubH, setScrubH] = useState<number | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [gazReady, setGazReady] = useState(false);
  const [online, setOnline] = useState<"idle" | "asking" | "busy" | "failed">("idle");
  const [manual, setManual] = useState(false);
  const abort = useRef<AbortController | null>(null);
  const lastSign = useRef(-1);

  // Edit mode: load the leaf once.
  useEffect(() => {
    if (editing && loadedFrom !== editing.id) {
      setDraft(draftFromProfile(editing));
      setLoadedFrom(editing.id);
    }
  }, [editing, loadedFrom]);

  useEffect(() => {
    let live = true;
    loadGazetteer()
      .then(() => live && setGazReady(true))
      .catch(() => live && setGazReady(false));
    return () => {
      live = false;
      abort.current?.abort();
      unloadGazetteer(); // the decoded index is ~13 MB; release it when the editor closes
    };
  }, []);

  useEffect(() => {
    if (!gazReady) return;
    const q = query.trim();
    setResults(q.length >= 2 ? searchPlaces(q, 8) : []);
  }, [query, gazReady]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v })), []);

  const offsetOverrideMin = draft.override === "bombay" ? BOMBAY_TIME : draft.override === "manual" ? draft.manualOffsetMin : undefined;

  // With the clock time unknown the leaf is cast for 12:00 local; every reading of the drums uses this.
  const effH = draft.timeUnknown ? 12 : draft.h;
  const effMi = draft.timeUnknown ? 0 : draft.mi;

  // Resolve the written moment: the engraved strip is the contract with reality.
  const resolved = useMemo((): { m: BirthMoment | null; err: EngineError | null; status: string } => {
    try {
      const m = resolveBirthMoment({
        localY: draft.y,
        localMo: draft.mo,
        localD: draft.d,
        localH: effH,
        localMi: effMi,
        place: draft.place,
        ...(offsetOverrideMin != null ? { offsetOverrideMin } : {}),
      });
      return { m, err: null, status: "ok" };
    } catch (e) {
      return { m: null, err: e instanceof EngineError ? e : new EngineError("TIME_INVALID", String(e)), status: "err" };
    }
  }, [draft.y, draft.mo, draft.d, effH, effMi, draft.place, offsetOverrideMin]);

  // The sky follows the hour drum continuously (sky-scrub); the Lagna re-solves every frame.
  const skyMs = useMemo(() => {
    if (!resolved.m) return Date.now();
    if (scrubH == null || draft.timeUnknown) return resolved.m.utcMs;
    return resolved.m.utcMs + (scrubH - effH) * 3_600_000;
  }, [resolved.m, scrubH, effH, draft.timeUnknown]);

  const lg = useMemo(() => {
    if (!resolved.m) return null;
    const t = A.MakeTime(new Date(skyMs));
    const ay = ayanamsa(jdTtFromUtcMs(skyMs), settings.preset.ayanamsa);
    const r = lagna(t, draft.place.lat, draft.place.lon, ay);
    return Math.floor(r.ascSid / 30);
  }, [resolved.m, skyMs, draft.place.lat, draft.place.lon, settings.preset.ayanamsa]);

  useEffect(() => {
    if (lg == null) return;
    if (lastSign.current !== -1 && lastSign.current !== lg) {
      play("tickBright");
      haptics.selection();
    }
    lastSign.current = lg;
  }, [lg]);

  const localStatus = useMemo(() => {
    if (offsetOverrideMin != null || !resolved.m) return null;
    return checkLocalTime(draft.y, draft.mo, draft.d, effH, effMi, resolved.m.zone);
  }, [offsetOverrideMin, resolved.m, draft.y, draft.mo, draft.d, effH, effMi]);

  const seal = async () => {
    if (!resolved.m) {
      play("dull");
      toast(resolved.err ? resolved.err.detail : "These birth details cannot be saved yet.", "danger");
      return;
    }
    const now = Date.now();
    const name = draft.name.trim() || "Unnamed";
    const profile: Profile = {
      id: editing?.id ?? crypto.randomUUID(),
      name,
      birth: resolved.m,
      handedness: draft.handedness,
      tradition: draft.tradition,
      ...(draft.timeUnknown ? { timeUnknown: true } : {}),
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await upsertProfile(profile, now);
      await saveSettings({ activeProfileId: profile.id });
      play("thunk");
      haptics.impact("medium");
      toast(`Saved ${name}. Their birth chart is ready.`);
      countEvent(editing ? "person-edited" : "person-added");
      navigate(`/patri/${profile.id}`);
    } catch (e) {
      toast(`Could not save: ${e instanceof Error ? e.message : String(e)}`, "danger");
    }
  };

  const goOnline = async (allowed = settings.onlineLookupAllowed) => {
    const q = query.trim();
    if (!q) return;
    if (!allowed) {
      setOnline("asking");
      return;
    }
    abort.current?.abort();
    const ac = new AbortController();
    abort.current = ac;
    setOnline("busy");
    try {
      const found = await searchOnline(q, ac.signal);
      setResults(found);
      setOnline(found.length ? "idle" : "failed");
      if (!found.length) setManual(true);
    } catch (e) {
      setOnline("failed");
      setManual(true);
      toast(e instanceof NetError ? "No connection. Type the coordinates instead." : "Not found; you can type the coordinates.", "warn");
    }
  };

  const choosePlace = (p: Place) => {
    set("place", p);
    setQuery("");
    setResults([]);
    play("tick");
    haptics.selection();
  };

  const pre1955India = draft.y < 1955 && draft.place.country === "IN";
  const offSign = draft.manualOffsetMin < 0 ? -1 : 1;
  const offAbs = Math.abs(draft.manualOffsetMin);
  const strip = resolved.m;
  const title = id ? "Edit person" : "Add a person";

  if (id && editing === null) {
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

  return (
    <Screen className="leafscreen" label={title}>
      <ParapetSky utcMs={skyMs} lat={draft.place.lat} lon={draft.place.lon} />
      <div className="paper sheet-col leaf-sheet">
        <TurmericBand dev={id ? "व्यक्ति" : "नया व्यक्ति"} title={title} meta={id ? "editing" : "unsaved"} level={1} />

        <div className="field">
          <label htmlFor="leaf-name">Name</label>
          <input
            id="leaf-name"
            type="text"
            value={draft.name}
            placeholder="Who is this?"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => set("name", e.target.value)}
          />
        </div>

        <div className="drums" role="group" aria-label="Birth date and time, local clock at the place">
          <BrassDrum
            label="Day"
            short="day"
            min={1}
            max={31}
            value={draft.d}
            calm={settings.calmDesk}
            accept={(v) => v <= daysInMonth(draft.y, draft.mo)}
            onChange={(v) => set("d", v)}
          />
          <BrassDrum
            label="Month"
            short="mo"
            min={1}
            max={12}
            value={draft.mo}
            calm={settings.calmDesk}
            accept={(v) => draft.d <= daysInMonth(draft.y, v)}
            onChange={(v) => set("mo", v)}
            format={(v) => String(v).padStart(2, "0")}
          />
          <BrassDrum
            label="Year"
            short="year"
            min={1800}
            max={2100}
            value={draft.y}
            pad={4}
            flex={1.5}
            calm={settings.calmDesk}
            accept={(v) => draft.d <= daysInMonth(v, draft.mo)}
            onChange={(v) => set("y", v)}
          />
          <BrassDrum
            label="Hour"
            short="hh"
            min={0}
            max={23}
            value={draft.h}
            calm={settings.calmDesk}
            disabled={draft.timeUnknown}
            onChange={(v) => {
              set("h", v);
              setScrubH(null);
            }}
            onScrub={(pos) => setScrubH(pos)}
          />
          <BrassDrum
            label="Minute"
            short="mm"
            min={0}
            max={59}
            value={draft.mi}
            calm={settings.calmDesk}
            disabled={draft.timeUnknown}
            onChange={(v) => set("mi", v)}
          />
        </div>
        {draft.timeUnknown ? (
          <p className="note-haldi" role="status">
            <span aria-hidden="true">⚑</span>
            <span>Clock time unknown. The hour and minute drums are set aside and the chart is cast for 12:00 local.</span>
          </p>
        ) : null}
        <p className="vh" aria-live="polite">
          {`${draft.d} ${MONTHS[draft.mo - 1] ?? ""} ${draft.y}, ${String(effH).padStart(2, "0")}:${String(effMi).padStart(2, "0")}${draft.timeUnknown ? " (time unknown, cast for noon)" : ""}`}
        </p>

        <div className="field leaf-place">
          <label htmlFor="leaf-place">Place of birth</label>
          <input
            id="leaf-place"
            type="search"
            value={query}
            placeholder="Town or city where they were born…"
            spellCheck={false}
            autoComplete="off"
            aria-describedby="leaf-place-chosen"
            onChange={(e) => {
              setQuery(e.target.value);
              setOnline("idle");
            }}
          />
          <span className="chosen" id="leaf-place-chosen">
            <b>{placeLabel(draft.place)}</b>
            <span className="mono" style={{ fontSize: 10 }}>
              {latLon(draft.place)}
            </span>
          </span>
        </div>
        {results.length ? (
          <ul className="results" aria-label="Places found">
            {results.map((p) => (
              <li key={`${p.geonameId ?? ""}-${p.lat}-${p.lon}`}>
                <button type="button" onClick={() => choosePlace(p)}>
                  <span>{p.name}</span>
                  <span className="where">{[p.admin1, p.country].filter(Boolean).join(", ")}</span>
                  <span className="ll">{latLon(p)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
        {query.trim().length >= 2 && results.length === 0 ? (
          <div className="leaf-online">
            <span style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)" }}>
              {gazReady ? "Not in the built-in list." : "Loading places…"}
            </span>
            <button type="button" className="online-stamp" disabled={online === "busy"} onClick={() => void goOnline()}>
              {online === "busy" ? "asking the wire…" : "search online ⌑"}
            </button>
            <button type="button" className="linkish" onClick={() => setManual((m) => !m)}>
              type coordinates
            </button>
          </div>
        ) : null}
        {manual ? (
          <ManualPlace
            initial={draft.place}
            onSet={(p) => {
              choosePlace(p);
              setManual(false);
            }}
          />
        ) : null}

        <div className="leaf-strip-wrap">
          <div className="engraved leaf-strip" role="status" aria-label="Resolved zone, offset, Julian Day and Lagna">
            {strip ? (
              <>
                <b>{strip.zone.toUpperCase()}</b>
                <span className="sep">·</span>
                <span>
                  {formatOffset(strip.offsetMin)}
                  {strip.offsetSource === "override" ? " (manual)" : ""}
                </span>
                <span className="sep">·</span>
                <span>
                  JD <DigitSet text={strip.jdUt.toFixed(4)} />
                </span>
                <span className="sep">·</span>
                <span>
                  LAGNA {lg != null ? `${SIGN_MARK[lg]} ` : ""}
                  <b className="lg">
                    <DigitSet text={lg != null ? (SIGN_ENGRAVED[lg] ?? "") : "-"} />
                  </b>
                </span>
              </>
            ) : (
              <span>
                {resolved.err?.code === "TIME_AMBIGUOUS" || resolved.err?.code === "TIME_INVALID" ? "THE CLOCK NEEDS THE OFFSET DRUM" : "-"}
              </span>
            )}
          </div>
        </div>

        {localStatus === "nonexistent" || resolved.err?.code === "TIME_INVALID" ? (
          <p className="note-haldi" role="status">
            <span aria-hidden="true">⚑</span>
            <span>This clock time did not exist here; the offset drum resolves it.</span>
          </p>
        ) : null}
        {resolved.err?.code === "TIME_AMBIGUOUS" ? (
          <p className="note-haldi" role="status">
            <span aria-hidden="true">⚑</span>
            <span>This clock time happened twice here. Set the offset drum to say which.</span>
          </p>
        ) : null}
        {draft.override !== "none" ? (
          <p className="note-haldi">
            <span aria-hidden="true">⚑</span>
            <span>A manual offset is in force; the tzdb is set aside and the colophon will say "(manual)".</span>
          </p>
        ) : null}

        <details className="leaf-adv" open={draft.override !== "none"}>
          <summary>Advanced: clock offset (rarely needed)</summary>
          <div className="radio-row leaf-override" role="radiogroup" aria-label="Clock offset">
            <span className="v">
              Clock offset <InfoDot id="timezone" />
              <span className="help">
                {pre1955India
                  ? "Before 1955 some Indian births used Bombay Time (+04:51). Leave on automatic unless you know the clock used."
                  : "Worked out automatically from the time-zone database (tzdb). Leave it unless you know better."}
              </span>
            </span>
            <span className="seg">
              {(["none", "bombay", "manual"] as const).map((o) => (
                <button key={o} type="button" role="radio" aria-checked={draft.override === o} onClick={() => set("override", o)}>
                  {o === "none" ? "automatic" : o === "bombay" ? "Bombay +04:51" : "manual"}
                </button>
              ))}
            </span>
          </div>
          {draft.override === "manual" ? (
            <div className="leaf-override">
              <div className="drums" role="group" aria-label="Manual UTC offset">
                <BrassDrum
                  label="Offset hours"
                  short="± hh"
                  min={-12}
                  max={14}
                  value={offSign * Math.floor(offAbs / 60)}
                  format={(v) => `${v < 0 ? "−" : "+"}${String(Math.abs(v)).padStart(2, "0")}`}
                  onChange={(v) => set("manualOffsetMin", (v < 0 ? -1 : 1) * (Math.abs(v) * 60 + (offAbs % 60)))}
                />
                <BrassDrum
                  label="Offset minutes"
                  short="mm"
                  min={0}
                  max={59}
                  value={offAbs % 60}
                  onChange={(m) => set("manualOffsetMin", offSign * (Math.floor(offAbs / 60) * 60 + m))}
                />
              </div>
            </div>
          ) : null}
        </details>

        <div className="toggle-row">
          <span className="v">
            Birth time unknown <InfoDot id="unknown-time" />
            <span className="help">
              We'll use noon. The Moon sign and almanac stay useful; the rising sign, houses and life-chapter dates won't be reliable, and
              the chart will say so.
            </span>
          </span>
          <button
            type="button"
            role="switch"
            className="switch"
            aria-checked={draft.timeUnknown}
            aria-label="Birth time unknown"
            onClick={() => {
              set("timeUnknown", !draft.timeUnknown);
              play("tick");
            }}
          />
        </div>

        <div className="radio-row leaf-trad" role="radiogroup" aria-label="How do you read your chart?">
          <span className="v">
            How do you read your chart?
            <span className="help">
              Sets the names you see (Telugu and Tamil names appear beside the Sanskrit) and how the chart is drawn. The planets and the
              calculation are the same everywhere in India.
            </span>
          </span>
          <span className="seg">
            {(Object.keys(TRADITION_LABEL) as Tradition[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={draft.tradition === k} onClick={() => set("tradition", k)}>
                {TRADITION_LABEL[k]}
              </button>
            ))}
          </span>
        </div>

        <div className="radio-row" role="radiogroup" aria-label="Dominant hand">
          <span className="v">
            Dominant hand
            <span className="help">The hand you write with. Used only for the palm reading.</span>
          </span>
          <span className="seg">
            {(["right", "left"] as const).map((h) => (
              <button key={h} type="button" role="radio" aria-checked={draft.handedness === h} onClick={() => set("handedness", h)}>
                {h}
              </button>
            ))}
          </span>
        </div>

        <div className="field" style={{ borderBottom: 0 }}>
          <span className="k">
            Ayanāṃśa <InfoDot id="ayanamsha" />
          </span>
          <span className="v" style={{ flex: 1, fontSize: "var(--text-sm)" }}>
            Lahiri (
            {settings.preset.ayanamsa === "se-true" ? "SE-true" : settings.preset.ayanamsa === "se-mean" ? "SE-mean" : "Drik-compatible"}) ·
            node: {settings.preset.node}
          </span>
          <Link className="linkish" to="/drawer">
            change
          </Link>
        </div>

        <div className="sealbtn-wrap">
          <HoldStamp
            className="sealbtn"
            label={<>◉ &nbsp;hold to save</>}
            ariaLabel="Hold to save"
            disabled={!resolved.m}
            onFire={() => void seal()}
          />
          <p className="p p--muted" style={{ margin: 0 }}>
            Hold for a breath. Nothing leaves this device.
          </p>
          {!id ? (
            <div className="leaf-actions">
              <button
                type="button"
                className="linkish"
                onClick={() => {
                  setDraft(draftFromProfile(REFERENCE_PROFILE));
                  play("tick");
                }}
              >
                Fill in an example (Rahul, 14 Mar 1994)
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet open={online === "asking"} onClose={() => setOnline("idle")} label="Search online?">
        <TurmericBand title="Search online?" level={2} />
        <p className="p">
          Vyom works offline. To look up “{query.trim()}”, only the place name would be sent to Open-Meteo’s geocoder (and, if that finds
          nothing, to OpenStreetMap Nominatim). No birth details, no names of people. You will be asked once.
        </p>
        <div className="tools" style={{ paddingBottom: "var(--space-4)" }}>
          <button
            type="button"
            className="stamp"
            onClick={() => {
              void saveSettings({ onlineLookupAllowed: true }).then(() => {
                setOnline("idle");
                void goOnline(true);
              });
            }}
          >
            <span>Allow and search</span>
          </button>
          <button type="button" className="linkish" onClick={() => setOnline("idle")}>
            Stay offline
          </button>
        </div>
      </Sheet>
    </Screen>
  );
}

function ManualPlace({ initial, onSet }: { initial: Place; onSet: (p: Place) => void }) {
  const [lat, setLat] = useState(String(initial.lat));
  const [lon, setLon] = useState(String(initial.lon));
  const [name, setName] = useState("");
  const la = Number(lat);
  const lo = Number(lon);
  const ok = Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  return (
    <div className="leaf-manual" role="group" aria-label="Manual coordinates">
      <label>
        name
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="village" style={{ fontFamily: "var(--font-body)" }} />
      </label>
      <label>
        lat °N
        <input inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} />
      </label>
      <label>
        lon °E
        <input inputMode="decimal" value={lon} onChange={(e) => setLon(e.target.value)} />
      </label>
      <button
        type="button"
        className="linkish"
        disabled={!ok}
        onClick={() =>
          onSet({ name: name.trim() || `${la.toFixed(2)}, ${lo.toFixed(2)}`, country: "", lat: la, lon: lo, source: "manual" })
        }
      >
        use these
      </button>
    </div>
  );
}
