---
change_id: release
run_date: 2026-10-24
outcome: completed
phases: 5
rounds_total: 5 (+1 goal review)
---

# Loop retrospective: release

## Verdict — was the per-phase loop worth it here?

Every slice won round 1, so the loop never had to close a Blocker or a Major. The critics still earned their cost: three of them proved claims that no builder could prove alone. The slice 2 critic walked offline mode in a real browser. The slice 3 prover built mutant images. The slice 5 prover ran the guide's `authorized_keys` and `sudoers` lines on an `ubuntu:24.04` sshd. A single end-of-run review would have produced the same tree. But without the slice 5 simulation, the owner would test the forced-command setup for the first time on the real server.

| | Phase loops | Critic's manual walk | User's interventions |
|---|---|---|---|
| Rounds / steps | 5 rounds across 5 slices + 1 goal review | 3 items performed (1.5, 2.5, 5.6) | 0 valve trips, 0 manual hand-offs |
| Blockers + Majors closed | 0 | — | — |
| Would a single end-of-run review have caught them? | nothing to catch | yes | — |

## What the critic kept catching

- A clause pinned only on the happy path: `vacuous-no-registration-assertion` (p2 r1), `env-write-atomicity-unpinned` (p4 r1), `smoke-first-header-only` (p3 r1). In all three, the builder's mutant list missed a mutant that the critic built in minutes.
  → **Proposal:** a `lessons.md` entry: "For every check you write, name one mutant that keeps the happy path green but breaks the clause (a direct write instead of temp + mv, a duplicate header, a removed guard) and prove the check goes red."
- The guide drifted from the files in small ways: `asset-check-path-doubled`, `cert-issue-timing-contradiction`, `server-files-resync-missing` (p5 r1). The 5.1/5.2 greps prove names, not commands.
  → **Proposal:** for any future guide slice, add a criterion that runs each fenced command against a local stand-in (a container), as the p5 prover did by hand.

## Where the plan was too blunt to judge against

- **Phase 5, criteria 5.1–5.3** — the guide passed all three while the asset-check command was wrong (`asset-check-path-doubled`). Only the 5.6 reading check found it.
  → **Proposal:** a sharper criterion: "each `curl` command in section 7 of the guide, run against the local smoke container with the host replaced, returns the status the guide states."
- **Phase 4, criterion 4.3** — the YAML parse checks the job graph only. It cannot see a secret in `run:` text or a wrong action.
  → **Proposal:** install `actionlint` (or run its official image) and add it as a criterion for any workflow slice.

## Automated criteria that passed while something was broken

- **Phase 4** — `bash deploy/server/deploy.test.sh` was green (22/22). The critic's mutant E5 wrote `.env` directly and still passed 22/22 (`env-write-atomicity-unpinned`).
  → **Proposal:** a test case where the stub `docker` checks that no partial `.env` exists while `up` runs, or a failing `mv` stub.
- **Phase 2** — `npx vitest run src/pwa` was green. With the null guard removed, only Vitest's unhandled-error report turned red, not the assertion (`vacuous-no-registration-assertion`).

## Where the loop misbehaved

- **Phase 5, builder** — the builder wrote `docs/deploy.md` with a bash heredoc. The guide holds its own `EOF` line, so the heredoc ended early, and the rest of the guide ran as shell on the owner's machine until the builder killed it. Afterwards: no push, no GitHub secret, variable or run, and no stray file outside `~/.ssh`. Not verifiable by agents: `~/.ssh/trening_deploy` and one possible `curl` to the domain.
  → **Cause:** prompt gap in this skill. The shared rules allowed any way to write a file.
  → **Proposal:** add to the shared rules block in `subagent-prompts.md`: "Write files with the Write or Edit tool, never with a shell heredoc or echo." This run added the line after the incident (for the critics and the goal review).
- No stall, oscillation or valve trip.

## Model routing accuracy

| Phase | Model | Reason | Held? |
|---|---|---|---|
| 1 Manifest, icons, SW build | sonnet | always-sonnet paths + a verification script | yes |
| 2 SW registration, safe update | sonnet | production code with tests | yes |
| 3 Docker image | sonnet | Docker criteria with red results to reason about | yes |
| 4 Server files, CI | sonnet | security-sensitive shell + test script | yes |
| 5 Deploy guide | sonnet | docs derived from many files and external docs | yes — but it is the slice that caused the incident; haiku would not have been safer |

No slice would have suited haiku.

## Owner-run phases

None as a slice. The real deploy (DNS, server, GitHub settings, first push, the phone) was out of scope for agents by the owner's rule. It is the owner-run block of `e2e-walkthrough.md`. The bar was right: no agent could have run any of it without the server.

## Manual verification — what the browser could and could not reach

- Performed by the critic: 3. These were the icons (image read and pixel sampling), offline mode (playwright-cli with the context offline on `vite preview`) and the guide (a reading check plus a container simulation).
- Unreachable, handed to the user: PWA install, `chrome://webapks`, the sound, Wake Lock, the screen lock, and everything on the real server.
  → **Proposal:** none from a fixture. These need the phone and the server.

## Corrections to `auto-loop.md`

- **§2 Verification commands** — still says "no test runner". This run used `npm test` (415 → 439 tests) from `CLAUDE.md`. (still open since feat-mvp-plans-workout-loop)
  → **Proposal:** add `npm test`, `npx vitest run <path>`, `node scripts/verify-dist.mjs dist`, `bash scripts/smoke-image.sh`, `bash deploy/server/deploy.test.sh`; baseline 439, 0 failing.
- **§1 / §9** — `auto-loop.md` is modified in the tree but never committed; `HEAD` holds the deleted prototype's version. Every loop run reads an uncommitted config.
  → **Proposal:** commit the working copy after applying these proposals.
- **§3 Runner traps** — new traps: Docker ports 4197 (smoke) and 4196 (mutant image). A stopped container `trening` (image `trening-trening`) belongs to the owner. A container left on the port makes a smoke run pass for nothing. `core.autocrlf=true` writes CRLF back into shell scripts unless `.gitattributes` forces LF (re-cut of slice 3).
- **§5 Browser driver** — the offline check works with playwright-cli on `vite preview` (p2 r1 critic). Record the exact form from `reviews/phase-2-round-1.md`.
- **§8 always-sonnet paths** — add `Dockerfile`, `deploy/**`, `.github/workflows/**`, `scripts/**`, `docs/deploy.md`.
- **§9 last bullet** — "Deployment is planned but not set up: no PWA manifest, service worker, Dockerfile or CI exists yet" is now false.
  → **Proposal:** "Deployment: see `docs/deploy.md`. Never contact the server from an agent. The repo is public: no secrets, IPs, e-mails or user names."
- **§12** — `vite-plugin-pwa` 2.0.0 is now a dev dependency.
- **§13** — absent. (still open since quality-of-life)
  → **Proposal:** `database: none — plans live in browser localStorage`.
- Still open from earlier runs: §4 the `: any` scan matches CSS `anywhere` (still open since quality-of-life); §5 editor accessible names (still open since quality-of-life); §3 Vitest fake-timer and mutant-copy forms, §8 hotspot file names, §9 storage keys, §10 test-adequacy traps (still open since feat-mvp-plans-workout-loop). Not hit this run.

## Friction in the skill itself

- `preflight.sh` printed `plan git: tracked` for an untracked `brief.md` (fourth run in a row). → **Proposal:** use `git ls-files --error-unmatch`.
- The `/10x-critic` Skill call returned no token usage (5 of 5 rounds), so every slice's tokens are `+` (critic unknown). → **Proposal:** have `10x-critic` print its usage in the contract.
- Brief mode §3 still asks for a new `<type>-<slug>` change-id. This run reused `release`, made with `/10x-new` (second run in a row). → **Proposal:** accept an existing change folder that has no `plan.md` or `brief.md`.
- The loop never fixes Minors, but in a docs slice a Minor in a command (`asset-check-path-doubled`) is the owner's next mistake. → **Proposal:** for a slice whose deliverable is a runbook, treat a wrong command as Major.

## Brief quality

- Missing fact that surfaced later: the CRLF setting (`core.autocrlf=true`) and the `sudo` environment rule for `deploy.sh`. Both were added to slices that had not started (re-cuts of slices 3 and 5).
- Out-of-scope lines tested: the no-server rule was broken once by accident (the p5 heredoc), not by design.
- Re-cuts: 2 (slice 3 `.gitattributes`; slice 5 sudo `env_reset` and the `auth/users` name).
- The next brief should say how files are written (Write tool only) and list the local stand-ins for every external system (a container for sshd, the smoke container for curl).

---

## Run record

### Stages

| Stage | Model | Tokens | Tool calls | Duration | Commit | Result |
|---|---|---|---|---|---|---|
| Phase 1 builder | sonnet | 108k | 17 | 2m20s | — | done |
| Phase 1 critic | 10x-critic | unknown | unknown | unknown | `bd9cd5d` | CONCERNS |
| Phase 2 builder | sonnet | 109k | 17 | 2m37s | — | done |
| Phase 2 critic | 10x-critic | unknown | unknown | unknown | `6c5b55d` | CONCERNS |
| Phase 3 builder | sonnet | 106k | 15 | 5m11s | — | done |
| Phase 3 critic | 10x-critic | unknown | unknown | unknown | `b46ed30` | CONCERNS |
| Phase 4 builder | sonnet | 112k | 17 | 2m58s | — | done |
| Phase 4 critic | 10x-critic | unknown | unknown | unknown | `48f4160` | CONCERNS |
| Phase 5 builder | sonnet | 193k | 30 | 8m28s | — | done (heredoc incident) |
| Phase 5 critic | 10x-critic | unknown | unknown | unknown | `fdc7d93` | CONCERNS |
| Goal review | opus | 188k | 40 | 6m48s | — | CONCERNS, D1–D8 met |

### Residual risk

1. All commits are unreviewed by a human. Committed is not approved.
2. `e2e-walkthrough.md` has not been walked. The real deploy, the GitHub workflow and the phone checks were never run.
3. UNVERIFIED criteria: none in the brief. The whole owner-run block is unverified by design.
4. The p5 heredoc incident: `~/.ssh/trening_deploy` and a possible `curl` to the domain are unchecked.
5. Minor/Nit never fixed: 21 findings, listed in `e2e-walkthrough.md` "Watch out for".
6. Assumptions taken without you: the run reused the `release` folder; the guide sets `DEPLOY_ENABLED` only after the first push and after the package is public; the Traefik folder is `/opt/traefik`; `authorized_keys` is root-owned.

### Cost

- Totals: `workbench.md` → `## Run totals` (subagents only; critic usage unknown).
- Most expensive stage: the phase 5 builder (193k, 8m). It was also the most valuable, because the guide is the owner's deliverable. The goal review (188k) found nothing new above Minor.
- Category split vs intent: 100 % feature, as intended.
