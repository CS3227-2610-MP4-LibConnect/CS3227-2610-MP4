# Implementation report: T03 Queue Insights definition and cache

- Spec: `workflow/specs/ai-ta-assist.md` v0.2; checklist v0.2; handoff v0.2 (all human-approved 2026-11-09).
- Changed file: `src/codeclinic/server/tickets/ta-ai-insights.js` (new).
- Exports: `QUEUE_INSIGHTS` (frozen definition; caps 12000 / 1200), `createInsightsCache({ now, ttlMs })` returning `{ keyFor(aliasMap), get(key), set(key, data) }`; default TTL 5 minutes.
- Imports `errorSummary` from T01's `ta-ai-shared.js`; no `server/ai/*` edits.
- Prompt lines: `alias | language | tags | title | error summary` only. Line breaks and ` | ` inside fields are neutralised so one ticket stays one five-field line.
- Cache key: JSON of `[alias, ticketId, updatedAt]` per ticket in order (Date, Firestore Timestamp, or string handled). In memory only; get returns `undefined` on miss or expiry.
- Verification (from `src/codeclinic`): `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-insights.test ta-ai-shared` -> 2 suites passed, 45 tests passed.
- Not run: full suite; route suite `ta-ai-insights-route.api` (T05).
- Risks: the cache key contains real ticket IDs, but it never leaves memory and is never logged or sent to the model.
