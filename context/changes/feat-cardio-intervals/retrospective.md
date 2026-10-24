---
change_id: feat-cardio-intervals
run_date: 2026-10-24
outcome: completed
phases: 7
rounds_total: 13
---

# Loop retrospective: feat-cardio-intervals

Brief mode (no plan.md), default flow, two sessions: phases 1–3 and the phase-4 builder ran in the first session; the phase-4 critic onward ran in a resumed session.

## Verdict — was the per-phase loop worth it here?

Yes. Six of seven slices lost round 1, and each lost round closed a real defect that every automated criterion had passed: two touch bugs that make lock mode a trap on a phone (p6 r1), a wake-lock release that turned off the screen lock of a strength workout (p3 r1), and a design-role mismatch (p5 r1). The goal review then found a cross-slice gap no slice critic could see (`cross-kind-tap-guard-gap`). A single end-of-run review would likely have caught the design mismatch and maybe the wake lock. It would not have driven touch through CDP for one slice, and it would not have turned seven test-adequacy gaps into pinned tests.

| | Slice loops | Critic's manual walk | User's interventions |
|---|---|---|---|
| Rounds / steps | 13 builder rounds over 7 slices, plus 2 goal reviews | 4 items (4.4, 5.4, 5.5, 6.4), each walked in 2 rounds | 0 valve trips, 0 manual hand-offs |
| Blockers + Majors closed | 14 (1 Blocker, 13 Majors) | — | — |
| Would a single end-of-run review have caught them? | some (design role, wake lock); not the 9 unpinned clauses or the touch bugs | the touch bugs only with an explicit touch run | — |

## What the critic kept catching

- `*-unpinned` (test adequacy) — p1 r1 (3 findings), p3 r1 (`restored-expiry-timer-unpinned`), p4 r1 (2), p5 r1 (`cross-kind-expiry-dismiss-unpinned`). Every time, the builder wrote a test whose name claimed a case its inputs never reached ("block or interval removed" removed only an interval; "opposite of the last one" only added after rest). Each was found by a mutant that left the suite green.
  → **Proposal:** a `lessons.md` entry: "When a test name lists two cases (A or B, after X), write one test per case, and make each case's input differ from the default path. A mutant that removes one case must turn a test red."
- Two controllers, one rule — p3 r1 (`cardio-releases-shared-wake-lock`), goal review 1 (`cross-kind-tap-guard-gap`), goal review 1 (`wake-lock-order-coupling`). Strength and cardio each keep their own guard, wake lock and expiry, and every shared rule leaked across the seam.
  → **Proposal:** an ADR or `CLAUDE.md` rule for the next workout kind: "A rule that applies to 'a running workout' (tap guard, wake lock, update block, one workout at a time) lives in one shared module, not in each controller." `duplicated-session-controller` is the debt that makes this proposal concrete.

## Where the brief was too blunt to judge against

- **Phase 6, row 6.4** — "a 2 s hold unlocks" was met with a mouse in round 1 while a finger re-locked the screen on lift. The row did not say "with touch".
  → **Proposal:** a manual row for a touch control names the input: "with touch emulation (CDP `Input.dispatchTouchEvent`), hold 2 s on the left and the right half, then lift".
- **Phase 7, rows 7.1** — named two end paths; the critic found a third route (expiry by a tap) and goal review 2 found four more (expiry on return, timer expiry, end screen at load). The row listed routes instead of the rule.
  → **Proposal:** state the invariant ("every route from an open workout to the plan list"), and let the critic enumerate routes.

## Automated criteria that passed while something was broken

- **Phase 3** — `npx vitest run src/workout` green; `cardio-releases-shared-wake-lock` — cardio released the strength lock on setup and on every `visibilitychange`.
  → **Proposal:** a test that holds a strength workout and mounts cardio, then fires `visibilitychange`, asserting the lock stays.
- **Phase 5** — `npx vitest run src/components` green; `meta-row-type-role` — the Meta rows used the body font.
  → **Proposal:** for each DESIGN.md type role a new component uses, a style assertion (the project pattern is a `?raw` SFC-source check plus the browser computed style).
- **Phase 6** — 280 component tests green; `unlock-lift-hits-revealed-buttons` (Blocker), `touch-leave-does-not-reset`. jsdom routes a synthetic `pointerleave` that a touch hold never sends.
  → **Proposal:** a CDP touch run in 6.4-style manual rows (see auto-loop §5 below); jsdom tests stay as pins, not proof.
- **Phase 6 → 7** — `npm test` green; `cross-kind-tap-guard-gap`.
  → **Proposal:** the App-level tests in `CrossKindStartGuard.test.ts` are the pattern; add one per new route when a workout kind is added.

## Where the loop misbehaved

- p1, p3, p4, p5, p6 r2, p7 r1 — builders edited project files with `sed -i`, python or a heredoc six times, although the shared rules (from this session on) said Write/Edit only. Integrity and `vue-tsc` stayed clean each time.
  → **Cause:** prompt gap — a rule in a shared file is read once and lost against habit.
  → **Proposal:** repeat the rule in the builder's "WHAT YOU MUST STILL DO" list (done from p6 r2 on; p7 r1 still broke it once), or add a PreToolUse hook that refuses `sed -i` / redirection into `src/`.
- Phase 4 — the first session ended after the builder returned and before the critic ran, with no `pause` stamp. The resume was clean (critic spawned, no rework), but the phase wall time is `unknown`.
  → **Cause:** session end outside the loop's control.
  → **Proposal:** stamp `pause` in `workbench.md` right after every builder return, not only at a planned stop.

## Model routing accuracy

| Phase | Model | Reason | Held? |
|---|---|---|---|
| 1 Cardio plan model and storage | sonnet | `src/**` always-sonnet; storage hotspot | yes — lost r1 on test adequacy, not on design |
| 2 Cardio session engine | sonnet | pure logic + tests | yes — won r1 |
| 3 Sounds, persistence, controller | sonnet | hotspots (`workoutStore`, wake lock) | yes — lost r1 on a cross-controller bug |
| 4 Tags, type choice, cardio editor | sonnet | UI with logic + tests | yes — lost r1 on test adequacy |
| 5 Session screen | sonnet | UI with logic + App wiring | yes — lost r1 on a design role and a gap |
| 6 Lock mode | sonnet | UI with timing logic | yes — lost r1 on touch behaviour |
| 7 Goal-review fixes | sonnet | App wiring + tests | yes — lost r1 on a missed route |

No slice was haiku-eligible: each wrote production code under `src/**`.

## Owner-run phases

- D9 (sound in a pocket, screen on, real phone lock) — tagged `owner-run` at slicing; the bar was right: the browser driver cannot hear a speaker or press a power button.

## Manual verification — what the browser could and could not reach

- Performed by the critic with playwright-cli: 4 items, each in 2 rounds — editor flow and sizes (`getBoundingClientRect`), the session screen with Playwright's fake clock, reload restore, sound calls counted through `createOscillator`, lock mode with mouse and with CDP touch.
- Unreachable, handed to the user: the real speaker and the real phone lock (D9).
  → **Proposal:** none — these need the phone.

## Corrections to `auto-loop.md`

- **§5 Browser driver** — no touch form is listed → p6 r1/r2 proved touch through `run-code` with a CDP session.
  → **Proposal:** add under "verified instrumentation forms": "**Touch:** in `run-code`, `const s = await page.context().newCDPSession(page)` then `s.send('Input.dispatchTouchEvent', { type: 'touchStart' | 'touchMove' | 'touchEnd', touchPoints: [{ x, y }] })`. A mouse walk does not exercise touch pointer capture. Before a touch run on a fresh build, unregister the service worker and clear its caches in your session, or the old bundle is served. — `feat-cardio-intervals` p6."
- **§3 Runner traps** — missing: "Vue Test Utils `trigger()` stamps the event time; after `vi.setSystemTime` moves the clock back, Vue drops the click. Dispatch a native `MouseEvent` in a clock-step-back test." (goal review 2) and "Vue skips a listener attached in the same millisecond as an event another listener already handled: advance the fake clock 1 ms between a re-render and the next dispatched event." (p6 r2 builder).
- **§10 test-adequacy traps** — add: "A synthetic `pointerleave` / `pointerup` in jsdom proves the handler, not touch routing: a touch hold captures the pointer and never sends `pointerleave`." (p6 r1) and "A rule for 'a running workout' must be tested across both kinds: strength → cardio and cardio → strength." (p3 r1, goal review 1).
- **§5** — the walker's playwright-cli session hung and was reopened 3 times in p5 r1 (14 minutes). → **Proposal:** add "if a `playwright-cli` command does not return in 60 s, close the session and open a new one with a new name; do not reuse it."
- **§2** — the `-t` name-filter form is still `ASSUMED — check this`; no slice used it.
- Open proposals from earlier runs: none (Step 0 found none open).

## Friction in the skill itself

- `/10x-critic` returns no token usage, so every critic `cost:` line is `unknown`, and the run totals carry a `+`. → **Proposal:** add the coordinator's usage (tokens, calls, duration) to the 10x-critic return contract.
- Brief mode §7 says "spawn one fresh critic"; the goal critic has no brief format like `/10x-critic`, so the orchestrator writes its prompt by hand each time. → **Proposal:** a short goal-critic prompt template in `subagent-prompts.md`.
- The brief's "Brief quality" section is required by `no-plan-flow.md` §8; see below.

## Brief quality

- The brief lacked "with touch" for lock mode; that fact surfaced as the p6 r1 Blocker.
- It lacked "one rule for both workout kinds"; that surfaced as p3 r1 and goal review 1. The re-cut of phase 5 (wake lock, from p3) and the appended phase 7 are the two places where the brief had to grow.
- No builder tested an Out-of-scope line. Re-cuts: 2 (phase 3 slice details from the p2 review; phase 5 slice details from the p3 review), plus 1 appended slice (phase 7).
  → **Proposal:** a cardio-style brief that adds a second kind of an existing thing names the shared rules in Guardrails: "every rule that holds for a strength workout also holds across strength ↔ cardio."

## What worked and should stay

- The goal review (§7) — it found the only cross-slice Major, and its second pass found four routes the slice tests missed.
- Critics building mutants in scratch copies — every Major was proved by a mutant that left the suite green, and every closure by the same mutant turning red.
- Re-cutting unstarted slice details from a review's Minors (p2 → p3, p3 → p5) — two engine facts and the wake-lock note reached the right builder before it started.

---

## Run record

### Stages

| Stage | Model | Tokens | Tool calls | Duration | Commit | Result |
|---|---|---|---|---|---|---|
| Research | sonnet | 136k | 20 | 2m48s | — | done |
| P1 r1 builder / critic | sonnet / 10x-critic | 135k / unknown | 39 / unknown | 3m49s / ~5m | — | FAIL (3 Majors) |
| P1 r2 builder / critic | sonnet / 10x-critic | 96k / unknown | 31 / unknown | 2m08s / unknown | `4ac1247` | CONCERNS |
| P2 r1 builder / critic | sonnet / 10x-critic | 120k / unknown | 46 / unknown | 4m45s / unknown | `40c4517` | CONCERNS |
| P3 r1 builder / critic | sonnet / 10x-critic | 192k / unknown | 76 / unknown | 10m09s / unknown | — | FAIL (2 Majors) |
| P3 r2 builder / critic | sonnet / 10x-critic | 89k / unknown | 15 / unknown | 1m31s / unknown | `442b607` | CONCERNS |
| P4 r1 builder / critic | sonnet / 10x-critic | 188k / unknown | 78 / unknown | 7m35s / unknown | — | FAIL (2 Majors) |
| P4 r2 builder / critic | sonnet / 10x-critic | 87k / unknown | 10 / unknown | 1m12s / unknown | `799275f` | CONCERNS |
| P5 r1 builder / critic | sonnet / 10x-critic | 155k / unknown | 50 / unknown | 5m17s / unknown | — | FAIL (2 Majors) |
| P5 r2 builder / critic | sonnet / 10x-critic | 85k / unknown | 14 / unknown | 1m54s / unknown | `3f0d32f` | CONCERNS |
| P6 r1 builder / critic | sonnet / 10x-critic | 125k / unknown | 26 / unknown | 2m47s / unknown | — | FAIL (1 Blocker, 1 Major) |
| P6 r2 builder / critic | sonnet / 10x-critic | 147k / unknown | 65 / unknown | 8m37s / unknown | `f554013` | CONCERNS |
| Goal review 1 | opus | 247k | 58 | 8m45s | — | 1 Major |
| P7 r1 builder / critic | sonnet / 10x-critic | 108k / unknown | 23 / unknown | 2m08s / unknown | — | FAIL (1 Major) |
| P7 r2 builder / critic | sonnet / 10x-critic | 85k / unknown | 20 / unknown | 1m44s / unknown | `1599551` | CONCERNS |
| Goal review 2 | opus | 123k | 30 | 5m20s | — | clean |

### Commits

| SHA | Subject | Authored by |
|---|---|---|
| `4ac1247` | feat(feat-cardio-intervals): cardio plan model and storage (p1, 2 rounds) | Step 2f, phase 1 |
| `40c4517` | feat(feat-cardio-intervals): cardio session engine (p2, 1 round) | Step 2f, phase 2 |
| `442b607` | feat(feat-cardio-intervals): cardio sounds, persistence and session controller (p3, 2 rounds) | Step 2f, phase 3 |
| `799275f` | feat(feat-cardio-intervals): plan list tags, plan type choice and cardio editor (p4, 2 rounds) | Step 2f, phase 4 |
| `3f0d32f` | feat(feat-cardio-intervals): cardio session screen (p5, 2 rounds) | Step 2f, phase 5 |
| `f554013` | feat(feat-cardio-intervals): lock mode (p6, 2 rounds) | Step 2f, phase 6 |
| `1599551` | fix(feat-cardio-intervals): goal-review fixes (p7, 2 rounds) | Step 2f, phase 7 |
| epilogue | chore(feat-cardio-intervals): close out loop run (epilogue) | Step 5 |

Left uncommitted: nothing from this run (`.impeccable/config.json` got one ignore value for a design-hook false positive; `.impeccable/` is gitignored).

### Residual risk

1. Every commit this run made is **unreviewed by a human** — committed is not approved.
2. The `e2e-walkthrough.md` path is **unrun**; nothing in this run verified it end to end.
3. No criterion was left UNVERIFIED by an unreachable dependency; every `## Progress` row is ticked.
4. D9 is owner-run (real phone: sound in a pocket, screen on, power-button lock). Touch was proved only in Chromium emulation.
5. No phase closed UNRESOLVED.
6. 23 Minor/Nit findings are open by design (list in `workbench.md`, "Open"). Arguably not minor: `end-screen-not-locked` (pocket touches after a locked session ends), `duplicated-session-controller` (the root of three Majors this run), `title-role-case` and `design-value-drift` (code and DESIGN.md disagree — CLAUDE.md asks you to decide).
7. No lint hook exists: type checking ran only because builders and the orchestrator ran `npx vue-tsc -b`. Files edited with scripts (all type-checked afterwards): `src/plans/plan.ts`, `src/App.vue`, `CardioPlansFlow.test.ts`, `CardioSession.test.ts`.
8. Assumptions taken without you: get-ready rows leave out „Interwał X z Y”; Razem rounds down and Zostało rounds up; the hold render timer is 50 ms; the unlock fires at 2 s while the finger is down and the rest of that press is swallowed (not "unlock on release"); the shared start guard lives in `App.vue`.

### Cost

- Rounds: 13 builder rounds + 13 critic rounds + 2 goal reviews + 1 research · subagents spawned: 29 (critic workers not counted) · time, tokens and category split: `workbench.md` → `## Run totals`.
- Most expensive slice: phase 3 by tokens (281k+) and by measured wall time (24m, tied with phase 4's unmeasured span). It was the most valuable too: it holds the persistence and resume rules, and its round 2 removed a defect that would have turned off the screen lock of a strength workout.
- Category split vs intent: 100 % `feature`, as a feature brief should be. The goal review (19 % of measured tokens) bought the only cross-slice fix.
