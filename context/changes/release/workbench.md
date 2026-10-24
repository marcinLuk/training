# Loop workbench: release

Prepare the app for the test server   ·   plan: `brief.md`   ·   reviews: `reviews/`
started 2026-10-24   ·   probes: git: reachable · node+deps: reachable · port 4199: free · browser driver: reachable
flow mode: brief (default flow)
exec prefix: none   ·   browser driver: ok (playwright-cli 0.1.14)   ·   lint hook: none (builders run `npx vue-tsc -b` / `bash -n`)
plan variant: brief
base: bd2a0d0
research: skipped (research.md from /10x-research 2026-10-24, with two follow-ups, covers the entry points)
change folder: reused `release` (made with /10x-new; precedent: quality-of-life)
baseline: 0 vitest failing before this run (18 files, 415 tests)
frozen hash: 4297fccafbc6672c1d9829d0ef042b51ccffe0743c9eeaf645584cb5383cddba
db backup: none — no §13 in auto-loop.md (no database; plans live in browser localStorage)
owner-run: none as a slice — the real deploy (DNS, server setup, GitHub secrets, first push) is the owner's and goes to e2e-walkthrough.md
open config proposals: 6 — §2 add `npm test` / `npx vitest run <path>` (from quality-of-life, still open since feat-mvp-plans-workout-loop) · §4 `: any` scan matches CSS `anywhere` (quality-of-life) · §5 editor accessible names (quality-of-life) · §13 `database: none` (quality-of-life) · §3 Vitest fake-timer and mutant-copy forms (feat-mvp-plans-workout-loop) · §8/§9/§10 hotspot file names, storage keys, test-adequacy traps (feat-mvp-plans-workout-loop)
re-cuts: 2026-10-24 slice 3 (not started) gains `.gitattributes` (LF for *.sh, Dockerfile, *.conf, *.yaml, *.yml, *.mjs) — core.autocrlf=true would write CRLF shell scripts back on checkout
config note: `auto-loop.md` is modified in the tree but not committed (HEAD holds the deleted prototype's version); this run uses the working copy, plus `npm test` from CLAUDE.md

## Ledger

- [x] Phase 1
- [ ] Phase 2
- [ ] Phase 3
- [ ] Phase 4
- [ ] Phase 5
- [ ] goal review
- [ ] e2e walkthrough
- [ ] retrospective
- [ ] final report

## Status

| Phase | Builder | Rounds | State | Category | Wall / subagent | Tokens |
|---|---|---|---|---|---|---|
| 1 — Manifest, icons and service worker build | sonnet | 1 | CONCERNS (1 minor, 1 nit) → `bd9cd5d` | feature | 9m / 2m+ | 108k+ |
| 2 — Register the service worker and apply updates safely | sonnet | 0 | waiting | feature | — | — |
| 3 — Docker image with nginx | sonnet | 0 | waiting | feature | — | — |
| 4 — Server files and CI workflow | sonnet | 0 | waiting | feature | — | — |
| 5 — Deploy guide and project docs | sonnet | 0 | waiting | feature | — | — |

Routing and category (Step 1):
- Phase 1 → sonnet: touches `package.json`, `vite.config.ts`, `public/**` (always-sonnet in §8) and writes a verification script. feature — the build gains an installable manifest and a precaching service worker.
- Phase 2 → sonnet: production code in `src/` with tests. feature — the app registers the service worker and applies updates only at a safe moment.
- Phase 3 → sonnet: a Dockerfile, an nginx config and a smoke script whose criteria run Docker. feature — the app gains a deployable image.
- Phase 4 → sonnet: several non-identical files with a test script and a YAML check. feature — the deploy pipeline and server files are new.
- Phase 5 → sonnet: documentation, but its content must be derived from the files of phases 3–4, not transcribed. feature — the deploy guide is a deliverable the owner asked for.

## Run totals

phases measured: 1 of 5 executed   ·   tokens are subagents only, 10x-critic workers excluded

| Category | Phases | Tokens | % tokens | Wall | % wall | Subagent time |
|---|---|---|---|---|---|---|
| feature | 1 | 108k+ | 100% | 9m | 100% | 2m+ |
| stabilization | 0 | 0 | 0% | 0m | 0% | 0m |
| refactor | 0 | 0 | 0% | 0m | 0% | 0m |
| end-of-run review | — | — | — | — | — | — |
| **total** | 1 | 108k+ | 100% | 9m | 100% | 2m+ |

---

## Phase 2 — Register the service worker and apply updates safely

phase:     feature  ·  start 2026-10-24T12:53:30+0200  ·  end (pending)  ·  user wait 0m  ·  paused 0m

### round 1          builder sonnet → critic 10x-critic
  cost:      builder 109k tok / 17 calls / 2m37s  ·  critic unknown (Skill call returns no usage)
  workers:   walker sonnet 12:57:10→12:58:54 · criteria script 10s · prover not spawned
  spot-checks: walker 2.5 screenshots opened by the coordinator → confirmed
  automated: 4/4   manual: 1/1 (0 unreachable)
  verdict:   CONCERNS
  blockers:  none
  majors:    none
  minors:    `update-reload-drops-expired-notice`, `vacuous-no-registration-assertion`, `hook-test-unproduced-screen-state`
  report:    reviews/phase-2-round-1.md
  spot-check: re-ran 2.1 `npx vitest run src/pwa` → 19 passed → confirmed
  diff:      3 tracked files changed, +117/-2 (App.vue +6, App.test.ts +111, tsconfig.app.json 1 line) + 4 new files in src/pwa/
  clauses:   14/14 mapped (register-at-start mapped but not mutation-tested)
  scripted:  src/App.vue, tsconfig.app.json (python replace) — vue-tsc and npm test re-run green
  inconclusive: none
  builder:   src/pwa/updatePolicy.ts + useServiceWorkerUpdates.ts wired in App.vue; apply only on the plan list with no workout, update() on visible; 24 new tests

## Phase 1 — Manifest, icons and service worker build

phase:     feature  ·  start 2026-10-24T12:44:12+0200  ·  end 2026-10-24T12:52:54+0200  ·  user wait 0m  ·  paused 0m
totals:    wall 9m  ·  subagent time 2m+ (critic unknown)  ·  tokens 108k (subagents only, critic unknown)  ·  rounds 1

### round 1          builder sonnet → critic 10x-critic
  cost:      builder 108k tok / 17 calls / 2m20s  ·  critic unknown (Skill call returns no usage)
  workers:   walker sonnet 12:47:53→12:48:59 · criteria script 7s · prover not spawned
  spot-checks: walker 1.5 maskable icon re-measured by the coordinator → confirmed
  automated: 4/4   manual: 1/1 (0 unreachable)
  verdict:   CONCERNS
  blockers:  none
  majors:    none
  minors:    `icon-png-date-chunks-kept`, `precache-duplicate-entries` (Nit)
  report:    reviews/phase-1-round-1.md
  spot-check: re-ran `node scripts/verify-dist.mjs dist` → 15/15 ok → confirmed
  diff:      4 tracked files changed, +6368/-1191 (package-lock.json +6324/-1190: 335 packages added, 0 existing versions changed — checked against HEAD) + 6 new files
  clauses:   18/19 mapped (1 unmapped: icons made once — no automated check)
  scripted:  package.json, package-lock.json (npm install); public/icons/*.png (convert); DESIGN.md (python, CRLF kept); brief.md checkboxes (sed) — vue-tsc and verify-dist re-run green
  inconclusive: none
  builder:   vite-plugin-pwa 2.0.0 config, three PNG icons + sources, scripts/verify-dist.mjs (15 checks, each proved red on a dist copy), DESIGN.md „Ikona aplikacji”
