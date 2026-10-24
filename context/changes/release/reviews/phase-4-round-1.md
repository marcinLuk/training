# Phase review — release · Phase 4: Server files and CI workflow · round 1

- **Scope:** `.github/workflows/deploy.yml`, `deploy/compose.yaml`, `deploy/server/deploy.sh`, `deploy/server/deploy.test.sh`, `deploy/traefik/compose.yaml` · **Files reviewed:** 5 (`+451/-0`)
- **Contract:** `context/changes/release/brief.md` → `### Phase 4` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none (no manual items), prover sonnet ×1

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 4.1 | deploy.sh cases | `bash deploy/server/deploy.test.sh` | pass — `deploy.test: 22 cases, 0 failed` |
| 4.2 | compose files render | `ACME_EMAIL=owner@example.invalid docker compose -f deploy/traefik/compose.yaml config --quiet && docker compose -f deploy/compose.yaml config --quiet` | pass — exit 0, no output |
| 4.3 | workflow shape | `python3 -c "import yaml;…print('ok')"` | pass — prints `ok` |
| 4.4 | no private data | `! grep -rnE "BEGIN [A-Z ]*PRIVATE KEY\|@gmail\|[$]apr1[$]\|[$]2y[$]\|password *[:=] *[^ <$]" Dockerfile deploy scripts .github` | pass — exit 0, no match; files also read by hand (see I6) |
| 4.5 | suite unchanged | `npm test` | pass — `Test Files  20 passed (20)` · `Tests  439 passed (439)`; baseline 0 failing, 0 failing now, no skip line |

### Manual

None in this phase. No walker was spawned.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

Mutants are copies of `deploy/server/deploy.sh` in `<scratch>/critic-p4-r1/mutants/`, driven through the real test with `DEPLOY_SH=<mutant> bash deploy/server/deploy.test.sh`.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | regex without `^…$` anchors | prover-1 | exit 1 · `5 failed` · `FAIL  refused: SHA followed by '; rm -rf /': exit code 0, expected non-zero` | the anchors are pinned; the hostile-input cases catch a loose check |
| E2 | `.env` written before the pull | prover-1 | exit 1 · `2 failed` · `FAIL  failed pull: non-zero exit, old tag kept, no restart: stored tag is '0123…4567'` | the call order is pinned |
| E3 | `TRENING_TAG` not passed to compose | prover-1 | exit 1 · `1 failed` · `FAIL  valid SHA: the pull sees the new tag …: … tag=unset …` | the tag that reaches compose is pinned |
| E4 | uppercase hex accepted | prover-1 | exit 1 · `1 failed` · `FAIL  refused: uppercase SHA: exit code 0, expected non-zero` | lowercase-only is pinned |
| E5 | `.env` written directly (no temp file + `mv`) | prover-1, re-run by coordinator | exit 0 · `deploy.test: 22 cases, 0 failed` (both runs) | the "temp file, then move" clause is NOT pinned; the mutated line runs (case 1 asserts the stored tag is the new SHA) |
| E6 | `set -e` removed | prover-1 | exit 1 · `1 failed` · `FAIL  failed pull: non-zero exit, old tag kept, no restart: exit code 0` | stop-on-failed-pull is pinned |
| E7 | `$DIR` unquoted | prover-1 | exit 1 · `1 failed` · `FAIL  directory with a space in its name: exit 0, calls 2, tag '0123…4567'` | quoting is pinned |
| E8 | Traefik flag names, read from `traefik:v3.6.7 --help` (`--network none`, not run as a server) | prover-1 | `Version: 3.6.7` · each of the 13 flags used in the compose file found once in the help text | every static flag exists in v3.6.7 |
| E9 | rendered app compose with a real tag | prover-1 | exit 0 · `image: ghcr.io/marcinluk/training:0123…4567`, `read_only: true`, `tmpfs: - /tmp`, `cap_drop: - ALL`, `no-new-privileges:true`, no `ports` | matches `scripts/smoke-image.sh` (`--read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true`, port 8080) |
| E10 | rendered Traefik compose | prover-1 | exit 0 · ports 80 and 443 only, socket `read_only: true`, `auth` bind `read_only: true`, no `--api*` flag | dashboard and API are off |
| E11 | `ACME_EMAIL` unset | prover-1 | exit 1 · `required variable ACME_EMAIL is missing a value: Set ACME_EMAIL in the server-side .env file` | the guard works |

Middleware labels (`basicauth.usersfile`, `basicauth.removeheader`) were checked against the Traefik v3 basicAuth reference (context7, `/traefik/traefik`): both options exist; label keys are case-insensitive.

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | every file has a header with purpose, usage, env vars, secrets and server-only files |
| D2 | All doc types covered? | n/a | `docs/deploy.md` and the `CLAUDE.md`/`README.md` updates are D7, assigned to phase 5 |
| D3 | Docs understandable? | concerns | two comments overstate what the code does (Minor + Nit below) |
| I1 | Satisfies the requirements? | pass | every clause of "Changes required" maps to code; the extra `if: github.ref == 'refs/heads/main'` on `image`/`deploy` is incidental hardening for `workflow_dispatch` |
| I2 | Logically correct? | pass | pull → store → up order, refusal before any side effect, implicit `success()` in the `deploy` `if:` |
| I3 | No unnecessary complexity? | pass | one small `compose()` helper; no third-party SSH action |
| I4 | Robust? | pass | `set -euo pipefail`, temp file in the same folder then `mv`, trap removes it, missing `compose.yaml` stops early |
| I5 | Performant? | n/a | no loops or remote calls in a loop |
| I6 | Secure? | pass | secrets reach `run:` only through `env:`, no `set -x`/echo of secrets, key files mode 600 via `umask 077` and removed by trap, `StrictHostKeyChecking=yes`, `packages: write` only on `image`, `deploy` has `permissions: {}`, the pushed image is the one the smoke test checked; no IP, e-mail, user name or htpasswd line in any file (only the public owner `marcinluk` and the public app domain) |
| I7 | Observable? | pass | deploy.sh prints each step and the error reason to stderr; the output returns to the Actions log over SSH |
| I8 | New dependencies? | n/a | no manifest changed; `traefik:v3.6.7` is a pinned official image as the shared rules require |
| ARCH | Project rules | pass | see below |

Architecture — project rules:
- Guardrail "no secret or private server data in the repo" — meets (4.4 plus a manual read of all five files).
- Guardrail "Basic auth only on the server, the repo holds only the mount path" — meets (`./auth:/etc/traefik/auth:ro`, `usersfile=/etc/traefik/auth/users`).
- Guardrail "only `actions/checkout`, `actions/setup-node`, `docker/login-action`" — meets.
- Slice guardrail "no server contact, no push or login from this machine" — meets; nothing in the diff runs them locally.
- Trap "app container settings match the smoke test" — meets (E9 against `scripts/smoke-image.sh`).
- Out of scope "no change to `src/plans/`, `src/workout/` or UI" — meets; no `src/` file changed.

Blockers: 0 · Major: 0 · Minor: 2 · Nit: 1
Findings going back to a builder: none.

## Findings

### Test adequacy (I2)

- **[Minor]** `env-write-atomicity-unpinned` — `deploy/server/deploy.test.sh:72-112` — the slice asks deploy.sh to "write to a temp file and move it", but no case would fail if the script wrote `.env` directly. E5 replaced lines 46-48 with `printf … >"$DIR/.env"` and the suite stayed `22 cases, 0 failed`. **Fails when:** a later edit drops the temp file; a crash or full disk during the write then leaves an empty `.env`, and compose falls back to `latest` with no test noticing. A case that checks the `.env` inode changed (or that the stub sees no half-written file) would pin it.

### D3. Documentation understandable?

- **[Minor]** `trening-dir-trusted-from-env` — `deploy/server/deploy.sh:8-10,29` — the header says the script "trusts nothing", but it takes the app folder from `TRENING_DIR` in the environment and then runs `docker compose` on that folder's `compose.yaml` as root. This is safe only while the sudo rule resets the environment (sudo's default `env_reset`, no `SETENV`, no `env_keep` for `TRENING_DIR`). The header does not say so, and the phase-5 guide writes the sudo rule. **Fails when:** the owner's sudoers line keeps `TRENING_DIR`; the deploy user points it at a folder with its own `compose.yaml` and gets root. confidence: medium (depends on the phase-5 sudo rule).
- **[Nit]** `concurrency-comment-overstates-order` — `.github/workflows/deploy.yml:16` — the comment says runs happen "in the order the pushes came". GitHub keeps at most one pending run per concurrency group; a newer pending run cancels the older pending one. **Fails when:** three pushes land during one deploy; the middle run is cancelled, not run. The behaviour is fine (the newest commit wins); only the comment is wrong.

## Not reviewed

- The workflow was not run (slice guardrail). Its YAML shape is pinned by 4.3; the rest was judged by reading.
- Traefik routing at runtime (ACME, the redirect, Basic auth on a real request) was not exercised: the trap forbids running Traefik against the internet. Flag names (E8) and label names (context7) were checked.
- `actions/checkout@v4` and `actions/setup-node@v4` were not checked against GitHub's current runtime deprecations (no network check allowed for this). confidence: low that anything is wrong.

## Observations outside scope

- `CLAUDE.md` "Deployment (planned, not set up yet)" still says no CI workflow exists. The brief assigns this update to phase 5 (D7).
- `.github/workflows/deploy.yml:5` points to `docs/deploy.md`, which phase 5 creates.
- A first push to GHCR creates a private package. The server pulls without a token, so the owner must make the package public before the first deploy. The phase-5 guide should say this.
- The phase-5 guide must show a sudo rule that does not keep `TRENING_DIR` (see `trening-dir-trusted-from-env`), and a forced `command=` that passes `$SSH_ORIGINAL_COMMAND` as one quoted argument.
