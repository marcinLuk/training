# To test: quality-of-life — Reorder and collapse exercises in the plan editor

Implemented 2026-10-24 · 2 slices · commits `ec76af5`…`9cd91f2`
Brief: `brief.md` · run record: `workbench.md` · code reviews: `reviews/`

**Nobody has walked this change end to end on your phone.** The path below is for you.

## What changed

In the plan editor, each exercise card has two new buttons in its header: „Przesuń ćwiczenie N w górę” and „w dół” (chevron icons). A tap swaps the exercise with its neighbour. You can also collapse a card: tap its title „Ćwiczenie N”. A collapsed card shows only the title, the exercise name and a short line like „3 × 10, przerwa 1:30”. „Edytuj plan” opens a saved plan with all cards collapsed. A new plan and a new exercise open expanded. If „Zapisz plan” finds an error, the card with the error opens. The open/collapsed state is not saved. The saved order is the order of the workout.

### What changed underneath (no visible effect)

- None. The stored plan format (`trening.plans.v1`) and `planStore.ts` did not change. `DESIGN.md` has new rules for the move buttons and the collapsed card.

## Before you start

- Desktop check: `npm run build && ./node_modules/.bin/vite preview --port 4199 --strictPort`, then open `http://localhost:4199` with the phone size 412×915 in DevTools.
- Phone check (Android, Chrome): open the app as `http://localhost:…` through `chrome://inspect` → Port forwarding `4199 → localhost:4199`. Do not use `http://<LAN-IP>:4199`: it is not a secure context, and plan creation (`crypto.randomUUID`) fails there.
- External dependencies: none.
- Start state: your current plans are fine. For a clean start, clear the site data (DevTools → Application → Clear site data).
- Use Polish names, for example „Wiosłowanie”, „Przysiady”, „Martwy ciąg”, „Ściąganie drążka”.

## Path

Legend: `[ ]` not checked yet · `[x]` checked, works · `[!]` checked, does not work (details in "Notatki z przejścia") · `[-]` skipped on purpose

| Status | # | Step | Expected result | Checked by |
| :-- | :-- | :-- | :-- | :-- |
| `[ ]` | 1 | Tap „Nowy plan”. | „Ćwiczenie 1” is expanded: name field, three steppers, „Usuń ćwiczenie”. The header has a chevron toggle and two move buttons; both move buttons are dimmed (only one exercise). | critic (`reviews/phase-2-round-1.md`) |
| `[ ]` | 2 | Type a plan name. Add 5 more exercises with „Dodaj ćwiczenie” and give all 6 Polish names. | Each new card opens expanded. The already filled cards keep their state. | critic (`reviews/phase-2-round-1.md`) |
| `[ ]` | 3 | Collapse every card: tap each title „Ćwiczenie N”. | Each card shrinks to the title, the name and „3 × 10, przerwa 1:30”. The move buttons stay. No animation. | critic (`reviews/phase-2-round-1.md`), goal review (`reviews/goal-review.md`) |
| `[ ]` | 4 | On card 5, tap „w górę” four times. | The exercise moves one place per tap, up to position 1; the titles renumber. The card stays collapsed. Focus stays on that card's buttons; at the top it jumps to „w dół”, because „w górę” is now dimmed. | critic (`reviews/phase-1-round-1.md`, `reviews/phase-2-round-1.md`) |
| `[ ]` | 5 | Open one card, change its sets with „+”, collapse it again. | The summary line shows the new sets (for example „4 × 10, przerwa 1:30”). | critic (`reviews/phase-2-round-1.md`, unit test) |
| `[ ]` | 6 | Tap „Zapisz plan”. | The plan list opens; the plan card shows „6 ćwiczeń, … serii”. | critic (`reviews/phase-2-round-1.md`) |
| `[ ]` | 7 | Reload the page, then tap „Edytuj” on the plan. | „Edytuj plan” opens with all 6 cards collapsed, in the new order (the moved exercise first). | critic (`reviews/phase-2-round-1.md`), goal review |
| `[ ]` | 8 | Open card 3, clear its name, move it up one place, tap „Zapisz plan”. | The move clears old errors. Save fails: only the card with the empty name opens and shows „Wpisz nazwę ćwiczenia 2.”; the other cards stay collapsed. | goal review (`reviews/goal-review.md`) |
| `[ ]` | 9 | Type the name again. Move one exercise, then tap „Anuluj”. Open „Edytuj” again. | The order is the one saved in step 6; „Anuluj” changed nothing. | critic (`reviews/phase-1-round-1.md`, unit test only) |
| `[ ]` | 10 | Back on the list, tap „Start” on the plan. | The workout opens on the moved exercise; „Dalej:” names the next one in the new order. End the workout with „Zakończ trening”. | critic (`reviews/phase-2-round-1.md`), goal review |
| `[ ]` | 11 | On your phone, with one thumb: collapse and move cards in a plan with many exercises. | The 44 px buttons are easy to hit; you do not tap the toggle chevron when you mean „w dół”. | **nobody** |

## Kroki, których nikt nie sprawdził

- [ ] **11** One-thumb use on a real phone — no agent can hold a phone. The reviews flagged that the toggle chevron sits next to the „w dół” chevron (see below).

## Na co zwrócić uwagę

- **Three chevrons in a row on each header** (`toggle-chevron-beside-move-chevrons`, Minor, both critics). The toggle chevron (grey, no border) sits right next to the „w dół” button (white, with a border). A thumb can hit the wrong one. This is your design call: keep it, or ask for a different toggle (for example the whole title row as the target, or a different icon). `DESIGN.md` would change with it.
- **A failed save does not scroll to the error** (`failed-save-error-offscreen`, Minor, older than this change). The error card opens, but if it is far down the list you must scroll to find it.
- **A collapsed card hides its error** (Nit). If you collapse a card that shows an error, the collapsed card shows no sign of it.
- **No screen reader message for a new position** (Nit). After a move, only the focused button's label („Przesuń ćwiczenie 2 w górę”) tells the new position.
- `DESIGN.md` describes the move buttons in two places (Buttons and Inputs / Fields) — a later edit must change both (Nit).

## Jeśli coś nie działa

- No server logs: open DevTools → Console on the page.
- Undo the change: `git revert 9cd91f2 ec76af5` (in this order).
- Round reports: `reviews/phase-1-round-1.md`, `reviews/phase-2-round-1.md`, `reviews/goal-review.md` — what each critic saw and did not see.

## Notatki z przejścia

Empty at the start. `/10x-walkthrough` adds one line per step marked `[!]` or `[-]`:
`- **krok <n>** — <date> — <what happened / why skipped>`

## Odhaczenie

- [ ] I walked the whole path and it works
- [ ] The path works, but I have notes: <write>
- [ ] It does not work: <write the step and what happened>

After the walk: `change.md` → `status: implemented`, then `/10x-archive quality-of-life`.
