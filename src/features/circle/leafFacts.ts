// What a person's card shows: the Moon's sign and nakṣatra at birth. The Moon comes from
// the same longitude function the Patri uses (EclipticGeoMoon − ayanāṃśa), so a leaf never disagrees
// with its chart, without casting twelve charts to draw a bundle.
import { NAKSHATRA_DEV, NAKSHATRA_NAMES, SIGN_DEV, SIGN_NAMES } from "../../data/tables/names";
import { signOf } from "../../engine/nakshatra";
import { angasAt } from "../../engine/panchang";
import type { AyanamsaPreset, Profile, SignIdx } from "../../engine/types";

export interface LeafMoon {
  nak: number;
  pada: 1 | 2 | 3 | 4;
  sign: SignIdx;
  nakName: string;
  nakDev: string;
  signName: string;
  signDev: string;
}

const memo = new Map<string, LeafMoon | null>();

export function leafMoon(p: Profile, ayanamsa: AyanamsaPreset): LeafMoon | null {
  const key = `${p.id}|${p.birth.utcMs}|${ayanamsa}`;
  const hit = memo.get(key);
  if (hit !== undefined) return hit;
  let out: LeafMoon | null = null;
  try {
    const a = angasAt(p.birth.utcMs, ayanamsa);
    const sign = signOf(a.moonSid);
    out = {
      nak: a.nakshatra.index,
      pada: a.nakshatra.pada,
      sign,
      nakName: NAKSHATRA_NAMES[a.nakshatra.index] ?? "",
      nakDev: NAKSHATRA_DEV[a.nakshatra.index] ?? "",
      signName: SIGN_NAMES[sign],
      signDev: SIGN_DEV[sign],
    };
  } catch {
    out = null;
  }
  if (memo.size > 64) memo.clear();
  memo.set(key, out);
  return out;
}
