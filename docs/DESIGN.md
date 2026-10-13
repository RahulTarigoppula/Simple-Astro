# Jyoti — DESIGN.md (design system, v1)

**Project:** 02 · The Indian Astrology & Palmistry Companion (codename "Jyoti"; brand name **Vyom**) · **Date:** 2026-09-06
**Binding docs:** `_shared/DECISIONS.md` (D1 stack, D5 licensing, D7 token contract, D8 row 02), `docs/RESEARCH.md` (engine, ayanamsa presets, palm pipeline, §7 visual enablers), `_shared/research/DESIGN-TOOLKIT.md` (fonts/libs).
**Rule of the house:** `design/preview.html` is the visual contract (D9.3). If the app looks worse than this document, it is not done.

---

## 1. Identity

**Name:** **Vyom** (व्योम — the low wooden desk a Jyotishi works at).

**One-liner:** *A low teak desk on a night rooftop, lit by one brass diya, where your Janam Patri unrolls under your thumb in lamp-black ink, turmeric borders and a sindoor tilak — Indian manuscript physics, not a zodiac dashboard.*

**Three adjectives:** Weighted · Devout · Exact.

- *Weighted* — every object has mass and a material (paper, brass, thread, ink); nothing fades in, nothing floats.
- *Devout* — the visual vocabulary is the real one (patri scrolls, palm-leaf bundles, mauli thread, kumkum, diya), used with respect rather than as ornament.
- *Exact* — every number shows its work: degree to the arcsecond, ayanamsa preset, UTC offset, rule citation. The desk is an instrument, not a fortune-teller.

**What it must never look like**
- **A fantasy-game parchment menu / Western tarot app** — no gold text, no gradient text, no purple nebula, no glyph fonts, no Western zodiac art, no ornate corner filigree. Brass appears only where a real brass object sits (rollers, dial, loupe, clip).
- **A wood-textured skeuomorph from 2010** — teak is a *margin* (≤ 8 % of any screen), never a texture photo; paper owns 85–92 % of every screen so screenshots read as manuscript, not tavern. Materials are CSS gradients and one baked grain, never bitmaps.
- **"Stars on navy + gold serif" horoscope apps (Co-Star, AstroSage)** — the sky exists only on the Rooftop screen, and it is astronomically true; the rest of the app is paper under a lamp.
- **Napkin (project 03)** — Napkin owns uncoated grey-cream paper, a single vermilion signal, hairline catalogue figures and folio numerals. Vyom's paper is warmer and yellower, its rules are *turmeric bands* not hairlines, its accent is *sindoor applied as a dab* not a printed ink, and its objects have physics. If a Vyom screen could be mistaken for a Napkin plate, it has lost its desk.
- **Inter-on-grey with a purple button.** If a screen would look fine that way, it has left the lens.

## 2. Moodboard & references

| Reference | What we take | URL |
|---|---|---|
| Rajasthani Janam Patri scrolls (Wellcome Collection, CC BY) | Metres of paper on wooden rollers, turmeric-and-vermilion borders, ink kundli diamonds, the seal at the head | https://wellcomecollection.org/search/works?query=horoscope+scroll |
| British Library, Indian horoscope manuscripts | Section order of a real patri: seal, birth line, panchang, charts, dasha, colophon | https://www.bl.uk/collection-guides/indian-manuscripts |
| Nadi palm-leaf bundles, Vaitheeswaran Koil | Leaves stacked between boards, tied with red thread; stylus-scratched script | https://commons.wikimedia.org/wiki/Category:Palm-leaf_manuscripts |
| Jantar Mantar, Jaipur (Samrat Yantra) | Engraved brass and stone scales; shadow as the reading instrument; the panchang dial | https://whc.unesco.org/en/list/1338/ |
| Things 3 / (Not Boring) Weather | Springs with mass, one believable light, nothing fades — everything moves | https://culturedcode.com/things/ · https://notboring.software/ |
| Braun ET66 / Dieter Rams | Detents you can feel; restraint in ornament | https://www.braun-audio.com/en-GB/vintage |
| A brass diya on a Varanasi rooftop at dusk | The only light; warm falloff; long soft shadows | https://commons.wikimedia.org/wiki/Category:Diyas |
| HandpaintedType (Hanif Kureshi) / Satyajit Ray title cards | Confident hand-lettered Devanagari, not calligraphy-font kitsch | https://www.handpaintedtype.com/ |
| Tiro Typeworks Devanagari specimens | Devanagari and Latin drawn together with typographic dignity | https://tiro.com/fonts.html · https://fonts.google.com/?query=tiro |
| Rashtriya Panchang (IMD almanac) *(grafted from Jantar)* | Dense tabular degree readouts; instrument strips | https://www.imdpune.gov.in/ (Positional Astronomy Centre) |
| Astrodienst printed ephemeris *(grafted from Janma Patrika)* | Columns of degrees and minutes as ornament; the ledger discipline | https://www.astro.com/swisseph/swepha_e.htm |
| Stellarium landscape mode *(grafted from Jantar)* | A true horizon under a true sky; trust through correctness | https://stellarium.org/ |

## 3. Judging summary

| Concept | Distinct. | Vibe fit | Usability | Feasibility | Screenshot | **Total** | Verdict |
|---|---|---|---|---|---|---|---|
| 1 · Janma Patrika — The Two-Ink Almanac | 4 | 6 | 9 | 9 | 6 | **34** | Superb craft and the most legible of the three, but inside *this* portfolio it is Napkin's identity (warm paper, one vermilion ink, hairlines, folio numerals, Day/Night edition) with Devanagari added — and it leans on Fraunces, which is reserved elsewhere. Harvested for its ledger discipline. |
| 2 · Jantar | 8 | 9 | 6 | 5 | 9 | **37** | The true-sky idea is the most *original* thing on the table and the horizon split is a real legibility contract. But an always-on R3F dome behind every screen is the heaviest thing a solo dev could sign up for on an Android WebView, and "warm-on-indigo" still thumbnails as a horoscope app. Harvested for its time scrub, tithi weather and instrument strips. |
| 3 · **Vyom** | 9 | 9 | 7 | 6 | 9 | **40** | **Winner.** Deeply Indian without a single cliché, unmistakable in a cropped screenshot (rollers, tilak, 36-bead mala), and its premium feel comes from physics that is all DOM/CSS/Motion. Its weaknesses — object-only navigation and skeuomorphic weight — are fixed below with the Ledge and the "paper ≥ 85 %" rule. Already on the reserved Devanagari-modern typography. |

**Why Vyom won.** It is the only concept whose *every* signature element is specific to Indian astrology (patri, nadi leaves, mauli beads, diya, brass dial) and whose premium feel does not depend on WebGL. It is also the only concept that needs no font swap under the portfolio rule.

**What was grafted and how conflicts were resolved**
1. **The Ledger** *(from Janma Patrika)* — the Graha table on the Patri is a true ruled ledger: tabular numerals, ′ and ″ in muted ink, margin citations (BPHS 36.13), and numerals that **set** digit-by-digit rather than fade in. Resolution: hairlines are turmeric-ruled (`--border`), not Napkin's grey.
2. **Time-of-birth sky scrub** *(from Jantar)* — spinning the hour drum scrubs a thin *rooftop parapet strip* above the desk: sun sets, Moon crosses, the Lagna sign ticks in the engraved strip with a haptic per sign crossing. Resolution: this is a 2D SVG horizon band (astronomy-engine + d3-geo), not the R3F dome; the dome stays lazy on the Rooftop screen only.
3. **Tithi weather** *(from Jantar)* — the actual Moon phase is a *fill light* on the desk: Purnima cools and brightens the cloth, Amavasya leaves only diya light. Resolution: the diya remains the **only key light** (all shadows still point up-left); the Moon changes tint and vignette only, never shadow direction.
4. **Instrument ticks** *(from Jantar)* — in the Drawer, ayanamsa presets are shown as fine ticks on a magnified segment of the brass panchang dial so the 20–40″ differences are visible; automatic day/night by real sun altitude, with the diya as manual override.
5. **The Ledge** *(own addition, replaces Jantar's gnomon bar)* — a 64 px teak ledge along the bottom edge holds miniature objects (scroll · leaves · dial · loupe · lamp) as a real five-destination bar inside any object. Fixes the "no tab bar" usability hole without adding chrome that is not part of the desk.

Dropped: Jantar's 36-diya tally (conflicts with the mala; beads won), Janma Patrika's Fraunces and scroll-snap mastheads, Vyom's optional GSAP DrawSVG (Motion `pathLength` is sufficient and OSI).

## 4. Colour system

**Principle:** handmade paper under one warm lamp. Paper carries all body text in both themes, so AA contrast is guaranteed regardless of theme; wood and indigo cloth are margins. One pigment accent (sindoor), one metal (brass, art-only on paper), one signal green (tulsi), one turmeric (fill-only). The theme changes the *desk*, never the *paper*.

### 4.1 Core tokens — Night desk (default; diya lit; also `prefers-color-scheme: dark`)

| Token | Hex | Usage | Contrast notes |
|---|---|---|---|
| `--bg` | `#1A110B` | Teak desk at night — visible only as margins (≤ 8 %), behind objects, the Ledge | paper text 15.6:1 |
| `--bg-elevated` | `#1D2748` | Indigo (neel) block-print cloth the scroll rests on; drawer interior | paper 12.2:1 · brass 6.1:1 |
| `--surface` | `#F4EAD3` | **Handmade paper — the dominant surface (85–92 % of every screen)**; all reading happens here | — |
| `--surface-2` | `#EAD9A9` | Turmeric-washed paper: section header bands, ledger zebra rows, leaf faces, drum faces | ink 13.0:1 · ink-muted 6.2:1 |
| `--ink` | `#1B1410` | Lamp-black ink: primary text, chart strokes, sign numerals | 15.2:1 on paper |
| `--ink-muted` | `#5A483A` | Faded ink: captions, citations, ′ ″ marks, measured values, placeholders | 7.3:1 on paper AA |
| `--ink-faint` | `#9A8A72` | Ghost ink: ruled guide lines, watermark glyphs, disabled strokes — **art only, never text** | 2.8:1 |
| `--accent` | `#B5301C` | Sindoor vermilion: the tilak, the mauli thread, primary button fill, near-boundary badge, lit hairline | 5.2:1 on paper AA (text ≥ 13 px) |
| `--accent-text` | `#A8281A` | Vermilion for small text *on the turmeric band* (`--surface-2`) | 5.0:1 on surface-2 AA |
| `--accent-ink` | `#FFF6E6` | Text on vermilion fills | 5.8:1 on `--accent` AA |
| `--accent-2` | `#C9A24A` | Antique brass: rollers, dial, loupe rim, clip, earned beads; text **only on teak/indigo** | 7.8:1 on `--bg` · 2.0:1 on paper (never text on paper) |
| `--success` | `#356234` | Tulsi green: good koota bands, "validated" tick, saved state | 6.0:1 on paper · 5.1:1 on surface-2 |
| `--warning` | `#C68A12` | Haldi: fills and underlines only, always with `--ink` on top (mean-vs-true node notice, low palm confidence) | 2.5:1 — never text |
| `--warning-text` | `#7A5407` | Turmeric-dark for warning *text* | 5.7:1 on paper · 4.8:1 on surface-2 |
| `--danger` | `#7F160F` | Dried lac seal: destructive actions, Nadi/Bhakoot dosha marks, "burn" | 8.7:1 on paper |
| `--border` | `#C9B48A` | Turmeric-ruled hairline: ledger row rules, leaf ruling, form rows (1 px) | non-text 1.7:1 |
| `--border-strong` | `#8A7350` | Section rules under turmeric bands, chart frames when not ink, roller shadow line | non-text 3.8:1 |
| `--focus` | `#22408E` | Neel ink focus ring — 2 px, offset 2 px, with a 2 px `--surface` outer halo so it reads on paper, brass and teak | 8.0:1 on paper |
| `--moon` | `#DCE4F5` | Moon silver: fill-light tint at Purnima, the Moon body on the Rooftop, Chandra-rashi callouts on dark | 14.6:1 on `--bg` |
| `--ledge` | `#241811` | The Ledge bar (slightly lifted teak) | paper 14.5:1 · brass 7.2:1 |

### 4.2 Morning terrace (light theme; auto when local sun altitude > 0°, or diya snuffed)

Only the desk changes. Paper, ink, accents and rules are identical, so every text contrast above holds.

| Token | Hex | Note |
|---|---|---|
| `--bg` | `#6E4A2E` | Sunlit teak (paper on it 6.6:1; labels on wood use `--surface`, never brass — brass on day teak is 3.3:1) |
| `--bg-elevated` | `#C9C1AE` | Faded khadi cloth (ink 10.2:1) |
| `--ledge` | `#5E3F27` | |
| `--shadow-*` | alpha halved | Daylight is diffuse: shadows go from 0.45 → 0.22 alpha, offsets unchanged |
| `--grain-opacity` | `0.10` | Paper grain slightly lighter in sun |

**Tithi weather (both themes):** a fill light from the top-left tints only `--bg-elevated` and the vignette. `--moon-fill` is computed at runtime from Moon illumination `k` (0 Amavasya → 1 Purnima): the cloth is `color-mix(in oklch, var(--bg-elevated), var(--moon) calc(k * 14%))`, vignette far-corner darkness eases from 18 % to 8 %. Text tokens never change.

### 4.3 Semantic tokens

`--tilak: var(--accent)` · `--thread: var(--accent)` · `--brass: var(--accent-2)` · `--lac: var(--danger)` · `--haldi: var(--warning)` · `--tulsi: var(--success)` · `--paper: var(--surface)` · `--paper-band: var(--surface-2)` · `--engraved: color-mix(in oklch, var(--brass), black 55%)` (text engraved into brass, 4.9:1 on brass — labels only, ≥ 12 px mono uppercase).

### 4.4 Gradients, materials, textures

| Material | Recipe (CSS only) |
|---|---|
| Paper | `--surface` + baked tiled SVG grain (`feTurbulence baseFrequency 0.9, 2 octaves`, 256 px tile, exported once to `/public/grain.svg`), `opacity: var(--grain-opacity)` (0.12 night). **Never a live filter over the scroll.** Top edge of every sheet gets a 1 px `--border-strong` at 40 % (cut edge). |
| Turmeric band | `--surface-2` with a 1 px `--accent` hairline beneath at 70 %; the band's left 6 px is a solid `--accent` "kumkum" tick on section heads only |
| Brass (rollers, dial, drums) | `linear-gradient(90deg, #8F6F2E 0%, #E2C56B 18%, #C9A24A 50%, #7E5F22 100%)` for cylinders; `conic-gradient` for the dial face; `inset 0 1px 0 rgba(255,246,230,.55), inset 0 -1px 0 rgba(0,0,0,.45)` for the turned edge |
| Wood (margins, Ledge) | flat `--bg` plus a 2 % lighter 1 px grain line every 7 px via `repeating-linear-gradient` at 0.06 alpha — suggestion, not texture |
| Indigo cloth | `--bg-elevated` with a 4 × 4 px block-print dot pattern (`radial-gradient`, 8 % alpha paper) |
| Lac seal | `--danger` disc with `feTurbulence` displacement at the edge (baked SVG), highlight from lamp direction |
| Lamp light | one `radial-gradient` at `(--lamp-x, --lamp-y)` = bottom-right: paper +0 %, far corner −10 % via a multiply overlay; drives every `drop-shadow` |
| Glass (loupe) | 2D canvas magnifier inside `border-radius: 50%` with an edge `radial-gradient(transparent 82%, rgba(255,255,255,.35) 88%, rgba(0,0,0,.35) 100%)` — no `backdrop-filter`, no blur |

No mesh gradients, no glow filters, no frosted glass anywhere.

## 5. Typography

Portfolio direction for this project: Devanagari-capable pairing with an Indian-modern voice. **No Fraunces.**

| Role | Face | Fontsource (OFL) | Google Fonts |
|---|---|---|---|
| Display | **Yatra One** 400 (Devanagari + Latin) | `@fontsource/yatra-one` | https://fonts.google.com/specimen/Yatra+One |
| Body | **Tiro Devanagari Hindi** 400 + 400 italic (Devanagari + matched Latin) | `@fontsource/tiro-devanagari-hindi` | https://fonts.google.com/specimen/Tiro+Devanagari+Hindi |
| Mono / engraved | **Martian Mono** variable (`wdth` 75–112.5, `wght` 100–800) at `wdth 87`, `wght 500` | `@fontsource-variable/martian-mono` | https://fonts.google.com/specimen/Martian+Mono |

Two text families + one mono (toolkit rule). All self-hosted and subset (`pyftsubset`, Python 3.14 is local) to Latin + Latin-1 + Devanagari + `°′″℞`; target ≤ 260 kB woff2 total (Devanagari adds weight, acceptable). `font-display: swap` with `size-adjust` fallbacks (Georgia / Noto Sans Devanagari system / Consolas). Tamil/Telugu localisation later swaps the body to `Tiro Tamil` / `Tiro Telugu` (same foundry, same voice).

**Why:** Tiro Devanagari Hindi is a text face where Devanagari and Latin were drawn together, so "Śani · शनि" sits on one baseline rhythm instead of looking pasted. Yatra One's brush weight reads like the hand-lettered headline on a real patri; used at most **six words per screen** so it never becomes a poster. Martian Mono, condensed, appears *only* on brass — the eye learns "mono = instrument, serif = manuscript".

**Type scale** (`--text-*`, rem at 16 px; line-height in parentheses)

| Token | rem / px | Face | Use |
|---|---|---|---|
| `--text-xs` | 0.75 / 12 | Martian Mono, uppercase, +0.06em | Engraved labels on brass, drum tick labels, dial minutes |
| `--text-sm` | 0.8125 / 13 | Tiro / Martian Mono | Citations ("BPHS 36.13"), ledger units, colophon, drawer helper text |
| `--text-base` | 1.0625 / 17 (1.5) | Tiro | Body on paper, readings, leaf lines — **minimum body size** |
| `--text-lg` | 1.25 / 20 (1.4) | Tiro | Ledger numerals, form values, koota names |
| `--text-xl` | 1.375 / 22 (1.3) | Yatra One | Section titles on turmeric bands |
| `--text-2xl` | 1.75 / 28 (1.15) | Yatra One | Screen titles, phone ("जन्म पत्री") |
| `--text-3xl` | 2.125 / 34 (1.1) | Yatra One / Tiro | Person's name on the seal; screen titles ≥ 900 px |
| `--text-4xl` | 3 / 48 (1) | Martian Mono `wdth 87 wght 300` / Tiro | Loupe degree readout, current Mahadasha lord |
| `--text-5xl` | 4.5 / 72 (0.95) | Tiro (Latin numerals) | Guna score "20 / 36"; phone uses `clamp(3rem, 16vw, 4.5rem)` |

`--leading-tight: 1.1`, `--leading-body: 1.5`. Devanagari body gets `line-height: 1.6` (matras need headroom). Headlines `text-wrap: balance`; readings `text-wrap: pretty`; measure ≤ 60ch (Latin) / 48ch (Devanagari).

**Letter-spacing rules:** Martian Mono uppercase +0.06em; Tiro body 0; Yatra One 0 (never track a brush face); large Tiro numerals −0.01em. Never letter-space Devanagari.

**Numerals:** Tiro has proportional lining figures only — every numeral that changes (drums, ledger, loupe, score) is either Martian Mono (`font-variant-numeric: tabular-nums`) or a Tiro digit inside a `1ch` inline-block cell. Degrees are written `23°51′12″` with `°` in ink and `′ ″` in `--ink-muted`. Retrograde is a superscript `℞` in Tiro. Devanagari digits (`२३°५१′`) are a Drawer setting; when on, the ledger uses Tiro's Devanagari digits in cells, drums stay Latin (engraved brass is Latin by convention).

**Voice:** headings bilingual, Devanagari first ("जन्म पत्री · Janam Patri"); readings begin "Tradition says…" / "परंपरा कहती है…"; every sentence ends in a superscript citation; buttons are verbs ("Seal the leaf", "Cast", "Burn") never icons alone.

## 6. Spacing, radius, elevation, borders

**Spacing** (8-pt grid, 4-pt half step): `--space-1 4px · -2 8 · -3 12 · -4 16 · -5 20 · -6 24 · -7 32 · -8 40 · -9 48 · -10 64 · -11 80 · -12 96`. Paper margin 20 px (phone) / 32 px (≥ 900 px); 32 px between patri sections; 48 px above a turmeric band.

**Radius:** `--radius-sm 3px` (badges, seal text box) · `--radius-md 6px` (leaf corners, drawer, buttons — cut paper, not pills) · `--radius-lg 14px` (roller caps, dial bezel) · `--radius-xl 28px` (brass drums) · `--radius-full 9999px` (beads, loupe, diya flame).

**Elevation — one lamp, three heights.** All shadows are computed from `--lamp-x: 1` / `--lamp-y: 1` (bottom-right) so they fall up-left:
- `--shadow-1: -2px -2px 6px rgba(20,10,4,.45)` — a sheet lying on the desk, a bead
- `--shadow-2: -6px -5px 18px rgba(20,10,4,.50)` — a leaf lifted, the loupe, an open drawer
- `--shadow-3: -14px -12px 36px rgba(20,10,4,.55)` — the loupe rising toward the camera, the scroll unrolling into a screen
- Morning terrace halves the alpha. `will-change: transform` on shadowed objects; shadows never animate their blur, only the object transforms.

**Borders:** `--border` 1 px turmeric hairline for rows; `--border-strong` 1 px under section bands; chart strokes are `--ink` at 1.25 px (`shape-rendering: geometricPrecision`, hairlines snapped to device pixels); the vermilion hairline under every turmeric band is 1 px at 70 %.

**Texture:** `--grain-opacity: 0.12` (night) / `0.10` (day), applied only to paper.

## 7. Motion language

**Principles**
1. **Everything has mass and one of four materials**, each with its own spring. If a flourish has no material rule, it is cut.
2. **Ink is drawn, never faded.** Strokes draw with `pathLength`; numerals *set* digit-by-digit; then pigment settles.
3. **One light, one heartbeat.** The diya flicker is the only ambient motion, and it is the first thing reduced-motion removes.
4. **Direct manipulation has zero easing** — drums, ribbon, loupe and stylus follow the finger; easing only happens on release.
5. **Transform and opacity only.** No animated filters, no animated shadows, no layout thrash on the scroll.

**Tokens:** `--dur-fast 120ms` · `--dur-base 240ms` · `--dur-slow 480ms` · `--dur-draw 900ms` (ink; min 400, max 1400 by path length) · `--ease-out cubic-bezier(0.22, 0.8, 0.2, 1)` · `--ease-in-out cubic-bezier(0.65, 0, 0.35, 1)` · `--ease-spring linear(0, 0.36 10%, 0.78 21%, 1.02 34%, 1.06 42%, 1.01 58%, 0.99 74%, 1)` (CSS approximation of PAPER).

**Springs** (`src/motion/springs.ts`, the source of truth for Motion 13):

| Material | Spring | Character |
|---|---|---|
| PAPER | `{ stiffness: 220, damping: 26, mass: 0.8 }` | Light, damped; one bounce at scroll ends |
| BRASS | `{ stiffness: 120, damping: 20, mass: 2 }` + rotational inertia (velocity × 0.94 per frame), detents every tick | Heavy, keeps turning, clicks |
| THREAD | `{ stiffness: 420, damping: 14, mass: 0.6 }` | Elastic, may overshoot twice |
| INK | not a spring: `pathLength 0→1` at ~900 px/s, `--ease-out`, then `opacity .85→1` over 240 ms (pigment settles) | Drawn |

**Named animations**

| # | Name | Spec |
|---|---|---|
| 1 | `unroll` | Page scroll *is* the scroll. Top roller `scaleY` of its body `1 → 1.35` and bottom `1.35 → 1` as `scrollProgress` 0→1 (linear, driven by `useScroll`, no easing); curl highlight `translateX` follows the tangent. Overscroll at top pulls the paper `translateY` up to 56 px against PAPER and reveals the lac seal; release snaps back with PAPER. |
| 2 | `ink-draw` | Any SVG (diamond, grid, palm lines, ruler): `pathLength 0→1`, frame first, interior strokes +60 ms stagger each, INK timing; 3 % nib-width wobble via `stroke-width` keyframes on a 30 ms tick; planet glyphs then settle into houses with PAPER (from `translateY 6px, opacity .85`). |
| 3 | `digit-set` *(grafted)* | Numerals never fade: each digit cell goes `color: var(--ink-faint) → var(--ink)` over 120 ms, 24 ms stagger left→right, tabular so nothing shifts. Drums and the loupe readout use it on every settle. |
| 4 | `tilak-dab` | Lagna tilak: `scale 0.7→1.06→1` over 240 ms `--ease-out` (the 1.06 is the thumb pressing), `opacity 0→1` in the first 80 ms; edge bleed is a pre-baked displaced SVG, not a live filter. `impact Medium` at 0 ms. |
| 5 | `drum-spin` | Brass drums (date/time): drag with zero easing; release applies BRASS inertia, snapping to the nearest detent; each detent passing = 30 ms tick + `selectionChanged`. Max velocity 4 detents/frame. |
| 6 | `bead-slide` | Guna mala: each earned bead `translateX` across the knot with THREAD, 90 ms apart; colour `--ink → --accent-2` at the knot (120 ms); doshas slide as `--danger` beads. Final knot: thread `scaleX 1→1.04→1` (THREAD), then the lac stamp uses `tilak-dab`. |
| 7 | `seal-thunk` | Hold the seal 600 ms: seal `scale 1→0.94` over the hold (linear), release → `scale 1.08→1` PAPER, `impact Medium`, recompute begins (`ink-draw` replays). Early release: `scale → 1` in 120 ms, no action. |
| 8 | `lamp-flicker` | Diya flame `opacity` and `scale` ±3 % from 1/f noise sampled every 80 ms; all `drop-shadow` offsets jitter ±0.6 px in sync (one CSS var `--flicker`). Paused off-screen and under reduced motion. |
| 9 | `loupe-rise` | Loupe `scale 0.6→1`, `translateY 24px→0`, shadow token `--shadow-1 → --shadow-3`, 240 ms `--ease-out`; follows the finger 1:1 while held; on release settles with PAPER onto the nearest planet. |
| 10 | `leaf-fan` | Untie: thread end follows the drag; at 40 px the knot releases (THREAD), leaves fan with `rotate` −12°…+12° and `translateX` 0…-18 px, PAPER, 30 ms stagger from the top leaf. |
| 11 | `object-open` | View Transition: the tapped desk object carries `view-transition-name`; it scales from its resting spot to its screen (scroll unrolls upward from centre, loupe rises, bundle slides left) over 320 ms `--ease-in-out`; the Ledge and desk margins are shared elements and do not move. |
| 12 | `sky-pitch` | Home → Rooftop: desk `translateY 0→-30 %` + `opacity 1→0` over 480 ms `--ease-in-out` while a pre-rendered dome frame `opacity 0→1`; R3F mounts after, crossfading 240 ms. Reverse on swipe-down. |
| 13 | `drawer-slide` | Drawer `translateY 100%→0` PAPER (it is a wooden drawer but it runs on paper glides), 40 ms after `impact Light`; the desk above dims by `--ink` at 0.25. |
| 14 | `sky-scrub` *(grafted)* | Parapet strip: sun/Moon `cx/cy` and gradient stops recomputed at 30 fps while a drum turns (astronomy-engine, < 1 ms/frame); no tween. Lagna sign label uses `digit-set` on change + `selectionChanged`. |

**Hover / press:** paper objects lift 2 px with `--shadow-1→2` in 120 ms; brass objects brighten the highlight stop by 6 %; text links gain a 1 px `--accent` underline drawn left→right in 120 ms. **Loading:** an ink line draws across the top of the sheet (`ink-draw`, repeating) — no spinners.

**`prefers-reduced-motion: reduce`:** lamp flicker off (steady flame), rollers static, `ink-draw` → 240 ms opacity fade, `digit-set` → instant, springs → 200 ms `--ease-out` tweens with no overshoot, View Transitions → 160 ms crossfade, `sky-pitch` shows the static painted sky only, no tilt-to-look. Drums, ribbon, loupe and stylus still follow the finger (user-driven) but snap without inertia. Shadows stop jittering.

## 8. Signature interactions

### 8.1 Unrolling the Patri
1. Open a profile: the rolled scroll on the desk grows into the screen (`object-open`); rollers pin to the top and bottom edges, paper 92 % wide between them.
2. Scroll down: the top roller visibly thickens and the bottom thins (`unroll`); a curl highlight tracks the tangent. Paper rustle (Howler) gain follows scroll velocity (silent < 60 px/s).
3. Pull past the top: paper stretches against PAPER and the lac seal appears above the header — the person's Janma nakshatra symbol stamped in lac.
4. Hold the seal 600 ms → `seal-thunk` → the chart recomputes with the current presets and the diamond redraws itself (`ink-draw`).
- **Physics:** roller diameter is `f(scrollProgress)` — transform-only layers; overscroll spring stiffness 220.
- **Sound/haptic:** rustle; roller creak at overscroll; `impact Light` on snap-back; `impact Medium` on the seal.
- **Delight:** the page is an object you can feel the length of; a 120-year life is literally a longer scroll.

### 8.2 The ink-drawn Kundli and the loupe
1. The North diamond draws in ink stroke by stroke (frame → diagonals → inner diamond), sign numerals are written with a nib wobble, planets settle with PAPER.
2. Last, the Lagna receives its sindoor tilak (`tilak-dab`, `impact Medium`) — a thumb-dab with a bled edge, never a clean circle.
3. Touch any planet: the brass loupe rises under your finger (`loupe-rise`) and magnifies that house; inside the glass an engraved strip reads `MA 11°31′24″ · ŚATABHIṢĀ 2 · LORD RĀHU` (the reference chart's Maṅgala) with a near-boundary badge (≤ 2′) in vermilion when applicable.
4. *Degree register (grafted):* drag the loupe across the paper and it snaps planet to planet (`selectionChanged` each), the readout digits `digit-set`; long-press flips the readout to the next varga.
5. Swipe the paper sideways: it flips (`rotateY` with PAPER) to reveal the South-Indian grid on the back.
- **Physics:** INK for strokes; loupe follows 1:1, settles with PAPER; page flip 480 ms.
- **Sound/haptic:** nib scratch during draw; `impact Medium` on the tilak; `selectionChanged` per snap; `notification Warning` the first time a boundary badge appears.
- **Delight:** the chart is *written for you* once (cached per profile + preset), then the glass lets you read arcseconds without a modal.

### 8.3 Brass drums and the parapet sky *(grafted)*
1. Birth entry: day · month · year · hour · minute are five brass counter drums with engraved numerals; flick to spin, they keep turning with BRASS inertia and click into detents.
2. Above the desk, a parapet strip shows the real sky at that place and time: as the hour drum turns, the sun sets, Venus appears, the Moon crosses; the engraved strip beneath reads the Lagna sign, and a `selectionChanged` fires each time the ascendant crosses a sign boundary.
3. The resolved IANA zone, historical UTC offset and JD are engraved beneath (`ASIA/KOLKATA · +05:30 · JD 2449425.5799`), with a Bombay Time (+04:51) override drum for pre-1955 Bombay births.
4. Seal the leaf (hold 600 ms) and it is clipped to the scroll.
- **Physics:** BRASS spring; detent every 1 unit; velocity capped at 4 detents/frame; 30 fps sky recompute.
- **Sound/haptic:** brass tick per detent (−18 dB, ≤ 1 per 40 ms); `selectionChanged` on detents and sign crossings; wick "fwoomp" is *not* used here (that is the lamp).
- **Delight:** you see whether you were born at dusk or at 3 a.m. before any chart exists; drums are impossible to mis-tap one-handed.

### 8.4 The 36-bead mala (Guna Milan)
1. Two scrolls lie side by side tied with a mauli thread; drag a second leaf from the bundle onto the desk to start.
2. Below, 36 wooden beads on the red thread, grouped 1·2·3·4·5·6·7·8 under the eight koota names (the Ashtakoota maxima sum to exactly 36).
3. Each koota tallies in turn: earned beads slide across the knot one by one (`bead-slide`) with abacus clicks, turning brass as they pass; a dosha leaves a dried-lac bead and a one-line "Tradition says…" under the group.
4. The count is knotted; the band (not recommended / acceptable / very good / excellent) is stamped in lac at the knot; ≥ 25 gives `notification Success`.
- **Physics:** THREAD spring, 90 ms per bead (≤ 3.5 s total for 36; tap to skip).
- **Sound/haptic:** wooden click per bead; thread snap at the knot; `selectionChanged` per bead.
- **Delight:** a score becomes something you watched being counted — and the doshas are physically visible as dark beads, not a red warning box.

### 8.5 Loupe and stylus on the palm
1. After capture the rectified 512 px palm print lies on the desk like a photograph; the brass loupe follows your finger.
2. Detected heart, head and life lines draw in ink from the wrist outward (`ink-draw`, 900 ms each, 200 ms stagger) with lettered callouts a., b., c.; confidence is shown as ink darkness (low = faint, dashed, plus a haldi note "trace to confirm").
3. If confidence is low the app hands you the stylus: drag and your trace scratches in vermilion with a leaf-scratch sound; the reading recomputes live from the traced geometry.
4. "Burn" deletes the print: the edge chars into `--danger` over 480 ms while you hold; release early and it cools back.
- **Physics:** INK draw; stylus 1:1, Bézier handles with PAPER settle.
- **Sound/haptic:** nib scratch; leaf scratch while tracing; `impact Light` at handle drop; `notification Warning` on low confidence.
- **Delight:** the hard CV problem becomes a craft you do with a tool; honesty (faint ink) is part of the aesthetic rather than an error state.

## 9. Screen-by-screen

Global: phone-first 390–430 px portrait, one-handed. **The Ledge** (64 px + safe-area) sits along the bottom edge on every screen except Capture and Rooftop: five miniature objects — Scroll (Patri) · Leaves (Circle) · Dial (Today) · Loupe (Hast) · Lamp (theme) — each a ≥ 56 px target with an engraved label (`--text-xs`, `--surface` on `--ledge`); the active object sits 4 px higher with a warmer highlight. Predictive back and swipe-down on the top roller return to the Vyom. Desktop (≥ 900 px): the desk widens, paper stays a 480–560 px column, objects lie beside it; the Ledge becomes the left desk edge (vertical).

### 9.1 The Vyom (home) — `#/`

```
PHONE                                      DESKTOP (≥ 900px)
┌──────────────────────────────┐          ┌──────────────────────────────────────────────────┐
│ ~ parapet sky strip (44px) ~ │          │ ~~~~~~~~~~~~ parapet sky strip ~~~~~~~~~~~~~~~~~~ │
│ नमस्ते, Rahul · कृष्ण त्रयोदशी  │          │ नमस्ते, Rahul · Kṛṣṇa Trayodaśī, Puṣya 4         │
│┌────────┐          ┌────────┐│          │ ┌──────┐   ┌────────────────────┐   ┌──────┐     │
││ leaf   │          │ brass  ││          │ │leaf  │   │  ┌──────────────┐  │   │brass │     │
││ bundle │          │ dial   ││          │ │bundle│   │  │  rolled      │  │   │dial  │     │
││ (3)    │          │ 14:52  ││          │ │      │   │  │  Patri       │  │   │      │     │
│└────────┘          └────────┘│          │ └──────┘   │  │  (Rahul)     │  │   └──────┘     │
│         ┌──────────────┐     │          │            │  └──────────────┘  │                 │
│         │  rolled      │     │          │ ┌──────┐   │   indigo cloth     │   ┌──────┐     │
│         │  Patri       │     │          │ │loupe │   └────────────────────┘   │ diya │     │
│         │  ══ Rahul ══ │     │          │ └──────┘                            └──────┘     │
│         └──────────────┘     │          └──────────────────────────────────────────────────┘
│┌──────┐              ┌──────┐│
││loupe │              │ diya ││
│└──────┘              └──────┘│
├──────────────────────────────┤
│ scroll leaves dial loupe lamp│  ← Ledge
└──────────────────────────────┘
```
- **Components:** ParapetSky (2D SVG horizon for the active profile's place, now), Greeting (Yatra One, ≤ 6 words), DeskObject ×5, Ledge.
- **States:** *empty* (no profiles) — the scroll is blank with a stylus resting on it and the greeting reads "Write your first leaf"; *loading* — objects are present, dial hands draw in; *error* (engine failure) — a haldi note pinned under the dial: "The dial is stuck — check the date"; *success* — normal.
- **Gestures:** tap object → `object-open`; long-press object → engraved name label; swipe up from the dial → Rooftop (`sky-pitch`); tap diya → light/snuff (theme override; auto follows sun altitude until touched).

### 9.2 Today's leaf (Panchang) — `#/today`

```
┌──────────────────────────────┐
│ ▓ brass dial (compact, 96px) │  tithi hand · nakshatra ring · Rahu Kaal shaded arc
│ ══ आज · Today ══════════════ │  turmeric band + vermilion hairline
│ Tithi     Kṛṣṇa Trayodaśī    │  ends 17:04
│ Vara      Maṅgalavāra        │
│ Nakshatra Puṣya · पुष्य       │  pada 4, ends 09:17 (+1)
│ Yoga      Parigha            │  ends 21:04
│ Karana    Gara               │  ends 17:04
│ ── ruled rows, end-times in mono, right-aligned ──
│ Sunrise 06:12  Sunset 18:31  │  Rahu Kaal 15:22–16:54 (haldi band)
│ ‹ ● ›  Moon pager (phase ages as you swipe days)
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```
- **Components:** BrassDial, TurmericBand, LedgerRow, DayBar, MoonPager.
- **States:** location unknown → uses the active profile's birthplace (never asks for GPS); offline → identical (all computed locally).
- **Gestures:** swipe the Moon horizontally to page days (phase ages, `selectionChanged` per day); tap a row → footnote sheet with the exact end instant and the sunrise convention used.

### 9.3 Leaf bundle (Circle) — `#/circle`

```
┌──────────────────────────────┐
│ ═ board ═════════════════════│  wooden top board
│ ╭ leaf ─ Rahul ─ ♆ अनुराधा ─╮│  name (Yatra One), Moon nakshatra, birth line scratched
│ ╭ leaf ─ Priya ─ रोहिणी ────╮│
│ ╭ leaf ─ Amma ─ मघा ───────╮ │
│ ╭ blank leaf + stylus ─────╮ │  "New leaf"
│ ═ board ═══ red thread ○═════│  drag thread end to untie/fan
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```
- **Components:** LeafStack, Leaf (face `--surface-2`, ruled `--border`), ThreadKnot, BlankLeaf.
- **States:** empty → only the blank leaf and stylus; ≥ 12 leaves → the stack scrolls, boards stay pinned.
- **Gestures:** drag thread → `leaf-fan`; tap leaf → lift and clip to the scroll (`object-open` to Patri); swipe left on a leaf → Export (wax envelope, passphrase AES-GCM JSON) / Burn (hold 600 ms, edge chars, `--danger`); Burn removes profile + photos.

### 9.4 Writing the leaf (birth entry) — `#/leaf/new`, `#/leaf/:id/edit`

```
┌──────────────────────────────┐
│ ~ parapet sky (scrubs live) ~│  ← grafted
│ ═ नया पत्ता · New leaf ══════ │
│ Name  [ Rahul________ ]      │  Tiro on paper, ruled row
│ ┌────┬────┬──────┬────┬────┐ │
│ │ 14 │ 03 │ 1994 │ 07 │ 25 │ │  brass drums (day mo year hh mm), 56px tall
│ └────┴────┴──────┴────┴────┘ │
│ Place [ Bengaluru, KA, IN  ] │  bundled GeoNames; "search online ⌑" stamp
│ ▓ ASIA/KOLKATA · +05:30 · JD 2449425.5799 · LAGNA ♓ MEENA ▓  engraved strip
│ ○ Bombay Time +04:51 (pre-1955)         override drum
│ Ayanamsa: Lahiri (SE-true) · Node: true   small brass plate → Drawer
│ [ ◉ hold to seal the leaf ]  vermilion, 48px, thumb zone
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```
- **Components:** ParapetSky, LedgerInput, BrassDrum ×5 (+1 override), PlaceSearch (minisearch over GeoNames, results as ruled list with lat/lon in mono), EngravedStrip, SealButton (hold).
- **States:** place not found → row shows "not in the bundle" + the online stamp (Open-Meteo, then Nominatim on submit only); tz uncertain (border) → haldi note; invalid date (31 Feb) → the day drum refuses the detent with a dull tick; saving → seal pressed; error → lac seal cracks (`--danger`) with the reason.
- **Gestures:** flick drums; tap a drum → native picker fallback (keyboard entry); hold seal 600 ms.
- **Desktop:** drums become an inline row with keyboard arrows; sky strip 120 px tall.

### 9.5 Janam Patri (chart scroll) — `#/patri/:id`

```
PHONE                                          DESKTOP
╔════ brass roller (thickens on scroll) ═══╗   ┌──────┬────────────────────────┬──────┐
║ ◐ lac seal (pull down to reveal)         ║   │leaves│ ╔═ roller ═════════╗   │dial  │
║ ══ जन्म पत्री · Rahul ══════════════════ ║   │      │ ║ (480px paper col) ║   │      │
║ 14 Mar 1994 · 07:25 IST · Bengaluru      ║   │      │ ║ same sections    ║   │loupe │
║ ASIA/KOLKATA +05:30 · JD 2449425.5799    ║   │      │ ║ margin notes →   ║ ← citations
║ ══ जन्म पंचांग ══ tithi/vara/nakshatra…  ║   │      │ ╚═ roller ═════════╝   │diya  │
║ ══ राशि चक्र · Fig. 1 D1 ══════════════ ║   └──────┴────────────────────────┴──────┘
║        ◇──────◇            [Dev/Lat ring]║
║      ◇  2  ◇  1  ◇  12  ◇   ← diamond,  ║
║        ◇──● tilak──◇        ink-drawn    ║
║ Fig. 1 — Rāśi (D1), Lahiri SE-true, whole-sign, true node
║ ══ ग्रह · Grahas ═══ ledger ════════════ ║
║ Graha  Sign   Degree      Nakshatra-pada  Lord  ⚑
║ सू Sun  Kumbha 29°28′52″  P.Bhādrapadā 3  Gu       ← no asterisk: 31′08″ from the cusp
║ च Moon  Mīna 19°10′08″    Revatī 1        Bu       ← vermilion * only when ≤2′ from an edge
║ ══ नवांश · Fig. 2 D9 ══ (swipe → D2, D3, D7…) ║
║ ══ दशा · Dasha ══ accordion ribbon ══════ ║
║ ▐Śani ▌Budha ▌Ketu ▌ (brass clip = now)   ║
║ ══ योग · Yogas ══ "Tradition says…" ¹     ║
║ ══ colophon ══ disclaimer · preset · engine ║
╚════ brass roller ════════════════════════╝
│ Ledge                                    │
```
- **Components:** Roller ×2, LacSeal, TurmericBand, BirthLine, PanchangRows, KundliNorth / KundliSouth (flip), ScriptRing (Devanagari/Latin toggle on the top roller), Loupe, GrahaLedger (tabular, ′″ muted, boundary asterisk), VargaPager, DashaRibbon (accordion; pull a fold for pratyantar), YogaParagraph (citation superscripts → footnote sheet), Colophon.
- **States:** *loading* — the diamond frame draws while numbers are computed (< 50 ms; the draw is the wait); *cached* — no redraw on revisit; *preset changed* — the seal shows a haldi "recompute" tab; *error* — lac seal cracked with the reason; *near boundary* — asterisks + footnote "within 1′42″ of Anurādhā/Jyeṣṭhā; Drik preset would read Jyeṣṭhā" (that string is the synthetic fixture λ = 226.6383°; no graha in the reference chart is inside 2′ of an edge, so the reference Patri shows no asterisk).
- **Gestures:** scroll = unroll; pull-down = seal; hold seal = recompute; tap planet = loupe; drag loupe = register; swipe paper = flip N/S; swipe varga figure = next varga; flick ribbon = BRASS momentum; long-press ribbon tick = bookmark (brass paperclip).

### 9.6 Rooftop sky (birth sky dome) — `#/patri/:id/sky`

```
┌──────────────────────────────┐
│ ·    ·  ✦ Jupiter   ·    ·   │  R3F dome, stars mag ≤ 6, brass zodiac ring w/ 27 ticks
│   ·    ◯ Moon (phase) ·      │
│ ·  ─────brass ring─────── ·  │
│ ▒▒▒▒ east: Lagna beam ▒▒▒▒▒▒ │
│ ▁▁▁ parapet silhouette ▁▁▁▁▁ │
│ ▓ 07:25 IST · LAGNA MEENA · U.BHĀDRAPADĀ ▓  engraved strip
│ (◎ scrub ring ±12h)   ⇩ back │
└──────────────────────────────┘
```
- **Components:** SkyDome (three.js r185 + R3F 9, BSC5 stars — public domain, avoids HYG share-alike; lazy chunk), ZodiacRing (brass torus with nakshatra ticks), PlanetBillboards (Devanagari abbreviations on brass discs), LagnaBeam, ScrubRing (BRASS), EngravedStrip, PosterAction (1080 × 1920 PNG with the name in Yatra One).
- **States:** no WebGL / reduced motion / context lost → static painted sky (SVG stereographic map via d3-geo, ink dots on indigo); loading → painted sky first, dome crossfades in.
- **Gestures:** drag to look (BRASS inertia); scrub ring ±12 h; swipe down → desk; opt-in device tilt.
- No Ledge here (full-bleed); a single "⇩ desk" text button in the thumb zone.

### 9.7 Hast Rekha — capture — `#/hast/:id/capture`

```
┌──────────────────────────────┐
│ ▓ FILL THE FRAME · PALM FLAT · EVEN LIGHT ▓
│ ┌──────────────────────────┐ │
│ │   camera / picked photo  │ │
│ │   ╭ chalk hand outline ╮ │ │  lime-white 1px outline on the cloth
│ │   │                    │ │ │
│ │   ╰────────────────────╯ │ │
│ └──────────────────────────┘ │
│ sharpness ▮▮▮▮▯  exposure ▮▮▯▯▯  (haldi when low)
│ Right hand · dominant  [flip]│
│        [ ◉ shutter ]         │  vermilion stamp, 56px, enabled only when a hand is detected
│  Pick from gallery · Cancel  │
└──────────────────────────────┘
```
- **Components:** CameraView (`@capacitor/camera` on Android; `getUserMedia` / file input on web), HandOutline, QualityGauges (Laplacian variance, luma histogram), HandednessToggle, Shutter.
- **States:** permission denied → gallery-only with a plain note; no hand detected → shutter disabled, outline faint; too dark/blurred → haldi gauges + "move to the window"; processing → ink line draws under the frame.
- No Ledge (full-bleed); Cancel returns to the loupe desk.

### 9.8 Hast Rekha — loupe desk & reading — `#/hast/:id`

```
PHONE                                          DESKTOP
┌──────────────────────────────┐              ┌────────────────────┬──────────────────────┐
│ ══ हस्त रेखा · Right hand ══ │              │  print (512px)     │  reading leaf        │
│ ┌──────────────────────────┐ │              │  + loupe + stylus  │  ruled findings      │
│ │  palm print (rectified)  │ │              │                    │  citations in margin │
│ │  a. heart ─── ink        │ │              └────────────────────┴──────────────────────┘
│ │  b. head  ─── ink        │ │
│ │  c. life  ┄┄┄ faint+haldi│ │  ← low confidence: dashed, "trace to confirm"
│ │      (◯ brass loupe)     │ │
│ └──────────────────────────┘ │
│ Trace lines ✎   Other hand ⇄ │
│ ══ Findings ═══════════════ │
│ Element   Fire (W/L 0.84, F/L 0.71)
│ a. Heart  len 0.92 · curve 0.31 · conf 0.88
│ b. Head   len 0.78 · curve 0.12 · conf 0.81
│ c. Life   len 0.66 · curve 0.42 · conf 0.47 ⚑
│ Tradition says… ¹ ² (Samudrika Shastra)
│ Burn this print (hold)       │  --danger text
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```
- **Components:** PalmPrint (canvas, CSS `grayscale(.35) contrast(1.15)` — a print, not a museum plate), LineOverlay (SVG paths, `ink-draw`), Callouts a/b/c, Loupe, StylusEditor (Bézier handles, Motion drag), FindingsLedger, ReadingParagraph, BurnAction.
- **States:** no photo → an empty print frame with "Lay your hand here" and the loupe resting; MediaPipe loading → ink line; OpenCV lazy-loading (only when lines are requested) → "sharpening the stylus…"; lines not found → straight to trace mode; both hands captured → two prints side by side (swipe).
- **Gestures:** loupe follows touch; stylus drag; long-press a line → hide/show; hold Burn.

### 9.9 Guna Milan (matching) — `#/milan/:a/:b`

```
┌──────────────────────────────┐
│ ══ गुण मिलान · Milan ═══════ │
│ ╔ Rahul ╗   mauli   ╔ Priya ╗│  two small scrolls tied together; Manglik as sindoor marks
│ ║ ♓ रेव ║ ~~~~~~~~ ║ ♉ रोहि ║│
│ ╚═══════╝          ╚═══════╝ │
│            20 / 36           │  --text-5xl Tiro; band stamped in lac: "acceptable"
│ Varna  ●                     │  1 / 1   (○ = unearned wood, ● = brass, ◆ = lac dosha)
│ Vashya ● ●                   │  2 / 2
│ Tara   ● ◐ ○                 │  1.5 / 3
│ Yoni   ● ● ○ ○               │  2 / 4
│ Maitri ◐ ○ ○ ○ ○             │  0.5 / 5
│ Gana   ● ● ● ● ● ●           │  6 / 6
│ Bhakoot● ● ● ● ● ● ●         │  7 / 7   brass: Mīna ↔ Vṛṣabha is 3/11, not a dosha
│ Nadi   ◆ ◆ ◆ ◆ ◆ ◆ ◆ ◆       │  0 / 8   dosha → "Tradition says…" line beneath
│ ── 10-porutham (second, shorter thread) ▸
├──────────────────────────────┤
│ Ledge                        │
└──────────────────────────────┘
```
- **Components:** ScrollPair, MauliThread, ScoreNumeral, BeadRow ×8 (44 px hit areas on 18 px beads), KootaNote, LacBandStamp, PoruthamThread (collapsed).
- **The beads are the engine's output, never a drawing.** The wireframe above is the recomputed reference pair — Rahul (Moon in Revatī, Mīna) × Priya (Moon in Rohiṇī, Vṛṣabha) — which `ashtakoota()` scores `1 / 2 / 1.5 / 2 / 0.5 / 6 / 7 / 0 = 20 / 36 "acceptable"`. Bhakūṭa is a full **brass** seven; the one **lac** row is Nāḍī (both Moons are Antya). ARCHITECTURE §5.11 and IMPLEMENTATION-PROMPT §6.11 carry the per-koota derivation.
- **States:** one profile only → the second scroll is a dotted outline: "drag a leaf from the bundle"; tallying → beads slide (tap to finish instantly); complete → knot + stamp.
- **Gestures:** drag a leaf in; tap a koota row → rule + both nakshatras in Devanagari and Latin; swipe the pair to swap roles (boy/girl framing is a setting, defaults to A/B).
- **Desktop:** the two scrolls become full 480 px charts side by side above the mala.

### 9.10 The Drawer (settings & about) — `#/drawer`

```
┌──────────────────────────────┐
│ (desk, dimmed)               │
│ ╔═══════ wooden drawer ══════╗
│ ║ ▓ AYANAMSA ▓ magnified dial segment:            ║
│ ║   |Drik-mean |SE-mean |SE-true|  ticks 24″ apart ║  ← grafted instrument ticks
│ ║ Node: true ◉ mean ○   Dasha year: 365.25 / 360 ║
│ ║ Sunrise: upper limb+refraction / disc centre    ║
│ ║ Language: EN HI TA TE  · Devanagari digits ○    ║
│ ║ Chart script: देव / Lat  · Sound ◉ · Haptics ◉   ║
│ ║ Lamp: auto (sun) / lit / snuffed                ║
│ ║ Precision mode (AGPL lane) ○ — explains relicensing ║
│ ║ Export (wax envelope) · Import                  ║
│ ║ ── Colophon: engine, presets, fonts, GeoNames CC BY, MediaPipe, BSC5, disclaimer ── ║
│ ╚════════════════════════════════════════════════╝
└──────────────────────────────┘
```
- **Components:** Drawer (sheet, PAPER spring), DialSegment (SVG, 3 presets as ticks with arcsecond labels), RadioRow (ruled), ToggleRow (brass slide switch), ExportEnvelope, ColophonList (hanging indents).
- **States:** preset changed → every cached Patri gets the haldi "recompute" tab; export → passphrase sheet; import error → lac note.
- **Gestures:** drag down to close; from any screen, pull up from the Ledge's right end (or the Lamp long-press) opens it.

### 9.11 Offline / not-cached / 404 — `#/lost`
A blank leaf on the desk: "This leaf is not in the bundle." with a single text link back to the Vyom. Everything else works offline by construction (PWA precache of fonts, engine, GeoNames, models, sounds; OpenCV.js and the sky chunk are precached on first visit to their screens, with a note if not yet cached).

## 10. Component inventory

| Component | Variants | States |
|---|---|---|
| `Ledge` | phone (bottom, 5 objects) · desktop (left edge, vertical) | active object raised; hidden on Capture/Rooftop |
| `DeskObject` | scroll · bundle · dial · loupe · diya · celestial globe | rest · pressed (lift 2 px) · labelled (long-press) · disabled (greyed ink, no shadow) |
| `Roller` | top · bottom; brass cap radius `--radius-lg` | thickness bound to scroll progress; static under reduced motion |
| `LacSeal` | nakshatra symbol · cracked (error) · haldi tab (stale) | hidden · revealed · held (0–600 ms) · fired |
| `TurmericBand` | with kumkum tick (section) · plain (sub-section) · with right-aligned mono meta | — |
| `LedgerRow` | label/value · numeric (tabular) · with citation · with boundary asterisk | default · zebra (`--surface-2` at 50 %) · selected (loupe over it) |
| `KundliNorth` / `KundliSouth` | D1…D60; Devanagari/Latin; 320–480 px | drawing · drawn · flipped · loupe-focused house |
| `Tilak` | lagna · manglik (on Milan scrolls) | dab-in · static |
| `Loupe` | chart · palm · register (planet-snapping) | resting · rising · following · settled |
| `BrassDrum` | day · month · year · hour · minute · offset | idle · dragging · coasting · at-detent · refused (dull tick) |
| `EngravedStrip` · `ParapetSky` | zone/offset/JD · lagna · sky time; home (now) · entry (scrubbing) | digits setting · stable; day/dusk/night from sun altitude |
| `DashaRibbon` | MD · AD (fold) · PD (inner fold) | folded · pulled · clipped (bookmark) |
| `YogaParagraph` | with citations · with "show me" link to chart element | — |
| `Leaf` · `ThreadKnot` | profile · blank · dotted drop target; bundle · mala · pair knots | stacked · fanned · lifted · burning; tied · untying · snapped |
| `BeadRow` | koota 1–8 · porutham (boolean) | wood · sliding · brass · lac (dosha) |
| `PalmPrint` | right · left · pair | empty frame · loading · printed · burning |
| `LineOverlay` | heart · head · life · fate (optional) | drawing · drawn · faint (low confidence) · traced (vermilion) |
| `StylusEditor` | 3–4 Bézier paths | idle · dragging handle · committed |
| `QualityGauge` · `Shutter` / `SealButton` | sharpness · exposure gauges; vermilion stamp 48–56 px | ok · low (haldi); enabled · disabled (ink-faint outline) · holding · fired |
| `Drawer` · `DialSegment` | settings · colophon · export; ayanamsa presets as ticks | closed · open · passphrase; selected tick vermilion |
| `ToggleRow` / `RadioRow` / `FootnoteSheet` | brass switch · ruled radio · citation/boundary/end-time sheet | on/off, focus ring; sheet rises with PAPER |
| `Toast` (lac note) | info (ink) · warning (haldi fill, ink text) · danger (lac) | 4 s, dismiss by swipe |
| `Button` | text-with-underline (default) · stamp (one per screen) · danger text | hover/press/focus/disabled |

All primitives come from shadcn/ui on Base UI (Dialog → Drawer/FootnoteSheet, RadioGroup, Switch, Tabs → ScriptRing) restyled through tokens; no component is forked.

## 11. Iconography, illustration, imagery

- **Icons:** Lucide (ISC) at 16 px, 1.5 px stroke, `--ink` — used only *inside* paper content (chevrons, external-link, camera, share). Never in the Ledge (objects) and never as the sole label on a button.
- **Planet and nakshatra marks:** own SVG set drawn on a 24-unit grid in ink — Devanagari abbreviations (सू च मं बु गु शु श रा के) and Latin (Sū Ch Ma Bu Gu Śu Śa Rā Ke) as text, not glyph fonts; 27 nakshatra symbols as simple ink pictograms (horse, yoni, razor, cart, deer head…) for the seal and leaves. No Western zodiac symbols anywhere.
- **Objects (scroll, dial, loupe, diya, leaves, beads, drums):** CSS gradients + a handful of inline SVG shapes; no raster textures. The diya flame is a 2-path SVG with a warm gradient.
- **Paper grain:** one baked SVG (`feTurbulence`) exported to `/public/grain.svg` (< 6 kB).
- **Reference imagery (never shipped, moodboard/README only):** Wellcome Collection (CC BY 4.0), Wikimedia Commons per-file licences, Met Museum Open Access (CC0) for Indian manuscript borders studied for the turmeric band.
- **Stars:** Yale Bright Star Catalog BSC5 (public domain, ~9,100 stars) converted at build time to a 60 kB binary; HYG (CC BY-SA) avoided to keep the star file un-encumbered.
- **Gazetteer:** GeoNames cities500 subset (CC BY 4.0 — credited in the Colophon).
- **Models:** MediaPipe `hand_landmarker.task` (Apache-2.0, 7.5 MB, self-hosted in `/public/models`).

## 12. Sound & haptics

Howler.js sprite (one `chowki.webm` + `chowki.mp3`, ≤ 300 kB total), master gain 0.5, master mute in the Drawer, audio unlocks on the first gesture, defaults **on** but respects system silent mode. Sources: freesound.org with the CC0 filter (search: "paper rustle", "brass tick", "wood bead", "wax seal", "pencil scratch", "match strike") and Kenney.nl (CC0 UI audio); the tanpura is *not* used (Vyom is a desk, not a temple).

| Event | Sound (CC0 sprite) | Haptic (`@capacitor/haptics`; `navigator.vibrate` fallback on Chrome Android) |
|---|---|---|
| Scroll the Patri · overscroll | paper rustle, gain ∝ velocity (silent < 60 px/s) · roller creak | none · `impact Light` on snap-back |
| Hold seal / recompute | wax thunk | `impact Medium` |
| Ink draw · tilak dab | nib scratch looped for the draw · soft pat | none · `impact Medium` |
| Drum detent / dial / ribbon tick | brass tick, −18 dB, ≤ 1 per 40 ms | `selectionChanged` |
| Sign-boundary crossing (sky scrub) | brighter tick | `selectionChanged` |
| Bead slide | wooden click | `selectionChanged` |
| Mala knot / thread untie | thread snap | `notification Success` at ≥ 25; `notification Warning` when a boundary badge or low palm confidence first appears (no sound) |
| Diya lit / snuffed · stylus tracing | "fwoomp" / breath · leaf scratch while moving | `impact Light` · none |
| Burn (hold) | slow char crackle | `impact Heavy` on completion |
| Navigation, toasts, passive scroll | nothing | nothing |

## 13. Accessibility rules

- **Contrast:** all text on paper ≥ 4.5:1 (ink 15.2, muted 7.3, vermilion 5.2, lac 8.7, tulsi 6.0, warning-text 5.7); on the turmeric band vermilion text uses `--accent-text` (5.0). Brass is never text on paper; haldi is never text anywhere; ink-faint is never text. Engraved labels on brass ≥ 12 px mono at 4.9:1. Labels on wood use `--surface` (≥ 5.7:1 in both themes).
- **Focus:** every interactive element shows a 2 px `--focus` ring at 2 px offset with a 2 px `--surface` halo (visible on paper, brass, teak); focus order follows the patri reading order; drums are `role="spinbutton"` with arrow keys and typed entry; the loupe has a keyboard mode (Tab through planets, Enter to read).
- **Touch targets:** ≥ 44 × 44 px everywhere; beads 18 px visual / 44 px hit; Ledge objects 56 px; drums 56 px tall; shutter 56 px.
- **Motion:** `prefers-reduced-motion` per §7; additionally a "Calm desk" switch in the Drawer disables flicker, rustle and inertia independently of the OS setting.
- **Screen reader:** desk objects are buttons with names ("Janam Patri of Rahul, opens chart"); charts expose a visually hidden ledger table (`aria-describedby`) listing each planet, sign, degree, nakshatra-pada; the mala announces "Yoni: 4 of 4 points"; the palm overlay announces each line's confidence; live regions for drum values are `aria-live="polite"` and debounced 300 ms; decorative material (rollers, shadows, grain, flame) is `aria-hidden`.
- **Language:** `lang="hi"` / `lang="sa"` spans on Devanagari runs so TTS switches voice; Latin transliteration always present beside Devanagari terms.
- **Colour independence:** doshas are lac beads *and* labelled; boundary badges are asterisks *and* footnoted; confidence is ink darkness *and* a number.
- **Zoom:** layouts hold at 200 % browser zoom; the paper column reflows, rollers stay pinned; no text in raster images.
- **Content care:** no health, death, fertility or wealth predictions; the disclaimer is in every colophon; palm photos deletable in one hold; all data local (D5.5).

## 14. Android-specific notes (Capacitor 8)

- **Edge-to-edge:** `StatusBar.setOverlaysWebView(true)`, style `Dark` (light icons) on night desk and `Light` on morning terrace; status-bar area is teak (`--bg`), so the parapet strip starts below `env(safe-area-inset-top)`.
- **Gesture navigation:** the Ledge sits above `env(safe-area-inset-bottom)` (64 px + inset); no horizontal gestures start within 24 px of the screen edges (system back zone) — the ribbon and varga pager add `touch-action: pan-y` edge guards; predictive back is enabled (`android:enableOnBackInvokedCallback="true"`) and mapped to "return to Vyom" with the `object-open` reverse.
- **Splash / icon / manifest:** `@capacitor/splash-screen` teak `#1A110B` with the diya mark centred, fading into the desk in 240 ms; adaptive icon = brass diya with a vermilion flame tip (fg) on teak `#1A110B` (bg) with a diya-silhouette monochrome layer; manifest `theme_color #1A110B`, `background_color #F4EAD3`, `display: standalone`, `orientation: portrait` (Rooftop allows landscape).
- **Camera:** `@capacitor/camera` with `resultType: Uri`, `quality: 90`, `width: 1600`; `CAMERA` permission only; partial photo access on Android 14+ handled by the native picker.
- **Haptics:** `VIBRATE` permission; all calls no-op on devices without a vibrator.
- **WebView performance:** rollers, loupe, drums and beads are transform-only layers with `will-change`; paper grain is a static tile; the R3F dome is a lazy chunk with `frameloop="demand"`, DPR ≤ 1.5, paused on `visibilitychange`, `webglcontextlost` → painted sky; OpenCV.js lazy-loaded only on Hast; fonts, engine, gazetteer, models and sounds precached by Workbox.
- **Keyboard:** the drum row is not a text input, so the soft keyboard never covers the sky strip; name/place fields scroll into view with `scroll-margin-bottom: 96px`.
- **Text scaling:** honours system font scale up to 1.3× before the ledger switches to a stacked two-line row.

## 15. CSS design tokens (ready to paste — `src/styles/tokens.css`)

```css
:root {
  color-scheme: dark;

  /* ── colour (Night desk, default) ── */
  --bg: #1A110B;          --bg-elevated: #1D2748;   /* teak desk (margins only); indigo cloth */
  --surface: #F4EAD3;     --surface-2: #EAD9A9;     /* handmade paper (dominant); turmeric band */
  --ink: #1B1410;         --ink-muted: #5A483A;     --ink-faint: #9A8A72;   /* faint = art only */
  --accent: #B5301C;      --accent-text: #A8281A;   --accent-ink: #FFF6E6;  /* sindoor; text on band; on fills */
  --accent-2: #C9A24A;                              /* brass — never text on paper */
  --success: #356234;     --warning: #C68A12;       --warning-text: #7A5407; /* tulsi; haldi fills only */
  --danger: #7F160F;      --border: #C9B48A;        --border-strong: #8A7350; /* lac; turmeric hairlines */
  --focus: #22408E;       --moon: #DCE4F5;          --ledge: #241811;

  /* semantic aliases */
  --paper: var(--surface); --paper-band: var(--surface-2);
  --tilak: var(--accent);  --thread: var(--accent); --brass: var(--accent-2);
  --lac: var(--danger);    --haldi: var(--warning); --tulsi: var(--success);
  --engraved: color-mix(in oklch, var(--brass), black 55%);
  --moon-k: 0;                /* Moon illumination 0–1, set by the engine */
  --moon-fill: color-mix(in oklch, var(--bg-elevated), var(--moon) calc(var(--moon-k) * 14%));

  /* ── typography ── */
  --font-display: "Yatra One", "Noto Sans Devanagari", Georgia, serif;
  --font-body: "Tiro Devanagari Hindi", "Noto Serif Devanagari", Georgia, serif;
  --font-mono: "Martian Mono Variable", "Martian Mono", Consolas, "Courier New", monospace;
  --mono-wdth: 87;
  --text-xs: 0.75rem;  --text-sm: 0.8125rem;  --text-base: 1.0625rem;  --text-lg: 1.25rem;
  --text-xl: 1.375rem; --text-2xl: 1.75rem;   --text-3xl: 2.125rem;    --text-4xl: 3rem;
  --text-5xl: clamp(3rem, 16vw, 4.5rem);
  --leading-tight: 1.1; --leading-body: 1.5; --leading-devanagari: 1.6; --tracking-mono: 0.06em;

  /* ── spacing ── */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px; --space-4: 16px;
  --space-5: 20px; --space-6: 24px; --space-7: 32px; --space-8: 40px;
  --space-9: 48px; --space-10: 64px; --space-11: 80px; --space-12: 96px;
  --paper-margin: 20px;
  --ledge-height: calc(64px + env(safe-area-inset-bottom, 0px));

  /* ── radius ── */
  --radius-sm: 3px; --radius-md: 6px; --radius-lg: 14px; --radius-xl: 28px; --radius-full: 9999px;

  /* ── elevation (one lamp, bottom-right) ── */
  --lamp-x: 1; --lamp-y: 1;   /* bottom-right */
  --flicker: 0px;             /* ±0.6px jitter set by lamp-flicker */
  --shadow-alpha: 0.45;
  --shadow-1: calc(-2px * var(--lamp-x) + var(--flicker)) calc(-2px * var(--lamp-y) + var(--flicker)) 6px rgba(20, 10, 4, var(--shadow-alpha));
  --shadow-2: calc(-6px * var(--lamp-x) + var(--flicker)) calc(-5px * var(--lamp-y) + var(--flicker)) 18px rgba(20, 10, 4, calc(var(--shadow-alpha) + 0.05));
  --shadow-3: calc(-14px * var(--lamp-x) + var(--flicker)) calc(-12px * var(--lamp-y) + var(--flicker)) 36px rgba(20, 10, 4, calc(var(--shadow-alpha) + 0.10));
  --grain-opacity: 0.12;
  --vignette-far: 0.18;       /* darkness at the corner opposite the lamp */

  /* ── borders / strokes ── */
  --hairline: 1px; --stroke-chart: 1.25px;

  /* ── motion ── */
  --dur-fast: 120ms; --dur-base: 240ms; --dur-slow: 480ms; --dur-draw: 900ms;
  --ease-out: cubic-bezier(0.22, 0.8, 0.2, 1);
  --ease-in-out: cubic-bezier(0.65, 0, 0.35, 1);
  --ease-spring: linear(0, 0.36 10%, 0.78 21%, 1.02 34%, 1.06 42%, 1.01 58%, 0.99 74%, 1);
}

/* Morning terrace — auto by sun altitude, or diya snuffed */
:root[data-theme="day"] {
  color-scheme: light; --bg: #6E4A2E; --bg-elevated: #C9C1AE; --ledge: #5E3F27;
  --shadow-alpha: 0.22; --grain-opacity: 0.10; --vignette-far: 0.08;
}

@media (prefers-color-scheme: light) {
  :root:not([data-theme="night"]) {
    color-scheme: light; --bg: #6E4A2E; --bg-elevated: #C9C1AE; --ledge: #5E3F27;
    --shadow-alpha: 0.22; --grain-opacity: 0.10; --vignette-far: 0.08;
  }
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --flicker: 0px; --dur-draw: 240ms; --ease-spring: var(--ease-out);
  }
}
```

Tailwind v4 bridge (`src/index.css`): `@theme inline { --color-bg: var(--bg); --color-paper: var(--surface); --color-band: var(--surface-2); --color-ink: var(--ink); --color-accent: var(--accent); --color-brass: var(--accent-2); --font-display: var(--font-display); --font-body: var(--font-body); --font-mono: var(--font-mono); --radius-md: var(--radius-md); --ease-out: var(--ease-out); }`. `src/motion/springs.ts` exports `PAPER`, `BRASS`, `THREAD` and `INK` as the Motion 13 source of truth.

## 16. Asset checklist

- [ ] `design/preview.html` — Vyom home, Patri (D1 drawing + loupe), Writing the leaf (drums + sky strip), Guna mala; may hot-link Google Fonts (D1)
- [ ] Fonts: `@fontsource/yatra-one`, `@fontsource/tiro-devanagari-hindi` (400, 400i), `@fontsource-variable/martian-mono`; subset with `pyftsubset` (Latin + Devanagari + `°′″℞`); fallback `size-adjust` metrics
- [ ] `public/grain.svg` (baked feTurbulence tile, 256 px, < 6 kB) and `public/seal-edge.svg` (pre-displaced lac seal + tilak edges; no live filters)
- [ ] Ink pictogram set: 27 nakshatra symbols + 9 graha marks (SVG, 24-unit grid), Devanagari and Latin abbreviation text styles
- [ ] Desk objects as SVG/CSS: scroll, leaf bundle, brass dial (face + hands + Rahu Kaal arc), loupe, diya (2-path flame), celestial globe, brass drums, paperclip, mauli thread + beads, stylus, wax envelope
- [ ] Sound sprite `public/sounds/chowki.{webm,mp3}` ≤ 300 kB: rustle loop, creak, wax thunk, nib scratch loop, pat, brass tick, wood click, thread snap, fwoomp, breath, leaf scratch loop, char crackle — all CC0 with a `sounds/ATTRIBUTION.md`
- [ ] `public/models/hand_landmarker.task` (7.5 MB, Apache-2.0) + MediaPipe `wasm/` folder (self-hosted)
- [ ] `src/data/geonames-in.json.gz` (India + neighbours full, world ≥ 15k) with CC BY credit; `src/data/bsc5.bin` stars (public domain)
- [ ] Painted-sky fallback (d3-geo stereographic SVG) for reduced motion / no WebGL; Lucide subset (chevron, camera, share, external-link, x)
- [ ] Android: adaptive icon (fg brass diya / bg `#1A110B` / mono), splash `#1A110B` + diya, `theme_color #1A110B`, `background_color #F4EAD3`, PWA icons 192/512 + maskable
- [ ] Poster template (1080 × 1920): teak ground, star dome, name in Yatra One, engraved birth line
- [ ] Playwright screenshot baselines: home (night + day), Patri drawn, loupe open, drums, mala complete, palm reading, drawer — phone 390 × 844 and desktop 1280 × 800
- [ ] `docs/ATTRIBUTION` block for README: GeoNames (CC BY 4.0), MediaPipe (Apache-2.0), BSC5 (public domain), fonts (OFL), astronomy-engine (MIT), freesound/Kenney CC0 list
