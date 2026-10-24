# Brief: Reorder and collapse exercises in the plan editor

## Goal

On a phone, the user can change the exercise order and collapse single exercises while building or editing a plan. A plan with many exercises stays easy to edit with one thumb.

## Done when

- D1 Each exercise card in the plan editor has two buttons, „Przesuń ćwiczenie N w górę” and „Przesuń ćwiczenie N w dół” (N = the current position). A tap swaps the exercise with its neighbour. "Up" on the first exercise and "down" on the last exercise are disabled — checked by `src/components/PlanEditor.test.ts`.
- D2 After a move, keyboard focus stays on the moved exercise: on the same move button, or on its other move button when the moved exercise reached an edge and the tapped button became disabled. A move clears the validation errors shown on screen (as „Usuń ćwiczenie” does) — checked by `src/components/PlanEditor.test.ts`.
- D3 „Zapisz plan” after a move saves the exercises in the new order; the plan list and a workout started from that plan follow the new order; „Anuluj” after a move leaves the stored order unchanged — checked by component tests in `src/components/`.
- D4 A button in each exercise card header collapses and opens that card, and exposes its state with `aria-expanded`. A collapsed card shows its title „Ćwiczenie N”, the exercise name (when it is not blank), a summary in the form „3 × 10, przerwa 1:30”, and the two move buttons; it hides the name field, the steppers and „Usuń ćwiczenie”. The open or collapsed state follows the exercise when it moves. The state is not saved with the plan — checked by `src/components/PlanEditor.test.ts`.
- D5 A new plan opens with its first exercise expanded; „Dodaj ćwiczenie” adds an expanded exercise; „Edytuj plan” opens every exercise collapsed; a „Zapisz plan” that fails validation opens every card that holds an error, so each error text is visible — checked by component tests in `src/components/`.
- D6 `DESIGN.md` describes the move buttons and the collapsed exercise card (labels, size, state, disabled look); the new UI uses only `DESIGN.md` tokens, Polish text, touch targets of at least 44 px, no emoji or Unicode icons — checked by the critic against `DESIGN.md` and by a browser walk.
- D7 At 412×915, a plan with 6 exercises with Polish names: collapse cards, move the exercise at position 5 to position 1 with the move buttons, save, see the order kept after a reload in the editor, and start the workout: the moved exercise comes first — checked by a browser walk.
- D8 `npm test` passes and `npm run build` exits 0 — checked by running both.

## Out of scope

- Any change to the workout screens, the plan list, or the stored plan format. The exercise order is the array order that is saved today.
- The screenshot in the change folder (weight, plate stack on the workout screen) — post-MVP.
- Drag-and-drop reordering.

## Guardrails

- Project rules: `CLAUDE.md`, `DESIGN.md`, `PRODUCT.md`, `context/foundation/auto-loop.md` §9/§10. Polish UI text; dark "guma" theme only; `DESIGN.md` tokens only; one chalk primary action per screen („Zapisz plan” stays the only one).
- `DESIGN.md` gets the rules for the move buttons and the collapsed card in the same change (CLAUDE.md: a need that `DESIGN.md` does not cover is added to it in the same change).
- `src/plans/planStore.ts` and the stored shape under `trening.plans.v1` stay unchanged.
- No new dependency (`auto-loop.md` §12).

## Research

See `research.md` (entry points: `src/components/PlanEditor.vue:22-63` state and actions, `:87-151` exercise card; `DESIGN.md:218-241` Components; tests that open an existing plan: `src/components/EditDelete.test.ts:113-166`).

## Progress

### Phase 1: Move exercises up and down
#### Automated Verification:
- [x] 1.1 `npx vitest run src/components/PlanEditor.test.ts` passes, with tests on a plan of at least three exercises with Polish names for: the „Przesuń ćwiczenie N w górę” / „Przesuń ćwiczenie N w dół” buttons on every card; a tap swapping the exercise with its neighbour (name, sets, reps and rest move with it, labels renumber); "up" disabled on the first and "down" disabled on the last exercise; focus on the same move button of the moved exercise after a move, and on its other move button when the tapped one became disabled; a move clearing the shown validation errors (D1, D2) — ec76af5
- [x] 1.2 `npx vitest run src/components` passes, with tests for: „Zapisz plan” after a move storing the new order (read back with `listPlans()` and after a fresh app mount); the plan list and a workout started from that plan following the new order; „Anuluj” after a move leaving the stored order unchanged (D3) — ec76af5
- [x] 1.3 `grep -n "Przesuń ćwiczenie" DESIGN.md` prints the new move-button rule under „Edytor planu” (D6) — ec76af5
- [x] 1.4 `npm test` exits 0 (D8) — ec76af5
- [x] 1.5 `npm run build` exits 0 (D8) — ec76af5
#### Manual Verification:
- [x] 1.6 at 412×915: a plan with 4 exercises („Wiosłowanie”, „Przysiady”, „Wyciskanie leżąc”, „Martwy ciąg”): move „Martwy ciąg” from position 4 to position 2 with the buttons, save, open „Edytuj” again: the order is kept; the move buttons are at least 44 px, the disabled ones show the 40 % disabled look, icons are SVG strokes (no emoji, no Unicode arrows), no horizontal scroll (D1, D3, D6) — ec76af5

### Phase 2: Collapse and open an exercise card
#### Automated Verification:
- [x] 2.1 `npx vitest run src/components/PlanEditor.test.ts` passes, with tests for: the card header toggle with `aria-expanded`; a collapsed card showing „Ćwiczenie N”, the exercise name when it is not blank, the summary „3 × 10, przerwa 1:30” (and the summary after a stepper change), and both move buttons, and not showing the name field, the steppers and „Usuń ćwiczenie”; the open/collapsed state following the exercise after a move; the move buttons working on collapsed cards (D4)
- [x] 2.2 `npx vitest run src/components` passes, with tests for: a new plan with its first exercise expanded; „Dodaj ćwiczenie” adding an expanded exercise; „Edytuj plan” opening every exercise collapsed; a failed „Zapisz plan” opening every card that holds an error, with each error text visible; the stored plan JSON having the same keys as before (no open/collapsed field) (D4, D5)
- [x] 2.3 `grep -n "zwinięt" DESIGN.md` prints the new collapsed-card rule under „Edytor planu” (D6)
- [x] 2.4 `npm test` exits 0 (D8)
- [x] 2.5 `npm run build` exits 0 (D8)
#### Manual Verification:
- [x] 2.6 at 412×915: a plan with 6 exercises with Polish names: collapse every card, move the exercise at position 5 to position 1 with the move buttons on collapsed cards, save, reload, open „Edytuj”: every card is collapsed and the order is kept; back to the list, „Start”: the moved exercise comes first (D7)
- [x] 2.7 at 412×915: a collapsed card is one compact block (header, name, summary, move buttons); the toggle and move buttons are at least 44 px and show the focus outline when reached with the keyboard; the chevron icon is an SVG stroke; all text is Polish; only „Zapisz plan” is chalk (D4, D6)

## Slice details

### Phase 1: Move exercises up and down
Changes required:
- `src/components/PlanEditor.vue`: a card header row with the `<h2>` „Ćwiczenie N” (its text stays exactly that — `region()` in `testHelpers.ts` depends on it) and two move buttons on the right. Buttons: `type="button"`, class `btn` (secondary — never `btn-primary`), at least `var(--target-min)` (44 px) square, inline SVG chevron up / chevron down copying the `FieldError.vue` icon pattern (24×24 viewBox, 2 px round-cap stroke, `aria-hidden`), `aria-label` „Przesuń ćwiczenie N w górę” / „Przesuń ćwiczenie N w dół” with N = the current position. Disabled with the `disabled` attribute at the edges (base.css already gives 40 % opacity).
- `moveExercise(index, delta)` next to `addExercise` / `removeExercise`: swap in `plan.exercises`, clear `errors` (as `removeExercise` does), then after `nextTick()` focus the same button of the moved exercise, or its other move button when the tapped one is now disabled (find it by a stable per-exercise id or ref, not by index captured before the move).
- No change to `plan.ts`, `planStore.ts`, `App.vue`, the plan list or the workout code: the saved array order already is the workout order (`engine.ts:93`).
- `DESIGN.md` „Edytor planu” (Polish): add the move buttons — labels, accessible names with the position, 44 px icon buttons in the card header, secondary style, disabled at the edges, chevron SVG icons. If the Layout or Buttons section needs a matching line, add it there too.
- Tests: extend `src/components/PlanEditor.test.ts` (D1, D2) and add the D3 tests next to the existing edit/save tests (`EditDelete.test.ts` or `App.test.ts` patterns: `savePlan` seed, `listPlans()`, unmount + fresh mount, `Start: <name>` after advancing the clock by `ACTION_GUARD_MS`). Use at least three exercises with Polish names, and move the first and the middle one, not only the last.
Slice guardrails: none beyond the brief.

### Phase 2: Collapse and open an exercise card
Changes required:
- `src/components/PlanEditor.vue`: the WAI-ARIA accordion pattern — the `<h2>` holds a `<button type="button">` whose text is „Ćwiczenie N” plus a chevron SVG (`aria-hidden`), with `aria-expanded` and `aria-controls` pointing at the card body id; the `<h2>` text stays exactly „Ćwiczenie N`. The button is at least 44 px tall and fills the header space left of the move buttons.
- Collapsed state: a reactive `Set` (or record) of exercise ids in the component, never a field on `Exercise` (clonePlan/savePlan would store it). Collapsed card body: the name (when not blank) and the summary `${sets} × ${reps}, przerwa ${formatRest(restSeconds)}`; the name field, the steppers and „Usuń ćwiczenie” are removed with `v-if` (so hidden fields are not in the DOM and not focusable). The move buttons stay in the header in both states.
- Defaults: new plan → its first exercise expanded; `addExercise` → the new exercise expanded; editing an existing plan (`props.plan !== undefined`) → every exercise collapsed. `save()` with validation errors → expand every card whose index appears in an `exercises.<index>.…` error path before the errors render. `removeExercise` drops the removed id from the state.
- `DESIGN.md` „Edytor planu” (Polish): add the collapsed card — what it shows (the word „zwinięta” / „zwinięte” must appear in the rule), the header toggle with the chevron, the defaults above, errors opening the card.
- Existing tests that open a saved plan and read or type into its fields (`EditDelete.test.ts:113-166`) get a step that opens the card first. Do not remove or loosen any of their assertions.
- Tests: extend `src/components/PlanEditor.test.ts` (D4) and the edit tests (D5), including a stored-JSON key check after a save.
Slice guardrails: no transition or animation on collapse (the global reduced-motion rule exists, but none is needed).
