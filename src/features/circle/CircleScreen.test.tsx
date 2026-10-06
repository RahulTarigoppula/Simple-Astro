import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { upsertProfile } from "../../data/repo";
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

/** The bundle remembers being untied for the session; make sure it is open. */
async function untie() {
  const t = await screen.findByRole("button", { name: /^(Untie|Tie it up)$/ });
  if (t.textContent === "Untie") fireEvent.click(t);
  await screen.findByRole("button", { name: "Tie it up" });
}

describe("leaf facts", () => {
  it("reads the reference Moon in Revatī, Mīna — the same Moon the Patri casts", () => {
    const m = leafMoon(REFERENCE_PROFILE, "se-true");
    expect(m?.nakName).toBe("Revatī");
    expect(m?.nakDev).toBe("रेवती");
    expect(m?.signName).toBe("Mīna");
  });
});

describe("CircleScreen", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.settings.clear();
    await db.patris.clear();
  });

  it("shows only the blank leaf when the bundle is empty", async () => {
    renderCircle();
    expect(await screen.findByRole("heading", { name: "Write your first leaf" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Write your first leaf/ })).toHaveAttribute("href", "/leaf/new");
  });

  it("unties the bundle into tappable leaves and opens a leaf's Patri", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderCircle();
    const toggle = await screen.findByRole("button", { name: /^(Untie|Tie it up)$/ });
    if (toggle.textContent === "Tie it up") fireEvent.click(toggle);
    // tied: the leaves are inert until the thread is pulled
    expect(await screen.findByRole("list", { name: "Leaves" })).toHaveAttribute("inert");
    await untie();
    expect(screen.getByRole("list", { name: "Leaves" })).not.toHaveAttribute("inert");
    const rahul = await screen.findByRole("button", { name: /^Rahul — Moon in Revatī/ });
    expect(screen.getByText("रेवती")).toHaveAttribute("lang", "hi");
    fireEvent.click(rahul);
    await waitFor(() => expect(router.state.location.pathname).toBe(`/patri/${REFERENCE_PROFILE.id}`));
    await waitFor(async () => expect((await db.settings.get("app"))?.value.activeProfileId).toBe(REFERENCE_PROFILE.id));
  });

  it("pairs two leaves for a Milan from the ⋯ sheet", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderCircle();
    await untie();
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Rahul's leaf" }));
    const dlg = await screen.findByRole("dialog");
    fireEvent.click(within(dlg).getByRole("button", { name: "Milan with…" }));
    fireEvent.click(await within(dlg).findByRole("button", { name: /^Priya/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`));
  });

  it("burns a leaf after a 600 ms hold", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    renderCircle();
    await untie();
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Priya's leaf" }));
    const dlg = await screen.findByRole("dialog");
    const burn = within(dlg).getByRole("button", { name: /Burn Priya's leaf/ });
    act(() => {
      fireEvent.keyDown(burn, { key: " " });
    });
    await waitFor(async () => expect(await db.profiles.get(PRIYA.id)).toBeUndefined(), { timeout: 3000 });
    expect(await db.profiles.get(REFERENCE_PROFILE.id)).toBeDefined();
  });

  it("an early release cools the leaf and burns nothing", async () => {
    await upsertProfile(PRIYA);
    renderCircle();
    await untie();
    fireEvent.click(await screen.findByRole("button", { name: "Actions for Priya's leaf" }));
    const dlg = await screen.findByRole("dialog");
    const burn = within(dlg).getByRole("button", { name: /Burn Priya's leaf/ });
    fireEvent.keyDown(burn, { key: " " });
    fireEvent.keyUp(burn, { key: " " });
    await new Promise((r) => setTimeout(r, 800));
    expect(await db.profiles.get(PRIYA.id)).toBeDefined();
  });
});
