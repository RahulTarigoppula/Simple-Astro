import { describe, expect, it } from "vitest";
import { skyEvents } from "./events";
import { DEFAULT_PRESET } from "./types";

const BLR = { lat: 12.9716, lon: 77.5946 };
const day = (ms: number) => new Date(ms).toISOString().slice(0, 10);

describe("sky events", () => {
  const ev = skyEvents(Date.UTC(2026, 1, 1), 60, BLR, DEFAULT_PRESET);

  it("finds the eclipses of early 2026 and says which can be seen from Bengaluru", () => {
    const solar = ev.find((e) => e.kind === "solar-eclipse");
    expect(solar && day(solar.ms)).toBe("2026-02-17"); // annular, over Antarctica
    expect(solar?.visibleHere).toBe(false);
    const lunar = ev.find((e) => e.kind === "lunar-eclipse");
    expect(lunar && day(lunar.ms)).toBe("2026-03-03"); // total
    expect(lunar?.eclipse).toBe("total");
  });

  it("finds full and new moons about a lunation apart, in order", () => {
    const full = ev.filter((e) => e.kind === "full");
    expect(full.length).toBe(2);
    expect(day(full[0]?.ms ?? 0)).toBe("2026-02-01");
    for (let i = 1; i < ev.length; i++) expect(ev[i]?.ms ?? 0).toBeGreaterThanOrEqual(ev[i - 1]?.ms ?? 0);
  });

  it("finds Mercury turning retrograde and direct", () => {
    const me = ev.filter((e) => e.kind === "station" && e.graha === "ME");
    expect(me.map((e) => [day(e.ms), e.retro])).toEqual([
      ["2026-02-26", true],
      ["2026-03-20", false],
    ]);
  });
});
