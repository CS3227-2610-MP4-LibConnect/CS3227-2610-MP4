# Implementation report: ai-ta-assist T01 (Shared AI-assist helpers)

Spec `workflow/specs/ai-ta-assist.md` v0.2; checklist v0.2; handoff v0.2 (all human-approved 2026-11-09). Base `eb49679`, branch `ai-ta-assist-t01`.

## Changed files (under `src/codeclinic/`)
- new `server/tickets/ta-ai-shared.js`
- `server/tickets/ta-claims.js`: export `isEmptyBody` only (no behaviour change)

## Exports
`toAiErrorResponse(code, feature) -> { status, body: { code, message } }` (unknown code falls back to the `AI_UNAVAILABLE` row; any feature other than `QUEUE_INSIGHTS` uses the drafter message); `buildAliasMap(tickets) -> Map<'T1'..'Tn', ticket>`; `cleanInsightGroups(groups, aliasMap) -> [{ label, kind, summary, tickets: [{ ticketId, title }] }]`; `errorSummary(errorOutput) -> string` (first non-blank line, trimmed, max 160); `requireEmptyJsonBody(req, res, next)` (400 `{ message }` via the shared `isEmptyBody` rule).

## Verification (from `src/codeclinic`)
- `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-shared`: 1 suite passed, 25/25 tests passed.
- Same flags, no filter: Test Suites 6 failed, 4 skipped, 49 passed (55 of 59); Tests 30 failed, 4 skipped, 1079 passed (1113). The 6 failing suites are only the not-yet-implemented ta-ai suites: ta-ai-fix-note, ta-ai-insights, ta-ai-draft-route.api, ta-ai-insights-route.api, TATicketPage.ai, TAQueuePage.ai. No existing suite fails.

## Deviations and risks
- None in scope. Assumption: the 400 body for `requireEmptyJsonBody` is `{ message }`, matching ta-claims style (spec does not fix it).
- The unknown-code fallback in `toAiErrorResponse` is an implementation choice (spec silent).
