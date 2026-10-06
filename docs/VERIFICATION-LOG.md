# Verification log

Day-1 claims (IMPLEMENTATION-PROMPT §10.8) and the gates, as measured on 2026-10-06 on the build
machine (Windows 11, Node 22.17.0, Chrome via Playwright 1.5x). Phone rows wait for a device.

| # | Claim | Result | Evidence |
|---|---|---|---|
| V-1 | Drik's Lahiri = SE-mean + 24.3″ | **Open** — needs 10 dates read by hand from drikpanchang.com | `drik-mean` preset ships as specified |
| V-2 | JHora/SE Lahiri at 2000-01-01 0h UT ≈ 23°51′11″ | **Pass** — SE gives 23°51′11.53″ (doc 11.3″) | `src/engine/__fixtures__/oracle-notes.md` |
| V-3 | Node type of the reference numbers | **Found:** §0.1a used the **mean** node; true node gives Rāhu 211.8219° (Viśākhā 4) | oracle-notes.md; default stays `true` |
| V-4 | Panchang sunrise convention vs Drik | **Open** — needs 25 hand-read sunrise times | both conventions ship; footnotes name the one used |
| V-5 | Ashtakoota 100 % vs PyJHora | **Partial:** 6 436 / 11 664 raw; 11 664 / 11 664 once three PyJHora defects are modelled (inverted Tārā, Karka×Kumbha Bhakūṭa cell, pada-split Vaśya) | `src/engine/ashtakoota.oracle.test.ts` |
| V-6 | astronomy-engine under Vite 8 + TS strict, true-of-date | **Pass** — 50 charts within 20″ of Swiss Ephemeris (Moon 4″, Lagna 0.3″) | `src/engine/golden.test.ts` |
| V-7 | panchangam-js runs in Node tests and never reaches `dist/` | **Pass** | oracle project; `scripts/check-bundle.mjs` |
| V-8 | tz-lookup on the golden coordinates | **Pass** (50/50 via the time tests) | `src/engine/time.test.ts` |
| V-9 | Runtime tzdb knows IST war spells and Madras +05:21:10 (Node) | **Pass** in Node 22 under three TZs; phone WebView **open** | tzdb guard test |
| V-10 | MediaPipe GPU delegate in the Android WebView | **Open** (device) — loads in 0.6 s in desktop Chrome from self-hosted assets | `src/features/hast/mediapipe.ts` |
| V-11 | Model self-hosted under the sub-path | **Pass** locally (`/jyoti/models/hand_landmarker.task`, 7 819 105 B, runtime-cached) | `src/data/palm-model.json` |
| V-12 | OpenCV builds under Vite 8 and stays lazy | **Pass** — separate chunk, not requested on `#/` | build output; privacy spec |
| V-15 | BSC5 public domain, ≤ 60 kB | **Pass** — 9 096 stars in 45 492 B (5 080 are V ≤ 6.0; the rest fade) | `scripts/build-stars.mjs` |
| V-16 | Gazetteer ≤ 1.8 MB gz, search ≤ 60 ms | **Pass** — 1 775 407 B, 82 505 places, ≤ 9 ms per search, 12.6 MB heap | `src/data/places.test.ts` |
| V-17/18/19/21/22/23 | Pages, CORS from github.io, signed APK, predictive back, WebView fonts, developer account | **Open** — need the GitHub repo, keystore and a phone | docs/HANDOFF.md |

## Gates run locally

| Gate | Result |
|---|---|
| Vitest `engine` project | 470+ tests pass (engine, golden, oracle, data, palm, sky) |
| Vitest `dom` project | 20 tests pass (Today, Circle, Milan) |
| Playwright (desktop-chromium + pixel-7) | 18 / 18 pass: smoke, golden numbers on screen, zero leakage, CSP, axe (no serious/critical on 8 routes), offline after one visit |
| `check-licences.mjs` | 123 production packages, all OSI/OFL/CC0; no banned names |
| `check-no-biometrics.mjs` | no photographs, no EXIF, synthetic PNGs only |
| `check-bundle.mjs` | initial JS ≈ 229 kB gz (budget 350), CSS ≈ 13 kB gz (budget 30); no forbidden module |
| Precache | ≈ 4.2 MB (budget 6 MB); model, wasm, OpenCV and the dome are runtime-cached |
| `computePatri` | median 3.8–5.7 ms in Node (budget 60 ms) |
| Biome | **not run** — `biome.exe` is blocked on this machine; CI runs it on Linux |
