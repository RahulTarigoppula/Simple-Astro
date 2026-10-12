// The citations every rule may use. Each one resolves to an entry in src/data/citations.json
// (asserted by src/engine/citations.test.ts). Chapter-only refs ("ch. 37") are deliberate: a verse
// number is given only where it is well established across the common translations.
import type { Citation } from "./types";

const c = (text: string, ref: string): Citation => ({ text, ref });

export const CITE = {
  // yogas
  bphs26: c("BPHS", "ch. 26"),
  bphs36: c("BPHS", "ch. 36"),
  bphs37: c("BPHS", "ch. 37"),
  bphs38: c("BPHS", "ch. 38"),
  bphs39: c("BPHS", "ch. 39"),
  phaladipika6_1: c("Phaladīpikā", "6.1"),
  phaladipika6: c("Phaladīpikā", "ch. 6"),
  phaladipika7: c("Phaladīpikā", "ch. 7"),
  saravali15: c("Sārāvalī", "ch. 15"),
  suryaSiddhanta7: c("Sūrya Siddhānta", "ch. 7"),
  kalaSarpa: c("Later tradition", "Kāla-Sarpa"),
  kujaDosha: c("Later tradition", "Kuja-doṣa"),
  kujaDoshaBhanga: c("Later tradition", "Kuja-doṣa bhaṅga"),
  // Guna Milan
  muhurtaChintamani6: c("Muhūrta Cintāmaṇi", "ch. 6"),
  milanCommentary: c("Later tradition", "Aṣṭakūṭa parihāra"),
  porutham: c("Porutham tradition (Tamil jyotiṣa)", "Daśa porutham"),
  ganaParihara: c("Later tradition", "Gaṇa parihāra"),
  // palm
  samudrikaHeart: c("Sāmudrika Śāstra", "Hṛdaya-rekhā"),
  samudrikaHead: c("Sāmudrika Śāstra", "Mastiṣka-rekhā"),
  samudrikaLife: c("Sāmudrika Śāstra", "Jīvana-rekhā"),
  samudrikaFingers: c("Sāmudrika Śāstra", "Aṅguli-lakṣaṇa"),
  cheiroThumb: c("Cheiro, Language of the Hand", "The Thumb"),
  gettingsElements: c("Gettings, The Book of the Hand", "Hand types"),
  // Aṣṭakavarga
  bphs66: c("BPHS", "ch. 66"),
  bphs67: c("BPHS", "ch. 67"),
  phaladipika24: c("Phaladīpikā", "ch. 24"),
  sav28: c("Later tradition", "Sarvāṣṭakavarga 28"),
  // Gochara (transits)
  phaladipika26: c("Phaladīpikā", "ch. 26"),
  taraBala: c("Muhūrta Cintāmaṇi", "Tārā-bala"),
  chandraBala: c("Muhūrta Cintāmaṇi", "Candra-bala"),
  sadeSati: c("Later tradition", "Sāḍe-sātī"),
  kantakaAshtama: c("Later tradition", "Kaṇṭaka and Aṣṭama Śani"),
  bphs46: c("BPHS", "ch. 46"),
  // Muhūrta divisions and the month leaf
  muhurtaChoghadiya: c("Muhūrta tradition", "Choghaḍiyā"),
  muhurtaHora: c("Muhūrta tradition", "Horā"),
  muhurtaKala: c("Muhūrta tradition", "Brahma-muhūrta and Godhūli"),
  muhurtaTithiDay: c("Muhūrta tradition", "Udaya tithi"),
  suryaSiddhanta14: c("Sūrya Siddhānta", "ch. 14"),
} as const satisfies Record<string, Citation>;

export type CiteKey = keyof typeof CITE;
