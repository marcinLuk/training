# Design critique: whole app (2026-10-18)

Method: dual-agent. Assessment A was a design review: source code plus a live walk-through in Playwright at 412×915 and 1280×800. Assessment B was the impeccable detector: a CLI scan plus an in-page overlay on 5 views. The PRD, PRODUCT.md and DESIGN.md were read before the review.

Snapshot archive: `.impeccable/critique/2026-10-18T18-58-52Z__src.md`. This is the first run for this target, so there is no trend yet.

## Design Health Score

| # | Heuristic | Score | Key issue |
|---|-----------|-------|-----------|
| 1 | Visibility of system status | 3 | The state is very clear. But the rest ring jumps back to almost full after −15 s or +15 s. A failed Wake Lock or a blocked sound gives no message. |
| 2 | Match with the real world | 2 | Polish grammar errors on the most-read screen: "1 serii zostało", "3 powtórzeń". |
| 3 | User control and freedom | 3 | Undo, ±15 s and the confirm dialogs are good. The Android back gesture leaves the editor and loses an unsaved plan. |
| 4 | Consistency and standards | 3 | "Dalej:" is muted on the set view but full white on the rest view. The plan list shows N chalk "Start" buttons. |
| 5 | Error prevention | 3 | The 0.5 s guards and stepper limits are excellent. But "Pomiń serię" is one tap and sits 12 px above "Gotowe". |
| 6 | Recognition over recall | 3 | The set view counts down ("2 serii zostało"). The rest view counts up ("seria 2 z 2"). The user must switch between two models. |
| 7 | Flexibility and efficiency | 2 | No long-press on the steppers. Changing 10 to 30 reps takes 20 taps. You cannot reorder or copy exercises. |
| 8 | Aesthetic and minimalist design | 3 | Flat and disciplined. But about 200 px of empty space sits under "Dalej:", and the rest time is small. |
| 9 | Error recovery | 3 | Storage errors have clear text, an icon and a fix. Focus does not move to the first error after a failed save. |
| 10 | Help and documentation | 2 | The empty-state text is good. Nothing explains the sound, the screen-on behavior or how to install the app. |
| **Total** | | **27/40** | **Acceptable (top of the band)** |

## Design Specificity Verdict

**LLM assessment.** The design is specific in behavior and generic on its surfaces.

- **The set view is clearly made for this product.** The 176 px counter, the one chalk "Gotowe" in the thumb zone and "Zakończ trening" placed far away at the top come straight from the "2 m, sweaty thumb" scene.
- **The behavior is also specific.** The 500 ms guard against double taps and the rest time from timestamps are details that no generic timer template has. The rest time survived a reload in the test.
- **The other surfaces are generic.** The plate colors are reserved, so "Talerze" lives only in the typeface. The plan list, editor, dialogs and end screen are a good but neutral dark form UI. With a different font, they could belong to any to-do app.
- **The rest view is the least authored screen.** It is the second most-seen screen, but it shows a stock progress ring with a small time inside.

**Deterministic scan.** The detector found 0 issues:

- `impeccable detect src` and `impeccable detect index.html` both found 0 issues, also with `--no-config`. On the `.vue`, `.ts` and `.css` files the scan uses only regex. So the contrast and tiny-text rules did not run there.
- A rendered scan of the first screen at 412×915 found 0 issues.
- The in-page overlay found 0 issues on 5 views: empty list, editor, list with a plan, set view and rest view. A test element with planted errors was flagged, so the overlay works.

The detector agrees with the token discipline. It missed every real problem below: grammar, ring logic, long-name overflow, sound and focus. The detector cannot see these problems. Also, its test plan used a short name ("Push"). There were no false positives.

## Overall Impression

The core promise works. From across a room, the set view tells you where you are. The state model survives a reload, and that is the hardest part.

The weak points are the second glance, the skip and the end:

- **The second glance (rest view):** the key number is small and the ring is misleading.
- **The skip:** the app makes it as easy as finishing a set, and then forgets it.
- **The end:** the end screen is empty.

The biggest opportunity: make the rest view as strong as the set view, and make skipping a set visible. The one success metric is "0 skipped sets".

## What's Working

1. **The set-view hierarchy is built for 2 m.** The 11rem counter is about 3× bigger than anything else on the screen. "Gotowe" is 64 px, chalk, at the bottom. The danger button is at the top right. The screen reads correctly from across a room.
2. **The state model is built for real interruptions.** Rest comes from timestamps (`src/workout/engine.ts`), and every change is saved through `commit`. A reload in the middle of a rest came back with the correct remaining time. The 500 ms guard stops a double tap where "Gotowe" and "Gotowy, zaczynam" sit in the same place.
3. **Token discipline.** `tokens.css` matches DESIGN.md one to one. The fonts are local. There are no gradients and no shadows. Errors have an icon, text and a fix. Card buttons include the plan name in their accessible name ("Usuń plan: Push A").

## Priority Issues

### [P1] "Pomiń serię" is a one-tap button next to the main action, and it leaves no trace

- **What:** a full-weight button 12 px above "Gotowe", in the thumb zone (`src/components/WorkoutSet.vue:34`). If you skip the last set, you see the normal end screen.
- **Why it matters:** the only success metric is "0 skipped sets". The user can undo a sweaty mis-tap only if they notice it.
- **Fix:**
  - Give the button less visual weight: a text-style button, or move it to the top near "Zakończ trening".
  - Show a short note in place: "Seria pominięta · Cofnij".
  - Optional: add one fact line on the end screen ("Pominięte serie: 1"). This is a fact, not history, but check the PRD non-goals first.
- **Suggested command:** `/impeccable harden`, `/impeccable layout`

### [P1] The key number on the rest view is too small, and the ring misleads

- **What:** the time is 3.5rem (56 px) inside a 288 px ring. `adjustRest` sets `durationMs` to the new remaining time (`src/workout/engine.ts:255`). So after "−15 s" the ring looks almost full again. The screenshot shows this.
- **Why it matters:** the Biggest Number Rule says the time is the biggest element during rest. From the floor at 1.5 m, 56 px is barely readable. A ring that grows when you remove time tells the user the wrong thing.
- **Fix:**
  - Make the time about 7rem. This step is already in the DESIGN.md scale but has no token. Add the token and update DESIGN.md.
  - Store the planned rest time and draw the ring against it, or against the larger of the planned and adjusted times.
- **Suggested command:** `/impeccable typeset`, `/impeccable layout`

### [P1] Polish plural errors on the most-read screen

- **What:** "powtórzeń" and "serii zostało" are fixed strings (`src/components/WorkoutSet.vue:23-26`). So the app shows "1 serii zostało", "2 serii zostało" and "3 powtórzeń". The helper `pluralPl` already exists in `src/plans/plan.ts`.
- **Why it matters:** this is the main screen. Wrong grammar looks broken.
- **Fix:** use "1 seria została / 2–4 serie zostały / 5+ serii zostało" and "1 powtórzenie / 2–4 powtórzenia / 5+ powtórzeń". The fixed string comes from DESIGN.md ("Widok serii"), so update DESIGN.md in the same change.
- **Suggested command:** `/impeccable clarify`

### [P2] The end-of-rest sound may not play after a reload or a discarded tab

- **What:** `unlockAudio()` runs only in `start` and `finishSet` (`src/workout/useWorkout.ts:177`, `src/workout/useWorkout.ts:185`). After a restore in the middle of a rest, there is no user gesture. So Chrome can keep the AudioContext suspended.
- **Why it matters:** "a clear signal, also with headphones" is a PRD guardrail. Android often discards background tabs. An installed PWA may be exempt from this rule, but nobody has tested it on a phone.
- **Fix:**
  - Call `unlockAudio` on every workout tap (±15 s, Cofnij, Gotowy) and on the first `pointerdown` after a restore.
  - If the audio context is still suspended during a rest, show a small hint.
- **Suggested command:** `/impeccable harden`

### [P2] Focus and screen reader support break at every screen change

- **What:**
  - After "Gotowe", focus falls to `body`, and nothing announces the rest.
  - `role="timer"` with an `aria-label` hides the time value.
  - Dialogs do not move focus, and the screen behind them is not `inert`.
  - After a failed save, focus stays on "Zapisz plan".
- **Fix:**
  - Focus the `h1` (`tabindex="-1"`) when the view changes.
  - Add a polite live region ("Przerwa, 1:30" / "Koniec przerwy. Pompki, seria 2 z 2").
  - In dialogs, focus the safe button and make the screen behind them `inert`.
  - After a failed save, focus the first invalid field.
- **Suggested command:** `/impeccable audit`, `/impeccable harden`

## Persona Red Flags

**Marcin mid-workout** (sweaty, phone on the floor at 1.5 m, headphones):

- The counter reads well, but the 56 px rest time is barely readable.
- "To ostatnia seria" and "Dalej: …" are 22 px muted text. This is exactly the "what's next" answer, and it is hard to read from the floor.
- "Pomiń serię" is 12 px from his thumb target.
- After the phone discards the tab, the beep may not play.

**Casey** (one hand, distracted):

- The Android back gesture leaves the editor and loses an unsaved plan without a warning.
- "Anuluj" also discards the plan without asking.
- "Usuń ćwiczenie" is a full-width danger button right under the "Przerwa +" stepper, with no undo.
- The dialog buttons sit in the middle of the screen, not in thumb reach.

**Sam** (screen reader):

- All of the focus and live-region problems above.
- The disabled "Cofnij" gives no reason.
- The expiry `role="status"` is already on the page when it loads, so it may never be announced.

**Riley** (stress tester):

- A long plan name with no spaces makes the page scroll sideways: 523 px of content on a 412 px screen. The cause is no `overflow-wrap` in `src/components/PlanList.vue:34`. The delete dialog title is clipped too.
- The inputs have no `maxlength`.
- A rest can end behind the "Zakończyć trening?" dialog, so the beep plays with no timer visible.
- Two open tabs write to the same storage key, and the last write wins.

## Minor Observations

- **Mixed alignment on the set view:** the name and reps are left-aligned, but the counter is centered.
- **Plan card:** only 4 px between the summary and "Start".
- **Expiry notice:** it uses `.card`, so it looks like a plan. It does not name the plan, and you cannot close it.
- **Rest time 0:** the editor shows "0:00". "Bez przerwy" is clearer.
- **Enter key in the plan-name field:** it submits the form and shows errors.
- **"Cofnij":** it has no object. "Cofnij serię" is clearer.
- **Confirm dialogs:** they do not say what you lose ("3 z 5 serii zrobione").
- **Stepper icons:** "−" and "+" are Unicode text, not 2 px stroke icons. DESIGN.md forbids this (`src/components/NumberStepper.vue:39`).
- **End screen:** a plan name, a headline and about 700 px of empty space.

## Code vs DESIGN.md (decisions needed)

1. The Chalk Rule ("one primary action per screen") conflicts with the Cards section, which allows a "Start" button on every card. The code follows the Cards section.
2. The fixed string "serii zostało" comes from DESIGN.md itself.
3. The 7rem step is in the type scale but has no token.
4. DESIGN.md says 44 px targets outside the workout, but the code uses 56 px everywhere. This is harmless.
5. PRODUCT.md and DESIGN.md still say "w obu motywach" (in both themes), but the MVP is dark only.

## Questions to Consider

- The only metric is "0 skipped sets". Why is skipping a one-tap equal of "Gotowe" that the app then forgets?
- Could rest be the set view in a different state? The exercise stays, and the timer takes the counter's place. Then "where am I" never leaves the screen.
- Do you think in "sets left" or in "set 2 of 3" at the gym? Today the app uses both, on alternating screens.
- PRD open question 3: should the whole lower half of the screen be the "Gotowe" target, not a 64 px button?

## Open decisions for the next session

These questions were asked, but they have no answers yet:

1. Which area to fix first: the workout screens, reliability and accessibility, or the plan list and editor?
2. Add a 7rem rest-time token to DESIGN.md, or keep 3.5rem and fix only the ring?
3. How to handle a skipped set: a quieter button with an in-place note, the same plus a count on the end screen, or no change?
4. Scope: the 3 P1 issues, all 5 priority issues, or everything in this report?
