# Implementation report: T17-T19 (improvement round 2)

Spec v0.3, checklist v0.4, handoff v0.4. Built on uncommitted round 1.

## Changes
- T17 `server/tickets/ta-ai-insights.js`: two new prompt lines (every listed ticket in exactly one group, with the 8-group cap winning; summaries name the concept to re-teach and never prescribe code).
- T18 `server/tickets/ta-ai-fix-note.js`: "Keep the note to at most four short sentences."
- T19 `src/TAQueuePage.tsx`: `ta-queue__note` text "Grouped X of Y active tickets." when groups exist, `ticketCount` > 0 and distinct linked ticket IDs < `ticketCount`.
- Tests: `test/ta-ai-prompts.round2.test.js` (6), `test/TAQueuePage.ai-coverage.test.tsx` (5).

## Verification (from src/codeclinic)
- Full suite: 62 passed, 5 skipped suites; 1254 passed, 9 skipped tests (1263).
- `npx tsc --noEmit -p .`: exit 0.
- `npm run build`: compiled.

## Risks
Prompt effects on the live model are untested (no network). Coverage uses ticket IDs the server linked; ticketCount may count tickets beyond the 60-ticket cap, in which case the note also appears alongside the truncation note.

## Correction (orchestrator, 2026-11-09; rounds review R2)

The risk about `ticketCount` counting tickets beyond the 60-ticket cap does not apply. `ticketCount` is `tickets.length`, which is at most 60 (`ta-ai-insights-route.js:64`), so the coverage note always agrees with the "oldest 60" note.
