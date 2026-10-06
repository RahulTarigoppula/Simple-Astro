// Yoga rules: a positive and a negative synthetic fixture for every rule (§6.10 Y-1 … Y-10 included).
import { describe, expect, it } from "vitest";
import { BANNED_WORDS } from "../test/banned-words";
import { type Placement, referenceChart, type SynthSpec, synth } from "./__fixtures__/synthetic";
import type { GrahaId, YogaHit } from "./types";
import { kalaSarpaCheck, runYogas, YOGA_RULES } from "./yogas";

type At = SynthSpec["at"];
const chart = (lagna: number, at: Partial<At>, base: At = BASE): ReturnType<typeof synth> =>
  synth({ lagna, at: { ...base, ...at } as Record<Exclude<GrahaId, "KE">, Placement> });
const find = (hits: YogaHit[], id: string): YogaHit | undefined => hits.find((h) => h.id === id);
const yogasOf = (lagna: number, at: Partial<At>, base: At = BASE): YogaHit[] => runYogas(chart(lagna, at, base));

/** A plain base: nothing in particular lined up. */
const BASE: At = { SU: 1, MO: 2, MA: 4, ME: 7, JU: 4, VE: 10, SA: 7, RA: 4 };

/**
 * Kemadruma base (Lagna Meṣa, Candra Mithuna): nothing but Sūrya and the nodes beside Candra, no
 * tārā-graha in a kendra from the Lagna or Candra, none with Candra, and Guru not aspecting Candra.
 */
const KEMA: At = { SU: 1, MO: 2, MA: 4, ME: 7, JU: 4, VE: 10, SA: 7, RA: 4 };

describe("rule table", () => {
  it("has at least twenty rules, unique ids, Devanagari names and citations", () => {
    expect(YOGA_RULES.length).toBeGreaterThanOrEqual(20);
    const ids = YOGA_RULES.map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const r of YOGA_RULES) {
      expect(r.nameDev).toMatch(/[ऀ-ॿ]/);
      expect(r.citation.text.length).toBeGreaterThan(0);
      expect(r.citation.ref.length).toBeGreaterThan(0);
    }
  });
});

describe("Budha-Āditya", () => {
  it("Y-1: Sūrya and Budha both in Mīna → hit with citation", () => {
    const h = find(yogasOf(0, { SU: [11, 5], ME: [11, 25] }), "budha-aditya");
    expect(h?.strength).toBe("full");
    expect(h?.citation).toEqual({ text: "Sārāvalī", ref: "ch. 15" });
  });
  it("combust Budha (within 14°) reads as partial and says so", () => {
    const h = find(yogasOf(0, { SU: [11, 10], ME: [11, 15] }), "budha-aditya");
    expect(h?.strength).toBe("partial");
    expect(h?.because.some((b) => b.note.includes("combust"))).toBe(true);
  });
  it("negative: Budha in the next sign", () => {
    expect(find(yogasOf(0, { SU: [11, 25], ME: [0, 2] }), "budha-aditya")).toBeUndefined();
  });
});

describe("Gaja-Kesari", () => {
  it("Y-2: Candra in Vṛṣabha, Guru in Siṃha (4th from Candra) → hit", () => {
    const h = find(yogasOf(0, { MO: 1, JU: 4 }), "gaja-kesari");
    expect(h?.strength).toBe("full");
    expect(h?.because[0]).toMatchObject({ grahaId: "JU", house: 4 });
  });
  it("Y-3: Guru in Mithuna (2nd from Candra) → miss", () => {
    expect(find(yogasOf(0, { MO: 1, JU: 2 }), "gaja-kesari")).toBeUndefined();
  });
  it("debilitated Guru in a kendra from Candra → partial", () => {
    expect(find(yogasOf(0, { MO: 0, JU: 9 }), "gaja-kesari")?.strength).toBe("partial");
  });
});

describe("Candra-Maṅgala", () => {
  it("together → full; opposite → partial", () => {
    expect(find(yogasOf(0, { MO: 3, MA: 3 }), "candra-mangala")?.strength).toBe("full");
    expect(find(yogasOf(0, { MO: 3, MA: 9 }), "candra-mangala")?.strength).toBe("partial");
  });
  it("negative: Maṅgala in the 3rd from Candra", () => {
    expect(find(yogasOf(0, { MO: 3, MA: 5 }), "candra-mangala")).toBeUndefined();
  });
});

describe("Pañca-Mahāpuruṣa", () => {
  it("Y-4: Rucaka — Maṅgala in Meṣa, Lagna Meṣa", () => {
    expect(find(yogasOf(0, { MA: 0 }), "rucaka")?.strength).toBe("full");
  });
  it("Rucaka by exaltation — Maṅgala in Makara, the 10th", () => {
    const h = find(yogasOf(0, { MA: 9 }), "rucaka");
    expect(h?.because[0]?.note).toContain("exaltation");
  });
  it("Y-5: Rucaka negative — Maṅgala in Meṣa but Lagna Vṛṣabha (12th)", () => {
    expect(find(yogasOf(1, { MA: 0 }), "rucaka")).toBeUndefined();
  });
  it("Rucaka negative — Maṅgala in a kendra but not dignified", () => {
    expect(find(yogasOf(0, { MA: 3 }), "rucaka")).toBeUndefined();
  });
  it("Bhadra: Budha in Mithuna in the 1st; not in the 3rd", () => {
    expect(find(yogasOf(2, { ME: 2, SU: 4 }), "bhadra")?.strength).toBe("full");
    expect(find(yogasOf(0, { ME: 2, SU: 4 }), "bhadra")).toBeUndefined();
  });
  it("Haṃsa: Guru exalted in Karka, 4th; not in Dhanu, 9th", () => {
    expect(find(yogasOf(0, { JU: 3 }), "hamsa")?.strength).toBe("full");
    expect(find(yogasOf(0, { JU: 8 }), "hamsa")).toBeUndefined();
  });
  it("Haṃsa with a combust Guru → partial", () => {
    expect(find(yogasOf(0, { JU: [3, 15], SU: [3, 10] }), "hamsa")?.strength).toBe("partial");
  });
  it("Mālavya: Śukra in Tulā, 7th; not exalted in the 12th", () => {
    expect(find(yogasOf(0, { VE: 6 }), "malavya")?.strength).toBe("full");
    expect(find(yogasOf(0, { VE: 11 }), "malavya")).toBeUndefined();
  });
  it("Śaśa: Śani in Makara, 10th; not in Kumbha, 11th", () => {
    expect(find(yogasOf(0, { SA: 9 }), "sasa")?.strength).toBe("full");
    expect(find(yogasOf(0, { SA: 10 }), "sasa")).toBeUndefined();
  });
});

describe("Kemadruma and its four cancellations", () => {
  it("Y-6: only Sūrya and the nodes beside Candra → full hit, nothing cancels it", () => {
    const hits = runYogas(chart(0, {}, KEMA));
    expect(find(hits, "kemadruma")?.strength).toBe("full");
    expect(hits.some((h) => h.id.startsWith("kemadruma-bhanga"))).toBe(false);
  });
  it("Y-7: Śukra in the 2nd from Candra → miss", () => {
    expect(find(yogasOf(0, { VE: 3 }, KEMA), "kemadruma")).toBeUndefined();
  });
  it("cancelled by a graha in a kendra from the Lagna", () => {
    const hits = yogasOf(0, { SA: 0 }, KEMA);
    expect(find(hits, "kemadruma")).toMatchObject({ strength: "cancelled", cancelledBy: "kemadruma-bhanga-kendra-lagna" });
    expect(find(hits, "kemadruma-bhanga-kendra-lagna")?.strength).toBe("full");
  });
  it("cancelled by a graha in a kendra from Candra", () => {
    const hits = yogasOf(0, { SA: 5 }, KEMA);
    expect(find(hits, "kemadruma")?.cancelledBy).toBe("kemadruma-bhanga-kendra-moon");
  });
  it("cancelled by a graha joining Candra", () => {
    const hits = yogasOf(0, { SA: 2 }, KEMA);
    expect(find(hits, "kemadruma")?.cancelledBy).toBe("kemadruma-bhanga-conjunct");
    expect(find(hits, "kemadruma-bhanga-kendra-moon")).toBeUndefined();
  });
  it("cancelled by Guru's aspect on Candra", () => {
    const hits = yogasOf(0, { JU: 10 }, KEMA);
    expect(find(hits, "kemadruma")?.cancelledBy).toBe("kemadruma-bhanga-guru-drishti");
  });
  it("negative: no cancellation fires without Kemadruma", () => {
    const hits = yogasOf(0, { VE: 3, SA: 0, JU: 10 }, KEMA);
    expect(hits.some((h) => h.id.startsWith("kemadruma"))).toBe(false);
  });
});

describe("Sunaphā / Anaphā / Durudharā", () => {
  it("2nd only → Sunaphā; 12th only → Anaphā; both → Durudharā alone", () => {
    expect(find(yogasOf(0, { VE: 3 }, KEMA), "sunapha")?.because[0]).toMatchObject({ grahaId: "VE", house: 2 });
    expect(find(yogasOf(0, { VE: 1 }, KEMA), "anapha")).toBeDefined();
    const both = yogasOf(0, { VE: 3, MA: 1 }, KEMA);
    expect(find(both, "durudhara")).toBeDefined();
    expect(find(both, "sunapha")).toBeUndefined();
    expect(find(both, "anapha")).toBeUndefined();
  });
  it("negative: nothing beside Candra", () => {
    const hits = yogasOf(0, {}, KEMA);
    for (const id of ["sunapha", "anapha", "durudhara"]) expect(find(hits, id)).toBeUndefined();
  });
});

describe("Veśi / Vāśi / Ubhayacarī", () => {
  it("2nd from Sūrya → Veśi; 12th → Vāśi; both → Ubhayacarī", () => {
    expect(find(yogasOf(0, { VE: 2 }, KEMA), "vesi")).toBeDefined();
    expect(find(yogasOf(0, { VE: 0 }, KEMA), "vasi")).toBeDefined();
    const both = yogasOf(0, { VE: 2, MA: 0 }, KEMA);
    expect(find(both, "ubhayacari")).toBeDefined();
    expect(find(both, "vesi")).toBeUndefined();
  });
  it("negative: Candra beside Sūrya does not count", () => {
    const hits = yogasOf(0, { MO: 2 }, KEMA);
    for (const id of ["vesi", "vasi", "ubhayacari"]) expect(find(hits, id)).toBeUndefined();
  });
});

describe("Kāla-Sarpa", () => {
  const hemmed: At = { RA: [0, 10], SU: 1, MO: 2, MA: 3, ME: 1, JU: 4, VE: 5, SA: [6, 5] };
  it("Y-8: all seven between Rāhu and Ketu, going forward → hit", () => {
    const h = find(yogasOf(0, {}, hemmed), "kala-sarpa");
    expect(h?.strength).toBe("full");
    expect(h?.because.some((b) => b.note.includes("from Rāhu forward to Ketu"))).toBe(true);
  });
  it("the other hemisphere (Ketu → Rāhu) is also hemmed and says so", () => {
    const h = find(yogasOf(0, { SU: 7, MO: 8, MA: 9, ME: 7, JU: 10, VE: 11, SA: 11 }, hemmed), "kala-sarpa");
    expect(h?.because.some((b) => b.note.includes("Kāla-Amṛta"))).toBe(true);
  });
  it("Y-9: one graha exactly on Rāhu's degree → miss, with a near-boundary note", () => {
    const core = chart(0, { SA: [0, 10] }, hemmed);
    expect(find(runYogas(core), "kala-sarpa")).toBeUndefined();
    const k = kalaSarpaCheck(core);
    expect(k.onAxis).toEqual(["SA"]);
    expect(k.note).toContain("near boundary");
  });
  it("negative: grahas on both sides", () => {
    expect(find(yogasOf(0, { SA: 9 }, hemmed), "kala-sarpa")).toBeUndefined();
  });
});

describe("Manglik (Kuja doṣa) and its cancellations", () => {
  const M: At = { ...BASE, MA: 6, JU: 1, SA: 1, MO: 2, VE: 2 };
  it("Y-10: Maṅgala in the 7th from the Lagna → hit, standard cancellations enumerated", () => {
    const h = find(yogasOf(0, {}, M), "manglik");
    expect(h?.strength).toBe("full");
    expect(h?.because.filter((b) => b.note.startsWith("standard cancellation"))).toHaveLength(6);
    expect(h?.because.some((b) => b.note.includes("never applied"))).toBe(true);
    expect(h?.because.filter((b) => b.grahaId === "MA")).toHaveLength(3); // Lagna, Candra, Śukra
  });
  it("from Candra only → partial", () => {
    expect(find(yogasOf(0, { MA: 2, MO: 2, VE: 0 }), "manglik")?.strength).toBe("partial");
  });
  it("negative: Maṅgala in the 3rd from Lagna, Candra and Śukra", () => {
    expect(find(yogasOf(0, { MA: 2, MO: 0, VE: 0 }), "manglik")).toBeUndefined();
  });
  it("cancelled: Maṅgala in its own sign", () => {
    expect(find(yogasOf(0, { MA: 0 }, M), "manglik")?.cancelledBy).toBe("manglik-bhanga-own-sign");
  });
  it("cancelled: Maṅgala in the 2nd in Mithuna", () => {
    expect(find(yogasOf(1, { MA: 2 }, M), "manglik")?.cancelledBy).toBe("manglik-bhanga-budha-rashi");
  });
  it("cancelled: Guru aspects Maṅgala", () => {
    expect(find(yogasOf(0, { JU: 2 }, M), "manglik")?.cancelledBy).toBe("manglik-bhanga-guru-drishti");
  });
  it("cancelled: Śani in a kendra from Maṅgala", () => {
    expect(find(yogasOf(0, { SA: 9 }, M), "manglik")?.cancelledBy).toBe("manglik-bhanga-shani-kendra");
  });
  it("negative: no cancellation rule fires without Kuja doṣa", () => {
    const hits = yogasOf(2, { MA: 0, MO: 2, VE: 2, JU: 4, SA: 3 });
    expect(hits.some((h) => h.id.startsWith("manglik"))).toBe(false);
  });
});

describe("Graha Yuddha", () => {
  it("two star-planets within 1°: the northern one is the victor", () => {
    const h = find(
      yogasOf(0, { MA: { sign: 10, deg: 11.52, lat: 0.4 }, SA: { sign: 10, deg: 11.9, lat: -1.2 } }),
      "graha-yuddha",
    );
    expect(h?.because.some((b) => b.note.includes("Maṅgala lies further north"))).toBe(true);
    const flipped = find(
      yogasOf(0, { MA: { sign: 10, deg: 11.52, lat: -1.2 }, SA: { sign: 10, deg: 11.9, lat: 0.4 } }),
      "graha-yuddha",
    );
    expect(flipped?.because.some((b) => b.note.includes("Śani lies further north"))).toBe(true);
  });
  it("negative: 1.5° apart", () => {
    expect(find(yogasOf(0, { MA: [10, 10], SA: [10, 11.5] }), "graha-yuddha")).toBeUndefined();
  });
});

describe("Adhi", () => {
  it("all three benefics in the 6th–8th from Candra → full; two → partial", () => {
    expect(find(yogasOf(0, { MO: 0, ME: 5, JU: 6, VE: 7 }), "adhi")?.strength).toBe("full");
    expect(find(yogasOf(0, { MO: 0, ME: 5, JU: 6, VE: 1 }), "adhi")?.strength).toBe("partial");
  });
  it("negative: one benefic", () => {
    expect(find(yogasOf(0, { MO: 0, ME: 5, JU: 1, VE: 1 }), "adhi")).toBeUndefined();
  });
});

describe("Amalā", () => {
  it("only a benefic in the 10th from the Lagna → hit", () => {
    expect(find(yogasOf(0, { MO: 0, VE: 9 }), "amala")).toBeDefined();
  });
  it("negative: a malefic shares the 10th", () => {
    expect(find(yogasOf(0, { MO: 0, VE: 9, SA: 9 }), "amala")).toBeUndefined();
  });
});

describe("Nīca-Bhaṅga Rāja", () => {
  it("Sūrya debilitated in Tulā, its dispositor Śukra in a kendra → hit", () => {
    const h = find(yogasOf(0, { SU: 6, VE: 0, MO: 1 }), "nica-bhanga-raja");
    expect(h?.because[0]).toMatchObject({ grahaId: "SU", note: "Sūrya debilitated in Tulā" });
  });
  it("negative: debilitated Sūrya with no helper in a kendra", () => {
    expect(
      find(yogasOf(0, { SU: 6, MO: 1, VE: 2, MA: 5, SA: 8, ME: 5, JU: 1 }), "nica-bhanga-raja"),
    ).toBeUndefined();
  });
});

describe("Viparīta Rāja", () => {
  it("the 6th lord in the 6th → hit", () => {
    expect(find(yogasOf(0, { ME: 5 }), "viparita-raja")?.because[0]?.note).toContain("Harṣa");
  });
  it("negative: lords of 6, 8, 12 all in the 1st", () => {
    expect(find(yogasOf(0, { ME: 0, MA: 0, JU: 0 }), "viparita-raja")).toBeUndefined();
  });
});

describe("Dharma-Karmādhipati", () => {
  it("lords of 9 and 10 together → full; in exchange → full; opposite → partial", () => {
    expect(find(yogasOf(0, { JU: 4, SA: 4 }), "dharma-karmadhipati")?.strength).toBe("full");
    expect(find(yogasOf(0, { JU: 9, SA: 8 }), "dharma-karmadhipati")?.strength).toBe("full");
    expect(find(yogasOf(0, { JU: 0, SA: 6 }), "dharma-karmadhipati")?.strength).toBe("partial");
  });
  it("negative: apart; and one graha owning both (Vṛṣabha Lagna) is not this yoga", () => {
    expect(find(yogasOf(0, { JU: 1, SA: 3 }), "dharma-karmadhipati")).toBeUndefined();
    expect(find(yogasOf(1, { SA: 9 }), "dharma-karmadhipati")).toBeUndefined();
  });
});

describe("Parivartana", () => {
  it("Maṅgala and Śukra exchange (houses 1 and 2) → Mahā, full", () => {
    const h = find(yogasOf(0, { MA: 1, VE: 0 }), "parivartana");
    expect(h?.strength).toBe("full");
    expect(h?.because[1]?.note).toContain("Mahā");
  });
  it("exchange touching the 6th → Dainya, partial", () => {
    expect(find(yogasOf(0, { MA: 5, ME: 0 }), "parivartana")?.strength).toBe("partial");
  });
  it("negative: no exchange", () => {
    expect(find(yogasOf(0, { MA: 1, VE: 3 }), "parivartana")).toBeUndefined();
  });
});

describe("runYogas output", () => {
  const core = referenceChart();
  const hits = runYogas(core);

  it("orders full, then partial, then cancelled, then by id", () => {
    const rank = { full: 0, partial: 1, cancelled: 2 } as const;
    for (let i = 1; i < hits.length; i++) {
      const a = hits[i - 1];
      const b = hits[i];
      if (!a || !b) continue;
      expect(rank[a.strength] < rank[b.strength] || (rank[a.strength] === rank[b.strength] && a.id < b.id)).toBe(true);
    }
  });

  it("reads the §0.1a reference chart as expected", () => {
    const yuddha = find(hits, "graha-yuddha");
    expect(yuddha?.because[0]?.note).toBe("Maṅgala and Śani 23″ apart");
    expect(find(hits, "malavya")?.strength).toBe("full"); // Śukra exalted in Mīna, the 1st
    expect(find(hits, "budha-aditya")?.strength).toBe("full"); // Budha 27° from Sūrya: not combust
    expect(find(hits, "manglik")?.strength).toBe("cancelled"); // Maṅgala 12th; Guru's 5th aspect
    expect(find(hits, "manglik")?.cancelledBy).toBe("manglik-bhanga-guru-drishti");
    expect(find(hits, "parivartana")?.strength).toBe("partial"); // Guru ↔ Śukra, touching the 8th
    expect(find(hits, "anapha")).toBeDefined();
    expect(find(hits, "kala-sarpa")).toBeUndefined();
  });

  it("every hit carries evidence, a citation and a 'Tradition says' sentence free of banned words", () => {
    const charts = [core, chart(0, {}, KEMA), chart(0, { SA: 0 }, KEMA), chart(0, { MA: 6, JU: 2 })];
    for (const c of charts) {
      for (const h of runYogas(c)) {
        expect(h.because.length).toBeGreaterThan(0);
        expect(h.citation.ref.length).toBeGreaterThan(0);
        expect(h.reading.startsWith("Tradition says")).toBe(true);
        const text = [h.reading, ...h.because.map((b) => b.note)].join(" ").toLowerCase();
        for (const w of BANNED_WORDS) expect(text, `${h.id}: "${w}"`).not.toContain(w);
      }
    }
  });

  it("cancelled hits render the cancellation sentence", () => {
    const m = find(hits, "manglik");
    expect(m?.reading).toMatch(/^Tradition says .*Kuja/);
  });

  it("is deterministic", () => {
    const again = JSON.stringify(runYogas(referenceChart()));
    expect(again).toBe(JSON.stringify(hits));
  });
});
