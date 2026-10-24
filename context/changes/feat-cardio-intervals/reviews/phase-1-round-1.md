# Phase review — feat-cardio-intervals · Phase 1: Cardio plan model and storage · round 1

- **Scope:** `src/plans/plan.ts`, `src/plans/planStore.ts`, `src/App.vue`, `src/components/PlanList.vue`, `src/plans/cardioPlan.test.ts`, `src/plans/cardioPlanStore.test.ts`, `src/components/CardioStored.test.ts` · **Files reviewed:** 7 (`+810/-32`; tracked `+292/-32`, new test files 518 lines)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 1: Cardio plan model and storage` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** FAIL
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none, none

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 1.1 | `src/plans` tests pass, with the new cardio tests | `npx vitest run src/plans` | pass |
| 1.2 | full suite, 0 failing (baseline 0, 439 tests, 20 files) | `npm test` | pass |
| 1.3 | type check and build | `npm run build` | pass |

- 1.1 log: `Test Files  5 passed (5)` · `Tests  159 passed (159)`. No skipped tests.
- 1.2 log: `Test Files  23 passed (23)` · `Tests  497 passed (497)`. The baseline had 0 failures. The count grew by 58 tests and 3 files. No skipped tests. No failing file.
- 1.3 log: `vue-tsc -b && vite build` exit 0, `✓ built in 236ms`, `precache  23 entries (320.09 KiB)`. A green build proves types only (runner trap). The behaviour evidence comes from 1.1, 1.2 and the experiments below.

### Manual (walked by: nobody — the brief lists no manual items for this phase)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| — | none | — | — |

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All runs used scratch copies under `<scratch-dir>/critic-p1-r1/mut-*` (recipe from the brief's runner traps). `mutate.mjs` stops when the target text is not found exactly once, so every mutant below did apply. The control copy (no mutation, plus the critic probe file) gave `Test Files  7 passed (7)` · `Tests  165 passed (165)`.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| M1 | `App.vue:41` without `!isCardioPlan(plan)` (Start guard removed) | coordinator | `Tests  4 passed (4)` · `Errors  1 error` · `TypeError: Cannot read properties of undefined (reading 'length')` at `startWorkout src/workout/engine.ts:90`, last test "Start on a cardio card starts no workout" | The test stays green. Only Vitest's unhandled-error report goes red. Finding `cardio-start-guard-unpinned`. |
| M2 | `App.vue:48` cardio return removed (Edit guard) | coordinator | `× Edytuj on a cardio card opens no strength editor` · `TypeError: Cannot read properties of undefined (reading 'map')` | The test itself goes red. Pinned. |
| M3 | `planStore.ts:113` `else if (true)` — every unknown `type` loads as strength | coordinator | suite in `src/plans`: 160 passed; only the critic probe failed: `AssertionError: expected [ 'good', 'x' ] to deeply equal [ 'good' ]` | The behaviour changed (a `type: 'swim'` plan is listed), but the test "an unknown plan type is skipped" stays green. Finding `unknown-plan-type-test-vacuous`. |
| M4 | `planStore.ts:60` `typeof name !== 'string'` removed from `toInterval` | coordinator | suite in `src/plans`: 160 passed; only the probe failed: `expected [Function] to not throw an error but 'TypeError: Cannot read properties of …' was thrown` · `"TypeError: Cannot read properties of undefined (reading 'trim')"` | With the guard gone, one bad stored interval makes `listAllPlans()` throw. No test sees it. Finding `cardio-interval-missing-field-unpinned`. |
| M5 | `expandCardioPlan` interleaved (each interval repeated in place) | coordinator | `× repeats each block in order and keeps name, seconds and kind only` | Wrong implementation diverges. |
| M6 | `expandCardioPlan` ignores `repeat` | coordinator | 4 failed, e.g. `expected '2 interwały, 1:00' to be '16 interwałów, 8:00'` | Diverges in unit and component tests. |
| M7 | summary counts intervals before repeats | coordinator | `× shows the interval count after repeats and the total time as m:ss` · `expected 'PlanySiła1 ćwiczenie, 3 serie Start  …' to contain '16 interwałów, 8:00'` | Diverges. |
| M8 | `clonePlan` cardio shares the interval array (shallow) | coordinator | `× copies blocks and intervals deeply and keeps the type` · `expected 60 to be 30` | Pinned. |
| M9 | `cleanPlan` does not trim interval names | coordinator | `expected '  Sprint  ' to be 'Sprint'` | Pinned. |
| M10 | the 5 s step check removed | coordinator | 4 failed, e.g. `× rejects 7 seconds` · `× an interval time off the 5 s step is skipped…` | Pinned in validation and in storage. |
| M11 | `expandCardioPlan` keeps the interval `id` | coordinator | `expected [ { id: 'i1', …(3) }, …(4) ] to deeply equal [ { name: 'Rozgrzewka', …(2) }, …(4) ]` | Diverges. |
| M12 | `toStrengthPlan` always drops `type` | coordinator | `× a strength plan stored with type "strength" keeps it` · `expected undefined to be 'strength'` | Pinned. |
| M13 | `cleanPlan` always writes `type: 'strength'` | coordinator | 5 failed, e.g. `× saving a strength plan with no type does not add a type to what is stored` | Pinned. |
| M14 | `listPlans` does not filter out cardio | coordinator | `× listPlans and getPlan return strength plans only` · `expected [ 'c1', 's1' ] to deeply equal [ 's1' ]` | Pinned. |

Wrong-implementation table for the new pure functions (`expandCardioPlan`, the cardio `summarizePlan`): interleaved repeat (M5), no repeat (M6), count before repeat (M7), extra fields kept (M11). Each one diverges in at least one test. No finding.

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | New exports carry docblocks; the `ValidationError.path` doc lists the cardio paths. |
| D2 | All documentation types covered? | n/a | No route, command, config key or user-facing doc changes in this phase. |
| D3 | Documentation understandable? | pass | Docblocks match the code. |
| I1 | Satisfies the requirements? | concerns | All clauses have code. `Plan` is not the union the brief names; the union is `AnyPlan` and the strength `type` is optional (Minor). |
| I2 | Logically correct? | pass | Validation limits, paths, Polish plurals, repeat expansion and old-shape load are correct; mutants M5–M14 confirm. |
| I3 | No unnecessary complexity? | pass | `listPlans`/`getPlan` became strength-only wrappers; small and named. |
| I4 | Robust? | pass | Bad cardio data takes the unreadable and corrupt-copy path; the type guards in `toInterval`/`toBlock` keep `listAllPlans` from throwing. |
| I5 | Performant? | pass | One `localStorage` read per call, as before; a handful of plans. |
| I6 | Secure? | n/a | No input from the network, no HTML output. |
| I7 | Observable? | n/a | No logging pattern in the store; unchanged. |
| I8 | New dependencies? | pass | `package.json` and `package-lock.json` unchanged. |
| ARCH | Project rules | pass | See the architecture lines below. |

Architecture — the project's own rules:

- Storage keys stay `trening.plans.v1` / version 1 — meets (`planStore.ts:13-15`; pinned by "keeps the key and version…").
- Data stored before this change stays readable — meets (old-shape literal test `cardioPlanStore.test.ts:36`; M12, M13).
- The corrupt-copy step stays — meets (`cardioPlanStore.test.ts:191`, `:202`).
- No new dependency, no server, no API call — meets.
- No `enum`, `namespace` or parameter properties; overloads only — meets (build green).
- Existing strength tests unchanged; no skip, focus or suppression in the diff — meets (grep of the diff and new files for the never-weaken patterns: no match).
- Polish UI text — meets (validation messages in Polish).
- UI and DESIGN.md — n/a: `PlanList.vue` changes only the prop type; no visual change.
- Out of scope — meets: no cardio UI, no strength editor change.

Blockers: 0 · Major: 3 · Minor: 1 · Nit: 0
Findings going back to a builder: `cardio-start-guard-unpinned`, `unknown-plan-type-test-vacuous`, `cardio-interval-missing-field-unpinned`.

## Findings

### I1. Satisfies the requirements?

- **[Minor]** `plan-union-shape-deviates` — `src/plans/plan.ts:11-17`, `:42` — The brief says "make `Plan` a union. Strength keeps today's shape plus `type: 'strength'`". The code keeps `Plan` as the strength type with an optional `type?: 'strength'`, adds the union as `AnyPlan`, and never writes `type: 'strength'` for a new strength plan (`createPlan()` and `cleanPlan` leave it out). The behaviour the brief asks for works: a plan with no type loads as strength, and `isCardioPlan` narrows. **Fails when:** a later phase follows the brief literally and checks `plan.type === 'strength'`; every strength plan the app writes has no `type`, so that check is false for all of them. Later phases must use `isCardioPlan` / `AnyPlan`. confidence: medium.

### Test adequacy (§3, project traps)

- **[Major]** `cardio-start-guard-unpinned` — `src/components/CardioStored.test.ts:54-62` (guard at `src/App.vue:41`) — The test "Start on a cardio card starts no workout" stays green when the `!isCardioPlan(plan)` guard is removed (M1: `Tests  4 passed (4)`). Without the guard, `startWorkout` throws before it writes, so `WORKOUT_KEY` stays `null` and the list stays, and both assertions still hold. Only Vitest's run-level "Unhandled Errors" report goes red. This is the project trap `vacuous-no-registration-assertion`: the assertion itself must go red when the guard is removed. **Fails when:** the guard is lost in a refactor → a tap on Start of a cardio card throws a `TypeError` in the click handler, and this test still passes. A fix: make the test fail on the thrown error itself (for example, an `errorHandler` in the mount's `global.config` that records errors, then `expect(errors).toEqual([])`).

- **[Major]** `unknown-plan-type-test-vacuous` — `src/plans/cardioPlanStore.test.ts:174` — The case "an unknown plan type" uses `{ ...cardio('bad'), type: 'swim' }`. This fixture has no `exercises`, so it is unreadable for a second reason. With the type check removed (M3: every unknown `type` loads as strength), the test stays green; the critic probe shows the behaviour changed (`expected [ 'good', 'x' ] to deeply equal [ 'good' ]`). The test name claims a case its input does not isolate. **Fails when:** the `else { return null }` branch at `src/plans/planStore.ts:115-117` is lost → a plan with an unknown type and valid `exercises` loads as a strength plan without its type, it is not marked unreadable, no corrupt copy is made, and the next save writes it back as a plain strength plan (its original data is lost). A fix: give the fixture valid `exercises` (and no `blocks`), so only the type makes it unreadable.

- **[Major]** `cardio-interval-missing-field-unpinned` — `src/plans/cardioPlanStore.test.ts:167-189` (guard at `src/plans/planStore.ts:60`) — The unreadable-data table covers a bad `blocks`, a missing `intervals` list, an unknown `kind`, no blocks and an off-step time. It has no interval with a missing or non-string `name` (and no block or interval with a missing `id`). With `typeof name !== 'string'` removed from `toInterval` (M4), the suite stays green, but `listAllPlans()` throws `TypeError: Cannot read properties of undefined (reading 'trim')` from `validatePlan`. That breaks the docblock clause "Never throws; missing or unreadable data gives what could be read" (`planStore.ts:148`). This is the §3 item "empty, null and missing input on every boundary the phase added". **Fails when:** the name guard is lost → one stored cardio interval without a `name` makes `App.vue` throw at setup (`listAllPlans()` at line 17), and the app shows a blank screen for every plan. A fix: add rows for an interval without `name` and a block/interval without `id` to the table.

## Not reviewed

- No browser walk: the brief lists no manual items for this phase (D2 browser walks belong to later phases).
- No walker and no prover were spawned: no manual items, and the coordinator ran all experiments in one scripted command (`<scratch-dir>/critic-p1-r1/mutants.sh`).
- `getPlan`/`listPlans` have no production caller after this change (`App.vue` now uses `listAllPlans`); `getPlan` had none before either. Not judged as a finding.

## Observations outside scope

- Rollback risk (follows from keeping `PLANS_VERSION = 1`, which the brief requires): if the owner rolls back to an image from before this change after saving a cardio plan, the old `toPlan` reads that plan as unreadable (no `exercises`). Its next save copies the stored data to `trening.plans.corrupt.<timestamp>` and drops the cardio plan from the list. The data stays only in the corrupt copy. `docs/deploy.md` rollback steps do not mention this.
- The same missing-field gap exists for strength exercises in the older `src/plans/planStore.test.ts` (no exercise with a non-string `name`). It is older than this phase.
