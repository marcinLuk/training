# To test: feat-mvp-plans-workout-loop — Trening MVP, plans and workout loop

Implemented 2026-10-18 · 8 slices · commits `5eff3e6`…`7683288`
Brief: `brief.md` · run record: `workbench.md` · code reviews: `reviews/`

**Nobody has walked this change end to end on your phone.** The path below is for you.

## What changed

You can now build workout plans and run them. A plan has exercises with sets, reps and rest. In a workout the screen shows the exercise, the reps, the sets left (the biggest number) and what comes next. One tap on "Gotowe" ends a set and starts a rest. The rest counts down from saved timestamps, a short beep marks its end, and the set view comes back by itself. You can undo or skip a set, change the rest by 15 s, and end the workout early. A reload brings you back to the same set and rest. A workout with no tap for 2 hours expires. You can edit and delete plans. All data stays in the browser on the device.

### What changed underneath (no visible effect)

- Unit test harness: `npm test` (Vitest + Vue Test Utils + jsdom), 377 tests; `npm run build` also type-checks the tests.
- The workout logic is a pure engine (`src/workout/engine.ts`). The rest time always comes from timestamps, never from timer ticks.
- Storage keys: `trening.plans.v1` and `trening.workout.v1`. Data the app cannot read is copied to `…corrupt.<timestamp>` before anything writes over it.

## Before you start

- Desktop check: `npm run build && ./node_modules/.bin/vite preview --port 4199 --strictPort`, then open `http://localhost:4199`. Use the phone size (412×915) in DevTools.
- Phone check (Android, Chrome): open the app as `http://localhost:…` through Chrome remote debugging port forwarding (`chrome://inspect` → Port forwarding `4199 → localhost:4199`), or over HTTPS. **Do not use `http://<LAN-IP>:4199`**: it is not a secure context, so plan creation (`crypto.randomUUID`) and the Wake Lock do not work there.
- External dependencies: none. No network is needed after the page loads.
- Start state: empty site data (DevTools → Application → Clear site data, or a fresh profile).
- Use Polish names with Polish letters, for example "Wiosłowanie", "Przysiady".

## Path

Legend: `[ ]` not checked yet · `[x]` checked, works · `[!]` checked, does not work (details in "Walkthrough notes") · `[-]` skipped on purpose

| Status | # | Step | Expected result | Checked by |
| :-- | :-- | :-- | :-- | :-- |
| `[ ]` | 1 | Open the app with empty site data | Dark screen, heading "Plany", a short empty-state text, "Nowy plan" | critic (`reviews/phase-3-round-2.md`) |
| `[ ]` | 2 | Tap "Nowy plan" | Editor with one exercise row: 3 sets, 10 reps, rest 1:30; −/+ buttons, no keyboard needed for numbers | critic (`reviews/phase-3-round-2.md`) |
| `[ ]` | 3 | Leave the plan name empty and tap "Zapisz plan" | A Polish error with a warning icon next to the field; nothing you typed is lost | critic (`reviews/phase-3-round-2.md`) |
| `[ ]` | 4 | Name it "Wiosłowanie i przysiady". Exercise 1 "Wiosłowanie": 2 sets, rest 0:15. "Dodaj ćwiczenie" → "Przysiady": 2 sets, 8 reps, rest 0:15. Tap "Zapisz plan" | List shows the card "Wiosłowanie i przysiady", "2 ćwiczenia, 4 serie", a 64 px "Start", then "Edytuj" and "Usuń plan" | critic (`reviews/phase-3-round-2.md`, `reviews/phase-8-round-2.md`) |
| `[ ]` | 5 | Reload the page | The plan is still there | critic (`reviews/phase-3-round-2.md`) |
| `[ ]` | 6 | Tap "Start" | Set view: "WIOSŁOWANIE", "10 powtórzeń", a very large "2" with "serii zostało", "Dalej: Przysiady", "Cofnij" (disabled) and "Pomiń serię" above a 64 px "Gotowe" | critic (`reviews/phase-5-round-3.md`, `reviews/phase-7-round-2.md`) |
| `[ ]` | 7 | Tap "Gotowe" twice, fast | Only one set is marked: the rest view opens with 0:15; the second tap does nothing | critic (`reviews/phase-5-round-3.md`) |
| `[ ]` | 8 | Wait for the rest to end | Short beep; the whole screen changes back to the set view with "1" set left | critic, call only (`reviews/phase-5-round-3.md`); **audible beep: nobody** |
| `[ ]` | 9 | Tap "Gotowe", then "Cofnij" on the rest view | Back to the same set, "1" set left, no rest | critic (`reviews/phase-7-round-2.md`) |
| `[ ]` | 10 | Tap "Pomiń serię" | Next exercise "Przysiady" at once, no rest | critic (`reviews/phase-7-round-2.md`) |
| `[ ]` | 11 | Reload the page in the set view | Same exercise and sets left, in under 3 s | critic (`reviews/phase-6-round-2.md`) |
| `[ ]` | 12 | Tap "Gotowe"; in the rest tap "+15 s", then "−15 s" | The time grows by 15 s, then drops by 15 s (two fast taps both count) | critic (`reviews/phase-7-round-2.md`) |
| `[ ]` | 13 | Reload the page in the middle of the rest | The rest view comes back and continues from the remaining time, not from 0:15 | critic (`reviews/phase-6-round-2.md`, `reviews/phase-7-round-2.md`) |
| `[ ]` | 14 | Tap "Gotowy, zaczynam" | The rest ends at once, no beep; "To ostatnia seria" shows | critic (`reviews/phase-5-round-3.md`) |
| `[ ]` | 15 | Tap "Gotowe" on the last set | End screen: plan name, "Koniec treningu", one "Wróć do planów" | critic (`reviews/phase-5-round-3.md`) |
| `[ ]` | 16 | Tap "Wróć do planów" | Plan list | critic (`reviews/phase-5-round-3.md`) |
| `[ ]` | 17 | Start the plan again, tap "Zakończ trening" (top), then "Wróć do treningu" | The confirm closes and the workout stays as it was | critic (`reviews/phase-6-round-2.md`) |
| `[ ]` | 18 | "Zakończ trening" → "Zakończ trening" in the confirm | Plan list; a reload does not bring the workout back | critic (`reviews/phase-6-round-2.md`) |
| `[ ]` | 19 | Start the plan, then in DevTools → Application → Local Storage set `lastActivityAt` in `trening.workout.v1` to more than 2 h ago; reload | Plan list with "Trening wygasł po 2 godzinach bez dotknięcia." | critic (`reviews/phase-6-round-2.md`) |
| `[ ]` | 20 | "Edytuj" → change the name and one exercise → "Zapisz plan" → reload | The changes stay; no duplicate plan | critic (`reviews/phase-8-round-2.md`) |
| `[ ]` | 21 | "Usuń plan" → "Anuluj"; then "Usuń plan" → "Usuń plan"; reload | After cancel the plan stays; after confirm it is gone | critic (`reviews/phase-8-round-2.md`) |

## Owner-run — not executed by the loop

Why not the loop: these need your real Android phone, real audio and a real screen lock (brief D10).

| Status | # | Criterion (from the brief) | What you need |
| :-- | :-- | :-- | :-- |
| `[ ]` | D10a | The end-of-rest sound is clear with headphones | Phone + headphones, a plan with a 15 s rest |
| `[ ]` | D10b | The screen stays on during a workout | Phone, a rest longer than the phone's screen timeout |
| `[ ]` | D10c | After a real screen lock and an app switch the workout returns to the same set and rest | Phone; lock it mid-rest, open another app, come back |

## Steps nobody checked

Listed apart, because they are the reason for this document.

- [ ] **8** the beep is audible — the critic only proved the code calls Web Audio once per rest end (browser driver has no speakers).
- [ ] **all** the app on real Android Chrome — every critic walk ran in desktop Chromium at 412×915, not on a phone.
- [ ] **D9** `navigator.storage.persist()` on the phone — the call is proven in tests and in the browser log; whether Chrome grants it on your phone was not checked.

## What to look at

- **DESIGN.md decisions for you.** (1) With 2+ plans the list shows one chalk "Start" per card; DESIGN.md says "one chalk primary per screen" but also "Start on every card" (finding `g-plan-list-many-chalk`). (2) The approved "Widok serii" line about the last exercise was reworded: last exercise shows "To ostatnie ćwiczenie", last set of the plan "To ostatnia seria". (3) New lines were added for the empty list, editor labels, "Edytuj plan", the delete confirm, the expiry notice and the rest-view "Cofnij".
- **Decisions I took for you during the run** (you delegated them): a 500 ms tap guard after each screen change (stops a double tap from marking the next set); the beep plays only when the page was visible at the rest end and the end is seen within 2 s (a rest that ended while away is silent); every workout tap first checks the 2 h expiry, and a timer also expires an idle visible workout; a stored finished workout reopens on the end screen.
- The rest ring refills after each ±15 s tap, so it shows the share of the adjusted rest, not of the original (Minor `ring-refills-on-adjust`).
- Confirm dialogs do not move keyboard focus into themselves (Minor, accessibility).
- Minor/Nit findings left on purpose: see the "Minors" lines per phase in `workbench.md`.

## If something does not work

- Logs: browser DevTools console; stored data under DevTools → Application → Local Storage (`trening.plans.v1`, `trening.workout.v1`).
- Revert: `git revert 7683288 3b3c99c 8340d96 ea79ecb e2ffda4 c8b1567 f00c8ad 5eff3e6` (newest first).
- Round reports: `reviews/phase-<N>-round-<R>.md` and `reviews/goal-review.md` say what each critic saw and did not see.

## Walkthrough notes

## Sign-off

- [ ] I walked the whole path and it works
- [ ] The path works, but I have notes: <write>
- [ ] It does not work: <write the step and what happened>

After the walk: `change.md` → `status: implemented`, then `/10x-archive feat-mvp-plans-workout-loop`.
