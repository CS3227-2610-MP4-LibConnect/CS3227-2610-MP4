# Implementation report: T09 Opt-in live SoCLaaS test

Spec: `workflow/specs/ai-ta-assist.md` v0.2 (human-approved 2026-11-09). Checklist v0.2, handoff v0.2. Base `6dad099`, branch `ai-ta-assist-t09`.

## Changed files
- `src/codeclinic/test/ta-ai-live-soclaas.integration.test.js` (new)

## Gate
`live = RUN_SOCLAAS_TESTS === '1' && loadAiConfig(process.env).enabled`; `liveTest = live ? test : test.skip`. Fixtures (gateway, system) are built only inside `if (live)`.

## Live tests (3 provider calls, budget 4)
1. Draft for CLAIMED ticket: 200, non-empty `draft` <= 2000 chars, all seeded tickets unchanged, one `aiUsage` write.
2. Insights over 5 seeded active tickets: 200, <= 8 groups, every `tickets[].ticketId` seeded, store unchanged, one `aiUsage` write.
3. Injection ticket draft: 200 (schema-valid, <= 2000) or 502 `AI_INVALID_OUTPUT`; status CLAIMED and claim unchanged; store unchanged.
4. Call-count guard (<= 4).
No prompt, response, env or key is printed or asserted by text.

## Verification (agent: skip only; no .env read, no network)
- `node --check` file: OK.
- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-live`: Suites 1 skipped, Tests 5 skipped, 0 failed.
- Same with `env -u SOCLAAS_API_KEY -u SOCLAAS_BASE_URL -u SOCLAAS_MODEL RUN_SOCLAAS_TESTS=1`: Suites 1 skipped, Tests 5 skipped (gate holds, no .env).

## Risks
- The live path was never executed (by design). The stub db (aiUsage `set` + `runTransaction` for rate counters) and the live assertions are unproven until the human runs it. Per-user rate limits could affect repeated runs.
- Tokens/model: unavailable (no live run).
