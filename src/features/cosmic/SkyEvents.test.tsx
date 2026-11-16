import { describe, expect, it } from "vitest";
import { clock12 } from "./SkyEvents";

describe("Coming up in the sky: times", () => {
  it("are in 12-hour form with am/pm, in the given zone", () => {
    const t = Date.UTC(2026, 10, 16, 14, 13); // 19:43 IST
    expect(clock12(t, "Asia/Kolkata")).toBe("7:43 pm");
    expect(clock12(t, "UTC")).toBe("2:13 pm");
    expect(clock12(Date.UTC(2026, 10, 16, 18, 35), "Asia/Kolkata")).toBe("12:05 am");
    expect(clock12(Date.UTC(2026, 10, 16, 6, 30), "Asia/Kolkata")).toBe("12:00 pm");
    expect(clock12(Date.UTC(2026, 10, 16, 1, 5), "Asia/Kolkata")).toBe("6:35 am");
    expect(clock12(t, "Not/AZone")).toBe("2:13 pm"); // an unknown zone falls back to UTC
  });
});
