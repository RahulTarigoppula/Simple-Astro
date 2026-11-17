// The one-tap question: "How did today go?" A small card for the home screen (and the journal's own
// first block). One tap saves; then a thank-you, what the sky had said, an optional note, and Undo.
// It never nags: answered, it is one quiet line; "Not today" hides it for the rest of the day.
import { useState } from "react";
import { Link } from "react-router";
import { useHere, useJournal, useSettings } from "../../app/hooks";
import { ChevronRight } from "../../components/ui/Page";
import { JOURNAL_NOTE_MAX, type JournalMood, type JournalTone } from "../../data/db";
import { deleteJournalEntry, saveJournalEntry } from "../../data/repo";
import type { Profile } from "../../engine/types";
import { Face, MoodPicker, predictDay } from "./JournalParts";
import { dayKey, isSkipped, moodWord, promptState, setSkipped, skyWord } from "./logic";
import "./journal.css";

export interface JournalPromptProps {
  profile: Profile;
  /** The reader's zone (the same one the home screen uses for "today"). */
  zone: string;
  nowMs: number;
  /** Today's predicted tone and score (−1 … +1), as shown on the home screen. Null or omitted: read here. */
  tone?: JournalTone | null;
  score?: number | null;
  /** Inside the journal itself: always ask about today while it is not noted, no "Not today", no link. */
  always?: boolean;
}

export function JournalPrompt({ profile, zone, nowMs, tone = null, score = null, always = false }: JournalPromptProps) {
  const entries = useJournal(profile.id);
  const settings = useSettings();
  const { lat, lon } = useHere(profile);
  const today = dayKey(nowMs, zone);
  const [fresh, setFresh] = useState<string | null>(null); // the day answered in this sitting
  const [busy, setBusy] = useState(false);
  const [noting, setNoting] = useState(false);
  const [note, setNote] = useState("");
  const [skipped, setSkippedState] = useState(() => isSkipped(profile.id, today));
  const [seen, setSeen] = useState(`${profile.id}|${today}`);
  if (seen !== `${profile.id}|${today}`) {
    // another person, or midnight passed: start again
    setSeen(`${profile.id}|${today}`);
    setFresh(null);
    setNoting(false);
    setNote("");
    setSkippedState(isSkipped(profile.id, today));
  }

  if (entries === undefined) return null;
  const find = (day: string) => entries.find((e) => e.day === day);
  const state =
    always && !find(today) ? ({ kind: "ask", which: "today", day: today } as const) : promptState(nowMs, zone, (d) => Boolean(find(d)));
  const freshEntry = fresh ? find(fresh) : undefined;

  const pick = async (mood: JournalMood) => {
    if (state.kind !== "ask" || busy) return;
    setBusy(true);
    try {
      // Today's word comes from the home screen; any other day (or no word given) is read here, now.
      const said =
        state.which === "today" && tone ? { tone, score } : await predictDay(profile, settings.preset, { lat, lon }, zone, state.day);
      await saveJournalEntry({ profileId: profile.id, day: state.day, mood, predictedTone: said.tone, predictedScore: said.score });
      setFresh(state.day);
    } finally {
      setBusy(false);
    }
  };

  // Just answered: thanks, the two words side by side, a note if they like, and a way back.
  if (fresh && freshEntry) {
    const sky = skyWord(freshEntry.predictedTone);
    return (
      <section className="v-card jr-prompt" aria-label="Your day, noted">
        <p className="jr-prompt__thanks">
          <span className="jr-prompt__face" data-mood={freshEntry.mood}>
            <Face mood={freshEntry.mood} size={28} />
          </span>
          <span>
            <b>Thank you. Noted.</b> {sky ? `The sky said ${sky}. ` : ""}You said {moodWord(freshEntry.mood)}.
          </span>
        </p>
        {noting ? (
          <form
            className="jr-note"
            onSubmit={(e) => {
              e.preventDefault();
              void saveJournalEntry({ profileId: profile.id, day: freshEntry.day, mood: freshEntry.mood, note }).then(() =>
                setNoting(false),
              );
            }}
          >
            <label className="v-label" htmlFor={`jr-note-${profile.id}`}>
              A few words about the day <span className="v-muted">(only on this device)</span>
            </label>
            <textarea
              id={`jr-note-${profile.id}`}
              className="jr-note__area"
              rows={3}
              maxLength={JOURNAL_NOTE_MAX}
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <div className="v-actions">
              <button type="submit" className="v-btn v-btn--sm">
                Save note
              </button>
              <button type="button" className="v-btn v-btn--sm v-btn--quiet" onClick={() => setNoting(false)}>
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <>
            {freshEntry.note ? <p className="jr-prompt__note">{freshEntry.note}</p> : null}
            <div className="jr-prompt__after">
              <button
                type="button"
                className="v-link"
                onClick={() => {
                  setNote(freshEntry.note ?? "");
                  setNoting(true);
                }}
              >
                {freshEntry.note ? "Edit note" : "Add a note"}
              </button>
              <button
                type="button"
                className="v-link"
                onClick={() => {
                  void deleteJournalEntry(profile.id, freshEntry.day);
                  setFresh(null);
                  setNote("");
                }}
              >
                Undo
              </button>
              {always ? null : (
                <Link to={`/journal/${profile.id}`} className="v-link jr-prompt__open">
                  Your days <ChevronRight size={16} />
                </Link>
              )}
            </div>
          </>
        )}
      </section>
    );
  }

  if (state.kind === "done") {
    if (always) return null;
    const e = find(state.day);
    if (!e) return null;
    return (
      <Link
        to={`/journal/${profile.id}`}
        className="jr-quiet"
        aria-label={`Your days. ${state.which === "today" ? "Today" : "Yesterday"} you said ${moodWord(e.mood)}.`}
      >
        <span className="jr-prompt__face" data-mood={e.mood}>
          <Face mood={e.mood} size={22} />
        </span>
        <span className="jr-quiet__t">
          {state.which === "today" ? "Today" : "Yesterday"} you said {moodWord(e.mood)}.
        </span>
        <span className="jr-quiet__go">
          Your days <ChevronRight size={16} />
        </span>
      </Link>
    );
  }

  if (skipped && !always) return null;
  const question = state.which === "today" ? "How did today go?" : "How did yesterday go?";
  const hid = `jr-q-${profile.id}`;
  return (
    <section className="v-card jr-prompt" aria-labelledby={hid}>
      <div className="jr-prompt__head">
        <h2 id={hid} className="jr-prompt__q">
          {question}
        </h2>
        {always ? null : (
          <button
            type="button"
            className="v-link jr-prompt__skip"
            onClick={() => {
              setSkipped(profile.id, today);
              setSkippedState(true);
            }}
          >
            Not today
          </button>
        )}
      </div>
      <p className="jr-prompt__sub">One tap, in your own word. It stays on this device.</p>
      <MoodPicker label={question} busy={busy} onPick={(m) => void pick(m)} />
    </section>
  );
}

export default JournalPrompt;
