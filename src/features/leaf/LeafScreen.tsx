// Add or edit a person, as four short steps: Who (name, tradition, writing hand), When (date, and the
// time on a 12-hour clock with am/pm chosen by hand), Where (the place, searched and picked, never
// assumed) and Check (everything read back, with the Moon sign, birth star and rising sign, so a wrong
// am/pm, day or town is caught before it is saved). One tap on Save saves one person.
// The step lives in the address (?step=2), so the Back button walks the steps and never drops what was typed.
// What was typed is also kept as a draft for this tab (leafDraft.ts), so leaving the form or a reload loses nothing.
import tzlookup from "@photostructure/tz-lookup";
import * as A from "astronomy-engine";
import { DateTime } from "luxon";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
import { DigitSet } from "../../components/ui/DigitSet";
import { InfoDot } from "../../components/ui/Explain";
import { Page } from "../../components/ui/Page";
import { Sheet } from "../../components/ui/Sheet";
import { loadGazetteer, NetError, searchOnline, searchPlaces } from "../../data/places";
import { nakBoth, rashiBoth, TRADITION_LABEL, type Tradition } from "../../data/regional";
import { saveSettings, upsertProfile } from "../../data/repo";
import { SIGN_ENGRAVED, SIGN_MARK, SIGN_WESTERN } from "../../data/tables/names";
import { ayanamsa } from "../../engine/ayanamsa";
import { EngineError } from "../../engine/errors";
import { lagna } from "../../engine/lagna";
import { signOf } from "../../engine/nakshatra";
import { angasAt } from "../../engine/panchang";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { checkLocalTime, formatOffset, jdTtFromUtcMs, resolveBirthMoment } from "../../engine/time";
import type { BirthMoment, Place, Profile } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { countEvent } from "../../platform/stats";
import { toast } from "../../state/ui";
import { DateFields, fieldsOfHour, hourOf, missingText, Readback, TimeFields } from "./BirthFields";
import { clearDraft, type Draft, draftKey, freshDraft, readDraft, sameDraft, writeDraft } from "./leafDraft";
import "./leaf.css";

/** Where the hand-typed coordinates start before a place is chosen; nothing else uses this. */
const SKY_FALLBACK: Place = { name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.9716, lon: 77.5946, source: "manual" };
const BOMBAY_TIME = 291; // +04:51, not in the IANA database

function draftFromProfile(p: Profile): Draft {
  const b = p.birth;
  const override = b.offsetOverrideMin == null ? "none" : b.offsetOverrideMin === BOMBAY_TIME ? "bombay" : "manual";
  return {
    name: p.name,
    y: b.localY,
    mo: b.localMo,
    d: b.localD,
    ...(p.timeUnknown ? { hour12: 0, ampm: null } : fieldsOfHour(b.localH)),
    mi: p.timeUnknown ? 0 : b.localMi,
    place: b.place,
    override,
    manualOffsetMin: Math.round(b.offsetOverrideMin ?? b.offsetMin),
    handedness: p.handedness,
    timeUnknown: p.timeUnknown === true,
    tradition: p.tradition ?? "north",
  };
}

/** Country codes as the names people say. Anything else is looked up, and failing that the code is shown. */
const COUNTRY: Record<string, string> = {
  IN: "India",
  US: "United States",
  GB: "United Kingdom",
  AE: "United Arab Emirates",
  SG: "Singapore",
  AU: "Australia",
  CA: "Canada",
  LK: "Sri Lanka",
  NP: "Nepal",
  BD: "Bangladesh",
  MY: "Malaysia",
  DE: "Germany",
  PK: "Pakistan",
  NZ: "New Zealand",
  ZA: "South Africa",
  MU: "Mauritius",
  FJ: "Fiji",
  QA: "Qatar",
  KW: "Kuwait",
  OM: "Oman",
  SA: "Saudi Arabia",
  BH: "Bahrain",
};
let regionNames: Intl.DisplayNames | null | undefined;
function countryName(code: string): string {
  const c = code.trim().toUpperCase();
  if (!c) return "";
  const known = COUNTRY[c];
  if (known) return known;
  if (!/^[A-Z]{2}$/.test(c)) return code.trim(); // an online lookup may already give the name
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(c) ?? c;
  } catch {
    return c;
  }
}

/** "Andhra Pradesh, India": the line under a place's name. */
const placeRegion = (p: Place) => [p.admin1, countryName(p.country)].filter(Boolean).join(", ");
/** "Bengaluru, Karnataka, India" (a name that already carries its region is left as it is). */
const placeLabel = (p: Place) => (p.name.includes(",") ? p.name : [p.name, placeRegion(p)].filter(Boolean).join(", "));
const latLon = (p: Place) =>
  `${Math.abs(p.lat).toFixed(4)} ${p.lat >= 0 ? "N" : "S"} · ${Math.abs(p.lon).toFixed(4)} ${p.lon >= 0 ? "E" : "W"}`;

const plain = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

/**
 * The list as it is shown: the search's own order, minus the loose look-alikes that trail after the
 * last place whose name really holds what was typed ("Vijayaw" shows Vijayawada, not seven near
 * misses). When no name holds it (an old name such as "Madras"), the list is left exactly as found.
 */
function shownResults(q: string, found: Place[]): Place[] {
  const want = plain(q);
  if (!want) return found;
  let last = -1;
  found.forEach((p, i) => {
    if (plain(p.name).includes(want)) last = i;
  });
  return last === -1 ? found : found.slice(0, last + 1);
}

/** Two places with the same name in the same state can only be told apart by where they are. */
const roughly = (p: Place) =>
  `near ${Math.abs(p.lat).toFixed(1)}° ${p.lat >= 0 ? "N" : "S"}, ${Math.abs(p.lon).toFixed(1)}° ${p.lon >= 0 ? "E" : "W"}`;

const STEPS = [
  { label: "Who", title: "Who is this for?", hint: "Four short steps, about a minute. Everything stays on this device." },
  {
    label: "When",
    title: "When were they born?",
    hint: "The time matters most: a few hours changes the rising sign, and a wrong am/pm can change the Moon sign and birth star.",
  },
  { label: "Where", title: "Where were they born?", hint: "" },
  { label: "Check", title: "Check and save", hint: "Read it back once. Nothing leaves this device." },
] as const;
const LAST = STEPS.length - 1;

const TRADITION_NOTE: Record<Tradition, string> = {
  north: "Sanskrit names and the diamond-shaped chart.",
  telugu: "Telugu names beside the Sanskrit, and the square South Indian chart.",
  tamil: "Tamil names beside the Sanskrit, and the square South Indian chart.",
};

/** What each history entry of the flow remembers: how many steps deep it is, and the step it came from. */
interface Trail {
  depth?: number;
  from?: number;
}

function Tick() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
  );
}

export default function LeafScreen() {
  const { id } = useParams();
  const editing = useProfile(id);
  const settings = useSettings();
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const key = draftKey(id);
  // "Add a person" picks up the draft this tab was keeping, if there is one.
  const [kept] = useState(() => (id ? null : readDraft(draftKey())));
  const [draft, setDraft] = useState<Draft>(() => kept ?? freshDraft());
  const [restored, setRestored] = useState(kept !== null);
  const [loadedFrom, setLoadedFrom] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [gazReady, setGazReady] = useState(false);
  const [online, setOnline] = useState<"idle" | "asking" | "busy" | "failed">("idle");
  const [manual, setManual] = useState(false);
  const [tried, setTried] = useState(false);
  const [leaving, setLeaving] = useState<string | null>(null);
  const abort = useRef<AbortController | null>(null);
  const lastSign = useRef(-1);
  const body = useRef<HTMLFormElement>(null);

  // Edit mode: load the person once (or the unsaved changes kept for them). Leaving an edit for
  // "Add a person" starts from that flow's own draft, or an empty one (both routes render this same
  // screen, so React would otherwise keep the old state).
  useEffect(() => {
    if (!id && loadedFrom !== null) {
      const mine = readDraft(draftKey());
      setDraft(mine ?? freshDraft());
      setRestored(mine !== null);
      setLoadedFrom(null);
      return;
    }
    if (editing && loadedFrom !== editing.id) {
      setDraft(readDraft(draftKey(editing.id)) ?? draftFromProfile(editing));
      setRestored(false);
      setLoadedFrom(editing.id);
    }
  }, [id, editing, loadedFrom]);

  /** The place's own clock offset on that day (whole minutes), the sensible start for a manual offset. */
  const offsetAtPlace = (): number => {
    const p = draft.place;
    if (!p || !(draft.y > 0)) return 330;
    try {
      const zone = tzlookup(p.lat, p.lon);
      const dt = DateTime.fromObject({ year: draft.y, month: draft.mo || 1, day: draft.d || 1, hour: 12 }, { zone });
      return dt.isValid ? Math.round(dt.offset) : 330;
    } catch {
      return 330;
    }
  };

  useEffect(() => {
    let live = true;
    loadGazetteer()
      .then(() => live && setGazReady(true))
      .catch(() => live && setGazReady(false));
    return () => {
      live = false;
      abort.current?.abort();
      // The decoded index stays resident: rebuilding it on every visit took seconds on a phone.
    };
  }, []);

  useEffect(() => {
    if (!gazReady) return;
    const q = query.trim();
    setResults(q.length >= 2 ? shownResults(q, searchPlaces(q, 8)) : []);
  }, [query, gazReady]);

  const set = useCallback(<K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v })), []);
  const patch = useCallback((p: Partial<Draft>) => setDraft((d) => ({ ...d, ...p })), []);

  const offsetOverrideMin = draft.override === "bombay" ? BOMBAY_TIME : draft.override === "manual" ? draft.manualOffsetMin : undefined;

  // With the clock time unknown the chart is cast for 12:00 local.
  const effH = draft.timeUnknown ? 12 : hourOf(draft);
  const effMi = draft.timeUnknown ? 0 : draft.mi;
  const missing = missingText(draft, draft.timeUnknown);

  // Resolve the written moment: zone, offset and Julian Day are the contract with reality.
  const resolved = useMemo((): { m: BirthMoment | null; err: EngineError | null } => {
    if (missing) return { m: null, err: new EngineError("TIME_INVALID", missing) };
    if (!draft.place) return { m: null, err: new EngineError("PLACE_MISSING", "Choose the place of birth.") };
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
      return { m, err: null };
    } catch (e) {
      return { m: null, err: e instanceof EngineError ? e : new EngineError("TIME_INVALID", String(e)) };
    }
  }, [missing, draft.y, draft.mo, draft.d, effH, effMi, draft.place, offsetOverrideMin]);

  // The check card: Moon sign, birth star and rising sign for the moment as written.
  const check = useMemo(() => {
    const m = resolved.m;
    const place = draft.place;
    if (!m || !place) return null;
    try {
      const a = angasAt(m.utcMs, settings.preset.ayanamsa);
      const ay = ayanamsa(jdTtFromUtcMs(m.utcMs), settings.preset.ayanamsa);
      const r = lagna(A.MakeTime(new Date(m.utcMs)), place.lat, place.lon, ay);
      return {
        moonSign: signOf(a.moonSid),
        nak: a.nakshatra.index,
        pada: a.nakshatra.pada,
        lagnaSign: signOf(r.ascSid),
      };
    } catch {
      return null;
    }
  }, [resolved.m, settings.preset.ayanamsa, draft.place]);
  const lg = check?.lagnaSign ?? null;

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

  const clockTrouble =
    resolved.err?.code === "TIME_AMBIGUOUS"
      ? "This clock time happened twice here (the clocks went back). Open Advanced below, choose Manual and say which."
      : localStatus === "nonexistent" || (resolved.err?.code === "TIME_INVALID" && !missing && !!draft.place)
        ? "This clock time did not exist here (a clock change skipped it). Open Advanced below and choose Manual."
        : null;
  // Each new clock trouble opens the Advanced panel once, even if the person closed it before.
  const [advOpen, setAdvOpen] = useState(false);
  const lastTrouble = useRef<string | null>(null);
  useEffect(() => {
    if (clockTrouble && clockTrouble !== lastTrouble.current) setAdvOpen(true);
    lastTrouble.current = clockTrouble;
  }, [clockTrouble]);

  // ── The steps ──────────────────────────────────────────────────────────────
  // What stops each step, in plain words (null = the step is complete).
  const problems: Array<string | null> = [
    draft.name.trim() ? null : "Type a name to go on.",
    missing,
    !draft.place
      ? "Pick the place of birth from the list."
      : resolved.m
        ? null
        : (clockTrouble ?? resolved.err?.detail ?? "These birth details cannot be used yet."),
  ];
  const firstBad = problems.findIndex((p) => p !== null);
  const reach = firstBad === -1 ? LAST : firstBad; // the furthest step that may be opened
  const asked = Number(params.get("step"));
  const wanted = Number.isInteger(asked) && asked >= 1 && asked <= STEPS.length ? asked - 1 : id ? LAST : 0;
  const step = Math.min(wanted, reach);
  const problem = step < LAST ? (problems[step] ?? null) : resolved.m ? null : (problems[2] ?? "These birth details cannot be saved yet.");
  const trail = (location.state ?? {}) as Trail;
  const depth = trail.depth ?? 0;
  const ready = id ? loadedFrom === id : loadedFrom === null;

  // Keep the draft as it changes. A form with nothing new in it keeps nothing.
  useEffect(() => {
    if (!ready || leaving) return;
    const untouched = id ? (editing ? draftFromProfile(editing) : null) : freshDraft();
    if (untouched && sameDraft(draft, untouched)) clearDraft(key);
    else writeDraft(key, draft);
  }, [draft, key, ready, leaving, id, editing]);

  // The address always names the step that is on screen (a reload on a later step with an empty form
  // shows the first one), so Back never lands on a step that was never really reached.
  const stale = ready && !leaving && params.has("step") && wanted !== step;
  // biome-ignore lint/correctness/useExhaustiveDependencies: only the mismatch itself re-runs this
  useEffect(() => {
    if (stale) navigate({ search: `?step=${step + 1}` }, { replace: true, state: location.state });
  }, [stale, step]);

  const goTo = (i: number) => {
    if (i === step) return;
    setTried(false);
    navigate({ search: `?step=${i + 1}` }, { state: { depth: depth + 1, from: step } satisfies Trail });
  };
  const next = () => {
    if (problem) {
      setTried(true);
      play("dull");
      // On When the sentence under the fields says what is missing: bring it into view.
      const read = step === 1 ? body.current?.querySelector<HTMLElement>(".bf-read") : null;
      if (read && typeof read.scrollIntoView === "function") read.scrollIntoView({ block: "nearest" });
      return;
    }
    goTo(step + 1);
  };
  const back = () => {
    setTried(false);
    // Arrived here from the step before: really go back, so the phone's Back button and this one agree.
    if (depth > 0 && trail.from === step - 1) navigate(-1);
    else navigate({ search: `?step=${step}` }, { replace: true, state: trail });
  };

  // A new step starts at its top with its first field focused (never on the very first screen: that
  // would raise the keyboard over the page before anything has been read).
  const shown = useRef<number | null>(null);
  useEffect(() => {
    if (!ready) return;
    if (shown.current === null || shown.current === step) {
      shown.current = step;
      return;
    }
    shown.current = step;
    const form = body.current;
    const scroller = form?.closest("main");
    if (scroller && typeof scroller.scrollTo === "function") scroller.scrollTo(0, 0);
    form?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [step, ready]);

  // After a save the steps are taken back out of the history, so Back from the chart does not
  // walk through an empty form. A short timer covers a history that does not answer.
  useEffect(() => {
    if (!leaving) return;
    if (depth === 0) {
      navigate(leaving, { replace: true });
      return;
    }
    const t = window.setTimeout(() => navigate(leaving, { replace: true }), 600);
    return () => window.clearTimeout(t);
  }, [leaving, depth, navigate]);

  const saving = useRef(false);
  const seal = async () => {
    if (!resolved.m) {
      setTried(true);
      play("dull");
      toast(problem ?? "These birth details cannot be saved yet.", "danger");
      return;
    }
    if (saving.current) return;
    saving.current = true;
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
      await saveSettings({ activeProfileId: profile.id }).catch(() => undefined); // the person is saved either way
      play("thunk");
      haptics.impact("medium");
      toast(`Saved ${name}. Their birth chart is ready.`);
      countEvent(editing ? "person-edited" : "person-added");
      clearDraft(key);
      setLeaving(`/patri/${profile.id}`); // stays "saving": this screen is on its way out
      if (depth > 0) navigate(-depth);
    } catch (e) {
      saving.current = false;
      toast(`Could not save: ${e instanceof Error ? e.message : String(e)}`, "danger");
    }
  };

  const openManual = () => {
    setManual(true);
    setAdvOpen(true);
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
      if (!found.length) openManual();
    } catch (e) {
      setOnline("failed");
      openManual();
      toast(e instanceof NetError ? "No connection. Type the coordinates instead." : "Not found; you can type the coordinates.", "warn");
    }
  };

  const choosePlace = (p: Place) => {
    set("place", p);
    setQuery("");
    setResults([]);
    setTried(false);
    play("tick");
    haptics.selection();
  };

  /** Throw the kept draft away and begin with an empty form. */
  const startAgain = () => {
    clearDraft(key);
    setDraft(freshDraft());
    setRestored(false);
    setTried(false);
    setQuery("");
    setResults([]);
    setManual(false);
    setAdvOpen(false);
    play("tick");
  };

  const fillExample = () => {
    // The example replaces whatever draft was being kept.
    setRestored(false);
    setDraft(draftFromProfile(REFERENCE_PROFILE));
    play("tick");
    goTo(LAST);
  };

  const pre1955India = draft.y > 0 && draft.y < 1955 && draft.place?.country === "IN";
  const offSign = draft.manualOffsetMin < 0 ? -1 : 1;
  const offAbs = Math.abs(draft.manualOffsetMin);
  const strip = resolved.m;
  const title = id ? "Edit person" : "Add a person";

  if (id && editing === null) {
    return (
      <Page label="Person not found" title="Person not found" back noPerson>
        <div className="v-card v-empty">
          <p>This person is not saved on this device.</p>
          <Link className="v-btn" to="/circle">
            See your people
          </Link>
        </div>
      </Page>
    );
  }
  if (!ready || leaving) {
    return (
      <Page label={title} title={title} back noPerson>
        <div className="v-skel" role="status">
          {leaving ? "Saved. Opening the chart…" : "Opening…"}
        </div>
      </Page>
    );
  }

  /** Zone, clock offset, Julian Day and rising sign as worked out: the technical read-back. */
  const stripEl = (
    <div className="engraved leaf-strip" role="status" aria-label="Time zone, clock offset, Julian Day and rising sign, worked out">
      {strip ? (
        <>
          <b>{strip.zone.toUpperCase()}</b>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            {formatOffset(strip.offsetMin)}
            {strip.offsetSource === "override" ? " (manual)" : ""}
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            JD <DigitSet text={strip.jdUt.toFixed(4)} />
          </span>
          <span className="sep" aria-hidden="true">
            ·
          </span>
          <span>
            LAGNA {lg != null ? `${SIGN_MARK[lg]} ` : ""}
            <b>
              <DigitSet text={lg != null ? (SIGN_ENGRAVED[lg] ?? "") : "-"} />
            </b>
          </span>
        </>
      ) : (
        <span>{resolved.err?.code === "TIME_AMBIGUOUS" ? "THE CLOCK NEEDS THE OFFSET" : "WAITING FOR THE DETAILS"}</span>
      )}
    </div>
  );

  return (
    <Page label={title} back noPerson className="leafscreen">
      <header className="leaf-head">
        <div className="leaf-head__row">
          <h1 className="leaf-kicker">{title}</h1>
          <p className="leaf-steps__now" aria-live="polite">
            Step {step + 1} of {STEPS.length}
          </p>
        </div>
        <nav className="leaf-steps" aria-label="Steps">
          <ol>
            {STEPS.map((s, i) => (
              <li key={s.label}>
                <button
                  type="button"
                  className={i < step ? "is-done" : undefined}
                  aria-label={`Step ${i + 1}: ${s.label}`}
                  aria-current={i === step ? "step" : undefined}
                  disabled={i > reach}
                  onClick={() => goTo(i)}
                >
                  <span className="leaf-steps__bar" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ol>
        </nav>
      </header>

      <form
        ref={body}
        className="leaf-form"
        noValidate
        onSubmit={(e) => {
          e.preventDefault();
          if (step === LAST) void seal();
          else next();
        }}
      >
        <div className="leaf-ask-head">
          <h2 className="v-title leaf-q" tabIndex={-1} data-autofocus={step === LAST ? "" : undefined}>
            {STEPS[step]?.title}
          </h2>
          {step === 2 ? (
            <p className="v-lede" id="leaf-place-hint">
              Type the first letters of the town or city, then tap it in the list.
            </p>
          ) : (
            <p className="v-lede">{STEPS[step]?.hint}</p>
          )}
        </div>

        {step === 0 ? (
          <>
            {restored && !id ? (
              <div className="v-note leaf-kept" role="status">
                <span>Carrying on where you left off.</span>
                <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={startAgain}>
                  Start again
                </button>
              </div>
            ) : null}
            <div className="v-field">
              <label className="v-label" htmlFor="leaf-name">
                Name
              </label>
              <input
                id="leaf-name"
                className="v-input"
                type="text"
                value={draft.name}
                placeholder="For example, Rahul"
                spellCheck={false}
                autoComplete="off"
                autoCapitalize="words"
                enterKeyHint="next"
                maxLength={60}
                data-autofocus=""
                onChange={(e) => set("name", e.target.value)}
              />
            </div>

            <div className="v-field">
              <span className="v-label" id="leaf-trad-l">
                Which tradition does the family follow?
              </span>
              <div className="leaf-choices" role="radiogroup" aria-labelledby="leaf-trad-l" aria-describedby="leaf-trad-s">
                {(Object.keys(TRADITION_LABEL) as Tradition[]).map((k) => (
                  <button
                    key={k}
                    type="button"
                    role="radio"
                    className="leaf-choice"
                    aria-checked={draft.tradition === k}
                    onClick={() => set("tradition", k)}
                  >
                    <span className="leaf-choice__body">
                      <span className="leaf-choice__t">{TRADITION_LABEL[k]}</span>
                      <span className="leaf-choice__s">{TRADITION_NOTE[k]}</span>
                    </span>
                    <span className="leaf-choice__tick" aria-hidden="true">
                      <Tick />
                    </span>
                  </button>
                ))}
              </div>
              <span className="v-hint" id="leaf-trad-s">
                Only the names and the way the chart is drawn change. The calculation is the same everywhere in India.
              </span>
            </div>

            <div className="v-field">
              <span className="v-label" id="leaf-hand-l">
                Writing hand <span className="leaf-label-s">for the palm reading</span>
              </span>
              <div className="v-seg leaf-seg" role="radiogroup" aria-labelledby="leaf-hand-l">
                {(["right", "left"] as const).map((h) => (
                  <button key={h} type="button" role="radio" aria-checked={draft.handedness === h} onClick={() => set("handedness", h)}>
                    {h === "right" ? "Right" : "Left"}
                  </button>
                ))}
              </div>
            </div>
          </>
        ) : null}

        {step === 1 ? (
          <>
            <DateFields y={draft.y} mo={draft.mo} d={draft.d} onChange={patch} />
            <TimeFields hour12={draft.hour12} ampm={draft.ampm} mi={draft.mi} timeUnknown={draft.timeUnknown} onChange={patch} />
            <Readback
              y={draft.y}
              mo={draft.mo}
              d={draft.d}
              hour12={draft.hour12}
              ampm={draft.ampm}
              mi={draft.mi}
              timeUnknown={draft.timeUnknown}
              urgent={tried}
            />
            <div className="leaf-switchrow">
              <button
                type="button"
                role="switch"
                className="leaf-switch"
                aria-checked={draft.timeUnknown}
                aria-describedby="leaf-unknown-s"
                onClick={() => {
                  set("timeUnknown", !draft.timeUnknown);
                  play("tick");
                }}
              >
                <span className="leaf-switch__t">I don't know the time</span>
                <span className="leaf-switch__knob" aria-hidden="true" />
              </button>
              <p className="v-hint" id="leaf-unknown-s">
                Noon is used. The Moon sign and birth star usually still hold; the rising sign, houses and life-chapter dates will not be
                reliable, and the chart will say so. <InfoDot id="unknown-time" />
              </p>
            </div>
          </>
        ) : null}

        {step === 2 ? (
          <>
            <div className="v-field">
              <label className="vh" htmlFor="leaf-place">
                Place of birth
              </label>
              <input
                id="leaf-place"
                className="v-input"
                type="search"
                value={query}
                placeholder={draft.place ? "Search to change the place…" : "Town or city"}
                spellCheck={false}
                autoComplete="off"
                enterKeyHint="search"
                aria-describedby="leaf-place-hint leaf-place-chosen"
                data-autofocus=""
                onChange={(e) => {
                  setQuery(e.target.value);
                  setOnline("idle");
                }}
                onKeyDown={(e) => {
                  // Enter in a half-typed search must not skip ahead: the place is picked from the list.
                  if (e.key === "Enter" && query.trim()) e.preventDefault();
                }}
              />
            </div>
            {results.length ? (
              <ul className="v-list leaf-results" aria-label="Places found">
                {results.map((p) => {
                  const region = placeRegion(p);
                  const twin = results.some((o) => o !== p && o.name === p.name && placeRegion(o) === region);
                  const sub = [region, twin ? roughly(p) : ""].filter(Boolean).join(" · ");
                  return (
                    <li key={`${p.geonameId ?? ""}-${p.lat}-${p.lon}`}>
                      <button type="button" className="v-row" onClick={() => choosePlace(p)}>
                        <span className="v-row__body">
                          <span className="v-row__t">{p.name}</span>
                          {sub ? <span className="v-row__s">{sub}</span> : null}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
            {query.trim().length >= 2 && results.length === 0 ? (
              <div className="leaf-online">
                <p role="status">{gazReady ? "Not in the built-in list." : "Loading places…"}</p>
                <div className="v-actions">
                  <button
                    type="button"
                    className="v-btn v-btn--ghost v-btn--sm"
                    disabled={online === "busy"}
                    onClick={() => void goOnline()}
                  >
                    {online === "busy" ? "Searching…" : "Search online"}
                  </button>
                  <button type="button" className="v-btn v-btn--quiet v-btn--sm" onClick={openManual}>
                    Type coordinates
                  </button>
                </div>
              </div>
            ) : null}
            <div className={`leaf-chosen${draft.place ? " is-set" : tried ? " is-missing" : ""}`} id="leaf-place-chosen" aria-live="polite">
              {draft.place ? (
                <>
                  <span className="leaf-chosen__tick">
                    <Tick />
                  </span>
                  <span className="leaf-chosen__body">
                    <span className="leaf-chosen__t">{placeLabel(draft.place)}</span>
                    {draft.place.source === "manual" ? <span className="leaf-ll">{latLon(draft.place)}</span> : null}
                  </span>
                </>
              ) : (
                <span>{tried ? "Not chosen yet." : "The place you pick will show here."}</span>
              )}
            </div>

            {clockTrouble ? (
              <p className="v-note v-note--warn" role="status">
                {clockTrouble}
              </p>
            ) : null}
            {draft.override !== "none" ? (
              <p className="v-note v-note--warn">You set the clock offset by hand. The chart will show "(manual)" next to the time zone.</p>
            ) : null}

            <details className="v-fold" open={draft.override !== "none" || advOpen} onToggle={(e) => setAdvOpen(e.currentTarget.open)}>
              <summary>
                <span>
                  Advanced
                  <span className="v-fold__s">Clock offset, coordinates and calculation. Rarely needed.</span>
                </span>
              </summary>
              <div className="v-fold__body">
                <div className="v-field">
                  <span className="v-label" id="leaf-off-l">
                    Clock offset <InfoDot id="timezone" />
                  </span>
                  <span className="v-hint">
                    {pre1955India
                      ? "Before 1955 some Indian births used Bombay Time (+04:51). Leave on automatic unless you know the clock used."
                      : "Worked out automatically from the time-zone database (tzdb). Leave it unless you know better."}
                  </span>
                  <div className="v-seg leaf-seg" role="radiogroup" aria-labelledby="leaf-off-l">
                    {(["none", "bombay", "manual"] as const).map((o) => (
                      <button
                        key={o}
                        type="button"
                        role="radio"
                        aria-checked={draft.override === o}
                        onClick={() =>
                          o === "manual" && draft.override !== "manual"
                            ? patch({ override: o, manualOffsetMin: offsetAtPlace() })
                            : set("override", o)
                        }
                      >
                        {o === "none" ? "Automatic" : o === "bombay" ? "Bombay +04:51" : "Manual"}
                      </button>
                    ))}
                  </div>
                </div>
                {draft.override === "manual" ? (
                  <fieldset className="bf-group">
                    <legend className="v-label">Manual UTC offset</legend>
                    <div className="bf-row bf-row--pair">
                      <div className="bf-cell">
                        <label htmlFor="leaf-off-h">Offset hours</label>
                        <select
                          id="leaf-off-h"
                          className="v-select bf-select"
                          value={offSign * Math.floor(offAbs / 60)}
                          onChange={(e) => {
                            const v = Number(e.target.value);
                            set("manualOffsetMin", (v < 0 ? -1 : 1) * (Math.abs(v) * 60 + (offAbs % 60)));
                          }}
                        >
                          {Array.from({ length: 27 }, (_, i) => i - 12).map((v) => (
                            <option key={v} value={v}>
                              {v < 0 ? "−" : "+"}
                              {String(Math.abs(v)).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="bf-cell">
                        <label htmlFor="leaf-off-m">Offset minutes</label>
                        <select
                          id="leaf-off-m"
                          className="v-select bf-select"
                          value={offAbs % 60}
                          onChange={(e) => set("manualOffsetMin", offSign * (Math.floor(offAbs / 60) * 60 + Number(e.target.value)))}
                        >
                          {Array.from({ length: 60 }, (_, i) => i).map((m) => (
                            <option key={m} value={m}>
                              {String(m).padStart(2, "0")}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </fieldset>
                ) : null}

                <div className="v-field">
                  <span className="v-label">Coordinates</span>
                  <span className="v-hint">For a village that is not in the list, type its latitude and longitude.</span>
                  {draft.place ? <span className="leaf-ll">Now: {latLon(draft.place)}</span> : null}
                  {manual ? (
                    <ManualPlace
                      initial={draft.place ?? SKY_FALLBACK}
                      onSet={(p) => {
                        choosePlace(p);
                        setManual(false);
                      }}
                    />
                  ) : (
                    <div>
                      <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => setManual(true)}>
                        Type coordinates by hand
                      </button>
                    </div>
                  )}
                </div>

                <div className="v-field">
                  <span className="v-label">Worked out</span>
                  {stripEl}
                </div>
                <div className="v-field">
                  <span className="v-label">
                    Ayanāṃśa <InfoDot id="ayanamsha" />
                  </span>
                  <span className="v-hint">
                    Lahiri (
                    {settings.preset.ayanamsa === "se-true"
                      ? "SE-true"
                      : settings.preset.ayanamsa === "se-mean"
                        ? "SE-mean"
                        : "Drik-compatible"}
                    ) · node: {settings.preset.node}.{" "}
                    <Link className="leaf-inline" to="/drawer">
                      Change in Settings
                    </Link>
                  </span>
                </div>
              </div>
            </details>
          </>
        ) : null}

        {step === LAST ? (
          <>
            <dl className="v-card v-card--flush leaf-review">
              <div>
                <dt>Name</dt>
                <dd>{draft.name.trim()}</dd>
                <dd className="leaf-review__act">
                  <button type="button" className="v-btn v-btn--quiet v-btn--sm" aria-label="Change the name" onClick={() => goTo(0)}>
                    Change
                  </button>
                </dd>
              </div>
              <div>
                <dt>Born</dt>
                <dd>
                  <Readback
                    y={draft.y}
                    mo={draft.mo}
                    d={draft.d}
                    hour12={draft.hour12}
                    ampm={draft.ampm}
                    mi={draft.mi}
                    timeUnknown={draft.timeUnknown}
                  />
                </dd>
                <dd className="leaf-review__act">
                  <button
                    type="button"
                    className="v-btn v-btn--quiet v-btn--sm"
                    aria-label="Change the date and time"
                    onClick={() => goTo(1)}
                  >
                    Change
                  </button>
                </dd>
              </div>
              <div>
                <dt>Place</dt>
                <dd>{draft.place ? placeLabel(draft.place) : "Not chosen yet"}</dd>
                <dd className="leaf-review__act">
                  <button type="button" className="v-btn v-btn--quiet v-btn--sm" aria-label="Change the place" onClick={() => goTo(2)}>
                    Change
                  </button>
                </dd>
              </div>
              <div>
                <dt>Tradition</dt>
                <dd>
                  {TRADITION_LABEL[draft.tradition]} · {draft.handedness === "right" ? "right-handed" : "left-handed"}
                </dd>
                <dd className="leaf-review__act">
                  <button
                    type="button"
                    className="v-btn v-btn--quiet v-btn--sm"
                    aria-label="Change the tradition or writing hand"
                    onClick={() => goTo(0)}
                  >
                    Change
                  </button>
                </dd>
              </div>
            </dl>

            <section className={`leaf-check${check ? "" : " is-waiting"}`} aria-labelledby="leaf-check-h" aria-live="polite">
              <div className="v-sec">
                <h3 id="leaf-check-h">Check before you save</h3>
              </div>
              {check ? (
                <>
                  <dl className="v-card leaf-check__grid">
                    <div>
                      <dt>Moon sign (rāśi)</dt>
                      <dd>
                        {rashiBoth(check.moonSign, draft.tradition)}
                        <small>{SIGN_WESTERN[check.moonSign]}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Birth star (nakṣatra)</dt>
                      <dd>
                        {nakBoth(check.nak, draft.tradition)}
                        <small>Quarter (pada) {check.pada}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>Rising sign (lagna)</dt>
                      <dd>
                        {draft.timeUnknown ? "needs the time" : rashiBoth(check.lagnaSign, draft.tradition)}
                        {draft.timeUnknown ? null : <small>{SIGN_WESTERN[check.lagnaSign]}</small>}
                      </dd>
                    </div>
                  </dl>
                  <p className="leaf-check__p">
                    If this is not what the family knows, the usual culprits are am/pm, the day, or the town. Tap Change above and watch
                    this update.
                  </p>
                </>
              ) : (
                <p className="v-card leaf-check__p">
                  {problem ?? "These details could not be worked out."} Your Moon sign, birth star and rising sign appear here as soon as
                  they can be worked out.
                </p>
              )}
            </section>

            {clockTrouble ? (
              <p className="v-note v-note--warn" role="status">
                {clockTrouble}
              </p>
            ) : null}
            {draft.timeUnknown ? (
              <p className="v-note">The time of birth is not known, so noon is used and the rising sign is left out.</p>
            ) : null}
            {draft.override !== "none" ? (
              <p className="v-note v-note--warn">You set the clock offset by hand. The chart will show "(manual)" next to the time zone.</p>
            ) : null}

            <details className="v-fold">
              <summary>
                <span>
                  Technical details
                  <span className="v-fold__s">Time zone, clock offset and Julian Day, as worked out.</span>
                </span>
              </summary>
              <div className="v-fold__body">
                {stripEl}
                {draft.place ? <p className="leaf-ll leaf-coords">Coordinates: {latLon(draft.place)}</p> : null}
              </div>
            </details>
          </>
        ) : null}

        {step === 0 && !id && (restored || (!draft.name && !draft.d && !draft.place)) ? (
          <div className="leaf-example">
            <span className="v-muted">Just looking around?</span>
            <button type="button" className="v-link" onClick={fillExample}>
              Fill in an example (Rahul, 14 Mar 1994)
            </button>
          </div>
        ) : null}

        {/* The way forward stays in reach: this bar is pinned to the bottom of the scrolling page. */}
        <div className="leaf-foot" data-testid="leaf-actions">
          {/* On When the sentence under the fields already says what is missing. */}
          {tried && problem && step !== 1 ? (
            <p className="v-error leaf-problem" role="alert">
              {problem}
            </p>
          ) : null}
          <div className="leaf-foot__row">
            {step > 0 ? (
              <button type="button" className="v-btn v-btn--ghost" onClick={back}>
                Back
              </button>
            ) : null}
            {step === LAST ? (
              <button type="submit" className="v-btn leaf-foot__go" disabled={!resolved.m}>
                {id ? "Save changes" : "Save"}
              </button>
            ) : (
              <button type="submit" className="v-btn leaf-foot__go">
                Next
              </button>
            )}
          </div>
        </div>
      </form>

      <Sheet open={online === "asking"} onClose={() => setOnline("idle")} label="Search online?">
        <div className="leaf-ask">
          <h2>Search online?</h2>
          <p>
            Vyomaphala works offline. To look up “{query.trim()}”, only the place name would be sent to Open-Meteo’s geocoder (and, if that
            finds nothing, to OpenStreetMap Nominatim). No birth details, no names of people. You will be asked once.
          </p>
          <div className="v-actions">
            <button
              type="button"
              className="v-btn"
              onClick={() => {
                void saveSettings({ onlineLookupAllowed: true }).then(() => {
                  setOnline("idle");
                  void goOnline(true);
                });
              }}
            >
              Allow and search
            </button>
            <button type="button" className="v-btn v-btn--ghost" onClick={() => setOnline("idle")}>
              Stay offline
            </button>
          </div>
        </div>
      </Sheet>
    </Page>
  );
}

function ManualPlace({ initial, onSet }: { initial: Place; onSet: (p: Place) => void }) {
  const [lat, setLat] = useState(String(initial.lat));
  const [lon, setLon] = useState(String(initial.lon));
  const [name, setName] = useState("");
  const la = Number(lat);
  const lo = Number(lon);
  const ok =
    lat.trim() !== "" && lon.trim() !== "" && Number.isFinite(la) && Number.isFinite(lo) && Math.abs(la) <= 90 && Math.abs(lo) <= 180;
  const use = () => {
    if (ok) onSet({ name: name.trim() || `${la.toFixed(2)}, ${lo.toFixed(2)}`, country: "", lat: la, lon: lo, source: "manual" });
  };
  // Enter in these boxes uses the coordinates; it must not skip to the next step.
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    use();
  };
  return (
    <fieldset className="bf-group leaf-manual">
      <legend className="v-label">Manual coordinates</legend>
      <div className="bf-cell">
        <label htmlFor="leaf-man-name">Place name</label>
        <input
          id="leaf-man-name"
          className="v-input"
          value={name}
          autoComplete="off"
          placeholder="Village"
          onChange={(e) => setName(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </div>
      <div className="bf-row bf-row--pair">
        <div className="bf-cell">
          <label htmlFor="leaf-man-lat">Latitude (°N)</label>
          <input
            id="leaf-man-lat"
            className="v-input"
            inputMode="decimal"
            autoComplete="off"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
        <div className="bf-cell">
          <label htmlFor="leaf-man-lon">Longitude (°E)</label>
          <input
            id="leaf-man-lon"
            className="v-input"
            inputMode="decimal"
            autoComplete="off"
            value={lon}
            onChange={(e) => setLon(e.target.value)}
            onKeyDown={onKeyDown}
          />
        </div>
      </div>
      <div>
        <button type="button" className="v-btn v-btn--ghost v-btn--sm" disabled={!ok} onClick={use}>
          Use this place
        </button>
      </div>
    </fieldset>
  );
}
