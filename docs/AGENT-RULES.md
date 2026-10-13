# Rules for anyone adding to Vyom

Repo: `C:\Work\Personal_Projects\02-jyoti-astrology-palmistry` (Windows; Bash = Git Bash; Node 22). Read
`docs/UI-CONVENTIONS.md` (UI) and the relevant sections of `docs/IMPLEMENTATION-PROMPT.md` first.

- **Engine purity:** `src/engine/**` imports nothing from React/DOM/Dexie/Zustand/Capacitor, never reads
  the clock (`Date.now`, argless `new Date()`) or `Math.random` — take explicit instants; use
  `mulberry32` from `src/engine/math.ts`. Every classical rule carries a `Citation` and has a positive
  and a negative test. Types live in `src/engine/types.ts` (you may ADD optional fields/types; never
  rename).
- **Content care:** readings start "Tradition says…", describe temperament/timing tone, never predict
  health, death, illness, fertility, wealth, money, legal outcomes, marriage dates, remedies, gemstones,
  poojas (`src/test/banned-words.ts` is enforced by tests). Sade-Sati and similar must be phrased calmly
  ("a period tradition reads as demanding patience"), never fear-mongering.
- **TypeScript strict** + `noUncheckedIndexedAccess` + `exactOptionalPropertyTypes`; no `any`, no
  `@ts-ignore`, no non-null `!`.
- **Design:** no hex colour outside `src/styles/tokens.css` (append new tokens to its extension block only),
  no blur/backdrop-filter/text-shadow/gradient text, transform/opacity animations only, ≥ 44 px targets,
  accessible names, `lang="hi"` on Devanagari, Yatra One ≤ six words per screen, Martian Mono only for
  engraved brass or tabular numerals. Reuse `src/styles/kit.css` classes and `src/components/ui/*`
  (`TurmericBand`, `Sheet`, `DigitSet`, `Colophon`, `useHold`, `useInkDraw`, `HoldStamp`, `Screen`).
- **Data:** read via `src/app/hooks.ts`; write only via `src/data/repo.ts`. Times shown to the person are
  formatted in the relevant place's IANA zone (`Intl.DateTimeFormat` with `timeZone`), never the device zone.
- **Tests:** `npx vitest run --project engine <files>` (node) / `--project dom <files>` (jsdom,
  `*.test.tsx`; jsdom lacks `Element.prototype.animate` — stub it in the test). Type-check:
  `npx tsc -b` (must stay clean). Lint: `npx biome check --write <your files>` then `npx biome check <your files>` clean.
- **Never:** `npm install`/edit `package.json`, `git commit`, touch files you were not given, add network
  calls, add analytics. In Git Bash prefix anything with `/jyoti/` by `MSYS_NO_PATHCONV=1`.
- **Final message:** files, exported API, test counts, deviations — under 500 words.
