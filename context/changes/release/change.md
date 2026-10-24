---
change_id: release
title: Release
status: impl_reviewed
created: 2026-10-24
updated: 2026-10-24
archived_at: null
---

## Notes

### Decisions

- **2026-10-24: this is a test release, not production.** The goal is to run the app on the author's phone and test it in real workouts. Small bugs are OK. The small fixes in `research.md` (section "B") do not block this release.
- **2026-10-24: Basic auth stays outside git.** The author sets up htpasswd Basic auth directly on the server, over SSH. The repo holds no htpasswd file, no password and no `auth_basic` config. The app side still needs `crossorigin="use-credentials"` on the manifest link (`useCredentials: true` in vite-plugin-pwa).
- **2026-10-24: address `trening.marcinlukaszek.pl`.** The app runs at the root of its own subdomain. The author adds an A record for `trening` → the VPS at cyberfolks DNS.
- **2026-10-24: Traefik in Docker** handles HTTPS (Let's Encrypt) and Basic auth on the VPS. The htpasswd users file lives only on the server.
- **2026-10-24: delivery with a GHCR image + SSH.** GitHub Actions builds an nginx image with `dist/`, pushes it to GitHub Container Registry (public), then connects over SSH as a deploy user and runs `docker compose pull` + `up -d`.
- **2026-10-24: one change.** Deploy (roadmap F-01) and the installable offline shell (roadmap F-02) are phases of this `release` change.
- **2026-10-24: app icon = the barbell from `favicon.svg`.** PNG 192, 512 and maskable 512 are made from it. DESIGN.md gets a short app icon section.
- **2026-10-24: silent updates.** A new version installs in the background. The app reloads only when the plan list is on screen and no workout runs. No new UI text.
