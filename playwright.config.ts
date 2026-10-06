import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "e2e",
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: "http://localhost:4173/jyoti/",
    timezoneId: "Asia/Kolkata",
    locale: "en-IN",
    colorScheme: "dark",
    trace: "retain-on-failure",
  },
  projects: [
    { name: "desktop-chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } } },
    { name: "pixel-7", use: { ...devices["Pixel 7"] } },
  ],
  webServer: {
    command: "npx vite preview --base /jyoti/ --port 4173 --strictPort",
    url: "http://localhost:4173/jyoti/",
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
