# Hand-off, what is built, what only you can do

Written 2026-10-06 at the end of the first build session. The code, tests, CI workflows and the
Android shell are in this repository and committed on `main` locally. **Nothing has been pushed
anywhere**, creating a public repo, a keystore and secrets needs your accounts and your decisions.

## 0000. Version 4.0.0 (2026-11-17): seven new features

You asked for the live site to be reviewed and for many more features, built without supervision. What was found on the live site and what was added is in the 4.0.0 entry of `CHANGELOG.md`. In short: Pick a good day, Festivals and fasts, Family today, the journal ("Your days"), share cards, Your year ahead, the printable Birth report, and the name sound. `release/Vyomaphala-4.0.0.apk` (versionCode 400) is signed with the same key as before, so it installs over the old one.

Decisions taken (all reversible):
- **Festival dates follow the engine**, each festival by its own rule. They match the published 2026 and 2027 dates that were checked, except Janmāṣṭamī 2027, where the engine gives 24 August (the lunar day covers midnight that night); many calendars print the 25th. Families keep some festivals a day apart; the screen says so.
- **Pick a good day** uses the same Moon-strength list as the rest of the app (4th, 8th, 12th set aside). The weights between its five factors are a judgement, documented in `src/engine/pickday.ts`.
- **The journal needs database schema 2.** Old data is kept. A backup made by 4.0 will not restore in a 3.x build.
- **Your year ahead reads twelve month forecasts**, so its overall word can differ from the Forecast "Year" tab, which reads the calendar year from the slow planets only.
- **The birth report shows full birth details**, because it is the document the owner hands over. Share cards never do.
- **The birth report prints Kuja doṣa lines** exactly as the engine reports them (including "cancelled").
- The old "Print or save as PDF" button on the Planets view now opens the birth report.

Not verified: anything on a real phone (share sheet, story gestures, animation speed); printing in Firefox or Safari; a paper print.

How the work was split is in `docs/AGENT-BRIEF-V4.md`: one brief, one feature folder per feature, the lead wires entry points.

## 000. Version 3.1.0 (2026-11-16): the picture bands

You said 3.0 was still not good and asked to be impressed. 3.1.0 keeps the 3.0 page and adds a full-width, animated picture at the top of every tab, each drawn from the real numbers (see the last section of `docs/DESIGN-V3.md` and the 3.1.0 entry in `CHANGELOG.md`). `release/Vyomaphala-3.1.0.apk` (versionCode 310, same key). Not checked on a real phone: how smooth the animations are on a slow phone, the status bar over the picture, camera and haptics. Decisions you may want to reverse: Partner match keeps its own words (Excellent / Strong / Good / Needs work); the Almanac's Moon shrinks on the Slots, Hours and Month tabs; star pages no longer name the ringed brightest star, because it is not always the traditional one.

## 00. Version 3.0.0 (2026-11-16): the second redesign

You asked for a complete redesign again, cleaner. 3.0.0 changes the look ("ivory and ink": warm paper, serif headings, no outlines, one warm accent) and roughly halves what is on each screen. The rules are in `docs/DESIGN-V3.md`; the way around the app from 2.0 is unchanged. `release/Vyomaphala-3.0.0.apk` is signed with the same key, so it installs over 2.0.0 and keeps saved people (Gradle: `'-PversionCode=300' '-PversionName=3.0.0'`). Still not checked on a real phone: the camera, haptics, the status bar colour, the sticky Save bar with the keyboard open. Decisions you may want to reverse: planet symbols and the sky wheel are now one ink colour (the nine planet colours are gone); the Explore hub no longer shows "In the sky right now"; sunrise and sunset on the Almanac are in the heading, not a tappable row.

## 0. Version 2.0.0 (2026-11-16): the redesign, and what is left for you

The whole app was redesigned in one unattended session; what changed is in CHANGELOG.md and the design is in docs/DESIGN-V2.md. Everything is committed on `main` locally. **Nothing was pushed**, so the live site still shows 1.3.0 until you push.

- **To publish the website:** `git push origin main` (GitHub Pages deploys it; phones that have the app open update themselves).
- **The Android app:** `release/Vyomaphala-2.0.0.apk` is signed with the same key as 1.3.0, so it installs over it and keeps everyone's saved people. In PowerShell the Gradle arguments must be quoted: `& .gradlew.bat --no-daemon ':app:assembleRelease' '-PversionCode=200' '-PversionName=2.0.0'`.
- **Checked:** 775 unit tests, 26 browser tests (phone and desktop profiles, dark and light), lint, types, licences, bundle size. Not checked on a real phone: the camera, haptics, the status bar colour in the light theme, and the feel of the sticky Save bar with the on-screen keyboard.

Decisions taken without you (all reversible):

| Decision | Why |
|---|---|
| Five tabs (Today, Chart, Forecast, Match, Explore); People and Settings behind the person chip | Six overlapping tabs and a hidden person switch were the main sources of confusion. |
| Home is "Today" for the chosen person; the feature list is gone | The first screen should answer "how is my day", not list what the app can do. |
| Add a person is four steps with a Save button; hold-to-save is gone (hold stays for deleting) | Holding a seal was not discoverable. All the old checks are kept. |
| The intro's Skip and last slide go straight in; its "How to use" slide is removed | The welcome screen and the Guide do that job. The name's meaning moved to the last slide. |
| Theme: Auto follows the phone; "Day" is a real light theme | Auto used to follow the Sun at the birthplace, which nobody could predict, and Day was still dark. |
| "Where you are now" (Settings, Today, Almanac, Forecast) | Hours and sunrise were for the birthplace, wrong for anyone who has moved. Default is still the birthplace. |
| Chart figure labelled Su, Mo, Ma… by default | Devanagari abbreviations could not be read by many of the family; Devanagari is a choice under Settings, Advanced. |
| One scale of words: Strong, Good, Mixed, Go gently | Bright/Steady/Mixed/Quiet on one screen and Strong/Good/Mixed/Go gently on another read as contradictions. |
| "Partner match" is the one name (was also Partner Compatibility) | One thing, one name. |
| The planet facts still list each planet's gem | It is existing lore text; say if you want it removed. |

Known gaps: the Hindi/Tamil/Telugu interface is still not built; a draft of the add-person form is kept only until the tab is closed; the brass-era classes that remain in src/styles/kit.css style a few inner pieces (ledgers, sheets) and can be folded into ui.css later.

## 1. The web build, live

The code is on https://github.com/RahulTarigoppula/Simple-Astro (`main`). GitHub Pages deploys every push to `main` through
`.github/workflows/pages.yml` to **https://rahultarigoppula.github.io/Simple-Astro/**. On the phone: open it in Chrome → menu → *Install app*.
It works offline after the first load; Drawer → **Prepare for offline** also caches the palm model and the sky.

`.github/workflows/ci.yml` runs Biome, the scanners, all unit tests and the Playwright suite on every push;
a red CI run does not block the Pages deploy.

## 2. The Android APK (once, for the life of the app)

**Done on 2026-10-19 on this PC:** the release key lives at `C:/Work/vyomaphala-keystore/release.p12` (alias `release`, passphrase in `passphrase.txt` beside it, base64 in `release.p12.base64.txt`). Back those three files up in two places. A JDK 21 (`C:/Work/tools/jdk/jdk21`) and the Android SDK (`C:/Work/tools/sdk`) are installed for local builds; `android/local.properties` points at the SDK. The first signed APK (1.3.0) is in `release/`. To let GitHub build the next ones, set the four secrets below from those files (`gh auth login` first).

In **Git Bash, outside the repo** (`/c/Work` is not a git working tree):

```bash
cd /c/Work
openssl req -x509 -newkey rsa:4096 -sha256 -days 10950 -nodes -keyout jyoti.key.pem -out jyoti.cert.pem -subj "/CN=Vyomaphala/O=Vyomaphala/C=IN"
openssl pkcs12 -export -inkey jyoti.key.pem -in jyoti.cert.pem -name release -out jyoti-release.p12
base64 -w0 jyoti-release.p12 > jyoti-release.p12.b64
rm jyoti.key.pem jyoti.cert.pem
```

```powershell
# GitHub → Simple-Astro → Settings → Secrets and variables → Actions, or with the gh CLI:
gh secret set ANDROID_KEYSTORE_BASE64 --body (Get-Content "C:\Work\jyoti-release.p12.b64" -Raw).Trim()
gh secret set ANDROID_KEYSTORE_PASSWORD     # the passphrase you typed
gh secret set ANDROID_KEY_ALIAS --body release
gh secret set ANDROID_KEY_PASSWORD          # the same passphrase
git tag v0.2.0; git push origin v0.2.0      # → signed APK + SHA256SUMS on the Release
```

Back up `jyoti-release.p12` and its passphrase in two places before anything else, a lost key means
the phone refuses updates. A `workflow_dispatch` run without secrets still produces an *unsigned*
APK artifact for a smoke test; a tag without secrets fails on purpose.

## 3. Things to run once on your own machine

- **The phone checklist** (docs/IMPLEMENTATION-PROMPT.md §10.7) needs a real device: camera, haptics,
  edge-to-edge, predictive back, dome frame rate, install-over-update.
- **Drik Panchang comparison** (V-1, V-4): read 30 days of Bengaluru/Delhi/Chennai panchang names by
  hand into `src/engine/__fixtures__/panchang-drik.json`, scraping is deliberately not done.
- **Your own palm photos** go in `fixtures-private/` (git-ignored) for the ≥ 70 % confidence check.

## 4. Decisions taken while you were away (all reversible)

| Decision | Why |
|---|---|
| §0.1a planet longitudes replaced by Swiss Ephemeris values for Mars, Mercury, Venus, Jupiter | The doc's numbers were computed without precession (≈ 5′ off). The engine now agrees with Swiss Ephemeris (Moshier) within 20″ on 50 golden charts; Lagna within 0.3″. |
| Default node is the **true** node (as specified) | So the reference chart's Rāhu is Viśākhā 4 (true) rather than Anurādhā 1 (the doc's mean node). The Drawer switches it. |
| Ashtakoota has a Drawer **school** setting: **North Indian (common)** by default, or **PyJHora · saravali**; neither school's three PyJHora bugs are reproduced | The schools differ in Varṇa of earth/air signs, the Vaśya 5×5 (North table re-typed from onlinejyotish.com + ganeshmitra.co.in) and Yoni Aśva × Mṛga. The PyJHora school is oracle-checked: raw 6 436 / 11 664; with the inverted Tārā, the Karka × Kumbha Bhakūṭa cell and the pada-based Dhanu/Makara Vaśya split modelled, 11 664 / 11 664. Revatī × Rohiṇī scores **19** in both schools (PyJHora also 19), not the doc's 20. |
| Sounds are synthesised with Web Audio (no Howler, no samples) | Zero bytes, nothing to license, no freesound account needed. |
| Gazetteer uses a custom compact index (no MiniSearch) | MiniSearch held ~120 MB of heap, too much for a 4 GB phone. Now 12.6 MB, ≤ 9 ms per search. |
| `shadcn/ui` not used; dialogs are native `<dialog>` | Focus trap, Esc and `aria-modal` come free, and no CLI/network step. |
| `INTERNET` stays in the Android manifest | It is an install-time *normal* permission needed for the opt-in place search; the only runtime permission is CAMERA. |
| CSP adds a `sha256-…` for the tiny theme boot script and `data:` in `font-src` | Otherwise the no-flash theme bootstrap is blocked. |
| Vitest 5 instead of 3 | Vitest 3 does not support Vite 8. |
| Palm confidence adds a ridge-clarity factor; sharpness gauge uses half the Laplacian | Without them a blurred print scored ~0.95 and a 9×9-blurred checkerboard read as sharp. Calibrate both on real photos in `fixtures-private/`. |
| MediaPipe's `*_module_internal` wasm is not copied | The non-module loader never uses it; it saved 12 MB of APK. |
| The Rooftop dome is always night cloth | It shows the sidereal zodiac and the stars at the birth moment even for a daytime birth, a star map, not a weather report. |

## 5. Known gaps (next session)

- Device-only checks: GPU delegate, `getUserMedia` inside the WebView, haptics, predictive back, dome frame rate.
- The Hindi/Tamil/Telugu UI is not built (the Drawer shows them as "on the way").
- The porutham tables follow one Tamil school from memory, worth a read by someone who practises it.
- MediaPipe tries to post telemetry to `odml.pa.googleapis.com`; the CSP blocks it (console noise only).
