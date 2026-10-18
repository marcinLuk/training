# Brief: Trening MVP — plans and workout loop (roadmap F-03, S-01…S-06)

## Goal

The owner builds workout plans and runs a full workout on the phone, set by set, with a rest timer and a sound. The workout survives a reload and expires after 2 hours without a tap.

## Done when

- D1 Unit tests run in one shot (`npm test`) and in watch mode (`npm run test:watch`); `npm run build` also type-checks the test files; `CLAUDE.md` and `context/foundation/tech-stack.md` name the runner and the commands — checked by Phase 1 rows.
- D2 The user creates a plan with a name and exercises (name, sets, reps, rest; defaults 3 sets, 10 reps, 90 s), saves it, and sees it in the plan list after a reload — checked by unit/component tests and a browser walk at 412×915.
- D3 The user picks a plan and taps Start; the set view shows the exercise name, the reps, the sets left and the next exercise; "Gotowe" starts a rest whose remaining time comes from stored timestamps; at the end of the rest a sound plays and the set view returns; after the last set the end screen shows and "Wróć do planów" opens the plan list — checked by unit/component tests and a browser walk.
- D4 After a reload in the middle of a set or a rest, the app shows the same set and the same remaining rest in under 3 s; a workout with no tap for more than 2 hours expires, shows a short notice and opens the plan list; the app requests a screen Wake Lock while a workout runs — checked by unit/component tests and a browser walk.
- D5 The user can undo the last finished or skipped set ("Cofnij") and can skip a set ("Pomiń serię") — checked by unit/component tests and a browser walk.
- D6 The user can make the running rest 15 s shorter or longer ("−15 s", "+15 s"), and the change survives a reload — checked by unit/component tests and a browser walk.
- D7 The user can edit a saved plan and delete a plan (delete asks for confirmation); a running workout keeps its own copy of the plan and does not change when the plan is edited or deleted — checked by unit/component tests and a browser walk.
- D8 The user can end a workout early with "Zakończ trening" after a confirm step — checked by component tests and a browser walk.
- D9 The app calls `navigator.storage.persist()` at the first plan save, when the API exists — checked by a unit test.
- D10 `owner-run` — on the owner's Android phone: the end-of-rest sound is clear with headphones; the screen stays on during a workout; after a real screen lock and an app switch the workout returns to the same set and rest. No agent can check these (physical device, real audio, real lock).

## Out of scope

- F-01 deploy (Docker, GitHub Actions, Basic auth) and F-02 PWA (manifest, service worker, offline cache, install).
- Everything in the PRD `## Non-Goals` and the roadmap `## Parked` list: history, statistics, calendar, exercise library, cardio, rep counting, voice, vibration, weight field, Google Play, a signal with a locked screen, light theme, theme switch, plate colors, plate stack.
- Any server, API call, account or sync.

## Guardrails

- Project rules: `CLAUDE.md`, `DESIGN.md`, `PRODUCT.md`, `context/foundation/auto-loop.md` §9. Polish UI text; dark "guma" theme only; DESIGN.md tokens only.
- New dependencies, and only these: dev `vitest@5.0.5`, `@vue/test-utils@2.5.1`, `jsdom@30.1.3` (Phase 1); dev `@fontsource/barlow-condensed@5.3.0`, `@fontsource/barlow-semi-condensed@5.3.0` (Phase 3), whose woff2 files and OFL license are copied into `public/fonts/` and served from there. No router, no state library, no other package.
- The end-of-rest sound is made with the Web Audio API (no audio file).
- Data lives in `localStorage` only. A stored shape is versioned; reading never throws on missing, corrupt or old data, and never silently overwrites data it could not read.
- Remaining rest time is always computed from the stored start time, the stored duration and the current time — never from timer ticks.
- Every behavioural clause is pinned by a Vitest unit or component test. A clause pinned only by a browser walk counts as unpinned.
- When a UI string or element is needed that `DESIGN.md` does not cover, use the closest DESIGN.md wording, add one line for it to the matching `DESIGN.md` section in the same slice, and report it.

## Research

See `research.md` (entry points: `package.json:6-10`, `tsconfig.json:2-5`, `vite.config.ts:5-7`, `index.html:2-10`, `src/main.ts:1-5`, `src/App.vue:1-7`; versions and platform facts under Hazards).

## Progress

### Phase 1: Unit test harness
#### Automated Verification:
- [x] 1.1 `npm test` exits 0 and runs `src/harness.test.ts`, which mounts a small component with `@vue/test-utils` in jsdom (D1) — 5eff3e6
- [x] 1.2 `npm run test:watch` is defined as Vitest watch mode in `package.json` (D1) — 5eff3e6
- [x] 1.3 `npm run build` exits 0 (D1) — 5eff3e6
- [x] 1.4 a type error added to a `*.test.ts` file in a scratch copy makes `npx vue-tsc -b` fail there (D1) — 5eff3e6
- [x] 1.5 `CLAUDE.md` (Commands, Stack) and `context/foundation/tech-stack.md` name Vitest, `npm test` and `npm run test:watch` (D1) — 5eff3e6

### Phase 2: Plan model and device storage
#### Automated Verification:
- [x] 2.1 `npx vitest run src/plans` passes, with tests for the defaults, the validation, a save read back through a fresh read of `localStorage`, corrupt stored data kept and not overwritten, and `navigator.storage.persist()` called at the first save only (D2, D9) — f00c8ad
- [x] 2.2 `npm run build` exits 0 — f00c8ad

### Phase 3: App shell, plan list and new-plan editor
#### Automated Verification:
- [x] 3.1 `npx vitest run src/components` passes, with tests for creating a plan with default values, the −/+ steppers (rest in 15 s steps), the empty-name error, saving, and the list summary with Polish plural forms (D2) — c8b1567
- [x] 3.2 `npm test` exits 0 — c8b1567
- [x] 3.3 `npm run build` exits 0, `public/fonts/` holds the woff2 files and the OFL license, and no `http://` or `https://` URL appears in the built CSS (`dist/assets/*.css`) — c8b1567
#### Manual Verification:
- [x] 3.4 at 412×915: create plan "Wiosłowanie i przysiady" with two exercises ("Wiosłowanie" with the defaults, "Przysiady" with changed values), save, see it in the list with its summary, reload, still there (D2) — c8b1567
- [x] 3.5 at 412×915: dark "guma" background, Barlow fonts loaded from `/fonts/`, targets at least 44 px, no emoji or Unicode icons, no demo scaffold content left — c8b1567

### Phase 4: Workout engine
#### Automated Verification:
- [x] 4.1 `npx vitest run src/workout` passes, with tests for the current position, sets left and next exercise; "done" starting a rest; the remaining rest after the clock moves with no ticks; the rest end returning to the set; the last set ending the workout; a 0 s rest; undo; skip; ±15 s with the clamp at zero; the 2 h idle boundary; and the plan copy staying unchanged when the source plan changes (D3, D4, D5, D6, D7)
- [x] 4.2 `npm run build` exits 0

### Phase 5: Workout screens, rest timer and sound
#### Automated Verification:
- [ ] 5.1 `npx vitest run src/components` passes, with tests for Start from a plan card, the set view content, "Gotowe" opening the rest view, the clock moved past the rest end returning to the set view and calling the sound once, "Gotowy, zaczynam" ending the rest early, and the last set opening the end screen whose "Wróć do planów" opens the plan list (D3)
- [ ] 5.2 `npm test` exits 0
- [ ] 5.3 `npm run build` exits 0
#### Manual Verification:
- [ ] 5.4 at 412×915: run a plan with 2 exercises × 2 sets and a 15 s rest from start to the end screen: the set view shows the exercise, the reps, the sets left as the biggest number and "Dalej:"; the rest view counts down from 0:15 and the set view returns by itself; the end screen leads back to the plan list (D3)
- [ ] 5.5 at 412×915: "Gotowy, zaczynam" ends a running rest at once (D3)

### Phase 6: Resume, expiry, Wake Lock and early end
#### Automated Verification:
- [ ] 6.1 `npx vitest run src/workout` passes, with tests for saving on every change, a fresh read mid-set and mid-rest giving the same position and the timestamp-based remaining rest, the 2 h expiry removing the workout, unreadable or old-shape data not crashing and not touching the plans, and the Wake Lock requested at start, requested again when the page becomes visible, and released at the end and at an early end (D4)
- [ ] 6.2 `npx vitest run src/components` passes, with tests for an app mounted over a stored workout opening the workout view in the same state, the expiry notice, and "Zakończ trening" with confirm and with cancel (D4, D8)
- [ ] 6.3 `npm test` exits 0
- [ ] 6.4 `npm run build` exits 0
#### Manual Verification:
- [ ] 6.5 at 412×915: reload in the middle of a set: the same exercise and sets left show in under 3 s (D4)
- [ ] 6.6 at 412×915: reload in the middle of a rest: the rest view continues with the remaining time, not a restarted one (D4)
- [ ] 6.7 at 412×915: a stored workout whose last tap is more than 2 h old shows the expiry notice and the plan list after a reload (D4)
- [ ] 6.8 at 412×915: "Zakończ trening" → confirm → plan list; "Zakończ trening" → cancel → the workout stays (D8)

### Phase 7: Undo, skip and rest adjustment on screen
#### Automated Verification:
- [ ] 7.1 `npx vitest run src/components` passes, with tests for "Cofnij" after "Gotowe" returning to that set and ending the rest, "Cofnij" after "Pomiń serię", "Pomiń serię" moving on with no rest, "−15 s" and "+15 s" changing the remaining time, and each change read back after a fresh mount (D5, D6)
- [ ] 7.2 `npm test` exits 0
- [ ] 7.3 `npm run build` exits 0
#### Manual Verification:
- [ ] 7.4 at 412×915: "Gotowe" then "Cofnij" returns to the same set with the same sets left; "Pomiń serię" moves to the next set with no rest (D5)
- [ ] 7.5 at 412×915: "+15 s" and "−15 s" change the remaining rest, and a reload keeps the changed time (D6)

### Phase 8: Edit and delete a plan
#### Automated Verification:
- [ ] 8.1 `npx vitest run src/plans src/components` passes, with tests for opening a saved plan in the editor, saving changes under the same id, delete with confirm and with cancel, and a stored running workout unchanged after its plan is edited or deleted (D7)
- [ ] 8.2 `npm test` exits 0
- [ ] 8.3 `npm run build` exits 0
#### Manual Verification:
- [ ] 8.4 at 412×915: edit the plan name and one exercise, save, reload: the changes stay (D7)
- [ ] 8.5 at 412×915: delete a plan → confirm → it is gone after a reload; delete → cancel → it stays (D7)

## Slice details

### Phase 1: Unit test harness
Changes required:
- `npm install -D vitest@5.0.5 @vue/test-utils@2.5.1 jsdom@30.1.3` (exact versions; `package-lock.json` changes with it).
- `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`. Keep `build` as `vue-tsc -b && vite build`.
- Vitest config with `environment: 'jsdom'`, test files `src/**/*.test.ts`. Prefer `test` in `vite.config.ts` via `defineConfig` from `vitest/config`; if `vue-tsc -b` rejects it under `tsconfig.node.json`, use a separate `vitest.config.ts` added to `tsconfig.node.json` `include`.
- Type check: add `tsconfig.test.json` (extends `./tsconfig.app.json`, own `tsBuildInfoFile`, `include` the test files), referenced from `tsconfig.json`; exclude `src/**/*.test.ts` from `tsconfig.app.json`. Import `describe`/`it`/`expect`/`vi` from `vitest` explicitly (no globals).
- `src/harness.test.ts`: mounts a tiny inline component with `@vue/test-utils` and asserts on rendered Polish text (e.g. "Ćwiczenie"). Keep it as the harness smoke test; it is not a placeholder to delete later.
- `CLAUDE.md`: Commands (`npm test`, `npm run test:watch`), the "only check today" sentence, Stack (Vitest + Vue Test Utils + jsdom, `tsconfig.test.json`). `tech-stack.md`: one short paragraph on the test stack.
Slice guardrails: do not touch `context/foundation/auto-loop.md` (the owner updates it).

### Phase 2: Plan model and device storage
Changes required:
- `src/plans/plan.ts`: types `Plan { id, name, exercises }`, `Exercise { id, name, sets, reps, restSeconds }`; defaults (3 sets, 10 reps, 90 s); limits (sets 1–20, reps 1–100, rest 0–600 s in 15 s steps); validation returning Polish messages that name the fix (empty plan name after trim, empty exercise name, a plan with no exercises); a summary helper with Polish plural forms ("1 ćwiczenie", "2 ćwiczenia", "5 ćwiczeń"; "1 seria", "2 serie", "5 serii").
- `src/plans/planStore.ts`: `localStorage` key `trening.plans.v1` holding `{ version: 1, plans: Plan[] }`; `listPlans()`, `getPlan(id)`, `savePlan(plan)` (insert or replace by id). Ids from `crypto.randomUUID()`. A missing key reads as an empty list. Corrupt or unknown-version data reads as an empty list, and before the first write over it the raw value is copied to `trening.plans.corrupt.<timestamp>`. `savePlan` calls `navigator.storage.persist()` once, at the first save, only when the API exists, and a rejection does not block the save.
- Tests in `src/plans/*.test.ts`.

### Phase 3: App shell, plan list and new-plan editor
Changes required:
- Remove the scaffold: `src/components/HelloWorld.vue`, `src/assets/*`, `public/icons.svg`, the demo CSS in `src/style.css`. `index.html`: `lang="pl"`, `<title>Trening</title>`, `<meta name="theme-color" content="#121314">`.
- `npm install -D @fontsource/barlow-condensed@5.3.0 @fontsource/barlow-semi-condensed@5.3.0`; copy `barlow-condensed-{latin,latin-ext}-{700,800}-normal.woff2` and `barlow-semi-condensed-{latin,latin-ext}-{500,600,700}-normal.woff2` plus the OFL license into `public/fonts/`; `@font-face` rules with `unicode-range` per subset and `font-display: swap`, URLs `/fonts/...`.
- `src/styles/tokens.css` (DESIGN.md colors without plate and light tokens, type scale, spacing, radii) and base styles: dark only, `color-scheme: dark`, tabular numbers, focus ring, `prefers-reduced-motion`.
- `src/App.vue` as a screen switcher with a typed view state (plan list, plan editor; later slices add the workout screens). No router.
- `src/components/PlanList.vue`: plan cards per DESIGN.md Components → Cards (name, summary), "Nowy plan"; empty state text in Polish. The "Start" button arrives in Phase 5, edit and delete in Phase 8.
- `src/components/PlanEditor.vue`: plan name; exercise rows with name and −/+ steppers for sets, reps and rest (15 s steps, shown as m:ss); "Dodaj ćwiczenie" adds a row with the defaults; remove a row; save with validation messages; cancel back to the list.
- Component tests in `src/components/*.test.ts`.

### Phase 4: Workout engine
Changes required:
- `src/workout/engine.ts`: pure functions, every one takes `now: number` (ms) explicitly. State (serialisable, versioned `version: 1`): a copy of the plan taken at start (`planId`, `planName`, exercises); the flat list of sets with status `pending | done | skipped`; the cursor; mode `set | rest | finished`; `rest: { startedAt, durationMs } | null`; an undo stack; `lastActivityAt`.
- `startWorkout(plan, now)`; `getView(state, now)` → exercise name, reps, sets left in the current exercise (counting the current set), next exercise name or none, last-set flag, remaining rest ms; `completeSet` (last set of the plan → finished with no rest; rest 0 s → straight to the next set; else rest with the finished exercise's rest time); `resolveRest(state, now)` (rest over → set mode); `endRestEarly`; `skipSet` (marks skipped, moves on, no rest; last set → finished); `undo` (reverts the last done or skip: cursor back, status pending, rest cleared; no-op when the stack is empty or the workout is finished); `adjustRest(state, ±15000, now)` (remaining never below 0; reaching 0 ends the rest); `isExpired(state, now)` (more than 2 h since `lastActivityAt`). Every user action sets `lastActivityAt = now`; the rest ending by itself does not.
- Tests in `src/workout/engine.test.ts`.

### Phase 5: Workout screens, rest timer and sound
Changes required:
- "Start" on each plan card (DESIGN.md Cards: Start is the card's main action) starts a workout from that plan.
- `src/components/WorkoutSet.vue` per DESIGN.md "Widok serii" (Cofnij and Pomiń serię arrive in Phase 7): Headline name, Figure reps, Counter sets left with "serii zostało", "Dalej:" row (next exercise name; on the last exercise "To ostatnie ćwiczenie"; on the last set of the plan "To ostatnia seria" — add the missing string to DESIGN.md), "Gotowe" 64 px chalk at the bottom.
- `src/components/WorkoutRest.vue` per DESIGN.md "Przerwa": time ring with Figure m:ss computed from the stored timestamps, "Dalej:" with the next set and exercise, "Gotowy, zaczynam" 64 px chalk (±15 s arrive in Phase 7). A display timer only triggers re-renders; the value always comes from `getView(state, now)`. The screen changes as a whole when the rest ends.
- `src/components/WorkoutEnd.vue` per DESIGN.md "Ekran końca".
- `src/workout/sound.ts`: Web Audio beep pattern; the `AudioContext` is created or resumed inside the Start and "Gotowe" taps; feature-checked; plays once per rest end observed while the page is visible.
- A small clock seam (e.g. `src/lib/clock.ts` with `now()`) so component tests move time without running ticks.
- Component tests in `src/components/*.test.ts`.

### Phase 6: Resume, expiry, Wake Lock and early end
Changes required:
- `src/workout/workoutStore.ts`: `localStorage` key `trening.workout.v1`; save after every state change; load validates the shape and the version; unreadable data is moved to `trening.workout.corrupt.<timestamp>` and treated as no workout; plans are never touched.
- App start: a stored, not expired workout opens the workout screen at once in its saved state (rest remaining from timestamps; a rest that ended while away shows the set view); an expired one is removed and the plan list shows a short Polish notice ("Trening wygasł…" — add to DESIGN.md "Wznowienie treningu" if the wording is new). On `visibilitychange` to visible, recompute at once.
- `src/workout/wakeLock.ts`: request `screen` at start and resume, request again on `visibilitychange` to visible while a workout runs, release at the end and at an early end; feature-checked; errors do not break the workout.
- "Zakończ trening" (danger, far from "Gotowe") with an in-app confirm step (no `window.confirm`); confirm removes the workout and opens the plan list; cancel keeps it.
- Tests in `src/workout/*.test.ts` and `src/components/*.test.ts`.

### Phase 7: Undo, skip and rest adjustment on screen
Changes required:
- Set view: "Cofnij" and "Pomiń serię" (56 px) above "Gotowe", per DESIGN.md. "Cofnij" is also available in the rest view, to undo the set that started it. Disabled state (40 % opacity) when there is nothing to undo.
- Rest view: "−15 s" and "+15 s" (56 px).
- All actions go through the Phase 4 engine and the Phase 6 store.
- Component tests in `src/components/*.test.ts`.

### Phase 8: Edit and delete a plan
Changes required:
- Plan card: edit and delete, separated from each other by a wide gap and placed away from "Start" (DESIGN.md Do's); delete in the danger style.
- `PlanEditor.vue` opens an existing plan and saves it under the same id; `planStore.deletePlan(id)`.
- Delete asks for confirmation in-app; cancel keeps the plan.
- The running workout uses its own copy (Phase 4), so edit and delete never change it; a test proves it through the store.
- Tests in `src/plans/*.test.ts` and `src/components/*.test.ts`.
