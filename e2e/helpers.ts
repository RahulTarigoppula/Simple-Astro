import type { Page } from "@playwright/test";

/** Hold a button for `ms` (the seal, the burn) with a real pointer. */
export async function hold(page: Page, name: RegExp | string, ms = 800): Promise<void> {
  const btn = page.getByRole("button", { name });
  await btn.scrollIntoViewIfNeeded();
  const box = await btn.boundingBox();
  if (!box) throw new Error(`no box for ${String(name)}`);
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(ms);
  await page.mouse.up();
}

/** Write and seal the house example leaf (Rahul · 14 Mar 1994 · 07:25 · Bengaluru); returns its id. */
export async function sealReferenceLeaf(page: Page): Promise<string> {
  await page.goto("#/leaf/new");
  await page.getByRole("button", { name: /house example/i }).click();
  await page.locator(".leaf-strip").getByText(/MEENA/).waitFor();
  await hold(page, /hold to seal the leaf/i);
  await page.waitForURL(/#\/patri\//);
  return page.url().split("#/patri/")[1] ?? "";
}
