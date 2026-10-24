---
change_id: feat-cardio-intervals
title: Cardio module — interval sessions with sounds and lock mode
status: implementing
created: 2026-10-24
updated: 2026-10-24
archived_at: null
---

## Goal

The user creates cardio interval plans and runs a cardio session with sounds and lock mode, as `context/foundation/prd-v2.md` and `DESIGN.md` describe.

## Notes

### Decisions

- **2026-10-24: no plan.md.** The owner asked to implement without a plan. The run uses brief mode of `/10x-auto-implement-loop-v6`; the contract is `brief.md`.
- **2026-10-24: design from the Talerze mockup.** `DESIGN.md` got the cardio section from `documentation/system-design.html` (screen "Cardio"), plus the owner's decisions for the parts the mockup does not show: repeat blocks in the editor, 5 s time step (0:05–60:00), 2 s press-and-hold unlock, a [Zablokuj][Zakończ] row under Pauza, "Jaki plan?" choice, get-ready / pause states.
- **2026-10-24: PRD v2 open questions 1–4 resolved.** Get-ready 3 s; countdown 3 beeps at 3-2-1 s (none for intervals shorter than 4 s); only paused time expires (2 h); unlock = hold 2 s.
