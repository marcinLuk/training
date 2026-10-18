# Phase review — feat-mvp-plans-workout-loop · Phase 4: Workout engine · round 1

- **Scope:** working tree against `HEAD` (c8b1567): `src/workout/engine.ts` (new), `src/workout/engine.test.ts` (new), `brief.md` Progress rows 4.1–4.2
- **Files reviewed:** 3 (`+802/-2` lines; brief.md: 2 checkbox lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 4: Workout engine` (Progress rows 4.1–4.2 and Slice details)
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | `npx vitest run src/workout` passes, with tests for the listed clauses | `timeout 300 npx vitest run src/workout` | pass (54 passed, 0 skipped; no `.skip/.only/.todo` in the file) |
| 4.2 | `npm run build` exits 0 | `set -o pipefail; timeout 300 npm run build` | pass (exit 0) |

```
 Test Files  1 passed (1)
      Tests  54 passed (54)
```
```
dist/assets/index-Cra7Kgk1.js   76.16 kB │ gzip: 29.55 kB
✓ built in 135ms
EXIT=0
```

Extra (not a row): `npm test` → `Test Files 9 passed (9)`, `Tests 175 passed (175)`. No regression in earlier phases.

### Wrong-implementation table (mutant copy in the scratch folder, phase tests only)

I copied the repo to the scratch folder, changed only `src/workout/engine.ts` there, and ran `vitest run src/workout`. The production file stayed unchanged (`diff` against the original: identical).

| Mutant | Phase tests |
| :-- | :-- |
| M01 `isExpired` uses `>=` | killed (2 failed) |
| M02 `isExpired` off by +1 ms | killed (2) |
| M03 `isExpired` uses `startedAt` | killed (1) |
| M04 tick counter in `getView` (remaining − 1000 per call, ignores `now`) | killed (7) |
| M05 remaining not clamped at 0 | killed (2) |
| M06 `adjustRest` re-anchors with the old duration | killed (2) |
| M07 `adjustRest` never ends the rest | killed (4) |
| M08 `adjustRest` exactly 0 keeps the rest | killed (2) |
| M09 `adjustRest` extends a rest that already ran out | killed (1) |
| M10 `adjustRest` (continue path) does not stamp `lastActivityAt` | killed (2) |
| **M11 `adjustRest` (end path, −15 s reaches 0) does not stamp `lastActivityAt`** | **SURVIVED (54 passed)** |
| M12 `resolveRest` stamps `lastActivityAt` | killed (2) |
| M13 / M14 `resolveRest` 1 ms early / 1 ms late | killed (1) / killed (3) |
| M15 rest time from the NEXT exercise | killed (2) |
| M16 0 s rest still enters rest mode | killed (1) |
| M17 last set starts a rest | killed (2) |
| M18 skip starts a rest | killed (6) |
| M19 `completeSet` allowed during a rest | killed (2) |
| M20 `completeSet`/`skipSet` do not stamp | killed (4) |
| M21 `undo` allowed when finished | killed (1) |
| M22 `undo` does not pop the stack | killed (2) |
| M23 `undo` keeps the rest | killed (1) |
| M24 `undo` does not stamp | killed (2) |
| M25 `undo` cursor = `cursor − 1` | survived — **equivalent** (invariant: the top of the undo stack is always `cursor − 1`; my random probe also passes on it) |
| M26 `undo` leaves the status | killed (6) |
| M27 / M28 `endRestEarly` no stamp / keeps rest object | killed (2) / killed (1) |
| M29 / M30 `startWorkout` aliases exercise objects / array | killed (2) / killed (2) |
| M31 / M32 sets left counts all sets / excludes the current set | killed (5) / killed (8) |
| **M33 `isLastSet = isLastExercise`** | **SURVIVED (54 passed)** |
| M34 `canUndo` always true | killed (2) |
| M35 / M36 `restNext` set number +1 / from the finished set | killed (1) / killed (1) |
| M37 no throw for 0 sets | killed (1) |
| **M38 finished cursor stays at the last index (not `sets.length`)** | **SURVIVED (54 passed)** |
| M39 `nextExerciseName` = current name | killed (2) |

Each survivor changes behaviour. I dumped the values on the original and on the mutant with the same input:

```
original  M11 -15 s ending rest: mode set lastActivityAt 5000
mutant    M11 -15 s ending rest: mode set lastActivityAt 0
original  M33 first set of 2-set last exercise: isLastExercise true isLastSet false
mutant    M33 first set of 2-set last exercise: isLastExercise true isLastSet true
original  M38 finished cursor 3 sets.length 3 mode finished
mutant    M38 finished cursor 2 sets.length 3 mode finished
```

### Random action sequences against invariants (scratch probe)

3000 random plans (1–4 exercises, 1–4 sets, rest 0/15/30/90 s, Polish names), 60 random actions each (complete, skip, undo, endRestEarly, ±15 s, resolveRest), with the clock moving 0–60 s per step. After every step I checked: `0 ≤ cursor ≤ sets.length`; finished ⇔ `cursor === sets.length`; rest mode ⇔ `rest !== null`; `rest.durationMs > 0`; a set is marked ⇔ its index is below the cursor; the undo stack is exactly `[0 … cursor−1]` and its kinds match the statuses (no set counted twice or lost); JSON round trip is equal; the view mode matches; remaining ≥ 0 and ≤ duration; `restNext` only in rest; `setsLeft ≥ 1` and equals `sets − setNumber + 1`; `isLastSet` and `canUndo` match. I also checked the `lastActivityAt` rule: a changing user action sets it to `now`, `resolveRest` never changes it, a no-op call never changes it.

```
changing actions applied: {"complete":13473,"undo":12720,"skip":13369,"adj-":2631,"adj+":2560,"endEarly":2649,"resolve":1273}
 ✓ probe > random sequences keep the invariants 2232ms
adj rest {"startedAt":10000,"durationMs":95000} remaining@10s 95000 @50s 55000
```

Result: no invariant broke. The engine itself is correct. The findings below are about clauses that the phase tests do not pin.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | pass |
| D2 | Are all relevant types of documentation covered? | pass |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | pass |
| I1 | Does it satisfy the original requirements? | fail (3 clauses unpinned) |
| I2 | Is it logically correct? | pass (Minor notes) |
| I3 | Is there no unnecessary complexity? | pass (Nit) |
| I4 | Is it robust (concurrency, error handling, …)? | pass (Minor) |
| I5 | Is it performant? | pass |
| I6 | Is it secure (SQL injection, …)? | n/a |
| I7 | Is it observable (metrics, logging, tracing, …)? | n/a |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | n/a (no new dependency) |

Blockers: 0 · Major: 3 · Minor: 2 · Nit: 1

Findings going back to a builder: `islastset-test-not-on-last-exercise`, `adjustrest-end-stamp-unpinned`, `finished-cursor-docblock-unpinned`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** pass

The module docblock says the engine is pure, takes `now`, returns a new state, and computes the rest from timestamps. The state fields and the view fields have short docblocks.

### D2. Are all relevant types of documentation covered?

**Verdict:** pass

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | the brief has no ADR process |
| TSDoc / API | yes | yes | `engine.ts` docblocks |
| Translations | no | — | no UI text in this phase |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** pass

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** fail — the code meets every clause, but three clauses have no assertion that fails when the clause breaks.

| Requirement (Slice details / row 4.1) | Implemented in | Status |
| :-- | :-- | :-- |
| Pure functions, every one takes `now` | `engine.ts:89-260` | met |
| Serialisable state, `version: 1`, plan copy, flat sets, cursor, mode, rest, undo stack, `lastActivityAt` | `engine.ts:44-60` | met (also `startedAt`) |
| `getView`: name, reps, sets left (with current), next exercise or none, last-set flag, remaining rest | `engine.ts:129-172` | met; last-set flag **unpinned** (see `islastset-test-not-on-last-exercise`) |
| `completeSet`: last set → finished, no rest; 0 s → next set; else rest of the finished exercise | `engine.ts:179-212` | met, pinned |
| `resolveRest`; `endRestEarly` | `engine.ts:219-228` | met, pinned |
| `skipSet`: skipped, moves on, no rest; last set → finished | `engine.ts:214-216` | met, pinned |
| `undo`: cursor back, pending, rest cleared; no-op on empty stack or finished | `engine.ts:230-242` | met, pinned |
| `adjustRest(±15000)`: never below 0; 0 ends the rest | `engine.ts:248-256` | met, pinned |
| `isExpired`: more than 2 h since `lastActivityAt` | `engine.ts:258-260` | met, pinned on both sides of the boundary |
| Every user action sets `lastActivityAt = now`; the rest ending by itself does not | all actions | met; the `adjustRest` end path is **unpinned** (see `adjustrest-end-stamp-unpinned`) |
| Plan copy unchanged when the source plan changes | `engine.ts:93-103` | met, pinned |
| Docblock: "In finished mode it equals `sets.length`" | `engine.ts:51-53`, `:196` | met; **unpinned** (see `finished-cursor-docblock-unpinned`) |

- **[Major]** `islastset-test-not-on-last-exercise` — `src/workout/engine.test.ts:170-176` — The test is named "does not flag last set on the last exercise when more sets follow", but its input stops on "Rozpiętki", which is exercise 2 of 3 (the last exercise is "Plank", with 1 set). No test has a last exercise with more than one set. So the wrong implementation `isLastSet: next === undefined` (the last-exercise flag reused as the last-set flag, `engine.ts:161`) passes all 54 tests (mutant M33). **Fails when:** a plan whose last exercise has 2+ sets → on the first set of that exercise the view says `isLastSet: true`, and Phase 5 shows "To ostatnia seria" too early. **Fix:** make the test reach the first set of a last exercise with 2+ sets (for example `twoExercisePlan(0, 0, 1, 2)` after one skip) and assert `isLastExercise === true` and `isLastSet === false`, then `isLastSet === true` on its final set.
- **[Major]** `adjustrest-end-stamp-unpinned` — `src/workout/engine.test.ts:478-488` (code: `engine.ts:252-254`) — The brief says "Every user action sets `lastActivityAt = now`". The tests check `adjustRest` only on the path that keeps the rest (+15 s). The path where −15 s brings the rest to 0 and ends it returns early at `engine.ts:253`; dropping `lastActivityAt: now` there passes all 54 tests (mutant M11: `lastActivityAt` stays 0 instead of 5000). **Fails when:** the user ends a rest with "−15 s" and then works out without a tap for a while → `lastActivityAt` keeps the older tap time, and `isExpired` can expire the running workout before 2 h have passed since the user's last tap (a lost workout). **Fix:** add an assertion that `adjustRest(resting, -15_000, later)` which ends the rest has `lastActivityAt === later` (the clamp tests at `:428-449` are a good place).
- **[Major]** `finished-cursor-docblock-unpinned` — `src/workout/engine.ts:51-53` (docblock) and `:196` — The `cursor` docblock claims "In finished mode it equals `sets.length`". No test asserts the cursor of a finished state. The wrong implementation `cursor: index` (cursor stays on the last set) passes all 54 tests (mutant M38: cursor 2 instead of 3 for 3 sets). Phase 6 will validate the stored shape on load and Phase 5/7 read the cursor, so this stated invariant needs a pin. **Fix:** in the "last set finishes" tests for `completeSet` and `skipSet` (`:237-245`, `:324-330`), assert `state.cursor === state.sets.length`.

### I2. Is it logically correct?

**Verdict:** pass — the random probe (above) found no state where the cursor is out of range, mode and rest disagree, or a set counts twice. Remaining rest comes only from `startedAt + durationMs − now`; after `adjustRest` the rest is re-anchored as `{ startedAt: now, durationMs: remaining + delta }`, so the later remaining time is still from timestamps (probe: `remaining@10s 95000 @50s 55000`). The 2 h boundary is strict (`>`), pinned at `T0+7_200_000` (false) and `T0+7_200_001` (true).

- **[Minor]** `elapsed-rest-reports-rest-mode` — `src/workout/engine.ts:132-171` — When the rest time is over but nobody called `resolveRest`, `getView` returns `mode: 'rest'` with `restRemainingMs: 0`, and `completeSet` on that state is a no-op (probe: `elapsed unresolved: mode rest remaining 0 completeSet no-op? true`). This is correct by the contract, but Phase 5 must call `resolveRest(state, now)` before it picks the screen and before every action. If the UI picks the set view from `restRemainingMs === 0` instead, a "Gotowe" tap is dropped. Note for Phase 5/6; no change needed here.

### I3. Is there no unnecessary complexity?

**Verdict:** pass

- **[Nit]** `max-set-count-magic-number` — `src/workout/engine.ts:87,94` — `MAX_ABS_SET_COUNT = 1000` is a second limit next to `LIMITS.sets.max` (20) in `plan.ts`, and no test covers the >1000 or non-integer throw. Stored plans are already validated on read (`planStore.ts:55`), so the guard is extra. Either use `LIMITS.sets` or say in a comment why 1000.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** pass

- **[Minor]** `rest-remaining-exceeds-duration-on-clock-backstep` — `src/workout/engine.ts:125-127` — If the device clock moves back during a rest (`now < rest.startedAt`), the remaining time is more than the rest duration (probe: a 15 s rest at `now = startedAt − 60 s` gives `remaining 75000`). The user then sees a rest longer than the one they set until they tap "Gotowy, zaczynam". A cap at `durationMs` (`Math.min(durationMs, …)`) keeps the timestamp rule and removes this case. Rare on a phone with network time.

`startWorkout` throws on a plan with no exercises or bad set counts. This is safe for Phase 5: `listPlans`/`getPlan` return only plans that pass `validatePlan` (`planStore.ts:55`), so a stored plan cannot reach the throw.

### I5. Is it performant?

**Verdict:** pass — at most 20 exercises × 20 sets = 400 sets; `getView` filters once per call (O(n)); every action copies the set array once. Negligible.

### I6. Is it secure (SQL injection, …)?

**Verdict:** n/a — no input from outside the device, no storage, no network in this phase.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** n/a — pure functions; no logs expected. No `console.*` left.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** n/a — `package.json` and `package-lock.json` did not change.

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |
| — | — | — | — | no new package |

---

## Architecture — the project's own rules

- "Rest time comes from timestamps … Never count timer ticks" → meets — `restRemaining` uses only `startedAt`, `durationMs`, `now`; tick-counter mutant M04 is killed (7 tests).
- "A stored shape is versioned" → meets — `version: 1`, `WORKOUT_STATE_VERSION`; the state is plain JSON (round-trip test at `engine.test.ts:104-108`; probe JSON check on every step).
- "A running workout keeps its own copy of the plan" → meets — deep copy, pinned by `engine.test.ts:79-102`.
- `erasableSyntaxOnly` (no `enum`, `namespace`, parameter properties) → meets — string unions only; build exit 0.
- Never-weaken list (`@ts-ignore`, `as any`, skips) → meets — none found; one `!` non-null on `state.rest!` (`engine.ts:162`) is guarded by `inRest`.
- brief.md frozen part → meets — the phase changed only rows 4.1 and 4.2 checkboxes. (The `— c8b1567` suffixes on the Phase 3 rows are the orchestrator's edit, not this phase's.)
- No UI change in this phase → DESIGN.md rules not touched. `getView` gives what DESIGN.md "Widok serii" and "Przerwa" need: exercise name, reps, sets left, next exercise name, last-exercise and last-set flags, remaining rest, and during the rest the next set (`restNext`: exercise, set number, sets in exercise) and `canUndo` for the 40 % disabled state.

## Not reviewed

- No manual items in this phase; no browser session opened.
- Phase 5/6/7 use of the engine (screen choice, resolve on load, sound on the rest end) — not built yet.

## Observations outside scope

- `WorkoutState.startedAt` is not in the brief's state list. It is harmless and may help later, but nothing reads it yet.
- The "cursor points at the next set during a rest" choice fits Phase 7: the top of the undo stack is always `cursor − 1`, so "Cofnij" in the rest view undoes exactly the set that started the rest (probe invariant held over ~48 000 changing actions).
