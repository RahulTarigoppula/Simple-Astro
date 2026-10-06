# Chowki (Jyoti) — Build Plan

Written 2026-09-08. Follows `../_shared/DECISIONS.md` §D9 (day 1 = live; engine first, UI second; the preview is the spec; a Weekend MVP path exists; no paid anything). Effort is in **evenings (≈ 2.5 h)** and **weekend days (≈ 6 h)** for one developer. Every task is ≤ half a day and carries an acceptance criterion in *italics*.

Legend: `[ ]` todo · **DoD** = definition of done for the phase · ⚠ = risk.

The through-line of this project is that **the engine is the product**. Phase 2 is deliberately the longest phase, and its first three blocks ship no pixels at all — an arcsecond-honest chart with a wrong Lagna is worthless no matter how beautifully the ink draws.

---

## Phase 0 — Setup: live on day 1 (1 weekend day)

Dependencies: none. Scaffolding only; no feature code, no engine code.

- [ ] Run README Quickstart steps 1–8 in `02-jyoti-astrology-palmistry/` (Vite `react-ts`, all deps, Biome, Vitest, Playwright, shadcn Dialog/RadioGroup/Switch/Tabs). *`npm run dev` serves the Vite page; `npx biome check .` and `npx vitest run` pass with one placeholder test.*
- [ ] `vite.config.ts`: `base: process.env.VITE_BASE_PATH ?? "/"`, `@tailwindcss/vite`, `VitePWA` per ARCHITECTURE §7, and the `fs`/`path`/`crypto` empty-shim aliases that let `@ishubhamx/panchangam-js` and `@techstark/opencv-js` bundle. *`npm run build` succeeds with no "externalized for browser compatibility" warnings; a scratch file that imports `panchangam-js` builds clean.*
- [ ] `src/app/router.tsx` with `createHashRouter` and the twelve routes of DESIGN §9 (eleven sections, but §9.4 carries both `#/leaf/new` and `#/leaf/:id/edit`) rendering placeholder text. *`npm run build && npx vite preview --base /jyoti/` serves `#/patri/demo` and survives a reload without a 404.*
- [ ] Paste DESIGN §15 verbatim into `src/styles/tokens.css`; add the Tailwind `@theme inline` bridge in `src/index.css`; add `src/motion/springs.ts` exporting `PAPER`, `BRASS`, `THREAD`, `INK`; import the three Fontsource families in `main.tsx`. *A scratch page shows Yatra One, Tiro Devanagari Hindi and Martian Mono, with Devanagari conjuncts rendering correctly ("जन्म पत्री · शनि"); total font transfer under 400 kB before subsetting.*
- [ ] Theme bootstrap: an inline script in `index.html` reads the stored theme (and, later, the sun altitude) and sets `data-theme` before first paint. *Switching the OS theme with "auto" flips night desk / morning terrace with no flash on reload.*
- [ ] Copy `../_shared/templates/pages.yml` → `.github/workflows/pages.yml`; `git init`, `gh repo create jyoti --public`, push; Settings → Pages → Source "GitHub Actions". *`https://<owner>.github.io/jyoti/` shows the placeholder desk with fonts loaded, and Chrome on the phone offers "Install app".*
- [ ] `npx cap init Chowki com.rahul.jyoti --web-dir dist && npx cap add android`; commit `android/`; add the `.gitattributes` LF rules; merge `../_shared/templates/app-build.gradle.snippet` into `android/app/build.gradle` with namespace/applicationId `com.rahul.jyoti`. *`git diff` on `build.gradle` shows only the version/signing block changed.*
- [ ] Run `bash ../_shared/scripts/make-keystore.sh jyoti` outside the repo; store the `.p12` and passphrase in the password manager **and** a second offline copy; `gh secret set` the four secrets. *`gh secret list` shows `ANDROID_KEYSTORE_BASE64`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`, `ANDROID_KEY_PASSWORD`.*
- [ ] Copy `../_shared/templates/android-release.yml` → `.github/workflows/android-release.yml`; `git tag v0.0.1 && git push origin v0.0.1`. *Release `v0.0.1` carries `jyoti-0.0.1.apk` + `SHA256SUMS.txt`; the APK installs on the phone and opens the placeholder desk.*
- [ ] Adaptive icon + splash from DESIGN §14/§16 (brass diya with a vermilion flame on teak `#1A110B`, monochrome diya silhouette layer) → `npx pwa-assets-generator`. *Home-screen icon and splash are teak/brass on the phone; the maskable icon survives the circle mask preview.*
- [ ] `capacitor.config.ts` from ARCHITECTURE §8; `src/platform/index.ts` with `isNative()`; register the service worker only on web. *`chrome://inspect` on the installed APK shows no service worker.*

**DoD:** placeholder desk live on Pages and installed from a signed Release APK; CI green; tokens, fonts and springs loaded; keystore backed up twice.
⚠ Gradle/AGP mismatch on the first CI run — pin exactly what `npx cap add android` generated; never "fix" it by upgrading. ⚠ Forgetting `VITE_BASE_PATH` gives a blank page on Pages. ⚠ Losing the keystore is unrecoverable: back it up before writing another line.

---

## Phase 1 — Design system + skeleton screens (4 evenings + 1 weekend day)

Dependencies: Phase 0. Output is the visual contract plus static screens driven by fixture data. **No engine work here** — the fixtures are hand-written JSON matching the `Patri` type.

- [ ] Re-read `design/preview.html` — it **exists** (five screens with a live embedded ephemeris) and is the committed visual baseline; extend it rather than rewriting it whenever DESIGN §9 moves. *Side by side with DESIGN §9's ASCII layouts every element is present; the DevTools contrast picker shows ≥ 4.5:1 on every text run; paper occupies ≥ 85 % of each screen; the JD, Lagna, Moon and Guna strings it renders equal ARCHITECTURE §5's reference table.*
- [ ] Materials pass: paper + baked `public/grain.svg`, turmeric band with the kumkum tick, brass cylinder/conic gradients, indigo block-print cloth, lac seal, the single-lamp shadow tokens, the loupe's canvas magnifier. *A `/#/_kit` dev route shows each material at phone and desktop widths; no `backdrop-filter`, no blur, no mesh gradient, no bitmap texture appears anywhere in the CSS.*
- [ ] `components/ui`: `Drawer` and `FootnoteSheet` (shadcn Dialog restyled), `LedgerRow`, `TurmericBand`, `EngravedStrip`, `Button` (text-with-underline / stamp / danger), `RadioRow`, `ToggleRow`, `Toast` (lac note). *Every variant and state renders in `/#/_kit`; keyboard focus rings are visible on paper, brass and teak.*
- [ ] `Ledge` + `DeskObject` + `Shell`: five objects at ≥ 56 px with engraved labels, active object raised 4 px, safe-area inset, and the desktop vertical variant at ≥ 900 px. *Tab and arrow keys traverse the Ledge; the active object is announced by name; nothing sits under the Android gesture pill.*
- [ ] `BrassDrum` with BRASS inertia, detents, refusal tick, `role="spinbutton"`, arrow keys and a tap-to-type fallback. *Flicking a year drum coasts and clicks into a detent; 31 February is refused with a dull tick; a screen reader announces each settled value once (debounced 300 ms).*
- [ ] `KundliNorth` / `KundliSouth` from the geometry constants in ARCHITECTURE §5.12, with `ink-draw` (frame → diagonals → inner diamond, +60 ms stagger, 3 % nib wobble) and the `tilak-dab` on the Lagna. *Twelve regions receive the right sign numbers for a Meena-Lagna fixture; the flip to the South grid puts Meṣa at (0,1) and Meena top-left; the whole draw finishes in ≤ 1.5 s.*
- [ ] `digit-set` numeral component (tabular cells, `--ink-faint → --ink` over 120 ms, 24 ms stagger) used by the ledger, drums and loupe readout. *Changing 23°51′12″ to 23°46′48″ animates only the changed digits with no layout shift.*
- [ ] Static screens from `src/data/fixtures.ts`: Chowki home, Today's leaf, Leaf bundle, Writing the leaf, Janam Patri, Guna Milan, Hast desk, Drawer, `#/lost`. *Playwright screenshots (phone 390 × 844, desktop 1280 × 800; night + day; reduced-motion) are committed as the baseline and match `design/preview.html` on visual review.*

**DoD:** every screen exists with fixture data and matches the preview; screenshot baselines committed; no hex value lives outside `tokens.css`.
⚠ The concept's known failure mode is *wood-textured skeuomorph*: if a screenshot reads as "tavern" rather than "manuscript", cut wood until paper is ≥ 85 %. ⚠ Devanagari line-height — set 1.6 on body runs before laying out the ledger, or every row will need re-tuning later.

---

## Phase 2 — The engine, then the core features (3 weekends + 8 evenings)

Dependencies: Phase 1 components, Phase 0 CI. Blocks 2a–2d are pure TypeScript with Vitest and **no UI**; only then does the ink get real numbers.

### 2a Time, ayanamsa, ephemeris, nodes, lagna — 3 evenings
- [ ] `engine/time.ts` (ARCHITECTURE §5.1) with the five historical fixtures. *1943-06-01 Calcutta resolves to +06:30, 1942-07-01 to +05:30, 1900 Madras to +05:21:10, 1985 Kathmandu to +05:30, and the Bombay override to +04:51; `jdUt` for the running example is 2449425.579861.*
- [ ] `engine/ayanamsa.ts` with all three presets (§5.2). *At `T = −0.05802654` the three presets give 23°46′48.5″ / 23°46′33.6″ / 23°46′57.9″; `se-true − se-mean === Δψ` to 0.01″ and `drik-mean − se-mean === 24.29″ ± 0.05″` on ten dates from 1900 to 2030.*
- [ ] `engine/ephemeris.ts` behind the `Ephemeris` interface, plus `speed`, retrograde, combustion orbs and the dignity tables (§5.3). *Sun and Moon longitudes agree with `@ishubhamx/panchangam-js` to within its documented mean-Lahiri offset; Mercury is flagged retrograde on 2026-01-15 and combust when within 14°.*
- [ ] `engine/nodes.ts` — mean (Meeus 47.7) and true osculating (§5.4). *The two agree to within 1.8° across 100 random dates and cross exactly at the node's stationary points; both are always retrograde.*
- [ ] `engine/lagna.ts` (§5.5). *The running example gives RAMC 277.8081°, ε 23.438851°, ASC tropical 9.4371°, ASC sidereal 345.6570° = Meena 15°39′25″, MC Dhanu 13°23′27″; a second fixture at 60° N (Oslo) does not blow up on `tan φ`.*
- [ ] `engine/patri.ts` assembling all of the above into a `Patri`, with the dev-only invariant assertions from ARCHITECTURE §12. *A cast of the running example returns 9 grahas, Lagna, D1, D9 and a `computeMs` under 60 ms in Node.*

### 2b Nakshatra, vargas, dasha, panchang — 3 evenings
- [ ] `engine/nakshatra.ts` with pada, lord and the 2′ boundary flag including the cross-preset "the Drik preset would read X" (§5.6). *λ = 329.4811° gives Pūrva Bhādrapadā pada 3 lord Jupiter with no asterisk (31′08″ from the cusp); the synthetic λ = 213.3300° flags the Viśākhā/Anurādhā edge at 0′12″ and names both sides.*
- [ ] `engine/vargas.ts`, all nine (§5.7). *The running example's Sun produces the nine-row varga table verbatim; the D9 closed form agrees with the movable/fixed/dual derivation at all 4,320 five-arcminute samples.*
- [ ] `engine/dasha.ts` — Vimshottari MD/AD, with PD generated on demand (§5.8). *The reference Moon at 349.1688° gives Budha balance 13.809790 yr ending 2008-01-04 ≈ 08:02 IST, antardaśā Ketu 1993-06-01 → 1994-05-29; every level's children sum exactly to their parent; the 360-day setting shifts the MD end by the expected 1.5 %.*
- [ ] `engine/panchang.ts` — five aṅgas with end instants, both sunrise conventions, Rāhu/Yamaganda/Gulika/Abhijit (§5.9). *Tithi, vāra, nakshatra, yoga and karaṇa names match hand-recorded drikpanchang.com values for Bengaluru on ten consecutive days under the `drik-mean` preset; every end time is within 60 s; a full panchang computes in under 5 ms.*
- [ ] Golden-chart harness: `__fixtures__/golden/*.json`, 50 charts spanning 1900–2030 and five continents, each tagged with the preset and oracle it came from. *`npx vitest run golden` compares graha and Lagna longitudes to within 1′ of the recorded `swetest`/JHora values under `se-true`; failures print the arcsecond delta per body.*

### 2c Yogas, matching and the 11,664-pair oracle — 2 evenings
- [ ] `engine/yogas.ts` with the starter ten as `YogaRule` predicates, each carrying its BPHS citation and `because` evidence (§5.10). *Each rule has a positive and a negative fixture; Gaja-Kesari downgrades to `partial` when Jupiter is debilitated; the cancellation pass rewrites Kemadruma when any of its four cancellations fires.*
- [ ] `engine/ashtakoota.ts` — all eight kootas plus Manglik with cancellations (§5.11). *Revatī × Rohiṇī scores 1 / 2 / 1.5 / 2 / 0.5 / 6 / 7 / 0 = 20 "acceptable", Nāḍī the only doṣa; every koota returns its `because` string.*
- [ ] `scripts/import-oracle.mjs` → `__fixtures__/ashtakoota-oracle.bin`; `ashtakoota.oracle.test.ts`. *All **11,664** nakshatra-pada pairs match the oracle (GOAL success criterion 5); a deliberately corrupted Vaśya cell makes the test fail with the offending pair printed.*
- [ ] `engine/reading.ts` with the template table, seeded ordering and the banned-word test (§5.15). *The same chart produces byte-identical sentences across 100 runs; the banned-word test fails the build when "cancer", "death", "pregnan", "wealth" or "lawsuit" is added to a template.*

### 2d Data layer and gazetteer — 2 evenings
- [ ] `scripts/build-gazetteer.mjs`: GeoNames `cities500` + `IN`/`NP`/`LK`/`PK`/`BD` full → `src/data/geonames-in.json.gz` with the CC BY credit baked into `attribution.json`. *The file is ≤ 1.8 MB gz; "Madurai", "Vaitheeswaran Koil" and "Bengaluru" all resolve with lat/lon/timezone.*
- [ ] `data/db.ts` (schema v1) + `data/repo.ts`: `upsertProfile`, `castPatri` (cache-aware), `savePalm`, `burnProfile`, `saveSettings`, `putPlace`. *Vitest with `fake-indexeddb` covers every function; `burnProfile` removes rows from all six tables in one transaction and leaves no blob behind.*
- [ ] `data/places.ts`: minisearch over the bundle, then the Open-Meteo → Nominatim ladder with the 1.1 s token bucket and the 90-day cache (ARCHITECTURE §9). *Typing never issues a request; only the "search online ⌑" tap does; two rapid Nominatim calls are spaced ≥ 1.1 s apart; a cached place is served with the network offline.*
- [ ] `data/crypto.ts` seal/unseal (§5.16). *Export → wipe → import restores every table; a wrong passphrase raises the lac note, not a stack trace.*

### 2e Writing the leaf + the Janam Patri — 1 weekend day
- [ ] Wire `#/leaf/new`: drums → `resolveBirthMoment` → live `EngravedStrip` (`ASIA/KOLKATA · +05:30 · JD …`), `PlaceSearch`, the Bombay override drum, hold-to-seal → `castPatri` → navigate. *Sealing the running example writes a profile and a `patris` row and lands on the Patri with the ink drawing; the strip's zone, offset and JD match the engine exactly.*
- [ ] `#/patri/:id`: rollers bound to scroll progress, birth line, birth panchang rows, `KundliNorth` with real placements, `GrahaLedger` (tabular, ′ ″ in `--ink-muted`, boundary asterisks), `VargaPager` (D9 first), `DashaRibbon` with the brass "now" clip, `YogaParagraph` with citation superscripts, `Colophon` with preset/engine/disclaimer. *Every ledger row's degree matches the golden fixture to the arcsecond; tapping a citation opens the footnote sheet; the colophon names the ayanamsa preset, node type and dasha year length used.*
- [ ] Loupe: rises under the finger, magnifies the house, reads `MA 11°31′24″ · ŚATABHIṢĀ 2 · LORD RĀHU`, snaps planet to planet on drag, and has a keyboard mode. *Touch, mouse and Tab+Enter all reach every graha; the readout uses `digit-set`; the near-boundary badge appears in vermilion only when `boundary !== null`.*
- [ ] Leaf bundle `#/circle` with `useLiveQuery`, thread-untie fan, swipe-left to Export / Burn (600 ms hold). *Three profiles fan on drag; Burn removes the leaf and its prints and cannot be undone after the char completes.*

### 2f Today's leaf and the Guna mala — 1 weekend day
- [ ] `#/today`: brass dial (tithi hand, nakshatra ring, shaded Rāhu Kāl arc), ruled aṅga rows with end times, sunrise/sunset, Moon pager. *All five rows and their end times match the panchang fixtures; swiping the Moon pages days and ages the phase; the whole screen works in airplane mode.*
- [ ] `#/milan/:a/:b`: scroll pair, mauli thread, the 36-bead mala with `bead-slide` (90 ms per bead, tap to skip), doṣa lac beads, the lac band stamp, per-koota notes. *The mala for Revatī × Rohiṇī lands on 20 with seven brass Bhakūṭa beads and eight lac Nāḍī beads, and finishes in ≤ 3.5 s; tapping a koota row shows its rule and both nakshatras in Devanagari and Latin.*
- [ ] `--moon-k` wired from `Panchang.moonIllumination` so the tithi fill-light is real. *At Pūrṇimā the indigo cloth cools measurably and the vignette lifts; text tokens are untouched; shadow direction never changes.*

### 2g Palm v0 — 1 weekend day
- [ ] `#/hast/:id/capture`: `getUserMedia` / file input on web, `@capacitor/camera` on Android, chalk hand outline, sharpness (Laplacian variance) and exposure gauges, shutter enabled only when a hand is detected. *The shutter stays disabled on a blank frame and on the back of a hand; the gauges turn haldi in dim light.*
- [ ] MediaPipe `HandLandmarker` in `IMAGE` mode from self-hosted wasm + model; landmarks drawn over the photo; the geometry-only reading (element, W/L, F/L, 2D:4D, thumb angle) with citations. *A photo goes from shutter to element + ratios in under 3 s on the owner's phone (GOAL success criterion 4); handedness below 0.8 is rejected with a plain note; it works with the network off.*
- [ ] Store the capture and reading in Dexie; `#/hast/:id` shows the print, landmarks and "Tradition says…" reading with the standing disclaimer; **Burn** removes the print and its blob. *Reopening the app shows the same reading; Burn leaves no blob in `db.blobs`.*

**DoD:** the whole MVP feature set of GOAL §7 works on web with real numbers; engine line coverage ≥ 95 % with the golden, oracle and boundary suites green; a cast of the running example completes in < 100 ms and matches `swetest` to 1′.
⚠ The ayanamsa preset trap: every golden fixture must record **which preset and which oracle** produced it, or the suite becomes unfalsifiable. ⚠ `panchangam-js`'s mean Lahiri sits ~24″ from `se-true` — compare classifications, not raw longitudes. ⚠ Palm landmark work on desktop webcams flatters the pipeline; test on the phone from the start.

---

## Phase 3 — Polish, motion and sound (5 evenings)

Dependencies: Phase 2. Nothing here changes a data shape or an engine result.

- [ ] Motion audit against DESIGN §7: all fourteen named animations at their specified durations, easings and staggers; four material springs applied to the right objects; nothing animates a filter or a shadow blur. *A `motion-audit.md` checklist with a tick per animation, plus a reduced-motion Playwright snapshot showing steady flame, static rollers and instant digits.*
- [ ] `unroll` + `seal-thunk`: roller thickness bound to `useScroll`, overscroll reveal of the lac seal, 600 ms hold to recompute with the current presets. *A 120-year dasha ribbon makes a visibly longer scroll; holding the seal after a preset change clears the haldi "recompute" tab.*
- [ ] `drum-spin` + `sky-scrub`: BRASS inertia with detents capped at 4/frame, and the parapet strip recomputing sun, Moon and Lagna at 30 fps as the hour drum turns, with `selectionChanged` on every sign crossing. *A Chrome trace on the phone shows ≤ 8 ms scripting per frame during a fast flick; the Lagna label changes exactly at the boundary.*
- [ ] `lamp-flicker`, tithi fill-light, automatic night/day by real sun altitude with the diya as a manual override. *At 18:40 local the desk turns itself; tapping the diya pins the theme until it is tapped again; flicker stops under reduced motion and under "Calm desk".*
- [ ] Sound sprite: source the twelve CC0 clips (freesound CC0 filter + Kenney), build `public/sounds/chowki.{webm,mp3}` ≤ 300 kB with `ATTRIBUTION.md`, wire Howler with master 0.5, unlock on the first gesture, respect silent mode. *Every DESIGN §12 event fires its clip; the brass tick is rate-limited to one per 40 ms; muting in the Drawer silences everything immediately.*
- [ ] Haptics map through `platform/haptics.ts` with a `navigator.vibrate` fallback; never on scroll. *A manual on-device pass covers seal, tilak, detents, sign crossings, beads, burn.*
- [ ] Accessibility sweep: chart ledger twins, live regions for drums, `lang="hi"`/`lang="sa"` spans on Devanagari runs, 200 % zoom, colour-independent doṣa and boundary indicators. *`@axe-core/playwright` reports zero serious or critical issues on all twelve routes; TalkBack reads a graha row as "Sun, Kumbha, 29 degrees 28 minutes, Purva Bhadrapada pada 3".*
- [ ] Performance pass: `size-limit` gate at 350 kB gz, `pyftsubset` fonts to ≤ 260 kB, route-level dynamic imports verified by an import-graph test, `content-visibility: auto` on ledger rows. *Lighthouse mobile Performance ≥ 90 and installable; OpenCV, MediaPipe and three appear in no entry chunk.*

**DoD:** the app is indistinguishable from `design/preview.html` in motion and at rest; sound, haptics and reduced-motion paths complete; every budget in ARCHITECTURE §11 met.
⚠ Web Audio on the Android WebView needs a genuine touch gesture — unlock on both `touchstart` and `pointerdown`. ⚠ The flicker driving `drop-shadow` offsets is the easiest way to lose 60 fps; keep it to one CSS variable updated at 80 ms, never a per-element animation.

---

## Phase 4 — Android packaging (3 evenings)

Dependencies: Phase 0 CI and Phase 2 features. Every check is on a real phone from a Release APK (`workflow_dispatch` builds for quick loops).

- [ ] Camera path end to end: `@capacitor/camera` with `resultType: Uri`, downscale to 1600 px before any CV, permission denial degrading to gallery-only. *A palm photographed on the phone produces landmarks and a reading; denying the camera permission still allows a gallery pick with a plain note.*
- [ ] OpenCV + MediaPipe inside the WebView: lazy chunks, worker instantiation, explicit `Mat.delete()` in `finally`. *Ten consecutive line extractions do not grow memory in `chrome://inspect`; no OOM kill on a 4 GB device.*
- [ ] Edge-to-edge and system bars: overlays, per-theme status-bar style, `env(safe-area-inset-*)`, the Ledge above the gesture pill, predictive back mapped to "return to Chowki". *No content sits under the status bar or the nav pill; the back gesture reverses `object-open` rather than exiting the app.*
- [ ] Rooftop dome on device: `frameloop="demand"`, DPR ≤ 1.5, pause on `visibilitychange`, painted-sky fallback on `webglcontextlost`. *The dome holds 30 fps while dragging; backgrounding and returning does not leak a context; killing the context swaps to the painted sky with no error.*
- [ ] Export/import on Android: `Filesystem.writeFile` to Cache + `Share.share`; import through `<input type="file">`. *The wax envelope lands in Drive through the share sheet and re-imports on a second device.*
- [ ] Splash and icon check with `launchAutoHide: false` and a 240 ms fade into the desk. *Cold start shows teak → diya → desk with no white flash.*
- [ ] Release hygiene: `versionName` from the tag, `versionCode` from the run number, `SHA256SUMS.txt`, install-over-previous test. *`v0.2.0` installs over `v0.1.0` without uninstalling and every profile survives.*
- [ ] Re-verify `docs/TESTING.md` §12 (the manual Android checklist — install, camera permission, gallery, edge-to-edge, back gesture, share, import, dome, offline cold start) against the release APK and record the results in `docs/VERIFICATION-LOG.md`. *Every numbered step has a pass/fail and a device/OS line.*

**DoD:** signed APK from a tag installs and updates on the owner's phone; camera, haptics, edge-to-edge, back and the dome all verified on device; the Android checklist passes.
⚠ WebGPU is absent from the Android System WebView, so nothing may assume it. ⚠ `_capacitor_file_` URLs behave differently from `blob:` — test the palm print rendering on device, not only in Chrome. ⚠ OEM battery managers can suspend the WebView mid-capture; document, do not fight.

---

## Phase 5 — Testing and launch (2 evenings + 1 weekend day)

Dependencies: Phases 2–4.

- [ ] Execute the `docs/TESTING.md` suites (they are written): the engine test map, the golden-chart matrix (which oracle, which preset, which 50 charts), the Playwright flow and screenshot matrix, the Android checklist, and the accessibility checklist. *Every item has been run and has a command or step-by-step plus a recorded result.*
- [ ] Golden validation to the GOAL bar: 50 charts against `swetest`/JHora under `se-true` within 1′, and 30 consecutive days of panchang names against drikpanchang.com for Bengaluru, Delhi and Chennai under `drik-mean` at 100 %. *Both suites green; every disagreement resolved and recorded in the fixture's notes, not silenced.*
- [ ] Playwright e2e: write a leaf → seal → cast → read; preset change → recompute; palm capture (stubbed image) → trace fallback → reading; milan to 36 beads; export → wipe → import; the `#/lost` route. *`npx playwright test` green in CI, running before the Pages deploy.*
- [ ] **The zero-leakage test**: a Playwright run that records every network request through a full session and asserts the list is empty except for one deliberate place search. *GOAL success criterion 6 passes; the test fails if any font, model or analytics request appears.*
- [ ] Privacy and data drills: 20 profiles with two palm prints each; measure the bundle-screen query, the export size and the import time; verify Burn leaves nothing behind. *List query < 20 ms; export < 25 MB; import < 8 s; a post-Burn IndexedDB dump contains no trace of the profile.*
- [ ] Time drills: the five historical fixtures on device, a chart cast while the phone is set to a different time zone, and a leap-day birth. *The resolved offset depends only on the birthplace and date, never on the phone's clock zone.*
- [ ] README: replace "Planned" with the live URL and the Release link; add screenshots (home night, Patri drawn, mala, palm); verify the Attribution table against `npx license-checker --summary`. *Every dependency licence is OSI/OFL/CC0; no AGPL appears anywhere in the tree.*
- [ ] Tag `v1.0.0`; install on the phone; cast the charts of five people in the circle and read one out loud to each of them; log friction in `docs/JOURNAL.md`. *Five real charts cast without a crash; at least three friction notes triaged into Phase 6.*

**DoD:** CI runs Biome + Vitest + Playwright before every deploy; `docs/TESTING.md` complete; `v1.0.0` on Releases and live on Pages; the arcsecond and zero-leakage criteria demonstrably met.
⚠ Playwright screenshot drift across OS font rendering — run screenshot tests only on the Linux CI runner and compare there. ⚠ Reading someone's chart aloud is the real usability test; expect the phrasing, not the maths, to be what needs work.

---

## Phase 6 — Stretch (v1 🚀 then Someday 🔮; pick by `docs/JOURNAL.md` friction)

Each item is independent unless noted.

- [ ] Palm v1 — the full pipeline of ARCHITECTURE §5.13: rectification, CLAHE + black-hat, the multi-scale Hessian ridge filter, Zhang-Suen, anatomical labelling with confidence, the stylus trace fallback, both hands. *On 20 evenly lit photos from the circle, ≥ 70 % get three lines at confidence ≥ 0.6; the rest fall to trace mode automatically and read in < 1 s after the third path is committed (GOAL success criterion 4).*
- [ ] Rooftop sky in full: BSC5 dome, brass zodiac ring with 27 ticks, planet billboards, Lagna beam, ±12 h scrub ring, and the 1080 × 1920 poster export. *The poster renders identically on web and Android and carries the name in Yatra One and the engraved birth line.*
- [ ] Engine v1: Bhāva Chalit table, ~40 yogas with cancellations, Manglik with all six cancellations, pratyantar folds, and the remaining vargas (D4, D16, D20, D24, D27, D40, D45). *Each new yoga ships with a positive and a negative fixture and a citation.*
- [ ] The 10-porutham thread (South-Indian matching) as a second, shorter thread under the mala. *All ten booleans match the PyJHora oracle for 500 sampled pairs.*
- [ ] Guna Milan refinements: Bhakūṭa and Nāḍī cancellations as an explicit toggle with the classical exception printed. *Turning cancellations on changes the score and says exactly which rule fired.*
- [ ] Devanagari digits, chart-script toggle and the `hi` locale (react-i18next). *Every string is in the catalogue; switching to Hindi leaves no English fragment on the Patri.*
- [ ] 🔮 Swiss Ephemeris "precision mode" behind the `Ephemeris` interface — **requires relicensing the repo to AGPL-3.0** and linking the source from the app. *A one-page decision note in `docs/` precedes any code; the golden suite is re-run under the Swiss lane and the deltas recorded.*
- [ ] 🔮 Gochar (transits) with a Sade-Sati ribbon; a Muhurta finder; Adhika māsa, festivals and samvatsara. *Festival rules cribbed from `jyotisha` (MIT) with dates checked against a printed panchāṅga.*
- [ ] 🔮 Daily-panchang and dasha-change local notifications on Android (`@capacitor/local-notifications`, `on:` schedule with exact-alarm onboarding). *A dasha change fires with the app closed and re-arms after a reboot.*
- [ ] 🔮 Shadbala, Ashtakavarga, Sudarshana, Arudha padas and special lagnas. *Each validated against PyJHora as an oracle, never copied from it.*
- [ ] 🔮 Tamil and Telugu UI with `Tiro Tamil` / `Tiro Telugu` bodies; print-quality PDF Patri; QR/file profile sharing; an opt-in BYO-key LLM paraphraser labelled "AI-generated paraphrase of the rule hits above". *The paraphraser never replaces a rule hit and is off by default.*

---

## Effort summary and dependencies

| Phase | Effort | Depends on |
|---|---|---|
| 0 Setup | 1 weekend day | — |
| 1 Design system + skeleton | 4 evenings + 1 weekend day | 0 |
| 2 Engine + core features | 3 weekends + 8 evenings | 1 (components), 0 (CI) |
| 3 Polish, motion, sound | 5 evenings | 2 |
| 4 Android packaging | 3 evenings | 0, 2 |
| 5 Testing and launch | 2 evenings + 1 weekend day | 2, 3, 4 |
| 6 Stretch | open-ended, 1–4 evenings per item | 5 |

Total to `v1.0.0`: about **9 weekend days + 22 evenings** (≈ 110 h). That is more than the portfolio's other apps, and the extra is all in Phase 2 — which is correct, because an astrology app that is merely pretty is the thing this project exists not to be.

---

## Weekend MVP fast path (ship Sunday night, cast a chart on Monday)

The minimal ordered list. Everything not named here waits.

**Saturday**

1. Phase 0 entirely — scaffold, tokens, fonts, springs, Pages live, `cap add android`, keystore, secrets, `v0.0.1` APK.
2. `engine/time.ts`, `ayanamsa.ts` (all three presets), `ephemeris.ts`, `nodes.ts` (mean only — true node can wait), `lagna.ts`, with the running-example fixture and the five historical time fixtures.
3. `engine/nakshatra.ts`, `vargas.ts` (D1 and D9 only), `dasha.ts` (MD + AD), `panchang.ts` (five aṅgas with end times, upper-limb sunrise), `patri.ts`.
4. `scripts/build-gazetteer.mjs` and `data/db.ts` + `repo.ts` with `upsertProfile`, `castPatri`, `saveSettings`.

**Sunday**

5. `#/leaf/new`: five brass drums (inertia optional — detents are enough), place search over the bundle, the engraved zone/offset/JD strip, hold-to-seal.
6. `#/patri/:id`: `KundliNorth` with `ink-draw` and the Lagna tilak, `GrahaLedger` with ′ ″ and boundary asterisks, `DashaRibbon` (MD/AD, no folds), the ten starter yogas as a cited paragraph, and the colophon with preset, node type and disclaimer.
7. `#/circle` leaf bundle and `#/today` panchang rows — both are `useLiveQuery` over work that already exists.
8. Palm v0: file input → MediaPipe landmarks → element and finger ratios → landmarks drawn over the photo → "Tradition says…" with the disclaimer. **No OpenCV, no lines** — that is Phase 6.
9. Ledge, the night desk, the diya, paper grain. Skip the parapet strip, the dome, sound, the mala and the loupe.
10. Tag `v0.1.0` → install the APK → cast your own chart and one grandparent's 1940s chart before bed.

Deferred from the MVP without guilt: the Guna mala, the loupe, the parapet strip, the Rooftop dome, palm line extraction, the stylus, sound, haptics, the morning terrace, Devanagari digits, encrypted export, the true node, and every varga past D9.
