# Phase review — feat-cardio-intervals · Phase 3: Cardio sounds, persistence and session controller · round 1

- **Scope:** `src/workout/sound.ts`, `src/workout/workoutStore.ts`, `src/workout/useWorkout.ts`, `src/workout/useCardio.ts`, `src/workout/cardioSound.test.ts`, `src/workout/cardioStore.test.ts`, `src/workout/useCardio.test.ts` · **Files reviewed:** 7 (`+1836/-18`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 3` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** FAIL
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none (no manual items), none (3 experiment commands, run by the coordinator)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 3.1 | `src/workout` tests pass | `npx vitest run src/workout` | pass — `Test Files  9 passed (9)`, `Tests  290 passed (290)`, no skips |
| 3.2 | 0 failing tests (baseline 0) | `npm test` | pass — `Test Files  27 passed (27)`, `Tests  645 passed (645)`; 0 failing = baseline 0; no skips |
| 3.3 | build exits 0 | `npm run build` | pass — `vue-tsc -b && vite build` exit 0, `✓ built in 225ms`, `precache  23 entries` |

The runner trap "a green build proves types, not behaviour" applies to 3.3. The behaviour comes from 3.1 and the experiments below.

### Manual

None in this phase (the brief lists no manual items).

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All runs are in scratch copies under `<scratch>/critic-p3-r1/{clean,mut-expiry,mut-resume}`. The probe file `probeCritic.test.ts` exists only in the scratch copies. It uses the same harness as `useCardio.test.ts` (fake timers, fake `navigator.wakeLock`, mocked `./sound`, both composables mounted in host components in App order: `useWorkout` first, then `useCardio`).

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | Probes against the unchanged code (clean copy) | coordinator | `Tests  3 failed \| 68 passed (71)`; P1 ✓, P4 ✓; `× P2 …` `AssertionError: expected "vi.fn()" to not be called at all, but actually been called 1 times` (probe line 121, `sentinels[0].release`); `× P3 …` `expected [] to have a length of 1 but got +0` (probe line 137, held sentinels); `× P5 …` `expected { left: true, key: null } to deeply equal { left: true, …(1) }` | P2/P3: `useCardio` drops the wake lock of a strength workout. P5: `useCardio.leave()` with no cardio session removes a stored strength workout. P1: the restored expiry timer works today. P4: a cardio lock survives a page return in App order. The 66 phase tests in the same run stay green. |
| E2 | Mutant: remove the setup-time `armExpiry()` (`useCardio.ts:282`) | coordinator | `useCardio.test.ts` passed (66/66); probe `× P1 expires a RESTORED paused session by the timer, with no event`; `Tests  4 failed \| 67 passed (71)` | The mutation changes behaviour (P1 goes red). No phase test sees it. The expiry timer after a fresh-mount restore is unpinned. |
| E3 | Mutant: remove `lastCheckedMs = at` in `resume()` (`useCardio.ts:221`) | coordinator | `× does not replay a cue after a pause and a resume` — `AssertionError: expected 4 to be 3` at `useCardio.test.ts:387` (`expect(count('countdown')).toBe(3)`); `Tests  1 failed \| 65 passed (66)`, skip count 0 | The guardrail "no replayed cue after a pause and resume" is pinned, and the red comes from the correct assertion. |

The first-beep rule (`lastCheckedMs = at - 1`) is pinned by `hears three get-ready beeps, not two` (`toEqual` on the 4 cues with offsets 0, 1000, 2000, 3000). I did not run that mutant, because a window that starts at `at` cannot include the cue at `startedAt`.

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | Every new export and the restore, sound and one-workout rules have a "why" docblock. |
| D2 | All documentation types covered? | n/a | No route, config, env or agent-rule change. The storage key notes in `CLAUDE.md` stay correct. |
| D3 | Documentation understandable? | pass | Docblocks match the code. One test name overclaims (see Minor). |
| I1 | Satisfies the requirements? | pass with findings | Each Changes-required clause has code. The wake-lock clause breaks when both composables are mounted (Major). |
| I2 | Logically correct? | fail | `syncWakeLock` releases a lock the strength workout holds. `leave()` clears the key with no cardio session. |
| I3 | No unnecessary complexity? | pass | `useCardio` repeats the guard, expiry and visibility setup of `useWorkout`. The brief allows a new composable. |
| I4 | Robust? | pass | A failed write keeps the session in memory (tested). Audio errors are swallowed by design. Corrupt data is copied for both shapes (tested). |
| I5 | Performant? | pass | `cardioCues` and `getCardioView` are O(intervals) every 250 ms; a plan has tens of intervals. |
| I6 | Secure? | n/a | No input from outside the device, no network. |
| I7 | Observable? | n/a | No failure path that must log; the app has no logging. |
| I8 | New dependencies? | n/a | `package.json` and `package-lock.json` are not changed. |
| ARCH | Project rules | fail (1) | See below. |

Architecture — project rules that bind this phase:

- No server for user data — meets (no network code).
- Storage keys `trening.plans.v1` / `trening.workout.v1` — meets (`cardioStore.test.ts:103`).
- The corrupt-copy step stays for both shapes — meets (`cardioStore.test.ts:129`, `:189`, `:229`).
- Time from timestamps through `src/lib/clock.ts` — meets (`useCardio.ts` reads only `now()`; tests move the clock with `vi.setSystemTime` and no ticks).
- Time rules checked on every tap and by a timer — meets in code (`expireIfIdle` on each tap, `armExpiry`). The restored timer is not pinned (Major).
- `ACTION_GUARD_MS` 500 and `SOUND_MAX_LATE_MS` 2000 unchanged — meets (literal pins at `useCardio.test.ts:340`, `:493`).
- The screen stays on (FR-012) — **fails** when both composables are mounted (Major `cardio-releases-shared-wake-lock`).
- No new dependency; no `enum` / `namespace`; tests next to the code with `vitest` imports — meets.
- Strength tests unchanged and `playRestEnd` unchanged — meets (no strength test file in `git status`; the `sound.ts` diff only adds lines after `playRestEnd`).
- Lock mode not in this phase — meets.

Blockers: 0 · Major: 2 · Minor: 2 · Nit: 1
Findings going back to a builder: `cardio-releases-shared-wake-lock`, `restored-expiry-timer-unpinned`

## Findings

### I2. Logically correct?

- **[Major]** `cardio-releases-shared-wake-lock` — `src/workout/useCardio.ts:93-96` (called at `:281` on setup and at `:275` on every `visibilitychange`) — `syncWakeLock()` calls `releaseWakeLock()` when this composable has no active cardio session. The wake lock in `src/workout/wakeLock.ts` is one module-level lock shared with `useWorkout`, so `useCardio` drops the lock that a strength workout holds. The phase's own tests mount both composables together (`useCardio.test.ts:91`, `:875`), and phase 5 mounts both in `App.vue`. **Fails when:** `useWorkout` and `useCardio` are both mounted (App order) and (a) a strength workout is restored after a reload: the lock is released at once (E1 P2: `sentinels[0].release` called 1 time), or (b) a strength workout runs and the user returns after a screen lock or an app switch: no lock is held after the return (E1 P3: `expected [] to have a length of 1 but got +0`). This breaks FR-012 for the strength workout, and the brief says "strength behaviour must not change". The lock must only be released for a session this composable owns (for example, release only on its own transition from active to not active). A test must mount both composables, as P2 and P3 do.

### Test adequacy

- **[Major]** `restored-expiry-timer-unpinned` — `src/workout/useCardio.ts:282` — The expiry timer armed at setup is the only thing that expires a session that is restored paused and then stays open on the screen with no tap and no event. No phase test covers this case. `expires by a timer just after the idle limit, with no event` (`useCardio.test.ts:746`) arms the timer through `pause()` in the same mount, not after a fresh mount. This is the project trap "every timer or guard armed at start must also be tested after a fresh-mount restore" (`expiry-decision-clauses-unpinned`). **Fails when:** the setup `armExpiry()` is removed (E2): all 66 `useCardio.test.ts` tests stay green. In the mutant, a restored paused session left open past 2 h never expires (P1 red).
- **[Minor]** `wake-lock-test-name-overclaims` — `src/workout/useCardio.test.ts:831` — The test `is released when the session is left or the view unmounts` only unmounts. It never calls `leave()` or `confirmEnd()`. The release on confirm is pinned in a different test (`useCardio.test.ts:591`), so no clause is left without a test. Only the name claims too much. **Fails when:** a reader relies on this test for the leave path.

### I4. Robust?

- **[Minor]** `leave-without-session-clears-key` — `src/workout/useCardio.ts:226-230` — `leave()` calls `commit(null)`, and so `clearWorkout()`, with no check that a cardio session exists or that it is on the end screen. The key is now shared, so this removes a stored strength workout. The mirror case: the unchanged `useWorkout.leave()` removes a stored cardio session in the same way (found by reading, not run). No caller reaches either path today. Confidence: medium that phase 5 wiring stays clear of it. **Fails when:** `useCardio().leave()` is called while the key holds a strength workout. The workout is removed with no copy (E1 P5: `{ left: true, key: null }`).

### I2. Logically correct? (continued)

- **[Nit]** `pause-reads-clock-twice` — `src/workout/useCardio.ts:199-206` — `pause()` reads `now()` as `at`, then `refresh()` reads `now()` again and moves `lastCheckedMs` to that second time. The pause is stored at the first time. A cue that falls between the two reads plays before the pause and plays again after the resume. Confidence: low (the two reads are normally in the same millisecond). **Fails when:** the two `now()` calls straddle the planned time of a cue.

## Not reviewed

- The real sounds through a speaker, the screen staying on, and a real phone lock. The browser driver cannot observe these (D9, owner-run).
- I did not run a wrong-implementation table for `parseCardioState` / `parseStoredWorkout`. The fixture list in `cardioStore.test.ts:154-187` gives one damaged field per case, and it includes "a cardio kind on a strength shape". That case makes a cardio-then-strength fallback parser go red. I judged this enough by reading.
- No browser walk: this phase has no UI and no manual items.

## Observations outside scope

- `useWorkout.leave()` (unchanged code) has no state check. Before this change, the only effect was to clear an empty key. See `leave-without-session-clears-key` for the new effect.
