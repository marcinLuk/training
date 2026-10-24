# Phase review — feat-cardio-intervals · Phase 1: Cardio plan model and storage · round 2

- **Scope:** `src/plans/plan.ts`, `src/plans/planStore.ts`, `src/App.vue`, `src/components/PlanList.vue`, `src/plans/cardioPlan.test.ts`, `src/plans/cardioPlanStore.test.ts`, `src/components/CardioStored.test.ts` · **Files reviewed:** 7 (tracked `+292/-32`, the same as round 1; new test files 540 lines)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 1: Cardio plan model and storage` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none, none

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 1.1 | `src/plans` tests pass, with the new cardio tests | `npx vitest run src/plans` | pass |
| 1.2 | full suite, 0 failing (baseline 0, 439 tests, 20 files) | `npm test` | pass |
| 1.3 | type check and build | `npm run build` | pass |

- 1.1 log: `Test Files  5 passed (5)` · `Tests  163 passed (163)`. No skipped tests. Round 1 had 159; the 4 new rows are the new unreadable-data cases.
- 1.2 log: `Test Files  23 passed (23)` · `Tests  501 passed (501)`. Baseline: 0 failing. No skipped test, no failing file.
- 1.3 log: `vue-tsc -b && vite build`, exit 0, `✓ built in 217ms`, `precache  23 entries (320.09 KiB)`. A green build proves types only (runner trap). The behaviour evidence comes from 1.1, 1.2 and the experiments.

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `cardio-start-guard-unpinned` | round 1 | closed | C1: the Start guard at `App.vue:41` removed → `× Start on a cardio card starts no workout`, `AssertionError: expected [ …(1) ] to deeply equal []` with `TypeError … (reading 'length')` at `CardioStored.test.ts:65:20` (`expect(errors).toEqual([])`). The log has no "Unhandled" line, so the assertion itself goes red. |
| `unknown-plan-type-test-vacuous` | round 1 | closed | C2: `planStore.ts:113` changed to `else if (true)` → `× an unknown plan type with valid exercises is skipped…`, `AssertionError: expected [ 'good', 'bad', 'c-good' ] to deeply equal [ 'good', 'c-good' ]` at `cardioPlanStore.test.ts:201:19`. The fixture now has valid `exercises`, so only the type makes it unreadable. |
| `cardio-interval-missing-field-unpinned` | round 1 | closed | C3: `typeof name !== 'string'` removed from `toInterval` → 2 rows red: `TypeError: Cannot read properties of undefined (reading 'trim')` and `TypeError: interval.name.trim is not a function`. C4 (interval `id` check removed) and C5 (block `id` check removed) → each red with `expected [ 'good', 'bad', 'c-good' ] to deeply equal [ 'good', 'c-good' ]`. |

### Manual (walked by: nobody — the brief lists no manual items for this phase)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| — | none | — | — |

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All runs used fresh scratch copies under `<scratch-dir>/critic-p1-r2/mut-*` (recipe from the brief's runner traps). Each run: `./node_modules/.bin/vitest run src/plans/cardioPlanStore.test.ts src/components/CardioStored.test.ts`. `mutate.mjs` stops when the search text is not found exactly once; every mutant printed `MUTATED`.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| control | unchanged copy | coordinator | `Tests  28 passed (28)` · exit 0 | The copy is green before a mutation. |
| C1 | `App.vue:41` without `!isCardioPlan(plan)` | coordinator | `Tests  1 failed \| 27 passed (28)` · `AssertionError: expected [ …(1) ] to deeply equal []` at `CardioStored.test.ts:65:20` | Closes `cardio-start-guard-unpinned`. |
| C2 | unknown `type` loads as strength | coordinator | `Tests  1 failed \| 27 passed (28)` · `expected [ 'good', 'bad', 'c-good' ] to deeply equal [ 'good', 'c-good' ]` | Closes `unknown-plan-type-test-vacuous`. |
| C3 | interval name type check removed | coordinator | `Tests  2 failed \| 26 passed (28)` · `TypeError: Cannot read properties of undefined (reading 'trim')` · `TypeError: interval.name.trim is not a function` | Closes the name part of `cardio-interval-missing-field-unpinned`. The red is the "never throws" clause failing. |
| C4 | interval `id` check removed | coordinator | `Tests  1 failed \| 27 passed (28)` · `× an interval with no id is skipped…` | Pinned. |
| C5 | block `id` check removed | coordinator | `Tests  1 failed \| 27 passed (28)` · `× a block with no id is skipped…` | Pinned. |
| C6 | `App.vue:48` cardio return removed (Edit guard) | coordinator | `Tests  1 failed \| 27 passed (28)` · `AssertionError: expected [] to have a length of 1 but got +0` at `CardioStored.test.ts:76:38` | The new `errorHandler` collects errors for every test in the file. This run shows the Edit test still goes red on its own assertion. |

No run had a skipped test. The skip count stayed at 0.

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | New exports carry docblocks; production code is the same as in round 1. |
| D2 | All documentation types covered? | n/a | No route, command, config key or user doc changes. |
| D3 | Documentation understandable? | pass | Docblocks match the code. |
| I1 | Satisfies the requirements? | concerns | All clauses have code. `plan-union-shape-deviates` (Minor) is still present. |
| I2 | Logically correct? | pass | No production change since round 1; round 1 mutants M5–M14 still apply. |
| I3 | No unnecessary complexity? | pass | No change. |
| I4 | Robust? | pass | Bad cardio data takes the unreadable and corrupt-copy path; C3–C5 now pin the field guards. |
| I5 | Performant? | pass | One `localStorage` read per call; a few plans. |
| I6 | Secure? | n/a | No network input, no HTML output. |
| I7 | Observable? | n/a | The store has no logging pattern; unchanged. |
| I8 | New dependencies? | pass | `package.json` and `package-lock.json` unchanged (`git diff --quiet HEAD` exit 0). |
| ARCH | Project rules | pass | See below. |

Architecture — the project's own rules:

- Storage keys stay `trening.plans.v1` / version 1 — meets (`planStore.ts:13-15`; test "keeps the key and version…").
- Data stored before this change stays readable — meets (old-shape literal test, `cardioPlanStore.test.ts:36`).
- The corrupt-copy step stays — meets (`cardioPlanStore.test.ts:207`, `:218`).
- No new dependency, no server, no API call — meets.
- No `enum`, `namespace` or parameter properties — meets (build green).
- Existing strength tests unchanged; no skip, focus or suppression — meets. A grep of the 6 changed `.ts`/`.vue` files for the never-weaken patterns found only `@skip="workout.skip"` in `App.vue:72`, an event name that existed before.
- Test-adequacy traps: lookups by id use three plans (`cardioPlanStore.test.ts:123`); fixtures come from `createCardioPlan`/`createExercise` or old-shape literals; Polish names are used ("Wiosłowanie", "Schłodzenie żółwie") — meets.
- UI and DESIGN.md — n/a: `PlanList.vue` changes only the prop type.
- Out of scope — meets: no cardio UI, no strength editor change.

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 0
Findings going back to a builder: none.

## Findings

### I1. Satisfies the requirements?

- **[Minor]** `plan-union-shape-deviates` — `src/plans/plan.ts:11-17`, `:42` — Still present from round 1. The brief says "make `Plan` a union. Strength keeps today's shape plus `type: 'strength'`". The code keeps `Plan` as the strength type with an optional `type?: 'strength'` and adds the union as `AnyPlan`. `createPlan()` and `cleanPlan` never write `type: 'strength'` for a new strength plan. The behaviour the brief asks for works. **Fails when:** a later phase follows the brief literally and checks `plan.type === 'strength'`; every strength plan the app writes has no `type`, so that check is false for all of them. Later phases must use `isCardioPlan` / `AnyPlan`. confidence: medium.

## Not reviewed

- No browser walk: the brief lists no manual items for this phase.
- No walker and no prover were spawned. There were no manual items. The coordinator ran all 7 experiment runs in one script (`<scratch-dir>/critic-p1-r2/mutants.sh`) instead of a prover.
- The production files have the same diff stat as in round 1 (`4 files changed, 292 insertions(+), 32 deletions(-)`), and the code in the bundle matches the round 1 findings line for line. I did not compare bytes. This round did not repeat the round 1 mutants M2–M14 except M2 (as C6). Their result stands from round 1.

## Observations outside scope

- Rollback risk (round 1, still true): after a rollback to an image from before this change, the old `toPlan` reads a saved cardio plan as unreadable. The next save copies the data to `trening.plans.corrupt.<timestamp>` and drops the cardio plan from the list. `docs/deploy.md` rollback steps do not mention this.
- The older `src/plans/planStore.test.ts` has no strength exercise with a non-string `name`. It is older than this phase.
