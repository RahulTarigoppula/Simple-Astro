import { describe, expect, it } from "vitest";
import { bondReading } from "./bond";
import type { KootaResult, ManglikStatus, MilanResult } from "./types";

const cite = { source: "test", ref: "t" } as unknown as KootaResult["citation"];
const k = (id: KootaResult["id"], max: KootaResult["max"], score: number, dosha = false): KootaResult => ({
  id,
  name: id,
  nameDev: id,
  max,
  score,
  dosha,
  because: "",
  citation: cite,
});
const none: ManglikStatus = { present: false, from: [], cancellations: [], citation: cite as ManglikStatus["citation"] };
const result = (scores: number[], over: Partial<MilanResult> = {}): MilanResult => {
  const ids: Array<[KootaResult["id"], KootaResult["max"]]> = [
    ["varna", 1],
    ["vashya", 2],
    ["tara", 3],
    ["yoni", 4],
    ["maitri", 5],
    ["gana", 6],
    ["bhakoot", 7],
    ["nadi", 8],
  ];
  const kootas = ids.map(([id, max], i) => k(id, max, scores[i] ?? 0, (id === "nadi" || id === "bhakoot") && (scores[i] ?? 0) === 0));
  const total = kootas.reduce((t, x) => t + x.score, 0);
  return {
    a: "a",
    b: "b",
    presetHash: "",
    kootas,
    total,
    band: total >= 33 ? "excellent" : total >= 25 ? "very-good" : total >= 18 ? "acceptable" : "not-recommended",
    manglik: { a: none, b: none },
    ...over,
  };
};

describe("bondReading", () => {
  it("counts every point once: a full match is 100 everywhere", () => {
    const b = bondReading(result([1, 2, 3, 4, 5, 6, 7, 8]), "A", "B");
    expect(b.score).toBe(100);
    expect(b.parts.map((p) => p.score)).toEqual([100, 100, 100, 100, 100]);
    expect(b.headline).toBe("A rare match");
    expect(b.workOn).toHaveLength(0);
  });
  it("a standing doṣa caps its part below good and lands in Work on", () => {
    const b = bondReading(result([1, 2, 3, 4, 5, 6, 7, 0]), "A", "B");
    const fam = b.parts.find((p) => p.id === "family");
    expect(fam?.score).toBe(0);
    expect(b.workOn.map((p) => p.id)).toContain("family");
    expect(b.score).toBe(Math.round((28 / 36) * 100));
  });
  it("one-sided Manglik is called out by name", () => {
    const b = bondReading(result([1, 2, 3, 4, 5, 6, 7, 8], { manglik: { a: { ...none, present: true }, b: none } }), "Asha", "Ravi");
    expect(b.manglik).toMatch(/^Asha is Manglik and Ravi is not/);
  });
  it("speaks without dashes", () => {
    const b = bondReading(result([0, 0, 0, 0, 0, 0, 0, 0]), "A", "B");
    expect(JSON.stringify(b)).not.toMatch(/[—–]/);
  });
});
