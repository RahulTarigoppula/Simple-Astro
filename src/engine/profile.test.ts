import { describe, expect, it } from "vitest";
import { birthNumbers, chineseNewYearMs, chineseZodiac, digitalRoot, nameNumber, personalYear, tropicalSunSign } from "./profile";

const ymd = (ms: number) => new Date(ms + 8 * 3_600_000).toISOString().slice(0, 10);

describe("cosmic profile", () => {
  it("finds Chinese New Year on the published dates", () => {
    expect(ymd(chineseNewYearMs(1994))).toBe("1994-02-10");
    expect(ymd(chineseNewYearMs(1996))).toBe("1996-02-19");
    expect(ymd(chineseNewYearMs(2000))).toBe("2000-02-05");
    expect(ymd(chineseNewYearMs(2023))).toBe("2023-01-22");
    expect(ymd(chineseNewYearMs(2026))).toBe("2026-02-17");
    expect(ymd(chineseNewYearMs(2033))).toBe("2033-01-31");
  });
  it("names the animal and element, switching at New Year not 1 January", () => {
    expect(chineseZodiac(Date.UTC(1994, 2, 14, 2))).toMatchObject({ animal: "Dog", element: "Wood", year: 1994 });
    expect(chineseZodiac(Date.UTC(1994, 0, 20))).toMatchObject({ animal: "Rooster", element: "Water", year: 1993 });
    expect(chineseZodiac(Date.UTC(2026, 5, 1))).toMatchObject({ animal: "Horse", element: "Fire" });
    expect(chineseZodiac(Date.UTC(2000, 5, 1))).toMatchObject({ animal: "Dragon", element: "Metal" });
  });
  it("gives the Western Sun sign by the tropical zodiac", () => {
    expect(tropicalSunSign(Date.UTC(1994, 2, 14))).toBe(11); // Pisces
    expect(tropicalSunSign(Date.UTC(2026, 6, 30))).toBe(4); // Leo
  });
  it("reduces numbers the numerologist's way", () => {
    expect(digitalRoot(0)).toBe(0);
    expect(digitalRoot(29)).toBe(2);
    expect(birthNumbers(1994, 3, 14)).toEqual({ root: 5, destiny: 4 });
    expect(nameNumber("Rahul")).toEqual({ compound: 2 + 1 + 5 + 6 + 3, single: 8, letters: 5 });
    expect(nameNumber("Rāhul").compound).toBe(17);
    expect(personalYear(3, 14, 2026)).toBe(9); // 1+4+3+2+0+2+6 = 18 -> 9
  });
});
