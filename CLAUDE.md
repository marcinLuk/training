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

- `context/foundation/prd-v2.md` — **the current PRD**: the cardio module (interval sessions, lock mode), FR-016…FR-028 plus changes to FR-009, FR-011, FR-012. It is a delta on top of v1.
- `context/foundation/prd.md` — PRD v1, the strength MVP (FR-001…FR-015). Still valid wherever `prd-v2.md` does not change it. Read both.
- `PRODUCT.md` — users, purpose, principles and accessibility rules (in Polish).
- `DESIGN.md` — the approved visual system "Talerze": colors, type, layout, components, Do's and Don'ts (in Polish).
- `context/foundation/tech-stack.md` — stack choice and why.
- `context/foundation/shape-notes.md` — the discovery notes behind PRD v2 (cardio). The notes behind v1 are in git history.

The UI text is in **Polish**.

## Design rules — read DESIGN.md first

Every AI agent MUST read `DESIGN.md` (and `PRODUCT.md`) before it creates or changes any UI: components, styles, copy, icons, colors, fonts or layout. Do this even for a small change.

- Use only the tokens, type scale, spacing and component rules from `DESIGN.md`. Do not invent new colors, fonts or sizes.
- The design is approved. Do not redesign it. If a task needs something `DESIGN.md` does not cover, ask the user, then update `DESIGN.md` in the same change.
- Cardio is in scope from PRD v2, but `DESIGN.md` does not cover it yet (interval screen, lock mode, plan type mark). Ask the user and update `DESIGN.md` before you build cardio UI. The app has no calendar, history or weight field. Plate colors and the plate stack are reserved for later ("po MVP"). Do not use them now.
- Keep the key rules: one chalk primary action per screen, the biggest number is sets left (rest time during rest), touch targets 56 px (64 px for the main action), no emoji as icons, no gradients, no left color stripe on cards.
- The MVP is dark theme only ("guma"). Do not build the light theme or a theme switch.
- Fonts are served locally from `public/`, not from a CDN.
- When code and `DESIGN.md` disagree, tell the user. Do not change one silently.

## Browser rule

When you need to use a browser (open the app, click, check UI, take a screenshot, test a flow), ALWAYS use the Playwright CLI. Do not use the built-in browser pane tools (`mcp__Claude_Browser__*`) or Claude in Chrome for this project.

## Stack

Vite 8, Vue 3.5 with `<script setup>` single-file components, TypeScript ~6.0 (strict, from `@vue/tsconfig`), type-checked by `vue-tsc`. Tests: Vitest with Vue Test Utils and jsdom. Node 22 or newer. npm.

Code layout: `src/plans/` holds the plan model and device storage, `src/components/` holds the screens, and `src/styles/` holds the `DESIGN.md` tokens. Local fonts are in `public/fonts/`. Tests are `src/**/*.test.ts` files next to the code.

## Commands

```bash
npm install
npm run dev          # Vite dev server
npm run build        # vue-tsc -b (type check), then vite build into dist/
npm run preview      # serve the built dist/ locally
npm test             # Vitest, one run (vitest run)
npm run test:watch   # Vitest watch mode
node scripts/verify-dist.mjs dist       # check dist/ (manifest, icons, service worker precache); run after a build
bash scripts/smoke-image.sh             # build the Docker image and test it (needs Docker)
bash deploy/server/deploy.test.sh       # test deploy/server/deploy.sh against a stub docker
```

`npm run build` type-checks `src/` and the test files, and fails on type errors and on unused locals/parameters (`noUnusedLocals`, `noUnusedParameters`). `npm test` runs the unit and component tests. There is no linter or formatter yet.

Tests live next to the code as `src/**/*.test.ts`. Import `describe`, `it`, `expect` and `vi` from `vitest` (no globals). Vitest is configured in the `test` block of `vite.config.ts` (jsdom environment).

TypeScript config is split: `tsconfig.app.json` covers `src/` without test files, `tsconfig.test.json` covers `src/` with the `*.test.ts` files, `tsconfig.node.json` covers `vite.config.ts`. All set `erasableSyntaxOnly`, so do not use `enum`, `namespace` or constructor parameter properties.

## Product constraints (from the PRD)

These are requirements, not preferences. Check `context/foundation/prd-v2.md` and `context/foundation/prd.md` before you change any of them.

- **No server for user data.** Plans and workout state live only on the device. Do not add API calls, accounts or sync.
- **Offline after the first load.** The app shell must work with no network.
- **A workout survives interruptions.** After a screen lock, an app switch or a page reload, the user returns to the same set and the same rest state (FR-009). Persist the running workout, not only the plans.
- **Rest time comes from timestamps.** Compute the remaining rest from the stored start time and the current time. Never count timer ticks; a hidden tab stops ticking.
- **The screen stays on during a workout** (FR-012).
- **Target: Android phone, current Chrome.** Design for a phone first. iOS and desktop are not targets.
- **Out of scope:** workout history, statistics, calendar, exercise library, rep counting, voice guidance, vibration, Google Play. For cardio also: GPS, distance, heart rate, a guaranteed sound after a power-button lock, and a lock mode for the strength workout. See `## Non-Goals` in both PRDs.

## Deployment

The app ships as an installable, offline PWA (`vite-plugin-pwa`, `generateSW`) and as a Docker image. The image is nginx with `dist/` (`Dockerfile`, `deploy/nginx/`). It runs as a non-root user on port 8080. The address is `https://trening.marcinlukaszek.pl/`.

- `.github/workflows/deploy.yml` runs on a push to `main`: job `test`, then job `image` (smoke test, push to `ghcr.io/marcinluk/training:<sha>` and `:latest`), then job `deploy` (SSH, only when the repository variable `DEPLOY_ENABLED` is `true`).
- On the server, Traefik in Docker (`deploy/traefik/compose.yaml`) gives TLS from Let's Encrypt and applies htpasswd Basic auth. The app compose file is `deploy/compose.yaml`. The deploy key can run only `deploy/server/deploy.sh`, which takes a commit SHA.
- The users file, `.env` files, `acme.json` and the deploy key live only on the server or in GitHub secrets. The repository is public: never commit them.
- With Basic auth in front, the manifest link uses `crossorigin="use-credentials"` (`useCredentials: true` in `vite.config.ts`), or Chrome cannot install the PWA.
- Updates are silent. The app reloads for a new version only on the plan list with no workout (`src/pwa/`).
- `docs/deploy.md` is the step-by-step guide for the one-time server setup, the GitHub secrets, the first release, rollback and troubleshooting. No agent may contact the server.
