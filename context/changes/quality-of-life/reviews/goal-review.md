# Goal review — quality-of-life (reorder and collapse exercises)

Diff: `a45c8e1..HEAD` without `context/` (DESIGN.md, PlanEditor.vue, PlanEditor.test.ts, EditDelete.test.ts).
Verdict: **CONCERNS** — every Done-when item is met. No Blocker, no Major. Some Minor and Nit findings.

## Done when

| D | Result | Evidence |
|---|---|---|
| D1 | met | `PlanEditor.vue:169-192` (labels with `index + 1`, `disabled` at edges). Tests `PlanEditor.test.ts:230-294`. `npm test` green. |
| D2 | met | `PlanEditor.vue:93-108`. Tests `PlanEditor.test.ts:303-357`. Mutants M1 (no focus call), M2 (always other), M3 (always tapped), M5 (errors kept) each turn 1-3 tests red. Chrome walk: focus stays on the moved exercise, also with collapsed cards. |
| D3 | met | Tests `EditDelete.test.ts:203-266` (save order, fresh mount, Start runs new order, "Anuluj" keeps stored text). Plan list shows only counts (`plan.ts:130`), so order cannot show there. |
| D4 | met | `PlanEditor.vue:25-28, 154-168, 195-257`. Tests `PlanEditor.test.ts:404-511, 576-592`. |
| D5 | met | `PlanEditor.vue:28, 47-49, 77-84, 113-115`. Tests `PlanEditor.test.ts:527-574`, `EditDelete.test.ts:399-455`. Mutant M4 (open all cards) turns 2 tests red. |
| D6 | met | `DESIGN.md:225, 242-243`. Measured in Chrome: move buttons 44x44, toggle 242x44. Tokens only (`--target-min`, `--steel`, `--space-*`, `--radius-md`). SVG chevrons, no Unicode icons. One chalk button. Polish text. Screenshot `goal-collapsed-6.png`. |
| D7 | met | Walk at 412x915, 6 exercises with Polish names ("Ćwiczenie łydek" at 5). Collapsed all, moved 5 to 1, saved, reload, editor shows it first, Start shows "ĆWICZENIE ŁYDEK", "Dalej: Wiosłowanie". `scrollWidth=412`. Screenshots `goal-moved-5-to-1.png`, `goal-workout-first.png`. |
| D8 | met | `timeout 300 npm test` → "Test Files 18 passed (18) / Tests 415 passed (415)", exit 0. `timeout 300 npm run build` → "✓ built in 231ms", exit 0. |

## Cross-slice check

- Focus after a move with collapsed cards: works. The move buttons sit in the header, so they exist in both states. Keyboard Enter on a move button also keeps focus right.
- Failed save after a move: the error path uses the current order, so the right card opens. Walk: moved a blank-name card from 3 to 2, save opened card 2 with "Wpisz nazwę ćwiczenia 2." only.
- Keyboard and screen reader order per card: toggle "Ćwiczenie N" (expanded/collapsed), then "w górę", then "w dół", then the body. This order makes sense.
- Storage: after the walk, `trening.plans.v1` holds only `version`, `plans`, `id`, `name`, `exercises`, `sets`, `reps`, `restSeconds`. Collapse state is a separate `Set` keyed by id.
- Guardrails: `src/plans/`, `package.json`, lock file, `tsconfig*.json`, `vite.config.ts` have no diff. No `@ts-*`, `any`, `.skip` or `.only` added. No test assertion removed (no `-` lines in the test diffs).
- No duplicated logic between reorder and collapse. `removeExercise` also removes the id from the collapse set. No unused code.
- DESIGN.md describes what the code does (size, labels, disabled look, defaults, focus rule, error rule).

## Findings

1. `toggle-chevron-beside-move-chevrons` — Minor (confidence medium). The collapse chevron sits at the right end of the title button, right next to the move buttons. A collapsed header shows three chevrons in a row: down, up, down. The toggle chevron has the same shape as "w dół", only lighter and without a border (`goal-collapsed-6.png`). On a phone a user can tap the wrong one. DESIGN.md does not say where the chevron sits.
2. `failed-save-error-offscreen` — Minor (confidence low; the gap is older than this change). After an invalid save, the error card opens, but the page does not scroll or move focus to it, and no message shows near "Zapisz plan". With 6 cards, an error in card 1 can be off screen when the user taps save at the bottom.
3. `collapsed-card-hides-error-without-mark` — Nit (confidence medium). If the user collapses a card that shows an error, the error text goes away and the collapsed card shows no sign of it.
4. `move-design-rule-written-twice` — Nit. DESIGN.md describes the move buttons twice (line 225 under Buttons, line 242 under Inputs) with overlapping facts. A later edit can change one and not the other.
5. `six-plan-fixture-has-four-exercises` — Nit. `PlanEditor.test.ts:377` names a fixture `sixPlan`, but it holds 4 exercises.
6. `move-position-not-announced` — Nit (confidence low). After a move, nothing announces the new position. Focus stays on a button whose label changes ("…3 w górę" to "…2 w górę"). Some screen readers do not read a changed label again.

## Not reviewed

Real Android device and TalkBack, iOS, light theme (out of scope), and the workout screens beyond the first set.
