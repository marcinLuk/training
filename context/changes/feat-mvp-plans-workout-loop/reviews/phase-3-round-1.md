# Phase review — feat-mvp-plans-workout-loop · Phase 3: App shell, plan list and new-plan editor · round 1

- **Scope:** working tree against `HEAD` (f00c8ad): `index.html`, `package.json`, `package-lock.json`, `public/favicon.svg`, `public/fonts/*` (new), `public/icons.svg` (deleted), `src/assets/*` (deleted), `src/style.css` (deleted), `src/components/HelloWorld.vue` (deleted), `src/main.ts`, `src/App.vue`, `src/styles/{fonts,tokens,base}.css`, `src/components/{PlanList,PlanEditor,NumberStepper,FieldError}.vue`, `src/components/{App,PlanList,PlanEditor,NumberStepper}.test.ts`, `src/components/testHelpers.ts`, `src/plans/format.ts`, `src/plans/format.test.ts`, `DESIGN.md` (+2 lines), `brief.md` Progress rows 3.1–3.3
- **Files reviewed:** 27 text files (`+1050/-423` lines), plus 12 binary/licence files in `public/fonts/` checked byte for byte against the npm packages
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 3` Progress rows 3.1–3.5 and `## Slice details` → `### Phase 3`
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 3.1 | component tests: defaults, −/+ steppers (rest in 15 s steps), empty-name error, saving, list summary with Polish plurals (D2) | `timeout 300 npx vitest run src/components` | pass — `Test Files 4 passed (4)`, `Tests 22 passed (22)`; 0 skipped (no `.skip`/`.only`/`.todo` in any `*.test.ts`; the only grep hits are the words "is skipped" in two Phase 2 test names) |
| 3.2 | `npm test` exits 0 | `timeout 300 npm test` | pass — `Test Files 8 passed (8)`, `Tests 120 passed (120)`, `EXIT=0` |
| 3.3 | build exits 0, `public/fonts/` holds woff2 + OFL, no `http(s)://` in built CSS | `timeout 300 npm run build` + checks | pass — `✓ built in 139ms`, `EXIT=0`; 10 `*.woff2` + `LICENSE-barlow-condensed-OFL.txt`, `LICENSE-barlow-semi-condensed-OFL.txt`; every file `cmp`-identical to `node_modules/@fontsource/*/files/*` and `*/LICENSE`; `grep -c -E 'https?://' dist/assets/*.css` → `url-count=0`; the CSS `url()` set is only `/fonts/barlow-…-normal.woff2` (10 entries) |

Mutation table (scratch copy `/tmp/…/scratchpad/mutant`, tests `src/components` + `src/plans/format.test.ts`, baseline 23/23 green):

| Wrong implementation | Result |
| :-- | :-- |
| `formatRest`: no `padStart` | 2 failed — diverges |
| `formatRest`: `Math.round` minutes | 5 failed — diverges |
| `formatRest`: raw seconds | 6 failed — diverges |
| `formatRest`: minutes padded to 2 | 6 failed — diverges |
| editor: rest step 10 instead of 15 | 2 failed — diverges |
| editor: new plan starts with no exercise row | 10 failed — diverges |
| editor: no `savePlan` call | 3 failed — diverges |
| editor: wipe the form after a storage write failure | 1 failed — diverges |
| editor: `removeExercise` pops the last row | 1 failed — diverges |
| stepper: `atMin` uses `<` | 2 failed — diverges |
| stepper: `atMax` uses `>` | 1 failed — diverges |
| list: summary shows only the exercise count | 2 failed — diverges |
| App: list not re-read after save | 1 failed — diverges |
| editor: plan-name error never shown | 1 failed — diverges |
| **editor: on a validation error, set `plan.name = ""` and every exercise name to `""`** | **23 passed — survives** |
| **editor: on a validation error, drop every exercise row after the first** | **23 passed — survives** |
| editor: `backup-failed` message replaced by `'x'` | 23 passed — survives (Minor, see I4) |
| stepper: clamp removed from `change()` | 23 passed — unreachable: the disabled button blocks the tap and step-aligned values never overshoot; no contract claims it |
| editor: own validation guard removed | 23 passed — `savePlan` validates again and returns `invalid`; no data written, no emit; not a defect |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p3-r1`, `vite preview` on port 4199, viewport 412×915)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 3.4 | at 412×915: create plan "Wiosłowanie i przysiady" with two exercises ("Wiosłowanie" with the defaults, "Przysiady" with changed values), save, see it in the list with its summary, reload, still there (D2) | passed | Clean storage (`localstorage-list` → "No localStorage items found"). Exercise 2 set to `status "Serie": "5"`, `status "Powtórzenia": "8"`, `status "Przerwa": 1:00`. After "Zapisz plan": `list "Zapisane plany" › listitem › heading "Wiosłowanie i przysiady" [level=2]`, `paragraph: 2 ćwiczenia, 8 serii`. Stored `trening.plans.v1={"version":1,"plans":[{…"name":"Wiosłowanie i przysiady","exercises":[{…"name":"Wiosłowanie","sets":3,"reps":10,"restSeconds":90},{…"name":"Przysiady","sets":5,"reps":8,"restSeconds":60}]}]}`. After `reload`: same heading and `2 ćwiczenia, 8 serii`. Screenshots `reviews/screenshots/p3-r1-03-editor-filled.png`, `p3-r1-04-list-saved.png`, `p3-r1-05-list-after-reload.png`. Extra: a save with an empty exercise name kept "Wiosłowanie i przysiady" in `textbox "Nazwa planu"` and showed `textbox "Nazwa ćwiczenia" [invalid]` + "Wpisz nazwę ćwiczenia 1." (`p3-r1-02-validation.png`) |
| 3.5 | at 412×915: dark "guma" background, Barlow fonts loaded from `/fonts/`, targets at least 44 px, no emoji or Unicode icons, no demo scaffold content left | passed | `getComputedStyle`: body and html background `rgb(18, 19, 20)` (= #121314), `color-scheme: dark`, text `rgb(242, 242, 239)`. Fonts: `document.fonts.check('800 36px "Barlow Condensed"')` → true, `check('500 17px "Barlow Semi Condensed"')` → true; FontFace status "Barlow Condensed 700/800 loaded", "Barlow Semi Condensed 500/700 loaded" (unused faces stay "unloaded", so `unicode-range` works; latin-ext 700 loaded for "ł"); `requests --static`: 23 requests, all `http://localhost:4199/…`, fonts only from `/fonts/barlow-*.woff2` (200/304), no other host. h1 `"Barlow Condensed" 800 36px uppercase`, h2 `700 22px`, stepper value `Barlow Condensed 700 22px`. Targets by `getBoundingClientRect`: list — 1 control, "Nowy plan" 380×56; editor with two rows — 20 controls, smallest 56×56 (stepper buttons), "Zapisz plan" 380×64, inputs 56 high; `small: []` on both screens; `documentElement.scrollWidth` 412 (no sideways scroll). Symbol scan of `innerText` for `\p{Extended_Pictographic}` and `\p{S}`: list → none; editor → only `− U+2212`, the stepper glyph that DESIGN.md itself names ("przyciski −/+"); no `<img>`; warning icon is an inline SVG with stroke 2 and round caps. Scaffold text regex (`vite|vue|hello world|count is|hero|documentation`) → false; `title` "Trening", `lang` "pl", `theme-color` #121314. Screenshots `p3-r1-01-empty-list.png`, `p3-r1-06-editor-two-rows.png` |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | CONCERNS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | FAIL |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | PASS |

Blockers: 0 · Major: 1 · Minor: 7 · Nit: 4

Findings going back to a builder: `validation-error-input-retention-unpinned`

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Components are small and named for their job. `NumberStepper` props carry short docblocks. `formatRest` has a docblock with examples. `App.vue` says where later screens go.

### D2. Are all relevant types of documentation covered?

**Verdict:** CONCERNS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | n/a | no README in this repo |
| CLAUDE.md | yes | stale | "fresh create-vite scaffold … HelloWorld.vue, src/assets/* … are template leftovers" is now false |
| ADR | no | n/a | |
| phpdoc / API | n/a | n/a | |
| Query header comments | n/a | n/a | |
| E2E rules / selectors | no | n/a | |
| Translations | no | n/a | Polish literals in templates; the project has no i18n |
| DESIGN.md | yes | yes, with gaps | two lines added; see findings |

- **[Minor]** `claude-md-scaffold-note-stale` — `CLAUDE.md` (section "Stack") — the text still says the repo is a fresh `create-vite` scaffold and names `HelloWorld.vue`, `src/assets/*` and the demo `App.vue` as leftovers. This phase deleted all of them. A later agent reads an untrue description of `src/`.
- **[Minor]** `design-md-primary-line-phase-scoped` — `DESIGN.md:233` — "Dopóki karta nie ma Start, „Nowy plan" jest główną akcją listy." ties the approved design to a build phase. It does not redesign anything, and it is consistent with the chalk rule today (the list has exactly one chalk button). But it does not say what "Nowy plan" becomes when Start arrives (Phase 5), and the empty list never has a card with Start. A rule by state, not by phase, lasts: "Pusta lista: „Nowy plan" jest główną akcją. Lista z planami: główną akcją karty jest Start, „Nowy plan" jest drugorzędny." Phase 5 must touch this line either way.
- **[Minor]** `design-md-copy-gaps` — `DESIGN.md:240` vs `src/components/PlanList.vue:10`, `src/components/PlanEditor.vue:24-28,88` — the added Inputs line lists the editor labels and buttons, but these strings on screen are still not in DESIGN.md: the list title "Plany", the row heading "Ćwiczenie N", the message "Popraw zaznaczone pola…", and the backup failure message "Nie udało się zabezpieczyć starych danych…" (the DESIGN.md line names only "Nie udało się zapisać planu…"). The brief guardrail asks for every new UI string to be added to DESIGN.md.

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The two DESIGN.md lines are clear Polish and match the style of the file. Code comments are short English.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (from this phase's Changes Required / Success Criteria) | Implemented in | Status |
| :-- | :-- | :-- |
| Remove scaffold (`HelloWorld.vue`, `src/assets/*`, `public/icons.svg`, demo CSS) | deleted files | met |
| `index.html`: `lang="pl"`, `<title>Trening</title>`, `theme-color #121314` | `index.html:2,8,9` | met |
| Install the two fontsource packages at 5.3.0; copy 10 woff2 + OFL into `public/fonts/` | `package.json:17-18`, `public/fonts/*` | met (byte-identical) |
| `@font-face` per subset with `unicode-range`, `font-display: swap`, `/fonts/…` URLs | `src/styles/fonts.css` | met (ranges equal the fontsource CSS) |
| `tokens.css`: DESIGN.md colors without plate/light, type scale, spacing, radii | `src/styles/tokens.css:3-36` | met (every value equals DESIGN.md front matter) |
| Base: dark only, `color-scheme: dark`, tabular numbers, focus ring, reduced motion | `src/styles/base.css:2-13,60-63,190-203` | met |
| `App.vue` screen switcher with typed view state, no router | `src/App.vue:8-16` | met |
| `PlanList.vue`: cards (name, summary), "Nowy plan", Polish empty state | `src/components/PlanList.vue` | met |
| `PlanEditor.vue`: name, rows with −/+ for sets/reps/rest (15 s, m:ss), add row with defaults, remove row, save with validation, cancel | `src/components/PlanEditor.vue` | met |
| Component tests | `src/components/*.test.ts` | met, one gap (I4) |
| D2 browser walk at 412×915 | manual 3.4 | met |

Answers to the focus questions:
- **tokens.css vs DESIGN.md:** all 11 colors, 6 type sizes, 8 spacings and 3 radii match exactly. No plate or light token. Additions not in the front matter: `--target` 56 px, `--target-large` 64 px, `--target-min` 44 px (all from DESIGN.md "Layout"), and `--column: 32rem` (invented, see I3).
- **Type scale:** Headline for screen titles, Title for card headings, Body for text, inputs and buttons (primary 700), Barlow Condensed 700 for stepper numbers. One mapping is arguable: field labels use Label (13 px, 600) — see `field-label-uses-label-scale`.
- **Typed input:** a storage failure keeps it (pinned). A validation error keeps it in the code and in the browser walk, but no test pins it (Major below). "Anuluj", "Usuń ćwiczenie", the Android back gesture and a reload drop the draft with no confirm (Minor below).
- **"Nowy plan" as primary:** no conflict today — one chalk button per screen (pinned by `PlanList.test.ts:36` and `PlanEditor.test.ts:152`). The DESIGN.md line is consistent but phase-scoped (`design-md-primary-line-phase-scoped`).
- **Tests by role/name:** yes for controls — buttons by `aria-label`/text, inputs by `<label for>`, rows by `aria-labelledby`, errors by `aria-describedby` and `role="alert"`. No copy lookup table is used to identify anything. A few list assertions use CSS structure (`li h2`, `li p`) instead of the `list "Zapisane plany"` role.

- **[Nit]** `list-tests-use-css-structure` — `src/components/App.test.ts:37-43`, `src/components/PlanList.test.ts:27-29` — plan cards are found by `li`/`h2`/`p` selectors, not through the `list "Zapisane plany"` landmark and the card heading; a markup change breaks them without a behaviour change.

### I2. Is it logically correct?

**Verdict:** PASS

No defect found. Errors are keyed by row index and are re-computed on each save, so an added row cannot show another row's error. A fast double tap on "Zapisz plan" cannot save twice: the first tap swaps the view, and a second save of the same id replaces, it does not duplicate.

- **[Nit]** `remove-row-clears-unrelated-errors` — `src/components/PlanEditor.vue:44` — `removeExercise` clears every error, also the plan-name error and the errors of other rows. They come back at the next save. Clearing only the `exercises.*` paths (or re-validating) keeps the user's view honest.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

- **[Minor]** `column-width-not-in-design` — `src/styles/tokens.css:41` — `--column: 32rem` is a new size. DESIGN.md asks for "wyśrodkowana kolumna" but sets no width. The value is sensible, but the rule is "do not invent sizes; if DESIGN.md does not cover it, add it to DESIGN.md". Add one line to DESIGN.md "Layout".
- **[Nit]** `unused-target-min-token` — `src/styles/tokens.css:40` — `--target-min` is defined and never used.
- **[Nit]** `test-helper-in-app-tsconfig` — `src/components/testHelpers.ts` — not a `*.test.ts` file, so `tsconfig.app.json` type-checks it with the app and it imports `@vue/test-utils`. It is never bundled. Naming it `*.test-helpers.ts` under the test config, or excluding it from the app config, keeps the boundary clean.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** FAIL

- **[Major]** `validation-error-input-retention-unpinned` — `src/components/PlanEditor.vue:47-50` and `src/components/PlanEditor.test.ts:78-102` — the clause "a save that does not succeed leaves the typed data on screen" (DESIGN.md:240, written by this phase: "Nieudany zapis … zostawia wpisane dane na ekranie") is pinned only for the storage-failure branch (`PlanEditor.test.ts:125`). The validation-failure branch has no assertion. **Fails when:** a later change resets the form when `validatePlan` returns errors. In the scratch copy, replacing line 50 with `if (errors.value.length > 0) { plan.name = ""; plan.exercises.forEach((e) => { e.name = "" }); return }` gives `Tests 23 passed (23)`, and so does `if (errors.value.length > 0) { plan.exercises.splice(1); return }` (all rows after the first dropped). Both silently destroy what the user typed. Fix in the tests only: in a validation-failure case, type a plan name and two exercise names with changed stepper values, leave one required field empty, tap "Zapisz plan", then assert the plan name, both exercise names, both rows and their stepper values are unchanged (e.g. extend "shows a message when no exercise is left" and "shows the empty-name errors…" or add one case). Phase 8 reuses this editor for editing a saved plan, so the gap grows.
- **[Minor]** `draft-lost-without-confirm` — `src/components/PlanEditor.vue:42-45,160`, `src/App.vue:21` — "Anuluj" (12 px under "Zapisz plan"), "Usuń ćwiczenie" and the Android back gesture (no history entry, so back leaves the app) drop the whole draft or a filled row with one tap and no confirm or undo. The brief asks only for "cancel back to the list", so this is not a contract breach, but it is a one-tap data loss on a phone.
- **[Minor]** `backup-failed-message-unpinned` — `src/components/PlanEditor.vue:25-26` — the `backup-failed` branch (stored plans unreadable and the corrupt copy cannot be written) is never driven by a component test; replacing its text with `'x'` keeps all 23 tests green. The keep-the-data behaviour is shared with `write-failed` and is pinned; only the message is not.

### I5. Is it performant?

**Verdict:** PASS

Fonts load only the subsets used (`unicode-range`, observed: 6 of 10 faces fetched on the list). `listPlans()` runs once at start and once per save. Built CSS 7.6 kB, JS 76 kB.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No `v-html`; plan and exercise names render through text interpolation. No network calls; every request in the walk went to `localhost:4199`. No external URL in built CSS.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Single-user offline app with no logging stack. Failures surface as Polish messages on screen. No leftover `console.log`.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** PASS

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |
| `@fontsource/barlow-condensed` | 5.3.0 (exact, dev) | OFL-1.1 | yes | named by the brief; source of the copied woff2 + licence |
| `@fontsource/barlow-semi-condensed` | 5.3.0 (exact, dev) | OFL-1.1 | yes | named by the brief; source of the copied woff2 + licence |

`package-lock.json` changes only by these two entries.

---

## Architecture — the project's own rules

- "Use only the tokens, type scale, spacing and component rules from DESIGN.md" → meets, with `--column` as the one invented size (Minor `column-width-not-in-design`).
- "One chalk primary action per screen" → meets — one `.btn-primary` on the list and on the editor; tests assert it.
- "Touch targets … 44 px outside the workout" → meets — smallest measured control 56×56.
- "No emoji as icons, no gradients, no left color stripe" → meets — no emoji, no `gradient`, cards use a 1 px border on all sides; warning icon is a 2 px stroke SVG.
- "Dark theme only; no light theme or theme switch" → meets — `color-scheme: dark`, no `prefers-color-scheme` rule, no light tokens.
- "Fonts served locally from `public/`, never from a CDN" → meets — evidence in 3.3 and 3.5.
- "All UI text is in Polish" → meets.
- "No server for user data" → meets — no fetch/XHR in `src/`.
- "Data lives in localStorage only; stored shape versioned" → meets (Phase 2 store, used unchanged).
- "Every behavioural clause is pinned by a Vitest test" → fails for one clause (`validation-error-input-retention-unpinned`).
- "Plate colors and the plate stack are reserved" → meets — no plate token in `tokens.css`.
- "Do not add a PWA manifest, service worker, Dockerfile or CI workflow" → meets.
- **[Minor]** `field-label-uses-label-scale` — `src/styles/base.css:147-152` — DESIGN.md:188 gives Body (500, 1.0625rem) to "treść i etykiety kontrolek" and DESIGN.md:189 gives Label (600, 0.8125rem) to "podpisy zakładek, drobne opisy, legenda". Field labels ("Nazwa planu", "Serie", "Przerwa") use Label (measured 13 px, 600, muted). The DESIGN.md wording allows both readings; per CLAUDE.md, code and DESIGN.md should not disagree silently — the owner should pick one and DESIGN.md should say it.

## Not reviewed

- Real Android Chrome rendering and touch behaviour (owner-run); the walk used desktop Chromium at 412×915.
- Text contrast was not measured; the colors equal DESIGN.md tokens, whose ratios DESIGN.md asserts.
- Keyboard "Enter/Go" on the Android soft keyboard submitting the form was not exercised.

## Observations outside scope

- `src/plans/plan.ts:32-38` (Phase 2): ids come from `crypto.randomUUID()`, which exists only in a secure context. Opening the dev server from the phone over plain `http://<LAN IP>` would make the editor throw on mount. The planned HTTPS deployment and `localhost` are fine.
- `src/plans/planStore.ts:213-215` (Phase 2): unreadable stored plans read as an empty list and the plan list shows the normal empty state, with no notice that data was set aside. The data is kept and copied on the next save, so nothing is lost, but the user is not told.
- DESIGN.md: "Start jako główna akcja" on every plan card plus "jedna główna akcja na ekran" already conflict once there are two or more cards (Phase 5). Not caused by this phase.
- `public/fonts/*` is a hand copy of the npm package files; a later version bump of the fontsource packages will not update it unless someone copies the files again.
