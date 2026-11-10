# Test coverage report: ai-ta-assist

Specification: `workflow/specs/ai-ta-assist.md` v0.1. Checklist v0.1. Handoff v0.1. All human-approved 2026-11-09. (Written against v0.1. v0.2 added only T09, the live test, which is covered by T09's own file. T01–T07 tests are unchanged.)
Log: `logs/tasks/ai-ta-assist/02-test-writer.md`.
Status: failing-first. Server suites fail with `Cannot find module`; UI suites fail on missing UI. Nothing passes yet by design. Server-suite assertions have not been executed.

All paths under `src/codeclinic/`. All API tests use a stub gateway (`{ register, run }`) on `app.locals.aiGateway`; no network or real key.

## Files

- `test/helpers/ta-ai-harness.js` (stub gateway, system builder, R5 table, injection fixture)
- `test/ta-ai-shared.test.js` (T01)
- `test/ta-ai-fix-note.test.js` (T02)
- `test/ta-ai-insights.test.js` (T03)
- `test/ta-ai-draft-route.api.test.js` (T04)
- `test/ta-ai-insights-route.api.test.js` (T05)
- `test/TATicketPage.ai.test.tsx` (T06)
- `test/TAQueuePage.ai.test.tsx` (T07)

## Requirement and scenario mapping

| Requirement / scenario | Test file(s) |
| --- | --- |
| R1 registration, caps, systemPrompt, buildUserContent fields and exclusions, parse (1-2000 trimmed) | ta-ai-fix-note |
| R2 claimer-only on CLAIMED, 404/409/403/401, CSRF, body 400, empty body OK, no writes, actor and feature passed | ta-ai-draft-route |
| R3 registration, caps, line format, error-summary rule, exclusions, parse (0-8 groups, caps, alias regex, exact shape) | ta-ai-insights, ta-ai-shared (errorSummary) |
| R4 up to 60 oldest active tickets, aliases, empty short-circuit, cleaning, response shape, truncated, cache (5 min, shared by TAs, key on alias map and updatedAt, failures not cached) | ta-ai-insights-route, ta-ai-insights (cache unit), ta-ai-shared |
| R5 four codes to status/code/message, both features, no provider detail, missing gateway | ta-ai-shared, ta-ai-draft-route, ta-ai-insights-route, both UI files |
| R6 ticket page: button visibility, fill without submit, AI note, replace confirmation, loading, errors, plain text, "AI suggestion" | TATicketPage.ai |
| R6 queue page: panel, Generate insights, group content, links, truncated/cached notes, empty/loading/error, plain text, "AI suggestion", 320 px CSS | TAQueuePage.ai |
| Scenario 1 (draft fills, nothing saved) | draft-route, TATicketPage.ai |
| Scenario 2 (409/403/401) | draft-route |
| Scenario 3 (prompt injection: no state change, literal draft) | draft-route, insights-route, fix-note (data passthrough) |
| Scenario 4 (draft prompt contents and exclusions) | fix-note, draft-route (real buildUserContent on the route input) |
| Scenario 5 (insights lines only, max 60) | insights, insights-route |
| Scenario 6 (alias cleaning, invalid schema) | shared, insights, insights-route |
| Scenario 7 (R5 mapping, disabled gateway gives 503 with no provider call, resolve still works) | draft-route (real disabled `createAiGateway` plus resolve), insights-route, both UI files |
| Scenario 8 (cache hit, updatedAt change) | insights (unit), insights-route, TAQueuePage.ai (note) |
| Scenario 9 (CSRF 403, body 400) | shared (requireEmptyJsonBody), draft-route, insights-route |
| Scenario 10 (HTML/script/javascript: literal) | TATicketPage.ai, TAQueuePage.ai, fix-note and insights parse |
| Scenario 11 (one `run` per request, feature and actor) | draft-route, insights-route (stub records calls; the `aiUsage` write itself is gateway behaviour) |
| `registerTaAiFeatures` registers both valid definitions; `startServer()` wiring | draft-route (unit and a source-order check of `server/index.js`) |

## Assumed interfaces (not stated in the spec)

- `ta-ai-shared.js`: `toAiErrorResponse(code, feature)` returns `{ status, body: { code, message } }`; `buildAliasMap(tickets)` returns a `Map` alias to a ticket record that has `ticketId`, `title`, `updatedAt`; `cleanInsightGroups(groups, aliasMap)` returns `[{ label, kind, summary, tickets: [{ ticketId, title }] }]`; `errorSummary(text)` skips blank or whitespace-only lines (trimming is not tested) and returns `''` for empty or non-string; `requireEmptyJsonBody` is an Express middleware answering 400.
- `ta-ai-fix-note.js` exports `FIX_NOTE_DRAFTER`; input is a ticket view whose replies have `{ message, authorRole: 'STUDENT'|'TA', createdAt }`; `parse` returns `{ ok: true, data: { draft: <trimmed> } }` or `{ ok: false }` (the `features.js` contract).
- `ta-ai-insights.js` exports `QUEUE_INSIGHTS` and `createInsightsCache({ now, ttlMs })` with `keyFor(aliasMap)`, `get(key)` (falsy on miss/expiry), `set(key, data)`. `buildUserContent` input is `{ tickets: [{ alias, language, conceptTags, title, errorOutput }] }`. `parse` rejects extra keys on the top level and on groups (spec: "accepts exactly").
- `registerTaAiFeatures(gateway)` is exported from `ta-ai-draft-route.js` (T04 text implies the location but does not say).
- Error body is `{ code, message }` (spec names `code`; the exact keys and the `message` field are assumed).
- `ticketCount` is the number of tickets sent (at most 60 when truncated); `truncated`/`cached` are present on non-empty results.
- The insights cache is created per `createTaTicketsRouter` instance (not module-global), so each test system starts empty.
- UI: the replace confirmation may be `window.confirm` or an inline replace/keep button (the tests accept either); loading is a disabled button or a status text matching `drafting|generating|working|loading`; the empty insights state text matches `no (insight|group|pattern|theme|active ticket)`; the panel heading is "Queue insights"; the textarea is found by the label "Fix note"; the queue insights CSS must mention "insights".

## Gaps and ambiguities

- Real redaction, rate limiting, and `aiUsage` writes are gateway behaviour and not re-tested; only the disabled-gateway path uses the real gateway.
- TTL expiry through the route is not tested (the clock cannot be injected via `createTaTicketsRouter`); expiry is covered at unit level.
- Behaviour when `gateway.run` throws, or returns an unknown code, is not specified, so it is not tested.
- The replace-prompt mechanism, loading wording, and empty-state wording are unspecified (see above); the tests accept the ranges listed.
- Unknown-alias handling in `parse` vs `cleanInsightGroups` is split per spec; duplicates of one alias inside a single group are not tested.
- The 320 px check is a CSS source check, like the existing page tests, not a rendered layout test.
- T08 (docs) has no tests, as assigned.
