# To test: release — Prepare the app for the test server

Implemented 2026-10-24 · 5 slices · commits `bd9cd5d`…`fdc7d93`
Brief: `brief.md` · run record: `workbench.md` · code reviews: `reviews/`

**Nobody walked this change end to end on the real server or on the phone.** No agent was allowed to touch the server. You walk the path below.

## What changed

The app is now an installable PWA. It works offline after the first load, and it updates by itself only when the plan list is on screen and no workout runs. The repo now has a Docker image (nginx), the server files (Traefik, app compose, `deploy.sh`) and a GitHub workflow that tests the app, pushes the image to GHCR and deploys it over SSH. `docs/deploy.md` lists every step for the server and GitHub.

### What changed underneath (no visible effect)

- `scripts/verify-dist.mjs` checks the build output (manifest, icons, precache list).
- `scripts/smoke-image.sh` builds and checks the Docker image locally (67 checks).
- `deploy/server/deploy.test.sh` tests `deploy.sh` with a fake `docker` (22 cases).
- `.gitattributes` keeps LF line endings for shell, YAML, nginx and Docker files.

## Before you start

- Read `docs/deploy.md` once, from start to end.
- You need: SSH access to the server as your admin user, access to the DNS panel, the GitHub CLI (`gh`) logged in on your computer, and an Android phone with Chrome.
- Local check first (optional, takes about 2 minutes): `npm test`, `npm run build && node scripts/verify-dist.mjs dist`, `bash scripts/smoke-image.sh`.
- Starting state: the server has no Docker, no `trening` DNS record; the repo has no GitHub secrets or variables; 18 local commits on `main` are not pushed yet (12 from earlier work, 6 from this run).

## Path

Legend: `[ ]` to check · `[x]` checked, works · `[!]` checked, does not work (details in "Walkthrough notes") · `[-]` skipped on purpose

| Status | # | Step | Expected result | Checked by |
| :-- | :-- | :-- | :-- | :-- |
| `[ ]` | 1 | `docs/deploy.md` Step 1: add the A record `trening` → your server IP | `getent hosts trening.marcinlukaszek.pl` on your computer shows the server IP | **nobody** (owner-run) |
| `[ ]` | 2 | Steps 2–5: install Docker, check `ufw`, create the `traefik` network | `docker run hello-world` works; `docker network ls` lists `traefik` | **nobody** (owner-run) |
| `[ ]` | 3 | Step 6: set up Traefik in `/opt/traefik` (`.env` with `ACME_EMAIL`, `acme.json` mode 600, `auth/users` from `htpasswd -nBi`) and start it | `docker compose ps` in `/opt/traefik` shows Traefik `running` | **nobody** (owner-run); the users-file format was checked by the critic in a container (`reviews/phase-5-round-1.md`) |
| `[ ]` | 4 | Step 7: check that Traefik answers on port 80 | `curl -I http://trening.marcinlukaszek.pl/` returns a 301 or 308 redirect to https | **nobody** (owner-run) |
| `[ ]` | 5 | Steps 8–10: app folder `/opt/trening`, root-owned `deploy.sh`, `deploy` user with the forced command and the sudoers drop-in, `AllowUsers` updated | `sudo visudo -cf` reports OK; `sudo sshd -t` reports nothing | **nobody** on the real server; the same lines were tested in an `ubuntu:24.04` container by the critic (`reviews/phase-5-round-1.md`) |
| `[ ]` | 6 | Step 11: from your computer, call the deploy key with a bad value and with an unknown SHA | bad value: refused, no docker call; unknown SHA: the pull fails and the old tag stays | **nobody** on the real server; `deploy.sh` logic checked by `deploy.test.sh` (critic, `reviews/phase-4-round-1.md`) |
| `[ ]` | 7 | Steps 12–14: get the host key line safely (compare the fingerprint on the server console), set the 4 secrets; do NOT set `DEPLOY_ENABLED` yet | `gh secret list` shows `DEPLOY_HOST`, `DEPLOY_USER`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` | **nobody** (owner-run) |
| `[ ]` | 8 | Step 15: `git push` | Actions: job `test` green, job `image` green, job `deploy` skipped | **nobody**; the workflow was only parsed and read (critic, `reviews/phase-4-round-1.md`) |
| `[ ]` | 9 | Step 16: make the GHCR package `training` public | the package page shows "Public"; `docker pull ghcr.io/marcinluk/training:latest` works without a login | **nobody** (owner-run) |
| `[ ]` | 10 | Step 17: set `DEPLOY_ENABLED=true` and run the workflow | job `deploy` green; on the server `docker compose ps` in `/opt/trening` shows `app` running | **nobody** (owner-run) |
| `[ ]` | 11 | Section 7: `curl -I` without credentials, then with `-u <basic-user>` on `/`, `/manifest.webmanifest`, `/sw.js` and one `/assets/` file | 401 without credentials; with them: 200, a valid certificate, `cache-control: no-cache` on `/`, the manifest and `sw.js`; `application/manifest+json`; `immutable` on the asset | **nobody** on the real server; the same headers were checked locally by `smoke-image.sh` (critic, `reviews/phase-3-round-1.md`) — see note on the asset command below |
| `[ ]` | 12 | Open the app in Chrome on the phone, log in, open the menu, install it | Chrome offers "Install app"; the home screen gets the barbell icon on a dark background | **nobody** (needs the phone); the manifest and icons were checked by the critic (`reviews/phase-1-round-1.md`) |
| `[ ]` | 13 | On the phone, open `chrome://webapks` | "Trening" is listed (a real WebAPK, not a shortcut) | **nobody** (needs the phone) |
| `[ ]` | 14 | Open the installed app, create a plan with a Polish name, then turn on airplane mode, close and open the app | the app opens offline and shows the plan; a workout can start | critic, on `vite preview` in a desktop browser at 412×915 (`reviews/phase-2-round-1.md`); **nobody** on the phone |
| `[ ]` | 15 | Run a short workout on the phone (rest of 15 s): lock the screen during a rest, unlock | the screen stays on while the app is open; after unlock you are on the same set and rest; the end-of-rest sound plays | **nobody** (needs the phone; D10a–c of the MVP were never walked either) |
| `[ ]` | 16 | Make a small change, push it; start a workout on the phone before the deploy finishes | during the workout nothing reloads; after the end screen and back on the plan list, the app reloads once with the new version | **nobody** on the phone; the policy is pinned by Vitest tests (critic, `reviews/phase-2-round-1.md`) |
| `[ ]` | 17 | Section 8: roll back with `sudo /opt/trening/deploy.sh <older-sha>` | `app` restarts on the older image; the site serves the older version | **nobody** (owner-run) |

## Owner-run — not executed by the loop

The whole real deploy is yours, because the owner forbade any agent contact with the server. Steps 1–13 and 17 above are this work. What each one needs:

| Status | # | What | What you need |
| :-- | :-- | :-- | :-- |
| `[ ]` | O1 | DNS record `trening` | the DNS panel |
| `[ ]` | O2 | Server setup (Docker, Traefik, app folder, deploy user) | SSH as your admin user with sudo |
| `[ ]` | O3 | GitHub secrets, `DEPLOY_ENABLED`, GHCR visibility | `gh` logged in; repo admin rights |
| `[ ]` | O4 | First push and first deploy | the 18 local commits; the secrets from O3 |
| `[ ]` | O5 | Install and offline test on the phone | Android phone with current Chrome |

## Steps nobody checked

- [ ] **1–10, 17** The real server setup and deploy — no agent may touch the server.
- [ ] **8, 10** The GitHub workflow has never run. It was parsed and read only (no `actionlint` on this machine).
- [ ] **11** HTTPS, the Let's Encrypt certificate and Basic auth through Traefik on the real host.
- [ ] **12–13** PWA install behind Basic auth and the WebAPK check — an open question in `research.md`.
- [ ] **14–16** Offline start, the screen lock, the sound and the silent update on a real phone.

## Watch out for

- **Before you start the server setup, check one thing on your computer.** In this run, one builder wrote the guide with a shell heredoc by mistake. For a moment, parts of the guide text ran as shell commands on this computer. Afterwards, no push, no GitHub secret, no variable and no workflow run existed. Also, no stray file existed in the repo or in your home folder. Nobody checked `~/.ssh` (it is off limits for agents). Run `ls -l ~/.ssh/trening_deploy*`. If a file exists that you did not make, delete it and make the key again in Step 9. Also, one `curl` or `getent` line may have reached your domain once (a harmless read).
- Fixed after the run: the asset check command in `docs/deploy.md` section 7 no longer doubles `/assets/` (`asset-check-path-doubled`). Section 8 now has "When the server files change", which tells you to copy `deploy/compose.yaml`, `deploy/server/deploy.sh` and `deploy/traefik/compose.yaml` to the server again before you push a commit that changes them (`server-files-resync-missing`).
- The guide says the first HTTPS request triggers the certificate. Traefik asks for it when it finds the app router (`cert-issue-timing-contradiction`). Wait a minute after step 10.
- A `:ro` mount of the Docker socket does not limit the Docker API. Traefik can still control Docker (`docker-socket-ro-misleading`).
- An update reload can happen the moment a workout expires. This drops the "Trening wygasł…" note and an open delete dialog (`update-reload-drops-expired-notice`).
- With Basic auth, Chrome forgets the password after the browser process ends. The app still opens offline, but updates stop silently. To get updates again, open the URL in a normal Chrome tab, log in, then open the installed app again.
- The other Minor and Nit findings are your call: `icon-png-date-chunks-kept`, `precache-duplicate-entries`, `vacuous-no-registration-assertion`, `hook-test-unproduced-screen-state`, `base-image-50x-page-served`, `smoke-first-header-only`, `env-write-atomicity-unpinned`, `trening-dir-trusted-from-env` (the guide's sudo rule covers it), `concurrency-comment-overstates-order`, `ci-verify-dist-not-on-image`, `hardening-flags-duplicated`, `claude-md-code-layout-stale`, `actions-not-sha-pinned`, `traefik-docker-api-compat-unverified`.

## If something does not work

- Server logs: `docker compose logs` in `/opt/traefik` and in `/opt/trening`.
- CI logs: the Actions tab, or `gh run view --log`.
- Troubleshooting table: `docs/deploy.md` section 9.
- Undo in the repo: `git revert fdc7d93 48f4160 b46ed30 6c5b55d bd9cd5d` (newest first).
- Round reports: `reviews/phase-<N>-round-1.md` and `reviews/goal-review.md`.

## Walkthrough notes

Empty at the start. The `/10x-walkthrough` skill adds one line per step marked `[!]` or `[-]`:
`- **step <n>** — <date> — <what happened / why it was skipped>`

## Sign-off

- [ ] I walked the whole path and it works
- [ ] The path works, but I have notes: <write here>
- [ ] It does not work: <step and what happened>

After the walk: `change.md` → `status: implemented`, then `/10x-archive release`.
