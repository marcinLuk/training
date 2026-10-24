# Trening

A workout app for one person who trains at home with a phone. You build a plan once. During a workout, the app shows where you are, runs the rest timer and plays a sound when the rest ends. If you lock the screen or switch apps, you come back to the same set.

The app is an installable web app (PWA). It has no accounts and no server: all data stays on your phone and the app works offline.

Status: the MVP is built (plans and the workout loop) and the app is ready for a test release on a private server.

## Requirements

- Node.js 22 or newer
- npm

## Run locally

```bash
npm install
npm run dev
```

Open the address that Vite prints (by default http://localhost:5173).

To test on a phone, connect it over USB and forward the port:

```bash
adb reverse tcp:5173 tcp:5173
```

Then open http://localhost:5173 in Chrome on the phone.

## Build

```bash
npm run build      # type check, then build into dist/
npm run preview    # serve dist/ locally
```

## Deploy

GitHub Actions tests the app, pushes a Docker image to GHCR and deploys it over SSH to a server with Traefik. The one-time server setup, the GitHub secrets, the first release, rollback and troubleshooting are in [docs/deploy.md](docs/deploy.md).

## Project documents

- [PRD](context/foundation/prd.md): what the app does and does not do
- [Tech stack](context/foundation/tech-stack.md): the stack choice and why

## Stack

Vite, Vue 3, TypeScript.
