// Regional names for the twelve rāśis and twenty-seven nakṣatras. The sky and the calculation are
// the same everywhere in India (Lahiri ayanāṃśa); only the names, and how the chart is drawn, differ.
// Telugu and Tamil spellings follow the common English transliterations used in almanacs.
import { NAKSHATRA_NAMES, SIGN_NAMES } from "./tables/names";

export type Tradition = "north" | "telugu" | "tamil";

export const TRADITION_LABEL: Record<Tradition, string> = {
  north: "North Indian",
  telugu: "Telugu",
  tamil: "Tamil",
};

const RASHI: Record<Exclude<Tradition, "north">, readonly string[]> = {
  telugu: [
    "Mesham",
    "Vrushabham",
    "Mithunam",
    "Karkatakam",
    "Simham",
    "Kanya",
    "Thula",
    "Vruschikam",
    "Dhanussu",
    "Makaram",
    "Kumbham",
    "Meenam",
  ],
  tamil: ["Mesham", "Rishabam", "Mithunam", "Kadagam", "Simmam", "Kanni", "Thulam", "Viruchigam", "Dhanusu", "Magaram", "Kumbam", "Meenam"],
};

const NAK: Record<Exclude<Tradition, "north">, readonly string[]> = {
  telugu: [
    "Ashwini",
    "Bharani",
    "Krittika",
    "Rohini",
    "Mrigasira",
    "Arudra",
    "Punarvasu",
    "Pushyami",
    "Aslesha",
    "Makha",
    "Pubba",
    "Uttara",
    "Hasta",
    "Chitta",
    "Swati",
    "Visakha",
    "Anuradha",
    "Jyeshta",
    "Moola",
    "Purvashadha",
    "Uttarashadha",
    "Sravanam",
    "Dhanishta",
    "Satabhisham",
    "Purvabhadra",
    "Uttarabhadra",
    "Revati",
  ],
  tamil: [
    "Aswini",
    "Bharani",
    "Karthigai",
    "Rohini",
    "Mirugasirisham",
    "Thiruvathirai",
    "Punarpoosam",
    "Poosam",
    "Ayilyam",
    "Magam",
    "Pooram",
    "Uthiram",
    "Hastham",
    "Chithirai",
    "Swathi",
    "Visakam",
    "Anusham",
    "Kettai",
    "Moolam",
    "Pooradam",
    "Uthiradam",
    "Thiruvonam",
    "Avittam",
    "Sathayam",
    "Poorattathi",
    "Uthirattathi",
    "Revathi",
  ],
};

/** The rāśi name in the person's tradition (Sanskrit for North Indian). */
export function rashiName(sign: number, t: Tradition | undefined): string {
  return t && t !== "north" ? (RASHI[t][sign] ?? SIGN_NAMES[sign] ?? "") : (SIGN_NAMES[sign] ?? "");
}

/** The nakṣatra name in the person's tradition (Sanskrit for North Indian). */
export function nakName(i: number, t: Tradition | undefined): string {
  return t && t !== "north" ? (NAK[t][i] ?? NAKSHATRA_NAMES[i] ?? "") : (NAKSHATRA_NAMES[i] ?? "");
}

const bare = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** "Thiruvonam (Śravaṇa)" for a regional reader, plain "Śravaṇa" otherwise (and when they only differ by accents). */
export function nakBoth(i: number, t: Tradition | undefined): string {
  const r = nakName(i, t);
  const s = NAKSHATRA_NAMES[i] ?? "";
  return bare(r) === bare(s) ? s : `${r} (${s})`;
}
export function rashiBoth(sign: number, t: Tradition | undefined): string {
  const r = rashiName(sign, t);
  const s = SIGN_NAMES[sign] ?? "";
  return bare(r) === bare(s) ? s : `${r} (${s})`;
}

/** South India draws the square (fixed-sign) chart; the North draws the diamond. */
export function chartStyleFor(t: Tradition | undefined): "north" | "south" | undefined {
  return t === undefined ? undefined : t === "north" ? "north" : "south";
}
