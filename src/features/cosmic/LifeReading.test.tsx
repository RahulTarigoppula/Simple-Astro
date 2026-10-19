import { describe, expect, it } from "vitest";
import { MOON_TRAITS, NAK_TRAITS, NUMBER_TRAITS } from "../../data/traits";
import { reconcile } from "./LifeReading";

describe("plus and minus points on the simple card", () => {
  it("never shows a word and its opposite on the same card", () => {
    expect(reconcile(["Patient and dependable"], ["Impatient"]).minus).toEqual([]);
    expect(reconcile(["Bold"], ["Timid at first"]).minus).toEqual([]);
    expect(reconcile(["Bold", "Timid"], []).plus).toEqual(["Bold"]);
    expect(reconcile(["Generous"], ["Stubborn"]).minus).toEqual(["Stubborn"]);
  });
  it("holds for every Moon sign, birth star and number", () => {
    const pairs: Array<[string, string]> = [
      ["patient", "impatient"],
      ["calm", "restless"],
      ["steady", "changeable"],
      ["cautious", "impulsive"],
      ["careful", "careless"],
      ["generous", "stingy"],
      ["bold", "timid"],
      ["sociable", "withdrawn"],
      ["decisive", "indecisive"],
      ["practical", "dreamy"],
    ];
    const stem = (s: string) => s.toLowerCase();
    for (const moon of MOON_TRAITS) {
      for (const nak of NAK_TRAITS) {
        for (let n = 1; n <= 9; n++) {
          const root = NUMBER_TRAITS[n];
          const r = reconcile([...moon.plus, ...nak.plus, ...(root?.plus ?? [])], [...moon.minus, ...nak.minus, ...(root?.minus ?? [])]);
          for (const p of r.plus) {
            for (const m of r.minus) {
              const clash = pairs.some(
                ([x, y]) => (stem(p).includes(x) && stem(m).includes(y)) || (stem(p).includes(y) && stem(m).includes(x)),
              );
              expect(clash, `${p} vs ${m}`).toBe(false);
            }
          }
        }
      }
    }
  });
});
