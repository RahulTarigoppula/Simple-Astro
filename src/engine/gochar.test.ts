import { beforeAll, describe, expect, it } from "vitest";
import { SLACK } from "../test/perf";
import {
  CHANDRA_BALA_HOUSES,
  chandraBala,
  currentDashaSummary,
  GOCHAR_FAVOURABLE,
  gocharReport,
  isGocharFavourable,
  moonTransitAt,
  type SadeSatiResult,
  sadeSati,
  saturnSignIntervals,
  taraBala,
  transitsAt,
  vedhaBy,
} from "./gochar";
import { MS_PER_DAY } from "./math";
import { computePatri, REFERENCE_PROFILE } from "./patri";
import { DEFAULT_PRESET, type EnginePreset, GRAHA_IDS, type Patri } from "./types";

const YEAR = 365.25 * MS_PER_DAY;
const iso = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

let patri: Patri;
let ss: SadeSatiResult;
let ssMs = 0;
const birth = REFERENCE_PROFILE.birth.utcMs;

beforeAll(() => {
  patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
  sadeSati(patri, birth - 3 * YEAR, birth + 100 * YEAR); // warm the JIT
  const t0 = performance.now();
  ss = sadeSati(patri, birth - 3 * YEAR, birth + 100 * YEAR);
  ssMs = performance.now() - t0;
});

describe("transitsAt", () => {
  it("at the birth instant equals the natal grahas to 1″", () => {
    const tr = transitsAt(birth, DEFAULT_PRESET);
    for (const id of GRAHA_IDS) {
      const n = patri.grahas[id];
      expect(Math.abs(tr[id].lonSidereal - n.lonSidereal) * 3600, id).toBeLessThan(1);
      expect(tr[id].sign).toBe(n.sign);
      expect(tr[id].nakshatra).toBe(n.nakshatra);
      expect(tr[id].pada).toBe(n.pada);
      expect(tr[id].retrograde).toBe(n.retrograde);
    }
  });
  it("honours the node and ayanāṃśa presets", () => {
    const mean: EnginePreset = { ...DEFAULT_PRESET, node: "mean" };
    const p2 = computePatri(REFERENCE_PROFILE, mean, 0);
    expect(Math.abs(transitsAt(birth, mean).RA.lonSidereal - p2.grahas.RA.lonSidereal) * 3600).toBeLessThan(1);
    const drik: EnginePreset = { ...DEFAULT_PRESET, ayanamsa: "drik-mean" };
    const p3 = computePatri(REFERENCE_PROFILE, drik, 0);
    expect(Math.abs(transitsAt(birth, drik).SA.lonSidereal - p3.grahas.SA.lonSidereal) * 3600).toBeLessThan(1);
  });
  it("is deterministic and Ketu stays opposite Rāhu", () => {
    const t = Date.UTC(2026, 9, 12, 6);
    const a = transitsAt(t, DEFAULT_PRESET);
    expect(transitsAt(t, DEFAULT_PRESET)).toEqual(a);
    expect((a.KE.lonSidereal - a.RA.lonSidereal + 360) % 360).toBeCloseTo(180, 9);
  });
  it("moonTransitAt equals transitsAt(...).MO, and differs a day later", () => {
    const t = Date.UTC(2026, 9, 12, 6);
    expect(moonTransitAt(t, DEFAULT_PRESET)).toEqual(transitsAt(t, DEFAULT_PRESET).MO);
    expect(moonTransitAt(t + MS_PER_DAY, DEFAULT_PRESET).lonSidereal).not.toBeCloseTo(moonTransitAt(t, DEFAULT_PRESET).lonSidereal, 1);
  });
});

describe("gocharReport", () => {
  it("counts houses from the natal Moon and Lagna", () => {
    const at = Date.UTC(2026, 9, 12, 6);
    const r = gocharReport(patri, at);
    expect(r.moonSign).toBe(11); // Mīna
    expect(r.entries).toHaveLength(9);
    for (const e of r.entries) {
      expect(e.houseFromMoon).toBe(((e.transit.sign - 11 + 12) % 12) + 1);
      expect(e.houseFromLagna).toBe(((e.transit.sign - patri.lagna.sign + 12) % 12) + 1);
      expect(e.favourable).toBe(GOCHAR_FAVOURABLE[e.id].includes(e.houseFromMoon));
      if (!e.favourable) expect(e.vedha).toBeNull();
      expect(e.effective).toBe(e.favourable && (e.vedha == null || e.vedha.by.length === 0));
    }
    expect(r.citation).toEqual({ text: "Phaladīpikā", ref: "ch. 26" });
  });
  it("favourable-house table: positives and negatives", () => {
    expect(isGocharFavourable("SU", 3)).toBe(true);
    expect(isGocharFavourable("SU", 1)).toBe(false);
    expect(isGocharFavourable("MO", 7)).toBe(true);
    expect(isGocharFavourable("MO", 8)).toBe(false);
    expect(isGocharFavourable("JU", 9)).toBe(true);
    expect(isGocharFavourable("JU", 10)).toBe(false);
    expect(isGocharFavourable("VE", 12)).toBe(true);
    expect(isGocharFavourable("VE", 6)).toBe(false);
    expect(isGocharFavourable("SA", 11)).toBe(true);
    expect(isGocharFavourable("SA", 12)).toBe(false);
    expect(isGocharFavourable("RA", 6)).toBe(true);
    expect(isGocharFavourable("KE", 1)).toBe(false);
  });
  it("vedha: obstructs, spares the father-son pairs, and is silent for the nodes", () => {
    // Guru in the 11th is obstructed by any graha but itself in the 8th.
    expect(vedhaBy("JU", 11, { JU: 11, MA: 8 })).toEqual(["MA"]);
    expect(vedhaBy("JU", 11, { JU: 11, MA: 7 })).toEqual([]);
    // Sūrya in the 3rd is obstructed from the 9th, but never by Śani.
    expect(vedhaBy("SU", 3, { SU: 3, SA: 9 })).toEqual([]);
    expect(vedhaBy("SU", 3, { SU: 3, VE: 9 })).toEqual(["VE"]);
    // Candra and Budha spare each other.
    expect(vedhaBy("MO", 1, { MO: 1, ME: 5 })).toEqual([]);
    expect(vedhaBy("MO", 1, { MO: 1, JU: 5 })).toEqual(["JU"]);
    // the nodes neither receive vedha nor obstruct
    expect(vedhaBy("RA", 3, { RA: 3, SA: 12 })).toBeNull();
    expect(vedhaBy("SA", 3, { SA: 3, RA: 12, KE: 12 })).toEqual([]);
    // no vedha pair for an unfavourable house
    expect(vedhaBy("SA", 1, { SA: 1 })).toBeNull();
  });
});

describe("sadeSati, reference chart (Moon in Mīna)", () => {
  const spellAround = (y: number) =>
    ss.spells.find((s) => s.kind === "sade-sati" && s.startMs < Date.UTC(y, 0, 1) && s.endMs > Date.UTC(y, 0, 1));

  it("computes a 103-year window in under 300 ms", () => {
    expect(ssMs).toBeLessThan(300 * SLACK);
  });

  it("finds Śani's Kumbha-Mīna-Meṣa spell around 2022-2030", () => {
    const s = spellAround(2026);
    expect(s).toBeDefined();
    if (!s) return;
    // Engine values (se-true, true node): Kumbha first 2022-04-28, Meṣa finally left 2029/30.
    expect(s.startMs).toBeGreaterThan(Date.UTC(2022, 0, 1));
    expect(s.startMs).toBeLessThan(Date.UTC(2022, 6, 1));
    expect(s.endMs).toBeGreaterThan(Date.UTC(2029, 5, 1));
    expect(s.endMs).toBeLessThan(Date.UTC(2030, 11, 31));
    expect(s.intervals.map((i) => i.sign)).toContain(10);
    expect(s.intervals.map((i) => i.sign)).toContain(0);
    // Mīna (peak) ingress: engine gives 2025-03-29; assert ± 15 days.
    const peak = s.phases.peak?.[0];
    expect(peak).toBeDefined();
    if (peak) expect(Math.abs(peak[0] - Date.UTC(2025, 2, 29)) / MS_PER_DAY).toBeLessThan(15);
  });

  it("handles retrograde re-entry: Kumbha entered, left and re-entered in 2022-23", () => {
    const s = spellAround(2026);
    if (!s) throw new Error("no spell");
    const rising = s.phases.rising ?? [];
    expect(rising.length).toBeGreaterThanOrEqual(2); // [Apr-Jul 2022], [Jan 2023 - Mar 2025]
    expect(iso(rising[0]?.[0] ?? 0).slice(0, 4)).toBe("2022");
    expect(iso(rising[1]?.[0] ?? 0).slice(0, 4)).toBe("2023");
    // the spell is one spell despite the gap in Makara
    expect(s.intervals[0]?.sign).toBe(10);
    // intervals are contiguous within each phase run and strictly ordered
    for (let i = 1; i < s.intervals.length; i++) {
      expect(s.intervals[i]?.startMs ?? 0).toBeGreaterThanOrEqual(s.intervals[i - 1]?.endMs ?? 0);
    }
  });

  it("finds the earlier spell (c. 1993-2000) and the next one (c. 2051-2058)", () => {
    const at = (y: number) => spellAround(y);
    expect(at(1997)).toBeDefined(); // Śani over Kumbha-Mīna-Meṣa in the 1990s
    expect(at(2055)).toBeDefined();
    // nothing in, say, 2010
    expect(at(2010)).toBeUndefined();
  });

  it("lists Kaṇṭaka (4th = Mithuna) and Aṣṭama (8th = Tulā) spells", () => {
    const k = ss.spells.filter((s) => s.kind === "kantaka");
    const a = ss.spells.filter((s) => s.kind === "ashtama");
    expect(k.length).toBeGreaterThanOrEqual(3);
    expect(a.length).toBeGreaterThanOrEqual(3);
    for (const s of k) for (const i of s.intervals) expect(i.sign).toBe(2);
    for (const s of a) for (const i of s.intervals) expect(i.sign).toBe(6);
    // Śani in sidereal Tulā c. Nov 2011 - Nov 2014
    expect(a.some((s) => s.startMs < Date.UTC(2013, 0, 1) && s.endMs > Date.UTC(2013, 0, 1))).toBe(true);
    // never in Aṣṭama during the Sāḍe-sātī
    expect(a.some((s) => s.startMs < Date.UTC(2026, 0, 1) && s.endMs > Date.UTC(2026, 0, 1))).toBe(false);
  });

  it("covers the window gap-free and is deterministic", () => {
    const xs = ss.saturnSigns;
    expect(xs[0]?.startMs).toBe(ss.fromMs);
    expect(xs[xs.length - 1]?.endMs).toBe(ss.toMs);
    for (let i = 1; i < xs.length; i++) {
      expect(xs[i]?.startMs).toBe(xs[i - 1]?.endMs);
      const d = ((xs[i]?.sign ?? 0) - (xs[i - 1]?.sign ?? 0) + 12) % 12;
      expect(d === 1 || d === 11).toBe(true); // only neighbouring signs
    }
    const again = sadeSati(patri, birth - 3 * YEAR, birth + 100 * YEAR);
    expect(again).toEqual(ss);
  });

  it("ingress instants sit on the sign edge", () => {
    const xs = saturnSignIntervals(Date.UTC(2024, 0, 1), Date.UTC(2026, 0, 1), DEFAULT_PRESET);
    const ingress = xs[1]?.startMs ?? 0;
    const before = transitsAt(ingress - 120_000, DEFAULT_PRESET).SA;
    const after = transitsAt(ingress + 120_000, DEFAULT_PRESET).SA;
    expect(before.sign).toBe(10);
    expect(after.sign).toBe(11);
  });
});

describe("taraBala", () => {
  it("counts inclusively and reduces by nine", () => {
    expect(taraBala(5, 5)).toMatchObject({ tara: 1, name: "Janma", round: 1, tone: "mixed" });
    expect(taraBala(5, 6)).toMatchObject({ tara: 2, name: "Sampat", tone: "kind" });
    expect(taraBala(5, 7)).toMatchObject({ tara: 3, name: "Vipat", tone: "unkind" });
    expect(taraBala(5, 9)).toMatchObject({ tara: 5, tone: "unkind" });
    expect(taraBala(5, 11)).toMatchObject({ tara: 7, name: "Vadha", tone: "unkind" });
    expect(taraBala(5, 13)).toMatchObject({ tara: 9, name: "Parama-Mitra", tone: "kind", round: 1 });
    expect(taraBala(5, 14)).toMatchObject({ tara: 1, round: 2 });
    expect(taraBala(26, 0)).toMatchObject({ tara: 2, round: 1 }); // wraps past Revatī
    expect(taraBala(1, 0)).toMatchObject({ tara: 9, round: 3 });
    expect(taraBala(0, 0).citation.text).toBe("Muhūrta Cintāmaṇi");
  });
});

describe("chandraBala", () => {
  it("supports 1, 3, 6, 7, 10, 11 from the natal Moon and not the rest", () => {
    for (let s = 0; s < 12; s++) {
      const c = chandraBala(11, s as 0);
      expect(c.house).toBe(((s - 11 + 12) % 12) + 1);
      expect(c.favourable).toBe(CHANDRA_BALA_HOUSES.includes(c.house));
    }
    expect(chandraBala(11, 11).favourable).toBe(true); // 1st
    expect(chandraBala(11, 0).favourable).toBe(false); // 2nd
    expect(chandraBala(11, 7).favourable).toBe(false); // 9th
    expect(chandraBala(11, 9).favourable).toBe(true); // 11th
  });
});

describe("currentDashaSummary", () => {
  it("names MD/AD/PD with fractions and the next change", () => {
    const at = Date.UTC(2026, 9, 12);
    const d = currentDashaSummary(patri, at);
    expect(d).not.toBeNull();
    if (!d) return;
    for (const l of [d.md, d.ad, d.pd]) {
      expect(l.startMs).toBeLessThanOrEqual(at);
      expect(l.endMs).toBeGreaterThan(at);
      expect(l.fraction).toBeGreaterThanOrEqual(0);
      expect(l.fraction).toBeLessThan(1);
    }
    expect(d.nextChangeMs).toBe(d.pd.endMs);
    const next = currentDashaSummary(patri, d.nextChangeMs);
    expect(next?.pd.startMs).toBe(d.nextChangeMs);
    expect(next?.pd.lord).not.toBe(d.pd.lord);
  });
  it("is null outside the 120-year tree", () => {
    expect(currentDashaSummary(patri, birth + 130 * YEAR)).toBeNull();
  });
});
