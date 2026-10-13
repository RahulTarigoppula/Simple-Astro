// PosterAction (§4.6): draws the 1080 × 1920 Rooftop poster and saves or shares it. On-device only.
import { useState } from "react";
import { toast } from "../../state/ui";
import { type PosterText, renderPoster, savePoster } from "./poster";
import type { PaintedScene } from "./scene";

interface PosterActionProps {
  /** Built lazily on press so a scrub never pays for it. */
  make: () => { scene: PaintedScene; text: PosterText; filename: string } | null;
}

export function PosterAction({ make }: PosterActionProps) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      className="sky-btn"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        const job = make();
        if (!job) return;
        setBusy(true);
        renderPoster(job.scene, job.text)
          .then((canvas) => savePoster(canvas, job.filename))
          .then(() => toast("Poster drawn: 1080 × 1920 PNG"))
          .catch(() => toast("The poster could not be drawn on this device", "warn"))
          .finally(() => setBusy(false));
      }}
    >
      Save poster
    </button>
  );
}
