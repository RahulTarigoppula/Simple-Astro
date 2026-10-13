import { describe, expect, it } from "vitest";
import { birthNumbers, digitalRoot, NUMBER_PLANET, STORY } from "./story";

describe("story deck", () => {
  it("has unique card ids and every card has a body", () => {
    const ids = STORY.flatMap((c) => c.cards.map((k) => k.id));
    expect(new Set(ids).size).toBe(ids.length);
    for (const c of STORY.flatMap((ch) => ch.cards)) expect(c.body.length, c.id).toBeGreaterThan(0);
  });
  it("reduces numbers to one digit the numerologist's way", () => {
    expect(digitalRoot(0)).toBe(0);
    expect(digitalRoot(9)).toBe(9);
    expect(digitalRoot(14)).toBe(5);
    expect(digitalRoot(29)).toBe(2);
    // 14 Mar 1994: 1+9+9+4+3+1+4 = 31 -> 4
    expect(birthNumbers(1994, 3, 14)).toEqual({ root: 5, destiny: 4 });
    for (let n = 1; n <= 9; n++) expect(NUMBER_PLANET[n]).toBeDefined();
  });
});
