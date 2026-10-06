import { describe, expect, it } from "vitest";
import { ayanamsa } from "./ayanamsa";
import { boundaryFlag, boundaryNote, classifyUnder, nearestEdge } from "./boundary";
import { degInSignOf, NAK_SPAN, nakshatraFraction, nakshatraOf, padaIndexOf, signOf } from "./nakshatra";

describe("nakshatraOf (§6.6)", () => {
  it("Sun worked example: 329.4811° → Kumbha 29.4811°, Pūrva Bhādrapadā 3, lord Guru", () => {
    const n = nakshatraOf(329.4811);
    expect(signOf(329.4811)).toBe(10);
    expect(degInSignOf(329.4811)).toBeCloseTo(29.4811, 9);
    expect(n).toEqual({ index: 24, pada: 3, lord: "JU", name: "Pūrva Bhādrapadā" });
    expect(padaIndexOf(329.4811)).toBe(98);
    expect(boundaryFlag(329.4811)).toBeNull();
    expect(nearestEdge(329.4811).arcminutesTo).toBeCloseTo(31.134, 3); // 31′08″ to the Mīna cusp
  });

  it("boundary fixtures, half-open [a, b)", () => {
    expect(nakshatraOf(0)).toMatchObject({ index: 0, pada: 1, lord: "KE", name: "Aśvinī" });
    expect(nakshatraOf(13.3333 - 1e-9)).toMatchObject({ index: 0, pada: 4 });
    expect(nakshatraOf(NAK_SPAN - 1e-9)).toMatchObject({ index: 0, pada: 4 });
    expect(nakshatraOf(13.3334)).toMatchObject({ index: 1, pada: 1, lord: "VE", name: "Bharaṇī" });
    expect(nakshatraOf(359.9999)).toMatchObject({ index: 26, pada: 4, lord: "ME", name: "Revatī" });
    // Exact multiples land in the later interval.
    expect(nakshatraOf(40)).toMatchObject({ index: 3, pada: 1 });
    expect(nakshatraOf(120)).toMatchObject({ index: 9, pada: 1 });
    expect(nakshatraOf(10)).toMatchObject({ index: 0, pada: 4 });
    expect(signOf(30)).toBe(1);
    expect(signOf(29.999999)).toBe(0);
    expect(signOf(360)).toBe(0);
    expect(signOf(-0.5)).toBe(11);
  });

  it("NK-1: the 27 lords are Ke Ve Su Mo Ma Ra Ju Sa Me × 3", () => {
    const lords = Array.from({ length: 27 }, (_, i) => nakshatraOf(i * NAK_SPAN + 0.1).lord);
    const nine = ["KE", "VE", "SU", "MO", "MA", "RA", "JU", "SA", "ME"];
    expect(lords).toEqual([...nine, ...nine, ...nine]);
  });

  it("is total: every 0.1° gives an index in range and the fraction in [0, 1)", () => {
    for (let i = 0; i < 3600; i++) {
      const l = i / 10;
      const n = nakshatraOf(l);
      expect(n.index).toBeGreaterThanOrEqual(0);
      expect(n.index).toBeLessThanOrEqual(26);
      const f = nakshatraFraction(l);
      expect(f).toBeGreaterThanOrEqual(0);
      expect(f).toBeLessThan(1);
    }
  });
});

describe("boundaryFlag / boundaryNote", () => {
  it("213.3300° flags the Viśākhā/Anurādhā edge at 0′12″ and names the other side", () => {
    const f = boundaryFlag(213.33);
    expect(f?.kind).toBe("nakshatra");
    expect((f?.arcminutesTo ?? 0) * 60).toBeCloseTo(12, 6);
    expect(f?.otherSide).toBe("Anurādhā");
  });

  it("sign edges outrank nakshatra and pada edges; pada edges name nakshatra + pada", () => {
    expect(boundaryFlag(119.99)).toMatchObject({ kind: "sign", otherSide: "Siṃha" });
    expect(boundaryFlag(120.01)).toMatchObject({ kind: "sign", otherSide: "Karka" });
    expect(boundaryFlag(0.01)).toMatchObject({ kind: "sign", otherSide: "Mīna" });
    expect(boundaryFlag(359.99)).toMatchObject({ kind: "sign", otherSide: "Meṣa" });
    expect(boundaryFlag(3.34)).toMatchObject({ kind: "pada", otherSide: "Aśvinī 1" });
    expect(boundaryFlag(3.3)).toBeNull();
    expect(boundaryFlag(3.3333 + 2.01 / 60)).toBeNull();
  });

  it("synthetic 226.6383° is 1′42″ from the Anurādhā/Jyeṣṭhā edge; no preset flips it", () => {
    const jdTt = 2449425.580557;
    const trop = 226.6383 + ayanamsa(jdTt, "se-true");
    const note = boundaryNote(trop, jdTt, "se-true");
    expect(note?.distanceArcsec).toBeCloseTo(102, 0);
    expect(note?.kind).toBe("nakshatra");
    // The presets are ≤ 43″ apart, so 102″ cannot flip: the sentence stops at the distance.
    expect(note?.flips).toEqual([]);
    expect(note?.text).toBe("within 1′42″ of Anurādhā/Jyeṣṭhā");
  });

  it("a body 5″ inside Jyeṣṭhā under se-true reads Anurādhā under Drik", () => {
    const jdTt = 2449425.580557;
    const edge = 17 * NAK_SPAN;
    // 5″ above the edge under se-true (Jyeṣṭhā); Drik's larger ayanāṃśa (+9.3″) pulls it back to Anurādhā.
    const trop = edge + 5 / 3600 + ayanamsa(jdTt, "se-true");
    const note = boundaryNote(trop, jdTt, "se-true");
    expect(note?.here).toBe("Jyeṣṭhā");
    expect(note?.flips).toEqual([{ preset: "drik-mean", reads: "Anurādhā" }]);
    expect(note?.text).toBe("within 0′05″ of Anurādhā/Jyeṣṭhā; the Drik preset would read Anurādhā");
    expect(classifyUnder(trop, jdTt, "drik-mean").nakshatraName).toBe("Anurādhā");
    expect(classifyUnder(trop, jdTt, "se-true").nakshatraName).toBe("Jyeṣṭhā");
  });

  it("returns null beyond the 120″ footnote window", () => {
    expect(boundaryNote(329.4811 + 23.78, 2449425.58, "se-true")).toBeNull();
  });
});
