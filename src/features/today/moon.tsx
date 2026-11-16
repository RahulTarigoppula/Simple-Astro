// The Moon as it really is that day: the terminator is an ellipse whose half-width is |1 − 2k| of
// the radius. The lit limb flips for a southern sky.
import { animate, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";

const R = 46;
const CX = 50;

/** The lit region as one SVG path: the lit limb plus the terminator half-ellipse. */
export function litPath(k: number, waxing: boolean, south: boolean, r: number = R, c: number = CX): string {
  const kk = Math.min(1, Math.max(0, k));
  if (kk < 0.004) return "";
  const rightLit = waxing !== south;
  const rx = Math.abs(1 - 2 * kk) * r;
  const limb = rightLit ? 1 : 0;
  const term = kk < 0.5 === rightLit ? 0 : 1;
  return `M${c} ${c - r}A${r} ${r} 0 0 ${limb} ${c} ${c + r}A${rx.toFixed(2)} ${r} 0 0 ${term} ${c} ${c - r}Z`;
}

/** A small Moon face; decorative, the words beside it carry the meaning. */
export function MoonFace({ k, waxing, south, className }: { k: number; waxing: boolean; south: boolean; className?: string }) {
  const d = litPath(k, waxing, south);
  return (
    <svg className={`alm-moon${className ? ` ${className}` : ""}`} viewBox="0 0 100 100" aria-hidden="true" data-decorative="true">
      <circle className="alm-moon__dark" cx={CX} cy={CX} r={R} />
      {d ? <path className="alm-moon__lit" d={d} /> : null}
    </svg>
  );
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;
/** The lit fraction of the disc for a Moon − Sun angle (0 new, 180 full). */
export const litFraction = (elongation: number) => (1 - Math.cos((norm(elongation) * Math.PI) / 180)) / 2;

const EASE = [0.22, 0.8, 0.2, 1] as const;

/** The angle on show: it glides to a new day's angle the short way round, and waxes into place the first time. */
function useGlide(target: number): number {
  const still = useReducedMotion();
  const skip = !!still || import.meta.env.MODE === "test";
  const [shown, setShown] = useState(skip ? target : target - 40);
  const at = useRef(shown);
  useEffect(() => {
    if (skip) {
      at.current = target;
      setShown(target);
      return;
    }
    const start = at.current;
    const delta = ((((target - start) % 360) + 540) % 360) - 180;
    if (Math.abs(delta) < 0.01) return;
    const c = animate(0, 1, {
      duration: 1.2,
      ease: EASE,
      onUpdate: (t) => {
        at.current = start + delta * t;
        setShown(at.current);
      },
    });
    return () => c.stop();
  }, [target, skip]);
  return shown;
}

// The dark plains that make the Moon read as the Moon, as seen with north up: [x, y, rx, ry] in radii.
const MARIA: ReadonlyArray<readonly [number, number, number, number]> = [
  [-0.28, -0.42, 0.3, 0.24], // Imbrium
  [0.24, -0.34, 0.17, 0.17], // Serenitatis
  [0.4, -0.08, 0.21, 0.16], // Tranquillitatis
  [0.7, -0.24, 0.09, 0.12], // Crisium
  [0.63, 0.14, 0.11, 0.16], // Fecunditatis
  [0.42, 0.26, 0.07, 0.07], // Nectaris
  [-0.62, -0.08, 0.2, 0.36], // Procellarum
  [-0.2, 0.36, 0.2, 0.14], // Nubium
  [-0.5, 0.38, 0.09, 0.09], // Humorum
  [0.02, -0.74, 0.36, 0.05], // Frigoris
  [0.03, -0.13, 0.08, 0.06], // Vaporum
];
// Two bright ray craters: [x, y, r].
const RAYS: ReadonlyArray<readonly [number, number, number]> = [
  [-0.1, 0.7, 0.06], // Tycho
  [-0.33, -0.12, 0.045], // Copernicus
];

const BIG = 200;
const BC = BIG / 2;
const BR = 78;

interface MoonPictureProps {
  /** Moon − Sun angle in degrees (0 new, 90 first quarter, 180 full). */
  elongation: number;
  /** Seen from south of the equator: the lit limb and the face are turned round. */
  south: boolean;
  /** Under a dark sky the unlit part hides the stars behind it; by day it is only a hint. */
  dark: boolean;
  label: string;
}

/** A large Moon in its true phase: a shaded disc with its maria, the lit part cut by the real terminator. */
export function MoonPicture({ elongation, south, dark, label }: MoonPictureProps) {
  const uid = useId().replace(/:/g, "");
  const still = useReducedMotion();
  const e = norm(useGlide(elongation));
  const k = litFraction(e);
  const d = litPath(k, e < 180, south, BR, BC);
  // The light falls from the side of the lit limb.
  const lightX = e < 180 !== south ? 0.64 : 0.36;
  return (
    <motion.svg
      className={`moonpic${dark ? " moonpic--dark" : ""}`}
      viewBox={`0 0 ${BIG} ${BIG}`}
      role="img"
      aria-label={label}
      initial={still ? false : { opacity: 0, scale: 0.86 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 1, ease: EASE }}
    >
      <defs>
        <radialGradient id={`mp-halo-${uid}`}>
          <stop offset="0.74" stopColor="var(--sky-moon)" stopOpacity={(0.06 + 0.36 * k).toFixed(3)} />
          <stop offset="1" stopColor="var(--sky-moon)" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`mp-face-${uid}`} cx={lightX} cy="0.4" r="0.75">
          <stop offset="0" stopColor="var(--star)" />
          <stop offset="0.55" stopColor="var(--sky-moon)" />
          <stop offset="1" stopColor="var(--sky-moon)" stopOpacity="0.72" />
        </radialGradient>
        <filter id={`mp-soft-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2.6" />
        </filter>
        <filter id={`mp-edge-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="1.3" />
        </filter>
        <clipPath id={`mp-disc-${uid}`}>
          <circle cx={BC} cy={BC} r={BR} />
        </clipPath>
        <mask id={`mp-lit-${uid}`} maskUnits="userSpaceOnUse" x="0" y="0" width={BIG} height={BIG}>
          <g clipPath={`url(#mp-disc-${uid})`}>{d ? <path d={d} className="moonpic__mask" filter={`url(#mp-edge-${uid})`} /> : null}</g>
        </mask>
      </defs>

      <circle cx={BC} cy={BC} r={BIG / 2} fill={`url(#mp-halo-${uid})`} />
      <circle cx={BC} cy={BC} r={BR} className="moonpic__night" />
      <g mask={`url(#mp-lit-${uid})`}>
        <circle cx={BC} cy={BC} r={BR} fill={`url(#mp-face-${uid})`} />
        <g clipPath={`url(#mp-disc-${uid})`} filter={`url(#mp-soft-${uid})`} transform={south ? `rotate(180 ${BC} ${BC})` : undefined}>
          {MARIA.map(([x, y, rx, ry]) => (
            <ellipse key={`${x}|${y}`} cx={BC + x * BR} cy={BC + y * BR} rx={rx * BR} ry={ry * BR} className="moonpic__mare" />
          ))}
          {RAYS.map(([x, y, r]) => (
            <circle key={`${x}|${y}`} cx={BC + x * BR} cy={BC + y * BR} r={r * BR} className="moonpic__ray" />
          ))}
        </g>
      </g>
      <circle cx={BC} cy={BC} r={BR - 0.5} className="moonpic__rim" />
    </motion.svg>
  );
}

// A fixed star field (a small generator with a fixed seed, so the sky is the same on every visit).
const STARS: ReadonlyArray<readonly [number, number, number, number]> = (() => {
  let s = 20261116;
  const next = () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
  return Array.from({ length: 64 }, () => [next() * 400, next() * 520, 0.5 + next() * 1.1, next()] as const);
})();

/** The stars behind the Moon: all of them at night, a few at dusk and dawn, none by day. */
export function StarField({ strength }: { strength: number }) {
  if (strength <= 0) return null;
  return (
    <svg className="alm-stars" viewBox="0 0 400 520" preserveAspectRatio="xMidYMid slice" aria-hidden="true" style={{ opacity: strength }}>
      {STARS.map(([x, y, r, tw]) => (
        <circle
          key={`${x.toFixed(1)}-${y.toFixed(1)}`}
          cx={x}
          cy={y}
          r={r}
          className={tw > 0.72 ? "sky-scene__star sky-scene__star--tw" : "sky-scene__star"}
          style={{ animationDelay: `${(tw * 4).toFixed(2)}s`, opacity: 0.3 + tw * 0.6 }}
        />
      ))}
    </svg>
  );
}
