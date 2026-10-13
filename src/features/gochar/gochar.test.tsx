import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { gocharReport, sadeSati } from "../../engine/gochar";
import { MS_PER_DAY } from "../../engine/math";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET, type Patri } from "../../engine/types";
import { BANNED_WORDS } from "../../test/banned-words";
import { fmtDate, yearSpan } from "./format";
import { forgetSadeSati } from "./GocharSection";
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
    expect(screen.getByRole("status")).toHaveTextContent(/Reckoning Śani's spells/);
    expect(container.querySelector(".ink-wait")).not.toBeNull();
    expect(screen.queryAllByRole("tab")).toHaveLength(0);
    expect(await screen.findAllByRole("tab", {}, { timeout: 5000 })).not.toHaveLength(0);
    expect(container.querySelector(".ink-wait")).toBeNull();
  });

  it("is instant on a revisit (the spells are kept for the session)", () => {
    render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    expect(screen.getAllByRole("tab").length).toBeGreaterThan(0);
  });

  it("renders the band, a nine-row ledger with text marks, and cited readings", async () => {
    const { container } = render(<GocharSection patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    await screen.findAllByRole("tab", {}, { timeout: 5000 });
    expect(screen.getByRole("heading", { name: /Transits now/ })).toBeInTheDocument();
    const table = screen.getByRole("table");
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
    for (const el of container.querySelectorAll("[lang]")) expect(["hi", "sa"]).toContain(el.getAttribute("lang"));
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
  const at = Date.UTC(2022, 8, 1); // Sep 2022: Śani back in Makara for a while, inside the 2022–30 spell
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
  it("shows Tārā-bala, Candra-bala and the running daśā with a progress rule", () => {
    const { container } = render(<DailyStrengthCard patri={patri} nowMs={NOW} zone="Asia/Kolkata" />);
    expect(screen.getByRole("region", { name: "Today's strengths" })).toBeInTheDocument();
    expect(container.querySelector(".engraved")?.textContent).toMatch(/12 OCT/);
    expect(container.textContent).toMatch(/Tārā\s*\d \S+/);
    expect(container.textContent).toMatch(/Candra\s*\d+(st|nd|rd|th)/);
    expect(container.textContent).toMatch(/until \d{1,2} \w{3} 20\d\d/);
    const bar = screen.getByRole("progressbar");
    const v = Number(bar.getAttribute("aria-valuenow"));
    expect(v).toBeGreaterThanOrEqual(0);
    expect(v).toBeLessThanOrEqual(100);
    const text = (container.textContent ?? "").toLowerCase();
    for (const w of BANNED_WORDS) expect(text).not.toContain(w);
  });
});
