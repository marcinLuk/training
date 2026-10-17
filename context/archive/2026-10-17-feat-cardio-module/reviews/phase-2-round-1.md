# Phase review — feat-cardio-module · Phase 2: Cardio data model and API · round 1

- **Scope:** working tree on top of `d7dbb2b` (`git status --porcelain`): `M db.js`, `M server.js`, `?? test/cardio-repo.test.js`, `?? test/migration.test.js`, `?? test/cardio-api.test.js`; `brief.md` Progress checkboxes 2.1–2.5 (diff checked: only those five `[ ]`→`[x]`, plus the orchestrator's SHA suffixes on 1.1–1.3). Not this slice: `.dockerignore`, `.env.example`, `.gitignore` (pre-existing, untracked), `workbench.md`, `.loop-baseline`.
- **Files reviewed:** 5 (`+701/-12` lines: `db.js` +137/-12, `server.js` +6/-0, `test/cardio-repo.test.js` +320, `test/migration.test.js` +106, `test/cardio-api.test.js` +132) + the 5 brief.md checkbox lines. `public/cardio-core.js` (Phase 1) read for how this slice uses it.
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 2: Cardio data model and API` Progress rows 2.1–2.5 (D2 server part, D5, D6, D7, D8, D9 repository/API parts) and `## Slice details` → `### Phase 2`; `## Out of scope`, `## Guardrails`
- **Reviewed at:** 2026-10-17
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | cardio-repo tests, N > 0, `# fail 0` (D5, D6, D7, D9) | `timeout 120 node --disable-warning=ExperimentalWarning --test test/cardio-repo.test.js` | pass |
| 2.2 | migration tests, N > 0, `# fail 0` (D8) | `timeout 120 node --disable-warning=ExperimentalWarning --test test/migration.test.js` | pass |
| 2.3 | cardio-api tests, N > 0, `# fail 0` (D2) | `timeout 120 node --disable-warning=ExperimentalWarning --test test/cardio-api.test.js` | pass |
| 2.4 | syntax checks exit 0 + §2 smoke exits 0 | `timeout 30 bash -c 'node --check server.js && node --check db.js && node --check public/app.js && node --check public/cardio-core.js'`; then the smoke command from loop-shared-rules.md with `<scratch-dir>` substituted, PORT=3999, `DB_PATH=<scratch-dir>/smoke.db`, under `timeout 60` | pass |
| 2.5 | whole suite `# fail 0` | `timeout 180 node --disable-warning=ExperimentalWarning --test` | pass |

2.1: exit 0. The 25 test names were listed; the last ones are quoted here:

```
ok 24 - kopia zapasowa: ukończony termin po usuniętym szablonie zostaje powiązany z treningiem cardio
ok 25 - osierocony termin ukończony treningiem siłowym nie przyjmie treningu cardio i odwrotnie
1..25
# tests 25
# suites 0
# pass 25
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

2.2: exit 0.

```
ok 1 - migracja v3 dodaje wersję i nie zmienia żadnego istniejącego wiersza (D8)
ok 2 - baza w wersji 2 nie dostaje danych przykładowych, a repozytorium czyta dane siłowe po migracji
ok 3 - ponowne otwarcie bazy w najnowszej wersji niczego nie zmienia
# tests 3
# pass 3
# fail 0
```

2.3: exit 0. The server was spawned on 3997. Afterwards nothing was listening on 3997–3999 (checked with `ss -ltnp`).

```
ok 1 - szablon, który nie mieści się w pełnych cyklach → 400 z polskim komunikatem i nic nie zapisuje
ok 2 - szablon bez interwałów lub z interwałem poza limitem → 400
ok 3 - poprawny szablon → 201, widoczny w stanie i usuwalny (204, potem 404)
ok 4 - termin z oboma identyfikatorami lub bez żadnego → 400 i nic nie zapisuje
ok 5 - trening cardio: niepasujący plan → 400 bez zapisu; poprawny → 201; usunięcie 204 / 404
ok 6 - eksport zawiera dane cardio, a import kopii bez kluczy cardio działa
# tests 6
# pass 6
# fail 0
```

2.4:

```
CHECK_EXIT=0
SMOKE_EXIT=0
Trening działa na http://localhost:3999 (baza: /tmp/claude-1000/-home-marci-www-Trening/c5deefd6-a45b-444c-b6a8-d94c9392c441/scratchpad/smoke.db)
```

2.5: exit 0. 70 = 36 (Phase 1) + 25 + 3 + 6. Baseline before this run: 0 tests. After Phase 1: 36 passing.

```
1..70
# tests 70
# suites 0
# pass 70
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

This slice has no inverted, before-the-fix or after-the-commit criteria.

### Manual

none. This slice has no manual verification items.

### Extra evidence produced by this review

**Migrations v1/v2 byte-identical to HEAD.** The `MIGRATIONS` array was parsed from `git show HEAD:db.js` and compared with `require('./db').MIGRATIONS`: `head len 2 work len 3`, `v1 identical: true`, `v2 identical: true`. `git diff -U0 db.js` shows the only hunk inside the array as `@@ -99,0 +101,31 @@`, which is a pure append.

**Strength behaviour, HEAD versus the working tree.** `<scratch-dir>/probe/strength-diff.js` runs 21 identical strength-only steps against `git show HEAD:db.js` and against the working `db.js`, with UUIDs normalised. The steps were: createPlan ×2; addSchedule with a valid plan, one date, an unknown plan, `''`, no plan, a null body, and a bad date; addWorkout linked, linked twice, with an unknown scheduleId, and with no scheduleId; deletePlan; a workout on an orphaned done entry; deleteSchedule; getState; replaceAll of an old-style backup (name-only plan items, an unknown planId); a bad backup; and an old-shape round trip. Result: `steps 21 diffs 4`. Two of the diffs are the brief-mandated `cardioTemplateId: null` on returned schedule entries. The other two are the `addSchedule` message when no plan is given (see `schedule-missing-plan-message-changed`). The status (ValidationError → 400) is unchanged. `deletePlan`, `getLog`, `replaceAll`, `insertWorkout` and `getState` (with the cardio keys removed) are identical for strength data.

**Mutants.** I copied the project to `<scratch-dir>/mutant/` (`server.js db.js public package.json test` plus a symlink to `node_modules`). `<scratch-dir>/probe/mutants.js` applies one textual mutation at a time and checks that it matched exactly once. It then runs `test/cardio-repo.test.js` and `test/migration.test.js` (or `test/cardio-api.test.js` for route mutants) and restores the copy. The working tree was never edited: `diff -q` of mutant/db.js and mutant/server.js against the originals printed `RESTORED`.
My first canary was a syntax error, so both files failed to load. I replaced it with a semantic one, and only the expected test turned red.

| # | Wrong implementation | Result | First failing test(s) |
| :-- | :-- | :-- | :-- |
| C0 | canary: `deleteCardioWorkout` returns `changes >= 0` | KILLED (1) | usuwanie treningu cardio: 204 dla istniejącego, false dla nieznanego |
| M1 | template delete removes done entries too (no `NOT IN`) | KILLED (2) | usunięcie szablonu: niewykonane terminy znikają, wykonane … zostają |
| M2 | template delete checks `workouts` instead of `cardio_workouts` | KILLED (2) | same |
| M3 | template delete keeps unfinished entries | KILLED (2) | same; usunięcie szablonu nie rusza terminów innych szablonów … |
| M4 | `checkedPlan` rounds the total down to `below` instead of rejecting | KILLED (4) | szablon cardio: nieprawidłowy plan jest odrzucany …; komunikat błędu to dokładnie komunikat checkPlan |
| M5 | `checkedPlan` rejects only limit breaches, accepts a non-multiple | KILLED (4) | same |
| M6 | `addSchedule` accepts both ids | KILLED (1) | kalendarz: oba identyfikatory, żaden lub nieznany … |
| M7 | `addSchedule` accepts neither id | KILLED (1) | same |
| M8 | `addSchedule` skips the unknown-template check | KILLED (1) | same |
| M9 | `addSchedule` stores `cardio_template_id` as null | KILLED (4) | kalendarz: termin z szablonem cardio … |
| M10 | `getState` schedule without `cardioTemplateId` | KILLED (4) | same; kalendarz: termin siłowy ma cardioTemplateId null … |
| M11 | `replaceAll` does not wipe `cardio_workouts` | KILLED (4) | kopia zapasowa: eksport → replaceAll przywraca cardio … |
| M12 | `replaceAll` does not wipe `cardio_templates` | KILLED (3) | same |
| M13 | `replaceAll` requires `cardioTemplates` | KILLED (1) | kopia zapasowa: starsza kopia bez kluczy cardio … |
| M14 | `replaceAll` drops the schedule's `cardioTemplateId` | KILLED (2) | eksport → replaceAll …; import jest idempotentny |
| M15 | `replaceAll` ignores `cardioLog` | KILLED (3) | same |
| M16 | free mode stores intervals/total | KILLED (13) | trening swobodny: zapis z intervals i totalSec ustawionymi na null |
| M17 | `activeSec` clamp max 21600 instead of 86400 | KILLED (1) | trening cardio: pola przechodzą przez sanitizery |
| M18 | no `mode` validation | KILLED (1) | same |
| M19 | cardio `scheduleId` accepts any schedule row | KILLED (2) | powiązanie z terminem …; osierocony termin … |
| M20 | strength `scheduleId` back to `exists('schedule')` | KILLED (2) | same |
| M21 | v3 `cardio_workouts.template_id` ON DELETE CASCADE (log lost) | KILLED (2) | trening cardio zachowuje nazwę i plan po usunięciu szablonu (migawka) |
| M22 | v3 `cardio_workouts.schedule_id` ON DELETE CASCADE | KILLED (1) | usunięcie terminu zeruje scheduleId w dzienniku cardio |
| M23 | v3 also runs `UPDATE workouts SET note = note \|\| ' '` | KILLED (1) | migracja v3 … nie zmienia żadnego istniejącego wiersza (D8) |
| M24 | seeding when `startVersion < 3` | KILLED (2) | migracja v3 …; baza w wersji 2 nie dostaje danych przykładowych … |
| M25 | note not trimmed | KILLED (1) | trening swobodny: … |
| M26 | template name not required | KILLED (1) | szablon cardio: nieprawidłowy plan jest odrzucany … |
| M27 | import inserts templates after schedule | KILLED (2) | eksport → replaceAll …; import jest idempotentny |
| M28 | `deletePlan` also deletes `plan_id IS NULL` (cardio) entries | KILLED (1) | usunięcie planu siłowego nie usuwa terminów cardio |
| M29 | cardio link loses the orphan branch | KILLED (1) | kopia zapasowa: ukończony termin po usuniętym szablonie … |
| M30 | strength link may take a cardio-done orphan | KILLED (1) | osierocony termin ukończony treningiem siłowym … |
| M31 | `createCardioTemplate` without `tx()` | SURVIVED | equivalent: a single INSERT, so no observable difference |
| M32 | `deleteCardioTemplate` without `tx()` | SURVIVED | equivalent under any reachable input: both statements always succeed. `tx()` is present (verified by reading, db.js:349) |
| M33 | `POST /api/cardio-templates` → 200 | KILLED (1) | poprawny szablon → 201 … |
| M34 | `DELETE /api/cardio-templates/:id` always 204 | KILLED (1) | same |
| M35 | `POST /api/cardio-workouts` registered after the `/api` 404 catch-all | KILLED (1) | trening cardio: niepasujący plan → 400 bez zapisu; poprawny → 201 … |

The only survivors are the two `tx()` mutants. Neither changes behaviour on any reachable input, so they are not unpinned clauses.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | CONCERNS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | PASS (3 nits) |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | CONCERNS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | PASS |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 0 · Minor: 3 · Nit: 4

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Every new function and the v3 migration have a Polish comment that explains the reasoning. Examples: `checkedPlan` "błąd to 400, nigdy przycinanie" (db.js:227), the snapshot comment on `cardio_workouts` (db.js:115), the "unfinished only" rule on `deleteCardioTemplate` (db.js:347), and the three-line explanation of the cross-kind schedule-link rule (db.js:377–379). The routes follow the existing self-describing style.

### D2. Are all relevant types of documentation covered?

**Verdict:** CONCERNS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | n/a | no setup, env or backup procedure changed; export/import still works the same way |
| CLAUDE.md | yes (invalidated) | no | the API and data-model sections now describe an older contract |
| ADR | no | n/a | no ADRs exist |
| API notes | via CLAUDE.md | no | see below |
| Query header comments / E2E rules / translations | n/a | n/a | not used in this repo |

- **[minor]** `claude-md-state-contract-stale`: `CLAUDE.md` § API says `GET /api/state` returns `{ exercises, plans, schedule, log }`. It lists the mutation resources as `/api/exercises`, `/api/plans`, `/api/schedule` and `/api/workouts`. The data-model section names no cardio tables. After this slice, the state also carries `cardioTemplates` and `cardioLog`, every schedule entry carries `cardioTemplateId`, and `/api/cardio-templates` and `/api/cardio-workouts` exist. A future agent that reads CLAUDE.md gets the wrong shape of the dataset the frontend holds. The brief does not ask for doc updates in this slice, so the owner may want to do this once at the end of the change.

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

The comments are clear, correct Polish. No wrong identifiers or paths.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 2 Changes required / Done-when) | Implemented in | Status |
| :-- | :-- | :-- |
| v3 appended; v1/v2 untouched | db.js:102–131; byte comparison above | met |
| `cardio_templates` (id, name, total, ordered intervals as JSON, created_at) | db.js:104–110 | met |
| `ALTER TABLE schedule ADD COLUMN cardio_template_id … ON DELETE SET NULL`, nullable, no default | db.js:112 (+ index :113) | met |
| `cardio_workouts` snapshot: name, mode CHECK, intervals/total null in free mode, template_id/schedule_id SET NULL, date, started/finished, active, note | db.js:116–130 | met |
| template and interval-workout plans via `checkPlan`, rejected with `ValidationError(message)`, never clamped | db.js:228–232, :339, :417 | met (M4/M5 killed) |
| other fields via sanitizers; active `int(…,0,86400)`; note trim 2000 | db.js:418–433 | met |
| `createCardioTemplate`, `deleteCardioTemplate` (tx; unfinished only), `addCardioWorkout`, `deleteCardioWorkout` | db.js:345–354, :437–438 | met |
| `addSchedule` exactly one of planId / cardioTemplateId; unknown id → ValidationError | db.js:358–373 | met |
| `getState` + `cardioTemplates`, `cardioLog` with the named fields; schedule `cardioTemplateId` | db.js:271–294 | met: the field sets match the brief exactly |
| `replaceAll` wipes cardio, templates before schedule, cardio workouts after; cardio keys optional; keeps `cardioTemplateId` when the template exists | db.js:443–466 | met |
| 4 routes before the `/api` 404, same style, 201 / 204 / 404 | server.js:63–67 | met (M33–M35 killed) |
| `MIGRATIONS` exported | db.js:494 | met |
| test files and their listed cases, temp files or `:memory:` only, API test on 3997 with `process.execPath` and kill in `after` | test/*.test.js | met |
| D2 (server): non-whole-cycle template → 400 with the Polish message | cardio-api.test.js:60–67 asserts 400, the message, 9:00, 10:30, nothing written | met |
| D5/D6/D7/D9 repository parts; D8 | cardio-repo.test.js; migration.test.js | met |
| Guardrail: existing data untouched | migration.test.js:41–70 compares every column of every v2 table before and after; M23/M24 killed | met |
| Slice guardrail: strength `addSchedule`/`deletePlan`/`getLog`/`replaceAll` unchanged for strength data | differential probe (21 steps): the only diffs are the mandated `cardioTemplateId: null` and one message | met |

Out of scope: nothing in the diff touches notifications, the strength runner, plans or exercise library, cardio metrics, integrations, or template editing (there is no update route). One strength-path change goes beyond the brief's list: `insertWorkout` now links through `existsScheduleEntry(…, false)` (db.js:394). For strength-only data it behaves exactly like HEAD (probe steps "workout linked / unknown / orphan done entry": same). It only refuses to link a strength workout to a cardio entry, or to an orphan entry that a cardio workout completed. That keeps "done" unambiguous for D6, and it falls within "the shared calendar and journal showing cardio". No finding.

### I2. Is it logically correct?

**Verdict:** PASS (3 nits)

FK and delete order in `replaceAll` (db.js:448–449): cardio_workouts → workouts → schedule → cardio_templates → plans → exercises. Every child goes before its parent, and plan_exercises cascades from plans before exercises (RESTRICT) is deleted. Reload order: exercises → plans → templates → schedule → workouts → cardio workouts. A bad template rolls the whole import back (cardio-repo.test.js:272–281). `deleteCardioTemplate` deletes the unfinished entries first and then the template, so the FK nulls `cardio_template_id` on the done entries that remain, and the cardio log keeps its name and intervals (M1–M3, M21 killed). `addSchedule` checks the ids before it parses the dates, and then inserts inside `tx()`.

- **[nit]** `schedule-missing-plan-message-changed`: db.js:361. A strength `POST /api/schedule` with no `planId`, or with a null body, used to answer `Wybrany plan nie istnieje` and now answers `Podaj dokładnie jedno: plan albo szablon cardio`. The status is still 400. This follows from the brief's "neither → ValidationError", and the current UI cannot send such a body.
- **[nit]** `repo-test-name-says-204`: test/cardio-repo.test.js:96 is named "204 dla istniejącego" but asserts the repository's boolean. The 204/404 is pinned in cardio-api.test.js:118–119, so nothing is left unpinned. Only the name is off.
- **[nit]** `migration-test-pins-length-3`: test/migration.test.js:47 `assert.equal(MIGRATIONS.length, 3)` will need editing when the next migration is appended. The later `user_version === MIGRATIONS.length` assertion already covers the intent.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

`checkedPlan` reuses `CardioCore.checkPlan` rather than duplicating it. `insertCardioTemplate` is shared by create and import, in the same shape as `insertPlan`. The `existsScheduleEntry` SQL is the densest part of the slice, but it carries a three-line reason, and two killed mutants each pin one of its branches (M29, M30).

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** CONCERNS

Every multi-statement write is inside `tx()` (create, delete template, add workout, addSchedule, replaceAll). `DatabaseSync` plus single-threaded Express means no interleaving.

- **[minor]** `duplicate-client-id-500`: db.js:339 and db.js:418. `createCardioTemplate` and `addCardioWorkout` accept a client id (`id(t?.id)` / `id(w.id)`), and a repeated id reaches SQLite raw. **Fails when:** two `POST /api/cardio-workouts {id:'wd',…}` requests → the second returns `500 Błąd serwera` ("UNIQUE constraint failed: cardio_workouts.id"), probe `edges.js`. Strength `addWorkout` behaves the same at HEAD (probed), so this extends an existing pattern to the new routes. It matters if Phase 3 sends a client id to make the retry-after-network-error save idempotent: a retry whose first attempt landed would show "Błąd serwera" for a workout that was in fact saved.
- **[minor]** `array-id-500`: db.js:363 (and :423–424 via `exists`/`existsScheduleEntry`). A non-string id is bound straight into node:sqlite. **Fails when:** `POST /api/schedule {cardioTemplateId:[1], date:'2026-03-02'}` → 500 "Unknown named parameter '0'" instead of 400. The same input on `planId` already returns 500 at HEAD (probed). An object id (`{}`) happens to bind as nothing and returns 400.
- **[nit]** `api-test-port-detection-racy`: test/cardio-api.test.js:30–39. If 3997 is already taken, the first `/api/health` probe can reach the foreign server before the child's `exit` event sets `exited`, and the tests then run against another database. Such a run fails red (the empty-state assertions catch it) rather than passing falsely, so the cost is a confusing failure, not a false green.

### I5. Is it performant?

**Verdict:** PASS

`existsScheduleEntry` and `deleteCardioTemplate` use an unindexed `NOT IN (SELECT schedule_id FROM …)`, which is the same shape as the existing `deletePlan`. Assuming a single user with ~10³ workouts and ~10³ schedule rows, each call is a scan of a few thousand rows, which is negligible. During import this is O(cardio × workouts), still under ~10⁶ row checks. `cardio_workouts(date)` and `schedule(cardio_template_id)` are indexed.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

All values are bound with `?`. The only interpolations are the constant `where` string (db.js:275) and literal table names passed to `exists`. Names are stored verbatim (`<`, `"`, `&` and Polish letters are tested, cardio-repo.test.js:47–56). Escaping on output is Phase 3's `esc()` job. The new routes sit behind the existing Basic-auth middleware, and `/api/health` is untouched.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** PASS

Unexpected errors still reach `console.error(err)` in the existing middleware (server.js:84). Validation failures return the Polish message. No leftover debug output.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` and `package-lock.json` are untouched. The tests use `node:test`, `node:assert`, `node:sqlite` and `node:child_process`, all built-in.

---

## Architecture — the project's own rules

- Polish UI text, errors and comments → meets: all new messages (`Podaj dokładnie jedno…`, `Wybrany szablon cardio nie istnieje`, `Nieprawidłowy tryb treningu cardio`, field names) and all comments, including the test files, are Polish.
- Migrations append-only, own transaction, seed only at v0 → meets: byte comparison above; M24 killed.
- ValidationError / ConflictError as the only bad-input channel → meets for all reachable typed input (the exceptions are under `array-id-500` / `duplicate-client-id-500`, both inherited patterns).
- Denormalized snapshots, FKs ON DELETE SET NULL; cardio follows the same rule → meets: `cardio_workouts` stores the name and intervals; M21/M22 killed.
- Deleting a plan or template removes only unfinished entries → meets: `deletePlan` is unchanged (probe), `deleteCardioTemplate` mirrors it, and the trap test with a done entry is present (cardio-repo.test.js:150–161).
- Every field through a sanitizer; client ids `[\w-]{1,64}` → meets (cardio-repo.test.js:80–94).
- Multi-statement writes in `tx()` → meets (read; M31/M32 are equivalent mutants).
- New top-level server file must go into the Dockerfile → n/a: `db.js` requires `./public/cardio-core`. The Dockerfile has `COPY public ./public`, and `.dockerignore` excludes only `node_modules data .env .git .playwright-mcp *.md`.
- Never use `./data/trening.db` or :3000 → meets: tests use `:memory:`, `os.tmpdir()` and port 3997.
- Express is the only dependency → meets.
- §10 test-adequacy traps: migration from v2 with data → present; old backup without cardio keys → present; log survives deleting the source → present (template deleted, cardio-repo.test.js:104–115); delete with a done entry → present; Polish letters and `<"&` → present.

## Not reviewed

- The Node 24 container image: this review ran locally on Node 22.
- A migration of the owner's real database: by rule, never opened. The upgrade path was exercised on a synthetic v2 file only.

## Observations outside scope

- For Phase 4: once a template is deleted, its done schedule entries come back as `{ planId: null, cardioTemplateId: null }`. Phase 4's `dayItems` must classify them through `cardioLog.find(c => c.scheduleId === s.id)`, not through `cardioTemplateId`, or they will render as "(usunięty plan)". The data is there; this is a reminder, not a defect.
- Pre-existing: `replaceAll` with a `null` element in `log` or `cardioLog` throws a TypeError, giving 500 instead of 400 (HEAD has the same for `log`).
- An untracked `documentation/pain-points-research-brief.md` (mtime 2026-10-17 14:09:08) appeared in the working tree while this review was running. It was not written by this review or by this slice. I did not read it or touch it.
- `CLAUDE.md` still says "There are no tests". Phase 1 made that stale; it is not this slice's change.
