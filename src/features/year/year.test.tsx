import { describe, expect, it } from "vitest";
import { vimshottari } from "../../engine/dasha";
import type { Festival } from "../../engine/festivals";
import { type ForecastLine, forecast, lineFor } from "../../engine/forecast";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import type { PersonalReading } from "../../engine/personal";
import type { PickDay } from "../../engine/pickday";
import { DEFAULT_PRESET, type SignIdx } from "../../engine/types";
import { fmt, toneOf } from "../forecast/util";
import {
  areasOfYear,
  bestMonths,
  chapterOfYear,
  chapterWords,
  circledDays,
  closingLine,
  comingFestivals,
  DAY,
  eclipsesIn,
  gentleMonths,
  listWords,
  type MonthReading,
  mainLegs,
  readMonth,
  shapeOfYear,
  shortLine,
  slowPaths,
  slowShort,
  slowTone,
  slowWords,
  teaserSub,
  whyLine,
  yearWindow,
} from "./year";

const ZONE = "Asia/Kolkata";
const NOW = Date.UTC(2026, 10, 17, 6);

/** Twelve months from November 2026 with the given scores and (optionally) lines. */
function months(scores: number[], lines: ForecastLine[][] = []): MonthReading[] {
  return yearWindow(NOW, ZONE).map((w, i) => ({ ...w, score: scores[i] ?? 0, tone: toneOf(scores[i] ?? 0), lines: lines[i] ?? [] }));
}
const names = (xs: Array<{ month: MonthReading }>) => xs.map((x) => x.month.label);

describe("the window: the next twelve months from today", () => {
  it("starts with the month that holds today and runs twelve months, in the reader's zone", () => {
    const w = yearWindow(NOW, ZONE);
    expect(w).toHaveLength(12);
    expect(w.map((m) => m.short)).toEqual(["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"]);
    expect([w[0]?.year, w[2]?.year, w[11]?.year]).toEqual([2026, 2027, 2027]);
    expect(fmt(w[0]?.startMs ?? 0, ZONE, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: false })).toMatch(
      /^1 Nov,? 0?0:00$/,
    );
    for (let i = 1; i < 12; i++) expect(w[i]?.startMs).toBe(w[i - 1]?.endMs);
  });

  it("follows the place, not the device: late on the 31st in UTC is already the 1st in India", () => {
    const late = Date.UTC(2026, 9, 31, 20); // 01:30 on 1 November in Kolkata
    expect(yearWindow(late, ZONE)[0]?.label).toBe("November");
    expect(yearWindow(late, "America/New_York")[0]?.label).toBe("October");
  });

  it("keeps local midnight across a clock change", () => {
    const w = yearWindow(Date.UTC(2027, 2, 10), "America/New_York");
    expect(fmt(w[1]?.startMs ?? 0, "America/New_York", { day: "numeric", hour: "numeric", hour12: false })).toMatch(/^1,? 0?0$/);
  });
});

describe("which months are named", () => {
  it("best: the top two, and a third only when it also stands above the year's average; in calendar order", () => {
    //            N    D    J    F    M    A    M    J    J    A    S    O
    const a = [0.1, 0.5, 0.0, 0.0, 0.6, 0.0, 0.4, 0.0, 0.0, 0.0, 0.0, 0.0];
    expect(names(bestMonths(months(a)))).toEqual(["December", "March", "May"]);
    const flat = [0.2, 0.5, 0.2, 0.2, 0.6, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2, 0.2];
    expect(names(bestMonths(months(flat)))).toEqual(["December", "March"]);
  });

  it("best: equal scores go to the sooner month", () => {
    expect(names(bestMonths(months(new Array(12).fill(0.25))))).toEqual(["November", "December"]);
  });

  it("gentle: the lowest, a second only when nearly as low, and never one of the best", () => {
    const a = [0.1, 0.5, 0.0, -0.4, 0.6, 0.0, 0.4, -0.35, 0.0, 0.0, 0.0, 0.0];
    expect(names(gentleMonths(months(a)))).toEqual(["February", "June"]);
    const one = [0.1, 0.5, 0.0, -0.4, 0.6, 0.0, 0.4, -0.2, 0.0, 0.0, 0.0, 0.0];
    expect(names(gentleMonths(months(one)))).toEqual(["February"]);
    const even = months(new Array(12).fill(0.25));
    const best = bestMonths(even);
    expect(names(gentleMonths(even, best))).toEqual(["January"]);
  });

  it("explains a month by the line the fewest other months share", () => {
    const slow = lineFor("JU", 11); // favourable all year
    const sun = lineFor("SU", 3); // favourable, this month only
    const care = lineFor("SA", 1);
    const ms = months(
      new Array(12).fill(0.2),
      new Array(12).fill(0).map((_, i) => (i === 4 ? [slow, sun, care] : [slow, care])),
    );
    const march = ms[4] as MonthReading;
    expect(whyLine(march, ms, true)).toBe(sun);
    expect(whyLine(march, ms, false)).toBe(care);
    expect(whyLine({ ...march, lines: [care] }, ms, true)).toBeNull();
    expect(shortLine(sun)).toBe("Sun supports courage, siblings and short trips");
    expect(shortLine(care)).toBe("Saturn asks for care with yourself, health and mood");
  });
});

describe("the shape of the year", () => {
  it("waits for all twelve months", () => {
    expect(shapeOfYear(months([0.1, 0.2]).slice(0, 5))).toBeNull();
  });

  it("gives one of the four words, a sentence, and the teaser line", () => {
    const s = shapeOfYear(months([0.1, 0.5, 0.0, -0.4, 0.6, 0.1, 0.4, -0.2, 0.1, 0.1, 0.1, 0.1]));
    expect(s?.word).toBe("Good");
    expect(s?.peak.label).toBe("March");
    expect(s?.line).toBe("A year of steady building. Ten of the twelve months lean your way; March is the brightest.");
    expect(s ? teaserSub(s) : "").toBe("Good overall · best month: March");
    const hard = shapeOfYear(months(new Array(12).fill(-0.5)));
    expect(hard?.word).toBe("Go gently");
    expect(hard?.line).toMatch(/^A year that rewards patience\. None of the twelve months lean your way/);
    expect(shapeOfYear(months(new Array(12).fill(0.5)))?.line).toMatch(/All twelve months lean your way/);
  });

  it("sums up in one sentence, never fearful", () => {
    const s = shapeOfYear(months([0.1, 0.5, 0.0, -0.4, 0.6, 0.1, 0.4, -0.2, 0.1, 0.1, 0.1, 0.1]));
    if (!s) throw new Error("no shape");
    expect(closingLine(s, null)).toBe("A good year by tradition's reckoning: lean into December, March and May, keep February unhurried.");
    const hard = shapeOfYear(months(new Array(12).fill(-0.5)));
    expect(hard ? closingLine(hard, null) : "").toMatch(/^A year to go gently by tradition's reckoning/);
  });

  it("joins names the way people say them", () => {
    expect([listWords([]), listWords(["May"]), listWords(["May", "June"]), listWords(["May", "June", "July"])]).toEqual([
      "",
      "May",
      "May and June",
      "May, June and July",
    ]);
  });
});

describe("the life chapter", () => {
  const birth = Date.UTC(1990, 0, 1);
  const tree = vimshottari(100, birth, 365.25);
  const md = tree[1];
  if (!md?.children) throw new Error("no tree");
  const ad0 = md.children[0];
  const ad1 = md.children[1];
  if (!ad0 || !ad1) throw new Error("no antars");

  it("names the running chapter and stretch, and a new stretch that begins inside the year", () => {
    const now = ad0.endMs - 100 * DAY;
    const c = chapterOfYear(tree, now, now + 365 * DAY);
    expect(c?.md.lord).toBe(md.lord);
    expect(c?.ad.lord).toBe(ad0.lord);
    expect(c?.changes[0]).toEqual({ level: "AD", lord: ad1.lord, startMs: ad1.startMs });
    const words = c ? chapterWords(c, ZONE) : null;
    expect(words?.lines[1]).toMatch(/begins in \w+ \d{4}/);
  });

  it("says so when nothing changes inside the year", () => {
    const now = ad1.startMs + DAY;
    const c = chapterOfYear(tree, now, now + 30 * DAY);
    expect(c?.changes).toEqual([]);
    expect(c ? chapterWords(c, ZONE).lines[1] : "").toMatch(/for the whole of this year/);
  });

  it("marks a whole new chapter when the mahādaśā turns", () => {
    const next = tree[2];
    if (!next) throw new Error("no next chapter");
    const now = md.endMs - 20 * DAY;
    const c = chapterOfYear(tree, now, now + 365 * DAY);
    expect(c?.changes[0]).toMatchObject({ level: "MD", lord: next.lord, startMs: next.startMs });
    expect(c ? chapterWords(c, ZONE).lines[1] : "").toMatch(/^A new chapter opens in /);
  });
});

describe("the slow planets", () => {
  const T0 = Date.UTC(2026, 10, 17);
  const T1 = T0 + 348 * DAY;
  const sign = (lon: number) => (Math.floor((((lon % 360) + 360) % 360) / 30) % 12) as SignIdx;
  // Jupiter starts at 118°, goes forward into the next sign on day 50, back on day 120 and forward again on day 200;
  // Saturn crawls from 356° across 0° Aries.
  const ju = (d: number) => (d < 85 ? 118 + d * 0.04 : d < 160 ? 121.4 - (d - 85) * 0.04 : 118.4 + (d - 160) * 0.04);
  const at = (ms: number) => {
    const d = (ms - T0) / DAY;
    const j = ju(d);
    const s = (356 + d * 0.02) % 360;
    return { JU: { sign: sign(j), lonSidereal: j }, SA: { sign: sign(s), lonSidereal: s } };
  };
  const paths = slowPaths(11 as SignIdx, T0, T1, DEFAULT_PRESET, at);
  const [jup, sat] = paths;

  it("finds each crossing to within the hour, a retrograde re-entry included", () => {
    expect(jup?.legs.map((l) => l.sign)).toEqual([3, 4, 3, 4]);
    expect(Math.abs((jup?.legs[0]?.endMs ?? 0) - (T0 + 50 * DAY))).toBeLessThan(3_600_000);
    expect(Math.abs((jup?.legs[1]?.endMs ?? 0) - (T0 + 120 * DAY))).toBeLessThan(3_600_000);
    expect(jup?.legs[0]?.startMs).toBe(T0);
    expect(jup?.legs[3]?.endMs).toBe(T1);
  });

  it("counts houses from the Moon's sign and keeps the path whole across 0° Aries", () => {
    expect(jup?.legs.map((l) => l.house)).toEqual([5, 6, 5, 6]);
    expect(sat?.legs.map((l) => l.house)).toEqual([1, 2]);
    expect(sat?.lonStart).toBeCloseTo(356, 5);
    expect(sat?.lonEnd).toBeCloseTo(362.96, 1);
    expect(sat?.lonMax).toBeGreaterThan(360);
    expect(jup?.lonMax).toBeCloseTo(125.92, 1);
    expect(jup?.lonMin).toBeCloseTo(118, 1);
  });

  it("says it in plain words, each house once", () => {
    if (!jup || !sat) throw new Error("no paths");
    expect(mainLegs(jup).map((l) => l.house)).toEqual([5, 6]);
    expect(slowWords(jup, ZONE)).toBe(
      "Jupiter travels through your 5th house from your Moon (children, creativity and romance), then from January your 6th (health, work, rivals and debts).",
    );
    expect(slowShort(sat, ZONE)).toMatch(
      /^Saturn: your 1st house from your Moon \(yourself, health and mood\), then the 2nd \(.+\) from \w+\.$/,
    );
    expect(slowTone(jup).text).toMatch(/^Tradition /);
    const still = slowPaths(11 as SignIdx, T0, T0 + 30 * DAY, DEFAULT_PRESET, at)[1];
    expect(still ? slowWords(still, ZONE) : "").toMatch(/^Saturn stays in your 1st house from your Moon .+ all year\.$/);
  });
});

describe("the life areas over the year", () => {
  it("averages each area over the months, ranks them, and finds each one's best month", () => {
    const w = yearWindow(NOW, ZONE).slice(0, 3);
    const reading = (career: number, money: number, home: number): PersonalReading => ({
      areas: [
        { id: "career", label: "Career & work", score: career, why: "", good: "", easy: "" },
        { id: "money", label: "Money", score: money, why: "", good: "", easy: "" },
        { id: "home", label: "Home & family", score: home, why: "", good: "", easy: "" },
      ],
      contacts: [],
      strength: [],
    });
    const a = areasOfYear([reading(0.6, -0.3, 0.1), reading(0.0, -0.3, 0.4), reading(0.3, 0.0, 0.1)], w);
    expect(a?.all.map((x) => x.id)).toEqual(["career", "home", "money"]);
    expect(a?.top[0]?.score).toBeCloseTo(0.3, 9);
    expect(a?.top[0]?.peak.label).toBe("November");
    expect(a?.all[1]?.peak.label).toBe("December");
    expect(a?.tend.id).toBe("money");
    expect(a?.tend.peak.label).toBe("January");
    expect(areasOfYear([], w)).toBeNull();
  });
});

describe("days worth circling", () => {
  const day = (n: number, score: number, setAside = false) => ({ startMs: n * DAY, score, setAside }) as unknown as PickDay;

  it("takes the best three by the day picker's ranking, in date order, three real choices apart", () => {
    const days = [day(0, 0.5), day(1, 0.97), day(2, 0.96), day(3, 0.6), day(9, 0.9), day(20, 0.99), day(21, 0.4)];
    expect(circledDays(days).map((d) => d.startMs / DAY)).toEqual([1, 9, 20]);
  });

  it("never circles a day tradition sets aside", () => {
    const days = [day(0, 0.99, true), day(5, 0.7), day(10, 0.6), day(15, 0.5)];
    expect(circledDays(days).map((d) => d.startMs / DAY)).toEqual([5, 10, 15]);
    expect(circledDays([day(0, 0.9, true)])).toEqual([]);
  });

  it("picks the next two named festivals and every eclipse, each once", () => {
    const f = (key: string, kind: Festival["kind"], n: number) =>
      ({ key, kind, dateMs: n * DAY, id: key, name: key }) as unknown as Festival;
    const list = [
      f("fast", "fast", 2),
      f("b", "festival", 30),
      f("a", "festival", 12),
      f("a", "festival", 12),
      f("old", "festival", -3),
      f("e", "eclipse", 90),
      f("e", "eclipse", 90),
      f("far", "eclipse", 500),
      f("c", "festival", 60),
    ];
    expect(comingFestivals(list, 0).map((x) => x.key)).toEqual(["a", "b"]);
    expect(eclipsesIn(list, 0, 365 * DAY).map((x) => x.key)).toEqual(["e"]);
  });
});

describe("with a real chart", () => {
  it("reads a month exactly as the Forecast screen's month does", () => {
    const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
    const place = { lat: 12.9716, lon: 77.5946 };
    const span = yearWindow(NOW, ZONE)[3];
    if (!span) throw new Error("no month");
    const m = readMonth(patri, span, ZONE, DEFAULT_PRESET, place);
    const f = forecast(patri, "month", span.startMs + 5 * DAY, ZONE, DEFAULT_PRESET, place);
    expect(m.score).toBe(f.score);
    expect(m.tone).toBe(f.tone);
    expect(m.lines).toEqual(f.lines);
    expect(f.startMs).toBe(span.startMs);
    expect(f.endMs).toBe(span.endMs);
  });
});
