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
const VJA: Place = { name: "Vijayawada", admin1: "Andhra Pradesh", country: "IN", lat: 16.5075, lon: 80.6466, source: "bundle" };
const VJP1: Place = { name: "Vijayapura", admin1: "Karnataka", country: "IN", lat: 16.8302, lon: 75.71, source: "bundle" };
const VJP2: Place = { name: "Vijayapura", admin1: "Karnataka", country: "IN", lat: 13.2946, lon: 77.8013, source: "bundle" };
const NAV: Place = { name: "Navangoda", admin1: "Southern Province", country: "LK", lat: 6.1, lon: 80.2, source: "bundle" };

// The built-in place index is a large file fetched at run time; the flow only needs "a list to pick from".
vi.mock("../../data/places", async (original) => ({
  ...(await original<typeof import("../../data/places")>()),
  loadGazetteer: () => Promise.resolve({}),
  searchPlaces: (q: string) => {
    const s = q.toLowerCase();
    if (s.startsWith("be")) return [BLR];
    if (s.startsWith("ne")) return [NYC];
    if (s.startsWith("vijayap")) return [VJP1, VJP2, NAV];
    if (s.startsWith("vi")) return [VJA, VJP1, VJP2, NAV];
    if (s.startsWith("zz")) return [NAV]; // an old name: nothing matches by name, so the list is left alone
    return [];
  },
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

/** The primary button says what comes next ("Next: birth place"), so it is found by how it starts. */
const next = () => fireEvent.click(screen.getByRole("button", { name: /^Next: / }));
/** The last step's button for a new person: "Save and see my chart" (the first person) or "... the chart". */
/** After an Edit on the last step, the primary button goes straight back there. */
const done = () => fireEvent.click(screen.getByRole("button", { name: "Done: check again" }));
const SAVE = /^Save and see (my|the) chart$/;
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
    sessionStorage.clear();
    await db.profiles.clear();
    await db.settings.clear();
    await db.patris.clear();
  });

  it("starts on the name alone: one box, ready to type in, and nothing else is asked", async () => {
    renderLeaf();
    await onStep(1);
    expect(screen.getByRole("heading", { level: 1, name: "Add a person" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "What is your name?" })).toBeInTheDocument();
    expect(screen.getByText("Everything you type stays on this device.")).toBeInTheDocument();
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(name).toHaveValue("");
    await waitFor(() => expect(name).toHaveFocus());
    // The only field on the step: no tradition, no writing hand, no other box.
    expect(screen.getAllByRole("textbox")).toHaveLength(1);
    expect(screen.queryByRole("radio")).toBeNull();
    expect(screen.queryByRole("combobox")).toBeNull();
    expect(screen.getByRole("button", { name: "Next: birth date and time" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 2: When" })).toBeDisabled();
  });

  it("says a missing name beside the box, only after Next, and puts the cursor back in it", async () => {
    renderLeaf();
    await onStep(1);
    const name = screen.getByRole("textbox", { name: "Name" });
    expect(screen.queryByRole("alert")).toBeNull();
    expect(name).not.toHaveAttribute("aria-invalid");
    name.blur();
    next();
    const said = await screen.findByRole("alert");
    expect(said).toHaveTextContent("Type a name to go on.");
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name.getAttribute("aria-describedby")?.split(" ")).toContain(said.id);
    expect(name.parentElement).toContainElement(said); // beside the field, not down in the action bar
    expect(within(screen.getByTestId("leaf-actions")).queryByRole("alert")).toBeNull();
    await waitFor(() => expect(name).toHaveFocus());
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    // Spaces are not a name.
    type("Name", "   ");
    next();
    expect(screen.getByText("Step 1 of 4")).toBeInTheDocument();
    // Enter goes on once there is one, and the message is gone.
    type("Name", "Asha");
    fireEvent.submit(name.closest("form") as HTMLFormElement);
    await onStep(2);
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("asks about 'you' for the first person and about 'them' once somebody is saved", async () => {
    const first = renderLeaf();
    await fillWho();
    expect(screen.getByRole("heading", { level: 2, name: "When were you born?" })).toBeInTheDocument();
    await fillWhen();
    expect(screen.getByRole("heading", { level: 2, name: "Where were you born?" })).toBeInTheDocument();
    first.unmount();
    sessionStorage.clear();

    await upsertProfile(REFERENCE_PROFILE);
    renderLeaf();
    await onStep(1);
    expect(screen.getByRole("heading", { level: 2, name: "What is their name?" })).toBeInTheDocument();
    type("Name", "Asha");
    next();
    await onStep(2);
    expect(screen.getByRole("heading", { level: 2, name: "When were they born?" })).toBeInTheDocument();
  });

  it("cannot pass When without am or pm, and reads the time back once it is tapped", async () => {
    renderLeaf();
    await fillWho();
    expect(screen.getByRole("textbox", { name: "Day" })).toHaveFocus();
    // Nothing typed yet: a plain hint, not a warning.
    const read = screen.getByTestId("birth-readback");
    expect(read).toHaveTextContent("Your date and time will be read back here.");
    expect(read).not.toHaveClass("is-missing");
    expect(screen.queryByRole("alert")).toBeNull();
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
    expect(screen.getByTestId("birth-readback")).toHaveClass("is-missing"); // really wrong: warned at once
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
    // One line, before it is tapped, says it is fine and what still works.
    expect(unknown).toHaveAccessibleDescription(
      /^That is fine\. The Moon sign and birth star usually still work; only the rising sign needs the time\./,
    );
    // It sits with the time boxes, above the read-back, so it is seen without scrolling.
    expect(unknown.compareDocumentPosition(screen.getByTestId("birth-readback")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
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
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("Born Monday 14 March 1994, time of birth not known, noon is used");
    expect(screen.getByText("The time of birth is not known, so noon is used and the rising sign is left out.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: SAVE }));
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
    // Before any attempt the step only explains itself.
    expect(screen.getByText("The place you pick will show here.")).toBeInTheDocument();
    expect(screen.queryByText(/Not chosen yet/)).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
    next();
    // Said in the box under the search field, which the field points at; the cursor goes back to the field.
    const said = await screen.findByRole("alert");
    expect(said).toHaveTextContent("Not chosen yet. Pick the place of birth from the list.");
    expect(search.getAttribute("aria-describedby")?.split(" ")).toContain(said.id);
    expect(search).toHaveAttribute("aria-invalid", "true");
    expect(within(screen.getByTestId("leaf-actions")).queryByRole("alert")).toBeNull();
    // Typing alone is not a choice.
    fireEvent.change(search, { target: { value: "Be" } });
    next();
    expect(screen.getByText("Step 3 of 4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Step 4: Check" })).toBeDisabled();
    // The list reads like an address: the town, then its state and country by name; no coordinates.
    const found = within(screen.getByRole("list", { name: "Places found" })).getByRole("button", { name: /^Bengaluru/ });
    expect(found).toHaveTextContent("Karnataka, India");
    expect(found).not.toHaveTextContent(/\d\.\d/);
    fireEvent.click(found);
    expect(screen.getByText("Bengaluru, Karnataka, India")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
    next();
    await onStep(4);
    expect(screen.getByRole("heading", { name: "Check and save" })).toHaveFocus();
  });

  it("drops the loose look-alikes after the last real match, and tells two same-named places apart", async () => {
    renderLeaf();
    await fillWho();
    await fillWhen();
    const search = screen.getByRole("searchbox", { name: "Place of birth" });
    const rows = () => within(screen.getByRole("list", { name: "Places found" })).getAllByRole("button");
    fireEvent.change(search, { target: { value: "Vijayaw" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent("VijayawadaAndhra Pradesh, India");
    fireEvent.change(search, { target: { value: "Vijayapura" } });
    await waitFor(() => expect(rows()).toHaveLength(2));
    expect(rows()[0]).toHaveTextContent("Karnataka, India · near 16.8° N, 75.7° E");
    expect(rows()[1]).toHaveTextContent("Karnataka, India · near 13.3° N, 77.8° E");
    fireEvent.change(search, { target: { value: "zz" } });
    await waitFor(() => expect(rows()).toHaveLength(1));
    expect(rows()[0]).toHaveTextContent("NavangodaSouthern Province, Sri Lanka");
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
    // What was entered is said back as three short lines, each with its own way to change it.
    const lines = within(screen.getByRole("list", { name: "What was entered" })).getAllByRole("listitem");
    expect(lines).toHaveLength(3);
    expect(lines[0]).toHaveTextContent("Asha");
    expect(lines[1]).toHaveTextContent("Born Monday 14 March 1994, 7:25 in the morning (07:25)");
    expect(lines[2]).toHaveTextContent("in Bengaluru, Karnataka, India");
    expect(within(lines[0] as HTMLElement).getByRole("button", { name: "Change the name" })).toHaveTextContent("Edit");
    expect(within(lines[1] as HTMLElement).getByRole("button", { name: "Change the date and time" })).toHaveTextContent("Edit");
    expect(within(lines[2] as HTMLElement).getByRole("button", { name: "Change the place" })).toHaveTextContent("Edit");
    expect(review).toHaveTextContent("Coordinates: 12.9716 N · 77.5946 E"); // kept for the technical fold
    // Edit opens that step with everything still there, and one tap returns to the review.
    fireEvent.click(screen.getByRole("button", { name: "Change the date and time" }));
    await onStep(2);
    expect(screen.getByRole("combobox", { name: "Hour" })).toHaveValue("7");
    expect(screen.queryByRole("button", { name: /^Next: / })).toBeNull();
    // ...but not past a mistake: the same checks hold on the way back.
    fireEvent.click(screen.getByRole("radio", { name: "pm" }));
    choose("Month", "2");
    type("Day", "31");
    fireEvent.click(screen.getByRole("button", { name: "Done: check again" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("February 1994 has only 28 days.");
    expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    choose("Month", "3");
    type("Day", "14");
    fireEvent.click(screen.getByRole("radio", { name: "am" }));
    fireEvent.click(screen.getByRole("button", { name: "Done: check again" }));
    await onStep(4);
    const facts = screen.getByRole("region", { name: "Check before you save" });
    expect(within(facts).getByText("Revatī")).toBeInTheDocument();
    expect(facts).toHaveTextContent(/Quarter \(pada\) [1-4]/);
    fireEvent.click(screen.getByRole("button", { name: SAVE }));
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
    expect(screen.getByRole("note")).toHaveTextContent("This is an example person, so you can look around.");
    const save = screen.getByRole("button", { name: "Save and see the chart" });
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

  it("the tradition and the writing hand are chosen on the last step, show what changes, and are what is saved", async () => {
    const { router } = renderLeaf();
    await fillWho();
    await fillWhen();
    await pickPlace();
    next();
    await onStep(4);
    // Sensible starting points: North Indian for a birth in Karnataka, and the right hand.
    const trad = screen.getByRole("radiogroup", { name: /^Names and chart style/ });
    expect(within(trad).getAllByRole("radio")).toHaveLength(3);
    expect(within(trad).getByRole("radio", { name: "North Indian" })).toBeChecked();
    expect(trad).toHaveAccessibleDescription(/^Sanskrit names and the diamond-shaped chart\./);
    expect(screen.getByRole("radio", { name: "Right" })).toBeChecked();
    const facts = screen.getByRole("region", { name: "Check before you save" });
    expect(facts).not.toHaveTextContent("Meenam");
    // Picking another one changes the names in the check card at once, and the line under the choice.
    fireEvent.click(within(trad).getByRole("radio", { name: "Telugu" }));
    expect(within(trad).getByRole("radio", { name: "Telugu" })).toBeChecked();
    expect(trad).toHaveAccessibleDescription(/^Telugu names beside the Sanskrit, and the square South Indian chart\./);
    expect(facts).toHaveTextContent("Meenam (Mīna)");
    // The writing hand is under "More options".
    const more = screen.getByText("More options").closest("details") as HTMLElement;
    fireEvent.click(within(more).getByRole("radio", { name: "Left" }));
    fireEvent.click(screen.getByRole("button", { name: SAVE }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    expect((await db.profiles.toArray())[0]).toMatchObject({ name: "Asha", tradition: "telugu", handedness: "left" });
  });

  it("suggests the tradition from the birth place, and a choice made by hand is never overruled", async () => {
    const { router } = renderLeaf();
    await fillWho();
    await fillWhen();
    fireEvent.change(screen.getByRole("searchbox", { name: "Place of birth" }), { target: { value: "Vijayaw" } });
    fireEvent.click(await screen.findByRole("button", { name: /^Vijayawada/ }));
    next();
    await onStep(4);
    expect(screen.getByRole("radio", { name: "Telugu" })).toBeChecked(); // Andhra Pradesh
    // Change the place: the suggestion follows it.
    fireEvent.click(screen.getByRole("button", { name: "Change the place" }));
    await onStep(3);
    await pickPlace();
    done();
    await onStep(4);
    expect(screen.getByRole("radio", { name: "North Indian" })).toBeChecked();
    // Picked by hand: it stays, whatever the place.
    fireEvent.click(screen.getByRole("radio", { name: "Tamil" }));
    fireEvent.click(screen.getByRole("button", { name: "Change the place" }));
    await onStep(3);
    fireEvent.change(screen.getByRole("searchbox", { name: "Place of birth" }), { target: { value: "Vijayaw" } });
    fireEvent.click(await screen.findByRole("button", { name: /^Vijayawada/ }));
    done();
    await onStep(4);
    expect(screen.getByRole("radio", { name: "Tamil" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: SAVE }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    expect((await db.profiles.toArray())[0]).toMatchObject({ tradition: "tamil", handedness: "right" });
  });

  it("starts the next person on the tradition the family already uses", async () => {
    await upsertProfile({ ...REFERENCE_PROFILE, tradition: "tamil" });
    const { router } = renderLeaf();
    await fillWho();
    await fillWhen();
    await pickPlace(); // Bengaluru would suggest North Indian; the family's own choice comes first
    next();
    await onStep(4);
    expect(screen.getByRole("radio", { name: "Tamil" })).toBeChecked();
    fireEvent.click(screen.getByRole("button", { name: "Save and see the chart" }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    const asha = (await db.profiles.toArray()).find((p) => p.name === "Asha");
    expect(asha).toMatchObject({ tradition: "tamil", handedness: "right" });
  });
});

describe("LeafScreen: /leaf/new?example=1", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await db.profiles.clear();
    await db.settings.clear();
    await db.patris.clear();
  });

  it("opens the last step with the example filled in, and one tap saves exactly that person", async () => {
    const { router } = renderLeaf("/leaf/new?example=1");
    await onStep(4);
    const lines = within(screen.getByRole("list", { name: "What was entered" })).getAllByRole("listitem");
    expect(lines[0]).toHaveTextContent("Rahul");
    expect(lines[1]).toHaveTextContent("Born Monday 14 March 1994, 7:25 in the morning (07:25)");
    expect(lines[2]).toHaveTextContent("in Bengaluru, Karnataka, India");
    const check = screen.getByRole("region", { name: "Check before you save" });
    expect(check).toHaveTextContent("Revatī");
    expect(check).toHaveTextContent("Mīna");
    expect(screen.getByRole("status", { name: /Julian Day/ })).toHaveTextContent("ASIA/KOLKATA");
    expect(screen.getByRole("note")).toHaveTextContent("This is an example person");
    // The flag is used once and leaves the address, so a reload keeps later changes.
    await waitFor(() => expect(router.state.location.search).toBe("?step=4"));
    fireEvent.click(screen.getByRole("button", { name: "Save and see the chart" }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    const all = await db.profiles.toArray();
    expect(all).toHaveLength(1);
    expect(all[0]).toMatchObject({ name: "Rahul", handedness: REFERENCE_PROFILE.handedness, tradition: "north" });
    expect(all[0]?.birth.utcMs).toBe(REFERENCE_PROFILE.birth.utcMs);
    expect(all[0]?.birth).toMatchObject({ localH: 7, localMi: 25, zone: "Asia/Kolkata" });
    // Back from the chart does not land in the form.
    router.navigate(-1);
    await waitFor(() => expect(router.state.location.pathname).toBe("/"));
  });

  it("replaces a half-typed draft, and 'Use my own details' goes back to an empty first step", async () => {
    const first = renderLeaf();
    await onStep(1);
    type("Name", "Somebody half typed");
    await waitFor(() => expect(sessionStorage.getItem("vyom-leaf-draft")).not.toBeNull());
    first.unmount();

    renderLeaf("/leaf/new?example=1");
    await onStep(4);
    expect(screen.getByRole("main")).toHaveTextContent("Rahul");
    expect(screen.getByRole("main")).not.toHaveTextContent("Somebody half typed");
    fireEvent.click(screen.getByRole("button", { name: "Use my own details" }));
    await onStep(1);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.getByRole("button", { name: "Step 2: When" })).toBeDisabled();
    await waitFor(() => expect(sessionStorage.getItem("vyom-leaf-draft")).toBeNull());
    expect(await db.profiles.count()).toBe(0);
  });

  it("does nothing when a saved person is being edited", async () => {
    const other: Profile = { ...REFERENCE_PROFILE, id: "test-other", name: "Meena" };
    await upsertProfile(other);
    renderLeaf("/leaf/test-other/edit?example=1");
    await onStep(4);
    expect(screen.getByRole("main")).toHaveTextContent("Meena");
    expect(screen.queryByRole("note")).toBeNull();
    expect(screen.getByRole("button", { name: "Save changes" })).toBeInTheDocument();
  });
});

describe("LeafScreen: the draft and the action bar", () => {
  beforeEach(async () => {
    sessionStorage.clear();
    await db.profiles.clear();
    await db.settings.clear();
    await db.patris.clear();
  });

  it("keeps the Back / Next (or Save) row in one action bar on every step", async () => {
    renderLeaf();
    await onStep(1);
    const bar = screen.getByTestId("leaf-actions");
    expect(bar).toHaveClass("leaf-foot");
    // The button says what happens next; the first step has nothing to go back to.
    expect(within(bar).getByRole("button", { name: "Next: birth date and time" })).toBeInTheDocument();
    expect(within(bar).queryByRole("button", { name: "Back" })).toBeNull();
    expect(bar.nextElementSibling).toBeNull(); // nothing sits under the bar
    type("Name", "Asha");
    next();
    await onStep(2);
    expect(within(screen.getByTestId("leaf-actions")).getByRole("button", { name: "Next: birth place" })).toBeInTheDocument();
    expect(within(screen.getByTestId("leaf-actions")).getByRole("button", { name: "Back" })).toBeInTheDocument();
    await fillWhen();
    expect(within(screen.getByTestId("leaf-actions")).getByRole("button", { name: "Next: check it" })).toBeInTheDocument();
    await pickPlace();
    next();
    await onStep(4);
    const last = screen.getByTestId("leaf-actions");
    expect(within(last).getByRole("button", { name: "Save and see my chart" })).toBeInTheDocument();
    expect(within(last).getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(last.nextElementSibling).toBeNull();
  });

  it("brings everything back after the screen is left and opened again, on the same step", async () => {
    const first = renderLeaf();
    await fillWho();
    await fillWhen();
    await pickPlace();
    next();
    await onStep(4);
    fireEvent.click(screen.getByRole("radio", { name: "Telugu" }));
    fireEvent.click(screen.getByRole("radio", { name: "Left" }));
    back();
    await onStep(3);
    fireEvent.click(screen.getByText("Advanced"));
    fireEvent.click(screen.getByRole("radio", { name: "Bombay +04:51" }));
    expect(JSON.parse(sessionStorage.getItem("vyom-leaf-draft") ?? "{}")).toMatchObject({ name: "Asha", place: { name: "Bengaluru" } });
    first.unmount();

    // A reload on step 3 stays on step 3.
    renderLeaf("/leaf/new?step=3");
    await onStep(3);
    expect(screen.getByText("Bengaluru, Karnataka, India")).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: "Bombay +04:51" })).toBeChecked();
    back();
    await onStep(2);
    expect(screen.getByRole("textbox", { name: "Day" })).toHaveValue("14");
    expect(screen.getByRole("combobox", { name: "Month" })).toHaveValue("3");
    expect(screen.getByRole("textbox", { name: "Year" })).toHaveValue("1994");
    expect(screen.getByRole("combobox", { name: "Hour" })).toHaveValue("7");
    expect(screen.getByRole("combobox", { name: "Minute" })).toHaveValue("25");
    expect(screen.getByRole("radio", { name: "am" })).toBeChecked();
    back();
    await onStep(1);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Asha");
    expect(screen.getByText("Carrying on where you left off.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Step 4: Check" }));
    await onStep(4);
    expect(screen.getByRole("radio", { name: "Telugu" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Left" })).toBeChecked();
  });

  it("'Start again' throws the draft away", async () => {
    const first = renderLeaf();
    await onStep(1);
    expect(screen.queryByText("Carrying on where you left off.")).toBeNull();
    type("Name", "Asha");
    next();
    await onStep(2);
    fillDate();
    first.unmount();

    renderLeaf();
    await onStep(1);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("Asha");
    fireEvent.click(screen.getByRole("button", { name: "Start again" }));
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.queryByText("Carrying on where you left off.")).toBeNull();
    expect(screen.getByRole("button", { name: "Step 2: When" })).toBeDisabled();
    await waitFor(() => expect(sessionStorage.getItem("vyom-leaf-draft")).toBeNull());
  });

  it("the example replaces a stale draft", async () => {
    const first = renderLeaf();
    await onStep(1);
    type("Name", "Somebody half typed");
    first.unmount();

    const { router } = renderLeaf();
    await onStep(1);
    fireEvent.click(screen.getByRole("button", { name: /fill in an example/i }));
    await onStep(4);
    expect(screen.getByRole("main")).toHaveTextContent("Rahul");
    expect(JSON.parse(sessionStorage.getItem("vyom-leaf-draft") ?? "{}")).toMatchObject({ name: "Rahul", y: 1994 });
    fireEvent.click(screen.getByRole("button", { name: "Save and see the chart" }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    expect((await db.profiles.toArray())[0]?.name).toBe("Rahul");
  });

  it("clears the draft after a save, so the next person starts empty", async () => {
    const { router, unmount } = renderLeaf();
    await fillWho();
    await fillWhen();
    await pickPlace();
    next();
    await onStep(4);
    expect(sessionStorage.getItem("vyom-leaf-draft")).not.toBeNull();
    fireEvent.click(screen.getByRole("button", { name: SAVE }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/patri\//));
    expect(sessionStorage.getItem("vyom-leaf-draft")).toBeNull();
    unmount();

    renderLeaf();
    await onStep(1);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.queryByText("Carrying on where you left off.")).toBeNull();
  });

  it("ignores a draft that cannot be read, and works with storage switched off", async () => {
    sessionStorage.setItem("vyom-leaf-draft", "{not json");
    const first = renderLeaf();
    await onStep(1);
    expect(screen.getByRole("textbox", { name: "Name" })).toHaveValue("");
    first.unmount();

    const off = () => {
      throw new Error("storage is off");
    };
    const get = vi.spyOn(Storage.prototype, "getItem").mockImplementation(off);
    const set = vi.spyOn(Storage.prototype, "setItem").mockImplementation(off);
    const remove = vi.spyOn(Storage.prototype, "removeItem").mockImplementation(off);
    try {
      renderLeaf();
      await fillWho();
      expect(screen.getByText("Step 2 of 4")).toBeInTheDocument();
    } finally {
      get.mockRestore();
      set.mockRestore();
      remove.mockRestore();
    }
  });

  it("keeps unsaved changes to a saved person under their own key, and clears them on save", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    const at = `/leaf/${REFERENCE_PROFILE.id}/edit`;
    const key = `vyom-leaf-draft:${REFERENCE_PROFILE.id}`;
    const first = renderLeaf(at);
    await onStep(4);
    expect(sessionStorage.getItem(key)).toBeNull(); // nothing changed, nothing kept
    fireEvent.click(screen.getByRole("button", { name: "Change the name" }));
    await onStep(1);
    type("Name", "Rahul T");
    expect(screen.queryByText("Carrying on where you left off.")).toBeNull();
    await waitFor(() => expect(sessionStorage.getItem(key)).not.toBeNull());
    expect(sessionStorage.getItem("vyom-leaf-draft")).toBeNull();
    first.unmount();

    const { router } = renderLeaf(at);
    await onStep(4);
    expect(screen.getByRole("main")).toHaveTextContent("Rahul T");
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/patri/${REFERENCE_PROFILE.id}`));
    expect(sessionStorage.getItem(key)).toBeNull();
    expect((await db.profiles.toArray())[0]?.name).toBe("Rahul T");
  });
});

describe("LeafScreen: editing a person", () => {
  beforeEach(async () => {
    sessionStorage.clear();
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

  it("shows the saved tradition and writing hand, and lets both be changed", async () => {
    const saved: Profile = { ...REFERENCE_PROFILE, id: "test-latha", name: "Latha", tradition: "tamil", handedness: "left" };
    await upsertProfile(saved);
    // Somebody else in the family uses another tradition: the saved person's own is what shows.
    await upsertProfile({ ...REFERENCE_PROFILE, id: "test-newer", name: "Newer", tradition: "telugu", updatedAt: saved.updatedAt + 1000 });
    const { router } = renderLeaf("/leaf/test-latha/edit");
    await onStep(4);
    expect(screen.getByRole("radio", { name: "Tamil" })).toBeChecked();
    expect(screen.getByRole("radio", { name: "Left" })).toBeChecked();
    expect(screen.queryByRole("note")).toBeNull(); // a saved person is never called the example
    fireEvent.click(screen.getByRole("radio", { name: "North Indian" }));
    fireEvent.click(screen.getByRole("radio", { name: "Right" }));
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(router.state.location.pathname).toBe("/patri/test-latha"));
    expect(await db.profiles.get("test-latha")).toMatchObject({ name: "Latha", tradition: "north", handedness: "right" });
    expect((await db.profiles.get("test-latha"))?.birth.utcMs).toBe(REFERENCE_PROFILE.birth.utcMs);
  });

  it("does not pre-fill noon for a person whose time is not known", async () => {
    const unknown: Profile = { ...REFERENCE_PROFILE, id: "test-unknown", name: "Meena", timeUnknown: true };
    await upsertProfile(unknown);
    renderLeaf("/leaf/test-unknown/edit");
    await onStep(4);
    expect(screen.getByTestId("birth-readback")).toHaveTextContent("Born Monday 14 March 1994, time of birth not known, noon is used");
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
