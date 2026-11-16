import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { Page } from "../../components/ui/Page";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET, type Profile } from "../../engine/types";
import HomeScreen from "./HomeScreen";
import { MoonDisc } from "./MoonDisc";

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

  it("the person chip names the person on screen and switches to another", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(SECOND);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt();
    fireEvent.click(await screen.findByRole("button", { name: /^Rahul\. Switch person/ }));
    const group = screen.getByRole("radiogroup", { name: "Choose a person" });
    expect(within(group).getByRole("radio", { name: /Rahul/ })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: /Priya/ }));
    expect(await screen.findByRole("button", { name: /^Priya\. Switch person/ })).toBeInTheDocument();
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
