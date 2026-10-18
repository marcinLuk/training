# Phase review — feat-mvp-plans-workout-loop · Phase 8: Edit and delete a plan · round 1

- **Scope:** `git diff HEAD` plus untracked files: `src/plans/planStore.ts`, `src/plans/plan.ts`, `src/plans/planStore.test.ts`, `src/components/PlanEditor.vue`, `src/components/PlanList.vue`, `src/components/PlanDeleteConfirm.vue` (new), `src/App.vue`, `src/components/EditDelete.test.ts` (new), `DESIGN.md` (one new line in Cards, one changed line in Inputs / Fields), `brief.md` Progress rows 8.1–8.3. Not this phase: `context/foundation/auto-loop.md`, `context/foundation/roadmap.md`, `workbench.md`, `.loop-baseline`, and the commit-hash suffixes on the Phase 7 rows.
- **Files reviewed:** 9 (`+476/-17` lines; brief.md checkbox edits not counted)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 8` Progress rows and `### Phase 8` Slice details
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 8.1 | tests for opening a saved plan in the editor, saving under the same id, delete with confirm and with cancel, a stored running workout unchanged after edit or delete | `timeout 300 npx vitest run src/plans src/components` | pass — `Test Files  11 passed (11)` / `Tests  227 passed (227)` |
| 8.2 | `npm test` exits 0 | `timeout 300 npm test` | pass — `Test Files  18 passed (18)` / `Tests  375 passed (375)` |
| 8.3 | `npm run build` exits 0 | `timeout 300 npm run build` | pass — `vue-tsc -b && vite build` … `✓ built in 216ms`, exit 0 |

Skipped or focused tests: `grep -rnE "\.(skip|only|todo)\(|describe\.skip|it\.skip" src --include=*.test.ts` returns nothing. 0 skipped. The Phase 2 test file only gained lines (`git diff --numstat`: `91 0 src/plans/planStore.test.ts`); no Phase 2 assertion was changed or removed.

Each 8.1 clause maps to an assertion:

| Clause | Test |
| :-- | :-- |
| opening a saved plan in the editor | `EditDelete.test.ts:106` (title "Edytuj plan", plan name and exercise 2 name in the fields) |
| saving changes under the same id | `EditDelete.test.ts:114` (ids `['a','b']`, no duplicate, unchanged exercise kept with its id, fresh mount) |
| delete with confirm | `EditDelete.test.ts:81`, `:179` (fresh mount after delete) |
| delete with cancel | `EditDelete.test.ts:70`, `:191` (storage byte for byte) |
| a stored running workout unchanged after edit or delete | `EditDelete.test.ts:215`, `:228` (stored workout bytes equal; a fresh mount shows the old exercises); `planStore.test.ts` "does not touch the stored running workout" |

### Mutation table (scratch copy `/tmp/.../scratchpad/mutant`, production tree untouched)

Every mutant was applied by an exact, single-occurrence string replacement (the script asserts the count is 1), then `vitest run` on the listed paths.

| Mutation | Result | Failing test(s) |
| :-- | :-- | :-- |
| D1 `deletePlan` without the backup of unreadable data | 2 failed | keeps a plan that could not be read in the corrupt copy before it writes; does not write when the copy of unreadable data fails |
| D2 `deletePlan` ignores a failed backup | 1 failed | does not write when the copy of unreadable data fails |
| D3 `deletePlan` writes for an unknown id | 1 failed | an unknown id is a no-op that writes nothing |
| D4 `deletePlan` filter inverted | 5 failed | deleting one of three plans keeps the other two byte for byte, and 4 more |
| D5 `deletePlan` reports ok after a failed write | 2 failed | reports a failed write …; a failed delete shows a Polish message and changes nothing |
| D6 `deletePlan` also removes `trening.workout.v1` | 2 failed | does not touch the stored running workout; survives a delete of its plan … |
| D7 `deletePlan` backs up before the unknown-id check | **227 passed** | none — see Minor `delete-unknown-id-unreadable-unpinned` |
| S1 `savePlan` without the backup (refactor check) | 5 failed | corrupt data is copied to a corrupt key before the first write over it, and 4 more (Phase 2 tests) |
| S2 `savePlan` ignores a failed backup | 1 failed | does not write over unreadable data when the copy fails (Phase 2 test) |
| S3 `backupIfUnreadable` copies readable data too | 6 failed | makes no corrupt copy when the data is readable or missing; makes only one copy …, and 4 more |
| C1 `clonePlan` returns the same object | 1 failed | does not change the plan in the list or in storage until it is saved, and cancel keeps it |
| C2 `clonePlan` shares the exercise objects | 1 failed | same test (sets read back as "2" after cancel) |
| C3 `clonePlan` gives a new plan id | 1 failed | saves name and exercise changes under the same id, with no duplicate … |
| C4 `clonePlan` gives new exercise ids | 1 failed | same test |
| C5 `clonePlan` copies items into the shared array | 1 failed | does not change the plan in the list … |
| G1 confirm with no double-tap guard | 1 failed | ignores a confirm tap that comes less than 500 ms after the question opened |
| G2 guard `<=` (blocks at exactly 500 ms) | 3 failed | emits delete after a deliberate tap …, and 2 more |
| G3 guard 100 ms | 1 failed | ignores a confirm tap that comes less than 500 ms … |
| L1 card "Usuń plan" deletes at once | 6 failed | asks in the app before it deletes …, and 5 more |
| L2 cancel emits delete | 2 failed | … cancel keeps the plan; cancel keeps the plan in the list and in storage |
| A1 failed delete drops the error and refreshes | 1 failed | a failed delete shows a Polish message and changes nothing |
| A2 "Edytuj" ignores the plan id | 4 failed | opens with the current values …, and 3 more |
| A3 `backup-failed` delete text replaced by "XX" | **122 passed** | none — see Minor `delete-backup-failed-text-unpinned` |
| E1 editor title always "Nowy plan" | 2 failed | opens with the current values under the title "Edytuj plan"; keeps the typed data … |
| B1 `class="btn"` removed from both card buttons | **14 passed** (`EditDelete.test.ts`); 122 passed (`src/components`) | none — see Major `card-button-size-test-claims-44px`. The mutant really changes behaviour: its build, served on 4198 at 412×915, renders "Edytuj" 53×21 px and "Usuń plan" 76×21 px. |

(A first B1 variant that stripped only "Edytuj" was an equivalent mutant: the flex row stretched it to 56 px. It is not counted.)

### Manual (performed with playwright-cli 0.1.14, session `mvp-p8-r1`, `vite preview` on port 4199, 412×915)

Plans built through the app's own editor from clean storage: "Wiosłowanie i przysiady" (Wiosłowanie with defaults; Przysiady with 4 sets), "Ćwiczenia na plecy" (Podciąganie), "Brzuch i łydki" (Wspięcia na palce).

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 8.4 | at 412×915: edit the plan name and one exercise, save, reload: the changes stay (D7) | passed | "Edytuj: Wiosłowanie i przysiady" → `heading "Edytuj plan"`, `textbox "Nazwa planu": Wiosłowanie i przysiady`. Name set to "Plecy i nogi – wtorek", exercise 2 to "Przysiady bułgarskie", reps 10 → 12; "Zapisz plan". After `reload`: `heading "Plecy i nogi – wtorek" [level=2]` first in `list "Zapisane plany"`, 3 plans, no duplicate. `localstorage-get trening.plans.v1`: same plan id `e0651f9d-…`, same exercise ids `c45a4059-…` / `ff54c569-…`, `"name":"Przysiady bułgarskie","sets":4,"reps":12`. Screenshots `p8-r1-8.4-editor.png`, `p8-r1-8.4-after-reload.png`. Cancel probe before it: name "Niezapisana zmiana" + "Zwiększ serie" → "Anuluj" → list still `Wiosłowanie i przysiady`, `2 ćwiczenia, 7 serii`; storage kept `sets":4`. |
| 8.5 | at 412×915: delete a plan → confirm → it is gone after a reload; delete → cancel → it stays (D7) | passed | "Usuń plan: Brzuch i łydki" → `alertdialog "Usunąć plan „Brzuch i łydki”?"` with `button "Anuluj"`, `button "Usuń plan"` (both `btn`, 380×56; "Usuń plan" `btn btn-danger`, text `rgb(255, 107, 107)`, no chalk) → "Usuń plan" → after `reload` the list holds "Plecy i nogi – wtorek", "Ćwiczenia na plecy"; storage has no "Brzuch i łydki". "Usuń plan: Ćwiczenia na plecy" → "Anuluj" → `reload` → still listed; `trening.plans.v1` before and after compared: `STORAGE_IDENTICAL`. Screenshots `p8-r1-8.5-confirm-open.png`, `p8-r1-8.5-after-confirm-reload.png`, `p8-r1-8.5-after-cancel-reload.png`. |

Extra probes (same session):

- **Card layout** (`eval` on the first card, `p8-r1-list.png`): Start 346×64, background `rgb(242, 242, 239)` (chalk); "Edytuj" 95×56, transparent, border `rgb(58, 60, 64) 2px`; "Usuń plan" 119×56, transparent, border and text `rgb(255, 107, 107)`. Gap "Edytuj" → "Usuń plan" 132 px; gap Start bottom → action row 36 px. `scrollWidth` 412 (no sideways scroll). Barlow faces loaded.
- **Double tap on the card "Usuń plan"** (`dblclick`): the dialog opens, `trening.plans.v1` still holds "Ćwiczenia na plecy" (`p8-r1-probe-dblclick-card-delete.png`).
- **Second tap lands on the dialog's "Usuń plan" 10 ms later** (`run-code`, `page.mouse.click` on both centres): `{"msBetweenTaps":10,"dialogOpen":1,"stillStored":true}` (`p8-r1-probe-fast-second-tap-on-confirm.png`). A tap more than 500 ms later deletes (8.5 above).
- **Failed delete** (`Storage.prototype.setItem` made to throw for `trening.plans.v1`, then confirm after 600 ms): `role=alert` text "Nie udało się usunąć planu. Sprawdź wolne miejsce w pamięci telefonu i spróbuj jeszcze raz.", `hasSvg: 0`, dialog closed, both cards still listed, storage unchanged (`p8-r1-probe-delete-failed.png`).
- **Stale error**: with that error shown, "Edytuj: Ćwiczenia na plecy" → "Anuluj" → `alertAfterCancel: 1`, same text (`p8-r1-probe-stale-error-after-cancel.png`).
- A running workout and the plan list never show at the same time (`App.vue:63-87`: the workout branch wins while `workout.view` is not null), so edit or delete during a workout cannot be reached in the browser. The store-level and fresh-mount tests (mutants D6 killed) carry this clause.

Session `mvp-p8-r1` and `mvp-p8-r1-mut` closed (`playwright-cli list` → `(no browsers)`); ports 4199 and 4198 free afterwards (`curl` fails).

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | CONCERNS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | N/A |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 2 · Minor: 3 · Nit: 2

Findings going back to a builder: `card-button-size-test-claims-44px`, `delete-error-missing-warning-icon`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`deletePlan` (`planStore.ts:156-160`), `backupIfUnreadable` (`:120`) and `clonePlan` (`plan.ts:54`) carry docblocks that state the contract. `PlanDeleteConfirm.vue:7-8` says why the guard exists. DESIGN.md names the new strings and the 0,5 s guard.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no setup change |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | no new seam |
| TSDoc / API | yes | yes | see D1 |
| DESIGN.md | yes | yes | Cards line (buttons, question text, guard, failure) and Inputs / Fields line ("Edytuj plan", same id, cancel) |
| Translations | no | — | Polish strings inline by project design |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The two DESIGN.md lines are clear Polish and match the code strings ("Edytuj", "Usuń plan", „Usunąć plan „nazwa"?", "Anuluj", "Edytuj plan").

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 8 Slice details / rows) | Implemented in | Status |
| :-- | :-- | :-- |
| Plan card: edit and delete, wide gap between them, away from Start, delete in danger style | `PlanList.vue:43-55`, `:82-88` | met — measured 132 px apart, 36 px below Start, 56 px high, danger border and text |
| `PlanEditor.vue` opens an existing plan and saves it under the same id | `PlanEditor.vue:17-24`, `:68`; `App.vue:38-42`, `:87` | met — 8.4 walk; C3/C4 mutants killed |
| `planStore.deletePlan(id)` | `planStore.ts:161-168` | met — D1–D6 killed |
| Delete asks for confirmation in-app; cancel keeps the plan | `PlanDeleteConfirm.vue`; `PlanList.vue:14-20`, `:66-71` | met — no `window.confirm`; 8.5 walk; L1/L2 killed |
| Running workout keeps its own copy; a test proves it through the store | `EditDelete.test.ts:214-240`; `planStore.test.ts` "does not touch the stored running workout" | met — D6 killed |
| Tests in `src/plans/*.test.ts` and `src/components/*.test.ts` | `planStore.test.ts` (+8 tests), `EditDelete.test.ts` (14 tests) | met |
| New UI strings added to DESIGN.md (brief guardrail) | `DESIGN.md` Cards, Inputs / Fields | met |

### I2. Is it logically correct?

**Verdict:** CONCERNS

The data paths are correct. `deletePlan` reads, returns early for an unknown id, copies unreadable data aside and stops if that copy fails, then writes only the filtered list; it never touches `trening.workout.v1`. The `savePlan` refactor is equivalent to the Phase 2 code: `backupIfUnreadable` returns `raw === null || backupUnreadable(...)`, the same condition as the old `raw !== null && !backup → backup-failed`, and S1–S3 break Phase 2 tests. `clonePlan` copies the plan and every exercise, so an unsaved edit or a cancel leaves the list and storage alone (C1, C2, C5 killed; browser cancel probe). A save after edit replaces by id, so no duplicate (C3 killed).

- **[Major]** `card-button-size-test-claims-44px` — `src/components/EditDelete.test.ts:52-62` — The test is named "has Edytuj and Usuń plan buttons named after the plan, 44 px or more, not chalk", but it asserts only the text, the absence of `btn-primary` and the presence of `btn-danger`. Nothing in it relates to size. **Fails when:** `class="btn"` is removed from both card buttons (`PlanList.vue:44`, `:47`). Then `EditDelete.test.ts` stays green (14/14), `src/components` stays green (122/122), and the built app at 412×915 renders "Edytuj" 53×21 px and "Usuń plan" 76×21 px. These are far below the 44 px DESIGN.md sets outside the workout. **Fix:** assert `expect(edit.classes()).toContain('btn')` and `expect(remove.classes()).toContain('btn')`. The `.btn` class carries `min-height: var(--target)` (56 px). Or remove "44 px or more" from the test name.
- **[Minor]** `delete-unknown-id-unreadable-unpinned` — `src/plans/planStore.ts:157,163-164`; `src/plans/planStore.test.ts` "an unknown id is a no-op that writes nothing" — The docblock says "An unknown id is a no-op that writes nothing". The test checks this only over readable data. Mutant D7 moves the backup in front of the id check, so an unknown id over unreadable data writes a `trening.plans.corrupt.<now>` copy, and all 227 tests still pass. The UI only offers ids of readable plans, so this input is not reachable today. **Fix:** add the same case over unreadable data and assert that no `trening.plans.corrupt.*` key appears.
- **[Minor]** `delete-backup-failed-text-unpinned` — `src/App.vue:20-25` — No test shows the `backup-failed` delete message. Mutant A3 replaced that text with "XX", and all 122 component tests still pass. The store's `backup-failed` result is pinned (D2 killed). **Fix:** add a component test with unreadable stored data and a failing corrupt-copy write. Assert the "Nie udało się zabezpieczyć starych danych…" alert.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

`backupIfUnreadable` removes a duplicated block; `View` gained one optional field; the confirm component copies the Phase 6 pattern.

- **[Nit]** `delete-guard-bypasses-clock-seam` — `src/components/PlanDeleteConfirm.vue:2,9,12` — The guard reads `Date.now()` directly. Other code uses the `now()` seam in `src/lib/clock.ts`. The guard also imports `ACTION_GUARD_MS` from `workout/useWorkout`, so plan-list UI depends on the workout session module. It works, and `vi.setSystemTime` moves both clocks, so this is a consistency point only.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

The delete path cannot lose plans. A failed write returns `write-failed` and storage stays byte for byte the same (test plus browser probe). A failed backup over unreadable data stops the write. A throwing `getItem` does not throw out of `deletePlan`. The 500 ms guard ignores a second tap that lands on the dialog's "Usuń plan" 10 ms later (browser probe). The dialog covers the whole screen (`.confirm`, `position: fixed; inset: 0`), so the second tap cannot reach a card behind it.

- **[Minor]** `stale-delete-error-after-editor-cancel` — `src/App.vue:87` (`@cancel="view = { kind: 'plan-list' }"`), `src/App.vue:38-42` — Only `showList()` clears `deleteError`. Editor cancel does not call it, and `openEditor` does not clear the error. **Fails when:** a delete fails → "Edytuj" → "Anuluj". The list still shows "Nie udało się usunąć planu…", but the user did not try to delete again (browser probe: `alertAfterCancel: 1`). **Fix:** clear `deleteError` in `openEditor`, or route cancel through a function that clears it.
- **[Nit]** `delete-dialog-focus-stays-behind` — `src/components/PlanDeleteConfirm.vue:18` — The dialog sets `aria-modal="true"`, but focus stays on the card "Usuń plan" button behind it (`document.activeElement` = the card button after the open). `EndWorkoutConfirm.vue` has the same pattern. A screen-reader or keyboard user starts outside the dialog.

### I5. Is it performant?

**Verdict:** PASS

One `localStorage` read and at most two writes per delete; a handful of plans.

### I6. Is it secure (SQL injection, …)?

**Verdict:** N/A

No server, no network, no HTML injection (`{{ }}` interpolation only; plan names go into `aria-label` attribute bindings, which Vue escapes).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

No backend and no logging layer. Failures are shown to the user in Polish.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json`, `package-lock.json` and `tsconfig*.json` unchanged.

---

## Architecture — the project's own rules

- "Data lives in `localStorage` only. A stored shape is versioned; reading never throws …, and never silently overwrites data it could not read" → meets — `deletePlan` copies unreadable data aside first and stops when the copy fails (D1, D2 killed); `trening.plans.v1` shape unchanged.
- "No server for user data" → meets — no network code added.
- "A workout survives interruptions (FR-009)" / D7 "a running workout keeps its own copy" → meets — delete and save never touch `trening.workout.v1` (D6 killed; fresh mount shows the old exercises).
- "All UI text is in Polish" → meets — "Edytuj", "Usuń plan", "Usunąć plan „…”?", "Anuluj", "Edytuj plan", both failure texts.
- "Use only the tokens … from DESIGN.md" → meets for tokens — new CSS uses `var(--space-xl)` and `var(--space-2xl)` only.
- "Touch targets … 44 px outside the workout, 64 px main action" → meets — Edytuj 95×56, Usuń plan 119×56, Start 346×64, dialog buttons 380×56.
- DESIGN.md Do "rozdzielać edycję i usuwanie szerokim odstępem" and Danger "leży daleko od akcji głównej" → meets — 132 px between the two, 36 px below Start, at opposite ends of the row.
- DESIGN.md Cards (new line): confirm with "Anuluj" (secondary) and "Usuń plan" (Danger), no chalk; 0,5 s guard → meets — measured classes and colors; guard probe.
- The brief forbids `window.confirm` → meets — in-app `alertdialog`; no native dialog appeared in the walk.
- DESIGN.md Inputs / Fields → Error: "komunikat z kolorem błędu i ikoną ostrzeżenia" → fails:
- **[Major]** `delete-error-missing-warning-icon` — `src/components/PlanList.vue:29` — The failed-delete message is a bare `<p class="field-error" role="alert">` with no warning icon. DESIGN.md defines the error style as error color plus warning icon. The editor's save failure follows this rule through `FieldError` (`PlanEditor.vue:159`), which draws the 2 px stroke SVG. The browser probe shows the delete error in red text with `hasSvg: 0` (`p8-r1-probe-delete-failed.png`). Under the brief contract, UI that breaks DESIGN.md is Major. **Fix:** render the error with `<FieldError v-if="errorText" role="alert">{{ errorText }}</FieldError>` and assert the icon (`svg`) in the failed-delete component test.

## Not reviewed

- Real-device behaviour (a real thumb double tap on Android Chrome, haptic latency): the driver probes used synthetic mouse clicks 10 ms apart and a `dblclick`.
- Edit or delete while a workout runs, in the browser: not reachable through the UI (see Manual probes); covered by tests only.

## Observations outside scope

- `backup-repeated-per-failed-write` (Phase 2, Minor) now also applies to `deletePlan`. It goes through the same `backupIfUnreadable`, so each failed delete retry over unreadable data writes one more `trening.plans.corrupt.<ts>` copy. The bound is the same as in Phase 2: user taps and the quota.
- The plan list shows one chalk "Start" per card (3 chalk buttons with 3 plans). DESIGN.md Cards allows this ("Gdy są plany, główną akcją są przyciski Start na kartach"). It came from Phase 5, not this phase.
