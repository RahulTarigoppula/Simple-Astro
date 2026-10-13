import { render, screen, within } from "@testing-library/react";
import { beforeAll, describe, expect, it } from "vitest";
import { referenceChart, synth } from "../../../engine/__fixtures__/synthetic";
import { AV_GRAHAS, ashtakavarga } from "../../../engine/ashtakavarga";
import { BANNED_WORDS } from "../../../test/banned-words";
import { AshtakavargaSection } from "./AshtakavargaSection";
import { BhavaChalitTable, bhavaShifts } from "./BhavaChalitTable";

beforeAll(() => {
  if (!("animate" in Element.prototype)) {
    Object.defineProperty(Element.prototype, "animate", {
      configurable: true,
      value: () => ({ cancel() {}, finish() {}, onfinish: null }),
    });
  }
});

describe("AshtakavargaSection", () => {
  for (const style of ["north", "south"] as const) {
    it(`renders the band, the ${style} SAV chart with its table twin, the matrix and readings`, () => {
      const core = referenceChart();
      const av = ashtakavarga(core);
      const { container } = render(<AshtakavargaSection patri={core} script="latin" style={style} skipInk />);

      expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("अष्टकवर्ग · Aṣṭakavarga");
      expect(container.querySelector('[lang="hi"]')).toHaveTextContent("अष्टकवर्ग");

      const img = screen.getByRole("img", { name: /Sarvāṣṭakavarga/ });
      const nums = Array.from(img.querySelectorAll("text.av-num")).map((t) => Number(t.textContent));
      expect(nums).toHaveLength(12);
      expect(nums.reduce((a, b) => a + b, 0)).toBe(337);
      expect(img.querySelector(".tilak")).not.toBeNull();
      const twinId = img.getAttribute("aria-describedby") ?? "";
      const twin = container.querySelector(`[id="${twinId}"]`);
      expect(twin?.querySelectorAll("tbody tr")).toHaveLength(12);
      expect(twin?.querySelector("tbody tr td:last-child")).toHaveTextContent(String(av.byHouse[0]));

      const region = screen.getByRole("region", { name: /Bhinnāṣṭakavarga bindus/ });
      const table = within(region).getByRole("table");
      const body = table.querySelectorAll("tbody tr");
      expect(body).toHaveLength(7);
      const totals = Array.from(body).map((r) => r.querySelector("td:last-child")?.textContent);
      expect(totals).toEqual(["48", "49", "39", "54", "56", "52", "39"]);
      expect(table.querySelector("tfoot td:last-child")).toHaveTextContent("337");
      const four = AV_GRAHAS.reduce((n, g) => n + av.bav[g].filter((x) => x >= 4).length, 0);
      expect(table.querySelectorAll(".av-dot")).toHaveLength(four);
      expect(table.querySelectorAll("td.is-four .vh")).toHaveLength(four);

      const readings = container.querySelectorAll(".av-reading > p:first-child");
      expect(readings.length).toBeGreaterThanOrEqual(2);
      expect(readings.length).toBeLessThanOrEqual(3);
      for (const r of readings) expect(r.textContent?.startsWith("Tradition says")).toBe(true);
      const text = (container.textContent ?? "").toLowerCase();
      for (const w of BANNED_WORDS) expect(text).not.toContain(w);
    });
  }

  it("South chart in Devanagari carries lang=hi on sign names", () => {
    const { container } = render(<AshtakavargaSection patri={referenceChart()} script="devanagari" style="south" skipInk />);
    expect(container.querySelector('text.signname[lang="hi"]')).toHaveTextContent("मेष");
  });
});

describe("BhavaChalitTable", () => {
  // Synthetic charts put the MC exactly 90° behind the Lagna, so the bhāvas are equal 30° arcs
  // centred on the Lagna degree: Lagna 25° Meṣa → bhāva 1 runs 10° Meṣa to 10° Vṛṣabha.
  const core = synth({ lagna: 0, lagnaDeg: 25, at: { SU: [0, 5], MO: [0, 20], MA: 3, ME: [1, 8], JU: 6, VE: 8, SA: 10, RA: 2 } });

  it("finds the shifts: 5° Meṣa moves to bhāva 12, 8° Vṛṣabha to bhāva 1; 20° Meṣa stays", () => {
    const s = bhavaShifts(core);
    expect(s.find((x) => x.id === "SU")).toEqual({ id: "SU", house: 1, bhava: 12 });
    expect(s.find((x) => x.id === "ME")).toEqual({ id: "ME", house: 2, bhava: 1 });
    expect(s.find((x) => x.id === "MO")).toBeUndefined();
  });

  it("renders 12 bhāva rows with start-madhya-end and the shift notes", () => {
    const { container } = render(<BhavaChalitTable patri={core} />);
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("भाव चलित · Bhāva Chalit");
    const region = screen.getByRole("region", { name: /cusps/ });
    const rows = within(region).getByRole("table").querySelectorAll("tbody tr");
    expect(rows).toHaveLength(12);
    const first = rows[0];
    expect(first?.querySelectorAll("td")[0]).toHaveTextContent("Meṣ 10°00′");
    expect(first?.querySelectorAll("td")[1]).toHaveTextContent("Meṣ 25°00′");
    expect(first?.querySelectorAll("td")[2]).toHaveTextContent("Vṛṣ 10°00′");
    const list = screen.getByRole("list", { name: /change house/ });
    expect(within(list).getByText(/Sūrya/).closest("li")).toHaveTextContent("shifts to bhāva 12");
    expect(container.querySelector(".note-haldi")).toHaveTextContent("stays whole-sign");
  });

  it("says nothing shifts when every graha sits mid-house", () => {
    const calm = synth({ lagna: 0, lagnaDeg: 15, at: { SU: 0, MO: 1, MA: 2, ME: 3, JU: 4, VE: 5, SA: 6, RA: 7 } });
    expect(bhavaShifts(calm)).toEqual([]);
    render(<BhavaChalitTable patri={calm} />);
    expect(screen.queryByRole("list")).toBeNull();
    expect(screen.getByText(/keeps its whole-sign house/)).toBeInTheDocument();
  });
});
