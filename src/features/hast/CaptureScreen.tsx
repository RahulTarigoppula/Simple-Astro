// Hast Rekha — capture (§4.7): live camera with a chalk hand outline, sharpness and exposure
// gauges, a shutter enabled only for a palm-facing hand in focus, and the gallery as a fallback.
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
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
    <div className={`gauge${low ? " is-low" : ""}`} role="img" aria-label={`${label} ${value}${low ? ", low" : ", good"}`}>
      <span>{label}</span>
      {[0, 1, 2, 3, 4].map((i) => (
        <i key={i} className={i < pips ? "on" : undefined} />
      ))}
      <span className="mono" style={{ fontSize: 10 }}>
        {value}
      </span>
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

  // MediaPipe (self-hosted wasm + model) — warm it as soon as the screen opens.
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
      setBusy("finding the hand…");
      try {
        const d = await detectHand(canvas);
        if (!d.ok) {
          toast(d.reason === "no-hand" ? "No hand in this picture." : `No hand found — ${d.reason}.`, "warn");
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
        setBusy("sharpening the stylus…");
        const out = await extractLines(image, d.landmarks, hand, (s) =>
          setBusy(s === "loading-cv" ? "sharpening the stylus…" : "tracing the lines in ink…"),
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
        toast(`The print would not take: ${e instanceof Error ? e.message : String(e)}`, "danger");
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

  return (
    <Screen className="capture" label="Palm capture">
      <div className="engraved capture__strip" aria-live="polite">
        <b>FILL THE FRAME</b>
        <span className="sep">·</span>
        <span>PALM FLAT</span>
        <span className="sep">·</span>
        <span>EVEN LIGHT</span>
      </div>

      <div className="capture__frame">
        <video ref={video} playsInline muted aria-label="Camera preview">
          <track kind="captions" />
        </video>
        <svg
          className={`capture__outline${gate.ok ? " is-ok" : ""}`}
          viewBox="0 0 100 120"
          preserveAspectRatio="xMidYMid meet"
          aria-hidden="true"
        >
          <path d="M30 118c-8-14-12-26-12-34V56a5 5 0 0 1 10 0v14V30a5 5 0 0 1 10 0v34V22a5 5 0 0 1 10 0v40V28a5 5 0 0 1 10 0v38V42a5 5 0 0 1 10 0v34c0 18-4 30-10 42" />
        </svg>
        {camera !== "live" ? (
          <div className="empty-note" style={{ position: "absolute", inset: 0, color: "var(--surface)" }}>
            <b style={{ color: "var(--surface)" }}>{camera === "starting" ? "Opening the camera…" : "Gallery only"}</b>
            <span style={{ fontSize: "var(--text-sm)" }}>
              {camera === "denied"
                ? "The camera was not allowed. Pick a photo of your palm instead — it never leaves this device."
                : camera === "none"
                  ? "No camera here. Pick a photo of your palm instead — it never leaves this device."
                  : ""}
            </span>
          </div>
        ) : null}
      </div>

      <div className="paper capture__sheet">
        {busy ? (
          <>
            <p className="p" role="status" style={{ marginTop: 0 }}>
              {busy}
            </p>
            <div className="ink-wait" aria-hidden="true" />
          </>
        ) : null}
        <div className="tools">
          <Gauge
            label="sharpness"
            pips={quality ? sharpnessPips(quality.sharpness.value) : 0}
            low={!sharpOk}
            value={quality ? quality.sharpness.value.toFixed(0) : "—"}
          />
          <Gauge
            label="exposure"
            pips={quality ? exposurePips(quality.exposure.score) : 0}
            low={!expOk}
            value={quality ? quality.exposure.label : "—"}
          />
        </div>
        <p className="p p--muted" style={{ marginTop: 6 }} aria-live="polite">
          {model === "loading"
            ? "Opening the hand model…"
            : model === "failed"
              ? "The hand model could not open — use Prepare for offline in the drawer, or try again online."
              : camera === "live"
                ? gate.ok
                  ? sharpOk && expOk
                    ? "Hold still — the shutter is ready."
                    : !sharpOk
                      ? "Hold still, or move to the window: the print is soft."
                      : "Move to even light: the palm is too dark or too bright."
                  : `${gate.copy[0]?.toUpperCase() ?? ""}${gate.copy.slice(1)}.`
                : "Pick a clear photo of an open palm."}
        </p>
        <div className="radio-row" role="radiogroup" aria-label="Which hand">
          <span className="v">
            {hand === "right" ? "Right" : "Left"} hand · {profile && hand === profile.handedness ? "dominant" : "non-dominant"}
          </span>
          <span className="seg">
            {(["right", "left"] as const).map((h) => (
              <button key={h} type="button" role="radio" aria-checked={hand === h} onClick={() => setHand(h)}>
                {h}
              </button>
            ))}
          </span>
        </div>
        <div className="tools">
          <button type="button" className="stamp shutter" disabled={!canShoot} onClick={shoot} aria-label="Shutter">
            <span>◉ &nbsp;shutter</span>
          </button>
          <button type="button" className="linkish" onClick={() => void pick()} disabled={!!busy}>
            Pick from gallery
          </button>
          <button type="button" className="linkish" onClick={() => navigate(`/hast/${id ?? ""}`)}>
            Cancel
          </button>
        </div>
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
