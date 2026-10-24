# Phase review — feat-cardio-intervals · Phase 5: Cardio session screen · round 2

- **Scope:** `src/App.vue`, `src/workout/cardioEngine.ts`, `src/components/CardioSession.vue`, `src/components/CardioSession.test.ts`, `src/components/CardioStored.test.ts`, `src/components/CardioPlansFlow.test.ts` · **Files reviewed:** 6 (tracked `+101/-29`; untracked `CardioSession.vue` 270 lines and `CardioSession.test.ts` 691 lines read in full)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 5: Cardio session screen` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover none (the coordinator ran the 3 experiment commands)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 5.1 | component tests | `npx vitest run src/components` | pass — `Test Files  12 passed (12)` · `Tests  256 passed (256)`, no skip line |
| 5.2 | full suite, baseline 0 failing | `npm test` | pass — `Test Files  30 passed (30)` · `Tests  734 passed (734)`; 0 failing = baseline 0. The brief's count (439 tests, 20 files) predates the earlier phases of this run; round 1 counted 731, this round adds 3 tests. |
| 5.3 | type check + build | `npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 251ms`, `precache  23 entries (338.88 KiB)`. Proves types only. |

### Closures

| finding-id | Reported in | Closed? | Evidence produced by this review |
| :-- | :-- | :-- | :-- |
| `meta-row-type-role` | round 1 (Major) | closed | Walker, in the built app at 412×915: `span.meta-position` "Interwał 3 z 4" → fontFamily `"Barlow Condensed", "Arial Narrow", sans-serif`, fontWeight `700`, textTransform `uppercase`, fontSize `18px`, innerText `INTERWAŁ 3 Z 4`; the "Razem 0:33" span → same values, innerText `RAZEM 0:33`. Round 1 measured `"Barlow Semi Condensed", 600, none`. Tabular figures come from `:root` (`src/styles/base.css:10` `font-variant-numeric: tabular-nums`). Spot-check of `p5-r2-5.4-work.png` shows "ROWER ŹRÓDŁO", "INTERWAŁ 1 Z 4", "RAZEM 0:00", "ZOSTAŁO 1:00" in the condensed display face. |
| `cross-kind-expiry-dismiss-unpinned` | round 1 (Major) | closed | E1: the round-1 mutant (drop `if (started) dismissExpired()`) now turns 2 tests red at `CardioSession.test.ts:538:29` and `:557:29`, `AssertionError: expected 'PlanyTrening wygasł po 2 godzinach be…' not to contain 'Trening wygasł po 2 godzinach bez dot…'`, `Tests  2 failed \| 36 passed (38)`. E2 shows each direction is pinned on its own. |

### Manual (walked by the walker with playwright-cli 0.1.14; spot-checked: 5.4 `p5-r2-5.4-work.png`, 5.5 `p5-r2-5.5-reload.png`)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 5.4 | session screen at 412×915, fake clock | passed | `reviews/screenshots/p5-r2-5.4-prepare.png`, `-work.png`, `-rest.png`, `-pause.png`, `-confirm.png`, `-end.png`. Plan "Rower źródło" made through the UI, 2 × (Praca 0:20, Odpoczynek 0:10) = 4 intervals, 1:00. Start: "ROWER ŹRÓDŁO \| PRZYGOTUJ SIĘ \| 0:03 \| Dalej: Praca · 0:20 \| RAZEM 0:00 \| ZOSTAŁO 1:00". +3.1 s: "INTERWAŁ 1 Z 4 \| PRACA \| 0:20 \| Dalej: Odpoczynek · 0:10"; +8 s: "0:15 \| RAZEM 0:05 \| ZOSTAŁO 0:55". +24 s: "INTERWAŁ 2 Z 4 \| ODPOCZYNEK \| 0:09". Pauza: "PAUZA \| 0:17 … Wznów", still "0:17" after +10 s fake time. Wznów: "PRACA \| 0:17", +2 s "0:15". Zakończ: alertdialog "ZAKOŃCZYĆ TRENING? \| Wróć do treningu \| Zakończ trening"; Wróć continues. After the last interval: "KONIEC TRENINGU \| Wróć do planów" with the plan name. "Przebieg" has 4 items "1. Praca … 4. Odpoczynek". |
| 5.5 | reload in work + sound calls | passed | `reviews/screenshots/p5-r2-5.5-reload.png`. Before reload: "INTERWAŁ 3 Z 4 \| PRACA \| 0:15 \| RAZEM 0:35", stored `kind cardio`, `pausedAt null`. After reload: "INTERWAŁ 3 Z 4 \| PAUZA \| 0:15 \| Wznów \| RAZEM 0:35 \| ZOSTAŁO 0:25", `pausedAt` set, still 0:15 after +5 s. `createOscillator` calls with `visibilityState visible`: 1 at start, 2 at 0:02, 5 at the work start, 9 after the next boundary, 14 by interval 3, 22 after the end. Wake Lock fake: one request at start. A real speaker: unreachable (not observable by the browser driver). |

Spot-check: I opened `p5-r2-5.4-work.png`. It shows "ROWER ŹRÓDŁO", "INTERWAŁ 1 Z 4", "PRACA", "0:20", "Dalej: Odpoczynek · 0:10", "RAZEM 0:00", "ZOSTAŁO 1:00", 4 segments with the first outlined, Pauza at the bottom → matches the walker's line. I opened `p5-r2-5.5-reload.png`. It shows "INTERWAŁ 3 Z 4", "PAUZA", "0:15", "Wznów", "RAZEM 0:35", "ZOSTAŁO 0:25", the third segment outlined → matches. Confirmed.

### Experiments

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | closure proof: mutant replaces `if (started) dismissExpired()` in `startPlan` (`App.vue:61`) with `void started`; run `CardioSession.test.ts` in a scratch copy | coordinator | `× a strength expiry notice does not come back after a cardio session starts and ends` · `× a cardio expiry notice does not come back after a strength workout starts and ends` · failing at `:538:29` and `:557:29` (the last `not.toContain(EXPIRY_NOTICE)` of each test) · `Tests  2 failed \| 36 passed (38)`, no skip line | The App line is now pinned for both kinds, for the right reason (the notice comes back on the plan list). |
| E2 | mutant: drop only `workout.dismissExpired()` from `dismissExpired()` (`App.vue:65`) | coordinator | `× a strength expiry notice does not come back after a cardio session starts and ends` at `:538:29` · `Tests  1 failed \| 37 passed (38)` | The strength direction is pinned on its own; the cardio direction is pinned by E1's second red. |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | `timeline` field, `workoutOpen`, the setup order and the cross-kind dismiss carry short "why" comments. |
| D2 | All documentation types covered? | pass | No doc needs a change for this phase. |
| D3 | Documentation understandable? | pass | One stale `describe` name (Nit, carried). |
| I1 | Satisfies the requirements? | pass | "Sesja cardio" items 1–8, get-ready, PAUZA, Zakończ confirm, end screen, App wiring and wake-lock order are present; Meta rows now use the Meta role. |
| I2 | Logically correct? | pass | Phase words, ceil clock, floor "Razem", last-interval text and segment state follow the view. |
| I3 | No unnecessary complexity? | pass | One component, one new view field, one small App helper. |
| I4 | Robust? | pass | One workout at a time; the end confirm keeps the session running. |
| I5 | Performant? | n/a | One computed view per tick; at most a few hundred segments. |
| I6 | Secure? | n/a | No input, no network. |
| I7 | Observable? | n/a | No new failure path. |
| I8 | New dependencies? | n/a | No manifest change. |
| ARCH | Project rules | pass | All binding rules met (below). |

Architecture — project rules that bind this phase:

- DESIGN.md Meta role (Barlow Condensed 700, 1,125rem, wersaliki, cyfry tabelaryczne) → meets (walker measurement; `base.css:10` tabular-nums).
- Violet only on the cardio field and the tag; main action on-cardio, not chalk → meets (screenshots; `.btn-cardio` uses `--on-cardio`).
- Touch targets 64 / 56 px, Thumb Rule, no page scroll → meets (round 1 E2 measured them; this round changed only the Meta row text style, and the screenshots show the same layout).
- Time from timestamps, never ticks → meets (tests move the clock with `vi.setSystemTime` and no interval callback).
- Storage keys unchanged; a saved strength workout still restores → meets (`CardioSession.test.ts:560`).
- Wake lock: `useWorkout` before `useCardio`, App-level tests → meets (pinned in round 1 E1; code unchanged).
- Strength screens and texts unchanged; no new dependency; no NEVER-WEAKEN pattern in the diff → meets.

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 3
Findings going back to a builder: none.

## Findings

### Test adequacy

- **[Minor]** `dense-timeline-boundary-loose` — `src/components/CardioSession.test.ts:250` — still open from round 1. The test uses 26 and 24 segments; 25, the first value above 24, is not tested. **Fails when:** the rule becomes `> DENSE_TIMELINE_SEGMENTS + 1` → the suite stays green and a 25-interval plan gets 4 px gaps instead of 2 px. Not re-run this round; the test and the rule did not change.

### Nits

- **[Nit]** `stale-describe-name` — `src/components/CardioStored.test.ts:46` — still open. The `describe` says "a cardio plan in storage, before the cardio screens exist"; its test now starts the cardio session screen.
- **[Nit]** `clock-line-height` — `src/components/CardioSession.vue:173` — still open. `.clock` has `line-height: 0.9`; DESIGN.md Clock is 0,85.
- **[Nit]** `title-role-case` — `src/components/CardioSession.vue:161,232` — still open. `.interval-name` and `.next-row` use the Title size and weight but not its uppercase and letter spacing. This follows the strength "Dalej:" row; a DESIGN.md question for the owner, not a builder fix.

## Not reviewed

- A real sound through a speaker and a real phone lock: not observable by the browser driver (D9 is owner-run).
- The Meta-row unit test (`CardioSession.test.ts:278`) reads the source CSS with a regex; it pins the source text, not the rendered style. The rendered style was checked in the browser by the walker this round.
- The walker reported that `page.clock.pauseAt` hung `run-code`, so its fake clock advanced in real time between `runFor` jumps and it redid the walk once. The reported checks do not depend on a fully stopped clock.
- Lock mode is phase 6; "Zablokuj" is a no-op button here, as the contract allows.

## Observations outside scope

- With the end confirm open, a session that reaches its planned end shows the end screen with the confirm still on top (`App.vue:116,124`). This comes from the phase 3 `useCardio` controller (carried from round 1).
