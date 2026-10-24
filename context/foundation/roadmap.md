---
project: "Trening"
version: 1
status: draft
created: 2026-10-18
updated: 2026-10-18
prd_version: 1
main_goal: market-feedback
top_blocker: time
---

# Roadmap: Trening

> Derived from `context/foundation/prd.md` (v1) + auto-researched codebase baseline.
> Edit-in-place; archive when superseded.
> Slices below are listed in dependency order. The "At a glance" table is the index.

## Vision recap

A person who trains at home, alone, loses their place after a break between sets and skips a set. Trening shows, with one look at the phone, the current exercise, the sets left and the next exercise. A rest timer and a sound mark the end of each break, so the user does not need to pick up the phone.

## North star

**S-02: User can run a saved plan from the first set to the "end" screen** — this is the first slice that lets the author do a real workout and count skipped sets. The goal is real workouts fast, so it comes right after plan creation.

> "North star" here means the smallest end-to-end slice that proves the product works. It comes as early as its prerequisites allow, because the other slices matter only if this one works.

## At a glance

| ID   | Change ID                     | Outcome (user can …)                                                              | Prerequisites | PRD refs                                    | Status   |
| ---- | ----------------------------- | --------------------------------------------------------------------------------- | ------------- | ------------------------------------------- | -------- |
| F-01 | phone-deploy-skeleton         | (foundation) the built app is served over HTTPS on the private server, deployed on merge | —             | NFR (Android + Chrome), NFR (no data leaves the device) | ready    |
| F-02 | offline-installable-shell     | (foundation) the app installs on the phone and its shell opens with no network     | F-01          | NFR (works offline after first start), NFR (Android + Chrome) | proposed |
| F-03 | unit-test-harness             | (foundation) unit tests run in watch mode and in one CI-ready run; the type check covers them | —             | Business Logic, Guardrail (workout state is not lost) | ready    |
| S-01 | first-plan                    | create a plan with exercises and see it in the plan list                           | F-03          | FR-001, FR-002, FR-003, FR-011              | proposed |
| S-02 | first-workout-run             | run a saved plan set by set, with rest timer and sound, to the "end" screen        | S-01          | US-01, FR-004, FR-005, FR-006, FR-007, FR-008, FR-010 | proposed |
| S-03 | workout-survives-interruptions | keep the screen on and return to the same set and rest after a lock, switch or reload | S-02, F-01    | US-01, FR-009, FR-012, NFR (return < 3 s)   | proposed |
| S-04 | set-undo-skip                 | undo a set marked by mistake, or skip a set                                        | S-02          | US-01, FR-014                               | proposed |
| S-05 | rest-adjust                   | make the running rest longer or shorter                                            | S-02          | US-01, FR-015                               | proposed |
| S-06 | plan-edit-delete              | edit a saved plan and delete a plan                                                | S-01          | FR-003, FR-011                              | proposed |

## Streams

Navigation aid — groups items that share a Prerequisites chain. Canonical ordering still lives in the dependency graph below; this table is the proposed reading order across parallel tracks.

| Stream | Theme         | Chain                                                    | Note                                                                                     |
| ------ | ------------- | -------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| A      | On the phone  | `F-01` → `F-02`                                          | Puts the app on the real phone, so real workouts can start early. Runs in parallel with Stream B. |
| B      | Workout loop  | `F-03` → `S-01` → `S-02` → (`S-03` / `S-04` / `S-05` in parallel) | Shortest path to the first real workout, with unit tests from the first slice. `S-03` also needs `F-01` from Stream A. |
| C      | Plan upkeep   | `S-06`                                                   | Starts after `S-01` in Stream B. Can run in parallel with `S-02` and later slices.        |

## Baseline

What's already in place in the codebase as of `2026-10-18` (auto-researched + user-confirmed).
Foundations below assume these are present and do NOT re-scaffold them.

- **Frontend:** partial — the starter scaffold is in place (`package.json`, `vite.config.ts`). `src/App.vue` and `src/components/HelloWorld.vue` hold demo content only. No routing. No local fonts in `public/`.
- **Backend / API:** absent — none planned. The tech stack builds static files only.
- **Data:** absent — no on-device storage code in `src/`.
- **Auth:** absent — none planned. The PRD says single user, no login. Basic auth sits in front of the server (part of F-01).
- **Deploy / infra:** absent — no container config, no CI workflow, no PWA manifest, no service worker.
- **Observability:** absent — none planned for the MVP.
- **Testing:** absent — no test runner. `npm run build` (type check + build) is the only check.

## Foundations

### F-01: Deploy skeleton for the phone

- **Outcome:** (foundation) the built app is served over HTTPS on the author's private server, behind Basic auth, and a merge to `main` deploys it.
- **Change ID:** phone-deploy-skeleton
- **PRD refs:** NFR (Android + Chrome), NFR (no data leaves the device)
- **Unlocks:** the real-phone verification path for `S-02` (sound with headphones) and for `S-03` (the screen wake lock needs a secure HTTPS page on the phone); `F-02`.
- **Prerequisites:** — (external state: access to the private server and the repository's deploy secrets)
- **Parallel with:** F-03, S-01, S-02, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** sequenced early because the goal is real workouts on the phone, and a dev server on the laptop cannot prove the sound or the screen wake on the phone. It ships the demo page first, so it does not wait for any slice. If `F-03` has landed, the deploy also runs the unit tests before the build; if not, `F-03` adds that step.
- **Status:** ready

### F-02: Installable offline shell

- **Outcome:** (foundation) the app installs on the phone's home screen and its shell opens with no network after the first start.
- **Change ID:** offline-installable-shell
- **PRD refs:** NFR (works offline after first start), NFR (Android + Chrome)
- **Unlocks:** the offline verification path (open the installed app in flight mode); the "reload with no network" check of `S-03`.
- **Prerequisites:** F-01
- **Parallel with:** F-03, S-01, S-02, S-03, S-04, S-05, S-06
- **Blockers:** —
- **Unknowns:**
  - Does the install work behind Basic auth on the author's phone (the manifest must be fetched with credentials)? — Owner: author. Block: no.
- **Risk:** kept small: only the install and the offline shell. It does not wait for the user-facing slices, but it must land before the MVP is called offline.
- **Status:** proposed

### F-03: Unit test harness

- **Outcome:** (foundation) unit tests run in watch mode and in a one-shot run that CI can call, the build type check also covers the test files, and one sample test passes.
- **Change ID:** unit-test-harness
- **PRD refs:** Business Logic, Guardrail (workout state is not lost)
- **Unlocks:** the unit-test verification path for `S-01` (saved plans), `S-02` (position and remaining rest from timestamps), `S-03` (restore and expiry of the running workout), `S-04` (undo and skip) and `S-05` (rest change).
- **Prerequisites:** —
- **Parallel with:** F-01, F-02
- **Blockers:** —
- **Unknowns:**
  - The runner was researched on 2026-10-18: Vitest 5 + Vue Test Utils + jsdom, with a separate test tsconfig. Record the choice in `tech-stack.md` and `CLAUDE.md` during `/10x-plan`. — Owner: author. Block: no.
  - Do fake timers hang the storage library in tests? Fake only the clock, or pass the current time into the logic. — Owner: author. Block: no.
- **Risk:** unit tests only for the MVP (no browser tests). Sequenced before `S-01` because the author cannot yet judge AI-written code alone, so tests must check the logic from the first slice. Kept small: the runner, the scripts and one sample test; each slice writes its own tests.
- **Status:** ready

## Slices

### S-01: First plan

- **Outcome:** user can create a plan with a name, add exercises (name, sets, reps, rest time) with default values, save it, and see it in the plan list after a reload.
- **Change ID:** first-plan
- **PRD refs:** FR-001, FR-002, FR-003, FR-011
- **Prerequisites:** F-03
- **Parallel with:** F-01, F-02
- **Blockers:** —
- **Unknowns:**
  - How are plans protected against loss when the browser clears site data (PRD Open Question 2)? — Owner: author. Block: no.
- **Risk:** first slice: it replaces the demo scaffold and brings in the approved DESIGN.md visual system and on-device storage. Covers only "save" from FR-003; edit and delete move to `S-06` to keep this slice small.
- **Status:** proposed

### S-02: First workout run

- **Outcome:** user can pick a saved plan, start a workout, see the exercise name, reps, sets left and next exercise, tap once per finished set, wait through a rest timer that ends with a sound and returns to the set view, and see the "end" screen after the last set.
- **Change ID:** first-workout-run
- **PRD refs:** US-01, FR-004, FR-005, FR-006, FR-007, FR-008, FR-010
- **Prerequisites:** S-01
- **Parallel with:** F-01, F-02, S-06
- **Blockers:** —
- **Unknowns:**
  - Does a tap to mark a set done fit "without touching the phone" (PRD Open Question 3)? — Owner: author. Block: no.
  - Is the end-of-rest sound clear with headphones (PRD guardrail)? — Owner: author. Block: no.
- **Risk:** this is the north star. The rest time must come from stored timestamps from the start, so `S-03` can add resume without a rewrite. Real-phone checks need `F-01`; until then, test in desktop Chrome.
- **Status:** proposed

### S-03: Workout survives interruptions

- **Outcome:** user can keep the screen on during a workout and, after a screen lock, an app switch or a reload, return within 3 seconds to the same set and the same rest state; an old workout expires after the idle time.
- **Change ID:** workout-survives-interruptions
- **PRD refs:** US-01, FR-009, FR-012, NFR (return < 3 s)
- **Prerequisites:** S-02, F-01
- **Parallel with:** F-02, S-04, S-05, S-06
- **Blockers:** —
- **Unknowns:**
  - What is the idle time before a workout expires (PRD Open Question 1)? — Owner: author. Block: no (decide it in `/10x-plan` for this slice).
- **Risk:** this is where the most care goes: the saved workout state and the "state is not lost" guardrail. Comes right after the north star because a lost position after a lock defeats the product's purpose.
- **Status:** proposed

### S-04: Undo or skip a set

- **Outcome:** user can undo a set that was marked done by mistake, and can skip a set.
- **Change ID:** set-undo-skip
- **PRD refs:** US-01, FR-014
- **Prerequisites:** S-02
- **Parallel with:** F-02, S-03, S-05, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** it changes the running workout state, the same state as `S-03` and `S-05`. If they run in parallel, merge the state changes with care.
- **Status:** proposed

### S-05: Adjust the running rest

- **Outcome:** user can make the running rest longer or shorter.
- **Change ID:** rest-adjust
- **PRD refs:** US-01, FR-015
- **Prerequisites:** S-02
- **Parallel with:** F-02, S-03, S-04, S-06
- **Blockers:** —
- **Unknowns:** —
- **Risk:** a change to the rest must keep the timestamp rule (remaining rest comes from stored times, not from timer ticks), or the resume in `S-03` shows a wrong time.
- **Status:** proposed

### S-06: Edit and delete a plan

- **Outcome:** user can open a saved plan, change its name and exercises, save the changes, and delete a plan.
- **Change ID:** plan-edit-delete
- **PRD refs:** FR-003, FR-011
- **Prerequisites:** S-01
- **Parallel with:** F-01, F-02, S-02, S-03, S-04, S-05
- **Blockers:** —
- **Unknowns:**
  - What happens to a running workout when its plan is edited or deleted? — Owner: author. Block: no.
- **Risk:** sequenced after the north star because the first real workouts can use a plan created once. Deleting a plan is the first destructive action in the app; it must follow the DESIGN.md rules for confirmation.
- **Status:** proposed

## Backlog Handoff

| Roadmap ID | Change ID                      | Suggested issue title                                      | Ready for `/10x-plan` | Notes |
| ---------- | ------------------------------ | ---------------------------------------------------------- | --------------------- | ----- |
| F-01       | phone-deploy-skeleton          | Deploy the static build to the private server on merge     | yes                   | Run `/10x-plan phone-deploy-skeleton` |
| F-02       | offline-installable-shell      | Make the app installable and offline after first start     | no                    | Waits for F-01 |
| F-03       | unit-test-harness              | Add the unit test runner and test scripts                  | yes                   | Run `/10x-plan unit-test-harness` |
| S-01       | first-plan                     | Create a plan with exercises and list saved plans          | no                    | Waits for F-03 |
| S-02       | first-workout-run              | Run a saved plan with rest timer and sound to the end      | no                    | Waits for S-01; north star |
| S-03       | workout-survives-interruptions | Keep the screen on and resume a workout after interruption | no                    | Waits for S-02 and F-01; decide the idle time |
| S-04       | set-undo-skip                  | Undo or skip a set during a workout                        | no                    | Waits for S-02 |
| S-05       | rest-adjust                    | Make the running rest longer or shorter                    | no                    | Waits for S-02 |
| S-06       | plan-edit-delete               | Edit and delete a saved plan                               | no                    | Waits for S-01 |

## Open Roadmap Questions

1. **What is the idle time before a workout expires (FR-009)?** — Owner: author. Block: S-03 (decide it during its planning).
2. **How are plans and progress protected against loss (FR-011)?** — Owner: author. Data lives only on the device, and export/import was rejected as not convenient on a phone. Block: roadmap-wide, before release.
3. **Does a tap to mark a set done fit the insight "without touching the phone" (FR-006)?** — Owner: author. Check during the first workouts with S-02. Block: none.

## Parked

- **Counting reps during a set** — Why parked: PRD §Non-Goals (the hands are busy with the exercise).
- **Voice guidance** — Why parked: PRD §Non-Goals (too costly).
- **Workout history and statistics** — Why parked: PRD §Non-Goals; the primary criterion is measured with a manual note.
- **Calendar planning, exercise library, cardio** — Why parked: PRD §Non-Goals (the planning problem was dropped).
- **Vibration at the end of a rest (former FR-013)** — Why parked: PRD §Non-Goals (no proof of value beyond the sound).
- **Google Play release** — Why parked: PRD §Non-Goals; the MVP ships as an installable web app.
- **Reliable signal with a locked screen or the app in the background** — Why parked: PRD §Non-Goals; the MVP keeps the screen on (FR-012).
- **Light theme, theme switch, plate colors and plate stack** — Why parked: DESIGN.md marks them for after the MVP; the time risk keeps them out.
- **Weight field per exercise** — Why parked: not in the PRD FRs; DESIGN.md and CLAUDE.md keep it out of the MVP.

## Done

(Empty on first generation. `/10x-archive` appends an entry here — and flips that item's `Status` to `done` — when a change whose `Change ID` matches the item is archived.)
