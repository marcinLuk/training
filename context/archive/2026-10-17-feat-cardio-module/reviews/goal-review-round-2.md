# Goal review, round 2: feat-cardio-module (fix slice d8f9a79..ea893b2)

Inputs: frozen brief (above "## Progress", unchanged since d8f9a79), reviews/goal-review.md, `git diff d8f9a79..HEAD`, full
CLAUDE.md, README.md, package.json, db.js, server.js, public/{cardio-core.js,app.js,index.html,styles.css}, test/*.test.js,
Dockerfile, auto-loop.md §9–§10.

## 1. Nothing executable changed; suite green
- `git diff --stat d8f9a79..HEAD`: CLAUDE.md, README.md, package.json and files under context/ only.
  `git diff d8f9a79..HEAD -- db.js server.js public test | wc -l` → `0`. Dockerfile and package-lock.json are untouched.
- `timeout 180 npm test` (one run, Node 22.23.1): EXIT=0, `# tests 90`, `# pass 90`, `# fail 0`. The run included
  `ok 41 … (D1)`, `ok 50 … (D3)`, `ok 55 … (D4)`, `ok 75 usunięcie szablonu…`, `ok 83 … starsza kopia bez kluczy cardio…`
  and `ok 88 migracja v3 … (D8)`. That is the same count as round 1.
- D1–D10: met (unchanged since round 1, suite green).

## 2. G-01: closed
Each statement checked against the code:
- `npm test` → package.json:10 `node --disable-warning=ExperimentalWarning --test`. It finds exactly test/*.test.js (5 files) and
  no other matching files in the tree. True.
- Tests: node:test/assert only. True. cardio-api.test.js spawns server.js on port 3997 with a mkdtemp DB_PATH (test:11,43-46).
  True. migration.test.js uses tmpdir files and cardio-repo.test.js uses `:memory:`, and no test opens ./data. True.
  calendar-view.test.js runs app.js in node:vm with stubs (test:14-52). True.
- cardio-core.js: UMD wrapper (cardio-core.js:4-7). index.html:32-33 loads it before app.js. db.js:7 requires it, and so do
  test/cardio-core,cardio-repo. checkedPlan → CardioCore.checkPlan (db.js:228-232). The UI uses the same function
  (app.js:681,773). No DOM and no Date.now(). True.
- Cardio schema in v3 (db.js:102-131), free mode with NULL intervals/total_sec (db.js:417), snapshot with SET NULL FKs. True.
- Validated, never clamped (db.js:228-232, 339, 417). True.
- addSchedule both/neither/unknown → ValidationError (db.js:358-363). True. existsScheduleEntry drops a mismatched
  scheduleId to NULL (db.js:380-384,394,424). True. Template delete keeps entries a cardio workout closed (db.js:348-354). True.
- /api/state keys and the schedule entry shape (db.js:284-294), endpoints (server.js:57-67), optional import keys
  (db.js:456,464). True.
- Frontend: `#cardio-runner` (index.html:29), `trening.cardio.v1` validated by isValidStored (app.js:4,52-59), time from
  timestamps on setInterval (app.js:813-847), POST only on save (app.js:1089-1109), mutual refusal with Polish errors
  (app.js:425,770), `.cardio` + `--cardio` (styles.css:12,233). True.
- README: the feature line, the backup contents and old-backup import (db.js:443-466), and `npm test`. True. This also
  resolves round-1 G-02.
No statement would mislead the next contributor. Two wording imprecisions are listed below (G-10, G-11).

## 3. Cross-slice defects from the fix slice
None. The npm script does not affect the image: the Dockerfile runs `npm ci --omit=dev` and does not run tests, and scripts
are not in the lockfile. .dockerignore drops *.md, so docs never enter the image.

## Findings
- G-11 Minor (new): CLAUDE.md says "A schedule entry belongs to exactly one of planId / cardioTemplateId". That holds only when
  an entry is created (the parenthetical scopes it to addSchedule). Stored entries can have neither: after a plan or template
  is deleted (ON DELETE SET NULL, db.js:112) or after an import with an unknown id (db.js:459-460). existsScheduleEntry
  (db.js:378-384) lets such an entry be closed by the kind that did not close it, or by either kind when no workout has
  closed it. So "at most one" is the real stored invariant.
- G-10 Nit (new): the comment "node --test: all files in test/" is incomplete. Bare `node --test` also runs `**/*.test.js`,
  `**/test-*.js` and similar files anywhere outside node_modules. No such file exists today.
- G-03 Minor (carried): an interval workout ended early still shows the planned cycle count (app.js:401, 921).
- G-04 Minor (carried): fmtElapsed (app.js:28, used at 400) duplicates CardioCore.formatClock (app.js:930). The cycle count is
  recomputed inline at app.js:899.
- G-05 Minor (carried, uncertain): the strength side was touched for coordination (app.js:425, 512-536; db.js:394). CLAUDE.md now documents this.
- G-06 Minor (carried): the schedule uses `cardioTemplateId` while cardio workouts and dayItems use `templateId`
  (db.js:112/118, app.js:113/128).
- G-07 Nit (carried): `cardioShown.pos` is written (app.js:861) but never read (only .stage/.paused at 818). LIMITS, COUNTDOWN_SEC and cyclesWord are not used by app.js.
- G-08 Nit (carried): isValidStored does not check the top-level `startedAt` (cardio-core.js:164-183).
- G-09 Nit (carried): the template-name input is disabled while the plan is invalid (app.js:752).

Verdict: no Blockers, no Majors. G-01 is closed and only Minor/Nit findings remain, so the result is CONCERNS.
