// The boundary badge (§6.6): a vermilion asterisk when a longitude sits within 2′ of a sign,
// nakṣatra or pada edge, plus the cross-preset footnote that re-runs the classification under the
// other ayanāṃśa presets and says whether any of them would read differently.
import { AYANAMSA_PRESETS, ayanamsa } from "./ayanamsa";
import { formatArcmin, norm360 } from "./math";
import { nakshatraName, nakshatraOf, PADA_SPAN, padaIndexOf, signName, signOf } from "./nakshatra";
import type { AyanamsaPreset, BoundaryFlag, Deg, Jd, SignIdx } from "./types";

/** The vermilion asterisk threshold. */
export const BOUNDARY_ARCMIN = 2;
/**
 * The cross-preset footnote threshold. Presets differ by ≤ ~43″ (AY-5) plus the ±1′ engine claim
 * gives 101″ (TESTING B-2); the footnote must also exist for every asterisked body (2′ = 120″, and
 * TESTING B-1's synthetic body sits at 102″), so the window is the larger of the two.
 */
export const CROSS_PRESET_ARCSEC = 120;

type Kind = BoundaryFlag["kind"];

function labelAt(lonSid: Deg, kind: Kind): string {
  const l = norm360(lonSid);
  if (kind === "sign") return signName(signOf(l));
  const n = nakshatraOf(l);
  return kind === "nakshatra" ? n.name : `${n.name} ${n.pada}`;
}

export interface EdgeInfo {
  kind: Kind;
  /** Distance to the nearest edge, arcminutes. */
  arcminutesTo: number;
  /** The edge longitude itself. */
  edge: Deg;
  /** Classification on this side and the other side of the edge. */
  here: string;
  otherSide: string;
}

/** The nearest sign/nakṣatra/pada edge (every edge is a pada edge; the coarsest kind wins). */
export function nearestEdge(lonSid: Deg): EdgeInfo {
  const l = norm360(lonSid);
  const p = padaIndexOf(l);
  const lo = p * PADA_SPAN;
  const hi = (p + 1) * PADA_SPAN;
  const below = l - lo < hi - l;
  const edgeIdx = below ? p : p + 1; // edge number counted in padas, 0..108
  const edge = norm360(edgeIdx * PADA_SPAN);
  const arcminutesTo = Math.max(0, (below ? l - lo : hi - l) * 60);
  const kind: Kind = edgeIdx % 9 === 0 ? "sign" : edgeIdx % 4 === 0 ? "nakshatra" : "pada";
  const across = below ? edge - PADA_SPAN / 2 : edge + PADA_SPAN / 2;
  return { kind, arcminutesTo, edge, here: labelAt(l, kind), otherSide: labelAt(across, kind) };
}

/** Set when within 2′ of a sign / nakṣatra / pada edge; null otherwise. */
export function boundaryFlag(lonSid: Deg): BoundaryFlag | null {
  const e = nearestEdge(lonSid);
  if (e.arcminutesTo > BOUNDARY_ARCMIN) return null;
  return { kind: e.kind, arcminutesTo: e.arcminutesTo, otherSide: e.otherSide };
}

export interface Classification {
  preset: AyanamsaPreset;
  lonSidereal: Deg;
  sign: SignIdx;
  nakshatra: number;
  pada: 1 | 2 | 3 | 4;
  signName: string;
  nakshatraName: string;
}

/** Classify a tropical longitude under a given ayanāṃśa preset. */
export function classifyUnder(lonTropical: Deg, jdTt: Jd, preset: AyanamsaPreset): Classification {
  const lonSidereal = norm360(lonTropical - ayanamsa(jdTt, preset));
  const n = nakshatraOf(lonSidereal);
  const sign = signOf(lonSidereal);
  return {
    preset,
    lonSidereal,
    sign,
    nakshatra: n.index,
    pada: n.pada,
    signName: signName(sign),
    nakshatraName: nakshatraName(n.index),
  };
}

export const PRESET_SHORT: Record<AyanamsaPreset, string> = {
  "se-true": "SE-true",
  "se-mean": "SE-mean",
  "drik-mean": "Drik",
};

export interface BoundaryNote {
  /** Distance to the nearest edge, arcseconds. */
  distanceArcsec: number;
  kind: Kind;
  here: string;
  otherSide: string;
  /** Presets whose classification of `kind` differs from the active one, with what they read. */
  flips: Array<{ preset: AyanamsaPreset; reads: string }>;
  /** "within 1′42″ of Anurādhā/Jyeṣṭhā; the Drik preset would read Jyeṣṭhā" */
  text: string;
}

/**
 * The footnote sheet: distance to the nearest edge, both sides named in zodiac order, and, only
 * when another preset genuinely flips the classification, which preset and what it would read.
 * Returns null when the body is farther than `CROSS_PRESET_ARCSEC` from any edge.
 */
export function boundaryNote(lonTropical: Deg, jdTt: Jd, active: AyanamsaPreset): BoundaryNote | null {
  const here = classifyUnder(lonTropical, jdTt, active);
  const e = nearestEdge(here.lonSidereal);
  const distanceArcsec = e.arcminutesTo * 60;
  if (distanceArcsec > CROSS_PRESET_ARCSEC) return null;
  const read = (c: Classification): string =>
    e.kind === "sign" ? c.signName : e.kind === "nakshatra" ? c.nakshatraName : `${c.nakshatraName} ${c.pada}`;
  const mine = read(here);
  const flips: BoundaryNote["flips"] = [];
  for (const p of AYANAMSA_PRESETS) {
    if (p === active) continue;
    const r = read(classifyUnder(lonTropical, jdTt, p));
    if (r !== mine) flips.push({ preset: p, reads: r });
  }
  const lowSide = here.lonSidereal < e.edge || (e.edge === 0 && here.lonSidereal > 180);
  const pair = lowSide ? `${e.here}/${e.otherSide}` : `${e.otherSide}/${e.here}`;
  let text = `within ${formatArcmin(e.arcminutesTo)} of ${pair}`;
  if (flips.length > 0) {
    text += `; ${flips.map((f) => `the ${PRESET_SHORT[f.preset]} preset would read ${f.reads}`).join("; ")}`;
  }
  return { distanceArcsec, kind: e.kind, here: e.here, otherSide: e.otherSide, flips, text };
}
