// Every citation a rule can emit resolves to an entry in src/data/citations.json.
import { describe, expect, it } from "vitest";
import citations from "../data/citations.json";
import { BANNED_WORDS } from "../test/banned-words";
import { referenceChart } from "./__fixtures__/synthetic";
import { kootas, signOfPada } from "./ashtakoota";
import { CITE } from "./citations";
import { MANGLIK_CANCELLATIONS, manglikStatus } from "./manglik";
import { PALM_RULES } from "./reading";
import type { Citation } from "./types";
import { YOGA_RULES } from "./yogas";

const key = (c: Citation): string => `${c.text}|${c.ref}`;
const known = new Set(citations.entries.map((e) => key(e)));

describe("citations.json", () => {
  it("entries are unique and described, and every work is described", () => {
    expect(known.size).toBe(citations.entries.length);
    const works = citations.works as Record<string, string>;
    for (const e of citations.entries) {
      expect(e.description.length, key(e)).toBeGreaterThan(20);
      expect(works[e.text], e.text).toBeDefined();
    }
  });

  it("every CITE constant resolves", () => {
    for (const c of Object.values(CITE)) expect(known.has(key(c)), key(c)).toBe(true);
  });

  it("every citation used by yogas, kootas, Manglik and palm rules resolves", () => {
    const used: Citation[] = [
      ...YOGA_RULES.map((r) => r.citation),
      ...MANGLIK_CANCELLATIONS.map((c) => c.citation),
      manglikStatus(referenceChart()).citation,
      ...Object.values(PALM_RULES).map((r) => r.citation),
    ];
    for (let n = 0; n < 27; n++) {
      for (const k of kootas({ nak: n, pada: 1, sign: signOfPada(n, 1) }, { nak: 0, pada: 2, sign: 0 })) {
        used.push(k.citation);
        if (k.cancellation) used.push(k.cancellation.citation);
      }
    }
    for (const c of used) expect(known.has(key(c)), key(c)).toBe(true);
  });

  it("contains no banned word", () => {
    const text = JSON.stringify(citations).toLowerCase();
    for (const w of BANNED_WORDS) expect(text).not.toContain(w);
  });
});
