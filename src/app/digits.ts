// Devanagari digits (०-९) for ledger cells when the Drawer asks for them. Engraved brass (drums,
// strips) stays Latin by convention, so callers opt in per cell.
const DEV = ["०", "१", "२", "३", "४", "५", "६", "७", "८", "९"];

export function toDevDigits(s: string): string {
  return s.replace(/[0-9]/g, (d) => DEV[Number(d)] ?? d);
}

export const digitsFor =
  (on: boolean) =>
  (s: string | number): string =>
    on ? toDevDigits(String(s)) : String(s);
