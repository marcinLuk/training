# Phase review — feat-mvp-plans-workout-loop · Phase 6: Resume, expiry, Wake Lock and early end · round 3

- **Scope:** `git diff HEAD` plus untracked files: the same 16 files as round 2. This round the builder changed only `src/workout/useWorkout.test.ts` (3 new tests, lines 371-411). Emphasis on the closure of `expiry-decision-clauses-unpinned`.
- **Files reviewed:** 16 (`+1696/-28` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 6` rows 6.1–6.8, `## Slice details` Phase 6, Done-when D4 and D8, plus the binding decision: "every workout action checks isExpired(state, now()) first and an expired workout ends via the expiry path without marking a set; while a workout runs, one timeout armed for just after lastActivityAt + 2 h triggers the same check".
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Review mode:** focused: closure of `expiry-decision-clauses-unpinned` and the new tests (rest: short — production bytes unchanged since the round-2 full review)
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 6.1 | workout tests | `timeout 300 npx vitest run src/workout` | pass — `Test Files 5 passed (5)`, `Tests 146 passed (146)` |
| 6.2 | component tests | `timeout 300 npx vitest run src/components` | pass — `Test Files 6 passed (6)`, `Tests 78 passed (78)`, exit 0 |
| 6.3 | full suite | `timeout 300 npm test` | pass — `Test Files 16 passed (16)`, `Tests 323 passed (323)`, exit 0 |
| 6.4 | build | `timeout 300 npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 224ms`, exit 0 |

Skipped or todo tests: 0. `grep -rnE '\.(skip|only|todo)\b|describe\.skip|@ts-ignore|@ts-expect-error|@ts-nocheck|as any|: any\b|as unknown as' src/` → none found. No diff in `tsconfig*.json`, `package.json`, `package-lock.json`, `vite.config.ts`. Test count went from 320 (round 2) to 323: exactly the 3 new tests, so no test was removed.

Production byte identity (checked by this review, not taken on trust): `cmp` of every file in the orchestrator's round-2 snapshot (`scratchpad/p6-r2-prod/`: `App.vue`, `EndWorkoutConfirm.vue`, `FieldError.vue`, `NumberStepper.vue`, `PlanEditor.vue`, `PlanList.vue`, `WorkoutEnd.vue`, `WorkoutRest.vue`, `WorkoutSet.vue`, `useWorkout.ts`, `wakeLock.ts`, `workoutStore.ts`) against `src/` → all identical. Independent check: the round-2 critic's own backup `scratchpad/useWorkout.orig.ts` (written 19:32, during the round-2 review) is byte-identical to `src/workout/useWorkout.ts`. File times: only `src/workout/useWorkout.test.ts` is newer than 19:29.

#### Wrong-implementation table (scratch mutant copy, `vitest run src/workout src/components`, baseline `224 passed (224)`)

| Mutant | Suite result | Killed by |
| :-- | :-- | :-- |
| C1d no `expireIfIdle` in `askEnd` | `1 failed \| 223 passed (224)` | "Zakończ trening" on an expired workout ends it as expired and opens no confirm step |
| C1d2 `askEnd` expiry check with `>=` (exactly 2 h expires) | `1 failed \| 223 passed (224)` | "Zakończ trening" at exactly 2 h still opens the confirm step |
| C1e `delay = IDLE_EXPIRY_MS + 1` (anchored at arm time) | `1 failed \| 223 passed (224)` | expires a restored workout by itself, counted from the last tap and not from the reload |
| C1e2 delay anchored at `max(lastActivityAt, setup time)` (only the restore path wrong) | `1 failed \| 223 passed (224)` | same restore test |
| C1f no `armExpiry()` at setup | `1 failed \| 223 passed (224)` | same restore test |
| C1a `armExpiry` does nothing | 3 failed | restore test, "expires by itself on a visible set view…", Workout.test.ts timer count |
| C1b no expiry check in `finishSet` | 1 failed | expires a tap on "Gotowe" after 2 h + 1 ms… |
| C1c no expiry check in `endRest` | 1 failed | expires a tap on "Gotowy, zaczynam" after 2 h + 1 ms… |
| C2 `let guardUntil = 0` (regression check) | 1 failed | ignores a tap right after a restore… |
| C1g timeout callback does not re-arm | `224 passed (224)` — survived | Minor `expiry-rearm-unpinned`, unchanged from round 2 |

Each mutant was applied with an exact, unique pattern (count checked = 1) and the copy was restored afterwards (`cmp` with `src/workout/useWorkout.ts` → identical).

### Closures (rounds after the first)

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `expiry-decision-clauses-unpinned` | round 2 | yes | All three named wrong implementations now fail the suite in a scratch copy: C1f (no setup arm) `1 failed \| 223 passed`, C1e (delay from arm time) `1 failed \| 223 passed`, C1d (no check in `askEnd`) `1 failed \| 223 passed`. A subtler variant that is wrong only on the restore path (C1e2) is killed too, and the `>=` boundary in `askEnd` (C1d2) is killed by the new "exactly 2 h" test. The restore test feeds the inputs its name claims: start at T0, unmount, `advance(1 h)`, fresh mount, `advanceTimersByTime(1 h − 1 s)` → still `mode 'set'`, key kept; `advanceTimersByTime(1 001)` → `view null`, `expired true`, key removed, last sentinel released. |
| `idle-expiry-never-fires-while-visible` | round 1 | still closed | C1a killed (3 failures); production unchanged. |
| `restore-tap-guard-unpinned` | round 1 | still closed | C2 killed (1 failure). |
| `askend-end-screen-test-misnamed` | round 1 | still closed | Test unchanged at `useWorkout.test.ts:631-647`; production unchanged. |

### Manual

Not re-walked: the orchestrator's instruction, and this review confirmed by `cmp` above that every production file is byte-identical to the state the round-2 critic walked.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 6.5 | at 412×915: reload in the middle of a set: the same exercise and sets left show in under 3 s (D4) | unreachable | not re-walked — production bytes unchanged since round 2 (round-2 pass: `reviews/screenshots/p6-r2-6.5-after-reload-mid-set.png`) |
| 6.6 | at 412×915: reload in the middle of a rest: the rest view continues with the remaining time, not a restarted one (D4) | unreachable | not re-walked — production bytes unchanged since round 2 (round-2 pass: `reviews/screenshots/p6-r2-6.6-*.png`) |
| 6.7 | at 412×915: a stored workout whose last tap is more than 2 h old shows the expiry notice and the plan list after a reload (D4) | unreachable | not re-walked — production bytes unchanged since round 2 (round-2 pass: `reviews/screenshots/p6-r2-6.7-expired-notice.png`) |
| 6.8 | at 412×915: "Zakończ trening" → confirm → plan list; "Zakończ trening" → cancel → the workout stays (D8) | unreachable | not re-walked — production bytes unchanged since round 2 (round-2 pass: `reviews/screenshots/p6-r2-6.8-*.png`) |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | CONCERNS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 0 · Minor: 3 · Nit: 0

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

No production change this round. The new tests carry plain names that say what they check; the two clock-only tests have a comment ("Move the clock only: no timer runs, no event fires").

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | none in this project |
| TS docblocks | yes | yes | unchanged since round 2 |
| DESIGN.md | yes | yes | 2 lines in "Wznowienie treningu" (round 1, unchanged) |
| Translations | n/a | — | Polish literals by design |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

No typos in the new test names.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

Unchanged from round 2 (all Phase 6 slice details met). The binding decision's clauses are now each pinned:

| Clause | Pinned by | Status |
| :-- | :-- | :-- |
| every workout action checks `isExpired` first — `finishSet` | `useWorkout.test.ts:317` | met, C1b killed |
| — `endRest` | `useWorkout.test.ts:338` | met, C1c killed |
| — `askEnd` (and its `>` boundary) | `useWorkout.test.ts:391, 403` | met, C1d and C1d2 killed |
| one timeout while a workout runs, started in this instance | `useWorkout.test.ts:350, 361` | met, C1a killed |
| the same timeout for a restored workout | `useWorkout.test.ts:371` | met, C1f killed |
| the timeout anchored at `lastActivityAt + 2 h` | `useWorkout.test.ts:371` | met, C1e and C1e2 killed |

### I2. Is it logically correct?

**Verdict:** PASS

Production is unchanged and was correct on every path round 2 drove in the browser. The new tests pin the three clauses round 2 found unpinned (table above). No new defect found in the new tests: the fixtures are built through `start()` and `advance()` from the injected clock, not from fixed stored timestamps, and the restore test reloads into a fresh instance that reads from `localStorage`.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

Three short tests, reusing the file's helpers.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** CONCERNS

Carried from round 2, unchanged (production bytes identical; not sent to a builder):

- **[Minor]** `expiry-rearm-unpinned` — `src/workout/useWorkout.ts:109` — The timeout callback re-arms itself after `refresh()`; this matters only when the timeout fires before the wall clock passes the limit (system clock set back). Mutant C1g still passes all 224 tests this round.
- **[Minor]** `confirm-step-skips-expiry-check` — `src/workout/useWorkout.ts:200-209` — `confirmEnd` and `cancelEnd` do not call `expireIfIdle`. On an expired workout, the confirm step's "Zakończ trening" ends it with no notice, and "Wróć do treningu" keeps it on screen. In practice the timeout or the visibility refresh closes the confirm step first; no set is marked either way.
- **[Minor]** `confirm-dialog-focus` — `src/components/EndWorkoutConfirm.vue:6` — Focus is not moved into the confirm step when it opens; the covered workout buttons stay in the tab order.

### I5. Is it performant?

**Verdict:** PASS

No change.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network call, no `innerHTML`, no data leaves the device.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Client-only app with no logging by design.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` and `package-lock.json` unchanged.

---

## Architecture — the project's own rules

- "Every behavioural clause is pinned by a Vitest test" → meets — the restore path, the anchor of the idle timeout and the `askEnd` expiry check now each fail the suite when broken (C1d, C1e, C1e2, C1f killed).
- "Rest time comes from timestamps" → meets — unchanged; the restore test moves the clock with `vi.setSystemTime` before the reload, so the anchor comes from the stored `lastActivityAt`.
- "A workout survives interruptions (FR-009)" → meets — unchanged since round 2 (browser walk 6.5, 6.6).
- "The screen stays on during a workout (FR-012)" → meets — the restore test also checks the Wake Lock release at expiry.
- No test skips, no assertion removed or loosened → meets — 320 → 323 tests, grep clean.

## Not reviewed

- Manual items 6.5–6.8: not re-walked this round (production bytes unchanged since the round-2 walk, confirmed by `cmp`).
- Real Wake Lock, a real screen lock, an app switch, a tab discard, audibility of the sound (D10, owner-run).
- Real timer behaviour on Android over 2 h (throttling of a visible page with a Wake Lock).

## Observations outside scope

- `brief.md` diff also appends `— ea79ecb` to the Phase 5 rows; this is the orchestrator's commit stamp. The phase's own change is the four Phase 6 checkboxes 6.1–6.4.
- `DESIGN.md` places "Zakończ trening" at the top of the set and rest views, an exception to the Thumb Rule. It follows the brief ("far from Gotowe"); the owner should confirm the placement (reported in rounds 1 and 2).
