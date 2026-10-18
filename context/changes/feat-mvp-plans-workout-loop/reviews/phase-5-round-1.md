# Phase review — feat-mvp-plans-workout-loop · Phase 5: Workout screens, rest timer and sound · round 1

- **Scope:** `git diff HEAD` (base `e2ffda4`) plus untracked files: `src/lib/clock.ts` + test, `src/workout/sound.ts` + test, `src/workout/useWorkout.ts`, `src/components/{WorkoutSet,WorkoutRest,WorkoutEnd}.vue`, `src/components/Workout.test.ts`, `src/components/PlanList.vue` + test, `src/App.vue`, `src/styles/base.css`, `DESIGN.md`, `brief.md` (Progress rows 5.1–5.3). Not this phase: `auto-loop.md`, `roadmap.md`, `workbench.md`, `.loop-baseline`.
- **Files reviewed:** 15 (`+877/-14` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 5` Progress rows and `## Slice details` → Phase 5
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 5.1 | component tests for Start, set view, rest view, rest end + sound once, early end, end screen | `timeout 300 npx vitest run src/components` | pass — `Test Files 5 passed (5)` · `Tests 39 passed (39)` |
| 5.2 | full suite | `timeout 300 npm test` | pass — `Test Files 12 passed (12)` · `Tests 198 passed (198)` |
| 5.3 | build | `timeout 300 npm run build` | pass — `vue-tsc -b && vite build` · `✓ built in 196ms` |

Skipped / todo tests: 0 (`grep -rnE "\.(skip|only|todo)\b" src` → nothing). Never-weaken scan of the new files (`@ts-*`, `as any`, `as unknown as`, `window.confirm`, `fetch(`, `http(s)://`): clean. No `package.json`, `package-lock.json` or `tsconfig*.json` change.

### Wrong-implementation table (mutant copy in the scratch dir, `vitest run src/components`)

| Mutant | Change | Suite result | Probe (proves the mutant changes behaviour) |
| :-- | :-- | :-- | :-- |
| M1 | remove `unlockAudio()` from `finishSet` ("Gotowe") | **39 passed — survives** | P1 "Gotowe tap resumes the audio context" fails on M1, passes on the original |
| M2 | `Math.floor` instead of `Math.ceil` in `WorkoutRest.vue:13` | **39 passed — survives** | P2 "0:15 after 250 ms, 0:01 at 14.5 s" fails on M2, passes on the original |
| M3 | `Math.round` instead of `Math.ceil` | **39 passed — survives** | differs from ceil when less than 0.5 s is left (0:00 shown while the rest runs) |
| M4 | `settled()` returns the state without `resolveRest` | 39 passed — survives | equivalent in the Phase 5 UI (see `settle-before-tap-docblock-overclaims`) |
| M5 | a rest end seen while hidden plays the sound on the next `visibilitychange` | **39 passed — survives** | P5 "a rest end seen while hidden plays nothing on return" fails on M5, passes on the original |
| M6 | tick counter: `refresh` adds 250 ms to the shown clock instead of reading `now()` | 5 failed — killed | — |
| M7 | no `removeEventListener` on unmount | 1 failed — killed | — |
| M8 | sound also on "Gotowy, zaczynam" | 1 failed — killed | — |
| M10 | no display interval | 4 failed — killed | — |
| M12 | last-exercise check before last-set check | 1 failed — killed | — |
| M14 | `App.startPlan` starts `plans[0]`, not the plan with the tapped id | **39 passed — survives** | P14 "Start on the second card starts the second plan" fails on M14, passes on the original |
| M16 | sound plays when the page is hidden | 1 failed — killed | — |
| M17 | no `stopTimer()` on unmount | 1 failed — killed | — |
| M18 | "Dalej:" shows the current exercise | 1 failed — killed | — |

Probe file: 4 tests, `Tests 4 passed (4)` on the original copy; each listed mutant fails its probe (`× P1…`, `× P2…`, `× P5…`, `× P14…`).

### Manual (performed with playwright-cli 0.1.14, session `mvp-p5-r1`, 412×915, `vite preview --port 4199 --strictPort` on a fresh `npm run build`)

Port note: port 4199 bound with no problem (`➜ Local: http://localhost:4199/`, `curl` → `200`). After `kill`, `ss -ltn` shows no listener on 4199 (`curl -m 1` exits 28, the same Windows-side timeout seen in Phase 4).

Plan built through the app's own editor: "Wiosłowanie i przysiady", "Wiosłowanie" 2 × 10, rest 0:15; "Przysiady" 2 × 12, rest 0:15. Stored: `trening.plans.v1={"version":1,"plans":[{…"name":"Wiosłowanie i przysiady","exercises":[{…"name":"Wiosłowanie","sets":2,"reps":10,"restSeconds":15},{…"name":"Przysiady","sets":2,"reps":12,"restSeconds":15}]}]}`. `AudioContext` instrumented with an init script (counts contexts, `resume()` calls and oscillators; 3 oscillators = one beep pattern).

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 5.4 | at 412×915: run a plan with 2 exercises × 2 sets and a 15 s rest from start to the end screen: the set view shows the exercise, the reps, the sets left as the biggest number and "Dalej:"; the rest view counts down from 0:15 and the set view returns by itself; the end screen leads back to the plan list (D3) | passed | `reviews/screenshots/p5-r1-5.4-set-1.png`: snapshot `heading "Wiosłowanie" [level=1]`, `paragraph: 10 powtórzeń`, `paragraph: "2"`, `paragraph: serii zostało`, `paragraph: "Dalej: Przysiady"`, `button "Gotowe"`. Measured: counter `fontSize 176px` (11rem), figure `56px`, h1 `36px`; "Gotowe" `h 64`, `top 803` of 915 (lower half), chalk `rgb(242, 242, 239)`, the only button. `p5-r1-5.4-rest-0-15.png`: first read right after the tap `"first":"0:15"`; samples `0:07 … 0:01` then `Wiosłowanie|null|1|osc=3` (set view returned by itself, 0:00 never shown); audio after 2 more s `{"contexts":1,"oscillators":3,…}` (one pattern). Second rest: `"Dalej: Przysiady, seria 1 z 2"`, ended by itself, `oscillators 6`. `p5-r1-5.4-set-3-last-exercise.png`: `"h1":"Przysiady","reps":"12 powtórzeń","sets":"2","next":"To ostatnie ćwiczenie"`. `p5-r1-5.4-set-4-last-set.png`: `"To ostatnia seria"`, sets `1`. `p5-r1-5.4-end.png`: `"Wiosłowanie i przysiady KONIEC TRENINGU Wróć do planów"`, one button `h 64`, chalk. `p5-r1-5.4-back-to-list.png`: `"h1":"Plany"`, `"2 ćwiczenia, 4 serie Start Nowy plan"`. Console: `Total messages: 0`. |
| 5.5 | at 412×915: "Gotowy, zaczynam" ends a running rest at once (D3) | passed | `p5-r1-5.5-rest-before.png`: `"timer":"0:15"` at the tap, `"0:13"` 2 s later; `p5-r1-5.5-after-ready.png`: read in the same script right after the click `{"h1":"Przysiady","sets":"1","next":"To ostatnia seria","timer":null}`; 16 s later `osc` still `6` (no sound for an early end). |

Extra browser evidence (not a manual item):

- **Timestamps, not ticks.** In a rest showing `0:15`, the page clock was moved +10 s (`Date.now = () => real() + 10000`). After `301` ms of real time (about one 250 ms tick) the screen showed `"0:05"`. One tick cannot explain a 10 s step.
- **Double tap.** Two taps 150 ms apart on the same point: on "Gotowe" → `{"h1":"Wiosłowanie","sets":"1","timer":null}` (the rest was ended by the second tap). On "Gotowy, zaczynam" → `{"h1":"Przerwa","timer":"0:15"}`, then after that rest `{"h1":"Przysiady", sets "1", "To ostatnia seria"}`: set 1 of "Przysiady" was marked done with no "Gotowe" tap meant for it. Screenshots `p5-r1-probe-double-tap-gotowe.png`, `p5-r1-probe-double-tap-ready.png`, `p5-r1-probe-after-phantom-set.png`. See `double-tap-crosses-screens`.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS (one Minor) |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | FAIL (test gaps on brief clauses) |
| I2 | Is it logically correct? | FAIL |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | N/A |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 0 · Major: 5 · Minor: 3 · Nit: 1

Findings going back to a builder: `double-tap-crosses-screens`, `gotowe-audio-unlock-unpinned`, `start-plan-lookup-unpinned`, `rest-time-rounding-unpinned`, `hidden-rest-end-later-silence-unexercised`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

Each new module has a short "why" docblock (`clock.ts:1-4`, `sound.ts:1-5`, `useWorkout.ts:18-22`). One docblock claims more than the code does.

- **[Minor]** `settle-before-tap-docblock-overclaims` — `src/workout/useWorkout.ts:48-52` — the docblock says a run-out rest "is resolved first, or the tap is lost". No tap is lost without it. "Gotowe" renders only when `state.mode === 'set'` (`App.vue:35`), so in `finishSet` the `resolveRest` call never changes anything. In `endRest` the only effect is that `endRestEarly` then sees set mode and returns the state unchanged, so the user's tap does not set `lastActivityAt` (the brief says every user action sets it). Mutant M4 (no `resolveRest`) passes all 39 tests and gives the same screens. It is a harmless safety net with a wrong reason; the gap it leaves for Phase 6 expiry is at most one rest length (≤ 10 min of a 2 h window).

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | no new command |
| CLAUDE.md | no | — | no new rule or command |
| ADR | no | — | none in this repo |
| TS docblocks | yes | yes | see D1 |
| DESIGN.md | yes | yes | 2 lines changed, see I1 Minors |
| Translations | n/a | — | Polish literals in templates is the project's way |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS — no significant typos in the docblocks or the two DESIGN.md lines.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** FAIL — the code does what the slice asks, but three brief/docblock clauses have no assertion (Majors below).

| Requirement (Phase 5 slice details / rows) | Implemented in | Status |
| :-- | :-- | :-- |
| "Start" on each plan card starts a workout from that plan | `PlanList.vue:16-23`, `App.vue:22-25` | met; App lookup unpinned (`start-plan-lookup-unpinned`) |
| Set view: Headline name, Figure reps, Counter sets left + "serii zostało", "Dalej:" row, "Gotowe" 64 px chalk at the bottom | `WorkoutSet.vue:17-33` | met (browser: 176 px counter, 64 px button at top 803/915) |
| "Dalej:" on the last exercise "To ostatnie ćwiczenie", on the last set "To ostatnia seria"; string added to DESIGN.md | `WorkoutSet.vue:9-14`, `DESIGN.md:245` | met; see `design-md-last-exercise-line-reworded` |
| Rest view: ring, Figure m:ss from stored timestamps, "Dalej:" next set, "Gotowy, zaczynam" 64 px chalk | `WorkoutRest.vue` | met; rounding clause unpinned (`rest-time-rounding-unpinned`) |
| Display timer only triggers renders; value from `getView(state, now)` | `useWorkout.ts:25-28,37-46` | met (M6 tick counter killed; browser +10 s jump → 0:05 after 301 ms) |
| The screen changes as a whole when the rest ends | `App.vue:34-43` | met |
| End screen per "Ekran końca" | `WorkoutEnd.vue` | met |
| `sound.ts`: Web Audio beeps; context created or resumed inside Start and "Gotowe"; feature-checked | `sound.ts`, `useWorkout.ts:55,62` | met; "Gotowe" part unpinned (`gotowe-audio-unlock-unpinned`) |
| Plays once per rest end observed while the page is visible | `useWorkout.ts:43-45` | met; "nothing later" part unexercised (`hidden-rest-end-later-silence-unexercised`) |
| Clock seam `src/lib/clock.ts` | `clock.ts` | met |
| Component tests named in row 5.1 | `Workout.test.ts`, `PlanList.test.ts` | present |

- **[Major]** `gotowe-audio-unlock-unpinned` — `src/workout/useWorkout.ts:62` — the brief says the `AudioContext` "is created or resumed inside the Start and "Gotowe" taps". Only Start is asserted (`Workout.test.ts:104-109`). Mutant M1 (delete `unlockAudio()` from `finishSet`) passes all 39 tests, because the fake context starts in `state = 'running'` and no test counts `resume()` calls on a "Gotowe" tap. **Fails when:** Phase 6 resumes a workout after a reload (no Start tap, the "Gotowe" tap is the only gesture) or Chrome suspends the context while the page is hidden: with the call gone, the rest-end beep is silent and no test notices. Pin it: a suspended fake context, then assert `resume()` (or context creation) happens inside the "Gotowe" tap.
- **[Major]** `start-plan-lookup-unpinned` — `src/App.vue:22-25` — every App-level test saves one plan (`Workout.test.ts:85`). Mutant M14 (`startPlan` takes `plans.value[0]`) passes all 39 tests; `PlanList.test.ts:53-57` pins only the emitted id, not what App does with it. **Fails when:** the user has two plans and taps "Start" on the second card: a broken lookup starts the first plan, and the suite stays green. Pin it with two saved plans and a Start on the second card, asserting the second plan's first exercise in the set view.
- **[Major]** `rest-time-rounding-unpinned` — `src/components/WorkoutRest.vue:12-13` — the docblock claims "Whole seconds, rounded up, so a fresh 15 s rest reads 0:15 and 0:00 means it is over". Every test reads the time at a whole second (`0:15` at 0 ms, `0:04` at 11 000 ms), where floor, round and ceil agree. Mutants M2 (`Math.floor`) and M3 (`Math.round`) pass all 39 tests. **Fails when:** floor is used: the screen shows `0:14` 250 ms after "Gotowe" and `0:00` for the whole last second while the rest is still running. Pin it with a read between whole seconds (for example 250 ms and 14 600 ms after "Gotowe").
- **[Major]** `hidden-rest-end-later-silence-unexercised` — `src/components/Workout.test.ts:195-202` — the test name says "stays silent when the page is hidden at the rest end, and plays nothing later", but the test never makes the page visible again. Mutant M5 (remember a rest end seen while hidden and beep on the next `visibilitychange`) passes all 39 tests. The brief clause is "plays once per rest end observed while the page is visible". **Fails when:** a later change defers the beep to the return, and the user hears a stale beep minutes after the rest ended, with the test still green. Add the "later" half: set `visibility = 'visible'`, dispatch `visibilitychange`, assert no sound.
- **[Minor]** `design-md-last-exercise-line-reworded` — `DESIGN.md:245` — the approved line was "…a ostatnie ćwiczenie pokazuje „To ostatnia seria"". It now reads "…ostatnie ćwiczenie pokazuje „To ostatnie ćwiczenie", a ostatnia seria planu pokazuje „To ostatnia seria"". Read literally, this changes what the approved text shows on the last exercise, not only adds a missing string. The change matches the frozen brief ("on the last exercise "To ostatnie ćwiczenie"; on the last set of the plan "To ostatnia seria""), so it is not a breach. The owner should confirm the new reading of the approved line.
- **[Minor]** `plan-list-multiple-chalk-starts` — `DESIGN.md:233`, `src/components/PlanList.vue:16-23` — with N plans the list has N chalk "Start" buttons. DESIGN.md "The Chalk Rule" says one chalk main action per screen; Cards and Colors say "Start" is the card's chalk main action. The new DESIGN.md line ("główną akcją są przyciski Start na kartach") settles this tension in favour of one chalk Start per card. This is not a workout screen, and the brief asks for Start as each card's main action. The owner should confirm this reading.

### I2. Is it logically correct?

**Verdict:** FAIL

Answers to the focus questions:

- Remaining time comes only from timestamps: `view = getView(state, clockMs)` and `clockMs = now()` on every refresh (`useWorkout.ts:25-28,37-40`). M6 (tick counter) is killed by 5 tests, and the browser +10 s jump shows `0:05` after 301 ms.
- Sound once per rest end: the first `refresh` that sees the end commits and plays; any later `refresh` finds `resolved === current` and returns (`useWorkout.ts:42-45`). Browser: 3 oscillators per rest end, none 2 s later, none for an early end.
- One state-change function: every state write goes through `commit` (`useWorkout.ts:32-34`); `clockMs` is display-only. Phase 6 can save there.
- Interval and listener cleanup: the watch clears the interval when the mode leaves rest, and `onBeforeUnmount` clears both (M7, M17 killed).
- The `resolveRest` call before a tap: see `settle-before-tap-docblock-overclaims` — not reachable through "Gotowe"; on "Gotowy, zaczynam" it only changes `lastActivityAt`. A tap between the rest end and the next 250 ms tick is not lost with or without it.

- **[Major]** `double-tap-crosses-screens` — `src/App.vue:34-43`, `src/components/WorkoutSet.vue:29`, `src/components/WorkoutRest.vue:47` — "Gotowe" and "Gotowy, zaczynam" sit at the same place (`top 803`, `h 64`, both `.workout-action`). Vue swaps the screen between two taps, so the second tap of a double tap lands on the other screen's main action. **Fails when:** (a) a double tap on "Gotowe" (150 ms apart, browser) finishes the set and ends the new rest at once: `{"h1":"Wiosłowanie","sets":"1","timer":null}` — no rest timer, no sound. (b) A double tap on "Gotowy, zaczynam" ends the rest and marks the next set done with no tap meant for it: `{"h1":"Przerwa","timer":"0:15"}`, then "Przysiady" shows `1` set left and "To ostatnia seria". Case (b) records a set the user did not do — the exact error the product exists to prevent (PRODUCT.md: 0 skipped sets; FR-006 "one tap"; DESIGN.md scene "spocone palce"). There is no "Cofnij" until Phase 7, and no test covers a tap that arrives right after a screen change. Fix in the tap path (for example, ignore the main action for a short time after the workout mode changes), and pin it with a component test that clicks the main action twice in a row.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS — one composable, three small screens, a one-function clock seam. `settled()` is extra but small (see D1 Minor).

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS — `sound.ts` checks for `AudioContext`, catches a throwing constructor, a rejected `resume()` and a throwing `createOscillator` (all four tested in `sound.test.ts:86-126`). A missing audio API never blocks a screen change.

- **[Nit]** `return-beep-depends-on-hidden-tick` — `src/workout/useWorkout.ts:43-45,93-95` — if a throttled tick runs while the page is hidden, the rest resolves silently; if the page is frozen with no tick (screen lock on Android), the first `visibilitychange` resolves it and beeps on return. Both follow the brief text, but the user gets a beep on return only sometimes. Worth a decision in Phase 6 (resume).

### I5. Is it performant?

**Verdict:** PASS — a 250 ms interval runs only in rest mode and only re-renders one computed view. Bundle `83.41 kB` JS (`31.89 kB` gzip).

### I6. Is it secure (SQL injection, …)?

**Verdict:** N/A — no network, no storage write in this phase, no `v-html`.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A — client-only app with no logging policy; no stray `console.log` in the diff.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A — `package.json` and `package-lock.json` are unchanged.

---

## Architecture — the project's own rules

- "Rest time comes from timestamps … Never count timer ticks" → meets — M6 killed; browser +10 s jump.
- "The end-of-rest sound is made with the Web Audio API (no audio file)" → meets — `sound.ts` uses oscillators only; no audio asset in `dist/`.
- "one chalk primary action per screen" (workout screens) → meets — set, rest and end views each have exactly one button, chalk.
- "the biggest number is sets left (rest time during rest)" → meets — set view 176 px counter vs 56 px reps vs 36 px h1; rest view 56 px time vs 36 px h1.
- "touch targets 56 px (64 px for the main action)", Thumb Rule → meets — main actions `h 64`, `top 803` of 915.
- "All UI text is in Polish" → meets — "Gotowe", "Gotowy, zaczynam", "serii zostało", "Dalej:", "Przerwa", "Koniec treningu", "Wróć do planów", "Pozostały czas przerwy".
- "No emoji as icons, no gradients, no left color stripe", DESIGN.md tokens only → meets — only `var(--…)` tokens in the new CSS; the ring uses `--line` and `--chalk`.
- "Every behavioural clause is pinned by a Vitest unit or component test" → fails — see the four test-gap Majors.
- "Do not use plate colors / light theme / out-of-scope features" → meets.

## Not reviewed

- Whether the beep is audible on the owner's phone, in headphones (D10, owner-run). The browser walk proves only the call: 3 oscillators per rest end.
- Real screen lock and app switch on Android (D10; Phase 6 adds resume).

## Observations outside scope

- `curl -s -m 1 localhost:4199` returns exit 28 (timeout) after the server stops, not a "connection refused". `ss -ltn` shows no local listener. This is the Windows-side port seen in Phase 4, not a server left by this review.
