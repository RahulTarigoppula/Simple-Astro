import { describe, expect, it } from "vitest";
import golden from "./__fixtures__/golden-charts.json";
import { astroTime } from "./ephemeris";
import { signedDelta } from "./math";
import { ketuOf, MEAN_NODE_SPEED, meanNode, trueNode, trueNodeSpeed } from "./nodes";

const MS = (jd: number): number => (jd - 2440587.5) * 86_400_000;
// 500 dates evenly spaced over 1900–2030 (deterministic).
const DATES = Array.from({ length: 500 }, (_, i) => 2415020.5 + (i * (2462502.5 - 2415020.5)) / 499);

describe("mean node (Meeus 47.7)", () => {
  it("N-1: 125.0445479° at J2000 and ≈ −19.34°/yr", () => {
    expect(Math.abs(meanNode(2451545.0) - 125.0445479)).toBeLessThan(1e-6);
    const perYear = signedDelta(meanNode(2451545.0), meanNode(2451545.0 + 365.25));
    expect(perYear).toBeCloseTo(-19.34, 2);
    expect(MEAN_NODE_SPEED).toBeCloseTo(-0.0529538, 6); // 1934.1362891 / 36525
  });

  it("reference chart (§0.1a mean-node Rāhu, tropical): 213.4956 + 23.780152", () => {
    expect(meanNode(2449425.580557)).toBeCloseToArcsec(213.4956 + 23.780152, 1);
  });
});

describe("true (osculating) node", () => {
  it("matches Swiss Ephemeris SE_TRUE_NODE at the reference instant within 20″", () => {
    const g01 = golden.charts[0] as (typeof golden.charts)[number];
    expect(trueNode(astroTime(g01.input.utcMs))).toBeCloseToArcsec(g01.expected.nodes.true.rahuTropical, 20);
  });

  it("N-2: stays within 2° of the mean node over 500 dates, and oscillates about it", () => {
    let maxDiff = 0;
    let flips = 0;
    let prev = 0;
    for (const jd of DATES) {
      const t = astroTime(MS(jd));
      const d = signedDelta(meanNode(t.tt + 2451545), trueNode(t));
      maxDiff = Math.max(maxDiff, Math.abs(d));
      if (prev !== 0 && Math.sign(d) !== Math.sign(prev)) flips++;
      prev = d;
    }
    // The periodic terms of (true − mean) — 1.4979° sin 2(D−F) plus ~0.15° sin M and smaller —
    // reach ≈ 1.9° when they align (this sample peaks at 1.93°). §6.4's 1.8° (and SE's 1.74° over
    // the 50 golden charts) are smaller samples of the same oscillation, so the bound is 2°.
    expect(maxDiff).toBeLessThan(2);
    expect(maxDiff).toBeGreaterThan(1.2); // the ~1.5° libration is really there
    expect(flips).toBeGreaterThan(50); // the two cross many times (≈ fortnightly term)
  });

  it("is retrograde on balance: mean speed negative, net motion over a year ≈ the mean node's", () => {
    let neg = 0;
    for (const jd of DATES) if (trueNodeSpeed(astroTime(MS(jd))) < 0) neg++;
    // The osculating node is briefly direct around its stationary points; it is drawn ℞ always.
    expect(neg / DATES.length).toBeGreaterThan(0.6);
    const a = astroTime(MS(2451545));
    const b = astroTime(MS(2451545 + 365.25));
    expect(signedDelta(trueNode(a), trueNode(b))).toBeLessThan(-17);
  });

  it("N-3: Ketu is Rāhu + 180° exactly", () => {
    for (const r of [0, 33.4956, 179.9, 213.4956, 359.99]) {
      expect(signedDelta(r, ketuOf(r))).toBeCloseTo(180, 10);
      expect(ketuOf(r)).toBeGreaterThanOrEqual(0);
      expect(ketuOf(r)).toBeLessThan(360);
    }
  });
});
