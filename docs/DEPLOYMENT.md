# Jyoti / Vyomaphala, Deployment Runbook

Written 2026-09-08. Follows `_shared/DECISIONS.md` D2 (GitHub Pages, repo `jyoti`), D3 (Capacitor 8, APK signed in GitHub Actions), D5 (licence rules, the reason §8 exists), D6 (repo layout), D9.1 ("Day 1 = live"). Shared assets used here: `_shared/templates/pages.yml`, `_shared/templates/android-release.yml`, `_shared/templates/app-build.gradle.snippet`, `_shared/scripts/make-keystore.sh`. Test references are to `docs/TESTING.md`.

**Vyomaphala has no Cloudflare Worker, no API key, no account and no backend** (D8 row 02: proxy "none"; GOAL §9). §4 says why and what would have to be true to change that.

Shell conventions: **PowerShell** for `npm` / `git` / `gh`; **Git Bash** for `make-keystore.sh` and anything needing `openssl`, `base64 -w0` or `sha256sum`.

---

## 0. Names and constants (decide once, never change)

| Item | Value | Notes |
|---|---|---|
| GitHub repo | **`jyoti`** (public) | DECISIONS §D2 suggested name. Public = Pages + unlimited Actions minutes. **The *brand* is Vyomaphala; every *identifier* is `jyoti`**, repo, Pages path, `appId`, keystore file, keystore alias script argument. Only user-visible names (`appName`, manifest `name`, colour tokens, cache names, the sound sprite) say "Vyomaphala". Do not "fix" either half later: the URL is baked into the PWA scope and the appId is baked into every installed APK. |
| Web URL | `https://<owner>.github.io/jyoti/` | `<owner>` = your GitHub username |
| Vite `base` on Pages | `/jyoti/` | injected as `VITE_BASE_PATH` by `pages.yml` |
| Vite `base` in the APK | `/` | Capacitor serves from `https://localhost/` |
| Router | React Router 7, **hash router** (`createHashRouter`) | `#/`, `#/today`, `#/circle`, `#/leaf/new`, `#/leaf/:id/edit`, `#/patri/:id`, `#/patri/:id/sky`, `#/hast/:id`, `#/hast/:id/capture`, `#/milan/:a/:b`, `#/drawer`, `#/lost` |
| App name | **Vyomaphala** | `capacitor.config.ts` `appName`, manifest `name`; `short_name` = `Vyomaphala` |
| Android `appId` / `applicationId` / `namespace` | **`com.rahul.jyoti`** | **Immutable after the first install.** Changing it makes a second, empty app on the phone. Older drafts put the brand name here instead; that spelling is dead, IMPLEMENTATION-PROMPT §0.3 settles it. |
| Keystore | `jyoti-release.p12`, alias `release`, PKCS12 | from `make-keystore.sh jyoti`; backed up per §12 |
| Version scheme | git tag `vMAJOR.MINOR.PATCH`; Android `versionCode = github.run_number` | §10 |
| Theme / background colour | `theme_color #1A110B` (teak), `background_color #F4EAD3` (paper) | DESIGN §14; splash is teak with the diya |
| Orientation | `portrait` in the manifest; the Rooftop route unlocks landscape at runtime | DESIGN §14 |
| Licence | **MIT** | and it must stay MIT, see §8 |
| Engine defaults shipped | `ayanamsa: SE-true`, `nodeType: true`, `dashaYearDays: 365.25`, `sunriseConvention: upper-limb-refracted`, `bhava: whole-sign` | every one of these is printed in the colophon of every chart. V-4 may switch the sunrise default after the 25-sample Drik comparison; the setting is user-visible either way, and TESTING's `reference-chart.json` freezes `"sunriseConvention": "upper-limb"` |

---

## 1. Create the repository

```powershell
# from C:\Work\Personal_Projects\02-jyoti-astrology-palmistry  (the app scaffold lives at the repo root, per D6)
git init -b main
gh repo create jyoti --public --source . --description "Vyomaphala - a private, offline Jyotisha desk: arcsecond-honest Janam Patri, Guna Milan on a 36-bead mala, and a palm read with a brass loupe" --disable-wiki
git remote -v   # origin -> https://github.com/<owner>/jyoti.git
```

Before the first push these must exist:

```
.gitignore
  node_modules/  dist/  coverage/  playwright-report/  test-results/
  android/local.properties  android/app/build/  android/.gradle/  android/app/release/
  *.p12  *.jks  *.keystore  *.b64
  .env*.local
  fixtures-private/            # real palm photos - TESTING §2.4, NEVER committed
  docs/oracles/*.png           # Drik/JHora screenshots stay local; only the numbers are committed
  src/data/*.raw.txt           # GeoNames dumps before the build step trims them

.gitattributes
  android/gradlew text eol=lf
  *.sh text eol=lf
  *.task binary
  *.bin binary
  *.woff2 binary
  e2e/visual/__screenshots__/**/*.png binary
```

Repo settings, once (Settings → General): default branch `main`; *Automatically delete head branches* on. Settings → Actions → General: *Allow all actions*; *Workflow permissions: Read repository contents* (each workflow requests what it needs explicitly).

Also add at the first commit:

- `LICENSE`, **MIT** (see §8 before ever changing this file).
- README **Attribution** section (D5.4): GeoNames `cities500` (CC BY 4.0) · MediaPipe `hand_landmarker.task` (Apache-2.0) · Yale Bright Star Catalog BSC5 (public domain) · `astronomy-engine` (MIT) · Luxon, minisearch, Dexie, Motion, three/R3F, Howler, `@photostructure/tz-lookup` (CC0) · Yatra One, Tiro Devanagari Hindi, Martian Mono (SIL OFL 1.1) · Lucide (ISC) · CC0 sounds from freesound.org and Kenney.nl (with `public/sounds/ATTRIBUTION.md`) · classical tables re-typed from BPHS/Muhurta Chintamani as **facts** (PyJHora and Swiss Ephemeris are AGPL and were used only as offline validation oracles; **no AGPL code is in this repo**).
- README **Disclaimer**: the same sentence the app's colophon carries (RESEARCH §5.14).
- `docs/VERIFICATION-LOG.md`, an empty table with the V-numbers from TESTING §11.

**Privacy note before the first push:** this repo is public and the app holds other people's birth data and hand photographs. Nothing under `fixtures-private/` and no personal profile export ever gets committed; `scripts/check-no-biometrics.mjs` (TESTING §2.4) runs in CI as a blocking check and should also be wired as a `pre-commit` hook locally.

---

## 2. Build configuration the deploy depends on

### 2.1 `vite.config.ts`

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const pkg = JSON.parse(readFileSync("./package.json", "utf8"));
const isAndroid = process.env.VITE_PLATFORM === "android";
const base = process.env.VITE_BASE_PATH ?? "/";
const empty = fileURLToPath(new URL("./src/shims/empty.ts", import.meta.url));

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),   // colophon: "Vyomaphala 0.4.2"
    __ENGINE_BUILD__: JSON.stringify(pkg.dependencies["astronomy-engine"]),
  },
  resolve: {
    // @techstark/opencv-js reaches for Node built-ins that never run in the browser
    // (RESEARCH §4). Exact-match regexes only, so `node:fs` and our own paths are untouched.
    alias: [
      { find: /^fs$/, replacement: empty },
      { find: /^path$/, replacement: empty },
      { find: /^crypto$/, replacement: empty },
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
    // No service worker inside the Capacitor WebView (ANDROID-PACKAGING pitfall 8):
    // the APK ships every asset, so it is offline by construction.
    ...(isAndroid ? [] : [VitePWA({
      registerType: "prompt",          // never reload mid-cast; the update is a small ink note
      includeAssets: ["favicon.svg", "grain.svg", "seal-edge.svg"],
      manifest: {
        name: "Vyomaphala",
        short_name: "Vyomaphala",
        description: "A private, offline Jyotisha desk",
        lang: "en-IN",
        theme_color: "#1A110B",
        background_color: "#F4EAD3",
        display: "standalone",
        orientation: "portrait",
        start_url: base,               // "/jyoti/" on Pages
        scope: base,
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the desk: shell, fonts, engine, gazetteer, stars, sounds, grain.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest,webm,mp3,bin}", "**/geonames-*.json.gz"],
        // Do NOT precache the heavy, screen-specific payloads (see §2.2).
        globIgnores: ["**/models/**", "**/*.wasm", "**/opencv*.js", "**/sky-*.js"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          { urlPattern: /\/models\/.*\.task$/, handler: "CacheFirst",
            options: { cacheName: "chowki-models", expiration: { maxEntries: 4 } } },
          { urlPattern: /\/(mediapipe|opencv).*\.(wasm|js)$/, handler: "CacheFirst",
            options: { cacheName: "chowki-cv", expiration: { maxEntries: 12 } } },
          { urlPattern: /sky-.*\.js$/, handler: "CacheFirst", options: { cacheName: "chowki-sky" } },
        ],
      },
    })]),
  ],
  build: {
    target: "es2022",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          engine: ["astronomy-engine", "luxon"],
          sky: ["three", "@react-three/fiber", "@react-three/drei"],
          cv: ["@techstark/opencv-js"],
          mp: ["@mediapipe/tasks-vision"],
        },
      },
    },
  },
});
```

`src/main.tsx` registers the service worker only on the web:
`if (!Capacitor.isNativePlatform()) import("virtual:pwa-register").then(({ registerSW }) => registerSW({ onNeedRefresh: showInkNote }))`.

Every asset URL goes through `import.meta.env.BASE_URL`, including `models/hand_landmarker.task` and the MediaPipe `wasm/` directory, which are the two most likely 404s on a sub-path host. Test locally exactly as Pages will serve it:

```powershell
npm run build; $env:VITE_BASE_PATH="/jyoti/"; npm run build; npx vite preview --base /jyoti/
# open http://localhost:4173/jyoti/
```

**No `fs` shim is needed for `@ishubhamx/panchangam-js`**, it is a devDependency used only by Node-side oracle tests and never enters the bundle (TESTING §2.3, checks O-1…O-3). The three aliases above exist for OpenCV, not for it.

### 2.2 Large assets and the precache decision

Vyomaphala carries more bytes than any other app in the portfolio. The sizes (RESEARCH §2-§4, DESIGN §16):

| Asset | Size | Where it lives | Cache policy |
|---|---|---|---|
| `public/models/hand_landmarker.task` | 7 819 105 B (7.46 MiB) | committed to the repo | **runtime** CacheFirst, fetched on the first visit to Hast |
| MediaPipe `wasm/` (self-hosted from the npm package, copied in a `prebuild` step) | ~3 MB | `public/mediapipe/` | runtime CacheFirst |
| `@techstark/opencv-js` chunk (js glue + wasm) | ~9-11 MB | lazy chunk `cv` | runtime CacheFirst |
| Three.js + R3F dome chunk | ~700 kB gz | lazy chunk `sky` | runtime CacheFirst |
| `src/data/geonames-in.json.gz` | ≤ 1.8 MB gz | bundled | precached |
| `src/data/bsc5.bin` | ≤ 60 kB | bundled | precached |
| Fonts (3 subset families) | ≤ 260 kB | bundled | precached |
| `public/sounds/chowki.{webm,mp3}` | ≤ 300 kB | bundled | precached |
| App JS | ≤ 350 kB gz (GOAL §5.7) | bundled | precached |

DESIGN §9.11 says fonts, engine, GeoNames, models and sounds are precached and OpenCV/sky are cached on first visit. **Deviation, needing ARCHITECTURE.md sign-off:** the 7.46 MB hand model is moved out of the *install-time* precache into the same runtime CacheFirst bucket as OpenCV, because a Workbox precache blocks the service worker's `install` event, an 11 MB install on a phone would make the first visit feel broken and would blow the "Lighthouse Performance ≥ 90" criterion. Offline parity is restored by an explicit **Drawer → "Prepare for offline"** action that warms `chowki-models`, `chowki-cv` and `chowki-sky` with a byte progress line. TESTING OF-3 asserts both halves of this. If ARCHITECTURE.md prefers install-time precaching, raise `maximumFileSizeToCacheInBytes` to 10 MB and delete the `globIgnores` line for `models/`, nothing else changes.

Hosting headroom check (HOSTING.md): the published site is ~22 MB against a 1 GB limit, and 100 GB/month ÷ ~22 MB ≈ 4 500 cold first loads, irrelevant for a private app, and there is no billing path either way. No file approaches the 25 MB "no ML models in the bundle" rule in D2.

### 2.3 Icons, splash and `index.html`

`public/icon.svg`, a brass diya with a vermilion flame tip on teak `#1A110B` (DESIGN §14). Then:

```powershell
npx pwa-assets-generator --preset minimal-2023 public/icon.svg
```

produces `pwa-192x192.png`, `pwa-512x512.png`, `maskable-icon-512x512.png`, `apple-touch-icon-180x180.png`, `favicon.ico`. Commit them.

`index.html` must carry:

- `<html lang="en" data-theme="night">` (the ThemeProvider removes `data-theme` for "auto by sun altitude").
- `<meta name="theme-color" content="#1A110B">`, switched to `#6E4A2E` by the ThemeProvider on the morning terrace.
- The CSP meta from TESTING §10 P-2, note **`script-src 'self' 'wasm-unsafe-eval'`** and **`worker-src 'self' blob:`**; without those two, MediaPipe and OpenCV fail to compile and the Hast screen dies silently:

  ```html
  <meta http-equiv="Content-Security-Policy" content="
    default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:;
    connect-src 'self' https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org;
    img-src 'self' blob: data:; media-src 'self'; style-src 'self' 'unsafe-inline';
    font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
  ```

- No Google Fonts `<link>`. `design/preview.html` may hot-link them (D1); the app never does.

---

## 3. GitHub Pages (web), first deploy

1. **Enable Pages with the Actions source.** Settings → Pages → *Build and deployment* → Source: **GitHub Actions**. (CLI: `gh api -X POST repos/<owner>/jyoti/pages -f build_type=workflow`.)

2. **Copy the shared workflow**, no edits needed:

   ```powershell
   New-Item -ItemType Directory -Force .github/workflows | Out-Null
   Copy-Item ..\_shared\templates\pages.yml .github\workflows\pages.yml
   ```

   What it does: `ubuntu-24.04`, `setup-node@v7` (Node 22, npm cache), `npm ci`, `npm test -- --run` (Vitest, keep it; delete only until the first test exists), `npm run build` with `VITE_BASE_PATH=/jyoti/`, `cp dist/index.html dist/404.html` (harmless with the hash router), `configure-pages@v5` → `upload-pages-artifact@v4` → `deploy-pages@v4`, `concurrency: pages`. The commented `VITE_API_BASE` line **stays commented**, Vyomaphala has no proxy (§4).

3. **Add `ci.yml`** (e2e + privacy, separate from Pages so a flaky gesture never blocks a deploy):

   ```yaml
   name: ci
   on: { pull_request: {}, push: { branches: [main] } }
   permissions: { contents: read }
   jobs:
     checks:
       runs-on: ubuntu-24.04
       timeout-minutes: 25
       steps:
         - uses: actions/checkout@v7
         - uses: actions/setup-node@v7
           with: { node-version: 22, cache: npm }
         - run: npm ci
         - run: node scripts/check-no-biometrics.mjs      # blocking, TESTING P-0
         - run: node scripts/check-licences.mjs           # blocking, TESTING P-6
         - run: npm run test:unit
         - run: npx playwright install --with-deps chromium
         - run: npm run build
           env: { VITE_BASE_PATH: /jyoti/ }
         - run: node scripts/check-bundle.mjs             # no panchangam-js, no swisseph, no SW in the android build
         - run: npm run test:e2e
         - run: npm run test:privacy
         - uses: actions/upload-artifact@v7
           if: failure()
           with: { name: playwright-report-${{ github.run_number }}, path: playwright-report/, retention-days: 7 }
   ```

4. **Push.**

   ```powershell
   git add -A; git commit -m "Vyomaphala: scaffold + Pages workflow"; git push -u origin main
   gh run watch
   ```

5. **URL and smoke checks.** The deploy job summary and Settings → Pages show `https://<owner>.github.io/jyoti/`.

   ```powershell
   curl.exe -I https://<owner>.github.io/jyoti/                                   # 200
   curl.exe -I https://<owner>.github.io/jyoti/manifest.webmanifest               # 200, application/manifest+json   (TESTING V-18)
   curl.exe -I https://<owner>.github.io/jyoti/sw.js                              # 200, application/javascript
   curl.exe -I https://<owner>.github.io/jyoti/models/hand_landmarker.task        # 200, 7819105 bytes               (TESTING V-11)
   curl.exe -I https://<owner>.github.io/jyoti/mediapipe/vision_wasm_internal.wasm # 200, application/wasm
   ```

   Then, from Git Bash, confirm the two optional online endpoints still allow a `github.io` origin (TESTING V-17):

   ```bash
   curl -s -D - -o /dev/null -H "Origin: https://<owner>.github.io" \
     "https://geocoding-api.open-meteo.com/v1/search?name=Madurai&count=5" | grep -i access-control
   curl -s -D - -o /dev/null -H "Origin: https://<owner>.github.io" -H "User-Agent: Vyomaphala/0.1 (github.com/<owner>/jyoti)" \
     "https://nominatim.openstreetmap.org/search?q=Madurai&format=jsonv2&limit=5" | grep -i access-control
   ```

6. **Phase 0 "hello world" (D9.1).** Open `https://<owner>.github.io/jyoti/#/leaf/new`, write the reference leaf (14 Mar 1994, 07:25, Bengaluru), hold the seal, and get a drawn D1 with a graha ledger. That, plus the engraved strip reading `ASIA/KOLKATA · +05:30 · JD 2449425.5799` and `LAGNA ♓ MEENA`, is the end of Phase 0. **Do not skip the JD check:** older DESIGN §9.4/§9.5 mocks printed the Julian Day for 07:10 IST, 15 minutes wrong (TESTING §2.1, "JD correction"). DESIGN and `design/preview.html` are both corrected; if a screenshot ever shows a JD other than the one above, something regressed.

7. **Deep links.** `https://<owner>.github.io/jyoti/#/today` works directly (hash router, no 404 status involved). A bare `/jyoti/today` returns the `404.html` copy with a 404 status and still boots the app, acceptable, not linked anywhere.

Custom domain: not planned. Adding one later makes `VITE_BASE_PATH` `/` and changes the PWA scope, every installed PWA would have to be re-installed.

---

## 4. Worker / proxy, not needed (and why)

DECISIONS D8 row 02 lists Vyomaphala's proxy as **none**, and GOAL §9 makes "no keys, no card anywhere" a constraint rather than a preference. Every network call in the app is user-initiated, keyless and CORS-open:

| Feature | Endpoint | Key | CORS | When it fires |
|---|---|---|---|---|
| Online place lookup (fallback) | `https://geocoding-api.open-meteo.com/v1/search` | none | `*` (verified 2026-09-06, re-verified at V-17) | only on an explicit "search online ⌑" tap |
| Second fallback | `https://nominatim.openstreetmap.org/search` | none | `*` | only on submit, never per keystroke (their policy forbids autocomplete) |

Everything else, ephemeris, ayanamsa, panchang, dasha, yogas, matching, gazetteer, hand landmarks, palm CV, stars, runs on the device. So there is **no `worker/` folder, no `worker.yml`, no `CLOUDFLARE_*` secrets and no `VITE_API_BASE`**. Do not add them "just in case".

Obligations that come with those two endpoints, and where they are discharged:

- Open-Meteo is **CC BY 4.0 and non-commercial**; Nominatim is **ODbL** with a ≤ 1 req/s limit and an identifying `User-Agent`/`Referer`. Both are credited in the Drawer colophon; the app sends `Referer` naturally from the Pages origin and a descriptive `User-Agent` from the Capacitor build; results are cached in Dexie so a repeated search is free.
- Rate limiting is enforced client-side (one request per explicit tap, 1 s minimum spacing, single-flight), and both calls degrade silently to "not in the bundle, try a nearby town" (the offline gazetteer is the product; the network is a courtesy).

**If a proxy is ever needed**, the only candidate is the Someday BYO-key LLM paraphraser (GOAL §7, D4 rung 1/2), copy `_shared/templates/worker.yml` and `worker-proxy.ts`, set `ALLOWED_ORIGIN` to `https://<owner>.github.io` **and** `https://localhost` (the Capacitor origin), keep `UPSTREAM_BASE` in `wrangler.toml`, put the key in `wrangler secret put`, and expose the URL as `VITE_API_BASE` in `pages.yml`. Justify it in ARCHITECTURE.md first (DECISIONS: "deviations must be justified"), and remember GOAL §6 bans an LLM from the core path in any case.

---

## 5. Environment and configuration reference

Nothing secret exists on the web side; every `VITE_*` value is public and inlined into the bundle.

| Variable | Where set | Pages value | Android value | Local dev |
|---|---|---|---|---|
| `VITE_BASE_PATH` | workflow `env` | `/jyoti/` | `/` | unset → `/` |
| `VITE_PLATFORM` | workflow `env` | unset (web) | `android` (disables the PWA plugin) | unset |
| `__APP_VERSION__` | `define` from `package.json` | tag without `v` | same | `0.0.0-dev` |
| `__ENGINE_BUILD__` | `define` from the lockfile | `2.1.19` | same | same |

Repository **secrets** (Settings → Secrets and variables → Actions), exactly four, all for Android signing, none used by the web build:

`ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD` (§7.5).

Repository **variables**: none.

Runtime settings that live in the app (Dexie `settings` table, Drawer §9.10) and are **not** build config: ayanamsa preset, node type, dasha year length, sunrise convention, Bhava system, chart script (Devanagari/Latin), Devanagari digits, language, sound, haptics, "Calm desk", lamp mode. Every one of them is stamped into each chart's colophon so a screenshot is self-describing.

---

## 6. PWA install check (after every Pages deploy that touches the shell)

1. Desktop Chrome/Edge → `https://<owner>.github.io/jyoti/` → DevTools → *Application* → *Manifest*: no warnings, icons resolve, `scope` and `start_url` both `/jyoti/`. *Service workers*: `sw.js` activated with scope `/jyoti/`.
2. Address-bar install icon → install → the window opens standalone on the night desk with a teak title bar (`theme_color`).
3. DevTools → *Network* → **Offline** → reload → the Vyomaphala renders, fonts are Yatra One / Tiro (no fallback flash), and a **new** cast completes (engine + gazetteer are precached, TESTING OF-1/OF-2).
4. Still offline, open Hast: it should say it needs the model. Go online, open Drawer → **Prepare for offline**, watch the byte progress, go offline again, and confirm the palm pipeline now runs (TESTING OF-3).
5. Android Chrome → same URL → menu → *Install app* (Chrome mints a WebAPK). This is the fallback for any phone that cannot sideload; it has no `@capacitor/camera`, so capture falls back to `getUserMedia`/file input, say so in the Drawer copy.
6. Lighthouse (DevTools) mobile: Performance ≥ 90, installable, a11y ≥ 95 (TESTING §8 runs the same via LHCI).
7. Push a trivial change → after the deploy, an open PWA shows the ink note "a new edition is ready, reload"; reloading lands on the new version (check the colophon's version string). It must never reload mid-cast.

---

## 7. Android pipeline (Capacitor 8, signed in GitHub Actions)

No Java, no Android SDK, no Android Studio on the machine, every APK is built by `ubuntu-24.04`, which already has the SDK and JDK 21 (D3, ANDROID-PACKAGING §"GitHub Actions and runner facts").

### 7.1 One-time: add Capacitor and the plugins Vyomaphala actually needs

```powershell
npm i @capacitor/core @capacitor/android @capacitor/app @capacitor/camera @capacitor/filesystem `
      @capacitor/preferences @capacitor/haptics @capacitor/share @capacitor/splash-screen
npm i -D @capacitor/cli
npx cap init "Vyomaphala" com.rahul.jyoti --web-dir dist
npx cap add android        # the "Gradle sync failed" warning is expected without a local SDK - ignore it
```

Deliberately **not** installed: `@capacitor/local-notifications` (daily-panchang notifications are a Someday item, GOAL §7, adding the plugin now would add `POST_NOTIFICATIONS`/`SCHEDULE_EXACT_ALARM` to the manifest for nothing), `@capacitor-community/sqlite` (Dexie/IndexedDB works identically in the WebView), any gallery-enumeration plugin (Vyomaphala picks one photo at a time through the system picker, that is Blurvre's problem, not ours), `@capacitor/status-bar` (edge-to-edge is handled by the **System Bars** API in `@capacitor/core` 8.5; add the separate plugin only if V-21 or an inset bug forces it).

`capacitor.config.ts`:

```ts
import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.rahul.jyoti",
  appName: "Vyomaphala",
  webDir: "dist",
  android: {
    webContentsDebuggingEnabled: false,   // flipped to true only on a debug branch (§7.8)
  },
  plugins: {
    SplashScreen: {
      backgroundColor: "#1A110B",
      androidSplashResourceName: "splash",
      launchAutoHide: false,              // the desk fades the splash out itself in 240 ms (DESIGN §14)
    },
  },
};
export default config;
```

Commit `android/` in full except the ignores in §1, and fix the wrapper's exec bit from Windows:

```powershell
git update-index --chmod=+x android/gradlew
```

### 7.2 One-time: merge the Gradle snippet

Replace the `android { … }` block in `android/app/build.gradle` with `_shared/templates/app-build.gradle.snippet`, setting **both** `namespace` and `applicationId` to `com.rahul.jyoti`. Keep everything else the generated file has (`apply plugin`, `repositories`, `dependencies`, `apply from: 'capacitor.build.gradle'`, the `google-services` try/catch). Result: `versionCode`/`versionName` come from `-P` properties, and release signing activates only when `ANDROID_KEYSTORE_FILE` is present in the environment.

### 7.3 One-time: Vyomaphala-specific Android files (before the first build)

`android/app/src/main/AndroidManifest.xml`, Vyomaphala's permission surface is deliberately tiny:

```xml
<!-- Camera. The @capacitor/camera intent-capture path needs no permission, but the guided-capture
     screen uses getUserMedia for the live sharpness/exposure gauges, which does (DESIGN §9.7, §14). -->
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />

<!-- Haptics (DESIGN §12). No-ops on devices without a vibrator. -->
<uses-permission android:name="android.permission.VIBRATE" />

<!-- Deliberately absent: every storage/media permission (the system photo picker needs none, and
     Vyomaphala reads exactly one image at a time), POST_NOTIFICATIONS, SCHEDULE_EXACT_ALARM,
     RECEIVE_BOOT_COMPLETED, ACCESS_*_LOCATION (the app never asks for GPS - it uses the active
     profile's birthplace, DESIGN §9.2). INTERNET stays, for the two optional place lookups. -->
```

If V-20 shows the live gauges are unusable on the device, drop `getUserMedia` on Android, use the camera intent only, and this file loses the `CAMERA` line entirely.

Resources:

- `res/values/colors.xml`: `chowki_teak #1A110B`, `chowki_paper #F4EAD3`, `chowki_sindoor #B5301C`, `chowki_brass #C9A24A`, `chowki_ledge #241811`.
- `res/drawable/splash.xml`: layer-list, `@color/chowki_teak` fill + the centred diya vector from `public/icon.svg`.
- `res/mipmap-anydpi-v26/ic_launcher.xml` + `ic_launcher_round.xml`: adaptive icon, background `@color/chowki_teak`, foreground the brass diya with the vermilion flame tip (18 % safe padding), `<monochrome>` layer = the diya silhouette. Delete the Capacitor placeholder PNG mipmaps.
- `res/values/strings.xml`: `app_name = Vyomaphala`, `title_activity_main = Vyomaphala`, `package_name` / `custom_url_scheme = com.rahul.jyoti`.
- `res/values/styles.xml`: `AppTheme.NoActionBarLaunch` with `windowSplashScreenBackground = @color/chowki_teak`.
- `res/xml/`: no `network_security_config` is needed (all traffic is HTTPS or local).

Edge-to-edge and back behaviour (DESIGN §14):

- Use `SystemBars` from `@capacitor/core` 8.5, `setStyle("dark")` on the night desk (light icons), `"light"` on the morning terrace; the CSS uses `env(safe-area-inset-*)` with the plugin's `--safe-area-inset-*` fallback for WebView < 140.
- Predictive back is on by default on Android 16 and is mapped to "return to Vyomaphala" through `@capacitor/app`'s `backButton` listener. Only if TESTING V-21 fails, add `android:enableOnBackInvokedCallback="false"` to `<application>` as the documented temporary opt-out.
- Orientation is `portrait` in the manifest; the Rooftop route calls `ScreenOrientation`-style unlock at runtime (or simply omits the lock, on screens ≥ 600 dp Android 16 ignores it anyway).

Then run `npx cap sync android` once locally (pure file I/O, no Java involved) and commit the result.

### 7.4 One-time: keystore (Git Bash, outside the repo)

```bash
cd ~/Desktop
bash /c/Work/Personal_Projects/_shared/scripts/make-keystore.sh jyoti
# -> jyoti-release.p12 (BACK IT UP), jyoti-release.p12.b64 (paste into a secret)
```

The script asks for a ≥ 12-character passphrase, runs `openssl req` + `openssl pkcs12 -export` (alias `release`, key password = store password, a PKCS12 rule), base64-encodes with `-w0`, and deletes the PEMs. **Do this exactly once for the life of the app.** A different key later means the phone refuses to update and the only way through is uninstall-and-lose-everything.

### 7.5 One-time: the four repository secrets

| Secret | Value |
|---|---|
| `ANDROID_KEYSTORE_BASE64` | the single-line contents of `jyoti-release.p12.b64` |
| `ANDROID_KEYSTORE_PASSWORD` | the passphrase |
| `ANDROID_KEY_ALIAS` | `release` |
| `ANDROID_KEY_PASSWORD` | the passphrase (PKCS12: must equal the store password) |

```powershell
gh secret set ANDROID_KEYSTORE_BASE64 --body (Get-Content "$HOME\Desktop\jyoti-release.p12.b64" -Raw).Trim()
gh secret set ANDROID_KEYSTORE_PASSWORD
gh secret set ANDROID_KEY_ALIAS --body release
gh secret set ANDROID_KEY_PASSWORD
```

Then delete `jyoti-release.p12.b64` from the Desktop and move `jyoti-release.p12` to the backup locations in §12.1.

### 7.6 One-time: the workflow

```powershell
Copy-Item ..\_shared\templates\android-release.yml .github\workflows\android-release.yml
```

The template needs no edits: `ubuntu-24.04` (SDK preinstalled), `setup-node@v7` (22), `setup-java@v6` Temurin **21** with the Gradle cache (Capacitor 8 targets Java 21; the runner default is 17, this is the single most common APK-build failure), web build with `VITE_BASE_PATH=/` and `VITE_PLATFORM=android` (so no service worker lands in the WebView), `npx cap sync android`, keystore decoded to `$RUNNER_TEMP/release.p12`, `./gradlew --no-daemon :app:assembleRelease -PversionCode=$GITHUB_RUN_NUMBER -PversionName=<tag minus v>`, then `app-release.apk` → `out/jyoti-<version>.apk` (the copy fails loudly if only `app-release-unsigned.apk` exists), `SHA256SUMS.txt`, a 14-day artifact, and, only on a `v*` tag, a GitHub Release via `softprops/action-gh-release@v3`.

Two Vyomaphala-specific additions after the "Collect output" step:

```yaml
      - name: APK size budget (40 MB - model + CV wasm + fonts + gazetteer)
        run: |
          size=$(stat -c %s out/*.apk); echo "APK bytes: $size"
          test "$size" -le 41943040

      - name: The APK must contain the hand model and must NOT contain a service worker
        run: |
          unzip -l android/app/build/outputs/apk/release/app-release.apk > /tmp/apk.txt
          grep -q "assets/public/models/hand_landmarker.task" /tmp/apk.txt
          ! grep -q "assets/public/sw.js" /tmp/apk.txt
```

**First run before any tag:** Actions → *android-release* → *Run workflow* (manual, from `main`). ~6-9 minutes cold, ~4 warm. Download the `apk-0.0.<run>` artifact, unzip, sideload, and work through TESTING §12. If Gradle fails, read the first `error:` line, the usual culprits are a `namespace` that does not match the Java package folder, a missing drawable referenced from `styles.xml`, or CRLF in `gradlew` (prevented by `.gitattributes`).

### 7.7 First tagged release → sideload

```powershell
npm version 0.1.0 --no-git-tag-version      # package.json -> colophon "Vyomaphala 0.1.0"
git add package.json package-lock.json; git commit -m "Release 0.1.0"; git push
git tag v0.1.0; git push origin v0.1.0
gh run watch
gh release view v0.1.0 --web
```

On the phone: open the Release page in Chrome → tap `jyoti-0.1.0.apk` → *Open* → allow Chrome to install unknown apps (asked once) → *Install*. If the file arrived by any other route, check its SHA-256 against `SHA256SUMS.txt` first. Updates install over the top as long as the keystore is unchanged and `versionCode` increased (`github.run_number` guarantees that).

Register the free **limited-distribution developer account** (no government ID, ≤ 20 devices) when it opens in the owner's region (TESTING V-23), so the 2027 verification rollout does not add a 24-hour wait to every new phone. `adb install` stays exempt regardless.

### 7.8 Debug builds

Need DevTools on the phone (almost certainly, for V-10/V-12/V-14)? Commit `webContentsDebuggingEnabled: true` on a `debug/*` branch, run `workflow_dispatch` from that branch, install the artifact APK, connect USB, and open `chrome://inspect#devices` in desktop Chrome, no `adb install` needed. **Never tag from that branch**; TESTING X-1 checks the released build is not inspectable.

### 7.9 What is *not* in the pipeline

No AAB, no Play Store upload, no Firebase, no crash reporting, no TWA. The `google-services` try/catch stays in `build.gradle` untouched but no `google-services.json` is ever added. If a future phase wants the daily-panchang notification (GOAL §7 Someday), it adds `@capacitor/local-notifications` plus `POST_NOTIFICATIONS` and, if exact timing is wanted, `SCHEDULE_EXACT_ALARM` with the onboarding flow described in DECISIONS D3, and TESTING §12 grows a notifications block.

---

## 8. The AGPL "precision mode" lane, a licence change, not a feature flag

RESEARCH §8 risk 1 and DECISIONS D5.1: importing any Swiss Ephemeris WASM build (`@kuntay/swisseph`, `@swisseph/browser`, `swisseph-wasm`, `sweph-wasm`) makes the **whole application** AGPL-3.0, and publishing it on GitHub Pages is distribution. Vyomaphala ships MIT with `astronomy-engine`. Therefore:

- **The shipped build must contain no Swiss Ephemeris code.** `scripts/check-licences.mjs` fails if any of those package names appears in `package.json` (including devDependencies), and `scripts/check-bundle.mjs` greps `dist/**` for `swisseph`/`swe_`. Both run in `ci.yml` and in the release gate.
- **The oracles that generate golden fixtures run outside the repo** (TESTING §2.1): `swetest`/JHora/PyJHora live in `C:\Work\_oracles\`, which is not a git working tree. Only their **numbers** are committed. Numbers are facts.
- The Drawer's "Precision mode (AGPL lane)" row exists, is **disabled**, and its help text explains that turning it on requires: (1) replacing `LICENSE` with AGPL-3.0, (2) adding a visible "source code" link in the colophon that resolves to this repo, (3) re-running the licence checks with the allow-list changed, (4) a `MAJOR` version bump because the licence of every prior download changes meaning. TESTING E2E-34 asserts the row is disabled and that no Swiss module is loadable in this build.
- `@fusionstrings/swisseph-wasm` is banned outright regardless of the lane, its MIT claim is not credible for a derivative of an AGPL/commercial work (RESEARCH §4).

The same rule, one level down: **PyJHora is AGPL and GSAP is not OSI.** Neither may be a dependency. PyJHora's classical *tables* (nakshatra lords, yoni matrix, gana, nadi, koota maxima, varga rules) are re-typed as facts with a BPHS/Muhurta Chintamani citation, never copied as code (D5.2). Motion's `pathLength` covers everything DrawSVG would have done (DESIGN §3).

---

## 9. Release checklist (every `v*` tag)

1. `main` is green on `pages.yml` and `ci.yml`; the live Pages site is serving the commit you intend to ship (colophon version = `package.json`).
2. TESTING §13 gate is complete: unit, oracle, e2e, visual (VT-1…VT-8), a11y, **privacy (never waived)**, perf budgets.
3. TESTING §12 phone checklist run on a `workflow_dispatch` APK **of this exact commit**; results appended to `docs/VERIFICATION-LOG.md` with device model, Android version and WebView version.
4. `npm audit --audit-level=high` clean; `node scripts/check-licences.mjs` and `check-bundle.mjs` clean (§8).
5. `npx cap sync android` produces no diff, or the diff is committed.
6. `CHANGELOG.md` entry. If any **engine default or preset** changed (ayanamsa, node type, dasha year, sunrise convention, Bhava system), the entry says so in the first line and the release notes warn that existing charts will recompute, this is the one class of change that silently alters what the app told someone about their life.
7. README Attribution updated if a dependency, font, sound or dataset was added.
8. `npm version <x.y.z> --no-git-tag-version`, commit `Release x.y.z`, push, wait for Pages to deploy that commit.
9. `git tag vx.y.z && git push origin vx.y.z` → watch `android-release` → the Release page carries `jyoti-x.y.z.apk` + `SHA256SUMS.txt`; paste the CHANGELOG entry into the generated notes.
10. Install the Release APK over the previous version on the phone; confirm profiles and palm photos intact, version string updated, and one reference chart still identical to the arcsecond.
11. Export an encrypted backup from the phone (§12.2), a release is the natural backup moment.
12. If the PWA shell changed: §6 steps 1-4 on the live site.

---

## 10. Versioning

- **Git tags** `vMAJOR.MINOR.PATCH`. MINOR for a new screen or feature; PATCH for fixes; **MAJOR** for an incompatible export format, a licence change (§8), or a change to a shipped engine default that moves existing charts.
- **`package.json` version** = tag without `v`; injected as `__APP_VERSION__` into the colophon and the export envelope header (`{"app":"chowki","version":"0.4.2","schema":2,"engine":"astronomy-engine@2.1.19","preset":"SE-true"}`).
- **Android `versionName`** = tag without `v`; **`versionCode`** = `github.run_number` of the `android-release` workflow, strictly increasing across tags and manual runs, never hand-edited. A re-run consumes a number; harmless.
- **Dexie schema version** is independent and only increases; every bump ships an upgrade function and a migration test (TESTING DB-3). Exports carry `schema`, so importing a newer file into an older build refuses with a lac note instead of corrupting data.
- **Preset hash.** Every cached chart is keyed by `profileId + hash(engineSettings)`. Bumping the engine in a way that changes numbers must also bump an `ENGINE_EPOCH` constant that feeds that hash, so stale charts are recomputed rather than shown with new labels and old numbers.
- **Web deploys are not versioned separately**, every push to `main` deploys; the tag records which commit the APK came from.

---

## 11. Rollback

| What broke | Action |
|---|---|
| Pages is serving a bad build | `git revert <sha>` on `main` and push, Pages redeploys in ~2 min. Faster: Actions → *Deploy to GitHub Pages* → last good run → *Re-run all jobs*. The `registerType: "prompt"` service worker means open tabs keep the old version until the user chooses to reload, so nobody is forced onto the broken build mid-cast. |
| Bad APK on a Release | Android cannot downgrade a `versionCode`. Fix forward: revert, tag `vx.y.(z+1)`, install over the top. Meanwhile edit the bad Release, mark it *pre-release*, delete the `.apk` asset, and add a note pointing at the previous tag. (Older APKs remain downloadable on their own Release pages but can only be installed after an uninstall, which destroys local data unless it was exported, say that in the note.) |
| An engine change moved everyone's charts | This is why `ENGINE_EPOCH` exists. Revert the engine change, bump `ENGINE_EPOCH` again so caches recompute back, and add a CHANGELOG line naming the affected preset. Never leave a build in which some cached charts used the old maths and some the new. |
| A preset default changed by accident | The colophon on every screenshot names the preset, so the blast radius is visible. Restore the default, and add the missing case to TESTING AY-6/AY-7. |
| Bad Dexie migration | Migrations are additive and never drop a table. Recovery path is *Import* of the encrypted backup made at §9 step 11 into the fixed version; say so in the release notes. |
| Signing secrets wrong (build produced `app-release-unsigned.apk`) | Re-run `gh secret set` for the four values from the password manager; no code change; re-run the workflow (a new `versionCode` is fine). |
| Pages deploy stuck | Settings → Environments → `github-pages` → remove any accidental required reviewers. `concurrency: pages` guarantees there is no half-deployed state. |
| Model or CV chunk 404s after a deploy | Almost always `import.meta.env.BASE_URL` missing on that one URL (§2.1). Check with `curl -I …/jyoti/models/hand_landmarker.task`; TESTING V-11 is the standing check. |

---

## 12. Backups

### 12.1 Signing keystore (irreplaceable)

Store `jyoti-release.p12` **and** its passphrase in three places: (1) the password manager, with the file attached and a note that the alias is `release` and the key password equals the store password; (2) an encrypted offline copy on a USB/external disk; (3) the GitHub secret, which is a *copy*, not a source, because GitHub never shows it back. Never regenerate, never commit, never email. Verify the backup once, in Git Bash:

```bash
openssl pkcs12 -in jyoti-release.p12 -info -noout      # prompts for the passphrase, prints the cert
openssl pkcs12 -in jyoti-release.p12 -nokeys | openssl x509 -fingerprint -sha256 -noout
```

Record that SHA-256 fingerprint in the password manager too; it is how you confirm a future APK was signed with the same key.

### 12.2 User data, birth records and palm photographs

This is the most sensitive data in the whole portfolio: other people's birth details and their hands.

- Everything lives in the device's IndexedDB. On the web it can be evicted by the browser; on Android, *Clear data* wipes it. There is no cloud copy by design (GOAL §6, D5.5).
- Manual backup: Drawer → **Export (wax envelope)** → a passphrase-encrypted `.chowki` file (AES-GCM; TESTING CR-1…CR-3 prove the round-trip is byte-identical and the envelope carries no plaintext). Do this after every release and whenever a new leaf is added.
- Store the `.chowki` file the way you would store the keystore: password manager or an encrypted disk. **Never** put it in the repo, in a Gist, or in an unencrypted cloud folder, and never share it with the person it describes without also sharing the passphrase through a different channel.
- The passphrase is not recoverable. Losing it loses the backup; there is deliberately no escrow.
- "Burn" is immediate and total (profile + cached charts + palm Blobs, one transaction). If a friend asks to be removed, that is the button, and the backup files must be re-exported afterwards or deleted.
- Palm photographs are biometrics. They never leave the device except inside an encrypted export, and they are never committed to git, `scripts/check-no-biometrics.mjs` (TESTING P-0) is the mechanical guard.

### 12.3 Repository and fixtures

Public GitHub is the primary copy; `git clone --mirror` to the offline disk quarterly. The golden fixtures (`golden-charts.json`, `panchang-drik.json`, `ashtakoota-11664.json.gz`) are in the repo and are the expensive part to regenerate, they are hand-read or oracle-generated once. The oracle screenshots in `docs/oracles/` are git-ignored (third-party pages); back them up alongside the keystore so a disputed number can be re-checked without re-reading the website. Actions artifacts expire in 14 days and nothing depends on them.

---

## 13. Troubleshooting quick reference

| Symptom | Cause → fix |
|---|---|
| Pages shows a blank page; console `Failed to load module script … /assets/index-*.js 404` | `VITE_BASE_PATH` not applied → check the build step's `env` in `pages.yml` and that `vite.config.ts` reads `process.env.VITE_BASE_PATH`. |
| PWA not installable on Pages | `start_url`/`scope` are not `/jyoti/` → DevTools → Manifest; the `base` variable must feed the manifest (§2.1). |
| Hast screen shows a spinner forever, console is silent | CSP is missing `'wasm-unsafe-eval'` or `worker-src blob:` (§2.3), WASM compilation is blocked with no useful error. |
| `hand_landmarker.task` 404 on Pages but fine locally | The URL was written as `/models/…` instead of `` `${import.meta.env.BASE_URL}models/…` `` (§2.1, V-11). |
| OpenCV chunk downloads on the home screen | It leaked into the eager graph, check `manualChunks` and that the import is inside a `React.lazy`/dynamic `import()` on the Hast route only (TESTING §8 "lazy chunks are lazy"). |
| Build error `Could not resolve "fs"` | Something imported `@ishubhamx/panchangam-js` from app code. It is a **devDependency, Node tests only** (§2.1, TESTING §2.3). Move the import into `src/engine/__oracle__/`. |
| Chart degrees differ from drikpanchang.com by 20-40″ | Not a bug. Drik uses a nutation-free Lahiri ≈ 24.3″ above SE-mean (RESEARCH §5.4). Switch the Drawer preset to `Lahiri (Drik-compatible)`, the colophon will say so. |
| Chart degrees differ from JHora by ~1° on Rāhu/Ketu | Node type: mean vs true (RESEARCH §5.3, V-3). The colophon names which was used. |
| A 1943 Calcutta birth is off by an hour | The runtime's tzdb is stale, TESTING's tzdb guard should have caught it. Update Node locally / the runner image; on Android check the WebView/system tz data. |
| A 1900 Madras birth is off by ~9 minutes | Something used `offsetMinutes` (321.1666…) instead of the UTC instant (§TESTING T-3). |
| A pre-1955 Bombay birth is off by 39 minutes | Bombay Time (+04:51) is not in tzdb, use the override drum (TZ-8) and check the colophon reads `+04:51 (manual)`. |
| `npx cap sync android` complains it cannot find the Android SDK | It should not need one; the message comes from the optional Gradle step. Safe to ignore if `android/app/src/main/assets/public/` was updated. |
| Workflow: `Execution failed for task ':app:validateSigningRelease'` | One of the four secrets is missing or empty; `ANDROID_KEY_PASSWORD` must equal `ANDROID_KEYSTORE_PASSWORD` (PKCS12). |
| Workflow: `error: invalid source release: 21` / Gradle uses JDK 17 | `setup-java@v6` step missing or set to 17. Capacitor 8 needs Temurin **21**; the runner default is 17 (D3). |
| Phone: "App not installed" on update | Different keystore or a lower `versionCode` → confirm the tag was built by this repo's workflow with the same secrets. Uninstalling is the last resort and destroys local data unless exported first. |
| APK build fails on the size budget | Something large got precached or bundled eagerly, check the `unzip -l` output in the workflow log before raising the limit. |
| Camera works in Chrome but not in the APK | `CAMERA` missing from the manifest (needed for `getUserMedia`, §7.3), or the user granted "Select photos" only, TESTING C-4 / V-20. |
| Rooftop dome is black on the phone | WebGL context lost or unavailable in that WebView → the painted-sky fallback should have engaged; if it did not, that is a bug in the `webglcontextlost` handler (TESTING E2E-28, V-14). |
| Back gesture minimises the app instead of closing a sheet | Predictive back not wired to `@capacitor/app` `backButton` → V-21; temporary opt-out is `android:enableOnBackInvokedCallback="false"`. |
| Devanagari conjuncts render as boxes or split matras | The `pyftsubset` subset dropped required glyphs/features → rebuild with the full Devanagari block and the `akhn`/`rphf`/`blwf`/`half`/`pres` features retained (V-22). |
