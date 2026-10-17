# Phase review — feat-cardio-module · Phase 3: Cardio tab, runner and journal · round 1

- **Scope:** working tree on top of `525b781` (`git status --porcelain`): `M public/app.js`, `M public/cardio-core.js`, `M public/index.html`, `M public/styles.css`, `M test/cardio-core.test.js`; `brief.md` Progress checkboxes 3.1–3.3 (diff checked: only those three `[ ]`→`[x]`, plus the orchestrator's SHA suffixes on 2.1–2.5). Not this slice: `.dockerignore`, `.env.example`, `.gitignore` (pre-existing, untracked), `documentation/` (foreign, not read), `workbench.md`, `.loop-baseline`.
- **Files reviewed:** 5 (`+468/-11` lines: `public/app.js` +410/-10, `public/cardio-core.js` +16, `public/index.html` +5, `public/styles.css` +22/-1, `test/cardio-core.test.js` +15) + the 3 brief.md checkbox lines. `db.js` / `server.js` cardio routes read only as the contract the frontend calls.
- **Contract:** `context/changes/feat-cardio-module/brief.md` → `### Phase 3: Cardio tab, runner and journal` Progress rows 3.1–3.11 (D1, D2, D3, D4, D5 journal part, D7 UI part, D10) and `## Slice details` → `### Phase 3` (incl. "Shared plumbing allowed in strength code, and only this"); `## Out of scope`, `## Guardrails`
- **Reviewed at:** 2026-10-17
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 3.1 | `node --check public/app.js && node --check public/cardio-core.js` exits 0 | `timeout 30 bash -c 'node --check public/app.js && node --check public/cardio-core.js'` | pass (`exit=0`) |
| 3.2 | whole suite `# fail 0` | `timeout 180 node --disable-warning=ExperimentalWarning --test` | pass |
| 3.3 | §2 smoke command exits 0 | the smoke command from loop-shared-rules.md with `<scratch-dir>` substituted (PORT=3999, `DB_PATH=<scratch-dir>/smoke.db`), under `timeout 60` | pass (`exit=0`; log: `Trening działa na http://localhost:3999 (baza: …/scratchpad/smoke.db)`) |

3.2: exit 0, 72 tests (70 from Phases 1–2 + the 2 this slice appended); both new tests are named in the output:

```
ok 43 - intervalsList i intervalsName: zapis interwałów i nazwa niezapisanego treningu
ok 44 - nextIntervalSec: następny interwał zawija cykl, a po ostatnim jest null
...
1..72
# tests 72
# suites 0
# pass 72
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

### Manual (performed with playwright-cli 0.1.14, session `feat-cardio-module-p3-r1`, scratch instance on :3999 with a fresh DB)

Instrumentation: an init script (re-applied on every reload) wrapped `AudioContext.prototype.createOscillator` and `navigator.vibrate` to log timestamps/frequencies into `window.__log`, and replaced `navigator.wakeLock` with a counting fake (`window.__wl = {req, rel, active}`). Screenshots: `context/changes/feat-cardio-module/reviews/screenshots/p3-r1-*.png`.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 3.4 | Free mode: Start → the clock runs; Pause → it stays still for at least 3 s; Resume → it continues from the paused value; End → the summary's active time excludes the pause (run ~5 s, pause ~5 s, run ~5 s → about 0:10, not 0:15) (D1) | passed | `p3-r1-3.4-paused.png`, `p3-r1-3.4-summary.png`. Walk 1 (CLI steps): `#cardio-active` "0:09" + `#cardio-state` "Wstrzymano" at t=…136705 and still "0:09" at t=…142038 (5.3 s); after `cardio-resume` "0:10". Walk 2 (5/5/5 in one run-code): stored `session.pausedMs: 5034`, `activeMs: 10070`, `finishedAt − startedAt = 15104` ms; snapshot `listitem "Czas aktywny: 0:10"`. |
| 3.5 | Builder: intervals 30 s + 60 s with total 9:00 shows 6 full cycles and Start / "Zapisz jako szablon" are enabled; total 10:00 shows the Polish "does not fit in full cycles" message naming 9:00 and 10:30, and both are disabled; total 1:00 names only 1:30; adding or removing an interval updates the cycle count (D2) | passed | `p3-r1-3.5-ok-9min.png`, `p3-r1-3.5-bad-10min.png`, `p3-r1-3.5-bad-1min.png`, `p3-r1-3.5-add.png`. 9:00 → `#cardio-live` "Mieści się w pełnych cyklach: 6 cykli (cykl 1:30)." class `ok`, `[data-action=cardio-build-start]`/`#cardio-tpl-name`/`#cardio-save-tpl` `disabled:false`; 10:00 → "Ten czas nie mieści się w pełnych cyklach (cykl 1:30). Najbliższe pasujące czasy: 9:00 (6 cykli) lub 10:30 (7 cykli)." all three `disabled:true`; 1:00 → "… Najbliższy pasujący czas: 1:30 (1 cykl)." disabled; add 90 s → "3 cykle (cykl 3:00)"; remove 30 s → "cykl 2:30 … 7:30 (3 cykle) lub 10:00 (4 cykle)" disabled; remove 90 s → "9 cykli (cykl 1:00)"; remove last → "Dodaj co najmniej jeden interwał". |
| 3.6 | Interval run with 5 s + 7 s and total 0:24: a 3-2-1 countdown, then 5 s, 7 s, 5 s, 7 s; at every interval change the screen shows the new interval at once, a beep is played (AudioContext oscillator calls observed in the page) and vibration is requested; at 0:24 of active time the workout ends by itself and shows the summary (D3) | passed | `p3-r1-3.6-interval2.png`, `p3-r1-3.6-summary.png`. DOM samples (ms from click): `#cardio-countdown` 3 @42, 2 @1206, 1 @2274; `#cardio-now` "Teraz: 5 s" @3266 → "Teraz: 7 s" (class `flash`, "Interwał 2 z 2 · cykl 1 z 2") @8224 → "Teraz: 5 s" ("cykl 2 z 2") @15273 → "Teraz: 7 s" (next "Koniec treningu") @20280. `__log`: osc 660 Hz @37/1195/2195 (countdown); osc 880 Hz + vib "200" @8196, @15262, @20262 (session start @3036, boundaries @8036/15036/20036 — one beep + one vibrate each, none doubled); osc 990 Hz + vib "[300,100,300]" @27264 (end @27036). Stored `activeMs: 24000`, `finishedAt = session.startedAt + 24000`; summary "Czas aktywny: 0:24 / Interwały: 5 s + 7 s × 2 cykle". Audibility is owner-run. |
| 3.7 | Pause during an interval: the remaining time stays frozen for at least 3 s; Resume continues from the same remaining time (D4) | passed | `p3-r1-3.7-paused.png`. Remaining computed from the stored session via `CardioCore.intervalAt`: 5466 ms at pause, 5466 ms at +1.5 s, +3.3 s, +4.4 s (`#cardio-remaining` "0:06", "Wstrzymano", buttons `cardio-end,cardio-resume`); right after `cardio-resume` 5463 ms, 1 s later 4461 ms ("0:05"). |
| 3.8 | Saving the summary adds a cardio card to the Dziennik tab, in the cardio colour (computed colour differs from a strength card), with the active time and the intervals (D5) | passed | `p3-r1-3.8-journal.png`, `p3-r1-3.8-journal-dark.png`. After `cardio-save` the tab switched to `journal`; card `class="card cardio"` "Interwały 5 s + 7 s cardio / … / Czas aktywny 0:24 / Interwały 5 s + 7 s × 2 cykle / 📝 Notatka <i>&"x"" (note shown literally). Computed `border-left-color`: cardio `rgb(147, 51, 234)` 5px vs strength card `rgb(214, 220, 227)` 1px (light); dark: cardio `rgb(192, 132, 252)` vs strength `rgb(50, 58, 69)`. Counter "w tym miesiącu: 4 · łącznie: 4" with 1 strength + 3 cardio. |
| 3.9 | Saving an interval workout as a template named `<b>Tabata & "test"</b>` lists it with the name shown as literal text; Start from the template runs it; Usuń removes it (D7) | passed | `p3-r1-3.9-template-listed.png`, `p3-r1-3.9-template-running.png`, `p3-r1-3.9-template-deleted.png`. Snapshot `heading "<b>Tabata & \"test\"</b>" [level=3]`; `h3.innerHTML` `&lt;b&gt;Tabata &amp; "test"&lt;/b&gt;`, no `<b>` element inside; buttons `cardio-start:608ab942…` / `cardio-template-del:608ab942…`. Start → overlay title escaped, countdown "3", then "Teraz: 5 s", ended at 0:24 and saved (journal h3 escaped). Usuń (confirm accepted) → 0 `cardio-template-del` buttons, "Brak szablonów…", `/api/state` `cardioTemplates: []`, the journal entry keeps its name. |
| 3.10 | Reload during a running interval → it continues with the correct remaining time (±1 s); reload while paused → still paused at the same value; reload during the countdown → the countdown continues (D10) | passed | `p3-r1-3.10-after-reload-running.png`, `p3-r1-3.10-paused-after-reload.png`, `p3-r1-3.10-countdown-after-reload.png`. Running: 6165 ms before reload → 5741 ms 424 ms later (`#cardio-remaining` "0:06", same "Interwał 2 z 2 · cykl 2 z 2"), then auto-ended at `activeMs: 24000`. Paused: 2366 ms before reload, 2366 ms after and 3 s later, "Wstrzymano". Countdown: "3" (1.8 s left) before reload → "2" right after, then "Teraz: 5 s". Extra (not in the row): free mode 4177 → 6450 ms across a reload; paused 7651 ms frozen across a reload. |
| 3.11 | Strength regression: a strength plan still starts, records a set, runs its rest timer and saves; a cardio workout cannot start while a strength one is active, and the reverse, each with a Polish message | passed | `p3-r1-3.11-strength-blocked.png`, `p3-r1-3.11-cardio-blocked.png`, `p3-r1-3.11-strength-rest.png`, `p3-r1-3.11-strength-summary.png`. Cardio active + programmatic click on `[data-action=start]` → toast "Trwa trening cardio – zakończ go, zanim zaczniesz trening siłowy", `trening.run.v1` null. Strength active + click on `[data-action=cardio-start-free]` → toast "Trwa trening siłowy – zakończ go, zanim zaczniesz cardio", `trening.cardio.v1` null. Strength: `set-full` → done `[{reps:8, weight:60}]`, `#rest-time` 1:59 → 1:56 → (reload) 1:53; `run-end` → summary; `run-save` → journal card "Full body (przykład)". The wake-lock side of this walk is finding `wakelock-double-request-leak`. |

Additional checks this review walked (clauses with no brief row; see `frontend-clauses-without-row`):
- Save retry: offline (`network-state-set offline`) → `cardio-save` → toast "Failed to fetch", `phase: "summary"`, note "retry note" kept, button re-enabled (`p3-r1-extra-save-offline.png`); online → second click saved, `trening.cardio.v1` null, journal card with "📝 retry note".
- Journal Usuń on a cardio card (`cardio-log-del`, confirm) → counter 4 → 3, `/api/state` cardioLog 3 → 2, strength log untouched.
- Corrupt stored value → finding `cardio-storage-shape-unchecked` (`p3-r1-extra-corrupt-storage.png`).

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | CONCERNS |
| D2 | Are all relevant types of documentation covered? | CONCERNS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | FAIL |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | FAIL |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 2 · Minor: 4 · Nit: 1

Findings going back to a builder: `wakelock-double-request-leak`, `cardio-storage-shape-unchecked`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** CONCERNS

New functions carry short Polish comments that say why (`syncOverlayState`, `cardioTick`, `finishCardio`'s auto-end timestamp, `loadCardio`'s separate key). Nothing outside the code tells a reader about the second client-side session.

- **[minor]** `docs-cardio-missing` — `CLAUDE.md` "Frontend (`public/app.js`)" / `README.md` first line — CLAUDE.md documents the strength runner and `trening.run.v1` as the only client-held workout; the cardio session in `trening.cardio.v1`, the `public/cardio-core.js` UMD module loaded before `app.js`, and the strength/cardio mutual exclusion are undocumented, so the next agent editing the runner has no rule telling it the key's shape is now load-bearing too. README's feature line does not mention cardio. (Could equally be done once at the end of the change.)

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
| Translations | n/a | — | UI strings are inline Polish by project convention; all new strings are Polish |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

Comments and UI strings are correct Polish; no wrong identifiers or paths.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement (from this phase's Changes Required / Success Criteria) | Implemented in | Status |
| :-- | :-- | :-- |
| Cardio tab between Plany and Ćwiczenia; `cardio-core.js` before `app.js`; own `#cardio-runner` overlay | `public/index.html:17,29,33` | met |
| `viewCardio()` in the views map: free card, builder (intervals + remove, add input, min+sec total, live line, Start + name + "Zapisz jako szablon" disabled while not ok), "Szablony" with Start/Usuń (confirm); builder state in `ui` | `public/app.js:129,134,646-719,978-995,1167-1189,1220-1223` | met (3.5, 3.9) |
| Own variable + key `trening.cardio.v1`, saved on every change | `public/app.js:4,52-58` | met; shape check incomplete → `cardio-storage-shape-unchecked` |
| `unlockAudio()` in the click; 3-2-1 with a beep per second, persisted; no pause in countdown | `public/app.js:745,750-754,777-781,1003` | met (3.6, 3.10) |
| Running views (free active time; interval remaining, "Interwał x z n · cykl c z C", next); beep + vibrate + visible change at each interval change; long beep + summary at the end; Pauza/Wznów, Zakończ (confirm) | `public/app.js:770-803,840-874,1002-1020` | met (3.4, 3.6, 3.7) |
| Time only from CardioCore + timestamps, 250 ms tick | `public/app.js:756,770-804` | met (3.10) |
| Summary: mode, active time, intervals, note, save (relative URL, retry on error), Odrzuć; names per source | `public/app.js:876-893,978-986,1022-1048` | met (3.8, extra save-retry walk) |
| `viewJournal`: merged by start time, `card cardio`, tag, `fmtElapsed`, intervals × cycles, note, Usuń; counters count both; strength cards unchanged | `public/app.js:323-384,996-1001` | met (3.8, extra delete walk) |
| `--cardio` in dark and light blocks, distinct from accent/warn/danger; overlay/builder/card styles | `public/styles.css:13,194,220-238` | met |
| Shared plumbing only: click-handler unlock, wake lock + overflow on "run OR cardio", mutual exclusion with Polish `showError` | `public/app.js:404,501-505,537-539,554,1119` | met in scope; the wake-lock coordination leaks → `wakelock-double-request-leak` |
| New pure helpers with node tests | `public/cardio-core.js:147-160`, `test/cardio-core.test.js:333-346` | met — wrong-variant table below |

Out of scope: no Notification API (grep of the diff: none), no strength plan/library change, no metrics, no template editing. Guardrails: `esc()` on every interpolated name (checked every `${…}` in the added lines: the unescaped ones are numbers validated by `checkPlan`, constants or `fmt*` output); URLs `api/cardio-workouts`, `api/cardio-templates/${d.id}`, `api/cardio-workouts/${d.id}` are relative; strength runner markup/logic and the `trening.run.v1` shape unchanged apart from the listed plumbing (diffed `startRun`, `tick`, `renderRunner`, the visibility and click handlers against HEAD).

Test adequacy for the new helpers — wrong variants run against the slice's tests in `<scratch-dir>/mutant/` (canary first):

| Variant | Result of `--test-name-pattern="intervalsList\|nextIntervalSec\|klasyczny skrypt"` |
| :-- | :-- |
| canary (no change) | 3 pass, 0 fail |
| `intervalsList` joins with `, ` | 1 fail |
| `intervalsList` without the ` s` unit | 1 fail |
| `intervalsName` prefix `Interwał` | 1 fail |
| `nextIntervalSec`: `position >= count` | 1 fail |
| `nextIntervalSec`: `position + 2 >= count` | 1 fail |
| `nextIntervalSec`: no wrap (`intervals[position + 1]`) | 1 fail |
| `nextIntervalSec`: returns the current interval | 1 fail |
| `nextIntervalSec`: `count` = cycles, not positions | 1 fail |
| `nextIntervalSec`: never returns null | 1 fail |

Every wrong variant diverges.

- **[minor]** `frontend-clauses-without-row` — `context/changes/feat-cardio-module/brief.md` `### Phase 3` — several behavioural clauses of this slice have no Manual row and no assertion: the save retry after a network error, the cardio journal Usuń, "the month/total counters count both", "no pause during the countdown", the light-theme `--cardio` token. This review walked the first three and the light/dark colours and they pass (see "Additional checks"); "no pause during the countdown" is checked by reading only (`app.js:1003` guard, no pause button in `cardioCountdown`). Nothing will re-check them in a later round. Not builder-fixable (the brief is frozen and there is no DOM test harness), so this is for the owner's walkthrough.

### I2. Is it logically correct?

**Verdict:** FAIL

Timeline logic is sound: time comes only from the stored session and `Date.now()`; boundaries are detected by comparing `intervalAt(...).position` with the persisted `cardio.pos`, so a boundary is signalled exactly once and is not replayed after a reload (3.6: one 880 Hz beep + one vibrate per change, none doubled); the auto-end `finishedAt` is the exact expiry instant, not the detection instant; ending while paused uses the frozen time (observed `activeMs: 2634` with `pausedAt` set); a reload past the end goes straight to the summary.

- **[major]** `wakelock-double-request-leak` — `public/app.js:132-138` with `public/app.js:489-505` and `:551-554`, `:807-810` — `render()` now calls `renderRunner()` and `renderCardio()`, and each calls `syncOverlayState()` → `keepAwake(...)` synchronously. `keepAwake` has no in-flight guard: both calls see `wakeLock === null` while the first `navigator.wakeLock.request()` is pending, so two sentinels are acquired and only the last one is kept in `wakeLock`; `keepAwake(false)` at the summary releases one and the other stays held. **Fails when:** any page load with an active session — reload during an interval workout → counting fake shows `req 2` right after load, then at the summary `{"req":2,"rel":1,"active":1}`; reload during a **strength** rest → `req 2`, after `run-end` and `run-save` still `{"req":2,"rel":1,"active":1}` with `run` null. Baseline with HEAD `app.js` on :3998, same strength steps: `{"req":1,"rel":1,"active":0}`. So the screen is kept on after the workout ends (until the tab is hidden), and this regresses the strength runner, whose plumbing this slice was allowed to touch only to coordinate the lock. Same race, not reproduced here (headless has no visibility toggle): `visibilitychange` (`app.js:535-540`) calls `syncOverlayState()` and then `cardioTick()`, which re-renders and calls it again whenever an interval boundary passed while the phone was locked. Fix shape: call `syncOverlayState()` once per render pass (not from both renderers), or make `keepAwake` idempotent with a pending-request/desired-state guard.

- **[nit]** `summary-vs-journal-rounding` — `public/app.js:887` vs `:1034` — the summary floors (`formatClock(cardio.activeMs / 1000)`) while the saved `activeSec` is `Math.round(...)`, so 9.6 s shows "0:09" on the summary and "0:10" in the journal.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

`cardioShown` (what is drawn) vs the computed stage is a small, readable state machine; helpers moved to `cardio-core.js` are pure and tested. `setText` avoids needless DOM writes on each tick.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** FAIL

Save failure keeps the summary and allows a retry (walked). Mutual exclusion works both ways with Polish toasts (3.11).

- **[major]** `cardio-storage-shape-unchecked` — `public/app.js:53-57` — `loadCardio()` accepts any stored value with a valid `mode` and a finite `session.startedAt`; it does not check `intervals`/`totalSec` for interval mode, `session.pausedMs`/`pausedAt`, `phase`, or `activeMs` in the summary. `render()` at top level (`app.js:1233`) runs `renderCardio()` → `cardioInterval()` → `CardioCore.intervalAt` throws `RangeError`, so `loadState()` on the next line never runs. **Fails when:** `trening.cardio.v1` = `{"mode":"interval","session":{"startedAt":1,"pausedAt":null,"pausedMs":0},"phase":"running"}` (or any interval session whose plan is missing, or a session without a numeric `pausedMs`) → after reload `#view` stays "Wczytywanie…", console shows `RangeError: Lista interwałów musi zawierać dodatnie czasy at intervalAt … at renderCardio (app.js:816) at render (app.js:137)` 14 times in 1.5 s (the 250 ms tick retries), tab clicks render "Wczytywanie…" again (`p3-r1-extra-corrupt-storage.png`). The whole app — strength plans, calendar, journal — is unusable and there is no in-app recovery; on a phone the owner cannot clear localStorage. The value is normally written only by this code, but this is the boundary the slice added and its guard claims to validate it. Fix shape: validate the full shape on load (interval → `CardioCore.checkPlan(c.intervals, c.totalSec).ok`; numeric `startedAt`/`pausedMs`, `pausedAt` null or number; `phase` in `running|summary`; summary → finite `activeMs`/`finishedAt`) and drop anything else, so a bad value can never block `loadState()`.

- **[minor]** `silent-after-reload` — `public/app.js:1117-1119` — after a reload the `AudioContext` is gone and is re-created only by a click on a `[data-action]` element while a session is active; vibration also needs a user gesture. An interval workout that continues after a reload (3.10) therefore gives no beep at the following interval changes until the user happens to press Pauza/Wznów, and nothing on screen says so (observed: after the 3.10 reload the end produced a `vibrate` call but no oscillator). Same pre-existing limitation as the strength rest timer, but for interval training the signal is the feature (D3). A "Stuknij, aby włączyć dźwięk" hint or unlocking on any tap of the overlay would close it.

### I5. Is it performant?

**Verdict:** PASS

One extra 250 ms interval that returns immediately without a session; the journal merges and sorts both lists per render (single-user data, hundreds of rows at most).

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

All names, notes, ids and the builder's typed values go through `esc()`; the unescaped interpolations are integers validated by `checkPlan` (server-side for templates, client-side for the builder), constants, or `fmt*` output. Walked with `<b>Tabata & "test"</b>` (template, overlay, journal) and a note `Notatka <i>&"x"` — all rendered literally.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Frontend only; errors surface through `showError` as the project's convention requires. No leftover `console.*` in the diff.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

No dependency change (`package.json` untouched).

---

## Architecture — the project's own rules

- "Write all UI text, error messages and code comments in Polish" → meets — every new string and comment is Polish.
- "escape every interpolated value with `esc()` in the `view*()` templates" → meets — see I6.
- "Wire events through `data-action` + the `actions` map and forms through `onSubmit`; surface errors through `showError`" → meets — `cardio-*` actions, `cardio-interval-form` / `cardio-tpl-form` in `onSubmit`, errors thrown into the delegated `.catch(showError)`.
- "API URLs stay relative" → meets.
- "The active workout lives only on the client (`trening.run.v1`) … Changing its shape needs a new key" → meets — the strength shape is untouched; cardio uses its own `trening.cardio.v1`.
- Slice guardrail "the strength runner's markup, logic and `trening.run.v1` shape stay as they are apart from the shared plumbing" → meets in code; the plumbing itself leaks the wake lock → `wakelock-double-request-leak`.
- "No system notifications" (Out of scope) → meets.

## Not reviewed

- Whether the beep is audible and whether a real phone vibrates — owner-run; only the `createOscillator` / `navigator.vibrate` calls were observed.
- The real Wake Lock API (headless) — observed with a counting fake installed before `app.js` runs; the `visibilitychange` variant of `wakelock-double-request-leak` was reasoned, not driven.
- Behaviour in a backgrounded/throttled tab on a phone (timer throttling) — only reloads were driven.
- Two browser tabs running a strength and a cardio session at once (the mutual-exclusion guard is per page).
- Container (Node 24) — nothing verifies the image.

## Observations outside scope

- `api()` (`public/app.js:62-74`, pre-existing) surfaces the browser's own English message on a network error — the save-retry walk showed the toast "Failed to fetch". Same for strength saves.
- A save whose response is lost after the server committed creates a duplicate on retry (no client-supplied id) — same pattern as the pre-existing `run-save`.
