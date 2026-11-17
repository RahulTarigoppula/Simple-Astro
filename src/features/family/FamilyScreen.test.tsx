import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { resolveBirthMoment } from "../../engine/time";
import { DEFAULT_PRESET, type Profile } from "../../engine/types";
import FamilyScreen from "./FamilyScreen";
import { FamilyTeaser } from "./FamilyTeaser";

const ID = REFERENCE_PROFILE.id;
const PRIYA: Profile = {
  ...REFERENCE_PROFILE,
  id: "second-person",
  name: "Priya",
  birth: resolveBirthMoment({
    localY: 1996,
    localMo: 8,
    localD: 22,
    localH: 18,
    localMi: 40,
    place: { name: "Hyderabad", admin1: "Telangana", country: "IN", lat: 17.385, lon: 78.4867, source: "manual" },
    zoneOverride: "Asia/Kolkata",
  }),
};
const METER = /^(Strong|Good|Mixed|Go gently) day, \d+ of 100$/;
const meters = () => screen.getAllByRole("img", { name: METER });

function renderAt(path = "/family") {
  const router = createMemoryRouter(
    [
      { path: "/family", element: <FamilyScreen /> },
      { path: "/", element: <FamilyTeaser /> },
      { path: "/forecast/:id", element: <p>the full day</p> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

beforeAll(() => {
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

describe("Family today", () => {
  it("with nobody saved: an invitation to add the first person", async () => {
    renderAt();
    expect(await screen.findByRole("heading", { level: 1, name: "Everyone's day, on one screen" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add the first person" })).toHaveAttribute("href", "/leaf/new");
    expect(screen.queryByText("Coming up")).toBeNull();
  });

  it("with one person: their day, and an invitation to add the family", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt();
    expect(
      await screen.findByRole("heading", { level: 1, name: /^A (strong|good|mixed|gentle) day for Rahul$/ }, { timeout: 8000 }),
    ).toBeInTheDocument();
    const row = screen.getByRole("link", { name: /^Rahul/ });
    expect(row).toHaveAttribute("href", `/forecast/${ID}`);
    expect(row).toHaveTextContent(/(Strong|Good|Mixed|Go gently) \d+/);
    expect(within(row).getByRole("img")).toHaveAccessibleName(/^(Strong|Good|Mixed|Go gently) day, \d+ of 100$/);
    expect(row).toHaveTextContent(/Best for: .+Go gently on: .+/);
    expect(row.textContent).not.toMatch(/helps with|asks for care with/);
    expect(screen.getByRole("link", { name: "Add a family member" })).toHaveAttribute("href", "/leaf/new");
    // the picture says the same thing in words
    expect(screen.getByRole("img", { name: /^Rahul: (Strong|Good|Mixed|Go gently), \d+ of 100\.$/ })).toBeInTheDocument();
    // the star birthday is found after the first paint
    expect(await screen.findByText("Rahul's star birthday", {}, { timeout: 8000 })).toBeInTheDocument();
  });

  it("with a family: everyone, best day first, in words as well as a bar; and what is coming up", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    const { container } = renderAt();
    await waitFor(() => expect(meters()).toHaveLength(2), { timeout: 8000 });
    const h1 = screen.getByRole("heading", { level: 1 });
    expect(h1).toHaveTextContent(/family|everyone|has the strongest day/);
    expect(screen.getByRole("heading", { name: /^Everyone today/ })).toBeInTheDocument();
    const scores = meters().map((m) => Number(/(\d+) of 100/.exec(m.getAttribute("aria-label") ?? "")?.[1]));
    expect(scores).toHaveLength(2);
    expect(scores[0]).toBeGreaterThanOrEqual(scores[1] as number);
    // both are on the picture
    expect(screen.getByRole("img", { name: /Rahul: .+ of 100/ })).toHaveAccessibleName(/Priya: .+ of 100/);
    // coming up: a star birthday each within the month, dated
    expect(screen.getByRole("heading", { name: /^Coming up/ })).toBeInTheDocument();
    expect(await screen.findByText("Rahul's star birthday", {}, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByText("Priya's star birthday")).toBeInTheDocument();
    expect(
      screen.getAllByText(/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun) \d{1,2} \w{3} · (today|tomorrow|in \d+ days)/).length,
    ).toBeGreaterThanOrEqual(2);
    // nobody's birth time or birthplace is on this screen
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/Bengaluru|Hyderabad/);
    expect(text).not.toMatch(/\d{1,2}:\d\d/);
  });

  it("tapping a person makes them the active person and opens their full day", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    const { router } = renderAt();
    await waitFor(() => expect(meters()).toHaveLength(2), { timeout: 8000 });
    fireEvent.click(screen.getByRole("link", { name: /^Priya/ }));
    expect(router.state.location.pathname).toBe(`/forecast/${PRIYA.id}`);
    await waitFor(async () => expect((await db.settings.get("app"))?.value.activeProfileId).toBe(PRIYA.id));
  });
});

describe("the home-screen teaser", () => {
  it("draws nothing for one person", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    const { container } = renderAt("/");
    await waitFor(async () => expect(await db.profiles.count()).toBe(1));
    expect(container.querySelector("a")).toBeNull();
  });

  it("names each person with their word, and leads to the screen", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    renderAt("/");
    const link = await screen.findByRole("link", { name: /^Family today/ });
    expect(link).toHaveAttribute("href", "/family");
    await waitFor(
      () =>
        expect(link).toHaveTextContent(
          /^Family today(Rahul|Priya) (Strong|Good|Mixed|Go gently) · (Rahul|Priya) (Strong|Good|Mixed|Go gently)$/,
        ),
      { timeout: 8000 },
    );
  });
});
