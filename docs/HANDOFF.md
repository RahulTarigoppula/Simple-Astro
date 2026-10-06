# Hand-off — what is built, what only you can do

Written 2026-10-06 at the end of the first build session. The code, tests, CI workflows and the
Android shell are in this repository and committed on `main` locally. **Nothing has been pushed
anywhere** — creating a public repo, a keystore and secrets needs your accounts and your decisions.

## 1. Publish the web build (≈ 10 minutes)

```powershell
winget install GitHub.cli          # gh was not installed on this machine
gh auth login
cd C:\Work\Personal_Projects\02-jyoti-astrology-palmistry
gh repo create jyoti --public --source . --push
gh api -X POST repos/{owner}/jyoti/pages -f build_type=workflow
gh run watch                       # "Deploy to GitHub Pages" → https://<owner>.github.io/jyoti/
```

Then on the phone: open the URL in Chrome → *Install app*. It works offline after the first load;
Drawer → **Prepare for offline** also caches the palm model and the sky.

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
gh secret set ANDROID_KEYSTORE_BASE64 --body (Get-Content "C:\Work\jyoti-release.p12.b64" -Raw).Trim()
gh secret set ANDROID_KEYSTORE_PASSWORD     # the passphrase you typed
gh secret set ANDROID_KEY_ALIAS --body release
gh secret set ANDROID_KEY_PASSWORD          # the same passphrase
git tag v0.1.0; git push origin v0.1.0      # → signed APK + SHA256SUMS on the Release
```

Back up `jyoti-release.p12` and its passphrase in two places before anything else — a lost key means
the phone refuses updates. A `workflow_dispatch` run without secrets still produces an *unsigned*
APK artifact for a smoke test; a tag without secrets fails on purpose.

## 3. Things to run once on your own machine

- **Biome** could not start in this session (Windows blocked `biome.exe` with `spawnSync UNKNOWN` —
  probably Smart App Control / Defender on a freshly downloaded binary). CI runs `npx biome ci .` on
  Linux. Run `npx biome check --write .` once locally (or let the first CI run tell you) and commit
  the formatting.
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
| Ashtakoota follows the PyJHora *school* (Varṇa, Vaśya, Yoni, Gaṇa tables) but **not** its three bugs | Inverted Tārā, one wrong Bhakūṭa cell, a pada-based Dhanu/Makara Vaśya split. Raw match is 6 436 / 11 664; with those three defects modelled in the test, 11 664 / 11 664. Revatī × Rohiṇī scores **19** (PyJHora also says 19), not the doc's 20. |
| Sounds are synthesised with Web Audio (no Howler, no samples) | Zero bytes, nothing to license, no freesound account needed. |
| Gazetteer uses a custom compact index (no MiniSearch) | MiniSearch held ~120 MB of heap — too much for a 4 GB phone. Now 12.6 MB, ≤ 9 ms per search. |
| `shadcn/ui` not used; dialogs are native `<dialog>` | Focus trap, Esc and `aria-modal` come free, and no CLI/network step. |
| `INTERNET` stays in the Android manifest | It is an install-time *normal* permission needed for the opt-in place search; the only runtime permission is CAMERA. |
| CSP adds a `sha256-…` for the tiny theme boot script and `data:` in `font-src` | Otherwise the no-flash theme bootstrap is blocked. |
| Vitest 5 instead of 3 | Vitest 3 does not support Vite 8. |
