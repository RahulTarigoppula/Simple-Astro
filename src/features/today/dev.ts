// Devanagari beside the Latin for the day ledger — names only, no rules. Indexed like the Latin
// tables in data/tables/names.ts.
import { KARANA_FIXED, KARANA_MOVABLE, MASA_NAMES, RITU_NAMES, TITHI_DEV } from "../../data/tables/names";
import type { Panchang } from "../../engine/types";

export const YOGA_DEV = [
  "विष्कम्भ",
  "प्रीति",
  "आयुष्मान्",
  "सौभाग्य",
  "शोभन",
  "अतिगण्ड",
  "सुकर्मा",
  "धृति",
  "शूल",
  "गण्ड",
  "वृद्धि",
  "ध्रुव",
  "व्याघात",
  "हर्षण",
  "वज्र",
  "सिद्धि",
  "व्यतीपात",
  "वरीयान्",
  "परिघ",
  "शिव",
  "सिद्ध",
  "साध्य",
  "शुभ",
  "शुक्ल",
  "ब्रह्म",
  "इन्द्र",
  "वैधृति",
] as const;

const KARANA_DEV: Record<string, string> = {
  [KARANA_MOVABLE[0]]: "बव",
  [KARANA_MOVABLE[1]]: "बालव",
  [KARANA_MOVABLE[2]]: "कौलव",
  [KARANA_MOVABLE[3]]: "तैतिल",
  [KARANA_MOVABLE[4]]: "गर",
  [KARANA_MOVABLE[5]]: "वणिज",
  [KARANA_MOVABLE[6]]: "विष्टि",
  [KARANA_FIXED.first]: "किंस्तुघ्न",
  [KARANA_FIXED.last[0]]: "शकुनि",
  [KARANA_FIXED.last[1]]: "चतुष्पद",
  [KARANA_FIXED.last[2]]: "नाग",
};

const MASA_DEV = ["चैत्र", "वैशाख", "ज्येष्ठ", "आषाढ़", "श्रावण", "भाद्रपद", "आश्विन", "कार्तिक", "मार्गशीर्ष", "पौष", "माघ", "फाल्गुन"] as const;
const RITU_DEV = ["वसन्त", "ग्रीष्म", "वर्षा", "शरद्", "हेमन्त", "शिशिर"] as const;

export function tithiDev(t: Panchang["tithi"]): string {
  if (t.index === 15) return "पूर्णिमा";
  if (t.index === 30) return "अमावस्या";
  return `${t.paksha === "shukla" ? "शुक्ल" : "कृष्ण"} ${TITHI_DEV[(t.index - 1) % 15] ?? ""}`;
}

export const yogaDev = (index1: number): string => YOGA_DEV[index1 - 1] ?? "";
export const karanaDev = (name: string): string => KARANA_DEV[name] ?? "";
export const masaDev = (name: string): string => MASA_DEV[MASA_NAMES.indexOf(name as (typeof MASA_NAMES)[number])] ?? "";
export const rituDev = (name: string): string => RITU_DEV[RITU_NAMES.indexOf(name as (typeof RITU_NAMES)[number])] ?? "";
export const ayanaDev = (a: Panchang["ayana"]): string => (a === "uttarayana" ? "उत्तरायण" : "दक्षिणायन");
export const ayanaLatin = (a: Panchang["ayana"]): string => (a === "uttarayana" ? "Uttarāyaṇa" : "Dakṣiṇāyana");
