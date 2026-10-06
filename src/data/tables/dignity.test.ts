import { describe, expect, it } from "vitest";
import type { GrahaId } from "../../engine/types";
import { DEBILITATION, dignityOf, EXALTATION, MOOLATRIKONA, NATURAL_FRIENDSHIP, naturalRelation, OWN_SIGNS } from "./dignity";

const SEVEN = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"] as const;
const at = (sign: number, deg: number): number => sign * 30 + deg;

describe("BPHS dignity tables", () => {
  it("exaltation points and debilitation = opposite sign", () => {
    expect(EXALTATION.SU).toEqual([0, 10]);
    expect(EXALTATION.SA).toEqual([6, 20]);
    for (const id of SEVEN) expect(DEBILITATION[id]).toBe((EXALTATION[id][0] + 6) % 12);
  });

  it("each of the seven owns 1–2 signs and the twelve signs are covered exactly once (Sun/Moon one each)", () => {
    const owned = SEVEN.flatMap((id) => [...OWN_SIGNS[id]]).sort((a, b) => a - b);
    expect(owned).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  });

  it("mūlatrikoṇa ranges per BPHS", () => {
    expect(MOOLATRIKONA.SU).toEqual([4, 0, 20]);
    expect(MOOLATRIKONA.MO).toEqual([1, 3, 30]);
    expect(MOOLATRIKONA.MA).toEqual([0, 0, 12]);
    expect(MOOLATRIKONA.ME).toEqual([5, 15, 20]);
    expect(MOOLATRIKONA.JU).toEqual([8, 0, 10]);
    expect(MOOLATRIKONA.VE).toEqual([6, 0, 15]);
    expect(MOOLATRIKONA.SA).toEqual([10, 0, 20]);
  });

  it("natural friendship matrix: diagonal is self, the Moon has no enemies, Saturn's three enemies", () => {
    for (const a of SEVEN) expect(NATURAL_FRIENDSHIP[a][a]).toBe("self");
    expect(Object.values(NATURAL_FRIENDSHIP.MO).filter((r) => r === "enemy")).toHaveLength(0);
    expect(SEVEN.filter((b) => NATURAL_FRIENDSHIP.SA[b] === "enemy")).toEqual(["SU", "MO", "MA"]);
    expect(SEVEN.filter((b) => NATURAL_FRIENDSHIP.SU[b] === "friend")).toEqual(["MO", "MA", "JU"]);
    expect(naturalRelation("RA", "SU")).toBe("neutral");
    // Each graha lists all six others exactly once.
    for (const a of SEVEN) expect(SEVEN.filter((b) => b !== a && NATURAL_FRIENDSHIP[a][b] !== "self")).toHaveLength(6);
  });
});

describe("dignityOf", () => {
  const cases: Array<[GrahaId, number, string]> = [
    ["SU", at(0, 10), "exalted"],
    ["SU", at(6, 10), "debilitated"],
    ["SU", at(4, 19.9), "moolatrikona"],
    ["SU", at(4, 20), "own"],
    ["SU", at(10, 5), "enemy"],
    ["SU", at(8, 5), "friend"],
    ["SU", at(2, 5), "neutral"],
    ["MO", at(1, 2.9), "exalted"],
    ["MO", at(1, 3), "moolatrikona"],
    ["MO", at(3, 3), "own"],
    ["MO", at(7, 3), "debilitated"],
    ["ME", at(5, 14.9), "exalted"],
    ["ME", at(5, 15), "moolatrikona"],
    ["ME", at(5, 20), "own"],
    ["ME", at(11, 1), "debilitated"],
    ["MA", at(0, 11.9), "moolatrikona"],
    ["MA", at(0, 12), "own"],
    ["MA", at(7, 1), "own"],
    ["MA", at(9, 28), "exalted"],
    ["JU", at(8, 9.9), "moolatrikona"],
    ["JU", at(11, 9.9), "own"],
    ["JU", at(3, 9.9), "exalted"],
    ["VE", at(11, 13.1), "exalted"],
    ["VE", at(6, 14.9), "moolatrikona"],
    ["VE", at(1, 1), "own"],
    ["SA", at(10, 11.5), "moolatrikona"],
    ["SA", at(10, 21), "own"],
    ["SA", at(9, 1), "own"],
    ["SA", at(0, 1), "debilitated"],
    ["RA", at(1, 1), "exalted"],
    ["KE", at(1, 1), "debilitated"],
  ];
  it.each(cases)("%s at %f° → %s", (id, lon, expected) => {
    expect(dignityOf(id, lon)).toBe(expected);
  });
});
