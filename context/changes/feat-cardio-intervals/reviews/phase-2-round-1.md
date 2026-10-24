# Phase review — feat-cardio-intervals · Phase 2: Cardio session engine · round 1

- **Scope:** `src/workout/cardioEngine.ts`, `src/workout/cardioEngine.test.ts` · **Files reviewed:** 2 (`+727/-0`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 2: Cardio session engine` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none, none

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | Engine tests pass (D3, D4) | `npx vitest run src/workout/cardioEngine.test.ts` | pass — `Tests  34 passed (34)`, no skipped line; 34 equals the 34 `it` blocks in the file |
| 2.2 | 0 failing tests, baseline 0 (D3, D8) | `npm test` | pass — `Test Files  24 passed (24)` / `Tests  535 passed (535)`; 0 failing equals the baseline 0 |
| 2.3 | Build exits 0 (D3) | `npm run build` | pass — `vue-tsc -b && vite build` exit 0, `✓ built in 230ms`, `precache  23 entries` |

Runner traps checked: no `-t` filter is used; the file filter matched one file (`Test Files  1 passed (1)`). The build proves types only; behaviour is proved by 2.1 and by the experiments below.

### Manual (walked by the walker with playwright-cli; spot-checked: none)

None. The brief lists no manual items for this phase, and no walker was spawned.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All mutants ran in a scratch copy (`<scratch>/critic-p2-r1/mutant`, `node_modules` symlinked, no `vue-tsc` run there). Each mutant replaced exactly one snippet (the script asserts the snippet count is 1). The script restored the file after every run; `diff -q` against the real file confirmed the copy is back to the original.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| M00 | canary, no change | coordinator | GREEN · `Tests 34 passed (34)` | the copy runs the suite as the real tree does |
| M01 | expiry `>` → `>=` | coordinator | RED · `Tests  2 failed \| 32 passed (34)`; `AssertionError: expected true to be false` at `cardioEngine.test.ts:354:60` and `:364:61` | the strict 2 h boundary is pinned; no skip line appeared |
| M02 | expiry counted from `startedAt` | coordinator | RED · fails "counts the 2 h from the pause, not from the start" | pinned |
| M03 | a running session expires too | coordinator | RED · fails "never expires a running session" | pinned |
| M04 | countdown threshold `>=` → `>` | coordinator | RED · fails "…one to an interval of exactly 4 s" | 4 s boundary pinned |
| M05 | countdown threshold 3000 | coordinator | RED · same test | "shorter than 4 s" pinned |
| M06 | window includes `from` | coordinator | RED · fails "uses the window (from, to]" | pinned |
| M07 | window excludes `to` | coordinator | RED · 3 tests | pinned |
| M08 | last interval end gives `work-start` | coordinator | RED · 4 tests | "end of the last interval gives rest-start" pinned |
| M09 | no get-ready countdown | coordinator | RED · 4 tests | get-ready 3-2-1 pinned |
| M10 | start cue by kind of the ending interval | coordinator | RED · 3 tests | "by the kind of the next interval" pinned |
| M11 | Razem includes the get-ready | coordinator | RED · 4 tests | pinned |
| M12 | Zostało in get-ready includes the get-ready | coordinator | RED · "shows Razem 0 and Zostało as the whole plan" | pinned |
| M13 | timeline ignores `pausedTotalMs` | coordinator | RED · 4 tests | pause does not count — pinned |
| M14 | paused view uses `now` | coordinator | RED · 3 tests | frozen view pinned |
| M15 | progress inverted | coordinator | RED · 2 tests | pinned |
| M16 | paused phase shows the interval kind | coordinator | RED · 2 tests | phase `paused` pinned |
| M17 | cues not stopped by a pause | coordinator | RED · "gives no cue while paused" | pinned |
| M18 | cue at the pause instant dropped | coordinator | RED · same test | pinned |
| M19 | no clamp of the timeline at 0 | coordinator | RED · "does not count time before the start" | pinned |
| M20 | `resumeCardio` without `Math.max(0, …)` | coordinator | GREEN · `Tests 34 passed (34)` | defensive clamp; no contract clause or docblock claims it — not a finding |
| M21 | pause of a finished session allowed | coordinator | RED · "does not pause a finished session" | pinned |
| M22 | a second pause overwrites `pausedAt` | coordinator | RED · "ignores a second pause…" | pinned |
| M23 | resume of a running session returns a copy | coordinator | RED · same test (`toBe`) | pinned |
| M24 | pause does not set `lastActivityAt` | coordinator | RED · 1 test | pinned |
| M25 | resume does not set `lastActivityAt` | coordinator | RED · 1 test | pinned |
| M26 | `isLast` never true | coordinator | RED · "finds the first, middle and last interval" | pinned |
| M27 | get-ready `next` is null | coordinator | RED · 1 test | pinned |
| M28 | block repeats not applied | coordinator | RED · "builds a running state… with the repeats applied" | pinned |
| M29 | finished only after the end (`>`) | coordinator | RED · 3 tests | pinned |
| M30 | `GET_READY_MS` 5000 | coordinator | RED · 24 tests | literal 3 s pinned |
| M31 | two-beep countdown | coordinator | RED · 5 tests | 3-2-1 pinned |
| M32 | interval boundary `>` | coordinator | RED · 2 tests | "changes interval at exactly the end" pinned |
| M33 | pause allowed at the exact end | coordinator | RED · 1 test | pinned |
| M34 | cues ignore `pausedTotalMs` | coordinator | RED · 2 tests | "pause time shifts later cues" pinned |
| M35 | `pausedTotalMs` not accumulated | coordinator | RED · "adds up several pauses" | pinned |
| P1 | window `(startedAt, startedAt + 3000]` | coordinator | `[[1000,"countdown"],[2000,"countdown"],[3000,"work-start"]]`; from `startedAt - 1`: 4 cues incl. `[0,"countdown"]` | the first get-ready beep lies at the start instant; a window that opens at `startedAt` drops it |
| P2 | window that spans a pause and resume | coordinator | pause at +11000, resume at +20000; window `(+10500, +21000]` → `[[11000,"countdown"],[12000,"work-start"],[19000,"countdown"],[20000,"countdown"],[21000,"countdown"]]`; window `(+20000, +21000]` → `[[21000,"countdown"]]` | the documented limitation is real: a window that starts before the last resume returns misplaced and repeated cues |

Wrong-implementation table: 34 of 35 wrong implementations diverge from the phase's own tests. The one green (M20) changes a clamp that no clause names.

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | Module docblock explains the timeline rule; every exported type field and function has a docblock. |
| D2 | All documentation types covered? | n/a | A pure internal module; no command, route, config key or UI text changed. |
| D3 | Documentation understandable? | pass | No wrong names; the cue-window docblock matches the code (P2). |
| I1 | Satisfies the requirements? | pass | Every clause of the phase maps to code and to a red mutant (table above). |
| I2 | Logically correct? | concerns | Correct for every clause; two caller traps at the cue window edges (Minors below). |
| I3 | No unnecessary complexity? | pass | Small pure functions; reuses `expandCardioPlan` and `IDLE_EXPIRY_MS`. |
| I4 | Robust? | pass | Clock set back is clamped (M19); plan validation forces intervals of 5–3600 s, so the interval loop cannot run past the array for valid plans. |
| I5 | Performant? | pass | `cardioCues` and `getCardioView` are O(intervals); a plan has tens of intervals. |
| I6 | Secure? | n/a | No input from outside, no storage, no DOM. |
| I7 | Observable? | n/a | Pure functions, no failure path, no debug output. |
| I8 | New dependencies? | n/a | `package.json` and `package-lock.json` unchanged. |
| ARCH | Project rules | pass | See below. |

Architecture — the project's own rules:

- Pure module, `now` as a parameter, no timers, no DOM (phase contract) — meets: no `setTimeout`, `setInterval`, `Date.now`, `window` or `document` in `cardioEngine.ts`.
- Time from stored timestamps, never ticks (Guardrails, CLAUDE.md) — meets: every view and cue is computed from `startedAt`, `pausedAt`, `pausedTotalMs` and `now`; every test moves `now` with no ticks.
- Same expiry value as strength (`IDLE_EXPIRY_MS`) — meets: imported from `./engine`, pinned with the literal `7_200_000` in two tests.
- State shape `{ version: 1, kind: 'cardio', planId, planName, intervals, startedAt, pausedAt, pausedTotalMs, lastActivityAt }` — meets: `startCardio` test compares the whole object with `toEqual`.
- Constants pinned with literal values (slice guardrail) — meets: `GET_READY_MS` 3000 directly; the countdown offsets and the 4 s threshold through exact cue lists (M05, M31 red).
- Razem/Zostało tested across a pause (slice guardrail) — meets: "do not count a pause" and "…during the get-ready".
- No new dependency, storage keys unchanged, strength tests unchanged — meets: the only tracked-file changes are the Progress rows of `brief.md` and `workbench.md`.
- Out of scope — meets: nothing from the Non-Goals or "Out of scope" in the diff.
- Test-adequacy traps: lookup with three items (first, middle, last interval) — meets; Polish letters in names (`p-ł`, `Schłodzenie`) — meets; fresh-mount, double-tap and storage-shape traps — n/a for a pure engine with no UI or storage.
- `~/.claude/skills/10x-code-reviewer/criteria.md` — its rules are written for a PHP/Intense code base; none of them bind this TypeScript module.

Blockers: 0 · Major: 0 · Minor: 2 · Nit: 0
Findings going back to a builder: none.

## Findings

### I2. Is it logically correct?

- **[Minor]** `getready-first-beep-at-start-instant` — `src/workout/cardioEngine.ts:219-221` — the first get-ready countdown cue (3 s before the end of a 3 s get-ready) has its planned time exactly at `startedAt`. The window is `(fromMs, toMs]`, so a caller that opens its first window at the start time loses that beep. The docblock does not warn about it. **Fails when:** the phase 3 controller sets "last check" to `startedAt` and asks `cardioCues(state, startedAt, now)` → the user hears 2 get-ready beeps, not 3 (P1: 3 cues instead of 4). confidence: medium — the engine meets its stated window rule; the trap is for the caller. Phase 3 must open the first window before `startedAt` or play the start beep in the start tap, and pin it with a test.
- **[Minor]** `cues-window-before-resume-misplaces-cues` — `src/workout/cardioEngine.ts:206-210` — the state keeps only the total pause length, so `cardioCues` moves every cue by every pause, also cues that came before the pause. The docblock says so ("The caller must not start a window before the last resume"). The phase 3 plan says the controller "plays the cues from `cardioCues` since the last check". **Fails when:** the last check falls before a pause and the next check comes after the resume → the window returns the get-ready beeps and the countdown cue that already played before the pause, at shifted times (P2: 5 cues, of which `[20000,"countdown"]` is the repeat of the cue played at the pause instant and is within the 2 s late limit at `now = +21000`). Phase 3 must reset "last check" to the resume time and pin it with a test. confidence: medium — the limitation is documented and forced by the state shape the contract fixes.

## Not reviewed

- Validation of a stored `CardioState` (for example intervals with 0 or negative seconds read back from storage). With such a state, the interval loop in `getCardioView` can run past the array. The storage of the cardio state belongs to phase 3, so this review did not test it.
- Sound playback, the visible / 2 s late rule and the wake lock (D4 rest, D5, D8 wiring) — phase 3 and later.
- No browser walk: the phase has no manual items and no UI.

## Observations outside scope

- `CLAUDE.md` "Code layout" names `src/plans/`, `src/components/` and `src/styles/` but not `src/workout/`, which already held `engine.ts` before this change.
