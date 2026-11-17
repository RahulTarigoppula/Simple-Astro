import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "../../data/db";
import { castPatri, saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET, GRAHA_IDS } from "../../engine/types";
import ReportScreen, { REPORT_FOOTER, REPORT_NATIVE_LINE } from "./ReportScreen";

const native = vi.hoisted(() => ({ value: false }));
vi.mock("../../platform/native", () => ({ isNative: () => native.value, reducedMotion: () => true }));

const ID = REFERENCE_PROFILE.id;

function renderReport(path = `/report/${ID}`) {
  const router = createMemoryRouter(
    [
      { path: "/report/:id", element: <ReportScreen /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

const paper = () => screen.findByRole("article", { name: "Birth report of Rahul" }, { timeout: 8000 });

beforeAll(() => {
  if (!("animate" in Element.prototype)) {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: () => ({ cancel() {}, finish() {}, onfinish: null }),
    });
  }
  if (!("ResizeObserver" in globalThis)) {
    Object.defineProperty(globalThis, "ResizeObserver", {
      configurable: true,
      value: class {
        observe() {}
        unobserve() {}
        disconnect() {}
      },
    });
  }
});

beforeEach(async () => {
  native.value = false;
  await db.delete();
  await db.open();
  await upsertProfile(REFERENCE_PROFILE);
  await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET, chartStyle: "north" });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("the birth report", () => {
  it("opens on the band: the title, one print button that prints, and the way back to the chart", async () => {
    const print = vi.fn();
    vi.stubGlobal("print", print);
    renderReport();
    await paper();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rahul’s birth report");
    expect(screen.getByRole("link", { name: "Back to chart" })).toHaveAttribute("href", `/patri/${ID}`);
    expect(screen.getByRole("img", { name: /real stars behind the Moon when Rahul was born/ })).toBeInTheDocument();
    const buttons = screen.getAllByRole("button", { name: "Print or save as PDF" });
    expect(buttons).toHaveLength(1);
    fireEvent.click(buttons[0] as HTMLElement);
    expect(print).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(REPORT_NATIVE_LINE)).toBeNull();
    expect(document.title).toBe("Rahul - birth report");
    vi.unstubAllGlobals();
  });

  it("on the Android app shows where to print instead of a dead button", async () => {
    native.value = true;
    renderReport();
    await paper();
    expect(screen.getByText(REPORT_NATIVE_LINE)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Print/ })).toBeNull();
  });

  it("writes the full birth details and the almanac at birth on the cover", async () => {
    renderReport();
    const doc = await paper();
    const birth = within(within(doc).getByLabelText("Birth details"));
    expect(birth.getByText("Date of birth").nextElementSibling).toHaveTextContent("14 March 1994");
    expect(birth.getByText("Time of birth").nextElementSibling).toHaveTextContent("7:25 am (07:25)");
    expect(birth.getByText("Place of birth").nextElementSibling).toHaveTextContent("Bengaluru, Karnataka, IN");
    expect(birth.getByText("Time zone used").nextElementSibling).toHaveTextContent("Asia/Kolkata · UTC+05:30");
    expect(birth.getByText("Coordinates").nextElementSibling).toHaveTextContent("12.9716° N, 77.5946° E");
    // the three key signs, plain name first
    const keys = within(doc).getByRole("list", { name: "Your three key signs" });
    expect(keys).toHaveTextContent(/Moon sign.*Mīna.*Birth star.*Revatī.*Quarter \(pada\) \d.*Rising sign.*Mīna/);
    // weekday, lunar day, yoga and karaṇa are the ones the Patri holds
    const patri = await castPatri(REFERENCE_PROFILE, DEFAULT_PRESET);
    const pc = patri.birthPanchang;
    const almanac = within(doc).getByLabelText("The almanac at birth");
    expect(almanac).toHaveTextContent(`Monday${pc.vara.name}`);
    expect(almanac).toHaveTextContent(pc.tithi.name);
    expect(almanac).toHaveTextContent(pc.yoga.name);
    expect(almanac).toHaveTextContent(pc.karana.name);
  });

  it("lays the parts out in the order a family reads them, ending on the method box and the standing line", async () => {
    renderReport();
    const doc = await paper();
    const heads = within(doc)
      .getAllByRole("heading")
      .filter((h) => /rp-(h|cover__name)\b/.test(h.className) || h.id === "rp-method-h")
      .map((h) => h.textContent?.replace(/\s+/g, " ").trim());
    expect(heads).toEqual([
      "Rahul",
      "In simple words",
      "The birth chart Rāśi and Navāṃśa",
      "The planets at birth Graha",
      "Life chapters Viṃśottarī daśā",
      "Notable combinations Yoga",
      "How this was worked out",
    ]);
    // the reading in simple words is LifeReading's own
    expect(within(doc).getByRole("heading", { name: "Plus points" })).toBeInTheDocument();
    expect(within(doc).getByRole("heading", { name: "Watch out for" })).toBeInTheDocument();
    expect(within(doc).getByText("In love")).toBeInTheDocument();
    expect(within(doc).getByText("At work")).toBeInTheDocument();
    // both charts, in the person's style
    expect(within(doc).getByRole("img", { name: "Birth chart (Rāśi, D1)" })).toBeInTheDocument();
    expect(within(doc).getByRole("img", { name: "Ninth-part chart (Navāṃśa, D9)" })).toBeInTheDocument();
    expect(doc.querySelector(".rp-pair")).toHaveAttribute("data-style", "north");
    const method = within(doc).getByRole("region", { name: "How this was worked out" });
    expect(method).toHaveTextContent(/astronomy-engine \d/);
    expect(method).toHaveTextContent("sidereal (nirayana)");
    expect(method).toHaveTextContent(/Lahiri \(true, nutation included\), 23°\d\d′\d\d″ at birth/);
    expect(method).toHaveTextContent("whole-sign from the rising sign");
    expect(method.lastElementChild).toHaveTextContent(REPORT_FOOTER);
    expect(REPORT_FOOTER).toBe("A traditional reading for reflection, never a prediction or advice.");
  });

  it("gives every planet its sign, degree, star, house and standing straight from the Patri", async () => {
    renderReport();
    const doc = await paper();
    const patri = await castPatri(REFERENCE_PROFILE, DEFAULT_PRESET);
    const table = doc.querySelector(".rp-table--planets") as HTMLElement;
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((h) => h.textContent),
    ).toEqual(["Planet", "Sign", "Degree", "Star · quarter", "House", "Standing"]);
    const rows = within(table).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(10);
    expect(rows[0]).toHaveTextContent(/^Rising Lagna/);
    for (const id of GRAHA_IDS) {
      const g = patri.grahas[id];
      const cells = within(table.querySelector(`tr[data-graha="${id}"]`) as HTMLElement).getAllByRole("cell");
      expect(cells[3]).toHaveTextContent(String(g.house));
      expect(cells[4]?.textContent?.includes("retrograde")).toBe(g.retrograde);
      expect(cells[4]?.textContent?.includes("combust")).toBe(g.combust);
    }
    expect(table.querySelector('tr[data-graha="VE"]')).toHaveTextContent("exalted");
  });

  it("lists the nine main chapters and the sub-periods of the one running now, and only the yogas the engine found", async () => {
    renderReport();
    const doc = await paper();
    const patri = await castPatri(REFERENCE_PROFILE, DEFAULT_PRESET);
    const [main, sub] = [...doc.querySelectorAll<HTMLElement>(".rp-table--dasha")];
    expect(main && within(main).getAllByRole("row")).toHaveLength(10);
    expect(sub && within(sub).getAllByRole("row")).toHaveLength(10);
    expect(main?.querySelectorAll("tr.is-now")).toHaveLength(1);
    expect(sub?.querySelectorAll("tr.is-now")).toHaveLength(1);
    expect(main?.querySelector("tr.is-now th")).toHaveTextContent(/now$/);
    expect(within(main as HTMLElement).getAllByRole("row")[1]).toHaveTextContent("birth");
    const formed = patri.yogas.filter((y) => y.strength !== "cancelled");
    const items = doc.querySelectorAll(".rp-yogalist li");
    expect(items).toHaveLength(formed.length);
    formed.forEach((y, i) => {
      expect(items[i]).toHaveTextContent(y.name);
      expect(items[i]).toHaveTextContent(y.reading);
    });
  });

  it("draws the South Indian square for a Telugu reader, with the family's own names", async () => {
    await upsertProfile({ ...REFERENCE_PROFILE, tradition: "telugu" });
    renderReport();
    const doc = await paper();
    expect(doc.querySelector(".rp-pair")).toHaveAttribute("data-style", "south");
    expect(doc.querySelector('tr[data-graha="MO"]')).toHaveTextContent(/Meenam.*Mīna · Pisces/);
  });

  it("says so when the person is not on this device", async () => {
    renderReport("/report/nobody");
    expect(await screen.findByRole("heading", { level: 1, name: "Person not found" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Print/ })).toBeNull();
  });
});
