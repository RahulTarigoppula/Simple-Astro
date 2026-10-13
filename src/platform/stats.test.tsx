import { describe, expect, it } from "vitest";
import { cleanEvent, cleanPath, countEvent, countView, statsConfigured } from "./stats";

describe("anonymous stats", () => {
  it("strips every id from a path", () => {
    expect(cleanPath("/patri/3f9c2a7e-1b2c-4d5e-8f90-123456789abc/sky")).toBe("/patri/sky");
    expect(cleanPath("/milan/a1b2c3d4e5f6/9z8y7x6w5v4u")).toBe("/milan");
    expect(cleanPath("/forecast/p_1700000000000")).toBe("/forecast");
    expect(cleanPath("/")).toBe("/");
    expect(cleanPath("/explore/nakshatra/3?x=1")).toBe("/explore/nakshatra/3");
  });
  it("keeps event names to a safe alphabet", () => {
    expect(cleanEvent("Forecast: Week!")).toBe("forecast-week-");
  });
  it("sends nothing when no counter is configured (the default, and in every test)", () => {
    expect(statsConfigured()).toBe(false);
    expect(() => {
      countView("/patri/abc");
      countEvent("x");
    }).not.toThrow();
  });
});
