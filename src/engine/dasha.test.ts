import { describe, expect, it } from "vitest";
import fixture from "./__fixtures__/vimshottari.json";
import { currentDasha, DASHA_YEARS, dashaBalance, intervalYears, pratyantars, vimshottari } from "./dasha";
import type { DashaNode, GrahaId } from "./types";

const YEAR = 365.25 * 86_400_000;
const DAY = 86_400_000;
const ref = fixture.reference;
const birthMs = Date.parse(ref.birthUtc);
const tree = vimshottari(ref.moonLonSid, birthMs, 365.25);
const isoDate = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

describe("reference chart (§6.8 worked example)", () => {
  it("lord, fraction, balance", () => {
    const b = dashaBalance(ref.moonLonSid);
    expect(b.lord).toBe(ref.lord);
    expect(b.fraction).toBeCloseTo(ref.fraction, 5); // §6.8 used the unrounded Moon
    expect(Math.abs(b.balanceYears - ref.balanceYears)).toBeLessThan(1e-4);
    expect(b.balanceYears * 365.25).toBeCloseTo(ref.balanceDays, 1);
  });

  it("Budha MD ends 2008-01-04 ≈ 08:02 IST (±10 min) and the nominal start is 1991-01-04", () => {
    const md = tree[0] as DashaNode;
    expect(md.lord).toBe("ME");
    expect(Math.abs(md.endMs - Date.parse(ref.mdEndUtc))).toBeLessThan(10 * 60_000);
    expect(isoDate(md.startMs + 5.5 * 3_600_000)).toBe(ref.nominalMdStartDate);
    expect(tree.map((n) => n.lord)).toEqual(["ME", "KE", "VE", "SU", "MO", "MA", "RA", "JU", "SA"]);
  });

  it("antar lengths inside Budha", () => {
    const md = tree[0] as DashaNode;
    for (const ad of md.children ?? []) {
      expect(intervalYears(ad, 365.25)).toBeCloseTo(ref.adLengthsInBudha[ad.lord as keyof typeof ref.adLengthsInBudha], 5);
    }
    expect((birthMs - md.startMs) / YEAR).toBeCloseTo(ref.elapsedYears, 4);
  });

  it("at birth: Budha – Ketu – Śani with the documented dates (±1 day)", () => {
    const cur = currentDasha(tree, birthMs);
    expect(cur?.md.lord).toBe("ME");
    expect(cur?.ad.lord).toBe(ref.adAtBirth.lord);
    expect(Math.abs((cur?.ad.startMs ?? 0) - Date.parse(ref.adAtBirth.startDate))).toBeLessThan(DAY);
    expect(Math.abs((cur?.ad.endMs ?? 0) - Date.parse(ref.adAtBirth.endUtc))).toBeLessThan(30 * 60_000);
    expect(cur?.pd.lord).toBe(ref.pdAtBirth.lord);
    expect(intervalYears(cur?.pd as DashaNode, 365.25)).toBeCloseTo(ref.pdAtBirth.years, 5);
    expect(Math.abs((cur?.pd.startMs ?? 0) - Date.parse(ref.pdAtBirth.startDate))).toBeLessThan(DAY);
    expect(Math.abs((cur?.pd.endMs ?? 0) - Date.parse(ref.pdAtBirth.endDate))).toBeLessThan(DAY);
  });
});

describe("second fixture: Moon at 176.2° (Citrā, Maṅgala)", () => {
  const c = fixture.chitra;
  const t = vimshottari(c.moonLonSid, 0, 365.25);

  it("balance and MD order", () => {
    const b = dashaBalance(c.moonLonSid);
    expect(b.lord).toBe(c.lord);
    expect(b.fraction).toBeCloseTo(c.fraction, 7);
    expect(b.balanceYears).toBeCloseTo(c.balanceYears, 6);
    expect(((t[0]?.endMs ?? 0) - 0) / DAY).toBeCloseTo(c.balanceDays365, 2);
    expect(t.map((n) => n.lord)).toEqual(c.mdOrder);
    const t360 = vimshottari(c.moonLonSid, 0, 360);
    expect((t360[0]?.endMs ?? 0) / DAY).toBeCloseTo(c.balanceDays360, 2);
  });

  it("antar lengths and the antar at birth", () => {
    const md = t[0] as DashaNode;
    for (const ad of md.children ?? []) {
      expect(intervalYears(ad, 365.25)).toBeCloseTo(c.adLengthsInMangala[ad.lord as keyof typeof c.adLengthsInMangala], 5);
    }
    const cur = currentDasha(t, 0);
    expect(cur?.ad.lord).toBe(c.adAtBirth);
    expect(((cur?.ad.endMs ?? 0) - 0) / YEAR).toBeCloseTo(c.adRemainingYears, 5);
  });
});

describe("invariants (VD-1…VD-5)", () => {
  it("Σ MD = 120 yr; every AD sums exactly to its MD and every PD to its AD; no gaps", () => {
    const span = ((tree[8]?.endMs ?? 0) - (tree[0]?.startMs ?? 0)) / YEAR;
    expect(Math.abs(span - 120)).toBeLessThan(1e-9);
    expect(Object.values(DASHA_YEARS).reduce((a, b) => a + b, 0)).toBe(120);
    let intervals = 0;
    for (let i = 0; i < tree.length; i++) {
      const md = tree[i] as DashaNode;
      if (i > 0) expect(md.startMs).toBe(tree[i - 1]?.endMs);
      const ads = md.children ?? [];
      expect(ads).toHaveLength(9);
      expect(ads[0]?.startMs).toBe(md.startMs);
      expect(ads[8]?.endMs).toBe(md.endMs);
      for (let j = 0; j < ads.length; j++) {
        const ad = ads[j] as DashaNode;
        if (j > 0) expect(ad.startMs).toBe(ads[j - 1]?.endMs);
        const pds = pratyantars(md, ad, 365.25);
        expect(pds[0]?.startMs).toBe(ad.startMs);
        expect(pds[8]?.endMs).toBe(ad.endMs);
        for (let k = 1; k < 9; k++) expect(pds[k]?.startMs).toBe(pds[k - 1]?.endMs);
        expect(pds.every((p) => p.level === 3 && p.endMs > p.startMs)).toBe(true);
        expect(pds[0]?.lord).toBe(ad.lord);
        intervals += pds.length;
      }
    }
    expect(intervals).toBe(729);
  });

  it("VD-2: a nakshatra's exact start gives the full period; the cycle is a rotation", () => {
    const b = dashaBalance(0);
    expect(b).toEqual({ lord: "KE", fraction: 0, balanceYears: 7 });
    const t = vimshottari(0, 0, 365.25);
    expect(t[0]?.startMs).toBe(0);
    const order: GrahaId[] = ["KE", "VE", "SU", "MO", "MA", "RA", "JU", "SA", "ME"];
    expect(t.map((n) => n.lord)).toEqual(order);
  });

  it("VD-4: half-open — a boundary instant belongs to the later interval at all levels", () => {
    const md1 = tree[1] as DashaNode;
    const cur = currentDasha(tree, md1.startMs);
    expect(cur?.md.lord).toBe(md1.lord);
    expect(cur?.ad.lord).toBe(md1.lord);
    expect(cur?.pd.lord).toBe(md1.lord);
    expect(currentDasha(tree, md1.startMs - 1)?.md.lord).toBe((tree[0] as DashaNode).lord);
    expect(currentDasha(tree, (tree[8] as DashaNode).endMs)).toBeNull();
    expect(currentDasha(tree, (tree[0] as DashaNode).startMs - 1)).toBeNull();
  });

  it("VD-5: 360-day years scale every interval by exactly 360/365.25", () => {
    const t360 = vimshottari(ref.moonLonSid, birthMs, 360);
    for (let i = 0; i < 9; i++) {
      const a = tree[i] as DashaNode;
      const b = t360[i] as DashaNode;
      expect((b.endMs - b.startMs) / (a.endMs - a.startMs)).toBeCloseTo(360 / 365.25, 12);
    }
  });
});
