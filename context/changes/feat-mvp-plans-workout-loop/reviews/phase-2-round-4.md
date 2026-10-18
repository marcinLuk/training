# Phase review — feat-mvp-plans-workout-loop · Phase 2: Plan model and device storage · round 4

- **Scope:** working tree vs `HEAD` (5eff3e6): new untracked `src/plans/plan.ts`, `src/plans/plan.test.ts`, `src/plans/planStore.ts`, `src/plans/planStore.test.ts`, `src/lib/storage.ts`; `brief.md` Progress rows 2.1–2.2
- **Files reviewed:** 6 (`+771/-2` lines; 769 new lines in 5 code files, 2 changed checkbox lines in brief.md)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 2` Progress rows 2.1–2.2 and `## Slice details` → `### Phase 2`; Done-when D2, D9
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | `npx vitest run src/plans` passes, with tests for the defaults, the validation, a save read back through a fresh read of `localStorage`, corrupt stored data kept and not overwritten, and `navigator.storage.persist()` called at the first save only (D2, D9) | `timeout 300 npx vitest run src/plans` | pass |
| 2.2 | `npm run build` exits 0 | `timeout 300 npm run build` | pass |

2.1 output (last lines), exit 0:

```
 Test Files  2 passed (2)
      Tests  96 passed (96)
EXIT=0
```

The verbose reporter lists 96 passing cases. No case is skipped or todo. `grep -rnE '\.(skip|only|todo)\b|describe\.skip|it\.skip' src` finds nothing (exit 1).

Each named topic in 2.1 has its own tests:
- Defaults: `plan.test.ts:24-30`.
- Validation: `plan.test.ts:39-99`.
- Fresh read: `planStore.test.ts:100-112`. It calls `vi.resetModules()` and imports the module again, then reads `localStorage`.
- Corrupt data kept: `planStore.test.ts:43-54` and `:153-214`.
- Persist at the first save only: `planStore.test.ts:224-233` and `:288-300`.

2.2 output, exit 0. The script is `vue-tsc -b && vite build`, and `vue-tsc -b` ran first:

```
> trening@0.0.0 build
> vue-tsc -b && vite build
...
✓ built in 116ms
EXIT=0
```

### Closures (rounds after the first)

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `summary-set-plural-unpinned` | round 3 | yes | Mutant M1 in a scratch copy changed `plan.ts:125` to `pluralPl(exerciseCount, 'seria', 'serie', 'serii')`, so the set word follows the exercise count. `vitest run src/plans` → `8 failed \| 88 passed (96)`. Failing cases: `summarises sets [3] as "1 ćwiczenie, 3 serie"`, `[5] as "1 ćwiczenie, 5 serii"`, `[3,3] as "2 ćwiczenia, 6 serii"` (and 5 more). The mirror mutant M4 (exercise word follows the set count) is also killed (8 failed). M2 (set count = exercise count) and M3 (set count sums reps) are killed too (12 and 20 failed). |

Closed ids from earlier rounds, checked again with mutants. All are still closed:
- `rest-step-15-unpinned`: M7 (step check removed) is killed (4 failed). M8 (step 30 s) is killed (5 failed).
- `partial-read-writeback-unpinned`: S5 (a dropped plan does not mark the data unreadable) is killed by `a plan dropped for its shape stays in the corrupt copy`.
- `getplan-by-id-unpinned`: S6 (`getPlan` returns the first plan) is killed (2 failed).
- `plural-one-only-for-1-unpinned`: M6 (the "one" form also for 21, 31, 101) is killed (6 failed).

None of these ids came back.

Full wrong-implementation table. Each mutant ran on a scratch copy (`scratchpad/mutant`, with `node_modules` as a symlink) with `./node_modules/.bin/vitest run src/plans`. The production files were not changed.

| id | Wrong implementation | Result |
| :-- | :-- | :-- |
| M1 | set word follows the exercise count (closure) | KILLED 8/96 |
| M2 | set count = number of exercises | KILLED 12/96 |
| M3 | set count sums reps | KILLED 20/96 |
| M4 | exercise word follows the set count | KILLED 8/96 |
| M5 | "few" form without the 12–14 exclusion | KILLED 8/96 |
| M6 | "one" form for 21, 31, … | KILLED 6/96 |
| M7 | rest step not checked | KILLED 4/96 |
| M8 | rest step 30 s | KILLED 5/96 |
| M9 | upper limit exclusive (`< max`) | KILLED 1/96 |
| M10 | lower limit exclusive (`> min`) | KILLED 1/96 |
| M11 | plan name not trimmed in validation | KILLED 1/96 |
| M12 | exercise name not trimmed in validation | KILLED 1/96 |
| M13 | default rest 60 s | KILLED 1/96 |
| S1 | no corrupt copy before the write | KILLED 5/96 |
| S2 | `persist()` on every save | KILLED 1/96 |
| S3 | `persist()` called before the write (a failed write uses up the request) | KILLED 1/96 |
| S4 | `persist()` rejection not handled | KILLED 1/96 |
| S5 | a dropped plan does not mark the data unreadable | KILLED 1/96 |
| S6 | `getPlan` returns the first plan | KILLED 2/96 |
| S7 | save always appends (no replace by id) | KILLED 1/96 |
| S8 | stored plan name not trimmed | KILLED 1/96 |
| S9 | corrupt key ignores the injected `now` | KILLED 4/96 |
| S10 | version not checked | KILLED 1/96 |
| S11 | stored plans not checked against the limits | KILLED 1/96 |
| S12 | `readRaw` lets a `getItem` throw escape | KILLED 1/96 |
| S13 | failed corrupt copy ignored, the write goes ahead | KILLED 1/96 |
| S14 | invalid plan saved | KILLED 2/96 |
| S15 | exercise names not trimmed (shared reference stored) | KILLED 1/96 |

All 28 mutants are killed. Every clause in the brief's Phase 2 slice details and in the code's docblocks has a failing assertion when it is broken.

### Manual (performed with playwright-cli)

None. Phase 2 has no manual items. No browser session was opened.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | PASS (1 Nit) |
| I3 | Is there no unnecessary complexity? | PASS (1 Nit) |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 0 · Minor: 0 · Nit: 3

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

The public functions have clear names. Docblocks state the contracts that are not obvious:
- `ValidationError.path` and `message` (`plan.ts:25-30`).
- The plural rule (`plan.ts:109`).
- "Never throws" on read (`planStore.ts:85`).
- Persist once per page load (`planStore.ts:96-99`).
- Copy before write, and no write when the copy fails (`planStore.ts:116-120`).
- The storage helpers (`storage.ts:1-5`, `:33-36`).

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no setup or command change |
| CLAUDE.md | no | — | no new rule or command; the storage rules are already in CLAUDE.md and brief.md |
| ADR | no | — | the repo keeps no ADRs for this run |
| Docblocks / API | yes | yes | see D1 |
| Query header comments | n/a | — | no SQL |
| E2E rules / selectors | n/a | — | no UI in this phase |
| Translations | n/a | — | Polish strings are literals by design (single-language app) |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The Polish messages are correct: "Wpisz nazwę planu.", "Dodaj co najmniej jedno ćwiczenie.", "Wpisz nazwę ćwiczenia 2.", "Ćwiczenie 1: ustaw przerwę od 0 do 600 s, co 15 s.". Each message names the fix, as the brief asks.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 2 slice details) | Implemented in | Status |
| :-- | :-- | :-- |
| Types `Plan { id, name, exercises }`, `Exercise { id, name, sets, reps, restSeconds }` | `plan.ts:1-13` | met |
| Defaults 3 sets, 10 reps, 90 s | `plan.ts:15-17`, `:40-48` | met |
| Limits: sets 1–20, reps 1–100, rest 0–600 s in 15 s steps | `plan.ts:19-23`, `:54-63`, `:86-103` | met |
| Validation with Polish messages that name the fix (empty name after trim, empty exercise name, no exercises) | `plan.ts:65-107` | met |
| Summary with Polish plural forms | `plan.ts:110-127` | met |
| Key `trening.plans.v1` holding `{ version: 1, plans }` | `planStore.ts:4-11`, `:111-114` | met |
| `listPlans()`, `getPlan(id)`, `savePlan(plan)` insert or replace by id | `planStore.ts:86-92`, `:121-148` | met |
| Ids from `crypto.randomUUID()` | `plan.ts:32-38` | met |
| Missing key → empty list | `planStore.ts:60` | met |
| Corrupt or unknown version → empty list; raw value copied to `trening.plans.corrupt.<timestamp>` before the first write | `planStore.ts:62-70`, `:124-130` | met |
| `persist()` once at the first save, only when the API exists, a rejection does not block the save | `planStore.ts:94-109`, `:145-146` | met |
| Tests in `src/plans/*.test.ts` | `plan.test.ts`, `planStore.test.ts` | met |

The phase builds no UI, so no DESIGN.md rule applies. The phase adds no dependency, no network call and no out-of-scope feature.

### I2. Is it logically correct?

**Verdict:** PASS (1 Nit)

I looked for inputs that give a wrong result: off-by-one limits, plural forms, replace vs. append, a partly broken document, a failed write after a good copy, and a `persist()` that is missing, throws or rejects. Each case gives the right result, and the mutation table shows that each one is pinned.

- **[nit]** `persist-once-per-page-load` — `planStore.ts:94-109`. The flag lives in module scope, so the app calls `persist()` at the first save of every page load, not once per device. The brief says "once, at the first save". The docblock states the per-load behaviour honestly, and `persist()` is idempotent, so the owner loses nothing. I report it only because the docblock and the brief word the rule in different ways.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS (1 Nit)

- **[nit]** `removeraw-unused-export` — `src/lib/storage.ts:24-31`. Nothing in this phase uses `removeRaw`, and no test covers it. Phase 6 (`workoutStore`) will probably use it, but for now it is code ahead of need.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

- No read path throws. A blocked `getItem`, broken JSON, `null`, a bare array, an unknown version, a non-list `plans` and a bad plan all give a list (tests `planStore.test.ts:35-84`).
- The save path reports `invalid`, `backup-failed` or `write-failed`. It does not throw. When the corrupt copy fails, the live key is not touched (`:184-199`).
- A rare path: the copy succeeds but the following write fails. Then the next save makes one more corrupt copy. This grows only with failed user saves, not with reads or loads, so it is bounded.

### I5. Is it performant?

**Verdict:** PASS

Each call parses one small JSON document. A single user has tens of plans at most, so the cost is negligible.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network, no HTML output and no `eval`. Stored data is checked field by field before it is used (`planStore.ts:27-56`).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

The app has no backend and no logging channel. Failures come back as typed results (`SaveResult.reason`) for the UI in Phase 3. No stray `console.log` exists.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

The phase changes no `package.json` and no `package-lock.json`.

---

## Test adequacy notes

- **[nit]** `blank-name-test-name` — `plan.test.ts:44-48`. The test is named "rejects an empty or blank plan name", but it feeds only `'   '`. The empty string `''` is covered only by `reports every problem at once` (`:95-98`), and that test checks only the `path`, not the message. Mutant M11 shows that the blank case pins the trim. The empty case cannot fail by itself without the blank case also failing, so no behaviour is unpinned. Only the name says more than the case does.
- Fixtures are built with the app's own functions (`createExercise`, `savePlan`). The corrupt-copy timestamps are injected `now` values, not clock-relative logic. Polish letters appear in the fixtures ("Wiosłowanie i przysiady", "Zmieniony").
- At least one test calls the real implementation of every public function. Only `navigator.storage.persist` is replaced by a double, and it is an external API.

## Architecture — the project's own rules

- "Data lives in `localStorage` only. A stored shape is versioned; reading never throws on missing, corrupt or old data, and never silently overwrites data it could not read." → meets. Shape `{ version: 1, plans }`. Mutants S1, S5, S10, S12 and S13 are killed.
- "No server for user data." → meets. The code makes no network call.
- "Every behavioural clause is pinned by a Vitest unit or component test." → meets. All 28 mutants are killed.
- `erasableSyntaxOnly`, no `enum`/`namespace`, no `any` or `@ts-*` → meets. `vue-tsc -b` passes, and `grep` finds no `@ts-`, `as any` or `as unknown as` in the new files.

## Not reviewed

- Real-device behaviour of `navigator.storage.persist()` on Android Chrome. This phase has no UI that calls it, and jsdom has no such API, so only the call contract was checked.

## Observations outside scope

- `brief.md` Phase 1 rows 1.1–1.5 now end with ` — 5eff3e6`. This is inside `## Progress`, but it is text, not a checkbox. Most likely the orchestrator added it after the Phase 1 commit, not the Phase 2 builder. I name it so the owner can confirm.
- `npm run build` still bundles the scaffold leftovers (`dist/assets/vite-*.svg`, `hero-*.png`). Phase 3 removes them by plan.
