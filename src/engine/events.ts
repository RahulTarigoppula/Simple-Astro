// Sky events ahead: Moon phases and key tithis, eclipses (with local visibility), saṅkrāntis, graha
// sign changes and retrograde stations. Everything is solved from the ephemeris, not looked up.
import * as A from "astronomy-engine";
import { sankrantisBetween } from "./calendar";
import { astroTime } from "./ephemeris";
import { transitsAt } from "./gochar";
import type { EnginePreset, GrahaId, SignIdx } from "./types";

export type SkyEventKind = "full" | "new" | "ekadashi" | "lunar-eclipse" | "solar-eclipse" | "sankranti" | "ingress" | "station";

export interface SkyEvent {
  kind: SkyEventKind;
  ms: number;
  graha?: GrahaId;
  sign?: SignIdx;
  /** Stations: true when the graha turns retrograde, false when it turns direct. */
  retro?: boolean;
  /** Eclipses: "total" | "partial" | "annular" | "penumbral". */
  eclipse?: string;
  /** Eclipses: whether any of it can be seen from the place. */
  visibleHere?: boolean;
  /** Ekādaśī: true in the bright (waxing) fortnight. */
  shukla?: boolean;
}

const DAY = 86_400_000;
const SLOW: readonly GrahaId[] = ["SU", "MA", "ME", "VE", "JU", "SA", "RA"];
const STATIONARY: readonly GrahaId[] = ["MA", "ME", "VE", "JU", "SA"];

function phases(fromMs: number, toMs: number): SkyEvent[] {
  const out: SkyEvent[] = [];
  const wanted: Array<[number, SkyEventKind]> = [
    [0, "new"],
    [180, "full"],
    // Ekādaśī tithi begins when the Moon is 120° (śukla) or 300° (kṛṣṇa) ahead of the Sun.
    [120, "ekadashi"],
    [300, "ekadashi"],
  ];
  for (const [angle, kind] of wanted) {
    let t = astroTime(fromMs);
    for (let guard = 0; guard < 24; guard++) {
      const hit = A.SearchMoonPhase(angle, t, 40);
      if (!hit) break;
      const ms = hit.date.getTime();
      if (ms > toMs) break;
      if (ms >= fromMs) out.push(kind === "ekadashi" ? { kind, ms, shukla: angle === 120 } : { kind, ms });
      t = hit.AddDays(1);
    }
  }
  return out;
}

function eclipses(fromMs: number, toMs: number, lat: number, lon: number): SkyEvent[] {
  const out: SkyEvent[] = [];
  const obs = new A.Observer(lat, lon, 0);
  let le = A.SearchLunarEclipse(new Date(fromMs));
  for (let g = 0; g < 8 && le.peak.date.getTime() <= toMs; g++) {
    const ms = le.peak.date.getTime();
    const moonAlt = A.Horizon(le.peak, obs, ...radec(le.peak, obs)).altitude;
    out.push({ kind: "lunar-eclipse", ms, eclipse: String(le.kind), visibleHere: moonAlt > 0 });
    le = A.NextLunarEclipse(le.peak);
  }
  let ge = A.SearchGlobalSolarEclipse(new Date(fromMs));
  for (let g = 0; g < 8 && ge.peak.date.getTime() <= toMs; g++) {
    let visible = false;
    try {
      const local = A.SearchLocalSolarEclipse(ge.peak.AddDays(-1), obs);
      visible = Math.abs(local.peak.time.ut - ge.peak.ut) < 1 && local.peak.altitude > 0;
    } catch {
      visible = false;
    }
    out.push({ kind: "solar-eclipse", ms: ge.peak.date.getTime(), eclipse: String(ge.kind), visibleHere: visible });
    ge = A.NextGlobalSolarEclipse(ge.peak);
  }
  return out;
}

function radec(t: A.AstroTime, obs: A.Observer): [number, number, string] {
  const eq = A.Equator(A.Body.Moon, t, obs, true, true);
  return [eq.ra, eq.dec, "normal"];
}

/** Sign changes and stations for the slower grahas, found by daily stepping then bisection. */
function motions(fromMs: number, toMs: number, preset: EnginePreset): SkyEvent[] {
  const out: SkyEvent[] = [];
  let prev = transitsAt(fromMs, preset);
  for (let ms = fromMs + DAY; ms <= toMs + DAY; ms += DAY) {
    const cur = transitsAt(ms, preset);
    for (const id of SLOW) {
      if (cur[id].sign !== prev[id].sign) {
        let lo = ms - DAY;
        let hi = ms;
        const s0 = prev[id].sign;
        for (let i = 0; i < 24; i++) {
          const mid = (lo + hi) / 2;
          if (transitsAt(mid, preset)[id].sign === s0) lo = mid;
          else hi = mid;
        }
        if (hi >= fromMs && hi <= toMs) out.push({ kind: "ingress", ms: hi, graha: id, sign: cur[id].sign });
      }
    }
    for (const id of STATIONARY) {
      if (Math.sign(cur[id].speed) !== Math.sign(prev[id].speed)) {
        let lo = ms - DAY;
        let hi = ms;
        const sg = Math.sign(prev[id].speed);
        for (let i = 0; i < 20; i++) {
          const mid = (lo + hi) / 2;
          if (Math.sign(transitsAt(mid, preset)[id].speed) === sg) lo = mid;
          else hi = mid;
        }
        if (hi >= fromMs && hi <= toMs) out.push({ kind: "station", ms: hi, graha: id, retro: cur[id].speed < 0 });
      }
    }
    prev = cur;
  }
  return out;
}

/** Everything notable in the sky between now and `days` ahead, soonest first. */
export function skyEvents(fromMs: number, days: number, place: { lat: number; lon: number }, preset: EnginePreset): SkyEvent[] {
  const toMs = fromMs + days * DAY;
  const sank: SkyEvent[] = sankrantisBetween(fromMs, toMs, preset.ayanamsa).map((s) => ({ kind: "sankranti", ms: s.ms, sign: s.sign }));
  // A Sun ingress is the saṅkrānti itself; keep one of the two.
  const moves = motions(fromMs, toMs, preset).filter((e) => !(e.kind === "ingress" && e.graha === "SU"));
  return [...phases(fromMs, toMs), ...eclipses(fromMs, toMs, place.lat, place.lon), ...sank, ...moves].sort((a, b) => a.ms - b.ms);
}
