# Phase review — feat-mvp-plans-workout-loop · Phase 2: Plan model and device storage · round 2

- **Scope:** working tree against `HEAD` (5eff3e6): `src/plans/plan.ts`, `src/plans/plan.test.ts`, `src/plans/planStore.ts`, `src/plans/planStore.test.ts`, `src/lib/storage.ts` (all new, untracked), `brief.md` Progress rows 2.1–2.2
- **Files reviewed:** 6 (`+744/-2` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 2` Progress rows 2.1–2.2 and `## Slice details` → `### Phase 2`; Done when D2, D9
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | `npx vitest run src/plans` passes, with tests for the defaults, the validation, a save read back through a fresh read of `localStorage`, corrupt stored data kept and not overwritten, and `navigator.storage.persist()` called at the first save only (D2, D9) | `timeout 300 npx vitest run src/plans` | pass (65 passed, 0 skipped, 0 todo) |
| 2.2 | `npm run build` exits 0 | `timeout 300 npm run build` | pass |

2.1, last lines:

```
 Test Files  2 passed (2)
      Tests  65 passed (65)
EXIT=0
```

2.2, last lines:

```
dist/assets/index-EKLP5rDc.js   65.64 kB │ gzip: 25.75 kB
✓ built in 105ms
EXIT=0
```

`grep -rnE '\.(skip|only|todo)\b|@ts-|as any|: any|as unknown as' src` finds nothing. `tsconfig.test.json` includes `src/**/*.ts`, so `vue-tsc -b` in the build type-checks the two new test files.

### Closures

I proved each closure with a mutant copy in the scratch dir (`scratchpad/mutant`, `src/` reset from a pristine copy before each mutant). The command was `timeout 300 ./node_modules/.bin/vitest run src/plans`.

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `rest-step-15-unpinned` | round 1 | yes | M1 `LIMITS.rest.step = 30` → 5 failed: `accepts a rest of 15 s / 45 s / 75 s / 105 s / 585 s` (`plan.test.ts:91`). M2 step check removed → 4 failed (`rejects … restSeconds` for 100, 14, 16, 599). M3 step 5 → 1 failed (100 s). |
| `partial-read-writeback-unpinned` | round 1 | yes | M4 `listPlans()` writes the readable part back with no backup → 7 failed, among them `a stored plan with a bad shape is skipped…` and `a stored plan that breaks the limits is skipped`. M5 the same write in `getPlan()` → those 2 failed. M6 write-back with a backup → 7 failed. |
| `getplan-by-id-unpinned` | round 1 | yes | M7 `getPlan` returns `plans[0]` → 2 failed, among them `getPlan finds a plan by id among several…` (`planStore.test.ts:86`). M8 returns the last plan → 2 failed. M9 returns `plans[0]` when any id matches → 1 failed (same test). |

### Wrong-implementation table (fresh, this round)

The same mutant setup. Each surviving mutant was confirmed to change behaviour with a probe test (`--silent=false`).

| # | Wrong implementation | Tests | Probe proof that it changed behaviour |
| :-- | :-- | :-- | :-- |
| M10 | `pluralPl`: `count % 10 === 1 && count % 100 !== 11` → one (East-Slavic rule) | **65 passed** | `21 seria`, `31 seria` (pristine: `21 serii`, `31 serii`) |
| M11 | `pluralPl`: `count % 10 === 1` → one | **65 passed** | `11 seria`, `21 seria` |
| M12 | `pluralPl`: 12–14 guard on `count`, not `count % 100` | **65 passed** | `112 serie` (pristine: `112 serii`) |
| M13 | reps range message copies the sets text | **65 passed** | `Ćwiczenie 1: ustaw liczbę serii od 1 do 20.` for a reps error |
| M14 | version check `> 1` instead of `!== 1` | **65 passed** | `{ version: 0, … }` lists plan `old` (pristine: `[]`) |
| M15 | `persist()` on every save | 1 failed | — |

### Manual

None for this phase. No browser session opened.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS (Minor) |
| I2 | Is it logically correct? | FAIL (test adequacy) |
| I3 | Is there no unnecessary complexity? | PASS (Nit) |
| I4 | Is it robust (concurrency, error handling, …)? | PASS (Minor) |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | PASS (Minor) |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 1 · Minor: 4 · Nit: 3

Findings going back to a builder: `plural-one-only-for-1-unpinned`

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

The public functions have clear names. Docblocks explain the non-obvious rules: the corrupt copy before the first write (`planStore.ts:116-120`), the persist request (`planStore.ts:96-99`), the plural rule (`plan.ts:109`), the error path format (`plan.ts:26`).

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no setup or command change |
| CLAUDE.md | no | — | no new rule; nothing in it is now wrong |
| ADR | no | — | the repo keeps no ADRs |
| phpdoc / API | no | — | TS docblocks, see D1 |
| Query header comments | N/A | — | no SQL |
| E2E rules / selectors | N/A | — | no UI |
| Translations | N/A | — | Polish strings live in `plan.ts`; the app has no i18n layer |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The Polish messages are correct: "Wpisz nazwę planu.", "Dodaj co najmniej jedno ćwiczenie.", "Wpisz nazwę ćwiczenia 2.".

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS (Minor)

| Requirement (Slice details, Phase 2) | Implemented in | Status |
| :-- | :-- | :-- |
| Types `Plan`, `Exercise` | `plan.ts:1-13` | met |
| Defaults 3 sets, 10 reps, 90 s | `plan.ts:15-17`, `:40-48` | met |
| Limits sets 1–20, reps 1–100, rest 0–600 s in 15 s steps | `plan.ts:19-23`, `:54-63` | met |
| Validation with Polish messages that name the fix (blank plan name, blank exercise name, no exercises) | `plan.ts:65-107` | met |
| Summary with Polish plural forms | `plan.ts:110-127` | met (unpinned for 11, 21, 112 — see I2) |
| Key `trening.plans.v1` with `{ version: 1, plans }` | `planStore.ts:4-11`, `:111-114` | met |
| `listPlans()`, `getPlan(id)`, `savePlan(plan)` insert or replace by id | `planStore.ts:86-148` | met |
| Ids from `crypto.randomUUID()` | `plan.ts:32-38` | met |
| Missing key → empty list; corrupt or unknown version → empty list | `planStore.ts:58-83` | met |
| Raw value copied to `trening.plans.corrupt.<timestamp>` before the first write over it | `planStore.ts:124-130`, `storage.ts:37-39` | met; no write when the copy fails |
| `persist()` once at the first save, only when the API exists, rejection does not block | `planStore.ts:94-109`, `:145-146` | met (see Minor below) |

- **[minor]** `persist-once-per-load` — `src/plans/planStore.ts:94-109` — the flag is module state, so the app calls `persist()` at the first save of every page load, not only at the first save on the device. The docblock says this ("once per page load"). The extra calls are harmless: `persist()` is idempotent, and a later call can still win a grant. The owner wrote "at the first plan save" (D9). This report only records the reading the code took. No change is needed.

### I2. Is it logically correct?

**Verdict:** FAIL (test adequacy)

The code is correct for every input I tried. One stated rule is not pinned by the tests.

- **[major]** `plural-one-only-for-1-unpinned` — `src/plans/plan.test.ts:101-113` (rule at `src/plans/plan.ts:109-118`) — the docblock says "1 -> one, 2-4 (not 12-14) -> few, everything else -> many". The test inputs are 1, 2, 4, 5, 12, 14, 22, 0. No input has last digit 1 except 1 itself, and no input is above 99. **Fails when:** a builder writes the common East-Slavic rule `count % 10 === 1 && count % 100 !== 11` (M10) or `count % 10 === 1` (M11). All 65 tests still pass, and the probe gives `21 seria` and `31 seria` (correct Polish: `21 serii`, `31 serii`). The guard on `count` instead of `count % 100` (M12) also passes all tests and gives `112 serie` (correct: `112 serii`). This is realistic: 7 exercises with the default 3 sets give 21 sets, and the plan card then shows "21 seria". Fix: add cases 11, 21 and 112 (all "many" forms: `ćwiczeń`) to the `Polish plural forms` table, and keep 22 → few.

- **[minor]** `range-message-text-unpinned` — `src/plans/plan.test.ts:78-82` — the range-error cases check only the path and the prefix `^Ćwiczenie 1: ustaw `. The text that names the fix ("liczbę powtórzeń od 1 do 100") is not checked. **Fails when:** the reps message copies the sets text (M13): all tests pass and a reps error says "ustaw liczbę serii od 1 do 20". The brief lists only the three required messages (blank plan name, blank exercise name, no exercises), and those are pinned exactly. The steppers in Phase 3 clamp the values, so a user may never see a range message. That is why this is Minor.

- **[nit]** `version-below-1-unpinned` — `src/plans/planStore.test.ts:45`, `:163-169` — only versions 2 and 7 are tested as unknown. A check `version > 1` instead of `!== 1` (M14) passes all tests and reads `{ version: 0, … }` as valid. No app code ever wrote version 0, so no real data can hit this.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS (Nit)

- **[nit]** `unused-removeraw` — `src/lib/storage.ts:24-31` — `removeRaw` has no caller yet. Phase 6 (workout store) will likely need it. `noUnusedLocals` does not flag exports.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS (Minor)

Reads never throw: `readRaw` catches, `JSON.parse` is in a `try`, every field is type-checked before use (`planStore.ts:23-56`). A failed backup stops the write (`planStore.ts:127-129`, test `:184-199`). A failed write does not use up the persist request (test `:288-300`).

- **[minor]** `save-accepts-id-read-rejects` — `src/plans/planStore.ts:122` vs `:45` — `savePlan` validates with `validatePlan` only, which does not check `id`. `toPlan` rejects `id === ''`. **Fails when:** `savePlan({ id: '', name: 'Nogi', exercises: [valid] })`: probe result `{"ok":true}`, then `listPlans()` gives `[]`. The next save copies the raw value to `trening.plans.corrupt.2` and drops the plan from the live list. The caller gets `ok: true` for a plan it can never read back. The app's own `createPlan()` always sets a UUID, so no current code path does this. Make the write side reject what the read side rejects.

- **[nit]** `read-error-treated-as-missing` — `src/lib/storage.ts:7-13` — `readRaw` returns `null` both for a missing key and for a `getItem` that throws, so `savePlan` treats a failed read as "no data" and writes. Per the Web Storage spec `getItem` does not throw on a live `Storage` object; when `localStorage` access itself throws, `setItem` throws too and nothing is written. No real path loses data today.

### I5. Is it performant?

**Verdict:** PASS

Each read parses the whole document; `savePlan` reads it twice when it is unreadable. For a handful of plans with up to about 10 exercises (a few kB), this is negligible.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network calls, no HTML output. Stored JSON is parsed in a `try` and every field is type-checked before use.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** PASS (Minor)

`savePlan` returns a typed reason (`invalid`, `backup-failed`, `write-failed`).

- **[minor]** `unreadable-not-surfaced` — `src/plans/planStore.ts:86-88` — `listPlans()` drops the `unreadable` flag. A UI cannot tell the user that a stored plan was set aside, so the plan just disappears from the list without a word. The data stays in the live key (and in a corrupt copy after the next save), so nothing is lost. The brief asks for no notice. This is for the owner to decide.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` and `package-lock.json` are unchanged in this phase.

---

## Architecture — the project's own rules

- "Data lives in `localStorage` only. A stored shape is versioned" → meets — `planStore.ts:4-11`, `version: 1`.
- "reading never throws on missing, corrupt or old data" → meets — tests `planStore.test.ts:29-54`.
- "never silently overwrites data it could not read" → meets — backup before the first write, no write when the backup fails (`planStore.ts:124-130`); M4–M6 prove that reads never write.
- "No server for user data" → meets — no network code.
- "Do not use `enum`, `namespace` or constructor parameter properties" → meets.
- "Every behavioural clause is pinned by a Vitest unit or component test" → fails for the Polish plural rule — `plural-one-only-for-1-unpinned`.
- "No new dependency" → meets.

## Not reviewed

- Runtime behaviour in Chrome on Android. This phase has no UI and no manual items. `localStorage` and `navigator.storage` were checked in jsdom only.

## Observations outside scope

- `crypto.randomUUID()` (required by the brief) exists only in a secure context. If the owner opens the dev server on the phone over plain `http://<LAN IP>`, `createPlan()` throws. `localhost` and the planned HTTPS deployment are fine.
- `dist/` still bundles the scaffold `hero.png` and `vite.svg`. Phase 3 removes the scaffold.
