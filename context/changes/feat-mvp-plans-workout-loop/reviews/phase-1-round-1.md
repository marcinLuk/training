# Phase review — feat-mvp-plans-workout-loop · Phase 1: Unit test harness · round 1

- **Scope:** uncommitted working tree on base `9853694`. Phase paths: `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `tsconfig.test.json` (new), `src/harness.test.ts` (new), `CLAUDE.md` (without the owner's pre-run "## Browser rule" section), `context/foundation/tech-stack.md`, `brief.md` Progress rows 1.1–1.5. Not this phase: `context/foundation/auto-loop.md`, `context/foundation/roadmap.md` (dirty before the run; mtimes 16:50 and 16:42, the run started 17:14).
- **Files reviewed:** 9 (`+1116/-35` lines; of these `package-lock.json` is `+1066/-28`, the rest is `+50/-7`)
- **Contract:** `context/changes/feat-mvp-plans-workout-loop/brief.md` → `## Progress` / `### Phase 1` rows 1.1–1.5, `## Slice details` / `### Phase 1`, Done-when D1
- **Reviewed at:** 2026-10-18
- **Overall verdict:** CONCERNS
- **Reviewed by:** opus (Claude Opus 5.5) (+ `ultrathink`)

## Success Criteria — evidence

### Automated (re-run by this review, not taken on trust)

| # | Criterion | Command | Result |
| :-- | :-- | :-- | :-- |
| 1.1 | `npm test` exits 0 and runs `src/harness.test.ts` (mount with `@vue/test-utils` in jsdom) | `timeout 300 npm test` and `timeout 300 npx vitest run --reporter=verbose` | pass |
| 1.2 | `npm run test:watch` is defined as Vitest watch mode | read `package.json` `scripts["test:watch"]` | pass |
| 1.3 | `npm run build` exits 0 | `timeout 300 npm run build` | pass |
| 1.4 | a type error in a `*.test.ts` file in a scratch copy makes `npx vue-tsc -b` fail there | scratch copy (own `node_modules/.tmp`), `timeout 300 npx vue-tsc -b` clean → error added → re-run | pass |
| 1.5 | `CLAUDE.md` (Commands, Stack) and `tech-stack.md` name Vitest, `npm test`, `npm run test:watch` | `grep -nE "Vitest\|npm test\|test:watch" CLAUDE.md context/foundation/tech-stack.md` | pass |

1.1 — `npm test`:

```
> trening@0.0.0 test
> vitest run
 RUN  v5.0.5 /home/marci/www/Trening
 Test Files  1 passed (1)
      Tests  1 passed (1)
EXIT=0
```

Verbose run, to see the file name:

```
 ✓ src/harness.test.ts > test harness > mounts a component in jsdom and renders Polish text 10ms
 Test Files  1 passed (1)
      Tests  1 passed (1)
EXIT=0
```

`grep -nE '\.(skip|only|todo)\b' src/harness.test.ts` → no match (exit 1). No test is skipped.

1.2 — `node -e "...scripts['test:watch']"` → `vitest`. This is the command that the brief names (`"test:watch": "vitest"`). See Nit `test-watch-not-forced`.

1.3 — `npm run build`:

```
> vue-tsc -b && vite build
vite v8.3.4 building client environment for production...
✓ 18 modules transformed.
dist/assets/index-EKLP5rDc.js   65.64 kB │ gzip: 25.75 kB
✓ built in 94ms
EXIT=0
```

1.4 — induced divergence. The copy is in the scratch dir. Its `node_modules` is a real folder with symlinks to each real package, and with its own `.tmp` (no tsbuildinfo shared with the real tree; real `node_modules/.tmp/*.tsbuildinfo` kept their 17:16 mtimes).

Converse first (clean copy, same files as the real tree):

```
Projects in this build:
    * tsconfig.app.json
    * tsconfig.node.json
    * tsconfig.test.json
    * tsconfig.json
Building project '.../mutant14/tsconfig.test.json'...
EXIT=0
```

Then `const wrongType: number = "not a number"` appended to `src/harness.test.ts`:

```
src/harness.test.ts(18,7): error TS2322: Type 'string' is not assignable to type 'number'.
EXIT=2
```

Copy reverted → `EXIT=0` again. An unused local in the test file also fails (`noUnusedLocals` is inherited):

```
src/harness.test.ts(18,10): error TS6133: 'unusedHelper' is declared but its value is never read.
unused EXIT=2
```

Real tree — the test file is in the type check:

```
$ npx tsc -p tsconfig.test.json --listFilesOnly | grep '/Trening/src/'
/home/marci/www/Trening/src/harness.test.ts
/home/marci/www/Trening/src/main.ts
$ npx tsc -p tsconfig.app.json --listFilesOnly | grep '/Trening/src/'
/home/marci/www/Trening/src/main.ts
$ npx vue-tsc -b --verbose
Projects in this build: * tsconfig.app.json * tsconfig.node.json * tsconfig.test.json * tsconfig.json
Project 'tsconfig.test.json' is out of date because output file 'src/harness.test.js' does not exist
EXIT=0
```

1.5:

```
CLAUDE.md:59: ... Tests: Vitest with Vue Test Utils and jsdom. Node 22 or newer. npm.
CLAUDE.md:70: npm test             # Vitest, one run (vitest run)
CLAUDE.md:71: npm run test:watch   # Vitest watch mode
tech-stack.md:33: Unit and component tests use Vitest with Vue Test Utils and jsdom. ... Run `npm test` for one run and `npm run test:watch` for watch mode. ...
```

### Extra probes (scratch copy only, not criteria)

| Probe | Result |
| :-- | :-- |
| Future test imports a `.vue` SFC (`Probe.vue` with `defineProps<{ label: string }>()`) and mounts it | `vue-tsc -b` EXIT=0; `vitest run` → `✓ src/components/Probe.test.ts > sfc probe > mounts an SFC with typed props`, 2 passed |
| Same test passes `label: 42` | `Probe.test.ts(7,45): error TS2322: Type 'number' is not assignable to type 'string'.` EXIT=2 — SFC prop types are checked from tests |
| Test uses `describe`/`it`/`expect` with no import (globals) | `error TS2593: Cannot find name 'describe'` EXIT=2 — "no globals" is enforced |
| Harness test with `environment: 'node'` | `FAIL src/harness.test.ts ... ReferenceError: document is not defined`, EXIT=1 — the harness test pins a DOM environment |
| `tsconfig.test.json` narrowed to `"include": ["src/**/*.test.ts"]` | SFC test still type-checks (EXIT=0) and a bad prop still fails (EXIT=2) — see Minor `test-tsconfig-includes-all-src` |
| `dist/` after `npm run build`: `grep -rlE "vitest\|Ćwiczenie\|test-utils" dist` | no match — no test code in the production bundle |

### Manual

none — this phase has no manual items. Carried manual items: none.

---

| # | Question | Verdict |
| :-- | :-- | :-- |
| D1 | Are the new features reasonably documented? | PASS |
| D2 | Are all relevant types of documentation covered? | PASS |
| D3 | Is the documentation understandable and free of significant typos and grammar mistakes? | PASS (1 Nit) |
| I1 | Does it satisfy the original requirements? | PASS (1 Minor) |
| I2 | Is it logically correct? | PASS |
| I3 | Is there no unnecessary complexity? | CONCERNS (1 Minor) |
| I4 | Is it robust (concurrency, error handling, …)? | PASS |
| I5 | Is it performant? | PASS (same Minor as I3) |
| I6 | Is it secure (SQL injection, …)? | N/A |
| I7 | Is it observable (metrics, logging, tracing, …)? | N/A |
| I8 | Do newly added dependencies pull their weight? Is their license acceptable? | PASS |

Blockers: 0 · Major: 0 · Minor: 1 · Nit: 1

Findings going back to a builder: none.

---

## Documentation

### D1. Are the new features reasonably documented?

**Verdict:** PASS

`CLAUDE.md` names the two new commands, where tests live, the "import from `vitest`, no globals" rule, where the Vitest config is, and the three-way tsconfig split. `tech-stack.md` has the short test-stack paragraph that the slice asks for.

### D2. Are all relevant types of documentation covered?

**Verdict:** PASS

| Doc type | Needed? | Present? | Note |
| :-- | :-- | :-- | :-- |
| README.md | no | — | `README.md` is not the command list in this repo; `CLAUDE.md` is. |
| CLAUDE.md | yes | yes | Stack line names Vitest + Vue Test Utils + jsdom; Commands has `npm test`, `npm run test:watch`; the old "only check today … no test runner" sentence is replaced; `tsconfig.test.json` is named in the TypeScript config paragraph. |
| tech-stack.md | yes | yes | `## Test stack` paragraph. |
| ADR | no | — | no ADRs in this repo; the brief makes the runner choice. |
| API / JSDoc | no | — | no new public code. |
| E2E rules | no | — | no browser tests in this phase. |
| UI text | no | — | no UI. |

### D3. Is the documentation understandable and free of significant typos and grammar mistakes?

**Verdict:** PASS (1 Nit)

The new text uses short, simple sentences (ASD-STE100 style, as `CLAUDE.md` asks for `context/` documents). Paths and commands are correct.

- **[nit]** `test-watch-not-forced` — `package.json:11`, `CLAUDE.md:71` — `"test:watch": "vitest"` is watch mode only when stdin is a TTY and the process is not in CI or under an agent. Vitest 5 sets `watch: !isCI && process.stdin.isTTY && !isAgent` (`node_modules/vitest/dist/chunks/defaults.B1FCaFfh.js:53`). In a non-TTY shell `npm run test:watch` runs once and exits, so the comment "Vitest watch mode" is true only in the owner's terminal. The script is exactly what the brief asks for, so this is for the owner only. `vitest watch` would force watch mode in every context.

---

## Implementation Semantic

### I1. Does it satisfy the original requirements?

**Verdict:** PASS (1 Minor)

| Requirement (from this phase's Slice details / rows) | Implemented in | Status |
| :-- | :-- | :-- |
| `vitest@5.0.5`, `@vue/test-utils@2.5.1`, `jsdom@30.1.3`, exact, dev | `package.json:19,21,24`; installed: `vitest 5.0.5`, `@vue/test-utils 2.5.1`, `jsdom 30.1.3` (`npm ls --depth=0`) | met |
| scripts `"test": "vitest run"`, `"test:watch": "vitest"`; `build` kept | `package.json:8-11` | met |
| Vitest config `environment: 'jsdom'`, files `src/**/*.test.ts`, in `vite.config.ts` via `vitest/config` | `vite.config.ts:2,7-10` | met |
| `tsconfig.test.json` extends `./tsconfig.app.json`, own `tsBuildInfoFile`, includes the test files, referenced from `tsconfig.json` | `tsconfig.test.json:1-8`, `tsconfig.json:6` | met — but includes all of `src/`, see `test-tsconfig-includes-all-src` |
| `src/**/*.test.ts` excluded from `tsconfig.app.json` | `tsconfig.app.json:15` | met (listFilesOnly of the app project shows no test file) |
| explicit imports from `vitest`, no globals | `src/harness.test.ts:2`; no `globals` key in `vite.config.ts` | met (probe: un-imported `describe` fails the type check) |
| `src/harness.test.ts` mounts an inline component with `@vue/test-utils`, asserts Polish text | `src/harness.test.ts:5-15` (`toBe('Ćwiczenie')`) | met |
| `CLAUDE.md` Commands, "only check today" sentence, Stack; `tech-stack.md` paragraph | `CLAUDE.md:59,70-71,74-78`; `tech-stack.md:31-33` | met |
| do not touch `auto-loop.md` | mtime 16:50, before the run start 17:14 | met |
| D1: `npm test`, `npm run test:watch`, build type-checks tests, docs name the runner | rows 1.1–1.5 re-run above | met |

- **[minor]** `test-tsconfig-includes-all-src` — `tsconfig.test.json:5-6` — the slice says "`include` the test files", but the file has `"include": ["src/**/*.ts", "src/**/*.tsx", "src/**/*.vue"]` and `"exclude": []`. So the test project type-checks every app file again, on top of `tsconfig.app.json`. Effect: each app type error is reported twice by `vue-tsc -b`, and the app code is checked twice per build. Shown in the scratch copy with an error in `src/main.ts`:

  ```
  src/main.ts(7,7): error TS2322: Type 'string' is not assignable to type 'number'.
  src/main.ts(7,7): error TS2322: Type 'string' is not assignable to type 'number'.
  EXIT=2
  ```

  The narrow form `"include": ["src/**/*.test.ts"]` works: a test that imports a `.vue` SFC still type-checks, and a wrong prop type still fails (probes above). Nothing breaks today, so this is Minor.

### I2. Is it logically correct?

**Verdict:** PASS

The three projects build with no conflict under `vue-tsc -b` (no `composite` flag needed; each has its own tsbuildinfo path). `tsconfig.test.json` inherits `strict`, `noUnusedLocals`, `noUnusedParameters`, `erasableSyntaxOnly`, `noFallthroughCasesInSwitch` and `types: ["vite/client"]` through `extends`; the unused-local probe proves the inheritance. The empty `exclude` is needed to cancel the app config's `src/**/*.test.ts` exclude.

### I3. Is there no unnecessary complexity?

**Verdict:** CONCERNS — the same Minor as I1 (`test-tsconfig-includes-all-src`): the wider `include` is extra scope that adds nothing. Everything else is the smallest shape that the slice describes; no separate `vitest.config.ts` was needed.

### I4. Is it robust (concurrency, error handling, …)?

**Verdict:** PASS

- The `test` block in `vite.config.ts` does not leak into the production build: `vite build` ignores it, the build output is clean, and `dist/` holds no test code (grep above). `vite.config.ts` now imports `vitest/config` at build time; `vitest` is a devDependency, like `vite`, so any build that can run `vite` also has it.
- The harness test pins a DOM: with `environment: 'node'` it fails with `ReferenceError: document is not defined`. It also asserts exact Polish text, so a wrong text encoding fails it. Test-adequacy: the phase states no behavioural clause other than "a component mounts in jsdom and renders"; that clause is pinned.

### I5. Is it performant?

**Verdict:** PASS — `npm test` takes about 0.6 s. The only cost is the double type check from `test-tsconfig-includes-all-src`; with one source file it is not measurable, and it grows with `src/` size.

### I6. Is it secure (SQL injection, …)?

**Verdict:** N/A — dev tooling only. No user data, no network call, no new runtime code. All new lockfile entries resolve from `registry.npmjs.org` (0 other hosts).

### I7. Is it observable (metrics, logging, tracing, …)?

**Verdict:** N/A — no runtime code.

### I8. Do newly added dependencies pull their weight? Is their license acceptable?

**Verdict:** PASS

| Package | Version | License | Justified? | Note |
| :-- | :-- | :-- | :-- | :-- |
| vitest | 5.0.5 (exact) | MIT | yes | named in brief Guardrails for Phase 1 |
| @vue/test-utils | 2.5.1 (exact) | MIT | yes | named in brief Guardrails for Phase 1 |
| jsdom | 30.1.3 (exact) | MIT | yes | named in brief Guardrails for Phase 1; engines `^22.22.2`, Node here is 22.23.1 |

The lockfile adds 74 transitive dev packages. They are all dependencies of these three (for example `js-beautify` and `editorconfig` come from `@vue/test-utils`). Licenses: MIT 55, ISC 6, BlueOak-1.0.0 5, MIT-0 2, Apache-2.0 2, BSD-2-Clause 2, BSD-3-Clause 1, CC0-1.0 1 — all permissive. The removed lockfile lines (`estree-walker`, `fdir`, `fsevents`, `entities`) are re-written entries with the same versions (2.0.2, 6.5.0, 2.3.3, 7.0.1). No existing package changed version. No other new top-level package.

---

## Architecture — the project's own rules

- "New dependencies, and only these … (Phase 1)" → meets — exactly the three named packages, exact versions.
- NEVER-WEAKEN list → meets — `grep -rnE "ts-ignore|ts-expect-error|ts-nocheck|as any|: any|as unknown as" src vite.config.ts tsconfig*.json` → no match; no flag removed; no `skipLibCheck` added to `tsconfig.app.json` or `tsconfig.test.json`; `build` is still `vue-tsc -b && vite build`; no `.skip`/`.only`/`.todo`.
- "Do not edit `auto-loop.md`, `prd.md`, `roadmap.md`, `PRODUCT.md`" → meets — mtimes 16:50, 16:06, 16:42, 16:29; the run started 17:14.
- "Deployment is out of scope: no PWA manifest, service worker, Dockerfile or CI workflow" → meets — none added.
- "No server for user data" / "Offline after first load" → meets — no runtime code changed.
- `erasableSyntaxOnly` → meets — the test project inherits it.

## Not reviewed

- `brief.md` frozen-part integrity: `brief.md` is untracked, so git shows no diff for it. I read the Phase 1 rows (1.1–1.5 ticked `[x]`) and confirmed each one by re-running it. The orchestrator's frozen hash covers the rest.
- Watch mode in an interactive terminal: not run (the rules forbid watch mode in a verification). Judged from the script text and the Vitest default source line quoted under D3.

## Observations outside scope

- `vue-tsc -b --verbose` on the real tree says every project is "out of date because output file '…js' does not exist" on every run, so build mode re-checks all three projects each time (TS 6 build mode with `noEmit`). This was already true for the app and node projects before this phase. A consequence: the stale-tsbuildinfo trap in the loop rules cannot hide an error here today.
- `CLAUDE.md` gained the owner's "## Browser rule" section before this run; it rides in this phase's commit, as the workbench notes.
