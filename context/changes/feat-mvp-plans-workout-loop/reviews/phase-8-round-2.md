# Phase review — feat-mvp-plans-workout-loop · Phase 8: Edit and delete a plan · round 2

- **Scope:** `git diff HEAD` plus untracked files: `src/plans/planStore.ts`, `src/plans/plan.ts`, `src/plans/planStore.test.ts`, `src/components/PlanEditor.vue`, `src/components/PlanList.vue`, `src/components/PlanDeleteConfirm.vue` (new), `src/App.vue`, `src/components/EditDelete.test.ts` (new), `DESIGN.md`, `brief.md` Progress rows 8.1–8.3. Changed this round: `PlanList.vue` (error through `FieldError`), `App.vue` (`openEditor` and editor cancel clear the delete error), `PlanDeleteConfirm.vue` (guard reads the `now()` clock seam), `EditDelete.test.ts` (btn-class assertions, icon assertion, two stale-error tests). Not this phase: `context/foundation/auto-loop.md`, `context/foundation/roadmap.md`, `workbench.md`, `.loop-baseline`.
- **Files reviewed:** 9 (`+511/-17` lines; brief.md checkbox edits not counted)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 8` Progress rows and `### Phase 8` Slice details
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 8.1 | tests for opening a saved plan in the editor, saving under the same id, delete with confirm and with cancel, a stored running workout unchanged after edit or delete | `timeout 300 npx vitest run src/plans src/components` | pass — `Test Files  11 passed (11)` / `Tests  229 passed (229)` |
| 8.2 | `npm test` exits 0 | `timeout 300 npm test` | pass — exit 0, `Test Files  18 passed (18)` / `Tests  377 passed (377)` |
| 8.3 | `npm run build` exits 0 | `timeout 300 npm run build` | pass — exit 0, `dist/assets/index-CNMDIT75.js 92.62 kB` … `✓ built in 214ms` |

Skipped or focused tests: `grep -rnE "\.(skip|only|todo)\(|describe\.skip|it\.skip" src --include=*.test.ts` returns nothing. 0 skipped. `planStore.test.ts` only gained lines (`91 0`); no earlier assertion was removed.

### Closures

Mutants were applied in the scratch copy `/tmp/.../scratchpad/mutant` by exact single-occurrence replacement (the script stops when the count is not 1). The production tree was not touched.

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `card-button-size-test-claims-44px` | round 1 | yes | Mutant B1 (round 1's surviving mutant: `class="btn"` removed from "Edytuj" and from "Usuń plan") → `EditDelete.test.ts` `1 failed | 15 passed`, failing test "has Edytuj and Usuń plan buttons named after the plan, both with the btn class that sets the target height, not chalk". Mutant B1b (only "Edytuj" loses `btn`) → same test fails. The test name now matches what it asserts (`EditDelete.test.ts:58-59`). Browser at 412×915: "Edytuj" 95×56, "Usuń plan" 119×56. |
| `delete-error-missing-warning-icon` | round 1 | yes | Mutant I1 (error back to a bare `<p class="field-error" role="alert">`) → "a failed delete shows a Polish message and changes nothing" fails (`EditDelete.test.ts:211`, `find('svg')`). Mutant I1b (svg removed from `FieldError.vue`) → the same test fails, `src/components` `1 failed | 123 passed`. Browser, `setItem` forced to throw for `trening.plans.v1`: `{"tag":"P","cls":"field-error","hasSvg":true,"svgSize":[24,24],"svgStroke":"rgb(255, 107, 107)","color":"rgb(255, 107, 107)"}`, svg has `aria-hidden="true"` (`p8-r2-probe-delete-failed.png`). |

Round-1 Minor and Nit findings, re-checked by execution:

| finding-id | Status | Evidence |
| :-- | :-- | :-- |
| `stale-delete-error-after-editor-cancel` (Minor) | closed | Mutant S1 (no clear in `openEditor` and cancel back to `view = { kind: 'plan-list' }`) → "does not show an old delete error after Edytuj and Anuluj" fails. Mutant S4 (`showList` does not clear) → "does not show an old delete error after a later successful delete" fails. S2 and S3 alone stay green: each one leaves the other clear path, so they are equivalent mutants for this behaviour. Browser: failed delete → "Edytuj: Ćwiczenia na plecy" → "Anuluj" → `{"alertAfterCancel":0,"storageSame":true}` (`p8-r2-probe-error-cleared-after-cancel.png`). |
| `delete-guard-bypasses-clock-seam` (Nit) | closed | `PlanDeleteConfirm.vue:2,10,13` now read `now()` from `src/lib/clock.ts`. Guard mutants: G1 (no guard) → "ignores a confirm tap that comes less than 500 ms…" fails; G2 (`<=`) → 4 tests fail. |
| `delete-unknown-id-unreadable-unpinned` (Minor) | still open | Mutant D7 (backup before the unknown-id check) → `src/plans src/components` `229 passed`. Reported again below. |
| `delete-backup-failed-text-unpinned` (Minor) | still open | Mutant A3 (`backup-failed` delete text → "XX") → `src/components` `124 passed`. Reported again below. |
| `delete-dialog-focus-stays-behind` (Nit) | still open | `PlanDeleteConfirm.vue` has no focus move; unchanged since round 1. Reported again below. |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p8-r2`, `vite preview` on port 4199 after `npm run build`, 412×915)

Fresh session, `localStorage` empty (`{"ls":[],"w":412,"h":915}`). Plans built through the app's own editor: "Wiosłowanie i przysiady" (Wiosłowanie with the defaults; Przysiady with 4 sets), "Ćwiczenia na plecy" (Podciąganie), "Brzuch i łydki" (Wspięcia na palce).

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 8.4 | at 412×915: edit the plan name and one exercise, save, reload: the changes stay (D7) | passed | "Edytuj: Wiosłowanie i przysiady" → `heading "Edytuj plan" [level=1]`, `textbox "Nazwa planu": Wiosłowanie i przysiady`, exercise 2 `textbox "Nazwa ćwiczenia": Przysiady`, `status "Serie": "4"`. Set name "Plecy i nogi – wtorek", exercise 2 "Przysiady bułgarskie", "Zwiększ powtórzenia" ×2 → `status "Powtórzenia": "12"`; "Zapisz plan"; `reload`. Snapshot: `heading "Plecy i nogi – wtorek" [level=2]` first in `list "Zapisane plany"`, 3 items, no duplicate. `trening.plans.v1`: same plan id `2a81c5cd-…`, same exercise ids `1752e3c3-…` / `2ba005c1-…`, `"name":"Przysiady bułgarskie","sets":4,"reps":12`. Screenshots `reviews/screenshots/p8-r2-8.4-editor.png`, `p8-r2-8.4-after-reload.png`. |
| 8.5 | at 412×915: delete a plan → confirm → it is gone after a reload; delete → cancel → it stays (D7) | passed | "Usuń plan: Brzuch i łydki" → `alertdialog "Usunąć plan „Brzuch i łydki”?"` with `button "Anuluj"` (`btn btn-block`, 380×56) and `button "Usuń plan"` (`btn btn-danger btn-block`, 380×56, text `rgb(255, 107, 107)`, transparent background, no chalk) → "Usuń plan" → `reload` → headings "Plecy i nogi – wtorek", "Ćwiczenia na plecy"; `trening.plans.v1` contains "Brzuch": `false`. "Usuń plan: Ćwiczenia na plecy" → `alertdialog "Usunąć plan „Ćwiczenia na plecy”?"` → "Anuluj" → dialog gone → `reload` → still listed; storage compared with the value before: `STORAGE_IDENTICAL`. Screenshots `p8-r2-8.5-confirm-open.png`, `p8-r2-8.5-after-confirm-reload.png`, `p8-r2-8.5-after-cancel-reload.png`. |

Extra probes (same session):

- **Card buttons** (first card, `p8-r2-list.png`): Start 346×64, `btn btn-primary btn-large btn-block`, background `rgb(242, 242, 239)` (chalk); "Edytuj" 95×56, `btn`, transparent, border `rgb(58, 60, 64) 2px`; "Usuń plan" 119×56, `btn btn-danger`, border and text `rgb(255, 107, 107)`. Gap "Edytuj" → "Usuń plan" 132 px; gap Start bottom → action row 36 px. `scrollWidth` 412. Barlow Condensed 700/800 and Barlow Semi Condensed 500/600/700 loaded.
- **Failed delete** (`Storage.prototype.setItem` throws `QuotaExceededError` for `trening.plans.v1`, confirm tapped well after 500 ms): `alert` with `img` and the text "Nie udało się usunąć planu. Sprawdź wolne miejsce w pamięci telefonu i spróbuj jeszcze raz.", dialog closed, both cards listed, `storageSame: true` (`p8-r2-probe-delete-failed.png`).
- **Error clears after Edytuj → Anuluj**: `heading "Edytuj plan"` → "Anuluj" → `heading "Plany"`, `alertAfterCancel: 0` (`p8-r2-probe-error-cleared-after-cancel.png`).
- **Second tap 10 ms after the dialog opens** (in-page `click()` on the card "Usuń plan", then on the dialog "Usuń plan" 10 ms later): `{"dialogOpen":1,"stillStored":true}` (`p8-r2-probe-fast-second-tap.png`).

Session `mvp-p8-r2` closed (`playwright-cli list` → `(no browsers)`). Preview on 4199 killed; `curl -s -m 1 localhost:4199` → exit 7. `ss -ltn` shows nothing on 4198 or 4199.

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

Blockers: 0 · Major: 0 · Minor: 2 · Nit: 1

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`deletePlan` (`planStore.ts:156-160`), `backupIfUnreadable` (`:120`) and `clonePlan` (`plan.ts:54`) carry docblocks that state the contract. `PlanDeleteConfirm.vue:8-9` says why the guard exists. DESIGN.md names the new strings, the 0,5 s guard and the failed-delete message.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no setup change |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | no new seam |
| TSDoc / API | yes | yes | see D1 |
| DESIGN.md | yes | yes | Cards line (buttons, question, guard, failure) and Inputs / Fields line ("Edytuj plan", same id, cancel) |
| Translations | no | — | Polish strings inline by project design |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The two DESIGN.md lines match the code strings ("Edytuj", "Usuń plan", „Usunąć plan „nazwa"?", "Anuluj", "Edytuj plan").

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 8 Slice details / rows) | Implemented in | Status |
| :-- | :-- | :-- |
| Plan card: edit and delete, wide gap between them, away from Start, delete in danger style | `PlanList.vue:44-56`, `:83-89` | met — 132 px apart, 36 px below Start, 56 px high, danger border and text |
| `PlanEditor.vue` opens an existing plan and saves it under the same id | `PlanEditor.vue:17-24`, `:68`; `App.vue:38-43`, `:88` | met — 8.4 walk (same plan and exercise ids) |
| `planStore.deletePlan(id)` | `planStore.ts:161-168` | met |
| Delete asks for confirmation in-app; cancel keeps the plan | `PlanDeleteConfirm.vue`; `PlanList.vue:15-21`, `:67-72` | met — no `window.confirm`; 8.5 walk |
| Running workout keeps its own copy; a test proves it through the store | `EditDelete.test.ts:246-272`; `planStore.test.ts` "does not touch the stored running workout" | met |
| Tests in `src/plans/*.test.ts` and `src/components/*.test.ts` | `planStore.test.ts` (+8), `EditDelete.test.ts` (16) | met |
| New UI strings added to DESIGN.md (brief guardrail) | `DESIGN.md` Cards, Inputs / Fields | met |

### I2. Is it logically correct?

**Verdict:** CONCERNS

The round-2 changes are correct. `openEditor` and `showList` both clear `deleteError`, and editor cancel now goes through `showList`, which also re-reads the plans from storage. A failed delete keeps the dialog closed, the list unchanged and the storage byte for byte the same (test and browser). Both Minors below are unchanged from round 1.

- **[Minor]** `delete-unknown-id-unreadable-unpinned` — `src/plans/planStore.ts:157,163-164`; `src/plans/planStore.test.ts` "an unknown id is a no-op that writes nothing" — The docblock says "An unknown id is a no-op that writes nothing". The test checks this only over readable data. **Fails when:** the backup moves in front of the id check (mutant D7); then an unknown id over unreadable data writes a `trening.plans.corrupt.<now>` copy, and all 229 tests pass. The UI only offers ids of readable plans, so this input is not reachable today. **Fix:** add the same case over unreadable data and assert that no `trening.plans.corrupt.*` key appears.
- **[Minor]** `delete-backup-failed-text-unpinned` — `src/App.vue:20-25` — No component test shows the `backup-failed` delete message. **Fails when:** that text is replaced by "XX" (mutant A3); all 124 component tests pass. The store's `backup-failed` result is pinned by `planStore.test.ts` "does not write when the copy of unreadable data fails". **Fix:** a component test with unreadable stored data and a failing corrupt-copy write that asserts the "Nie udało się zabezpieczyć starych danych…" alert.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

`backupIfUnreadable` removes a duplicated block; `View` gained one optional field; the confirm component copies the Phase 6 pattern. The guard now uses the clock seam. It still imports `ACTION_GUARD_MS` from `workout/useWorkout`; that is a shared constant, not a defect.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

A failed write returns `write-failed` and storage stays the same. A failed backup over unreadable data stops the write. A throwing `getItem` does not throw out of `deletePlan`. The 500 ms guard ignores a confirm tap 10 ms after the dialog opens (browser probe). The dialog covers the whole screen, so a second tap cannot reach a card behind it.

- **[Nit]** `delete-dialog-focus-stays-behind` — `src/components/PlanDeleteConfirm.vue:19` — The dialog sets `aria-modal="true"`, but focus stays on the card "Usuń plan" button behind it. `EndWorkoutConfirm.vue` has the same pattern. A screen-reader or keyboard user starts outside the dialog.

### I5. Is it performant?

**Verdict:** PASS

One `localStorage` read and at most two writes per delete; a handful of plans.

### I6. Is it secure (SQL injection, …)?

**Verdict:** N/A

No server, no network. Plan names reach the DOM only through `{{ }}` and attribute bindings, which Vue escapes.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

No backend and no logging layer. Failures show to the user in Polish.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json`, `package-lock.json` and `tsconfig*.json` unchanged.

---

## Architecture — the project's own rules

- "Data lives in `localStorage` only. … never silently overwrites data it could not read" → meets — `deletePlan` copies unreadable data aside first and stops when the copy fails.
- "No server for user data" → meets — no network code added.
- D7 "a running workout keeps its own copy" → meets — delete and save never touch `trening.workout.v1` (`EditDelete.test.ts:246-272`).
- "All UI text is in Polish" → meets — "Edytuj", "Usuń plan", "Usunąć plan „…”?", "Anuluj", "Edytuj plan", both failure texts.
- "Use only the tokens … from DESIGN.md" → meets — new CSS uses `var(--space-xl)` and `var(--space-2xl)` only; the error reuses `FieldError` and `.field-error`.
- "Touch targets … 44 px outside the workout, 64 px main action" → meets — Edytuj 95×56, Usuń plan 119×56, Start 346×64, dialog buttons 380×56; the `btn` class that sets the height is now pinned by a test.
- DESIGN.md Do "rozdzielać edycję i usuwanie szerokim odstępem" and Danger "leży daleko od akcji głównej" → meets — 132 px apart, 36 px below Start.
- DESIGN.md Inputs / Fields → Error: "komunikat z kolorem błędu i ikoną ostrzeżenia" → meets — failed delete shows the 24×24 warning icon in `rgb(255, 107, 107)` (closure above).
- The brief forbids `window.confirm` → meets — in-app `alertdialog`; no native dialog appeared.

## Not reviewed

- Real-device behaviour (a real thumb double tap on Android Chrome): the probes used synthetic clicks 10 ms apart.
- Edit or delete while a workout runs, in the browser: not reachable through the UI (the workout screens replace the plan list while a workout exists); covered by tests only.

## Observations outside scope

- `backup-repeated-per-failed-write` (Phase 2, Minor) also applies to `deletePlan`: each failed delete retry over unreadable data writes one more `trening.plans.corrupt.<ts>` copy. Bounded by user taps and the quota, as in Phase 2.
- The plan list shows one chalk "Start" per card. DESIGN.md Cards allows this; it came from Phase 5.
