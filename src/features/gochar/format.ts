// Zone-true date labels for the gochar components (never the device zone).
const MON = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function safeZone(zone: string): string {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: zone });
    return zone;
  } catch {
    return "UTC";
  }
}

function parts(ms: number, zone: string): { y: number; m: number; d: number } {
  const ps = new Intl.DateTimeFormat("en-GB", {
    timeZone: safeZone(zone),
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(ms);
  const get = (t: string): number => Number(ps.find((p) => p.type === t)?.value ?? 0);
  return { y: get("year"), m: get("month"), d: get("day") };
}

/** "29 Mar 2025" in the zone. */
export function fmtDate(ms: number, zone: string): string {
  const p = parts(ms, zone);
  return `${p.d} ${MON[p.m - 1] ?? ""} ${p.y}`;
}

/** "Mar 2025". */
export function fmtMonthYear(ms: number, zone: string): string {
  const p = parts(ms, zone);
  return `${MON[p.m - 1] ?? ""} ${p.y}`;
}

/** Calendar year in the zone. */
export function yearIn(ms: number, zone: string): number {
  return parts(ms, zone).y;
}

/** "12 OCT" — for engraved strips. */
export function fmtDayMonthEngraved(ms: number, zone: string): string {
  const p = parts(ms, zone);
  return `${p.d} ${(MON[p.m - 1] ?? "").toUpperCase()}`;
}

/** "2022–30" style span. */
export function yearSpan(a: number, b: number, zone: string): string {
  const ya = yearIn(a, zone);
  const yb = yearIn(b, zone);
  if (ya === yb) return String(ya);
  return Math.floor(ya / 100) === Math.floor(yb / 100) ? `${ya}–${String(yb).slice(2)}` : `${ya}–${yb}`;
}
