import { expect, test } from "@playwright/test";
import { sealReferenceLeaf } from "./helpers";

test("empty desk invites the first leaf", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /add your first person/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
});

test("writing the reference leaf engraves the contract with reality", async ({ page }) => {
  await page.goto("#/leaf/new");
  await page.getByRole("button", { name: /fill in an example/i }).click();
  const strip = page.locator(".leaf-strip");
  await expect(strip).toContainText("ASIA/KOLKATA");
  await expect(strip).toContainText("+05:30");
  await expect(strip).toContainText("2449425.5799");
  await expect(strip).toContainText("MEENA");
});

test("sealing casts the Patri with the golden numbers", async ({ page }) => {
  await sealReferenceLeaf(page);
  // Simple words come first; the chart itself sits behind "Full detail (astro tech)".
  await expect(page.getByRole("heading", { name: /this is you/i })).toBeVisible();
  await expect(page.locator(".life")).toContainText("Revatī");
  await page.getByText("Full detail (astro tech)").click();
  await expect(page.locator(".astro-tech .engraved").first()).toContainText("2449425.5799");
  await expect(page.locator(".astro-tech .engraved").first()).toContainText("MEENA");
  const ledger = page.locator("table.ledger--grahas");
  await expect(ledger.locator("tbody tr")).toHaveCount(10); // Lagna + nine grahas
  await expect(ledger).toContainText("15°39′25″"); // Lagna, Mīna
  await expect(ledger).toContainText(/19°10′0[89]″/); // Candra, Revatī 1 (SE: 19°10′08.6″)
  await expect(page.locator(".rows")).toContainText("Dvitīyā");
  await expect(page.locator(".rows")).toContainText("Revatī");
  // No graha in the reference chart is within 2′ of an edge: no asterisk anywhere.
  await expect(ledger.locator("button.flag")).toHaveCount(0);
  await expect(page.getByText(/Based on classical Jyotisha/)).toBeVisible();
});

test("birth fields read the time back in plain words and refuse 31 February", async ({ page }) => {
  await page.goto("#/leaf/new");
  // Nothing is assumed: the form starts empty and says what is missing.
  await expect(page.getByTestId("birth-readback")).toContainText("Fill in the date of birth");
  await expect(page.getByRole("button", { name: /hold to save/i })).toBeDisabled();
  await page.getByRole("button", { name: /fill in an example/i }).click();
  await expect(page.getByTestId("birth-readback")).toContainText("14 March 1994, 7:25 in the morning (07:25)");
  // pm is a different sky: the check card changes with it.
  await page.getByRole("radio", { name: "pm", exact: true }).click();
  await expect(page.getByTestId("birth-readback")).toContainText("7:25 in the evening (19:25)");
  await page.getByRole("radio", { name: "am", exact: true }).click();
  await expect(page.locator(".leaf-check")).toContainText("Revatī");
  // An impossible day is named, not clamped.
  await page.getByRole("combobox", { name: "Month" }).selectOption("2");
  await page.getByRole("textbox", { name: "Day" }).fill("31");
  await expect(page.getByTestId("birth-readback")).toContainText("February 1994 has only 28 days");
  await expect(page.getByRole("button", { name: /hold to save/i })).toBeDisabled();
});

test("a short press on the seal saves nothing", async ({ page }) => {
  await page.goto("#/leaf/new");
  await page.getByRole("button", { name: /fill in an example/i }).click();
  const btn = page.getByRole("button", { name: /hold to save/i });
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
  await expect(page.getByText("There is nothing at this address.")).toBeVisible();
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
