// Second, cheap Aṣṭakūṭa witness: @ishubhamx/panchangam-js (MIT, devDependency, Node-only — imported
// only here). It follows a different school for Varṇa, Vaśya, Yoni and Gaṇa, so only the kootas where
// the classical rule is unambiguous are compared. Its Tārā is the classical one (3 when both counts
// are kind), which is the independent evidence for not following PyJHora's inverted Tārā column.
import {
  calculateBhakoot,
  calculateGrahaMaitri,
  calculateNadi,
  calculateTara,
} from "@ishubhamx/panchangam-js/dist/matching/kootas";
import { describe, expect, it } from "vitest";
import { signLord } from "../chart-helpers";
import { kootas, type MoonPlacement, signOfPada } from "../ashtakoota";

const firstPadaOf = (nak: number): MoonPlacement => ({ nak, pada: 1, sign: signOfPada(nak, 1) });
/** The first pada of a sign: pada index sign × 9. */
const moonInSign = (sign: number): MoonPlacement => {
  const idx = sign * 9;
  const nak = Math.floor(idx / 4);
  const pada = ((idx % 4) + 1) as 1 | 2 | 3 | 4;
  return { nak, pada, sign: signOfPada(nak, pada) };
};

const score = (a: MoonPlacement, b: MoonPlacement, id: string): number =>
  kootas(a, b).find((k) => k.id === id)?.score ?? Number.NaN;

describe("Aṣṭakūṭa vs panchangam-js (classical kootas only)", () => {
  it("Tārā agrees on all 27 × 27 nakshatra pairs", () => {
    for (let a = 0; a < 27; a++) {
      for (let b = 0; b < 27; b++) {
        expect(score(firstPadaOf(a), firstPadaOf(b), "tara"), `${a}×${b}`).toBe(calculateTara(a, b).score);
      }
    }
  });

  it("Graha Maitrī agrees on all 12 × 12 sign pairs", () => {
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        expect(score(moonInSign(a), moonInSign(b), "maitri"), `${a}×${b}`).toBe(calculateGrahaMaitri(a, b).score);
      }
    }
  });

  it("Bhakūṭa agrees wherever the two sign lords differ (it applies the same-lord exception by default)", () => {
    for (let a = 0; a < 12; a++) {
      for (let b = 0; b < 12; b++) {
        if (signLord(moonInSign(a).sign) === signLord(moonInSign(b).sign)) continue;
        expect(score(moonInSign(a), moonInSign(b), "bhakoot"), `${a}×${b}`).toBe(calculateBhakoot(a, b).score);
      }
    }
  });

  it("Nāḍī agrees on all nakshatra pairs in different signs (no exception applied)", () => {
    for (let a = 0; a < 27; a++) {
      for (let b = 0; b < 27; b++) {
        const ma = firstPadaOf(a);
        const mb = firstPadaOf(b);
        if (ma.sign === mb.sign) continue;
        expect(score(ma, mb, "nadi"), `${a}×${b}`).toBe(calculateNadi(a, b, ma.sign, mb.sign).score);
      }
    }
  });
});
