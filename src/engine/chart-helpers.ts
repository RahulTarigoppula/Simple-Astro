// Small whole-sign helpers shared by the yoga rules and the Manglik helper.
import { GRAHA_NAMES, ORDINAL, SIGN_NAMES } from "../data/tables/names";
import { ASPECT_HOUSES, type SevenId } from "../data/tables/rulership";
import type { Graha, GrahaId, SignIdx } from "./types";

export const KENDRA: readonly number[] = [1, 4, 7, 10];
export const TRIKONA: readonly number[] = [1, 5, 9];
export const DUSTHANA: readonly number[] = [6, 8, 12];

/** Sign lords, 0 = Meṣa (re-stated with the narrower SevenId type). */
const LORDS: readonly SevenId[] = ["MA", "VE", "ME", "MO", "SU", "ME", "VE", "MA", "JU", "SA", "SA", "JU"];

export function signLord(s: SignIdx): SevenId {
  return LORDS[s] ?? "SU";
}

export function toSign(n: number): SignIdx {
  return (((n % 12) + 12) % 12) as SignIdx;
}

/** Whole-sign house of `to` counted inclusively from `from`: same sign = 1. */
export function houseFrom(from: SignIdx, to: SignIdx): number {
  return ((to - from + 12) % 12) + 1;
}

/** Sign of the n-th house counted from `from`. */
export function signOfHouse(from: SignIdx, house: number): SignIdx {
  return toSign(from + house - 1);
}

/** Lord of the n-th house from the Lagna. */
export function lordOfHouse(lagna: SignIdx, house: number): SevenId {
  return signLord(signOfHouse(lagna, house));
}

/** Does graha `g` cast its (whole-sign) aspect on `target`? BPHS ch. 26. */
export function aspects(g: Graha, target: SignIdx): boolean {
  return ASPECT_HOUSES[g.id].includes(houseFrom(g.sign, target));
}

export const ord = ORDINAL;
export const signName = (s: SignIdx): string => SIGN_NAMES[s];
export const gName = (id: GrahaId): string => GRAHA_NAMES[id];

/** "Budha", "Budha and Śukra", "Budha, Guru and Śukra". */
export function joinNames(ids: readonly GrahaId[]): string {
  const names = ids.map(gName);
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1] ?? ""}`;
}
