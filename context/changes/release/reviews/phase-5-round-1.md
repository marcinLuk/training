# Phase review — release · Phase 5: Deploy guide and project docs · round 1

- **Scope:** `docs/deploy.md`, `CLAUDE.md`, `README.md` · **Files reviewed:** 3 (`+682/-3`; `docs/deploy.md` is new, 665 lines)
- **Contract:** `context/changes/release/brief.md` → `### Phase 5` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker none (no browser items), prover sonnet ×1

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 5.1 | every workflow secret and variable is named in the guide | `for n in $(grep -oE "(secrets\|vars)\.[A-Z_]+" .github/workflows/deploy.yml \| cut -d. -f2 \| sort -u \| grep -v GITHUB_TOKEN); do grep -q "$n" docs/deploy.md \|\| { echo "missing $n"; exit 1; }; done` | pass (exit 0, empty log) |
| 5.2 | every deploy file is named in the guide | `for f in Dockerfile deploy/nginx/default.conf … .github/workflows/deploy.yml; do grep -qF "$f" docs/deploy.md \|\| …; done` | pass (exit 0, empty log) |
| 5.3 | no e-mail or IP address in the guide | `! grep -nE "@gmail\|\b([0-9]{1,3}\.){3}[0-9]{1,3}\b" docs/deploy.md \| grep -vE "127\.0\.0\.1\|0\.0\.0\.0"` | pass (exit 0). A read of the full guide also found no e-mail, IP, admin name or password; `marcinLuk` is the public GitHub owner already in `git remote` and the Dockerfile label |
| 5.4 | CLAUDE.md and README.md point to the guide; the stale sentence is gone | `grep -q "docs/deploy.md" CLAUDE.md && grep -q "docs/deploy.md" README.md && ! grep -q "No PWA manifest, …" CLAUDE.md` | pass (exit 0) |
| 5.5 | `npm test` (suite-baseline vitest, 0 failing) | `npm test` | pass — `Test Files  20 passed (20)` · `Tests  439 passed (439)`; 0 failing = baseline 0; no skip line |

### Manual (no walker: the item is a reading check; done by the coordinator, with prover experiments; spot-checked: E3 re-run)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 5.6 | the guide matches the repo files; the setup order works on a fresh Ubuntu 24.04 server with key-only SSH, `ufw` and `AllowUsers`; ASD-STE100 | passed | Read side by side with `Dockerfile`, both compose files, `deploy.sh`, the nginx files and the workflow: paths (`/opt/traefik`, `/opt/trening`, `auth/users` → `/etc/traefik/auth/users`, `letsencrypt/acme.json` → `/letsencrypt/acme.json`), port 8080, network `traefik`, env names (`ACME_EMAIL`, `TRENING_TAG`, `TRENING_DIR`), the 4 secrets + `DEPLOY_ENABLED`, image `ghcr.io/marcinluk/training`, container `trening-app-1` (project `trening` + service `app`), the deploy.sh messages and exit codes all match. E3 ran the guide's own `authorized_keys` and `sudoers` lines on ubuntu:24.04 (openssh 9.6p1, sudo 1.9.15p5, adduser 3.137) with `AllowUsers admin` + key-only: all step 10–12 outputs are the ones the guide promises. E1, E4, E5, E6 confirm the compose error text, the htpasswd pipeline, Traefik's reading of the users file and the `gh` syntax. External claims checked against Docker, GitHub and Traefik docs (see Experiments). One sentence of 27 words; the rest is short, active and listed. Three Minor text defects below |

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | repo checks: compose config, deploy.test.sh | prover | `traefik config exit 0`; no e-mail → `required variable ACME_EMAIL is missing a value: Set ACME_EMAIL in the server-side .env file`; `app config exit 0`; `deploy.test: 22 cases, 0 failed` | the error text the guide quotes (step 6, troubleshooting) is real |
| E2 | the guide's CRLF check and asset-name command on local files | prover | `deploy/server/deploy.sh:0` … `deploy/nginx/default.conf:0`; `grep -o '/assets/[^"]*\.js' dist/index.html` → `/assets/index-Bp2S2u5U.js` | CRLF check works; the asset grep prints a path that already starts with `/assets/` (finding `asset-check-path-doubled`) |
| E3 | guide steps 8–12 in an ubuntu:24.04 container with a local sshd (no ssh from the host) | prover; re-run by coordinator (spot-check) | `parsed OK` ×4; `(root) NOPASSWD: /opt/trening/deploy.sh *`; `allowusers admin` / `allowusers trening-deploy`; `not-a-sha` → `deploy: refused: …` `exit code: 2`; `0000…` → `deploy: pulling image tag 0000…`, docker error, `exit code: 1`, no `.env`; `id` → refused, 2; `$(touch /tmp/pwned)`, `a; touch …`, backticks, two words, no command → all refused, `/tmp/pwned` absent; `-tt` → `PTY allocation request failed on channel 0`; `SetEnv TRENING_DIR` → `storing TRENING_TAG in /opt/trening/.env`; `TRENING_DIR=/tmp sudo …` → still `/opt/trening`; `sudo TRENING_DIR=/tmp …` → `sudo: sorry, you are not allowed to set the following environment variables: TRENING_DIR`; `sudo /bin/id` → `a password is required`; deploy user cannot write `/opt/trening` or `deploy.sh`; keyscan fingerprint = console fingerprint `SHA256:d0KC…` | the forced command, quoting, `restrict`, `env_reset`/no `SETENV`, root ownership and the AllowUsers step work exactly as written. The `-L` forwarding probe hit its timeout (`exit code: 124`) — inconclusive, not used |
| E4 | the guide's `htpasswd -nBi` pipeline | prover | `basicuser:<hash>` + one empty line; prefix `$2y$05$`; `Password for user basicuser correct.` | the file has the bcrypt format the guide describes |
| E5 | Traefik v3.6.7 reads that file (file provider, no ACME, 127.0.0.1:4196) | prover | `no creds: 401` · `right creds: 502` (passed auth, dummy backend) · `wrong creds: 401`; log `Authentication succeeded` | Traefik accepts the users file, the trailing empty line included |
| E6 | `gh` syntax | prover | `-b, --body … (reads from standard input if not specified)`; `-R, --repo`; `-r, --ref`; `gh variable delete` exists | every `gh` command in the guide is valid |
| W1 | GHCR visibility (GitHub docs) | coordinator | personal package "default visibility is private"; inherits "access permissions (but not the visibility)"; "Once you make a package public, you cannot make it private again"; Package settings → Danger Zone → Change visibility → type the name | steps 14 and 16 are right |
| W2 | Docker on Ubuntu (Docker docs) | coordinator | `/etc/apt/keyrings/docker.asc`, deb822 `docker.sources`, the same 5 packages; ports published by Docker "bypass your firewall rules" | step 3 and step 4 match the official text |
| W3 | Traefik ACME (Traefik docs) | coordinator | "A certificate resolver requests certificates for a set of domain names inferred from routers"; new domains use the default cert "until Traefik is restarted" | issuance follows router configuration, not the first request (finding `cert-issue-timing-contradiction`) |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | every secret, variable, file, path and command is written down where the owner looks |
| D2 | All documentation types covered? | pass with Minor | guide, CLAUDE.md, README.md all updated; the guide never says server-side copies need a re-copy when the repo files change |
| D3 | Understandable, no wrong commands? | Minor ×2 | the asset check doubles `/assets/`; the certificate timing is stated two ways |
| I1 | Satisfies the requirements? | pass | every section and both phase-4 facts the slice lists are present; CLAUDE.md Deployment rewritten, commands added; README Deploy section added |
| I2 | Logically correct? | pass | step order works on a fresh server (E3); first push → make public → set variable → dispatch matches the workflow's `if:` |
| I3 | Unnecessary complexity? | n/a | docs only |
| I4 | Robust? | pass | the guide checks each step (visudo, `sshd -t`, keep the session open, keyscan vs console) |
| I5 | Performant? | n/a | docs only |
| I6 | Secure? | pass with Minor | no private data; security steps are tight (E3); the socket note understates what `:ro` means |
| I7 | Observable? | pass | troubleshooting table names the log commands for each failure |
| I8 | New dependencies? | n/a | no manifest change |
| ARCH | Project rules | pass | public-repo rule: placeholders only (5.3 + read); docs/ in ASD-STE100; slice guardrail "no change outside docs/, CLAUDE.md, README.md" met (other dirty paths are baseline or orchestrator files); no server contact in this phase |

Blockers: 0 · Major: 0 · Minor: 4 · Nit: 0
Findings going back to a builder: none.

## Findings

### D3. Documentation understandable, no significant typos?

- **[Minor]** `asset-check-path-doubled` — `docs/deploy.md:558-562` — the first command prints a path that already starts with `/assets/` (E2: `/assets/index-Bp2S2u5U.js`), and the text says "Replace `<file>` … with that name" inside `…/assets/<file>`. **Fails when:** the owner pastes the printed value as told → `https://…/assets//assets/index-….js` → nginx merges slashes to `/assets/assets/…` → `404`, not the expected `200` with `immutable`. Fix idea: `grep -o 'assets/[^"]*\.js'` and `…/<file>`, or say "the part after `/assets/`". (confidence: medium — a careful reader may strip the prefix.)
- **[Minor]** `cert-issue-timing-contradiction` — `docs/deploy.md:513` — "The first HTTPS request makes Traefik ask Let's Encrypt for the certificate." Line 257 says the request happens "when the app runs for the first time", and Traefik docs (W3) tie issuance to routers in the configuration. Traefik has no on-demand issuance. **Fails when:** the first issuance fails (rate limit, DNS); the owner waits for a request to trigger a retry instead of reading the Traefik log right after `deploy.sh` starts the container. (confidence: medium.)

### D2. All relevant documentation types covered?

- **[Minor]** `server-files-resync-missing` — `docs/deploy.md:591-597` ("Daily use") — the workflow deploys only the image. `/opt/trening/compose.yaml`, `/opt/trening/deploy.sh` and `/opt/traefik/compose.yaml` are manual copies (steps 6 and 8). The guide never says to copy them again when the repo versions change. **Fails when:** a later commit changes a Traefik label or `deploy.sh` → CI is green, the server keeps the old file, and the change silently does not apply.

### I6. Secure?

- **[Minor]** `docker-socket-ro-misleading` — `docs/deploy.md:658` — "Traefik mounts `/var/run/docker.sock` read-only … Even read-only access is a strong right." A `:ro` bind mount of a Unix socket does not limit the Docker API: a process that can connect can create containers, which is root on the host. The advice itself (pinned image, no socket in other containers) is right. **Fails when:** the owner reads "read-only" as a limit and later mounts the socket `:ro` into another container, thinking it is safe.

## Not reviewed

- Nothing ran against the real server, the domain, GitHub settings or GHCR (shared rules). Steps 1, 7, 12–17, section 7 and the phone install are checked by reading and against official docs only.
- systemd parts of step 10.4 (`systemctl reload ssh`) were not executed: the E3 container has no systemd; sshd was started directly. `sshd -t` and `sshd -T` ran.
- E3 used a stub `docker`; the real pull, `compose up` and Traefik label routing on the server were not exercised (phases 3–4 cover the image and files).
- The `-L` port-forwarding probe in E3 timed out (124): inconclusive. `restrict` + `no-port-forwarding` is documented OpenSSH behaviour.
- ASD-STE100 was checked by reading and a sentence-length scan (one sentence of 27 words at line 372); no word-list audit.

## Observations outside scope

- `CLAUDE.md:61` "Code layout" still lists only `src/plans/`, `src/components/`, `src/styles/`; `src/pwa/` and `src/workout/` exist. Pre-existing; not this slice's rows.
