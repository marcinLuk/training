---
change_id: feat-mvp-plans-workout-loop
title: Trening MVP — plans and workout loop (roadmap F-03, S-01…S-06)
status: implementing
created: 2026-10-18
updated: 2026-10-18
archived_at: null
---

## Goal

The owner builds workout plans and runs a full workout on the phone, set by set, with a rest timer and a sound, and the workout survives a reload.

## Notes

- Run by `/10x-auto-implement-loop-v5` in brief mode. The brief is `brief.md`; the run record is `workbench.md`.
- Owner decisions taken at intake (2026-10-18):
  - Scope: roadmap F-03, S-01, S-02, S-03, S-04, S-05, S-06. Out of scope: F-01 (deploy), F-02 (PWA / offline).
  - FR-009 idle expiry: 2 hours without a tap.
  - A running workout keeps its own copy of the plan; editing or deleting the plan does not change it.
  - PRD Open Question 2: the app calls `navigator.storage.persist()` at the first save (not a backup).
  - The workout has "Zakończ trening" (danger style) with a confirm step.
