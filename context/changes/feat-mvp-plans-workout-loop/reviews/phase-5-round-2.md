# Phase review — feat-mvp-plans-workout-loop · Phase 5: Workout screens, rest timer and sound · round 2

- **Scope:** `git diff HEAD` (working tree on top of `e2ffda4`). Tracked: `DESIGN.md`, `src/App.vue`, `src/components/PlanList.vue`, `src/components/PlanList.test.ts`, `src/styles/base.css`. New: `src/lib/clock.ts` + test, `src/workout/sound.ts` + test, `src/workout/useWorkout.ts`, `src/components/{WorkoutSet,WorkoutRest,WorkoutEnd}.vue`, `src/components/Workout.test.ts`. The brief.md edit is Progress checkboxes only (5.1–5.3 ticked, 4.1/4.2 commit stamps).
- **Files reviewed:** 14 (`+1047/-9` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 5` rows 5.1–5.5, `## Slice details` Phase 5, plus the two orchestrator decisions for round 2 (tap guard window; sound only if seen visible and at most 2 000 ms late)
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 5.1 | component tests: Start, set view, "Gotowe" → rest, clock past rest end → set view + sound once, "Gotowy, zaczynam", last set → end → "Wróć do planów" | `timeout 300 npx vitest run src/components` | pass — `Test Files 5 passed (5)`, `Tests 50 passed (50)` |
| 5.2 | `npm test` exits 0 | `timeout 300 npm test` | pass — `Test Files 12 passed (12)`, `Tests 209 passed (209)`; no `.skip/.only/.todo` in `src/**/*.test.ts` (grep empty) |
| 5.3 | `npm run build` exits 0 | `timeout 300 npm run build` | pass — `vue-tsc -b` clean, `✓ built in 212ms` |

Each named 5.1 clause has a test in `src/components/Workout.test.ts` (lines 117–143, 146–175, 185–192, 209–219, 288–295, 382–398). All tests use fake timers that never run unless a test asks, and move the clock with `vi.setSystemTime` (line 102–104). A tick-counting display mutant (M9 below) fails 2 tests.

### Closures (rounds after the first)

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `double-tap-crosses-screens` | round 1 | yes | Browser, 412×915, real `page.mouse.click` twice at the same point (206, 835), 150 ms apart. On "Gotowe": the second tap hit "Gotowy, zaczynam" (`elementFromPoint` → "Gotowy, zaczynam") and the state stayed `Przerwa \| 0:15`. On "Gotowy, zaczynam": the second tap hit "Gotowe" and the state stayed `Przysiady \| 2` (no set marked). A deliberate tap ~650 ms after the change worked (`Przerwa \| 0:15`). Mutant M1 (guard off: `return at < 0`) → `Tests 4 failed \| 205 passed`. Screenshots `p5-r2-probe-double-tap-gotowe.png`, `p5-r2-probe-double-tap-ready.png`. Note: the size of the window is not pinned, see `guard-window-size-unpinned`. |
| `gotowe-audio-unlock-unpinned` | round 1 | yes | Mutant M2 (remove `unlockAudio()` from `finishSet`, `useWorkout.ts:88`) → `Tests 1 failed \| 208 passed`: "creates or resumes the audio context inside the "Gotowe" tap". |
| `start-plan-lookup-unpinned` | round 1 | **no** | Mutant M3a (`plans.value[0]`) → 1 failed (closed for that form). Mutant M3b (`plans.value[plans.value.length - 1]`, the id ignored) → `Tests 209 passed (209)`. The only two-plan test (`Workout.test.ts:132-143`) taps the LAST card, so "always start the last plan" passes. Still open, see I1. |
| `rest-time-rounding-unpinned` | round 1 | yes | Mutant M4a (`Math.floor`) → 1 failed; mutant M4b (`Math.round`) → 1 failed; both: "reads whole seconds rounded up between whole seconds, and never 0:00 while it runs". |
| `hidden-rest-end-later-silence-unexercised` | round 1 | yes | Mutant M5a (remember a rest end resolved while hidden, beep on the next `visibilitychange` to visible) → 1 failed: "stays silent when the page is hidden at the rest end, and plays nothing later" (`expected 1 to be +0`). Mutant M5b (no lateness check) → 2 failed. |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p5-r2`, `vite preview` on port 4199, 412×915)

The plan "Góra i nogi" was made in the editor. I read a stale snapshot and clicked "Skróć przerwę" once too often, so exercise 2 saved with a 0 s rest. I set its `restSeconds` to 15 and its reps to 12 in `trening.plans.v1` (the app's own shape) and reloaded. Audio was instrumented: `AudioContext.prototype.createOscillator` was wrapped with a counter (`__osc`, 3 oscillators = one beep pattern). This proves the call, not that the sound is audible.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 5.4 | at 412×915: run a plan with 2 exercises × 2 sets and a 15 s rest from start to the end screen: the set view shows the exercise, the reps, the sets left as the biggest number and "Dalej:"; the rest view counts down from 0:15 and the set view returns by itself; the end screen leads back to the plan list (D3) | passed | `p5-r2-5.4-set-1.png`: `heading "Wiosłowanie"`, `paragraph: 10 powtórzeń`, `paragraph: "2"` + `serii zostało`, `paragraph: "Dalej: Przysiady"`, `button "Gotowe"`. Computed font sizes: sets left 176 px (the biggest), name 36 px, "powtórzeń" 22 px; "Gotowe" 64 px high. MutationObserver record of rest 2 (real click): `[0,"Przerwa\|0:15"], [1006,"0:14"] … [14001,"0:01"], [15058,"Przysiady\|"]`, `__osc` 3 → 6 (one beep pattern). Rest 3: first `0:15`, set view at 15 003 ms, `__osc` 9. `p5-r2-5.4-set-3-last-exercise.png`: `To ostatnie ćwiczenie`; `p5-r2-5.4-set-4-last-set.png`: `To ostatnia seria`, sets left `1`. `p5-r2-5.4-end.png`: `paragraph: Góra i nogi`, `heading "Koniec treningu"`, `button "Wróć do planów"`. `p5-r2-5.4-back-to-list.png`: `heading "Plany"`, `button "Start: Góra i nogi"`. |
| 5.5 | at 412×915: "Gotowy, zaczynam" ends a running rest at once (D3) | passed | `p5-r2-5.5-rest-before.png` (`timer: 0:14`). Real click at 0:08. Record: `"Przerwa\|0:09","Przerwa\|0:08","Wiosłowanie\|"`; after: `h1 "Wiosłowanie"`, sets left `1`, new oscillators `0` (no sound). `p5-r2-5.5-after-ready.png`. |

Extra probes (asked by the orchestrator):

- Double tap ~150 ms apart on "Gotowe" and on "Gotowy, zaczynam": the second tap is now ignored in both cases (see the closure row).
- Double tap ~150 ms apart on the LAST "Gotowe" of the plan: `afterFirstTap: "Koniec treningu"`, `underSecondTap: "Wróć do planów"`, `afterSecondTap: "Plany"`. The end screen is skipped. Screenshot `p5-r2-probe-double-tap-last-gotowe.png`. See `end-screen-back-unguarded`.
- Plan card "Start" measured with `getBoundingClientRect()`: `{"startH":56,"startW":346}`. See `plan-card-start-below-64px`.

### Wrong-implementation table (scratch copy `scratchpad/mutant`, production files untouched)

| Mutant | Change | Suite | Result |
| :-- | :-- | :-- | :-- |
| M1 | guard off | src | 4 failed |
| M2 | no `unlockAudio()` in `finishSet` | src | 1 failed |
| M3a | Start takes `plans[0]` | src | 1 failed |
| M3b | Start takes the last plan | src | **209 passed** |
| M4a / M4b | `floor` / `round` for the shown seconds | src | 1 failed each |
| M5a | beep on the return after a hidden rest end | components | 1 failed |
| M5b | no lateness check | components | 2 failed |
| M5c | no visibility check | components | 1 failed |
| M5d | `<` instead of `<=` 2 000 ms | components | 1 failed |
| M5e | lateness measured from the rest start | components | 3 failed |
| M5f | `SOUND_MAX_LATE_MS = 5_000` | components | 1 failed |
| M6a | `ACTION_GUARD_MS = 5_000` | components | **50 passed** |
| M6b | `ACTION_GUARD_MS = 60_000` | src | **209 passed** |
| M6c | `ACTION_GUARD_MS = 50` | src | **209 passed** |
| M6d | rest end by itself does not start the guard | components | 1 failed |
| M6e | an ignored tap extends the guard | components | 1 failed |
| M6f | the rest starts after the guard (longer rest) | components | 3 failed |
| M6g | `refresh` skips while guarded | components | 50 passed — equivalent in this phase: a rest is at least 15 s and nothing commits inside a rest, so the guard cannot overlap a rest end |
| M7 | `unlockAudio()` after the guard check | components | 50 passed — not a contract clause |
| M8 | no `resolveRest` before a tap | components | 50 passed — equivalent: `getView` keeps `mode: 'rest'` until resolved, so "Gotowe" cannot be on screen in a rest state |
| M9 | display counts ticks (`clockMs += 250`) | components | 2 failed |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | CONCERNS |
| I1 | Does it satisfy the original requirements? | FAIL |
| I2 | Is it logically correct? | CONCERNS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | FAIL |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 1 · Major: 2 · Minor: 5 · Nit: 0

Findings going back to a builder: `plan-card-start-below-64px`, `guard-window-size-unpinned`, `start-plan-lookup-unpinned`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Every new module has a docblock that says why: `clock.ts:1-4`, `sound.ts:1-5`, `useWorkout.ts:15-32`. The two decision constants have a name and a reason (`ACTION_GUARD_MS`, `SOUND_MAX_LATE_MS`).

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | none in this repo |
| phpdoc / API | n/a | — | TS docblocks present |
| Query header comments | n/a | — | |
| E2E rules / selectors | n/a | — | |
| Translations | n/a | — | Polish literals by design |
| DESIGN.md | yes | yes | "To ostatnie ćwiczenie" line and the plan-list main action line added (2 lines) |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** CONCERNS

- **[Minor]** `settle-before-tap-docblock-overclaims` — `src/workout/useWorkout.ts:70-74` — the docblock says that without `resolveRest` first "the tap would be dropped". Mutant M8 (no settle) passes all tests, and it is equivalent: `getView` keeps `mode: 'rest'` until the rest is resolved, so "Gotowe" is never on screen with a rest state. The comment claims a failure that cannot happen today. (Carried from round 1.)

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** FAIL

| Requirement (from this phase's Changes Required / Success Criteria) | Implemented in | Status |
| :-- | :-- | :-- |
| "Start" on each plan card starts that plan | `PlanList.vue:16-23`, `App.vue:22-25` | partial — works (browser, P3 probe), but 56 px instead of 64 px, and the lookup is not fully pinned |
| Set view: Headline name, Figure reps, Counter + "serii zostało", "Dalej:" / "To ostatnie ćwiczenie" / "To ostatnia seria", "Gotowe" 64 px chalk at the bottom | `WorkoutSet.vue` | met (browser 5.4) |
| Rest view: ring, Figure m:ss from timestamps, "Dalej:" next set, "Gotowy, zaczynam" 64 px; display timer only re-renders | `WorkoutRest.vue`, `useWorkout.ts:36-38,112-119` | met (M9 killed) |
| End screen per DESIGN "Ekran końca" | `WorkoutEnd.vue` | met |
| `sound.ts`: Web Audio, created or resumed in the Start and "Gotowe" taps, feature-checked, once per rest end seen while visible | `sound.ts`, `useWorkout.ts:80-93` | met (M2 killed, `sound.test.ts` missing/blocked API cases) |
| Clock seam | `src/lib/clock.ts` | met |
| Decision 1: guard window ~400–600 ms, one named constant, from the screen change, deliberate tap after it always works, never lengthens a rest | `useWorkout.ts:23,43-51` | code met (500 ms); the window size is not pinned |
| Decision 2: sound only when visible AND ≤ 2 000 ms late | `useWorkout.ts:58-68` | met (M5b–M5f killed); one edge, see `return-beep-depends-on-hidden-tick` |

- **[Blocker]** `plan-card-start-below-64px` — `src/components/PlanList.vue:18` — the plan card "Start" has `class="btn btn-primary btn-block"` without `btn-large`, so it is 56 px high (measured in the browser at 412×915: `{"startH":56}`). `DESIGN.md` Layout says "64 px dla głównej akcji (Start, Gotowe)", and the project rules list "64 px for the main action" as a key design rule. **Fails when:** the user taps Start on any plan card → the main action is 8 px smaller than the approved design. Fix: add `btn-large` to the Start button and pin it in `PlanList.test.ts` (the test at line 45 already checks the class list of each Start).
- **[Major]** `start-plan-lookup-unpinned` — `src/App.vue:22-25`, test `src/components/Workout.test.ts:132-143` — the only test with two saved plans taps the LAST card ("Plecy"). Mutant M3b (`const plan = plans.value[plans.value.length - 1]`, id ignored) passes all 209 tests. **Fails when:** a change makes Start pick the most recent plan → the user taps the first card and runs the wrong plan, with every test green. Fix: in the two-plan test, also tap "Start: Wiosłowanie i przysiady" (the first card) and assert its first exercise, or test both cards.

### I2. Is it logically correct?

**Verdict:** CONCERNS

- **[Minor]** `end-screen-back-unguarded` — `src/App.vue:27-30`, `src/components/WorkoutEnd.vue:12` — "Wróć do planów" sits at the same spot as "Gotowe" and does not check the guard. **Fails when:** a double tap (150 ms) on the last "Gotowe" → the second tap lands on "Wróć do planów" → the plan list opens and the user never sees "Koniec treningu" (browser probe: `afterFirstTap: "Koniec treningu"`, `afterSecondTap: "Plany"`; unit probe gives the same). No data is lost (the workout was over). Decision 1 says "workout action taps"; whether the end screen action is one is for the owner.
- **[Minor]** `return-beep-depends-on-hidden-tick` — `src/workout/useWorkout.ts:65-67` — decision 2 says "a rest that ended while hidden … switches to the set view silently", and the docblock at lines 55-57 says the same. The code only checks the visibility at the moment it sees the end. **Fails when:** the rest ends while the page is hidden, no hidden tick runs (frozen page), and the page becomes visible within 2 s of the end → it beeps. Scratch test: hidden, clock +16 s (1 s past the end), visible + `visibilitychange` → `h1=Wiosłowanie sounds=1`. The beep is at most 2 s late, so the harm is small; the decision text can also be read as "visible and ≤ 2 s" only. The owner should pick one reading. (Same id as the round-1 minor; the window is now 2 s, not unbounded.)

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

One composable (`useWorkout`), three thin screens, a one-function clock seam. `commit` is the one place that sets state and the guard.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** FAIL

Audio failures are caught (`sound.test.ts:86-126`: missing API, constructor throws, `resume` rejects, `createOscillator` throws). The display timer stops on rest end and on unmount (`Workout.test.ts:306-316`).

- **[Major]** `guard-window-size-unpinned` — `src/workout/useWorkout.ts:23`, tests `src/components/Workout.test.ts:73-77,332` — decision 1 sets the window at ~400–600 ms. Every guard test moves the clock by `ACTION_GUARD_MS` itself, so the value is never checked. `ACTION_GUARD_MS = 50` → 209 passed; `= 5_000` → 50/50 component tests passed; `= 60_000` → 209 passed. **Fails when:** (a) the constant drops to 50 ms → a real double tap 150 ms apart crosses screens and marks a set the user did not do (the round-1 `double-tap-crosses-screens` defect) with every test green; (b) it grows to seconds → a deliberate "Gotowe" soon after the rest ends by itself is dropped. Fix: one test with literal times, e.g. a second tap 150 ms after a screen change is ignored, and a tap 600 ms after it works (or assert `ACTION_GUARD_MS` is in [400, 600]).

### I5. Is it performant?

**Verdict:** PASS

A 250 ms interval runs only in rest mode (`useWorkout.ts:112-119`). Each beep makes 3 oscillators that stop after 0.15 s.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network, no `v-html`, no new storage key in this phase.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Client-only app with no logging policy. No stray `console.log` in `src/` (none found in the reviewed files).

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` did not change in this phase.

---

## Architecture — the project's own rules

- "Rest time comes from timestamps … never count timer ticks" → meets — `view` is `getView(state, clockMs)` with `clockMs = now()` on each tick/visibility event; mutant M9 (tick counter) fails 2 tests.
- "The end-of-rest sound is made with the Web Audio API (no audio file)" → meets — `sound.ts:44-68`.
- "Every behavioural clause is pinned by a Vitest test" → fails for two clauses — see `guard-window-size-unpinned`, `start-plan-lookup-unpinned`.
- "Touch targets … 64 px for the main action" → fails for the plan card Start — see `plan-card-start-below-64px`. Workout main actions ("Gotowe", "Gotowy, zaczynam", "Wróć do planów") use `btn-large` (64 px, measured for "Gotowe").
- "One chalk primary action per screen" → meets on every workout screen (one `btn-primary` each). On the plan list, each card has a chalk Start; `DESIGN.md` now says so.
- **[Minor]** `plan-list-multiple-chalk-starts` — `src/components/PlanList.vue:18` + `DESIGN.md:233` — with N plans the list shows N chalk buttons. The builder changed `DESIGN.md` to allow it; the approved design was "one chalk primary per screen". Owner to confirm. (Carried from round 1.)
- **[Minor]** `design-md-last-exercise-line-reworded` — `DESIGN.md:245` — the brief asked to "add the missing string". The builder rewrote the existing line, and the old text ("ostatnie ćwiczenie pokazuje „To ostatnia seria"") changed meaning. It now matches the brief; owner to confirm. (Carried from round 1.)
- Polish UI text, dark theme only, no emoji, no gradient, no left stripe, tokens only → meets (read in the diff; the screenshots show the dark "guma" theme).

## Not reviewed

- Whether the beep is audible, and how it sounds in headphones (D10, owner-run). The browser walk proves only that `createOscillator` is called 3 times per rest end.
- A real `visibilitychange` (screen lock, app switch) in the browser. It was checked only in unit tests and a scratch unit probe.

## Observations outside scope

- None.
