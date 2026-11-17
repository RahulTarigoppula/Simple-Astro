// "Is today good for…?": one tap on what you have in mind, one plain answer for today, and the way
// to the better days when today is not the one.
import { useMemo, useState } from "react";
import { Link } from "react-router";
import { ChevronRight } from "../../components/ui/Page";
import { ACTIVITIES, type ActivityId, daySky, type PickDay, personOf, scoreDay } from "../../engine/pickday";
import type { EnginePreset, Patri } from "../../engine/types";
import { span12, TONE_WORD } from "../forecast/util";
import "./day.css";

interface Props {
  patri: Patri;
  profileId: string;
  /** Local midnight that opens today, in the reader's zone. */
  dayStartMs: number;
  place: { lat: number; lon: number };
  zone: string;
  preset: EnginePreset;
}

const VERDICT: Record<PickDay["tone"], string> = {
  bright: "Yes, a strong day for it.",
  steady: "Yes, a good day for it.",
  mixed: "It can be done, but better days are near.",
  testing: "Tradition would wait for another day.",
};

export function AskToday({ patri, profileId, dayStartMs, place, zone, preset }: Props) {
  const [activity, setActivity] = useState<ActivityId | null>(null);
  const { lat, lon } = place;
  // The sky of the day is read once, on the first question.
  const asked = activity !== null;
  const sky = useMemo(() => {
    if (!asked) return null;
    try {
      return daySky(dayStartMs, { lat, lon }, preset);
    } catch {
      return null;
    }
  }, [asked, dayStartMs, lat, lon, preset]);
  const day = useMemo(() => (sky && activity ? scoreDay(sky, activity, personOf(patri)) : null), [sky, activity, patri]);
  const chosen = ACTIVITIES.find((a) => a.id === activity);

  return (
    <section className="v-card ask" aria-labelledby="ask-h">
      <h2 id="ask-h" className="ask__h">
        Is today good for…?
      </h2>
      <fieldset className="ask__chips">
        <legend>Choose what you have in mind</legend>
        {ACTIVITIES.map((a) => (
          <button key={a.id} type="button" aria-pressed={a.id === activity} onClick={() => setActivity(a.id === activity ? null : a.id)}>
            {a.label}
          </button>
        ))}
      </fieldset>
      <div aria-live="polite">
        {chosen && day ? (
          <div className="ask__answer" data-tone={day.tone}>
            <p className="ask__word">
              <b>{TONE_WORD[day.tone]}</b>
              <span>{VERDICT[day.tone]}</span>
            </p>
            <ul className="ask__why">
              {day.for[0] ? <li data-side="for">{day.for[0].text}</li> : null}
              {day.against[0] ? <li data-side="against">{day.against[0].text}</li> : null}
              {day.window ? <li data-side="time">Best time today: {span12(day.window.startMs, day.window.endMs, zone)}.</li> : null}
            </ul>
            <Link to={`/pick/${profileId}?for=${chosen.id}`} className="v-link">
              See the best days {chosen.phrase} <ChevronRight size={16} />
            </Link>
          </div>
        ) : chosen ? (
          <p className="v-muted ask__hint">Today could not be read for this place.</p>
        ) : (
          <p className="v-muted ask__hint">Tap one for today's answer, as tradition weighs the day.</p>
        )}
      </div>
    </section>
  );
}
