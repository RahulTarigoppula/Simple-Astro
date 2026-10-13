// Custom matcher: toBeCloseToArcsec(expectedDeg, arcsecTolerance) — prints the difference in d°m′s″.
import { expect } from "vitest";

function fmt(deg: number): string {
  const sign = deg < 0 ? "−" : "+";
  const a = Math.abs(deg);
  const d = Math.floor(a);
  const m = Math.floor((a - d) * 60);
  const s = ((a - d) * 60 - m) * 60;
  return `${sign}${d}°${String(m).padStart(2, "0")}′${s.toFixed(2).padStart(5, "0")}″`;
}

expect.extend({
  toBeCloseToArcsec(received: number, expected: number, arcsec: number) {
    let diff = ((((received - expected) % 360) + 540) % 360) - 180;
    if (Object.is(diff, -0)) diff = 0;
    const pass = Math.abs(diff) * 3600 <= arcsec;
    return {
      pass,
      message: () =>
        `expected ${received.toFixed(6)}° to be within ${arcsec}″ of ${expected.toFixed(6)}°, difference ${fmt(diff)} (${(diff * 3600).toFixed(2)}″)`,
    };
  },
});

declare module "vitest" {
  interface Matchers<R extends void | Promise<void> = void | Promise<void>, T = unknown> {
    toBeCloseToArcsec(expected: number, arcsec: number): R;
    /** phantom use of T so the merged declaration keeps vitest's parameter list */
    readonly __arcsecSubject?: T;
  }
  interface AsymmetricMatchersContaining {
    toBeCloseToArcsec(expected: number, arcsec: number): unknown;
  }
}
