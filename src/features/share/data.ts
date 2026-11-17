// From the engine's numbers to the plain data a share card is drawn from. Pure: the same inputs give
// the same card. Nothing here reads a birth date, time or place into a card.
import { skyPhase } from "../../components/ui/SkyScene";
import { NAKSHATRA_LORE, RASHI_LORE } from "../../data/lore";
import { nakName, rashiName } from "../../data/regional";
import { GRAHA_ENGLISH, NAKSHATRA_DEV, NAKSHATRA_NAMES, SIGN_DEV } from "../../data/tables/names";
import { ayanamsa } from "../../engine/ayanamsa";
import { bondReading } from "../../engine/bond";
import type { Forecast } from "../../engine/forecast";
import type { DayGuide } from "../../engine/personal";
import type { StarCatalog } from "../../engine/sky/stars";
import type { GrahaId, MilanResult, Patri, Profile } from "../../engine/types";
import { fmt, HALF_DAY, pct, TONE_HINT, TONE_WORD, t12 } from "../forecast/util";
import { BAND_WORD } from "../milan/BondCard";
import {
  compactSpan,
  type DayCardData,
  type DayDial,
  firstName,
  type MatchCardData,
  STARS_SPAN,
  type StarsCardData,
  type StarsFact,
  type StarsSky,
} from "./cards";

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

export interface DayInput {
  /** The person's name; only the first name is ever drawn. */
  name: string;
  /** The zone the times are shown in (where the reader is now). */
  zone: string;
  nowMs: number;
  /** The day's forecast and guide, as the Home and Forecast screens already hold them. */
  forecast: Forecast;
  guide: DayGuide;
  sunriseMs: number;
  sunsetMs: number;
  /** Moon − Sun angle in degrees. */
  elongation: number;
}

/** The sky dial of SkyScene as fractions along the arc. A day that is not today is shown whole, the Sun at its highest. */
export function dayDial(i: Pick<DayInput, "nowMs" | "sunriseMs" | "sunsetMs" | "elongation" | "guide" | "forecast">): DayDial {
  const { sunriseMs, sunsetMs } = i;
  const today = i.nowMs >= i.forecast.startMs && i.nowMs < i.forecast.endMs;
  const at = today ? i.nowMs : (sunriseMs + sunsetMs) / 2;
  const span = Math.max(1, sunsetMs - sunriseMs);
  const f = (ms: number) => clamp01((ms - sunriseMs) / span);
  const isDay = at >= sunriseMs && at <= sunsetMs;
  // after dark the Moon rides the arc across the night (sunset to the next sunrise, or the last one)
  const nightLen = 86_400_000 - span;
  const nightF = at > sunsetMs ? clamp01((at - sunsetMs) / nightLen) : clamp01(1 - (sunriseMs - at) / nightLen);
  return {
    phase: today ? skyPhase(at, sunriseMs, sunsetMs) : "day",
    isDay,
    body: isDay ? f(at) : 0.12 + nightF * 0.76,
    good: i.guide.bestHours.map((h) => [f(h.startMs), f(h.endMs)] as [number, number]),
    avoid: [f(i.guide.avoid[0]), f(i.guide.avoid[1])],
    elongation: i.elongation,
  };
}

/** Good hours that follow one another without a gap, as one span: three hours in a row read as one stretch on a card. */
export function mergeHours(hours: ReadonlyArray<{ startMs: number; endMs: number }>): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  for (const h of [...hours].sort((a, b) => a.startMs - b.startMs)) {
    const last = out[out.length - 1];
    if (last && h.startMs - last[1] <= 60_000) last[1] = Math.max(last[1], h.endMs);
    else out.push([h.startMs, h.endMs]);
  }
  return out;
}

export function dayCard(i: DayInput): DayCardData {
  const { forecast: f, guide: g, zone } = i;
  const span = (a: number, b: number) => compactSpan(t12(a, zone), t12(b, zone));
  return {
    kind: "day",
    name: i.name,
    date: fmt(f.startMs + HALF_DAY, zone, { weekday: "long", day: "numeric", month: "long", year: "numeric" }).replace(",", ""),
    word: TONE_WORD[f.tone],
    score: pct(f.score),
    hint: TONE_HINT[f.tone],
    headline: f.headline,
    hours: mergeHours(g.bestHours).map(([a, b]) => span(a, b)),
    pause: span(g.avoid[0], g.avoid[1]),
    rise: t12(i.sunriseMs, zone),
    set: t12(i.sunsetMs, zone),
    dial: dayDial(i),
  };
}

export interface MatchInput {
  /** The two names, first person first; only first names and initials are ever drawn. */
  a: string;
  b: string;
  result: MilanResult;
}

export function matchCard(i: MatchInput): MatchCardData {
  const an = firstName(i.a);
  const bn = firstName(i.b);
  const b = bondReading(i.result, an, bn);
  const lead = `${an} and ${bn} `;
  return {
    kind: "match",
    a: i.a,
    b: i.b,
    word: BAND_WORD[i.result.band],
    score: b.score,
    points: i.result.total,
    headline: b.headline,
    line: b.summary,
    // the same sentence in the couple's own voice, for a card with the names hidden
    lineAnon: b.summary.startsWith(lead) ? `We ${b.summary.slice(lead.length)}` : `${b.headline}.`,
  };
}

export interface StarsInput {
  profile: Profile;
  patri: Patri;
}

const EPS = (23.4392911 * Math.PI) / 180;
const NAK = 360 / 27;
const BODIES: readonly GrahaId[] = ["SU", "ME", "VE", "MA", "JU", "SA"];
const wrap = (d: number) => ((((d + 180) % 360) + 360) % 360) - 180;
const bare = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();

/** How far above and below the Sun's path the card shows, in degrees (the card is taller than it is wide). */
export const STARS_LAT: readonly [number, number] = [-42, 34];

/**
 * The real stars behind the Moon at birth (as SkyPiece): Yale Bright Star Catalogue positions turned
 * into sidereal ecliptic longitude and latitude, kept as degrees around the Moon. Without a
 * catalogue the Moon, its star's stretch and the planets are still true; only the stars are absent.
 */
export function starsSky(patri: Patri, tradition: Profile["tradition"], cat: StarCatalog | null): StarsSky {
  const mo = patri.grahas.MO;
  const c = mo.lonSidereal;
  const half = STARS_SPAN / 2;
  const nak0 = mo.nakshatra * NAK;
  const stars: number[] = [];
  if (cat) {
    const ay = ayanamsa(2451545.0, patri.preset.ayanamsa);
    const cosE = Math.cos(EPS);
    const sinE = Math.sin(EPS);
    for (let i = 0; i < cat.count; i++) {
      const m = cat.mag[i] ?? 9;
      if (m > 6.6) break; // sorted brightest first
      const x = cat.xyz[3 * i] ?? 0;
      const y = cat.xyz[3 * i + 1] ?? 0;
      const z = cat.xyz[3 * i + 2] ?? 0;
      const ye = y * cosE + z * sinE;
      const ze = -y * sinE + z * cosE;
      const lam = (Math.atan2(ye, x) * 180) / Math.PI - ay;
      const bet = (Math.asin(Math.max(-1, Math.min(1, ze))) * 180) / Math.PI;
      const dx = wrap(lam - c);
      if (Math.abs(dx) > half + 1 || bet < STARS_LAT[0] || bet > STARS_LAT[1]) continue;
      stars.push(Math.round(dx * 100) / 100, Math.round(bet * 100) / 100, Math.round(m * 100) / 100);
    }
  }
  const first = Math.ceil((c - half) / 30);
  const edges: number[] = [];
  for (let n = first; n * 30 < c + half; n++) edges.push(n * 30);
  const signAt = (lon: number) => ((Math.floor(lon / 30) % 12) + 12) % 12;
  const bounds = [c - half, ...edges, c + half];
  const signs: StarsSky["signs"] = [];
  for (let i = 0; i < bounds.length - 1; i++) {
    const a = bounds[i] ?? 0;
    const b = bounds[i + 1] ?? 0;
    if (b - a < 9) continue;
    signs.push({ dx: (a + b) / 2 - c, name: rashiName(signAt((a + b) / 2), tradition) });
  }
  return {
    stars,
    moonLat: mo.latEcliptic,
    elongation: patri.birthPanchang.elongation,
    band: [nak0 - c, nak0 + NAK - c],
    edges: edges.map((e) => e - c),
    signs,
    bodies: BODIES.map((id) => ({ id, g: patri.grahas[id] }))
      .filter(({ g }) => Math.abs(wrap(g.lonSidereal - c)) < half - 3 && Math.abs(g.latEcliptic) < 10)
      .map(({ id, g }) => ({ name: GRAHA_ENGLISH[id], dx: wrap(g.lonSidereal - c), lat: g.latEcliptic, sun: id === "SU" })),
  };
}

/** Moon sign, birth star and rising sign: plain words, the answer, the Sanskrit beneath. */
export function starsFacts(profile: Profile, patri: Patri): StarsFact[] {
  const t = profile.tradition;
  const mo = patri.grahas.MO;
  const sign = (s: number) => ({ value: RASHI_LORE[s]?.western ?? rashiName(s, t), sanskrit: `${rashiName(s, t)} · ${SIGN_DEV[s] ?? ""}` });
  const star = nakName(mo.nakshatra, t);
  const starSk = NAKSHATRA_NAMES[mo.nakshatra] ?? "";
  const dev = NAKSHATRA_DEV[mo.nakshatra] ?? "";
  const meaning = NAKSHATRA_LORE[mo.nakshatra]?.meaning;
  return [
    { label: "Moon sign", ...sign(mo.sign) },
    {
      label: "Birth star",
      value: star,
      // a regional name keeps its Sanskrit beside the script; otherwise the script and what the name means
      sanskrit: bare(star) === bare(starSk) ? (meaning ? `${dev} · “${meaning}”` : dev) : `${starSk} · ${dev}`,
    },
    profile.timeUnknown
      ? { label: "Rising sign", value: "Not known", sanskrit: "Lagna needs a birth time" }
      : { label: "Rising sign", ...sign(patri.lagna.sign) },
  ];
}

export function starsCard(i: StarsInput, cat: StarCatalog | null): StarsCardData {
  return {
    kind: "stars",
    name: i.profile.name,
    star: nakName(i.patri.grahas.MO.nakshatra, i.profile.tradition),
    facts: starsFacts(i.profile, i.patri),
    sky: starsSky(i.patri, i.profile.tradition, cat),
  };
}
