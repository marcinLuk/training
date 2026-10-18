# Goal review: feat-mvp-plans-workout-loop (base 9853694..HEAD 7683288)

Verdict: **CONCERNS**. All of D1–D9 are met. No Blocker and no Major. I found 7 Minor/Nit items.

## 1. Done when

Commands I ran again: `timeout 300 npm test` gave `Test Files 18 passed (18)`, `Tests 377 passed (377)`, exit 0.
`timeout 300 npm run build` gave `vue-tsc -b && vite build`, `✓ built in 223ms`, exit 0.
No `.skip`, `.only` or `.todo` in `src/**/*.test.ts` (grep).

| # | Result | Evidence |
|---|---|---|
| D1 | met | `package.json:10-11` `"test": "vitest run"`, `"test:watch": "vitest"`. I did not start watch mode (loop rule). `tsconfig.json:5` references `tsconfig.test.json`. Mutant copy: a type error added to `src/harness.test.ts` made `vue-tsc -p tsconfig.test.json` fail (`TS2322`, exit 2). The runner and commands are in `CLAUDE.md` (Stack, Commands) and in `tech-stack.md` "## Test stack". |
| D2 | met | `PlanEditor.test.ts:21` "starts with one exercise row holding the defaults 3 / 10 / 1:30"; `App.test.ts:25` "...also after a fresh mount (reload)"; `planStore.test.ts:100`. Walk: the editor showed 3 / 10 / 1:30, and after a reload the list showed "Góra ciała – środa, 2 ćwiczenia, 4 serie" (goal-r1-02, -03). |
| D3 | met | `Workout.test.ts:175`, `:213`, `:230` "after a big clock jump with no timer tick", `:237` "plays the sound once", `:468` end screen and "Wróć do planów". Walk: set view, rest 0:15, 3 oscillators at the rest end, end screen, list (goal-r1-04, -05, -07, -11, -12). |
| D4 | met | `Resume.test.ts:89`, `:103` mid-rest from timestamps, `:172` expiry notice; `useWorkout.test.ts:170`, `:265`; Wake Lock `useWorkout.test.ts:477`, `:486`, `:515`. Walk: before the reload the timer showed 0:17. After it showed 0:16, 717 ms after navigation start. Stored `lastActivityAt` minus 2 h 5 s, then a reload, showed `status: Trening wygasł po 2 godzinach bez dotknięcia.` (goal-r1-06, -14). The instrumented `navigator.wakeLock` logged `wl-request:screen` at Start and after the reload, and `wl-release` on the end screen. |
| D5 | met | `UndoSkipAdjust.test.ts:137`, `:149`, `:168`, `:195`. Walk: "Pomiń serię" moved to "Ściąganie drążka", 2 left. "Cofnij" went back to "Wiosłowanie", 1 left (goal-r1-08, -09). |
| D6 | met | `UndoSkipAdjust.test.ts:220`, `:227`, `:233`, `:304` "keeps the rest time changed by +15 s and −15 s" (after a reload). Walk: "+15 s" stored `durationMs: 26584`, and the reload restored the time. |
| D7 | met | `EditDelete.test.ts:116` same id after a reload, `:72` confirm step in the app, `:181`, `:247`, `:260` (the workout copy stays the same after an edit or a delete). Walk: the edit kept the id `5fbf8031…` and gave "5 serii". The delete asked `Usunąć plan „Góra ciała – piątek"?`. After the reload `plans: []`. No native dialog. |
| D8 | met | `Resume.test.ts:252`, `:264`, `:276`, `:310`. Walk: an alertdialog "Zakończyć trening?". "Wróć do treningu" kept "Wiosłowanie". Confirm opened "Plany" and removed `trening.workout.v1`. |
| D9 | met | `planStore.test.ts:224` "calls navigator.storage.persist() at the first save only", `:235`, `:243`, `:282`. Walk: the log showed `persist` once, at the first save. |
| D10 | owner-run | Not judged. Sound with headphones, screen stays on, real lock and app switch on the phone. Note: in Playwright Chromium a new AudioContext after a reload was `running` with no new tap (`userActivation.hasBeenActive=true`). The owner must confirm a beep after a tab reload on the phone. |

## 2. Cross-slice findings

- **g-plan-list-many-chalk** (Minor, uncertain: needs an owner decision). When the list has 2 or more plans, it shows one chalk `Start` per card (`PlanList.vue:36-43`). That gives N chalk buttons on one screen. "The Chalk Rule" (`DESIGN.md:170`, `:222`) and CLAUDE.md say "one chalk primary per screen". But `DESIGN.md:200` and `:232` already gave each card its own Start. This change added `DESIGN.md:234`, which makes N chalk Starts the rule. DESIGN.md contradicts itself, so the owner must pick one rule.
- **g-claude-md-layout-stale** (Minor). The CLAUDE.md "Code layout" line names `src/plans/`, `src/components/` and `src/styles/` only. It does not name `src/workout/` (engine, store, composable, sound, Wake Lock) or `src/lib/` (clock, storage), which hold most of the workout logic. It also does not name the storage keys `trening.plans.v1` and `trening.workout.v1`, or the `*.corrupt.<ts>` copies.
- **g-two-confirm-guards** (Minor). Two slices built the same "in-app confirm with a 0.5 s guard" in two different ways. `PlanDeleteConfirm.vue:10-14` has its own `openedAt` check. `EndWorkoutConfirm.vue` has no guard and relies on `useWorkout.confirmEnd` (`useWorkout.ts:252`). The two markups are near copies. `PlanDeleteConfirm.vue:3` also imports `ACTION_GUARD_MS` from the workout composable, so a plan-list component depends on the workout module.
- **g-randomuuid-secure-context** (Minor, uncertain). `plan.ts:33,37` call `crypto.randomUUID()`. This API exists only in a secure context. Before F-01 (HTTPS), the owner may open the dev server on the phone over `http://<LAN IP>`. Then `PlanEditor` setup throws and "Nowy plan" opens a blank screen. Wake Lock also needs a secure context, but it fails softly. The owner must use `localhost` (adb reverse) or HTTPS for D10.
- **g-duplicate-helpers** (Nit). `isRecord` is in both `planStore.ts:27` and `workoutStore.ts:20`. Both stores have a private `toExercise` with a different shape. The 1000-set limit is in two places: `MAX_ABS_SET_COUNT` (`engine.ts:87`) and `MAX_SETS_PER_EXERCISE` (`workoutStore.ts:16`).
- **g-dead-exports-tokens** (Nit). Only tests use `getPlan` (`planStore.ts:94`). `newExerciseId` and `newPlanId` (`plan.ts:32,36`) are exported but only `plan.ts` uses them. No code uses the tokens `--steel`, `--space-4xl`, `--radius-sm`, `--radius-pill` and `--target-min` (`tokens.css`). They are DESIGN.md tokens, so it is acceptable to keep them.
- **g-naming-workoutset** (Nit). `WorkoutSet` is a type in `engine.ts:26` and also the component `WorkoutSet.vue`. Rest formatting is in `plans/format.ts`, but the plan summary and Polish plurals are in `plans/plan.ts`.

The guardrails stay true across all slices:
- Polish UI text, dark theme only, DESIGN.md colors only, local fonts.
- Every request in the walk went to `localhost:4199` (76 requests, 0 to other hosts). The console had 0 errors.
- Rest time comes from timestamps (`engine.ts:125-127`).
- Unreadable data is copied before a write (`planStore.ts:121-125`, `workoutStore.ts:168`).
- There is no manifest, service worker or new dependency outside the brief.
- On the set and rest screens, "Gotowe" and "Gotowy, zaczynam" are the only chalk buttons.

## 3. Browser walk (playwright-cli, session goal-r1, 412×915, `vite preview` on 4199)

1. Empty list, then "Nowy plan". I typed "Góra ciała – środa" with "Wiosłowanie" and "Ściąganie drążka", 2 sets each, rest set to 0:15 with "Skróć przerwę o 15 s" ×5. I saved and reloaded. The plan was still in the list (01–03).
2. Start, then "Gotowe". Rest 0:15. "+15 s" gave 0:26. A reload mid-rest showed 0:16, the same as the stored time. The rest ended on its own: 3 beeps, then the set view with "1 serii zostało" (04–07).
3. "Pomiń serię" opened the next exercise with "To ostatnie ćwiczenie". "Cofnij" returned to "Wiosłowanie", 1 left (08–09).
4. I ran the rest of the sets with "Gotowy, zaczynam". The last set said "To ostatnia seria". The end screen showed "Góra ciała – środa / Koniec treningu". "Wróć do planów" opened the list. The workout key was gone (10–12).
5. Extra checks: "Zakończ trening" with its confirm step (13). The 2 h expiry notice (14).
6. "Edytuj": the title was "Edytuj plan". I renamed the plan to "Góra ciała – piątek", gave exercise 2 three sets and saved. Same id, "5 serii" (15).
7. "Usuń plan", then confirm. The list was empty, also after a reload (16–17).

Screenshots: `reviews/screenshots/goal-r1-01…17-*.png`. I closed the session and stopped the server (port 4199 free).
