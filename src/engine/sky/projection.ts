// The painted sky's projection: stereographic, centred on the zenith, viewed from below, the way
// you see the sky lying on a rooftop with your feet to the east. East is at the bottom (towards
// the parapet strip and the Lagna), West at the top, North on the left, South on the right.
//
// d3-geo draws the line work (clipped great circles: ecliptic, ticks, altitude rings) from
// [azimuth − 90°, altitude] coordinates; `eunToXY` is the same mapping in closed form for the
// 9 000 stars of a scrub frame (no trig: ρ = R·tan(z/2) = R·√(e²+n²)/(1+u)).
import { type GeoProjection, geoStereographic } from "d3-geo";

/** Horizon radius in scene units; the SVG viewBox is ±SKY_VIEW. */
export const SKY_R = 180;
export const SKY_VIEW = 204;

/** d3 projection taking [az − 90, alt] (degrees) → scene x/y with the horizon at radius `r`. */
export function skyProjection(r: number = SKY_R): GeoProjection {
  return geoStereographic().rotate([0, -90]).scale(r).translate([0, 0]).clipAngle(90).precision(0.3);
}

/** Scene x of an East/Up/North vector (valid for u > −1). */
export const eunX = (_e: number, u: number, n: number, r: number = SKY_R): number => (-r * n) / (1 + u);
/** Scene y of an East/Up/North vector. */
export const eunY = (e: number, u: number, _n: number, r: number = SKY_R): number => (r * e) / (1 + u);

/** Radius at altitude `altDeg` (degrees). */
export const rhoOfAlt = (altDeg: number, r: number = SKY_R): number => r * Math.tan(((90 - altDeg) * Math.PI) / 360);

/** Scene x/y of an altitude/azimuth (degrees). */
export function altAzXY(altDeg: number, azDeg: number, r: number = SKY_R): [number, number] {
  const rho = rhoOfAlt(altDeg, r);
  const a = (azDeg * Math.PI) / 180;
  return [-rho * Math.cos(a), rho * Math.sin(a)];
}
