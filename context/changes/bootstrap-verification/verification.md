---
bootstrapped_at: 2026-10-18T14:19:34Z
starter_id: vite-vue
starter_name: "Vite + Vue"
project_name: trening
language_family: js
package_manager: npm
cwd_strategy: subdir-then-move
bootstrapper_confidence: verified
phase_3_status: ok
audit_command: "npm audit --json"
---

# Bootstrap verification

## Hand-off

```yaml
starter_id: vite-vue
package_manager: npm
project_name: trening
hints:
  language_family: js
  team_size: solo
  deployment_target: self-host
  ci_provider: github-actions
  ci_default_flow: auto-deploy-on-merge
  bootstrapper_confidence: verified
  path_taken: custom
  quality_override: false
  self_check_answers:
    typed: true
    from_official_starter: true
    conventions: true
    docs_current: true
    can_judge_agent: false
  has_auth: false
  has_payments: false
  has_realtime: false
  has_ai: false
  has_background_jobs: false
```

**Why this stack** (copied from the hand-off):

Trening is a single-user workout app for one phone. It has no accounts, it keeps all data on the device, it works offline, and it ships as an installable web app (PWA). The default web starter brings accounts, a server database and server deploy, and the PRD rules out all three, so the solo author took the custom path. Vite + Vue with TypeScript passes all four agent-friendly checks. It builds to static files only, and Vite has a mature PWA plugin for the offline app shell, so it is the simplest fit for a 4-week after-hours MVP. The app deploys as static files in Docker on the author's private server over SSH, through GitHub Actions with auto-deploy on merge, behind htpasswd Basic auth for now. With Basic auth, the manifest link needs crossorigin="use-credentials". The self-check had one gap: the author cannot yet judge AI-written Vue code, so reviews need extra care at first.

## Pre-scaffold verification

| Signal      | Value                                      | Severity | Notes                                                        |
| ----------- | ------------------------------------------ | -------- | ------------------------------------------------------------ |
| npm package | create-vite v9.2.1 published 2026-09-10    | fresh    | resolved from cmd_template                                   |
| GitHub repo | vitejs/vite last pushed 2026-10-18         | fresh    | card docs_url is vuejs.org (not GitHub); checked the Vite repo instead |

## Scaffold log

**Resolved invocation**: `npm create vite@latest .bootstrap-scaffold -- --template vue-ts` (run with `CI=1` and no stdin, so the CLI does not ask questions)
**Strategy**: subdir-then-move
**Exit code**: 0
**Files moved**: 17
**Conflicts (.scaffold siblings)**: README.md.scaffold
**.gitignore handling**: append-merged (22 new lines under `# from vite-vue`)
**.bootstrap-scaffold cleanup**: deleted

Extra steps outside the template:
- `package.json` name changed from `bootstrap-scaffold` (the temp directory name) to `trening`.
- `npm install` ran (exit 0), because the template does not install dependencies and the audit needs them.
- `npm run build` ran as a check (exit 0). The output is in `dist/`, which `.gitignore` excludes.

Files moved: `tsconfig.app.json`, `tsconfig.node.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `package.json`, `src/App.vue`, `src/main.ts`, `src/style.css`, `src/components/HelloWorld.vue`, `src/assets/hero.png`, `src/assets/vue.svg`, `src/assets/vite.svg`, `.vscode/extensions.json`, `public/icons.svg`, `public/favicon.svg`, plus `.gitignore` (merged) and `README.md` (sidelined).

## Post-scaffold audit

**Tool**: npm audit --json
**Summary**: 0 CRITICAL, 0 HIGH, 0 MODERATE, 0 LOW
**Direct vs transitive**: 0/0/0/0 direct of total 0/0/0/0 (73 packages: 25 prod, 49 dev, 27 optional)

#### CRITICAL findings

None.

#### HIGH findings

None.

#### MODERATE findings

None.

#### LOW / INFO findings

None.

## Hints recorded but not acted on

| Hint                    | Value                |
| ----------------------- | -------------------- |
| bootstrapper_confidence | verified             |
| quality_override        | false                |
| path_taken              | custom               |
| self_check_answers      | typed: true, from_official_starter: true, conventions: true, docs_current: true, can_judge_agent: false |
| team_size               | solo                 |
| deployment_target       | self-host            |
| ci_provider             | github-actions       |
| ci_default_flow         | auto-deploy-on-merge |
| has_auth                | false                |
| has_payments            | false                |
| has_realtime            | false                |
| has_ai                  | false                |
| has_background_jobs     | false                |

## Next steps

Next: a future skill will set up agent context (CLAUDE.md, AGENTS.md). For now, your project is scaffolded and verified — happy hacking.

Useful manual steps in the meantime:
- `git init` (if you have not already) to start your own repo history.
- Review any `.scaffold` siblings the conflict policy created and decide which version of each file to keep.
- Address audit findings per your project's risk tolerance — the full breakdown is in this log.

Files left over from the old prototype (not touched by the scaffold):
- `CLAUDE.md`: describes the old Express + SQLite app. It is now wrong and will mislead AI agents.
- `Dockerfile`, `docker-compose.yml`, `.dockerignore`: built the old Node server. The new app needs a static-file image.
- `README.md`: the old README. The starter's version is in `README.md.scaffold`.
- `.gitignore`: still has the old `data` line for the SQLite folder.
