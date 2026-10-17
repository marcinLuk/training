# Pain Points by App Functionality

Feature-level analysis of `documentation/pain-points.csv` (369 opinions, 53 apps, 2024-10-21 to 2026-10-17).
Prepared: 2026-10-17. Companion to [pain-points-top5.md](pain-points-top5.md), which ranks the themes across all opinions.

## Scope and method

This document looks only at **what users say about app features**: what is broken, what is missing and what is locked behind a paywall.

- **278 of the 369 opinions (75%)** are about functionality. The other 91 are about billing, price, support, privacy breaches, ads or marketing, so they are left out here (they are covered in the top-5 document).
- Each functional opinion was tagged by hand with **one feature area** (the feature the main complaint is about) and **one kind**:
  - **Broken**: the feature exists but fails or got worse.
  - **Missing**: the user wants something the app can't do.
  - **Gated**: the feature exists but needs a paid tier. These are functional complaints that the CSV categorised as Monetization.
- The manual tags are a judgement call. Treat counts within ±2 as a tie.

## Overview

| Feature area | Opinions | High sev. | Broken / Missing / Gated | Mostly in | Relevant to Trening? |
|---|---:|---:|---|---|---|
| Wearables, health platforms, integrations | 53 | 17 | 46 / 6 / 1 | cardio | Out of scope (for now) |
| AI / auto-generated programming | 32 | 2 | 28 / 4 / 0 | general fitness, planners | Out of scope |
| Navigation, search, layout, redesigns | 27 | 0 | 19 / 7 / 1 | all | Yes (general UX) |
| General stability (crash, won't launch) | 26 | 20 | 26 / 0 / 0 | planners | Yes (quality) |
| Saving, history, export (own data) | 23 | 12 | 19 / 3 / 1 | planners, strength | **Yes, core** |
| Workout logging (in-session data entry) | 22 | 3 | 7 / 11 / 4 | strength | **Yes, core** |
| Workout player: timers, cues, video | 22 | 2 | 18 / 4 / 0 | general fitness | **Yes, core** (runner) |
| Plan / program builder | 18 | 1 | 4 / 14 / 0 | general fitness | **Yes, core** |
| Calendar and scheduling | 13 | 0 | 5 / 6 / 2 | planners | **Yes, core** |
| Login and account access | 13 | 12 | 13 / 0 / 0 | all | Mostly N/A (no accounts) |
| Stats and progress | 12 | 0 | 5 / 4 / 3 | cardio, strength | **Yes** |
| Exercise library and content | 9 | 0 | 1 / 8 / 0 | strength | Yes |
| GPS / outdoor tracking | 8 | 3 | 8 / 0 / 0 | cardio | Out of scope (cardio brief) |

Three patterns stand out:

1. **The features users rely on are breaking, more than features are missing.** 71% of functional complaints are "broken" (199 of 278). Missing features are concentrated in the plan builder, logging, calendar and library, which are exactly Trening's areas.
2. **Severity depends on timing.** Login (12 of 13 high) and general stability (20 of 26 high) are the most severe, because they block a workout from starting. Logging, plans and calendar are almost never rated high: they annoy users rather than stop them.
3. **The areas with the most complaints (wearables 53, AI 32) are the ones Trening doesn't have.** Integrations and "smart" coaching are where competitors fail most often. Not having them is a real advantage until they can be done reliably.

---

## Core areas for Trening

### 1. Saving, history and export: 23 opinions (12 high)

**What breaks:**
- **Finished workouts don't save**: in-app sessions fail to save (TrainingPeaks, Gravl, Future); a workout saves only after leaving and re-entering, then shows as 1 minute long (ABC Trainerize); the set history is wiped mid-lift and the workout is recorded as 60 seconds (ABC Trainerize, a gym owner).
- **History lost**: an entire training history was deleted after an update (TeamBuildr); program progress resets the next day (Nike Training Club); challenge badges were wiped after clearing the cache (Samsung Health); a recording vanished after a failed sync at save time (Garmin).
- **Exports that are incomplete or wrong**: Freeletics' export leaves out weights and pace; StrongLifts' holds only about six months; Strong's garbles timed sets (a 90-minute plank); Komoot has no bulk export; Fitbod has had no Android export for years.
- **History held hostage** (gated): StrongLifts users can't view old workouts without starting a trial.

**Trening today:** a finished workout is POSTed once on "save summary", and the runner survives reloads (`localStorage`). There is a full JSON export and import, and the log is a denormalized snapshot that survives renames and deletions.

**Gaps:**
- Checked: if the POST in `run-save` fails (server down, network drops in the gym), `run` is not cleared, so the workout stays in `localStorage` and the button can be pressed again. This already covers the most common failure users describe. One weak spot remains: the client doesn't send its own workout `id`. If the server saves the workout but the response is lost, a retry creates a duplicate entry. Generating the id on the client when the run starts would make the retry safe to repeat (the server already accepts client ids).
- The export is JSON only. A **CSV of the log** (date, exercise, set, reps, weight) would answer the "export omits load" complaint and make the data usable in a spreadsheet.
- A finished workout can't be **edited**, only deleted.

### 2. Workout logging: 22 opinions (mostly missing; strength users 14 of 22)

**Missing:**
- **Changing the session on the fly**: reorder exercises when equipment is busy (TrainHeroic), pick a different exercise instead of the forced next one (JEFIT), substitute an exercise (gated in Boostcamp and JEFIT), duplicate an exercise (Strong).
- **Logging after the fact**: back-fill a past workout with a usable date picker (Hevy has no year selector); add a session done without the phone (BetterMe); remove a session from a workout (COROS).
- **Richer set data**: different weights for left and right (Future, after an injury), RPE/RIR/tempo fields (Strong; TrainerRoad's RPE entry is broken), weight steps matching the smallest plate (Hevy), units independent of other apps (MacroFactor), time/floors/steps for cardio machines (Alpha Progression).
- **Previous performance during the set**: the watch app doesn't show previous sessions for an exercise (Hevy).

**Broken:** inputs going into the wrong boxes after the Strong 6.0 update; replacing an exercise or changing a weight wipes what was already entered (Gravl, Strong); completed-exercise checkmarks disappeared (JEFIT).

**Trening today:** a rep counter (tap to add a rep), weight editable per set, "Done N reps", skip exercise, auto-finish the set at the target rep count, and a note at the end. Exercises are fixed in plan order during a run.

**Gaps:** no reorder or swap during a run (only skip); no manual or back-dated log entry; no editing of past entries; no "last time: 3×10 @ 60 kg" hint. The last one matters: when history is slow or hidden, users say they have to "guess previous weights" (Future).

### 3. Workout player (timers, cues, video): 22 opinions

**What breaks:**
- **Timers and cues stop when the screen is off or the app is in the background**: Runna's audio prompts work only with the screen on, and support's answer was "keep the screen on". The C25K app goes silent halfway through. NHS Couch to 5K's timer pauses at random and its timings run 20–60 seconds long. Swiping the app closed can pause the timer, and there is no lock-screen timer.
- **Controls that misfire mid-set**: an oversized pause button gets hit by accident (Strava); the volume button skips to the next step (Ladder); the rest-timer button is so sluggish that a double tap triggers the wrong action (ABC Trainerize).
- **Audio**: audio plays even when the audio setting is off (Ladder); a timer permanently lowers the music volume (JuggernautAI); music doesn't play during workouts (Sweat).
- **Video and follow-along** (mostly classes): videos don't load or skip ahead; demos too fast; poor camera angles.

**Missing:** rest timers that can be saved or applied to all exercises (Boostcamp); separate timers for warm-up and working sets (Hevy); a vibration alert on the rest timer (Strong); a lock-screen timer (NHS Couch to 5K).

**Trening today:** a rest timer per exercise (stored in the plan), ±15 s and skip, Web Audio beeps, the Wake Lock API, and the timer computed from `Date.now()`, so the remaining time stays correct after the tab comes back.

**Gaps and risks:**
- Trening relies on the same "keep the screen on" workaround users complain about. In a browser tab, the **beep won't sound while the phone is locked or the tab is in the background**. This should be tested on a real phone. Vibration (`navigator.vibrate`, already used in the cardio brief) and a clear on-screen state when the user returns are cheap mitigations.
- Consider making big buttons (Done set / Skip) hard to hit by accident, for example by keeping Skip small and away from the main action, as it is now.

### 4. Plan / program builder: 18 opinions (14 missing)

**Missing:**
- **Build your own program**: no way to build custom programs from chosen workout types, length and frequency (Nike Training Club, Centr, Future).
- **Edit a single day**: a mistake on one day of a custom plan means rebuilding the whole plan (Apple Fitness+).
- **Long-term structure**: programs that build up over time rather than repeat (Apple Fitness+); plans longer than three weeks; a follow-on after a 6–12-week program ends (Sweat); periodized or cyclical blocks (TrueCoach).
- **Efficient editing**: duplicating weeks and days is slow (Boostcamp); importing an existing program is restricted (MacroFactor); no search or filter across hundreds of templates (Strong).
- **Preview a program before committing** (Sweat; TrainHeroic too).
- **Variety controls**: set the number of cardio vs strength days per week (Freeletics); include cross-training (Runna).

**Broken:** listed durations far shorter than the real time (Sweat: 45 min listed, about 80 min in practice).

**Trening today:** named plans with an ordered list of exercises (sets, reps, weight, rest), reorderable, and exercises picked from the library. Each plan is one workout. A "program" is built by scheduling plans on calendar days.

**Gaps:**
- No **duplicate plan** action, which is the cheapest way to make variants (week A / week B, deload).
- No **estimated duration** per plan. Trening has all the inputs for an honest estimate (sets × (reps × a few s + rest)), and wrong durations are a specific complaint.
- Multi-week programs only exist as scheduled entries. A "repeat this weekly pattern" helper on the calendar would cover most of the "long-term program" requests without a new program model.

### 5. Calendar and scheduling: 13 opinions (none high, but 9 of 13 from planner apps)

**Missing or gated:**
- **Move a session to another day**: gated behind Premium in TrainingPeaks (two separate reports); drag and drop broke (TrainingPeaks); you can only reschedule, not reorder (TrainHeroic); a missed workout can't be moved to the day it was actually done (TrueCoach).
- **Pause a plan** for illness or injury (Runna), or mark a session missed for that reason (Fitbod).
- **Recurring sessions** (every Tuesday) on the calendar (Athletica).
- **Sensible defaults**: open on today or on the last view, not at the top of the month (TrainHeroic).

**Broken:** rescheduling shifts entries to the wrong day (Runna v3); workouts unlock only one calendar day after the previous one is finished, so a missed day costs paid time (BetterMe); completed sessions don't match the planned ones, so it looks like workouts were skipped (TrainingPeaks).

**Trening today:** a month view with a Today button, add a plan or cardio template to a day, delete an entry, start from the calendar, and an entry is marked done when the linked workout is saved. **There is no way to move an entry** (the API has `POST`/`DELETE /api/schedule` only).

**Gaps:** "move to another day" is the most common calendar request and is gated by a competitor. It's a small change (`PUT /api/schedule/:id` with a new date, or delete and re-add on the client). A recurring "every week on these days for N weeks" option would cover the recurring-session and long-program requests together. Checked: a workout started from a calendar entry is linked by `scheduleId`, not by date, so the entry is marked done even when the workout happens on a different day. Trening already avoids the TrueCoach complaint.

### 6. Stats and progress: 12 opinions

**What users want:** easy-to-find **personal records** (Peloton; gated in Strava); **long-range history and trends**, not only the last month (Polar, adidas); **weekly and monthly summaries** (Suunto); fast-loading exercise history (Future). Volume charts are gated in JEFIT.

**Broken:** averages that include the current partial day (Fitbit); **bodyweight exercises adding nothing to total volume** (Hevy); confusing graph axes and dates cut off the screen (TrainingPeaks).

**Trening today:** journal cards show duration, set count and volume per workout, plus a count for this month and in total. There are no PRs, no per-exercise history and no charts. **Trening has the same bodyweight issue Hevy is criticised for**: volume is calculated as `(weight ?? 0) × reps`, so bodyweight sets count as 0.

**Gaps:** a per-exercise view (history of sets, best weight, best estimated 1RM) covers both "find my PR" and "what did I lift last time". For bodyweight volume, either show reps separately or count bodyweight sets by reps, and say which on the card.

### 7. Exercise library: 9 opinions (8 missing)

Users find libraries thin (kettlebell, machines, stretches, yoga variations) and cluttered with **duplicates under different names**, which splits progress between programs (Boostcamp). Custom exercises are capped in Hevy's free tier, and a custom exercise's category can't be edited later (Strong).

**Trening today:** a user-built library with case-insensitive, Polish-aware unique names (this prevents the duplicate problem), editable, with no cap. There are no categories or demos. This is fine for a single-user app where the user names their own exercises. Optional fields (muscle group, a link to a demo video) would cover the remaining requests cheaply.

---

## Cross-cutting areas

### Navigation, search and redesigns: 27 opinions
- **Updates that bury core screens**: JEFIT removed direct access to exercises and progress, and hid "add an unplanned exercise" under a renamed tab. Logging "now takes too many taps."
- **No search or filter**: Peloton programs, Strong templates, Apple Fitness+ and BetterMe catalogues.
- **Readability**: the TrainingPeaks 2025 redesign (fonts too small, colours hard for colour-blind users), unclear input fields, and screen-reader accessibility (Nike Run Club).
- **Lesson for Trening**: keep the core loop (calendar → start → log → journal) within one or two taps and stable across versions. Add search to plans and the library once lists get long.

### Stability and access: 26 + 13 opinions, the most severe
- Crashes **during a workout** (TrainHeroic up to 5 per session, Boostcamp, JuggernautAI) and the app **reloading or hanging after switching apps between sets** (Boostcamp, Freeletics).
- Login lockouts block the workout entirely (12 of 13 high).
- **Trening is well placed here.** It has no accounts (optional Basic auth only), and the run state survives reloads and app switches. If the server is unreachable at save time, the run is kept and the save can be retried (see the Saving section).

## Out of scope for now, but worth knowing

- **Wearables and integrations (53, the largest area)**: watch↔phone sync, Apple Health / Health Connect writing wrong data (a 45-minute session logged as 400+ minutes, one run counted three times), partner links breaking silently (Suunto→Strava, Garmin→Nike Run Club), TV casting. This is where competitors lose data most often. If Trening ever adds an integration, the bar is "never write wrong data", and a one-way **file export** (CSV/FIT) is safer than a live sync.
- **AI programming (32)**: ignores equipment, injuries and the user's real weights; repetitive; the same muscle groups on consecutive days; regenerating a plan throws away progress. Trening's manual plans avoid all of this. If suggestions are ever added, a simple rule-based "+2.5 kg when all sets hit the target reps" (Hevy users ask for suggested weight increases) is low risk and transparent.
- **GPS (8)**: distance overstated by 10–50%, tracking stopping when the screen is off, stroller runs auto-paused. This confirms the cardio brief's decision to leave GPS out.

---

## Feature backlog suggested by the evidence

Ordered by evidence × fit with Trening × effort. Items already planned elsewhere are not repeated.

| # | Feature | Evidence (opinions) | Trening today | Effort |
|---|---|---|---|---|
| 1 | **Move a calendar entry to another day** | 6 calendar opinions, gated by TrainingPeaks | Add / delete only | S |
| 2 | **Make save retry safe to repeat** (client-generated workout id) | 12 high-severity "didn't save" opinions | Run is kept on failure; a retry after a lost response can create a duplicate | S |
| 3 | **"Last time" hint in the runner** and a **per-exercise history / PR view** | 5 stats + logging opinions, gated by Strava and JEFIT | None | M |
| 4 | **Swap or reorder exercises during a run** | 6 logging opinions, gated by Boostcamp and JEFIT | Skip only | M |
| 5 | **Edit a finished workout** and **add a workout manually / back-dated** | 4 logging opinions | Delete only | M |
| 6 | **Recurring scheduling** (weekly pattern for N weeks) | 5 plan + calendar opinions | One entry at a time | M |
| 7 | **CSV export of the log** | 5 export opinions | JSON only | S |
| 8 | **Duplicate plan** and **estimated plan duration** | 3 plan opinions | None | S |
| 9 | **Fix bodyweight volume** (count reps or label it) | Hevy complaint; same bug in Trening | Counts as 0 | S |
| 10 | **Vibration + locked-screen behaviour check for rest timer beeps** | 5 player opinions | Beep + Wake Lock | S |

Deliberately not on the list: wearable sync, AI coaching and GPS. They are the largest complaint areas, but also where competitors fail most often, and they fall outside Trening's current scope.
