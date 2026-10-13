# Jyoti / Vyom — Testing Strategy & Test Plan

Written 2026-09-08. Binding inputs: `_shared/DECISIONS.md` (D1 tooling — Vitest + Testing Library + Playwright; D5 licence/data rules; D7 token contract; D9.2 "engine first, UI second"), `docs/RESEARCH.md` (§5 algorithms, §5.4 ayanamsa, §8 risks, §10 open questions, Verification log), `docs/DESIGN.md` (tokens §15, motion §7, screens §9, sound/haptics §12, a11y §13, Android §14, assets §16), `GOAL.md` §5 (the eight measurable success criteria — every budget below traces to one). `docs/ARCHITECTURE.md` and `docs/PLAN.md` are being written in parallel; where a module name here disagrees with ARCHITECTURE.md, ARCHITECTURE.md wins and this file is corrected in the same PR.

Vyom has **no server, no key, no account and (by design) almost no network** (GOAL §9). The test surface is therefore lopsided and this plan is shaped to match it:

| Where the risk actually lives | Weight |
|---|---|
| `src/engine/**` — sidereal astronomy, ayanamsa presets, historical time zones, vargas, dasha, panchang, yogas, Ashtakoota | **Heaviest.** Pure functions of `(jdUT, lat, lon)`; validated against external oracles with golden fixtures (§2.1). A wrong arcsecond is invisible in the UI and fatal to the product's whole claim. |
| `src/palm/**` — MediaPipe landmarks, geometry, OpenCV line extraction | High, but *honesty* is the contract, not accuracy: a low-confidence result that says so is a pass; a confident wrong one is a bug. |
| UI physics (drums, rollers, loupe, mala, stylus) | Medium; mostly visual + device checks. |
| Privacy (birth data + palm photos are personal/biometric) | Non-negotiable: §10 fails the build, not a review comment. |
| Android camera, insets, predictive back, WebView WebGL | Cannot run in CI → manual device checklist (§12). |

---

## 1. Strategy at a glance

| Layer | Tool | What it proves | Where | Gate |
|---|---|---|---|---|
| Unit (engine) | **Vitest 3**, project `engine` (`environment: node`, `TZ=America/Denver` on purpose — see §1.2) | `src/engine/**` matches golden data to the stated tolerance; every boundary, every preset, every historic offset | `src/engine/**/*.test.ts` | Every PR. Coverage ≥ 95 % lines on `src/engine`, **100 %** on `time.ts`, `ayanamsa.ts`, `nakshatra.ts`, `vargas.ts`, `vimshottari.ts`, `ashtakoota.ts` |
| Unit (oracle diff) | Vitest project `oracle`, `test:oracle` script | Our numbers vs `@ishubhamx/panchangam-js` (MIT, **devDependency only** — §2.3) and the committed swetest/PyJHora fixtures | `src/engine/__oracle__/*.test.ts` | Every PR (fixture diff); the live cross-check runs nightly |
| Unit (palm geometry) | Vitest, `environment: node` | Hand-shape element, finger ratios, thumb angle, line scoring, Zhang-Suen thinning, Laplacian/exposure gauges | `src/palm/**/*.test.ts` | Every PR |
| Component | **@testing-library/react** + `user-event` (jsdom) | GrahaLedger, BrassDrum (`role="spinbutton"`), DashaRibbon, BeadRow, LedgerRow, FootnoteSheet, Drawer, StylusEditor announce and behave | `src/features/**/__tests__/*.test.tsx` | Every PR |
| E2E | **Playwright 1.5x** — projects `desktop-chromium` (1280×800), `pixel-7` (device profile, DPR 2.625) | Real IndexedDB, real hash routes, real pointer physics, real service worker, real MediaPipe WASM | `e2e/*.spec.ts` | Every PR in `ci.yml` (separate from `pages.yml` so a flaky gesture never blocks a deploy) |
| Visual | Playwright `toHaveScreenshot` + computed-style assertions against `tokens.css` + **material-share assertions** (§7.3) | The app matches `design/preview.html` (D9.3) on the seven baseline screens, night and day | `e2e/visual/*.spec.ts`, baselines in `e2e/visual/__screenshots__/` (committed, Linux-only) | Every PR; intentional diffs get updated baselines in the same PR |
| Performance | Playwright traces + CDP + Lighthouse CI (`@lhci/cli`) + `size-limit` | Budgets in §8, all traceable to GOAL §5 | `e2e/perf/*.spec.ts`, `lighthouserc.json` | Weekly + before every tag |
| Accessibility | `@axe-core/playwright` + explicit checks in §9 | DESIGN §13 is enforced, not aspirational | `e2e/a11y.spec.ts` | axe every PR; manual (TalkBack/NVDA) before every tag |
| Privacy | Playwright request allow-list + repo scanners | GOAL §5.6 "Zero leakage"; no biometric fixture ever reaches the public repo | `e2e/privacy.spec.ts`, `scripts/check-no-biometrics.mjs` | **Every PR — blocking** |
| Device | Manual checklist on the owner's phone with a `workflow_dispatch` APK | Camera, permissions, insets, predictive back, rotation, WebGL, haptics | §12 | Before every `v*` tag |

**Scripts** (`package.json`):

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

### 1.1 Determinism rules

- **Nothing in `src/engine` reads the clock.** Every entry point takes an explicit `jdUT` (or a `{ localDateTime, zone }` pair) and an `EngineSettings` object (`{ ayanamsa, nodeType, dashaYearDays, sunriseConvention, bhavaSystem }`). A lint rule (`biome` `noRestrictedGlobals` for `Date.now`, plus a unit test that greps `src/engine` for `new Date()` with no argument) enforces it.
- **Every assertion states its tolerance and its oracle.** Longitudes: `expect(lon).toBeCloseToArcsec(expected, 60)` for the ±1′ engine claim, `…, 2)` for pure-math functions (ayanamsa, vargas, dasha arithmetic) where only float error is allowed. A custom matcher `toBeCloseToArcsec(expected, arcsecTolerance)` lives in `src/test/matchers.ts` and prints the difference in `d°m′s″` so failures are readable.
- **Presets are never implicit.** Every golden fixture row carries `{ ayanamsa: "SE-true" | "SE-mean" | "drik-mean", nodeType: "true" | "mean", dashaYearDays: 365.25 | 360, sunrise: "upper-limb" | "centre" }`. A test that omits them fails to compile (the fixture type has no defaults). This is the single biggest source of "it disagrees with the website" confusion and RESEARCH §5.4 is the reason.
- Playwright freezes time with `await page.clock.install({ time: new Date("2026-09-08T20:10:00+05:30") })` before navigation, so the Today leaf, the parapet sky, the diya's auto night/day and the tithi fill-light are byte-stable across runs.
- `Math.random` is never used. Nib wobble, grain jitter and the 1/f lamp flicker take a `mulberry32` seed; in tests the seed is `0xC0FFEE` and in the app it is `hash(profileId + presetHash)` so the same leaf always reads and draws the same (GOAL §5, RESEARCH §5.14).

### 1.2 The hostile-timezone rule

The engine must be independent of the machine's zone, and IST is a bad canary (its offset is the one the code is most likely to hard-code). So:

- `vitest.config.ts` runs the `engine` project with `env: { TZ: "America/Denver" }` — a half-hour-free, DST-having, wrong-hemisphere zone. Any accidental `new Date(y, m, d)` or `getHours()` blows up immediately.
- A second CI shard re-runs the same project with `TZ=Asia/Kolkata` and `TZ=UTC`. All three must produce identical output; `engine/determinism.test.ts` asserts a hash of the reference chart's JSON is the same in all three (the shard passes the expected hash as an env var).
- **tzdb guard.** `time.tzdb.test.ts` asserts the runtime's IANA data actually knows the Indian history (RESEARCH §5.2). If it does not, the test fails with `Runtime tzdb is too old: Asia/Kolkata 1943-06-01 resolved to +05:30, expected +06:30. Node ICU version <x>. Update Node or install full-icu.` This guards against a CI runner image with a stale ICU, which would silently corrupt every pre-1955 chart.

---

## 2. Test layout and fixtures

```
src/engine/
  time.ts            / time.test.ts, time.tzdb.test.ts   # zone resolution, UTC instant, JD_UT/JD_TT, offset override
  ayanamsa.ts        / ayanamsa.test.ts                  # 3 Lahiri presets + nutation, §2.1 A-fixtures
  ephemeris.ts       / ephemeris.test.ts                 # Ephemeris interface over astronomy-engine (MIT lane)
  nodes.ts           / nodes.test.ts                     # mean node (Meeus 47.7) + osculating true node
  lagna.ts           / lagna.test.ts                     # RAMC, obliquity, ASC/MC, sidereal ASC
  rashi.ts           / rashi.test.ts                     # whole-sign houses, Bhava Chalit (Sripati)
  vargas.ts          / vargas.test.ts                    # D1 D2 D3 D7 D9 D10 D12 D30 D60
  nakshatra.ts       / nakshatra.test.ts                 # index, pada, lord, gana/yoni/nadi/varna lookups
  vimshottari.ts     / vimshottari.test.ts               # balance, MD/AD/PD tree, 365.25 vs 360
  panchang.ts        / panchang.test.ts                  # tithi, vara, nakshatra, yoga, karana + end-time solver
  sunrise.ts         / sunrise.test.ts                   # upper-limb+refraction vs disc-centre, Rahu Kaal, Abhijit
  yogas.ts           / yogas.test.ts                     # rule predicates + citations
  ashtakoota.ts      / ashtakoota.test.ts                # 8 kootas, 36 points, doshas
  porutham.ts        / porutham.test.ts                  # 10-porutham booleans
  boundary.ts        / boundary.test.ts                  # "near boundary (≤ 2′)" badge + cross-preset warning
  __oracle__/        panchangam-js.test.ts, swetest-fixtures.test.ts, pyjhora-ashtakoota.test.ts
src/palm/
  landmarks.ts       / landmarks.test.ts                 # MediaPipe adapter, handedness/palm-up validation
  geometry.ts        / geometry.test.ts                  # L/W/F ratios, element, 2D:4D, thumb angle, spacing
  quality.ts         / quality.test.ts                   # Laplacian variance, luma histogram, gauge thresholds
  rectify.ts         / rectify.test.ts                   # homography from 4 landmarks → 512×512 ROI
  lines.ts           / lines.test.ts                     # black-hat/ridge → thin → components → anatomical labels
  thinning.ts        / thinning.test.ts                  # Zhang-Suen
  reading.ts         / reading.test.ts                   # findings → "Tradition says…" sentences + citations
src/features/db/
  db.ts, repo.ts / repo.test.ts                          # Dexie 4 schema, profiles, palm Blobs (fake-indexeddb)
  migrations.test.ts                                     # v1 → v2 upgrade
  crypto.ts / crypto.test.ts                             # AES-GCM export/import, passphrase KDF
src/test/
  fixtures/                                              # §2.1
  matchers.ts                                            # toBeCloseToArcsec, toBeWithinBand, toMatchDegreeString
  setup.ts                                               # jsdom polyfills, fake-indexeddb/auto, MediaPipe stub
fixtures-private/                                        # GIT-IGNORED real palm photos (§2.4) — never committed
e2e/
  fixtures/seed.ts                                       # seeds Dexie through the app's own import path
  leaf.spec.ts patri.spec.ts loupe.spec.ts today.spec.ts circle.spec.ts
  hast.spec.ts milan.spec.ts drawer.spec.ts sky.spec.ts offline.spec.ts
  privacy.spec.ts a11y.spec.ts visual/*.spec.ts perf/*.spec.ts
```

### 2.1 Golden fixtures (`src/test/fixtures/`)

Everything below was derived on 2026-09-08 from the formulas in RESEARCH §5 (arithmetic re-done by hand for this document). Where a value can only come from an external oracle it is marked `<oracle>` and §11 says how to fill it on day 1. **If a test disagrees with a golden, suspect the code first, then the golden — and record the correction here.**

**`ayanamsa.json` — the three presets (RESEARCH §5.4).** Tolerance ±1″ for SE-true/SE-mean (self-consistency of the polynomial), ±0.5″ for the Drik preset once V-2 confirms the constant.

| Instant (0 h UT) | JD_UT | `SE-true` (mean + Δψ) | `SE-mean` (no nutation) | `drik-mean` = SE-mean + 24.3″ | Drik's published value |
|---|---|---|---|---|---|
| 2000-01-01 | 2451544.5 | 23°51′11.3″ (23.853139°) | 23°51′25.3″ (23.857035°) | 23°51′49.6″ (23.863785°) | **23.863782°** |
| 2020-01-01 | 2458849.5 | 24°07′54.6″ (24.131833°) | 24°08′11.3″ (24.136472°)* | 24°08′35.6″ (24.143222°) | **24.143189°** |
| 2025-01-01 | 2460676.5 | 24°12′23.0″ (24.206389°) | 24°12′22.8″ (24.206333°)* | 24°12′47.1″ (24.213083°) | **24.213073°** |
| 2026-01-01 | 2461041.5 | 24°13′18.4″ (24.221778°) | 24°13′13.0″ (24.220278°)* | 24°13′37.3″ (24.227028°) | **24.227035°** |

\* the `SE-mean` column is `SE-true − Δψ(t)`; the day-1 job (V-1) is to print all three columns from the implementation and confirm the last column lands within 0.5″ of Drik's published figure on **all four dates plus six more, at least two of them pre-1956** (RESEARCH §5.4: "the +24.3″ offset is an empirical fit to four samples").

Derived assertions in `ayanamsa.test.ts`:
- **AY-1** J2000 mean base = `23.857054°` ± 0.1″ when evaluated at JD 2451545.0 (12 h TT), and `23.857035°` at 0 h UT the same day — the half-day difference is 0.069″ at 50.3″/yr. If these two agree exactly, the code is ignoring the time argument.
- **AY-2** Rate: `ayanamsa(SE-mean, J2000 + 36525) − ayanamsa(SE-mean, J2000)` = 5028.80″ ± 0.5″ per century (IAU-2006 `pA` leading term).
- **AY-3** Nutation term is bounded: `|SE-true − SE-mean| ≤ 17.3″` for 200 sampled dates 1900–2030, and its sign flips at least 8 times (an 18.6-year period must be visible; a constant offset means Δψ was implemented as a constant).
- **AY-4** `drik-mean − SE-mean` is a **constant** 24.3″ ± 0.05″ across all 200 sampled dates (this is what makes it a *preset*, not a fudge).
- **AY-5** The three presets never differ by more than 41″, and the boundary module (§3.9) therefore warns whenever a body is within 41″ of a nakshatra/pada/rashi edge — not just 2′.

**`timezones.json` — the historical offset matrix (RESEARCH §5.2, GOAL §5.3).** Asserted as **UTC instants**, never as `.offset` in minutes: `Asia/Kolkata` in 1900 is +05:21:10, which is `321.1666…` minutes and will not survive an integer round-trip. `time.test.ts` explicitly asserts `dt.toUTC().toMillis()` and, separately, that the *displayed* offset string from `Intl.DateTimeFormat(…, { timeZoneName: "longOffset" })` is `GMT+05:21:10`.

| # | Local input | Zone | Expected offset | Expected UTC instant | Why it is here |
|---|---|---|---|---|---|
| TZ-1 | 1994-03-14 07:25 | `Asia/Kolkata` | +05:30 | 1994-03-14T01:55:00Z (**JD_UT 2449425.57986**) | the house reference chart (§2.2) |
| TZ-2 | 1943-06-01 06:00 | `Asia/Kolkata` | **+06:30** | 1943-05-31T23:30:00Z (JD_UT 2430876.47917) | war time, spell 2 — GOAL §5.3 |
| TZ-3 | 1942-01-15 12:00 | `Asia/Kolkata` | +06:30 | 1942-01-15T05:30:00Z | war time, spell 1 |
| TZ-4 | 1942-07-01 12:00 | `Asia/Kolkata` | **+05:30** | 1942-07-01T06:30:00Z | the *gap between* the two spells — the case a single-interval implementation gets wrong |
| TZ-5 | 1941-09-30 23:00 | `Asia/Kolkata` | +05:30 | 1941-09-30T17:30:00Z | one day before spell 1 opens |
| TZ-6 | 1945-10-16 00:30 | `Asia/Kolkata` | +05:30 | 1945-10-15T19:00:00Z | one day after spell 2 closes |
| TZ-7 | 1900-07-15 10:00 | `Asia/Kolkata` (Madras MMT) | **+05:21:10** | 1900-07-15T04:38:50Z | sub-minute offset — GOAL §5.3 |
| TZ-8 | 1950-02-10 05:00 | `Asia/Kolkata` **+ override +04:51** | +04:51 (manual) | 1950-02-10T00:09:00Z | Bombay Time; tzdb does **not** model it, so the override drum is the only path (RESEARCH §8 risk 4) |
| TZ-9 | 1980-06-01 09:00 | `Asia/Kathmandu` | +05:30 | 1980-06-01T03:30:00Z | Nepal *before* the 1986 change |
| TZ-10 | 1990-06-01 09:00 | `Asia/Kathmandu` | +05:45 | 1990-06-01T03:15:00Z | Nepal after |
| TZ-11 | 1996-08-01 09:00 | `Asia/Colombo` | +06:30 | 1996-08-01T02:30:00Z | Sri Lanka's 1996 double change |
| TZ-12 | 2006-06-01 09:00 | `Asia/Colombo` | +05:30 | 2006-06-01T03:30:00Z | after the 2006-04-15 revert |
| TZ-13 | 1965-03-01 09:00 | `Asia/Karachi` | +05:00 | 1965-03-01T04:00:00Z | pre-1971 Pakistan |
| TZ-14 | 1968-11-20 21:40 | `America/New_York` | −05:00 | 1968-11-21T02:40:00Z | a non-Indian, DST-adjacent chart (the "5 continents" claim, GOAL §5.2) |
| TZ-15 | 2020-06-21 12:00 | `Australia/Eucla` | +08:45 | 2020-06-21T03:15:00Z | 45-minute zone, southern hemisphere, for the Lagna sign test |

> **JD correction (2026-09-08, applied).** DESIGN §9.4 and §9.5 used to engrave the Julian Day of **07:10** IST for *14 Mar 1994 · 07:25 IST · Bengaluru* — a 15-minute error, i.e. ≈ 3¾° of Lagna. The correct Julian Day is **2449425.579861** (01:55 UT; `2449425.5 + 115/1440`). The binding display format is `ASIA/KOLKATA · +05:30 · JD 2449425.5799` — four decimals ≈ 8.6 s, **rounded, not truncated** (`jd.toFixed(4)`, which is why it is `…5799` and not `…5798`). E2E-2 below asserts exactly that string. DESIGN §9.4/§9.5 and `design/preview.html` now both render it; nothing is outstanding.

**`reference-chart.json` — the house chart.** Inputs are frozen forever; expected values come from the oracles on day 1.

```jsonc
{
  "id": "ref-1994",
  "name": "Reference",
  "local": "1994-03-14T07:25:00",
  "place": { "name": "Bengaluru, KA, IN", "lat": 12.9716, "lon": 77.5946, "zone": "Asia/Kolkata" },
  "jdUT": 2449425.579861,
  "settings": { "ayanamsa": "SE-true", "nodeType": "true", "dashaYearDays": 365.25,
                "sunriseConvention": "upper-limb", "bhavaSystem": "whole-sign" },
  "expect": {
    "ayanamsa": "<oracle: swetest -p -b14.3.1994 -ut1:55 -sid1>",
    "grahas": { "Su": "<oracle>", "Mo": "<oracle>", "Ma": "<oracle>", "Me": "<oracle>",
                "Ju": "<oracle>", "Ve": "<oracle>", "Sa": "<oracle>", "Ra": "<oracle>", "Ke": "<oracle>" },
    "lagna": "<oracle: swetest -house77.5946,12.9716,W>",
    "d1": "<derived>", "d9": "<derived>",
    "moonNakshatra": "<derived>", "vimshottari": "<derived>",
    "panchang": "<oracle: drikpanchang screenshot, drik-mean preset>",
    "yogas": "<oracle: PyJHora yoga list, names only>"
  }
}
```

The `<oracle>` slots are filled on day 1 from `swetest`, but they are **not the only cross-check**: IMPLEMENTATION-PROMPT §0.1a already carries an independently recomputed table for this exact leaf (Meeus ch.25 Sun, ch.47 Moon, ch.22 nutation, ch.12 sidereal time, ΔT in TT), and `design/preview.html`'s embedded engine reproduces it. If `swetest` disagrees with §0.1a by more than 1′ on any body, stop and find out why before committing the fixture.

Assertions: every graha and the Lagna within **60″** of the swetest column (GOAL §5.2 "within 1′"); D1/D9 sign assignments exact; nakshatra + pada exact; the Vimshottari MD/AD boundaries within **1 day** of PyJHora's; the panchang **names** (tithi, vara, nakshatra, yoga, karana) exact under the `drik-mean` preset.

**`golden-charts.json` — the ≥ 50-chart suite (GOAL §5.2).** Generated once, committed as *numbers only*:

- 50 charts, stratified: 10 per decade band (1900–29, 1930–59, 1960–89, 1990–2019, 2020–30); latitudes from −45° to +60° including two above the Arctic-adjacent band (Reykjavík, for the ASC/MC formula's `tan φ` blow-up) and two within 1° of the equator; longitudes across 5 continents; 6 of them deliberately inside the war-time spells; 4 with a graha within 2′ of a nakshatra boundary (found by search, so the boundary badge has real cases).
- Each row: inputs + `{ preset, grahas[9], lagna, mc, ayanamsa }` from `swetest`.
- **Licence rule (D5.1, RESEARCH §8 risk 1).** The oracle is AGPL (`swetest`/Swiss Ephemeris, PyJHora). Run it **outside the repo**, in `C:\Work\_oracles\` — a throwaway folder that is never a git working tree — and commit only the resulting JSON. Numbers are facts, not code. `pyswisseph`, `@kuntay/swisseph`, `@swisseph/browser` and `PyJHora` must never appear in the app repo's `package.json`/`requirements.txt`, not even as devDependencies; `scripts/check-licences.mjs` fails the build if they do.

**`panchang-drik.json` — 30 consecutive days × 3 cities (GOAL §5.2).** Bengaluru, New Delhi, Chennai; 2026-09-01 … 2026-09-30; each day records `{ tithi, vara, nakshatra, yoga, karana, sunrise, sunset, rahuKaal }` **read by hand from drikpanchang.com day-panchang pages** (GOAL §6: no scraping; RESEARCH §3 records the site's ToS forbid it) and stored with `"oracle": "drikpanchang", "readOn": "2026-09-…"`. The test asserts 100 % name agreement under the `drik-mean` preset, and records — without failing — the end-time deltas in seconds so the sunrise-convention question (V-4) can be settled from data.

**`vargas.json` — one longitude, eight divisions, all hand-derived.** `λ_sid = 176.2000°` (Virgo, `s = 5`, `d = 26.2000°`):

| Chart | Rule (RESEARCH §5.7) | Part index `i` | Expected sign |
|---|---|---|---|
| D1 Rāśi | `floor(λ/30)` | — | 5 · Kanyā (Virgo) |
| D2 Hora | even sign, `i = 1` → reverse → Sun's hora | 1 | 4 · Siṁha (Leo) |
| D3 Drekkana | `(s + 4i) mod 12` | 2 | 1 · Vṛṣabha (Taurus) |
| D7 Saptamsa | even: `(s + 6 + i) mod 12` | 6 | 5 · Kanyā (Virgo) |
| D9 Navamsa | `floor(λ / (10/3)) mod 12` = `52 mod 12` | — | 4 · Siṁha (Leo) |
| D10 Dasamsa | even: `(s + 8 + i) mod 12` | 8 | 9 · Makara (Capricorn) |
| D12 Dwadasamsa | `(s + i) mod 12` | 10 | 3 · Karka (Cancer) |
| D60 Shashtiamsa | `(s + i) mod 12` | 52 | 9 · Makara (Capricorn) |
| D30 Trimsamsa | unequal 5/5/8/7/5 bands, reversed for even signs | 26.2° → Mars band | `<oracle>` — the *sign* mapping for the Mars band in even signs differs by school; take PyJHora's and cite it |

Cross-check baked into the same test: the D9 formula must agree with the *classical rule statement* ("dual signs start from the 5th") — Virgo is dual, 5th from Virgo is Capricorn, `26.2 / 3.3333 = 7.86` → 8th navamsa → Capricorn + 7 = Leo ✓. Both paths are asserted so a refactor cannot quietly break one.

Boundary rows: `λ = 0.0000°` → D9 Aries; `λ = 359.9999°` → D9 Pisces; `λ = 30.0000°` exactly → D1 Taurus (half-open intervals `[a, b)` everywhere, asserted).

**`nakshatra.json`.** Span 13°20′ = 13.3333…°, pada 3°20′.

| λ_sid | Index | Name | Pada | Lord | Notes |
|---|---|---|---|---|---|
| 176.2000° | 13 | Chitrā | 1 | Mars (Maṅgala) | `floor(176.2/13.3333) = 13`; `floor(176.2/3.3333) = 52`, `52 mod 4 = 0` → pada 1; lord index `13 mod 9 = 4` → Mars |
| 213.4567° | 16 | Anurādhā | 1 | Saturn (Śani) | synthetic; the reference chart's Rāhu sits nearby at 213.4956° |
| 0.0000° | 0 | Aśvinī | 1 | Ketu | lower boundary |
| 13.3333° − 1e-9 | 0 | Aśvinī | 4 | Ketu | upper boundary stays inside |
| 13.3334° | 1 | Bharaṇī | 1 | Venus | first tick of the next |
| 359.9999° | 26 | Revatī | 4 | Mercury | wrap |

Also asserted from the same index: gana (Chitrā → Rākṣasa), yoni (Chitrā → tiger), nadi (`13 mod 6 = 1` → Madhya), varna via Moon sign, and the nāma-akṣara set.

**`panchang-synthetic.json` — pure-angle cases, no ephemeris.** `λ_moon = 200.0000°`, `λ_sun = 41.5000°`, `ayanamsa = 23.8000°`:

| Anga | Arithmetic | Expected |
|---|---|---|
| Elongation | `(200.0 − 41.5) mod 360` | 158.5000° |
| Tithi | `floor(158.5 / 12) + 1 = 14` | **14 · Śukla Caturdaśī** |
| Karana | `k = floor(158.5/6) + 1 = 27`; `(27 − 2) mod 7 = 4` | **Gara** |
| Yoga | `λ_sun_sid + λ_moon_sid = 17.7 + 176.2 = 193.9`; `floor(193.9/13.3333) = 14` | **15 · Vajra** |
| Nakshatra | `floor(176.2/13.3333)` | **13 · Chitrā** |

Plus the six seam cases: elongation exactly 0° (Amāvasyā → tithi 30, not 0), exactly 180° (Pūrṇimā → tithi 15/16 seam), `k = 1` → Kiṁstughna, `k = 58/59/60` → Śakuni/Catuṣpāda/Nāga, and yoga index 26 → Vaidhṛti.

**`vimshottari.json` — hand-derived from `λ_moon_sid = 176.2000°` (Chitrā, lord Mars, 7 y), `dashaYearDays = 365.25`.**

| Quantity | Arithmetic | Expected |
|---|---|---|
| Traversed fraction `f` | `(176.2 − 13 × 13.33333…) / 13.33333… = 2.866667 / 13.333333` | 0.2150000 |
| Balance of Maṅgala MD | `7 × (1 − 0.215)` | **5.4950 y = 2006.55 d** |
| MD order from birth | fixed cycle from Mars | Ma, Ra, Ju, Sa, Me, Ke, Ve, Su, Mo |
| AD lengths inside Ma MD | `7 × years(Z) / 120` | Ma 0.408333, Ra 1.05, Ju 0.933333, Sa 1.108333, Me 0.991667, Ke 0.408333, Ve 1.166667, Su 0.35, Mo 0.583333 (**Σ = 7.000000**) |
| AD **at birth** | elapsed `7 − 5.495 = 1.505`; Ma AD ends 0.408333, Ra AD ends 1.458333 | **Guru (Jupiter) AD**, 0.886667 y remaining |
| Σ of all 9 MDs | — | **120.000000 y** (asserted to 1e-9) |
| Same with `dashaYearDays = 360` | balance × 360 | 1978.20 d — the setting must change the answer, and the colophon must say which was used |

Tree assertions: every AD's Σ equals its MD; every PD's Σ equals its AD; no gaps and no overlaps (`end[i] === start[i+1]` exactly, compared as JD floats within 1e-6 d); the "current MD/AD/PD" selector at a given JD is the interval containing it, half-open.

**`ashtakoota-11664.json.gz`** — all 108 × 108 nakshatra-pada pairs with the eight koota scores and the total, converted from PyJHora's `all_nak_pad_boy_girl.csv` **outside the repo** and committed as data (GOAL §5.5 demands 100 % agreement). One pair is worked out by hand in the doc so a regression can be diagnosed without the CSV — boy **Chitrā pada 1** (Moon in Kanyā), girl **Rohiṇī pada 3** (Moon in Vṛṣabha):

| Koota | Max | Derivation | Score |
|---|---|---|---|
| Varna | 1 | Kanyā → Vaiśya; Vṛṣabha → Vaiśya; boy ≥ girl | **1** |
| Vashya | 2 | Kanyā → Mānava; Vṛṣabha → Catuṣpada | `<oracle>` |
| Tara | 3 | girl→boy `13−3+1 = 11` → `((11−1) mod 9)+1 = 2` (Sampat, good); boy→girl `27−13+3+1 = 18` → `9` (Mitra, good) | **3** |
| Yoni | 4 | Chitrā → tiger; Rohiṇī → serpent (not a sworn-enemy pair) | `<oracle>` |
| Graha Maitri | 5 | lords Budha (Kanyā) and Śukra (Vṛṣabha) — mutual natural friends | **5** |
| Gana | 6 | Chitrā → Rākṣasa; Rohiṇī → Manuṣya; R–M | **0** |
| Bhakoot | 7 | Vṛṣabha → Kanyā is 5, i.e. the 5/9 axis → dosha | **0** |
| Nadi | 8 | `13 mod 6 = 1` Madhya vs `3 mod 6 = 3` Antya — different | **8** |
| | | certain subtotal | **17** (+ Vashya 0–2, Yoni 0–4 ⇒ 17–23, band "acceptable" or below) |

The full-CSV test runs all 11,664 pairs in one `it()` and reports the first 10 mismatches with `boy/girl` nakshatra-pada names, not indices. Budget: ≤ 2 s (§8).

**`yogas.json` — synthetic sign placements, no ephemeris.** Each case is a hand-built `{ lagnaSign, positions: { Su: sign, … } }`:

| ID | Yoga | Setup | Expect |
|---|---|---|---|
| Y-1 | Budha-Āditya | Su and Me both in Mīna | hit, citation present |
| Y-2 | Gaja-Kesari | Mo in Vṛṣabha, Gu in Siṁha (4th from Moon) | hit |
| Y-3 | Gaja-Kesari negative | Gu in Mithuna (2nd from Moon) | miss |
| Y-4 | Rucaka (Pañca-Mahāpuruṣa) | Ma in Meṣa (own) **and** in a kendra from Lagna Meṣa | hit |
| Y-5 | Rucaka negative | Ma in Meṣa but Lagna Vṛṣabha → Ma in the 12th | miss (own sign alone is not enough) |
| Y-6 | Kemadruma | nothing but Su/Ra/Ke in the 2nd and 12th from Moon | hit |
| Y-7 | Kemadruma cancelled | Ve in the 2nd from Moon | miss |
| Y-8 | Kāla-Sarpa | all seven between Rāhu and Ketu, going forward | hit |
| Y-9 | Kāla-Sarpa negative | one graha exactly on Rāhu's degree | miss + a "near boundary" note |
| Y-10 | Maṅgalik | Ma in the 7th from Lagna | hit, with the standard cancellations enumerated |

Every hit must carry a `citation` (`{ text: "BPHS", chapter: 36, verse: 13 }`) and a `because[]` array naming the chart elements that fired it — DESIGN §9.5's "show me" link and GOAL §3's "no black box" depend on it. `yogas.test.ts` asserts **every** rule in the registry has a non-empty citation and at least one positive and one negative fixture; a new yoga without both fails the suite.

**`palm/*.json` — synthetic landmark sets.** Normalised image coordinates, 21 points, chosen so the ratios are exact:

| Fixture | WRIST | MIDDLE_MCP | INDEX_MCP | PINKY_MCP | MIDDLE_TIP | L | W | F | W/L | F/L | Element |
|---|---|---|---|---|---|---|---|---|---|---|---|
| `fire.json` | (0.50, 0.95) | (0.50, 0.45) | (0.29, 0.45) | (0.71, 0.45) | (0.50, 0.095) | 0.500 | 0.420 | 0.355 | **0.84** | **0.71** | **Fire** (matches DESIGN §9.8) |
| `earth.json` | (0.50, 0.95) | (0.50, 0.45) | (0.265, 0.45) | (0.735, 0.45) | (0.50, 0.10) | 0.500 | 0.470 | 0.350 | 0.94 | 0.70 | Earth (square + short) |
| `air.json` | (0.50, 0.95) | (0.50, 0.45) | (0.265, 0.45) | (0.735, 0.45) | (0.50, 0.02) | 0.500 | 0.470 | 0.430 | 0.94 | 0.86 | Air (square + long) |
| `water.json` | (0.50, 0.95) | (0.50, 0.45) | (0.29, 0.45) | (0.71, 0.45) | (0.50, 0.02) | 0.500 | 0.420 | 0.430 | 0.84 | 0.86 | Water |
| `boundary.json` | — | — | — | — | — | 0.500 | 0.450 | 0.400 | **0.90** | **0.80** | thresholds are `≥` → square + long → **Air** |

Also fixtures for: `off-frame.json` (a landmark at `y = 1.02` → rejected), `low-handedness.json` (`score 0.74` → rejected, threshold 0.8), `dorsal.json` (right hand, thumb on the *right* of the frame → "turn your palm to the camera", not a reading).

### 2.2 Where each oracle is allowed to be used

| Question | Oracle | Rule |
|---|---|---|
| Graha/Lagna longitudes under `SE-true`/`SE-mean` | `swetest` (Swiss Ephemeris) or JHora | Fixture-only, generated outside the repo (D5.1). **Never** Drik — RESEARCH §5.4 proves Drik is 19–41″ away. |
| Tithi/vara/nakshatra/yoga/karana **names**, sunrise/sunset, Rahu Kaal | drikpanchang.com, read by hand | Only under the `drik-mean` preset. Screenshots stored in `docs/oracles/` with the date they were read. No scraping (GOAL §6). |
| Ashtakoota / 10-porutham | PyJHora CSVs | Fixture-only; converted outside the repo. |
| Panchang & vargas, cheap continuous cross-check | `@ishubhamx/panchangam-js` (MIT) | **devDependency, Node-only tests** (§2.3). Its ayanamsa is a *mean* Lahiri 23°51′25.532″ at J2000 — so it is compared against our `SE-mean` preset only, with a documented ≈0.13″ base offset. |
| Yoga names/lists | PyJHora README + BPHS chapter/verse | Names and citations only; predicates are written from the text (D5.2: facts, not code). |

### 2.3 `@ishubhamx/panchangam-js` never enters the browser bundle

RESEARCH verification #7: the package is **CommonJS** and `dist/kundli/exporter.js` calls `require("fs")`. The usual advice is to stub `fs` in Vite. We do something simpler and safer: it is a **devDependency**, imported only from `src/engine/__oracle__/*.test.ts` which run in the Vitest `node` environment, where `fs` exists. Consequences, all asserted:

- **O-1** `scripts/check-bundle.mjs` (run in `ci.yml` and before every tag) greps `dist/**/*.js` for `panchangam` and for `require("fs")` and fails on a hit.
- **O-2** `package.json` has `@ishubhamx/panchangam-js` under `devDependencies` only; a `dependencies` entry fails `check-licences.mjs`.
- **O-3** Therefore `vite.config.ts` needs **no** `fs` alias. (If a future phase ever ships it to the browser, the alias goes in `resolve.alias` as `{ find: /^fs$/, replacement: "/src/shims/fs-empty.ts" }` and O-1 becomes an allow-list — but that decision belongs in ARCHITECTURE.md first.)

### 2.4 Biometric fixtures never enter the repo

Palm photos are biometrics (D5.5, GOAL §9). Therefore:

- Real hand photos live in `fixtures-private/palms/` which is in `.gitignore` **and** in a `pre-commit` hook check. Tests that need them use `describe.skipIf(!existsSync(dir))` and print `skipped: no private palm fixtures on this machine` — CI always skips them, the owner's machine always runs them.
- Committed image fixtures are **synthetic**: a `scripts/make-palm-fixtures.mjs` renders SVG "palm prints" (a hand silhouette plus three Bézier creases at known coordinates, plus optional Gaussian blur, gamma shift and vignette) to PNG at build time. Line-detection accuracy is measured against the *known* paths.
- **P-0 (blocking)** `scripts/check-no-biometrics.mjs` fails the build if any tracked file under `e2e/`, `src/` or `docs/` is a JPEG/HEIC, or is a PNG larger than 200 kB, or contains EXIF `Make`/`GPS` tags. The repo is public; this is the guard that keeps a friend's hand out of it.

---

## 3. Unit tests — `src/engine` (Given / When / Then)

### 3.1 `time.ts`

- **T-1** *Given* local `1994-03-14 07:25` and zone `Asia/Kolkata`, *when* `resolveInstant()`, *then* UTC instant `1994-03-14T01:55:00Z`, `jdUT === 2449425.57986` (±1e-5 d ≈ 0.9 s) and `offsetLabel === "+05:30"`.
- **T-2** All 15 rows of `timezones.json` round-trip: `resolveInstant(local, zone).toLocal() === local` (no drift), and the UTC instant matches to the millisecond.
- **T-3** *Given* TZ-7 (1900 Madras), *then* `offsetLabel === "+05:21:10"` — a three-part label, and `offsetMinutes` is **not** used anywhere in the engine (asserted by a grep test).
- **T-4** *Given* TZ-8 with `offsetOverride: "+04:51"`, *then* the zone id is still stored (`Asia/Kolkata`) but the instant uses the override, and the colophon string reads `ASIA/KOLKATA · +04:51 (manual) · JD …`.
- **T-5** *Given* a nonexistent local time (a DST spring-forward gap in `America/New_York`), *then* `resolveInstant` returns `{ ok: false, reason: "nonexistent" }` and the UI shows the haldi note — never a silently shifted chart.
- **T-6** *Given* an ambiguous local time (fall-back hour), *then* `{ ok: false, reason: "ambiguous", candidates: [a, b] }` and the drum row offers both offsets.
- **T-7** `jdTT − jdUT` equals ΔT/86400 from `astronomy-engine`'s `MakeTime`, monotonic across 1900–2030, and ≈ 69 s in 2026.
- **T-8** 31 February is refused: the day drum's `isValidDate` returns false and the detent is refused (DESIGN §9.4) — no `Date` normalisation to 3 March.

### 3.2 `ayanamsa.ts` — AY-1…AY-5 in §2.1, plus:

- **AY-6** *Given* preset `drik-mean`, *when* a chart is cast, *then* the returned `Patri.colophon.preset === "Lahiri (Drik-compatible mean)"` — the label is part of the output, not a UI decoration (GOAL §5.2).
- **AY-7** Unknown preset id throws at the boundary, never falls back to a default (a silent default would produce a plausible, wrong chart).

### 3.3 `ephemeris.ts` and `nodes.ts`

- **E-1** *Given* the 50 golden charts, *when* longitudes are computed via `Ecliptic(GeoVector(body, t, true))`, *then* each is within **60″** of the swetest column; the suite prints the worst offender and its arcsecond error.
- **E-2** The `Ephemeris` interface has exactly one implementation in the bundle (`AstronomyEngineEphemeris`); `check-bundle.mjs` asserts no `swisseph` string appears in `dist/`.
- **E-3 (the anti-drift guard).** *Given* the reference leaf of §0.1a (Rahul · 1994-03-14 07:25 IST · Bengaluru · `se-true` / true node / 365.25 / upper-limb), *when* `cast(referenceChart)` runs, *then* **every** number printed anywhere in the docs, in the ledger fixture, in `design/preview.html` and in the Playwright screenshot baselines is asserted to be that call's output — never a literal typed beside it. Concretely the test imports `__fixtures__/reference-chart.json`, calls `cast()`, and deep-compares: `jdUt` 2449425.579861; ayanāṃśa 23.7801526°; Lagna 345.6570°; Sūrya 329.4811°; Candra 349.1688° (Revatī pada 1, lord Budha); Maṅgala 311.5233°; Budha 302.4901°; Guru 200.6030° ℞; Śukra 343.1253°; Śani 311.5169°; Rāhu 213.4956° ℞; Ketu 33.4956° ℞ — each to **1″**, plus the D9 signs, the whole-sign houses, the birth panchāṅga (Śukla Dvitīyā · Somavāra · Revatī 1 · Śukla · Kaulava), the Budha balance 13.809790 yr and the 20/36 Aṣṭakūṭa against the Rohiṇī partner. **This is the test that would have caught the 130.7°-wrong Moon** that stood in these documents until 2026-09-08: a hand-typed longitude can never again diverge from the engine without a red suite.
- **N-1** Mean node (Meeus 47.7) at J2000 = **125.0445479°** ± 1e-6 (the polynomial's constant term, evaluated at T = 0) and decreases ≈ 19.34°/yr.
- **N-2** True (osculating) node from the finite-difference of the Moon's ecliptic position at t ± 30 s: within **1.8°** of the mean node for 500 sampled dates (the known libration amplitude), and *equal* to the mean node at the nodal-libration crossings within 3′.
- **N-3** `Ketu = (Rahu + 180) mod 360` exactly, for both node types.
- **N-4** *Given* a date where mean and true node sit in different signs, *then* the two settings produce different `d1` house placements — and both charts state their `nodeType` in the colophon (RESEARCH §8 risk 3).

### 3.4 `lagna.ts`

- **L-1** *Given* the reference chart, *then* `ascSidereal` within 60″ of swetest's `-house` output; `mc` too.
- **L-2** Latitude sweep: for φ ∈ {−45, −23.5, 0, 12.97, 23.5, 45, 60} and RAMC ∈ {0, 90, 180, 270}, the ASC is finite, in `[0, 360)`, and always **east** of the MC by 60–120° (a sanity invariant that catches a sign flip in `tan φ`).
- **L-3** φ = 0 exactly: `tan φ = 0` and ASC reduces to `atan2(cos RAMC, −sin RAMC · cos ε)` — asserted against a closed-form value.
- **L-4** Whole-sign houses (an **arbitrary** Lagna, deliberately not the reference chart): *given* Lagna in Vṛścika (7), *then* Kanyā (5) is the **11th** house (`((5 − 7) mod 12) + 1`), and house 1 always contains the Lagna sign. Do not wire this case to the reference fixture, whose Lagna is Meena.
- **L-5** Bhava Chalit (Sripati) trisection: cusps are monotonic, the 1st cusp equals the ASC, the 7th equals ASC + 180 within 1e-9, and a graha's Chalit house may differ from its whole-sign house — the table shows both (DESIGN §9.5 varga/Bhava rows).
- **L-6** ε at J2000 = 23.4392794° ± 0.5″ (IAU-2006 `ε₀` with T = 0), and Δε stays within ±9.3″.

### 3.5 `vargas.ts` — the `vargas.json` table in §2.1, plus:

- **V-1** Every varga function is total: for 3,600 longitudes at 0.1° steps, every result is an integer sign index in `[0, 11]`.
- **V-2** D1 of `λ` equals `floor(λ / 30)` for all of them (the trivial case must not be special-cased away).
- **V-3** Half-open intervals: `sign(30.0) === 1` and `sign(29.999999) === 0`.
- **V-4** The D9 formula path and the classical "movable/fixed/dual" path agree on all 3,600 samples (§2.1).

### 3.6 `nakshatra.ts` — the `nakshatra.json` table, plus:

- **NK-1** The 27 lords, read in order, are exactly `[Ke, Ve, Su, Mo, Ma, Ra, Ju, Sa, Me]` repeated three times.
- **NK-2** Every nakshatra has a gana, yoni, nadi, deity, symbol and nāma-akṣara set; a missing entry fails (the tables are re-typed by hand from BPHS, so a typo is the likely failure mode).
- **NK-3** Nadi distribution over the 27 indices is 9 Adi / 9 Madhya / 9 Antya (a checksum on the `idx mod 6` mapping).
- **NK-4** Gana distribution is 9 / 9 / 9 (Deva / Manuṣya / Rākṣasa).
- **NK-5** Yoni animals: exactly 14 distinct animals over 27 nakshatras (28 with Abhijit), and the sworn-enemy pairs (cat–rat, cow–tiger, mongoose–serpent, …) are symmetric in the 14 × 14 matrix.

### 3.7 `vimshottari.ts` — the `vimshottari.json` table, plus:

- **VD-1** Σ of the nine MD years = 120 exactly; the cycle order from any start lord is a rotation of the canonical order.
- **VD-2** `f` at a nakshatra's exact start = 0 → balance = full period; at its exact end = 1 → balance = 0 and the *next* lord's MD starts at birth.
- **VD-3** Three-level tree for the reference chart: 9 MDs × 9 ADs × 9 PDs = 729 intervals, no gaps, no overlaps, total span 120 y ± 1e-6.
- **VD-4** `currentAt(jd)` is half-open: an instant exactly on a boundary belongs to the *later* interval, consistently at all three levels.
- **VD-5** Switching `dashaYearDays` 365.25 → 360 scales every interval by exactly 360/365.25 and changes the colophon string.

### 3.8 `panchang.ts` and `sunrise.ts` — the synthetic table, plus:

- **PA-1** End-time solver: for 100 random instants, `tithiAt(endTime(t) − 1 s) === tithiAt(t)` and `tithiAt(endTime(t) + 1 s) === tithiAt(t) + 1` (mod 30). Same for nakshatra, yoga, karana.
- **PA-2** Hindu day runs sunrise → sunrise: an instant 10 minutes *before* sunrise belongs to the previous vara. Asserted for all three cities across the 30 Drik days.
- **PA-3** Both sunrise conventions are implemented and produce different times (typically 2–4 minutes); the difference is reported, and the colophon names the convention used (V-4 decides the default).
- **PA-4** Rahu Kaal: day length ÷ 8, weekday-indexed slot; for the 30 × 3 Drik days the start/end are within **2 minutes** of Drik's, given the same sunrise convention.
- **PA-5** Polar case: for Tromsø on 2026-06-21, `SearchRiseSet` returns null → panchang degrades to "no sunrise at this latitude today", never `NaN`.
- **PA-6** Abhijit muhurta = local apparent noon ± 24 min, and is absent on Wednesdays where the tradition omits it (setting-dependent; both behaviours tested).

### 3.9 `boundary.ts`

- **B-1** *Given* a **synthetic** graha (λ_sid = 226.6383°, not the reference chart — no graha there is inside 2′ of an edge) 1′42″ from the Anurādhā/Jyeṣṭhā edge, *then* `nearBoundary === true`, `distanceArcsec === 102`, and the footnote text is exactly the DESIGN §9.5 string: `within 1′42″ of Anurādhā/Jyeṣṭhā; Drik preset would read Jyeṣṭhā` — **and only when the other preset genuinely flips it** (the module recomputes under all three presets to decide).
- **B-2** Threshold is 2′ for the asterisk but the cross-preset check uses 41″ + the ±1′ engine error = **101″** (AY-5); a body 90″ from an edge gets no asterisk but *does* get the cross-preset footnote if a preset flips it.
- **B-3** Boundary state is computed for nakshatra, pada, rashi and navamsa independently.

### 3.10 `yogas.ts`, `ashtakoota.ts`, `porutham.ts`

- Y-1…Y-10 from §2.1; plus **Y-11** every registry entry has a citation and both a positive and a negative fixture; **Y-12** yoga evaluation is pure and order-independent (shuffling the registry does not change the output set); **Y-13** cancellations are separate predicates with their own citations (Neecha-Bhanga, Kemadruma, Maṅgalik) and appear in `because[]` when they fire.
- **AK-1** All 11,664 pairs match `ashtakoota-11664.json.gz` exactly (GOAL §5.5). Failures print names, not indices.
- **AK-2** Maxima sum to 36 (1+2+3+4+5+6+7+8) — the mala has exactly 36 beads (DESIGN §8.4).
- **AK-3** Bands: `< 18` not recommended, `18–24` acceptable, `25–32` very good, `33–36` excellent; boundary values 18, 24, 25, 32, 33 land in the documented band.
- **AK-4** Doshas (Nadi, Bhakoot) are returned as structured flags with their cancellation checks, not as a subtracted score.
- **AK-5** Symmetry: swapping boy/girl changes only Varna and Tara (the two asymmetric kootas) — a regression here means an index was transposed.
- **AK-6 (showcase pair).** The reference chart's Moon (Revatī 1, Mīna) against the showcase partner (Rohiṇī, Vṛṣabha) returns exactly `1 / 2 / 1.5 / 2 / 0.5 / 6 / 7 / 0 = 20`, band `acceptable`, with **Bhakūṭa 7/7 flagged `dosha: false`** (a 3/11 axis) and **Nāḍī 0/8 flagged `dosha: true`** (both Antya). The Milan screen's bead materials are asserted against those two flags, not against a hard-coded row.
- **PO-1** The 10 poruthams are booleans with citations; the collapsed thread renders `n / 10`.

### 3.11 Persistence, export, crypto (`fake-indexeddb`)

- **DB-1** Dexie schema v1: `profiles`, `charts` (cache keyed by `profileId + presetHash`), `palms` (Blobs), `settings`. `liveQuery` emits on write.
- **DB-2** A preset change invalidates every cached chart (the haldi "recompute" tab, DESIGN §9.5) — asserted by `presetHash` changing and `charts.where('presetHash').notEqual(current)` being non-empty.
- **DB-3** v1 → v2 migration preserves every profile and Blob; a migration that drops a table fails the test by design.
- **CR-1** Export → import round-trip is **byte-identical** for a 3-profile, 2-palm-photo database (GOAL §5.6): the re-exported buffer equals the first.
- **CR-2** AES-GCM with a passphrase-derived key (PBKDF2/Argon2 per ARCHITECTURE): wrong passphrase → `AuthenticationError`, never a partial import; the salt and iv are stored in the envelope; the plaintext never touches disk.
- **CR-3** The exported envelope contains **no** plaintext name, date or place (grep the ciphertext for `"Bengaluru"` and the profile name).
- **CR-4** "Burn" deletes the profile row, every cached chart and every palm Blob in one transaction; a subsequent `db.palms.count()` is 0 and no orphan Blob URL remains.

---

## 4. Component tests (Testing Library, jsdom)

MediaPipe and OpenCV are stubbed at the module boundary (`src/test/setup.ts` provides a `HandLandmarker` that returns a fixture from §2.1), so component tests never load 8 MB of WASM.

- **C-1 `BrassDrum`** — `role="spinbutton"` with `aria-valuenow/min/max/text`; ArrowUp/Down change by one detent; PageUp/Down by ten; typing `3` `1` sets 31; an invalid day (31 Feb given the month/year drums) is **refused** (value unchanged, `aria-invalid`, dull-tick class) rather than clamped; `aria-live="polite"` updates are debounced 300 ms (DESIGN §13).
- **C-2 `SealButton`** — pointerdown starts a 600 ms hold; release at 599 ms fires nothing and returns to scale 1; at 600 ms fires `onSeal` once (not twice under React 19 StrictMode double-effects); Space/Enter hold works for keyboards.
- **C-3 `GrahaLedger`** — renders the reference Sun row `Sū Kumbha 29°28′52″ P.Bhādrapadā 3 Gu` with **no** asterisk (31′08″ from the cusp), and a synthetic near-boundary row with one; `′ ″` are in `--ink-muted`; digits are tabular (`font-variant-numeric: tabular-nums`); the boundary asterisk has an accessible name (`near boundary, 1 arcminute 42 seconds from Jyeṣṭhā`), is a `button` opening the footnote sheet, and is never colour-only (DESIGN §13 "colour independence").
- **C-4 `KundliNorth` / `KundliSouth`** — 12 house regions with the right sign numerals for the reference fixture's Lagna = **Meena (11)**, so the South grid puts Meṣa at row 0 / col 1 and Meena top-left; the Lagna tilak is on house 1; a visually-hidden `<table>` twin lists graha/sign/degree/nakshatra-pada and is wired via `aria-describedby`; the Devanagari/Latin ring toggles both the visible glyphs and the hidden table.
- **C-5 `DashaRibbon`** — accordion opens MD → AD → PD; the "now" brass clip lands on the interval containing the frozen clock; keyboard arrows move between MDs; `aria-expanded` correct.
- **C-6 `BeadRow`** — 8 rows, maxima 1..8; unearned beads are `wood`, earned `brass`, dosha `lac`; `aria-label` reads `Yoni: 4 of 4 points`; the whole row is one `role="img"` with that label plus a real text score, so a screen reader never counts circles.
- **C-7 `LedgerRow` / `FootnoteSheet`** — a citation superscript is a button; the sheet is `role="dialog" aria-modal="true"` with focus trap and focus return; Escape closes; the sheet shows the exact end instant and the sunrise convention (DESIGN §9.2).
- **C-8 `StylusEditor`** — three Bézier paths with draggable handles; committing a path recomputes the reading synchronously (`< 1 s` budget is E2E's, correctness is here); `aria` describes each path ("heart line, traced by hand").
- **C-9 `Drawer` / `DialSegment`** — the three ayanamsa ticks are a `radiogroup`; each tick's accessible name includes the arcsecond delta (`Drik-compatible mean, 24.3 arcseconds above SE mean`); changing it marks cached charts stale.
- **C-10 `PlaceSearch`** — typing filters the bundled GeoNames set via minisearch and shows lat/lon in mono; it makes **no** network call on keystroke (RESEARCH §3: Nominatim forbids autocomplete); the "search online ⌑" stamp is a separate explicit action.
- **C-11 `Toast` (lac note)** — info/warning/danger variants use `--ink`/`--haldi` fill with ink text/`--lac`, never haldi as text; dismisses on swipe and after 4 s; `role="status"` for info, `role="alert"` for danger.
- **C-12 `QualityGauge`** — sharpness/exposure gauges show a number *and* a label, turn haldi below threshold, and are `aria-hidden` only when a text equivalent exists next to them.

---

## 5. Palm pipeline tests (`src/palm`)

The contract is **honesty**, not accuracy (RESEARCH §5.13.9, GOAL §3). A run that returns low confidence and opens the stylus is a pass; a run that returns a confident wrong line is a failure even if it looks pretty.

### 5.1 Landmarks and gating (`landmarks.test.ts`)

- **PL-1** *Given* `fire.json`, *when* `validate()`, *then* `{ ok: true, handedness: "Right", score: 0.93 }`.
- **PL-2** *Given* `low-handedness.json` (score 0.74), *then* `{ ok: false, reason: "uncertain-hand" }` — the shutter stays disabled (DESIGN §9.7).
- **PL-3** *Given* `off-frame.json`, *then* `{ ok: false, reason: "landmark-off-frame" }`.
- **PL-4** *Given* `dorsal.json` (right hand, thumb on the right of the image), *then* `{ ok: false, reason: "palm-not-facing" }` with the copy "turn your palm to the camera". The rule: for a right hand palm-up, `THUMB_CMC.x < PINKY_MCP.x`; mirrored for a left hand; asserted for both.
- **PL-5** The MediaPipe adapter never mutates the input array and returns `worldLandmarks` in metres (used by the view-invariant ratios).

### 5.2 Geometry (`geometry.test.ts`) — the element table in §2.1, plus:

- **PG-1** Thresholds are `≥`: `boundary.json` (W/L = 0.90, F/L = 0.80) is **Air**. A `>` implementation fails.
- **PG-2** Ratios are computed from `worldLandmarks`, so scaling every normalised coordinate by 1.7 (a closer photo) leaves the element unchanged.
- **PG-3** 2D:4D index/ring ratio, Mercury-finger length vs ring first phalanx, thumb opening angle and inter-finger spacing each return a number **and** a band label; each band has a citation.
- **PG-4** A degenerate hand (all landmarks identical) returns `{ ok: false, reason: "degenerate" }`, not `NaN` or `Infinity`.

### 5.3 Capture quality (`quality.test.ts`)

Fixtures are generated deterministically by `scripts/make-palm-fixtures.mjs`, so the numbers are stable across machines:

- **PQ-1** `checker-sharp.png` (8 px checkerboard) → Laplacian variance ≥ 900; `checker-blur9.png` (same image, 9×9 box blur) → ≤ 60. The gauge threshold sits at 120 and both fixtures are ≥ 2× away from it, so the test is not measuring float noise.
- **PQ-2** `palm-dark.png` (gamma 0.35) → exposure gauge "low", `palm-blown.png` (gamma 2.6, 12 % pixels at 255) → "high"; `palm-even.png` → "ok". The luma histogram check is on the palm ROI only, not the whole frame.
- **PQ-3** The shutter is enabled only when `handOk && sharpness.ok && exposure.ok`; the truth table (8 rows) is asserted.
- **PQ-4** Gauges run on a 512-px downscale and complete in ≤ 15 ms for a 1600 × 1200 input (the live gauge must not drop the preview below 30 fps).

### 5.4 Rectification and line extraction (`rectify.test.ts`, `lines.test.ts`, `thinning.test.ts`)

- **PR-1** Homography from WRIST / INDEX_MCP / PINKY_MCP / MIDDLE_MCP to the canonical 512 × 512 ROI: the four source points land within 1 px of their canonical targets; the transform is invertible (round-trip error ≤ 0.5 px) so a traced path can be mapped back onto the original photo.
- **PR-2** A rotated (+37°) and scaled (0.6×) copy of the same synthetic palm rectifies to an ROI whose three known crease paths are within **4 px RMS** of the unrotated run — rectification is what makes the line scores comparable.
- **PT-1** Zhang-Suen thinning: a 9-px-wide straight stroke thins to a 1-px skeleton with the same endpoints ± 1 px; a filled disc thins to a single pixel; idempotent (running it twice changes nothing); terminates in ≤ 40 iterations on a 512 × 512 mask.
- **PLN-1** *Given* `synthetic-clean.png` (three creases at known Béziers, even lighting), *then* heart / head / life are all labelled correctly with confidence ≥ 0.8 and each detected path within **6 px RMS** of ground truth.
- **PLN-2** *Given* `synthetic-shadow.png` (a 40 % linear illumination ramp), *then* CLAHE + black-hat still finds all three with confidence ≥ 0.6 — this is the case the enhancement stage exists for.
- **PLN-3** *Given* `synthetic-blur.png`, *then* at least one line drops below 0.6 and the result carries `{ suggestTrace: true }`; the UI opens the stylus automatically (E2E H-6).
- **PLN-4** *Given* `synthetic-henna.png` (extra high-contrast curves crossing the palm), *then* no spurious line is labelled with confidence > 0.6 — a false confident label is a **failure**; returning "unsure" is a pass.
- **PLN-5** Anatomical labelling is band-based (RESEARCH §5.13.6): a component that starts under PINKY_MCP but runs *downward* is not a heart line; the Gaussian template score is asserted for four hand-built components.
- **PLN-6** **OpenCV memory**: every `cv.Mat` allocated in the pipeline is `delete()`d — `lines.test.ts` wraps the run with a counter around `cv.Mat` construction/deletion and asserts the delta is 0. A leak here kills the Android WebView (RESEARCH §8 risk 7).
- **PLN-7** The pipeline is a pure function of `(ImageData, landmarks, settings)` — same input twice gives byte-identical output masks.
- **PLN-8** *(owner's machine only, skipped in CI)* `fixtures-private/palms/*` — heart, head and life detected with confidence ≥ 0.6 on **≥ 70 %** of the evenly lit photos in the folder (GOAL §5.4). The test prints the per-photo table so the ratio can be tracked as the filter is tuned.

### 5.5 Reading text (`reading.test.ts`)

- **PRD-1** Every sentence begins with `Tradition says…` (or the Devanagari equivalent) and ends with a superscript citation index that resolves to a real entry in the citation table.
- **PRD-2** **Banned-content scan**: the composed reading, for all 5 element fixtures × 3 confidence levels × both hands, contains none of the words in `src/test/banned-words.ts` (health, disease, death, die, pregnancy, fertility, wealth, money, marriage date, lawsuit, remedy, gemstone, pooja, cure). This is GOAL §6 as a test, and it also scans the yoga and dasha sentence templates.
- **PRD-3** Determinism: `reading(chart, seed)` with the same seed is byte-identical across 100 runs and across Node/browser.
- **PRD-4** Low confidence changes the wording ("the life line is faint in this print — trace it to confirm"), never the certainty of the claim.
- **PRD-5** Both framings are offered: `dominant/non-dominant` and the classical `right/left`, with the setting recorded in the output (RESEARCH §10.5).

---

## 6. End-to-end (Playwright)

`playwright.config.ts`: `timezoneId: "Asia/Kolkata"`, `locale: "en-IN"`, `colorScheme: "dark"`, projects `desktop-chromium` (1280 × 800) and `pixel-7` (393 × 852, DPR 2.625, `hasTouch`). `webServer` runs `vite preview --base /jyoti/ --port 4173`, so every test exercises the real Pages sub-path. Seeding goes through the app's own import path (`e2e/fixtures/seed.ts` calls the encrypted-import routine with a fixed passphrase), never raw IndexedDB writes — that way the import path is tested on every run.

### 6.1 Writing the leaf (`leaf.spec.ts`)

- **E2E-1** From an empty install, `#/` shows the blank scroll and "Write your first leaf"; the Ledge has five labelled objects.
- **E2E-2** Fill name; set the five drums to 14 / 03 / 1994 / 07 / 25 by keyboard; pick "Bengaluru" from the bundled gazetteer; the engraved strip reads `ASIA/KOLKATA · +05:30 · JD 2449425.5799 · LAGNA <sign>` (the JD string is asserted against the §2.1 correction, four decimals).
- **E2E-3** Set 1943 / 06 / 01 / 06 / 00 with Calcutta → the strip reads `+06:30`; set 1900 / 07 / 15 → `+05:21:10`; toggle the Bombay override → `+04:51 (manual)`.
- **E2E-4** Turning the hour drum scrubs the parapet strip: at 06:00 the sun is below the horizon line, at 12:00 above; the Lagna label changes at least twice across a full 24 h scrub, and `selectionChanged` haptic calls (mocked) fire once per sign crossing.
- **E2E-5** Hold the seal 600 ms → the leaf is saved and the app routes to `#/patri/:id`. Releasing at 300 ms saves nothing.
- **E2E-6** Set 31 / 02 / 1994 → the day drum refuses; no chart is cast; a haldi note appears.

### 6.2 The Patri (`patri.spec.ts`, `loupe.spec.ts`)

- **E2E-7** The North diamond draws (`pathLength` animation completes) and the Lagna tilak appears; the visually-hidden ledger table lists 9 grahas.
- **E2E-8** The Graha ledger degrees match the engine output exactly (`page.evaluate` on `window.__chowki.chart` in test builds) — the UI must not round differently from the colophon.
- **E2E-9** Tap a planet → the loupe rises and its engraved strip reads `MA 11°31′24″ · ŚATABHIṢĀ 2 · LORD RĀHU` in the right format; dragging snaps planet to planet.
- **E2E-10** A chart containing a near-boundary graha shows the vermilion asterisk; tapping it opens the footnote sheet with the exact `n′ n″` distance and the cross-preset sentence.
- **E2E-11** Swipe the paper → the South grid appears with Pisces top-left and Aries at row 0 / col 1; swipe back.
- **E2E-12** Varga pager: swipe the D9 figure → D2 → D3 → D7 → D10 → D12 → D30 → D60; each figure's caption names the varga and repeats the preset.
- **E2E-13** Scroll the whole scroll: the top roller thickens and the bottom thins monotonically with scroll progress (measured from `getBoundingClientRect` at 5 scroll positions).
- **E2E-14** Change the ayanamsa preset in the Drawer → return to the Patri → the haldi "recompute" tab is on the seal; hold the seal → the chart redraws and at least one degree changed.
- **E2E-15** Second visit to the same profile + preset renders from cache with **no** ink-draw replay (the `ink-draw` animation count is 0).

### 6.3 Today, Circle, Milan (`today.spec.ts`, `circle.spec.ts`, `milan.spec.ts`)

- **E2E-16** `#/today` shows tithi / vara / nakshatra / yoga / karana with end times and a Rahu Kaal band; with the clock frozen, the five values match the `panchang-drik.json` row for 2026-09-08, Bengaluru, `drik-mean`.
- **E2E-17** Swiping the Moon pager ages the phase and changes the date; tapping a row opens the footnote sheet naming the sunrise convention.
- **E2E-18** `#/circle`: dragging the thread end past 40 px fans the leaves; tapping a leaf opens its Patri; swipe-left offers Export and Burn.
- **E2E-19** Burn: hold 600 ms → the leaf chars and the profile disappears; `indexedDB` has no palm Blob left (asserted via `page.evaluate`).
- **E2E-20** `#/milan/:a/:b`: 36 beads slide in ≤ 3.5 s; tapping mid-animation finishes it instantly; the score numeral and the lac band match the engine's `ashtakoota()` output; a Bhakoot dosha shows lac beads **and** a "Tradition says…" line.

### 6.4 Hast Rekha (`hast.spec.ts`)

The camera is faked with Chromium's `--use-fake-device-for-media-stream --use-file-for-fake-video-capture=e2e/fixtures/palm.y4m`; the gallery path uses `setInputFiles` with a synthetic PNG.

- **E2E-21** `#/hast/:id/capture`: with no hand in frame the shutter is disabled and the outline is faint; with the fake palm stream it enables; the gauges show numbers.
- **E2E-22** Shutter → landmarks drawn over the photo, element and ratios in the findings ledger within the §8 budget.
- **E2E-23** "Trace lines" opens the stylus; dragging three paths and committing recomputes the reading in < 1 s; the traced paths are vermilion, the detected ones ink.
- **E2E-24** A blurred fixture goes straight to trace mode with the haldi note.
- **E2E-25** "Burn this print" (hold) removes the photo and the reading; returning to the screen shows the empty print frame.
- **E2E-26** Deny camera permission (`context.grantPermissions([])`) → gallery-only path with a plain note, no crash, no repeated prompt.

### 6.5 Rooftop sky (`sky.spec.ts`)

- **E2E-27** Swipe up from the dial → the painted SVG sky appears first, then the R3F dome crossfades in; the engraved strip shows the time, Lagna sign and nakshatra.
- **E2E-28** With `--disable-gpu` / a forced `webglcontextlost` event, only the painted sky renders and no error toast appears.
- **E2E-29** Under `emulateMedia({ reducedMotion: "reduce" })` the dome never mounts (asserted by the absence of a `<canvas>`), the painted sky is used, and the scrub ring still works without inertia.
- **E2E-30** Poster export produces a 1080 × 1920 PNG (checked by decoding the blob's header) with the profile name in it.

### 6.6 Drawer and settings (`drawer.spec.ts`)

- **E2E-31** The dial segment shows three ticks with arcsecond labels; selecting `Drik-compatible` changes the label on every subsequent chart colophon.
- **E2E-32** Node type, dasha year length, sunrise convention and Bhava system each change a visible number somewhere and are recorded in the colophon.
- **E2E-33** Devanagari-digit toggle changes ledger numerals to `२३°५१′` while the brass drums stay Latin (DESIGN §5).
- **E2E-34** "Precision mode (AGPL lane)" is present but **disabled**, with copy explaining that enabling it would require relicensing the repo; there is no code path that loads a Swiss WASM module in this build (asserted with a network + module scan).
- **E2E-35** Export → passphrase sheet → a `.chowki` file downloads; Import with the right passphrase restores three profiles; with a wrong one shows a lac note and changes nothing.

---

## 7. Offline, PWA and visual tests

### 7.1 Offline / PWA (`offline.spec.ts`)

- **OF-1** After first load, `context.setOffline(true)` + reload → the Vyom renders, fonts are Yatra One / Tiro (no fallback flash — compared with `document.fonts.check`), and casting a **new** chart works (the engine and gazetteer are precached).
- **OF-2** Offline, `#/today` computes today's panchang with no network (the whole point of GOAL §5.1's "airplane mode").
- **OF-3** Offline, the Hast screen shows "sharpening the stylus…" only if OpenCV is not yet cached; after one online visit it works offline. The Drawer's **"Prepare for offline"** action warms the MediaPipe model, the OpenCV chunk and the sky chunk, and a progress line reports bytes; afterwards OF-3 passes on a cold profile with no network.
- **OF-4** `#/lost` renders the blank-leaf 404 for an unknown hash route.
- **OF-5** Service worker registers with scope `/jyoti/`, and **does not register** when `VITE_PLATFORM=android` (asserted on the android build output in `check-bundle.mjs`).
- **OF-6** An update deploy shows the "new edition" prompt rather than reloading mid-cast.

### 7.2 Visual baselines (`e2e/visual/*.spec.ts`)

Seven screens × two themes × two viewports, matching DESIGN §16: Vyom home, Patri drawn, loupe open, writing the leaf (drums + sky strip), mala complete, palm reading, drawer. Baselines are Linux-only (CI-generated), `maxDiffPixelRatio: 0.002`, animations disabled via `animations: "disabled"` plus `page.clock`. Fonts are the built self-hosted woff2, never Google Fonts, so CI and local agree.

### 7.3 Material and token assertions (the part that actually catches drift)

Screenshots catch "it changed"; these catch "it stopped being Vyom".

- **VT-1 Paper share.** Sample the home, Patri and Today screenshots on a 4-px grid and classify each pixel by nearest token colour in OKLab. Assert `--surface` + `--surface-2` ≥ **85 %** and ≤ 92 % of the frame; `--bg` (teak) ≤ **8 %** (DESIGN §1, §4).
- **VT-2 One lamp.** Every element with a `box-shadow` has **negative** x and y offsets (shadows fall up-left, DESIGN §6). Any positive offset fails, naming the selector.
- **VT-3 No forbidden materials.** No computed style anywhere contains `backdrop-filter`, `filter: blur(`, `mesh`, or a `text-shadow` on a text node; no element has a gradient on a text fill (DESIGN §4.4 "no glow filters, no frosted glass").
- **VT-4 Brass is never text on paper.** For every text node, if the computed colour is within ΔE 5 of `--accent-2`, its nearest painted ancestor background must not be within ΔE 5 of `--surface`/`--surface-2`. Same rule for `--warning` (haldi is fill-only) and `--ink-faint` (art only).
- **VT-5 Token identity.** Read `getComputedStyle(document.documentElement)` and assert all 60-odd tokens equal the DESIGN §15 values byte-for-byte; the day theme changes exactly `--bg`, `--bg-elevated`, `--ledge`, `--shadow-alpha`, `--grain-opacity`, `--vignette-far` and nothing else (DESIGN §4.2: "the theme changes the desk, never the paper").
- **VT-6 Ink strokes.** Chart strokes are `--ink` at `1.25px` with `shape-rendering: geometricPrecision`; the turmeric band's vermilion hairline is 1 px at 70 % opacity.
- **VT-7 Type.** Yatra One appears on at most **six words** per screen (count rendered glyph runs in `--font-display`); Martian Mono appears only inside elements whose background is brass or teak; body text is ≥ 17 px; Devanagari runs have `line-height: 1.6`.
- **VT-8 Reduced motion.** With `reducedMotion: "reduce"`, `document.getAnimations()` is empty 200 ms after load and the diya flame has a constant opacity across 10 samples.

---

## 8. Performance tests and budgets

Measured on the `pixel-7` project with `cpuThrottlingRate: 4` and "Slow 4G" via CDP unless stated. Each row names the GOAL §5 criterion it enforces.

| Metric | Budget | Source | How |
|---|---|---|---|
| **Full cast** (9 grahas, Lagna, D1+D9, nakshatra/pada, Vimshottari MD/AD/PD, birth panchang, ≥ 10 yogas) | **≤ 100 ms** throttled; ≤ 25 ms desktop unthrottled | GOAL §5.1 | `performance.mark` pair exposed on `window.__chowki.perf.cast`; median of 20 runs on the reference chart |
| Ink-draw of the North chart | ≤ 1.5 s from cast to `drawn` | GOAL §5.1 | animation-finished promise, timed |
| Chart cache hit | ≤ 8 ms (no recompute, no redraw) | — | E2E-15 |
| 11,664-pair Ashtakoota suite | ≤ 2 s total in Vitest | GOAL §5.5 | `test:unit` timing assertion |
| Mala animation | ≤ 3.5 s for 36 beads; tap-to-skip < 100 ms | GOAL §5.5, DESIGN §8.4 | trace |
| Palm: photo → 21 landmarks → element + ratios | **< 3 s** | GOAL §5.4 | `perf/palm.spec.ts` with the fake camera; includes MediaPipe init from cache |
| Palm: line extraction (warm OpenCV) | ≤ 2.5 s on the 512 ROI | RESEARCH §5.13 | same |
| Palm: first-ever line extraction (cold OpenCV chunk from cache) | ≤ 6 s, with the "sharpening the stylus…" state visible throughout | RESEARCH §8 risk 7 | same |
| Stylus commit → new reading | **< 1 s** after the third path | GOAL §5.4 | E2E-23 timing |
| Sky-strip scrub recompute | < 1 ms/frame, 30 fps sustained while a drum spins | DESIGN §7 #14 | `performance.measure` inside the scrub loop |
| Drum spin / ribbon flick / loupe drag | ≥ 55 fps (≤ 3 dropped frames per second) | DESIGN §7 | CDP `Tracing` → `DroppedFrame` count |
| R3F dome | ≥ 40 fps at DPR ≤ 1.5 with `frameloop="demand"`; 0 frames rendered while off-screen | DESIGN §14 | trace + a `visibilitychange` assertion |
| Initial JS (gzip) | **≤ 350 kB** | GOAL §5.7 | `size-limit` on `dist/assets/*.js` excluding lazy chunks |
| Fonts | ≤ 260 kB woff2 total, 3 families, subset to Latin + Devanagari + `°′″℞` | DESIGN §5, §16 | request count + `Content-Length` in `perf/fonts.spec.ts` |
| Sound sprite | ≤ 300 kB for `chowki.webm` + `chowki.mp3` | DESIGN §12 | file size assertion |
| Gazetteer | ≤ 1.8 MB gzipped, parsed in ≤ 250 ms, first search ≤ 60 ms | RESEARCH §3 | `perf/gazetteer.spec.ts` |
| Lazy chunks are lazy | `hand_landmarker.task`, the OpenCV chunk and the sky chunk are **not** requested on `#/` | RESEARCH §8 risk 7 | network log on the home screen |
| LCP (the rolled Patri on `#/`) | ≤ 2.0 s mobile throttled | GOAL §5.7 | Lighthouse |
| CLS | ≤ 0.02 (drums and ledger use tabular numerals + `size-adjust` fallbacks so `digit-set` never reflows) | DESIGN §5 | Lighthouse + `layout-shift` observer |
| Lighthouse mobile Performance | **≥ 90**; installable PWA; a11y ≥ 95 | GOAL §5.7 | LHCI assertions |
| WebView memory after a palm run | ≤ 220 MB peak; heap returns within 10 % of baseline after two GCs (no leaked `cv.Mat`) | RESEARCH §8 risk 7 | CDP `HeapProfiler.collectGarbage` + `Performance.getMetrics`, plus PLN-6 |
| APK size | ≤ **40 MB** (7.5 MB model + MediaPipe wasm + OpenCV wasm + fonts/sounds/gazetteer) | D3, DESIGN §16 | `stat -c %s` assertion in `android-release.yml` |
| Cold PWA install payload | ≤ 6 MB precached (shell, fonts, engine, gazetteer, BSC5, sounds); the 7.5 MB model and OpenCV are **runtime-cached**, warmed by the Drawer's "Prepare for offline" | DEPLOYMENT §2.1 | `perf/precache.spec.ts` sums the Workbox manifest |

Budget violations fail `test:perf` and the pre-tag gate, not the Pages deploy.

---

## 9. Accessibility checks

Automated (`e2e/a11y.spec.ts`, `@axe-core/playwright`, tags `wcag2a wcag2aa wcag21aa`) on all ten screens in DESIGN §9, both themes, zero `serious`/`critical`. Known-acceptable exclusion: elements marked `data-decorative="true"` (rollers, grain, flame, `--ink-faint` guide rules, unearned wooden beads) are `axe.exclude`d for `color-contrast` — and VT-4 independently proves none of them carries text.

- **A-1 Contrast table.** Compute WCAG ratios in-test for every pair in DESIGN §4.1/§4.2 and assert the documented value ± 0.1: ink/paper 15.2, ink-muted/paper 7.3, accent/paper 5.2, accent-text/surface-2 5.0, accent-ink/accent 5.8, success/paper 6.0, warning-text/paper 5.7, danger/paper 8.7, focus/paper 8.0, engraved/brass 4.9, brass/bg 7.8, moon/bg 14.6, paper/ledge 14.5, paper/bg-day 6.6, ink/bg-elevated-day 10.2. Editing a hex in `tokens.css` to a non-compliant value fails here, not in review.
- **A-2 Never-text tokens.** `--ink-faint`, `--warning` (haldi) and `--accent-2` (brass, on paper) are asserted to appear on zero text nodes (VT-4 is the same check from the visual side; both run).
- **A-3 Focus.** Tab through every screen: each interactive element shows a 2 px `--focus` ring at 2 px offset **plus** the 2 px `--surface` halo; no `outline: none` without a `:focus-visible` replacement; focus order on the Patri follows the reading order (birth line → panchang → D1 → ledger → D9 → dasha → yogas → colophon).
- **A-4 Touch targets** on `pixel-7`: every `button, a, [role=button], input, [role=spinbutton]` has a bounding box ≥ 44 × 44; beads are 18 px visual with a 44 px hit area; Ledge objects ≥ 56; drums ≥ 56 tall; shutter and seal ≥ 48/56.
- **A-5 Charts are readable without sight.** Both Kundli components expose the visually-hidden ledger table via `aria-describedby`; the mala announces `Yoni: 4 of 4 points`; the palm overlay announces each line and its confidence as a number; the dasha ribbon announces the current MD/AD/PD.
- **A-6 Language.** `<html lang="en">`; every Devanagari run is wrapped in `lang="hi"` (or `lang="sa"` for Sanskrit terms) so TTS switches voice; a Latin transliteration is always present beside a Devanagari term (asserted by pairing each `lang="hi"` node with a sibling in the transliteration class).
- **A-7 Colour independence.** Doshas are lac beads **and** labelled text; boundary badges are asterisks **and** footnoted; palm confidence is ink darkness **and** a number; the Rahu Kaal band has a time range in text.
- **A-8 Reduced motion + "Calm desk".** Both the OS media query and the in-Drawer switch independently disable flicker, rustle and inertia; drums/ribbon/loupe/stylus still follow the finger (VT-8 covers the animation side).
- **A-9 Zoom and text scaling.** 200 % browser zoom: no horizontal scrollbar, the paper column reflows, rollers stay pinned. System font scale 1.3×: the ledger switches to the stacked two-line row (DESIGN §14) with no clipped degree strings.
- **A-10 Keyboard modes.** Drums are `spinbutton`s with arrow keys and typed entry; the loupe has a Tab-through-planets mode with Enter to read; the stylus has a keyboard fallback (select a line, arrow keys nudge the active handle by 1 px, Shift+arrows by 10).
- **A-11 Manual, before each tag.** TalkBack on the phone through Vyom → leaf → Patri → loupe → Hast → Milan; NVDA + Firefox on desktop through the same; one full keyboard-only cast with no mouse.

---

## 10. Security and privacy checks (blocking)

Vyom holds other people's birth data and hand photographs in a public-repo app. These run on every PR.

- **P-0** `scripts/check-no-biometrics.mjs` (§2.4) — no real photos, no EXIF, no oversized PNGs in the tree.
- **P-1 Zero leakage (GOAL §5.6).** `privacy.spec.ts` installs `page.on("request")` with an allow-list of the **own origin only** and walks: home → leaf entry (typing a place name character by character) → cast → Patri → loupe → varga pager → Today → Circle → Hast (capture + trace) → Milan → Rooftop → Drawer. **Zero** off-origin requests. Then it taps "search online ⌑" once and asserts exactly one request to `geocoding-api.open-meteo.com`, and on submit at most one to `nominatim.openstreetmap.org` — never on a keystroke (RESEARCH §3: Nominatim forbids autocomplete).
- **P-2 CSP.** `index.html` carries `default-src 'self'; script-src 'self' 'wasm-unsafe-eval'; worker-src 'self' blob:; connect-src 'self' https://geocoding-api.open-meteo.com https://nominatim.openstreetmap.org; img-src 'self' blob: data:; media-src 'self'; style-src 'self' 'unsafe-inline'; object-src 'none'; base-uri 'none'; form-action 'none'`. The test asserts the tag **and** that MediaPipe + OpenCV still initialise (`'wasm-unsafe-eval'` is what lets them compile; dropping it silently breaks the palm screen).
- **P-3 No analytics, ever.** A grep test over `src/` and `dist/` for `gtag`, `analytics`, `sentry`, `posthog`, `plausible`, `beacon(`, `navigator.sendBeacon` — zero hits (D5.5).
- **P-4 Palm Blobs never leave IndexedDB.** No `URL.createObjectURL` result is ever assigned to an `<a download>` or a `fetch` body outside the export path; the export path encrypts first (CR-3).
- **P-5 Export hygiene.** The `.chowki` envelope is AES-GCM ciphertext plus `{ v, kdf, salt, iv }` — grep it for the profile name, the place name and the string `data:image` (CR-3). Import of a file with a newer `v` refuses with a lac note rather than guessing.
- **P-6 Licence gate.** `scripts/check-licences.mjs` fails if any dependency's licence is not in the MIT/Apache-2.0/BSD/ISC/MPL-2.0/Unlicense/CC0/OFL set, or if any of `pyswisseph`, `@kuntay/swisseph`, `@swisseph/browser`, `swisseph-wasm`, `sweph-wasm`, `PyJHora`, `gsap`, `rita` appears anywhere in `package.json` (D5.1, GOAL §6). It also asserts `README.md` contains an **Attribution** section naming GeoNames (CC BY 4.0), MediaPipe (Apache-2.0), BSC5 (public domain), astronomy-engine (MIT), the OFL fonts and the CC0 sound list (D5.4).
- **P-7** `npm audit --audit-level=high` clean.
- **P-8** The disclaimer string ("Based on classical Jyotisha / Samudrika Shastra texts. For reflection and fun — not medical, legal or financial advice.") is present in every colophon and in the palm findings; PRD-2's banned-word scan runs over the *rendered* Patri and Hast screens too, not just the templates.

---

## 11. Day-1 verification list

From RESEARCH §10 "Open questions" and the Verification log's "Still open" rows. Run these **before feature work** (D9.1). Each has a concrete method, a pass condition and a fallback that is already decided. Record every result (date, tool version, device, WebView version) in `docs/VERIFICATION-LOG.md` under the same V-numbers.

| # | Claim to verify | How (concrete) | Pass | Fallback if it fails |
|---|---|---|---|---|
| V-1 | Drik's Lahiri is a **mean** Lahiri with J2000 base ≈ 23.86380°, i.e. exactly **+24.3″** above SE-mean, on more than the four sampled dates | Read "Lahiri Ayanamsha" from drikpanchang.com day-panchang pages for 10 dates: 1930-01-01, 1950-06-15, 1956-03-21, 1975-01-01, 1990-07-01, 2000-01-01, 2010-01-01, 2020-01-01, 2025-01-01, 2026-01-01 (by hand, screenshots to `docs/oracles/`) | `drik − SE-mean` is constant within **0.5″** on all 10, pre-1956 included | The Drik preset becomes a small lookup + interpolation table instead of a constant; label it "Drik-compatible (fitted)" in the Drawer and say so in the colophon |
| V-2 | JHora's displayed Lahiri equals SE-true (the four check values in RESEARCH §5.4 are marked "could not be independently verified") | Install JHora (free, Windows) or run `swetest -p0 -b1.1.2000 -ut0 -sid1 -fPl`; compare all four | Agreement ≤ 1″ | Drop the JHora column; `swetest` alone is the oracle for SE presets and the doc says so |
| V-3 | Drik's and JHora's **default node type** (true vs mean) | Compare Rāhu's longitude for the reference chart on both against our two node implementations | One matches within 1′ and the other is ~1° away → that is the default | Ship `true` as the default (RESEARCH §5.3) and put the choice on the colophon; add a one-line note in the Drawer |
| V-4 | Panchang **sunrise convention** (upper limb + refraction vs disc centre) | For Bengaluru, Delhi, Chennai, Kolkata, Ahmedabad on 5 dates, compute both and diff against Drik's printed sunrise | One convention is within 60 s on ≥ 24 of 25 | Ship both, default to the closer one, expose the setting (it is already in DESIGN §9.10) and footnote every end time |
| V-5 | Ashtakoota agreement is genuinely 100 % over 11,664 pairs — in particular the **Gana** and **Bhakoot cancellation** tables, which RESEARCH §5.11 flags as school-dependent | Convert PyJHora's `all_nak_pad_boy_girl.csv` outside the repo; run AK-1 | 11,664 / 11,664 | Adopt PyJHora's tables verbatim as *the* school, name it in the colophon ("Ashtakoota after PyJHora / PVR Narasimha Rao"), and record the deviating rows in this file |
| V-6 | `astronomy-engine` 2.1.19 installs under Vite 8 / TS strict and `Ecliptic(GeoVector(b, t, true))` really is true-of-date | `npm i astronomy-engine@2.1.19`; run E-1 against 5 swetest charts | ≤ 60″ on all 45 longitudes | `astronomia` 4.2.0 behind the same `Ephemeris` interface (RESEARCH §8 risk 5) |
| V-7 | `@ishubhamx/panchangam-js` 3.0.0 runs in a Vitest **node** test without an `fs` shim, and never reaches `dist/` | `test:oracle` + O-1/O-2/O-3 | Oracle tests run; `check-bundle.mjs` clean | Drop the oracle entirely (it is a convenience, not a dependency) |
| V-8 | `@photostructure/tz-lookup` 11.6.1 resolves the 12 birthplaces in the reference set to the right IANA zone (README warns ~10 % of inhabited coordinates differ from `geo-tz`) | Unit test over the 50 golden charts' coordinates | ≥ 49/50 correct; every miss is > 50 km from a city | Ship the GeoNames `timezone` column as the primary source (it is already in the dump) and use tz-lookup only for map-picked coordinates |
| V-9 | The **runtime tzdb** on the CI runner and on the phone's WebView knows both 1941–45 IST spells and MMT +05:21:10 | T-2 / the tzdb guard test, run in CI and in a `workflow_dispatch` APK with a debug screen printing `Intl` results | All 15 `timezones.json` rows pass on both | Bundle a minimal offset table for India/Nepal/Sri Lanka/Pakistan/Bangladesh pre-1955 and prefer it over `Intl` for those zones |
| V-10 | MediaPipe `HandLandmarker` with `delegate: "GPU"` initialises in the **Android System WebView** (not just Chrome) and beats WASM | Debug APK with a timing readout on the Hast screen; try GPU then CPU | GPU init succeeds and is ≥ 1.5× faster | `delegate: "CPU"` everywhere; the 3 s budget (GOAL §5.4) is re-measured and, if missed, the element/ratio reading ships first and lines become a second tap |
| V-11 | `hand_landmarker.task` (7 819 105 bytes) self-hosted under `/jyoti/models/` is served with the right MIME and works offline | `curl -I` after the first Pages deploy; OF-3 | 200, `application/octet-stream`, cached by Workbox | Serve it from a GitHub Release asset and fetch cross-origin (D2 allows this for > 25 MB assets; ours is smaller, so this is only a fallback) |
| V-12 | `@techstark/opencv-js` **4.12.0-release.1** builds under Vite 8 with `fs/path/crypto` fallbacks and lazy-loads only on Hast | `npm i`; build; check the chunk graph and the home-screen network log | Chunk exists, is not requested on `#/`, PLN-1 passes | The pure-JS/WebGL ridge filter (RESEARCH §8 risk 7) — plan B is already scoped at ~200 lines |
| V-13 | OpenCV `Mat` lifetime in the WebView: a full palm run twice in a row does not grow the heap | PLN-6 in CI + the memory row in §8 on the phone | Heap returns within 10 % | Move the CV pass into a Worker with a fresh module instance per run |
| V-14 | Three.js r185 + R3F 9 dome renders in the Android WebView at DPR ≤ 1.5 without a context loss on a 2022 mid-range phone | Debug APK, Rooftop screen, 2-minute scrub | ≥ 40 fps, no `webglcontextlost` | Painted SVG sky becomes the default on Android with the dome behind a Drawer opt-in (the fallback already exists, DESIGN §9.6) |
| V-15 | BSC5 is genuinely public domain and a ≤ 60 kB binary of ~9 100 stars is enough for the dome (RESEARCH §3 marks it "likely") | Download from HEASARC, read the catalogue's own terms, build the binary, count stars ≤ mag 6 | PD confirmed, file ≤ 60 kB | HYG v4.4 with a **CC BY-SA** credit on the star file only (never the code) — or ship only the 88 constellation-defining stars |
| V-16 | GeoNames `cities500` + `IN/NP/LK/PK/BD` subset compresses to ≤ 1.8 MB gz and searches in ≤ 60 ms | Build the dataset; `perf/gazetteer.spec.ts` | Both budgets met | Drop the world tier to ≥ 50 k population and lean on the online lookup for the rest |
| V-17 | Open-Meteo Geocoding and Nominatim still send `access-control-allow-origin: *` to a `github.io` origin | `curl -H "Origin: https://<owner>.github.io" -I` on both, after the first deploy | `*` on both | Both are optional; the offline gazetteer is the product. Remove the online stamp rather than add a Worker |
| V-18 | Pages serves `manifest.webmanifest`, `sw.js` and the `.task` model under `/jyoti/` with correct MIME and the PWA is installable | `curl -I` + DevTools → Application after the first deploy | 200s, installable | Rename the manifest to `manifest.json`; move the model to a Release asset |
| V-19 | Capacitor 8 + `setup-java@v6` Temurin 21 builds a **signed** APK on `ubuntu-24.04` and it installs on the owner's phone | `workflow_dispatch` run before any tag | `app-release.apk` (not `-unsigned`), installs, opens | The pitfalls in ANDROID-PACKAGING §"Pitfalls" 1–6 are the checklist; nothing here is novel |
| V-20 | `@capacitor/camera` `resultType: Uri, quality: 90, width: 1600` returns a usable image on Android 14+ **partial photo access**, and `getUserMedia` (for the live gauges) works with only `CAMERA` declared | Debug APK: shutter path and gallery path, granting "Select photos" rather than full access | Both return an image; gauges run live | Capture-only via the camera intent (no live gauges on Android); the web build keeps `getUserMedia` |
| V-21 | Predictive back (Android 16 default) fires `@capacitor/app`'s `backButton` so "return to Vyom" works | Debug APK: open the Drawer, swipe back; open the loupe, swipe back | Sheet/loupe closes, root back exits | `android:enableOnBackInvokedCallback="false"` on `<application>` (documented temporary opt-out) |
| V-22 | Fontsource subsets of Yatra One / Tiro Devanagari Hindi / Martian Mono render Devanagari conjuncts correctly after `pyftsubset` and stay ≤ 260 kB | Build the subsets; render `जन्म पत्री · शुक्ल चतुर्दशी · अनुराधा` in Chrome, Firefox and the WebView; compare with the unsubset face | No broken conjuncts, no tofu, ≤ 260 kB | Keep the full Devanagari coverage (larger) or drop the Devanagari chart-label toggle to Latin-only for v1 |
| V-23 | Google developer verification: the free limited-distribution account is available for the owner's region | Android Developer Console | Registered before the regional flip | `adb install` (exempt) or the user-side advanced flow, documented in the README |

---

## 12. Manual QA checklist — Android build

Run on the owner's phone with the APK from a `workflow_dispatch` run or the tagged Release. Note **device model, Android version and Android System WebView version** (from `chrome://inspect` or Settings › Apps) at the top of each run. Vyom's risky rows are camera, WebGL and the historical-date engine — there are no notifications in v1, so those rows are intentionally absent.

**Install & identity**
- [ ] I-1 Sideload from the Releases page in Chrome; "install unknown apps" is asked once; the downloaded `SHA256SUMS.txt` matches.
- [ ] I-2 Installing a newer tag over the old one keeps every profile and palm photo (no uninstall); the Drawer colophon shows the new `versionName`.
- [ ] I-3 Adaptive icon: brass diya with a vermilion flame tip on teak `#1A110B`; monochrome layer present on Android 13+; splash is teak with the diya, fading into the desk in ~240 ms with no double splash.
- [ ] I-4 App name **Vyom**; package id unchanged from the first install.

**First open & offline**
- [ ] F-1 First launch with **airplane mode on**: the Vyom renders, fonts are correct, "Write your first leaf" is shown, and a full cast completes (GOAL §5.1).
- [ ] F-2 No permission prompt appears until the camera is actually used.
- [ ] F-3 Cast the reference chart on the phone and compare every graha degree with the desktop build — identical to the arcsecond.

**Camera & palm (the reason this app is native)**
- [ ] C-1 First tap on Hast → the Android camera permission prompt; deny → gallery-only path with a plain note and no crash; grant later from Settings → live gauges appear.
- [ ] C-2 Guided capture: the chalk outline is visible on the preview; sharpness/exposure gauges move as the phone moves; the shutter enables only when a hand is detected (V-10, V-20).
- [ ] C-3 Shutter → landmarks over the photo → element + ratios in **< 3 s** (time it).
- [ ] C-4 "Pick from gallery" with **"Select photos"** (partial access) chosen rather than "Allow all" → the picked image still loads; no empty-library state.
- [ ] C-5 Line extraction: first run shows "sharpening the stylus…" while OpenCV loads, then draws lines; second run is fast; the phone does not heat noticeably after three runs (memory row, §8).
- [ ] C-6 Low-confidence photo (shoot deliberately in poor light) → dashed faint lines + haldi note + stylus opens automatically.
- [ ] C-7 Stylus trace with a finger: three paths, handles draggable, reading recomputes in < 1 s.
- [ ] C-8 "Burn this print" (hold) removes the photo; re-entering shows the empty frame; the photo is gone from the app's storage (re-open after force-stop).
- [ ] C-9 Rotate the phone during capture → no crash, the preview re-lays out (Rooftop is the only landscape-allowed screen; Capture stays portrait).
- [ ] C-10 Take a photo, then background the app for 5 minutes and return → the ROI and reading are still there (Activity restart survived).

**Navigation, insets, gestures**
- [ ] G-1 Edge-to-edge: the parapet strip starts below the status bar; the Ledge sits above the gesture bar; status-bar icons are light on the night desk and dark on the morning terrace.
- [ ] G-2 Predictive back with the Drawer open shows the drawer sliding, not the app minimising (V-21); back on the Vyom exits.
- [ ] G-3 Horizontal gestures (varga pager, chart flip, Moon pager) never trigger system back — they start ≥ 24 px from the edges.
- [ ] G-4 Drum flick: BRASS inertia coasts, detents click, haptics tick once per detent, never a runaway spin.
- [ ] G-5 Loupe follows the finger 1:1 with no lag; dragging it across the chart snaps planet to planet.
- [ ] G-6 Mala: 36 beads slide in ≤ 3.5 s; tapping mid-run finishes instantly.
- [ ] G-7 Scroll the Patri end to end: rollers thicken/thin, no jank, the paper rustle follows scroll velocity and is silent below a slow scroll.

**Display, rotation, scaling**
- [ ] L-1 Rotate to landscape on the Patri: the paper column reflows, rollers stay pinned, no clipped ledger; rotate back and the scroll position is preserved.
- [ ] L-2 Rooftop in landscape: the dome fills the screen, the scrub ring is reachable one-handed.
- [ ] L-3 On a tablet/foldable ≥ 600 dp (if available): the desktop desk layout appears and orientation is not locked (Android 16 ignores locks at that size).
- [ ] L-4 System font size at "Largest": the ledger switches to the stacked two-line row; nothing truncates; Ledge labels remain legible.
- [ ] L-5 Dark/light system switch with Lamp = auto → the desk changes; Lamp = lit ignores the system; paper and ink never change (DESIGN §4.2).
- [ ] L-6 1 px turmeric hairlines and 1.25 px ink strokes are crisp at DPR 2.625; the paper grain is not visible as noise at arm's length; no banding on the teak margins on an OLED.
- [ ] L-7 Devanagari conjuncts render correctly in Yatra One and Tiro at every size (V-22); Devanagari-digit mode shows `२३°५१′` in the ledger while drums stay Latin.

**Rooftop / WebGL**
- [ ] S-1 The painted sky appears first, then the dome crossfades in; scrubbing ±12 h moves the sun/Moon/planets sensibly (the Moon's phase matches the tithi).
- [ ] S-2 Two minutes of scrubbing: no context loss, no overheating warning, ≥ 40 fps by eye (V-14).
- [ ] S-3 Background the app while the dome is open and return → the dome resumes; no black canvas.
- [ ] S-4 Poster export saves a 1080 × 1920 PNG through the share sheet.

**Data & export**
- [ ] D-1 Export (wax envelope) with a passphrase → share sheet → the file saves; import it back on the same phone → three profiles restored, palm photos intact.
- [ ] D-2 Import with a wrong passphrase → lac note, nothing changes.
- [ ] D-3 Clear the app's **cache** (not data) → nothing lost; the model and OpenCV re-download on next use (or are still in the APK's assets — verify which).
- [ ] D-4 Force-stop mid-cast → relaunch → no corrupt profile; the leaf either saved or did not.

**Sound & haptics**
- [ ] H-1 Sounds default on and respect the phone's silent switch/DND; the Drawer's master mute silences everything.
- [ ] H-2 Haptics: `impact Medium` on the seal and the tilak, `selectionChanged` on drum detents / sign crossings / bead slides, `impact Heavy` at the end of a Burn hold; none on plain scrolling.
- [ ] H-3 "Calm desk" on → no flicker, no rustle, no inertia; haptics unchanged.

**Debugging**
- [ ] X-1 A `workflow_dispatch` build with `webContentsDebuggingEnabled: true` is inspectable from desktop Chrome `chrome://inspect#devices`; the tagged release build is **not**.

---

## 13. Release gate (what must be green before `git tag v*`)

1. `npm run test:unit` — 0 failures; coverage thresholds met (100 % on the six named engine modules).
2. `npm run test:oracle` — the swetest/PyJHora/Drik fixture diffs are all within tolerance; any new deviation is documented in §2.1 with a reason.
3. `npm run build && npm run test:e2e` — `desktop-chromium` and `pixel-7` green (1 retry allowed).
4. `npm run test:visual` — no unexpected diffs; VT-1…VT-8 pass; intentional diffs have updated baselines in the same PR with before/after in the description.
5. `npm run test:a11y` — 0 serious/critical; A-1 contrast table exact.
6. `npm run test:privacy` — P-0…P-8 all pass. **This one is never waived.**
7. `npm run test:perf` — every §8 budget met, including initial JS ≤ 350 kB gz and APK ≤ 40 MB.
8. Every §11 item touched by the change is re-verified (at minimum V-1/V-3/V-4 whenever anything under `src/engine/ayanamsa|nodes|sunrise` changed; V-10/V-12/V-13 whenever `src/palm` changed).
9. §12 completed on the phone with a `workflow_dispatch` APK **of the release commit**; results appended to `docs/VERIFICATION-LOG.md`.
10. Then follow `docs/DEPLOYMENT.md` §9 (release checklist) — and note its §8: no Swiss Ephemeris / PyJHora / GSAP may have crept into `package.json`.
