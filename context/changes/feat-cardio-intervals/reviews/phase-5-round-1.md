# Phase review — feat-cardio-intervals · Phase 5: Cardio session screen · round 1

- **Scope:** `src/App.vue`, `src/workout/cardioEngine.ts`, `src/components/CardioSession.vue`, `src/components/CardioSession.test.ts`, `src/components/CardioStored.test.ts`, `src/components/CardioPlansFlow.test.ts` · **Files reviewed:** 6 (`+999/-29`, untracked files counted in full)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 5: Cardio session screen` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** FAIL
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover none (the coordinator ran the experiments)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 5.1 | component tests | `npx vitest run src/components` | pass — `Test Files  12 passed (12)` · `Tests  253 passed (253)`, no skip line |
| 5.2 | full suite, baseline 0 failing | `npm test` | pass — `Test Files  30 passed (30)` · `Tests  731 passed (731)`; 0 failing = baseline 0. The brief's count (439 tests, 20 files) is older than the earlier phases of this run; `vitest list --filesOnly` shows 30 files, all under `src/`. |
| 5.3 | type check + build | `npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 263ms`, `precache  23 entries`. This proves types only. |

### Manual (walked by the walker with playwright-cli 0.1.14; spot-checked: 5.4 `p5-r1-5.4-work.png`, 5.5 `p5-r1-5.5-reload.png`)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 5.4 | session screen at 412×915, fake clock | passed | `reviews/screenshots/p5-r1-5.4-prepare.png`, `-work.png`, `-pause.png`, `-confirm.png`, `-end.png`. Plan "Bieżnia łatwa" (20 s / 10 s × 2 = 4 intervals). Start: "PRZYGOTUJ SIĘ", "0:03", "Dalej: Praca · 0:20", "Razem 0:00 / Zostało 1:00", 4 items in "Przebieg". After 3 s: "Interwał 1 z 4 / PRACA / 0:18 / Dalej: Odpoczynek · 0:10". Rest: "Interwał 2 z 4 / ODPOCZYNEK". Pauza: "PAUZA", "Wznów", clock "0:06" before and after `page.clock.runFor(10000)`. Wznów: "PRACA", clock moves down. Zakończ: alertdialog "Zakończyć trening?" with "Wróć do treningu" / "Zakończ trening". After the last interval: "Koniec treningu" + "Wróć do planów". Field background `rgb(169, 139, 245)`. The walker has no ODPOCZYNEK screenshot (its `-rest.png` shows a work interval); experiment E2 below adds one. |
| 5.5 | reload in work + sound calls | passed | `reviews/screenshots/p5-r1-5.5-reload.png`. Before reload: "Interwał 3 z 4 / PRACA / 0:09", stored `"pausedAt":null`. After reload: "Interwał 3 z 4 / PAUZA / 0:06 / Wznów", stored `pausedAt 1792861098316`. `createOscillator` calls: 0 before Start, 5 after the get-ready countdown and the work start, 10 after the first rest start, 14 after the interval 3 work start. A real speaker: unreachable (not observable by the browser driver). |

Spot-check: I opened `p5-r1-5.4-work.png`. It shows "Bieżnia łatwa", "Interwał 1 z 4", "PRACA", "0:14", "Dalej: Odpoczynek · 0:10", "Razem 0:06", "Zostało 0:54", 4 segments with the first outlined. I opened `p5-r1-5.5-reload.png`. It shows "Interwał 3 z 4", "PAUZA", "0:06", "Wznów", and the third segment outlined. Both agree with the walker's lines → confirmed.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | mutant: set up `useCardio()` before `useWorkout()` in `App.vue` (the wake-lock order the contract asks for) | coordinator, scratch copy | `× keeps the screen lock after a visibilitychange return` · `× keeps the screen lock after a reload with the restored paused session` · `AssertionError: expected +0 to be 1` · `Tests  2 failed \| 33 passed (35)` | The setup order is pinned by the two App-level wake-lock tests, for the right reason (0 held locks). |
| E2 | measure the screen in the browser at 412×915 (`vite preview` on 4199, fake clock, plan with a long Polish name, and a plan with 60 segments) | coordinator, playwright-cli `run-code` | work + rest: `docScroll [412,915]`, `pauza h 64 top 767`, `zablokuj h 56`, `zakoncz h 56`, timeline `client 380 scroll 380 gap 4px n 4`; dense: `gap 2px n 60 minSeg 4.4`, no overflow; `metaFont ["\"Barlow Semi Condensed\", ...", "600", "none", "18px"]`. Screenshots `p5-r1-critic-work-longname.png`, `p5-r1-critic-rest.png`, `p5-r1-critic-dense.png`. | Touch targets 64/56 px, no page scroll, the timeline fits at 60 segments, ODPOCZYNEK screen seen. The Meta rows use the body font at 600 with no uppercase (finding `meta-row-type-role`). The first run's output was cut by my own `tail`; I ran the same script once more and saved the output to a file. |
| E3 | mutant: dense gap from `> 24` to `> 25` in `CardioSession.vue` | coordinator, scratch copy | `Tests  35 passed (35)` | The boundary at 25 segments is not pinned (finding `dense-timeline-boundary-loose`). |
| E4 | mutant: remove `if (started) dismissExpired()` from `startPlan` in `App.vue` | coordinator, scratch copy | `Test Files  30 passed (30)` · `Tests  731 passed (731)` | No test pins that a start clears the notice of the other workout kind. |
| E5 | scratch test: strength workout expired → notice → Start a cardio plan → Zakończ → Zakończ trening → the notice must not come back; run against E4's mutant and the real `App.vue` | coordinator, scratch copy | mutant: `× a strength expiry notice does not come back after a cardio session started and ended` · `AssertionError: expected 'PlanyTrening wygasł po 2 godzinach be…' not to contain 'Trening wygasł po 2 godzinach bez dot…'`; real: `Tests  1 passed (1)` | The line changes behaviour the user sees: without it, the old notice comes back. The real code is correct. The suite does not pin it (finding `cross-kind-expiry-dismiss-unpinned`). |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | New props, `timeline` field and App wiring have short "why" comments. |
| D2 | All documentation types covered? | pass | No doc needs a change for this phase. |
| D3 | Documentation understandable? | pass | One stale test `describe` name, see Nit. |
| I1 | Satisfies the requirements? | fail | Items 1–8 of "Sesja cardio" are present, but the Meta rows do not use the Meta type role. |
| I2 | Logically correct? | pass | Phase words, ceil clock, floor "Razem", last-interval text and segment state follow the view. |
| I3 | No unnecessary complexity? | pass | One component, one new view field. |
| I4 | Robust? | pass | One workout at a time is kept; the end-confirm keeps the session running. |
| I5 | Performant? | n/a | One computed view per 250 ms tick; at most a few hundred segments. |
| I6 | Secure? | n/a | No input, no network. |
| I7 | Observable? | n/a | No new failure path. |
| I8 | New dependencies? | n/a | No manifest change. |
| ARCH | Project rules | fail | All rules met except the DESIGN.md Meta type role (details below). |

Architecture — project rules that bind this phase:

- Violet only on the cardio field and the tag → meets (`.cardio-field` uses `--cardio`; buttons use `--on-cardio`).
- Main action on-cardio, not chalk; no chalk button on the screen → meets.
- Touch targets 56 px, 64 px for the main action → meets (E2: 64 / 56 / 56 px).
- Biggest element is the Clock (9rem) → meets.
- Thumb Rule: actions at the bottom → meets (E2: Pauza top 767 of 915).
- No emoji, no gradient, no left stripe → meets.
- `prefers-reduced-motion` turns off the bar transition → meets.
- Time from timestamps, never ticks → meets (the screen reads `getCardioView(state, now())`; tests move the clock with no ticks).
- Storage keys and stored shapes unchanged; strength restore still works → meets (`a saved strength workout still restores…`).
- Wake lock: `useWorkout` before `useCardio`, plus App-level tests → meets (E1).
- Strength screens and texts unchanged → meets.
- DESIGN.md type scale: Meta is "Barlow Condensed 700, 1,125rem, wersaliki, cyfry tabelaryczne" → **fails** (E2: body font, 600, no uppercase).

Blockers: 0 · Major: 2 · Minor: 1 · Nit: 3
Findings going back to a builder: `meta-row-type-role`, `cross-kind-expiry-dismiss-unpinned`

## Findings

### I1 / ARCH. Satisfies the requirements and the project rules?

- **[Major]** `meta-row-type-role` — `src/components/CardioSession.vue:127` — The two Meta rows (plan name + „Interwał X z Y”, and „Razem” + „Zostało”) use `font-size: var(--text-meta)` with `font-weight: 600`, the inherited body font and no `text-transform`. DESIGN.md Typography defines Meta as "Barlow Condensed 700, 1,125rem, wersaliki, cyfry tabelaryczne", and the approved preview `documentation/system-design.html:263` has `.cardio-screen .meta { font: 700 1.125rem var(--font-num); text-transform: uppercase; }`. CLAUDE.md says code and DESIGN.md must not disagree silently. I rate it Major, not Blocker: it uses only existing tokens and invents no color, font or size, but it applies the wrong type role. **Fails when:** any cardio session is on screen → E2 measures `"Barlow Semi Condensed", 600, none` on `.meta-row`, and the screenshots show "Interwał 1 z 4" and "Razem 0:06" in mixed case instead of "INTERWAŁ 1 Z 4" / "RAZEM 0:06" in the display font.

### Test adequacy

- **[Major]** `cross-kind-expiry-dismiss-unpinned` — `src/App.vue:61` — `startPlan` clears the expiry notice of both kinds after a start ("clear the other kind's notice too, or it comes back later"). No test covers a start of one kind while the other kind's notice shows. The test `the expiry notice goes away when a cardio session starts` (`CardioSession.test.ts:500`) uses a cardio expiry and a cardio start, so `cardio.start` clears its own flag and the App line is never needed. **Fails when:** the line is removed (E4) → all 731 tests stay green, but a strength expiry notice comes back on the plan list after the user starts and ends a cardio session (E5 red on the mutant, green on the real tree).
- **[Minor]** `dense-timeline-boundary-loose` — `src/components/CardioSession.test.ts:250` — The test "narrow timeline gap above 24 segments" uses 26 and 24 segments. 25 segments, the first value above 24, is not tested. **Fails when:** the rule becomes `> DENSE_TIMELINE_SEGMENTS + 1` (E3) → all 35 tests stay green, and a 25-interval plan gets 4 px gaps instead of 2 px. The effect is small; the gaps still fit at 412 px.

### Nits

- **[Nit]** `stale-describe-name` — `src/components/CardioStored.test.ts:46` — The `describe` still says "a cardio plan in storage, before the cardio screens exist". Its test now starts the cardio session screen.
- **[Nit]** `clock-line-height` — `src/components/CardioSession.vue:171` — `.clock` has `line-height: 0.9`. DESIGN.md Clock is 0,85.
- **[Nit]** `title-role-case` — `src/components/CardioSession.vue:159,230` — `.interval-name` and `.next-row` use the Title size and weight but not its uppercase and 0,02em letter spacing. The strength "Dalej:" row (`WorkoutSet.vue:85`) has the same style, and the cardio preview does not show these rows, so this follows the existing practice. Report it to the owner as a DESIGN.md question, not as a builder fix.

## Not reviewed

- A real sound through a speaker and a real phone lock: not observable by the browser driver (D9 is owner-run).
- The walker could not use `page.clock.pauseAt` (the driver hung), so its fake clock ran in real time with `runFor` jumps. The checks it reports do not depend on a fully stopped clock.
- Lock mode is phase 6; „Zablokuj” is a no-op button here, as the contract allows.

## Observations outside scope

- With the end-confirm open, a session that reaches its planned end shows the end screen with the confirm still on top (`App.vue:116,124`). „Zakończ trening” then ends it as expected. This behaviour comes from the phase 3 `useCardio` controller.
