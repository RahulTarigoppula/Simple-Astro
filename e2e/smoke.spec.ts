import { expect, test } from "@playwright/test";
import { sealReferenceLeaf } from "./helpers";

test("with nobody saved, home invites the first person", async ({ page }) => {
  await page.goto("./");
  await expect(page.getByRole("heading", { name: /your stars, in plain words/i })).toBeVisible();
  await expect(page.getByRole("link", { name: /add your birth details/i })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Main navigation" })).toBeVisible();
});

test("the example person engraves the contract with reality", async ({ page }) => {
  await page.goto("#/leaf/new");
  await page.getByRole("button", { name: /fill in an example/i }).click();
  const strip = page.locator(".leaf-strip");
  await expect(strip).toContainText("ASIA/KOLKATA");
  await expect(strip).toContainText("+05:30");
  await expect(strip).toContainText("2449425.5799");
  await expect(strip).toContainText("MEENA");
});

test("saving casts the chart with the golden numbers", async ({ page }) => {
  await sealReferenceLeaf(page);
  // Simple words come first; the chart and its detail sit behind the Chart view.
  await expect(page.getByRole("heading", { name: /this is you/i })).toBeVisible();
  await expect(page.locator(".life")).toContainText("Revatī");
  await page.getByRole("tab", { name: "Chart", exact: true }).click();
  const ledger = page.locator("table.ledger--grahas");
  await expect(ledger.locator("tbody tr")).toHaveCount(10); // Lagna + nine grahas
  await expect(ledger).toContainText("15°39′25″"); // Lagna, Mīna
  await expect(ledger).toContainText(/19°10′0[89]″/); // Candra, Revatī 1 (SE: 19°10′08.6″)
  // No graha in the reference chart is within 2′ of an edge: no asterisk anywhere.
  await expect(ledger.locator("button.flag")).toHaveCount(0);
  await page.getByText("Birth almanac").click();
  const panel = page.getByRole("tabpanel");
  await expect(panel).toContainText("Dvitīyā");
  await page.getByText("How this was calculated").click();
  await expect(panel).toContainText("2449425.5798"); // JD 2449425.579861 UT
  await expect(page.getByText(/Based on classical Jyotisha/)).toBeVisible();
});

test("home answers how the day is for the saved person", async ({ page }) => {
  await sealReferenceLeaf(page);
  await page.goto("#/");
  await expect(page.getByRole("heading", { name: /, Rahul$/ })).toBeVisible();
  await expect(page.getByText(/^Your day/)).toBeVisible();
  await expect(page.getByRole("heading", { name: "Good times today" })).toBeVisible();
  await page.getByRole("link", { name: "Week ahead" }).click();
  await expect(page.getByRole("tab", { name: "Week" })).toHaveAttribute("aria-selected", "true");
});

test("the person chip opens people and settings", async ({ page }) => {
  await sealReferenceLeaf(page);
  await page.goto("#/");
  await page.getByRole("button", { name: /switch person/i }).click();
  await expect(page.getByRole("radio", { name: /Rahul/ })).toBeChecked();
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  await expect(page).toHaveURL(/#\/drawer/);
  await expect(page.getByRole("heading", { name: "Settings", level: 1 })).toBeVisible();
});

test("birth fields read the time back in plain words and refuse 31 February", async ({ page }) => {
  await page.goto("#/leaf/new");
  // Nothing is assumed: the form starts empty, and later steps are closed until the earlier ones are done.
  await expect(page.getByText("Step 1 of 4")).toBeVisible();
  await expect(page.getByRole("button", { name: "Step 2: When" })).toBeDisabled();
  await page.getByRole("button", { name: /fill in an example/i }).click();
  await expect(page.getByTestId("birth-readback")).toContainText("14 March 1994, 7:25 in the morning (07:25)");
  await expect(page.locator(".leaf-check")).toContainText("Revatī");
  // pm is a different sky: the read-back changes with it.
  await page.getByRole("button", { name: "Step 2: When" }).click();
  await page.getByRole("radio", { name: "pm", exact: true }).click();
  await expect(page.getByTestId("birth-readback")).toContainText("7:25 in the evening (19:25)");
  await page.getByRole("radio", { name: "am", exact: true }).click();
  // An impossible day is named, not clamped, and the flow does not move on.
  await page.getByRole("combobox", { name: "Month" }).selectOption("2");
  await page.getByRole("textbox", { name: "Day" }).fill("31");
  await expect(page.getByTestId("birth-readback")).toContainText("February 1994 has only 28 days");
  await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 2 of 4")).toBeVisible();
  await expect(page.getByRole("button", { name: "Step 4: Check" })).toBeDisabled();
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
