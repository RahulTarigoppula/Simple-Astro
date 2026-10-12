import { describe, expect, it } from "vitest";
import citations from "../data/citations.json";
import { AV_CONTRIBUTORS, BAV_TOTALS, BINDU_PLACES, SAV_TOTAL } from "../data/tables/ashtakavarga";
import { BANNED_WORDS } from "../test/banned-words";
import { referenceChart, synth } from "./__fixtures__/synthetic";
import {
  AV_GRAHAS,
  ashtakavarga,
  ashtakavargaFromSigns,
  ashtakavargaReadings,
  binduFor,
  savReadings,
  smoothSigns,
  transitReading,
  trikonaShodhana,
} from "./ashtakavarga";
import { mulberry32 } from "./math";

const sum = (a: readonly number[]) => a.reduce((x, y) => x + y, 0);
const known = new Set(citations.entries.map((e) => `${e.text}|${e.ref}`));

describe("bindu tables (BPHS ch. 66)", () => {
  it("each row is a strictly increasing set of places 1..12 and the totals are the classical sums", () => {
    for (const g of AV_GRAHAS) {
      let n = 0;
      for (const c of AV_CONTRIBUTORS) {
        const row = BINDU_PLACES[g][c];
        row.forEach((p, i) => {
          expect(p).toBeGreaterThanOrEqual(1);
          expect(p).toBeLessThanOrEqual(12);
          if (i > 0) expect(p).toBeGreaterThan(row[i - 1] ?? 0);
        });
        n += row.length;
      }
      expect(n, g).toBe(BAV_TOTALS[g]);
    }
    expect(sum(Object.values(BAV_TOTALS))).toBe(SAV_TOTAL);
  });

  it("spot rows match the standard table (Sun from Mercury; Venus from Moon; Saturn from Lagna)", () => {
    expect(BINDU_PLACES.SU.ME).toEqual([3, 5, 6, 9, 10, 11, 12]);
    expect(BINDU_PLACES.VE.MO).toEqual([1, 2, 3, 4, 5, 8, 9, 11, 12]);
    expect(BINDU_PLACES.SA.LA).toEqual([1, 3, 4, 6, 10, 11]);
    expect(BINDU_PLACES.JU.SA).toEqual([3, 5, 6, 12]);
  });
});

describe("ashtakavarga()", () => {
  it("BAV totals are fixed and SAV sums to 337 for 200 random synthetic placements", () => {
    const rnd = mulberry32(66);
    const s = () => Math.floor(rnd() * 12);
    for (let k = 0; k < 200; k++) {
      const core = synth({ lagna: s(), at: { SU: s(), MO: s(), MA: s(), ME: s(), JU: s(), VE: s(), SA: s(), RA: s() } });
      const av = ashtakavarga(core);
      for (const g of AV_GRAHAS) {
        expect(av.bav[g]).toHaveLength(12);
        expect(sum(av.bav[g])).toBe(BAV_TOTALS[g]);
        for (const n of av.bav[g]) expect(n >= 0 && n <= 8).toBe(true);
      }
      expect(sum(av.sav)).toBe(SAV_TOTAL);
      expect(sum(av.byHouse)).toBe(SAV_TOTAL);
      for (let si = 0; si < 12; si++) expect(av.sav[si]).toBe(sum(AV_GRAHAS.map((g) => av.bav[g][si] ?? 0)));
      expect(av.byHouse[0]).toBe(av.sav[core.lagna.sign]);
    }
  });

  it("hand-computed cell on the reference chart: Sūrya's BAV in Meṣa is 1 (only Budha gives)", () => {
    const av = ashtakavarga(referenceChart());
    expect(binduFor(av, "SU", 0)).toBe(1);
    expect(binduFor(av, "SU", 12)).toBe(1); // wraps
  });

  it("all contributors in one sign: each graha's BAV there counts the contributors that give to place 1", () => {
    const pos = { SU: 0, MO: 0, MA: 0, ME: 0, JU: 0, VE: 0, SA: 0, LA: 0 };
    const { bav } = ashtakavargaFromSigns(pos);
    for (const g of AV_GRAHAS) {
      const expected = AV_CONTRIBUTORS.filter((c) => BINDU_PLACES[g][c].includes(1)).length;
      expect(bav[g][0]).toBe(expected);
    }
    // Venus receives place 1 from Moon, Venus and Lagna; Sun gives Venus nothing in its own sign.
    expect(bav.VE[0]).toBe(3);
  });
});

describe("Trikoṇa-śodhana (BPHS ch. 67)", () => {
  it("subtracts the least count of each trinal group", () => {
    // Meṣa/Siṃha/Dhanu = 5,3,4 → 2,0,1
    const row = [5, 2, 2, 0, 3, 6, 6, 1, 4, 2, 6, 4];
    const out = trikonaShodhana(row);
    expect([out[0], out[4], out[8]]).toEqual([2, 0, 1]);
    // Vṛṣabha/Kanyā/Makara = 2,6,2 → 0,4,0
    expect([out[1], out[5], out[9]]).toEqual([0, 4, 0]);
    // Mithuna/Tulā/Kumbha = 2,6,6 → 0,4,4
    expect([out[2], out[6], out[10]]).toEqual([0, 4, 4]);
  });
  it("leaves a group with a zero unchanged, and zeroes three equal counts", () => {
    const row = [0, 3, 3, 0, 5, 3, 3, 1, 7, 3, 3, 2];
    const out = trikonaShodhana(row);
    expect([out[0], out[4], out[8]]).toEqual([0, 5, 7]); // a zero: unchanged
    expect([out[1], out[5], out[9]]).toEqual([0, 0, 0]); // all equal → zero
    expect([out[3], out[7], out[11]]).toEqual([0, 1, 2]);
  });
});

describe("readings", () => {
  it("lists houses ≥ 28 as supportive and < 25 as asking effort (positive)", () => {
    const byHouse = [28, 30, 27, 25, 24, 29, 26, 22, 31, 30, 33, 12];
    const r = savReadings(byHouse);
    const strong = r.find((x) => x.id === "sav-strong");
    const effort = r.find((x) => x.id === "sav-effort");
    expect(strong?.houses).toEqual([1, 2, 6, 9, 10, 11]);
    expect(effort?.houses).toEqual([5, 8, 12]);
    expect(strong?.text.startsWith("Tradition says")).toBe(true);
  });
  it("27 is not supportive and 25 does not ask effort (negative)", () => {
    const r = savReadings([27, 25, 27, 25, 27, 25, 27, 25, 27, 25, 27, 52]);
    expect(r.find((x) => x.id === "sav-strong")?.houses).toEqual([12]);
    expect(r.find((x) => x.id === "sav-effort")).toBeUndefined();
    expect(r.find((x) => x.id === "sav-even")).toBeDefined();
  });
  it("transit through ≥ 4 bindus reads as smoother; 3 does not", () => {
    const av = ashtakavarga(referenceChart());
    for (const g of AV_GRAHAS) {
      for (let s = 0; s < 12; s++) {
        const t = transitReading(av, g, s);
        expect(t.smooth).toBe(t.bindus >= 4);
        expect(t.text).toMatch(t.smooth ? /more smoothly/ : /more care/);
      }
      expect(smoothSigns(av, g).every((s) => binduFor(av, g, s) >= 4)).toBe(true);
    }
  });
  it("section readings: 2–3 calm sentences, cited, no banned words", () => {
    const rnd = mulberry32(72);
    const s = () => Math.floor(rnd() * 12);
    for (let k = 0; k < 50; k++) {
      const core = synth({ lagna: s(), at: { SU: s(), MO: s(), MA: s(), ME: s(), JU: s(), VE: s(), SA: s(), RA: s() } });
      const rs = ashtakavargaReadings(ashtakavarga(core));
      expect(rs.length).toBeGreaterThanOrEqual(2);
      expect(rs.length).toBeLessThanOrEqual(3);
      for (const r of rs) {
        expect(r.text.startsWith("Tradition says")).toBe(true);
        expect(known.has(`${r.citation.text}|${r.citation.ref}`)).toBe(true);
        for (const w of BANNED_WORDS) expect(r.text.toLowerCase()).not.toContain(w);
      }
    }
  });
});
