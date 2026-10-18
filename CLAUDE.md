# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Communication Style — Simplified English (ASD-STE100 inspired)

The user is not a native English speaker. Write ALL conversational replies (chat text, summaries, explanations —
not code, code comments, or commit messages) in Simplified English, adapted from the ASD-STE100 standard:

- Use simple, common words. Avoid rare, formal, or "fancy" vocabulary. Prefer "use" over "utilize", "start" over
  "initiate", "show" over "demonstrate".
- One idea per sentence. Avoid compound or subordinate clauses joined with "which", "although", "whereas".
- Short sentences: aim for under ~20 words each.
- Use active voice ("I edited the file", not "the file was edited").
- Do not stack more than 2-3 nouns together (say "the basket item field", not "the basket item field contract
  schema").
- For 3+ steps or items, use a numbered or bulleted list instead of a dense paragraph.
- Keep the normal response structure and length rules from the System instructions (short, direct, no headers for
  simple answers) — this section only changes word choice and sentence complexity, not how much you say.
- Write every document you create under `context/` (`change.md`, `research.md`, `plan.md`, review files, ADRs,
  lessons) and under `docs/` in ASD-STE100. Code, code comments, commit messages and test specs stay in normal English.

## Project

"Trening" is a single-user workout app for a phone. The user builds plans (exercises with sets, reps and rest time), then runs a workout: the app shows the current exercise, sets left and the next exercise, the user taps once per finished set, a rest timer runs, and a sound marks the end of the rest. The goal is to stop the user from losing their place and skipping a set after a break.

It ships as an installable PWA. There is no backend: all data stays on the device.

The app was rebuilt from scratch in October 2026. The old Express + SQLite prototype is gone; do not look for it or follow its patterns.

Source of truth for scope and decisions:

- `context/foundation/prd.md` — requirements (FR-001…FR-015), non-goals, open questions.
- `PRODUCT.md` — users, purpose, principles and accessibility rules (in Polish).
- `DESIGN.md` — the approved visual system "Talerze": colors, type, layout, components, Do's and Don'ts (in Polish).
- `context/foundation/tech-stack.md` — stack choice and why.
- `context/foundation/shape-notes.md` — the discovery notes behind the PRD.

The UI text is in **Polish**.

## Design rules — read DESIGN.md first

Every AI agent MUST read `DESIGN.md` (and `PRODUCT.md`) before it creates or changes any UI: components, styles, copy, icons, colors, fonts or layout. Do this even for a small change.

- Use only the tokens, type scale, spacing and component rules from `DESIGN.md`. Do not invent new colors, fonts or sizes.
- The design is approved. Do not redesign it. If a task needs something `DESIGN.md` does not cover, ask the user, then update `DESIGN.md` in the same change.
- The MVP has no cardio, calendar, history or weight field. Plate colors and the plate stack are reserved for later ("po MVP"). Do not use them now.
- Keep the key rules: one chalk primary action per screen, the biggest number is sets left (rest time during rest), touch targets 56 px (64 px for the main action), no emoji as icons, no gradients, no left color stripe on cards.
- The MVP is dark theme only ("guma"). Do not build the light theme or a theme switch.
- Fonts are served locally from `public/`, not from a CDN.
- When code and `DESIGN.md` disagree, tell the user. Do not change one silently.

## Stack

Vite 8, Vue 3.5 with `<script setup>` single-file components, TypeScript ~6.0 (strict, from `@vue/tsconfig`), type-checked by `vue-tsc`. Node 22 or newer. npm.

The repo is a fresh `create-vite` `vue-ts` scaffold. `src/components/HelloWorld.vue`, `src/assets/*` and the demo content in `src/App.vue` are template leftovers; replace them as features land.

## Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # vue-tsc -b (type check), then vite build into dist/
npm run preview      # serve the built dist/ locally
```

`npm run build` is the only check today: it fails on type errors and on unused locals/parameters (`noUnusedLocals`, `noUnusedParameters` in `tsconfig.app.json`). There is no test runner, linter or formatter yet.

TypeScript config is split: `tsconfig.app.json` covers `src/`, `tsconfig.node.json` covers `vite.config.ts`. Both set `erasableSyntaxOnly`, so do not use `enum`, `namespace` or constructor parameter properties.

## Product constraints (from the PRD)

These are requirements, not preferences. Check `context/foundation/prd.md` before you change any of them.

- **No server for user data.** Plans and workout state live only on the device. Do not add API calls, accounts or sync.
- **Offline after the first load.** The app shell must work with no network.
- **A workout survives interruptions.** After a screen lock, an app switch or a page reload, the user returns to the same set and the same rest state (FR-009). Persist the running workout, not only the plans.
- **Rest time comes from timestamps.** Compute the remaining rest from the stored start time and the current time. Never count timer ticks; a hidden tab stops ticking.
- **The screen stays on during a workout** (FR-012).
- **Target: Android phone, current Chrome.** Design for a phone first. iOS and desktop are not targets.
- **Out of scope for the MVP:** workout history, statistics, calendar, exercise library, cardio, rep counting, voice guidance, vibration, Google Play. See `## Non-Goals` in the PRD.

## Deployment (planned, not set up yet)

Static files from `dist/`, served by Docker on the author's private server, deployed by GitHub Actions on merge to `main`, behind htpasswd Basic auth. With Basic auth in front, the manifest link must use `crossorigin="use-credentials"`, or Chrome cannot install the PWA. No PWA manifest, service worker, Dockerfile or CI workflow exists yet.
