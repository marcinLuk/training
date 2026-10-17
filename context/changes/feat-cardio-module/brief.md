# Brief: Cardio workout module

## Goal
A new Cardio tab: a stopwatch workout with pause and end, an interval workout that runs only when the
total time is a whole number of cycles of the interval sequence, interval templates, and cardio
entries in the calendar and the journal shown in a colour distinct from strength workouts.

## Done when
- D1 Free mode: the user starts a stopwatch, pauses it, resumes it and ends the workout; the measured
  duration excludes paused time — a `node:test` test of the elapsed-time function + browser.
- D2 Interval builder: the user adds and removes any number of intervals (seconds each) and sets the
  total workout time; the app shows how many full cycles of the sequence fit. When the total time is
  not a whole multiple of the cycle length, the app shows a Polish message that the workout does not
  fit in full cycles, naming the nearest valid total times below and above, and Start, "save as
  template" and "add to calendar" are blocked. Intervals are never shortened. The server rejects such
  a template with HTTP 400 — `node:test` tests (validation function, repository/API) + browser.
- D3 Interval run: Start shows a 3-2-1 countdown (not counted in the workout time), then runs the
  intervals in order and repeats the sequence; at the end of every interval a beep sounds, the phone
  vibrates and the screen shows the next interval, which starts immediately with no gap; the workout
  ends by itself when the total time is reached and shows the summary — `node:test` test of the
  timeline function + browser (whether the beep is audible: the owner).
- D4 Pause works in interval mode too: the countdown of the current interval stops and resumes from
  the same remaining time — `node:test` test + browser.
- D5 A finished cardio workout (either mode) is saved to the journal and appears on its calendar day,
  both in a colour distinct from strength workouts — `node:test` repository test + browser (computed
  colour differs).
- D6 A cardio template can be scheduled on a calendar day (in the cardio colour); Start from the
  calendar runs it, and after the workout is saved the entry shows as done — `node:test` repository
  test + browser.
- D7 An interval workout can be saved as a template (name, intervals, total time); templates are
  listed, can be started and deleted; deleting a template removes its unfinished calendar entries and
  keeps the done ones — `node:test` repository test + browser.
- D8 Existing data is untouched: a database at the current schema version holding plans, schedule
  and journal entries reads back identical after the new migration runs — `node:test` test.
- D9 The JSON backup covers cardio: export contains cardio templates, cardio workouts and cardio
  calendar entries; importing that export restores them; an older backup without cardio data still
  imports — `node:test` repository test.
- D10 A cardio workout in progress (running or paused, in either mode) survives a page reload and
  continues from the correct time — browser.

## Out of scope
- system notifications (Notification API / background push); the signal is sound + vibration +
  on-screen message
- changes to strength training (its runner, plans, exercise library) beyond the shared calendar and
  journal showing cardio
- cardio metrics: distance, heart rate, calories, charts, statistics
- GPS, watches, external integrations
- editing a template — templates are created and deleted only

## Guardrails
- existing data untouched: the migration must not change or lose any existing plan, exercise,
  schedule or journal row
- project rules: auto-loop.md §9/§10

## Research
See research.md (entry points: db.js:9 MIGRATIONS, db.js:232 getState, db.js:326 replaceAll,
db.js:284 addSchedule, app.js:93 dayItems, app.js:310 viewJournal, app.js:466 tick).

## Progress

### Phase 1: Cardio core logic
#### Automated Verification:
- [x] 1.1 `node --disable-warning=ExperimentalWarning --test test/cardio-core.test.js` passes: summary shows `# tests N` with N > 0 and `# fail 0` (D1, D2, D3, D4) — d7dbb2b
- [x] 1.2 `node --check public/cardio-core.js` exits 0 — d7dbb2b
- [x] 1.3 `node --disable-warning=ExperimentalWarning --test` passes with `# fail 0` — d7dbb2b

### Phase 2: Cardio data model and API
#### Automated Verification:
- [x] 2.1 `node --disable-warning=ExperimentalWarning --test test/cardio-repo.test.js` passes with N > 0 and `# fail 0` (D5, D6, D7, D9) — 525b781
- [x] 2.2 `node --disable-warning=ExperimentalWarning --test test/migration.test.js` passes with N > 0 and `# fail 0` (D8) — 525b781
- [x] 2.3 `node --disable-warning=ExperimentalWarning --test test/cardio-api.test.js` passes with N > 0 and `# fail 0` (D2) — 525b781
- [x] 2.4 `node --check server.js && node --check db.js && node --check public/app.js && node --check public/cardio-core.js` exits 0, and the auto-loop.md §2 smoke command exits 0 — 525b781
- [x] 2.5 `node --disable-warning=ExperimentalWarning --test` passes with `# fail 0` — 525b781

### Phase 3: Cardio tab, runner and journal
#### Automated Verification:
- [x] 3.1 `node --check public/app.js && node --check public/cardio-core.js` exits 0 — 2867e53
- [x] 3.2 `node --disable-warning=ExperimentalWarning --test` passes with `# fail 0` — 2867e53
- [x] 3.3 the auto-loop.md §2 smoke command exits 0 — 2867e53
#### Manual Verification:
- [x] 3.4 Free mode: Start → the clock runs; Pause → it stays still for at least 3 s; Resume → it continues from the paused value; End → the summary's active time excludes the pause (run ~5 s, pause ~5 s, run ~5 s → about 0:10, not 0:15) (D1) — 2867e53
- [x] 3.5 Builder: intervals 30 s + 60 s with total 9:00 shows 6 full cycles and Start / "Zapisz jako szablon" are enabled; total 10:00 shows the Polish "does not fit in full cycles" message naming 9:00 and 10:30, and both are disabled; total 1:00 names only 1:30; adding or removing an interval updates the cycle count (D2) — 2867e53
- [x] 3.6 Interval run with 5 s + 7 s and total 0:24: a 3-2-1 countdown, then 5 s, 7 s, 5 s, 7 s; at every interval change the screen shows the new interval at once, a beep is played (AudioContext oscillator calls observed in the page) and vibration is requested; at 0:24 of active time the workout ends by itself and shows the summary (D3) — 2867e53
- [x] 3.7 Pause during an interval: the remaining time stays frozen for at least 3 s; Resume continues from the same remaining time (D4) — 2867e53
- [x] 3.8 Saving the summary adds a cardio card to the Dziennik tab, in the cardio colour (computed colour differs from a strength card), with the active time and the intervals (D5) — 2867e53
- [x] 3.9 Saving an interval workout as a template named `<b>Tabata & "test"</b>` lists it with the name shown as literal text; Start from the template runs it; Usuń removes it (D7) — 2867e53
- [x] 3.10 Reload during a running interval → it continues with the correct remaining time (±1 s); reload while paused → still paused at the same value; reload during the countdown → the countdown continues (D10) — 2867e53
- [x] 3.11 Strength regression: a strength plan still starts, records a set, runs its rest timer and saves; a cardio workout cannot start while a strength one is active, and the reverse, each with a Polish message — 2867e53

### Phase 4: Cardio in the calendar
#### Automated Verification:
- [x] 4.1 `node --check public/app.js` exits 0 — d8f9a79
- [x] 4.2 `node --disable-warning=ExperimentalWarning --test` passes with `# fail 0` — d8f9a79
- [x] 4.3 the auto-loop.md §2 smoke command exits 0 — d8f9a79
#### Manual Verification:
- [x] 4.4 The calendar form offers cardio templates; adding one to a day (and with weekly repeat for 2 weeks) shows dots and day cards in the cardio colour, whose computed colour differs from both the planned and the done strength dot (D6) — d8f9a79
- [x] 4.5 Start from a cardio day card runs the template; after the summary is saved the card and the dot show it as done (D6) — d8f9a79
- [x] 4.6 A free cardio workout saved today appears on today's calendar day in the cardio colour (D5) — d8f9a79
- [x] 4.7 Deleting a template that has one done and one future calendar entry removes the future entry and keeps the done one with its name (D7) — d8f9a79
- [x] 4.8 In the builder, "Dodaj do kalendarza" is disabled while the total does not fit in full cycles; with a valid total and a name it saves the template and adds it on the chosen date (D2, D6) — d8f9a79
- [x] 4.9 Strength regression: scheduling a strength plan and its planned/done display in the calendar are unchanged — d8f9a79

### Phase 5: Goal-review fixes
#### Automated Verification:
- [x] 5.1 `npm test` runs the whole `node:test` suite: summary shows `# tests N` with N > 0 and `# fail 0`
- [x] 5.2 `node --disable-warning=ExperimentalWarning --test` passes with `# fail 0`, and the auto-loop.md §2 smoke command exits 0

## Slice details

Owner-run (no row): D3's audible beep and the phone's vibration on a real device — the owner checks
them in the walkthrough; agents can only observe that the beep and vibrate calls are made.

### Phase 1: Cardio core logic
Changes required:
- New `public/cardio-core.js`: pure functions, no DOM, no `Date.now()` inside (the caller passes
  `now`). A UMD-style wrapper so the same file is a classic browser script (global `CardioCore`)
  and a CommonJS module (`module.exports`) — `node:test` and `db.js` require it, `index.html` loads
  it before `app.js` (Phase 3). Comments and messages in Polish.
- `LIMITS`: interval 5–3600 s (integers), 1–50 intervals, total time 1 s – 21600 s (6 h).
- `checkPlan(intervals, totalSec)` → `{ ok, cycleSec, cycles, below, above, message }`. `ok` only
  when every limit holds and `totalSec % cycleSec === 0`. Intervals are never shortened or rounded.
  `below` = the largest multiple of `cycleSec` smaller than `totalSec` that is ≥ `cycleSec`, else
  `null` (a total shorter than one cycle has no valid time below — 0 is not a workout); `above` =
  the smallest multiple larger than `totalSec` that is ≤ `LIMITS.totalMax`, else `null`. `message`
  is the Polish text the UI and the server show when `ok` is false, e.g. `Ten czas nie mieści się w
  pełnych cyklach (cykl 1:30). Najbliższe pasujące czasy: 9:00 (6 cykli) lub 10:30 (7 cykli).` —
  naming only the bounds that exist; a limit breach gets its own message (e.g. `Dodaj co najmniej
  jeden interwał`).
- Polish plural for cycles: 1 cykl · 2–4 cykle (but 12–14 cykli) · 0, 5+ cykli (22 cykle, 25 cykli).
- Session time with pauses: a session `{ startedAt, pausedAt, pausedMs }`; `activeMs(session, now)`
  = `(pausedAt ?? now) − startedAt − pausedMs`, never negative; `pause(session, now)` and
  `resume(session, now)` return new objects; pausing a paused session or resuming a running one is
  a no-op.
- `COUNTDOWN_SEC = 3`. The interval session's `startedAt` is the end of the countdown, so the
  countdown never counts as workout time.
- `intervalAt(intervals, totalSec, activeMs)` → `{ done, index, position, cycle, intervalSec,
  remainingMs }`: `position` in the flat sequence, `index` within the cycle, `cycle` 0-based; at an
  exact boundary the next interval is current; `done` when `activeMs ≥ totalSec × 1000`.
- `test/cardio-core.test.js` (`node:test` + `node:assert`): each clause above, including the
  failure paths, the boundaries (exact boundary, last ms of an interval, done), the cycle wrap, the
  below/above edges (total < one cycle; `above` beyond the 6 h limit), the plurals listed, and pause
  freezing both `activeMs` and `intervalAt`.
Slice guardrails: the file has no side effects at load time; nothing else changes in this slice.

### Phase 2: Cardio data model and API
Changes required:
- `db.js`: append migration v3 (never edit v1/v2): a `cardio_templates` table (id, name, total
  seconds, the ordered interval list — a JSON text column or a child table, builder's choice,
  created_at); `ALTER TABLE schedule ADD COLUMN cardio_template_id TEXT REFERENCES
  cardio_templates(id) ON DELETE SET NULL` (nullable, no default — the only form SQLite accepts,
  research.md); a `cardio_workouts` table that is a denormalized snapshot like `workouts`: name,
  mode (`free` | `interval`), intervals and total (null in free mode), template_id and schedule_id
  (both `ON DELETE SET NULL`), date, started_at, finished_at, active seconds, note.
- Validation: the interval list and total of a template, and of an `interval` workout, go through
  `checkPlan` from `public/cardio-core.js` (`require('./public/cardio-core')`; `public/` is already
  copied by the Dockerfile) and are rejected with `ValidationError(message)` when not ok — never
  clamped. Other fields through the existing sanitizers (`text`, `int`, `date`, `id`, `timestamp`);
  active seconds `int(…, 0, 86400)`; note trimmed to 2000.
- Repo functions: `createCardioTemplate`, `deleteCardioTemplate` (in `tx()`: delete the template's
  schedule entries that no cardio workout links to, then the template — the shape of `deletePlan`,
  db.js:275), `addCardioWorkout`, `deleteCardioWorkout`; `addSchedule` takes exactly one of
  `planId` / `cardioTemplateId` (both or neither → `ValidationError`, an unknown id →
  `ValidationError`).
- `getState()` gains `cardioTemplates` (`{ id, name, intervals, totalSec }`) and `cardioLog`
  (`{ id, templateId, scheduleId, name, mode, intervals, totalSec, date, startedAt, finishedAt,
  activeSec, note }`), and each schedule entry gains `cardioTemplateId` (null for strength).
  `/api/export` follows automatically.
- `replaceAll`: wipe the cardio tables too, reload templates before schedule and cardio workouts
  after; `cardioTemplates` / `cardioLog` are optional (an old backup without them imports and leaves
  no cardio data); schedule entries keep `cardioTemplateId` when that template exists.
- `server.js`: `POST /api/cardio-templates` (201), `DELETE /api/cardio-templates/:id` (204 / 404),
  `POST /api/cardio-workouts` (201), `DELETE /api/cardio-workouts/:id` (204 / 404), all before the
  `/api` 404 catch-all, same style as the existing routes.
- Export `MIGRATIONS` from `db.js` (read-only use by the migration test).
- Tests, all on temporary files under `os.tmpdir()` or `createRepo(':memory:')`, never `./data`:
  `test/cardio-repo.test.js` (create/list/delete templates; invalid plan rejected and nothing
  written; cardio workouts in both modes; schedule with a template, both ids, neither id; template
  delete with one done and one future entry; `getState` shape; export → `replaceAll` round trip
  restores cardio; an old backup without cardio keys imports; names with `<`, `"`, `&` and Polish
  letters stored verbatim); `test/migration.test.js` (build a v2 database by applying
  `MIGRATIONS.slice(0, 2)` and `PRAGMA user_version = 2` to a temp file, insert plans, exercises,
  plan items, schedule, workouts and sets, open it with `createRepo`, assert every pre-existing row of
  every pre-existing table reads back identical and `user_version` equals `MIGRATIONS.length`);
  `test/cardio-api.test.js` (spawn `server.js` with `process.execPath` on `PORT=3997`, a temp
  `DB_PATH`, `APP_PASSWORD=` — never 3000 or 3999; an invalid template → 400 with the Polish message
  and no template in `/api/state`; a valid one → 201; schedule with both ids → 400; kill the
  process in `after`).
Slice guardrails: existing tables and rows untouched (D8); strength behaviour of `addSchedule`,
`deletePlan`, `getLog` and `replaceAll` unchanged for strength data.

### Phase 3: Cardio tab, runner and journal
Changes required:
- `public/index.html`: a `Cardio` tab button (between Plany and Ćwiczenia), `<script
  src="cardio-core.js"></script>` before `app.js`, and its own overlay `<section id="cardio-runner"
  class="runner" hidden>`; do not reuse `#runner`.
- `public/app.js`, view `viewCardio()` in the `views` map: a "Trening swobodny" card with Start; an
  interval builder (list of intervals with remove buttons, an "add interval" seconds input, total
  time as minutes + seconds, a live line with the cycle count or the `checkPlan` message, Start and
  a name input + "Zapisz jako szablon", both disabled while `checkPlan` is not ok); a "Szablony"
  list with Start and Usuń (confirm). Builder state lives in `ui`.
- Cardio session in its own variable and its own key `trening.cardio.v1` (never `trening.run.v1`),
  saved on every state change. Interval start: `unlockAudio()` inside the click, a 3-2-1 countdown
  with a short beep per second (persist the countdown end, so a reload continues it); no pause
  during the countdown. Running: free mode shows the active time; interval mode shows the current
  interval's remaining time, "Interwał x z n · cykl c z C" and the next interval. At every interval
  change: `beep()`, `navigator.vibrate?.(…)` and a visible change of the current interval (e.g. a
  short highlight "Teraz: 60 s"); at the total time a longer beep and the summary. Pause / Wznów and
  Zakończ (confirm) in both modes. The time comes only from `CardioCore` and timestamps, ticked every
  250 ms, so a sleeping tab or a reload lands on the right time.
- Summary: mode, active time, intervals, a note, "Zapisz w dzienniku" (POST `api/cardio-workouts`,
  relative URL; on a network error the summary stays and the save can be retried, like `run-save`)
  and "Odrzuć". Names: a template's name, `Cardio swobodne` for free mode, `Interwały 30 s + 60 s`
  style for an unsaved interval workout.
- `viewJournal`: cardio entries merged with strength entries by start time, each a card with the
  class `cardio`, a "cardio" tag, the active time as `fmtElapsed`, the intervals × cycles, the note
  and a Usuń button (`DELETE api/cardio-workouts/:id`). The month/total counters count both.
  Strength cards render exactly as before.
- `public/styles.css`: a `--cardio` token in the dark block and in the light-theme block, distinct
  from `--accent`, `--warn` and `--danger`; the cardio overlay, builder and card styles.
- Shared plumbing allowed in strength code, and only this: the click handler unlocks audio when a
  cardio session is active (app.js:748); the wake lock and `body.style.overflow` follow "strength
  run OR cardio session active" (app.js:495, 511–512); `startRun` refuses while a cardio session is
  active, and cardio start refuses while a strength run is active, each with a Polish `showError`.
Slice guardrails: `esc()` on every interpolated name; relative API URLs; no system notifications;
the strength runner's markup, logic and `trening.run.v1` shape stay as they are apart from the shared
plumbing above.

### Phase 4: Cardio in the calendar
Changes required:
- `dayItems`: a schedule entry with `cardioTemplateId` becomes a cardio item (name from the
  template, or from the cardio workout that completed it; `done` when a `cardioLog` entry has its
  `scheduleId`); cardio workouts with no schedule entry are loose cardio items on their date.
  Strength items are built exactly as before.
- Calendar dots and day cards: cardio items get the class `cardio` (planned = an outlined `--cardio`
  dot, done = a filled `--cardio` dot; card with a cardio tag and border), the Start button
  (`data-action="cardio-start"` with the template id and the schedule id) and Usuń for scheduled
  ones. Saving a workout started from the calendar sends its `scheduleId`.
- Schedule form: one select with an optgroup for strength plans and one for cardio templates; a
  cardio option posts `{ cardioTemplateId, dates }` with the same weekly repeat; the form shows when
  any plan or template exists.
- Builder: a date input (default: the selected calendar day) and "Dodaj do kalendarza", disabled
  while `checkPlan` is not ok or the name is empty; it creates the template and schedules it.
- After deleting a template, reload the state so its removed entries leave the calendar.
Slice guardrails: strength calendar behaviour and markup unchanged; `esc()` everywhere.

### Phase 5: Goal-review fixes
Changes required (from reviews/goal-review.md, finding G-01):
- `CLAUDE.md`: bring it in line with the code as it now is — tests exist (`npm test` / `node --test`,
  files under `test/`, `node:test` + `node:assert`, a `node:vm` harness for `public/app.js`); the
  `GET /api/state` shape now also carries `cardioTemplates` and `cardioLog`, and schedule entries
  carry `cardioTemplateId`; the cardio endpoints (`/api/cardio-templates`, `/api/cardio-workouts`,
  and `/api/schedule` taking exactly one of `planId` / `cardioTemplateId`); the cardio tables and
  that `cardio_workouts` is a denormalized snapshot like `workouts`; `public/cardio-core.js` as
  the shared pure module loaded by `index.html` and required by `db.js`; the cardio session in
  `localStorage` `trening.cardio.v1`, separate from `trening.run.v1`, and the rule that only one of
  the two sessions runs at a time. Keep the file's English, its structure and its tone; change only
  what the code made untrue, and add what a contributor now needs. Do not remove existing rules.
- `README.md` (Polish): mention the Cardio tab and that the JSON backup now includes cardio
  templates and workouts.
- `package.json`: add the script `"test": "node --disable-warning=ExperimentalWarning --test"`.
  No dependency change; `package-lock.json` untouched.
Slice guardrails: documentation and one npm script only — no change to application code or tests.
