# Implementation report: T12 Count real provider requests in the live test (review F3)

Spec `workflow/specs/ai-ta-assist.md` v0.2, checklist v0.3, handoff v0.3 (approval 2026-11-09). Base `ca009ea`, branch `ai-ta-assist-t12`.

## Changed files
- `src/codeclinic/test/ta-ai-live-soclaas.integration.test.js` only: the gateway now gets a counting `fetch` wrapper that increments `fetchCalls` and delegates to `globalThis.fetch` (the real fetch from `test/helpers/live-fetch-environment.js`). The budget test asserts `fetchCalls <= 4`, so retries count. The endpoint counter is removed. All other assertions, the gate and timeouts are unchanged. The wrapper prints and logs nothing.

## Verification (from `src/codeclinic`)
- `node --check test/ta-ai-live-soclaas.integration.test.js`: OK.
- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-live`: 1 suite skipped, 5 tests skipped, no failure.

## Notes and risks
- Not run live (no `.env`, no `RUN_SOCLAAS_TESTS`, no network). The new assertion is unexercised until the human's next live run.
- The budget test relies on running last and after the other tests (as before); with `-t` filtering it counts only the selected tests.
- Tokens/model/source: unavailable.
