// Aṣṭakūṭa (Guna Milan) tables — classical facts, re-typed by hand. Never copied as code from any
// implementation. The koota scheme is that of Muhūrta Cintāmaṇi ch. 6 (vivāha-prakaraṇa); where the
// published tables vary between schools, Chowki follows ONE school, named below per table, chosen so
// that the totals agree with the PyJHora oracle data (all_nak_pad_boy_girl.csv) — see
// src/engine/ashtakoota.oracle.test.ts for the cell-by-cell evidence.
//
// Every two-sided table is read [first][second] = [vara (boy) column][kanyā (girl) column]. The
// sides are positional — `a` and `b` in milan() — never derived from a profile's gender field.
import type { SignIdx } from "../../engine/types";

// ─── Varṇa (1) ───────────────────────────────────────────────────────────────
export type Varna = "brahmana" | "kshatriya" | "vaishya" | "shudra";
export const VARNA_LABEL: Record<Varna, string> = {
  brahmana: "Brāhmaṇa",
  kshatriya: "Kṣatriya",
  vaishya: "Vaiśya",
  shudra: "Śūdra",
};
export const VARNA_RANK: Record<Varna, number> = { brahmana: 4, kshatriya: 3, vaishya: 2, shudra: 1 };

/**
 * Varṇa by Moon sign, by element. School followed: water signs Brāhmaṇa, fire Kṣatriya,
 * AIR signs Vaiśya and EARTH signs Śūdra (the saravali.de / PyJHora reading). Many Muhūrta Cintāmaṇi
 * commentaries give the reverse for the last two (earth Vaiśya, air Śūdra); the difference changes
 * the score only when one Moon is in an earth sign and the other in an air sign.
 */
export const VARNA_BY_SIGN: readonly Varna[] = [
  "kshatriya", // Meṣa (fire)
  "shudra", // Vṛṣabha (earth)
  "vaishya", // Mithuna (air)
  "brahmana", // Karka (water)
  "kshatriya", // Siṃha
  "shudra", // Kanyā
  "vaishya", // Tulā
  "brahmana", // Vṛścika
  "kshatriya", // Dhanu
  "shudra", // Makara
  "vaishya", // Kumbha
  "brahmana", // Mīna
];

// ─── Vaśya (2) ───────────────────────────────────────────────────────────────
export type VashyaClass = "chatushpada" | "manava" | "jalachara" | "vanachara" | "keeta";
export const VASHYA_LABEL: Record<VashyaClass, string> = {
  chatushpada: "Catuṣpada (quadruped)",
  manava: "Mānava (human)",
  jalachara: "Jalacara (water-dwelling)",
  vanachara: "Vanacara (wild)",
  keeta: "Kīṭa (insect)",
};

/**
 * Vaśya class of the Moon. Dhanu and Makara are split at 15°: Dhanu's first half is human, its latter
 * half quadruped; Makara's first half quadruped, its latter half water-dwelling (BPHS ch. 4).
 */
export function vashyaClass(sign: SignIdx, degInSign: number): VashyaClass {
  switch (sign) {
    case 0:
    case 1:
      return "chatushpada";
    case 2:
    case 5:
    case 6:
    case 10:
      return "manava";
    case 3:
    case 11:
      return "jalachara";
    case 4:
      return "vanachara";
    case 7:
      return "keeta";
    case 8:
      return degInSign < 15 ? "manava" : "chatushpada";
    default: // 9, Makara
      return degInSign < 15 ? "chatushpada" : "jalachara";
  }
}

/**
 * VASHYA[first][second]. School followed: the saravali.de class table (as used by PyJHora). It is
 * not symmetric — e.g. Kīṭa→Catuṣpada 2 but Catuṣpada→Kīṭa 1.
 */
export const VASHYA: Record<VashyaClass, Record<VashyaClass, number>> = {
  chatushpada: { chatushpada: 2, manava: 0.5, jalachara: 1, vanachara: 0, keeta: 1 },
  manava: { chatushpada: 0.5, manava: 2, jalachara: 0, vanachara: 0, keeta: 0 },
  jalachara: { chatushpada: 1, manava: 0, jalachara: 2, vanachara: 2, keeta: 1 },
  vanachara: { chatushpada: 0, manava: 0, jalachara: 2, vanachara: 2, keeta: 0 },
  keeta: { chatushpada: 2, manava: 0, jalachara: 2, vanachara: 0, keeta: 2 },
};

// ─── Tārā (3) ────────────────────────────────────────────────────────────────
/** The nine tārās, counted inclusively from one Moon's nakshatra to the other's, modulo 9. */
export const TARA_NAMES = [
  "Janma",
  "Sampat",
  "Vipat",
  "Kṣema",
  "Pratyari",
  "Sādhaka",
  "Vadha",
  "Mitra",
  "Parama-Mitra",
] as const;
/** Tārās 3, 5 and 7 (Vipat, Pratyari, Vadha) are the unkind ones (Muhūrta Cintāmaṇi ch. 6). */
export const TARA_UNKIND: readonly number[] = [3, 5, 7];

// ─── Yoni (4) ────────────────────────────────────────────────────────────────
export type Yoni =
  | "horse"
  | "elephant"
  | "sheep"
  | "serpent"
  | "dog"
  | "cat"
  | "rat"
  | "cow"
  | "buffalo"
  | "tiger"
  | "deer"
  | "monkey"
  | "mongoose"
  | "lion";

export const YONI_LABEL: Record<Yoni, string> = {
  horse: "Aśva (horse)",
  elephant: "Gaja (elephant)",
  sheep: "Meṣa (sheep)",
  serpent: "Sarpa (serpent)",
  dog: "Śvāna (dog)",
  cat: "Mārjāra (cat)",
  rat: "Mūṣaka (rat)",
  cow: "Go (cow)",
  buffalo: "Mahiṣa (buffalo)",
  tiger: "Vyāghra (tiger)",
  deer: "Mṛga (deer)",
  monkey: "Vānara (monkey)",
  mongoose: "Nakula (mongoose)",
  lion: "Siṃha (lion)",
};

/** Yoni animal of each nakshatra, Aśvinī = 0. */
export const YONI_BY_NAK: readonly Yoni[] = [
  "horse", // Aśvinī
  "elephant", // Bharaṇī
  "sheep", // Kṛttikā
  "serpent", // Rohiṇī
  "serpent", // Mṛgaśīrṣa
  "dog", // Ārdrā
  "cat", // Punarvasu
  "sheep", // Puṣya
  "cat", // Āśleṣā
  "rat", // Maghā
  "rat", // Pūrva Phalgunī
  "cow", // Uttara Phalgunī
  "buffalo", // Hasta
  "tiger", // Citrā
  "buffalo", // Svātī
  "tiger", // Viśākhā
  "deer", // Anurādhā
  "deer", // Jyeṣṭhā
  "dog", // Mūla
  "monkey", // Pūrva Āṣāḍhā
  "mongoose", // Uttara Āṣāḍhā
  "monkey", // Śravaṇa
  "lion", // Dhaniṣṭhā
  "horse", // Śatabhiṣā
  "lion", // Pūrva Bhādrapadā
  "cow", // Uttara Bhādrapadā
  "elephant", // Revatī
];

/** The seven sworn-enemy pairs (0 points). */
export const YONI_SWORN: ReadonlyArray<readonly [Yoni, Yoni]> = [
  ["horse", "buffalo"],
  ["elephant", "lion"],
  ["sheep", "monkey"],
  ["serpent", "mongoose"],
  ["dog", "deer"],
  ["cat", "rat"],
  ["cow", "tiger"],
];

/** Friendly pairs (3 points). School followed: the common North-Indian 14×14 yoni table. */
export const YONI_FRIENDLY: ReadonlyArray<readonly [Yoni, Yoni]> = [
  ["horse", "serpent"],
  ["horse", "monkey"],
  ["elephant", "sheep"],
  ["elephant", "serpent"],
  ["elephant", "buffalo"],
  ["elephant", "monkey"],
  ["sheep", "cow"],
  ["sheep", "buffalo"],
  ["sheep", "mongoose"],
  ["cat", "deer"],
  ["cat", "monkey"],
  ["cow", "buffalo"],
  ["cow", "deer"],
  ["monkey", "mongoose"],
];

/** Inimical pairs (1 point). Every pair not listed in any of the three lists is neutral (2). */
export const YONI_INIMICAL: ReadonlyArray<readonly [Yoni, Yoni]> = [
  ["horse", "cow"],
  ["horse", "tiger"],
  ["horse", "deer"],
  ["horse", "lion"],
  ["elephant", "tiger"],
  ["sheep", "dog"],
  ["sheep", "rat"],
  ["sheep", "tiger"],
  ["sheep", "lion"],
  ["serpent", "cat"],
  ["serpent", "rat"],
  ["serpent", "cow"],
  ["serpent", "buffalo"],
  ["dog", "rat"],
  ["dog", "tiger"],
  ["dog", "mongoose"],
  ["dog", "lion"],
  ["cat", "tiger"],
  ["cat", "lion"],
  ["rat", "mongoose"],
  ["cow", "lion"],
  ["buffalo", "tiger"],
  ["buffalo", "lion"],
  ["tiger", "deer"],
  ["tiger", "monkey"],
  ["tiger", "lion"],
  ["deer", "lion"],
];

export type YoniRelation = "same" | "friendly" | "neutral" | "inimical" | "sworn";
export const YONI_POINTS: Record<YoniRelation, number> = { same: 4, friendly: 3, neutral: 2, inimical: 1, sworn: 0 };

const hasPair = (list: ReadonlyArray<readonly [Yoni, Yoni]>, a: Yoni, b: Yoni): boolean =>
  list.some(([x, y]) => (x === a && y === b) || (x === b && y === a));

/** The table is symmetric: the relation of two yonis does not depend on the side. */
export function yoniRelation(a: Yoni, b: Yoni): YoniRelation {
  if (a === b) return "same";
  if (hasPair(YONI_SWORN, a, b)) return "sworn";
  if (hasPair(YONI_FRIENDLY, a, b)) return "friendly";
  if (hasPair(YONI_INIMICAL, a, b)) return "inimical";
  return "neutral";
}

// ─── Graha Maitrī (5) ────────────────────────────────────────────────────────
/**
 * Points from the natural relationship of the two Moon-sign lords, read both ways
 * (key = the two relations sorted). Same lord → 5.
 */
export const MAITRI_POINTS: Record<string, number> = {
  "friend+friend": 5,
  "friend+neutral": 4,
  "neutral+neutral": 3,
  "enemy+friend": 1,
  "enemy+neutral": 0.5,
  "enemy+enemy": 0,
};

// ─── Gaṇa (6) ────────────────────────────────────────────────────────────────
export type Gana = "deva" | "manushya" | "rakshasa";
export const GANA_LABEL: Record<Gana, string> = { deva: "Deva", manushya: "Manuṣya", rakshasa: "Rākṣasa" };

/** Gaṇa of each nakshatra, Aśvinī = 0. */
export const GANA_BY_NAK: readonly Gana[] = [
  "deva", // Aśvinī
  "manushya", // Bharaṇī
  "rakshasa", // Kṛttikā
  "manushya", // Rohiṇī
  "deva", // Mṛgaśīrṣa
  "manushya", // Ārdrā
  "deva", // Punarvasu
  "deva", // Puṣya
  "rakshasa", // Āśleṣā
  "rakshasa", // Maghā
  "manushya", // Pūrva Phalgunī
  "manushya", // Uttara Phalgunī
  "deva", // Hasta
  "rakshasa", // Citrā
  "deva", // Svātī
  "rakshasa", // Viśākhā
  "deva", // Anurādhā
  "rakshasa", // Jyeṣṭhā
  "rakshasa", // Mūla
  "manushya", // Pūrva Āṣāḍhā
  "manushya", // Uttara Āṣāḍhā
  "deva", // Śravaṇa
  "rakshasa", // Dhaniṣṭhā
  "rakshasa", // Śatabhiṣā
  "manushya", // Pūrva Bhādrapadā
  "manushya", // Uttara Bhādrapadā
  "deva", // Revatī
];

/**
 * GANA[first][second]. School followed: the saravali.de table as used by PyJHora —
 * Deva×Manuṣya 5 but Manuṣya×Deva 6; Deva×Rākṣasa 1 but Rākṣasa×Deva 0.
 */
export const GANA: Record<Gana, Record<Gana, number>> = {
  deva: { deva: 6, manushya: 5, rakshasa: 1 },
  manushya: { deva: 6, manushya: 6, rakshasa: 0 },
  rakshasa: { deva: 0, manushya: 0, rakshasa: 6 },
};

// ─── Bhakūṭa (7) ─────────────────────────────────────────────────────────────
/**
 * Inclusive sign distances (counted from the first Moon to the second) that make Bhakūṭa doṣa:
 * the 2/12, 5/9 and 6/8 axes (Muhūrta Cintāmaṇi ch. 6).
 */
export const BHAKOOT_DOSHA_DISTANCES: readonly number[] = [2, 12, 5, 9, 6, 8];

// ─── Nāḍī (8) ────────────────────────────────────────────────────────────────
export type Nadi = "adi" | "madhya" | "antya";
export const NADI_LABEL: Record<Nadi, string> = { adi: "Ādi", madhya: "Madhya", antya: "Antya" };
/** Nāḍī cycles Ādi, Madhya, Antya, Antya, Madhya, Ādi through the nakshatras: `NADI_CYCLE[nak % 6]`. */
export const NADI_CYCLE: readonly Nadi[] = ["adi", "madhya", "antya", "antya", "madhya", "adi"];
