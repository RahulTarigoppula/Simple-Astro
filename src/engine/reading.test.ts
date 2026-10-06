// The composer: determinism, the opening phrase, citations, measurements in palm sentences, and the
// banned-word scan over the entire TEMPLATES table (§2.3.6).
import { describe, expect, it } from "vitest";
import { BANNED_WORDS } from "../test/banned-words";
import { referenceChart } from "./__fixtures__/synthetic";
import { ashtakoota, signOfPada } from "./ashtakoota";
import {
  compose,
  fill,
  type Hit,
  hitsFromMilan,
  hitsFromYogas,
  MAX_SENTENCES,
  PALM_RULE_IDS,
  PALM_RULES,
  palmSentence,
  TEMPLATES,
} from "./reading";
import { runYogas, YOGA_RULES } from "./yogas";

const scan = (text: string): string[] => BANNED_WORDS.filter((w) => text.toLowerCase().includes(w));

describe("TEMPLATES", () => {
  it("contains no banned word anywhere (case-insensitive substring)", () => {
    for (const [key, list] of Object.entries(TEMPLATES)) {
      expect(scan(key), key).toEqual([]);
      for (const t of list) expect(scan(t), t).toEqual([]);
    }
  });

  it("every variant opens with 'Tradition says' and ends with a full stop", () => {
    for (const [key, list] of Object.entries(TEMPLATES)) {
      expect(list.length, key).toBeGreaterThanOrEqual(2);
      for (const t of list) {
        expect(t.startsWith("Tradition says "), t).toBe(true);
        expect(t.endsWith("."), t).toBe(true);
      }
    }
  });

  it("has a template for every yoga rule and every palm rule", () => {
    for (const r of YOGA_RULES) expect(TEMPLATES[r.id], r.id).toBeDefined();
    for (const id of PALM_RULE_IDS) expect(TEMPLATES[id], id).toBeDefined();
    expect(TEMPLATES.cancelled).toBeDefined();
  });

  it("palm templates print every value their rule declares", () => {
    for (const id of PALM_RULE_IDS) {
      for (const t of TEMPLATES[id] ?? []) {
        for (const key of PALM_RULES[id].values) expect(t, `${id}: {${key}}`).toContain(`{${key}}`);
      }
    }
  });

  it("fill() refuses a missing value rather than printing a placeholder", () => {
    expect(() => fill("Tradition says {x}.", {})).toThrow(/missing/);
  });
});

describe("compose()", () => {
  const core = referenceChart();
  const yogaHits = hitsFromYogas(runYogas(core));
  const milan = ashtakoota("a", "b", { nak: 26, pada: 1, sign: 11 }, { nak: 3, pada: 1, sign: signOfPada(3, 1) }, "h");
  const palmHits: Hit[] = [
    { id: "heart-long", weight: 2, values: { lengthRatio: "0.92", depth: "0.61" }, citation: PALM_RULES["heart-long"].citation },
    { id: "element-water", weight: 2, values: { widthOverLength: "0.81", fingerOverPalm: "0.93" }, citation: PALM_RULES["element-water"].citation },
    { id: "thumb-firm", weight: 1, values: { thumbAngleDeg: "38" }, citation: PALM_RULES["thumb-firm"].citation },
  ];
  const all = [...yogaHits, ...hitsFromMilan(milan), ...palmHits];
  const seed = `${core.profileId}|${core.presetHash}|v1`;

  it("is byte-identical across 100 runs", () => {
    const first = JSON.stringify(compose(all, seed));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(compose(all, seed))).toBe(first);
  });

  it("does not depend on input order and does not mutate its input", () => {
    const copy = [...all];
    const forward = JSON.stringify(compose(all, seed));
    expect(JSON.stringify(compose([...all].reverse(), seed))).toBe(forward);
    expect(all).toEqual(copy);
  });

  it("caps at MAX_SENTENCES, opens every sentence with 'Tradition says', carries a citation", () => {
    const out = compose(all, seed);
    expect(out.length).toBe(Math.min(MAX_SENTENCES, all.length));
    for (const s of out) {
      expect(s.text.startsWith("Tradition says")).toBe(true);
      expect(s.citation.text.length).toBeGreaterThan(0);
      expect(scan(s.text)).toEqual([]);
    }
  });

  it("a different seed may choose different variants but the same rules", () => {
    const a = compose(palmHits, "seed-a").map((s) => s.ruleId);
    const b = compose(palmHits, "seed-b").map((s) => s.ruleId);
    expect(a).toEqual(b);
  });

  it("orders by weight, then id", () => {
    const out = compose(palmHits, seed);
    expect(out.map((s) => s.ruleId)).toEqual(["element-water", "heart-long", "thumb-firm"]);
  });

  it("Milan notes lead with the doṣa", () => {
    const notes = compose(hitsFromMilan(milan), seed);
    expect(notes[0]?.ruleId).toBe("koota-nadi");
    for (const n of notes) expect(scan(n.text)).toEqual([]);
  });
});

describe("palmSentence()", () => {
  it("prints the measurement inside the canonical sentence", () => {
    const s = palmSentence("heart-long", { lengthRatio: 0.92, depth: 0.61 });
    expect(s.text).toBe(
      "Tradition says a long, deep heart line (0.92 of palm width, depth 0.61) speaks of steadiness in affection.",
    );
    expect(s.measured).toBe("lengthRatio 0.92 · depth 0.61");
    expect(s.citation).toEqual({ text: "Sāmudrika Śāstra", ref: "Hṛdaya-rekhā" });
  });

  it("low confidence changes the wording, not the claim", () => {
    const s = palmSentence("life-wide", { arcRatio: 0.42, confidence: 0.4 });
    expect(s.text).toBe(
      "Tradition says a life line sweeping wide into the palm (arc 0.42 of palm width) is read as an outgoing, energetic temperament — the life line is faint in this print; trace it to confirm.",
    );
    const sure = palmSentence("life-wide", { arcRatio: 0.42, confidence: 0.9 });
    expect(sure.text.endsWith("energetic temperament.")).toBe(true);
  });

  it("rounds degrees and refuses missing values", () => {
    expect(palmSentence("thumb-flexible", { thumbAngleDeg: 61.6 }).text).toContain("(62° of spread)");
    expect(() => palmSentence("head-long", { lengthRatio: 0.8 })).toThrow(/depth/);
  });

  it("every palm rule renders with sample values, every variant, without banned words", () => {
    const sample: Record<string, number> = {
      widthOverLength: 0.9,
      fingerOverPalm: 0.8,
      lengthRatio: 0.85,
      depth: 0.5,
      curvature: 0.3,
      slopeDeg: 18,
      arcRatio: 0.4,
      indexOverRing: 0.97,
      thumbAngleDeg: 45,
    };
    for (const id of PALM_RULE_IDS) {
      for (let v = 0; v < 20; v++) {
        const s = palmSentence(id, { ...sample, confidence: v % 2 === 0 ? 0.3 : 0.9 }, `seed-${v}`);
        expect(s.text.startsWith("Tradition says")).toBe(true);
        expect(scan(s.text)).toEqual([]);
      }
    }
  });

  it("is deterministic for a seed", () => {
    const a = palmSentence("head-sloping", { slopeDeg: 22 }, "p1");
    for (let i = 0; i < 100; i++) expect(palmSentence("head-sloping", { slopeDeg: 22 }, "p1")).toEqual(a);
  });
});
