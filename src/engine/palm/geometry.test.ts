import { describe, expect, it } from "vitest";
import citations from "../../data/citations.json";
import { loadTruth } from "../../test/palm-fixtures";
import type { Landmark } from "../types";
import { elementOf, handGeometry, LONG_FINGERS_MIN, SQUARE_MIN } from "./geometry";
import { LM } from "./landmarks";

const known = new Set(citations.entries.map((e) => `${e.text}|${e.ref}`));

/**
 * World landmarks with chosen W/L and F/L: wrist at the origin, palm length 0.09 m along −y.
 */
function worldWith(wl: number, fl: number): Landmark[] {
  const L = 0.09;
  const W = wl * L;
  const F = fl * L;
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  const set = (i: number, x: number, y: number): void => {
    lm[i] = { x, y, z: 0 };
  };
  set(LM.WRIST, 0, 0);
  set(LM.MIDDLE_MCP, 0, -L);
  set(LM.MIDDLE_TIP, 0, -L - F);
  set(LM.INDEX_MCP, -W / 2, -L);
  set(LM.PINKY_MCP, W / 2, -L);
  set(LM.INDEX_TIP, -W / 2, -L - 0.07);
  set(LM.RING_MCP, W / 4, -L);
  set(LM.RING_TIP, W / 4, -L - 0.072);
  set(LM.THUMB_MCP, -W / 2 - 0.01, -0.03);
  set(LM.THUMB_TIP, -W / 2 - 0.04, -0.06);
  return lm;
}

describe("hand shape and ratios (§6.13 [2])", () => {
  it.each([
    [0.84, 0.71, "fire"],
    [0.94, 0.7, "earth"],
    [0.94, 0.86, "air"],
    [0.84, 0.86, "water"],
    [0.9, 0.8, "air"], // exactly on both thresholds: >= — a `>` implementation fails this row
  ] as const)("W/L %s + F/L %s → %s", (wl, fl, el) => {
    expect(elementOf(wl, fl)).toBe(el);
    const g = handGeometry(worldWith(wl, fl));
    expect(g?.element).toBe(el);
  });

  it("thresholds are the documented ones", () => {
    expect(SQUARE_MIN).toBe(0.9);
    expect(LONG_FINGERS_MIN).toBe(0.8);
  });

  it("is scale-invariant: every coordinate × 1.7 leaves the element and ratios unchanged", () => {
    const w = loadTruth().worldLandmarks;
    const a = handGeometry(w);
    const b = handGeometry(w.map((p) => ({ x: p.x * 1.7, y: p.y * 1.7, z: p.z * 1.7 })));
    expect(a).not.toBeNull();
    expect(b?.element).toBe(a?.element);
    for (const k of ["widthOverLength", "fingerOverPalm", "indexOverRing", "thumbAngleDeg"] as const) {
      expect(b?.ratios[k]).toBeCloseTo(a?.ratios[k] ?? Number.NaN, 9);
    }
  });

  it("every ratio returns a number, a band label and a resolvable citation", () => {
    const g = handGeometry(loadTruth().worldLandmarks);
    if (!g) throw new Error("geometry");
    for (const m of Object.values(g.measures)) {
      expect(Number.isFinite(m.value)).toBe(true);
      expect(m.band.length).toBeGreaterThan(3);
      expect(known.has(`${m.citation.text}|${m.citation.ref}`)).toBe(true);
    }
    // the synthetic hand: oblong palm, short fingers → fire
    expect(g.element).toBe("fire");
  });

  it("a degenerate hand returns null, never NaN", () => {
    expect(handGeometry(Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 })))).toBeNull();
    expect(handGeometry([])).toBeNull();
  });
});
