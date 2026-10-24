# Phase review — quality-of-life · Phase 1: Move exercises up and down · round 1

- **Scope:** `src/components/PlanEditor.vue`, `src/components/PlanEditor.test.ts`, `src/components/EditDelete.test.ts`, `DESIGN.md` · **Files reviewed:** 4 (`+346/-2`)
- **Contract:** `context/changes/quality-of-life/brief.md` → `### Phase 1: Move exercises up and down` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover sonnet ×1

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 1.1 | PlanEditor tests for D1, D2 | `npx vitest run src/components/PlanEditor.test.ts` | pass — `Tests  26 passed (26)`, no skip. Named tests exist: buttons on every card (4 Polish-named exercises), swap with sets/reps/rest + renumbered labels, edge disabling, focus same/other button, errors cleared. Mutants E1–E4 prove the focus and error clauses are pinned. |
| 1.2 | Component tests for D3 | `npx vitest run src/components` | pass — `Test Files  8 passed (8)`, `Tests  142 passed (142)`. `EditDelete.test.ts` › "moving exercises in a saved plan": save → `getPlan`/`listPlans()` + fresh mount + editor order; workout `h1` = „Martwy ciąg”, „Dalej: Wiosłowanie”; first-down move → workout starts with „Przysiady”; „Anuluj” → `localStorage.getItem(PLANS_KEY)` byte-equal. |
| 1.3 | DESIGN.md rule | `grep -n "Przesuń ćwiczenie" DESIGN.md` | pass — lines 225 (Buttons) and 242 (Inputs/Fields, the bullet directly above „Edytor planu”): labels with N, 44 px, secondary, SVG chevrons 2 px round caps, disabled 40 % at edges. |
| 1.4 | Full suite | `npm test` | pass — `Test Files  18 passed (18)`, `Tests  395 passed (395)`; baseline 377 passed / 0 failing → 18 new tests, 0 failing, 0 skipped. |
| 1.5 | Build | `npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 244ms`, exit 0. Runner trap noted: green build proves types only; behaviour is proved by 1.1/1.2 and the walk. |

### Manual (walked by the walker with playwright-cli; spot-checked: 1.6)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 1.6 | 412×915, 4 exercises, move „Martwy ciąg” 4→2, save, reopen; sizes, disabled look, SVG, no h-scroll | passed | `reviews/screenshots/p1-r1-1.6-after-move.png`, `reviews/screenshots/p1-r1-1.6-reopened.png`. Walker: two taps on „Przesuń ćwiczenie 4 w górę” → editor order Wiosłowanie, Martwy ciąg, Przysiady, Wyciskanie leżąc; after „Zapisz plan” `trening.plans.v1` holds the same order; after „Edytuj: Plan A” the same order. All 8 move buttons 44×44 px; disabled ones („1 w górę”, „4 w dół”) `opacity 0.4`, `disabled=true`; each holds `<svg … stroke="currentColor" stroke-width="2" aria-hidden="true">`, empty `textContent`, no ↑↓▲▼⬆⬇; `scrollWidth 412 = clientWidth 412`. Spot-check: I opened both screenshots — 412 px wide, „Ćwiczenie 1” up chevron dimmed, „Ćwiczenie 2” = „Martwy ciąg” after reopen. Confirmed. |

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All mutants ran in scratch copies (`critic-p1-r1/prover-1/E<n>/`, `node_modules` symlinked), `vitest run src/components/PlanEditor.test.ts`.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E0 | Canary: rename „Zapisz plan” in the copy | prover-1 | exit 1 · `Tests  8 failed \| 18 passed (26)` · `Error: No button named "Zapisz plan"` | The copy's tests run against the copy's source. |
| E1 | Remove the `focus()` restore | prover-1; re-run by coordinator | exit 1 · `Tests  3 failed \| 23 passed (26)` · failed: „keeps focus … (middle exercise, "up")”, „… reached the top edge”, „… reached the bottom edge” · `AssertionError: expected <body>… to be <button …>` | The restore is pinned. The „first exercise, "down"” focus test stays green without it (Vue keeps that node in place, so focus never leaves) — see Nit `focus-test-first-down-not-exercising-restore`. Coordinator re-run: same 3 failures, `Tests  3 failed \| 23 passed (26)`. |
| E2 | Always focus the tapped button (no fallback to the other one) | prover-1 | exit 1 · `Tests  2 failed \| 24 passed (26)` · both edge focus tests | The edge fallback clause of D2 is pinned. |
| E3 | Move no longer clears `errors` | prover-1 | exit 1 · `Tests  1 failed \| 25 passed (26)` · `AssertionError: expected 'Nowy planNazwa planuWpisz nazwę planu…' not to contain 'Wpisz nazwę planu.'` (line 347) | The error-clearing clause of D2 is pinned. |
| E4 | Focus the neighbour's button (index-style wrong target) | prover-1 | exit 1 · `Tests  4 failed \| 22 passed (26)` · diff `aria-label="Przesuń ćwiczenie 4 w górę"` vs `"…3 w górę"` | The "find by stable per-exercise id" clause is pinned. |

Skip count did not grow in any run (no `skipped` in any summary line).

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented | pass | `moveExercise` has a why-comment (errors cleared because paths hold positions; focus rule). |
| D2 | All doc types covered | pass | `DESIGN.md` updated in Buttons and next to „Edytor planu”, as the brief and CLAUDE.md require; no other doc type touched. |
| D3 | Docs understandable | pass | DESIGN.md text matches the code (44 px, secondary, chevrons, 40 %, focus rule). |
| I1 | Satisfies requirements | pass | D1, D2, D3, D6 (move part) each map to code and a pinned test; no out-of-scope change (`plan.ts`, `planStore.ts`, `App.vue`, workout code untouched). |
| I2 | Logically correct | pass | Edge computation `target > 0` / `target < length - 1` correct; swap via index assignment keeps reactive items; focus target found by `moved.id`. |
| I3 | No unnecessary complexity | pass | One helper (`moveButtonId`) and one function; icon sizing copies the existing `.field-error svg` pattern. |
| I4 | Robust | pass | Out-of-range guard returns early; `getElementById(...)?.focus()` tolerates a missing node. |
| I5 | Performant | n/a | O(1) swap on a list of a few exercises. |
| I6 | Secure | n/a | No input reaches HTML unescaped; no storage format change. |
| I7 | Observable | n/a | No failure path added; no debug output left. |
| I8 | New dependencies | n/a | `package.json` / `package-lock.json` unchanged. |
| ARCH | Project rules | pass | See below. |

Architecture — project rules binding this phase:
- `DESIGN.md` tokens only — meets: `var(--target-min)`, `var(--space-sm)`, base `.btn` styles; `24px` icon size copies `base.css:183-186`.
- One chalk action — meets: test asserts `findAll('button.btn-primary')` has length 1 with 4 cards.
- Touch targets ≥ 44 px outside the workout (`DESIGN.md:202`, brief D6) — meets: 44×44 measured.
- No emoji / Unicode icons, 2 px round-cap stroke icons — meets (walker evidence + markup).
- Polish UI text — meets.
- Stored shape `trening.plans.v1` and `planStore.ts` unchanged — meets: neither file in the diff; saved exercise object asserted as `{ id: 'e4', name: 'Martwy ciąg', sets: 5, reps: 5, restSeconds: 150 }`.
- No new dependency; no `.skip`/`.only`, no TS suppressions, no `tsconfig` change — meets.

Blockers: 0 · Major: 0 · Minor: 0 · Nit: 2
Findings going back to a builder: none.

## Findings

### Test adequacy (§3)

- **[nit]** `focus-test-first-down-not-exercising-restore` — `src/components/PlanEditor.test.ts:306` — the test „keeps focus on the same move button of the moved exercise (first exercise, "down")” passes with the `focus()` restore deleted (E1). Vue's keyed diff moves the neighbour's node, not the tapped one, so focus never leaves. The assertion is true behaviour, and the middle-"up" test pins the restore, so nothing is unpinned. **Fails when:** never on its own; it only gives false comfort if the middle test is later removed.
- **[nit]** `disabled-click-test-relies-on-test-utils` — `src/components/PlanEditor.test.ts:282` / `src/components/PlanEditor.vue:63` — „a click on a disabled edge button changes nothing” passes because Vue Test Utils does not dispatch `click` on a disabled button; the `moved === undefined || neighbour === undefined` guard is never reached by any test. The guard is unreachable from the UI, so this is cosmetic. **Fails when:** never through the UI.

## Not reviewed

- D4, D5, D7 and the collapsed-card part of D6 belong to later phases of the brief; not judged here.
- Real-phone touch behaviour and screen-reader announcement of the renumbered label after a move: not observable by the driver; the walk was at 412×915 in desktop Chromium via playwright-cli.
- Vitest in the mutant copies wrote its results cache through the symlinked `node_modules` (`node_modules/.vite/vitest`); this does not change test outcomes.

## Observations outside scope

- `CLAUDE.md` says "touch targets 56 px (64 px for the main action)" with no "during the workout" limit, while `DESIGN.md:202` says 44 px outside the workout and `PRODUCT.md` says 56 px during the workout. The brief follows `DESIGN.md` (≥ 44 px). The owner should align `CLAUDE.md` with `DESIGN.md`.
- Untracked foreign files not named by the builder: `documentation/Zrzut ekranu 2026-10-24 112729.png` (mtime 11:27:29, 9 s before `.loop-baseline` was written at 11:27:38, yet missing from it) and `documentation/Nowy folder/` (two screenshots, 11:33:26 and 11:33:59, created during this review). They look like the owner's Windows screenshots. Keep them out of the phase commit (`--exclude`).
- `DESIGN.md` still describes the light „magnez” theme in its front matter and Colors section as reserved; unchanged by this phase.
