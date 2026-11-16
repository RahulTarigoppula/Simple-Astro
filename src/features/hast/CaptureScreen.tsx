// Palm capture: a full-bleed camera with a hand outline, sharpness and light gauges, a round shutter
// that is enabled only for a palm-facing hand in focus, and "upload a photo" as the way out when
// there is no camera or it was not allowed.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
import { ChevronLeft } from "../../components/ui/Page";
import { Screen } from "../../components/ui/Screen";
import { savePalmCapture, saveReading } from "../../data/repo";
import { GATE_COPY, gateHand } from "../../engine/palm/landmarks";
import { assessQuality, exposurePips, palmRoi, type Quality, sharpnessPips, shutterEnabled } from "../../engine/palm/quality";
import { composeReading } from "../../engine/palm/rules";
import type { HandCapture, Landmark } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { isNative } from "../../platform/native";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { detectHand, loadHandLandmarker } from "./mediapipe";
import { extractLines } from "./palmClient";
import "./hast.css";

const MAX_SIDE = 1600;

type Detection = { landmarks: Landmark[]; worldLandmarks: Landmark[]; score: number };

function Gauge({ label, pips, low, value }: { label: string; pips: number; low: boolean; value: string }) {
  return (
    <div className={`cap__gauge${low ? " is-low" : ""}`} role="img" aria-label={`${label} ${value}${low ? ", low" : ", good"}`}>
      <span>{label}</span>
      <span className="cap__pips">
        {[0, 1, 2, 3, 4].map((i) => (
          <i key={i} className={i < pips ? "on" : undefined} />
        ))}
      </span>
      <span>{value}</span>
    </div>
  );
}

function drawScaled(src: CanvasImageSource, w: number, h: number, maxSide: number): HTMLCanvasElement {
  const k = Math.min(1, maxSide / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * k));
  c.height = Math.max(1, Math.round(h * k));
  const g = c.getContext("2d", { willReadFrequently: true });
  g?.drawImage(src, 0, 0, c.width, c.height);
  return c;
}

const toBlob = (c: HTMLCanvasElement, type: string, q?: number) =>
  new Promise<Blob>((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error("canvas is empty"))), type, q));

export default function CaptureScreen() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const profile = useProfile(id);
  const settings = useSettings();
  const navigate = useNavigate();
  const video = useRef<HTMLVideoElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [hand, setHand] = useState<"right" | "left">((params.get("hand") as "right" | "left" | null) ?? "right");
  const [camera, setCamera] = useState<"starting" | "live" | "denied" | "none">("starting");
  const [quality, setQuality] = useState<Quality | null>(null);
  const [gate, setGate] = useState<{ ok: boolean; copy: string }>({ ok: false, copy: "no hand in frame" });
  const [model, setModel] = useState<"loading" | "ready" | "failed">("loading");
  const [busy, setBusy] = useState<string | null>(null);
  const last = useRef<Detection | null>(null);

  useEffect(() => {
    if (profile && !params.get("hand")) setHand(profile.handedness);
  }, [profile, params]);

  // MediaPipe (self-hosted wasm + model), warm it as soon as the screen opens.
  useEffect(() => {
    let live = true;
    loadHandLandmarker()
      .then(() => live && setModel("ready"))
      .catch(() => live && setModel("failed"));
    return () => {
      live = false;
    };
  }, []);

  // Live camera (web and Android WebView; the native picker is the gallery path).
  useEffect(() => {
    let stream: MediaStream | null = null;
    let live = true;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCamera("none");
      return;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: MAX_SIDE } }, audio: false })
      .then((s) => {
        if (!live) {
          for (const t of s.getTracks()) t.stop();
          return;
        }
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          void video.current.play().catch(() => undefined);
        }
        setCamera("live");
      })
      .catch((e: unknown) => {
        if (!live) return;
        setCamera(e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "SecurityError") ? "denied" : "none");
      });
    return () => {
      live = false;
      for (const t of stream?.getTracks() ?? []) t.stop();
    };
  }, []);

  // Gauges every 250 ms; hand detection every 600 ms once the model is ready.
  useEffect(() => {
    if (camera !== "live") return;
    let tick = 0;
    const id = window.setInterval(async () => {
      const v = video.current;
      if (!v || v.readyState < 2 || busy) return;
      const small = drawScaled(v, v.videoWidth, v.videoHeight, 512);
      const img = small.getContext("2d")?.getImageData(0, 0, small.width, small.height);
      if (!img) return;
      const roi = last.current ? palmRoi(last.current.landmarks) : undefined;
      setQuality(assessQuality(img, roi));
      tick++;
      if (model === "ready" && tick % 2 === 0) {
        const d = await detectHand(small).catch(() => null);
        if (d?.ok) {
          last.current = { landmarks: d.landmarks, worldLandmarks: d.worldLandmarks, score: d.score };
          const g = gateHand(d.landmarks, d.handedness, d.score);
          setGate(g.ok ? { ok: true, copy: "hold still" } : { ok: false, copy: GATE_COPY[g.reason] });
        } else {
          last.current = null;
          setGate({ ok: false, copy: "no hand in frame" });
        }
      }
    }, 250);
    return () => clearInterval(id);
  }, [camera, model, busy]);

  const process = useCallback(
    async (canvas: HTMLCanvasElement) => {
      if (!profile) return;
      setBusy("Finding the hand…");
      try {
        const d = await detectHand(canvas);
        if (!d.ok) {
          toast(d.reason === "no-hand" ? "No hand in this picture." : `No hand found: ${d.reason}.`, "warn");
          return;
        }
        const g = gateHand(d.landmarks, d.handedness, d.score);
        if (!g.ok) {
          toast(`${GATE_COPY[g.reason]}.`, "warn");
          haptics.notify("warning");
          return;
        }
        const g2 = canvas.getContext("2d", { willReadFrequently: true });
        const image = g2?.getImageData(0, 0, canvas.width, canvas.height);
        if (!image) throw new Error("the photo could not be read");
        const q = assessQuality(image, palmRoi(d.landmarks));
        const captureId = crypto.randomUUID();
        setBusy("Getting ready to trace…");
        const out = await extractLines(image, d.landmarks, hand, (s) =>
          setBusy(s === "loading-cv" ? "Getting ready to trace…" : "Tracing the lines…"),
        );
        const rect = document.createElement("canvas");
        rect.width = out.rectified.width;
        rect.height = out.rectified.height;
        rect.getContext("2d")?.putImageData(out.rectified, 0, 0);
        const [original, rectified] = await Promise.all([toBlob(canvas, "image/jpeg", 0.9), toBlob(rect, "image/png")]);
        const capture: HandCapture = {
          id: captureId,
          profileId: profile.id,
          hand,
          originalBlobKey: "",
          rectifiedBlobKey: "",
          landmarks: d.landmarks,
          worldLandmarks: d.worldLandmarks,
          handednessScore: d.score,
          homography: out.homography,
          quality: { sharpness: q.sharpness.value, exposure: q.exposure.score },
          imageSize: [canvas.width, canvas.height],
          capturedAt: Date.now(),
        };
        await savePalmCapture(capture, original, rectified);
        const reading = composeReading({
          captureId,
          worldLandmarks: d.worldLandmarks,
          lines: out.lines,
          framing: settings.handFraming,
          computedAt: Date.now(),
        });
        if (reading) await saveReading(reading);
        play("thunk");
        haptics.impact("medium");
        if (out.suggestTrace) haptics.notify("warning");
        navigate(`/hast/${profile.id}?hand=${hand}${out.suggestTrace ? "&trace=1" : ""}`, { replace: true });
      } catch (e) {
        toast(`The photo could not be read: ${e instanceof Error ? e.message : String(e)}`, "danger");
      } finally {
        setBusy(null);
      }
    },
    [profile, hand, settings.handFraming, navigate],
  );

  const shoot = () => {
    const v = video.current;
    if (!v || v.readyState < 2) return;
    play("pat");
    void process(drawScaled(v, v.videoWidth, v.videoHeight, MAX_SIDE));
  };

  const fromBlob = async (blob: Blob) => {
    try {
      const bmp = await createImageBitmap(blob);
      const c = drawScaled(bmp, bmp.width, bmp.height, MAX_SIDE);
      bmp.close();
      await process(c);
    } catch {
      toast("That picture could not be opened.", "danger");
    }
  };

  const pick = async () => {
    if (isNative()) {
      try {
        const { Camera, CameraResultType, CameraSource } = await import("@capacitor/camera");
        const photo = await Camera.getPhoto({
          resultType: CameraResultType.Uri,
          quality: 90,
          width: MAX_SIDE,
          source: CameraSource.Prompt,
        });
        if (photo.webPath) await fromBlob(await (await fetch(photo.webPath)).blob());
      } catch {
        // the person closed the picker
      }
      return;
    }
    fileInput.current?.click();
  };

  const sharpOk = quality?.sharpness.ok ?? false;
  const expOk = quality?.exposure.ok ?? false;
  const canShoot = camera === "live" && model === "ready" && !busy && shutterEnabled(gate.ok, sharpOk, expOk);
  const back = () => navigate(`/hast/${id ?? ""}?hand=${hand}`, { replace: true });
  const hint =
    model === "loading"
      ? "Getting ready to find your hand…"
      : model === "failed"
        ? "The hand finder could not open. Use Prepare for offline in Settings, or try again online."
        : gate.ok
          ? sharpOk && expOk
            ? "Hold still. Ready: take the photo."
            : !sharpOk
              ? "Hold still, or move to the window: the picture is soft."
              : "Move to even light: the palm is too dark or too bright."
          : `${gate.copy[0]?.toUpperCase() ?? ""}${gate.copy.slice(1)}.`;

  return (
    <Screen className="cap" label="Palm capture">
      <header className="cap__top">
        <button type="button" className="cap__back" onClick={back}>
          <ChevronLeft />
          Back
        </button>
        <h1 className="cap__title">Photograph your {hand} palm</h1>
      </header>

      <div className="cap__frame">
        <video ref={video} playsInline muted aria-label="Camera preview" hidden={camera !== "live"}>
          <track kind="captions" />
        </video>
        {camera === "live" ? (
          <>
            <svg
              className={`cap__outline${gate.ok ? " is-ok" : ""}`}
              viewBox="0 0 100 120"
              preserveAspectRatio="xMidYMid meet"
              aria-hidden="true"
            >
              <path d="M30 118c-8-14-12-26-12-34V56a5 5 0 0 1 10 0v14V30a5 5 0 0 1 10 0v34V22a5 5 0 0 1 10 0v40V28a5 5 0 0 1 10 0v38V42a5 5 0 0 1 10 0v34c0 18-4 30-10 42" />
            </svg>
            <p className="cap__tips">Fill the outline · palm flat · even light</p>
            <p className="cap__hint" aria-live="polite">
              {hint}
            </p>
          </>
        ) : camera === "starting" ? (
          <div className="cap__state" role="status">
            <h2>Opening the camera…</h2>
            <p>If the browser asks, allow the camera. The picture never leaves this device.</p>
          </div>
        ) : (
          <div className="cap__state">
            <h2>{camera === "denied" ? "The camera is switched off for this app" : "No camera was found"}</h2>
            <p>
              {camera === "denied"
                ? "You can allow the camera in the browser or phone settings and come back. Or use a photo you already have: a clear picture of an open palm."
                : "You can still get a reading from a photo you already have: a clear picture of an open palm."}{" "}
              It never leaves this device.
            </p>
            <div className="cap__state-actions">
              <button type="button" className="v-btn" onClick={() => void pick()} disabled={!!busy || model !== "ready"}>
                Upload a photo instead
              </button>
              <button type="button" className="v-btn v-btn--ghost" onClick={back}>
                Back
              </button>
            </div>
            {model !== "ready" ? (
              <p className="cap__small" aria-live="polite">
                {hint}
              </p>
            ) : null}
          </div>
        )}
        {busy ? (
          <div className="cap__busy" role="status">
            <span className="cap__spin" aria-hidden="true" />
            {busy}
          </div>
        ) : null}
      </div>

      <div className="cap__panel">
        <div className="cap__row">
          <span className="cap__small">{profile && hand === profile.handedness ? "Dominant hand" : "Non-dominant hand"}</span>
          <div className="v-seg cap__seg" role="radiogroup" aria-label="Which hand">
            {(["right", "left"] as const).map((h) => (
              <button key={h} type="button" role="radio" aria-checked={hand === h} onClick={() => setHand(h)}>
                {h === "right" ? "Right" : "Left"}
              </button>
            ))}
          </div>
        </div>
        {camera === "live" ? (
          <>
            <div className="cap__row">
              <Gauge
                label="Sharpness"
                pips={quality ? sharpnessPips(quality.sharpness.value) : 0}
                low={!sharpOk}
                value={quality ? (sharpOk ? "good" : "low") : "-"}
              />
              <Gauge
                label="Light"
                pips={quality ? exposurePips(quality.exposure.score) : 0}
                low={!expOk}
                value={quality ? quality.exposure.label : "-"}
              />
            </div>
            <div className="cap__controls">
              <button type="button" className="cap__side" onClick={() => void pick()} disabled={!!busy}>
                Upload photo
              </button>
              <button type="button" className="cap__shutter" disabled={!canShoot} onClick={shoot} aria-label="Take the photo">
                <span aria-hidden="true" />
              </button>
              <button type="button" className="cap__side" onClick={back}>
                Cancel
              </button>
            </div>
            <p className="cap__small cap__center">
              {canShoot ? "Tap the round button to take the photo" : "The round button lights up when the palm is clear"}
            </p>
          </>
        ) : null}
        <input
          ref={fileInput}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (f) void fromBlob(f);
          }}
        />
      </div>
    </Screen>
  );
}
