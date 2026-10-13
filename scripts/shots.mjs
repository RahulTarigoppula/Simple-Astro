// Dev helper: screenshot every screen at phone and desktop width against a running dev server.
// usage: node scripts/shots.mjs [outDir] [baseUrl]
import { mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? "shots";
const base = process.argv[3] ?? "http://localhost:5173/";
mkdirSync(out, { recursive: true });

const browser = await chromium.launch();
for (const [tag, viewport] of [
  ["m", { width: 390, height: 844 }],
  ["d", { width: 1280, height: 800 }],
]) {
  const page = await browser.newPage({ viewport, reducedMotion: "reduce" });
  await page.goto(`${base}#/leaf/new`);
  await page.getByRole("button", { name: /house example/i }).click();
  const seal = page.getByRole("button", { name: /hold to seal the leaf/i });
  await seal.scrollIntoViewIfNeeded();
  const box = await seal.boundingBox();
  if (!box) throw new Error("no seal");
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await page.waitForTimeout(1200);
  await page.mouse.up();
  await page.waitForURL(/#\/patri\//);
  const id = page.url().split("#/patri/")[1]?.split("/")[0] ?? "";
  const routes = {
    home: "",
    patri: `patri/${id}`,
    sky: `patri/${id}/sky`,
    today: "today",
    circle: "circle",
    milan: "milan",
    hast: `hast/${id}`,
    drawer: "drawer",
    leaf: "leaf/new",
    guide: "guide",
  };
  for (const [name, r] of Object.entries(routes)) {
    await page.goto(`${base}#/${r}`);
    await page.waitForTimeout(1800);
    await page.screenshot({ path: `${out}/${tag}-${name}.png`, fullPage: true });
  }
  await page.goto(`${base}#/today`);
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /^Tithi/ }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${tag}-foot.png` });
  await page.getByRole("button", { name: "Tell me more" }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${out}/${tag}-explain.png` });
  await page.close();
}
await browser.close();
console.log("done");
