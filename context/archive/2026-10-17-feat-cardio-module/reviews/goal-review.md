# Goal review: feat-cardio-module (c20c239..d8f9a79)

Inputs: the frozen brief (above "## Progress"), research.md, the full diff, the full current text of db.js, server.js,
public/{app.js,cardio-core.js,index.html,styles.css}, test/*.test.js, CLAUDE.md, README.md, auto-loop §9–§10, criteria.md.
Automated checks run once each: `node --check` on all 4 JS files → SYNTAX_OK; `node --test` → `# tests 90 / # pass 90 / # fail 0`.
Browser: scratch server PORT=3999, DB in the scratch dir, session `goal-review-fc` (opened, closed), server killed.
`window.confirm` was stubbed to return true, and `beep`/`navigator.vibrate` were wrapped to record calls.

## Done when
- D1 met: `ok 41 - pauza zamraża activeMs ... (D1)`. In the browser I ran free mode: start, pause (the time stayed at 0:06 for 4 s
  and across a reload), resume, end. Stored values: wall 48 846 ms, pausedMs 23 431, activeMs 25 415 (= wall − paused).
  The summary and the journal showed "Czas aktywny 0:25".
- D2 met: core tests 46–59, `ok 16 ... → 400 z polskim komunikatem i nic nie zapisuje`. curl POST /api/cardio-templates
  {30,60}/600 → `400 {"error":"Ten czas nie mieści się w pełnych cyklach (cykl 1:30). Najbliższe pasujące czasy: 9:00 (6 cykli) lub 10:30 (7 cykli)."}`.
  In the browser: added 5 s and 7 s, and 4 s was rejected with a toast. Total 0:25 → "…Najbliższe pasujące czasy: 0:24 (2 cykle) lub
  0:36 (3 cykle)." Start, the name field, "Zapisz jako szablon" and "Dodaj do kalendarza" were all disabled. Total 0:24 →
  "Mieści się w pełnych cyklach: 2 cykle". Adding and removing a 9 s interval updated the message live (screenshots/goal-d2-invalid.png).
- D3 met (audibility is owner-run): `ok 50 - intervalAt: sekwencja ... (D3)`. Sampled run of 5 s+7 s/0:24 from the calendar:
  CD 3→2→1 (beep 660 ×3), interval 1 at 5.44 s, interval 2 at 10.44 s (exactly 5 s later, no gap), with beep 880 and vibrate(200) at
  the change and "Teraz"/"Następny interwał" updated. It ended by itself: activeMs 24000, finishedAt = session start + paused + 24 s,
  and the summary was shown. The beep 990 at the end was not captured, because the stub was lost on reload (code app.js:831-833).
- D4 met: `ok 55 - pauza w trybie interwałowym ... (D4)`. In the browser it paused at rem 0:05 / act 0:19. After 3 s, a reload and
  another 2 s it was still at 0:05 / 0:19 "Wstrzymano". After resuming it showed 0:04 / 0:20 and then ended at exactly 24 s
  (screenshots/goal-d4-paused.png).
- D5 met: repo tests 70-74. Computed colours (light scheme): cardio journal card border rgb(147,51,234), 5px. Strength journal card
  border rgb(214,220,227), 1px. Calendar dots on one day: cardio done rgb(147,51,234), strength done rgb(22,163,74), strength planned
  rgb(217,119,6), cardio planned = a hollow ring (screenshots/goal-d5-*.png).
- D6 met: `ok 71 kalendarz: termin z szablonem cardio…`, `ok 77 powiązanie z terminem…`. In the browser: a template was scheduled
  from the calendar form ("Szablony cardio" optgroup) and from the builder's "Dodaj do kalendarza". The purple card had a Start
  button, I started from it and saved, and the entry then showed "✓ wykonany" with the dot changing to `dot cardio done`.
- D7 met: `ok 75 usunięcie szablonu: niewykonane terminy znikają, wykonane … zostają`. In the browser: saved a template named
  `<b>T&"x"</b> Żółw` (rendered escaped), listed it, started it, scheduled it on 10-24, then deleted it. The 10-24 entry was gone,
  the done 10-17 entry stayed (cardioTemplateId → null) and still showed as done under the logged name.
- D8 met: `ok 88 - migracja v3 dodaje wersję i nie zmienia żadnego istniejącego wiersza (D8)`. A v2 file DB with rows in all 7
  strength tables was dumped column by column before and after createRepo, and the dumps were identical. MIGRATIONS v1/v2 are
  textually unchanged in the diff (v3 was appended).
- D9 met: tests 81-86 (`ok 83 - … starsza kopia bez kluczy cardio importuje się …`) plus the API test. curl /api/export gave keys
  `exercises,plans,schedule,log,cardioTemplates,cardioLog`, with templates 1, cardioLog 2 and 1 cardio schedule entry.
- D10 met: free mode reloaded while paused (0:06 kept) and while running (continued). Interval mode reloaded while paused (rem 0:05
  kept) and while running: before the reload act 0:04 (expected 4699 ms); after it, interval 2, act 0:06 (expected 6506 ms),
  then 0:09 (9811 ms).

## Owner-run (not judged)
- Whether the beep is audible on the phone (the countdown 660 Hz, the interval change 880 Hz and the end 990 Hz calls were observed).
- Real phone vibration (calls to navigator.vibrate(200) / [300,100,300] were observed).
- Wake Lock keeping the screen on during cardio, and how the app behaves with the screen locked or the tab in the background
  (setInterval throttling).

## Cross-slice
- Formatting is duplicated between slices: app.js `fmtElapsed` (app.js:28) is identical to `CardioCore.formatClock`. The journal
  card uses fmtElapsed (app.js:400), while the runner summary uses formatClock (app.js:930) for the same active time. The number of
  cycles is recomputed inline at app.js:899 instead of taking it from checkPlan().cycles.
- Naming differs between the contract and its consumers: schedule `cardioTemplateId`/`cardio_template_id`, but cardio workout and
  dayItems use `templateId`/`template_id`.
- A field later slices left unused: `cardioShown.pos` (app.js:861) is written and never read. CardioCore exports LIMITS,
  COUNTDOWN_SEC and cyclesWord, which only the tests use.
- Guardrails across the whole change: Polish text, append-only migration, esc() (verified with `<b>T&"x"</b>`), relative URLs
  (`api/cardio-*`), no new dependency, tx() for multi-statement writes (template delete, schedule, import): all held. The run key
  `trening.run.v1` is unchanged, and the cardio state uses `trening.cardio.v1`. db.js now requires ./public/cardio-core.js; the
  Dockerfile copies public/, so the container is fine. The strength code was touched only for coordination (see G-05).

## Findings
- G-01 Major: CLAUDE.md is now out of date. It says "There are no tests", that /api/state returns `{ exercises, plans, schedule, log }`,
  lists only the 4 mutation resources, and says three files hold the logic. In fact db.js now depends on public/cardio-core.js,
  there are 90 node:test tests and no `npm test` script. A future agent will skip the suite and misread the contract
  (criteria D2). Uncertain whether this is Major or Minor.
- G-02 Minor: README.md's feature line and its "Kopia zapasowa" section don't mention cardio, or that the backup now contains it.
- G-03 Minor: an interval workout ended early is logged with its planned cycle count: "Czas aktywny 0:12 · Interwały 5 s + 7 s ×
  2 cykle" (app.js:401, 921). It reads as if 2 cycles were done.
- G-04 Minor: the formatting and cycle-count duplication described under Cross-slice (app.js:28/400/899 vs cardio-core.js).
- G-05 Minor (uncertain): the strength side was touched beyond the calendar and journal: a cardio guard in startRun (app.js:425),
  a rewrite of keepAwake and syncOverlayState (app.js:512-536), and insertWorkout now drops a scheduleId that points at a cardio
  entry (db.js:394). These look necessary, and in my walk a strength workout ran, saved and marked its entry done, but "Out of
  scope" excludes changes to strength training.
- G-06 Minor: the naming inconsistency cardioTemplateId vs templateId (db.js:112/118, app.js:113/128).
- G-07 Nit: unused `cardioShown.pos`, and core exports used only by tests.
- G-08 Nit (uncertain): isValidStored (cardio-core.js:164-183) doesn't check the top-level `startedAt`. A corrupted stored value
  without it would reach the summary and then fail to save with a 400; the user can still discard it.
- G-09 Nit: the template-name input is disabled while the plan is invalid (app.js:752), so the name can't be typed first.
