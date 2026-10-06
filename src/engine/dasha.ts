// Viṃśottarī daśā (§6.8; BPHS ch. 46). The running mahādaśā started before birth, so the whole
// tree is anchored on its nominal start. Every child list is built cumulatively and its last end
// is pinned to the parent's end, so sums are exact and the tree is gap-free by construction.
import { MS_PER_DAY } from "./math";
import { nakshatraFraction, nakshatraIndexOf, nakshatraLordOf } from "./nakshatra";
import type { DashaNode, Deg, GrahaId } from "./types";

export const DASHA_CYCLE: readonly GrahaId[] = ["KE", "VE", "SU", "MO", "MA", "RA", "JU", "SA", "ME"];
export const DASHA_YEARS: Record<GrahaId, number> = { KE: 7, VE: 20, SU: 6, MO: 10, MA: 7, RA: 18, JU: 16, SA: 19, ME: 17 };
export const DASHA_TOTAL_YEARS = 120;

const cycleFrom = (lord: GrahaId): GrahaId[] => {
  const i = DASHA_CYCLE.indexOf(lord);
  return Array.from({ length: 9 }, (_, k) => DASHA_CYCLE[(i + k) % 9] as GrahaId);
};

/** Split [start, end) among the nine lords from `first`, in proportion to their years. */
function subdivide(first: GrahaId, startMs: number, endMs: number, level: 2 | 3): DashaNode[] {
  const span = endMs - startMs;
  const out: DashaNode[] = [];
  let acc = 0;
  let c = startMs;
  const lords = cycleFrom(first);
  lords.forEach((lord, i) => {
    acc += DASHA_YEARS[lord];
    const end = i === 8 ? endMs : startMs + (span * acc) / DASHA_TOTAL_YEARS;
    out.push({ lord, level, startMs: c, endMs: end });
    c = end;
  });
  return out;
}

export interface DashaBalance {
  lord: GrahaId;
  /** Fraction of the Moon's nakṣatra already traversed at birth. */
  fraction: number;
  /** Years of the first mahādaśā remaining at birth. */
  balanceYears: number;
}

export function dashaBalance(moonLonSid: Deg): DashaBalance {
  const lord = nakshatraLordOf(nakshatraIndexOf(moonLonSid));
  const fraction = nakshatraFraction(moonLonSid);
  return { lord, fraction, balanceYears: DASHA_YEARS[lord] * (1 - fraction) };
}

/** Nine mahādaśās from the nominal start of the one running at birth, antardaśās filled. */
export function vimshottari(moonLonSid: Deg, birthMs: number, yearDays: 365.25 | 360): DashaNode[] {
  const { lord, fraction } = dashaBalance(moonLonSid);
  const year = yearDays * MS_PER_DAY;
  const lords = cycleFrom(lord);
  const anchor = birthMs - DASHA_YEARS[lord] * fraction * year;
  const out: DashaNode[] = [];
  let acc = 0;
  let c = anchor;
  for (const md of lords) {
    acc += DASHA_YEARS[md];
    const end = anchor + acc * year;
    out.push({ lord: md, level: 1, startMs: c, endMs: end, children: subdivide(md, c, end, 2) });
    c = end;
  }
  return out;
}

/** Pratyantardaśās of an antardaśā — generated on demand, never eagerly. `_md` names the parent
 *  mahādaśā for the call site's readability; the split depends only on the antar's own interval
 *  (len = MD·AD·PD / 120² years, which is AD length × PD / 120). */
export function pratyantars(_md: DashaNode, ad: DashaNode, _yearDays: 365.25 | 360): DashaNode[] {
  return subdivide(ad.lord, ad.startMs, ad.endMs, 3);
}

/** The node whose half-open [start, end) contains `atMs`, or null. */
function containing(nodes: readonly DashaNode[] | undefined, atMs: number): DashaNode | null {
  if (!nodes) return null;
  for (const n of nodes) if (atMs >= n.startMs && atMs < n.endMs) return n;
  return null;
}

export interface CurrentDasha {
  md: DashaNode;
  ad: DashaNode;
  pd: DashaNode;
}

/** The running MD/AD/PD at an instant (half-open: a boundary instant belongs to the later one). */
export function currentDasha(tree: readonly DashaNode[], atMs: number): CurrentDasha | null {
  const md = containing(tree, atMs);
  if (!md) return null;
  const ad = containing(md.children, atMs);
  if (!ad) return null;
  const pd = containing(pratyantars(md, ad, 365.25), atMs);
  if (!pd) return null;
  return { md, ad, pd };
}

/** Years in an interval under a daśā-year convention. */
export const intervalYears = (n: DashaNode, yearDays: 365.25 | 360): number =>
  (n.endMs - n.startMs) / (yearDays * MS_PER_DAY);
