# Phase review — feat-cardio-intervals · Phase 4: Plan list tags, plan type choice and cardio editor · round 1

- **Scope:** `src/App.vue`, `src/components/PlanList.vue`, `src/styles/tokens.css`, `src/components/CardioPlanEditor.vue`, `src/components/PlanTypeChoice.vue`, `src/components/{App,CardioStored,EditDelete,Resume,CardioPlanEditor,CardioPlansFlow}.test.ts` · **Files reviewed:** 11 (`+1027/-10`)
- **Contract:** `context/changes/feat-cardio-intervals/brief.md` → `### Phase 4` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** FAIL
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover none (experiments run by the coordinator in one script)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | component tests incl. tags, "Jaki plan?", cardio editor | `npx vitest run src/components` | pass — `Test Files  11 passed (11)` · `Tests  213 passed (213)`, no skip line |
| 4.2 | full suite, baseline 0 failing | `npm test` | pass — `Test Files  29 passed (29)` · `Tests  691 passed (691)`; 0 failing = baseline 0; no failing file |
| 4.3 | type check + build | `npm run build` | pass — `vue-tsc -b && vite build` exit 0, `✓ built in 233ms`, `precache  23 entries` |

### Manual (walked by the walker with playwright-cli 0.1.14 at 412×915 on `vite preview`; spot-checked: 4.4)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 4.4 | "Nowy plan" → "Jaki plan?" → "Cardio" editor, save „Bieg z rozgrzewką” with 2 blocks, tags, summary, chalk Start, edit, delete, sizes | passed | `reviews/screenshots/p4-r1-4.4-{editor-new,list,edit,delete}.png`; alertdialog "Jaki plan?" (Siła, Cardio, Anuluj, each 380×56); "Nowy plan cardio", Blok 1 "× 8", Praca 0:30, Odpoczynek 0:30; card tag "Cardio" 57.4×24 bg `rgb(169,139,245)` text `rgb(20,13,43)`; summary „32 interwały, 16:00” (2 blocks × 8 × 2 — the „16 interwałów” style); Start 346×64 bg `rgb(242,242,239)` on both cards; strength tag "Siła" bg `rgb(38,39,42)`; edit block 2 × 8→× 9 → „34 interwały, 17:00”; delete via „Usunąć plan „Bieg z rozgrzewką”?” removed it from list and `trening.plans.v1`; steppers 56×56, kind toggles 152×56, Usuń interwał 148.9×56, Usuń blok 118.8×56, Dodaj blok / Anuluj 380×56, Zapisz plan 380×64, Edytuj 95.3×56, Usuń plan 118.7×56; console 0 errors |

Spot-check: opened `p4-r1-4.4-list.png` — it shows "Przysiady dzień" with a grey "Siła" pill and "Bieg z rozgrzewką" with a violet "Cardio" pill, „32 interwały, 16:00”, two chalk Start buttons. Also opened `p4-r1-4.4-editor-new.png` — "NOWY PLAN CARDIO", Blok 1, Powtórz × 8, Interwał 1 Praca selected, Czas 0:30. Confirmed.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All in scratch copies (`<scratch>/mutant-<name>`, node_modules symlinked), command `./node_modules/.bin/vitest run src/components/CardioPlanEditor.test.ts src/components/CardioPlansFlow.test.ts src/components/Probe.test.ts`. `Probe.test.ts` is a scratch-only canary file with two tests (PROBE-M1, PROBE-M7) that prove the M1 and M7 mutations change behaviour. No run printed a skip line.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| M0 | unmutated copy + probes | coordinator | `Tests  44 passed (44)` | probes are green on the real code |
| M1 | drop `errors.value = []` in `removeBlock` (line 59) | coordinator | `Tests  1 failed \| 43 passed (44)` — only `× PROBE-M1 removing a block clears the validation messages`; `AssertionError: expected 'Nowy plan cardioNazwa planuWpisz nazw…' not to contain 'Wpisz nazwę planu.'` | the mutation changes behaviour, yet every project test stays green → clearing on block removal is unpinned |
| M2 | drop `errors.value = []` in `removeInterval` (line 72) | coordinator | `× clears the messages after a block or an interval is removed` | pinned |
| M3 | drop `if (savedOnce.value) return` (line 83) | coordinator | `× saves once when "Zapisz plan" is tapped twice 150 ms apart` — `expected [ [], [] ] to have a length of 1 but got 2` | double-tap guard pinned |
| M4 | rename on every type change (drop the "still the old type word" condition, line 78) | coordinator | `× keeps a name the user changed` — `expected 'Odpoczynek' to be 'Wiosłowanie'` | rename rule pinned |
| M7 | `addInterval` always adds `'work'` (line 67) | coordinator | `Tests  1 failed \| 43 passed (44)` — only `× PROBE-M7 a new interval after a work interval is a rest interval`; `expected 'false' to be 'true'` | "opposite of the last one" is unpinned by project tests |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | New components carry short "why" comments (savedOnce guard, rename rule, alternation, violet rule). |
| D2 | All documentation types covered? | pass | No route/config/env added; DESIGN.md already describes the screens; nothing made wrong. |
| D3 | Docs understandable? | pass | No wrong names or paths in comments. |
| I1 | Satisfies the requirements? | pass | Every Changes-required clause maps to code; walker and tests confirm; no scope creep. |
| I2 | Logically correct? | pass | Empty block, last-block removal, edit by id, failed save and cancel all behave; see Minor for naming only. |
| I3 | No unnecessary complexity? | pass | `PlanTypeChoice` follows the existing `.confirm` dialog pattern; editor reuses `NumberStepper`/`FieldError`. |
| I4 | Robust? | pass | Save failure keeps data and shows the phase-1 message; input is validated before `savePlan`. |
| I5 | Performant? | n/a | No loops over storage; a plan has at most a few dozen intervals. |
| I6 | Secure? | pass | Only text interpolation; no `v-html`, no network. |
| I7 | Observable? | n/a | Client-only UI; errors shown to the user, no logging layer in the app. |
| I8 | New dependencies? | n/a | `package.json` / lock unchanged. |
| TEST | Test adequacy | **fail** | Two clauses the tests claim are not pinned (M1, M7). |
| ARCH | Project rules | pass | See below. |

Architecture — project rules (DESIGN.md, auto-loop §9, brief Guardrails):

- Tokens only from DESIGN.md — meets: `--cardio #a98bf5`, `--on-cardio #140d2b`, Clock 9rem, Phase 3rem, Meta 1.125rem match DESIGN.md front matter and "Hierarchy"; no other new value.
- Violet Rule — meets: violet only in `.plan-tag-cardio`; walker: both Start buttons `rgb(242,242,239)`.
- Znacznik typu — meets: pill (`--radius-pill`), Label 600, min-height 24 px (walker 24 px), word always present, outside the `h2`.
- One chalk action per screen — meets: editor has only "Zapisz plan" as `btn-primary` (test + walker); "Jaki plan?" has no chalk.
- Toggle "Praca"/"Odpoczynek" — meets: 56 px, `aria-pressed`, selected = surface-2 + 2 px ink border + 700, never chalk.
- Touch targets (56 px editor steppers/toggles, 44 px elsewhere, 64 px main action) — meets, by getBoundingClientRect.
- Polish UI text, English code — meets. No emoji, no gradient, no `border-left` stripe — meets.
- Out of scope: strength editor unchanged (only a "Siła" click inserted before it in four existing tests; no assertion removed); no reorder or collapse in the cardio editor — meets.
- Storage keys unchanged; a pre-cardio plan with no `type` shows "Siła" (`CardioPlansFlow.test.ts:72`) — meets.

Blockers: 0 · Major: 2 · Minor: 1 · Nit: 0
Findings going back to a builder: `remove-block-clears-errors-unpinned`, `add-interval-alternation-unpinned`

## Findings

### TEST. Test adequacy

- **[Major]** `remove-block-clears-errors-unpinned` — `src/components/CardioPlanEditor.test.ts:255` (code `src/components/CardioPlanEditor.vue:59`) — the test is named "clears the messages after a block or an interval is removed", but its inputs only remove an interval. Removing `errors.value = []` from `removeBlock` leaves all 213 component tests green (M1); only the scratch probe goes red. Errors are keyed by index (`blocks.<b>.…`), so stale errors after a block removal would show under the wrong block. **Fails when:** a later change drops the clear in `removeBlock` → the suite stays green while the user sees "Wpisz nazwę planu." (or a block's interval error moved onto the next block) after removing a block.
- **[Major]** `add-interval-alternation-unpinned` — `src/components/CardioPlanEditor.test.ts:131` (code `src/components/CardioPlanEditor.vue:62-67`) — the code comment and the test name claim "a new interval is the opposite of the last one", but the test only adds after a rest interval, where "opposite" and "always Praca" give the same result. The mutant `createInterval('work')` keeps every project test green (M7). **Fails when:** `addInterval` always adds "Praca" → after a block ending in "Praca", "Dodaj interwał" adds a second "Praca" and the suite stays green.

### I2. Logically correct?

- **[Minor]** `ambiguous-remove-button-names` — `src/components/CardioPlanEditor.vue:191,203,200` — every interval has a button named just "Usuń interwał" and every block "Usuń blok" / "Dodaj interwał", while the strength editor names its button "Usuń ćwiczenie N" (`PlanEditor.vue:248`). The sections are labelled, so a screen reader user gets context only by moving through the region. **Fails when:** a screen-reader user lists buttons → several identical "Usuń interwał" entries with no position.

## Not reviewed

- D9-type checks (sound, real phone) — not part of phase 4.
- The out-of-limit validation test (`CardioPlanEditor.test.ts:242`) uses a stored plan (repeat 21, 7 s) that the editor itself cannot produce; I did not check whether `planStore` can ever hand such a plan to the editor. It pins the wiring of the messages only.

## Observations outside scope

- With no plans, "Nowy plan" is the main action (chalk) but measures 380×56, not the 64 px DESIGN.md gives the main action (pre-existing, `PlanList.vue:65`).
- The in-app dialogs (`PlanDeleteConfirm`, `EndWorkoutConfirm`, and now `PlanTypeChoice`, which copies them) do not move focus into the dialog or trap it; keyboard and screen-reader focus stays on the list behind it (pre-existing pattern).
