# auto-loop config — Trening

Consumed by /10x-auto-implement-loop and its -v2, -v3, -v4 and -v5 versions (they share this file). Every command below is written EXACTLY as a subagent
must type it, including the execution prefix. A command that only works when typed by a human
in the right directory is a broken entry.

Drafted by `/10x-auto-implement-loop-v5 init` on 2026-10-17. Provenance is marked per entry:
`detected from <file>`, `verified by running it`, or `ASSUMED — check this`.

> **Blocker for any run (verified 2026-10-17):** `/home/marci/www/Trening` is **not a git
> repository** (`git rev-parse` → exit 128). The loop commits once per phase and its integrity
> and staging checks are built on `git diff` / `git status`, so the §6 git probe stops every run
> until the owner runs `git init` and makes a first commit. `.gitignore` already exists.

## 1. Execution prefix

prefix: none — verified by running it (every command below ran bare)
where:  repo root, `/home/marci/www/Trening`

Commands run directly in the WSL shell with the local Node (`v22.23.1`, satisfies `engines.node
>=22.13`). The Docker image uses Node 24 (detected from `Dockerfile`); nothing in the loop runs
inside the container.

## 2. Verification commands

The project ships **no tests, no linter, no CI** (detected from `package.json`, `CLAUDE.md`
"There are no tests, linter or formatter configured", no `.github/`). The entries below are the
honest minimum that exists today. A plan that changes behaviour is expected to add `node:test`
files and name them in its own Success Criteria; Express stays the only dependency (§12).

| Suite | Command (with prefix) | When |
|---|---|---|
| syntax | `node --check server.js && node --check db.js && node --check public/app.js` | every phase — verified by running it (exit 0) |
| unit (`node:test`, built in) | `node --disable-warning=ExperimentalWarning --test` | every phase — verified by running it: today it finds **0 tests** and exits 0 (see §3) |
| smoke (server boots on a fresh DB, seeds, serves API and SPA) | `rm -f <scratch-dir>/smoke.db*; (PORT=3999 DB_PATH=<scratch-dir>/smoke.db APP_PASSWORD= node --disable-warning=ExperimentalWarning server.js ><scratch-dir>/smoke.log 2>&1 & P=$!; for i in $(seq 30); do curl -sf -m 1 localhost:3999/api/health >/dev/null && break; sleep 0.3; done; curl -sf localhost:3999/api/health >/dev/null && curl -sf localhost:3999/api/state >/dev/null && curl -sf -o /dev/null localhost:3999/; R=$?; kill $P; wait $P 2>/dev/null; exit $R)` | every phase that touches `server.js`, `db.js` or `public/` — verified by running it (exit 0) |

single test: `node --disable-warning=ExperimentalWarning --test <path/to/file.test.js>`; one test
by name: add `--test-name-pattern="<name>"` — verified by running it on a scratch test file
(the name form has a trap, §3).
baseline:    capture at Step 0 (today: 0 tests, 0 failing).

## 3. Runner traps

- `node --test` with no matching test files prints `# tests 0` and **exits 0** — verified. A
  criterion "unit suite green" is met only when the summary shows `# tests N` with N > 0 and
  `# fail 0`, and the test the phase added is named in the output.
- `--test-name-pattern` that matches no test still **exits 0** — verified. Quote the line with the
  test's name from the output; the exit code alone proves nothing.
- `npm run dev` / `node --watch` never exits — an agent must never use it; run `server.js` directly
  as in the smoke command. — detected from `package.json`.
- **The owner's dev server runs on :3000 against the real `./data/trening.db`** (observed running
  during init). Never point a test, the smoke command or the browser at :3000, never run
  `server.js` without `DB_PATH=<scratch-dir>/…`, and never open `./data/trening.db` from a test —
  the default `DB_PATH` is the owner's workout log. Use port 3999 and a scratch DB.
- `createRepo(':memory:')` gives a fresh, migrated, seeded repository with no file — verified by
  running it. Unit tests of `db.js` should use it instead of a file.
- `node:sqlite` prints an `ExperimentalWarning` on stderr on Node 22 — pass
  `--disable-warning=ExperimentalWarning` (as `package.json` does) so it is not read as an error.
- A green local run is Node 22; the container is Node 24. Nothing in the loop verifies the image.
- The smoke command only proves the server boots, migrates a fresh DB and serves `/api/health`,
  `/api/state` and `/`. It does **not** exercise a migration from an older `user_version`.

Host flakes: none known.

Mutants — how a critic serves a wrong implementation without editing the working tree:
- Backend and frontend: copy the project root into `<scratch-dir>/mutant/` (`cp -r server.js db.js
  public package.json <scratch-dir>/mutant/ && ln -s "$PWD/node_modules" <scratch-dir>/mutant/node_modules`;
  copy the test files the phase needs too), edit the copy, then run the tests from there or start
  the copy on port 3998 with its own scratch `DB_PATH` and point the browser at it. — ASSUMED —
  check this (the project is three files with no build step, so a plain copy runs; not exercised
  during init). Prove it with a canary first: one mutant that must turn one known test red.

## 4. Lint / static analysis

hook: none — subagents run the commands themselves (no `.claude/`, `.husky/` or
      `.pre-commit-config.yaml` in the repo; detected).
commands (each one must start from a subagent's shell — Step 0 runs `<tool> --version` for each):
  - `node --check server.js && node --check db.js && node --check public/app.js` — syntax only;
    verified by running it. There is no formatter, linter or type-checker.
coverage gaps: everything beyond syntax. A builder re-reads its own diff for unescaped
  interpolation (`esc()`), Polish strings and comments, and relative API URLs (§9).

NEVER-WEAKEN LIST — an entry here appearing in a diff trips the weakened-check valve:
  - analyzer baselines: none exist.
  - test skips in `node:test`: `test.skip`, `it.skip`, `{ skip: … }`, `test.todo`, `{ todo: … }`
    added to an existing test — ASSUMED — check this (there are no tests yet; this is the only
    runner the project can use without a new dependency).
  - an existing test file deleted, or an assertion removed from one.

## 5. Browser driver

driver:   playwright-cli — verified by running it (`playwright-cli --version` → 0.1.14; a Windows
          binary reached over WSL interop; it opened `http://localhost:3999`, took a snapshot and a
          screenshot, and closed). The Playwright MCP server is also configured in Claude Code
          (`.gitignore` lists `.playwright-mcp`), but this config uses `playwright-cli` only.
base url: `http://localhost:3999` — a scratch instance, never the owner's :3000.
app must be running: the critic starts its own instance and stops it when done; the orchestrator
  may do the same:
  `rm -f <scratch-dir>/e2e.db*; PORT=3999 DB_PATH=<scratch-dir>/e2e.db APP_PASSWORD= node --disable-warning=ExperimentalWarning server.js ><scratch-dir>/e2e.log 2>&1 &`
  (record the PID, `kill` it at the end). A fresh DB starts with the seeded example data.

session setup: no auth needed — `APP_PASSWORD=` is set empty on the scratch instance, so Basic
  auth is off. Run every `playwright-cli` command **from `<scratch-dir>`**, with its own session
  name: `cd <scratch-dir> && playwright-cli -s=<change-id>-p<N> open http://localhost:3999`, then
  `snapshot`, `click <ref>`, `fill <ref> <text>`, `screenshot --filename=<name>.png`, `close`.
  It writes `.playwright-cli/` into the current directory (verified), so running it from the repo
  root litters the tree.

credentials: none needed (see above). Basic auth itself is only checkable with a second instance
  started with `APP_PASSWORD=<test value>`; that value is generated for the run, never the owner's
  `.env` value.

evidence: screenshots saved in `<scratch-dir>` and copied to `<change-dir>/reviews/screenshots/`;
  snapshot excerpts quoted in the report.

assertion rule: key on `data-action` / `data-id` attributes (32 `data-action` uses in
  `public/app.js`, detected) and on ARIA roles from the snapshot. Visible copy is Polish and
  owner-written; quote it as evidence, but do not make it the only key.
  The active workout ("runner") persists in `localStorage` (`trening.run.v1`) — a reused browser
  session carries a runner from an earlier walk. Use a new session name per critic, or
  `playwright-cli -s=<name> delete-data` before the walk.
  Beeps (Web Audio) and the screen staying on (Wake Lock) are not observable by the driver; such
  items are `unreachable(not observable by the browser driver)`.

heavy-suite policy: none — no suite is heavy.

profile staleness: not applicable — no saved authenticated sessions.

## 6. Environment probes

| Probe | Command | On failure |
|---|---|---|
| git repository | `git rev-parse --is-inside-work-tree` | STOP — the loop commits per phase and diffs every round. **Fails today** (exit 128). |
| Node runtime with `node:sqlite` and Express installed | `node --disable-warning=ExperimentalWarning -e "require('node:sqlite'); require('express')"` | STOP — nothing can run; tell the owner to run `npm install` / use Node ≥ 22.13. Verified (exit 0). |
| port 3999 free for the scratch instance | `! curl -s -m 1 localhost:3999/api/health` | STOP — something already answers on 3999 (often a scratch instance a crashed critic left behind); smoke and browser checks would hit it. Say what holds the port. |
| browser driver present | `playwright-cli --version` | DEGRADE — every manual item is unreachable and goes to the user. Verified (0.1.14). |

## 7. Regeneration follow-ups

none — detected: no build step, migrations in `db.js` run on server start, `public/` is served
from disk. (The Docker image is only rebuilt by the owner's `docker compose up -d --build`; see §9
for the Dockerfile copy list.)

## 8. Model routing overrides

haiku-eligible paths: `README.md`, `CLAUDE.md`, `context/**/*.md`, `.env.example`
always-sonnet paths:  `db.js`, `server.js`, `public/app.js`, `public/index.html`, `Dockerfile`,
  `docker-compose.yml`, `package.json`, any `*.test.js`
hotspots (always sonnet, and name them to the builder):
  - `db.js` `MIGRATIONS` and the `PRAGMA user_version` loop — append-only; a wrong entry corrupts
    the owner's existing DB on next start.
  - `db.js` `replaceAll` (import) — wipes every table in one transaction.
  - `db.js` `writePlanItems` / `exerciseIdFor` — delete-and-reinsert of plan items, find-or-create
    by name (old backups depend on it).
  - `db.js` `nameKey` — Polish-aware uniqueness; SQLite `NOCASE` is ASCII-only.
  - `public/app.js` runner persistence (`RUN_KEY = 'trening.run.v1'`) — a shape change loses an
    in-progress workout on reload.
  - `public/app.js` `savePlan` promise chain and `esc()`.

## 9. Project rules — injected verbatim into every subagent prompt

(Lifted from `CLAUDE.md`, plus the Dockerfile copy list detected from `Dockerfile`.)

- Write all UI text, error messages and code comments in **Polish**. English strings break the
  app's single-language UI.
- **Migrations are append-only.** Never edit an existing entry of `MIGRATIONS` in `db.js`; append a
  new one. Each runs in its own transaction, versioned by `PRAGMA user_version`. Editing an applied
  migration leaves existing databases (the owner's, the Docker volume's) on a schema the code no
  longer describes. Example data is seeded only when the starting version was 0.
- Exercise names are unique **case-insensitively in Polish**: check with `nameKey`
  (`toLocaleLowerCase('pl')`) in JS, never rely on SQLite `NOCASE` (ASCII only — "Ś" ≠ "ś").
- Deleting an exercise used in a plan throws `ConflictError` (→ 409). Keep `ValidationError`
  (→ 400) / `ConflictError` (→ 409) as the only way the repo reports bad input; the error
  middleware in `server.js` maps them.
- `workouts` / `workout_exercises` / `workout_sets` are **denormalized snapshots** (plan name and
  exercise names stored as text, FKs `ON DELETE SET NULL`). Never turn them into joins — the log
  must survive renaming or deleting a plan or exercise.
- Deleting a plan removes only its **unfinished** schedule entries; entries linked to a workout stay.
- `exerciseIdFor` must keep accepting a bare `name` (find or create) — old backups and import
  depend on it. `PUT /api/plans/:id` replaces the whole item list.
- Every field passes through a sanitizer (`text`, `int`, `weight`, `date`, `id`, `timestamp`).
  `NULL` weight means bodyweight. Client ids are accepted only if they match `[\w-]{1,64}`.
- Every multi-statement write goes through `tx()`. A write outside it can leave half an update.
- Frontend: escape every interpolated value with `esc()` in the `view*()` templates — `render()`
  uses `innerHTML`, so a missed `esc()` is an XSS. Wire events through `data-action` + the
  `actions` map and forms through `onSubmit`; surface errors through `showError`.
- API URLs stay **relative** (`api/state`, no leading slash) — the app is served under a
  reverse-proxy subpath; a leading slash breaks it there.
- The active workout lives only on the client (`localStorage` key `trening.run.v1`) and is POSTed
  to `/api/workouts` only when the summary is saved. Changing its shape needs a new key or a
  migration of the stored value, or a reload loses the owner's in-progress workout.
- `/api/health` stays outside Basic auth — the Docker `HEALTHCHECK` calls it.
- A new top-level server file must be added to the Dockerfile's `COPY server.js db.js ./` line, or
  the container fails to start while every local check is green.
- Never run the app or a test against `./data/trening.db` or port 3000 — that is the owner's live
  data and running dev server. Use `DB_PATH=<scratch-dir>/…`, port 3999, or `createRepo(':memory:')`.
- Express is the only npm dependency; tests use the built-in `node:test` and `node:assert`.

## 10. Review inputs

The critic judges the diff against these, on top of the plan and plain correctness:

- `CLAUDE.md` (the whole file — architecture, invariants, frontend conventions)
- `README.md` (deployment, backup, configuration)
- `context/foundation/lessons.md` — does not exist yet
- `~/.claude/skills/10x-code-reviewer/criteria.md`
- no ADRs exist

test-adequacy traps for this project (derived from the invariants in `CLAUDE.md`, not from
observed incidents — the project has no test history yet):
- Name uniqueness tested only with ASCII ("a" vs "A") passes even if the check falls back to
  SQLite `NOCASE`; a test must use Polish letters ("Ćwiczenie" vs "ćwiczenie", "Ś" vs "ś").
- A migration tested only on a fresh DB (`:memory:`) never runs the upgrade path; a test must
  start from a DB at the previous `user_version` with data in it.
- Import/restore tested only with a current export misses old backups whose plan items carry only
  `name` and no `exerciseId`.
- Workout-log tests that never rename or delete the plan/exercise afterwards cannot catch a
  snapshot turned into a join.
- Plan deletion tested without a schedule entry linked to a workout cannot catch the "unfinished
  entries only" rule.
- A frontend change checked only in the browser with seeded ASCII data cannot catch a missing
  `esc()`; use a name containing `<` / `"` / `&`.

## 11. Commit convention

**No git repository yet** — nothing to detect from. Until the owner chooses otherwise:

format:  `<type>(<scope>): <subject>` (Conventional Commits) — ASSUMED — check this
scope:   change-id
body:    one line on what landed; `Closed: <FINDING_ID>, …` — the loop's default
language: English subject and body — ASSUMED — check this (code comments are Polish; commit
  messages have no precedent)
trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
forbidden: --no-verify, --amend, signing bypass, `git add -A`, `git add .`
pre-commit hook: none.
note: `context/` is not ignored by `.gitignore`, so plans, reviews and workbench files are
  committed with the code. `data/`, `.env` and `node_modules` are ignored (detected).

## 12. Dependency policy

A new dependency is a stop condition. Express is the only npm dependency by design
(`CLAUDE.md`); tests use `node:test` / `node:assert`, the browser driver is the globally installed
`playwright-cli`. Never touch `package-lock.json` unless the plan names a dependency change.
