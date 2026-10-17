# UX/UI and Functionality Pain Points: Workout Apps

Analysis of `documentation/pain-points.csv` (369 opinions, 53 apps, 2024-10-21 to 2026-10-17). No new data was collected for this document.
Prepared: 2026-10-17. Companion to [pain-points-top5.md](pain-points-top5.md) (themes across all opinions) and [pain-points-functionality.md](pain-points-functionality.md) (complaints by feature area).

## Scope and method

This document picks out **5 pain points about UX/UI** (how the app looks, reads and responds to touch) and **5 about how the app works and which features are missing**. Billing, price, support and privacy breaches are left out; they are covered in the top-5 document.

- The CSV category was the starting point, but every opinion was re-read. Many UX and feature complaints are tagged under another category (for example an uncloseable upgrade pop-up is tagged Monetization, and a timer that pauses when you swipe is tagged UX). So the themes below cut across categories.
- **130 opinions** were assigned to exactly one of the 10 themes. Counts are exact for that assignment, but the assignment itself is a judgement call, so treat differences of ±2 as a tie.
- Each theme lists its CSV line numbers (header = line 1) so the evidence can be checked.
- "Trening today" was checked against the current code (`public/app.js`, `public/styles.css`, `server.js`), including the uncommitted cardio work.

## Overview

| # | Pain point | Opinions | High | Mostly in | Fit for Trening |
|---|---|---:|---:|---|---|
| **UX/UI** | | | | | |
| U1 | Redesigns and feature creep bury the core loop | 17 | 0 | cardio, strength | Keep the loop short and stable |
| U2 | Controls that misfire mid-workout | 9 | 2 | cardio | Check the runner's touch targets |
| U3 | Can't find things: no search, sort, preview or sensible default view | 13 | 1 | general fitness, planners | Search for plans; library already has it |
| U4 | Clutter and noise: upsells, feeds, all-or-nothing notifications, no guidance | 12 | 0 | general fitness | Avoided by design |
| U5 | Hard to read: small fonts, weak contrast, poor accessibility | 11 | 0 | planners, general fitness | Small fixes |
| **Functionality / features** | | | | | |
| F1 | The workout doesn't survive real life: background, app switch, saving | 14 | 9 | planners, cardio | Mostly covered; one gap |
| F2 | Your history: progress you can't see and exports that leave data out | 18 | 1 | strength | **Biggest gap** |
| F3 | Plans and calendar that can't bend | 16 | 0 | planners, general fitness | Missing "move" and "pause" |
| F4 | Logging is too rigid: no back-fill, no edits, too few fields | 12 | 0 | strength | Missing edit and back-fill |
| F5 | The session can't be changed on the fly | 8 | 0 | strength, planners | Skip only |

Three patterns stand out:

1. **UX complaints are almost never "high", but they come with "switched back" or "won't renew".** Only 3 of the 62 UX opinions are high severity. The damage is slow: users describe an app that got "clumsier with each update" (JEFIT) and leave for a simpler one.
2. **The worst UX moments are mid-workout.** Two of the three high-severity UX opinions are about a control hit by accident during a session (Strava's pause button cut off parts of rides; Peloton's screen ended classes on phantom touches).
3. **Feature requests come from strength users; breakage comes from planners.** Strength trackers make up 21 of the 38 opinions in F2, F4 and F5 (missing features). Planner apps make up 6 of the 14 in F1 (broken saving), and 9 of those 14 are high severity.

---

## Part 1: UX/UI pain points

### U1. Redesigns and feature creep bury the core loop

**17 opinions (16 medium). JEFIT 4, Garmin Connect 2, Ladder 2.**

Users don't object to change as such. They object when an update moves or hides the one thing they open the app for.

- **Core screens moved or removed**: JEFIT's new version removed direct access to the user's exercises and progress screens, hid "add an unplanned exercise" under a renamed tab (a long-time user thought it was gone), and made logging "buried behind too many taps". A JEFIT redesign also dropped alphabetical sorting and the back button.
- **More steps before you can start**: every new Zwift feature adds another screen before you can just ride. Strong's Apple Watch update turned the rest timer into several manual actions.
- **Dated and cluttered**: Garmin Connect is called "cluttered, inconsistent and dated" by people who love the watches. Komoot is "needlessly complicated". Samsung Health split features across extra menus and the search bar takes about 5 seconds to open.
- **Tasks split between app and web**: COROS sessions can only be deleted on the website; TrainerRoad and Ladder split features between app and web.
- **Change for its own sake**: a Suunto user would "rather have a system that just works than frequent layout changes".

**Trening today:** five tabs (Calendar, Plans, Cardio, Exercises, Journal). The calendar opens on the current month with today selected, and a workout starts from the day's entry. Everything works in one place, because there is no separate web or mobile app.

**What to do:** treat "calendar → start → log → journal" as a fixed path that new features may not lengthen. New features (cardio, statistics) should be added beside the loop, not in front of it. Name the core screens once and keep them.

*CSV lines: 11, 13, 17, 28, 78, 82, 86, 182, 234, 235, 249, 253, 328, 332, 333, 340, 352.*

### U2. Controls that misfire mid-workout

**9 opinions, 2 of them high. The most severe UX theme.**

During a workout the user is tired, sweaty and moving. Controls that are fine at a desk cause lost data in the gym or on the road.

- **Big buttons in the wrong place**: Strava's redesigned recording screen put an oversized pause button where it gets hit by accident, and the user lost parts of rides (high).
- **Phantom or double input**: Peloton's screens register phantom touches that end classes early (high). ABC Trainerize's rest-timer button responds so slowly that users tap twice and trigger the wrong action, and its input fields are hard to tell apart.
- **System gestures that do the wrong thing**: swiping the NHS Couch to 5K app closed can pause the timer; Ladder's volume button skips to the next step; Komoot swallows the Android back gesture, which the user calls "unsafe while riding".
- **One-tap actions with big effects and no confirmation**: Fitbod's "log all sets" has no confirmation.
- **Interaction that needs constant attention**: Sweat's mobility sessions need a tap after every short clip; MapMyRun's screen keeps bouncing back to the routine view.

**Trening today:** the runner already asks for confirmation before "skip the remaining sets", "end workout" and "discard without saving". The rep counter is a large tap area. But small buttons (`.btn.small`, about 28 px tall) are below the usual 44 px minimum touch target.

**What to do:** check the runner on a phone: no destructive action within thumb reach of "Done set" or the rep counter, every touch target in the runner at least 44 px, and the rep counter able to absorb an accidental double tap (the "−" already lets the user undo one).

*CSV lines: 31, 33, 36, 66, 177, 188, 194, 237, 295.*

### U3. Can't find things: no search, sort, preview or sensible default view

**13 opinions (9 medium, 1 high). TrainHeroic 3, Peloton 2, ABC Trainerize 2.**

- **No search or filter**: finding a Peloton program meant "endless scrolling" until search was added. Strong has no search or sort for hundreds of templates. Apple Fitness+ filters only by music, duration and trainer. BetterMe has categories and nothing else. Strava even puts searching your own saved routes behind the subscription.
- **Long lists to scroll through mid-session**: ABC Trainerize programs are slow to follow because the user scrolls through exercises (high, combined with a billing issue).
- **No preview before committing**: Sweat requires setting a program as active to see what's in it; TrainHeroic has no quick program preview.
- **Wrong default view**: the TrainHeroic coach calendar never opens on today or the last view.
- **"Where did my program go?"**: after a platform migration, TrainHeroic users couldn't find their programs; Madmuscles users couldn't tell which workout types exist.

**Trening today:** the exercise library gets a search box once it holds more than 6 exercises, with Polish-aware matching. The calendar opens on today. The **plan list has no search or sort**. Plans are previewed in full in the editor, so there is no "commit to see it" problem.

**What to do:** reuse the library's filter on the plan list once it grows past a handful of plans. Sort plans by name or by last used.

*CSV lines: 71, 99, 103, 157, 166, 167, 190, 193, 198, 256, 257, 259, 354.*

### U4. Clutter and noise: upsells, feeds, notifications, no guidance

**12 opinions (8 medium). Freeletics 2.**

The app talks over the user instead of letting them train.

- **Upsells for people who already pay**: StrongLifts shows an uncloseable multi-page upgrade pop-up after every workout, even to lifetime owners. JEFIT users are "tired of constant upsell prompts" and just want a simple tracker. Apple Fitness+ promotions can't be hidden. Freeletics' pop-ups helped push a long-time user out.
- **Features nobody asked for**: Runna keeps adding extras like weather and a cluttered UI while promised essentials never arrive. Komoot's feed now shows generic local hikes to a cyclist instead of the people they follow.
- **All-or-nothing settings**: Hevy's social feed can't be turned off. Peloton's friend-activity notifications can't be disabled on their own, so the user turned off all notifications and lost reminders for scheduled classes.
- **No guidance at the start**: a new TrainHeroic subscriber found no help on using the app or picking a program; Freeletics' onboarding asked nothing about fitness level; Centr felt "confusing and pushy"; Samsung Health forced a Running Coach setup that then refused to run on the user's watch.

**Trening today:** no ads, no upsells, no feed, no notifications. Empty states explain the next step ("Brak wpisów. Zakończ pierwszy trening, a pojawi się tutaj.").

**What to do:** nothing to fix. Keep it this way, and if reminders are ever added, make each type switchable on its own. Check that every empty screen (no plans, no exercises, empty day) says what to do next, since there is no other onboarding.

*CSV lines: 24, 54, 102, 117, 136, 142, 180, 183, 261, 325, 335, 369.*

### U5. Hard to read: small fonts, weak contrast, poor accessibility

**11 opinions (6 medium, 5 low). TrainingPeaks 3, Les Mills+ 2.**

- **Small type and unclear icons**: after TrainingPeaks' 2025 redesign the weekly plan can't be read without zooming; graphs have confusing axes and dates cut off the screen edge.
- **Colour**: TrainingPeaks' new palette may be unreadable for red-green colour-blind users, uses similar colours for different metrics and has no week separators. A Suunto user misses dark mode.
- **Accessibility**: a blind runner finds Nike Run Club hard to use with iPhone accessibility tools. Gravl has overlapping text.
- **Pace of instruction**: demo videos and voice cues that are too fast or unclear (BetterMe, Madmuscles, Down Dog, Les Mills+), and camera work that hides the instructor's full body (Les Mills+).

**Trening today:** the theme follows the system (dark by default, light through `prefers-color-scheme`); there is no manual switch. Base font is 16 px with large runner numbers (rep counter 4.5 rem, timer 3.6 rem). Some labels are small (calendar weekday names .75 rem, small buttons .85 rem). There are 9 `aria-label`s and one `aria-live` region; the calendar is a grid of buttons whose meaning (has a workout, done) relies on colour.

**What to do:** a short accessibility pass: the runner's state ("rest 0:45", "set 2 of 4") should be announced through the existing `aria-live` region; done and planned days in the calendar should differ by more than colour (an icon or text); check contrast of `--muted` text in both themes. A manual light/dark switch is cheap if the user ever wants it.

*CSV lines: 40, 80, 109, 119, 147, 155, 162, 218, 262, 263, 276.*

---

## Part 2: Functionality and feature pain points

### F1. The workout doesn't survive real life

**14 opinions, 9 of them high. The most severe functional theme. Planners 6, cardio 4.**

What users describe is the app failing at what happens *around* a workout: the phone locks, they switch to music, the network drops, they press "finish".

- **Background and screen off**: Runna's audio prompts work only while the screen stays on, and support's bot answered "keep the screen on". MapMyRun stops tracking unless the app is in front (high). Runna's watch heart rate syncs only if both apps were opened together at the start.
- **Switching apps between sets**: Boostcamp reloads every time; Freeletics hangs on an endless loading screen and has to be reinstalled (high).
- **Saving at the end**: ABC Trainerize saves only after leaving and re-entering, then records 1 or 60 seconds and wipes the set history (high). TrainingPeaks in-app sessions often fail to save (high). Future stopped saving unscheduled workouts (high). A Garmin walk vanished after a failed sync at save time (high). MacroFactor couldn't save changes for a month (high).
- **Progress that doesn't stick**: Nike Training Club shows completed program workouts as not done the next day; a JEFIT watch log resets when the phone app opens (high); TeamBuildr deleted a whole training history (high).

**Trening today:** strong. The run is kept in `localStorage` after every change, so a reload or app switch doesn't lose it. Timers are computed from `Date.now()`, so the time is right when the tab comes back. Wake Lock keeps the screen on, and the rest timer beeps **and vibrates** when it ends. If the save fails, the run stays and the save can be retried.

**Remaining gaps:**
- The rest-timer beep and vibration only fire while the page is in front. With the screen locked or another app open, the user isn't alerted; they only see the right state when they come back. This is the Runna complaint, and it should be tested on a real phone. A browser page can't fully fix it; showing clearly "rest finished 0:20 ago" on return is a cheap mitigation.
- The client doesn't send a workout `id` with `POST api/workouts`. If the server saves the workout but the response is lost, a retry creates a duplicate. Generating the id when the run starts makes the retry safe (the server already accepts client ids).

*CSV lines: 22, 34, 58, 61, 140, 163, 202, 203, 210, 243, 247, 265, 293, 342.*

### F2. Your history: progress you can't see, exports that leave data out

**18 opinions (12 medium, 1 high). Strength 9, cardio 5.**

The log is only worth keeping if the user can get answers out of it, both in the app and outside it.

- **"What did I lift last time?"**: Future's exercise history loads so slowly that users "guess previous weights"; Hevy's watch app doesn't show previous sessions; Hevy has no suggested weight increase during a workout.
- **Records and trends**: Peloton's progress section is buried and doesn't show new personal records. Polar shows activity trends for only one month. Suunto has no weekly or monthly summaries. adidas Running removed long-term history views. Dropping Strava's subscription hides your own personal bests; JEFIT moved volume charts behind the paywall.
- **Numbers that mislead**: bodyweight squats add nothing to Hevy's total volume; Fitbit averages include the current partial day; Alpha Progression's estimated 1RM is often wrong; Boostcamp lists the same exercise under several names, which splits its progress.
- **Exports that leave data out**: Freeletics' export omits weight and pace; StrongLifts' holds only about 6 months; Strong's export garbles timed sets (90-minute planks); Fitbod has no Android export; Komoot has no bulk export.

**Trening today:** journal cards show duration, set count and volume per workout, plus counts for this month and in total. Exercise names are unique (Polish-aware), so progress isn't split by duplicates. There is a full JSON export. **There is no per-exercise history, no "last time" hint, no records and no charts.** Volume is `(weight ?? 0) × reps`, so **bodyweight sets count as 0**, the exact Hevy complaint.

**What to add (in order):**
1. A **"last time" line in the runner** for each exercise (for example "Ostatnio: 3 × 10 @ 60 kg, 12.10"). It uses data already in `db.log`.
2. A **per-exercise view**: all sets over time, best weight, best estimated 1RM (say which formula), best reps for bodyweight exercises.
3. **Bodyweight volume**: show reps separately or label the volume "bez ćwiczeń z masą ciała".
4. A **CSV export of the log** (date, plan, exercise, set, reps, weight) next to the JSON backup.

*CSV lines: 3, 27, 52, 69, 81, 123, 130, 178, 209, 284, 292, 302, 303, 319, 321, 334, 358, 361.*

### F3. Plans and calendar that can't bend

**16 opinions (14 medium). TrainingPeaks 3, Apple Fitness+ 2, Sweat 2, TrueCoach 2.**

Life moves workouts around, and users want the plan to follow.

- **Move a session**: TrainingPeaks puts moving a planned session behind Premium (two separate reports) and its drag and drop broke; TrueCoach can't move a missed workout to the day it was done.
- **Pause**: no way to pause a plan for illness or injury (Runna), or to mark a workout missed for that reason (Fitbod). BetterMe unlocks each day only after the previous one, so a missed day costs paid time.
- **Edit one part**: a mistake on one day of an Apple Fitness+ custom plan means rebuilding the whole plan; Boostcamp makes duplicating weeks and days slow.
- **Long-term structure**: Apple Fitness+ programs last only three weeks; Sweat's end after 6–12 weeks with nothing next; Nike Training Club can't build a program from chosen workout types and frequency; TrueCoach makes periodized blocks awkward; Athletica users want recurring weekly sessions on the calendar.
- **Honest durations**: Sweat lists 45 minutes for a session that takes about 80.

**Trening today:** add a plan or cardio template to a day, with an option to **repeat it weekly for up to 52 weeks**; start from the calendar; an entry is marked done through its `scheduleId`, so a workout done on another day still ticks the right entry. **There is no way to move an entry** (the API has only `POST` and `DELETE /api/schedule`), no duplicate plan, no pause and no estimated duration.

**What to add:**
1. **Move an entry to another day**: the most requested calendar action and gated by a competitor. A `PUT /api/schedule/:id` with a new date.
2. **Shift the rest of the week (or all future entries) by N days**: covers "pause for illness" without a new data model.
3. **Duplicate plan**: the cheapest way to make variants (week A / B, deload).
4. **Estimated duration** per plan from sets, reps and rest times.

*CSV lines: 56, 59, 98, 101, 107, 164, 189, 192, 205, 264, 269, 271, 278, 281, 291, 314.*

### F4. Logging is too rigid

**12 opinions (7 low). Strength 8. Hevy 2, Alpha Progression 2.**

- **After the fact**: Hevy has no year selector when back-filling old workouts; BetterMe can't add a session done without the phone or fix one the user forgot to log.
- **Fields that don't fit the training**: different weights for the left and right side after an injury (Future); weight steps matching the smallest plate (Hevy) or the gym's machines (Fitbod); units set independently of other apps (MacroFactor); cardio machines that only accept km, not time or floors (Alpha Progression).
- **Re-entering what the app should remember**: Freeletics makes users with adjustable dumbbells re-enter a weight for every exercise.
- **Library gaps**: missing machines and kettlebell exercises (Alpha Progression, JEFIT, Boostcamp); a custom exercise's body part can't be edited after creation (Strong).

**Trening today:** weight editable per set, kg only, decimal input, `NULL` weight = bodyweight. The library is user-built, unlimited and editable. **A finished workout can't be edited** (delete only) and **there is no way to add a workout by hand or back-date one**.

**What to add:**
1. **Edit a finished workout** (fix a weight or rep count, change the date).
2. **Add a workout manually** for a past date, starting from a plan.
3. A per-exercise **weight step** (for example 2.5 kg or 1 kg) for the ± buttons, if the runner gets them.

Left out on purpose: RIR/tempo fields and left/right weights. Each came up once, and both add input to every set.

*CSV lines: 106, 145, 211, 245, 286, 287, 289, 308, 318, 323, 344, 351.*

### F5. The session can't be changed on the fly

**8 opinions (6 medium). Strength 4, planners 3.** Related: JEFIT hiding "add an unplanned exercise" (U1) and TrainHeroic's "can't swap a workout" (U3).

The gym rarely matches the plan: a machine is taken, a shoulder hurts, time runs short.

- **Reorder**: TrainHeroic can't reorder exercises within a session; the only workaround is deleting and re-adding every movement.
- **Pick or swap**: JEFIT's update forces a fixed order and removed picking an exercise, "which fails when gym machines are taken". Exercise substitution is behind the paywall in Boostcamp and JEFIT. Seven can't swap in another workout after removing one from a plan day.
- **Changes that destroy entries**: replacing an exercise or changing a weight wipes the logged entries in Gravl, and wipes the notes in Strong. Strong's Android app can't duplicate an exercise.
- **Adding on the fly** is slow and confusing (MacroFactor).

**Trening today:** exercises run in plan order. The user can skip an exercise (with confirmation) but not go back to it, reorder, swap or add one. Logged sets aren't touched by later actions.

**What to add:** during a run, **"later"** (move the current exercise to the end of the queue, so it isn't lost like a skip) and **"swap"** (pick another library exercise for the remaining sets, keeping sets already done). Both only change the client-side `run`; the saved workout is already a snapshot with exercise names, so the API doesn't change.

*CSV lines: 187, 220, 246, 255, 288, 336, 339, 357.*

---

## Suggested backlog

Ordered by evidence × fit with Trening × effort. S = up to a day, M = a few days.

| # | Item | Pain point | Effort |
|---|---|---|---|
| 1 | "Last time" line for each exercise in the runner | F2 | S |
| 2 | Move a calendar entry to another day | F3 | S |
| 3 | Client-generated workout id, so a save retry can't duplicate | F1 | S |
| 4 | "Later" and "swap" for the current exercise during a run | F5 | M |
| 5 | Per-exercise history with best weight / estimated 1RM | F2 | M |
| 6 | Edit a finished workout; add a back-dated workout | F4 | M |
| 7 | Bodyweight volume fixed or labelled; CSV export of the log | F2 | S |
| 8 | Duplicate plan, estimated plan duration, search on the plan list | F3, U3 | S |
| 9 | Runner touch targets ≥ 44 px, nothing destructive near "Done set" | U2 | S |
| 10 | Accessibility pass: `aria-live` runner state, calendar not colour-only, contrast | U5 | S |
| 11 | Shift future entries by N days ("pause") | F3 | S |

Not on the list on purpose: AI suggestions, wearable sync and social features. Users complain about them a lot, but they are where competitors break most often (see [pain-points-top5.md](pain-points-top5.md)).

## Notes

- **Correction to [pain-points-functionality.md](pain-points-functionality.md):** its backlog lists "recurring scheduling" and "vibration on the rest timer" as missing. Both now exist: the calendar can repeat an entry weekly for up to 52 weeks, and the rest timer vibrates when it ends.
- The sources are complaint-biased, so this shows what goes wrong, not how common each problem is among all users.
- UX complaints are probably under-counted: an opinion that mentions a bad layout *and* a crash was tagged by its main complaint, usually the crash.
