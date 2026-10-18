# Phase review — feat-mvp-plans-workout-loop · Phase 2: Plan model and device storage · round 1

- **Scope:** working tree vs `HEAD` (5eff3e6): new untracked `src/lib/storage.ts`, `src/plans/plan.ts`, `src/plans/plan.test.ts`, `src/plans/planStore.ts`, `src/plans/planStore.test.ts`; `brief.md` Progress rows 2.1–2.2
- **Files reviewed:** 5 source/test files (`+714/-0` lines) + `brief.md` (`+2/-2` in this phase's rows)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 2` Progress rows 2.1–2.2 and `## Slice details` → `### Phase 2`
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | `npx vitest run src/plans` passes, with tests for defaults, validation, fresh read-back, corrupt data kept, `persist()` at the first save only | `timeout 300 npx vitest run src/plans` | pass (56 passed, 0 skipped, 0 todo; `grep -rnE '\.(skip\|only\|todo)\b' src` finds nothing) |
| 2.2 | `npm run build` exits 0 | `timeout 300 npm run build` | pass |

```
 Test Files  2 passed (2)
      Tests  56 passed (56)
EXIT=0
```

```
> vue-tsc -b && vite build
✓ built in 90ms
EXIT=0
```

The rows are green. The suite does not pin every clause of the contract. See the mutant table below.

### Wrong-implementation table (TEST ADEQUACY)

I copied `src/` into the scratch mutant folder. I changed one thing per mutant and ran `./node_modules/.bin/vitest run src/plans` there. Production code was not touched. After the run, `diff -r` showed the copy equal to the repo.

| # | Wrong implementation | Suite result | Behaviour change confirmed |
| :-- | :-- | :-- | :-- |
| M1 | `persist()` at the 2nd successful save (off-by-one) | KILLED (2 failed: "a rejected persist() …", "a failed write does not use up the one request") | — |
| M2 | `persist()` at every save (no once flag) | KILLED (1 failed) | — |
| M3 | `persist()` before the write (also on a failed write) | KILLED (1 failed) | — |
| M4 | `persist()` before validation (also on a refused save) | KILLED (2 failed) | — |
| M5 | rejection not handled (no `.catch`) | KILLED (1 failed) | — |
| M6 | plural with no 12–14 exception | KILLED (2 failed) | — |
| M7 | plural 12–14 exception on `count`, not on the last two digits | **SURVIVED** (56 passed) | probe: `112:serie 113:serie 114:serie` (correct: `serii`) |
| M8 | plural "few" only for exactly 2–4 | KILLED (1 failed) | — |
| M9 | sets max 19 (20 rejected) | KILLED | — |
| M10 | reps max 101 (101 accepted) | KILLED | — |
| M11 | rest step 30 s, not 15 s | **SURVIVED** (56 passed) | probe: `restAccepted = 0:true 15:false 45:false 75:false 585:false 600:true` |
| M12 | rest min 15 (0 s rejected) | KILLED | — |
| M13 | plan name not trimmed in validation | KILLED | — |
| M14b | `getPlan(id)` returns `plans[0]` | **SURVIVED** (56 passed) | probe: `getPlan = p2->Pierwszy missing->Pierwszy` (correct: `p2->Drugi missing->undefined`) |
| M15 | `listPlans()` writes back a partially readable list (no backup) | **SURVIVED** (56 passed) | probe: `partialReadKeepsRaw = False` (real code: `true`) |
| M16 | a dropped plan is not flagged, so the save overwrites with no backup | KILLED | — |
| M17 | backup key with no timestamp (overwrites an earlier backup) | KILLED (4 failed) | — |
| M18 | backup on every save | KILLED (2 failed) | — |
| M19 | live key written although the backup failed | KILLED | — |
| M20 | save appends, never replaces by id | KILLED | — |
| M21 | names not trimmed on save | KILLED | — |
| M22 | read of a corrupt document resets the key | KILLED (3 failed) | — |
| M23 | empty exercise name not checked | KILLED (2 failed) | — |

Probes on the real code (same scratch copy, unmutated): plurals `12:serii 13:serii 14:serii 22:serie 23:serie 24:serie 112:serii 113:serii 114:serii 122:serie 21:serii 101:serii` — all correct. Rest accepted `0 15 45 75 585 600`, rejected `1 14 16 30.5 605` — correct. `getPlan` correct. A partial read keeps the raw value — correct.

### Manual

None for this phase.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS (code); tests FAIL — see I2 |
| I2 | Is it logically correct? | FAIL (test adequacy) |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | CONCERNS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 3 · Minor: 4 · Nit: 2

Findings going back to a builder: `rest-step-15-unpinned`, `partial-read-writeback-unpinned`, `getplan-by-id-unpinned`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Each exported function has a clear name or a short docblock. `storage.ts` says that reads never throw and writes report failure. `savePlan` says that it copies unreadable data first and writes nothing when the copy fails.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command or setup step |
| CLAUDE.md | no | — | no new rule; the storage rule is already in the brief guardrails |
| ADR | no | — | no ADRs in this repo |
| phpdoc / API | n/a | — | TS docblocks present (see D1) |
| Query header comments | n/a | — | |
| E2E rules / selectors | n/a | — | |
| Translations | n/a | — | Polish messages live in `plan.ts`; there is no i18n layer in this project |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The Polish validation messages are correct and name the fix ("Wpisz nazwę planu.", "Dodaj co najmniej jedno ćwiczenie.", "Ćwiczenie 1: ustaw przerwę od 0 do 600 s, co 15 s.").

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS for the code. The tests do not pin three clauses (see I2).

| Requirement (Slice details, Phase 2) | Implemented in | Status |
| :-- | :-- | :-- |
| Types `Plan`, `Exercise` | `src/plans/plan.ts:1-13` | met |
| Defaults 3 / 10 / 90 s | `src/plans/plan.ts:15-17`, `:40-48` | met |
| Limits sets 1–20, reps 1–100, rest 0–600 s in 15 s steps | `src/plans/plan.ts:19-23`, `:54-63` | met (probe), step not pinned |
| Validation: blank plan name, blank exercise name, no exercises, Polish messages | `src/plans/plan.ts:65-107` | met |
| Summary with Polish plural forms | `src/plans/plan.ts:110-127` | met (probe incl. 12–14, 22–24, 112–114) |
| Key `trening.plans.v1`, `{ version: 1, plans }` | `src/plans/planStore.ts:4-11`, `:111-114` | met |
| `listPlans()`, `getPlan(id)`, `savePlan(plan)` insert or replace by id | `src/plans/planStore.ts:86-92`, `:121-148` | met; `getPlan` id match not pinned |
| Ids from `crypto.randomUUID()` | `src/plans/plan.ts:32-38` | met |
| Missing key → empty list; corrupt / unknown version → empty list | `src/plans/planStore.ts:58-83` | met |
| Raw value copied to `trening.plans.corrupt.<timestamp>` before the first write over it | `src/plans/planStore.ts:124-130`, `src/lib/storage.ts:37-39` | met |
| `persist()` once, at the first save, only when the API exists; a rejection does not block | `src/plans/planStore.ts:94-109`, `:145-146` | met (M1–M5 killed) |

Focus questions, answered:
- **Can a read path lose or overwrite plans?** No, in the current code. `listPlans` and `getPlan` never write (`partialReadKeepsRaw = true`). A partially valid list is written back only by `savePlan`, and only after the raw value is copied (M16, M19 killed). But the "read does not write" clause for a partial list has no assertion (M15 survived) → `partial-read-writeback-unpinned`.
- **Can a corrupt-copy key grow without bound?** Not per load: after one successful save the live key is clean, and the next save makes no copy ("makes only one copy" test, M18 killed). It grows once per failed save retry → `backup-repeated-per-failed-write` (Minor).
- **Can a backup overwrite an earlier backup?** Only if two copies get the same millisecond. A fixed key is caught (M17 killed, 4 tests fail).
- **Is "persist() at the first save only" pinned against off-by-one?** Yes, by the suite: M1 fails 2 tests. The test named for this clause does not catch M1 by itself → `persist-test-name-overclaims` (Minor).
- **Polish plurals for 12–14, 22–24, 112?** The code is correct for all of them (probe above). 112–114 has no assertion → `plural-hundreds-unpinned` (Minor).
- **Does validation accept exactly the limits?** Yes (probe above). The 15 s step has no accept-side assertion off a 30 s multiple → `rest-step-15-unpinned` (Major).

### I2. Is it logically correct?

**Verdict:** FAIL — the code is correct, but three brief clauses are not pinned by any assertion. A wrong implementation of each one keeps all 56 tests green.

- **[major]** `rest-step-15-unpinned` — `src/plans/plan.test.ts:81-86` (with the reject cases at `:63-79`) — The brief says "rest 0–600 s in 15 s steps". The tests accept only 0, 90 (the default) and 600, and all of these are multiples of 30. The only step reject case is 100. **Fails when:** `LIMITS.rest.step` becomes 30 (M11). All 56 tests pass, but `validatePlan` then rejects a 15, 45, 75 or 585 s rest. Because `toPlan` (`src/plans/planStore.ts:55`) uses `validatePlan` as the read filter, every stored plan with such a rest drops out of `listPlans()`. The next save then writes it out of the live key. **Fix:** add an accept case with an odd multiple of 15 (for example 15, 45 and 585 s), and a reject case just off a step (for example 14 or 16 s).
- **[major]** `partial-read-writeback-unpinned` — `src/plans/planStore.test.ts:56-75` — The guardrail says reading "never silently overwrites data it could not read". The tests for a partially readable document ("a stored plan with a bad shape is skipped…", "a stored plan that breaks the limits is skipped") assert only the returned list. They do not assert that the raw value in `trening.plans.v1` stays the same after the read. The whole-document cases at `:43-54` do assert it. **Fails when:** `listPlans()` writes back the readable part of a partial list with no backup (M15). All 56 tests pass, and the bad plan is lost with no corrupt copy (probe `partialReadKeepsRaw = False`). This is the FR-011 data-loss path. **Fix:** in both partial-read tests, after `listPlans()` (and `getPlan(...)`), assert `localStorage.getItem('trening.plans.v1')` equals the raw value set up, and assert no `trening.plans.corrupt.*` key exists.
- **[major]** `getplan-by-id-unpinned` — `src/plans/planStore.test.ts:29-33`, `:79-91`, `:105-112` — Every `getPlan` assertion runs against a store that holds zero or one plan. **Fails when:** `getPlan` returns `readStored().plans[0]` and ignores the id (M14b). All 56 tests pass. The probe then gives `getPlan('p2') -> 'Pierwszy'` and `getPlan('zzz') -> 'Pierwszy'`. Phase 8 opens a saved plan in the editor by id. With this defect the editor shows the wrong plan, and a save overwrites that wrong plan. **Fix:** save two plans, then assert `getPlan` of the second id returns the second plan, and `getPlan` of an unknown id returns `undefined` on a non-empty list.
- **[minor]** `plural-hundreds-unpinned` — `src/plans/plan.test.ts:94-106` — The code is correct for 112–114 (probe). But no case above 22 exists, so an exception keyed on `count` and not on `count % 100` (M7) passes. It shows "112 serie" in place of "112 serii". Realistic only for very large plans. **Fix:** add `[112, 'ćwiczeń']` and `[24, 'ćwiczenia']`.
- **[minor]** `persist-test-name-overclaims` — `src/plans/planStore.test.ts:203-212` — The test "calls navigator.storage.persist() at the first save only" asserts one call only after three saves. A call at the second save (M1) passes this test. Two other tests catch M1, so the clause is pinned by the suite. **Fix:** assert `toHaveBeenCalledTimes(1)` right after the first `savePlan`.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

The split is small: pure model (`plan.ts`), store (`planStore.ts`), and generic safe storage helpers (`storage.ts`) that Phase 6 will reuse.

- **[nit]** `unused-removeraw` — `src/lib/storage.ts:24-31` — `removeRaw` has no caller yet. It is exported, so the build does not flag it. Phase 6 will need it. Keep it or add it then.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** CONCERNS

`readRaw`/`writeRaw` catch storage errors. Bad JSON, `null`, a bare array, an unknown version and a wrong-shape plan all read without a throw. A failed backup stops the write. `persist()` is feature-checked, a sync throw is caught, and a rejection is handled.

- **[minor]** `save-accepts-plan-it-cannot-read` — `src/plans/planStore.ts:121-122` vs `:45` — `savePlan` checks the plan with `validatePlan`, which does not check `id`. The reader `toPlan` rejects `id === ''`. **Fails when:** `savePlan({ id: '', ... })` is called. Probe: it returns `{"ok":true}`, `listPlans()` then has 0 plans, and the next save copies the document to `trening.plans.corrupt.42` and drops that plan from the live key. No app code makes an empty id today (`createPlan` uses `crypto.randomUUID()`), so this is Minor. **Fix:** refuse an empty id in `savePlan` (or in `validatePlan`), so a save never reports success for a plan that the reader drops.
- **[minor]** `backup-repeated-per-failed-write` — `src/plans/planStore.ts:124-145`, `src/lib/storage.ts:37-39` — When the live write fails (for example a full quota) over unreadable data, each retry writes one more full copy of the raw value. Probe with the live `setItem` failing: three saves give `write-failed` three times and leave `trening.plans.corrupt.1,…corrupt.2,…corrupt.3`. The growth is bounded by user taps and the quota. A full quota then also blocks the Phase 6 workout store. **Fix:** skip the copy when an identical backup already exists, or write the copy only once per page load.
- **[nit]** `persist-once-per-load` — `src/plans/planStore.ts:94-109` — The flag is per module instance, so `persist()` runs at the first save of every page load, not only at the first save ever. The docblock says this. `persist()` is idempotent, so the effect is harmless and can help (Chrome re-checks the grant). Listed so the owner knows how D9 is read.

### I5. Is it performant?

**Verdict:** PASS

`savePlan` parses the stored document once and reads the raw string a second time only on the unreadable path. Assumed size: tens of plans, a few KB.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network, no HTML output. Data is parsed with `JSON.parse` and checked field by field before use.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

No backend and no logging layer. Failures come back as `SaveResult` reasons (`invalid`, `backup-failed`, `write-failed`) for the UI to show. No leftover `console.log`.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A — `package.json` and `package-lock.json` are not changed in this phase.

---

## Architecture — the project's own rules

- "Data lives in `localStorage` only. A stored shape is versioned" → meets — key `trening.plans.v1`, `{ version: 1, plans }` (`src/plans/planStore.ts:4-11`).
- "reading never throws on missing, corrupt or old data" → meets — tests at `planStore.test.ts:29-54`; `readRaw` catches.
- "and never silently overwrites data it could not read" → meets in code; the partial-list read side is unpinned → `partial-read-writeback-unpinned`.
- "Every behavioural clause is pinned by a Vitest unit or component test" → fails for three clauses → `rest-step-15-unpinned`, `partial-read-writeback-unpinned`, `getplan-by-id-unpinned`.
- "No server for user data" → meets — no network call.
- No `enum`, `namespace`, parameter properties, `any` or `@ts-*` → meets (`npm run build` green; read the full diff).
- No new dependency → meets.
- brief.md edit limited to Progress checkboxes → meets (rows 2.1, 2.2 only; the ` — 5eff3e6` suffixes on Phase 1 rows are the orchestrator's).
- No UI change → DESIGN.md / PRODUCT.md rules not engaged.

## Not reviewed

- Browser behaviour: this phase has no UI and no manual items. No browser session opened.
- Real Chrome `navigator.storage.persist()` grant behaviour: jsdom has no `navigator.storage`; only the call is tested with a stub.

## Observations outside scope

- `npm run build` still bundles the scaffold assets (`dist/assets/vite-*.svg`, `hero-*.png`). Phase 3 removes them by plan.
