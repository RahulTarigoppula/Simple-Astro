# Chowki (Jyoti), THE Implementation Prompt

**Read this file top to bottom before you write a line of code. It is self-contained.** Everything you need, stack, versions, design tokens, screens, data model, engine algorithms with worked examples and golden numbers, platform integration, build order, tests, CI YAML, and the definition of done, is inlined here. You do not need `GOAL.md`, `DESIGN.md`, `ARCHITECTURE.md`, `PLAN.md`, `TESTING.md`, `DEPLOYMENT.md` or `RESEARCH.md`. If you have them and they disagree with this file, **this file wins** (the reconciliations below say why).

Written 2026-09-08. Target: one developer (or one coding agent) on Windows 11 with Node 22.17, git, Python 3.14, Git Bash, the GitHub CLI. **No Java, no Android SDK, no Android Studio, no Flutter locally**, every APK is built and signed by GitHub Actions.

---

## 0. Reconciliations already applied (do not "fix" these back)

These four decisions resolve contradictions that exist between the planning documents. They are settled. Apply them everywhere, including in any mock, wireframe, screenshot baseline or preview file you produce.

1. **The worked example is one recomputed table, §0.1a below.** For the running example, **Rahul · 14 March 1994 · 07:25 IST · Bengaluru (12.9716 °N, 77.5946 °E)**, preset `se-true` / true node / 365.25-day years / upper-limb sunrise, the correct values are:
   - `utcMs` = `1994-03-14T01:55:00Z`
   - **`jdUt` = 2449425.579861** (displayed as `JD 2449425.5799`, four decimals ≈ 8.6 s, **rounded**, `jd.toFixed(4)`, not truncated to `…5798`)
   - **Lagna = Meena (Pisces) 15°39′25″** (sidereal 345.6570°), nakshatra Uttara Bhādrapadā pada 4.
   - **Moon = Mīna 19°10′08″** (sidereal 349.1688°), **Revatī pada 1, lord Budha**.
   - **Sun = Kumbha 29°28′52″** (sidereal 329.4811°), Pūrva Bhādrapadā pada 3, lord Guru, **no boundary asterisk** (31′08″ from the cusp).
   The values `JD 2449425.5697` and `LAGNA ♏ VṚŚCIKA` that appear in some older mocks are **errors** (`…5697` corresponds to 07:10 IST, a 15-minute slip ≈ 3¾° of Lagna). So are `Moon 218.4732° / Anurādhā 2 / Vṛścika 8°28′` (that Moon is 130.7° away from where the Moon actually was: the new moon was 1994-03-12, so Śukla Dvitīyā puts the Moon within ~20° of the Sun), `Sun 329.8533° / Kumbha 29°51′12″` (22′ out), `Lagna 345.6621° / 15°39′44″` (18″ out, an arithmetic slip from the correct RAMC 277.8081° and ε 23.438851°), and the Guna totals `27 / 36` and `29.5 / 36`. Never render any of them anywhere.
2. **`docs/TESTING.md` and `docs/DEPLOYMENT.md` exist and are complete.** Any note in a README or plan saying "written in Phase 5" is stale. This prompt inlines everything from both that you need; you are not blocked on either.
3. **Names are fixed:** Android/PWA app id **`com.rahul.jyoti`**, display name **Chowki**, GitHub repository **`jyoti`**, web URL `https://<owner>.github.io/jyoti/`. The app id is immutable after the first install, changing it makes a second, empty app on the phone. Some older drafts used the brand name in the app id instead; ignore them, DEPLOYMENT §0 carries the same row.
4. **The MIT ephemeris lane is the default and the only lane you build.** `astronomy-engine` (MIT) is the ephemeris. **Swiss Ephemeris stays out of `package.json`** entirely, including devDependencies. PyJHora and `swetest` are *offline validation oracles only*: run them outside the repo and commit their numbers, never their code. The Drawer's "Precision mode (AGPL lane)" row exists, is **disabled**, and explains that enabling it would relicense the whole repository to AGPL-3.0.
5. **`design/preview.html` exists** (≈ 135 kB, five screens, a working embedded ephemeris) and already renders the §0.1a values, it computes them rather than hard-coding them. It **is** the visual baseline: do not regenerate it and do not rewrite its screens. §3 of this file is the same contract in prose. The only work left on it is keeping it in step when §3/§4 change.

### 0.1a The reference chart, recomputed 2026-09-08, the single source for every golden

Method: Meeus ch.25 for the Sun (apparent λ), ch.47 for the Moon (full 60-term ΣL + A1/A2/A3), ch.22 nutation, ch.12 GMST + the equation of the equinoxes, Standish/JPL mean elements + Kepler for the five star-planets, mean node for Rāhu/Ketu; positions in **TT** (ΔT = 60.13 s, Espenak-Meeus), sidereal time in **UT**. `design/preview.html`'s embedded engine is the same code and reproduces every row below to the arcsecond, which is the point: no number here was typed by hand.

- `jdUt` **2449425.579861** → display **`JD 2449425.5799`** · `jdTt` 2449425.580557
- Lahiri **SE-true** ayanāṃśa **23.780152° = 23°46′48.5″** at `T = −0.05802654` (the `drik-mean` preset reads 23.782744° = 23°46′57.9″, +9.3″; `se-mean` 23.775998° = 23°46′33.6″), §6.2's preset table, unchanged
- Δψ +14.9549″ · Δε −4.2998″ · true ε **23.438851°** · GMST 200.2097° · GAST 200.2135° · **RAMC 277.8081°** · MC **Dhanu 13°23′27″** (253.3907°)

| graha | λ_sid | rāśi + degree | nakshatra · pada | lord | house | ℞ | D9 |
|---|---|---|---|---|---|---|---|
| **Lagna** | 345.6570° | **Mīna 15°39′25″** | U.Bhādrapadā · 4 | Śani | 1 | | Vṛścika |
| Sūrya | 329.4811° | Kumbha 29°28′52″ | P.Bhādrapadā · 3 | Guru | 12 | | Mithuna |
| Candra | 349.1688° | Mīna 19°10′08″ | **Revatī · 1** | **Budha** | 1 | | Dhanu |
| Maṅgala | 311.5233° | Kumbha 11°31′24″ | Śatabhiṣā · 2 | Rāhu | 12 | | Makara |
| Budha | 302.4901° | Kumbha 2°29′24″ | Dhaniṣṭhā · 3 | Maṅgala | 12 | | Tulā |
| Guru | 200.6030° | Tulā 20°36′11″ | Viśākhā · 1 | Guru | 8 | ℞ | Meṣa |
| Śukra | 343.1253° | Mīna 13°07′31″ | U.Bhādrapadā · 3 | Śani | 1 | | Tulā |
| Śani | 311.5169° | Kumbha 11°31′01″ | Śatabhiṣā · 2 | Rāhu | 12 | | Makara |
| Rāhu | 213.4956° | Vṛścika 3°29′44″ | Anurādhā · 1 | Śani | 9 | ℞ | Siṃha |
| Ketu | 33.4956° | Vṛṣabha 3°29′44″ | Kṛttikā · 3 | Sūrya | 3 | ℞ | Kumbha |

**No graha is within 2′ of a sign, nakshatra or pada edge**, so the reference Patri renders **no vermilion asterisk at all**; the nearest approach is Rāhu, 10′ inside Anurādhā. Maṅgala and Śani stand **23″ apart** in Śatabhiṣā, a genuine Graha Yuddha, and the reason this birth moment is worth shipping as the demo.

**Birth panchāṅga:** tithi **Śukla Dvitīyā** (#2; elongation 19.6877°) · vāra **Somavāra** · nakshatra **Revatī pada 1** · yoga **Śukla** (#24) · karaṇa **Kaulava** (half-tithi 4) · Moon 2.9 % lit.

**Viṃśottarī:** Moon's lord **Budha**, `f` = 0.187659, balance **13.809790 yr = 5044.03 d**; **Budha mahādaśā 1994-03-14 → 2008-01-04 ≈ 08:02 IST**, then Ketu, Śukra, Sūrya, Candra, Maṅgala, Rāhu, Guru, Śani (nominal MD start 1991-01-04). Antardaśā at birth **Ketu** (1993-06-01 → 1994-05-29 ≈ 22:26 IST); pratyantardaśā **Śani** (1994-02-10 → 1994-04-08). The ribbon opens **Budha - Ketu - Śani**.

**Aṣṭakūṭa vs the showcase partner Priya (Moon in Rohiṇī, Vṛṣabha):** `1 / 2 / 1.5 / 2 / 0.5 / 6 / 7 / 0` = **20 / 36, "acceptable"**. Bhakūṭa is **7/7, not a doṣa** (Mīna ↔ Vṛṣabha is a 3/11 axis), so those beads are brass; the single lac row is **Nāḍī** (both Moons are Antya). Full derivation in §6.11.

---

## 1. Role & mission

You are a principal front-end engineer with a taste for instruments, not dashboards. You are building **Chowki** (चौकी, the low teak desk a Jyotishi works at), a private, offline Vedic-astrology and palmistry desk for one owner and a close circle of ten to twenty family and friends.

**The product, in one paragraph.** Chowki is an offline, on-device Jyotisha instrument. You write a "leaf" (name, birth date, time, place) and it casts a full Janam Patri: nine grahas in sidereal longitude to the arcsecond, the Lagna, the Rāśi (D1) and Navāṁśa (D9) charts drawn in ink, nakshatra and pada, the Vimshottari daśā tree, the panchang of the birth moment, and a list of classical yogas each cited to its source text. Lay two leaves side by side and it counts Guna Milan on a real 36-bead mala. Photograph a palm and it finds the hand's 21 landmarks, rectifies the print, traces the heart, head and life lines, and reads them by Samudrika Shastra, honestly, with confidence rendered as ink darkness and a stylus to trace by hand when the camera is unsure. Every number shows its work: ayanamsa preset, resolved IANA zone, historical UTC offset, Julian Day, rule citation. Nothing leaves the phone.

**The vibe: Weighted · Devout · Exact.** A low teak desk on a night rooftop, lit by one brass diya. Handmade paper owns 85-92 % of every screen; teak and indigo cloth are margins. Objects have mass and a material, paper, brass, thread, ink, and each material has its own spring. Ink is drawn, never faded; numerals set digit by digit; the diya flicker is the only ambient motion. The visual vocabulary is the real one (patri scrolls on rollers, palm-leaf bundles tied with mauli thread, kumkum, lac seals, a brass panchang dial), used with respect rather than as ornament.

**The quality bar.** If a screenshot of this app could be mistaken for a generic dashboard, a tarot app, a "stars on navy with gold serif" horoscope app, or a 2010 wood-textured skeuomorph, **start that screen over**. Two concrete, checkable versions of the bar:
- Crop any screenshot to a quarter and it must still be identifiable as Chowki (rollers, tilak, mala, brass drums, turmeric band).
- Paper (`--surface` + `--surface-2`) covers **85-92 %** of every frame; teak (`--bg`) covers **≤ 8 %**. This is an automated test (§10, VT-1), not an opinion.

**What makes it worth building.** Correctness is the delight: comparing the app's tithi, nakshatra and ayanamsa with Drik Panchang and JHora and seeing them agree is the payoff. It is a family object: casting a grandparent's 1943 Calcutta chart with the +06:30 war-time offset resolved automatically is a real conversation. And the palm feature turns a hard computer-vision problem into a craft, the honest failure mode (faint ink, then a stylus) is part of the aesthetic.

**Non-goals, enforced by tests, not by good intentions.** No Western astrology (no tropical sun signs, no Placidus, no Western glyphs, no "Mercury retrograde" memes). No predictions about health, death, fertility, wealth or legal outcomes, and no remedies, gemstones or poojas. No accounts, cloud, sync, analytics or telemetry. No LLM in the core path, readings are deterministic template sentences composed from rule hits. No AGPL by default. No scraping. No Play Store, no monetisation, no public launch.

---

## 2. Non-negotiables

### 2.1 Stack, exact packages and versions

Pin every version in `package.json`. These were verified on 2026-09-06.

| Layer | Package | Version | Licence | Why |
|---|---|---|---|---|
| Build | `vite` | 8.2.2 | MIT | One static `dist/` serves both GitHub Pages and the Capacitor APK; `base` parameterised per target |
| UI | `react` / `react-dom` | 19.2.8 | MIT | The whole desk is DOM/CSS/SVG |
| Language | `typescript` (strict) | 5.x | Apache-2.0 | `strict: true`, `noUncheckedIndexedAccess: true` |
| Styling | `tailwindcss` + `@tailwindcss/vite` | 4.3.3 | MIT | CSS-first `@theme`; hand-written CSS for paper, brass, lac, grain, lamp shadows |
| Motion | `motion` (`motion/react`) | 13.2.0 | MIT | `pathLength` ink-draw, four material springs, `drag`, `useScroll`. **GSAP is not used** (not OSI; `pathLength` covers the whole requirement) |
| Routing | `react-router` | 7.x | MIT | `createHashRouter`, deep links work on Pages with no server rewrite |
| Persisted data | `dexie` / `dexie-react-hooks` / `dexie-export-import` | 4.4.5 / 4.4.0 / 4.4.0 | Apache-2.0 | Profiles, cached Patris, palm Blobs; `liveQuery`; streaming export feeds the encryption envelope |
| UI state | `zustand` | 5.0.15 | MIT | Active profile, drawer, loupe target, drum drag, sound/haptics, theme override |
| Ephemeris | `astronomy-engine` | 2.1.19 | MIT | ±1′ vs NOVAS; `Ecliptic(GeoVector(b, t, true))` is true-ecliptic-of-date, the same convention Swiss Ephemeris uses. Numerically frozen upstream, pin it, vendor it if it ever disappears |
| Time zones | `luxon` + `@photostructure/tz-lookup` | 3.7.2 / 11.6.1 | MIT / CC0-1.0 | lat/lon → IANA zone in 88 kB; Luxon reads the browser tzdb for historical offsets. Temporal is not in Safari, so Luxon stays |
| Gazetteer search | `minisearch` | 7.2.0 | MIT | Fuzzy offline birthplace search |
| Panchang oracle | `@ishubhamx/panchangam-js` | 3.0.0 | MIT | **devDependency only**, Node-side cross-check in tests; it is CJS and `require`s `fs`, so it must never reach the browser bundle |
| Hand landmarks | `@mediapipe/tasks-vision` + `hand_landmarker.task` | 1.0.1 / model 7 819 105 B | Apache-2.0 | 21 landmarks + handedness, IMAGE mode, self-hosted wasm for offline |
| Palm-line CV | `@techstark/opencv-js` | **exactly** `4.12.0-release.1` | Apache-2.0 | CLAHE, black-hat, Sobel, `warpPerspective`, `connectedComponentsWithStats`. 14.7 MB unpacked → lazy chunk, Hast screen only. `ximgproc.thinning` is absent, so Zhang-Suen is ours |
| Sky | `three` / `@react-three/fiber` / `@react-three/drei` / `d3-geo` | 0.185.1 / 9.7.0 / 10.7.8 / 3.x | MIT | Rooftop dome with BSC5 stars; lazy chunk, `frameloop="demand"`, painted-SVG fallback |
| Sound | `howler` | 2.2.x | MIT | One CC0 sprite ≤ 300 kB |
| Icons | `lucide-react` | 1.41.0 | ISC | 16 px, inside paper content only |
| Fonts | `@fontsource/yatra-one`, `@fontsource/tiro-devanagari-hindi`, `@fontsource-variable/martian-mono` | 5.3.x | SIL OFL 1.1 | Self-hosted, subset; never a Google Fonts `<link>` in a production build |
| Primitives | shadcn/ui on Base UI (`dialog`, `radio-group`, `switch`, `tabs`) | via `npx shadcn@latest` | MIT | Focus trap, `role="dialog"`, Esc, restyled through tokens, **never forked** |
| PWA | `vite-plugin-pwa` + `@vite-pwa/assets-generator` | 1.3.0 / 1.0.2 | MIT | Workbox precache + runtime caches |
| Android shell | `@capacitor/core`, `/android`, `/cli` | 8.5.1 | MIT | Same `dist/`; built in CI with Temurin 21, AGP 8.13, Gradle 8.14.3, compileSdk 36, minSdk 24 |
| Android plugins | `@capacitor/camera` 8.2.4, `/filesystem` 8.1.3, `/preferences` 8.0.1, `/haptics` 8.0.2, `/share` 8.0.1, `/app` 8.1.1, `/status-bar` 8.0.3, `/splash-screen` 8.0.2 | MIT | Palm capture, encrypted export, detent haptics, edge-to-edge, predictive back |
| Tests | `vitest` 3, `@testing-library/react`, `jsdom`, `fake-indexeddb`, `@playwright/test` 1.5x, `@axe-core/playwright`, `@lhci/cli`, `size-limit` | latest | MIT | §10 |
| Lint/format | `@biomejs/biome` | latest | MIT | One tool. No ESLint, no Prettier |
| Package manager | `npm` | bundled with Node 22 | - | No new tooling |

**Explicitly not installed, and the reason:**
- Any Swiss Ephemeris WASM (`@kuntay/swisseph`, `@swisseph/browser`, `swisseph-wasm`, `sweph-wasm`, `@fusionstrings/swisseph-wasm`), AGPL-3.0, and publishing on Pages is distribution. `@fusionstrings/swisseph-wasm` is banned outright even under the AGPL lane; its MIT claim is not credible.
- `gsap`, free Standard License is not OSI. Motion's `pathLength` is the whole ink-draw requirement.
- `rita`, GPL-3.0.
- `@capacitor/local-notifications`, daily-panchang notifications are a Someday item; adding the plugin now would add `POST_NOTIFICATIONS` / `SCHEDULE_EXACT_ALARM` to the manifest for nothing.
- Any analytics, telemetry, crash-reporting or feature-flag SDK. There is no `src/wit/` (Chowki's text is a *citation*, not a joke) and no `worker/` (nothing needs a hidden key).

### 2.2 Free-only, licence and data rules

- **Everything free forever.** GitHub Pages + GitHub Actions on a public repo; no Cloudflare Worker, no API key, no account, no card, anywhere. If a step would ask for a payment method, stop, you have taken a wrong turn.
- **Bundled code: OSI licences only** (MIT / Apache-2.0 / BSD / ISC / MPL-2.0 / Unlicense / CC0 / OFL for fonts). AGPL is banned.
- **Bundled data: public domain / CC0 / CC BY only.** GeoNames `cities500` (CC BY 4.0), Yale Bright Star Catalog BSC5 (public domain), MediaPipe hand model (Apache-2.0). HYG star catalogue (CC BY-SA) is deliberately avoided.
- **Classical tables are facts, re-typed.** Nakshatra lords, yoni animals, gana, nadi, varna, koota matrices, varga rules, yoga definitions and their BPHS / Muhurta Chintamani citations are typed by hand from the texts. They are never copied as code from PyJHora or any other implementation.
- `scripts/check-licences.mjs` fails the build if any dependency's licence is outside the allowed set, or if any banned package name appears anywhere in `package.json`, or if `README.md` has no **Attribution** section.
- The repo ships **MIT** in `LICENSE`, and it must stay MIT.

### 2.3 Privacy and content care (blocking, tested)

Chowki holds other people's birth times and photographs of their hands. Hands are biometrics.

1. **No accounts, no sync, no server, no key.** There is no backend to breach.
2. **Zero leakage.** The only outbound requests in the entire app are two keyless place-lookup endpoints, reachable **only** after an explicit "search online ⌑" tap. A Playwright test records the network log through a full session (leaf → cast → palm → milan → export) and **fails if any request appears**.
3. **A CSP `connect-src` allow-list of exactly those two origins** ships in `index.html`, so a compromised dependency has nowhere to send a birth chart.
4. **Export is encrypted, always**, AES-GCM-256 with a PBKDF2-SHA256 / 600 000-iteration key. There is no "export unencrypted" option.
5. **Burn** is a 600 ms hold that deletes a profile, its cached charts, palm captures, readings, milans and blobs in one transaction. No trash, no tombstone, no undo after the char completes.
6. **No health, death, fertility, wealth or legal output.** A Vitest case greps the whole template table against a banned-word list and fails the build if one appears. The disclaimer, *"Based on classical Jyotisha / Samudrika Shastra texts. For reflection and fun, not medical, legal or financial advice."*, is rendered by the `Colophon` component, not by a template, so it cannot be omitted by accident.
7. **No real palm photo ever enters the repo.** `fixtures-private/` is git-ignored and `scripts/check-no-biometrics.mjs` fails the build on any tracked JPEG/HEIC, any PNG > 200 kB, or any EXIF `Make`/`GPS` tag under `src/`, `e2e/` or `docs/`.
8. **Android permissions are exactly two**: `CAMERA` and `VIBRATE`. No storage/media permission (the system photo picker needs none), no notifications, no location, no background services.

### 2.4 Offline by construction

The app must work in airplane mode from the first launch after install. The engine, gazetteer, fonts, sounds, star file, grain and seal SVGs are precached; the hand model, MediaPipe wasm, the OpenCV chunk and the sky chunk are runtime-cached (`CacheFirst`) and can be warmed deliberately from **Drawer → "Prepare for offline"**. Inside the Capacitor APK the service worker is **not** registered at all, the APK already carries every asset.

### 2.5 Platforms

| Tier | Target | How |
|---|---|---|
| Web (primary) | Chrome / Edge / Firefox / Safari; phone-first 390-430 px portrait; desktop ≥ 900 px | Vite 8 + React 19 static build, hash router, PWA precache, GitHub Pages at `/jyoti/` |
| Android (primary) | Android 7+ (`minSdk 24`), target 16 (`compileSdk 36`) | Capacitor 8 wrapping the same `dist/`; signed APK built by GitHub Actions on `v*` tags, sideloaded from Releases |
| Desktop | Any browser ≥ 900 px | Same web build; the desk widens, the Ledge becomes the left edge |

### 2.6 Repository and folder layout

Repo **`jyoti`**, public, MIT. The app scaffold lives at the repo root so `docs/` and `design/` stay with the code.

```
jyoti/
├── .github/workflows/
│   ├── pages.yml                  # build + deploy to GitHub Pages on push to main
│   ├── ci.yml                     # biome, unit, e2e, privacy, licence + bundle scanners
│   └── android-release.yml        # signed APK on tag v* → GitHub Release
├── android/                       # Capacitor shell, committed (generated by `npx cap add android`)
├── public/
│   ├── grain.svg                  # baked feTurbulence paper tile (<6 kB)
│   ├── seal-edge.svg              # pre-displaced lac seal + tilak edges (no live filters)
│   ├── icon.svg                   # brass diya, vermilion flame tip, teak ground
│   ├── models/hand_landmarker.task
│   ├── mediapipe/                 # tasks-vision wasm, self-hosted
│   ├── sounds/chowki.{webm,mp3}   # one CC0 sprite + ATTRIBUTION.md
│   └── icons/                     # PWA 192/512 + maskable, apple-touch, favicon
├── scripts/
│   ├── build-gazetteer.mjs        # GeoNames dump → src/data/geonames-in.json.gz
│   ├── build-stars.mjs            # BSC5 → src/data/bsc5.bin (Float32 RA/Dec/mag)
│   ├── import-oracle.mjs          # PyJHora CSV → __fixtures__/ashtakoota-oracle.bin
│   ├── make-palm-fixtures.mjs     # synthetic palm PNGs for CV tests
│   ├── subset-fonts.sh            # pyftsubset: Latin + Latin-1 + Devanagari + °′″℞
│   ├── check-licences.mjs         # blocking
│   ├── check-bundle.mjs           # blocking
│   └── check-no-biometrics.mjs    # blocking
├── src/
│   ├── app/
│   │   ├── router.tsx             # createHashRouter, the 12 routes of §4
│   │   ├── Shell.tsx              # desk, Ledge, lamp, vignette, view-transition names
│   │   └── providers.tsx          # MotionConfig, theme bootstrap, error boundary
│   ├── features/
│   │   ├── chowki/                # home desk, DeskObject, ParapetSky
│   │   ├── leaf/                  # BrassDrum, PlaceSearch, EngravedStrip, SealButton
│   │   ├── patri/                 # Roller, KundliNorth/South, GrahaLedger, DashaRibbon, Loupe, geometry.ts
│   │   ├── today/                 # BrassDial, LedgerRow, MoonPager
│   │   ├── milan/                 # ScrollPair, BeadRow, LacBandStamp
│   │   ├── hast/                  # CameraView, QualityGauge, PalmPrint, LineOverlay, StylusEditor
│   │   ├── sky/                   # SkyDome (lazy), PaintedSky, ScrubRing, PosterAction
│   │   └── drawer/                # DialSegment presets, export/import, Colophon
│   ├── engine/                    # pure domain logic, no React, no DOM, no clock
│   │   ├── types.ts time.ts ayanamsa.ts ephemeris.ts nodes.ts lagna.ts
│   │   ├── nakshatra.ts vargas.ts dasha.ts panchang.ts sunrise.ts boundary.ts
│   │   ├── yogas.ts ashtakoota.ts porutham.ts reading.ts patri.ts
│   │   ├── palm/  landmarks.ts geometry.ts quality.ts rectify.ts enhance.ts ridge.ts thin.ts label.ts rules.ts
│   │   ├── sky/   stars.ts horizon.ts
│   │   ├── __oracle__/            # Node-only cross-checks (panchangam-js, swetest fixtures)
│   │   └── __fixtures__/          # golden charts, drik panchang numbers, ashtakoota oracle
│   ├── data/
│   │   ├── db.ts repo.ts crypto.ts places.ts
│   │   ├── geonames-in.json.gz  bsc5.bin  attribution.json  citations.json
│   │   └── tables/                # nakshatras, signs, lords, dignity, yoni, gana, vashya, varga
│   ├── components/ui/             # shadcn on Base UI, restyled: Drawer, FootnoteSheet, RadioRow…
│   ├── motion/springs.ts          # PAPER · BRASS · THREAD · INK
│   ├── state/ui.ts                # Zustand, four slices
│   ├── styles/tokens.css          # §3.3, pasted verbatim
│   ├── shims/empty.ts             # empty module for the OpenCV node-builtin aliases
│   └── platform/                  # camera.ts files.ts haptics.ts bars.ts (web | capacitor)
├── e2e/                           # Playwright flows, visual baselines, perf, privacy, a11y
├── fixtures-private/              # GIT-IGNORED real palm photos, never committed
├── docs/                          # this file and the planning docs
└── design/preview.html            # the visual contract
```

`src/wit/` and `worker/` are deliberately absent.

---

## 3. Design & aesthetics, the complete frontend brief

This section is self-contained. It is the visual contract. Build `design/preview.html` from it (Phase 1) if that file does not already exist, then keep the app at least as good as the preview.

### 3.1 Identity

**Name:** Chowki (चौकी, the low wooden desk a Jyotishi works at).
**One-liner:** *A low teak desk on a night rooftop, lit by one brass diya, where your Janam Patri unrolls under your thumb in lamp-black ink, turmeric borders and a sindoor tilak, Indian manuscript physics, not a zodiac dashboard.*
**Three adjectives:** **Weighted · Devout · Exact.**

- *Weighted*, every object has mass and a material (paper, brass, thread, ink); nothing fades in, nothing floats.
- *Devout*, the visual vocabulary is the real one (patri scrolls, palm-leaf bundles, mauli thread, kumkum, diya), used with respect rather than as ornament.
- *Exact*, every number shows its work: degree to the arcsecond, ayanamsa preset, UTC offset, rule citation. The desk is an instrument, not a fortune-teller.

**What it must never look like.**
- **A fantasy-game parchment menu or a Western tarot app**, no gold text, no gradient text, no purple nebula, no glyph fonts, no Western zodiac art, no ornate corner filigree. Brass appears only where a real brass object sits (rollers, dial, loupe, clip, drums, beads).
- **A wood-textured skeuomorph from 2010**, teak is a *margin* (≤ 8 % of any screen), never a texture photo. Paper owns 85-92 % of every screen so a screenshot reads as manuscript, not tavern. Materials are CSS gradients plus one baked grain tile, never bitmaps.
- **"Stars on navy + gold serif" horoscope apps**, the sky exists only on the Rooftop screen and it is astronomically true; the rest of the app is paper under a lamp.
- **Inter-on-grey with a purple button.** If a screen would look fine that way, it has left the lens.

**Materials and their meanings.** Paper = where reading happens. Turmeric band = a section head. Brass = an instrument you operate. Ink = a computed fact. Vermilion (sindoor) = the one thing that matters on this screen. Lac = destructive or a doṣa. Haldi = a caution that is never text. Thread = a relation between two things.

### 3.2 Colour system

Handmade paper under one warm lamp. Paper carries all body text in **both** themes, so AA contrast is guaranteed regardless of theme; wood and indigo cloth are margins. One pigment accent (sindoor), one metal (brass, art-only on paper), one signal green (tulsi), one turmeric (fill-only). **The theme changes the desk, never the paper.**

**Night desk (default; diya lit; also `prefers-color-scheme: dark`):**

| Token | Hex | Usage | Contrast |
|---|---|---|---|
| `--bg` | `#1A110B` | Teak desk at night, margins only (≤ 8 %), behind objects, the Ledge | paper on it 15.6:1 |
| `--bg-elevated` | `#1D2748` | Indigo (neel) block-print cloth the scroll rests on; drawer interior | paper 12.2:1 · brass 6.1:1 |
| `--surface` | `#F4EAD3` | **Handmade paper, the dominant surface (85-92 %)**; all reading happens here | - |
| `--surface-2` | `#EAD9A9` | Turmeric-washed paper: section bands, ledger zebra rows, leaf faces, drum faces | ink 13.0:1 · ink-muted 6.2:1 |
| `--ink` | `#1B1410` | Lamp-black ink: primary text, chart strokes, sign numerals | 15.2:1 on paper |
| `--ink-muted` | `#5A483A` | Faded ink: captions, citations, ′ ″ marks, measured values, placeholders | 7.3:1 |
| `--ink-faint` | `#9A8A72` | Ghost ink: ruled guides, watermarks, disabled strokes, **art only, never text** | 2.8:1 |
| `--accent` | `#B5301C` | Sindoor vermilion: the tilak, mauli thread, primary button fill, boundary badge | 5.2:1 (text ≥ 13 px) |
| `--accent-text` | `#A8281A` | Vermilion for small text *on the turmeric band* | 5.0:1 on `--surface-2` |
| `--accent-ink` | `#FFF6E6` | Text on vermilion fills | 5.8:1 on `--accent` |
| `--accent-2` | `#C9A24A` | Antique brass: rollers, dial, loupe rim, clip, earned beads; text **only on teak/indigo** | 7.8:1 on `--bg` · 2.0:1 on paper (never text there) |
| `--success` | `#356234` | Tulsi green: good koota bands, validated tick, saved state | 6.0:1 |
| `--warning` | `#C68A12` | Haldi: **fills and underlines only**, always with `--ink` on top | 2.5:1, never text |
| `--warning-text` | `#7A5407` | Turmeric-dark for warning *text* | 5.7:1 |
| `--danger` | `#7F160F` | Dried lac seal: destructive actions, doṣa marks, "burn" | 8.7:1 |
| `--border` | `#C9B48A` | Turmeric-ruled hairline: ledger rules, leaf ruling, form rows (1 px) | non-text |
| `--border-strong` | `#8A7350` | Section rules under turmeric bands, chart frames, roller shadow line | non-text |
| `--focus` | `#22408E` | Neel focus ring, 2 px, offset 2 px, plus a 2 px `--surface` halo so it reads on paper, brass and teak | 8.0:1 |
| `--moon` | `#DCE4F5` | Moon silver: Purnima fill-light tint, the Moon body, Chandra-rāśi callouts on dark | 14.6:1 on `--bg` |
| `--ledge` | `#241811` | The Ledge bar (slightly lifted teak) | paper 14.5:1 · brass 7.2:1 |

**Morning terrace (light theme; auto when local sun altitude > 0°, or the diya is snuffed).** Only the desk changes, `--bg: #6E4A2E`, `--bg-elevated: #C9C1AE`, `--ledge: #5E3F27`, `--shadow-alpha` halved to 0.22, `--grain-opacity: 0.10`, `--vignette-far: 0.08`. **Nothing else.** Labels on day teak use `--surface`, never brass (brass on day teak is 3.3:1).

**Tithi weather (both themes).** A fill light from the top-left tints only `--bg-elevated` and the vignette. `--moon-k` (0 Amāvasyā → 1 Pūrṇimā) comes from the engine's `moonIllumination`; the cloth becomes `color-mix(in oklch, var(--bg-elevated), var(--moon) calc(var(--moon-k) * 14%))`, and the vignette's far-corner darkness eases from 18 % to 8 %. **Text tokens never change; shadow direction never changes.**

**Materials, how to build each one (CSS only, no bitmaps):**

| Material | Recipe |
|---|---|
| Paper | `--surface` plus a baked tiled SVG grain (`feTurbulence baseFrequency 0.9`, 2 octaves, 256 px tile, exported once to `/public/grain.svg`) at `opacity: var(--grain-opacity)`. **Never a live filter over the scroll.** Every sheet's top edge gets a 1 px `--border-strong` at 40 % (a cut edge) |
| Turmeric band | `--surface-2` with a 1 px `--accent` hairline beneath at 70 % opacity; on section heads the band's left 6 px is a solid `--accent` "kumkum" tick |
| Brass (rollers, dial, drums, loupe rim) | cylinders: `linear-gradient(90deg, #8F6F2E 0%, #E2C56B 18%, #C9A24A 50%, #7E5F22 100%)`; dial face: `conic-gradient`; turned edge: `inset 0 1px 0 rgba(255,246,230,.55), inset 0 -1px 0 rgba(0,0,0,.45)` |
| Wood (margins, Ledge) | flat `--bg` plus a 2 %-lighter 1 px grain line every 7 px via `repeating-linear-gradient` at 0.06 alpha, a suggestion, not a texture |
| Indigo cloth | `--bg-elevated` with a 4 × 4 px block-print dot pattern (`radial-gradient`, 8 % alpha paper) |
| Lac seal | `--danger` disc with `feTurbulence` displacement baked into `/public/seal-edge.svg`; highlight from the lamp direction |
| Lamp light | one `radial-gradient` at `(--lamp-x, --lamp-y)` = bottom-right: paper +0 %, far corner −10 % via a multiply overlay; the same variables drive every shadow |
| Glass (loupe) | a 2D canvas magnifier inside `border-radius: 50%` with an edge `radial-gradient(transparent 82%, rgba(255,255,255,.35) 88%, rgba(0,0,0,.35) 100%)`, **no `backdrop-filter`, no blur** |

**Forbidden everywhere:** mesh gradients, glow filters, frosted glass, `backdrop-filter`, `filter: blur()`, text shadows, gradient text fills, raster textures.

### 3.3 Design tokens, paste verbatim into `src/styles/tokens.css`

```css
:root {
  color-scheme: dark;

  /* ── colour (Night desk, default) ── */
  --bg: #1A110B;          --bg-elevated: #1D2748;   /* teak desk (margins only); indigo cloth */
  --surface: #F4EAD3;     --surface-2: #EAD9A9;     /* handmade paper (dominant); turmeric band */
  --ink: #1B1410;         --ink-muted: #5A483A;     --ink-faint: #9A8A72;   /* faint = art only */
  --accent: #B5301C;      --accent-text: #A8281A;   --accent-ink: #FFF6E6;  /* sindoor; on band; on fills */
  --accent-2: #C9A24A;                              /* brass, never text on paper */
  --success: #356234;     --warning: #C68A12;       --warning-text: #7A5407; /* tulsi; haldi fills only */
  --danger: #7F160F;      --border: #C9B48A;        --border-strong: #8A7350; /* lac; turmeric hairlines */
  --focus: #22408E;       --moon: #DCE4F5;          --ledge: #241811;

  /* semantic aliases */
  --paper: var(--surface); --paper-band: var(--surface-2);
  --tilak: var(--accent);  --thread: var(--accent); --brass: var(--accent-2);
  --lac: var(--danger);    --haldi: var(--warning); --tulsi: var(--success);
  --engraved: color-mix(in oklch, var(--brass), black 55%);
  --moon-k: 0;                /* Moon illumination 0-1, set by the engine */
  --moon-fill: color-mix(in oklch, var(--bg-elevated), var(--moon) calc(var(--moon-k) * 14%));

  /* ── typography ── */
  --font-display: "Yatra One", "Noto Sans Devanagari", Georgia, serif;
  --font-body: "Tiro Devanagari Hindi", "Noto Serif Devanagari", Georgia, serif;
  --font-mono: "Martian Mono Variable", "Martian Mono", Consolas, "Courier New", monospace;
  --mono-wdth: 87;
  --text-xs: 0.75rem;  --text-sm: 0.8125rem;  --text-base: 1.0625rem;  --text-lg: 1.25rem;
  --text-xl: 1.375rem; --text-2xl: 1.75rem;   --text-3xl: 2.125rem;    --text-4xl: 3rem;
  --text-5xl: clamp(3rem, 16vw, 4.5rem);
  --leading-tight: 1.1; --leading-body: 1.5; --leading-devanagari: 1.6; --tracking-mono: 0.06em;

  /* ── spacing ── */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 40px;
  --space-9: 48px; --space-10: 64px; --space-11: 80px; --space-12: 96px;
  --paper-margin: 20px;
  --ledge-height: calc(64px + env(safe-area-inset-bottom, 0px));

  /* ── radius ── */
  --radius-sm: 3px; --radius-md: 6px; --radius-lg: 14px; --radius-xl: 28px; --radius-full: 9999px;

  /* ── elevation (one lamp, bottom-right) ── */
  --lamp-x: 1; --lamp-y: 1;   /* bottom-right */
  --flicker: 0px;             /* ±0.6px jitter set by lamp-flicker */
  --shadow-alpha: 0.45;
  --shadow-1: calc(-2px * var(--lamp-x) + var(--flicker)) calc(-2px * var(--lamp-y) + var(--flicker)) 6px rgba(20, 10, 4, var(--shadow-alpha));
  --shadow-2: calc(-6px * var(--lamp-x) + var(--flicker)) calc(-5px * var(--lamp-y) + var(--flicker)) 18px rgba(20, 10, 4, calc(var(--shadow-alpha) + 0.05));
  --shadow-3: calc(-14px * var(--lamp-x) + var(--flicker)) calc(-12px * var(--lamp-y) + var(--flicker)) 36px rgba(20, 10, 4, calc(var(--shadow-alpha) + 0.10));
  --grain-opacity: 0.12;
  --vignette-far: 0.18;       /* darkness at the corner opposite the lamp */

  /* ── borders / strokes ── */
  --hairline: 1px; --stroke-chart: 1.25px;

  /* ── motion ── */
  --dur-fast: 120ms; --dur-base: 240ms; --dur-slow: 480ms; --dur-draw: 900ms;
  --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: linear(0, 0.36 10%, 0.78 21%, 1.02 34%, 1.06 42%, 1.01 58%, 0.99 74%, 1);
}

/* Morning terrace, auto by sun altitude, or diya snuffed */
:root[data-theme="day"] {
  color-scheme: light; --bg: #6E4A2E; --bg-elevated: #C9C1AE; --ledge: #5E3F27;
  --shadow-alpha: 0.22; --grain-opacity: 0.10; --vignette-far: 0.08;
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="night"]) {
    color-scheme: light; --bg: #6E4A2E; --bg-elevated: #C9C1AE; --ledge: #5E3F27;
    --shadow-alpha: 0.22; --grain-opacity: 0.10; --vignette-far: 0.08;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --flicker: 0px; --dur-draw: 240ms; --ease-spring: var(--ease-out);
  }
}
```

Tailwind v4 bridge in `src/index.css`:

```css
@import "tailwindcss";
@import "./styles/tokens.css";
@theme inline {
  --color-bg: var(--bg);         --color-paper: var(--surface);
  --color-band: var(--surface-2);--color-ink: var(--ink);
  --color-accent: var(--accent); --color-brass: var(--accent-2);
  --font-display: var(--font-display); --font-body: var(--font-body); --font-mono: var(--font-mono);
  --radius-md: var(--radius-md); --ease-out: var(--ease-out);
}
```

**No hex value may exist anywhere outside `tokens.css`.** A grep test enforces it.

### 3.4 Typography

| Role | Face | Package | Weights |
|---|---|---|---|
| Display | **Yatra One** (Devanagari + Latin) | `@fontsource/yatra-one` | 400 |
| Body | **Tiro Devanagari Hindi** | `@fontsource/tiro-devanagari-hindi` | 400 + 400 italic |
| Mono / engraved | **Martian Mono** variable | `@fontsource-variable/martian-mono` | `wdth 87`, `wght 500` (variable `wdth` 75-112.5, `wght` 100-800) |

All three self-hosted and subset with `pyftsubset` (Python 3.14 is local) to **Latin + Latin-1 + Devanagari + `°′″℞`**; target **≤ 260 kB woff2 total**. Retain the `akhn`, `rphf`, `blwf`, `half` and `pres` OpenType features or Devanagari conjuncts break. `font-display: swap` with `size-adjust` fallback metrics (Georgia / Noto Sans Devanagari system / Consolas) so `digit-set` never causes a layout shift.

*Why these:* Tiro Devanagari Hindi is a text face where Devanagari and Latin were drawn together, so "Śani · शनि" sits on one baseline rhythm instead of looking pasted. Yatra One's brush weight reads like the hand-lettered headline on a real patri, use it for **at most six words per screen**. Martian Mono, condensed, appears **only on brass**, so the eye learns "mono = instrument, serif = manuscript".

**Type scale** (rem at 16 px root; line-height in parentheses):

| Token | rem / px | Face | Use |
|---|---|---|---|
| `--text-xs` | 0.75 / 12 | Martian Mono, uppercase, +0.06em | Engraved labels on brass, drum tick labels, dial minutes |
| `--text-sm` | 0.8125 / 13 | Tiro or Martian Mono | Citations ("BPHS 36.13"), ledger units, colophon, drawer helper text |
| `--text-base` | 1.0625 / 17 (1.5) | Tiro | Body on paper, readings, leaf lines, **minimum body size** |
| `--text-lg` | 1.25 / 20 (1.4) | Tiro | Ledger numerals, form values, koota names |
| `--text-xl` | 1.375 / 22 (1.3) | Yatra One | Section titles on turmeric bands |
| `--text-2xl` | 1.75 / 28 (1.15) | Yatra One | Screen titles on phone ("जन्म पत्री") |
| `--text-3xl` | 2.125 / 34 (1.1) | Yatra One / Tiro | The person's name on the seal; screen titles ≥ 900 px |
| `--text-4xl` | 3 / 48 (1) | Martian Mono `wdth 87 wght 300` / Tiro | Loupe degree readout, current Mahādaśā lord |
| `--text-5xl` | 4.5 / 72 (0.95) | Tiro (Latin numerals) | Guna score "20 / 36"; phone uses the `clamp()` in the token |

Rules: `--leading-tight: 1.1`, `--leading-body: 1.5`; **Devanagari body gets `line-height: 1.6`** (matras need headroom), set this before laying out the ledger or every row needs re-tuning later. Headlines `text-wrap: balance`; readings `text-wrap: pretty`; measure ≤ 60ch Latin / 48ch Devanagari. Letter-spacing: Martian Mono uppercase +0.06em; Tiro body 0; **never track Yatra One and never letter-space Devanagari**; large Tiro numerals −0.01em.

**Numerals.** Tiro has proportional lining figures only, so every numeral that *changes* (drums, ledger, loupe, score) is either Martian Mono with `font-variant-numeric: tabular-nums` or a Tiro digit inside a `1ch` inline-block cell. Degrees are written `23°51′12″` with `°` in `--ink` and `′ ″` in `--ink-muted`. Retrograde is a superscript `℞` in Tiro. Devanagari digits (`२३°५१′`) are a Drawer setting; when on, the ledger uses Tiro's Devanagari digits in cells and the **brass drums stay Latin** (engraved brass is Latin by convention).

**Voice.** Headings bilingual, Devanagari first ("जन्म पत्री · Janam Patri"). Readings begin "Tradition says…" / "परंपरा कहती है…" and end in a superscript citation. Buttons are verbs ("Seal the leaf", "Cast", "Burn"), never an icon alone.

### 3.5 Spacing, radius, elevation, borders, texture

**Spacing**, 8-pt grid with a 4-pt half step (`--space-1` … `--space-12` above). Paper margin 20 px on phone, 32 px at ≥ 900 px; 32 px between patri sections; 48 px above a turmeric band.

**Radius**, `--radius-sm 3px` (badges, seal text box) · `--radius-md 6px` (leaf corners, drawer, buttons, cut paper, **not pills**) · `--radius-lg 14px` (roller caps, dial bezel) · `--radius-xl 28px` (brass drums) · `--radius-full` (beads, loupe, diya flame).

**Elevation, one lamp, three heights.** All shadows derive from `--lamp-x: 1` / `--lamp-y: 1` (bottom-right), so **every shadow falls up-left with negative offsets**:
- `--shadow-1`, a sheet lying on the desk, a bead
- `--shadow-2`, a leaf lifted, the loupe, an open drawer
- `--shadow-3`, the loupe rising toward the camera, the scroll unrolling into a screen

Morning terrace halves the alpha. Put `will-change: transform` on shadowed moving objects. **Shadows never animate their blur**, only the object transforms.

**Borders**, `--border` 1 px turmeric hairline for rows; `--border-strong` 1 px under section bands; chart strokes are `--ink` at `1.25px` with `shape-rendering: geometricPrecision` and hairlines snapped to device pixels; the vermilion hairline under every turmeric band is 1 px at 70 %.

**Texture**, `--grain-opacity: 0.12` night / `0.10` day, applied **only to paper**.

### 3.6 Motion language

**Five principles.**
1. Everything has mass and one of four materials, each with its own spring. If a flourish has no material rule, cut it.
2. **Ink is drawn, never faded.** Strokes draw with `pathLength`; numerals *set* digit by digit; then the pigment settles.
3. One light, one heartbeat. The diya flicker is the only ambient motion, and it is the first thing reduced-motion removes.
4. **Direct manipulation has zero easing**, drums, ribbon, loupe and stylus follow the finger 1:1; easing happens only on release.
5. Transform and opacity only. No animated filters, no animated shadows, no layout thrash on the scroll.

**Tokens:** `--dur-fast 120ms` · `--dur-base 240ms` · `--dur-slow 480ms` · `--dur-draw 900ms` (ink; clamp 400-1400 ms by path length) · `--ease-out cubic-bezier(0.22, 0.8, 0.2, 1)` · `--ease-in-out cubic-bezier(0.65, 0, 0.35, 1)` · `--ease-spring` (the CSS approximation of PAPER, in the token block).

**`src/motion/springs.ts` is the single source of truth for Motion 13:**

```ts
export const PAPER  = { type: 'spring', stiffness: 220, damping: 26, mass: 0.8 } as const; // light, damped; one bounce at scroll ends
export const BRASS  = { type: 'spring', stiffness: 120, damping: 20, mass: 2 } as const;   // heavy; + rotational inertia (v *= 0.94/frame) and detents
export const THREAD = { type: 'spring', stiffness: 420, damping: 14, mass: 0.6 } as const; // elastic; may overshoot twice
// INK is not a spring: pathLength 0→1 at ~900 px/s with --ease-out, then opacity .85→1 over 240 ms (pigment settles).
export const INK_SPEED_PX_PER_S = 900;
```

**The fourteen named animations, build every one to these specs.**

| # | Name | Spec |
|---|---|---|
| 1 | `unroll` | The page scroll *is* the scroll. Top roller body `scaleY` 1 → 1.35 and bottom 1.35 → 1 as `scrollProgress` 0→1 (linear, driven by `useScroll`, **no easing**); a curl highlight `translateX` follows the tangent. Overscroll at the top pulls the paper `translateY` up to 56 px against PAPER and reveals the lac seal; release snaps back with PAPER |
| 2 | `ink-draw` | Any SVG (diamond, grid, palm lines, ruler): `pathLength` 0→1, frame first, interior strokes staggered +60 ms each, INK timing; 3 % nib-width wobble via `stroke-width` keyframes on a 30 ms tick; planet glyphs then settle into houses with PAPER from `translateY 6px, opacity .85` |
| 3 | `digit-set` | Numerals never fade: each digit cell goes `color: var(--ink-faint) → var(--ink)` over 120 ms, 24 ms stagger left→right, tabular so nothing shifts. Drums, ledger and the loupe readout use it on every settle |
| 4 | `tilak-dab` | Lagna tilak: `scale 0.7 → 1.06 → 1` over 240 ms `--ease-out` (the 1.06 is the thumb pressing), `opacity 0→1` in the first 80 ms; the bled edge is the pre-baked displaced SVG, never a live filter. `impact Medium` at 0 ms |
| 5 | `drum-spin` | Brass drums: drag with zero easing; on release apply BRASS inertia and snap to the nearest detent; each detent passing = 30 ms tick sound + `selectionChanged`. Velocity capped at 4 detents/frame |
| 6 | `bead-slide` | Guna mala: each earned bead `translateX` across the knot with THREAD, 90 ms apart; colour `--ink → --accent-2` at the knot over 120 ms; doṣas slide as `--danger` beads. Final knot: thread `scaleX 1 → 1.04 → 1` (THREAD), then the lac stamp uses `tilak-dab` |
| 7 | `seal-thunk` | Hold the seal 600 ms: `scale 1 → 0.94` over the hold (linear); release → `scale 1.08 → 1` PAPER, `impact Medium`, recompute begins and `ink-draw` replays. Early release: `scale → 1` in 120 ms, no action |
| 8 | `lamp-flicker` | Diya flame `opacity` and `scale` ±3 % from 1/f noise sampled every 80 ms; **one CSS variable** `--flicker` jitters all shadow offsets ±0.6 px in sync. Paused off-screen, under reduced motion and under "Calm desk". Never animate per element, that is the easiest way to lose 60 fps |
| 9 | `loupe-rise` | Loupe `scale 0.6→1`, `translateY 24px→0`, shadow `--shadow-1 → --shadow-3`, 240 ms `--ease-out`; follows the finger 1:1 while held; on release settles with PAPER onto the nearest planet |
| 10 | `leaf-fan` | Untie: the thread end follows the drag; at 40 px the knot releases (THREAD) and leaves fan with `rotate` −12°…+12° and `translateX` 0…−18 px, PAPER, 30 ms stagger from the top leaf |
| 11 | `object-open` | View Transition: the tapped desk object carries a `view-transition-name` and scales from its resting spot into its screen (the scroll unrolls upward from centre, the loupe rises, the bundle slides left) over 320 ms `--ease-in-out`. The Ledge and desk margins are shared elements and do not move |
| 12 | `sky-pitch` | Home → Rooftop: the desk `translateY 0 → −30 %` + `opacity 1→0` over 480 ms `--ease-in-out` while a pre-rendered dome frame fades in; R3F mounts after and crossfades over 240 ms. Reverse on swipe-down |
| 13 | `drawer-slide` | Drawer `translateY 100% → 0` with PAPER (a wooden drawer on paper glides), 40 ms after `impact Light`; the desk above dims with `--ink` at 0.25 |
| 14 | `sky-scrub` | Parapet strip: sun/Moon `cx/cy` and gradient stops recomputed at 30 fps while a drum turns (astronomy-engine, < 1 ms/frame), **no tween**. The Lagna sign label uses `digit-set` on change plus `selectionChanged` |

**Hover / press.** Paper objects lift 2 px with `--shadow-1 → 2` in 120 ms; brass objects brighten their highlight stop by 6 %; text links gain a 1 px `--accent` underline drawn left→right in 120 ms.
**Loading.** An ink line draws across the top of the sheet (`ink-draw`, repeating). **No spinners anywhere.**

**`prefers-reduced-motion: reduce`**, lamp flicker off (steady flame), rollers static, `ink-draw` becomes a 240 ms opacity fade, `digit-set` is instant, springs become 200 ms `--ease-out` tweens with no overshoot, View Transitions become a 160 ms crossfade, `sky-pitch` shows only the static painted sky, no tilt-to-look, shadows stop jittering. Drums, ribbon, loupe and stylus **still follow the finger** (they are user-driven) but snap without inertia. Wrap the app in `<MotionConfig reducedMotion="user">`, and add an independent **"Calm desk"** switch in the Drawer that disables flicker, rustle and inertia regardless of the OS setting.

### 3.7 The five signature interactions, step by step

**A. Unrolling the Patri.**
1. Open a profile: the rolled scroll on the desk grows into the screen (`object-open`); rollers pin to the top and bottom edges with the paper 92 % wide between them.
2. Scroll down: the top roller visibly thickens and the bottom thins (`unroll`); a curl highlight tracks the tangent. Paper-rustle gain follows scroll velocity and is silent below 60 px/s.
3. Pull past the top: the paper stretches against PAPER (stiffness 220) and the lac seal appears above the header, the person's Janma-nakshatra symbol stamped in lac.
4. Hold the seal 600 ms → `seal-thunk` → the chart recomputes with the current presets and the diamond redraws (`ink-draw`).
*Physics:* roller diameter is a function of `scrollProgress`, transform-only layers. *Sound/haptics:* rustle; roller creak at overscroll; `impact Light` on snap-back; `impact Medium` on the seal. *Why it delights:* the page is an object whose length you can feel, a 120-year daśā ribbon is literally a longer scroll.

**B. The ink-drawn Kundli and the brass loupe.**
1. The North diamond draws in ink stroke by stroke (frame → diagonals → inner diamond); sign numerals are written with a nib wobble; planets settle with PAPER.
2. Last, the Lagna receives its sindoor tilak (`tilak-dab`, `impact Medium`), a thumb-dab with a bled edge, never a clean circle.
3. Touch any planet: the loupe rises under your finger (`loupe-rise`) and magnifies that house; inside the glass an engraved strip reads `MA 11°31′24″ · ŚATABHIṢĀ 2 · LORD RĀHU`, with a vermilion near-boundary badge when the body is within 2′ of an edge.
4. Drag the loupe across the paper and it snaps planet to planet (`selectionChanged` each time), the readout digits doing `digit-set`; long-press flips the readout to the next varga.
5. Swipe the paper sideways: it flips (`rotateY`, PAPER, 480 ms) to reveal the South-Indian grid on the back.
*Why it delights:* the chart is *written for you* once (cached per profile + preset), then the glass lets you read arcseconds without ever opening a modal.

**C. Brass drums and the parapet sky.**
1. Birth entry is five brass counter drums with engraved numerals, day · month · year · hour · minute. Flick to spin; they keep turning with BRASS inertia and click into detents.
2. Above the desk, a parapet strip shows the real sky at that place and time: as the hour drum turns the sun sets, Venus appears, the Moon crosses; the engraved strip beneath reads the Lagna sign and fires `selectionChanged` each time the ascendant crosses a sign boundary.
3. The resolved IANA zone, historical UTC offset and Julian Day are engraved beneath, `ASIA/KOLKATA · +05:30 · JD 2449425.5799`, with a Bombay Time (+04:51) override drum for pre-1955 Bombay births.
4. Hold to seal the leaf (600 ms) and it is clipped to the scroll.
*Physics:* BRASS spring; one detent per unit; velocity capped at 4 detents/frame; sky recomputed at 30 fps with no tween. *Why it delights:* you see whether you were born at dusk or at 3 a.m. before any chart exists, and drums are impossible to mis-tap one-handed.

**D. The 36-bead mala (Guna Milan).**
1. Two scrolls lie side by side tied with a mauli thread; drag a second leaf from the bundle onto the desk to start.
2. Below, 36 wooden beads on the red thread, grouped 1·2·3·4·5·6·7·8 under the eight koota names (the Ashtakoota maxima sum to exactly 36, that is what makes the mala honest).
3. Each koota tallies in turn: earned beads slide across the knot one by one (`bead-slide`, 90 ms apart) with abacus clicks, turning brass as they pass. A doṣa leaves a dried-lac bead and a one-line "Tradition says…" beneath the group.
4. The count is knotted; the band (not recommended / acceptable / very good / excellent) is stamped in lac at the knot; ≥ 25 fires `notification Success`.
*Budget:* 36 × 90 ms = 3.24 s, ≤ 3.5 s total, tap to skip. *Why it delights:* a score becomes something you watched being counted, and doṣas are physically visible as dark beads rather than a red warning box.

**E. Loupe and stylus on the palm.**
1. After capture the rectified 512 px palm print lies on the desk like a photograph; the brass loupe follows your finger.
2. Detected heart, head and life lines draw in ink from the wrist outward (`ink-draw`, 900 ms each, 200 ms stagger) with lettered callouts a., b., c.; **confidence is ink darkness**, a low-confidence line is faint and dashed with a haldi note "trace to confirm".
3. If confidence is low the app hands you the stylus: drag and your trace scratches in vermilion with a leaf-scratch sound; the reading recomputes live from the traced geometry.
4. "Burn" deletes the print: the edge chars into `--danger` over 480 ms while you hold; release early and it cools back.
*Why it delights:* the hard CV problem becomes a craft you do with a tool, and honesty (faint ink) is part of the aesthetic rather than an error state.

### 3.8 Iconography, illustration, imagery

- **Icons:** Lucide at 16 px, 1.5 px stroke, `--ink`, used only *inside* paper content (chevrons, external-link, camera, share, x). Never in the Ledge (those are objects) and never as the sole label on a button.
- **Planet and nakshatra marks:** your own SVG set on a 24-unit grid in ink. Devanagari abbreviations सू च मं बु गु शु श रा के and Latin Sū Ch Ma Bu Gu Śu Śa Rā Ke are **text**, not a glyph font. 27 nakshatra symbols as simple ink pictograms (horse, yoni, razor, cart, deer head…) for the seal and the leaves. **No Western zodiac symbols anywhere.**
- **Objects** (scroll, dial, loupe, diya, leaves, beads, drums, stylus, paperclip, wax envelope): CSS gradients plus a handful of inline SVG shapes. No raster textures. The diya flame is a 2-path SVG with a warm gradient.
- **Paper grain:** one baked SVG (`feTurbulence`) at `/public/grain.svg`, under 6 kB.
- **Stars:** Yale Bright Star Catalog BSC5 (public domain, ~9 100 stars ≤ mag 6) converted at build time to a ≤ 60 kB binary. HYG is avoided (CC BY-SA).
- **Gazetteer:** GeoNames `cities500` subset (CC BY 4.0), credited in the Colophon.
- **Model:** MediaPipe `hand_landmarker.task` (Apache-2.0, 7 819 105 B) self-hosted in `/public/models`.
- **Reference imagery is never shipped**, Wellcome Collection patri scrolls, Wikimedia palm-leaf bundles and Met Open Access manuscript borders are moodboard only.

### 3.9 Sound and haptics

One Howler sprite (`public/sounds/chowki.webm` + `.mp3`, ≤ 300 kB total), master gain 0.5, master mute in the Drawer, audio unlocked on the first gesture (listen for **both** `touchstart` and `pointerdown`, the Android WebView needs a genuine touch), defaults **on** but respects system silent mode. Every clip is CC0 (freesound.org with the CC0 filter: "paper rustle", "brass tick", "wood bead", "wax seal", "pencil scratch", "match strike"; plus Kenney.nl UI audio), credited in `public/sounds/ATTRIBUTION.md`. **No tanpura**, Chowki is a desk, not a temple.

| Event | Sound | Haptic (`@capacitor/haptics`; `navigator.vibrate` fallback) |
|---|---|---|
| Scroll the Patri · overscroll | paper rustle, gain ∝ velocity (silent < 60 px/s) · roller creak | none · `impact Light` on snap-back |
| Hold seal / recompute | wax thunk | `impact Medium` |
| Ink draw · tilak dab | nib scratch looped · soft pat | none · `impact Medium` |
| Drum detent / dial / ribbon tick | brass tick, −18 dB, **≤ 1 per 40 ms** | `selectionChanged` |
| Sign-boundary crossing (sky scrub) | brighter tick | `selectionChanged` |
| Bead slide | wooden click | `selectionChanged` |
| Mala knot / thread untie | thread snap | `notification Success` at ≥ 25; `notification Warning` the first time a boundary badge or low palm confidence appears (no sound) |
| Diya lit / snuffed · stylus tracing | "fwoomp" / breath · leaf scratch while moving | `impact Light` · none |
| Burn (hold) | slow char crackle | `impact Heavy` on completion |
| Navigation, toasts, passive scroll | nothing | nothing |

### 3.10 Accessibility rules (these are tests, not aspirations)

- **Contrast:** all text on paper ≥ 4.5:1. Brass is never text on paper; haldi is never text anywhere; `--ink-faint` is never text. Engraved labels on brass are ≥ 12 px mono at 4.9:1. Labels on wood use `--surface`.
- **Focus:** every interactive element shows a 2 px `--focus` ring at 2 px offset **plus** a 2 px `--surface` halo (so it reads on paper, brass and teak). Focus order on the Patri follows the reading order: birth line → panchang → D1 → ledger → D9 → daśā → yogas → colophon. No `outline: none` without a `:focus-visible` replacement.
- **Touch targets:** ≥ 44 × 44 px everywhere; beads are 18 px visual with a 44 px hit area; Ledge objects ≥ 56 px; drums 56 px tall; shutter and seal 48-56 px.
- **Screen reader:** desk objects are buttons with real names ("Janam Patri of Rahul, opens chart"); **both Kundli components expose a visually hidden `<table>` twin** (graha / sign / degree / nakshatra-pada) via `aria-describedby`; the mala announces "Yoni: 4 of 4 points"; the palm overlay announces each line's confidence as a number; drum values are `aria-live="polite"` debounced 300 ms; decorative material (rollers, shadows, grain, flame, unearned beads) is `aria-hidden` and `data-decorative="true"`.
- **Keyboard:** drums are `role="spinbutton"` with arrow keys (±1), PageUp/Down (±10) and typed entry; the loupe has a Tab-through-planets mode with Enter to read; the stylus has a keyboard fallback (select a line, arrows nudge the active handle 1 px, Shift+arrows 10 px); the seal fires on a held Space/Enter.
- **Language:** `<html lang="en">`; every Devanagari run is wrapped in `lang="hi"` (or `lang="sa"` for Sanskrit terms) so TTS switches voice; a Latin transliteration always sits beside a Devanagari term.
- **Colour independence:** doṣas are lac beads **and** labelled; boundary badges are asterisks **and** footnoted; palm confidence is ink darkness **and** a number; the Rāhu Kāl band carries its time range as text.
- **Zoom and scaling:** layouts hold at 200 % browser zoom with no horizontal scrollbar (the paper column reflows, rollers stay pinned); the system font scale is honoured to 1.3× before the graha ledger switches to a stacked two-line row. No text inside raster images.

### 3.11 Android chrome

- **Edge-to-edge:** overlay the WebView; status-bar style `Dark` (light icons) on the night desk and `Light` on the morning terrace, switched by the same effect that sets `data-theme`. The status-bar band is teak (`--bg`), so the parapet strip starts below `env(safe-area-inset-top)`.
- **Splash:** teak `#1A110B` with the diya mark centred, `launchAutoHide: false`, fading into the desk over 240 ms (the app hides it itself). No white flash, no double splash.
- **Adaptive icon:** foreground = brass diya with a vermilion flame tip (18 % safe padding), background = `@color/chowki_teak` `#1A110B`, plus a `<monochrome>` diya-silhouette layer. Delete the Capacitor placeholder mipmaps.
- **Manifest colours:** `theme_color #1A110B`, `background_color #F4EAD3`, `display: standalone`, `orientation: portrait` (only the Rooftop route unlocks landscape at runtime).
- **Gestures:** the Ledge sits at `calc(64px + env(safe-area-inset-bottom))`; no horizontal drag gesture may begin within 24 px of a screen edge (the daśā ribbon and varga pager carry `touch-action: pan-y` edge guards); predictive back is enabled and mapped to "return to Chowki" with the reverse `object-open`.
- **Android colours resource** (`res/values/colors.xml`): `chowki_teak #1A110B`, `chowki_paper #F4EAD3`, `chowki_sindoor #B5301C`, `chowki_brass #C9A24A`, `chowki_ledge #241811`.

---

## 4. Screens

**Global rules.** Phone-first 390-430 px portrait, one-handed. **The Ledge**, a 64 px + safe-area teak bar along the bottom edge, appears on every screen except Capture and Rooftop. It holds five miniature objects: **Scroll** (Patri) · **Leaves** (Circle) · **Dial** (Today) · **Loupe** (Hast) · **Lamp** (theme). Each is a ≥ 56 px target with an engraved label (`--text-xs`, `--surface` on `--ledge`); the active object sits 4 px higher with a warmer highlight. Predictive back and a swipe-down on the top roller return to the Chowki. On desktop (≥ 900 px) the desk widens, the paper stays a 480-560 px column, objects lie beside it, and the Ledge becomes the **left** desk edge (vertical).

Routes (`createHashRouter`): `#/` · `#/today` · `#/circle` · `#/leaf/new` · `#/leaf/:id/edit` · `#/patri/:id` · `#/patri/:id/sky` · `#/hast/:id` · `#/hast/:id/capture` · `#/milan/:a/:b` · `#/drawer` · `#/lost` (catch-all).

### 4.1 The Chowki (home), `#/`

```
PHONE                                      DESKTOP (>= 900px)
┌──────────────────────────────┐          ┌──────────────────────────────────────────────────┐
│ ~ parapet sky strip (44px) ~ │          │ ~~~~~~~~~~~~ parapet sky strip ~~~~~~~~~~~~~~~~~~ │
│ नमस्ते, Rahul · कृष्ण त्रयोदशी  │          │ नमस्ते, Rahul · Kṛṣṇa Trayodaśī, Puṣya 4         │
│┌────────┐          ┌────────┐│          │ ┌──────┐   ┌────────────────────┐   ┌──────┐     │
││ leaf   │          │ brass  ││          │ │leaf  │   │  ┌──────────────┐  │   │brass │     │
││ bundle │          │ dial   ││          │ │bundle│   │  │  rolled      │  │   │dial  │     │
││ (3)    │          │ 14:52  ││          │ │      │   │  │  Patri       │  │   │      │     │
│└────────┘          └────────┘│          │ └──────┘   │  │  (Rahul)     │  │   └──────┘     │
│         ┌──────────────┐     │          │            │  └──────────────┘  │                │
│         │  rolled      │     │          │ ┌──────┐   │   indigo cloth     │   ┌──────┐     │
│         │  Patri       │     │          │ │loupe │   └────────────────────┘   │ diya │     │
│         │  ══ Rahul ══ │     │          │ └──────┘                            └──────┘     │
│         └──────────────┘     │          └──────────────────────────────────────────────────┘
│┌──────┐              ┌──────┐│
││loupe │              │ diya ││
│└──────┘              └──────┘│
├──────────────────────────────┤
│ scroll leaves dial loupe lamp│  <- Ledge
└──────────────────────────────┘
```

- **Purpose:** the desk itself. Objects are the navigation; the Ledge is the safety net.
- **Components:** `ParapetSky` (2D SVG horizon for the active profile's place, now), `Greeting` (Yatra One, ≤ 6 words), `DeskObject` ×5, `Ledge`.
- **States:** *empty* (no profiles), the scroll is blank with a stylus resting on it and the greeting reads "Write your first leaf"; *loading*, objects present, dial hands draw in; *error* (engine failure), a haldi note pinned under the dial: "The dial is stuck, check the date"; *success*, normal.
- **Gestures:** tap an object → `object-open`; long-press → engraved name label; swipe up from the dial → Rooftop (`sky-pitch`); tap the diya → light/snuff (a manual theme override; "auto by sun altitude" resumes only when tapped again).

### 4.2 Today's leaf (Panchang), `#/today`

```
┌──────────────────────────────┐
│ ▓ brass dial (compact, 96px) │  tithi hand · nakshatra ring · Rahu Kaal shaded arc
│ ══ आज · Today ══════════════ │  turmeric band + vermilion hairline
│ Tithi     Kṛṣṇa Trayodaśī    │  ends 17:04
│ Vara      Maṅgalavāra        │
│ Nakshatra Puṣya · पुष्य       │  pada 4, ends 09:17 (+1)
│ Yoga      Parigha            │  ends 21:04
│ Karana    Gara               │  ends 17:04
│ ── ruled rows, end-times in mono, right-aligned ──
│ Sunrise 06:12  Sunset 18:31  │  Rahu Kaal 15:22-16:54 (haldi band)
│ ‹ ● ›  Moon pager (phase ages as you swipe days)
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```

- **Components:** `BrassDial`, `TurmericBand`, `LedgerRow`, `DayBar`, `MoonPager`.
- **States:** location unknown → uses the active profile's birthplace (**never asks for GPS**); offline → identical, because everything is computed locally.
- **Gestures:** swipe the Moon horizontally to page days (the phase ages, `selectionChanged` per day); tap a row → footnote sheet with the exact end instant and the sunrise convention used.

### 4.3 Leaf bundle (Circle), `#/circle`

```
┌──────────────────────────────┐
│ ═ board ═════════════════════│  wooden top board
│ ╭ leaf ─ Rahul ─ ♆ अनुराधा ─╮│  name (Yatra One), Moon nakshatra, birth line scratched
│ ╭ leaf ─ Priya ─ रोहिणी ────╮│
│ ╭ leaf ─ Amma ─ मघा ───────╮ │
│ ╭ blank leaf + stylus ─────╮ │  "New leaf"
│ ═ board ═══ red thread ○═════│  drag the thread end to untie/fan
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```

- **Components:** `LeafStack`, `Leaf` (face `--surface-2`, ruled `--border`), `ThreadKnot`, `BlankLeaf`.
- **States:** empty → only the blank leaf and the stylus; ≥ 12 leaves → the stack scrolls while the boards stay pinned.
- **Gestures:** drag the thread → `leaf-fan`; tap a leaf → lift and clip it to the scroll (`object-open` into the Patri); swipe left on a leaf → **Export** (wax envelope, passphrase, AES-GCM) or **Burn** (hold 600 ms, the edge chars in `--danger`; removes the profile *and* its palm blobs).

### 4.4 Writing the leaf, `#/leaf/new`, `#/leaf/:id/edit`

```
┌──────────────────────────────┐
│ ~ parapet sky (scrubs live) ~│
│ ═ नया पत्ता · New leaf ══════ │
│ Name  [ Rahul________ ]      │  Tiro on paper, ruled row
│ ┌────┬────┬──────┬────┬────┐ │
│ │ 14 │ 03 │ 1994 │ 07 │ 25 │ │  brass drums (day mo year hh mm), 56px tall
│ └────┴────┴──────┴────┴────┘ │
│ Place [ Bengaluru, KA, IN  ] │  bundled GeoNames; "search online ⌑" stamp
│ ▓ ASIA/KOLKATA · +05:30 · JD 2449425.5799 · LAGNA ♓ MEENA ▓   engraved strip
│ ○ Bombay Time +04:51 (pre-1955)         override drum
│ Ayanamsa: Lahiri (SE-true) · Node: true   small brass plate → Drawer
│ [ ◉ hold to seal the leaf ]  vermilion, 48px, thumb zone
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```

- **Components:** `ParapetSky`, `LedgerInput`, `BrassDrum` ×5 (+1 override), `PlaceSearch` (minisearch over the bundled gazetteer; results as a ruled list with lat/lon in mono), `EngravedStrip`, `SealButton` (hold).
- **The engraved strip is the contract with reality.** It always prints the resolved zone, the offset actually used, the Julian Day to four decimals and the current Lagna sign. For the running example it reads exactly `ASIA/KOLKATA · +05:30 · JD 2449425.5799 · LAGNA ♓ MEENA`. When `offsetSource === 'override'` add `(manual)` and a haldi note.
- **States:** place not found → the row shows "not in the bundle" plus the online stamp (Open-Meteo first, Nominatim only on submit); timezone uncertain (near a border) → haldi note; invalid date (31 Feb) → the day drum **refuses** the detent with a dull tick and the value never changes; saving → the seal presses; error → the lac seal cracks in `--danger` with the reason.
- **Gestures:** flick the drums; tap a drum → native picker / keyboard entry fallback; hold the seal 600 ms.
- **Desktop:** drums become an inline row driven by keyboard arrows; the sky strip grows to 120 px.

### 4.5 Janam Patri, `#/patri/:id`

```
PHONE                                          DESKTOP
╔════ brass roller (thickens on scroll) ═══╗   ┌──────┬────────────────────────┬──────┐
║ ◐ lac seal (pull down to reveal)         ║   │leaves│ ╔═ roller ═════════╗   │dial  │
║ ══ जन्म पत्री · Rahul ══════════════════ ║   │      │ ║ (480px paper col) ║   │      │
║ 14 Mar 1994 · 07:25 IST · Bengaluru      ║   │      │ ║ same sections    ║   │loupe │
║ ASIA/KOLKATA +05:30 · JD 2449425.5799    ║   │      │ ║ margin notes →   ║ ← citations
║ ══ जन्म पंचांग ══ tithi/vara/nakshatra…  ║   │      │ ╚═ roller ═════════╝   │diya  │
║ ══ राशि चक्र · Fig. 1 D1 ══════════════ ║   └──────┴────────────────────────┴──────┘
║        ◇──────◇            [Dev/Lat ring]║
║      ◇  2  ◇  1  ◇  12  ◇   ← diamond,  ║
║        ◇──● tilak──◇        ink-drawn    ║
║ Fig. 1, Rāśi (D1), Lahiri SE-true, whole-sign, true node
║ ══ ग्रह · Grahas ═══ ledger ════════════ ║
║ Graha  Sign   Degree      Nakshatra-pada  Lord  ⚑
║ सू Sun  Kumbha 29°28′52″  P.Bhādrapadā 3  Gu       ← no asterisk: 31′08″ from the edge
║ च Moon  Mīna 19°10′08″    Revatī 1        Bu       ← vermilion * only when boundary != null
║ ══ नवांश · Fig. 2 D9 ══ (swipe → D2, D3, D7…) ║
║ ══ दशा · Dasha ══ accordion ribbon ══════ ║
║ ▐Śani ▌Budha ▌Ketu ▌ (brass clip = now)   ║
║ ══ योग · Yogas ══ "Tradition says…" ¹     ║
║ ══ colophon ══ disclaimer · preset · engine ║
╚════ brass roller ════════════════════════╝
│ Ledge                                    │
```

- **Components:** `Roller` ×2, `LacSeal`, `TurmericBand`, `BirthLine`, `PanchangRows`, `KundliNorth` / `KundliSouth` (flip), `ScriptRing` (Devanagari/Latin toggle on the top roller), `Loupe`, `GrahaLedger` (tabular, ′ ″ muted, boundary asterisk), `VargaPager`, `DashaRibbon` (accordion; pull a fold for pratyantar), `YogaParagraph` (citation superscripts → footnote sheet), `Colophon`.
- **The asterisk rule:** the vermilion `*` appears **only** when `graha.boundary !== null` (within 2′ of a sign, nakshatra or pada edge). Do not decorate rows with it. For the running example the Sun sits 31′08″ from the Kumbha/Meena edge and therefore carries **no** asterisk, and neither does any other row, because no graha in the reference chart is inside 2′ of an edge.
- **States:** *loading*, the diamond frame draws while the numbers compute (< 50 ms; **the draw is the wait**, there is no spinner and no async boundary inside a cast); *cached*, no redraw on revisit; *preset changed*, the seal grows a haldi "recompute" tab; *error*, the lac seal cracks with the reason and the previously cached Patri stays on screen; *near boundary*, asterisks plus a footnote: "within 1′42″ of Anurādhā/Jyeṣṭhā; the Drik preset would read Jyeṣṭhā" (a **synthetic** fixture, λ_sid = 226.6383°; the reference chart never fires this state).
- **Gestures:** scroll = unroll; pull-down = reveal the seal; hold the seal = recompute; tap a planet = loupe; drag the loupe = planet-to-planet register; swipe the paper = flip North/South; swipe a varga figure = next varga; flick the ribbon = BRASS momentum; long-press a ribbon tick = bookmark (a brass paperclip).

### 4.6 Rooftop sky, `#/patri/:id/sky`

```
┌──────────────────────────────┐
│ ·    ·  ✦ Jupiter   ·    ·   │  R3F dome, stars mag <= 6, brass zodiac ring w/ 27 ticks
│   ·    ◯ Moon (phase) ·      │
│ ·  ─────brass ring─────── ·  │
│ ▒▒▒▒ east: Lagna beam ▒▒▒▒▒▒ │
│ ▁▁▁ parapet silhouette ▁▁▁▁▁ │
│ ▓ 07:25 IST · LAGNA MEENA · U.BHĀDRAPADĀ ▓  engraved strip
│ (◎ scrub ring ±12h)   ⇩ back │
└──────────────────────────────┘
```

- **Components:** `SkyDome` (three r185 + R3F 9, BSC5 stars, **lazy chunk**), `ZodiacRing` (brass torus with 27 nakshatra ticks), `PlanetBillboards` (Devanagari abbreviations on brass discs), `LagnaBeam`, `ScrubRing` (BRASS), `EngravedStrip`, `PosterAction` (1080 × 1920 PNG with the name in Yatra One).
- **States:** no WebGL, reduced motion, or `webglcontextlost` → the **painted sky** (a d3-geo stereographic SVG of the same data, ink dots on indigo) with no error toast; loading → painted sky first, dome crossfades in.
- **Gestures:** drag to look (BRASS inertia); scrub ring ±12 h; swipe down → the desk; opt-in device tilt.
- **No Ledge** here (full-bleed); a single "⇩ desk" text button sits in the thumb zone. This is the only route that unlocks landscape.

### 4.7 Hast Rekha, capture, `#/hast/:id/capture`

```
┌──────────────────────────────┐
│ ▓ FILL THE FRAME · PALM FLAT · EVEN LIGHT ▓
│ ┌──────────────────────────┐ │
│ │   camera / picked photo  │ │
│ │   ╭ chalk hand outline ╮ │ │  lime-white 1px outline on the cloth
│ │   │                    │ │ │
│ │   ╰────────────────────╯ │ │
│ └──────────────────────────┘ │
│ sharpness ▮▮▮▮▯  exposure ▮▮▯▯▯  (haldi when low)
│ Right hand · dominant  [flip]│
│        [ ◉ shutter ]         │  vermilion stamp, 56px, enabled only when a hand is detected
│  Pick from gallery · Cancel  │
└──────────────────────────────┘
```

- **Components:** `CameraView` (`@capacitor/camera` on Android; `getUserMedia` / file input on web), `HandOutline`, `QualityGauges` (Laplacian variance + luma histogram), `HandednessToggle`, `Shutter`.
- **States:** permission denied → gallery-only with a plain note (no repeated prompt, no crash); no hand detected → shutter disabled, outline faint; back of the hand detected → "turn your palm to the camera"; too dark or blurred → haldi gauges and "move to the window"; processing → an ink line draws under the frame.
- **No Ledge** (full-bleed). Cancel returns to the loupe desk. Portrait only.

### 4.8 Hast Rekha, loupe desk and reading, `#/hast/:id`

```
PHONE                                          DESKTOP
┌──────────────────────────────┐              ┌────────────────────┬──────────────────────┐
│ ══ हस्त रेखा · Right hand ══ │              │  print (512px)     │  reading leaf        │
│ ┌──────────────────────────┐ │              │  + loupe + stylus  │  ruled findings      │
│ │  palm print (rectified)  │ │              │                    │  citations in margin │
│ │  a. heart ─── ink        │ │              └────────────────────┴──────────────────────┘
│ │  b. head  ─── ink        │ │
│ │  c. life  ┄┄┄ faint+haldi│ │  <- low confidence: dashed, "trace to confirm"
│ │      (◯ brass loupe)     │ │
│ └──────────────────────────┘ │
│ Trace lines ✎   Other hand ⇄ │
│ ══ Findings ═══════════════ │
│ Element   Fire (W/L 0.84, F/L 0.71)
│ a. Heart  len 0.92 · curve 0.31 · conf 0.88
│ b. Head   len 0.78 · curve 0.12 · conf 0.81
│ c. Life   len 0.66 · curve 0.42 · conf 0.47 ⚑
│ Tradition says… ¹ ² (Samudrika Shastra)
│ Burn this print (hold)       │  --danger text
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```

- **Components:** `PalmPrint` (canvas, CSS `grayscale(.35) contrast(1.15)`, it is a *print*, not a museum plate), `LineOverlay` (SVG paths, `ink-draw`), `Callouts` a/b/c, `Loupe`, `StylusEditor` (Bézier handles, Motion drag), `FindingsLedger`, `ReadingParagraph`, `BurnAction`.
- **States:** no photo → an empty print frame reading "Lay your hand here" with the loupe resting beside it; MediaPipe loading → ink line; OpenCV lazy-loading (only when lines are requested) → "sharpening the stylus…"; lines not found → straight to trace mode; both hands captured → two prints side by side (swipe between them).
- **Gestures:** the loupe follows touch; stylus drag; long-press a line → hide/show; hold Burn.

### 4.9 Guna Milan, `#/milan/:a/:b`

```
┌──────────────────────────────┐
│ ══ गुण मिलान · Milan ═══════ │
│ ╔ Rahul ╗   mauli   ╔ Priya ╗│  two small scrolls tied together; Manglik as sindoor marks
│ ║ ♓ रेव ║ ~~~~~~~~ ║ ♉ रोहि ║│
│ ╚═══════╝          ╚═══════╝ │
│            20 / 36           │  --text-5xl Tiro; band stamped in lac: "acceptable"
│ Varna  ●                     │  1 / 1
│ Vashya ● ●                   │  2 / 2
│ Tara   ● ◐ ○                 │  1.5 / 3
│ Yoni   ● ● ○ ○               │  2 / 4
│ Maitri ◐ ○ ○ ○ ○             │  0.5 / 5
│ Gana   ● ● ● ● ● ●           │  6 / 6
│ Bhakoot● ● ● ● ● ● ●         │  7 / 7   (brass, 3/11 is not a dosha)
│ Nadi   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       │  0 / 8   (◆ lac = dosha; this is the row that fires)
│ ── 10-porutham (second, shorter thread) ▸
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```

- **Components:** `ScrollPair`, `MauliThread`, `ScoreNumeral`, `BeadRow` ×8 (44 px hit areas on 18 px beads), `KootaNote`, `LacBandStamp`, `PoruthamThread` (collapsed; v1).
- **The beads must equal the engine.** Draw this screen from `ashtakoota()`'s output, never the other way round. For Rahul (Moon in **Revatī**, Mīna) × Priya (Moon in Rohiṇī, Vṛṣabha) the engine returns **1 / 2 / 1.5 / 2 / 0.5 / 6 / 7 / 0 = 20 "acceptable"**. Bhakūṭa is **not** a doṣa for that pair (Mīna ↔ Vṛṣabha is a 3/11 axis) so those seven beads are **brass**; the single lac row is **Nāḍī**, which fires because both Moons are Antya. Older mocks that put seven lac Bhakūṭa beads on the thread are wrong; §0.1 lists the superseded totals.
- **States:** only one profile → the second scroll is a dotted outline: "drag a leaf from the bundle"; tallying → beads slide (tap to finish instantly); complete → knot plus lac stamp.
- **Gestures:** drag a leaf in; tap a koota row → its rule and both nakshatras in Devanagari and Latin; swipe the pair to swap roles (the boy/girl framing is a setting and defaults to A/B).
- **Desktop:** the two scrolls become full 480 px charts side by side above the mala.

### 4.10 The Drawer, `#/drawer`

```
┌──────────────────────────────┐
│ (desk, dimmed by --ink 0.25) │
│ ╔═══════ wooden drawer ══════════════════════════╗
│ ║ ▓ AYANAMSA ▓ magnified dial segment:            ║
│ ║   |Drik-mean |SE-mean |SE-true|  ticks 24″ apart ║
│ ║ Node: true ◉ mean ○   Dasha year: 365.25 / 360  ║
│ ║ Sunrise: upper limb+refraction / disc centre    ║
│ ║ Language: EN HI TA TE  · Devanagari digits ○    ║
│ ║ Chart script: देव / Lat  · Sound ◉ · Haptics ◉   ║
│ ║ Lamp: auto (sun) / lit / snuffed                ║
│ ║ Calm desk ○   ·  Prepare for offline ▸          ║
│ ║ Precision mode (AGPL lane) ○, DISABLED, explains relicensing
│ ║ Export (wax envelope) · Import                  ║
│ ║ ── Colophon: engine, presets, fonts, GeoNames CC BY, MediaPipe, BSC5, disclaimer ──
│ ╚═════════════════════════════════════════════════╝
└──────────────────────────────┘
```

- **Components:** `Drawer` (sheet, PAPER spring), `DialSegment` (SVG; the three ayanamsa presets as ticks on a magnified brass arc, each labelled with its arcsecond difference **at the current chart's date**), `RadioRow` (ruled), `ToggleRow` (brass slide switch), `ExportEnvelope`, `ColophonList` (hanging indents).
- **States:** preset changed → every cached Patri gets the haldi "recompute" tab; export → passphrase sheet; import error → lac note. "Prepare for offline" warms the model, OpenCV and sky caches with a byte-progress line.
- **Gestures:** drag down to close; open from any screen by pulling up from the Ledge's right end, or long-pressing the Lamp.

### 4.11 Lost leaf, `#/lost`

A blank leaf on the desk: "This leaf is not in the bundle." and a single text link back to the Chowki. Everything else works offline by construction; the Hast and Rooftop screens show a one-line note the first time they are opened offline before their chunk is cached ("the loupe is still in the drawer, open this screen once with a connection").

### 4.12 Transitions between screens

| From → To | Transition |
|---|---|
| Chowki → any object's screen | `object-open` View Transition, 320 ms `--ease-in-out`; the Ledge and desk margins are shared elements and do not move |
| Any screen → Chowki (back / predictive back) | the reverse `object-open` |
| Chowki → Rooftop | `sky-pitch` (480 ms), painted sky first, dome crossfades |
| Rooftop → Chowki | swipe down, reverse `sky-pitch` |
| Any → Drawer | `drawer-slide` (PAPER), desk dims 0.25 |
| Leaf sealed → Patri | `seal-thunk` then route change; the Patri arrives already drawing (`ink-draw`) |
| Circle leaf tapped → Patri | the leaf lifts and clips to the scroll (`object-open`) |
| Patri ↔ South grid | in-place `rotateY` flip with PAPER, 480 ms (not a route change) |
| Reduced motion | every one of the above becomes a 160 ms crossfade |

### 4.13 Component inventory

| Component | Variants | States |
|---|---|---|
| `Ledge` | phone (bottom, 5 objects) · desktop (left edge, vertical) | active raised; hidden on Capture/Rooftop |
| `DeskObject` | scroll · bundle · dial · loupe · diya · globe | rest · pressed (lift 2 px) · labelled (long-press) · disabled (greyed ink, no shadow) |
| `Roller` | top · bottom (brass caps, `--radius-lg`) | thickness bound to scroll progress; static under reduced motion |
| `LacSeal` | nakshatra symbol · cracked (error) · haldi tab (stale) | hidden · revealed · held (0-600 ms) · fired |
| `TurmericBand` | with kumkum tick (section) · plain (sub-section) · with right-aligned mono meta | - |
| `LedgerRow` | label/value · numeric (tabular) · with citation · with boundary asterisk | default · zebra (`--surface-2` at 50 %) · selected (loupe over it) |
| `KundliNorth` / `KundliSouth` | D1…D60; Devanagari/Latin; 320-480 px | drawing · drawn · flipped · loupe-focused house |
| `Tilak` | lagna · manglik (on Milan scrolls) | dab-in · static |
| `Loupe` | chart · palm · register (planet-snapping) | resting · rising · following · settled |
| `BrassDrum` | day · month · year · hour · minute · offset | idle · dragging · coasting · at-detent · **refused** (dull tick) |
| `EngravedStrip` · `ParapetSky` | zone/offset/JD/lagna; home (now) · entry (scrubbing) | digits setting · stable; day/dusk/night by sun altitude |
| `DashaRibbon` | MD · AD (fold) · PD (inner fold) | folded · pulled · clipped (bookmark) |
| `YogaParagraph` | with citations · with "show me" link to the chart element | - |
| `Leaf` · `ThreadKnot` | profile · blank · dotted drop target; bundle · mala · pair knots | stacked · fanned · lifted · burning; tied · untying · snapped |
| `BeadRow` | koota 1-8 · porutham (boolean) | wood · sliding · brass · lac (doṣa) |
| `PalmPrint` | right · left · pair | empty frame · loading · printed · burning |
| `LineOverlay` | heart · head · life · fate | drawing · drawn · faint (low confidence) · traced (vermilion) |
| `StylusEditor` | 3-4 Bézier paths | idle · dragging handle · committed |
| `QualityGauge` · `Shutter` / `SealButton` | sharpness · exposure; vermilion stamp 48-56 px | ok · low (haldi); enabled · disabled · holding · fired |
| `Drawer` · `DialSegment` | settings · colophon · export; three ayanamsa ticks | closed · open · passphrase; selected tick vermilion |
| `ToggleRow` / `RadioRow` / `FootnoteSheet` | brass switch · ruled radio · citation/boundary/end-time sheet | on/off with focus ring; sheet rises with PAPER |
| `Toast` (lac note) | info (ink) · warning (haldi fill, ink text) · danger (lac) | 4 s, dismiss by swipe |
| `Button` | text-with-underline (default) · stamp (**one per screen**) · danger text | hover/press/focus/disabled |

All primitives come from shadcn/ui on Base UI (Dialog → Drawer and FootnoteSheet, RadioGroup, Switch, Tabs → ScriptRing), restyled through tokens. **No component is forked.**

---

## 5. Data model

All domain types live in `src/engine/types.ts`; persisted shapes in `src/data/db.ts`. **Angles are degrees, always normalised to `[0, 360)`. Times are UTC epoch milliseconds plus the resolved zone, never local strings.**

```ts
// ─── identity & storage ──────────────────────────────────────────────────────
export type ProfileId = string;   // crypto.randomUUID()
export type Deg = number;         // 0 <= d < 360
export type Jd  = number;         // Julian Day, UT unless the field says TT

export interface Place {
  name: string;            // "Bengaluru"
  admin1?: string;         // "Karnataka"
  country: string;         // ISO-3166 alpha-2, "IN"
  lat: number;             // +N
  lon: number;             // +E
  elevation?: number;      // metres; unused by the engine, shown in the colophon
  geonameId?: number;      // present when it came from the bundle
  source: 'bundle' | 'open-meteo' | 'nominatim' | 'manual';
}

export interface BirthMoment {
  localY: number; localMo: number; localD: number;   // as written on the leaf
  localH: number; localMi: number;                   // 24h, local clock at the place
  place: Place;
  zone: string;                    // IANA, e.g. "Asia/Kolkata" (from tz-lookup, editable)
  offsetOverrideMin?: number;      // e.g. 291 for Bombay Time +04:51; wins over the tzdb
  utcMs: number;                   // resolved instant, the single source of truth
  offsetMin: number;               // the offset actually used, minutes east of UTC
  jdUt: Jd;                        // utcMs -> JD_UT
  offsetSource: 'tzdb' | 'override';
}

export interface Profile {
  id: ProfileId;
  name: string;
  birth: BirthMoment;
  handedness: 'right' | 'left';    // dominant hand, for the palm framing
  gender?: 'a' | 'b';              // labels the two sides of a Milan; never a rule input
  createdAt: number; updatedAt: number;
}

// ─── engine configuration (part of every cache key) ──────────────────────────
export type AyanamsaPreset = 'se-true' | 'se-mean' | 'drik-mean';
export type NodeMode       = 'true' | 'mean';
export type SunriseMode    = 'upper-limb-refracted' | 'disc-centre';

export interface EnginePreset {
  ayanamsa: AyanamsaPreset;        // default 'se-true'
  node: NodeMode;                  // default 'true'
  dashaYearDays: 365.25 | 360;     // default 365.25
  sunrise: SunriseMode;            // default 'upper-limb-refracted'
  houseSystem: 'whole-sign' | 'bhava-chalit';  // the chart is always whole-sign; this drives yogas
}

/** Bump ENGINE_EPOCH whenever a change moves existing numbers, so caches recompute. */
export const ENGINE_EPOCH = 1;
export const PRESET_HASH = (p: EnginePreset) =>
  `${ENGINE_EPOCH}|${p.ayanamsa}|${p.node}|${p.dashaYearDays}|${p.sunrise}|${p.houseSystem}`;

// ─── the chart ───────────────────────────────────────────────────────────────
export type GrahaId = 'SU'|'MO'|'MA'|'ME'|'JU'|'VE'|'SA'|'RA'|'KE';
export type SignIdx = 0|1|2|3|4|5|6|7|8|9|10|11;   // 0 = Mesha (Aries)

export interface Graha {
  id: GrahaId;
  lonTropical: Deg;        // apparent, true ecliptic of date
  lonSidereal: Deg;
  speed: number;           // deg/day, sidereal; negative = retrograde
  retrograde: boolean;
  sign: SignIdx;
  degInSign: number;       // 0..30
  nakshatra: number;       // 0..26, Ashwini = 0
  pada: 1|2|3|4;
  nakshatraLord: GrahaId;
  house: number;           // 1..12, whole-sign from the Lagna
  dignity: 'exalted'|'moolatrikona'|'own'|'friend'|'neutral'|'enemy'|'debilitated';
  combust: boolean;
  boundary: BoundaryFlag | null;   // set when within 2' of a sign/nakshatra/pada edge
}

export interface BoundaryFlag {
  kind: 'sign' | 'nakshatra' | 'pada';
  arcminutesTo: number;    // distance to the nearest edge, in arcminutes
  otherSide: string;       // "Jyeṣṭhā", what the neighbouring classification would read
}

export interface VargaChart {
  varga: 1|2|3|7|9|10|12|30|60;
  ascendantSign: SignIdx;
  placements: Record<GrahaId, SignIdx>;
}

export interface DashaNode {
  lord: GrahaId;
  startMs: number; endMs: number;
  level: 1|2|3;            // maha / antar / pratyantar
  children?: DashaNode[];  // level 3 is generated lazily
}

export interface Panchang {
  tithi: { index: number; name: string; paksha: 'shukla'|'krishna'; endMs: number };
  vara: { index: 0|1|2|3|4|5|6; name: string };          // 0 = Ravivāra
  nakshatra: { index: number; name: string; endMs: number };
  yoga: { index: number; name: string; endMs: number };
  karana: { index: number; name: string; endMs: number };
  sunriseMs: number; sunsetMs: number; moonriseMs: number | null; moonsetMs: number | null;
  rahuKaal: [number, number]; yamaganda: [number, number]; gulika: [number, number];
  abhijit: [number, number] | null;                      // absent on Wednesdays by convention
  masaAmanta: string; masaPurnimanta: string; ritu: string;
  ayana: 'uttarayana'|'dakshinayana';
  moonIllumination: number;                              // 0..1, drives --moon-k
}

export interface Citation { text: string; ref: string; }  // { text: "BPHS", ref: "36.13" }

export interface YogaHit {
  id: string;                    // 'gaja-kesari'
  name: string; nameDev: string;
  strength: 'full' | 'partial' | 'cancelled';
  because: Array<{ grahaId?: GrahaId; house?: number; sign?: SignIdx; note: string }>;
  citation: Citation;
  cancelledBy?: string;          // rule id, when strength === 'cancelled'
}

export interface Patri {
  profileId: ProfileId;
  preset: EnginePreset; presetHash: string;
  engine: { name: 'astronomy-engine'; version: string; ayanamsaArcsec: number };
  jdUt: Jd; jdTt: Jd; ayanamsa: Deg;
  lagna: { lonTropical: Deg; lonSidereal: Deg; sign: SignIdx; degInSign: number;
           nakshatra: number; pada: 1|2|3|4; boundary: BoundaryFlag | null };
  mc: { lonSidereal: Deg; sign: SignIdx };
  grahas: Record<GrahaId, Graha>;
  vargas: Record<number, VargaChart>;      // keyed by varga number; D1 and D9 always present
  dasha: DashaNode[];                      // 9 maha-dashas, antars filled, pratyantars lazy
  birthPanchang: Panchang;
  yogas: YogaHit[];
  computedAt: number; computeMs: number;   // evidence for the budget; printed in the colophon
}

// ─── matching ────────────────────────────────────────────────────────────────
export type KootaId = 'varna'|'vashya'|'tara'|'yoni'|'maitri'|'gana'|'bhakoot'|'nadi';

export interface KootaResult {
  id: KootaId; nameDev: string; max: 1|2|3|4|5|6|7|8;
  score: number;                 // may be 0.5 / 1.5
  dosha: boolean;
  because: string;               // "Nadi: both Madhya", shown under the bead group
  cancellation?: { applied: boolean; rule: string; citation: Citation };
  citation: Citation;
}

export interface MilanResult {
  a: ProfileId; b: ProfileId; presetHash: string;
  kootas: KootaResult[];         // always 8, in bead order
  total: number;                 // 0..36
  band: 'not-recommended'|'acceptable'|'very-good'|'excellent';
  manglik: { a: ManglikStatus; b: ManglikStatus };
  porutham?: Array<{ id: string; pass: boolean; note: string }>;   // v1
}

export interface ManglikStatus {
  present: boolean;
  from: Array<'lagna'|'moon'|'venus'>;
  cancellations: string[];       // rule ids that cancel it
  citation: Citation;
}

// ─── palmistry ───────────────────────────────────────────────────────────────
export interface Landmark { x: number; y: number; z: number; }   // normalised 0..1 (image frame)

export interface HandCapture {
  id: string; profileId: ProfileId;
  hand: 'right' | 'left';
  originalBlobKey: string;       // key into the blobs table
  rectifiedBlobKey: string;      // 512x512 canonical print
  landmarks: Landmark[];         // 21, in the ORIGINAL image frame
  worldLandmarks: Landmark[];    // 21, metres, view-invariant, the ratios use these
  handednessScore: number;       // MediaPipe confidence; reject < 0.8
  homography: number[];          // 9 numbers, row-major 3x3, original -> canonical
  quality: { sharpness: number; exposure: number };   // Laplacian variance; luma-histogram score
  capturedAt: number;
}

export type PalmLineId = 'heart' | 'head' | 'life' | 'fate';

export interface PalmLine {
  id: PalmLineId;
  path: Array<[number, number]>;  // canonical 512 frame, resampled to 64 points
  source: 'detected' | 'traced';
  confidence: number;             // 0..1; < 0.6 renders dashed and prompts the stylus
  metrics: { length: number; curvature: number; breaks: number; branches: number; depth: number };
}

export interface PalmReading {
  captureId: string;
  element: 'earth' | 'air' | 'fire' | 'water';
  ratios: { widthOverLength: number; fingerOverPalm: number; indexOverRing: number; thumbAngleDeg: number };
  lines: PalmLine[];
  hits: Array<{ ruleId: string; text: string; citation: Citation; measured: string }>;
  computedAt: number;
}

// ─── settings ────────────────────────────────────────────────────────────────
export interface Settings {
  preset: EnginePreset;
  theme: 'auto' | 'night' | 'day';       // auto = by real sun altitude at the active place
  chartScript: 'devanagari' | 'latin';
  devanagariDigits: boolean;
  language: 'en' | 'hi' | 'ta' | 'te';   // hi/ta/te are Someday; the shape exists from day 1
  sound: boolean; haptics: boolean; calmDesk: boolean;
  activeProfileId: ProfileId | null;
  onlineLookupAllowed: boolean;          // default false, the "search online" stamp asks once
  handFraming: 'dominant' | 'classical'; // both framings are offered for the palm
}
```

**Dexie schema (`src/data/db.ts`), version 1:**

```ts
db.version(1).stores({
  profiles: 'id, name, updatedAt',
  patris:   '[profileId+presetHash], profileId, computedAt',   // cached charts
  palms:    'id, profileId, hand, capturedAt',                 // HandCapture rows
  blobs:    'key',                                             // { key, blob } photos, out of line
  readings: 'captureId, profileId',
  milans:   '[a+b+presetHash]',
  places:   'geonameId, name',                                 // online lookups cached, 90-day TTL
  settings: 'key',                                             // single row 'app'
  meta:     'key',                                             // schema/engine version, presetRevision
});
```

Rules that follow from the schema:
- `blobs` is a separate table so listing profiles never drags megabytes of JPEG through the main thread.
- `patris` rows are **disposable derived data**. A preset change never migrates them: it writes `settings.preset`, bumps `meta.presetRevision`, and every row whose `presetHash` no longer matches is simply stale, the Patri screen grows a haldi "recompute" tab on the seal. That is why `presetHash` is part of the primary key.
- **Burn** deletes the `profiles`, `patris`, `palms`, `readings`, `milans` and `blobs` rows in **one transaction**. No tombstones, there is no sync.
- **Migrations** are additive and never drop a table. Every version bump ships an upgrade function *and* a migration test. Exports carry `schema`, so importing a newer file into an older build refuses with a lac note instead of corrupting data.

**Export / import format, the wax envelope.** A single binary file, extension `.chowki`:

```
<one line of JSON header>\n<AES-GCM ciphertext bytes>
header = { "v": 1, "app": "chowki", "version": "0.4.2", "schema": 1,
           "engine": "astronomy-engine@2.1.19", "preset": "se-true",
           "kdf": "PBKDF2-SHA256", "iter": 600000, "salt": "<b64 16B>",
           "iv": "<b64 12B>", "alg": "AES-GCM-256" }
```

The plaintext is `dexie-export-import`'s streaming JSON with palm Blobs base64'd inline. Import reads the header, derives the key, and on `OperationError` (wrong passphrase) shows a lac note, never a stack trace; three failures add a 2 s delay. A round trip (export → wipe → import) must restore every table byte-identically.

---

## 6. Engine and algorithms

**The engine is the product.** Everything in `src/engine/` is a pure function of its inputs, imports nothing from React or the DOM (the only exceptions are `palm/enhance.ts` and `palm/ridge.ts`, which take an `ImageData` and return an `ImageData`), **never reads the clock**, and is covered by golden fixtures. Write it first, with tests, before any pixel gets real numbers.

**The running worked example**, committed as `__fixtures__/rahul-1994.json` and used throughout:

> **Rahul · 14 March 1994 · 07:25 · Bengaluru** (12.9716 °N, 77.5946 °E), preset `se-true` / true node / 365.25-day years / upper-limb sunrise.

Shared helpers you will need everywhere (`src/engine/math.ts`): `norm360`, `sind/cosd/tand/atan2d` (degree trigonometry), `signedDelta(a, b)` returning a difference in `(−180, 180]` so the 360→0 wrap never breaks a comparison, and `mulberry32(seed)` for the only randomness in the app. **`Math.random` is never used.**

### 6.1 Resolving a birth moment (`time.ts`)

The hardest part of Indian birth data is not the astronomy, it is the clock. India has used five different offsets since 1854, and one of them (Bombay Time, +04:51) is not in the IANA database at all.

```ts
import { DateTime } from 'luxon';
import tzlookup from '@photostructure/tz-lookup';

export function resolveBirthMoment(input: {
  localY: number; localMo: number; localD: number; localH: number; localMi: number;
  place: Place; zoneOverride?: string; offsetOverrideMin?: number;
}): BirthMoment {
  const zone = input.zoneOverride ?? tzlookup(input.place.lat, input.place.lon);

  let utcMs: number, offsetMin: number, offsetSource: 'tzdb' | 'override';
  if (input.offsetOverrideMin != null) {
    // The drum wins: treat the written time as (UTC + override).
    offsetMin = input.offsetOverrideMin;
    utcMs = Date.UTC(input.localY, input.localMo - 1, input.localD, input.localH, input.localMi)
          - offsetMin * 60_000;
    offsetSource = 'override';
  } else {
    const dt = DateTime.fromObject(
      { year: input.localY, month: input.localMo, day: input.localD,
        hour: input.localH, minute: input.localMi },
      { zone },
    );
    if (!dt.isValid) throw new EngineError('TIME_INVALID', dt.invalidExplanation ?? 'bad local time');
    utcMs = dt.toMillis();
    offsetMin = dt.offset;                    // Luxon reads the browser's IANA tzdb
    offsetSource = 'tzdb';
  }

  return { ...input, zone, utcMs, offsetMin, offsetSource,
           jdUt: utcMs / 86_400_000 + 2440587.5 };
}
```

`jdTt` is not yours to guess: `Astronomy.MakeTime(new Date(utcMs)).tt` already carries TT days from J2000, so **`jdTt = 2451545.0 + astroTime.tt`**. Only the ayanamsa polynomial needs TT; everything else hands the `AstroTime` object straight to astronomy-engine.

**Historical cases the engine must get right** (assert **UTC instants**, never `.offset` in minutes, 1900 Madras is +05:21:10 = 321.1666… minutes and will not survive an integer round-trip):

| # | Local input | Zone | Offset | UTC instant | Why |
|---|---|---|---|---|---|
| TZ-1 | 1994-03-14 07:25 | `Asia/Kolkata` | +05:30 | 1994-03-14T01:55:00Z (**JD_UT 2449425.579861**) | the house reference chart |
| TZ-2 | 1943-06-01 06:00 | `Asia/Kolkata` | **+06:30** | 1943-05-31T23:30:00Z | war time, second spell (1942-09-01 → 1945-10-15) |
| TZ-3 | 1942-01-15 12:00 | `Asia/Kolkata` | +06:30 | 1942-01-15T05:30:00Z | war time, first spell |
| TZ-4 | 1942-07-01 12:00 | `Asia/Kolkata` | **+05:30** | 1942-07-01T06:30:00Z | the *gap between* the spells, the case a single-interval implementation gets wrong |
| TZ-5 | 1941-09-30 23:00 | `Asia/Kolkata` | +05:30 | 1941-09-30T17:30:00Z | one day before spell 1 |
| TZ-6 | 1945-10-16 00:30 | `Asia/Kolkata` | +05:30 | 1945-10-15T19:00:00Z | one day after spell 2 |
| TZ-7 | 1900-07-15 10:00 | `Asia/Kolkata` (Madras MMT) | **+05:21:10** | 1900-07-15T04:38:50Z | sub-minute offset, ends 1906-01-01 |
| TZ-8 | 1950-02-10 05:00 | `Asia/Kolkata` **+ override +04:51** | +04:51 (manual) | 1950-02-10T00:09:00Z | Bombay Time is not in tzdb, the override drum is the only route |
| TZ-9 | 1980-06-01 09:00 | `Asia/Kathmandu` | +05:30 | 1980-06-01T03:30:00Z | Nepal before the 1986 change |
| TZ-10 | 1990-06-01 09:00 | `Asia/Kathmandu` | +05:45 | 1990-06-01T03:15:00Z | Nepal after |
| TZ-11 | 1996-08-01 09:00 | `Asia/Colombo` | +06:30 | 1996-08-01T02:30:00Z | Sri Lanka's 1996 double change |
| TZ-12 | 2006-06-01 09:00 | `Asia/Colombo` | +05:30 | 2006-06-01T03:30:00Z | after the 2006-04-15 revert |
| TZ-13 | 1965-03-01 09:00 | `Asia/Karachi` | +05:00 | 1965-03-01T04:00:00Z | pre-1971 Pakistan |
| TZ-14 | 1968-11-21 21:40 | `America/New_York` | −05:00 | 1968-11-22T02:40:00Z | a non-Indian, DST-adjacent chart |
| TZ-15 | 2020-06-21 12:00 | `Australia/Eucla` | +08:45 | 2020-06-21T03:15:00Z | 45-minute zone, southern hemisphere |

**tzdb guard.** A dedicated test asserts the runtime's IANA data actually knows this history, and fails with a readable message, `Runtime tzdb is too old: Asia/Kolkata 1943-06-01 resolved to +05:30, expected +06:30`, so a CI image with stale ICU cannot silently corrupt every pre-1955 chart.

**Edge cases:** a non-existent local time (DST spring-forward) or an ambiguous one → Luxon reports invalid/ambiguous; show a haldi note ("this clock time did not exist here; the offset drum resolves it") and offer the override drum. Never guess. Dates outside 1600-2400 throw `EPHEMERIS_RANGE`.

### 6.2 Lahiri ayanamsa, three presets (`ayanamsa.ts`)

This is the load-bearing discovery of the project: Swiss Ephemeris' Lahiri, its nutation-free mean, and the value Drik Panchang prints are **three different numbers** separated by 19-41″. Shipping one of them silently would make every golden test unwinnable. So the preset is a **first-class input**, engraved on every chart.

```ts
const J2000_SE_MEAN   = 23.857054;   // deg, SE t0 23d15'00.658" @ JD 2435553.5, propagated (IAU-1976)
const J2000_DRIK_MEAN = 23.863800;   // deg, empirical fit to drikpanchang.com, +24.3" above SE-mean

/** General precession in longitude since J2000, arcsec (IAU 2006). */
function precessionArcsec(T: number): number {
  return 5028.796195 * T + 1.1054348 * T ** 2 + 0.00007964 * T ** 3
       - 0.000023857 * T ** 4 - 0.0000000383 * T ** 5;
}

/** Nutation in longitude, arcsec (Meeus ch. 22 short series, +-0.5"). */
export function nutationLongitudeArcsec(T: number): number {
  const O  = norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T ** 2);
  const L  = norm360(280.4665 + 36000.7698 * T);
  const Lp = norm360(218.3165 + 481267.8813 * T);
  return -17.20 * sind(O) - 1.32 * sind(2 * L) - 0.23 * sind(2 * Lp) + 0.21 * sind(2 * O);
}

export function ayanamsa(jdTt: Jd, preset: AyanamsaPreset): Deg {
  const T  = (jdTt - 2451545.0) / 36525;
  const pA = precessionArcsec(T);
  switch (preset) {
    case 'se-true':   return J2000_SE_MEAN   + (pA + nutationLongitudeArcsec(T)) / 3600;
    case 'se-mean':   return J2000_SE_MEAN   + pA / 3600;
    case 'drik-mean': return J2000_DRIK_MEAN + pA / 3600;
  }
}
```

**Worked example.** `jdTt = 2449425.580556` (ΔT ≈ 60 s in 1994) → `T = −0.05802654`:

| Term | Value |
|---|---|
| `pA` | −291.800″ |
| Ω, L, L′ | 237.2758°, 351.4664°, 12.0065° |
| `Δψ` | +14.951″ |
| **`se-true`** | 23.780152° = **23°46′48.5″** |
| `se-mean` | 23.775998° = 23°46′33.6″ |
| `drik-mean` | 23.782744° = 23°46′57.9″ |

The spread is **24.3″**, a quarter of a percent of a pada, but exactly enough to flip a reading when a graha sits on an edge, which is why §6.6 exists.

**Reference table** (0 h UT; tolerance ±1″ on the SE columns, ±0.5″ on Drik once the constant is confirmed):

| Instant | JD_UT | `se-true` | `se-mean` | `drik-mean` | Drik's published value |
|---|---|---|---|---|---|
| 2000-01-01 | 2451544.5 | 23°51′11.3″ | 23°51′25.3″ | 23°51′49.6″ | 23.863782° |
| 2020-01-01 | 2458849.5 | 24°07′54.6″ | 24°08′11.3″ | 24°08′35.6″ | 24.143189° |
| 2025-01-01 | 2460676.5 | 24°12′23.0″ | 24°12′22.8″ | 24°12′47.1″ | 24.213073° |
| 2026-01-01 | 2461041.5 | 24°13′18.4″ | 24°13′13.0″ | 24°13′37.3″ | 24.227035° |

**Assertions that must exist:** the J2000 mean base is `23.857054°` ± 0.1″ at JD 2451545.0 (12 h TT) and `23.857035°` at 0 h UT the same day, *if these two agree exactly, the code is ignoring the time argument*; the `se-mean` rate is 5028.80″ ± 0.5″ per century; `|se-true − se-mean| ≤ 17.3″` over 200 sampled dates 1900-2030 **with at least eight sign flips** (an 18.6-year period must be visible, a constant offset means Δψ was implemented as a constant); `drik-mean − se-mean` is a constant 24.3″ ± 0.05″ across all 200; the three presets never differ by more than 41″, so the boundary module warns within 41″, not just 2′.

The Drawer's `DialSegment` renders these three as ticks on a magnified brass arc, labelled with their arcsecond difference *at the current chart's date*, the instrument metaphor doing real work.

### 6.3 Ephemeris interface and graha longitudes (`ephemeris.ts`)

One interface, one implementation shipped, one implementation documented but never installed.

```ts
export interface Ephemeris {
  /** Apparent geocentric longitude, true ecliptic of date, degrees. */
  tropicalLongitude(body: GrahaId, t: AstroTime): Deg;
  /** Degrees per day, from a +-1 hour central difference. */
  speed(body: GrahaId, t: AstroTime): number;
  greenwichApparentSiderealTime(t: AstroTime): Deg;
  name: string; version: string;
}
```

```ts
import * as A from 'astronomy-engine';

const BODY: Record<Exclude<GrahaId, 'RA' | 'KE'>, A.Body> = {
  SU: A.Body.Sun, MO: A.Body.Moon, MA: A.Body.Mars, ME: A.Body.Mercury,
  JU: A.Body.Jupiter, VE: A.Body.Venus, SA: A.Body.Saturn,
};

export const astronomyEngineEphemeris: Ephemeris = {
  name: 'astronomy-engine', version: '2.1.19',

  tropicalLongitude(id, t) {
    if (id === 'SU') return A.SunPosition(t).elon;              // already ECT
    if (id === 'MO') return A.EclipticGeoMoon(t).lon;           // already ECT
    return A.Ecliptic(A.GeoVector(BODY[id], t, /* aberration */ true)).elon;
  },

  speed(id, t) {
    const h = 1 / 24;
    const a = this.tropicalLongitude(id, t.AddDays(-h));
    const b = this.tropicalLongitude(id, t.AddDays(+h));
    return signedDelta(a, b) / (2 * h);                          // handles the 360 -> 0 wrap
  },

  greenwichApparentSiderealTime(t) { return A.SiderealTime(t) * 15; },
};
```

`A.Ecliptic()` converts a J2000 mean-equator vector to the **true ecliptic of date**, the apparent-longitude convention Swiss Ephemeris uses by default, so the two lanes are directly comparable. Accuracy is ±1′ against NOVAS; a pada is 200′ wide and a tithi 720′, so a misclassification is only possible within ~1′ of a boundary, which §6.6 flags rather than hides.

Sidereal longitude is one subtraction: `lonSidereal = norm360(lonTropical − ayanamsa(jdTt, preset))`.

Derived per-graha fields:
- **Retrograde:** `speed < 0`, rendered as a superscript `℞`.
- **Combustion:** `|signedDelta(lonSun, lonBody)| < ORB[body]` with `ORB = { MO: 12, MA: 17, ME: 14, JU: 11, VE: 10, SA: 15 }` degrees, tightening Mercury to 12 and Venus to 8 when retrograde. The Sun and the nodes are never combust.
- **Dignity:** exaltation points `{ SU: [0, 10], MO: [1, 3], MA: [9, 28], ME: [5, 15], JU: [3, 5], VE: [11, 27], SA: [6, 20] }` as `[signIdx, degree]`; debilitation is the opposite sign. Own signs, moolatrikona ranges and the natural friendship matrix live in `src/data/tables/dignity.ts`, re-typed from BPHS.
- **House (whole-sign):** `house = ((sign − lagnaSign + 12) % 12) + 1`.

### 6.4 Rahu and Ketu (`nodes.ts`)

astronomy-engine has no node *longitude* function (`SearchMoonNode` returns crossing *times*), so both node types are ours. They differ by up to ~1.7°, enough to change a sign, so the choice is a preset and is printed in the colophon.

```ts
/** Mean lunar node, Meeus 47.7. T = Julian centuries TT from J2000. */
export function meanNode(jdTt: Jd): Deg {
  const T = (jdTt - 2451545.0) / 36525;
  return norm360(125.0445479 - 1934.1362891 * T + 0.0020754 * T ** 2
               + T ** 3 / 467441 - T ** 4 / 60616000);
}

/**
 * True (osculating) node, what Swiss Ephemeris calls SE_TRUE_NODE.
 * h = r x v of the Moon's geocentric ecliptic-of-date state; the ascending node
 * lies along n = z_hat x h.
 */
export function trueNode(t: AstroTime): Deg {
  const dt = 30 / 86400;                       // +-30 s central difference
  const r0 = eclipticVector(t.AddDays(-dt));
  const r1 = eclipticVector(t.AddDays(+dt));
  const r  = eclipticVector(t);
  const v  = { x: (r1.x - r0.x) / (2 * dt), y: (r1.y - r0.y) / (2 * dt), z: (r1.z - r0.z) / (2 * dt) };
  const h  = cross(r, v);                      // orbital angular momentum
  const n  = { x: -h.y, y: h.x };              // z_hat x h
  return norm360(Math.atan2(n.y, n.x) * 180 / Math.PI);
}

function eclipticVector(t: AstroTime) {
  // GeoMoon is EQJ; rotate into the true ecliptic of date so the node shares the chart's frame.
  return A.RotateVector(A.Rotation_EQJ_ECT(t), A.GeoMoon(t));
}
```

Ketu is always `norm360(rahu + 180)`. Both nodes carry `speed = −0.0529539` deg/day (mean) or the finite difference of `trueNode`, and both are **always drawn retrograde**. The default is **true node**. Test: the two agree within 1.8° across 100 random dates, cross exactly at the node's stationary points, and both are always retrograde.

### 6.5 Lagna and MC (`lagna.ts`)

```ts
export function lagna(t: AstroTime, jdTt: Jd, lat: number, lon: number, ay: Deg) {
  const T    = (jdTt - 2451545.0) / 36525;
  const gast = ephemeris.greenwichApparentSiderealTime(t);        // degrees
  const ramc = norm360(gast + lon);                               // lon east positive

  const eps0 = (84381.406 - 46.836769 * T - 0.0001831 * T ** 2 + 0.00200340 * T ** 3) / 3600;
  const O  = norm360(125.0445479 - 1934.1362891 * T);
  const L  = norm360(280.4665 + 36000.7698 * T);
  const Lp = norm360(218.3165 + 481267.8813 * T);
  const deps = (9.20 * cosd(O) + 0.57 * cosd(2 * L) + 0.10 * cosd(2 * Lp) - 0.09 * cosd(2 * O)) / 3600;
  const eps  = eps0 + deps;

  const ascTrop = norm360(atan2d(cosd(ramc), -(sind(ramc) * cosd(eps) + tand(lat) * sind(eps))));
  const mcTrop  = norm360(atan2d(sind(ramc), cosd(ramc) * cosd(eps)));

  return { ascTrop, mcTrop, ascSid: norm360(ascTrop - ay), mcSid: norm360(mcTrop - ay), ramc, eps };
}
```

**Worked example** (Bengaluru, `jdUt = 2449425.579861`), these are golden values:

| Quantity | Value |
|---|---|
| GMST | 200.2097° |
| GAST | 200.2135° |
| RAMC | 277.8081° |
| ε (true obliquity) | 23.438851° |
| ASC tropical | 9.4371° (Meṣa 9°26′14″) |
| **ASC sidereal** | 345.6570° = **Meena (Pisces) 15°39′25″** |
| ASC nakshatra / pada | Uttara Bhādrapadā, pada 4 |
| MC sidereal | 253.3907° = Dhanu 13°23′27″ |

The sanity check that belongs in the test file: Bengaluru sunrise that morning is ≈ 06:29 IST, the birth is 56 minutes later, and the Sun sits at sidereal 329.48°; a Lagna ~16.2° ahead of the Sun is exactly what a 56-minute-old day produces. **Edge case:** high latitudes make `tan φ` explode, add a fixture at 60 °N (Oslo) and one at Reykjavík that must not produce `NaN` or `Infinity`.

Houses are **whole-sign**, the only system a Rāśi chart shows. `bhava-chalit` (Sripati: trisect the ASC→IC→DSC→MC arcs) is computed alongside for house-strength yogas when the preset asks, and is displayed as a **table, never as the chart**.

### 6.6 Nakshatra, pada and the boundary badge (`nakshatra.ts`, `boundary.ts`)

```ts
const NAK_SPAN  = 360 / 27;      // 13.333333...
const PADA_SPAN = NAK_SPAN / 4;  // 3.333333...
const LORDS: GrahaId[] = ['KE','VE','SU','MO','MA','RA','JU','SA','ME'];   // repeated 3x

export function nakshatraOf(lonSid: Deg) {
  const index = Math.floor(lonSid / NAK_SPAN);                    // 0..26
  const pada  = (Math.floor(lonSid / PADA_SPAN) % 4 + 1) as 1|2|3|4;
  return { index, pada, lord: LORDS[index % 9], name: NAKSHATRA_NAMES[index] };
}

const BOUNDARY_ARCMIN = 2;    // the vermilion asterisk

export function boundaryFlag(lonSid: Deg): BoundaryFlag | null {
  const edges: Array<[BoundaryFlag['kind'], number]> = [
    ['sign', 30], ['nakshatra', NAK_SPAN], ['pada', PADA_SPAN],
  ];
  for (const [kind, span] of edges) {
    const into = lonSid % span;
    const arcmin = Math.min(into, span - into) * 60;
    if (arcmin <= BOUNDARY_ARCMIN) {
      const other = into < span / 2 ? labelAt(lonSid - span / 2, kind) : labelAt(lonSid + span / 2, kind);
      return { kind, arcminutesTo: arcmin, otherSide: other };
    }
  }
  return null;
}
```

The footnote sheet then does the thing no other astrology app does: it **re-runs the classification under the other two ayanamsa presets** and says so, *"within 1′42″ of Anurādhā/Jyeṣṭhā; the Drik preset would read Jyeṣṭhā"* (that string is the **synthetic** fixture `λ_sid = 226.6383°`; no graha in the reference chart is inside 2′ of an edge, so the reference Patri renders no asterisk at all). That is a three-line helper (`classifyUnder(preset)` × 3) and it is the entire "no black box" thesis in one badge.

**Worked example**, Sun at `λ_sid = 329.4811°` (Kumbha 29°28′52″):

| Field | Value |
|---|---|
| sign / degInSign | 10 (Kumbha) / 29.4811° |
| nakshatra | `floor(329.4811 / 13.3333) = 24` → **Pūrva Bhādrapadā** |
| pada | `floor(329.4811 / 3.3333) = 98`, `98 % 4 + 1` = **3** |
| lord | `LORDS[24 % 9] = LORDS[6]` = **Jupiter (Gu)** |
| house (Meena Lagna) | `((10 − 11 + 12) % 12) + 1` = **12** |
| boundary | 31′08″ from the Kumbha/Meena edge → **no asterisk** |
| provenance | `<oracle: swetest -p0 -b14.3.1994 -ut1:55 -sid1>`, assert it against `cast(referenceChart)` (TESTING E-3), never against this printed literal |

**Boundary fixtures:** `λ = 0.0000°` → Aśvinī pada 1, lord Ketu; `λ = 13.3333° − 1e-9` → Aśvinī pada 4; `λ = 13.3334°` → Bharaṇī pada 1, lord Venus; `λ = 359.9999°` → Revatī pada 4, lord Mercury; `λ = 213.3300°` flags the Viśākhā/Anurādhā edge at 0′12″ and names both sides. All intervals are half-open `[a, b)` and that is asserted.

### 6.7 Divisional charts (`vargas.ts`)

One dispatcher, nine rules, all re-derived from the Parashari definitions.

```ts
export function vargaSign(lonSid: Deg, varga: number): SignIdx {
  const s = Math.floor(lonSid / 30) as SignIdx;      // 0 = Mesha
  const d = lonSid - s * 30;                         // 0..30
  const odd = s % 2 === 0;                           // 0-based even index == odd sign NUMBER
  const part = (n: number) => Math.floor(d / (30 / n));

  switch (varga) {
    case 1:  return s;
    case 2:  return (odd ? (part(2) === 0 ? 4 : 3) : (part(2) === 0 ? 3 : 4)) as SignIdx;  // Simha/Karka
    case 3:  return ((s + 4 * part(3)) % 12) as SignIdx;
    case 7:  return ((s + (odd ? 0 : 6) + part(7)) % 12) as SignIdx;
    case 9:  return (Math.floor(lonSid / (10 / 3)) % 12) as SignIdx;
    case 10: return ((s + (odd ? 0 : 8) + part(10)) % 12) as SignIdx;
    case 12: return ((s + part(12)) % 12) as SignIdx;
    case 30: return trimsamsa(s, d, odd);
    case 60: return ((s + part(60)) % 12) as SignIdx;
    default: throw new EngineError('VARGA_UNSUPPORTED', `D${varga}`);
  }
}

/** D30: unequal bands. Odd signs 5/5/8/7/5 -> Mars, Saturn, Jupiter, Mercury, Venus;
 *  even signs take those lords reversed with the bands reversed (5/7/8/5/5). */
function trimsamsa(s: SignIdx, d: number, odd: boolean): SignIdx {
  const bands = odd ? [5, 10, 18, 25, 30] : [5, 12, 20, 25, 30];
  const signs = odd ? [0, 10, 8, 2, 6]      // Mesha, Kumbha, Dhanu, Mithuna, Tula
                    : [1, 5, 11, 9, 7];     // Vrishabha, Kanya, Meena, Makara, Vrischika
  return signs[bands.findIndex((b) => d < b)] as SignIdx;
}
```

**Worked example**, Sun at `λ_sid = 329.4811°` (Kumbha 29°28′52″, a *fixed* sign):

| Varga | Part index | Sign | Cross-check |
|---|---|---|---|
| D1 Rāśi | - | Kumbha (10) | - |
| D2 Horā | 1 | Karka (3) | odd sign, second half → Moon's horā |
| D3 Drekkāṇa | 2 | Tulā (6) | `(10 + 8) % 12` |
| D7 Saptāṁśa | 6 | Siṁha (4) | odd sign → `(10 + 6) % 12` |
| **D9 Navāṁśa** | 8 | **Mithuna (2)** | fixed sign starts from the 9th (Tulā); Tulā + 8 = Mithuna ✔ |
| D10 Daśāṁśa | 9 | Vṛścika (7) | odd sign → `(10 + 9) % 12` |
| D12 Dvādaśāṁśa | 11 | Makara (9) | `(10 + 11) % 12` |
| D30 Triṁśāṁśa | band 25-30 | Tulā (6) | odd sign, Venus's band |
| D60 Ṣaṣṭyāṁśa | 58 | Dhanu (8) | `(10 + 58) % 12` |

A **second** hand-derived row for a *dual* even sign, `λ_sid = 176.2000°` (Kanyā, `s = 5`, `d = 26.2°`): D1 Kanyā (5) · D2 Siṁha (4) · D3 Vṛṣabha (1) · D7 Kanyā (5) · **D9 Siṁha (4)** · D10 Makara (9) · D12 Karka (3) · D60 Makara (9).

The D9 row proves the closed form: "movable from itself / fixed from the 9th / dual from the 5th" is *implied* by `floor(λ / 3.3333) % 12`. Assert **both** derivations agree at all 4 320 five-arcminute samples, so a refactor cannot quietly break one. Boundary rows: `λ = 0.0000°` → D9 Meṣa; `λ = 359.9999°` → D9 Meena; `λ = 30.0000°` exactly → D1 Vṛṣabha.

The varga pager computes D2, D3, D7, D10, D12, D30 and D60 **lazily on first swipe**; D1 and D9 are always in the `Patri`.

### 6.8 Vimshottari daśā (`dasha.ts`)

```ts
const CYCLE: GrahaId[] = ['KE','VE','SU','MO','MA','RA','JU','SA','ME'];
const YEARS: Record<GrahaId, number> = { KE:7, VE:20, SU:6, MO:10, MA:7, RA:18, JU:16, SA:19, ME:17 };
const TOTAL = 120;

export function vimshottari(moonLonSid: Deg, birthMs: number, yearDays: 365.25 | 360): DashaNode[] {
  const nak  = Math.floor(moonLonSid / NAK_SPAN);
  const lord = LORDS[nak % 9];
  const f    = (moonLonSid % NAK_SPAN) / NAK_SPAN;      // fraction of the nakshatra elapsed
  const day  = yearDays * 86_400_000;

  // The running mahadasha started BEFORE birth; anchor the whole tree on its nominal start.
  let cursor = birthMs - YEARS[lord] * f * day;
  const start = CYCLE.indexOf(lord);
  const out: DashaNode[] = [];

  for (let i = 0; i < 9; i++) {
    const md = CYCLE[(start + i) % 9];
    const mdStart = cursor, mdEnd = cursor + YEARS[md] * day;
    out.push({ lord: md, level: 1, startMs: mdStart, endMs: mdEnd, children: antars(md, mdStart, day) });
    cursor = mdEnd;
  }
  return out;
}

function antars(md: GrahaId, mdStart: number, day: number): DashaNode[] {
  let c = mdStart;
  const from = CYCLE.indexOf(md);
  return Array.from({ length: 9 }, (_, i) => {
    const ad  = CYCLE[(from + i) % 9];
    const len = (YEARS[md] * YEARS[ad] / TOTAL) * day;
    const node: DashaNode = { lord: ad, level: 2, startMs: c, endMs: c + len };
    c += len;
    return node;
  });
}
// Pratyantar is the same shape one level down: len = YEARS[md]*YEARS[ad]*YEARS[pd] / 120^2 * day.
// Generated on demand when the ribbon fold is pulled, never eagerly.
```

**Worked example.** the reference chart's Moon at `λ_sid = 349.1688°` (Revatī pada 1, Mīna 19°10′08″):

| Step | Value |
|---|---|
| nakshatra | `floor(349.1688 / 13.3333) = 26` → Revatī; lord `LORDS[26 % 9] = LORDS[8]` = **Budha** |
| elapsed fraction `f` | `(349.1688 − 346.6667) / 13.3333` = **0.187659** |
| balance at birth | `17 × (1 − 0.187659)` = **13.809790 yr** = 5044.03 d |
| Budha mahādaśā ends | 1994-03-14 07:25 + 5044.03 d = **2008-01-04 ≈ 08:02 IST** |
| nominal MD start | birth − `17 × 0.187659` yr = 1991-01-04 |
| antara lengths in Budha (yr) | Bu 2.408333, Ke 0.991667, Śu 2.833333, Sū 0.85, Ch 1.416667, Ma 0.991667, Rā 2.55, Gu 2.266667, Śa 2.691667 (Σ = 17 ✔) |
| elapsed into MD at birth | 3.190210 yr; cumulative Bu 2.408333 < 3.190210 < 3.400000 |
| **antardaśā at birth** | **Ketu**, running 1993-06-01 → **1994-05-29 ≈ 22:26 IST** |
| pratyantar at birth | **Śani** inside the Ketu antardaśā (0.157014 yr), 1994-02-10 → 1994-04-08 |

So the ribbon opens on **Budha - Ketu - Śani** with the brass clip 25 days from a fold.

A **second** hand-derived fixture from `λ_moon_sid = 176.2000°` (Chitrā, lord Maṅgala, 7 yr, `dashaYearDays = 365.25`): `f = 0.2150000`; balance = **5.4950 yr = 2006.55 d**; MD order Ma, Ra, Ju, Sa, Me, Ke, Ve, Su, Mo; AD lengths inside the Maṅgala MD are Ma 0.408333, Ra 1.05, Ju 0.933333, Sa 1.108333, Me 0.991667, Ke 0.408333, Ve 1.166667, Su 0.35, Mo 0.583333 (Σ = 7.000000); the AD **at birth** is **Guru**, with 0.886667 yr remaining. With `dashaYearDays = 360` the balance becomes 1978.20 d.

**Invariants to assert:** Σ of all nine MDs = 120.000000 yr (to 1e-9); every AD sums exactly to its MD and every PD to its AD; the tree is continuous with `end[i] === start[i+1]` and no gaps or overlaps; the "current MD/AD/PD" selector at a given instant returns the half-open interval containing it. The `dashaYearDays` preset changes the answer by ~1.5 % (six months across a 19-year mahādaśā), and the colophon must print which was used.

### 6.9 Panchang and the end-time solver (`panchang.ts`, `sunrise.ts`)

The Hindu day runs sunrise → sunrise, so everything starts with sunrise at the leaf's place.

```ts
export function sunrise(observer: A.Observer, dayStartUtc: Date, mode: SunriseMode): Date {
  return mode === 'upper-limb-refracted'
    ? A.SearchRiseSet(A.Body.Sun, observer, +1, dayStartUtc, 1)!.date        // limb + refraction
    : A.SearchAltitude(A.Body.Sun, observer, +1, dayStartUtc, 1, 0)!.date;   // disc centre, no refraction
}
```

Every aṅga is `floor(angle / span)`, and every one also needs an **end instant**, which is a root find:

```ts
/**
 * Generic monotone crossing solver: find t in [t0,t1] where angleFn(t) reaches `target`,
 * measured as an unwrapped signed difference so the 360->0 wrap never breaks the bisection.
 */
export function solveCrossing(angleFn: (ms: number) => Deg, target: Deg,
                              t0: number, t1: number, tolMs = 250): number {
  const f = (t: number) => signedDelta(target, angleFn(t));   // in (-180, 180]
  let a = t0, b = t1, fa = f(a);
  if (fa === 0) return a;
  while (b - a > tolMs) {
    const m = (a + b) / 2, fm = f(m);
    if (Math.sign(fm) === Math.sign(fa)) { a = m; fa = fm; } else { b = m; }
  }
  return (a + b) / 2;
}
```

| Aṅga | Index | End instant |
|---|---|---|
| Tithi (1-30) | `floor(((λmoon − λsun) mod 360) / 12) + 1`; 1-15 Śukla, 16-30 Kṛṣṇa (15 Pūrṇimā, 30 Amāvasyā) | `A.SearchMoonPhase(12 * index, from, 2)` |
| Vāra (0-6) | weekday of the **governing sunrise**, not of the calendar date | the next sunrise |
| Nakṣatra (0-26) | `floor(λmoon_sid / 13.3333)` | `solveCrossing(λmoon_sid, (i + 1) * 13.3333, now, now + 36 h)` |
| Yoga (1-27) | `floor(((λsun_sid + λmoon_sid) mod 360) / 13.3333) + 1` | `solveCrossing` on the sum, 30 h window |
| Karaṇa (1-60) | `k = floor(((λmoon − λsun) mod 360) / 6) + 1`; 1 Kiṁstughna, 2-57 cycle Bava…Viṣṭi (`(k − 2) mod 7`), 58 Śakuni, 59 Catuṣpāda, 60 Nāga | `A.SearchMoonPhase(6 * k, from, 1)` |

Bisection converges in ~18 iterations for a 36-hour window at 250 ms tolerance, and each iteration is one `EclipticGeoMoon` call (≈ 20 µs), so a full five-aṅga panchang **with** end times costs well under 5 ms.

**Day divisions**, all fractions of `sunset − sunrise` split into eight parts, with a 1-based slot indexed by weekday (Sunday = 0):

```ts
const RAHU   = [8, 2, 7, 5, 6, 4, 3];
const YAMA   = [5, 4, 3, 2, 1, 7, 6];
const GULIKA = [7, 6, 5, 4, 3, 2, 1];
const slot = (n: number, rise: number, set: number): [number, number] => {
  const p = (set - rise) / 8;
  return [rise + (n - 1) * p, rise + n * p];
};
// Abhijit = local apparent noon +- (dayLength / 30); by convention it is not observed on Wednesday.
```

Māsa is named by the solar sign at the governing Amāvasyā (Amānta) or Pūrṇimā (Pūrṇimānta), print **both**, because the circle spans both conventions. Adhika māsa, ṛtu, ayana and the samvatsara are v1, but their fields exist in the type from day one so the ledger rows never move.

`moonIllumination` comes from `A.Illumination(A.Body.Moon, t).phase_fraction` and is written straight into `--moon-k`. **The engine literally lights the room.**

**Pure-angle fixtures (no ephemeris)** with `λ_moon = 200.0000°`, `λ_sun = 41.5000°`, `ayanamsa = 23.8000°`: elongation 158.5000°; tithi `floor(158.5/12) + 1 = 14` → **Śukla Caturdaśī**; karaṇa `k = 27`, `(27 − 2) mod 7 = 4` → **Gara**; yoga `17.7 + 176.2 = 193.9`, `floor(193.9/13.3333) = 14` → **15 · Vajra**; nakshatra `floor(176.2/13.3333) = 13` → **Chitrā**. Plus six seam cases: elongation exactly 0° (Amāvasyā → tithi **30**, not 0), exactly 180° (the Pūrṇimā 15/16 seam), `k = 1` → Kiṁstughna, `k = 58/59/60` → Śakuni/Catuṣpāda/Nāga, and yoga index 26 → Vaidhṛti.

### 6.10 Yogas as predicates (`yogas.ts`)

Each yoga is a small pure function plus a citation. **No yoga is ever a string inside a UI component.**

```ts
export interface YogaRule {
  id: string; name: string; nameDev: string; citation: Citation;
  test(p: PatriContext): Omit<YogaHit, 'id' | 'name' | 'nameDev' | 'citation'> | null;
  cancels?: string[];        // ids this rule downgrades when both fire
}

const KENDRA = [1, 4, 7, 10], TRIKONA = [1, 5, 9], DUSTHANA = [6, 8, 12];

export const gajaKesari: YogaRule = {
  id: 'gaja-kesari', name: 'Gaja-Kesari', nameDev: 'गजकेसरी',
  citation: { text: 'BPHS', ref: '36.13' },
  test(p) {
    const fromMoon = ((p.g.JU.sign - p.g.MO.sign + 12) % 12) + 1;
    if (!KENDRA.includes(fromMoon)) return null;
    return {
      strength: p.g.JU.dignity === 'debilitated' || p.g.JU.combust ? 'partial' : 'full',
      because: [
        { grahaId: 'JU', house: fromMoon, note: `Guru in the ${ord(fromMoon)} from Chandra` },
        { grahaId: 'MO', sign: p.g.MO.sign, note: `Chandra in ${SIGN_NAMES[p.g.MO.sign]}` },
      ],
    };
  },
};
```

**The starter ten (MVP):** Gaja-Kesari · Budha-Āditya · Candra-Maṅgala · the five Pañca-Mahāpuruṣa (Rucaka, Bhadra, Haṁsa, Mālavya, Śaśa, each requires the graha in its own or exaltation sign **and** in a kendra from the Lagna) · Kemadruma · Sunaphā/Anaphā/Durudharā · Kāla-Sarpa · Manglik (Kuja doṣa). v1 grows to ~40: Nīca-Bhaṅga Rāja, Viparīta Rāja, Dhana yogas, and Rāja yogas from kendra/trikona lordship.

**Cancellations are first-class**, because a yoga list without them is a lint rule with no suppressions. `runYogas()` evaluates every rule, then makes a **second pass**: any hit whose id appears in a fired rule's `cancels` list is rewritten to `strength: 'cancelled'` with `cancelledBy` set, and the paragraph renders it struck through with the cancelling citation beside it. Kemadruma alone has four classical cancellations; Manglik has six.

Every `because` entry names the chart element that fired it, so tapping the superscript in the reading highlights that graha in the diamond and rises the loupe over it.

**Synthetic fixtures** (sign placements, no ephemeris), every rule needs a positive *and* a negative, and a rule without both fails the suite:

| ID | Yoga | Setup | Expect |
|---|---|---|---|
| Y-1 | Budha-Āditya | Sū and Bu both in Mīna | hit, citation present |
| Y-2 | Gaja-Kesari | Ch in Vṛṣabha, Gu in Siṁha (4th from Moon) | hit |
| Y-3 | Gaja-Kesari negative | Gu in Mithuna (2nd from Moon) | miss |
| Y-4 | Rucaka | Ma in Meṣa (own) **and** in a kendra from Lagna Meṣa | hit |
| Y-5 | Rucaka negative | Ma in Meṣa but Lagna Vṛṣabha → Ma in the 12th | miss (own sign alone is not enough) |
| Y-6 | Kemadruma | nothing but Sū/Rā/Ke in the 2nd and 12th from the Moon | hit |
| Y-7 | Kemadruma cancelled | Śu in the 2nd from the Moon | miss |
| Y-8 | Kāla-Sarpa | all seven between Rāhu and Ketu, going forward | hit |
| Y-9 | Kāla-Sarpa negative | one graha exactly on Rāhu's degree | miss + a "near boundary" note |
| Y-10 | Manglik | Ma in the 7th from the Lagna | hit, with the standard cancellations enumerated |

### 6.11 Guna Milan, Ashtakoota (`ashtakoota.ts`)

Eight kootas summing to exactly 36, which is what makes the 36-bead mala honest.

```ts
export function ashtakoota(a: Profile, b: Profile, pa: Patri, pb: Patri): MilanResult {
  const A = { nak: pa.grahas.MO.nakshatra, pada: pa.grahas.MO.pada, sign: pa.grahas.MO.sign };
  const B = { nak: pb.grahas.MO.nakshatra, pada: pb.grahas.MO.pada, sign: pb.grahas.MO.sign };
  const kootas = [varna(A,B), vashya(A,B), tara(A,B), yoni(A,B),
                  maitri(A,B), gana(A,B), bhakoot(A,B), nadi(A,B)];
  const total = kootas.reduce((s, k) => s + k.score, 0);
  return { a: a.id, b: b.id, presetHash: pa.presetHash, kootas, total, band: bandOf(total),
           manglik: { a: manglik(pa), b: manglik(pb) } };
}
```

| Koota | Max | Rule as implemented |
|---|---|---|
| **Varṇa** | 1 | Sign → Brāhmaṇa (Karka, Vṛścika, Meena), Kṣatriya (Meṣa, Siṁha, Dhanu), Vaiśya (Vṛṣabha, Kanyā, Makara), Śūdra (Mithuna, Tulā, Kumbha), ranked 4…1. `boyRank >= girlRank ? 1 : 0` |
| **Vaśya** | 2 | Sign → one of five classes (Catuṣpada, Mānava, Jalachara, Vanachara, Keeṭa); `VASHYA[boyClass][girlClass]` ∈ {2, 1, 0.5, 0}. **The one table with real school variation**, re-typed into `data/tables/vashya.ts` and all 25 cells pinned by the oracle test before anything is trusted |
| **Tārā** | 3 | `t(from,to) = ((countInclusive(from,to) − 1) % 9) + 1`; tārās 3 (Vipat), 5 (Pratyari), 7 (Vadha) are bad. Both good → 3, one good → 1.5, neither → 0 |
| **Yoni** | 4 | 14 animals by nakshatra; `YONI[a][b]` ∈ {4 same, 3 friendly, 2 neutral, 1 inimical, 0 sworn enemy}. Sworn pairs: horse-buffalo, elephant-lion, sheep-monkey, serpent-mongoose, dog-deer, cat-rat, cow-tiger |
| **Graha Maitrī** | 5 | Natural friendship of the two Moon-sign lords read **both ways**: friend+friend 5, friend+neutral 4, neutral+neutral 3, friend+enemy 1, neutral+enemy 0.5, enemy+enemy 0 |
| **Gaṇa** | 6 | Deva/Manuṣya/Rākṣasa by nakshatra; matrix (boy × girl) `[[6,6,1],[5,6,0],[1,0,6]]` |
| **Bhakūṭa** | 7 | Moon-sign distance both ways; 0 when the pair is 2/12, 5/9 or 6/8, else 7. Cancellation when the two sign lords are identical or mutual friends, recorded in `cancellation`, applied only when the setting is on |
| **Nāḍī** | 8 | `nak % 6` → 0 Ādi, 1 Madhya, 2 Antya, 3 Antya, 4 Madhya, 5 Ādi. Different → 8, same → 0 (Nāḍī doṣa). Classical exceptions recorded: same rāśi different nakshatra, same nakshatra different pada, sign lords friends |

Bands: `< 18` not recommended · `18-24` acceptable · `25-32` very good · `33-36` excellent.

**Worked example**, Rahul (Moon in **Revatī**, idx 26, Mīna) × Priya (Moon in **Rohiṇī**, idx 3, Vṛṣabha):

| Koota | Derivation | Score |
|---|---|---|
| Varṇa | Mīna → Brāhmaṇa (4); Vṛṣabha → Vaiśya (2); 4 ≥ 2 | **1** / 1 |
| Vaśya | Mīna → Jalachara; Vṛṣabha → Catuṣpada; `VASHYA[Jalachara][Chatushpada]` | **2** / 2 |
| Tārā | girl→boy: 24 nakshatras → `(23 % 9) + 1 = 6` Sādhaka (good); boy→girl: 5 → `(4 % 9) + 1 = 5` Pratyari (bad) | **1.5** / 3 |
| Yoni | Revatī = elephant, Rohiṇī = serpent; not the same, not the sworn pair (the elephant's enemy is the lion) → neutral | **2** / 4 |
| Graha Maitrī | Mīna's lord Guru vs Vṛṣabha's lord Śukra; Jupiter→Venus **enemy** and Venus→Jupiter neutral → `MAITRI[neutral][enemy]` | **0.5** / 5 |
| Gaṇa | Revatī = Deva, Rohiṇī = Manuṣya; `GANA[Deva][Manushya]` | **6** / 6 |
| Bhakūṭa | Mīna (12) ↔ Vṛṣabha (2) is 3/11, not in {2/12, 5/9, 6/8}, so **brass beads, not lac** | **7** / 7 |
| Nāḍī | `26 % 6 = 2` Antya vs `3 % 6 = 3` Antya, **same → Nāḍī doṣa** | **0** / 8 |
| | | **20 / 36, "acceptable"** |

The pair is a good showcase precisely because it exercises both bead materials: Bhakūṭa is a full brass seven (a 3/11 axis is not a doṣa, whatever the older mala mock implied) while Nāḍī fires the one lac row on the mala.

A second hand-worked pair for regression diagnosis without the oracle CSV, boy **Chitrā pada 1** (Moon in Kanyā) × girl **Rohiṇī pada 3** (Moon in Vṛṣabha): Varṇa 1 (both Vaiśya, boy ≥ girl); Tārā 3 (2 Sampat and 9 Mitra, both good); Graha Maitrī 5 (Budha and Śukra are natural friends); Gaṇa **0** (Rākṣasa-Manuṣya); Bhakūṭa **0** (the 5/9 axis → doṣa); Nāḍī 8 (Madhya vs Antya). Certain subtotal 17, plus Vaśya 0-2 and Yoni 0-4.

**The oracle test, GOAL success criterion 5.** PyJHora ships `all_nak_pad_boy_girl.csv`: all **11 664** nakshatra-pada × nakshatra-pada pairs (108 × 108) with expected totals. That file is *data, not code*. `scripts/import-oracle.mjs` converts it **once, outside the repo**, into `__fixtures__/ashtakoota-oracle.bin` (two bytes per pair, ~23 kB), and `ashtakoota.oracle.test.ts` walks all 11 664 pairs in a single Vitest case in ≤ 2 s, reporting the first ten mismatches by **nakshatra-pada name**, not index. A disagreement means the Vaśya, Yoni or Gaṇa matrix was re-typed wrong, exactly the failure this test exists to catch.

**Manglik** (Kuja doṣa) is computed separately from the Lagna, the Moon and Venus: Mars in houses 1, 2, 4, 7, 8 or 12 from any of the three. Standard cancellations are recorded and displayed: Mars in its own or exaltation sign; Mars in the 2nd in Mithuna or Kanyā; both charts Manglik; Mars aspected by Guru; Śani in a kendra with Mars; and age > 28 by some schools (recorded, **never auto-applied**).

### 6.12 Chart geometry (`features/patri/geometry.ts`)

Both charts are data-driven SVG on `viewBox="0 0 400 400"`, drawn with Motion `pathLength`, frame first, then diagonals, then the inner diamond, +60 ms stagger each.

**North Indian (diamond).** The houses are fixed on the page; the *sign numbers* move. Twelve regions, anticlockwise from the top-centre rhombus:

```ts
export const NORTH_HOUSE_POLY: Record<number, Array<[number, number]>> = {
  1:  [[200,0],[300,100],[200,200],[100,100]],   // inner rhombus, top
  2:  [[0,0],[200,0],[100,100]],
  3:  [[0,0],[100,100],[0,200]],
  4:  [[0,200],[100,100],[200,200],[100,300]],   // inner rhombus, left
  5:  [[0,200],[100,300],[0,400]],
  6:  [[0,400],[100,300],[200,400]],
  7:  [[200,400],[100,300],[200,200],[300,300]], // inner rhombus, bottom
  8:  [[200,400],[300,300],[400,400]],
  9:  [[400,400],[300,300],[400,200]],
  10: [[400,200],[300,100],[200,200],[300,300]], // inner rhombus, right
  11: [[400,200],[300,100],[400,0]],
  12: [[400,0],[300,100],[200,0]],
};
export const NORTH_LABEL_ANCHOR: Record<number, [number, number]> = {
  1:[200,86], 2:[100,36], 3:[36,100], 4:[100,200], 5:[36,300], 6:[100,364],
  7:[200,314], 8:[300,364], 9:[364,300], 10:[300,200], 11:[364,100], 12:[300,36],
};
// sign shown in house n = (lagnaSign + n - 1) % 12
```

**South Indian (grid).** The signs are fixed on the page; the Lagna is marked by a diagonal tick in its cell's top-left corner and houses read clockwise from there. Sixteen 100 px cells, centre 2 × 2 blank:

```ts
// SOUTH_CELL[signIdx] = [row, col], 0-indexed. Mesha at (0,1), running clockwise,
// so Meena lands in the top-left corner and the four centre cells stay empty.
export const SOUTH_CELL: Array<[number, number]> = [
  [0,1],[0,2],[0,3],[1,3],[2,3],[3,3],[3,2],[3,1],[3,0],[2,0],[1,0],[0,0],
];
```

Planet chips inside a region flow in two columns sorted by longitude, in Devanagari (सू च मं बु गु शु श रा के) or Latin (Sū Ch Ma Bu Gu Śu Śa Rā Ke) per the `chartScript` setting, each with `degInSign` to the minute and a superscript `℞` when retrograde. The Lagna's sindoor tilak is the pre-baked displaced SVG (`public/seal-edge.svg`), never a live filter. Every chart carries a visually hidden `<table>` twin of graha / sign / degree / nakshatra-pada rows referenced by `aria-describedby`.

### 6.13 The palm pipeline (`engine/palm/`)

Six stages, each degrading to the next-best thing rather than failing. Stages 1-2 are cheap and always run; 3-6 need OpenCV and are only reached when the owner asks for lines. **The contract is honesty, not accuracy:** a low-confidence result that says so is a pass; a confident wrong one is a bug.

```
photo (<= 1600 px)
 -> [1] MediaPipe HandLandmarker (IMAGE mode)   21 landmarks + handedness    ~120 ms
 -> [2] geometry-only reading                   element, ratios, thumb angle   <1 ms
 -> [3] rectify: homography -> 512x512 print                                  ~15 ms
 -> [4] enhance: grey -> CLAHE -> black-hat -> blur                           ~40 ms
 -> [5] ridge: Hessian eigen-filter, sigma in {2,3,4} -> NMS -> hysteresis    ~350 ms
 -> [6] thin (Zhang-Suen) -> components -> template match -> label + conf     ~120 ms
```

**[1] Landmarks.** `HandLandmarker.createFromOptions(await FilesetResolver.forVisionTasks(BASE + 'mediapipe'), { baseOptions: { modelAssetPath: BASE + 'models/hand_landmarker.task', delegate: 'GPU' }, numHands: 1, runningMode: 'IMAGE' })`, note `BASE = import.meta.env.BASE_URL`; a bare `/models/…` is the single most likely 404 on a sub-path host. Reject when `handedness.score < 0.8` (`reason: 'uncertain-hand'`) or any landmark falls outside `[0,1]` (`'landmark-off-frame'`). **Palm versus back:** for a right hand shown palm-up, `THUMB_CMC.x < PINKY_MCP.x` in image space (mirrored for a left hand); a mismatch means the back of the hand → `'palm-not-facing'`, the shutter stays disabled, and the copy reads "turn your palm to the camera". A degenerate hand (all landmarks identical) returns `{ ok: false, reason: 'degenerate' }`, never `NaN`.

**[2] Hand shape and ratios**, pure geometry on `worldLandmarks` (metres, view-invariant), so this survives any camera angle. **This alone is the reading the MVP ships:**

```ts
const L = dist(w[0], w[9]);                    // palm length: WRIST -> MIDDLE_MCP
const W = dist(w[5], w[17]);                   // palm width: INDEX_MCP -> PINKY_MCP
const F = dist(w[9], w[12]);                   // middle finger: MIDDLE_MCP -> MIDDLE_TIP
const square = W / L >= 0.90, longFingers = F / L >= 0.80;   // thresholds are >=, asserted
const element = square ? (longFingers ? 'air' : 'earth')
                       : (longFingers ? 'water' : 'fire');
const indexOverRing = dist(w[5], w[8]) / dist(w[13], w[16]);           // 2D:4D
const thumbAngleDeg = angleBetween(sub(w[4], w[2]), sub(w[9], w[0]));  // flexibility
```

Element fixtures: W/L 0.84 + F/L 0.71 → **Fire**; 0.94 + 0.70 → **Earth**; 0.94 + 0.86 → **Air**; 0.84 + 0.86 → **Water**; exactly 0.90 + 0.80 → **Air** (a `>` implementation fails this).

**[3] Rectification.** A homography from four stable landmarks into a canonical frame with the fingers at the top, the wrist at the bottom and the thumb on the left (mirror `x` for a left hand, so both prints share one anatomy):

```ts
const SRC = [lm[0], lm[5], lm[17], lm[1]];                  // WRIST, INDEX_MCP, PINKY_MCP, THUMB_CMC
const DST = [[256,496], [120,96], [392,128], [56,400]];     // canonical 512 x 512
const H = cv.getPerspectiveTransform(mat(SRC), mat(DST));
cv.warpPerspective(src, dst, H, new cv.Size(512, 512), cv.INTER_LINEAR, cv.BORDER_REPLICATE);
```

The transform must be invertible with a round-trip error ≤ 0.5 px, so a traced path can be mapped back onto the original photo. A rotated (+37°) and scaled (0.6×) copy of the same synthetic palm must rectify to within **4 px RMS** of the unrotated run, rectification is what makes the line scores comparable at all.

**[4] Enhancement.** Grayscale → `cv.CLAHE(3.0, [8,8])` → **black-hat** with a 25 px elliptical kernel (`morphologyEx(MORPH_BLACKHAT)`), which isolates dark creases and removes large-scale illumination in one step → Gaussian σ ≈ 1.5. Palm lines are *valleys*, so the black-hat output is already "bright lines on dark" and the ridge filter needs no inversion.

**[5] Multi-scale Hessian ridge filter** (`ridge.ts`, plain TypedArrays, OpenCV is only needed to get the Mat out):

```ts
/** Frangi-style 2D vesselness for bright ridges. Returns the max response over scales. */
export function ridgeness(img: Float32Array, w: number, h: number, sigmas = [2, 3, 4]): Float32Array {
  const out = new Float32Array(w * h);
  for (const s of sigmas) {
    const Lxx = convolveSeparable(img, w, h, d2Gauss(s), gauss(s));
    const Lyy = convolveSeparable(img, w, h, gauss(s), d2Gauss(s));
    const Lxy = convolveSeparable(img, w, h, dGauss(s), dGauss(s));
    const s2 = s * s;                                   // gamma-normalisation, gamma = 1
    for (let i = 0; i < out.length; i++) {
      const a = s2 * Lxx[i], b = s2 * Lxy[i], c = s2 * Lyy[i];
      const tr = a + c, det = a * c - b * b;
      const disc = Math.sqrt(Math.max(0, tr * tr / 4 - det));
      let l1 = tr / 2 - disc, l2 = tr / 2 + disc;
      if (Math.abs(l1) > Math.abs(l2)) [l1, l2] = [l2, l1];   // |l1| <= |l2|
      if (l2 >= 0) continue;                                   // not a bright ridge
      const Rb = l1 / l2, S = Math.hypot(l1, l2);
      const v = Math.exp(-(Rb * Rb) / (2 * 0.5 * 0.5)) * (1 - Math.exp(-(S * S) / (2 * 15 * 15)));
      if (v > out[i]) out[i] = v;
    }
  }
  return out;
}
```

Then non-maximum suppression perpendicular to the ridge direction (the eigenvector of `l1`), hysteresis thresholding at 0.28 / 0.12 of the 99th-percentile response, and `morphologyEx(MORPH_CLOSE)` with a 3 × 3 kernel.

**[6] Thinning and labelling.** Zhang-Suen, because `ximgproc.thinning` is not in the default OpenCV.js build:

```ts
export function zhangSuen(bin: Uint8Array, w: number, h: number): Uint8Array {
  const at = (x: number, y: number) => bin[y * w + x];
  let changed = true;
  while (changed) {
    changed = false;
    for (const step of [0, 1]) {
      const kill: number[] = [];
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
        if (!at(x, y)) continue;
        const p = [at(x,y-1), at(x+1,y-1), at(x+1,y), at(x+1,y+1),
                   at(x,y+1), at(x-1,y+1), at(x-1,y), at(x-1,y-1)];   // P2..P9 clockwise
        const B = p.reduce((s, v) => s + v, 0);
        if (B < 2 || B > 6) continue;
        let transitions = 0;
        for (let i = 0; i < 8; i++) if (!p[i] && p[(i + 1) % 8]) transitions++;
        if (transitions !== 1) continue;
        const c1 = step === 0 ? p[0] * p[2] * p[4] : p[0] * p[2] * p[6];
        const c2 = step === 0 ? p[2] * p[4] * p[6] : p[0] * p[4] * p[6];
        if (c1 === 0 && c2 === 0) kill.push(y * w + x);
      }
      if (kill.length) { changed = true; for (const i of kill) bin[i] = 0; }
    }
  }
  return bin;
}
```

Properties to assert: a 9 px straight stroke thins to a 1 px skeleton with the same endpoints ±1 px; a filled disc thins to a single pixel; the operation is idempotent; it terminates in ≤ 40 iterations on a 512 × 512 mask.

`cv.connectedComponentsWithStats` on the skeleton; components shorter than 60 px are dropped. Each survivor is resampled to 64 points and scored against an anatomical template in the canonical frame:

```ts
const TEMPLATES: Record<PalmLineId, { poly: Array<[number,number]>; band: [number,number]; sigma: number }> = {
  heart: { poly: [[400,150],[330,132],[260,128],[190,140],[150,160]], band: [ 95, 215], sigma: 34 },
  head:  { poly: [[130,258],[190,272],[255,285],[320,295],[372,300]], band: [225, 345], sigma: 36 },
  life:  { poly: [[142,238],[128,300],[142,362],[178,420],[218,470]], band: [210, 500], sigma: 40 },
  fate:  { poly: [[248,470],[250,380],[252,290],[254,200],[256,132]], band: [120, 500], sigma: 30 },
};

function score(component: Pt[], t: (typeof TEMPLATES)['heart']): number {
  const prox   = mean(component.map(p => Math.exp(-sqDistToPolyline(p, t.poly) / (2 * t.sigma ** 2))));
  const inBand = component.filter(p => p[1] >= t.band[0] && p[1] <= t.band[1]).length / component.length;
  const dir    = Math.abs(cosBetween(tangentOf(component), tangentOf(t.poly)));
  return 0.5 * prox + 0.3 * inBand + 0.2 * dir;
}
```

Assignment is greedy (best score first, each component used once, each label once), then:

```
confidence = 0.45 * coverage       // fraction of the template's arc length matched
           + 0.35 * templateScore
           + 0.20 * contrast       // mean black-hat response along the path, normalised
```

Below **0.6** the line renders dashed and faint with a haldi note and the stylus appears automatically, the honest failure mode. A traced path sets `source: 'traced'`, `confidence: 1`, and the reading recomputes live from the traced geometry, so the rule layer never knows the difference.

**[7] Rules.** `palm/rules.ts` has the same shape as `yogas.ts`: predicates over `PalmReading` with Samudrika Shastra citations. Length is normalised by palm length; curvature is the mean turning angle per unit length; breaks are gaps > 8 px in the pre-thinning mask; depth is the mean black-hat response along the path. **Every emitted sentence prints its measurement**, *"Tradition says a deep, long heart line (0.92 of palm width, depth 0.61) speaks of steadiness in affection.¹"*, because a number the reader can check is the difference between an instrument and a fortune cookie. Both framings are offered: `dominant`/`non-dominant` **and** the classical right/left, with the choice recorded in the output.

Stages [3]-[6] run in `palm.worker.ts` with the OpenCV module instantiated **inside the worker**, so the desk never drops a frame; only the final `PalmReading` and a 512 × 512 `ImageBitmap` are transferred back. Every `cv.Mat` is explicitly `.delete()`d in a `finally`, a leak here is an OOM kill on a 4 GB phone, and a test counts constructions minus deletions and asserts the delta is 0.

**Capture quality** (`quality.ts`, runs live at ≤ 15 ms on a 512 px downscale of a 1600 × 1200 frame): Laplacian variance for sharpness (an 8 px checkerboard scores ≥ 900, the same image box-blurred 9×9 scores ≤ 60; the gauge threshold is 120, comfortably between them) and a luma histogram over the palm ROI only for exposure. The shutter is enabled only when `handOk && sharpness.ok && exposure.ok`, assert the full eight-row truth table.

### 6.14 The sky (`engine/sky/`)

Two renderers over one model, so the cheap one is never a downgrade in correctness.

- **Star data:** `scripts/build-stars.mjs` converts BSC5 (public domain) into `src/data/bsc5.bin`, `Float32Array` triples of RA (rad), Dec (rad), magnitude, filtered to mag ≤ 6.0 (~9 100 stars, ≤ 60 kB).
- **Projection:** `altAz(ra, dec, lst, lat)` with `lst = GAST + lon`; a standard spherical rotation at ~40 ns per star, so reprojecting all 9 100 costs under 1 ms and can run every scrub frame.
- **Parapet strip** (2D, always available; Home and leaf entry): a 44 px SVG band showing the horizon at the leaf's place and time, with the Sun and Moon at their real alt/az, the naked-eye planets as brass discs, a gradient keyed to the Sun's altitude (day / civil dusk / night), and the Lagna's sign in the engraved strip. Turning the hour drum re-solves the Lagna and repaints at 30 fps with **no tween**; each frame is one `SiderealTime` call plus the `lagna()` arithmetic.
- **Rooftop dome** (3D, lazy chunk ≤ 200 kB gz): R3F with `frameloop="demand"`, DPR capped at 1.5, stars as a single `Points` with per-vertex size/alpha, the sidereal zodiac ring as a brass torus with 27 nakshatra ticks, planets as billboards, the Lagna as a beam at the eastern horizon. `webglcontextlost`, `prefers-reduced-motion` or no WebGL → the **painted sky** (a d3-geo stereographic SVG of the same data, ink dots on indigo). Both export the same 1080 × 1920 poster.

### 6.15 Composing a reading (`reading.ts`), deterministic, no LLM

```ts
export function compose(hits: Hit[], seed: string): Sentence[] {
  const rng = mulberry32(hashString(seed));      // seed = profileId + presetHash + ruleSetVersion
  return hits
    .sort((a, b) => b.weight - a.weight || a.id.localeCompare(b.id))
    .slice(0, MAX_SENTENCES)
    .map((h) => ({
      text: TEMPLATES[h.id][Math.floor(rng() * TEMPLATES[h.id].length)](h.values),
      citation: h.citation,
      evidence: h.because,                        // taps highlight the chart element
    }));
}
```

Three properties make this trustworthy. The seed is derived from the chart, so **the same chart always reads the same** (byte-identical across 100 runs and across Node and the browser). Every sentence opens with "Tradition says…" / "परंपरा कहती है…" and closes with a superscript citation that resolves to a real entry in `citations.json`. And the template set contains **no** health, death, fertility, wealth or legal vocabulary, a Vitest case greps the whole `TEMPLATES` table (and the rendered Patri and Hast screens) against `src/test/banned-words.ts` (health, disease, death, die, cancer, pregnan, fertility, wealth, money, marriage date, lawsuit, remedy, gemstone, pooja, cure) and fails the build if one appears. Low confidence changes the **wording** ("the life line is faint in this print, trace it to confirm"), never the certainty of the claim. The standing disclaimer is rendered by `Colophon`, not by a template.

### 6.16 Encrypted export and import (`data/crypto.ts`)

The wax envelope is real cryptography, because it carries other people's birth data and photographs of their hands.

```ts
const ITERATIONS = 600_000;

export async function seal(plain: Blob, passphrase: string): Promise<Blob> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv   = crypto.getRandomValues(new Uint8Array(12));
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(passphrase),
                                             'PBKDF2', false, ['deriveKey']);
  const key  = await crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: ITERATIONS, hash: 'SHA-256' },
    base, { name: 'AES-GCM', length: 256 }, false, ['encrypt']);
  const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, await plain.arrayBuffer());
  const header = JSON.stringify({ v: 1, app: 'chowki', kdf: 'PBKDF2-SHA256', iter: ITERATIONS,
                                  salt: b64(salt), iv: b64(iv), alg: 'AES-GCM-256' });
  return new Blob([header, '\n', new Uint8Array(ct)], { type: 'application/octet-stream' });
}
```

Grep the produced envelope for the profile name, the place name and the string `data:image`, all three must be absent. Import of a file with a newer `v` or `schema` refuses with a lac note rather than guessing.

### 6.17 State management and the cast path

Three layers, and nothing crosses them sideways.

| Layer | Holds | Lives in |
|---|---|---|
| **Persisted** | profiles, cached patris, palm captures, readings, milans, cached places, settings | Dexie; read with `useLiveQuery`, written only through `repo.ts` |
| **Derived** | `Patri`, `MilanResult`, `PalmReading` | pure engine calls memoised in `patriCache`, an LRU `Map` of 12 keyed by `profileId + presetHash`; never written directly |
| **Ephemeral UI** | active profile id, open drawer, loupe target and position, drum drag, varga page, theme override, sound/haptics, undo of the last Burn | Zustand store `src/state/ui.ts`, four slices |

```ts
// src/state/ui.ts, one store, four slices, no derived data
export const useUi = create<UiState>()((set) => ({
  activeProfileId: null,
  loupe: { target: null, x: 0, y: 0, mode: 'chart' },
  drums: { dragging: null, velocity: 0 },
  desk:  { themeOverride: null, calm: false, sound: true, haptics: true },
  setLoupeTarget: (grahaId) => set((s) => ({ loupe: { ...s.loupe, target: grahaId } })),
  // ...
}));
```

**The cast path, end to end, is deliberately dull:** `SealButton` held 600 ms → `repo.upsertProfile()` → `computePatri(profile, preset)` (pure, < 100 ms) → `patriCache.set()` → `db.patris.put()` → `useLiveQuery` re-renders the scroll → `ink-draw` plays. Because the engine is pure and fast there is **no loading state and no async boundary inside a cast**, the ink-draw *is* the wait. The only genuinely async work in the app is IndexedDB, MediaPipe/OpenCV loading, and a place search the owner asked for.

### 6.18 Errors

One error type, one presentation language: **the lac seal cracks and says why.** No stack traces, no toast soup, no silent catch.

```ts
export type EngineErrorCode =
  | 'TIME_INVALID'        // 31 February, or a local time that does not exist in that zone
  | 'TIME_AMBIGUOUS'      // a repeated local hour
  | 'PLACE_MISSING'
  | 'VARGA_UNSUPPORTED'
  | 'EPHEMERIS_RANGE'     // outside 1600-2400, where astronomy-engine degrades
  | 'ORACLE_MISMATCH';    // dev-only: a golden fixture disagreed

export class EngineError extends Error {
  constructor(public code: EngineErrorCode, public detail: string) { super(`${code}: ${detail}`); }
}
```

| Failure | What the owner sees | What the code does |
|---|---|---|
| Invalid date on the drums (31 Feb) | the day drum refuses the detent with a dull tick; the value never changes | validated before `resolveBirthMoment`, so `TIME_INVALID` is unreachable from the UI |
| Ambiguous / non-existent local time | haldi note: "this clock time did not exist here; the offset drum resolves it" | Luxon `isValid` false → offer the override drum |
| Place not in the bundle | ruled row "not in the bundle" plus the "search online ⌑" stamp; manual lat/lon always available | no throw, **a birthplace is never a blocker** |
| Place search fails or is rate-limited | lac note "the wire is quiet, type the coordinates" | `NetError`; cached results still served |
| Engine throws during a cast | the lac seal **cracks** in `--danger` with the reason and a "copy details" affordance | error boundary around the Patri route; the previous cached Patri stays on screen |
| MediaPipe fails to load or no hand found | shutter stays disabled with "no hand in frame"; on load failure, straight to the stylus | the geometry reading is skipped; lines are still traceable |
| OpenCV fails to load | the landmark reading (element, ratios) still renders; lines offer trace mode | stage [2] is independent of [3]-[6] by design |
| Line confidence < 0.6 | dashed faint ink + haldi "trace to confirm" + one `notification Warning` | **not an error state at all**, the documented honest path |
| WebGL lost or absent | the painted sky, silently, with a one-line footnote | `webglcontextlost` listener swaps the component |
| IndexedDB quota exceeded | lac toast "the drawer is full, burn a print or export", with current usage | `navigator.storage.estimate()` shown in the Drawer |
| Service worker update available | a paper tab at the top of the desk: "a newer desk is ready, reload" | `registerType: 'prompt'`; **never auto-reload mid-cast** |
| Import with a wrong passphrase | lac note "this seal does not match that passphrase" | catch `OperationError` specifically; three failures add a 2 s delay |

A dev-only assertion layer (`import.meta.env.DEV`) checks engine invariants on every cast, longitudes in `[0,360)`, daśā children summing to their parent, koota scores within their maxima, exactly twelve house assignments, throwing `ORACLE_MISMATCH` loudly in development and being stripped from production.

### 6.19 Performance budget

| Budget | Target | Enforced by |
|---|---|---|
| **Full cast** (9 grahas, Lagna, D1+D9, nakshatra/pada, MD/AD/PD, birth panchang, ≥ 10 yogas) | **< 100 ms** throttled on a 2022 mid-range Android WebView; ≤ 25 ms desktop | `computeMs` recorded in every `Patri`; a bench test with a 60 ms CI budget; median of 20 runs |
| Ink-draw of the North chart | ≤ 1.5 s from cast to drawn | `--dur-draw` math + Playwright animation timing |
| Chart cache hit | ≤ 8 ms, no recompute, no redraw | e2e |
| 11 664-pair Ashtakoota suite | ≤ 2 s total | Vitest timing assertion |
| Mala animation | ≤ 3.5 s for 36 beads; tap-to-skip < 100 ms | 90 ms × 36 = 3.24 s by construction |
| Palm: photo → landmarks → element | **< 3 s** | worker timing log, device checklist |
| Palm: line extraction (warm OpenCV) | ≤ 2.5 s on the 512 ROI; cold ≤ 6 s with "sharpening the stylus…" visible throughout | perf spec |
| Stylus commit → new reading | **< 1 s** after the third path | e2e timing |
| Sky-strip scrub | < 1 ms/frame, 30 fps sustained | `performance.measure` in the scrub loop |
| Drum spin / ribbon flick / loupe drag | ≥ 55 fps (≤ 3 dropped frames per second) | CDP tracing |
| R3F dome | ≥ 40 fps at DPR ≤ 1.5; **0 frames rendered while off-screen** | trace + `visibilitychange` assertion |
| Initial JS (gz) | **≤ 350 kB** | `size-limit` in `pages.yml` |
| Initial CSS (gz) | ≤ 30 kB | same |
| Fonts | ≤ 260 kB woff2 total for three families | `subset-fonts.sh` output check |
| Sound sprite | ≤ 300 kB for both files | file-size assertion |
| Gazetteer | ≤ 1.8 MB gz, parsed ≤ 250 ms, first search ≤ 60 ms | perf spec |
| Lazy chunks are lazy | the model, the OpenCV chunk and the sky chunk are **not requested on `#/`** | network log |
| LCP / CLS | ≤ 2.0 s mobile throttled / ≤ 0.02 | Lighthouse |
| Lighthouse mobile | Performance ≥ 90, installable PWA, a11y ≥ 95 | LHCI |
| WebView memory after a palm run | ≤ 220 MB peak; heap returns within 10 % of baseline after two GCs | CDP heap profiler |
| APK size | ≤ **40 MB** | `stat` assertion in `android-release.yml` |
| Cold PWA install payload | ≤ 6 MB precached | precache spec sums the Workbox manifest |
| Cold start (APK) | teak splash → desk in ≤ 1.2 s | manual, on the phone |

What earns these: the engine is arithmetic on numbers (no object allocated per graha per frame); the parapet strip recomputes with one `SiderealTime` call per frame; every moving object is transform-and-opacity only with `will-change`; the paper grain is one static tile, never a live filter; charts are cached per `presetHash` so a revisit is a render, not a computation; and MediaPipe, OpenCV and three are **route-level dynamic imports** that never appear in the entry graph.

---

## 7. Data sources and APIs

There are exactly **two** network endpoints in the entire app. Both are optional, both keyless, both reached only after the owner taps the "search online ⌑" stamp, which itself appears only when a bundled-gazetteer search returns nothing. `settings.onlineLookupAllowed` starts `false` and is asked for once, in plain language.

### 7.1 Open-Meteo Geocoding (first choice)

```
GET https://geocoding-api.open-meteo.com/v1/search?name=Madurai&count=5&language=en&format=json
```

No key, no headers required; `access-control-allow-origin: *`.

```jsonc
{ "results": [{
    "id": 1264521, "name": "Madurai", "latitude": 9.91868, "longitude": 78.11983,
    "elevation": 132, "timezone": "Asia/Kolkata", "country_code": "IN",
    "admin1": "Tamil Nadu", "population": 909908
}] }
```

Map straight onto `Place` (`geonameId` from `id`, `source: 'open-meteo'`). Limits: 600/min, 5 000/h, 10 000/day; the free tier is **non-commercial**; data is **CC BY 4.0** and is credited in the Colophon.

### 7.2 Nominatim (second choice, on submit only)

```
GET https://nominatim.openstreetmap.org/search?q=Madurai&format=jsonv2&limit=5&addressdetails=1
```

The OSM usage policy is strict and the app obeys it literally: **≤ 1 request per second** (a token bucket in `places.ts` with a 1 100 ms minimum gap, single-flight), an identifying `Referer` (the browser sets it; `User-Agent` is not settable from a page, which is why Nominatim is second and rare), **never autocomplete**, it fires only on an explicit submit, never per keystroke, and ODbL attribution in the Colophon. `lat`/`lon` come back as strings and must be parsed; there is no timezone field, so `tz-lookup` supplies the zone.

### 7.3 Failure, caching and the CSP

```ts
const CACHE_TTL = 90 * 24 * 60 * 60 * 1000;

export async function searchOnline(q: string, signal: AbortSignal): Promise<Place[]> {
  const hit = await db.places.where('name').equalsIgnoreCase(q).first();
  if (hit && Date.now() - hit.fetchedAt < CACHE_TTL) return hit.results;
  try {
    const r = await fetch(openMeteoUrl(q), { signal });
    if (r.status === 429) throw new NetError('RATE_LIMIT');
    if (!r.ok) throw new NetError('HTTP_' + r.status);
    const places = mapOpenMeteo(await r.json());
    await db.places.put({ name: q, results: places, fetchedAt: Date.now() });
    return places;
  } catch (e) {
    if (signal.aborted) return [];
    return nominatimFallback(q, signal);            // rate-limited to 1 rps, on submit only
  }
}
```

Every online result is written to `db.places`, so a place looked up once is offline forever. On total failure the row shows a lac note, "not found; you can type the coordinates", and a manual lat/lon entry appears.

**The CSP in `index.html` is the second line of defence.** Ship it exactly:

```html
<meta http-equiv="Content-Security-Policy" content="
  default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:;
  connect-src 'self' https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org;
  img-src 'self' blob: data:; media-src 'self'; style-src 'self' 'unsafe-inline';
  font-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'">
```

`'wasm-unsafe-eval'` and `worker-src blob:` are what let MediaPipe and OpenCV compile. **Drop either and the Hast screen dies silently with an empty console**, that is the single most confusing failure in this app.

### 7.4 Bundled datasets

| Dataset | Source | Licence | Build step | Budget |
|---|---|---|---|---|
| Gazetteer | GeoNames `cities500` plus the full `IN`, `NP`, `LK`, `PK`, `BD` files | CC BY 4.0 | `scripts/build-gazetteer.mjs` → `src/data/geonames-in.json.gz` (name, admin1, country, lat, lon, timezone, geonameId) | ≤ 1.8 MB gz; asserts its own size; "Madurai", "Vaitheeswaran Koil" and "Bengaluru" must all resolve |
| Stars | Yale Bright Star Catalog BSC5 (HEASARC) | public domain | `scripts/build-stars.mjs` → `src/data/bsc5.bin`, Float32 RA/Dec/mag, mag ≤ 6 | ≤ 60 kB, ~9 100 stars |
| Hand model | MediaPipe `hand_landmarker.task` float16 | Apache-2.0 | committed to `public/models/`, 7 819 105 B | runtime-cached, never precached |
| MediaPipe wasm | `node_modules/@mediapipe/tasks-vision/wasm/*` | Apache-2.0 | copied to `public/mediapipe/` in a `prebuild` step | ~3 MB, runtime-cached |
| Classical tables | BPHS / Muhurta Chintamani, re-typed | facts | `src/data/tables/*.ts` + `citations.json` | - |
| Sounds | freesound.org CC0 filter + Kenney.nl | CC0 | one sprite, `public/sounds/ATTRIBUTION.md` | ≤ 300 kB |

`src/data/attribution.json` carries every credit and is rendered by the Colophon; `README.md` carries the same list in an **Attribution** section (the licence checker asserts it exists).

---

## 8. Platform integration (Capacitor 8)

Capacitor 8 wraps the same `dist/`. **No custom native code**, every capability is a first-party plugin, which is why `android/` is generated once, committed, and thereafter touched only for the manifest, resources and icons below.

**`capacitor.config.ts`:**

```ts
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.rahul.jyoti',
  appName: 'Chowki',
  webDir: 'dist',
  android: {
    adjustMarginsForEdgeToEdge: 'auto',
    webContentsDebuggingEnabled: false,   // true only on a debug/* branch, never on a tag
  },
  plugins: {
    SplashScreen: { backgroundColor: '#1A110B', launchAutoHide: false, launchFadeOutDuration: 240 },
    StatusBar:    { overlaysWebView: true, style: 'DARK', backgroundColor: '#1A110B' },
    Camera:       { presentationStyle: 'fullscreen' },
  },
};
export default config;
```

**Plugins and what each is for:**

| Plugin | Used by | Notes |
|---|---|---|
| `@capacitor/camera` | Hast capture | `getPhoto({ resultType: Uri, quality: 90, width: 1600, source: Prompt })`. `Uri` (not base64) keeps a 4 MB JPEG off the JS heap; the canvas downscales before any CV runs |
| `@capacitor/filesystem` + `/share` | wax-envelope export | Write to `Directory.Cache`, then `Share.share({ files: [uri] })`. Import is a plain `<input type="file">`, the system picker needs no permission |
| `@capacitor/haptics` | drum detents, tilak, beads, seal, burn | `selectionChanged` for detents, `impact` for seal/tilak/burn; every call no-ops on a device without a vibrator |
| `@capacitor/preferences` | theme + `calmDesk` before first paint | read in the boot script so the desk never flashes the wrong wood |
| `@capacitor/status-bar` + `/splash-screen` | edge-to-edge, teak splash with the diya | style `Dark` on the night desk, `Light` on the morning terrace, switched by the same effect that sets `data-theme` |
| `@capacitor/app` | predictive back → "return to Chowki" | `App.addListener('backButton')` maps to the reverse `object-open` |

**Manifest additions** (`android/app/src/main/AndroidManifest.xml`):

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.VIBRATE" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
<!-- inside <activity>: -->
android:enableOnBackInvokedCallback="true"
android:configChanges="orientation|keyboardHidden|keyboard|screenSize|locale|smallestScreenSize|screenLayout|uiMode"
```

`READ_MEDIA_IMAGES` is deliberately **not** declared: `@capacitor/camera`'s gallery path uses the Android photo picker, which grants per-image access with no permission prompt and handles Android 14's "Select photos" partial access for free. `CAMERA` is declared because the guided-capture screen uses `getUserMedia` for the live sharpness/exposure gauges. Also deliberately absent: every storage/media permission, `POST_NOTIFICATIONS`, `SCHEDULE_EXACT_ALARM`, `RECEIVE_BOOT_COMPLETED` and every `ACCESS_*_LOCATION` (the app never asks for GPS, it uses the active profile's birthplace).

**Android resources to author before the first build:**
- `res/values/colors.xml`: `chowki_teak #1A110B`, `chowki_paper #F4EAD3`, `chowki_sindoor #B5301C`, `chowki_brass #C9A24A`, `chowki_ledge #241811`.
- `res/drawable/splash.xml`: a layer-list, `@color/chowki_teak` fill plus the centred diya vector from `public/icon.svg`.
- `res/mipmap-anydpi-v26/ic_launcher.xml` and `ic_launcher_round.xml`: adaptive icon, background `@color/chowki_teak`, foreground the brass diya with the vermilion flame tip (18 % safe padding), plus a `<monochrome>` diya-silhouette layer. Delete the Capacitor placeholder PNG mipmaps.
- `res/values/strings.xml`: `app_name = Chowki`, `title_activity_main = Chowki`, `package_name` / `custom_url_scheme = com.rahul.jyoti`.
- `res/values/styles.xml`: `AppTheme.NoActionBarLaunch` with `windowSplashScreenBackground = @color/chowki_teak`.
- No `network_security_config` is needed, all traffic is HTTPS or local.

**Web vs Android differences you must actually handle:**

| Concern | Web | Android (Capacitor) |
|---|---|---|
| Service worker | registered (`registerType: 'prompt'`) | **not registered**, `if (!Capacitor.isNativePlatform())` guards it, and the build sets `VITE_PLATFORM=android` so the PWA plugin is skipped entirely |
| Vite `base` | `/jyoti/` on Pages | `/` (Capacitor serves from `https://localhost/`) |
| Camera | `getUserMedia` + `<input type="file" accept="image/*">` | `@capacitor/camera` native picker; live gauges still use `getUserMedia` |
| Palm image URLs | `blob:` URLs | `_capacitor_file_` URLs, **test the print rendering on the device, not only in Chrome** |
| Export | anchor download of the Blob | `Filesystem.writeFile` to Cache + `Share.share` |
| Haptics | `navigator.vibrate` fallback | `@capacitor/haptics` |
| Insets | none | `env(safe-area-inset-*)` everywhere; Ledge at `calc(64px + inset-bottom)` |
| Back | browser history | predictive back via `@capacitor/app`; if it misbehaves, the documented temporary opt-out is `android:enableOnBackInvokedCallback="false"` |
| WebGPU | maybe | **absent from the Android System WebView**, nothing may assume it; the dome is WebGL2 with `frameloop="demand"`, DPR ≤ 1.5, paused on `visibilitychange` |
| Memory | generous | OpenCV wasm inside the worker; every `Mat` `.delete()`d in a `finally`; a leak is an OOM kill on a 4 GB phone |
| Text scale | browser zoom | system font scale honoured to 1.3× before the ledger stacks |

---

## 9. Build order with checkpoints

Work in this order. **Day 1 ends live on GitHub Pages.** Engine before UI. After each step, run the command and verify the stated result before moving on.

### Phase 0, Setup: live on day 1 (about one full day)

**0.1 Scaffold.** From `C:\Work\Personal_Projects\02-jyoti-astrology-palmistry` (the folder itself becomes the repo root):

```bash
npm create vite@latest . -- --template react-ts     # choose "Ignore files and continue"
npm install
npm i tailwindcss @tailwindcss/vite motion zustand react-router \
      dexie dexie-react-hooks dexie-export-import lucide-react
npm i astronomy-engine luxon @photostructure/tz-lookup minisearch
npm i -D @types/luxon @ishubhamx/panchangam-js        # devDependency ONLY, Node oracle tests
npm i @mediapipe/tasks-vision @techstark/opencv-js@4.12.0-release.1
npm i three @react-three/fiber @react-three/drei d3-geo
npm i -D @types/three @types/d3-geo
npm i howler @fontsource/yatra-one @fontsource/tiro-devanagari-hindi @fontsource-variable/martian-mono
npm i -D @types/howler
npm i @capacitor/core @capacitor/android @capacitor/app @capacitor/camera @capacitor/filesystem \
      @capacitor/haptics @capacitor/preferences @capacitor/share @capacitor/status-bar @capacitor/splash-screen
npm i -D @capacitor/cli
npm i -D vite-plugin-pwa @vite-pwa/assets-generator vitest @vitest/coverage-v8 @testing-library/react \
         @testing-library/jest-dom @testing-library/user-event jsdom fake-indexeddb \
         @playwright/test @axe-core/playwright @lhci/cli size-limit @biomejs/biome
npx biome init && npx playwright install chromium
npx shadcn@latest init && npx shadcn@latest add dialog radio-group switch tabs
```
> **Verify:** `npm run dev` serves the Vite page; `npx biome check .` and `npx vitest run` pass with one placeholder test.

**0.2 Self-host the models.**
```bash
mkdir -p public/models public/mediapipe
cp node_modules/@mediapipe/tasks-vision/wasm/* public/mediapipe/
curl -L -o public/models/hand_landmarker.task \
  https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task
```
> **Verify:** `hand_landmarker.task` is exactly **7 819 105 bytes**. Add a `prebuild` npm script that re-copies the wasm folder so it can never drift.

**0.3 `vite.config.ts`**, exactly as in §11.2, with `base`, the three OpenCV node-builtin aliases, `VitePWA` skipped when `VITE_PLATFORM=android`, and the `manualChunks` split.
> **Verify:** `npm run build` succeeds with **no "externalized for browser compatibility" warnings**; `$env:VITE_BASE_PATH="/jyoti/"; npm run build; npx vite preview --base /jyoti/` serves `http://localhost:4173/jyoti/`.

**0.4 Router.** `src/app/router.tsx` with `createHashRouter` and all twelve routes rendering placeholder text.
> **Verify:** `#/patri/demo` survives a reload with no 404; `#/nonsense` lands on `#/lost`.

**0.5 Tokens, fonts, springs.** Paste §3.3 verbatim into `src/styles/tokens.css`; add the `@theme inline` bridge; add `src/motion/springs.ts`; import the three Fontsource families in `main.tsx`; add the `index.html` theme-bootstrap inline script that sets `data-theme` before first paint.
> **Verify:** a scratch page renders Yatra One, Tiro Devanagari Hindi and Martian Mono with correct Devanagari conjuncts ("जन्म पत्री · शनि"); switching the OS theme with "auto" flips night desk / morning terrace with **no flash on reload**.

**0.6 Pages CI.** Copy `pages.yml` (§11.3) and `ci.yml` (§11.4) into `.github/workflows/`; `git init -b main`; `gh repo create jyoti --public --source . --push`; Settings → Pages → Source **GitHub Actions**.
> **Verify:** `https://<owner>.github.io/jyoti/` shows the placeholder desk with fonts loaded, and Chrome on the phone offers "Install app". Also `curl -I` the manifest, `sw.js` and `models/hand_landmarker.task`, all 200.

**0.7 Capacitor shell.**
```bash
npx cap init Chowki com.rahul.jyoti --web-dir dist
npx cap add android      # the "Gradle sync failed" warning without a local SDK is expected
printf 'android/gradlew text eol=lf\n*.sh text eol=lf\n*.task binary\n*.bin binary\n*.woff2 binary\n' >> .gitattributes
git update-index --chmod=+x android/gradlew
```
Merge the Gradle snippet (§11.6) into `android/app/build.gradle`, setting **both** `namespace` and `applicationId` to `com.rahul.jyoti`.
> **Verify:** `git diff` on `build.gradle` shows only the version/signing block changed.

**0.8 Keystore and secrets** (§11.7). Generate the PKCS12 keystore **outside the repo** with OpenSSL in Git Bash, back it up in **two** places plus the password manager, then set the four repository secrets.
> **Verify:** `gh secret list` shows `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`. **Losing this file is unrecoverable, back it up before writing another line of code.**

**0.9 First APK.** Copy `android-release.yml` (§11.5); run it once via `workflow_dispatch`; then `git tag v0.0.1 && git push origin v0.0.1`.
> **Verify:** the Release carries `jyoti-0.0.1.apk` and `SHA256SUMS.txt`; the APK is `app-release.apk` (not `-unsigned`), installs on the phone and opens the placeholder desk.

**0.10 Icon and splash.** Draw `public/icon.svg` (brass diya, vermilion flame tip, teak ground); `npx pwa-assets-generator --preset minimal-2023 public/icon.svg`; author the Android adaptive icon, monochrome layer and splash drawable.
> **Verify:** the home-screen icon and splash are teak/brass; the maskable icon survives the circle-mask preview; no white flash on cold start.

**Phase 0 DoD:** placeholder desk live on Pages *and* installed from a signed Release APK; CI green; tokens, fonts and springs loaded; keystore backed up twice.
**Risks:** a Gradle/AGP mismatch on the first CI run (pin exactly what `npx cap add android` generated, never "fix" it by upgrading); forgetting `VITE_BASE_PATH` gives a blank page on Pages.

### Phase 1, Design system and skeleton screens (about 2 days)

No engine work here. Screens are driven by hand-written fixture JSON matching the `Patri` type.

**1.1** `design/preview.html` **already exists** and is the baseline, five screens (Chowki home, Janam Patri with D1 drawn and the loupe open, Writing the leaf with drums + parapet strip, Hast Rekha, and the Guna mala), a Google Fonts `<link>` (allowed **there only**) and a working embedded ephemeris that computes the §0.1a numbers instead of hard-coding them. **Do not regenerate it and do not rewrite its screens.** Read it, then port §3/§4 into React against it; when §3 or §4 changes, extend the preview to match rather than starting over.
> **Verify:** every element in §4's wireframes is present; the DevTools contrast picker shows ≥ 4.5:1 on every text run; paper occupies ≥ 85 % of each screen; the engraved strip reads `JD 2449425.5799` and `LAGNA ♓ MEENA`.

**1.2 Materials pass.** Paper + baked `public/grain.svg`, turmeric band with kumkum tick, brass cylinder/conic gradients, indigo block-print cloth, lac seal, the single-lamp shadow tokens, the loupe's canvas magnifier.
> **Verify:** a `/#/_kit` dev route shows each material at phone and desktop widths; **no `backdrop-filter`, no blur, no mesh gradient, no bitmap texture** appears anywhere in the CSS.

**1.3 `components/ui`.** `Drawer`, `FootnoteSheet` (shadcn Dialog restyled), `LedgerRow`, `TurmericBand`, `EngravedStrip`, `Button` (text-with-underline / stamp / danger), `RadioRow`, `ToggleRow`, `Toast`.
> **Verify:** every variant and state renders in `/#/_kit`; focus rings are visible on paper, brass **and** teak.

**1.4 `Ledge` + `DeskObject` + `Shell`.** Five objects at ≥ 56 px with engraved labels, active raised 4 px, safe-area inset, desktop vertical variant at ≥ 900 px.
> **Verify:** Tab and arrow keys traverse the Ledge; the active object is announced by name; nothing sits under the Android gesture pill.

**1.5 `BrassDrum`.** BRASS inertia, detents, refusal tick, `role="spinbutton"`, arrow keys, PageUp/Down, tap-to-type fallback.
> **Verify:** flicking a year drum coasts and clicks into a detent; 31 February is **refused** with a dull tick (value unchanged, `aria-invalid`); a screen reader announces each settled value once, debounced 300 ms.

**1.6 `KundliNorth` / `KundliSouth`** from the geometry constants in §6.12, with `ink-draw` and the `tilak-dab` on the Lagna.
> **Verify:** twelve regions get the right sign numbers for a Meena-Lagna fixture; the flip puts Meṣa at (0,1) and Meena top-left; the whole draw finishes in ≤ 1.5 s.

**1.7 `digit-set`** numeral component (tabular cells, `--ink-faint → --ink` over 120 ms, 24 ms stagger).
> **Verify:** changing `23°51′12″` to `23°46′48″` animates only the changed digits with **no layout shift**.

**1.8 Static screens** from `src/data/fixtures.ts`: home, Today, Circle, Writing the leaf, Patri, Milan, Hast desk, Drawer, `#/lost`.
> **Verify:** Playwright screenshots (phone 390 × 844 and desktop 1280 × 800; night + day; reduced motion) are committed as the baseline and match `design/preview.html` on review.

**Phase 1 DoD:** every screen exists with fixture data and matches the preview; baselines committed; **no hex value lives outside `tokens.css`**.
**Risks:** the known failure mode is *wood-textured skeuomorph*, if a screenshot reads as "tavern" rather than "manuscript", cut wood until paper is ≥ 85 %. Set Devanagari `line-height: 1.6` **before** laying out the ledger.

### Phase 2, The engine, then the core features (the longest phase)

Blocks 2a-2d are pure TypeScript with Vitest and **no UI**.

**2a, time, ayanamsa, ephemeris, nodes, lagna (3 sittings)**
- `engine/time.ts` → *the five historical fixtures resolve exactly (TZ-1…TZ-15 in §6.1); `jdUt` for the running example is **2449425.579861***.
- `engine/ayanamsa.ts`, all three presets → *at `T = −0.05802654` the presets give 23°46′48.5″ / 23°46′33.6″ / 23°46′57.9″; `se-true − se-mean === Δψ` to 0.01″; `drik-mean − se-mean === 24.29″ ± 0.05″` on ten dates 1900-2030*.
- `engine/ephemeris.ts` behind the `Ephemeris` interface, plus speed, retrograde, combustion orbs and dignity tables → *Sun and Moon longitudes agree with `panchangam-js` within its documented mean-Lahiri offset; Mercury is flagged retrograde and combust in the right windows*.
- `engine/nodes.ts` (mean + true) → *the two agree within 1.8° across 100 random dates; both always retrograde*.
- `engine/lagna.ts` → *RAMC 277.8081°, ε 23.438851°, ASC tropical 9.4371°, **ASC sidereal 345.6570° = Meena 15°39′25″**, MC Dhanu 13°23′27″; a 60 °N fixture does not blow up on `tan φ`*.
- `engine/patri.ts` assembling all of it, with the dev-only invariant assertions → *a cast of the running example returns 9 grahas, Lagna, D1, D9 and `computeMs` under 60 ms in Node*.

**2b, nakshatra, vargas, dasha, panchang (3 sittings)**
- `engine/nakshatra.ts` + `boundary.ts` → *λ = 329.4811° gives Pūrva Bhādrapadā pada 3, lord Jupiter, **no asterisk** (31′08″ from the cusp); the synthetic λ = 213.3300° flags the Viśākhā/Anurādhā edge at 0′12″ and names both sides*.
- `engine/vargas.ts`, all nine → *the running example's Sun produces the nine-row table verbatim; the D9 closed form agrees with the movable/fixed/dual derivation at all 4 320 five-arcminute samples*.
- `engine/dasha.ts` → *the reference Moon at 349.1688° gives **Budha** balance 13.809790 yr ending 2008-01-04 ≈ 08:02 IST, antardaśā **Ketu** 1993-06-01 → 1994-05-29; every level sums exactly to its parent; the 360-day setting shifts the MD end by ~1.5 %*.
- `engine/panchang.ts` + `sunrise.ts` → *the five aṅga names match hand-recorded drikpanchang.com values for Bengaluru on ten consecutive days under `drik-mean`; every end time within 60 s; a full panchang computes in under 5 ms*.
- Golden-chart harness: `__fixtures__/golden/*.json`, **50 charts** spanning 1900-2030 and five continents, each tagged with its preset and oracle → *`npx vitest run golden` compares graha and Lagna longitudes to within **1′** of the recorded `swetest`/JHora values under `se-true`, printing the arcsecond delta per body on failure*.

**2c, yogas, matching, the 11 664-pair oracle (2 sittings)**
- `engine/yogas.ts`, the starter ten as `YogaRule` predicates with citations and `because` evidence → *every rule has a positive and a negative fixture; Gaja-Kesari downgrades to `partial` when Jupiter is debilitated; the cancellation pass rewrites Kemadruma when any of its four cancellations fires*.
- `engine/ashtakoota.ts`, eight kootas plus Manglik → *Revatī × Rohiṇī scores 1 / 2 / 1.5 / 2 / 0.5 / 6 / 7 / 0 = **20 "acceptable"** with Nāḍī the only doṣa; every koota returns its `because`*.
- `scripts/import-oracle.mjs` → `__fixtures__/ashtakoota-oracle.bin`; the oracle test → *all **11 664** pairs match; a deliberately corrupted Vaśya cell makes the test fail and prints the offending pair by name*.
- `engine/reading.ts` with the template table, seeded ordering, banned-word test → *the same chart produces byte-identical sentences across 100 runs; adding "cancer", "death", "pregnan", "wealth" or "lawsuit" to a template fails the build*.

**2d, data layer and gazetteer (2 sittings)**
- `scripts/build-gazetteer.mjs` → *≤ 1.8 MB gz; "Madurai", "Vaitheeswaran Koil" and "Bengaluru" resolve with lat/lon/timezone*.
- `data/db.ts` (schema v1) + `data/repo.ts` (`upsertProfile`, `castPatri` cache-aware, `savePalm`, `burnProfile`, `saveSettings`, `putPlace`) → *Vitest with `fake-indexeddb` covers every function; `burnProfile` clears all six tables in one transaction and leaves no blob*.
- `data/places.ts`: minisearch over the bundle, then the Open-Meteo → Nominatim ladder with the 1.1 s token bucket and 90-day cache → *typing never issues a request; only the "search online ⌑" tap does; two rapid Nominatim calls are ≥ 1.1 s apart; a cached place is served offline*.
- `data/crypto.ts` seal/unseal → *export → wipe → import restores every table; a wrong passphrase raises the lac note, not a stack trace*.

**2e, Writing the leaf and the Janam Patri (1 day)**
- Wire `#/leaf/new`: drums → `resolveBirthMoment` → live `EngravedStrip` → `PlaceSearch` → Bombay override drum → hold-to-seal → `castPatri` → navigate. > *Sealing the running example writes a profile and a `patris` row and lands on the Patri with the ink drawing; the strip's zone, offset and JD match the engine exactly.*
- `#/patri/:id`: rollers bound to scroll progress, birth line, birth panchang rows, `KundliNorth` with real placements, `GrahaLedger`, `VargaPager` (D9 first), `DashaRibbon` with the brass "now" clip, `YogaParagraph` with citation superscripts, `Colophon`. > *Every ledger degree matches the golden fixture to the arcsecond; tapping a citation opens the footnote sheet; the colophon names the ayanamsa preset, node type and daśā year length.*
- Loupe: rises under the finger, magnifies the house, reads `MA 11°31′24″ · ŚATABHIṢĀ 2 · LORD RĀHU`, snaps planet to planet, keyboard mode. > *Touch, mouse and Tab+Enter all reach every graha; the readout uses `digit-set`; the boundary badge appears only when `boundary !== null`.*
- `#/circle` with `useLiveQuery`, thread-untie fan, swipe-left to Export / Burn. > *Three profiles fan on drag; Burn removes the leaf and its prints and cannot be undone after the char completes.*

**2f, Today's leaf and the Guna mala (1 day)**
- `#/today` brass dial, ruled aṅga rows with end times, sunrise/sunset, Rāhu Kāl, Moon pager. > *All five rows and their end times match the panchang fixtures; swiping the Moon pages days and ages the phase; the whole screen works in airplane mode.*
- `#/milan/:a/:b` scroll pair, mauli thread, 36-bead mala with `bead-slide`, doṣa lac beads, lac band stamp, per-koota notes. > *Revatī × Rohiṇī lands on 20 with the bead pattern of §4.9 (seven brass Bhakūṭa beads, eight lac Nāḍī beads) and finishes in ≤ 3.5 s; tapping a koota row shows its rule and both nakshatras in Devanagari and Latin.*
- `--moon-k` wired from `Panchang.moonIllumination`. > *At Pūrṇimā the indigo cloth cools measurably and the vignette lifts; text tokens untouched; shadow direction unchanged.*

**2g, Palm v0 (1 day)**
- `#/hast/:id/capture`: `getUserMedia` / file input on web, `@capacitor/camera` on Android, chalk outline, sharpness and exposure gauges, shutter gated on hand detection. > *The shutter stays disabled on a blank frame and on the back of a hand; the gauges turn haldi in dim light.*
- MediaPipe `HandLandmarker` in IMAGE mode from self-hosted wasm + model; landmarks drawn over the photo; the geometry-only reading with citations. > *Shutter to element + ratios in **under 3 s** on the phone; handedness below 0.8 rejected with a plain note; works with the network off.*
- Store the capture and reading in Dexie; `#/hast/:id` shows the print, landmarks and reading with the disclaimer; **Burn** removes the print and its blob. > *Reopening the app shows the same reading; Burn leaves no blob in `db.blobs`.*

**Phase 2 DoD:** the whole MVP feature set works on web with real numbers; engine line coverage ≥ 95 % with the golden, oracle and boundary suites green; a cast of the running example completes in < 100 ms and matches `swetest` to 1′.
**Risks:** every golden fixture must record **which preset and which oracle** produced it, or the suite is unfalsifiable. `panchangam-js`'s mean Lahiri sits ~24″ from `se-true`, compare **classifications**, not raw longitudes. Palm work on a desktop webcam flatters the pipeline; test on the phone from the start.

### Phase 3, Polish, motion and sound

Nothing here changes a data shape or an engine result.

- **Motion audit** against §3.6: all fourteen animations at their specified durations, easings and staggers; four springs on the right objects; nothing animates a filter or a shadow blur. > *A `motion-audit.md` checklist with a tick per animation, plus a reduced-motion Playwright snapshot showing a steady flame, static rollers and instant digits.*
- **`unroll` + `seal-thunk`.** > *A 120-year daśā ribbon makes a visibly longer scroll; holding the seal after a preset change clears the haldi "recompute" tab.*
- **`drum-spin` + `sky-scrub`.** > *A Chrome trace on the phone shows ≤ 8 ms scripting per frame during a fast flick; the Lagna label changes exactly at the boundary.*
- **`lamp-flicker`, tithi fill-light, auto night/day by real sun altitude** with the diya as manual override. > *At 18:40 local the desk turns itself; tapping the diya pins the theme; flicker stops under reduced motion and "Calm desk".*
- **Sound sprite.** Source the twelve CC0 clips, build `public/sounds/chowki.{webm,mp3}` ≤ 300 kB with `ATTRIBUTION.md`, wire Howler at master 0.5, unlock on the first gesture, respect silent mode. > *Every §3.9 event fires its clip; the brass tick is rate-limited to one per 40 ms; muting silences everything immediately.*
- **Haptics** through `platform/haptics.ts` with a `navigator.vibrate` fallback; never on scroll.
- **Accessibility sweep:** chart ledger twins, live regions for drums, `lang="hi"`/`lang="sa"` spans, 200 % zoom, colour-independent doṣa and boundary indicators. > *axe reports zero serious or critical issues on all twelve routes; TalkBack reads a graha row as "Sun, Kumbha, 29 degrees 28 minutes, Purva Bhadrapada pada 3".*
- **Performance pass:** `size-limit` gate at 350 kB gz, `pyftsubset` fonts to ≤ 260 kB, route-level dynamic imports verified by an import-graph test, `content-visibility: auto` on ledger rows. > *Lighthouse mobile Performance ≥ 90 and installable; OpenCV, MediaPipe and three appear in no entry chunk.*

**Phase 3 DoD:** the app is indistinguishable from `design/preview.html` in motion and at rest; sound, haptics and reduced-motion paths complete; every §6.19 budget met.
**Risks:** Web Audio in the Android WebView needs a genuine touch gesture, unlock on both `touchstart` and `pointerdown`. The flicker driving shadow offsets is the easiest way to lose 60 fps: keep it to **one** CSS variable updated at 80 ms.

### Phase 4, Android packaging

Every check is on a real phone from a `workflow_dispatch` APK.

- Camera path end to end, with permission denial degrading to gallery-only. > *A palm photographed on the phone produces landmarks and a reading; denying the camera still allows a gallery pick with a plain note.*
- OpenCV + MediaPipe inside the WebView: lazy chunks, worker instantiation, `Mat.delete()` in `finally`. > *Ten consecutive line extractions do not grow memory in `chrome://inspect`; no OOM kill on a 4 GB device.*
- Edge-to-edge and system bars; predictive back mapped to "return to Chowki". > *No content under the status bar or nav pill; the back gesture reverses `object-open` rather than exiting.*
- Rooftop dome on device: `frameloop="demand"`, DPR ≤ 1.5, pause on `visibilitychange`, painted-sky fallback on `webglcontextlost`. > *The dome holds ≥ 40 fps while dragging; backgrounding and returning does not leak a context.*
- Export/import on Android via `Filesystem.writeFile` + `Share.share` and `<input type="file">`. > *The wax envelope lands in Drive through the share sheet and re-imports.*
- Splash and icon with `launchAutoHide: false` and a 240 ms fade. > *Cold start shows teak → diya → desk with no white flash.*
- Release hygiene: `versionName` from the tag, `versionCode` from the run number, `SHA256SUMS.txt`, install-over-previous test. > *`v0.2.0` installs over `v0.1.0` without uninstalling and every profile survives.*

**Phase 4 DoD:** a signed APK from a tag installs and updates on the owner's phone; camera, haptics, edge-to-edge, back and the dome verified on device; the §10.7 checklist passes.
**Risks:** WebGPU is absent from the Android System WebView. `_capacitor_file_` URLs behave differently from `blob:`. OEM battery managers can suspend the WebView mid-capture, document it, do not fight it.

### Phase 5, Testing and launch

- Golden validation to the bar: 50 charts against `swetest`/JHora under `se-true` within 1′, and 30 consecutive days of panchang **names** against drikpanchang.com for Bengaluru, Delhi and Chennai under `drik-mean` at 100 %.
- Playwright e2e: write a leaf → seal → cast → read; preset change → recompute; palm capture (stubbed image) → trace fallback → reading; milan to 36 beads; export → wipe → import; `#/lost`.
- **The zero-leakage test** (§10.6), never waived.
- Privacy and data drills: 20 profiles with two palm prints each. > *Bundle-screen query < 20 ms; export < 25 MB; import < 8 s; a post-Burn IndexedDB dump contains no trace of the profile.*
- Time drills: the five historical fixtures on device; a chart cast while the phone is set to a different time zone; a leap-day birth. > *The resolved offset depends only on the birthplace and date, never on the phone's clock zone.*
- README: live URL, Release link, screenshots, Attribution verified against `npx license-checker --summary`. > *Every dependency licence is OSI/OFL/CC0; no AGPL anywhere in the tree.*
- Tag `v1.0.0`; install on the phone; cast five real charts and read one aloud to each person; log friction in `docs/JOURNAL.md`.

**Phase 5 DoD:** CI runs Biome + Vitest + Playwright before every deploy; `v1.0.0` on Releases and live on Pages; the arcsecond and zero-leakage criteria demonstrably met.

### Phase 6, Stretch (pick by recorded friction)

Palm v1 (the full CV pipeline of §6.13 with rectification, ridge filter, thinning, labelling and the stylus fallback, on both hands) · the Rooftop dome in full with the 1080 × 1920 poster · engine v1 (Bhāva Chalit table, ~40 yogas with cancellations, Manglik with all six cancellations, pratyantar folds, the remaining vargas) · the 10-porutham thread · Bhakūṭa/Nāḍī cancellation toggles · Devanagari digits, chart-script toggle and the `hi` locale · 🔮 Swiss Ephemeris precision mode (**requires relicensing the repo to AGPL-3.0**, a one-page decision note first) · 🔮 gochar with a Sade-Sati ribbon, a Muhurta finder, adhika māsa and festivals · 🔮 daily-panchang notifications · 🔮 Shadbala, Ashtakavarga, Sudarshana, Arudha padas · 🔮 Tamil/Telugu UI, PDF Patri, QR profile sharing, an opt-in BYO-key paraphraser labelled "AI-generated paraphrase of the rule hits above".

### Weekend MVP fast path (ship Sunday night, cast a chart on Monday)

**Saturday:** Phase 0 entirely → `engine/time.ts`, `ayanamsa.ts` (all three presets), `ephemeris.ts`, `nodes.ts` (mean only), `lagna.ts` with the running-example and historical fixtures → `nakshatra.ts`, `vargas.ts` (D1 and D9 only), `dasha.ts` (MD + AD), `panchang.ts` (five aṅgas with end times, upper-limb sunrise), `patri.ts` → `build-gazetteer.mjs`, `db.ts` + `repo.ts` with `upsertProfile`, `castPatri`, `saveSettings`.

**Sunday:** `#/leaf/new` (five drums, detents are enough, inertia optional; bundled place search; the engraved strip; hold-to-seal) → `#/patri/:id` (`KundliNorth` with `ink-draw` and the tilak, `GrahaLedger` with ′ ″ and boundary asterisks, `DashaRibbon` MD/AD, the ten yogas as a cited paragraph, the colophon) → `#/circle` and `#/today` → Palm v0 (file input → MediaPipe landmarks → element and ratios → landmarks over the photo → "Tradition says…"; **no OpenCV, no lines**) → the Ledge, night desk, diya, paper grain → tag `v0.1.0`, install the APK, cast your own chart and one grandparent's 1940s chart before bed.

Deferred without guilt: the mala, the loupe, the parapet strip, the dome, palm line extraction, the stylus, sound, haptics, the morning terrace, Devanagari digits, encrypted export, the true node, and every varga past D9.

---

## 10. Testing requirements

Nothing is "done" until these exist and pass. Vitest projects: `engine` (`environment: node`), `oracle`, `dom` (jsdom). Playwright projects: `desktop-chromium` (1280 × 800) and `pixel-7` (393 × 852, DPR 2.625, `hasTouch`), with `timezoneId: "Asia/Kolkata"`, `locale: "en-IN"`, `colorScheme: "dark"`, and `webServer` running `vite preview --base /jyoti/ --port 4173` so every test exercises the real sub-path.

```json
{
  "test": "vitest",
  "test:unit": "vitest run --coverage",
  "test:oracle": "vitest run --project oracle",
  "test:e2e": "playwright test",
  "test:visual": "playwright test e2e/visual",
  "test:visual:update": "playwright test e2e/visual --update-snapshots",
  "test:a11y": "playwright test e2e/a11y.spec.ts",
  "test:privacy": "playwright test e2e/privacy.spec.ts && node scripts/check-no-biometrics.mjs",
  "test:perf": "playwright test e2e/perf && lhci autorun",
  "test:all": "npm run test:unit && npm run build && npm run test:e2e && npm run test:privacy"
}
```

### 10.1 Determinism rules

- **Nothing in `src/engine` reads the clock.** Every entry point takes an explicit `jdUt` (or `{ localDateTime, zone }`) plus an `EnginePreset`. A Biome `noRestrictedGlobals` rule for `Date.now`, plus a test that greps `src/engine` for a zero-argument `new Date()`, enforces it.
- **Every assertion states its tolerance and its oracle.** A custom matcher `toBeCloseToArcsec(expected, arcsecTolerance)` lives in `src/test/matchers.ts` and prints the difference in `d°m′s″`. Use 60″ for the ±1′ engine claim and 2″ for pure-math functions where only float error is allowed.
- **Presets are never implicit.** Every golden row carries `{ ayanamsa, nodeType, dashaYearDays, sunrise, bhavaSystem }`; the fixture type has no defaults, so a test that omits them fails to compile.
- **Playwright freezes time** with `page.clock.install({ time: new Date("2026-09-08T20:10:00+05:30") })` before navigation, so Today, the parapet sky, the auto night/day and the tithi fill-light are byte-stable.
- **`Math.random` is never used.** Nib wobble, grain jitter and the lamp flicker take a `mulberry32` seed, `0xC0FFEE` in tests, `hash(profileId + presetHash)` in the app.

### 10.2 The hostile-timezone rule

The engine must be independent of the machine's zone, and IST is a bad canary (its offset is the one the code is most likely to hard-code). Run the `engine` project with `env: { TZ: "America/Denver" }`, half-hour-free, DST-having, wrong hemisphere. A second CI shard re-runs it with `TZ=Asia/Kolkata` and `TZ=UTC`; all three must produce an identical hash of the reference chart's JSON. The tzdb guard test (§6.1) fails loudly on a stale ICU.

### 10.3 Unit tests, `src/engine` (the heaviest layer)

Coverage: **≥ 95 % lines** on `src/engine`, and **100 %** on `time.ts`, `ayanamsa.ts`, `nakshatra.ts`, `vargas.ts`, `dasha.ts`, `ashtakoota.ts`.

Required fixture files in `src/engine/__fixtures__/`:
- `timezones.json`, the fifteen rows of §6.1, asserted as **UTC instants** (and separately as the `Intl` `longOffset` string `GMT+05:21:10` for the Madras case).
- `ayanamsa.json`, the four-date table of §6.2 plus the five derived assertions (AY-1…AY-5).
- `reference-chart.json`, the running example with inputs frozen forever and expected values from `swetest`; grahas and Lagna within **60″**, D1/D9 sign assignments exact, nakshatra + pada exact, Vimshottari MD/AD boundaries within 1 day, panchang **names** exact under `drik-mean`.
- `golden-charts.json`, the 50-chart suite: 10 per decade band (1900-29, 1930-59, 1960-89, 1990-2019, 2020-30); latitudes −45° to +60° including two near-Arctic (Reykjavík, for the `tan φ` blow-up) and two within 1° of the equator; five continents; six inside the war-time spells; four with a graha within 2′ of a nakshatra boundary (found by search, so the badge has real cases).
- `panchang-drik.json`, 30 consecutive days × 3 cities (Bengaluru, New Delhi, Chennai), each row `{ tithi, vara, nakshatra, yoga, karana, sunrise, sunset, rahuKaal }` **read by hand** from drikpanchang.com day pages (no scraping) and stamped with `"oracle": "drikpanchang"` and the date read. Assert 100 % **name** agreement under `drik-mean`; record end-time deltas in seconds without failing, so the sunrise-convention question can be settled from data.
- `vargas.json`, `nakshatra.json`, `panchang-synthetic.json`, `vimshottari.json`, `yogas.json`, `palm/*.json`, the hand-derived tables of §6.6-§6.13.
- `ashtakoota-oracle.bin`, all 11 664 pairs.

**Oracle discipline.** `swetest`/JHora are the only oracle for `se-true`/`se-mean` longitudes (never Drik, it is 19-41″ away). drikpanchang.com, read by hand, is the only oracle for aṅga **names**, and only under `drik-mean`. PyJHora CSVs are the oracle for Ashtakoota and porutham. `@ishubhamx/panchangam-js` is a cheap continuous cross-check compared against **`se-mean` only**, with its ≈ 0.13″ base offset documented. **All AGPL oracles run outside the repo**, in a throwaway folder that is not a git working tree, and only their numbers are committed. `scripts/check-licences.mjs` fails if `pyswisseph`, `@kuntay/swisseph`, `@swisseph/browser`, `swisseph-wasm`, `sweph-wasm`, `PyJHora`, `gsap` or `rita` appears anywhere in `package.json`.

**`panchangam-js` must never enter the browser bundle.** It is a devDependency imported only from `src/engine/__oracle__/*.test.ts` (Node environment, where `fs` exists). `scripts/check-bundle.mjs` greps `dist/**/*.js` for `panchangam` and `require("fs")` and fails on a hit; a `dependencies` entry fails the licence check. Consequently `vite.config.ts` needs **no** `fs` alias for it, the three node-builtin aliases exist for OpenCV.

### 10.4 Component tests (Testing Library, jsdom)

MediaPipe and OpenCV are stubbed at the module boundary in `src/test/setup.ts`, so component tests never load 8 MB of wasm.

`BrassDrum` (`spinbutton` semantics, arrows ±1, PageUp/Down ±10, typed entry, 31 Feb **refused** not clamped, `aria-live` debounced 300 ms) · `SealButton` (600 ms hold; release at 599 ms fires nothing; fires exactly **once** under React 19 StrictMode double-effects; Space/Enter works) · `GrahaLedger` (renders `Sū Kumbha 29°28′52″ P.Bhādrapadā 3 Gu`; ′ ″ in `--ink-muted`; tabular numerals; the boundary asterisk is a `button` with the accessible name "near boundary, 1 arcminute 42 seconds from Jyeṣṭhā" and is never colour-only) · `KundliNorth`/`South` (12 regions with the right numerals; tilak on house 1; the hidden `<table>` twin wired by `aria-describedby`; the script ring toggles both the glyphs and the hidden table) · `DashaRibbon` (MD → AD → PD; the brass "now" clip lands on the interval containing the frozen clock; `aria-expanded` correct) · `BeadRow` (8 rows, maxima 1…8; wood/brass/lac; one `role="img"` labelled `Yoni: 4 of 4 points` plus a real text score) · `LedgerRow`/`FootnoteSheet` (citation superscript is a button; sheet is `role="dialog" aria-modal="true"` with focus trap and return; Escape closes; shows the exact end instant and the sunrise convention) · `StylusEditor` (three Bézier paths, committing recomputes synchronously, each path described in `aria`) · `Drawer`/`DialSegment` (the three ticks are a `radiogroup`; each name includes its arcsecond delta; changing one marks cached charts stale) · `PlaceSearch` (**no network call on keystroke**; the online stamp is a separate explicit action) · `Toast` (info `role="status"`, danger `role="alert"`; haldi is never the text colour) · `QualityGauge` (a number *and* a label; haldi below threshold).

### 10.5 Palm pipeline tests

The contract is **honesty**. A run that returns low confidence and opens the stylus is a pass; a confident wrong line is a failure even if it looks pretty.

Landmark gating (`ok`, `uncertain-hand` at score 0.74, `landmark-off-frame` at y = 1.02, `palm-not-facing` for a dorsal view, `degenerate` for identical points) · geometry (the five element rows of §6.13 with `≥` thresholds; ratios from `worldLandmarks` so scaling every normalised coordinate by 1.7 leaves the element unchanged; every ratio returns a number **and** a band label **and** a citation) · quality (checkerboard ≥ 900 vs 9×9-blurred ≤ 60 against a threshold of 120; gamma-0.35 → "low", gamma-2.6 → "high"; the 8-row shutter truth table; ≤ 15 ms on a 1600 × 1200 input) · rectification (4 source points land within 1 px; round-trip ≤ 0.5 px; a +37°/0.6× copy within 4 px RMS) · thinning (§6.13 properties) · line extraction on **synthetic** fixtures generated by `scripts/make-palm-fixtures.mjs`: `synthetic-clean` → all three labelled at confidence ≥ 0.8 and within 6 px RMS of ground truth; `synthetic-shadow` (40 % illumination ramp) → all three at ≥ 0.6 (this is what the enhancement stage exists for); `synthetic-blur` → at least one below 0.6 and `{ suggestTrace: true }`; `synthetic-henna` (extra high-contrast curves) → **no spurious line above 0.6** · OpenCV `Mat` construction/deletion delta is 0 · the pipeline is a pure function of `(ImageData, landmarks, settings)` with byte-identical output on repeat · reading text (every sentence starts "Tradition says…" and ends in a resolvable citation; the banned-word scan over 5 elements × 3 confidence levels × both hands; byte-identical across 100 runs; low confidence changes wording not certainty; both hand framings recorded).

**Real palm photos live in `fixtures-private/`**, git-ignored, and their tests use `describe.skipIf(!existsSync(dir))`, CI always skips, the owner's machine always runs. The owner-only test asserts **≥ 70 %** of evenly lit photos yield three lines at confidence ≥ 0.6 and prints the per-photo table.

### 10.6 End-to-end, visual, performance, accessibility, privacy

**E2E flows** (`e2e/*.spec.ts`), seeded through the app's own encrypted-import path so the import path is tested on every run:
writing the leaf (empty install → "Write your first leaf"; drums by keyboard to 14/03/1994/07/25; the strip reads `ASIA/KOLKATA · +05:30 · JD 2449425.5799`; the 1943 → `+06:30`, 1900 → `+05:21:10` and Bombay `+04:51 (manual)` cases; the hour drum scrubs the sky and the Lagna label changes at least twice across 24 h; 600 ms hold saves and routes, 300 ms saves nothing; 31 Feb is refused) · the Patri (the diamond draws and the tilak appears; the hidden ledger lists 9 grahas; ledger degrees match `window.__chowki.chart` exactly in test builds; the loupe reads and snaps; the boundary footnote shows the exact `n′ n″` and the cross-preset sentence; the flip puts Meena top-left; the varga pager walks D9 → D2 → … → D60 with the preset repeated in each caption; rollers thicken monotonically across five scroll positions; a preset change shows the haldi tab and a recompute changes at least one degree; a second visit renders from cache with **zero** ink-draw animations) · Today / Circle / Milan · Hast (fake camera via `--use-file-for-fake-video-capture`; trace mode; blurred fixture goes straight to trace; Burn removes photo and reading; denied permission degrades to gallery-only) · Rooftop (painted sky first, then the dome; forced `webglcontextlost` shows only the painted sky with no error toast; under reduced motion **no `<canvas>` ever mounts**; the poster is a 1080 × 1920 PNG) · Drawer (the three ticks with arcsecond labels; every preset change is visible in a colophon; Devanagari digits change the ledger while drums stay Latin; **"Precision mode (AGPL lane)" is present but disabled** and no Swiss module is loadable; export → passphrase → import round-trip, wrong passphrase changes nothing) · offline (after first load, offline reload renders with real fonts and a **new** cast works; Today computes offline; "Prepare for offline" makes Hast work on a cold offline profile; `#/lost`; the service worker scope is `/jyoti/` and **absent** in the android build; an update shows the prompt rather than reloading).

**Visual baselines**, seven screens × two themes × two viewports, Linux-only (CI-generated), `maxDiffPixelRatio: 0.002`, `animations: "disabled"` plus frozen clock, built self-hosted fonts. Plus the assertions that actually catch drift:
- **VT-1 Paper share:** sample home, Patri and Today on a 4 px grid, classify each pixel by nearest token colour in OKLab; `--surface` + `--surface-2` must be **85-92 %** of the frame and `--bg` **≤ 8 %**.
- **VT-2 One lamp:** every `box-shadow` has **negative** x and y offsets. A positive offset fails and names the selector.
- **VT-3 No forbidden materials:** no computed style anywhere contains `backdrop-filter`, `filter: blur(`, `mesh`, a text shadow, or a gradient text fill.
- **VT-4 Brass is never text on paper:** for every text node, a colour within ΔE 5 of `--accent-2` must not sit on a background within ΔE 5 of `--surface`/`--surface-2`. Same rule for `--warning` and `--ink-faint`.
- **VT-5 Token identity:** `getComputedStyle(document.documentElement)` equals the §3.3 values byte-for-byte, and the day theme changes **exactly** `--bg`, `--bg-elevated`, `--ledge`, `--shadow-alpha`, `--grain-opacity`, `--vignette-far` and nothing else.
- **VT-6 Ink strokes:** chart strokes are `--ink` at 1.25 px with `shape-rendering: geometricPrecision`; the band's vermilion hairline is 1 px at 70 %.
- **VT-7 Type:** Yatra One on at most **six words** per screen; Martian Mono only on brass or teak backgrounds; body ≥ 17 px; Devanagari runs at `line-height: 1.6`.
- **VT-8 Reduced motion:** `document.getAnimations()` is empty 200 ms after load and the flame's opacity is constant across ten samples.

**Performance**, every row of §6.19, measured on `pixel-7` with `cpuThrottlingRate: 4` and Slow 4G unless stated. Budget violations fail `test:perf` and the pre-tag gate (not the Pages deploy).

**Accessibility**, `@axe-core/playwright` (`wcag2a wcag2aa wcag21aa`) on all twelve screens in both themes, zero serious or critical; `data-decorative="true"` elements are excluded from the colour-contrast rule only, and VT-4 independently proves none of them carries text. Plus: an in-test contrast table asserting every documented ratio ± 0.1 (ink/paper 15.2, ink-muted 7.3, accent 5.2, accent-text/band 5.0, accent-ink/accent 5.8, success 6.0, warning-text 5.7, danger 8.7, focus 8.0, engraved/brass 4.9, brass/bg 7.8, moon/bg 14.6, paper/ledge 14.5, paper/bg-day 6.6, ink/bg-elevated-day 10.2), editing a hex to a non-compliant value fails here, not in review; never-text tokens on zero text nodes; focus rings with the halo on every screen; touch targets on `pixel-7`; charts readable without sight; `lang` pairing; colour independence; reduced motion **and** "Calm desk" independently; 200 % zoom and 1.3× font scale; keyboard modes for drums, loupe and stylus. Manual TalkBack (phone) and NVDA + Firefox (desktop) passes before every tag, plus one full keyboard-only cast.

**Privacy, blocking, never waived.**
- **P-0** `check-no-biometrics.mjs`: no real photos, no EXIF `Make`/`GPS`, no PNG > 200 kB in the tree.
- **P-1 Zero leakage:** `privacy.spec.ts` installs `page.on("request")` with an allow-list of the **own origin only** and walks home → leaf entry (typing a place name character by character) → cast → Patri → loupe → varga pager → Today → Circle → Hast (capture + trace) → Milan → Rooftop → Drawer. **Zero** off-origin requests. Then it taps "search online ⌑" once and asserts exactly one request to `geocoding-api.open-meteo.com`, and on submit at most one to `nominatim.openstreetmap.org`, never on a keystroke.
- **P-2 CSP** present as written in §7.3, **and** MediaPipe + OpenCV still initialise (proving `'wasm-unsafe-eval'` survived).
- **P-3** No analytics: grep `src/` and `dist/` for `gtag`, `analytics`, `sentry`, `posthog`, `plausible`, `beacon(`, `sendBeacon`, zero hits.
- **P-4** No `URL.createObjectURL` result is ever assigned to an `<a download>` or a fetch body outside the export path.
- **P-5 Export hygiene:** grep the `.chowki` envelope for the profile name, the place name and `data:image`, all absent; a newer `v`/`schema` refuses with a lac note.
- **P-6 Licence gate** (§10.3) including the README Attribution assertion.
- **P-7** `npm audit --audit-level=high` clean.
- **P-8** The disclaimer string is present in every colophon and in the palm findings, and the banned-word scan runs over the **rendered** Patri and Hast screens, not only the templates.

### 10.7 Manual Android checklist (before every tag)

Record the device model, Android version and **Android System WebView version** at the top of each run.

**Install & identity:** sideload from Releases (unknown-apps asked once; `SHA256SUMS.txt` matches) · installing a newer tag keeps every profile and photo, and the colophon shows the new version · adaptive icon and monochrome layer correct; splash teak → diya → desk in ~240 ms with no double splash · app name **Chowki**, package id unchanged.
**First open & offline:** first launch in **airplane mode** renders and completes a full cast · no permission prompt until the camera is used · the reference chart on the phone matches the desktop build to the arcsecond.
**Camera & palm:** permission prompt on first Hast tap; deny → gallery-only with no crash; grant later → live gauges · guided capture with the chalk outline and moving gauges; the shutter enables only on a detected hand · shutter → landmarks → element + ratios in **< 3 s** (time it) · "Select photos" partial access still loads a picked image · first line extraction shows "sharpening the stylus…" then draws; the second is fast; the phone does not heat after three runs · a deliberately poor photo gives dashed lines, a haldi note and the stylus · tracing three paths with a finger recomputes in < 1 s · Burn removes the photo (verify after a force-stop) · rotating during capture does not crash · backgrounding for five minutes preserves the ROI and reading.
**Navigation, insets, gestures:** parapet strip below the status bar, Ledge above the gesture bar, correct status-bar icon colour per theme · predictive back closes the Drawer rather than minimising · horizontal gestures never trigger system back · drum flick coasts, clicks and ticks once per detent · the loupe follows 1:1 and snaps · 36 beads in ≤ 3.5 s with tap-to-skip · a full Patri scroll with no jank and velocity-following rustle.
**Display:** landscape reflow on the Patri with the scroll position preserved · Rooftop in landscape · ≥ 600 dp tablet/foldable shows the desktop desk · "Largest" font size stacks the ledger without truncation · system dark/light with Lamp = auto switches the desk while paper and ink never change · 1 px hairlines and 1.25 px ink strokes crisp at DPR 2.625, no OLED banding on the teak · Devanagari conjuncts correct at every size; Devanagari digits in the ledger while drums stay Latin.
**Rooftop:** painted sky then dome; scrubbing moves sun/Moon/planets sensibly and the Moon's phase matches the tithi · two minutes of scrubbing with no context loss and ≥ 40 fps by eye · backgrounding and returning resumes the dome · the poster saves through the share sheet.
**Data:** export with a passphrase → share sheet → re-import restores profiles and photos · wrong passphrase changes nothing · clearing the app **cache** loses nothing · force-stop mid-cast leaves no corrupt profile.
**Sound & haptics:** defaults on, respects silent mode, master mute works · `impact Medium` on seal and tilak, `selectionChanged` on detents, crossings and beads, `impact Heavy` at the end of a Burn, **none on plain scrolling** · "Calm desk" removes flicker, rustle and inertia while leaving haptics.
**Debugging:** a `workflow_dispatch` build from a `debug/*` branch is inspectable from `chrome://inspect#devices`; the tagged release build is **not**.

### 10.8 Day-1 verification list

Run these **before** feature work and record each result (date, tool version, device, WebView version) in `docs/VERIFICATION-LOG.md`. Each has a decided fallback, so none of them can block you.

| # | Claim | How | Pass | Fallback |
|---|---|---|---|---|
| V-1 | Drik's Lahiri is a mean Lahiri exactly +24.3″ above SE-mean | read the printed ayanamsa from drikpanchang.com for 10 dates 1930-2026, at least two pre-1956 | constant within 0.5″ on all 10 | make the Drik preset a small lookup + interpolation table, label it "Drik-compatible (fitted)" and say so in the colophon |
| V-2 | JHora's Lahiri equals SE-true | `swetest -p0 -b1.1.2000 -ut0 -sid1 -fPl` | ≤ 1″ | drop the JHora column; `swetest` alone is the oracle |
| V-3 | Drik's and JHora's default node type | compare Rāhu for the reference chart against both implementations | one matches within 1′, the other is ~1° away | ship `true` as the default and print the choice |
| V-4 | The panchang sunrise convention | both conventions vs Drik's printed sunrise for 5 cities × 5 dates | one is within 60 s on ≥ 24 of 25 | ship both, default to the closer, footnote every end time |
| V-5 | Ashtakoota agreement is genuinely 100 % | the 11 664-pair oracle test | 11 664 / 11 664 | adopt PyJHora's tables as *the* school, name it in the colophon, record deviating rows |
| V-6 | `astronomy-engine` 2.1.19 under Vite 8 + TS strict, and `Ecliptic(GeoVector(b,t,true))` is true-of-date | 5 swetest charts | ≤ 60″ on all 45 longitudes | `astronomia` behind the same `Ephemeris` interface |
| V-7 | `panchangam-js` runs in a Vitest node test and never reaches `dist/` | `test:oracle` + `check-bundle.mjs` | both clean | drop the oracle, it is a convenience |
| V-8 | `tz-lookup` resolves the 50 golden coordinates correctly | unit test | ≥ 49/50; every miss > 50 km from a city | use the GeoNames `timezone` column as primary |
| V-9 | The runtime tzdb (CI **and** the phone's WebView) knows both IST war spells and MMT | the tzdb guard + a debug APK screen printing `Intl` results | all 15 rows pass on both | bundle a minimal pre-1955 offset table for IN/NP/LK/PK/BD |
| V-10 | MediaPipe `delegate: "GPU"` initialises in the Android WebView | debug APK with a timing readout | GPU init succeeds and is ≥ 1.5× faster | `delegate: "CPU"`; ship element/ratios first and make lines a second tap |
| V-11 | The 7.8 MB model self-hosted under `/jyoti/models/` serves correctly and caches | `curl -I` after the first deploy | 200, cached by Workbox | serve it from a Release asset |
| V-12 | `@techstark/opencv-js` builds under Vite 8 and lazy-loads only on Hast | build + chunk graph + home network log | chunk exists, not requested on `#/` | the pure-JS/WebGL ridge filter (~200 lines, already scoped) |
| V-13 | OpenCV `Mat` lifetime in the WebView | two consecutive full runs | heap returns within 10 % | a fresh module instance per run inside the worker |
| V-14 | three r185 + R3F 9 in the Android WebView at DPR ≤ 1.5 | debug APK, 2-minute scrub | ≥ 40 fps, no context loss | painted sky as the Android default, dome behind an opt-in |
| V-15 | BSC5 is public domain and ≤ 60 kB is enough | download from HEASARC, read the terms, build the binary | PD confirmed, ≤ 60 kB | ship only the 88 constellation-defining stars |
| V-16 | The gazetteer compresses to ≤ 1.8 MB gz and searches in ≤ 60 ms | build + perf spec | both met | drop the world tier to ≥ 50 k population |
| V-17 | Open-Meteo and Nominatim still send `access-control-allow-origin: *` to a `github.io` origin | `curl -H "Origin: …" -I` | `*` on both | remove the online stamp, the offline gazetteer is the product |
| V-18 | Pages serves the manifest, `sw.js` and the model with correct MIME and the PWA installs | `curl -I` + DevTools → Application | 200s, installable | rename the manifest; move the model to a Release asset |
| V-19 | Capacitor 8 + Temurin 21 on `ubuntu-24.04` builds a **signed** APK that installs | `workflow_dispatch` before any tag | `app-release.apk`, installs, opens | - |
| V-20 | `@capacitor/camera` works with Android 14+ partial photo access, and `getUserMedia` works with only `CAMERA` declared | debug APK, both paths, "Select photos" | both return an image; gauges run live | capture-only via the camera intent on Android (drop the live gauges) |
| V-21 | Predictive back fires `@capacitor/app`'s `backButton` | debug APK: Drawer open, swipe back | sheet closes, root back exits | `android:enableOnBackInvokedCallback="false"` as a documented temporary opt-out |
| V-22 | Subset Devanagari renders conjuncts correctly and stays ≤ 260 kB | render `जन्म पत्री · शुक्ल चतुर्दशी · अनुराधा` in Chrome, Firefox and the WebView | no broken conjuncts, no tofu | keep full Devanagari coverage, or Latin-only chart labels for v1 |
| V-23 | The free limited-distribution developer account is available in the owner's region | Android Developer Console | registered before the regional flip | `adb install` stays exempt |

---

## 11. Deployment

**Chowki has no Cloudflare Worker, no API key, no account and no backend.** Both network endpoints are keyless and CORS-open, so the "when a secret exists, use a Worker" rule never fires. Do not add `worker/`, `worker.yml`, `CLOUDFLARE_*` secrets or `VITE_API_BASE` "just in case". Shell conventions: **PowerShell** for `npm` / `git` / `gh`; **Git Bash** for `openssl`, `base64 -w0` and `sha256sum`.

### 11.1 Constants (decide once, never change)

| Item | Value |
|---|---|
| GitHub repo | **`jyoti`**, public, MIT |
| Web URL | `https://<owner>.github.io/jyoti/` |
| Vite `base` on Pages / in the APK | `/jyoti/` / `/` |
| App name | **Chowki** (`appName`, manifest `name` and `short_name`) |
| Android `appId` / `applicationId` / `namespace` | **`com.rahul.jyoti`**, immutable after the first install |
| Keystore | `jyoti-release.p12`, alias `release`, PKCS12 |
| Versioning | git tag `vMAJOR.MINOR.PATCH`; Android `versionCode = github.run_number` |
| Theme / background colour | `#1A110B` teak / `#F4EAD3` paper |
| Orientation | `portrait` in the manifest; the Rooftop route unlocks landscape at runtime |
| Engine defaults shipped | `ayanamsa: se-true`, `node: true`, `dashaYearDays: 365.25`, `sunrise: upper-limb-refracted`, `houseSystem: whole-sign`, all printed in every colophon. V-4 may switch the sunrise default after the 25-sample Drik comparison; the setting is user-visible either way |

`.gitignore` must contain: `node_modules/ dist/ coverage/ playwright-report/ test-results/ android/local.properties android/app/build/ android/.gradle/ android/app/release/ *.p12 *.jks *.keystore *.b64 .env*.local fixtures-private/ docs/oracles/*.png src/data/*.raw.txt`.
`.gitattributes`: `android/gradlew text eol=lf`, `*.sh text eol=lf`, `*.task binary`, `*.bin binary`, `*.woff2 binary`, `e2e/visual/__screenshots__/**/*.png binary`.

### 11.2 `vite.config.ts`

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
    __APP_VERSION__: JSON.stringify(pkg.version),                  // colophon: "Chowki 0.4.2"
    __ENGINE_BUILD__: JSON.stringify(pkg.dependencies["astronomy-engine"]),
  },
  resolve: {
    // @techstark/opencv-js reaches for Node built-ins that never run in the browser.
    // Exact-match regexes only, so `node:fs` and our own paths are untouched.
    alias: [
      { find: /^fs$/, replacement: empty },
      { find: /^path$/, replacement: empty },
      { find: /^crypto$/, replacement: empty },
    ],
  },
  plugins: [
    react(),
    tailwindcss(),
    // No service worker inside the Capacitor WebView: the APK ships every asset.
    ...(isAndroid ? [] : [VitePWA({
      registerType: "prompt",          // never reload mid-cast; the update is a small ink note
      includeAssets: ["favicon.svg", "grain.svg", "seal-edge.svg"],
      manifest: {
        name: "Chowki", short_name: "Chowki",
        description: "A private, offline Jyotisha desk",
        lang: "en-IN", theme_color: "#1A110B", background_color: "#F4EAD3",
        display: "standalone", orientation: "portrait",
        start_url: base, scope: base,
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png" },
          { src: "maskable-icon-512x512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
      workbox: {
        // Precache the desk: shell, fonts, engine, gazetteer, stars, sounds, grain.
        globPatterns: ["**/*.{js,css,html,svg,png,woff2,webmanifest,webm,mp3,bin}", "**/geonames-*.json.gz"],
        // Keep the heavy, screen-specific payloads OUT of the install-time precache.
        globIgnores: ["**/models/**", "**/*.wasm", "**/opencv*.js", "**/sky-*.js"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: `${base}index.html`,
        runtimeCaching: [
          { urlPattern: /\/models\/.*\.task$/, handler: "CacheFirst",
            options: { cacheName: "chowki-models", expiration: { maxEntries: 4 } } },
          { urlPattern: /\/(mediapipe|opencv).*\.(wasm|js)$/, handler: "CacheFirst",
            options: { cacheName: "chowki-cv", expiration: { maxEntries: 12 } } },
          { urlPattern: /sky-.*\.js$/, handler: "CacheFirst", options: { cacheName: "chowki-sky" } },
          { urlPattern: /geocoding-api\.open-meteo\.com/, handler: "NetworkOnly" },
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
```ts
if (!Capacitor.isNativePlatform()) {
  import("virtual:pwa-register").then(({ registerSW }) => registerSW({ onNeedRefresh: showInkNote }));
}
```

**Every asset URL goes through `import.meta.env.BASE_URL`**, especially `models/hand_landmarker.task` and the MediaPipe `wasm/` directory, the two most likely 404s on a sub-path host.

**Cache-tier decision, deliberate:** the 7.46 MB hand model is **runtime**-cached, not install-time precached, because a Workbox precache blocks the service worker's `install` event and an 11 MB install would make the first visit feel broken and sink the Lighthouse score. Offline parity is restored by **Drawer → "Prepare for offline"**, which warms `chowki-models`, `chowki-cv` and `chowki-sky` with a byte-progress line. Precached total stays ≤ 6 MB; the whole published site is ~22 MB against a 1 GB limit.

`index.html` must carry: `<html lang="en" data-theme="night">` (the theme provider removes `data-theme` for "auto"), `<meta name="theme-color" content="#1A110B">` (switched to `#6E4A2E` on the morning terrace), the CSP from §7.3, and **no Google Fonts `<link>`** (only `design/preview.html` may hot-link them).

### 11.3 `.github/workflows/pages.yml`

```yaml
# Deploy the Vite app (repo root) to GitHub Pages.
# Prereq: repo Settings -> Pages -> Source = "GitHub Actions".
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v7
      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm test -- --run                 # Vitest
      - name: Build (served from /jyoti/)
        run: npm run build
        env:
          VITE_BASE_PATH: /${{ github.event.repository.name }}/
          # No VITE_API_BASE: Chowki has no proxy and no secret.
      - name: Bundle budget (initial JS <= 350 kB gz)
        run: npx size-limit
      - name: No forbidden module reached the bundle
        run: node scripts/check-bundle.mjs
      - name: SPA fallback for deep links (harmless with hash routing)
        run: cp dist/index.html dist/404.html
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v4
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-24.04
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

`.size-limit.json`:
```json
[{ "path": "dist/assets/index-*.js", "limit": "350 kB", "gzip": true },
 { "path": "dist/assets/*.css",      "limit": "30 kB",  "gzip": true }]
```

### 11.4 `.github/workflows/ci.yml`

Kept separate from Pages so a flaky gesture never blocks a deploy.

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
      - run: npx biome ci .
      - run: node scripts/check-no-biometrics.mjs      # blocking
      - run: node scripts/check-licences.mjs           # blocking
      - run: npm run test:unit
      - name: Engine determinism across hostile zones
        run: |
          TZ=Asia/Kolkata npx vitest run --project engine
          TZ=UTC          npx vitest run --project engine
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

### 11.5 `.github/workflows/android-release.yml`

```yaml
# Build a SIGNED Capacitor APK in the cloud and attach it to a GitHub Release.
# Needs the four secrets of §11.7 and the signingConfigs block of §11.6.
# Release:  git tag v1.0.0 && git push origin v1.0.0
name: android-release

on:
  push:
    tags: ['v*']
  workflow_dispatch:        # manual run -> signed APK as a downloadable artifact only

permissions:
  contents: write

concurrency:
  group: android-${{ github.ref }}
  cancel-in-progress: true

jobs:
  apk:
    runs-on: ubuntu-24.04   # Android SDK 34-37, build-tools, NDK, JDK 8-25 preinstalled
    timeout-minutes: 30
    env:
      VERSION_CODE: ${{ github.run_number }}
      VERSION_NAME: ${{ github.ref_type == 'tag' && github.ref_name || format('0.0.{0}', github.run_number) }}
    steps:
      - uses: actions/checkout@v7

      - uses: actions/setup-node@v7
        with:
          node-version: 22
          cache: npm

      - uses: actions/setup-java@v6
        with:
          distribution: temurin
          java-version: 21          # Capacitor 8 targets Java 21 (the runner default is 17)
          cache: gradle

      - name: Build web app (base "/" because Capacitor serves from https://localhost/)
        run: |
          npm ci
          npm run build
        env:
          VITE_BASE_PATH: /
          VITE_PLATFORM: android    # disables the PWA plugin -> no service worker in the WebView

      - name: Sync web assets and plugins into android/
        run: npx cap sync android

      - name: Decode keystore
        env:
          KS_B64: ${{ secrets.ANDROID_KEYSTORE_BASE64 }}
        run: printf '%s' "$KS_B64" | base64 -d > "$RUNNER_TEMP/release.p12"

      - name: Build signed release APK
        working-directory: android
        env:
          ANDROID_KEYSTORE_FILE: ${{ runner.temp }}/release.p12
          ANDROID_KEYSTORE_PASSWORD: ${{ secrets.ANDROID_KEYSTORE_PASSWORD }}
          ANDROID_KEY_ALIAS: ${{ secrets.ANDROID_KEY_ALIAS }}
          ANDROID_KEY_PASSWORD: ${{ secrets.ANDROID_KEY_PASSWORD }}
        run: |
          chmod +x gradlew
          ./gradlew --no-daemon :app:assembleRelease \
            -PversionCode="$VERSION_CODE" -PversionName="${VERSION_NAME#v}"

      - name: Collect output (fails loudly if the APK came out unsigned)
        run: |
          mkdir -p out
          cp android/app/build/outputs/apk/release/app-release.apk \
             "out/${{ github.event.repository.name }}-${VERSION_NAME#v}.apk"
          (cd out && sha256sum *.apk > SHA256SUMS.txt)
          ls -la out

      - name: APK size budget (40 MB, model + CV wasm + fonts + gazetteer)
        run: |
          size=$(stat -c %s out/*.apk); echo "APK bytes: $size"
          test "$size" -le 41943040

      - name: The APK must contain the hand model and must NOT contain a service worker
        run: |
          unzip -l android/app/build/outputs/apk/release/app-release.apk > /tmp/apk.txt
          grep -q "assets/public/models/hand_landmarker.task" /tmp/apk.txt
          ! grep -q "assets/public/sw.js" /tmp/apk.txt

      - uses: actions/upload-artifact@v7
        with:
          name: apk-${{ env.VERSION_NAME }}
          path: out/
          retention-days: 14

      - name: Attach APK to GitHub Release
        if: github.ref_type == 'tag'
        uses: softprops/action-gh-release@v3
        with:
          tag_name: ${{ github.ref_name }}
          generate_release_notes: true
          files: |
            out/*.apk
            out/SHA256SUMS.txt
```

### 11.6 `android/app/build.gradle`, the block to merge

Replace the generated `android { … }` block with this, keeping everything else the file has (`apply plugin`, `repositories`, `dependencies`, `apply from: 'capacitor.build.gradle'`, the `google-services` try/catch):

```gradle
def ciVersionCode = (project.findProperty('versionCode') ?: '1').toInteger()
def ciVersionName = project.findProperty('versionName') ?: '0.0.0'
def ksFile = System.getenv('ANDROID_KEYSTORE_FILE')

android {
    namespace "com.rahul.jyoti"
    compileSdk rootProject.ext.compileSdkVersion
    defaultConfig {
        applicationId "com.rahul.jyoti"   // must never change after the first install
        minSdkVersion rootProject.ext.minSdkVersion
        targetSdkVersion rootProject.ext.targetSdkVersion
        versionCode ciVersionCode
        versionName ciVersionName
        testInstrumentationRunner "androidx.test.runner.AndroidJUnitRunner"
        aaptOptions { ignoreAssetsPattern '!.svn:!.git:!.ds_store:!*.scc:.*:!CVS:!thumbs.db:!picasa.ini:!*~' }
    }
    signingConfigs {
        release {
            if (ksFile) {
                storeFile file(ksFile)
                storeType 'PKCS12'
                storePassword System.getenv('ANDROID_KEYSTORE_PASSWORD')
                keyAlias System.getenv('ANDROID_KEY_ALIAS')
                keyPassword System.getenv('ANDROID_KEY_PASSWORD')
            }
        }
    }
    buildTypes {
        release {
            minifyEnabled false
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
            if (ksFile) signingConfig signingConfigs.release
        }
    }
}
```

Local and unsigned builds still work when `ANDROID_KEYSTORE_FILE` is absent.

### 11.7 Keystore and secrets (do this exactly once, for the life of the app)

In **Git Bash, outside the repo** (Git-for-Windows ships OpenSSL; no Java is needed):

```bash
cd /c/Work            # NOT a git working tree
openssl req -x509 -newkey rsa:4096 -sha256 -days 10950 -nodes \
  -keyout jyoti.key.pem -out jyoti.cert.pem \
  -subj "/CN=Chowki/O=Chowki/C=IN"
openssl pkcs12 -export -inkey jyoti.key.pem -in jyoti.cert.pem \
  -name release -out jyoti-release.p12          # key password MUST equal the store password
base64 -w0 jyoti-release.p12 > jyoti-release.p12.b64
rm jyoti.key.pem jyoti.cert.pem
openssl pkcs12 -in jyoti-release.p12 -nokeys | openssl x509 -fingerprint -sha256 -noout
```

Then set the four repository secrets (Settings → Secrets and variables → Actions), these are the **only** secrets this project ever has:

```powershell
gh secret set ANDROID_KEYSTORE_BASE64 --body (Get-Content "C:\Work\jyoti-release.p12.b64" -Raw).Trim()
gh secret set ANDROID_KEYSTORE_PASSWORD    # the passphrase
gh secret set ANDROID_KEY_ALIAS --body release
gh secret set ANDROID_KEY_PASSWORD         # the same passphrase, PKCS12 requires it
```

Delete the `.b64` afterwards. **Back up `jyoti-release.p12` and its passphrase in three places:** the password manager (with the alias, the "key password = store password" note and the SHA-256 fingerprint), an encrypted offline copy, and the GitHub secret (which is a *copy*, not a source, GitHub never shows it back). **Never regenerate, never commit, never email.** A different key later means the phone refuses to update and the only way through is uninstall-and-lose-everything.

Repository variables: **none**. The only `VITE_*` values are `VITE_BASE_PATH` (`/jyoti/` on Pages, `/` for Android) and `VITE_PLATFORM` (`android` in the APK build), both public, both set in workflow `env`.

### 11.8 First deploy and smoke checks

```powershell
gh api -X POST repos/<owner>/jyoti/pages -f build_type=workflow   # or Settings -> Pages -> GitHub Actions
git add -A; git commit -m "Chowki: scaffold + Pages workflow"; git push -u origin main
gh run watch
curl.exe -I https://<owner>.github.io/jyoti/                                    # 200
curl.exe -I https://<owner>.github.io/jyoti/manifest.webmanifest                # 200, application/manifest+json
curl.exe -I https://<owner>.github.io/jyoti/sw.js                               # 200, application/javascript
curl.exe -I https://<owner>.github.io/jyoti/models/hand_landmarker.task         # 200, 7819105 bytes
curl.exe -I https://<owner>.github.io/jyoti/mediapipe/vision_wasm_internal.wasm # 200, application/wasm
```

From Git Bash, confirm both optional endpoints still allow a `github.io` origin (V-17):

```bash
curl -s -D - -o /dev/null -H "Origin: https://<owner>.github.io" \
  "https://geocoding-api.open-meteo.com/v1/search?name=Madurai&count=5" | grep -i access-control
curl -s -D - -o /dev/null -H "Origin: https://<owner>.github.io" \
  "https://nominatim.openstreetmap.org/search?q=Madurai&format=jsonv2&limit=5" | grep -i access-control
```

**PWA install check** after every deploy that touches the shell: DevTools → Application → Manifest (no warnings, icons resolve, `scope` and `start_url` both `/jyoti/`), Service workers (`sw.js` activated with scope `/jyoti/`), install from the address bar (standalone window, teak title bar), Network → Offline → reload (the desk renders with real fonts and a **new** cast completes), then Drawer → "Prepare for offline" → offline again → the palm pipeline runs. Android Chrome → *Install app* mints a WebAPK as a fallback for a phone that cannot sideload; say in the Drawer copy that it has no native camera plugin.

### 11.9 Release checklist (every `v*` tag)

1. `main` is green on `pages.yml` and `ci.yml`, and the live site is serving the commit you intend to ship (colophon version = `package.json`).
2. The §12 gate is complete: unit, oracle, e2e, visual (VT-1…VT-8), a11y, **privacy (never waived)**, perf budgets.
3. The §10.7 phone checklist run on a `workflow_dispatch` APK **of this exact commit**; results appended to `docs/VERIFICATION-LOG.md` with device, Android and WebView versions.
4. `npm audit --audit-level=high` clean; `check-licences.mjs` and `check-bundle.mjs` clean.
5. `npx cap sync android` produces no diff, or the diff is committed.
6. `CHANGELOG.md` entry. **If any engine default or preset changed** (ayanamsa, node type, daśā year, sunrise convention, Bhāva system), say so in the first line and warn in the release notes that existing charts will recompute, this is the one class of change that silently alters what the app told someone about their life.
7. README Attribution updated if a dependency, font, sound or dataset was added.
8. `npm version <x.y.z> --no-git-tag-version`, commit `Release x.y.z`, push, wait for Pages to deploy that commit.
9. `git tag vx.y.z && git push origin vx.y.z` → watch `android-release` → the Release carries `jyoti-x.y.z.apk` + `SHA256SUMS.txt`; paste the CHANGELOG entry into the notes.
10. Install the Release APK **over** the previous version; confirm profiles and palm photos intact, the version string updated, and one reference chart still identical to the arcsecond.
11. Export an encrypted backup from the phone, a release is the natural backup moment.

**Versioning rules.** MINOR for a new screen or feature; PATCH for fixes; **MAJOR** for an incompatible export format, a licence change, or a change to a shipped engine default that moves existing charts. `versionCode = github.run_number` is strictly increasing and never hand-edited. The Dexie schema version is independent and only increases. **`ENGINE_EPOCH`** feeds the preset hash: bump it whenever a change moves numbers, so stale charts recompute rather than showing new labels over old numbers.

### 11.10 Rollback

| What broke | Action |
|---|---|
| Pages is serving a bad build | `git revert <sha>` and push (redeploys in ~2 min), or re-run the last good *Deploy to GitHub Pages* run. `registerType: "prompt"` means open tabs keep the old version until the user chooses to reload, so nobody is forced onto the broken build mid-cast |
| Bad APK on a Release | Android cannot downgrade a `versionCode`, fix forward: revert, tag `vx.y.(z+1)`, install over the top. Mark the bad Release pre-release, delete its `.apk` asset, and note that installing an older APK requires an uninstall, which destroys local data unless exported |
| An engine change moved everyone's charts | Revert it, bump `ENGINE_EPOCH` again so caches recompute back, add a CHANGELOG line naming the affected preset. **Never** leave a build where some cached charts used the old maths and some the new |
| A preset default changed by accident | The colophon on every screenshot names the preset, so the blast radius is visible. Restore the default and add the missing case to the ayanamsa tests |
| Bad Dexie migration | Migrations are additive and never drop a table; recovery is *Import* of the encrypted backup into the fixed version. Say so in the release notes |
| Signing secrets wrong (`app-release-unsigned.apk`) | Re-run `gh secret set` for the four values; no code change; re-run the workflow (a new `versionCode` is fine) |
| Model or CV chunk 404s after a deploy | Almost always a missing `import.meta.env.BASE_URL` on that one URL, check with `curl -I …/jyoti/models/hand_landmarker.task` |

### 11.11 Troubleshooting quick reference

| Symptom | Cause → fix |
|---|---|
| Pages shows a blank page; console `Failed to load module script … /assets/index-*.js 404` | `VITE_BASE_PATH` not applied → check the build step's `env` and that `vite.config.ts` reads it |
| PWA not installable | `start_url`/`scope` are not `/jyoti/` → the `base` variable must feed the manifest |
| Hast screen spins forever with a silent console | CSP is missing `'wasm-unsafe-eval'` or `worker-src blob:`, WASM compilation is blocked with no useful error |
| `hand_landmarker.task` 404 on Pages but fine locally | the URL was written `/models/…` instead of `` `${import.meta.env.BASE_URL}models/…` `` |
| OpenCV chunk downloads on the home screen | it leaked into the eager graph → check `manualChunks` and that the import is inside a `React.lazy`/dynamic `import()` on the Hast route only |
| Build error `Could not resolve "fs"` | something imported `@ishubhamx/panchangam-js` from app code, it is a devDependency for Node tests only; move the import into `src/engine/__oracle__/` |
| Chart degrees differ from drikpanchang.com by 20-40″ | **not a bug**, Drik uses a nutation-free Lahiri ≈ 24.3″ above SE-mean. Switch the Drawer preset to `Lahiri (Drik-compatible)`; the colophon will say so |
| Chart degrees differ from JHora by ~1° on Rāhu/Ketu | node type: mean vs true. The colophon names which was used |
| A 1943 Calcutta birth is off by an hour | the runtime tzdb is stale, the guard test should have caught it. Update Node / the runner image; on Android check the WebView and system tz data |
| A 1900 Madras birth is off by ~9 minutes | something used `offsetMinutes` (321.1666…) instead of the UTC instant |
| A pre-1955 Bombay birth is off by 39 minutes | Bombay Time is not in tzdb, use the override drum; the colophon must read `+04:51 (manual)` |
| `npx cap sync android` cannot find the Android SDK | it should not need one; the message comes from the optional Gradle step. Safe to ignore if `android/app/src/main/assets/public/` was updated |
| `Execution failed for task ':app:validateSigningRelease'` | one of the four secrets is missing or empty; `ANDROID_KEY_PASSWORD` must equal `ANDROID_KEYSTORE_PASSWORD` |
| `error: invalid source release: 21` / Gradle uses JDK 17 | the `setup-java@v6` step is missing or set to 17. Capacitor 8 needs Temurin **21**, the single most common APK-build failure |
| Phone: "App not installed" on update | a different keystore or a lower `versionCode` |
| Camera works in Chrome but not in the APK | `CAMERA` missing from the manifest (needed for `getUserMedia`), or the user granted "Select photos" only |
| Rooftop dome is black on the phone | WebGL context lost or unavailable → the painted-sky fallback should have engaged; if it did not, the `webglcontextlost` handler is broken |
| Back gesture minimises the app instead of closing a sheet | predictive back is not wired to `@capacitor/app`'s `backButton`; temporary opt-out is `android:enableOnBackInvokedCallback="false"` |
| Devanagari conjuncts render as boxes or split matras | the `pyftsubset` subset dropped required glyphs or features → rebuild retaining `akhn`, `rphf`, `blwf`, `half`, `pres` |

### 11.12 The AGPL lane is a licence change, not a feature flag

Importing any Swiss Ephemeris WASM build makes the **whole application** AGPL-3.0, and publishing on GitHub Pages is distribution. So: the shipped build contains no Swiss Ephemeris code (`check-licences.mjs` fails on the package names; `check-bundle.mjs` greps `dist/**` for `swisseph`/`swe_`); the oracles that generate golden fixtures run **outside** the repo and only their numbers are committed; and the Drawer's "Precision mode (AGPL lane)" row is **disabled**, with help text explaining that enabling it requires (1) replacing `LICENSE` with AGPL-3.0, (2) adding a visible "source code" link in the colophon, (3) changing the licence allow-list, and (4) a MAJOR version bump because the licence of every prior download changes meaning. The same rule one level down: **PyJHora is AGPL and GSAP is not OSI**, neither may ever be a dependency.

---

## 12. Definition of done

Ship `v1.0.0` only when every line below is true.

**Product and correctness**
- [ ] **Cast in under a blink.** From "hold to seal" to a fully computed Patri (9 grahas, Lagna, D1 + D9, nakshatra/pada, Vimshottari MD/AD/PD, birth panchang, ≥ 10 yogas) in **< 100 ms** of compute on a 2022 mid-range Android WebView; the ink-draw of the North chart completes in **≤ 1.5 s**; everything works in airplane mode.
- [ ] **Arcsecond honesty.** Under `se-true`, graha and Lagna longitudes are within **1′** of `swetest` on **≥ 50 golden charts** spanning 1900-2030 and five continents. Under `drik-mean`, tithi, vāra, nakshatra, yoga and karaṇa **names** match drikpanchang.com on **30 consecutive days** for Bengaluru, Delhi and Chennai, **100 %**.
- [ ] **History resolved.** 1943-06-01 06:00 Calcutta → **+06:30**; 1900 Madras → **+05:21:10**; Bombay Time **+04:51** is one drum away; the resolved zone, offset and JD are engraved on the leaf. The running example engraves `ASIA/KOLKATA · +05:30 · JD 2449425.5799` and its Lagna is **Meena 15°39′25″**.
- [ ] **Palm in three seconds.** Photo → 21 landmarks → hand-shape element and finger ratios in **< 3 s** on the phone; heart, head and life lines detected at confidence **≥ 0.6 on ≥ 70 %** of evenly lit photos from the circle; on the rest the stylus appears automatically and a reading follows **< 1 s** after the third path is committed.
- [ ] **Guna Milan is oracle-exact.** The 36-point Ashtakoota matches the PyJHora oracle on **100 % of the 11 664** nakshatra-pada pairs, and the 36 beads finish sliding in **≤ 3.5 s** (tap to skip).
- [ ] **Zero leakage.** A Playwright network log over a full session shows **no requests** except one explicitly tapped place search; profile export is AES-GCM-encrypted with a passphrase and imports back byte-identically; **Burn** removes a profile and its palm Blobs in one hold, leaving nothing in IndexedDB.
- [ ] **Ships from a tag.** `git tag v1.0.0 && git push --tags` produces a signed APK on the Release that installs on the owner's phone and **updates over the previous version without uninstalling**; the web build is live at `https://<owner>.github.io/jyoti/` after every push to `main`.

**Design fidelity (checked against `design/preview.html`)**
- [ ] Playwright screenshots of home (night + day), Patri drawn, loupe open, drums, mala complete, palm reading and drawer match the preview to the reviewer's eye, at phone 390 × 844 and desktop 1280 × 800.
- [ ] **VT-1** paper share 85-92 %, teak ≤ 8 % on home, Patri and Today. **VT-2** every shadow offset negative. **VT-3** no `backdrop-filter`, blur, mesh gradient, text shadow or gradient text anywhere. **VT-4** brass, haldi and ink-faint never carry text. **VT-5** tokens byte-identical to §3.3, and the day theme changes only the six desk tokens. **VT-6** chart strokes `--ink` 1.25 px. **VT-7** Yatra One ≤ six words per screen, mono only on brass/teak, body ≥ 17 px, Devanagari `line-height: 1.6`. **VT-8** no animations under reduced motion.
- [ ] All fourteen named animations exist at their specified durations, easings and staggers; the four material springs are applied to the right objects; nothing animates a filter or a shadow blur.
- [ ] The five signature interactions behave as described in §3.7, with their sounds and haptics.
- [ ] All text ≥ 4.5:1; Lighthouse mobile **Performance ≥ 90**, a11y ≥ 95, installable PWA; initial JS **≤ 350 kB gz**.

**Engineering**
- [ ] Engine line coverage ≥ 95 %, and 100 % on `time.ts`, `ayanamsa.ts`, `nakshatra.ts`, `vargas.ts`, `dasha.ts`, `ashtakoota.ts`.
- [ ] The engine produces an identical reference-chart hash under `TZ=America/Denver`, `TZ=Asia/Kolkata` and `TZ=UTC`.
- [ ] axe reports zero serious or critical issues on all twelve routes in both themes; TalkBack and NVDA passes recorded; one full keyboard-only cast.
- [ ] Every §6.19 budget met, including APK ≤ 40 MB and precache ≤ 6 MB.
- [ ] `check-licences.mjs`, `check-bundle.mjs` and `check-no-biometrics.mjs` all pass; no AGPL anywhere in the tree; README **Attribution** and **Disclaimer** sections present and accurate.
- [ ] The §10.7 Android checklist completed on the release commit's APK, with results in `docs/VERIFICATION-LOG.md`.
- [ ] `docs/VERIFICATION-LOG.md` has an entry for every V-number in §10.8.
- [ ] Five real charts cast for real people, one read aloud to each, and the friction logged.

---

## 13. Code quality rules

1. **TypeScript strict, always.** `strict: true`, `noUncheckedIndexedAccess: true`, `exactOptionalPropertyTypes: true`, `noImplicitOverride: true`. **No `any`**, no non-null `!` on values that can genuinely be null, no `@ts-ignore` (`@ts-expect-error` with a one-line reason is the only escape, and it must be rare). Types live next to what they describe: domain types in `src/engine/types.ts`, persisted shapes in `src/data/db.ts`.
2. **Biome is the only linter and formatter.** `npx biome ci .` runs in CI. No ESLint, no Prettier, no per-file disables without a reason comment. Enable `noRestrictedGlobals` for `Date.now` inside `src/engine`.
3. **Engine purity is a hard boundary.** `src/engine/**` imports nothing from React, the DOM, Dexie, Zustand or Capacitor, and never reads the clock or `Math.random`. It takes explicit inputs and returns plain data. A test asserts the import graph. `palm/enhance.ts` and `palm/ridge.ts` are the only files allowed to touch `ImageData`, and they still take it as an argument.
4. **One-way data flow.** UI reads persisted state through `useLiveQuery` and writes only through `repo.ts`; derived data comes only from engine calls memoised in `patriCache`; ephemeral state lives only in the Zustand store. Nothing crosses sideways, and no component writes to Dexie directly.
5. **Component conventions.** Function components with named exports; one component per file, named after the file; props typed with an explicit `interface`; no default exports except route modules; no inline styles except CSS custom properties being set from computed values (`--moon-k`, `--flicker`, loupe position); **no hex colour, font stack, duration or easing outside `tokens.css`**, every one comes from a variable. Feature components live under `src/features/<name>/`, and shared primitives under `src/components/ui/` restyled through tokens and **never forked**.
6. **Motion discipline.** Springs come from `src/motion/springs.ts`; durations and easings from the tokens. Animate `transform` and `opacity` only. Never animate a filter, a shadow blur or a layout property. Put `will-change: transform` on moving objects and remove it when they rest.
7. **Accessibility is part of "compiles".** A new interactive element without a name, a focus style and a keyboard path is an incomplete component, not a follow-up ticket.
8. **Errors are typed and presented, never swallowed.** Throw `EngineError` with a code; catch at the route boundary; render the cracked lac seal. No empty `catch`, no `console.error` as error handling. `console.log` never ships.
9. **Every classical rule carries a citation.** A yoga, koota or palm rule without a `Citation` and at least one positive and one negative fixture fails the test suite. Rule text lives in the rule table, never inside a component.
10. **No dead code.** No commented-out blocks, no `TODO` without an owner and a date, no unused export, no dependency that nothing imports. If a feature is deferred, delete the code and keep the note in the plan.
11. **Tests are written with the code, not after it.** A new engine function arrives with its fixture in the same commit. A bug fix arrives with the failing test that proves it. Fixtures record which oracle and which preset produced them.
12. **Commit cadence.** Small, working, imperative-mood commits ("Add Vimshottari antardaśā generator", not "wip"). One concern per commit; never mix a refactor with a behaviour change. Every commit leaves `main` green, `npx biome ci . && npm run test:unit` before every push. Branch for anything longer than an evening, and never tag from a `debug/*` branch.
13. **Performance is a budget, not a hope.** Before adding a dependency, check its gzipped weight against the 350 kB entry budget; heavy things are route-level dynamic imports. Before adding an animation, check it is transform-only. Before adding a network call, don't: there are exactly two, and the CSP will block a third.
14. **Privacy is a property of the code.** No new origin in `connect-src`, no new permission in the manifest, no analytics, no logging of birth data or image content. Adding any of these is a deliberate, reviewed change, which is exactly why the allow-lists and scanners exist.
