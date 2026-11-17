// What is inside the Find sheet: a search box, big tiles for the main screens, and ranked results.
// Loaded on first use. Nothing typed here is stored or sent anywhere.
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useActiveProfile, useProfiles } from "../../app/hooks";
import { ChevronRight } from "../../components/ui/Page";
import { Avatar, birthLine } from "../../components/ui/PersonChip";
import { saveSettings } from "../../data/repo";
import { useUi } from "../../state/ui";
import {
  IconChart,
  IconCircle,
  IconDrawer,
  IconFamily,
  IconFestival,
  IconForecast,
  IconGuide,
  IconJournal,
  IconMilan,
  IconMoon,
  IconNumbers,
  IconPalm,
  IconPick,
  IconPlus,
  IconSky,
  IconStory,
  IconToday,
} from "../chowki/icons";
import { MagnifierIcon } from "./FindButton";
import { ASK_EXAMPLES, buildIndex, type FindIcon, type FindItem, flatten, search, TRY_INSTEAD, tiles } from "./index";
import "./find.css";

function WordIcon({ size = 22 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.2" />
      <circle cx="12" cy="7.8" r="0.6" fill="currentColor" />
    </svg>
  );
}

const ICONS: Record<FindIcon, (p: { size?: number }) => React.ReactNode> = {
  today: IconToday,
  almanac: IconMoon,
  chart: IconChart,
  forecast: IconForecast,
  match: IconMilan,
  pick: IconPick,
  festival: IconFestival,
  family: IconFamily,
  journal: IconJournal,
  year: IconStory,
  palm: IconPalm,
  explore: IconSky,
  people: IconCircle,
  settings: IconDrawer,
  guide: IconGuide,
  story: IconStory,
  numbers: IconNumbers,
  add: IconPlus,
  person: IconCircle,
  word: WordIcon,
};

/** Screens that are about one person carry that person's id in the address. */
const PERSON_PATH = /^\/(patri|forecast|hast|journal|pick|year|report)\/([^/]+)(\/.*)?$/;

export default function FindSheet({ onClose }: { onClose: () => void }) {
  const profiles = useProfiles();
  const active = useActiveProfile();
  const navigate = useNavigate();
  const loc = useLocation();
  const setExplain = useUi((s) => s.setExplain);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const uid = useId();
  const listId = `${uid}-list`;
  const optId = (i: number) => `${uid}-opt-${i}`;

  // The person this screen is about (its id is in the address), else the active one: as the person chip shows.
  const m = PERSON_PATH.exec(loc.pathname);
  const shown = (m ? profiles?.find((p) => p.id === m[2]) : undefined) ?? active;
  const shownId = shown?.id ?? null;

  const index = useMemo(
    () => buildIndex({ activeId: shownId, people: (profiles ?? []).map((p) => ({ id: p.id, name: p.name, sub: birthLine(p) })) }),
    [profiles, shownId],
  );
  const q = query.trim();
  const groups = useMemo(() => search(index, q), [index, q]);
  const flat = useMemo(() => flatten(groups), [groups]);
  const at = Math.min(cursor, Math.max(0, flat.length - 1));

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const ask = (text: string) => {
    setQuery(text);
    setCursor(0);
    inputRef.current?.focus();
  };

  const run = (item: FindItem) => {
    const a = item.action;
    onClose();
    if (a.kind === "go") {
      navigate(a.to);
    } else if (a.kind === "explain") {
      setExplain(a.id);
    } else {
      if (a.id !== active?.id) void saveSettings({ activeProfileId: a.id });
      // A screen about one person follows the switch (as the person chip does); any other screen stays where it is.
      if (m && a.id !== m[2]) navigate(`/${m[1]}/${a.id}${m[1] === "hast" ? "" : (m[3] ?? "") + loc.search}`, { replace: true });
    }
  };

  const move = (to: number) => {
    setCursor(to);
    const el = document.getElementById(optId(to));
    if (el && typeof el.scrollIntoView === "function") el.scrollIntoView({ block: "nearest" });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!flat.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      move((at + 1) % flat.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      move((at - 1 + flat.length) % flat.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flat[at];
      if (hit) run(hit.item);
    }
  };

  let n = 0; // running position of an option across the groups
  return (
    <div className="find">
      <div className="find__bar">
        <div className="find__box">
          <span className="find__mag">
            <MagnifierIcon />
          </span>
          <input
            ref={inputRef}
            className="find__input"
            type="text"
            role="combobox"
            inputMode="search"
            enterKeyHint="go"
            aria-label="Find anything"
            aria-autocomplete="list"
            aria-expanded={flat.length > 0}
            aria-controls={flat.length ? listId : undefined}
            aria-activedescendant={flat.length ? optId(at) : undefined}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="Search the app"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setCursor(0);
            }}
            onKeyDown={onKeyDown}
          />
          {query ? (
            <button type="button" className="find__clear" aria-label="Clear the search" onClick={() => ask("")}>
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ) : null}
        </div>
        <button type="button" className="find__close" onClick={onClose}>
          Close
        </button>
      </div>

      <p className="find-sr" role="status">
        {q ? (flat.length ? `${flat.length} ${flat.length === 1 ? "result" : "results"}` : `No results for ${q}`) : ""}
      </p>

      {!q ? (
        <>
          <nav aria-label="Main screens">
            <ul className="find-tiles">
              {tiles(index).map((t) => {
                const Icon = ICONS[t.icon];
                return (
                  <li key={t.id}>
                    <Link to={t.action.kind === "go" ? t.action.to : "/"} className="find-tile" onClick={onClose}>
                      <Icon size={26} />
                      <span>{t.title}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
          <h2 className="find__h">Or ask in your own words</h2>
          <ul className="find-asks">
            {ASK_EXAMPLES.map((x) => (
              <li key={x}>
                <button type="button" className="find-ask" onClick={() => ask(x)}>
                  {x}
                </button>
              </li>
            ))}
          </ul>
          <p className="find__note">Nothing you type here is kept or sent anywhere.</p>
        </>
      ) : flat.length ? (
        <>
          <div className="find-results" role="listbox" id={listId} aria-label="Results">
            {groups.map((g) => (
              <div key={g.group} role="group" aria-labelledby={`${uid}-g-${g.group}`} className="find-group">
                <div className="find__h" id={`${uid}-g-${g.group}`}>
                  {g.label}
                </div>
                {g.hits.map(({ item }) => {
                  const i = n++;
                  const Icon = ICONS[item.icon];
                  return (
                    <div
                      key={item.id}
                      id={optId(i)}
                      role="option"
                      tabIndex={-1}
                      aria-selected={i === at}
                      className="find-opt"
                      onClick={() => run(item)}
                    >
                      {item.group === "person" ? (
                        <Avatar name={item.title} size={42} />
                      ) : (
                        <span className="v-row__icon">
                          <Icon />
                        </span>
                      )}
                      <span className="find-opt__body">
                        <span className="find-opt__t">{item.title}</span>
                        {item.sub ? <span className="find-opt__s">{item.sub}</span> : null}
                      </span>
                      <ChevronRight />
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
          <p className="find__note find__keys">Up and down arrows move, Enter opens, Esc closes.</p>
        </>
      ) : (
        <div className="find-none">
          <p className="find-none__t">Nothing found for “{q}”.</p>
          <p className="find-none__p">Try a shorter word, or one of these:</p>
          <ul className="find-asks">
            {TRY_INSTEAD.map((x) => (
              <li key={x}>
                <button type="button" className="find-ask" onClick={() => ask(x)}>
                  {x}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
