// The form as it is being filled, and where it is kept while the person is away from it.
// The draft lives in sessionStorage (this tab only, gone when the tab closes), so tapping away,
// Back then Forward, or a reload never throws away what was typed. Nothing here leaves the device.
import type { Tradition } from "../../data/regional";
import type { Place } from "../../engine/types";

export interface Draft {
  name: string;
  y: number; // 0 = unset
  mo: number; // 0 = unset
  d: number; // 0 = unset
  hour12: number; // 0 = unset
  ampm: "am" | "pm" | null; // never assumed
  mi: number;
  place: Place | null;
  override: "none" | "bombay" | "manual";
  manualOffsetMin: number;
  handedness: "right" | "left";
  timeUnknown: boolean;
  tradition: Tradition;
}

/** Nothing is assumed: the date, the hour and the place all start empty. */
export function freshDraft(): Draft {
  return {
    name: "",
    y: 0,
    mo: 0,
    d: 0,
    hour12: 0,
    ampm: null,
    mi: 0,
    place: null,
    override: "none",
    manualOffsetMin: 330,
    handedness: "right",
    timeUnknown: false,
    tradition: "north",
  };
}

const DRAFT_KEY = "vyom-leaf-draft";
/** One draft for "Add a person", and one per person being edited. */
export const draftKey = (id?: string): string => (id ? `${DRAFT_KEY}:${id}` : DRAFT_KEY);

export const sameDraft = (a: Draft, b: Draft): boolean => JSON.stringify(a) === JSON.stringify(b);

const isRecord = (x: unknown): x is Record<string, unknown> => typeof x === "object" && x !== null && !Array.isArray(x);
const int = (x: unknown, lo: number, hi: number, otherwise: number): number =>
  typeof x === "number" && Number.isInteger(x) && x >= lo && x <= hi ? x : otherwise;
const SOURCES: ReadonlyArray<Place["source"]> = ["bundle", "open-meteo", "nominatim", "manual"];

function placeOf(x: unknown): Place | null {
  if (!isRecord(x)) return null;
  const { name, admin1, country, lat, lon, elevation, geonameId, timezone, source } = x;
  if (typeof name !== "string" || !name) return null;
  if (typeof lat !== "number" || !Number.isFinite(lat) || Math.abs(lat) > 90) return null;
  if (typeof lon !== "number" || !Number.isFinite(lon) || Math.abs(lon) > 180) return null;
  return {
    name,
    ...(typeof admin1 === "string" ? { admin1 } : {}),
    country: typeof country === "string" ? country : "",
    lat,
    lon,
    ...(typeof elevation === "number" && Number.isFinite(elevation) ? { elevation } : {}),
    ...(typeof geonameId === "number" && Number.isFinite(geonameId) ? { geonameId } : {}),
    ...(typeof timezone === "string" ? { timezone } : {}),
    source: SOURCES.includes(source as Place["source"]) ? (source as Place["source"]) : "manual",
  };
}

/** Whatever was stored, read back as a draft with every field in range (anything odd falls back to empty). */
function draftOf(x: unknown): Draft | null {
  if (!isRecord(x)) return null;
  const f = freshDraft();
  return {
    name: typeof x.name === "string" ? x.name.slice(0, 60) : f.name,
    y: int(x.y, 0, 9999, 0),
    mo: int(x.mo, 0, 12, 0),
    d: int(x.d, 0, 99, 0),
    hour12: int(x.hour12, 0, 12, 0),
    ampm: x.ampm === "am" || x.ampm === "pm" ? x.ampm : null,
    mi: int(x.mi, 0, 59, 0),
    place: placeOf(x.place),
    override: x.override === "bombay" || x.override === "manual" ? x.override : "none",
    manualOffsetMin: int(x.manualOffsetMin, -12 * 60 - 59, 14 * 60 + 59, f.manualOffsetMin),
    handedness: x.handedness === "left" ? "left" : "right",
    timeUnknown: x.timeUnknown === true,
    tradition: x.tradition === "telugu" || x.tradition === "tamil" ? x.tradition : "north",
  };
}

/** The draft kept under this key, or null (none kept, storage switched off, or not readable). */
export function readDraft(key: string): Draft | null {
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? draftOf(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export function writeDraft(key: string, draft: Draft): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(draft));
  } catch {
    // Storage is full or switched off: the form still works, it just is not kept.
  }
}

export function clearDraft(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // Nothing was kept.
  }
}
