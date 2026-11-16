// "Where are you now?": the place today's hours, sunrise and the almanac are worked out for.
// It is a setting of the app, never of a person: birth details and cached charts are not touched.
import tzlookup from "@photostructure/tz-lookup";
import { useEffect, useId, useState } from "react";
import { type Here, useHere } from "../../app/hooks";
import { ChevronRight } from "../../components/ui/Page";
import { Sheet } from "../../components/ui/Sheet";
import { loadGazetteer, searchPlaces } from "../../data/places";
import { saveSettings } from "../../data/repo";
import type { HerePlace, Place, Profile } from "../../engine/types";
import { toast } from "../../state/ui";
import "./here.css";

/** "Hyderabad, Telangana, IN" → "Hyderabad". */
export const townOf = (name: string): string => name.split(",")[0]?.trim() || name;

let regionNames: Intl.DisplayNames | null | undefined;
function countryName(code: string): string {
  if (regionNames === undefined) {
    try {
      regionNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionNames = null;
    }
  }
  try {
    return regionNames?.of(code) ?? code;
  } catch {
    return code;
  }
}

/** The time zone of a picked place: the index's own, else looked up from the coordinates (as the birth form does). */
function zoneOf(p: Place): string {
  if (p.timezone) return p.timezone;
  try {
    return tzlookup(p.lat, p.lon);
  } catch {
    return "UTC";
  }
}

export function toHerePlace(p: Place): HerePlace {
  return { name: [p.name, p.admin1, p.country].filter(Boolean).join(", "), lat: p.lat, lon: p.lon, zone: zoneOf(p) };
}

interface HereSheetProps {
  open: boolean;
  onClose: () => void;
  /** The person on screen: their birthplace is the fallback offered. */
  profile: Profile | null | undefined;
  /** The place in use, read by the caller (already loaded there, so the sheet never opens on a stale default). */
  here: Here;
}

function Finder({ onClose, profile, here }: Omit<HereSheetProps, "open">) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [ready, setReady] = useState<boolean | null>(null);
  const [results, setResults] = useState<Place[]>([]);

  useEffect(() => {
    let live = true;
    loadGazetteer()
      .then(() => live && setReady(true))
      .catch(() => live && setReady(false));
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const q = query.trim();
    setResults(q.length >= 2 ? searchPlaces(q, 8) : []);
  }, [query, ready]);

  const save = (currentPlace: HerePlace | null) => {
    saveSettings({ currentPlace })
      .then(() => toast(currentPlace ? `Times are now for ${townOf(currentPlace.name)}.` : "Times are back to the birthplace."))
      .catch((e: unknown) => toast(`Could not save the place: ${e instanceof Error ? e.message : String(e)}`, "danger"));
    onClose();
  };

  const q = query.trim();
  const birthTown = profile ? townOf(profile.birth.place.name) : null;
  return (
    <div className="here-sheet">
      <h2 className="here-sheet__h">Where are you now?</h2>
      <p className="here-sheet__p">Today's hours, sunrise and the almanac are worked out for this place. Your birth chart never changes.</p>
      <p className="here-sheet__now">
        Now using <strong>{townOf(here.name)}</strong>
        {here.birthplace && profile ? `, where ${profile.name} was born.` : "."}
      </p>

      <label className="v-label" htmlFor={inputId}>
        Find your town or city
      </label>
      <input
        id={inputId}
        className="v-input"
        type="search"
        inputMode="search"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        placeholder="For example, Hyderabad"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div aria-live="polite">
        {results.length ? (
          <ul className="v-list here-results" aria-label="Places found">
            {results.map((p) => (
              <li key={`${p.geonameId ?? ""}|${p.name}|${p.lat}|${p.lon}`}>
                <button type="button" className="v-row" onClick={() => save(toHerePlace(p))}>
                  <span className="v-row__body">
                    <span className="v-row__t">{p.name}</span>
                    <span className="v-row__s">{[p.admin1, countryName(p.country)].filter(Boolean).join(", ")}</span>
                  </span>
                  <ChevronRight />
                </button>
              </li>
            ))}
          </ul>
        ) : q.length >= 2 ? (
          <p className="here-sheet__hint">
            {ready === false
              ? "The list of places could not be loaded. Close this and try again."
              : ready === null
                ? "Loading the list of places…"
                : "No town found with that name. Try the nearest bigger town."}
          </p>
        ) : (
          <p className="here-sheet__hint">Type two or more letters. The list of towns is inside the app, so nothing is sent anywhere.</p>
        )}
      </div>

      {here.birthplace ? null : (
        <ul className="v-list here-results">
          <li>
            <button type="button" className="v-row" onClick={() => save(null)}>
              <span className="v-row__body">
                <span className="v-row__t">
                  {profile && birthTown ? `Use ${profile.name}'s birthplace (${birthTown})` : "Use each person's birthplace"}
                </span>
                <span className="v-row__s">Each person's times then follow the place they were born.</span>
              </span>
              <ChevronRight />
            </button>
          </li>
        </ul>
      )}

      <div className="v-actions">
        <button type="button" className="v-btn v-btn--ghost v-btn--sm" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}

export function HereSheet({ open, onClose, profile, here }: HereSheetProps) {
  return (
    <Sheet open={open} onClose={onClose} label="Where are you now?">
      <Finder onClose={onClose} profile={profile} here={here} />
    </Sheet>
  );
}

/** The quiet line under anything timed: which place the times are for, and a real button to change it. */
export function HereLine({ profile, className }: { profile: Profile | null | undefined; className?: string }) {
  const here = useHere(profile);
  const [open, setOpen] = useState(false);
  const town = townOf(here.name);
  return (
    <>
      <p className={`here-line${className ? ` ${className}` : ""}`}>
        <span>
          Times are for <strong>{town}</strong>
          {here.birthplace && profile ? `, where ${profile.name} was born. Live somewhere else?` : "."}
        </span>{" "}
        <button type="button" className="v-link here-line__btn" aria-haspopup="dialog" onClick={() => setOpen(true)}>
          Change<span className="here-sr"> the place the times are for</span>
        </button>
      </p>
      <HereSheet open={open} onClose={() => setOpen(false)} profile={profile} here={here} />
    </>
  );
}
