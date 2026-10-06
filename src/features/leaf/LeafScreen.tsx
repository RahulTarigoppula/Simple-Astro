import * as A from "astronomy-engine";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
import { DigitSet } from "../../components/ui/DigitSet";
import { HoldStamp } from "../../components/ui/HoldStamp";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { loadGazetteer, NetError, searchOnline, searchPlaces } from "../../data/places";
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
  };
}

const placeLabel = (p: Place) => [p.name, p.admin1, p.country].filter(Boolean).join(", ");
const latLon = (p: Place) => `${Math.abs(p.lat).toFixed(4)} ${p.lat >= 0 ? "N" : "S"} · ${Math.abs(p.lon).toFixed(4)} ${p.lon >= 0 ? "E" : "W"}`;

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
    };
  }, []);

  useEffect(() => {
    if (!gazReady) return;
    const q = query.trim();
    setResults(q.length >= 2 ? searchPlaces(q, 8) : []);
  }, [query, gazReady]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v })), []);

  const offsetOverrideMin = draft.override === "bombay" ? BOMBAY_TIME : draft.override === "manual" ? draft.manualOffsetMin : undefined;

  // Resolve the written moment: the engraved strip is the contract with reality.
  const resolved = useMemo((): { m: BirthMoment | null; err: EngineError | null; status: string } => {
    try {
      const m = resolveBirthMoment({
        localY: draft.y,
        localMo: draft.mo,
        localD: draft.d,
        localH: draft.h,
        localMi: draft.mi,
        place: draft.place,
        ...(offsetOverrideMin != null ? { offsetOverrideMin } : {}),
      });
      return { m, err: null, status: "ok" };
    } catch (e) {
      return { m: null, err: e instanceof EngineError ? e : new EngineError("TIME_INVALID", String(e)), status: "err" };
    }
  }, [draft.y, draft.mo, draft.d, draft.h, draft.mi, draft.place, offsetOverrideMin]);

  // The sky follows the hour drum continuously (sky-scrub); the Lagna re-solves every frame.
  const skyMs = useMemo(() => {
    if (!resolved.m) return Date.now();
    if (scrubH == null) return resolved.m.utcMs;
    return resolved.m.utcMs + (scrubH - draft.h) * 3_600_000;
  }, [resolved.m, scrubH, draft.h]);

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
    return checkLocalTime(draft.y, draft.mo, draft.d, draft.h, draft.mi, resolved.m.zone);
  }, [offsetOverrideMin, resolved.m, draft.y, draft.mo, draft.d, draft.h, draft.mi]);

  const seal = async () => {
    if (!resolved.m) {
      play("dull");
      toast(resolved.err ? resolved.err.detail : "This leaf cannot be sealed yet.", "danger");
      return;
    }
    const now = Date.now();
    const name = draft.name.trim() || "Unnamed";
    const profile: Profile = {
      id: editing?.id ?? crypto.randomUUID(),
      name,
      birth: resolved.m,
      handedness: draft.handedness,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    };
    try {
      await upsertProfile(profile, now);
      await saveSettings({ activeProfileId: profile.id });
      play("thunk");
      haptics.impact("medium");
      toast(`Leaf sealed — ${name}. The patri was written for it.`);
      navigate(`/patri/${profile.id}`);
    } catch (e) {
      toast(`The seal cracked — ${e instanceof Error ? e.message : String(e)}`, "danger");
    }
  };

  const goOnline = async () => {
    const q = query.trim();
    if (!q) return;
    if (!settings.onlineLookupAllowed) {
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
      toast(e instanceof NetError ? "The wire is quiet — type the coordinates." : "Not found; you can type the coordinates.", "warn");
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
  const strip = resolved.m;
  const title = id ? "Edit leaf" : "New leaf";

  if (id && editing === null) {
    return (
      <Screen scroll label="Lost leaf">
        <div className="paper sheet-col" style={{ marginTop: "var(--space-9)" }}>
          <TurmericBand dev="खोया पत्ता" title="Lost leaf" level={1} />
          <p className="p">This leaf is not in the bundle.</p>
          <p className="p">
            <Link className="linkish" to="/">
              Return to the Chowki
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
        <TurmericBand dev={id ? "पत्ता" : "नया पत्ता"} title={title} meta={id ? "editing" : "unsaved"} level={1} />

        <div className="field">
          <label htmlFor="leaf-name">Name</label>
          <input
            id="leaf-name"
            type="text"
            value={draft.name}
            placeholder="Whose leaf is this?"
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
            onChange={(v) => {
              set("h", v);
              setScrubH(null);
            }}
            onScrub={(pos) => setScrubH(pos)}
          />
          <BrassDrum label="Minute" short="mm" min={0} max={59} value={draft.mi} calm={settings.calmDesk} onChange={(v) => set("mi", v)} />
        </div>
        <p className="vh" aria-live="polite">
          {`${draft.d} ${MONTHS[draft.mo - 1] ?? ""} ${draft.y}, ${String(draft.h).padStart(2, "0")}:${String(draft.mi).padStart(2, "0")}`}
        </p>

        <div className="field leaf-place">
          <label htmlFor="leaf-place">Place</label>
          <input
            id="leaf-place"
            type="search"
            value={query}
            placeholder="search the gazetteer…"
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
          <ul className="results" aria-label="Places in the bundle">
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
            <span style={{ fontSize: "var(--text-sm)", color: "var(--ink-muted)" }}>{gazReady ? "Not in the bundle." : "Opening the gazetteer…"}</span>
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
          <div className="engraved leaf-strip" aria-live="polite" aria-label="Resolved zone, offset, Julian Day and Lagna">
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
                    <DigitSet text={lg != null ? (SIGN_ENGRAVED[lg] ?? "") : "—"} />
                  </b>
                </span>
              </>
            ) : (
              <span>{resolved.err?.code === "TIME_AMBIGUOUS" || resolved.err?.code === "TIME_INVALID" ? "THE CLOCK NEEDS THE OFFSET DRUM" : "—"}</span>
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
            <span>This clock time happened twice here — set the offset drum to say which.</span>
          </p>
        ) : null}
        {draft.override !== "none" ? (
          <p className="note-haldi">
            <span aria-hidden="true">⚑</span>
            <span>A manual offset is in force; the tzdb is set aside and the colophon will say "(manual)".</span>
          </p>
        ) : null}

        <div className="radio-row leaf-override" role="radiogroup" aria-label="Clock offset">
          <span className="v">
            Offset
            <span className="help">
              {pre1955India ? "Before 1955 some Indian births used Bombay Time (+04:51), which is not in the tzdb." : "The tzdb resolves historical offsets; override only when you know better."}
            </span>
          </span>
          <span className="seg">
            {(["none", "bombay", "manual"] as const).map((o) => (
              <button key={o} type="button" role="radio" aria-checked={draft.override === o} onClick={() => set("override", o)}>
                {o === "none" ? "tzdb" : o === "bombay" ? "Bombay +04:51" : "manual"}
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
                value={Math.trunc(draft.manualOffsetMin / 60)}
                format={(v) => `${v < 0 ? "−" : "+"}${String(Math.abs(v)).padStart(2, "0")}`}
                onChange={(v) => set("manualOffsetMin", v * 60 + (draft.manualOffsetMin % 60))}
              />
              <BrassDrum
                label="Offset minutes"
                short="mm"
                min={0}
                max={59}
                value={Math.abs(draft.manualOffsetMin % 60)}
                onChange={(v) => {
                  const h = Math.trunc(draft.manualOffsetMin / 60);
                  set("manualOffsetMin", h * 60 + (h < 0 ? -v : v));
                }}
              />
            </div>
          </div>
        ) : null}

        <div className="radio-row" role="radiogroup" aria-label="Dominant hand">
          <span className="v">
            Dominant hand
            <span className="help">Frames the palm reading; the classical right/left reading is offered beside it.</span>
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
          <span className="k">Ayanāṃśa</span>
          <span className="v" style={{ flex: 1, fontSize: "var(--text-sm)" }}>
            Lahiri ({settings.preset.ayanamsa === "se-true" ? "SE-true" : settings.preset.ayanamsa === "se-mean" ? "SE-mean" : "Drik-compatible"}) · node:{" "}
            {settings.preset.node}
          </span>
          <Link className="linkish" to="/drawer">
            change
          </Link>
        </div>

        <div className="sealbtn-wrap">
          <HoldStamp
            className="sealbtn"
            label={<>◉ &nbsp;hold to seal the leaf</>}
            ariaLabel="Hold to seal the leaf"
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
                Fill with the house example (Rahul, 14 Mar 1994)
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <Sheet open={online === "asking"} onClose={() => setOnline("idle")} label="Search online?">
        <TurmericBand title="Search online?" level={2} />
        <p className="p">
          Chowki works offline. To look up “{query.trim()}”, only the place name would be sent to Open-Meteo’s geocoder (and, if that finds nothing, to
          OpenStreetMap Nominatim). No birth details, no names of people. You will be asked once.
        </p>
        <div className="tools" style={{ paddingBottom: "var(--space-4)" }}>
          <button
            type="button"
            className="stamp"
            onClick={() => {
              void saveSettings({ onlineLookupAllowed: true }).then(() => {
                setOnline("idle");
                window.setTimeout(() => void goOnline(), 0);
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
        onClick={() => onSet({ name: name.trim() || `${la.toFixed(2)}, ${lo.toFixed(2)}`, country: "", lat: la, lon: lo, source: "manual" })}
      >
        use these
      </button>
    </div>
  );
}
