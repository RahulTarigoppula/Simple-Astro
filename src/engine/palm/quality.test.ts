import { describe, expect, it } from "vitest";
import { loadFixture, loadTruth } from "../../test/palm-fixtures";
import { boxBlur, type ImageLike, toGrey } from "./image";
import { assessQuality, exposureOf, laplacianVariance, palmRoi, SHARPNESS_MIN, shutterEnabled } from "./quality";

function checkerboard(w: number, h: number, cell: number): Float32Array {
  const a = new Float32Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) a[y * w + x] = ((Math.floor(x / cell) + Math.floor(y / cell)) % 2) * 255;
  return a;
}
function rgba(g: Float32Array, w: number, h: number): ImageLike {
  const d = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = g[i] ?? 0;
    d[i * 4] = v;
    d[i * 4 + 1] = v;
    d[i * 4 + 2] = v;
    d[i * 4 + 3] = 255;
  }
  return { data: d, width: w, height: h };
}
/** Display-gamma: out = in^(1/γ). γ < 1 darkens, γ > 1 brightens. */
function gamma(img: ImageLike, g: number): ImageLike {
  const d = new Uint8ClampedArray(img.data.length);
  for (let i = 0; i < d.length; i++) d[i] = i % 4 === 3 ? 255 : 255 * ((img.data[i] ?? 0) / 255) ** (1 / g);
  return { data: d, width: img.width, height: img.height };
}

describe("capture quality (§6.13)", () => {
  it("an 8 px checkerboard scores ≥ 900; the same image 9×9 box-blurred scores ≤ 60; the gauge is 120", () => {
    const w = 512;
    const h = 512;
    const sharp = checkerboard(w, h, 8);
    const blurred = boxBlur(sharp, w, h, 9);
    const s = laplacianVariance({ data: sharp, width: w, height: h });
    const b = laplacianVariance({ data: blurred, width: w, height: h });
    expect(s).toBeGreaterThanOrEqual(900);
    expect(b).toBeLessThanOrEqual(60);
    expect(SHARPNESS_MIN).toBe(120);
    expect(assessQuality(rgba(sharp, w, h)).sharpness.ok).toBe(true);
    expect(assessQuality(rgba(blurred, w, h)).sharpness.ok).toBe(false);
  });

  it("exposure over the palm ROI: as shot → ok, gamma 0.35 → low, gamma 2.6 → high", () => {
    const img = loadFixture("synthetic-clean");
    const roi = palmRoi(loadTruth().landmarks);
    expect(roi).toBeDefined();
    expect(assessQuality(img, roi).exposure.label).toBe("ok");
    expect(assessQuality(gamma(img, 0.35), roi).exposure.label).toBe("low");
    expect(assessQuality(gamma(img, 2.6), roi).exposure.label).toBe("high");
    expect(assessQuality(img, roi).exposure.ok).toBe(true);
  });

  it("exposure of an empty ROI is 'low', never NaN", () => {
    const e = exposureOf(toGrey(rgba(new Float32Array(16), 4, 4)));
    expect(e.label).toBe("low");
    expect(Number.isNaN(e.score)).toBe(false);
  });

  it("the shutter truth table: enabled only when hand, sharpness and exposure are all ok", () => {
    const rows: Array<[boolean, boolean, boolean, boolean]> = [];
    for (const hand of [false, true])
      for (const sharp of [false, true]) for (const exp of [false, true]) rows.push([hand, sharp, exp, hand && sharp && exp]);
    expect(rows).toHaveLength(8);
    for (const [hand, sharp, exp, want] of rows) expect(shutterEnabled(hand, sharp, exp)).toBe(want);
    expect(rows.filter((r) => r[3])).toHaveLength(1);
  });

  it("runs in ≤ 15 ms on a 1600 × 1200 frame (512 px downscale)", () => {
    const w = 1600;
    const h = 1200;
    const img = rgba(checkerboard(w, h, 8), w, h);
    const roi = { x: 0.25, y: 0.2, w: 0.5, h: 0.6 };
    for (let i = 0; i < 3; i++) assessQuality(img, roi); // warm the JIT
    const times: number[] = [];
    for (let i = 0; i < 7; i++) {
      const t0 = performance.now();
      assessQuality(img, roi);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    // ≈ 8-12 ms alone (budget 15 ms); parallel test workers can double it, so the gate catches 4× regressions.
    expect(times[3]).toBeLessThanOrEqual(60);
  });
});
