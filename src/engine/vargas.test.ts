import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/vargas.json";
import { EngineError } from "./errors";
import { GRAHA_IDS, type GrahaId, type VargaNumber } from "./types";
import { navamsaClassical, VARGAS, vargaChart, vargaSign } from "./vargas";

type Row = Record<string, number | string>;

describe("vargas.json hand-derived rows (§6.7)", () => {
  for (const row of fixture.rows as Row[]) {
    it.each(VARGAS)(`${row.note}, D%i`, (v) => {
      expect(vargaSign(row.lonSid as number, v)).toBe(row[`D${v}`]);
    });
  }

  it("edge rows", () => {
    for (const e of fixture.edges as Row[]) {
      if ("D9" in e) expect(vargaSign(e.lonSid as number, 9)).toBe(e.D9);
      if ("D1" in e) expect(vargaSign(e.lonSid as number, 1)).toBe(e.D1);
    }
  });
});

describe("invariants", () => {
  it("V-1/V-2: every varga is total over 3 600 longitudes and D1 = floor(λ/30)", () => {
    for (let i = 0; i < 3600; i++) {
      const l = i / 10;
      for (const v of VARGAS) {
        const s = vargaSign(l, v);
        expect(Number.isInteger(s) && s >= 0 && s <= 11).toBe(true);
      }
      expect(vargaSign(l, 1)).toBe(Math.floor(l / 30));
    }
  });

  it("V-4: the D9 closed form equals movable/fixed/dual at all 4 320 five-arcminute samples", () => {
    let n = 0;
    // Each sample sits 1e-9° above its 5′ grid point: at an exact edge such as 140/3 the float
    // nearest the edge is ambiguous by one ulp between the two formulae. Exact-edge (half-open)
    // behaviour is asserted separately on representable edges (0°, 30°, 40°, 120°).
    for (let k = 0; k < 4320; k++) {
      const l = k / 12 + 1e-9;
      expect(vargaSign(l, 9), `λ = ${l}`).toBe(navamsaClassical(l));
      n++;
    }
    expect(n).toBe(4320);
  });

  it("D30 bands: odd 5/5/8/7/5 and even 5/7/8/5/5", () => {
    expect([0, 5, 10, 18, 25].map((d) => vargaSign(d + 0.01, 30))).toEqual([0, 10, 8, 2, 6]);
    expect([0, 5, 12, 20, 25].map((d) => vargaSign(30 + d + 0.01, 30))).toEqual([1, 5, 11, 9, 7]);
    expect(vargaSign(4.999, 30)).toBe(0);
    expect(vargaSign(30 + 11.999, 30)).toBe(5);
  });

  it("unsupported vargas throw VARGA_UNSUPPORTED", () => {
    expect(() => vargaSign(10, 4)).toThrow(EngineError);
    try {
      vargaSign(10, 16);
    } catch (e) {
      expect((e as EngineError).code).toBe("VARGA_UNSUPPORTED");
    }
  });

  it("vargaChart places every graha and the ascendant", () => {
    const lons: Record<GrahaId, number> = {
      SU: 329.4811,
      MO: 349.1688,
      MA: 311.5233,
      ME: 302.4901,
      JU: 200.603,
      VE: 343.1253,
      SA: 311.5169,
      RA: 213.4956,
      KE: 33.4956,
    };
    const grahas = Object.fromEntries(GRAHA_IDS.map((id) => [id, { lonSidereal: lons[id] }])) as Record<GrahaId, { lonSidereal: number }>;
    const d9 = vargaChart({ lagna: { lonSidereal: 345.657 }, grahas }, 9 as VargaNumber);
    expect(d9.ascendantSign).toBe(7); // Vṛścika
    expect(d9.placements).toEqual({ SU: 2, MO: 8, MA: 9, ME: 6, JU: 0, VE: 6, SA: 9, RA: 4, KE: 10 });
  });
});
