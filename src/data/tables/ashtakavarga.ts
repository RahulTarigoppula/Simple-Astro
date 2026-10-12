// Aṣṭakavarga benefic places (bindu tables), BPHS ch. 66 — re-typed as facts. For each graha whose
// Bhinnāṣṭakavarga is cast (the key), each of the eight contributors (seven grahas + Lagna) gives one
// bindu to the signs counted 1..12 (inclusive) from its own position. Row totals are the classical
// fixed sums: Sun 48, Moon 49, Mars 39, Mercury 54, Jupiter 56, Venus 52, Saturn 39 (Σ 337).
import type { GrahaId } from "../../engine/types";

export type AvGraha = Exclude<GrahaId, "RA" | "KE">;
export type AvContributor = AvGraha | "LA";

export const AV_GRAHAS: readonly AvGraha[] = ["SU", "MO", "MA", "ME", "JU", "VE", "SA"];
export const AV_CONTRIBUTORS: readonly AvContributor[] = ["SU", "MO", "MA", "ME", "JU", "VE", "SA", "LA"];

export const BINDU_PLACES: Record<AvGraha, Record<AvContributor, readonly number[]>> = {
  SU: {
    SU: [1, 2, 4, 7, 8, 9, 10, 11],
    MO: [3, 6, 10, 11],
    MA: [1, 2, 4, 7, 8, 9, 10, 11],
    ME: [3, 5, 6, 9, 10, 11, 12],
    JU: [5, 6, 9, 11],
    VE: [6, 7, 12],
    SA: [1, 2, 4, 7, 8, 9, 10, 11],
    LA: [3, 4, 6, 10, 11, 12],
  },
  MO: {
    SU: [3, 6, 7, 8, 10, 11],
    MO: [1, 3, 6, 7, 10, 11],
    MA: [2, 3, 5, 6, 9, 10, 11],
    ME: [1, 3, 4, 5, 7, 8, 10, 11],
    JU: [1, 4, 7, 8, 10, 11, 12],
    VE: [3, 4, 5, 7, 9, 10, 11],
    SA: [3, 5, 6, 11],
    LA: [3, 6, 10, 11],
  },
  MA: {
    SU: [3, 5, 6, 10, 11],
    MO: [3, 6, 11],
    MA: [1, 2, 4, 7, 8, 10, 11],
    ME: [3, 5, 6, 11],
    JU: [6, 10, 11, 12],
    VE: [6, 8, 11, 12],
    SA: [1, 4, 7, 8, 9, 10, 11],
    LA: [1, 3, 6, 10, 11],
  },
  ME: {
    SU: [5, 6, 9, 11, 12],
    MO: [2, 4, 6, 8, 10, 11],
    MA: [1, 2, 4, 7, 8, 9, 10, 11],
    ME: [1, 3, 5, 6, 9, 10, 11, 12],
    JU: [6, 8, 11, 12],
    VE: [1, 2, 3, 4, 5, 8, 9, 11],
    SA: [1, 2, 4, 7, 8, 9, 10, 11],
    LA: [1, 2, 4, 6, 8, 10, 11],
  },
  JU: {
    SU: [1, 2, 3, 4, 7, 8, 9, 10, 11],
    MO: [2, 5, 7, 9, 11],
    MA: [1, 2, 4, 7, 8, 10, 11],
    ME: [1, 2, 4, 5, 6, 9, 10, 11],
    JU: [1, 2, 3, 4, 7, 8, 10, 11],
    VE: [2, 5, 6, 9, 10, 11],
    SA: [3, 5, 6, 12],
    LA: [1, 2, 4, 5, 6, 7, 9, 10, 11],
  },
  VE: {
    SU: [8, 11, 12],
    MO: [1, 2, 3, 4, 5, 8, 9, 11, 12],
    MA: [3, 5, 6, 9, 11, 12],
    ME: [3, 5, 6, 9, 11],
    JU: [5, 8, 9, 10, 11],
    VE: [1, 2, 3, 4, 5, 8, 9, 10, 11],
    SA: [3, 4, 5, 8, 9, 10, 11],
    LA: [1, 2, 3, 4, 5, 8, 9, 11],
  },
  SA: {
    SU: [1, 2, 4, 7, 8, 10, 11],
    MO: [3, 6, 11],
    MA: [3, 5, 6, 10, 11, 12],
    ME: [6, 8, 9, 10, 11, 12],
    JU: [5, 6, 11, 12],
    VE: [6, 11, 12],
    SA: [3, 5, 6, 11],
    LA: [1, 3, 4, 6, 10, 11],
  },
};

/** The classical fixed totals of each Bhinnāṣṭakavarga (they hold for every chart). */
export const BAV_TOTALS: Record<AvGraha, number> = { SU: 48, MO: 49, MA: 39, ME: 54, JU: 56, VE: 52, SA: 39 };
export const SAV_TOTAL = 337;
