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

- [ ] Phase 1 — Unit test harness
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
| 1 — Unit test harness | sonnet | 0 | waiting | stabilization | — | — |
| 2 — Plan model and device storage | sonnet | 0 | waiting | feature | — | — |
| 3 — App shell, plan list and new-plan editor | sonnet | 0 | waiting | feature | — | — |
| 4 — Workout engine | sonnet | 0 | waiting | feature | — | — |
| 5 — Workout screens, rest timer and sound | sonnet | 0 | waiting | feature | — | — |
| 6 — Resume, expiry, Wake Lock and early end | sonnet | 0 | waiting | feature | — | — |
| 7 — Undo, skip and rest adjustment on screen | sonnet | 0 | waiting | feature | — | — |
| 8 — Edit and delete a plan | sonnet | 0 | waiting | feature | — | — |

## Run totals

phases measured: 0 of 8   ·   tokens are subagents only

---

## Phase 1 — Unit test harness

phase:     stabilization  ·  start 2026-10-18T17:14:15+0200

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
