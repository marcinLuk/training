# Phase review — feat-cardio-module · Phase 4: Cardio in the calendar · round 3

- **Scope:** working tree vs `HEAD` (2867e53): `public/app.js`, `public/styles.css`, `test/calendar-view.test.js` (new, untracked); `brief.md` Progress checkboxes 4.1–4.3
- **Files reviewed:** 3 (`+325/-12` lines: app.js +71/-12, styles.css +2/-0, calendar-view.test.js +252). Also read as the contract: `public/cardio-core.js`, the cardio parts of `db.js` (`addSchedule`, `existsScheduleEntry`, `insertCardioWorkout`, `deleteCardioTemplate`) and `server.js`
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 4` Progress rows 4.1–4.9 + Slice details "Phase 4"; Done-when D2 (builder part), D5 (calendar part), D6, D7 (calendar part)
- **Reviewed at:** 2026-10-17
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

Since round 2, `public/app.js` and `public/styles.css` are unchanged (app.js mtime 15:08, the same lines round 2 cited). Only `test/calendar-view.test.js` changed: it went from 10 to 15 tests, and the harness's `document.querySelector` now keeps one element per selector.

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | `node --check public/app.js` exits 0 | `timeout 30 node --check public/app.js` | pass (`4.1 exit=0`) |
| 4.2 | full suite passes with `# fail 0` | `timeout 180 node --disable-warning=ExperimentalWarning --test` | pass: `# tests 90` / `# pass 90` / `# fail 0`, `exit=0`. That is the 75 earlier tests plus 15 in `calendar-view.test.js`, all `ok` in the output (`ok 1 - dayItems: wpis z szablonem cardio jest elementem cardio…` through `ok 15 - syncCardioBuilder: "Dodaj do kalendarza" na żywo śledzi nazwę, datę i poprawność planu`), with 0 `not ok` lines. |
| 4.3 | the auto-loop.md §2 smoke command exits 0 | the loop-shared-rules smoke command, `<scratch-dir>` substituted, inside `timeout 60 bash -c "…"` | pass (`smoke exit=0`; log: `Trening działa na http://localhost:3999 (baza: …/scratchpad/smoke.db)`) |

Tail of 4.2:
```
1..90
# tests 90
# suites 0
# pass 90
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### Closures (rounds after the first)

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `calendar-clauses-unpinned` | round 1 (still open in part after round 2) | **yes** | Mutants were driven through `test/calendar-view.test.js` from a scratch copy (`<scratch-dir>/p4r3-mutant/`: `server.js db.js public package.json test` copied, `node_modules` symlinked, `diff -r` against the repo → `COPY-IDENTICAL`). The copy was proven first: the unmodified copy ran GREEN (15/15), and a canary (`'(usunięty plan)'` → `'(usuniety plan)'`) ran RED. Every one of round 2's four wrong variants now goes red (1a, 2a, 3a, 4a, 4c below). So does at least one second, different variant of each (1d; 2b and 2c; 3b; 4b, 4d, 4e and 4f). The driver is `<scratch-dir>/p4r3-mutants.js`. Each mutant is a single-occurrence string replacement in the copy's `public/app.js`, and the original is restored and diffed afterwards (`RESTORED`). |

| mutant | result | failing tests |
| :-- | :-- | :-- |
| baseline (unmodified copy) | GREEN (tests 15, fail 0, exit 0) | |
| canary: `"(usunięty plan)"` → `"(usuniety plan)"` | RED (fail 2) | #4, #13 |
| **1a** done matched by date (round-2 variant) | RED (fail 1) | #11 `zaplanowany wpis z szablonem i luźny trening cardio tego samego dnia…` |
| 1b done matched by `templateId` | GREEN | (see note) |
| 1c done matched by `templateId` + date | GREEN | (see note) |
| **1d** done matched by `scheduleId` OR date | RED (fail 1) | #11 |
| **2a** `planId` null ⇒ cardio (round-2 variant) | RED (fail 2) | #12 `wpis bez planu i bez szablonu, ale z treningiem siłowym…`, #13 |
| **2b** `planId` null and no strength log ⇒ cardio | RED (fail 1) | #13 `wpis bez planu, szablonu i treningu to niewykonany wpis siłowy…` |
| **2c** unknown plan ⇒ cardio | RED (fail 3) | #4, #12, #13 |
| **3a** loose = `scheduleId` null only (round-2 variant) | RED (fail 1) | #14 `trening cardio ze scheduleId wskazującym brakujący wpis…` |
| **3b** loose = entry is not a cardio-template entry | RED (fail 1) | #2 `wykonany wpis usuniętego szablonu…` |
| 3c loose = no entry on the same date | GREEN | (see note) |
| **4a** date gate dropped (round-2 variant) | RED (fail 2) | #10, #15 |
| **4b** date gate reads only `ui.cardio.date` (ignores the default) | RED (fail 2) | #10, #15 |
| **4c** live path `sched.disabled = !plan.ok` (round-2 variant) | RED (fail 1) | #15 |
| **4d** live path does not update the button | RED (fail 1) | #15 |
| **4e** live path checks the name only | RED (fail 1) | #15 |
| **4f** live path checks plan + name, not the date | RED (fail 1) | #15 |

Note on 1b, 1c and 3c. These are extra variants this review tried beyond the closure standard. The probe `<scratch-dir>/p4r3-probe.js` confirms that each changes behaviour on a real repo-built state: a template scheduled weekly; the first entry done from the calendar; the template started from the Cardio tab on the second entry's day; the third entry started a day late.
```
original | 03-03=["sched/cardio/done"] 03-10=["sched/cardio/planned","log/cardio/done"] 03-17=["sched/cardio/done"] 03-18=[]
1b       | 03-03=["sched/cardio/done"] 03-10=["sched/cardio/done","log/cardio/done"] 03-17=["sched/cardio/done"] 03-18=[]
1c       | 03-03=["sched/cardio/done"] 03-10=["sched/cardio/done","log/cardio/done"] 03-17=["sched/cardio/planned"] 03-18=[]
3c       | 03-03=["sched/cardio/done"] 03-10=["sched/cardio/planned","log/cardio/done"] 03-17=["sched/cardio/done"] 03-18=["log/cardio/done"]
```
They are not filed. The clause each one breaks ("done when a `cardioLog` entry has its `scheduleId`", "cardio workouts with no schedule entry are loose") is already pinned by an assertion that fails on a wrong variant (1a/1d, 3a/3b). The termination standard in loop-critic-rules.md stops the hunt at that point. They are recorded here for the owner. A fixture with two entries of the same template, only one of them done, would pin 1b and 1c as well. In the browser the real code shows the correct result: after 4.5 the 20th and 27th entries of the same template stayed `zaplanowany`.

### Manual (performed with playwright-cli 0.1.14, session `feat-cardio-module-p4-r3`, scratch server :3999 on a fresh scratch DB `p4r3.db` (PID 58491, stopped afterwards); today = 2026-10-17)

Setup through the relative API: one template `Tabata <b>&"x"</b>` with intervals `[5,7]` and a total of 24 s (id `f79e42c8…`). The seeded strength plan `Full body (przykład)` is `438bad3e…`.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 4.4 | The calendar form offers cardio templates; adding one to a day (and with weekly repeat for 2 weeks) shows dots and day cards in the cardio colour, whose computed colour differs from both the planned and the done strength dot (D6) | passed | `#sched-form select[name=plan]` lists `Plany siłowe: plan:438bad3e…=Full body (przykład) \| Szablony cardio: cardio:f79e42c8…=Tabata <b>&"x"</b>`. Adding the cardio option to 17 Oct posted `{"cardioTemplateId":"f79e42c8-…","dates":["2026-10-17"]}` (201), giving `2026-10-17=dot cardio` and the card `card row between cardio id=d6c4d8b7 :: Tabata &lt;b&gt;&amp;"x"&lt;/b&gt; <span class="tag cardio">cardio</span>` with `cardio-start{template:f79e42c8…, sched:d6c4d8b7…}` and `sched-del{id:d6c4d8b7…}`. On 20 Oct with `repeat` checked and `weeks`=2 it posted `{"cardioTemplateId":"f79e42c8-…","dates":["2026-10-20","2026-10-27"]}` (201): `2026-10-20=dot cardio`, `2026-10-27=dot cardio`, and the 20th's card reads `card row between cardio :: Tabata <b>&"x"</b> cardio :: zaplanowany :: cardio-start,sched-del`. Computed colours (strength dots from 4.9's entries). **Light:** cardio planned `bg=rgba(0, 0, 0, 0) border=2px solid rgb(147, 51, 234)`; cardio done `bg=rgb(147, 51, 234)`; strength planned `bg=rgb(217, 119, 6)`; strength done `bg=rgb(22, 163, 74)`; cardio card border-left `rgb(147, 51, 234) 5px`; tag `rgb(147, 51, 234)`. **Dark** (`page.emulateMedia({colorScheme:'dark'})`, `dark=true`): cardio planned `border 2px solid rgb(192, 132, 252)` on a transparent bg; cardio done `bg=rgb(192, 132, 252)`; strength planned `bg=rgb(251, 191, 36)`; strength done `bg=rgb(74, 222, 128)`; cardio card border-left `rgb(192, 132, 252) 5px`. Screenshots: `screenshots/p4-r3-4.4-light.png`, `screenshots/p4-r3-4.4-dark.png` |
| 4.5 | Start from a cardio day card runs the template; after the summary is saved the card and the dot show it as done (D6) | passed | `main .card.row.between.cardio [data-action=cardio-start]` on 17 Oct opened `#cardio-runner` titled `Tabata <b>&"x"</b>` with `Przygotuj się 5 s + 7 s · razem 0:24 3`. `trening.cardio.v1` held `{"templateId":"f79e42c8…","scheduleId":"d6c4d8b7…","mode":"interval"}`. After 10 s it read `Interwał 2 z 2 · cykl 1 z 2 Teraz: 7 s 0:06 Następny interwał 5 s Czas aktywny 0:06 z 0:24`, and it ended by itself with `Tryb: interwałowy Czas aktywny: 0:24 Interwały: 5 s + 7 s × 2 cykle`. `cardio-save` posted `{"templateId":"f79e42c8-…","scheduleId":"d6c4d8b7-…",…,"mode":"interval","intervals":[5,7],"totalSec":24,"date":"2026-10-17",…,"activeSec":24}` (201). After `reload`: `2026-10-17=dot cardio done`, and the card `card row between cardio id=d6c4d8b7 :: … cardio :: ✓ wykonany :: [sched-del]` has no Start. The 20th and 27th entries of the same template stay `dot cardio` (planned). Screenshots `p4-r3-4.5-done-light.png`, `p4-r3-4.5-done-dark.png` |
| 4.6 | A free cardio workout saved today appears on today's calendar day in the cardio colour (D5) | passed | `cardio-start-free`, then about 3.5 s later `cardio-end` (confirm accepted) and `cardio-save` posted `{"templateId":null,"scheduleId":null,"name":"Cardio swobodne","mode":"free","date":"2026-10-17",…,"activeSec":4,"note":""}` (201). The 17th then shows `dot cardio done+dot cardio done`, and its second card is `card row between cardio id=51c70352 :: Cardio swobodne cardio :: ✓ wykonany :: []` (no Start, no Usuń). The loose dot is `bg rgb(147, 51, 234)` and the card border-left `rgb(147, 51, 234) 5px` (light). Screenshot `p4-r3-4.6-free.png` |
| 4.7 | Deleting a template that has one done and one future calendar entry removes the future entry and keeps the done one with its name (D7) | passed | Template `f79e42c8` had a done entry on 17 Oct and future entries on 20 and 27 Oct. `[data-action=cardio-template-del]` (confirm accepted) sent `DELETE api/cardio-templates/f79e42c8…` (204), then `GET api/state` (200). Afterwards: `2026-10-17=dot cardio done+dot cardio done \| 2026-10-20=dot done \| 2026-10-27=dot`, so the cardio dots are gone from the 20th and 27th. The 17th card reads `card row between cardio id=d6c4d8b7 :: Tabata <b>&"x"</b> cardio :: ✓ wykonany :: [sched-del]`. Server: `templates 0`, schedule `["d6c4d8b7","2026-10-17",null,null]` plus strength rows only. Screenshot `p4-r3-4.7-after-delete.png` |
| 4.8 | In the builder, "Dodaj do kalendarza" is disabled while the total does not fit in full cycles; with a valid total and a name it saves the template and adds it on the chosen date (D2, D6) | passed | 27 Oct selected in the calendar, then the Cardio tab, intervals 5 and 7 added through the form, total 0:24. `0:24, empty name: date=2026-10-27 add.disabled=true`. `name set: add.disabled=false`. `0:25: add.disabled=true start.disabled=true tpl.disabled=true live=Ten czas nie mieści się w pełnych cyklach (cykl 0:12). Najbliższe pasujące czasy: 0:24 (2 cykle) lub 0:36 (3 cykle).` (`p4-r3-4.8-disabled.png`). `back to 0:24: add.disabled=false`. Live gates through real `input` events: `name = 3 spaces: add.disabled=true` and `date cleared: date= add.disabled=true`. With the date `2026-10-29`, `#cardio-sched-add` sent `POST api/cardio-templates {"name":"Bieg <i>&\"y\"</i>","intervals":[5,7],"totalSec":24}` and then `POST api/schedule {"cardioTemplateId":"41e0706f-…","dates":["2026-10-29"]}` (201). Afterwards the name is `""`, `add.disabled=true`, the date stays `2026-10-29`, and the template h3 innerHTML is `Bieg &lt;i&gt;&amp;"y"&lt;/i&gt;`. The 29th has `dot cardio` and the card `Bieg <i>&"y"</i> cardio :: zaplanowany :: [cardio-start,sched-del]` (`p4-r3-4.8-after.png`). Supplementary, the partial-failure path the comment at `app.js:1050` claims: with `page.route('**/api/schedule')` returning 500 `{"error":"Testowy błąd"}`, the toast read `Szablon zapisano, ale nie dodano go do kalendarza: Testowy błąd`. The template `Częściowy` was listed, the name was cleared, the button disabled, and the server had the template and no 30 Oct entry. |
| 4.9 | Strength regression: scheduling a strength plan and its planned/done display in the calendar are unchanged | passed | The UI posted `{"planId":"438bad3e-…","dates":["2026-10-20"]}` and, weekly ×2, `{"planId":"438bad3e-…","dates":["2026-10-27","2026-11-03"]}`: the same body shape as HEAD's `{ planId: fd.get('plan'), dates }`. `start` on the 20th's strength card opened `#runner` with `trening.run.v1.scheduleId = 8e96932b…`. `set-full`, `run-end` (confirm) and `run-save` posted `api/workouts` `{"planId":"438bad3e-…","planName":"Full body (przykład)","scheduleId":"8e96932b-…",…}` (201). The calendar then shows `2026-10-20=dot cardio+dot done`, with the card `card row between id=8e96932b :: Full body (przykład) :: ✓ wykonany :: [sched-del]`, and `2026-10-27=dot cardio+dot`, with the strength card `Full body (przykład) :: zaplanowany :: [start,sched-del]`. After `plan-del` (confirm), the server has `["8e96932b","2026-10-20",null,null]`. The 20th still renders `dot done` / `Full body (przykład) :: ✓ wykonany :: [sched-del]`, and the 27th's unfinished strength entry is gone (`p4-r3-4.9-after-plan-delete.png`). **HEAD diff** (`<scratch-dir>/p4r3-probe.js`): `git show HEAD:public/app.js` and the current `app.js` rendered `viewCalendar()` on the same repo-built strength-only state (planned, done, renamed plan `Zmieniona <nazwa>`, done entry of the deleted plan `Siła <x> & "q"`, loose `Luźny <i>`, `(usunięty plan)`). Result: `STRENGTH grid all equal=true \| cards all equal=false \| cards equal modulo data-id=true` (HEAD `<div class="card row between">`, current `<div class="card row between" data-id="f17240fa-…">`). |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | N/A (no route, config or command in this slice) |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | CONCERNS (Minor) |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS (Nit) |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A (no dependency change) |

Blockers: 0 · Major: 0 · Minor: 2 · Nit: 1

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Polish "why" comments cover the non-obvious rules: cardio classification after a template is deleted (`public/app.js:105-107`), the sticky builder date (`:701`), the schedule gate (`:703`), the option value format (`:1262`) and the partial-failure re-render (`:1050`). The test file header (`test/calendar-view.test.js:2-4`) explains the `node:vm` harness and the `APP_JS_PATH` override, and `:22` explains the persistent element map.

### D2. Are all relevant types of documentation covered?

**Verdict:** N/A

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no (this slice) | — | no setup or command change |
| CLAUDE.md | no (this slice) | — | "There are no tests" is stale for the whole change (see Observations) |
| ADR | no | — | none exist |
| phpdoc / API | no | — | no route change |
| Query header comments | n/a | — | |
| E2E rules / selectors | n/a | — | |
| Translations | n/a | — | inline Polish strings by convention |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS. The comments, UI strings and test names are correct Polish.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (Phase 4 Changes required) | Implemented in | Status |
| :-- | :-- | :-- |
| `dayItems`: an entry with `cardioTemplateId`, or one closed by a cardio workout, becomes a cardio item named from the workout or the template; `done` via `cardioLog.scheduleId`; loose cardio on its date; strength built as before | `public/app.js:108-130` | met (4.4–4.7, 4.9 + HEAD diff); pinned by tests 1–4 and 11–14 (mutants above) |
| Dots/cards: class `cardio`; planned = outlined, done = filled `--cardio`; tag and border; `cardio-start` with template and schedule id; `Usuń` for scheduled entries; the save sends `scheduleId` | `public/app.js:167,175-185,1029,1094`, `styles.css:123-124,223-224` | met (4.4, 4.5; markup pinned by tests 5–6) |
| Schedule form: optgroups; a cardio option posts `{cardioTemplateId, dates}` with weekly repeat; the form shows when any plan or template exists | `public/app.js:188-203,1258-1267` | met (4.4, 4.9; tests 7–8) |
| Builder: date input defaulting to the selected day; "Dodaj do kalendarza" disabled while not ok or the name is empty; creates and schedules | `public/app.js:697-704,710,755-758,1033-1055,1293-1294` | met (4.8; tests 9, 10, 15) |
| State reloads after a template is deleted | `public/app.js:1061` | met (4.7) |

The Done-when parts this slice's rows tag each have a passing row: D2 builder part (4.8), D5 calendar part (4.6), D6 (4.4, 4.5, 4.8) and D7 calendar part (4.7). Nothing in "## Out of scope" is touched: no notifications, no metrics, no template editing. The strength-side diff is limited to the shared calendar.

### I2. Is it logically correct?

**Verdict:** CONCERNS

The strength paths render identically to HEAD apart from one inert attribute (the HEAD diff in 4.9). The server lets a schedule entry be closed only by a workout of its own kind (`db.js:377-384`), so the `cardioLog`-first classification at `:110-111` is sound. Splitting the option on `kind:rest.join(':')` keeps ids that contain a colon intact.

- **[Minor]** `orphaned-cardio-entry-renders-as-strength`: `public/app.js:110-121`. Unchanged and re-observed this round. Test 13 now pins this rendering as intended. The scenario: a template is deleted while one of its entries is done, so the entry is kept (D7), and the user then deletes that cardio workout in Dziennik. The entry now has `planId:null, cardioTemplateId:null`, and on 17 Oct it rendered `card row between id=d6c4d8b7 :: (usunięty plan) :: zaplanowany :: [sched-del]` with a strength-planned `dot` (`screenshots/p4-r3-orphan.png`). No data is lost. Once both links are gone the row no longer carries its kind, so a fix needs a model or delete-path change outside this slice.
- **[Minor]** `strength-card-markup-data-id`: `public/app.js:175`. Unchanged. The Slice guardrail says "strength calendar behaviour and markup unchanged", but every day card, strength cards included, gains `data-id="${esc(i.id)}"`. The HEAD diff (4.9) shows this is the only strength-card difference. It is inert: no handler or CSS keys on it. Emitting it only on cardio cards would meet the guardrail literally.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS. The code reuses `api`, `esc`, `checkPlan`, `sched-del` and the existing form flow. `cardioSchedDate` and `cardioCanSchedule` are shared by the view and `syncCardioBuilder`. The test harness loads the real `public/cardio-core.js` and `public/app.js` (`test/calendar-view.test.js:45-46`). Its stubs do not hide a gate: the persistent element map starts every element at `disabled:false`, and test 15's first assertion expects `false`, so a do-nothing `syncCardioBuilder` still fails on the next assertion (mutant 4d). The input-event wiring (`app.js:1293-1294`) is outside the harness and was exercised by the 4.8 live-gate walk.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS. The handler disables the button, and the click dispatcher ignores disabled buttons. If scheduling fails after the template is created, the view re-renders before the error is thrown, so the template cannot be saved twice. This review observed it with a routed 500 (4.8, supplementary).

- **[Nit]** `builder-schedule-no-confirmation`: `public/app.js:1053`. Unchanged. After a successful "Dodaj do kalendarza" the only feedback is that the name clears and the template appears in the list (observed in 4.8). Nothing says the entry was added, or on which date.

### I5. Is it performant?

**Verdict:** PASS. Per calendar cell, `dayItems` does the same linear scans as at HEAD, plus one over `cardioLog`. For one user's data that is negligible.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS. Every new interpolation is passed through `esc()`: option values and labels, card `data-id`, `data-template`/`data-sched`, and the date input value. These were walked with `Tabata <b>&"x"</b>` and `Bieg <i>&"y"</i>`. The options, card h3, runner title and template list all showed the names literally (card h3 `Tabata &lt;b&gt;&amp;"x"&lt;/b&gt;`, template h3 `Bieg &lt;i&gt;&amp;"y"&lt;/i&gt;`). The new URLs are relative (`api/cardio-templates`, `api/schedule`).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A. Frontend only; errors go through `showError`. No `console.log` was added.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A. `package.json` and the lockfile are untouched. The test uses only `node:test`, `node:assert`, `node:fs`, `node:path` and `node:vm`.

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |

---

## Architecture — the project's own rules

- "Write all UI text, error messages and code comments in Polish" → meets (new strings, comments and test names are Polish).
- "escape every interpolated value with esc() in the view*() templates" → meets (I6).
- "Wire events through data-action + the actions map and forms through onSubmit; surface errors through showError" → meets (`cardio-template-schedule` is in `actions`; `sched-form` goes through `onSubmit`; the partial-failure toast was observed).
- "API URLs stay relative" → meets.
- "The active strength workout lives only on the client (`trening.run.v1`)…" → meets: untouched, and the 4.9 run used it unchanged.
- "Express is the only npm dependency; tests use the built-in node:test and node:assert" → meets.
- Never-weaken (no skip/todo, no assertion removed) → meets: no existing test file changed, and the new file has no skip/todo.
- Brief "## Out of scope" → meets.
- Brief "## Guardrails" → meets: no server or DB change in this slice.

## Not reviewed

- A real phone: the native date picker and the tap size of the 7 px ring dot. Checked only in headless Chromium at desktop width.
- The Docker image (Node 24) was not built.
- The audible beep and vibration during the 4.5 run (owner-run, Slice details).
- The confirm texts of `cardio-end` and `cardio-template-del` were accepted by a `page.once('dialog')` handler and their wording was not captured this round. They are Phase 3 strings that round 2 quoted.

## Observations outside scope

- `CLAUDE.md` still says "There are no tests, linter or formatter configured", and `README.md`/`CLAUDE.md` do not mention the cardio module (tables, `/api/cardio-*`, `trening.cardio.v1`, `public/cardio-core.js` shared with `db.js`). Worth a doc pass before the change closes.
- `public/app.js:102` `isDone` has been unused since before this change.
- playwright-cli again listed the template DELETE twice (#18/#20, both 204). It also reported a stale "Modal state" after `page.once('dialog')` handlers in `run-code`; `dialog-dismiss` answered `already handled`. These are tool artifacts. The server state confirmed each action once.
- `context/changes/google-store-app/` appeared at 15:57, during this review, so it is not part of this slice. It is untracked and probably comes from another session.
