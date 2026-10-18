# Research: MVP plans and workout loop (F-03, S-01..S-06)

## Entry points
- `package.json:6-10` — scripts `dev`, `build` (`vue-tsc -b && vite build`), `preview`. Add `test` and `test:watch` here.
- `tsconfig.json:2-5` — `files: []` plus two references. Add a third reference for test files here.
- `tsconfig.app.json:12` — `include` covers only `src/**`. Test files in `src/` would be type checked here, but with no vitest types (`types` is `["vite/client"]`, line 4).
- `vite.config.ts:5-7` — `defineConfig({ plugins: [vue()] })`. This is where `test` config goes.
- `index.html:2` (`lang="en"`), `index.html:5` (favicon link), `index.html:7` (`<title>bootstrap-scaffold</title>`), `index.html:10` (loads `/src/main.ts`).
- `src/main.ts:1-5` — `createApp(App).mount('#app')`; imports `./style.css`.
- `src/App.vue:1-7` — only renders `HelloWorld`. Becomes the screen switcher (no router allowed).
- `context/foundation/roadmap.md:94-109` (F-03), `:111-` (S-01) and later slices define Done-when.

## Reuse
- Nothing in `src/` is reusable. `CLAUDE.md` and `auto-loop.md:210-212` say the scaffold files are leftovers.
- `DESIGN.md:39-73` has the type scale tokens (Barlow Condensed 800/700, Barlow Semi Condensed 500/600). `DESIGN.md:178-179` names the fonts and fallbacks.
- `auto-loop.md:181-220` (section 9) holds the rules to inject into every subagent.
- `tsconfig.app.json:1` extends `@vue/tsconfig/tsconfig.dom.json`. A test tsconfig can extend `tsconfig.app.json` and reuse its flags.

## Hazards
Project rules (all from `auto-loop.md` section 9, lines 181-220):
- Read `DESIGN.md` and `PRODUCT.md` before any UI work. Dark theme only. No emoji icons, no gradients, no left stripe.
- Fonts from `public/`, not a CDN. UI text Polish. No enum, namespace or constructor parameter properties (`tsconfig.app.json:11`, `erasableSyntaxOnly`).
- `noUnusedLocals` and `noUnusedParameters` (`tsconfig.app.json:9-10`) fail the build, test files included once covered.
- Rest time from timestamps only. Stored workout shape must stay readable after a change (`auto-loop.md:198-200`).

Scaffold to remove or replace:
- `src/components/HelloWorld.vue` (whole file; uses `/icons.svg` at lines 31, 52, 60, 68, 76, 84).
- `src/assets/hero.png`, `vite.svg`, `vue.svg` (`ls src/assets`).
- `src/style.css` (296 lines): light-theme demo variables (lines 1-30), `.counter` (87, 101), `.hero` (120), `.vite`/`.base` (125, 130). Replace whole file with DESIGN.md tokens.
- `public/icons.svg` (only used by HelloWorld). `public/favicon.svg` is linked at `index.html:5`; keep or replace.
- `index.html`: set `lang="pl"`, a real title. The `:root` has `color-scheme: light dark` (`style.css` line 20); MVP is dark only.

Versions and platform facts:
1. Test tools (from `npm view`, run 2026-10-18; Node here is v22.23.1):
   - `vitest` latest 5.0.5. `peerDependencies.vite: '^6.4.0 || ^7.0.0 || ^8.0.0'`, `@types/node: '^22.0.0 || >=24.0.0'`, `engines.node: '^22.12.0 || ^24.0.0 || >=26.0.0'`. Project has vite ^8.3.0 and @types/node ^24.13.3: compatible. Pin `vitest@5.0.5`.
   - `@vue/test-utils` latest 2.5.1, peer `vue: 3.x`. Pin `2.5.1`.
   - `jsdom` latest 30.1.3, `engines.node: '^22.22.2 || ^24.15.0 || >=26.0.0'`. Node v22.23.1 meets it; Node 22.12-22.22.1 does not. Pin `30.1.3`. `jsdom` is an optional peer of vitest, so it must be a devDependency.
   - Config: `test` can go in `vite.config.ts` (vitest reads it). Use `import { defineConfig } from 'vitest/config'` so the `test` key type checks; plain `vite` `defineConfig` rejects `test`. No separate `vitest.config.ts` needed. Set `test: { environment: 'jsdom' }`. Not verified by running; no install allowed in this step.
   - Trap: `tsconfig.node.json:13` uses `module: nodenext` with `verbatimModuleSyntax` (line 14). `vitest/config` is ESM and `package.json:4` is `"type": "module"`, so the import resolves. Use `import type` for type-only imports.
   - Type check of tests: add `tsconfig.test.json` extending `./tsconfig.app.json`, set own `tsBuildInfoFile`, `include: ["src/**/*.test.ts"]`, and `types: ["vite/client", "vitest/globals"]` if `globals: true`. Simpler: no globals, import `describe/it/expect` from `vitest` explicitly and leave `types` alone. Then exclude `*.test.ts` from `tsconfig.app.json` (`exclude`) so the app config does not see them, and reference the test config from `tsconfig.json`. Each referenced project must be composite-compatible under `vue-tsc -b`; copy the pattern from `tsconfig.app.json`.
   - Trap: `@vue/tsconfig` sets `verbatimModuleSyntax: true` and `allowImportingTsExtensions: true` (`node_modules/@vue/tsconfig/tsconfig.json:43`, `:18`), `moduleResolution: bundler` (`:16`). Imports of `.vue` need `.vue` suffix; type-only imports need `import type`. `erasableSyntaxOnly` bans enums in test helpers too.
2. Fonts (`npm view`, `npm pack --dry-run`): `@fontsource/barlow-condensed` 5.3.0 and `@fontsource/barlow-semi-condensed` 5.3.0, license `OFL-1.1` for both. Files are in `files/` inside each package. Pattern: `barlow-condensed-{latin,latin-ext}-{700,800}-normal.woff2` and `barlow-semi-condensed-{latin,latin-ext}-{500,600,700}-normal.woff2`. Polish letters (ą ć ę ł ń ó ś ź ż) sit in `latin-ext`. Sizes 14-23 kB each; 10 files total. Declare `@font-face` per weight with `unicode-range` for each subset (the fontsource CSS in `node_modules/@fontsource/*/` carries the ranges; not read here). DESIGN.md uses only weights 500, 600 (Semi Condensed) and 700, 800 (Condensed) at `DESIGN.md:39-73`; Semi Condensed 700 is requested by the brief but not seen in the token lines read.
3. Chrome Android behaviour (from general platform knowledge; not fetched in this step):
   - AudioContext must start or resume inside a user gesture (autoplay policy): https://developer.chrome.com/blog/autoplay#web_audio. Right place: the tap that starts the workout ("Start"), and also the tap per set, call `ctx.resume()` there.
   - Wake Lock sentinel is released when the page becomes hidden; call `navigator.wakeLock.request('screen')` again on `visibilitychange` when visible: https://developer.chrome.com/docs/capabilities/web-apis/wake-lock
   - Wake Lock needs a secure context; `localhost` counts: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
   - jsdom has no `navigator.wakeLock`, `AudioContext` or `navigator.storage`: code must feature-check and tests must stub them.

## Unknowns
- Sources for item 3 were not fetched in this run (written from known documentation); confirm if a Done-when depends on exact wording. Block: no.
- Vitest 5 + `vitest/config` in `vite.config.ts` under `tsconfig.node.json` (`nodenext`) was not run (no install allowed). If `vue-tsc -b` rejects it, fall back to a separate `vitest.config.ts` and add it to `tsconfig.node.json` `include`. Block: no.
- Whether Barlow Semi Condensed 700 is used in `DESIGN.md` (only 500 and 600 seen at lines 65-73). Block: no.
