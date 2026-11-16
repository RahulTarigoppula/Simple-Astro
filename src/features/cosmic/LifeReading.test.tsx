import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { GRAHA_LORE } from "../../data/lore";
import { MOON_TRAITS, NAK_TRAITS, NUMBER_TRAITS } from "../../data/traits";
import { currentDasha } from "../../engine/dasha";
import { computePatri, REFERENCE_PROFILE } from "../../engine/patri";
import { DEFAULT_PRESET } from "../../engine/types";
import { LifeReading, reconcile } from "./LifeReading";

describe("plus and minus points on the simple card", () => {
  it("never shows a word and its opposite on the same card", () => {
    expect(reconcile(["Patient and dependable"], ["Impatient"]).minus).toEqual([]);
    expect(reconcile(["Bold"], ["Timid at first"]).minus).toEqual([]);
    expect(reconcile(["Bold", "Timid"], []).plus).toEqual(["Bold"]);
    expect(reconcile(["Generous"], ["Stubborn"]).minus).toEqual(["Stubborn"]);
  });
  it("holds for every Moon sign, birth star and number", () => {
    const pairs: Array<[string, string]> = [
      ["patient", "impatient"],
      ["calm", "restless"],
      ["steady", "changeable"],
      ["cautious", "impulsive"],
      ["careful", "careless"],
      ["generous", "stingy"],
      ["bold", "timid"],
      ["sociable", "withdrawn"],
      ["decisive", "indecisive"],
      ["practical", "dreamy"],
    ];
    const stem = (s: string) => s.toLowerCase();
    for (const moon of MOON_TRAITS) {
      for (const nak of NAK_TRAITS) {
        for (let n = 1; n <= 9; n++) {
          const root = NUMBER_TRAITS[n];
          const r = reconcile([...moon.plus, ...nak.plus, ...(root?.plus ?? [])], [...moon.minus, ...nak.minus, ...(root?.minus ?? [])]);
          for (const p of r.plus) {
            for (const m of r.minus) {
              const clash = pairs.some(
                ([x, y]) => (stem(p).includes(x) && stem(m).includes(y)) || (stem(p).includes(y) && stem(m).includes(x)),
              );
              expect(clash, `${p} vs ${m}`).toBe(false);
            }
          }
        }
      }
    }
  });
});

describe("the reading in simple words", () => {
  const NOW = Date.UTC(2026, 9, 12, 6);
  const patri = computePatri(REFERENCE_PROFILE, DEFAULT_PRESET, 0);
  const show = (onChapters?: () => void) =>
    render(
      <MemoryRouter>
        <LifeReading profile={REFERENCE_PROFILE} patri={patri} nowMs={NOW} {...(onChapters ? { onChapters } : {})} />
      </MemoryRouter>,
    );

  it("answers first, then shows the three key signs as rows that open their stories", () => {
    const { container } = show();
    expect(screen.getByRole("heading", { level: 2, name: /this is you/ })).toBeInTheDocument();
    const facts = within(screen.getByRole("list", { name: "Your three key signs" })).getAllByRole("listitem");
    expect(facts.map((f) => f.getAttribute("data-fact"))).toEqual(["moon", "nak", "lagna"]);
    expect(facts[0]).toHaveTextContent(/Moon sign Rāśi/);
    expect(facts[0]).toHaveTextContent("Mīna");
    expect(facts[1]).toHaveTextContent(/Birth star Nakṣatra/);
    expect(facts[1]).toHaveTextContent("Revatī");
    expect(facts[2]).toHaveTextContent(/Rising sign Lagna/);
    expect(within(facts[1] as HTMLElement).getByRole("link")).toHaveAttribute("href", "/explore/nakshatra/26");
    expect(within(facts[0] as HTMLElement).getByRole("button", { name: /What is Rāśi/ })).toBeInTheDocument();
    expect(container.querySelector('[lang="hi"]')).toBeNull(); // plain English, no Devanagari headings
  });

  it("lists plus and minus points, love and work, and the chapter running now", () => {
    show();
    expect(within(screen.getByRole("region", { name: "Plus points" })).getAllByRole("listitem").length).toBeGreaterThan(2);
    expect(within(screen.getByRole("region", { name: "Watch out for" })).getAllByRole("listitem").length).toBeGreaterThan(0);
    expect(screen.getByText("In love")).toBeInTheDocument();
    expect(screen.getByText("At work")).toBeInTheDocument();
    const cur = currentDasha(patri.dasha, NOW);
    if (!cur) throw new Error("no chapter");
    const now = screen.getByText(`Your ${GRAHA_LORE.find((g) => g.id === cur.md.lord)?.english} chapter`).closest("li") as HTMLElement;
    expect(now).toHaveTextContent(/Until \w+ 20\d\d\. Inside it, a shorter \w+ stretch runs until \w+ 20\d\d/);
  });

  it("offers the next steps: forecast, palm, sky at birth and partner match", () => {
    show();
    const id = REFERENCE_PROFILE.id;
    for (const [name, href] of [
      [/^Forecast/, `/forecast/${id}`],
      [/^Palm reading/, `/hast/${id}`],
      [/^Sky at birth/, `/patri/${id}/sky`],
      [/^Partner match/, "/milan"],
      [/^Sun sign/, /^\/explore\/rashi\/\d+$/],
      [/^Chinese zodiac/, "/explore/chinese"],
      [/^Numbers/, "/explore/numbers"],
    ] as const) {
      const link = screen.getByRole("link", { name });
      if (typeof href === "string") expect(link).toHaveAttribute("href", href);
      else expect(link.getAttribute("href")).toMatch(href);
    }
  });

  it("opens the Life chapters view from the chapter row when the screen provides it", () => {
    const onChapters = vi.fn();
    show(onChapters);
    fireEvent.click(screen.getByRole("button", { name: /^Your \w+ chapter/ }));
    expect(onChapters).toHaveBeenCalledTimes(1);
  });

  it("does not guess a rising sign when the birth time is unknown", () => {
    render(
      <MemoryRouter>
        <LifeReading profile={{ ...REFERENCE_PROFILE, timeUnknown: true }} patri={patri} nowMs={NOW} />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { level: 2, name: /this is you/ }).parentElement).not.toHaveTextContent(/Your rising sign is/);
    expect(screen.getByText("Birth time unknown, so this is uncertain.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Your \w+ chapter/ })).toBeNull();
  });
});
