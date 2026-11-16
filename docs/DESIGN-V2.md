# Vyomaphala 2.0 design: "clear sky"

Written 2026-11-16. This replaces docs/UI-CONVENTIONS.md and the visual parts of docs/DESIGN.md for every screen.
The reference implementation is `src/features/home/HomeScreen.tsx` + `home.css`; read it before writing a screen.

## Why 1.x was hard to use
- Home was a brochure ("here is everything the app can do"), not an answer.
- Six tabs with overlapping meanings; switching person was hidden; Settings was a gear on one screen.
- Every screen was a long stack of equal-weight glass cards, jargon in the headings, bilingual titles.
- Unusual gestures (hold to save) and one very long form.

## Principles
1. **Answer first.** The top of a screen is the one thing the person came for, as a sentence a family member understands. Detail comes after, and deep detail is folded away.
2. **One idea per card, three levels at most:** the answer (hero card) → a few supporting cards → "Full detail" folds (`<details class="v-fold">`) for the astrology.
3. **Plain English first.** Sanskrit terms follow in brackets or as the small line, with an ⓘ (`<InfoDot id>`). No Devanagari in headings (it stays as a small ornament where it already carries meaning, and on the chart figure).
4. **Tap is the only gesture** for normal actions: real buttons with a verb. Hold stays only for destroying data.
5. **One person in view.** Every page shows the person chip (top right). It switches person and holds People, Settings, How to use, About.
6. **Short screens.** Use segmented tabs (`.v-seg`) to split a long screen into views rather than one long scroll. Nothing important below three screens of scroll.
7. Calm surfaces: solid cards, one accent, colour only carries meaning (good / steady / mixed / go gently). No decorative star specks or glows inside cards.

## Navigation
Five tabs (`src/app/Ledge.tsx`): **Today** `/` · **Chart** `/patri/:id` · **Forecast** `/forecast/:id` · **Match** `/milan` · **Explore** `/explore`.
Docked bar on phones, a labelled rail at ≥ 900 px. Everything else (almanac `/today`, palm `/hast/:id`, people `/circle`,
settings `/drawer`, guide, about, story, add/edit person) is a secondary page with a Back button.

## Building blocks
`src/components/ui/Page.tsx`
- `<Page label title eyebrow lede back wide noPerson action className>`: the frame. Tabs omit `back` (brand shows on phones); secondary pages pass `back` (true = history back, or a route string). It renders the scrolling `<main>`; do not nest another scroller.
- `<Section title note action as>`: a heading between cards.
- `<Row to|onClick icon tone title sub end>`: a tappable list row; wrap rows in `<ul class="v-list"><li>…`.
- `ChevronRight`, `ChevronLeft`, `Brand`.
`src/components/ui/PersonChip.tsx`: `PersonChip` (already inside Page), `Avatar`, `birthLine(profile)`.
Existing and still used: `Sheet`, `InfoDot` / `Term` / `Gloss`, `GrahaGlyph`, `Toasts` (`toast()`), `Colophon`, `HoldStamp` (destructive only).

`src/styles/ui.css` classes (all colours are tokens from `src/styles/tokens.css`):
- layout: `.v-page` (column, 14 px gap), `.v-stack`, `.v-grid2`, `.v-grid3`, `.v-cols` (two columns ≥ 900 px), `.v-actions`
- text: `.v-eyebrow`, `.v-title`, `.v-lede`, `.v-muted`, `.v-small`, `.v-gold`, `.v-foot`
- cards: `.v-card` (+ `--hero`, `--raised`, `--flush`), `.v-card__title`, `.v-card__sub`
- lists: `.v-list` > `li` > `.v-row` (`__icon` + `--gold|cyan|rose|green`, `__body`, `__t`, `__s`, `__end`)
- buttons: `.v-btn` (+ `--ghost`, `--quiet`, `--danger`, `--sm`, `--block`), `.v-link`, `.v-iconbtn`, `.v-back`
- tabs: `.v-seg` with `button[role=tab][aria-selected]` (or `aria-pressed` / `aria-checked`)
- status: `.v-chip` (+ `--good|calm|mixed|care|gold|violet`), `.v-meter > span`, `[data-tone="bright|steady|mixed|testing"]` sets `--tone` / `--tone-soft`
- folds: `details.v-fold > summary` (+ `.v-fold__s` sub-line) and `.v-fold__body`
- forms: `.v-field`, `.v-label`, `.v-hint`, `.v-input`, `.v-select`, `.v-error`
- other: `.v-note` (+ `--warn`, `--care`), `.v-empty` + `.v-empty__art`, `.v-ticks`, `.v-skel`
Tokens: `--card`, `--card-2`, `--card-hi`, `--card-edge`, `--card-edge-strong`, `--good`, `--calm`, `--mixed`, `--care` (each with `-soft`), `--violet-soft`, `--gold-soft`, `--ink`, `--ink-muted`, `--accent`, `--accent-text`, `--accent-2` (gold), `--aurora`, radii `--radius-md|lg`, fonts `--font-display|body|mono`.

## Rules that are tests or CI
- No hex colour outside `src/styles/tokens.css` / `astral.css` (rgba() is fine). No `background-clip: text`. No `Math.random`.
- `npx biome ci .` must pass (hook dependencies are errors). `npx tsc -b` must pass.
- Every control ≥ 44 × 44 px with an accessible name; colour is never the only signal; decorative art is `aria-hidden`.
- Type: body ≥ 15 px, secondary ≥ 13 px. Headings Sora (`--font-display`), body Inter.
- Voice: readings are "tradition says", for reflection. Never health, death, fertility, money or legal advice, remedies, gemstones.
- Rahul's own story and the "252 hours" lines are quoted from him: move them, never reword or add to them.
- Internal names stay (`chowki` DB, `vyom-`/`chowki` storage keys, route paths, engine and repo APIs).
