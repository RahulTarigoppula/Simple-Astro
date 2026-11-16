// The one menu for a person: chart, forecast, match, palm, edit, the encrypted backup, and
// delete (a hold, with the person's name on the button).
import { useState } from "react";
import { Link } from "react-router";
import { Row } from "../../components/ui/Page";
import { Avatar, birthLine } from "../../components/ui/PersonChip";
import { envelopeFileName, exportEnvelope } from "../../data/crypto";
import { nakBoth } from "../../data/regional";
import { setMeta } from "../../data/repo";
import type { Profile } from "../../engine/types";
import { saveFile } from "../../platform/files";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { BurnHold } from "./BurnHold";
import { leafMoon } from "./leafFacts";

export type SheetMode = "menu" | "milan" | "export";

interface LeafSheetProps {
  profile: Profile;
  others: Profile[];
  mode: SheetMode;
  ayanamsa: Parameters<typeof leafMoon>[1];
  setMode: (m: SheetMode) => void;
  onChart: () => void;
  onForecast: () => void;
  /** Opens the match straight away with one other person; asks for the partner when there are several. */
  onMatch: () => void;
  onPalm: () => void;
  onPair: (other: Profile) => void;
  onBurn: () => void;
  onClose: () => void;
}

const MIN_PASS = 6;

const G = {
  chart: "M4 4h16v16H4zM4 4l16 16M20 4L4 20",
  forecast: "M4 17l5-5 4 3 7-8M15 7h5v5",
  match: "M9 12a4 4 0 1 0 0-.01M15 12a4 4 0 1 0 0-.01",
  palm: "M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-5.5v-1a1.5 1.5 0 0 1 3 0V11m0-4.5a1.5 1.5 0 0 1 3 0V14c0 3.5-2 6-5.5 6-2.6 0-4-1.200-5.300-3.400L4.500 13.500a1.400 1.400 0 0 1 2.300-1.500L8 13.500",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.500 6.500l4 4",
  backup: "M12 4v10m0 0l-4-4m4 4l4-4M5 19h14",
} as const;

function Glyph({ d }: { d: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function LeafSheet(props: LeafSheetProps) {
  const { profile, others, mode } = props;
  const name = profile.name || "Unnamed person";

  return (
    <div className="ppl-sheet">
      {mode === "menu" ? (
        <header className="ppl-sheet__who">
          <Avatar name={name} size={48} />
          <div>
            <h2 className="ppl-sheet__h">{name}</h2>
            <p className="ppl-sheet__sub">{birthLine(profile)}</p>
          </div>
        </header>
      ) : (
        <h2 className="ppl-sheet__h">{mode === "milan" ? `Match ${name} with…` : "Encrypted backup"}</h2>
      )}

      {mode === "menu" ? (
        <>
          <ul className="v-list ppl-menu">
            <li>
              <Row icon={<Glyph d={G.chart} />} title="Chart" onClick={props.onChart} />
            </li>
            <li>
              <Row icon={<Glyph d={G.forecast} />} title="Forecast" onClick={props.onForecast} />
            </li>
            <li>
              <Row icon={<Glyph d={G.match} />} title="Match with…" onClick={props.onMatch} />
            </li>
            <li>
              <Row icon={<Glyph d={G.palm} />} title="Palm reading" onClick={props.onPalm} />
            </li>
            <li>
              <Row icon={<Glyph d={G.edit} />} title="Edit birth details" to={`/leaf/${profile.id}/edit`} />
            </li>
            <li>
              <Row icon={<Glyph d={G.backup} />} title="Back up everyone" onClick={() => props.setMode("export")} />
            </li>
          </ul>
          <div className="ppl-sheet__danger">
            <BurnHold
              className="v-btn v-btn--danger v-btn--block"
              label={`Hold to delete ${name}`}
              ariaLabel={`Delete ${name}, hold to delete them and their palm photos from this device`}
              onBurn={props.onBurn}
            />
            <p className="v-small v-muted">
              Press and hold. This removes {name} and their palm photos from this device and cannot be undone.
            </p>
          </div>
        </>
      ) : null}

      {mode === "milan" ? (
        <>
          {others.length === 0 ? (
            <>
              <p>There is no one else saved yet. Add the partner first, then match the two.</p>
              <Link to="/leaf/new" className="v-btn">
                Add a person
              </Link>
            </>
          ) : (
            <ul className="v-list">
              {others.map((o) => {
                const m = leafMoon(o, props.ayanamsa);
                return (
                  <li key={o.id}>
                    <Row
                      title={o.name}
                      sub={m ? `Birth star ${nakBoth(m.nak, o.tradition)}` : birthLine(o)}
                      onClick={() => props.onPair(o)}
                    />
                  </li>
                );
              })}
            </ul>
          )}
          <div>
            <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={() => props.setMode("menu")}>
              Back
            </button>
          </div>
        </>
      ) : null}

      {mode === "export" ? <ExportForm onDone={props.onClose} onBack={() => props.setMode("menu")} /> : null}
    </div>
  );
}

function ExportForm({ onDone, onBack }: { onDone: () => void; onBack: () => void }) {
  const [pass, setPass] = useState("");
  const [pass2, setPass2] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const short = pass.length > 0 && pass.length < MIN_PASS;
  const mismatch = pass2.length > 0 && pass !== pass2;
  const ok = pass.length >= MIN_PASS && pass === pass2 && !busy;

  const seal = async () => {
    if (!ok) return;
    setBusy(true);
    setErr(null);
    try {
      const blob = await exportEnvelope(pass);
      await saveFile(blob, envelopeFileName(), "Vyomaphala encrypted backup");
      await setMeta("lastExportAt", Date.now());
      play("thunk");
      toast("Encrypted backup saved (AES-GCM). Keep the passphrase safe. It cannot be recovered.");
      onDone();
    } catch (e) {
      setErr(`Could not create the backup: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setBusy(false);
      setPass("");
      setPass2("");
    }
  };

  return (
    <form
      className="ppl-sheet__form"
      onSubmit={(e) => {
        e.preventDefault();
        void seal();
      }}
    >
      <p className="v-muted">
        The backup holds every person, chart and palm photo, locked with your passphrase. Nothing is sent anywhere; the file is handed to
        you. If you forget the passphrase, nobody can open the file.
      </p>
      <div className="v-field">
        <label className="v-label" htmlFor="env-pass">
          Passphrase
        </label>
        <input
          id="env-pass"
          className="v-input"
          type="password"
          autoComplete="new-password"
          aria-describedby="env-pass-hint"
          value={pass}
          onChange={(e) => setPass(e.target.value)}
        />
        <span id="env-pass-hint" className={short ? "v-error" : "v-hint"} aria-live="polite">
          At least {MIN_PASS} characters.
        </span>
      </div>
      <div className="v-field">
        <label className="v-label" htmlFor="env-pass2">
          Passphrase again
        </label>
        <input
          id="env-pass2"
          className="v-input"
          type="password"
          autoComplete="new-password"
          value={pass2}
          onChange={(e) => setPass2(e.target.value)}
        />
        <span className="v-error" aria-live="polite">
          {mismatch ? "The two passphrases differ." : ""}
        </span>
      </div>
      {err ? (
        <p className="v-note v-note--care" role="alert">
          {err}
        </p>
      ) : null}
      {busy ? (
        <p className="v-muted" role="status">
          Encrypting…
        </p>
      ) : null}
      <div className="v-actions">
        <button type="button" className="v-btn v-btn--ghost" onClick={onBack}>
          Back
        </button>
        <button type="submit" className="v-btn" disabled={!ok}>
          Create the backup
        </button>
      </div>
    </form>
  );
}
