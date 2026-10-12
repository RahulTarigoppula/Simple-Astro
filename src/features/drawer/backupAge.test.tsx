import { describe, expect, it } from "vitest";
import { backupAge } from "./DrawerScreen";

describe("backupAge", () => {
  it("speaks of one leaf and of several leaves", () => {
    expect(backupAge(1, null, 0, "UTC").text).toBe("1 leaf lives only on this device and has never been sealed in an envelope.");
    expect(backupAge(3, null, 0, "UTC").text).toBe("3 leaves live only on this device and have never been sealed in an envelope.");
  });

  it("counts calendar days in the leaf's zone, not 24-hour spans", () => {
    // 23:30 IST on 11 Oct → 00:30 IST on 12 Oct: one hour apart, yet yesterday in Kolkata
    const last = Date.UTC(2026, 9, 11, 18, 0);
    const now = Date.UTC(2026, 9, 11, 19, 0);
    expect(backupAge(2, last, now, "Asia/Kolkata")).toEqual({ days: 1, text: "Last sealed in an envelope yesterday." });
    // …and the same day in London
    expect(backupAge(2, last, now, "Europe/London").text).toBe("Last sealed in an envelope today.");
    // 25 hours apart, 23:30 on the 11th → 00:30 on the 13th: two calendar days
    expect(backupAge(2, last, last + 25 * 3_600_000, "Asia/Kolkata").text).toBe("Last sealed in an envelope 2 days ago.");
    expect(backupAge(2, last, last + 40 * 86_400_000, "Asia/Kolkata").days).toBe(40);
  });
});
