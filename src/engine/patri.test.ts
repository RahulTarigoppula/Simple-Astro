// E-3, the anti-drift guard: the reference leaf of §0.1a, cast through the real engine.
// Two oracles: the §0.1a table ("doc") and Swiss Ephemeris ("oracle", chart g01 of golden-charts.json).
// Where they disagree the SE oracle wins and reference-chart.json says why (see its $comment).
import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import ref from "./__fixtures__/reference-chart.json";
import { currentDasha, dashaBalance } from "./dasha";
import { EngineError } from "./errors";
import { addVarga, assertInvariants, computePatri, REFERENCE_PROFILE } from "./patri";
import { resolveBirthMoment } from "./time";
import { DEFAULT_PRESET, type EnginePreset, GRAHA_IDS, type GrahaId, type Patri, PRESET_HASH } from "./types";

const E = ref.expected;
const PRESET = ref.preset as EnginePreset;
const NOW = Date.UTC(2026, 8, 8, 14, 40);
const PLANETS = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"] as const;

const pTrue = computePatri(REFERENCE_PROFILE, PRESET, NOW);
const pMean = computePatri(REFERENCE_PROFILE, { ...PRESET, node: "mean" }, NOW);

const deltaArcsec = (a: number, b: number): number => (((((a - b) % 360) + 540) % 360) - 180) * 3600;

describe("REFERENCE_PROFILE", () => {
  it("is exactly what resolveBirthMoment produces for the written leaf", () => {
    const b = resolveBirthMoment({
      localY: 1994,
      localMo: 3,
      localD: 14,
      localH: 7,
      localMi: 25,
      place: REFERENCE_PROFILE.birth.place,
    });
    expect(b).toEqual(REFERENCE_PROFILE.birth);
    expect(REFERENCE_PROFILE).toMatchObject({ id: "reference-rahul", handedness: "right", createdAt: 0, updatedAt: 0 });
    expect(PRESET).toEqual(DEFAULT_PRESET);
  });
});

describe("§0.1a header numbers", () => {
  it("jdUt, jdTt, ayanāṃśa, RAMC, ε, Lagna, MC", () => {
    expect(Math.abs(pTrue.jdUt - E.jdUt)).toBeLessThan(1e-6);
    expect(pTrue.jdUt.toFixed(4)).toBe(E.jdUtDisplay);
    expect(Math.abs(pTrue.jdTt - E.jdTt)).toBeLessThan(2e-6);
    expect(pTrue.ayanamsa).toBeCloseToArcsec(E.ayanamsa["se-true"], 0.2);
    expect(pTrue.engine.ayanamsaArcsec).toBeCloseTo(pTrue.ayanamsa * 3600, 9);
    expect(pTrue.ramc).toBeCloseToArcsec(E.ramc, 5);
    expect(pTrue.obliquity).toBeCloseToArcsec(E.obliquity, 5);
    expect(pTrue.lagna.lonSidereal).toBeCloseToArcsec(E.lagna.lonSidereal, 5);
    expect(pTrue.mc.lonSidereal).toBeCloseToArcsec(E.mc.lonSidereal, 5);
    expect(pTrue.lagna).toMatchObject({
      sign: E.lagna.sign,
      nakshatra: E.lagna.nakshatra,
      pada: E.lagna.pada,
      nakshatraLord: E.lagna.lord,
      boundary: null,
    });
    expect(pTrue.mc.sign).toBe(E.mc.sign);
    for (const p of ["se-mean", "drik-mean"] as const) {
      expect(computePatri(REFERENCE_PROFILE, { ...PRESET, ayanamsa: p }, NOW).ayanamsa).toBeCloseToArcsec(E.ayanamsa[p], 0.2);
    }
  });
});

describe("grahas", () => {
  it("Sun and Moon within 15″ of §0.1a", () => {
    expect(pTrue.grahas.SU.lonSidereal).toBeCloseToArcsec(E.grahas.SU.doc, 15);
    expect(pTrue.grahas.MO.lonSidereal).toBeCloseToArcsec(E.grahas.MO.doc, 15);
  });

  it.each(PLANETS)("%s within 5″ of Swiss Ephemeris (sidereal)", (id) => {
    expect(pTrue.grahas[id].lonSidereal).toBeCloseToArcsec(E.grahas[id].oracle, 5);
  });

  it("the five star-planets vs §0.1a: the documented frame error, not ours", () => {
    // §0.1a computed Mars…Saturn from truncated Standish mean elements in the J2000 frame without
    // precessing to the date (≈ −4′52″ in 1994). SE agrees with this engine to ≤ 2″ (test above),
    // so the §0.1a residuals below are the doc's. They are bounded (a gross error — like the
    // 130°-wrong Moon of old — would still fail) and printed for the record.
    const deltas: Record<string, number> = {};
    for (const id of ["MA", "ME", "JU", "VE", "SA"] as const) {
      const d = deltaArcsec(pTrue.grahas[id].lonSidereal, E.grahas[id].doc);
      deltas[id] = Math.round(d * 10) / 10;
      expect(Math.abs(d), id).toBeLessThan(400);
      // SE minus doc and engine minus doc agree to a few arcseconds.
      expect(Math.abs(d - deltaArcsec(E.grahas[id].oracle, E.grahas[id].doc)), id).toBeLessThan(5);
    }
    console.info("engine − §0.1a (″):", deltas);
  });

  it("classifications exact: sign, nakshatra, pada, lord, house, ℞, D9; no boundary flags", () => {
    for (const id of PLANETS) {
      const g = pTrue.grahas[id];
      const e = E.grahas[id];
      expect({ id, sign: g.sign, nak: g.nakshatra, pada: g.pada, lord: g.nakshatraLord, house: g.house, retro: g.retrograde }).toEqual({
        id,
        sign: e.sign,
        nak: e.nakshatra,
        pada: e.pada,
        lord: e.lord,
        house: e.house,
        retro: e.retrograde,
      });
      expect(pTrue.vargas[9]?.placements[id]).toBe(e.d9);
      expect(g.boundary).toBeNull();
    }
    expect(pTrue.vargas[9]?.ascendantSign).toBe(E.lagna.d9);
  });

  it("nodes, mean (§0.1a): Rāhu within 5″ of 213.4956°, classifications exact", () => {
    expect(pMean.grahas.RA.lonSidereal).toBeCloseToArcsec(E.nodes.mean.RA.doc, 5);
    expect(pMean.grahas.KE.lonSidereal).toBeCloseToArcsec(E.nodes.mean.KE.doc, 5);
    expect(pMean.grahas.RA.lonSidereal).toBeCloseToArcsec(E.nodes.mean.RA.oracle, 60);
    for (const id of ["RA", "KE"] as const) {
      const g = pMean.grahas[id];
      const e = E.nodes.mean[id];
      expect([g.sign, g.nakshatra, g.pada, g.nakshatraLord, g.house, g.retrograde]).toEqual([
        e.sign,
        e.nakshatra,
        e.pada,
        e.lord,
        e.house,
        true,
      ]);
      expect(pMean.vargas[9]?.placements[id]).toBe(e.d9);
      expect(g.speed).toBeLessThan(0);
      expect(g.boundary).toBeNull();
    }
  });

  it("nodes, true (the reference preset): Viśākhā 4 / Kṛttikā 2, within 20″ of SE", () => {
    for (const id of ["RA", "KE"] as const) {
      const g = pTrue.grahas[id];
      const e = E.nodes.true[id];
      expect(g.lonSidereal).toBeCloseToArcsec(e.oracle, 20);
      expect([g.sign, g.nakshatra, g.pada, g.nakshatraLord, g.house, g.retrograde]).toEqual([
        e.sign,
        e.nakshatra,
        e.pada,
        e.lord,
        e.house,
        true,
      ]);
      expect(pTrue.vargas[9]?.placements[id]).toBe(e.d9);
      expect(g.latEcliptic).toBe(0);
    }
  });

  it("Maṅgala and Śani are in graha yuddha (within 1°), 5′11″ apart per SE", () => {
    const sep = Math.abs(deltaArcsec(pTrue.grahas.MA.lonSidereal, pTrue.grahas.SA.lonSidereal));
    expect(sep).toBeLessThan(3600);
    expect(sep).toBeGreaterThan(300);
    expect(sep).toBeLessThan(320);
  });

  it("derived fields: dignity, combustion, latitude, sidereal speed", () => {
    expect(pTrue.grahas.VE.dignity).toBe("exalted"); // Śukra in Mīna
    expect(pTrue.grahas.SA.dignity).toBe("moolatrikona"); // Śani in Kumbha 11°31′
    expect(pTrue.grahas.SU.dignity).toBe("enemy"); // Sūrya in Śani's sign
    expect(pTrue.grahas.JU.dignity).toBe("enemy"); // Guru in Śukra's sign
    for (const id of GRAHA_IDS) expect(pTrue.grahas[id].combust).toBe(false);
    expect(pTrue.grahas.MO.latEcliptic).toBeCloseTo(3.438, 2);
    expect(pTrue.grahas.JU.speed).toBeLessThan(0);
    expect(pTrue.grahas.SU.speed).toBeCloseTo(0.99738, 4);
  });
});

describe("birth pañcāṅga and daśā", () => {
  it("panchang names exact", () => {
    const b = pTrue.birthPanchang;
    expect([b.tithi.name, b.vara.name, b.nakshatra.name, b.nakshatra.pada, b.yoga.name, b.karana.name]).toEqual([
      E.panchang.tithi,
      E.panchang.vara,
      E.panchang.nakshatra,
      E.panchang.pada,
      E.panchang.yoga,
      E.panchang.karana,
    ]);
    expect(b.masaAmanta).toBe(E.panchang.masaAmanta);
    expect(Math.round(b.moonIllumination * 1000) / 10).toBeCloseTo(E.panchang.moonLitPercent, 0);
  });

  it("Viṃśottarī: Budha balance, MD end within a day, Budha - Ketu - Śani at birth", () => {
    const v = E.vimshottari;
    const bal = dashaBalance(pTrue.grahas.MO.lonSidereal);
    expect(bal.lord).toBe(v.lord);
    // 1″ of Moon moves the balance by 3.5e-4 yr (3 h); the engine's Moon is within 1″ of §0.1a.
    expect(Math.abs(bal.balanceYears - v.balanceYears)).toBeLessThan(5e-4);
    expect(pTrue.dasha.map((d) => d.lord)).toEqual(v.mdOrder);
    expect(Math.abs((pTrue.dasha[0]?.endMs ?? 0) - Date.parse(v.mdEndIso))).toBeLessThan(86_400_000);
    const cur = currentDasha(pTrue.dasha, REFERENCE_PROFILE.birth.utcMs);
    expect([cur?.md.lord, cur?.ad.lord, cur?.pd.lord]).toEqual(["ME", v.adAtBirth.lord, v.pdAtBirth.lord]);
  });
});

describe("the Patri object", () => {
  it("stamps, hashes, vargas, yogas", () => {
    expect(pTrue.computedAt).toBe(NOW);
    expect(pTrue.profileId).toBe("reference-rahul");
    expect(pTrue.presetHash).toBe(PRESET_HASH(PRESET));
    expect(pTrue.engine).toMatchObject({ name: "astronomy-engine", version: "2.1.19" });
    expect(Object.keys(pTrue.vargas).sort()).toEqual(["1", "9"]);
    expect(Array.isArray(pTrue.yogas)).toBe(true);
    expect(pTrue.computeMs).toBeGreaterThan(0);
    for (const id of GRAHA_IDS) expect(pTrue.vargas[1]?.placements[id]).toBe(pTrue.grahas[id].sign);
  });

  it("addVarga is lazy and immutable", () => {
    const withD60 = addVarga(pTrue, 60);
    expect(withD60).not.toBe(pTrue);
    expect(pTrue.vargas[60]).toBeUndefined();
    expect(withD60.vargas[60]?.placements.SU).toBe(8); // Sun 329.48° → Dhanu (§6.7 row)
    expect(addVarga(withD60, 60)).toBe(withD60);
  });

  it("dev invariants pass on a real cast and fire ORACLE_MISMATCH on a corrupted one", () => {
    expect(() => assertInvariants(pTrue)).not.toThrow();
    const broken: Patri = { ...pTrue, grahas: { ...pTrue.grahas, SU: { ...pTrue.grahas.SU, house: 13 } } };
    expect(() => assertInvariants(broken)).toThrow(EngineError);
    const gap: Patri = { ...pTrue, dasha: pTrue.dasha.map((d, i) => (i === 3 ? { ...d, startMs: d.startMs + 1 } : d)) };
    try {
      assertInvariants(gap);
      throw new Error("should have thrown");
    } catch (e) {
      expect((e as EngineError).code).toBe("ORACLE_MISMATCH");
    }
  });

  it("refuses instants outside 1600-2400", () => {
    const old = { ...REFERENCE_PROFILE, birth: { ...REFERENCE_PROFILE.birth, utcMs: Date.UTC(1500, 0, 1) } };
    expect(() => computePatri(old, PRESET, NOW)).toThrow(/EPHEMERIS_RANGE/);
  });
});

describe("machine-zone independence and speed", () => {
  const fingerprint = (p: Patri): string => {
    const { computeMs: _ms, ...rest } = p;
    return createHash("sha256").update(JSON.stringify(rest)).digest("hex");
  };

  it("the reference chart's JSON hash does not depend on process.env.TZ", () => {
    const saved = process.env.TZ;
    const hashes = new Set<string>();
    try {
      for (const tz of ["UTC", "Asia/Kolkata", "America/Denver", "Pacific/Chatham"]) {
        process.env.TZ = tz;
        hashes.add(fingerprint(computePatri(REFERENCE_PROFILE, PRESET, NOW)));
      }
    } finally {
      process.env.TZ = saved;
    }
    expect(hashes.size).toBe(1);
    console.info(`reference-chart fingerprint (TZ=${saved}): ${[...hashes][0]}`);
  });

  it("computePatri median of 20 < 60 ms", () => {
    const times: number[] = [];
    for (let i = 0; i < 20; i++) times.push(computePatri(REFERENCE_PROFILE, PRESET, NOW).computeMs);
    times.sort((a, b) => a - b);
    const median = ((times[9] ?? 0) + (times[10] ?? 0)) / 2;
    console.info(`computePatri median ${median.toFixed(2)} ms (min ${times[0]?.toFixed(2)}, max ${times[19]?.toFixed(2)})`);
    expect(median).toBeLessThan(60);
  });

  it("every golden-chart preset combination casts without throwing (node × ayanāṃśa × years × sunrise)", () => {
    const ids: GrahaId[] = [...GRAHA_IDS];
    for (const ayanamsa of ["se-true", "se-mean", "drik-mean"] as const) {
      for (const node of ["true", "mean"] as const) {
        for (const dashaYearDays of [365.25, 360] as const) {
          for (const sunrise of ["upper-limb-refracted", "disc-centre"] as const) {
            const p = computePatri(REFERENCE_PROFILE, { ayanamsa, node, dashaYearDays, sunrise, houseSystem: "whole-sign" }, NOW);
            expect(ids.every((id) => p.grahas[id].lonSidereal >= 0 && p.grahas[id].lonSidereal < 360)).toBe(true);
          }
        }
      }
    }
  });
});
