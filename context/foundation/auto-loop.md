# auto-loop config — Trening

Consumed by /10x-auto-implement-loop and its -v2, -v3, -v4 and -v5 versions (they share this file). Every command below is written EXACTLY as a subagent
must type it, including the execution prefix. A command that only works when typed by a human
in the right directory is a broken entry.

Rewritten by `/10x-auto-implement-loop-v5 init` on 2026-10-18 for the Vite + Vue rebuild. The
earlier version described the deleted Express + SQLite prototype; nothing from it applies. Some
operational lessons from the `feat-cardio-module` retrospective
(`context/archive/2026-10-17-feat-cardio-module/retrospective.md`) carry over and are marked so.
Provenance is marked per entry: `detected from <file>`, `verified by running it`, or
`ASSUMED — check this`.

> **Update this file when F-03 (`unit-test-harness`, see `context/foundation/roadmap.md`) lands.**
> Today there is no test runner. §2, §3, §4 and §10 then need the unit-test command, the
> single-test forms, the runner traps and the skip syntax of the chosen runner (planned: Vitest +
> Vue Test Utils + jsdom).

## 1. Execution prefix

prefix: none — verified by running it (every command below ran bare)
where:  repo root, `/home/marci/www/Trening`

Commands run directly in the WSL shell with the local Node (`v22.23.1`; `CLAUDE.md` asks for
Node 22 or newer). There is no container or task runner.

## 2. Verification commands

The project ships **no tests, no linter, no formatter and no CI** yet (detected from
`package.json`, `CLAUDE.md` "`npm run build` is the only check today", no `.github/`).

| Suite | Command (with prefix) | When |
|---|---|---|
| type check + build | `npm run build` | every phase — verified by running it (exit 0). Runs `vue-tsc -b`, then `vite build` into `dist/`. Fails on type errors and on unused locals/parameters. |
| type check only | `npx vue-tsc -b` | when a builder wants a fast check between edits — verified by running it (exit 0) |

single test: none — there is no test runner until F-03.
baseline:    capture at Step 0 (today: build green, 0 tests).

A plan that adds behaviour before F-03 lands has no automated way to pin it. Its criteria are
either the build or a browser check (§5). Do not add a test runner inside an unrelated phase
(§12).

## 3. Runner traps

- **A green build proves types, not behaviour.** `npm run build` passes on an app that shows the
  wrong set or loses the workout on reload. Until F-03 lands, a behaviour criterion is met only by
  a browser check (§5) with quoted evidence. — derived from `CLAUDE.md`.
- `npm run dev` (`vite`) and `vite preview` **never exit.** Start them in the background, record
  the PID and `kill` it at the end. Never run them in the foreground. — detected from
  `package.json`.
- **Start Vite with `./node_modules/.bin/vite`, never with `npx vite` or `npm run`.** With `npx`,
  `$!` is the `npx` process; `kill $!` leaves the Vite server running and holding the port —
  verified on 2026-10-18 (two servers stayed up on 4199 and 4198). The direct binary stops cleanly
  with `kill $P` — verified.
- Without `--strictPort`, Vite moves to the next free port when the port is taken, and a browser
  check then hits whatever answers on the old port. Always pass `--port <N> --strictPort`.
  — Vite behaviour; the flags verified by running them.
- `vite preview` serves `dist/` as it is on disk. After a source change, run `npm run build`
  before a preview check, or the critic walks the old build. — verified (preview served the
  existing `dist/`).
- `vue-tsc -b` is incremental and keeps its state in `node_modules/.tmp/*.tsbuildinfo`
  (detected from `tsconfig.app.json`, `tsconfig.node.json`). Do not run `vue-tsc -b` in a mutant
  copy whose `node_modules` is a symlink to the real one: it writes the real build info.
  — ASSUMED — check this.
- The owner may run a dev server on the default port 5173. Never point a test or the browser at
  5173 and never stop a process you did not start. Use port 4199 (preview/dev) and 4198 (mutant).
- `git` prints `LF will be replaced by CRLF` on diffs (`core.autocrlf=true`, verified). It is
  noise, not a finding. — carried over from the cardio retrospective.
- Another Claude session may write into this checkout during a run (seen in the cardio run:
  `documentation/`, `context/changes/<other-change>/`). Read `staging.sh`'s stage list before
  every commit and pass `--exclude` for foreign paths. — carried over from the cardio
  retrospective.

Host flakes: none known.

Mutants — how a critic serves a wrong implementation without editing the working tree:
- Copy the app into a scratch dir, edit the copy, build and serve it on port 4198:
  `rm -rf <scratch-dir>/mutant && mkdir -p <scratch-dir>/mutant && cp -r src public index.html package.json vite.config.ts tsconfig*.json <scratch-dir>/mutant/ && ln -s "$PWD/node_modules" <scratch-dir>/mutant/node_modules`,
  edit the copy, then `cd <scratch-dir>/mutant && ./node_modules/.bin/vite build && ./node_modules/.bin/vite preview --port 4198 --strictPort ><scratch-dir>/mutant.log 2>&1 & P=$!`
  and point the browser at `http://localhost:4198`; `kill $P` at the end. Use `vite build`, not
  `npm run build`, in the copy (see the `tsbuildinfo` trap). — verified by running it on 2026-10-18: a canary edit
  reached the served bundle, and the real `dist/` stayed unchanged.
- After F-03: a mutant copy can also run the unit tests from the copy. Add the exact form here.

## 4. Lint / static analysis

hook: none — subagents run the commands themselves (no `.claude/`, `.husky/` or
      `.pre-commit-config.yaml` in the repo; detected).
commands (each one must start from a subagent's shell — Step 0 runs `<tool> --version` for each):
  - `npx vue-tsc -b` — strict TypeScript from `@vue/tsconfig`, plus `noUnusedLocals`,
    `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`; verified by running
    it (exit 0). There is no linter and no formatter.
coverage gaps: everything a type checker cannot see. A builder re-reads its own diff for
  DESIGN.md tokens (no new colors, fonts or sizes), Polish UI text, touch target sizes and
  `prefers-reduced-motion`.

NEVER-WEAKEN LIST — an entry here appearing in a diff trips the weakened-check valve:
  - TypeScript suppressions: `@ts-ignore`, `@ts-expect-error`, `@ts-nocheck`.
  - `as any`, `: any` or `as unknown as` added to make an error go away.
  - In `tsconfig*.json`: removing or turning off `strict` (inherited), `noUnusedLocals`,
    `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch`, or adding
    `skipLibCheck` / `noCheck` to `tsconfig.app.json`.
  - Removing `vue-tsc -b` from the `build` script in `package.json`.
  - After F-03: test skips and focus in the chosen runner (`.skip`, `.only`, `.todo`,
    `describe.skip`), an existing test file deleted, or an assertion removed. — ASSUMED — check
    this when F-03 lands.

## 5. Browser driver

driver:   playwright-cli — verified by running it (`playwright-cli --version` → 0.1.14; a Windows
          binary reached over WSL interop; it opened `http://localhost:4199`, took a snapshot and
          closed). `CLAUDE.md` makes this the only allowed browser: never use the built-in browser
          pane tools (`mcp__Claude_Browser__*`), Claude in Chrome or the Playwright MCP server.
base url: `http://localhost:4199`
app must be running: the critic starts its own instance and stops it when done; the orchestrator
  may do the same. Default form (the production build, closest to the phone):
  `npm run build && ./node_modules/.bin/vite preview --port 4199 --strictPort ><scratch-dir>/preview.log 2>&1 & P=$!`
  — verified by running it; `kill $P` at the end (verified: the port is free after it).
  Dev form, when a phase needs it: `./node_modules/.bin/vite --port 4199 --strictPort ><scratch-dir>/dev.log 2>&1 & P=$!`
  — ASSUMED — check this. After F-02 (service worker), offline checks need the preview form.

session setup: no auth needed (Basic auth lives only on the private server, which is not set up).
  Run every `playwright-cli` command **from `<scratch-dir>`**, with its own session name:
  `cd <scratch-dir> && playwright-cli -s=<change-id>-p<N> open http://localhost:4199`, then
  `resize 412 915` (phone first; the target is an Android phone), `snapshot`, `click <ref>`,
  `fill <ref> <text>`, `screenshot --filename=<name>.png`, `close`. It writes `.playwright-cli/`
  into the current directory (verified), so running it from the repo root litters the tree.

credentials: none needed.

evidence: screenshots saved in `<scratch-dir>` and copied to `<change-dir>/reviews/screenshots/`;
  snapshot excerpts quoted in the report.

assertion rule: key on ARIA roles and accessible names from the snapshot. No `data-*` test-id
  convention exists yet; if the first slice adds one, record it here. Visible copy is Polish; quote
  it as evidence, but do not make it the only key.
  Plans and the running workout live on the device (browser storage). A reused browser session
  carries data from an earlier walk. Use a new session name per critic, or
  `playwright-cli -s=<name> delete-data` before the walk. `localstorage-list` shows what the app
  stored.
  Rest checks: build the test plan with a short rest time; never wait out a real 90 s rest.
  The end-of-rest sound, the screen staying on (Wake Lock), PWA install and behaviour on a locked
  phone screen are not observable by the driver. Such items are
  `unreachable(not observable by the browser driver)` and are owner-run on the phone by default.
  — carried over from the cardio retrospective.

heavy-suite policy: none — no suite is heavy.

profile staleness: not applicable — no saved authenticated sessions.

## 6. Environment probes

| Probe | Command | On failure |
|---|---|---|
| git repository | `git rev-parse --is-inside-work-tree` | STOP — the loop commits per phase and diffs every round. Passes today. |
| Node ≥ 22 and dependencies installed | `node -e "process.exit(+(+process.versions.node.split('.')[0] < 22))" && npx --no-install vue-tsc --version` | STOP — nothing can be verified; tell the owner to run `npm install` / use Node 22+. Verified (exit 0, vue-tsc 6.0.3). |
| port 4199 free | `! curl -s -m 1 -o /dev/null localhost:4199` | STOP — something already answers on 4199 (often an instance a crashed critic left behind); browser checks would hit it. Say what holds the port. |
| browser driver present | `playwright-cli --version` | DEGRADE — every manual item is unreachable and goes to the user. Verified (0.1.14). |

## 7. Regeneration follow-ups

| The phase touched | Confirm it ran; run it if not |
|---|---|
| `src/**`, `public/**`, `index.html`, `vite.config.ts` | `npm run build` before any browser check on `vite preview` — preview serves the old `dist/` otherwise. |
| `package.json` dependencies | `npm install` — and only when the plan names the dependency (§12). |

## 8. Model routing overrides

haiku-eligible paths: `README.md`, `CLAUDE.md`, `context/**/*.md`, `docs/**/*.md`
always-sonnet paths:  `src/**`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `package.json`,
  `public/**` (manifest, service worker, fonts — once they exist)
hotspots (always sonnet, and name them to the builder):
  - the running-workout state and its persistence (FR-009) — a shape change or a missed write
    loses the owner's place in a workout after a reload. File not created yet; name it here when
    S-02 / S-03 add it.
  - the rest-time calculation — it must come from stored timestamps, never from timer ticks.
  - the storage layer for plans (FR-011) — the only copy of the owner's data; no server backup.
  - the DESIGN.md tokens in CSS — a new color or size breaks the approved system.

## 9. Project rules — injected verbatim into every subagent prompt

(Lifted from `CLAUDE.md` and `context/foundation/prd.md`.)

- Read `DESIGN.md` and `PRODUCT.md` before you create or change any UI (components, styles, copy,
  icons, colors, fonts, layout), even for a small change. Use only the tokens, type scale, spacing
  and component rules from `DESIGN.md`. Do not invent colors, fonts or sizes, and do not
  redesign: the design is approved. If a task needs something `DESIGN.md` does not cover, stop and
  report it — the owner decides and `DESIGN.md` is updated in the same change. If code and
  `DESIGN.md` disagree, report it; never change one silently.
- Keep the key design rules: one chalk primary action per screen; the biggest number is sets left
  (rest time during rest); touch targets 56 px (64 px for the main action); no emoji as icons, no
  gradients, no left color stripe on cards. Dark theme ("guma") only — do not build a light theme
  or a theme switch. Plate colors and the plate stack are reserved for after the MVP — do not use
  them.
- Fonts are served locally from `public/`, never from a CDN — a CDN font breaks the offline app.
- All UI text is in **Polish**. Code, code comments and commit messages stay in English.
- **No server for user data.** Plans and workout state live only on the device. Do not add API
  calls, accounts or sync — the PRD forbids any user data leaving the phone.
- **Offline after the first load.** Do not add anything the app shell needs from the network.
- **A workout survives interruptions (FR-009).** After a screen lock, an app switch or a reload,
  the user returns to the same set and the same rest state. Persist the running workout, not only
  the plans. A change to the stored shape must still read the old shape, or a reload loses an
  in-progress workout.
- **Rest time comes from timestamps.** Compute the remaining rest from the stored start time and
  the current time. Never count timer ticks — a hidden tab stops ticking and the rest shows a
  wrong time after the user returns.
- **The screen stays on during a workout (FR-012).**
- Target: Android phone, current Chrome. Design for a phone first; iOS and desktop are not targets.
- Out of scope for the MVP — do not build: workout history, statistics, calendar, exercise
  library, cardio, rep counting, voice guidance, vibration, a weight field, Google Play.
- Vue 3.5 single-file components with `<script setup>` and TypeScript strict. Do not use `enum`,
  `namespace` or constructor parameter properties — `erasableSyntaxOnly` is on and the build fails.
  Unused locals and parameters also fail the build.
- `src/components/HelloWorld.vue`, `src/assets/*` and the demo content in `src/App.vue` are
  scaffold leftovers. Replace them as features land; do not build on them.
- The old Express + SQLite prototype is gone. Do not look for it or copy its patterns.
- Deployment is planned but not set up: no PWA manifest, service worker, Dockerfile or CI exists
  yet. When the manifest is added, its link must use `crossorigin="use-credentials"`, or Chrome
  cannot install the PWA behind Basic auth.

## 10. Review inputs

The critic judges the diff against these, on top of the plan and plain correctness:

- `CLAUDE.md` (the whole file)
- `DESIGN.md` (any UI change) and `PRODUCT.md` (principles, accessibility)
- `context/foundation/prd.md` (FRs, non-goals) and `context/foundation/roadmap.md` (the slice's
  outcome and risk)
- `context/foundation/tech-stack.md`
- `context/foundation/lessons.md` — does not exist yet
- `~/.claude/skills/10x-code-reviewer/criteria.md`
- no ADRs exist

test-adequacy traps for this project (derived from the rules in `CLAUDE.md` and the PRD, and from
the cardio run on the old app — the new app has no test history yet):
- A rest-timer test that only advances fake timers passes on a tick-counting implementation. A
  test must move the clock (or the injected "now") without running the ticks, as a hidden tab
  does, and still expect the right remaining time.
- A "survives reload" check that keeps the same in-memory state never reloads. It must read the
  state back from storage in a fresh app instance (or a real browser reload) mid-rest and
  mid-set.
- A storage-shape change tested only with freshly written data cannot catch a lost in-progress
  workout; start from data in the old shape.
- A UI check done only at desktop width cannot catch phone layout, touch-target or one-thumb
  problems; walk at phone width (`resize 412 915`).
- A check with ASCII-only names cannot catch Polish text problems; use names with Polish letters
  ("Wiosłowanie", "Ćwiczenie").
- A fixture state the app's own code never produces proves nothing (cardio run: a "deleted plan"
  fixture used an id `deletePlan` never leaves). Build fixtures through the app's own functions.
  — carried over from the cardio retrospective.

## 11. Commit convention

format:  `<type>(<scope>): <subject>` (Conventional Commits) — detected from `git log`; used by the
  whole cardio run without objection.
scope:   change-id
body:    one line on what landed; `Closed: <FINDING_ID>, …` — the loop's default
language: English subject and body — detected from `git log`
trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
forbidden: --no-verify, --amend, signing bypass, `git add -A`, `git add .`
pre-commit hook: none.
note: `context/` is not ignored, so plans, reviews and workbench files are committed with the
  code. `dist/`, `node_modules/` and `.env` are ignored (detected from `.gitignore`).

## 12. Dependency policy

A new dependency is a stop condition unless the plan names it. The only runtime dependency is
`vue`; dev dependencies are the Vite + TypeScript toolchain (detected from `package.json`). F-03
is expected to add a test runner and F-02 a PWA plugin — through their own plans. Never touch
`package-lock.json` unless the plan names a dependency change.
