# Phase review — release · Phase 3: Docker image with nginx · round 1

- **Scope:** `Dockerfile`, `.dockerignore`, `.gitattributes`, `deploy/nginx/default.conf`, `deploy/nginx/security-headers.conf`, `scripts/smoke-image.sh` · **Files reviewed:** 6 (`+400/-0`)
- **Contract:** `context/changes/release/brief.md` → `### Phase 3: Docker image with nginx` (contract mode: brief, Done-when D4, D8) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: none (no manual items), prover sonnet ×1

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 3.1 | Smoke test of the image (D4) | `bash scripts/smoke-image.sh` | pass |
| 3.2 | Unit and component tests (D8) | `npm test` | pass |

3.1 log tail (exit 0, 4 s; the build came from the layer cache, which is keyed on the current context):

```
ok    Server header = 'nginx'
ok    /assets/index-Bp2S2u5U.js Content-Encoding (gzip requested) = 'gzip'
ok    image user is '101' (not root)
ok    nginx processes run as 'nginx' (not root)
ok    container uid = '101'
smoke: 67 checks, 0 failed
smoke: all checks passed
```

3.2 log tail (exit 0). The baseline is 0 failing; this run has 0 failing and no skip line:

```
 Test Files  20 passed (20)
      Tests  439 passed (439)
```

### Manual

None in this slice.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

Every mutant image is `FROM trening:smoke` with one changed line in a copy of the config in the scratch dir. Each one ran through `SMOKE_PORT=4196 bash scripts/smoke-image.sh <tag> --no-build`. Helper and mutant copies: `<scratch-dir>/critic-p3-r1/prover-1/`.

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E10 | Canary: unchanged config through the same harness | prover | `SMOKE_EXIT=0`, `smoke: 67 checks, 0 failed` | The harness itself does not cause a red. |
| E1 | `/assets/` Cache-Control without `immutable` | prover | `SMOKE_EXIT=1` · `FAIL  /assets/index-Bp2S2u5U.js Cache-Control: expected 'public, max-age=31536000, immutable', got 'public, max-age=31536000'` | Exact match pins the immutable clause (trap 1). |
| E2 | SPA rewrite in `location /` | prover | `SMOKE_EXIT=1` · `FAIL  /does-not-exist.js status: expected '404', got '200'` | The 404 check goes through the same location as real files (trap 3). |
| E3 | Security-headers include removed from the workbox location only | prover, re-run by coordinator | `SMOKE_EXIT=1` · `FAIL  /workbox-2fbc6a65.js X-Robots-Tag: expected 'noindex, nofollow', got ''` (+ the same for `X-Content-Type-Options`, `Referrer-Policy`) | Per-location header loss is caught (trap 2). |
| E4 | `server_tokens on` | prover | `SMOKE_EXIT=1` · `FAIL  Server header: expected 'nginx', got 'nginx/1.31.7'` | The no-version clause is pinned. |
| E5 | `types { application/manifest+json webmanifest; }` removed | prover | `SMOKE_EXIT=1` · `FAIL  /manifest.webmanifest Content-Type: expected 'application/manifest+json', got 'application/octet-stream'` | The MIME clause is pinned. |
| E6 | `/sw.js` Cache-Control `no-cache, no-store` | prover | `SMOKE_EXIT=1` · `FAIL  /sw.js Cache-Control: expected 'no-cache', got 'no-cache, no-store'` | Exact match, not substring (trap 1). |
| E7 | Final image `USER 0` | prover | `SMOKE_EXIT=1` · `smoke: container exited before it answered.` · `nginx: [emerg] chown("/tmp/proxy_temp", 101) failed (1: Operation not permitted)` | A root image goes red, but through the hardening flags, not through the user checks. The user and process checks are not reached by this mutant. |
| E8 | No `workbox-*.js` in the image (a step fails mid-run) | prover | `SMOKE_EXIT=1` · `smoke: no file matches /usr/share/nginx/html/workbox-*.js in the image` · `LEFTOVER_SMOKE_CONTAINERS=[]` | Cleanup runs on an early exit (trap 7). |
| E9 | Port 4196 held by another container | prover | `SMOKE_EXIT=125` · `Bind for 127.0.0.1:4196 failed: port is already allocated` · `LEFTOVER_SMOKE_CONTAINERS=[]` · `OCCUPIER_STATE=true` | The run cannot test a container left on the port, and it does not remove a container it did not create (trap 4). |
| E11 | Final cleanup check | prover | `END` (no `trening-smoke*`/`critic-p3*` container or image) | No leftovers. |
| C1 | Startup log and served files of `trening:smoke`, hardened flags | coordinator | No `[warn]`/`[emerg]` line; only `10-listen-on-ipv6-by-default.sh: info: can not modify ... (read-only file system?)`. Files: `50x.html assets favicon.svg fonts icons index.html manifest.webmanifest sw.js workbox-2fbc6a65.js`. `ps`: every `nginx` row has user `nginx`. `/50x.html` → 200. | The `types` block merges with `mime.types` with no duplicate warning. The base image page `50x.html` stays in the web root. |
| C2 | `git check-attr eol` and CR count | coordinator | `eol: lf` for `scripts/smoke-image.sh`, `Dockerfile`, `deploy/nginx/default.conf`, `deploy/nginx/security-headers.conf`, `scripts/verify-dist.mjs`; `grep -c $'\r'` = 0 on each | `.gitattributes` works as the slice asks. |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented? | pass | The script has a usage header (tag, `--no-build`, `SMOKE_PORT`); the config comments say why each location exists. |
| D2 | All documentation types covered? | n/a | `docs/deploy.md` and the `CLAUDE.md` update belong to D7, a later slice. |
| D3 | Documentation understandable? | pass | No wrong path, command or name found. |
| I1 | Satisfies the requirements? | pass | Every D4 clause and every "Changes required" bullet maps to code and to a passing check; `--no-build` is a small, incidental addition for CI reuse. |
| I2 | Logically correct? | pass | All 10 locations return the headers they must (3.1 + E1–E6). |
| I3 | No unnecessary complexity? | pass | One snippet file removes ten copies of the headers. |
| I4 | Robust? | pass | `set -euo pipefail`, an EXIT trap, a unique container name, a readiness loop that stops on an exited container (E7, E8, E9). |
| I5 | Performant? | pass | gzip on text types (checked); one-year cache on hashed files. |
| I6 | Secure? | pass | Non-root uid 101, hardened run, no version in `Server`, no secret, IP or e-mail in the new files. |
| I7 | Observable? | pass | Every check prints one line; the container log is printed when it exits or does not answer. |
| I8 | New dependencies? | pass | No npm change. Base images are pinned official images (`node:22.23.4-alpine`, `nginxinc/nginx-unprivileged:1.31.7-alpine`). |
| ARCH | Project rules | pass | See below. |

Architecture — project rules:

- No change in `src/` (slice guardrail): meets — section C of the bundle shows no tracked-file diff outside `context/`.
- No Basic auth in the image: meets — no `auth_basic` in `deploy/nginx/`.
- Public-repo rule: meets — a scan for IP addresses, `@`, `password`, `secret` finds only `127.0.0.1`.
- Pinned official base images (shared rules): meets.
- Hardening flags equal to phase 4: meets — `--read-only --tmpfs /tmp --cap-drop ALL --security-opt no-new-privileges:true` at `scripts/smoke-image.sh:149-150`.
- Vite `base` stays `/`: meets — not touched.

Blockers: 0 · Major: 0 · Minor: 0 · Nit: 2
Findings going back to a builder: none.

## Findings

### I2. Logically correct?

- **[Nit]** `base-image-50x-page-served` — `Dockerfile:17` — `COPY --from=build /app/dist /usr/share/nginx/html` adds to the base image web root. It does not replace it, so the stock `50x.html` stays and nginx serves it. **Fails when:** a request for `/50x.html` → 200 with the stock nginx page (C1). No `error_page` uses it, so the effect is cosmetic only.

### Test adequacy

- **[Nit]** `smoke-first-header-only` — `scripts/smoke-image.sh:88-93` — `header_of` reads only the first header with a name. **Fails when:** a later config change sends a second `Cache-Control` (or a second `X-Robots-Tag`) line after a correct one → the check still passes. confidence: low — no current location does this.

## Not reviewed

- The user and process checks of the smoke script (`scripts/smoke-image.sh:219-236`) are not pinned by a mutant. With the hardening flags, a root image does not start (E7), so the run goes red before these checks. This review observed their input directly instead (C1: every `nginx` process runs as `nginx`).
- The image build ran from the Docker layer cache. The cache key is the current build context, so the result applies to the current tree.

## Observations outside scope

- `CLAUDE.md` still says "No PWA manifest, service worker, Dockerfile or CI workflow exists yet." This is now wrong. The brief gives this fix to D7, a later slice.
