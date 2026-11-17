// Nāmākṣara: the opening sound tradition gives a name from the quarter (pada) of the birth star.
// The 108 sounds are the Avakahaḍā cakra as printed in every pañcāṅga; the retroflex and dental
// letters are written the same in plain Latin here, and a few sounds differ slightly by region.
// Reference data only: for reflection, never a rule about what a child must be called.

/** Four sounds per birth star, in pada order. Index = nakṣatra index (0 Aśvinī … 26 Revatī). */
export const NAME_SOUNDS: readonly (readonly [string, string, string, string])[] = [
  ["Chu", "Che", "Cho", "La"],
  ["Li", "Lu", "Le", "Lo"],
  ["A", "I", "U", "E"],
  ["O", "Va", "Vi", "Vu"],
  ["Ve", "Vo", "Ka", "Ki"],
  ["Ku", "Gha", "Nga", "Chha"],
  ["Ke", "Ko", "Ha", "Hi"],
  ["Hu", "He", "Ho", "Da"],
  ["Di", "Du", "De", "Do"],
  ["Ma", "Mi", "Mu", "Me"],
  ["Mo", "Ta", "Ti", "Tu"],
  ["Te", "To", "Pa", "Pi"],
  ["Pu", "Sha", "Na", "Tha"],
  ["Pe", "Po", "Ra", "Ri"],
  ["Ru", "Re", "Ro", "Ta"],
  ["Ti", "Tu", "Te", "To"],
  ["Na", "Ni", "Nu", "Ne"],
  ["No", "Ya", "Yi", "Yu"],
  ["Ye", "Yo", "Bha", "Bhi"],
  ["Bhu", "Dha", "Pha", "Dha"],
  ["Bhe", "Bho", "Ja", "Ji"],
  ["Khi", "Khu", "Khe", "Kho"],
  ["Ga", "Gi", "Gu", "Ge"],
  ["Go", "Sa", "Si", "Su"],
  ["Se", "So", "Da", "Di"],
  ["Du", "Tha", "Jha", "Na"],
  ["De", "Do", "Cha", "Chi"],
];

export interface NameSounds {
  /** All four sounds of the birth star. */
  all: readonly [string, string, string, string];
  /** The sound of the quarter the Moon was in. */
  own: string;
}

/** The name sounds for a birth star (0..26) and its quarter (1..4). */
export function nameSounds(nakshatra: number, pada: 1 | 2 | 3 | 4): NameSounds {
  const all = NAME_SOUNDS[((Math.trunc(nakshatra) % 27) + 27) % 27] as readonly [string, string, string, string];
  return { all, own: all[pada - 1] as string };
}
