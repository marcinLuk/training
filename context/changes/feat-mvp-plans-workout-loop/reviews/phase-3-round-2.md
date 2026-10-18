# Phase review — feat-mvp-plans-workout-loop · Phase 3: App shell, plan list and new-plan editor · round 2

- **Scope:** `git diff HEAD` plus untracked files of this phase: `index.html`, `package.json`, `package-lock.json`, `public/favicon.svg`, `public/fonts/*` (new), deleted `public/icons.svg`, `src/assets/*`, `src/style.css`, `src/components/HelloWorld.vue`; `src/main.ts`, `src/App.vue`, `src/styles/{fonts,tokens,base}.css`, `src/components/{PlanList,PlanEditor,NumberStepper,FieldError}.vue`, `src/components/{App,PlanList,PlanEditor,NumberStepper}.test.ts`, `src/components/testHelpers.ts`, `src/plans/format.ts` + `format.test.ts`, `DESIGN.md` (+2 lines), `CLAUDE.md` (one paragraph), `brief.md` Progress rows 3.1–3.3. Not this phase: `context/foundation/auto-loop.md`, `context/foundation/roadmap.md`, `workbench.md`, `.loop-baseline`.
- **Files reviewed:** 41 (15 tracked changed, 14 new source files, 12 font and license files compared byte for byte with the npm packages) (`+1085/-429` text lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `## Progress` Phase 3 rows 3.1–3.5 and `## Slice details` → Phase 3
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 3.1 | component tests: defaults, steppers (rest in 15 s steps), empty-name error, saving, list summary with Polish plurals | `timeout 300 npx vitest run src/components` | pass — `Test Files 4 passed (4)`, `Tests 23 passed (23)`; 0 skipped (grep for `.skip/.only/.todo` in `src/**/*.test.ts`: none) |
| 3.2 | full suite | `timeout 300 npm test` | pass — `Test Files 8 passed (8)`, `Tests 121 passed (121)`, exit 0 |
| 3.3 | build, fonts in `public/fonts/`, no http(s) URL in built CSS | `timeout 300 npm run build`; `ls public/fonts`; `grep -oE 'https?://…' dist/assets/*.css` | pass — build exit 0 (`dist/assets/index-Cafcd19N.css 7.60 kB`); 10 woff2 files + `LICENSE-barlow-condensed-OFL.txt`, `LICENSE-barlow-semi-condensed-OFL.txt` (both "SIL Open Font License, Version 1.1"); grep: "no http(s) URL in built CSS"; the only `url(...)` values are `/fonts/barlow-*.woff2`. All 10 woff2 files and the condensed license are byte-identical (`cmp`) to `node_modules/@fontsource/*/files/` and `LICENSE`. |

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `validation-error-input-retention-unpinned` | round 1 | yes | Mutant copy in the scratch dir (`cp -r src … && ln -s node_modules`). Baseline in the copy: `Tests 121 passed (121)`. Line `PlanEditor.vue:50` (`if (errors.value.length > 0) return`) replaced by 8 wrong implementations, each run with `timeout 300 ./node_modules/.bin/vitest run src/components`. Table below: every mutant is caught by the new test `keeps the typed input when validation fails` (`PlanEditor.test.ts:104-131`). Browser walk also showed it: after a failed save (exercise 2 with no name) the inputs still held `["Wiosłowanie i przysiady","Wiosłowanie",""]` and the steppers `4 / 9 / 2:00`; `localStorage` was empty (`p3-r2-02-validation-keeps-input.png`). |

Mutant table for the closure (validation-failure branch of `save()`):

| Mutant | Result |
| :-- | :-- |
| M1 wipe plan name and all exercise names | `Tests 1 failed \| 22 passed` — `keeps the typed input when validation fails` |
| M2 wipe the plan name only | `1 failed` — same test |
| M3 drop every row but the first (`splice(1)`) | `1 failed` — same test |
| M4 drop rows with an empty name | `2 failed` — same test + `shows the empty-name errors…` |
| M5 reset sets/reps/rest to 3/10/90 | `1 failed` — same test |
| M6 reset the whole form (`name=''`, one fresh row) | `1 failed` — same test |
| M7 wipe exercise names only | `1 failed` — same test |
| M8 reset rest to 90 only | `1 failed` — same test |

Wrong-implementation table for the new pure function `formatRest` (`src/plans/format.ts`), run with `vitest run src/plans/format.test.ts src/components` in the copy:

| Mutant | Result |
| :-- | :-- |
| F1 no zero pad (`0:0`) | `2 failed` |
| F2 `Math.round` for minutes | `6 failed` |
| F3 seconds not taken modulo 60 | `6 failed` |
| F4 shows `<n> s` | `7 failed` |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p3-r2`, `vite preview` of a fresh build on port 4199, viewport 412×915)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 3.4 | at 412×915: create plan "Wiosłowanie i przysiady" with two exercises ("Wiosłowanie" with the defaults, "Przysiady" with changed values), save, see it in the list with its summary, reload, still there (D2) | passed | Clean session, `localstorage-list` → "No localStorage items found"; empty state `paragraph: Nie masz jeszcze planów. Dodaj pierwszy plan, a potem uruchom trening.` (`p3-r2-01-empty-list.png`). Editor: exercise 1 "Wiosłowanie" kept defaults `status "Serie": "3"`, `"Powtórzenia": "10"`, `"Przerwa": 1:30`; exercise 2 "Przysiady" changed to `"4"`, `"9"`, `2:00` (`p3-r2-03-editor-filled.png`). After "Zapisz plan": `list "Zapisane plany" > listitem > heading "Wiosłowanie i przysiady" [level=2]`, `paragraph: 2 ćwiczenia, 7 serii` (`p3-r2-04-list-saved.png`). Stored: `trening.plans.v1={"version":1,"plans":[{…"name":"Wiosłowanie i przysiady","exercises":[{…"name":"Wiosłowanie","sets":3,"reps":10,"restSeconds":90},{…"name":"Przysiady","sets":4,"reps":9,"restSeconds":120}]}]}`. After `reload`: same heading and `paragraph: 2 ćwiczenia, 7 serii` (`p3-r2-05-list-after-reload.png`); `innerWidth/innerHeight` = 412/915. |
| 3.5 | at 412×915: dark "guma" background, Barlow fonts loaded from `/fonts/`, targets at least 44 px, no emoji or Unicode icons, no demo scaffold content left | passed | Measured by `eval`: `html` and `body` `backgroundColor: rgb(18, 19, 20)` (= #121314), `colorScheme: dark`, text `rgb(242, 242, 239)`; `h1` font `"Barlow Condensed" … 800`, body `"Barlow Semi Condensed" …`. `document.fonts`: Barlow Condensed 700/800 and Barlow Semi Condensed 500/700 `loaded` (600 loads on the editor). `requests --static`: 26 requests, all `http://localhost:4199/…`, font files only under `/fonts/` (e.g. `/fonts/barlow-condensed-latin-ext-700-normal.woff2 => [200]`); 0 requests to any other host. Targets by `getBoundingClientRect` — list: `Nowy plan` 380×56; editor with 2 rows: 12 stepper buttons 56×56, inputs 56 high, `Usuń ćwiczenie N` 346×56, `Dodaj ćwiczenie` 380×56, `Zapisz plan` 380×64, `Anuluj` 380×56; smallest 56×56. No `img`; 3 `svg` (the warning icons of `FieldError`, stroked paths); `Extended_Pictographic`/arrows/dingbats scan of page text: none; the only non-ASCII symbol is `−` (U+2212) as the stepper minus label (see Nit `stepper-text-glyphs`). Scaffold scan (`vite|vue|count is|HelloWorld|.hero|.counter`): false; `title` "Trening", `lang` "pl", theme-color `#121314`; no horizontal scroll (`p3-r2-06-editor-errors.png`). |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS (1 Nit) |
| I1 | Does it satisfy the original requirements? | PASS (1 Minor) |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | PASS (1 Nit) |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | PASS |

Blockers: 0 · Major: 0 · Minor: 2 · Nit: 4

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`DESIGN.md` gained the two lines the guardrail asks for (empty state copy and the plan editor strings, both in ASD-STE100-style Polish). Non-obvious code carries short "why" comments (`PlanEditor.vue:18`, `App.vue:7`, `NumberStepper.vue:13-16`, `format.ts:1`).

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | n/a | no README in this repo |
| CLAUDE.md | yes | yes | template-leftover paragraph replaced by a code layout paragraph |
| ADR | no | n/a | no ADRs exist |
| phpdoc / API | n/a | n/a | — |
| Query header comments | n/a | n/a | — |
| E2E rules / selectors | no | n/a | no E2E suite |
| Translations | n/a | n/a | Polish literals by design (single-language app) |
| DESIGN.md | yes | yes | +2 lines (`DESIGN.md:233`, `DESIGN.md:240`) |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

- **[Nit]** `claude-md-layout-omits-lib` — `CLAUDE.md:61` — the new layout paragraph lists `src/plans/`, `src/components/`, `src/styles/` but not `src/lib/` (`storage.ts`, the `localStorage` helper from Phase 2). A reader looking for the storage seam does not find it there.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (from this phase's Changes Required / Success Criteria) | Implemented in | Status |
| :-- | :-- | :-- |
| Remove the scaffold (`HelloWorld.vue`, `src/assets/*`, `public/icons.svg`, demo CSS) | deleted; `grep icons.svg\|HelloWorld\|style.css\|assets/` in `src`, `index.html`: none | met |
| `index.html` `lang="pl"`, `<title>Trening</title>`, theme-color `#121314` | `index.html:2,7-8` | met |
| Fonts installed at exact versions, woff2 + OFL copied to `public/fonts/`, `@font-face` with `unicode-range` and `font-display: swap`, URLs `/fonts/…` | `package.json` (`5.3.0` exact), `public/fonts/*`, `src/styles/fonts.css` | met |
| Tokens: DESIGN.md colors without plate/light, type scale, spacing, radii | `src/styles/tokens.css:2-41` | met (Minor `column-width-undocumented`) |
| Base: dark only, `color-scheme: dark`, tabular numbers, focus ring, `prefers-reduced-motion` | `src/styles/base.css:2-13,60-63,190-203` | met |
| `App.vue` screen switcher with a typed view state, no router | `src/App.vue:7-21` | met |
| `PlanList.vue`: cards with name and summary, "Nowy plan", Polish empty state | `src/components/PlanList.vue` | met |
| `PlanEditor.vue`: plan name; rows with name and −/+ steppers (rest 15 s, m:ss); "Dodaj ćwiczenie" with defaults; remove a row; save with validation messages; cancel | `src/components/PlanEditor.vue`, `NumberStepper.vue` | met |
| DESIGN.md addition: a failed save shows „Nie udało się zapisać planu…" and keeps the typed data | `PlanEditor.vue:23-29,47-58` | partial — see Minor `backup-failed-copy-differs-from-design` |
| Component tests (3.1 list of clauses) | `src/components/*.test.ts` | met |

- **[Minor]** `backup-failed-copy-differs-from-design` — `src/components/PlanEditor.vue:25-26` — `DESIGN.md:240` (added by this phase) says a failed save shows „Nie udało się zapisać planu…". The `backup-failed` branch shows „Nie udało się zabezpieczyć starych danych, więc plan nie został zapisany. …" instead, and no component test drives this branch (only `write-failed` is tested, `PlanEditor.test.ts:154-171`). The text is correct Polish and names the fix, and the data stays on screen (same code path), so the user is not harmed; the code and DESIGN.md wording simply disagree for this one reason. Either align the text or widen the DESIGN.md line.

### I2. Is it logically correct?

**Verdict:** PASS

No defect found. Checked: `save()` validates before writing and leaves the reactive plan untouched on every failure path (proved by the mutant table above); `removeExercise` clears errors so index-based error paths never point at the wrong row; `NumberStepper.change` clamps and the buttons disable at the limits (`NumberStepper.test.ts:35-47`, `PlanEditor.test.ts:55-66`); `App.showList` re-reads storage after a save, and a fresh mount re-reads it (`App.test.ts:25-44`, browser reload in 3.4).

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

- **[Nit]** `unused-target-min-token` — `src/styles/tokens.css:40` — `--target-min: 44px` is defined and never used (all targets here are 56 px or 64 px). Harmless; it documents the DESIGN.md 44 px floor.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

Every `SaveResult` failure reason maps to a Polish message (`Record<…['reason'], string>` makes a missing reason a type error). Storage throws are handled in `planStore`/`lib/storage` (Phase 2). Nothing in this phase reads a browser API without a guard.

### I5. Is it performant?

**Verdict:** PASS

`errorAt()` is called several times per row per render (`PlanEditor.vue:98-135`); with at most a few dozen errors this is negligible. Only the font subsets a page needs are fetched (`unicode-range`; 6 files on the list, 10 on the editor, 14–23 kB each).

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network calls; all requests in the walk went to `localhost:4199`. Plan names render through Vue text interpolation (no `v-html`).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

A single-user, offline app with no backend; failures are shown to the user in Polish. No `console.log` left in the diff.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** PASS

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |
| `@fontsource/barlow-condensed` | 5.3.0 (exact, dev) | OFL-1.1 | yes | named in brief.md Guardrails for Phase 3; the woff2 files are copied to `public/fonts/`, nothing imports the package at runtime |
| `@fontsource/barlow-semi-condensed` | 5.3.0 (exact, dev) | OFL-1.1 | yes | same |

`package-lock.json` changes only by these two entries.

---

## Architecture — the project's own rules

- "Use only the tokens, type scale, spacing and component rules from DESIGN.md" → meets, with one undocumented value (Minor below). Colors in code are only the DESIGN.md hexes; no plate or light tokens.
- "One chalk primary action per screen" → meets — list: only "Nowy plan" (`PlanList.test.ts:36-43`, and DESIGN.md:233 records it until Start arrives); editor: only "Zapisz plan" (`PlanEditor.test.ts:181-186`).
- "Touch targets 44 px outside the workout" → meets — smallest measured target 56×56.
- "No emoji as icons, no gradients, no left color stripe on cards" → meets — the warning icon is an inline SVG drawn with a 2 px round stroke (`FieldError.vue:3-6`); cards use a 1 px border on all sides.
- "Dark theme only; no theme switch" → meets — `color-scheme: dark`, no `prefers-color-scheme` query.
- "Fonts served locally from `public/`" → meets — measured in 3.5.
- "All UI text in Polish" → meets.
- "No server for user data" → meets — 0 requests to other hosts.
- "Every behavioural clause is pinned by a Vitest test" → meets for this phase (closure table above).
- **[Minor]** `column-width-undocumented` — `src/styles/tokens.css:41` (`--column: 32rem`, used at `src/styles/base.css:71`) — DESIGN.md:202 asks for a centered column on wider screens but gives no width, so the code picked one without adding it to DESIGN.md (CLAUDE.md: "If a task needs something DESIGN.md does not cover … update DESIGN.md in the same change"). No effect at the 412 px target width.
- **[Nit]** `stepper-text-glyphs` — `src/components/NumberStepper.vue:39,43` — the stepper buttons show the text characters `−` (U+2212) and `+`, not 2 px stroke SVG icons. DESIGN.md:237 itself names these buttons „−/+" and uses „−15 s" as a label, and the glyphs render in Barlow (U+2212 is in the latin `unicode-range`), so this reads as a text label, not a Unicode pictogram. Recorded so the owner can decide.
- **[Nit]** `empty-state-copy-partially-pinned` — `src/components/PlanList.test.ts:19` — the test checks only the first sentence of the DESIGN.md:233 empty-state text („Nie masz jeszcze planów."); the second sentence can change without a red test. Copy, not behaviour; the full text is quoted in the 3.4 walk.

## Not reviewed

- Real-phone rendering (Android Chrome font hinting, real touch) — the walk used desktop Chromium at 412×915.
- `npm run test:watch` was not run (watch mode never exits; not a Phase 3 row).

## Observations outside scope

- `context/foundation/auto-loop.md` and `context/foundation/roadmap.md` carry uncommitted changes that belong to the orchestrator/owner, not to this phase.
