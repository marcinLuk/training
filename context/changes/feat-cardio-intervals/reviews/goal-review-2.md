# Goal review 2: feat-cardio-intervals (f554013..1599551)

Reviewer: goal critic, second pass. I read the frozen brief, the first goal review, the review inputs, the new diff (`src/App.vue`, `src/components/CrossKindStartGuard.test.ts`) and the full current `src/App.vue`, `src/workout/useWorkout.ts` and `src/workout/useCardio.ts`. I did not read workbench.md, the phase reports or the Progress / Slice details of brief.md. No browser walk: the fix changes only the `<script>` of `App.vue`; the template and every screen file are the same as at the first walk.

## Done when

| ID | Verdict | Evidence |
|---|---|---|
| D1 | met | `npx vitest run src/plans/cardioPlan.test.ts src/plans/cardioPlanStore.test.ts` → `Tests 58 passed (58)`. No plan code changed since the first review. |
| D2 | met | `npx vitest run CardioPlansFlow/CardioPlanEditor/CardioStored` → `Tests 51 passed (51)`. The first walk (goal-1..3) still holds: no template or style change since f554013. |
| D3 | met | `npx vitest run src/workout/cardioEngine.test.ts` → `Tests 34 passed (34)`; clock-only tests. |
| D4 | met | `npx vitest run src/workout/cardioSound.test.ts src/workout/useCardio.test.ts` → `Tests 79 passed (79)`. |
| D5 | met | Fresh-mount tests in `useCardio.test.ts` and `CardioSession.test.ts` pass (79 + 79). My probe L1–L3 (fresh mount after an expiry at load) and P5 (session found after its end) pass on HEAD. |
| D6 | met | `npx vitest run src/components/CardioSession.test.ts` → `Tests 79 passed (79)`; first walk at 412×915 (goal-4, goal-5) still holds. `design-value-drift` stays open (Minor). |
| D7 | met | Lock tests in `CardioSession.test.ts` pass; first walk (goal-6..8) still holds. |
| D8 | met | `npm test` → `Test Files 31 passed (31)`, `Tests 788 passed (788)` (775 + 13 new). `src/pwa` + `wakeLock` + `CrossKindStartGuard` → `Tests 41 passed (41)`. Strength-only flows keep their own guard; the shared guard adds no new refusal for strength→strength. No skip, no removed `expect(`, no `@ts-*`/`as any` in `git diff 8268f83..HEAD`. |
| D9 | owner-run | Sounds in a pocket, screen stays on, behaviour after a real phone lock: on the owner's Android phone. |

`npm run build` → exit 0, `✓ built in 259ms`, `precache 23 entries (342.06 KiB)`.

## Closure: cross-kind-tap-guard-gap — closed

The fix: one `workoutEndedGuardUntil` in `App.vue:62`, set by a sync watcher when `workoutOpen` goes from true to false (`App.vue:67-73`), checked first in `startPlan` (`App.vue:76`). Every exit in both controllers goes through `commit(null)`, so the watcher sees every route.

Proof by execution (scratch copies `g2ctl` = HEAD copy, `g2mut` = HEAD with `App.vue:76` removed; probe file `Goal2Probe.test.ts` in the scratch dir only):
- Control: shipped `CrossKindStartGuard.test.ts` 13/13 and my probe 10/10 pass (`Tests 23 passed (23)`).
- Mutant (guard removed): `Tests 14 failed | 9 passed (23)`. All 10 cross-kind shipped tests fail, and 4 probe routes the shipped test does not cover fail too: P1 strength expiry on return to the page (visibilitychange), P2 paused-cardio expiry on return to the page, P3 paused-cardio expiry by its own timer, P5 cardio end screen found at load → "Wróć do planów". So every route from an open workout of either kind to the plan list is guarded on HEAD.
- Legitimate starts are not blocked on HEAD: L1/L2 strength expired at load → cardio and strength start at once; L3 paused cardio expired at load → strength starts at once; L4 "Edytuj" → "Anuluj" → start at once; L5 remount 0 ms after an end → start at once (the guard is in memory only). Right after the app opens: shipped test `a start with no workout ended before` passes.

## Findings

**start-guard-clock-step-back** — Minor — `src/App.vue:70,76`
The guard is `now() < workoutEndedGuardUntil` with no upper bound. A clock that moves back keeps the window open for the size of the step. The strength and cardio controllers had this already for their own kind (`useWorkout.ts:138`, `useCardio.ts:158`); the shared guard now adds it for the other kind too.
Fails when: the user ends a workout, the phone clock moves back 60 s (manual change or a network time fix) 10 s later, and the user taps Start of the other kind. Probe L6 with a native click: HEAD refuses the start for about 50 s, the mutant starts it. Each Start tap does nothing until the clock passes the old window or the app reloads. Confidence: high (mechanism), low (how often).
Note: in jsdom, Vue Test Utils sets `_vts` on its events, so after a clock step back Vue drops a `trigger('click')` before any handler runs. A test that steps the clock back must dispatch a native `MouseEvent`, or it passes for the wrong reason.

**noop-show-list-after-end** — Nit — `src/App.vue:117-120`
`showListAfterEnd()` only calls `showList()`. The guard arms in the watcher, not here, so the name suggests a step that does not exist.
Fails when: a reader adds an end-only step to `showList()` or moves the arming here and arms it twice. Confidence: high.

No other new cross-slice defect. The guard blocks only Start; "Edytuj", "Usuń plan" and "Nowy plan" were not guarded before this change either, and none of them loses data on one tap.

## First-review Minors and Nits (still present / gone)

- wake-lock-order-coupling — still present (`App.vue:28-32`, `useWorkout.ts:79-82`).
- duplicated-session-controller — still present; the fix adds a third guard layer in `App.vue` on top of the two copies.
- unused-exports-after-slices — still present (`planStore.ts:154,159,164` have no production caller).
- design-value-drift — still present (`CardioSession.vue:307,346`; no style change).
- corrupt-copy-failed-then-overwrite — still present (`useCardio.ts:200`).
- end-screen-not-locked — still present; the shared guard now blocks a pocket "Start" only in the first 500 ms after "Wróć do planów".
- naming-type-vs-kind — still present.
- stale-interim-test — still present (`CardioStored.test.ts:46,59`, `CardioPlansFlow.test.ts:279`).
- editor-save-date-now — still present (`CardioPlanEditor.vue:88`).
- confirm-over-end-screen — still present (`App.vue:149`).

## Guardrails checked with no finding
`ACTION_GUARD_MS` reused, not changed; time from `now()` in `src/lib/clock.ts`; no new dependency; no storage key or stored-shape change; no strength screen or text change; no out-of-scope feature; no weakened or deleted test.
