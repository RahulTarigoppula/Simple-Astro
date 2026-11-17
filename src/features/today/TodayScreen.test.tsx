import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { litPath } from "./moon";
import TodayScreen, { tithiWords } from "./TodayScreen";
import { endsLabel, rangeLabel, zoneClock } from "./zone";

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
    expect(c.hm12(t)).toBe("5:04 pm");
    expect(c.hm12(Date.UTC(2026, 9, 6, 18, 35))).toBe("12:05 am");
    expect(c.hm12(Date.UTC(2026, 9, 6, 6, 30))).toBe("12:00 pm");
    expect(c.hms(t)).toBe("17:04:12");
    expect(c.offset(t)).toBe("UTC+05:30");
    expect(c.hours(t)).toBeCloseTo(17 + 4 / 60 + 12 / 3600, 6);
  });
  it("marks an end on the next civil day as tomorrow", () => {
    const c = zoneClock("Asia/Kolkata");
    const rise = Date.UTC(2026, 9, 6, 0, 40); // 06:10 IST
    const end = Date.UTC(2026, 9, 6, 19, 4); // 00:34 IST next day
    expect(endsLabel(c, end, rise)).toBe("until 12:34 am tomorrow");
    expect(rangeLabel(c, [Date.UTC(2026, 9, 6, 9, 52), Date.UTC(2026, 9, 6, 11, 24)])).toBe("3:22 pm to 4:54 pm");
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

const TIME = /^\d{1,2}:\d{2} (am|pm)$/;
const RANGE = /\d{1,2}:\d{2} (am|pm) to \d{1,2}:\d{2} (am|pm)/;

describe("the lunar day in plain words", () => {
  const t = (index: number, paksha: "shukla" | "krishna") => ({ index, paksha, name: "", endMs: 0 }) as Parameters<typeof tithiWords>[0];
  it("counts fifteen days of the growing and of the fading Moon", () => {
    expect(tithiWords(t(1, "shukla"))).toBe("1st day of the growing Moon");
    expect(tithiWords(t(7, "shukla"))).toBe("7th day of the growing Moon");
    expect(tithiWords(t(15, "shukla"))).toBe("Full Moon day");
    expect(tithiWords(t(17, "krishna"))).toBe("2nd day of the fading Moon");
    expect(tithiWords(t(30, "krishna"))).toBe("New Moon day");
  });
});

describe("TodayScreen", { timeout: 60_000 }, () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.settings.clear();
  });

  it("reads Bengaluru when nobody is saved, answers in plain words and prints 12-hour end times", async () => {
    renderToday();
    // The answer first: the lunar day as a sentence is the page's heading, with the date, the Moon, sunrise and sunset.
    expect(
      await screen.findByRole("heading", { level: 1, name: /day of the (growing|fading) Moon$|^(Full|New) Moon day$/ }, { timeout: 5000 }),
    ).toBeInTheDocument();
    const hero = screen.getByRole("region", { name: /^Today, \w+day, \d+ \w+ \d{4}$/ });
    expect(within(hero).getByText(/^\w+day, \d+ \w+ \d{4}$/)).toBeInTheDocument();
    expect(screen.getByText(/^Times are for/).closest("p")).toHaveTextContent(/^Times are for Bengaluru\. Change/);
    expect(screen.getByRole("link", { name: "Add a person" })).toHaveAttribute("href", "/leaf/new");
    expect(screen.getByRole("img", { name: /^The Moon: \d+% lit, (growing|fading)$/ })).toBeInTheDocument();
    expect(within(hero).getByText("Sunrise").nextElementSibling?.textContent).toMatch(TIME);
    expect(within(hero).getByText("Sunset").nextElementSibling?.textContent).toMatch(TIME);
    const tithi = screen.getByRole("button", { name: /^Tithi/ });
    expect(within(tithi).getByText("Lunar day")).toBeInTheDocument();
    expect(within(tithi).getByText("Tithi")).toBeInTheDocument();
    expect(within(tithi).getByText(/^until \d{1,2}:\d{2} (am|pm)( tomorrow| in \d+ days)?$/)).toBeInTheDocument();
    // The five limbs are one list; each row opens its own details.
    const limbs = screen.getByRole("list", { name: "The five parts of the day" });
    expect(within(limbs).getAllByRole("listitem")).toHaveLength(5);
    expect(within(limbs).getAllByRole("button", { name: /\. Details$/ })).toHaveLength(5);
    // What to avoid is its own short list, headed by the word.
    const avoid = screen.getByRole("list", { name: "Times to avoid" });
    expect(within(avoid).getAllByRole("listitem")).toHaveLength(3);
    const rahu = within(avoid).getByRole("button", { name: /^Rāhu Kāla: Avoid\./ });
    expect(rahu.textContent).toMatch(RANGE);
    expect(within(avoid.parentElement as HTMLElement).getByRole("heading", { name: "Avoid" })).toBeInTheDocument();
    expect(within(avoid).queryByRole("button", { name: /^Abhijit/ })).toBeNull();
  });

  it("pages days with the stepper and comes back to today", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("button", { name: "Next day" }));
    expect(await screen.findByRole("region", { name: /^Tomorrow, / }, { timeout: 20_000 })).toBeInTheDocument();
    expect(screen.getByText(/Read at sunrise/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(await screen.findByRole("region", { name: /^Yesterday, / }, { timeout: 20_000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Back to today" }));
    expect(await screen.findByRole("region", { name: /^Today, / })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back to today" })).toBeNull();
  });

  it("opens a details sheet with the exact end instant, the zone and the conventions", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("button", { name: /^Nakṣatra/ }, { timeout: 5000 }));
    const dlg = await screen.findByRole("dialog");
    await waitFor(() => expect(within(dlg).getByText(/\d{2}:\d{2}:\d{2} · \w+day, \d+ \w+ \d{4}/)).toBeInTheDocument());
    expect(within(dlg).getByText(/Asia\/Kolkata · UTC\+05:30/)).toBeInTheDocument();
    expect(within(dlg).getByText(/upper limb on a refracted horizon/)).toBeInTheDocument();
    expect(within(dlg).getByText(/Lahiri/)).toBeInTheDocument();
    expect(within(dlg).getByText(/[ऀ-ॿ]/, { selector: "[lang='hi']" })).toBeInTheDocument();
    // Plain words first, with the way on to the full explanation and to the star's story.
    expect(within(dlg).getByText(/Simply put/)).toBeInTheDocument();
    expect(within(dlg).getByRole("button", { name: "Tell me more" })).toBeInTheDocument();
    expect(within(dlg).getByRole("link", { name: /^Read the story of / })).toHaveAttribute(
      "href",
      expect.stringMatching(/\/explore\/nakshatra\/\d+$/),
    );
  });

  it("prints Brahma-muhūrta and Godhūli among the good times, headed good in words", async () => {
    renderToday();
    const brahma = await screen.findByRole("button", { name: /^Brahma-muhūrta: Good\./ }, { timeout: 5000 });
    expect(brahma.textContent).toMatch(RANGE);
    const good = screen.getByRole("list", { name: "Good times" });
    expect(within(good).getAllByRole("listitem")).toHaveLength(3);
    expect(within(good.parentElement as HTMLElement).getByRole("heading", { name: "Good" })).toBeInTheDocument();
    const godhuli = within(good).getByRole("button", { name: /^Godhūli/ });
    expect(godhuli.textContent).toMatch(RANGE);
    // Moonrise, the month and the season wait in a fold.
    expect(within(screen.getByRole("list", { name: "More about this day" })).getAllByRole("listitem")).toHaveLength(4);
  });

  it("lists the day and night choghaḍiyās with quality in words and at most one 'now'", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("tab", { name: "Good & bad slots" }, { timeout: 5000 }));
    expect(screen.getByRole("tab", { name: "Good & bad slots" })).toHaveAttribute("aria-selected", "true");
    const day = screen.getByRole("list", { name: "Day choghaḍiyā" });
    const night = screen.getByRole("list", { name: "Night choghaḍiyā" });
    for (const list of [day, night]) {
      const items = within(list).getAllByRole("listitem");
      expect(items).toHaveLength(8);
      for (const li of items) {
        expect(li.textContent).toMatch(/good|neutral|bad/);
        expect(li.textContent).toMatch(RANGE);
        expect(li.querySelector("[lang='hi']")).not.toBeNull();
      }
    }
    expect(document.querySelectorAll("[aria-current='time']").length).toBeLessThanOrEqual(1);
    expect(screen.getByText(/Muhūrta tradition, Choghaḍiyā/)).toBeInTheDocument();
  });

  it("lists twelve horās by day and by night, the first the weekday lord's", async () => {
    renderToday();
    const vara = (await screen.findByRole("button", { name: /^Vāra/ }, { timeout: 5000 })).textContent ?? "";
    fireEvent.click(screen.getByRole("tab", { name: "Planet hours" }));
    const day = within(screen.getByRole("list", { name: "Day horās" })).getAllByRole("listitem");
    expect(day).toHaveLength(12);
    expect(within(screen.getByRole("list", { name: "Night horās" })).getAllByRole("listitem")).toHaveLength(12);
    const lord: Record<string, string> = {
      Ravivāra: "Sun Sūrya",
      Somavāra: "Moon Candra",
      Maṅgalavāra: "Mars Maṅgala",
      Budhavāra: "Mercury Budha",
      Guruvāra: "Jupiter Guru",
      Śukravāra: "Venus Śukra",
      Śanivāra: "Saturn Śani",
    };
    const w = Object.keys(lord).find((k) => vara.includes(k)) ?? "";
    expect(w).not.toBe("");
    expect(day[0]?.textContent).toContain(lord[w]);
    expect(day[0]?.textContent).toMatch(RANGE);
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
    expect(today.getAttribute("aria-label")).toMatch(/at sunrise \d{1,2}:\d{2} am; .*Moon in /);
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
    // Picking a day opens the Day view for that day.
    await waitFor(() => expect(screen.getByRole("tab", { name: "Day" })).toHaveAttribute("aria-selected", "true"), { timeout: 20_000 });
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

describe("opening the almanac on a given day", () => {
  it("reads ?d= as whole days from today, and ignores anything else", async () => {
    const { offsetFromQuery } = await import("./TodayScreen");
    const now = new Date(2026, 10, 17, 9, 0);
    expect(offsetFromQuery("#/today?d=2026-11-24", now)).toBe(7);
    expect(offsetFromQuery("#/today?d=2026-11-16", now)).toBe(-1);
    expect(offsetFromQuery("#/today", now)).toBe(0);
    expect(offsetFromQuery("#/today?d=soon", now)).toBe(0);
    expect(offsetFromQuery("#/today?d=9999-01-01", now)).toBe(0);
  });
});
