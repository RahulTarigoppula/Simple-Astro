// The desk's sounds, synthesised on the fly with Web Audio. Every sound is original (no samples,
// nothing to license, zero bytes shipped). Master gain 0.5, muted from the Drawer, unlocked on the
// first genuine gesture (both touchstart and pointerdown — the Android WebView needs a real touch).
import { mulberry32 } from "../engine/math";

export type SoundId =
  | "tick"
  | "tickBright"
  | "dull"
  | "bead"
  | "thunk"
  | "pat"
  | "snap"
  | "scratch"
  | "fwoomp"
  | "breath"
  | "crackle"
  | "creak";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let enabled = true;
let calm = false;
const lastPlayed = new Map<SoundId, number>();
const rng = mulberry32(0xc0ffee);

export const setSoundEnabled = (on: boolean): void => {
  enabled = on;
  if (master && ctx) master.gain.setTargetAtTime(on ? 0.5 : 0, ctx.currentTime, 0.01);
};
export const setCalmSound = (on: boolean): void => {
  calm = on;
};

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const AC =
    typeof window !== "undefined"
      ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
      : undefined;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = enabled ? 0.5 : 0;
  master.connect(ctx.destination);
  const len = Math.floor(ctx.sampleRate * 0.6);
  noise = ctx.createBuffer(1, len, ctx.sampleRate);
  const ch = noise.getChannelData(0);
  for (let i = 0; i < len; i++) ch[i] = rng() * 2 - 1;
  return ctx;
}

const UNLOCK_EVENTS = ["touchstart", "touchend", "pointerdown", "pointerup", "keydown"] as const;

/** Keep trying on every gesture until the context is really running (Chrome honours only some). */
export function unlockAudioOnFirstGesture(): void {
  const removeAll = (): void => {
    for (const ev of UNLOCK_EVENTS) window.removeEventListener(ev, unlock);
  };
  function unlock(): void {
    const c = ensure();
    if (!c || c.state === "running") {
      removeAll();
      return;
    }
    void c.resume().then(() => {
      if (c.state === "running") removeAll();
    });
  }
  for (const ev of UNLOCK_EVENTS) window.addEventListener(ev, unlock, { passive: true });
}

function env(g: GainNode, t: number, peak: number, attack: number, decay: number): void {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(c: AudioContext, out: AudioNode, freq: number, t: number, peak: number, decay: number, type: OscillatorType = "sine", endFreq?: number): void {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (endFreq) o.frequency.exponentialRampToValueAtTime(endFreq, t + decay);
  env(g, t, peak, 0.002, decay);
  o.connect(g).connect(out);
  o.start(t);
  o.stop(t + decay + 0.05);
}

function burst(c: AudioContext, out: AudioNode, t: number, peak: number, decay: number, filter: BiquadFilterType, freq: number, q = 1): void {
  if (!noise) return;
  const s = c.createBufferSource();
  s.buffer = noise;
  const f = c.createBiquadFilter();
  f.type = filter;
  f.frequency.value = freq;
  f.Q.value = q;
  const g = c.createGain();
  env(g, t, peak, 0.003, decay);
  s.connect(f).connect(g).connect(out);
  s.start(t, rng() * 0.4);
  s.stop(t + decay + 0.05);
}

const MIN_GAP: Partial<Record<SoundId, number>> = { tick: 40, tickBright: 40, bead: 30, scratch: 45, creak: 400 };

/** Play a desk sound. `level` (0..1) scales the gain, e.g. rustle by scroll velocity. */
export function play(id: SoundId, level = 1): void {
  if (!enabled) return;
  if (calm && (id === "scratch" || id === "creak")) return;
  const c = ensure();
  if (!c || !master || c.state !== "running") return;
  const now = performance.now();
  const gap = MIN_GAP[id];
  if (gap && now - (lastPlayed.get(id) ?? -1e9) < gap) return;
  lastPlayed.set(id, now);
  const t = c.currentTime + 0.005;
  const out = master;
  const L = Math.max(0.05, Math.min(1, level));
  switch (id) {
    case "tick": // brass detent, about −18 dB
      tone(c, out, 2400, t, 0.12 * L, 0.025, "triangle");
      burst(c, out, t, 0.05 * L, 0.012, "highpass", 5000);
      break;
    case "tickBright":
      tone(c, out, 3300, t, 0.16 * L, 0.03, "triangle");
      tone(c, out, 4950, t, 0.05 * L, 0.02);
      break;
    case "dull": // a refused detent
      tone(c, out, 180, t, 0.25 * L, 0.06, "sine", 120);
      burst(c, out, t, 0.08 * L, 0.04, "lowpass", 600);
      break;
    case "bead": // wooden bead on the thread
      burst(c, out, t, 0.35 * L, 0.03, "bandpass", 1500, 4);
      tone(c, out, 520, t, 0.12 * L, 0.04, "sine", 380);
      break;
    case "thunk": // wax seal pressed
      tone(c, out, 110, t, 0.45 * L, 0.22, "sine", 55);
      burst(c, out, t, 0.18 * L, 0.09, "lowpass", 700);
      break;
    case "pat": // tilak dab
      burst(c, out, t, 0.16 * L, 0.05, "lowpass", 900);
      break;
    case "snap": // mauli thread knotted
      tone(c, out, 1400, t, 0.18 * L, 0.06, "triangle", 700);
      burst(c, out, t, 0.12 * L, 0.03, "highpass", 3000);
      break;
    case "scratch": // nib or stylus on paper
      burst(c, out, t, 0.07 * L, 0.04, "bandpass", 4200, 1.4);
      break;
    case "fwoomp": // diya lit
      burst(c, out, t, 0.3 * L, 0.35, "lowpass", 380);
      tone(c, out, 90, t, 0.1 * L, 0.3, "sine", 140);
      break;
    case "breath": // diya snuffed
      burst(c, out, t, 0.18 * L, 0.45, "bandpass", 900, 0.7);
      break;
    case "crackle": // burning edge
      for (let i = 0; i < 6; i++) burst(c, out, t + rng() * 0.25, 0.12 * L, 0.01 + rng() * 0.02, "highpass", 2500 + rng() * 3000);
      break;
    case "creak": // roller at overscroll
      tone(c, out, 210, t, 0.06 * L, 0.18, "sawtooth", 160);
      break;
  }
}

/** Paper rustle whose gain follows scroll velocity (px/s); silent below 60 px/s. */
let lastRustle = 0;
export function rustle(velocityPxPerS: number): void {
  if (calm || Math.abs(velocityPxPerS) < 60) return;
  const now = performance.now();
  if (now - lastRustle < 110) return;
  lastRustle = now;
  const c = ensure();
  if (!c || !master || !enabled || c.state !== "running") return;
  const level = Math.min(1, Math.abs(velocityPxPerS) / 2400);
  burst(c, master, c.currentTime + 0.005, 0.09 * level, 0.12, "bandpass", 2600 + rng() * 1200, 0.8);
}
