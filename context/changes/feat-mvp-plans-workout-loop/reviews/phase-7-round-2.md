# Phase review — feat-mvp-plans-workout-loop · Phase 7: Undo, skip and rest adjustment on screen · round 2

- **Scope:** `git diff HEAD` plus untracked files: `src/workout/useWorkout.ts`, `src/components/WorkoutSet.vue`, `src/components/WorkoutRest.vue`, `src/App.vue`, `src/components/UndoSkipAdjust.test.ts` (new), `DESIGN.md` (one line in "Przerwa"), `brief.md` Progress rows 7.1–7.3
- **Files reviewed:** 6 (`+493/-10` lines; brief.md checkbox edits not counted)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 7` Progress rows and `### Phase 7` Slice details
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 7.1 | component tests for Cofnij after Gotowe, Cofnij after Pomiń serię, Pomiń serię with no rest, ±15 s, read back after a fresh mount | `timeout 300 npx vitest run src/components` | pass — `Test Files  7 passed (7)` / `Tests  108 passed (108)` |
| 7.2 | `npm test` exits 0 | `timeout 300 npm test` | pass — `Test Files  17 passed (17)` / `Tests  353 passed (353)` |
| 7.3 | `npm run build` exits 0 | `timeout 300 npm run build` | pass — `vue-tsc -b && vite build` … `✓ built in 208ms` |

Skipped or focused tests: `grep -rnE "\.(skip|only|todo)\b|describe\.skip|it\.skip" src --include=*.test.ts` returns nothing. 0 skipped.

Each 7.1 clause maps to an assertion in `src/components/UndoSkipAdjust.test.ts`:

| Clause | Test (line) |
| :-- | :-- |
| "Cofnij" after "Gotowe" returns to that set and ends the rest | `:137` (no `[role="timer"]`, h1 "Wiosłowanie", sets left "2") |
| "Cofnij" after "Pomiń serię" | `:168` |
| "Pomiń serię" moves on with no rest | `:149` |
| "−15 s" and "+15 s" change the remaining time | `:220`, `:227`, `:233` (clock moved 10 s first) |
| each change read back after a fresh mount | `:283`, `:293`, `:304` (unmount every app, mount a new one from `localStorage`) |

### Mutation table (scratch copy, `vitest run src/components`, production tree untouched)

Each mutation was applied in `/tmp/.../scratchpad/mutant`; `diff -rq src mutant/src` confirmed that the file changed.

| Mutation | Result | Failing test(s) |
| :-- | :-- | :-- |
| `undoLast` without `guarded(at)` | 1 failed | counts one "Cofnij" on the set view when a second tap follows 150 ms later |
| `skip` without `guarded(at)` | 2 failed | counts one "Pomiń serię" …; ignores a tap on the same spot 150 ms after rest "Cofnij" |
| `adjustRestBy` without `guarded(at)` | 1 failed | ignores a tap 150 ms after "Gotowe" opened the rest view |
| `undoLast` without `expireIfIdle(at)` | 1 failed | "Cofnij" at 2 h + 1 ms expires and undoes nothing |
| `skip` without `expireIfIdle(at)` | 1 failed | "Pomiń serię" at 2 h + 1 ms expires and skips nothing |
| `adjustRestBy` without `expireIfIdle(at)` | 3 failed | "−15 s" / "+15 s" at 2 h + 1 ms …; plus `PlanEditor.test.ts > removes the chosen exercise row` (unrelated, see "Observations outside scope") |
| `commit` sets the guard on every change (round-1 shape) | 2 failed | counts two "+15 s" taps 200 ms apart; counts a "+15 s" and then two "−15 s" taps |
| "−15 s" emits `+REST_STEP_MS` | 4 failed | "−15 s" takes 15 s off …; ends the rest when the time reaches 0 …; keeps the rest time changed … |
| `skip` calls `completeSet` | 9 failed | "Pomiń serię" moves to the next set with no rest, and 8 more |
| `adjustRestBy` sets `state.value` without `commit` (no save) | 1 failed | keeps the rest time changed by "+15 s" and "−15 s" |
| `undoLast` sets `state.value` without `commit` (no save) | 4 failed | keeps a "Gotowe" that was undone, and 3 more |
| `adjustRestBy` plays the sound when −15 s ends the rest | 1 failed | ends the rest when the time reaches 0, with no sound |
| set view "Cofnij" always enabled | 2 failed | disables "Cofnij" (not hides it) …; "Cofnij" after "Gotowe" … |
| rest view "Cofnij" always enabled | 108 passed | equivalent mutant: the engine enters rest only through `completeSet`, which pushes to the undo stack, so `canUndo` is always true in rest mode. No reachable state tells the two apart. |

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `rest-undo-not-in-design-md` | round 1 | yes | `DESIGN.md:249` now says: „Widok przerwy ma też „Cofnij" (56 px, drugorzędny) nad „Gotowy, zaczynam". Cofa serię, która rozpoczęła przerwę." The browser walk at 412×915 matches it: rest-view "Cofnij" is `btn btn-block` (secondary), 735–791 px (56 px high), directly above "Gotowy, zaczynam" 803–867 px (64 px). Screenshot `p7-r2-rest-view.png`. |
| `undo-skip-tap-guard-unpinned` | round 1 | yes | Mutant copy: `undoLast` without the guard → 1 test fails; `skip` without the guard → 2 tests fail (table above). The browser also shows the guard: a double click on rest-view "Cofnij" changed `undoStack` 2 → 1 and `cursor` 2 → 1, one step only (`p7-r2-probe-dbl-rest-cofnij.png`). |
| `undo-skip-adjust-expiry-unpinned` | round 1 | yes | Mutant copy: the expiry check removed from `undoLast`, `skip`, `adjustRestBy` one at a time → 1, 1 and 2 phase tests fail (table above). |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p7-r2`, `vite preview` on port 4199, viewport 412×915 confirmed by `[innerWidth, innerHeight]` → `[412, 915]`)

The plan was made through the app's own editor: "Wiosłowanie i przysiady", "Wiosłowanie" 3×10 with a 1:00 rest, "Przysiady" 3×10 with 1:30.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 7.4 | at 412×915: "Gotowe" then "Cofnij" returns to the same set with the same sets left; "Pomiń serię" moves to the next set with no rest (D5) | passed | Before: heading "Wiosłowanie", sets-left `"3"`, `button "Cofnij" [disabled]` (`p7-r2-set-view.png`). "Gotowe" → `heading "Przerwa"`, `timer: 1:00`. "Cofnij" → `heading "Wiosłowanie"`, paragraph `"3"`, `button "Cofnij" [disabled]`; stored `"cursor":0,"mode":"set","rest":null`, `"undoStack":[]` (`p7-r2-7.4-after-cofnij.png`). "Pomiń serię" → paragraph `"2"`, no timer, `button "Cofnij"` enabled; stored `"status":"skipped"`, `"cursor":1,"mode":"set","rest":null` (`p7-r2-7.4-after-skip.png`). |
| 7.5 | at 412×915: "+15 s" and "−15 s" change the remaining rest, and a reload keeps the changed time (D6) | passed | Rest started at `durationMs:60000`, shown `0:53` just before the tap. "+15 s" → shown `1:06`, stored `{"startedAt":1792346863007,"durationMs":66489}` (51.5 s left at the tap + 15 s). Reload → shown `1:04`, same stored rest (`p7-r2-7.5-after-plus15.png`, `…-after-plus15-reload.png`). "−15 s" at `0:54` → shown `0:37`, stored `durationMs:37772`. Reload → shown `0:35`, same stored rest (`p7-r2-7.5-after-minus15.png`, `…-after-minus15-reload.png`). |

Rest view order and positions at 412×915 (`getBoundingClientRect`, top–bottom px; the lower half starts at 457.5 px):

| Element | Top–bottom | Height |
| :-- | :-- | :-- |
| "Zakończ trening" (danger) | 24–80 | 56 |
| heading "Przerwa" | 104–140 | 36 |
| ring with timer | 164–452 | 288 |
| "Dalej: Wiosłowanie, seria 2 z 3" | 476–502 | 26 |
| "−15 s" / "+15 s" | 526–582 | 56 (fully in the lower half) |
| "Cofnij" | 735–791 | 56 |
| "Gotowy, zaczynam" (chalk) | 803–867 | 64 |

Set view at 412×915: "Cofnij" and "Pomiń serię" 723–779 (56 px, "Cofnij" opacity `0.4` when disabled), "Gotowe" 803–867 (64 px). One chalk button per screen.

Extra probe: a double click on "+15 s" at `0:23` gave `0:51` (`durationMs:51449`), so both taps count (`p7-r2-probe-dbl-plus15.png`).

Screenshots: `context/changes/feat-mvp-plans-workout-loop/reviews/screenshots/p7-r2-*.png` (11 files).

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 1

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`undoLast`, `skip` and `adjustRestBy` have docblocks. The `commit` docblock (`useWorkout.ts:84-88`) states the guard rule: the guard starts only on a screen change. `REST_STEP_MS` has a one-line comment.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command or setup |
| CLAUDE.md | no | — | no new rule |
| ADR | no | — | no ADRs in this project |
| TSDoc / API | yes | yes | new composable functions documented |
| DESIGN.md | yes | yes | rest-view "Cofnij" line added to "Przerwa" (guardrail) |
| E2E rules / selectors | no | — | no E2E suite |
| Translations | no | — | Polish strings inline, as in all earlier phases |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The new DESIGN.md line is short and matches the code.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 7 slice details / rows) | Implemented in | Status |
| :-- | :-- | :-- |
| Set view: "Cofnij" and "Pomiń serię" (56 px) above "Gotowe" | `WorkoutSet.vue:32-36` | met (measured 56 px, above "Gotowe") |
| "Cofnij" also on the rest view, undoes the set that started it | `WorkoutRest.vue:55-58`, `useWorkout.ts:200-207` | met |
| Disabled state (40 % opacity) when nothing to undo | `WorkoutSet.vue:33` `:disabled="!view.canUndo"` | met (opacity `0.4` measured) |
| Rest view "−15 s" / "+15 s" (56 px) | `WorkoutRest.vue:51-54`, `useWorkout.ts:223-230` | met |
| All actions through the Phase 4 engine and the Phase 6 store | `useWorkout.ts` calls `undo`, `skipSet`, `adjustRest`, then `commit` → `saveWorkout` | met |
| Component tests in `src/components/*.test.ts` | `UndoSkipAdjust.test.ts` | met |
| D5, D6 | rows 7.1–7.5 | met |

### I2. Is it logically correct?

**Verdict:** PASS

- Expiry check runs first in every new action (`useWorkout.ts:202, 212, 225`), then the guard.
- The guard starts only when mode or cursor changes (`useWorkout.ts:91-94`). A ±15 s tap that keeps the rest leaves the guard alone; a "−15 s" that ends the rest changes the mode and starts the guard.
- `settled(at)` resolves a rest that ran out before the tap. When the engine call is then a no-op, `next !== state.value` still commits the resolved state, so the screen does not stay stale.
- **[Nit]** `adjust-tap-at-rest-end-silent` — `useWorkout.ts:226-229` — a "±15 s" (or "Cofnij") tap that lands in the ≤250 ms window after the rest ran out, before the display tick commits it, resolves the rest through `settled` and commits with no sound. The rest did end naturally and on time. The screen still changes, so the user is not left without a signal, and `finishSet`/`endRest` from earlier phases share the same path. The contract says "the sound only for a natural, on-time, visible rest end"; it does not say "always", so this is a wording gap, not a defect.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

The three new actions repeat the same five-line shape as `finishSet`/`endRest`. That is acceptable at this size.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

Double taps are guarded on every screen change (pinned, see mutation table). Two quick ±15 s taps both count (pinned, and seen in the browser). Every change goes through `commit`, which saves (pinned by the reload tests).

### I5. Is it performant?

**Verdict:** PASS

No new timers or loops.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network, no HTML injection; text is rendered through Vue interpolation.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Single-user offline app with no logging layer. No `console.log` added.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` did not change.

---

## Architecture — the project's own rules

- "Every behavioural clause is pinned by a Vitest unit or component test." → meets — mutation table above; every non-equivalent mutation fails at least one test.
- "Remaining rest time is always computed from the stored start time, the stored duration and the current time." → meets — `adjustRest` stores a new `{ startedAt: now, durationMs }`; the browser read-back after reload shows the remaining time continuing, not restarting.
- "A workout survives interruptions (FR-009)." → meets — reload tests (`UndoSkipAdjust.test.ts:283-317`) and the 7.5 browser reloads.
- One chalk primary per screen; 56 px workout targets; 64 px main action; Thumb Rule (actions in the lower half) → meets — measured: ±15 s 526–582, "Cofnij" 735–791, "Gotowy, zaczynam" 803–867 on a 915 px screen.
- Polish UI text, no emoji icons, DESIGN.md tokens only → meets — new CSS uses `var(--space-md)` only; labels "Cofnij", "Pomiń serię", "−15 s", "+15 s".
- When a UI element is not in DESIGN.md, add one line to the matching section → meets — `DESIGN.md:249`.
- **[Minor]** `undo-skip-56px-test-name-overclaims` — `src/components/UndoSkipAdjust.test.ts:116` — the test name says "shows both buttons at 56 px height class", but it only asserts that the buttons do NOT have `btn-large`. A button that lost the `btn` class (and with it `min-height: var(--target)`) would still pass. jsdom cannot measure height, and this is a visual clause, not a behaviour clause. This review measured 56 px in the browser. A stronger test would assert `classes()` contains `btn`, or the name should say "not the large size".

## Not reviewed

- Audibility of the end-of-rest sound, a real screen lock and Wake Lock on the phone (owner-run, D10).
- Other phone sizes than 412×915.

## Observations outside scope

- `src/components/PlanEditor.test.ts:68` "removes the chosen exercise row" failed once in the mutant copy run for "`adjustRestBy` without `expireIfIdle`". That mutation cannot reach `PlanEditor`. The same test passed in both real-tree runs (7.1 and 7.2) and in the 13 other mutant runs. This looks like an intermittent test from Phase 3. Per the one-attempt rule, this review did not re-run it to confirm.
- The rest-view "Cofnij" `:disabled="!view.canUndo"` binding is not pinned by a test, but no reachable state has rest mode with an empty undo stack. It is defensive only.
