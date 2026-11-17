// The pure part of Family today. (A .tsx name only so the "dom" test project picks it up; nothing here renders.)
import { describe, expect, it } from "vitest";
import { forecast } from "../../engine/forecast";
import { computePanchang } from "../../engine/panchang";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { personalReading } from "../../engine/personal";
import { DEFAULT_PRESET } from "../../engine/types";
import {
  type Birthday,
  byBestDay,
  comingUp,
  dateWords,
  familySentence,
  familyTeaserLine,
  inDaysWords,
  nextBirthday,
  nextStarBirthday,
  readDay,
  STAR_SEARCH_DAYS,
  type StarDay,
  shortHeadline,
  starDays,
} from "./family";

const IST = "Asia/Kolkata";
const BLR = { lat: 12.9716, lon: 77.5946 };
const NOW = Date.UTC(2026, 10, 17, 6, 30); // Tuesday 17 November 2026, noon in India
const who = (name: string, score: number) => ({ name, score });

describe("the family's day in one sentence", () => {
  it("says nothing with nobody", () => {
    expect(familySentence([])).toEqual({ kind: "none", title: "", sub: "" });
  });

  it("one person: their own word", () => {
    expect(familySentence([who("Rahul", 0.5)])).toMatchObject({ kind: "one", title: "A strong day for Rahul", sub: "75 of 100 today." });
    expect(familySentence([who("Rahul", 0.1)]).title).toBe("A good day for Rahul");
    expect(familySentence([who("Rahul", -0.1)]).title).toBe("A mixed day for Rahul");
    expect(familySentence([who("Rahul", -0.6)]).title).toBe("A gentle day for Rahul");
  });

  it("all strong", () => {
    const s = familySentence([who("Amma", 0.4), who("Priya", 0.9), who("Rahul", 0.35)]);
    expect(s).toEqual({ kind: "all-strong", title: "A strong day for the whole family", sub: "All 3 have a Strong or Good day." });
  });

  it("everyone gentle: nobody at Good or better", () => {
    const s = familySentence([who("Amma", -0.05), who("Priya", -0.5), who("Rahul", -0.4)]);
    expect(s.kind).toBe("all-gentle");
    expect(s.title).toBe("A gentle day for everyone");
    expect(s.sub).toMatch(/^Tradition favours/);
  });

  it("one stands out: 15 points or more clear of the next", () => {
    const s = familySentence([who("Amma", 0.1), who("Priya", 0.45), who("Rahul", -0.2)]);
    expect(s).toEqual({ kind: "stands-out", title: "Priya has the strongest day", sub: "2 of 3 have a Strong or Good day." });
    // a hair under the gap is not singled out
    expect(familySentence([who("Amma", 0.16), who("Priya", 0.45), who("Rahul", 0.2)]).kind).toBe("all-good");
    // and never when the best day is itself below Good
    expect(familySentence([who("Amma", -0.05), who("Rahul", -0.6)]).kind).toBe("all-gentle");
  });

  it("everyone good, most good, and mixed", () => {
    expect(familySentence([who("Amma", 0.1), who("Rahul", 0.2)])).toEqual({
      kind: "all-good",
      title: "A good day for the whole family",
      sub: "Both have a Strong or Good day.",
    });
    expect(familySentence([who("Amma", 0.1), who("Priya", 0.3), who("Rahul", 0.2), who("Nanna", -0.3)])).toEqual({
      kind: "most-good",
      title: "A good day for most of the family",
      sub: "3 of 4 have a Strong or Good day.",
    });
    expect(familySentence([who("Amma", 0.1), who("Priya", -0.1), who("Rahul", -0.5), who("Nanna", 0.2)])).toMatchObject({
      kind: "mixed",
      title: "A mixed day for the family",
    });
    expect(familySentence([who("Amma", 0.1), who("Priya", -0.1), who("Rahul", -0.5)]).sub).toBe("1 of 3 has a Strong or Good day.");
  });

  it("sorts best day first, by name when level", () => {
    expect(byBestDay([who("Rahul", 0.1), who("Amma", 0.1), who("Priya", 0.6)]).map((p) => p.name)).toEqual(["Priya", "Amma", "Rahul"]);
  });

  it("the teaser names the best days and counts the rest", () => {
    const all = [who("Rahul", -0.1), who("Amma", 0.1), who("Priya", 0.6), who("Nanna", -0.7), who("Kavya", 0.05)];
    expect(familyTeaserLine(all)).toBe("Priya Strong · Amma Good · Kavya Good · +2 more");
    expect(familyTeaserLine(all.slice(0, 2))).toBe("Amma Good · Rahul Mixed");
    expect(familyTeaserLine(all, 1)).toBe("Priya Strong · +4 more");
  });
});

describe("the next civil birthday", () => {
  const born = (localY: number, localMo: number, localD: number) => ({ localY, localMo, localD });

  it("later this year, today, and next year", () => {
    expect(nextBirthday(born(1996, 11, 22), NOW, IST)).toEqual({ y: 2026, mo: 11, d: 22, age: 30, inDays: 5 });
    expect(nextBirthday(born(1960, 11, 17), NOW, IST)).toEqual({ y: 2026, mo: 11, d: 17, age: 66, inDays: 0 });
    expect(nextBirthday(born(1994, 3, 14), NOW, IST)).toEqual({ y: 2027, mo: 3, d: 14, age: 33, inDays: 117 });
    expect(nextBirthday(born(2020, 11, 16), NOW, IST)).toMatchObject({ y: 2027, age: 7, inDays: 364 });
  });

  it("counts from the date where the reader is, not the device's", () => {
    const lateEvening = Date.UTC(2026, 10, 17, 20, 0); // already the 18th in India, still the 17th in Denver
    expect(nextBirthday(born(1990, 11, 18), lateEvening, IST).inDays).toBe(0);
    expect(nextBirthday(born(1990, 11, 18), lateEvening, "America/Denver").inDays).toBe(1);
  });

  it("a 29 February birthday keeps 28 February in a short year", () => {
    expect(nextBirthday(born(2000, 2, 29), NOW, IST)).toMatchObject({ y: 2027, mo: 2, d: 28, age: 27 });
    expect(nextBirthday(born(2000, 2, 29), Date.UTC(2027, 10, 17), IST)).toMatchObject({ y: 2028, mo: 2, d: 29, age: 28 });
  });

  it("words", () => {
    expect(inDaysWords(0)).toBe("today");
    expect(inDaysWords(1)).toBe("tomorrow");
    expect(inDaysWords(12)).toBe("in 12 days");
    expect(dateWords({ y: 2026, mo: 11, d: 22 })).toBe("Sun 22 Nov");
  });
});

describe("star birthdays", () => {
  const ledger = (stars: number[]): StarDay[] =>
    stars.map((star, offset) => ({ y: 2026, mo: 11, d: 17 + offset, offset, sunriseMs: 0, star }));

  it("the first day whose sunrise finds the Moon in the birth star", () => {
    const days = ledger([3, 4, 5, 5, 6, 7]);
    expect(nextStarBirthday(days, 5)).toEqual({ y: 2026, mo: 11, d: 19, inDays: 2, how: "sunrise" });
    expect(nextStarBirthday(days, 3)).toMatchObject({ inDays: 0, how: "sunrise" });
    expect(nextStarBirthday(days, 7)).toMatchObject({ d: 22, inDays: 5 });
  });

  it("a star no sunrise sees is kept on the day it falls within", () => {
    expect(nextStarBirthday(ledger([10, 11, 13, 14]), 12)).toEqual({ y: 2026, mo: 11, d: 18, inDays: 1, how: "within" });
    // and across the end of the circle of 27
    expect(nextStarBirthday(ledger([25, 0, 1]), 26)).toMatchObject({ inDays: 0, how: "within" });
    expect(nextStarBirthday(ledger([26, 1, 2]), 0)).toMatchObject({ inDays: 0, how: "within" });
  });

  it("null when the days given do not reach the star", () => {
    expect(nextStarBirthday(ledger([3, 4, 5]), 20)).toBeNull();
    expect(nextStarBirthday([], 0)).toBeNull();
    // the last day alone cannot say a star was skipped
    expect(nextStarBirthday(ledger([3, 4]), 5)).toBeNull();
  });

  const days = starDays(NOW, BLR, IST, DEFAULT_PRESET);

  it("reads today and the next 30 days, each at its own sunrise", () => {
    expect(days).toHaveLength(STAR_SEARCH_DAYS + 1);
    expect(days[0]).toMatchObject({ y: 2026, mo: 11, d: 17, offset: 0 });
    expect(days[14]).toMatchObject({ y: 2026, mo: 12, d: 1, offset: 14 });
    expect(days[30]).toMatchObject({ y: 2026, mo: 12, d: 17, offset: 30 });
    for (let i = 1; i < days.length; i++) {
      const a = days[i - 1] as StarDay;
      const b = days[i] as StarDay;
      // sunrises are a day apart, and the Moon moves on by about one star a day
      expect(b.sunriseMs - a.sunriseMs).toBeGreaterThan(23.9 * 3_600_000);
      expect(b.sunriseMs - a.sunriseMs).toBeLessThan(24.1 * 3_600_000);
      expect([0, 1, 2]).toContain((b.star - a.star + 27) % 27);
    }
  });

  it("agrees with the almanac: the Moon is in that star just after that sunrise", () => {
    for (const i of [0, 7, 19, 30]) {
      const d = days[i] as StarDay;
      expect(computePanchang(d.sunriseMs + 60_000, BLR, DEFAULT_PRESET).nakshatra.index).toBe(d.star);
    }
  });

  it("finds every one of the 27 stars inside the 30 days, and never looks further", () => {
    for (let star = 0; star < 27; star++) {
      const hit = nextStarBirthday(days, star);
      expect(hit).not.toBeNull();
      expect(hit?.inDays).toBeLessThanOrEqual(STAR_SEARCH_DAYS);
    }
    expect(starDays(NOW, BLR, IST, DEFAULT_PRESET, 400)).toHaveLength(STAR_SEARCH_DAYS + 1);
    expect(starDays(NOW, BLR, IST, DEFAULT_PRESET, 2)).toHaveLength(3);
  });

  it("the reference chart's star comes round on a day the Moon is really there", () => {
    const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
    const star = patri.grahas.MO.nakshatra;
    const hit = nextStarBirthday(days, star);
    expect(hit).not.toBeNull();
    const day = days[hit?.inDays ?? 0] as StarDay;
    if (hit?.how === "sunrise") expect(day.star).toBe(star);
    // the Moon enters or is in the star at some point between this sunrise and the next
    const p = computePanchang(day.sunriseMs + 60_000, BLR, DEFAULT_PRESET);
    expect([star, (star + 26) % 27]).toContain(p.nakshatra.index);
  });
});

describe("coming up", () => {
  const bd = (inDays: number, age = 30): Birthday => ({ y: 2026, mo: 11, d: 17 + inDays, age, inDays });
  const sb = (inDays: number) => ({ y: 2026, mo: 11, d: 17 + inDays, inDays, how: "sunrise" as const });

  it("lists birthdays and star birthdays inside 30 days, soonest first", () => {
    const events = comingUp([
      { id: "r", name: "Rahul", birthday: { ...bd(0), inDays: 117 }, star: sb(12) },
      { id: "p", name: "Priya", birthday: bd(5, 31), star: sb(5) },
      { id: "a", name: "Amma", birthday: bd(30, 60), star: null },
      { id: "n", name: "Nanna", birthday: { ...bd(0), inDays: 31 }, star: sb(0) },
    ]);
    expect(events.map((e) => `${e.name} ${e.kind} ${e.inDays}`)).toEqual([
      "Nanna star 0",
      "Priya birthday 5",
      "Priya star 5",
      "Rahul star 12",
      "Amma birthday 30",
    ]);
    expect(events[1]).toMatchObject({ personId: "p", age: 31, d: 22 });
    expect(events[0]?.age).toBeUndefined();
  });
});

describe("one person's day", () => {
  it("the row's line is the headline without its planet-by-planet clause", () => {
    expect(shortHeadline("A steady day: ordinary progress, nothing to force. Moon helps with gains; Sun asks for care with luck.")).toBe(
      "A steady day: ordinary progress, nothing to force.",
    );
    expect(shortHeadline("A supported day. Good for starting things and meeting people. Saturn asks for care with home.")).toBe(
      "A supported day. Good for starting things and meeting people.",
    );
    expect(shortHeadline("A mixed day. Keep plans simple and stay patient.")).toBe("A mixed day. Keep plans simple and stay patient.");
    const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
    const line = shortHeadline(readDay(patri, NOW, { ...BLR, zone: IST }, DEFAULT_PRESET).headline);
    expect(line).toMatch(/^A [a-z]+ day.*\.$/);
    expect(line).not.toMatch(/helps with|asks for care/);
  });

  it("is the home screen's own reading: same score, word and headline, with the best and weakest area", () => {
    const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
    const here = { ...BLR, zone: IST };
    const day = readDay(patri, NOW, here, DEFAULT_PRESET);
    const f = forecast(patri, "day", NOW, IST, DEFAULT_PRESET, BLR);
    expect(day.score).toBe(f.score);
    expect(day.tone).toBe(f.tone);
    expect(day.headline).toBe(f.headline);
    const areas = [...personalReading(patri, f.startMs + 43_200_000, DEFAULT_PRESET).areas].sort((a, b) => b.score - a.score);
    expect(day.best).toBe(areas[0]?.label);
    expect(day.gentle).toBe(areas[areas.length - 1]?.label);
    expect(day.best).not.toBe(day.gentle);
    expect(day.birthStar).toBe(patri.grahas.MO.nakshatra);
  });
});
