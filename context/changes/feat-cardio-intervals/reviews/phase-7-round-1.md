# Phase review — feat-cardio-intervals · Phase 7: Goal-review fixes · round 1

- **Scope:** `src/App.vue`, `src/components/CrossKindStartGuard.test.ts` · **Files reviewed:** 2 (`+247/-5`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 7: Goal-review fixes` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** FAIL
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none (no manual items), none (3 experiment commands, run by the coordinator)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 7.1 | component tests incl. new App-level cross-kind tests | `npx vitest run src/components` | pass — `Test Files  13 passed (13)` · `Tests  306 passed (306)`, no skips |
| 7.2 | 0 failing (baseline 0) | `npm test` | pass — `Test Files  31 passed (31)` · `Tests  784 passed (784)`; 0 failing = baseline 0 |
| 7.3 | build exits 0 | `npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 304ms`, exit 0 |

The new file ran inside 7.1 — a verbose run of it alone: `Tests  9 passed (9)`, all 9 names listed with `✓` (log: `<scratch>/critic-p7-r1/exp/real-verbose.log`).

### Manual

None in this phase (brief: "Manual items: none", "Carried manual items: none").

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All in a scratch copy (`<scratch>/mutant`, `node_modules` symlinked), one App.vue edit per mutant, file `src/components/CrossKindStartGuard.test.ts`. Log: `<scratch>/critic-p7-r1/exp/mutants.log`.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| M0 | canary: unmodified copy | coordinator | `Tests  9 passed (9)` | the copy runs the real tests |
| M1 | remove `if (now() < workoutEndedGuardUntil) return` | coordinator | `Tests  6 failed \| 3 passed (9)` — all 6 cross-kind tests red: `expected 'Przysiady' to be 'Plany'` / `expected 'PRZYGOTUJ SIĘ' to be 'Plany'` | the start check is pinned in both directions; same-kind tests stay green (the controllers' own guards cover them, as expected) |
| M2 | `<` → `<=` | coordinator | `Tests  6 failed \| 3 passed (9)` — `expected 'Plany' to be 'Przysiady'` | the exact 500 ms boundary is pinned (the "does 500 ms after" halves) |
| M3 | `endCardio` → `showList()` | coordinator | `2 failed` (cardio Zakończ → strength 150 ms, 499 ms) | pinned |
| M4 | `leaveCardio` → `showList()` | coordinator | `1 failed` (cardio „Wróć do planów” → strength) | pinned |
| M5 | `endWorkout` → `showList()` | coordinator | `2 failed` (strength Zakończ trening → cardio 150 ms, 499 ms) | pinned |
| M6 | `leaveWorkout` → `showList()` | coordinator | `1 failed` (strength „Wróć do planów” → cardio) | pinned |
| X1 | probe, unmodified App.vue: strength idle 2 h + 1 s, tap „Gotowe” expires it → list; 150 ms later tap „Start: Żwawy bieg” | coordinator | `×` — `AssertionError: expected '{"version":1,"kind":"cardio","planId"…' to be null` at `ExpiryProbe.test.ts:41` (the line before, `heading() === 'Plany'` after the expiring tap, passed) | a cardio session starts 150 ms after a strength screen change → finding `cross-kind-guard-misses-expiry` |
| X2 | control: same as X1, but „Start: Przysiady w Łodzi” | coordinator | `✓` | the strength controller's own guard refuses the same-kind start; only the cross-kind start leaks |
| X3 | probe: paused cardio idle 2 h + 1 s, tap „Wznów” expires it → list; 150 ms later strength start | coordinator | `×` — `expected '{"version":1,"planId":"strength-1","p…' to be null` at `ExpiryProbe.test.ts:61` | same leak in the other direction |

Probe skip lines: `Tests  2 failed | 1 passed (3)`, no skips. The probe file lives only in the scratch copy.

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | Documented? | pass (Nit) | both new App functions carry a docblock with the why; one wording Nit |
| D2 | All doc types covered? | n/a | no route, config, rule or user-facing text changed |
| D3 | Docs understandable? | pass | no wrong identifier or path |
| I1 | Satisfies the requirements? | **fail** | the end/leave paths are shared; a tap that expires a workout is a controller screen change the shared window misses |
| I2 | Logically correct? | pass | `<` boundary matches the controllers' `guarded()`; arm only when `confirmEnd()`/`leave()` return true |
| I3 | Unnecessary complexity? | pass | one variable, one helper; smallest change the brief names |
| I4 | Robust? | pass | no new I/O |
| I5 | Performant? | n/a | one comparison per tap |
| I6 | Secure? | n/a | no input, output or storage change |
| I7 | Observable? | n/a | no failure path added |
| I8 | New dependencies? | n/a | no manifest change |
| ARCH | Project rules | pass | see below |

Architecture — the project's own rules:

- Time through `src/lib/clock.ts`, never ticks — meets (`now()` imported from `./lib/clock`; tests move the clock with `vi.setSystemTime` only).
- `ACTION_GUARD_MS` 500 ms unchanged — meets (imported, not redefined).
- Strength guard unchanged for strength-only use — meets: the App window is armed at the same `now()` as `useWorkout.commit(null)` arms its own guard, so a strength-only user sees the same 500 ms; `useWorkout.ts` not touched; 784/784 green.
- No change to strength screens or texts (Out of scope) — meets: no template change.
- No new dependency; storage keys unchanged; no UI/DESIGN.md surface touched — meets.
- Tests: App-level, both directions, both end paths, literal 150/350/499/500 ms, clock moved by `vi.setSystemTime` — meets; Polish names (`Przysiady w Łodzi`, `Żwawy bieg`) used.

Blockers: 0 · Major: 1 · Minor: 0 · Nit: 2
Findings going back to a builder: `cross-kind-guard-misses-expiry`.

## Findings

### I1. Satisfies the requirements?

- **[Major]** `cross-kind-guard-misses-expiry` — `src/App.vue:62-65,107-110` — the brief asks that "a start of either kind is refused within 500 ms of the last screen change of either controller". The shared window is armed only in the four App end/leave handlers. A tap that expires an idle workout (`expireIfIdle` → `commit(null)` inside `useWorkout.finishSet/skip/undoLast/endRest/adjustRestBy` or `useCardio.pause/resume/askEnd`) also sends the user to the plan list, but arms only that controller's own guard, so the other kind's start is not refused. **Fails when:** a strength workout sits idle more than 2 h, the user double-taps „Gotowe”; the first tap expires it and shows „Plany”, the second tap 150 ms later on „Start: <cardio plan>” starts a cardio session (X1). The same happens from a paused cardio session through „Wznów” to a strength start (X3). Same-kind starts are refused (X2). Real but narrow path (needs a 2 h idle); confidence: medium on severity, high on behaviour. A fix that derives the window from the controllers' screen changes (for example, arm it whenever `workoutOpen` goes from true to false) would cover end, leave and expiry in one place; add an App-level test for the expiry path in both directions.

### D1. Documented?

- **[Nit]** `guard-until-docblock-wording` — `src/App.vue:57-61` — the docblock says the variable is "When a workout of either kind was last ended or left", but it holds that time plus `ACTION_GUARD_MS` (the end of the window). **Fails when:** n/a (wording only).

### Test adequacy

- **[Nit]** `strength-fixture-literal` — `src/components/CrossKindStartGuard.test.ts:32-36` — the brief asks to "build fixtures through the app's own functions"; `STRENGTH_PLAN` is a hand-written object, not `createPlan()`/`createExercise()` with overrides (the cardio fixture does spread `createCardioPlan()`). The literal has exactly the shape `createPlan()` produces, so it proves the same thing today. **Fails when:** a later change adds a field to `createPlan()` that the start path needs; this fixture would not get it.

## Not reviewed

- No browser walk: the phase lists no manual items. The fix is App-level logic with no template change.
- `context/changes/feat-cardio-intervals/*` (brief Progress rows, workbench, goal-review, screenshots) excluded by the brief's `bundle-exclude`.

## Observations outside scope

- A cardio session that reaches its planned end by the clock shows the end screen without a `commit`, so `useCardio` does not arm its guard for that screen change; a tap that lands just as the end screen appears is accepted on „Wróć do planów”. Pre-existing since phase 5; same-kind only, not this phase's clause. Read from `useCardio.ts`, not executed.
- All three guards (`useWorkout`, `useCardio`, App) use `at < guardUntil`; if the phone clock moves backwards after an end, starts are refused until the clock passes the old value again. Pre-existing pattern, not introduced here.
