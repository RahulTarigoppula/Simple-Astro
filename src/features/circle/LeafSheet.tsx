// "More" for one person: the rare things. Palm reading, choosing a partner for a match, the
// encrypted backup, and delete (a hold, with the person's name on the button).
import { useState } from "react";
import { Link } from "react-router";
import { Row } from "../../components/ui/Page";
import { birthLine } from "../../components/ui/PersonChip";
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
  onPalm: () => void;
  onPair: (other: Profile) => void;
  onBurn: () => void;
  onClose: () => void;
}

const MIN_PASS = 6;

export function LeafSheet(props: LeafSheetProps) {
  const { profile, others, mode } = props;
  const name = profile.name || "Unnamed person";

  return (
    <div className="ppl-sheet">
      <header>
        <h2 className="ppl-sheet__h">{mode === "milan" ? `Match ${name} with…` : mode === "export" ? "Encrypted backup" : name}</h2>
        {mode === "menu" ? <p className="ppl-sheet__sub">{birthLine(profile)}</p> : null}
      </header>

      {mode === "menu" ? (
        <>
          <ul className="v-list">
            <li>
              <Row title="Palm reading" sub="From a photo of the hand" onClick={props.onPalm} />
            </li>
            <li>
              <Row title="Match with…" sub="Choose the partner to compare with" onClick={() => props.setMode("milan")} />
            </li>
            <li>
              <Row title="Back up" sub="An encrypted file with everyone saved here" onClick={() => props.setMode("export")} />
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
