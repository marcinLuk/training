# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Trening" is a workout planner: calendar, plans, exercise library, rest timer / rep counter, a workout log, and a Cardio tab (stopwatch and interval workouts with templates). It is a single-user app. Stack: Node.js ≥ 22.13 (Docker uses Node 24), Express 5, SQLite through the built-in `node:sqlite` (`DatabaseSync`, so there is no ORM or native dependency), and a vanilla JS frontend with no build step. Express is the only npm dependency.

The UI text, error messages and code comments are in **Polish**. Keep new strings and comments in Polish to match.

## Commands

```bash
npm install
npm run dev          # node --watch; DB at ./data/trening.db
npm start            # production-style run
npm test             # node --test: all files in test/
docker compose up -d --build   # DB in the `trening-data` volume (/data/trening.db)
```

Tests use the built-in `node:test` and `node:assert` (no test dependency) and live in `test/`. Run one file with `node --disable-warning=ExperimentalWarning --test test/<file>.test.js`. `test/cardio-api.test.js` spawns `server.js` on port 3997 with a temp `DB_PATH`; the other tests use temp files or `createRepo(':memory:')`, never `./data`. `test/calendar-view.test.js` runs `public/app.js` in a `node:vm` context with minimal browser stubs, so a new top-level browser API used at load time in `app.js` needs a stub there. There is no linter or formatter configured. `docker compose down -v` deletes the database volume.

Env vars: `PORT` (default 3000), `DB_PATH` (default `./data/trening.db`), `APP_USER` (default `admin`), `APP_PASSWORD`. Setting `APP_PASSWORD` turns on HTTP Basic auth for everything except `/api/health`.

## Architecture

Four files hold almost all the logic:

- **`db.js`**: `createRepo(file)` returns a repository object with all data access and validation. It throws `ValidationError` (→ 400) and `ConflictError` (→ 409, a subclass of `ValidationError`), which the error middleware in `server.js` maps to status codes.
- **`server.js`**: thin Express routes over the repo, plus Basic auth, static serving of `public/`, and a graceful shutdown that closes the DB on SIGTERM/SIGINT.
- **`public/app.js`**: the whole SPA.
- **`public/cardio-core.js`**: pure cardio logic (plan check, pause-aware session time, interval timeline, Polish plurals), with no DOM and no `Date.now()` (callers pass `now`). One UMD-style file: `index.html` loads it as a classic script before `app.js` (global `CardioCore`), and `db.js` and the tests `require` it. `db.js` validates cardio plans with the same `CardioCore.checkPlan` the UI uses.

### Data model and invariants (`db.js`)

- **Migrations** are an append-only array `MIGRATIONS`, versioned with `PRAGMA user_version`. Each one runs in its own transaction. Never edit an existing migration; append a new one. Example data is seeded only when the starting version was 0 (a fresh DB).
- **`exercises`** is the exercise library, and names are unique case-insensitively. SQLite `NOCASE` only covers ASCII, so the Polish-aware uniqueness check is done in JS (`nameKey` with `toLocaleLowerCase('pl')`). Deleting an exercise that is used in a plan throws `ConflictError`.
- **`plan_exercises`** links a plan to library exercises by `exercise_id`. `PUT /api/plans/:id` replaces the plan's whole item list (`writePlanItems` deletes the old items and reinserts them). `exerciseIdFor` accepts either an `exerciseId` or just a `name`, and finds or creates the library entry from the name. This keeps old backups and the import working.
- **`workouts` / `workout_exercises` / `workout_sets`** are deliberately **denormalized snapshots**: they store `plan_name` and the exercise names as text, so the log survives when a plan or exercise is renamed or deleted (the FKs are `ON DELETE SET NULL`).
- **Cardio** (migration v3): `cardio_templates` (name, `total_sec`, `intervals` as a JSON array of seconds), `schedule.cardio_template_id` (nullable FK, `ON DELETE SET NULL`), and `cardio_workouts` (`mode` is `free` or `interval`; `intervals` / `total_sec` are NULL in free mode). Like `workouts`, `cardio_workouts` is a **denormalized snapshot**: it stores the name and intervals as text, and `template_id` / `schedule_id` are `ON DELETE SET NULL`, so the log survives deleting a template.
- **Cardio plans are validated, never clamped**: the interval list and total time of a template or of an `interval` workout go through `checkPlan` (via `checkedPlan` in `db.js`), and a plan that is not a whole number of cycles of the interval sequence (or breaks a limit) throws `ValidationError` with the Polish message. Other cardio fields use the usual sanitizers.
- A schedule entry belongs to exactly one of `planId` / `cardioTemplateId` (`addSchedule`: both or neither → `ValidationError`, unknown id → `ValidationError`). A strength workout can close only a strength entry and a cardio workout only a cardio one (`existsScheduleEntry`); a mismatching `scheduleId` is dropped to NULL.
- **Deleting a plan** also removes its *unfinished* schedule entries. Schedule entries already linked to a workout stay. **Deleting a cardio template** works the same way: its unfinished schedule entries go, entries linked to a cardio workout stay.
- Input sanitizers (`text`, `int`, `weight`, `date`, `id`, `timestamp`) clamp or validate every field. A `NULL` weight means bodyweight. Client-provided ids are accepted if they match `[\w-]{1,64}`; otherwise a UUID is generated.
- Any multi-statement write goes through the `tx()` helper.

### API

`GET /api/state` returns the entire dataset `{ exercises, plans, schedule, log, cardioTemplates, cardioLog }` (each schedule entry is `{ id, date, planId, cardioTemplateId }`, with `cardioTemplateId` null for strength), and the frontend keeps that whole object in memory. Mutations are REST endpoints per resource (`/api/exercises`, `/api/plans`, `/api/schedule`, `/api/workouts`, `/api/cardio-templates`, `/api/cardio-workouts`); `POST /api/schedule` takes exactly one of `planId` / `cardioTemplateId`. `GET /api/export` and `POST /api/import` cover JSON backup and restore (`replaceAll` wipes all tables and reloads them in one transaction). `cardioTemplates` / `cardioLog` are optional in an import, so older backups without cardio data still load.

### Frontend (`public/app.js`)

- Global state: `db` holds the server state and `ui` holds view state (tab, month, selected day, editors). `render()` rebuilds `#view` with `innerHTML` from the `view*()` template-string functions. Always escape interpolated data with `esc()`.
- Event handling is delegated: elements carry `data-action="name"`, which dispatches to the `actions` map (handlers receive `btn.dataset`). Forms go through `onSubmit`. Errors surface through `showError` (a toast).
- Plan saves go through a promise chain (`savePlan`) so that quick edits stay in order.
- The active workout ("runner") lives only on the client. It is kept in `localStorage` (`trening.run.v1`) so a reload doesn't lose it, and it is POSTed to `/api/workouts` only when the user saves the summary. The runner uses the Web Audio API for beeps and the Wake Lock API to keep the screen on.
- The cardio runner has its own overlay (`#cardio-runner`, not `#runner`) and its own session variable `cardio`, kept in `localStorage` under `trening.cardio.v1` (validated on load by `CardioCore.isValidStored`), separate from `trening.run.v1`. Its time comes only from `CardioCore` and stored timestamps, ticked on an interval, so a reload or a sleeping tab lands on the right time. It is POSTed to `/api/cardio-workouts` only when the user saves the summary. Only one of the two sessions runs at a time: `startRun` refuses while `cardio` is set and `startCardio` refuses while `run` is set, each with a Polish error. Cardio items are marked with the class `cardio` and the `--cardio` colour token in `styles.css`.
- API URLs are relative (`api/state`, with no leading slash), so the app can be served under a reverse-proxy subpath. Keep it that way.
