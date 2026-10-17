# Loop workbench: feat-cardio-module

Cardio workout module   ·   plan: `brief.md`   ·   reviews: `reviews/`
started 2026-10-17   ·   probes: git: reachable · node+express: reachable · port 3999: free · playwright-cli: reachable (0.1.14)
flow mode: brief (default flow)
base: c20c239
research: ran (one sonnet agent — touches hotspots MIGRATIONS/replaceAll and crosses db/api/frontend) → research.md; no Unknown changed a Done-when statement
exec prefix: none   ·   browser driver: ok (playwright-cli)   ·   lint hook: none (node --check only)
plan variant: brief
baseline: 0 unit (`node --test`) failing before this run (0 tests exist) · syntax: clean · smoke: exit 0
frozen hash: 31204a6eec64d65c76ae9878fdbe36c4c3d51386bccfdb57f93c9d0517ce19c6
owner-run: D3 audible beep + phone vibration on a real device (no row; walkthrough only)
open config proposals: none found

Ledger:
- [x] Phase 1: Cardio core logic
- [x] Phase 2: Cardio data model and API
- [ ] Phase 3: Cardio tab, runner and journal
- [ ] Phase 4: Cardio in the calendar
- [ ] goal review
- [ ] e2e walkthrough
- [ ] retrospective
- [ ] final report

Decisions taken from research Unknowns (slice details, not Done-when changes):
- cardio workouts get their own `cardio_workouts` table — strength consumers stay untouched
- limits: interval 5–3600 s, 1–50 intervals, total ≤ 6 h; free mode is never scheduled
- D2 with a total shorter than one cycle: no valid time below exists, the message names only the one above
- D10 covers the countdown too (countdown end persisted)

## Status

| Phase | Builder | Rounds | State | Category | Wall / subagent | Tokens |
|---|---|---|---|---|---|---|
| 1 — Cardio core logic | sonnet | 1 | CONCERNS (4 minor, 2 nit) → `d7dbb2b` | feature | 8m / 6m | 232k |
| 2 — Cardio data model and API | sonnet | 1 | CONCERNS (3 minor, 4 nit) → `525b781` | feature | 13m / 12m | 309k |
| 3 — Cardio tab, runner and journal | sonnet | 1 | in progress | feature | — | — |
| 4 — Cardio in the calendar | sonnet | 0 | waiting | feature | — | — |

Routing (Step 1): every slice is `sonnet` — each writes production code and tests (1, 2) or frontend
logic with manual items (3, 4). Categories: all `feature` — each delivers new user-visible behaviour
(1 interval/pause rules, 2 cardio persistence and API, 3 the Cardio tab and runner, 4 cardio in the calendar).

## Run totals

phases measured: 2 of 4 executed (0 wall unknown)   ·   tokens are subagents only
research agent: 107k tok / 11 calls / 1m (not a phase)

| Category | Phases | Tokens | % tokens | Wall | % wall | Subagent time |
|---|---|---|---|---|---|---|
| feature | 2 | 541k | 100% | 21m | 100% | 18m |
| stabilization | 0 | 0 | 0% | 0m | 0% | 0m |
| refactor | 0 | 0 | 0% | 0m | 0% | 0m |
| end-of-run review | — | — | — | — | — | — |
| **total** | 2 | 541k | 100% | 21m | 100% | 18m |

---

## Phase 3 — Cardio tab, runner and journal

phase:     feature  ·  start 2026-10-17T14:16:20+0200  ·  end <pending>  ·  user wait 0m  ·  paused 0m

### round 2          builder sonnet → critic opus
  cost:      builder 96k tok / 22 calls / 2m  ·  critic 230k tok / 64 calls / 18m
  automated: 3/3   manual: 8/8 passed (0 unreachable)
  verdict:   CONCERNS (4 minor, 1 nit)
  blockers:  none
  majors:    none
  closures:  `wakelock-double-request-leak` closed (counting fake: interval reload → summary {req:1,rel:1,active:0}; strength reload → run-save = HEAD) · `cardio-storage-shape-unchecked` closed (6 corrupt values reloaded, app loads, key removed; 28/29 validator mutants killed)
  report:    reviews/phase-3-round-2.md
  spot-check: re-ran 3.2 (# tests 75, # fail 0); isValidStored accepts a value with no top-level startedAt, as the new minor says → confirmed
  diff:      cumulative 5 files, +566/-18 (round 2: keepAwake guard, CardioCore.isValidStored + 3 tests)
  clauses:   both findings mapped (isValidStored → 3 node tests; wake lock → browser counts, no DOM in node:test)
  scripted:  public/app.js, public/cardio-core.js (python replace), test/cardio-core.test.js (heredoc) — node --check clean
  inconclusive: none
  integrity: plan-freeze clean; slice details unchanged; no removed test lines
  builder:   serialized keepAwake with desired-state guard; full stored-value validation on load

### round 1          builder sonnet → critic opus
  cost:      builder 155k tok / 33 calls / 7m  ·  critic 258k tok / 82 calls / 19m
  automated: 3/3   manual: 8/8 passed (0 unreachable)
  verdict:   FAIL
  blockers:  none
  majors:    `wakelock-double-request-leak` — render() calls syncOverlayState→keepAwake twice with no in-flight guard; a second sentinel stays held after the workout (strength regression); public/app.js:132-138, 489-505
             `cardio-storage-shape-unchecked` — loadCardio accepts a malformed trening.cardio.v1; renderCardio throws from top-level render(), loadState never runs, the whole app is stuck; public/app.js:53-57
  report:    reviews/phase-3-round-1.md
  spot-check: opened app.js:53-57 (only mode + startedAt checked) and app.js:132-138 + 489-499 (two renderers, no pending guard) → confirmed
  diff:      5 files, +468/-11 (app.js +420)
  clauses:   frontend clauses mapped to manual rows 3.4–3.11; 2 new pure helpers → 2 node tests
  scripted:  public/app.js, public/cardio-core.js, public/index.html, public/styles.css (python replace), test/cardio-core.test.js (heredoc append) — node --check at 2f
  inconclusive: none
  integrity: plan-freeze clean; slice details unchanged; no never-weaken hit (no removed test lines)
  builder:   Cardio tab, builder, templates, cardio runner (countdown/pause/auto-end/beeps), save + journal cards, shared plumbing

## Phase 2 — Cardio data model and API

phase:     feature  ·  start 2026-10-17T14:02:51+0200  ·  end 2026-10-17T14:16:13+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 13m  ·  subagent time 12m  ·  tokens 309k (subagents only)  ·  rounds 1

### round 1          builder sonnet → critic opus
  cost:      builder 118k tok / 12 calls / 3m  ·  critic 191k tok / 37 calls / 9m
  automated: 5/5   manual: n/a (no manual items in this slice)
  verdict:   CONCERNS (3 minor, 4 nit)
  blockers:  none
  majors:    none
  report:    reviews/phase-2-round-1.md
  spot-check: re-ran 2.5 (# tests 70, # fail 0); opened db.js:361 → new "Podaj dokładnie jedno" message as cited → confirmed
  diff:      db.js +149/-~15, server.js +6, 3 new test files (320 + 106 + 132 lines)
  clauses:   34/35 mapped to a test (1 unmapped: "every multi-statement write in tx()" — code property; critic's mutants M31/M32 confirm no reachable effect)
  scripted:  db.js, server.js (python anchor replace) — node --check clean at 2f; brief.md (sed checkbox flip; integrity clean)
  inconclusive: none
  integrity: plan-freeze clean; slice details unchanged (md5 match)
  foreign:   documentation/pain-points-research-brief.md appeared at 14:09 — written by neither builder nor critic; left unstaged
  builder:   migration v3, cardio repo + routes, addSchedule plan XOR template, replaceAll with cardio; 34 tests; HEAD check red 34/34

## Phase 1 — Cardio core logic

phase:     feature  ·  start 2026-10-17T13:54:55+0200  ·  end 2026-10-17T14:02:41+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 8m  ·  subagent time 6m  ·  tokens 232k (subagents only)  ·  rounds 1

### round 1          builder sonnet → critic opus
  cost:      builder 98k tok / 9 calls / 2m  ·  critic 135k tok / 18 calls / 4m
  automated: 3/3   manual: n/a (no manual items in this slice)
  verdict:   CONCERNS (4 minor, 2 nit)
  blockers:  none
  majors:    none
  report:    reviews/phase-1-round-1.md
  spot-check: re-ran 1.1 (# tests 36, # fail 0) and checkPlan([30,60],600) → cycles 6.67 as cited → confirmed
  diff:      2 new files, +485/-0 (public/cardio-core.js 154, test/cardio-core.test.js 331)
  clauses:   26/27 mapped to a test (1 unmapped: "no side effects at load time")
  scripted:  test/cardio-core.test.js (python replace on its own new file; node --check clean), brief.md (sed checkbox flip; integrity clean)
  inconclusive: none
  integrity: plan-freeze clean; slice details unchanged (md5 match)
  builder:   added CardioCore (checkPlan, plurals, session pause/resume, countdown, intervalAt) + 36 tests
