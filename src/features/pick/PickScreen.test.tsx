import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET, type Profile } from "../../engine/types";
import { BANNED_WORDS } from "../../test/banned-words";
import PickScreen from "./PickScreen";
import { pickTeaser } from "./teaser";

vi.mock("../../data/places", async (original) => ({
  ...(await original<typeof import("../../data/places")>()),
  loadGazetteer: () => Promise.resolve({}),
  searchPlaces: () => [],
}));

const ID = REFERENCE_PROFILE.id;
const SECOND: Profile = { ...REFERENCE_PROFILE, id: "second-person", name: "Priya" };
const DATE = /^(Mon|Tues|Wednes|Thurs|Fri|Satur|Sun)day \d{1,2} [A-Z][a-z]+$/;
const WORD = /^(Strong|Good|Mixed|Go gently)/;

function renderAt(path = "/pick") {
  const router = createMemoryRouter(
    [
      { path: "/pick", element: <PickScreen /> },
      { path: "/pick/:id", element: <PickScreen /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

const answer = async () => {
  const h = await screen.findByRole("heading", { level: 2, name: DATE }, { timeout: 8000 });
  return h.closest("section") as HTMLElement;
};
const rows = () => within(screen.getByRole("list", { name: "The best days" })).getAllByRole("group");

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

describe("Pick a good day", () => {
  it("with nobody saved: a general ranking, and one thing to do", async () => {
    renderAt();
    const hero = await answer();
    expect(within(hero).getByRole("heading", { level: 1, name: "Pick a good day" })).toBeInTheDocument();
    expect(hero).toHaveTextContent(/(Best|Next good) day to start something new/);
    expect(hero).toHaveTextContent(/For anyone/);
    expect(screen.getByRole("heading", { name: "These days are the same for everyone" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add your birth details" })).toHaveAttribute("href", "/leaf/new");
    expect(rows()).toHaveLength(5);
    // nothing is counted from a birth chart
    expect(screen.getByRole("list", { name: "The best days" }).textContent).not.toMatch(/birth star|birth Moon sign/);
    expect(screen.getByText(/^Times are for/).closest("p")).toHaveTextContent(/^Times are for Bengaluru\. Change/);
  });

  it("with a person: the best day in large words, a picture of the days ahead and why", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt();
    const hero = await answer();
    expect(hero).toHaveTextContent(/(Strong|Good|Mixed|Go gently) · (Today|Tomorrow|In \d+ days) · For Rahul/);
    const pic = within(hero).getByRole("img");
    expect(pic).toHaveAccessibleName(/^45 days ahead: .+\. Best: \w+day \d{1,2} \w+, (Strong|Good|Mixed|Go gently)\. Today: /);
    expect(pic.querySelectorAll(".pk-pic__bars > li")).toHaveLength(45);
    expect(pic.querySelectorAll("[data-top]")).toHaveLength(3);
    expect(pic.querySelectorAll("[data-best]")).toHaveLength(1);
    expect(pic.querySelectorAll(".pk-pic__bars [data-now]")).toHaveLength(1);
    expect(screen.queryByRole("heading", { name: "These days are the same for everyone" })).toBeNull();

    // the list: best first, each with a word, a reason and a time, opening to for and against
    const list = rows();
    expect(list).toHaveLength(5);
    const first = list[0] as HTMLElement;
    expect(first.querySelector(".pk-day__word")).toHaveTextContent(WORD);
    expect(first).toHaveTextContent("Best");
    expect(first).toHaveTextContent(/Best time \d{1,2}:\d\d [ap]m to \d{1,2}:\d\d [ap]m/);
    expect(within(first).getByRole("heading", { name: "In favour" })).toBeInTheDocument();
    expect(within(first).getByRole("heading", { name: "Against" })).toBeInTheDocument();
    expect(first.querySelector('[lang="sa-Latn"]')).not.toBeNull();
    // the best day's date is the one in the band
    const big = within(hero).getByRole("heading", { level: 2 }).textContent ?? "";
    expect(big).toContain(first.querySelector(".pk-day__date b")?.textContent ?? "x");

    fireEvent.click(screen.getByRole("button", { name: "Show more days" }));
    expect(rows()).toHaveLength(10);
    expect(screen.getByText(/^Times are for/).closest("p")).toHaveTextContent(/where Rahul was born/);
    expect(screen.getByText(/for reflection/)).toBeInTheDocument();
  });

  it("choosing what to do updates the answer; the chips are a radio group", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    const { router } = renderAt();
    const hero = await answer();
    const group = screen.getByRole("radiogroup", { name: "What do you want to do?" });
    const radios = within(group).getAllByRole("radio");
    expect(radios).toHaveLength(8);
    expect(within(group).getByRole("radio", { name: "Start something new" })).toBeChecked();
    fireEvent.click(within(group).getByRole("radio", { name: "Move home" }));
    expect(within(group).getByRole("radio", { name: "Move home" })).toBeChecked();
    expect(within(group).getByRole("radio", { name: "Start something new" })).not.toBeChecked();
    expect(hero).toHaveTextContent(/(Best|Next good) day to move home or hold a housewarming/);
    expect(router.state.location.search).toBe("?for=home");
    // arrow keys move the choice
    fireEvent.keyDown(within(group).getByRole("radio", { name: "Move home" }), { key: "ArrowRight" });
    expect(within(group).getByRole("radio", { name: "Buy for the home" })).toBeChecked();
    expect(hero).toHaveTextContent(/(Best|Next good) day to buy something for the home/);
  });

  it("the range can be two weeks or three months", async () => {
    renderAt("/pick?for=travel");
    const hero = await answer();
    expect(hero).toHaveTextContent(/(Best|Next good) day to travel/);
    const range = screen.getByRole("radiogroup", { name: "How far ahead" });
    expect(within(range).getByRole("radio", { name: "45 days" })).toBeChecked();
    fireEvent.click(within(range).getByRole("radio", { name: "2 weeks" }));
    await waitFor(() => expect(within(hero).getByRole("img")).toHaveAccessibleName(/^14 days ahead/));
    fireEvent.click(within(range).getByRole("radio", { name: "3 months" }));
    await waitFor(() => expect(within(hero).getByRole("img")).toHaveAccessibleName(/^90 days ahead/));
  });

  it("pick/:id shows that person even when another is the active one", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(SECOND);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    renderAt(`/pick/${SECOND.id}`);
    const hero = await answer();
    expect(hero).toHaveTextContent(/For Priya/);
  });

  it("uses careful words throughout", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
    const { container } = renderAt();
    await answer();
    for (const d of container.querySelectorAll("details")) d.open = true;
    const text = (container.textContent ?? "").toLowerCase();
    for (const w of BANNED_WORDS) expect(text, w).not.toContain(w);
  });
});

describe("pickTeaser", () => {
  it("gives the home screen one line and a link", () => {
    const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
    const here = { lat: 12.9716, lon: 77.5946, zone: "Asia/Kolkata" };
    const t = pickTeaser(patri, Date.UTC(2026, 10, 17, 4), here, DEFAULT_PRESET);
    expect(t?.title).toBe("Pick a good day");
    expect(t?.sub).toMatch(/^(Next good day|Kindest day soon) to start something new: \w+day \d{1,2} \w+/);
    expect(t?.to).toBe(`/pick/${ID}`);
    const g = pickTeaser(null, Date.UTC(2026, 10, 17, 4), here, DEFAULT_PRESET, "travel");
    expect(g?.to).toBe("/pick?for=travel");
    expect(g?.sub).toMatch(/to travel: /);
  });
});
