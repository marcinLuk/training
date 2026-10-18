# Phase review — feat-mvp-plans-workout-loop · Phase 6: Resume, expiry, Wake Lock and early end · round 1

- **Scope:** `git diff HEAD` plus untracked files: `src/workout/{workoutStore,wakeLock,useWorkout}.ts` and their tests, `src/components/{EndWorkoutConfirm,WorkoutSet,WorkoutRest,PlanList}.vue`, `src/components/{Resume,Workout}.test.ts`, `src/App.vue`, `src/styles/base.css`, `DESIGN.md`, `brief.md` (Progress only). Read with them: `src/workout/engine.ts`, `src/lib/storage.ts`, `src/lib/clock.ts`.
- **Files reviewed:** 16 (`+1533/-28` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 6` rows 6.1–6.8, `## Slice details` Phase 6, Done-when D4 and D8
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 6.1 | workout tests: save on every change, fresh read mid-set and mid-rest, 2 h expiry, unreadable data, Wake Lock | `timeout 300 npx vitest run src/workout` | pass — `Test Files 5 passed (5)`, `Tests 137 passed (137)` |
| 6.2 | component tests: app over a stored workout, expiry notice, "Zakończ trening" confirm and cancel | `timeout 300 npx vitest run src/components` | pass — `Test Files 6 passed (6)`, `Tests 78 passed (78)` |
| 6.3 | full suite | `timeout 300 npm test` | pass — `Test Files 16 passed (16)`, `Tests 314 passed (314)`, exit 0 |
| 6.4 | build | `timeout 300 npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 218ms`, exit 0 |

Skipped or todo tests: 0 (`grep` for `.skip`, `.only`, `.todo` in `src/` found nothing). No `@ts-ignore`, `as any` or `as unknown as` in `src/`. No change to `tsconfig*.json` or `package.json`.

#### Round-trip fuzz (scratch copy, not in the repo)

400 random plans (1–4 exercises, sets 1–20, reps 1–100, rest 0–600 s in 15 s steps, Polish names), 120 random engine actions each (`completeSet`, `skipSet`, `endRestEarly`, `undo`, `adjustRest ±15 s`, `resolveRest`). After every action: `saveWorkout` → `loadWorkout` and `parseWorkoutState(JSON round trip)`. Result: 48 000 states, all three modes reached, every state loaded back `toEqual` the original. The loader rejects no state that the engine can make.

#### Wrong-implementation table (scratch mutant copy, `vitest run src/workout src/components`)

| Mutant | Result |
| :-- | :-- |
| W1 remove the live key even when the corrupt copy failed | killed (1: "keeps the live key when the copy cannot be written") |
| W2 no corrupt copy | killed (26) |
| W3 drop the `rest` ⇔ rest-mode check | killed (2) |
| W4 drop the finished ⇔ cursor-at-end check | killed (2) |
| W6 accept any version | killed (2) |
| W7 keep the live key after the copy (copy on every load) | killed (1) |
| U1 `commit` does not save | killed (22) |
| U3 restore without `resolveRest` | killed (2) |
| U4 notice also for an old finished workout | killed (1) |
| U5 / U5b no expiry check at restore / expired key kept | killed (6 / 4) |
| **U6 no tap guard after a restore (`guardUntil = 0`)** | **survived — 215 passed** |
| U7 no expiry check in `refresh` | killed (2) |
| U8 no `syncWakeLock` on visible | killed (1) |
| U9 lock held on the end screen | killed (2) |
| **U10 `askEnd` allowed on a finished workout** | **survived — 215 passed** |
| U11 `askEnd` sets no guard | killed (2) |
| U12 `confirmEnd` with the step closed | killed (1) |
| U13 `commit(null)` keeps the confirm open | killed (1) |
| U14 `start` has no guard | killed (1) |
| U15 no Wake Lock at restore | killed (1) |
| U16 no release at unmount | killed (2) |
| U17 restore counted as activity (`lastActivityAt = now`, saved) | killed (1) |
| U18 restore saves the resolved state | killed (1) |
| U19 expiry also on the end screen in `refresh` | killed (1) |
| U20 expiry in `refresh` without the notice | killed (2) |
| U21 `cancelEnd` does nothing | killed (2) |
| U22 `start` keeps the notice | killed (2) |
| K1 no held-sentinel guard (double lock) | killed (2) |
| K2 browser release does not clear the sentinel | killed (2) |
| K3 late sentinel kept after release | killed (1) |
| K4 `releaseWakeLock` does not release | killed (4) |
| K6 no in-flight guard | killed (1) |
| E1 `isExpired` with `>=` | killed (4) |
| E2 expiry from `startedAt` | killed (1) |
| E3 rest end counted as activity | killed (2) |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p6-r1`, 412×915, `vite preview` on port 4199)

Test plan built in the editor: "Wiosłowanie i przysiady", "Wiosłowanie" 3×10 and "Przysiady" 3×10, both with 60 s rest. A fake `navigator.wakeLock` (init script, log in `sessionStorage`) records the calls.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 6.5 | reload in the middle of a set: the same exercise and sets left show in under 3 s (D4) | passed | `reviews/screenshots/p6-r1-6.5-after-reload-mid-set.png`. Before: set 2 of "Wiosłowanie", sets left `"2"`. `page.reload()` → `[data-testid=sets-left]` visible: `{"ms":26,"h1":"Wiosłowanie","left":"2","domContentLoadedMs":16}`. Snapshot: `heading "Wiosłowanie" [level=1]`, `paragraph: "2"`, `"Dalej: Przysiady"`. Wake Lock log after the reload: `request:screen@15` (requested again at restore). |
| 6.6 | reload in the middle of a rest: the rest view continues with the remaining time, not a restarted one (D4) | passed | `p6-r1-6.6-before-reload-mid-rest.png`, `p6-r1-6.6-after-reload-mid-rest.png`. Stored `"rest":{"startedAt":1792344199101,"durationMs":60000}`; timer `0:46` before. Reload at `now=1792344222054` (22.95 s into the rest): `{"ms":29,"h1":"Przerwa","time":"0:38"}` (expected ceil(37.05 s) = 0:38, not 1:00); 3 s later `0:34`. Snapshot: `timer "Pozostały czas przerwy": 0:37`, `"Dalej: Wiosłowanie, seria 3 z 3"`. |
| 6.7 | a stored workout whose last tap is more than 2 h old shows the expiry notice and the plan list after a reload (D4) | passed | `p6-r1-6.7-expired-notice.png`. Stored `lastActivityAt` moved back to 7 261 857 ms (> 2 h). After reload: `heading "Plany"`, `status: Trening wygasł po 2 godzinach bez dotknięcia.`, plan card present. `localstorage-list` holds only `trening.plans.v1`. Wake Lock log empty (no request for the expired workout). A second reload shows no notice. |
| 6.8 | "Zakończ trening" → confirm → plan list; "Zakończ trening" → cancel → the workout stays (D8) | passed | `p6-r1-6.8-confirm-open.png`, `p6-r1-6.8-after-cancel.png`, `p6-r1-6.8-after-confirm.png`. Top button: `btn btn-danger`, top 24 px, height 56 px, color `rgb(255, 107, 107)`; "Gotowe" at top 803 px, 64 px. Dialog: `alertdialog "Zakończyć trening?"` covering 412×915 with buttons `"Wróć do treningu"` (`btn btn-block`, 56 px) and `"Zakończ trening"` (`btn btn-danger btn-block`, 56 px), no chalk button in the dialog. Cancel → `heading "Przerwa"`, timer still counting (`0:03`), stored `"cursor":2,"mode":"rest"`. Confirm → `heading "Plany"`, `trening.workout.v1` gone, Wake Lock log `release@52073`, `active=0`. No native dialog appeared. |

Extra browser checks (not rows): hide → browser release → visible gave `browser-release@15728`, `request:screen@15929`; a second visible event while the lock was held made no new request (`active=1`). A damaged stored workout `{"version":1,"planId":` gave the plan list and one `trening.workout.corrupt.1792344309487`; the next reload added no second copy. The set view and the rest view fit 915 px with no scroll (`scrollHeight 915`); the counter is 176 px, the biggest element.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | FAIL |
| I2 | Is it logically correct? | FAIL |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 3 · Minor: 1 · Nit: 0

Findings going back to a builder: `idle-expiry-never-fires-while-visible`, `restore-tap-guard-unpinned`, `askend-end-screen-test-misnamed`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`workoutStore.ts`, `wakeLock.ts` and the new `useWorkout` functions have docblocks that say what they guarantee (copy once, never throws, at most one sentinel, restore is not a user action). `DESIGN.md` "Wznowienie treningu" got the notice text and the "Zakończ trening" placement and confirm wording, as the guardrail asks.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | none in this project |
| TS docblocks | yes | yes | store, Wake Lock, restore |
| DESIGN.md | yes | yes | 2 lines in "Wznowienie treningu" |
| Translations | n/a | — | Polish literals by design |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

No significant typos. The Polish strings ("Trening wygasł po 2 godzinach bez dotknięcia.", "Zakończyć trening?", "Wróć do treningu") match DESIGN.md word for word.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** FAIL

| Requirement (Phase 6 slice details / D4 / D8) | Implemented in | Status |
| :-- | :-- | :-- |
| key `trening.workout.v1`, save after every state change | `useWorkout.ts:76-86`, `workoutStore.ts:143-145` | met |
| load validates shape and version | `workoutStore.ts:97-137` | met (fuzz: 48 000 engine states load back) |
| unreadable data → `trening.workout.corrupt.<ts>`, no workout, plans untouched | `workoutStore.ts:157-170` | met |
| stored, not expired workout opens at once in its saved state; ended rest → set view | `useWorkout.ts:37-45, 53-54` | met (browser: 26 ms, 29 ms) |
| expired workout removed, Polish notice on the plan list | `useWorkout.ts:40-43`, `PlanList.vue:12` | met |
| recompute at once on `visibilitychange` to visible | `useWorkout.ts:199-207` | met |
| a workout with no tap for more than 2 h expires (D4) | `useWorkout.ts:104-108` (only in `refresh`) | partial — see `idle-expiry-never-fires-while-visible` |
| Wake Lock at start and resume, again on visible, release at end and early end, feature-checked | `wakeLock.ts`, `useWorkout.ts:71-74, 85, 203, 209, 212` | met |
| "Zakończ trening" danger, far from "Gotowe", in-app confirm, confirm removes, cancel keeps | `WorkoutSet.vue:19-21`, `WorkoutRest.vue:28-30`, `EndWorkoutConfirm.vue`, `useWorkout.ts:163-178` | met |
| every behavioural clause pinned by a test | tests | partial — see `restore-tap-guard-unpinned`, `askend-end-screen-test-misnamed` |

- **[Major]** `idle-expiry-never-fires-while-visible` — `src/workout/useWorkout.ts:99-117, 140-146` — The 2 h idle expiry runs only inside `refresh()`, and `refresh()` runs only on the rest display tick (`setInterval` only while `mode === 'rest'`, line 190-197) and on `visibilitychange`. In set mode no timer runs. This phase holds a screen Wake Lock for the whole workout, so on the phone the page stays visible and never fires `visibilitychange`. Result: a workout left open on the set view never expires, the Wake Lock is never released, and the screen stays on until the battery is empty. A tap on "Gotowe" after 3 h continues the old workout: `finishSet` (line 140-146) does not check `isExpired`. This breaks D4 ("a workout with no tap for more than 2 hours expires, shows a short notice and opens the plan list") on the visible path. **Fails when:** start a workout, leave the phone on the set view for 3 h. Reproduced in a scratch probe: mount `useWorkout`, `start(plan)`, `vi.advanceTimersByTime(3 h)` (runs all timers and moves the clock) → `view.mode === 'set'`, `expired === false`, sentinel `release` not called; then `finishSet()` → `mode === 'rest'`, stored `cursor === 1`. **Fix direction:** while a workout runs and is not finished, schedule one `setTimeout` at `lastActivityAt + IDLE_EXPIRY_MS + 1 - now()` (re-armed on every commit, cleared on unmount) that calls `refresh()`; also check `isExpired` at the start of the tap handlers (`finishSet`, `endRest`) so a late tap expires the workout instead of continuing it. Pin both with tests that move the clock past 2 h with the page visible and no `visibilitychange`.

### I2. Is it logically correct?

**Verdict:** FAIL

No defect in the store, the restore, the Wake Lock or the confirm logic (fuzz and 33 killed mutants above). The commit path keeps the earlier rules: `commit` still sets `guardUntil` on every change, and the sound rule in `refresh` is unchanged; the test "shows the set view, silently, for a rest that ended while away" and the browser walk confirm a rest that ended while away comes back silent. The gaps are in the tests:

- **[Major]** `restore-tap-guard-unpinned` — `src/workout/useWorkout.ts:65-66` — The code says "The restored screen is a screen change too: a tap in the first moments is not deliberate." and sets `guardUntil = now() + ACTION_GUARD_MS` after a restore. No test pins it: the mutant `let guardUntil = 0` passes all 215 tests in `src/workout` and `src/components`. **Fails when:** someone removes the line; a double tap on "Gotowe" that lands right after a reload then marks a set the user did not do, and the suite stays green. **Fix:** add a test (in `useWorkout.test.ts` or `Resume.test.ts`) that restores a stored mid-set workout, calls `finishSet` / taps "Gotowe" with no clock move and expects the same set and sets left, then moves the clock by `ACTION_GUARD_MS` and expects the tap to count.
- **[Major]** `askend-end-screen-test-misnamed` — `src/workout/useWorkout.test.ts:514-518` — The test is named "does not open the confirm step on the end screen or with no workout", but it only calls `askEnd()` with no workout. The end-screen clause of `askEnd` (`useWorkout.ts:164`, `state.value.mode === 'finished'`) is not exercised: the mutant `if (state.value === null) return` passes all 215 tests. **Fails when:** the finished check is removed; `askEnd()` then opens the confirm step over the end screen (today only the missing button on the end screen prevents it), and no test notices. **Fix:** drive a workout to `finished` in that test, call `askEnd()` (after the guard) and expect `confirmingEnd` to stay `false`; keep the no-workout case as its own assertion.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

The store reuses `src/lib/storage.ts`. `parseWorkoutState` is long but each check maps to one engine guarantee. `EndWorkoutConfirm.vue` is 13 lines.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

Storage read, write and remove never throw (tests with `getItem`/`setItem` throwing). A failed corrupt copy keeps the live key (W1 killed). The corrupt copy is written once per unreadable value (W7 killed; browser: one `trening.workout.corrupt.*` after two reloads). Wake Lock: missing API, a request that throws, a rejected request and a rejected release are all handled; a sentinel that arrives after a release is released (K3 killed); no double lock (K1, K6 killed; browser: second visible event made no request).

- **[Minor]** `confirm-dialog-focus` — `src/components/EndWorkoutConfirm.vue:6`, `src/App.vue:66` — The confirm step has `role="alertdialog"` and `aria-modal="true"`, but focus stays on the covered "Zakończ trening" button (browser: `document.activeElement` = "Zakończ trening" under the overlay), and the workout buttons under the overlay stay in the tab order. A keyboard or TalkBack user can reach "Gotowy, zaczynam" behind the dialog. Move focus to "Wróć do treningu" when the step opens and back to the top button on cancel.

### I5. Is it performant?

**Verdict:** PASS

One `JSON.stringify` and one `localStorage.setItem` per user action, on a state of at most a few hundred sets. Restore measured at 26–29 ms to the restored screen on `vite preview`.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network call, no `innerHTML`, no new data leaves the device. Stored data is validated before use.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Client-only app with no logging by design; no leftover `console.log`.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` and `package-lock.json` unchanged.

---

## Architecture — the project's own rules

- "No server for user data" → meets — no fetch or API call added.
- "A workout survives interruptions (FR-009)" → meets — save on every commit; reload mid-set and mid-rest verified in tests and in the browser.
- "Rest time comes from timestamps" → meets — restore uses `resolveRest`/`getView` with `now()`; browser: 0:38 after 22.95 s of a 60 s rest.
- "The screen stays on during a workout (FR-012)" → meets for request/re-request/release; see `idle-expiry-never-fires-while-visible` for the lock that is never released on an idle visible page.
- "A stored shape is versioned; reading never throws on missing, corrupt or old data, and never silently overwrites data it could not read" → meets — version checked, copy before remove, live key kept when the copy fails.
- "Every behavioural clause is pinned by a Vitest test" → fails for two clauses — `restore-tap-guard-unpinned`, `askend-end-screen-test-misnamed`.
- DESIGN.md key rules → meets — one chalk primary on the set and rest views (`.btn-primary` count 1 in the rest view test and in the browser), none in the confirm; "Zakończ trening" danger, 56 px; counter 176 px is the biggest element; Polish text; no emoji, gradient or left stripe; dark only.
- No `window.confirm` → meets — spy not called in the test; no native dialog in the browser walk.
- `Workout.test.ts` re-routed test "starts the right plan again after the user comes back to the list" → no assertion weakened: it keeps `h1 === 'Podciąganie'` and `setsLeft === '3'` and adds the early-end path and `h1 === 'Plany'`.

## Not reviewed

- Real Wake Lock on the phone, a real screen lock and an app switch (D10, owner-run). The browser walk proves only the calls through a fake `navigator.wakeLock`.
- Audibility of the end-of-rest sound (owner-run). Silence of a rest that ended while away is proven by the unit test, not by audio.

## Observations outside scope

- `brief.md` diff also appends `— ea79ecb` to the Phase 5 rows; this looks like the orchestrator's commit stamp, not the builder's edit. The builder's own change is the four Phase 6 checkboxes 6.1–6.4.
- `DESIGN.md` now places "Zakończ trening" at the top of the set and rest views. The Thumb Rule says workout actions sit in the lower half; the new line treats the early end as an exception ("daleko od akcji głównej"). This follows the brief ("far from Gotowe") and the guardrail (one line added and reported), but the owner should confirm the placement.
- Opening and cancelling the confirm step does not update `lastActivityAt`, so these taps do not delay the expiry. This has almost no practical effect.
