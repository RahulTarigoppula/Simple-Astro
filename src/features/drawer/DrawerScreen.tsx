import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useActiveProfile, useSettings } from "../../app/hooks";
import { InfoDot } from "../../components/ui/Explain";
import { HoldStamp } from "../../components/ui/HoldStamp";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import attribution from "../../data/attribution.json";
import { envelopeFileName, exportEnvelope, ImportError, importEnvelope } from "../../data/crypto";
import { db } from "../../data/db";
import { clearPatriCache, type StorageEstimateInfo, saveSettings, setMeta, storageEstimate, wipeEverything } from "../../data/repo";
import { AYANAMSA_PRESETS, ayanamsa } from "../../engine/ayanamsa";
import { formatDms } from "../../engine/math";
import { jdTtFromUtcMs } from "../../engine/time";
import type { AyanamsaPreset, EnginePreset, Settings } from "../../engine/types";
import { saveFile } from "../../platform/files";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { setStatsOn, statsOn } from "../../platform/stats";
import { toast } from "../../state/ui";
import { journeyAtStart, setJourneyAtStart } from "../journey/Journey";
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
/** Anonymous counts (screens opened and named clicks, never personal data). */
function StatsToggle() {
  const [on, setOn] = useState(statsOn);
  return (
    <Toggle
      label="Anonymous usage counts"
      help="Counts which screens are opened and which buttons are tapped, so Rahul can see how Vyomaphala is used. Never your name, birth details, places or photos. No cookies. Off automatically if your browser asks not to be tracked."
      on={on}
      onChange={(v) => {
        setStatsOn(v);
        setOn(v);
      }}
    />
  );
}

/** Whether the opening journey plays when Vyomaphala opens (stored on this device only). */
function JourneyToggle() {
  const [on, setOn] = useState(journeyAtStart);
  return (
    <Radio
      label="Opening journey"
      help="The intro (from the universe to why Vyomaphala exists) plays when Vyomaphala opens."
      value={on ? "on" : "off"}
      options={[
        ["on", "Play"],
        ["off", "Skip"],
      ]}
      onChange={(v) => {
        setJourneyAtStart(v === "on");
        setOn(v === "on");
      }}
    />
  );
}

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
    saveSettings({ preset: { ...settings.preset, ...patch } })
      .then(() => toast("Settings changed. Every chart uses them from now on.", "warn"))
      .catch((e: unknown) => toast(`Could not save the setting: ${e instanceof Error ? e.message : String(e)}`, "danger"));
  };
  const set = (patch: Partial<Settings>) =>
    void saveSettings(patch).catch((e: unknown) =>
      toast(`Could not save the setting: ${e instanceof Error ? e.message : String(e)}`, "danger"),
    );

  const doExport = async () => {
    if (pass.length < 6 || pass !== pass2) return;
    setBusy(true);
    try {
      const blob = await exportEnvelope(pass);
      await saveFile(blob, envelopeFileName(), "Vyomaphala encrypted backup");
      await setMeta("lastExportAt", Date.now());
      play("thunk");
      toast("Encrypted backup saved (AES-GCM). Keep the passphrase safe. It cannot be recovered.");
      setMode("none");
    } catch (e) {
      toast(`Could not create the backup: ${e instanceof Error ? e.message : String(e)}`, "danger");
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
      toast(`Backup restored: ${r.counts.profiles} ${r.counts.profiles === 1 ? "person" : "people"} restored.`);
      setMode("none");
    } catch (e) {
      const code = e instanceof ImportError ? e.code : "";
      toast(
        code === "BAD_PASSPHRASE"
          ? "That passphrase does not match this backup."
          : code === "NEWER_FORMAT"
            ? "This backup was made by a newer Vyomaphala. Update the app first."
            : "This file is not a Vyomaphala backup.",
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
      `${base}mediapipe/vision_wasm_nosimd_internal.wasm`,
      `${base}mediapipe/vision_wasm_nosimd_internal.js`,
    ];
    let bytes = 0;
    setWarm("warming…");
    try {
      for (const u of urls) {
        const r = await fetch(u);
        if (r.ok) bytes += (await r.arrayBuffer()).byteLength;
        setWarm(`${(bytes / 1e6).toFixed(1)} MB downloaded…`);
      }
      // The lazy screens themselves, and the two big modules they load only when used (the 3-D sky
      // dome and OpenCV): importing them puts their chunks in the runtime cache.
      // OpenCV is loaded by the palm worker, off the main thread; the worker's own fetch lands it in the cache.
      await Promise.allSettled([...Object.values(HEAVY_SCREENS).map((load) => load()), import("../sky/SkyDome")]);
      const { warmPalmWorker } = await import("../hast/palmClient");
      warmPalmWorker();
      setWarm(`Ready offline: ${(bytes / 1e6).toFixed(1)} MB of models cached.`);
    } catch {
      setWarm("No connection. Try again when you are online.");
    }
  };

  const credits = [
    ...((attribution as { bundled?: Credit[] }).bundled ?? []),
    ...((attribution as { services?: Credit[] }).services ?? []),
  ];

  return (
    <main className="screen settings-screen" aria-label="Settings">
      <div className="settings">
        <header className="settings-head">
          <h1>Settings</h1>
          <button
            type="button"
            className="settings-close"
            aria-label="Close settings"
            onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))}
          >
            ✕
          </button>
        </header>
        <p className="settings-lede">The defaults are right for almost everyone.</p>

        <section className="settings-card" aria-labelledby="set-look">
          <h2 id="set-look">Look &amp; feel</h2>
          <Radio
            label="Theme"
            value={settings.theme}
            options={[
              ["auto", "Auto"],
              ["night", "Night"],
              ["day", "Day"],
            ]}
            onChange={(v) => set({ theme: v })}
          />
          <Radio
            label="Chart style"
            help="How birth charts are drawn."
            value={settings.chartStyle}
            options={[
              ["north", "North Indian"],
              ["south", "South Indian"],
            ]}
            onChange={(v) => set({ chartStyle: v })}
          />
          <Toggle label="Sound" on={settings.sound} onChange={(v) => set({ sound: v })} />
          <JourneyToggle />
          <p className="settings-link">
            <Link to="/journey">▶ Play the intro now</Link>
          </p>
        </section>

        <section className="settings-card" aria-labelledby="set-data">
          <h2 id="set-data">Your data</h2>
          <div className="toggle-row">
            <span className="v">
              Prepare for offline
              <span className="help">
                {warm || "Downloads the palm and sky models (about 30 MB) so every screen works without internet."}
              </span>
            </span>
            <button type="button" className="linkish" onClick={() => void prepareOffline()}>
              Download now
            </button>
          </div>

          <p className="settings-note">Everything stays on this device. A backup is encrypted with a passphrase only you know.</p>
          <BackupAge zone={active?.birth.zone ?? null} />
          <div className="settings-actions">
            <button type="button" className="settings-btn" onClick={() => setMode("export")}>
              Create a backup
            </button>
            <button type="button" className="settings-btn settings-btn--ghost" onClick={() => setMode("import")}>
              Restore a backup
            </button>
          </div>
        </section>

        <section className="settings-card" aria-labelledby="set-priv">
          <h2 id="set-priv">What Vyomaphala keeps, and where</h2>
          <p className="settings-note">
            Only in this browser, on this device. Vyomaphala has no server and no account, so there is no copy anywhere else.
          </p>
          <ul className="settings-list">
            <li>The people you add: name, birth date, time and place.</li>
            <li>Palm photos, only if you take one.</li>
            <li>Your settings, and charts it has already worked out (to open faster).</li>
            <li>Place names you searched online, for up to 90 days.</li>
          </ul>
          <p className="settings-note">Clearing this site's data in your browser removes all of it too.</p>
          <StatsToggle />
          <HoldStamp
            className="settings-wipe"
            ms={1500}
            ariaLabel="Delete everything Vyomaphala keeps on this device. Hold to confirm"
            label={<span>Hold to delete everything</span>}
            onFire={() => {
              void wipeEverything().then(() => {
                toast("Everything is deleted from this device.", "danger");
                navigate("/");
              });
            }}
          />
        </section>
        <details className="settings-card settings-more">
          <summary>
            <span>Advanced</span>
            <span className="settings-more__hint">for people who know Jyotiṣa</span>
          </summary>
          <h3>
            Ayanāṃśa <InfoDot id="ayanamsha" />
          </h3>
          <DialSegment jdTt={jdTt} value={settings.preset.ayanamsa} onChange={(p) => setPreset({ ayanamsa: p })} />
          <Radio
            label="Rāhu / Ketu"
            help="True or mean node. They are up to 1.7° apart."
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
            value={settings.preset.sunrise}
            options={[
              ["upper-limb-refracted", "upper limb"],
              ["disc-centre", "disc centre"],
            ]}
            onChange={(v) => setPreset({ sunrise: v })}
          />
          <Radio
            label="Guna Milan tables"
            value={settings.ashtakootaSchool}
            options={[
              ["north-common", "North Indian"],
              ["pyjhora", "PyJHora"],
            ]}
            onChange={(v) => set({ ashtakootaSchool: v })}
          />
          <Toggle label="Bhakūṭa cancellation" on={settings.bhakootCancellation} onChange={(v) => set({ bhakootCancellation: v })} />
          <Radio
            label="Chart script"
            value={settings.chartScript}
            options={[
              ["devanagari", "देव"],
              ["latin", "Latin"],
            ]}
            onChange={(v) => set({ chartScript: v })}
          />
          <Toggle
            label="Devanagari digits"
            help="In the chart figure and the planet ledger only."
            on={settings.devanagariDigits}
            onChange={(v) => set({ devanagariDigits: v })}
          />
          <Radio
            label="Palm framing"
            value={settings.handFraming}
            options={[
              ["dominant", "dominant"],
              ["classical", "classical"],
            ]}
            onChange={(v) => set({ handFraming: v })}
          />
          <Toggle label="Haptics" on={settings.haptics} onChange={(v) => set({ haptics: v })} />
          <Toggle label="Calm mode" help="Less motion and no sounds." on={settings.calmDesk} onChange={(v) => set({ calmDesk: v })} />
          {est ? <p className="settings-note">Using {(est.usage / 1e6).toFixed(1)} MB on this device.</p> : null}
        </details>

        <details className="settings-card settings-more">
          <summary>
            <span>About Vyomaphala</span>
            <span className="settings-more__hint">version {__APP_VERSION__} · credits</span>
          </summary>
          <p className="settings-note">
            Planet positions by astronomy-engine {__ENGINE_BUILD__}, computed on this device. For reflection, not advice.{" "}
            <Link to="/guide">Read the guide</Link>.
          </p>
          <p className="settings-link">
            <Link to="/about">How Vyomaphala was made: sources, methods and checks →</Link>
          </p>
          <ul className="credits">
            {credits.map((c) => (
              <li key={c.name}>
                <b style={{ fontWeight: 500 }}>{c.name}</b>
                {c.author ? `, ${c.author}` : ""} <span className="lic">{c.licence}</span>
              </li>
            ))}
          </ul>
        </details>
      </div>
      <Sheet
        open={mode !== "none"}
        onClose={() => {
          setMode("none");
          setPass("");
          setPass2("");
          setFile(null);
        }}
        label={mode === "export" ? "Create an encrypted backup" : "Restore from a backup"}
      >
        {mode === "export" ? (
          <form
            className="drawer-pass"
            onSubmit={(e) => {
              e.preventDefault();
              void doExport();
            }}
          >
            <TurmericBand title="Create an encrypted backup" level={2} />
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
              <span>{busy ? "encrypting…" : "Encrypt and save"}</span>
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
            <TurmericBand title="Restore from a backup" level={2} />
            <p className="note-lac" style={{ margin: 0 }}>
              Restoring replaces everything in Vyomaphala on this device with the backup's contents.
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
              <span>{busy ? "restoring…" : "Restore"}</span>
            </button>
          </form>
        ) : null}
      </Sheet>
    </main>
  );
}

const leaves = (n: number): string => (n === 1 ? "1 person lives" : `${n} people live`);

/** The backup line: counted in calendar days in `zone` (the active leaf's), not in 24-hour spans.
 *  Exported for tests. */
export function backupAge(count: number, lastMs: number | null, nowMs: number, zone: string): { days: number | null; text: string } {
  if (lastMs === null) {
    return {
      days: null,
      text: `${leaves(count)} only on this device and ${count === 1 ? "has" : "have"} never been backed up.`,
    };
  }
  const clock = zoneClock(zone);
  const days = Math.max(0, clock.dayNumber(nowMs) - clock.dayNumber(lastMs));
  const when = days === 0 ? "today" : days === 1 ? "yesterday" : `${days} days ago`;
  return { days, text: `Last backed up ${when}.` };
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
      <span>{text} A phone can be lost; an encrypted backup kept elsewhere cannot be read without your passphrase.</span>
    </p>
  ) : (
    <p className="p p--muted">{text}</p>
  );
}
