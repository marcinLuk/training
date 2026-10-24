# Loop workbench: quality-of-life

Reorder and collapse exercises in the plan editor   ·   plan: `brief.md`   ·   reviews: `reviews/`
started 2026-10-24   ·   probes: git: reachable · node≥22+deps: reachable (vue-tsc 6.0.3) · port 4199 free: reachable · playwright-cli: reachable (0.1.14)
flow mode: brief (default flow)
base: a45c8e1
exec prefix: none (bare commands, repo root)   ·   browser driver: ok (playwright-cli)   ·   lint hook: none (subagents run `npx vue-tsc -b` themselves)
plan variant: brief
research: done — research.md (sonnet, 104k tok / 10 calls / 61s)
baseline: `npm test` 0 failing (377 passed); `npm run build` green
frozen hash: b5d5217bdb11a3723582cd090735fc59d1c007b21c2b06d4193ba94f6dbec07b
db backup: none — no §13 in auto-loop.md (the app has no database; data lives in browser localStorage)
owner-run: none
open config proposals: 9 — from feat-mvp-plans-workout-loop: §2 add `npm test` / `npx vitest run <path>` (the run uses the CLAUDE.md commands); §3 Vitest fake-timer and mutant-copy Vitest forms, curl-timeout note; §3 host flake (PlanEditor/NumberStepper once in a mutant copy); §4 never-weaken as patterns + Vitest skips (the run applies them in the shared rules); §5 instrumentation forms (still open since feat-cardio-module); §5 ARIA names; §8 name hotspot files; §9 storage keys and timing rules; §10 four test-adequacy traps
pre-run dirty paths: context/foundation/auto-loop.md, context/foundation/design-critique-2026-10-18.md, context/foundation/roadmap.md — not this run's; never staged

## Ledger

- [x] Phase 1 — Move exercises up and down
- [x] Phase 2 — Collapse and open an exercise card
- [x] goal review
- [x] e2e walkthrough
- [x] retrospective
- [x] final report

## Routing (Step 1)

| Phase | Builder | Category | Reason |
|---|---|---|---|
| 1 | sonnet | feature | production UI with logic in `src/**` (always-sonnet), tests, manual items — new reorder behaviour the user asked for |
| 2 | sonnet | feature | production UI with logic in `src/**` (always-sonnet), tests, manual items — new collapse behaviour the user asked for |

## Status

| Phase | Builder | Rounds | State | Category | Wall / subagent | Tokens |
|---|---|---|---|---|---|---|
| 1 — Move exercises up and down | sonnet | 1 | CONCERNS (2 minor) → `ec76af5` | feature | 11m / 2m + critic unknown | 121k + critic unknown |
| 2 — Collapse and open an exercise card | sonnet | 1 | CONCERNS (1 minor, 1 nit) → `9cd91f2` | feature | 12m / 3m + critic unknown | 126k + critic unknown |

## Run totals

phases measured: 2 of 2 executed (critic usage unknown — the Skill call returns none)   ·   tokens are subagents only, 10x-critic workers excluded

| Category | Phases | Tokens | % tokens | Wall | % wall | Subagent time |
|---|---|---|---|---|---|---|
| feature | 2 | 247k + critics unknown | 100% | 23m | 100% | 5m + critics unknown |
| stabilization | 0 | 0 | 0% | 0m | 0% | 0m |
| refactor | 0 | 0 | 0% | 0m | 0% | 0m |
| goal review (brief §7) | — | 146k | — | 6m (in wall below) | — | 6m |
| **total** | 2 | 393k + 10x-critic coordinators unknown | 100% | 23m slices + 6m goal review | 100% | 11m + critics unknown |

Closed findings: none (no Blocker or Major in any round)
Open (Minor/Nit, never fixed by design): `focus-test-first-down-not-exercising-restore` — p1; `disabled-click-test-relies-on-test-utils` — p1; `toggle-chevron-next-to-move-down` — p2 (owner's design call); `design-rule-placement` — p2 (nit)
Manual steps left to the user: walkthrough step 11 — one-thumb use on a real phone (no agent can hold a phone)

---

## Phase 1 — Move exercises up and down

phase:     feature  ·  start 2026-10-24T11:27:51+0200  ·  end 2026-10-24T11:38:24+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 11m  ·  subagent time 2m + critic unknown  ·  tokens 121k + critic unknown (subagents only, 10x-critic workers excluded)  ·  rounds 1

### round 1          builder sonnet → critic 10x-critic
  cost:      builder 121k tok / 23 calls / 2m26s  ·  critic unknown (Skill call returned no usage)
  workers:   criteria script 9s · walker sonnet 11:31:35→11:33:27 · prover-1 sonnet 11:35:15→11:35:59
  spot-checks: walker 1.6 screenshots → confirmed · prover-1 E1 focus-restore removed, 3 tests red → confirmed
  automated: 5/5   manual: 1/1 (0 unreachable)
  verdict:   CONCERNS (2 minor)
  blockers:  none
  majors:    none
  minors:    `focus-test-first-down-not-exercising-restore` — the "first exercise, down" focus test stays green without focus(); the middle and edge tests pin it · `disabled-click-test-relies-on-test-utils` — the disabled-edge click test passes because Test Utils skips clicks on disabled buttons
  report:    reviews/phase-1-round-1.md
  spot-check: opened reviews/screenshots/p1-r1-1.6-after-move.png → confirmed („Martwy ciąg” at position 2, SVG chevrons, 412 px)
  integrity: plan-freeze clean; never-weaken pattern scan over src diff: no hit; test files only additions
  diff:      4 files changed, +346/-2 (DESIGN.md +2, EditDelete.test.ts +89, PlanEditor.test.ts +180, PlanEditor.vue +77/-2)
  clauses:   17/18 mapped to a test (1 unmapped: 44 px / disabled look / no horizontal scroll — browser-only, covered by 1.6)
  scripted:  PlanEditor.vue, PlanEditor.test.ts, EditDelete.test.ts, DESIGN.md (Python string replace) — linted by `npm run build` (vue-tsc) at 2f; no linter exists
  COMMANDS_RUN: matches brief.md for 1.1–1.5
  inconclusive: none
  builder:   card header with h2 + two 44 px SVG-chevron move buttons; moveExercise swaps, clears errors, restores focus by element id; DESIGN.md rules (Buttons, Edytor planu)

## Phase 2 — Collapse and open an exercise card

phase:     feature  ·  start 2026-10-24T11:38:33+0200  ·  end 2026-10-24T11:50:17+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 12m  ·  subagent time 3m + critic unknown  ·  tokens 126k + critic unknown (subagents only, 10x-critic workers excluded)  ·  rounds 1

### round 1          builder sonnet → critic 10x-critic
  cost:      builder 126k tok / 16 calls / 2m48s  ·  critic unknown (Skill call returned no usage)
  workers:   criteria script 10s · walker sonnet 11:42:31→11:45:24 · prover-1 sonnet 11:47:29→11:48:20
  spot-checks: walker 2.6/2.7 screenshots → confirmed · prover-1 E1 state-keyed-by-position mutant → same 1 failure → confirmed
  automated: 5/5   manual: 2/2 (0 unreachable)
  verdict:   CONCERNS (1 minor, 1 nit)
  blockers:  none
  majors:    none
  minors:    `toggle-chevron-next-to-move-down` — the toggle's down chevron sits next to the „w dół” move chevron; the two actions look alike (owner's design call, low confidence) · `design-rule-placement` (nit) — the DESIGN.md rule is its own bullet above „Edytor planu”
  report:    reviews/phase-2-round-1.md
  spot-check: opened reviews/screenshots/p2-r1-2.6-reopened.png → confirmed (all cards collapsed, moved order, summary „3 × 10, przerwa 1:30”)
  integrity: plan-freeze clean; never-weaken scan: one false hit (`overflow-wrap: anywhere`); no `expect(` line removed from tests
  diff:      4 code files, +497/-73 (critic count); builder DIFF_STAT 5 files +508/-84 incl. brief.md checkbox rows
  clauses:   19/21 mapped to a test (2 unmapped: no-animation (absence of CSS, read in diff), 44 px / focus look — browser, covered by 2.7)
  scripted:  PlanEditor.vue, PlanEditor.test.ts, EditDelete.test.ts, DESIGN.md, brief.md (python) — linted by `npm run build` (vue-tsc) at 2f; no linter exists
  COMMANDS_RUN: matches brief.md for 2.1–2.5
  inconclusive: none
  builder:   h2 toggle (aria-expanded/controls, SVG chevron), Set of collapsed ids, collapsed name + summary, defaults, failed save opens error cards; existing edit tests open the card first

## Goal review — brief §7

### round 1          critic opus + ultrathink (general-purpose)
  cost:      critic 146k tok / 33 calls / 6m13s
  done when: D1–D8 met (D7 walked at 412×915: moved 5→1, reload, Start opens „Ćwiczenie łydek”, „Dalej: Wiosłowanie”)
  verdict:   CONCERNS
  blockers:  none
  majors:    none
  minors:    `toggle-chevron-beside-move-chevrons` (medium confidence; same point as p2 `toggle-chevron-next-to-move-down`) · `failed-save-error-offscreen` (low, older than this change)
  nits:      `collapsed-card-hides-error-without-mark` · `move-design-rule-written-twice` · `six-plan-fixture-has-four-exercises` · `move-position-not-announced`
  cross-slice: none (focus restore with collapsed cards, failed save after a move, tab order toggle → up → down → body, stored JSON keys unchanged — all checked)
  report:    reviews/goal-review.md
  spot-check: opened reviews/screenshots/goal-workout-first.png → confirmed
  port 4199: free after the walk
