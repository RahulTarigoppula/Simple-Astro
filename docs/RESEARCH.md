# Jyoti — Indian Astrology & Palmistry Companion: Research Dossier

*Research date: 2026-09-06. Every package version, license and free-tier figure below was checked live against the npm registry, PyPI, GitHub API or the vendor's own docs on this date; items I could not fully confirm are marked with a confidence flag and repeated in "Open questions".*

---

## 1. Summary & feasibility

**Feasibility: 4 / 5.** The whole product — Vedic chart engine, Panchang, Dasha, Kundli matching, palm landmarking, private local profiles — can run **100 % client-side, offline, with zero API keys and zero backend**. Nothing in the core path needs a server. The two things that need judgement are:

1. **Ephemeris licensing.** The gold standard (Swiss Ephemeris) is now available as small browser WASM builds (`@kuntay/swisseph`, `@swisseph/browser`), but it is **AGPL-3.0**: the entire app must be published under AGPL if you use it. The permissive alternative, **`astronomy-engine` (MIT, ±1 arcminute)**, is demonstrably good enough — the MIT-licensed `@ishubhamx/panchangam-js` is built on it and reports a 100 % match with Drik Panchang across 200 consecutive days. Recommendation: build the engine on `astronomy-engine` behind an `Ephemeris` interface, and keep an optional AGPL Swiss adapter for a "precision mode" you can flip on if you are happy to publish the repo as AGPL. **Fact-check note (2026-09-06):** the "100 % match with Drik" is for *tithi/nakshatra classification*, not for longitudes — `panchangam-js` uses a *mean* Lahiri that sits ~24″ below Drik's displayed ayanamsa and up to ±17″ from Swiss Ephemeris' nutation-inclusive Lahiri; see §5.4 for the measured offsets.
2. **Palm-line extraction is the only genuinely hard CV problem.** Hand *landmarks* (21 points) are a solved problem in the browser via MediaPipe (Apache-2.0). Extracting the heart/head/life lines from a phone photo with classical filters (CLAHE + ridge/Frangi + skeletonisation on a landmark-rectified palm ROI) works in good light but is brittle; the mitigation is a guided capture overlay, a manual "trace/adjust" step, and honest confidence indicators. Everything else in palmistry (hand shape element, finger ratios, mounts) is pure geometry on the landmarks and is reliable.

Everything else — geocoding (bundled GeoNames), historical time zones (browser `Intl` tz database + CC0 `tz-lookup`), SVG North/South Indian charts, 3D birth-sky visuals (three.js), Android packaging (Capacitor 8 built on GitHub Actions) — is routine and free.

---

## 2. Recommended stack

| Layer | Choice | Version (2026-09-06) | License | Why |
|---|---|---|---|---|
| Web app | Vite + React 19 + TypeScript, static export | — | MIT | Ecosystem for `@react-three/fiber`, Motion, MediaPipe React examples; trivial GitHub Pages deploy (`base: '/jyoti/'`). |
| PWA / offline | `vite-plugin-pwa` (Workbox) | 1.3.0 | MIT | Precache engine + models so readings work with no network. |
| Astronomy core | `astronomy-engine` | 2.1.19 (npm 2023-12-14; last repo commit 2025-01-27 — **2.7 yrs since last npm release, treat as frozen**) | MIT | ±1′ vs NOVAS/DE405; true-ecliptic-of-date longitudes via `Ecliptic()`; sidereal time, rise/set, Moon-phase root-finder built in; 1.8 MB unpacked, pure JS. |
| Precision option (opt-in, AGPL lane) | `@kuntay/swisseph` **or** `@swisseph/browser` | 0.2.2 (Jul-2026) / 1.3.1 | AGPL-3.0 | Swiss Ephemeris 2.10.03 in WASM, Moshier built-in (no data files, ~230 KB brotli / ~250 KB gz), optional `.se1` (~2 MB) from jsDelivr; gives true node, Lahiri sidereal mode and houses. **Verified in the shipped tarballs:** `@kuntay/swisseph` exposes `setSiderealMode(ayanamsa, t0?, ayanT0?)`, `ayanamsa(jd)`, `SiderealMode.Lahiri = 1` (+ `Lahiri1940`/`LahiriVp285`/`LahiriIcrc`), `Flag.Sidereal = 65536`, `houses_ex2`; `@swisseph/browser` exposes `setSiderealMode(SiderealMode.Lahiri)`, `getAyanamsa(jd)`, `getAyanamsaExUt()`, `calculateHouses()` (documented in its README §"Sidereal Calculations"). |
| Vedic math | **Own package `@jyoti/engine`** (ayanamsa, lagna, vargas, dasha, panchang, yogas, ashtakoota) | — | MIT (yours) | Keeps the logic auditable; validated against PyJHora / Drik Panchang. `@ishubhamx/panchangam-js` (MIT) is the accelerator/oracle for the MVP. |
| Geocoding | Bundled GeoNames `cities500` subset + `minisearch` | GeoNames dump / minisearch 7.x | CC BY 4.0 / MIT | Offline birthplace search; India + neighbours full, world ≥15k pop. Online fallback: Open-Meteo Geocoding (no key) or Nominatim (1 rps). |
| Time zone | `@photostructure/tz-lookup` + `luxon` | 11.6.1 / 3.7.2 | CC0-1.0 / MIT | lat/lon → IANA zone (88 KB, browser-safe); Luxon uses the browser's IANA tzdb for **historical** offsets (IST, 1942-45 war time, Nepal +5:45…). Temporal is in Chrome 144+/Firefox 139+ but **not Safari** (Safari Technology Preview only; iOS Safari none, per MDN BCD) → keep Luxon. |
| Local profiles | `dexie` (IndexedDB) | 4.4.5 | Apache-2.0 | Private per-device profiles (friends' birth data + palm photos); export/import as passphrase-encrypted JSON via Web Crypto. |
| Hand landmarks | `@mediapipe/tasks-vision` + `hand_landmarker.task` (self-hosted) | 1.0.1 | Apache-2.0 | 21 landmarks + handedness + world coords, IMAGE or VIDEO mode, GPU/WASM. |
| Palm-line CV | `@techstark/opencv-js` — pin **4.12.0-release.1** (2025-11-08) for the stable 4.x API, or take **5.0.0-release.1** (2026-06-24; tracks the *stable* OpenCV 5.0.0 released 2026-06-06 — not a pre-release, but a new major API) *or* a ~200-line pure-JS/WebGL ridge filter | 4.12.0-release.1 / 5.0.0-release.1 | Apache-2.0 | CLAHE, Gaussian, Sobel/Hessian, Canny, morphology, connected components. 14.7 MB unpacked → lazy-load only on the palm screen. |
| Chart rendering | Own React SVG components (North diamond / South grid) — geometry cribbed from `vedic-astrology-chart-solid` | 1.2.3 | MIT | SVG scales, animates and prints; no canvas. |
| Premium visuals | `three` + `@react-three/fiber` (birth-sky dome), `motion` (MIT) or `gsap` (free, non-OSI), Google Fonts Devanagari (OFL) | three 0.185.1, motion 13.2.0, gsap 3.15.0 | MIT / MIT / GSAP Standard | See §7. |
| Android | Capacitor 8 (`@capacitor/core` 8.5.1, `@capacitor/camera` 8.2.4, `@capacitor/filesystem`, `@capacitor/preferences`) built by **GitHub Actions** → signed APK attached to a GitHub Release | 8.5.x | MIT | No local Java/SDK needed; `ubuntu-latest` (= Ubuntu 24.04) runners ship JDK 8/11/17 (default)/21/25 + Android SDK (build-tools 34–37, platforms 34–37, cmdline-tools 12.0, Gradle 9.7.1). Capacitor 8 compiles with **Java 21** (`JavaVersion.VERSION_21` in `android/capacitor/build.gradle`), AGP 8.13.0, Gradle wrapper 8.14.3, compileSdk/targetSdk 36, minSdk 24 — so the workflow must select JDK 21 with `actions/setup-java@v6` (v1–v4 are deprecated). Zero-toolchain fallback: PWABuilder/Bubblewrap TWA (`@bubblewrap/cli` 1.25.0, Apache-2.0). |
| Backend / proxy | **None.** Optional Cloudflare Worker only if you later add a BYO-key LLM "narrative" feature | — | — | All data and computation stay on-device; hand photos never leave the phone. |

---

## 3. Data sources & APIs

| Name | URL | License / terms | Free tier / limits | Purpose | Confidence |
|---|---|---|---|---|---|
| GeoNames gazetteer dump (`cities500.zip`, `IN.zip`, `NP.zip`, `LK.zip`, …) | https://download.geonames.org/export/dump/ | CC BY 4.0 (attribution in About screen) | Unlimited download; ~185k rows in cities500; includes IANA `timezone` column | Offline birthplace search, bundled as gz JSON (~1–2 MB for India+neighbours+world≥15k) | verified |
| Open-Meteo Geocoding API | `GET https://geocoding-api.open-meteo.com/v1/search?name=Madurai&count=5&language=en&format=json` | Data CC BY 4.0; **non-commercial use only** on the free tier | No key, no signup; 600/min, 5 000/h, 10 000/day; returns `latitude, longitude, timezone, country_code, admin1, population, elevation` | Online fallback for places not in the bundle | **verified** — limits/terms from open-meteo.com/en/terms; docs say an API key is "only required for commercial use"; **CORS verified live 2026-09-06**: `GET geocoding-api.open-meteo.com/v1/search` returns `access-control-allow-origin: *`, `access-control-allow-methods: GET, OPTIONS` |
| Nominatim (OSM) | `GET https://nominatim.openstreetmap.org/search?q=Madurai&format=jsonv2&limit=5&addressdetails=1` | ODbL data; usage policy: ≤1 req/s, identifying `User-Agent`/`Referer`, **no autocomplete**, attribution required | Free, no key | Second online fallback (search-on-submit only, never per-keystroke) | verified (policy page); CORS verified live (`access-control-allow-origin: *`) |
| IANA tz database via browser `Intl` / Luxon | (built into browsers) | Public domain | — | Historical UTC offsets for any birth date/place | verified |
| Swiss Ephemeris `.se1` files (`sepl_18.se1`, `semo_18.se1`) | via jsDelivr through `@kuntay/swisseph` `FetchEphemeris` / `@swisseph/browser` `loadStandardEphemeris()` | AGPL-3.0 (or Astrodienst commercial) | ~2 MB one-time, cached in browser | Optional DE441-grade precision in the AGPL lane; Moshier fallback needs **no files** (<1″ planets, few ″ Moon, 3000 BCE–3000 CE) | verified |
| HYG star database v4.4 (119 614 stars) | https://codeberg.org/astronexus/hyg (`data/hyg/CURRENT/hyg_v44.csv.gz`) | **CC BY-SA 4.0** (share-alike applies to the derived star file, not your code) | Free download | Real night sky at the moment of birth (three.js dome); filter to mag ≤ 6 (~9 000 stars) | verified |
| Yale Bright Star Catalog (BSC5) | https://heasarc.gsfc.nasa.gov/W3Browse/star-catalog/bsc5p.html | Public-domain US-government catalog | ~9 100 stars | Alternative to HYG without share-alike | likely |
| MediaPipe `hand_landmarker.task` (full, float16) | https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/latest/hand_landmarker.task | **Apache-2.0 — verified**: model card "Hand Tracking (Lite/Full) with Fairness, Oct 2021" p. 2 states "LICENSED UNDER Apache License, Version 2.0" (the solutions page itself only licenses its *code samples* under Apache-2.0; the model license lives in the model card) | 7 819 105 bytes (7.46 MiB), self-host in `/public/models` | Hand landmarks in browser & WebView | verified (model card PDF, 2026-09-06) |
| Drik Panchang (website) | https://www.drikpanchang.com | Website, no API, ToS forbid scraping | Manual use | **Validation oracle** for tithi/nakshatra/ayanamsa/sunrise (screenshot ~30 dates) | verified (as a site; no API) |
| VedAstro Calculate API | https://vedastro.github.io/ (706-method REST API) | MIT code; API free tier | "5 calls/minute, no signup required"; $1/mo unlimited | Optional cross-check of planet longitudes / dasha during development; not a runtime dependency | likely (limits from docs page) |
| PyJHora (Python) | https://github.com/naturalstupid/PyJHora (PyPI 4.8.7, Jun-2026) | **AGPL-3.0** (GitHub LICENSE and PyPI `license` field are the AGPL text); PyPI *classifier* contradictorily says "OSI Approved :: MIT License" — treat as AGPL | Free (`requires_python >= 3.8`) | Offline oracle: 284 yogas, 22 graha + 22 rasi dashas, ashtakoota CSVs, README now claims ~7 678 tests. Use to *validate*, do not copy code into the MIT engine | verified |
| Classical tables (nakshatra lords, yoni animals, gana, nadi, varna, koota matrices, varga rules) | Brihat Parashara Hora Shastra / Muhurta Chintamani; tabulated in PyJHora `const.py` and Wikipedia | Facts, not copyrightable; re-type your own tables | — | Engine constants | verified |

---

## 4. Key libraries

| Package | Version | License | Purpose | Browser? | Notes |
|---|---|---|---|---|---|
| `astronomy-engine` | 2.1.19 | MIT | Tropical positions (true ecliptic of date), GAST, rise/set, Moon-phase search | Yes | `Ecliptic(GeoVector(body,t,true))` → apparent longitude of date (**verified** in source/js/README.md: `Ecliptic` "Converts a J2000 mean equator (EQJ) vector to a true ecliptic of date (ETC) vector"; `SunPosition` and `EclipticGeoMoon` are documented as ECT; README: "accuracy always within 1 arcminute of results from NOVAS" — no separate Moon figure). `SunPosition`, `EclipticGeoMoon`, `SiderealTime`, `SearchRiseSet`, `SearchAltitude`, `SearchMoonPhase`, `SearchMoonNode`, `DefineStar` (8 slots). No planetary node longitudes → compute mean node yourself. Release cadence slow; last commit 2025-01-27 ("Fixes in C comments…"), ~1.0k stars; no npm release since 2023-12-14. |
| `astronomia` | 4.2.0 | MIT | Fallback pure-JS Meeus/VSOP87 (planetposition, moonposition, nutation, sidereal, rise, deltat) | Yes | Used by `vedic-astro` (MIT). Keep as plan B if astronomy-engine goes stale. |
| `@kuntay/swisseph` | 0.2.2 (2026-07-31) | AGPL-3.0-or-later | Swiss Ephemeris 2.10.03 WASM, Moshier built-in, 230 KB brotli, Node/browser/Deno/Bun/Workers, TS types, `houses()` with named `ascendant`, optional `.se1` via `FetchEphemeris`+`BrowserCache` | Yes (`type: module`, `engines.node >= 20`, ships `wasm/swisseph.wasm` 563 KB raw) | Very new (4 releases, 2026-07-30/31; GitHub repo has 1 star). **Sidereal is already exposed** (`setSiderealMode`, `ayanamsa(jd)`, `SiderealMode.Lahiri`, `Flag.Sidereal`, `houses_ex2`) though the README never mentions it; the "0.3.0 wave" is *advanced/viz/react-ui/license* packages, not sidereal. Each instance carries its own `swed` state, so sidereal mode is per-instance. |
| `@swisseph/browser` (+`@swisseph/core`) | 1.3.1 | AGPL-3.0 | Alternative WASM build; Moshier built-in (~250 KB gz), `loadStandardEphemeris()` from CDN, `calculateHouses()` | Yes | **Sidereal API is documented and shipped**: README §"Sidereal Calculations" (`swe.setSiderealMode(SiderealMode.Lahiri)`, `swe.getAyanamsa(jd)`), `.d.ts` also has `getAyanamsaExUt`; wasm exports `_swe_set_sid_mode`, `_swe_get_ayanamsa_ex_ut`. GitHub repo has 7 stars. |
| `swisseph-wasm` (prolaxu) | 0.1.0 (2026-07) | GPL-3.0-or-later | WASM with all `.se1` embedded (2.1 MB download at init) | Yes | Used by hora-prakash (v0.0.5). Heavier; GPL label conflicts with upstream AGPL — treat as AGPL. |
| `sweph-wasm` (ptprashanttripathi) | 2.6.9 (2025-09) | AGPL-3.0-or-later | WASM, downloads `.se1` from CDN | Yes | Used by `@siva-sh/hora`. npm unpacked size is **110 MB** (ephemeris files are inside the package) — avoid. |
| `@fusionstrings/swisseph-wasm` | 0.1.5 | claims MIT, "Rust based" | — | Yes | **License claim is suspect**: a port of Swiss Ephemeris source is a derivative work and cannot be MIT. Avoid. |
| `@ishubhamx/panchangam-js` | 3.0.0 (2026-07) | MIT | Panchang, 9 grahas w/ rashi/nakshatra/pada, Kundli bhavas, 16 vargas D1–D60, Vimshottari MD/AD, Ashtakoota, muhurtas, 80+ festivals, eclipses | Mostly (deps: only `astronomy-engine`, `luxon`; **CommonJS** build, no `exports`/`module` fields) — **one Node-only import**: `dist/kundli/exporter.js` does `require("fs")` for `exportKundliToJson()`, so Vite needs `fs` stubbed/externalised (`resolve.alias`/`build.rollupOptions.external`) or avoid importing that subpath | README: "100 % accuracy" over 200 consecutive days (Sep 2025 – Apr 2026) vs Drik, **98.64 % over 643 797 test cases**, 1 926 tests; no JHora validation claimed. **Ayanamsa verified in source** (`dist/ephemeris/ayanamsa.js`): default `'Lahiri'` = J2000 **23°51′25.532″** + Newcomb rate 5029.0966″/cy + 1.11161 T² — a *mean* ayanamsa with **no nutation** (also `'Raman'` 22°24′45″, `'KP'` 23°45′56″, `'SuryaSiddhanta'`). Ideal MVP accelerator. |
| `panchang-ts` | 5.2.1 (2026-09) | MIT | Pure-TS panchang, zero runtime deps, RN/browser | Yes | Second opinion for tithi/nakshatra. |
| `vedic-astro` | 0.1.1 | MIT | Kundali, panchang, Gun Milan on `astronomia` | Yes | Small; useful for reading a second Gun-Milan implementation. |
| `vedic-astrology-chart-solid` | 1.2.3 | MIT | SVG North (diamond) & South (grid) charts from sidereal degrees + ascendant; CSS-variable theming | Yes (SolidJS) | Port geometry to React or use as reference. |
| `@photostructure/tz-lookup` | 11.6.1 | CC0-1.0 | lat/lon → IANA zone, 88 KB | Yes — single CommonJS file `tz.js` (73 KB, `module.exports` guarded, no Node APIs; Vite/esbuild bundle it fine) | README: trades accuracy for size — ~10 % of *inhabited* coordinates differ from `geo-tz`, "expect errors near timezone borders far away from populated areas"; fine for city-level birthplaces. |
| `luxon` | 3.7.2 | MIT | Zoned datetime, historical offsets via `Intl` | Yes | `DateTime.fromObject({...}, {zone:'Asia/Kolkata'}).toUTC()` |
| `minisearch` | 7.x | MIT | Fuzzy/prefix city search over bundled GeoNames | Yes | ~10 KB. |
| `dexie` | 4.4.5 | Apache-2.0 | IndexedDB profiles, palm photos as Blobs | Yes | Works identically inside Capacitor WebView. |
| `@mediapipe/tasks-vision` | 1.0.1 | Apache-2.0 | `HandLandmarker.createFromOptions(FilesetResolver.forVisionTasks(wasmPath), { baseOptions:{ modelAssetPath, delegate:'GPU' }, numHands:1, runningMode:'IMAGE' })` | Yes | Self-host the `wasm/` folder from the npm package for offline. |
| `@techstark/opencv-js` | pin **4.12.0-release.1** (2025-11-08) unless you want OpenCV 5 — `5.0.0-release.1` (2026-06-24) tracks the **stable** OpenCV 5.0.0 (released 2026-06-06) | Apache-2.0 | `cv.CLAHE`, `cv.GaussianBlur`, `cv.Sobel`, `cv.Canny`, `cv.morphologyEx`, `cv.connectedComponentsWithStats`, `cv.HoughLinesP`, `cv.warpPerspective` | Yes | 14.7 MB unpacked, needs `fs/path/crypto` fallbacks in Vite; lazy-load. `ximgproc.thinning` not in default build → implement Zhang-Suen in JS (30 lines). |
| `three` / `@react-three/fiber` / `@react-three/drei` | 0.185.1 | MIT | Birth-sky dome, zodiac ring, planet glyph orbits, shader backgrounds | Yes | |
| `motion` (Framer Motion successor) | 13.2.0 | MIT | Layout/scroll/spring animation | Yes | OSI-clean alternative to GSAP. |
| `gsap` | 3.15.0 | GSAP Standard License (free incl. commercial, all plugins; **not OSI**; can't be used to build a no-code animation tool) | SplitText, DrawSVG (line-drawing reveal of palm lines!), MorphSVG, ScrollTrigger | Yes | Fine for a personal project; note non-OSI in credits. |
| `vite-plugin-pwa` | 1.3.0 | MIT | Service worker/precache | Yes | |
| `@capacitor/core`, `@capacitor/camera`, `@capacitor-community/sqlite` (optional) | 8.5.1 / 8.2.4 / 8.1.1 | MIT | Native shell, camera, optional SQLite | Android | API 24+ (Android 7+). |
| `@bubblewrap/cli` | 1.25.0 | Apache-2.0 | PWA → TWA APK | Android | Alternative to Capacitor; camera works via `getUserMedia` in Chrome TWA. |
| `kerykeion` (Python) | current | AGPL-3.0 | Reference only: sidereal option + SVG chart generation design | — | Western-first; don't depend on it. |
| `jyotisha` (Python, sanskrit-coders) | master (pushed 2026-09-05) | MIT | Reference: panchanga/festival rules; uses `pyswisseph==2.10.3.2` | — | Good for festival & masa rules. |

---

## 5. How the core problem is solved

### 5.1 Pipeline overview

```
birth input (local date, time, place)
  → geocode (bundled GeoNames → lat, lon, IANA tz)
  → Luxon: zoned local → UTC instant → JD_UT, JD_TT (ΔT inside astronomy-engine)
  → tropical apparent longitudes of Sun, Moon, Me, Ve, Ma, Ju, Sa (astronomy-engine, true ecliptic of date)
  → Rahu/Ketu (mean node formula, or osculating node; Swiss lane: SE_TRUE_NODE)
  → Lahiri ayanamsa (mean + nutation) → sidereal longitudes
  → Lagna from GAST + obliquity + latitude → sidereal
  → Rashi (D1, whole-sign houses), Navamsa (D9), other vargas
  → Nakshatra/pada, Vimshottari Dasha tree
  → Panchang at birth (tithi, vara, nakshatra, yoga, karana) + sunrise
  → Yogas, Ashtakoota (two profiles)
  → SVG North/South charts, readings text
```

Everything is a pure function of `(jdUT, lat, lon)` — trivially testable.

### 5.2 Time handling

1. `DateTime.fromObject({year, month, day, hour, minute}, {zone})` with `zone` from `tz-lookup(lat, lon)`; expose a **manual UTC-offset override** (see risk on Bombay Time).
2. `date = dt.toUTC().toJSDate()`; `JD_UT = date.getTime()/86400000 + 2440587.5`.
3. `const time = Astronomy.MakeTime(date)` — astronomy-engine handles ΔT/TT internally; `time.tt` gives TT days from J2000 for the ayanamsa polynomial: `T = time.tt / 36525`.

Historic Indian gotchas the IANA db *does* model (`Asia/Kolkata`, tzdb 2026c `asia` file): LMT +5:53:28 → 1854-06-28; HMT +5:53:20 → 1870; MMT (Madras) +5:21:10 → 1906-01-01; IST +5:30; **+6:30 war time in *two* spells: 1941-10-01 … 1942-05-15 and 1942-09-01 … 1945-10-15** (back to +5:30 in between) → IST. Verified in Node 22 (V8, ICU 77, tz 2025b): `Intl` gives GMT+06:30 for 1943-06-01 and 1942-01-01, GMT+05:30 for 1942-07-01, GMT+05:21:10 for 1900 — so Luxon/`Intl` does return the historical offsets in Chromium/Android WebView. It does *not* model Bombay Time (+4:51) which some Bombay birth records used until 1955, hence the override field. `Asia/Kathmandu` +5:45 (from 1986; +5:30 before; LMT +5:41:16 before 1920), `Asia/Colombo` +6:00/+6:30 war time 1942-01-05 … 1945-10-16, then +5:30 → +6:30 (1996-05-25) → +6:00 (1996-10-26) → +5:30 (2006-04-15), `Asia/Karachi` +5:30 (with 1942-45 war time) until 1951, +5:00 from 1971; `Asia/Dhaka` +6:30/+5:30 flips 1941-51 — all in tzdb and handled by `Intl` (verified for the cases above).

### 5.3 Tropical apparent positions (MIT lane)

```ts
import * as A from 'astronomy-engine';
const lon = (b: A.Body, t: A.AstroTime) => A.Ecliptic(A.GeoVector(b, t, true)).elon; // true ecliptic of date, deg 0–360
// Sun: A.SunPosition(t).elon   Moon: A.EclipticGeoMoon(t).lon
```

`Ecliptic()` in 2.1.x converts J2000 equatorial → **true ecliptic of date (ECT)**, i.e. apparent longitude relative to the true equinox — the same convention Swiss Ephemeris uses by default. Accuracy: within 1′ of NOVAS/DE405 (planets) — a nakshatra pada is 200′ wide, a tithi 720′, so boundary misclassification only occurs within ~1′ of a boundary; show a "near boundary" badge in that case.

**Rahu/Ketu.** astronomy-engine has no node *longitude* function (`SearchMoonNode` only finds crossing *times*). Options:

- *Mean node (Meeus 47.7)*: `Ω = 125.0445479 − 1934.1362891·T + 0.0020754·T² + T³/467441 − T⁴/60616000` (deg, T = Julian centuries TT from J2000), normalise; Ketu = Ω + 180°.
- *True (osculating) node in pure JS*: take the Moon's geocentric ecliptic position vector **r** at t and t±30 s (`A.GeoMoon` rotated with `Rotation_EQJ_ECT`), finite-difference velocity **v**, `h = r × v`, `n = ẑ × h`, `Ω = atan2(n_y, n_x)`. This is what Swiss Ephemeris' `SE_TRUE_NODE` (=11) means. Expose a setting; **JHora/Drik-style default is true node** (verify — see open questions).

### 5.4 Lahiri (Chitrapaksha) ayanamsa

Swiss Ephemeris defines `SE_SIDM_LAHIRI` (=1) by an epoch value: **23°15′00.658″ at JD 2435553.5 (21 March 1956, 0:00 TDT)** "according to IAE 1985" (swisseph.htm §2.8.5), and in the current source (`sweph.h`, `ayanamsa[]` table) the entry is `{2435553.5, 23.250182778 − 0.004658035, FALSE, SEMOD_PREC_IAU_1976}` — i.e. a −16.77″ correction and **IAU-1976 precession** (the dossier's earlier `0.004660222` figure is off by 0.008″ — harmless, but use the source value). The ICRC variant `SE_SIDM_LAHIRI_ICRC` (=46) is `{2435553.5, 23.25 − 0.00464207, FALSE, SEMOD_PREC_NEWCOMB}` (23°15′00.0″, "according to ICRC and pre-1985 IAE/IENA"). Propagating the standard entry with general precession gives a **mean** ayanamsa at J2000 of ≈ **23°51′25.4″ (23.85705°)** (re-derived independently on 2026-09-06: 23.857054°; the IAU-1976 vs IAU-2006 rate difference is 0.1″ over 44 years); adding nutation in longitude on 2000-01-01 (≈ −14″) gives 23°51′11″. Implementation:

```
T  = (JD_TT − 2451545.0) / 36525
pA = 5028.796195·T + 1.1054348·T² + 0.00007964·T³ − 0.000023857·T⁴ − 0.0000000383·T⁵   // arcsec, IAU 2006
Δψ = −17.20″·sin Ω − 1.32″·sin 2L − 0.23″·sin 2L′ + 0.21″·sin 2Ω                       // Meeus 22, ±0.5″
     (Ω mean node as above; L = 280.4665 + 36000.7698·T; L′ = 218.3165 + 481267.8813·T)
ayanamsa_apparent = 23.85706° + (pA + Δψ)/3600
λ_sidereal = (λ_tropical_apparent − ayanamsa_apparent) mod 360
```

Check values (Lahiri incl. nutation, attributed to Jagannatha Hora's SE-computed table — **JHora figures could not be independently verified on 2026-09-06**): 2000-01-01 → 23°51′12″; 2020-01-01 → 24°07′55″; 2025-01-01 → 24°12′23″; 2026-01-01 → 24°13′19″. The formula above reproduces those four values to ≤1″ (independent recomputation: 23°51′11.3″, 24°07′54.6″, 24°12′23.0″, 24°13′18.4″), so it is self-consistent with SE's *true* (nutation-inclusive) Lahiri. Rate ≈ 50.3″/yr.

**⚠ Drik Panchang does NOT match this formula "within a few arcseconds".** Values read from drikpanchang.com day-panchang pages ("Lahiri Ayanamsha", New Delhi) on 2026-09-06: 2000-01-01 → **23.863782°** (23°51′49.6″); 2020-01-01 → **24.143189°** (24°08′35.5″); 2025-01-01 → **24.213073°** (24°12′47.1″); 2026-01-01 → **24.227035°** (24°13′37.3″). Against the nutation-inclusive formula the differences are +38″, +41″, +24″, +19″ (they wander because Drik has no nutation term); against the *mean* formula (drop Δψ) the difference is a **constant +24.3″ ± 0.1″** on all four dates. So Drik displays a **mean (nutation-free) Lahiri with a J2000 base of ≈ 23.86380° (23°51′49.7″)** — 24.3″ above SE's mean Lahiri and ≈ 24″ above `panchangam-js`'s 23°51′25.532″. Consequences: (a) ship an ayanamsa *setting* with at least three presets — `Lahiri (SE, true/nutation)`, `Lahiri (SE, mean)`, `Lahiri (Drik-compatible mean: 23.86380° + pA/3600)` — and label which one a chart used; (b) 20–40″ shifts flip a pada/sign only when a body sits within ~0.5′ of a boundary, but they *will* show up in golden tests against Drik screenshots unless the Drik preset is used; (c) the "golden" oracle for the SE presets must be JHora/`swetest`, not Drik. (The +24.3″ offset is an empirical fit to four samples; confirm on ~10 more dates, including pre-1956 ones, before hard-coding.) Other ayanamsas are just different J2000 constants (SE ids: Raman = 3, Krishnamurti = 5, True Citra = 27, Lahiri 1940 = 43, Lahiri VP285 = 44, Lahiri ICRC = 46 — confirmed in `swephexp.h`; `panchangam-js` uses Raman 22°24′45″ and KP 23°45′56″ at J2000 — the dossier's "Raman ≈ 22°21′" is **unverified** and disagrees with that; take the SE `ayanamsa[]` table as truth if you add them). SE 2.10 also ships `LAHIRI_1940`(43), `LAHIRI_VP285`(44), `LAHIRI_ICRC`(46), `TRUE_CITRA`(27) — differences are ≤ ~20″ and only matter for rectification work.

### 5.5 Lagna (ascendant) and houses

```
GAST_h = A.SiderealTime(time)                     // hours, Greenwich apparent sidereal time
RAMC   = (GAST_h·15 + lon_east) mod 360           // deg
ε0     = (84381.406 − 46.836769·T − 0.0001831·T² + 0.00200340·T³)/3600   // mean obliquity, IAU 2006
Δε     = 9.20″·cos Ω + 0.57″·cos 2L + 0.10″·cos 2L′ − 0.09″·cos 2Ω
ε      = ε0 + Δε/3600
ASC_trop = atan2( cos RAMC , −( sin RAMC · cos ε + tan φ · sin ε ) )  → normalise 0–360
MC_trop  = atan2( sin RAMC , cos RAMC · cos ε )
ASC_sid  = ASC_trop − ayanamsa_apparent
```

- **Rashi chart uses whole-sign houses**: house n = sign of (Lagna sign + n − 1). That is what every Indian chart shows; there is no Placidus in Jyotisha.
- Optional *Bhava Chalit* (Sripati/Porphyry: trisect ASC→IC→DSC→MC arcs) for house-strength readings — full-vision item.
- Special lagnas (Hora, Ghati, Bhava, Arudha) — full vision; PyJHora `horoscope/chart/*` has them all.
- Swiss lane: `swe.houses_ex(jd, SEFLG_SIDEREAL, lat, lon, 'W')` returns sidereal ascendant directly.

### 5.6 Nakshatra & pada

`idx = floor(λ_sid / 13.3333)` (0–26, Ashwini = 0); `pada = floor(λ_sid / 3.3333) mod 4 + 1`. Lord cycle repeated 3×: **Ketu, Venus, Sun, Moon, Mars, Rahu, Jupiter, Saturn, Mercury**. Also derive Moon-sign (Chandra rashi), Janma nakshatra name syllables (nama-akshara), gana, yoni, nadi, varna — all lookup tables keyed by `idx`/`pada`.

### 5.7 Divisional charts (vargas)

Let `s` = sidereal sign (0 = Aries), `d` = degrees within sign, `i = floor(d / (30/n))` the part index.

| Chart | Rule (sign of part i) |
|---|---|
| D9 Navamsa | `floor(λ_sid / (10/3)) mod 12` (movable signs start from themselves, fixed from 9th, dual from 5th — the formula encodes it) |
| D2 Hora | i=0: Sun's hora (Leo) for odd signs, Moon's (Cancer) for even; i=1 the reverse |
| D3 Drekkana | `(s + 4·i) mod 12` |
| D7 Saptamsa | odd sign: `(s + i)`; even: `(s + 6 + i)` |
| D10 Dasamsa | odd: `(s + i)`; even: `(s + 8 + i)` |
| D12 Dwadasamsa | `(s + i) mod 12` |
| D30 Trimsamsa | unequal bands 5/5/8/7/5° → Mars, Saturn, Jupiter, Mercury, Venus (odd signs); reversed for even |
| D60 Shashtiamsa | `(s + i) mod 12` (+ deity table) |

Full Parashari table for D4, D16, D20, D24, D27, D40, D45 is in PyJHora `horoscope/chart/charts.py` — re-derive, don't copy (AGPL).

### 5.8 Vimshottari Dasha

- Years: Ketu 7, Venus 20, Sun 6, Moon 10, Mars 7, Rahu 18, Jupiter 16, Saturn 19, Mercury 17 (Σ = 120).
- Start lord = lord of Moon's nakshatra. `f = (λ_moon_sid mod 13.3333) / 13.3333`; **balance = years(lord) × (1 − f)** from birth.
- Mahadashas follow the fixed cycle from the start lord. Antardasha of lord Z inside mahadasha of X: `years(X) × years(Z) / 120`, starting with Z = X and proceeding in cycle order. Pratyantar: multiply again by `years(W)/120`. Year length: **365.25 days** (JHora default; some use 360-day years — make it a setting).
- Present as a tree with "current MD/AD/PD" highlighted and a timeline ribbon (great visual).

### 5.9 Panchang

Hindu day runs sunrise → sunrise. `sunrise = A.SearchRiseSet(A.Body.Sun, observer, +1, dayStart, 1)` (upper limb + refraction). Many Indian panchang makers use a "Hindu sunrise" convention (Sun's centre, no refraction, or upper limb — conventions differ); implement both via `A.SearchAltitude(Body.Sun, observer, +1, t, 1, targetAltitudeDeg)` and validate against Drik Panchang (open question).

| Anga | Formula (angles in degrees, sidereal where noted) | End-time solver |
|---|---|---|
| Tithi (1–30) | `floor(((λ_moon − λ_sun) mod 360) / 12) + 1`; 1–15 Shukla, 16–30 Krishna (30 = Amavasya, 15 = Purnima) | `A.SearchMoonPhase(12·k, t, 2)` |
| Vara | weekday of the governing sunrise | — |
| Nakshatra | `floor(λ_moon_sid / 13.3333)` | root-find λ_moon_sid = boundary with `A.Search` or bisection on `EclipticGeoMoon` |
| Yoga (27) | `floor(((λ_sun_sid + λ_moon_sid) mod 360) / 13.3333) + 1` (Vishkambha … Vaidhriti) | bisection on the sum |
| Karana (60 per month) | `k = floor(((λ_moon − λ_sun) mod 360) / 6) + 1`; k=1 Kimstughna; k=2..57 → (k−2) mod 7 over Bava, Balava, Kaulava, Taitila, Gara, Vanija, Vishti; 58 Shakuni, 59 Chatushpada, 60 Naga | `A.SearchMoonPhase(6·k, t, 1)` |

Extras: Rahu Kaal / Yamaganda / Gulika (day length ÷ 8, weekday-indexed slot), Abhijit muhurta (local noon ± 24 min), Masa (Amanta: named by the solar sign at the Amavasya; Purnimanta for North India; Adhika masa when two Amavasyas fall in one solar sign), Ritu, Ayana, Samvatsara (60-year Jovian cycle). Festival rules: crib from `jyotisha` (MIT) and `panchangam-js` (MIT).

### 5.10 Yogas (starter set, all pure lookups on sidereal signs)

Gaja-Kesari (Jupiter in kendra 1/4/7/10 from Moon) · Budha-Aditya (Sun ∧ Mercury same sign) · Chandra-Mangala (Moon ∧ Mars) · Pancha-Mahapurusha: Ruchaka/Bhadra/Hamsa/Malavya/Sasa (Mars/Mercury/Jupiter/Venus/Saturn in own or exaltation sign **and** in a kendra from Lagna) · Kemadruma (no planet except Sun/nodes in 2nd or 12th from Moon; several cancellations) · Sunapha/Anapha/Durudhara (planets 2nd/12th/both from Moon) · Neecha-Bhanga Raja Yoga (debilitated planet's dispositor or exaltation lord in kendra from Lagna/Moon) · Raja yogas (kendra lord ∧ trikona lord conjunct/mutual aspect) · Dhana yogas (2nd/11th lords with 5th/9th) · Viparita Raja (6/8/12 lords in 6/8/12) · Kala-Sarpa (all seven planets between Rahu and Ketu) · Manglik/Kuja dosha (Mars in 1,2,4,7,8,12 from Lagna, Moon, Venus; with the standard cancellations). PyJHora's 284-yoga list (`horoscope/chart/yoga.py`) is the checklist; encode each as a small predicate with a "source text" citation shown in the UI.

### 5.11 Kundli matching — Ashtakoota / Guna Milan (36 points)

| Koota | Max | Rule (Moon sign / nakshatra of boy vs girl) |
|---|---|---|
| Varna | 1 | Sign → Brahmin (Cancer, Scorpio, Pisces), Kshatriya (Aries, Leo, Sagittarius), Vaishya (Taurus, Virgo, Capricorn), Shudra (Gemini, Libra, Aquarius). 1 if boy's varna ≥ girl's, else 0. |
| Vashya | 2 | Sign class → Chatushpada (Aries, Taurus, Sag 2nd half, Cap 1st half), Manava (Gemini, Virgo, Libra, Sag 1st half, Aquarius), Jalachara (Cancer, Cap 2nd half, Pisces), Vanachara (Leo), Keeta (Scorpio); 5×5 table with 2 / 1 / 0.5 / 0. |
| Tara | 3 | Count nakshatras girl→boy and boy→girl, `((count−1) mod 9)+1`; taras 3 (Vipat), 5 (Pratyari), 7 (Vadha) are bad. Both good 3; one good 1.5; none 0. |
| Yoni | 4 | 14 animals from nakshatra (Ashwini/Shatabhisha horse, Bharani/Revati elephant, Pushya/Krittika sheep, Rohini/Mrigashira serpent, Ashlesha/Punarvasu cat, Magha/P.Phalguni rat, U.Phalguni/U.Bhadra cow, Swati/Hasta buffalo, Vishakha/Chitra tiger, Jyeshtha/Anuradha deer, Moola/Ardra dog, P.Ashadha/Shravana monkey, U.Ashadha/Abhijit mongoose, Dhanishta/P.Bhadra lion); 14×14 matrix 4/3/2/1/0 (0 for sworn enemies e.g. cat–rat, cow–tiger, mongoose–serpent…). |
| Graha Maitri | 5 | Natural friendship of the two Moon-sign lords: both friends 5; friend+neutral 4; both neutral 3; friend+enemy 1; neutral+enemy 0.5; both enemies 0. |
| Gana | 6 | Deva / Manushya / Rakshasa by nakshatra. Common table (boy×girl): D-D 6, D-M 6, D-R 1, M-D 5, M-M 6, M-R 0, R-D 1, R-M 0, R-R 6. (Tables vary by school — cross-check PyJHora `gana_array`.) |
| Bhakoot | 7 | Distance between Moon signs; 7 unless 2/12, 5/9 or 6/8 (0 = Bhakoot dosha). Cancellations when the two sign lords are the same or friends (some schools). |
| Nadi | 8 | Adi / Madhya / Antya by nakshatra: idx mod 6 → 0 Adi,1 Madhya,2 Antya,3 Antya,4 Madhya,5 Adi. Different 8, same 0 (Nadi dosha). Classical exceptions: same rashi but different nakshatra, same nakshatra but different pada, sign lords friends. |

Bands: < 18 not recommended, 18–24 acceptable, 25–32 very good, 33–36 excellent. Also show Manglik status of both. South-Indian **10-porutham** system (Dina, Gana, Mahendra, Stree-Deergha, Yoni, Rasi, Rasi-adhipati, Vasya, Rajju, Vedha) is a separate boolean scheme — PyJHora ships both, plus 27×4 × 27×4 CSV oracles (`all_nak_pad_boy_girl.csv`) you can use as golden tests.

### 5.12 Chart rendering (SVG)

- **North Indian (diamond)**: a square with both diagonals and the "inner diamond" joining edge midpoints. 12 fixed house regions: houses 1/4/7/10 are the four inner rhombi (1 top-centre, 4 left, 7 bottom, 10 right); the eight corner triangles hold 2,3 (upper-left pair, anticlockwise), 5,6 (lower-left), 8,9 (lower-right), 11,12 (upper-right). Houses fixed, sign *numbers* written in each region (sign of house n = Lagna sign + n − 1); planets listed inside with degree and retro/combust marks.
- **South Indian (grid)**: 4×4 cells, centre 2×2 blank; signs fixed clockwise starting **Aries at row 0 / col 1** (Pisces at top-left corner, Taurus, Gemini across the top; Cancer, Leo, Virgo down the right; Libra, Scorpio, Sagittarius across the bottom right-to-left; Capricorn, Aquarius up the left). Lagna marked by a diagonal tick in the sign's top-left corner. Houses read clockwise from Lagna.
- Build as data-driven `<g>` groups with `viewBox="0 0 400 400"`, planet abbreviations in Devanagari/Latin (Sū Ch Ma Bu Gu Śu Śa Rā Ke), CSS variables for theme, and Motion/GSAP `DrawSVG`-style stroke reveal on load. `vedic-astrology-chart-solid` (MIT) is a good geometry reference; East-Indian style optional later.

### 5.13 Palmistry pipeline (browser)

1. **Capture**: guided overlay (hand outline, "fill the frame, palm facing camera, flat light"), `@capacitor/camera` on Android (`quality: 90, width: 1600`), `<input type="file" accept="image/*" capture="environment">` / `getUserMedia` on web. Store original + processed as Blobs in Dexie.
2. **Landmarks**: `HandLandmarker` in `IMAGE` mode → 21 normalised landmarks + handedness (0 WRIST, 1–4 THUMB_CMC…TIP, 5–8 INDEX_MCP…TIP, 9–12 MIDDLE, 13–16 RING, 17–20 PINKY). Reject frames with `< 0.8` handedness score or landmarks off-frame. MediaPipe works on both palm and dorsal views; verify palm-up with the handedness label vs thumb position (right hand palm-up → thumb on the left of the image).
3. **Rectify**: homography from 4 stable landmarks (WRIST 0, INDEX_MCP 5, PINKY_MCP 17, and THUMB_CMC 1 or MIDDLE_MCP 9) to a canonical 512×512 palm ROI (`cv.getPerspectiveTransform` + `cv.warpPerspective`), exactly as `yeonsumia/palmistry` does (Apache-2.0).
4. **Enhance**: grayscale → `cv.CLAHE(clipLimit 3, tile 8)` → `cv.GaussianBlur` σ≈1.5 → optionally subtract large-scale illumination (morphological top-hat/black-hat with a 25-px ellipse; black-hat isolates dark creases).
5. **Ridge/valley detection**: palm lines are *dark valleys*, so either (a) black-hat + Otsu/adaptive threshold, or (b) Hessian-based Frangi/"ridge" filter at σ ∈ {2, 3, 4} on the inverted image, or (c) Gabor bank at 8 orientations. `Canny` alone gives double edges — use it only as a fallback. Non-max-suppress, threshold, `cv.morphologyEx(CLOSE)`, then Zhang-Suen thinning (JS) and `connectedComponentsWithStats` to keep components > 60 px.
6. **Line labelling by anatomy** (landmark-relative bands in the canonical ROI): *Heart line* — starts under PINKY_MCP, runs toward INDEX/MIDDLE MCP in the upper 25 % of the palm; *Head line* — starts between THUMB_CMC and INDEX_MCP, crosses the palm centre; *Life line* — arc hugging the thenar (thumb ball) from the same origin down toward the wrist; *Fate line* (optional) — vertical toward MIDDLE_MCP. Score each component against a Gaussian template of expected position/direction; pick the best; measure length (normalised by palm length), curvature, breaks, branches, depth (mean contrast).
7. **Hand-shape element** (pure geometry, robust): palm length `L = |WRIST → MIDDLE_MCP|`, palm width `W = |INDEX_MCP → PINKY_MCP|`, finger length `F = |MIDDLE_MCP → MIDDLE_TIP|`. Square palm if `W/L ≥ ~0.9`, rectangular otherwise; long fingers if `F/L ≥ ~0.8`. Earth = square + short, Air = square + long, Fire = rectangular + short, Water = rectangular + long. Add finger-ratio readings (2D:4D index/ring, Mercury-finger length vs ring first phalanx), thumb angle (flexibility), finger spacing (openness) — all from `worldLandmarks` (metres, view-invariant).
8. **Mounts**: brightness/roundness heuristics on regions under each MCP and the thenar/hypothenar — present as tradition-based only.
9. **Fallback UX**: if line confidence < threshold, show the detected candidates over the photo and let the user drag/adjust three Bézier paths ("trace your lines"), then read from the traced geometry. This turns the hard CV problem into a delightful interaction.
10. **Optional upgrade**: train a tiny UNet (as in `yeonsumia/palmistry`) on your own circle's hand photos, export to ONNX → `onnxruntime-web` (MIT). Not needed for the MVP.

### 5.14 Honest presentation (tradition-based entertainment)

- Header on every reading: *"Based on classical Jyotisha / Samudrika Shastra texts. For reflection and fun — not medical, legal or financial advice."*
- Phrase everything as *"Tradition says…"*, *"Classical texts associate…"*, cite the rule (e.g. "BPHS 36.13") in a tooltip; never emit health, death, fertility or wealth predictions; no "remedies for sale".
- Show your work: every claim links to the chart element that triggered it (planet, house, line measurement) with the measured value and the boundary-proximity badge — this is the "no black box" ethos VedAstro popularised.
- Palm photos are sensitive biometrics: process on-device, never upload, allow one-tap deletion, and encrypt exports.
- No-LLM by design: readings are template sentences composed from rule hits, seeded so the same chart always reads the same. If you ever add an LLM narrator, make it BYO-key via a Cloudflare Worker and label it as "AI-generated paraphrase of the rule hits above".

---

## 6. Reference projects

| Project | Link | License | What to learn from it |
|---|---|---|---|
| **Hora Prakash** (JS, in-browser, closest analogue) | https://github.com/petergus/hora-prakash · live: https://priyankgahtori.github.io/hora-prakash/ | AGPL-3.0 (because of Swiss Ephemeris) | Vanilla JS + Vite + pure SVG; `swisseph-wasm` ^0.0.5 with `SE_SIDM_LAHIRI`; North & South charts, D1–D12, Vimshottari 3 levels, Shadbala/Ashtakavarga; **offline 12 991-city gazetteer** with Nominatim fallback; GitHub Pages hosting; `vite-plugin-pwa`; `@photostructure/tz-lookup` ^11.6.0 + `geo-tz` ^8.1.8 (README also cites timeapi.io). **Caveat:** `package.json` (v1.5.0) now also depends on `firebase` and `@anthropic-ai/sdk`, so it is no longer purely "no backend" — copy the chart/engine ideas, not the SaaS bits. Last commit on `main` 2026-07-20 (not Aug); 0 stars. |
| **PyJHora** (Python) | https://github.com/naturalstupid/PyJHora | AGPL-3.0 (219 stars) | The algorithm oracle: PVR Narasimha Rao's book implemented; `horoscope/dhasa/graha/vimsottari.py`, `horoscope/match/compatibility.py` (+ 27×4 golden CSVs), `horoscope/chart/*`, `panchanga/`, ~6 800–7 678 tests (README). Install with Python for a local validation harness (needs `pyswisseph`; check Py3.14 wheels). |
| **@ishubhamx/panchangam-js** (TS) | https://github.com/ishubhamx/Hindu-Panchangam-Legal | MIT | Proof that `astronomy-engine` is enough: panchang + kundli + 16 vargas + dasha + ashtakoota + eclipses, Drik-validated. Use directly for the MVP and as a cross-check oracle later. |
| **jyotisha** (Python, sanskrit-coders) | https://github.com/sanskrit-coders/jyotisha | MIT (132 stars) | Festival/masa/adhika rules, regional calendar variants, `requirements.txt` pins `pyswisseph==2.10.3.2` (verified). |
| **VedAstro** (C#, API, MCP) | https://github.com/VedAstro/VedAstro · https://vedastro.github.io/ | MIT (630 stars) | "No black box" presentation; 706 calculations; free API (5 calls/min) for spot-checks; JPL-based. Pushed Aug-2026. |
| **kerykeion** (Python) | https://github.com/g-battaglia/kerykeion | AGPL-3.0 | Clean SVG chart-generation architecture; sidereal option; keep as design reference only. |
| **Fortune On Your Hand** (palmistry) | https://github.com/yeonsumia/palmistry | Apache-2.0 (52 stars) | MediaPipe-based palm rectification → UNet line detection → K-means line assignment → landmark-relative length thresholds. Steps 1, 3 and 4 port directly to the browser. |
| **vedic-astrology-chart-solid** | https://github.com/koa137/vedic-astrology-chart-solid | MIT | North/South SVG geometry and CSS-variable theming. |
| RoxyAPI jyotish template (Next.js) | https://github.com/RoxyAPI/jyotish-vedic-astrology-app | MIT UI, but computations via paid RoxyAPI key | UI/UX ideas only (Ashtakoot, dosha, dasha screens). Do **not** depend on the API. |

---

## 7. Visual & design enablers ("mystical but modern")

- **Birth sky dome (signature visual)**: three.js + `@react-three/fiber` sphere with HYG v4.4 stars (mag ≤ 6, CC BY-SA credit) positioned by RA/Dec → alt/az using `A.SiderealTime` + observer latitude; sidereal zodiac ring as a glowing torus with nakshatra ticks; planet glyphs as billboards at their true positions; Lagna as a beam at the eastern horizon. `@react-three/drei` 10.7.8 `Stars`, `Sparkles`, `Environment`, bloom via `@react-three/postprocessing` 3.1.1 (all MIT; `@react-three/fiber` 9.7.0). This is the "wow" that no astrology app in India ships.
- **Chart animations**: SVG stroke-dash reveal of the diamond/grid, planets easing into houses (Motion `layout`/`spring`), Dasha timeline as a horizontally scrolling ribbon with `ScrollTrigger` (GSAP) or Motion `useScroll`.
- **Palm reveal**: after detection, animate the detected heart/head/life lines drawing themselves over the photo (GSAP `DrawSVGPlugin`, now free; or Motion `pathLength`), with soft gold glow (`feGaussianBlur` filter).
- **Typography** (Google Fonts, all OFL): `Tiro Devanagari Hindi/Sanskrit` (elegant text), `Yatra One` (display), `Martel`/`Noto Serif Devanagari` (body Hindi), paired with `Cormorant Garamond` or `Fraunces` (Latin display) and `Inter`/`Manrope` (UI). Use OpenType features for Devanagari conjuncts; test Tamil/Telugu fonts (`Noto Serif Tamil`, `Tiro Telugu`) if localising.
- **Shaders/backgrounds**: fragment-shader nebula/ink-wash (simplex noise) via `three` `ShaderMaterial` or `ogl` (Unlicense, not MIT — public-domain-equivalent, fine); paper-grain overlay; mandala/yantra SVG patterns generated procedurally (rotational symmetry `<use>` elements) — cheap and on-brand.
- **Colour**: deep indigo/charcoal base, saffron & antique gold accents, muted vermilion for warnings; light "manuscript" theme with off-white paper and lamp-black ink. Both themes via CSS variables.
- **Iconography**: planet glyphs and nakshatra symbols as your own SVG set (avoid copying commercial glyph fonts); Devanagari abbreviations in charts as a toggle.
- **Motion budget**: `prefers-reduced-motion` respected; three.js scene lazy-loaded and paused off-screen so the Android WebView stays cool.

---

## 8. Risks & mitigations

| # | Risk | Mitigation |
|---|---|---|
| 1 | **AGPL contamination** if Swiss Ephemeris WASM is imported (whole app must be AGPL; hosting on GitHub Pages = distribution). | Default to the MIT lane (`astronomy-engine` + own math). Isolate any Swiss adapter behind `Ephemeris` interface and a build flag; if enabled, publish the repo under AGPL-3.0 and link the source from the app. Never use `@fusionstrings/swisseph-wasm` (dubious MIT claim). |
| 2 | Arc-second disagreements with JHora/Drik at **pada/tithi/sign boundaries** (ayanamsa variant, nutation, node type, ±1′ engine error). | Nutation-inclusive Lahiri as in §5.4 **plus the Drik-compatible mean preset** (Drik is measured +19…41″ from the SE-true value, +24.3″ from SE-mean); golden-test suite of ≥50 charts screenshotted from Drik/JHora, each tagged with the ayanamsa preset it was generated under; UI "near boundary (≤2′)" badge; settings for ayanamsa & node type; optional Swiss lane (`swetest`/JHora are the oracles for SE presets). |
| 3 | **Rahu/Ketu mean vs true** differ by up to ~1.7°, enough to change a sign. | Implement both (mean formula + osculating-node finite difference); default to true node (JHora/Drik convention — verify); label the choice on the chart. |
| 4 | **Historical time zones**: war-time IST +6:30 (1942-45), Bombay Time (+4:51) not in tzdb, Nepal/Sri Lanka changes, DST elsewhere. | Luxon/Intl for zone rules; show the computed UTC and offset on the confirm screen; manual offset override; store the resolved UTC instant in the profile. |
| 5 | `astronomy-engine` release cadence is slow (npm 2023-12-14, last commit 2025-01-27 — 2.7 yrs without a release). | It is numerically frozen and battle-tested; pin, vendor if needed; `astronomia` (MIT) as plan B; interface makes swapping cheap. |
| 6 | **Palm-line extraction** fails on shadows, dark skin under warm light, blurred shots, tattoos/henna. | Guided capture + auto-quality checks (sharpness Laplacian variance, exposure), CLAHE + illumination removal, multi-scale ridge filter, manual trace fallback (§5.13-9), confidence shown honestly. |
| 7 | OpenCV.js is 14.7 MB unpacked (~8 MB wasm) → slow first load, WebView memory. | Lazy-load on palm screen only, precache via service worker, or ship a custom OpenCV.js build with `imgproc` only (2–3 MB), or the pure-JS/WebGL ridge filter (no OpenCV at all). |
| 8 | MediaPipe model/wasm hosted on Google buckets — offline & CORS concerns; license of the model file not stated on the page. | Copy `hand_landmarker.task` (7.8 MB) and the `wasm/` dir into `/public`; **Apache-2.0 confirmed in the model card PDF (p. 2: "LICENSED UNDER Apache License, Version 2.0")**; keep attribution. Google's storage bucket does serve CORS headers, but self-host anyway for offline. |
| 9 | Cloud APK build: keystore handling, signature continuity, JDK/SDK versions on runners. | Generate a keystore once locally with `keytool`? — no Java locally, so generate it **in a one-off GitHub Actions job** and download it as an encrypted artifact; store base64 in repo secrets; build with `actions/setup-java@v6` (Temurin 21 — v1–v4 are deprecated; runner default is JDK 17, Capacitor 8 needs 21) + `actions/checkout@v7` + `./gradlew assembleRelease`; release via `softprops/action-gh-release`. Free tier: unlimited minutes for public repos; 2 000 min/month + 500 MB artifact storage for private repos on the Free plan. Same keystore forever or updates won't install. |
| 10 | Android WebView camera permissions / large photos. | Use `@capacitor/camera` (native picker, `resultType: Uri`) and downscale to 1600 px before CV; request `CAMERA` in the manifest. |
| 11 | Open-Meteo/Nominatim terms (Open-Meteo: non-commercial, <10 000/day, 5 000/h, 600/min, CC-BY 4.0; Nominatim: max 1 req/s, identifying User-Agent/Referer, no client-side autocomplete, attribution). Both send `access-control-allow-origin: *` (verified live). | Offline gazetteer first; online only on explicit "search online" tap; identify the app in `Referer`/`User-Agent`; cache results in Dexie. |
| 12 | Privacy/ethics: friends' birth data + palm photos = personal data; astrology "predictions" can distress. | Local-only storage, per-profile delete, encrypted export, calm phrasing, no health/death content, disclaimer on every screen (§5.14). |
| 13 | GitHub Pages sub-path + service worker scope + Capacitor `server.url` confusion. | Vite `base` from env; Capacitor bundles the built `dist/` (no remote URL) so the APK is fully offline. |

---

## 9. MVP in a weekend vs full vision

### MVP (2 days, web only, MIT lane)

1. **Scaffold**: Vite + React + TS, Tailwind or vanilla CSS variables, `vite-plugin-pwa`, GitHub Pages workflow.
2. **Profile form**: name, DOB, TOB, birthplace from bundled GeoNames (India + world ≥15k, `minisearch`), tz via `tz-lookup`, Luxon → UTC; save in Dexie.
3. **Engine v0**: `astronomy-engine` positions → Lahiri (§5.4) → 9 grahas sidereal (mean node) → Lagna (§5.5) → D1 + D9 → nakshatra/pada → Vimshottari MD/AD (§5.8) → birth Panchang (§5.9) → 10 yogas. (Shortcut: call `@ishubhamx/panchangam-js` for panchang/dasha and diff against your own numbers.)
4. **Charts**: North + South SVG components with theme toggle; Dasha ribbon.
5. **Palm v0**: photo upload → MediaPipe landmarks → hand-shape element + finger-ratio reading; landmarks drawn over the photo; disclaimer.
6. **Readings**: template sentences from rule hits with citations; "Tradition says…" voice.
7. **Validation**: 10 charts vs Drik/JHora screenshots checked by hand — record which ayanamsa preset each oracle uses (Drik ≈ mean Lahiri + 24.3″, see §5.4).

### Full vision

- Android APK via Capacitor 8 + GitHub Actions (camera, share sheet, local notifications for daily panchang / dasha changes).
- Complete engine: true node, all 16 vargas, Bhava Chalit, Shadbala, Ashtakavarga, Sudarshana, Arudha padas, Gochar (transits) with Sade-Sati, Muhurta finder, Adhika masa & festivals, 50+ yogas with cancellations.
- Ashtakoota + 10-porutham matching with dosha analysis and side-by-side charts; Manglik with cancellations.
- Palm v1: rectified ROI, ridge-filter line extraction, anatomical labelling, manual trace fallback, mounts, both hands (dominant = "what you make of it", non-dominant = "what you were born with" — modern convention; classical texts use right/male, left/female — offer both framings).
- Signature visuals: three.js birth-sky dome, animated chart reveals, shader backgrounds, print-quality PDF (`jspdf` MIT) export, encrypted profile sharing via QR/file.
- Localisation: English, Hindi, Tamil, Telugu (react-i18next MIT); Devanagari chart labels; Indian date/time formats.
- Optional AGPL "precision mode" via `@kuntay/swisseph` (with repo relicensed) and optional BYO-key LLM paraphraser through a Cloudflare Worker — both strictly opt-in.

---

## 10. Open questions (owner decisions / things to verify first)

1. **License lane**: is publishing the whole app under AGPL acceptable? If yes, Swiss WASM becomes the primary engine and the ayanamsa/node/lagna questions largely vanish. If no, stay MIT and rely on the validation suite.
2. **Node type default** (true vs mean) and **ayanamsa variant** (Lahiri vs Lahiri-ICRC vs True Chitra): confirm which JHora and Drik Panchang use by default and copy that.
3. **Sunrise convention** for panchang (upper limb + refraction vs disc centre): test against Drik for 5 cities; also whether tithi at *birth* should use the instant (yes) vs the day's sunrise value (calendar use).
4. **Dasha year length** 365.25 vs 360 days; **Bhava system** for house-based yogas (whole-sign vs Chalit).
5. **Palmistry conventions** to present: dominant/non-dominant vs male-right/female-left; which line set (heart, head, life, fate, sun, marriage lines); how much of the mounts tradition to include.
6. **Languages** for v1 and whether Devanagari or Latin abbreviations go on charts by default.
7. ~~Verify before coding~~ **Verified 2026-09-06 (see Verification log):** `astronomy-engine.Ecliptic()` is true-of-date (ECT) in 2.1.19 docs ✔; `@ishubhamx/panchangam-js` is CommonJS and has one `require("fs")` in `dist/kundli/exporter.js` — stub `fs` in Vite or avoid that subpath ✔; MediaPipe model is Apache-2.0 per model card ✔; Open-Meteo sends `access-control-allow-origin: *` ✔; `tz-lookup` is a single dependency-free CJS file ✔; Capacitor 8 = Java 21, runner default is 17 → `setup-java@v6` with `java-version: 21` ✔. **Still open:** JHora's exact Lahiri table (unverified) and the origin of Drik's +24.3″ mean-Lahiri offset; SE values for Raman/KP; Drik/JHora default node type.

---

## Verification log (2026-09-06)

Adversarial fact-check of this dossier. Method: npm registry JSON (`registry.npmjs.org`), downloaded tarballs, raw GitHub sources, vendor docs, live HTTP header checks (`curl`), a local Node 22 `Intl` test, and an independent Python recomputation of the ayanamsa numbers. Web search was unavailable for part of the session, so GitHub "pushed" dates were taken from repo/commit pages. **Verdict key:** ✔ confirmed · ✎ corrected (text above updated) · ✖ removed · ? unverifiable.

### Flagged claims

| # | Claim | Verdict | Evidence / source |
|---|---|---|---|
| 1 | `astronomy-engine` 2.1.19 `Ecliptic(GeoVector(body,t,true))` returns true-ecliptic-of-date (apparent) longitudes; ±1′ accuracy incl. Moon | ✔ confirmed (accuracy is a blanket ±1′ vs NOVAS, no separate Moon figure) | https://raw.githubusercontent.com/cosinekitty/astronomy/master/source/js/README.md — `Ecliptic`: "Converts a J2000 mean equator (EQJ) vector to a true ecliptic of date (ETC) vector"; `EclipticGeoMoon`/`SunPosition` documented as ECT. https://raw.githubusercontent.com/cosinekitty/astronomy/master/README.md — "accuracy always within 1 arcminute of results from NOVAS". npm: 2.1.19 published 2023-12-14, MIT. Last commit 2025-01-27 (https://github.com/cosinekitty/astronomy/commits/master). |
| 2 | Lahiri mean ayanamsa at J2000 = 23°51′25.4″ (from SE t0 = JD 2435553.5, 23°15′00.658″) + nutation reproduces Drik/JHora to a few arcseconds (24°13′19″ on 2026-01-01) | ✎ **corrected** — derivation and J2000 constant are right (recomputed 23.857054°; SE source constant is `23.250182778 − 0.004658035`, IAU-1976 precession, not `0.004660222`), and the 4 quoted "JHora" values are internally consistent with SE-true Lahiri (≤1″), **but Drik does not match**: Drik shows 23.863782° / 24.143189° / 24.213073° / 24.227035° for 2000/2020/2025/2026-01-01 = +38″/+41″/+24″/+19″ vs the nutation-inclusive formula, and a constant +24.3″ vs the mean formula (Drik uses a nutation-free Lahiri with J2000 base ≈ 23.86380°). JHora figures: ? unverifiable this session. | SE doc §2.8.5: https://www.astro.com/swisseph/swisseph.htm ; SE source: https://raw.githubusercontent.com/aloistr/swisseph/master/sweph.h (`ayanamsa[]` entries 1 and 46), https://raw.githubusercontent.com/aloistr/swisseph/master/swephexp.h (ids 1/3/5/27/43/44/46) ; Drik: https://www.drikpanchang.com/panchang/day-panchang.html?date=01/01/2026 (and `…=01/01/2000`, `01/01/2020`, `01/01/2025`) — "Lahiri Ayanamsha" field. |
| 3 | `@kuntay/swisseph` (AGPL-3.0, 0.2.2) and `@swisseph/browser` (AGPL-3.0, 1.3.1) run in browsers with Moshier built in and expose sidereal mode + houses; using either makes the app AGPL | ✔ confirmed, ✎ detail corrected — both **do** expose sidereal (`@kuntay`: `setSiderealMode`, `ayanamsa(jd)`, `SiderealMode.Lahiri=1`, `Flag.Sidereal=65536`, `houses_ex2` — undocumented in README; `@swisseph/browser`: `setSiderealMode`, `getAyanamsa`, `getAyanamsaExUt`, `calculateHouses` — documented in README "Sidereal Calculations"). The dossier's "sidereal helpers promised for 0.3.0" and "not documented — verify" were wrong/stale. Licenses: npm `license` fields `AGPL-3.0-or-later` / `AGPL-3.0`. Both repos are tiny (1 and 7 stars). | npm registry JSON for `@kuntay/swisseph` (0.2.2, 2026-07-31) and `@swisseph/browser` (1.3.1, 2026-07-21); tarball `dist/instance.d.ts`, `dist/generated/constants.d.ts`, `dist/swisseph-browser.d.ts`; https://raw.githubusercontent.com/kuntayerkus/swisseph-wasm/main/README.md ; https://raw.githubusercontent.com/swisseph-js/swisseph/main/README.md |
| 4 | Open-Meteo Geocoding callable from the browser (CORS), no key, 600/min · 10 000/day non-commercial | ✔ confirmed (live header check: `access-control-allow-origin: *`; terms: "<10'000 API calls per day, 5'000 per hour and 600 per minute"; docs: API key "only required for commercial use") | https://open-meteo.com/en/docs/geocoding-api ; https://open-meteo.com/en/terms ; `curl -H "Origin: https://example.github.io" https://geocoding-api.open-meteo.com/v1/search?name=Madurai` |
| 5 | MediaPipe `hand_landmarker.task` is Apache-2.0 and may be self-hosted | ✔ confirmed — model card PDF p. 2: "LICENSED UNDER Apache License, Version 2.0". File is 7 819 105 bytes. (The solutions web page only states Apache-2.0 for *code samples*; the model license is in the card.) | https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Hand%20Tracking%20(Lite_Full)%20with%20Fairness%20Oct%202021.pdf ; https://developers.google.com/edge/mediapipe/solutions/vision/hand_landmarker ; `curl -I` on the model URL |
| 6 | Free GitHub ubuntu runners include the Android SDK and can build a Capacitor 8 release APK with Temurin 21 | ✔ confirmed, ✎ details corrected — `ubuntu-latest` = Ubuntu 24.04 with JDK 8/11/**17 (default)**/21/25, Android SDK build-tools 34–37, platforms 34–37, cmdline-tools 12.0, Gradle 9.7.1; Capacitor 8 uses `JavaVersion.VERSION_21`, AGP 8.13.0, Gradle 8.14.3, compileSdk 36, minSdk 24, Node ≥22; `actions/setup-java@v4` is deprecated → use `@v6`. Actions are free for public repos; Free plan private repos get 2 000 min/month. | https://github.com/actions/runner-images/blob/main/images/ubuntu/Ubuntu2404-Readme.md ; https://github.com/actions/runner-images/blob/main/README.md ; https://raw.githubusercontent.com/ionic-team/capacitor/main/android/capacitor/build.gradle ; https://capacitorjs.com/docs/updating/8-0 ; https://capacitorjs.com/docs/getting-started/environment-setup ; https://raw.githubusercontent.com/actions/setup-java/main/README.md ; https://docs.github.com/en/billing/managing-billing-for-your-products/about-billing-for-github-actions |
| 7 | `@ishubhamx/panchangam-js` 3.0.0 bundles cleanly in Vite (no Node-only imports), uses Lahiri, matches JHora | ✎ **corrected** — deps are only `astronomy-engine` + `luxon` (✔) and README says isomorphic/React+Vite (✔), **but** the build is CommonJS and `dist/kundli/exporter.js` has `require("fs")` (needs a Vite stub or avoid that subpath). Ayanamsa is Lahiri by default (✔) — a *mean* formula, J2000 23°51′25.532″ + 5029.0966″/cy·T + 1.11161·T², **no nutation**. README claims 100 % over 200 days and 98.64 % over 643 797 cases vs Drik; **no JHora claim exists** (✖ removed). | npm registry JSON (3.0.0, 2026-07-05, MIT); tarball `dist/ephemeris/ayanamsa.js`, `dist/kundli/exporter.js`, `package.json`; https://raw.githubusercontent.com/ishubhamx/Hindu-Panchangam-Legal/main/README.md |
| 8 | `@photostructure/tz-lookup` 11.6.1 works in browser bundles; Luxon/`Intl` gives correct historical Indian offsets (+6:30 for 1943 Kolkata) | ✔ confirmed, ✎ history corrected — `tz.js` is a single 73 KB CJS file with no Node APIs (bundles fine; README warns ~10 % mismatch vs `geo-tz` even in inhabited areas). tzdb `Asia/Kolkata`: +6:30 in **two** spells (1941-10-01…1942-05-15 and 1942-09-01…1945-10-15), not one. Node 22 `Intl` (ICU 77, tz 2025b) returns GMT+06:30 for 1943-06-01, GMT+05:30 for 1942-07-01, GMT+05:21:10 for 1900. | npm registry JSON (11.6.1, 2026-08-08, CC0-1.0); tarball `tz.js`/`package.json`; https://raw.githubusercontent.com/photostructure/tz-lookup/main/README.md ; https://raw.githubusercontent.com/eggert/tz/main/asia (tzdb 2026c) ; local `node -e` `Intl.DateTimeFormat(…timeZoneName:'longOffset')` test |

### Whole-file scan

| Item | Verdict | Evidence |
|---|---|---|
| All npm versions in §2/§4 (`astronomy-engine` 2.1.19, `panchang-ts` 5.2.1, `@mediapipe/tasks-vision` 1.0.1, `@techstark/opencv-js` 5.0.0-release.1 / 4.12.0-release.1, `@capacitor/core` 8.5.1, `@capacitor/camera` 8.2.4, `@capacitor-community/sqlite` 8.1.1, `motion` 13.2.0, `gsap` 3.15.0, `dexie` 4.4.5, `vite-plugin-pwa` 1.3.0, `@bubblewrap/cli` 1.25.0, `three` 0.185.1, `vedic-astro` 0.1.1, `vedic-astrology-chart-solid` 1.2.3, `swisseph-wasm` 0.1.0 GPL-3.0-or-later, `sweph-wasm` 2.6.9 AGPL, `@fusionstrings/swisseph-wasm` 0.1.5 "MIT", `astronomia` 4.2.0, `luxon` 3.7.2, `minisearch` 7.2.0) and their licenses | ✔ all match the registry on 2026-09-06 | `https://registry.npmjs.org/<pkg>` |
| "5.0.0-release.1 is a pre-release build" (opencv-js) | ✎ corrected — OpenCV 5.0.0 stable shipped 2026-06-06; the npm tag tracks it. Pinning 4.12.0-release.1 is still reasonable for API stability | https://github.com/opencv/opencv/releases |
| Libraries unmaintained > 2 yrs | ⚠ `astronomy-engine`: no npm release since 2023-12-14 (2.7 yrs), last commit 2025-01-27 — flagged as frozen; everything else released within the last 14 months | registry `time` fields; GitHub commits page |
| Nonexistent package names | ✔ none — every package resolved on npm/PyPI | registry lookups |
| Shut-down / now-paid APIs | ✔ none found: Open-Meteo, Nominatim, VedAstro (5 calls/min free, no signup, $1/mo unlimited), GeoNames dumps, HYG, MediaPipe bucket all live | https://vedastro.github.io/ ; https://download.geonames.org/export/dump/readme.txt (CC BY 4.0, cities500 ≈ 185 000 rows, IANA `timezone` column) ; https://codeberg.org/astronexus/hyg (CC BY-SA 4.0, v4.4, 119 614 stars) |
| "No API key needed" claims (Open-Meteo, Nominatim, VedAstro) | ✔ confirmed | sources above; Nominatim policy https://operations.osmfoundation.org/policies/nominatim/ (max 1 req/s, identifying UA/Referer, no autocomplete, attribution) |
| "Works in browser / CORS" claims | ✔ Open-Meteo and Nominatim both return `access-control-allow-origin: *` (live); MediaPipe bucket exposes CORS headers | `curl -D -` header checks |
| Rate limits stated without source | ✎ sources now attached (Open-Meteo terms page; Nominatim policy; VedAstro docs page) | see rows above |
| AGPL / non-OSI licence flags | ✔ Swiss Ephemeris wrappers AGPL (and `swisseph-wasm`'s GPL label is inconsistent with upstream AGPL — dossier already says treat as AGPL); PyJHora AGPL (PyPI classifier wrongly says MIT — `license` field is the AGPL text); kerykeion AGPL; GSAP "Standard 'no charge' license" — free incl. commercial and all plugins, not OSI, Webflow-owned, forbids use in no-code animation builders; `ogl` is Unlicense (dossier said MIT — fixed); `@fusionstrings/swisseph-wasm` MIT claim still suspect (Swiss Ephemeris is AGPL/commercial; no evidence of a clean-room reimplementation) | npm `license` fields; https://gsap.com/standard-license/ ; https://pypi.org/pypi/PyJHora/json |
| Temporal "Chrome 144+/Firefox 139+, not Safari" | ✔ confirmed (Safari: preview only; iOS Safari: none) | https://raw.githubusercontent.com/mdn/browser-compat-data/main/javascript/builtins/Temporal.json |
| Hora Prakash reference (§6) | ✎ corrected — repo https://github.com/petergus/hora-prakash (AGPL-3.0, 0 stars, last `main` commit 2026-07-20); deps confirm `swisseph-wasm` ^0.0.5, `@photostructure/tz-lookup`, `geo-tz`, `vite-plugin-pwa`, but also `firebase` and `@anthropic-ai/sdk` (no longer backend-free). The dossier's "Pushed Aug-2026" was wrong. A `priyankgahtori/hora-prakash` repo does not exist (404) — only the Pages URL does. | https://raw.githubusercontent.com/petergus/hora-prakash/main/package.json ; https://github.com/petergus/hora-prakash/commits/main |
| `jyotisha` uses `pyswisseph==2.10.3.2` | ✔ confirmed | https://raw.githubusercontent.com/sanskrit-coders/jyotisha/master/requirements.txt |
| PyJHora "4.8.7 (Jun-2026)", "6 800 tests", "284 yogas" | ✔ version 4.8.7 on PyPI; README now says 284 yogas and ~7 678 tests (6 800 is the older figure) | https://pypi.org/pypi/PyJHora/json ; https://github.com/naturalstupid/PyJHora |
| Star counts / dates for other reference repos (VedAstro 630★ MIT, kerykeion AGPL, yeonsumia/palmistry 52★ Apache-2.0, koa137/vedic-astrology-chart-solid MIT, RoxyAPI template) | ✔ licenses confirmed via npm/GitHub pages; kerykeion and RoxyAPI not re-fetched (? dates) | GitHub repo pages |
| Drik Panchang "no API, ToS forbid scraping"; "JHora/Drik default = true node"; Raman "≈ 22°21′"; SE 2.10.03 in `@kuntay` | ? unverifiable this session (no search budget; Drik ToS not fetched). Raman value conflicts with `panchangam-js` (22°24′45″) — check `sweph.h` before use. `@kuntay` README does state SE 2.10.03. | — |
| GitHub API anonymous rate limit was hit mid-session | note | star/push data came from HTML repo pages instead |

**Net effect on the plan:** none of the eight flagged claims breaks the architecture. The two that change engineering work are (2) — add ayanamsa presets and pick the right oracle per preset, because Drik and SE-true Lahiri differ by 19–41″ — and (7) — stub `fs` for `panchangam-js` in Vite. The APK pipeline needs `setup-java@v6` with JDK 21 (runner default is 17).
