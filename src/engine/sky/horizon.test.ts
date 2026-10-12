import * as A from "astronomy-engine";
import { describe, expect, it } from "vitest";
import { SLACK } from "../../test/perf";
import { astroTime } from "../ephemeris";
import { computePatri, REFERENCE_PROFILE } from "../patri";
import { DEFAULT_PRESET } from "../types";
import { altAz, skySnapshot } from "./horizon";

const D2R = Math.PI / 180;
const BIRTH = REFERENCE_PROFILE.birth.utcMs;
const { lat, lon } = REFERENCE_PROFILE.birth.place;

describe("altAz", () => {
  it("zenith, horizon and cardinal azimuths", () => {
    expect(altAz(0, 30 * D2R, 0, 30).alt).toBeCloseTo(90, 9); // on the meridian at dec = φ
    const east = altAz(90 * D2R, 0, 0, 0); // equator, H = −90°: rising due east
    expect(east.alt).toBeCloseTo(0, 9);
    expect(east.az).toBeCloseTo(90, 9);
    const west = altAz(270 * D2R, 0, 0, 0);
    expect(west.az).toBeCloseTo(270, 9);
    const south = altAz(0, -10 * D2R, 0, 40); // upper transit south of the zenith
    expect(south.az).toBeCloseTo(180, 9);
    expect(south.alt).toBeCloseTo(40, 9);
    const pole = altAz(1.234, 90 * D2R, 77, 52); // the celestial pole sits at alt = φ, due north
    expect(pole.alt).toBeCloseTo(52, 9);
    expect(pole.az === 0 || Math.abs(pole.az - 360) < 1e-9 || pole.az < 1e-6).toBe(true);
  });
});

describe("skySnapshot", () => {
  const snap = skySnapshot(BIRTH, lat, lon, DEFAULT_PRESET);
  const t = astroTime(BIRTH);
  const obs = new A.Observer(lat, lon, 0);
  const ref = (body: A.Body) => {
    const eq = A.Equator(body, t, obs, true, true);
    return A.Horizon(t, obs, eq.ra, eq.dec);
  };

  it("agrees with astronomy-engine's own topocentric Horizon within 0.05°", () => {
    const pairs: Array<[{ alt: number; az: number }, A.Body]> = [
      [snap.sun, A.Body.Sun],
      [snap.moon, A.Body.Moon],
      [snap.planets.MA, A.Body.Mars],
      [snap.planets.ME, A.Body.Mercury],
      [snap.planets.JU, A.Body.Jupiter],
      [snap.planets.VE, A.Body.Venus],
      [snap.planets.SA, A.Body.Saturn],
    ];
    for (const [mine, body] of pairs) {
      const h = ref(body);
      expect(Math.abs(mine.alt - h.altitude), body).toBeLessThan(0.05);
      expect(Math.abs(((mine.az - h.azimuth + 540) % 360) - 180), body).toBeLessThan(0.05);
    }
  });

  it("the reference morning: Sun up in the east ~13° (56 min after sunrise), Moon a thin waxing crescent", () => {
    expect(snap.sun.alt).toBeGreaterThan(10);
    expect(snap.sun.alt).toBeLessThan(16);
    expect(snap.sun.az).toBeGreaterThan(80);
    expect(snap.sun.az).toBeLessThan(100);
    expect(snap.moon.waxing).toBe(true);
    expect(snap.moon.illumination).toBeCloseTo(A.Illumination(A.Body.Moon, t).phase_fraction, 2);
  });

  it("the Lagna matches the cast to an arcsecond", () => {
    const p = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
    expect(snap.lagnaSid).toBeCloseToArcsec(p.lagna.lonSidereal, 1);
    expect(snap.lagnaSign).toBe(p.lagna.sign);
    expect(skySnapshot(BIRTH, lat, lon, "drik-mean").lagnaSid).toBeLessThan(snap.lagnaSid);
  });

  it("is fast enough to scrub at 30 fps: median < 1 ms over 300 frames", () => {
    for (let i = 0; i < 50; i++) skySnapshot(BIRTH + i * 60_000, lat, lon, DEFAULT_PRESET); // warm up
    const times: number[] = [];
    for (let i = 0; i < 300; i++) {
      const t0 = performance.now();
      skySnapshot(BIRTH + i * 120_000, lat, lon, DEFAULT_PRESET);
      times.push(performance.now() - t0);
    }
    times.sort((a, b) => a - b);
    console.info(`skySnapshot median ${(times[150] ?? 0).toFixed(3)} ms`);
    expect(times[150]).toBeLessThan(1 * SLACK);
  });
});
