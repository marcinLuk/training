# Phase review — feat-cardio-module · Phase 5: Goal-review fixes · round 1

- **Scope:** working tree vs `d8f9a79`, paths `CLAUDE.md`, `README.md`, `package.json` (+ brief.md Progress checkboxes 5.1–5.2)
- **Files reviewed:** 3 (`+17/-8` lines)
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 5: Goal-review fixes` (Progress rows 5.1–5.2 + Slice details), finding G-01 of `reviews/goal-review.md`
- **Reviewed at:** 2026-10-17
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 5.1 | `npm test` runs the whole `node:test` suite: `# tests N` with N > 0 and `# fail 0` | `timeout 180 npm test` | pass — header `> node --disable-warning=ExperimentalWarning --test`, `# tests 90`, `# pass 90`, `# fail 0`, EXIT=0; all 5 files ran (`ok 1 - dayItems: wpis z szablonem cardio…` from calendar-view, `ok 25 - odmiana cykli…` core, `ok 80 - getState: dotychczasowe klucze zostają…` repo, `ok 88 - migracja v3…(D8)` migration) |
| 5.2 | `node --test` passes with `# fail 0`, and the §2 smoke command exits 0 | `timeout 180 node --disable-warning=ExperimentalWarning --test`; smoke command from loop-shared-rules.md on PORT=3999, `DB_PATH=<scratch-dir>/smoke.db`, wrapped in `timeout 60` | pass — `# tests 90` / `# pass 90` / `# fail 0`, EXIT=0; `SMOKE_EXIT=0`, server log `Trening działa na http://localhost:3999 (baza: …/scratchpad/smoke.db)` |

```
# tests 90
# suites 0
# pass 90
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

The suite count equals the pre-existing baseline (0 before the run + 90 added by Phases 1–4). This slice adds no tests, as its guardrail requires.

### Manual (performed with —)

none. This slice has no manual items.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | CONCERNS (1 Minor, 1 Nit) |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | N/A: documentation only. The one npm script was checked by running it (5.1). |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | N/A: no code |
| I5 | Is it performant? | N/A: no code |
| I6 | Is it secure (SQL injection, …)? | N/A: no code, no secrets in docs |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A: no code |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | PASS: no dependency change. `dependencies` is still only `express`, and `package-lock.json` is not in `git status`. |

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 1

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Every point the Phase 5 Slice details lists for CLAUDE.md is now present, and each one checks out against the code:

| CLAUDE.md statement | Code | True? |
| :-- | :-- | :-- |
| `npm test # node --test: all files in test/` | package.json:10; `find` shows that the only test-pattern files are the 5 in `test/` | yes |
| tests use `node:test` + `node:assert`, live in `test/`; run one file with `node --disable-warning=ExperimentalWarning --test test/<file>.test.js` | every `test/*.test.js` requires `node:test`; the only non-`node:` requires are `../db` and `../public/cardio-core` | yes |
| `cardio-api.test.js` spawns `server.js` on 3997 with a temp `DB_PATH` | test/cardio-api.test.js:11, 42–44 (`os.tmpdir()`, `APP_PASSWORD: ''`) | yes |
| other tests use temp files or `:memory:`, never `./data` | migration.test.js:42/73/93 (`mkdtemp`), cardio-repo.test.js:15+ (`:memory:`). Core and view tests open no DB at all (see the Nit) | yes |
| `calendar-view.test.js` runs `app.js` in `node:vm` with minimal browser stubs; a new load-time browser API needs a stub | test/calendar-view.test.js:13–50 (the stub ctx: document, localStorage, fetch, navigator, setInterval/setTimeout); app.js:564/847 call `setInterval` at load | yes |
| "Four files…": `public/cardio-core.js` is pure (no DOM, no `Date.now()`) and UMD; index.html loads it before app.js; db.js requires it and validates with the same `checkPlan` the UI uses | cardio-core.js:4–7 (wrapper); `grep Date.now\|document\|window` matches only the comment on line 1; index.html:32–33; db.js:7, 228–231; app.js:681, 773 | yes |
| v3 tables: `cardio_templates` (name, `total_sec`, `intervals` as JSON), `schedule.cardio_template_id` nullable FK `ON DELETE SET NULL`, `cardio_workouts` with `mode` free/interval, intervals/total NULL in free mode, a denormalized snapshot with `template_id`/`schedule_id` `ON DELETE SET NULL` | db.js:103–131, 417 | yes |
| cardio plans validated, never clamped: `checkPlan` via `checkedPlan` → `ValidationError` with the Polish message | db.js:228–231, 339, 417 | yes |
| `addSchedule`: both or neither → `ValidationError`, unknown id → `ValidationError` | db.js:358–363 | yes (see Minor on "belongs to exactly one") |
| strength workouts close only strength entries and cardio only cardio (`existsScheduleEntry`); a mismatching id is dropped to NULL | db.js:380–384, 394, 424 | yes |
| deleting a cardio template removes its unfinished entries and keeps the linked ones | db.js:348–354 | yes |
| `/api/state` shape `{ exercises, plans, schedule, log, cardioTemplates, cardioLog }`; schedule entry `{ id, date, planId, cardioTemplateId }` | db.js:284–294 | yes |
| mutation resources include `/api/cardio-templates` and `/api/cardio-workouts`; `POST /api/schedule` takes exactly one of the two ids | server.js:57, 63–67 | yes |
| `cardioTemplates`/`cardioLog` optional on import | db.js:441–464 | yes |
| cardio runner: `#cardio-runner` overlay, variable `cardio`, key `trening.cardio.v1` validated by `isValidStored`, separate from `trening.run.v1` | index.html:28; app.js:3–4, 52–60 | yes |
| time only from `CardioCore` + stored timestamps, ticked on an interval | app.js:798, 847 | yes |
| POSTed to `/api/cardio-workouts` only on summary save | app.js:1089–1092 (`cardio-save`) | yes |
| only one session at a time: `startRun` refuses while `cardio`, `startCardio` refuses while `run`, each with a Polish error | app.js:425 (`showError`), 770 (throw → caught by `.catch(showError)` at app.js:1188) | yes |
| class `cardio` + `--cardio` token in styles.css | styles.css:13 (dark), 196 (light), 123–124, 223–224 | yes |

README.md now mentions the Cardio tab (line 3–4), says the backup includes cardio templates, workouts and calendar entries and that old backups still import (line 32, matching db.js:441–464), and lists `npm test` (line 40).

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | yes | yes | Cardio tab, backup scope, `npm test`; still Polish |
| CLAUDE.md | yes | yes | Still English. Same headings and tone. No existing rule removed or softened: the diff removes only "There are no tests…" (now false) and "Three files…" (now "Four"), and the "Deleting a plan" sentence is kept verbatim with a cardio sentence appended. |
| ADR | no | — | none exist |
| phpdoc / API | N/A | — | — |
| Query header comments | N/A | — | — |
| E2E rules / selectors | N/A | — | — |
| Translations | N/A | — | — |

G-01, point by point: "There are no tests" is gone. The `/api/state` shape is updated. The endpoint list is updated. "Three files" is now four, with the `db.js → public/cardio-core.js` dependency stated. `npm test` exists. Nothing G-01 named is still false or missing.

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** CONCERNS

- **[Minor]** `schedule-exactly-one-wording`: `CLAUDE.md:42` says "A schedule entry belongs to exactly one of `planId` / `cardioTemplateId`". That holds when an entry is created (`addSchedule`, db.js:358–363), but it is not an invariant of stored rows. A done entry whose plan or template was deleted keeps both columns NULL (FKs `ON DELETE SET NULL`, db.js:34/112, and the delete functions keep linked entries, db.js:329–335/348–354). `replaceAll` also writes both-NULL rows for unknown ids (db.js:459–461). The code knows this: see the comment at db.js:377–379 and the `cardioTemplateId || cardioLog` test in app.js:110. A contributor who takes the sentence literally could classify entries by `planId != null` / `cardioTemplateId != null` and misfile those orphans. Suggested wording: "is created for exactly one of … (orphaned entries left by a delete have neither)". The parenthetical `addSchedule` and the delete bullets limit the risk, so this is wording, not a false rule.
- **[Nit]** `test-db-wording`: `CLAUDE.md:21` says "the other tests use temp files or `createRepo(':memory:')`". `cardio-core.test.js` and `calendar-view.test.js` open no database at all. The key part, "never `./data`", is true.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 5 Slice details) | Implemented in | Status |
| :-- | :-- | :-- |
| CLAUDE.md: tests (`npm test`/`node --test`, `test/`, `node:test`+`node:assert`, `node:vm` harness) | CLAUDE.md:17, 21 | met |
| CLAUDE.md: `/api/state` + `cardioTemplates`/`cardioLog`, schedule `cardioTemplateId` | CLAUDE.md:49 | met |
| CLAUDE.md: cardio endpoints, `/api/schedule` exactly one id | CLAUDE.md:42, 49 | met |
| CLAUDE.md: cardio tables, `cardio_workouts` a denormalized snapshot | CLAUDE.md:40 | met |
| CLAUDE.md: `cardio-core.js` shared, loaded by index.html, required by db.js | CLAUDE.md:32 | met |
| CLAUDE.md: `trening.cardio.v1` separate from `trening.run.v1`; one session at a time | CLAUDE.md:57 | met |
| CLAUDE.md: keep English/structure/tone; no rule removed | whole diff | met |
| README.md (Polish): Cardio tab; backup includes cardio templates and workouts | README.md:3–4, 32 | met |
| package.json: `"test": "node --disable-warning=ExperimentalWarning --test"`, no dependency change, lock untouched | package.json:10; `git status --porcelain` shows no `package-lock.json` | met |
| Guardrail: documentation and one npm script only, no application code or tests | `git status --porcelain`: only CLAUDE.md, README.md, package.json, brief.md (Progress 5.1–5.2 ticked; frozen sections unchanged) and orchestrator-owned files are modified; db.js, server.js, public/, test/ are clean | met |

Out of scope: nothing touched. Guardrails: no data or migration change.

### I2. Is it logically correct?

**Verdict:** N/A. The only executable change is the npm script, and 5.1 ran it to 90/90.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS. The additions are sized to the code they describe.

### I4–I7

**Verdict:** N/A. No code changed.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** PASS. There is no new dependency. `package.json` gained only the `test` script.

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |
| — | — | — | — | none added |

---

## Architecture — the project's own rules

- "Write all UI text, error messages and code comments in Polish" → meets. There are no code changes. README stays Polish, and CLAUDE.md stays English as the slice requires.
- "Express is the only npm dependency; tests use the built-in node:test and node:assert" → meets. package.json:15–17 is unchanged, and CLAUDE.md now states the rule for tests.
- "Never run the app or a test against ./data/trening.db or port 3000" → meets. `npm test` adds no target, and the documented test setup (3997, temp DB) matches test/cardio-api.test.js:11/42–44.
- Migrations append-only, snapshots, tx(), esc(), relative URLs → not touched by this slice. CLAUDE.md keeps every one of these rules, and the new cardio text matches them.

## Not reviewed

- The Docker image (Node 24) was not built. `npm test` is not run in the image, and this slice did not change the Dockerfile.

## Observations outside scope

- `node --test` with no path argument also discovers `**/*.test.js` anywhere outside `node_modules`, not only under `test/`. Today no such file exists outside `test/`. If a test-named file ever lands in the untracked `documentation/` or `context/` trees, `npm test` would pick it up.
