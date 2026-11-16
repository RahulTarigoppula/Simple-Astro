# Vyomaphala 3.0 design: "ivory and ink"

Written 2026-11-16. This supersedes the look described in docs/DESIGN-V2.md. The structure from 2.0 stays
(five tabs, the person chip, `Page` / `Section` / `Row`, the `.v-*` classes, plain words first); the look and the
amount on each screen change.

## Why 2.0 still was not right
It read as a dark dashboard: navy and violet gradients, an outline around everything, small type, boxes inside
boxes, and far too much on each screen. People had to scroll through several screens of equal-weight cards.

## The look
- **Warm paper and ink.** Light: ivory page (`--bg`), white cards, near-black ink. Dark: warm near-black page,
  charcoal cards, ivory ink. No blue, no violet, no gradients, no glows, no star specks behind pages.
- **One accent**, a warm terracotta/amber (`--accent`, `--accent-text`, `rgba(var(--accent-rgb), a)`), used
  sparingly: a link, the brand mark, an avatar, a hero wash. The primary button is ink (`--btn-fill` with
  `--accent-ink` text), not the accent.
- **Colour means something** and nothing else: `--good` green, `--calm` blue, `--mixed` amber, `--care` red, each
  with a `-soft` ground. Never decorate with them.
- **Serif headings.** `--font-display` is Source Serif 4: page titles, section headings, the one big word or number of a
  hero. Weight 500 to 560, never bolder than 600. Everything else is Inter (`--font-body`): card titles, rows,
  labels, buttons. Numbers in tables may use `--font-mono`.
- **No outlines.** A card is a filled shape (`.v-card`), radius 24, padding 20, no border. Separate things with
  space first, a hairline (`1px solid var(--card-edge)`) second, a box last. Never a box inside a box: inside a
  card use plain text, hairlines or a soft fill `rgba(var(--tint), 0.05)`.
- **Air.** Page padding 20, 16 between cards, a section heading has 18 above it. Body text 16 to 17 px,
  secondary 14 px minimum, line height 1.5.
- Round, soft controls: pill buttons, pill segmented tabs, round icon discs.

## How much goes on a screen
1. The top of every screen is the answer in one sentence a family member understands, set large.
2. After it, at most three or four supporting blocks. Everything else goes behind a segmented tab, a
   `details.v-fold`, a sheet, or its own page. If a screen is longer than about three phone heights, cut or fold.
3. Never show the same block on two screens (the home shows a summary and links to the full view).
4. One primary button per screen. Lists of links are `.v-list` rows, not grids of small cards.
5. Sanskrit is the small second line, never the heading. No uppercase eyebrow above every card: use an eyebrow
   only on a hero.

## Tokens to use (all in `src/styles/tokens.css`)
`--bg`, `--card`, `--card-2`, `--card-hi`, `--card-edge`, `--card-edge-strong`, `--ink`, `--ink-muted`,
`--ink-faint` (art only), `--accent`, `--accent-text`, `--accent-ink`, `--accent-rgb`, `--accent-2` (gold, for
the Sun and "now" marks), `--btn-fill`, `--tint` (as `rgba(var(--tint), a)` to lift or sink a surface),
`--good|calm|mixed|care` (+ `-soft`), `--shadow-card`, `--radius-md` 16, `--radius-lg` 24, `--radius-full`.
Do not use: `--aurora` except for avatars, `--glow-*`, `--nebula-*`, `--void-*`, `backdrop-filter`,
`linear-gradient` / `radial-gradient` for decoration, `text-transform: uppercase` on anything longer than a label.

## Still true from 2.0 (tests or CI)
- No hex colour outside `tokens.css` / `astral.css`. No `background-clip: text`. No `Math.random`.
- `npx biome ci .` and `npx tsc -b` pass. Every control at least 44 × 44 px with an accessible name; colour is
  never the only signal; text reaches 4.5:1 in both themes (axe runs in e2e).
- Night pictures (sky at birth, sky wheel, story art, intro, palm capture) keep `v-night` and stay dark.
- Voice: "tradition says", for reflection; never health, death, money or legal advice, remedies or gemstones.
- Rahul's own story and the "252 hours" lines are quoted from him: move them, never reword or add to them.
- Internal names stay (`chowki` DB, storage keys, route paths, engine and repo APIs). Engine output is untouched.

## 3.1: the picture band (the part that should make people say "oh")
3.0 was clean but plain. From 3.1 every tab opens on a **full-bleed picture band** that shows the answer as a
picture, then the calm ivory-and-ink page slides up over it with rounded corners.
- `Page` takes `hero` (the band's content; the top bar is placed on the band for you) and `sky`
  (`night | dawn | day | golden | dusk`, which paints the band from `--sky-paint-*`). The band has class
  `v-night`, so every token inside it has its night value and text is ivory in both themes. Reference:
  `src/features/home/HomeScreen.tsx` (`.sky-hero` in `home.css`).
- The picture must be **true**: drawn from the engine's numbers for this person and this moment (the Sun on its
  real arc, the Moon in its real phase, the real stars of a birth star, the real scores of the days ahead). Never
  decoration for its own sake, never stock imagery, never random.
- One big serif word or sentence sits on the picture; one primary button at most.
- Colours on a band: ivory text (`var(--ink)`), `rgba(255, 255, 255, a)` for secondary text and glass,
  `--sky-sun`, `--sky-moon`, `--sky-good`, `--sky-avoid`, `--star`, `--accent-2`. Gradients are allowed on bands.
- Motion (`src/components/ui/Motion.tsx`): `Reveal` staggers blocks into place, `CountUp` counts a number up;
  pictures draw themselves in once (`motion/react`, `pathLength`). Everything stands still under
  `prefers-reduced-motion` and must look complete when still.
- Below the band the 3.0 rules hold unchanged.
