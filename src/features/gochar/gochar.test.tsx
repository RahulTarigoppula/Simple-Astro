import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { ORDINAL } from "../../data/tables/names";
import { HOUSE_THEME } from "../../engine/ashtakavarga";
import { chandraBala, gocharReport, moonTransitAt, sadeSati, taraBala } from "../../engine/gochar";
import { MS_PER_DAY } from "../../engine/math";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET, type Patri } from "../../engine/types";
import { BANNED_WORDS } from "../../test/banned-words";
import { fmtDate, yearSpan } from "./format";
import { forgetSadeSati, seasonNow } from "./GocharSection";
import { DailyStrengthCard, GocharSection, gocharReadings } from "./index";

const NOW = Date.UTC(2026, 9, 12, 6); // 12 Oct 2026, 11:30 IST
const YEAR = 365.25 * MS_PER_DAY;
let patri: Patri;

beforeAll(() => {
  if (!("animate" in Element.prototype)) {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: () => ({ cancel() {}, finish() {}, onfinish: null }),
    });
  }
  patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
});

describe("format", () => {
  it("prints dates in the given zone, not the device's", () => {
    const lateUtc = Date.UTC(2025, 2, 28, 20, 0); // 01:30 IST on the 29th
    expect(fmtDate(lateUtc, "Asia/Kolkata")).toBe("29 Mar 2025");
    expect(fmtDate(lateUtc, "America/New_York")).toBe("28 Mar 2025");
    expect(fmtDate(lateUtc, "Not/AZone")).toBe("28 Mar 2025"); // falls back to UTC
    expect(yearSpan(Date.UTC(2022, 3, 1), Date.UTC(2030, 3, 1), "UTC")).toBe("2022-30");
  });
});

describe("GocharSection", () => {
  it("reckons Śani's spells after first paint, with an ink line meanwhile", async () => {
    forgetSadeSati();
    const { container } = render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    expect(screen.getByRole("status")).toHaveTextContent(/Working out Saturn's seasons/);
    expect(container.querySelector(".ink-wait")).not.toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(await screen.findAllByRole("tab", {}, { timeout: 5000 })).not.toHaveLength(0);
    expect(container.querySelector(".ink-wait")).toBeNull();
  });

  it("is instant on a revisit (the spells are kept for the session)", () => {
    render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("says Saturn's season in plain words first: which, since when, until when, and tradition's line", async () => {
    const { container } = render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    await screen.findAllByRole("tab", {}, { timeout: 5000 });
    const season = container.querySelector(".gochar-season") as HTMLElement;
    expect(season).toHaveTextContent("You are in Saturn's long season, about seven and a half years.");
    expect(season).toHaveTextContent("It began in Apr 2022 and closes around");
    expect(season).toHaveTextContent("You are in its peak part, with Saturn in Mīna, until 3 Jun 2027.");
    expect(season).toHaveTextContent(/Tradition says this is a season that asks for patience/);
    expect(season).toHaveTextContent(/Source: .+, Sāḍe-sātī/);
    // the plain words come before the ribbon and the folded table
    const fold = container.querySelector("details.v-fold") as HTMLDetailsElement;
    expect(fold.open).toBe(false);
    expect(season.compareDocumentPosition(fold) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(fold).getByText("Where the planets are now").closest("summary")).not.toBeNull();
    // the season tabs read plain first, the Sanskrit name small
    const sel = screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true");
    expect(sel).toHaveTextContent("Long season");
    expect(sel).toHaveTextContent("Sāḍe-sātī");
  });

  it("seasonNow covers a short season, a stepped-back Saturn, and no season at all", () => {
    const birth = REFERENCE_PROFILE.birth.utcMs;
    const ss = sadeSati(patri, birth - 3 * YEAR, birth + 92 * YEAR);
    const short = seasonNow(ss, Date.UTC(2013, 0, 1), "UTC");
    expect(short.title).toMatch(/shorter seasons/);
    expect(short.term).toMatch(/^Aṣṭama Śani: Saturn in the 8th from the Moon$/);
    expect(short.when).toMatch(/^It began in \w{3} 20\d\d and is read until about \w{3} 20\d\d\.$/);
    const none = seasonNow(ss, Date.UTC(2015, 0, 1), "Asia/Kolkata");
    expect(none.title).toBe("None of Saturn's seasons is running now.");
    expect(none.when).toMatch(/The next long season begins around Apr 2022/);
    expect(none.cite).toEqual({ text: "Later tradition", ref: "Sāḍe-sātī" });
    const back = seasonNow(ss, Date.UTC(2022, 8, 1), "Asia/Kolkata");
    expect(back.when).toMatch(/Saturn has stepped back for a while and returns to Kumbha on \d{1,2} \w{3} 2023\./);
  });

  it("opens the planets fold when asked to (print)", () => {
    const { container } = render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" forceOpen />);
    expect((container.querySelector("details.v-fold") as HTMLDetailsElement).open).toBe(true);
  });

  it("keeps the nine-row table with text marks and the cited readings, inside the fold", async () => {
    const { container } = render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    await screen.findAllByRole("tab", {}, { timeout: 5000 });
    // plain English heads the section; the Sanskrit terms follow in small text, each with its ⓘ
    expect(screen.getByRole("heading", { level: 2, name: "Saturn's long seasons" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "What tradition says" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What is Gochar/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What is Sāḍe-sātī/ })).toBeInTheDocument();
    const table = container.querySelector("details.v-fold table.gochar__ledger") as HTMLElement;
    expect(table).not.toBeNull();
    expect(within(table).getByRole("row", { name: /^Saturn/ })).toHaveTextContent("Śani");
    expect(within(table).getAllByText(/^from the rising sign$/)).toHaveLength(9);
    const rows = within(table).getAllByRole("row");
    expect(rows).toHaveLength(10); // header + nine grahas
    const report = gocharReport(patri, NOW);
    const favCount = report.entries.filter((e) => e.favourable).length;
    expect(within(table).getAllByText(/favourable$/).length).toBe(favCount);
    expect(within(table).getAllByText("not among the favourable houses").length).toBe(9 - favCount);
    const readings = container.querySelectorAll(".gochar__reading");
    expect(readings.length).toBeGreaterThanOrEqual(2);
    expect(readings.length).toBeLessThanOrEqual(3);
    for (const r of readings) {
      expect(r.textContent).toMatch(/^Tradition says/);
      expect(r.querySelector(".gochar__src")?.textContent?.length).toBeGreaterThan(3);
    }
    const text = (container.textContent ?? "").toLowerCase();
    for (const w of BANNED_WORDS) expect(text).not.toContain(w);
    expect(container.querySelectorAll("[lang]")).toHaveLength(0); // no Devanagari-first headings
  });

  it("opens on the running Sāḍe-sātī and its tabs are keyboard-navigable", async () => {
    render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    const tabs = await screen.findAllByRole("tab", {}, { timeout: 5000 });
    const selected = tabs.find((t) => t.getAttribute("aria-selected") === "true");
    expect(selected?.getAttribute("aria-label")).toMatch(/Sāḍe-sātī, 29 Apr 2022 .* running now/);
    expect(selected?.tabIndex).toBe(0);
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/29 Mar 2025 → 3 Jun 2027/)).toBeInTheDocument(); // the peak
    expect(within(panel).getAllByText(/again/).length).toBeGreaterThan(0); // retrograde re-entries
    if (!selected) throw new Error("no tab");
    fireEvent.keyDown(selected, { key: "ArrowLeft" });
    const now = screen.getAllByRole("tab").find((t) => t.getAttribute("aria-selected") === "true");
    expect(now).not.toBe(selected);
    expect(now?.getAttribute("aria-label")).toMatch(/Śani/);
    expect(document.activeElement).toBe(now);
    fireEvent.keyDown(now as HTMLElement, { key: "Home" });
    expect(screen.getAllByRole("tab")[0]?.getAttribute("aria-selected")).toBe("true");
  });

  it("speaks of the next spell when none is running", () => {
    const at = Date.UTC(2015, 0, 1);
    const birth = REFERENCE_PROFILE.birth.utcMs;
    const ss = sadeSati(patri, birth - 3 * YEAR, birth + 92 * YEAR);
    const rs = gocharReadings(gocharReport(patri, at), ss, at, "Asia/Kolkata");
    const sade = rs.find((r) => r.key === "sade");
    expect(sade?.text).toMatch(/next one begins around Apr 2022/);
    expect(sade?.cite).toEqual({ text: "Later tradition", ref: "Sāḍe-sātī" });
    // Jan 2015 falls just after Śani's Tulā (8th) stretch closed in Nov 2014
    expect(rs.find((r) => r.key === "short")).toBeUndefined();
    const inAshtama = gocharReadings(gocharReport(patri, Date.UTC(2013, 0, 1)), ss, Date.UTC(2013, 0, 1), "UTC");
    expect(inAshtama.find((r) => r.key === "short")?.text).toMatch(/^Tradition says Śani in the 8th/);
  });
});

describe("Śani stepped back by retrogression", () => {
  const birth = REFERENCE_PROFILE.birth.utcMs;
  const at = Date.UTC(2022, 8, 1); // Sep 2022: Śani back in Makara for a while, inside the 2022-30 spell
  it("names the return sign and date instead of a broken phase", () => {
    const ss = sadeSati(patri, birth - 3 * YEAR, birth + 92 * YEAR);
    const running = ss.spells.find((s) => s.kind === "sade-sati" && at >= s.startMs && at < s.endMs);
    expect(running).toBeDefined();
    expect(running?.intervals.some((i) => at >= i.startMs && at < i.endMs)).toBe(false);
    const sade = gocharReadings(gocharReport(patri, at), ss, at, "Asia/Kolkata").find((r) => r.key === "sade");
    expect(sade?.text).toMatch(/stepped back out of these signs by retrogression and returns to Kumbha on \d{1,2} \w{3} 2023/);
    expect(sade?.text).not.toMatch(/its ,/);
  });
  it("the ribbon tab says paused, not running now", async () => {
    render(<GocharSection patri={patri} nowMs={at} zone="Asia/Kolkata" />);
    const tabs = await screen.findAllByRole("tab", {}, { timeout: 5000 });
    const labels = tabs.map((t) => t.getAttribute("aria-label") ?? "");
    expect(labels.some((l) => /paused while Śani stepped back/.test(l))).toBe(true);
    expect(labels.some((l) => /running now/.test(l))).toBe(false);
  });
});

describe("SadeSatiRibbon", () => {
  it("prints every spell's phases in a print-only table", async () => {
    const { container } = render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    await screen.findAllByRole("tab", {}, { timeout: 5000 });
    const table = container.querySelector("table.print-only");
    expect(table).not.toBeNull();
    expect(table?.textContent).toMatch(/dates in Asia\/Kolkata/);
    expect(table?.textContent).toMatch(/Sāḍe-sātī · Peak/);
    expect(table?.textContent).toMatch(/29 Mar 2025 → 3 Jun 2027/);
  });
  it("starts afresh on another patri", async () => {
    const other = computePatri(
      {
        ...REFERENCE_PROFILE,
        id: "other-leaf",
        birth: {
          ...REFERENCE_PROFILE.birth,
          utcMs: REFERENCE_PROFILE.birth.utcMs + 200 * MS_PER_DAY,
          jdUt: REFERENCE_PROFILE.birth.jdUt + 200,
        },
      },
      DEFAULT_PRESET,
      0,
    );
    const { rerender } = render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    const tabs = await screen.findAllByRole("tab", {}, { timeout: 5000 });
    const last = tabs[tabs.length - 1];
    if (!last) throw new Error("no tab");
    fireEvent.keyDown(tabs.find((t) => t.tabIndex === 0) as HTMLElement, { key: "End" });
    expect(last.getAttribute("aria-selected")).toBe("true");
    rerender(<GocharSection patri={other} nowMs={NOW} zone="Asia/Kolkata" />);
    const fresh = await screen.findAllByRole("tab", {}, { timeout: 5000 });
    const sel = fresh.filter((t) => t.getAttribute("aria-selected") === "true");
    expect(sel).toHaveLength(1);
    // the opening spell for the new leaf: the one running at NOW, or else the next one
    const ob = other.jdUt;
    const birthMs = Math.round((ob - 2440587.5) * MS_PER_DAY);
    const os = sadeSati(other, birthMs - 3 * YEAR, birthMs + 92 * YEAR).spells.filter((s) => s.endMs > birthMs);
    const open = os.find((s) => NOW >= s.startMs && NOW < s.endMs) ?? os.find((s) => s.startMs > NOW);
    expect(sel[0]?.getAttribute("aria-label")).toContain(fmtDate(open?.startMs ?? 0, "Asia/Kolkata"));
  });
});

describe("DailyStrengthCard", () => {
  it("answers in one plain sentence, then three plain chips with the Sanskrit small and a progress rule", () => {
    const { container } = render(<DailyStrengthCard patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    const card = screen.getByRole("region", { name: "Today for this chart" });
    expect(card).toHaveTextContent("Today · 12 Oct");
    const moonNow = moonTransitAt(NOW, patri.preset);
    const chandra = chandraBala(patri.grahas.MO.sign, moonNow.sign);
    const tara = taraBala(patri.grahas.MO.nakshatra, moonNow.nakshatra);
    const h = within(card).getByRole("heading", { level: 2 });
    expect(h).toHaveTextContent(
      new RegExp(`^Today the Moon is in your ${ORDINAL(chandra.house)} area: ${HOUSE_THEME[chandra.house - 1]}\\. The day's star `),
    );
    expect(h.textContent).not.toMatch(/Tārā|bala|Janma|daśā/); // no jargon in the answer
    const chips = Array.from(card.querySelectorAll(".v-chip")).map((c) => c.textContent?.replace(/^[✓·~] /, ""));
    expect(chips).toEqual([
      `Moon's support: ${chandra.favourable ? "good" : "quiet"}`,
      `Day's star: ${{ kind: "kind", unkind: "asks care", mixed: "mixed" }[tara.tone]}`,
      expect.stringMatching(/^Life chapter: \w+$/),
    ]);
    expect(container.textContent).toContain(`Tārā-bala · Tārā ${tara.tara} ${tara.name}`);
    expect(container.textContent).toMatch(/Candra-bala · today's Moon is in the \d+(st|nd|rd|th) sign from yours/);
    expect(container.textContent).toMatch(/Daśā · \w+ · \w+ · \w+/);
    expect(screen.getByRole("button", { name: /What is Candra-bala/ })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /What is daśā/ })).toBeInTheDocument();
    expect(container.textContent).toMatch(/runs until \d{1,2} \w{3} 20\d\d/);
    expect(screen.getByRole("button", { name: /What is Tārā-bala/ })).toBeInTheDocument();
    const bar = screen.getByRole("progressbar");
    const v = Number(bar.getAttribute("aria-valuenow"));
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
    const text = (container.textContent ?? "").toLowerCase();
    for (const w of BANNED_WORDS) expect(text).not.toContain(w);
  });
});
