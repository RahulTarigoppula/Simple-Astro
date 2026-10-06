// The ⋯ sheet for one leaf: open, edit, Milan with…, palm, the wax envelope, and Burn (hold).
import { useState } from "react";
import { envelopeFileName, exportEnvelope } from "../../data/crypto";
import type { Profile } from "../../engine/types";
import { saveFile } from "../../platform/files";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { BurnHold } from "./BurnHold";
import { birthLine, leafMoon } from "./leafFacts";
import type { LeafTool } from "./Leaf";

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
  const name = profile.name || "Unnamed leaf";
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
              Open the Janam Patri
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.onTool("edit")}>
              Edit the leaf
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.setMode("milan")}>
              Milan with…
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.onTool("palm")}>
              Palm · <span lang="hi">हस्त रेखा</span>
            </button>
          </li>
          <li>
            <button type="button" className="leafsheet__row" onClick={() => props.setMode("export")}>
              Export in a wax envelope
            </button>
          </li>
          <li>
            <BurnHold
              className="leafsheet__row leafsheet__burn"
              label="Burn this leaf — hold"
              ariaLabel={`Burn ${name}'s leaf — hold to burn it and its palm prints from this device`}
              onProgress={props.onBurnProgress}
              onBurn={props.onBurn}
            />
          </li>
        </ul>
      ) : null}

      {mode === "milan" ? (
        <div className="leafsheet__pick">
          <p className="p p--muted">
            First leaf: <b>{name}</b>. Choose the second leaf to lay beside it.
          </p>
          {others.length === 0 ? (
            <p className="p">There is no other leaf in the bundle yet — write one first.</p>
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
      await saveFile(blob, envelopeFileName(), "Chowki wax envelope");
      play("thunk");
      toast("Sealed in a wax envelope (AES-GCM). Keep the passphrase — it cannot be recovered.");
      onDone();
    } catch (e) {
      setErr(`The envelope would not seal: ${e instanceof Error ? e.message : String(e)}`);
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
        The envelope carries the whole bundle — every leaf, chart and palm print — sealed with your passphrase (AES-GCM, PBKDF2 600 000 rounds). Nothing is
        sent anywhere; the file is handed to you.
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
          Pressing the wax…
        </p>
      ) : null}
      <div className="leafsheet__actions">
        <button type="button" className="linkish" onClick={onBack}>
          ‹ Back
        </button>
        <button type="submit" className="stamp" disabled={!ok}>
          <span>Seal the envelope</span>
        </button>
      </div>
    </form>
  );
}
