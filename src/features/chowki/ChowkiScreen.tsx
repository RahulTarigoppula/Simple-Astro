import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useActiveProfile, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { useLamp } from "../../app/theme";
import { Screen } from "../../components/ui/Screen";
import { NAKSHATRA_NAMES, TITHI_DEV, VARA_NAMES } from "../../data/tables/names";
import { computePanchang } from "../../engine/panchang";
import type { Panchang } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { useUi } from "../../state/ui";
import { DialArt, DiyaArt, DrawerKnobArt, LeafBundleArt, LoupeArt, RolledPatriArt } from "./art";
import { ParapetSky } from "./ParapetSky";
import "./chowki.css";

const BENGALURU = { lat: 12.9716, lon: 77.5946, zone: "Asia/Kolkata" };

function hhmm(ms: number, zone: string): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: zone }).format(ms);
}

function useNow(stepMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), stepMs);
    return () => clearInterval(id);
  }, [stepMs]);
  return now;
}

/** Long-press shows the engraved name label; tap opens the object. */
function useLongLabel() {
  const [on, setOn] = useState(false);
  const timer = useRef(0);
  const off = () => {
    clearTimeout(timer.current);
    setOn(false);
  };
  return {
    labelled: on,
    bind: {
      onPointerDown: () => {
        timer.current = window.setTimeout(() => {
          setOn(true);
          haptics.selection();
        }, 420);
      },
      onPointerUp: off,
      onPointerLeave: off,
      onPointerCancel: off,
    },
  };
}

interface ObjProps {
  to: string;
  name: string;
  tip: string;
  label: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}

function DeskObject({ to, name, tip, label, className, children }: ObjProps) {
  const { labelled, bind } = useLongLabel();
  return (
    <Link
      to={to}
      className={`deskobj${className ? ` ${className}` : ""}${labelled ? " is-labelled" : ""}`}
      aria-label={name}
      onClick={(e) => {
        rememberOrigin(e.currentTarget);
        play("tick", 0.6);
      }}
      {...bind}
    >
      {children}
      <span className="lbl" aria-hidden="true">
        {label}
      </span>
      <span className="tip" aria-hidden="true">
        {tip}
      </span>
    </Link>
  );
}

export default function ChowkiScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const theme = useUi((s) => s.desk.resolvedTheme);
  const { toggle } = useLamp();
  const navigate = useNavigate();
  const now = useNow();
  const lat = active?.birth.place.lat ?? BENGALURU.lat;
  const lon = active?.birth.place.lon ?? BENGALURU.lon;
  const zone = active?.birth.zone ?? BENGALURU.zone;

  const today = useMemo<{ p: Panchang | null; err: boolean }>(() => {
    try {
      return { p: computePanchang(now, { lat, lon }, settings.preset), err: false };
    } catch {
      return { p: null, err: true };
    }
  }, [now, lat, lon, settings.preset]);

  const p = today.p;
  const local = hhmm(now, zone);
  const [hh = 0, mm = 0] = local.split(":").map(Number);
  const dayArc = (ms: number) => (p ? ((ms - p.sunriseMs) / (p.nextSunriseMs - p.sunriseMs)) * 360 : 0);
  const tithiNo = p ? (p.tithi.index - 1) % 15 : 0;
  const empty = profiles !== undefined && profiles.length === 0;

  // Swipe up from the dial → the Rooftop.
  const swipe = useRef<{ y: number; t: number } | null>(null);

  return (
    <Screen className="chowki" label="The Chowki — your desk">
      <ParapetSky utcMs={now} lat={lat} lon={lon} />
      <div className="greet">
        <h1 className="dev" lang="hi">
          {empty ? "Write your first leaf" : `नमस्ते${active ? `, ${active.name}` : ""}`}
        </h1>
        {p ? (
          <p>
            <span lang="hi" className="dev">
              {p.tithi.paksha === "shukla" ? "शुक्ल" : "कृष्ण"} {TITHI_DEV[tithiNo]}
            </span>{" "}
            · {p.tithi.name}, <span lang="sa">{NAKSHATRA_NAMES[p.nakshatra.index]}</span> {p.nakshatra.pada} ·{" "}
            {VARA_NAMES[p.vara.index]} ·{" "}
            <span className="mono">
              Rāhu Kāla {hhmm(p.rahuKaal[0], zone)}–{hhmm(p.rahuKaal[1], zone)}
            </span>
          </p>
        ) : null}
      </div>

      <div className="cloth">
        <DeskObject
          to="/circle"
          name={`Leaf bundle, ${profiles?.length ?? 0} leaves, opens the circle`}
          tip="पत्ते · Circle"
          label={`Leaves · ${profiles?.length ?? 0}`}
        >
          <LeafBundleArt count={profiles?.length ?? 0} />
        </DeskObject>

        <div
          onPointerDown={(e) => {
            swipe.current = { y: e.clientY, t: performance.now() };
          }}
          onPointerUp={(e) => {
            const s = swipe.current;
            swipe.current = null;
            if (active && s && s.y - e.clientY > 60 && performance.now() - s.t < 600) {
              e.preventDefault();
              navigate(`/patri/${active.id}/sky`);
            }
          }}
        >
          <DeskObject to="/today" name={`Brass panchang dial, ${local}, opens today's leaf`} tip="आज · Today" label={`Dial · ${local}`}>
            <DialArt
              hourAngle={(hh % 12) * 30 + mm * 0.5}
              minuteAngle={mm * 6}
              rahuFrom={p ? dayArc(p.rahuKaal[0]) : 0}
              rahuTo={p ? dayArc(p.rahuKaal[1]) : 0}
            />
          </DeskObject>
        </div>

        {empty || !active ? (
          <DeskObject
            to="/leaf/new"
            className="deskobj--patri"
            name="A blank scroll with a stylus resting on it — write your first leaf"
            tip="नया पत्ता · New leaf"
            label="Write your first leaf"
          >
            <RolledPatriArt blank />
          </DeskObject>
        ) : (
          <DeskObject
            to={`/patri/${active.id}`}
            className="deskobj--patri"
            name={`Janam Patri of ${active.name}, opens the chart scroll`}
            tip={`पत्री · ${active.birth.localD}/${active.birth.localMo}/${active.birth.localY}`}
            label={
              <>
                <span className="dev" lang="hi">
                  जन्म पत्री
                </span>{" "}
                · {active.name}
              </>
            }
          >
            <RolledPatriArt />
          </DeskObject>
        )}

        <DeskObject
          to={active ? `/hast/${active.id}` : "/leaf/new"}
          name={active ? `Brass loupe, opens the palm reading for ${active.name}` : "Brass loupe — write a leaf first"}
          tip="हस्त · Palm"
          label="Loupe"
        >
          <LoupeArt />
        </DeskObject>

        <button
          type="button"
          className="deskobj"
          aria-pressed={theme === "night"}
          aria-label={theme === "night" ? "Diya, lit — snuff it for the morning terrace" : "Diya, snuffed — light it for the night desk"}
          onClick={() => {
            toggle();
            play(theme === "night" ? "breath" : "fwoomp");
            haptics.impact("light");
          }}
        >
          <DiyaArt lit={theme === "night"} />
          <span className="lbl" aria-hidden="true">
            Diya · {theme === "night" ? "lit" : "snuffed"}
          </span>
        </button>

        <Link to="/drawer" className="deskobj chowki__drawer" aria-label="The drawer — presets, export and the colophon" onClick={() => haptics.impact("light")}>
          <DrawerKnobArt />
          <span className="lbl" aria-hidden="true">
            Drawer
          </span>
        </Link>
      </div>
      {active ? (
        <div className="chowki__note" style={{ textAlign: "center", marginBottom: "var(--space-2)" }}>
          <Link className="chowki__rooftop" to={`/patri/${active.id}/sky`} onClick={(e) => rememberOrigin(e.currentTarget)}>
            <span aria-hidden="true">⇧</span> the birth sky from the rooftop
          </Link>
        </div>
      ) : null}
      {today.err ? (
        <div className="chowki__note">
          <p className="note-haldi" role="status">
            The dial is stuck — check the date.
          </p>
        </div>
      ) : null}
    </Screen>
  );
}
