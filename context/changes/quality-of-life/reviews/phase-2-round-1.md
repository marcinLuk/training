# Phase review — quality-of-life · Phase 2: Collapse and open an exercise card · round 1

- **Scope:** `src/components/PlanEditor.vue`, `src/components/PlanEditor.test.ts`, `src/components/EditDelete.test.ts`, `DESIGN.md` · **Files reviewed:** 4 (`+497/-73`)
- **Contract:** `context/changes/quality-of-life/brief.md` → `### Phase 2` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover sonnet ×1

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | PlanEditor tests for D4 | `npx vitest run src/components/PlanEditor.test.ts` | pass — `Tests  42 passed (42)`, no skips. The named tests exist (toggle with `aria-expanded`, collapsed content, summary, summary after a stepper change, state follows a move, moves on collapsed cards) and the mutants E1, E3, E4 prove they pin the clauses |
| 2.2 | component tests for D4, D5 | `npx vitest run src/components` | pass — `Tests  162 passed (162)`, no skips. New plan first card open, „Dodaj ćwiczenie” open, „Edytuj” all collapsed, failed save opens only error cards, stored JSON keys — all present; mutants E2, E5, E6, E7 kill them |
| 2.3 | DESIGN.md rule | `grep -n "zwinięt" DESIGN.md` | pass — `243:- **Zwinięta karta ćwiczenia:** tytuł „Ćwiczenie N” jest przyciskiem…` (sits as its own bullet directly above the „Edytor planu” bullet; see `design-rule-placement`) |
| 2.4 | full suite | `npm test` | pass — `Test Files  18 passed (18)`, `Tests  415 passed (415)`; baseline 0 failing (395 after phase 1, +20 new tests) |
| 2.5 | build | `npm run build` | pass — `vue-tsc -b && vite build`, `✓ built in 215ms` |

### Manual (walked by the walker with playwright-cli at 412×915; spot-checked: 2.6 screenshot `p2-r1-2.6-reopened.png` and 2.7 `p2-r1-2.7-focus-toggle.png`)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 2.6 | 6 Polish exercises, collapse all, move 5 → 1 on collapsed cards, save, reload, „Edytuj”, „Start” | passed | `reviews/screenshots/p2-r1-2.6-moved.png`, `p2-r1-2.6-reopened.png`, `p2-r1-2.6-start.png` — after save and reload „Edytuj: Plan 6” showed 6 toggles, 0 with `aria-expanded=true`, 0 name textboxes, order „Ściąganie drążka”, „Wiosłowanie”, „Ćwiczenie żółw”, „Przysiad”, „Martwy ciąg”, „Pompki”; „Start: Plan 6” opened the workout on „ŚCIĄGANIE DRĄŻKA”, „Dalej: Wiosłowanie”. Spot-check: the screenshot shows cards 1–4 collapsed in that order — confirmed |
| 2.7 | compact collapsed card, 44 px targets, focus outline, SVG stroke chevron, Polish, one chalk button | passed | `p2-r1-2.7-collapsed.png`, `p2-r1-2.7-focus-toggle.png`, `p2-r1-2.7-focus-move.png` — card 380×161 px (header + name + „3 × 10, przerwa 1:30” + 2 move buttons); toggle 242×44, move buttons 44×44; Tab focus gives `outline solid 3px rgb(138,180,255)` offset 2px; chevron `<svg viewBox 0 0 24 24>` fill none, stroke `rgb(142,146,154)` (steel) 2px; only chalk background is „Zapisz plan” (64 px). Spot-check: the focus screenshot shows the blue outline on the „ĆWICZENIE 1” toggle — confirmed |

Walker note: a new plan opens with card 1 expanded, and cards added with „Dodaj ćwiczenie” open expanded. 44 px targets match `DESIGN.md:202` („44 px poza treningiem”).

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

All run from a scratch copy with `./node_modules/.bin/vitest run src/components`; each replaces only `src/components/PlanEditor.vue`. Total stays 162 in every run, so no test was skipped.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E0 | canary: unmodified copy | prover | `Tests  162 passed (162)` | the scratch tree runs the real suite |
| E1 | mutant: state stays with the position, not the exercise | prover; re-run by coordinator | `1 failed` — „the open or collapsed state follows the exercise when it moves…” `expected [ 'false', 'true', 'false', 'false' ] to deeply equal [ 'false', 'false', 'true', 'false' ]` | D4 „state follows the exercise” is pinned |
| E2 | mutant: failed save opens every card | prover | `3 failed` — `expected [ 'true', 'true', 'true', 'true' ] to deeply equal [ 'false', 'false', 'true', 'true' ]` | D5 „opens every card that holds an error” (and only those) is pinned |
| E3 | mutant: `v-show` keeps hidden fields in the DOM | prover | `4 failed` — `expected <input …> to be null` | „removed with v-if, not focusable” is pinned |
| E4 | mutant: blank-name check without `trim()` | prover | `1 failed` — „shows no name line when the name is blank or only spaces…” `expected <p …> to be null` | „name when it is not blank” is pinned |
| E5 | mutant: „Dodaj ćwiczenie” adds a collapsed card | prover | `7 failed` — `expected 'false' to be 'true'` | D5 „adds an expanded exercise” is pinned |
| E6 | mutant: a saved plan opens expanded | prover | `18 failed` — `expected [ 'true', 'true', 'true', 'true' ] to deeply equal [ 'false', 'false', 'false', 'false' ]` | D5 „Edytuj plan opens every exercise collapsed” is pinned |
| E7 | mutant: error index off by one | prover | `2 failed` — `expected [ 'false', 'false', 'false', 'true' ] to deeply equal [ 'false', 'false', 'true', 'true' ]` | the error-path → card mapping is pinned |
| E8 | before-fix: HEAD `PlanEditor.vue` (ec76af5) with the new tests | prover | `24 failed \| 138 passed (162)` | the new tests are red without this phase's code |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented | pass | `collapsed` and `expandCardsWithErrors` carry "why" comments; names explain themselves |
| D2 | All documentation types | pass | `DESIGN.md` gets the collapsed-card rule in the same change; no other doc is affected |
| D3 | Documentation understandable | pass (Nit) | rule is clear; placement next to, not inside, „Edytor planu” |
| I1 | Satisfies the requirements | pass | every Changes-required clause maps to code and to a killed mutant; no scope creep; no out-of-scope file touched |
| I2 | Logically correct | pass | id-keyed `Set` follows moves; remove drops the id; error regex `^exercises\.(\d+)\.` matches `plan.ts:87` paths; plan-level errors open no card (tested) |
| I3 | No unnecessary complexity | pass | small helpers, no new abstraction |
| I4 | Robust | n/a | no I/O added; `planStore.ts` unchanged |
| I5 | Performant | n/a | O(n) over ≤ a few dozen exercises |
| I6 | Secure | pass | name rendered with `{{ }}` (escaped) |
| I7 | Observable | n/a | no failure path added |
| I8 | New dependencies | n/a | no manifest change |
| ARCH | Project rules | pass (one Minor) | see below |

Architecture — project rules:
- `DESIGN.md` tokens only — meets: `--target-min`, `--space-sm/lg`, `--radius-md`, `--steel` (DESIGN „Stal: ikony drugorzędne”), `.muted` for the summary.
- One chalk action per screen — meets: test „keeps "Zapisz plan" the only chalk button…” and walker 2.7.
- Touch targets — meets: 44 px outside the workout (`DESIGN.md:202`).
- No emoji or Unicode icons; 2 px rounded stroke icons — meets: chevron is `<svg … stroke-width="2" stroke-linecap="round">`.
- Polish UI text — meets.
- Stored shape unchanged, no stored open/collapsed field — meets: JSON key tests; `git diff` shows no change in `src/plans/`.
- No transition on collapse — meets: rotation has no `transition`.
- `DESIGN.md` updated in the same change — meets.

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 1
Findings going back to a builder: none.

## Findings

### ARCH. Project rules

- **[Minor]** `toggle-chevron-next-to-move-down` — `src/components/PlanEditor.vue:164` — on a collapsed card the toggle's down chevron (steel, no border) sits 8 px left of the „Przesuń ćwiczenie N w dół” button, which shows the same down chevron (bordered). Two near-identical arrows side by side carry different actions (open the card / move the exercise down). The brief asks for a chevron, so this follows the contract; it is a design point for the owner, not a builder fix. **Fails when:** a user with a sweaty thumb aims at the toggle arrow to open the card and hits „w dół”, and the exercise moves instead (visible in `p2-r1-2.6-reopened.png`). confidence: low.

### D3. Documentation understandable

- **[Nit]** `design-rule-placement` — `DESIGN.md:243` — the brief says to add the rule to „Edytor planu”; the change adds it as a separate bullet under „Inputs / Fields”, directly above the „Edytor planu” bullet (the same pattern phase 1 used). Content is complete. **Fails when:** a reader looks only inside the „Edytor planu” bullet for editor rules.

## Not reviewed

- Focus after a move on a collapsed card is not tested on its own; it uses the same `moveExercise` code path that the phase-1 focus tests cover on open cards.
- The Vitest cache in the mutant trees writes through the `node_modules` symlink into the real `node_modules/.vite`; this does not change source or build output.

## Observations outside scope

- `git status` shows new untracked owner screenshots `documentation/Nowy folder/Zrzut ekranu 2026-10-24 113326.png`, `…113359.png` and `documentation/Zrzut ekranu 2026-10-24 112729.png`. They are not part of this phase; leave them out of the phase commit.
- `DESIGN.md:3` front matter still names the light „magnez” theme, which the MVP does not build (pre-existing).
