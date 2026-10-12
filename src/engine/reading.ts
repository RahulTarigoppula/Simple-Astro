// The deterministic reading composer (IMPLEMENTATION-PROMPT §6.15). No LLM, no clock, no unseeded randomness:
// a sentence is a template chosen by mulberry32(hashString(seed)) and filled with the hit's values.
//
// Content care (§2.3.6): every template begins "Tradition says", speaks of temperament and
// inclination only, and carries a citation. No template mentions health, death, fertility, wealth,
// legal matters, dates of events, remedies, gemstones or rituals — reading.test.ts scans the whole
// TEMPLATES table against src/test/banned-words.ts.
import { CITE } from "./citations";
import { hashString, mulberry32 } from "./math";
import type { Citation, KootaResult, MilanResult, PalmLineId, YogaEvidence, YogaHit } from "./types";

export type TemplateValues = Readonly<Record<string, string | number>>;

/** A rule hit on its way to becoming a sentence. */
export interface Hit {
  id: string; // rule id; also the TEMPLATES key unless `template` is given
  template?: string; // TEMPLATES key override (e.g. 'cancelled')
  weight: number; // higher sorts first
  values: TemplateValues;
  citation: Citation;
  because?: YogaEvidence[];
  /** A sentence already composed elsewhere (a YogaHit's `reading`); used verbatim. */
  text?: string;
}

export interface Sentence {
  ruleId: string;
  text: string;
  citation: Citation;
  evidence: YogaEvidence[];
}

export const MAX_SENTENCES = 12;
export const OPENING = "Tradition says";

// ─── templates ───────────────────────────────────────────────────────────────
// Placeholders are {name}. A missing value throws — never a silent "{name}" on screen.

export const TEMPLATES: Readonly<Record<string, readonly string[]>> = {
  // yogas
  "gaja-kesari": [
    "Tradition says Guru in the {house} from Candra, the Gaja-Kesari pairing, lends the temperament a steady, generous and learned bearing.",
    "Tradition says that when Guru stands in the {house} from a Candra in {moonSign}, the mind is read as broad and good-humoured, slow to take offence.",
    "Tradition says the Gaja-Kesari pattern (Guru in the {house} from Candra) describes a disposition that others find dependable and wise.",
  ],
  "budha-aditya": [
    "Tradition says Sūrya and Budha together in {sign} incline the mind toward clear speech and quick, orderly thinking.",
    "Tradition says the Budha-Āditya pairing in {sign} is read as a lively intellect that enjoys explaining things well.",
  ],
  "candra-mangala": [
    "Tradition says Candra and Maṅgala {relation} in {sign} give feelings a brisk, enterprising edge.",
    "Tradition says the Candra-Maṅgala pattern ({relation}, {sign}) is read as an emotional nature that turns readily into action.",
  ],
  rucaka: [
    "Tradition says Maṅgala in {dignity} in the {house} house (Rucaka) is read as courage, directness and a taste for meeting challenges head-on.",
    "Tradition says the Rucaka pattern, Maṅgala strong in {sign} in a kendra, describes a bold and energetic temperament.",
  ],
  bhadra: [
    "Tradition says Budha in {dignity} in the {house} house (Bhadra) is read as eloquence, wit and an inclination to learn all one's life.",
    "Tradition says the Bhadra pattern, Budha strong in {sign} in a kendra, describes a quick, articulate and adaptable mind.",
  ],
  hamsa: [
    "Tradition says Guru in {dignity} in the {house} house (Haṃsa) is read as a principled, gentle and reflective temperament.",
    "Tradition says the Haṃsa pattern, Guru strong in {sign} in a kendra, describes a nature drawn to wisdom and fair dealing.",
  ],
  malavya: [
    "Tradition says Śukra in {dignity} in the {house} house (Mālavya) is read as grace, a love of beauty and an easy warmth with others.",
    "Tradition says the Mālavya pattern, Śukra strong in {sign} in a kendra, describes an artistic and companionable disposition.",
  ],
  sasa: [
    "Tradition says Śani in {dignity} in the {house} house (Śaśa) is read as patience, discipline and a capacity for sustained effort.",
    "Tradition says the Śaśa pattern, Śani strong in {sign} in a kendra, describes a serious, persevering and organised temperament.",
  ],
  kemadruma: [
    "Tradition says a Candra in {moonSign} with no graha on either side (Kemadruma) is read as a self-reliant, inward-turning temperament.",
    "Tradition says the Kemadruma pattern, Candra unaccompanied in {moonSign}, describes a mind that learns to be its own company.",
  ],
  "kemadruma-bhanga-kendra-lagna": [
    "Tradition says {grahas} in a kendra from the Lagna dissolves Kemadruma, so the solitary Candra is read as well supported.",
    "Tradition says that with {grahas} holding a kendra from the Lagna, the Kemadruma pattern is set aside.",
  ],
  "kemadruma-bhanga-kendra-moon": [
    "Tradition says {grahas} in a kendra from Candra dissolves Kemadruma, giving the mind steady companions.",
    "Tradition says that with {grahas} in a kendra from Candra, the Kemadruma pattern is read as cancelled.",
  ],
  "kemadruma-bhanga-conjunct": [
    "Tradition says {grahas} sharing Candra's sign dissolves Kemadruma, so the mind is not read as alone.",
    "Tradition says Candra joined by {grahas} sets the Kemadruma pattern aside.",
  ],
  "kemadruma-bhanga-guru-drishti": [
    "Tradition says Guru's aspect on Candra, the {house} from Guru, dissolves Kemadruma and lends the mind composure.",
    "Tradition says that with Guru aspecting Candra, the Kemadruma pattern is read as cancelled.",
  ],
  sunapha: [
    "Tradition says {grahas} in the 2nd from Candra (Sunaphā) is read as resourcefulness and a self-made, purposeful temperament.",
    "Tradition says the Sunaphā pattern, {grahas} just ahead of Candra, describes an industrious and capable mind.",
  ],
  anapha: [
    "Tradition says {grahas} in the 12th from Candra (Anaphā) is read as composure, good manners and a contented temperament.",
    "Tradition says the Anaphā pattern, {grahas} just behind Candra, describes a well-spoken and self-possessed nature.",
  ],
  durudhara: [
    "Tradition says grahas on both sides of Candra (Durudharā: {grahas}) is read as a generous, well-supported temperament.",
    "Tradition says the Durudharā pattern, Candra flanked by {grahas}, describes a mind that rarely feels unaccompanied.",
  ],
  "kala-sarpa": [
    "Tradition says all seven grahas gathered on one side of the Rāhu–Ketu axis ({direction}) is read as a life of focused, single-minded striving.",
    "Tradition says the Kāla-Sarpa pattern ({direction}) describes intensity of purpose; later authors name it, the classical texts do not.",
  ],
  manglik: [
    "Tradition says Maṅgala in the {house} from the {from} (Kuja doṣa) is read as an ardent, forthright temperament in close partnership.",
    "Tradition says Maṅgala placed in the {house} from the {from} marks a spirited nature that does best with a partner of matching energy.",
  ],
  "manglik-bhanga-own-sign": [
    "Tradition says Maṅgala in its own or exaltation sign ({sign}) softens Kuja doṣa.",
    "Tradition says that Maṅgala at home in {sign} is read as setting the Kuja doṣa aside.",
  ],
  "manglik-bhanga-budha-rashi": [
    "Tradition says Maṅgala in the 2nd in Budha's sign {sign} softens Kuja doṣa.",
    "Tradition says Maṅgala in the 2nd in {sign} is one of the classical exceptions to Kuja doṣa.",
  ],
  "manglik-bhanga-guru-drishti": [
    "Tradition says Guru {relation} Maṅgala softens Kuja doṣa.",
    "Tradition says that with Guru {relation} Maṅgala, the Kuja doṣa is read as tempered.",
  ],
  "manglik-bhanga-shani-kendra": [
    "Tradition says Śani {relation} Maṅgala is counted among the exceptions to Kuja doṣa.",
    "Tradition says that with Śani {relation} Maṅgala, the Kuja doṣa is read as balanced.",
  ],
  "graha-yuddha": [
    "Tradition says {pair} within a degree of each other (Graha Yuddha) describes two strong impulses in conversation; {winner}, lying further north, is read as the steadier voice.",
    "Tradition says the planetary contest of {pair} is read as an inner debate between two drives, with {winner} the one that usually carries it.",
  ],
  adhi: [
    "Tradition says the gentle grahas {grahas} in the 6th, 7th and 8th from Candra (Adhi) are read as tact, courtesy and quiet capability.",
    "Tradition says the Adhi pattern ({grahas} around the 7th from Candra) describes a gracious, even-tempered disposition.",
  ],
  amala: [
    "Tradition says only gentle grahas ({grahas}) in the 10th from the {from} (Amalā) is read as a clean reputation and kindly conduct.",
    "Tradition says the Amalā pattern, {grahas} alone in the 10th from the {from}, describes an honest and considerate way of working.",
  ],
  vesi: [
    "Tradition says {grahas} in the 2nd from Sūrya (Veśi) is read as an even-handed, truthful temperament.",
    "Tradition says the Veśi pattern, {grahas} just ahead of Sūrya, describes a balanced and plain-spoken nature.",
  ],
  vasi: [
    "Tradition says {grahas} in the 12th from Sūrya (Vāśi) is read as skill, diligence and a generous spirit.",
    "Tradition says the Vāśi pattern, {grahas} just behind Sūrya, describes a capable and kindly disposition.",
  ],
  ubhayacari: [
    "Tradition says grahas on both sides of Sūrya (Ubhayacarī: {grahas}) is read as an articulate, well-balanced temperament.",
    "Tradition says the Ubhayacarī pattern, Sūrya flanked by {grahas}, describes poise and a fluent manner.",
  ],
  "nica-bhanga-raja": [
    "Tradition says {grahas}, though in the sign of fall, is lifted by {condition} (Nīca-Bhaṅga), read as strength found through early difficulty.",
    "Tradition says the Nīca-Bhaṅga pattern for {grahas} ({condition}) describes a nature that turns a weak start into steady resolve.",
  ],
  "viparita-raja": [
    "Tradition says {lords} lording and occupying the hidden houses (Viparīta Rāja) is read as resilience: setbacks turned to good account.",
    "Tradition says the Viparīta Rāja pattern ({lords}) describes a temperament that grows calmer and more resourceful under pressure.",
  ],
  "dharma-karmadhipati": [
    "Tradition says the lords of the 9th and 10th, {g9} and {g10}, {how} (Dharma-Karmādhipati) is read as work guided by principle.",
    "Tradition says {g9} and {g10}, lords of dharma and karma, {how}, describe an inclination to make one's work an expression of one's values.",
  ],
  parivartana: [
    "Tradition says {pairs} exchanging signs (Parivartana, {kind}) is read as two areas of life that lean on and strengthen each other.",
    "Tradition says the sign exchange of {pairs} ({kind} Parivartana) describes a temperament that links its interests in unexpected ways.",
  ],
  cancelled: [
    "Tradition says the {yoga} pattern appears here, yet {canceller} softens it, so it is read lightly.",
    "Tradition says {yoga} is present but set aside by {canceller}, and so carries little weight in this chart.",
  ],

  // Guna Milan notes
  "koota-high": [
    "Tradition says {koota} at {score} of {max} ({detail}) is read as an easy accord between the two temperaments.",
    "Tradition says a full {koota} ({detail}, {score} of {max}) describes a natural ease in this part of the pairing.",
  ],
  "koota-mid": [
    "Tradition says {koota} at {score} of {max} ({detail}) is read as a workable accord that grows with understanding.",
    "Tradition says a middling {koota} ({detail}, {score} of {max}) asks for patience in this part of the pairing.",
  ],
  "koota-low": [
    "Tradition says {koota} at {score} of {max} ({detail}) is read as two different rhythms that need conscious care.",
    "Tradition says a low {koota} ({detail}, {score} of {max}) invites the two to talk openly about their differences.",
  ],
  "koota-nadi-dosha": [
    "Tradition says Nāḍī doṣa ({detail}) describes two very similar natures, asked to make room for each other's pace.",
    "Tradition says when both Moons share a nāḍī ({detail}), the pairing is read as like meeting like, needing balance.",
  ],
  "koota-bhakoot-dosha": [
    "Tradition says Bhakūṭa doṣa ({detail}) is read as two outlooks that pull in different directions and benefit from shared goals.",
    "Tradition says the Moon signs on this axis ({detail}) describe differing priorities that ask for patient conversation.",
  ],
  "koota-gana-dosha": [
    "Tradition says Gaṇa doṣa ({detail}) is read as differing temperaments, one more restrained and one more forceful.",
    "Tradition says a Gaṇa mismatch ({detail}) describes contrasting styles that learn from each other with care.",
  ],

  // palm
  "element-earth": [
    "Tradition says a square palm with short fingers (palm width/length {widthOverLength}, fingers/palm {fingerOverPalm}) marks the earth hand, read as practical, patient and dependable.",
    "Tradition says the earth hand (width/length {widthOverLength}, fingers/palm {fingerOverPalm}) is read as a steady temperament that trusts what it can touch.",
  ],
  "element-air": [
    "Tradition says a square palm with long fingers (palm width/length {widthOverLength}, fingers/palm {fingerOverPalm}) marks the air hand, read as curious, communicative and quick.",
    "Tradition says the air hand (width/length {widthOverLength}, fingers/palm {fingerOverPalm}) is read as a mind that loves ideas and conversation.",
  ],
  "element-fire": [
    "Tradition says an oblong palm with short fingers (palm width/length {widthOverLength}, fingers/palm {fingerOverPalm}) marks the fire hand, read as warm, enthusiastic and decisive.",
    "Tradition says the fire hand (width/length {widthOverLength}, fingers/palm {fingerOverPalm}) is read as an energetic temperament that likes to lead.",
  ],
  "element-water": [
    "Tradition says an oblong palm with long fingers (palm width/length {widthOverLength}, fingers/palm {fingerOverPalm}) marks the water hand, read as sensitive, imaginative and receptive.",
    "Tradition says the water hand (width/length {widthOverLength}, fingers/palm {fingerOverPalm}) is read as a deep-feeling and intuitive nature.",
  ],
  "heart-long": [
    "Tradition says a long, deep heart line ({lengthRatio} of palm width, depth {depth}) speaks of steadiness in affection.",
    "Tradition says a heart line running long ({lengthRatio} of palm width, depth {depth}) is read as warmth that is generous and lasting.",
  ],
  "heart-short": [
    "Tradition says a short heart line ({lengthRatio} of palm width, depth {depth}) is read as affection shown in deeds more than in words.",
    "Tradition says a compact heart line ({lengthRatio} of palm width, depth {depth}) describes a reserved, private way of caring.",
  ],
  "heart-curved": [
    "Tradition says a heart line that curves upward (curvature {curvature}, {lengthRatio} of palm width) is read as feelings expressed openly and warmly.",
    "Tradition says a curving heart line (curvature {curvature}, {lengthRatio} of palm width) describes an expressive, demonstrative temperament.",
  ],
  "heart-straight": [
    "Tradition says a straight heart line (curvature {curvature}, {lengthRatio} of palm width) is read as affection guided by thought and loyalty.",
    "Tradition says a level heart line (curvature {curvature}, {lengthRatio} of palm width) describes a calm, considered way with feelings.",
  ],
  "head-long": [
    "Tradition says a long head line ({lengthRatio} of palm width, depth {depth}) is read as a thorough mind that likes to see things through.",
    "Tradition says a head line reaching far across the palm ({lengthRatio} of palm width, depth {depth}) describes careful, wide-ranging thought.",
  ],
  "head-short": [
    "Tradition says a short head line ({lengthRatio} of palm width, depth {depth}) is read as a practical mind that decides quickly.",
    "Tradition says a compact head line ({lengthRatio} of palm width, depth {depth}) describes a direct, focused way of thinking.",
  ],
  "head-sloping": [
    "Tradition says a head line sloping toward the wrist ({slopeDeg}° from level) is read as an imaginative, creative turn of mind.",
    "Tradition says a sloping head line ({slopeDeg}° of slope) describes a mind that thinks in images and stories.",
  ],
  "head-straight": [
    "Tradition says a straight head line ({slopeDeg}° from level) is read as a logical, realistic turn of mind.",
    "Tradition says a level head line ({slopeDeg}° of slope) describes clear, methodical reasoning.",
  ],
  "life-wide": [
    "Tradition says a life line sweeping wide into the palm (arc {arcRatio} of palm width) is read as an outgoing, energetic temperament.",
    "Tradition says a broad life-line arc ({arcRatio} of palm width) describes enthusiasm and a love of activity.",
  ],
  "life-close": [
    "Tradition says a life line hugging the thumb (arc {arcRatio} of palm width) is read as a reserved, home-loving temperament.",
    "Tradition says a close life-line arc ({arcRatio} of palm width) describes a quiet nature that conserves its energy.",
  ],
  "life-faint": [
    "Tradition says a light life line (depth {depth}) is read as a temperament that draws strength from rhythm and routine.",
    "Tradition says a fine, light life line (depth {depth}) describes a sensitive nature that thrives on calm surroundings.",
  ],
  "index-long": [
    "Tradition says an index finger longer than the ring finger (index/ring {indexOverRing}) is read as self-assurance and a taste for leading.",
    "Tradition says a long index finger (index/ring {indexOverRing}) describes confidence and a liking for responsibility.",
  ],
  "ring-long": [
    "Tradition says a ring finger longer than the index finger (index/ring {indexOverRing}) is read as creativity and a willingness to take chances.",
    "Tradition says a long ring finger (index/ring {indexOverRing}) describes an artistic and adventurous temperament.",
  ],
  "thumb-flexible": [
    "Tradition says a thumb that bends back freely ({thumbAngleDeg}° of spread) is read as an adaptable, generous temperament.",
    "Tradition says a supple thumb ({thumbAngleDeg}° of spread) describes an easy-going nature that adjusts to others.",
  ],
  "thumb-firm": [
    "Tradition says a firm, upright thumb ({thumbAngleDeg}° of spread) is read as determination and a steady will.",
    "Tradition says a stiff-jointed thumb ({thumbAngleDeg}° of spread) describes a resolute, reliable temperament.",
  ],
};

// ─── rendering ───────────────────────────────────────────────────────────────

/** Numbers print with at most two decimals ("0.92", "40"); strings as given. */
export function formatValue(v: string | number): string {
  if (typeof v === "string") return v;
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(2);
}

export function fill(template: string, values: TemplateValues): string {
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_m, key: string) => {
    const v = values[key];
    if (v === undefined) throw new Error(`reading: template value "${key}" missing`);
    return formatValue(v);
  });
}

function variants(key: string): readonly string[] {
  const list = TEMPLATES[key];
  if (!list || list.length === 0) throw new Error(`reading: no template for "${key}"`);
  return list;
}

/** Pick one variant with a fresh PRNG seeded from `seed` (one draw) and fill it. */
export function renderTemplate(key: string, values: TemplateValues, seed: string): string {
  const list = variants(key);
  const rng = mulberry32(hashString(seed));
  const t = list[Math.floor(rng() * list.length)] ?? list[0] ?? "";
  return fill(t, values);
}

/**
 * The composer. Sorts by weight (desc) then id, keeps MAX_SENTENCES, and draws one PRNG value per
 * sentence in that order — the same hits and seed always give byte-identical sentences.
 * `seed` = profileId + presetHash + rule-set version.
 */
export function compose(hits: readonly Hit[], seed: string): Sentence[] {
  const rng = mulberry32(hashString(seed));
  return [...hits]
    .sort((a, b) => b.weight - a.weight || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .slice(0, MAX_SENTENCES)
    .map((h) => {
      const r = rng(); // drawn even for precomposed text, so ordering alone fixes every choice
      let text: string;
      if (h.text !== undefined) {
        text = h.text;
      } else {
        const list = variants(h.template ?? h.id);
        text = fill(list[Math.floor(r * list.length)] ?? list[0] ?? "", h.values);
      }
      if (!text.startsWith(OPENING)) throw new Error(`reading: sentence for "${h.id}" must open with "${OPENING}"`);
      return { ruleId: h.id, text, citation: h.citation, evidence: h.because ?? [] };
    });
}

// ─── adapters: yogas and Guna Milan into Hits ────────────────────────────────

const STRENGTH_WEIGHT: Record<YogaHit["strength"], number> = { full: 3, partial: 2, cancelled: 1 };

/** Yoga hits already carry their composed sentence; this keeps the ledger and paragraph identical. */
export function hitsFromYogas(yogas: readonly YogaHit[]): Hit[] {
  return yogas.map((y) => ({
    id: y.id,
    weight: STRENGTH_WEIGHT[y.strength],
    values: {},
    citation: y.citation,
    because: y.because,
    text: y.reading,
  }));
}

function kootaTemplate(k: KootaResult): string {
  if (k.dosha && (k.id === "nadi" || k.id === "bhakoot" || k.id === "gana")) return `koota-${k.id}-dosha`;
  if (k.score >= k.max) return "koota-high";
  if (k.score === 0) return "koota-low";
  return "koota-mid";
}

/** One note per koota; doṣas weigh most, so they lead the paragraph. */
export function hitsFromMilan(m: Pick<MilanResult, "kootas">): Hit[] {
  return m.kootas.map((k) => ({
    id: `koota-${k.id}`,
    template: kootaTemplate(k),
    weight: k.dosha ? 3 : k.score >= k.max ? 2 : 1,
    values: { koota: k.name, score: k.score, max: k.max, detail: k.because },
    citation: k.citation,
  }));
}

// ─── palm ────────────────────────────────────────────────────────────────────

export type PalmRuleId =
  | "element-earth"
  | "element-air"
  | "element-fire"
  | "element-water"
  | "heart-long"
  | "heart-short"
  | "heart-curved"
  | "heart-straight"
  | "head-long"
  | "head-short"
  | "head-sloping"
  | "head-straight"
  | "life-wide"
  | "life-close"
  | "life-faint"
  | "index-long"
  | "ring-long"
  | "thumb-flexible"
  | "thumb-firm";

export interface PalmRuleSpec {
  /** Value keys the template prints (all required). `confidence` (0..1) is always optional. */
  values: readonly string[];
  /** The line the rule reads, for the low-confidence wording; absent for shape/finger rules. */
  line?: PalmLineId;
  citation: Citation;
  /** What each value means, for the palm agent. */
  doc: string;
}

/**
 * The palm rules and the values each one expects. Ratios are unitless and print with two decimals;
 * angles are degrees. Low confidence (< LOW_CONFIDENCE) changes the wording, never the claim.
 */
export const PALM_RULES: Readonly<Record<PalmRuleId, PalmRuleSpec>> = {
  "element-earth": {
    values: ["widthOverLength", "fingerOverPalm"],
    citation: CITE.gettingsElements,
    doc: "widthOverLength = palm width / palm length; fingerOverPalm = middle-finger length / palm length",
  },
  "element-air": {
    values: ["widthOverLength", "fingerOverPalm"],
    citation: CITE.gettingsElements,
    doc: "as element-earth",
  },
  "element-fire": {
    values: ["widthOverLength", "fingerOverPalm"],
    citation: CITE.gettingsElements,
    doc: "as element-earth",
  },
  "element-water": {
    values: ["widthOverLength", "fingerOverPalm"],
    citation: CITE.gettingsElements,
    doc: "as element-earth",
  },
  "heart-long": {
    values: ["lengthRatio", "depth"],
    line: "heart",
    citation: CITE.samudrikaHeart,
    doc: "lengthRatio = line length / palm width; depth = metrics.depth (0..1)",
  },
  "heart-short": {
    values: ["lengthRatio", "depth"],
    line: "heart",
    citation: CITE.samudrikaHeart,
    doc: "as heart-long",
  },
  "heart-curved": {
    values: ["curvature", "lengthRatio"],
    line: "heart",
    citation: CITE.samudrikaHeart,
    doc: "curvature = metrics.curvature; lengthRatio = line length / palm width",
  },
  "heart-straight": {
    values: ["curvature", "lengthRatio"],
    line: "heart",
    citation: CITE.samudrikaHeart,
    doc: "as heart-curved",
  },
  "head-long": {
    values: ["lengthRatio", "depth"],
    line: "head",
    citation: CITE.samudrikaHead,
    doc: "lengthRatio = line length / palm width; depth = metrics.depth (0..1)",
  },
  "head-short": {
    values: ["lengthRatio", "depth"],
    line: "head",
    citation: CITE.samudrikaHead,
    doc: "as head-long",
  },
  "head-sloping": {
    values: ["slopeDeg"],
    line: "head",
    citation: CITE.samudrikaHead,
    doc: "slopeDeg = angle of the line's chord below the palm's horizontal, degrees (printed rounded)",
  },
  "head-straight": {
    values: ["slopeDeg"],
    line: "head",
    citation: CITE.samudrikaHead,
    doc: "as head-sloping",
  },
  "life-wide": {
    values: ["arcRatio"],
    line: "life",
    citation: CITE.samudrikaLife,
    doc: "arcRatio = greatest distance of the arc from the thumb edge / palm width",
  },
  "life-close": {
    values: ["arcRatio"],
    line: "life",
    citation: CITE.samudrikaLife,
    doc: "as life-wide",
  },
  "life-faint": {
    values: ["depth"],
    line: "life",
    citation: CITE.samudrikaLife,
    doc: "depth = metrics.depth (0..1)",
  },
  "index-long": {
    values: ["indexOverRing"],
    citation: CITE.samudrikaFingers,
    doc: "indexOverRing = ratios.indexOverRing (world landmarks)",
  },
  "ring-long": {
    values: ["indexOverRing"],
    citation: CITE.samudrikaFingers,
    doc: "as index-long",
  },
  "thumb-flexible": {
    values: ["thumbAngleDeg"],
    citation: CITE.cheiroThumb,
    doc: "thumbAngleDeg = ratios.thumbAngleDeg, degrees (printed rounded)",
  },
  "thumb-firm": {
    values: ["thumbAngleDeg"],
    citation: CITE.cheiroThumb,
    doc: "as thumb-flexible",
  },
};

export const PALM_RULE_IDS = Object.keys(PALM_RULES) as PalmRuleId[];
export const LOW_CONFIDENCE = 0.6;

const DEGREE_KEYS = new Set(["slopeDeg", "thumbAngleDeg"]);

export interface PalmSentence {
  ruleId: PalmRuleId;
  text: string;
  citation: Citation;
  measured: string; // "lengthRatio 0.92 · depth 0.61"
}

/**
 * One palm sentence, measurement printed inside it. Without a seed the first variant is used (the
 * canonical wording); with a seed the variant is drawn deterministically from it.
 */
export function palmSentence(ruleId: PalmRuleId, values: Readonly<Record<string, number>>, seed?: string): PalmSentence {
  const spec = PALM_RULES[ruleId];
  const printable: Record<string, string> = {};
  for (const key of spec.values) {
    const v = values[key];
    if (v === undefined || !Number.isFinite(v)) throw new Error(`palmSentence: "${ruleId}" needs a finite "${key}"`);
    printable[key] = DEGREE_KEYS.has(key) ? String(Math.round(v)) : v.toFixed(2);
  }
  const list = variants(ruleId);
  const idx = seed === undefined ? 0 : Math.floor(mulberry32(hashString(`${seed}|${ruleId}`))() * list.length);
  let text = fill(list[idx] ?? list[0] ?? "", printable);
  const confidence = values.confidence;
  if (spec.line && confidence !== undefined && confidence < LOW_CONFIDENCE) {
    text = `${text.slice(0, -1)} — the ${spec.line} line is faint in this print; trace it to confirm.`;
  }
  const measured = spec.values.map((k) => `${k} ${printable[k] ?? ""}`).join(" · ");
  return { ruleId, text, citation: spec.citation, measured };
}
