# Phase review — feat-cardio-module · Phase 4: Cardio in the calendar · round 1

- **Scope:** working tree vs `HEAD` (2867e53): `public/app.js`, `public/styles.css`; `brief.md` Progress checkboxes 4.1–4.3
- **Files reviewed:** 2 (`+73/-12` lines). Also read as the contract: `public/cardio-core.js`, the cardio parts of `db.js` and `server.js`
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 4` Progress rows 4.1–4.9 + Slice details "Phase 4"; Done-when D2 (builder part), D5 (calendar part), D6, D7 (calendar part)
- **Reviewed at:** 2026-10-17
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | `node --check public/app.js` exits 0 | `timeout 30 node --check public/app.js` | pass (`exit=0`) |
| 4.2 | full suite passes with `# fail 0` | `timeout 180 node --disable-warning=ExperimentalWarning --test` | pass (`# tests 75` / `# pass 75` / `# fail 0`, `exit=0`). The count matches the 75 tests from Phases 1–3. This slice added no tests. |
| 4.3 | the auto-loop.md §2 smoke command exits 0 | the smoke command from loop-shared-rules.md, with `<scratch-dir>` substituted, wrapped in `timeout 60 bash -c "…"` | pass (`exit=0`; log: `Trening działa na http://localhost:3999 (baza: …/scratchpad/smoke.db)`) |

Tail of 4.2:
```
1..75
# tests 75
# suites 0
# pass 75
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### Manual (performed with playwright-cli 0.1.14, session `feat-cardio-module-p4-r1`, scratch server :3999 on a fresh scratch DB)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 4.4 | The calendar form offers cardio templates; adding one to a day (and with weekly repeat for 2 weeks) shows dots and day cards in the cardio colour, whose computed colour differs from both the planned and the done strength dot (D6) | passed | The `#sched-form select[name=plan]` has `optgroup "Plany siłowe"` (`plan:3e8d…`) and `optgroup "Szablony cardio"` (`cardio:920b…` with text `Interwał <b>&"x"</b>`, rendered literally). Picking the cardio option, ticking `repeat` and setting weeks=2 posted `{"cardioTemplateId":"920b…","dates":["2026-10-17","2026-10-24"]}` (201). Dots: 17th `<span class="dot cardio"></span><span class="dot"></span>`, 24th `<span class="dot cardio"></span>`. The day card has class `card row between cardio`, `<span class="tag cardio">cardio</span>`, buttons `cardio-start` (data-template=920b…, data-sched=72cb…) and `sched-del`. **Light:** planned cardio dot bg `rgba(0,0,0,0)` with border `rgb(147,51,234) 2px solid`; strength planned bg `rgb(217,119,6)`; strength done bg `rgb(22,163,74)`; cardio card border-left `rgb(147,51,234) 5px` vs strength `rgb(214,220,227) 1px`. **Dark** (`emulateMedia colorScheme:dark`, `matchMedia` true): planned cardio border `rgb(192,132,252)`; strength planned `rgb(251,191,36)`; strength done `rgb(74,222,128)`. Screenshots: `screenshots/p4-r1-4.4-light.png`, `screenshots/p4-r1-4.4-dark.png` |
| 4.5 | Start from a cardio day card runs the template; after the summary is saved the card and the dot show it as done (D6) | passed | `main .card.cardio [data-action=cardio-start]` opened `#cardio-runner` titled `Interwał <b>&"x"</b>`. `trening.cardio.v1` held `scheduleId:"72cb…"` and `templateId:"920b…"`. The summary showed `Czas aktywny: 0:24 · Interwały: 5 s + 7 s × 2 cykle`. POST `api/cardio-workouts` body had `"scheduleId":"72cbbe6e-…"` (201). After reload, the 17th has the dot `dot cardio done` (bg `rgb(147,51,234)` light / `rgb(192,132,252)` dark), and the card shows `tag ok: ✓ wykonany` with only `sched-del` (no Start). Screenshots: `p4-r1-4.5-done-light.png`, `p4-r1-4.5-done-dark.png` |
| 4.6 | A free cardio workout saved today appears on today's calendar day in the cardio colour (D5) | passed | `cardio-start-free`, then ran to `0:03`, then `cardio-end` (confirm) and `cardio-save`. The state shows `{"name":"Cardio swobodne","mode":"free","date":"2026-10-17","scheduleId":null}`. The 17th gained a third dot `dot cardio done` (bg `rgb(147,51,234)`), and the card `card row between cardio`, `Cardio swobodne cardio`, `✓ wykonany` has no actions (loose item). Screenshot `p4-r1-4.6-free.png` |
| 4.7 | Deleting a template that has one done and one future calendar entry removes the future entry and keeps the done one with its name (D7) | passed | Template 920b… had a done entry (17th) and future entries (24th, 29th). Clicking `cardio-template-del` brought up the confirm `Usunąć szablon „Interwał <b>&"x"</b>”? Niewykonane treningi…`, then DELETE (204) and GET `api/state`. Afterwards the 24th has no dots and the 29th's 920b entry is gone. The 17th keeps `card row between cardio`, `Interwał <b>&"x"</b> cardio`, `✓ wykonany`, and the server returns it as `{"id":"72cb…","planId":null,"cardioTemplateId":null}`. Screenshot `p4-r1-4.7-after-delete.png` |
| 4.8 | In the builder, "Dodaj do kalendarza" is disabled while the total does not fit in full cycles; with a valid total and a name it saves the template and adds it on the chosen date (D2, D6) | passed | Intervals 5 s + 7 s. At 0:25 with the name kept, `#cardio-sched-add.disabled === true` and the live text reads `Ten czas nie mieści się w pełnych cyklach (cykl 0:12). Najbliższe pasujące czasy: 0:24 (2 cykle) lub 0:36 (3 cykle).` At 0:24 with a name the button is enabled. With date `2026-10-29`, clicking the button creates the template (listed, h3 innerHTML `Interwał &lt;b&gt;&amp;"x"&lt;/b&gt;`) and `schedule` gains `{"date":"2026-10-29","cardioTemplateId":"920b…"}`. The name clears and the button disables again. Screenshots `p4-r1-4.8-disabled.png`, `p4-r1-4.8-after.png` |
| 4.9 | Strength regression: scheduling a strength plan and its planned/done display in the calendar are unchanged | passed | The UI posted `{"planId":"3e8d…","dates":["2026-10-17"]}`, and with weekly ×2 `{"planId":"3e8d…","dates":["2026-10-18","2026-10-25"]}`, the same body shape as HEAD. A strength run started from the 16th card and was saved, giving the 16th `dot done`. **HEAD comparison:** the HEAD `public/` was served on :3998 and the same strength-only state (plan named `Siła <x> & "q"`, a planned entry, a done entry, an entry with a deleted plan, a loose log `Luźny <i>`) was injected into both builds. The dots of every day were byte-identical (`dots equal: true`). All 3 day cards were identical apart from the added `data-id` attribute. The form differs only by the `<optgroup label="Plany siłowe">` wrapper and the `plan:` value prefix. Screenshots `p4-r1-4.9-head.png`, `p4-r1-4.9-current.png` |

Supplementary observations (clauses no row pins; see `calendar-clauses-unpinned`):
- Builder date default: after selecting 2026-10-22 in the calendar, `#cardio-sched-date.value === "2026-10-22"`.
- Name-empty gate: at 0:24 with an empty name, and with a name of only spaces, `#cardio-sched-add.disabled === true`.
- `Usuń` on a scheduled cardio entry (29th, "Dbl"): the card offered `cardio-start`, `sched-del`. Clicking `sched-del` emptied the day, and the entry is gone from the server.
- Form with templates only: after `DELETE api/plans/…`, `#sched-form` is present with only `Szablony cardio: cardio:ce45…,cardio:6d93…`. With no plans and no templates the empty card reads `Najpierw utwórz plan w zakładce Plany lub szablon w zakładce Cardio.`
- Double-click (`playwright-cli dblclick #cardio-sched-add`) created exactly one template and one entry.
- Partial failure (`route **/api/schedule --status 500`): toast `Szablon zapisano, ale nie dodano go do kalendarza: awaria testowa`. The template is listed, the name is cleared and the button is disabled, so the template cannot be saved twice.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | N/A (this slice adds no route, config or command) |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | FAIL (Major: clauses not pinned by any row or test) |
| I2 | Is it logically correct? | CONCERNS (Minor) |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
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

The non-obvious rules have Polish "why" comments: how a cardio entry is classified after its template is gone (`public/app.js:105-107`), the sticky builder date (`:701`), the schedule gate (`:703`), the option value format (`:1262`) and the partial-failure re-render (`:1050`).

### D2. Are all relevant types of documentation covered?

**Verdict:** N/A

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no (this slice) | — | no setup, config or command change |
| CLAUDE.md | no (this slice) | — | the frontend conventions are unchanged; for the whole change, see "Observations outside scope" |
| ADR | no | — | none exist |
| phpdoc / API | no | — | no route change in this slice |
| Query header comments | n/a | — | |
| E2E rules / selectors | n/a | — | |
| Translations | n/a | — | UI strings are inline Polish, as the project convention says |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS. The comments and UI strings are correct Polish.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** FAIL

| Requirement (Phase 4 Changes required) | Implemented in | Status |
| :-- | :-- | :-- |
| `dayItems`: an entry with `cardioTemplateId`, or one closed by a cardio workout, is a cardio item named from the workout or the template; `done` via `cardioLog.scheduleId`; loose cardio workouts on their date; strength built as before | `public/app.js:108-130` | met (4.4–4.7, 4.9 HEAD diff) |
| Dots/cards: class `cardio`; planned = outlined, done = filled `--cardio`; tag and border; `cardio-start` with template and schedule id; `Usuń` for scheduled entries; the save sends `scheduleId` | `public/app.js:167,174-186`, `styles.css:123-124`, `:223-224`, `app.js:1029,1094` | met (`Usuń` pinned only by this review's walk) |
| Schedule form: optgroups; a cardio option posts `{cardioTemplateId, dates}` with weekly repeat; the form shows when any plan or template exists | `public/app.js:188-203,1258-1267` | met (the templates-only visibility is pinned only by this review's walk) |
| Builder: date input defaulting to the selected day; "Dodaj do kalendarza" disabled while not ok or the name is empty; creates and schedules | `public/app.js:697-704,710,755-758,1033-1055,1293-1294` | met (the default and the name gate are pinned only by this review's walk) |
| State reloads after a template is deleted | `public/app.js:1061` (from Phase 3) | met (4.7) |

- **[Major]** `calendar-clauses-unpinned`: four behavioural clauses in this slice's Slice details are not pinned by any `node:test` assertion or any Manual row (4.4–4.9). A later regression in any of them would ship green:
  1. "Usuń for scheduled ones": the `sched-del` button on a cardio schedule card (`public/app.js:184`).
  2. "the form shows when any plan or template exists": `#sched-form` renders with templates and no plans (`public/app.js:192`).
  3. "a date input (default: the selected calendar day)": `cardioSchedDate()` falls back to `ui.selected` (`public/app.js:702`).
  4. "disabled while … the name is empty": `cardioCanSchedule` requires `ui.cardio.name.trim()` (`public/app.js:704`). Row 4.8 pins only the `checkPlan` half.

  All four behave correctly today: this review observed each one (see "Supplementary observations"). **Fix:** add a `node:test` (for example `test/calendar-view.test.js`) that loads `public/cardio-core.js` and `public/app.js` into a `node:vm` context with minimal stubs (`document.querySelector`/`querySelectorAll`/`addEventListener`, `localStorage`, `fetch` returning a pending promise, `setInterval`, `navigator`). It then sets `db`/`ui` and asserts:
  - `viewCalendar()` contains `data-action="sched-del"` inside a `card … cardio` for a cardio entry, and contains `id="sched-form"` when `plans: []` and `cardioTemplates` has one entry;
  - `viewCardio()` renders `#cardio-sched-date` with `value="<ui.selected>"` and `#cardio-sched-add` with `disabled` when `ui.cardio.name` is `''` or `'  '` while the plan is ok.

  The same harness can pin the `dayItems` classification: a template entry, a done entry of a deleted template, a loose cardio workout, and a strength entry with a deleted plan. Alternatively, the orchestrator carries these four checks forward as manual items.

### I2. Is it logically correct?

**Verdict:** CONCERNS

The strength paths are byte-identical to HEAD apart from one inert attribute (4.9 diff). The option split `kind:rest.join(':')` keeps an id intact even if it contains a colon. A loose cardio workout has `scheduleId` null, or points to a deleted entry, and lands on its own date, the same as a strength workout. The `.dot.cardio.done` selector (0,3,0) beats `.dot.done` and `.dot.cardio` as intended. Computed colours confirm this in both themes.

- **[Minor]** `orphaned-cardio-entry-renders-as-strength`: `public/app.js:110-121`. A schedule entry whose template was deleted (so `planId` and `cardioTemplateId` are both null) is recognised as cardio only through its linked `cardioLog` row. **Fails when:** a template is deleted while one of its entries is done (the entry is kept, as D7 requires), and the user then deletes that cardio workout in Dziennik. The entry then falls into the strength branch and shows as `(usunięty plan)` · `zaplanowany` with a strength-planned (`--warn`) dot. Observed: the 17th card changed to `card row between | (usunięty plan) | zaplanowany | 72cbbe6e…` with dot `<span class="dot"></span>` (`screenshots/p4-r1-orphan.png`). No data is lost, `Usuń` still removes the entry, and no Start is offered. The schedule row carries no kind once the template is gone (Phase 2 model), so the frontend cannot do better without a schema or delete-path change.
- **[Minor]** `strength-card-markup-data-id`: `public/app.js:175`. The Slice guardrail says "strength calendar behaviour and markup unchanged", but every day card, strength included, now carries `data-id="${esc(i.id)}"`. The attribute is inert: no CSS or handler keys on it, the card has no `data-action`, and `closest('[data-action]')` is unaffected. The HEAD-vs-current render of the same strength state differs only by this attribute (4.9). Adding it only for cardio cards would satisfy the guardrail literally.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS. The change reuses `api`, `esc`, `checkPlan`, `sched-del` and the existing form flow. `cardioSchedDate`/`cardioCanSchedule` are two small helpers shared by the view and `syncCardioBuilder`.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

The handler disables the button and the click dispatcher ignores disabled buttons, so a real double-click created one template (observed). If scheduling fails after the template was created, the handler re-renders before it throws. The template is listed, the name is cleared (so it cannot be duplicated by a retry) and the Polish toast names both outcomes (observed). A template POST failure keeps the name and re-enables the button.

- **[Nit]** `builder-schedule-no-confirmation`: `public/app.js:1053`. After a successful "Dodaj do kalendarza" the user stays on the Cardio tab. The only feedback is the template appearing in the list and the name clearing; nothing says the calendar entry was added or on which date.

### I5. Is it performant?

**Verdict:** PASS. `dayItems` keeps HEAD's shape: per calendar cell, it filters schedule by date and scans the cardio log for the day's entries. For one user's data (thousands of rows) that is about 42 × (S + L + C) cheap comparisons per render, the same order as before.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS. Every new interpolation goes through `esc()`: the option values and labels, the card `data-id`, `data-template`/`data-sched`, and the date input value. Walked with `Interwał <b>&"x"</b>`: the options, card h3 (`Interwał &lt;b&gt;&amp;"x"&lt;/b&gt;`), runner title and confirm text all show it literally. The `sched-del` `data-id="${i.id}"` line is unchanged HEAD code; the ids are server UUIDs or `[\w-]{1,64}`. The new URLs are relative (`api/cardio-templates`, `api/schedule`).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A. These are frontend-only changes; errors surface through `showError`. No `console.log` is left behind.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A. `package.json` and the lockfile are untouched.

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |

---

## Architecture — the project's own rules

- "Write all UI text, error messages and code comments in Polish" → meets: `Plany siłowe`, `Szablony cardio`, `Data w kalendarzu`, `Dodaj do kalendarza`, `(usunięty szablon)`, `Podaj nazwę szablonu i datę`, and Polish comments.
- "escape every interpolated value with esc() in the view*() templates" → meets for all new interpolations (I6).
- "Wire events through data-action + the actions map and forms through onSubmit; surface errors through showError" → meets: `cardio-template-schedule` is in `actions`, `sched-form` is handled in `onSubmit`, and errors are thrown to `showError`.
- "API URLs stay relative" → meets.
- "The active strength workout lives only on the client (`trening.run.v1`)…" → meets: not touched by this slice.
- Brief "## Out of scope" (no system notifications, no strength changes beyond the shared calendar, no metrics, no template editing) → meets: the strength diff is limited to the shared calendar.
- Brief "## Guardrails" (existing data untouched; project rules) → meets: no server or DB change in this slice.

## Not reviewed

- Behaviour on a real phone: the date input UI and touch sizes of the 7 px ring dot. Checked only in headless Chromium at desktop width.
- The Docker image (Node 24): not built (no step for it in this slice).

## Observations outside scope

- `README.md` and `CLAUDE.md` do not mention the cardio module (tables, `/api/cardio-*` routes, `trening.cardio.v1`, `cardio-core.js` shared by browser and server). Phases 2–3 introduced these; worth a doc pass before the change closes.
- `public/app.js:102` `isDone` has been unused since before this change.
- When the playwright-cli request list runs, it shows the template DELETE twice (#23/#25, same response `date` and `etag`). This is a tool duplicate, not a second request: the server would answer 404 to a second delete.
