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
    expect(rangeLabel(c, [Date.UTC(2026, 9, 6, 9, 52), Date.UTC(2026, 9, 6, 11, 24)])).toBe("15:22–16:54");
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

describe("TodayScreen", () => {
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
    expect(rahu.textContent).toMatch(/\d{2}:\d{2}–\d{2}:\d{2}/);
    expect(screen.getByRole("img", { name: /Brass dial/ })).toBeInTheDocument();
  });

  it("pages days with the Moon pager and comes back to today", async () => {
    renderToday();
    fireEvent.click(await screen.findByRole("button", { name: "Next day" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Tomorrow/ }, { timeout: 5000 })).toBeInTheDocument();
    expect(screen.getByText(/Read at sunrise/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    fireEvent.click(screen.getByRole("button", { name: "Previous day" }));
    expect(await screen.findByRole("heading", { level: 1, name: /Yesterday/ }, { timeout: 5000 })).toBeInTheDocument();
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
});
