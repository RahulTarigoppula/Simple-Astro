# Brief for anyone adding a feature in 4.0

Vyomaphala is a private, offline-first Jyotiṣa (Indian astrology) app for families: React 19, Vite, TypeScript,
Dexie (IndexedDB), Tailwind 4 plus hand-written CSS, Capacitor for Android. Everything is computed on the device.
Version 4.0 adds whole new features. You own one of them.

## Read first
- `docs/DESIGN-V3.md` (the look, the picture band, the rules). Follow it exactly.
- `src/features/home/HomeScreen.tsx` and `home.css` (reference screen: `Page` with `hero` and `sky`).
- `src/components/ui/` (`Page`, `Section`, `Row`, `Motion` = `Reveal`/`CountUp`, `SkyScene`, `InfoDot`), `src/styles/ui.css`
  (`.v-card`, `.v-list`, `.v-row`, `.v-seg`, `.v-btn`, `.v-fold`, `.v-meter`, `.v-chip`, `.v-actions`, `.v-foot`).
- `src/app/hooks.ts` or wherever `useProfiles`, `useActiveProfile`, `useSettings`, `usePatri`, `useHere`, `useNowMs`
  live (grep for them), and `src/features/forecast/util.ts` for date formatting helpers (`fmt`, `t12`, tone words).

## Hard rules
- A new screen opens on a **picture band** (`<Page hero=… sky=…>`) whose picture is drawn from the real numbers of
  the feature. Under it: at most three or four calm blocks; detail behind `details.v-fold` or tabs.
- Plain words first, Sanskrit as the small second line. A family member with no astrology knowledge must
  understand the top of the screen in five seconds.
- Voice: "tradition says / tradition favours", for reflection. Never health, death, money or legal advice, no
  remedies, no gemstones, no fear. Never promise an outcome.
- No hex colours outside `src/styles/tokens.css`. No `background-clip: text`. No `Math.random`. No new
  dependencies. No network calls. Every control at least 44 × 44 px with an accessible name; colour is never the
  only signal; text contrast 4.5:1 in both themes (band text is ivory on the dark band).
- Motion once, with `Reveal` / `motion/react`; complete and still under `prefers-reduced-motion`.
- Engine code (`src/engine/**`) is pure, deterministic and unit-tested (Vitest, node). Do not change the output
  of any existing engine function. Reuse `computePanchang`, `forecast`, `personalReading`, `dayGuide`, `skyEvents`.
- Do not reword or touch Rahul's story or the "252 hours" lines. Keep internal names (`chowki`, storage keys, routes).
- Only edit the files your task names, plus **one line** in `src/app/router.tsx` to register your route (use an
  exact-string Edit; other people are editing other lines of that file at the same time, so never rewrite it).
  Do not touch `HomeScreen.tsx`, `tokens.css`, `ui.css`, `package.json`, docs or the changelog: the lead wires
  entry points and writes docs. If you need a token or shared class that does not exist, define it in your own CSS
  from existing tokens and say so in your report.
- Do not commit, push, or run the whole test suite (the machine is busy and full runs time out). Run:
  `npx biome check --write <your files>`, `npx tsc -b`, and `npx vitest run <your test files>`.

## Looking at your work
A dev server is already running on http://localhost:5173/ (do not start another). Screenshot with:
`node scripts/shots2.mjs <outDir> <people 0|1|2> <m|d|s> "route=name" …` (`m` phone full length, `s` phone first
screen, `d` desktop; `{a}` `{b}` in a route are the two seeded people's ids; env `THEME=day` for the light theme,
`MOTION=1` to let animations finish, `AT=<ISO time>` to fix the clock, `CLICK="text|text"` to click before the
shot). Write shots under the scratch folder you are given, then **look at them** (Read the PNG) in dark, light,
phone and desktop, and fix what looks wrong before you report.

## Report back (short)
Files added or changed, the route(s), the exported things the lead needs to wire an entry point (component names,
props, a one-line summary function if the home screen should show a teaser), tests added and their result,
anything you were unsure about, and anything you did not verify.
