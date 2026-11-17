// Small drawn pieces shared by the home card and the journal screen: the four faces, the row of four
// choices, the day dot (fill = what the person said, ring = what the sky said), and reading the sky's
// word for a day at the moment an entry is made.
import type { JournalMood, JournalTone } from "../../data/db";
import { castPatri } from "../../data/repo";
import { forecast } from "../../engine/forecast";
import { safeZone } from "../../engine/time";
import type { EnginePreset, Profile } from "../../engine/types";
import { MOODS, moodWord, noonMs, skyUpper, skyWord } from "./logic";

const MOUTH: Record<JournalMood, string> = {
  4: "M9.5 17.5 Q16 26 22.5 17.5",
  3: "M11 19.5 Q16 23.5 21 19.5",
  2: "M11 21 H21",
  1: "M11 22.5 Q16 17.5 21 22.5",
};

/** A simple drawn face for one of the four words. Decorative: the word is always beside it. */
export function Face({ mood, size = 32 }: { mood: JournalMood; size?: number }) {
  return (
    <svg
      className="jr-face"
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="16" cy="16" r="13" />
      <circle cx="11.5" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="20.5" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <path d={MOUTH[mood]} />
    </svg>
  );
}

/** Four large choices. One tap answers. */
export function MoodPicker({
  label,
  value,
  busy,
  onPick,
}: {
  label: string;
  value?: JournalMood | null;
  busy?: boolean;
  onPick: (mood: JournalMood) => void;
}) {
  return (
    <div className="jr-pick" role="group" aria-label={label}>
      {MOODS.map(({ mood, word }) => (
        <button
          key={mood}
          type="button"
          className="jr-pick__one"
          data-mood={mood}
          aria-pressed={value == null ? undefined : value === mood}
          disabled={busy}
          onClick={() => onPick(mood)}
        >
          <Face mood={mood} />
          <span>{word}</span>
        </button>
      ))}
    </div>
  );
}

/**
 * One day as a dot. The filled disc with its face is what the person said; the ring around it is what
 * the sky said (a whole ring for Strong or Good, a broken ring for Mixed or Go gently).
 */
export function DayDot({ mood, tone, size = 36 }: { mood: JournalMood; tone: JournalTone | null; size?: number }) {
  return (
    <svg
      className="jr-dot"
      width={size}
      height={size}
      viewBox="0 0 36 36"
      data-mood={mood}
      data-tone={tone ?? undefined}
      aria-hidden="true"
    >
      {tone ? <circle className="jr-dot__ring" cx="18" cy="18" r="15.5" data-half={skyUpper(tone) ? "upper" : "lower"} /> : null}
      <circle className="jr-dot__fill" cx="18" cy="18" r="11" />
      <g className="jr-dot__face" transform="translate(6.5 6.5) scale(0.72)">
        <circle cx="11.5" cy="13.5" r="1.6" />
        <circle cx="20.5" cy="13.5" r="1.6" />
        <path d={MOUTH[mood]} />
      </g>
    </svg>
  );
}

/** "You said Good. The sky said Strong." as one spoken label. */
export function saidLine(mood: JournalMood, tone: JournalTone | null): string {
  const sky = skyWord(tone);
  return sky ? `You said ${moodWord(mood)}. The sky said ${sky}.` : `You said ${moodWord(mood)}.`;
}

export interface Prediction {
  tone: JournalTone | null;
  score: number | null;
}

/**
 * What the app says for one civil day, read the way the home screen reads today: the day forecast at
 * local noon, for the place the reader is in. Nulls when the day cannot be read; never throws.
 */
export async function predictDay(
  profile: Profile,
  preset: EnginePreset,
  place: { lat: number; lon: number },
  zone: string,
  day: string,
): Promise<Prediction> {
  try {
    const patri = await castPatri(profile, preset);
    const f = forecast(patri, "day", noonMs(day, zone), safeZone(zone), preset, place);
    return { tone: f.tone, score: f.score };
  } catch {
    return { tone: null, score: null };
  }
}
