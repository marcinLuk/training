# Phase review — feat-mvp-plans-workout-loop · Phase 5: Workout screens, rest timer and sound · round 3

- **Scope:** `git diff HEAD` plus untracked files: `src/App.vue`, `src/components/{PlanList.vue,PlanList.test.ts,WorkoutSet.vue,WorkoutRest.vue,WorkoutEnd.vue,Workout.test.ts}`, `src/workout/{useWorkout.ts,sound.ts,sound.test.ts}`, `src/lib/{clock.ts,clock.test.ts}`, `src/styles/base.css`, `DESIGN.md` (2 lines), `brief.md` (Progress checkboxes 5.1–5.3 only)
- **Files reviewed:** 14 (`+1145/-9` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 5` Progress rows 5.1–5.5 and Slice details, plus the two binding decisions (action guard; sound rule)
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 5.1 | component tests for Start, set view, rest view, clock-moved rest end with the sound once, "Gotowy, zaczynam", end screen and "Wróć do planów" | `timeout 300 npx vitest run src/components` | pass — `Test Files 5 passed (5)`, `Tests 57 passed (57)` |
| 5.2 | `npm test` exits 0 | `timeout 300 npm test` | pass — `Test Files 12 passed (12)`, `Tests 216 passed (216)`, `EXIT=0` |
| 5.3 | `npm run build` exits 0 | `timeout 300 npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 220ms`, `EXIT=0` |

No `.skip`, `.only`, `.todo` or `describe.skip` in `src/` (`grep -rnE '\.(skip|only|todo)\(|describe\.skip|it\.skip' src` → no match). 0 skipped tests.

### Closures (rounds after the first)

Each closure was proven by running a wrong implementation in a scratch mutant copy (`scratchpad/mutant`, `vitest run src/components`). Production code was not touched.

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `plan-card-start-below-64px` | round 2 | yes | Mutant A (`btn-large` removed from the card Start) → `Tests 1 failed` — `makes each Start the main action and "Nowy plan" secondary when there are plans`. Browser at 412×915: `Start: Wiosłowanie i przysiady` `h: 64`, `bg: rgb(242, 242, 239)`; "Nowy plan" `h: 56`, transparent. |
| `start-plan-lookup-unpinned` | round 2 | yes | Mutant B ("always start the last plan") → 3 failed (`starts the plan of the tapped card: Start: Wiosłowanie i przysiady`, `…: Start: Plecy`, `starts the right plan again…`). Mutant C ("always start the first plan") → 3 failed (`…: Start: Plecy`, `…: Start: Nogi`, `starts the right plan again…`). |
| `guard-window-size-unpinned` | round 2 | yes | Mutants on `ACTION_GUARD_MS`: 50 → 3 failed; 60 000 → 3 failed; 399 → 1 failed; 601 → 1 failed (`is between 400 and 600 ms`). A literal in the code that differs from the constant (`now() + 160`, constant still 500) → 1 failed (the `ACTION_GUARD_MS - 1` boundary test); `now() + 1000` → 18 failed. The literal-time tests (`150 ms` ignored, `700 ms` accepted) do not use the constant. |

Earlier closed ids, re-checked by mutation — none is back:

| id | Mutant | Result |
| :-- | :-- | :-- |
| `double-tap-crosses-screens` | guard removed (`guarded` always false) | 6 failed |
| `gotowe-audio-unlock-unpinned` | `unlockAudio()` removed from `finishSet` / from `start` | 1 failed each |
| `rest-time-rounding-unpinned` | `Math.ceil` → `Math.round` / `Math.floor` | 1 failed each |
| `hidden-rest-end-later-silence-unexercised` | "visible at detection" check removed | 1 failed (`stays silent when the page is hidden at the rest end, and plays nothing later`) |

Decision clauses, by mutation (all killed):

| Clause | Mutant | Result |
| :-- | :-- | :-- |
| guard measured from the screen change | no guard set when the rest ends by itself (`state.value = resolved` in `refresh`) | 1 failed |
| a deliberate tap after the window always works | guard re-armed by each ignored tap (debounce) | 1 failed |
| guard covers "Wróć do planów" | `leave()` unguarded | 1 failed |
| guard never lengthens a rest | rest started at `at + ACTION_GUARD_MS` | 3 failed |
| sound: visible at the rest's end time | `visibleAtEnd` dropped | 1 failed |
| sound: ≤ 2 000 ms late (boundary inclusive) | `<=` → `<`; limit 1 500; limit 5 000 | 1 failed each |
| sound once per rest end | `playRestEnd()` called twice | 3 failed |
| time from timestamps, not ticks | `clockMs += DISPLAY_TICK_MS` per refresh (tick counter) | 3 failed |

One mutant survived and is behaviour-equivalent in this phase: `refresh` returning early while the guard is active. A rest is at least 15 s and nothing commits during a rest in Phase 5, so a rest end can never fall inside a guard window. Not a finding; it becomes reachable in Phase 7 ("−15 s").

### Manual (performed with playwright-cli 0.1.14, session `mvp-p5-r3`, `vite preview` on port 4199, 412×915)

The plan was built through the app's editor: "Wiosłowanie i przysiady" = "Wiosłowanie" 2×10, 0:15 and "Przysiady" 2×12, 0:15. Stored: `trening.plans.v1={"version":1,"plans":[{… "sets":2,"reps":10,"restSeconds":15},{… "sets":2,"reps":12,"restSeconds":15}]}`. `AudioContext` was wrapped by an init script to count contexts, `resume()` calls and oscillators.

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 5.4 | at 412×915: run a plan with 2 exercises × 2 sets and a 15 s rest from start to the end screen: the set view shows the exercise, the reps, the sets left as the biggest number and "Dalej:"; the rest view counts down from 0:15 and the set view returns by itself; the end screen leads back to the plan list (D3) | passed | `p5-r3-5.4-set-1.png`: `heading "Wiosłowanie"`, `paragraph: 10 powtórzeń`, `paragraph: "2"` + `serii zostało`, `paragraph: "Dalej: Przysiady"`, `button "Gotowe"`; font sizes 36 / 56 / **176** / 22 px (sets left is the biggest); Gotowe `h: 64`, top 803. Rest: the snapshot taken by the Gotowe click shows `timer "Pozostały czas przerwy": 0:15`, `"Dalej: Wiosłowanie, seria 2 z 2"` (`p5-r3-5.4-rest-0-15.png`, captured at 0:13). Sampling every 250 ms: `0:01 … 0:01`, then `h1 "Wiosłowanie"`, sets left `1` (`p5-r3-5.4-set-2.png`). Third set `To ostatnie ćwiczenie` (`p5-r3-5.4-set-3-last-exercise.png`), fourth set `"1"` + `To ostatnia seria` (`p5-r3-5.4-set-4-last-set.png`). End: `paragraph: Wiosłowanie i przysiady`, `heading "Koniec treningu"`, one button `Wróć do planów` `h: 64`, chalk (`p5-r3-5.4-end.png`). A tap 33 ms after the end screen opened was ignored (`h1 "Koniec treningu"`); a deliberate tap 800 ms later → `heading "Plany"`, `list "Zapisane plany"`, `2 ćwiczenia, 4 serie` (`p5-r3-5.4-back-to-list.png`). Console: `Total messages: 0`. |
| 5.5 | at 412×915: "Gotowy, zaczynam" ends a running rest at once (D3) | passed | Before: `timer: "0:07"`, `"Dalej: Przysiady, seria 1 z 2"` (`p5-r3-5.5-rest-before.png`). Tap at t=…028304 → at t=…028316 (12 ms): `h1 "Przysiady"`, sets left `2`, no timer, `To ostatnie ćwiczenie` (`p5-r3-5.5-after-ready.png`). Oscillators unchanged (3): no sound on an early end. |
| extra | sound fires once on a normal visible rest end | passed (call, not audibility) | After Start: `contexts: 1`. First rest end: `oscillators: 3`, `beepTimes` all at …002256–257, `vis: "visible"`; still 3 on the next set. Second natural rest end: 6 (three more at …053526), still 6 after 3 s more. The early-ended rest added none. |
| extra | plan-card Start measures 64 px | passed | `{"name":"Start: Wiosłowanie i przysiady","h":64,"w":346,"bg":"rgb(242, 242, 239)"}` (`p5-r3-5.4-plan-list.png`). |
| extra | "Wróć do planów" works on a deliberate tap | passed | See 5.4: ignored at +33 ms, accepted at +800 ms → plan list. |
| probe | double tap in the browser | passed | Two clicks 80 ms apart on Gotowe → `h1 "Przerwa"`, `0:15` (second tap ignored); two clicks on "Gotowy, zaczynam" → `h1 "Wiosłowanie"`, sets left `1` (no phantom set) (`p5-r3-probe-double-tap-gotowe.png`). |
| probe | double tap on "Wróć do planów" with 6 plans | see `start-after-back-unguarded` | Start buttons at top 161 / 335 / 509 / 683 / **856–920**; "Wróć do planów" spans 803–867. Two clicks at (206, 862) 4 ms apart: `a1 h1 "Plany"`, `a2 h1 "Wiosłowanie"`, sets left `2` — the second tap started the plan of the 5th card (`p5-r3-probe-double-tap-back.png`). |

Port 4199 was free and used. The preview was killed afterwards; `curl -s -m 1 localhost:4199` fails.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | CONCERNS |
| I1 | Does it satisfy the original requirements? | PASS |
| I2 | Is it logically correct? | CONCERNS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | PASS |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 0 · Minor: 5 · Nit: 1

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`useWorkout.ts` documents the guard constant, the sound rule and the timer's role; `sound.ts` documents the gesture rule and the no-throw contract. `DESIGN.md` got the two lines the slice asks for.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule |
| ADR | no | — | none in this repo |
| TSDoc | yes | yes | constants and composable |
| DESIGN.md | yes | yes | "To ostatnie ćwiczenie" / "To ostatnia seria" line; plan list main action line |
| Translations | n/a | — | Polish literals by design |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** CONCERNS

- **[Minor]** `settle-before-tap-docblock-overclaims` — `src/workout/useWorkout.ts:76-80` — the docblock says a run-out rest is settled first "or the tap would be dropped". That holds for neither caller: "Gotowe" exists only in the set view (the view's mode is the state's mode, so `finishSet` never sees a rest state), and `endRestEarly` ends a rest in rest mode whether or not it ran out. A reader will believe a lost-tap path exists here. Reword to what the settle really does (it resolves the rest so the commit and the guard start from the set state).

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS

| Requirement | Implemented in | Status |
| :-- | :-- | :-- |
| "Start" on each plan card starts that plan | `PlanList.vue:16-23`, `App.vue:22-25` | met |
| Set view: Headline name, Figure reps, Counter sets left + "serii zostało", "Dalej:" / "To ostatnie ćwiczenie" / "To ostatnia seria", "Gotowe" 64 px chalk at the bottom | `WorkoutSet.vue` | met |
| Rest view: ring, Figure m:ss from timestamps, "Dalej:" next set, "Gotowy, zaczynam" 64 px chalk; timer only re-renders; whole-screen change at rest end | `WorkoutRest.vue`, `useWorkout.ts:36-38,61-74,121-128` | met |
| End screen per DESIGN.md "Ekran końca" | `WorkoutEnd.vue` | met |
| `sound.ts`: Web Audio beeps, context created/resumed in Start and "Gotowe", feature-checked, once per rest end seen while visible | `sound.ts`, `useWorkout.ts:71-73,87,94` | met |
| Clock seam | `lib/clock.ts` | met |
| Decision 1: guard 400–600 ms, one named constant, from the screen change, includes "Wróć do planów", deliberate tap works, never lengthens a rest | `useWorkout.ts:23,45-53,96,103,110` | met (see Closures) |
| Decision 2: sound only if visible now, visible at the end time, ≤ 2 000 ms late | `useWorkout.ts:68-73` | met (see Closures) |
| Component tests for every 5.1 clause | `Workout.test.ts`, `PlanList.test.ts` | met |

### I2. Is it logically correct?

**Verdict:** CONCERNS

- **[Minor]** `start-after-back-unguarded` — `src/workout/useWorkout.ts:86-91` (`start` does not read `guarded`) — the guard window that `leave()` arms (`commit(null)`) is never checked on the plan list. **Fails when:** the user has 5 or more plans and double-taps "Wróć do planów": the second tap lands on the 5th card's Start (856–920 px under the 803–867 px end-screen button at 412×915) and starts a workout from a plan the user did not choose (browser probe above: `a2 h1 "Wiosłowanie"`, 4 ms after `a1 h1 "Plany"`). With 4 plans the second tap lands on "Nowy plan" and opens the editor. The round-3 decision says the guard covers the "Wróć do planów" tap, which the code does; whether it also covers the screen that tap opens is for the owner. No data is lost; one check of `guarded(now())` in `start` would close it.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

`useWorkout` is one composable with one `commit` path; no extra layers.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

Missing `AudioContext`, a throwing constructor, a rejected `resume()` and a throwing `createOscillator` are each tested in `sound.test.ts`. The interval is cleared on mode change and on unmount (`stops the display timer…`).

### I5. Is it performant?

**Verdict:** PASS

One 250 ms interval only during a rest; it does no work beyond a clock read and a computed view.

### I6. Is it secure (SQL injection, …)?

**Verdict:** PASS

No network calls, no `window.confirm`, no HTML injection (`grep` for `fetch(`, `XMLHttp`, `window.confirm`, `http` in `src` → none).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A

Client-only app with no logging layer; no stray `console.*` added.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A

`package.json` is unchanged in this phase.

---

## Architecture — the project's own rules

- "Rest time comes from timestamps … never count timer ticks" → meets — `getView(state, clockMs)`; tick-counter mutant S killed (3 tests).
- "Every behavioural clause is pinned by a Vitest unit or component test" → meets — every clause of 5.1 and of the two decisions has a killed mutant above.
- "One chalk primary action per screen" → meets on the workout screens (one button each: Gotowe / Gotowy, zaczynam / Wróć do planów). On the plan list see `plan-list-multiple-chalk-starts`.
- "Biggest number is sets left (rest time during rest)" → meets — 176 px counter; 56 px time is the largest text in the rest view.
- "Touch targets 56 px (64 px for the main action)" → meets — Start, Gotowe, Gotowy zaczynam, Wróć do planów all `h: 64`.
- "Polish UI text; no emoji; no gradients; dark only; DESIGN.md tokens only" → meets — `base.css` adds only `min-height: 100dvh` and `margin-top: auto`; the ring uses `--line` / `--chalk`.
- **[Minor]** `plan-list-multiple-chalk-starts` — `src/components/PlanList.vue:18`, `DESIGN.md:233` — every card's Start is chalk, so a list with 3 plans shows 3 chalk buttons. DESIGN.md says both "Start jako główna akcja" (per card) and "jedna główna akcja na ekran" (The Chalk Rule); the diff's DESIGN.md line now states the plural reading. The builder followed the brief ("Start is the card's main action") and wrote the choice down, but the owner should confirm it, because it relaxes a key design rule on this screen.
- **[Minor]** `design-md-last-exercise-line-reworded` — `DESIGN.md:245` — the approved line said the last exercise shows "To ostatnia seria"; it now assigns "To ostatnie ćwiczenie" to the last exercise and "To ostatnia seria" to the last set of the plan. This follows the slice details ("add the missing string to DESIGN.md"), but it rewrites an approved sentence, not only adds one. Owner to confirm.
- **[Nit]** `next-row-title-not-uppercase` — `src/components/WorkoutSet.vue:74-80`, `WorkoutRest.vue:94-100` — DESIGN.md sets the "Dalej:" row in Title, and Title is "wersaliki, 0,02em". The row uses the Title font, size and weight but no `text-transform: uppercase` and no `letter-spacing`.

## Test adequacy

- **[Minor]** `hidden-return-test-skips-hide-event` — `src/components/Workout.test.ts:269-278` — "stays silent when a rest that ended while hidden is first seen at the return" never dispatches the hide `visibilitychange`, so `visibleSince` stays set and the silence comes only from the 2 s lateness rule (60 s late). The "visible at the rest's end" clause is still pinned by the next test (line 280; mutant N killed), so no defect can pass; the name over-states what this case checks. Dispatch the hide event, or rename it to the lateness case it is.

## Not reviewed

- Audibility of the beep, a real screen lock and app switch, and Wake Lock: owner-run on the phone (D10). The browser evidence proves the oscillator calls only.
- The hidden-page sound rule in a real browser: playwright-cli cannot hide the page. It is pinned by the component tests and the mutants above.
- Harness note: in one scripted run, `page.waitForTimeout(700)` returned after about 167 ms of page time, and the next "Gotowe" was (correctly) ignored by the guard. A traced re-run with the same script showed 700 ms gaps and a clean run to the end screen. I judged this a harness timing artefact, not an app fault.

## Observations outside scope

- `src/App.vue` still has no persistence of the running workout; a reload in Phase 5 drops it. Phase 6 owns this (FR-009).
