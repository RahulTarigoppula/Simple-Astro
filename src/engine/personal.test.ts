import { describe, expect, it } from "vitest";
import { computePatri, REFERENCE_PROFILE } from "./patri";
import { AREAS, dayGuide, personalReading } from "./personal";
import { DEFAULT_PRESET } from "./types";

const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
const AT = Date.UTC(2026, 9, 13, 6);

describe("personal reading", () => {
  const r = personalReading(patri, AT, DEFAULT_PRESET);
  it("scores every life area between -1 and 1 with a reason", () => {
    expect(r.areas.map((a) => a.id)).toEqual(AREAS.map((a) => a.id));
    for (const a of r.areas) {
      expect(a.score).toBeGreaterThanOrEqual(-1);
      expect(a.score).toBeLessThanOrEqual(1);
      expect(a.why.length).toBeGreaterThan(10);
    }
  });
  it("reads aṣṭakavarga bindus for the transits (0..8)", () => {
    expect(r.strength).toHaveLength(6);
    for (const s of r.strength) expect(s.bindus).toBeGreaterThanOrEqual(0);
    for (const s of r.strength) expect(s.bindus).toBeLessThanOrEqual(8);
  });
  it("finds Saturn near the natal Moon in 2026 for the reference chart (Moon early Mīna)", () => {
    const sa = r.contacts.find((c) => c.transit === "SA" && c.natal === "MO");
    expect(sa).toBeDefined();
    expect(sa?.text).toMatch(/Saturn is crossing your birth Moon/);
  });
  it("gives benefic horās outside Rāhu Kāla, the weekday colour, and do / go-easy lists", () => {
    const g = dayGuide(patri, AT, { lat: 12.97, lon: 77.59 }, DEFAULT_PRESET, r.areas);
    expect(g.lord).toBe("MA"); // Tuesday
    expect(g.colour).toBe("red");
    for (const h of g.bestHours) expect(h.endMs <= g.avoid[0] || h.startMs >= g.avoid[1]).toBe(true);
    expect(g.goodFor).toHaveLength(2);
    expect(g.easyOn).toHaveLength(2);
  });
});
