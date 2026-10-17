# Phase review — feat-cardio-module · Phase 1: Cardio core logic · round 1

- **Scope:** untracked new files on top of `c20c239` (`git status --porcelain`): `public/cardio-core.js`, `test/cardio-core.test.js`; `brief.md` Progress checkboxes 1.1–1.3
- **Files reviewed:** 2 (`+485/-0` lines; 154 in `public/cardio-core.js`, 331 in `test/cardio-core.test.js`) + the 3 brief.md checkbox lines
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 1: Cardio core logic` Progress rows 1.1–1.3 (D1, D2, D3, D4) and `## Slice details` → `### Phase 1`
- **Reviewed at:** 2026-10-17
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 1.1 | cardio-core tests pass, `# tests N` N > 0, `# fail 0` (D1, D2, D3, D4) | `timeout 60 node --disable-warning=ExperimentalWarning --test test/cardio-core.test.js` | pass |
| 1.2 | `node --check public/cardio-core.js` exits 0 | `timeout 30 node --check public/cardio-core.js` | pass |
| 1.3 | whole suite `# fail 0` | `timeout 120 node --disable-warning=ExperimentalWarning --test` | pass |

1.1 — exit 0, last lines:

```
1..36
# tests 36
# suites 0
# pass 36
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 56.141045
```

The slice's tests are named in the output (36 `ok` lines), e.g. `ok 20 - pauza zamraża activeMs, a wznowienie wyłącza czas pauzy z pomiaru (D1)`, `ok 29 - intervalAt: sekwencja powtarza się (zawinięcie cyklu) 5 s + 7 s, razem 0:24 (D3)`, `ok 34 - pauza w trybie interwałowym zamraża pozostały czas interwału i wznawia od tej samej wartości (D4)`.

1.2 — no output, `exit=0`.

1.3 — exit 0, last lines (baseline before the run: 0 tests, 0 failing; now 36, all from `test/cardio-core.test.js`, first subtest `# Subtest: moduł ładuje się też jako klasyczny skrypt przeglądarki i udostępnia globalny CardioCore`):

```
1..36
# tests 36
# suites 0
# pass 36
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 66.400121
```

Extra static check (not a row): `node --check server.js && node --check db.js && node --check public/app.js` → exit 0. Node v22.23.1.

### Test adequacy — wrong-variant table

Built in `<scratch-dir>/mutants/run.js` and `run2.js` against a scratch copy (`<scratch-dir>/mutant/`), running the slice's own `test/cardio-core.test.js`. The working tree was never touched; the scratch copy was restored and `cmp`-checked identical afterwards.

| Wrong variant | Result of the slice's tests |
| :-- | :-- |
| canary: unmodified copy | exit 0; # fail 0 |
| canary: checkPlan always ok | exit 1; # fail 14 |
| intervalMin off-by-one (s > min) | exit 1; # fail 6 |
| intervalMax off-by-one (s < max) | exit 1; # fail 4 |
| countMax off-by-one (>= 50 rejected) | exit 1; # fail 2 |
| countMax missing (no upper bound) | exit 1; # fail 1 |
| totalMax off-by-one (>= rejected) | exit 1; # fail 1 |
| totalMax bound missing | exit 1; # fail 1 |
| totalMin missing (0 accepted) | exit 1; # fail 1 |
| interval rounded instead of rejected (placed before validation; probe `checkPlan([30,5.5],90)` → "…cykl 0:36…") | exit 1; # fail 1 |
| interval fraction truncated (placed before validation; probe → "…cykl 0:35…") | exit 1; # fail 1 |
| interval integer check dropped | exit 1; # fail 1 |
| numeric strings coerced | exit 1; # fail 1 |
| total rounded instead of rejected | exit 1; # fail 1 |
| ok by tolerance (round cycles) | exit 1; # fail 2 |
| below allows 0 (no >= cycle bound) | exit 1; # fail 3 |
| above without 6 h bound | exit 1; # fail 2 |
| above bound strict (< max) | exit 1; # fail 1 |
| above = next multiple +1 | exit 1; # fail 5 |
| message names both bounds always | exit 1; # fail 3 |
| limit breach shares the cycle message | exit 1; # fail 1 |
| plural: no 12–14 exception | exit 1; # fail 1 |
| plural: only n 2..4 (no last digit) | exit 1; # fail 1 |
| plural: exception on n, not n % 100 | exit 1; # fail 1 |
| plural: 1 → cykle | exit 1; # fail 3 |
| formatClock: no hours | exit 1; # fail 4 |
| activeMs: no clamp at 0 | exit 1; # fail 2 |
| activeMs: ignores pausedAt | exit 1; # fail 3 |
| activeMs: ignores pausedMs | exit 1; # fail 5 |
| pause: re-pause overwrites pausedAt | exit 1; # fail 1 |
| pause: mutates input | exit 1; # fail 1 |
| resume: resume of running adds time | exit 1; # fail 1 |
| resume: no clamp on clock skew | exit 1; # fail 1 |
| resume: keeps pausedAt | exit 1; # fail 6 |
| countdown counted (startedAt = now) | exit 1; # fail 2 |
| COUNTDOWN_SEC = 5 | exit 1; # fail 3 |
| countdownSec floor instead of ceil | exit 1; # fail 1 |
| intervalAt: boundary stays on old interval (<=) | exit 1; # fail 3 |
| intervalAt: done strict (>) | exit 1; # fail 1 |
| intervalAt: done never | exit 1; # fail 1 |
| intervalAt: position = index (no cycle) | exit 1; # fail 3 |
| intervalAt: cycle 1-based | exit 1; # fail 4 |
| intervalAt: no wrap (cycle 0 forever) | exit 1; # fail 4 |
| intervalAt: remainingMs off by one | exit 1; # fail 5 |
| intervalAt: remaining = whole interval | exit 1; # fail 3 |
| intervalAt: negative not clamped | exit 1; # fail 1 |
| intervalAt: no throw on empty list | exit 1; # fail 1 |
| browser path: no global | exit 1; # fail 1 |

Every variant diverges. (A first rounding variant placed after the integer check survived, but it changed no behaviour — 5.5 is rejected before reaching it — so it was rebuilt before validation, where it fails as shown.) Every clause of the Phase 1 Slice details is pinned: limits, `ok` only on an exact multiple, never rounded, `below`/`above` edges (total < one cycle, `above` beyond / exactly at 6 h), the message wording naming only existing bounds, own messages for limit breaches, the listed plurals, `activeMs` never negative, pause/resume new objects and no-ops, countdown excluded, `intervalAt` exact boundary / last ms / done / wrap, pause freezing both `activeMs` and `intervalAt`. Empty and missing input is covered for `checkPlan` (`[]`, `null`, `undefined`, `'x'`, `{}`; totals `null`, `undefined`, `NaN`) and `intervalAt` (`[]`, `null`, `[0,0]`). All time logic takes `now` as a parameter and is tested with explicit values.

### Manual

none — this slice has no manual items.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | CONCERNS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | CONCERNS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | CONCERNS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 0 · Minor: 4 · Nit: 2

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Every exported function carries a short Polish comment stating its contract (`checkPlan` rule, session shape, countdown excluded, boundary rule in `intervalAt`). The file header explains the UMD dual use.

### D2. Are all relevant types of documentation covered?

**Verdict:** CONCERNS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no setup/deploy change in this slice |
| CLAUDE.md | yes (invalidated) | no | says there are no tests and that three files hold the logic |
| ADR | no | — | none exist |
| phpdoc / API | N/A | — | no HTTP route in this slice |
| Query header comments | N/A | — | |
| E2E rules / selectors | N/A | — | |
| Translations | N/A | — | strings are inline Polish by project convention |

- **[minor]** `claude-md-says-no-tests` — `CLAUDE.md` ("There are no tests, linter or formatter configured"; "Three files hold almost all the logic") — after this slice there is a `node:test` suite (`node --disable-warning=ExperimentalWarning --test`) and a fourth logic file shared by browser and server; `package.json` has no `test` script either. A reader following CLAUDE.md will not run the tests. The slice guardrail ("nothing else changes in this slice") forbids fixing it here, so this is for a later phase or the end of the run, not for this builder.

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

Comments and messages are correct Polish; the brief's example message is reproduced verbatim (asserted in test line 71–72).

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 1 Slice details) | Implemented in | Status |
| :-- | :-- | :-- |
| pure functions, no DOM, no `Date.now()` | `public/cardio-core.js` (whole file; no `Date`, `document`, `window`) | met |
| UMD wrapper: global `CardioCore` + `module.exports` | `public/cardio-core.js:4-7`; test line 16–24 runs it in a `vm` context | met |
| comments and messages in Polish | whole file | met |
| `LIMITS` 5–3600 s int, 1–50, 1–21600 s | `:11-18` (frozen) | met |
| `checkPlan` → `{ ok, cycleSec, cycles, below, above, message }`, ok only on exact multiple, never rounded | `:47-84` | met |
| `below` ≥ cycleSec else null; `above` ≤ totalMax else null; message names only existing bounds; own limit-breach messages | `:71-83`, `:51-66` | met |
| Polish plural 1 / 2–4 (not 12–14) / 0, 5+ | `:33-38` | met |
| session `{ startedAt, pausedAt, pausedMs }`, `activeMs` never negative, `pause`/`resume` new objects, no-ops | `:88-109` | met |
| `COUNTDOWN_SEC = 3`, interval `startedAt` = end of countdown | `:21`, `:91` | met |
| `intervalAt` → `{ done, index, position, cycle, intervalSec, remainingMs }`, boundary → next, done at ≥ total | `:118-145` | met |
| tests for each clause incl. failure paths and edges | `test/cardio-core.test.js` (table above) | met |
| Slice guardrails: no load-time side effects (besides the global in the browser); nothing else changes | `git status --porcelain` shows only the two new files besides the pre-existing untracked ones; no tracked file modified; brief.md text before `## Progress` hashes to the workbench's frozen hash `31204a6e…` | met |

D1, D2, D3, D4 (the pure-function halves this slice's rows tag) are each pinned by a passing assertion: D1 test 20/21, D2 tests 5–17, D3 tests 25–32, D4 tests 34–35. No Out-of-scope item is touched; no Guardrail is breached (no migration, no data access).

API fitness for the later phases: `db.js` can `require('./public/cardio-core')` and throw `ValidationError(checkPlan(...).message)`; the session is a plain JSON object whose `startedAt` already encodes the countdown end, so persisting it in `trening.cardio.v1` and ticking with `Date.now()` every 250 ms works; `position` gives Phase 3 a monotonic value to detect interval changes.

### I2. Is it logically correct?

**Verdict:** CONCERNS

- **[minor]** `cycles-fractional-when-not-ok` — `public/cardio-core.js:68,83` — when the total is not a multiple, `cycles` is returned as the raw quotient. **Fails when:** `checkPlan([30,60],600).cycles` → `6.666666666666667`; a Phase 3 builder line that renders `cyclesLabel(r.cycles)` (D2: "the app shows how many full cycles of the sequence fit") prints `6.666666666666667 cykli`. The brief does not define `cycles` for the not-ok case, so this is an API trap, not a contract breach; `Math.floor`, or `null` like the other failure branches, would be safer. No test pins `cycles` on the not-ok path.
- **[minor]** `total-type-error-misleading-message` — `public/cardio-core.js:61-62` — a fractional or non-number total gets the message for a zero total. **Fails when:** `checkPlan([30,60], 90.5)` or `checkPlan([30,60], "540")` → `"Podaj czas treningu większy od zera"`; once Phase 2 returns this text as the HTTP 400 body, a client that sends the total as a string (a raw `<input>` value) sees "greater than zero" for 9:00. The brief asks that "a limit breach gets its own message".
- **[nit]** `sparse-array-nan-bounds` — `public/cardio-core.js:57,60` — `every` and `reduce` skip holes. **Fails when:** `checkPlan(new Array(3), 15)` → `ok:false`, `cycleSec:0`, `below:NaN`, message `"…(cykl 0:00). Najbliższy pasujący czas: NaN:NaN (NaN cykli)."`. JSON cannot produce holes and the builder will use `push`, so this is unreachable in practice.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

Small, flat functions; the helpers beyond the brief's list (`formatClock`, `cyclesWord`, `cyclesLabel`, `newSession`, `newIntervalSession`, `countdownSec`) each serve the message or the Phase 3 runner.

- **[nit]** `formatclock-duplicates-fmtelapsed` — `public/cardio-core.js:26-30` is the same algorithm as `fmtElapsed` in `public/app.js:27-31`. Not fixable in this slice (app.js may not change); Phase 3 can use `CardioCore.formatClock` rather than adding a third copy.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** CONCERNS

- **[minor]** `nan-input-not-guarded` — `public/cardio-core.js:94-97,118-144` — `Math.max(0, NaN)` is `NaN`, and `intervalAt` does not check `totalSec`. **Fails when:** a persisted session lacks `pausedMs` (`activeMs({startedAt:0,pausedAt:null},1000)` → `NaN`), then `intervalAt([5,7],24,NaN)` throws `RangeError('Nie znaleziono bieżącego interwału')` on every 250 ms tick; and `intervalAt([5,7], undefined, 999999999).done` → `false`, so a session whose `totalSec` was lost never ends by itself. The inputs come from the app's own `newSession` and a `checkPlan`-validated plan, so this only bites on a corrupted or reshaped `localStorage` value; Phase 3 should validate the restored session (or these functions should treat non-finite input as 0 / done).

### I5. Is it performant?

**Verdict:** PASS

`intervalAt` is O(intervals) ≤ 50 per 250 ms tick; `checkPlan` is O(n) per builder keystroke. Negligible.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No I/O, no SQL, no DOM. Messages interpolate only numbers formatted by `formatClock` / `cyclesLabel`; Phase 3 must still pass them through `esc()` like any other value.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A — pure functions; no `console.*` left in the code.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A — `package.json` / `package-lock.json` unchanged; tests use `node:test`, `node:assert`, `node:vm`, `node:fs`, `node:path`.

---

## Architecture — the project's own rules

- "Write all UI text, error messages and code comments in Polish" → meets — every comment, message and test name is Polish.
- "Migrations are append-only" / "Every multi-statement write goes through tx()" / sanitizers → N/A in this slice (no DB code).
- "Never run the app or a test against ./data/trening.db or port 3000" → meets — the test opens no DB and no port.
- "Express is the only npm dependency; tests use node:test and node:assert" → meets.
- "A new top-level server file must be added to the Dockerfile" → meets — the shared file lives under `public/`, which the Dockerfile already copies (research.md, Dockerfile:12).
- "API URLs stay relative" / `esc()` → N/A in this slice (no frontend wiring yet).

## Not reviewed

- The browser load path in a real browser: only exercised through `vm.runInNewContext` (test 1); `index.html` does not load the file until Phase 3.
- `require('./public/cardio-core')` from `db.js` — not wired until Phase 2.
- Node 24 (container) — only Node v22.23.1 was run.
- Progress row texts and `## Slice details` of brief.md could not be diffed (the file is untracked); only the text before `## Progress` was checked, and it matches the frozen hash.

## Observations outside scope

- Pausing during the 3-2-1 countdown (forbidden by the Phase 3 slice details) would leave `countdownSec` at 0 while `activeMs` stays 0 for the rest of the countdown (`newIntervalSession(0)`, pause at 1000, resume at 5000 → `countdownSec` 0, `activeMs` 0 at both 5000 and 7000). Phase 3 must keep the "no pause during the countdown" rule.
