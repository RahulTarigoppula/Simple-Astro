import { describe, expect, it } from "vitest";
import citations from "../data/citations.json";
import {
  brahmaMuhurta,
  CHOGHADIYA_CITATION,
  CHOGHADIYA_CYCLE,
  choghadiya,
  godhuli,
  HORA_CITATION,
  HORA_CYCLE,
  horas,
  MUHURTA_KALA_CITATION,
  periodAt,
} from "./muhurta";

const RISE = Date.UTC(2026, 9, 12, 0, 39); // 06:09 IST
const SET = Date.UTC(2026, 9, 12, 12, 37);
const NEXT = Date.UTC(2026, 9, 13, 0, 39);
type W = 0 | 1 | 2 | 3 | 4 | 5 | 6;

// The printed choghaḍiyā tables (Ravivāra … Śanivāra), day and night.
const DAY: Record<W, string> = {
  0: "Udvega Cara Lābha Amṛta Kāla Śubha Roga Udvega",
  1: "Amṛta Kāla Śubha Roga Udvega Cara Lābha Amṛta",
  2: "Roga Udvega Cara Lābha Amṛta Kāla Śubha Roga",
  3: "Lābha Amṛta Kāla Śubha Roga Udvega Cara Lābha",
  4: "Śubha Roga Udvega Cara Lābha Amṛta Kāla Śubha",
  5: "Cara Lābha Amṛta Kāla Śubha Roga Udvega Cara",
  6: "Kāla Śubha Roga Udvega Cara Lābha Amṛta Kāla",
};
const NIGHT: Record<W, string> = {
  0: "Śubha Amṛta Cara Roga Kāla Lābha Udvega Śubha",
  1: "Cara Roga Kāla Lābha Udvega Śubha Amṛta Cara",
  2: "Kāla Lābha Udvega Śubha Amṛta Cara Roga Kāla",
  3: "Udvega Śubha Amṛta Cara Roga Kāla Lābha Udvega",
  4: "Amṛta Cara Roga Kāla Lābha Udvega Śubha Amṛta",
  5: "Roga Kāla Lābha Udvega Śubha Amṛta Cara Roga",
  6: "Lābha Udvega Śubha Amṛta Cara Roga Kāla Lābha",
};

describe("choghaḍiyā", () => {
  it("Sunday's day opens with Udvega and Monday's with Amṛta", () => {
    expect(choghadiya(RISE, SET, NEXT, 0).day[0]?.name).toBe("Udvega");
    expect(choghadiya(RISE, SET, NEXT, 1).day[0]?.name).toBe("Amṛta");
  });
  it("Sunday's day does not open with Amṛta, nor Monday's with Udvega", () => {
    expect(choghadiya(RISE, SET, NEXT, 0).day[0]?.name).not.toBe("Amṛta");
    expect(choghadiya(RISE, SET, NEXT, 1).day[0]?.name).not.toBe("Udvega");
  });
  it.each([0, 1, 2, 3, 4, 5, 6] as const)("weekday %i matches the printed day and night tables", (w) => {
    const c = choghadiya(RISE, SET, NEXT, w);
    expect(c.day.map((x) => x.name).join(" ")).toBe(DAY[w]);
    expect(c.night.map((x) => x.name).join(" ")).toBe(NIGHT[w]);
  });
  it("splits the day and the night into eight equal, contiguous parts", () => {
    const c = choghadiya(RISE, SET, NEXT, 3);
    expect(c.day).toHaveLength(8);
    expect(c.night).toHaveLength(8);
    expect(c.day[0]?.startMs).toBe(RISE);
    expect(c.day[7]?.endMs).toBe(SET);
    expect(c.night[0]?.startMs).toBe(SET);
    expect(c.night[7]?.endMs).toBe(NEXT);
    for (let i = 1; i < 8; i++) expect(c.day[i]?.startMs).toBeCloseTo(c.day[i - 1]?.endMs ?? 0, 6);
    expect((c.day[0]?.endMs ?? 0) - RISE).toBeCloseTo((SET - RISE) / 8, 6);
  });
  it("grades Amṛta, Śubha, Lābha good; Cara neutral; Udvega, Kāla, Roga bad", () => {
    const q = Object.fromEntries(choghadiya(RISE, SET, NEXT, 0).day.map((c) => [c.name, c.quality]));
    expect(q).toEqual({ Udvega: "bad", Cara: "neutral", Lābha: "good", Amṛta: "good", Kāla: "bad", Śubha: "good", Roga: "bad" });
    expect(CHOGHADIYA_CYCLE).toHaveLength(7);
  });
});

describe("horā", () => {
  it("the first horā of the day is the weekday lord's", () => {
    const lords = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"];
    for (const w of [0, 1, 2, 3, 4, 5, 6] as const) expect(horas(RISE, SET, NEXT, w).day[0]?.lord).toBe(lords[w]);
    expect(horas(RISE, SET, NEXT, 0).day[0]?.lord).not.toBe("MO");
  });
  it("runs in Chaldean order through the night and hands the 25th horā to the next weekday's lord", () => {
    const h = horas(RISE, SET, NEXT, 0);
    expect(h.day.map((x) => x.lord).slice(0, 8)).toEqual(["SU", "VE", "ME", "MO", "SA", "JU", "MA", "SU"]);
    expect(h.day).toHaveLength(12);
    expect(h.night).toHaveLength(12);
    expect(h.night[0]?.lord).toBe(HORA_CYCLE[12 % 7]);
    const after = HORA_CYCLE[(HORA_CYCLE.indexOf(h.night[11]?.lord ?? "SU") + 1) % 7];
    expect(after).toBe(horas(RISE, SET, NEXT, 1).day[0]?.lord);
    expect(h.night[11]?.endMs).toBe(NEXT);
  });
});

describe("Brahma-muhūrta and Godhūli", () => {
  it("Brahma-muhūrta is 96 → 48 minutes before sunrise", () => {
    expect(brahmaMuhurta(RISE)).toEqual([RISE - 96 * 60_000, RISE - 48 * 60_000]);
    expect(brahmaMuhurta(RISE)[1]).toBeLessThan(RISE);
  });
  it("Godhūli is a ghaṭī centred on sunset", () => {
    const [a, b] = godhuli(SET);
    expect(b - a).toBe(24 * 60_000);
    expect(a < SET && SET < b).toBe(true);
  });
  it("periodAt finds the running part and −1 outside", () => {
    const c = choghadiya(RISE, SET, NEXT, 0).day;
    expect(periodAt(c, RISE)).toBe(0);
    expect(periodAt(c, SET - 1)).toBe(7);
    expect(periodAt(c, SET)).toBe(-1);
    expect(periodAt(c, RISE - 1)).toBe(-1);
  });
  it("every citation resolves", () => {
    const known = new Set(citations.entries.map((e) => `${e.text}|${e.ref}`));
    for (const c of [CHOGHADIYA_CITATION, HORA_CITATION, MUHURTA_KALA_CITATION]) expect(known.has(`${c.text}|${c.ref}`)).toBe(true);
  });
});
