# Phase review — feat-mvp-plans-workout-loop · Phase 4: Workout engine · round 2

- **Scope:** working tree vs `HEAD` (c8b1567): `src/workout/engine.ts` (new), `src/workout/engine.test.ts` (new), `brief.md` Progress rows 4.1–4.2
- **Files reviewed:** 3 (`+814/-2` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 4: Workout engine` (Progress rows 4.1–4.2, Slice details, Done when D3–D7)
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | engine tests for position, sets left, next exercise, rest, clock jump, rest end, last set, 0 s rest, undo, skip, ±15 s clamp, 2 h boundary, plan copy | `timeout 300 npx vitest run src/workout` | pass — 55 passed, 0 skipped |
| 4.2 | build exits 0 | `timeout 300 npm run build` | pass |

```
 Test Files  1 passed (1)
      Tests  55 passed (55)
EXIT=0
```

```
> vue-tsc -b && vite build
dist/assets/index-Cra7Kgk1.js   76.16 kB │ gzip: 29.55 kB
✓ built in 131ms
EXIT=0
```

- `grep -nE '\.(skip|only|todo)\b|describe\.skip|it\.skip' src/workout/engine.test.ts` → no match.
- Regression check: `timeout 300 npm test` → `Test Files 9 passed (9)`, `Tests 176 passed (176)`.

Each row-4.1 topic has a test: position/sets left/next (`engine.test.ts:112-180`), "done" starts a rest (`:216`), clock moves with no ticks (`:259-275`), rest end returns to the set (`:283`), last set ends the workout (`:241`, `:329`), 0 s rest (`:231`), undo (`:344-415`), skip (`:319-341`), ±15 s and clamp (`:418-474`), 2 h boundary (`:482`), plan copy (`:79-102`).

### Closures (round 1 Majors)

All mutants ran in a scratch copy (`scratchpad/mutant`, `node_modules` symlinked). Each mutant was applied by an exact string match that hit exactly once; the copy was restored after every run. The working tree `src/workout/engine.ts` was compared to a saved original after the runs: unchanged.

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `islastset-test-not-on-last-exercise` | round 1 | yes | Mutant C1 `isLastSet: next === undefined` → KILLED, 1 of 55 fails: "does not flag the last set on the first set of a last exercise with more sets". The test (`engine.test.ts:170-180`) now feeds `twoExercisePlan(0, 0, 1, 2)`, skips exercise A and asserts `exerciseName 'B'`, `isLastExercise true`, `isLastSet false` on B set 1 of 2. |
| `adjustrest-end-stamp-unpinned` | round 1 | yes | Mutant C2 (drop `lastActivityAt: now` from the ending return, `engine.ts:253`) → KILLED: "clamps at zero and ends the rest when the remaining time would go below 0" (assertion `engine.test.ts:439`). |
| `finished-cursor-docblock-unpinned` | round 1 | yes | Mutant C3 `cursor: index` in the finished branch (`engine.ts:196`) → KILLED, 2 fail: "the last set of the plan finishes the workout…" (`:246`) and "skipping the last set finishes the workout" (`:334`). Both paths (complete and skip) are now pinned. |

**Remaining-rest cap at `durationMs` (`engine.ts:126`).**
- Pinned: mutant C4 (remove the `Math.min` cap) → KILLED by "never shows a rest longer than the one set when the clock moves back" (`engine.test.ts:443-446`).
- No other behaviour changed. Differential probe (`scratchpad/probe/diff.mts`): the original engine against a copy with the cap removed, 3 000 random plans × up to 40 random actions (`completeSet`, `skipSet`, `endRestEarly`, `resolveRest`, `undo`, `adjustRest ±15000`), comparing the full state, the full `getView` result and `isExpired` after every step:

| Clock | Steps | Steps in rest | Divergences |
| :-- | :-- | :-- | :-- |
| only forward (Δ ∈ {0, 1, 999, 5 000, 14 999, 15 000, 30 000, 90 000, 200 000} ms) | 91 572 | 14 260 | **0** |
| 1 in 4 steps moves back up to 60 s | 91 394 | 16 589 | `getView.restRemainingMs` 4 660, state after `adjustRest +` 568, after `adjustRest −` 584; **0** in `resolveRest`, `completeSet`, `skipSet`, `undo`, `endRestEarly`, `isExpired` |

So the cap changes values only when `now < rest.startedAt`. Then `adjustRest` adds or removes 15 s from the value the user sees (`durationMs`), which matches the view. With a forward clock the two engines are identical.

### Mutant table — remaining clauses (spot re-check, round 1 already ran 39)

| Id | Wrong implementation | Result | Killing test(s) |
| :-- | :-- | :-- | :-- |
| D1 | `isLastSet: cursor === sets.length` | KILLED | `:160`, `:170` |
| D2 | rest time from the NEXT exercise | KILLED | 8 tests, e.g. `:216`, `:226` |
| D3 | `isExpired` with `>=` | KILLED | `:482`, `:490` |
| D4 | `resolveRest` stamps `lastActivityAt` | KILLED | `:293`, `:502` |
| D5 | `adjustRest` extends a rest that ran out | KILLED | `:463` |
| D6 | `adjustRest` without the clamp | KILLED | `:434`, `:455` |
| D7 | `undo` keeps the rest | KILLED | `:345` |
| D8 | `undo` allowed when finished | KILLED | `:409` |
| D9 | plan exercises aliased (no copy) | KILLED | `:79`, `:98` |
| D13 | `setsLeft` without the current set | KILLED | 8 tests |
| D15 | `skipSet` starts a rest | KILLED | 5 tests |
| D16 | `endRestEarly` without the stamp | KILLED | `:304`, `:490` |
| D17 | `resolveRest` ends 1 s early | KILLED | `:277` |
| D18 | `adjustRest` keeps the old `startedAt` | KILLED | `:419`, `:427` |
| N1 | stamp removed from the shared `base` in `markCurrent` | KILLED | 4 tests, e.g. `:231`, `:320` |
| N2 | stamp removed from the non-ending `adjustRest` return | KILLED | `:419`, `:490` |
| N3 | rest view describes the FINISHED set (whole `exercise`/`next` lookup) | KILLED | `:182` |
| D10 | finished branch overrides `lastActivityAt: state.lastActivityAt` | SURVIVED | — see `last-activity-stamp-branch-unasserted` |
| D11 | non-ending `adjustRest` stamps only when `deltaMs > 0` | SURVIVED | — see `last-activity-stamp-branch-unasserted` |
| D12 | in rest only `view.exerciseName` = the finished exercise | SURVIVED | — see `rest-view-fields-unasserted` |
| D14 | `canUndo = undoStack.length > 0` (drop the finished check) | SURVIVED (equivalent) | — see `canundo-dead-finished-check` |

### Manual

None for this phase.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | yes |
| D2 | Are all relevant types of documentation covered? | yes |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | yes, one Nit |
| I1 | Does it satisfy the original requirements? | yes |
| I2 | Is it logically correct? | yes |
| I3 | Is there no unnecessary complexity? | yes, one Nit |
| I4 | Is it robust (concurrency, error handling, …)? | yes |
| I5 | Is it performant? | yes |
| I6 | Is it secure (SQL injection, …)? | n/a |
| I7 | Is it observable (metrics, logging, tracing, …)? | n/a |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | n/a — no new dependency |

Blockers: 0 · Major: 0 · Minor: 2 · Nit: 2

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** yes

The module docblock (`engine.ts:3-9`) states the pure, timestamp-only contract. Each state and view field that is not obvious has a docblock.

### D2. Are all relevant types of documentation covered?

**Verdict:** yes

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no user-facing change |
| CLAUDE.md | no | — | no new command or rule |
| ADR | no | — | brief run, no ADRs |
| TSDoc / API | yes | yes | `engine.ts` field and function docblocks |
| Query header comments | n/a | — | |
| E2E rules / selectors | n/a | — | no UI in this phase |
| Translations | n/a | — | no UI text in this phase |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** yes, one Nit

- **[Nit]** `docblock-new-state-on-noop` — `engine.ts:4-5` — the docblock says every function "returns a NEW state". The no-op paths return the input object itself (`engine.ts:185`, `:220`, `:221`, `:226`, `:231`, `:249`). The tests compare with `toEqual`, so they accept both. The code behaviour is fine (same object on no-op is useful to a caller). Only the wording is not exact: "returns a new state, or the same state when nothing changes".

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** yes

| Requirement (Phase 4 slice details) | Implemented in | Status |
| :-- | :-- | :-- |
| pure functions, explicit `now` | `engine.ts:89-260` | met |
| serialisable state, `version: 1`, plan copy, flat sets with status, cursor, mode, rest, undo stack, `lastActivityAt` | `engine.ts:44-60`, `:89-123` | met (JSON round trip `engine.test.ts:104`) |
| `getView`: name, reps, sets left incl. current, next exercise or none, last-set flag, remaining rest | `engine.ts:129-172` | met |
| `completeSet`: last set → finished, 0 s → next set, else rest with the finished exercise's rest | `engine.ts:179-212` | met |
| `resolveRest`, `endRestEarly` | `engine.ts:219-228` | met |
| `skipSet`: skipped, no rest, last → finished | `engine.ts:214-216` | met |
| `undo`: cursor back, pending, rest cleared; no-op on empty stack or finished | `engine.ts:230-242` | met |
| `adjustRest(±15000)`: never below 0, 0 ends the rest | `engine.ts:248-256` | met |
| `isExpired`: more than 2 h | `engine.ts:258-260` | met |
| every user action stamps `lastActivityAt`; the rest ending by itself does not | `engine.ts:193`, `:227`, `:240`, `:253`, `:255`; `:222` | met |

### I2. Is it logically correct?

**Verdict:** yes

No input or state found that gives a wrong result. The differential probe above (183 k steps) found no divergence with a forward clock. Clock moved back: the cap keeps the remaining rest at most `durationMs`, as intended.

### I3. Is there no unnecessary complexity?

**Verdict:** yes, one Nit

- **[Nit]** `canundo-dead-finished-check` — `engine.ts:130` — `state.mode !== 'finished' &&` never decides the result: the finished branch at `:132-145` returns the literal `canUndo: false`. Mutant D14 (drop the check) is equivalent and all 55 tests pass. Harmless; one of the two checks can go.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** yes

`startWorkout` throws on a plan with no exercises or an invalid set count (`engine.ts:90-96`), so it never builds a state with no sets. Every action is a no-op in the wrong mode. Functions do not mutate their input (`engine.test.ts:511`).

### I5. Is it performant?

**Verdict:** yes

`getView` filters the flat set list once (`engine.ts:149`). Sets per plan are bounded (≤ 20 per exercise by plan validation), so the cost per render is trivial.

### I6. Is it secure (SQL injection, …)?

**Verdict:** n/a — pure functions, no input from outside the device, no storage in this phase.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** n/a — a pure engine; no logging is expected.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** n/a

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |
| — | — | — | — | `package.json` and `package-lock.json` unchanged |

---

## Test adequacy — residual gaps (not sent back)

- **[Minor]** `last-activity-stamp-branch-unasserted` — `src/workout/engine.test.ts:490-500` — the brief clause "Every user action sets `lastActivityAt = now`" has no assertion on two branches: the finishing `completeSet`/`skipSet` (`engine.ts:196`) and the non-ending `−15 s` (`engine.ts:255`). Mutants D10 and D11 survive. They need an explicit override in one branch. The natural mistakes (N1: drop the stamp from the shared `base`; N2: drop it from the `adjustRest` return) are both killed, so the stamp is pinned where it lives. Effect of the gap: small. A finished workout is a final state, and the `−15 s` path shares one line with `+15 s`. A one-line fix: assert `lastActivityAt` after the finishing `completeSet` at `engine.test.ts:244` and after the `−15 s` at `:429`.
- **[Minor]** `rest-view-fields-unasserted` — `src/workout/engine.test.ts:182-195` — the docblock at `engine.ts:71` says `exerciseName` in rest is "the exercise of the set that comes next". No test reads `view.exerciseName`, `reps`, `setsLeft` or `nextExerciseName` while `mode === 'rest'`; only `restNext` is asserted. Mutant D12 (override only `exerciseName` in rest with the finished exercise) survives. The natural mistake (N3: the whole rest view describes the finished set) is killed through `restNext`. DESIGN.md "Przerwa" shows only the time and "Dalej:" with the next set and exercise, which is `restNext` and is pinned. Add one `toMatchObject` on the crossing rest at `:189` to pin the docblock.

## Architecture — the project's own rules

- "Rest time comes from timestamps. … Never count timer ticks." → meets — `restRemaining` (`engine.ts:125-127`) uses only `startedAt`, `durationMs`, `now`; tests `:259-275` move `now` with no calls in between.
- "A running workout keeps its own copy of the plan" (D7) → meets — `engine.ts:93-103` copies each field; mutant D9 killed.
- "A stored shape is versioned" → meets — `version: 1` (`engine.ts:45`, `:111`); storage arrives in Phase 6.
- `erasableSyntaxOnly`, no `enum`/`namespace` → meets — string unions only; `npm run build` passes.
- No UI, no storage, no network in this phase → meets.
- NEVER-WEAKEN list → meets — no `@ts-*` comment, no `as any`, no skip/only/todo, no tsconfig change.

## Not reviewed

- Browser behaviour: this phase has no UI and no manual items.
- How Phases 5–7 will use `getView` in rest mode (see `rest-view-fields-unasserted`): those screens do not exist yet.

## Observations outside scope

- `brief.md` working-tree diff also appends `— c8b1567` to the Phase 3 rows. This is the orchestrator's commit-hash stamp from the previous phase, not this phase's builder.
- `curl -s -m 1 localhost:4199` returned exit 28 (timeout), not 7 (refused). This review started no server; the process on or behind that port is not this review's and was not touched.
