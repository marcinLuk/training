# Phase review — feat-cardio-intervals · Phase 6: Lock mode · round 2

- **Scope:** `src/components/CardioSession.vue`, `src/components/CardioSession.test.ts` · **Files reviewed:** 2 (`+745/-12`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 6: Lock mode` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover sonnet ×1

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 6.1 | component tests incl. new lock tests | `npx vitest run src/components` | pass — `Test Files  12 passed (12)` · `Tests  297 passed (297)`, no skips |
| 6.2 | full suite, 0 failing (baseline 0) | `npm test` | pass — `Test Files  30 passed (30)` · `Tests  775 passed (775)`; 0 failing = baseline 0, no failing file. The brief's baseline counts (439 tests, 20 files) were taken at the run's Step 0, before phases 1–5 added tests; only the failing count is compared. |
| 6.3 | build exits 0 | `npm run build` | pass — `vue-tsc -b && vite build` exit 0, `✓ built in 263ms`, `PWA v2.0.0 … precache 23 entries` |

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `unlock-lift-hits-revealed-buttons` | round 1 (Blocker) | closed | Coordinator, `vite preview` 4199, CDP touch, fake clock, plan „Bieg łąką” made in the UI: touch hold 2100 ms at x=348 / 64 / 206, y=867 on bar `[16,835,380,64]` → `*_beforeLift: false` (unlocked under the finger), after the lift + 300 ms `{"locked":false,"buttons":["Pauza","Zablokuj","Zakończ"],"dialog":0}` for right, left and centre. A fresh touch tap on Zakończ after that → `dialog: 1` (the guard does not eat the next tap). Screenshot `reviews/screenshots/p6-r2-critic-touch-spotcheck.png`. Unit pin: E1 (click guard removed) turns `the lift and click of the press that unlocked do nothing on Zablokuj` and `… on Zakończ` red (`AssertionError: expected true to be false`); E2 (pointerup guard removed) turns the three `the lift on … alone … is swallowed` tests red. |
| `touch-leave-does-not-reset` | round 1 (Major) | closed | Coordinator, same session: touchStart (206,867), 500 ms, touchMove (206,400), 2100 ms → `slideOff_beforeLift: true`, after the lift `{"locked":true,"meta":"Ekran zablokowany","dialog":0}`. Unit pin: E3 (pointermove check removed) turns the slide-off test and all 4 `a slide off the bar to the … resets the hold` tests red (`expected 'clip-path: inset(0 calc(100% - 75%) 0…' to contain 'calc(100% - 0%)'`). |

### Manual (walked by the walker with playwright-cli 0.1.14; spot-checked: 6.4 — screenshot and the touch re-run)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 6.4 | lock at 412×915 on `vite preview` (D7) | passed | `reviews/screenshots/p6-r2-6.4-locked.png` — Meta row „EKRAN ZABLOKOWANY”, one button „Przytrzymaj, aby odblokować” with a padlock, Pauza/Zablokuj/Zakończ gone; mouse taps at the old Pauza and Zakończ spots: no dialog, no change; mouse 1 s hold stays locked (`p6-r2-6.4-fill1s.png`); mouse 2 s hold unlocks (`p6-r2-6.4-unlocked-mouse.png`); clock 0:22 → 0:13 while locked; reload → unlocked and paused („Wznów”, `p6-r2-6.4-reload.png`); touch 1 s hold stays locked; touch 2.1 s hold left/right/centre unlocks with no re-lock and no „Zakończyć trening?”; touch slide-off stays locked (`p6-r2-6.4-slideoff.png`). Rects: Pauza `[16,767,380,64]`, Zablokuj `[16,843,184,56]`, Zakończ `[212,843,184,56]`, bar `[16,835,380,64]`. |

Spot-check: `p6-r2-6.4-locked.png` and `p6-r2-6.4-touch-centre-after.png` opened — they show what the walker line claims. The coordinator's own touch run (closures above) reproduced the walker's touch results → confirmed.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All unit mutants: fresh copy in `<scratch>/mutant-E<n>`, `diff` against the real file shows only the named line, `vitest run src/components/CardioSession.test.ts` (79 tests, no skips in any run).

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E0 | control, unmutated copy | prover | `Tests  79 passed (79)` | the copy is green |
| E1 | `onFieldClickCapture` returns at once | prover; re-run by coordinator | `Tests  3 failed \| 76 passed (79)`; `… do nothing on Zablokuj …`, `… on Zakończ …`, `the guard swallows one click only …` — `expected true to be false` | the click half of the lift guard is pinned (re-run identical → prover confirmed) |
| E2 | `onFieldPointerUpCapture` returns at once | prover | `Tests  6 failed \| 73 passed (79)`; `expected "vi.fn()" to not be called at all, but actually been called 1 times` | the pointerup half is pinned |
| E3 | `onBarPointerMove` returns at once | prover | `Tests  5 failed \| 74 passed (79)` (all slide-off tests) | the touch slide-off reset is pinned |
| E4 | `>=` → `>` at the 2 s boundary | prover | `Tests  18 failed \| 61 passed (79)` incl. `holding Space for 2.0 s unlocks and 1.9 s does not` | the inclusive 2.0 s boundary is pinned with literal values |
| E5 | `UNLOCK_HOLD_MS = 1900` | prover | `Tests  18 failed \| 61 passed (79)`; `expected '… calc(100% - 78.947…' to contain 'calc(100% - 75%)'` | the 2000 ms constant is pinned by literals |
| E6 | hold clock counts 50 ms ticks instead of `now()` | prover | `Tests  22 failed \| 57 passed (79)`; `expected '… calc(100% - 2.5%) …' to contain 'calc(100% - 75%)'` | a tick-counting hold cannot pass (runner trap met) |
| E7 | a plain click on the locked bar unlocks | prover | `Tests  1 failed \| 78 passed (79)` — `taps where Pauza and Zakończ were do nothing …` | „other touches do nothing” is pinned |
| E8 | real tree re-run | prover | `Tests  79 passed (79)` | — |
| E9 | probe: pointercancel of the unlocking press, then a new press with the same pointerId 7 on Zakończ | coordinator | `Tests  1 failed \| 79 skipped (80)` — `Error: Unable to get [role="alertdialog"]` | the guard stays armed after a cancel and eats that press (finding below) |
| B1 | touch closure proof on the real build | coordinator | see Closures | Blocker and Major of round 1 closed |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | every new function and ref has a "why" docblock (pointer capture, the lift guard, render timer counts nothing). |
| D2 | All documentation types covered? | pass | DESIGN.md „Tryb blokady” already describes the feature; no doc made wrong. |
| D3 | Docs understandable? | pass | no wrong names or paths. |
| I1 | Satisfies the requirements? | pass | every Phase 6 clause maps to code and a test: bar 64 px full width (`[16,835,380,64]`), 2 px on-cardio outline, stroke padlock, „Ekran zablokowany”, 2 s hold from timestamps, fill from the left, reset on release/cancel/leave/slide-off, reduced-motion count, Space/Enter, taps ignored, session runs, reload unlocks. |
| I2 | Logically correct? | Minor | the lift guard can outlive its press (`unlock-guard-can-outlive-its-press`). |
| I3 | Unnecessary complexity? | pass | the two-stage guard is the smallest state that covers lift + click. |
| I4 | Robust? | pass | timer cleared on cancel, unlock and unmount; `a timer that fires after a cancel does not unlock` pins it. |
| I5 | Performant? | pass | one 50 ms interval only while the bar is held. |
| I6 | Secure? | n/a | no input, storage or network change. |
| I7 | Observable? | n/a | no failure path added; no debug output left. |
| I8 | New dependencies? | n/a | no manifest change. |
| ARCH | Project rules | pass | see below |

Architecture — project rules binding this phase:
- Time from timestamps through `src/lib/clock.ts`, no tick counting — meets (`now()` in `checkHold`/`beginHold`; E6 red).
- Lock mode in memory only — meets (`locked` is a component ref; `locking writes nothing to storage` and the reload test; walker reload).
- DESIGN.md tokens only, violet only on the cardio field — meets (`--on-cardio`, `--cardio`, `--space-sm`; no new color, font or size token).
- Touch targets 64 px main / 56 px secondary — meets (bar 380×64, Zablokuj/Zakończ 184×56, measured).
- No emoji, no gradient, `prefers-reduced-motion` respected — meets (SVG padlock, `Trzymaj… 1/2`, fill removed).
- Polish UI text, English code — meets.
- No new dependency, storage keys unchanged, no out-of-scope work (no strength lock) — meets.

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 0
Findings going back to a builder: none.

## Findings

### I2. Logically correct?

- **[Minor]** `unlock-guard-can-outlive-its-press` — `src/components/CardioSession.vue:106-122` — the guard `afterUnlock` is cleared only by a pointerup + click of the unlocking pointer, or by a pointerdown after the 'lifted' stage. A `pointercancel` of that pointer leaves it in stage 'down'; a lift whose click never comes leaves it in 'lifted' until the next pointerdown. **Fails when:** the unlocking press is cancelled and a later press uses the same pointerId → that press's pointerup and click are swallowed (E9: no „Zakończyć trening?”). Also: stage 'lifted' with no click, then a keyboard activation (Enter on a focused button, no pointerdown) → that one click is swallowed. On the target device each new touch gets a new pointerId, so the first path needs a mouse or pen whose release was lost; that is why this is Minor and not „a lost user action” Major (confidence: medium). The test name `a cancelled press ends the guard: the next click works` claims more than it checks: the click works only because stage 'down' never swallows clicks; the guard is not ended.

## Not reviewed

- A real Android long press and a real phone lock during a hold (does Chrome send `pointercancel` when the screen turns off mid-hold; if not, the throttled timer unlocks on return). Not observable by the browser driver; D9 is owner-run.
- Contrast of the cardio-colored label on the on-cardio fill was not measured (both are approved DESIGN.md tokens used as a pair elsewhere).

## Observations outside scope

- none
