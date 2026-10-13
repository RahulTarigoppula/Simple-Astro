// Anonymous usage counts through GoatCounter (no cookies, no IP stored, no fingerprinting).
// What is sent: the screen name with every id removed ("/patri", never "/patri/abc123") or a named
// click ("event/forecast-week"). Never a name, birth detail, place, photo or id.
// Off when: no GoatCounter code is configured, the browser sends Do Not Track or Global Privacy
// Control, the person turned it off in Settings, the page runs under automation, or on localhost.

const CODE = (import.meta.env.VITE_GOATCOUNTER as string | undefined)?.trim() || "";
const OFF_KEY = "vyom-stats-off";

export function statsConfigured(): boolean {
  return /^[a-z0-9-]{2,50}$/.test(CODE);
}

export function statsOn(): boolean {
  try {
    return localStorage.getItem(OFF_KEY) !== "1";
  } catch {
    return false;
  }
}

export function setStatsOn(on: boolean): void {
  try {
    if (on) localStorage.removeItem(OFF_KEY);
    else localStorage.setItem(OFF_KEY, "1");
  } catch {
    // storage blocked: counts simply stay off
  }
}

function allowed(): boolean {
  if (!statsConfigured() || !statsOn()) return false;
  if (typeof navigator === "undefined" || typeof location === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  if (nav.webdriver || nav.doNotTrack === "1" || nav.globalPrivacyControl) return false;
  if (/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) return false;
  return true;
}

/** "/patri/9f2c…/sky" → "/patri/sky"; anything that looks like an id is dropped. */
export function cleanPath(path: string): string {
  const parts = path
    .split(/[?#]/)[0]
    ?.split("/")
    .filter(Boolean)
    .filter((s) => !/^[0-9a-f-]{8,}$/i.test(s) && !(/\d/.test(s) && s.length >= 6) && s.length <= 24);
  return `/${(parts ?? []).join("/")}`;
}

/** Event names are fixed in code; this keeps them to a safe alphabet anyway. */
export function cleanEvent(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .slice(0, 40);
}

function send(p: string, title: string, event: boolean): void {
  if (!allowed()) return;
  const q = new URLSearchParams({ p, t: title, rnd: Math.floor(performance.now()).toString(36) });
  if (event) q.set("e", "true");
  const url = `https://${CODE}.goatcounter.com/count?${q.toString()}`;
  try {
    void fetch(url, { mode: "no-cors", keepalive: true, credentials: "omit", referrerPolicy: "no-referrer" }).catch(() => undefined);
  } catch {
    // counting must never break the app
  }
}

/** A screen was opened (each load or refresh counts once). */
export function countView(path: string): void {
  const p = cleanPath(path);
  send(p, p === "/" ? "home" : p.slice(1), false);
}

/** A named click, e.g. countEvent("forecast-week"). */
export function countEvent(name: string): void {
  const n = cleanEvent(name);
  send(`event/${n}`, n, true);
}
