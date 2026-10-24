# auto-loop config — Trening

Consumed by /10x-auto-implement-loop and its -v2, -v3, -v4, -v5 and -v6 versions (they share this file). Every command below is written EXACTLY as a subagent
must type it, including the execution prefix. A command that only works when typed by a human
in the right directory is a broken entry.

Rewritten by `/10x-auto-implement-loop-v6 init` on 2026-10-24, before the cardio module (PRD v2).
It replaces the 2026-10-18 version, which predated the unit tests, the PWA and the deploy setup.
Sources: `package.json`, `vite.config.ts`, `tsconfig*.json`, `.github/workflows/deploy.yml`,
`CLAUDE.md`, the code, and the `## Corrections to auto-loop.md` sections of the retrospectives of
`feat-mvp-plans-workout-loop`, `quality-of-life` and `release` (all proposals still open there are
applied here, except the ones marked otherwise). Provenance is marked per entry:
`detected from <file>`, `verified by running it`, `from <retrospective>`, or `ASSUMED — check this`.

## 1. Execution prefix

prefix: none — verified by running it on 2026-10-24 (every command below ran bare)
where:  repo root, `/home/marci/www/Trening`

Commands run directly in the WSL shell with the local Node (`v22.23.1`; `CLAUDE.md` asks for
Node 22 or newer). There is no container or task runner for development.

## 2. Verification commands

| Suite | Command (with prefix) | When |
|---|---|---|
| unit + component tests | `npm test` | every phase — `vitest run`, jsdom, `src/**/*.test.ts` (detected from `package.json`, `vite.config.ts`; CI runs it, `.github/workflows/deploy.yml`) |
| type check + build | `npm run build` | every phase — `vue-tsc -b` (app, tests, `vite.config.ts`), then `vite build` into `dist/`. Fails on type errors and unused locals/parameters (detected from `package.json`; CI runs it) |
| type check only | `npx vue-tsc -b` | between edits — verified by running it (exit 0) |
| dist check | `node scripts/verify-dist.mjs dist` | after `npm run build`, when a phase touches `vite.config.ts`, `public/**`, `index.html` or anything the service worker precaches (detected from `CLAUDE.md`; CI runs it) |
| deploy script test | `bash deploy/server/deploy.test.sh` | only when a phase touches `deploy/**` (detected from `CLAUDE.md`) |
| Docker image smoke | `bash scripts/smoke-image.sh` | only when a phase touches `Dockerfile`, `deploy/nginx/**` or `scripts/smoke-image.sh` — see §5 heavy-suite policy (detected from `CLAUDE.md`, CI) |

single test: `npx vitest run <file-or-dir>` — e.g. `npx vitest run src/workout/engine.test.ts`;
  by name: `npx vitest run <file> -t "<test name substring>"`. File form verified by running it
  (`npx vitest run src/plans/format.test.ts` → 1 passed). `-t` form ASSUMED — check this.
never in a verification: `npm run test:watch` (`vitest` in watch mode never exits).
baseline: capture at Step 0. Last known: 439 tests, 0 failing (from the `release` retrospective).

## 3. Runner traps

- **A green build proves types, not behaviour.** `npm run build` passes on an app that shows the
  wrong set or loses the workout on reload. A behaviour criterion needs a test or a browser check.
  — derived from `CLAUDE.md`.
- **Vitest with a filter that matches no file exits non-zero ("No test files found")**, but a `-t`
  name filter that matches no test inside a file reports the file as skipped and can exit 0. Match
  the summary line (`Tests  N passed`), not only the exit code. — ASSUMED — check this.
- **Timestamp logic is proved by moving the clock, not by running ticks.** Use `vi.setSystemTime`
  (or the injected `now()` from `src/lib/clock.ts`) and do NOT advance interval callbacks; a test
  that only runs `vi.advanceTimersByTime` passes on a tick-counting implementation. — from
  `feat-mvp-plans-workout-loop`.
- `npm run dev` (`vite`) and `vite preview` **never exit.** Start them in the background, record
  the PID and `kill` it at the end. Never run them in the foreground. — detected from
  `package.json`.
- **Start Vite with `./node_modules/.bin/vite`, never with `npx vite` or `npm run`.** With `npx`,
  `$!` is the `npx` process; `kill $!` leaves the Vite server running and holding the port —
  verified on 2026-10-18. The direct binary stops cleanly with `kill $P` — verified.
- Without `--strictPort`, Vite moves to the next free port when the port is taken, and a browser
  check then hits whatever answers on the old port. Always pass `--port <N> --strictPort`.
  — verified on 2026-10-18.
- `vite preview` serves `dist/` as it is on disk. After a source change, run `npm run build`
  before a preview check, or the critic walks the old build. — verified on 2026-10-18.
- **`npm run build` rewrites `dist/` while `vite preview` serves it.** Never run the build while a
  browser walk on `vite preview` is in progress (see §14). — derived from the two traps above.
- `vue-tsc -b` is incremental and keeps its state in `node_modules/.tmp/*.tsbuildinfo` (detected
  from `tsconfig.app.json`, `tsconfig.test.json`, `tsconfig.node.json`). Do not run `vue-tsc -b`
  in a mutant copy whose `node_modules` is a symlink to the real one: it writes the real build
  info. — ASSUMED — check this.
- **Ports.** The owner may run a dev server on the default port 5173 — never point a test or the
  browser at 5173 and never stop a process you did not start. Use 4199 (preview/dev), 4198 (mutant
  preview), 4197 (Docker smoke), 4196 (mutant image). — from `release`.
- **Docker.** A stopped container `trening` (image `trening-trening`) belongs to the owner — never
  remove it. A container left on a smoke port makes a smoke run pass for nothing: check the port is
  free before the run. — from `release`.
- **`curl localhost:4199` may time out (exit 28) on WSL with no local listener**; `vite preview
  --strictPort` still binds. A timeout is not "port taken". — from `feat-mvp-plans-workout-loop`.
- `git` prints `LF will be replaced by CRLF` on diffs (`core.autocrlf=true`, verified). It is
  noise, not a finding. But `core.autocrlf` also writes CRLF back into shell scripts unless
  `.gitattributes` forces LF — a `.sh` file must keep LF. — from `release`.
- **Write files with the Write or Edit tool, never with a shell heredoc or `echo`.** A heredoc in
  `release` p5 ended early on an `EOF` line inside the content, and the rest of the file ran as
  shell on the owner's machine. — from `release`.
- **Another Claude session may write into this checkout during a run** (seen in every run so far:
  `documentation/`, `ops/vps/`, PNGs in the tree, other change folders). Read `staging.sh`'s stage
  list before every commit and pass `--exclude` for foreign paths. — from `quality-of-life`.

Host flakes:
- A `PlanEditor`/`NumberStepper` test failed once inside a mutant-copy run, never in the real
  tree (`feat-mvp-plans-workout-loop` p5 r2, p7 r2). Not confirmed; if it repeats in a mutant
  copy, re-run once in the real tree before you call it a failure.

Mutants — how a critic serves a wrong implementation without editing the working tree:
- **Unit-level (Vitest):** copy the app into a scratch dir, edit the copy, run the tests there:
  `rm -rf <scratch-dir>/mutant && mkdir -p <scratch-dir>/mutant && cp -r src public index.html package.json vite.config.ts tsconfig*.json <scratch-dir>/mutant/ && ln -s "$PWD/node_modules" <scratch-dir>/mutant/node_modules`,
  edit the copy, then `cd <scratch-dir>/mutant && ./node_modules/.bin/vitest run <path>`.
  — verified in `feat-mvp-plans-workout-loop` p2–p8.
- **Browser-level:** in the same copy,
  `cd <scratch-dir>/mutant && ./node_modules/.bin/vite build && ./node_modules/.bin/vite preview --port 4198 --strictPort ><scratch-dir>/mutant.log 2>&1 & P=$!`
  and point the browser at `http://localhost:4198`; `kill $P` at the end. Use `vite build`, not
  `npm run build`, in the copy (see the `tsbuildinfo` trap). — verified on 2026-10-18: a canary
  edit reached the served bundle, and the real `dist/` stayed unchanged.
- A mutant changes only the clause under test. Read every call site of the function first.

## 4. Lint / static analysis

hook: none — subagents run the commands themselves (no `.claude/`, `.husky/` or
      `.pre-commit-config.yaml` in the repo; detected on 2026-10-24).
commands (each one must start from a subagent's shell — Step 0 runs `<tool> --version` for each):
  - `npx vue-tsc -b` — strict TypeScript from `@vue/tsconfig`, plus `noUnusedLocals`,
    `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`; covers the test
    files through `tsconfig.test.json`. Verified by running it (exit 0). There is no linter and no
    formatter.
coverage gaps: everything a type checker cannot see. A builder re-reads its own diff for
  DESIGN.md tokens (no new colors, fonts or sizes), Polish UI text, touch target sizes and
  `prefers-reduced-motion`.

NEVER-WEAKEN LIST — an entry here appearing in a diff trips the weakened-check valve. Scan the
diff for these patterns; do not pass whole `tsconfig*.json` files to `integrity.sh --never-weaken`
(a legitimate `exclude` edit then trips the valve — from `feat-mvp-plans-workout-loop` p1 r1):
  - TypeScript suppressions: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
  - `as any`, `: any` or `as unknown as` added to make an error go away. Scan only `.ts` files and
    `<script>` blocks of `.vue` files: `: any` also matches CSS `overflow-wrap: anywhere`
    (from `quality-of-life` p2).
  - In `tsconfig*.json`: removing or turning off `strict` (inherited), `noUnusedLocals`,
    `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, or adding
    `skipLibCheck` / `noCheck` to `tsconfig.app.json` or `tsconfig.test.json`.
  - Removing `vue-tsc -b` from the `build` script, or `npm test` / `npm run build` /
    `verify-dist.mjs` from `.github/workflows/deploy.yml`.
  - Vitest skips and focus: `.skip`, `.only`, `.todo`, `describe.skip`, `it.skip`, `test.skip`,
    `it.skipIf`, `test.runIf` added; an existing test file deleted; an assertion removed or
    loosened (`toBe` → `toBeTruthy`, an exact value → `expect.any`).

## 5. Browser driver

driver:   playwright-cli — verified by running it (`playwright-cli --version` → 0.1.14 on
          2026-10-24; a Windows binary reached over WSL interop). `CLAUDE.md` makes this the only
          allowed browser: never use the built-in browser pane tools (`mcp__Claude_Browser__*`),
          Claude in Chrome or the Playwright MCP server.
base url: `http://localhost:4199`
app must be running: the critic starts its own instance and stops it when done; the orchestrator
  may do the same. Default form (the production build with the service worker, closest to the
  phone):
  `npm run build && ./node_modules/.bin/vite preview --port 4199 --strictPort ><scratch-dir>/preview.log 2>&1 & P=$!`
  — verified; `kill $P` at the end (verified: the port is free after it).
  Dev form, when a phase needs it: `./node_modules/.bin/vite --port 4199 --strictPort ><scratch-dir>/dev.log 2>&1 & P=$!`
  — ASSUMED — check this. Offline and service-worker checks need the preview form.

session setup: no auth needed locally (Basic auth lives only on the server).
  Run every `playwright-cli` command **from `<scratch-dir>`**, with its own session name:
  `cd <scratch-dir> && playwright-cli -s=<change-id>-p<N> open http://localhost:4199`, then
  `resize 412 915` (phone first), `snapshot`, `click <ref>`, `fill <ref> <text>`,
  `screenshot --filename=<name>.png`, `close`. It writes `.playwright-cli/` into the current
  directory (verified), so running it from the repo root litters the tree.

credentials: none needed.

evidence: screenshots saved in `<scratch-dir>` and copied to `<change-dir>/reviews/screenshots/`;
  snapshot excerpts quoted in the report.

assertion rule: key on ARIA roles and accessible names from the snapshot. No `data-*` test-id
  convention exists. Known names (from `feat-mvp-plans-workout-loop`, `quality-of-life`): Start
  buttons "Start: <plan name>", card buttons "Edytuj: <name>", "Usuń plan: <name>", editor buttons
  „Przesuń ćwiczenie N w górę” / „… w dół”, the card toggle „Ćwiczenie N” with `aria-expanded`
  and body id `exercise-body-<id>`. Visible copy is Polish; quote it as evidence, but do not make
  it the only key.
  Plans and the running workout live in `localStorage` (`trening.plans.v1`,
  `trening.workout.v1`). A reused browser session carries data from an earlier walk: use a new
  session name per critic, or `playwright-cli -s=<name> delete-data` before the walk.
  `localstorage-list` / `localstorage-get <key>` / `localstorage-set <key> <value>` read and
  write it (listed by `playwright-cli --help`).

verified instrumentation forms (each used by a critic in an earlier run):
  - **Clock:** Playwright's fake clock through `run-code` (`page.clock.install()`,
    `page.clock.runFor(ms)`, `page.clock.setSystemTime(t)`) for long waits — never wait out a real
    rest or a 2-hour expiry. `setSystemTime` moves time with no timers run (the hidden-tab case);
    `runFor` runs timers (the visible-page case). — `feat-mvp-plans-workout-loop` p6 r2. The exact
    `run-code` quoting is in `context/changes/feat-mvp-plans-workout-loop/reviews/` — check there.
  - **Sound calls:** wrap `AudioContext.prototype.createOscillator` in an init script and count the
    calls; this proves the app asked for a sound, not that a speaker played it.
    — `feat-mvp-plans-workout-loop` p5–p7.
  - **Wake Lock calls:** fake `navigator.wakeLock` in an init script and log `request`/`release`.
    — `feat-mvp-plans-workout-loop` p6.
  - **Expiry and restore:** edit the stored timestamps in `trening.workout.v1`, then `reload`.
    — `feat-mvp-plans-workout-loop` p6.
  - **Offline:** on `vite preview`, load and reload once (the service worker takes control), then
    `network-state-set offline` and `reload`. — `release` p2 r1
    (`context/changes/release/reviews/phase-2-round-1.md`, item 2.5).

not observable by the driver: the real end-of-rest or interval sound through a speaker, the
  screen staying on, PWA install, behaviour on a locked phone screen, and Android battery or
  throttling behaviour. Such items are `unreachable(not observable by the browser driver)` and
  are owner-run on the phone by default. A LAN-IP URL is not a secure context
  (`crypto.randomUUID` and Wake Lock fail there), so the phone path is Chrome remote debugging
  with port forwarding, not a LAN address. — from `feat-mvp-plans-workout-loop`.

heavy-suite policy: `bash scripts/smoke-image.sh` builds a Docker image (needs Docker and takes
  minutes). An agent may run it once, with a timeout of 900 s, only when the phase touches the
  paths in §2; otherwise a criterion naming it is `unreachable(heavy — Docker image build, only
  for Docker/nginx phases)`. No other suite is heavy.

profile staleness: not applicable — no saved authenticated sessions.

## 6. Environment probes

| Probe | Command | On failure |
|---|---|---|
| git repository | `git rev-parse --is-inside-work-tree` | STOP — the loop commits per phase and diffs every round. |
| Node ≥ 22 and dependencies installed | `node -e "process.exit(+(+process.versions.node.split('.')[0] < 22))" && npx --no-install vue-tsc --version && npx --no-install vitest --version` | STOP — nothing can be verified; tell the owner to run `npm install` / use Node 22+. |
| port 4199 free | `! curl -s -m 1 -o /dev/null localhost:4199` | STOP — something already answers on 4199 (often an instance a crashed critic left behind); browser checks would hit it. Say what holds the port. (A curl timeout, exit 28, counts as free — §3.) |
| browser driver present | `playwright-cli --version` | DEGRADE — every manual item is unreachable and goes to the user. Verified (0.1.14). |
| Docker present | `docker info >/dev/null 2>&1` | DEGRADE — only for a phase that touches the §2 Docker paths: `scripts/smoke-image.sh` criteria are UNVERIFIED. ASSUMED — check this. |

## 7. Regeneration follow-ups

| The phase touched | Confirm it ran; run it if not |
|---|---|
| `src/**`, `public/**`, `index.html`, `vite.config.ts` | `npm run build` before any browser check on `vite preview` — preview serves the old `dist/` otherwise. |
| `vite.config.ts` (PWA/workbox), `public/**`, `index.html` | `node scripts/verify-dist.mjs dist` after the build — the service worker precache must still hold every file. |
| `package.json` dependencies | `npm install` — and only when the plan names the dependency (§12). |

## 8. Model routing overrides

haiku-eligible paths: `README.md`, `CLAUDE.md`, `context/**/*.md`, `docs/**/*.md` (except
  `docs/deploy.md`)
always-sonnet paths:  `src/**`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json`,
  `public/**`, `Dockerfile`, `deploy/**`, `.github/workflows/**`, `scripts/**`, `docs/deploy.md`,
  `DESIGN.md` (approved design system; a change needs the owner's decision)
hotspots (always sonnet, and name them to the builder):
  - `src/workout/useWorkout.ts` — commit/save of the running workout, the 500 ms tap guard, the
    idle-expiry timer, the end-of-rest sound rule. A missed write loses the owner's place.
  - `src/workout/engine.ts` — the workout state machine and the rest-time calculation (from
    stored timestamps, never from ticks).
  - `src/workout/workoutStore.ts` — persistence of the running workout (FR-009); a shape change
    must still read the old shape.
  - `src/plans/planStore.ts` and `src/lib/storage.ts` — the only copy of the owner's plans (FR-011);
    no server backup.
  - `src/pwa/**` — the silent-update policy (reload only on the plan list with no workout).
  - `src/styles/tokens.css` — the DESIGN.md tokens; a new color or size breaks the approved system.

## 9. Project rules — injected verbatim into every subagent prompt

(Lifted from `CLAUDE.md`, `context/foundation/prd-v2.md`, `context/foundation/prd.md` and the code.)

- **Scope comes from two PRDs.** `context/foundation/prd-v2.md` is the current PRD: the cardio
  module (interval sessions, lock mode), FR-016…FR-028 plus changes to FR-009, FR-011, FR-012. It
  is a delta on top of `context/foundation/prd.md` (v1, the strength MVP, FR-001…FR-015), which
  stays valid wherever v2 does not change it. Do not build what the Non-Goals of either PRD list.
- Read `DESIGN.md` and `PRODUCT.md` before you create or change any UI (components, styles, copy,
  icons, colors, fonts, layout), even for a small change. Use only the tokens, type scale, spacing
  and component rules from `DESIGN.md`. Do not invent colors, fonts or sizes, and do not
  redesign: the design is approved. If a task needs something `DESIGN.md` does not cover, stop and
  report it — the owner decides and `DESIGN.md` is updated in the same change. If code and
  `DESIGN.md` disagree, report it; never change one silently.
- Cardio UI follows `DESIGN.md` (sections "Sesja cardio", "Edytor planu cardio", "Znacznik typu"). Violet (`cardio` / `on-cardio`) means cardio only; on the cardio session screen the main action is on-cardio, not chalk. A cardio UI need that `DESIGN.md` does not cover is a stop, not a guess.
- Keep the key design rules: one chalk primary action per screen; the biggest number is sets left
  (rest time during rest); touch targets 56 px (64 px for the main action); no emoji as icons, no
  gradients, no left color stripe on cards. Dark theme ("guma") only — do not build a light theme
  or a theme switch. Plate colors and the plate stack are reserved for later — do not use them.
- Fonts are served locally from `public/`, never from a CDN — a CDN font breaks the offline app.
- All UI text is in **Polish**. Code, code comments and commit messages stay in English.
- **No server for user data.** Plans and workout state live only on the device. Do not add API
  calls, accounts or sync — the PRDs forbid any user data leaving the phone.
- **Offline after the first load.** Do not add anything the app shell needs from the network.
- **A workout survives interruptions (FR-009).** After a screen lock, an app switch or a reload,
  the user returns to the same place. Persist the running workout, not only the plans. A change to
  the stored shape must still read the old shape of the running workout, or a reload loses an
  in-progress workout.
- **Storage keys:** plans in `trening.plans.v1`, the running workout in `trening.workout.v1`.
  Unreadable stored data is copied once to `<key prefix>.corrupt.<timestamp>` before anything
  writes over it (`src/plans/planStore.ts`, `src/workout/workoutStore.ts`). Never drop that copy
  step — it is the owner's only chance to recover data.
- **Time comes from timestamps.** Compute remaining rest (and any interval time) from the stored
  start time and the current time, through `src/lib/clock.ts`. Never count timer ticks — a hidden
  tab stops ticking and the screen shows a wrong time after the user returns.
- **Time rules are checked on every tap and by a timer, not only on an event.** An expiry checked
  only on app start or `visibilitychange` never fires while the screen stays on (the
  `idle-expiry-never-fires-while-visible` bug).
- **Timing constants:** a second tap within `ACTION_GUARD_MS` (500 ms) of the last action is
  ignored; the end-of-rest sound plays only when the page is visible and at most
  `SOUND_MAX_LATE_MS` (2 s) after the rest ended — a rest that ended while hidden ends silently
  (`src/workout/useWorkout.ts`). Do not change these without the plan naming it.
- **The screen stays on during a workout (FR-012).**
- **Silent updates.** The app reloads for a new version only on the plan list with no running
  workout (`src/pwa/`). Anything that counts as a running workout must block the reload.
- Target: Android phone, current Chrome. Design for a phone first; iOS and desktop are not targets.
- Out of scope — do not build: workout history, statistics, calendar, exercise library, rep
  counting, voice guidance, vibration, a weight field, Google Play; for cardio also GPS, distance,
  heart rate, a guaranteed sound after a power-button lock, and a lock mode for the strength
  workout.
- Vue 3.5 single-file components with `<script setup>` and TypeScript strict. Do not use `enum`,
  `namespace` or constructor parameter properties — `erasableSyntaxOnly` is on and the build fails.
  Unused locals and parameters also fail the build.
- Tests live next to the code as `src/**/*.test.ts`. Import `describe`, `it`, `expect` and `vi`
  from `vitest` (no globals).
- The old Express + SQLite prototype is gone, and so is the archived `feat-cardio-module` code
  built on it. Do not look for it or copy its patterns.
- **Deployment:** see `docs/deploy.md`. Never contact the server from an agent. The repository is
  public: never commit secrets, IPs, e-mails, user names, `.env` files, `acme.json` or keys. The
  manifest link must keep `crossorigin="use-credentials"` (`useCredentials: true` in
  `vite.config.ts`), or Chrome cannot install the PWA behind Basic auth.

## 10. Review inputs

The critic judges the diff against these, on top of the plan and plain correctness:

- `CLAUDE.md` (the whole file)
- `DESIGN.md` (any UI change) and `PRODUCT.md` (principles, accessibility)
- `context/foundation/prd-v2.md` (the current PRD) and `context/foundation/prd.md` (v1, still
  valid where v2 does not change it)
- `context/foundation/roadmap.md` (the slice's outcome and risk) — it covers v1 only
- `context/foundation/tech-stack.md`
- `context/foundation/lessons.md` — does not exist yet
- `~/.claude/skills/10x-code-reviewer/criteria.md`
- no ADRs exist

test-adequacy traps for this project:
- A rest- or interval-timer test that only advances fake timers passes on a tick-counting
  implementation. A test must move the clock (or the injected "now") without running the ticks,
  as a hidden tab does, and still expect the right remaining time.
- A "survives reload" check that keeps the same in-memory state never reloads. It must read the
  state back from storage in a fresh app instance (or a real browser reload) at each state the
  plan names (mid-set, mid-rest, mid-interval, paused).
- **Every timer or guard armed at start must also be tested after a fresh-mount restore**
  (`expiry-decision-clauses-unpinned`, `feat-mvp-plans-workout-loop` p6 r2).
- A storage-shape change tested only with freshly written data cannot catch a lost in-progress
  workout; start from data in the old shape.
- **A test name is a claim.** Check that each test's inputs reach the exact case its name says
  (the last exercise, the end screen, a size). — 4 findings in `feat-mvp-plans-workout-loop`.
- **A test that computes its expectation from the constant under test pins nothing.** Pin each
  named time or size constant with a literal value in at least one test
  (`guard-window-size-unpinned`).
- **A lookup by id is tested with at least three items**, picking the first and the middle one
  (`getplan-by-id-unpinned`, `start-plan-lookup-unpinned`).
- **Double taps.** On every one-tap workout screen, a test clicks the main action twice 150 ms
  apart (`double-tap-crosses-screens`).
- **A test that passes only through Vitest's unhandled-error report pins nothing** — the assertion
  itself must go red when the guard is removed (`vacuous-no-registration-assertion`, `release` p2).
- A UI check done only at desktop width cannot catch phone layout, touch-target or one-thumb
  problems; walk at phone width (`resize 412 915`). A class assertion is not a size check — sizes
  need `getBoundingClientRect` in the browser.
- A check with ASCII-only names cannot catch Polish text problems; use names with Polish letters
  ("Wiosłowanie", "Ćwiczenie").
- A fixture state the app's own code never produces proves nothing. Build fixtures through the
  app's own functions.

## 11. Commit convention

format:  `<type>(<scope>): <subject>` (Conventional Commits) — detected from `git log`.
scope:   change-id
body:    one line on what landed; `Closed: <FINDING_ID>, …` — the loop's default
language: English subject and body — detected from `git log`
trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
forbidden: --no-verify, --amend, signing bypass, `git add -A`, `git add .`
pre-commit hook: none.
note: `context/` is tracked (verified: `git check-ignore -q context` → not ignored), so plans,
  reviews and workbench files are committed with the code. `dist/`, `node_modules/`, `.env` and
  `/.impeccable/` are ignored (detected from `.gitignore`). A path that was dirty before the run
  (for example `CLAUDE.md`) needs `--include` in every phase that edits it, since `staging.sh`
  subtracts the Step 0 baseline. — from `feat-mvp-plans-workout-loop`.

## 12. Dependency policy

A new dependency is a stop condition unless the plan names it. The only runtime dependency is
`vue`; dev dependencies are the Vite + TypeScript toolchain, Vitest, Vue Test Utils, jsdom,
`vite-plugin-pwa` and the two local `@fontsource` font packages (detected from `package.json`;
several are pinned to exact versions). Never touch `package-lock.json` unless the plan names a
dependency change.

## 13. Run-start DB backup

database: none — the app has no database. Plans and the running workout live in the browser's
          `localStorage` on the owner's phone (`trening.plans.v1`, `trening.workout.v1`); there is
          nothing on the development machine or the server to back up. Checked: no database
          service in `deploy/compose.yaml`, no `DATABASE_URL`, no `*.sqlite`.

## 14. Critic parallelism (v6)

parallelism: serial
why:         the criteria run includes `npm run build`, which rewrites `dist/` while the browser
             walker serves `dist/` with `vite preview` on 4199; together the walk can load a
             half-written build.
