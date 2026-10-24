# Phase review — feat-cardio-intervals · Phase 4: Plan list tags, plan type choice and cardio editor · round 2

- **Scope:** `src/App.vue`, `src/components/PlanList.vue`, `src/styles/tokens.css`, `src/components/CardioPlanEditor.vue`, `src/components/PlanTypeChoice.vue`, `src/components/{App,CardioStored,EditDelete,Resume,CardioPlanEditor,CardioPlansFlow}.test.ts` · **Files reviewed:** 11 (`+1154/-23`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 4` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover none

The five production files (`App.vue`, `CardioPlanEditor.vue`, `PlanList.vue`, `PlanTypeChoice.vue`, `tokens.css`) are byte-identical to the round-1 copies (`diff` against `<scratch>/p4-r1-prod/` printed nothing). This round changed only `CardioPlanEditor.test.ts`: one test renamed, five tests added (213 → 218 component tests). The round-1 code judgement therefore stands; this round re-ran every criterion, re-walked 4.4, and proved the two round-1 Majors closed by mutation.

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | component tests incl. new tags / choice / editor tests | `npx vitest run src/components` | pass — `Test Files  11 passed (11)` · `Tests  218 passed (218)`, no skipped |
| 4.2 | 0 failing (baseline 0) | `npm test` | pass — `Test Files  29 passed (29)` · `Tests  696 passed (696)`, 0 failing = baseline 0, no skipped |
| 4.3 | build exits 0 | `npm run build` | pass — `vue-tsc -b && vite build` exit 0, `✓ built in 246ms`, `precache  23 entries` |

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `remove-block-clears-errors-unpinned` | round 1 (Major) | closed | M1 (drop `errors.value = []` from `removeBlock`, line 59) → `Tests  2 failed \| 216 passed (218)`; red tests: "clears the plan name message after a block is removed" — `AssertionError: expected 'Nowy plan cardioNazwa planuWpisz nazw…' not to contain 'Wpisz nazwę planu.'`; "does not move a block message onto the block that takes its place after a block is removed" — `expected 'Blok 1Powtórz − × 8 + Interwał 1Praca…' not to contain 'wpisz nazwę interwału'` (received text shows `Blok 1: wpisz nazwę interwału 1.` under the block that took the removed block's place). The old test is now honestly named "clears the messages after an interval is removed". |
| `add-interval-alternation-unpinned` | round 1 (Major) | closed | M7 (`createInterval('work')` always) → `Tests  3 failed \| 215 passed (218)`; all three new "Dodaj interwał" tests red with `AssertionError: expected 'Praca' to be 'Odpoczynek'`. M7b (look at `block.intervals[0]` instead of the last) → the alternation test red with `expected 'Odpoczynek' to be 'Praca'`, so the "last interval" clause is pinned too. |

### Manual (walked by the walker with playwright-cli 0.1.14 at 412×915 on `vite preview`; spot-checked: 4.4 via `p4-r2-4.4-list.png`)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 4.4 | choice → cardio editor → save „Bieg z rozgrzewką” with 2 blocks → tags, summary, chalk Start → edit → delete; touch targets | passed | `reviews/screenshots/p4-r2-4.4-list.png` (spot-checked by the coordinator: card „BIEG Z ROZGRZEWKĄ”, violet "Cardio" pill, "32 interwały, 16:00", chalk Start; card "PUSH" with "Siła" pill, "1 ćwiczenie, 3 serie"). Walker snapshot: alertdialog "Jaki plan?" with Siła/Cardio/Anuluj; "Nowy plan cardio" with Blok 1 "× 8", Praca 0:30, Odpoczynek 0:30; "Edytuj: …" opened "Edytuj plan cardio" with both blocks; "Usuń plan: …" + confirm removed the card. Colors: Cardio tag bg `rgb(169, 139, 245)` (= `--cardio` #a98bf5) text `rgb(20, 13, 43)` (= `--on-cardio` #140d2b); Siła tag bg `rgb(38, 39, 42)`; both Start bg `rgb(242, 242, 239)`. Console: 0 errors, 0 warnings. |

Sizes (getBoundingClientRect, walker): "Jaki plan?" Siła/Cardio/Anuluj 380×56 · Dodaj blok 380×56 · Dodaj interwał 346×56 · Usuń interwał 148.9×56 · Usuń blok 118.8×56 · Powtórz −/+ 56×56 · Czas −/+ 56×56 · Praca/Odpoczynek 152×56 · Zapisz plan 380×64 · Anuluj 380×56 · Start 346×64 · Edytuj 95.3×56 · Usuń plan 118.7×56 · tags 44.8×24 / 57.4×24 (not interactive). All match DESIGN.md (56 px, 64 px main action) and the slice guardrail. Extra browser observations: removing Blok 2 left no message on screen; after a block ending in "Praca", "Dodaj interwał" added "Odpoczynek" 0:30. Summary "32 interwały" is the correct Polish plural for 2 blocks × 8 × 2 intervals.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| M1 | drop `errors.value = []` in `removeBlock` (line 59) | coordinator | exit 1 · `Tests  2 failed \| 216 passed (218)` · no skip line | both new block-removal tests red for the right reason → closure 1 |
| M7 | `addInterval` always `createInterval('work')` (line 67) | coordinator | exit 1 · `Tests  3 failed \| 215 passed (218)` · `expected 'Praca' to be 'Odpoczynek'` | alternation, "type the last interval has now" and "own block" tests red → closure 2 |
| M7b | `addInterval` reads `block.intervals[0]` instead of the last (line 66) | coordinator | exit 1 · `Tests  3 failed \| 215 passed (218)`; CardioPlanEditor: 2 red (`expected 'false' to be 'true'`, `expected 'Odpoczynek' to be 'Praca'`); also `PlanEditor.test.ts > saves a valid plan with the chosen values…` red | the "last" clause is pinned. The PlanEditor red is the known mutant-copy host flake (runner traps); PlanEditor does not import CardioPlanEditor, and the real tree is green (4.1). |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | `addInterval`, `removeBlock`, `setKind`, `savedOnce` carry "why" comments; unchanged since round 1. |
| D2 | Documentation types covered? | pass | UI copy in Polish matches DESIGN.md "Edytor planu cardio" / "Wybór typu nowego planu"; no doc made wrong. |
| D3 | Documentation understandable? | pass | Test names now match their inputs (the round-1 misnamed test was renamed). |
| I1 | Satisfies the requirements? | pass | Every Changes-required clause maps to code; 4.4 walked and passed. |
| I2 | Logically correct? | pass (Minor) | One Minor carried: `ambiguous-remove-button-names`. |
| I3 | No unnecessary complexity? | pass | `PlanTypeChoice` is a 15-line dialog in the existing confirm pattern. |
| I4 | Robust? | pass | Failed write keeps data on screen (tested with a throwing `setItem`); double-tap guard tested at 150 ms. |
| I5 | Performant? | n/a | Plans are a handful of small objects. |
| I6 | Secure? | pass | Vue text interpolation only; no `v-html`, no network. |
| I7 | Observable? | n/a | UI-only phase; failures shown as Polish alerts, no debug output. |
| I8 | New dependencies? | n/a | No manifest changed. |
| TEST | Test adequacy | pass | Both round-1 gaps now pinned (M1, M7, M7b red for the right reason); Polish names, 3-item first/middle edit, double tap 150 ms, reload by fresh mount, old-shape plan tagged "Siła". |
| ARCH | Project rules | pass | Violet only on the cardio tag (computed colors confirm); one chalk action per screen; 56/64 px targets measured; tokens only from DESIGN.md (`--cardio`, `--on-cardio`, clock/phase/meta sizes); storage keys unchanged; strength editor unchanged except the "Jaki plan?" step. |

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 0
Findings going back to a builder: none.

## Findings

### I2. Logically correct?

- **[Minor]** `ambiguous-remove-button-names` (still present from round 1) — `src/components/CardioPlanEditor.vue:191,200,203` — every interval has a button named just "Usuń interwał", and every block "Usuń blok" / "Dodaj interwał", while the strength editor names its button "Usuń ćwiczenie N". **Fails when:** a screen-reader user lists the buttons → several identical "Usuń interwał" entries with no position.

## Not reviewed

- The walker saved screenshots of the choice, the editor (twice) and the list, but none of the "Edytuj plan cardio" screen or the delete confirm; edit and delete rest on its snapshot text, not on a screenshot I could open.
- D9-type checks (sound, real phone) are not part of phase 4.

## Observations outside scope

- With no plans, "Nowy plan" is the main action (chalk) but measures 380×56, not 64 px (pre-existing, `PlanList.vue`).
- The in-app dialogs (`PlanDeleteConfirm`, `EndWorkoutConfirm`, and `PlanTypeChoice`, which copies them) do not move focus into the dialog or trap it (pre-existing pattern).
