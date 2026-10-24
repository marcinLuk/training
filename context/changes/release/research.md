---
date: 2026-10-24T12:26:29+02:00
researcher: Claude (Opus 5.5) for Marcin Łukaszek
git_commit: bd2a0d0d0d86eb15a0fe4876b5af6b7a8f10fddf
branch: main
repository: marcinLuk/training
topic: "Czy nasza aplikacja jest gotowa do wypuszczenia jako PWA?"
tags: [research, codebase, pwa, service-worker, manifest, deploy, nginx, basic-auth, storage, release]
status: complete
last_updated: 2026-10-24
last_updated_by: Claude (Opus 5.5)
last_updated_note: "Added follow-ups: test release, Basic auth outside git, and the answers to the 6 open decisions"
---

# Research: Is the app ready to release as a PWA?

**Date**: 2026-10-24T12:26:29+02:00
**Researcher**: Claude (Opus 5.5) for Marcin Łukaszek
**Git Commit**: bd2a0d0 (local `main`, 12 commits ahead of `origin/main`, so this document uses local paths, not GitHub permalinks)
**Branch**: main
**Repository**: marcinLuk/training (public on GitHub)

## Research Question

"Czy nasza aplikacja jest gotowa do wypuszczenia jako PWA?" (Is our app ready to release as a PWA?)

Agreed scope: the full release. This covers the PWA parts (manifest, service worker, icons, offline), the deploy (Docker, GitHub Actions, HTTPS, Basic auth), and the release blockers from the PRD. It also includes a check of current web docs.

## Summary

**No. The app is not ready to release as a PWA yet.** The workout features are ready, but the app cannot install, cannot work offline, and has no place to run on the phone.

The state has three layers:

1. **Features: ready in code.** All MVP functional requirements (FR-001…FR-015, without the removed FR-013) are in the code and have tests. `npm test` passes (18 files, 415 tests). `npm run build` passes, and `dist/` is 344 KB.
2. **PWA parts: all missing.** There is no web app manifest, no service worker, no PNG icons, and no update flow. The good news: `vite-plugin-pwa@2.0.0` supports Vite 8. The app has no external network calls, so the offline precache list is small (about 0.33 MB).
3. **Deploy: all missing.** There is no Dockerfile, no nginx config, no `.github/workflows/`, no GitHub secrets, and no chosen domain. **HTTPS is a hard blocker.** Without a secure context, `crypto.randomUUID()` throws, so the user cannot create a plan (`src/plans/plan.ts:33,37`). The Wake Lock and the service worker also need HTTPS.

Also, **nobody has run the app on an Android phone yet.** Both end-to-end walkthroughs are not done. The PRD lists Open Question 2 (protection against data loss) as "needed before release", and it is only partly answered.

The release needs these pieces, in this order:

1. The deploy with HTTPS (roadmap F-01).
2. The installable, offline shell (roadmap F-02).
3. A few small fixes.
4. The check on the real phone.

The author must make several decisions first. See [Decisions for the author](#decisions-for-the-author).

## Detailed Findings

### 1. Features against the PRD

All functional requirements are done in code and covered by tests.

| Req | Status | Evidence |
|---|---|---|
| FR-001, FR-002, FR-003 plans: create, edit, delete | done | `src/components/PlanEditor.vue`, `src/plans/plan.ts:15-19`, `src/plans/planStore.ts:132`, `src/components/PlanDeleteConfirm.vue`; tests in `PlanEditor.test.ts`, `EditDelete.test.ts` |
| FR-011 plans only on the device | done (the protection is partial, see section 5) | `localStorage` key `trening.plans.v1` (`src/plans/planStore.ts:4`) |
| FR-004, FR-005 start a plan; show exercise, reps, sets left, next | done | `src/components/PlanList.vue:36-43`, `src/components/WorkoutSet.vue:22-31`, `src/workout/engine.ts:129-172` |
| FR-006 one tap per set | done | `src/workout/useWorkout.ts:184-190`, 500 ms double-tap guard at `:30` |
| FR-007, FR-008 rest timer, sound, return to the set | done in code, not checked on a phone | `src/workout/engine.ts:198-206`, `src/workout/useWorkout.ts:147-161`, `src/workout/sound.ts` |
| FR-009 resume after lock, switch or reload; 2 h expiry | done in code, not checked on a phone | `IDLE_EXPIRY_MS` at `src/workout/engine.ts:14`, `src/workout/useWorkout.ts:44-52,277-285` |
| FR-010 end screen | done | `src/components/WorkoutEnd.vue` |
| FR-012 screen stays on | done in code, needs HTTPS | `src/workout/wakeLock.ts`, re-request on `visibilitychange` at `src/workout/useWorkout.ts:277-285` |
| FR-014 skip or undo | done | `src/workout/engine.ts:214,230` |
| FR-015 rest ±15 s | done (minor: the ring refills) | `src/workout/engine.ts:248-256` |
| NFR offline after the first start | **missing** | no manifest, no service worker |
| NFR Android + current Chrome | **not checked** | all walkthroughs ran in desktop Chromium at 412×915 |
| NFR return in under 3 s | done on desktop | 717 ms in desktop Chromium (goal review), not measured on a phone |

### 2. PWA parts in the code

**Boot and routing**
- `index.html` has `lang="pl"`, a viewport meta and `theme-color #121314` (`index.html:2,6,7`). It has no manifest link.
- `src/main.ts:1-7` mounts the app. It registers no service worker.
- **There is no router.** `src/App.vue:13-15` keeps the screen in a `ref`. The app always lives at `/`. So the service worker needs only one navigation fallback (`index.html`), and nginx needs no SPA rewrite.
- `vite.config.ts` has no `base`. Font URLs are absolute (`/fonts/...`). **The app must be served at the root of a domain or subdomain.** A subpath needs extra work.

**Network dependencies: none**
- `src/` has no `fetch`, no XHR and no external URL.
- The fonts are local. `src/styles/fonts.css` has 10 `@font-face` rules for `/fonts/*.woff2`.
- The sound is made with the Web Audio API (oscillator), not loaded from a file (`src/workout/sound.ts:16-26,44-68`).
- The precache list is: `index.html`, `assets/index-*.js` (94.9 kB), `assets/index-*.css` (11.0 kB), `favicon.svg`, 10 woff2 fonts (about 188 kB), and later the manifest and the icons.
- **The default Workbox `globPatterns` (`**/*.{js,css,html}`) does not include the fonts.** The config must add `woff2`, `svg`, `png` and `webmanifest`.

**Icons**
- Only `public/favicon.svg` exists (64×64, a barbell on `#121314`).
- The drawing fits in the maskable safe zone, so the same drawing can make a maskable icon.
- Chrome needs PNG 192 and PNG 512 (`purpose: any`). We also want a separate 512 maskable PNG. web.dev says not to use `"any maskable"` in one entry.
- **DESIGN.md says nothing about the app icon, the manifest or the splash screen.** By the project rule, the author must approve this, and DESIGN.md gets a new section in the same change.

**Colors for the manifest**
- `#121314` ("Guma", `--ground` in `src/styles/tokens.css:3`, `DESIGN.md:5,160`) for both `background_color` and `theme_color`. This matches the current `theme-color` meta.

**Standalone layout**
- There is no `env(safe-area-inset-*)` and no `viewport-fit=cover`. In `display: standalone`, Chrome on Android keeps content out of the notch, so this is acceptable.
- `body` uses `100vh` (`src/styles/base.css:23`). `.workout` uses `100dvh` (`base.css:207`).
- These are not set: `overscroll-behavior`, `-webkit-tap-highlight-color`, `user-select`.
- **The app does not handle the Android back gesture.** There is no `history.pushState` and no `popstate` in `src/`. In standalone mode, back on any screen closes the app. The workout survives because it is stored. But unsaved changes in the plan editor are lost with no warning, and back cannot close a confirm dialog.

### 3. Storage and data safety

- The app uses only `localStorage`. It has two keys:
  - `trening.plans.v1` (`src/plans/planStore.ts:4`)
  - `trening.workout.v1` (`src/workout/workoutStore.ts:13`)
- Every storage call is in try/catch (`src/lib/storage.ts:7-31`). Unreadable data is copied to a `*.corrupt.<ts>` key (`storage.ts:37-39`). Nothing removes these keys.
- **`navigator.storage.persist()` is called**, but with limits (`src/plans/planStore.ts:98-113`, called at `:152`):
  - It runs only after the first successful plan save in each page load.
  - The code ignores the result and never calls `persisted()`.
  - Chrome grants persistence automatically to **installed** web apps. Before install, it usually refuses. Chrome does not remember a refusal, so the app can ask again.
  - Persistence protects the whole origin: localStorage, the service worker cache and the SW registration.
  - Recommendation: also call `persist()` at start in standalone mode (`matchMedia('(display-mode: standalone)')`) and on the `appinstalled` event.
- **Schema versions use an exact match and have no migration** (`planStore.ts:72`, `workoutStore.ts:98`). This matters as soon as a service worker exists, because an old cached app can then meet newer data:
  - An old app that reads `version: 2` plans shows an empty list. On the next save it moves the v2 data aside and writes only the new plan.
  - An old app that reads a v2 workout removes the live key (`workoutStore.ts:157-170`).
  - Today all data is v1, so this is not a blocker for the first release. Before any schema v2, add a migrate step and a rule "never write when the stored version is higher".

### 4. Wake Lock and sound

- The Wake Lock works the same in standalone mode and in a tab. It needs HTTPS and a visible page. It does not need a user gesture.
- The browser always drops the lock when the page is hidden. The code already asks again on `visibilitychange` (`src/workout/useWorkout.ts:277-285`).
- The AudioContext is unlocked only on Start and on "Gotowe" (`src/workout/useWorkout.ts:177,185`). After a reload or a restore in the middle of a rest, no tap has happened yet, so the end-of-rest beep can be silent.
  - Chrome's autoplay rules are looser for apps added to the home screen. Do not depend on it.
  - Recommendation: resume the context on every workout tap and on `visibilitychange` to visible, then check `ctx.state`.

### 5. Deploy and hosting

Nothing of the deploy exists. Here is what exists and what is missing:

- **GitHub:** `origin` is `https://github.com/marcinLuk/training.git`. The repo is **public**. It has no secrets and no variables (`gh secret list` and `gh variable list` are empty). There is no `.github/`.
  - Because the repo is public, never commit htpasswd files, private host names or SSH data.
- **Missing files:**
  - `Dockerfile` (for example, `nginx:alpine` with `dist/`)
  - `.dockerignore`
  - a compose file
  - an nginx config
  - a workflow in `.github/workflows/`
- **nginx rules for a PWA** (from the vite-pwa docs and the nginx source):
  - `Cache-Control: no-cache` for `/`, `index.html`, `sw.js` and `manifest.webmanifest`.
  - `max-age=31536000, immutable` for `/assets/*` and `/workbox-*.js`.
  - **The default nginx `mime.types` has no `webmanifest` entry.** Add `types { application/manifest+json webmanifest; }`.
  - `Service-Worker-Allowed` is not needed, because `sw.js` is at `/` with scope `/`.
  - An `add_header` in a `location` block cancels the `server`-level `add_header` lines.
- **The VPS:** the domain points to the author's VPS, and the server is hardened (key-only SSH, ufw). The repo does not say these things:
  - the domain or subdomain for the app
  - whether a reverse proxy already runs on the VPS, and which one terminates TLS
  - how GitHub Actions can reach the server (a deploy user, a key, ufw rules)

  The old prototype was served under a reverse-proxy subpath (`context/archive/2026-10-17-feat-cardio-module/e2e-walkthrough.md:59`), so a proxy probably exists.
- **Delivery options:**
  - a GHCR image plus SSH `docker compose pull`
  - build on the VPS
  - rsync of `dist/` (no Docker)

  CLAUDE.md plans Docker. The choice of option is open.

### 6. Basic auth against the PWA

CLAUDE.md and `tech-stack.md` plan htpasswd Basic auth in front of the app "for now". The research found these problems:

- **Manifest:** Chrome fetches it without credentials. Fix: `crossorigin="use-credentials"`. In vite-plugin-pwa this is `useCredentials: true`. This is already decided (`CLAUDE.md:94`).
- **Icons:** Chrome sends the icon bytes to the WebAPK server itself, so Basic auth does not block the WebAPK build. But a real case (norish issue #445, 2026) installed only as a shortcut while the manifest was behind a login. After install, check `chrome://webapks` on the phone.
- **Precache and `sw.js`:** Workbox fetches with `credentials: 'same-origin'`, so the cached Basic credentials go with the request.
- **Offline start:** this works. `navigateFallback` serves `index.html` from the cache, and no request reaches the server.
- **The main risk: updates stop without any message.** Chrome keeps Basic credentials only in memory, and Android often stops the browser process. After that, the `sw.js` update check gets 401 and shows no login dialog. The old version stays. The app opens and works, but never updates, until the user opens the URL in a normal Chrome tab and logs in again.
- **What Basic auth protects:** no user data is on the server, and the code is already public on GitHub. So Basic auth hides only a copy of public code. It also makes updates unreliable.
- **Alternatives:**
  - No auth, plus `X-Robots-Tag: noindex, nofollow` and a `robots.txt` that disallows everything. This is the simplest option and the most reliable one.
  - Keep Basic auth and document "open the URL in Chrome to log in, then the app updates". We could also add an in-app "Sprawdź aktualizację" action.

  Cloudflare Access has the same update problem.

### 7. Library versions (checked 2026-10-24)

- `vite-plugin-pwa@2.0.0` (2026-10-03). Its peer dependency includes `vite ^8.0.0` (support since 1.3.0). It needs Node >= 20.19.
- `workbox-build` and `workbox-window` are 7.4.1.
- `@vite-pwa/assets-generator@2.0.0` is optional. It can make the PNG icons from `favicon.svg`.
- The installed `vite` is 8.3.4. The latest is 8.3.5.
- Recommended config:
  - `generateSW`
  - `registerType: 'prompt'`
  - `injectRegister: false` (register from code with `virtual:pwa-register/vue`)
  - `useCredentials: true` (only if Basic auth stays)
  - `workbox.globPatterns` with `js,css,html,woff2,png,svg,webmanifest`
  - `navigateFallback: 'index.html'`
  - `cleanupOutdatedCaches: true`
  - Add `vite-plugin-pwa/vue` to `types` in `tsconfig.app.json`.
- **Do not use `autoUpdate`.** It reloads the page by itself, and that can happen in the middle of a workout. With `prompt`, show the "new version" message only on the plan list. This message is new UI, so DESIGN.md needs it first.

### 8. Chrome install rules (Android, 2026)

- Required:
  - HTTPS
  - a manifest with `name` or `short_name`, `start_url`, `display` (`standalone`), and icons 192 and 512
  - `prefer_related_applications` absent or false
- Since Chrome 108, install from the menu does not need a service worker. But the automatic install prompt and a real WebAPK still need a SW with a `fetch` handler. Workbox gives one, and we need it for offline anyway.
- Chrome checks engagement before it shows the prompt: at least one tap and 30 seconds on the page.
- Recommended manifest: `id: "/"`, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, `lang: "pl"`, `name` and `short_name` "Trening", and both colors `#121314`.

## Code References

- `index.html:2,6,7` — lang, viewport, theme-color; no manifest link
- `src/main.ts:1-7` — app boot; no SW registration
- `src/App.vue:13-15` — screen state in a `ref`, no router, no history handling
- `src/styles/fonts.css` — 10 local woff2 `@font-face` rules
- `src/styles/tokens.css:3` — `--ground #121314`
- `src/styles/base.css:23,207` — `100vh` vs `100dvh`
- `src/workout/sound.ts:16-26,44-68` — beeps made with Web Audio
- `src/workout/useWorkout.ts:177,185` — `unlockAudio()` only on Start and Gotowe
- `src/workout/useWorkout.ts:277-285` — Wake Lock re-request on `visibilitychange`
- `src/workout/engine.ts:14` — `IDLE_EXPIRY_MS` = 2 h
- `src/workout/wakeLock.ts:12,24-38` — Wake Lock feature check and request
- `src/plans/plan.ts:33,37` — `crypto.randomUUID()`, needs a secure context
- `src/plans/planStore.ts:4,72` — storage key and exact version check
- `src/plans/planStore.ts:98-113,152` — `persist()` once per page load after the first save
- `src/workout/workoutStore.ts:13,98,157-170` — workout key, version check, removal of an unreadable workout
- `src/lib/storage.ts:7-39` — safe localStorage wrapper and corrupt-data copy
- `src/components/WorkoutSet.vue:23,26` — plural errors "serii zostało", "powtórzeń"
- `src/components/NumberStepper.vue:39,43` — Unicode "−" and "+" instead of SVG icons
- `vite.config.ts` — no `base`, no PWA plugin
- `CLAUDE.md:92-94` — the deploy plan and the `use-credentials` rule

## Architecture Insights

- **The app is a good fit for a PWA.** It has no server, no router and no external calls, and it uses local fonts and generated sound. The offline shell is one precache plus one navigation fallback.
- **The workout state already survives a reload.** The rest time comes from timestamps, and every change is saved. So a page reload from a service worker update cannot break a workout. It is only a bad moment. This is why `prompt` is better than `autoUpdate`.
- **Installing the app is part of the data-safety answer.** Chrome grants persistent storage to installed apps. A planned install step helps PRD Open Question 2.
- **Basic auth and offline PWAs work against each other.** The app works offline, but updates silently stop when the credentials are gone. The decision about auth changes the manifest config, the nginx config and the update UX, so make it before planning.
- **The root path is a real constraint.** Absolute font URLs and no Vite `base` mean the app needs its own domain or subdomain. A future TWA (Google Play) also needs the root, for `/.well-known/assetlinks.json`.

## Historical Context (from prior changes)

- `context/changes/google-store-app/change.md:14` — 2026-10-17 decision: ship as a PWA, not through Google Play. This is still valid. Its open question about where data lives is settled: the data is on the device. Its research was written for the deleted Express prototype. The parts about `server.js`, `APP_PASSWORD` and `/api/health` are stale.
- `context/changes/google-store-app/research.md:489-501,524,533` — still valid notes: manifest scope and icons, HTTPS for the SW and the Wake Lock, the Basic auth prompt every browser session, `assetlinks.json` outside auth for a later TWA, and `adb reverse` for a localhost secure context.
- `context/changes/feat-mvp-plans-workout-loop/change.md:18-21` — F-01 and F-02 were out of scope. The idle time is 2 h. `persist()` at the first save was chosen as "not a backup". Status: `impl_reviewed`. The goal review result is CONCERNS (no blocker). The e2e walkthrough is not run (21 steps open). The owner checks D10a (sound in headphones), D10b (screen stays on) and D10c (real lock and app switch) are not run.
- `context/changes/feat-mvp-plans-workout-loop/reviews/goal-review.md:29` — `crypto.randomUUID()` and the Wake Lock need a secure context, so without HTTPS the user cannot create a plan on the phone.
- `context/changes/quality-of-life/` — status `impl_reviewed`, CONCERNS (no blocker). The walkthrough is not run (11 steps open).
- `context/foundation/roadmap.md:32-33,67-91` — F-01 `phone-deploy-skeleton` (ready) and F-02 `offline-installable-shell` (proposed). Both are still to do. The roadmap is stale in other places:
  - F-03 and S-01…S-06 shipped, but their status is still ready or proposed.
  - The "Done" section is empty.
  - Line 77 says "ships the demo page first".
  - The file is untracked in git.
- `context/foundation/design-critique-2026-10-18.md` — these items are still in the code: the plural errors, the full-weight "Pomiń serię" button above "Gotowe", the silent beep after a restore, and the draft loss on back. Its 4 open decisions have no answer.

## Related Research

- `context/changes/google-store-app/research.md` — distribution options (PWA, TWA, Capacitor and others). It is partly stale.
- `context/changes/feat-mvp-plans-workout-loop/research.md` — MVP workout loop research.
- `context/changes/quality-of-life/research.md` — plan editor improvements.

## Release checklist (proposed order)

**A. Blockers. Without them, there is no release.**
1. Deploy with HTTPS at the root of a domain or subdomain: Dockerfile, nginx config (cache headers, `webmanifest` MIME type), GitHub Actions workflow, deploy user and secrets (roadmap F-01).
2. Installable, offline shell: `vite-plugin-pwa` with `generateSW` and `registerType: 'prompt'`, a manifest, PNG icons 192/512 and maskable 512, precache of the fonts, and a "new version" message only on the plan list (roadmap F-02). This needs a DESIGN.md update for the icon and the update message.
3. Check the app on the real phone after the install:
   - the 21-step MVP walkthrough
   - D10a: the beep in headphones
   - D10b: the screen stays on
   - D10c: a real lock and an app switch
   - `chrome://webapks` shows the app
   - offline start
   - `persisted()` is true
4. Close PRD Open Question 2. Either accept "install + `persist()`" as the answer and record it in the PRD, or add a minimal backup.

**B. Small fixes, should be done before release**
1. Call `persist()` at start in standalone mode and on `appinstalled`, and read `persisted()`.
2. Resume the AudioContext on every workout tap and on `visibilitychange` (the silent beep after a restore).
3. Polish plurals on the set view (`WorkoutSet.vue:23,26`, plus `DESIGN.md:247`).
4. Standalone polish:
   - `overscroll-behavior-y: none`
   - `-webkit-tap-highlight-color: transparent`
   - `user-select: none` on the workout screens
   - `100dvh` on `body`
5. Android back gesture: at least for the plan editor and the confirm dialogs (`history.pushState` + `popstate`).
6. SVG icons instead of the Unicode "−" and "+" in `NumberStepper.vue:39,43` (DESIGN.md rule).
7. Docs: update the roadmap statuses, PRD Open Questions 1 and 2, and the idle value in `PRODUCT.md:27`. Run both walkthroughs and archive both changes.

**C. Can wait until after the release**
- A migrate step for schema v2, and an old app that never writes over newer data. This is needed before the first schema change, not before the first release.
- Cleanup of the `*.corrupt.*` keys.
- A bigger rest time, the ring that refills after ±15 s, dialog focus and `inert`, long-name overflow, and two tabs writing the same key.

## Decisions for the author

1. **Domain or subdomain** for the app (root path, not a subpath).
2. **VPS proxy and TLS:** does a reverse proxy already run (nginx, Caddy, Traefik)? Who gets the certificates?
3. **Basic auth:** keep it (updates stop when Chrome forgets the password), or drop it and use `noindex` (recommended in the research, but CLAUDE.md and `tech-stack.md` plan it "for now")? If you change it, update CLAUDE.md and `tech-stack.md` in the same change.
4. **Delivery:** a GHCR image, a build on the VPS, or rsync of `dist/`. Also: how GitHub Actions reaches the hardened server (a deploy user and key, ufw).
5. **App icon and splash:** approve the barbell from `favicon.svg` as the app icon, and add an icon section to DESIGN.md.
6. **Update message:** where and how the "new version" message looks (new UI, needs DESIGN.md).
7. **PRD Open Question 2:** is "install + `persist()`" enough, or do you want a backup (for example, a JSON export)?
8. **Scope of this change:** one `release` change for F-01 + F-02 + the small fixes, or separate changes (`phone-deploy-skeleton`, `offline-installable-shell`) as the roadmap plans.

## Open Questions

- Does Chrome on Android 2026 show the Basic auth dialog for requests under service worker control? A Chromium fix from Oct 2024 suggests yes. Only a test on the phone can confirm it.
- Does the installed app become a real WebAPK behind Basic auth, or only a shortcut? Check `chrome://webapks` after install.
- Is the AudioContext `"interrupted"` state (Chrome 136) fully shipped? It can make `resume()` fail after an interruption. Check on the phone.
- Can GitHub-hosted runners reach the VPS over SSH through ufw, or do we need a pull-based deploy?

## Follow-up Research 2026-10-24 (author's notes)

The author added two facts after the first version of this document:

1. **Basic auth stays outside git.** The author sets up htpasswd Basic auth directly on the server, over SSH.
2. **This release is for testing only, not production.** Small bugs are OK.

### What changes

**Basic auth (decision 3 is closed)**
- Basic auth stays. The repo holds no htpasswd file, no password and no `auth_basic` lines.
- The nginx config in the repo (in the Docker image) serves the app with no auth. The author adds auth on the server. The simplest place is the reverse proxy in front of the container. The plan must not depend on where the author puts it.
- The app side still needs `crossorigin="use-credentials"` on the manifest link (`useCredentials: true` in vite-plugin-pwa). Without it, Chrome gets a 401 for the manifest, and the app does not install.
- The "updates stop without a message" risk (section 6) is accepted for a test release. The workaround: open the app URL in a normal Chrome tab, log in, then open the installed app again. Write this step in the walkthrough.
- If the author puts the auth in front of `/.well-known/acme-challenge/`, the certificate renewal can fail. This is a server topic, not a repo topic.

**Test release: the new blocker list**

Blockers (the release cannot happen without them):
1. Deploy with HTTPS at the root of a domain or subdomain: Dockerfile, nginx config with cache headers and the `webmanifest` MIME type, GitHub Actions workflow, deploy access and secrets. This is roadmap F-01.
2. Installable, offline shell: vite-plugin-pwa (`generateSW`, `registerType: 'prompt'`, `useCredentials: true`), a manifest, PNG icons 192, 512 and maskable 512, and precache of the fonts. This is roadmap F-02. It still needs a DESIGN.md note for the app icon (project rule).

Not blockers any more (moved to "after the test"):
- All items in "B. Small fixes" (`persist()` at start, the AudioContext resume, the plurals, standalone CSS polish, the back gesture, the stepper icons, doc updates).
- PRD Open Question 2 (data loss). Test data on the phone can be lost.

The phone checks (the 21-step walkthrough, D10a, D10b, D10c, `chrome://webapks`, offline start) are not a gate before the release any more. They are **the purpose** of the test release. Run them on the phone after the deploy.

**The update message (decision 6) can be simpler.** With `registerType: 'prompt'`, the app needs some UI to apply a new version. For a test release, a minimal option is enough. Example: apply the update by itself only when the plan list is on screen and no workout runs. Any visible text is new UI, so it still needs a DESIGN.md note.

### Decisions still open

1. Domain or subdomain for the app (root path).
2. The reverse proxy and TLS on the VPS.
3. Delivery: a GHCR image, a build on the VPS, or rsync of `dist/`. Also how GitHub Actions reaches the hardened server (deploy user, key, ufw).
4. The app icon: approve the barbell from `favicon.svg`.
5. The update behaviour: a silent update on the plan list, or a short message.
6. Scope: one `release` change for F-01 + F-02, or two changes as the roadmap plans.

## Follow-up Research 2026-10-24 (answers to the open decisions)

The author answered all 6 open decisions:

| # | Decision | Answer |
|---|---|---|
| 1 | Address | `trening.marcinlukaszek.pl`, at the root of the subdomain. The author adds an A record `trening` → the VPS at cyberfolks DNS. |
| 2 | Proxy and TLS | Traefik in Docker. It gets the Let's Encrypt certificate and applies Basic auth. |
| 3 | Delivery | A GHCR image + SSH. CI builds an nginx image with `dist/`, pushes it to GHCR (public), then runs `docker compose pull` + `up -d` over SSH as a deploy user. |
| 4 | App icon | The barbell from `favicon.svg`. PNG 192, 512 and maskable 512. DESIGN.md gets a short app icon section. |
| 5 | Updates | Silent. The new SW installs in the background. The app reloads only when the plan list is on screen and no workout runs. No new UI text. |
| 6 | Scope | One change, `release`. F-01 and F-02 are phases of one plan. |

### What the answers mean for the plan

**Server state today** (from the author's notes, not checked on the server in this research):
- Ubuntu Server 24.04, hardened: SSH with keys only, `ufw` allows 22, 80 and 443.
- Docker is not installed yet.
- `marcinlukaszek.pl` and `www` point to the VPS. There is no `trening` record yet.

**Traefik and Basic auth**
- Traefik uses the `basicauth` middleware with a `usersFile` on the server. The htpasswd file never goes into git. This matches the decision "Basic auth outside git".
- The plan must decide which Traefik and compose files are in the repo and which live only on the server. Example: the repo holds the app compose file with Traefik labels, and the server holds the Traefik static config, the `acme.json` certificate store and the users file. A public repo must not hold the server paths or the user names that the author wants to keep private.
- Let's Encrypt with the HTTP-01 challenge needs port 80 open (it is) and the `trening` DNS record in place before the first start.
- Docker publishes ports past `ufw`. Only Traefik should publish 80 and 443. The app container must not publish a port.

**GHCR + SSH deploy**
- The repo is public, so a public GHCR image needs no pull token on the server.
- CI needs these secrets: the SSH host, the deploy user, a private key and the `known_hosts` line. The repo has no secrets today.
- A user in the `docker` group has root-like rights. The plan should limit the deploy user, for example with a forced command in `authorized_keys` that only runs the deploy script.
- The server work (Docker install, deploy user, DNS record, users file) is done by the author over SSH. The plan should list these steps as manual steps for the author, not as repo files.

**PWA shell**
- The scope is `/`, at the root of the subdomain, so Vite `base` stays `/`. The absolute font URLs work.
- vite-plugin-pwa: `registerType: 'prompt'` with a custom register (`injectRegister: false`), so the app decides when to reload. When a new SW is waiting, the app calls `updateServiceWorker(true)` only if the plan list is on screen and no workout runs.
- `useCredentials: true`, because of Basic auth.
- The icons come from `public/favicon.svg`. `@vite-pwa/assets-generator` can make them, or they can be exported once and committed.
