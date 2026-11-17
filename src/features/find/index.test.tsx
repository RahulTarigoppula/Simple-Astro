import { describe, expect, it } from "vitest";
import { GLOSSARY } from "../../data/glossary";
import { ACTIVITIES } from "../../engine/pickday";
import { ASK_EXAMPLES, buildIndex, type FindHitGroup, type FindItem, flatten, fold, foldLoose, search, TRY_INSTEAD, tiles } from "./index";

const CTX = {
  activeId: "p1",
  people: [
    { id: "p1", name: "Rahul", sub: "14 Mar 1994 · 7:25 am · Bengaluru" },
    { id: "p2", name: "Priya", sub: "22 Aug 1996 · 6:40 pm · Hyderabad" },
  ],
};
const index = buildIndex(CTX);
const ids = (groups: FindHitGroup[]) => flatten(groups).map((h) => h.item.id);
const first = (q: string): FindItem | undefined => flatten(search(index, q))[0]?.item;
const toOf = (item: FindItem | undefined) => (item?.action.kind === "go" ? item.action.to : undefined);

describe("fold", () => {
  it("drops case, accents and dots", () => {
    expect(fold("Sāḍe Sātī")).toBe("sade sati");
    expect(fold("  Rāhu & Ketu ")).toBe("rahu ketu");
    expect(fold("Nakṣatra")).toBe("naksatra");
  });
  it("also knows the way most people type Sanskrit", () => {
    expect(foldLoose("Śani")).toBe("shani");
    expect(foldLoose("Nakṣatra")).toBe("nakshatra");
    expect(foldLoose("Candra")).toBe("chandra");
    expect(foldLoose("Kṛṣṇa")).toBe("krishna");
  });
});

describe("buildIndex", () => {
  it("has unique ids, and every item has a title and something to match", () => {
    const seen = new Set(index.map((i) => i.id));
    expect(seen.size).toBe(index.length);
    for (const i of index) {
      expect(i.title).not.toBe("");
      expect(i.keys[0]).toBe(fold(i.title));
      expect(i.names).toBeGreaterThan(0);
    }
  });

  it("fills the active person's id into every address that is about one person", () => {
    const to = (id: string) => toOf(index.find((i) => i.id === id));
    expect(to("screen:chart")).toBe("/patri/p1");
    expect(to("screen:chart-chapters")).toBe("/patri/p1?v=chapters");
    expect(to("screen:sky-at-birth")).toBe("/patri/p1/sky");
    expect(to("screen:report")).toBe("/report/p1");
    expect(to("screen:forecast-week")).toBe("/forecast/p1?p=week");
    expect(to("screen:forecast-year")).toBe("/forecast/p1?p=year");
    expect(to("screen:palm")).toBe("/hast/p1");
    expect(to("screen:journal")).toBe("/journal/p1");
    expect(to("screen:year")).toBe("/year/p1");
    expect(to("screen:pick")).toBe("/pick/p1");
    expect(to("screen:edit")).toBe("/leaf/p1/edit");
    expect(index.some((i) => toOf(i)?.includes("undefined") || toOf(i)?.includes("null"))).toBe(false);
  });

  it("covers people, the sky, festivals, every glossary word and every activity", () => {
    const count = (g: string) => index.filter((i) => i.group === g).length;
    expect(count("person")).toBe(2);
    expect(count("sky")).toBe(9 + 12 + 27);
    expect(count("word")).toBe(GLOSSARY.length);
    expect(count("todo")).toBe(ACTIVITIES.length);
    expect(count("festival")).toBeGreaterThan(20);
  });

  it("with nobody saved: no person screens, and the first tile adds someone", () => {
    const empty = buildIndex({ activeId: null, people: [] });
    expect(empty.find((i) => i.id === "screen:chart")).toBeUndefined();
    expect(empty.find((i) => i.id === "screen:palm")).toBeUndefined();
    expect(toOf(empty.find((i) => i.id === "screen:pick"))).toBe("/pick");
    expect(tiles(empty)[0]?.title).toBe("Add a person");
    expect(tiles(index)).toHaveLength(15);
    expect(tiles(index)[0]?.title).toBe("Today");
  });
});

describe("search", () => {
  it("returns nothing for an empty query", () => {
    expect(search(index, "")).toEqual([]);
    expect(search(index, "   ")).toEqual([]);
  });

  it("ignores case and diacritics", () => {
    expect(first("rahu")?.title).toMatch(/Rāhu/);
    expect(first("RAHU")?.title).toMatch(/Rāhu/);
    expect(first("sade sati")?.title).toBe("Sāḍe Sātī");
    expect(first("Sāḍe Sātī")?.title).toBe("Sāḍe Sātī");
    expect(first("shani")?.title).toBe("Saturn");
    expect(ids(search(index, "nakshatra"))).toEqual(expect.arrayContaining(["word:nakshatra", "screen:explore-stars"]));
  });

  it("ranks a whole name above a start, a start above a word start, and a word start above a match inside", () => {
    const score = (q: string, id: string) => flatten(search(index, q, { perGroup: 99 })).find((h) => h.item.id === id)?.score ?? 0;
    expect(score("forecast", "screen:forecast")).toBeGreaterThan(score("fore", "screen:forecast"));
    // "ahead": a word start in "Week ahead"; "head": only inside it
    expect(score("week", "screen:forecast-week")).toBeGreaterThan(score("ahead", "screen:forecast-week"));
    expect(score("ahead", "screen:forecast-week")).toBeGreaterThan(score("head", "screen:forecast-week"));
    expect(score("head", "screen:forecast-week")).toBeGreaterThan(0);
    // a name beats a synonym of the same kind
    expect(score("festivals", "screen:festivals")).toBeGreaterThan(score("calendar", "screen:festivals"));
    // two letters never match inside a word
    expect(score("ee", "screen:forecast-week")).toBe(0);
  });

  it("puts the group with the best match first, and the best match first in its group", () => {
    const moon = search(index, "moon");
    expect(moon[0]?.group).toBe("sky");
    expect(moon[0]?.hits[0]?.item.title).toBe("Moon");
    expect(moon.map((g) => g.group)).toContain("screen");
    const sat = search(index, "sat");
    expect(sat[0]?.hits[0]?.item.title).toBe("Saturn");
    for (const g of search(index, "s")) {
      const scores = g.hits.map((h) => h.score);
      expect(scores).toEqual([...scores].sort((a, b) => b - a));
      expect(g.hits.length).toBeLessThanOrEqual(6);
    }
  });

  it("knows plain words for things", () => {
    const top = (q: string) =>
      search(index, q)
        .find((g) => g.group === "screen")
        ?.hits.map((h) => h.item.id) ?? [];
    expect(top("horoscope")).toEqual(expect.arrayContaining(["screen:chart", "screen:forecast"]));
    expect(top("kundli")[0]).toBe("screen:chart");
    expect(top("marriage")[0]).toBe("screen:match");
    expect(top("muhurta")[0]).toBe("screen:pick");
    expect(top("panchang")[0]).toBe("screen:almanac");
    expect(top("calendar")).toEqual(expect.arrayContaining(["screen:almanac", "screen:festivals"]));
    expect(top("moon")).toContain("screen:almanac");
    for (const w of ["backup", "theme", "dark"]) expect(top(w)[0]).toBe("screen:settings");
    // the tradition (and so the language of the names) is set per person
    for (const w of ["language", "tradition"]) expect(top(w)[0]).toBe("screen:edit");
    for (const w of ["print", "pdf", "share"]) expect(top(w)[0]).toBe("screen:report");
  });

  it("answers the example questions", () => {
    expect(first("good day to travel")?.id).toBe("todo:travel");
    expect(toOf(first("good day to travel"))).toBe("/pick/p1?for=travel");
    expect(first("Diwali")?.id).toBe("festival:diwali");
    expect(toOf(first("deepavali"))).toBe("/festivals");
    expect(first("Saturn")?.id).toBe("sky:graha-SA");
    expect(toOf(first("Saturn"))).toBe("/explore/graha/SA");
    expect(first("week ahead")?.id).toBe("screen:forecast-week");
    for (const q of [...ASK_EXAMPLES, ...TRY_INSTEAD]) expect(flatten(search(index, q)).length).toBeGreaterThan(0);
  });

  it("matches several words in any order, skipping small words", () => {
    expect(first("travel good day")?.id).toBe("todo:travel");
    expect(first("forecast for the month")?.id).toBe("screen:forecast-month");
    expect(ids(search(index, "aries zzz"))).toEqual([]);
  });

  it("finds people, signs, stars and words", () => {
    const pri = first("pri");
    expect(pri?.action).toEqual({ kind: "person", id: "p2" });
    expect(first("hyderabad")?.action).toEqual({ kind: "person", id: "p2" });
    expect(toOf(first("aries"))).toBe("/explore/rashi/0");
    expect(toOf(first("mesha"))).toBe("/explore/rashi/0");
    expect(toOf(first("ashvini"))).toBe("/explore/nakshatra/0");
    expect(toOf(first("revati"))).toBe("/explore/nakshatra/26");
    expect(first("tithi")?.action).toEqual({ kind: "explain", id: "tithi" });
    expect(search(index, "qqqq")).toEqual([]);
  });
});
