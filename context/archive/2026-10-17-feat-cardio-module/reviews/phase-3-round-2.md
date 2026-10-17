# Phase review — feat-cardio-module · Phase 3: Cardio tab, runner and journal · round 2

- **Scope:** working tree on top of `525b781` (`git status --porcelain`): `M public/app.js`, `M public/cardio-core.js`, `M public/index.html`, `M public/styles.css`, `M test/cardio-core.test.js`; `brief.md` Progress checkboxes 3.1–3.3 (diff checked: only those three `[ ]`→`[x]`, plus the orchestrator's SHA suffixes on 2.1–2.5). Not this slice: `.dockerignore`, `.env.example`, `.gitignore`, `documentation/`, `workbench.md`, `.loop-baseline`, `reviews/` (earlier reports).
- **Files reviewed:** 5 (`+566/-18` lines: `public/app.js` +428/-16, `public/cardio-core.js` +40/-1, `public/index.html` +5, `public/styles.css` +22/-1, `test/cardio-core.test.js` +71) + the 3 brief.md checkbox lines. `db.js` / `server.js` cardio routes read only as the contract the frontend calls.
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 3` Progress rows 3.1–3.11 (D1, D2, D3, D4, D5 journal part, D7 UI part, D10), `## Slice details` → `### Phase 3` (incl. "Shared plumbing allowed in strength code, and only this"), `## Out of scope`, `## Guardrails`
- **Reviewed at:** 2026-10-17
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 3.1 | `node --check public/app.js && node --check public/cardio-core.js` exits 0 | `timeout 30 bash -c 'node --check public/app.js && node --check public/cardio-core.js'` | pass (`exit=0`) |
| 3.2 | whole suite `# fail 0` | `timeout 180 node --disable-warning=ExperimentalWarning --test` | pass |
| 3.3 | §2 smoke command exits 0 | the smoke command from loop-shared-rules.md with `<scratch-dir>` substituted (PORT=3999, `DB_PATH=<scratch-dir>/smoke.db`), under `timeout 60` | pass (`exit=0`; log `Trening działa na http://localhost:3999 (baza: …/scratchpad/smoke.db)`) |

3.2: exit 0, 75 tests (70 from Phases 1–2 + 5 this slice appended); the slice's tests are named in the output:

```
ok 43 - intervalsList i intervalsName: zapis interwałów i nazwa niezapisanego treningu
ok 44 - nextIntervalSec: następny interwał zawija cykl, a po ostatnim jest null
ok 45 - isValidStored: przyjmuje poprawne wartości (trening, pauza, odliczanie, podsumowanie, tryb swobodny)
ok 46 - isValidStored: odrzuca wartość z opisu błędu (brak planu, brak pausedMs, brak fazy)
ok 47 - isValidStored: odrzuca każdy inny uszkodzony kształt
1..75
# tests 75
# pass 75
# fail 0
# skipped 0
# todo 0
```

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `wakelock-double-request-leak` | round 1 | yes | Counting fake for `navigator.wakeLock` installed by an init script before `app.js` runs (re-applied on every reload). **Interval:** reload during a running interval → `{"req":1,"rel":0,"active":1}` right after load (round 1: `req 2`); second reload while paused → still `req 1`; resume → auto-end at the summary → `{"req":1,"rel":1,"active":0}`. **Strength:** reload during the rest timer → `{"req":1,"rel":0,"active":1}`; `run-end` → `{"req":1,"rel":1,"active":0}`; `run-save` → unchanged, `body.style.overflow` `""` — equal to round 1's HEAD baseline `{req:1, rel:1, active:0}`. **visibilitychange variant** (round 1 reasoned, not driven): during an interval, the lock released by the "system" (`wakeLock.release()` → `{"req":3,"rel":3,"active":0}`), then a stale `cardio.pos` + `visibilitychange` dispatched (so `syncOverlayState()` and the re-render from `cardioTick()` both call `keepAwake`) → `{"req":4,"rel":3,"active":1}`, exactly one new request; released at the summary. Direct sequences on the real `keepAwake`: `true;false` sync → active 0; `false;true` sync while held → active 1; 7 toggles 12 ms apart ending `true` → held, ending `false` → released (no desired state dropped by the 4-iteration bound — release resolves in a microtask, so only request awaits can interleave). |
| `cardio-storage-shape-unchecked` | round 1 | yes | Six corrupt `trening.cardio.v1` values set with `localstorage-set` + `reload`: round 1's `{"mode":"interval","session":{"startedAt":1,"pausedAt":null,"pausedMs":0},"phase":"running"}`, an interval with a name but no plan, a free session without `pausedMs`, an interval summary without `activeMs`, an interval with `totalSec` 25 (not whole cycles), and non-JSON text → in every case `loaded: true`, `#view` shows the calendar ("październik 20…"), overlay hidden, the key removed (except the non-JSON one, ignored), `console error` → `Total messages: 0` (`p3-r2-closure-corrupt-storage.png`). The new validator's tests were driven with wrong variants (table under I1): 28 of 29 diverge; the one survivor is an equivalent mutant. Residual gap → `cardio-stored-startedat-unchecked` (Minor). |

### Manual (performed with playwright-cli 0.1.14, sessions `feat-cardio-module-p3-r2` (aborted by a dialog, closed), `-a`, `-b`, `-c`; scratch instance on :3999 with a fresh DB)

Instrumentation (init script, re-applied on every reload): `AudioContext.prototype.createOscillator` and `OscillatorNode.prototype.start` log time + frequency into `window.__log`; `navigator.vibrate` logs its pattern; `navigator.wakeLock` is a counting fake (`window.__wl`); `window.confirm` records its message in `window.__confirms` and returns `true` (a real dialog inside `run-code` aborted the first session). Screenshots: `context/changes/feat-cardio-module/reviews/screenshots/p3-r2-*.png`.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 3.4 | Free mode: Start → the clock runs; Pause → it stays still for at least 3 s; Resume → it continues from the paused value; End → the summary's active time excludes the pause (run ~5 s, pause ~5 s, run ~5 s → about 0:10, not 0:15) (D1) | passed | `p3-r2-3.4-paused.png`, `p3-r2-3.4-summary.png`. `[data-action=cardio-start-free]` → `#cardio-active` "0:00" @442 ms, "0:04" @5023; `cardio-pause` → "0:04" + `#cardio-state` "Wstrzymano" @5045, @6556, @10089 (5.0 s still); `cardio-resume` → "0:04" @10107, "0:05" @11111; `cardio-end` (confirm "Zakończyć trening cardio teraz?") → stored `pausedMs: 5065`, `activeMs: 9989`, wall `finishedAt − startedAt` 15054 ms; summary "Tryb: swobodny / Czas aktywny: 0:09" (9.989 s floored — see nit `summary-vs-journal-rounding`). |
| 3.5 | Builder: intervals 30 s + 60 s with total 9:00 shows 6 full cycles and Start / "Zapisz jako szablon" are enabled; total 10:00 shows the Polish "does not fit in full cycles" message naming 9:00 and 10:30, and both are disabled; total 1:00 names only 1:30; adding or removing an interval updates the cycle count (D2) | passed | `p3-r2-3.5-ok-9min.png`, `-bad-10min.png`, `-bad-1min.png`, `-add.png`. 9:00 → `#cardio-live` "Mieści się w pełnych cyklach: 6 cykli (cykl 1:30)." class `ok`, `cardio-build-start` / `#cardio-tpl-name` / `#cardio-save-tpl` `disabled:false`; 10:00 → "Ten czas nie mieści się w pełnych cyklach (cykl 1:30). Najbliższe pasujące czasy: 9:00 (6 cykli) lub 10:30 (7 cykli)." all `disabled:true`; 1:00 → "… Najbliższy pasujący czas: 1:30 (1 cykl)." disabled; +90 s → "3 cykle (cykl 3:00)" enabled; remove 30 s → "cykl 2:30 … 7:30 (3 cykle) lub 10:00 (4 cykle)" disabled; remove 90 s → "9 cykli (cykl 1:00)"; add 3 s → toast "Każdy interwał musi trwać od 5 do 3600 s (liczba całkowita)", list unchanged; remove last → "Dodaj co najmniej jeden interwał". |
| 3.6 | Interval run with 5 s + 7 s and total 0:24: a 3-2-1 countdown, then 5 s, 7 s, 5 s, 7 s; at every interval change the screen shows the new interval at once, a beep is played (AudioContext oscillator calls observed in the page) and vibration is requested; at 0:24 of active time the workout ends by itself and shows the summary (D3) | passed | `p3-r2-3.6-interval2.png`, `p3-r2-3.6-summary.png`. DOM sampled every 50 ms (ms from the click; `session.startedAt` = +3032): `#cardio-countdown` "3" +87, "2" +1087, "1" +2087; "Teraz: 5 s" / "Interwał 1 z 2 · cykl 1 z 2" / next "7 s" +3087; "Teraz: 7 s" class `cardio-now flash` / "Interwał 2 z 2 · cykl 1 z 2" +8087; "Teraz: 5 s" / "cykl 2 z 2" +15201; "Teraz: 7 s" / next "Koniec treningu" +20201; summary +27202. `__log`: osc 660 Hz +33/+1045/+2045; osc 880 + vib `200` at +8045, +15160, +20160 (one each, none doubled); osc 990 + vib `[300,100,300]` +27160. Stored `activeMs: 24000`, `finishedAt − session.startedAt = 24000`; summary "Tryb: interwałowy / Czas aktywny: 0:24 / Interwały: 5 s + 7 s × 2 cykle". Audibility is owner-run. |
| 3.7 | Pause during an interval: the remaining time stays frozen for at least 3 s; Resume continues from the same remaining time (D4) | passed | `p3-r2-3.7-paused.png`. 30 s × 2 (1:00): remaining from the stored session via `CardioCore.intervalAt` 25488 ms running; after `cardio-pause` 25467 ms at +0, +1.5 s, +3.5 s, +4.5 s (`#cardio-remaining` "0:26", "Wstrzymano", buttons `cardio-end,cardio-resume`); after `cardio-resume` 25464 ms, 1 s later 24461 ms ("0:25"). |
| 3.8 | Saving the summary adds a cardio card to the Dziennik tab, in the cardio colour (computed colour differs from a strength card), with the active time and the intervals (D5) | passed | `p3-r2-3.8-journal-cardio.png`, `p3-r2-3.8-journal.png`, `p3-r2-3.8-journal-dark.png`. `cardio-save` → tab `journal`, `trening.cardio.v1` null, card `class="card cardio"` with `data-action="cardio-log-del"`, "Interwały 5 s + 7 s cardio / Czas aktywny 0:24 / Interwały 5 s + 7 s × 2 cykle / 📝 Notatka <i>&"x"" (note `innerHTML` `Notatka &lt;i&gt;&amp;"x"`). Computed `border-left`: cardio `rgb(147, 51, 234) 5px`, tag `rgb(147, 51, 234)` vs strength card `rgb(214, 220, 227) 1px` (light); dark: cardio `rgb(192, 132, 252)` vs strength `rgb(50, 58, 69)`. Counter "w tym miesiącu: 3 · łącznie: 3" with 1 strength + 2 cardio. |
| 3.9 | Saving an interval workout as a template named `<b>Tabata & "test"</b>` lists it with the name shown as literal text; Start from the template runs it; Usuń removes it (D7) | passed | `p3-r2-3.9-template-listed.png`, `-running.png`, `-deleted.png`. Snapshot: `heading "<b>Tabata & \"test\"</b>" [level=3] [ref=e166]`, `generic: 5 s + 7 s · razem 0:24 · 2 cykle`, buttons `▶ Start [ref=e169]`, `Usuń [ref=e170]`; `h3.innerHTML` `&lt;b&gt;Tabata &amp; "test"&lt;/b&gt;`, no `<b>` child; name input cleared after save. CLI `click e169` → overlay title escaped, stored `templateId: d8fd17d5…`, "Teraz: 5 s", auto-end 0:24, saved (journal h3 escaped). `cardio-template-del` (confirm "Usunąć szablon „<b>Tabata & "test"</b>”? …") → 0 delete buttons, "Brak szablonów…", `/api/state` `cardioTemplates: []`, the journal entry keeps its name. |
| 3.10 | Reload during a running interval → it continues with the correct remaining time (±1 s); reload while paused → still paused at the same value; reload during the countdown → the countdown continues (D10) | passed | `p3-r2-3.10-after-reload-running.png`, `-paused-after-reload.png`, `-countdown-after-reload.png`. Running: 16096 ms at t → `reload` → 14236 ms at t+1860 (exact), "0:15", "Interwał 1 z 1 · cykl 1 z 2". Paused: 3013 ms before reload, 3013 ms after, 3013 ms 5.5 s later, "Wstrzymano", `cardio-end,cardio-resume`; resumed → auto-end `activeMs: 60000`. Countdown: "3" with 2294 ms to start → `reload` → "1" with 488 ms → "Teraz: 30 s". |
| 3.11 | Strength regression: a strength plan still starts, records a set, runs its rest timer and saves; a cardio workout cannot start while a strength one is active, and the reverse, each with a Polish message | passed | `p3-r2-3.11-cardio-blocked.png`, `-strength-rest.png`, `-strength-summary.png`, `-strength-blocked.png`. CLI `click e132` (Plany, "▶ Start") → runner "Przysiad ze sztangą"; programmatic click on `[data-action=cardio-start-free]` → toast "Trwa trening siłowy – zakończ go, zanim zaczniesz cardio", `trening.cardio.v1` null; `set-full` → done `[{"reps":8,"weight":60}]`, `#rest-time` "1:59" → (reload) "1:49" → "1:48"; `run-end` → summary; `run-save` → tab `journal`, card "Full body (przykład)". Cardio active + programmatic click on `[data-action=start]` → toast "Trwa trening cardio – zakończ go, zanim zaczniesz trening siłowy", `trening.run.v1` null, `#runner` hidden. |

Additional checks (clauses with no brief row; see `frontend-clauses-without-row`): save retry — `network-state-set offline` → `cardio-save` → toast "Failed to fetch", `phase: "summary"`, note "retry note" kept, button re-enabled (`p3-r2-extra-save-offline.png`); online → saved, key null, journal "📝 retry note". Journal Usuń on a cardio card → counter 4 → 3, `cardioLog` 3 → 2, strength `log` 1 → 1.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | CONCERNS |
| D2 | Are all relevant types of documentation covered? | CONCERNS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | CONCERNS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 0 · Minor: 4 · Nit: 1

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** CONCERNS

New functions carry short Polish "why" comments (`keepAwake` serialization, `isValidStored`, `finishCardio`'s auto-end instant). Nothing outside the code describes the second client-side session.

- **[minor]** `docs-cardio-missing` (from round 1, still present) — `CLAUDE.md` "Frontend (`public/app.js`)" / `README.md` — `grep -in cardio README.md CLAUDE.md` finds nothing: the `trening.cardio.v1` key (whose shape is now load-bearing and validated on load), the `public/cardio-core.js` UMD module loaded before `app.js`, and the strength/cardio mutual exclusion are undocumented. Can be done once at the end of the change.

### D2. Are all relevant types of documentation covered?

**Verdict:** CONCERNS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | yes (feature list) | no | `docs-cardio-missing` |
| CLAUDE.md | yes (new localStorage key, new shared script) | no | `docs-cardio-missing` |
| ADR | no | — | none exist |
| phpdoc / API | n/a | — | routes are Phase 2's |
| Query header comments | n/a | — | |
| E2E rules / selectors | n/a | — | no E2E suite |
| Translations | n/a | — | inline Polish by convention; all new strings Polish |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

Comments and UI strings are correct Polish.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (from this phase's Changes Required / Success Criteria) | Implemented in | Status |
| :-- | :-- | :-- |
| Cardio tab between Plany and Ćwiczenia; `cardio-core.js` before `app.js`; own `#cardio-runner` | `public/index.html:17,29,33` | met |
| `viewCardio()` in the views map: free card, builder (list + remove, add input, min+sec total, live line, Start + name + "Zapisz jako szablon" disabled while not ok), "Szablony" Start/Usuń (confirm); builder state in `ui` | `public/app.js:131,136,657-731,990-1007,1179-1201,1232-1235` | met (3.5, 3.9) |
| Own variable + key `trening.cardio.v1`, saved on every change; stored value validated on load | `public/app.js:4,52-60`, `public/cardio-core.js:164-183` | met (closure walk); residual `cardio-stored-startedat-unchecked` |
| `unlockAudio()` in the click; persisted 3-2-1 with a beep per second; no pause in the countdown | `public/app.js:738-760,789-793,1015` | met (3.6, 3.10) |
| Running views, beep + vibrate + visible change per interval, long beep + summary at the end, Pauza/Wznów, Zakończ (confirm) | `public/app.js:782-815,852-886,1014-1032` | met (3.4, 3.6, 3.7) |
| Time only from CardioCore + timestamps, 250 ms tick | `public/app.js:768,782-816` | met (3.10) |
| Summary: mode, active time, intervals, note, save (relative URL, retry), Odrzuć; names per source | `public/app.js:888-905,990-999,1034-1060` | met (3.8, retry walk) |
| `viewJournal`: merged by start time, `card cardio`, tag, `fmtElapsed`, intervals × cycles, note, Usuń; counters count both; strength cards unchanged | `public/app.js:325-386,1008-1013` | met (3.8, delete walk); strength card markup identical to HEAD (diff removes only the list/counter lines) |
| `--cardio` in dark and light blocks, distinct from accent/warn/danger; overlay/builder/card styles | `public/styles.css:13,194,220-238` | met |
| Shared plumbing only: click-handler unlock, wake lock + overflow on "run OR cardio", mutual exclusion with Polish `showError` | `public/app.js:406,490-517,547-552,566,1131` | met; strength wake-lock counts equal HEAD (closure) |
| New pure helpers with node tests | `public/cardio-core.js:147-183`, `test/cardio-core.test.js:333-402` | met — table below |

Out of scope: no Notification API, no strength plan/library change, no metrics, no template editing. Guardrails: every `${…}` in the added templates is `esc()`-ed or is a number validated by `checkPlan`/`isValidStored`, a constant, or `fmt*`/`formatClock` output; URLs `api/cardio-workouts`, `api/cardio-templates/${d.id}`, `api/cardio-workouts/${d.id}` are relative; `startRun` gains only the cardio guard; `tick`, `renderRunner` body, `runnerWork/Rest/Summary`, strength actions and the `trening.run.v1` shape are unchanged (removed-lines diff against HEAD: only `keepAwake`'s body, the two `keepAwake`/overflow call sites, `if (run) unlockAudio()`, the views map, `db` init and the journal list lines). `keepAwake`'s rewrite is the wake-lock coordination the plumbing clause allows.

Test adequacy — wrong variants run against the slice's tests (`--test-name-pattern="isValidStored|intervalsList|nextIntervalSec"`, copy in `<scratch-dir>/mutant/`, production untouched):

| Variant | Result |
| :-- | :-- |
| canary (no change) | 5 pass, 0 fail |
| phase check removed / phase `countdown` accepted | 2 fail / 1 fail |
| mode check removed | 1 fail |
| `startedAt` check removed | 1 fail |
| `pausedMs` presence removed / negative `pausedMs` accepted | 2 fail / 1 fail |
| `pausedAt` undefined accepted (`!= null`) / `pausedAt` check removed | 1 fail / 1 fail |
| name check removed | 1 fail |
| `pos` check removed / negative / non-integer accepted | 1 / 1 / 1 fail |
| note check removed | 1 fail |
| interval `checkPlan` removed / only "non-empty array" / whole interval block removed | 1 / 1 / 2 fail |
| summary `activeMs` removed / negative `activeMs` / `finishedAt` removed / summary checks applied to running | 1 / 1 / 1 / 1 fail |
| `num` without `isFinite` | 1 fail |
| always `true` / always `false` | 2 fail / 1 fail |
| object guard replaced by `c == null` | 0 fail — equivalent (`'x'`, `5`, `[]` have no valid `mode`) |
| `intervalsList` joins with `, ` / `intervalsName` prefix `Interwał` | 1 / 1 fail |
| `nextIntervalSec`: `position >= count` / no wrap / never null | 1 / 1 / 1 fail |

Every non-equivalent wrong variant diverges.

- **[minor]** `frontend-clauses-without-row` (from round 1, still present) — `brief.md` `### Phase 3` — the save retry after a network error, the cardio journal Usuń, "the month/total counters count both", "no pause during the countdown" and the light/dark `--cardio` token have no Manual row and no assertion. This review walked the first three and both colour schemes (pass, see "Additional checks"); "no pause during the countdown" is by reading (`app.js:1015` guard; `cardioCountdown` renders no Pauza). Not builder-fixable (brief frozen, no DOM harness) — for the owner's walkthrough.

### I2. Is it logically correct?

**Verdict:** PASS

Time comes only from the stored session and `Date.now()`; each boundary is signalled once (position compared with the persisted `cardio.pos`, 3.6: one 880 Hz beep + one vibrate per change); a reload past the end goes straight to the summary with `finishedAt` = the expiry instant; a paused session cannot auto-end; ending while paused uses the frozen time; pausing in the ≤250 ms window after a boundary or after the end still renders the right interval / the summary (`renderCardio` re-derives from the session). `keepAwake` now has one in-flight request at a time and re-checks the desired state after each await (closure evidence).

- **[nit]** `summary-vs-journal-rounding` (from round 1, still present) — `public/app.js:899` vs `:1046` — the summary floors (`formatClock(cardio.activeMs / 1000)`) while the saved `activeSec` is `Math.round(...)`; observed in 3.4: `activeMs: 9989` shows "0:09" on the summary and is saved as 10 s ("0:10" in the journal).

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

The validator and the display helpers are pure and live in `cardio-core.js` with tests; `keepAwake`'s bounded loop is small and commented.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** CONCERNS

Save failure keeps the summary and allows a retry (walked); mutual exclusion works both ways (3.11); corrupt storage no longer blocks the app (closure).

- **[minor]** `cardio-stored-startedat-unchecked` — `public/cardio-core.js:164-183` with `public/app.js:1043` — `isValidStored` (whose comment promises the full shape incl. the summary's times) does not check the top-level `startedAt` that `cardio-save` turns into `date`/`startedAt`, nor `templateId`/`scheduleId`. **Fails when:** `trening.cardio.v1` = a free summary with valid `session`, `activeMs`, `finishedAt` but no `startedAt` → the summary renders, every "Zapisz w dzienniku" fails with the toast "Nieprawidłowa data" (`ymd(new Date(undefined))` → `NaN-NaN-NaN` → 400), and the only way out is "Odrzuć" — observed in session `-c`. Reachable only through a corrupted stored value (this code always writes `startedAt`), there is no crash and the error is shown, hence Minor. Related nit: a non-JSON value is ignored but not removed (`app.js:57` — `loadJSON` returns `null`, so the "czyścimy klucz" branch is skipped); harmless, the next session overwrites it.
- **[minor]** `silent-after-reload` (from round 1, still present) — `public/app.js:1131` — after a reload the `AudioContext` is re-created only by a click on a `[data-action]` element. Observed in session `-c`: interval 5 s + 7 s, reload in the first interval, then three interval changes and the end → `__log` `vib:200, vib:200, vib:200, vib:[300,100,300]` and no oscillator. For interval training the beep is the feature (D3); an on-screen hint or unlocking on any tap of the overlay would close it.

### I5. Is it performant?

**Verdict:** PASS

One extra 250 ms interval that returns immediately without a session; the journal merges and sorts both lists per render (single-user data).

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

Walked with `<b>Tabata & "test"</b>` (template list, overlay title, journal) and the note `Notatka <i>&"x"` — all rendered literally (`innerHTML` quoted in 3.8/3.9).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Frontend only; errors surface through `showError`; no `console.*` in the diff.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` untouched.

---

## Architecture — the project's own rules

- "Write all UI text, error messages and code comments in Polish" → meets.
- "escape every interpolated value with `esc()` in the `view*()` templates" → meets (I6).
- "Wire events through `data-action` + the `actions` map and forms through `onSubmit`; surface errors through `showError`" → meets.
- "API URLs stay relative" → meets.
- "The active workout lives only on the client (`trening.run.v1`) … Changing its shape needs a new key" → meets — strength shape untouched; cardio uses `trening.cardio.v1`.
- Slice guardrail "the strength runner's markup, logic and `trening.run.v1` shape stay as they are apart from the shared plumbing" → meets — strength wake-lock counts equal HEAD (closure), runner markup unchanged.
- "No system notifications" (Out of scope) → meets.
- NEVER-WEAKEN → meets — `test/cardio-core.test.js` only appended to; no skip/todo.

## Not reviewed

- Whether the beep is audible and a real phone vibrates — owner-run; only the calls were observed.
- The real Wake Lock API (headless) — observed through a counting fake; `visibilitychange` was dispatched, not produced by a real tab switch.
- Timer throttling in a backgrounded tab on a phone.
- Two browser tabs holding a strength and a cardio session at once.
- Container (Node 24).

## Observations outside scope

- `api()` (`public/app.js:64-76`, pre-existing) shows the browser's English "Failed to fetch" on a network error (seen in the retry walk); same for strength saves.
- A save whose response is lost after the server committed creates a duplicate on retry (no client-supplied id) — same pattern as the pre-existing `run-save`.
