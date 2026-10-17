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
- [ ] Phase 1: Cardio core logic
- [ ] Phase 2: Cardio data model and API
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
| 1 — Cardio core logic | sonnet | 0 | waiting | feature | — | — |
| 2 — Cardio data model and API | sonnet | 0 | waiting | feature | — | — |
| 3 — Cardio tab, runner and journal | sonnet | 0 | waiting | feature | — | — |
| 4 — Cardio in the calendar | sonnet | 0 | waiting | feature | — | — |

Routing (Step 1): every slice is `sonnet` — each writes production code and tests (1, 2) or frontend
logic with manual items (3, 4). Categories: all `feature` — each delivers new user-visible behaviour
(1 interval/pause rules, 2 cardio persistence and API, 3 the Cardio tab and runner, 4 cardio in the calendar).

## Run totals

phases measured: 0 of 4 executed   ·   tokens are subagents only
research agent: 107k tok / 11 calls / 1m (not a phase)

| Category | Phases | Tokens | % tokens | Wall | % wall | Subagent time |
|---|---|---|---|---|---|---|
| feature | 0 | 0 | 0% | 0m | 0% | 0m |
| stabilization | 0 | 0 | 0% | 0m | 0% | 0m |
| refactor | 0 | 0 | 0% | 0m | 0% | 0m |
| end-of-run review | — | — | — | — | — | — |
| **total** | 0 | 0 | 100% | 0m | 100% | 0m |

---

## Phase 1 — Cardio core logic

phase:     feature  ·  start 2026-10-17T13:54:55+0200  ·  end <pending>  ·  user wait 0m  ·  paused 0m

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
