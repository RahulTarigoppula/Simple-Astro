import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useActiveProfile, useSettings } from "../../app/hooks";
import { Colophon } from "../../components/ui/Colophon";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import attribution from "../../data/attribution.json";
import { envelopeFileName, exportEnvelope, ImportError, importEnvelope } from "../../data/crypto";
import { db } from "../../data/db";
import { clearPatriCache, type StorageEstimateInfo, saveSettings, storageEstimate } from "../../data/repo";
import { AYANAMSA_PRESETS, ayanamsa } from "../../engine/ayanamsa";
import { formatDms } from "../../engine/math";
import { jdTtFromUtcMs } from "../../engine/time";
import type { AyanamsaPreset, EnginePreset, Settings } from "../../engine/types";
import { saveFile } from "../../platform/files";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { zoneClock } from "../today/zone";
import "./drawer.css";

const HEAVY_SCREENS = import.meta.glob(["../hast/*Screen.tsx", "../sky/*Screen.tsx"]);

const PRESET_NAME: Record<AyanamsaPreset, string> = {
  "se-true": "Lahiri · SE-true (nutation-inclusive)",
  "se-mean": "Lahiri · SE-mean (no nutation)",
  "drik-mean": "Lahiri · Drik-compatible (mean)",
};

interface Credit {
  name: string;
  licence?: string;
  author?: string;
  use?: string;
}

function Toggle({
  label,
  help,
  on,
  onChange,
  disabled,
}: {
  label: string;
  help?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="toggle-row">
      <span className="v">
        {label}
        {help ? <span className="help">{help}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        className="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          onChange(!on);
          play("tick");
          haptics.selection();
        }}
      />
    </div>
  );
}

function Radio<T extends string | number>({
  label,
  help,
  value,
  options,
  onChange,
}: {
  label: string;
  help?: string;
  value: T;
  options: Array<[T, string, boolean?]>;
  onChange: (v: T) => void;
}) {
  return (
    <div className="radio-row" role="radiogroup" aria-label={label}>
      <span className="v">
        {label}
        {help ? <span className="help">{help}</span> : null}
      </span>
      <span className="seg">
        {options.map(([v, text, disabled]) => (
          <button
            key={String(v)}
            type="button"
            role="radio"
            aria-checked={value === v}
            disabled={disabled}
            onClick={() => {
              onChange(v);
              play("tick");
              haptics.selection();
            }}
          >
            {text}
          </button>
        ))}
      </span>
    </div>
  );
}

/** The three ayanāṃśa presets as ticks on a magnified brass arc, labelled at the chart's date. */
function DialSegment({ jdTt, value, onChange }: { jdTt: number; value: AyanamsaPreset; onChange: (p: AyanamsaPreset) => void }) {
  const vals = useMemo(() => AYANAMSA_PRESETS.map((p) => [p, ayanamsa(jdTt, p)] as const), [jdTt]);
  const lo = Math.min(...vals.map((v) => v[1]));
  const hi = Math.max(...vals.map((v) => v[1]));
  const span = Math.max(hi - lo, 1e-6);
  const ref = vals.find((v) => v[0] === "se-true")?.[1] ?? 0;
  const x = (a: number) => 60 + ((a - lo) / span) * 300;
  return (
    <div className="dial-seg">
      <svg viewBox="0 0 420 120" aria-hidden="true" data-decorative="true">
        <defs>
          <linearGradient id="dial-brass" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="var(--brass-hi)" />
            <stop offset=".5" stopColor="var(--brass-mid)" />
            <stop offset="1" stopColor="var(--brass-lo)" />
          </linearGradient>
        </defs>
        <path d="M10 100 Q210 10 410 100 L410 118 Q210 28 10 118Z" fill="url(#dial-brass)" />
        {Array.from({ length: 41 }, (_, i) => {
          const t = i / 40;
          const xx = 10 + t * 400;
          const yy = 100 - Math.sin(t * Math.PI) * 45;
          return (
            <path key={xx} d={`M${xx} ${yy}v${i % 5 === 0 ? 9 : 5}`} stroke="var(--brass-shadow)" strokeWidth={i % 5 === 0 ? 1.4 : 0.8} />
          );
        })}
        {vals.map(([p, a]) => {
          const xx = x(a);
          const t = (xx - 10) / 400;
          const yy = 100 - Math.sin(t * Math.PI) * 45;
          return (
            <g key={p}>
              <path
                d={`M${xx} ${yy - 30}L${xx} ${yy + 12}`}
                stroke={p === value ? "var(--accent)" : "var(--brass-ink)"}
                strokeWidth={p === value ? 3 : 1.6}
              />
              <text
                x={xx}
                y={yy - 36}
                textAnchor="middle"
                style={{ fontFamily: "var(--font-mono)", fontSize: 12, fill: "var(--ink-muted)" }}
              >
                {p === "se-true" ? "SE-true" : p === "se-mean" ? "SE-mean" : "Drik"}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="dial-list" role="radiogroup" aria-label="Ayanāṃśa preset">
        {vals.map(([p, a]) => {
          const d = (a - ref) * 3600;
          return (
            <button
              key={p}
              type="button"
              role="radio"
              aria-checked={value === p}
              aria-label={`${PRESET_NAME[p]}, ${formatDms(a)}, ${d === 0 ? "reference" : `${d > 0 ? "plus" : "minus"} ${Math.abs(d).toFixed(1)} arcseconds`}`}
              onClick={() => {
                onChange(p);
                play("tick");
                haptics.selection();
              }}
            >
              <span>{PRESET_NAME[p]}</span>
              <span className="delta">
                {formatDms(a)} · {d === 0 ? "ref" : `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}″`}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function DrawerScreen() {
  const settings = useSettings();
  const active = useActiveProfile();
  const navigate = useNavigate();
  const [est, setEst] = useState<StorageEstimateInfo | null>(null);
  const [mode, setMode] = useState<"none" | "export" | "import">("none");
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [warm, setWarm] = useState<string>("");
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void storageEstimate().then(setEst);
  }, []);

  const jdTt = useMemo(() => jdTtFromUtcMs(active?.birth.utcMs ?? Date.now()), [active]);
  const setPreset = (patch: Partial<EnginePreset>) => {
    clearPatriCache();
    void saveSettings({ preset: { ...settings.preset, ...patch } }).then(() =>
      toast("Presets changed. Every cached patri grows a haldi “recompute” tab on its seal.", "warn"),
    );
  };
  const set = (patch: Partial<Settings>) => void saveSettings(patch);

  const doExport = async () => {
    if (pass.length < 6 || pass !== pass2) return;
    setBusy(true);
    try {
      const blob = await exportEnvelope(pass);
      await saveFile(blob, envelopeFileName(), "Chowki wax envelope");
      play("thunk");
      toast("Sealed in a wax envelope (AES-GCM). Keep the passphrase — it cannot be recovered.");
      setMode("none");
    } catch (e) {
      toast(`The envelope would not seal: ${e instanceof Error ? e.message : String(e)}`, "danger");
    } finally {
      setBusy(false);
      setPass("");
      setPass2("");
    }
  };

  const doImport = async () => {
    if (!file || !pass) return;
    setBusy(true);
    try {
      const r = await importEnvelope(file, pass);
      clearPatriCache();
      play("snap");
      toast(`Opened the envelope — ${r.counts.profiles} leaves restored.`);
      setMode("none");
    } catch (e) {
      const code = e instanceof ImportError ? e.code : "";
      toast(
        code === "BAD_PASSPHRASE"
          ? "This seal does not match that passphrase."
          : code === "NEWER_FORMAT"
            ? "This envelope was sealed by a newer Chowki — update the app first."
            : "This file is not a Chowki envelope.",
        "danger",
      );
    } finally {
      setBusy(false);
      setPass("");
    }
  };

  const prepareOffline = async () => {
    const base = import.meta.env.BASE_URL;
    const urls = [
      `${base}models/hand_landmarker.task`,
      `${base}mediapipe/vision_wasm_internal.wasm`,
      `${base}mediapipe/vision_wasm_internal.js`,
    ];
    let bytes = 0;
    setWarm("warming…");
    try {
      for (const u of urls) {
        const r = await fetch(u);
        if (r.ok) bytes += (await r.arrayBuffer()).byteLength;
        setWarm(`${(bytes / 1e6).toFixed(1)} MB in the drawer…`);
      }
      // The lazy screens themselves: importing them puts their chunks in the runtime cache.
      await Promise.allSettled(Object.values(HEAVY_SCREENS).map((load) => load()));
      setWarm(`Ready offline — ${(bytes / 1e6).toFixed(1)} MB of models cached.`);
    } catch {
      setWarm("The wire is quiet — try again with a connection.");
    }
  };

  const credits = [
    ...((attribution as { bundled?: Credit[] }).bundled ?? []),
    ...((attribution as { services?: Credit[] }).services ?? []),
  ];

  return (
    <main className="screen drawer-screen" aria-label="The drawer">
      <div className="drawer-screen__dim">
        <button
          type="button"
          className="linkish"
          style={{ color: "var(--surface)" }}
          onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
        >
          ⇩ close the drawer
        </button>
      </div>
      <div className="drawer-box">
        <span className="drawer-knob" aria-hidden="true" />
        <div className="paper">
          <TurmericBand dev="दराज़" title="The drawer" meta={`Chowki ${__APP_VERSION__}`} level={1} />

          <TurmericBand title="Ayanāṃśa" meta={active ? `at ${active.name}'s birth` : "today"} plain level={2} />
          <DialSegment jdTt={jdTt} value={settings.preset.ayanamsa} onChange={(p) => setPreset({ ayanamsa: p })} />
          <p className="p p--muted">
            Three Lahiri numbers exist and differ by up to 41″: Swiss Ephemeris with nutation, without it, and the value Drik Panchang
            prints. Every chart engraves the one it used.
          </p>

          <Radio
            label="Rāhu / Ketu"
            help="True (osculating) or mean node — up to 1.7° apart."
            value={settings.preset.node}
            options={[
              ["true", "true"],
              ["mean", "mean"],
            ]}
            onChange={(v) => setPreset({ node: v })}
          />
          <Radio
            label="Daśā year"
            value={settings.preset.dashaYearDays}
            options={[
              [365.25, "365.25 d"],
              [360, "360 d"],
            ]}
            onChange={(v) => setPreset({ dashaYearDays: v })}
          />
          <Radio
            label="Sunrise"
            help="Governs vāra and every end time."
            value={settings.preset.sunrise}
            options={[
              ["upper-limb-refracted", "upper limb + refraction"],
              ["disc-centre", "disc centre"],
            ]}
            onChange={(v) => setPreset({ sunrise: v })}
          />

          <TurmericBand title="The desk" plain level={2} />
          <Radio
            label="Chart"
            value={settings.chartStyle}
            options={[
              ["north", "North ◇"],
              ["south", "South ▦"],
            ]}
            onChange={(v) => set({ chartStyle: v })}
          />
          <Radio
            label="Chart script"
            value={settings.chartScript}
            options={[
              ["devanagari", "देव"],
              ["latin", "Lat"],
            ]}
            onChange={(v) => set({ chartScript: v })}
          />
          <Radio
            label="Lamp"
            help="Auto follows the real Sun at the active birthplace."
            value={settings.theme}
            options={[
              ["auto", "auto (sun)"],
              ["night", "lit"],
              ["day", "snuffed"],
            ]}
            onChange={(v) => set({ theme: v })}
          />
          <Radio
            label="Language"
            help="Hindi, Tamil and Telugu are on the way."
            value={settings.language}
            options={[
              ["en", "EN"],
              ["hi", "HI", true],
              ["ta", "TA", true],
              ["te", "TE", true],
            ]}
            onChange={(v) => set({ language: v })}
          />
          <Radio
            label="Palm framing"
            help="Dominant / non-dominant, or the classical right / left."
            value={settings.handFraming}
            options={[
              ["dominant", "dominant"],
              ["classical", "classical"],
            ]}
            onChange={(v) => set({ handFraming: v })}
          />
          <Toggle
            label="Devanagari digits"
            help="Ledger degrees as ०–९; engraved brass stays Latin."
            on={settings.devanagariDigits}
            onChange={(v) => set({ devanagariDigits: v })}
          />
          <Toggle label="Sound" on={settings.sound} onChange={(v) => set({ sound: v })} />
          <Toggle label="Haptics" on={settings.haptics} onChange={(v) => set({ haptics: v })} />
          <Toggle
            label="Calm desk"
            help="No flicker, no rustle, no inertia — whatever the OS says."
            on={settings.calmDesk}
            onChange={(v) => set({ calmDesk: v })}
          />
          <Radio
            label="Aṣṭakūṭa school"
            help="The two differ in three places: Varṇa of earth and air signs (swapped), the Vaśya table, and Yoni Aśva × Mṛga (friendly or inimical)."
            value={settings.ashtakootaSchool}
            options={[
              ["north-common", "North Indian (common)"],
              ["pyjhora", "PyJHora · saravali"],
            ]}
            onChange={(v) => set({ ashtakootaSchool: v })}
          />
          <Toggle
            label="Bhakūṭa cancellation"
            help="Apply the classical cancellation when the Moon-sign lords are one or friends."
            on={settings.bhakootCancellation}
            onChange={(v) => set({ bhakootCancellation: v })}
          />
          <Toggle
            label="Precision mode (AGPL lane)"
            help="Disabled. Swiss Ephemeris is AGPL-3.0: enabling it would relicense the whole app, add a source link and bump the major version. The MIT engine agrees with it to ~20″."
            on={false}
            disabled
            onChange={() => undefined}
          />

          <TurmericBand title="Offline & storage" plain level={2} />
          <div className="toggle-row">
            <span className="v">
              Prepare for offline
              <span className="help">{warm || "Warms the hand model, the palm wasm and the sky so they open in airplane mode."}</span>
            </span>
            <button type="button" className="linkish" onClick={() => void prepareOffline()}>
              prepare ▸
            </button>
          </div>
          {est ? (
            <p className="p p--muted">
              The drawer holds {(est.usage / 1e6).toFixed(1)} MB of {(est.quota / 1e9).toFixed(1)} GB
              {est.persisted ? " (kept safe from eviction)" : ""}.
            </p>
          ) : null}

          <TurmericBand title="Wax envelope" meta="AES-GCM-256" plain level={2} />
          <p className="p p--muted">
            Export is always encrypted with your passphrase (PBKDF2, 600 000 rounds). There is no unencrypted export.
          </p>
          <BackupAge zone={active?.birth.zone ?? null} />
          <div className="tools">
            <button type="button" className="linkish" onClick={() => setMode("export")}>
              Export the drawer ▸
            </button>
            <button type="button" className="linkish" onClick={() => setMode("import")}>
              Import an envelope ▸
            </button>
          </div>

          <TurmericBand title="Colophon" plain level={2} />
          <ul className="credits">
            {credits.map((c) => (
              <li key={c.name}>
                <b style={{ fontWeight: 400 }}>{c.name}</b>
                {c.author ? ` — ${c.author}` : ""} <span className="lic">{c.licence}</span>
                {c.use ? <span style={{ color: "var(--ink-muted)" }}> · {c.use}</span> : null}
              </li>
            ))}
            <li>
              Sounds — synthesised on the device, original <span className="lic">CC0</span>
            </li>
          </ul>
          <Colophon
            rows={[
              ["Version", `Chowki ${__APP_VERSION__} · engine astronomy-engine ${__ENGINE_BUILD__}`],
              [
                "Presets",
                `${settings.preset.ayanamsa} · ${settings.preset.node} node · ${settings.preset.dashaYearDays} d · ${settings.preset.sunrise}`,
              ],
              ["Network", settings.onlineLookupAllowed ? "place search online allowed (names only)" : "none — fully offline"],
            ]}
          >
            <p style={{ margin: "var(--space-3) 0 0" }}>
              <Link className="linkish" to="/">
                Back to the Chowki
              </Link>
            </p>
          </Colophon>
        </div>
      </div>

      <Sheet
        open={mode !== "none"}
        onClose={() => {
          setMode("none");
          setPass("");
          setPass2("");
          setFile(null);
        }}
        label={mode === "export" ? "Export the drawer" : "Import an envelope"}
      >
        {mode === "export" ? (
          <form
            className="drawer-pass"
            onSubmit={(e) => {
              e.preventDefault();
              void doExport();
            }}
          >
            <TurmericBand title="Seal the envelope" level={2} />
            <label className="help">
              Passphrase (6+ characters)
              <input type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </label>
            <label className="help">
              Once more
              <input type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
            </label>
            {pass2 && pass !== pass2 ? (
              <p className="note-haldi" style={{ margin: 0 }}>
                The two passphrases differ.
              </p>
            ) : null}
            <button type="submit" className="stamp" disabled={busy || pass.length < 6 || pass !== pass2}>
              <span>{busy ? "sealing…" : "Seal and save"}</span>
            </button>
          </form>
        ) : mode === "import" ? (
          <form
            className="drawer-pass"
            onSubmit={(e) => {
              e.preventDefault();
              void doImport();
            }}
          >
            <TurmericBand title="Open an envelope" level={2} />
            <p className="note-lac" style={{ margin: 0 }}>
              Importing replaces everything in this drawer with the envelope's contents.
            </p>
            <input
              ref={fileInput}
              type="file"
              accept=".chowki,application/octet-stream"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <label className="help">
              Passphrase
              <input type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} />
            </label>
            <button type="submit" className="stamp" disabled={busy || !file || !pass}>
              <span>{busy ? "opening…" : "Break the seal"}</span>
            </button>
          </form>
        ) : null}
      </Sheet>
    </main>
  );
}

const leaves = (n: number): string => (n === 1 ? "1 leaf lives" : `${n} leaves live`);

/** The backup line: counted in calendar days in `zone` (the active leaf's), not in 24-hour spans.
 *  Exported for tests. */
export function backupAge(count: number, lastMs: number | null, nowMs: number, zone: string): { days: number | null; text: string } {
  if (lastMs === null) {
    return {
      days: null,
      text: `${leaves(count)} only on this device and ${count === 1 ? "has" : "have"} never been sealed in an envelope.`,
    };
  }
  const clock = zoneClock(zone);
  const days = Math.max(0, clock.dayNumber(nowMs) - clock.dayNumber(lastMs));
  const when = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  return { days, text: `Last sealed in an envelope ${when}.` };
}

/** When was the drawer last sealed in an envelope? Leaves live only on this device. */
function BackupAge({ zone }: { zone: string | null }) {
  const last = useLiveQuery(async () => (await db.meta.get("lastExportAt"))?.value ?? null, []);
  const count = useLiveQuery(() => db.profiles.count(), []);
  if (last === undefined || !count) return null;
  const { days, text } = backupAge(count, last, Date.now(), zone ?? Intl.DateTimeFormat().resolvedOptions().timeZone);
  return days === null || days > 30 ? (
    <p className="note-haldi">
      <span aria-hidden="true">⚑</span>
      <span>{text} A phone can be lost; an envelope kept elsewhere cannot be read without your passphrase.</span>
    </p>
  ) : (
    <p className="p p--muted">{text}</p>
  );
}
