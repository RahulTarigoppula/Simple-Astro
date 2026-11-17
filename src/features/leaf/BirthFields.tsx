// Date and time of birth, written the way people say them: day, month by name, year; then the hour
// on a 12-hour clock with am/pm chosen by hand. Under the fields a plain sentence reads the time
// back ("7:25 in the morning (07:25)") so an evening birth never slips through as a morning one.
// Unset fields are 0 and am/pm is null; the flow refuses to go on until every one is filled.
// Three pieces, so the When step and the review can each use what they need: DateFields, TimeFields, Readback.
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
  hour12: number; // 0 = unset, else 1..12
  ampm: "am" | "pm" | null; // null until the person taps one; never assumed
  mi: number; // 0..59
}

/** The 24-hour hour, or -1 until both the hour and am/pm have been chosen. */
export function hourOf(v: Pick<BirthFieldValues, "hour12" | "ampm">): number {
  if (v.hour12 < 1 || v.hour12 > 12 || v.ampm === null) return -1;
  return (v.hour12 % 12) + (v.ampm === "pm" ? 12 : 0);
}

/** Split a 24-hour hour back into the two fields (editing a saved person). */
export function fieldsOfHour(h: number): Pick<BirthFieldValues, "hour12" | "ampm"> {
  return { hour12: h % 12 || 12, ampm: h < 12 ? "am" : "pm" };
}

interface Props extends BirthFieldValues {
  timeUnknown: boolean;
  onChange: (patch: Partial<BirthFieldValues>) => void;
}

/** True when the date fields are all filled and name a real day. */
export const dateFilled = (v: Pick<BirthFieldValues, "y" | "mo" | "d">): boolean =>
  v.y >= YEAR_MIN && v.y <= YEAR_MAX && v.mo > 0 && v.d > 0 && isValidCivil(v.y, v.mo, v.d, 0, 0);
/** True when the hour has been chosen. */
export const timeFilled = (v: BirthFieldValues): boolean => hourOf(v) >= 0 && v.mi >= 0 && v.mi <= 59;

/** What is still missing, in one short sentence, or null when the date and time are complete. */
export function missingText(v: BirthFieldValues, timeUnknown: boolean): string | null {
  if (!(v.d > 0) || !(v.mo > 0) || !(v.y > 0)) return "Fill in the date of birth.";
  if (v.y < 1000) return "Fill in the date of birth."; // still typing the year
  if (v.y < YEAR_MIN || v.y > YEAR_MAX) return `Years ${YEAR_MIN} to ${YEAR_MAX} only.`;
  if (v.d > 31) return "Days 1 to 31 only.";
  if (!isValidCivil(v.y, v.mo, v.d, 0, 0)) {
    const n = daysInMonth(v.y, v.mo);
    return n ? `${MONTH_NAMES[v.mo - 1]} ${v.y} has only ${n} days.` : "That date does not exist.";
  }
  if (!timeUnknown && !(v.hour12 >= 1)) return "Pick the hour of birth.";
  if (!timeUnknown && v.ampm === null) return "Was it am or pm? Tap one.";
  if (!timeUnknown && !timeFilled(v)) return "Pick the time of birth.";
  return null;
}

/** What the read-back says before anything has been filled in. */
export const READBACK_HINT = "Your date and time will be read back here.";

/** True while nothing at all has been entered on the When step. */
export const nothingEntered = (v: BirthFieldValues, timeUnknown: boolean): boolean =>
  !timeUnknown && !(v.d > 0) && !(v.mo > 0) && !(v.y > 0) && !(v.hour12 > 0) && v.ampm === null && !(v.mi > 0);

/** True when what was entered is wrong (not merely unfinished): a day, month or year that cannot be. */
export function enteredWrong(v: Pick<BirthFieldValues, "y" | "mo" | "d">): boolean {
  if (v.d > 31) return true;
  if (v.y >= 1000 && (v.y < YEAR_MIN || v.y > YEAR_MAX)) return true;
  return v.d > 0 && v.mo > 0 && v.y >= YEAR_MIN && v.y <= YEAR_MAX && !isValidCivil(v.y, v.mo, v.d, 0, 0);
}

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;
/** The day of the week of a real date ("Monday"); families often remember it, so it is one more check. */
export const weekdayOf = (y: number, mo: number, d: number): string => WEEKDAYS[new Date(Date.UTC(y, mo - 1, d)).getUTCDay()] ?? "";

const show = (n: number) => (n > 0 ? String(n) : "");

/** A number box that keeps what is being typed and commits only whole numbers (0 otherwise). */
function NumberBox({
  id,
  value,
  max,
  placeholder,
  autoFocus,
  onCommit,
}: {
  id: string;
  value: number;
  max: number;
  placeholder: string;
  autoFocus?: boolean;
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
      className="v-input bf-num"
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      autoComplete="off"
      placeholder={placeholder}
      value={text}
      maxLength={String(max).length}
      data-autofocus={autoFocus ? "" : undefined}
      onFocus={(e) => {
        focused.current = true;
        e.currentTarget.select();
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^0-9]/g, "");
        setText(raw);
        const n = Number.parseInt(raw, 10);
        onCommit(Number.isInteger(n) && n >= 1 ? n : 0); // range is judged by missingText, so it can say why
      }}
      onBlur={() => {
        focused.current = false;
        setText(show(value));
      }}
    />
  );
}

type Change = (patch: Partial<BirthFieldValues>) => void;

/** Day, month by name, year. */
export function DateFields({ y, mo, d, onChange }: Pick<BirthFieldValues, "y" | "mo" | "d"> & { onChange: Change }) {
  return (
    <fieldset className="bf-group">
      <legend className="v-label">Date of birth</legend>
      <div className="bf-row bf-row--date">
        <div className="bf-cell">
          <label htmlFor="bf-day">Day</label>
          <NumberBox id="bf-day" value={d} max={31} placeholder="14" autoFocus onCommit={(n) => onChange({ d: n })} />
        </div>
        <div className="bf-cell">
          <label htmlFor="bf-month">Month</label>
          <select
            id="bf-month"
            className="v-select bf-select"
            autoComplete="off"
            value={mo > 0 ? mo : ""}
            onChange={(e) => onChange({ mo: Number(e.target.value) || 0 })}
          >
            <option value="" disabled>
              Choose
            </option>
            {MONTH_NAMES.map((m, i) => (
              <option key={m} value={i + 1}>
                {m}
              </option>
            ))}
          </select>
        </div>
        <div className="bf-cell">
          <label htmlFor="bf-year">Year</label>
          <NumberBox id="bf-year" value={y} max={YEAR_MAX} placeholder="1994" onCommit={(n) => onChange({ y: n })} />
        </div>
      </div>
    </fieldset>
  );
}

/** Hour and minute on a 12-hour clock; am or pm must be tapped, it is never assumed. */
export function TimeFields({
  hour12,
  ampm,
  mi,
  timeUnknown,
  onChange,
}: Pick<BirthFieldValues, "hour12" | "ampm" | "mi"> & { timeUnknown: boolean; onChange: Change }) {
  return (
    <fieldset className={`bf-group${timeUnknown ? " is-off" : ""}`} disabled={timeUnknown}>
      <legend className="v-label">Time of birth</legend>
      <div className="bf-row bf-row--time">
        <div className="bf-cell">
          <label htmlFor="bf-hour">Hour</label>
          <select
            id="bf-hour"
            className="v-select bf-select"
            autoComplete="off"
            value={hour12 || ""}
            onChange={(e) => onChange({ hour12: Number(e.target.value) || 0 })}
          >
            <option value="" disabled>
              --
            </option>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>
        <div className="bf-cell">
          <label htmlFor="bf-minute">Minute</label>
          <select
            id="bf-minute"
            className="v-select bf-select"
            autoComplete="off"
            value={mi}
            onChange={(e) => onChange({ mi: Number(e.target.value) || 0 })}
          >
            {Array.from({ length: 60 }, (_, i) => i).map((n) => (
              <option key={n} value={n}>
                {String(n).padStart(2, "0")}
              </option>
            ))}
          </select>
        </div>
        <div className="bf-cell">
          <span id="bf-ampm-l" className="bf-cell__l">
            am or pm
          </span>
          <div className="v-seg bf-ampm" role="radiogroup" aria-labelledby="bf-ampm-l">
            <button type="button" role="radio" aria-checked={ampm === "am"} onClick={() => onChange({ ampm: "am" })}>
              am
            </button>
            <button type="button" role="radio" aria-checked={ampm === "pm"} onClick={() => onChange({ ampm: "pm" })}>
              pm
            </button>
          </div>
        </div>
      </div>
    </fieldset>
  );
}

/**
 * The sentence that reads the date and time back, or says what is still missing.
 * It only turns to the warning colour once Next was pressed or something entered is wrong; before
 * anything is typed it is a plain hint, and while the fields are being filled it calmly names the next one.
 */
export function Readback({
  y,
  mo,
  d,
  hour12,
  ampm,
  mi,
  timeUnknown,
  urgent,
  lead,
  weekday,
}: Omit<Props, "onChange"> & {
  /** Next was pressed with something missing: say it as an alert. */
  urgent?: boolean;
  /** A word before the date on the review ("Born"). */
  lead?: string;
  /** Say the day of the week before the date. */
  weekday?: boolean;
}) {
  const v: BirthFieldValues = { y, mo, d, hour12, ampm, mi };
  const h = hourOf(v);
  const missing = missingText(v, timeUnknown);
  const pristine = missing !== null && !urgent && nothingEntered(v, timeUnknown);
  const warn = missing !== null && (urgent === true || enteredWrong(v));
  const dateText = dateFilled(v) ? `${weekday ? `${weekdayOf(y, mo, d)} ` : ""}${d} ${MONTH_NAMES[mo - 1]} ${y}` : "";
  const timeText = timeUnknown ? "time of birth not known, noon is used" : h >= 0 ? clockWords(h, mi) : "";
  return (
    <p
      className={`bf-read${warn ? " is-missing" : missing ? " is-hint" : ""}${missing && urgent ? " is-urgent" : ""}`}
      role={missing && urgent ? "alert" : undefined}
      aria-live={missing && urgent ? undefined : "polite"}
      data-testid="birth-readback"
    >
      {missing ? (
        <span>{pristine ? READBACK_HINT : missing}</span>
      ) : (
        <>
          {lead ? `${lead} ` : null}
          <b>{dateText}</b>
          {timeText ? (
            <>
              , <b>{timeText}</b>
            </>
          ) : null}
        </>
      )}
    </p>
  );
}
