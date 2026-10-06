// The single source of truth for Motion springs. Each material has its own spring.
export const PAPER = { type: "spring", stiffness: 220, damping: 26, mass: 0.8 } as const; // light, damped; one bounce at scroll ends
export const BRASS = { type: "spring", stiffness: 120, damping: 20, mass: 2 } as const; // heavy; + rotational inertia and detents
export const THREAD = { type: "spring", stiffness: 420, damping: 14, mass: 0.6 } as const; // elastic; may overshoot twice
// INK is not a spring: pathLength 0→1 at ~900 px/s with --ease-out, then opacity .85→1 over 240 ms.
export const INK_SPEED_PX_PER_S = 900;
export const BRASS_FRICTION = 0.94; // velocity multiplier per frame while a drum coasts
export const EASE_OUT = [0.22, 0.8, 0.2, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

/** Ink duration for a stroke of `length` px, clamped 400–1400 ms. */
export function inkDuration(length: number): number {
  return Math.min(1400, Math.max(400, (length / INK_SPEED_PX_PER_S) * 1000));
}
