# Changelog

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
