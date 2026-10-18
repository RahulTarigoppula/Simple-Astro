# Vyomaphala

*Vyomaphala (व्योमफल) is Sanskrit for "the fruit of the sky": vyoma, the heavens, and phala, what they yield, the same phala as in phalita jyotiṣa, the predictive branch of Indian astrology. Indian astrology under a live sky, explained in plain English, with the myths behind every star.*

**Live:** https://rahultarigoppula.github.io/Simple-Astro/ · **Repo:** [Simple-Astro](https://github.com/RahulTarigoppula/Simple-Astro)
**Status: v1.2.0 (2026-10-18).** Made by Rahul (RT): **252 hours of work and dedication** (18 weeks × 7 days × 2 hours a day) of planning, building, gathering and cleaning data, and checking every chart. What changed is in [CHANGELOG.md](CHANGELOG.md); what was measured is in [docs/VERIFICATION-LOG.md](docs/VERIFICATION-LOG.md).

## Summary

- **1.2.0:** the app is now **Vyomaphala**, "the fruit of the sky" (vyoma + phala); same engine, same data, nothing saved is lost.
- **1.1.0:** Add a person is now impossible to get wrong by accident: day, month and year boxes, a **12-hour clock with am/pm** read back in words ("7:25 in the evening"), a **place that must be chosen** (nothing is assumed), and a **Check before you save** card showing the Moon sign, birth star and rising sign before anything is stored. Every birth time prints with am/pm.
- **1.0.0:** **Your life, in simple words** on every chart (Moon sign, birth star, numbers, plus and minus points, love, work, your life chapter now), with the astrology behind **Full detail (astro tech)**. **Partner Compatibility** with a score out of 100, five plain bars and **Signs of marriage**. A plain Home: what Vyomaphala can do, how to use it, how it was made, and your privacy. North Indian, Telugu or Tamil names per person. Always updates itself without touching saved data.
- **0.5.0:** **Explore** is an interactive **Sky Wheel**, drag it, tap any planet, sign or star for its real stars, myth and meaning, or play it as a full-screen **story**; **Roots** opens with the maker's own prologue on why Vyomaphala exists.
- **0.4.0:** renamed to **Vyomaphala**; **Forecasts** for the day, week, month, quarter and year (gochara from the Moon, Tārā/Candra-bala, daśā); **Explore**, the myths and meanings of the 9 grahas, 12 rāśis and 27 nakṣatras, numerology and the Chinese zodiac; a **cosmic profile** per person; **Coming up in the sky** with Moon phases, Ekādaśī, eclipses (visible here or not), sign changes and retrogrades; Navagraha medallions.
- **Astral design (0.3.0):** deep-space glass UI, a live sidereal zodiac wheel on Home, and plain-English help everywhere, an ⓘ beside every term, a Guide with the full glossary, and **Roots**, 16 story cards on the gods, sages, Greeks and astronomers behind Jyotiṣa, palmistry and numerology.
- A private, offline Jyotisha desk: write a "leaf" (name, birth date, time, place) and it casts a full Janam Patri, nine grahas in sidereal longitude, Lagna, Rāśi (D1) and Navāṁśa (D9) drawn in ink, nakshatra/pada, the Vimshottari dasha tree, birth panchang, and yogas cited to BPHS chapter and verse.
- Every number shows its work: ayanamsa preset (SE-true / SE-mean / Drik-compatible), resolved IANA zone and historical UTC offset, Julian Day, and a vermilion asterisk whenever a body sits within 2′ of a sign, pada or tithi boundary.
- Lay two leaves side by side and Guna Milan counts out on a real 36-bead mala; photograph a palm and MediaPipe finds 21 landmarks, OpenCV rectifies the print and traces heart/head/life lines, with a stylus fallback when the camera is unsure.
- Vite 8 + React 19 + TypeScript, Tailwind v4 tokens, Motion 13, Dexie 4, Zustand 5; the same `dist/` ships as an installable PWA on GitHub Pages and as a Capacitor 8 Android APK built and signed by GitHub Actions.
- Free, offline, no accounts, no analytics, no LLM in the core path; birth data and palm photos never leave the device unless the owner exports an AES-GCM-encrypted envelope.

## Documents

| File | What |
|---|---|
| [docs/IMPLEMENTATION-PROMPT.md](docs/IMPLEMENTATION-PROMPT.md) | **Start here**, the self-contained build prompt; where it disagrees with any other doc, it wins |
| [GOAL.md](GOAL.md) | Goal statement, vibe, success criteria, non-goals, MVP ✅ / v1 🚀 / Someday 🔮 split |
| [docs/RESEARCH.md](docs/RESEARCH.md) | Verified library/API/ephemeris research with the adversarial verification log |
| [docs/DESIGN.md](docs/DESIGN.md) | "Vyomaphala" design system: tokens, type, motion, signature interactions, every screen |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Stack, data model, the engine and palm algorithms with worked examples, offline/Android, budgets |
| [docs/PLAN.md](docs/PLAN.md) | Phased build plan with checkboxes, definitions of done, the Weekend MVP path |
| [docs/TESTING.md](docs/TESTING.md) | Test map, golden-chart matrix, day-1 verification list, manual Android checklist |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Repo creation, Pages + APK pipelines, secrets, sideload, rollback, backups |
| [design/preview.html](design/preview.html) | The visual contract, five screens with a live embedded ephemeris; if the app looks worse than this, it is not done |
| [../\_shared/DECISIONS.md](../_shared/DECISIONS.md) | Cross-project binding decisions (this project is row 02 of §D8) |

## Run it

```bash
npm ci
npm run dev            # http://localhost:5173, the desk, fully offline after first load
npm run test:unit      # engine (golden charts, oracle, time zones), data layer, palm, screens
npm run build          # tsc + vite build into dist/ (Pages builds with VITE_BASE_PATH=/<repo>/)
npx playwright test    # smoke, zero-leakage privacy, axe, offline, against `vite preview --base /jyoti/`
```

On Windows Git Bash, prefix commands that pass `/jyoti/` with `MSYS_NO_PATHCONV=1` (Git Bash rewrites
leading-slash arguments into `C:/Program Files/Git/...`). PowerShell and CI are unaffected.

Useful one-off scripts (all outside-the-repo downloads are cached in `%TEMP%`):

| Script | What it does |
|---|---|
| `scripts/build-gazetteer.mjs` | GeoNames dumps → `src/data/geonames-in.json.gz` (≤ 1.8 MB gz, asserts its own size and must-resolve names) |
| `scripts/build-stars.mjs` | Yale BSC5 → `src/data/bsc5.bin` (9 096 stars, 45 kB) |
| `scripts/import-oracle.mjs` | PyJHora's 11 664-pair Ashtakoota CSV → `src/engine/__fixtures__/ashtakoota-oracle.bin` (numbers only) |
| `scripts/make-palm-fixtures.mjs` | synthetic palm PNGs for the CV tests (no real hands, ever) |
| `scripts/copy-mediapipe.mjs` | runs as `prebuild`: copies the MediaPipe wasm into `public/mediapipe/` |
| `scripts/check-licences.mjs` · `check-bundle.mjs` · `check-no-biometrics.mjs` | the three blocking gates CI runs |

## Ship it

- **Web:** every push to `main` runs `.github/workflows/pages.yml` and deploys to https://rahultarigoppula.github.io/Simple-Astro/.
- **Android:** see [docs/HANDOFF.md](docs/HANDOFF.md) §2, generate the release keystore once, add the four
  `ANDROID_*` secrets, then `git tag v0.2.0 && git push --tags` to get a signed APK on the Release.

## Attribution

Vyomaphala's own code is MIT. The classical tables (nakshatra lords, yoni animals, gana, nadi, varna, koota matrices, varga rules, yoga definitions) are **facts re-typed from Brihat Parashara Hora Shastra and Muhurta Chintamani**, not code copied from any implementation; PyJHora (AGPL-3.0) and Drik Panchang are consulted as validation oracles only and are never dependencies.

| Asset / library | Licence | Notes |
|---|---|---|
| `astronomy-engine` (Don Cross) | MIT | Tropical apparent longitudes, sidereal time, rise/set, Moon-phase search, the whole ephemeris lane |
| `@ishubhamx/panchangam-js` | MIT | Node-side panchang/dasha cross-check oracle, **devDependency only**, never in the browser bundle |
| `luxon` | MIT | Zoned birth times; historical offsets come from the browser's IANA tzdb |
| `@photostructure/tz-lookup` (Matt McEachen) | CC0-1.0 | lat/lon → IANA zone, 88 kB, bundled |
| GeoNames subset: `cities15000` (world) + full IN/NP/LK/PK/BD dumps + historical alternate names (IN/NP/LK/PK/BD/MM) | CC BY 4.0 | Offline birthplace search, credited in the Colophon and in `src/data/attribution.json` |
| Yale Bright Star Catalog (BSC5), NASA/HEASARC | Public domain (US Government) | ~9,100 stars for the Rooftop dome; HYG (CC BY-SA) deliberately avoided |
| MediaPipe `hand_landmarker.task` (Google) | Apache-2.0 (model card, Oct 2021) | 21 hand landmarks, self-hosted in `public/models` |
| `@mediapipe/tasks-vision` + its `wasm/` folder | Apache-2.0 | Self-hosted for offline use |
| `@techstark/opencv-js` 4.12.0-release.1 | Apache-2.0 | CLAHE, black-hat, Hessian, warpPerspective, lazy-loaded on the Hast screen only |
| Sora via `@fontsource-variable/sora` | SIL OFL 1.1 | Display: screen titles and headings |
| Inter (Rasmus Andersson) via `@fontsource-variable/inter` | SIL OFL 1.1 | Body text and labels |
| Noto Sans Devanagari (Google) via `@fontsource-variable/noto-sans-devanagari` | SIL OFL 1.1 | Devanagari names and terms |
| JetBrains Mono via `@fontsource-variable/jetbrains-mono` | SIL OFL 1.1 | Degrees, times and instrument labels |
| `dexie`, `dexie-react-hooks`, `dexie-export-import` | Apache-2.0 | IndexedDB profiles, palm Blobs, backup envelope |
| `three`, `@react-three/fiber`, `d3-geo` | MIT | Rooftop dome (lazy chunk), painted-sky fallback |
| `motion` | MIT | Ink draw (`pathLength`), springs, drag; **GSAP is not used** (non-OSI, and Motion covers the draw) |
| Desk sounds | CC0-1.0 (original) | Synthesised on the device with Web Audio, no samples, no Howler |
| React 19, Vite 8, React Router 7, Zustand, Tailwind CSS v4, vite-plugin-pwa (Workbox), Biome, Vitest 5, Playwright | MIT | Framework, build, tooling |
| Capacitor 8 and `@capacitor/*` plugins | MIT | Android shell, camera, haptics, filesystem, share, status bar, splash |
| Planet/nakshatra marks, desk objects, grain, seal edges, adaptive icon, poster template | Original artwork (CC0 within this repo) | Drawn on a 24-unit grid; no commercial glyph fonts |
| Swiss Ephemeris WASM (`@kuntay/swisseph`) | AGPL-3.0 | **Not a dependency.** Optional "precision mode" lane only; enabling it requires relicensing the repo (DECISIONS §D5.1) |

Runtime services (optional, user-initiated, no key, no account):

| Service | Terms | Use |
|---|---|---|
| Open-Meteo Geocoding API | Data CC BY 4.0; free tier non-commercial; ≤ 600/min, 5,000/h, 10,000/day | Only when the owner taps "search online" for a place missing from the bundle |
| Nominatim (OpenStreetMap) | ODbL data; ≤ 1 req/s, identifying User-Agent/Referer, **no autocomplete**, attribution required | Second fallback, on submit only, never per keystroke |

No other network request exists. No analytics, no telemetry, no accounts, no crash reporting.

## Disclaimer

Based on classical Jyotisha / Samudrika Shastra texts. For reflection and fun, not medical, legal or financial advice. Vyomaphala makes no predictions about health, death, fertility, wealth or legal outcomes, and sells nothing.
