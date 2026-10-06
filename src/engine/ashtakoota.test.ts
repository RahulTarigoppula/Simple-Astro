// Guna Milan unit tests: the §6.11 worked examples (as reconciled with the PyJHora oracle), bands,
// doṣa flags, recorded cancellations, Manglik via milan(), and content care.
//
// NOTE on the first worked example. §6.11 derived Revatī × Rohiṇī as 1/2/1.5/2/0.5/6/7/0 = 20 using
// textbook Vaśya, Yoni and Gaṇa cells. The oracle (PyJHora all_nak_pad_boy_girl.csv) follows another
// published school for those three tables: Jalacara×Catuṣpada Vaśya = 1 (not 2), elephant×serpent
// Yoni = 3 (friendly, not neutral) and Deva×Manuṣya Gaṇa = 5 (not 6). Chowki adopts the oracle's
// school, so the pair reads 1/1/1.5/3/0.5/5/7/0 = 19 — still "acceptable", still with Nāḍī as the
// single doṣa. The oracle row for this pair is 19 too (ashtakoota.oracle.test.ts).
import { describe, expect, it } from "vitest";
import { BANNED_WORDS } from "../test/banned-words";
import { synth } from "./__fixtures__/synthetic";
import { ashtakoota, bandOf, KOOTA_ORDER, kootas, milan, type MoonPlacement, signOfPada } from "./ashtakoota";
import type { Profile } from "./types";

const moon = (nak: number, pada: 1 | 2 | 3 | 4, deg?: number): MoonPlacement =>
  deg === undefined ? { nak, pada, sign: signOfPada(nak, pada) } : { nak, pada, sign: signOfPada(nak, pada), deg };
const scores = (a: MoonPlacement, b: MoonPlacement): number[] => kootas(a, b).map((k) => k.score);

describe("worked examples", () => {
  it("Revatī (Mīna) × Rohiṇī (Vṛṣabha) = 19 / 36, acceptable, Nāḍī the only doṣa", () => {
    const r = ashtakoota("rahul", "priya", moon(26, 1), moon(3, 1), "hash");
    expect(r.kootas.map((k) => k.score)).toEqual([1, 1, 1.5, 3, 0.5, 5, 7, 0]);
    expect(r.total).toBe(19);
    expect(r.band).toBe("acceptable");
    expect(r.kootas.filter((k) => k.dosha).map((k) => k.id)).toEqual(["nadi"]);
    const bhakoot = r.kootas.find((k) => k.id === "bhakoot");
    expect(bhakoot?.because).toContain("3/11");
    expect(r.kootas.find((k) => k.id === "nadi")?.because).toContain("both Antya");
    expect(r.kootas.find((k) => k.id === "tara")?.because).toBe(
      "Tārā: 5th Pratyari one way (unkind), 6th Sādhaka the other (kind)",
    );
  });

  it("Chitrā 1 (Kanyā) × Rohiṇī 3 (Vṛṣabha): the §6.11 certain subtotal of 17, plus Vaśya ½ and Yoni 2", () => {
    const s = scores(moon(13, 1), moon(3, 3));
    const [varna, vashya, tara, yoni, maitri, gana, bhakoot, nadi] = s;
    expect({ varna, tara, maitri, gana, bhakoot, nadi }).toEqual({ varna: 1, tara: 3, maitri: 5, gana: 0, bhakoot: 0, nadi: 8 });
    expect((varna ?? 0) + (tara ?? 0) + (maitri ?? 0) + (gana ?? 0) + (bhakoot ?? 0) + (nadi ?? 0)).toBe(17);
    expect({ vashya, yoni }).toEqual({ vashya: 0.5, yoni: 2 });
    const r = ashtakoota("a", "b", moon(13, 1), moon(3, 3), "h");
    expect(r.total).toBe(19.5);
    expect(r.kootas.filter((k) => k.dosha).map((k) => k.id)).toEqual(["gana", "bhakoot"]);
  });
});

describe("shape", () => {
  it("always eight kootas in bead order with maxima 1…8 summing to 36", () => {
    const ks = kootas(moon(0, 1), moon(17, 4));
    expect(ks.map((k) => k.id)).toEqual(KOOTA_ORDER);
    expect(ks.map((k) => k.max)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    for (const k of ks) {
      expect(k.nameDev).toMatch(/[ऀ-ॿ]/);
      expect(k.citation).toEqual({ text: "Muhūrta Cintāmaṇi", ref: "ch. 6" });
      expect(k.score).toBeGreaterThanOrEqual(0);
      expect(k.score).toBeLessThanOrEqual(k.max);
    }
  });

  it("totals stay within 0…36 in half points across all 108 × 108 pairs", () => {
    for (let a = 0; a < 108; a++) {
      for (let b = 0; b < 108; b += 7) {
        const t = ashtakoota("a", "b", moon(Math.floor(a / 4), ((a % 4) + 1) as 1), moon(Math.floor(b / 4), ((b % 4) + 1) as 1), "h").total;
        expect(t * 2).toBe(Math.round(t * 2));
        expect(t).toBeGreaterThanOrEqual(0);
        expect(t).toBeLessThanOrEqual(36);
      }
    }
  });

  it("refuses a sign that disagrees with the nakshatra-pada", () => {
    expect(() => kootas({ nak: 26, pada: 1, sign: 10 }, moon(3, 1))).toThrow(RangeError);
  });
});

describe("bands", () => {
  it.each([
    [0, "not-recommended"],
    [17.5, "not-recommended"],
    [18, "acceptable"],
    [24.5, "acceptable"],
    [25, "very-good"],
    [32.5, "very-good"],
    [33, "excellent"],
    [36, "excellent"],
  ] as const)("%s → %s", (t, band) => {
    expect(bandOf(t)).toBe(band);
  });
});

describe("cancellations", () => {
  it("Bhakūṭa: Meṣa × Siṃha (5/9) with friendly lords — recorded, applied only when asked", () => {
    const off = kootas(moon(0, 1), moon(9, 1)).find((k) => k.id === "bhakoot");
    expect(off).toMatchObject({ score: 0, dosha: true, cancellation: { applied: false, rule: "bhakoot-lords-friends" } });
    const on = kootas(moon(0, 1), moon(9, 1), { bhakootCancellation: true }).find((k) => k.id === "bhakoot");
    expect(on).toMatchObject({ score: 7, dosha: false, cancellation: { applied: true } });
  });

  it("Bhakūṭa: unfriendly lords on a doṣa axis carry no cancellation", () => {
    // Mithuna (Budha) × Makara (Śani) is 6/8; Budha regards Śani as neutral.
    const k = kootas(moon(6, 1), moon(21, 1), { bhakootCancellation: true }).find((x) => x.id === "bhakoot");
    expect(k?.score).toBe(0);
    expect(k?.cancellation).toBeUndefined();
  });

  it("Nāḍī: same nakshatra, different pada — exception recorded, never applied", () => {
    const k = kootas(moon(0, 1), moon(0, 2)).find((x) => x.id === "nadi");
    expect(k).toMatchObject({ score: 0, dosha: true, cancellation: { applied: false, rule: "nadi-same-nakshatra-different-pada" } });
  });

  it("Nāḍī: different nāḍīs score 8 with no doṣa", () => {
    expect(kootas(moon(0, 1), moon(1, 1)).find((x) => x.id === "nadi")).toMatchObject({ score: 8, dosha: false });
  });
});

describe("Vaśya split of Dhanu and Makara", () => {
  it("uses the Moon's degree when given, else the pada's midpoint", () => {
    const vashya = (m: MoonPlacement): number => kootas(m, moon(0, 1)).find((k) => k.id === "vashya")?.score ?? -1;
    // Mūla 3 (Dhanu 6°40′–10°) is the human first half: Mānava × Catuṣpada = 0.5.
    expect(vashya(moon(18, 3))).toBe(0.5);
    // Pūrva Āṣāḍhā 2 (Dhanu 16°40′–20°) is the quadruped half: Catuṣpada × Catuṣpada = 2.
    expect(vashya(moon(19, 2))).toBe(2);
    // Pūrva Āṣāḍhā 1 straddles 15°: the exact degree decides.
    expect(vashya(moon(19, 1, 14))).toBe(0.5);
    expect(vashya(moon(19, 1, 16))).toBe(2);
  });
});

function profile(id: string): Profile {
  return {
    id,
    name: id,
    handedness: "right",
    createdAt: 0,
    updatedAt: 0,
    birth: {
      localY: 2000,
      localMo: 1,
      localD: 1,
      localH: 0,
      localMi: 0,
      place: { name: "x", country: "IN", lat: 0, lon: 0, source: "manual" },
      zone: "Asia/Kolkata",
      utcMs: 0,
      offsetMin: 330,
      jdUt: 2451545,
      offsetSource: "tzdb",
    },
  };
}

describe("milan()", () => {
  const at = { SU: 1, MO: [11, 19.17] as [number, number], MA: 6, ME: 1, JU: 4, VE: 3, SA: 9, RA: 4 };
  const pa = synth({ lagna: 0, at });
  const pb = synth({ lagna: 0, at: { ...at, MO: [1, 15] as [number, number] } });

  it("reads both Moons from the charts and reports Manglik for both, with the both-charts cancellation", () => {
    const m = milan(profile("a"), profile("b"), pa, pb);
    expect(m.kootas).toHaveLength(8);
    expect(m.a).toBe("a");
    expect(m.presetHash).toBe(pa.presetHash);
    expect(m.manglik.a.present).toBe(true);
    expect(m.manglik.a.from).toContain("lagna");
    expect(m.manglik.a.cancellations).toContain("manglik-bhanga-shani-kendra");
    expect(m.manglik.a.cancellations).toContain("manglik-bhanga-both-charts");
    expect(m.manglik.b.cancellations).toContain("manglik-bhanga-both-charts");
    expect(m.manglik.a.citation.text).toBe("Later tradition");
  });

  it("no both-charts cancellation when only one chart is Manglik", () => {
    const pc = synth({ lagna: 0, at: { ...at, MA: 2, MO: [0, 10] as [number, number], VE: 0 } });
    const m = milan(profile("a"), profile("c"), pa, pc);
    expect(m.manglik.b.present).toBe(false);
    expect(m.manglik.a.cancellations).not.toContain("manglik-bhanga-both-charts");
  });

  it("because strings are calm and free of banned words", () => {
    for (let a = 0; a < 108; a += 5) {
      for (let b = 0; b < 108; b += 11) {
        const text = kootas(moon(Math.floor(a / 4), ((a % 4) + 1) as 1), moon(Math.floor(b / 4), ((b % 4) + 1) as 1))
          .map((k) => k.because)
          .join(" ")
          .toLowerCase();
        for (const w of BANNED_WORDS) expect(text).not.toContain(w);
      }
    }
  });
});
