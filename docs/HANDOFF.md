# Hand-off — what is built, what only you can do

Written 2026-10-06 at the end of the first build session. The code, tests, CI workflows and the
Android shell are in this repository and committed on `main` locally. **Nothing has been pushed
anywhere** — creating a public repo, a keystore and secrets needs your accounts and your decisions.

## 1. The web build — live

The code is on https://github.com/RahulTarigoppula/Simple-Astro (`main`). GitHub Pages deploys every push to `main` through
`.github/workflows/pages.yml` to **https://rahultarigoppula.github.io/Simple-Astro/**. On the phone: open it in Chrome → menu → *Install app*.
It works offline after the first load; Drawer → **Prepare for offline** also caches the palm model and the sky.

`.github/workflows/ci.yml` runs Biome, the scanners, all unit tests and the Playwright suite on every push;
a red CI run does not block the Pages deploy.

## 2. The Android APK (once, for the life of the app)

In **Git Bash, outside the repo** (`/c/Work` is not a git working tree):

```bash
cd /c/Work
openssl req -x509 -newkey rsa:4096 -sha256 -days 10950 -nodes -keyout jyoti.key.pem -out jyoti.cert.pem -subj "/CN=Chowki/O=Chowki/C=IN"
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

Back up `jyoti-release.p12` and its passphrase in two places before anything else — a lost key means
the phone refuses updates. A `workflow_dispatch` run without secrets still produces an *unsigned*
APK artifact for a smoke test; a tag without secrets fails on purpose.

## 3. Things to run once on your own machine

- **The phone checklist** (docs/IMPLEMENTATION-PROMPT.md §10.7) needs a real device: camera, haptics,
  edge-to-edge, predictive back, dome frame rate, install-over-update.
- **Drik Panchang comparison** (V-1, V-4): read 30 days of Bengaluru/Delhi/Chennai panchang names by
  hand into `src/engine/__fixtures__/panchang-drik.json` — scraping is deliberately not done.
- **Your own palm photos** go in `fixtures-private/` (git-ignored) for the ≥ 70 % confidence check.

## 4. Decisions taken while you were away (all reversible)

| Decision | Why |
|---|---|
| §0.1a planet longitudes replaced by Swiss Ephemeris values for Mars, Mercury, Venus, Jupiter | The doc's numbers were computed without precession (≈ 5′ off). The engine now agrees with Swiss Ephemeris (Moshier) within 20″ on 50 golden charts; Lagna within 0.3″. |
| Default node is the **true** node (as specified) | So the reference chart's Rāhu is Viśākhā 4 (true) rather than Anurādhā 1 (the doc's mean node). The Drawer switches it. |
| Ashtakoota has a Drawer **school** setting: **North Indian (common)** by default, or **PyJHora · saravali**; neither school's three PyJHora bugs are reproduced | The schools differ in Varṇa of earth/air signs, the Vaśya 5×5 (North table re-typed from onlinejyotish.com + ganeshmitra.co.in) and Yoni Aśva × Mṛga. The PyJHora school is oracle-checked: raw 6 436 / 11 664; with the inverted Tārā, the Karka × Kumbha Bhakūṭa cell and the pada-based Dhanu/Makara Vaśya split modelled, 11 664 / 11 664. Revatī × Rohiṇī scores **19** in both schools (PyJHora also 19), not the doc's 20. |
| Sounds are synthesised with Web Audio (no Howler, no samples) | Zero bytes, nothing to license, no freesound account needed. |
| Gazetteer uses a custom compact index (no MiniSearch) | MiniSearch held ~120 MB of heap — too much for a 4 GB phone. Now 12.6 MB, ≤ 9 ms per search. |
| `shadcn/ui` not used; dialogs are native `<dialog>` | Focus trap, Esc and `aria-modal` come free, and no CLI/network step. |
| `INTERNET` stays in the Android manifest | It is an install-time *normal* permission needed for the opt-in place search; the only runtime permission is CAMERA. |
| CSP adds a `sha256-…` for the tiny theme boot script and `data:` in `font-src` | Otherwise the no-flash theme bootstrap is blocked. |
| Vitest 5 instead of 3 | Vitest 3 does not support Vite 8. |
| Palm confidence adds a ridge-clarity factor; sharpness gauge uses half the Laplacian | Without them a blurred print scored ~0.95 and a 9×9-blurred checkerboard read as sharp. Calibrate both on real photos in `fixtures-private/`. |
| MediaPipe's `*_module_internal` wasm is not copied | The non-module loader never uses it; it saved 12 MB of APK. |
| The Rooftop dome is always night cloth | It shows the sidereal zodiac and the stars at the birth moment even for a daytime birth — a star map, not a weather report. |

## 5. Known gaps (next session)

- Device-only checks: GPU delegate, `getUserMedia` inside the WebView, haptics, predictive back, dome frame rate.
- The Hindi/Tamil/Telugu UI is not built (the Drawer shows them as "on the way").
- The porutham tables follow one Tamil school from memory — worth a read by someone who practises it.
- MediaPipe tries to post telemetry to `odml.pa.googleapis.com`; the CSP blocks it (console noise only).
