# Phase review — release · Phase 1: Manifest, icons and service worker build · round 1

- **Scope:** `DESIGN.md`, `package.json`, `package-lock.json` (version table only), `vite.config.ts`, `public/icons/*.png`, `scripts/icons/make-icons.sh`, `scripts/icons/maskable.svg`, `scripts/verify-dist.mjs`, built `dist/` · **Files reviewed:** 9 (`+323/-1`, plus `package-lock.json` `+6324/-1190`)
- **Contract:** `context/changes/release/brief.md` → `### Phase 1` (contract mode: brief) · **Reviewed at:** 2026-10-24
- **Overall verdict:** CONCERNS
- **Reviewed by:** 10x-critic — coordinator opus (Claude Opus 5.5); workers: walker sonnet, prover none (experiments run by the coordinator)

## Success Criteria — evidence

### Automated (re-run by this review — run-criteria.sh logs, judged by the coordinator)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 1.1 | build + verify-dist | `npm run build && node scripts/verify-dist.mjs dist` | pass |
| 1.2 | vite-plugin-pwa 2.0.0 in devDependencies only | `node -e "const p=require('./package.json');process.exit(p.devDependencies['vite-plugin-pwa']==='2.0.0'&&!(p.dependencies||{})['vite-plugin-pwa']?0:1)"` | pass |
| 1.3 | DESIGN.md icon section | `grep -n "Ikona aplikacji" DESIGN.md` | pass |
| 1.4 | Vitest suite vs baseline | `npm test` | pass (0 failing = baseline 0; 18 files, 415 tests, no skipped line) |

1.1 log tail (exit 0):

```
PWA v2.0.0
mode      generateSW
precache  22 entries (308.30 KiB)
files generated
  dist/sw.js
  dist/workbox-2fbc6a65.js
ok   manifest: name and short_name are "Trening"
...
ok   sw.js: navigation fallback to index.html
verify-dist: all 15 checks passed
```

1.3 output: `264:### Ikona aplikacji`. 1.4 output: `Test Files  18 passed (18)` · `Tests  415 passed (415)`.

### Manual (walked by the walker with playwright-cli 0.1.14; spot-checked: 1.5)

| # | Item | Outcome | Evidence |
| :-- | :-- | :-- | :-- |
| 1.5 | Three PNG icons show the favicon barbell on `#121314`; maskable fills the square, barbell inside the 80 % circle | passed | `reviews/screenshots/p1-r1-1.5-maskable.png`, `p1-r1-1.5-pwa-192x192.png`, `p1-r1-1.5-pwa-512x512.png`, `p1-r1-1.5-app.png`. All three: light H-shaped barbell (`#f2f2ef`) on `#121314`, centre pixel `srgba(242,242,239,1)`. `any` icons: corners transparent (rounded square as in `favicon.svg`), edge midpoints `srgba(18,19,20,1)`. Maskable: all 4 corners and 4 edge midpoints `srgba(18,19,20,1)`, no transparency; farthest barbell pixel 183.0 px from centre, limit 204.8 px. |

Spot-check by the coordinator: opened `p1-r1-1.5-maskable.png` (full-bleed dark square, light barbell well inside) and `public/icons/pwa-192x192.png` (rounded square, same barbell). Re-measured the maskable icon independently: 32 234 foreground pixels, farthest at (439,257), 183.5 px from centre, limit 204.8 px; corners and edge midpoints `srgba(18,19,20,1)`. → confirmed.

### Experiments (mutants, wrong implementations, closure proofs, scratch re-proofs)

| id | Purpose | Ran by | Result (raw) | What it shows |
| :-- | :-- | :-- | :-- | :-- |
| E1 | Each `verify-dist.mjs` check must go red on a `dist/` copy that violates it (trap: "a verification script that only ever ran on a correct dist/ proves nothing") | coordinator, `exp/e1-mutate-dist.sh` on scratch copies of `dist/` | control: `exit=0 nfail=0`. 35 mutants, all `exit=1`, each FAIL line names the violated check, e.g. `font-new-on-disk … FAIL sw.js precache: every dist/fonts/*.woff2: the precache list does not name fonts from dist/fonts/: fonts/barlow-condensed-latin-900-normal.woff2`; `icon-wrong-size … icons/pwa-192x192.png is 512x512, the manifest says 192x192`; `icon-not-png … is not a PNG file (bad signature)`; `link-anon-cors … the manifest link has no crossorigin="use-credentials"`; `nav-fallback-other … sw.js has no NavigationRoute bound to index.html`; `txt-precached … the precache list names text files: fonts/LICENSE-barlow-condensed-OFL.txt`. No-arg run: usage line, `exit=2`. | Every check of row 1.1 is pinned: manifest fields (name, short_name, id, start_url, scope, display, lang, both colors), icon list and `purpose` values, icon type, PNG signature and IHDR size, missing icon, manifest link count/href/crossorigin, sw.js presence, precache of index.html, every asset file, favicon, every font on disk (new, nested and dropped), every manifest icon, no `.txt`, navigation fallback. Fonts are compared against files on disk, not a fixed list. The one `RED-WRONG` label (`precache-empty`) is my script's grep pattern; the message `the precache list in sw.js is empty` is the right one. |
| E2 | Icons can be made again from the committed sources | coordinator: copied `public/favicon.svg` and `scripts/icons/` to a scratch root, ran `make-icons.sh` | `make-exit=0`; for all three PNGs `compare -metric AE` = `0` differing pixels; `cmp` = bytes differ | Pixel-identical regeneration. Bytes differ because the PNGs carry `tEXt date:create/modify/timestamp` chunks (see `icon-png-date-chunks-kept`). |
| E3 | Lockfile change is only the allowed dependency | coordinator: compared `packages` of `git show HEAD:package-lock.json` and the working copy | `added 335 removed 0 changed 0`; `vite-plugin-pwa 2.0.0 MIT`, peer `vite ^…\|\| ^8.0.0` | No existing package changed version; the +1190 deleted lines are reordering. |

---

| # | Question | Verdict | One line |
| :-- | :-- | :-- | :-- |
| D1 | New features documented | pass | `verify-dist.mjs` and `make-icons.sh` have usage headers; config keys carry "why" comments. |
| D2 | All doc types covered | pass | DESIGN.md has the icon section; CLAUDE.md "No PWA manifest, service worker … exists yet" is now stale, but brief Phase 5 (row 5.4) owns that rewrite. |
| D3 | Docs understandable | pass | Paths and commands in DESIGN.md and script headers are correct. |
| I1 | Satisfies requirements | pass | Every Phase 1 "Changes required" clause maps to code; built `dist/manifest.webmanifest`, `dist/index.html` and `dist/sw.js` match D1/D2 (E1 + direct read). |
| I2 | Logically correct | pass | No defect found; E1 shows no false green over 35 violations. |
| I3 | No unnecessary complexity | pass | Plain Node script, no dependency. |
| I4 | Robust | pass | Each check runs in its own try/catch; missing files, bad JSON and short PNGs give a FAIL line, not a crash. |
| I5 | Performant | n/a | Build-time script over ~22 files. |
| I6 | Secure | pass | No secrets, IPs, e-mails or server data in the new files; PNG text chunks hold only dates. |
| I7 | Observable | pass | One line per check, the failing value named in each message. |
| I8 | New dependencies | pass | Only `vite-plugin-pwa` `2.0.0` (exact, devDependencies, MIT); lock adds 335 transitive packages, changes none (E3). |
| ARCH | Project rules | pass | see below |

Architecture — project rules:
- No change in `src/` and `index.html` unchanged (slice guardrail) — meets (`git status`).
- Manifest link `crossorigin="use-credentials"` (CLAUDE.md) — meets (`dist/index.html`).
- Fonts served locally and precached (CLAUDE.md, D2) — meets (10 woff2 in precache; E1 `font-*`).
- Only DESIGN.md tokens: `#121314` guma and `#f2f2ef` kreda; no gradient, no plate colors — meets (icons, manifest).
- DESIGN.md updated in the same change, in Polish, under Components — meets (lines 264–268).
- PNGs made once and committed; the build does not make them — meets (no generator in `vite.config.ts`).
- Vite `base` stays `/` — meets (not set).
- Public-repo rule — meets.

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 1
Findings going back to a builder: none.

## Findings

### D3 / I2. Icon sources

- **[Minor]** `icon-png-date-chunks-kept` — `scripts/icons/make-icons.sh:19-20` — `-define png:exclude-chunk=date,time` does not remove the date text chunks with this ImageMagick (6.9.12-98): every committed PNG holds `tEXt date:create`, `date:modify` and `date:timestamp` (`2026-10-24T10:45:13+00:00`). **Fails when:** the owner runs `make-icons.sh` again with no change to the SVGs → all three PNGs get new bytes (E2: `cmp` differs, 0 pixels differ), git shows a binary change, and the next build gives the icons new precache revisions, so every installed client downloads them again. Not sent back: no Success Criterion depends on it.

### I3. Precache list

- **[Nit]** `precache-duplicate-entries` — `vite.config.ts:37` — `globPatterns` include `png` and `webmanifest`, and vite-plugin-pwa also adds the manifest and its icons, so `dist/sw.js` lists `manifest.webmanifest` and the three icons twice (22 entries, 18 unique URLs). Workbox accepts this (`PrecacheController.js:104` throws only when the cache keys differ; here the revisions match), so there is no runtime failure. The pattern is what the brief asked for. `confidence: high` on harmlessness.

## Not reviewed

- D2 "after one online load, the app opens and works with no network" and "the app registers it" — Phase 2 scope (`injectRegister: false` here); not walked.
- PWA install, WebAPK icon use on a phone — not observable by the driver.
- `package-lock.json` read at version-table level only (E3), not line by line.

## Observations outside scope

- `CLAUDE.md:94` still says "No PWA manifest, service worker, Dockerfile or CI workflow exists yet." After this phase a manifest and a service worker exist. Brief Phase 5 (row 5.4) removes this line.
