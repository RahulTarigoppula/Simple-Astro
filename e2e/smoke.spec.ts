import { expect, test } from "@playwright/test";
import { sealReferenceLeaf } from "./helpers";

test("empty desk invites the first leaf", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /write your first leaf/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "The Ledge" })).toBeVisible();
});

test("writing the reference leaf engraves the contract with reality", async ({ page }) => {
  await page.goto("#/leaf/new");
  await page.getByRole("button", { name: /house example/i }).click();
  const strip = page.locator(".leaf-strip");
  await expect(strip).toContainText("ASIA/KOLKATA");
  await expect(strip).toContainText("+05:30");
  await expect(strip).toContainText("2449425.5799");
  await expect(strip).toContainText("MEENA");
});

test("sealing casts the Patri with the golden numbers", async ({ page }) => {
  await sealReferenceLeaf(page);
  await expect(page.locator(".patri-head .engraved")).toContainText("2449425.5799");
  await expect(page.locator(".patri-head .engraved")).toContainText("MEENA");
  const ledger = page.locator("table.ledger");
  await expect(ledger.locator("tbody tr")).toHaveCount(10); // Lagna + nine grahas
  await expect(ledger).toContainText("15°39′25″"); // Lagna, Mīna
  await expect(ledger).toContainText(/19°10′0[89]″/); // Candra, Revatī 1 (SE: 19°10′08.6″)
  await expect(page.locator(".rows")).toContainText("Dvitīyā");
  await expect(page.locator(".rows")).toContainText("Revatī");
  // No graha in the reference chart is within 2′ of an edge: no asterisk anywhere.
  await expect(ledger.locator("button.flag")).toHaveCount(0);
  await expect(page.getByText(/Based on classical Jyotisha/)).toBeVisible();
});

test("brass drums are spinbuttons and refuse 31 February", async ({ page }) => {
  await page.goto("#/leaf/new");
  await page.getByRole("button", { name: /house example/i }).click();
  const month = page.getByRole("spinbutton", { name: "Month" });
  const day = page.getByRole("spinbutton", { name: "Day" });
  await month.focus();
  await page.keyboard.press("ArrowDown"); // March → February
  await expect(month).toHaveAttribute("aria-valuenow", "2");
  await day.focus();
  await page.keyboard.press("End"); // ask for the 31st
  await expect(day).toHaveAttribute("aria-valuenow", "14"); // refused, not clamped to 28
  await page.keyboard.press("PageUp"); // 14 → 24 is a real date
  await expect(day).toHaveAttribute("aria-valuenow", "24");
});

test("a short press on the seal saves nothing", async ({ page }) => {
  await page.goto("#/leaf/new");
  await page.getByRole("button", { name: /house example/i }).click();
  const btn = page.getByRole("button", { name: /hold to seal the leaf/i });
  await btn.scrollIntoViewIfNeeded();
  const box = await btn.boundingBox();
  if (!box) throw new Error("no seal");
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.waitForTimeout(250);
  await page.mouse.up();
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/#\/leaf\/new/);
});

test("a nonsense route lands on the lost leaf", async ({ page }) => {
  await page.goto("#/nonsense");
  await expect(page.getByText("This leaf is not in the bundle.")).toBeVisible();
});

test("after one visit the desk opens and computes in airplane mode", async ({ page, context }) => {
  await page.goto("./#/today");
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
  });
  await page.reload(); // now controlled by the service worker
  await expect(page.getByText(/Tithi/).first()).toBeVisible();
  await context.setOffline(true);
  await page.reload();
  await expect(page.getByText(/Tithi/).first()).toBeVisible();
  await context.setOffline(false);
});
