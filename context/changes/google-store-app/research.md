---
date: 2026-10-17T15:55:10+02:00
researcher: Claude (Opus 5.5) for Marcin Łukaszek
git_commit: 2867e536fa0cbd2e7489a33db867b127097ededa
branch: main
repository: marcinLuk/training
topic: "Shipping Trening to Google Play: technology options, local run/debug, and testing"
tags: [research, codebase, android, google-play, pwa, twa, capacitor, expo, flutter, kotlin, testing, wsl2]
status: complete
last_updated: 2026-10-17
last_updated_by: Claude (Opus 5.5)
last_updated_note: "Added follow-ups: open vs closed testing; paid tester services; PWA option deep-dive"
---

# Research: Shipping Trening to Google Play

**Date**: 2026-10-17T15:55:10+02:00
**Researcher**: Claude (Opus 5.5) for Marcin Łukaszek
**Git Commit**: 2867e536fa0cbd2e7489a33db867b127097ededa (local `main`, 3 commits ahead of `origin/main`, so the references below are local paths rather than GitHub permalinks)
**Branch**: main
**Repository**: marcinLuk/training (public)

## Research Question

> Assume we want to rewrite our app for the Google (Play) app store. How can we run it locally? Is there software for this? What technology can we use (compare a couple of options)? How can we test it (unit, feature, e2e)?

Scope agreed with the user:
- **Data architecture.** Compare both:
  - **(A)** keep the Node/Express + SQLite API hosted remotely;
  - **(B)** move the data on-device into SQLite on the phone, with no server.
- **Technology.** Compare everything, from wrapping the existing web app (PWA/TWA, Capacitor) to full rewrites (React Native/Expo, Flutter, Kotlin/Compose).

## Summary

1. **Recommended technology: Capacitor 8 with on-device SQLite (architecture B).**
   - **About 90% of the code is reusable.** That covers `public/app.js`, `styles.css`, `cardio-core.js` and the validation/migration logic from `db.js`.
   - **No hosting, no auth problem, and it works offline.**
   - **Native plugins exist** for keep-awake, haptics, local notifications and file share.
   - **iOS is possible later.**
   - **Main cost:** `db.js` uses the synchronous `node:sqlite`, while the Capacitor SQLite plugin is async. Rather than rewriting the UI, put a *local adapter* behind the existing `api()` wrapper (`public/app.js:64-76`). It would expose the same REST-shaped surface on top of the ported repo.
   - **Fastest path instead:** a PWA + Trusted Web Activity (Bubblewrap) on a hosted HTTPS server. That means architecture A only. It also gives the weakest result: no reliable screen-off timer, storage tied to Chrome, and no iOS.
   - **Rewrites take the most effort:** Expo (L), Flutter (L–XL) and Kotlin/Compose (XL). They are only worth it if a native UI is the goal in itself.
2. **The real technical risk is the same for every option: a rest timer that beeps with the screen off or the app backgrounded.**
   - Today the timers are in-page `setInterval(…, 250)` (`public/app.js:564`, `:847`) driving Web Audio and vibration. They stop when the app is hidden.
   - Every option needs either a scheduled local notification at `restEnd` or a foreground service, and both carry Play policy declarations.
   - **Good news:** time is already computed from timestamps (`run.restEnd`, `CardioCore.activeMs(session, now)`), so the display stays correct after the app resumes. The alert itself is the only thing that goes missing.
3. **Running it locally.**
   - **Install on Windows, not in WSL2:**
     - **Android Studio** (Rabbit 1, 2026.2.1);
     - the **Android SDK**;
     - the **emulator**, using the WHPX hypervisor.
   - **Keep in WSL:** the repo and the Node tooling.
   - **Connect the two:** bridge `adb` from WSL to the Windows adb server. Mirrored networking in WSL makes this easier.
   - **Reach the backend:** from the emulator or phone with `adb reverse tcp:3000 tcp:3000`.
   - **Extras:** a physical phone plus scrcpy is the low-RAM alternative, and `chrome://inspect` debugs WebViews and TWAs.
4. **Testing.**
   - **The repo already has tests**, though CLAUDE.md says otherwise: 5 `node:test` files, 85 tests passing per the last review.
   - **Unit and integration:**
     - keep `node:test` for the domain logic and repo;
     - run migration tests against whichever on-device DB is chosen;
     - add DOM tests for `app.js` (`node:vm` as today, or Vitest browser mode).
   - **E2E:**
     - **Playwright** for the web layer, which the cardio module's reviews already used;
     - **Maestro** for 3–6 flows on the emulator. It works with every option: WebView, RN, Flutter and native.
   - **CI:** GitHub Actions with `reactivecircus/android-emulator-runner`. It is free because the repo is public.
5. **Google Play gate, the same for every option:**
   - a US$25 account fee;
   - for a new personal account, a closed test with **12 testers for 14 continuous days** before production;
   - **target API 36**;
   - AAB format plus Play App Signing;
   - a privacy policy, both in the app and in Play Console;
   - the Data safety form;
   - the Health apps declaration ("Activity and Fitness").

## Detailed Findings

### 1. The current app, viewed as a mobile app

**Size and shape**

| File | Lines |
|---|---|
| `public/app.js` | 1307 |
| `public/cardio-core.js` | 193 |
| `public/index.html` | 36 |
| `public/styles.css` | 240 |
| `db.js` | 494 |
| `server.js` | 95 |

- Two classic scripts load with no bundler (`public/index.html:33-34`).
- `render()` swaps `#view.innerHTML` (`public/app.js:147-153`).
- There is a delegated `actions` map (`public/app.js:939-1171`) and listeners at `:1174`, `:1191`, `:1279` and `:1298`.

**Browser APIs that behave differently on a phone**

| API | Where | Mobile risk |
|---|---|---|
| `setInterval(tick, 250)` / `setInterval(cardioTick, 250)` | `public/app.js:564`, `:847` | No ticks in the background, so no rest-end or interval beep or vibration until the user returns. Reviews flagged this as never verified (`reviews/phase-3-round-1.md:217`, `phase-3-round-2.md:225`). |
| Web Audio (`unlockAudio`, `beep`) | `public/app.js:490-508` | Audio is suspended in the background. A known minor issue: it is silent after a reload until the next click (`reviews/phase-3-round-2.md:182`). |
| Wake Lock | `public/app.js:512-536`, re-acquired on `visibilitychange` at `:566-571` | Foreground only. Support in Android WebView is unclear, so a native keep-awake plugin is safer. |
| `navigator.vibrate?.()` | `public/app.js:549`, `:832`, `:841`, `:1120` | Needs the `VIBRATE` permission in a native wrapper. In the background it is dead for the same reason as the timer. |
| `localStorage` (`trening.run.v1`, `trening.cardio.v1`, `trening.autoNext`) | `public/app.js:3-6`, `:45-62` | Per origin: a TWA domain or Capacitor's `https://localhost` starts empty. In a TWA it is shared with Chrome and wiped when the user clears Chrome data. |
| Export via `<a href="api/export" download>` | `public/app.js:383`, `server.js:69-72` | Needs the Filesystem/Share plugins (Capacitor) or a `DownloadListener` (raw WebView). |
| Import via `<input type="file">` | `public/app.js:385`, `:407-414`, `:1018` | Works in Chrome/TWA and Capacitor. A raw WebView needs `onShowFileChooser`. |
| `confirm()` (about 15 calls) | e.g. `public/app.js:411`, `:426`, `:974`, `:1083` | Works in Capacitor/TWA. It was a problem for Playwright automation, where reviews stubbed it (`reviews/phase-3-round-2.md:45`). |
| `viewport-fit=cover` with no `env(safe-area-inset-*)` | `public/index.html:5`, `public/styles.css:134-136`, `:211-212` | Content can slide under system bars on Android 15+ edge-to-edge. The full-screen runner overlays and the toast are affected. |
| Fixed `theme-color` `#111418` | `public/index.html:6` | Does not follow the light theme (`styles.css:192-198`). |

**PWA readiness: none.**
- There is no manifest, service worker or PNG icon set. The favicon is an inline SVG emoji (`public/index.html:8`).
- The server dataset is not cached on the client. If the server is unreachable at boot, the app shows only an error toast (`public/app.js:1304-1307`).

**Server coupling.**
- Every read and write goes through `api()` (`public/app.js:64-76`).
- It talks to about 20 endpoints (`server.js:18-78`).
- All URLs are relative (`api/state`), which CLAUDE.md treats as an invariant for reverse-proxy subpaths.
- There is no CORS.
- Basic auth (`server.js:11`, `:24-33`) relies on the browser's native prompt:
  - **TWA:** works, but the prompt comes back every browser session and there is no logout.
  - **Capacitor (bundled), RN, Flutter and Kotlin:** requests are cross-origin. The CORS preflight `OPTIONS` hits the auth middleware and gets a 401. The client would have to send `Authorization` itself, and the password would need secure storage.
  - **Consequence:** architecture A needs real auth work (tokens plus CORS), not just a wrapper.

**Domain logic and how it ports**

| Part | Where | Ports how |
|---|---|---|
| Sanitizers (`text`, `int`, `weight`, `date`, `timestamp`) | `db.js:138-154` | Pure JS, ports to any JS runtime. |
| `nameKey` (`toLocaleLowerCase('pl')`) | `db.js:156` | Pure JS. Hermes (Expo) needs Intl data for `pl`. |
| Error classes | `db.js:134-135` | Pure JS. |
| Migration SQL in `MIGRATIONS` | `db.js:10-132` | Plain SQLite DDL; runs on any SQLite. |
| `cardio-core.js` | `public/cardio-core.js:4-7`, `:185-192` | Pure and UMD; already shared between the browser, `db.js:7` and the tests. |
| `id()` | `db.js:149` | Uses `node:crypto` `randomUUID`; needs `crypto.randomUUID` or a polyfill. |
| `require('node:sqlite').DatabaseSync` | `db.js:3` | Node-only. |
| `createRepo` | `db.js:158-492` | A closure over **synchronous** `prepare().get/all/run`, `tx()` (`:163-173`), the `PRAGMA user_version` migration runner (`:177-181`), seeding (`:469-482`) and `replaceAll` (`:443-466`). With an async plugin, `tx()` and every caller become async. |

### 2. Technology options compared

Versions are current as of 2026-10-17:

| Tool | Version |
|---|---|
| Capacitor | 8.5.3 (v9 GA forecast for end of November 2026) |
| Expo | SDK 57 (RN 0.86) |
| Flutter | 3.47 |
| Room | 3.0.3 |
| Bubblewrap | 1.25.0 (targetSdk 36) |

| Option | Language | Reuse of current code | Effort A / B | On-device DB | Screen-off rest timer | Approx. size | iOS later | Fit |
|---|---|---|---|---|---|---|---|---|
| **PWA + TWA** (Bubblewrap / PWABuilder) | JS, unchanged | ~100% of the UI | **S** / M (port the repo to IndexedDB or SQLite-WASM) | Only browser storage, tied to Chrome | **Poor.** Hidden-page timer throttling, and Notification Triggers were abandoned. Only server web push, so A only. | < 2 MB | No | **A** (always needs an HTTPS host) |
| **Capacitor 8** | JS (vanilla works) | ~90%: `app.js`, CSS, `cardio-core.js`, sanitizers, migration SQL | S–M / **M**, plus S–M for the native timer | `@capacitor-community/sqlite` 8.1.1 (async API) | Scheduled `@capacitor/local-notifications` at `restEnd`, or a small custom Kotlin foreground-service plugin | 3–8 MB | Yes | **B (best)**, also A |
| **React Native + Expo SDK 57** | JS/TS + React | Pure logic only; full UI rewrite | **L** / L | expo-sqlite (has a sync API, so it is closest to today's `db.js`; not verified) | expo-notifications fires at an "approximate time" without exact-alarm permission. A foreground service needs a third-party module and a dev build. | 12–16 MB | Yes (strong) | Either |
| **Flutter 3.47** | Dart | None (logic can be transliterated) | **L–XL** / L–XL | sqflite 2.4.4 / drift 2.35.2 | `flutter_local_notifications`, `flutter_foreground_task`, `wakelock_plus` | 6–15 MB | Yes | Either |
| **Kotlin + Jetpack Compose** | Kotlin | None | **XL** / XL | Room 3 | **Best control:** foreground service plus AlarmManager | 2–5 MB | No (unless KMP) | B |
| *(extra)* KMP / Compose Multiplatform 1.12 | Kotlin | None | XL | Room 3 (KMP) | Same as native on Android | small | Yes | B |
| *(extra)* Tauri 2.12 mobile | Rust + web UI | ~90% of the UI | M, plus learning Rust | plugins | Thin mobile plugin set | small | Yes | Not recommended over Capacitor |

**Pros and cons in short**

- **TWA**
  - Pros: fastest; the app stays the website.
  - Cons:
    - It needs HTTPS hosting plus `/.well-known/assetlinks.json` containing the SHA-256 of the **Play App Signing** key, and also of the upload key for local tests.
    - If verification fails, the app silently opens as a Custom Tab with a URL bar.
    - With `APP_PASSWORD` set, Basic auth would block `assetlinks.json`, so it must be exempted like `/api/health` (`server.js:18`).
- **Capacitor**
  - Pros: keeps the vanilla `data-action` / template-string design.
  - Cons:
    - Relative `api/...` URLs resolve against `https://localhost`. Either add a configurable API base plus CORS/auth (A) or a local adapter (B).
    - `server.url` is for live reload only, never production.
- **Expo**
  - Pros: native feel; EAS builds and submits (the free plan has 15 Android builds a month).
  - Con: a full rewrite in React.
- **Flutter**
  - Pros: excellent UI and plugins.
  - Con: a new language plus a full rewrite.
- **Kotlin**
  - Pro: the most reliable timer.
  - Cons: Android only, and the largest effort.

**How a rest timer beeps with the screen off (any native option)**
1. **Scheduled notification at `restEnd`, with sound on its channel.**
   - **Exact timing needs `SCHEDULE_EXACT_ALARM`.** This is denied by default for new installs on Android 14+, and the user grants it under "Alarms & reminders".
   - **`USE_EXACT_ALARM` is restricted.** It is only for apps whose core function is an alarm, timer or calendar, and Google reviews it.
2. **Foreground service.**
   - It needs a declared type: `specialUse` with a justification, `health`, `mediaPlayback` or `shortService` (about 3 minutes maximum).
   - It also needs a Play Console declaration with a video.
3. **`POST_NOTIFICATIONS` runtime permission** on Android 13+.
4. **Timestamps.** Keep computing time from timestamps, as the code already does. On Android 14+ JS freezes about 10 s after the app is cached.

### 3. Running it locally (Windows 11 + WSL2)

**Software**
- **Android Studio Rabbit 1 (2026.2.1).** It bundles JDK 21; AGP 8/9 needs JDK 17+.
- **Android SDK:** Platform 36, Build-Tools 36 and platform-tools (`adb`).
- **Android Emulator** with a **Google Play x86_64** system image, which has Chrome and is needed for TWA.
- **Windows Hypervisor Platform (WHPX)** turned on.
  - HAXM is gone, and the AEHD driver is sunset on 2026-12-31.
  - Check with `emulator -accel-check`.
- **Optional:**
  - a physical phone with USB or wireless debugging (Android 11+);
  - **scrcpy** 5.x for mirroring;
  - **Expo Go** (Expo only);
  - **ngrok** (a stable free domain, needed for TWA/HTTPS) or **cloudflared** (random hostname every run).
- **Not recommended:**
  - Genymotion, which wants Hyper-V off and so conflicts with WSL2;
  - running the emulator inside WSL2 (nested virtualization, unsupported).
- **Hardware:** 16 GB RAM minimum for Studio plus the emulator (32 GB recommended), 16 GB+ free disk on an SSD, and VT-x/AMD-V enabled.

**Recommended layout**
- **Windows:**
  - Android Studio, the SDK and the emulator;
  - the **adb server**;
  - Chrome DevTools (`chrome://inspect`) and scrcpy;
  - USB phones.
- **WSL:**
  - the repo (on the Linux filesystem);
  - Node/Express on `:3000`;
  - the Capacitor, Bubblewrap and Expo CLIs.
  - For Gradle builds inside WSL, install a separate Linux cmdline-tools SDK plus OpenJDK 17/21.
  - Flutter and Kotlin projects are simplest kept entirely on Windows.

**Setup steps**
1. **`%USERPROFILE%\.wslconfig`:** set `[wsl2] networkingMode=mirrored` and `[experimental] hostAddressLoopback=true`, then run `wsl --shutdown`.
2. **Hyper-V firewall rule** allowing inbound traffic to WSL (or only port 3000).
3. **adb from WSL**, either way:
   - **Remote server (best for tooling):**
     - on Windows: `adb kill-server; adb -a -P 5037 nodaemon server`;
     - in WSL: `export ADB_SERVER_SOCKET=tcp:127.0.0.1:5037`;
     - keep the adb versions identical on both sides.
   - **Quick alternative:** `alias adb=/mnt/c/.../platform-tools/adb.exe`.
4. **Backend:** run `adb reverse tcp:3000 tcp:3000` and use `http://localhost:3000` on the device.
   - `localhost` counts as a secure context, so a service worker works.
   - The other options are `10.0.2.2:3000` (emulator), which is not a secure context, or the LAN IP.
   - Cleartext HTTP needs a **debug-only** `network_security_config.xml`.

**Dev loop by technology**

| Tech | Run | Reload | Debug |
|---|---|---|---|
| TWA | `bubblewrap init --manifest https://<ngrok>/manifest.json`, then `bubblewrap build`, then `adb install app-release-signed.apk` | None: the TWA loads the live site, and most work happens in desktop Chrome with device emulation | `chrome://inspect`; `adb logcat \| grep OriginVerifier`. In development, skip verification with Chrome's `--disable-digital-asset-link-verification-for-url` flag. |
| Capacitor | `npx cap add android`, then `npx cap sync`, then `npx cap run android` (from WSL, open `android/` in Windows Studio) | `npx cap run android --live-reload --host <ip> --port <port>` | `chrome://inspect` for the WebView; Studio and Logcat for native plugins |
| Expo | `npx expo start`, then `a` or a QR scan; `npx expo run:android` for a dev build | Fast Refresh (Metro :8081); `--tunnel` if LAN fails | React Native DevTools (`j`) |
| Flutter | `flutter run` | Hot reload `r`, hot restart `R` | Flutter DevTools |
| Kotlin | Android Studio → Run | Apply Changes, Compose Live Edit | Studio debugger, Layout Inspector |

### 4. Testing

**What exists today**
- `test/cardio-core.test.js`: pure logic, plus a `node:vm` load.
- `test/cardio-repo.test.js`: `createRepo` on temp and `:memory:` DBs.
- `test/migration.test.js`: v2 → latest.
- `test/cardio-api.test.js`: spawns `server.js` on :3997.
- `test/calendar-view.test.js` (untracked): runs real `app.js` in `node:vm` with stubbed DOM and `localStorage`.
- There is no `test` script in `package.json`, no CI and no linter.
- The cardio module was verified with `node --check`, `node --test` and a curl smoke test on :3999. A critic drove headless Chromium with playwright-cli. It stubbed `AudioContext`, `navigator.vibrate`, `navigator.wakeLock` and `confirm`, sampled the DOM every 50 ms for timer accuracy, and simulated offline mode (`context/foundation/auto-loop.md:35`, `context/changes/feat-cardio-module/reviews/phase-3-round-2.md:43-58`).

**Test stack by technology**

| Tech | Unit | Feature / integration | E2E on device | CI |
|---|---|---|---|---|
| Node API (A) | `node:test` (+ `mock.timers`) | `node:test` + `fetch`/supertest against `createRepo(':memory:')`; migration tests | — | GH Actions, no emulator |
| PWA/TWA | `node:test` / Vitest 4 | DOM tests (`node:vm` as today, Testing Library + jsdom, or **Vitest 4 Browser Mode**); `context.setOffline` for the service worker | Playwright with `devices['Pixel 7']` gives most of the value; Playwright `_android` (experimental) against emulator Chrome; Maestro for the installed shell | Playwright job + emulator job |
| Capacitor | `node:test` / Vitest | The same DOM tests. Mock plugins with `__mocks__/@capacitor/...` (they are proxies, so `spyOn` fails). Test SQL and migrations under `node:sqlite`, because the plugin's web engine is awkward in tests. | **Maestro**, which supports WebViews; Appium UiAutomator2 + WebdriverIO `switchContext('WEBVIEW_<pkg>')`; Playwright `_android.webView()` | GH Actions + `android-emulator-runner` |
| Expo | Jest 30 + `jest-expo` | `@testing-library/react-native` v14. expo-sqlite has no engine in Jest, so test SQL in node or on device. | **Maestro** or Detox 20.x | GH Actions, or EAS Workflows Maestro job (alpha, paid) |
| Flutter | `flutter_test`, `fake_async` | Widget tests; drift `NativeDatabase.memory()` or `sqflite_common_ffi`; drift schema-migration tooling | `integration_test`; **Patrol 4** (native dialogs, notifications, airplane mode); Maestro | GH Actions + emulator; Firebase Test Lab |
| Kotlin | JUnit, `kotlinx-coroutines-test` (virtual time), Turbine | Compose UI tests on **Robolectric**; Room in-memory; `MigrationTestHelper` | Espresso / Compose instrumented, **UI Automator** for system UI, Maestro | GH Actions `connectedCheck`; Firebase Test Lab |

**Recommended pyramid for this app**
1. **Unit (~60%), with `node:test`.**
   - Covers the sanitizers, `nameKey`, timer and rep math, calendar and date math, and the export/import shape.
   - First extract the strength-runner logic (`startRun`, `finishSet`, `advanceExercise`, `tick` at `public/app.js:416-571`) into a pure module like `cardio-core.js`.
2. **Integration (~30%).**
   - The repo on in-memory SQLite: `ConflictError`, cascades, `replaceAll`, migrations from N to latest.
   - The API through fetch.
   - A few DOM tests of render and actions.
   - For B, run the same migration tests against the on-device DB layer.
3. **Web E2E (a handful), with Playwright on Pixel emulation.**
   - Covers plan → schedule → runner → save, and offline.
   - `page.clock` makes the rest timer deterministic.
4. **Device E2E (3–6 Maestro flows), nightly or on a PR label.**
   - Cold start.
   - Runner + `pressKey: Home`, then relaunch and assert the remaining time.
   - `killApp`, then check the data survives.
   - `setAirplaneMode`.
   - A denied notification permission.
   - Upgrade: install the old APK, seed data, `adb install -r` the new one, assert.
5. **Manual release checklist.** Automation can't check these:
   - beeps you can hear and real haptics;
   - OEM battery killers (Samsung, Xiaomi);
   - real Doze timing;
   - lock-screen notifications;
   - the actual Play install and update path through the internal or closed track;
   - TWA verification with the Play signing key.

**Platform behaviour tools**
- **Doze:** `adb shell dumpsys deviceidle force-idle`.
- **App standby:** `am set-standby-bucket <pkg> rare`.
- **Screen off:** `adb shell input keyevent 26`.
- **Exact-alarm denial:** test the fallback path.

**CI and cost**
- **GitHub Actions** with `reactivecircus/android-emulator-runner@v2`. KVM is available on 2-vCPU Linux runners, and the repo is public, so standard runners are free. Maestro CLI is free and open source.
- **Maestro Cloud:** $250 per device per month, which is overkill.
- **Firebase Test Lab** (Spark: 10 virtual + 5 physical runs a day). It runs instrumentation and Robo tests, but not Maestro, Detox, Appium or Playwright.
- **Running E2E locally under WSL2:**
  - simplest: Maestro natively on Windows;
  - from WSL: `ADB_SERVER_SOCKET` plus `maestro --host <WIN_IP>`, where `127.0.0.1` works with mirrored networking.

### 5. Google Play publishing requirements (2025–2026)

1. **Developer account:** US$25 one-time fee, plus identity verification. An Organization account needs a D-U-N-S number.
2. **New personal accounts** (created after 2023-11-13):
   - run a **closed test** with **12 or more testers opted in continuously for 14 days**;
   - internal testing does not count;
   - then apply for production access.
3. **Target API:** **API 36 (Android 16)** for new apps and updates since 2026-08-31. Expect API 37 around August 2027 (inference).
4. **Format and signing:**
   - **AAB** is required.
   - **Play App Signing** is mandatory. You keep the upload key.
   - With a TWA, `assetlinks.json` must list both fingerprints.
5. **16 KB page size:** required for apps with native libraries targeting Android 15+. Current Capacitor, Expo and Flutter comply.
6. **Privacy policy:** required even when no data is collected. It must be on a public, non-PDF URL and linked **in the app** and in Play Console.
7. **Data safety form:** mandatory.
   - Under A, workout data sent to the server is "collected".
   - If you add accounts, you must also offer account deletion.
8. **Health apps declaration:** declare "Activity and Fitness".
9. **Foreground service and exact alarm declarations:** only if you use them; see the timer section.
10. **Android developer verification:** Play package names are registered automatically. Global enforcement starts in 2027.
11. **Minimum functionality / webview spam policy:** a wrapper of your *own* site with real functionality is allowed.

## Code References

- `public/app.js:3-6`: localStorage keys (`trening.run.v1`, `trening.cardio.v1`, `trening.autoNext`)
- `public/app.js:64-76`: `api()` fetch wrapper, the single seam for a local adapter (architecture B)
- `public/app.js:383`, `:385`, `:407-414`: export link and import file input
- `public/app.js:416-571`: strength runner logic mixed with the DOM (an extraction candidate)
- `public/app.js:490-508`: Web Audio `unlockAudio` / `beep`
- `public/app.js:512-536`: Wake Lock `keepAwake` / `syncOverlayState`
- `public/app.js:564`, `:847`: the 250 ms `setInterval` ticks (background risk)
- `public/app.js:566-571`: `visibilitychange` handler
- `public/app.js:1304-1307`: boot; error when the server is unreachable
- `public/index.html:5-8`: viewport `cover`, `theme-color`, SVG emoji favicon
- `public/styles.css:134-136`, `:192-198`, `:211-212`: fixed overlays, light theme, toast (no safe-area insets)
- `public/cardio-core.js:4-7`, `:185-192`: UMD wrapper and exports (already shared)
- `db.js:3`, `:158-492`: `node:sqlite` `DatabaseSync` and the synchronous `createRepo` closure
- `db.js:10-132`: `MIGRATIONS`, portable SQLite DDL
- `db.js:134-156`: error classes, sanitizers, `nameKey`
- `db.js:163-181`: `tx()` and the `PRAGMA user_version` migration runner
- `server.js:11`, `:18`, `:24-33`: Basic auth (`/api/health` exempt)
- `server.js:69-76`: export / import
- `test/*.test.js`: existing `node:test` suite

## Architecture Insights

- **One seam makes architecture B cheap.** Every data access in the SPA goes through `api()`. A local adapter that maps `(method, path, body)` to repo calls lets `app.js` run unchanged on-device. The relative-URL invariant stays intact in the web build.
- **`cardio-core.js` already shows the extraction pattern:** pure logic, `now` passed in, UMD, tested under `node:test`. Applying it to the strength runner and the `db.js` sanitizers gives one shared core for the server, the browser and the device.
- **Timestamp-based timers make background behaviour testable with a fake clock.** Only alert *delivery* (notification or foreground service) is platform-specific, so it should sit behind a small `alerts` interface, with a web implementation (Web Audio + vibrate) and a native one (local notification).
- **The two architectures can be combined later.** A hybrid would keep data on-device first, with optional sync or backup to the Node server. JSON export/import already gives a manual version of this.

## Historical Context (from prior changes)

- `context/changes/feat-cardio-module/brief.md:18`, `:105`: phone vibration was left for the owner to check on a real device.
- `context/changes/feat-cardio-module/reviews/phase-3-round-1.md:217`, `phase-3-round-2.md:225`: throttling of timers in a background tab was never verified.
- `context/changes/feat-cardio-module/reviews/phase-4-round-2.md:221`: tap-target size and the date picker were never checked on a real phone. Everything ran at desktop width.
- `context/changes/feat-cardio-module/reviews/phase-3-round-2.md:43-58`: the instrumented Playwright approach (stubbing AudioContext, vibrate, wakeLock and confirm; offline save retry). It can be reused for web E2E.
- `context/foundation/auto-loop.md:187-194`: deployment invariants (relative URLs, `/api/health` outside auth, the Dockerfile COPY line).
- `documentation/pain-points-*.md` (untracked, earlier competitor research): "offline" is a pain-point category, Android gestures pause timers in competitor apps, and export lock-in. All three support the on-device design.
- No earlier change mentions Android, PWA, the Play Store or Capacitor.

## Related Research

- None yet under `context/changes/**/research.md` or `context/archive/**/research.md`.

## Open Questions

1. **A or B?**
   - Does the user need the data on more than one device or in a browser? That points to A or a hybrid with sync.
   - Or is a phone-only offline app enough? That is B, with no hosting, auth or Data-safety "collection".
2. **Screen-off alerts.**
   - Is the rest-end beep with the screen off a must-have? If not, keep-awake alone (the current behaviour) is enough for v1.
   - If it is: should it be an inexact local notification, a user-granted `SCHEDULE_EXACT_ALARM`, or a foreground service with a Play declaration?
   - Whether Google accepts a rest timer under `USE_EXACT_ALARM` or `specialUse` is at the reviewers' discretion.
3. **Keep the web version alive next to the app?** This decides whether the local adapter is a build-time switch or a fork.
4. **Async port of `db.js`.** Either rewrite it for `@capacitor-community/sqlite` (async), or evaluate SQLite-WASM with OPFS inside the WebView to keep the synchronous shape. The second was not researched.
5. **Can the user recruit 12 closed-test testers for 14 days?** This is a hard gate for a new personal account.
6. **Unverified details to confirm during planning:**
   - Screen Wake Lock support in Android WebView;
   - the expo-sqlite synchronous API;
   - the exact syntax of Capacitor's `--forwardPorts`;
   - app-size figures;
   - Notifee's archival status;
   - the Expo SDK number: one source said 57, another referenced SDK 58 docs.
7. **CLAUDE.md is stale.** It says "There are no tests". There are 5 `node:test` files and no `npm test` script.

## Follow-up Research 2026-10-17: can open testing replace closed testing?

**No.** For personal developer accounts created after 2023-11-13, the **open testing track stays locked until production access is granted**. Source: [Play Console Help: App testing requirements for new personal developer accounts](https://support.google.com/googleplay/android-developer/answer/14151465).

| Track | When it is available | Counts toward the 12×14 requirement? |
|---|---|---|
| Internal testing | Right away, before app setup is finished | No |
| Closed testing | After app setup is complete | **Yes, the only track that counts** |
| Open testing | **Only after production access** | No; you cannot even open it before then |
| Production | After the closed test passes and the production-access application is approved | — |

The track order is fixed: internal (optional) → closed (12 or more testers opted in continuously for the 14 days before you apply) → apply for production → production and open testing.

Details from the same page:
- **The production-access application asks about the closed test.**
  - How hard recruiting testers was, and whether testers used all features.
  - A summary of the feedback, what you changed because of it, and why you think the app is ready.
  - Google reviews the application, usually in 7 days or less.
  - If there are fewer than 12 opted-in testers, or engagement is too low, Google can require you to keep testing.
- **Testers must stay opted in for the whole 14 days.** Someone who opts out and back in breaks the "continuous" condition, so tell testers this up front.
- **Google suggests where to recruit:** personal and professional networks, plus communities of target users. For a fitness app, that means local clubs and online fitness groups.

**Ways around the requirement**
- **Organization developer account.** The requirement covers *personal* accounts only. But an organization account needs a real legal entity with a D-U-N-S number, plus organization verification. *Unverified:* whether a Polish sole proprietorship (JDG) qualifies as an organization for Google. Check before relying on it.
- **Personal account created before 2023-11-13.** Not subject to the requirement, if one exists.
- **Tester-exchange communities.** For example Reddit groups where developers test each other's apps. They can fill the 12, but the application asks about engagement and real usage, so passive testers are a risk. This is a judgement call, not something Google states.

**Effect on planning:** budget **at least 14 days plus up to about 7 days of review** between the first closed-test build and a public release. Line up the testers before the closed test starts. Closed testing needs a finished app setup: store listing, privacy policy, Data safety, content rating and the Health apps declaration.

## Follow-up Research 2026-10-17: paid closed-testing testers (Fiverr "grayostudios")

**Gig checked:** the URL slug says "squarespace-website-design", but the content is now **"I will provide real 12 testers for your app for google play console closed testing"**. The seller (Grayo / Grayostudios) is in India, Fiverr Level 2, and a member since October 2024. Snapshot as of 2026-10-17:

- **Ratings.** The gig has 4.9 from 113 reviews (105×5★, 7×4★, 1×2★). The profile has 4.9 from 845 reviews (6×1★, 2×2★, 3×3★). The seller has two more tester gigs, at 4.9 from 271 and 4.9 from 217 reviews. Prices start at about €5, and the reviews show orders "up to CA$75" or "up to €50".
- **Packages.** Basic is 12 testers, 14 days and a guide to answering the questionnaire. Standard is 15 testers plus written answers and a report. Premium is 20 testers plus VIP support. All are delivered in 14 days, with "unsupported until approval" and free retesting on rejection.
- **⚠ "We do not work with PWA/TWA Apps".** This seller won't take a TWA build, only Capacitor or a native app.
- **Recent reviews are mostly positive** ("app got approved", "guidance for the production questionnaire"). There is one negative signal: "Never received the testing report as was advertised in the listing, but the app got published".
- **Red flags.**
  - The gig was re-purposed from a Squarespace one: the slug and the "About" text are still about Wix/Webflow/Squarespace websites. It is unclear how many of the older reviews belong to the website service.
  - "Answers written for you" for the production-access questionnaire is risky. The questionnaire asks about *your* testing and *your* changes, and Google reads the answers against Play Console data.
- **No independent opinions about this particular seller** (Reddit, Trustpilot and so on) were found.

**The wider picture of paid testers (sources are biased, mostly competing services: onTest, TesterBee)**
- A recurring complaint about cheap Fiverr gigs: the seller sends 12 Gmail addresses, few of them opt in, nobody opens the app, and Google answers "more testing required". That costs another 14 days or more.
- Google is said to judge **engagement**: daily use on real devices. Opt-ins alone are not enough, and emulator farms get flagged as "irregular testing activity". *Unverified* from Google's own sources. It is consistent with the official help page, which says production access can be refused for "insufficient tester engagement".
- The claim that "Google's questionnaire lists a paid testing service as a valid recruitment channel" comes only from a competitor's blog. *Unverified.*
- Advice that repeats across sources: recruit 15–18 testers as a buffer, and ask the seller which device models they use and how they prove daily use. Pay in milestones where possible.

**Implication for this change:** a paid service can close the 12×14 gap, but it doesn't guarantee approval. The cheapest low-risk path is a mix: real users (friends, a gym or club group) plus a buffer from a service with proof of engagement. Fill in the questionnaire yourself, based on real feedback.

## Follow-up Research 2026-10-17: onTest.app, and does Google accept paid testers?

**What Google itself says (official sources)**
- The [testing requirements page](https://support.google.com/googleplay/android-developer/answer/14151465) recommends recruiting through personal and professional networks and target-user communities. It does **not mention paid services, either for or against**. Production access can be refused for "insufficient tester engagement".
- The [User Ratings, Reviews, and Installs policy](https://support.google.com/googleplay/android-developer/answer/9898684) forbids manipulating ratings, reviews and install counts, incentivised reviews, and "automated services to inflate installs". It **does not explicitly forbid** paying real people to test.
- Several vendors (onTest, TesterMob, AppBanana-review) claim that "the questionnaire lists a paid testing service as a recruitment option". PrimeTestLab, also a vendor, says the opposite: Google neither endorses nor certifies paid providers. **Not confirmed in any Google source. Treat it as unverified.**
- **Conclusion.** It is a grey area. The safe line is that the testers must be **real people on real devices** who actually use the app. Bots, emulators and bulk-created accounts break the policy and risk the whole developer account, not just one app. The account holder carries that risk, not the vendor.

**onTest (ontest.app)**
- **Who runs it.** A one-person company: Turgay Ulutaş, an Android developer in Istanbul. It launched publicly around May 2026, after earlier pay-per-device pricing at $2 per device with 3 free.
- **Offer.** "The Production Pass" costs $19.99 one-time for 12 devices and 15 days. It includes daily screenshot proof, install proof, bug and crash reports, and a dashboard. Payment goes through Paddle with no account needed. The testers are "our team", on Android 14+ devices (Galaxy S24, Pixel 8, Xiaomi 14 and others).
- **Guarantee.** The home page promises a "3-day money-back guarantee, no questions asked". The blog mentions "approved-or-your-money-back: free re-run, then full refund". These two are inconsistent, and the 3-day window closes long before Google's decision on day 15 or later. **Confirm the terms in writing before paying.**
- **Independent opinions: none found.** There are no Reddit, Trustpilot or Product Hunt reviews from customers. All the content (blog, Indie Hackers, dev.to) is written by the founder. Its "Fiverr is a scam" stories are marketing from a competitor.
- **Risk to consider.** It describes its testers as "the actual Android fleet", meaning its own pool of devices. If many devices sit in one place, on one network, run by a few people, that is the pattern other vendors say Google flags (IP and device clustering). *Unverified* whether Google really penalises this.

**Independent first-hand reports (not vendors)**
- Dmitry Khorev ([Medium / Level Up Coding, 2026-07](https://levelup.gitconnected.com/the-12-tester-tax-google-plays-closed-testing-rule-is-quietly-killing-solo-devs-2cea83c2e338)). His Reddit swap post was silently removed by the spam filter for new accounts. He paid about $20 for 25 testers, and production was **approved on day 15**.
- A Korean blog ([soir1984.tistory.com, 2024-12](https://soir1984.tistory.com/93)). Testers from open KakaoTalk groups uninstalled the app and he was rejected. A paid service from Kmong then **got approval**.
- An aggregated post (rssing, unknown date). A $12 service passed the closed test. The later rejection was unrelated: VPN apps require an organization account.
- Stories of **account suspension after cheap "testers"** appear only on vendor sites (12testershub, DroidSquad, AppBanana-review). No such case was found on Reddit or with a verifiable source.
- Exa returned **no reddit.com threads** on this topic. Reddit was not searched through its API.

**Practical recommendation**
1. **Start free.** Friends with Android phones, the gym or club, family, plus Testers Community (a free credit-based app) or swap subreddits (r/AndroidAppTesters, r/TestersCommunity). Read their rules: new accounts get filtered.
2. **Buy only the shortfall,** up to 15–18 people, from a service that:
   - uses real people with their own phones;
   - shows proof of activity;
   - has a refund written down that covers the period up to Google's decision;
   - never asks for access to your Play Console account.
3. **Fill in the questionnaire yourself and truthfully,** including that some testers came from a service. Base it on real feedback, and ship at least one update during the test.
4. **Our app is easy to test:** offline, no login. A tester just installs it and runs a workout, which helps engagement.

## Follow-up Research 2026-10-17: the PWA option in depth

There are three variants, from least to most "store":

| Variant | What the user does | Play Store? | 12×14 closed test? | Server needed |
|---|---|---|---|---|
| **PWA only** | Opens the URL in Chrome and taps "Install app". Chrome builds a WebAPK, so the app appears in the launcher and app list like a native app. | No | **No** | Only static HTTPS hosting (B), or the Node API (A) |
| **PWA + TWA** (Bubblewrap / PWABuilder) | Installs from Google Play. The APK/AAB opens the site full-screen in Chrome. | Yes | **Yes** | HTTPS host + `/.well-known/assetlinks.json` |
| **PWA, later wrapped in Capacitor** | Installs from Google Play. The web code is bundled inside the APK. | Yes | Yes | None (B) |

**What has to be added to this repo (all variants)**
1. **`public/manifest.webmanifest`.**
   - Fields: `name`, `short_name`, `lang: "pl"`, `start_url: "."`, `scope: "."` (relative, so the reverse-proxy subpath invariant holds), `display: "standalone"`, `theme_color` and `background_color`.
   - Icons: 192 and 512 PNG plus a `maskable` icon. Today there is only the SVG emoji favicon (`public/index.html:8`).
2. **A service worker (`public/sw.js`)** that pre-caches the app shell: `index.html`, `app.js`, `cardio-core.js`, `styles.css` and the icons. Register it with a relative path.
   - Under A, `api/*` must stay network-only or network-first, because offline writes would need a queue and conflict handling.
   - Under B, there is no API at all.
3. **Safe-area CSS.** Add `env(safe-area-inset-*)` padding for the full-screen overlays and the toast (`public/styles.css:134-136`, `:211-212`). This matters because `viewport-fit=cover` is already set (`public/index.html:5`).
4. **Dark/light `theme-color`.** Use two `<meta name="theme-color" media=...>` tags (`public/index.html:6`).
5. **HTTPS.** Service workers and Wake Lock need a secure context. `localhost` counts as one for development, so `npm run dev` already works.

**Data architecture inside a PWA**
- **A (keep the Node server).**
  - The current Basic auth works in Chrome, but the prompt returns every browser session.
  - Offline means a read-only cached `api/state` at best.
- **B (on-device).**
  - Port `createRepo` to the browser and put a local adapter behind `api()` (`public/app.js:64-76`).
  - Storage options: **IndexedDB** (async), or **SQLite-WASM with OPFS**. The second would reuse the `MIGRATIONS` SQL and could keep a synchronous API inside a worker. That is not yet researched in detail.
  - Hosting becomes purely static (GitHub Pages, Cloudflare Pages or Netlify, free). There is no auth problem and no server-side data, which makes the Data safety form simple for a TWA.
  - Call `navigator.storage.persist()` so the browser does not evict the data.
  - Back up with the existing JSON export/import. `api/export` would become a client-side Blob download.

**Platform limits (why the PWA is weaker for this app)**
- **Background timers.**
  - Chrome throttles hidden pages.
  - Notification Triggers (scheduled local notifications) were abandoned.
  - Web Push needs a server and is not designed for second-precise alerts.
  - So a **rest-end beep with the screen off is not reliable**.
  - A commonly cited hack is to keep an `<audio>` element playing, which reduces throttling and shows a media notification. *Unverified, and fragile.*
- **Wake Lock** works in Chrome on Android, which already covers the "screen on during a workout" case (`public/app.js:512-536`).
- **Vibration** works in Chrome on Android, in the foreground only.
- **Storage.**
  - A PWA's storage belongs to the origin, and "clear site data" or uninstalling wipes it.
  - In a TWA it is shared with Chrome, so clearing Chrome data wipes it too.
  - Export/import is the safety net.
- **TWA specifics.**
  - `assetlinks.json` must sit at the **origin root** (`https://host/.well-known/assetlinks.json`). A subpath deployment alone is not enough. It must also be exempt from Basic auth.
  - It needs both the upload-key and the Play-App-Signing fingerprints.
  - If verification fails, the app shows a URL bar (Custom Tab).
  - The TWA needs a TWA-capable browser on the device; Chrome is the default.
  - Some paid tester sellers refuse TWA apps (Grayo: "We do not work with PWA/TWA Apps").

**Local run and test for the PWA**
- **Desktop.** `npm run dev`, then Chrome DevTools → Application: Manifest, Service workers, Storage. Lighthouse 12 removed the PWA category in 2024 (*from memory*), so use DevTools' installability checks instead.
- **Phone or emulator.**
  - Run `adb reverse tcp:3000 tcp:3000` and open `http://localhost:3000` in Chrome. That counts as a secure context, so the service worker works and the app can be installed.
  - Debug with `chrome://inspect`.
- **Testing.** Playwright (`devices['Pixel 7']`, `context.setOffline(true)`, `page.clock`) covers most of it. Add a Maestro flow only for the installed TWA shell.

**A suggested staged path**
1. **Make it a good PWA:** manifest, service worker, safe areas, plus the B local data adapter on static hosting.
   - Real use on the phone without any store, fee or 12-tester gate.
   - Most of this work carries over to Capacitor: the local adapter, the safe-area CSS and the icons.
2. **Ship to Play only when needed.** Either wrap it as a TWA (fast, but with the timer and storage limits) or in Capacitor (native notifications for the rest-end beep, an on-device SQLite plugin).
   - Run the closed test at that point, with testers who are already using the PWA.
