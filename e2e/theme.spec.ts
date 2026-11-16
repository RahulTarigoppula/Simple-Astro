import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { sealReferenceLeaf } from "./helpers";

/** Relative luminance (0 = black, 1 = white) of a computed `rgb(…)` / `rgba(…)` colour. */
function luminance(css: string): number {
  const [r = 0, g = 0, b = 0] = (css.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number);
  const lin = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

test("the light theme is chosen in Settings, paints a light page and passes axe", async ({ page }) => {
  test.setTimeout(240_000); // every main screen is scanned by axe; slow runners need the room
  const id = await sealReferenceLeaf(page);

  // Settings → Theme → Light, through the real control.
  await page.goto("#/drawer");
  const theme = page.getByRole("radiogroup", { name: "Theme" });
  await theme.getByRole("radio", { name: "Light" }).click();
  await expect(theme.getByRole("radio", { name: "Light" })).toHaveAttribute("aria-checked", "true");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");

  const desk = await page.locator(".desk").evaluate((el) => getComputedStyle(el).backgroundColor);
  expect(luminance(desk), `.desk background is ${desk}`).toBeGreaterThan(0.8);
  const ink = await page
    .locator(".v-title")
    .first()
    .evaluate((el) => getComputedStyle(el).color);
  expect(luminance(ink), `title colour is ${ink}`).toBeLessThan(0.1);

  // The choice is kept across a reload.
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "day");

  const routes = [
    "#/",
    `#/patri/${id}`,
    `#/patri/${id}?v=chapters`,
    `#/patri/${id}?v=chart`,
    `#/patri/${id}?v=now`,
    `#/patri/${id}/sky`,
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
    "#/explore/rashi/4",
    "#/explore/nakshatra/3",
    "#/explore/numbers",
    "#/explore/wheel",
    `#/forecast/${id}`,
    `#/forecast/${id}?p=month`,
    `#/forecast/${id}?p=year`,
  ];
  const report: string[] = [];
  for (const r of routes) {
    await page.goto(r);
    await page.waitForTimeout(2000);
    await expect(page.locator("html")).toHaveAttribute("data-theme", "day");
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
