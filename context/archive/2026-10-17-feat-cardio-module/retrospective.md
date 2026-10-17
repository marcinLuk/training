---
change_id: feat-cardio-module
run_date: 2026-10-17
outcome: completed
phases: 5
rounds_total: 8
---

# Loop retrospective: feat-cardio-module

## Verdict — was the per-phase loop worth it here?

On Phase 3 it was clearly worth it. Round 1 passed every automated criterion and all 8 browser steps, yet the critic found two Majors that a reading review would probably have missed: a wake-lock sentinel leak that also regressed the strength runner, and a malformed `trening.cardio.v1` that froze the whole app at "Wczytywanie…". Both were proven with instrumentation (a counting wake-lock fake, a corrupt-storage reload). Phase 4's two extra rounds only added tests; they changed no app code, and three full browser walks ran on byte-identical production files (~40 min of critic time). The goal review found the one cross-slice gap, a stale `CLAUDE.md` (G-01), that no single-slice critic filed as more than Minor.

| | Phase loops | Critic's manual walk | User's interventions |
|---|---|---|---|
| Rounds / steps | 8 across 5 phases (+2 goal-review rounds) | 8 + 8 + 6 + 6 + 6 = 34 item walks | 1 valve trip (p4 r2) + 0 manual hand-offs |
| Blockers + Majors closed | 4 (2 in p3, 1 in p4, G-01) | — | — |
| Would a single end-of-run review have caught them? | some — G-01 yes, the p3 Majors only with the same browser instrumentation | — | — |

## What the critic kept catching

- `docs-cardio-missing` / `claude-md-says-no-tests` / `claude-md-state-contract-stale`: filed Minor in p1 r1, p2 r1, p3 r1 and p3 r2, then Major as `G-01` in the goal review. Every slice made CLAUDE.md a little more false, and no slice owned it.
  → **Proposal (no-plan-flow §5 slicing rule):** "When the change alters a contract `CLAUDE.md` describes (state shape, endpoints, tests, storage keys, file roles), the last slice updates `CLAUDE.md` and README." That makes it a planned slice, not a goal-review fix.
- `frontend-clauses-without-row` (p3 r1, p3 r2: Minor) vs `calendar-clauses-unpinned` (p4 r1: Major). Two critics graded the same class of gap differently, and the loop paid two rounds for the stricter one.
  → **Proposal (`lessons.md`):** "Frontend behaviour in `public/app.js` is pinned by `node:test` through the `node:vm` harness in `test/calendar-view.test.js`. A clause that only a manual row covers is a test still to be written."

## Where the plan was too blunt to judge against

- **Phase 3 and 4 manual rows**: they named the main paths, but not the secondary clauses in Slice details (save-retry, journal Usuń, counters, the date and name gates, Usuń on a cardio card). Critics walked them anyway, but no row or test pinned them. That is what p4 r1 turned into a Major.
  → **Proposal (brief slicing):** every Slice-details sentence that states a behaviour gets either an automated row naming a test file or a manual row. Cutting that rule is cheaper than two rounds.

## Automated criteria that passed while something was broken

- **Phase 3 r1**: 3.1–3.3 (syntax, 72 tests, smoke) were green while the critic found `wakelock-double-request-leak` and `cardio-storage-shape-unchecked`.
  → **Proposal:** the stored-value check is now a pure `CardioCore.isValidStored` with tests (p3 r2). The wake-lock coordination still has no node test. Add one to the `node:vm` harness with a fake `navigator.wakeLock` that counts requests and releases across `render()`.
- **Phase 4 r1/r2**: 85 tests green while five wrong variants of `dayItems` and the builder gates survived (p4 r2 report). The case named "usunięty plan" used `planId: 'gone'`, a state `deletePlan` never produces. Closed in p4 r3.

## Where the loop misbehaved

- p4 r2: the **repeated-finding valve** tripped on `calendar-clauses-unpinned` although the finding had narrowed (4 clauses closed, 5 new sub-gaps). It cost one question to the user (6 min) and was not a stall.
  → **Cause:** the valve keys on the finding id. A critic that keeps the id while the content shrinks reads as no progress.
  → **Proposal (loop-protocol.md valves):** "A repeated finding id whose CLOSURES line shows part of it closed by execution is progress, not a stall. Trip the valve only when the still-open part is the same as last round."
- p4 r2 and r3: the critic re-walked all 6 manual items on production bytes identical to round 1, because the rule that lets a later round carry passed items covers only items with external side effects. The cost was ~25 min of critic time over two rounds.
  → **Proposal (SKILL.md 2b item 3):** extend carrying to any manual item when a round changed only test files and `cmp` proves the production files are byte-identical.
- Foreign writes during the run: `documentation/` (14:09) and `context/changes/google-store-app/` (between 15:07 and 16:02) appeared in the checkout from another session. `staging.sh` put `google-store-app` into the p4 staging set. I caught it by reading the list and ran `git reset -- context/changes/google-store-app` before the commit.
  → **Proposal:** see §11 below and "Friction in the skill itself".

## Model routing accuracy

| Phase | Model | Reason | Held? |
|---|---|---|---|
| 1 Cardio core logic | sonnet | pure logic + tests | yes — won round 1 |
| 2 Data model and API | sonnet | schema, data access, routes, tests | yes — won round 1 |
| 3 Tab, runner, journal | sonnet | frontend logic + manual rows | yes — lost round 1 on design defects (wake lock, storage shape), not on capacity; round 2 sonnet closed both |
| 4 Calendar | sonnet | frontend logic + manual rows | yes — rounds 2–3 were test-only |
| 5 Goal-review fixes | sonnet | `package.json` is always-sonnet (§8) | haiku would have done it: two docs and a one-line script |

## Owner-run phases

none this run (D3 audibility / phone vibration is an owner-run item in the walkthrough, not a phase)

## Manual verification — what the browser could and could not reach

- Performed by the critic with playwright-cli: 34 item walks. They covered timing (pause freeze, reload continuity, auto-end at 24 s), computed colours in both themes, escaping, the API bodies sent, and beep, vibrate and wake-lock calls (instrumented).
- Unreachable, left to the user: audible beep, real vibration, real wake lock, background-tab throttling, the import/export buttons, the Docker image (Node 24).
  → **Proposal:** none for a fixture. These need a device or a container build. Add a §5 note that "a manual item about sound/vibration is owner-run by default".

## Corrections to `auto-loop.md`

- **§2 Verification commands**: add `npm test` (= `node --disable-warning=ExperimentalWarning --test`, from p5) as the unit-suite form. Today `node --test` runs 90 tests, so the "0 tests" trap note is out of date.
- **§3 Runner traps**: add "`server.js` treats `PORT=0` as 3000 (`Number(process.env.PORT) || 3000`) — never use 0 for an ephemeral port" (found writing the p2 builder prompt), and "port 3997 is reserved for `test/cardio-api.test.js`".
- **§3 Mutants**: the scratch-copy form is **verified** (p2, p3, p4 critics used it with a canary). Change `ASSUMED` to `verified`.
- **§3 Host notes**: git prints `LF will be replaced by CRLF` on every diff (the user's `core.autocrlf`). It is harmless, but critics and builders quote it as noise.
- **§3 / §11 concurrency**: "Another Claude session may write into this checkout during a run (seen: `documentation/`, `context/changes/<other-change>/`). Always read `staging.sh`'s stage list and pass `--exclude` for foreign paths."
- **§5 Browser driver**: add the instrumentation forms that worked: wrap `AudioContext.prototype.createOscillator` and `navigator.vibrate`, and use a counting `navigator.wakeLock` fake installed before load (playwright-cli `addInitScript` via `run-code`). Re-instrument after every reload. A real `confirm()` dialog inside `run-code` breaks the session (p3 r2), so dismiss it with `dialog-accept`.
- **§8 Hotspots**: add `public/cardio-core.js` (`checkPlan` is the server's validator too), `keepAwake`/`syncOverlayState` in `public/app.js` (shared by both runners), and `dayItems` (strength and cardio classification).
- **§9 Project rules**: add "the cardio session lives in `trening.cardio.v1`, validated by `CardioCore.isValidStored` on load; only one of the strength and cardio sessions may be active".
- **§10 test-adequacy traps**: add "frontend behaviour has a `node:vm` harness (`test/calendar-view.test.js`); a clause pinned only by a manual row is unpinned", and "a 'deleted plan' fixture must use `planId: null` — what `deletePlan` really leaves — not an unknown id".
- **§11 Commit convention**: English subject/body was `ASSUMED`. The run used it, and nobody objected.
- **§6 Probes**: the git probe now passes. Keep it.

No earlier retrospective existed, so no proposals are still open from earlier runs.

## Friction in the skill itself

- `preflight.sh` prints `plan git: tracked` for a `brief.md` that was untracked at that point, and `variant: 10x-plan` for a brief. The latter is documented. The former is misleading.
  → **Proposal:** have `preflight.sh` check `git ls-files --error-unmatch` and print `untracked`.
- The frozen hash covers only the part above `## Progress`, while brief mode also freezes the "Slice details" of started slices. I enforced that with an md5 of the section per round.
  → **Proposal:** `integrity.sh --frozen-section "## Slice details/### Phase N"`, or a second hash for started slices.
- `staging.sh` has no way to tell a foreign concurrent write from this run's own files, because both are "dirty since step 0".
  → **Proposal:** print a warning for any staged path under `<context-root>/changes/` that is not `<change-dir>`.
- Brief mode with ≥ 2 slices puts the goal review before the walkthrough, but the workbench template has no section for it. I added `## Goal review` by hand.

## What worked and should stay

- The shared-rules and critic-rules files in the scratch dir. Every prompt stayed short, and every agent obeyed the port 3000 / `./data` ban.
- Telling critics to instrument the page (audio, vibrate, wake lock). It found the only regression the strength runner got.
- The brief-mode goal review. It was the only reviewer that saw `CLAUDE.md` as a whole-change problem.

## Brief quality

- Missing fact that surfaced later: the brief did not say the change must keep `CLAUDE.md`/README accurate. That became G-01 and Phase 5.
- Missing fact: no expectation that frontend clauses are unit-tested. That became p4 r1–r3.
- Out-of-scope line a builder tested: "changes to strength training". p3 needed shared plumbing (wake lock, overflow, mutual exclusion) and p2 narrowed `insertWorkout`'s schedule link. Both were inside the listed allowance, and the goal review called them necessary (G-05).
- Re-cuts: 0 before start. 1 slice appended after the goal review.
- Next brief should read: add a Done-when line "project docs (`CLAUDE.md`, README) describe the new contract — checked by the critic", and a Guardrail "behavioural frontend clauses are pinned by `node:test`".

---

## Run record

### Stages

| Stage | Model | Tokens | Tool calls | Duration | Commit | Result |
|---|---|---|---|---|---|---|
| Research | sonnet | 107k | 11 | 1m | — | research.md |
| Phase 1 r1 builder | sonnet | 98k | 9 | 2m | — | done |
| Phase 1 r1 critic | opus | 135k | 18 | 4m | — | CONCERNS |
| Phase 1 close | — | — | — | — | `d7dbb2b` | committed |
| Phase 2 r1 builder | sonnet | 118k | 12 | 3m | — | done |
| Phase 2 r1 critic | opus | 191k | 37 | 9m | — | CONCERNS |
| Phase 2 close | — | — | — | — | `525b781` | committed |
| Phase 3 r1 builder | sonnet | 155k | 33 | 7m | — | done |
| Phase 3 r1 critic | opus | 258k | 82 | 19m | — | FAIL (2 Major) |
| Phase 3 r2 builder | sonnet | 96k | 22 | 2m | — | done |
| Phase 3 r2 critic | opus | 230k | 64 | 18m | — | CONCERNS |
| Phase 3 close | — | — | — | — | `2867e53` | committed |
| Phase 4 r1 builder | sonnet | 129k | 19 | 3m | — | done |
| Phase 4 r1 critic | opus | 216k | 62 | 13m | — | FAIL (1 Major) |
| Phase 4 r2 builder | sonnet | 88k | 9 | 1m | — | done |
| Phase 4 r2 critic | opus | 221k | 55 | 14m | — | FAIL (repeated Major → valve) |
| Phase 4 r3 builder | sonnet | 84k | 9 | 1m | — | done |
| Phase 4 r3 critic | opus | 243k | 60 | 12m | — | CONCERNS |
| Phase 4 close | — | — | — | — | `d8f9a79` | committed |
| Goal review r1 | opus | 215k | 46 | 11m | — | D1–D10 met, 1 Major (G-01) |
| Phase 5 r1 builder | sonnet | 110k | 13 | 1m | — | done |
| Phase 5 r1 critic | opus | 144k | 26 | 3m | — | CONCERNS |
| Phase 5 close | — | — | — | — | `ea893b2` | committed |
| Goal review r2 | opus | 179k | 23 | 3m | — | clean |

### Commits

| SHA | Subject | Authored by |
|---|---|---|
| `d7dbb2b` | feat(feat-cardio-module): Cardio core logic (p1, 1 rounds) | Step 2f, phase 1 |
| `525b781` | feat(feat-cardio-module): Cardio data model and API (p2, 1 rounds) | Step 2f, phase 2 |
| `2867e53` | feat(feat-cardio-module): Cardio tab, runner and journal (p3, 2 rounds) | Step 2f, phase 3 |
| `d8f9a79` | feat(feat-cardio-module): Cardio in the calendar (p4, 3 rounds) | Step 2f, phase 4 |
| `ea893b2` | docs(feat-cardio-module): Goal-review fixes (p5, 1 rounds) | Step 2f, phase 5 |
| epilogue | chore(feat-cardio-module): close out loop run (epilogue) | Step 5 |

Left uncommitted: `.dockerignore`, `.env.example`, `.gitignore` (untracked before this run), `documentation/` and `context/changes/google-store-app/` (another session's files).

### Residual risk

1. Every commit this run made is **unreviewed by a human**. Committed is not approved.
2. The `e2e-walkthrough.md` path is **unrun**. Nothing in this run verified it end to end, and nothing ran it on the owner's real database.
3. UNVERIFIED criteria: none. Every `## Progress` row is ticked with a SHA.
4. Owner-run items: D3 audible beep and real vibration, the wake lock on a device, and background throttling. All of them are in the walkthrough.
5. UNRESOLVED phases: none.
6. Minor/Nit findings never fixed by design. Those arguably not minor:
   - `silent-after-reload`: after a reload the interval beeps are silent until the first tap.
   - G-03: an interval workout ended early is logged with the planned cycle count.
   - `duplicate-client-id-500`: a repeated client id on the cardio API returns 500 instead of 409.
7. No lint hook exists. Static checking is `node --check` only, which the builders and the orchestrator ran on every JS file touched. Every file built by script (python/sed/heredoc) relied on that.
8. Assumptions resolved without the user:
   - cardio workouts live in their own `cardio_workouts` table;
   - the limits are 5–3600 s per interval, 1–50 intervals and a total of at most 6 h;
   - a total shorter than one cycle names only the valid time above it;
   - Zakończ at 0 s abandons the workout without saving;
   - a strength or cardio workout's `scheduleId` is dropped when it points to an entry of the other kind;
   - the select option values are `plan:`/`cardio:`.

### Cost

- Rounds: 8 phase rounds + 2 goal-review rounds · subagents spawned: 21 (research 1, builders 9, critics 9, goal reviewers 2). Time, tokens and the category split are in `workbench.md` → `## Run totals`.
- Most expensive phase: Phase 4 (981k tok, 49m wall). It was not the most valuable: two of its three rounds added tests over unchanged app code. Phase 3 (739k tok, 51m) was the most valuable, with both real defects found there.
- Category split vs intent: a feature brief spent 90% of its tokens on feature slices and 10% on the one stabilization slice (docs). That matches the intent.
