import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { upsertProfile } from "../../data/repo";
import { milan } from "../../engine/ashtakoota";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { resolveBirthMoment } from "../../engine/time";
import { DEFAULT_PRESET, type KootaResult, type Profile } from "../../engine/types";
import { beadsOf } from "./Mala";
import MilanScreen from "./MilanScreen";
import { BAND_LABEL, fmtPts } from "./rules";

const PRIYA: Profile = {
  id: "test-priya",
  name: "Priya",
  // Moon in Rohiṇī (Vṛṣabha) at the default preset.
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

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: "/milan/:a/:b", element: <MilanScreen /> },
      { path: "/milan", element: <MilanScreen /> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

/** What the engine says, computed independently of the screen. */
function engineResult(a: Profile, b: Profile) {
  return milan(a, b, computePatri(a, DEFAULT_PRESET, 0), computePatri(b, DEFAULT_PRESET, 0));
}

describe("bead plan", () => {
  const k = (score: number, max: KootaResult["max"], dosha = false): KootaResult => ({
    id: "tara",
    name: "Tārā",
    nameDev: "तारा",
    max,
    score,
    dosha,
    because: "Tārā: test",
    citation: { text: "T", ref: "1" },
  });
  it("draws half points as a half bead and doṣas as lac", () => {
    expect(beadsOf(k(1.5, 3)).map((b) => b.kind)).toEqual(["brass", "half", "wood"]);
    expect(beadsOf(k(0, 8, true)).every((b) => b.kind === "lac")).toBe(true);
    expect(beadsOf(k(0, 1)).map((b) => b.kind)).toEqual(["wood"]);
  });
});

describe("MilanScreen", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.patris.clear();
    await db.settings.clear();
  });

  it("strings exactly milan()'s output on the mala — every row, the total and the band", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const want = engineResult(REFERENCE_PROFILE, PRIYA);
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);

    for (const k of want.kootas) {
      const img = await screen.findByRole("img", { name: new RegExp(`^${k.name}: ${fmtPts(k.score).replace(".", "\\.")} of ${k.max} points`) }, { timeout: 5000 });
      expect(img).toBeInTheDocument();
    }
    // Tap anywhere to finish the count.
    fireEvent.pointerDown(document.body);
    expect(await screen.findByText(BAND_LABEL[want.band])).toBeInTheDocument();
    expect(screen.getByText(`${fmtPts(want.total)} of 36 points — ${BAND_LABEL[want.band]}.`)).toBeInTheDocument();

    // The lac rows are the engine's doṣa rows, labelled as such — colour is never the only signal.
    const doshaRows = want.kootas.filter((k) => k.dosha);
    for (const k of doshaRows) expect(screen.getByRole("img", { name: new RegExp(`^${k.name}: .*a doṣa$`) })).toBeInTheDocument();
    expect(screen.getAllByText(/^Tradition says:/)).toHaveLength(doshaRows.length);
    // The reference pair: Nāḍī fires, Bhakūṭa (a 3/11 axis) stays brass.
    expect(doshaRows.map((k) => k.id)).toContain("nadi");
    expect(doshaRows.map((k) => k.id)).not.toContain("bhakoot");
  });

  it("opens a koota's rule with both nakshatras in Devanagari and Latin", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    const img = await screen.findByRole("img", { name: /^Nāḍī:/ }, { timeout: 5000 });
    fireEvent.pointerDown(document.body); // finish the count first
    await new Promise((r) => setTimeout(r, 450));
    const row = img.closest("button");
    if (!row) throw new Error("bead row is not a button");
    fireEvent.click(row);
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByText(/three nāḍīs/)).toBeInTheDocument();
    expect(within(dlg).getByText("रेवती")).toHaveAttribute("lang", "hi");
    expect(within(dlg).getByText("रोहिणी")).toHaveAttribute("lang", "hi");
    expect(within(dlg).getByText(/Muhūrta Cintāmaṇi/)).toBeInTheDocument();
  });

  it("swaps the first and second leaf", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    fireEvent.click(await screen.findByRole("button", { name: /Swap first and second leaf/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/milan/${PRIYA.id}/${REFERENCE_PROFILE.id}`));
    const swapped = engineResult(PRIYA, REFERENCE_PROFILE);
    const first = swapped.kootas[0];
    if (!first) throw new Error("no kootas");
    expect(await screen.findByRole("img", { name: new RegExp(`^${first.name}: ${fmtPts(first.score)} of`) }, { timeout: 5000 })).toBeInTheDocument();
  });

  it("with one leaf, the second scroll is a dotted outline asking for another", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    renderAt("/milan");
    expect(await screen.findByText("drag a leaf from the bundle")).toBeInTheDocument();
    expect(screen.getByText(/Only one leaf is in the bundle/)).toBeInTheDocument();
  });

  it("picks the second leaf from the bundle", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderAt("/milan");
    fireEvent.click(await screen.findByRole("button", { name: /Lay .*'s leaf beside/ }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/milan\/[^/]+\/[^/]+$/));
  });
});
