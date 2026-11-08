# Execution log: ai-gateway Group 2 (T04, T05)

Date: 2026-11-08
Role: implementer
Worktree: `.../scratchpad/wt/ag-g2`, branch `ai-gateway-g2`, base `522afc4`; Group 1 changes staged, unmodified.
Specification: `workflow/specs/ai-gateway.md` v0.1. Checklist and handoff v0.1 (human-approved).

## Preflight

- Read `workflow/agents/implementer.toml`, `AGENTS.md`, spec v0.1 (R8–R10), `tasks.md`, `handoff.md`, `design.md`, and the T01/T03/T07 exports used as context.
- Allowed files: new files under `src/codeclinic/server/ai/` and `src/codeclinic/test/`. No dependency, config, or Group 1 change.
- `src/codeclinic/node_modules` is a symlink to the shared install; `npm ci`/`npm install` not run.

## Commands and results (run in `src/codeclinic`)

1. `CI=true npx react-scripts test --roots test --testMatch "**/test/**/ai-{transport,parse}.test.*" --watch=false` (first run) — 2 suites failed; 8 failed / 51 passed. Causes: CRA `resetMocks` cleared the module-level `jest.fn` implementation in the parse test; `Date.parse('-1')` accepted as a `Retry-After` date; one breaker test supplied too few fake responses.
2. Fixes: parse test creates its `jest.fn` in `beforeEach`; `parseRetryAfterMs` parses dates only in `Day, ...` form; test fixture enlarged to 10 responses.
3. `CI=true npm test -- --watch=false` — exit 0. Test Suites: 1 skipped, 23 passed, 23 of 24 total. Tests: 1 skipped, 442 passed, 443 total.
4. `npm run build` — exit 0, "Compiled successfully."
5. Targeted re-run of command 1 — Test Suites: 2 passed; Tests: 59 passed.
6. `git status --short` — new untracked: `server/ai/parse.js`, `server/ai/transport.js`, `test/ai-parse.test.js`, `test/ai-transport.test.js`; staged Group 1 entries unchanged.

No network calls, no real key (tests use `test-key-not-real`), no commits.

## M1 fix (review-G1 finding M1), 2026-11-08

Context: Group 1 merged into `codeclinic-scope` at `0f07599`; worktree reset onto it. `git status --short` showed the seven Group 2 files untracked and preserved.

1. Edited `server/ai/redact.js` `ASSIGNMENT` (optional type annotation before `=`); appended a new `describe` block to `test/ai-redact.test.js`.
2. `CI=true npx react-scripts test --roots test --testMatch "**/test/**/ai-redact.test.*" --watch=false` gave Tests: 68 passed, 68 total.
3. Probe with `node -e` of `redact(...)`: `password: str == "guess"` → `password: [REDACTED] == "guess"`; `token: T => fn(token)` → `token: [REDACTED] => fn(token)`; `api_keys: Dict[str, str] = {...}` → `api_keys: [REDACTED], str] = {...}` (residual risk: comma annotations); `def f(password: str) -> bool:` → `def f(password: [REDACTED]) -> bool:`.
4. `CI=true npm test -- --watch=false` exited 0. Test Suites: 1 skipped, 23 passed, 23 of 24 total. Tests: 1 skipped, 467 passed, 468 total.
5. `npm run build` exited 0 with "Compiled successfully."
6. `git diff --numstat` gave `redact.js` 8/1 and `ai-redact.test.js` 54/0 (0 removed lines in the test file, so existing tests are unmodified).

Report: `workflow/tasks/ai-gateway/implementation-M1-fix.md`.

## Reports

- `workflow/tasks/ai-gateway/implementation-T04.md`
- `workflow/tasks/ai-gateway/implementation-T05.md`
