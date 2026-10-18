---
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
---

## Why this stack

Trening is a single-user workout app for one phone. It has no accounts, it keeps all data on the device, it works offline, and it ships as an installable web app (PWA). The default web starter brings accounts, a server database and server deploy, and the PRD rules out all three, so the solo author took the custom path. Vite + Vue with TypeScript passes all four agent-friendly checks. It builds to static files only, and Vite has a mature PWA plugin for the offline app shell, so it is the simplest fit for a 4-week after-hours MVP. The app deploys as static files in Docker on the author's private server over SSH, through GitHub Actions with auto-deploy on merge, behind htpasswd Basic auth for now. With Basic auth, the manifest link needs crossorigin="use-credentials". The self-check had one gap: the author cannot yet judge AI-written Vue code, so reviews need extra care at first.
