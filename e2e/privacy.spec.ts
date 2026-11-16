import { expect, test } from "@playwright/test";

// P-1 Zero leakage: a full session issues no request to any origin but our own.
test("zero leakage across a full session", async ({ page, baseURL }) => {
  test.setTimeout(150_000); // eight screens, two of them heavy, on the phone profile
  const own = new URL(baseURL ?? "http://localhost:4173/").origin;
  const foreign: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith("http") && u.origin !== own) foreign.push(r.url());
  });

  await page.goto("./");
  await page.goto("#/leaf/new");
  await page.getByRole("textbox", { name: "Name" }).fill("Asha");
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("textbox", { name: "Day" }).fill("14");
  await page.getByRole("combobox", { name: "Month" }).selectOption("3");
  await page.getByRole("textbox", { name: "Year" }).fill("1994");
  await page.getByRole("switch", { name: "I don't know the time" }).click();
  await page.getByRole("button", { name: "Next" }).click();
  const place = page.getByRole("searchbox", { name: "Place of birth" });
  await place.click();
  await place.pressSequentially("Madurai", { delay: 60 });
  await page.getByRole("list", { name: "Places found" }).getByRole("button").first().click();
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByRole("button", { name: /^save/i }).click();
  await page.waitForURL(/#\/patri\//);
  const id = (page.url().split("#/patri/")[1] ?? "").split("?")[0] ?? "";
  await page.getByRole("tab", { name: "Planets", exact: true }).click();
  await page.getByText("Divisional charts").click();
  await page.getByRole("tab", { name: /^D2,/ }).click();
  for (const route of [
    "#/today",
    "#/circle",
    `#/forecast/${id}`,
    `#/milan/${id}/${id}`,
    "#/drawer",
    "#/explore",
    `#/hast/${id}`,
    `#/patri/${id}/sky`,
  ]) {
    await page.goto(route);
    await page.waitForTimeout(800);
  }
  expect(foreign, `off-origin requests: ${foreign.join(", ")}`).toEqual([]);
});

test("the CSP allows only the two place-lookup origins and the anonymous counter", async ({ page }) => {
  await page.goto("./");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("'wasm-unsafe-eval'");
  expect(csp).toContain("worker-src 'self' blob:");
  const connect =
    csp
      ?.match(/connect-src ([^;]+)/)?.[1]
      ?.trim()
      .split(/\s+/) ?? [];
  expect(connect.sort()).toEqual(
    ["'self'", "https://*.goatcounter.com", "https://geocoding-api.open-meteo.com", "https://nominatim.openstreetmap.org"].sort(),
  );
});
