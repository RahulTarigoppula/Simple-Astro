// "Roots" — the story of Indian astrology, palmistry and numerology, told as cards. Myth is told as
// myth, history as history (with dates as historians give them), and the line between them is kept.

export type StoryArt =
  | "sky"
  | "moon"
  | "pole"
  | "dipper"
  | "eclipse"
  | "scroll"
  | "sage"
  | "ship"
  | "zero"
  | "observatory"
  | "wheel"
  | "hand"
  | "numbers"
  | "today";

export interface StoryCard {
  id: string;
  era: string;
  kind: "myth" | "history" | "idea";
  title: string;
  dev?: string;
  art: StoryArt;
  body: string[];
  fact?: string;
}

export interface StoryChapter {
  id: string;
  title: string;
  cards: StoryCard[];
}

export const STORY: StoryChapter[] = [
  {
    id: "sky",
    title: "I · The sky before books",
    cards: [
      {
        id: "first-clock",
        era: "Before 1500 BCE",
        kind: "history",
        title: "The first clock was the sky",
        dev: "आकाश",
        art: "sky",
        body: [
          "Long before writing, farmers and priests on the plains of the Indus and the Ganga watched the same lights every night. The Sun told the seasons. The Moon told the month. Certain stars rose just before dawn when the rains were due.",
          'Knowing the sky meant knowing when to sow, when to harvest, and when to hold the great fire rituals. Jyotiṣa — "the science of light" — began as a calendar, not as fortune-telling.',
        ],
        fact: "The oldest Indian star lists begin with Kṛttikā (the Pleiades), not Aśvinī as today — a clue to how very old they are.",
      },
      {
        id: "navagraha",
        era: "The Vedic gods",
        kind: "myth",
        title: "Nine lights that grasp",
        dev: "नवग्रह",
        art: "wheel",
        body: [
          "In the Vedas the lights of heaven are living gods. Sūrya rides a chariot of seven horses across the sky. Candra, also called Soma, pours the cool nectar of the night. Maṅgala is red and fiery, Budha quick and clever, Bṛhaspati — Guru — is the teacher of the gods, Śukra the teacher of the demons, and Śani, slow and dark, is the son of the Sun.",
          'Together with the shadow-planets Rāhu and Ketu they became the Navagraha, the nine "graspers" who were believed to seize hold of human lives. To this day nine small statues stand together in temples across India, and in Tamil Nadu there are nine whole temples, one for each.',
        ],
        fact: "The English weekdays follow the same planetary order as the Hindu vāra: Sun-day, Moon-day, then Mars, Mercury, Jupiter, Venus and Saturn.",
      },
    ],
  },
  {
    id: "myths",
    title: "II · Stories written in the stars",
    cards: [
      {
        id: "rohini",
        era: "Purāṇic myth",
        kind: "myth",
        title: "The Moon and his 27 wives",
        dev: "चन्द्र और नक्षत्र",
        art: "moon",
        body: [
          "King Dakṣa had twenty-seven daughters — the nakṣatras, the star-maidens — and he gave them all in marriage to the Moon. But the Moon loved only one of them, beautiful Rohiṇī, and spent every night in her house.",
          "The other wives complained to their father. Dakṣa cursed the Moon to waste away. As he faded, the plants and herbs began to die, and the gods begged for mercy. The curse could not be undone, only softened: the Moon would wane for half the month and grow again for the other half.",
          "So, says the story, the Moon visits each wife in turn, spending about a day in each of the 27 nakṣatras — which is exactly what the real Moon does.",
        ],
        fact: 'Shiva wears the crescent Moon in his hair because he sheltered Candra during the curse — the legend behind the Somnāth temple, "Lord of the Moon".',
      },
      {
        id: "eclipse",
        era: "Purāṇic myth",
        kind: "myth",
        title: "The demon who swallowed the Sun",
        dev: "राहु और केतु",
        art: "eclipse",
        body: [
          "When gods and demons churned the ocean of milk for amṛta, the nectar of immortality, Viṣṇu took the form of the enchantress Mohinī to serve it only to the gods. One demon, Svarbhānu, slipped into the line of gods and drank.",
          "The Sun and the Moon saw him and cried out. Viṣṇu's spinning discus cut off his head — but the nectar was already in his throat, so neither part could die. The head became Rāhu, the body became Ketu.",
          "Ever since, Rāhu chases the Sun and the Moon to swallow them. Each time he does, there is an eclipse — and each time they slip out of his cut throat again.",
        ],
        fact: "Rāhu and Ketu are real places: the two points where the Moon's path crosses the Sun's. Eclipses only happen near them, so the myth points at the right spot in the sky.",
      },
      {
        id: "dhruva",
        era: "Purāṇic myth",
        kind: "myth",
        title: "The boy who became the Pole Star",
        dev: "ध्रुव",
        art: "pole",
        body: [
          'Prince Dhruva, only five years old, was pushed off his father\'s lap by his jealous stepmother. "If you want a high seat," she mocked, "ask God for one."',
          "So he did. He went into the forest and meditated so fiercely that the heavens shook. Viṣṇu appeared and granted him the highest, steadiest seat of all — the one point in the sky around which every star turns.",
          'That is Dhruva Tārā, the Pole Star. Dhruva means "fixed, unshakable", and sailors and travellers across India steered by him.',
        ],
        fact: "Because Earth's axis slowly wobbles, the star at the pole changes over thousands of years. Our present Pole Star, Polaris, will be closest to the pole around 2100.",
      },
      {
        id: "saptarishi",
        era: "Vedic tradition",
        kind: "myth",
        title: "The Seven Sages in the sky",
        dev: "सप्तर्षि",
        art: "dipper",
        body: [
          "The seven bright stars the West calls the Big Dipper are, in India, the Saptarṣi — the seven ṛṣis, the great seers who first heard the Vedas: Marīci, Vasiṣṭha, Aṅgiras, Atri, Pulastya, Pulaha and Kratu.",
          "Beside Vasiṣṭha shines a faint star, his wife Arundhatī, famous for her devotion. In many Hindu weddings the couple is still shown Arundhatī at night as a blessing for a faithful marriage.",
          "The ṛṣis were the first astronomers of the story: people who sat still, watched, and remembered.",
        ],
        fact: "Vasiṣṭha and Arundhatī are the real star pair Mizar and Alcor — spotting the faint one has been an eyesight test for centuries.",
      },
    ],
  },
  {
    id: "books",
    title: "III · From stars to books",
    cards: [
      {
        id: "vedanga",
        era: "c. 1400–1200 BCE (traditional dating)",
        kind: "history",
        title: "The first textbook: Vedāṅga Jyotiṣa",
        dev: "वेदाङ्ग ज्योतिष",
        art: "scroll",
        body: [
          "The oldest surviving Indian astronomy text is a short verse handbook attributed to the sage Lagadha. It explains how to keep a five-year calendar of Sun and Moon so that Vedic sacrifices happen at the right moment.",
          'There are no horoscopes in it at all — no signs, no planets ruling people. It is pure timekeeping. Jyotiṣa was one of the six "limbs" (aṅgas) of the Vedas, the eye that lets the ritual see time.',
        ],
        fact: 'Indian tradition calls Jyotiṣa "the eye of the Veda": grammar is its mouth, and astronomy lets it see.',
      },
      {
        id: "parashara",
        era: "Tradition: Vedic age · text: medieval",
        kind: "idea",
        title: "Ṛṣi Parāśara, father of horoscopes",
        dev: "पराशर",
        art: "sage",
        body: [
          "Tradition names the sage Parāśara — grandson of Vasiṣṭha and father of Vyāsa, who compiled the Mahābhārata — as the teacher of horoscope astrology. In the Bṛhat Parāśara Horā Śāstra he answers the questions of his student Maitreya.",
          "Almost everything a Vedic astrologer uses today comes from that book: the twelve houses, the divisional charts, planetary strengths, and the Viṃśottarī daśā — the 120-year cycle of life chapters that Vyom draws for you.",
          "Historians date the text as we have it to many centuries after the Vedas, gathered and re-edited over time — but Parāśara's name is honoured as its source.",
        ],
        fact: "The Viṃśottarī cycle adds up to 120 years because that was taken as the full span of a human life.",
      },
      {
        id: "yavana",
        era: "2nd–3rd century CE",
        kind: "history",
        title: "When India met the Greeks",
        dev: "यवनजातक",
        art: "ship",
        body: [
          'After Alexander\'s armies reached the Indus, trade and ideas flowed between India and the Greek world. In 149–150 CE a scholar called Yavaneśvara ("lord of the Greeks") translated a Greek astrology book into Sanskrit, and in 269 CE Sphujidhvaja turned it into verse: the Yavanajātaka.',
          "That's where the twelve zodiac signs and horoscope charts entered Indian astrology. India joined them to its own far older nakṣatras, and made something new.",
          "You can still hear the Greek in the Sanskrit words: horā (hour) from hōra, kendra (angle) from kentron, jāmitra (the 7th house) from diametron, liptā (arc-minute) from leptón.",
        ],
        fact: "Ideas travelled both ways: Indian numerals — including zero — later went west through the Arab world and became the digits we all use.",
      },
    ],
  },
  {
    id: "science",
    title: "IV · The great astronomers",
    cards: [
      {
        id: "aryabhata",
        era: "499 CE",
        kind: "history",
        title: "Āryabhaṭa: the Earth spins",
        dev: "आर्यभट",
        art: "sky",
        body: [
          "At just 23, Āryabhaṭa wrote the Āryabhaṭīya. He said the stars seem to move because the Earth itself rotates — like a person in a boat who sees the trees on the bank moving backwards.",
          "He explained eclipses as shadows: the Moon in the Earth's shadow, the Sun hidden by the Moon. No demon required. He calculated the length of the year and the value of π with remarkable accuracy.",
        ],
        fact: "India's first satellite, launched in 1975, was named Āryabhaṭa.",
      },
      {
        id: "varahamihira",
        era: "6th century CE · Ujjain",
        kind: "history",
        title: "Varāhamihira and the zero",
        dev: "वराहमिहिर · ब्रह्मगुप्त",
        art: "zero",
        body: [
          'Varāhamihira of Ujjain, one of the "nine gems" of legend, wrote both astronomy and astrology: Bṛhat Jātaka on horoscopes, and Bṛhat Saṃhitā — an encyclopaedia of omens, weather, gems and architecture. His Pañca-siddhāntikā summarised five whole schools of astronomy, two of them Greek-influenced.',
          "A century later, in 628 CE, Brahmagupta wrote down rules for calculating with zero as a number — what you get when you add, subtract or multiply by nothing. That idea changed mathematics for the whole world.",
        ],
        fact: 'Ujjain sat on India\'s "prime meridian" for astronomers, much as Greenwich does today.',
      },
      {
        id: "jantar",
        era: "1724–1735",
        kind: "history",
        title: "Instruments of stone",
        dev: "जंतर मंतर",
        art: "observatory",
        body: [
          "Maharaja Jai Singh II of Jaipur, unhappy with the errors in existing tables, built five giant observatories — in Delhi, Jaipur, Ujjain, Varanasi and Mathura. Their instruments are buildings: stone arcs, bowls and staircases aligned to the sky.",
          "The Samrāṭ Yantra in Jaipur is a sundial 27 metres tall whose shadow moves about 6 cm every minute — readable to around two seconds.",
        ],
        fact: "The Jaipur Jantar Mantar is a UNESCO World Heritage Site.",
      },
    ],
  },
  {
    id: "hand-number",
    title: "V · The hand and the number",
    cards: [
      {
        id: "samudrika",
        era: "Ancient tradition",
        kind: "idea",
        title: "Sāmudrika Śāstra: the body as a map",
        dev: "सामुद्रिक शास्त्र",
        art: "hand",
        body: [
          "Legend says the ocean-god Samudra first read the marks on Viṣṇu's body, and the art took his name. Sāmudrika Śāstra reads face, body and above all the palm — its lines, mounts and marks.",
          'Buddhist texts list 32 marks of a "great person", including wheels on the palms and soles; statues of the Buddha often show them. Palm reading also flourished in China, Greece and Romani tradition, each with its own rules.',
          "Science sees palm lines as folds that form before birth, shaped by how the hand bends. Vyom reads them the way the old books do — as a mirror for reflection, never as fate.",
        ],
      },
      {
        id: "numerology",
        era: "Pythagoras to the present",
        kind: "idea",
        title: "Numbers with personalities",
        dev: "अंक ज्योतिष",
        art: "numbers",
        body: [
          'Around 530 BCE, the Greek Pythagoras taught that "all is number" — that numbers hold the hidden order of the world. Indian thinkers held numbers sacred too: 108 is 27 nakṣatras × 4 quarters, and also 12 signs × 9 planets, which is why a mālā has 108 beads.',
          'Modern Indian numerology — Aṅka Jyotiṣa — joins the two: each digit 1–9 is given to a planet. 1 Sun, 2 Moon, 3 Jupiter, 4 Rāhu, 5 Mercury, 6 Venus, 7 Ketu, 8 Saturn, 9 Mars. You reduce a birth date to a single digit and read that planet\'s "nature".',
          'This form is young — popularised in the late 1800s and 1900s by writers like "Cheiro" — but it borrows its planets from very old Jyotiṣa.',
        ],
        fact: 'Our numerals 0–9 are Indian in origin; Europe called them "Arabic" because it learned them from Arab scholars.',
      },
    ],
  },
  {
    id: "today",
    title: "VI · Today",
    cards: [
      {
        id: "now",
        era: "1955 to now",
        kind: "history",
        title: "An old sky in a new country",
        dev: "पंचांग आज",
        art: "today",
        body: [
          "In 1952 newly independent India asked the physicist Meghnad Saha to tidy its tangle of some thirty local calendars. His committee chose a national calendar (adopted in 1957) and fixed an official ayanāṃśa — the Lahiri value Vyom uses by default.",
          "Today the pañcāṅga still sets the dates of Diwali, Holi, Navarātri and countless family rituals; millions check Rāhu Kāla before signing a lease, and families still compare charts before a wedding.",
          "You don't need to believe any of it to find it beautiful: four thousand years of people looking up, giving the lights names and stories, and trying to fit their lives to the rhythm of the sky.",
        ],
        fact: "Every number Vyom shows is computed fresh on your device, checked against modern ephemerides — the ṛṣis' sky, with today's arithmetic.",
      },
    ],
  },
];

/** Digital root: keep adding digits until one is left (0 stays 0). */
export function digitalRoot(n: number): number {
  const a = Math.abs(Math.trunc(n));
  return a === 0 ? 0 : 1 + ((a - 1) % 9);
}

export const NUMBER_PLANET: Record<number, { planet: string; dev: string; nature: string }> = {
  1: { planet: "Sun", dev: "सूर्य", nature: "leader, independent, proud" },
  2: { planet: "Moon", dev: "चन्द्र", nature: "gentle, imaginative, changeable" },
  3: { planet: "Jupiter", dev: "गुरु", nature: "wise, generous, a teacher" },
  4: { planet: "Rāhu", dev: "राहु", nature: "unconventional, restless, inventive" },
  5: { planet: "Mercury", dev: "बुध", nature: "quick, witty, adaptable" },
  6: { planet: "Venus", dev: "शुक्र", nature: "loving, artistic, comfort-seeking" },
  7: { planet: "Ketu", dev: "केतु", nature: "inward, spiritual, a seeker" },
  8: { planet: "Saturn", dev: "शनि", nature: "patient, serious, hard-working" },
  9: { planet: "Mars", dev: "मंगल", nature: "brave, energetic, direct" },
};

/** Root number (mūlāṅka) from the day of birth; destiny number (bhāgyāṅka) from the whole date. */
export function birthNumbers(y: number, m: number, d: number): { root: number; destiny: number } {
  const digits = `${y}${m}${d}`.split("").reduce((s, c) => s + Number(c), 0);
  return { root: digitalRoot(d), destiny: digitalRoot(digits) };
}
