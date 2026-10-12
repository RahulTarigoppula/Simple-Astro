import { expect, test } from "@playwright/test";
import { sealReferenceLeaf } from "./helpers";

// Nothing may widen a screen sideways: only the deliberate scrollers (ribbon, pagers, matrices) scroll.
test("no screen overflows horizontally", async ({ page }) => {
  test.setTimeout(120_000);
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
    `#/patri/${id}/sky`,
  ];
  const wide: string[] = [];
  for (const r of routes) {
    await page.goto(r);
    await page.waitForTimeout(1500);
    const over = await page.evaluate(() => {
      const out: string[] = [];
      const doc = document.documentElement;
      if (doc.scrollWidth > doc.clientWidth + 1) out.push(`document ${doc.scrollWidth}>${doc.clientWidth}`);
      for (const el of Array.from(document.querySelectorAll<HTMLElement>(".screen, .scrollport, .paper"))) {
        if (el.scrollWidth > el.clientWidth + 1) out.push(`${el.className} ${el.scrollWidth}>${el.clientWidth}`);
      }
      return out;
    });
    for (const o of over) wide.push(`${r}: ${o}`);
  }
  expect(wide, wide.join("\n")).toEqual([]);
});
