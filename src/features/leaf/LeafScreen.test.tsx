import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../data/db";
import { upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import type { Place, Profile } from "../../engine/types";
import LeafScreen from "./LeafScreen";

const BLR: Place = { name: "Bengaluru", admin1: "Karnataka", country: "IN", lat: 12.9716, lon: 77.5946, source: "bundle" };
const NYC: Place = { name: "New York", admin1: "New York", country: "US", lat: 40.7128, lon: -74.006, source: "bundle" };

// The built-in place index is a large file fetched at run time; the flow only needs "a list to pick from".
vi.mock("../../data/places", async (original) => ({
  ...(await original<typeof import("../../data/places")>()),
  loadGazetteer: () => Promise.resolve({}),
  searchPlaces: (q: string) => (q.toLowerCase().startsWith("be") ? [BLR] : q.toLowerCase().startsWith("ne") ? [NYC] : []),
}));

function Where() {
  const loc = useLocation();
  return <p data-testid="where">{loc.pathname}</p>;
}

function renderLeaf(at = "/leaf/new") {
  const router = createMemoryRouter(
    [
      { path: "/leaf/new", element: <LeafScreen /> },
      { path: "/leaf/:id/edit", element: <LeafScreen /> },
      { path: "*", element: <Where /> },
    ],
    { initialEntries: ["/", at], initialIndex: 1 },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));
/** The Back button under the step (the page also has one in its top bar; both walk back). */
const back = () => fireEvent.click(screen.getAllByRole("button", { name: "Back" }).at(-1) as HTMLElement);
const onStep = (n: number) => screen.findByText(`Step ${n} of 4`);
const type = (name: string, value: string) => fireEvent.change(screen.getByRole("textbox", { name }), { target: { value } });
const choose = (name: string, value: string) => fireEvent.change(screen.getByRole("combobox", { name }), { target: { value } });

async function fillWho() {
  await onStep(1);
  type("Name", "Asha");
  next();
  await onStep(2);
}
function fillDate() {
  type("Day", "14");
  choose("Month", "3");
  type("Year", "1994");
}
async function fillWhen() {
  fillDate();
  choose("Hour", "7");
  choose("Minute", "25");
  fireEvent.click(screen.getByRole("radio", { name: "am" }));
  next();
  await onStep(3);
}
async function pickPlace() {
  fireEvent.change(screen.getByRole("searchbox", { name: "Place of birth" }), { target: { value: "Be" } });
  fireEvent.click(await screen.findByRole("button", { name: /^Bengaluru/ }));
}

describe("LeafScreen: adding a person, step by step", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.settings.clear();
    await db.patris.clear();
  });

  it("starts empty on Who and names the problem when the name is missing", async () => {
    renderLeaf();
    await onStep(1);
    expect(screen.getByRole("heading", { level: 1, name: "Add a person" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.getByRole("radio", { name: /^North Indian/ })).toBeChecked();
    expect(screen.getByRole("button", { name: "Step 2: When" })).toBeDisabled();
    next();
    expect(await screen.findByRole("alert")).toHaveTextContent("Type a name to go on.");
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
  });

  it("cannot pass When without am or pm, and reads the time back once it is tapped", async () => {
    renderLeaf();
    await fillWho();
    expect(screen.getByRole("textbox", { name: "Day" })).toHaveFocus();
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("Fill in the date of birth.");
    // am/pm is never assumed.
    expect(screen.getByRole("radio", { name: "am" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "pm" })).not.toBeChecked();
    fillDate();
    choose("Hour", "7");
    choose("Minute", "25");
    next();
    expect(await screen.findByRole("alert")).toHaveTextContent("Was it am or pm? Tap one.");
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "pm" }));
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("14 March 1994, 7:25 in the evening (19:25)");
    fireEvent.click(screen.getByRole("radio", { name: "am" }));
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("14 March 1994, 7:25 in the morning (07:25)");
    next();
    await onStep(3);
  });

  it("names an impossible date instead of clamping it", async () => {
    renderLeaf();
    await fillWho();
    type("Day", "31");
    choose("Month", "2");
    type("Year", "1994");
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("February 1994 has only 28 days.");
    type("Year", "1700");
    type("Day", "3");
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("Years 1800 to 2100 only.");
    next();
    expect(await screen.findByRole("alert")).toHaveTextContent("Years 1800 to 2100 only.");
  });

  it("lets When pass without a clock time once 'I don't know the time' is on", async () => {
    renderLeaf();
    await fillWho();
    fillDate();
    const unknown = screen.getByRole("switch", { name: "I don't know the time" });
    expect(unknown).not.toBeChecked();
    fireEvent.click(unknown);
    expect(unknown).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Hour" })).toBeDisabled();
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("14 March 1994, time of birth not known, noon is used");
    next();
    await onStep(3);
    await pickPlace();
    next();
    await onStep(4);
    expect(screen.getByRole("region", { name: "Check before you save" })).toHaveTextContent("needs the time");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(async () => expect(await db.profiles.count()).toBe(1));
    const saved = (await db.profiles.toArray())[0];
    expect(saved?.timeUnknown).toBe(true);
    expect(saved?.birth).toMatchObject({ localH: 12, localMi: 0 });
  });

  it("cannot pass Where without a place picked from the list; nothing is pre-filled", async () => {
    renderLeaf();
    await fillWho();
    await fillWhen();
    const search = screen.getByRole("searchbox", { name: "Place of birth" });
    expect(search).toHaveFocus();
    expect(search).toHaveValue("");
    expect(screen.getByText("Not chosen yet.")).toBeInTheDocument();
    next();
    expect(await screen.findByRole("alert")).toHaveTextContent("Pick the place of birth from the list.");
    // Typing alone is not a choice.
    fireEvent.change(search, { target: { value: "Be" } });
    next();
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 4: Check" })).toBeDisabled();
    fireEvent.click(await screen.findByRole("button", { name: /^Bengaluru/ }));
    expect(screen.getByText("Bengaluru, Karnataka, IN")).toBeInTheDocument();
    next();
    await onStep(4);
    expect(screen.getByRole("heading", { name: "Check and save" })).toHaveFocus();
  });

  it("walks all four steps, keeps what was typed when going back, and saves one person", async () => {
    const { router } = renderLeaf();
    await fillWho();
    await fillWhen();
    await pickPlace();
    // Back never loses anything.
    back();
    await onStep(2);
    expect(screen.getByRole("textbox", { name: "Day" })).toHaveValue("14");
    expect(screen.getByRole("combobox", { name: "Minute" })).toHaveValue("25");
    expect(screen.getByRole("radio", { name: "am" })).toBeChecked();
    back();
    await onStep(1);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Asha");
    // Enter advances.
    fireEvent.submit(screen.getByRole("textbox", { name: "Name" }).closest("form") as HTMLFormElement);
    await onStep(2);
    fireEvent.click(screen.getByRole("button", { name: "Step 4: Check" }));
    await onStep(4);
    const review = screen.getByRole("main");
    expect(review).toHaveTextContent("Asha");
    expect(review).toHaveTextContent("14 March 1994, 7:25 in the morning (07:25)");
    expect(review).toHaveTextContent("Bengaluru, Karnataka, IN");
    expect(within(screen.getByRole("region", { name: "Check before you save" })).getByText("Revatī")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    const all = await db.profiles.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Asha", handedness: "right", tradition: "north" });
    expect(all[0]?.birth).toMatchObject({ localY: 1994, localMo: 3, localD: 14, localH: 7, localMi: 25, zone: "Asia/Kolkata" });
    expect(router.state.location.pathname).toBe(`/patri/${all[0]?.id}`);
    expect((await db.settings.get("app"))?.value.activeProfileId).toBe(all[0]?.id);
    // The steps are taken back out of the history: Back from the chart does not land in the form.
    router.navigate(-1);
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it("the example goes straight to the review, and one tap on Save creates exactly one profile", async () => {
    const { router } = renderLeaf();
    await onStep(1);
    fireEvent.click(screen.getByRole("button", { name: /fill in an example/i }));
    await onStep(4);
    const check = screen.getByRole("region", { name: "Check before you save" });
    expect(check).toHaveTextContent("Revatī");
    expect(check).toHaveTextContent("Mīna");
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("14 March 1994, 7:25 in the morning (07:25)");
    expect(screen.getByRole("status", { name: /Julian Day/ })).toHaveTextContent("ASIA/KOLKATA");
    const save = screen.getByRole("button", { name: /^save/i });
    fireEvent.click(save);
    fireEvent.click(save); // an impatient second tap saves nothing more
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    const all = await db.profiles.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]?.name).toBe("Rahul");
    expect(all[0]?.birth.utcMs).toBe(REFERENCE_PROFILE.birth.utcMs);
  });

  it("stops at a clock time a clock change skipped, until the offset is given by hand", async () => {
    renderLeaf();
    await fillWho();
    type("Day", "14");
    choose("Month", "3");
    type("Year", "2021");
    choose("Hour", "2");
    choose("Minute", "30");
    fireEvent.click(screen.getByRole("radio", { name: "am" }));
    next();
    await onStep(3);
    fireEvent.change(screen.getByRole("searchbox", { name: "Place of birth" }), { target: { value: "Ne" } });
    fireEvent.click(await screen.findByRole("button", { name: /^New York/ }));
    expect(await screen.findByRole("status", { name: "" })).toHaveTextContent("This clock time did not exist here");
    // The Advanced panel opens by itself, and the step will not pass.
    expect(screen.getByText("Advanced").closest("details")).toHaveAttribute("open");
    next();
    expect(await screen.findByRole("alert")).toHaveTextContent("This clock time did not exist here");
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Manual" }));
    expect(screen.getByText(/You set the clock offset by hand/)).toBeInTheDocument();
    next();
    await onStep(4);
    expect(screen.getByRole("status", { name: /Julian Day/ })).toHaveTextContent("(manual)");
  });

  it("asks which one when a clock time happened twice", async () => {
    renderLeaf();
    await fillWho();
    type("Day", "7");
    choose("Month", "11");
    type("Year", "2021");
    choose("Hour", "1");
    choose("Minute", "30");
    fireEvent.click(screen.getByRole("radio", { name: "am" }));
    next();
    await onStep(3);
    fireEvent.change(screen.getByRole("searchbox", { name: "Place of birth" }), { target: { value: "Ne" } });
    fireEvent.click(await screen.findByRole("button", { name: /^New York/ }));
    next();
    expect(await screen.findByRole("alert")).toHaveTextContent("This clock time happened twice here");
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
  });

  it("hides the example once typing has started", async () => {
    renderLeaf();
    await onStep(1);
    expect(screen.getByRole("button", { name: /fill in an example/i })).toBeInTheDocument();
    type("Name", "A");
    expect(screen.queryByRole("button", { name: /fill in an example/i })).toBeNull();
  });

  it("the tradition and the writing hand chosen on Who are what is saved", async () => {
    const { router } = renderLeaf();
    await onStep(1);
    type("Name", "Latha");
    fireEvent.click(screen.getByRole("radio", { name: /^Telugu/ }));
    fireEvent.click(screen.getByRole("radio", { name: "Left" }));
    next();
    await onStep(2);
    await fillWhen();
    await pickPlace();
    next();
    await onStep(4);
    expect(screen.getByRole("main")).toHaveTextContent("Telugu · left-handed");
    expect(screen.getByRole("region", { name: "Check before you save" })).toHaveTextContent("Meenam (Mīna)");
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    expect((await db.profiles.toArray())[0]).toMatchObject({ name: "Latha", tradition: "telugu", handedness: "left" });
  });
});

describe("LeafScreen: editing a person", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.settings.clear();
    await db.patris.clear();
  });

  it("opens on the review with everything filled, lets any step be opened, and saves the same person", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    const { router } = renderLeaf(`/leaf/${REFERENCE_PROFILE.id}/edit`);
    await onStep(4);
    expect(screen.getByRole("heading", { level: 1, name: "Edit person" })).toBeInTheDocument();
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("14 March 1994, 7:25 in the morning (07:25)");
    expect(screen.queryByRole("button", { name: /fill in an example/i })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Step 2: When" }));
    await onStep(2);
    expect(screen.getByRole("combobox", { name: "Hour" })).toHaveValue("7");
    fireEvent.click(screen.getByRole("radio", { name: "pm" }));
    fireEvent.click(screen.getByRole("button", { name: "Step 4: Check" }));
    await onStep(4);
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("7:25 in the evening (19:25)");
    fireEvent.click(screen.getByRole("button", { name: "Change the name" }));
    await onStep(1);
    type("Name", "Rahul T");
    fireEvent.click(screen.getByRole("button", { name: "Step 4: Check" }));
    await onStep(4);
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/patri/${REFERENCE_PROFILE.id}`));
    const all = await db.profiles.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ id: REFERENCE_PROFILE.id, name: "Rahul T", createdAt: REFERENCE_PROFILE.createdAt });
    expect(all[0]?.birth.localH).toBe(19);
  });

  it("does not pre-fill noon for a person whose time is not known", async () => {
    const unknown: Profile = { ...REFERENCE_PROFILE, id: "test-unknown", name: "Meena", timeUnknown: true };
    await upsertProfile(unknown);
    renderLeaf("/leaf/test-unknown/edit");
    await onStep(4);
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("time of birth not known, noon is used");
    expect(screen.getByRole("region", { name: "Check before you save" })).toHaveTextContent("needs the time");
    fireEvent.click(screen.getByRole("button", { name: "Change the date and time" }));
    await onStep(2);
    expect(screen.getByRole("switch", { name: "I don't know the time" })).toBeChecked();
    expect(screen.getByRole("combobox", { name: "Hour" })).toHaveValue("");
    expect(screen.getByRole("radio", { name: "am" })).not.toBeChecked();
    expect(screen.getByRole("radio", { name: "pm" })).not.toBeChecked();
    // Switching the clock back on asks for the time: nothing is assumed.
    fireEvent.click(screen.getByRole("switch", { name: "I don't know the time" }));
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("Pick the hour of birth.");
  });

  it("says so when the person is not on this device", async () => {
    renderLeaf("/leaf/nobody/edit");
    expect(await screen.findByRole("heading", { name: "Person not found" })).toBeInTheDocument();
  });
});
