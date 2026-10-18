import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sealReferenceLeaf } from "./helpers";

test("no serious or critical axe violations on the main screens", async ({ page }) => {
  test.setTimeout(240_000); // fifteen screens, each scanned by axe; slow runners need the room
  const id = await sealReferenceLeaf(page);
  const routes = [
    "#/",
    `#/patri/${id}`,
    "#/leaf/new",
    "#/today",
    "#/circle",
    "#/drawer",
    `#/milan/${id}/${id}`,
    `#/hast/${id}`,
    "#/guide",
    "#/about",
    "#/story",
    "#/explore",
    "#/explore/graha/MO",
    "#/explore/numbers",
    `#/forecast/${id}`,
  ];
  const report: string[] = [];
  for (const r of routes) {
    await page.goto(r);
    await page.waitForTimeout(2000);
    const res = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21aa"]).exclude('[data-decorative="true"]').analyze();
    for (const v of res.violations.filter((x) => x.impact === "serious" || x.impact === "critical")) {
      report.push(
        `${r} · ${v.id} (${v.impact}): ${v.nodes
          .slice(0, 3)
          .map((n) => n.target.join(" "))
          .join(" | ")}`,
      );
    }
  }
  expect(report, report.join("\n")).toEqual([]);
});
