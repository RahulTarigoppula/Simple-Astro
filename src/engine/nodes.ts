// Rāhu and Ketu (§6.4). astronomy-engine has no node longitude (SearchMoonNode returns crossing
// times), so both node types are ours. They differ by up to ~1.7°, enough to change a sign, so the
// choice is a preset printed in the colophon.
import * as A from "astronomy-engine";
import type { AstroTime } from "./ephemeris";
import { norm360, R2D, signedDelta } from "./math";
import type { Deg, Jd } from "./types";

/** Mean daily motion of the mean node, deg/day (Meeus 47.7 leading term ÷ 36525). */
export const MEAN_NODE_SPEED = -1934.1362891 / 36525; // −0.0529539…

/** Mean lunar ascending node, Meeus 47.7. */
export function meanNode(jdTt: Jd): Deg {
  const T = (jdTt - 2451545.0) / 36525;
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T ** 2 + T ** 3 / 467441 - T ** 4 / 60616000);
}

/**
 * True (osculating) ascending node, what Swiss Ephemeris calls SE_TRUE_NODE. The Moon's geocentric
 * position r and velocity v are rotated into the true ecliptic of date; h = r × v is the orbital
 * angular momentum and the ascending node lies along n = ẑ × h = (−h_y, h_x, 0).
 */
export function trueNode(t: AstroTime): Deg {
  const s = A.GeoMoonState(t); // EQJ position (AU) and velocity (AU/day), analytic
  const rot = A.Rotation_EQJ_ECT(t);
  const r = A.RotateVector(rot, new A.Vector(s.x, s.y, s.z, t));
  const v = A.RotateVector(rot, new A.Vector(s.vx, s.vy, s.vz, t));
  const hx = r.y * v.z - r.z * v.y;
  const hy = r.z * v.x - r.x * v.z;
  return norm360(Math.atan2(hx, -hy) * R2D);
}

/** True-node speed, deg/day, from a ±1 hour central difference. */
export function trueNodeSpeed(t: AstroTime): number {
  const h = 1 / 24;
  return signedDelta(trueNode(t.AddDays(-h)), trueNode(t.AddDays(h))) / (2 * h);
}

export const ketuOf = (rahu: Deg): Deg => norm360(rahu + 180);
