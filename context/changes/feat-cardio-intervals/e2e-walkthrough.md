# To test: feat-cardio-intervals — Cardio module (interval sessions with sounds and lock mode)

Implemented 2026-10-24 · 7 slices · commits: `4ac1247`…`1599551`
Contract: `brief.md` · run record: `workbench.md` · code reviews: `reviews/`

**Nobody walked this change end to end.** You walk the path below.

## What changed

You can now make cardio plans next to strength plans. A cardio plan has blocks. Each block repeats a list of intervals (work or rest, each with a name and a time). Every plan card shows a „Siła” or „Cardio” tag. „Nowy plan” first asks „Jaki plan?”. A cardio session fills the screen with violet. It shows a 3 s get-ready, the time left in the interval, the next interval, a timeline, and the total time. It plays beeps at 3-2-1 s before each interval ends, and different sounds for work start and rest start. „Zablokuj” locks the screen against pocket touches; you unlock it by holding the bar for 2 s. The strength workout works as before.

### What changed underneath (no visible effect)

- Plans in storage before this change (no type field) load as strength plans. A running strength workout in storage still restores.
- One 500 ms start guard is shared by strength and cardio. The second tap of a double tap that closes a workout does not start a new one.

## Before you start

- Environment: `npm run build && ./node_modules/.bin/vite preview --port 4199 --strictPort`, then open `http://localhost:4199` at phone size (412×915). For the phone steps use Chrome remote debugging with port forwarding (a LAN address is not a secure context), or the deployed app after the merge.
- External dependencies: none. The speaker steps need sound on.
- Account: none locally.
- Start data: one strength plan made before this change, if you have one. Otherwise make one in step 2.
- Clean state: no running workout. Clear site data if an old session is stored.

## Path

Legend: `[ ]` to check · `[x]` checked, works · `[!]` checked, does not work (details in „Notatki z przejścia”) · `[-]` skipped on purpose

| Status | # | Step | Expected result | Checked by |
| :-- | :-- | :-- | :-- | :-- |
| `[ ]` | 1 | Open the app with plans made before this change | Every old plan shows; each card has a grey „Siła” tag and a chalk Start | critic (`reviews/phase-4-round-2.md`) + tests (D1) |
| `[ ]` | 2 | Tap „Nowy plan” | The question „Jaki plan?” with „Siła”, „Cardio”, „Anuluj” (56 px); „Siła” opens the strength editor as before | critic (`reviews/phase-4-round-1.md`) |
| `[ ]` | 3 | „Nowy plan” → „Cardio” | „Nowy plan cardio” with Blok 1, „Powtórz × 8”, Praca 0:30 and Odpoczynek 0:30 | critic (`reviews/phase-4-round-2.md`) |
| `[ ]` | 4 | Name it „Bieg z rozgrzewką”; „Dodaj blok”; in a block tap „Dodaj interwał” twice; switch one interval with the Praca/Odpoczynek toggle; change a time with „Czas” | A new interval is the opposite type of the last one; time steps by 5 s, from 0:05 to 60:00; the toggle is never chalk | critic, tests only (`reviews/phase-4-round-2.md`) — the 5 s limits were not walked |
| `[ ]` | 5 | Clear an interval name and tap „Zapisz plan” | A Polish error under that interval; your other data stays on screen; nothing saved | critic, tests only (`reviews/phase-4-round-1.md`) |
| `[ ]` | 6 | Fill the name again and save | Back on the list: a violet „Cardio” tag, a summary like „32 interwały, 16:00”, a chalk Start | critic (`reviews/phase-4-round-2.md`) |
| `[ ]` | 7 | „Edytuj: Bieg z rozgrzewką”, change „Powtórz”, save | „Edytuj plan cardio” opens with your data; the summary on the card changes | critic (`reviews/phase-4-round-1.md`) |
| `[ ]` | 8 | „Start: Bieg z rozgrzewką” | Full violet screen: „PRZYGOTUJ SIĘ”, the clock counts 0:03 → 0:00 | critic (`reviews/phase-5-round-2.md`) |
| `[ ]` | 9 | Listen through the get-ready and the first two interval changes | 3 short beeps at 3-2-1 s; a work-start sound; later a different rest-start sound | **nobody** — the critic only counted sound calls |
| `[ ]` | 10 | Watch a work interval | „PRACA”, the clock counts down, top row „INTERWAŁ X Z Y”, „Dalej: <name> · <m:ss>”, bottom „RAZEM” and „ZOSTAŁO”, the timeline marks the current segment | critic (`reviews/phase-5-round-2.md`) |
| `[ ]` | 11 | Tap „Pauza”, wait, tap „Wznów” | „PAUZA” and „Wznów”; the clock stands; after „Wznów” it runs on from the same time | critic (`reviews/phase-5-round-2.md`) |
| `[ ]` | 12 | Tap „Zablokuj” | „Ekran zablokowany” at the top; one bar „Przytrzymaj, aby odblokować” with a padlock; the session keeps running | critic (`reviews/phase-6-round-2.md`) |
| `[ ]` | 13 | While locked, tap where „Pauza” and „Zakończ” were; hold the bar 1 s and let go | Nothing happens; the fill goes back to zero | critic (`reviews/phase-6-round-2.md`) |
| `[ ]` | 14 | With a finger, hold the bar 2 s, on its left half and on its right half, then lift | It unlocks at 2 s; the lift does not lock again and does not open „Zakończyć trening?” | critic, touch emulation only (`reviews/phase-6-round-2.md`) |
| `[ ]` | 15 | Press the bar, slide the finger off it, keep it down 2 s | The screen stays locked | critic, touch emulation only (`reviews/phase-6-round-2.md`) |
| `[ ]` | 16 | Lock again, then reload the page during a work interval | The session comes back paused („PAUZA”, „Wznów”) at the same interval, and not locked | critic (`reviews/phase-5-round-2.md`, `reviews/phase-6-round-2.md`) |
| `[ ]` | 17 | „Wznów”, then „Zakończ” → „Wróć do treningu” | The question „Zakończyć trening?”; the session runs on behind it; „Wróć do treningu” keeps it | critic (`reviews/phase-5-round-2.md`) |
| `[ ]` | 18 | Start the plan again and let it run to the end (or use a short plan) | „Koniec treningu” with the plan name; „Wróć do planów” goes to the list | critic (`reviews/phase-5-round-2.md`) |
| `[ ]` | 19 | On „Zakończ trening” (or „Wróć do planów”), double-tap fast so the second tap lands on another plan's Start | No new workout starts; a Start tap after half a second works | tests only (`reviews/phase-7-round-2.md`, `reviews/goal-review-2.md`) — **nobody in a browser** |
| `[ ]` | 20 | Start a strength plan, finish a set, let the rest run out | The strength workout looks and works as before; the end-of-rest sound plays | **nobody** in a browser this run — the strength tests pass unchanged (D8) |
| `[ ]` | 21 | Delete the cardio plan with „Usuń plan: Bieg z rozgrzewką” | The confirm question; after yes the card is gone | critic (`reviews/phase-4-round-1.md`) |

## Owner-run — not executed by the loop

### D9 — on your Android phone

Why not the loop: it needs a real phone, a real speaker, a real screen lock and a pocket. No agent can hold a phone.

| Status | # | Criterion (from the brief) | What you need |
| :-- | :-- | :-- | :-- |
| `[ ]` | D9a | the sounds are heard with the phone in a pocket | the phone, a cardio plan, sound on |
| `[ ]` | D9b | the screen stays on during the session | the phone; do not touch it for longer than the screen timeout |
| `[ ]` | D9c | behaviour after a real phone lock (power button): the session keeps its time; on return it shows the right interval | the phone; a sound after a power-button lock is not promised (PRD v2 Non-Goals) |

## Steps nobody checked

- [ ] **9** — the real sounds (beeps, work-start, rest-start) — the browser driver can only count sound calls, not hear them
- [ ] **19** — the double tap across workout kinds in a real browser — proved by App-level tests and mutants only
- [ ] **20** — the strength workout in a browser after this change — proved by the unchanged strength tests only
- [ ] **14, 15 on a real phone** — the critic used Chromium touch emulation; a real Android long press can act differently

## What to look at

- **DESIGN.md questions for you** (the loop did not change code or DESIGN.md):
  - the interval name and the „Dalej:” row are not uppercase as the Title role says (`title-role-case`);
  - small values differ from DESIGN.md: the bar track uses on-cardio at 25 % (DESIGN.md: rgba(0,0,0,.18–.2)), Clock line-height 0.9 (0.85), Meta line-height 1.3 (1.2), the 3 get-ready beeps are not in DESIGN.md (`design-value-drift`, `clock-line-height`).
- When a locked session ends, the end screen is not locked, so pocket touches can reach it (`end-screen-not-locked`). DESIGN.md allows this; your call.
- If the phone clock jumps back after a workout ends, Start can do nothing for that long (`start-guard-clock-step-back`). The strength workout had the same behaviour before.
- With a mouse, a cancelled unlock press can swallow the next press of the same pointer (`unlock-guard-can-outlive-its-press`). On a phone each touch gets a new id, so it should not show.
- The buttons „Usuń interwał”, „Usuń blok” and „Dodaj interwał” have no position number in their names, unlike „Usuń ćwiczenie N” (`ambiguous-remove-button-names`).
- Code-health Minors (no visible effect): strength and cardio controllers duplicate their guard, expiry and wake-lock logic; the wake lock depends on the setup order in `App.vue` (pinned by two tests); some exports are now used only by tests. Full list: `workbench.md`, "Open".

## If something does not work

- Logs: the browser console (Chrome remote debugging on the phone).
- Revert: `git revert 1599551 f554013 3f0d32f 799275f 442b607 40c4517 4ac1247` (newest first).
- Round reports: `reviews/phase-<N>-round-<R>.md`, `reviews/goal-review.md`, `reviews/goal-review-2.md` — what each critic saw and did not see.

## Notatki z przejścia

Empty at the start. The `/10x-walkthrough` skill adds one line for each step marked `[!]` or `[-]`:
`- **krok <n>** — <date> — <what happened / why skipped>`

## Odhaczenie

- [ ] I walked the whole path and it works
- [ ] The path works, but I have notes: <write>
- [ ] It does not work: <write the step and what happened>

After the walk: `change.md` → `status: implemented`, then `/10x-archive feat-cardio-intervals`.
