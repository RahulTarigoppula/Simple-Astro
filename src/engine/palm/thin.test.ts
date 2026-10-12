import { describe, expect, it } from "vitest";
import { zhangSuen, zhangSuenStats } from "./thin";

const count = (m: Uint8Array): number => m.reduce((s, v) => s + v, 0);

function ends(m: Uint8Array, w: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (let i = 0; i < m.length; i++) {
    if (!m[i]) continue;
    const x = i % w;
    const y = (i - x) / w;
    let n = 0;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && m[(y + dy) * w + x + dx]) n++;
    if (n === 1) out.push([x, y]);
  }
  return out;
}

describe("Zhang–Suen thinning (§6.13 [6])", () => {
  it("a 9 px straight stroke thins to a 1 px skeleton with the same endpoints ±1 px", () => {
    const w = 120;
    const h = 40;
    const m = new Uint8Array(w * h);
    for (let y = 16; y < 25; y++) for (let x = 10; x < 110; x++) m[y * w + x] = 1;
    const s = zhangSuen(m, w, h);
    // one pixel per column across the stroke's interior
    for (let x = 16; x < 104; x++) {
      let n = 0;
      for (let y = 0; y < h; y++) n += s[y * w + x] ?? 0;
      expect(n, `column ${x}`).toBe(1);
    }
    const e = ends(s, w).sort((a, b) => a[0] - b[0]);
    expect(e).toHaveLength(2);
    const [left, right] = e;
    if (!left || !right) throw new Error("ends");
    // Zhang–Suen erodes a thick stroke's ends by about half its width: the skeleton's endpoints
    // sit at the stroke's ends measured from its centre-line caps (x = 10 + 4, x = 109 − 4).
    expect(Math.abs(left[0] - 14)).toBeLessThanOrEqual(1);
    expect(Math.abs(right[0] - 105)).toBeLessThanOrEqual(1);
    expect(Math.abs(left[1] - 20)).toBeLessThanOrEqual(1);
  });

  it("a 1 px stroke keeps its endpoints exactly", () => {
    const w = 60;
    const h = 20;
    const m = new Uint8Array(w * h);
    for (let x = 5; x < 55; x++) m[10 * w + x] = 1;
    const s = zhangSuen(m, w, h);
    expect(count(s)).toBe(50);
    expect(ends(s, w)).toEqual([
      [5, 10],
      [54, 10],
    ]);
  });

  it("a filled disc thins to a single pixel", () => {
    const w = 64;
    const h = 64;
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if ((x - 32) ** 2 + (y - 32) ** 2 <= 20 ** 2) m[y * w + x] = 1;
    expect(count(zhangSuen(m, w, h))).toBe(1);
  });

  it("is idempotent", () => {
    const w = 80;
    const h = 80;
    const m = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (Math.abs(y - 40 - 15 * Math.sin(x / 9)) < 4) m[y * w + x] = 1;
    const once = Uint8Array.from(zhangSuen(m, w, h));
    const twice = zhangSuen(Uint8Array.from(once), w, h);
    expect(Array.from(twice)).toEqual(Array.from(once));
  });

  it("terminates in ≤ 40 iterations on a 512 × 512 mask", () => {
    const w = 512;
    const h = 512;
    const m = new Uint8Array(w * h);
    // thick bands and blobs — the worst a hysteresis mask could plausibly be
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) if ((x * 7 + y * 3) % 97 < 30 || (x - 256) ** 2 + (y - 256) ** 2 < 40 ** 2) m[y * w + x] = 1;
    const { iterations } = zhangSuenStats(m, w, h);
    expect(iterations).toBeLessThanOrEqual(40);
    expect(iterations).toBeGreaterThan(1);
  });
});
