import { describe, expect, it } from "vitest";
import { BANNED_WORDS } from "../test/banned-words";
import { computePatri, REFERENCE_PROFILE } from "./patri";
import {
  ACTIVITIES,
  bestWindow,
  CANDRA_SET_ASIDE,
  type DaySky,
  daySkies,
  isVishti,
  nextGoodDay,
  PICK_CITATION,
  type PickPerson,
  personOf,
  pickDays,
  pickTone,
  rankDays,
  scoreDay,
  starClassOf,
  TARA_SET_ASIDE,
  tithiGroupOf,
} from "./pickday";
import { DEFAULT_PRESET, type SignIdx } from "./types";

const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
const person = personOf(patri);
const BLR = { lat: 12.9716, lon: 77.5946 };
const Z = "Asia/Kolkata";
const AT = Date.UTC(2026, 10, 17, 4); // Tue 17 Nov 2026, 09:30 IST
const ist = (ms: number) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 16);
const base = { fromMs: AT, place: BLR, zone: Z, preset: DEFAULT_PRESET } as const;

// A made-up clean day: a Thursday, Śukla Pañcamī (Pūrṇā), Moon in Puṣya (swift), no flaw.
const H = 3_600_000;
const CLEAN: DaySky = {
  startMs: 0,
  noonMs: 12 * H,
  weekday: 4,
  tithi: { index: 5, name: "Śukla Pañcamī", group: "purna", newMoon: false },
  star: { index: 7, name: "Puṣya", cls: "swift" },
  moonSign: 3,
  badYoga: null,
  vishti: null,
  sunriseMs: 6 * H,
  sunsetMs: 18 * H,
  nextSunriseMs: 30 * H,
  rahuKaal: [13.5 * H, 15 * H],
  abhijit: [11.6 * H, 12.4 * H],
};
const withTithi = (index: number): DaySky => ({
  ...CLEAN,
  tithi: { index, name: `tithi ${index}`, group: tithiGroupOf(index), newMoon: index === 30 },
});
/** A person for whom the made-up day's star is the n-th tārā and its Moon sign the h-th house. */
const personAt = (tara: number, house: number): PickPerson => ({
  nakshatra: (CLEAN.star.index - (tara - 1) + 27) % 27,
  sign: ((CLEAN.moonSign - (house - 1) + 12) % 12) as SignIdx,
});

describe("the classical tables", () => {
  it("groups the lunar days Nandā, Bhadrā, Jayā, Riktā, Pūrṇā in both fortnights", () => {
    expect([1, 6, 11, 16, 21, 26].map(tithiGroupOf)).toEqual(Array(6).fill("nanda"));
    expect([2, 7, 12, 17].map(tithiGroupOf)).toEqual(Array(4).fill("bhadra"));
    expect([3, 8, 13, 18].map(tithiGroupOf)).toEqual(Array(4).fill("jaya"));
    expect([4, 9, 14, 19, 24, 29].map(tithiGroupOf)).toEqual(Array(6).fill("rikta"));
    expect([5, 10, 15, 20, 25, 30].map(tithiGroupOf)).toEqual(Array(6).fill("purna"));
  });

  it("classes all 27 stars: 4 fixed, 5 movable, 5 fierce, 2 mixed, 3 swift, 4 soft, 4 sharp", () => {
    const count: Record<string, number> = {};
    for (let n = 0; n < 27; n++) count[starClassOf(n)] = (count[starClassOf(n)] ?? 0) + 1;
    expect(count).toEqual({ fixed: 4, movable: 5, fierce: 5, mixed: 2, swift: 3, soft: 4, sharp: 4 });
    expect(starClassOf(3)).toBe("fixed"); // Rohiṇī
    expect(starClassOf(14)).toBe("movable"); // Svātī
    expect(starClassOf(18)).toBe("sharp"); // Mūla
    expect(starClassOf(26)).toBe("soft"); // Revatī
  });

  it("knows the eight Viṣṭi half-days of a lunar month", () => {
    const all = Array.from({ length: 60 }, (_, i) => i + 1).filter(isVishti);
    expect(all).toEqual([8, 15, 22, 29, 36, 43, 50, 57]);
  });

  it("cites the muhūrta tradition", () => {
    expect(PICK_CITATION).toEqual({ text: "Muhūrta tradition", ref: "Choosing a day" });
  });
});

describe("weighing one day", () => {
  it("a Riktā lunar day lowers the score, names itself and keeps the day from reading Strong", () => {
    for (const a of ACTIVITIES) {
      const good = scoreDay(withTithi(5), a.id, null);
      for (const t of [4, 9, 14, 19, 24, 29]) {
        const rikta = scoreDay(withTithi(t), a.id, null);
        expect(rikta.score, `${a.id} tithi ${t}`).toBeLessThan(good.score);
        expect(rikta.against.some((r) => r.factor === "tithi" && r.term.startsWith("Riktā") && r.setAside)).toBe(true);
        expect(rikta.setAside).toBe(true);
        expect(rikta.tone).not.toBe("bright");
      }
      expect(good.against.some((r) => r.factor === "tithi")).toBe(false);
      expect(good.for.some((r) => r.factor === "tithi" && r.term.startsWith("Pūrṇā"))).toBe(true);
    }
  });

  it("the new Moon is set aside too", () => {
    const d = scoreDay(withTithi(30), "new", null);
    expect(d.against[0]).toMatchObject({ factor: "tithi", term: "Amāvasyā", setAside: true });
    expect(d.score).toBeLessThan(scoreDay(withTithi(5), "new", null).score);
  });

  it("flags the 3rd, 5th and 7th tārā and no other", () => {
    for (let tara = 1; tara <= 9; tara++) {
      const d = scoreDay(CLEAN, "new", personAt(tara, 1));
      expect(d.tara).toBe(tara);
      const flagged = d.against.some((r) => r.factor === "tara" && r.setAside);
      expect(flagged, `tārā ${tara}`).toBe(TARA_SET_ASIDE.includes(tara));
      expect(d.setAside).toBe(flagged);
    }
    expect(TARA_SET_ASIDE).toEqual([3, 5, 7]);
    expect(scoreDay(CLEAN, "new", personAt(3, 1)).score).toBeLessThan(scoreDay(CLEAN, "new", personAt(2, 1)).score);
  });

  it("flags the Moon in the 4th, 8th and 12th from the birth Moon sign and no other", () => {
    for (let house = 1; house <= 12; house++) {
      const d = scoreDay(CLEAN, "travel", personAt(2, house));
      expect(d.candraHouse).toBe(house);
      const flagged = d.against.some((r) => r.factor === "candra" && r.setAside);
      expect(flagged, `house ${house}`).toBe(CANDRA_SET_ASIDE.includes(house));
    }
    expect(CANDRA_SET_ASIDE).toEqual([4, 8, 12]);
    expect(scoreDay(CLEAN, "travel", personAt(2, 8)).score).toBeLessThan(scoreDay(CLEAN, "travel", personAt(2, 7)).score);
  });

  it("marks Vyatīpāta, Vaidhṛti and Viṣṭi against the day", () => {
    const clean = scoreDay(CLEAN, "new", null);
    const yoga = scoreDay({ ...CLEAN, badYoga: "Vyatīpāta" }, "new", null);
    const noon = scoreDay({ ...CLEAN, vishti: "noon" }, "new", null);
    const partly = scoreDay({ ...CLEAN, vishti: "part" }, "new", null);
    expect(clean.against).toEqual([]);
    expect(clean.tone).toBe("bright");
    expect(yoga.against[0]).toMatchObject({ factor: "yoga", term: "Vyatīpāta yoga" });
    expect(noon.against[0]).toMatchObject({ factor: "karana", term: "Viṣṭi karaṇa (Bhadrā)", setAside: true });
    expect(yoga.score).toBeLessThan(clean.score);
    expect(noon.score).toBeLessThan(partly.score);
    expect(partly.score).toBeLessThan(clean.score);
    expect(partly.setAside).toBe(false);
  });

  it("matches the star to the undertaking: a fixed star suits a house and not a journey", () => {
    const rohini: DaySky = { ...CLEAN, star: { index: 3, name: "Rohiṇī", cls: "fixed" } };
    const svati: DaySky = { ...CLEAN, star: { index: 14, name: "Svātī", cls: "movable" } };
    expect(scoreDay(rohini, "home", null).score).toBeGreaterThan(scoreDay(svati, "home", null).score);
    expect(scoreDay(svati, "travel", null).score).toBeGreaterThan(scoreDay(rohini, "travel", null).score);
    expect(scoreDay(rohini, "travel", null).against[0]?.text).toMatch(/steady star/);
    const mula: DaySky = { ...CLEAN, star: { index: 18, name: "Mūla", cls: "sharp" } };
    for (const a of ACTIVITIES) expect(scoreDay(mula, a.id, null).score).toBeLessThan(scoreDay(CLEAN, a.id, null).score);
  });

  it("weekday: Tuesday and Saturday count against a beginning, Thursday for it", () => {
    const thu = scoreDay(CLEAN, "new", null);
    const tue = scoreDay({ ...CLEAN, weekday: 2 }, "new", null);
    expect(tue.score).toBeLessThan(thu.score);
    expect(tue.against[0]).toMatchObject({ factor: "weekday", term: "Maṅgalavāra" });
    expect(thu.for.some((r) => r.factor === "weekday" && r.text.startsWith("Thursday"))).toBe(true);
  });

  it("keeps the score within 0 and 1 for every combination, with a tone on the four-word scale", () => {
    for (const a of ACTIVITIES)
      for (let t = 1; t <= 30; t += 1)
        for (let wd = 0; wd < 7; wd++)
          for (let n = 0; n < 27; n += 2) {
            const sky: DaySky = {
              ...withTithi(t),
              weekday: wd as DaySky["weekday"],
              star: { index: n, name: "x", cls: starClassOf(n) },
              badYoga: t % 7 === 0 ? "Vaidhṛti" : null,
              vishti: n % 9 === 0 ? "noon" : n % 5 === 0 ? "part" : null,
            };
            for (const p of [null, personAt((n % 9) + 1, (t % 12) + 1)]) {
              const d = scoreDay(sky, a.id, p);
              expect(d.score).toBeGreaterThanOrEqual(0);
              expect(d.score).toBeLessThanOrEqual(1);
              expect(d.tone).toBe(pickTone(d.score));
              if (d.setAside) expect(d.tone).not.toBe("bright");
            }
          }
    expect([1, 0.675, 0.5, 0.33, 0].map(pickTone)).toEqual(["bright", "bright", "steady", "mixed", "testing"]);
  });

  it("offers a window in daylight, clear of Rāhu Kāla", () => {
    for (const a of ACTIVITIES) {
      const w = bestWindow(CLEAN, a.id);
      expect(w).not.toBeNull();
      if (!w) continue;
      expect(w.startMs).toBeGreaterThanOrEqual(CLEAN.sunriseMs);
      expect(w.endMs).toBeLessThanOrEqual(CLEAN.sunsetMs);
      expect(w.endMs <= CLEAN.rahuKaal[0] || w.startMs >= CLEAN.rahuKaal[1]).toBe(true);
    }
  });
});

describe("a range of days for the reference person", () => {
  const days = pickDays({ ...base, activity: "new", person });

  it("walks 45 civil days from today in the reader's zone", () => {
    expect(days).toHaveLength(45);
    expect(ist(days[0]?.startMs ?? 0)).toBe("2026-11-17T00:00");
    expect(ist(days[44]?.startMs ?? 0)).toBe("2026-12-31T00:00");
    expect(days[0]?.sky.weekday).toBe(2); // a Tuesday
    for (const [i, d] of days.entries()) {
      expect(d.sky.weekday).toBe((2 + i) % 7);
      expect(d.noonMs - d.startMs).toBe(12 * H);
      expect(d.sky.sunriseMs).toBeGreaterThan(d.startMs);
      expect(d.sky.sunsetMs).toBeLessThan(d.startMs + 24 * H);
    }
  });

  it("is deterministic", () => {
    const again = pickDays({ ...base, activity: "new", person });
    expect(again).toEqual(days);
    expect(nextGoodDay({ ...base, activity: "new", person })).toEqual(nextGoodDay({ ...base, activity: "new", person }));
  });

  it("is sane: bounded, varied, personal, with reasons on every day", () => {
    const tones = new Set(days.map((d) => d.tone));
    expect(tones.size).toBeGreaterThanOrEqual(3);
    expect(days.some((d) => d.tone === "bright")).toBe(true);
    expect(days.some((d) => d.setAside)).toBe(true);
    for (const d of days) {
      expect(d.score).toBeGreaterThanOrEqual(0);
      expect(d.score).toBeLessThanOrEqual(1);
      expect(d.personal).toBe(true);
      expect(d.tara).toBeGreaterThanOrEqual(1);
      expect(d.tara).toBeLessThanOrEqual(9);
      expect(d.for.length + d.against.length).toBeGreaterThan(0);
      expect(d.sky.tithi.group === "rikta" || d.sky.tithi.newMoon).toBe(d.against.some((r) => r.factor === "tithi"));
      expect(TARA_SET_ASIDE.includes(d.tara ?? 0)).toBe(d.against.some((r) => r.factor === "tara"));
      expect(CANDRA_SET_ASIDE.includes(d.candraHouse ?? 0)).toBe(d.against.some((r) => r.factor === "candra"));
      if (d.tone === "bright") expect(d.setAside).toBe(false);
    }
    // the lunar month is all there: every group of lunar day and at least one new Moon in 45 days
    expect(new Set(days.map((d) => d.sky.tithi.group)).size).toBe(5);
    expect(days.some((d) => d.sky.tithi.newMoon)).toBe(true);
    // the Moon goes round the signs, so about a quarter of the days fall in the 4th, 8th or 12th
    const aside = days.filter((d) => CANDRA_SET_ASIDE.includes(d.candraHouse ?? 0)).length;
    expect(aside).toBeGreaterThanOrEqual(7);
    expect(aside).toBeLessThanOrEqual(16);
  });

  it("ranks best first and the teaser picks the first Strong day", () => {
    const ranked = rankDays(days);
    const step = (d: (typeof ranked)[number] | undefined) => Math.round((d?.score ?? 0) * 20);
    for (let i = 1; i < ranked.length; i++) {
      expect(step(ranked[i - 1])).toBeGreaterThanOrEqual(step(ranked[i]));
      // of days as good as each other, the sooner comes first
      if (step(ranked[i - 1]) === step(ranked[i])) expect(ranked[i - 1]?.startMs).toBeLessThan(ranked[i]?.startMs ?? 0);
    }
    expect(Math.max(...days.map((d) => d.score)) - (ranked[0]?.score ?? 0)).toBeLessThan(0.05);
    const firstStrong = days.find((d) => d.tone === "bright");
    const teaser = nextGoodDay({ ...base, activity: "new", person, days: 45 });
    expect(teaser?.startMs).toBe(firstStrong?.startMs);
  });

  it("a general ranking counts nothing from a birth chart, and differs from the personal one", () => {
    const skies = daySkies(AT, 45, BLR, Z, DEFAULT_PRESET);
    const general = skies.map((s) => scoreDay(s, "new", null));
    expect(general.every((d) => !d.personal && d.tara === null && d.candraHouse === null)).toBe(true);
    expect(general.every((d) => [...d.for, ...d.against].every((r) => r.factor !== "tara" && r.factor !== "candra"))).toBe(true);
    expect(general.map((d) => d.score)).not.toEqual(days.map((d) => d.score));
  });

  it("every undertaking gives a different ranking of the same sky, in plain careful words", () => {
    const skies = daySkies(AT, 45, BLR, Z, DEFAULT_PRESET);
    const seen = new Set<string>();
    for (const a of ACTIVITIES) {
      const ds = skies.map((s) => scoreDay(s, a.id, person));
      seen.add(ds.map((d) => d.score.toFixed(3)).join());
      const text = JSON.stringify(ds.flatMap((d) => [...d.for, ...d.against])).toLowerCase() + a.label.toLowerCase() + a.phrase;
      for (const w of BANNED_WORDS) expect(text, w).not.toContain(w);
    }
    expect(ACTIVITIES).toHaveLength(8);
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });
});
