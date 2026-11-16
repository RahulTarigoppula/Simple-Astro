import { useLiveQuery } from "dexie-react-hooks";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useActiveProfile, useHere, useSettings } from "../../app/hooks";
import { InfoDot } from "../../components/ui/Explain";
import { HoldStamp } from "../../components/ui/HoldStamp";
import { Page, Row, Section } from "../../components/ui/Page";
import { Sheet } from "../../components/ui/Sheet";
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
import { HereSheet } from "../here/HereSheet";
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

/** One setting: its name, one plain line of what it does, and the control on the right. */
function Setting({
  label,
  help,
  stack,
  children,
}: {
  label: React.ReactNode;
  help?: React.ReactNode;
  /** The control sits under the name, full width (segmented choices). */
  stack?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`set-row${stack ? " set-row--stack" : ""}`}>
      <span className="set-row__body">
        <span className="set-row__t">{label}</span>
        {help ? <span className="set-row__s">{help}</span> : null}
      </span>
      <span className="set-row__end">{children}</span>
    </div>
  );
}

function Toggle({
  label,
  info,
  help,
  on,
  onChange,
  disabled,
}: {
  label: string;
  info?: React.ReactNode;
  help?: string;
  on: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Setting
      label={
        <>
          {label}
          {info}
        </>
      }
      help={help}
    >
      <button
        type="button"
        role="switch"
        className="set-switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        onClick={() => {
          onChange(!on);
          play("tick");
          haptics.selection();
        }}
      >
        <span className="set-switch__track" aria-hidden="true" />
        <span className="set-switch__word" aria-hidden="true">
          {on ? "On" : "Off"}
        </span>
      </button>
    </Setting>
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
    <Setting label={label} help={help} stack>
      <span className="v-seg set-seg" role="radiogroup" aria-label={label}>
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
    </Setting>
  );
}

/** Anonymous counts (screens opened and named clicks, never personal data). */
function StatsToggle() {
  const [on, setOn] = useState(statsOn);
  return (
    <Toggle
      label="Anonymous usage counts"
      help="Screens opened and buttons tapped. Never names, birth details or photos."
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
    <Toggle
      label="Opening journey"
      help="The intro plays when Vyomaphala opens."
      on={on}
      onChange={(v) => {
        setJourneyAtStart(v);
        setOn(v);
      }}
    />
  );
}

/** The three ayanāṃśa presets, each with its value at the chart's date and its distance from the reference. */
function AyanamsaChoice({ jdTt, value, onChange }: { jdTt: number; value: AyanamsaPreset; onChange: (p: AyanamsaPreset) => void }) {
  const vals = useMemo(() => AYANAMSA_PRESETS.map((p) => [p, ayanamsa(jdTt, p)] as const), [jdTt]);
  const ref = vals.find((v) => v[0] === "se-true")?.[1] ?? 0;
  return (
    <div className="set-dial" role="radiogroup" aria-label="Ayanāṃśa preset">
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
            <span className="set-dial__mark" aria-hidden="true" />
            <span className="set-dial__t">{PRESET_NAME[p]}</span>
            <span className="set-dial__s">
              {formatDms(a)} · {d === 0 ? "ref" : `${d > 0 ? "+" : "−"}${Math.abs(d).toFixed(1)}″`}
            </span>
          </button>
        );
      })}
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
  const here = useHere(active);
  const [hereOpen, setHereOpen] = useState(false);

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

  const closeSheet = () => {
    setMode("none");
    setPass("");
    setPass2("");
    setFile(null);
  };

  return (
    <Page label="Settings" title="Settings" lede="The defaults are right for almost everyone." back noPerson className="set">
      <Section title="Look" id="set-look" />
      <ul className="v-list" aria-labelledby="set-look">
        <li>
          <Radio
            label="Theme"
            help="Auto follows your phone."
            value={settings.theme}
            options={[
              ["auto", "Auto"],
              ["night", "Dark"],
              ["day", "Light"],
            ]}
            onChange={(v) => set({ theme: v })}
          />
        </li>
        <li>
          <Radio
            label="Text size"
            value={settings.textSize}
            options={[
              ["normal", "Normal"],
              ["large", "Large"],
              ["larger", "Larger"],
            ]}
            onChange={(v) => set({ textSize: v })}
          />
        </li>
        <li>
          <Radio
            label="Chart style"
            value={settings.chartStyle}
            options={[
              ["north", "North Indian"],
              ["south", "South Indian"],
            ]}
            onChange={(v) => set({ chartStyle: v })}
          />
        </li>
      </ul>

      <Section title="Sound and motion" id="set-sound" />
      <ul className="v-list" aria-labelledby="set-sound">
        <li>
          <Toggle label="Sound" help="Soft sounds when you tap and save." on={settings.sound} onChange={(v) => set({ sound: v })} />
        </li>
        <li>
          <Toggle label="Haptics" help="A small buzz on taps." on={settings.haptics} onChange={(v) => set({ haptics: v })} />
        </li>
        <li>
          <Toggle label="Calm mode" help="Less motion and no sounds." on={settings.calmDesk} onChange={(v) => set({ calmDesk: v })} />
        </li>
        <li>
          <JourneyToggle />
        </li>
        <li>
          <Row to="/journey" title="Play the intro now" />
        </li>
      </ul>

      <Section title="Your data" id="set-data" />
      <section className="v-card set-backup" aria-label="Backup">
        <h3 className="v-card__title">Backup</h3>
        <p className="v-card__sub">Everything stays on this device. A backup is encrypted with a passphrase only you know.</p>
        <BackupAge zone={active?.birth.zone ?? null} />
        <div className="set-backup__btns">
          <button type="button" className="v-btn" onClick={() => setMode("export")}>
            Create a backup
          </button>
          <button type="button" className="v-btn v-btn--ghost" onClick={() => setMode("import")}>
            Restore a backup
          </button>
        </div>
      </section>
      <ul className="v-list" aria-labelledby="set-data">
        <li>
          <Row
            title="Where you are now"
            sub={here.birthplace ? "Each person's birthplace" : here.name.split(",").slice(0, 2).join(",")}
            onClick={() => setHereOpen(true)}
          />
        </li>
        <li>
          <Setting
            label="Prepare for offline"
            help={<span aria-live="polite">{warm || "Saves the palm and sky models, about 30 MB."}</span>}
          >
            <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => void prepareOffline()}>
              Download
            </button>
          </Setting>
        </li>
        <li>
          <StatsToggle />
        </li>
      </ul>
      <details className="v-fold">
        <summary>What Vyomaphala keeps, and where</summary>
        <div className="v-fold__body">
          <p>Only in this browser, on this device. Vyomaphala has no server and no account, so there is no copy anywhere else.</p>
          <ul className="set-kept">
            <li>The people you add: name, birth date, time and place.</li>
            <li>Palm photos, only if you take one.</li>
            <li>Your settings, and charts it has already worked out (to open faster).</li>
            <li>Place names you searched online, for up to 90 days.</li>
          </ul>
          <p>Clearing this site's data in your browser removes all of it too.</p>
          <p>
            Where you are now is used for today's hours, sunrise and the almanac. Anonymous usage counts are which screens are opened and
            which buttons are tapped, so Rahul can see how Vyomaphala is used. Never your name, birth details, places or photos. No cookies.
            Off automatically if your browser asks not to be tracked.
          </p>
          {est ? <p className="v-small v-muted">Using {(est.usage / 1e6).toFixed(1)} MB on this device.</p> : null}
        </div>
      </details>

      <Section title="Advanced" />
      <details className="v-fold">
        <summary>
          <span>
            Calculation choices
            <span className="v-fold__s">For people who know Jyotiṣa. These change every chart.</span>
          </span>
        </summary>
        <div className="v-fold__body set-adv">
          <div>
            <h3 className="set-h3">
              Zodiac starting point <span className="v-muted">(Ayanāṃśa)</span> <InfoDot id="ayanamsha" />
            </h3>
            <AyanamsaChoice jdTt={jdTt} value={settings.preset.ayanamsa} onChange={(p) => setPreset({ ayanamsa: p })} />
          </div>
          <ul className="set-plain">
            <li>
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
            </li>
            <li>
              <Radio
                label="Daśā year"
                help="The length of a year in the life chapters."
                value={settings.preset.dashaYearDays}
                options={[
                  [365.25, "365.25 d"],
                  [360, "360 d"],
                ]}
                onChange={(v) => setPreset({ dashaYearDays: v })}
              />
            </li>
            <li>
              <Radio
                label="Sunrise"
                help="Which part of the Sun marks sunrise."
                value={settings.preset.sunrise}
                options={[
                  ["upper-limb-refracted", "upper limb"],
                  ["disc-centre", "disc centre"],
                ]}
                onChange={(v) => setPreset({ sunrise: v })}
              />
            </li>
            <li>
              <Radio
                label="Guna Milan tables"
                help="Which school's tables the match score uses."
                value={settings.ashtakootaSchool}
                options={[
                  ["north-common", "North Indian"],
                  ["pyjhora", "PyJHora"],
                ]}
                onChange={(v) => set({ ashtakootaSchool: v })}
              />
            </li>
            <li>
              <Toggle
                label="Bhakūṭa cancellation"
                help="Apply the classical exception in the match score."
                on={settings.bhakootCancellation}
                onChange={(v) => set({ bhakootCancellation: v })}
              />
            </li>
            <li>
              <Radio
                label="Chart script"
                help="The letters inside the chart figure."
                value={settings.chartScript}
                options={[
                  ["devanagari", "देव"],
                  ["latin", "Latin"],
                ]}
                onChange={(v) => set({ chartScript: v })}
              />
            </li>
            <li>
              <Toggle
                label="Devanagari digits"
                help="In the chart figure and the planet ledger only."
                on={settings.devanagariDigits}
                onChange={(v) => set({ devanagariDigits: v })}
              />
            </li>
            <li>
              <Radio
                label="Palm framing"
                help="Which hand the palm reading treats as the main one."
                value={settings.handFraming}
                options={[
                  ["dominant", "dominant"],
                  ["classical", "classical"],
                ]}
                onChange={(v) => set({ handFraming: v })}
              />
            </li>
          </ul>
        </div>
      </details>

      <Section title="About" />
      <ul className="v-list">
        <li>
          <Row to="/guide" title="How to use Vyomaphala" />
        </li>
        <li>
          <Row to="/about" title="How Vyomaphala was made" />
        </li>
        <li>
          <Row title="Version" sub={`astronomy-engine ${__ENGINE_BUILD__}, computed on this device`} end={__APP_VERSION__} />
        </li>
      </ul>
      <details className="v-fold">
        <summary>Credits and licences</summary>
        <div className="v-fold__body">
          <ul className="set-credits">
            {credits.map((c) => (
              <li key={c.name}>
                <span>
                  <b>{c.name}</b>
                  {c.author ? `, ${c.author}` : ""}
                </span>
                <span className="set-credits__l">{c.licence}</span>
              </li>
            ))}
          </ul>
        </div>
      </details>

      <section className="set-danger" aria-label="Delete everything">
        <h2 className="set-danger__t">Delete everything</h2>
        <p className="v-small v-muted">Removes every person, palm photo, chart and setting from this device. It cannot be undone.</p>
        <HoldStamp
          className="set-wipe"
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
      <p className="v-foot">For reflection, not advice.</p>

      <HereSheet open={hereOpen} onClose={() => setHereOpen(false)} profile={active} here={here} />
      <Sheet open={mode !== "none"} onClose={closeSheet} label={mode === "export" ? "Create an encrypted backup" : "Restore from a backup"}>
        {mode === "export" ? (
          <form
            className="set-sheet"
            onSubmit={(e) => {
              e.preventDefault();
              void doExport();
            }}
          >
            <h2>Create an encrypted backup</h2>
            <p className="v-muted">Choose a passphrase. Without it the backup cannot be opened, and it cannot be recovered.</p>
            <label className="v-field">
              <span className="v-label">Passphrase (6+ characters)</span>
              <input
                className="v-input"
                type="password"
                autoComplete="new-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </label>
            <label className="v-field">
              <span className="v-label">Once more</span>
              <input
                className="v-input"
                type="password"
                autoComplete="new-password"
                value={pass2}
                onChange={(e) => setPass2(e.target.value)}
              />
            </label>
            {pass2 && pass !== pass2 ? (
              <p className="v-error" role="alert">
                The two passphrases differ.
              </p>
            ) : null}
            <div className="v-actions">
              <button type="submit" className="v-btn" disabled={busy || pass.length < 6 || pass !== pass2}>
                {busy ? "encrypting…" : "Encrypt and save"}
              </button>
              <button type="button" className="v-btn v-btn--quiet" onClick={closeSheet}>
                Cancel
              </button>
            </div>
          </form>
        ) : mode === "import" ? (
          <form
            className="set-sheet"
            onSubmit={(e) => {
              e.preventDefault();
              void doImport();
            }}
          >
            <h2>Restore from a backup</h2>
            <p className="v-note v-note--care">Restoring replaces everything in Vyomaphala on this device with the backup's contents.</p>
            <label className="v-field">
              <span className="v-label">Backup file</span>
              <input
                ref={fileInput}
                className="set-file"
                type="file"
                accept=".chowki,application/octet-stream"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </label>
            <label className="v-field">
              <span className="v-label">Passphrase</span>
              <input
                className="v-input"
                type="password"
                autoComplete="current-password"
                value={pass}
                onChange={(e) => setPass(e.target.value)}
              />
            </label>
            <div className="v-actions">
              <button type="submit" className="v-btn" disabled={busy || !file || !pass}>
                {busy ? "restoring…" : "Restore"}
              </button>
              <button type="button" className="v-btn v-btn--quiet" onClick={closeSheet}>
                Cancel
              </button>
            </div>
          </form>
        ) : null}
      </Sheet>
    </Page>
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
    <p className="v-note v-note--warn">{text} A phone can be lost. Keep an encrypted backup somewhere else.</p>
  ) : (
    <p className="v-small v-muted">{text}</p>
  );
}
