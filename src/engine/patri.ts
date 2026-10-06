// The cast (§6.17): a pure function of (profile, preset) that assembles the whole Janam Patri.
// No clock is read here — `computedAt` is passed in, and `computeMs` uses the monotonic
// performance counter, which measures duration, not wall-clock time.
import { dignityOf } from "../data/tables/dignity";
import { ayanamsa, ayanamsaRateDegPerDay } from "./ayanamsa";
import { boundaryFlag } from "./boundary";
import { vimshottari } from "./dasha";
import {
  astroTime,
  astronomyEngineEphemeris,
  type Ephemeris,
  isCombust,
  PLANET_IDS,
  type PlanetId,
} from "./ephemeris";
import { EngineError } from "./errors";
import { lagna as solveLagna, wholeSignHouse } from "./lagna";
import { msToJd, norm360 } from "./math";
import { degInSignOf, nakshatraOf, signOf } from "./nakshatra";
import { ketuOf, MEAN_NODE_SPEED, meanNode, trueNode, trueNodeSpeed } from "./nodes";
import { computePanchang } from "./panchang";
import { MAX_YEAR, MIN_YEAR } from "./time";
import {
  type DashaNode,
  type Deg,
  type EnginePreset,
  GRAHA_IDS,
  type Graha,
  type GrahaId,
  type Lagna,
  type Patri,
  type PatriCore,
  PRESET_HASH,
  type Profile,
  type VargaNumber,
} from "./types";
import { vargaChart } from "./vargas";
import { runYogas } from "./yogas";

/** The house reference chart (§0.1a): Rahul · 1994-03-14 07:25 IST · Bengaluru. */
export const REFERENCE_PROFILE: Profile = {
  id: "reference-rahul",
  name: "Rahul",
  birth: {
    localY: 1994,
    localMo: 3,
    localD: 14,
    localH: 7,
    localMi: 25,
    place: { name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.9716, lon: 77.5946, source: "manual" },
    zone: "Asia/Kolkata",
    utcMs: Date.UTC(1994, 2, 14, 1, 55),
    offsetMin: 330,
    jdUt: Date.UTC(1994, 2, 14, 1, 55) / 86_400_000 + 2440587.5,
    offsetSource: "tzdb",
  },
  handedness: "right",
  createdAt: 0,
  updatedAt: 0,
};

interface RawBody {
  lonTropical: Deg;
  lat: number;
  speedTropical: number;
}

function grahaFrom(
  id: GrahaId,
  raw: RawBody,
  ay: Deg,
  ayRate: number,
  lagnaSign: number,
  sunTropical: Deg,
): Graha {
  const lonSidereal = norm360(raw.lonTropical - ay);
  const speed = raw.speedTropical - ayRate;
  const isNode = id === "RA" || id === "KE";
  const retrograde = isNode ? true : speed < 0; // the nodes are always drawn retrograde
  const n = nakshatraOf(lonSidereal);
  const sign = signOf(lonSidereal);
  return {
    id,
    lonTropical: norm360(raw.lonTropical),
    lonSidereal,
    latEcliptic: raw.lat,
    speed,
    retrograde,
    sign,
    degInSign: degInSignOf(lonSidereal),
    nakshatra: n.index,
    pada: n.pada,
    nakshatraLord: n.lord,
    house: wholeSignHouse(sign, lagnaSign),
    dignity: dignityOf(id, lonSidereal),
    combust: isCombust(id, raw.lonTropical, sunTropical, retrograde),
    boundary: boundaryFlag(lonSidereal),
  };
}

/** Everything a cast produces before the yoga pass. */
export function castCore(profile: Profile, preset: EnginePreset, eph: Ephemeris = astronomyEngineEphemeris): PatriCore {
  const { utcMs, place } = profile.birth;
  if (!Number.isFinite(utcMs)) throw new EngineError("TIME_INVALID", "birth instant is not a number");
  const year = new Date(utcMs).getUTCFullYear();
  if (year < MIN_YEAR || year > MAX_YEAR) {
    throw new EngineError("EPHEMERIS_RANGE", `year ${year} is outside ${MIN_YEAR}–${MAX_YEAR}`);
  }
  if (!Number.isFinite(place.lat) || !Number.isFinite(place.lon)) {
    throw new EngineError("PLACE_MISSING", "birthplace has no coordinates");
  }

  const t = astroTime(utcMs);
  const jdUt = msToJd(utcMs);
  const jdTt = t.tt + 2451545.0;
  const ay = ayanamsa(jdTt, preset.ayanamsa);
  const ayRate = ayanamsaRateDegPerDay(jdTt);

  const raw = {} as Record<GrahaId, RawBody>;
  for (const id of PLANET_IDS) {
    const p = eph.position(id, t);
    raw[id] = { lonTropical: p.lon, lat: p.lat, speedTropical: eph.speed(id as PlanetId, t) };
  }
  const rahu: RawBody =
    preset.node === "true"
      ? { lonTropical: trueNode(t), lat: 0, speedTropical: trueNodeSpeed(t) }
      : { lonTropical: meanNode(jdTt), lat: 0, speedTropical: MEAN_NODE_SPEED };
  raw.RA = rahu;
  raw.KE = { lonTropical: ketuOf(rahu.lonTropical), lat: 0, speedTropical: rahu.speedTropical };

  const L = solveLagna(t, place.lat, place.lon, ay, eph);
  const lagnaSign = signOf(L.ascSid);
  const ln = nakshatraOf(L.ascSid);
  const lagna: Lagna = {
    lonTropical: L.ascTrop,
    lonSidereal: L.ascSid,
    sign: lagnaSign,
    degInSign: degInSignOf(L.ascSid),
    nakshatra: ln.index,
    pada: ln.pada,
    nakshatraLord: ln.lord,
    boundary: boundaryFlag(L.ascSid),
  };

  const sunTropical = raw.SU.lonTropical;
  const grahas = {} as Record<GrahaId, Graha>;
  for (const id of GRAHA_IDS) grahas[id] = grahaFrom(id, raw[id], ay, ayRate, lagnaSign, sunTropical);

  const core: PatriCore = {
    profileId: profile.id,
    preset,
    presetHash: PRESET_HASH(preset),
    engine: { name: "astronomy-engine", version: eph.version, ayanamsaArcsec: ay * 3600 },
    jdUt,
    jdTt,
    ayanamsa: ay,
    lagna,
    mc: { lonSidereal: L.mcSid, sign: signOf(L.mcSid) },
    ramc: L.ramc,
    obliquity: L.eps,
    grahas,
    vargas: {},
    dasha: vimshottari(grahas.MO.lonSidereal, utcMs, preset.dashaYearDays),
    birthPanchang: computePanchang(utcMs, place, preset),
  };
  core.vargas = { 1: vargaChart(core, 1), 9: vargaChart(core, 9) };
  return core;
}

/** The full Patri. `nowForComputedAt` is stamped verbatim — the engine never reads the clock. */
export function computePatri(profile: Profile, preset: EnginePreset, nowForComputedAt: number): Patri {
  const t0 = performance.now();
  const core = castCore(profile, preset);
  const yogas = runYogas(core);
  const patri: Patri = { ...core, yogas, computedAt: nowForComputedAt, computeMs: 0 };
  if (isDev()) assertInvariants(patri);
  patri.computeMs = performance.now() - t0;
  return patri;
}

/** Lazily add a divisional chart (D2, D3, D7, D10, D12, D30, D60) — returns a new Patri. */
export function addVarga(patri: Patri, n: VargaNumber): Patri {
  if (patri.vargas[n]) return patri;
  return { ...patri, vargas: { ...patri.vargas, [n]: vargaChart(patri, n) } };
}

// ─── dev-only invariants (stripped from production by the DEV constant) ─────

function isDev(): boolean {
  return import.meta.env?.DEV === true;
}

function fail(detail: string): never {
  throw new EngineError("ORACLE_MISMATCH", detail);
}

const inRange = (x: number): boolean => Number.isFinite(x) && x >= 0 && x < 360;

function checkChildren(parent: DashaNode, depth: number): void {
  const kids = parent.children;
  if (!kids) return;
  if (kids.length !== 9) fail(`daśā ${parent.lord} has ${kids.length} children`);
  if (kids[0]?.startMs !== parent.startMs || kids[8]?.endMs !== parent.endMs) {
    fail(`daśā ${parent.lord} children do not span their parent`);
  }
  for (let i = 1; i < kids.length; i++) {
    if (kids[i]?.startMs !== kids[i - 1]?.endMs) fail(`daśā gap inside ${parent.lord}`);
  }
  if (depth < 3) for (const k of kids) checkChildren(k, depth + 1);
}

export function assertInvariants(p: Patri): void {
  for (const id of GRAHA_IDS) {
    const g = p.grahas[id];
    if (!inRange(g.lonSidereal) || !inRange(g.lonTropical)) fail(`${id} longitude out of [0,360)`);
    if (g.house < 1 || g.house > 12) fail(`${id} house ${g.house}`);
    if (p.vargas[1]?.placements[id] !== g.sign) fail(`${id} D1 disagrees with its sign`);
  }
  if (!inRange(p.lagna.lonSidereal) || !inRange(p.mc.lonSidereal)) fail("Lagna/MC out of [0,360)");
  if (Math.abs(signedNorm(p.grahas.KE.lonSidereal - p.grahas.RA.lonSidereal - 180)) > 1e-9) fail("Ketu ≠ Rāhu + 180°");
  const houses = new Set(Array.from({ length: 12 }, (_, s) => wholeSignHouse(s, p.lagna.sign)));
  if (houses.size !== 12) fail("whole-sign houses are not a bijection");
  if (p.dasha.length !== 9) fail(`${p.dasha.length} mahādaśās`);
  for (let i = 1; i < p.dasha.length; i++) {
    if (p.dasha[i]?.startMs !== p.dasha[i - 1]?.endMs) fail("mahādaśā gap");
  }
  for (const md of p.dasha) checkChildren(md, 2);
}

const signedNorm = (x: number): number => {
  const r = norm360(x);
  return r > 180 ? r - 360 : r;
};
