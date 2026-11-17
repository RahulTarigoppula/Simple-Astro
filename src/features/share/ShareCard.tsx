// <ShareButton kind="day|match|stars" … />: a quiet button that opens a sheet with a live preview of
// the share card, a "Hide my name" switch, and Share / Save image. The picture is drawn on this
// device and handed to the device's own share sheet; nothing is uploaded.
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Sheet } from "../../components/ui/Sheet";
import { toast } from "../../state/ui";
import { loadStars } from "../sky/starField";
import { CARD_H, CARD_W, type CardData, cardAlt, cardFilename, renderCard } from "./cards";
import { type DayInput, dayCard, type MatchInput, matchCard, type StarsInput, starsCard } from "./data";
import { saveCard, shareCard } from "./send";
import "./share.css";

export type ShareButtonProps = (({ kind: "day" } & DayInput) | ({ kind: "match" } & MatchInput) | ({ kind: "stars" } & StarsInput)) & {
  /** The words on the button; "Share" unless given. */
  label?: string;
  /** A round icon button with no visible words (the label becomes its accessible name). */
  iconOnly?: boolean;
  className?: string;
};

const COPY = {
  day: { title: "Share this day", name: "Share this day as a picture", hide: "Hide my name", share: "My day" },
  match: { title: "Share this match", name: "Share this match as a picture", hide: "Hide our names", share: "Our match" },
  stars: { title: "Share your stars", name: "Share these stars as a picture", hide: "Hide my name", share: "My stars" },
} as const;

/** The plain data of the card. Only the stars card waits for anything (the bundled star catalogue). */
async function build(p: ShareButtonProps): Promise<CardData> {
  if (p.kind === "day") return dayCard(p);
  if (p.kind === "match") return matchCard(p);
  const cat = await loadStars().catch(() => null);
  return starsCard(p, cat);
}

function ShareIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 15V4M7.5 8.2 12 3.7l4.5 4.5M5 12.5v5.2A2.3 2.3 0 0 0 7.3 20h9.4a2.3 2.3 0 0 0 2.3-2.3v-5.2" />
    </svg>
  );
}

function CardSheet({ input, onClose }: { input: ShareButtonProps; onClose: () => void }) {
  const copy = COPY[input.kind];
  const canvas = useRef<HTMLCanvasElement>(null);
  const [hideName, setHideName] = useState(false);
  const [data, setData] = useState<CardData | null>(null);
  const [state, setState] = useState<"drawing" | "ready" | "failed">("drawing");
  const [busy, setBusy] = useState(false);

  // The card is a picture of the moment the sheet was opened: it is built once, not on every tick.
  const first = useRef(input);
  useEffect(() => {
    let live = true;
    build(first.current)
      .then((d) => live && setData(d))
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!data || !c) return;
    let live = true;
    // the canvas sits inside .v-night, so the tokens it reads are the night ones in both themes
    renderCard(c, data, { hideName }, c)
      .then(() => live && setState("ready"))
      .catch(() => live && setState("failed"));
    return () => {
      live = false;
    };
  }, [data, hideName]);

  const send = (how: "share" | "save") => {
    const c = canvas.current;
    if (!c || state !== "ready") return;
    setBusy(true);
    const filename = cardFilename(input.kind);
    (how === "share" ? shareCard(c, filename, copy.share) : saveCard(c, filename, copy.share))
      .then((out) => {
        if (out === "saved") toast(how === "share" ? "This browser cannot share a picture, so it was saved instead." : "Picture saved.");
      })
      .catch(() => toast("The picture could not be saved on this device.", "warn"))
      .finally(() => setBusy(false));
  };

  const off = state !== "ready" || busy;
  return (
    <div className="share-sheet">
      <h2 className="share-sheet__h">{copy.title}</h2>
      <div className="share-sheet__stage v-night" data-state={state}>
        <canvas
          ref={canvas}
          className="share-sheet__card"
          width={CARD_W}
          height={CARD_H}
          role="img"
          aria-label={data ? cardAlt(data, { hideName }) : "The picture is being drawn."}
        />
      </div>
      {state === "failed" ? (
        <p className="v-note v-note--warn" role="alert">
          The picture could not be drawn on this device.
        </p>
      ) : null}

      <button type="button" role="switch" className="share-switch" aria-checked={hideName} onClick={() => setHideName((v) => !v)}>
        <span className="share-switch__text">
          <span className="share-switch__t">{copy.hide}</span>
          <span className="share-switch__s">No birth date, time or place is ever on the picture.</span>
        </span>
        <span className="share-switch__track" aria-hidden="true" />
      </button>

      <div className="v-actions share-sheet__actions">
        <button type="button" className="v-btn" disabled={off} aria-busy={busy} onClick={() => send("share")}>
          Share
        </button>
        <button type="button" className="v-btn v-btn--ghost" disabled={off} onClick={() => send("save")}>
          Save image
        </button>
        <button type="button" className="v-btn v-btn--quiet" onClick={onClose}>
          Close
        </button>
      </div>
      <p className="share-sheet__small">Drawn on this device. Nothing is uploaded: you choose where it goes.</p>
    </div>
  );
}

export function ShareButton(props: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const copy = COPY[props.kind];
  const label = props.label ?? "Share";
  const extra = props.className ? ` ${props.className}` : "";
  const sheet = (
    <Sheet open={open} onClose={() => setOpen(false)} label={copy.title}>
      <CardSheet input={props} onClose={() => setOpen(false)} />
    </Sheet>
  );
  return (
    <>
      {props.iconOnly ? (
        <button
          type="button"
          className={`v-iconbtn share-btn${extra}`}
          aria-haspopup="dialog"
          aria-label={props.label ?? copy.name}
          onClick={() => setOpen(true)}
        >
          <ShareIcon />
        </button>
      ) : (
        <button
          type="button"
          className={`v-btn v-btn--ghost v-btn--sm share-btn${extra}`}
          aria-haspopup="dialog"
          aria-label={props.label ? undefined : copy.name}
          onClick={() => setOpen(true)}
        >
          <ShareIcon />
          {label}
        </button>
      )}
      {/* at the root, so the sheet takes the page's theme even when the button stands on a night band */}
      {typeof document === "undefined" ? sheet : createPortal(sheet, document.body)}
    </>
  );
}
