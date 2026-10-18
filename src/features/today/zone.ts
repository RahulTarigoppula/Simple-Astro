// Clock faces for one IANA zone. Every instant is UTC ms; the zone is the PLACE's, never the
// device's, so a Bengaluru leaf read in Denver still prints Bengaluru's clock.

import { safeZone } from "../../engine/time";

export interface ZoneClock {
  zone: string;
  /** "17:04" */
  hm(ms: number): string;
  /** "17:04:12" */
  hms(ms: number): string;
  /** Local civil day number (days since 1970-01-01 on the zone's calendar). */
  dayNumber(ms: number): number;
  /** Local hours as a fraction, 0 ≤ h < 24. */
  hours(ms: number): number;
  /** "Tuesday, 6 October 2026" */
  dateLong(ms: number): string;
  /** "Tue 6 Oct 2026" */
  dateShort(ms: number): string;
  /** "UTC+05:30" */
  offset(ms: number): string;
}

const cache = new Map<string, ZoneClock>();

export function zoneClock(zoneIn: string): ZoneClock {
  const hit = cache.get(zoneIn);
  if (hit) return hit;
  const zone = safeZone(zoneIn);
  const fHm = new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });
  const fHms = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const fParts = new Intl.DateTimeFormat("en-GB", {
    timeZone: zone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    second: "numeric",
    hourCycle: "h23",
  });
  const fLong = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "long", day: "numeric", month: "long", year: "numeric" });
  const fShort = new Intl.DateTimeFormat("en-GB", { timeZone: zone, weekday: "short", day: "numeric", month: "short", year: "numeric" });
  let fOff: Intl.DateTimeFormat | null = null;
  try {
    fOff = new Intl.DateTimeFormat("en-GB", { timeZone: zone, timeZoneName: "longOffset" });
  } catch {
    fOff = null;
  }

  const parts = (ms: number): Record<string, number> => {
    const out: Record<string, number> = {};
    for (const p of fParts.formatToParts(ms)) if (p.type !== "literal") out[p.type] = Number(p.value);
    return out;
  };

  const clock: ZoneClock = {
    zone,
    hm: (ms) => fHm.format(ms),
    hms: (ms) => fHms.format(ms),
    dayNumber: (ms) => {
      const p = parts(ms);
      return Math.round(Date.UTC(p.year ?? 1970, (p.month ?? 1) - 1, p.day ?? 1) / 86_400_000);
    },
    hours: (ms) => {
      const p = parts(ms);
      return ((p.hour ?? 0) % 24) + (p.minute ?? 0) / 60 + (p.second ?? 0) / 3600;
    },
    dateLong: (ms) => fLong.format(ms).replace(/^(\w+) /, "$1, "),
    dateShort: (ms) => fShort.format(ms).replace(",", ""),
    offset: (ms) => {
      if (!fOff) return zone === "UTC" ? "UTC+00:00" : "";
      const name = fOff.formatToParts(ms).find((p) => p.type === "timeZoneName")?.value ?? "GMT";
      const m = /GMT([+\-−]\d{1,2}(?::\d{2})?)?/.exec(name);
      const raw = m?.[1];
      if (!raw) return "UTC+00:00";
      const sign = raw.startsWith("-") || raw.startsWith("−") ? "−" : "+";
      const [h = "0", mi = "00"] = raw.slice(1).split(":");
      return `UTC${sign}${h.padStart(2, "0")}:${mi}`;
    },
  };
  cache.set(zoneIn, clock);
  return clock;
}

/** "ends 17:04" or "ends 09:17 +1", the +n counts civil days past the governing day. */
export function endsLabel(clock: ZoneClock, endMs: number, dayMs: number): string {
  const dd = clock.dayNumber(endMs) - clock.dayNumber(dayMs);
  return `ends ${clock.hm(endMs)}${dd > 0 ? ` +${dd}` : ""}`;
}

/** "15:22-16:54" (with "+1" on the end when it crosses midnight). */
export function rangeLabel(clock: ZoneClock, [a, b]: readonly [number, number]): string {
  const dd = clock.dayNumber(b) - clock.dayNumber(a);
  return `${clock.hm(a)}-${clock.hm(b)}${dd > 0 ? ` +${dd}` : ""}`;
}
