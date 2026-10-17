# Pain-Points Research Brief: Workout Apps

Hand-off document for starting the research in a fresh Claude Code session.
Created: 2026-10-17. Status: **all scope decisions made, Exa connected and tested, research not started yet.**

## 1. Goal

Collect real user pain points about workout / training apps from public opinions on the web, tag each with one category, and save them as one CSV file. The results will inform product decisions for **Trening**, our own single-user workout planner (calendar, plans, exercise library, rest timer / rep counter, workout log, and a cardio module in progress).

## 2. How to start the new session

1. Open a new Claude Code session in `/home/marci/www/Trening`.
2. Run `ToolSearch` for `exa` and confirm the Exa tools are loaded (`web_search_exa`, `web_fetch_exa`).
3. Read this file, then start the research. **Do not re-ask the decisions in section 4.** Anything not covered here must be asked to the user before deciding (explicit user request: "don't decide for me; if unsure, ask").

## 3. Tooling: Exa

- **Search must be done with Exa**, through subagents. Do not fall back to the built-in WebSearch without asking the user.
- Exa is configured twice: as a claude.ai connector ("Exa") and as a local MCP server `exa` (`https://mcp.exa.ai/mcp?exaApiKey=…`). Both report `✔ Connected` in `claude mcp list`. Never print the API key.
- Tools exposed by the server (Exa v3.5.0):
  - `web_search_exa`: web search; returns title, URL, published date, author, highlights.
  - `web_fetch_exa`: fetch the content of a page.
  - `agent_run`: Exa research agent (not used so far).
- **Test result (2026-10-17):** the server works and the API key is valid. One search cost about **$0.007**.
- **Lesson from the test:** the query `Hevy app complaints reddit` returned one relevant result (a T-Nation forum thread about Hevy) and two unrelated MacRumors threads from 2020. So:
  - write specific queries (app name + concrete problem words such as "lost my data", "paywall", "sync", "crash", "subscription", "wish it had"; add the source name, e.g. `site:reddit.com`, when useful),
  - drop off-topic results,
  - check the published date and drop anything older than 2 years,
  - use `web_fetch_exa` to read the full thread or review page when the highlights are not enough.

## 4. Decisions made by the user

| Topic | Decision |
|---|---|
| App types | All four: **strength trackers / gym logs**, **workout planners / calendars**, **cardio (running, cycling)**, **general fitness / home workouts** |
| Sources | **Reddit**, **app store reviews** (Google Play / App Store, including review aggregators), **forums and blogs**, **Trustpilot / G2 and similar** |
| Language | **English sources only** |
| Time range | **Last 2 years**: opinions published on or after **2024-10-17** |
| Volume | **About 200–300 opinions** |
| Opinion text | **Short summary in English**, paraphrased in our own words. Never copy reviews verbatim (copyright). |
| Categories | **Fixed list** (section 5), **English names**, **exactly one category per opinion** |
| Output file | `documentation/pain-points.csv` |
| CSV format | **Comma-separated, UTF-8** |

Example apps (illustrative only; this list was not fixed by the user):
- strength: Strong, Hevy, JEFIT, Fitbod, Boostcamp
- cardio: Strava, Runkeeper, Nike Run Club
- general fitness: Nike Training Club, Freeletics, 7 Minute Workout

## 5. Category list (fixed)

Each opinion gets exactly one of these 14 categories. Pick the category of the **main** complaint.

| Category | Use for |
|---|---|
| UX/Usability | Confusing navigation, too many taps, poor layout, hard to find features |
| Monetization/Paywall | Basic features locked behind a subscription, price, aggressive upsells, billing problems |
| Ads | Intrusive or too frequent ads |
| Bugs/Stability | Crashes, freezes, broken features after updates |
| Sync/Data Loss | Lost workouts or history, sync between devices failing, export/import problems |
| Workout Logging | Logging sets, reps, weights or exercises during a workout is slow, limited or awkward |
| Planning/Scheduling | Creating plans or programs, calendar, scheduling, rest days |
| Stats/Progress | Charts, personal records, progress tracking, missing or misleading statistics |
| Integrations | Apple Health, Google Fit / Health Connect, Garmin, smartwatches, other apps |
| Offline | App does not work, or works poorly, without internet |
| Privacy | Data collection, sharing, account requirements, tracking |
| Personalization/AI | Poor recommendations, generic plans, AI coach quality, no customization |
| Performance/Battery | Slow app, lag, battery drain, GPS drain |
| Other | Anything that does not fit above |

The one-line definitions in the "Use for" column are proposed descriptions written to help tagging; the category names themselves are the user's decision.

## 6. CSV schema

The user chose these columns. The header names and value formats below are **proposals; confirm them with the user before writing the file.**

| Column (proposed header) | Content | Proposed format |
|---|---|---|
| `summary` | Short English paraphrase of the pain point | 1–2 sentences |
| `category` | One category from section 5 | exact name from the list |
| `app_name` | App the opinion is about | e.g. `Hevy` |
| `app_type` | App type | `strength` / `planner` / `cardio` / `general_fitness` |
| `severity` | Our assessment of impact | `low` / `medium` / `high` (e.g. data loss = high) |
| `review_date` | Date the opinion was published | ISO `YYYY-MM-DD`; empty if unknown |
| `source_type` | Where the opinion comes from | `reddit` / `app_store` / `google_play` / `forum` / `blog` / `trustpilot` / `g2` / `other` |
| `source_url` | Link to the source, if available | full URL; empty if unavailable |

Standard CSV quoting: wrap fields that contain commas, quotes or newlines in double quotes, and escape inner quotes as `""`.

## 7. Open questions to ask the user before or while running

These were **not** decided. Ask; do not assume.

1. Confirm the CSV header names and value formats in section 6.
2. Severity rules: confirm the low / medium / high meaning (proposal: high = data loss, unusable app or money lost; medium = a core feature is hard to use or missing; low = annoyance or cosmetic).
3. Opinions with an unknown date: include them (with an empty `review_date`) or drop them, since the 2-year limit cannot be checked?
4. Duplicates: when many users report the same problem in the same app, keep each opinion as its own row, or merge them into one row?
5. Balance: target a split across the four app types and the sources (for example roughly equal), or take whatever volume the search gives?
6. Subagent split: proposal of one subagent per app type (4 in parallel), each covering all sources with a target of about 60–75 opinions, followed by a merge, deduplication and validation step in the main session. Confirm, or choose another split (for example per source).
7. Budget: at about $0.007 per search, plus fetches, the full run is expected to cost a few dollars in Exa usage. Is there a cost limit?
8. Is it acceptable that a review page has no stable per-review URL (common for app stores), so `source_url` points to the app's store page?

## 8. Proposed workflow (to confirm)

1. Ask the open questions in section 7.
2. Launch subagents in parallel. Each one gets: this brief, its scope (app type or source), the category list, the CSV schema, the 2-year date rule, the "paraphrase, don't copy" rule and a target count. Each one returns rows as structured data (not prose).
3. Merge in the main session: validate categories against the fixed list, check dates, remove duplicates and off-topic rows, and normalize app names.
4. Write `documentation/pain-points.csv` (comma, UTF-8).
5. Report to the user: row count, breakdown by category / app type / source, and anything that was dropped or uncertain.

## 9. Related

- Project memory: `pain-points-research-spec` (same decisions, short form).
- Project overview: `CLAUDE.md` in the repo root.
