// The leaf bundle (§4.3): palm leaves between two teak boards, tied with a mauli thread. Pull the
// thread's end and the bundle unties — the leaves fan from their thread holes (leaf-fan, #10) and
// become the list you open, pair, export or burn.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { useActiveProfile, useProfiles, useSettings } from "../../app/hooks";
import { rememberOrigin } from "../../app/origin";
import { Screen } from "../../components/ui/Screen";
import { Sheet } from "../../components/ui/Sheet";
import { TurmericBand } from "../../components/ui/TurmericBand";
import { burnProfile, saveSettings } from "../../data/repo";
import { hashString, mulberry32 } from "../../engine/math";
import type { Profile } from "../../engine/types";
import { haptics } from "../../platform/haptics";
import { play } from "../../platform/sound";
import { toast } from "../../state/ui";
import { charTo } from "./BurnHold";
import { LEAF_H, Leaf, type LeafPose, type LeafTool } from "./Leaf";
import { LeafSheet, type SheetMode } from "./LeafSheet";
import { leafMoon } from "./leafFacts";
import { ThreadKnot } from "./ThreadKnot";
import "./circle.css";

const STEP = LEAF_H + 12;
const TIED_STEP = 18;
const FAN_DEG = 12;
const FAN_X = 18;
const HOLE_X = 22;

/** Remembered for the session, so coming back from a Patri finds the bundle as you left it. */
let untiedThisSession = false;

function useWidth(el: HTMLElement | null, fallback: number): number {
  const [w, setW] = useState(fallback);
  useEffect(() => {
    if (!el) return;
    const read = () => setW(el.clientWidth || fallback);
    read();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(read);
    ro.observe(el);
    return () => ro.disconnect();
  }, [el, fallback]);
  return w;
}

/** Leaf poses: tied = a squared-up stack with a little hand-made slop; untied = the fan. */
function poses(list: Profile[], tied: boolean, width: number): { poses: LeafPose[]; height: number } {
  const n = list.length;
  const fanDeg = n > 1 ? FAN_DEG : 0;
  const pad = Math.ceil((width - HOLE_X) * Math.sin((fanDeg * Math.PI) / 180)) + 8;
  const out = list.map((p, i) => {
    const t = n > 1 ? i / (n - 1) : 0.5;
    if (tied) {
      const rnd = mulberry32(hashString(p.id));
      return { x: (rnd() - 0.5) * 3, y: i * TIED_STEP, rotate: (rnd() - 0.5) * 1.1, delay: 0 };
    }
    return { x: -FAN_X * t, y: pad + i * STEP, rotate: -fanDeg + 2 * fanDeg * t, delay: i * 0.03 };
  });
  const height = tied ? LEAF_H + Math.max(0, n - 1) * TIED_STEP : 2 * pad + LEAF_H + Math.max(0, n - 1) * STEP;
  return { poses: out, height };
}

function BlankLeaf({ first }: { first: boolean }) {
  return (
    <Link
      to="/leaf/new"
      className="blankleaf"
      aria-label={first ? "Write your first leaf — a blank leaf with a stylus" : "New leaf — a blank leaf with a stylus"}
      onClick={(e) => {
        rememberOrigin(e.currentTarget);
        play("scratch");
      }}
    >
      <span className="leaf__hole" aria-hidden="true" />
      <span className="blankleaf__text">
        <span lang="hi" className="dev">
          नया पत्ता
        </span>{" "}
        · New leaf
      </span>
      <svg className="blankleaf__stylus" viewBox="0 0 140 30" aria-hidden="true" data-decorative="true">
        <path d="M6 22 L118 8 L126 10 L120 15 L8 26 Z" fill="var(--teak-light)" />
        <path d="M118 8 L134 4 L126 10 Z" fill="var(--brass-mid)" />
        <path d="M6 22 L2 25 L8 26 Z" fill="var(--ink)" />
        <path d="M20 21.6 L112 10.2" stroke="var(--brass-hi)" strokeWidth=".8" opacity=".5" />
      </svg>
    </Link>
  );
}

export default function CircleScreen() {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const settings = useSettings();
  const navigate = useNavigate();
  const [tied, setTied] = useState(!untiedThisSession);
  const [tray, setTray] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ id: string; mode: SheetMode } | null>(null);
  const [stackEl, setStackEl] = useState<HTMLDivElement | null>(null);
  const width = useWidth(stackEl, 340);
  const chars = useRef(new Map<string, HTMLElement>());

  const list = profiles ?? [];
  const n = list.length;
  const layout = useMemo(() => poses(list, tied, width), [list, tied, width]);
  const sheetProfile = sheet ? list.find((p) => p.id === sheet.id) : undefined;

  useEffect(() => {
    untiedThisSession = !tied;
  }, [tied]);

  const toggle = useCallback(() => {
    setTied((t) => !t);
    setTray(null);
    play("snap");
    haptics.impact("light");
  }, []);

  const register = useCallback(
    (id: string) => (el: HTMLElement | null) => {
      if (el) chars.current.set(id, el);
      else chars.current.delete(id);
    },
    [],
  );
  const registers = useMemo(() => new Map(list.map((p) => [p.id, register(p.id)])), [list, register]);

  const open = (p: Profile, el: HTMLElement | null) => {
    void saveSettings({ activeProfileId: p.id });
    rememberOrigin(el);
    play("tick", 0.6);
    navigate(`/patri/${p.id}`);
  };

  const tool = (p: Profile, t: LeafTool) => {
    if (t === "edit") navigate(`/leaf/${p.id}/edit`);
    else if (t === "palm") navigate(`/hast/${p.id}`);
    else setSheet({ id: p.id, mode: t === "milan" ? "milan" : "export" });
  };

  const burn = async (p: Profile) => {
    setSheet(null);
    setTray(null);
    try {
      await burnProfile(p.id);
      haptics.impact("heavy");
      play("crackle");
      toast("Burned — the leaf and its prints are gone from this device.", "danger");
    } catch (e) {
      charTo(chars.current.get(p.id), 0);
      toast(`The leaf would not burn: ${e instanceof Error ? e.message : String(e)}`, "danger");
    }
  };

  if (profiles === undefined) {
    return <Screen className="circle" label="The leaf bundle">{null}</Screen>;
  }

  if (n === 0) {
    return (
      <Screen className="circle circle--empty" label="The leaf bundle — empty">
        <div className="circle__col">
          <h1 className="circle__empty-h display">Write your first leaf</h1>
          <p className="circle__empty-p">
            The bundle is empty. A leaf holds one person's birth — date, time, place — and everything here is cast from it, on this device.
          </p>
          <BlankLeaf first />
        </div>
      </Screen>
    );
  }

  return (
    <Screen className="circle" label="The leaf bundle">
      <div className="circle__col">
        <header className="paper circle__head">
          <TurmericBand
            level={1}
            dev="पोथी"
            title="Leaves"
            meta={
              <>
                {n} {n === 1 ? "leaf" : "leaves"} · {tied ? "tied" : "untied"}
              </>
            }
          />
          <p className="circle__hint">
            {tied ? "Pull the thread's end to untie the bundle." : "Tap a leaf to open its patri · swipe left or ⋯ for more."}{" "}
            <button type="button" className="linkish" onClick={toggle} aria-pressed={!tied}>
              {tied ? "Untie" : "Tie it up"}
            </button>
          </p>
        </header>

        <section className={`bundle${tied ? " is-tied" : " is-untied"}`} aria-label={`Bundle of ${n} ${n === 1 ? "leaf" : "leaves"}`}>
          <div className="board board--top" aria-hidden="true" data-decorative="true">
            <span className="board__wrap" style={{ opacity: tied ? 1 : 0 }} />
          </div>
          <div className="bundle__viewport">
            <div className="bundle__stack" ref={setStackEl} style={{ height: layout.height }}>
              <ul className="bundle__leaves" inert={tied} aria-label="Leaves">
                {list.map((p, i) => (
                  <Leaf
                    key={p.id}
                    profile={p}
                    moon={leafMoon(p, settings.preset.ayanamsa)}
                    pose={layout.poses[i] ?? { x: 0, y: 0, rotate: 0, delay: 0 }}
                    z={n - i}
                    tied={tied}
                    active={active?.id === p.id}
                    tone={(i % 2) as 0 | 1}
                    trayOpen={tray === p.id}
                    exportReady
                    onTray={(o) => setTray(o ? p.id : null)}
                    onOpen={(el) => open(p, el)}
                    onMenu={() => {
                      setTray(null);
                      setSheet({ id: p.id, mode: "menu" });
                    }}
                    onTool={(t) => tool(p, t)}
                    onBurn={() => void burn(p)}
                    registerChar={registers.get(p.id) ?? register(p.id)}
                  />
                ))}
              </ul>
              <div className={`bundle__thread${tied ? "" : " is-off"}`} aria-hidden="true" data-decorative="true" />
              {tied ? (
                <button
                  type="button"
                  className="bundle__cover"
                  aria-label={`Untie the bundle — ${n} ${n === 1 ? "leaf" : "leaves"}: ${list.map((p) => p.name).join(", ")}`}
                  onClick={toggle}
                />
              ) : null}
            </div>
          </div>
          <div className="board board--bottom">
            <ThreadKnot tied={tied} onToggle={toggle} count={n} />
          </div>
        </section>

        <BlankLeaf first={false} />
      </div>

      <Sheet open={sheet !== null && sheetProfile !== undefined} onClose={() => setSheet(null)} label={sheetProfile ? `Leaf — ${sheetProfile.name}` : "Leaf"}>
        {sheet && sheetProfile ? (
          <LeafSheet
            profile={sheetProfile}
            others={list.filter((p) => p.id !== sheetProfile.id)}
            mode={sheet.mode}
            ayanamsa={settings.preset.ayanamsa}
            setMode={(mode) => setSheet({ id: sheetProfile.id, mode })}
            onOpen={() => {
              setSheet(null);
              open(sheetProfile, null);
            }}
            onTool={(t) => {
              if (t === "edit" || t === "palm") setSheet(null);
              tool(sheetProfile, t);
            }}
            onPair={(o) => {
              setSheet(null);
              navigate(`/milan/${sheetProfile.id}/${o.id}`);
            }}
            onBurn={() => void burn(sheetProfile)}
            onBurnProgress={(k) => charTo(chars.current.get(sheetProfile.id), k)}
            onClose={() => setSheet(null)}
          />
        ) : null}
      </Sheet>
    </Screen>
  );
}
