import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { Page } from "../../components/ui/Page";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET, type Profile } from "../../engine/types";
import HomeScreen from "./HomeScreen";
import { MoonDisc } from "./MoonDisc";

// The built-in place index is a large file fetched at run time; the sheet only needs "a list to pick from".
vi.mock("../../data/places", async (original) => ({
  ...(await original<typeof import("../../data/places")>()),
  loadGazetteer: () => Promise.resolve({}),
  searchPlaces: (q: string) =>
    q.toLowerCase().startsWith("lon")
      ? [{ name: "London", admin1: "England", country: "GB", lat: 51.5085, lon: -0.1257, timezone: "Europe/London", source: "bundle" }]
      : [],
}));

const HYDERABAD = { name: "Hyderabad, Telangana, IN", lat: 17.385, lon: 78.4867, zone: "Asia/Kolkata" };
const ID = REFERENCE_PROFILE.id;
const SECOND: Profile = { ...REFERENCE_PROFILE, id: "second-person", name: "Priya" };

function renderAt(path = "/") {
  const router = createMemoryRouter(
    [
      { path: "/", element: <HomeScreen /> },
      { path: "/patri/:id", element: <Page label="chart">chart page</Page> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeAll(() => {
  // jsdom has no <dialog> methods; the sheet only needs them to exist.
  for (const m of ["showModal", "close"] as const) {
    if (!(m in HTMLDialogElement.prototype)) {
      Object.defineProperty(HTMLDialogElement.prototype, m, {
        configurable: true,
        value(this: HTMLDialogElement) {
          this.open = m === "showModal";
        },
      });
    }
  }
});

beforeEach(async () => {
  await db.delete();
  await db.open();
});

describe("Today, the home screen", () => {
  it("with nobody saved: one thing to do, and a way to Settings", async () => {
    renderAt();
    expect(await screen.findByRole("heading", { level: 1, name: "Your stars, in plain words" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your birth details" })).toHaveAttribute("href", "/leaf/new");
    expect(await screen.findByRole("button", { name: "People and settings" })).toBeInTheDocument();
    expect(screen.getByText(/252 hours/)).toBeInTheDocument();
    expect(screen.queryByText("Good times today")).toBeNull();
  });

  it("with a person: the day is answered first, in a word, a number and a sentence", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt();
    const hero = (await screen.findByText(/^Your day/, {}, { timeout: 8000 })).closest("section") as HTMLElement;
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/, Rahul$/);
    expect(within(hero).getByRole("heading", { level: 2 })).toHaveTextContent(/^(Strong|Good|Mixed|Go gently)$/);
    expect(within(hero).getByRole("img")).toHaveAccessibleName(/day\. Support \d+ out of 100\./);
    expect(within(hero).getByRole("link", { name: "See the full day" })).toHaveAttribute("href", `/forecast/${ID}`);
    expect(within(hero).getByRole("link", { name: "Week ahead" })).toHaveAttribute("href", `/forecast/${ID}?p=week`);
    // what to do with the day, in 12-hour times
    expect(screen.getByRole("heading", { name: "Good for" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Go easy on" })).toBeInTheDocument();
    const hours = screen.getByRole("heading", { name: "Good times today" }).closest("section") as HTMLElement;
    expect(hours).toHaveTextContent(/Sunrise \d{1,2}:\d\d am/);
    expect(hours).toHaveTextContent(/Pause new starts/);
    expect(hours).toHaveTextContent(/\d{1,2}:\d\d [ap]m to \d{1,2}:\d\d [ap]m/);
    // seven life areas, each with a word as well as a bar
    const areas = screen.getAllByRole("img", { name: /: (Strong|Good|Mixed|Go gently)$/ });
    expect(areas).toHaveLength(7);
    expect(screen.getByRole("link", { name: "Open today's almanac" })).toHaveAttribute("href", "/today");
  });

  it("says which place the times are for, and lets you change it without touching the person", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    const before = await db.profiles.get(ID);
    const birthTown = REFERENCE_PROFILE.birth.place.name.split(",")[0] as string;
    renderAt();
    const hoursOf = () => screen.getByRole("heading", { name: "Good times today" }).closest("section") as HTMLElement;
    await screen.findByRole("heading", { name: "Good times today" }, { timeout: 8000 });
    // the birthplace stands in until a place is set
    expect(
      within(hoursOf())
        .getByText(/^Times are for/)
        .closest("p"),
    ).toHaveTextContent(`Times are for ${birthTown}, where Rahul was born. Live somewhere else? Change`);
    const sunriseAtBirthplace = /Sunrise (\d{1,2}:\d\d [ap]m)/.exec(hoursOf().textContent ?? "")?.[1];

    // pick a town in the sheet: saved as the app's place, sheet closed, the card re-read for it
    fireEvent.click(within(hoursOf()).getByRole("button", { name: /^Change/ }));
    const dlg = await screen.findByRole("dialog", { name: "Where are you now?" });
    expect(within(dlg).getByText(/Your birth chart never changes\./)).toBeInTheDocument();
    fireEvent.change(within(dlg).getByRole("searchbox", { name: "Find your town or city" }), { target: { value: "lond" } });
    const row = await within(dlg).findByRole("button", { name: /London/ });
    expect(row).toHaveTextContent("England, United Kingdom");
    expect(row.textContent).not.toMatch(/\d+\.\d+/); // no raw coordinates
    fireEvent.click(row);
    await waitFor(async () =>
      expect((await db.settings.get("app"))?.value.currentPlace).toEqual({
        name: "London, England, GB",
        lat: 51.5085,
        lon: -0.1257,
        zone: "Europe/London",
      }),
    );
    await waitFor(() =>
      expect(
        within(hoursOf())
          .getByText(/^Times are for/)
          .closest("p"),
      ).toHaveTextContent(/^Times are for London\. Change/),
    );
    expect(/Sunrise (\d{1,2}:\d\d [ap]m)/.exec(hoursOf().textContent ?? "")?.[1]).not.toBe(sunriseAtBirthplace);
    expect(screen.queryByRole("dialog", { name: "Where are you now?" })).toBeNull();

    // and back to the birthplace
    fireEvent.click(within(hoursOf()).getByRole("button", { name: /^Change/ }));
    const again = await screen.findByRole("dialog", { name: "Where are you now?" });
    fireEvent.click(within(again).getByRole("button", { name: (n) => n.startsWith(`Use Rahul's birthplace (${birthTown})`) }));
    await waitFor(async () => expect((await db.settings.get("app"))?.value.currentPlace).toBeNull());
    await waitFor(() =>
      expect(
        within(hoursOf())
          .getByText(/^Times are for/)
          .closest("p"),
      ).toHaveTextContent(/where Rahul was born/),
    );
    // the person's stored birth details were never written to
    expect(await db.profiles.get(ID)).toEqual(before);
  });

  it("with a place already set, the hours are for that place", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET, currentPlace: HYDERABAD });
    renderAt();
    const hours = (await screen.findByRole("heading", { name: "Good times today" }, { timeout: 8000 })).closest("section") as HTMLElement;
    await waitFor(() =>
      expect(
        within(hours)
          .getByText(/^Times are for/)
          .closest("p"),
      ).toHaveTextContent(/^Times are for Hyderabad\. Change/),
    );
    expect(hours).toHaveTextContent(/Sunrise \d{1,2}:\d\d am/);
  });

  it("the person chip names the person on screen and switches to another", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(SECOND);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt();
    fireEvent.click(await screen.findByRole("button", { name: /^Rahul\. Switch person/ }));
    const group = screen.getByRole("radiogroup", { name: "Choose a person" });
    expect(within(group).getByRole("radio", { name: /Rahul/ })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: /Priya/ }));
    expect(await screen.findByRole("button", { name: /^Priya\. Switch person/ }, { timeout: 8000 })).toBeInTheDocument();
    expect((await db.settings.get("app"))?.value.activeProfileId).toBe(SECOND.id);
  });

  it("on a page about one person the chip names that person, even when another is the active one", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(SECOND);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    const { router } = renderAt(`/patri/${SECOND.id}`);
    fireEvent.click(await screen.findByRole("button", { name: /^Priya\. Switch person/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Rahul/ }));
    expect(router.state.location.pathname).toBe(`/patri/${ID}`);
  });
});

describe("MoonDisc", () => {
  it("draws nothing lit at new Moon and a lit shape otherwise", () => {
    const { container, rerender } = render(<MoonDisc elongation={0} />);
    expect(container.querySelector("path")).toBeNull();
    rerender(<MoonDisc elongation={90} />);
    expect(container.querySelector("path")).not.toBeNull();
    rerender(<MoonDisc elongation={180} />);
    expect(container.querySelector("path")?.getAttribute("d")).toContain("A20 20");
  });
});
