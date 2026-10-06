import { describe, expect, it } from "vitest";
import { loadTruth } from "../../test/palm-fixtures";
import type { Landmark } from "../types";
import { gateHand, isPalmFacing, LM, MIN_HANDEDNESS_SCORE, palmOrientation } from "./landmarks";

const truth = loadTruth();
const hand = (): Landmark[] => truth.landmarks.map((p) => ({ ...p }));
const mirror = (lm: Landmark[]): Landmark[] => lm.map((p) => ({ ...p, x: 1 - p.x }));

describe("landmark gating (§6.13 [1])", () => {
  it("accepts a palm-facing right hand with a confident score", () => {
    expect(gateHand(hand(), "right", 0.97)).toEqual({ ok: true });
  });

  it("rejects an uncertain hand (score 0.74 < 0.8)", () => {
    expect(MIN_HANDEDNESS_SCORE).toBe(0.8);
    expect(gateHand(hand(), "right", 0.74)).toEqual({ ok: false, reason: "uncertain-hand" });
    expect(gateHand(hand(), "right", 0.8)).toEqual({ ok: true });
    expect(gateHand(hand(), "right", Number.NaN)).toEqual({ ok: false, reason: "uncertain-hand" });
  });

  it("rejects a landmark off the frame (y = 1.02)", () => {
    const lm = hand();
    const tip = lm[LM.MIDDLE_TIP];
    if (!tip) throw new Error("fixture");
    tip.y = 1.02;
    expect(gateHand(lm, "right", 0.97)).toEqual({ ok: false, reason: "landmark-off-frame" });
  });

  it("rejects the back of the hand (a dorsal view mirrors the palm geometry)", () => {
    const dorsal = mirror(hand());
    expect(gateHand(dorsal, "right", 0.97)).toEqual({ ok: false, reason: "palm-not-facing" });
    // …and the same geometry is a palm when the classifier says it is a left hand
    expect(gateHand(dorsal, "left", 0.97)).toEqual({ ok: true });
  });

  it("upright, the test is exactly THUMB_CMC.x < PINKY_MCP.x for a right palm (mirrored for a left)", () => {
    const lm = hand();
    const t = lm[LM.THUMB_CMC];
    const p = lm[LM.PINKY_MCP];
    if (!t || !p) throw new Error("fixture");
    expect(t.x < p.x).toBe(isPalmFacing(lm, "right"));
    expect(isPalmFacing(mirror(lm), "left")).toBe(true);
  });

  it("is rotation-proof: a palm turned upside down is still a palm", () => {
    const upside = hand().map((p) => ({ ...p, x: 1 - p.x, y: 1 - p.y }));
    expect(isPalmFacing(upside, "right")).toBe(true);
  });

  it("a degenerate hand (identical points) is 'degenerate', never NaN", () => {
    const same = Array.from({ length: 21 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
    const r = gateHand(same, "right", 0.99);
    expect(r).toEqual({ ok: false, reason: "degenerate" });
    expect(Number.isNaN(palmOrientation(same))).toBe(false);
    expect(gateHand([], "right", 0.99)).toEqual({ ok: false, reason: "degenerate" });
    const nan = hand();
    const w = nan[0];
    if (w) w.x = Number.NaN;
    expect(gateHand(nan, "right", 0.99)).toEqual({ ok: false, reason: "degenerate" });
  });
});
