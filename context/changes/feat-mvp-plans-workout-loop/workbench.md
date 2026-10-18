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
- [x] Phase 2 — Plan model and device storage
- [x] Phase 3 — App shell, plan list and new-plan editor
- [x] Phase 4 — Workout engine
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
| 2 — Plan model and device storage | sonnet | 4 | CONCERNS (3 nits) → `f00c8ad` | feature | 25m / 22m | 882k |
| 3 — App shell, plan list and new-plan editor | sonnet | 2 | CONCERNS (2 minor, 4 nits) → `c8b1567` | feature | 22m / 19m | 603k |
| 4 — Workout engine | sonnet | 2 | CONCERNS (2 minor, 2 nits) → `e2ffda4` | feature | 17m / 15m | 468k |
| 5 — Workout screens, rest timer and sound | sonnet | 0 | waiting | feature | — | — |
| 6 — Resume, expiry, Wake Lock and early end | sonnet | 0 | waiting | feature | — | — |
| 7 — Undo, skip and rest adjustment on screen | sonnet | 0 | waiting | feature | — | — |
| 8 — Edit and delete a plan | sonnet | 0 | waiting | feature | — | — |

## Run totals

phases measured: 4 of 8 (0 wall unknown)   ·   tokens are subagents only

| Category | Phases | Tokens | % tokens | Wall | % wall | Subagent time |
|---|---|---|---|---|---|---|
| feature | 3 | 1953k | 89% | 64m | 90% | 56m |
| stabilization | 1 | 230k | 11% | 7m | 10% | 6m |
| refactor | 0 | 0k | 0% | 0m | 0% | 0m |
| end-of-run review | — | — | — | — | — | — |
| **total** | 4 | 2183k | 100% | 71m | 100% | 62m |

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

phase:     feature  ·  start 2026-10-18T17:21:48+0200  ·  end 2026-10-18T17:46:38+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 25m  ·  subagent time 22m  ·  tokens 882k (subagents only)  ·  rounds 4

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

## Phase 3 — App shell, plan list and new-plan editor

phase:     feature  ·  start 2026-10-18T17:46:57+0200  ·  end 2026-10-18T18:08:37+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 22m (includes one unstamped user wait — the lane-breach question)  ·  subagent time 19m  ·  tokens 603k (subagents only)  ·  rounds 2

### round 1          builder sonnet → critic opus
  cost:      builder 135k tok / 20 calls / 4m  ·  critic 201k tok / 45 calls / 8m
  automated: 3/3   manual: 2/2 (0 unreachable)
  verdict:   FAIL
  blockers:  none
  majors:    `validation-error-input-retention-unpinned` — the "a failed save keeps typed data" clause is pinned only for the storage-failure branch; src/components/PlanEditor.vue:47-50
  minors:    `claude-md-scaffold-note-stale` (licensed for round 2 as its own instruction), `design-md-primary-line-phase-scoped`, `design-md-copy-gaps`, `column-width-not-in-design`, `draft-lost-without-confirm`, `backup-failed-message-unpinned`, `field-label-uses-label-scale`, 4 nits
  report:    reviews/phase-3-round-1.md
  spot-check: opened PlanEditor.vue:47-50 and grep of PlanEditor.test.ts (only the storage-failure retention test at :125) → confirmed
  lane breach: the builder ran `git rm --cached` on HelloWorld.vue and undid it with `git update-index`; index verified equal to HEAD, no commit. Owner chose "continue" and delegated such stop/continue decisions to the orchestrator for this run. Shared rules now forbid git rm/mv/update-index by name.
  diff:      12 tracked files (+~60/-~420, scaffold deletions), ~25 new files
  clauses:   15/17 mapped (2 unmapped: visual checks → manual 3.5, build CSS check → row 3.3)
  scripted:  public/fonts (cp), fonts.css (shell loop), package.json (sed), PlanEditor/NumberStepper (python), DESIGN.md (python) — vue-tsc clean
  inconclusive: none
  builder:   tokens, local Barlow fonts, App switcher, plan list, plan editor with steppers, 22 component tests

### round 2          builder sonnet → critic opus
  cost:      builder 79k tok / 8 calls / 1m  ·  critic 188k tok / 43 calls / 6m
  automated: 3/3   manual: 2/2 (0 unreachable)
  verdict:   CONCERNS
  closures:  `validation-error-input-retention-unpinned` → closed (8 mutants killed; browser walk confirmed)
  blockers:  none
  majors:    none
  minors:    `backup-failed-copy-differs-from-design`, `column-width-undocumented`, `stepper-text-glyphs`, `empty-state-copy-partially-pinned`, `unused-target-min-token`, `claude-md-layout-omits-lib`
  report:    reviews/phase-3-round-2.md
  spot-check: re-ran 3.2 `npm test` → confirmed (121 passed)
  diff:      PlanEditor.test.ts (+23), CLAUDE.md (1 paragraph)
  inconclusive: none
  builder:   validation-failure retention test; CLAUDE.md layout paragraph

## Phase 4 — Workout engine

phase:     feature  ·  start 2026-10-18T18:08:51+0200  ·  end 2026-10-18T18:25:46+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 17m  ·  subagent time 15m  ·  tokens 468k (subagents only)  ·  rounds 2

### round 1          builder sonnet → critic opus
  cost:      builder 97k tok / 10 calls / 3m  ·  critic 150k tok / 25 calls / 6m
  automated: 2/2   manual: n/a
  verdict:   FAIL
  blockers:  none
  majors:    `islastset-test-not-on-last-exercise` — test named for the last exercise stops on exercise 2; src/workout/engine.test.ts:170-176
             `adjustrest-end-stamp-unpinned` — lastActivityAt on the −15 s rest-ending path unpinned; engine.ts:253
             `finished-cursor-docblock-unpinned` — "cursor = sets.length when finished" unasserted; engine.ts:51-53
  minors:    `elapsed-rest-reports-rest-mode` (note for p5/p6), `rest-remaining-exceeds-duration-on-clock-backstep` (licensed for round 2 as its own instruction), `max-set-count-magic-number`
  report:    reviews/phase-4-round-1.md
  spot-check: opened engine.test.ts:170-176 → confirmed (asserts 'Rozpiętki', not the last exercise)
  diff:      2 new files (+800)
  clauses:   all mapped; 9 builder mutants killed; critic: 39 mutants, 35 killed, 3 real gaps, 1 equivalent; 48k-action random invariant probe clean
  inconclusive: none
  builder:   pure workout engine + 54 tests

### round 2          builder sonnet → critic opus
  cost:      builder 79k tok / 7 calls / 1m  ·  critic 142k tok / 23 calls / 6m
  automated: 2/2   manual: n/a
  verdict:   CONCERNS
  closures:  `islastset-test-not-on-last-exercise`, `adjustrest-end-stamp-unpinned`, `finished-cursor-docblock-unpinned` → closed (C1–C3 killed); rest cap pinned (C4), differential probe 0 divergences on a forward clock
  blockers:  none
  majors:    none
  minors:    `last-activity-stamp-branch-unasserted`, `rest-view-fields-unasserted`, `canundo-dead-finished-check`, `docblock-new-state-on-noop`
  report:    reviews/phase-4-round-2.md
  spot-check: re-ran `npm test` before the critic → 176 passed; confirmed by the critic's 4.1 line
  note:      critic saw `curl localhost:4199` exit 28 (timeout, no local listener: no vite process in `ps`); not this run's server — watched in p5
  diff:      engine.ts (cap) + engine.test.ts (+12)
  inconclusive: none
  builder:   closed 3 test gaps; capped remaining rest at durationMs

## Phase 5 — Workout screens, rest timer and sound

phase:     feature  ·  start 2026-10-18T18:25:50+0200

### round 1          builder sonnet → critic opus
  cost:      builder 124k tok / 17 calls / 3m  ·  critic 205k tok / 51 calls / 11m
  automated: 3/3   manual: 2/2 (0 unreachable)
  verdict:   FAIL
  blockers:  none
  majors:    `double-tap-crosses-screens` — a double tap on "Gotowe"/"Gotowy, zaczynam" lands on the next screen and marks a set done with no tap meant for it; App.vue:34-43 (browser-proven)
             `gotowe-audio-unlock-unpinned` — useWorkout.ts:62
             `start-plan-lookup-unpinned` — App.vue:22-25
             `rest-time-rounding-unpinned` — WorkoutRest.vue:12-13
             `hidden-rest-end-later-silence-unexercised` — Workout.test.ts:195-202
  minors:    `settle-before-tap-docblock-overclaims`, `design-md-last-exercise-line-reworded` (owner to confirm), `plan-list-multiple-chalk-starts` (owner to confirm), `return-beep-depends-on-hidden-tick` (decided for round 2: no sound for a rest end detected > 2 s late)
  report:    reviews/phase-5-round-1.md
  spot-check: opened useWorkout.ts:61-66 (unlockAudio in finishSet; tests use an already-running fake) → consistent with the finding
  COMMANDS_RUN mismatch: 5.1 ran `npx vitest run src`, plan says `npx vitest run src/components` — the critic ran the plan's command (pass)
  diff:      5 tracked files (+80/-10), 9 new files (~800 lines)
  clauses:   20/21 mapped (1 admitted unpinned: resolveRest before a tap — judged a harmless safety net by the critic)
  scripted:  PlanList.vue/.test.ts, DESIGN.md (python), base.css (append) — vue-tsc clean
  inconclusive: none
  builder:   useWorkout composable, set/rest/end screens, Web Audio beeps, clock seam, Start on cards

### round 2          builder sonnet → critic opus
  cost:      builder 102k tok / 13 calls / 2m  ·  critic 207k tok / 59 calls / 12m
  automated: 3/3   manual: 2/2 (0 unreachable)
  verdict:   FAIL
  closures:  `double-tap-crosses-screens` (browser + mutant), `gotowe-audio-unlock-unpinned`, `rest-time-rounding-unpinned`, `hidden-rest-end-later-silence-unexercised` → closed; `start-plan-lookup-unpinned` → still-open ("take the last plan" survives)
  blockers:  `plan-card-start-below-64px` — plan-card Start is 56 px; DESIGN.md Layout: 64 px for the main action (Start, Gotowe); PlanList.vue:18
  majors:    `start-plan-lookup-unpinned` (repeated), `guard-window-size-unpinned` — tests move the clock by the constant itself; useWorkout.ts:23
  minors:    `end-screen-back-unguarded`, `return-beep-depends-on-hidden-tick`, `settle-before-tap-docblock-overclaims`, `plan-list-multiple-chalk-starts`, `design-md-last-exercise-line-reworded`
  report:    reviews/phase-5-round-2.md
  spot-check: opened PlanList.vue:16-22 (btn-primary btn-block, no btn-large) and DESIGN.md:202 → confirmed
  diff:      useWorkout.ts (+28), Workout.test.ts (+150)
  inconclusive: none
  builder:   500 ms action guard, 2 s late-sound rule, four test gaps
  decisions (round-2 contract): action guard after a screen change; sound only when visible and ≤ 2 s late

### valve trip — phase 5 after round 2
  valve:     repeated finding — `start-plan-lookup-unpinned` returned as Major after round 2 claimed to close it
  evidence:  reviews/phase-5-round-2.md:144 — the only two-plan test taps the last card; "always start the last plan" passes 209/209
  decision:  orchestrator, under the owner's standing delegation for this run ("make these decisions, do not ask me"): continue with a user-supplied-style instruction — the test taps BOTH cards (first and last of three) and asserts each starts its own plan. Also decided for round 3: the guard covers "Wróć do planów" on the end screen; "ended while hidden → silent" is read strictly (the page must have been visible at the rest's end time).

### round 3          builder sonnet → critic opus
  cost:      builder 97k tok / 9 calls / 2m  ·  critic 210k tok / 57 calls / 12m
  automated: 3/3   manual: 2/2 (0 unreachable)
  verdict:   CONCERNS
  closures:  `plan-card-start-below-64px`, `start-plan-lookup-unpinned`, `guard-window-size-unpinned` → closed; earlier closed ids re-checked by mutants, none back
  blockers:  none
  majors:    none
  minors:    `start-after-back-unguarded` (licensed into phase 6 as its own instruction), `plan-list-multiple-chalk-starts` (owner to confirm), `design-md-last-exercise-line-reworded` (owner to confirm), `settle-before-tap-docblock-overclaims`, `hidden-return-test-skips-hide-event`, `next-row-title-not-uppercase`
  report:    reviews/phase-5-round-3.md
  spot-check: re-ran `npm test` → confirmed (216 passed)
  diff:      useWorkout.ts, App.vue, PlanList.vue (+btn-large), 2 test files
  inconclusive: none
  builder:   64 px card Start, three-plan Start tests, literal-time guard tests, guarded "Wróć do planów", strict hidden-rest silence
