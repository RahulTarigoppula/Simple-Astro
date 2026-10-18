import { describe, expect, it } from "vitest";
import { type BirthFieldValues, fieldsOfHour, hourOf, missingText } from "./BirthFields";

const v = (p: Partial<BirthFieldValues>): BirthFieldValues => ({ y: 1994, mo: 3, d: 14, hour12: 7, ampm: "am", mi: 25, ...p });

describe("the 12-hour clock fields", () => {
  it("resolves every hour of the day and refuses to guess am or pm", () => {
    expect(hourOf({ hour12: 12, ampm: "am" })).toBe(0);
    expect(hourOf({ hour12: 1, ampm: "am" })).toBe(1);
    expect(hourOf({ hour12: 11, ampm: "am" })).toBe(11);
    expect(hourOf({ hour12: 12, ampm: "pm" })).toBe(12);
    expect(hourOf({ hour12: 7, ampm: "pm" })).toBe(19);
    expect(hourOf({ hour12: 11, ampm: "pm" })).toBe(23);
    expect(hourOf({ hour12: 7, ampm: null })).toBe(-1);
    expect(hourOf({ hour12: 0, ampm: "am" })).toBe(-1);
  });

  it("round-trips a saved 24-hour hour through the two fields", () => {
    for (let h = 0; h < 24; h++) expect(hourOf(fieldsOfHour(h))).toBe(h);
    expect(fieldsOfHour(0)).toEqual({ hour12: 12, ampm: "am" });
    expect(fieldsOfHour(12)).toEqual({ hour12: 12, ampm: "pm" });
  });

  it("names what is missing in the order a person fills the form", () => {
    expect(missingText(v({ y: 0 }), false)).toBe("Fill in the date of birth.");
    expect(missingText(v({ mo: 2, d: 31 }), false)).toBe("February 1994 has only 28 days.");
    expect(missingText(v({ hour12: 0 }), false)).toBe("Pick the hour of birth.");
    expect(missingText(v({ ampm: null }), false)).toBe("Was it am or pm? Tap one.");
    expect(missingText(v({}), false)).toBeNull();
    // With the time unknown the clock is not asked for at all.
    expect(missingText(v({ hour12: 0, ampm: null }), true)).toBeNull();
  });
});
