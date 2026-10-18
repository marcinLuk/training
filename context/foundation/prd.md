---
project: "Trening"
version: 1
status: draft
created: 2026-10-18
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 4
  hard_deadline: null
  after_hours_only: true
---

# Trening: Product Requirements Document

## Vision & Problem Statement

A person who trains at home, alone, with a phone nearby, loses track of position during a workout with many sets. This person skips a set. The skip shows up after a break between sets. Something distracts the person (a talk, a wandering mind, the phone). After that, the person does not know which set of which exercise comes next. Today the skip is found only after the workout, or never. People guess, or they do extra reps "just in case".

The solution must work without the user touching the phone. The research shows that picking up the phone is a trap in itself: notifications, social media, and a 90-second rest that grows to 4 minutes. For the author, the skip happens after a break, not during the reps. One look at the screen after a break must show where the user is and what comes next.

## User & Persona

Primary: the author (one person). Trains at home, alone, with a phone nearby. The moment of need: after a break between sets, when the author does not know where they are or what comes next. Friends are an informal check, not a separate persona.

## Success Criteria

### Primary
- 0 skipped sets in 3 workouts in a row (baseline from the first hypothesis test; measured with a note after each workout).

### Secondary
- At least 95% of sets are marked done in the app.

### Guardrails
- The app does not make breaks longer and does not become a distraction.
- The workout state is not lost (screen lock, reload, closing the app).
- The end-of-rest signal is clear, also with headphones.
- User data stays only on the device.

## User Stories

### US-01: The user does a workout from a saved plan

- **Given** the user has a saved plan with exercises, sets, reps, and a rest time
- **When** the user picks the plan, taps Start, and taps the done button after each set
- **Then** a rest starts after each set, the user hears a signal when the rest ends, and the app returns to the next set view. After the last set, the user sees the "end" screen.

#### Acceptance Criteria
- The set view always shows the exercise name, the reps, and the number of sets left.
- After a screen lock, an app switch, or a reload, the user returns to the same set and the same rest state.

## Functional Requirements

### Plans
- FR-001: The user can create a workout plan with a name. Priority: must-have
  > Socrates: no counter-argument; stands as written.
- FR-002: The user can add an exercise to a plan with a name, a number of sets, a number of reps, and a rest time. Priority: must-have
  > Socrates: counter-argument: four fields per exercise make a long editor on a phone. Resolution: kept; the editor has sensible default values.
- FR-003: The user can save, edit, and delete a plan. Priority: must-have
  > Socrates: the counter-argument "edit and delete can wait" was first picked. The user changed the decision: no counter-argument; stands as written.
- FR-011: Plans are stored only on the user's device. Priority: must-have
  > Socrates: counter-argument: without a backup, data loss deletes the progress, and export/import is not convenient on a phone. Resolution: kept; the risk goes to Open Questions (protection against data clearing).

### Workout
- FR-004: The user can pick a saved plan and start a workout. Priority: must-have
  > Socrates: no counter-argument; stands as written.
- FR-005: During a workout, the user sees the exercise name, the number of reps, the number of sets left, and the name of the next exercise. Priority: must-have
  > Socrates: counter-argument: the "what is next" information is missing. Resolution: the next exercise name was added.
- FR-006: The user can mark a set as done with one tap. Priority: must-have
  > Socrates: counter-argument: an accidental tap marks a set that was not done. Resolution: kept; FR-014 (undo) protects against it.
- FR-007: After a set is marked done, a rest timer starts with the time set for the exercise. Priority: must-have
  > Socrates: counter-argument: sometimes the user needs a shorter or longer rest during the workout. Resolution: FR-015 was added.
- FR-008: When the rest ends, a sound plays and the app returns to the set view. Priority: must-have
  > Socrates: counter-argument: the automatic return takes control away when the user wants a longer break. Resolution: kept; the return happens after the signal, not during the rest.
- FR-009: The workout returns to exactly the same place after a screen lock, an app switch, and a reload. After a set idle time, the workout expires. Priority: must-have
  > Socrates: counter-argument: after a long break (hours), an old workout should expire. Resolution: expiry after idle time was added. The time value is not set yet (Open Questions).
- FR-010: After the last set, the user sees an "end" screen and returns to the plan list. Priority: must-have
  > Socrates: no counter-argument; stands as written.
- FR-012: The screen does not turn off during a workout. Priority: must-have
  > Socrates: no counter-argument; stands as written.
- FR-014: The user can skip or undo a set. Priority: must-have
  > Socrates: no counter-argument; stands as written.
- FR-015: The user can make the running rest longer or shorter. Priority: must-have
  > Added in the Socrates round (from FR-007).

Note: FR-013 (vibration with the end-of-rest sound) was removed in the Socrates round. The number stays unused.

## Non-Functional Requirements

- After the user returns to the app (after a screen lock, an app switch, or a reload), the user sees the current position and the remaining rest time in less than 3 seconds.
- No user data leaves the user's device.
- The product works without an internet connection after the first start.
- The product works on an Android phone with the current version of Chrome.

## Business Logic

The app guides the user through the sets and exercises of the plan in its order. It always shows what is now and what is next. It calculates the remaining rest time from elapsed time, so the time is correct after the user returns from a screen lock.

Inputs: the user's plan (exercises, sets, reps, rest time), the tap that marks a set done, and elapsed time. Output: the current position (exercise, set, next exercise) and the remaining rest time. The user meets this rule in the workout view, during the rest, and when returning to the app after a break.

## Access Control

Single user. No login and no accounts. Data lives only on the device (the phone). No sync between devices.

## Non-Goals

- Counting reps during a set: the hands are busy with the exercise.
- Voice guidance without looking at the screen: too costly.
- Workout history and statistics: after a workout there is only the "end" screen. The Primary criterion is measured with a manual note.
- Calendar planning, an exercise library, and cardio: the planning problem was dropped. The new product does not carry these over from the prototype.
- Vibration at the end of a rest: no proof of value beyond the sound (decision in the Socrates round, the former FR-013).
- Publishing in Google Play in the MVP: the MVP ships as an installable web app. The store comes later.
- A reliable signal with a locked screen or with the app in the background: the MVP assumes the screen is on (FR-012).

## Open Questions

1. **What is the idle time before a workout expires (FR-009)?** — Owner: author. Without a value, "return to the same place" can show an old workout from hours ago. Block: no (needed before FR-009 is built).
2. **How are plans and progress protected against loss (FR-011)?** — Owner: author. Data lives only on the device. Export/import was rejected as not convenient on a phone, so the risk of losing plans has no solution yet. Block: no (needed before release).
3. **Does a tap to mark a set done fit the insight "without touching the phone" (FR-006)?** — Owner: author. Check during the first workouts with the app. Block: no.
