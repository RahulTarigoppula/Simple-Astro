import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../data/db";
import FestivalsScreen from "./FestivalsScreen";

// 17 November 2026, 10:00 in India: Kārttika Pūrṇimā is seven days off.
const NOW = Date.UTC(2026, 10, 17, 4, 30);

function renderScreen() {
  const router = createMemoryRouter(
    [
      { path: "/festivals", element: <FestivalsScreen /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: ["/festivals"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("FestivalsScreen", { timeout: 60_000 }, () => {
  beforeEach(async () => {
    vi.spyOn(Date, "now").mockReturnValue(NOW);
    await db.profiles.clear();
    await db.settings.clear();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("answers with the next festival, its day and the Moon of that day, for Bengaluru when nobody is saved", async () => {
    renderScreen();
    expect(await screen.findByRole("heading", { level: 1, name: "Kartik Purnima, in 7 days" }, { timeout: 10_000 })).toBeInTheDocument();
    expect(screen.getByText(/^Tuesday,? 24 November/)).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^The Moon as it will be that day: (9\d|100)% lit/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^The year ahead: \d+ festivals? and \d+ eclipses?/ })).toBeInTheDocument();
    expect(screen.getByText(/^Dates are worked out for/).closest("p")).toHaveTextContent(
      /Dates are worked out for Bengaluru.*a day earlier or later/,
    );
    expect(screen.getByRole("button", { name: /^Change/ })).toHaveAttribute("aria-haspopup", "dialog");
  });

  it("lists the next two months by month, marks the next festival and folds open how the day was chosen", async () => {
    renderScreen();
    const nov = await screen.findByRole("region", { name: "November 2026" }, { timeout: 10_000 });
    const rows = within(nov).getAllByRole("listitem");
    expect(rows.map((r) => r.querySelector(".fest-row__t")?.firstChild?.textContent)).toEqual([
      "Ekadashi fast",
      "Pradosh fast",
      "Kartik Purnima",
      "Sankashti Chaturthi",
    ]);
    const kp = rows[2] as HTMLElement;
    expect(within(kp).getByText("Next")).toBeInTheDocument();
    expect(within(kp).getByText("in 7 days")).toBeInTheDocument();
    expect(kp.textContent).toMatch(/Tue24Nov/);
    expect(
      within(kp).getByText(/^Kept on the day the Full Moon lunar day \(Pūrṇimā\) of Kārttika is running at sunrise\./),
    ).toBeInTheDocument();
    expect(within(kp).getByRole("link", { name: /^The almanac for 24 November/ })).toHaveAttribute("href", "/today?d=2026-11-24");
    // The fast is told apart by its traditional name.
    expect(within(rows[0] as HTMLElement).getAllByText("Devotthāna Ekādaśī")[0]).toHaveClass("fest-row__s");
    expect(screen.getByRole("region", { name: "January 2027" })).toHaveTextContent("Makar Sankranti · Pongal");
    expect(screen.queryByRole("region", { name: "February 2027" })).toBeNull();
  });

  it("filters to festivals, fasts or the sky, and shows the whole year on demand", async () => {
    renderScreen();
    await screen.findByRole("region", { name: "November 2026" }, { timeout: 10_000 });
    const group = screen.getByRole("group", { name: "What to show" });
    fireEvent.click(within(group).getByRole("button", { name: "Sky" }));
    expect(within(group).getByRole("button", { name: "Sky" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.queryByText("Ekadashi fast")).toBeNull();
    expect(screen.getByText("The Sun enters Sagittarius")).toBeInTheDocument();

    fireEvent.click(within(group).getByRole("button", { name: "Festivals" }));
    expect(screen.queryByText("The Sun enters Sagittarius")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show the whole year ahead" }));
    // The rest of the year arrives in pieces; Dīvālī 2027 is in the last of them.
    await waitFor(() => expect(screen.getByRole("region", { name: "October 2027" })).toHaveTextContent("Diwali"), { timeout: 30_000 });
    expect(screen.getByRole("region", { name: "March 2027" })).toHaveTextContent(/Maha Shivaratri.*Holika Dahan.*Holi/);
    expect(screen.queryByRole("button", { name: "Show the whole year ahead" })).toBeNull();

    fireEvent.click(within(group).getByRole("button", { name: "Fasts" }));
    expect(screen.queryByText("Diwali")).toBeNull();
    expect(screen.getAllByText("Ekadashi fast").length).toBeGreaterThan(20);
  });
});
