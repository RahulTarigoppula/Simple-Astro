import { describe, expect, it } from "vitest";
import { CHAPTER_PLAIN, MOON_TRAITS, NAK_TRAITS, NUMBER_TRAITS } from "./traits";

describe("plain traits", () => {
  it("covers every sign, star, number and chapter", () => {
    expect(MOON_TRAITS).toHaveLength(12);
    expect(NAK_TRAITS).toHaveLength(27);
    for (let n = 1; n <= 9; n++) expect(NUMBER_TRAITS[n]?.plus.length).toBeGreaterThan(0);
    expect(Object.keys(CHAPTER_PLAIN)).toHaveLength(9);
  });
  it("every entry has both a plus and a minus, and no dashes", () => {
    const all = [...MOON_TRAITS, ...NAK_TRAITS, ...Object.values(NUMBER_TRAITS)];
    for (const t of all) {
      expect(t.plus.length).toBeGreaterThan(0);
      expect(t.minus.length).toBeGreaterThan(0);
    }
    expect(JSON.stringify({ MOON_TRAITS, NAK_TRAITS, NUMBER_TRAITS, CHAPTER_PLAIN })).not.toMatch(/[—–]/);
  });
});
