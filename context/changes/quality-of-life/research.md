# Research: reorder and collapse exercises in the plan editor

## Entry points

- `src/components/PlanEditor.vue:22-24` — the editor state. `plan` is a `reactive<Plan>` deep copy (`clonePlan`) of `props.plan`, or a new plan with one exercise. Add the open/collapsed state here (a `Set` or a record keyed by `exercise.id`).
- `src/components/PlanEditor.vue:25` — `errors` ref. A move must clear it (`errors.value = []`), like `removeExercise` does at `:49`.
- `src/components/PlanEditor.vue:43-50` — `addExercise` and `removeExercise`. Add `moveExercise(index, delta)` next to them. `addExercise` must also mark the new exercise as expanded (D5).
- `src/components/PlanEditor.vue:52-63` — `save()`. `validatePlan` runs at `:54`. After a failed validation, open each card that holds an error (D5). Error paths look like `exercises.<index>.name|sets|reps|restSeconds` (`src/plans/plan.ts:26`).
- `src/components/PlanEditor.vue:87-151` — the card `<section class="card exercise" :aria-labelledby=...>` with `<h2 id="exercise-title-<id>">Ćwiczenie {{ index + 1 }}</h2>` (`:93`). The header (move buttons, collapse toggle) goes here. The body (name field `:95-109`, three steppers `:111-141`, „Usuń ćwiczenie" `:143-150`) gets hidden when collapsed.
- `src/components/PlanEditor.vue:22-24` + `src/App.vue:38-43` — „Edytuj plan" is `props.plan !== undefined`. Use this to start all cards collapsed. New plan: only the first card expanded.
- `src/App.vue:33-36` and `src/workout/useWorkout.ts:174-182` — a workout starts from the plan in `plans.value` (re-read by `listPlans()` in `showList`, `App.vue:27-31`). `startWorkout` maps `plan.exercises` in array order (`src/workout/engine.ts:93`). So the saved array order is the workout order. No change is needed there (brief: out of scope).
- `DESIGN.md:218-241` — Components section. Add the move-button and collapsed-card rules near „Edytor planu" (`DESIGN.md:241`) and in Buttons (`:220-225`). Also the Layout touch-target line (`:202`) names 44 px outside the workout.
- `src/components/PlanEditor.test.ts` — add D1/D2/D4/D5 tests. `src/components/EditDelete.test.ts` or `App.test.ts` — add D3 tests (save order, list, Start, cancel).

## Reuse

- Test helpers, `src/components/testHelpers.ts`: `button(root, name)` (`:4-10`, matches `aria-label` first, else trimmed text), `field(root, label)` (`:13-21`), `region(root, 'Ćwiczenie N')` (`:24-31`, finds `section[aria-labelledby]` whose title element text is exactly the name), `stepperValue(root, name)` (`:34-42`).
- Mount pattern: `mount(PlanEditor, { attachTo: document.body })` (`PlanEditor.test.ts:49-51`). Focus checks need `attachTo: document.body`; use `document.activeElement`.
- App-level tests: `mountApp` with fake timers (`EditDelete.test.ts:26-46`), `savePlan(makePlan(...))` seed (`EditDelete.test.ts:15-24, 104-106`), `getPlan`/`listPlans` (`:116-124`), `names(wrapper)` = `li h2` texts (`:35-37`). Reload check: unmount and mount again (`:129-131`).
- Start a workout in a test: `button(wrapper.element, 'Start: <plan name>')` (`src/components/PlanList.vue:39`; used in `Workout.test.ts:117-122`). The first screen shows `<h1 class="workout-name">{{ view.exerciseName }}</h1>` (`src/components/WorkoutSet.vue:22`). Start is guarded: advance the clock by `ACTION_GUARD_MS` first (`EditDelete.test.ts:200-203`, imported from `../workout/useWorkout`).
- Buttons: `.btn` (min-height `var(--target)`, 2 px `--line` border, `:disabled` opacity 0.4) in `src/styles/base.css:87-111`; `.btn-danger` `:119`; `.btn-block` `:128`. Only „Zapisz plan" is `.btn-primary` (`PlanEditor.vue:164`); a test enforces one chalk action (`PlanEditor.test.ts:223-228`). Do not make the new buttons primary.
- Size tokens, `src/styles/tokens.css:360-362`: `--target: 56px`, `--target-large: 64px`, `--target-min: 44px`. Spacing `--space-*` `:347-354`. Radius `--radius-md` `:357`. Colors `--muted`, `--steel` (secondary icons, `DESIGN.md:165`), `--line`, `--surface`. Type `--text-label`, `--text-body`, `--text-title` (`:340-345`).
- Icon pattern: inline SVG, `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"` (`src/components/FieldError.vue:2`); sized by CSS (`base.css:183-188`). `DESIGN.md:216, 274` require 2 px round-cap strokes. `DESIGN.md:281` bans Unicode icons. Note: the stepper uses „−" and „+" text (`NumberStepper.vue:277, 280`), so do not use „↑"/„↓" or „▲" for move buttons; draw SVG chevrons.
- Focus style: global `:focus-visible { outline: 3px solid var(--focus); outline-offset: 2px }` (`base.css:60-63`). No new focus CSS needed.
- Reduced motion: global rule zeroes animation and transition durations (`base.css:190-203`). Any new transition is covered. Prefer no animation.
- Summary text: `formatRest(seconds)` gives „1:30" (`src/plans/format.ts:2`). A „3 × 10, przerwa 1:30" line = `${sets} × ${reps}, przerwa ${formatRest(restSeconds)}`.
- Card styles: `.card` (`base.css:133-138`), scoped `.exercise` flex column with `gap: var(--space-lg)` (`PlanEditor.vue:172-176`).
- Error display: `FieldError` (`FieldError.vue`), `errorAt(path)` (`PlanEditor.vue:39-41`). Error ids: `exercise-name-error-<id>` (`:106`).

## Hazards

- `context/foundation/lessons.md` does not exist (`auto-loop.md:228`). No ADRs exist (`auto-loop.md:230`). No lesson binds this change.
- Tests that will break if „Edytuj plan" opens all cards collapsed (D5): `src/components/EditDelete.test.ts:113` (`field(region('Ćwiczenie 2'), 'Nazwa ćwiczenia')`), `:120` (types in Ćwiczenie 1), `:139` (clicks „Zwiększ serie" in Ćwiczenie 1), `:166` (`stepperSets` reads `output` in Ćwiczenie 1), `:145`-`:147` (reopen and read). Each needs a step that opens the card first, or an update to the tests. The „Zapisz plan" at `:151-160` keeps working.
- Tests that stay green: `PlanEditor.test.ts` and `App.test.ts` all start from a new plan. Card 1 is open. Cards added with „Dodaj ćwiczenie" are open. `PlanEditor.test.ts:146-173` reads fields in cards 1 and 2 and counts `section[aria-labelledby]` = 2 (`:172`). Keep the card as a `<section aria-labelledby>`, one per exercise.
- `region()` requires the title element text to be exactly „Ćwiczenie N" (`testHelpers.ts:27`). Keep the `<h2>` text pure. Put the name and summary in separate elements outside the `<h2>`. `names()` in `EditDelete.test.ts:35-37` selects `li h2`, so do not put `<li>` around the cards.
- `button()` finds a button by `aria-label` first (`testHelpers.ts:6`). The brief names: „Przesuń ćwiczenie N w górę" / „w dół". Existing label style: `Usuń ćwiczenie ${index + 1}` (`PlanEditor.vue:146`). N is the current position and changes after a move.
- Collapsed cards must not leave hidden fields in the DOM that tests find by `field()`/`stepperValue()`. Use `v-if` (D4 says „hides"). With `v-if`, a collapsed card's error field is not in the DOM, so `save()` must open error cards before the user looks. `aria-describedby` ids must not point to missing nodes.
- Focus (D2): the list is keyed by `exercise.id` (`PlanEditor.vue:89`). Vue moves the DOM node on reorder. A moved node can lose focus. The code has no `.focus()` call anywhere in `src/components` (searched). The builder must restore focus after `await nextTick()`, by element id or ref. When the tapped button becomes disabled (edge), focus the other move button. A disabled button cannot keep focus.
- State must follow the exercise (D4): key the open state by `exercise.id`, not by index. Do not store it on the `Exercise` object. `clonePlan` copies every field (`plan.ts:59`) and `savePlan` stores the whole plan, so an extra field on `Exercise` would reach `trening.plans.v1`. Brief: the stored shape stays unchanged, and `src/plans/planStore.ts` stays unchanged.
- `removeExercise` takes an index (`PlanEditor.vue:47`) and clears errors. Mirror this in the move. Also drop the removed id from the open state (optional, avoids a stale entry).
- Error path indexes (`exercises.<index>.…`) are computed at save time from the current order (`plan.ts:85-87`). After a move with no re-validation, `errors` could point to wrong cards. So the move clears `errors` (D2).
- Design rules that bind (`auto-loop.md:184-203`, `DESIGN.md`): one chalk primary action per screen; no emoji or Unicode icons; no left color stripe on a card (`DESIGN.md:216, 280`); no gradients; no shadows (`:209`); dark theme only; no new colors, fonts or sizes; Polish text; `DESIGN.md` update in the same change. If code and `DESIGN.md` disagree, report it.
- Touch size: the brief says at least 44 px (D6); `DESIGN.md:202` says 44 px outside the workout (lists, icons). `.btn` is 56 px by default (`base.css:91`). Two move buttons plus a collapse toggle in a 32rem column (`tokens.css:363`, minus 16 px gutters) must fit on a 375-412 px phone without horizontal scroll. Check at 412×915.
- Test-adequacy traps (`auto-loop.md:233-250`): check at phone width (412×915); use Polish names („Wiosłowanie", „Ćwiczenie"); build fixtures with the app's own functions (`savePlan`, `createExercise`); a "survives reload" check must mount a fresh app and read from storage (D7).
- Browser rule (`CLAUDE.md`): use the Playwright CLI for the D7 walk. Do not use `mcp__Claude_Browser__*`.
- `noUnusedLocals`/`noUnusedParameters`, `erasableSyntaxOnly`: no `enum`, no `namespace` (`CLAUDE.md`, `auto-loop.md:208-210`). No new dependency (brief; `auto-loop.md` §12).
- Git status shows `context/foundation/auto-loop.md` modified and uncommitted. Read it, but do not rely on it being final.

## Unknowns

- none. Two small choices are left to the builder and do not change any Done-when text: (1) whether the collapse toggle label is a text button or an SVG chevron with `aria-label`, since the brief fixes only `aria-expanded`; (2) whether jsdom keeps focus on a moved keyed node, so the focus restore may be a no-op in tests but is still needed in Chrome. Test D2 with `document.activeElement` after `await nextTick()`.
