# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

"Trening" is a workout planner: calendar, plans, exercise library, rest timer / rep counter, and a workout log. It is a single-user app. Stack: Node.js ≥ 22.13 (Docker uses Node 24), Express 5, SQLite through the built-in `node:sqlite` (`DatabaseSync`, so there is no ORM or native dependency), and a vanilla JS frontend with no build step. Express is the only npm dependency.

The UI text, error messages and code comments are in **Polish**. Keep new strings and comments in Polish to match.

## Commands

```bash
npm install
npm run dev          # node --watch; DB at ./data/trening.db
npm start            # production-style run
docker compose up -d --build   # DB in the `trening-data` volume (/data/trening.db)
```

There are no tests, linter or formatter configured. `docker compose down -v` deletes the database volume.

Env vars: `PORT` (default 3000), `DB_PATH` (default `./data/trening.db`), `APP_USER` (default `admin`), `APP_PASSWORD`. Setting `APP_PASSWORD` turns on HTTP Basic auth for everything except `/api/health`.

## Architecture

Three files hold almost all the logic:

- **`db.js`**: `createRepo(file)` returns a repository object with all data access and validation. It throws `ValidationError` (→ 400) and `ConflictError` (→ 409, a subclass of `ValidationError`), which the error middleware in `server.js` maps to status codes.
- **`server.js`**: thin Express routes over the repo, plus Basic auth, static serving of `public/`, and a graceful shutdown that closes the DB on SIGTERM/SIGINT.
- **`public/app.js`**: the whole SPA.

### Data model and invariants (`db.js`)

- **Migrations** are an append-only array `MIGRATIONS`, versioned with `PRAGMA user_version`. Each one runs in its own transaction. Never edit an existing migration; append a new one. Example data is seeded only when the starting version was 0 (a fresh DB).
- **`exercises`** is the exercise library, and names are unique case-insensitively. SQLite `NOCASE` only covers ASCII, so the Polish-aware uniqueness check is done in JS (`nameKey` with `toLocaleLowerCase('pl')`). Deleting an exercise that is used in a plan throws `ConflictError`.
- **`plan_exercises`** links a plan to library exercises by `exercise_id`. `PUT /api/plans/:id` replaces the plan's whole item list (`writePlanItems` deletes the old items and reinserts them). `exerciseIdFor` accepts either an `exerciseId` or just a `name`, and finds or creates the library entry from the name. This keeps old backups and the import working.
- **`workouts` / `workout_exercises` / `workout_sets`** are deliberately **denormalized snapshots**: they store `plan_name` and the exercise names as text, so the log survives when a plan or exercise is renamed or deleted (the FKs are `ON DELETE SET NULL`).
- **Deleting a plan** also removes its *unfinished* schedule entries. Schedule entries already linked to a workout stay.
- Input sanitizers (`text`, `int`, `weight`, `date`, `id`, `timestamp`) clamp or validate every field. A `NULL` weight means bodyweight. Client-provided ids are accepted if they match `[\w-]{1,64}`; otherwise a UUID is generated.
- Any multi-statement write goes through the `tx()` helper.

### API

`GET /api/state` returns the entire dataset `{ exercises, plans, schedule, log }`, and the frontend keeps that whole object in memory. Mutations are REST endpoints per resource (`/api/exercises`, `/api/plans`, `/api/schedule`, `/api/workouts`). `GET /api/export` and `POST /api/import` cover JSON backup and restore (`replaceAll` wipes all tables and reloads them in one transaction).

### Frontend (`public/app.js`)

- Global state: `db` holds the server state and `ui` holds view state (tab, month, selected day, editors). `render()` rebuilds `#view` with `innerHTML` from the `view*()` template-string functions. Always escape interpolated data with `esc()`.
- Event handling is delegated: elements carry `data-action="name"`, which dispatches to the `actions` map (handlers receive `btn.dataset`). Forms go through `onSubmit`. Errors surface through `showError` (a toast).
- Plan saves go through a promise chain (`savePlan`) so that quick edits stay in order.
- The active workout ("runner") lives only on the client. It is kept in `localStorage` (`trening.run.v1`) so a reload doesn't lose it, and it is POSTed to `/api/workouts` only when the user saves the summary. The runner uses the Web Audio API for beeps and the Wake Lock API to keep the screen on.
- API URLs are relative (`api/state`, with no leading slash), so the app can be served under a reverse-proxy subpath. Keep it that way.
