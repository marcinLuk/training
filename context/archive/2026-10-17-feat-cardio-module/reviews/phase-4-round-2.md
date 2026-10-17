# Phase review — feat-cardio-module · Phase 4: Cardio in the calendar · round 2

- **Scope:** working tree vs `HEAD` (2867e53): `public/app.js`, `public/styles.css`, `test/calendar-view.test.js` (new, untracked); `brief.md` Progress checkboxes 4.1–4.3
- **Files reviewed:** 3 (`+242/-12` lines: app.js +71/-12, styles.css +2/-0, calendar-view.test.js +169). Also read as the contract: `public/cardio-core.js`, the cardio parts of `db.js` and `server.js`
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 4` Progress rows 4.1–4.9 + Slice details "Phase 4"; Done-when D2 (builder part), D5 (calendar part), D6, D7 (calendar part)
- **Reviewed at:** 2026-10-17
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

Since round 1, `public/app.js` and `public/styles.css` are unchanged. The only new file is `test/calendar-view.test.js`.

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | `node --check public/app.js` exits 0 | `timeout 30 node --check public/app.js` | pass (`exit=0`) |
| 4.2 | full suite passes with `# fail 0` | `timeout 180 node --disable-warning=ExperimentalWarning --test` | pass: `# tests 85` / `# pass 85` / `# fail 0`, `exit=0`. That is 75 earlier tests plus the 10 new ones in `calendar-view.test.js`, all named `ok` in the output (e.g. `ok 5 - viewCalendar: zaplanowany wpis cardio ma kartę cardio z przyciskiem Usuń (sched-del)`). |
| 4.3 | the auto-loop.md §2 smoke command exits 0 | the loop-shared-rules smoke command, `<scratch-dir>` substituted, inside `timeout 60 bash -c "…"` | pass (`smoke exit=0`; log: `Trening działa na http://localhost:3999 (baza: …/scratchpad/smoke.db)`) |

Tail of 4.2:
```
1..85
# tests 85
# suites 0
# pass 85
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### Closures (rounds after the first)

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `calendar-clauses-unpinned` | round 1 | **no (partly)** | Mutants were driven through `test/calendar-view.test.js` from a scratch copy (`<scratch-dir>/mutant/`, `public/ server.js db.js package.json test/` copied, `node_modules` symlinked). The copy was proven first: the unmodified copy ran GREEN (10/10), and a canary (`'(usunięty plan)'` → `'(usuniety plan)'`) ran RED. **The four numbered clauses are closed:** every wrong variant of clauses 1–4 goes red (C1–C4c below). **The dayItems part is not closed:** two wrong variants of brief clauses survive (D3, D4), as do the comment-claimed date gate (C5), the live name gate (C6) and the "no schedule entry" loose rule (D7). See I1. |

Mutant table (driver `<scratch-dir>/p4r2-mutants.js`: each mutant is a single-occurrence string replacement in the copy's `public/app.js`, followed by `node --test test/calendar-view.test.js` in the copy):

| mutant | result | failing tests |
| :-- | :-- | :-- |
| baseline (unmodified copy) | GREEN (tests 10, fail 0) | |
| canary: `"(usunięty plan)"` → `"(usuniety plan)"` | RED (fail 1) | dayItems: wpis siłowy z usuniętym planem… |
| C1 no `sched-del` on cardio cards (`i.kind === 'sched' && !i.cardio`) | RED (fail 1) | viewCalendar: zaplanowany wpis cardio ma kartę cardio… |
| C2 form only when plans exist (`db.plans.length ?`) | RED (fail 1) | viewCalendar: formularz dodawania pokazuje się z samymi… |
| C3a date default `today()` | RED (fail 1) | viewCardio: data dodania do kalendarza domyślnie… |
| C3b date ignores the user's choice (`() => ui.selected`) | RED (fail 1) | viewCardio: data dodania… |
| C3c no default (`?? ''`) | RED (fail 2) | viewCardio: data…; viewCardio: "Dodaj do kalendarza"… |
| C4a name not required | RED (fail 1) | viewCardio: "Dodaj do kalendarza" jest wyłączony… |
| C4b name not trimmed | RED (fail 1) | same |
| C4c `plan.ok` not required | RED (fail 1) | same |
| **C5 date not required** (drop `&& !!cardioSchedDate()`, the gate the comment at app.js:703 claims) | **GREEN** | |
| **C6 live sync ignores the name** (`syncCardioBuilder`: `sched.disabled = !plan.ok`) | **GREEN** | |
| D1 template entry is not cardio unless done (`if (cardioLog)`) | RED (fail 2) | dayItems: wpis z szablonem…; viewCalendar: zaplanowany… |
| D2 done entry of a deleted template is not cardio (`if (s.cardioTemplateId)`) | RED (fail 1) | dayItems: wykonany wpis usuniętego szablonu… |
| **D3 done matched by date, not `scheduleId`** (`db.cardioLog.find(c => c.date === s.date)`) | **GREEN** | |
| **D4 `planId` null ⇒ cardio** (`if (s.cardioTemplateId \|\| cardioLog \|\| !s.planId)`) | **GREEN** | |
| D5 loose cardio dropped | RED (fail 2) | dayItems: luźny trening…; viewCalendar: luźny trening… |
| D6 loose cardio ignores its date | RED (fail 1) | dayItems: luźny trening cardio trafia na swoją datę… |
| **D7 loose cardio = `scheduleId` null only** (`!c.scheduleId`) | **GREEN** | |
| D8 cardio name prefers the template over the workout | GREEN (equivalent: templates cannot be edited, and a calendar start uses `t.name`; not a finding) | |
| D9 cardio `done: false` always | RED (fail 1) | dayItems: wykonany wpis usuniętego szablonu… |
| V1 cardio dot without the `cardio` class | GREEN (pinned by Manual 4.4 instead; not a finding) | |
| V2 cardio Start without `data-sched` | RED (fail 1) | viewCalendar: zaplanowany wpis cardio… |
| V3 strength Start rendered on cardio cards | RED (fail 1) | viewCalendar: zaplanowany wpis cardio… |

Each surviving mutant changes behaviour. The probe (`<scratch-dir>/p4r2-probe.js`) loads the real and the mutated `app.js` in `node:vm` and builds a real post-`deletePlan` state through `createRepo(':memory:')`:
```
real schedule after deletePlan: [{"id":"f47dbfbc-…","date":"2031-03-14","planId":null,"cardioTemplateId":null}]
original | real deleted-plan state (from repo) | ["sched/done/Full body (przykład)"]
D4       | real deleted-plan state (from repo) | ["sched/cardio/planned/(usunięty szablon)"]
original | template entry + free cardio same day | ["sched/cardio/planned/Szablon A","log/cardio/done/Cardio swobodne"]
D3       | template entry + free cardio same day | ["sched/cardio/done/Cardio swobodne","log/cardio/done/Cardio swobodne"]
original | done cardio entry deleted client-side (stale scheduleId) | ["log/cardio/done/Szablon A"]
D7       | done cardio entry deleted client-side (stale scheduleId) | []
original | ui.cardio.date='' | <button … id="cardio-sched-add" … disabled>
C5       | ui.cardio.date='' | <button … id="cardio-sched-add" … >
```

### Manual (performed with playwright-cli 0.1.14, session `feat-cardio-module-p4-r2`, scratch server :3999 on a fresh scratch DB `p4r2.db`; today = 2026-10-17)

Setup: through the relative API, one template `Tabata <b>&"x"</b>` with intervals `[5,7]` and a total of 24 s (id `663ea76f…`). The seeded strength plan `Full body (przykład)` is `9a229db3…`.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 4.4 | The calendar form offers cardio templates; adding one to a day (and with weekly repeat for 2 weeks) shows dots and day cards in the cardio colour, whose computed colour differs from both the planned and the done strength dot (D6) | passed | The form's `select[name=plan]` has `Plany siłowe: plan:9a229db3=Full body (przykład)` and `Szablony cardio: cardio:663ea76f=Tabata <b>&"x"</b>`. Adding the cardio option to 17 Oct posted `{"cardioTemplateId":"663ea76f-…","dates":["2026-10-17"]}`. On 20 Oct with `repeat` checked and `weeks`=2 it posted `{"cardioTemplateId":"663ea76f-…","dates":["2026-10-20","2026-10-27"]}` (201 each). Dots: `2026-10-17 <span class="dot cardio">`, `2026-10-20 <span class="dot cardio"></span><span class="dot">` and `2026-10-27 <span class="dot cardio">`. The 20th's card is `card row between cardio`, with `<span class="tag cardio">cardio</span>`, `cardio-start{template:663ea76f…, sched:89b95f19…}` and `sched-del{id:89b95f19…}`. **Light:** cardio planned `bg=rgba(0,0,0,0) border=2px solid rgb(147,51,234)`; cardio done `bg=rgb(147,51,234)`; strength planned `bg=rgb(217,119,6)`; strength done `bg=rgb(22,163,74)`; cardio card border-left `rgb(147,51,234) 5px`. **Dark** (`page.emulateMedia({colorScheme:'dark'})`, `matchMedia` dark=true): cardio planned `border rgb(192,132,252)`, transparent bg; cardio done `bg=rgb(192,132,252)`; strength planned `bg=rgb(251,191,36)`; strength done `bg=rgb(74,222,128)`. Screenshots: `screenshots/p4-r2-4.4-light.png`, `screenshots/p4-r2-4.4-dark.png` |
| 4.5 | Start from a cardio day card runs the template; after the summary is saved the card and the dot show it as done (D6) | passed | `main .card.cardio [data-action=cardio-start]` on 17 Oct opened `#cardio-runner` (hidden=false), titled `Tabata <b>&"x"</b>`, showing `Przygotuj się 5 s + 7 s · razem 0:24`. `trening.cardio.v1` held `templateId:"663ea76f…", scheduleId:"fb79bb72…"`. Mid-run it read `Interwał 2 z 2 · cykl 1 z 2 \| Teraz: 7 s`, and it ended by itself with `Czas aktywny: 0:24 Interwały: 5 s + 7 s × 2 cykle`. The POST `api/cardio-workouts` body had `"scheduleId":"fb79bb72-…","activeSec":24` (201). After `reload`, the 17th's dots are `dot cardio done` ×2 and the card `card row between cardio \| id=fb79bb72` reads `✓ wykonany`, with actions `[sched-del]` only (no Start). Screenshots `p4-r2-4.5-done-light.png`, `p4-r2-4.5-done-dark.png` |
| 4.6 | A free cardio workout saved today appears on today's calendar day in the cardio colour (D5) | passed | `cardio-start-free` showed `0:04` after 3 s, then `cardio-end` (confirm `Zakończyć trening cardio teraz?`) and `cardio-save`. The POST body was `{"templateId":null,"scheduleId":null,"name":"Cardio swobodne","mode":"free","date":"2026-10-17",…,"activeSec":6}` (201). The 17th gained `<span class="dot cardio done">` (bg `rgb(147,51,234)`) and the card `card row between cardio \| id=a65a63ce :: Cardio swobodne cardio :: ✓ wykonany :: []`. The planned template entry on the same day stayed `zaplanowany` with `[cardio-start,sched-del]`. Screenshot `p4-r2-4.6-free.png` |
| 4.7 | Deleting a template that has one done and one future calendar entry removes the future entry and keeps the done one with its name (D7) | passed | Template `663ea76f` had a done entry on 17 Oct and future entries on 20 and 27 Oct. `cardio-template-del` raised the confirm `Usunąć szablon „Tabata <b>&"x"</b>”? Niewykonane treningi z tym szablonem znikną też z kalendarza.`, then DELETE (204) and `GET api/state` (200). Dots afterwards: `2026-10-17 dot cardio done ×2 \| 2026-10-20 dot done \| 2026-10-27 dot`, so the cardio dots are gone from the 20th and 27th. The 17th card `id=fb79bb72 :: Tabata <b>&"x"</b> cardio :: ✓ wykonany :: [sched-del]`. Server schedule: `{"id":"fb79bb72…","date":"2026-10-17","planId":null,"cardioTemplateId":null}`, with no 663ea76f entries left. Screenshot `p4-r2-4.7-after-delete.png` |
| 4.8 | In the builder, "Dodaj do kalendarza" is disabled while the total does not fit in full cycles; with a valid total and a name it saves the template and adds it on the chosen date (D2, D6) | passed | 27 Oct was selected in the calendar, and the builder showed `date=2026-10-27`. Intervals 5 and 7 at 0:24 with an empty name gave `add.disabled=true`. With the name `Bieg <i>&"y"</i>`: `add.disabled=false`. At 0:25: `add.disabled=true` and `tpl.disabled=true`, with live text `Ten czas nie mieści się w pełnych cyklach (cykl 0:12). Najbliższe pasujące czasy: 0:24 (2 cykle) lub 0:36 (3 cykle).` (`p4-r2-4.8-disabled.png`). Back at 0:24 the button is enabled again. Supplementary live gates: a name of `"   "` gives `add.disabled=true`, and a cleared date gives `date= \| add.disabled=true`. With the date `2026-10-29`, clicking `#cardio-sched-add` sent `POST api/cardio-templates {"name":"Bieg <i>&\"y\"</i>","intervals":[5,7],"totalSec":24}` (201), then `POST api/schedule {"cardioTemplateId":"a93e72b0-…","dates":["2026-10-29"]}` (201). Afterwards the name was `""` and the button disabled, and the template h3 reads `Bieg &lt;i&gt;&amp;"y"&lt;/i&gt;`. The 29th has `dot cardio` and a card with `[cardio-start,sched-del]` (`p4-r2-4.8-after.png`). Supplementary: `sched-del` on that card sent `DELETE api/schedule/57625c41…` (204) and the day now shows `Brak treningów tego dnia.` |
| 4.9 | Strength regression: scheduling a strength plan and its planned/done display in the calendar are unchanged | passed | The UI posted `{"planId":"9a229db3-…","dates":["2026-10-20"]}`, and with weekly ×2 `{"planId":"9a229db3-…","dates":["2026-10-27","2026-11-03"]}`, the same body shape as HEAD. From the 20th's strength card, `start` opened `#runner` with `Full body (przykład)` (`trening.run.v1` `scheduleId:"b914cc82…"`). `set-full` gave `Odpoczynek` and rest `2:00`. `run-end` (confirm) and `run-save` posted `api/workouts` (201). The 20th then shows `dot done` and the card `Full body (przykład) :: ✓ wykonany :: [sched-del]`, and the 27th shows a plain `dot` (`zaplanowany`, `[start,sched-del]`). After deleting the plan (`plan-del`, confirm), the real state has `planId:null` on the done entry, and the 20th still renders `dot done` / `card row between :: Full body (przykład) :: ✓ wykonany` (`p4-r2-4.9-before-plan-delete.png`, `p4-r2-4.9-after-plan-delete.png`). **HEAD diff** (`<scratch-dir>/p4r2-headcmp.js`): `git show HEAD:public/app.js` and the current `app.js` both rendered `viewCalendar()` on the same repo-built strength-only state (planned, done, renamed plan `Zmieniona <nazwa>`, done entry of the deleted plan `Siła <x> & "q"`, loose `Luźny <i>`, `(usunięty plan)`). The dots grid was equal for every day, and the cards were equal once the card's `data-id` attribute was ignored (`ALL STRENGTH GRID+CARDS EQUAL (modulo card data-id): true`). |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | N/A (no route, config or command in this slice) |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | FAIL (Major: clauses still unpinned) |
| I2 | Is it logically correct? | CONCERNS (Minor) |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS (Nit) |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A (no dependency change) |

Blockers: 0 · Major: 1 · Minor: 2 · Nit: 1

Findings going back to a builder: `calendar-clauses-unpinned`

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

The rules that are not obvious from the code carry Polish "why" comments: cardio classification after a template is deleted (`public/app.js:105-107`), the sticky builder date (`:701`), the schedule gate (`:703`), the option value format (`:1262`) and the partial-failure re-render (`:1050`). The test file header (`test/calendar-view.test.js:2-4`) explains the `node:vm` harness and the `APP_JS_PATH` override.

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

**Verdict:** FAIL

| Requirement (Phase 4 Changes required) | Implemented in | Status |
| :-- | :-- | :-- |
| `dayItems`: an entry with `cardioTemplateId`, or one closed by a cardio workout, becomes a cardio item named from the workout or the template; `done` via `cardioLog.scheduleId`; loose cardio on its date; strength built as before | `public/app.js:108-130` | met (4.4–4.7, 4.9 + HEAD diff), but partly unpinned (see finding) |
| Dots/cards: class `cardio`; planned = outlined, done = filled `--cardio`; tag and border; `cardio-start` with template and schedule id; `Usuń` for scheduled entries; the save sends `scheduleId` | `public/app.js:167,175-185,1094`, `styles.css:123-124,223-224` | met (4.4, 4.5; `Usuń` pinned by test 5) |
| Schedule form: optgroups; a cardio option posts `{cardioTemplateId, dates}` with weekly repeat; the form shows when any plan or template exists | `public/app.js:188-203,1258-1267` | met (4.4, 4.9; templates-only form pinned by test 7) |
| Builder: date input defaulting to the selected day; "Dodaj do kalendarza" disabled while not ok or the name is empty; creates and schedules | `public/app.js:697-704,710,755-758,1033-1055,1293-1294` | met (4.8; default pinned by test 9, gates on render pinned by test 10) |
| State reloads after a template is deleted | `public/app.js:1061` | met (4.7) |

- **[Major]** `calendar-clauses-unpinned` (round 1, still open in part). Round 1's four numbered clauses are now pinned: every wrong variant of them goes red (table above). The `dayItems` classification that round 1 named as pinnable is still not fully pinned. These wrong variants pass all 85 tests and change the rendered result (probe above):
  1. **"`done` when a `cardioLog` entry has its `scheduleId`"** (Slice details), at `public/app.js:110`. Replacing the lookup with `db.cardioLog.find(c => c.date === s.date)` stays green. The only done fixture (`test/calendar-view.test.js:78-89`) puts the workout on the same date as the entry, so matching by date and matching by id give the same answer there. **Fails when:** a planned template entry and a free cardio workout share a day. The entry then shows `✓ wykonany`, renamed `Cardio swobodne`, and loses its Start button. **Fix:** add a case with a planned template entry plus a loose cardio workout on the same date, and assert the entry is `done:false`, named after the template, and that the loose item is listed separately.
  2. **"strength entry with a deleted plan must render as at HEAD"**: the case at `test/calendar-view.test.js:102-112` is named `wpis siłowy z usuniętym planem`, but it feeds `planId: 'gone'`. `deletePlan` never produces that state. It deletes unfinished entries and nulls `plan_id` on the done ones. Probe on `createRepo(':memory:')`: `{"planId":null,"cardioTemplateId":null}` plus a strength workout with that `scheduleId`. The wrong variant `if (s.cardioTemplateId || cardioLog || !s.planId)` at `public/app.js:111` stays green. A cardio entry also has `planId: null`, which makes this the most natural wrong "is it cardio?" test. **Fails when:** a plan with a done calendar entry is deleted. The entry then renders as `cardio / zaplanowany / (usunięty szablon)` instead of `Full body (przykład) / ✓ wykonany` (observed correct in the browser today: `p4-r2-4.9-after-plan-delete.png`). **Fix:** add a case with `schedule: [{id:'s3', planId:null, cardioTemplateId:null}]` and `log: [{id:'w1', scheduleId:'s3', planName:'Stary plan', date, …}]`, and assert `!i.cardio`, `done:true`, `name:'Stary plan'`. A `planId:null` entry without a log should still give `(usunięty plan)`, non-cardio.
  3. **"cardio workouts with no schedule entry are loose cardio items"** (Slice details), at `public/app.js:127`. Replacing the filter with `!c.scheduleId` stays green: no fixture has a workout whose `scheduleId` points at an entry missing from `db.schedule`. **Fails when:** the user presses `Usuń` on a done cardio calendar entry. `sched-del` (`:955-958`) drops the entry but `db.cardioLog` keeps the stale `scheduleId`, so the workout disappears from the calendar until the next state reload. **Fix:** add a case with `schedule: []` and `cardioLog: [{…, scheduleId:'s1'}]`, and assert one loose cardio item.
  4. **The gates the code itself claims** (`public/app.js:703`: "wymaga planu mieszczącego się w cyklach, nazwy i daty"). The date gate can be dropped (`plan.ok && !!ui.cardio.name.trim()`) and every test stays green. With an empty date the button then enables, and the click saves the template but fails to schedule it (`Nieprawidłowa data`). The live path `syncCardioBuilder` (`:697-698`) can also be replaced with `sched.disabled = !plan.ok` and stay green. Clearing a typed name then leaves the button enabled. **Fix:** in test 10, add `ui.cardio.date = ''` → `disabled`. For the live path, give the harness a `document.querySelector` that returns a persistent element per selector, call `syncCardioBuilder()` after changing `ui.cardio.name`, and assert `#cardio-sched-add.disabled`.

  The code behaves correctly today in all four cases: this review observed them in the browser and in the probe. The finding is that a regression in any of them ships green.

### I2. Is it logically correct?

**Verdict:** CONCERNS

The strength paths are identical to HEAD apart from one inert attribute (4.9 HEAD diff over five strength states). The server guarantees that a schedule entry is closed only by a workout of its own kind (`db.js:377-384`), which makes the `cardioLog`-first classification at `:110-111` sound. The option split `kind:rest.join(':')` keeps colon-containing ids intact.

- **[Minor]** `orphaned-cardio-entry-renders-as-strength`: `public/app.js:110-121`. Unchanged since round 1 and re-observed. A template is deleted while one of its entries is done (the entry is kept, as D7 requires), and the user then deletes that cardio workout in Dziennik. The entry now has `planId:null, cardioTemplateId:null` and falls into the strength branch: on 17 Oct, after `cardio-log-del`, it rendered `card row between :: (usunięty plan) :: zaplanowany :: [sched-del]` with a strength-planned `<span class="dot">` (`screenshots/p4-r2-orphan.png`). No data is lost. The row no longer carries its kind once both links are gone, so a fix needs a model or delete-path change outside this slice.
- **[Minor]** `strength-card-markup-data-id`: `public/app.js:175`. Unchanged since round 1. The Slice guardrail says "strength calendar behaviour and markup unchanged", yet every day card, strength cards included, gains `data-id="${esc(i.id)}"`. The HEAD diff shows it is the only strength-card difference. It is inert: no handler or CSS keys on it. Adding it only for cardio cards would meet the guardrail literally.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS. The code reuses `api`, `esc`, `checkPlan`, `sched-del` and the existing form flow. `cardioSchedDate`/`cardioCanSchedule` are shared by the view and `syncCardioBuilder`. The test harness loads the real `public/cardio-core.js` and `public/app.js` (`test/calendar-view.test.js:44-45`) with no copy of the code under test. The `APP_JS_PATH` override defaults to the real file.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS. The handler disables the button, and the click dispatcher ignores disabled buttons. If scheduling fails after the template is created, the view re-renders before the error is thrown, so the template cannot be saved twice (round 1 observed both; the code is unchanged).

- **[Nit]** `builder-schedule-no-confirmation`: `public/app.js:1053`. Unchanged since round 1. After a successful "Dodaj do kalendarza" the only feedback is the name clearing and the template appearing in the list (observed in 4.8). Nothing says the entry was added, or on which date.

### I5. Is it performant?

**Verdict:** PASS. `dayItems` does the same per-cell linear scans as HEAD, now also over `cardioLog`. That is negligible for one user's data.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS. Every new interpolation is `esc()`'d: option values and labels, card `data-id`, `data-template`/`data-sched`, the date input value. These were walked with `Tabata <b>&"x"</b>` and `Bieg <i>&"y"</i>`. The options, card h3, runner title, template list and confirm text all showed them literally (e.g. h3 innerHTML `Bieg &lt;i&gt;&amp;"y"&lt;/i&gt;`). The new URLs are relative (`api/cardio-templates`, `api/schedule`).

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
- "Wire events through data-action + the actions map and forms through onSubmit; surface errors through showError" → meets (`cardio-template-schedule` is in `actions`; `sched-form` goes through `onSubmit`).
- "API URLs stay relative" → meets.
- "The active strength workout lives only on the client (`trening.run.v1`)…" → meets (untouched; 4.9 run used it unchanged).
- "Express is the only npm dependency; tests use the built-in node:test and node:assert" → meets.
- Never-weaken (no skip/todo, no assertion removed) → meets: no existing test file changed.
- Brief "## Out of scope" → meets: no notifications, no metrics, no template editing; the strength diff is limited to the shared calendar.
- Brief "## Guardrails" → meets: no server or DB change in this slice.

## Not reviewed

- A real phone: the date input picker and the tap size of the 7 px ring dot. Checked only in headless Chromium at desktop width.
- The Docker image (Node 24) was not built.
- The audible beep and vibration from the 4.5 run are not observable by the driver (owner-run, Slice details).

## Observations outside scope

- `CLAUDE.md` still says "There are no tests, linter or formatter configured". The change has added five test files and `node --test`. `README.md`/`CLAUDE.md` do not mention the cardio module (tables, `/api/cardio-*`, `trening.cardio.v1`, `public/cardio-core.js` shared with `db.js`). Worth a doc pass before the change closes.
- `public/app.js:102` `isDone` has been unused since before this change.
- playwright-cli again listed the template DELETE twice (#22/#24, both 204). This is the same tool duplicate round 1 noted: the server answers 404 to a second delete of the same id.
