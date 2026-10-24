# Phase review — feat-cardio-intervals · Phase 6: Lock mode · round 1

- **Scope:** `src/components/CardioSession.vue`, `src/components/CardioSession.test.ts` · **Files reviewed:** 2 (`+498/-11`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 6: Lock mode` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** FAIL
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover none

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 6.1 | component tests, with the new lock tests | `npx vitest run src/components` | pass — `Test Files  12 passed (12)` · `Tests  280 passed (280)`, no skip line |
| 6.2 | full suite, 0 failing (baseline 0) | `npm test` | pass — `Test Files  30 passed (30)` · `Tests  758 passed (758)`; 0 failing = baseline 0 |
| 6.3 | type check and build | `npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 271ms`, `precache  23 entries` |

The baseline line says 439 tests in 20 files. That count is from the start of the run, before phases 1 to 5. The baseline is about failing tests (0), so the higher count is not a problem.

### Manual (walked by the walker with playwright-cli 0.1.14; spot-checked: 6.4, screenshots `p6-r1-6.4-b-locked.png` and `p6-r1-6.4-g-reload.png`)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 6.4 | lock mode at 412×915 on `vite preview` | passed (with a mouse pointer) | `reviews/screenshots/p6-r1-6.4-*.png`. Plan „Interwały żółć” made in the UI. After „Zablokuj”: Meta row „Ekran zablokowany”, one button „Przytrzymaj, aby odblokować” at `16,835 380x64`, no Pauza / Zakończ / Zablokuj. `page.mouse.click` at the old Pauza centre (206,799) and Zakończ centre (304,871): still locked, `pausedAt:null` before and after. 1000 ms mouse hold: still locked. 2100 ms mouse hold: Pauza and Zakończ back. Locked at ODPOCZYNEK 0:27, about 5 s later 0:22 and still locked. Reload while locked: no lock, plan name back, session paused („PAUZA”, „Wznów”), as Phase 3 asks. |

Spot-check: I opened `p6-r1-6.4-b-locked.png`. It shows „EKRAN ZABLOKOWANY”, „INTERWAŁ 1 Z 16”, the clock 0:23 and only the hold bar with a padlock. I opened `p6-r1-6.4-g-reload.png`. It shows „INTERWAŁY ŻÓŁĆ”, „PAUZA”, „Wznów”, „Zablokuj”, „Zakończ” and no lock. → confirmed.

The walker used a mouse. On a mouse, `pointerleave` fires and no click follows the release. The target device is an Android phone with touch, so I ran touch experiments (E1, E2). They found the two main findings below.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1a | mouse hold 2150 ms at x=100 (Zablokuj comes back there), release there | coordinator, playwright-cli `run-code` on `vite preview` 4199 | `e1a_afterUp: {"locked":false,"dialog":0, ...}` | With a mouse the release does not hit the new buttons. |
| E1b | mouse hold 2150 ms at x=300 (Zakończ comes back there), release there | coordinator | `e1b_afterUp: {"locked":false,"dialog":0, ...}` | Same, with a mouse. |
| E1c | touch (CDP `Input.dispatchTouchEvent`, touch emulation on): press the bar at (206,867), slide to (206,400), hold 2.1 s | coordinator | `e1c_heldOffBar: {"locked":false, ...}`; events `pointerdown:touch:Przytrzymaj, aby odb`, then `pointerup:touch:Razem 0:07Zostało 7:` and only after it `pointerleave:touch:...` | The finger left the bar before 2 s, but the screen unlocked. With touch, `pointerleave` comes only after the lift (implicit pointer capture). |
| E1d | touch hold 2150 ms at (300,870), lift | coordinator | `e1d_afterEnd: {"locked":false,"dialog":1, buttons [..., "Wróć do treningu", "Zakończ trening"]}`; events `pointerdown:touch:Przytrzymaj, aby odb`, `pointerup:touch:Zakończ`, `click:touch:Zakończ` | The unlock happens while the finger is down. The lift lands on the new „Zakończ” and opens „Zakończyć trening?”. |
| E1e | touch hold 2150 ms at (100,870), lift | coordinator | `e1e_afterEnd: {"locked":true, buttons ["Przytrzymaj, aby odblokować@16,835,380,64"]}`; events `pointerup:touch:Zablokuj`, `click:touch:Zablokuj` | The lift lands on the new „Zablokuj” and locks the screen again. |
| E2 | E1e again, with the state read before the lift (touch at (60,880), 2.5 s) | coordinator | `{"start":{"locked":true,...,"phase":"ODPOCZYNEK"},"e2_beforeLift":{"locked":false,"buttons":["Pauza","Zablokuj","Zakończ"]},"e2_afterLift":{"locked":true,"buttons":["Przytrzymaj, aby odblokować"]},"e2_events":["pointerdown:touch:Przytrzymaj, aby odblokować","pointerup:touch:Zablokuj","click:touch:Zablokuj"]}` · screenshot `p6-r1-critic-touch-relock.png` | Same result again: unlocked at 2 s, locked again on the lift. Also: a lock set in PRACA stays through the change to ODPOCZYNEK. |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | Constants and functions have short "why" docblocks (`UNLOCK_HOLD_MS`, `HOLD_RENDER_MS`, `releaseHold`). |
| D2 | All documentation types covered? | pass | `DESIGN.md` „Tryb blokady” already describes the feature; no doc became wrong. |
| D3 | Documentation understandable? | pass | No wrong names or paths. |
| I1 | Satisfies the requirements? | fail | On touch, a 2 s hold does not reliably unlock (D7), and leaving the bar does not reset the hold. |
| I2 | Logically correct? | fail | The unlock fires while the finger is still down, and the lift then hits the buttons that appear under it. |
| I3 | No unnecessary complexity? | pass with nit | The padlock SVG and the label are written twice (content and fill copy). |
| I4 | Robust? | pass with minor | The timer is cleared on unmount. A second finger's release ends the first finger's hold. |
| I5 | Performant? | pass | A 50 ms interval runs only while the bar is held. |
| I6 | Secure? | n/a | No input, storage or network change. |
| I7 | Observable? | n/a | No failure path added. |
| I8 | New dependencies? | n/a | No manifest change. |
| ARCH | Project rules | fail | See the lines below. |

Architecture, one line per binding rule:
- Time from timestamps through `src/lib/clock.ts`, no tick counting — meets: `checkHold` reads `now()` against `holdStartedAt`; the 2.0 s release test passes with no tick.
- Lock mode only in memory, a reload removes it — meets: `locked` is a component `ref`; walker reload and the fresh-mount test agree.
- `DESIGN.md` tokens only, violet only on the cardio field — meets: `--on-cardio`, `--cardio`, `--space-sm`; no new color, font or size.
- Touch targets 64 px for the main action — meets: walker measured the bar at `380x64`.
- `prefers-reduced-motion` respected — meets: the fill is removed and „Trzymaj… 1/2” shows; the test pins it.
- No emoji, 2 px stroke icon — meets.
- PRD v2: „the lock mode is not a trap: the user can always unlock it and end the session on purpose, quickly” and FR-025 „unlock, then End” — fails on touch: see `unlock-lift-hits-revealed-buttons`.

Blockers: 1 · Major: 1 · Minor: 3 · Nit: 1
Findings going back to a builder: `unlock-lift-hits-revealed-buttons`, `touch-leave-does-not-reset`

## Findings

### I1 / I2. Requirements and logic

- **[Blocker]** `unlock-lift-hits-revealed-buttons` — `src/components/CardioSession.vue:58-64` and `:211-219` — the 50 ms render timer unlocks the screen while the finger is still on the bar. Then „Pauza”, „Zablokuj” and „Zakończ” render. „Zablokuj” (`16,843 184x56`) and „Zakończ” (`212,843 184x56`) are under nearly all of the bar (`16,835 380x64`). With touch, the lift sends `pointerup` and `click` to the button under the finger. **Fails when:** the user holds the bar with a finger for 2 s on the left half → the screen unlocks at 2 s and locks again on the lift (E1e, E2). The user holds on the right half → the screen unlocks and „Zakończyć trening?” opens (E1d). A clean unlock happens only in the 12 px gap between the buttons or the top 8 px of the bar. This breaks D7 („a 2 s hold unlocks”) and the PRD v2 rule that the lock is not a trap. No test covers the lift after an unlock: jsdom does not route the release to the new element. Confidence: medium for a real phone. I saw it in Chromium touch emulation (CDP). A real Android long press can act differently. The mouse path (E1a, E1b) works.
- **[Major]** `touch-leave-does-not-reset` — `src/components/CardioSession.vue:188` (`@pointerleave="cancelHold"`) — with touch, the browser captures the pointer on the bar, so `pointerleave` does not fire until the lift. **Fails when:** a finger presses the bar and slides off it (E1c: to y=400) and stays down for 2 s → the screen unlocks (`e1c_heldOffBar.locked: false`). The contract says „releasing, cancelling or leaving the bar before 2 s resets it to zero”. The test `a pointerleave before 2 s resets the hold` triggers a synthetic `pointerleave` that a touch hold never sends, so it passes without the behaviour on the target device.

### I4. Robust

- **[Minor]** `hold-ignores-pointer-id` — `src/components/CardioSession.vue:67-85` — `beginHold`, `releaseHold` and `cancelHold` do not check `pointerId` or the mouse button. **Fails when:** a second finger touches and lifts on the bar during a hold → `releaseHold` resets the first finger's hold. A right mouse button also starts a hold. Low impact.

### Accessibility

- **[Minor]** `lock-focus-lost` — `src/components/CardioSession.vue:181,216` — „Zablokuj” and the hold bar are removed from the DOM when the state flips. Focus falls to `<body>`. **Fails when:** a keyboard user locks with Enter → no element has focus; the user must Tab to the bar. The same happens after an unlock. Confidence: medium (not walked with a keyboard).

### Test adequacy

- **[Minor]** `lock-across-interval-unasserted` — `src/components/CardioSession.test.ts:1006-1021` — the test „the session keeps running while locked” checks `isLocked` only at 22 s, before the interval changes. It does not check that the lock stays after the change to ODPOCZYNEK at 23 s. E2 shows that the lock does stay in the browser, so the behaviour is correct today.

### I3. Complexity

- **[Nit]** `padlock-svg-duplicated` — `src/components/CardioSession.vue:195-207` — the padlock SVG and the label text are written twice (the content and the clip-path fill copy). A small inline component or a `v-for` over two layers would keep them the same.

## Not reviewed

- A real Android phone: a real long press, `contextmenu` on touch, and the click after a long press. The two main findings come from Chromium touch emulation (CDP `Input.dispatchTouchEvent`). D9 (owner-run) is the real check.
- The keyboard hold (Space/Enter for 2 s) was checked only by the unit tests, not in the browser.
- No unit mutants were run. Each contract clause has a matching assertion with literal values (1900 ms, 2000 ms, 50 %, 75 %, „Trzymaj… 1/2”). The tick-counting trap is covered: `holdFor` moves the clock and runs one tick only.

## Observations outside scope

- None.
