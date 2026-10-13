# Changelog

## 0.4.0 — 2026-10-13

Chart engine unchanged; no chart moves. Saved people and settings carry over (storage keys are unchanged).

### Renamed: Vyom
- The app is now **Vyom (व्योम)**, Sanskrit for "the sky". The old name, Chowki, meant a low wooden stool.

### New
- **Forecasts** (#/forecast): day, week, month, quarter and year. Each planet's house from the natal Moon is checked against the classical favourable houses (Phaladīpikā ch. 26); days add Tārā-bala and Candra-bala; long periods weigh Jupiter, Saturn and the nodes. Shows *working for you* / *go gently with*, a day-by-day or month-by-month chart with the best day, the running daśā chapters, the Sāḍe Sātī phase, the period's sky events and the numerology personal year.
- **Coming up in the sky**: full and new moons, Ekādaśī, lunar and solar eclipses with visibility from the place, saṅkrāntis, sign changes and retrograde stations, all solved from the ephemeris.
- **Explore** (#/explore): the nine grahas (myth, meaning, day, colour, gem, vehicle, mantra, the real astronomy, where it is now), the twelve rāśis (element, quality, ruler, body, nakṣatras inside, who is there now), the 27 nakṣatras (deity, symbol, stars, myth, gaṇa, yoni), numerology (root, destiny, Chaldean name number, personal year, number friendship) and the Chinese zodiac (the Great Race; the year from the real Chinese New Year new moon).
- **Cosmic profile** on Home and the chart: rising sign, Moon sign, birth star with its deity, Sun sign (Indian and Western), Chinese zodiac and numbers; each card opens its story.
- **Today for you** on Home: the day's tone, the Moon's house and star, the life chapter, and a door to the full forecast.
- Navagraha medallions, a slow mandala behind the live wheel, and story links in every explanation.

### Changed
- Navigation: Home · Chart · Forecast · Today · Explore · People (Settings is the gear on Home).
- People open untied by default with plain labels; cards are solid so the delete tray never shows through.
- The forecast month calendar lines up with weekdays; the profile reflows in narrow columns.

## 0.3.0 — 2026-10-13

Engine unchanged; no chart moves.

### New look
- **Astral redesign**: deep-space background with a slow starfield, glass panels, aurora accents, Sora / Inter / JetBrains Mono / Noto Sans Devanagari. Instruments (Today's dial, the sky's time ring, the ayanāṃśa ruler) are redrawn in cool "moonsteel".
- **Home** is a dashboard: today's almanac at a glance, a **live zodiac wheel** (planets where they are right now, the rising sign here, your Moon sign), and tiles for every feature.
- Navigation is a floating bar on phones and a side rail on desktop.

### Plain English
- An **ⓘ** beside every traditional term opens a simple explanation, an in-depth one, and how Chowki calculates it.
- **Guide** (#/guide): what's real astronomy and what's tradition, how to use the app, privacy, and a searchable glossary of 50+ terms.
- **Roots** (#/story): 16 story cards — the Navagraha, the Moon's 27 wives, Rāhu's eclipse, Dhruva, the Saptarṣi, Vedāṅga Jyotiṣa, Parāśara, the Yavanajātaka, Āryabhaṭa, Varāhamihira and zero, Jantar Mantar, palmistry, numerology, and the 1955 calendar reform — ending with the person's **root and destiny numbers**.
- English names beside Sanskrit everywhere: planets and signs in the chart table, simple labels on every Today row and Guna Milan factor, English labels on the zodiac wheel.

### Fixes
- The CSP hash for the theme bootstrap is now computed at build time.
- Tests no longer depend on the time of day or a fast CI runner.

## 0.2.0 — 2026-10-12

Engine defaults unchanged (`ENGINE_EPOCH = 1`); no existing chart moves.

### New
- **Gochar** on the patri: transits now, house from the natal Moon and the Lagna, favourable houses and
  vedha (Phaladīpikā ch. 26), and a **Sāḍe-sātī ribbon** from birth to +90 years with Kaṇṭaka/Aṣṭama
  Śani, exact ingress dates (retrograde re-entries included).
- **Daily card** on the desk and Today's leaf: the person's Tārā-bala and Candra-bala for today and the
  running daśā (MD · AD · PD, until when).
- **Aṣṭakavarga** (BPHS ch. 66): Sarvāṣṭakavarga drawn as a chart, the seven Bhinnāṣṭakavargas as a
  matrix, invariants 48/49/39/54/56/52/39 and 337 enforced; **Bhāva Chalit** table with graha shifts.
- **Today's leaf**: Choghaḍiyā (day and night), Horā, a **month calendar** (tithi at sunrise, Moon phase,
  Ekādaśī / Pūrṇimā / Amāvasyā / saṅkrānti marks, keyboard grid), Brahma-muhūrta and Godhūli.
- **Guna Milan**: the **Daśa Porutham** thread (Rajju and Vedha weighed heaviest), both charts side by
  side on desktop, "what the tradition weighs" and exception notes per koota, and Copy summary.
- **Aṣṭakūṭa school** in the Drawer: North Indian (common) — now the default — or PyJHora · saravali; they
  differ in Varṇa of earth/air signs, the Vaśya table and Yoni Aśva × Mṛga, and Milan names the school.
- **Birth time unknown**: a leaf can be cast for local noon; the patri says what still holds and whether
  the Moon changed nakṣatra that day.
- **Print · save as PDF** for the patri (a clean manuscript stylesheet with the full daśā table).
- **Devanagari digits** for ledger degrees; a backup-age reminder in the Drawer.

### Verified
- Panchang against drikpanchang.com on 6 days × 3 cities under the Drik preset: every name matches; sunrise,
  sunset and all five end times within 2 minutes (Drik prints minutes). The upper-limb sunrise is Drik's.
- Biome now runs locally and is clean; 676 unit tests and 22 end-to-end tests pass (incl. a no-sideways-
  overflow check on every route at phone width).


## 0.1.0 — 2026-10-06 (first build; not yet tagged)

**Engine defaults:** ayanāṃśa Lahiri SE-true · true node · 365.25-day daśā year · upper-limb sunrise
with refraction · whole-sign houses. `ENGINE_EPOCH = 1`.

### The desk
- Chowki home: parapet sky strip with the real Sun/Moon/planets over the active birthplace, greeting
  with today's tithi/nakṣatra/vāra and Rāhu Kāla, desk objects (leaf bundle, brass dial, rolled patri,
  loupe, diya, drawer), long-press labels, swipe-up to the Rooftop; night desk / morning terrace by the
  real solar altitude, diya as manual override, 1/f lamp flicker driving every shadow; tithi fill-light.
- Writing the leaf: five brass drums (drag 1:1, BRASS inertia, detents with tick + haptic, impossible
  dates refused with a dull tick, typed entry, keyboard spinbutton), offline gazetteer search with
  historical names (Bombay, Madras, Calcutta…), opt-in online lookup (Open-Meteo → Nominatim, asked once,
  names only), manual coordinates, engraved strip `ZONE · OFFSET · JD · LAGNA` updating live while the
  hour drum scrubs the sky, Bombay Time +04:51 and manual offset overrides, hold-to-seal.
- Janam Patri: brass rollers bound to scroll progress, overscroll lac seal (hold to recompute; haldi
  "recompute" tab after a preset change), birth panchang with end-time footnotes, ink-drawn North/South
  Kundli with the sindoor tilak and a paper-flip between them, the brass loupe with planet snapping and an
  engraved readout, graha ledger (arcseconds, ℞, boundary asterisk only within 2′ with a cross-preset
  footnote), divisional pager D9/D2/D3/D7/D10/D12/D30/D60, Viṃśottarī ribbon with MD → AD → PD folds,
  32 cited yogas with cancellations, colophon with every preset and the cast time.
- Today's leaf, the leaf bundle (fan/untie, Burn, per-leaf actions), Guna Milan on a 36-bead mala
  (bead-slide, lac doṣa beads, tap to skip), the Rooftop sky (painted d3-geo sky + lazy R3F dome with
  BSC5 stars, ±12 h scrub ring, 1080×1920 poster), Hast Rekha capture and reading, the Drawer (ayanāṃśa
  dial segment, node, daśā year, sunrise, chart style/script, lamp, sound, haptics, Calm desk, offline
  warm-up, encrypted export/import, colophon).

### Correctness
- 50 golden charts vs Swiss Ephemeris (Moshier): Sun ≤ 2.4″, Moon ≤ 4″, planets ≤ 19.5″, Lagna ≤ 0.3″,
  true node ≤ 32″. Identical reference-chart hash under TZ = America/Denver, UTC, Asia/Kolkata.
- Ashtakoota checked against PyJHora's 11 664-pair table (see docs/HANDOFF.md for the school decisions).
- §0.1a of the implementation prompt had Mars/Mercury/Venus ~5′ off (no precession) and a mean-node Rāhu
  under a true-node heading; the fixtures now use Swiss Ephemeris numbers. Revatī × Rohiṇī scores 19.

### Privacy
- Zero off-origin requests across a full session (Playwright); CSP `connect-src` lists exactly the two
  place-lookup origins; exports are AES-GCM-256 / PBKDF2 600 000; Burn deletes a profile and its prints in
  one transaction; no analytics, no accounts.
