import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { litPath } from "./MoonPager";
import TodayScreen from "./TodayScreen";
import { endsLabel, rangeLabel, zoneClock } from "./zone";

beforeAll(() => {
  // jsdom has no Web Animations; the ink line only needs the call to exist.
  if (!("animate" in Element.prototype)) {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: () => ({ cancel() {}, finish() {}, onfinish: null }),
    });
  }
});

function renderToday() {
  const router = createMemoryRouter(
    [
      { path: "/today", element: <TodayScreen /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: ["/today"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("zone clock", () => {
  it("prints the place's clock, not the device's", () => {
    const c = zoneClock("Asia/Kolkata");
    const t = Date.UTC(2026, 9, 6, 11, 34, 12); // 17:04:12 IST
    expect(c.hm(t)).toBe("17:04");
    expect(c.hms(t)).toBe("17:04:12");
    expect(c.offset(t)).toBe("UTC+05:30");
    expect(c.hours(t)).toBeCloseTo(17 + 4 / 60 + 12 / 3600, 6);
  });
  it("marks an end on the next civil day with +1", () => {
    const c = zoneClock("Asia/Kolkata");
    const rise = Date.UTC(2026, 9, 6, 0, 40); // 06:10 IST
    const end = Date.UTC(2026, 9, 6, 19, 4); // 00:34 IST next day
    expect(endsLabel(c, end, rise)).toBe("ends 00:34 +1");
    expect(rangeLabel(c, [Date.UTC(2026, 9, 6, 9, 52), Date.UTC(2026, 9, 6, 11, 24)])).toBe("15:22-16:54");
  });
  it("survives an unknown zone", () => {
    expect(zoneClock("Not/AZone").zone).toBe("UTC");
  });
});

describe("Moon terminator", () => {
  it("is empty at Amāvasyā and a full disc at Pūrṇimā", () => {
    expect(litPath(0, true, false)).toBe("");
    const full = litPath(1, true, false);
    expect(full).toMatch(/^M50 4A46 46 0 0 1 50 96A46\.00 46 0 0 1 50 4Z$/);
  });
  it("lights the right limb waxing in the north and the left limb waning", () => {
    expect(litPath(0.25, true, false)).toContain("A46 46 0 0 1"); // right limb
    expect(litPath(0.25, false, false)).toContain("A46 46 0 0 0"); // left limb
    expect(litPath(0.25, true, true)).toContain("A46 46 0 0 0"); // southern sky flips
  });
});

describe("TodayScreen", { timeout: 60_000 }, () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.settings.clear();
  });

  it("reads Bengaluru when the bundle is empty and prints end times in mono", async () => {
    renderToday();
    expect(await screen.findByRole("heading", { level: 1, name: /Today/ })).toBeInTheDocument();
    expect(await screen.findByText(/the dial reads Bengaluru/)).toBeInTheDocument();
    const tithi = await screen.findByRole("button", { name: /^Tithi/ });
    expect(within(tithi).getByText(/^ends \d{2}:\d{2}( \+\d)?$/)).toBeInTheDocument();
    expect(within(tithi).getByText(/[ऀ-ॿ]/, { selector: "[lang='hi']" })).toBeInTheDocument();
    const rahu = screen.getByRole("button", { name: /^Rāhu Kāla/ });
    expect(rahu.textContent).toMatch(/\d{2}:\d{2}-\d{2}:\d{2}/);
    expect(screen.getByRole("img", { name: /Brass dial/ })).toBeInTheDocument();
  });

  it("pages days with the Moon pager and comes back to today", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("button", { name: "Next day" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Tomorrow/ }, { timeout: 20_000 })).toBeInTheDocument();
    expect(screen.getByText(/Read at sunrise/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Yesterday/ }, { timeout: 20_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "back to today" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Today/ })).toBeInTheDocument();
  });

  it("opens a footnote with the exact end instant, the zone and the conventions", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("button", { name: /^Nakṣatra/ }, { timeout: 5000 }));
    const dlg = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dlg).getByText(/\d{2}:\d{2}:\d{2} · \w+day, \d+ \w+ \d{4}/)).toBeInTheDocument());
    expect(within(dlg).getByText(/Asia\/Kolkata · UTC\+05:30/)).toBeInTheDocument();
    expect(within(dlg).getByText(/upper limb on a refracted horizon/)).toBeInTheDocument();
    expect(within(dlg).getByText(/Lahiri/)).toBeInTheDocument();
  });

  it("prints Brahma-muhūrta and Godhūli in the Kāla section", async () => {
    renderToday();
    const brahma = await screen.findByRole("button", { name: /^Brahma-muhūrta/ }, { timeout: 5000 });
    expect(brahma.textContent).toMatch(/\d{2}:\d{2}-\d{2}:\d{2}/);
    expect(screen.getByRole("button", { name: /^Godhūli/ }).textContent).toMatch(/\d{2}:\d{2}-\d{2}:\d{2}/);
  });

  it("lists the day and night choghaḍiyās with quality in words and at most one 'now'", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("tab", { name: "Choghaḍiyā" }, { timeout: 5000 }));
    expect(screen.getByRole("tab", { name: "Choghaḍiyā" })).toHaveAttribute("aria-selected", "true");
    const day = screen.getByRole("list", { name: "Day choghaḍiyā" });
    const night = screen.getByRole("list", { name: "Night choghaḍiyā" });
    for (const list of [day, night]) {
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(8);
      for (const li of items) {
        expect(li.textContent).toMatch(/good|neutral|bad/);
        expect(li.textContent).toMatch(/\d{2}:\d{2}-\d{2}:\d{2}/);
        expect(li.querySelector("[lang='hi']")).not.toBeNull();
      }
    }
    expect(document.querySelectorAll("[aria-current='time']").length).toBeLessThanOrEqual(1);
    expect(screen.getByText(/Muhūrta tradition, Choghaḍiyā/)).toBeInTheDocument();
  });

  it("lists twelve horās by day and by night, the first the weekday lord's", async () => {
    renderToday();
    const vara = (await screen.findByRole("button", { name: /^Vāra/ }, { timeout: 5000 })).textContent ?? "";
    fireEvent.click(screen.getByRole("tab", { name: "Horā" }));
    const day = within(screen.getByRole("list", { name: "Day horās" })).getAllByRole("listitem");
    expect(day).toHaveLength(12);
    expect(within(screen.getByRole("list", { name: "Night horās" })).getAllByRole("listitem")).toHaveLength(12);
    const lord: Record<string, string> = {
      Ravivāra: "Sūrya",
      Somavāra: "Candra",
      Maṅgalavāra: "Maṅgala",
      Budhavāra: "Budha",
      Guruvāra: "Guru",
      Śukravāra: "Śukra",
      Śanivāra: "Śani",
    };
    const w = Object.keys(lord).find((k) => vara.includes(k)) ?? "";
    expect(day[0]?.textContent).toContain(lord[w]);
  });

  it("shows the month as a keyboard grid and loads a tapped day in the ledger", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("tab", { name: "Month" }, { timeout: 5000 }));
    const grid = await screen.findByRole("grid");
    expect(grid.querySelector("button[aria-current='date']")).not.toBeNull();
    // The roving tab stop sits on the leaf's day, which before sunrise is the civil yesterday.
    const today = grid.querySelector<HTMLButtonElement>("button[tabindex='0']");
    expect(today).not.toBeNull();
    if (!today) return;
    expect(today.getAttribute("aria-label")).toMatch(/at sunrise \d{2}:\d{2}; .*Moon in /);
    const d = Number(today.dataset.day);
    const key = d < 28 ? "ArrowRight" : "ArrowLeft";
    today.focus();
    fireEvent.keyDown(today, { key });
    const next = document.activeElement as HTMLButtonElement;
    expect(Number(next.dataset.day)).toBe(key === "ArrowRight" ? d + 1 : d - 1);
    expect(next.tabIndex).toBe(0);
    const nd = Number(next.dataset.day);
    fireEvent.keyDown(next, { key: nd + 7 <= 28 ? "ArrowDown" : "ArrowUp" });
    expect(Number((document.activeElement as HTMLElement).dataset.day)).toBe(nd + 7 <= 28 ? nd + 7 : nd - 7);
    next.focus();
    fireEvent.click(next);
    await waitFor(() => expect(screen.getByRole("button", { name: "Read this day in full" })).toBeInTheDocument(), { timeout: 20_000 });
    fireEvent.click(screen.getByRole("button", { name: "Read this day in full" }));
    expect(await screen.findByRole("button", { name: /^Tithi/ })).toBeInTheDocument();
  });

  it("turns the month with ‹ ›", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("tab", { name: "Month" }, { timeout: 5000 }));
    const title = (await screen.findByRole("grid")).getAttribute("aria-labelledby") ?? "";
    const before = document.getElementById(title)?.textContent;
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    await waitFor(() => expect(document.getElementById(title)?.textContent).not.toBe(before));
    expect(screen.getByRole("grid").querySelector("button[aria-current='date']")).toBeNull();
  });
});
