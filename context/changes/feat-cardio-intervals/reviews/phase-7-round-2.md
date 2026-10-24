# Phase review — feat-cardio-intervals · Phase 7: Goal-review fixes · round 2

- **Scope:** `src/App.vue`, `src/components/CrossKindStartGuard.test.ts` · **Files reviewed:** 2 (`+325/-6`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 7: Goal-review fixes` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none (no manual items), none (6 mutants run by the coordinator in one script)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 7.1 | component tests incl. new App-level cross-kind tests | `npx vitest run src/components` | pass — `Test Files 13 passed (13)` · `Tests 310 passed (310)`, no skips |
| 7.2 | 0 failing (baseline 0) | `npm test` | pass — `Test Files 31 passed (31)` · `Tests 788 passed (788)`; 0 failing = baseline 0, no skips |
| 7.3 | build exits 0 | `npm run build` | pass — `vue-tsc -b && vite build` exit 0, `✓ built in 263ms`, `precache 23 entries` |

The baseline line counts 439 tests in 20 files (measured before the whole run); the growth to 788/31 comes from phases 1–7. The criterion is the failure count, which is 0.

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `cross-kind-guard-misses-expiry` | round 1 (Major) | closed | The window now arms in one sync watcher on `workoutOpen` true→false (`src/App.vue:67-73`). Real tree: 7.1 green incl. the 4 expiry tests. Mutant M2 rebuilds the round-1 shape (arm only in the end/leave handlers, watcher removed) → exactly the 4 expiry tests go red, e.g. `AssertionError: expected 'PRZYGOTUJ SIĘ' to be 'Plany'` at `CrossKindStartGuard.test.ts:234` (X1: „Gotowe” expiry → cardio start) and `expected 'Przysiady' to be 'Plany'` at `:253` (X3: „Wznów” expiry → strength start); `Tests 4 failed \| 9 passed (13)`, no skips. |

### Manual

None in this phase (brief: "Manual items: none", no carried items).

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All run by the coordinator in `<scratch>/mutant` (copy of `src/` etc., `node_modules` symlinked), each mutant = one `App.vue` edit, run with `vitest run src/components/CrossKindStartGuard.test.ts`. Script and logs: `<scratch>/critic-p7-r2/exp/`.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| M0 | canary, unchanged copy | coordinator | `Tests 13 passed (13)` | copy runs green; reds below come from the edit |
| M1 | remove `if (now() < workoutEndedGuardUntil) return` | coordinator | `Tests 10 failed \| 3 passed (13)` — all 6 cross-kind end tests + 4 expiry tests red; the 2 same-kind tests and the "no workout ended" test stay green | every cross-kind test pins the App guard; same-kind refusal still comes from each controller's own guard (strength rules unchanged) |
| M2 | round-1 shape: arm in handlers only | coordinator | `Tests 4 failed \| 9 passed (13)`, reds at `:234`, `:253`, `:268`, `:281`, all `expect(heading()).toBe('Plany')` | closure proof for `cross-kind-guard-misses-expiry`: tap expiry (both directions) and timer expiry are pinned |
| M3 | `<` → `<=` | coordinator | `Tests 9 failed \| 4 passed (13)` — every "…and does 500 ms after" test red | the 500 ms acceptance boundary is pinned |
| M4 | window `ACTION_GUARD_MS - 1` (499 ms) | coordinator | `Tests 3 failed \| 10 passed (13)`, reds at `:145`, `:190`, `:268` | the 499 ms refusal boundary is pinned for confirm (both kinds) and tap expiry |
| M5 | `flush: 'sync'` → `'pre'` | coordinator | `Tests 13 passed (13)` | the `sync` choice is not pinned; with `pre` the watcher runs in the same tick before render, so the window starts at most a microtask later — no observable behaviour difference, no finding |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass (Nit) | watcher and guard carry "why" comments; the guard variable's docblock describes the end time, not the end of the window (`guard-docblock-says-end-time`) |
| D2 | All doc types covered? | n/a | no README, rule file or user string touched |
| D3 | Docs understandable? | pass | no wrong identifiers or paths |
| I1 | Satisfies the requirements? | pass | shared 500 ms window for starts of either kind after any screen change to the list (confirm, end screen, tap expiry, timer expiry); App-level tests both directions, both end paths, literal 150/350/499 ms via `vi.setSystemTime`; `useWorkout.ts`/`useCardio.ts` untouched |
| I2 | Logically correct? | pass | `now() < until` matches the controllers' `at < guardUntil`; initial 0 lets the first start through (test at `:290`); a restore or expiry at mount produces no true→false change, so no stray window |
| I3 | No unnecessary complexity? | Nit | `showListAfterEnd` is now a pass-through to `showList` (`pass-through-show-list-after-end`) |
| I4 | Robust? | pass | no new I/O; the guard is per App instance, in memory |
| I5 | Performant? | n/a | one sync watcher on a boolean computed |
| I6 | Secure? | n/a | no input, storage or network change |
| I7 | Observable? | n/a | no failure path added |
| I8 | New dependencies? | n/a | no manifest change |
| ARCH | Project rules | pass | time through `src/lib/clock.ts` `now()` (meets); `ACTION_GUARD_MS` reused, not changed (meets); no tick counting — window is a timestamp (meets); strength tests untouched, no skip/only (meets); no UI/text change, so DESIGN.md not engaged (meets); test names use Polish letters („Przysiady w Łodzi”, „Żwawy bieg”) and fixtures go through `savePlan` / `createCardioPlan` and real taps (meets) |

Blockers: 0 · Major: 0 · Minor: 0 · Nit: 2
Findings going back to a builder: none.

## Findings

### D1. New features reasonably documented?

- **[Nit]** `guard-docblock-says-end-time` — `src/App.vue:57-62` — the docblock reads "When a workout of either kind was last ended or left", but `workoutEndedGuardUntil` holds the end time plus `ACTION_GUARD_MS` (the moment starts are allowed again), and it also arms on expiry, which is neither "ended" nor "left" by the user. **Fails when:** a reader takes the value as the end timestamp; no runtime effect.

### I3. No unnecessary complexity?

- **[Nit]** `pass-through-show-list-after-end` — `src/App.vue:117-120` — `showListAfterEnd()` only calls `showList()` now that the watcher arms the guard; the four handlers could call `showList()` directly. **Fails when:** no runtime effect; an extra name to follow.

## Not reviewed

- No browser walk: the phase has no manual items and the brief lists none to carry. The guard is proved at App level in jsdom only.
- `flush: 'sync'` versus the default flush is not pinned by a test (M5); judged harmless, see Experiments.

## Observations outside scope

- The expiry paths (tap or timer) return to the plan list without calling `showList()`, so `plans`, `deleteError` and `choosingType` are not refreshed on that route. This predates phase 7 and has no visible effect today (plans cannot change during a workout).
