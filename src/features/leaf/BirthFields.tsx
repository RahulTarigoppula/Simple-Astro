// Date and time of birth, written the way people say them: day, month by name, year; then the hour
// on a 12-hour clock with am/pm chosen by hand. Under the fields a plain sentence reads the time
// back ("7:25 in the morning (07:25)") so an evening birth never slips through as a morning one.
// Unset fields are 0 (date) and -1 (hour); the screen refuses to save until every one is filled.
import { useEffect, useRef, useState } from "react";
import { clockWords, daysInMonth, isValidCivil } from "../../engine/time";

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

export const YEAR_MIN = 1800;
export const YEAR_MAX = 2100;

export interface BirthFieldValues {
  y: number; // 0 = unset
  mo: number; // 0 = unset
  d: number; // 0 = unset
  h: number; // -1 = unset, else 0..23
  mi: number; // 0..59
}

interface Props extends BirthFieldValues {
  timeUnknown: boolean;
  onChange: (patch: Partial<BirthFieldValues>) => void;
}

/** True when the date fields are all filled and name a real day. */
export const dateFilled = (v: Pick<BirthFieldValues, "y" | "mo" | "d">): boolean =>
  v.y > 0 && v.mo > 0 && v.d > 0 && isValidCivil(v.y, v.mo, v.d, 0, 0);
/** True when the hour has been chosen. */
export const timeFilled = (v: BirthFieldValues): boolean => v.h >= 0 && v.h <= 23 && v.mi >= 0 && v.mi <= 59;

/** What is still missing, in one short sentence, or null when the date and time are complete. */
export function missingText(v: BirthFieldValues, timeUnknown: boolean): string | null {
  if (!(v.d > 0) || !(v.mo > 0) || !(v.y > 0)) return "Fill in the date of birth.";
  if (!isValidCivil(v.y, v.mo, v.d, 0, 0)) {
    const n = daysInMonth(v.y, v.mo);
    return n ? `${MONTH_NAMES[v.mo - 1]} ${v.y} has only ${n} days.` : "That date does not exist.";
  }
  if (!timeUnknown && !timeFilled(v)) return "Pick the hour of birth, and whether it was am or pm.";
  return null;
}

const show = (n: number) => (n > 0 ? String(n) : "");

/** A number box that keeps what is being typed and commits only whole numbers inside its range (0 otherwise). */
function NumberBox({
  id,
  label,
  value,
  min,
  max,
  width,
  placeholder,
  onCommit,
}: {
  id: string;
  label: string;
  value: number;
  min: number;
  max: number;
  width: string;
  placeholder: string;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState(() => show(value));
  const focused = useRef(false);
  // Outside changes (editing a saved person, the example button) replace the text unless it is being typed.
  useEffect(() => {
    if (!focused.current) setText(show(value));
  }, [value]);
  return (
    <input
      id={id}
      className="bf__num"
      style={{ width }}
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      aria-label={label}
      placeholder={placeholder}
      value={text}
      maxLength={String(max).length}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setText(raw);
        const n = Number.parseInt(raw, 10);
        onCommit(Number.isInteger(n) && n >= min && n <= max ? n : 0);
      }}
      onBlur={() => {
        focused.current = false;
        setText(show(value));
      }}
    />
  );
}

export function BirthFields({ y, mo, d, h, mi, timeUnknown, onChange }: Props) {
  const hour12 = h < 0 ? 0 : h % 12 || 12;
  const pm = h >= 12;
  const setHour12 = (hh: number) => {
    if (hh < 1) {
      onChange({ h: -1 });
      return;
    }
    onChange({ h: (hh % 12) + (pm ? 12 : 0) });
  };
  const setPm = (isPm: boolean) => {
    if (h < 0) return;
    onChange({ h: (h % 12) + (isPm ? 12 : 0) });
  };
  const missing = missingText({ y, mo, d, h, mi }, timeUnknown);
  const dateOk = dateFilled({ y, mo, d });
  const dateText = dateOk ? `${d} ${MONTH_NAMES[mo - 1]} ${y}` : "";
  const timeText = timeUnknown ? "time of birth unknown, cast for noon" : timeFilled({ y, mo, d, h, mi }) ? clockWords(h, mi) : "";

  return (
    <div className="bf">
      <div className="bf__row" role="group" aria-label="Date of birth">
        <span className="bf__k">Date of birth</span>
        <div className="bf__fields">
          <NumberBox
            id="bf-day"
            label="Day"
            value={d}
            min={1}
            max={31}
            width="3.4em"
            placeholder="DD"
            onCommit={(n) => onChange({ d: n })}
          />
          <select
            id="bf-month"
            className="bf__select bf__select--month"
            aria-label="Month"
            value={mo > 0 ? mo : ""}
            onChange={(e) => onChange({ mo: Number(e.target.value) || 0 })}
          >
            <option value="" disabled>
              Month
            </option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
          <NumberBox
            id="bf-year"
            label="Year"
            value={y}
            min={YEAR_MIN}
            max={YEAR_MAX}
            width="4.6em"
            placeholder="YYYY"
            onCommit={(n) => onChange({ y: n })}
          />
        </div>
      </div>

      <div className={`bf__row${timeUnknown ? " is-off" : ""}`} role="group" aria-label="Time of birth">
        <span className="bf__k">Time of birth</span>
        <div className="bf__fields">
          <select
            id="bf-hour"
            className="bf__select"
            aria-label="Hour"
            value={hour12 || ""}
            disabled={timeUnknown}
            onChange={(e) => setHour12(Number(e.target.value) || 0)}
          >
            <option value="" disabled>
              Hour
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <span className="bf__colon" aria-hidden="true">
            :
          </span>
          <select
            id="bf-minute"
            className="bf__select"
            aria-label="Minute"
            value={mi}
            disabled={timeUnknown}
            onChange={(e) => onChange({ mi: Number(e.target.value) || 0 })}
          >
            {Array.from({ length: 60 }, (_, i) => i).map((n) => (
              <option key={n} value={n}>
                {String(n).padStart(2, "0")}
              </option>
            ))}
          </select>
          <span className="seg bf__ampm" role="radiogroup" aria-label="am or pm">
            <button type="button" role="radio" aria-checked={h >= 0 && !pm} disabled={timeUnknown || h < 0} onClick={() => setPm(false)}>
              am
            </button>
            <button type="button" role="radio" aria-checked={h >= 0 && pm} disabled={timeUnknown || h < 0} onClick={() => setPm(true)}>
              pm
            </button>
          </span>
        </div>
      </div>

      <p className={`bf__read${missing ? " is-missing" : ""}`} aria-live="polite" data-testid="birth-readback">
        {missing ? (
          <span>{missing}</span>
        ) : (
          <>
            <b>{dateText}</b>
            {timeText ? (
              <>
                , <b>{timeText}</b>
              </>
            ) : null}
          </>
        )}
      </p>
    </div>
  );
}
