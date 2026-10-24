---
project: "Trening"
version: 2
status: draft
created: 2026-10-24
context_type: brownfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  delivery_weeks: 3
  hard_deadline: null
  after_hours_only: true
---

# Trening: Product Requirements Document v2 — cardio module

This PRD is a delta on top of `context/foundation/prd.md` (v1, the strength MVP). Everything in v1 stays valid unless this document changes it.

## Current System Overview

- **System purpose:** Trening is an installable PWA for strength workouts at home that stops the user from losing their place and skipping a set after a break.
- **Key architecture:** a static single-page app with no backend. All data stays on the phone.
- **Tech stack:** Vite 8, Vue 3.5, TypeScript, Vitest. Static files served by nginx in a Docker image, behind Traefik with Basic auth. Plans and the running workout are stored on the device.
- **Current user base:** one person (the author), training at home alone with the phone nearby.
- **Core functionality:** the user builds plans (exercises with sets, reps and rest time). During a workout the app shows the current exercise, the sets left and the next exercise. The user taps once per finished set. A rest timer runs, and a sound marks the end of the rest.
- **Current limits that touch this change:** PRD v1 lists "cardio" and "a reliable signal with a locked screen" as Non-Goals. The strength MVP keeps the screen on during a workout (FR-012) and assumes the screen is on for the end-of-rest sound.

## Problem Statement & Motivation

The change adds cardio as a new training mode. Instead of sets and reps, the user sets intervals. Each interval ends with a sound signal.

- **The gap:** today the author does cardio with a separate timer app. Strength plans live in Trening, the cardio timer lives in another app. The author wants one app for all training.
- **The situation:** during cardio the phone is in a pocket, on the floor or a machine, or outside during a run. The user must hear the interval signal without looking at the screen. The user must be able to put the phone in a pocket without ending the session by accident.
- **Current workaround and its cost:** a separate timer app — two apps for one training.

# TODO: the trigger for "why now" — see Open Questions

## User & Persona

Primary: the author (one person), the same user as the strength MVP. Trains alone. Does cardio intervals with the phone in a pocket, on the floor or a machine, or outside while running. The moment of need: the end of each interval, when the user cannot look at the screen.

No new persona. The existing user's experience changes: cardio moves from a separate timer app into Trening.

## Success Criteria

### Primary
- The author does 3 cardio sessions in a row only in Trening. The separate timer app is not opened.

### Secondary
- 0 accidental session ends: with the phone in a pocket, no cardio session ends because of an accidental touch.

### Guardrails
- The strength workout flow works exactly as now.
- Cardio works with no network and no data leaves the phone.
- A running workout (strength or cardio) returns to the same place after a screen lock, an app switch or a reload.
- The interval signal is heard with the phone in a pocket (through clothes or with headphones).
- The lock mode is not a trap: the user can always unlock it and end the session on purpose, quickly.

## User Stories

### US-01: The user does a cardio session with the phone in a pocket

- **Given** the user has a saved cardio plan with a list of intervals (name and time)
- **When** the user picks the plan, taps Start, turns on the lock mode and puts the phone in a pocket
- **Then** a sound marks the end of each interval and the next interval starts with no tap. After the last interval the user sees the end screen.
- **Before this change:** the user ran the intervals in a separate timer app.

#### Acceptance Criteria
- The session view shows the current interval name, the time left, the next interval name and "interval X of Y".
- A get-ready time comes before the first interval.
- Work start and rest start have different sounds; a countdown comes before each interval end.
- In lock mode, a touch on End or Pause does not end or pause the session.
- After a screen lock or an app switch, the session shows the correct interval and time left. After a reload, the session comes back paused at the current interval.

## Scope of Change

New FRs continue the PRD v1 numbers (FR-016 and up). Modified FRs keep their v1 numbers.

### Cardio plans
- [new] FR-016: The user can create a cardio plan with a name and a list of intervals. Each interval has a name, a time and a type (work or rest). The user can mark a group of intervals and repeat it N times. Priority: must-have
  > Socrates: Counter-argument considered: "a long list of intervals means long typing on the phone". Resolution: changed; a group of intervals can repeat N times. The interval type was added from FR-021.
- [new] FR-017: The user can edit and delete a cardio plan. Priority: must-have
  > Socrates: No counter-argument; stands as written.
- [modified] FR-018: The plan list shows strength plans and cardio plans. Each plan shows a visible mark of its type. (Was: the list shows only strength plans.) Priority: must-have
  > Socrates: Counter-argument considered: "in one list you cannot tell a cardio plan from a strength plan". Resolution: changed; each plan shows a type mark.

### Cardio session
- [new] FR-019: The user can pick a cardio plan and start a cardio session. A short get-ready time, the same for every plan, comes before the first interval. Priority: must-have
  > Socrates: Counter-argument considered: "the first interval starts before the phone is in the pocket". Resolution: changed; a fixed get-ready time was added. The value goes to Open Questions.
- [new] FR-020: During a cardio session, the user sees the current interval name, the time left in it, the next interval name and the progress "interval X of Y". Priority: must-have
  > Socrates: Counter-argument considered: "the user does not know how far into the session they are". Resolution: changed; "interval X of Y" was added (Y counts the intervals after the group repeats).
- [new] FR-021: When an interval ends, a sound plays and the next interval starts with no tap. The start of a work interval and the start of a rest interval have different sounds. Priority: must-have
  > Socrates: Counter-argument considered: "in a pocket, one sound for every change does not tell the user if work or rest comes next". Resolution: changed; intervals have a type and each type has its own sound.
- [new] FR-022: The user hears a countdown (short beeps) before each interval ends. Priority: must-have
  > Socrates: Clarified: a countdown before each interval end. No separate session-end sound (see FR-026).
- [new] FR-023: The user can pause a cardio session and continue it. A paused session expires after the same idle time as a strength workout (FR-009). Priority: must-have
  > Socrates: Counter-argument considered: "a forgotten pause keeps a session open for hours". Resolution: changed; a paused session expires after the FR-009 idle time.
- [new] FR-024: The user can turn on a lock mode. In lock mode the End and Pause buttons do not work until the user unlocks. The unlock action is hard to do by accident in a pocket. Priority: must-have
  > Socrates: Counter-argument considered: "a simple tap or swipe can unlock the screen in a pocket". Resolution: changed; the unlock action must be hard to do by accident. The exact action goes to Open Questions.
- [new] FR-025: The user can end a cardio session early: unlock, then End with a confirmation. Priority: must-have
  > Socrates: No counter-argument; stands as written.
- [new] FR-026: After the last interval, the user sees the end screen and returns to the plan list. Priority: must-have
  > Socrates: Counter-argument considered: "in a pocket the user does not see the end screen". Resolution: kept; the countdown and the normal interval sound are enough. No separate session-end sound.

### Shared workout behavior
- [modified] FR-009: A running workout (strength or cardio) returns to exactly the same place after a screen lock, an app switch and a reload. For cardio, after a screen lock or an app switch the session runs on and shows the correct interval and time left. After a reload, the cardio session comes back paused at the current interval. (Was: strength only.) Priority: must-have
  > Socrates: Counter-argument considered: "after a reload the session should wait paused, so the user can get ready again". Resolution: changed; only after a reload does the cardio session come back paused.
- [modified] FR-012: The screen does not turn off during a strength workout or a cardio session. (Was: strength workout only.) Priority: must-have
  > Socrates: No counter-argument; stands as written.
- [modified] FR-027: The app reloads for a new version only on the plan list with no running workout. A cardio session counts as a running workout. (Was: only a strength workout counted.) Priority: must-have
  > Socrates: No counter-argument; stands as written.

### Preserved
- [preserved] FR-028: The strength workout works unchanged (PRD v1 FR-001 to FR-008, FR-010, FR-014, FR-015). Priority: must-have
  > Socrates: No counter-argument; stands as written. The strength workout does not get the lock mode in this change.
- [preserved] FR-011: Plans are stored only on the user's device. Priority: must-have
  > Socrates: Counter-argument considered: "adding a plan type changes the stored data; a bad migration loses all plans, and there is no backup (PRD v1 Open Question 2)". Resolution: changed in Phase 5; the user accepts a one-time loss of saved strength plans at this update. The clause "old strength plans load after the update" was removed.

### Removed
- [removed] The PRD v1 Non-Goal "cardio": cardio is now in scope as interval sessions (see Non-Goals for what stays out).

## Constraints & Compatibility

- **Backward compatibility:** there is no external API or contract. The strength plan and workout behavior seen by the user stays as in PRD v1.
- **Existing data:** a plan now has a type (strength or cardio), so the stored data changes. The user accepts a one-time loss of saved strength plans at this update. Keeping old plans across this update is not required. (PRD v1 Open Question 2, "no backup for plans", stays open.)
- **Existing integrations:** none. The app has no backend and sends no data out.
- **Preserved behavior:**
  - The strength workout flow works exactly as now (FR-028).
  - The app works offline after the first start, and no data leaves the phone.
  - A running workout returns to the same place after a screen lock, an app switch or a reload (FR-009, now with the cardio rules).
  - Silent updates: the app reloads for a new version only on the plan list with no running workout (FR-027).
  - The end-of-rest sound and the screen-on behavior of the strength workout do not change because of cardio.
- **Project documents that must change with this work** (from the project rules, not a user decision):
  - `PRODUCT.md` and `DESIGN.md` list cardio as out of scope. `DESIGN.md` does not cover an interval screen, a lock mode, "interval X of Y" or a type mark for plans. The project rules say: ask the user, then update `DESIGN.md` in the same change.
  - `DESIGN.md` says the biggest number is sets left (rest time during rest). The cardio screen needs its own rule.

### Quality targets
- Each interval sound plays within 1 s of the planned interval end, while the screen is on.
- PRD v1 NFRs stay valid for strength and cardio: return to the current position in less than 3 seconds; no user data leaves the device; works with no internet after the first start; works on an Android phone with the current Chrome.

## Business Logic Changes

Current rule (PRD v1, kept for strength): the app guides the user through the sets and exercises of a plan in order. It always shows what is now and what is next. It computes the remaining rest time from elapsed time.

New rule for cardio: the app moves the user through the intervals in order with no tap, and tells every change only by sound.

Inputs: the cardio plan (intervals with a name, a time and a type; groups repeated N times), the Start tap, elapsed time, Pause and Continue. Output: the current interval, the time left in it, the next interval, "interval X of Y", and the sounds: a countdown before each interval end and a different sound for the start of a work interval and of a rest interval. The user meets this rule with the phone in a pocket: the sound is the only signal. A look at the screen shows the same position.

## Access Control Changes

No access control changes — current model preserved. Single user. No login and no accounts. Data lives only on the device (the phone).

## Non-Goals

- A guaranteed sound after a power-button lock: the answer for a phone in a pocket is the lock mode with the screen on. After a lock, the sound may stop; the state is kept. (The PRD v1 Non-Goal "a reliable signal with a locked screen" stays in this narrower form.)
- A lock mode for the strength workout: the strength workout stays unchanged in this change.
- GPS, distance, heart rate and cardio history or statistics: cardio is only a timer with intervals.
- Voice guidance: interval changes use sounds, not a voice (same as PRD v1).
- Keeping saved strength plans across this update: the user accepts a one-time loss of plans.

## Open Questions

1. **What is the fixed get-ready time before the first interval (FR-019)?** — Resolved 2026-10-24: 3 s.
2. **What unlock action is hard to do by accident in a pocket (FR-024)?** — Resolved 2026-10-24: press and hold for 2 s (`DESIGN.md`, "Sesja cardio").
3. **How long is the countdown before an interval end, and how many beeps (FR-022)?** — Resolved 2026-10-24: 3 short beeps at 3, 2 and 1 s before the end; an interval shorter than 4 s has no countdown.
4. **Does a running (not paused) cardio session follow the idle expiry?** — Resolved 2026-10-24: no. Only paused time counts: a session paused for 2 hours expires. A running session ends by itself; a session found after its planned end shows the end screen.
5. **Is the 3-week estimate still right after the Socrates round?** The round added interval types, repeated groups, a countdown, pause and a get-ready time. The user confirmed 3 weeks at the shape cross-check; this stays as a reminder. — Owner: author. Block: no.
6. **What is the trigger for "why now"?** The shape notes give the motivation (one app for all training) but no trigger event. — Owner: author. Block: no.
7. **How are plans protected against loss (inherited from PRD v1 Open Question 2)?** This update itself accepts a one-time loss of saved plans. — Owner: author. Block: no.
