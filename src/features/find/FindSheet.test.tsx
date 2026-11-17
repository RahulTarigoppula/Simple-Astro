import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET, type Profile } from "../../engine/types";
import { useUi } from "../../state/ui";
import { FindButton } from "./FindButton";

const ID = REFERENCE_PROFILE.id;
const SECOND: Profile = { ...REFERENCE_PROFILE, id: "second-person", name: "Priya" };

function Bar() {
  return (
    <div>
      <FindButton />
      <input aria-label="some other field" />
    </div>
  );
}

function renderAt(path = "/") {
  const router = createMemoryRouter([{ path: "*", element: <Bar /> }], { initialEntries: [path] });
  return { router, ...render(<RouterProvider router={router} />) };
}

async function openSheet() {
  fireEvent.click(await screen.findByRole("button", { name: "Find anything" }));
  const dlg = await screen.findByRole("dialog", { name: "Find anything" });
  const box = await within(dlg).findByRole("combobox", { name: "Find anything" }, { timeout: 8000 });
  return { dlg, box };
}
const type = (box: HTMLElement, value: string) => fireEvent.change(box, { target: { value } });

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
  useUi.getState().setExplain(null);
  await upsertProfile(SECOND);
  await upsertProfile(REFERENCE_PROFILE);
  await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
});

describe("Find", () => {
  it("opens from the button on a focused search box, with a tile for each main screen and things to ask", async () => {
    renderAt();
    expect(screen.queryByRole("combobox")).toBeNull();
    const { dlg, box } = await openSheet();
    await waitFor(() => expect(box).toHaveFocus());
    const nav = within(dlg).getByRole("navigation", { name: "Main screens" });
    await waitFor(() => expect(within(nav).getByRole("link", { name: "Chart" })).toHaveAttribute("href", `/patri/${ID}`));
    expect(within(nav).getAllByRole("link")).toHaveLength(15);
    expect(within(nav).getByRole("link", { name: "Today" })).toHaveAttribute("href", "/");
    expect(within(nav).getByRole("link", { name: "Forecast" })).toHaveAttribute("href", `/forecast/${ID}`);
    expect(within(nav).getByRole("link", { name: "Palm" })).toHaveAttribute("href", `/hast/${ID}`);
    expect(within(nav).getByRole("link", { name: "Settings" })).toHaveAttribute("href", "/drawer");
    // an example fills the search
    fireEvent.click(within(dlg).getByRole("button", { name: "week ahead" }));
    expect(box).toHaveValue("week ahead");
    expect(within(dlg).getAllByRole("option")[0]).toHaveTextContent("Week ahead");
    expect(within(dlg).queryByRole("navigation", { name: "Main screens" })).toBeNull();
    // and Close shuts it
    fireEvent.click(within(dlg).getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
  });

  it("a tile goes to its screen and closes the sheet", async () => {
    const { router } = renderAt();
    const { dlg } = await openSheet();
    fireEvent.click(await within(dlg).findByRole("link", { name: "Festivals" }));
    expect(router.state.location.pathname).toBe("/festivals");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
  });

  it('opens on "/" and Ctrl+K, but not while typing in a field', async () => {
    renderAt();
    const other = await screen.findByRole("textbox", { name: "some other field" });
    fireEvent.keyDown(other, { key: "/" });
    expect(screen.queryByRole("dialog", { name: "Find anything" })).toBeNull();
    fireEvent.keyDown(document.body, { key: "/" });
    expect(await screen.findByRole("combobox", { name: "Find anything" }, { timeout: 8000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
    fireEvent.keyDown(other, { key: "k", ctrlKey: true });
    expect(await screen.findByRole("combobox", { name: "Find anything" })).toBeInTheDocument();
  });

  it("filters as you type, in named groups, and says how many results there are", async () => {
    renderAt();
    const { dlg, box } = await openSheet();
    type(box, "rahu");
    const list = within(dlg).getByRole("listbox", { name: "Results" });
    expect(within(list).getByRole("group", { name: "Sky" })).toHaveTextContent("Rāhu");
    expect(within(list).getByRole("group", { name: "Words" })).toHaveTextContent("Rāhu Kāla");
    const options = within(list).getAllByRole("option");
    expect(within(dlg).getByRole("status")).toHaveTextContent(`${options.length} results`);
    expect(box).toHaveAttribute("aria-expanded", "true");
    expect(box).toHaveAttribute("aria-controls", list.id);
    expect(box).toHaveAttribute("aria-activedescendant", options[0]?.id);
    expect(options[0]).toHaveAttribute("aria-selected", "true");

    // nothing found: three things to try, each fills the search
    type(box, "qqqq");
    expect(within(dlg).queryByRole("listbox")).toBeNull();
    expect(within(dlg).getByRole("status")).toHaveTextContent("No results for qqqq");
    expect(within(dlg).getByText(/Nothing found for “qqqq”/)).toBeInTheDocument();
    const tries = within(dlg)
      .getAllByRole("button")
      .filter((b) => b.classList.contains("find-ask"));
    expect(tries).toHaveLength(3);
    fireEvent.click(tries[0] as HTMLElement);
    expect(box).toHaveValue("forecast");
    expect(within(dlg).getAllByRole("option")[0]).toHaveTextContent("Forecast");

    // the clear button brings the tiles back
    fireEvent.click(within(dlg).getByRole("button", { name: "Clear the search" }));
    expect(box).toHaveValue("");
    expect(within(dlg).getByRole("navigation", { name: "Main screens" })).toBeInTheDocument();
  });

  it("arrow keys move, Enter opens the chosen result with the person's id filled in", async () => {
    const { router } = renderAt();
    const { dlg, box } = await openSheet();
    type(box, "forecast");
    const options = within(dlg).getAllByRole("option");
    expect(options[0]).toHaveTextContent("Forecast");
    expect(options[1]).toHaveTextContent("Week ahead");
    fireEvent.keyDown(box, { key: "ArrowDown" });
    expect(box).toHaveAttribute("aria-activedescendant", options[1]?.id);
    expect(options[1]).toHaveAttribute("aria-selected", "true");
    expect(options[0]).toHaveAttribute("aria-selected", "false");
    fireEvent.keyDown(box, { key: "ArrowUp" });
    fireEvent.keyDown(box, { key: "ArrowUp" }); // wraps to the last one
    expect(box).toHaveAttribute("aria-activedescendant", options[options.length - 1]?.id);
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "ArrowDown" });
    fireEvent.keyDown(box, { key: "Enter" });
    expect(router.state.location.pathname).toBe(`/forecast/${ID}`);
    expect(router.state.location.search).toBe("?p=week");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
  });

  it("a thing to do opens Pick a good day with it chosen; a word opens its explanation", async () => {
    const { router } = renderAt();
    const first = await openSheet();
    type(first.box, "good day to travel");
    fireEvent.click(within(first.dlg).getAllByRole("option")[0] as HTMLElement);
    expect(router.state.location.pathname + router.state.location.search).toBe(`/pick/${ID}?for=travel`);

    const again = await openSheet();
    type(again.box, "sade sati");
    const word = within(within(again.dlg).getByRole("group", { name: "Words" })).getByRole("option", { name: /Sāḍe Sātī/ });
    fireEvent.click(word);
    expect(useUi.getState().explain).toBe("sade-sati");
    await waitFor(() => expect(screen.queryByRole("combobox")).toBeNull());
  });

  it("choosing a person switches the active person and stays on this screen", async () => {
    const { router } = renderAt("/festivals");
    const { dlg, box } = await openSheet();
    type(box, "priya");
    const people = await within(dlg).findByRole("group", { name: "People" });
    fireEvent.click(within(people).getByRole("option", { name: /Priya/ }));
    await waitFor(async () => expect((await db.settings.get("app"))?.value.activeProfileId).toBe(SECOND.id));
    expect(router.state.location.pathname).toBe("/festivals");
    // the tiles now carry the new person's id
    const next = await openSheet();
    await waitFor(() => expect(within(next.dlg).getByRole("link", { name: "Chart" })).toHaveAttribute("href", `/patri/${SECOND.id}`));
  });

  it("on a screen about one person, choosing another moves that screen to them", async () => {
    const { router } = renderAt(`/forecast/${ID}?p=month`);
    const { dlg, box } = await openSheet();
    type(box, "priya");
    fireEvent.click(await within(dlg).findByRole("option", { name: /Priya/ }));
    expect(router.state.location.pathname).toBe(`/forecast/${SECOND.id}`);
    expect(router.state.location.search).toBe("?p=month");
    await waitFor(async () => expect((await db.settings.get("app"))?.value.activeProfileId).toBe(SECOND.id));
  });
});
