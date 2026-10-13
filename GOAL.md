# Jyoti, The Indian Astrology & Palmistry Companion

**Codename:** Jyoti (project 02 of 8) · **App / brand name:** Chowki (चौकी, the low teak desk a Jyotishi works at) · **Repo:** `jyoti`
**Tagline:** *Your Janam Patri, written in ink under one lamp.*

Status: **Planned, not started.** Binding inputs: `_shared/DECISIONS.md` (D1-D9), `docs/RESEARCH.md` (verified 2026-09-06), `docs/DESIGN.md` (Chowki design system v1).

---

## 1. The idea

**In the owner's words:** "A private, localized app for me and a close circle to generate Vedic (Jyotisha) astrology insights and palm readings from birth details and hand photos. Mystical but modern; deeply personal, authentic Indian astrology, no Western zodiac fluff. Android, with the camera for palm photos and private local profiles for friends."

**Sharpened:** Chowki is an offline, on-device Jyotisha instrument. You write a "leaf" (name, birth date, time, place) and it casts a full Janam Patri, nine grahas in sidereal longitude to the arcsecond, Lagna, Rāśi (D1) and Navāṁśa (D9) charts drawn in ink, nakshatra and pada, Vimshottari dasha tree, the panchang of the birth moment, and a list of classical yogas each cited to its source text. Lay two leaves side by side and it counts Guna Milan on a 36-bead mala. Photograph a palm and it finds the hand's landmarks, rectifies the palm, traces the heart, head and life lines, and reads them by Samudrika Shastra, honestly, with confidence shown as ink darkness and a stylus to trace by hand when the camera is unsure. Every number shows its work: ayanamsa preset, UTC offset, Julian Day, rule citation. Nothing leaves the phone.

## 2. Who it's for

- **The owner**, the primary user, who wants a correct, auditable Vedic chart engine he can trust over a website's black box, and wants it beautiful enough to show.
- **A close circle** (family, ~10-20 friends) whose leaves live only on the owner's device. They will see the app over a shoulder or receive a poster/export, never an account.
- **Future self, learning Jyotisha**, the citations, the "near boundary" badges and the preset dial turn the app into a study tool, not just a fortune machine.

Not for the public, not for the Play Store, not for astrologers selling remedies.

## 3. Why it will be fun and valuable

- **Correctness is the delight.** Comparing the app's tithi, nakshatra and ayanamsa with Drik Panchang and JHora and seeing them agree to the arcsecond is the payoff of building your own engine (RESEARCH §5.4 documents exactly where and why they differ, 19-41″).
- **It is a family object.** Casting a grandparent's chart from a 1943 Calcutta birth (with the +06:30 war-time offset resolved automatically) and reading the Vimshottari ribbon across their life is a real conversation starter.
- **The palm feature turns a hard CV problem into a craft.** Guided capture, a brass loupe, ink lines drawing themselves over your print, and a stylus for tracing, the honesty is part of the aesthetic.
- **Screenshot-worthy without a single cliché.** Rollers, a lac seal, a sindoor tilak, a 36-bead mala, a true birth sky over a rooftop parapet, deeply Indian, physically believable, and none of it is "stars on navy with gold serif".
- **It is a study of the tradition.** Every reading sentence starts "Tradition says…" and ends in a superscript citation (BPHS chapter and verse); tapping it shows the chart element that fired the rule.

## 4. The vibe

**Weighted · Devout · Exact.**

A low teak desk on a night rooftop, lit by one brass diya. Handmade paper owns 85-92 % of every screen; teak and indigo cloth are margins. Objects have mass and a material, paper, brass, thread, ink, and each material has its own spring. Ink is drawn, never faded; numerals set digit by digit; the diya flicker is the only ambient motion. The visual vocabulary is the real one, patri scrolls on rollers, palm-leaf bundles tied with mauli thread, kumkum, lac seals, a brass panchang dial, used with respect rather than as ornament. The desk is an instrument, not a fortune-teller: degrees to the arcsecond, ayanamsa preset and UTC offset engraved beneath every chart. It must never look like a tarot app, a wood-textured skeuomorph, a "stars on navy" horoscope app, or Napkin (project 03).

## 5. Success criteria (measurable)

1. **Cast in under a blink.** From "hold to seal the leaf" to a fully computed Patri (9 grahas, Lagna, D1 + D9, nakshatra/pada, Vimshottari MD/AD/PD, birth panchang, ≥ 10 yogas) in **< 100 ms** of compute on a 2022 mid-range Android WebView; the ink-draw of the North chart completes in **≤ 1.5 s**; everything works in airplane mode.
2. **Arcsecond honesty.** With the `Lahiri (SE, true)` preset, graha and Lagna longitudes are within **1′** of `swetest` (Swiss Ephemeris) on **≥ 50 golden charts** spanning 1900-2030 and 5 continents; with the `Lahiri (Drik-compatible)` preset, tithi, vara, nakshatra, yoga and karana **names** match drikpanchang.com on **30 consecutive days** for Bengaluru, Delhi and Chennai (100 %).
3. **History resolved.** A leaf for 1943-06-01 06:00 Calcutta resolves to **+06:30** (war time), one for 1900 Madras to **+05:21:10**, and the Bombay Time override (+04:51) is one drum away; the resolved zone, offset and JD are engraved on the leaf.
4. **Palm in three seconds.** Photo → 21 landmarks → hand-shape element and finger ratios in **< 3 s** on the same Android device; heart, head and life lines are detected with confidence **≥ 0.6 on ≥ 70 %** of evenly lit photos from the owner's circle; on the rest the stylus trace mode appears automatically and produces a reading in **< 1 s** after the third path is committed.
5. **Guna Milan is oracle-exact.** The 36-point Ashtakoota score matches PyJHora's `all_nak_pad_boy_girl.csv` on **100 % of the 11 664** (108 × 108 nakshatra-pada) pairs, and the 36 beads finish sliding in **≤ 3.5 s** (tap to skip).
6. **Zero leakage.** After install, a Playwright network log shows **no requests** except on an explicit "search online" tap; profile export is AES-GCM-encrypted with a passphrase and imports back byte-identical; "Burn" removes a profile and its palm Blobs in one hold.
7. **Looks like the preview.** Playwright screenshots of home (night + day), Patri drawn, loupe open, drums, mala complete, palm reading and drawer match `design/preview.html` to the reviewer's eye; all text ≥ 4.5:1 contrast; Lighthouse mobile **Performance ≥ 90**, installable PWA, initial JS **≤ 350 kB gz**.
8. **Ships from a tag.** `git tag v1.0.0 && git push --tags` produces a signed APK on the GitHub Release that installs on the owner's phone and updates over the previous version without uninstalling; the web build is live at `https://<owner>.github.io/jyoti/` after every push to `main`.

## 6. Non-goals

- **No Western astrology.** No tropical sun-sign horoscopes, no Placidus houses, no Western glyph fonts, no "Mercury retrograde" memes.
- **No predictions about health, death, fertility, wealth or legal outcomes**, and no remedies, gemstones, poojas or anything for sale. Every reading is phrased "Tradition says…" with a citation and the standing disclaimer.
- **No accounts, cloud, sync, analytics or telemetry.** Friends' birth data and palm photos never leave the device unless the owner exports an encrypted file.
- **No LLM in the core path.** Readings are deterministic template sentences from rule hits; an optional BYO-key paraphraser is a Someday item and must be labelled "AI-generated paraphrase of the rule hits above".
- **No AGPL by default.** The engine runs on MIT `astronomy-engine`; the Swiss Ephemeris WASM lane is a flag-gated option that requires relicensing the repo (DECISIONS D5.1).
- **No scraping** of Drik Panchang or any site; oracles are consulted by hand and recorded as golden fixtures.
- **No Play Store, no monetisation, no public launch.** Sideloaded APK for the owner's phone(s) only.
- **No live-video palm tracking in the MVP** (IMAGE mode on a captured photo; VIDEO mode is a Someday polish).

## 7. Feature list

### MVP ✅ (Weekend path in `docs/PLAN.md`)
- Leaf entry: name, date, time, place (bundled GeoNames search), automatic IANA zone + historical offset, manual offset override; saved locally (Dexie).
- Engine v0 (MIT lane): tropical positions → Lahiri (three presets) → 9 grahas sidereal (mean node) → Lagna → D1 + D9 → nakshatra/pada/lord → Vimshottari MD/AD → birth panchang → 10 starter yogas.
- Janam Patri screen: North diamond + South grid SVG (flip), graha ledger with ′ ″ and near-boundary asterisk, dasha ribbon, yoga paragraph with citations, colophon with preset/offset/JD.
- Today's leaf: panchang for the active profile's place, sunrise/sunset, Rahu Kaal.
- Palm v0: pick/capture a photo → MediaPipe 21 landmarks → hand-shape element + finger ratios → landmarks drawn over the photo → "Tradition says…" reading.
- Live on GitHub Pages as an installable, offline PWA; debug APK on a GitHub Release.

### v1 🚀
- The full Chowki desk: Ledge, desk objects, `object-open` View Transitions, night/day by real sun altitude, tithi fill-light.
- Brass drums with BRASS inertia and detents; parapet sky strip that scrubs as the hour drum turns; hold-to-seal.
- Ink-drawn Kundli with nib wobble, sindoor tilak, brass loupe with degree register, varga pager (D2, D3, D7, D10, D12, D30, D60).
- True (osculating) node, Vimshottari to pratyantar, Bhava Chalit table, ~40 yogas with cancellations, Manglik with cancellations.
- Guna Milan mala (Ashtakoota, 36 beads, dosha beads, lac band stamp) + collapsed 10-porutham thread.
- Palm v1: guided capture with sharpness/exposure gauges, palm rectification, CLAHE + black-hat + Hessian ridge filter, Zhang-Suen thinning, anatomical line labelling with confidence, stylus trace fallback, both hands, "Burn".
- Rooftop sky: R3F dome with BSC5 stars, brass zodiac ring, planet billboards, Lagna beam, ±12 h scrub ring; painted-SVG fallback; 1080 × 1920 poster export.
- Sound sprite (CC0) + haptics; reduced-motion and "Calm desk" modes; Devanagari/Latin chart script toggle; encrypted export/import.
- Signed release APK from `v*` tags with camera, haptics, edge-to-edge, predictive back.

### Someday 🔮
- Swiss Ephemeris "precision mode" (AGPL lane, repo relicensed) with `.se1` files cached.
- Shadbala, Ashtakavarga, Sudarshana, Arudha padas, special lagnas, all 16 vargas.
- Gochar (transits) with Sade-Sati ribbon; Muhurta finder; Adhika masa, festivals, samvatsara.
- Daily panchang / dasha-change local notifications on Android.
- Hindi, Tamil, Telugu UI (Tiro Tamil / Tiro Telugu bodies); Devanagari digits.
- Palm: mounts, fate/sun/marriage lines, VIDEO-mode live guidance, a tiny UNet trained on the circle's hands (ONNX Runtime Web).
- Print-quality PDF Patri, QR/file profile sharing, optional BYO-key LLM paraphrase via a Cloudflare Worker.

## 8. Platforms

| Tier | Target | How |
|---|---|---|
| Web (primary) | Chrome/Edge/Firefox/Safari, phone-first 390-430 px, desktop ≥ 900 px | Vite 8 + React 19 static build, hash router, PWA precache, GitHub Pages at `/jyoti/` |
| Android (primary) | Android 7+ (`minSdk 24`), target 16 (`compileSdk 36`) | Capacitor 8 wrapping the same `dist/`, signed APK built by GitHub Actions on `v*` tags, sideloaded from Releases |
| Desktop | Any browser ≥ 900 px | Same web build; desk widens, Ledge becomes the left edge |

## 9. Constraints

- **Free, forever.** GitHub Pages + Actions (public repo), no Worker needed, no keys, no card anywhere (DECISIONS D2, D9.5).
- **Offline by construction.** Engine, gazetteer, fonts, sounds and the hand model are precached; the only network calls are user-initiated place lookups (Open-Meteo Geocoding, then Nominatim on submit), both no-key, CORS-open, attributed.
- **Privacy.** Local-only Dexie/IndexedDB; palm photos are biometrics, processed on-device, deletable in one hold, encrypted on export; no analytics of any kind (D5.5).
- **Licences.** Bundled code OSI only (MIT/Apache/ISC/CC0/Unlicense); bundled data PD/CC0/CC BY (GeoNames CC BY 4.0, BSC5 public domain, MediaPipe model Apache-2.0); classical tables re-typed from BPHS/PyJHora as facts, never copied as code (PyJHora is AGPL, validation oracle only). GSAP not used; Motion `pathLength` covers ink-draw. HYG (CC BY-SA) avoided in favour of BSC5.
- **Stack.** DECISIONS D1 (Vite 8, React 19, TS strict, Tailwind v4, Motion 13, Zustand 5, Dexie 4, React Router 7 hash mode, vite-plugin-pwa 1.x, Fontsource, Lucide, three r185 + R3F 9 for the sky, Howler, Vitest + Playwright, Biome, npm) and D7 token names with DESIGN.md §15 values.
- **Content care.** Disclaimer in every colophon; no health/death/wealth/fertility content; calm phrasing; dominant/non-dominant hand framing offered alongside the classical right/left convention.

## 10. The one-sentence pitch

Chowki is a private, offline Jyotisha desk for your phone that casts an arcsecond-honest Janam Patri in ink, counts Guna Milan on a real 36-bead mala, and reads a palm with a brass loupe and a stylus, Indian manuscript physics, not a zodiac dashboard.
