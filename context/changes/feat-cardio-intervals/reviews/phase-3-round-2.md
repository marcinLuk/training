# Phase review — feat-cardio-intervals · Phase 3: Cardio sounds, persistence and session controller · round 2

- **Scope:** `src/workout/sound.ts`, `src/workout/workoutStore.ts`, `src/workout/useWorkout.ts`, `src/workout/useCardio.ts`, `src/workout/cardioSound.test.ts`, `src/workout/cardioStore.test.ts`, `src/workout/useCardio.test.ts` · **Files reviewed:** 7 (`+1906/-18`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 3` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none (no manual items), prover sonnet ×1

Change since round 1 (diff of the round-1 snapshot against the tree): `useCardio.ts` adds an `ownsWakeLock` flag (release in `syncWakeLock` and on unmount only when cardio took the lock). `useCardio.test.ts` adds 4 tests: one restored-paused expiry test (`:759`) and three both-mounted wake-lock tests (`:886`, `:895`, `:907`). No other file changed. No test was removed or weakened.

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 3.1 | `src/workout` tests pass | `npx vitest run src/workout` | pass — `Test Files  9 passed (9)`, `Tests  294 passed (294)`, no skips |
| 3.2 | 0 failing tests (baseline 0) | `npm test` | pass — `Test Files  27 passed (27)`, `Tests  649 passed (649)`; 0 failing = baseline 0; no skips |
| 3.3 | build exits 0 | `npm run build` | pass — `vue-tsc -b && vite build` exit 0, `✓ built in 219ms`, `precache  23 entries` |

The runner trap "a green build proves types, not behaviour" applies to 3.3. The behaviour comes from 3.1 and the experiments below.

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `cardio-releases-shared-wake-lock` | round 1 (Major) | closed | E1: the round-1 behaviour put back (unconditional `releaseWakeLock()` in `syncWakeLock`) turns 3 new tests red — `useCardio.test.ts:892` `expected "vi.fn()" to not be called at all, but actually been called 1 times`, `:904` `expected [] to have a length of 1 but got +0`, `:915` same as `:892`; `Tests  3 failed \| 67 passed (70)`. E2: the round-1 unmount release put back turns `:915` red. E4 Q1/Q3 (App order, both composables in one setup) pass. Unchanged code passes all 70 tests (3.1). |
| `restored-expiry-timer-unpinned` | round 1 (Major) | closed | E3: setup `armExpiry()` removed → `× expires by a timer just after the idle limit when the session was restored paused`, `useCardio.test.ts:775` `expect(api.view.value).toBeNull()` → `expected { Object (planName, intervalCount, ...) } to be null` (view `phase: "paused"`); `Tests  1 failed \| 69 passed (70)`. The test pins the 2 h limit with a literal (`expect(Date.now()).toBe(pausedAt + 7_200_000)`). |

### Manual

None in this phase (the brief lists no manual items).

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All runs are in scratch copies under `<scratch>/critic-p3-r2/{clean,m-sync,m-unmount,m-expiry}`. The probe file `probeCritic.test.ts` exists only in `clean`. It uses the harness of `useCardio.test.ts` (fake timers, fake `navigator.wakeLock`, mocked `./sound`) and mounts both composables in ONE component setup, in the stated order, as `App.vue` would call them.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | Mutant: `syncWakeLock` releases unconditionally when cardio is not active (`useCardio.ts:104`) | prover; re-run by coordinator | `× is not released by cardio when a strength workout is restored` (`:892`), `× is still held by the strength workout after a screen lock and a return` (`:904`), `× is not released when the cardio host unmounts during a strength workout` (`:915`); `Tests  3 failed \| 67 passed (70)` | The round-1 defect is pinned by the new tests; the reds come from the release/held assertions. |
| E2 | Mutant: unmount releases unconditionally (`useCardio.ts:297-300`) | prover | `× is not released when the cardio host unmounts during a strength workout` at `:915`; `Tests  1 failed \| 69 passed (70)` | The unmount clause is pinned. |
| E3 | Mutant: no `armExpiry()` at setup (`useCardio.ts:294`) | prover | `× expires by a timer just after the idle limit when the session was restored paused` at `:775`; `Tests  1 failed \| 69 passed (70)` | The fresh-mount expiry timer is pinned. |
| E4 | Probes against the unchanged code | prover | Q1 ✓, Q3 ✓; `× Q2 cardio-first: a running cardio session holds the lock after a page return` (`expected +0 to be 1`, probe `:139`); `× Q4 cardio-first: a restored cardio session holds the lock after mount` (`expected +0 to be 1`, probe `:155`); `× Q5 useCardio.leave() …` (`expected { left: true, key: null } to deeply equal { left: true, …(1) }`, probe `:162`); `× Q6 useWorkout.leave() …` (same message, probe `:170`); `useCardio.test.ts` passed; `Tests  4 failed \| 72 passed (76)` | Q1/Q3: with `useWorkout` called first (App order today), the cardio lock holds. Q2/Q4: with `useCardio` called first, the cardio lock is lost (see `wake-lock-depends-on-mount-order`). Q5/Q6: `leave()` of either composable removes the other kind's stored workout (see `leave-without-session-clears-key`). |

No skip line appeared in any run.

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | `ownsWakeLock` carries a "why" docblock; the restore, sound and one-workout rules are documented. |
| D2 | All documentation types covered? | n/a | No route, config, env or agent-rule change. |
| D3 | Documentation understandable? | pass | Docblocks match the code. One older test name still overclaims (Minor). |
| I1 | Satisfies the requirements? | pass | Every Changes-required clause has code and a test; the wake-lock clause now holds with both composables mounted in App order. |
| I2 | Logically correct? | pass with findings | The cardio lock survives only when `useWorkout`'s listener runs first (Minor); `pause()` reads the clock twice (Nit). |
| I3 | No unnecessary complexity? | pass | One flag fixes the ownership; no new abstraction. |
| I4 | Robust? | pass with findings | `leave()` with no own session clears the shared key (Minor, no caller today). |
| I5 | Performant? | pass | `cardioCues` and `getCardioView` are O(intervals) every 250 ms; a plan has tens of intervals. |
| I6 | Secure? | n/a | No input from outside the device, no network. |
| I7 | Observable? | n/a | No failure path that must log; the app has no logging. |
| I8 | New dependencies? | n/a | `package.json` and `package-lock.json` are not changed. |
| ARCH | Project rules | pass | See below. |

Architecture — project rules that bind this phase:

- No server for user data — meets (no network code).
- Storage keys `trening.plans.v1` / `trening.workout.v1` — meets (`cardioStore.test.ts:103`).
- The corrupt-copy step stays for both shapes — meets (`cardioStore.test.ts:129`, `:189`, `:229`).
- Time from timestamps through `src/lib/clock.ts` — meets (`useCardio.ts` reads only `now()`; tests move the clock with `vi.setSystemTime`).
- Time rules checked on every tap and by a timer — meets (`expireIfIdle` on each tap; `armExpiry` at setup is now pinned, E3).
- `ACTION_GUARD_MS` 500 and `SOUND_MAX_LATE_MS` 2000 unchanged — meets.
- The screen stays on (FR-012) — meets for the strength workout with both composables mounted (E1 closure) and for cardio in App order (E4 Q1/Q3). Order-dependent for cardio (Minor below).
- No new dependency; no `enum` / `namespace`; no `.skip`/`.only`/`@ts-*`/`as any` in the reviewed files — meets.
- Strength tests unchanged and `playRestEnd` unchanged — meets (no strength test file in `git status`; `sound.ts` only adds lines after `playRestEnd`).

Blockers: 0 · Major: 0 · Minor: 3 · Nit: 1
Findings going back to a builder: none.

## Findings

### I2. Logically correct?

- **[Minor]** `wake-lock-depends-on-mount-order` — `src/workout/useWorkout.ts:79-82` (called at `:285` on every `visibilitychange` and at `:291` on setup) — The cardio fix makes `useCardio` release only a lock it took, but the strength side still calls `releaseWakeLock()` whenever it has no strength workout. The lock is one module-level lock. So the cardio lock survives only when `useWorkout`'s setup and its `visibilitychange` listener run before `useCardio`'s. `App.vue:18` calls `useWorkout()` today, so a phase-5 wiring that calls `useCardio()` after it works (E4 Q1/Q3 pass). Nothing in code or tests states or pins this order. Confidence: medium that phase 5 keeps the order (a `useCardio` call before `useWorkout`, or in a child component whose `onMounted` runs before the parent's, reverses the listeners). **Fails when:** `useCardio` is set up before `useWorkout` and (a) a stored cardio session is restored: no lock is held after mount (E4 Q4: `expected +0 to be 1`), or (b) a cardio session runs and the page returns from a screen lock: no lock is held (E4 Q2: `expected +0 to be 1`). This would break FR-012 for cardio. Phase 5's "wake-lock wiring" tests on the real `App` should cover a page return during a cardio session.
- **[Nit]** `pause-reads-clock-twice` — `src/workout/useCardio.ts:211-218` — unchanged from round 1: `pause()` stores the pause at its own `now()`, but `refresh()` moves `lastCheckedMs` to a second `now()`. A cue between the two reads plays before the pause and again after the resume. Confidence: low (both reads are normally in the same millisecond).

### I4. Robust?

- **[Minor]** `leave-without-session-clears-key` — `src/workout/useCardio.ts:238-242` and `src/workout/useWorkout.ts:237-241` — unchanged from round 1, mirror case now run: `leave()` calls `commit(null)`, so `clearWorkout()`, with no check that this composable has a session on the end screen. The key is shared, so each side removes the other kind's stored workout with no copy. No caller reaches either path today. **Fails when:** `useCardio().leave()` runs while the key holds a strength workout (E4 Q5: `{ left: true, key: null }`), or `useWorkout().leave()` runs while the key holds a cardio session (E4 Q6: `{ left: true, key: null }`).

### Test adequacy

- **[Minor]** `wake-lock-test-name-overclaims` — `src/workout/useCardio.test.ts:852` — unchanged from round 1: `is released when the session is left or the view unmounts` only unmounts; it never calls `leave()` or `confirmEnd()`. The release on confirm is pinned at `:581`. **Fails when:** a reader relies on this test for the leave path.

## Not reviewed

- The real sounds through a speaker, the screen staying on, and a real phone lock. The browser driver cannot observe these (D9, owner-run).
- No browser walk: this phase has no UI and no manual items.
- `useCardio.test.ts` was read at the level of the round-1 delta (the 4 new tests in full, the harness, and the test list). The other 66 tests were judged in round 1 and did not change.

## Observations outside scope

- None new. The `useWorkout.leave()` state check is folded into `leave-without-session-clears-key`.
