# ai-ta-assist: orchestrator reconciliation of Group 4 (2026-11-09)

## Dispatch

- The human chose "Commit all 4, start Group 4 (Recommended)".
- T09 ran in `<scratchpad>/wt/a-t09` (branch `ai-ta-assist-t09`, base `6dad099`). That worktree has no `.env`.

## Subagent runs

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T09 (Group 4), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 63,154 | Claude Code task notification `subagent_tokens` (10 tool uses, 90.9 s) |

The implementer reported its own counts as `unavailable`.

## Verification by the orchestrator

- The worktree has only the new test file and the implementer's two evidence files.
- The orchestrator read the test:
  - the gate is `RUN_SOCLAAS_TESTS === '1' && loadAiConfig(process.env).enabled`;
  - there is no logging of the config, prompts, responses or env;
  - synthetic tickets only, 3 provider calls, and a 60 s timeout per live test.
- Implementer-reported skip runs: 1 suite skipped and 5 tests skipped, both without the flag and with the flag set but no config.
- **Offline dry run by the orchestrator** (no network, no `.env`, no real key):
  - The orchestrator made a temporary copy of the test, with the gate forced open by dummy config values (`https://fake.invalid/v1`, a dummy key) and a fake `fetch` passed to the real `createAiGateway`.
  - That copy exercises the real rate limiter (against the test's stub `db` transactions), the usage store, the transport and both routes. The fake model output included an unknown alias `T99`.
  - Result: 5 passed, 5 total. The fake `fetch` was called 3 times, only with `https://fake.invalid/` URLs.
  - The stub `db` works with the rate counter, `aiUsage` writes are recorded, and the unknown alias is dropped.
  - The temporary file was deleted afterwards; `git status` shows only T09's files.
- Not verified: behaviour against the real SoCLaaS API. That is the human's live run.

## Notes for review (not blocking)

- An extra `test.skip` placeholder appears when the gate is closed, so the suite does not report as empty.
- Repeated live runs within a minute may hit the gateway's per-user rate limit (429).
- T09 stays `[ ]` until independent review, and the live run is recorded separately by the human.
- 2026-11-09: The human chose "Commit T09 (Recommended)".

## Live run 1 by the human (2026-11-09): failed, cause found

- The human ran `RUN_SOCLAAS_TESTS=1 CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-live` with their own `src/codeclinic/.env`.
- Result: Tests: 3 failed, 1 passed, 4 total. The draft, insights and injection tests each received `503` (about 50 ms each); the budget test passed.
- The gate opened, so the config was valid.
- Cause, confirmed by the orchestrator in the `.env`-free T09 worktree with a probe test:
  - Under CRA's Jest 27.5.1 `node` environment, `typeof globalThis.fetch` is `undefined`, although host Node v24.2.0 has `fetch`.
  - The gateway's default `fetch` is therefore missing, so the transport reports a config error and the route returns `AI_UNAVAILABLE`.
  - No request reached SoCLaaS. Production (plain Node) is unaffected.
- The orchestrator's earlier offline dry run did not catch this, because it injected a fake `fetch`.
- `node_modules` has `node-fetch` 3.3.2 only as a transitive dependency. It is ESM-only, so it cannot be `require`d from Jest 27.

## T09 fix (the human chose "Apply the fix (Recommended)")

- Added `test/helpers/live-fetch-environment.js`. It extends `jest-environment-node`, which is already installed through react-scripts, and copies the host's `fetch`, `Headers`, `Request`, `Response`, `AbortController`, `AbortSignal`, `TextDecoder` and `TextEncoder` into the test context when they are missing.
- The live test's docblock now names this environment. There are no production, config or dependency changes.
- Offline check (no network, no `.env`): a temporary probe under that environment fetched a `data:` URL and read it through `body.getReader()` and `TextDecoder`. The live suite still skips without the flag.
  - Command: `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false zz-fetch-probe ta-ai-live`
  - Result: Test Suites: 1 skipped, 1 passed. Tests: 5 skipped, 1 passed.
  - The probe was deleted afterwards.
- Awaiting live run 2 by the human.
