// The naked-eye star field (§3.8, §6.14): decode `src/data/bsc5.bin` (Yale Bright Star Catalogue,
// public domain; format documented in scripts/build-stars.mjs) and project it onto the local
// horizon. Positions are J2000; `frame` lets the caller rotate them to the true equator and equinox
// of date (precession + nutation, from astronomy-engine) so they share one frame with GAST.
//
// Hot path: `projectStars` / `horizonVectors` are one 3×3 matrix per star (plus asin/atan2 for
// alt/az) over pre-computed unit vectors, ~9 100 stars in well under a millisecond.

/** Row-major 3×3 rotation matrix. */
export type Mat3 = readonly [number, number, number, number, number, number, number, number, number];

export const IDENTITY3: Mat3 = [1, 0, 0, 0, 1, 0, 0, 0, 1];

export interface StarCatalog {
  count: number;
  /** J2000 right ascension, radians [0, 2π). */
  ra: Float32Array;
  /** J2000 declination, radians [−π/2, π/2]. */
  dec: Float32Array;
  /** Visual magnitude; the catalogue is sorted brightest first. */
  mag: Float32Array;
  /** Unit vectors in the J2000 equatorial frame (x → equinox, z → north pole), interleaved xyz. */
  xyz: Float32Array;
}

const TWO_PI = Math.PI * 2;
const R2D = 180 / Math.PI;
const D2R = Math.PI / 180;

/** Decode the packed catalogue. Throws on a wrong magic or a truncated file. */
export function decodeStars(input: ArrayBuffer | Uint8Array): StarCatalog {
  const bytes = input instanceof Uint8Array ? input : new Uint8Array(input);
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (bytes.byteLength < 12) throw new RangeError("bsc5.bin: truncated header");
  const magic = String.fromCharCode(dv.getUint8(0), dv.getUint8(1), dv.getUint8(2), dv.getUint8(3));
  if (magic !== "BSC5") throw new TypeError(`bsc5.bin: bad magic ${JSON.stringify(magic)}`);
  const version = dv.getUint16(4, true);
  if (version !== 1) throw new TypeError(`bsc5.bin: unsupported version ${version}`);
  const n = dv.getUint32(8, true);
  if (bytes.byteLength < 12 + n * 5) throw new RangeError("bsc5.bin: truncated body");
  const raOff = 12;
  const decOff = raOff + 2 * n;
  const magOff = decOff + 2 * n;
  const ra = new Float32Array(n);
  const dec = new Float32Array(n);
  const mag = new Float32Array(n);
  const xyz = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = (dv.getUint16(raOff + 2 * i, true) / 65536) * TWO_PI;
    const d = (dv.getUint16(decOff + 2 * i, true) / 65535) * Math.PI - Math.PI / 2;
    ra[i] = a;
    dec[i] = d;
    mag[i] = dv.getUint8(magOff + i) / 20 - 2;
    const cd = Math.cos(d);
    xyz[3 * i] = cd * Math.cos(a);
    xyz[3 * i + 1] = cd * Math.sin(a);
    xyz[3 * i + 2] = Math.sin(d);
  }
  return { count: n, ra, dec, mag, xyz };
}

/**
 * Equatorial (of date) → horizon rotation for local sidereal time `lstDeg` and latitude `latDeg`.
 * Rows give the East, Up and North components of a unit vector (azimuth from North through East).
 */
export function equatorialToHorizon(lstDeg: number, latDeg: number): Mat3 {
  const L = lstDeg * D2R;
  const p = latDeg * D2R;
  const sL = Math.sin(L);
  const cL = Math.cos(L);
  const sp = Math.sin(p);
  const cp = Math.cos(p);
  return [-sL, cL, 0, cp * cL, cp * sL, sp, -sp * cL, -sp * sL, cp];
}

/** a · b for row-major 3×3 matrices. */
export function mul3(a: Mat3, b: Mat3): Mat3 {
  const r = (i: number, j: number): number =>
    (a[3 * i] as number) * (b[j] as number) +
    (a[3 * i + 1] as number) * (b[3 + j] as number) +
    (a[3 * i + 2] as number) * (b[6 + j] as number);
  return [r(0, 0), r(0, 1), r(0, 2), r(1, 0), r(1, 1), r(1, 2), r(2, 0), r(2, 1), r(2, 2)];
}

/**
 * IAU 1976 (Lieske) precession matrix J2000 → mean equator and equinox of `jdTt`. A dependency-free
 * fallback; the screens use astronomy-engine's precession + nutation instead. Error < 1″/century.
 */
export function precessionMatrix(jdTt: number): Mat3 {
  const T = (jdTt - 2451545.0) / 36525;
  const as = D2R / 3600;
  const zeta = (2306.2181 * T + 0.30188 * T * T + 0.017998 * T ** 3) * as;
  const z = (2306.2181 * T + 1.09468 * T * T + 0.018203 * T ** 3) * as;
  const th = (2004.3109 * T - 0.42665 * T * T - 0.041833 * T ** 3) * as;
  const cz = Math.cos(zeta);
  const sz = Math.sin(zeta);
  const cZ = Math.cos(z);
  const sZ = Math.sin(z);
  const ct = Math.cos(th);
  const st = Math.sin(th);
  return [
    cz * ct * cZ - sz * sZ,
    -sz * ct * cZ - cz * sZ,
    -st * cZ,
    cz * ct * sZ + sz * cZ,
    -sz * ct * sZ + cz * cZ,
    -st * sZ,
    cz * st,
    -sz * st,
    ct,
  ];
}

/** Apply `m` (row-major) to every star's J2000 unit vector, interleaved into `out`. */
export function transformStars(stars: StarCatalog, m: Mat3, out: Float32Array = new Float32Array(stars.count * 3)): Float32Array {
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = m;
  const v = stars.xyz;
  const n = stars.count * 3;
  for (let i = 0; i < n; i += 3) {
    const x = v[i] as number;
    const y = v[i + 1] as number;
    const z = v[i + 2] as number;
    out[i] = m0 * x + m1 * y + m2 * z;
    out[i + 1] = m3 * x + m4 * y + m5 * z;
    out[i + 2] = m6 * x + m7 * y + m8 * z;
  }
  return out;
}

/**
 * East/Up/North components of every star, interleaved, written into `out` (length ≥ 3·count).
 * `frame` rotates J2000 vectors to the equator of date first (identity = no precession).
 */
export function horizonVectors(
  stars: StarCatalog,
  lstDeg: number,
  latDeg: number,
  frame: Mat3 = IDENTITY3,
  out: Float32Array = new Float32Array(stars.count * 3),
): Float32Array {
  return transformStars(stars, mul3(equatorialToHorizon(lstDeg, latDeg), frame), out);
}

export interface ProjectedStars {
  /** Altitude, degrees (geometric, no refraction). */
  alt: Float32Array;
  /** Azimuth, degrees [0, 360), from North through East. */
  az: Float32Array;
}

/** Altitude and azimuth of every star for a local sidereal time and latitude (degrees). */
export function projectStars(
  stars: StarCatalog,
  lstDeg: number,
  latDeg: number,
  frame: Mat3 = IDENTITY3,
  out: ProjectedStars = { alt: new Float32Array(stars.count), az: new Float32Array(stars.count) },
): ProjectedStars {
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = mul3(equatorialToHorizon(lstDeg, latDeg), frame);
  const v = stars.xyz;
  const { alt, az } = out;
  for (let i = 0, j = 0; i < stars.count; i++, j += 3) {
    const x = v[j] as number;
    const y = v[j + 1] as number;
    const z = v[j + 2] as number;
    const e = m0 * x + m1 * y + m2 * z;
    const u = m3 * x + m4 * y + m5 * z;
    const nn = m6 * x + m7 * y + m8 * z;
    alt[i] = Math.asin(u > 1 ? 1 : u < -1 ? -1 : u) * R2D;
    const a = Math.atan2(e, nn) * R2D;
    az[i] = a < 0 ? a + 360 : a;
  }
  return out;
}

/** One body: altitude/azimuth (degrees) from RA/Dec (radians, of date), the same rotation as above. */
export function altAzOfRadec(raRad: number, decRad: number, lstDeg: number, latDeg: number): { alt: number; az: number } {
  const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = equatorialToHorizon(lstDeg, latDeg);
  const cd = Math.cos(decRad);
  const x = cd * Math.cos(raRad);
  const y = cd * Math.sin(raRad);
  const z = Math.sin(decRad);
  const e = m0 * x + m1 * y + m2 * z;
  const u = m3 * x + m4 * y + m5 * z;
  const nn = m6 * x + m7 * y + m8 * z;
  const a = Math.atan2(e, nn) * R2D;
  return { alt: Math.asin(Math.max(-1, Math.min(1, u))) * R2D, az: a < 0 ? a + 360 : a };
}
