// The opening journey, drawn live on a 2D canvas: the observable universe, the Milky Way, the Solar
// System, Earth, a forest, the rare plants, us under the stars, and the zodiac wheel. Every scene is
// deterministic (seeded PRNG) — Math.random is never used.
import { mulberry32 } from "../../engine/math";

export type SceneId = "universe" | "milkyway" | "solar" | "earth" | "life" | "rare" | "us" | "child" | "question" | "vyom";

export interface Ctx {
  g: CanvasRenderingContext2D;
  w: number;
  h: number;
  /** seconds since the scene began */
  t: number;
}

const TAU = Math.PI * 2;
const ease = (x: number) => 1 - (1 - Math.min(1, Math.max(0, x))) ** 3;

// ── shared star backdrop ─────────────────────────────────────────────────
const BACK = (() => {
  const r = mulberry32(7);
  return Array.from({ length: 520 }, () => ({ x: r(), y: r(), s: r() ** 3 * 1.8 + 0.25, p: r() * TAU }));
})();

/** Where a scene's subject sits: higher on a tall phone so the words below never cover it. */
export const focusY = (w: number, h: number) => (h > w * 1.2 ? h * 0.3 : h * 0.42);
/** On wide screens the words sit on the left, so the subject moves right. */
export const focusX = (w: number, h: number) => (w >= 900 && w / h >= 4 / 3 ? w * 0.66 : w / 2);

function backdrop({ g, w, h, t }: Ctx, alpha = 1, drift = 0, fill = true) {
  if (fill) {
    g.fillStyle = "#03040b";
    g.fillRect(0, 0, w, h);
  }
  for (const s of BACK) {
    const tw = 0.55 + 0.45 * Math.sin(t * 1.3 + s.p);
    g.globalAlpha = alpha * tw * Math.min(1, s.s);
    g.fillStyle = "#f1f3ff";
    const x = (((s.x * w + drift * t * s.s * 8) % w) + w) % w;
    g.beginPath();
    g.arc(x, s.y * h, s.s, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number, inner: string, outer = "rgba(0,0,0,0)") {
  const grd = g.createRadialGradient(x, y, 0, x, y, r);
  grd.addColorStop(0, inner);
  grd.addColorStop(1, outer);
  g.fillStyle = grd;
  g.beginPath();
  g.arc(x, y, r, 0, TAU);
  g.fill();
}

// ── 1. the observable universe: hundreds of billions of galaxies ─────────
const GALAXIES = (() => {
  const r = mulberry32(11);
  const hues = ["#c4b5fd", "#a5b4fc", "#fde68a", "#fbcfe8", "#bae6fd", "#ffffff"];
  return Array.from({ length: 900 }, () => ({
    x: r() - 0.5,
    y: r() - 0.5,
    z: r() * 0.9 + 0.1,
    a: r() * Math.PI,
    e: 0.3 + r() * 0.7,
    s: r() ** 2 * 3 + 0.6,
    c: hues[Math.floor(r() * hues.length)] ?? "#ffffff",
  }));
})();

function universe(c: Ctx) {
  const { g, w, h, t } = c;
  g.fillStyle = "#020309";
  g.fillRect(0, 0, w, h);
  // the cosmic web: faint filaments
  const web = g.createRadialGradient(w * 0.5, h * 0.5, 0, w * 0.5, h * 0.5, Math.max(w, h) * 0.7);
  web.addColorStop(0, "rgba(76, 29, 149, 0.28)");
  web.addColorStop(1, "rgba(2, 3, 9, 0)");
  g.fillStyle = web;
  g.fillRect(0, 0, w, h);
  const zoom = 1 + t * 0.09;
  const m = Math.max(w, h);
  for (const q of GALAXIES) {
    const k = zoom / (1.25 - q.z * zoom * 0.08);
    const x = w / 2 + q.x * m * k;
    const y = h / 2 + q.y * m * k;
    if (x < -20 || y < -20 || x > w + 20 || y > h + 20) continue;
    const s = q.s * k * 0.9;
    g.save();
    g.translate(x, y);
    g.rotate(q.a);
    g.globalAlpha = Math.min(1, 0.25 + q.z * 0.8);
    glow(g, 0, 0, s * 3.2, `${q.c}55`);
    g.fillStyle = q.c;
    g.beginPath();
    g.ellipse(0, 0, s, s * q.e, 0, 0, TAU);
    g.fill();
    g.restore();
  }
  g.globalAlpha = 1;
}

// ── 2. the Milky Way: a barred spiral, and you are here ──────────────────
const ARMS = (() => {
  const r = mulberry32(23);
  return Array.from({ length: 3200 }, (_, i) => {
    const arm = i % 4;
    const d = r() ** 0.7;
    const spread = (r() - 0.5) * (0.5 - d * 0.25);
    return { arm, d, spread, b: r(), hue: r() };
  });
})();

function milkyway(c: Ctx) {
  const { g, w, h, t } = c;
  backdrop(c, 0.5);
  const R = Math.min(w, h) * (0.32 + ease(t / 3) * 0.12);
  const cx = focusX(w, h);
  const cy = focusY(w, h);
  const rot = t * 0.06;
  glow(g, cx, cy, R * 0.55, "rgba(253, 230, 138, 0.55)");
  glow(g, cx, cy, R * 1.25, "rgba(139, 92, 246, 0.16)");
  for (const p of ARMS) {
    const theta = p.arm * (TAU / 4) + p.d * 4.2 + p.spread + rot;
    const rr = R * (0.08 + p.d);
    const x = cx + Math.cos(theta) * rr;
    const y = cy + Math.sin(theta) * rr * 0.62;
    const warm = p.d < 0.25;
    g.globalAlpha = (1 - p.d * 0.7) * (0.35 + p.b * 0.65);
    g.fillStyle = warm ? "#fde68a" : p.hue > 0.7 ? "#f9a8d4" : p.hue > 0.35 ? "#c4b5fd" : "#bae6fd";
    g.fillRect(x, y, 1.3, 1.3);
  }
  g.globalAlpha = 1;
  // you are here: two-thirds of the way out, on a minor arm
  const yt = 0.62 * TAU + rot + 0.62 * 4.2;
  const yx = cx + Math.cos(yt) * R * 0.62;
  const yy = cy + Math.sin(yt) * R * 0.62 * 0.62;
  const pulse = 0.5 + 0.5 * Math.sin(t * 3);
  g.strokeStyle = `rgba(103, 232, 249, ${0.5 + pulse * 0.5})`;
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(yx, yy, 6 + pulse * 6, 0, TAU);
  g.stroke();
  g.fillStyle = "#67e8f9";
  g.beginPath();
  g.arc(yx, yy, 2.5, 0, TAU);
  g.fill();
  g.font = "600 12px Inter Variable, Inter, system-ui, sans-serif";
  g.fillStyle = "rgba(186, 230, 253, 0.95)";
  g.fillText("you are here", yx + 12, yy - 10);
}

// ── 3. the Solar System ─────────────────────────────────────────────────
const PLANETS = [
  { r: 0.13, s: 2.2, p: 0.24, c: "#d6d3d1" },
  { r: 0.19, s: 3.2, p: 0.62, c: "#fde68a" },
  { r: 0.26, s: 3.6, p: 1, c: "#38bdf8", earth: true },
  { r: 0.33, s: 2.8, p: 1.88, c: "#fb7185" },
  { r: 0.5, s: 7.5, p: 11.86, c: "#fcd34d" },
  { r: 0.64, s: 6.5, p: 29.4, c: "#fde68a", ring: true },
  { r: 0.77, s: 4.6, p: 84, c: "#a5f3fc" },
  { r: 0.88, s: 4.4, p: 165, c: "#818cf8" },
] as const;

function solar(c: Ctx) {
  const { g, w, h, t } = c;
  backdrop(c, 0.7);
  const cx = focusX(w, h);
  const cy = focusY(w, h);
  const R = Math.min(w * 0.48, h * 0.62) * (0.8 + ease(t / 2.5) * 0.2);
  glow(g, cx, cy, R * 0.16, "rgba(251, 191, 36, 0.6)");
  glow(g, cx, cy, R * 0.045, "#fff7d6", "rgba(251, 191, 36, 0.95)");
  for (const p of PLANETS) {
    const rx = p.r * R;
    const ry = rx * 0.36;
    g.strokeStyle = "earth" in p ? "rgba(56, 189, 248, 0.55)" : "rgba(196, 181, 253, 0.16)";
    g.lineWidth = "earth" in p ? 1.2 : 0.8;
    g.beginPath();
    g.ellipse(cx, cy, rx, ry, 0, 0, TAU);
    g.stroke();
    const a = (t * 0.9) / p.p + p.r * 17;
    const x = cx + Math.cos(a) * rx;
    const y = cy + Math.sin(a) * ry;
    if ("earth" in p) {
      glow(g, x, y, 16, "rgba(56, 189, 248, 0.6)");
      g.font = "600 12px Inter Variable, Inter, system-ui, sans-serif";
      g.fillStyle = "rgba(186, 230, 253, 0.95)";
      g.fillText("Earth", x + 10, y - 10);
    }
    g.fillStyle = p.c;
    g.beginPath();
    g.arc(x, y, p.s * (Math.min(w, h) / 700), 0, TAU);
    g.fill();
    if ("ring" in p) {
      g.strokeStyle = "rgba(253, 230, 138, 0.7)";
      g.beginPath();
      g.ellipse(x, y, p.s * 2.1 * (Math.min(w, h) / 700), p.s * 0.7 * (Math.min(w, h) / 700), -0.3, 0, TAU);
      g.stroke();
    }
  }
}

// ── 4. the pale blue dot ────────────────────────────────────────────────
// Continents as clusters of small overlapping patches, so coastlines look ragged rather than round.
const LAND = (() => {
  const r = mulberry32(41);
  const out: Array<{ lon: number; lat: number; s: number; c: string }> = [];
  for (let k = 0; k < 7; k++) {
    const lon0 = r() * TAU;
    const lat0 = (r() - 0.5) * 1.8;
    for (let i = 0; i < 26; i++) {
      const desert = r() > 0.78;
      out.push({
        lon: lon0 + (r() - 0.5) * 0.9,
        lat: lat0 + (r() - 0.5) * 0.9,
        s: 0.04 + r() * 0.09,
        c: desert ? "rgba(180, 140, 70, 0.85)" : r() > 0.5 ? "rgba(22, 101, 52, 0.9)" : "rgba(21, 128, 61, 0.85)",
      });
    }
  }
  return out;
})();
const CLOUD = (() => {
  const r = mulberry32(43);
  return Array.from({ length: 60 }, () => ({ lon: r() * TAU, lat: (r() - 0.5) * 2.6, s: 0.03 + r() * 0.08 }));
})();

function earth(c: Ctx) {
  const { g, w, h, t } = c;
  backdrop(c, 0.8);
  const cx = focusX(w, h);
  const cy = focusY(w, h);
  const R = Math.min(w, h) * (0.12 + ease(t / 4) * 0.18);
  glow(g, cx, cy, R * 1.35, "rgba(56, 189, 248, 0.35)");
  g.save();
  g.beginPath();
  g.arc(cx, cy, R, 0, TAU);
  g.clip();
  const ocean = g.createRadialGradient(cx - R * 0.35, cy - R * 0.35, R * 0.1, cx, cy, R);
  ocean.addColorStop(0, "#38bdf8");
  ocean.addColorStop(0.6, "#1d4ed8");
  ocean.addColorStop(1, "#0b1a4a");
  g.fillStyle = ocean;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  const spin = t * 0.25;
  const blob = (lon: number, lat: number, s: number, col: string, wide = 1) => {
    const l = lon + spin;
    const z = Math.cos(l);
    if (z < -0.1) return;
    const x = cx + Math.sin(l) * R * Math.cos(lat * 0.6);
    const y = cy + Math.sin(lat * 0.6) * R;
    g.fillStyle = col;
    g.globalAlpha = Math.min(1, 0.3 + z);
    g.beginPath();
    g.ellipse(x, y, s * R * Math.max(0.2, z) * wide, s * R * 0.8, 0, 0, TAU);
    g.fill();
  };
  for (const p of LAND) blob(p.lon, p.lat, p.s, p.c);
  // polar ice
  blob(0, 2.5, 0.16, "rgba(240, 249, 255, 0.85)", 3);
  blob(Math.PI, -2.5, 0.14, "rgba(240, 249, 255, 0.8)", 3);
  for (const p of CLOUD) blob(p.lon * 1.3 - spin * 0.3, p.lat, p.s, "rgba(255,255,255,0.55)", 2.6);
  // a soft sunlit highlight
  glow(g, cx - R * 0.4, cy - R * 0.4, R * 0.7, "rgba(255, 255, 255, 0.18)");
  g.globalAlpha = 1;
  // night side
  const night = g.createLinearGradient(cx - R, cy, cx + R, cy);
  night.addColorStop(0, "rgba(2, 3, 9, 0)");
  night.addColorStop(0.62, "rgba(2, 3, 9, 0.05)");
  night.addColorStop(1, "rgba(2, 3, 9, 0.85)");
  g.fillStyle = night;
  g.fillRect(cx - R, cy - R, R * 2, R * 2);
  g.restore();
  g.strokeStyle = "rgba(125, 211, 252, 0.7)";
  g.lineWidth = 2;
  g.beginPath();
  g.arc(cx, cy, R + 1, 0, TAU);
  g.stroke();
  // the Moon
  const ma = t * 0.35;
  const mx = cx + Math.cos(ma) * R * 2.1;
  const my = cy + Math.sin(ma) * R * 0.5;
  glow(g, mx, my, R * 0.35, "rgba(224, 231, 255, 0.4)");
  g.fillStyle = "#e0e7ff";
  g.beginPath();
  g.arc(mx, my, R * 0.13, 0, TAU);
  g.fill();
}

// ── 5. life: a forest growing ───────────────────────────────────────────
const TREES = (() => {
  const r = mulberry32(57);
  return Array.from({ length: 13 }, (_, i) => ({
    x: (i + 0.5) / 13 + (r() - 0.5) * 0.05,
    s: 0.55 + r() * 0.6,
    d: r() * 1.2,
    seed: Math.floor(r() * 1e6),
  }));
})();
const FLIES = (() => {
  const r = mulberry32(59);
  return Array.from({ length: 60 }, () => ({ x: r(), y: 0.45 + r() * 0.45, p: r() * TAU, s: 0.3 + r() }));
})();

function branch(
  g: CanvasRenderingContext2D,
  x: number,
  y: number,
  len: number,
  ang: number,
  depth: number,
  grow: number,
  rnd: () => number,
) {
  if (depth === 0 || len < 2) return;
  const k = Math.min(1, Math.max(0, grow * 6 - (6 - depth)));
  if (k <= 0) return;
  const x2 = x + Math.cos(ang) * len * k;
  const y2 = y - Math.sin(ang) * len * k;
  g.lineWidth = depth * 0.9;
  g.strokeStyle = depth > 2 ? "#3b2a1a" : "#166534";
  g.beginPath();
  g.moveTo(x, y);
  g.lineTo(x2, y2);
  g.stroke();
  if (depth <= 2 && k > 0.6) {
    g.fillStyle = rnd() > 0.5 ? "rgba(74, 222, 128, 0.8)" : "rgba(163, 230, 53, 0.75)";
    g.beginPath();
    g.arc(x2, y2, 3 + rnd() * 3, 0, TAU);
    g.fill();
  }
  if (k < 1) return;
  const spread = 0.42 + rnd() * 0.2;
  branch(g, x2, y2, len * (0.68 + rnd() * 0.1), ang + spread, depth - 1, grow, rnd);
  branch(g, x2, y2, len * (0.68 + rnd() * 0.1), ang - spread, depth - 1, grow, rnd);
}

function life(c: Ctx) {
  const { g, w, h, t } = c;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#050a1f");
  sky.addColorStop(0.55, "#1e1b4b");
  sky.addColorStop(0.85, "#7c2d12");
  sky.addColorStop(1, "#f59e0b");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  backdrop(c, 0.35, 0, false);
  const ground = h > w * 1.2 ? h * 0.56 : h * 0.72;
  glow(g, w * 0.5, ground, Math.max(w, h) * 0.5, "rgba(251, 191, 36, 0.35)");
  g.fillStyle = "#04060f";
  g.beginPath();
  g.moveTo(0, ground);
  for (let x = 0; x <= w; x += 20) g.lineTo(x, ground - Math.sin(x * 0.01) * 10 - Math.sin(x * 0.033) * 5);
  g.lineTo(w, h);
  g.lineTo(0, h);
  g.fill();
  g.lineCap = "round";
  for (const tr of TREES) {
    const grow = Math.min(1, Math.max(0, (t - tr.d) / 4.5));
    branch(g, tr.x * w, ground - 2, Math.min(w, h) * 0.1 * tr.s, Math.PI / 2, 7, grow, mulberry32(tr.seed));
  }
  for (const f of FLIES) {
    const a = 0.4 + 0.6 * Math.sin(t * 2 * f.s + f.p);
    g.globalAlpha = Math.max(0, a) * Math.min(1, t / 3);
    glow(g, f.x * w + Math.sin(t * f.s + f.p) * 14, f.y * h + Math.cos(t * f.s) * 8, 5, "rgba(253, 224, 71, 0.95)");
  }
  g.globalAlpha = 1;
}

// ── 6. the rare ones: Neelakurinji hills, and Jupiter's twelve-year arc ──
const KURINJI = (() => {
  const r = mulberry32(71);
  return Array.from({ length: 700 }, () => ({ x: r(), y: r(), d: r() * 4, s: 1 + r() * 2.4 }));
})();

function rare(c: Ctx) {
  const { g, w, h, t } = c;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#0b1033");
  sky.addColorStop(0.6, "#312e81");
  sky.addColorStop(1, "#4c1d95");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  backdrop(c, 0.45, 0, false);
  // Jupiter's arc across the sky: twelve years, one sign a year
  const tall = h > w * 1.2;
  const arcY = tall ? h * 0.06 : h * 0.12;
  g.strokeStyle = "rgba(253, 224, 71, 0.35)";
  g.setLineDash([3, 6]);
  g.beginPath();
  g.ellipse(w / 2, arcY + h * 0.2, w * 0.42, h * 0.2, 0, Math.PI, TAU);
  g.stroke();
  g.setLineDash([]);
  const ja = Math.PI + Math.min(1, t / 8) * Math.PI;
  const jx = w / 2 + Math.cos(ja) * w * 0.42;
  const jy = arcY + h * 0.2 + Math.sin(ja) * h * 0.2;
  glow(g, jx, jy, 18, "rgba(253, 224, 71, 0.7)");
  g.fillStyle = "#fde047";
  g.beginPath();
  g.arc(jx, jy, 5, 0, TAU);
  g.fill();
  // misty hills of the Western Ghats
  const hill = (base: number, amp: number, col: string, f: number) => {
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 12) g.lineTo(x, base - Math.sin(x * f + base) * amp - Math.sin(x * f * 2.7) * amp * 0.3);
    g.lineTo(w, h);
    g.fill();
  };
  const base = tall ? 0.36 : 0.5;
  hill(h * base, h * 0.06, "#1e1b4b", 0.006);
  hill(h * (base + 0.08), h * 0.05, "#2e1065", 0.009);
  hill(h * (base + 0.16), h * 0.04, "#1e1b4b", 0.012);
  // the blue Neelakurinji bloom spreading across the slopes
  for (const k of KURINJI) {
    const open = Math.min(1, Math.max(0, (t - k.d) / 1.5));
    if (open <= 0) continue;
    const y = h * (base + 0.03 + k.y * (1 - base - 0.03));
    g.globalAlpha = open * 0.9;
    g.fillStyle = k.x > 0.5 ? "#818cf8" : "#a78bfa";
    g.beginPath();
    g.arc(k.x * w, y, k.s * open, 0, TAU);
    g.fill();
  }
  g.globalAlpha = 1;
}

// ── 7. us: looking up, and naming the Seven Sages ──────────────────────
const DIPPER: Array<[number, number]> = [
  [0.3, 0.2],
  [0.33, 0.33],
  [0.46, 0.36],
  [0.48, 0.24],
  [0.58, 0.21],
  [0.67, 0.19],
  [0.77, 0.26],
];

function us(c: Ctx) {
  const { g, w, h, t } = c;
  backdrop(c, 1, 0.4);
  glow(g, w * 0.5, h, Math.max(w, h) * 0.6, "rgba(76, 29, 149, 0.4)");
  // the stars of the Saptarṣi join up
  const k = Math.min(1, Math.max(0, (t - 1) / 4));
  const pts = DIPPER.map(([x, y]) => [x * w, y * h] as const);
  g.strokeStyle = "rgba(196, 181, 253, 0.8)";
  g.lineWidth = 1.4;
  g.beginPath();
  const segs = [0, 1, 2, 3, 0, 3, 4, 5, 6];
  const n = Math.floor(k * (segs.length - 1));
  for (let i = 0; i <= n && i < segs.length; i++) {
    const p = pts[segs[i] ?? 0];
    if (!p) continue;
    if (i === 0) g.moveTo(p[0], p[1]);
    else g.lineTo(p[0], p[1]);
  }
  g.stroke();
  for (const [x, y] of pts) {
    glow(g, x, y, 10, "rgba(241, 243, 255, 0.7)");
    g.fillStyle = "#ffffff";
    g.beginPath();
    g.arc(x, y, 2.2, 0, TAU);
    g.fill();
  }
  // Arundhatī beside Vasiṣṭha
  const [vx, vy] = pts[5] ?? [0, 0];
  g.fillStyle = "rgba(255,255,255,0.8)";
  g.beginPath();
  g.arc(vx + 9, vy - 6, 1.1, 0, TAU);
  g.fill();
  // a hill and a person looking up
  const ground = h > w * 1.2 ? h * 0.6 : h * 0.86;
  g.fillStyle = "#03040b";
  g.beginPath();
  g.moveTo(0, h);
  g.lineTo(0, ground + h * 0.04);
  g.quadraticCurveTo(w * 0.5, ground - h * 0.08, w, ground + h * 0.04);
  g.lineTo(w, h);
  g.fill();
  const px = w * 0.5;
  const py = ground - h * 0.075;
  g.fillStyle = "#03040b";
  g.beginPath();
  g.arc(px + 3, py - 34, 7, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(px - 8, py);
  g.lineTo(px - 6, py - 26);
  g.lineTo(px + 10, py - 26);
  g.lineTo(px + 8, py);
  g.fill();
}

// ── 8. a terrace on a summer night: a grandparent, a child, a diya, the Moon ──
function child(c: Ctx) {
  const { g, w, h, t } = c;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, "#020617");
  sky.addColorStop(0.6, "#0f1640");
  sky.addColorStop(1, "#1e1b4b");
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  backdrop(c, 0.9, 0.15, false);
  const tall = h > w * 1.2;
  // a waxing crescent
  const mx = w * 0.76;
  const my = tall ? h * 0.12 : h * 0.16;
  glow(g, mx, my, 70, "rgba(224, 231, 255, 0.25)");
  g.fillStyle = "#eef2ff";
  g.beginPath();
  g.arc(mx, my, 16, 0, TAU);
  g.fill();
  g.fillStyle = "#0b1238";
  g.beginPath();
  g.arc(mx - 7, my - 3, 15, 0, TAU);
  g.fill();
  // the terrace parapet
  const deck = tall ? h * 0.5 : h * 0.66;
  g.fillStyle = "#05060f";
  g.fillRect(0, deck, w, h - deck);
  g.fillStyle = "#0a0c1c";
  g.fillRect(0, deck - 10, w, 10);
  for (let x = 0; x < w; x += 46) g.fillRect(x, deck - 26, 6, 18);
  // the diya: a flickering flame and its warm pool
  const dx = tall ? w * 0.5 : w * 0.72;
  const dy = deck + (tall ? 40 : 30);
  const flick = 0.85 + 0.15 * Math.sin(t * 9) * Math.sin(t * 3.7);
  glow(g, dx, dy - 6, 140 * flick, "rgba(251, 191, 36, 0.32)");
  glow(g, dx, dy - 8, 14 * flick, "rgba(255, 237, 160, 0.95)", "rgba(251, 146, 60, 0)");
  g.fillStyle = "#7c2d12";
  g.beginPath();
  g.ellipse(dx, dy, 12, 5, 0, 0, Math.PI);
  g.fill();
  // grandparent sitting (left), child lying with arms behind the head (right), lit from the diya
  g.fillStyle = "#0b0a14";
  const gx = dx - (tall ? 70 : 110);
  g.beginPath();
  g.arc(gx, dy - 58, 11, 0, TAU);
  g.fill();
  g.beginPath();
  g.moveTo(gx - 22, dy + 8);
  g.quadraticCurveTo(gx - 20, dy - 46, gx, dy - 47);
  g.quadraticCurveTo(gx + 22, dy - 44, gx + 26, dy + 8);
  g.fill();
  const cx = dx + (tall ? 30 : 50);
  g.beginPath();
  g.arc(cx, dy + 4, 8, 0, TAU);
  g.fill();
  g.beginPath();
  g.ellipse(cx + 40, dy + 8, 34, 7, 0, 0, TAU);
  g.fill();
  // rim light from the diya
  g.strokeStyle = "rgba(251, 191, 36, 0.45)";
  g.lineWidth = 1.5;
  g.beginPath();
  g.arc(gx, dy - 58, 11, -0.6, 1.2);
  g.stroke();
  // the story rising: faint words of light drifting up toward the stars
  const words = ["Rāma", "Sītā", "Hanumān", "Arjuna", "Kṛṣṇa", "Draupadī"];
  g.font = "500 13px Inter Variable, Inter, system-ui, sans-serif";
  words.forEach((word, i) => {
    const k = (((t * 0.12 + i / words.length) % 1) + 1) % 1;
    g.globalAlpha = Math.sin(k * Math.PI) * 0.75;
    g.fillStyle = "#fde68a";
    g.fillText(word, gx + 10 + Math.sin(i * 2.1 + t * 0.6) * 40, dy - 80 - k * (deck * 0.7));
  });
  g.globalAlpha = 1;
}

// ── 9. the question: one bright point in the dark, ripples of doubt ──────
function question(c: Ctx) {
  const { g, w, h, t } = c;
  backdrop(c, 0.55);
  const cx = focusX(w, h);
  const cy = focusY(w, h);
  const R = Math.min(w, h) * 0.3;
  // a faint zodiac turning
  g.strokeStyle = "rgba(196, 181, 253, 0.12)";
  g.lineWidth = 1;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * TAU + t * 0.02;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * R * 0.55, cy + Math.sin(a) * R * 0.55);
    g.lineTo(cx + Math.cos(a) * R, cy + Math.sin(a) * R);
    g.stroke();
  }
  g.beginPath();
  g.arc(cx, cy, R, 0, TAU);
  g.stroke();
  for (let k = 0; k < 3; k++) {
    const p = (((t * 0.35 + k / 3) % 1) + 1) % 1;
    g.strokeStyle = `rgba(245, 196, 107, ${0.5 * (1 - p)})`;
    g.beginPath();
    g.arc(cx, cy, 8 + p * R, 0, TAU);
    g.stroke();
  }
  glow(g, cx, cy, 40, "rgba(255, 244, 214, 0.85)");
  g.fillStyle = "#ffffff";
  g.beginPath();
  g.arc(cx, cy, 3.5, 0, TAU);
  g.fill();
}
// ── 10. Vyom: the wheel of the sky lights up ─────────────────────────────
function vyom(c: Ctx) {
  const { g, w, h, t } = c;
  backdrop(c, 0.9);
  const cx = focusX(w, h);
  const cy = h > w * 1.2 ? h * 0.2 : h * 0.3;
  const R = Math.min(w, h) * (h > w * 1.2 ? 0.2 : 0.17);
  glow(g, cx, cy, R * 1.6, "rgba(139, 92, 246, 0.3)");
  const lit = Math.min(12, Math.floor(t * 3));
  for (let i = 0; i < 12; i++) {
    const a0 = (i / 12) * TAU + t * 0.05;
    const a1 = a0 + TAU / 12 - 0.03;
    g.strokeStyle =
      i < lit ? (i % 4 === 0 ? "#f97316" : i % 4 === 1 ? "#84cc16" : i % 4 === 2 ? "#38bdf8" : "#818cf8") : "rgba(196,181,253,0.15)";
    g.lineWidth = 10;
    g.beginPath();
    g.arc(cx, cy, R, a0, a1);
    g.stroke();
  }
  g.strokeStyle = "rgba(196, 181, 253, 0.35)";
  g.lineWidth = 1;
  for (let i = 0; i < 27; i++) {
    const a = (i / 27) * TAU - t * 0.03;
    g.beginPath();
    g.moveTo(cx + Math.cos(a) * (R + 12), cy + Math.sin(a) * (R + 12));
    g.lineTo(cx + Math.cos(a) * (R + 20), cy + Math.sin(a) * (R + 20));
    g.stroke();
  }
  glow(g, cx, cy, R * 0.45, "rgba(224, 231, 255, 0.5)");
  g.fillStyle = "#e0e7ff";
  g.beginPath();
  g.arc(cx, cy, R * 0.16, 0, TAU);
  g.fill();
}

export const SCENES: Record<SceneId, (c: Ctx) => void> = { universe, milkyway, solar, earth, life, rare, us, child, question, vyom };
