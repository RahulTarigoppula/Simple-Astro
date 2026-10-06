# Chowki

*Your Janam Patri, written in ink under one lamp.*

**Codename:** Jyoti (project 02 of 8) · **Repo:** `jyoti` · **App / brand:** Chowki (चौकी)
**Status: Planned — not started.** GOAL, RESEARCH, DESIGN, ARCHITECTURE, PLAN, TESTING, DEPLOYMENT and IMPLEMENTATION-PROMPT are all complete (2026-09-08), and `design/preview.html` is committed as the visual baseline; **no application code yet**.

## Summary

- A private, offline Jyotisha desk: write a "leaf" (name, birth date, time, place) and it casts a full Janam Patri — nine grahas in sidereal longitude, Lagna, Rāśi (D1) and Navāṁśa (D9) drawn in ink, nakshatra/pada, the Vimshottari dasha tree, birth panchang, and yogas cited to BPHS chapter and verse.
- Every number shows its work: ayanamsa preset (SE-true / SE-mean / Drik-compatible), resolved IANA zone and historical UTC offset, Julian Day, and a vermilion asterisk whenever a body sits within 2′ of a sign, pada or tithi boundary.
- Lay two leaves side by side and Guna Milan counts out on a real 36-bead mala; photograph a palm and MediaPipe finds 21 landmarks, OpenCV rectifies the print and traces heart/head/life lines, with a stylus fallback when the camera is unsure.
- Vite 8 + React 19 + TypeScript, Tailwind v4 tokens, Motion 13, Dexie 4, Zustand 5; the same `dist/` ships as an installable PWA on GitHub Pages and as a Capacitor 8 Android APK built and signed by GitHub Actions.
- Free, offline, no accounts, no analytics, no LLM in the core path; birth data and palm photos never leave the device unless the owner exports an AES-GCM-encrypted envelope.

## Documents

| File | What |
|---|---|
| [docs/IMPLEMENTATION-PROMPT.md](docs/IMPLEMENTATION-PROMPT.md) | **Start here** — the self-contained build prompt; where it disagrees with any other doc, it wins |
| [GOAL.md](GOAL.md) | Goal statement, vibe, success criteria, non-goals, MVP ✅ / v1 🚀 / Someday 🔮 split |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Verified library/API/ephemeris research with the adversarial verification log |
| [docs/DESIGN.md](docs/DESIGN.md) | "Chowki" design system: tokens, type, motion, signature interactions, every screen |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, data model, the engine and palm algorithms with worked examples, offline/Android, budgets |
| [docs/PLAN.md](docs/PLAN.md) | Phased build plan with checkboxes, definitions of done, the Weekend MVP path |
| [docs/TESTING.md](docs/TESTING.md) | Test map, golden-chart matrix, day-1 verification list, manual Android checklist |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Repo creation, Pages + APK pipelines, secrets, sideload, rollback, backups |
| [design/preview.html](design/preview.html) | The visual contract — five screens with a live embedded ephemeris; if the app looks worse than this, it is not done |
| [../\_shared/DECISIONS.md](../_shared/DECISIONS.md) | Cross-project binding decisions (this project is row 02 of §D8) |

## Quickstart (from zero, Windows 11, Node 22, Git Bash)

The project folder itself becomes the repo, so `docs/` and `design/` stay with the code (`_shared/DECISIONS.md` §D6).

```bash
cd /c/Work/Personal_Projects/02-jyoti-astrology-palmistry

# 1. Scaffold (choose "Ignore files and continue" when Vite notices docs/ already exists)
npm create vite@latest . -- --template react-ts
npm install

# 2. Runtime dependencies — app shell, storage, motion.
#    Every version is pinned to IMPLEMENTATION-PROMPT §2.1; an unpinned tree is not the spec.
npm i vite@8.2.2 react@19.2.8 react-dom@19.2.8
npm i tailwindcss@4.3.3 @tailwindcss/vite@4.3.3 motion@13.2.0 zustand@5.0.15 react-router@7 \
      dexie@4.4.5 dexie-react-hooks@4.4.0 dexie-export-import@4.4.0 lucide-react@1.41.0

# 3. The engine's dependencies (MIT lane — no Swiss Ephemeris, no AGPL)
npm i astronomy-engine@2.1.19 luxon@3.7.2 @photostructure/tz-lookup@11.6.1 minisearch@7.2.0
npm i -D @types/luxon
npm i -D @ishubhamx/panchangam-js@3.0.0   # devDependency ONLY — Node-side oracle for tests.
#   It is CJS and `require`s fs; check-bundle.mjs (TESTING §2.3) FAILS the build if it reaches dist/.
#   Import it only from src/engine/__oracle__/ under Vitest's node environment.

# 4. Palm + sky (all lazy-loaded chunks, never in the initial bundle)
npm i @mediapipe/tasks-vision@1.0.1 @techstark/opencv-js@4.12.0-release.1
npm i three@0.185.1 @react-three/fiber@9.7.0 @react-three/drei@10.7.8 d3-geo@3
npm i -D @types/three @types/d3-geo

# 5. Sound + fonts (self-hosted, OFL, subset in Phase 3)
npm i howler@2.2 @fontsource/yatra-one@5.3 @fontsource/tiro-devanagari-hindi@5.3 @fontsource-variable/martian-mono@5.3
npm i -D @types/howler

# 6. Capacitor 8 core + the plugins Chowki uses (all MIT)
npm i @capacitor/core@8.5.1 @capacitor/android@8.5.1 @capacitor/app@8.1.1 @capacitor/camera@8.2.4 \
      @capacitor/filesystem@8.1.3 @capacitor/haptics@8.0.2 @capacitor/preferences@8.0.1 \
      @capacitor/share@8.0.1 @capacitor/status-bar@8.0.3 @capacitor/splash-screen@8.0.2
npm i -D @capacitor/cli@8.5.1

# 7. Tooling
npm i -D vite-plugin-pwa@1.3.0 @vite-pwa/assets-generator@1.0.2 vitest@3 @testing-library/react \
         @testing-library/jest-dom jsdom fake-indexeddb @playwright/test @axe-core/playwright @biomejs/biome
npx biome init
npx playwright install chromium
npm ls --depth=0        # sanity: the installed tree must match IMPLEMENTATION-PROMPT §2.1

# 8. Accessible primitives (shadcn/ui on Base UI, MIT) — restyled through tokens, never forked
npx shadcn@latest init
npx shadcn@latest add dialog radio-group switch tabs

# 9. Self-host the offline models and MediaPipe wasm (no CDN at runtime)
mkdir -p public/models public/mediapipe
cp node_modules/@mediapipe/tasks-vision/wasm/* public/mediapipe/
# Pin the immutable version, NOT the "latest" alias — the alias moves and would silently
# break both the byte assertion below and the offline precache budget (DEPLOYMENT §2.2).
curl -L -o public/models/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task
stat -c%s public/models/hand_landmarker.task    # must print 7819105
sha256sum public/models/hand_landmarker.task    # record the digest in src/data/attribution.json
# 7,819,105 bytes, Apache-2.0 (model card). Committed once; never fetched at runtime.

# 10. Android shell (writes files only; no Java needed locally). appId must never change after first install.
npx cap init Chowki com.rahul.jyoti --web-dir dist
npx cap add android
printf 'android/gradlew text eol=lf\n*.sh text eol=lf\n' >> .gitattributes

# 11. Shared CI templates and the signing block
mkdir -p .github/workflows
cp ../_shared/templates/pages.yml            .github/workflows/pages.yml
cp ../_shared/templates/android-release.yml  .github/workflows/android-release.yml
# Merge ../_shared/templates/app-build.gradle.snippet into android/app/build.gradle
# (namespace + applicationId = com.rahul.jyoti).

# 12. Signing key (run OUTSIDE the repo; back up the .p12 + passphrase)
(cd /c/Work && bash /c/Work/Personal_Projects/_shared/scripts/make-keystore.sh jyoti)

# 13. Repo, secrets, Pages
git init -b main && git add -A && git commit -m "Scaffold Chowki"
gh repo create jyoti --public --source=. --push
gh secret set ANDROID_KEYSTORE_BASE64  < /c/Work/jyoti-release.p12.b64
gh secret set ANDROID_KEYSTORE_PASSWORD   # paste passphrase
gh secret set ANDROID_KEY_ALIAS  --body release
gh secret set ANDROID_KEY_PASSWORD        # same passphrase (PKCS12)
# GitHub -> repo Settings -> Pages -> Source: "GitHub Actions". Push to main = live site.
# git tag v0.1.0 && git push origin v0.1.0  = signed APK on the Releases page.
```

Three things `vite.config.ts` must do (details in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) §7–§8):

1. `base: process.env.VITE_BASE_PATH ?? "/"` — Pages builds with `/jyoti/`, the APK with `/`.
2. Stub Node built-ins for `@techstark/opencv-js`: `resolve.alias` maps `fs`, `path` and `crypto` to an empty shim so the OpenCV glue bundles cleanly (RESEARCH §4, verification item 7). **`@ishubhamx/panchangam-js` is deliberately not covered by that shim** — it is a devDependency, imported only from `src/engine/__oracle__/` under Vitest's node environment, and `scripts/check-bundle.mjs` (TESTING §2.3) fails the build if it ever appears in `dist/`.
3. `VitePWA({ registerType: "prompt" })` with the shell, fonts, grain, sounds and gazetteer precached and the models/OpenCV/sky chunks on a runtime `CacheFirst` route; register the service worker only when `!Capacitor.isNativePlatform()`.

Routing is `createHashRouter` (D1) so `https://<owner>.github.io/jyoti/#/patri/<id>` deep-links without a server rewrite.

## Attribution

Chowki's own code is MIT. The classical tables (nakshatra lords, yoni animals, gana, nadi, varna, koota matrices, varga rules, yoga definitions) are **facts re-typed from Brihat Parashara Hora Shastra and Muhurta Chintamani**, not code copied from any implementation; PyJHora (AGPL-3.0) and Drik Panchang are consulted as validation oracles only and are never dependencies.

| Asset / library | Licence | Notes |
|---|---|---|
| `astronomy-engine` (Don Cross) | MIT | Tropical apparent longitudes, sidereal time, rise/set, Moon-phase search — the whole ephemeris lane |
| `@ishubhamx/panchangam-js` | MIT | Node-side panchang/dasha cross-check oracle — **devDependency only**, never in the browser bundle |
| `luxon` | MIT | Zoned birth times; historical offsets come from the browser's IANA tzdb |
| `@photostructure/tz-lookup` (Matt McEachen) | CC0-1.0 | lat/lon → IANA zone, 88 kB, bundled |
| `minisearch` | MIT | Fuzzy search over the bundled gazetteer |
| GeoNames `cities500` subset (India + neighbours full, world ≥ 15k) | CC BY 4.0 | Offline birthplace search — credited in the Colophon and in `src/data/attribution.json` |
| Yale Bright Star Catalog (BSC5), NASA/HEASARC | Public domain (US Government) | ~9,100 stars for the Rooftop dome; HYG (CC BY-SA) deliberately avoided |
| MediaPipe `hand_landmarker.task` (Google) | Apache-2.0 (model card, Oct 2021) | 21 hand landmarks, self-hosted in `public/models` |
| `@mediapipe/tasks-vision` + its `wasm/` folder | Apache-2.0 | Self-hosted for offline use |
| `@techstark/opencv-js` 4.12.0-release.1 | Apache-2.0 | CLAHE, black-hat, Hessian, warpPerspective — lazy-loaded on the Hast screen only |
| Yatra One (Catharsis Fonts) via `@fontsource/yatra-one` | SIL OFL 1.1 | Display: screen titles, the name on the seal |
| Tiro Devanagari Hindi (Tiro Typeworks) via `@fontsource/tiro-devanagari-hindi` | SIL OFL 1.1 | Body: readings, ledger, leaf lines |
| Martian Mono (Evil Martians) via `@fontsource-variable/martian-mono` | SIL OFL 1.1 | Engraved brass labels, degrees, end-times |
| `dexie`, `dexie-react-hooks`, `dexie-export-import` | Apache-2.0 | IndexedDB profiles, palm Blobs, backup envelope |
| `three`, `@react-three/fiber`, `@react-three/drei`, `d3-geo` | MIT | Rooftop dome, parapet sky strip, painted-sky fallback |
| `motion` | MIT | Ink draw (`pathLength`), springs, drag; **GSAP is not used** (non-OSI, and Motion covers the draw) |
| `howler` + CC0 sound sprite (freesound.org CC0 filter, Kenney.nl) | MIT + CC0-1.0 | Per-file credits in `public/sounds/ATTRIBUTION.md` |
| `lucide-react` | ISC | 16 px icons inside paper content only (DESIGN §11) |
| React 19, Vite 8, React Router 7, Zustand, Tailwind CSS v4, vite-plugin-pwa (Workbox), Biome, Vitest, Playwright | MIT | Framework, build, tooling |
| Capacitor 8 and `@capacitor/*` plugins | MIT | Android shell, camera, haptics, filesystem, share, status bar, splash |
| shadcn/ui components on Base UI | MIT | Dialog → Drawer/FootnoteSheet, RadioGroup, Switch, Tabs — restyled with tokens |
| Planet/nakshatra marks, desk objects, grain, seal edges, adaptive icon, poster template | Original artwork (CC0 within this repo) | Drawn on a 24-unit grid; no commercial glyph fonts |
| Swiss Ephemeris WASM (`@kuntay/swisseph`) | AGPL-3.0 | **Not a dependency.** Optional "precision mode" lane only; enabling it requires relicensing the repo (DECISIONS §D5.1) |

Runtime services (optional, user-initiated, no key, no account):

| Service | Terms | Use |
|---|---|---|
| Open-Meteo Geocoding API | Data CC BY 4.0; free tier non-commercial; ≤ 600/min, 5,000/h, 10,000/day | Only when the owner taps "search online" for a place missing from the bundle |
| Nominatim (OpenStreetMap) | ODbL data; ≤ 1 req/s, identifying User-Agent/Referer, **no autocomplete**, attribution required | Second fallback, on submit only, never per keystroke |

No other network request exists. No analytics, no telemetry, no accounts, no crash reporting.
