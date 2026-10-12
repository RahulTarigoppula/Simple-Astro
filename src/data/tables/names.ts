// Classical names, re-typed as facts. Latin uses IAST-style diacritics; Devanagari sits beside it.
import type { GrahaId } from "../../engine/types";

export const SIGN_NAMES = [
  "Meṣa",
  "Vṛṣabha",
  "Mithuna",
  "Karka",
  "Siṃha",
  "Kanyā",
  "Tulā",
  "Vṛścika",
  "Dhanu",
  "Makara",
  "Kumbha",
  "Mīna",
] as const;

/** Upper-case ASCII-friendly forms for engraved brass ("LAGNA ♓ MEENA"). */
export const SIGN_ENGRAVED = [
  "MESHA",
  "VRISHABHA",
  "MITHUNA",
  "KARKA",
  "SIMHA",
  "KANYA",
  "TULA",
  "VRISCHIKA",
  "DHANU",
  "MAKARA",
  "KUMBHA",
  "MEENA",
] as const;

export const SIGN_DEV = ["मेष", "वृषभ", "मिथुन", "कर्क", "सिंह", "कन्या", "तुला", "वृश्चिक", "धनु", "मकर", "कुम्भ", "मीन"] as const;

/** The engraved strip prints the sign glyph only as a Unicode mark for the sidereal rāśi index. */
export const SIGN_MARK = ["♈", "♉", "♊", "♋", "♌", "♍", "♎", "♏", "♐", "♑", "♒", "♓"] as const;

export const NAKSHATRA_NAMES = [
  "Aśvinī",
  "Bharaṇī",
  "Kṛttikā",
  "Rohiṇī",
  "Mṛgaśīrṣa",
  "Ārdrā",
  "Punarvasu",
  "Puṣya",
  "Āśleṣā",
  "Maghā",
  "Pūrva Phalgunī",
  "Uttara Phalgunī",
  "Hasta",
  "Citrā",
  "Svātī",
  "Viśākhā",
  "Anurādhā",
  "Jyeṣṭhā",
  "Mūla",
  "Pūrva Āṣāḍhā",
  "Uttara Āṣāḍhā",
  "Śravaṇa",
  "Dhaniṣṭhā",
  "Śatabhiṣā",
  "Pūrva Bhādrapadā",
  "Uttara Bhādrapadā",
  "Revatī",
] as const;

/** Short forms for narrow cells and engraved readouts: "P.Bhādrapadā". */
export const NAKSHATRA_SHORT = [
  "Aśvinī",
  "Bharaṇī",
  "Kṛttikā",
  "Rohiṇī",
  "Mṛgaśīrṣa",
  "Ārdrā",
  "Punarvasu",
  "Puṣya",
  "Āśleṣā",
  "Maghā",
  "P.Phalgunī",
  "U.Phalgunī",
  "Hasta",
  "Citrā",
  "Svātī",
  "Viśākhā",
  "Anurādhā",
  "Jyeṣṭhā",
  "Mūla",
  "P.Āṣāḍhā",
  "U.Āṣāḍhā",
  "Śravaṇa",
  "Dhaniṣṭhā",
  "Śatabhiṣā",
  "P.Bhādrapadā",
  "U.Bhādrapadā",
  "Revatī",
] as const;

export const NAKSHATRA_DEV = [
  "अश्विनी",
  "भरणी",
  "कृत्तिका",
  "रोहिणी",
  "मृगशिरा",
  "आर्द्रा",
  "पुनर्वसु",
  "पुष्य",
  "आश्लेषा",
  "मघा",
  "पूर्व फाल्गुनी",
  "उत्तर फाल्गुनी",
  "हस्त",
  "चित्रा",
  "स्वाति",
  "विशाखा",
  "अनुराधा",
  "ज्येष्ठा",
  "मूल",
  "पूर्वाषाढ़ा",
  "उत्तराषाढ़ा",
  "श्रवण",
  "धनिष्ठा",
  "शतभिषा",
  "पूर्व भाद्रपद",
  "उत्तर भाद्रपद",
  "रेवती",
] as const;

export const GRAHA_NAMES: Record<GrahaId, string> = {
  SU: "Sūrya",
  MO: "Candra",
  MA: "Maṅgala",
  ME: "Budha",
  JU: "Guru",
  VE: "Śukra",
  SA: "Śani",
  RA: "Rāhu",
  KE: "Ketu",
};

export const GRAHA_ENGLISH: Record<GrahaId, string> = {
  SU: "Sun",
  MO: "Moon",
  MA: "Mars",
  ME: "Mercury",
  JU: "Jupiter",
  VE: "Venus",
  SA: "Saturn",
  RA: "Rahu",
  KE: "Ketu",
};

export const GRAHA_DEV: Record<GrahaId, string> = {
  SU: "सूर्य",
  MO: "चन्द्र",
  MA: "मंगल",
  ME: "बुध",
  JU: "गुरु",
  VE: "शुक्र",
  SA: "शनि",
  RA: "राहु",
  KE: "केतु",
};

/** Chart-chip abbreviations — text, never a glyph font. */
export const GRAHA_ABBR_DEV: Record<GrahaId, string> = {
  SU: "सू",
  MO: "च",
  MA: "मं",
  ME: "बु",
  JU: "गु",
  VE: "शु",
  SA: "श",
  RA: "रा",
  KE: "के",
};

export const GRAHA_ABBR_LAT: Record<GrahaId, string> = {
  SU: "Sū",
  MO: "Ch",
  MA: "Ma",
  ME: "Bu",
  JU: "Gu",
  VE: "Śu",
  SA: "Śa",
  RA: "Rā",
  KE: "Ke",
};

/** Two-letter engraved codes for the loupe readout ("MA 11°31′24″"). */
export const GRAHA_CODE: Record<GrahaId, string> = {
  SU: "SU",
  MO: "CH",
  MA: "MA",
  ME: "BU",
  JU: "GU",
  VE: "SK",
  SA: "SA",
  RA: "RA",
  KE: "KE",
};

export const TITHI_NAMES = [
  "Pratipadā",
  "Dvitīyā",
  "Tṛtīyā",
  "Caturthī",
  "Pañcamī",
  "Ṣaṣṭhī",
  "Saptamī",
  "Aṣṭamī",
  "Navamī",
  "Daśamī",
  "Ekādaśī",
  "Dvādaśī",
  "Trayodaśī",
  "Caturdaśī",
  "Pūrṇimā",
] as const;

export const TITHI_DEV = [
  "प्रतिपदा",
  "द्वितीया",
  "तृतीया",
  "चतुर्थी",
  "पंचमी",
  "षष्ठी",
  "सप्तमी",
  "अष्टमी",
  "नवमी",
  "दशमी",
  "एकादशी",
  "द्वादशी",
  "त्रयोदशी",
  "चतुर्दशी",
  "पूर्णिमा",
] as const;

export const VARA_NAMES = ["Ravivāra", "Somavāra", "Maṅgalavāra", "Budhavāra", "Guruvāra", "Śukravāra", "Śanivāra"] as const;

export const VARA_DEV = ["रविवार", "सोमवार", "मंगलवार", "बुधवार", "गुरुवार", "शुक्रवार", "शनिवार"] as const;

export const YOGA_NAMES = [
  "Viṣkambha",
  "Prīti",
  "Āyuṣmān",
  "Saubhāgya",
  "Śobhana",
  "Atigaṇḍa",
  "Sukarmā",
  "Dhṛti",
  "Śūla",
  "Gaṇḍa",
  "Vṛddhi",
  "Dhruva",
  "Vyāghāta",
  "Harṣaṇa",
  "Vajra",
  "Siddhi",
  "Vyatīpāta",
  "Varīyān",
  "Parigha",
  "Śiva",
  "Siddha",
  "Sādhya",
  "Śubha",
  "Śukla",
  "Brahmā",
  "Indra",
  "Vaidhṛti",
] as const;

/** The seven movable karaṇas (k = 2..57 cycle through these). */
export const KARANA_MOVABLE = ["Bava", "Bālava", "Kaulava", "Taitila", "Gara", "Vaṇija", "Viṣṭi"] as const;
/** Fixed karaṇas: k = 1 Kiṃstughna; k = 58, 59, 60. */
export const KARANA_FIXED = { first: "Kiṃstughna", last: ["Śakuni", "Catuṣpāda", "Nāga"] } as const;

export const MASA_NAMES = [
  "Caitra",
  "Vaiśākha",
  "Jyeṣṭha",
  "Āṣāḍha",
  "Śrāvaṇa",
  "Bhādrapada",
  "Āśvina",
  "Kārttika",
  "Mārgaśīrṣa",
  "Pauṣa",
  "Māgha",
  "Phālguna",
] as const;

export const RITU_NAMES = ["Vasanta", "Grīṣma", "Varṣā", "Śarad", "Hemanta", "Śiśira"] as const;

/** Sign lords, 0 = Meṣa. */
export const SIGN_LORD: readonly GrahaId[] = ["MA", "VE", "ME", "MO", "SU", "ME", "VE", "MA", "JU", "SA", "SA", "JU"];

/** Vimshottari order of nakshatra lords, repeated three times across the 27. */
export const NAK_LORDS: readonly GrahaId[] = ["KE", "VE", "SU", "MO", "MA", "RA", "JU", "SA", "ME"];

export const ORDINAL = (n: number): string => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] ?? s[v] ?? s[0]}`;
};
