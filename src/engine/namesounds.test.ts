import { describe, expect, it } from "vitest";
import { NAME_SOUNDS, nameSounds } from "./namesounds";

describe("name sounds (nāmākṣara)", () => {
  it("has four sounds for each of the 27 birth stars", () => {
    expect(NAME_SOUNDS).toHaveLength(27);
    for (const row of NAME_SOUNDS) {
      expect(row).toHaveLength(4);
      for (const s of row) expect(s).toMatch(/^[A-Z][a-z]{0,3}$/);
    }
  });
  it("gives the well-known sounds", () => {
    expect(nameSounds(0, 1).own).toBe("Chu"); // Aśvinī 1
    expect(nameSounds(3, 2).own).toBe("Va"); // Rohiṇī 2
    expect(nameSounds(9, 1).all).toEqual(["Ma", "Mi", "Mu", "Me"]); // Maghā
    expect(nameSounds(26, 4).own).toBe("Chi"); // Revatī 4
  });
  it("wraps out-of-range star numbers instead of failing", () => {
    expect(nameSounds(27, 1).own).toBe("Chu");
    expect(nameSounds(-1, 1).own).toBe("De");
  });
});
