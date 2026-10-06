# UI conventions (for everyone writing screens)

- **Visual contract:** `design/preview.html`. `src/styles/kit.css` is a port of its CSS with the same class
  names (`.paper`, `.band`, `.rows/.row`, `.ledger`, `.engraved`, `.stamp`, `.linkish`, `.note-haldi`,
  `.note-lac`, `.printframe`, `.print-lines`, `.tools/.tool`, `.gauge`, `.confbar`, `.pair`, `.mauli`,
  `.score`, `.stampband`, `.beads`, `.loupe*`, `.chart`, `.ribbon`, `.fold-in`, `.yoga`, `.colophon`,
  `.sheet-col`, `.field`, `.drum*`, `.seg`, `.switch`, `.radio-row`, `.toggle-row`, `.cloth`, `.deskobj`).
  Read it before writing markup. Do **not** edit `kit.css`; put screen-specific CSS in
  `src/features/<feature>/<feature>.css` and import it from the screen.
- **No hex colour outside `src/styles/tokens.css`.** Use `var(--token)`. If a material needs a new stop,
  append a token to the *extension* block at the end of `tokens.css` (never edit the verbatim §3.3 block).
  SVG attributes may use `fill="var(--brass-mid)"` / `stopColor="var(--accent)"`.
- **Forbidden:** `backdrop-filter`, `filter: blur()`, text-shadow, gradient text, mesh gradients, raster
  textures, spinners. Loading = an ink line drawing (`useInkDraw`). Shadows always fall up-left
  (`var(--shadow-1|2|3)`), never animated.
- **Primitives** (`src/components/ui/`): `Screen` (route surface with object-open), `TurmericBand`,
  `HoldStamp` + `useHold` (600 ms hold), `DigitSet` (numerals set digit by digit), `Sheet` (native
  `<dialog>` bottom sheet: focus trap, Esc), `Colophon` (renders the standing disclaimer), `Toasts` via
  `toast(text, kind)` from `src/state/ui.ts`, `useInkDraw(ref, deps)` for `[data-ink]` strokes and
  `[data-settle]` marks.
- **Platform:** `haptics.selection() / impact() / notify()` from `src/platform/haptics.ts`; sounds via
  `play(id)` / `rustle(v)` from `src/platform/sound.ts`; `reducedMotion()`/`isNative()` from
  `src/platform/native.ts`.
- **Data:** read with hooks in `src/app/hooks.ts` (`useSettings`, `useProfiles`, `useProfile`,
  `useActiveProfile`, `usePatri`); write only through `src/data/repo.ts`. Engine calls are pure.
- **Routes:** each screen module **default-exports** its component (lazy route). Use `<Link>` /
  `useNavigate` from `react-router`; call `rememberOrigin(el)` (`src/app/origin.ts`) before navigating
  from a desk object so the next screen grows out of it.
- **Type:** Yatra One (`.display`, `.band h2`) ≤ six words per screen; Martian Mono (`.mono`) only on
  brass/teak or for tabular numerals in ledgers; body Tiro ≥ 17 px; Devanagari runs carry
  `lang="hi"` (`lang="sa"` for Sanskrit terms) and sit beside a Latin transliteration.
- **Accessibility:** every interactive element ≥ 44 × 44 px with an accessible name, a keyboard path,
  and the global focus ring. Colour is never the only signal (doṣa beads are labelled, confidence is a
  number). `aria-hidden="true"` + `data-decorative="true"` on decorative material.
- **Voice:** headings bilingual, Devanagari first. Readings start "Tradition says…" with a citation.
  Never health, death, fertility, wealth, money, legal, remedies, gemstones, poojas.
- **Determinism:** no `Math.random` anywhere — use `mulberry32` from `src/engine/math.ts`.
