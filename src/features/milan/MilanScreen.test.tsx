import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DISCLAIMER } from "../../components/ui/Colophon";
import { db } from "../../data/db";
import { upsertProfile } from "../../data/repo";
import { milan } from "../../engine/ashtakoota";
import { bondReading } from "../../engine/bond";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { resolveBirthMoment } from "../../engine/time";
import { DEFAULT_PRESET, type KootaResult, type Profile } from "../../engine/types";
import { BANNED_WORDS } from "../../test/banned-words";
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

/** Folds are closed by default; their heavy content mounts when opened. */
async function openFold(title: string) {
  const summary = (await screen.findByText(title, {}, { timeout: 5000 })).closest("summary");
  const details = summary?.closest("details");
  if (!summary || !details) throw new Error(`no fold "${title}"`);
  fireEvent.click(summary);
  if (!details.open) {
    details.open = true;
    fireEvent(details, new Event("toggle"));
  }
}

describe("MilanScreen", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.patris.clear();
    await db.settings.clear();
  });

  it("answers first: the bond score, the 36 points and the five parts are bondReading()'s output", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const want = engineResult(REFERENCE_PROFILE, PRIYA);
    const bond = bondReading(want, REFERENCE_PROFILE.name.split(/\s+/)[0] ?? "", PRIYA.name);
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);

    expect(
      await screen.findByRole("img", { name: new RegExp(`Match score ${bond.score} out of 100`) }, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText(bond.headline)).toBeInTheDocument();
    expect(screen.getByText(bond.summary)).toBeInTheDocument();
    expect(screen.getByText(`${fmtPts(want.total)} of 36`)).toBeInTheDocument();
    for (const p of bond.parts) {
      expect(screen.getByRole("img", { name: new RegExp(`^${p.label}: .*, ${p.score} out of 100$`) })).toBeInTheDocument();
      expect(screen.getAllByText(p.line).length).toBeGreaterThan(0);
    }
    for (const s of bond.signs) expect(screen.getByText(s.label)).toBeInTheDocument();
    expect(screen.getByText(bond.tip)).toBeInTheDocument();
    expect(screen.getByText(bond.manglik)).toBeInTheDocument();
    // The technical material is folded away until asked for.
    expect(screen.queryByRole("img", { name: /^Nāḍī:/ })).not.toBeInTheDocument();
  });

  it("strings exactly milan()'s output on the mala, every row, the total and the band", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const want = engineResult(REFERENCE_PROFILE, PRIYA);
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    await openFold("The 36-point score");

    for (const k of want.kootas) {
      const img = await screen.findByRole(
        "img",
        { name: new RegExp(`^${k.name}: ${fmtPts(k.score).replace(".", "\\.")} of ${k.max} points`) },
        { timeout: 5000 },
      );
      expect(img).toBeInTheDocument();
    }
    expect(screen.getByText(`${fmtPts(want.total)} of 36 points: ${BAND_LABEL[want.band]}.`)).toBeInTheDocument();

    // The doṣa rows are the engine's doṣa rows, labelled as such, colour is never the only signal.
    const doshaRows = want.kootas.filter((k) => k.dosha);
    for (const k of doshaRows) {
      const img = screen.getByRole("img", { name: new RegExp(`^${k.name}: .*a doṣa$`) });
      expect(within(img.closest("button") as HTMLElement).getByText("doṣa")).toBeInTheDocument();
    }
    expect(screen.getAllByText(/^Tradition says:/)).toHaveLength(doshaRows.length);
    // The reference pair: Nāḍī fires, Bhakūṭa (a 3/11 axis) is not flagged.
    expect(doshaRows.map((k) => k.id)).toContain("nadi");
    expect(doshaRows.map((k) => k.id)).not.toContain("bhakoot");
  });

  it("opens a koota's rule with both nakshatras in Devanagari and Latin", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    await openFold("The 36-point score");
    const img = await screen.findByRole("img", { name: /^Nāḍī:/ }, { timeout: 5000 });
    const row = img.closest("button");
    if (!row) throw new Error("bead row is not a button");
    fireEvent.click(row);
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByText(/three nāḍīs/)).toBeInTheDocument();
    expect(within(dlg).getByText("रेवती")).toHaveAttribute("lang", "hi");
    expect(within(dlg).getByText("रोहिणी")).toHaveAttribute("lang", "hi");
    expect(within(dlg).getByText(/Muhūrta Cintāmaṇi/)).toBeInTheDocument();
  });

  it("swaps the first and second person", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    fireEvent.click(await screen.findByRole("button", { name: /Swap first and second person/ }));
    await waitFor(() => expect(router.state.location.pathname).toBe(`/milan/${PRIYA.id}/${REFERENCE_PROFILE.id}`));
    const swapped = engineResult(PRIYA, REFERENCE_PROFILE);
    const first = swapped.kootas[0];
    if (!first) throw new Error("no kootas");
    await openFold("The 36-point score");
    expect(
      await screen.findByRole("img", { name: new RegExp(`^${first.name}: ${fmtPts(first.score)} of`) }, { timeout: 5000 }),
    ).toBeInTheDocument();
  });

  it("with nobody saved, explains that two people are needed", async () => {
    renderAt("/milan");
    expect(await screen.findByText("A match needs two people")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Add a person" })).toHaveAttribute("href", "/leaf/new");
  });

  it("with one person, the second slot asks for another", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    renderAt("/milan");
    expect(await screen.findByText("Add one more person")).toBeInTheDocument();
    expect(screen.getByText(/^Only .* is saved/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: new RegExp(`^First person: ${REFERENCE_PROFILE.name}`) })).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Add a person/ }).length).toBeGreaterThan(0);
  });

  it("with two people, both slots are filled and one tap opens the match", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    const { router } = renderAt("/milan");
    fireEvent.click(await screen.findByRole("button", { name: "See the match" }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(/^\/milan\/[^/]+\/[^/]+$/));
    const [, , x, y] = router.state.location.pathname.split("/");
    expect(x).not.toBe(y);
  });

  it("picks the second person from the saved people", async () => {
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
    await upsertProfile({ ...PRIYA, id: "test-meera", name: "Meera" });
    const { router } = renderAt("/milan");
    fireEvent.click(await screen.findByRole("button", { name: "Second person: choose a person" }));
    // The most recently saved person fills the first slot; pick someone else as the second.
    const firstLabel = screen.getByRole("button", { name: /^First person: / }).getAttribute("aria-label") ?? "";
    const second = firstLabel.includes("Meera") ? { id: PRIYA.id, name: /Priya/ } : { id: "test-meera", name: /Meera/ };
    const dlg = await screen.findByRole("dialog");
    fireEvent.click(within(dlg).getByRole("radio", { name: second.name }));
    await waitFor(() => expect(router.state.location.pathname).toMatch(new RegExp(`^/milan/[^/]+/${second.id}$`)));
  });
});

describe("MilanScreen, porutham, compare and summary", () => {
  beforeEach(async () => {
    await db.profiles.clear();
    await db.patris.clear();
    await db.settings.clear();
    await upsertProfile(REFERENCE_PROFILE);
    await upsertProfile(PRIYA);
  });

  it("lists the ten poruthams, agreeing or not, as milan() says, and opens each rule", async () => {
    const want = engineResult(REFERENCE_PROFILE, PRIYA).porutham ?? [];
    expect(want).toHaveLength(10);
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    expect(
      await screen.findByText(`Porutham: ${want.filter((p) => p.pass).length} of 10 agree`, {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    await openFold("South Indian check");
    for (const p of want) {
      const name = new RegExp(`^${p.name}: ${p.pass ? "agrees" : "does not agree"}`);
      expect(await screen.findByRole("button", { name })).toBeInTheDocument();
    }
    const rajju = want.find((p) => p.id === "rajju");
    if (!rajju) throw new Error("no rajju");
    fireEvent.click(screen.getByRole("button", { name: /^Rajju:/ }));
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByText(/five cords/)).toBeInTheDocument();
    expect(within(dlg).getByText(rajju.note)).toBeInTheDocument();
    expect(within(dlg).getByText(/weighs heaviest/)).toBeInTheDocument();
    expect(within(dlg).getByText(/Porutham tradition \(Tamil jyotiṣa\)/)).toBeInTheDocument();
  });

  it("a koota sheet says what the tradition weighs and whether the exception holds", async () => {
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    await openFold("The 36-point score");
    const img = await screen.findByRole("img", { name: /^Nāḍī:/ }, { timeout: 5000 });
    const row = img.closest("button");
    if (!row) throw new Error("bead row is not a button");
    fireEvent.click(row);
    const dlg = await screen.findByRole("dialog");
    expect(within(dlg).getByText(/^Tradition weighs the constitution/)).toBeInTheDocument();
    // Revatī × Rohiṇī: both Antya, different signs, Guru and Śukra not friends, no exception holds.
    expect(within(dlg).getByText("None of the classical exceptions holds for this pair.")).toBeInTheDocument();
  });

  it("copies a plain-text summary with the disclaimer", async () => {
    const writeText = vi.fn(async (_: string) => {});
    Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
    const want = engineResult(REFERENCE_PROFILE, PRIYA);
    renderAt(`/milan/${REFERENCE_PROFILE.id}/${PRIYA.id}`);
    fireEvent.click(await screen.findByRole("button", { name: "Copy summary" }, { timeout: 5000 }));
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0]?.[0] ?? "";
    expect(text).toContain(`${REFERENCE_PROFILE.name} and ${PRIYA.name}`);
    expect(text).toContain(`${fmtPts(want.total)} / 36: ${BAND_LABEL[want.band]} (North Indian (common) tables)`);
    expect(screen.getByText(/^North Indian \(common\) \(Settings\)/)).toBeInTheDocument();
    expect(text).toContain("Doṣas: Nāḍī");
    expect(text).toMatch(/Ten Porutham: \d+ \/ 10 tied/);
    expect(text).toContain(DISCLAIMER);
    for (const w of BANNED_WORDS) expect(text.toLowerCase()).not.toContain(w);
  });
});
