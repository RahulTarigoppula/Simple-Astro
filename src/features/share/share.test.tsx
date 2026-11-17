import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { milan } from "../../engine/ashtakoota";
import { forecast } from "../../engine/forecast";
import { computePanchang } from "../../engine/panchang";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { dayGuide, personalReading } from "../../engine/personal";
import { resolveBirthMoment } from "../../engine/time";
import { DEFAULT_PRESET, type Profile } from "../../engine/types";
import { useUi } from "../../state/ui";
import {
  CARD_H,
  CARD_W,
  type CardData,
  cardAlt,
  cardFilename,
  compactSpan,
  type DayCardData,
  dayText,
  drawCard,
  FOOTER,
  firstName,
  gapsOf,
  initialOf,
  type MatchCardData,
  matchText,
  type Palette,
  pairGap,
  paletteFrom,
  parseGradient,
  quietAt,
  rowsOf,
  type StarsCardData,
  starsText,
  withAlpha,
  wrapLines,
} from "./cards";
import { type DayInput, dayCard, dayDial, matchCard, mergeHours, starsCard, starsFacts } from "./data";
import { ShareButton } from "./ShareCard";

vi.mock("../sky/starField", () => ({ loadStars: () => Promise.reject(new Error("no catalogue in tests")) }));

const PRIYA: Profile = {
  id: "test-priya",
  name: "Priya Lakshmi",
  birth: resolveBirthMoment({
    localY: 1996,
    localMo: 6,
    localD: 15,
    localH: 9,
    localMi: 30,
    place: { name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.9716, lon: 77.5946, source: "manual" },
  }),
  handedness: "right",
  createdAt: 1,
  updatedAt: 1,
};
const RAHUL: Profile = { ...REFERENCE_PROFILE, name: "Rahul Tarigoppula" };
const patA = computePatri(RAHUL, DEFAULT_PRESET, 0);
const patB = computePatri(PRIYA, DEFAULT_PRESET, 0);
const result = milan(RAHUL, PRIYA, patA, patB);

const ZONE = "Asia/Kolkata";
const BLR = { lat: 12.9716, lon: 77.5946 };
const NOON = Date.UTC(2026, 10, 17, 6, 30); // 17 November 2026, noon in India
function dayInput(nowMs: number): DayInput {
  const f = forecast(patA, "day", NOON, ZONE, DEFAULT_PRESET, BLR);
  const r = personalReading(patA, NOON, DEFAULT_PRESET);
  const g = dayGuide(patA, NOON, BLR, DEFAULT_PRESET, r.areas);
  const p = computePanchang(NOON, BLR, DEFAULT_PRESET);
  return {
    name: RAHUL.name,
    zone: ZONE,
    nowMs,
    forecast: f,
    guide: g,
    sunriseMs: p.sunriseMs,
    sunsetMs: p.sunsetMs,
    elongation: p.elongation,
  };
}

/** A 2D context that draws nothing and remembers the words it was asked to draw. */
function fakeContext(words: string[]): CanvasRenderingContext2D {
  const state: Record<string, unknown> = { font: "10px serif" };
  const gradient = { addColorStop: () => undefined };
  return new Proxy(state, {
    get(t, key: string) {
      if (key === "measureText") {
        return (s: string) => ({ width: s.length * (Number.parseFloat(/(\d+(?:\.\d+)?)px/.exec(String(t.font))?.[1] ?? "10") * 0.5) });
      }
      if (key === "createLinearGradient" || key === "createRadialGradient") return () => gradient;
      if (key === "fillText") return (s: string) => void words.push(s);
      if (key in t) return t[key];
      return () => undefined;
    },
    set(t, key: string, value) {
      t[key] = value;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
}

const PAL: Palette = paletteFrom(null);
const chars = (s: string) => s.length * 10;

describe("share cards: words", () => {
  it("keeps only the first name, and one letter for a disc", () => {
    expect(firstName("  Rahul  Tarigoppula ")).toBe("Rahul");
    expect(firstName("")).toBe("");
    expect(initialOf("priya lakshmi")).toBe("P");
    expect(initialOf("")).toBe("");
  });

  it("writes a span of hours once when both ends share am or pm", () => {
    expect(compactSpan("9:12 am", "10:08 am")).toBe("9:12–10:08 am");
    expect(compactSpan("11:40 am", "12:36 pm")).toBe("11:40 am–12:36 pm");
    expect(compactSpan("09:12", "10:08")).toBe("09:12–10:08");
  });

  it("wraps on words, breaks a word wider than the line, and ends what does not fit with an ellipsis", () => {
    expect(wrapLines("one two three four", 90, chars)).toEqual(["one two", "three", "four"]);
    expect(wrapLines("Venkatasubramanian", 80, chars)).toEqual(["Venkatas", "ubramani", "an"]);
    const cut = wrapLines("a quiet day by tradition, finish old work", 100, chars, 2);
    expect(cut).toHaveLength(2);
    expect(cut[1]?.endsWith("…")).toBe(true);
    expect(cut.every((l) => chars(l) <= 100)).toBe(true);
    expect(wrapLines("   ", 100, chars)).toEqual([]);
  });

  it("splits a list of hours into even rows", () => {
    expect(rowsOf(["a", "b", "c"])).toEqual([["a", "b", "c"]]);
    expect(rowsOf(["a", "b", "c", "d"])).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
    expect(rowsOf([])).toEqual([]);
  });

  it("finds the unlit parts of the Sun's path", () => {
    expect(
      gapsOf([
        [0.2, 0.4],
        [0.6, 0.7],
        [0.35, 0.5],
      ]),
    ).toEqual([
      [0, 0.2],
      [0.5, 0.6],
      [0.7, 1],
    ]);
    expect(gapsOf([[0, 1]])).toEqual([]);
  });

  it("reads a gradient token and a colour at an alpha without any colour written here", () => {
    const hex = `#${"0d1638"}`;
    expect(parseGradient(`linear-gradient(180deg, ${hex} 0%, rgba(1, 2, 3, 0.5) 48%, tomato 100%)`)).toEqual([
      { at: 0, color: hex },
      { at: 0.48, color: "rgba(1, 2, 3, 0.5)" },
      { at: 1, color: "tomato" },
    ]);
    expect(withAlpha(`#${"ffd98a"}`, 0.5)).toBe("rgba(255, 217, 138, 0.5)");
    expect(withAlpha(`#${"fff"}`, 0)).toBe("rgba(255, 255, 255, 0)");
    expect(withAlpha("khaki", 0.2)).toBe("transparent");
    expect(withAlpha("khaki", 0.9)).toBe("khaki");
  });

  it("keeps the sky quiet where words stand, and overlaps the discs by the score", () => {
    const box = [[100, 100, 200, 140]] as const;
    expect(quietAt(150, 120, box)).toBe(0);
    expect(quietAt(150, 153, box, 26)).toBeCloseTo(0.5);
    expect(quietAt(500, 500, box)).toBe(1);
    expect(pairGap(0, 100)).toBe(200);
    expect(pairGap(100, 100)).toBeCloseTo(20);
    expect(pairGap(50, 100)).toBeCloseTo(110);
  });
});

describe("share cards: what each card says", () => {
  const day: DayCardData = dayCard(dayInput(NOON));
  const match: MatchCardData = matchCard({ a: RAHUL.name, b: PRIYA.name, result });
  const stars: StarsCardData = starsCard({ profile: RAHUL, patri: patA }, null);

  it("My day: the date, the first name, the word and score, the headline and the best hours", () => {
    const t = dayText(day, { hideName: false });
    expect(t.title).toBe("Rahul’s day");
    expect(t.eyebrow).toBe("Tuesday 17 November 2026");
    expect(["Strong", "Good", "Mixed", "Go gently"]).toContain(t.word);
    expect(t.score).toMatch(/^\d{1,3} of 100$/);
    expect(t.headline).toBe(dayInput(NOON).forecast.headline);
    expect(t.hours.length).toBeGreaterThan(0);
    expect(t.pause).toMatch(/^Pause new starts \d/);
    expect(t.footer).toBe(FOOTER);
    expect(t.alt).toContain(t.headline);
    expect(t.alt).toContain("Best hours");
  });

  it("My day: hiding the name leaves no trace of it", () => {
    const t = dayText(day, { hideName: true });
    expect(t.title).toBe("My day");
    expect(JSON.stringify(t)).not.toContain("Rahul");
  });

  it("Our match: initials, the word, the score of 100 and N of 36 by tradition", () => {
    const t = matchText(match, { hideName: false });
    expect(t.title).toBe("Rahul & Priya");
    expect(t.initials).toEqual(["R", "P"]);
    expect(t.score).toBe(`${Math.round((result.total / 36) * 100)} of 100`);
    expect(t.tradition).toBe(`${Number.isInteger(result.total) ? result.total : result.total.toFixed(1)} of 36 by tradition`);
    expect(t.line).toMatch(/^Rahul and Priya /);
    expect(JSON.stringify(t)).not.toMatch(/Tarigoppula|Lakshmi/);
  });

  it("Our match: hiding the names drops the initials and speaks as “we”", () => {
    const t = matchText(match, { hideName: true });
    expect(t.title).toBe("Our match");
    expect(t.initials).toEqual(["", ""]);
    expect(t.line).toMatch(/^We /);
    expect(JSON.stringify(t)).not.toMatch(/Rahul|Priya/);
  });

  it("My stars: Moon sign, birth star and rising sign in plain words with the Sanskrit beneath", () => {
    const t = starsText(stars, { hideName: false });
    expect(t.title).toBe("Rahul");
    expect(t.facts.map((f) => f.label)).toEqual(["Moon sign", "Birth star", "Rising sign"]);
    for (const f of t.facts) {
      expect(f.value.length).toBeGreaterThan(2);
      expect(f.sanskrit).toMatch(/[ऀ-ॿ]/); // Devanagari beneath
    }
    const hidden = starsText(stars, { hideName: true });
    expect(hidden.title).toBe("My stars");
    expect(JSON.stringify(hidden)).not.toContain("Rahul");
  });

  it("My stars: an unknown birth time does not claim a rising sign", () => {
    const facts = starsFacts({ ...RAHUL, timeUnknown: true }, patA);
    expect(facts[2]).toEqual({ label: "Rising sign", value: "Not known", sanskrit: "Lagna needs a birth time" });
  });

  it("no card carries a birth date, time or place, or more than a first name", () => {
    for (const d of [day, match, stars] as CardData[]) {
      for (const hideName of [false, true]) {
        const said =
          d.kind === "day" ? dayText(d, { hideName }) : d.kind === "match" ? matchText(d, { hideName }) : starsText(d, { hideName });
        const all = JSON.stringify(said);
        expect(all).not.toMatch(/1994|1996|Bengaluru|Karnataka|7:25|07:25|Tarigoppula|Lakshmi/);
        expect(cardAlt(d, { hideName })).toBe(said.alt);
      }
    }
    expect(cardFilename("day")).toBe("vyomaphala-my-day.png");
    expect(cardFilename("match")).toBe("vyomaphala-our-match.png");
    expect(cardFilename("stars")).toBe("vyomaphala-my-stars.png");
  });

  it("joins good hours that follow one another", () => {
    const h = (a: number, b: number) => ({ startMs: a * 60_000, endMs: b * 60_000 });
    expect(mergeHours([h(60, 120), h(0, 60), h(180, 240)])).toEqual([
      [0, 120 * 60_000],
      [180 * 60_000, 240 * 60_000],
    ]);
  });

  it("draws the Sun on its arc by day and the Moon after dark; another day is shown whole", () => {
    const i = dayInput(NOON);
    const noon = dayDial(i);
    expect(noon.isDay).toBe(true);
    expect(noon.body).toBeGreaterThan(0.3);
    expect(noon.body).toBeLessThan(0.7);
    expect(noon.good).toHaveLength(i.guide.bestHours.length);
    for (const [a, b] of noon.good) expect(a).toBeLessThan(b);
    const night = dayDial({ ...i, nowMs: i.sunsetMs + 3 * 3_600_000 });
    expect(night.isDay).toBe(false);
    expect(night.phase).toBe("night");
    expect(night.elongation).toBe(i.elongation);
    const other = dayDial({ ...i, nowMs: NOON + 5 * 86_400_000 });
    expect(other.phase).toBe("day");
    expect(other.body).toBeCloseTo(0.5);
  });

  it("keeps the Moon, its star's stretch and the sign names true without the star catalogue", () => {
    expect(stars.sky.stars).toEqual([]);
    expect(stars.sky.band[1] - stars.sky.band[0]).toBeCloseTo(360 / 27);
    expect(stars.sky.band[0]).toBeLessThanOrEqual(0);
    expect(stars.sky.band[1]).toBeGreaterThanOrEqual(0);
    expect(stars.sky.signs.length).toBeGreaterThan(0);
    expect(stars.sky.moonLat).toBe(patA.grahas.MO.latEcliptic);
  });

  it("draws every card, named and unnamed, with the footer and without clipping the canvas size", () => {
    for (const d of [day, match, stars] as CardData[]) {
      const named: string[] = [];
      drawCard(fakeContext(named), d, { hideName: false }, PAL);
      expect(named).toContain(FOOTER);
      expect(named.join(" ")).toContain(d.kind === "match" ? "Rahul & Priya" : "Rahul");
      const hidden: string[] = [];
      drawCard(fakeContext(hidden), d, { hideName: true }, PAL);
      expect(hidden).toContain(FOOTER);
      expect(hidden.join(" ")).not.toMatch(/Rahul|Priya/);
    }
    expect([CARD_W, CARD_H]).toEqual([1080, 1350]);
  });
});

describe("ShareButton", () => {
  const drawn: string[] = [];
  const anchors: string[] = [];
  const nav = navigator as Navigator & { share?: unknown; canShare?: unknown };

  beforeEach(() => {
    drawn.length = 0;
    anchors.length = 0;
    useUi.setState({ toasts: [] });
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation((() => fakeContext(drawn)) as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function toBlob(cb: BlobCallback) {
      cb(new Blob(["png"], { type: "image/png" }));
    });
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue("data:image/png;base64,AAAA");
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(function click(this: HTMLAnchorElement) {
      anchors.push(this.download);
    });
  });
  afterEach(() => {
    vi.restoreAllMocks();
    delete nav.share;
    delete nav.canShare;
  });

  async function openMatch() {
    render(<ShareButton kind="match" a={RAHUL.name} b={PRIYA.name} result={result} />);
    fireEvent.click(screen.getByRole("button", { name: "Share this match as a picture" }));
    const card = await screen.findByRole("img", { name: /the match of Rahul and Priya/ });
    await waitFor(() => expect(screen.getByRole("button", { name: "Share" })).toBeEnabled());
    return card;
  }

  it("opens a sheet with a live preview that says in words what the card says", async () => {
    const card = await openMatch();
    expect(card.tagName).toBe("CANVAS");
    expect(card).toHaveAttribute("width", "1080");
    expect(card).toHaveAttribute("height", "1350");
    expect(card.getAttribute("aria-label")).toContain("of 36 by tradition");
    expect(drawn).toContain("Rahul & Priya");
    expect(drawn).toContain(FOOTER);
    expect(screen.getByRole("button", { name: "Save image" })).toBeEnabled();
  });

  it("“Hide our names” redraws the card without them", async () => {
    await openMatch();
    const toggle = screen.getByRole("switch", { name: /Hide our names/ });
    expect(toggle).toHaveAttribute("aria-checked", "false");
    drawn.length = 0;
    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-checked", "true");
    const card = await screen.findByRole("img", { name: /our match/ });
    expect(card.getAttribute("aria-label")).not.toMatch(/Rahul|Priya/);
    await waitFor(() => expect(drawn).toContain("Our match"));
    expect(drawn.join(" ")).not.toMatch(/Rahul|Priya/);
  });

  it("shares the picture as a PNG file where the browser can", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    nav.share = share;
    nav.canShare = vi.fn().mockReturnValue(true);
    await openMatch();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    const data = share.mock.calls[0]?.[0] as ShareData;
    expect(data.files).toHaveLength(1);
    const file = data.files?.[0];
    expect(file).toBeInstanceOf(File);
    expect(file?.name).toBe("vyomaphala-our-match.png");
    expect(file?.type).toBe("image/png");
    expect(data.title).toBe("Our match");
    expect(anchors).toEqual([]);
    expect(useUi.getState().toasts).toEqual([]);
  });

  it("stays quiet when the share sheet is closed without choosing", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("Share canceled", "AbortError"));
    nav.share = share;
    nav.canShare = vi.fn().mockReturnValue(true);
    await openMatch();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByRole("button", { name: "Share" })).toBeEnabled());
    expect(anchors).toEqual([]);
    expect(useUi.getState().toasts).toEqual([]);
  });

  it("saves the picture instead where sharing a file is not supported, and on Save image", async () => {
    await openMatch();
    fireEvent.click(screen.getByRole("button", { name: "Share" }));
    await waitFor(() => expect(anchors).toEqual(["vyomaphala-our-match.png"]));
    expect(useUi.getState().toasts.map((t) => t.kind)).toEqual(["info"]);
    fireEvent.click(screen.getByRole("button", { name: "Save image" }));
    await waitFor(() => expect(anchors).toHaveLength(2));
  });

  it("draws the day and the stars cards too (the stars even without the catalogue)", async () => {
    const { unmount } = render(<ShareButton kind="day" {...dayInput(NOON)} />);
    fireEvent.click(screen.getByRole("button", { name: "Share this day as a picture" }));
    expect(await screen.findByRole("img", { name: /Rahul’s day, Tuesday 17 November 2026/ })).toBeInTheDocument();
    await waitFor(() => expect(drawn).toContain("Rahul’s day"));
    unmount();
    drawn.length = 0;
    render(<ShareButton kind="stars" profile={RAHUL} patri={patA} iconOnly />);
    fireEvent.click(screen.getByRole("button", { name: "Share these stars as a picture" }));
    expect(await screen.findByRole("img", { name: /the stars of Rahul/ })).toBeInTheDocument();
    await waitFor(() => expect(drawn).toContain("MOON SIGN"));
  });
});
