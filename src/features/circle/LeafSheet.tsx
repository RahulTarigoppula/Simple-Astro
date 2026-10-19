// The ⋯ sheet for one leaf: open, edit, Partner Compatibility with…, palm, the wax envelope, and Burn (hold).
import { useState } from "react";
import { envelopeFileName, exportEnvelope } from "../../data/crypto";
import { setMeta } from "../../data/repo";
import type { Profile } from "../../engine/types";
import { saveFile } from "../../platform/files";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { BurnHold } from "./BurnHold";
import type { LeafTool } from "./Leaf";
import { birthLine, leafMoon } from "./leafFacts";

export type SheetMode = "menu" | "milan" | "export";

interface LeafSheetProps {
  profile: Profile;
  others: Profile[];
  mode: SheetMode;
  ayanamsa: Parameters<typeof leafMoon>[1];
  setMode: (m: SheetMode) => void;
  onOpen: () => void;
  onTool: (t: LeafTool) => void;
  onPair: (other: Profile) => void;
  onBurn: () => void;
  onBurnProgress: (k: number) => void;
  onClose: () => void;
}

const MIN_PASS = 6;

export function LeafSheet(props: LeafSheetProps) {
  const { profile, others, mode } = props;
  const name = profile.name || "Unnamed person";
  const moon = leafMoon(profile, props.ayanamsa);

  return (
    <div className="leafsheet">
      <header className="leafsheet__head">
        <h2 className="leafsheet__h">{name}</h2>
        <p className="leafsheet__sub">
          {moon ? (
            <>
              <span lang="hi" className="dev">
                {moon.nakDev}
              </span>{" "}
              · {moon.nakName} · {birthLine(profile)}
            </>
          ) : (
            birthLine(profile)
          )}
        </p>
      </header>

      {mode === "menu" ? (
        <ul className="leafsheet__list">
          <li>
            <button type="button" className="leafsheet__row" onClick={props.onOpen}>
              Open the birth chart
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.onTool("edit")}>
              Edit birth details
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.setMode("milan")}>
              Partner Compatibility with…
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.onTool("palm")}>
              Palm · <span lang="hi">हस्त रेखा</span>
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.setMode("export")}>
              Create an encrypted backup
            </button>
          </li>
          <li>
            <BurnHold
              className="leafsheet__row leafsheet__burn"
              label="Hold to delete"
              ariaLabel={`Delete ${name}, hold to delete them and their palm photos from this device`}
              onProgress={props.onBurnProgress}
              onBurn={props.onBurn}
            />
          </li>
        </ul>
      ) : null}

      {mode === "milan" ? (
        <div className="leafsheet__pick">
          <p className="p p--muted">
            First person: <b>{name}</b>. Choose their partner.
          </p>
          {others.length === 0 ? (
            <p className="p">There is no one else saved yet. Add another person first.</p>
          ) : (
            <ul className="leafsheet__list">
              {others.map((o) => {
                const m = leafMoon(o, props.ayanamsa);
                return (
                  <li key={o.id}>
                    <button type="button" className="leafsheet__row" onClick={() => props.onPair(o)}>
                      {o.name}
                      {m ? (
                        <span className="leafsheet__muted">
                          {" "}
                          · <span lang="hi">{m.nakDev}</span> · {m.nakName}
                        </span>
                      ) : null}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          <p className="leafsheet__back">
            <button type="button" className="linkish" onClick={() => props.setMode("menu")}>
              ‹ Back
            </button>
          </p>
        </div>
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
      className="leafsheet__export"
      onSubmit={(e) => {
        e.preventDefault();
        void seal();
      }}
    >
      <p className="p p--muted">
        The backup holds every person, chart and palm photo, locked with your passphrase. Nothing is sent anywhere; the file is handed to
        you. If you forget the passphrase, nobody can open the file.
      </p>
      <div className="field">
        <label htmlFor="env-pass">Passphrase</label>
        <input id="env-pass" type="password" autoComplete="new-password" value={pass} onChange={(e) => setPass(e.target.value)} />
      </div>
      <div className="field">
        <label htmlFor="env-pass2">Again</label>
        <input id="env-pass2" type="password" autoComplete="new-password" value={pass2} onChange={(e) => setPass2(e.target.value)} />
      </div>
      {short ? <div className="note-haldi">At least {MIN_PASS} characters.</div> : null}
      {mismatch ? <div className="note-haldi">The two passphrases differ.</div> : null}
      {err ? (
        <div className="note-lac" role="alert">
          {err}
        </div>
      ) : null}
      {busy ? (
        <p className="p p--muted" role="status">
          Encrypting…
        </p>
      ) : null}
      <div className="leafsheet__actions">
        <button type="button" className="linkish" onClick={onBack}>
          ‹ Back
        </button>
        <button type="submit" className="stamp" disabled={!ok}>
          <span>Create an encrypted backup</span>
        </button>
      </div>
    </form>
  );
}
