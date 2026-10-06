// Golden-chart suite (§10.3): 50 charts, oracle = Swiss Ephemeris (pyswisseph, Moshier, SE_SIDM_LAHIRI),
// computed OUTSIDE the repo — only the numbers live in __fixtures__/golden-charts.json (see oracle-notes.md).
// Tolerance: 60″ on every graha, Rāhu/Ketu (matching node mode) and the Lagna, under preset se-true.
import { afterAll, describe, expect, it } from "vitest";
import golden from "./__fixtures__/golden-charts.json";
import { computePatri } from "./patri";
import type { BirthMoment, EnginePreset, NodeMode, Profile } from "./types";

// ─── fixture shape ───────────────────────────────────────────────────────────
interface GoldenGraha {
  lonTropical: number;
  lonSidereal: number;
  speedTropical: number;
  speedSidereal: number;
  nakshatra: number;
  pada: number;
}
interface GoldenNode {
  rahuTropical: number;
  rahuSidereal: number;
  ketuSidereal: number;
  speed: number;
}
interface GoldenChart {
  id: string;
  label: string;
  band: string;
  tags: string[];
  input: {
    utcIso: string;
    utcMs: number;
    lat: number;
    lon: number;
    localNote: string;
    local: { y: number; mo: number; d: number; h: number; mi: number; offsetMin: number; zone: string };
    place: { name: string; country: string };
  };
  preset: {
    ayanamsa: "se-true";
    nodeType: NodeMode;
    dashaYearDays: 365.25;
    sunrise: "upper-limb-refracted";
    bhavaSystem: "whole-sign";
  };
  oracle: string;
  expected: {
    jdUt: number;
    ayanamsaTrue: number;
    ayanamsaMean: number;
    grahas: Record<"SU" | "MO" | "MA" | "ME" | "JU" | "VE" | "SA", GoldenGraha>;
    nodes: Record<NodeMode, GoldenNode>;
    houses: { ascTropical: number; mcTropical: number; armc: number; ascSidereal: number; mcSidereal: number };
  };
}

const CHARTS = (golden as unknown as { charts: GoldenChart[] }).charts;
const TOL = 60; // arcsec — the ±1′ engine claim
const AYANAMSA_TOL = 2; // arcsec — §6.2 says ±1″ on the SE columns; 2″ leaves room for the short nutation series
const NOW_MS = Date.UTC(2026, 8, 8, 14, 40, 0); // fixed; the engine never reads the clock
const PLANETS = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"] as const;

/** Signed difference received − expected in arcseconds, wrapped to (−648000, 648000]. */
function deltaArcsec(received: number, expected: number): number {
  return (((((received - expected) % 360) + 540) % 360) - 180) * 3600;
}

function profileFor(c: GoldenChart): Profile {
  const { local, place, lat, lon, utcMs } = c.input;
  const birth: BirthMoment = {
    localY: local.y,
    localMo: local.mo,
    localD: local.d,
    localH: local.h,
    localMi: local.mi,
    place: { name: place.name, country: place.country, lat, lon, source: "manual" },
    zone: local.zone,
    offsetOverrideMin: local.offsetMin,
    utcMs,
    offsetMin: local.offsetMin,
    jdUt: utcMs / 86_400_000 + 2440587.5,
    offsetSource: "override",
  };
  return { id: `golden-${c.id}`, name: c.label, birth, handedness: "right", createdAt: 0, updatedAt: 0 };
}

function presetFor(c: GoldenChart, node: NodeMode): EnginePreset {
  return {
    ayanamsa: c.preset.ayanamsa,
    node,
    dashaYearDays: c.preset.dashaYearDays,
    sunrise: c.preset.sunrise,
    houseSystem: c.preset.bhavaSystem,
  };
}

type Row = { body: string; engine: number; oracle: number; delta: number; tol: number };
const maxAbs: Record<string, { delta: number; chart: string }> = {};

function record(rows: Row[], chart: string) {
  for (const r of rows) {
    const cur = maxAbs[r.body];
    if (!cur || Math.abs(r.delta) > Math.abs(cur.delta)) maxAbs[r.body] = { delta: r.delta, chart };
  }
}

function printTable(c: GoldenChart, rows: Row[]) {
  const lines = rows.map(
    (r) =>
      `  ${r.body.padEnd(9)} engine ${r.engine.toFixed(5).padStart(10)}°  oracle ${r.oracle.toFixed(5).padStart(10)}°  Δ ${r.delta
        .toFixed(1)
        .padStart(8)}″${Math.abs(r.delta) > r.tol ? `  ✗ (> ${r.tol}″)` : ""}`,
  );
  console.error(`\n${c.id} ${c.label} — ${c.input.utcIso} (${c.input.lat}, ${c.input.lon})\n${lines.join("\n")}`);
}

describe("golden-charts.json — fixture integrity", () => {
  it("has 50 charts, 10 per decade band, the reference chart first", () => {
    expect(CHARTS).toHaveLength(50);
    for (const band of ["1900-1929", "1930-1959", "1960-1989", "1990-2019", "2020-2030"]) {
      expect(CHARTS.filter((c) => c.band === band), band).toHaveLength(10);
    }
    expect(CHARTS[0]!.input.utcIso).toBe("1994-03-14T01:55:00Z");
    expect(CHARTS.filter((c) => c.tags.includes("war-time-ist"))).toHaveLength(6);
    expect(CHARTS.filter((c) => c.tags.includes("nakshatra-boundary"))).toHaveLength(4);
    expect(CHARTS.filter((c) => Math.abs(c.input.lat) < 1).length).toBeGreaterThanOrEqual(2);
  });

  it("every utcMs agrees with utcIso and jdUt", () => {
    for (const c of CHARTS) {
      expect(new Date(c.input.utcMs).toISOString().replace(".000Z", "Z")).toBe(c.input.utcIso);
      expect(Math.abs(c.input.utcMs / 86_400_000 + 2440587.5 - c.expected.jdUt)).toBeLessThan(1e-7);
    }
  });
});

describe("golden charts vs Swiss Ephemeris (se-true, ±60″)", () => {
  afterAll(() => {
    const lines = Object.entries(maxAbs).map(
      ([body, v]) => `  ${body.padEnd(9)} max |Δ| ${Math.abs(v.delta).toFixed(1).padStart(7)}″  (${v.chart})`,
    );
    console.info(`\ngolden-charts: per-body max |Δ| over ${CHARTS.length} charts\n${lines.join("\n")}`);
  });

  it.each(CHARTS.map((c) => [`${c.id} ${c.label}`, c] as const))("%s", (_name, c) => {
    const profile = profileFor(c);
    const e = c.expected;

    const pt = computePatri(profile, presetFor(c, "true"), NOW_MS);
    const pm = computePatri(profile, presetFor(c, "mean"), NOW_MS);

    const rows: Row[] = [];
    for (const id of PLANETS) {
      rows.push({ body: id, engine: pt.grahas[id].lonSidereal, oracle: e.grahas[id].lonSidereal, delta: 0, tol: TOL });
    }
    rows.push({ body: "Lagna", engine: pt.lagna.lonSidereal, oracle: e.houses.ascSidereal, delta: 0, tol: TOL });
    rows.push({ body: "RA true", engine: pt.grahas.RA.lonSidereal, oracle: e.nodes.true.rahuSidereal, delta: 0, tol: TOL });
    rows.push({ body: "KE true", engine: pt.grahas.KE.lonSidereal, oracle: e.nodes.true.ketuSidereal, delta: 0, tol: TOL });
    rows.push({ body: "RA mean", engine: pm.grahas.RA.lonSidereal, oracle: e.nodes.mean.rahuSidereal, delta: 0, tol: TOL });
    rows.push({ body: "KE mean", engine: pm.grahas.KE.lonSidereal, oracle: e.nodes.mean.ketuSidereal, delta: 0, tol: TOL });
    rows.push({ body: "ayanamsa", engine: pt.ayanamsa, oracle: e.ayanamsaTrue, delta: 0, tol: AYANAMSA_TOL });
    // diagnostics only (not asserted): tropical Sun separates frame/ayanamsa errors from ephemeris errors
    const diag: Row[] = [
      { body: "SU trop", engine: pt.grahas.SU.lonTropical, oracle: e.grahas.SU.lonTropical, delta: 0, tol: Infinity },
      { body: "MO trop", engine: pt.grahas.MO.lonTropical, oracle: e.grahas.MO.lonTropical, delta: 0, tol: Infinity },
      { body: "Lag trop", engine: pt.lagna.lonTropical, oracle: e.houses.ascTropical, delta: 0, tol: Infinity },
      { body: "RAMC", engine: pt.ramc, oracle: e.houses.armc, delta: 0, tol: Infinity },
    ];
    for (const r of [...rows, ...diag]) r.delta = deltaArcsec(r.engine, r.oracle);
    record([...rows, ...diag], c.id);

    if (rows.some((r) => Math.abs(r.delta) > r.tol)) printTable(c, [...rows, ...diag]);

    for (const r of rows) {
      expect.soft(r.engine, `${c.id} ${r.body}`).toBeCloseToArcsec(r.oracle, r.tol);
    }
  });
});
