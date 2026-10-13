import { describe, expect, it } from "vitest";
import { chartStyleFor, nakBoth, nakName, rashiBoth, rashiName } from "./regional";

describe("regional names", () => {
  it("covers all 12 signs and 27 nakṣatras in each tradition, in order", () => {
    for (const t of ["telugu", "tamil"] as const) {
      for (let s = 0; s < 12; s++) expect(rashiName(s, t).length, `${t} ${s}`).toBeGreaterThan(2);
      for (let i = 0; i < 27; i++) expect(nakName(i, t).length, `${t} ${i}`).toBeGreaterThan(2);
    }
    expect(rashiName(10, "tamil")).toBe("Kumbam");
    expect(nakName(21, "tamil")).toBe("Thiruvonam");
    expect(nakName(21, "telugu")).toBe("Sravanam");
    expect(rashiName(3, "telugu")).toBe("Karkatakam");
    expect(nakName(26, "north")).toBe("Revatī");
  });
  it("shows the Sanskrit name beside a regional one", () => {
    expect(nakBoth(21, "tamil")).toBe("Thiruvonam (Śravaṇa)");
    expect(rashiBoth(11, "north")).toBe("Mīna");
  });
  it("draws the South Indian chart for Telugu and Tamil readers", () => {
    expect(chartStyleFor("telugu")).toBe("south");
    expect(chartStyleFor("north")).toBe("north");
    expect(chartStyleFor(undefined)).toBeUndefined();
  });
});

describe("regional names, accents", () => {
  it("does not repeat a name that differs only by accents", () => {
    expect(nakBoth(26, "telugu")).toBe("Revatī");
  });
});
