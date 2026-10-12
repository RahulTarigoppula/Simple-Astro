#!/usr/bin/env node
// Synthetic palm fixtures for the line-extraction tests (IMPLEMENTATION-PROMPT §10.5).
// NO real hand is involved: every pixel is drawn from geometry below. Hands are biometrics, and
// no photograph of one may ever enter the repository.
//
// Writes src/engine/palm/__fixtures__/synthetic-{clean,shadow,blur,henna}.png (palette PNGs,
// ≤ 200 kB each, encoded here with node:zlib — no dependencies) and synthetic.json (landmarks,
// world landmarks and the ground-truth lines in the canonical 512 frame).
// Deterministic: the same script always writes the same bytes.
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { deflateSync } from "node:zlib";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src", "engine", "palm", "__fixtures__");

// ─── deterministic PRNG (same as src/engine/math.ts) ─────────────────────────
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── the hand, in the canonical 512 frame (fingers up, thumb left) ──────────
// Landmarks 1 (THUMB_CMC), 0 (WRIST), 5 (INDEX_MCP), 17 (PINKY_MCP) sit exactly on the
// rectification targets, so the ground truth below is also the truth after rectification.
const CANON = [
  [256, 496], // 0 wrist
  [56, 400], // 1 thumb cmc
  [16, 322], // 2 thumb mcp
  [-8, 262], // 3 thumb ip
  [-26, 212], // 4 thumb tip
  [120, 96], // 5 index mcp
  [110, 10], // 6
  [104, -45], // 7
  [100, -95], // 8 index tip
  [212, 100], // 9 middle mcp
  [212, -10], // 10
  [212, -75], // 11
  [212, -130], // 12 middle tip
  [302, 112], // 13 ring mcp
  [310, 10], // 14
  [314, -50], // 15
  [316, -100], // 16 ring tip
  [392, 128], // 17 pinky mcp
  [402, 50], // 18
  [408, 0], // 19
  [412, -40], // 20 pinky tip
];

/** Ground-truth creases (control points; drawn as Catmull-Rom curves). */
const GT = {
  heart: [
    [404, 168],
    [350, 146],
    [290, 136],
    [230, 140],
    [178, 156],
    [150, 176],
  ],
  // the head line starts just above the life line, as an "independent" head line does
  head: [
    [122, 232],
    [180, 252],
    [244, 274],
    [306, 296],
    [364, 320],
  ],
  life: [
    [152, 258],
    [136, 310],
    [142, 364],
    [168, 416],
    [206, 464],
  ],
};
const DEPTH = { heart: 0.34, head: 0.32, life: 0.3 };

// photo frame: canonical → photo is a similarity (scale 0.9, rotated −6°)
const W = 540;
const H = 720;
const S = 0.9;
const TH = (-6 * Math.PI) / 180;
const C0 = [190, 190];
const P0 = [282, 356];
const toPhoto = ([x, y]) => {
  const dx = x - C0[0];
  const dy = y - C0[1];
  return [P0[0] + S * (Math.cos(TH) * dx - Math.sin(TH) * dy), P0[1] + S * (Math.sin(TH) * dx + Math.cos(TH) * dy)];
};
const toCanon = ([px, py]) => {
  const dx = (px - P0[0]) / S;
  const dy = (py - P0[1]) / S;
  return [C0[0] + Math.cos(TH) * dx + Math.sin(TH) * dy, C0[1] - Math.sin(TH) * dx + Math.cos(TH) * dy];
};

function catmull(points, step = 1) {
  const out = [];
  const P = [points[0], ...points, points[points.length - 1]];
  for (let i = 1; i < P.length - 2; i++) {
    const [p0, p1, p2, p3] = [P[i - 1], P[i], P[i + 1], P[i + 2]];
    const seg = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(seg / step));
    for (let k = 0; k < n; k++) {
      const t = k / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

function segDist(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const L2 = dx * dx + dy * dy;
  let t = L2 > 0 ? ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / L2 : 0;
  t = Math.max(0, Math.min(1, t));
  return [Math.hypot(a[0] + t * dx - p[0], a[1] + t * dy - p[1]), t];
}

// silhouette pieces
const PALM_POLY = [
  [96, 84],
  [404, 106],
  [446, 210],
  [436, 350],
  [396, 470],
  [338, 524],
  [342, 760],
  [176, 760],
  [168, 528],
  [112, 478],
  [64, 430],
  [44, 360],
  [70, 210],
];
const CAPSULES = [
  // [from landmark, to landmark, radius]
  [1, 2, 42],
  [2, 3, 30],
  [3, 4, 26],
  [5, 6, 30],
  [6, 7, 27],
  [7, 8, 25],
  [9, 10, 31],
  [10, 11, 28],
  [11, 12, 26],
  [13, 14, 29],
  [14, 15, 27],
  [15, 16, 25],
  [17, 18, 26],
  [18, 19, 24],
  [19, 20, 22],
];

function polySignedDist(p, poly) {
  let inside = false;
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[j];
    const b = poly[i];
    if (b[1] > p[1] !== a[1] > p[1] && p[0] < ((a[0] - b[0]) * (p[1] - b[1])) / (a[1] - b[1]) + b[0]) inside = !inside;
    best = Math.min(best, segDist(p, a, b)[0]);
  }
  return inside ? -best : best;
}

/** Signed distance to the hand outline (negative inside), canonical px. */
function handDist(c) {
  let d = polySignedDist(c, PALM_POLY);
  for (const [i, j, r] of CAPSULES) d = Math.min(d, segDist(c, CANON[i], CANON[j])[0] - r);
  return d;
}

// minor creases: short, shallow — distractors under the 60 px component floor
const rngCrease = mulberry32(7);
const MINOR = [];
for (let k = 0; k < 46; k++) {
  const x = 130 + rngCrease() * 260;
  const y = 150 + rngCrease() * 320;
  const a = rngCrease() * Math.PI;
  const len = 10 + rngCrease() * 22;
  const bend = (rngCrease() - 0.5) * 8;
  const p0 = [x, y];
  const p2 = [x + Math.cos(a) * len, y + Math.sin(a) * len];
  const p1 = [(p0[0] + p2[0]) / 2 - Math.sin(a) * bend, (p0[1] + p2[1]) / 2 + Math.cos(a) * bend];
  MINOR.push({ pts: catmull([p0, p1, p2], 1), depth: 0.08 + rngCrease() * 0.08, w: 0.9 + rngCrease() * 0.4 });
}
// finger flexion creases and the wrist bracelet (outside the palm search region)
const FLEX = [];
for (const [a, b] of [
  [5, 6],
  [9, 10],
  [13, 14],
  [17, 18],
  [6, 7],
  [10, 11],
  [14, 15],
  [18, 19],
]) {
  const pa = CANON[a];
  const pb = CANON[b];
  const m = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
  const dx = pb[0] - pa[0];
  const dy = pb[1] - pa[1];
  const n = Math.hypot(dx, dy);
  const nx = -dy / n;
  const ny = dx / n;
  FLEX.push({ pts: catmull([[m[0] - nx * 20, m[1] - ny * 20], m, [m[0] + nx * 20, m[1] + ny * 20]]), depth: 0.22, w: 1.3 });
}
FLEX.push({
  pts: catmull([
    [176, 528],
    [256, 534],
    [340, 526],
  ]),
  depth: 0.25,
  w: 1.5,
});

const MAJOR = Object.entries(GT).map(([id, ctrl]) => ({ id, pts: catmull(ctrl, 1), depth: DEPTH[id], w: 1.8 }));

/** Darkening factor (0..1) of all creases at canonical point c. */
function creaseShade(c) {
  let k = 1;
  const pass = (list, taper) => {
    for (const ln of list) {
      // cheap bounding test
      let best = Infinity;
      let bt = 0;
      const pts = ln.pts;
      for (let i = 1; i < pts.length; i++) {
        const a = pts[i - 1];
        const b = pts[i];
        if (Math.abs(a[0] - c[0]) > 12 && Math.abs(b[0] - c[0]) > 12 && Math.sign(a[0] - c[0]) === Math.sign(b[0] - c[0])) continue;
        if (Math.abs(a[1] - c[1]) > 12 && Math.abs(b[1] - c[1]) > 12 && Math.sign(a[1] - c[1]) === Math.sign(b[1] - c[1])) continue;
        const [d, t] = segDist(c, a, b);
        if (d < best) {
          best = d;
          bt = (i - 1 + t) / (pts.length - 1);
        }
      }
      if (best > 8) continue;
      const g = Math.exp(-(best * best) / (2 * ln.w * ln.w));
      const tp = taper ? 0.55 + 0.45 * Math.sin(Math.PI * bt) : 1;
      k *= 1 - ln.depth * tp * g;
    }
  };
  pass(MAJOR, true);
  pass(MINOR, false);
  pass(FLEX, false);
  return k;
}

/** Smooth skin tone variation + mount highlights + edge falloff, luma 0..255. */
function skinLuma(c, edgeDist) {
  const [x, y] = c;
  let L = 168 + 6 * Math.sin(x / 37 + 0.4) * Math.cos(y / 53) + 4 * Math.sin((x + y) / 23);
  for (const [mx, my, r] of [
    [140, 150, 50],
    [212, 140, 50],
    [300, 150, 48],
    [380, 180, 44],
    [100, 380, 80],
    [370, 380, 70],
  ]) {
    const d2 = (x - mx) ** 2 + (y - my) ** 2;
    L += 9 * Math.exp(-d2 / (2 * r * r));
  }
  // the hand curves away near its outline
  L *= 0.78 + 0.22 * Math.min(1, -edgeDist / 26);
  return L;
}

// ─── henna (chromatic strokes), canonical frame ──────────────────────────────
const HENNA = [];
{
  // mandala in the palm centre
  const cx = 262;
  const cy = 336;
  for (const r of [34, 52]) {
    const pts = [];
    for (let k = 0; k <= 72; k++) pts.push([cx + r * Math.cos((k / 72) * 2 * Math.PI), cy + r * Math.sin((k / 72) * 2 * Math.PI)]);
    HENNA.push({ pts, w: 2.2 });
  }
  for (let k = 0; k < 8; k++) {
    const a = (k / 8) * 2 * Math.PI;
    const p0 = [cx + 52 * Math.cos(a), cy + 52 * Math.sin(a)];
    const p1 = [cx + 74 * Math.cos(a + 0.12), cy + 74 * Math.sin(a + 0.12)];
    const p2 = [cx + 84 * Math.cos(a), cy + 84 * Math.sin(a)];
    HENNA.push({ pts: catmull([p0, p1, p2]), w: 2.0 });
  }
  // a vine sweeping across the upper palm, near the heart line's band
  HENNA.push({
    pts: catmull([
      [120, 210],
      [190, 196],
      [260, 204],
      [330, 196],
      [410, 214],
    ]),
    w: 2.4,
  });
  // a long curl down the ulnar side
  HENNA.push({
    pts: catmull([
      [420, 240],
      [396, 300],
      [404, 360],
      [380, 420],
      [330, 460],
    ]),
    w: 2.4,
  });
  // dotted chain toward the wrist
  for (let k = 0; k < 9; k++) {
    const p = [240 + k * 4, 420 + k * 9];
    const pts = [];
    for (let j = 0; j <= 12; j++) pts.push([p[0] + 3 * Math.cos((j / 12) * 2 * Math.PI), p[1] + 3 * Math.sin((j / 12) * 2 * Math.PI)]);
    HENNA.push({ pts, w: 1.6 });
  }
}
function hennaCover(c) {
  let best = Infinity;
  for (const s of HENNA) {
    for (let i = 1; i < s.pts.length; i++) {
      const a = s.pts[i - 1];
      const b = s.pts[i];
      if (Math.min(a[0], b[0]) - 8 > c[0] || Math.max(a[0], b[0]) + 8 < c[0]) continue;
      if (Math.min(a[1], b[1]) - 8 > c[1] || Math.max(a[1], b[1]) + 8 < c[1]) continue;
      const d = segDist(c, a, b)[0] - s.w;
      if (d < best) best = d;
    }
  }
  return best <= 0 ? 1 : best < 1 ? 1 - best : 0;
}

// ─── palette ─────────────────────────────────────────────────────────────────
const SKIN_N = 200;
const HENNA_N = 40;
const BG_N = 16;
const PALETTE = [];
for (let i = 0; i < SKIN_N; i++) {
  const l = (i / (SKIN_N - 1)) * 255;
  PALETTE.push([l * 1.18, l * 0.95, l * 0.78].map((v) => Math.max(0, Math.min(255, Math.round(v)))));
}
for (let i = 0; i < HENNA_N; i++) {
  const f = 0.3 + (0.7 * i) / (HENNA_N - 1);
  PALETTE.push([150 * f, 62 * f, 28 * f].map((v) => Math.round(v)));
}
for (let i = 0; i < BG_N; i++) {
  const l = 20 + (90 * i) / (BG_N - 1);
  PALETTE.push([l * 1.05, l, l * 0.92].map((v) => Math.min(255, Math.round(v))));
}

// ─── render ──────────────────────────────────────────────────────────────────
function gaussianBlur(a, w, h, sigma) {
  const r = Math.ceil(3 * sigma);
  const k = [];
  let s = 0;
  for (let i = -r; i <= r; i++) {
    const v = Math.exp(-(i * i) / (2 * sigma * sigma));
    k.push(v);
    s += v;
  }
  for (let i = 0; i < k.length; i++) k[i] /= s;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += k[i + r] * a[y * w + Math.min(w - 1, Math.max(0, x + i))];
      tmp[y * w + x] = acc;
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      let acc = 0;
      for (let i = -r; i <= r; i++) acc += k[i + r] * tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x];
      out[y * w + x] = acc;
    }
  return out;
}

/** Base layers, computed once: luma (skin or background), hand alpha, henna coverage. */
function baseLayers() {
  const luma = new Float32Array(W * H);
  const alpha = new Float32Array(W * H);
  const henna = new Float32Array(W * H);
  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const c = toCanon([px + 0.5, py + 0.5]);
      const d = handDist(c);
      const a = Math.max(0, Math.min(1, 0.5 - d));
      const i = py * W + px;
      const bg = 46 + 10 * (py / H) + 3 * Math.sin(px / 31);
      const skin = a > 0 ? skinLuma(c, Math.min(0, d)) * creaseShade(c) : bg;
      luma[i] = a * skin + (1 - a) * bg;
      alpha[i] = a;
      henna[i] = a > 0.5 ? hennaCover(c) : 0;
    }
  }
  return { luma, alpha, henna };
}

function quantise(luma, alpha, henna, seed) {
  const rng = mulberry32(seed);
  const idx = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    const noise = (rng() + rng() - 1) * 1.5; // triangular, ±1.5 luma
    const l = Math.max(0, Math.min(255, luma[i] + noise));
    if (henna[i] > 0.5) {
      // henna darkens with the light falling on the skin underneath
      const f = Math.max(0, Math.min(1, (l / 190 - 0.3) / 0.7));
      idx[i] = SKIN_N + Math.round(f * (HENNA_N - 1));
    } else if (alpha[i] >= 0.5) {
      idx[i] = Math.round((l / 255) * (SKIN_N - 1));
    } else {
      idx[i] = SKIN_N + HENNA_N + Math.max(0, Math.min(BG_N - 1, Math.round(((l - 20) / 90) * (BG_N - 1))));
    }
  }
  return idx;
}

// ─── PNG (palette, 8-bit) ────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function encodePalettePng(idx, w, h, palette) {
  const raw = Buffer.alloc((w + 1) * h);
  let prev = new Uint8Array(w);
  for (let y = 0; y < h; y++) {
    const row = idx.subarray(y * w, (y + 1) * w);
    // choose the filter (None/Sub/Up) with the smallest sum of absolute residuals
    const cands = [0, 1, 2].map((f) => {
      const out = new Uint8Array(w);
      let cost = 0;
      for (let x = 0; x < w; x++) {
        const left = x > 0 ? row[x - 1] : 0;
        const v = f === 0 ? row[x] : f === 1 ? (row[x] - left) & 0xff : (row[x] - prev[x]) & 0xff;
        out[x] = v;
        cost += v < 128 ? v : 256 - v;
      }
      return { f, out, cost };
    });
    cands.sort((a, b) => a.cost - b.cost || a.f - b.f);
    const best = cands[0];
    raw[y * (w + 1)] = best.f;
    raw.set(best.out, y * (w + 1) + 1);
    prev = row;
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 3; // palette
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const plte = Buffer.from(palette.flat());
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("PLTE", plte),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ─── main ────────────────────────────────────────────────────────────────────
mkdirSync(outDir, { recursive: true });
const base = baseLayers();
const noHenna = new Float32Array(W * H);

const variants = {
  "synthetic-clean": () => quantise(base.luma, base.alpha, noHenna, 11),
  "synthetic-shadow": () => {
    // a 40 % illumination ramp, bright on the thumb side, dim on the little-finger side
    const l = new Float32Array(W * H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) l[y * W + x] = base.luma[y * W + x] * (1 - (0.4 * x) / (W - 1));
    return quantise(l, base.alpha, noHenna, 12);
  },
  "synthetic-blur": () => quantise(gaussianBlur(base.luma, W, H, 6), base.alpha, noHenna, 13),
  "synthetic-henna": () => quantise(base.luma, base.alpha, base.henna, 14),
};

const sizes = {};
for (const [name, make] of Object.entries(variants)) {
  const png = encodePalettePng(make(), W, H, PALETTE);
  if (png.length > 200 * 1024) throw new Error(`${name}.png is ${png.length} bytes — over the 200 kB biometrics guard`);
  writeFileSync(join(outDir, `${name}.png`), png);
  sizes[name] = png.length;
}

const landmarks = CANON.map((c) => {
  const [x, y] = toPhoto(c);
  return { x: +(x / W).toFixed(6), y: +(y / H).toFixed(6), z: 0 };
});
// world landmarks: metres, view-invariant — canonical px × 0.2 mm, centred on the palm
const worldLandmarks = CANON.map(([x, y]) => ({ x: +((x - 256) * 0.0002).toFixed(6), y: +((y - 300) * 0.0002).toFixed(6), z: 0 }));
const sampled = (ctrl) =>
  catmull(ctrl, 1)
    .filter((_, i, a) => i % 4 === 0 || i === a.length - 1)
    .map(([x, y]) => [+x.toFixed(2), +y.toFixed(2)]);
const truth = {
  note: "Synthetic — generated by scripts/make-palm-fixtures.mjs. No real hand.",
  width: W,
  height: H,
  handedness: "Right",
  score: 0.97,
  landmarks,
  worldLandmarks,
  lines: { heart: sampled(GT.heart), head: sampled(GT.head), life: sampled(GT.life) },
  variants: Object.keys(variants),
};
writeFileSync(join(outDir, "synthetic.json"), `${JSON.stringify(truth)}\n`);
console.log("make-palm-fixtures:", sizes);
