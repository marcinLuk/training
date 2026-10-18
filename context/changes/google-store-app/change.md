---
change_id: google-store-app
title: Instalowalna aplikacja PWA (zamiast Google Play na start)
status: preparing
created: 2026-10-17
updated: 2026-10-17
archived_at: null
---

## Notes

### Decisions

- **2026-10-17: we are going with a PWA.** The app becomes an installable Progressive Web App: a manifest, a service worker, icons, safe-area CSS, and HTTPS on the target server. It installs straight from Chrome, without Google Play. That means no US$25 fee and no closed test with 12 testers × 14 days for now. We weighed TWA, Capacitor, Expo, Flutter and Kotlin; the comparison is in `research.md`.
  - **Accepted limitation:** the rest timer does not reliably beep with the screen off or the app in the background. Wake Lock, beeps and vibration work while the screen is on, as they do today.
  - **Not ruled out later:** publishing to Google Play as a TWA or wrapping in Capacitor. The PWA work (manifest, icons, safe areas, data layer) should be reusable then.

### Still open (to settle in `/10x-plan`)

- **Where the data lives.** (A) keep the Node/Express API. In that case Basic auth and offline mode need solving: offline, the user can at most view the cached data. Or (B) on the device: IndexedDB or SQLite-WASM behind `api()`, plus static hosting. The research recommends B.
- **Hosting / domain with HTTPS** for the PWA.
