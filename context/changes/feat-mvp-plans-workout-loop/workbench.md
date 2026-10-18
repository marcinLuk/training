# Loop workbench: feat-mvp-plans-workout-loop

Trening MVP — plans and workout loop (roadmap F-03, S-01…S-06)   ·   plan: `brief.md`   ·   reviews: `reviews/`
started 2026-10-18   ·   probes: git: reachable · node≥22+deps: reachable · port 4199 free: reachable · playwright-cli: reachable (0.1.14)
flow mode: brief (default flow)
base: 9853694
exec prefix: none (bare commands, repo root)   ·   browser driver: ok (playwright-cli)   ·   lint hook: none (subagents run `npx vue-tsc -b` themselves)
plan variant: brief
research: done — research.md (sonnet, 75k tok / 8 calls / 48s)
baseline: 0 failing (no test suite before this run); `npm run build` green
frozen hash: a023cbb245adbb8f8f0b3d9aa63fe956be850d7b4bc7d4e389a96801a7562dad
owner-run: D10 — real phone only: sound in headphones, screen stays on, real screen lock / app switch
open config proposals: 1 — §5 instrumentation forms for audio / wake lock (addInitScript fakes) (from feat-cardio-module); the other cardio proposals target the deleted prototype or are already in auto-loop.md
pre-run dirty paths: CLAUDE.md (owner's "Browser rule" section), context/foundation/auto-loop.md, context/foundation/roadmap.md — phase 1 must edit CLAUDE.md, so the owner's 4-line edit rides into phase 1's commit

## Ledger

- [x] Phase 1 — Unit test harness
- [ ] Phase 2 — Plan model and device storage
- [ ] Phase 3 — App shell, plan list and new-plan editor
- [ ] Phase 4 — Workout engine
- [ ] Phase 5 — Workout screens, rest timer and sound
- [ ] Phase 6 — Resume, expiry, Wake Lock and early end
- [ ] Phase 7 — Undo, skip and rest adjustment on screen
- [ ] Phase 8 — Edit and delete a plan
- [ ] goal review
- [ ] e2e walkthrough
- [ ] retrospective
- [ ] final report

## Routing (Step 1)

| Phase | Builder | Category | Reason |
|---|---|---|---|
| 1 | sonnet | stabilization | test tooling only (package.json, tsconfig, vite config) — always-sonnet paths; the deliverable is the harness that guards every later slice |
| 2 | sonnet | feature | production code in `src/**`, storage hotspot (FR-011) |
| 3 | sonnet | feature | UI with logic, DESIGN.md tokens hotspot, manual items |
| 4 | sonnet | feature | workout state + rest-from-timestamps hotspots |
| 5 | sonnet | feature | UI with logic, timer and sound, manual items |
| 6 | sonnet | feature | running-workout persistence hotspot (FR-009), manual items |
| 7 | sonnet | feature | UI with logic, manual items |
| 8 | sonnet | feature | UI + storage hotspot, manual items |

## Status

| Phase | Builder | Rounds | State | Category | Wall / subagent | Tokens |
|---|---|---|---|---|---|---|
| 1 — Unit test harness | sonnet | 1 | CONCERNS (1 minor, 1 nit) → `5eff3e6` | stabilization | 7m / 6m | 230k |
| 2 — Plan model and device storage | sonnet | 0 | waiting | feature | — | — |
| 3 — App shell, plan list and new-plan editor | sonnet | 0 | waiting | feature | — | — |
| 4 — Workout engine | sonnet | 0 | waiting | feature | — | — |
| 5 — Workout screens, rest timer and sound | sonnet | 0 | waiting | feature | — | — |
| 6 — Resume, expiry, Wake Lock and early end | sonnet | 0 | waiting | feature | — | — |
| 7 — Undo, skip and rest adjustment on screen | sonnet | 0 | waiting | feature | — | — |
| 8 — Edit and delete a plan | sonnet | 0 | waiting | feature | — | — |

## Run totals

phases measured: 1 of 8 (0 wall unknown)   ·   tokens are subagents only

| Category | Phases | Tokens | % tokens | Wall | % wall | Subagent time |
|---|---|---|---|---|---|---|
| feature | 0 | 0 | 0% | 0m | 0% | 0m |
| stabilization | 1 | 230k | 100% | 7m | 100% | 6m |
| refactor | 0 | 0 | 0% | 0m | 0% | 0m |
| end-of-run review | — | — | — | — | — | — |
| **total** | 1 | 230k | 100% | 7m | 100% | 6m |

research (not a phase): 75k tok, 1m

---

## Phase 1 — Unit test harness

phase:     stabilization  ·  start 2026-10-18T17:14:15+0200  ·  end 2026-10-18T17:21:20+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 7m  ·  subagent time 6m  ·  tokens 230k (subagents only)  ·  rounds 1

### round 1          builder sonnet → critic opus
  cost:      builder 88k tok / 9 calls / 1m  ·  critic 142k tok / 34 calls / 5m
  automated: 5/5   manual: n/a (no manual items in this phase)
  verdict:   CONCERNS
  blockers:  none
  majors:    none
  minors:    `test-tsconfig-includes-all-src`, `test-watch-not-forced` (never fixed by design)
  report:    reviews/phase-1-round-1.md
  spot-check: re-ran 1.1 `npm test` → confirmed (1 passed)
  integrity: frozen hash clean; integrity.sh flagged tsconfig.app.json as a whole-file never-weaken entry — adjudicated not a breach (only `exclude` of test files, asked by the slice; no flag touched); pattern scan clean. From now on the never-weaken list is checked by a pattern scan, not whole-file diffs.
  diff:      7 tracked files changed (+1116/-35, of which package-lock +1094) + 2 new files
  clauses:   3/4 mapped (1 unmapped: watch script — checked by row 1.2)
  scripted:  package.json, package-lock.json (npm install + sed), tsconfig.app.json, tsconfig.json, CLAUDE.md (python3) — vue-tsc -b clean
  inconclusive: none
  builder:   Vitest 5.0.5 + VTU + jsdom harness, tsconfig.test.json, CLAUDE.md / tech-stack.md updated

## Phase 2 — Plan model and device storage

phase:     feature  ·  start 2026-10-18T17:21:48+0200

### round 1          builder sonnet → critic opus
  cost:      builder 98k tok / 10 calls / 2m  ·  critic 149k tok / 24 calls / 6m
  automated: 2/2   manual: n/a
  verdict:   FAIL
  blockers:  none
  majors:    `rest-step-15-unpinned` — a 30 s step survives the tests; src/plans/plan.test.ts:63-86
             `partial-read-writeback-unpinned` — a read that writes back the readable part survives; src/plans/planStore.test.ts:56-75
             `getplan-by-id-unpinned` — getPlan returning plans[0] survives; src/plans/planStore.test.ts:29-33
  minors:    `plural-hundreds-unpinned`, `persist-test-name-overclaims`, `save-accepts-plan-it-cannot-read`, `backup-repeated-per-failed-write`, `persist-once-per-load`, `unused-removeraw`
  report:    reviews/phase-2-round-1.md
  spot-check: opened plan.test.ts:71-84 (rest cases 0/90/600/-15/615/100/7.5 only) and planStore.test.ts getPlan calls → confirmed
  diff:      5 new files (+714/-0)
  clauses:   24/24 mapped (0 unmapped)
  scripted:  planStore.test.ts (python3), brief.md ticks (sed) — vue-tsc clean
  inconclusive: none
  builder:   plan model + localStorage store + shared storage helpers, 56 tests

### round 2          builder sonnet → critic opus
  cost:      builder 83k tok / 10 calls / 1m  ·  critic 138k tok / 22 calls / 5m
  automated: 2/2   manual: n/a
  verdict:   FAIL
  closures:  `rest-step-15-unpinned`, `partial-read-writeback-unpinned`, `getplan-by-id-unpinned` → closed (mutants M1–M9 killed)
  blockers:  none
  majors:    `plural-one-only-for-1-unpinned` — "21 seria" mutant survives; src/plans/plan.test.ts:101-113 (grew from round-1 minor `plural-hundreds-unpinned`)
  minors:    `persist-once-per-load`, `range-message-text-unpinned`, `save-accepts-id-read-rejects`, `unreadable-not-surfaced`, `version-below-1-unpinned`, `unused-removeraw`, `read-error-treated-as-missing`
  report:    reviews/phase-2-round-2.md
  spot-check: opened plan.test.ts:101-113 (inputs 1,2,4,5,12,14,22,0) → confirmed
  diff:      2 test files changed (test-only, +30)
  inconclusive: none
  builder:   added rest-step, raw-unchanged and getPlan-by-id assertions

### round 3          builder sonnet → critic opus
  cost:      builder 76k tok / 9 calls / 1m  ·  critic 134k tok / 22 calls / 4m
  automated: 2/2   manual: n/a
  verdict:   FAIL
  closures:  `plural-one-only-for-1-unpinned` → closed (P1–P3 killed); earlier closed ids re-checked, none back
  blockers:  none
  majors:    `summary-set-plural-unpinned` — every summary case has the same plural form for both counts; the set word keyed on the exercise count survives; src/plans/plan.test.ts:127-146
  minors:    `limit-messages-text-unpinned`, `removeraw-unused`, `persist-once-per-load`
  report:    reviews/phase-2-round-3.md
  spot-check: grep of summary assertions in plan.test.ts → confirmed (cases 1/1, 2/2, 5/20, 7/21, 2/22)
  diff:      plan.test.ts only (+22)
  inconclusive: none
  builder:   extended the plural table (11, 21, 31, 101–104, 111–114, 122) and two summary cases

### round 4          builder sonnet → critic opus
  cost:      builder 75k tok / 8 calls / 1m  ·  critic 129k tok / 17 calls / 3m
  automated: 2/2   manual: n/a
  verdict:   CONCERNS
  closures:  `summary-set-plural-unpinned` → closed (M1–M4 killed); 28 wrong implementations over the phase, all killed
  blockers:  none
  majors:    none
  minors:    `persist-once-per-page-load`, `removeraw-unused-export`, `blank-name-test-name` (nits)
  report:    reviews/phase-2-round-4.md
  spot-check: re-ran 2.1 `npx vitest run src/plans` → confirmed (96 passed)
  diff:      plan.test.ts only (summary table, 20 rows)
  inconclusive: none
  builder:   table-driven summary test over every plural pairing
