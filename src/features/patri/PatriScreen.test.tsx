import { fireEvent, render, screen, within } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { db } from "../../data/db";
import { saveSettings, upsertProfile } from "../../data/repo";
import { REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET } from "../../engine/types";
import PatriScreen from "./PatriScreen";

const ID = REFERENCE_PROFILE.id;

function renderChart(path = `/patri/${ID}`) {
  const router = createMemoryRouter(
    [
      { path: "/patri/:id", element: <PatriScreen /> },
      { path: "*", element: <p>elsewhere</p> },
    ],
    { initialEntries: [path] },
  );
  return { router, ...render(<RouterProvider router={router} />) };
}

/** Open a fold the way a tap does (jsdom does not toggle <details> by itself). */
function openFold(name: RegExp): HTMLElement {
  const summary = screen.getByText(name).closest("summary");
  const details = summary?.parentElement as HTMLDetailsElement;
  details.open = true;
  fireEvent(details, new Event("toggle"));
  return details;
}

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
  await db.delete();
  await db.open();
  await upsertProfile(REFERENCE_PROFILE);
  await saveSettings({ activeProfileId: ID, preset: DEFAULT_PRESET });
});

describe("the Chart tab", () => {
  it("opens on About you: the person's name, one birth line with Edit, and the reading in simple words", async () => {
    const { container } = renderChart();
    expect(await screen.findByRole("heading", { level: 2, name: /this is you/ }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Rahul");
    const head = screen.getByRole("heading", { level: 1 }).parentElement as HTMLElement;
    expect(head).toHaveTextContent("14 March 1994 · 7:25 am (07:25) · Bengaluru, Karnataka, IN");
    expect(within(head).getByRole("link", { name: "Edit birth details" })).toHaveAttribute("href", `/leaf/${ID}/edit`);
    const tabs = screen.getAllByRole("tab");
    expect(tabs.map((t) => t.textContent)).toEqual(["About you", "Life chapters", "Planets", "Now"]);
    expect(tabs[0]).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel")).toHaveAccessibleName("About you");
    // nothing of the other views is built yet
    expect(container.querySelector("table")).toBeNull();
    expect(container.querySelector("svg.chart")).toBeNull();
    expect(container.querySelector('[lang="hi"]')).toBeNull();
  });

  it("keeps the view in the URL and switches by tab and by arrow key", async () => {
    const { router } = renderChart();
    await screen.findByRole("heading", { level: 2, name: /this is you/ }, { timeout: 8000 });
    fireEvent.click(screen.getByRole("tab", { name: "Life chapters" }));
    expect(router.state.location.search).toBe("?v=chapters");
    expect(screen.getByRole("heading", { level: 2, name: /^The \w+ chapter$/ })).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /mahādaśā/ })).toHaveLength(9);
    expect(screen.queryByRole("heading", { name: /this is you/ })).toBeNull();
    fireEvent.keyDown(screen.getByRole("tab", { name: "Life chapters" }), { key: "ArrowRight" });
    expect(router.state.location.search).toBe("?v=chart");
    expect(screen.getByRole("tab", { name: "Planets" })).toHaveAttribute("aria-selected", "true");
    fireEvent.click(screen.getByRole("tab", { name: "About you" }));
    expect(router.state.location.search).toBe("");
  });

  it("opens a chapter to its dated stretches, and a stretch to its sub-stretches", async () => {
    renderChart(`/patri/${ID}?v=chapters`);
    const chapters = await screen.findAllByRole("button", { name: /mahādaśā/ }, { timeout: 8000 });
    expect(chapters.filter((c) => /running now/.test(c.getAttribute("aria-label") ?? ""))).toHaveLength(1);
    expect(screen.queryByRole("list", { name: /antardaśās/ })).toBeNull();
    fireEvent.click(chapters[0] as HTMLElement);
    const stretches = within(screen.getByRole("list", { name: /antardaśās/ })).getAllByRole("button");
    expect(stretches).toHaveLength(9);
    expect(stretches[0]).toHaveTextContent(/\d{1,2} \w{3} \d{4} → \d{1,2} \w{3} \d{4}/);
    fireEvent.click(stretches[1] as HTMLElement);
    expect(within(screen.getByRole("list", { name: /pratyantardaśās/ })).getAllByRole("listitem")).toHaveLength(9);
  });

  it("Planets shows the kundli and the planet table; the deep material waits in closed folds", async () => {
    const { container } = renderChart(`/patri/${ID}?v=chart`);
    expect(await screen.findByRole("heading", { level: 2, name: /^Birth chart/ }, { timeout: 8000 })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /Rāśi chart D1/ })).toBeInTheDocument();
    const ledger = container.querySelector("table.ledger--grahas") as HTMLElement;
    expect(within(ledger).getAllByRole("row")).toHaveLength(11); // header, rising sign, nine planets
    expect(ledger).toHaveTextContent("15°39′25″"); // the rising degree, Mīna
    expect(within(ledger).getByRole("row", { name: /^Moon, Mīna/ })).toHaveTextContent("Revatī 1lord Mercury");
    expect(screen.getByRole("button", { name: "Show South Indian style" })).toBeInTheDocument();
    // the figure is whole at once (one short fade, no staggered drawing), in Latin letters with a key under it
    const fig = container.querySelector("svg.chart:not(.loupe svg)") as SVGElement;
    expect(fig.querySelectorAll("[data-ink], [data-settle]")).toHaveLength(0);
    expect(
      Array.from(fig.querySelectorAll("text.graha"))
        .map((t) => t.firstChild?.textContent)
        .sort(),
    ).toEqual(["Ju", "Ke", "Ma", "Me", "Mo", "Ra", "Sa", "Su", "Ve"]);
    expect(fig.querySelector('[lang="hi"]')).toBeNull();
    const key = screen.getByRole("list", { name: "Chart key" });
    expect(key).toHaveTextContent("Su Sun");
    expect(key).toHaveTextContent("Ra Rahu (north node)");
    expect(key).toHaveTextContent("Ke Ketu (south node)");
    expect(key).toHaveTextContent("℞ moving backwards");
    expect(within(key).getAllByRole("listitem")).toHaveLength(10);
    expect(screen.queryByRole("region", { name: "Planet positions" })).toBeNull(); // the table no longer scrolls sideways

    const folds = Array.from(container.querySelectorAll("details.v-fold"));
    expect(folds.map((f) => f.querySelector("summary")?.firstElementChild?.firstChild?.textContent)).toEqual([
      "Birth almanac",
      "Divisional charts",
      "Planet patterns",
      "Strength points",
      "House cusps",
    ]);
    for (const f of folds) expect(f.querySelector(".v-fold__body")).toBeNull(); // lazy: not built until opened
    expect(container.querySelectorAll("svg.chart:not(.loupe svg)")).toHaveLength(1);

    const almanac = openFold(/^Birth almanac/);
    expect(almanac).toHaveTextContent("Lunar day · Tithi");
    expect(almanac).toHaveTextContent("Dvitīyā");
    expect(almanac).toHaveTextContent("Revatī");
    expect(within(openFold(/^Divisional charts/)).getAllByRole("tab")).toHaveLength(8);
    expect(screen.getByRole("img", { name: /Navāṃśa chart D9/ })).toBeInTheDocument();
    expect(within(openFold(/^Strength points/)).getByRole("region", { name: "Strength points (Aṣṭakavarga)" })).toBeInTheDocument();
    expect(within(openFold(/^House cusps/)).getByRole("region", { name: "Bhāva Chalit cusps" })).toBeInTheDocument();
    // the other folds stay unbuilt
    expect(folds[2]?.querySelector(".v-fold__body")).toBeNull();

    // how it was calculated, and the standing disclaimer
    expect(screen.getByText("How this was calculated").closest("details")).toHaveTextContent("2449425.5798");
    expect(screen.getByText(/Based on classical Jyotisha/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Print/ })).toBeInTheDocument();
  });

  it("explains an almanac line in a sheet", async () => {
    renderChart(`/patri/${ID}?v=chart`);
    await screen.findByRole("heading", { level: 2, name: /^Birth chart/ }, { timeout: 8000 });
    const almanac = openFold(/^Birth almanac/);
    fireEvent.click(within(almanac).getByRole("button", { name: /Lunar day · Tithi/ }));
    const sheet = screen.getByRole("dialog", { name: "Footnote" });
    expect(within(sheet).getByRole("heading", { level: 2 })).toHaveTextContent("Tithi: Śukla Dvitīyā");
    expect(sheet).toHaveTextContent(/each tithi is 12°/);
    fireEvent.click(within(sheet).getByRole("button", { name: "Close" }));
    expect(within(sheet).queryByRole("heading")).toBeNull();
  });

  it("honours Devanagari on the figure when it was chosen in Settings", async () => {
    await saveSettings({ chartScript: "devanagari" });
    const { container } = renderChart(`/patri/${ID}?v=chart`);
    await screen.findByRole("heading", { level: 2, name: /^Birth chart/ }, { timeout: 8000 });
    const fig = container.querySelector("svg.chart:not(.loupe svg)") as SVGElement;
    expect(fig.querySelectorAll('text.graha[lang="hi"]')).toHaveLength(9);
    expect(screen.getByRole("list", { name: "Chart key" })).toHaveTextContent("Sun");
  });

  it("Now answers first: one sentence for today, Saturn's season, and the planet table folded away", async () => {
    const { container } = renderChart(`/patri/${ID}?v=now`);
    const hero = await screen.findByRole("region", { name: "Today for this chart" }, { timeout: 8000 });
    expect(within(hero).getByRole("heading", { level: 2 })).toHaveTextContent(/^Today the Moon is in your \d+(st|nd|rd|th) area: /);
    expect(hero.querySelectorAll(".v-chip").length).toBeLessThanOrEqual(3);
    expect(screen.getByRole("heading", { level: 2, name: "Saturn's long seasons" })).toBeInTheDocument();
    const fold = screen.getByText("Where the planets are now").closest("details") as HTMLDetailsElement;
    expect(fold).toHaveClass("v-fold");
    expect(fold.open).toBe(false);
    expect(fold.querySelector("table.gochar__ledger")).not.toBeNull();
    // order on the page: today, Saturn, the folded table, then the door to the Forecast
    const order = [hero, screen.getByRole("heading", { name: "Saturn's long seasons" }), fold];
    for (let i = 1; i < order.length; i++) {
      expect(
        (order[i - 1] as HTMLElement).compareDocumentPosition(order[i] as HTMLElement) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
    expect(container.querySelector('[lang="hi"]')).toBeNull();
    expect(screen.getByRole("link", { name: /What this means for your days/ })).toHaveAttribute("href", `/forecast/${ID}`);
  });

  it("says so, in the new look, when the person is not on this device", async () => {
    const { container } = renderChart("/patri/nobody");
    expect(await screen.findByRole("heading", { level: 1, name: "Person not found" })).toBeInTheDocument();
    expect(container.querySelector(".v-empty")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Go to Today" })).toHaveAttribute("href", "/");
    expect(screen.queryByRole("tablist")).toBeNull();
  });

  it("offers to work the chart out again when the settings change underneath it", async () => {
    renderChart();
    await screen.findByRole("heading", { level: 2, name: /this is you/ }, { timeout: 8000 });
    expect(screen.queryByText(/Settings changed in another tab/)).toBeNull();
    await saveSettings({ preset: { ...DEFAULT_PRESET, dashaYearDays: DEFAULT_PRESET.dashaYearDays === 360 ? 365.25 : 360 } });
    expect(await screen.findByText(/Settings changed in another tab/, {}, { timeout: 8000 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Work this chart out again" }));
    await screen.findByRole("heading", { level: 2, name: /this is you/ }, { timeout: 8000 });
    expect(screen.queryByText(/Settings changed in another tab/)).toBeNull();
  });
});
