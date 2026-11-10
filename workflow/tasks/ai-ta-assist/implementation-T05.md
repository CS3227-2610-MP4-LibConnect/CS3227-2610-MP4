# Implementation report: T05 Insights endpoint

- Spec `workflow/specs/ai-ta-assist.md` v0.2; checklist v0.2; handoff v0.2 (human-approved 2026-11-09).
- Changed: `src/codeclinic/server/tickets/ta-ai-insights-route.js` (new, exports `createAiInsightsRoutes(shared)`); `src/codeclinic/server/tickets/ta-routes.js` (one require line plus the mount line `router.use('/', createAiInsightsRoutes(shared));` after the replies mount, before `/:ticketId`).
- `POST /insights`: CSRF, then empty-body check (T01), then collects active tickets via `listTickets` following cursors (up to 61 to detect truncation), uses the first 60. Empty queue returns `{ groups: [], ticketCount: 0, truncated: false, cached: false }` with no gateway call.
- Cache: one `createInsightsCache()` per router instance; key is the T03 alias-map key plus the `truncated` flag; only successes are cached. Cache is checked before the gateway lookup.
- Gateway read from `req.app.locals.aiGateway` per request; missing or throwing gateway maps to `AI_UNAVAILABLE`; other failures go through `toAiErrorResponse`.
- Input to the gateway: `{ tickets: [{ alias, language, conceptTags, title, errorOutput }] }`; actor is `{ userId, accountType }`. No store writes. Model aliases are mapped by `cleanInsightGroups`; unknown aliases dropped.
- Response: `{ groups: [{ label, kind, summary, tickets: [{ ticketId, title }] }], ticketCount, truncated, cached }`; errors `{ code, message }`.
- Verification (from `src/codeclinic`): `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-insights ta-tickets` -> 7 suites passed, 351 tests passed. Full suite not run.
- Risk: a cache hit does not re-check the gateway; cached entries live 5 minutes in memory. Cache key holds real ticket IDs in memory only.
