# ai-ta-assist: orchestrator reconciliation of Group 2 (2026-11-09)

## Dispatch

- The human chose "Commit T01, start Group 2 (Recommended)".
- T02 ran in `<scratchpad>/wt/a-t02` (branch `ai-ta-assist-t02`) and T03 in `<scratchpad>/wt/a-t03` (branch `ai-ta-assist-t03`), in parallel, both from `6ea07a4`.

## Subagent runs

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T02 (Group 2), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 58,652 | Claude Code task notification `subagent_tokens` (7 tool uses, 57.5 s) |
| Implementer | T03 (Group 2), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 53,510 | Claude Code task notification `subagent_tokens` (5 tool uses, 47.8 s) |

Both implementers reported their own counts as `unavailable`.

## Verification by the orchestrator

- Each worktree has only its new module plus its own two evidence files. No tracked file was modified.
- The orchestrator read `ta-ai-fix-note.js` in full:
  - the system prompt is fixed;
  - `buildUserContent` reads no names, emails, IDs, `ticketId` or `repoUrl`;
  - replies are oldest first and labelled by role;
  - `parse` accepts exactly `{ draft }`, trimmed, 1–2000 characters.
- The orchestrator read `ta-ai-insights.js` in full:
  - it imports `errorSummary` from T01;
  - each line is five fields, with separators and line breaks neutralised;
  - `parse` is strict (0–8 groups, exact keys, the alias pattern);
  - the cache is in memory only, with a 5-minute TTL, keyed by alias, `ticketId` and `updatedAt`.
- Combined check: a detached scratch worktree at `6ea07a4` plus both new files. Command: `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false`
  - Result: Test Suites: 4 failed, 4 skipped, 51 passed, 55 of 59 total. Tests: 56 failed, 4 skipped, 1131 passed, 1191 total.
  - The failing suites are `ta-ai-draft-route.api` (missing module), `ta-ai-insights-route.api`, `TATicketPage.ai` and `TAQueuePage.ai`. All belong to Group 3 work that is not implemented yet.
  - The failed-test count rose from 30 to 56 because `ta-ai-insights-route.api` now loads. Its 26 failures are mostly `Received: 404`, because the route is not mounted yet (T05). All existing suites pass.
- The scratch worktree was removed after the check.

## Notes for review (not blocking)

- T02 labels any `authorRole` other than `TA` as STUDENT. A `createdAt` that cannot be parsed sorts as time 0.
- Free-text ticket fields may still contain names typed by students. Only the gateway's redaction applies, as the spec intends.
- T03's cache key holds real `ticketId`s. It stays in memory and is never logged or sent to the model.
- T02 and T03 stay `[ ]` until independent review.
- 2026-11-09: The human chose "Commit both, start Group 3 (Recommended)".
