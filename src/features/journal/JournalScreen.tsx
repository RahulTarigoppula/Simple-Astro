// "Your days": one tap a day to say how the day really went, and an honest picture over time of how
// the days felt beside what the sky had said. The band is the record itself: the last weeks as a grid
// of days, each a dot whose fill is the person's word and whose ring is the sky's. A mirror, not a test.
import { motion, useReducedMotion } from "motion/react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { useActiveProfile, useHere, useJournal, useProfiles, useSettings } from "../../app/hooks";
import { useNowMs } from "../../app/useNow";
import { Reveal } from "../../components/ui/Motion";
import { Page, Section } from "../../components/ui/Page";
import { Sheet } from "../../components/ui/Sheet";
import { JOURNAL_NOTE_MAX, type JournalMood, type JournalRow } from "../../data/db";
import { deleteJournalEntry, saveJournalEntry } from "../../data/repo";
import type { Profile } from "../../engine/types";
import { DayDot, Face, MoodPicker, predictDay, saidLine } from "./JournalParts";
import { JournalPrompt } from "./JournalPrompt";
import {
  byMonth,
  dayKey,
  dayLabel,
  exportText,
  type GridCell,
  gridWeeks,
  headline,
  MIN_FOR_PATTERN,
  moodWord,
  skyWord,
  subline,
  summarize,
  weeksToShow,
} from "./logic";
import "./journal.css";

/** How many days of the newest month are listed before the fold. */
const OPEN_ROWS = 7;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const longDay = (day: string) => dayLabel(day, { weekday: "long", day: "numeric", month: "long" });

/** The record as a picture: whole weeks, Monday first, newest at the bottom. */
function DayGrid({ weeks, onOpen }: { weeks: GridCell[][]; onOpen: (day: string) => void }) {
  const still = useReducedMotion();
  return (
    <div className="jr-grid">
      <div className="jr-grid__head" aria-hidden="true">
        {WEEKDAYS.map((w) => (
          <span key={w}>{w[0]}</span>
        ))}
      </div>
      {weeks.map((week, w) => (
        <ul
          key={week[0]?.day}
          className="jr-grid__week"
          aria-label={`Week of ${dayLabel(week[0]?.day ?? "", { day: "numeric", month: "long" })}`}
        >
          {week.map((c, i) => {
            const d = Number(c.day.slice(8));
            if (c.future)
              return (
                <li key={c.day} className="jr-cell jr-cell--future" aria-hidden="true">
                  <span className="jr-cell__n">{d}</span>
                </li>
              );
            const e = c.entry;
            const label = `${longDay(c.day)}${c.today ? ", today" : ""}. ${e ? saidLine(e.mood, e.predictedTone) : "Not noted. Tap to note it."}`;
            return (
              <li key={c.day} className="jr-cell" data-today={c.today || undefined}>
                <button type="button" aria-label={label} onClick={() => onOpen(c.day)}>
                  <motion.span
                    className="jr-cell__dot"
                    initial={still ? false : { opacity: 0, scale: 0.5 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.15 + (w * 7 + i) * 0.014 }}
                  >
                    {e ? <DayDot mood={e.mood} tone={e.predictedTone} /> : <i className="jr-cell__none" />}
                  </motion.span>
                  <span className="jr-cell__n">{d}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ))}
    </div>
  );
}

function Legend() {
  return (
    <ul className="jr-legend" aria-label="How to read the picture">
      <li>
        <DayDot mood={4} tone="bright" size={26} />
        <span>
          Inside, with the face: <b>what you said</b>
        </span>
      </li>
      <li>
        <svg className="jr-dot" width="26" height="26" viewBox="0 0 36 36" data-tone="bright" aria-hidden="true">
          <circle className="jr-dot__ring" cx="18" cy="18" r="15.5" data-half="upper" />
        </svg>
        <span>
          Whole ring: <b>the sky said Strong or Good</b>
        </span>
      </li>
      <li>
        <svg className="jr-dot" width="26" height="26" viewBox="0 0 36 36" data-tone="testing" aria-hidden="true">
          <circle className="jr-dot__ring" cx="18" cy="18" r="15.5" data-half="lower" />
        </svg>
        <span>
          Broken ring: <b>the sky said Mixed or Go gently</b>
        </span>
      </li>
    </ul>
  );
}

/** Note, change or delete one day, in a sheet. */
function DayEditor({
  profile,
  day,
  entry,
  zone,
  onClose,
}: {
  profile: Profile;
  day: string;
  entry: JournalRow | null;
  zone: string;
  onClose: () => void;
}) {
  const settings = useSettings();
  const { lat, lon } = useHere(profile);
  const [mood, setMood] = useState<JournalMood | null>(entry?.mood ?? null);
  const [note, setNote] = useState(entry?.note ?? "");
  const [busy, setBusy] = useState(false);
  const sky = skyWord(entry?.predictedTone ?? null);

  const save = async () => {
    if (!mood || busy) return;
    setBusy(true);
    try {
      // The sky's word is read once, when the day is first noted; an edit never changes it.
      const said = entry?.predictedTone ? null : await predictDay(profile, settings.preset, { lat, lon }, zone, day);
      await saveJournalEntry({
        profileId: profile.id,
        day,
        mood,
        note,
        ...(said ? { predictedTone: said.tone, predictedScore: said.score } : {}),
      });
      onClose();
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="jr-edit"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <h2 className="jr-edit__h">{longDay(day)}</h2>
      <p className="jr-edit__sky">{sky ? `The sky said ${sky}.` : "How did this day go?"}</p>
      <MoodPicker label={`How did ${longDay(day)} go?`} value={mood} onPick={setMood} />
      <label className="v-label" htmlFor="jr-edit-note">
        A few words <span className="v-muted">(optional, only on this device)</span>
      </label>
      <textarea
        id="jr-edit-note"
        className="jr-note__area"
        rows={3}
        maxLength={JOURNAL_NOTE_MAX}
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />
      <div className="v-actions jr-edit__actions">
        <button type="submit" className="v-btn" disabled={!mood || busy}>
          Save
        </button>
        {entry ? (
          <button
            type="button"
            className="v-btn v-btn--danger"
            onClick={() => {
              void deleteJournalEntry(profile.id, day).then(onClose);
            }}
          >
            Delete this day
          </button>
        ) : null}
        <button type="button" className="v-btn v-btn--quiet" onClick={onClose}>
          Cancel
        </button>
      </div>
    </form>
  );
}

function EntryRow({ e, onOpen }: { e: JournalRow; onOpen: () => void }) {
  const sky = skyWord(e.predictedTone);
  return (
    <button
      type="button"
      className="v-row jr-row"
      onClick={onOpen}
      aria-label={`${longDay(e.day)}. ${saidLine(e.mood, e.predictedTone)} Change or delete.`}
    >
      <span className="jr-row__dot">
        <DayDot mood={e.mood} tone={e.predictedTone} size={40} />
      </span>
      <span className="v-row__body">
        <span className="jr-row__date">{dayLabel(e.day)}</span>
        <span className="v-row__t">You said {moodWord(e.mood)}</span>
        {sky ? <span className="jr-row__sky">The sky said {sky}</span> : null}
        {e.note ? <span className="jr-row__note">{e.note}</span> : null}
      </span>
    </button>
  );
}

function NoOne() {
  return (
    <Page label="Your days" title="Your days" back>
      <section className="v-card v-empty" aria-labelledby="jr-none-h">
        <span className="v-empty__art" aria-hidden="true">
          <Face mood={3} />
        </span>
        <h2 id="jr-none-h" className="v-card__title">
          One tap a day: how did it really go?
        </h2>
        <p className="v-muted">
          Vyomaphala keeps your answer beside what the sky had said, so over the weeks you can see for yourself how the two sit together.
          Add your birth details first.
        </p>
        <Link to="/leaf/new" className="v-btn">
          Add your birth details
        </Link>
      </section>
    </Page>
  );
}

export default function JournalScreen() {
  const { id } = useParams();
  const profiles = useProfiles();
  const active = useActiveProfile();
  const profile = (id ? profiles?.find((p) => p.id === id) : active) ?? active;
  const entries = useJournal(profile?.id);
  const { zone } = useHere(profile);
  const nowMs = useNowMs(60_000);
  const [open, setOpen] = useState<string | null>(null);
  const [copied, setCopied] = useState<"" | "done" | "failed">("");

  if (profiles === undefined) return <Page label="Your days">{null}</Page>;
  if (!profile) return <NoOne />;

  const today = dayKey(nowMs, zone);
  const list = entries ?? [];
  const sum = summarize(list);
  const weeks = gridWeeks(today, weeksToShow(today, list), list);
  const months = byMonth(list);
  // The newest month's latest days stay open; everything before them is folded away.
  const first = months[0];
  const recent = first ? [{ ...first, rows: first.rows.slice(0, OPEN_ROWS) }] : [];
  const rest = first && first.rows.length > OPEN_ROWS ? [{ ...first, rows: first.rows.slice(OPEN_ROWS) }] : [];
  const older = [...rest, ...months.slice(1)];
  const olderCount = older.reduce((n, m) => n + m.rows.length, 0);
  const empty = entries !== undefined && list.length === 0;
  const sub = subline(sum);

  const hero = (
    <section className="jr-hero" aria-labelledby="jr-h">
      <div className="jr-hero__words">
        <p className="jr-hero__eyebrow">{profile.name}'s days</p>
        <h1 id="jr-h" className="jr-hero__answer">
          {headline(sum)}
        </h1>
        {empty ? (
          <p className="jr-hero__line">
            Each evening, say in one tap how the day really went. Vyomaphala keeps it beside what the sky had said, so in a few weeks you
            can see for yourself how the two sit together.
          </p>
        ) : sub ? (
          <p className="jr-hero__line">{sub}</p>
        ) : null}
      </div>
      <div className="jr-hero__pic">
        <DayGrid weeks={weeks} onOpen={setOpen} />
        <Legend />
      </div>
    </section>
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(exportText(profile.name, list));
      setCopied("done");
    } catch {
      setCopied("failed");
    }
  };

  return (
    <Page label="Your days" wide back className="journal" hero={hero} sky="night">
      <Reveal i={0}>
        <JournalPrompt profile={profile} zone={zone} nowMs={nowMs} always />
      </Reveal>

      {recent.map((m, i) => (
        <Reveal key={m.month} i={1 + i} className="v-stack">
          <Section title={m.label} note={i === 0 ? "Tap a day to change its word, add a note, or delete it." : undefined} />
          <ul className="v-list">
            {m.rows.map((e) => (
              <li key={e.day}>
                <EntryRow e={e} onOpen={() => setOpen(e.day)} />
              </li>
            ))}
          </ul>
        </Reveal>
      ))}

      {older.length ? (
        <details className="v-fold">
          <summary>
            <span>
              Earlier days
              <span className="v-fold__s">
                {olderCount} more {olderCount === 1 ? "day" : "days"}
              </span>
            </span>
          </summary>
          <div className="v-fold__body jr-older">
            {older.map((m) => (
              <div key={m.month}>
                <h3 className="jr-older__h">{m.label}</h3>
                <ul className="jr-older__list">
                  {m.rows.map((e) => (
                    <li key={e.day}>
                      <EntryRow e={e} onOpen={() => setOpen(e.day)} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </details>
      ) : null}

      <details className="v-fold">
        <summary>
          <span>
            How to read this
            <span className="v-fold__s">What "agreed" means, and where your notes are kept</span>
          </span>
        </summary>
        <div className="v-fold__body">
          <p>
            A day counts as <b>agreed</b> when you and the sky fall on the same side: the sky said Strong or Good and you said Great or
            Good, or the sky said Mixed or Go gently and you said Mixed or Hard. Nothing is counted until {MIN_FOR_PATTERN} days are noted.
          </p>
          <p>
            The sky's word is the one Vyomaphala showed for that day when you noted it. It is kept as it was, so the picture never changes
            behind your back.
          </p>
          <p>
            This is a mirror for reflection. A count of days is not proof for or against anything; tradition reads the sky, and you are the
            one who lived the day.
          </p>
          <p>Your days are kept only on this device, and travel inside your own encrypted backup. Deleting a person deletes their days.</p>
          {list.length ? (
            <div className="v-actions">
              <button type="button" className="v-btn v-btn--sm v-btn--ghost" onClick={() => void copy()}>
                Copy my notes as text
              </button>
              <span className="v-small v-muted" role="status">
                {copied === "done" ? "Copied." : copied === "failed" ? "Could not copy on this device." : ""}
              </span>
            </div>
          ) : null}
        </div>
      </details>

      <p className="v-foot">A traditional reading for reflection, never a prediction or advice.</p>

      <Sheet open={open !== null} onClose={() => setOpen(null)} label={open ? `Your day, ${longDay(open)}` : "Your day"}>
        {open ? (
          <DayEditor
            key={open}
            profile={profile}
            day={open}
            entry={list.find((e) => e.day === open) ?? null}
            zone={zone}
            onClose={() => setOpen(null)}
          />
        ) : null}
      </Sheet>
    </Page>
  );
}
