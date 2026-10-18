# Phase review — feat-mvp-plans-workout-loop · Phase 2: Plan model and device storage · round 3

- **Scope:** untracked `src/plans/plan.ts`, `src/plans/plan.test.ts`, `src/plans/planStore.ts`, `src/plans/planStore.test.ts`, `src/lib/storage.ts`; `brief.md` Progress rows 2.1–2.2
- **Files reviewed:** 5 (`+762/-0` lines) plus the brief Progress rows
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 2` rows 2.1–2.2 and `## Slice details` → `### Phase 2`
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | `npx vitest run src/plans` passes, with tests for the defaults, the validation, a save read back through a fresh read of `localStorage`, corrupt stored data kept and not overwritten, and `navigator.storage.persist()` called at the first save only (D2, D9) | `timeout 300 npx vitest run src/plans` | pass |
| 2.2 | `npm run build` exits 0 | `timeout 300 npm run build` | pass |

```
2.1:  Test Files  2 passed (2)
           Tests  77 passed (77)
      EXIT=0
2.2:  > vue-tsc -b && vite build
      ✓ built in 107ms
      EXIT=0
```

No `.skip`, `.only` or `.todo` in `src/plans/*.ts` (grep found nothing). Whole suite: `npm test` → `Test Files 3 passed (3)`, `Tests 78 passed (78)`.

### Closures (rounds after the first)

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `plural-one-only-for-1-unpinned` | round 2 | yes | I copied the repo to the scratch dir, applied each mutant to the copy of `src/plans/plan.ts`, and ran `vitest run src/plans/plan.test.ts`. P1 `count % 10 === 1 && count % 100 !== 11` → 4 failed (`21 -> ćwiczeń`, `31 -> ćwiczeń`, `101 -> ćwiczeń`). P2 `count % 10 === 1` → 6 failed (`11 -> ćwiczeń`, `21 -> ćwiczeń`, `31 -> ćwiczeń`, …). P3 the 12–14 guard on `count` → 3 failed (`112 -> ćwiczeń`, `113 -> ćwiczeń`, `114 -> ćwiczeń`). |

Earlier closed ids, checked again by execution. None of them is back:

- `rest-step-15-unpinned`: step 5 → 1 failed; step 30 → 5 failed (`accepts a rest of 15 s`, `45 s`, `75 s`, …).
- `partial-read-writeback-unpinned`: no backup when some plans were read → 1 failed (`a plan dropped for its shape stays in the corrupt copy`).
- `getplan-by-id-unpinned`: `getPlan` returns the first plan → 2 failed (`getPlan finds a plan by id among several…`).

Wrong-implementation table (scratch copy, the phase's own tests):

| Mutant | Result |
| :-- | :-- |
| P1 one when `%10==1 && %100!=11` | killed (4 failed) |
| P2 one when `%10==1` | killed (6 failed) |
| P3 12–14 guard on `count` | killed (3 failed) |
| P4 no 12–14 guard | killed (5 failed) |
| P5 few = last digit 2–3 | killed (2 failed) |
| P6 few = last digit 2–5 | killed (2 failed) |
| P7 few only for count 2–4 | killed (6 failed) |
| P8 one when `count <= 1` | killed (1 failed: `0 -> ćwiczeń`) |
| P9 guard 12–13 | killed (2 failed) |
| P10 guard 13–14 | killed (2 failed) |
| S1 summary set count = exercise count | killed (1 failed) |
| **S2 summary set word uses `exerciseCount`** | **survived (48 passed)** |
| V1 rest step 5 / V2 rest step 30 | killed / killed |
| V3, V4 no trim on plan / exercise name | killed / killed |
| V5 sets max 21 / V6 reps min 0 / V7 no integer check | killed / killed / killed |
| V8 default rest 60 | killed |
| V9 sets message says "od 1 do 99" | survived (48 passed) |
| V10 rest message says "ustaw liczbę powtórzeń" | survived (48 passed) |
| G1 `getPlan` returns first plan | killed |
| W1 no backup on partial unreadable | killed |
| W2 backup key uses `Date.now()` not `now` | killed (4 failed) |
| W3 write after a failed backup | killed |
| W4 persist before the write | killed |
| W5 persist on every save | killed |
| W6 no `.catch` on persist | killed |
| W7 same id appends | killed |
| W8 no trim on save | killed |
| W9 unknown version accepted | killed |
| W10 no validation on read | killed |
| W11 save without validation | killed (2 failed) |
| W12 backup on every save | killed (2 failed) |

S2 changes behaviour. I confirmed this with a probe test in the scratch copy. It wrote `summarizePlan` output to a file, first for the original code and then for the mutant:

```
original                          | mutant S2
1x3: 1 ćwiczenie, 3 serie         | 1x3: 1 ćwiczenie, 3 seria
2x3: 2 ćwiczenia, 6 serii         | 2x3: 2 ćwiczenia, 6 serie
1x1: 1 ćwiczenie, 1 seria         | 1x1: 1 ćwiczenie, 1 seria
5x4: 5 ćwiczeń, 20 serii          | 5x4: 5 ćwiczeń, 20 serii
7x3: 7 ćwiczeń, 21 serii          | 7x3: 7 ćwiczeń, 21 serii
2x11: 2 ćwiczenia, 22 serie       | 2x11: 2 ćwiczenia, 22 serie
```

### Manual (performed with playwright-cli)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| — | none for this phase | — | — |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | FAIL |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | CONCERNS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 1 · Minor: 1 · Nit: 2

Findings going back to a builder: `summary-set-plural-unpinned`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Every exported function has a clear name or a docblock. The docblocks say what the code does: the plural rule, the summary example, the corrupt copy and the persist request.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule; the storage rules are already in the brief |
| ADR | no | — | no ADRs in this repo |
| TSDoc / API | yes | yes | docblocks on `pluralPl`, `summarizePlan`, `listPlans`, `savePlan`, `requestPersistOnce`, `storage.ts` |
| Translations | n/a | — | Polish literals in code are the project pattern |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

No wrong paths or names. `savePlan` docblock matches the key (`trening.plans.corrupt.<timestamp>`) and the code.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** FAIL (one clause is not pinned by a test)

| Requirement (from this phase's slice details / rows) | Implemented in | Status |
| :-- | :-- | :-- |
| Types `Plan`, `Exercise` | `src/plans/plan.ts:1-13` | met |
| Defaults 3 / 10 / 90 s | `plan.ts:15-17`, `40-48` | met, pinned (V8 killed) |
| Limits sets 1–20, reps 1–100, rest 0–600 s in 15 s steps | `plan.ts:19-23`, `54-63`, `86-103` | met, pinned (V1, V2, V5–V7 killed) |
| Polish validation messages (blank plan name after trim, blank exercise name, no exercises) | `plan.ts:68-85` | met, pinned exactly (V3, V4 killed) |
| Summary helper with Polish plural forms | `plan.ts:109-127` | met in code; the set-word form is not pinned → `summary-set-plural-unpinned` |
| Key `trening.plans.v1` holding `{ version: 1, plans }` | `planStore.ts:4-11`, `111-114` | met, pinned (`planStore.test.ts:105-108`) |
| `listPlans`, `getPlan`, `savePlan` (insert or replace by id) | `planStore.ts:86-148` | met, pinned (G1, W7 killed) |
| Ids from `crypto.randomUUID()` | `plan.ts:32-38` | met |
| Missing key → empty list | `planStore.ts:60` | met, pinned |
| Corrupt or unknown version → empty list, raw copied to `trening.plans.corrupt.<timestamp>` before the first write over it | `planStore.ts:58-83`, `124-130` | met, pinned (W1–W3, W9, W12 killed) |
| `persist()` once at the first save, only when the API exists, a rejection does not block | `planStore.ts:94-109`, `145-146` | met, pinned (W4–W6 killed) |

- **[major]** `summary-set-plural-unpinned` — `src/plans/plan.test.ts:127-146` (code at `src/plans/plan.ts:120-127`) — in every summary test, the exercise count and the set count need the same plural form: (1, 1) one/one, (2, 2) few/few, (5, 20) many/many, (7, 21) many/many, (2, 22) few/few. So the tests cannot tell if the set word follows the set count. The mutant `pluralPl(exerciseCount, 'seria', 'serie', 'serii')` passes all 48 tests. It gives "1 ćwiczenie, 3 seria" for the most common plan (1 exercise × 3 sets) and "2 ćwiczenia, 6 serie" for the docblock's own example. That example, "2 ćwiczenia, 6 serii", is not asserted anywhere. **Fix:** add summary cases where the two forms differ, at least the docblock example (2 exercises × 3 sets → "2 ćwiczenia, 6 serii") and 1 exercise × 3 sets → "1 ćwiczenie, 3 serie".

- **[minor]** `limit-messages-text-unpinned` — `src/plans/plan.test.ts:63-82` (code at `src/plans/plan.ts:86-103`) — the sets, reps and rest messages are checked only for the prefix `^Ćwiczenie 1: ustaw `. Mutants V9 ("od 1 do 99") and V10 (the rest message names repetitions) pass. The brief lists only the three messages that are pinned exactly. The `path` field already identifies the field, and the Phase 3 steppers should keep these limits from being broken in the UI. So this is a Minor, not a Major.

### I2. Is it logically correct?

**Verdict:** PASS

I found no input that makes the code give a wrong result. `pluralPl` gives the right forms for 0, 1, 2–4, 5, 11–14, 21, 22, 101–104, 111–114 and 122 (mutation table). `savePlan` reads the stored data, makes a backup when needed, then writes. A second save does not make a second backup because the first write made the data readable (`planStore.test.ts:208-214`).

### I3. Is there no unnecessary complexity?

**Verdict:** CONCERNS

- **[nit]** `removeraw-unused` — `src/lib/storage.ts:24-31` — `removeRaw` is exported but nothing calls it in this phase. It is probably for the Phase 6 workout store. It is harmless, but it is dead code until then.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

`readRaw` and `writeRaw` catch storage errors (`storage.ts:7-22`). A `getItem` that throws reads as an empty list (`planStore.test.ts:35-41`). A failed write returns `write-failed` (`:144-150`). A failed backup stops the write (`:184-199`). A missing, throwing or rejecting `persist()` does not block the save (`:250-286`).

- **[nit]** `persist-once-per-load` — `src/plans/planStore.ts:94-109` — the persist request is "once per page load" (module flag), not once per device. After a reload, the first save calls `persist()` again. The docblock says this clearly, and a second call does no harm. The brief says "once, at the first save", so the owner may want to know about this reading.

### I5. Is it performant?

**Verdict:** PASS

Each read parses one small JSON value. `savePlan` reads the key twice (once in `readStored`, once for the backup) only when the data is unreadable. Assumed size: tens of plans. The cost is not important.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network calls and no HTML output. All data stays in `localStorage` (brief guardrail).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

A client-only app with no logging channel. Failures come back as `SaveResult.reason` for the UI. No leftover `console.log`.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` and `package-lock.json` did not change in this phase.

---

## Architecture — the project's own rules

- "Data lives in `localStorage` only. A stored shape is versioned" → meets — `planStore.ts:4-11`.
- "reading never throws on missing, corrupt or old data" → meets — `planStore.test.ts:29-54`.
- "never silently overwrites data it could not read" → meets — `planStore.ts:124-130`, mutants W1–W3 killed.
- "Every behavioural clause is pinned by a Vitest unit or component test" → fails for one clause — `summary-set-plural-unpinned`.
- "Do not use `enum`, `namespace` or constructor parameter properties" → meets (none present; build passes).
- Never-weaken list → meets — no `@ts-ignore`/`@ts-expect-error`/`@ts-nocheck`/`as any`/`: any`/`as unknown as` in the new files; no tsconfig or `package.json` change.
- brief.md edit → Phase 2 rows 2.1 and 2.2 are ticked. The Phase 1 rows also got "— 5eff3e6" added after them. That is the orchestrator's commit stamp, not this phase's code.

## Not reviewed

- Browser behaviour: this phase has no UI and no manual items. I opened no browser session.
- Real `navigator.storage.persist()` behaviour in Chrome on Android: jsdom has no such API. The tests use stubs.

## Observations outside scope

- `npm run build` still bundles the scaffold assets (`hero-*.png`, `vite-*.svg`). Phase 3 removes them.
