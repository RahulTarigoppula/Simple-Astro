import { expect, test } from "@playwright/test";
import { hold } from "./helpers";

// P-1 Zero leakage: a full session issues no request to any origin but our own.
test("zero leakage across a full session", async ({ page, baseURL }) => {
  const own = new URL(baseURL ?? "http://localhost:4173/").origin;
  const foreign: string[] = [];
  page.on("request", (r) => {
    const u = new URL(r.url());
    if (u.protocol.startsWith("http") && u.origin !== own) foreign.push(r.url());
  });

  await page.goto("./");
  await page.goto("#/leaf/new");
  const place = page.getByRole("searchbox", { name: "Place" });
  await place.click();
  await place.pressSequentially("Madurai", { delay: 60 });
  await page.waitForTimeout(800);
  await place.fill("");
  await page.getByRole("button", { name: /house example/i }).click();
  await hold(page, /hold to seal the leaf/i);
  await page.waitForURL(/#\/patri\//);
  const id = page.url().split("#/patri/")[1] ?? "";
  await page.getByRole("tab", { name: "D2" }).click();
  for (const route of ["#/today", "#/circle", `#/milan/${id}/${id}`, "#/drawer", `#/hast/${id}`, `#/patri/${id}/sky`]) {
    await page.goto(route);
    await page.waitForTimeout(800);
  }
  expect(foreign, `off-origin requests: ${foreign.join(", ")}`).toEqual([]);
});

test("the CSP allows exactly the two place-lookup origins", async ({ page }) => {
  await page.goto("./");
  const csp = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute("content");
  expect(csp).toContain("'wasm-unsafe-eval'");
  expect(csp).toContain("worker-src 'self' blob:");
  const connect =
    csp
      ?.match(/connect-src ([^;]+)/)?.[1]
      ?.trim()
      .split(/\s+/) ?? [];
  expect(connect.sort()).toEqual(["'self'", "https://geocoding-api.open-meteo.com", "https://nominatim.openstreetmap.org"].sort());
});
