# Goal review: release (all slices, bd2a0d0..fdc7d93)

Verdict: **CONCERNS**. All of D1–D8 are met. I found no Blocker and no Major. One Minor UX defect crosses two slices. The other findings are Nits.

## 1. Done when

| D | Result | Evidence (I ran each command once) |
|---|---|---|
| D1 | met | `npm run build && node scripts/verify-dist.mjs dist` → "ok manifest: …" ×5, "ok index.html: manifest link has crossorigin=\"use-credentials\"", "verify-dist: all 15 checks passed". `identify public/icons/*.png` → 512x512, 192x192, 512x512. The source is `public/favicon.svg` and `scripts/icons/maskable.svg` (the barbell is inside the 80 % circle, I checked the math). |
| D2 | met | verify-dist: "ok sw.js precache: index.html / every file in dist/assets/ / favicon.svg / every dist/fonts/*.woff2 / every manifest icon", "ok sw.js: navigation fallback to index.html". Browser walk with playwright-cli on `vite preview --port 4199`: SW ready, reload, offline, preview killed (`curl` → 000), reload → snapshot shows `heading "Plany"` and `button "Nowy plan"`. I did not save a plan offline. Registration: `src/App.vue:21-24`. |
| D3 | met | `npm test` → "Test Files 20 passed (20)", "Tests 439 passed (439)". The cases are in `src/pwa/updatePolicy.test.ts` (5), `src/pwa/useServiceWorkerUpdates.test.ts` (13) and `src/components/App.test.ts` (5: plan list, workout, end screen, editor, restored workout). Visible check: `src/pwa/useServiceWorkerUpdates.ts:48-57`. |
| D4 | met | `bash scripts/smoke-image.sh` → "smoke: 67 checks, 0 failed", "smoke: all checks passed", exit 0. I copied `/usr/share/nginx/html` out of `trening:smoke`: verify-dist passes on it and it is byte-identical to the local `dist/` (only nginx's own `50x.html` is extra). |
| D5 | met | `ACME_EMAIL=owner@example.invalid docker compose -f deploy/traefik/compose.yaml config --quiet && docker compose -f deploy/compose.yaml config --quiet` → exit 0. `bash deploy/server/deploy.test.sh` → "deploy.test: 22 cases, 0 failed". The image tag `traefik:v3.6.7` exists locally. |
| D6 | met | PyYAML parse → jobs `['test','image','deploy']`, needs `test` → `image` → `deploy`, on `push: main` + `workflow_dispatch`. Deploy gate: `.github/workflows/deploy.yml:74`. Push target: `ghcr.io/${OWNER,,}/training` (`:64-68`) = `ghcr.io/marcinluk/training`. Actions used: only checkout, setup-node, docker/login-action. |
| D7 | met | `docs/deploy.md` names all 4 secrets, `DEPLOY_ENABLED`, `ACME_EMAIL`, `TRENING_TAG` and every deploy file (§2 tables). `CLAUDE.md:104` and `README.md:40` link it. Grep finds no "not set up" and no "No PWA manifest". `DESIGN.md:264` "### Ikona aplikacji". |
| D8 | met | `npm test` 439 passed (415 before + 24 new). The only removed test line is the old `vitest` import. `npm run build` exit 0. |

Owner-run, not judged: the DNS record, the server setup (Docker, Traefik, users file, deploy user, sudoers, AllowUsers), the GitHub secrets and variable, making the GHCR package public, the real deploy, the certificate, and the install on the phone (`chrome://webapks`, offline start).

## 2. Cross-slice consistency

I checked these values across the build config, Dockerfile, nginx, the smoke script, both compose files, deploy.sh, the workflow and the guide. They all match:

- Port 8080 (Dockerfile, `default.conf:11`, smoke `:148`, Traefik label `compose.yaml:31`). User 101.
- The image name `ghcr.io/marcinluk/training`: workflow, `deploy/compose.yaml:11`, guide §1/§6. The OCI source label links the package to the repository.
- The users file path `/etc/traefik/auth/users` (label) ↔ `./auth:/etc/traefik/auth:ro` ↔ guide step 6.4. Network `traefik` is external in both compose files, and guide step 5 creates it. `acme.json` path and mode match.
- `TRENING_TAG`: compose default `latest`, deploy.sh writes `.env` and refuses `latest`, guide rollback uses the full SHA.
- CI pushes the image it tested: `smoke-image.sh "trening:ci"`, then tag and push `trening:ci`.
- Cache headers against the SW update path: `sw.js`, `/`, `index.html` and the manifest are `no-cache`. `workbox-2fbc6a65.js` has a content hash, so `immutable` is safe.
- The `use-credentials` manifest link and the Traefik Basic auth on the `websecure` router agree. The ACME challenge stays on `web` with no auth.
- First release order: secrets → push (deploy job skipped, no variable) → package public → variable → `workflow_dispatch`. The workflow does exactly this.
- Public repo: `git grep` on HEAD finds no IP address of the server, no e-mail, no bcrypt hash, no private key and no admin user name. All shell, YAML, conf and Dockerfile files have 0 CR characters.
- `package-lock.json`: 0 existing packages changed or removed. All 335 added entries are reachable from `vite-plugin-pwa@2.0.0` (root devDependency `2.0.0`).

## 3. Findings

**update-reload-drops-expired-notice** (Minor, confidence high). `src/pwa/useServiceWorkerUpdates.ts:33-46` with `src/workout/useWorkout.ts:131-132` and `src/components/PlanList.vue:28`. When the workout expires, `expireIfIdle` sets the in-memory `expired` flag and clears the stored workout. This makes `shouldApplyUpdate` true at once. If an update is waiting, the page reloads. After the reload the flag is gone, so the notice „Trening wygasł po 2 godzinach bez dotknięcia." (a DESIGN.md rule) does not show. The same reload also closes an open plan delete confirm and clears a delete error message. No data is lost. No test covers it.
Fails when: a new version installs during a workout, the user leaves the phone for more than 2 h, then comes back. The plan list shows with no notice.

**ci-verify-dist-not-on-image** (Nit, confidence high). `.github/workflows/deploy.yml:36,52`. The `test` job checks its own `dist/`. The `image` job builds a second `dist/` inside Docker, and no job runs verify-dist on it. Locally the two are byte-identical, so the risk is small.
Fails when: a later Dockerfile or base image change makes the image build differ (for example a different Node). The manifest or the precache in the pushed image can then break with CI green.

**hardening-flags-duplicated** (Nit, confidence high). `deploy/compose.yaml:13-19` and `scripts/smoke-image.sh:147-151`. Only a comment keeps the two lists equal.
Fails when: someone adds a restriction to the compose file and not to the smoke test. CI then tests a container that differs from the one on the server.

**acme-first-request-wording** (Nit, confidence medium). `docs/deploy.md:257,513`. The guide says the first HTTPS request makes Traefik ask for the certificate. Traefik asks when it finds the router (when the app container starts).
Fails when: the owner debugs a slow certificate and waits for a request that does not matter.

**claude-md-code-layout-stale** (Nit, confidence high). `CLAUDE.md:61`. The code layout line does not name `src/pwa/`, `deploy/` or `scripts/`. The Deployment section names them, so the risk is low.
Fails when: an agent reads only the layout line and puts new update code outside `src/pwa/`.

**actions-not-sha-pinned** (Nit, confidence medium). `.github/workflows/deploy.yml:28-29,53`. The actions use moving major tags. The `image` job has `packages: write` in a public repository.
Fails when: a moved tag of a used action is compromised. That code then runs with the GHCR write token.

**default-50x-html-in-image** (Nit, confidence high). `Dockerfile:17`. The base image keeps `/usr/share/nginx/html/50x.html`. No location uses it, but nginx serves it at `/50x.html`.
Fails when: never in practice. It is only an extra public file that the app does not own.

**traefik-docker-api-compat-unverified** (Nit, confidence low). `deploy/traefik/compose.yaml:49`. The guide installs the latest Docker Engine. I could not check that Traefik v3.6.7 reads the Docker 29 API. I think it does, but only the owner's server can prove it.
Fails when: the Docker provider cannot talk to the engine. Traefik then answers 404 for the app (the guide's troubleshooting row covers the symptom, not this cause).
