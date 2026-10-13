// Daśa Porutham: a positive and a negative case for each of the ten, the table shapes, a worked
// pair, the Gaṇa parihāra, milan() wiring and content care.
import { describe, expect, it } from "vitest";
import { BANNED_WORDS } from "../test/banned-words";
import { synth } from "./__fixtures__/synthetic";
import { kootas, type MoonPlacement, milan, signOfPada } from "./ashtakoota";
import {
  ganaParihara,
  isPoruthamResult,
  isVedha,
  nakCount,
  PORUTHAM_ORDER,
  type PoruthamId,
  poruthams,
  RAJJU_CYCLE,
  rajjuOf,
  VEDHA_PAIRS,
} from "./porutham";
import type { Profile } from "./types";

const moon = (nak: number, pada: 1 | 2 | 3 | 4 = 1): MoonPlacement => ({ nak, pada, sign: signOfPada(nak, pada) });
const pass = (id: PoruthamId, a: MoonPlacement, b: MoonPlacement): boolean => {
  const p = poruthams(a, b).find((x) => x.id === id);
  if (!p) throw new Error(`no ${id}`);
  return p.pass;
};

// Nakshatra indices used below (Aśvinī = 0).
const ASHVINI = 0;
const BHARANI = 1;
const KRITTIKA = 2;
const ROHINI = 3;
const MRIGASHIRSHA = 4;
const MAGHA = 9;
const HASTA = 12;
const CITRA = 13;
const SVATI = 14;
const ANURADHA = 16;
const JYESHTHA = 17;
const PURVA_ASHADHA = 19;
const DHANISHTHA = 22;
const REVATI = 26;

describe("shape", () => {
  it("ten poruthams in the traditional order, each with a because, rule and citation", () => {
    const ps = poruthams(moon(REVATI), moon(ROHINI));
    expect(ps.map((p) => p.id)).toEqual(PORUTHAM_ORDER);
    for (const p of ps) {
      expect(p.because.length).toBeGreaterThan(10);
      expect(p.note).toBe(p.because);
      expect(p.rule.length).toBeGreaterThan(20);
      expect(p.citation).toEqual({ text: "Porutham tradition (Tamil jyotiṣa)", ref: "Daśa porutham" });
      expect(p.nameDev).toMatch(/[ऀ-ॿ]/);
      expect(isPoruthamResult(p)).toBe(true);
    }
    expect(ps.filter((p) => p.weighty).map((p) => p.id)).toEqual(["rajju", "vedha"]);
  });

  it("counts nakshatras inclusively from the second leaf to the first", () => {
    expect(nakCount(ROHINI, REVATI)).toBe(24);
    expect(nakCount(ASHVINI, ASHVINI)).toBe(1);
    expect(nakCount(REVATI, ASHVINI)).toBe(2);
  });
});

describe("worked pair, Revatī (Mīna) first, Rohiṇī (Vṛṣabha) second", () => {
  it("ties 7 of 10: Mahendra, Rāśyādhipati and Vaśya stay open", () => {
    const ps = poruthams(moon(REVATI), moon(ROHINI));
    expect(Object.fromEntries(ps.map((p) => [p.id, p.pass]))).toEqual({
      dina: true, // 24th, 24 mod 9 = 6
      gana: true, // Deva and Manuṣya
      mahendra: false, // 24 is not a Mahendra count
      "stri-dirgha": true, // beyond the 13th
      yoni: true, // elephant and serpent are not sworn
      rashi: true, // Vṛṣabha → Mīna is the 11th
      rashyadhipati: false, // Guru regards Śukra as an enemy
      vashya: false, // neither holds the other
      rajju: true, // Pāda and Kaṇṭha
      vedha: true,
    });
    const dina = ps.find((p) => p.id === "dina");
    expect(dina?.because).toBe("Counted from Rohiṇī to Revatī is the 24th nakṣatra; by nines it leaves 6, a kind remainder.");
  });
});

describe("each porutham, positive and negative", () => {
  it("Dina", () => {
    expect(pass("dina", moon(REVATI), moon(ROHINI))).toBe(true); // 24 → 6
    expect(pass("dina", moon(ASHVINI), moon(ASHVINI))).toBe(false); // 1 → 1
    expect(pass("dina", moon(KRITTIKA), moon(ASHVINI))).toBe(false); // 3rd → 3
    expect(pass("dina", moon(MAGHA - 1), moon(ASHVINI))).toBe(true); // 9th → 0
  });

  it("Gaṇa", () => {
    expect(pass("gana", moon(ASHVINI), moon(MRIGASHIRSHA))).toBe(true); // Deva, Deva
    expect(pass("gana", moon(KRITTIKA), moon(MAGHA))).toBe(true); // Rākṣasa, Rākṣasa
    expect(pass("gana", moon(KRITTIKA), moon(ASHVINI))).toBe(false); // Rākṣasa beside Deva
    expect(pass("gana", moon(ASHVINI), moon(KRITTIKA))).toBe(false);
  });

  it("Mahendra", () => {
    expect(pass("mahendra", moon(ROHINI), moon(ASHVINI))).toBe(true); // 4th
    expect(pass("mahendra", moon(MRIGASHIRSHA), moon(ASHVINI))).toBe(false); // 5th
  });

  it("Strī-dīrgha", () => {
    expect(pass("stri-dirgha", moon(CITRA), moon(ASHVINI))).toBe(true); // 14th
    expect(pass("stri-dirgha", moon(HASTA), moon(ASHVINI))).toBe(false); // 13th
  });

  it("Yoni", () => {
    expect(pass("yoni", moon(ASHVINI), moon(ASHVINI))).toBe(true); // horse, horse
    expect(pass("yoni", moon(ASHVINI), moon(HASTA))).toBe(false); // horse, buffalo, sworn
  });

  it("Rāśi", () => {
    expect(pass("rashi", moon(SVATI), moon(ASHVINI))).toBe(true); // Meṣa → Tulā, the 7th
    expect(pass("rashi", moon(HASTA), moon(ASHVINI))).toBe(false); // Meṣa → Kanyā, the 6th
    expect(pass("rashi", moon(ASHVINI), moon(HASTA))).toBe(false); // Kanyā → Meṣa, the 8th
  });

  it("Rāśyādhipati", () => {
    expect(pass("rashyadhipati", moon(ASHVINI), moon(ANURADHA))).toBe(true); // Meṣa, Vṛścika: one lord
    expect(pass("rashyadhipati", moon(REVATI), moon(ROHINI))).toBe(false); // Guru ↔ Śukra enmity
  });

  it("Vaśya", () => {
    expect(pass("vashya", moon(ASHVINI), moon(MAGHA))).toBe(true); // Meṣa holds Siṃha
    expect(pass("vashya", moon(MAGHA), moon(ASHVINI))).toBe(true); // either way round
    expect(pass("vashya", moon(REVATI), moon(ROHINI))).toBe(false);
  });

  it("Rajju", () => {
    expect(pass("rajju", moon(REVATI), moon(ROHINI))).toBe(true); // Pāda, Kaṇṭha
    expect(pass("rajju", moon(ASHVINI), moon(MAGHA))).toBe(false); // both Pāda
    expect(pass("rajju", moon(MRIGASHIRSHA), moon(DHANISHTHA))).toBe(false); // both Śiras
  });

  it("Vedha", () => {
    expect(pass("vedha", moon(ASHVINI), moon(BHARANI))).toBe(true);
    expect(pass("vedha", moon(ASHVINI), moon(JYESHTHA))).toBe(false);
    expect(pass("vedha", moon(DHANISHTHA), moon(MRIGASHIRSHA))).toBe(false);
    expect(pass("vedha", moon(CITRA), moon(DHANISHTHA))).toBe(false);
  });
});

describe("tables", () => {
  it("Rajju groups match the classical lists", () => {
    const by = (r: string) => Array.from({ length: 27 }, (_, n) => n).filter((n) => rajjuOf(n) === r);
    expect(by("pada")).toEqual([0, 8, 9, 17, 18, 26]);
    expect(by("kati")).toEqual([1, 7, 10, 16, 19, 25]);
    expect(by("nabhi")).toEqual([2, 6, 11, 15, 20, 24]);
    expect(by("kantha")).toEqual([3, 5, 12, 14, 21, 23]);
    expect(by("shiras")).toEqual([4, 13, 22]);
    expect(RAJJU_CYCLE).toHaveLength(9);
  });

  it("every nakshatra has a Vedha partner and the relation is symmetric", () => {
    for (let n = 0; n < 27; n++)
      expect(
        VEDHA_PAIRS.some(([p, q]) => p === n || q === n),
        String(n),
      ).toBe(true);
    for (const [p, q] of VEDHA_PAIRS) expect(isVedha(q, p)).toBe(true);
  });
});

describe("Gaṇa parihāra", () => {
  it("is null when Gaṇa carries no doṣa", () => {
    expect(ganaParihara(kootas(moon(REVATI), moon(ROHINI)))).toBeNull();
  });
  it("holds when the sign lords are mutual friends (Citrā 1 × Rohiṇī 3)", () => {
    const p = ganaParihara(kootas(moon(CITRA, 1), moon(ROHINI, 3)));
    expect(p?.holds).toBe(true);
    expect(p?.rule).toBe("gana-lords-friends");
    expect(p?.citation).toEqual({ text: "Later tradition", ref: "Gaṇa parihāra" });
  });
  it("holds when Bhakūṭa is clean (Kṛttikā 2 × Anurādhā 1, a 7/7 axis)", () => {
    const p = ganaParihara(kootas(moon(KRITTIKA, 2), moon(ANURADHA, 1)));
    expect(p?.holds).toBe(true);
    expect(p?.rule).toBe("gana-bhakoot-clean");
  });
  it("does not hold for Kṛttikā 2 × Pūrva Āṣāḍhā 1 (6/8, Śukra and Guru)", () => {
    const p = ganaParihara(kootas(moon(KRITTIKA, 2), moon(PURVA_ASHADHA, 1)));
    expect(p?.holds).toBe(false);
    expect(p?.rule).toBeNull();
  });
});

describe("milan()", () => {
  const profile = (id: string): Profile => ({
    id,
    name: id,
    handedness: "right",
    createdAt: 0,
    updatedAt: 0,
    birth: {
      localY: 2000,
      localMo: 1,
      localD: 1,
      localH: 12,
      localMi: 0,
      place: { name: "x", country: "IN", lat: 0, lon: 0, source: "manual" },
      zone: "Asia/Kolkata",
      utcMs: 0,
      offsetMin: 330,
      jdUt: 2451545,
      offsetSource: "tzdb",
    },
  });
  it("populates the ten poruthams from the two Moons, positionally", () => {
    const at = { SU: 1, MO: [11, 19.17] as [number, number], MA: 6, ME: 1, JU: 4, VE: 3, SA: 9, RA: 4 };
    const pa = synth({ lagna: 0, at });
    const pb = synth({ lagna: 0, at: { ...at, MO: [1, 15] as [number, number] } });
    const m = milan(profile("a"), profile("b"), pa, pb);
    expect(m.porutham).toHaveLength(10);
    const want = poruthams(
      { nak: pa.grahas.MO.nakshatra, pada: pa.grahas.MO.pada, sign: pa.grahas.MO.sign },
      { nak: pb.grahas.MO.nakshatra, pada: pb.grahas.MO.pada, sign: pb.grahas.MO.sign },
    );
    expect(m.porutham?.map((p) => p.pass)).toEqual(want.map((p) => p.pass));
    expect(m.porutham?.every((p) => isPoruthamResult(p))).toBe(true);
  });
});

describe("content care", () => {
  it("rules, notes and because sentences are free of banned words", () => {
    const parts: string[] = [];
    for (let a = 0; a < 27; a++) {
      for (let b = 0; b < 27; b++) {
        for (const p of poruthams(moon(a), moon(b))) parts.push(p.because, p.rule, p.weighs, p.name);
        const g = ganaParihara(kootas(moon(a), moon(b)));
        if (g) parts.push(g.because);
      }
    }
    const text = parts.join(" ").toLowerCase();
    for (const w of BANNED_WORDS) expect(text).not.toContain(w);
  });
});
