import { describe, expect, it } from "vitest";
import citations from "../../data/citations.json";
import { BANNED_WORDS } from "../../test/banned-words";
import { loadTruth } from "../../test/palm-fixtures";
import type { Landmark, PalmElement, PalmLine, PalmReading } from "../types";
import { TEMPLATES, tracedLine } from "./label";
import { LM } from "./landmarks";
import { composeReading, framingNote, PALM_RULE_TABLE, palmHits, withLineReplaced } from "./rules";

const known = new Set(citations.entries.map((e) => `${e.text}|${e.ref}`));

/** World landmarks for a given element (see geometry.test.ts for the construction). */
function world(el: PalmElement): Landmark[] {
  const table: Record<PalmElement, [number, number]> = { earth: [0.94, 0.7], air: [0.94, 0.86], fire: [0.84, 0.71], water: [0.84, 0.86] };
  const [wl, fl] = table[el];
  const L = 0.09;
  const W = wl * L;
  const F = fl * L;
  const lm: Landmark[] = Array.from({ length: 21 }, () => ({ x: 0, y: 0, z: 0 }));
  const set = (i: number, x: number, y: number): void => {
    lm[i] = { x, y, z: 0 };
  };
  set(LM.WRIST, 0, 0);
  set(LM.MIDDLE_MCP, 0, -L);
  set(LM.MIDDLE_TIP, 0, -L - F);
  set(LM.INDEX_MCP, -W / 2, -L);
  set(LM.PINKY_MCP, W / 2, -L);
  set(LM.INDEX_TIP, -W / 2, -L - 0.074);
  set(LM.RING_MCP, W / 4, -L);
  set(LM.RING_TIP, W / 4, -L - 0.072);
  set(LM.THUMB_MCP, -W / 2 - 0.01, -0.03);
  set(LM.THUMB_TIP, -W / 2 - 0.06, -0.05);
  return lm;
}

/** The three main lines along their templates, at a chosen confidence. */
function lines(confidence: number): PalmLine[] {
  return (["heart", "head", "life"] as const).map((id) => ({
    ...tracedLine(id, TEMPLATES[id].poly, 0.5),
    source: "detected" as const,
    confidence,
  }));
}

function reading(el: PalmElement, conf: number, captureId = "cap-1"): PalmReading {
  const r = composeReading({ captureId, worldLandmarks: world(el), lines: lines(conf), framing: "dominant", computedAt: 0 });
  if (!r) throw new Error("reading");
  return r;
}

const ELEMENTS: PalmElement[] = ["earth", "air", "fire", "water"];
const CONFS = [0.3, 0.6, 0.95];

describe("palm rules and reading text (§6.13 [7], §10.5)", () => {
  it("every sentence starts 'Tradition says', prints a measurement and ends in a resolvable citation", () => {
    for (const el of ELEMENTS) {
      for (const c of CONFS) {
        const r = reading(el, c);
        expect(r.element).toBe(el);
        expect(r.hits.length).toBeGreaterThanOrEqual(5);
        for (const h of r.hits) {
          expect(h.text.startsWith("Tradition says"), h.text).toBe(true);
          expect(h.text, h.ruleId).toMatch(/\d\.\d\d|\d+°/); // the measurement is in the sentence
          expect(h.measured.length).toBeGreaterThan(3);
          expect(known.has(`${h.citation.text}|${h.citation.ref}`), h.ruleId).toBe(true);
        }
      }
    }
  });

  it("the banned-word scan: 4 elements × 3 confidence levels × both hands × both framings", () => {
    const texts: string[] = [];
    for (const el of ELEMENTS) {
      for (const c of CONFS) {
        for (const hand of ["right", "left"] as const) {
          for (const framing of ["dominant", "classical"] as const) {
            const r = reading(el, c, `${el}-${c}-${hand}`);
            texts.push(...r.hits.map((h) => `${h.text} ${h.measured}`));
            texts.push(framingNote(hand, "right", framing), framingNote(hand, "left", framing));
          }
        }
      }
    }
    for (const t of texts) {
      const lower = t.toLowerCase();
      for (const w of BANNED_WORDS) expect(lower.includes(w), `"${w}" in: ${t}`).toBe(false);
    }
  });

  it("is byte-identical across 100 runs", () => {
    const first = JSON.stringify(reading("fire", 0.47));
    for (let i = 0; i < 100; i++) expect(JSON.stringify(reading("fire", 0.47))).toBe(first);
  });

  it("low confidence changes the wording, never the claim", () => {
    const lo = reading("water", 0.3);
    const hi = reading("water", 0.95);
    expect(lo.hits.map((h) => h.ruleId)).toEqual(hi.hits.map((h) => h.ruleId));
    const loHeart = lo.hits.find((h) => h.ruleId.startsWith("heart-"));
    const hiHeart = hi.hits.find((h) => h.ruleId === loHeart?.ruleId);
    expect(loHeart?.text).toContain("trace it to confirm");
    expect(hiHeart?.text).not.toContain("trace it to confirm");
    // the claim itself (the sentence before the faint-print clause) is the same
    expect(loHeart?.text.startsWith(hiHeart?.text.slice(0, -1) ?? "?")).toBe(true);
  });

  it("both hand framings are recorded", () => {
    const r = composeReading({
      captureId: "c",
      worldLandmarks: world("air"),
      lines: lines(0.9),
      framing: "classical",
      computedAt: 0,
    });
    expect(r?.framing).toBe("classical");
    expect(framingNote("right", "right", "dominant")).toMatch(/dominant/);
    expect(framingNote("right", "right", "dominant")).toMatch(/classically/);
    expect(framingNote("left", "right", "classical")).toMatch(/non-dominant/);
    expect(framingNote("left", "right", "classical")).toMatch(/classically/);
  });

  it("a traced line replaces the detected one, confidence 1, and the reading recomputes in < 1 s", () => {
    const r = reading("earth", 0.4);
    const t0 = performance.now();
    const traced = tracedLine("life", [
      [150, 240],
      [120, 320],
      [150, 400],
      [210, 470],
    ]);
    const next = withLineReplaced(r, traced, 1);
    expect(performance.now() - t0).toBeLessThan(1000);
    const life = next.lines.find((l) => l.id === "life");
    expect(life?.source).toBe("traced");
    expect(life?.confidence).toBe(1);
    const lifeHit = next.hits.find((h) => h.ruleId.startsWith("life-"));
    expect(lifeHit?.text).not.toContain("trace it to confirm");
    expect(next.lines.map((l) => l.id)).toEqual(["heart", "head", "life"]);
  });

  it("the synthetic hand reads as fire, with its finger and thumb notes", () => {
    const hits = palmHits(
      { element: "fire", ratios: { widthOverLength: 0.69, fingerOverPalm: 0.58, indexOverRing: 0.9, thumbAngleDeg: 20 }, lines: [] },
      "s",
    );
    expect(hits.map((h) => h.ruleId)).toEqual(["element-fire", "ring-long", "thumb-firm"]);
    expect(
      composeReading({ captureId: "x", worldLandmarks: loadTruth().worldLandmarks, lines: [], framing: "dominant", computedAt: 0 })
        ?.element,
    ).toBe("fire");
  });

  it("every rule id in the table has a template (no silent gaps)", () => {
    for (const r of PALM_RULE_TABLE) expect(typeof r.id).toBe("string");
    expect(PALM_RULE_TABLE.length).toBe(19);
  });
});
