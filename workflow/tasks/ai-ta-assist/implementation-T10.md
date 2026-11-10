# Implementation report: T10 (review F1)

Spec: `workflow/specs/ai-ta-assist.md` v0.2 (R4). Checklist v0.3, T10. Handoff v0.3. Approved by the human 2026-11-09 (Fix all now).

## Changed files
- `src/codeclinic/server/tickets/ta-ai-insights.js`: `set` now reads `now()` once, deletes every entry with `t - at > ttlMs`, then stores the new entry. `get`, `keyFor` and exports are unchanged.
- `src/codeclinic/test/ta-ai-insights.cache-prune.test.js` (new): 4 tests with an injected `now`: expired entries removed on `set`; live entries kept; mixed set prunes only expired; entry exactly at the TTL is kept.

## Verification
From `src/codeclinic`: `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-insights < /dev/null`
Result: 3 suites passed, 51 tests passed, 0 failed.
Red check: with the production change reverted, the new file fails (expired-entry tests); restored afterwards.

## Risks
- The sweep is O(n) per `set`; `set` runs only after a successful gateway call, which is rate limited, so cost is small.
- Live entries are unbounded within one TTL (no size cap); within the review's recommended option.
