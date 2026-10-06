// Divisional charts (§6.7): one dispatcher, nine Parāśarī rules (BPHS ch. 6–7).
import { EngineError } from "./errors";
import { norm360 } from "./math";
import { padaIndexOf } from "./nakshatra";
import { type Deg, GRAHA_IDS, type GrahaId, type SignIdx, type VargaChart, type VargaNumber } from "./types";

export const VARGAS: readonly VargaNumber[] = [1, 2, 3, 7, 9, 10, 12, 30, 60];

export const VARGA_NAMES: Record<VargaNumber, string> = {
  1: "Rāśi",
  2: "Horā",
  3: "Drekkāṇa",
  7: "Saptāṃśa",
  9: "Navāṃśa",
  10: "Daśāṃśa",
  12: "Dvādaśāṃśa",
  30: "Triṃśāṃśa",
  60: "Ṣaṣṭyāṃśa",
};

/** D30: unequal bands. Odd signs 5/5/8/7/5 → Mars, Saturn, Jupiter, Mercury, Venus (Meṣa, Kumbha,
 *  Dhanu, Mithuna, Tulā); even signs take those lords reversed with the bands reversed (5/7/8/5/5:
 *  Venus, Mercury, Jupiter, Saturn, Mars → Vṛṣabha, Kanyā, Mīna, Makara, Vṛścika). */
const D30_ODD_BANDS = [5, 10, 18, 25, 30] as const;
const D30_ODD_SIGNS = [0, 10, 8, 2, 6] as const;
const D30_EVEN_BANDS = [5, 12, 20, 25, 30] as const;
const D30_EVEN_SIGNS = [1, 5, 11, 9, 7] as const;

function trimsamsa(d: number, odd: boolean): SignIdx {
  const bands = odd ? D30_ODD_BANDS : D30_EVEN_BANDS;
  const signs = odd ? D30_ODD_SIGNS : D30_EVEN_SIGNS;
  for (let i = 0; i < bands.length; i++) if (d < (bands[i] as number)) return signs[i] as SignIdx;
  return signs[signs.length - 1] as SignIdx;
}

/** Sign of a sidereal longitude in divisional chart D`varga`. */
export function vargaSign(lonSid: Deg, varga: number): SignIdx {
  const l = norm360(lonSid);
  const s = Math.min(11, Math.floor(l / 30));
  const d = l - s * 30; // [0, 30)
  const odd = s % 2 === 0; // 0-based even index == odd sign NUMBER (Meṣa is the 1st sign)
  // floor(d · n / 30), exact at the part edges for the same reason as nakshatra.ts.
  const part = (n: number): number => Math.min(n - 1, Math.floor((d * n) / 30));
  const wrap = (x: number): SignIdx => (x % 12) as SignIdx;

  switch (varga) {
    case 1:
      return s as SignIdx;
    case 2: // Horā: odd signs Sun (Siṃha) then Moon (Karka); even signs the reverse
      return (odd ? (part(2) === 0 ? 4 : 3) : part(2) === 0 ? 3 : 4) as SignIdx;
    case 3: // Drekkāṇa: the sign, its 5th, its 9th
      return wrap(s + 4 * part(3));
    case 7: // Saptāṃśa: odd from the sign, even from the 7th
      return wrap(s + (odd ? 0 : 6) + part(7));
    case 9: // Navāṃśa: closed form, the pada index mod 12
      return (padaIndexOf(l) % 12) as SignIdx;
    case 10: // Daśāṃśa: odd from the sign, even from the 9th
      return wrap(s + (odd ? 0 : 8) + part(10));
    case 12: // Dvādaśāṃśa: from the sign
      return wrap(s + part(12));
    case 30:
      return trimsamsa(d, odd);
    case 60: // Ṣaṣṭyāṃśa: from the sign
      return wrap(s + part(60));
    default:
      throw new EngineError("VARGA_UNSUPPORTED", `D${varga}`);
  }
}

/** The classical Navāṃśa derivation: movable signs count from themselves, fixed from the 9th,
 *  dual from the 5th. Kept separate so a test can prove it equals the closed form. */
export function navamsaClassical(lonSid: Deg): SignIdx {
  const l = norm360(lonSid);
  const s = Math.min(11, Math.floor(l / 30));
  const d = l - s * 30;
  const start = s % 3 === 0 ? s : s % 3 === 1 ? s + 8 : s + 4; // movable / fixed / dual
  return ((start + Math.min(8, Math.floor((d * 9) / 30))) % 12) as SignIdx;
}

/** Anything with a sidereal Lagna and sidereal graha longitudes (a Patri or PatriCore). */
export interface VargaInput {
  lagna: { lonSidereal: Deg };
  grahas: Record<GrahaId, { lonSidereal: Deg }>;
}

export function vargaChart(core: VargaInput, varga: VargaNumber): VargaChart {
  const placements = {} as Record<GrahaId, SignIdx>;
  for (const id of GRAHA_IDS) placements[id] = vargaSign(core.grahas[id].lonSidereal, varga);
  return { varga, ascendantSign: vargaSign(core.lagna.lonSidereal, varga), placements };
}
