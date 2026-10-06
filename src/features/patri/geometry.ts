// Chart geometry (§6.12). Both charts are data-driven SVG on a 400 × 400 viewBox.
import type { GrahaId, SignIdx } from "../../engine/types";

/** North Indian diamond: houses fixed on the page, sign numbers move. Anticlockwise from the top. */
export const NORTH_HOUSE_POLY: Record<number, Array<[number, number]>> = {
  1: [
    [200, 0],
    [300, 100],
    [200, 200],
    [100, 100],
  ],
  2: [
    [0, 0],
    [200, 0],
    [100, 100],
  ],
  3: [
    [0, 0],
    [100, 100],
    [0, 200],
  ],
  4: [
    [0, 200],
    [100, 100],
    [200, 200],
    [100, 300],
  ],
  5: [
    [0, 200],
    [100, 300],
    [0, 400],
  ],
  6: [
    [0, 400],
    [100, 300],
    [200, 400],
  ],
  7: [
    [200, 400],
    [100, 300],
    [200, 200],
    [300, 300],
  ],
  8: [
    [200, 400],
    [300, 300],
    [400, 400],
  ],
  9: [
    [400, 400],
    [300, 300],
    [400, 200],
  ],
  10: [
    [400, 200],
    [300, 100],
    [200, 200],
    [300, 300],
  ],
  11: [
    [400, 200],
    [300, 100],
    [400, 0],
  ],
  12: [
    [400, 0],
    [300, 100],
    [200, 0],
  ],
};

/** Where the sign numeral sits (n) and where the graha chips centre (b), per house. */
export const NORTH_ANCHOR: Record<number, { n: [number, number]; b: [number, number]; flat: boolean }> = {
  1: { n: [200, 62], b: [200, 108], flat: false },
  2: { n: [42, 26], b: [100, 34], flat: true },
  3: { n: [14, 100], b: [56, 100], flat: false },
  4: { n: [100, 160], b: [100, 206], flat: false },
  5: { n: [14, 300], b: [56, 300], flat: false },
  6: { n: [42, 386], b: [100, 364], flat: true },
  7: { n: [200, 262], b: [200, 306], flat: false },
  8: { n: [358, 386], b: [300, 364], flat: true },
  9: { n: [386, 300], b: [344, 300], flat: false },
  10: { n: [300, 160], b: [300, 206], flat: false },
  11: { n: [386, 100], b: [344, 100], flat: false },
  12: { n: [358, 26], b: [300, 34], flat: true },
};

/** The sign shown in house n of a chart whose Lagna sign is `lagnaSign`. */
export const signInHouse = (lagnaSign: number, house: number): SignIdx => ((lagnaSign + house - 1) % 12) as SignIdx;
export const houseOfSign = (lagnaSign: number, sign: number): number => ((sign - lagnaSign + 12) % 12) + 1;

/** South Indian grid: signs fixed on the page. SOUTH_CELL[signIdx] = [row, col]; Mīna top-left. */
export const SOUTH_CELL: Array<[number, number]> = [
  [0, 1],
  [0, 2],
  [0, 3],
  [1, 3],
  [2, 3],
  [3, 3],
  [3, 2],
  [3, 1],
  [3, 0],
  [2, 0],
  [1, 0],
  [0, 0],
];

export interface Chip {
  id: GrahaId;
  x: number;
  y: number;
  size: number;
}

/** Lay out graha chips around an anchor: one column up to three (two in flat triangles), else two. */
export function layoutChips(ids: GrahaId[], b: [number, number], flat: boolean, cellW = 64): Chip[] {
  const n = ids.length;
  if (n === 0) return [];
  const twoCol = flat ? n >= 3 : n >= 4;
  const size = n >= 5 ? 15 : n >= 3 ? 17 : 20;
  const step = size + 4;
  if (!twoCol) {
    const y0 = b[1] - ((n - 1) * step) / 2;
    return ids.map((id, i) => ({ id, x: b[0], y: y0 + i * step, size }));
  }
  const rows = Math.ceil(n / 2);
  const y0 = b[1] - ((rows - 1) * step) / 2;
  const dx = Math.min(cellW / 2, 28);
  return ids.map((id, i) => ({ id, x: b[0] + (i % 2 ? dx : -dx), y: y0 + Math.floor(i / 2) * step, size }));
}

/** A thumb-dab outline: a disc with a bled, irregular edge (pre-computed, never a live filter). */
export function tilakPath(cx: number, cy: number, r: number): string {
  const wobble = [1, 0.93, 1.06, 0.97, 1.08, 0.9, 1.03, 0.96, 1.05, 0.94, 1.02, 0.99];
  const pts = wobble.map((k, i) => {
    const a = (i / wobble.length) * Math.PI * 2;
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k * 0.92] as const;
  });
  let d = "";
  pts.forEach((p, i) => {
    const q = pts[(i + 1) % pts.length] ?? p;
    const mx = (p[0] + q[0]) / 2;
    const my = (p[1] + q[1]) / 2;
    d += i === 0 ? `M${mx.toFixed(1)} ${my.toFixed(1)}` : `Q${p[0].toFixed(1)} ${p[1].toFixed(1)} ${mx.toFixed(1)} ${my.toFixed(1)}`;
  });
  const p0 = pts[0];
  const p1 = pts[1];
  if (p0 && p1) d += `Q${p0[0].toFixed(1)} ${p0[1].toFixed(1)} ${((p0[0] + p1[0]) / 2).toFixed(1)} ${((p0[1] + p1[1]) / 2).toFixed(1)}`;
  return `${d}Z`;
}
