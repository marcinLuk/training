# Phase review — release · Phase 2: Register the service worker and apply updates safely · round 1

- **Scope:** `src/pwa/updatePolicy.ts`, `src/pwa/updatePolicy.test.ts`, `src/pwa/useServiceWorkerUpdates.ts`, `src/pwa/useServiceWorkerUpdates.test.ts`, `src/App.vue`, `src/components/App.test.ts`, `tsconfig.app.json` · **Files reviewed:** 7 (`+419/-2`)
- **Contract:** `context/changes/release/brief.md` → `### Phase 2` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover none (3 experiments run by the coordinator)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 2.1 | update policy tests (D3) | `npx vitest run src/pwa` | pass — `Test Files  2 passed (2)` · `Tests  19 passed (19)`, no skip line |
| 2.2 | App with mocked registration (D3) | `npx vitest run src/components/App.test.ts` | pass — `Test Files  1 passed (1)` · `Tests  8 passed (8)`, no skip line |
| 2.3 | build and dist checks (D1, D2) | `npm run build && node scripts/verify-dist.mjs dist` | pass — `vue-tsc -b && vite build` exit 0, `PWA v2.0.0 mode generateSW precache 23 entries`, `verify-dist: all 15 checks passed` |
| 2.4 | full suite (D8) | `npm test` | pass — `Test Files  20 passed (20)` · `Tests  439 passed (439)`; baseline 0 failing (18 files, 415 tests) → 0 failing now, no skip line |

### Manual (walked by the walker with playwright-cli 0.1.14; spot-checked: 2.5)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 2.5 | at 412×915 on `vite preview` (4199): SW controls the page after load + reload; offline reload shows the plan list in Barlow; plan „Wiosłowanie” saved offline; workout started offline (D2) | passed | `reviews/screenshots/p2-r1-2.5-offline-list.png`, `p2-r1-2.5-offline-saved.png`, `p2-r1-2.5-offline-workout.png`. Online after reload: `navigator.serviceWorker.controller !== null` = true. After `network-state-set offline`: `navigator.onLine` = false; `fetch('/?nocache=<ts>',{cache:'no-store'})` = "TypeError: Failed to fetch"; `fetch('/')` = 200 (SW cache). Offline reload: controller true, heading "Plany". Fonts: `document.fonts.check('800 16px "Barlow Condensed"')` = true, `500 16px "Barlow Semi Condensed"` = true, h1 font-family `"Barlow Condensed", "Arial Narrow", sans-serif` (the 400-weight check is false because only 700/800 faces exist). Saved: list shows "Wiosłowanie", "1 ćwiczenie, 3 serie". Workout: heading "Wiosło sztangą", "3" "serii zostało", button "Gotowe". Console: 0 errors. |

Spot-check: I opened all three screenshots. They show the empty "PLANY" list in Barlow Condensed, the saved card "WIOSŁOWANIE · 1 ćwiczenie, 3 serie", and the set screen "WIOSŁO SZTANGĄ · 3 serii zostało · Gotowe" at 412 px width → confirmed. `injectRegister: false` in `vite.config.ts` and no register script in `dist/index.html`, so the controlling worker comes from the app's own registration code.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | mutant in a scratch copy: remove `\|\| registration === undefined` from `checkForUpdate` (`useServiceWorkerUpdates.ts:49`), run `vitest run src/pwa/useServiceWorkerUpdates.test.ts` | coordinator | exit 1 · `Tests  14 passed (14)` · `Errors  1 error` · `The last test to run before this error was "does nothing when there is no registration"` | The guard is pinned only by Vitest's unhandled-error catch. The test itself stays green: its `not.toThrow()` cannot fail, because `dispatchEvent` does not rethrow listener errors. |
| E2 | wrong-implementation table for `shouldApplyUpdate` against the 5 inputs of `updatePolicy.test.ts` | coordinator | drop updateWaiting → case 2 · drop planListShown → 3 · drop workoutRunning → 4 · drop alreadyApplied → 5 · `planListShown \|\| !workoutRunning` → 3,4 · `updateWaiting` only → 3,4,5 · always false → 1 | Every wrong implementation diverges on at least one test case. The pure function is fully pinned. |
| E3 | probe test in a scratch copy: start a workout, unmount, move the clock past `IDLE_EXPIRY_MS`, mount (expired notice shows), signal an update, then mount again as the reload | coordinator | `Tests  1 passed (1)` with these assertions green: notice "Trening wygasł po 2 godzinach bez dotknięcia." present before and at the apply; `updateServiceWorker` called 1 time; after the fresh mount the notice is absent and h1 is "Plany" | The update reload runs while the expired notice is on screen, and the reload removes the notice. See `update-reload-drops-expired-notice`. |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | `UpdateState`, `ScreenState`, `shouldApplyUpdate` and `useServiceWorkerUpdates` have docblocks; the catch blocks say why. |
| D2 | All documentation types covered? | pass | No docs or user text in this phase scope; CLAUDE.md deploy text is D7 (later phase). |
| D3 | Documentation understandable? | pass | No wrong names or paths in the docblocks. |
| I1 | Satisfies the requirements? | pass | Register at start, apply with `updateServiceWorker(true)` only on the plan list with no workout, wait otherwise, at most once, `registration.update()` on visible, no UI text, type reference in `tsconfig.app.json`; App tests drive the real App. |
| I2 | Logically correct? | concerns | Correct for the contract; one lost UI state at reload (Minor). |
| I3 | No unnecessary complexity? | pass | One pure function plus one composable, as the brief asks. |
| I4 | Robust? | pass | Registration error, apply error (re-armed) and update-check error are caught and logged; missing registration is guarded. |
| I5 | Performant? | pass | One listener, one `watchEffect`; no loops or network calls in loops. |
| I6 | Secure? | pass | No input, no secrets, no network calls beyond the SW update check. |
| I7 | Observable? | pass | `console.warn` with the error on each failure path. |
| I8 | New dependencies? | n/a | `package.json` and `package-lock.json` unchanged against HEAD in this phase. |
| ARCH | Project rules | pass | See the lines below. |

Architecture — project rules:

- Slice guardrail "do not change `src/workout/` or `src/plans/`" — meets: `git diff HEAD --stat -- src/workout src/plans` is empty.
- Out of scope "any visible UI text for the update" — meets: the `App.vue` template is unchanged; the composable has no UI strings.
- Offline after the first load (CLAUDE.md, D2) — meets: walk 2.5 offline evidence.
- FR-009 stored shape unchanged — meets: no change in `src/workout/`.
- Never-weaken list — meets: no `@ts-*`, `as any`, `as unknown as`, `.skip`/`.only`/`.todo` in the changed files; no existing assertion removed in `App.test.ts` (diff is +110/-1, the -1 is the vitest import line).
- `erasableSyntaxOnly` — meets: interfaces and functions only.
- Public-repo rule — meets: no secrets or server data in the diff.
- DESIGN.md — n/a: no UI change.

Blockers: 0 · Major: 0 · Minor: 3 · Nit: 0
Findings going back to a builder: none.

## Findings

### I2. Logically correct?

- **[Minor]** `update-reload-drops-expired-notice` — `src/pwa/useServiceWorkerUpdates.ts:32` with `src/App.vue:21-24` — the update applies on the plan list while the "workout expired" notice shows. The notice lives only in memory (`expired` ref; `restoreWorkout` already cleared the stored workout), so the reload removes it. The docblock at `src/pwa/updatePolicy.ts:14` says the update applies "only when nothing is lost". The same applies to a delete error text on the list. **Fails when:** the user leaves a workout for more than 2 h; on return, `visibilitychange` both expires the workout (notice shows) and calls `registration.update()`; a new version was deployed meanwhile → it installs, `needRefresh` turns true, the page reloads, and the user never sees why the workout is gone (proved by E3). The brief's literal rule (plan list + no workout) is met, so this is not a Blocker. confidence: medium on severity.

### Test adequacy

- **[Minor]** `vacuous-no-registration-assertion` — `src/pwa/useServiceWorkerUpdates.test.ts:179` — `expect(() => becomeVisible()).not.toThrow()` cannot fail. `dispatchEvent` reports listener errors and does not rethrow them. **Fails when:** the `registration === undefined` guard is removed (E1): the test reports passed (`Tests  14 passed (14)`); only Vitest's unhandled-error report (`Errors  1 error`) turns the run red. The guard is pinned at run level, but the assertion does not pin it.
- **[Minor]** `hook-test-unproduced-screen-state` — `src/pwa/useServiceWorkerUpdates.test.ts:97-109` — the test "waits during a workout…" uses `planListShown: false` with `workoutRunning: true`. `App.vue` never produces this state: `view` stays `plan-list` while a workout runs (`src/App.vue:16,39-42`). **Fails when:** a reader takes this test as proof of the in-workout wait; it is not. The real state (`planListShown: true`, `workoutRunning: true`) is pinned by the end-screen test at lines 121-129 and by the App tests, so the clause itself is covered.

## Not reviewed

- The real update path in a browser (a second build with a new worker → `needRefresh` → `SKIP_WAITING` → reload on `controlling`) was not walked; phase 2.5 does not ask for it. I read `node_modules/vite-plugin-pwa/dist/client/build/register.js`: in prompt mode the reload comes from the `controlling` listener after `messageSkipWaiting()`, and the `reloadPage` argument is ignored. The unit tests mock the virtual module.
- PWA install, the end-of-rest sound and Wake Lock: not observable by the driver and not part of 2.5.

## Observations outside scope

- `CLAUDE.md` "Deployment" still says no PWA manifest or service worker exists. Phase 1 made that wrong; D7 (a later phase) owns the fix.
- In prompt mode the `controlling` listener reloads every open window of the app when any window applies the update. With one standalone window on a phone this does not happen in normal use.
