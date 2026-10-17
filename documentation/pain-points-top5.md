# Top 5 User Pain Points: Workout Apps

Analysis of `documentation/pain-points.csv` (369 opinions, 53 apps, published 2024-10-21 to 2026-10-17).
Prepared: 2026-10-17. Input for product decisions in **Trening**.

## Dataset at a glance

| Dimension | Breakdown |
|---|---|
| App types | general fitness 100 · cardio 91 · planner 91 · strength 87 |
| Severity | high 125 (34%) · medium 195 (53%) · low 49 (13%) |
| Sources | Google Play 101 · Trustpilot 77 · Reddit 59 · forums 56 · App Store 56 · other 20 |
| Most-mentioned apps | Fitbod 23 · Freeletics 19 · JEFIT 18 · Peloton 16 · TrainingPeaks 16 · Strong 14 · Strava 13 |

Category counts (one category per opinion):

| Category | Count | High severity |
|---|---:|---:|
| Monetization/Paywall | 88 | 52 |
| Bugs/Stability | 71 | 44 |
| UX/Usability | 42 | 1 |
| Personalization/AI | 39 | 2 |
| Integrations | 34 | 4 |
| Sync/Data Loss | 33 | 20 |
| Planning/Scheduling | 20 | 0 |
| Workout Logging | 15 | 0 |
| Stats/Progress | 11 | 0 |
| Privacy | 7 | 1 |
| Other / Performance/Battery / Ads | 9 | 1 |

**How the top 5 were chosen.** The categories were the starting point, but some of them mix different problems (Monetization holds both billing abuse and paywall creep) and some problems cut across categories (a lost workout can be tagged Sync, Integrations or Bugs). So the five pain points below are themes built by reading every summary. They are ranked by volume × severity × how often users say the problem made them leave. Theme counts marked "≈" come from reading and keyword-matching the summaries, so they are approximate. Category counts are exact.

---

## 1. Subscription billing traps

**≈46 opinions, 39 of them high severity. This is the most severe theme in the dataset.**

Users feel tricked by the subscription mechanics, not just by the price. The same patterns come up again and again:

- **Free trials that charge early or convert silently**: a "30 days free" trial billed a full year after two days (Strava); a trial code showing £0 due was charged £59 at once (Centr); trials renewed into an A$150 annual plan with no reminder (Fitbod).
- **Being charged after cancelling**: some users were still billed a year or more after cancelling (Centr, Freeletics, Peloton, Fitbod), and one had to file chargebacks every year.
- **No way to cancel**: there was no cancel option in the app (ABC Trainerize, Peloton, BetterMe), or the invoice email was "not found" when used to cancel (Runna).
- **Refunds refused**, often by automated or AI support replies, or bounced between the app, Apple/Google and PayPal.
- **Hidden extras**: undisclosed add-ons, small split charges, and a $59.99 price that was billed as $89.98 (BetterMe, Madmuscles, Gravl).

Most affected: Fitbod (8), BetterMe (5), Centr (4), Freeletics (4), Peloton (3), ABC Trainerize (3). This is concentrated in general-fitness and AI-coach apps.

**Why it matters:** this is where trust breaks for good. Users in this theme don't ask for a fix. They dispute charges, leave 1-star reviews and warn others away.

## 2. Paywall creep and revoked purchases

**≈41 opinions about gating and price, including ≈15 about "lifetime" or one-time purchases that no longer count.**

The second half of Monetization is about the deal changing after the user has signed up:

- **Lifetime licences revoked**: StrongLifts 5x5 alone has 11 opinions. Users who bought the Power Pack years ago now find that even basic logging needs a subscription of about $12/month. JEFIT's one-time Pro purchase "no longer exists." A user who paid about £100 for lifetime access can't restore it.
- **Free features moved behind the paywall**: Strava (personal bests, training log, searching your own routes), Alpha Progression, Fitbod (the free storage tier was removed), JEFIT (volume charts), Garmin Connect+ (software features on expensive watches).
- **Basic actions gated**: moving a planned session on the calendar needs Premium (TrainingPeaks, two separate reports); so do exercise substitution (Boostcamp, JEFIT), more than three workouts a week (Strong), and changing your step goal (Pacer).
- **Your own history held hostage**: you can't see old workouts without starting a trial (StrongLifts), and cancelling cuts off all past workouts (Future).
- **Upsell pop-ups for people who already pay**: an upgrade screen that can't be closed after every workout, even for lifetime owners.

**Why it matters:** strength-tracker users are the most affected group (33 of 88 Monetization opinions). They see a workout log as a simple tool that shouldn't need a rising monthly fee, and they leave as soon as they can export their data.

## 3. Updates that break the app: crashes, lockouts, regressions

**Bugs/Stability 71 (44 high) plus ≈20 UX opinions about redesigns. ≈45 opinions in total blame a specific update or redesign.**

The most damaging bugs are timed badly: they hit **during a workout** or **at login**.

- **Crashes mid-workout**: TrainHeroic crashed up to 5 times per session and cost about 10 minutes each time, which ruins timed work/rest intervals. Boostcamp reloads every time the user switches apps between sets. JuggernautAI went blank 8 times on day one. ABC Trainerize locks up mid-lift.
- **The app won't start after an update**: Nike Run Club 7.79.0, Peloton 15.119.0, Zwift's February 2026 update, Garmin Connect 5.28.1, Strong 6.0 (inputs went into the wrong boxes, so the workout had to be abandoned).
- **Login lockouts (≈16, 12 high)**: verification codes that never arrive or expire in five minutes (Strava), an endless spinner on the login screen before every gym visit (TeamBuildr), years of history "gone" behind a failed password reset (Strong).
- **UX regressions after redesigns**: JEFIT removed direct access to exercises and progress screens. Strava's new oversized pause button gets hit by accident and has cut off parts of rides. TrainingPeaks' 2025 redesign made the weekly plan unreadable without zooming.
- **Timers and cues failing**: audio cues stop unless the screen stays on (Runna, MapMyRun), the C25K timer stops halfway through, and NHS Couch to 5K timings run 20–60 seconds long.

Support is a frequent aggravating factor: ≈37 opinions (27 high) mention support that was absent, automated or unhelpful.

## 4. Workouts that don't arrive: sync, integrations and data lock-in

**Sync/Data Loss 33 (20 high) + Integrations 34 = 67 opinions. ≈27 describe workouts or history actually lost.**

Users record a workout and later find it missing, duplicated or corrupted.

- **Watch ↔ phone sync (≈27)**: Garmin only synced the newest activity after a trek. Strong, JEFIT and Ladder Watch apps get out of sync mid-workout, so sets have to be re-entered. A JEFIT watch app wrote a fake 70-hour workout into Apple Health.
- **Health platform links break silently**: Runkeeper vanished from Apple Health's data sources. Freeletics logs a 45-minute session as 400+ minutes. One run was counted three times through Google Fit and Fitbit. Suunto→Strava and Garmin→Nike Run Club links stopped without warning.
- **Workouts not saved**: in-app sessions fail to save (TrainingPeaks, Gravl, Future), finished workouts are logged as 60 seconds long (ABC Trainerize), an entire training history was deleted after an update (TeamBuildr), and multi-week program progress resets the next day (Nike Training Club).
- **Export and lock-in (≈9)**: Komoot has no bulk export. Fitbod has had no Android export for years. Freeletics' export leaves out weights and pace. StrongLifts' export holds only about six months of history. Strong's export garbles timed sets (a 90-minute plank).

Cardio apps are the most exposed (25 of 67), because their value depends on devices. Strength apps are affected through Apple Watch logging.

**Why it matters:** losing a workout is permanent. The effort can't be redone, and a gap in the log undermines every chart and PR built on top of it.

## 5. Plans that don't fit the person: generic AI and rigid scheduling

**Personalization/AI 39 + Planning/Scheduling 20 + ≈6 UX opinions about plan editing ≈ 65 opinions, almost all medium severity.**

This theme rarely makes users angry, but it slowly erodes engagement. Users say "it got boring" or "it's not built for me," and then they leave.

- **AI that ignores the user's constraints**: plans that include equipment the user doesn't own (JEFIT, Gravl, MacroFactor). Weight suggestions that don't exist on the gym's machines, or that can't be capped at your heaviest dumbbell (Fitbod). A 120 lb face pull recommended after the real weight was entered (Gravl). Injuries ignored: Future kept prescribing workouts that worsened a back injury at $199/month, and Runna's return-from-injury plan never asks about the injury.
- **Generic, repetitive programming**: the same muscle groups on consecutive days (Freeletics, JuggernautAI). The barbell journey hasn't changed in 3 years. Generated programs leave out squats and deadlifts. Experienced lifters get beginner-style suggestions.
- **Bad onboarding calibration**: novices thrown into hard HIIT on day one (Freeletics), and "7-minute" sessions that grow past 10 minutes.
- **Rigid plans**: you can't edit one day of a custom plan, so the whole plan has to be rebuilt (Apple Fitness+). Missed sessions can't be moved to the day they were done (TrueCoach). There's no "pause for illness or injury" (Runna, Fitbod). You can't reorder exercises when equipment is busy (TrainHeroic, JEFIT). Regenerating Hevy's AI plan throws away the week's progress. Programs end after 6–12 weeks with nothing to follow (Sweat, Apple Fitness+).

---

## Secondary pain points (below the top 5)

- **Workout Logging (15)**: awkward set entry. Examples: no separate left/right weights, replacing an exercise wipes its entries or notes, custom exercises can't be edited, weights can't step by the smallest plate increment, and no RIR/tempo fields.
- **Stats/Progress (11)**: misleading averages (the current partial day is counted), bodyweight exercises ignored in volume, slow history loading ("I have to guess my last weight"), and duplicate exercise names that split progress tracking.
- **Privacy (7)**: JEFIT data breach (2 opinions), forced consent to new terms (Polar), accounts that can't be deleted without an active subscription (Fitbod).

## What this means for Trening

Trening is self-hosted, single-user, free and keeps its data in local SQLite, so it avoids themes 1 and 2 by design. The opportunities and risks are in themes 3–5:

| Pain point | Trening today | Suggested focus |
|---|---|---|
| 1. Billing traps | No billing | State "no subscription, no account" clearly wherever the app is presented. |
| 2. Paywall creep / revoked purchases | Everything is free and local | Same. Your history can never be held hostage. |
| 3. Mid-workout breakage | The runner is client-only and persisted in `localStorage`, so a reload doesn't lose the session; Wake Lock keeps the screen on | Keep the runner resilient: test reloads, app switches and a locked screen mid-workout (rest-timer beeps and cues are the exact failure users report). Avoid redesigns that move core screens. |
| 4. Sync and data loss | JSON export/import; the log is a denormalized snapshot that survives renames and deletions | Make backups more visible (a reminder or one-click export). A CSV export of the log would answer the "export omits weights/pace" complaint. Health/watch integrations are where competitors fail most, so take them on only if they can be reliable. |
| 5. Rigid / generic plans | Manual plans plus a calendar | Cheap wins that competitors gate or lack: move or reschedule a session freely, edit a single plan day, reorder or swap exercises mid-workout, and a way to pause a plan. Avoid "AI" suggestions that ignore the user's own equipment and weights. |

## Caveats

- The sources are complaint-biased: the research targeted pain points, so this shows *what goes wrong*, not how common it is among all users.
- One opinion = one category. Opinions with several complaints are counted only under the main one, so secondary issues (for example support quality) are under-counted in the category table.
- Theme counts (≈) are approximate and come from manual reading plus keyword matching of the summaries.
