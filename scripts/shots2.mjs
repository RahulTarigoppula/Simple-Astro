// usage: node shots2.mjs <outDir> <people 0|1|2> <m|d|md> route[=name] ...   (route tokens: {a} {b} = profile ids)
// Tall viewports capture the whole scrolling screen in one image.
import { mkdirSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(process.cwd() + "/");
const { chromium } = require("@playwright/test");
const [out, people = "2", sizes = "m", ...routes] = process.argv.slice(2);
const base = process.env.BASE ?? "http://localhost:5173/";
const H = Number(process.env.H ?? 0);
mkdirSync(out, { recursive: true });
const browser = await chromium.launch();
const VP = {
  m: { width: 390, height: H || 2600 },
  d: { width: 1280, height: H || 1800 },
  s: { width: 390, height: 844 },
  x: { width: 320, height: 2600 },
};
for (const tag of sizes.split("")) {
  const ctx = await browser.newContext({
    viewport: VP[tag],
    reducedMotion: process.env.MOTION ? "no-preference" : "reduce",
    colorScheme: "dark",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    deviceScaleFactor: 1,
  });
  if (process.env.AT) await ctx.clock.install({ time: new Date(process.env.AT) });
  const page = await ctx.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await page.goto(base);
  await page.waitForTimeout(800);
  const ids = await page.evaluate(
    async ([n, theme]) => {
      const { resolveBirthMoment } = await import("/src/engine/time.ts");
      const { upsertProfile, saveSettings } = await import("/src/data/repo.ts");
      const mk = async (name, y, mo, d, h, mi, place, tradition) => {
        const birth = resolveBirthMoment({
          localY: y,
          localMo: mo,
          localD: d,
          localH: h,
          localMi: mi,
          place,
          zoneOverride: "Asia/Kolkata",
        });
        const now = Date.now();
        const p = await upsertProfile({
          id: crypto.randomUUID(),
          name,
          birth,
          handedness: "right",
          tradition,
          createdAt: now,
          updatedAt: now,
        });
        return p.id;
      };
      const out = [];
      const blr = {
        name: "Bengaluru, Karnataka, IN",
        admin1: "Karnataka",
        country: "IN",
        lat: 12.9716,
        lon: 77.5946,
        timezone: "Asia/Kolkata",
        source: "bundle",
      };
      const hyd = {
        name: "Hyderabad, Telangana, IN",
        admin1: "Telangana",
        country: "IN",
        lat: 17.385,
        lon: 78.4867,
        timezone: "Asia/Kolkata",
        source: "bundle",
      };
      if (n >= 2) out.push(await mk("Priya", 1996, 8, 22, 18, 40, hyd, "telugu"));
      if (n >= 1) out.unshift(await mk("Rahul", 1994, 3, 14, 7, 25, blr, "north"));
      if (out[0]) await saveSettings({ activeProfileId: out[0] });
      if (theme) await saveSettings({ theme });
      return out;
    },
    [Number(people), process.env.THEME ?? ""],
  );
  for (const spec of routes) {
    const cut = spec.lastIndexOf("=");
    const r0 = cut < 0 ? spec : spec.slice(0, cut);
    const nm = cut < 0 ? undefined : spec.slice(cut + 1);
    const r = r0.replaceAll("{a}", ids[0] ?? "").replaceAll("{b}", ids[1] ?? "");
    const name =
      nm ??
      (r0
        .replace(/[{}]/g, "")
        .replace(/[^a-z0-9]+/gi, "-")
        .replace(/^-|-$/g, "") ||
        "home");
    await page.goto(`${base}#/${r}`);
    await page.waitForTimeout(Number(process.env.WAIT ?? 1800));
    if (process.env.CLICK)
      for (const c of process.env.CLICK.split("|")) {
        await page
          .getByText(c, { exact: false })
          .first()
          .click()
          .catch(() => {});
        await page.waitForTimeout(700);
      }
    // crop to the content height of the scrolling screen
    const h = await page.evaluate(() => {
      const s = document.querySelector("main.screen");
      const inner = s?.lastElementChild;
      return Math.ceil(Math.max(inner?.getBoundingClientRect().bottom ?? 0, 600));
    });
    const vp = page.viewportSize();
    await page.screenshot({
      path: `${out}/${tag}-${name}.png`,
      clip: { x: 0, y: 0, width: vp.width, height: Math.min(vp.height, tag === "s" ? vp.height : h + (tag === "d" ? 20 : 90)) },
    });
  }
  if (errors.length) console.log(tag, "ERRORS:", [...new Set(errors)].slice(0, 8).join("\n"));
  await ctx.close();
}
await browser.close();
console.log("done", routes.length);
