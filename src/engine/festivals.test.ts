import { describe, expect, it } from "vitest";
import { daysUntil, EKADASHI_NAMES, FESTIVALS, festivalsBetween, festivalsOfYear, lunarMonthsBetween, nextFestival } from "./festivals";
import { DEFAULT_PRESET } from "./types";

const DEL = { lat: 28.6139, lon: 77.209 };
const BLR = { lat: 12.9716, lon: 77.5946 };
const IST = "Asia/Kolkata";
const P = DEFAULT_PRESET;

/** The civil date of a row in India. */
const ymd = (ms: number) => new Date(ms + 5.5 * 3_600_000).toISOString().slice(0, 10);
const istMs = (y: number, m: number, d: number, h = 0) => Date.UTC(y, m - 1, d, h) - 5.5 * 3_600_000;

function datesOf(year: number, place: { lat: number; lon: number }): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const f of festivalsOfYear(year, place, IST, P)) {
    const list = out[f.id] ?? [];
    list.push(ymd(f.dateMs));
    out[f.id] = list;
  }
  return out;
}

describe("lunar months", () => {
  const months = lunarMonthsBetween(istMs(2026, 1, 1), istMs(2027, 12, 31), P.ayanamsa);

  it("finds the leap Jyeṣṭha of 2026, from the new moon of 17 May to that of 15 June", () => {
    const leap = months.filter((m) => m.adhika);
    expect(leap).toHaveLength(1);
    expect(leap[0]?.masa).toBe(2);
    expect(ymd(leap[0]?.startMs ?? 0)).toBe("2026-05-17");
    expect(ymd(leap[0]?.endMs ?? 0)).toBe("2026-06-15");
    // The true Jyeṣṭha follows it, and no month is lost.
    const after = months[months.indexOf(leap[0] as (typeof months)[number]) + 1];
    expect(after?.masa).toBe(2);
    expect(after?.adhika).toBe(false);
    expect(months.some((m) => m.kshaya)).toBe(false);
  });

  it("names the months in order, each a lunation long, end to end", () => {
    for (let i = 1; i < months.length; i++) {
      const a = months[i - 1];
      const b = months[i];
      if (!a || !b) continue;
      expect(b.startMs).toBe(a.endMs);
      expect((a.endMs - a.startMs) / 86_400_000).toBeGreaterThan(29.2);
      expect((a.endMs - a.startMs) / 86_400_000).toBeLessThan(29.9);
      expect(b.masa).toBe(a.adhika ? a.masa : (a.masa + 1) % 12);
    }
    // Caitra opens at the new moon before Ugādi.
    expect(months.filter((m) => m.masa === 0).map((m) => ymd(m.startMs))).toEqual(["2026-03-19", "2027-04-07"]);
  });
});

// Published dates for India. Where a line says "disputed", the engine's honest result differs from the
// date the brief recalled, and the comment says which rule gives it.
const PUBLISHED: Record<number, Record<string, string>> = {
  2026: {
    "makara-sankranti": "2026-01-14",
    "maha-shivaratri": "2026-02-15",
    "holika-dahan": "2026-03-03", // by the Dharmasindhu's late clause: Bhadrā runs past midnight on 2 March
    holi: "2026-03-04",
    ugadi: "2026-03-19",
    "rama-navami": "2026-03-26", // midday rule: Navamī covers midday on the 26th only (the 27th is the sunrise date)
    "akshaya-tritiya": "2026-04-19", // Drik Panchang, New Delhi
    "raksha-bandhan": "2026-08-28",
    janmashtami: "2026-09-04",
    "ganesh-chaturthi": "2026-09-14",
    "vijaya-dashami": "2026-10-20",
    diwali: "2026-11-08",
    "bhai-dooj": "2026-11-11", // Drik Panchang, New Delhi
  },
  2027: {
    "makara-sankranti": "2027-01-15", // the Sun crosses at 9:10 pm on the 14th, after sunset
    "maha-shivaratri": "2027-03-06",
    "holika-dahan": "2027-03-21",
    holi: "2027-03-22",
    ugadi: "2027-04-07",
    "rama-navami": "2027-04-15",
    "akshaya-tritiya": "2027-05-09", // Drik Panchang
    "raksha-bandhan": "2027-08-17",
    // Disputed: the brief recalled 25 August. Aṣṭamī runs 24 Aug 8:25 pm to 25 Aug 7:20 pm, so it covers
    // midnight on the night of the 24th only: the midnight (Smārta) rule, and Drik Panchang, give the 24th.
    // The 25th is the sunrise (Vaiṣṇava) date that many holiday lists print.
    janmashtami: "2027-08-24",
    "ganesh-chaturthi": "2027-09-04",
    "vijaya-dashami": "2027-10-09",
    diwali: "2027-10-29",
  },
};

// The rest of the table, as the engine gives it for New Delhi: a guard against drift, checked by hand
// against the tithi spans printed in each row's rule.
const ENGINE: Record<number, Record<string, string>> = {
  2026: {
    "vasant-panchami": "2026-01-23",
    "hanuman-jayanti": "2026-04-02",
    "guru-purnima": "2026-07-29",
    "naga-panchami": "2026-08-17",
    navaratri: "2026-10-11",
    "durga-ashtami": "2026-10-19",
    "karva-chauth": "2026-10-29",
    dhanteras: "2026-11-06",
    "naraka-chaturdashi": "2026-11-08",
    chhath: "2026-11-15",
    "kartik-purnima": "2026-11-24",
  },
  2027: {
    "vasant-panchami": "2027-02-11",
    "hanuman-jayanti": "2027-04-20",
    "guru-purnima": "2027-07-18",
    "naga-panchami": "2027-08-06",
    navaratri: "2027-09-30",
    "durga-ashtami": "2027-10-07",
    "karva-chauth": "2027-10-18",
    dhanteras: "2027-10-27",
    "naraka-chaturdashi": "2027-10-28",
    chhath: "2027-11-04",
    "kartik-purnima": "2027-11-14",
  },
};

describe("festival dates against published calendars", { timeout: 30_000 }, () => {
  for (const year of [2026, 2027]) {
    it(`${year}: New Delhi matches the published dates`, () => {
      const got = datesOf(year, DEL);
      for (const [id, date] of Object.entries(PUBLISHED[year] ?? {})) expect([id, got[id]]).toEqual([id, [date]]);
    });
    it(`${year}: Bengaluru gives the same days for the same festivals`, () => {
      const got = datesOf(year, BLR);
      for (const [id, date] of Object.entries(PUBLISHED[year] ?? {})) expect([id, got[id]]).toEqual([id, [date]]);
    });
    it(`${year}: the rest of the table holds, once each`, () => {
      const got = datesOf(year, DEL);
      for (const [id, date] of Object.entries(ENGINE[year] ?? {})) expect([id, got[id]]).toEqual([id, [date]]);
      // Every festival of the table (and Holī, and Makara Saṅkrānti) falls exactly once in a civil year.
      for (const id of [...FESTIVALS.map((f) => f.id), "holi", "makara-sankranti"]) expect([id, got[id]?.length]).toEqual([id, 1]);
    });
  }

  it("is not duplicated or shifted by the leap month of 2026", () => {
    const all = festivalsOfYear(2026, DEL, IST, P);
    const inLeap = all.filter((f) => f.dateMs >= istMs(2026, 5, 18) && f.dateMs < istMs(2026, 6, 15));
    expect(inLeap.filter((f) => f.kind === "festival")).toEqual([]);
    // The monthly fasts go on through it, under the leap month's own names.
    expect(inLeap.filter((f) => f.id === "ekadashi").map((f) => [ymd(f.dateMs), f.sanskrit])).toEqual([
      ["2026-05-26", "Padminī Ekādaśī"],
      ["2026-06-11", "Paramā Ekādaśī"],
    ]);
    expect(inLeap.find((f) => f.id === "purnima")?.sanskrit).toBe("Adhika Jyeṣṭha Pūrṇimā");
    // Guru Pūrṇimā is the full moon of the Āṣāḍha that follows the true Jyeṣṭha, not a month early.
    expect(all.find((f) => f.id === "guru-purnima")?.rule).toMatch(/of Āṣāḍha is running at sunrise/);
  });
});

describe("how the day is chosen", { timeout: 30_000 }, () => {
  const y26 = festivalsOfYear(2026, DEL, IST, P);
  const y27 = festivalsOfYear(2027, DEL, IST, P);
  const rule = (list: typeof y26, id: string) => list.find((f) => f.id === id)?.rule ?? "";

  it("says so when a lunar day touches no sunrise (skipped) or two (repeated)", () => {
    // Ugādi 2026 in Delhi: Pratipadā begins after sunrise on the 19th and ends before sunrise on the 20th.
    expect(rule(y26, "ugadi")).toMatch(/runs from Thu 19 Mar, 6:5\d am to Fri 20 Mar, 4:5\d am\. It begins and ends between two sunrises/);
    // Durgā Aṣṭamī 2027: Aṣṭamī is running at the sunrises of both the 7th and the 8th.
    expect(rule(y27, "durga-ashtami")).toMatch(/That holds on two days here; the first is kept\.$/);
  });

  it("keeps the day whose midday, dusk or midnight the lunar day covers, not the sunrise day", () => {
    // Rāma Navamī 2026: at sunrise on the 26th it is still Aṣṭamī; Navamī covers midday that day.
    expect(rule(y26, "rama-navami")).toMatch(/covers the middle of the day .* from Thu 26 Mar, 11:4\d am to Fri 27 Mar, 10:0\d am\.$/);
    // Dīvālī 2026: the new-moon lunar day begins at 11:28 am on the 8th, so the 9th is the sunrise day.
    expect(rule(y26, "diwali")).toMatch(/covers dusk .* from Sun 8 Nov, 11:2\d am to Mon 9 Nov, 12:3\d pm\.$/);
    expect(rule(y26, "diwali")).toMatch(/Āśvina \(called Kārttika where months end at the full moon\)/);
    // Mahā Śivarātri 2026: Caturdaśī begins at 5:05 pm on the 15th and holds that midnight.
    expect(rule(y26, "maha-shivaratri")).toMatch(/covers midnight .* from Sun 15 Feb, 5:0\d pm/);
  });

  it("weighs two days by the festival's own tradition", () => {
    // Akṣaya Tṛtīyā: 2026 keeps the first day (the lunar day ends 1 h 37 min after the second sunrise),
    // 2027 the second (it runs 3 h 28 min past it).
    expect(rule(y26, "akshaya-tritiya")).toMatch(/the first is kept, because the lunar day ends too soon after the second sunrise\.$/);
    expect(rule(y27, "akshaya-tritiya")).toMatch(/the second is kept, because the lunar day runs well past that day's sunrise\.$/);
    // Bhāī Dūj 2026: Dvitīyā touches the afternoons of the 10th and the 11th; the 11th has more of it.
    expect(rule(y26, "bhai-dooj")).toMatch(/the day with the longer share is kept\.$/);
  });

  it("moves Holikā Dahana by Bhadrā, and Holī with it", () => {
    expect(rule(y26, "holika-dahan")).toMatch(/Bhadrā runs past midnight on the first evening.*so the next evening is kept\.$/);
    expect(rule(y27, "holika-dahan")).toMatch(/so the fire is lit late on the first evening\.$/);
    expect(rule(y26, "holi")).toBe("Kept on the morning after Holikā Dahana, which here falls on Tue 3 Mar.");
  });

  it("gives a place its own day when the lunar day ends between two places' sunrises", () => {
    // Devotthāna Ekādaśī 2026 ends at 6:32 am on 21 Nov: before Delhi's sunrise, after Bengaluru's.
    const at = (place: typeof DEL) => festivalsOfYear(2026, place, IST, P).find((f) => f.sanskrit === "Devotthāna Ekādaśī");
    expect(ymd(at(DEL)?.dateMs ?? 0)).toBe("2026-11-20");
    expect(ymd(at(BLR)?.dateMs ?? 0)).toBe("2026-11-21");
  });
});

describe("the monthly fasts, the Sun and the eclipses", { timeout: 30_000 }, () => {
  const y26 = festivalsOfYear(2026, DEL, IST, P);

  it("names every Ekādaśī from the table of twenty-four", () => {
    const names = new Set(EKADASHI_NAMES.flat().map((n) => `${n} Ekādaśī`));
    const eka = y26.filter((f) => f.id === "ekadashi");
    expect(eka.length).toBeGreaterThanOrEqual(24);
    expect(eka.length).toBeLessThanOrEqual(26);
    for (const e of eka) expect(names.has(e.sanskrit) || /^(Padminī|Paramā) Ekādaśī$/.test(e.sanskrit)).toBe(true);
    expect(eka.find((e) => e.sanskrit === "Nirjalā Ekādaśī") && ymd(eka.find((e) => e.sanskrit === "Nirjalā Ekādaśī")?.dateMs ?? 0)).toBe(
      "2026-06-25",
    );
    // About a fortnight apart, never two in a week.
    for (let i = 1; i < eka.length; i++) expect(((eka[i]?.dateMs ?? 0) - (eka[i - 1]?.dateMs ?? 0)) / 86_400_000).toBeGreaterThan(12);
  });

  it("lists the other fasts once a fortnight or once a month, and lets a festival stand in for its own fast", () => {
    const count = (id: string) => y26.filter((f) => f.id === id).length;
    expect(count("pradosha")).toBeGreaterThanOrEqual(23); // Dhanteras stands in for one
    expect(count("pradosha")).toBeLessThanOrEqual(26);
    expect(count("sankashti")).toBeGreaterThanOrEqual(11); // Karvā Cauth stands in for one
    expect(count("sankashti")).toBeLessThanOrEqual(13);
    expect(count("amavasya")).toBeGreaterThanOrEqual(12);
    // No "Full Moon day" row beside Guru Pūrṇimā or Rakṣā Bandhana.
    for (const id of ["guru-purnima", "raksha-bandhan", "kartik-purnima", "hanuman-jayanti"]) {
      const f = y26.find((x) => x.id === id);
      expect(y26.filter((x) => x.dateMs === f?.dateMs && x.id === "purnima")).toEqual([]);
    }
    for (const f of y26.filter((x) => x.id === "purnima")) expect(Math.abs(f.elongation - 180)).toBeLessThan(14);
    for (const f of y26.filter((x) => x.id === "amavasya")) expect(Math.min(f.elongation, 360 - f.elongation)).toBeLessThan(14);
  });

  it("lists the twelve saṅkrāntis and the eclipses of the year", () => {
    const solar = y26.filter((f) => f.kind === "solar");
    expect(solar).toHaveLength(11); // the twelfth is Makara Saṅkrānti, a festival
    expect(solar.find((f) => f.sanskrit === "Meṣa Saṅkrānti") && ymd(solar.find((f) => f.sanskrit === "Meṣa Saṅkrānti")?.dateMs ?? 0)).toBe(
      "2026-04-14",
    );
    expect(y26.filter((f) => f.kind === "eclipse").map((f) => [ymd(f.dateMs), f.name])).toEqual([
      ["2026-02-17", "Annular eclipse of the Sun"],
      ["2026-03-03", "Total eclipse of the Moon"],
      ["2026-08-12", "Total eclipse of the Sun"],
      ["2026-08-28", "Partial eclipse of the Moon"],
    ]);
  });
});

describe("ranges, order and cost", { timeout: 30_000 }, () => {
  it("is sorted, keyed uniquely and the same on every call", () => {
    const a = festivalsOfYear(2026, DEL, IST, P);
    for (let i = 1; i < a.length; i++) expect(a[i]?.dateMs ?? 0).toBeGreaterThanOrEqual(a[i - 1]?.dateMs ?? 0);
    expect(new Set(a.map((f) => f.key)).size).toBe(a.length);
    for (const f of a) {
      expect(ymd(f.dateMs)).toBe(f.key.split("@")[1]);
      expect(f.name.length * f.sanskrit.length * f.note.length * f.rule.length).toBeGreaterThan(0);
    }
    // A fresh place key forces a second, independent run.
    const b = festivalsOfYear(2026, { ...DEL, elevation: 0.0001 }, IST, P);
    expect(b).toEqual(a);
  });

  it("gives a short range the same rows as the whole year, both ends included", () => {
    const place = { lat: 19.076, lon: 72.8777 }; // Mumbai, not yet in the year memo
    const from = istMs(2026, 10, 20, 15);
    const to = istMs(2026, 11, 24, 1);
    const short = festivalsBetween(from, to, place, IST, P);
    expect(ymd(short[0]?.dateMs ?? 0)).toBe("2026-10-20");
    expect(short[0]?.id).toBe("vijaya-dashami");
    expect(short[short.length - 1]?.id).toBe("kartik-purnima");
    const year = festivalsOfYear(2026, place, IST, P).filter((f) => f.dateMs >= istMs(2026, 10, 20) && f.dateMs <= istMs(2026, 11, 24));
    expect(short).toEqual(year);
    // A range across the new year is stitched from both years.
    const across = festivalsBetween(istMs(2026, 12, 20), istMs(2027, 1, 20), place, IST, P);
    expect(across.map((f) => f.id)).toContain("makara-sankranti");
    expect(festivalsBetween(to, from, place, IST, P)).toEqual([]);
  });

  it("finds the next festival for a teaser", () => {
    const now = istMs(2026, 11, 17, 9);
    const next = nextFestival(now, DEL, IST, P);
    expect(next?.festival.id).toBe("kartik-purnima");
    expect(next?.inDays).toBe(7);
    // With fasts counted, the Ekādaśī of the 20th comes first.
    expect(nextFestival(now, DEL, IST, P, ["festival", "fast"])?.festival.sanskrit).toBe("Devotthāna Ekādaśī");
    // On the day itself it is "today", from just after midnight to just before the next.
    expect(nextFestival(istMs(2026, 11, 24, 23), DEL, IST, P)?.inDays).toBe(0);
    expect(daysUntil(istMs(2026, 11, 24), istMs(2026, 11, 23, 23), IST)).toBe(1);
  });

  it("works a whole year out in well under a second or two, then answers from memory", () => {
    const place = { lat: 22.5726, lon: 88.3639 }; // Kolkata
    const t0 = performance.now();
    const a = festivalsOfYear(2028, place, IST, P);
    const cold = performance.now() - t0;
    const t1 = performance.now();
    expect(festivalsOfYear(2028, place, IST, P)).toBe(a);
    expect(performance.now() - t1).toBeLessThan(5);
    expect(cold).toBeLessThan(3000); // about 0.2 s on a laptop; the slack is for a busy machine
  });

  it("does not fail far from India, or where the Sun does not set", () => {
    const ny = festivalsOfYear(2026, { lat: 40.7128, lon: -74.006 }, "America/New_York", P);
    expect(ny.filter((f) => f.id === "diwali")).toHaveLength(1);
    const tromso = festivalsBetween(Date.UTC(2026, 5, 1), Date.UTC(2026, 6, 15), { lat: 69.65, lon: 18.96 }, "Europe/Oslo", P);
    expect(tromso.length).toBeGreaterThan(5);
    for (const f of tromso) expect(Number.isFinite(f.dateMs)).toBe(true);
    expect(festivalsBetween(Date.UTC(2026, 5, 1), Date.UTC(2026, 5, 20), DEL, "Not/AZone", P).length).toBeGreaterThan(0);
  });
});
