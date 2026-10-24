# Brief: Cardio module — interval sessions with sounds and lock mode

## Goal
The user creates cardio interval plans and runs a cardio session with sounds and lock mode, as
`context/foundation/prd-v2.md` and `DESIGN.md` describe.

## Done when
- D1 cardio plans: blocks × N repeats, intervals (name, time, type work/rest); create, edit and
  delete; plans stored before this change (no type field) load as strength plans — unit tests in
  `src/plans`
- D2 plan list: "Siła"/"Cardio" tag on every card, "Nowy plan" opens the "Jaki plan?" choice, the
  cardio editor per `DESIGN.md` — component tests + browser walk
- D3 engine: timeline after repeats, 3 s get-ready, current interval / time left / next /
  "Interwał X z Y" / Razem / Zostało computed from timestamps, pause and continue, end — unit tests
  that move the clock with no ticks
- D4 sound: 3 short beeps at 3, 2 and 1 s before each interval end (none for an interval shorter
  than 4 s), different work-start and rest-start sounds at 0, played only when the page is visible
  and at most 2 s late — unit tests
- D5 resume: a screen lock or app switch keeps the session running; a reload brings it back paused
  at the current interval; a session paused for more than 2 h expires with the strength expiry
  notice; a session found after its planned end shows the end screen; a saved strength workout
  still restores — fresh-mount tests
- D6 session screen per `DESIGN.md` "Sesja cardio" (violet field, Meta rows, Phase, Clock, bar,
  timeline, "Dalej:", Pauza/Wznów, Zablokuj, Zakończ with the "Zakończyć trening?" confirm, end
  screen) — component tests + browser walk at 412×915
- D7 lock mode: "Zablokuj" replaces the three buttons with the hold bar; a 2 s hold unlocks, a
  shorter hold does nothing, other touches do nothing; a reload removes the lock — component
  tests + browser walk
- D8 the strength workout behaves as before; a cardio session blocks the silent app update and
  keeps the screen on — `npm test` (baseline + new tests), update-policy and wake-lock tests
- D9 owner-run: the sounds are heard with the phone in a pocket, the screen stays on, behaviour
  after a real phone lock — on the owner's Android phone

## Out of scope
- Everything in the Non-Goals of `context/foundation/prd-v2.md` and `context/foundation/prd.md`
  (GPS, distance, heart rate, cardio history or statistics, voice, vibration, a guaranteed sound
  after a power-button lock, lock mode for the strength workout).
- Moving intervals or blocks up and down, and collapsing cards, in the cardio editor.
- A light theme or a theme switch.
- Any change to the strength editor, the strength workout screens or their texts, beyond the
  type tag on the plan card and the "Jaki plan?" step before the strength editor.

## Guardrails
- Project rules: `context/foundation/auto-loop.md` §9 and §10, and `DESIGN.md` (sections
  "Sesja cardio", "Edytor planu cardio", "Znacznik typu", "Wybór typu nowego planu", Colors
  "Cardio", The Chalk Rule exception, The Violet Rule).
- No new dependency.
- Storage keys stay `trening.plans.v1` and `trening.workout.v1`. Data stored before this change
  (strength plans, a running strength workout) stays readable and keeps its behaviour. The
  corrupt-copy step stays for both keys.
- Time comes from stored timestamps through `src/lib/clock.ts`; never count ticks.
- The existing strength tests stay as they are (no weakened, skipped or deleted test). The
  end-of-rest sound `playRestEnd` keeps its sound and its tests.
- Lock mode lives only in memory (a reload removes it).

## Research
See `research.md` (entry points: `src/plans/plan.ts:9`, `src/plans/planStore.ts:46`,
`src/workout/workoutStore.ts:97`, `src/workout/useWorkout.ts:44`, `src/App.vue:70`).

## Progress

### Phase 1: Cardio plan model and storage
#### Automated Verification:
- [x] 1.1 `npx vitest run src/plans` passes, including new tests for cardio validation, storage round trip, old-shape load and the summary (D1) — 4ac1247
- [x] 1.2 `npm test` shows 0 failing tests (baseline 0) (D1, D8) — 4ac1247
- [x] 1.3 `npm run build` exits 0 (D1) — 4ac1247

### Phase 2: Cardio session engine
#### Automated Verification:
- [x] 2.1 `npx vitest run src/workout/cardioEngine.test.ts` passes (D3, D4)
- [x] 2.2 `npm test` shows 0 failing tests (baseline 0) (D3, D8)
- [x] 2.3 `npm run build` exits 0 (D3)

### Phase 3: Cardio sounds, persistence and session controller
#### Automated Verification:
- [ ] 3.1 `npx vitest run src/workout` passes, including new tests for the cardio sounds, the stored cardio shape, restore after reload, expiry and the sound rule (D4, D5)
- [ ] 3.2 `npm test` shows 0 failing tests (baseline 0) (D5, D8)
- [ ] 3.3 `npm run build` exits 0 (D4)

### Phase 4: Plan list tags, plan type choice and cardio editor
#### Automated Verification:
- [ ] 4.1 `npx vitest run src/components` passes, including new tests for the tags, the "Jaki plan?" choice and the cardio editor (D2)
- [ ] 4.2 `npm test` shows 0 failing tests (baseline 0) (D2, D8)
- [ ] 4.3 `npm run build` exits 0 (D2)
#### Manual Verification:
- [ ] 4.4 at 412×915 on `vite preview`: "Nowy plan" → "Jaki plan?" → "Cardio" opens "Nowy plan cardio" with one block "Powtórz × 8" (Praca 0:30, Odpoczynek 0:30); save a plan named „Bieg z rozgrzewką” with a second block; the list card shows the violet "Cardio" tag, „16 interwałów”-style summary and a chalk Start; edit it and delete it; a strength plan card shows the "Siła" tag; touch targets measured with `getBoundingClientRect` match DESIGN.md (D2)

### Phase 5: Cardio session screen
#### Automated Verification:
- [ ] 5.1 `npx vitest run src/components` passes, including new tests for the session screen, get-ready, pause/resume, end confirm, end screen, resume after a fresh mount and the update/wake-lock wiring (D5, D6, D8)
- [ ] 5.2 `npm test` shows 0 failing tests (baseline 0) (D6, D8)
- [ ] 5.3 `npm run build` exits 0 (D6)
#### Manual Verification:
- [ ] 5.4 at 412×915 on `vite preview` with Playwright's fake clock: Start a cardio plan → violet field with "PRZYGOTUJ SIĘ" and 0:03 → "PRACA" with the clock counting down → "ODPOCZYNEK"; "Interwał X z Y", "Dalej:", "Razem", "Zostało" and the timeline match the plan; Pauza → "PAUZA" and "Wznów", the clock stands; Wznów continues; Zakończ asks „Zakończyć trening?”; after the last interval the end screen shows (D6)
- [ ] 5.5 on `vite preview`: reload during a work interval → the session comes back paused at the same interval; sound calls (instrumented `createOscillator`) happen for the countdown and the interval starts while visible (D4, D5)

### Phase 6: Lock mode
#### Automated Verification:
- [ ] 6.1 `npx vitest run src/components` passes, including new tests for lock, the 2 s hold, an early release, ignored touches, reduced-motion text and the lock removed after a fresh mount (D7)
- [ ] 6.2 `npm test` shows 0 failing tests (baseline 0) (D7, D8)
- [ ] 6.3 `npm run build` exits 0 (D7)
#### Manual Verification:
- [ ] 6.4 at 412×915 on `vite preview`: "Zablokuj" shows "Przytrzymaj, aby odblokować" and "Ekran zablokowany"; taps where Pauza and Zakończ were do nothing; a 1 s hold does not unlock; a 2 s hold unlocks; the session keeps running while locked; reload removes the lock (D7)

## Slice details

### Phase 1: Cardio plan model and storage
Changes required:
- `src/plans/plan.ts`: make `Plan` a union. Strength keeps today's shape plus `type: 'strength'`
  (a stored plan with no `type` is strength). Cardio: `{ type: 'cardio', id, name, blocks }`,
  block `{ id, repeat, intervals }`, interval `{ id, name, seconds, kind: 'work' | 'rest' }`.
  Limits from DESIGN.md: `repeat` 1–20, `seconds` 5–3600 in steps of 5, at least one block, at
  least one interval per block, a non-empty plan name and non-empty interval names. Polish error
  messages in the existing `ValidationError` style (paths like `blocks.<b>.intervals.<i>.seconds`).
  Factories: `createCardioPlan()` (one block, repeat 8, intervals „Praca” 0:30 work and
  „Odpoczynek” 0:30 rest), `createInterval(kind)` (name = the type word), `createBlock()`.
  `clonePlan` copies both shapes. A pure `expandCardioPlan(plan)` returns the interval list after
  repeats (the engine and the summary both use it). `summarizePlan` for cardio: interval count
  after repeats with `pluralPl` (interwał/interwały/interwałów) and the total time as m:ss, e.g.
  „16 interwałów, 8:00”.
- `src/plans/planStore.ts`: `toPlan` and `savePlan` keep `type` and the cardio fields (today they
  rebuild only id/name/exercises and would drop them); a plan with no `type` loads as strength;
  invalid cardio plans follow the existing unreadable/corrupt-copy path. Keep `PLANS_KEY` and
  `PLANS_VERSION`.
- Existing callers (`PlanEditor.vue`, `PlanList.vue`, `App.vue`, `useWorkout`/`engine`) narrow to
  the strength type so the build stays green and strength behaviour does not change. Until phase 4
  and 5 there is no cardio UI; a cardio plan in storage must not crash the list.
Slice guardrails: tests start from old-shape JSON written as a literal (no `type`), and from data
built through the app's own functions; lookups by id tested with at least three plans.

### Phase 2: Cardio session engine
Changes required:
- New pure module `src/workout/cardioEngine.ts` (takes `now` as a parameter, no timers, no DOM).
  State (decides research Unknown 2): `{ version: 1, kind: 'cardio', planId, planName, intervals
  (expanded, each with name, seconds, kind), startedAt, pausedAt: number | null, pausedTotalMs,
  lastActivityAt }`. `GET_READY_MS = 3000` (literal 3 s).
- `startCardio(plan, now)`, `pauseCardio(state, now)`, `resumeCardio(state, now)`,
  `getCardioView(state, now)` → phase `get-ready | work | rest | paused | finished`, the interval
  index and "X z Y" numbers, interval remaining ms and progress (0–1), the current and next
  interval (name, seconds, kind) or "last", `elapsedMs` (Razem: without get-ready and without
  pauses) and `remainingMs` (Zostało: to the planned end). While paused the view is frozen at
  `pausedAt` and keeps the paused interval's kind for display.
- `isCardioExpired(state, now)`: true only when paused and `now - pausedAt > 2 h` (strictly
  greater, same constant value as strength `IDLE_EXPIRY_MS`); a running session never expires.
- `cardioCues(state, fromMs, toMs)`: the sound cues whose time falls in `(fromMs, toMs]` — a
  `countdown` cue at 3, 2 and 1 s before each interval end (none when the interval is shorter than
  4 s; the 3 s get-ready also gets 3-2-1), and at each interval end a `work-start` or `rest-start`
  cue by the kind of the next interval; the end of the last interval gives `rest-start`. Each cue
  carries its planned time. No cue while paused; pause time shifts later cues.
Slice guardrails: every time rule tested by moving `now` with no ticks; constants pinned with
literal values; the "Razem/Zostało" numbers tested across a pause.

### Phase 3: Cardio sounds, persistence and session controller
Changes required:
- `src/workout/sound.ts`: add `playCountdownBeep()`, `playWorkStart()`, `playRestStart()` — Web
  Audio only, clearly different from each other (e.g. work-start higher and two tones, rest-start
  lower), same safety rules as `playRestEnd` (no throw, no file). `playRestEnd` is unchanged.
- `src/workout/workoutStore.ts`: the same key holds either the strength state (no `kind`, parsed
  exactly as today) or a cardio state (`kind: 'cardio'`); an unreadable value of either shape
  keeps the corrupt-copy behaviour.
- A session controller for cardio (a new composable, e.g. `src/workout/useCardio.ts`, or an
  extension of `useWorkout` — the builder chooses; strength behaviour must not change): start
  (calls `unlockAudio()` in the tap), pause, resume, end with the existing confirm flow, leave
  after the end screen, restore on mount: a stored running session comes back **paused** at the
  current position; a paused session older than 2 h is removed with the same expiry notice as
  strength; a session past its planned end shows the end screen. After a screen lock / app switch
  (`visibilitychange`) the session keeps running and the view is recomputed. A render timer only
  asks for a re-render; a sound check on each render plays the cues from `cardioCues` since the
  last check, only when the page is visible and each cue at most 2 s late; missed cues are never
  replayed. Wake lock held while a cardio session is running or paused; released at the end.
  The 500 ms tap guard applies to Pauza/Wznów/Zakończ. Only one workout (strength or cardio) can
  exist at a time.
Slice guardrails: fresh-mount restore tests for running, paused and finished states and for an old
strength workout; sound tests with a fake `AudioContext`; the visible/late rule tested for a
countdown cue and an interval-start cue.

### Phase 4: Plan list tags, plan type choice and cardio editor
Changes required:
- `src/styles/tokens.css`: add `--cardio`, `--on-cardio` and the Clock (9rem), Phase (3rem) and Meta
  (1.125rem) type sizes from DESIGN.md — no other new values.
- `PlanList.vue`: the "Siła"/"Cardio" pill tag next to the name (DESIGN.md "Znacznik typu"), the
  cardio summary, a chalk Start on every card, Edytuj/Usuń for both types (delete uses the
  existing confirm).
- "Nowy plan" opens the in-app question „Jaki plan?” with „Siła”, „Cardio” (secondary, 56 px) and
  „Anuluj” (DESIGN.md "Wybór typu nowego planu"); „Siła” opens the existing editor unchanged.
- New cardio editor component per DESIGN.md "Edytor planu cardio": titles „Nowy plan cardio” /
  „Edytuj plan cardio”, „Nazwa planu”, block cards „Blok N” with the „Powtórz” stepper (× 1–× 20),
  interval cards „Interwał N” with the „Praca”/„Odpoczynek” toggle (`aria-pressed`, never chalk),
  „Nazwa interwału”, the „Czas” stepper (5 s step, 0:05–60:00, m:ss), „Dodaj interwał”, „Usuń
  interwał”, „Usuń blok” (Danger), „Dodaj blok”, „Zapisz plan” (chalk), „Anuluj”; renaming on type
  change only when the name is still the old type word; validation messages from phase 1; a failed
  save keeps the data on screen. Reuse `NumberStepper`, `FieldError`.
- `App.vue`: route the choice and the cardio editor (new and edit). Starting a cardio plan is
  wired in phase 5.
Slice guardrails: Polish-letter names in tests; double tap on „Zapisz plan” 150 ms apart; touch
targets 56 px in the editor steppers/toggles, 44 px minimum elsewhere.

### Phase 5: Cardio session screen
Changes required:
- New session screen component per DESIGN.md "Sesja cardio" items 1–8: full violet field, top
  Meta row (plan name, „Interwał X z Y”), Phase word, the interval name under it only when it
  differs from the type word, Clock (m:ss, ceil of seconds), the interval bar (no transition under
  `prefers-reduced-motion`), the timeline („Przebieg”, one segment per interval, work filled, rest
  faint, current outlined, 2 px gaps above 24 segments), „Dalej: <nazwa> · <m:ss>” or „To ostatni
  interwał”, bottom Meta row („Razem”, „Zostało”), „Pauza”/„Wznów” (64 px, on-cardio), a row of
  „Zablokuj” and „Zakończ” (56 px outline). Get-ready state „PRZYGOTUJ SIĘ” with 0:03 → 0:00,
  paused state „PAUZA”. „Zablokuj” is present but lock behaviour comes in phase 6 (it may be a
  no-op button in this phase only).
- Zakończ → the existing `EndWorkoutConfirm` („Zakończyć trening?”); confirm → plan list; the
  session keeps running behind the question. End → the existing `WorkoutEnd` with the plan name.
- `App.vue`: Start on a cardio card starts the session; a stored cardio session restores on load
  (paused); the expiry notice reuses the strength text; `workoutRunning` for the update policy is
  true for a cardio session; one workout at a time.
Slice guardrails: tests drive the real `App` (fresh mount for reload); double tap on Pauza 150 ms
apart; the clock text checked while the clock moves with no ticks.

### Phase 6: Lock mode
Changes required:
- „Zablokuj” replaces „Pauza”, „Zablokuj” and „Zakończ” with one hold bar „Przytrzymaj, aby
  odblokować” (64 px, full width, 2 px on-cardio outline, a 2 px-stroke SVG padlock icon); the top
  Meta row shows „Ekran zablokowany” instead of the plan name.
- Unlock = pointer/touch held on the bar for 2 s (time from timestamps, not from ticks); the fill
  grows from the left; releasing, cancelling or leaving the bar before 2 s resets it to zero. Under
  `prefers-reduced-motion` the bar shows „Trzymaj… 1”, „Trzymaj… 2” instead of the fill. Keyboard:
  holding Space/Enter on the focused bar for 2 s also unlocks (accessibility).
- While locked, other taps on the screen do nothing; the session keeps running and sounds keep
  playing. The lock is in memory only: a reload (fresh mount) shows the session unlocked (and
  paused, phase 3).
Slice guardrails: tests for a 1.9 s hold (stays locked) and a 2.0 s hold (unlocks) with literal
values; an early release resets.
