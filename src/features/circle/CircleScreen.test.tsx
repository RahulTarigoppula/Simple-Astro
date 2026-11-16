import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { resolveBirthMoment } from "../../engine/time";
import type { Profile } from "../../engine/types";
import CircleScreen from "./CircleScreen";
import { leafMoon } from "./leafFacts";

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname}</p>;
}

function renderCircle() {
  const router = createMemoryRouter(
    [
      { path: "/circle", element: <CircleScreen /> },
      { path: "*", element: <Where /> },
    ],
    { initialEntries: ["/circle"] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

const PRIYA: Profile = {
  id: "test-priya",
  name: "Priya",
  birth: resolveBirthMoment({
    localY: 1996,
    localMo: 6,
    localD: 15,
    localH: 9,
    localMi: 30,
    place: { name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.9716, lon: 77.5946, source: "manual" },
  }),
  handedness: "right",
  createdAt: 1,
  updatedAt: 1,
};

describe("card facts", () => {
  it("reads the reference Moon in Revatī, Mīna, the same Moon the Patri casts", () => {
    const m = leafMoon(REFERENCE_PROFILE, "se-true");
    expect(m?.nakName).toBe("Revatī");
    expect(m?.nakDev).toBe("रेवती");
    expect(m?.signName).toBe("Mīna");
  });
});

const MEERA: Profile = { ...PRIYA, id: "test-meera", name: "Meera", createdAt: 2, updatedAt: 2 };

describe("CircleScreen", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.settings.clear();
    await db.patris.clear();
  });

  it("invites the first person when nobody is saved", async () => {
    renderCircle();
    expect(await screen.findByRole("heading", { name: "No one here yet" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1, name: "People" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a person" })).toHaveAttribute("href", "/leaf/new");
  });

  it("lists people as cards in plain English and marks the active one", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    await saveSettings({ activeProfileId: PRIYA.id });
    renderCircle();
    const people = await screen.findByRole("list", { name: "People" });
    const cards = within(people).getAllByRole("listitem");
    expect(cards).toHaveLength(2);
    const rahul = cards.find((c) => within(c).queryByText("Rahul"));
    const priya = cards.find((c) => within(c).queryByText("Priya"));
    expect(rahul).toHaveTextContent("Moon sign MīnaBirth star Revatī");
    expect(rahul).toHaveTextContent("14 Mar 1994 · 7:25 am · Bengaluru");
    await waitFor(() => expect(priya).toHaveTextContent("Viewing now"));
    expect(rahul).not.toHaveTextContent("Viewing now");
    expect(screen.queryByText("रेवती")).toBeNull();
    // One row and one menu button each: no strip of small buttons.
    expect(within(rahul as HTMLElement).getAllByRole("button")).toHaveLength(2);
    expect(screen.getByRole("link", { name: "Add a person" })).toHaveAttribute("href", "/leaf/new");
  });

  it("a tap on the row makes that person active and opens their chart", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderCircle();
    fireEvent.click(await screen.findByRole("button", { name: /^Rahul/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/patri/${REFERENCE_PROFILE.id}`));
    await waitFor(async () => expect((await db.settings.get("app"))?.value.activeProfileId).toBe(REFERENCE_PROFILE.id));
  });

  /** Open the "..." menu of one person and return the sheet. */
  async function menuFor(name: string) {
    fireEvent.click(await screen.findByRole("button", { name: `More for ${name}` }));
    return screen.findByRole("dialog");
  }

  it("the menu opens Chart and Forecast, puts the person in view, and links to Edit", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const first = renderCircle();
    const dlg1 = await menuFor("Priya");
    expect(within(dlg1).getByRole("link", { name: /^Edit birth details/ })).toHaveAttribute("href", `/leaf/${PRIYA.id}/edit`);
    fireEvent.click(within(dlg1).getByRole("button", { name: /^Chart/ }));
    await waitFor(() => expect(first.router.state.location.pathname).toBe(`/patri/${PRIYA.id}`));
    first.unmount();
    const { router } = renderCircle();
    fireEvent.click(within(await menuFor("Rahul")).getByRole("button", { name: /^Forecast/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/forecast/${REFERENCE_PROFILE.id}`));
    await waitFor(async () => expect((await db.settings.get("app"))?.value.activeProfileId).toBe(REFERENCE_PROFILE.id));
  });

  it("Match opens straight away with one other person, and to the match screen with nobody else", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    const alone = renderCircle();
    fireEvent.click(within(await menuFor("Rahul")).getByRole("button", { name: /^Match with…/ }));
    await waitFor(() => expect(alone.router.state.location.pathname).toBe("/milan"));
    alone.unmount();
    await upsertProfile(PRIYA);
    const { router } = renderCircle();
    fireEvent.click(within(await menuFor("Rahul")).getByRole("button", { name: /^Match with…/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`));
  });

  it("Match asks for the partner when there are several other people", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    await upsertProfile(MEERA);
    const { router } = renderCircle();
    const dlg = await menuFor("Rahul");
    fireEvent.click(within(dlg).getByRole("button", { name: /^Match with…/ }));
    expect(await within(dlg).findByRole("heading", { name: "Match Rahul with…" })).toBeInTheDocument();
    fireEvent.click(within(dlg).getByRole("button", { name: "Back" }));
    fireEvent.click(await within(dlg).findByRole("button", { name: /^Match with…/ }));
    fireEvent.click(await within(dlg).findByRole("button", { name: /^Meera/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/milan/${REFERENCE_PROFILE.id}/${MEERA.id}`));
  });

  it("the menu also holds the rare things: the backup and palm", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderCircle();
    const dlg = await menuFor("Rahul");
    fireEvent.click(await within(dlg).findByRole("button", { name: /^Back up/ }));
    const create = await within(dlg).findByRole("button", { name: "Create the backup" });
    expect(create).toBeDisabled();
    fireEvent.change(within(dlg).getByLabelText("Passphrase"), { target: { value: "secret1" } });
    fireEvent.change(within(dlg).getByLabelText("Passphrase again"), { target: { value: "secret2" } });
    expect(within(dlg).getByText("The two passphrases differ.")).toBeInTheDocument();
    expect(create).toBeDisabled();
    fireEvent.change(within(dlg).getByLabelText("Passphrase again"), { target: { value: "secret1" } });
    expect(create).toBeEnabled();
    fireEvent.click(within(dlg).getByRole("button", { name: "Back" }));
    fireEvent.click(await within(dlg).findByRole("button", { name: /^Palm reading/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/hast/${REFERENCE_PROFILE.id}`));
  });

  it("deletes a person after a 600 ms hold on the button that carries their name", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    renderCircle();
    fireEvent.click(await screen.findByRole("button", { name: "More for Priya" }));
    const dlg = await screen.findByRole("dialog");
    const burn = within(dlg).getByRole("button", { name: /Delete Priya, hold/ });
    expect(burn).toHaveTextContent("Hold to delete Priya");
    act(() => {
      fireEvent.keyDown(burn, { key: " " });
    });
    await waitFor(async () => expect(await db.profiles.get(PRIYA.id)).toBeUndefined(), { timeout: 3000 });
    expect(await db.profiles.get(REFERENCE_PROFILE.id)).toBeDefined();
  });

  it("a tap or an early release deletes nothing", async () => {
    await upsertProfile(PRIYA);
    renderCircle();
    fireEvent.click(await screen.findByRole("button", { name: "More for Priya" }));
    const dlg = await screen.findByRole("dialog");
    const burn = within(dlg).getByRole("button", { name: /Delete Priya, hold/ });
    fireEvent.click(burn);
    fireEvent.keyDown(burn, { key: " " });
    fireEvent.keyUp(burn, { key: " " });
    await new Promise((r) => setTimeout(r, 800));
    expect(await db.profiles.get(PRIYA.id)).toBeDefined();
  });
});
