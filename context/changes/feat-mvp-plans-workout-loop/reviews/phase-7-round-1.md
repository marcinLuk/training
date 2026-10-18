# Phase review — feat-mvp-plans-workout-loop · Phase 7: Undo, skip and rest adjustment on screen · round 1

- **Scope:** `git diff HEAD` (uncommitted, on top of `8340d96`): `src/workout/useWorkout.ts`, `src/components/WorkoutSet.vue`, `src/components/WorkoutRest.vue`, `src/App.vue`, `src/components/UndoSkipAdjust.test.ts` (new), `brief.md` Progress rows 7.1–7.3. Read in full, plus the earlier code they use: `src/workout/engine.ts`, `src/workout/workoutStore.ts`, `src/styles/base.css`, `src/styles/tokens.css`, `src/components/testHelpers.ts`, the guard and expiry tests in `Workout.test.ts`, `Resume.test.ts`, `useWorkout.test.ts`, `engine.test.ts`.
- **Files reviewed:** 6 (`+410/-21` lines)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `### Phase 7` Progress rows 7.1–7.5 and `### Phase 7` slice details; Done when D5, D6
- **Reviewed at:** 2026-10-18
- **Overall verdict:** FAIL
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 7.1 | component tests for Cofnij after Gotowe, Cofnij after Pomiń serię, Pomiń serię with no rest, −15 s / +15 s, fresh-mount read-back | `timeout 300 npx vitest run src/components` | pass (7 files, 100 tests, 0 skipped) |
| 7.2 | `npm test` exits 0 | `timeout 300 npm test` | pass (17 files, 345 tests, 0 skipped; no `.skip`/`.only`/`.todo` in `src/**/*.test.ts`) |
| 7.3 | `npm run build` exits 0 | `set -o pipefail; timeout 300 npm run build` | pass (`vue-tsc -b` clean, `✓ built in 226ms`, `EXIT=0`) |

```
 Test Files  7 passed (7)
      Tests  100 passed (100)
---
 Test Files  17 passed (17)
      Tests  345 passed (345)
---
dist/assets/index-CjI36Y4s.js   90.43 kB │ gzip: 33.97 kB
✓ built in 226ms
EXIT=0
```

### Wrong-implementation table (`useWorkout.ts`, scratch mutant copy, full suite `vitest run src`)

| Mutant | What it breaks | Suite | Probe that diverges (scratch `Probe.test.ts`, passes 8/8 on the real code) |
| :-- | :-- | :-- | :-- |
| M1 `undoLast` without `guarded(at)` | 2nd fast "Cofnij" undoes a 2nd set | **345 passed** | P2 two "Cofnij" 150 ms apart → 2 undos |
| M2 `skip` without `guarded(at)` | 2nd fast "Pomiń serię" skips a 2nd set | **345 passed** | P1 two "Pomiń serię" 150 ms apart; P7 rest "Cofnij" then a tap 150 ms later on "Pomiń serię" |
| M3 `adjustRestBy` without guard | tap 150 ms after the rest view opened counts | 1 failed (`ignores a tap 150 ms after "Gotowe" opened the rest view`) | — |
| M4 `undoLast` without `expireIfIdle` | "Cofnij" after 2 h + 1 ms revives the workout | **345 passed** | P4 |
| M5 `skip` without `expireIfIdle` | "Pomiń serię" after 2 h + 1 ms marks a set and revives the workout | **345 passed** | P3 |
| M6 `adjustRestBy` without `expireIfIdle` | "+15 s" after 2 h + 1 ms ends the rest instead of expiring | **345 passed** | P5 |
| M7 screen change = mode only (no cursor) | no guard after a skip | 1 failed (`ignores "Gotowe" 150 ms after "Pomiń serię"…`) | — |
| M8 screen change = cursor only (no mode) | no guard after a rest end / early end | 2 failed (earlier Phase 5 tests in `Workout.test.ts`) | — |
| M9 guard on every commit (pre-phase behaviour) | 2nd quick ±15 s tap dropped | 2 failed (`counts two "+15 s" taps 200 ms apart…`, `counts a "+15 s" and then two "−15 s"…`) | — |
| M10 sound when −15 s ends the rest | silent user end plays | 1 failed (`ends the rest when the time reaches 0, with no sound`) | — |
| M11 save only on screen change | ±15 s not saved | 1 failed (`keeps the rest time changed by "+15 s" and "−15 s"`) | — |
| M12 `undoLast` uses `state.value`, not `settled(at)` | — | 345 passed | equivalent mutant: `undo` gives the same result from an unresolved or a resolved rest |

### Manual (performed with playwright-cli 0.1.14, session `mvp-p7-r1`, `vite preview` on port 4199, 412×915)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 7.4 | "Gotowe" then "Cofnij" returns to the same set with the same sets left; "Pomiń serię" moves to the next set with no rest (D5) | passed | `reviews/screenshots/p7-r1-7.4-after-cofnij.png`: after Gotowe → rest (`timer "Pozostały czas przerwy": 0:30`) → Cofnij, snapshot `heading "Wiosłowanie"`, `paragraph: "2"`, `serii zostało`, `button "Cofnij" [disabled]`; stored `"cursor":0,"mode":"set","rest":null,"undoStack":[]`, all sets `pending`. `p7-r1-7.4-after-skip.png`: Pomiń serię → `heading "Wiosłowanie"`, `"1"`, no timer; stored `status:"skipped"` for set 1, `"cursor":1,"mode":"set","rest":null`; after `reload` the same snapshot (`"1"`, `button "Cofnij"` enabled). |
| 7.5 | "+15 s" and "−15 s" change the remaining rest, and a reload keeps the changed time (D6) | passed | `p7-r1-7.5-after-plus15-reload.png`: rest 30 s from 202206; +15 s at 203758 → stored `{"startedAt":1792346203758,"durationMs":43448}`, timer `0:43`; reload at 206816 → `0:41` (unchanged rest would read `0:26`). `p7-r1-7.5-after-minus15-reload.png`: `0:32` → −15 s → `0:15`, stored `{"startedAt":1792346217291,"durationMs":14915}`; reload at 220789 → `0:12` (without the change `0:27`). |

Measured layout (412×915, midline y = 457.5):

| Screen | Button | Box (x, y, w × h) | Notes |
| :-- | :-- | :-- | :-- |
| set | Cofnij | 16, 723, 184 × 56 | disabled at start, `opacity: 0.4` |
| set | Pomiń serię | 212, 723, 184 × 56 | |
| set | Gotowe | 16, 803, 380 × 64 | only chalk button (`rgb(242, 242, 239)`) |
| rest | −15 s / +15 s | 16 / 212, 476, 184 × 56 | top 18 px below the midline |
| rest | Cofnij | 16, 735, 380 × 56 | |
| rest | Gotowy, zaczynam | 16, 803, 380 × 64 | only chalk button |

Biggest number: set view counter `176px` (reps `56px`, headline `36px`); rest view timer `56px` (headline `36px`). Polish copy: "Cofnij", "Pomiń serię", "−15 s", "+15 s".

Double-tap probes (real build, page-side timed clicks after a playwright-cli `click`):

| Probe | Result |
| :-- | :-- |
| `dblclick` "Pomiń serię" (set 2 of Wiosłowanie) | one skip: `heading "Przysiady"`, `"2"`; stored `undoStack` 2 entries, sets `s s p p` (`p7-r1-probe-dbl-skip.png`) |
| `dblclick` "Cofnij" | one undo: `heading "Wiosłowanie"`, `"1"`; `undoStack` 1 entry (`p7-r1-probe-dbl-cofnij.png`) |
| "+15 s" twice 150 ms apart | `0:15 → 0:30 → 0:45`: both count (the builder's intent) |
| "−15 s" twice 150 ms apart, then a third | `0:45 → 0:29 → 0:14 → set view`; both quick taps count, the third ends the rest |
| "Gotowe" 150 ms and "Pomiń serię" 300 ms after "−15 s" ended the rest (last set of the plan) | both ignored: `undoStack` stays 3, `Przysiady`, `"1"` — no set marked, no end screen (`p7-r1-probe-minus15-to-zero.png`) |
| rest "Cofnij" at (300, 763), then 100 ms later the same point (now "Pomiń serię" on the set view) | 2nd tap ignored: sets `pppp`, `undoStack` 0, `"2"` (`p7-r1-probe-dbl-rest-cofnij.png`) |
| `AudioContext.prototype.createOscillator` counted: "−15 s" that ends a 15 s rest | `0` oscillators; stored `lastActivityAt` = the tap time (318501, `now` 320002) |
| same, rest left to run out on a visible page | `3` oscillators (positive control) |

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | FAIL |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS |
| I1 | Does it satisfy the original requirements? | CONCERNS |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | PASS |
| I4 | Is it robust (concurrency, error handling, …)? | FAIL |
| I5 | Is it performant? | PASS |
| I6 | Is it secure (SQL injection, …)? | N/A |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | N/A |

Blockers: 1 · Major: 2 · Minor: 2 · Nit: 2

Findings going back to a builder: `rest-undo-not-in-design-md`, `undo-skip-tap-guard-unpinned`, `undo-skip-adjust-expiry-unpinned`.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`commit`, `undoLast`, `skip`, `adjustRestBy` and `REST_STEP_MS` carry docblocks that state the rule, including why the guard now starts only on a screen change and why a −15 s end is silent.

### D2. Are all relevant types of documentation covered?

**Verdict:** FAIL

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | |
| CLAUDE.md | no | — | no new command or rule |
| ADR | no | — | |
| DESIGN.md | yes | **no** | "Cofnij" on the rest view is new; DESIGN.md is unchanged in the diff |
| phpdoc / API | n/a | — | |
| Query header comments | n/a | — | |
| E2E rules / selectors | n/a | — | |
| Translations | n/a | — | Polish literals in templates, as in earlier phases |

- **[Blocker]** `rest-undo-not-in-design-md` — `src/components/WorkoutRest.vue:56-59` adds a full-width secondary "Cofnij" (56 px) directly above "Gotowy, zaczynam" on the rest view. `DESIGN.md` → Components → "Przerwa" lists only the ring, "Dalej:", "−15 s" / "+15 s" and "Gotowy, zaczynam"; "Widok serii" is the only section that places "Cofnij". `git diff HEAD --name-only -- DESIGN.md` is empty. The brief guardrail ("When a UI string or element is needed that DESIGN.md does not cover … add one line for it to the matching DESIGN.md section in the same slice, and report it") and CLAUDE.md ("If a task needs something DESIGN.md does not cover … update DESIGN.md in the same change") both require the line. **Fix:** add one Polish line to `DESIGN.md` → "Przerwa" that names "Cofnij" (drugorzędny, 56 px, nad „Gotowy, zaczynam", cofa serię, która rozpoczęła przerwę), and report it.

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** CONCERNS

| Requirement (Phase 7 slice details / rows) | Implemented in | Status |
| :-- | :-- | :-- |
| Set view: "Cofnij" and "Pomiń serię" (56 px) above "Gotowe" | `WorkoutSet.vue:32-36` | met (measured 56 / 64 px) |
| "Cofnij" also on the rest view, undoes the set that started it | `WorkoutRest.vue:56-59`, `useWorkout.ts:199-207` | met (DESIGN.md line missing, see D2) |
| Disabled at 40 % opacity when nothing to undo | `WorkoutSet.vue:33`, `base.css:108-111` | met (`opacity: 0.4` measured) |
| Rest view: "−15 s" and "+15 s" (56 px) | `WorkoutRest.vue:48-51` | met; placement see `rest-adjust-above-next-row` |
| All actions through the Phase 4 engine and the Phase 6 store | `useWorkout.ts:199-230` → `undo`, `skipSet`, `adjustRest`, `commit` → `saveWorkout` | met (M11 shows the save is pinned) |
| 7.1 tests incl. fresh-mount read-back | `UndoSkipAdjust.test.ts` | met |
| 7.4, 7.5 browser walk | — | passed |

- **[Minor]** `rest-adjust-above-next-row` — `WorkoutRest.vue:47-55` puts the "−15 s" / "+15 s" row between the ring and "Dalej:". DESIGN.md "Przerwa" says "Pod spodem „Dalej:" z następną serią i ćwiczeniem" (under the ring) and lists ±15 s after it. At 412×915 the row's top is y = 476, only 18 px below the midline, with a large empty band between "Dalej:" (y 556) and "Cofnij" (y 735). Moving the row below "Dalej:" matches the DESIGN.md order and puts it deeper into thumb reach. The thumb rule itself holds at this size.

### I2. Is it logically correct?

**Verdict:** PASS

The guard change keeps every earlier protection. `commit` starts the guard when the mode, the cursor or the null state changes. Every action that changes the screen does that: Start (null → state), "Gotowe" (cursor +1 and/or mode), rest end and "Gotowy, zaczynam" (mode), skip (cursor), undo (cursor and/or mode), a −15 s that ends the rest (mode), leave / confirm / expiry (null). Only ±15 s that keeps the rest skips the guard. M8 and M9 show that the Phase 5 guard tests still fail when the mode check or the new rule breaks. The earlier tests are unchanged and still pass. The browser probes show no double-tap path that marks or skips a set: two fast "Pomiń serię", two fast "Cofnij", rest "Cofnij" → set-view "Pomiń serię", and "−15 s" to 0 → "Gotowe"/"Pomiń serię" are all one action. Undo and skip states pass `parseWorkoutState` after a reload (7.4 walk; scratch probe P8: skip of the last set → reload → end screen). A −15 s end is silent (M10 pinned; browser 0 oscillators) and stamps `lastActivityAt` (engine test `clamps at zero…` asserts `T0 + 20_000`; browser stored tap time).

- **[Minor]** `ring-refills-on-adjust` — `WorkoutRest.vue:12-14` draws the ring as `restRemainingMs / durationMs`. `adjustRest` (`engine.ts:255`) stores `durationMs` = the new remaining time, so every ±15 s tap refills the ring to full. In the browser, "−15 s" moved the time `0:32 → 0:15` while the ring's `stroke-dashoffset` went `158.4 → 33.9` of `565.5` (72 % → 94 % full): the ring grows when the user shortens the rest (`p7-r1-7.5-after-minus15-ring.png`). The time figure stays right; only the ring misleads.

### I3. Is there no unnecessary complexity?

**Verdict:** PASS

- **[Nit]** `rest-step-in-composable` — `WorkoutRest.vue:5` imports `REST_STEP_MS` from `useWorkout.ts`, so a presentational component loads the composable module (and its sound, Wake Lock and store imports) for one constant. A constant in `engine.ts` or a prop would keep the component leaf-only.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** FAIL

The code is right: the probes P1–P7 pass on the real code. The tests do not pin two contracts for the three new actions, so a later edit can drop them with a green suite.

- **[Major]** `undo-skip-tap-guard-unpinned` — `src/workout/useWorkout.ts:202` and `:212`. The `ACTION_GUARD_MS` docblock (`useWorkout.ts:25-30`) says workout action taps are ignored for 500 ms after any screen change, and the phase contract asks that two fast "Cofnij" or "Pomiń serię" taps do not undo or skip a set the user did not mean. Mutants M1 (no `guarded(at)` in `undoLast`) and M2 (none in `skip`) keep all 345 tests green. Behaviour does change: with M2, two "Pomiń serię" taps 150 ms apart skip two sets, and a rest-view "Cofnij" followed 150 ms later by a tap on the same spot (now "Pomiń serię", measured at (300, 763)) skips a set; with M1, two fast "Cofnij" taps undo two sets. **Fix:** add component tests to `UndoSkipAdjust.test.ts`: (a) "Pomiń serię" twice 150 ms apart → one skip (`sets left` and the stored `undoStack` length); (b) after two deliberate skips, "Cofnij" twice 150 ms apart → one undo; (c) rest "Cofnij" then "Pomiń serię" 150 ms later → no set skipped; each with a 700 ms counterpart that counts.
- **[Major]** `undo-skip-adjust-expiry-unpinned` — `src/workout/useWorkout.ts:202`, `:212`, `:225`. The binding rule "every workout action checks expiry first" is pinned for "Gotowe" and "Gotowy, zaczynam" (`useWorkout.test.ts:317`, `:338`) but not for the three new actions. Mutants M4, M5, M6 (drop `expireIfIdle(at)` from `undoLast`, `skip`, `adjustRestBy`) keep all 345 tests green. Behaviour does change: with M5 a "Pomiń serię" tap 2 h + 1 ms after the last tap (clock moved, no timer run — a page whose expiry timeout has not fired yet) marks a set, stamps `lastActivityAt = now` and keeps an expired workout alive, against D4 / FR-009. **Fix:** add one test per action (clock moved by `IDLE_EXPIRY_MS + 1` with no ticks, then tap "Cofnij" / "Pomiń serię" / "+15 s") that expects no workout in storage, the expiry notice, and no set marked; plus the exactly-2 h counterpart for at least one of them.

### I5. Is it performant?

**Verdict:** PASS

One `localStorage` write per tap, as before.

### I6. Is it secure (SQL injection, …)?

**Verdict:** N/A — no input, no network, no new data leaves the device.

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A — client-only app with no logging; no `console.*` left in the diff.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** N/A — `package.json` and `package-lock.json` unchanged.

---

## Architecture — the project's own rules

- "Rest time comes from timestamps" → meets — `adjustRest` stores `{ startedAt: now, durationMs: remaining ± 15 s }`; reload after ±15 s reads the remaining time from those timestamps (7.5 walk; test `keeps the rest time changed…` with the clock moved and no ticks).
- "A workout survives interruptions (FR-009)" → meets — every new action goes through `commit` → `saveWorkout` (M11 pinned); fresh-mount tests and browser reloads after undo, skip and ±15 s.
- "One chalk primary per screen" → meets — measured and tested on both views.
- "Touch targets 56 px (64 px main)" → meets — measured 56 / 64.
- "Biggest number" → meets — counter 176 px; rest timer 56 px is the largest on the rest view.
- "Polish UI text, no emoji icons, no gradients" → meets.
- "DESIGN.md is the source; update it when a new element is needed" → fails — see `rest-undo-not-in-design-md`.
- "The end-of-rest sound plays only for a natural, on-time, visible rest end" → meets — −15 s end silent (M10), natural end plays (browser 3 oscillators).
- **[Nit]** `size-test-name-overclaims` — `src/components/UndoSkipAdjust.test.ts:109` is named "shows both buttons at 56 px height class" but asserts only `not.toContain('btn-large')`; a button with no `.btn` class (no `min-height`) passes. Assert `toContain('btn')` or rename. The browser walk measured the real 56 px.

## Not reviewed

- Audibility of the end-of-rest sound and a real screen lock (owner-run, D10). The browser run proves only that `createOscillator` is or is not called.
- Taps by a real finger: double taps were driven by `dblclick` and by page-side timed `element.click()`; touch-event timing on Android may differ.

## Observations outside scope

- `engine.ts:231` (Phase 4 contract): `undo` is a no-op on a finished workout, and the end screen has no "Cofnij". A "Gotowe" or "Pomiń serię" tapped by mistake on the last set of the plan cannot be taken back, although FR-014 / roadmap S-04 say "undo a set that was marked done by mistake". The brief chose this; the owner may want to revisit it.
- `useWorkout.ts:168-171` with `engine.ts:251`: a "+15 s" tap that lands in the ≤ 250 ms between a natural rest end and the next display tick ends the rest (no extension) and skips the sound. The engine decided "a rest that already ran out is ended, not extended"; the user is touching the screen, so the missing sound costs little.
- The builder's choice that two quick ±15 s taps both count also means an accidental double tap on "−15 s" takes 30 s off; with ≤ 30 s left it ends the rest. "Cofnij" on the next set view then undoes the whole set, not the adjustment.
- Rest view "Cofnij" → "Gotowy, zaczynam" gap is 12 px (`.rest-actions`), the set view's "Cofnij"/"Pomiń serię" → "Gotowe" gap is 24 px (screen gap). Cosmetic.
