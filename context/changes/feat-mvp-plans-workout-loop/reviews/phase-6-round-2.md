# Phase review — feat-mvp-plans-workout-loop · Phase 6: Resume, expiry, Wake Lock and early end · round 2

- **Scope:** `git diff HEAD` plus untracked files: `src/workout/{workoutStore,wakeLock,useWorkout}.ts` and their tests, `src/components/{EndWorkoutConfirm,WorkoutSet,WorkoutRest,PlanList}.vue`, `src/components/{Resume,Workout}.test.ts`, `src/App.vue`, `src/styles/base.css`, `DESIGN.md`, `brief.md` (Progress only). Emphasis on the round-2 change in `src/workout/useWorkout.ts` (idle-expiry timeout, expiry check on taps) and the new tests. Read with them: `src/workout/engine.ts`, `src/lib/clock.ts`.
- **Files reviewed:** 16 (`+1659/-33` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 6` rows 6.1–6.8, `## Slice details` Phase 6, Done-when D4 and D8, plus the round-2 binding decision: "every workout action checks isExpired(state, now()) first and an expired workout ends via the expiry path without marking a set; while a workout runs, one timeout armed for just after lastActivityAt + 2 h triggers the same check".
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 6.1 | workout tests: save on every change, fresh read mid-set and mid-rest, 2 h expiry, unreadable data, Wake Lock | `timeout 300 npx vitest run src/workout` | pass — `Test Files 5 passed (5)`, `Tests 143 passed (143)`, exit 0 |
| 6.2 | component tests: app over a stored workout, expiry notice, "Zakończ trening" confirm and cancel | `timeout 300 npx vitest run src/components` | pass — `Test Files 6 passed (6)`, `Tests 78 passed (78)`, exit 0 |
| 6.3 | full suite | `timeout 300 npm test` | pass — `Test Files 16 passed (16)`, `Tests 320 passed (320)`, exit 0 |
| 6.4 | build | `timeout 300 npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 212ms`, exit 0 |

Skipped or todo tests: 0 (`grep` for `.skip`, `.only`, `.todo`, `@ts-ignore`, `@ts-expect-error`, `as any`, `as unknown as` in `src/` found nothing). No change to `tsconfig*.json`, `package.json` or `package-lock.json`.

`Workout.test.ts` timer counts (`1→2`, `0→1`, `1→2`, unmount `0`): not weakened. The extra timer is the expiry timeout. Mutant "display interval never stopped" still fails the test (2 failures), and mutant "expiry timeout not cleared at unmount" fails it too.

#### Wrong-implementation table (scratch mutant copy of `useWorkout.ts`, `vitest run src/workout src/components`, 221 tests)

| Mutant | Suite result |
| :-- | :-- |
| C2 `let guardUntil = 0` (no tap guard after a restore) | killed (1: "ignores a tap right after a restore and counts it after ACTION_GUARD_MS") |
| C3 `askEnd` allowed on a finished workout | killed (1: "does not open the confirm step on the end screen or with no workout") |
| C1a no expiry timeout (`armExpiry` does nothing) | killed (2) |
| C1b no expiry check in `finishSet` | killed (1) |
| C1c no expiry check in `endRest` | killed (1) |
| C1h expiry timeout not cleared at unmount | killed (1) |
| C1i `commit` does not arm the timeout | killed (2) |
| C1j expiry from a tap or the timeout without the notice | killed (5) |
| C1k timeout armed for a finished workout too | killed (1) |
| C1l expiry check with `>=` (exactly 2 h expires) | killed (1) |
| C1n confirm step left open after expiry | killed (1) |
| T2 expiry clears the workout but keeps the Wake Lock | killed (2) |
| **C1d no expiry check in `askEnd`** | **survived — 221 passed** |
| **C1e timeout delay `IDLE_EXPIRY_MS + 1` from the arm time, not from `lastActivityAt`** | **survived — 221 passed** |
| **C1f no `armExpiry()` at setup (a restored workout gets no timeout)** | **survived — 221 passed** |
| C1g timeout callback does not re-arm | survived — 221 passed (see `expiry-rearm-unpinned`, Minor) |
| C1m tap marks the set, then expires | survived — equivalent: the workout is removed either way, so no observable state differs |

Each surviving mutant was confirmed to change behaviour with a scratch probe test (in the scratch copy only, not in the repo):

| Probe | Original | C1d | C1e | C1f | C1g |
| :-- | :-- | :-- | :-- | :-- | :-- |
| P1 store a workout, reload 1 h later, `vi.advanceTimersByTime(1 h + 1 ms)` → expired | pass | pass | **fail** (`expired= false key= true`) | **fail** (`expired= false key= true`) | pass |
| P3 clock moved 2 h + 1 ms with no timers, `askEnd()` → no confirm, expired | pass | **fail** (`confirming= true expired= false`) | pass | pass | pass |
| P4 wall clock set back 5 s, timeout fires early, then 5 s more → expired | pass | pass | **fail** | pass | **fail** |

### Closures (rounds after the first)

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `idle-expiry-never-fires-while-visible` | round 1 | yes (code) | Browser, `page.clock` installed, page visible, 0 `visibilitychange` events: (B) Start, `clock.runFor(2 h − 1 s)` → `h1 "WIOSŁOWANIE"`, idle 7 199 003 ms; `runFor(2 s)` → `h1 "PLANY"`, `status "Trening wygasł po 2 godzinach bez dotknięcia."`, storage keys `["trening.plans.v1"]`, Wake Lock log `request:screen@14371`, `release@7214371` (`p6-r2-probe-timeout-expiry.png`). (A) Start, `clock.setSystemTime(lastActivityAt + 2 h 1 min)` (no timers run) → still `"WIOSŁOWANIE"`; tap "Gotowe" → `"PLANY"`, notice, no workout key, `release@1107` (`p6-r2-probe-tap-expiry.png`). Unit: mutants C1a, C1b, C1c, C1j killed. The restore path of the same clause is not pinned: see `expiry-decision-clauses-unpinned`. |
| `restore-tap-guard-unpinned` | round 1 | yes | Mutant C2 `let guardUntil = 0` now fails `useWorkout.test.ts` "ignores a tap right after a restore and counts it after ACTION_GUARD_MS" (1 failed, 220 passed). The test taps at +0 ms and +499 ms (no change) and at +500 ms (rest starts), so it pins both edges. |
| `askend-end-screen-test-misnamed` | round 1 | yes | Mutant C3 (`if (state.value === null) return` in `askEnd`) now fails "does not open the confirm step on the end screen or with no workout" (1 failed). The test drives the workout to `mode: 'finished'` and asserts `confirmingEnd === false`, and keeps the no-workout case. |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p6-r2`, 412×915, `vite preview` on port 4199)

Test plan built in the editor: "Wiosłowanie i przysiady", "Wiosłowanie" 3×10 and "Przysiady" 3×10, both with a 15 s rest (`localstorage-list`: `"restSeconds":15` twice). A fake `navigator.wakeLock` (init script, log in `sessionStorage`) records the calls.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 6.5 | at 412×915: reload in the middle of a set: the same exercise and sets left show in under 3 s (D4) | passed | `reviews/screenshots/p6-r2-6.5-after-reload-mid-set.png`. Before: `{"h1":"WIOSŁOWANIE","left":"2","next":"Dalej: Przysiady"}`. `page.reload()` → `[data-testid=sets-left]` visible in `33 ms` (DOMContentLoaded 13 ms), after: `{"h1":"WIOSŁOWANIE","left":"2","next":"Dalej: Przysiady"}`; stored text unchanged by the restore (`sameStored: true`, `"cursor":1,"mode":"set"`). Snapshot: `heading "Wiosłowanie" [level=1]`, `paragraph: "2"`, `paragraph: serii zostało`, `"Dalej: Przysiady"`, `button "Gotowe"`. Wake Lock requested again after the reload (`request:screen@12`). |
| 6.6 | at 412×915: reload in the middle of a rest: the rest view continues with the remaining time, not a restarted one (D4) | passed | `p6-r2-6.6-before-reload-mid-rest.png`, `p6-r2-6.6-after-reload-mid-rest.png`. Stored `"rest":{"startedAt":1792345026758,"durationMs":15000}`; before `0:12`. Reload 3 728 ms into the rest → `{"h1":"PRZERWA","time":"0:12","next":"Dalej: Wiosłowanie, seria 3 z 3"}` (expected ceil(11.27 s) = 0:12, not 0:15); 2 s later `0:10`. |
| 6.7 | at 412×915: a stored workout whose last tap is more than 2 h old shows the expiry notice and the plan list after a reload (D4) | passed | `p6-r2-6.7-expired-notice.png`. Stored `lastActivityAt` moved back (idle 7 260 001 ms). After reload: `h1 "PLANY"`, `status ["Trening wygasł po 2 godzinach bez dotknięcia."]`, 1 Start button, storage keys `["trening.plans.v1"]`, Wake Lock log `[]` (no request for the expired workout). A second reload: `h1 "PLANY"`, 0 status elements. |
| 6.8 | at 412×915: "Zakończ trening" → confirm → plan list; "Zakończ trening" → cancel → the workout stays (D8) | passed | `p6-r2-6.8-confirm-open.png`, `p6-r2-6.8-after-cancel.png`, `p6-r2-6.8-after-confirm.png`. Top button `btn btn-danger`, top 24 px, 56 px, `rgb(255, 107, 107)`; "Gotowy, zaczynam" at top 803 px, 64 px. Dialog `alertdialog` (`aria-labelledby="end-title"`, "ZAKOŃCZYĆ TRENING?") covering 412×915, buttons `Wróć do treningu` (`btn btn-block`, 56 px) and `Zakończ trening` (`btn btn-danger btn-block`, 56 px), 0 `.btn-primary`. Cancel → no dialog, `h1 "PRZERWA"`, `0:13`, stored `{"cursor":1,"mode":"rest"}`. Confirm → `h1 "PLANY"`, keys `["trening.plans.v1"]`, no notice, Wake Lock `request:screen@16474`, `release@20672`; reload → `"PLANY"`. Native dialogs: 0. |

Extra browser check (restore path of the new timeout, `p6-r2-probe-restored-timeout-expiry.png`): stored `lastActivityAt` set to 1 h 59 min ago, reload → `"WIOSŁOWANIE"`; `clock.runFor(55 s)` → still `"WIOSŁOWANIE"`; `runFor(10 s)` → `"PLANY"`, notice, keys `["trening.plans.v1"]`, `release@7286458`. The production code is right on this path; the tests do not pin it (below).

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | FAIL |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 1 · Minor: 3 · Nit: 0

Findings going back to a builder: `expiry-decision-clauses-unpinned`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`armExpiry` and `expireIfIdle` have docblocks that state what they do ("It only asks for a check; `refresh` decides from the timestamps"). The other docblocks are unchanged from round 1.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | none in this project |
| TS docblocks | yes | yes | store, Wake Lock, restore, expiry timeout |
| DESIGN.md | yes | yes | 2 lines in "Wznowienie treningu" (round 1, unchanged) |
| Translations | n/a | — | Polish literals by design |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

No significant typos. The UI strings match DESIGN.md word for word.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 6 slice details / D4 / D8 / binding decision) | Implemented in | Status |
| :-- | :-- | :-- |
| key `trening.workout.v1`, save after every state change | `useWorkout.ts:78-89`, `workoutStore.ts` | met |
| load validates shape and version; unreadable → corrupt copy, no workout, plans untouched | `workoutStore.ts` | met (round 1: 48 000-state fuzz, store mutants killed) |
| stored, not expired workout opens at once in its saved state; ended rest → set view | `useWorkout.ts:38-46, 54-55` | met (browser: 33 ms; rest 0:12 after 3.7 s of 15 s) |
| expired workout removed at start, Polish notice on the plan list | `useWorkout.ts:41-44`, `PlanList.vue:12` | met |
| a workout with no tap for more than 2 h expires while visible (D4) | `useWorkout.ts:101-111` (timeout), `:114-120` | met (browser B and restore probe) |
| every workout action checks `isExpired` first; no set marked | `useWorkout.ts:173, 180, 195` | met for `finishSet`, `endRest`, `askEnd` (browser A); see Minor `confirm-step-skips-expiry-check` for `confirmEnd`/`cancelEnd` |
| recompute at once on `visibilitychange` to visible | `useWorkout.ts:230-238` | met |
| Wake Lock at start and resume, again on visible, release at end, early end and expiry | `wakeLock.ts`, `useWorkout.ts:73-76, 87, 244` | met (browser: `release@7214371` at the timeout) |
| "Zakończ trening" danger, far from "Gotowe", in-app confirm, confirm removes, cancel keeps | `WorkoutSet.vue`, `WorkoutRest.vue`, `EndWorkoutConfirm.vue`, `useWorkout.ts:193-209` | met |

### I2. Is it logically correct?

**Verdict:** FAIL

The code is correct on every path this review drove (browser A, B, restore probe; 12 mutants killed). The gap is in the tests: three clauses of the binding decision can be broken with the full suite green.

- **[Major]** `expiry-decision-clauses-unpinned` — `src/workout/useWorkout.ts:105, 241, 195` (tests: `src/workout/useWorkout.test.ts:317-369`) — The binding decision says "while a workout runs, one timeout armed for just after lastActivityAt + 2 h triggers the same check" and "every workout action checks isExpired(state, now()) first". Every new expiry test starts the workout in the same instance, so the timeout is always armed at the moment of the last tap. Three wrong implementations pass all 221 tests in `src/workout` and `src/components`:
  1. C1f — remove `armExpiry()` at setup (line 241): a **restored** workout gets no timeout. This is the round-1 defect `idle-expiry-never-fires-while-visible` again, on the restore path.
  2. C1e — `delay = IDLE_EXPIRY_MS + 1` (line 105) instead of `lastActivityAt + IDLE_EXPIRY_MS + 1 - now()`: the timeout counts from the reload, not from the last tap.
  3. C1d — remove `if (expireIfIdle(now())) return` in `askEnd` (line 195): "Zakończ trening" on an expired workout opens the confirm step instead of ending via the expiry path.

  **Fails when:** someone makes change 1 or 2. On the phone, Chrome often discards a background tab, so a return from another app is a reload. The user comes back after 1 h 59 min, the workout restores, and the phone is left on the set view: with change 1 the workout never expires and the Wake Lock keeps the screen on until the battery is empty; with change 2 it expires about 4 h after the last tap. The suite stays green. Scratch probe P1 (store a workout, `advance(1 h)`, mount a fresh instance, `vi.advanceTimersByTime(1 h + 1 ms)`) fails on both mutants (`expired= false key= true`) and passes on the current code. Probe P3 (start, `advance(IDLE_EXPIRY_MS + 1)` with no timers, `askEnd()`) fails on C1d (`confirming= true expired= false`).

  **Fix:** add tests to `useWorkout.test.ts`, no production change needed:
  - Restore path: `start(PLAN)` in one instance, unmount, `advance(60 * 60_000)`, mount a fresh instance; `vi.advanceTimersByTime(60 * 60_000 - 1_000)` → still `mode 'set'`, `expired false`; `vi.advanceTimersByTime(1_001)` → `view null`, `expired true`, key removed, sentinel released. The first assertion kills an anchor at the mount time (C1e), the second kills a missing setup arm (C1f).
  - `askEnd` on an expired workout: `start(PLAN)`, `advance(IDLE_EXPIRY_MS + 1)` (no timers), `askEnd()` → `confirmingEnd false`, `expired true`, key removed.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

One timeout, re-armed on every commit, decided by `isExpired`. `expireIfIdle` is shared by the taps and `refresh`.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

The timeout is cleared on unmount (C1h killed) and is not armed for a finished workout (C1k killed; that mutant would loop a 0 ms timeout). After an expiry, `commit(null)` closes the confirm step (C1n killed) and releases the Wake Lock (T2 killed).

- **[Minor]** `expiry-rearm-unpinned` — `src/workout/useWorkout.ts:109` — The timeout callback re-arms itself after `refresh()`. This matters only when the timeout fires before the wall clock passes the limit (the system clock set back, e.g. by a network time sync). No test pins it: mutant C1g passes all 221 tests; probe P4 (clock set back 5 s, then the timers run) shows the workout never expires without the re-arm. Rare path, so Minor.
- **[Minor]** `confirm-step-skips-expiry-check` — `src/workout/useWorkout.ts:200-209` — `confirmEnd` and `cancelEnd` do not call `expireIfIdle`. The decision says every workout action checks the expiry first. On an expired workout, "Zakończ trening" in the confirm step ends it through the early-end path (no notice), and "Wróć do treningu" keeps an expired workout on screen. In practice the timeout or the visibility refresh removes the workout and closes the confirm step first, so the user almost never reaches this; no set is marked either way.
- **[Minor]** `confirm-dialog-focus` — `src/components/EndWorkoutConfirm.vue:6` — Still open from round 1. Browser: after the confirm step opens, `document.activeElement` is the covered "Zakończ trening" button; the workout buttons under the overlay stay in the tab order. Move focus to "Wróć do treningu" on open and back on cancel.

### I5. Is it performant?

**Verdict:** PASS

One extra `setTimeout` per commit (cleared and re-set). Restore measured at 33 ms.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network call, no `innerHTML`, no data leaves the device.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Client-only app with no logging by design; no leftover `console.log`.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` and `package-lock.json` unchanged.

---

## Architecture — the project's own rules

- "No server for user data" → meets — no fetch or API call.
- "A workout survives interruptions (FR-009)" → meets — reload mid-set (33 ms) and mid-rest (0:12, not 0:15) in the browser; fresh-instance tests.
- "Rest time comes from timestamps" → meets — the restored rest and the expiry both use `now()` against stored timestamps; the timeout only triggers a check.
- "The screen stays on during a workout (FR-012)" → meets — request at start and restore, release at the end, early end and expiry (browser log).
- "A stored shape is versioned; reading never throws …" → meets — unchanged from round 1.
- "Every behavioural clause is pinned by a Vitest test" → fails for the restore path and anchor of the idle timeout and the `askEnd` expiry check — `expiry-decision-clauses-unpinned`.
- DESIGN.md key rules → meets — no UI change this round; one chalk primary on the rest view, none in the confirm; danger button 56 px; Polish text.
- No `window.confirm` → meets — 0 native dialogs in the walk.

## Not reviewed

- Real Wake Lock on the phone, a real screen lock, an app switch and a tab discard (D10, owner-run). The browser walk proves only the calls through a fake `navigator.wakeLock`.
- Real timer behaviour on Android over 2 h (throttling of a visible page with a Wake Lock). The browser checks used Playwright's fake clock.
- Audibility of the end-of-rest sound (owner-run).

## Observations outside scope

- `brief.md` diff also appends `— ea79ecb` to the Phase 5 rows; this is the orchestrator's commit stamp. The phase's own change is the four Phase 6 checkboxes 6.1–6.4.
- `DESIGN.md` places "Zakończ trening" at the top of the set and rest views, an exception to the Thumb Rule. It follows the brief ("far from Gotowe"); the owner should confirm the placement (reported in round 1).
