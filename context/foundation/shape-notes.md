---
project: "Trening"
context_type: greenfield
created: 2026-10-18
updated: 2026-10-18
checkpoint:
  current_phase: 8
  phases_completed: [1, 2, 3, 4, 5, 6, 7]
  gray_areas_resolved:
    - topic: "Rest timer"
      decision: "rest time is set per exercise in the plan"
    - topic: "End of workout"
      decision: "an 'end' screen, then return to the plan list; no workout history is saved"
    - topic: "Session mode"
      decision: "greenfield: the current code and database are a prototype used to test hypotheses; they will be discarded"
    - topic: "MVP delivery shape"
      decision: "PWA (final decision by the user, 2026-10-18)"
  frs_drafted: 14
  quality_check_status: warned
---

# Shape notes

Input sources: `documentation/hipotezy-produktowe.md` (product hypotheses, in Polish), `context/changes/google-store-app/research.md`.
The app in this repository is only a prototype. It tested a few hypotheses. It is not a starting point and not a limit.

Hypothesis names (HA0, HA1, HA2, HA4, HA5, HA6, HA7) refer to `documentation/hipotezy-produktowe.md`.

## Vision & Problem Statement

A person who trains at home, alone, with a phone nearby, loses track of position during a workout with many sets. This person skips a set. The skip shows up after a break between sets. Something distracts the person (a talk, a wandering mind, the phone). After that, the person does not know which set of which exercise comes next. Today the skip is found only after the workout, or never. People guess, or they do extra reps "just in case".

Insight (the author's words): the solution must work without the user touching the phone. The research shows that picking up the phone is a trap in itself: notifications, social media, and a 90-second rest that grows to 4 minutes.

Type of pain: lost position after a break; the phone as a distraction.

Source: `documentation/hipotezy-produktowe.md`. HA0 is confirmed in a qualitative way: the main cause is distraction. For the author, the skip happens after a break, not during the reps.

## User & Persona

Primary: the author (one person). Trains at home, alone, with a phone nearby. The moment of need: after a break between sets, when the author does not know where they are or what comes next. Friends are an informal check, not a separate persona.

## Access Control

Single user. No login and no accounts. Data lives only on the device (the phone). No sync between devices.

## Success Criteria

The first MVP flow (the author's words):
1. Before the workout, the author adds exercises and sets the sets, the reps, and the rest time for each exercise. The author saves this as a plan.
2. During the workout, the author picks a saved plan and taps Start.
3. The screen shows: the current exercise name, the number of reps, and how many sets are left.
4. After each finished set, the author taps one button.
5. A rest timer starts. When the time ends, a sound plays.
6. The app returns by itself to the set view (next set or next exercise).
7. The workout state survives a screen lock, an app switch, and a reload. The user returns to the same place (HA2).
8. After the last set, an "end" screen shows, then the user returns to the plan list. No history is saved.

### Primary
- 0 skipped sets in 3 workouts in a row (baseline from HA0, measured with a note after each workout).

### Secondary
- At least 95% of sets are marked done in the app (HA4).

### Guardrails
- The app does not make breaks longer and does not become a distraction.
- The workout state is not lost (screen lock, reload, closing the app).
- The end-of-rest signal is clear, also with headphones.
- User data stays only on the device.

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
- ~~FR-013~~: removed in the Socrates round (vibration together with the sound).
  > Socrates: counter-argument: the sound is enough; vibration is an extra with no proof of value. Resolution: removed. The number stays unused.
- FR-014: The user can skip or undo a set. Priority: must-have
  > Socrates: no counter-argument; stands as written.
- FR-015: The user can make the running rest longer or shorter. Priority: must-have
  > Added in the Socrates round (from FR-007).

## User Stories

### US-01: The user does a workout from a saved plan

- **Given** the user has a saved plan with exercises, sets, reps, and a rest time
- **When** the user picks the plan, taps Start, and taps the done button after each set
- **Then** a rest starts after each set, the user hears a signal when the rest ends, and the app returns to the next set view. After the last set, the user sees the "end" screen.

#### Acceptance Criteria
- The set view always shows the exercise name, the reps, and the number of sets left.
- After a screen lock, an app switch, or a reload, the user returns to the same set and the same rest state.

## Business Logic

The app guides the user through the sets and exercises of the plan in its order. It always shows what is now and what is next. It calculates the remaining rest time from elapsed time, so the time is correct after the user returns from a screen lock.

Inputs: the user's plan (exercises, sets, reps, rest time), the tap that marks a set done, and elapsed time. Output: the current position (exercise, set, next exercise) and the remaining rest time. The user meets this rule in the workout view, during the rest, and when returning to the app after a break.

## Non-Functional Requirements

- After the user returns to the app (after a screen lock, an app switch, or a reload), the user sees the current position and the remaining rest time in less than 3 seconds.
- No user data leaves the user's device.
- The product works without an internet connection after the first start.
- The product works on an Android phone with the current version of Chrome.

## Non-Goals

- Counting reps during a set: the hands are busy with the exercise (HA5 removed).
- Voice guidance without looking at the screen: too costly (HA7 removed).
- Workout history and statistics: after a workout there is only the "end" screen. The Primary criterion is measured with a manual note.
- Calendar planning, an exercise library, and cardio: the planning problem was dropped. The new product does not carry these over from the prototype.
- Vibration at the end of a rest: no proof of value beyond the sound (decision in the Socrates round, the former FR-013).
- Publishing in Google Play in the MVP: the MVP ships as a PWA. The store comes later.
- A reliable signal with a locked screen or with the app in the background: the MVP assumes the screen is on (FR-012).

## Quality cross-check

Status: warned (the user accepted the gaps, 2026-10-18).

- Idle time before a workout expires (FR-009): no value. Without it, "return to the same place" can show an old workout from hours ago.
- Protection of data against clearing by the browser (FR-011): plans and progress live only in PWA storage. Export/import was rejected as not convenient on a phone. The risk of losing plans has no solution yet.
- Tension to check during workouts: the insight "without touching the phone" against marking a set with a tap (FR-006).

## Forward: open items from phase 4

- Idle time before a workout expires (FR-009): to be decided.
- Protection of data against clearing by the browser (FR-011). Export/import is not convenient on a phone.
- Vibration at the end of a rest left the MVP (decision in the Socrates round).

## Timeline budget

mvp_weeks: 4
hard_deadline: null
after_hours_only: true

product_type: web-app (PWA installed on a phone, Android + Chrome)
target_scale: { users: small, qps: low, data_volume: small }

## Timeline acknowledgment

Acknowledged on 2026-10-18: 4-week MVP requires sustained dedication; user accepted.

## Forward: tech-stack

- The user decided: the MVP ships as a **PWA** (no Google Play in the MVP).
- From the research (for information, for use in stack choice): a PWA avoids the gate of 12 testers for 14 days. A PWA has weak support for alerts with the screen off. Wake Lock works in Chrome on Android. Storage is per origin, so a backup path is needed. The data option (on-device or server) is not final; the Access Control section chose on-device.
