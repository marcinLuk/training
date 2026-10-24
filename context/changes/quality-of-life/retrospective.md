---
change_id: quality-of-life
run_date: 2026-10-24
outcome: completed
phases: 2
rounds_total: 2
---

# Loop retrospective: quality-of-life

## Verdict — was the per-phase loop worth it here?

Both slices won round 1 with only Minor/Nit findings, so no fix round ran. The loop's value here was verification, not correction: the critics proved the focus restore, the id-keyed collapse state and the stored-shape guarantee with mutants, and walked D7 in a real browser. A single end-of-run review would very likely have produced the same tree. For a small UI change of this size, the per-slice critic cost more than it found.

| | Phase loops | Critic's manual walk | User's interventions |
|---|---|---|---|
| Rounds / steps | 2 across 2 slices + 1 goal review | 3 items + the D7 goal walk | 0 valve trips · 0 manual hand-offs |
| Blockers + Majors closed | 0 | — | — |
| Would a single end-of-run review have caught them? | nothing to catch | yes | — |

## What the critic kept catching

- `toggle-chevron-next-to-move-down` / `toggle-chevron-beside-move-chevrons` — seen in p2 r1 and the goal review. The slice details asked for a chevron toggle in the header next to two chevron move buttons, so the brief itself produced three look-alike icons.
  → **Proposal:** when a brief adds a second control of the same shape next to an existing one, the brief names how the two differ visually (owner decision before the run).

## Where the plan was too blunt to judge against

- **D3 "the plan list follows the new order"** (p1 r1 builder note) — the plan card shows only counts, so the list cannot show order. The tests checked storage and a fresh mount instead.
  → **Proposal:** write Done-when items only about things the screen actually shows; here "the saved plan and a started workout follow the new order".

## Automated criteria that passed while something was broken

none this run.

## Where the loop misbehaved

- **p2, staging** — `staging.sh --stage` staged `ops/vps/setup-claude-user.sh`, a file another session created during the run (not in the step-0 baseline). The orchestrator caught it in the staged list and unstaged it before the commit.
  → **Cause:** the baseline is a step-0 snapshot; new foreign files appear as "dirty since step 0".
  → **Proposal:** `staging.sh` prints new untracked paths outside the plan's named files under a separate "new and unnamed — confirm" heading instead of staging them.
- **p1, p2 — screenshots dropped into the tree during the run** (`documentation/…png`, a PNG in the change folder). Excluded with `--exclude`; not this run's.

## Model routing accuracy

| Phase | Model | Reason | Held? |
|---|---|---|---|
| 1 Move exercises up and down | sonnet | production UI in `src/**`, tests, manual item | yes — round 1 |
| 2 Collapse and open an exercise card | sonnet | production UI in `src/**`, tests, manual items | yes — round 1 |

## Owner-run phases

none this run. One-thumb use on a real phone stays with the owner (walkthrough step 11).

## Manual verification — what the browser could and could not reach

- Performed by the critic with playwright-cli: 3 items (1.6, 2.6, 2.7) plus the goal review's D7 walk — sizes, focus outline, reload, workout start all worked.
- Unreachable, handed to the user: 0.

## Corrections to `auto-loop.md`

- **§2 Verification commands** — still says "no test runner"; this run used `npm test` and `npx vitest run <path>` from `CLAUDE.md`. **Proposal:** add both, baseline "0 failing" (now 415 tests). (still open since feat-mvp-plans-workout-loop)
- **§4 never-weaken** — a pattern scan for `: any` matches CSS `overflow-wrap: anywhere` (p2). **Proposal:** scan only `.ts`/`.vue` script blocks, or match `: any\b` followed by a non-letter.
- **§5 assertion rule** — record the editor names: „Przesuń ćwiczenie N w górę/w dół”, the toggle button „Ćwiczenie N” with `aria-expanded`, body id `exercise-body-<id>`.
- **§13** — absent. **Proposal:** add `database: none — plans live in browser localStorage` so the run states it instead of inferring it.
- Still open from feat-mvp-plans-workout-loop (not hit this run): §3 Vitest fake-timer and mutant-copy forms; §3 host flake note; §5 instrumentation forms (still open since feat-cardio-module); §8 hotspot file names; §9 storage keys and timing rules; §10 four test-adequacy traps.

## Friction in the skill itself

- `preflight.sh` printed `plan git: tracked` for an untracked `brief.md` (third run in a row) → **Proposal:** check with `git ls-files --error-unmatch`.
- The `/10x-critic` Skill call returned no token usage, so both slice critics are `unknown` in the totals → **Proposal:** have `10x-critic` print its own usage line in the contract.
- Brief mode §3 says to create a new `<type>-<slug>` change-id; the owner had just made `quality-of-life` with `/10x-new` for this task, so the run reused it → **Proposal:** §3 accepts an existing change folder that holds only `change.md`.

## What worked and should stay

- Research before slicing found the five edit tests that would break when edit opens collapsed; slice 2 fixed them in round 1 with no lost round.
- Telling the builder to prove the focus test against a removed `focus()` call (jsdom keeps focus on a moved node) — the builder found the one test that did not pin it, and the critic confirmed.

## Brief quality

- Missing fact that surfaced later: how the toggle chevron differs from the move chevrons (p2 r1, goal review).
- Out-of-scope lines tested: none crossed (no workout, list or storage change; `src/plans` has no diff).
- Re-cuts: 0. D7 wording was made concrete (position 5 → 1) before the hash was taken.
- Next brief should say: which on-screen element proves each Done-when item, and how a new icon differs from neighbouring icons.

---

## Run record

### Stages

| Stage | Model | Tokens | Tool calls | Duration | Commit | Result |
|---|---|---|---|---|---|---|
| Research | sonnet | 104k | 10 | 1m01s | — | done |
| Phase 1 round 1 builder | sonnet | 121k | 23 | 2m26s | — | done |
| Phase 1 round 1 critic | 10x-critic (opus + sonnet workers) | unknown | unknown | ~6m (workers 11:31→11:36) | — | CONCERNS |
| Phase 1 close | — | — | — | — | `ec76af5` | committed |
| Phase 2 round 1 builder | sonnet | 126k | 16 | 2m48s | — | done |
| Phase 2 round 1 critic | 10x-critic (opus + sonnet workers) | unknown | unknown | ~8m (workers 11:42→11:48) | — | CONCERNS |
| Phase 2 close | — | — | — | — | `9cd91f2` | committed |
| Goal review | opus | 146k | 33 | 6m13s | — | CONCERNS (0 Blocker, 0 Major) |

### Commits

| SHA | Subject | Authored by |
|---|---|---|
| `ec76af5` | feat(quality-of-life): move exercises up and down in the plan editor (p1, 1 round) | Step 2f, phase 1 |
| `9cd91f2` | feat(quality-of-life): collapse and open exercise cards in the plan editor (p2, 1 round) | Step 2f, phase 2 |
| epilogue | chore(quality-of-life): close out loop run (epilogue) | Step 5 |

Left uncommitted: not this run's — `context/foundation/auto-loop.md` (modified before the run), `context/foundation/design-critique-2026-10-18.md`, `context/foundation/roadmap.md`, `documentation/` screenshots, `ops/vps/setup-claude-user.sh`, and the owner's screenshot in this change folder.

### Residual risk

1. Both commits are unreviewed by a human — committed is not approved.
2. The `e2e-walkthrough.md` path is unrun by you.
3. UNVERIFIED criteria: none.
4. One-thumb use on a real phone (walkthrough step 11) was checked by nobody.
5. UNRESOLVED phases: none.
6. Minor/Nit never fixed: `toggle-chevron-next-to-move-down` (arguably not minor on a sweaty-thumb screen — owner's call), `failed-save-error-offscreen`, `collapsed-card-hides-error-without-mark`, `move-design-rule-written-twice`, `six-plan-fixture-has-four-exercises`, `move-position-not-announced`, `focus-test-first-down-not-exercising-restore`, `disabled-click-test-relies-on-test-utils`, `design-rule-placement`.
7. No lint hook: static analysis ran because builders ran `npx vue-tsc -b` / `npm run build`; files edited by scripts: `PlanEditor.vue`, `PlanEditor.test.ts`, `EditDelete.test.ts`, `DESIGN.md`.
8. Assumptions taken without you: the run reused the `quality-of-life` folder; the toggle is a borderless button inside the `<h2>` with a chevron (down when collapsed, turned when open); a failed save with only a plan-name error opens no card.

### Cost

- Rounds: 2 slice rounds + 1 goal review · subagents spawned: research, 2 builders, 2 `/10x-critic` runs, goal critic · time and tokens: `workbench.md` → `## Run totals`.
- Most expensive stage: the goal review (146k, 6m) — it was also the only stage that walked D7 end to end and checked cross-slice behaviour.
- Category split vs intent: 100 % feature, as the brief intended.
