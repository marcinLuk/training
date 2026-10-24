---
project: "Trening"
context_type: brownfield
created: 2026-10-24
updated: 2026-10-24
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  delivery_weeks: 3
  hard_deadline: null
  after_hours_only: true
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "Context type"
      decision: "brownfield: cardio is a change to the existing Trening app"
    - topic: "Change category"
      decision: "new module: a second training type next to strength, with its own plans and its own run screen"
    - topic: "Persona"
      decision: "only the author, the same single user as the strength MVP"
    - topic: "Access control"
      decision: "no change: single user, no login, data only on the phone"
    - topic: "Cardio plan shape"
      decision: "a free list of intervals; each interval has a name and a time"
    - topic: "Interval transition"
      decision: "automatic: a sound plays and the next interval starts with no tap"
    - topic: "Locked phone"
      decision: "only a lock mode with the screen on; no attempt at a guaranteed sound with a locked screen"
    - topic: "Lock mode scope"
      decision: "the lock mode blocks the End and Pause buttons until the user unlocks"
    - topic: "End a session early"
      decision: "unlock, then End with a confirmation (same as the strength end confirm)"
    - topic: "Socrates round"
      decision: "FR-016 gets work/rest type and repeat groups; FR-018 type mark; FR-019 fixed get-ready; FR-020 interval X of Y; FR-021 sound per type; FR-022 countdown; FR-023 pause expiry = FR-009; FR-024 hard-to-trigger unlock; FR-009 paused after reload"
    - topic: "Business rule"
      decision: "guide without the screen: the app moves the user through the intervals in order with no tap and tells every change only by sound"
    - topic: "Existing plan data"
      decision: "a one-time loss of saved strength plans at this update is acceptable; no migration required; the 'plans not lost' guardrail was dropped"
    - topic: "Product framing"
      decision: "no change: installable web app (PWA), one user; no deadline; after-hours work"
    - topic: "FR numbering"
      decision: "new FRs continue PRD v1 numbers (FR-016+); modified FRs keep their v1 numbers"
    - topic: "Power button lock in a pocket"
      decision: "accepted: the sound may stop while locked; after unlock the app shows the correct interval and time"
  frs_drafted: 16
  quality_check_status: accepted
---

# Shape notes: cardio module

Seed idea (from the user, in Polish, verbatim):

> dodajemy moduł cardio do naszego projektu , to będzie nowy tryb treninigu , zamiast ustawiania serii , powtórzeń, ustalamy interwały , każdy kończy się sygałem dźwiękowym, aplikacja powinna byc zabezpieczona , jak zablokuje telefon to i tak powiniennem słyszeć sygnał dzwiękowy, jeśli to nie jest możliwe w PWA , to powiiniśmy zaprojektować jakiś tryb blokowania erkarnu który blokowałby przyciski zakończenia treniengu , tak aby użytkownikk mógł schować telefon do kieszeni

## Current System

Trening is an installable PWA for strength workouts at home. It has no backend. All data stays on the phone.

- **What it does today:** the user builds plans (exercises with sets, reps and rest time). During a workout the app shows the current exercise, the sets left and the next exercise. The user taps once per finished set. A rest timer runs, and a sound marks the end of the rest.
- **Tech stack:** Vite 8, Vue 3.5, TypeScript, Vitest. Static files served by nginx in a Docker image, behind Traefik with Basic auth. Plans and the running workout are stored on the device.
- **Users:** one person (the author), training at home alone with the phone nearby.
- **Current limits that touch this change:** the PRD v1 lists "cardio" and "a reliable signal with a locked screen" as Non-Goals. The strength MVP keeps the screen on during a workout (FR-012) and assumes the screen is on for the end-of-rest sound.

## Vision & Problem Statement

The change adds cardio as a new training mode. Instead of sets and reps, the user sets intervals. Each interval ends with a sound signal.

Today the author does cardio with a separate timer app. Strength plans live in Trening, the cardio timer lives in another app. The author wants one app for all training.

During cardio the phone is in a pocket, on the floor or a machine, or outside during a run. The user must hear the interval signal also when the phone is locked. If a PWA cannot give this, the app needs a screen lock mode. This mode blocks the end-workout buttons, so the user can put the phone in a pocket without ending the workout by accident.

This change reverses two Non-Goals of PRD v1: "cardio" and "a reliable signal with a locked screen".

## User & Persona

Primary: the author (one person), the same user as the strength MVP. Trains alone. Does cardio intervals with the phone in a pocket, on the floor or a machine, or outside while running. The moment of need: the end of each interval, when the user cannot look at the screen.

No new persona.

## Access Control

Single user. No login and no accounts. Data lives only on the device (the phone). Basic auth on the server stays as it is.

No changes planned — current model preserved.

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

### Smallest change flow

1. On the plan list, the user creates a cardio plan: a name and a free list of intervals. Each interval has a name and a time.
2. The user picks the cardio plan and taps Start.
3. The app shows the current interval, the time left and the next interval. The screen stays on.
4. The user turns on the lock mode. The end-workout buttons are blocked. The user puts the phone in a pocket.
5. Each interval ends with a sound. The next interval starts with no tap.
6. After the last interval, the user sees the end screen.

### Blast radius (named by the user)

- Plan list and device storage: strength and cardio plans in one list, a changed stored data format, old plans must still load.
- The running workout and resume (FR-009): the saved running workout now has two types.
- Silent app updates: the app reloads for a new version only with no running workout. A cardio session must count as a running workout.
- Shared sound and screen-on code used by the strength rest.

### Timeline

Delivery in 3 weeks or less of after-hours work (user estimate).

## Functional Requirements

### Cardio plans
- FR-016: The user can create a cardio plan with a name and a list of intervals. Each interval has a name, a time and a type (work or rest). The user can mark a group of intervals and repeat it N times. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "a long list of intervals means long typing on the phone". Resolution: changed; a group of intervals can repeat N times. The interval type was added from FR-021.
- FR-017: The user can edit and delete a cardio plan. Priority: must-have. Change: new
  > Socrates: No counter-argument; stands as written.
- FR-018: The plan list shows strength plans and cardio plans. Each plan shows a visible mark of its type. Priority: must-have. Change: modified
  > Socrates: Counter-argument considered: "in one list you cannot tell a cardio plan from a strength plan". Resolution: changed; each plan shows a type mark.

### Cardio session
- FR-019: The user can pick a cardio plan and start a cardio session. A short get-ready time, the same for every plan, comes before the first interval. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "the first interval starts before the phone is in the pocket". Resolution: changed; a fixed get-ready time was added. The value goes to Open Questions.
- FR-020: During a cardio session, the user sees the current interval name, the time left in it, the next interval name and the progress "interval X of Y". Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "the user does not know how far into the session they are". Resolution: changed; "interval X of Y" was added (Y counts the intervals after the group repeats).
- FR-021: When an interval ends, a sound plays and the next interval starts with no tap. The start of a work interval and the start of a rest interval have different sounds. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "in a pocket, one sound for every change does not tell the user if work or rest comes next". Resolution: changed; intervals have a type and each type has its own sound.
- FR-022: The user hears a countdown (short beeps) before each interval ends. Priority: must-have. Change: new
  > Socrates: Clarified: a countdown before each interval end. No separate session-end sound (see FR-026).
- FR-023: The user can pause a cardio session and continue it. A paused session expires after the same idle time as a strength workout (FR-009). Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "a forgotten pause keeps a session open for hours". Resolution: changed; a paused session expires after the FR-009 idle time.
- FR-024: The user can turn on a lock mode. In lock mode the End and Pause buttons do not work until the user unlocks. The unlock action is hard to do by accident in a pocket. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "a simple tap or swipe can unlock the screen in a pocket". Resolution: changed; the unlock action must be hard to do by accident. The exact action goes to Open Questions.
- FR-025: The user can end a cardio session early: unlock, then End with a confirmation. Priority: must-have. Change: new
  > Socrates: No counter-argument; stands as written.
- FR-026: After the last interval, the user sees the end screen and returns to the plan list. Priority: must-have. Change: new
  > Socrates: Counter-argument considered: "in a pocket the user does not see the end screen". Resolution: kept; the countdown and the normal interval sound are enough. No separate session-end sound.

### Shared workout behavior
- FR-009: A running workout (strength or cardio) returns to exactly the same place after a screen lock, an app switch and a reload. For cardio, after a screen lock or an app switch the session runs on and shows the correct interval and time left. After a reload, the cardio session comes back paused at the current interval. Priority: must-have. Change: modified
  > Socrates: Counter-argument considered: "after a reload the session should wait paused, so the user can get ready again". Resolution: changed; only after a reload does the cardio session come back paused.
- FR-012: The screen does not turn off during a strength workout or a cardio session. Priority: must-have. Change: modified
  > Socrates: No counter-argument; stands as written.
- FR-027: The app reloads for a new version only on the plan list with no running workout. A cardio session counts as a running workout. Priority: must-have. Change: modified
  > Socrates: No counter-argument; stands as written.

### Preserved
- FR-028: The strength workout works unchanged (PRD v1 FR-001 to FR-008, FR-010, FR-014, FR-015). Priority: must-have. Change: preserved
  > Socrates: No counter-argument; stands as written. The strength workout does not get the lock mode in this change.
- FR-011: Plans are stored only on the user's device. Priority: must-have. Change: preserved
  > Socrates: Counter-argument considered: "adding a plan type changes the stored data; a bad migration loses all plans, and there is no backup (PRD v1 Open Question 2)". Resolution: changed in Phase 5; the user accepts a one-time loss of saved strength plans at this update. The clause "old strength plans load after the update" was removed.

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

## Business Logic

Current rule (PRD v1, kept for strength): the app guides the user through the sets and exercises of a plan in order. It always shows what is now and what is next. It computes the remaining rest time from elapsed time.

New rule for cardio: the app moves the user through the intervals in order with no tap, and tells every change only by sound.

Inputs: the cardio plan (intervals with a name, a time and a type; groups repeated N times), the Start tap, elapsed time, Pause and Continue. Output: the current interval, the time left in it, the next interval, "interval X of Y", and the sounds: a countdown before each interval end and a different sound for the start of a work interval and of a rest interval. The user meets this rule with the phone in a pocket: the sound is the only signal. A look at the screen shows the same position.

## Constraints & Preserved Behavior

- **No external integrations or APIs.** The app has no backend; there is no API contract to keep.
- **Data migration:** a plan gets a type (strength or cardio), so the stored data format changes. The user accepts a one-time loss of saved strength plans at this update. No migration is required. (PRD v1 Open Question 2, "no backup for plans", stays open.)
- **Preserved behavior:**
  - The strength workout flow works exactly as now (FR-028).
  - The app works offline after the first start, and no data leaves the phone.
  - A running workout returns to the same place after a screen lock, an app switch or a reload (FR-009, now with the cardio rules).
  - Silent updates: the app reloads for a new version only on the plan list with no running workout (FR-027).
- **Project documents that must change with this work** (from the project rules, not a user decision):
  - `PRODUCT.md` and `DESIGN.md` list cardio as out of scope. `DESIGN.md` does not cover an interval screen, a lock mode, "interval X of Y" or a type mark for plans. The project rules say: ask the user, then update `DESIGN.md` in the same change.
  - `DESIGN.md` says the biggest number is sets left (rest time during rest). The cardio screen needs its own rule.
  - `CLAUDE.md` says "the MVP has no cardio". It must change with this work.
- **Shared code risk:** the sound and the screen-on behavior are shared with the strength rest. A change for cardio must not change the strength rest sound or screen-on behavior.

## Non-Functional Requirements

- Each interval sound plays within 1 s of the planned interval end, while the screen is on.
- PRD v1 NFRs stay valid: return to the current position in less than 3 seconds; no user data leaves the device; works with no internet after the first start; works on an Android phone with the current Chrome.

## Product framing

- Product type: no change — an installable web app (PWA).
- User base: no change — one user (small).
- Hard deadline: none.
- After-hours work: yes.

## Non-Goals

- A guaranteed sound after a power-button lock: the answer for a phone in a pocket is the lock mode with the screen on. After a lock, the sound may stop; the state is kept.
- A lock mode for the strength workout: the strength workout stays unchanged in this change.
- GPS, distance, heart rate and cardio history or statistics: cardio is only a timer with intervals.
- Voice guidance: interval changes use sounds, not a voice (same as PRD v1).
- A migration of saved strength plans: the user accepts a one-time loss of plans at this update.

## Open Questions

1. **What is the fixed get-ready time before the first interval (FR-019)?** — Owner: author. Block: no (needed before FR-019 is built).
2. **What unlock action is hard to do by accident in a pocket (FR-024)?** — Owner: author, with a `DESIGN.md` update. Block: no (needed before FR-024 is built).
3. **How long is the countdown before an interval end, and how many beeps (FR-022)?** — Owner: author. Block: no.
4. **Does a running (not paused) cardio session follow the idle expiry?** Today a strength workout expires after 2 hours with no user action. A cardio session runs with no taps, so the idle rule may need to count only paused time (FR-023, FR-009). — Owner: author. Block: no.
5. **Does the new PRD replace PRD v1 or extend it?** The PRD v1 Non-Goals "cardio" and "a reliable signal with a locked screen" must be changed on purpose. — Resolved at `/10x-prd` on 2026-10-24: PRD v2 is saved as `prd-v2.md`, a delta on top of v1; `CLAUDE.md` names it as the current PRD.
6. **Is the 3-week estimate still right after the Socrates round?** The round added interval types, repeated groups, a countdown, pause and a get-ready time. — Owner: author. Block: no.

## Forward: technical-roadmap

- The lock-screen sound in a PWA was discussed: sound that the page keeps playing, or sounds scheduled ahead in the audio engine, may keep working with a locked screen on Chrome for Android, but battery savers can stop it. The user chose not to depend on this (lock mode with the screen on). A later change may test it on the real phone.

## Quality cross-check

Run on 2026-10-24. All six elements are present (Access Control, Business Logic, project artifacts, timeline, Non-Goals, preserved behavior). The user confirmed the 3-week estimate after the Socrates round added scope; Open Question 6 stays as a reminder.
