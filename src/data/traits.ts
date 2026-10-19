// Plain-word traits for the simple reading: what tradition says about a Moon sign (rāśi), a birth star
// (nakṣatra), a birth-date number and a life chapter (daśā). These are traditional readings, gently
// worded, not facts about anyone. Moon-sign traits follow the common Jyotiṣa descriptions of the Moon in
// each sign (Bṛhat Parāśara Horā Śāstra, Phaladīpikā); birth-star traits follow Varāhamihira's
// Bṛhat Saṃhitā, softened where the old wording is harsh; numbers follow the usual Indian (Chaldean)
// numerology. Every string here is shown to people, so: short sentences, no jargon, no dashes.
import type { GrahaId } from "../engine/types";

export interface Traits {
  /** One sentence, second person. */
  plain: string;
  plus: readonly string[];
  minus: readonly string[];
}

export interface MoonTraits extends Traits {
  love: string;
  work: string;
}

/** By sidereal sign, Meṣa (0) to Mīna (11). */
export const MOON_TRAITS: readonly MoonTraits[] = [
  {
    plain: "You feel things fast and act on them. You like to go first.",
    plus: ["Brave and quick to start", "Honest and direct", "Bounces back quickly"],
    minus: ["Impatient", "Quick temper that cools just as fast"],
    love: "Passionate and loyal. You need a partner who can keep up and doesn't sulk.",
    work: "Best where you can lead, start things and move fast.",
  },
  {
    plain: "You are calm and steady inside. You value comfort, good food and people you can trust.",
    plus: ["Patient and dependable", "Loyal for life", "Good taste and a feel for money"],
    minus: ["Stubborn once your mind is made up", "Slow to accept change"],
    love: "Devoted and affectionate. Once you commit, you stay.",
    work: "Good with money, land, food, art and anything that needs patience.",
  },
  {
    plain: "Your mind is always busy. You love ideas, talk, people and learning new things.",
    plus: ["Curious and quick to learn", "Witty and easy to talk to", "Adapts to anything"],
    minus: ["Restless and easily bored", "Can overthink and worry"],
    love: "You need a partner who is also a friend you can talk to for hours.",
    work: "Writing, teaching, sales, media and any job with variety.",
  },
  {
    plain: "You feel deeply and care for others. Home and family mean the world to you.",
    plus: ["Kind and caring", "Strong memory and intuition", "Protective of the people you love"],
    minus: ["Moods that rise and fall like the tide", "Takes things to heart"],
    love: "Tender and nurturing. You need to feel safe and wanted.",
    work: "Caring roles: food, healing, teaching, home and family business.",
  },
  {
    plain: "You have a big heart and a strong sense of pride. You like to shine and to be respected.",
    plus: ["Generous and warm", "A natural leader", "Confident and loyal"],
    minus: ["Pride gets hurt easily", "Can want to be in control"],
    love: "Warm and generous. You need to feel admired and appreciated.",
    work: "Leading, managing, government and anywhere you can be seen.",
  },
  {
    plain: "You notice details others miss. You like order, being useful and doing things well.",
    plus: ["Sharp and practical", "Helpful and hard-working", "Good with words and numbers"],
    minus: ["Too critical, of yourself most of all", "Worries over small things"],
    love: "You show love by doing things for people. You need a partner who notices.",
    work: "Analysis, accounts, health, editing and any careful craft.",
  },
  {
    plain: "You want fairness and harmony. You see both sides and bring people together.",
    plus: ["Charming and diplomatic", "A strong sense of fairness", "Eye for beauty"],
    minus: ["Hard time making decisions", "Avoids conflict too long"],
    love: "Partnership is central to your life. You give a lot to keep the peace.",
    work: "Law, design, trade, counselling and any job dealing with people.",
  },
  {
    plain: "You feel everything intensely, even if you don't show it. You are private and very determined.",
    plus: ["Deep and loyal", "Strong willpower", "Sees through people"],
    minus: ["Holds on to hurt", "Can be secretive or jealous"],
    love: "All or nothing. Trust takes time, but once given it runs deep.",
    work: "Research, medicine, investigation, finance and anything hidden or deep.",
  },
  {
    plain: "You are hopeful and open. You care about truth, learning and the bigger picture.",
    plus: ["Optimistic and honest", "Loves learning and travel", "Strong values"],
    minus: ["Blunt to the point of hurting", "Restless with routine"],
    love: "You need freedom and a partner who shares your values.",
    work: "Teaching, law, religion, travel, publishing and advice.",
  },
  {
    plain: "You are serious and patient. You work steadily towards long goals and keep your feelings in check.",
    plus: ["Disciplined and responsible", "Practical and ambitious", "Gets better with age"],
    minus: ["Can seem cold or reserved", "Worries about the future"],
    love: "Slow to open up, but steady and responsible once committed.",
    work: "Management, engineering, government and building things that last.",
  },
  {
    plain: "You think for yourself. You care about friends, causes and people in general.",
    plus: ["Original and inventive", "Humane and fair-minded", "A loyal friend"],
    minus: ["Can seem detached", "Stubborn about your ideas"],
    love: "You need a partner who is also your best friend, and space to be yourself.",
    work: "Science, technology, social work and groups.",
  },
  {
    plain: "You are gentle and imaginative. You feel what others feel and are drawn to the spiritual.",
    plus: ["Compassionate", "Creative and intuitive", "Forgiving"],
    minus: ["Easily hurt or overwhelmed", "Can drift or avoid hard facts"],
    love: "Romantic and selfless. You need someone kind who keeps you grounded.",
    work: "Arts, music, healing, charity and spiritual work.",
  },
];

/** By nakṣatra, Aśvinī (0) to Revatī (26). */
export const NAK_TRAITS: readonly Traits[] = [
  {
    plain: "Quick, lively and good at healing or fixing things.",
    plus: ["Good-looking and liked", "Skilful", "Fast to act"],
    minus: ["Rushes in"],
  },
  {
    plain: "Determined and truthful. You carry heavy things others can't.",
    plus: ["Strong-willed", "Truthful", "Strong"],
    minus: ["Can go to extremes"],
  },
  {
    plain: "Bright and sharp, like a flame. You cut through to what is true.",
    plus: ["Brilliant", "Courageous", "Makes a name"],
    minus: ["Sharp tongue"],
  },
  {
    plain: "Charming and steady. People are drawn to you.",
    plus: ["Sweet-spoken", "Truthful", "Attractive and steady"],
    minus: ["Can be possessive"],
  },
  {
    plain: "Curious and searching, always looking for the next thing.",
    plus: ["Clever", "Eloquent", "Enthusiastic"],
    minus: ["Fickle", "A little timid"],
  },
  {
    plain: "Intense and questioning. Storms clear the air, and so do you.",
    plus: ["Sharp mind", "Hard-working"],
    minus: ["Can be proud or blunt"],
  },
  {
    plain: "Content and kind. You come back from setbacks like returning light.",
    plus: ["Self-controlled", "Good-natured", "Happy with little"],
    minus: ["Can be slow to act"],
  },
  {
    plain: "Calm and nourishing. The most auspicious of the stars, tradition says.",
    plus: ["Learned", "Calm", "Generous"],
    minus: ["Can be rigid"],
  },
  { plain: "Shrewd and perceptive. You read people well.", plus: ["Clever with words", "Perceptive"], minus: ["Can be secretive"] },
  {
    plain: "Dignified and proud of your roots. You respect elders and tradition.",
    plus: ["Enterprising", "Devoted to family", "Natural authority"],
    minus: ["Proud"],
  },
  {
    plain: "Warm and pleasure-loving. You enjoy life and share it.",
    plus: ["Sweet-spoken", "Generous", "Creative"],
    minus: ["Can be restless"],
  },
  {
    plain: "Kind and dependable. You earn through what you learn.",
    plus: ["Popular", "Helpful", "Comfortable in life"],
    minus: ["Takes on too much"],
  },
  {
    plain: "Skilful with your hands and clever at getting things done.",
    plus: ["Resourceful", "Hard-working", "Practical"],
    minus: ["Can be restless"],
  },
  {
    plain: "Creative and stylish. You like to make beautiful things.",
    plus: ["Artistic", "Attractive", "Good taste"],
    minus: ["Can be vain"],
  },
  {
    plain: "Independent and gentle, moving like the wind.",
    plus: ["Kind", "Good at trade", "Self-controlled"],
    minus: ["Can be indecisive"],
  },
  {
    plain: "Goal-driven. You keep going until you reach what you set out for.",
    plus: ["Bright", "Sweet speech", "Ambitious"],
    minus: ["Can be jealous or quarrelsome"],
  },
  {
    plain: "Devoted and friendly. You do well far from home.",
    plus: ["Loyal friend", "Hard-working", "Prospers away from home"],
    minus: ["Restless"],
  },
  {
    plain: "Protective and capable, like an eldest child.",
    plus: ["Responsible", "Content", "Virtuous"],
    minus: ["Quick to anger", "Few close friends"],
  },
  {
    plain: "You go to the root of things and are not afraid to start again.",
    plus: ["Steady", "Kind", "Comfortable in life"],
    minus: ["Can be proud"],
  },
  { plain: "Hard to defeat. You believe in yourself.", plus: ["Firm friend", "Confident", "Persuasive"], minus: ["Proud"] },
  {
    plain: "Patient and principled. Your wins come late but they last.",
    plus: ["Humble", "Grateful", "Many friends"],
    minus: ["Can be too serious"],
  },
  {
    plain: "A good listener who learns by hearing. Knowledge brings you respect.",
    plus: ["Learned", "Well-known", "Good spouse"],
    minus: ["Can be strict"],
  },
  {
    plain: "Generous and musical. You do well in groups.",
    plus: ["Brave", "Generous", "Loves music"],
    minus: ["Can be careless with money"],
  },
  {
    plain: "Truthful and independent, a healer at heart.",
    plus: ["Honest", "Overcomes rivals", "Adventurous"],
    minus: ["Harsh in speech", "Keeps to yourself"],
  },
  {
    plain: "Intense and idealistic, with a clever way with words.",
    plus: ["Good speaker", "Clever", "Idealistic"],
    minus: ["Worries", "Careful with money to a fault"],
  },
  {
    plain: "Wise and steady. You keep your calm in hard times.",
    plus: ["Good speaker", "Happy family life", "Overcomes rivals"],
    minus: ["Can be slow to act"],
  },
  { plain: "Gentle and caring, a guide for others on their way.", plus: ["Popular", "Brave", "Clean and kind"], minus: ["Too trusting"] },
];

/** Root (birth day) numbers 1 to 9. */
export const NUMBER_TRAITS: Readonly<Record<number, { word: string } & Traits>> = {
  1: { word: "the leader", plain: "Independent and original.", plus: ["Leads", "Self-made"], minus: ["Proud", "Hates taking orders"] },
  2: {
    word: "the peacemaker",
    plain: "Gentle, imaginative, a good partner.",
    plus: ["Diplomatic", "Caring"],
    minus: ["Sensitive", "Indecisive"],
  },
  3: { word: "the teacher", plain: "Wise, generous and disciplined.", plus: ["Wise", "Generous"], minus: ["Bossy"] },
  4: {
    word: "the rebel",
    plain: "Unconventional and inventive.",
    plus: ["Inventive", "Hard-working"],
    minus: ["Restless", "Goes against the grain"],
  },
  5: {
    word: "the communicator",
    plain: "Quick, witty and adaptable.",
    plus: ["Quick learner", "Good with people"],
    minus: ["Impatient", "Easily bored"],
  },
  6: { word: "the lover", plain: "Warm, artistic, makes a home.", plus: ["Loving", "Artistic"], minus: ["Wants comfort too much"] },
  7: {
    word: "the seeker",
    plain: "Inward, intuitive and spiritual.",
    plus: ["Intuitive", "Deep thinker"],
    minus: ["Withdrawn", "Hard to know"],
  },
  8: {
    word: "the builder",
    plain: "Patient, serious and enduring.",
    plus: ["Patient", "Builds slowly and well"],
    minus: ["Delays", "Works too hard"],
  },
  9: { word: "the warrior", plain: "Brave, energetic and direct.", plus: ["Courageous", "Energetic"], minus: ["Quick temper"] },
};

/** What a life chapter (Viṃśottarī mahādaśā) of each graha is traditionally about, in plain words. */
/** The theme of a shorter daśā stretch, as a noun phrase: "a Moon stretch brings the heart and home to the front". */
export const CHAPTER_SHORT: Readonly<Record<GrahaId, string>> = {
  SU: "standing on your own feet",
  MO: "the heart and home",
  MA: "energy and effort",
  ME: "learning and trade",
  JU: "growth and good fortune",
  VE: "comfort and love",
  SA: "hard work and patience",
  RA: "ambition and change",
  KE: "letting go and the inner life",
};

export const CHAPTER_PLAIN: Readonly<Record<GrahaId, string>> = {
  SU: "a chapter about standing on your own feet: recognition, authority, your father and your own strength.",
  MO: "a chapter about the heart: home, mother, feelings, the public and peace of mind.",
  MA: "a chapter of energy and effort: courage, property, siblings and getting things done.",
  ME: "a chapter of learning and trade: study, business, writing, friends and clever work.",
  JU: "a chapter of growth: wisdom, teachers, children, faith and good fortune.",
  VE: "a chapter of comfort and love: relationships, marriage, beauty, art and the good things in life.",
  SA: "a chapter of hard work and patience: duty, discipline and slow but lasting results.",
  RA: "a chapter of ambition and change: big wants, new places, the unusual and the unexpected.",
  KE: "a chapter of letting go: inner life, spirituality, research and finding what really matters.",
};
