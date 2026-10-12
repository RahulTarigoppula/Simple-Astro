import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as A from "astronomy-engine";
import { describe, expect, it } from "vitest";
import { mulberry32 } from "../math";
import { altAzXY, eunX, eunY, SKY_R, skyProjection } from "./projection";
import { rooftopSky, siderealPointEun, starMatrix } from "./rooftop";
import { altAzOfRadec, decodeStars, horizonVectors, mul3, precessionMatrix, projectStars, type StarCatalog, transformStars } from "./stars";

const BIN = readFileSync(fileURLToPath(new URL("../../data/bsc5.bin", import.meta.url)));
const stars: StarCatalog = decodeStars(BIN);

const R2D = 180 / Math.PI;
const raHours = (i: number): number => ((stars.ra[i] ?? 0) * R2D) / 15;
const decDeg = (i: number): number => (stars.dec[i] ?? 0) * R2D;

/** Nearest catalogue star to a J2000 position (hours, degrees). */
function find(raH: number, dec: number): number {
  let best = -1;
  let bestD = Number.POSITIVE_INFINITY;
  for (let i = 0; i < stars.count; i++) {
    const dRa = (((raHours(i) - raH) * 15 + 540) % 360) - 180;
    const d = Math.hypot(dRa * Math.cos((dec * Math.PI) / 180), decDeg(i) - dec);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  }
  expect(bestD).toBeLessThan(0.05);
  return best;
}

describe("bsc5.bin", () => {
  it("decodes the whole naked-eye catalogue within the size budget", () => {
    expect(BIN.byteLength).toBeLessThanOrEqual(60 * 1024);
    expect(stars.count).toBeGreaterThanOrEqual(9000);
    expect(stars.count).toBeLessThan(9200);
    // brightest first
    for (let i = 1; i < stars.count; i++) expect(stars.mag[i]).toBeGreaterThanOrEqual(stars.mag[i - 1] ?? -9);
    let le6 = 0;
    for (let i = 0; i < stars.count; i++) if ((stars.mag[i] ?? 9) <= 6.0) le6++;
    expect(le6).toBeGreaterThan(5000);
  });

  it("puts Sirius, Polaris and Betelgeuse where they belong", () => {
    // Sirius: 06h45m08.9s −16°42′58″, V −1.46 — the brightest star, first in the file.
    expect(raHours(0)).toBeCloseTo(6 + 45 / 60 + 8.9 / 3600, 2);
    expect(decDeg(0)).toBeCloseTo(-16.716, 1);
    expect(stars.mag[0]).toBeCloseTo(-1.46, 1);
    // Polaris: 02h31m48.7s +89°15′51″, V 2.02
    const pol = find(2.5302, 89.264);
    expect(stars.mag[pol]).toBeCloseTo(2.02, 1);
    // Betelgeuse: 05h55m10.3s +07°24′25″, V 0.50 (variable)
    const bet = find(5.9195, 7.407);
    expect(stars.mag[bet]).toBeGreaterThan(0.2);
    expect(stars.mag[bet]).toBeLessThan(0.9);
  });

  it("unit vectors match RA/Dec", () => {
    for (const i of [0, 100, 5000, stars.count - 1]) {
      const x = stars.xyz[3 * i] ?? 0;
      const y = stars.xyz[3 * i + 1] ?? 0;
      const z = stars.xyz[3 * i + 2] ?? 0;
      expect(Math.hypot(x, y, z)).toBeCloseTo(1, 5);
      expect(Math.asin(z)).toBeCloseTo(stars.dec[i] ?? 0, 5);
    }
  });

  it("rejects a wrong magic", () => {
    expect(() => decodeStars(new Uint8Array(32))).toThrow(/magic/);
  });
});

describe("projection", () => {
  const pol = find(2.5302, 89.264);
  const rng = mulberry32(42);

  it("Polaris stands at the observer's latitude at any hour", () => {
    for (let k = 0; k < 40; k++) {
      const lat = rng() * 85; // northern observers
      const lst = rng() * 360;
      const p = projectStars(stars, lst, lat);
      expect(Math.abs((p.alt[pol] ?? 0) - lat)).toBeLessThan(1);
    }
  });

  it("a star at the zenith has altitude 90", () => {
    const i = 1234;
    const p = projectStars(stars, (stars.ra[i] ?? 0) * R2D, decDeg(i));
    expect(p.alt[i]).toBeGreaterThan(89.99);
  });

  it("azimuth runs N → E: a star due east at the equator rises at az 90", () => {
    const a = altAzOfRadec(0, 0, -90, 0); // hour angle −6h → rising, due east
    expect(a.alt).toBeCloseTo(0, 6);
    expect(a.az).toBeCloseTo(90, 6);
  });

  it("agrees with astronomy-engine's Horizon for Sirius (precessed to date)", () => {
    const t = A.MakeTime(new Date(Date.UTC(1994, 2, 14, 1, 55)));
    const obs = new A.Observer(12.97, 77.59, 0);
    const sky = rooftopSky(t.date.getTime(), obs.latitude, obs.longitude);
    const eun = transformStars(stars, starMatrix(sky));
    const alt = Math.asin(eun[1] ?? 0) * R2D;
    const az = (Math.atan2(eun[0] ?? 0, eun[2] ?? 0) * R2D + 360) % 360;
    const eq = A.RotateVector(A.Rotation_EQJ_EQD(t), A.VectorFromSphere(new A.Spherical(decDeg(0), raHours(0) * 15, 1), t));
    const s = A.EquatorFromVector(eq);
    const h = A.Horizon(t, obs, s.ra, s.dec);
    expect(alt).toBeCloseTo(h.altitude, 1);
    expect(az).toBeCloseTo(h.azimuth, 1);
  });

  it("the IAU 1976 matrix agrees with astronomy-engine's precession to < 30″ (nutation)", () => {
    const t = A.MakeTime(new Date(Date.UTC(1950, 0, 1)));
    const P = precessionMatrix(t.tt + 2451545);
    const v = A.RotateVector(A.Rotation_EQJ_EQD(t), new A.Vector(1, 0, 0, t));
    const mine = [P[0], P[3], P[6]];
    const dot = (mine[0] ?? 0) * v.x + (mine[1] ?? 0) * v.y + (mine[2] ?? 0) * v.z;
    expect(Math.acos(Math.min(1, dot)) * R2D * 3600).toBeLessThan(30);
    expect(mul3(P, [1, 0, 0, 0, 1, 0, 0, 0, 1])).toEqual(P);
  });

  it("the closed-form star projection is the d3-geo stereographic projection (East at the bottom)", () => {
    const p = skyProjection();
    for (let k = 0; k < 50; k++) {
      const alt = rng() * 90;
      const az = rng() * 360;
      const a = (alt * Math.PI) / 180;
      const z = (az * Math.PI) / 180;
      const e = Math.cos(a) * Math.sin(z);
      const u = Math.sin(a);
      const n = Math.cos(a) * Math.cos(z);
      const d3 = p([az - 90, alt]) ?? [Number.NaN, Number.NaN];
      expect(eunX(e, u, n)).toBeCloseTo(d3[0], 6);
      expect(eunY(e, u, n)).toBeCloseTo(d3[1], 6);
      const [x, y] = altAzXY(alt, az);
      expect(x).toBeCloseTo(d3[0], 6);
      expect(y).toBeCloseTo(d3[1], 6);
    }
    expect(altAzXY(0, 90)[1]).toBeCloseTo(SKY_R, 9); // East on the horizon → bottom of the disc
    expect(altAzXY(0, 0)[0]).toBeCloseTo(-SKY_R, 9); // North → left
  });

  it("projects every star in under 2 ms", () => {
    const out = { alt: new Float32Array(stars.count), az: new Float32Array(stars.count) };
    const eun = new Float32Array(stars.count * 3);
    for (let k = 0; k < 20; k++) projectStars(stars, k * 7, 30, undefined, out); // warm the JIT
    const runs: number[] = [];
    for (let k = 0; k < 30; k++) {
      const t0 = performance.now();
      projectStars(stars, k * 11, 28.6, undefined, out);
      runs.push(performance.now() - t0);
    }
    runs.sort((a, b) => a - b);
    expect(runs[15]).toBeLessThan(2);
    const t1 = performance.now();
    for (let k = 0; k < 30; k++) horizonVectors(stars, k * 11, 28.6, undefined, eun);
    expect((performance.now() - t1) / 30).toBeLessThan(2);
  });
});

describe("rooftop model", () => {
  const ms = Date.UTC(1994, 2, 14, 1, 55); // 07:25 IST, Bengaluru
  const sky = rooftopSky(ms, 12.97, 77.59);

  it("puts the Lagna on the eastern horizon", () => {
    expect(Math.abs(Math.asin(sky.lagna.v[1]) * R2D)).toBeLessThan(0.01);
    expect(sky.lagna.az).toBeGreaterThan(45);
    expect(sky.lagna.az).toBeLessThan(135);
    const back = siderealPointEun(sky, sky.lagna.lonSid);
    expect(back[0]).toBeCloseTo(sky.lagna.v[0], 6);
  });

  it("sees the Sun near the horizon just after a March sunrise and Rāhu/Ketu opposite", () => {
    const su = sky.bodies[0];
    expect(su?.id).toBe("SU");
    expect(su?.alt).toBeGreaterThan(-5);
    expect(su?.alt).toBeLessThan(20);
    const ra = sky.bodies[7];
    const ke = sky.bodies[8];
    expect((((ke?.lonSid ?? 0) - (ra?.lonSid ?? 0) + 360) % 360).toFixed(6)).toBe("180.000000");
    expect(sky.bodies).toHaveLength(9);
    expect(sky.moonK).toBeGreaterThanOrEqual(0);
    expect(sky.moonK).toBeLessThanOrEqual(1);
  });

  it("matches astronomy-engine's Horizon for the Moon and Jupiter within 0.1°", () => {
    const t = A.MakeTime(new Date(ms));
    const obs = new A.Observer(12.97, 77.59, 0);
    for (const [body, idx] of [
      [A.Body.Moon, 1],
      [A.Body.Jupiter, 4],
    ] as const) {
      const eq = A.Equator(body, t, obs, true, true);
      const h = A.Horizon(t, obs, eq.ra, eq.dec);
      const b = sky.bodies[idx];
      expect(Math.abs((b?.alt ?? 0) - h.altitude)).toBeLessThan(0.1);
      expect(Math.abs((((b?.az ?? 0) - h.azimuth + 540) % 360) - 180)).toBeLessThan(0.1);
    }
  });

  it("recomputes in under 2 ms per scrub frame", () => {
    for (let k = 0; k < 10; k++) rooftopSky(ms + k * 60_000, 12.97, 77.59);
    const t0 = performance.now();
    for (let k = 0; k < 50; k++) rooftopSky(ms + k * 600_000, 12.97, 77.59);
    expect((performance.now() - t0) / 50).toBeLessThan(2);
  });
});
