# Brief: Prepare the app for the test server

## Goal

The app builds into an installable, offline PWA and into a Docker image. A GitHub Actions workflow tests the app, publishes the image to GHCR and deploys it over SSH to the test server at `trening.marcinlukaszek.pl` (Traefik in front, Basic auth set up on the server). `docs/deploy.md` gives the owner every server and GitHub step, because no agent may touch the server.

## Done when

- D1 `npm run build` writes `dist/manifest.webmanifest` with `name` and `short_name` „Trening”, `id`, `start_url` and `scope` `/`, `display: standalone`, `lang: pl`, `background_color` and `theme_color` `#121314`, and three real PNG icons (192×192 `any`, 512×512 `any`, 512×512 `maskable`) made from the barbell in `public/favicon.svg`. `dist/index.html` links the manifest with `crossorigin="use-credentials"` — checked by `node scripts/verify-dist.mjs dist`.
- D2 The build writes a service worker whose precache holds `index.html`, every JS and CSS file in `dist/assets/`, `favicon.svg`, every `dist/fonts/*.woff2` and the icons, with an `index.html` navigation fallback. The app registers it. After one online load, the app opens and works with no network — checked by `node scripts/verify-dist.mjs dist` and a browser walk on `vite preview`.
- D3 A new service worker version is applied (the page reloads) only while the plan list is on screen and no workout runs; when an update arrives at any other time, it waits for that moment. The app checks for an update when it becomes visible again — checked by Vitest tests in `src/pwa/` and `src/components/App.test.ts`.
- D4 `Dockerfile` builds the app and serves `dist/` with nginx as a non-root user on port 8080, with `deploy/nginx/default.conf`: `Cache-Control: no-cache` on `/`, `/index.html`, `/sw.js` and `/manifest.webmanifest`; `max-age=31536000, immutable` on `/assets/` and `/workbox-*.js`; `application/manifest+json` for `.webmanifest`; a real 404 for a missing file; `X-Robots-Tag: noindex, nofollow`; no nginx version in the `Server` header — checked by `bash scripts/smoke-image.sh`.
- D5 `deploy/traefik/compose.yaml` (Traefik with Let's Encrypt and the Basic auth users file mounted from the server), `deploy/compose.yaml` (the app image from GHCR with Traefik labels for `trening.marcinlukaszek.pl`, no published port) and `deploy/server/deploy.sh` (the only command the deploy key may run: it accepts a commit SHA only, pulls that image tag and restarts the app) are valid — checked by `docker compose config` and `bash deploy/server/deploy.test.sh`.
- D6 `.github/workflows/deploy.yml` runs on a push to `main`: job `test` (`npm ci`, `npm test`, build, `verify-dist`), then job `image` (smoke test, push `ghcr.io/marcinluk/training:<sha>` and `:latest`), then job `deploy` (SSH with the deploy key, only when the repository variable `DEPLOY_ENABLED` is `true`) — checked by a YAML parse and the critic.
- D7 `docs/deploy.md` (ASD-STE100 English) holds every step the owner must do on the server and in GitHub, and names every secret, variable and deploy file; `CLAUDE.md` and `README.md` point to it and no longer say that the deploy files do not exist; `DESIGN.md` has an „Ikona aplikacji” section — checked by grep and by the critic.
- D8 Existing behaviour is unchanged: `npm test` passes (415 tests before this run) and `npm run build` exits 0 — checked by running both.

## Out of scope

- Any change to workout or plan behaviour, to `src/plans/`, `src/workout/` or the stored data shape.
- The small fixes from `research.md` section "B" (`persist()` at start, audio resume, Polish plurals, standalone CSS polish, the Android back gesture, the stepper SVG icons, roadmap and PRD updates).
- A data backup or export.
- A real deploy or any server contact: no `ssh`, `scp`, `rsync` to a remote host, no `git push`, no `docker push`, no `docker login`, no change to GitHub settings, secrets, variables or packages.
- A light theme, a new screen, or any visible UI text for the update (the update is silent).

## Guardrails

- Project rules: `CLAUDE.md`, `DESIGN.md`, `PRODUCT.md`, `context/foundation/auto-loop.md` §9/§10. UI text in Polish. `DESIGN.md` gets the app icon rule in the same change.
- The repository is public. No secret, password, private key, `htpasswd` content, e-mail address, server IP address, admin user name or other private server data in any file. Server-only values are placeholders in the docs (`<SERVER_IP>`, `<admin-user>`) or come from a server-side `.env`.
- Basic auth is configured only on the server (Traefik `basicauth` with a users file that lives on the server). The repo holds only the path the file is mounted at.
- One new dev dependency is allowed: `vite-plugin-pwa` at exactly `2.0.0`. No other new npm dependency. The PNG icons are made once (ImageMagick `convert` is on this machine) and committed; the build does not generate them.
- No third-party GitHub Action for SSH or deploy. Use `actions/checkout`, `actions/setup-node` and `docker/login-action` only, plus plain shell steps.
- The app is served at the root of its own subdomain: Vite `base` stays `/`.

## Research

See `research.md` (PWA findings §2–§4, deploy §5, Basic auth §6, library versions §7, install rules §8, and the two follow-up sections with the owner's decisions). The change folder `release` was created with `/10x-new` and reused for this run.

## Progress

### Phase 1: Manifest, icons and service worker build
#### Automated Verification:
- [x] 1.1 `npm run build && node scripts/verify-dist.mjs dist` exits 0; the script checks every field and icon of D1 (PNG signature and IHDR size of each icon file), the manifest link with `crossorigin="use-credentials"` in `dist/index.html`, and that `dist/sw.js` exists and its precache list names `index.html`, every file in `dist/assets/`, `favicon.svg`, every `dist/fonts/*.woff2` and every manifest icon, with a navigation fallback to `index.html`; it exits non-zero with one message per failed check (D1, D2) — bd9cd5d
- [x] 1.2 `node -e "const p=require('./package.json');process.exit(p.devDependencies['vite-plugin-pwa']==='2.0.0'&&!(p.dependencies||{})['vite-plugin-pwa']?0:1)"` exits 0 (Guardrails) — bd9cd5d
- [x] 1.3 `grep -n "Ikona aplikacji" DESIGN.md` prints the new section (D7) — bd9cd5d
- [x] 1.4 `npm test` exits 0 (D8) — bd9cd5d
#### Manual Verification:
- [x] 1.5 the three PNG files in `public/icons/` show the light barbell from `public/favicon.svg` on `#121314`; the maskable icon fills the whole square (no rounded corners, no transparent edge) and keeps the barbell inside the central circle of 80 % of the width (D1) — bd9cd5d

### Phase 2: Register the service worker and apply updates safely
#### Automated Verification:
- [x] 2.1 `npx vitest run src/pwa` passes, with tests for: no reload when no update waits; a waiting update applied once on the plan list with no workout; an update that arrives during a workout, in the plan editor, or on the end screen waits and is applied when the plan list shows again with no workout; the apply call made at most once; an update check when the document becomes visible again (D3) — 6c5b55d
- [x] 2.2 `npx vitest run src/components/App.test.ts` passes, with a test that mounts the real `App` with a mocked registration: a waiting update during a running workout does not reload; after the workout ends and the plan list shows, the update is applied (D3) — 6c5b55d
- [x] 2.3 `npm run build && node scripts/verify-dist.mjs dist` exits 0 (D1, D2) — 6c5b55d
- [x] 2.4 `npm test` exits 0 (D8) — 6c5b55d
#### Manual Verification:
- [x] 2.5 at 412×915 on `vite preview` (port 4199): after the first load and one reload, a service worker controls the page; with the browser context offline, a reload shows the plan list in the Barlow fonts, a new plan with a Polish name („Wiosłowanie”) can be saved, and a workout can be started from it (D2) — 6c5b55d

### Phase 3: Docker image with nginx
#### Automated Verification:
- [x] 3.1 `bash scripts/smoke-image.sh` exits 0; the script builds the image from `Dockerfile`, runs it on `127.0.0.1:${SMOKE_PORT:-4197}` with the same hardening flags as `deploy/compose.yaml` (read-only root file system, a tmpfs for `/tmp`, all capabilities dropped, `no-new-privileges`), checks every header, MIME type and status of D4 with `curl`, checks that the nginx process does not run as root, and always removes its container, also when a check fails (D4) — b46ed30
- [x] 3.2 `npm test` exits 0 (D8) — b46ed30

### Phase 4: Server files and CI workflow
#### Automated Verification:
- [x] 4.1 `bash deploy/server/deploy.test.sh` exits 0, with cases (run against a stub `docker` on `PATH` and a scratch app directory) for: a 40-character lowercase hex SHA pulls that tag and then restarts the app, and the stored tag is the new SHA; an empty argument, `latest`, an uppercase SHA, a short SHA, and a SHA followed by `; rm -rf /` are refused with a non-zero exit and no `docker` call; a failed pull exits non-zero and keeps the old stored tag (D5) — 48f4160
- [x] 4.2 `ACME_EMAIL=owner@example.invalid docker compose -f deploy/traefik/compose.yaml config --quiet && docker compose -f deploy/compose.yaml config --quiet` exits 0 (D5) — 48f4160
- [x] 4.3 `python3 -c "import yaml;d=yaml.safe_load(open('.github/workflows/deploy.yml'));o=d.get('on',d.get(True));j=d['jobs'];assert o['push']['branches']==['main'];assert set(j)=={'test','image','deploy'};assert j['image']['needs'] in ('test',['test']);assert j['deploy']['needs'] in ('image',['image']);assert 'vars.DEPLOY_ENABLED' in j['deploy']['if'];print('ok')"` prints `ok` (D6) — 48f4160
- [x] 4.4 `! grep -rnE "BEGIN [A-Z ]*PRIVATE KEY|@gmail|[$]apr1[$]|[$]2y[$]|password *[:=] *[^ <$]" Dockerfile deploy scripts .github` exits 0 (Guardrails) — 48f4160
- [x] 4.5 `npm test` exits 0 (D8) — 48f4160

### Phase 5: Deploy guide and project docs
#### Automated Verification:
- [x] 5.1 `for n in $(grep -oE "(secrets|vars)\.[A-Z_]+" .github/workflows/deploy.yml | cut -d. -f2 | sort -u | grep -v GITHUB_TOKEN); do grep -q "$n" docs/deploy.md || { echo "missing $n"; exit 1; }; done` exits 0 (D7) — fdc7d93
- [x] 5.2 `for f in Dockerfile deploy/nginx/default.conf deploy/compose.yaml deploy/traefik/compose.yaml deploy/server/deploy.sh scripts/smoke-image.sh scripts/verify-dist.mjs .github/workflows/deploy.yml; do grep -qF "$f" docs/deploy.md || { echo "missing $f"; exit 1; }; done` exits 0 (D7) — fdc7d93
- [x] 5.3 `! grep -nE "@gmail|\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" docs/deploy.md | grep -vE "127\.0\.0\.1|0\.0\.0\.0"` exits 0 (Guardrails) — fdc7d93
- [x] 5.4 `grep -q "docs/deploy.md" CLAUDE.md && grep -q "docs/deploy.md" README.md && ! grep -q "No PWA manifest, service worker, Dockerfile or CI workflow exists yet" CLAUDE.md` exits 0 (D7) — fdc7d93
- [x] 5.5 `npm test` exits 0 (D8) — fdc7d93
#### Manual Verification:
- [x] 5.6 the critic follows `docs/deploy.md` against the repo files: every path, port, network name, env name, secret name, image name and command matches `Dockerfile`, `deploy/`, `scripts/` and the workflow; the one-time setup order works on a fresh Ubuntu 24.04 server with key-only SSH, `ufw` and an `AllowUsers` list; the text follows ASD-STE100 (D7) — fdc7d93

## Slice details

### Phase 1: Manifest, icons and service worker build
Changes required:
- Add `vite-plugin-pwa` `2.0.0` (exact version, `devDependencies`) with `npm install --save-dev --save-exact vite-plugin-pwa@2.0.0`.
- `vite.config.ts`: add `VitePWA` with `strategies: 'generateSW'`, `registerType: 'prompt'`, `injectRegister: false` (phase 2 registers it from code), `useCredentials: true`, `includeAssets` as needed, and the manifest of D1 (`name`, `short_name`, `description` in Polish from `PRODUCT.md`, `id`, `start_url`, `scope`, `display`, `lang`, `dir: 'ltr'`, both colors, the three icons with separate `purpose` values). `workbox`: `globPatterns` that cover `js,css,html,woff2,svg,png,webmanifest` (the default covers only js, css and html; the fonts in `public/fonts/` must be precached), `navigateFallback: 'index.html'`, `cleanupOutdatedCaches: true`. Do not precache the font `LICENSE-*.txt` files. Keep the Vitest `test` block working.
- Icons: `public/icons/pwa-192x192.png`, `public/icons/pwa-512x512.png`, `public/icons/maskable-512x512.png`. Make them once from SVG sources with ImageMagick and commit the PNGs. Keep the sources and the commands in `scripts/icons/` (for example `scripts/icons/make-icons.sh` and a full-bleed maskable SVG source), so the icons can be made again. The `any` icons may keep the rounded square of `favicon.svg`; the maskable one is a full square in `#121314` with the barbell scaled into the safe zone.
- `scripts/verify-dist.mjs`: plain Node (no dependency), takes the dist directory as its first argument, runs every check in row 1.1, prints one line per check, exits 1 when any check fails. Read the precache list from `sw.js` without executing it.
- `DESIGN.md`: a short „Ikona aplikacji” section under Components (Polish, like the rest of the file): the barbell from `favicon.svg`, chalk on guma, the maskable rule, no other icon style.
Slice guardrails: no change in `src/`; `index.html` keeps its current tags (the plugin adds the manifest link).

### Phase 2: Register the service worker and apply updates safely
Changes required:
- `src/pwa/`: the update policy as a small, testable module (for example a pure decision function plus a composable that wraps `useRegisterSW` from `virtual:pwa-register/vue`). Rules: register the service worker at start; when a new version waits, apply it with `updateServiceWorker(true)` only while `App.vue` shows the plan list and no workout view is active; otherwise wait and apply it the next time that state is reached; apply at most once; call `registration.update()` when `document.visibilityState` becomes `visible`. No visible UI text.
- Wire it in `src/App.vue` (or `src/main.ts`) with the real screen state. Add the type reference for the virtual module (for example `vite-plugin-pwa/vue` in the `types` of `tsconfig.app.json`).
- Tests in `src/pwa/*.test.ts` and `src/components/App.test.ts` that mock the virtual module; drive the real App for 2.2 (start a workout from a saved plan, signal a waiting update, finish or end the workout, return to the list).
- A reload while a delete dialog is open on the plan list is acceptable.
Slice guardrails: do not change `src/workout/` or `src/plans/`; read the workout state through what `App.vue` already uses.

### Phase 3: Docker image with nginx
Changes required:
- `Dockerfile`: multi-stage. Build stage on a pinned `node:22-alpine` tag: `npm ci`, `npm run build`. Final stage on a pinned `nginxinc/nginx-unprivileged` alpine tag: copy `dist/` and `deploy/nginx/default.conf`, listen on 8080, run as the image's non-root user. Add the label `org.opencontainers.image.source=https://github.com/marcinLuk/training` so GHCR links the package to the repo. Check that the tags exist (`docker pull` works) before you pin them.
- `.dockerignore`: keep `node_modules`, `dist`, `.git`, `context`, local env files and screenshots out of the build context.
- `.gitattributes`: force LF line endings for `*.sh`, `Dockerfile`, `*.conf`, `*.yaml`, `*.yml` and `*.mjs`. This checkout has `core.autocrlf=true`, so without it git writes these files back with CRLF, and bash and nginx fail on a CRLF file. After you add it, confirm with `git check-attr eol -- scripts/smoke-image.sh Dockerfile deploy/nginx/default.conf`.
- `deploy/nginx/default.conf`: the rules of D4; `server_tokens off`; `try_files $uri $uri/ =404` (no SPA rewrite: the app has no router); gzip for text types; the same security headers in every `location` (an `add_header` in a `location` cancels the server-level ones), with `always`: `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer`, `X-Robots-Tag: noindex, nofollow`. Fonts, icons and `favicon.svg` have no hash in their names: give them `no-cache`.
- `scripts/smoke-image.sh`: as row 3.1. Image tag `trening:smoke` by default (an optional first argument may set another tag, so CI can reuse the built image). Use `set -euo pipefail` and a `trap` that removes the container.
Slice guardrails: no Basic auth in the image (Traefik does it on the server); no change in `src/`.

### Phase 4: Server files and CI workflow
Changes required:
- `deploy/traefik/compose.yaml`: a pinned Traefik v3 image; ports 80 and 443 published (the only published ports on the server); the docker provider with `exposedByDefault=false` on the external network `traefik`; entry point `web` (:80) that redirects to `websecure` (:443); a Let's Encrypt resolver `letsencrypt` with the HTTP challenge on `web`, the e-mail from `${ACME_EMAIL:?…}` (a server-side `.env`), storage in a mounted `letsencrypt/acme.json`; the Basic auth users directory mounted read-only (for example `./auth:/etc/traefik/auth:ro`); the Docker socket read-only; no dashboard.
- `deploy/compose.yaml`: service `app`, image `ghcr.io/marcinluk/training:${TRENING_TAG:-latest}`, `restart: unless-stopped`, no `ports`, the external network `traefik`, `read_only: true`, tmpfs `/tmp`, `cap_drop: [ALL]`, `security_opt: [no-new-privileges:true]`, and Traefik labels: router rule ``Host(`trening.marcinlukaszek.pl`)``, entry point `websecure`, `tls.certresolver=letsencrypt`, a `basicauth` middleware with `usersfile` pointing at the mounted users file, service port 8080.
- `deploy/server/deploy.sh`: `set -euo pipefail`; takes the tag as `$1`; accepts only `^[0-9a-f]{40}$`; app directory from `TRENING_DIR` (default `/opt/trening`); pulls the tag first with `TRENING_TAG=<sha> docker compose pull app`, then writes `TRENING_TAG=<sha>` to `$TRENING_DIR/.env` (write to a temp file and move it), then `docker compose up -d app`; prints what it did; never runs anything from its input. It is meant to run as root through a narrow `sudo` rule from a forced `command=` in the deploy user's `authorized_keys` (the guide in phase 5 shows the lines).
- `deploy/server/deploy.test.sh`: the cases of row 4.1, with a stub `docker` script in a temp dir that logs its arguments.
- `.github/workflows/deploy.yml`: `on: push: branches: [main]` and `workflow_dispatch`; top-level `permissions: contents: read`; `concurrency` for deploys (no cancel in progress). Job `test`: checkout, setup-node 22 with npm cache, `npm ci`, `npm test`, `npm run build`, `node scripts/verify-dist.mjs dist`. Job `image` (`needs: test`, `permissions: packages: write`): `bash scripts/smoke-image.sh`, `docker/login-action` to `ghcr.io` with `GITHUB_TOKEN`, tag and push `ghcr.io/<lowercase owner>/training:${{ github.sha }}` and `:latest` (lowercase the owner in shell; `github.repository_owner` is `marcinLuk`). Job `deploy` (`needs: image`, `if: vars.DEPLOY_ENABLED == 'true'`): write the key from `secrets.DEPLOY_SSH_KEY` and the host key from `secrets.DEPLOY_KNOWN_HOSTS` to temp files with mode 600, `ssh -i <key> -o StrictHostKeyChecking=yes -o UserKnownHostsFile=<file> "${{ secrets.DEPLOY_USER }}@${{ secrets.DEPLOY_HOST }}" "${{ github.sha }}"`; never print a secret.
Slice guardrails: no server contact, no `docker push` or `docker login` from this machine; the workflow is written, not run.

### Phase 5: Deploy guide and project docs
Changes required:
- `docs/deploy.md` in ASD-STE100 English (CLAUDE.md rule for `docs/`). Sections: how the parts connect (GitHub Actions → GHCR → SSH forced command → `deploy.sh` → Docker Compose → Traefik with TLS and Basic auth → nginx); what lives in the repo and what lives only on the server (`.env` with `ACME_EMAIL`, the `htpasswd` users file, `acme.json`, the deploy key); one-time server setup in order (DNS A record `trening` → `<SERVER_IP>`; install Docker Engine and the compose plugin from Docker's apt repository; the `ufw` and Docker note: only Traefik publishes ports; `docker network create traefik`; the Traefik folder, `.env`, `acme.json` with mode 600, the users file made with `htpasswd -nB` from a container, start Traefik; the app folder `/opt/trening` with `compose.yaml` and a root-owned `deploy.sh`; the `deploy` user, its key pair made on the local machine, the forced `command=` line with `no-pty`, `no-port-forwarding` and the other restrictions, the `sudoers` drop-in checked with `visudo -c`, and adding the user to `AllowUsers` in the SSH server config); GHCR package visibility (public, or a `docker login` with a read-only token on the server); GitHub setup (each secret and the `DEPLOY_ENABLED` variable, with `gh secret set` / `gh variable set` examples and how to get the `known_hosts` line safely); first release and checks (`curl -I -u …` for the headers, install on the phone, `chrome://webapks`, offline start); daily use and rollback (deploy an older SHA); the Basic auth update caveat from `research.md` §6 and its workaround; a troubleshooting table; security notes. Use placeholders for every server-only value. Two facts from the phase 4 files: the `sudoers` rule must keep the default `env_reset` and must not grant `SETENV`, because `deploy.sh` reads `TRENING_DIR` from its environment; the Basic auth users file must be named `auth/users` in the Traefik folder, because the app labels point at `/etc/traefik/auth/users`. Read `deploy/` and the workflow for every other name.
- `CLAUDE.md`: rewrite the "Deployment" section to describe what now exists and point to `docs/deploy.md`; add `scripts/verify-dist.mjs` and `scripts/smoke-image.sh` to the commands.
- `README.md`: a short "Deploy" section that points to `docs/deploy.md`.
Slice guardrails: no change outside `docs/`, `CLAUDE.md` and `README.md`.
