# Goal review: feat-cardio-intervals (8268f83..f554013)

Reviewer: goal critic. I read the frozen brief, research.md, the review inputs, the full diff and the full text of every changed file under `src/`. I did not read workbench.md or the earlier reviews.

## Done when

| ID | Verdict | Evidence |
|---|---|---|
| D1 | met | `npx vitest run src/plans/cardioPlan.test.ts src/plans/cardioPlanStore.test.ts` → `Tests 58 passed (58)`. Old shape: `planStore.ts:104-119` (no `type` = strength), test `cardioPlanStore.test.ts:36`. Create/edit/delete: `:81-163`. |
| D2 | met | `npx vitest run CardioPlansFlow/CardioPlanEditor/CardioStored` → `Tests 51 passed (51)`. Walk at 412×915: "Jaki plan?" has Siła/Cardio/Anuluj at 56 px; editor title "Nowy plan cardio", toggle 56 px with `aria-pressed`; tag "Cardio" rgb(169,139,245) on rgb(20,13,43), 24 px (goal-1, goal-2, goal-3). |
| D3 | met | `npx vitest run src/workout/cardioEngine.test.ts` → `Tests 34 passed (34)`. Engine is pure and takes `now` (`cardioEngine.ts:99-193`); tests move the clock only. |
| D4 | met | `npx vitest run cardioSound/useCardio/sound` → `Tests 84 passed (84)`. Exact cue list `useCardio.test.ts:241`, <4 s and =4 s `:264,:282`, 2000/2001 ms late `:323-337`, hidden page `:343-376`. `playRestEnd` test unchanged (`cardioSound.test.ts:195`). |
| D5 | met | Fresh-mount tests: `useCardio.test.ts:613-743`, `CardioSession.test.ts:912-1089` (79 passed). Lock/app switch keeps running `useCardio.test.ts:422`. Walk: reload gave PAUZA at the same interval, key holds no lock field (goal-8). |
| D6 | met | `CardioSession.test.ts` 79 passed. Walk 412×915: page 412×915 with no scroll; field rgb(169,139,245)/rgb(20,13,43); Clock Barlow Condensed 144 px 800 tabular; Phase 48 px; Meta 18 px uppercase; Pauza 64 px on-cardio, Zablokuj/Zakończ 56 px outline; 16 segments (goal-4, goal-5). Small value drift: see `design-value-drift`. |
| D7 | met | Lock tests `CardioSession.test.ts:304-821`. Walk: hold bar 64×380 px; 1.0 s hold and a tap at (206,300) kept the lock; 2.2 s hold gave back Pauza/Zablokuj/Zakończ; reload removed the lock (goal-6, goal-7, goal-8). |
| D8 | met | `npm test` → `Test Files 30 passed (30)`, `Tests 775 passed (775)`. Update policy `CardioSession.test.ts:1124-1166`, wake lock `:1169-1210`, `useCardio.test.ts:834-918`; `src/pwa`+wakeLock+strength files → `Tests 103 passed (103)`. Five strength tests got one added "Siła" tap only (the new "Jaki plan?" step); no assertion removed, no skip. |
| D9 | owner-run | Sounds in a pocket, screen stays on, behaviour after a real phone lock: on the owner's Android phone. |

`npm run build` → exit 0, `✓ built`, `precache 23 entries`.

## Cross-slice findings

**cross-kind-tap-guard-gap** — Major — `src/App.vue:56-62`, `src/workout/useCardio.ts:200`, `src/workout/useWorkout.ts:180`
Each controller has its own `guardUntil`. The end of a cardio session sets only the cardio guard, the end of a strength workout sets only the strength guard. Before this change the one guard also blocked a Start after "Zakończ trening" / "Wróć do planów".
Fails when: the user confirms "Zakończ trening" in cardio (or taps "Wróć do planów") and the second tap of a double tap 150 ms later lands on "Start" of a strength card. A strength workout starts. The same happens from strength to cardio. Probe in a scratch copy: control strength→strength stays blocked; cardio→strength stored `strength`, strength→cardio stored `cardio`. No test pins the cross-kind case. Confidence: high.

**wake-lock-order-coupling** — Minor — `src/workout/useWorkout.ts:79-82`, `src/App.vue:27-31`
`useWorkout` releases the one shared lock whenever it holds no strength workout. Cardio keeps the lock only because App sets up `useWorkout` first. A mutant with the order swapped fails 2 tests, so the rule is pinned, but the lock owner rule lives in a comment.
Fails when: a later change mounts the controllers in another order; a paused cardio session then loses the screen lock after an app switch. Confidence: high.

**duplicated-session-controller** — Minor — `src/workout/useCardio.ts:67-319` vs `src/workout/useWorkout.ts:59-318`; `src/workout/sound.ts:44-68` vs `:91-114`
Tap guard, expiry timer, `visibleSince`, render timer, wake lock sync and the end-confirm flow are copied, not shared. `playTones` copies the `playRestEnd` envelope (kept apart on purpose by the guardrail).
Fails when: a rule changes in one copy only. `cross-kind-tap-guard-gap` is one result of this split. Confidence: high.

**unused-exports-after-slices** — Minor — `src/plans/planStore.ts:154,159,164`; `src/workout/cardioEngine.ts:26`; `src/plans/plan.ts:13,66-67`
`getAnyPlan`, `listPlans` and `getPlan` have no production caller after App moved to `listAllPlans` (tests only). `CardioIntervalKind` copies `IntervalKind`. `type?: 'strength'` is read but the app never writes it. `DEFAULT_REPEAT`/`DEFAULT_INTERVAL_SECONDS` are exported but used only in `plan.ts`.
Fails when: a later caller uses `getPlan(id)` for a cardio id and silently gets `undefined`. Confidence: high.

**design-value-drift** — Minor — `src/components/CardioSession.vue:358-366,346,307`; `src/components/CardioPlanEditor.vue:233-235`; `src/workout/cardioEngine.ts:221-224`
Code and DESIGN.md disagree in small values: track and rest segments use on-cardio at 25% opacity, DESIGN.md:197 says `rgba(0,0,0,.18–.2)`; Clock line-height 0.9 (DESIGN 0.85); Meta line-height 1.3 (DESIGN 1.2); the interval card uses `--ground`, DESIGN.md:302 says the same surface cards; the 3 get-ready beeps (first one at the Start tap) are not in DESIGN.md:337-339. CLAUDE.md asks to tell the user.
Fails when: `/impeccable document` rebuilds DESIGN.md from code, or the owner compares the screen to the approved mock. Confidence: high (facts), the visual effect is small.

**corrupt-copy-failed-then-overwrite** — Minor — `src/workout/workoutStore.ts:237-243`, `src/workout/useCardio.ts:200`
`storedWorkoutKind()` returns null for unreadable data. If the load-time copy failed (live key kept), cardio Start writes over the data that was never copied. Strength Start did the same before this change.
Fails when: storage is almost full, the copy at load fails and the user taps Start. Confidence: medium (inherited path).

**end-screen-not-locked** — Minor — `src/App.vue:116`, `src/components/CardioSession.vue:32`
Lock mode lives in `CardioSession`. When the session ends, the end screen and then the plan list take every touch. DESIGN.md:342 shows the end screen, so this is a question for the owner, not a code error.
Fails when: the session ends with the phone in a pocket; pocket touches hit "Wróć do planów", then "Start" (or "Usuń plan" and, after 0.5 s, the confirm). Confidence: low.

**naming-type-vs-kind** — Nit — `src/plans/plan.ts:13,35`, `src/workout/cardioEngine.ts:30`, `src/workout/workoutStore.ts:237`
Plans use `type` ('strength'|'cardio'); the stored workout uses `kind: 'cardio'`; `storedWorkoutKind()` returns 'strength'|'cardio'; intervals use `kind` ('work'|'rest'); App `View` also uses `kind`. `intervalRemainingMs` vs strength `restRemaining`.
Fails when: a reader mixes up plan type and interval kind in a later change. Confidence: high.

**stale-interim-test** — Nit — `src/components/CardioStored.test.ts:46,59`, `src/components/CardioPlansFlow.test.ts:279`
The describe still says "before the cardio screens exist" and titles carry "(phase 5)". `CardioStored.test.ts:59` repeats `CardioPlansFlow.test.ts:279`.
Fails when: a reader trusts the title and thinks the cardio screens are missing. Confidence: high.

**editor-save-date-now** — Nit — `src/components/CardioPlanEditor.vue:88`, `src/plans/planStore.ts:224`
`savePlan(plan)` takes the `Date.now()` default for the corrupt-copy timestamp, not `now()` from `src/lib/clock.ts`. The strength editor does the same.
Fails when: a test fakes `clock.now` and expects the corrupt key name from it. Confidence: high, effect small.

**confirm-over-end-screen** — Nit — `src/App.vue:116,124`
If the session reaches its end while "Zakończyć trening?" is open, the question stays over the end screen. Both answers still work.
Fails when: the user opens Zakończ in the last seconds. Confidence: medium; no data loss.

## Guardrails checked with no finding
Storage keys and old-shape reads (plans and strength workout), corrupt copy on load for both keys, time from timestamps (no tick counting; hold bar uses `now()`), lock only in memory, update policy blocks during any cardio view, no new dependency, no strength screen or text change, violet only on the cardio field and tag, no out-of-scope feature (no GPS, history, vibration, voice, strength lock).
