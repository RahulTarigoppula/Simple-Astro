// One palm leaf of the bundle: a paper strip ruled in turmeric, the thread hole at its left end, the
// name in brush, the Moon's nakṣatra in Devanagari and Latin, the birth line scratched small.
// Swipe it left (touch) for its tools, or use the ⋯ button (keyboard, mouse).
import { animate, motion, useMotionValue } from "motion/react";
import { useEffect, useRef } from "react";
import type { Profile } from "../../engine/types";
import { PAPER } from "../../motion/springs";
import { reducedMotion } from "../../platform/native";
import { BurnHold, charTo } from "./BurnHold";
import { birthLine, type LeafMoon } from "./leafFacts";

export const LEAF_H = 88;
export const TRAY_BTN = 58;

export type LeafTool = "edit" | "milan" | "palm" | "export";

export interface LeafPose {
  x: number;
  y: number;
  rotate: number;
  delay: number;
}

interface LeafProps {
  profile: Profile;
  moon: LeafMoon | null;
  pose: LeafPose;
  z: number;
  tied: boolean;
  active: boolean;
  tone: 0 | 1;
  trayOpen: boolean;
  exportReady: boolean;
  onTray: (open: boolean) => void;
  onOpen: (el: HTMLElement) => void;
  onMenu: () => void;
  onTool: (t: LeafTool) => void;
  onBurn: () => void;
  registerChar: (el: HTMLElement | null) => void;
}

export function Leaf(props: LeafProps) {
  const { profile, moon, pose, z, tied, active, tone, trayOpen, exportReady } = props;
  const tools: Array<[LeafTool, string]> = [
    ["edit", "Edit"],
    ["milan", "Milan"],
    ["palm", "Palm"],
    ...(exportReady ? ([["export", "Export"]] as Array<[LeafTool, string]>) : []),
  ];
  const trayW = (tools.length + 1) * TRAY_BTN;
  const sx = useMotionValue(0);
  const dragged = useRef(false);
  const char = useRef<HTMLSpanElement>(null);
  const { registerChar } = props;

  useEffect(() => {
    registerChar(char.current);
    return () => registerChar(null);
  }, [registerChar]);

  useEffect(() => {
    const target = trayOpen && !tied ? -trayW : 0;
    if (reducedMotion()) sx.set(target);
    else animate(sx, target, PAPER);
  }, [trayOpen, tied, trayW, sx]);

  const name = profile.name || "Unnamed person";
  const moonText = moon ? `Moon in ${moon.nakName}, pada ${moon.pada}, ${moon.signName}` : "Moon not cast";

  return (
    <motion.li
      className={`leaf-slot${tied ? " is-tied" : ""}`}
      style={{ zIndex: z, transformOrigin: "22px 50%", height: LEAF_H }}
      initial={false}
      animate={{ x: pose.x, y: pose.y, rotate: pose.rotate }}
      transition={{ ...PAPER, delay: pose.delay }}
    >
      <div className="leaf-tray" inert={!trayOpen || tied} style={{ width: trayW }}>
        {tools.map(([t, label]) => (
          <button
            key={t}
            type="button"
            className="leaf-tray__btn"
            onClick={() => {
              props.onTray(false);
              props.onTool(t);
            }}
            aria-label={`${label}: ${name}`}
          >
            {label}
          </button>
        ))}
        <BurnHold
          className="leaf-tray__btn leaf-tray__burn"
          label={
            <>
              Delete<small>hold</small>
            </>
          }
          ariaLabel={`Delete ${name}, hold to delete them and their palm photos`}
          onProgress={(k) => charTo(char.current, k)}
          onBurn={props.onBurn}
        />
      </div>

      <motion.div
        className={`leaf leaf--${tone}`}
        style={{ x: sx }}
        drag={tied ? false : "x"}
        dragConstraints={{ left: -trayW, right: 0 }}
        dragElastic={0.08}
        dragMomentum={false}
        onDragStart={() => {
          dragged.current = true;
        }}
        onDragEnd={(_, info) => {
          const open = info.offset.x < -trayW / 3 || info.velocity.x < -400;
          const closeNow = !open;
          props.onTray(open);
          // onTray may not change state (already closed): settle explicitly.
          if (closeNow) animate(sx, 0, PAPER);
          else animate(sx, -trayW, PAPER);
          window.setTimeout(() => {
            dragged.current = false;
          }, 0);
        }}
      >
        <button
          type="button"
          className="leaf__face"
          aria-label={`${name}, ${moonText}; born ${birthLine(profile)}. Opens the Janam Patri${active ? " (the active person)" : ""}`}
          onClick={(e) => {
            if (dragged.current) return;
            if (trayOpen) {
              props.onTray(false);
              return;
            }
            props.onOpen(e.currentTarget);
          }}
        >
          <span className="leaf__hole" aria-hidden="true" />
          <span className="leaf__text">
            <span className="leaf__line1">
              <span className="leaf__name">{name}</span>
              {active ? <span className="leaf__tilak" aria-hidden="true" /> : null}
              {moon ? (
                <span className="leaf__nak">
                  <span lang="hi" className="dev">
                    {moon.nakDev}
                  </span>{" "}
                  · {moon.nakName}
                </span>
              ) : (
                <span className="leaf__nak leaf__muted">Moon not cast</span>
              )}
            </span>
            <span className="leaf__birth">
              {birthLine(profile)}
              {moon ? <> · Moon in {moon.signName}</> : null}
            </span>
          </span>
        </button>
        <button type="button" className="leaf__more" aria-label={`Actions for ${name}`} aria-haspopup="dialog" onClick={props.onMenu}>
          <span aria-hidden="true">⋯</span>
        </button>
        <span className="leaf__char" ref={char} aria-hidden="true" />
      </motion.div>
    </motion.li>
  );
}
