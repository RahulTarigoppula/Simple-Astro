// Rooftop sky — #/patri/:id/sky (§4.6). Full-bleed, no Ledge. The painted sky renders first and is
// always correct; the 3D dome (lazy chunk) crossfades over it once its first frame is drawn. No
// WebGL, a lost context or reduced motion → the painted sky only, silently, with a one-line note.
// The ScrubRing turns time ±12 h around the birth moment; every frame recomputes the real sky.

import { DateTime } from "luxon";
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { useProfile, useSettings } from "../../app/hooks";
import { DigitSet } from "../../components/ui/DigitSet";
import { Screen } from "../../components/ui/Screen";
import { GRAHA_DEV, GRAHA_NAMES, NAKSHATRA_NAMES, NAKSHATRA_SHORT, SIGN_DEV, SIGN_ENGRAVED, SIGN_NAMES } from "../../data/tables/names";
import { formatDms } from "../../engine/math";
import { type RooftopSky, rooftopSky } from "../../engine/sky/rooftop";
import type { StarCatalog } from "../../engine/sky/stars";
import { formatOffset } from "../../engine/time";
import type { AyanamsaPreset, BirthMoment } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { reducedMotion } from "../../platform/native";
import { play } from "../../platform/sound";
import { PaintedSky } from "./PaintedSky";
import { PosterAction } from "./PosterAction";
import { ScrubRing } from "./ScrubRing";
import { buildScene, type PaintedScene } from "./scene";
import { loadStars } from "./starField";
import "./sky.css";

const SkyDome = lazy(() => import("./SkyDome"));

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;
const MONTHS_LONG = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;
const PRESET_SHORT: Record<AyanamsaPreset, string> = { "se-true": "SE-true", "se-mean": "SE-mean", "drik-mean": "Drik-mean" };

type Fallback = "reduced" | "nogl" | "lost" | null;
const FALLBACK_NOTE: Record<Exclude<Fallback, null>, string> = {
  reduced: "Painted sky — reduced motion is on, so the 3D dome stays folded.",
  nogl: "Painted sky — this device offers no WebGL for the 3D dome.",
  lost: "Painted sky — the 3D dome lost its graphics context.",
};

function hasWebGL(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2") ?? c.getContext("webgl");
    if (!gl) return false;
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

/** "IST" where the zone has a familiar short name, else "UTC+05:45"; a manual offset is printed as is. */
function zoneLabel(b: BirthMoment): string {
  const fixed = `UTC${formatOffset(b.offsetMin)}`;
  if (b.offsetSource === "override") return fixed;
  const n = DateTime.fromMillis(b.utcMs, { zone: b.zone }).setLocale("en-IN").offsetNameShort;
  return n && !/^(GMT|UTC)/.test(n) ? n : fixed;
}

/** Wall-clock HH:MM at the birth offset (the offset written on the leaf, held for the scrub). */
function clock(ms: number, offsetMin: number): string {
  const d = new Date(ms + Math.round(offsetMin * 60_000));
  return `${String(d.getUTCHours()).padStart(2, "0")}:${String(d.getUTCMinutes()).padStart(2, "0")}`;
}

function stripText(sky: RooftopSky, b: BirthMoment): { time: string; sign: string; nak: string } {
  return {
    time: clock(sky.utcMs, b.offsetMin),
    sign: SIGN_ENGRAVED[sky.lagna.sign] ?? "",
    nak: (NAKSHATRA_SHORT[sky.lagna.nakshatra] ?? "").toUpperCase(),
  };
}

const fmtAlt = (a: number): string => `${a >= 0 ? "" : "−"}${Math.abs(a).toFixed(1)}°`;

export default function SkyScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const profile = useProfile(id);
  const settings = useSettings();
  const preset = settings.preset.ayanamsa;
  const nodeMode = settings.preset.node;

  const [stars, setStars] = useState<StarCatalog | null>(null);
  const [offset, setOffset] = useState(0);
  const [fallback, setFallback] = useState<Fallback>(null);
  const [domeWanted, setDomeWanted] = useState(false);
  const [domeReady, setDomeReady] = useState(false);
  const [hidden, setHidden] = useState(() => typeof document !== "undefined" && document.hidden);

  // Stars: a same-origin asset, decoded once.
  useEffect(() => {
    let live = true;
    loadStars()
      .then((s) => live && setStars(s))
      .catch(() => undefined); // the painted sky still draws the zodiac and grahas
    return () => {
      live = false;
    };
  }, []);

  // Decide the renderer once: reduced motion or no WebGL → painted only (no canvas ever mounts).
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    const decide = (): void => {
      if (reducedMotion()) {
        setFallback("reduced");
        setDomeWanted(false);
        setDomeReady(false);
      } else if (!hasWebGL()) {
        setFallback("nogl");
      } else {
        setFallback((f) => (f === "lost" ? f : null));
        setDomeWanted(true);
      }
    };
    decide();
    mq?.addEventListener?.("change", decide);
    return () => mq?.removeEventListener?.("change", decide);
  }, []);

  useEffect(() => {
    const vis = (): void => setHidden(document.hidden);
    document.addEventListener("visibilitychange", vis);
    return () => document.removeEventListener("visibilitychange", vis);
  }, []);

  const birth = profile?.birth;
  const zone = useMemo(() => (birth ? zoneLabel(birth) : ""), [birth]);
  const tMs = birth ? birth.utcMs + offset * 60_000 : 0;

  const sky = useMemo<RooftopSky | null>(() => {
    if (!birth) return null;
    const t0 = performance.now();
    const s = rooftopSky(tMs, birth.place.lat, birth.place.lon, preset, nodeMode);
    performance.clearMeasures?.("sky-frame");
    performance.measure?.("sky-frame", { start: t0 });
    return s;
  }, [birth, tMs, preset, nodeMode]);

  // The painted scene is rebuilt per frame only while it is what you see.
  const lastScene = useRef<PaintedScene | null>(null);
  const scene = useMemo(() => {
    if (!sky) return null;
    if (domeReady && lastScene.current) return lastScene.current;
    return buildScene(sky, stars);
  }, [sky, stars, domeReady]);
  lastScene.current = scene;

  // A brighter tick exactly when the Lagna crosses into the next rāśi.
  const lastSign = useRef<number | null>(null);
  const lagnaSign = sky?.lagna.sign ?? null;
  useEffect(() => {
    if (lagnaSign === null) return;
    if (lastSign.current !== null && lastSign.current !== lagnaSign) {
      play("tickBright");
      haptics.selection();
    }
    lastSign.current = lagnaSign;
  }, [lagnaSign]);

  // Scrub input is coalesced to one sky per animation frame.
  const pending = useRef<number | null>(null);
  const raf = useRef(0);
  const onScrub = useCallback((m: number) => {
    pending.current = m;
    if (raf.current) return;
    raf.current = requestAnimationFrame(() => {
      raf.current = 0;
      if (pending.current !== null) setOffset(pending.current);
    });
  }, []);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const onDomeReady = useCallback(() => setDomeReady(true), []);
  const onDomeLost = useCallback(() => {
    setDomeReady(false);
    setDomeWanted(false);
    setFallback("lost");
  }, []);

  const back = useCallback(() => navigate(id ? `/patri/${id}` : "/"), [navigate, id]);

  // Swipe down → the desk (on the header, the painted sky and the strip; the dome drags to look).
  const swipe = useRef<{ x: number; y: number; t: number } | null>(null);
  const swipeHandlers = {
    onPointerDown: (e: React.PointerEvent) => {
      if ((e.target as Element).closest?.(".dome-wrap.is-ready, .scrub, button")) return;
      swipe.current = { x: e.clientX, y: e.clientY, t: e.timeStamp };
    },
    onPointerUp: (e: React.PointerEvent) => {
      const s = swipe.current;
      swipe.current = null;
      if (!s) return;
      const dy = e.clientY - s.y;
      const dx = Math.abs(e.clientX - s.x);
      if (dy > 90 && dx < dy * 0.6 && e.timeStamp - s.t < 700) back();
    },
    onPointerCancel: () => {
      swipe.current = null;
    },
  };

  const makePoster = useCallback(() => {
    if (!profile || !birth) return null;
    const at = rooftopSky(birth.utcMs, birth.place.lat, birth.place.lon, preset, nodeMode);
    const st = stripText(at, birth);
    const L = at.lagna;
    const place = [birth.place.name, birth.place.admin1].filter(Boolean).join(", ");
    const hm = `${String(birth.localH).padStart(2, "0")}:${String(birth.localMi).padStart(2, "0")}`;
    return {
      scene: buildScene(at, stars),
      filename: `vyom-sky-${
        profile.name
          .normalize("NFKD")
          .replace(/[^\w]+/g, "-")
          .replace(/^-|-$/g, "")
          .toLowerCase() || "person"
      }.png`,
      text: {
        name: profile.name,
        birthLine: `${birth.localD} ${MONTHS_LONG[birth.localMo - 1] ?? ""} ${birth.localY} · ${hm} ${zone} · ${place}`,
        lagnaDev: `लग्न ${SIGN_DEV[L.sign] ?? ""} · ${NAKSHATRA_NAMES[L.nakshatra] ?? ""}`,
        lagnaLine: `Lagna ${SIGN_NAMES[L.sign] ?? ""} ${formatDms(L.lonSid % 30)} · ${place}`,
        strip: `${st.time} ${zone} · LAGNA ${st.sign} · ${st.nak}`,
        colophon: `Computed on-device · Lahiri ${PRESET_SHORT[preset]} · astronomy-engine`,
      },
    };
  }, [profile, birth, preset, nodeMode, stars, zone]);

  if (profile === undefined) {
    return (
      <Screen label="Rooftop sky" className="sky-screen">
        <div className="rooftop" />
      </Screen>
    );
  }
  if (profile === null || !birth || !sky || !scene) {
    return (
      <Screen label="Rooftop sky" className="sky-screen">
        <div className="rooftop rooftop--missing">
          <p>This person is not saved on this device.</p>
          <button type="button" className="sky-btn" onClick={() => navigate("/")}>
            ← Back
          </button>
        </div>
      </Screen>
    );
  }

  const st = stripText(sky, birth);
  const tableId = `sky-table-${profile.id}`;
  const place = birth.place.name;
  const L = sky.lagna;
  const valueText = `${st.time} ${zone}, Lagna ${SIGN_NAMES[L.sign] ?? ""}, ${
    offset === 0 ? "the birth moment" : `${Math.abs(offset)} minutes ${offset > 0 ? "after" : "before"} birth`
  }`;
  const showDome = domeWanted && !fallback && stars !== null;

  return (
    <Screen label={`Rooftop sky of ${profile.name}`} className="sky-screen">
      <div className="rooftop" style={{ "--moon-k": sky.moonK.toFixed(3) } as React.CSSProperties} {...swipeHandlers}>
        <header className="sky-head">
          <h1 className="display">{profile.name}</h1>
          <p>
            <span lang="hi">आकाश</span> · the sky over {place}, {birth.localD} {MONTHS[birth.localMo - 1]} {birth.localY}
          </p>
        </header>

        <div className="sky-stage">
          <PaintedSky
            scene={scene}
            label={`Painted sky over ${place} at ${st.time} ${zone}. Lagna ${SIGN_NAMES[L.sign] ?? ""} rising in the east.`}
            describedBy={tableId}
          />
          {showDome ? (
            <Suspense fallback={null}>
              <div className={`dome-wrap${domeReady ? " is-ready" : ""}`}>
                <SkyDome
                  sky={sky}
                  stars={stars}
                  lookAz={L.az}
                  paused={hidden}
                  noInertia={settings.calmDesk}
                  onReady={onDomeReady}
                  onLost={onDomeLost}
                />
              </div>
            </Suspense>
          ) : null}
        </div>

        <div className="sky-foot">
          <p
            className="engraved sky-strip"
            role="status"
            aria-label={`${st.time} ${zone}, Lagna ${SIGN_NAMES[L.sign] ?? ""}, ${NAKSHATRA_NAMES[L.nakshatra] ?? ""}`}
          >
            <DigitSet text={st.time} /> <span>{zone}</span>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <span>
              LAGNA <b>{st.sign}</b>
            </span>
            <span className="sep" aria-hidden="true">
              ·
            </span>
            <span>{st.nak}</span>
          </p>
          <div className="sky-controls">
            <ScrubRing
              value={offset}
              onChange={onScrub}
              noInertia={settings.calmDesk || reducedMotion()}
              valueText={valueText}
              resetLabel="Return to the birth moment"
            />
            <div className="sky-actions">
              <PosterAction make={makePoster} />
              <button type="button" className="sky-btn sky-btn--desk" onClick={back}>
                ← Back
              </button>
            </div>
          </div>
          {fallback ? <p className="sky-note">{FALLBACK_NOTE[fallback]}</p> : null}
          <p className="sky-note sky-help">
            The real sky at birth: stars, the golden zodiac band, and each planet. The violet mark is the rising sign (east). Turn the ring
            to move time.
          </p>
        </div>

        <table className="vh" id={tableId}>
          <caption>
            The sky at {st.time} {zone} over {place}: geometric altitude and azimuth, sidereal longitude (Lahiri {PRESET_SHORT[preset]}).
          </caption>
          <thead>
            <tr>
              <th scope="col">Graha</th>
              <th scope="col">Rāśi</th>
              <th scope="col">Longitude</th>
              <th scope="col">Altitude</th>
              <th scope="col">Azimuth</th>
            </tr>
          </thead>
          <tbody>
            {sky.bodies.map((b) => (
              <tr key={b.id}>
                <th scope="row">
                  <span lang="hi">{GRAHA_DEV[b.id]}</span> {GRAHA_NAMES[b.id]}
                </th>
                <td>{SIGN_NAMES[b.sign]}</td>
                <td>{formatDms(b.lonSid % 30)}</td>
                <td>{fmtAlt(b.alt)}</td>
                <td>{b.az.toFixed(1)}°</td>
              </tr>
            ))}
            <tr>
              <th scope="row">
                <span lang="hi">लग्न</span> Lagna
              </th>
              <td>{SIGN_NAMES[L.sign]}</td>
              <td>{formatDms(L.lonSid % 30)}</td>
              <td>0.0°</td>
              <td>{L.az.toFixed(1)}°</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Screen>
  );
}
