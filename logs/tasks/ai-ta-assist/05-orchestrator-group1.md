# ai-ta-assist: orchestrator reconciliation of Group 1 (2026-11-09)

## Dispatch

- The human replied "yes, start T01".
- Worktree `<scratchpad>/wt/a-t01`, branch `ai-ta-assist-t01`, base `eb49679`.

## Subagent runs

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T01 (Group 1), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 56,263 | Claude Code task notification `subagent_tokens` (9 tool uses, 85.2 s) |

The implementer reported its own counts as `unavailable`.

## Verification by the orchestrator

- Worktree changes:
  - new `server/tickets/ta-ai-shared.js`;
  - a one-line export change in `server/tickets/ta-claims.js`, which now also exports `isEmptyBody`, with no behaviour change;
  - the implementer's evidence files `implementation-T01.md` and `04-implementer-T01.md`.
  No other file changed.
- The R5 messages in the code match the spec R5 table, checked line by line.
- Command (from `src/codeclinic` in the worktree): `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false ta-ai-shared ta-claims ta-tickets`
  - Result: Test Suites: 6 passed, 6 total. Tests: 329 passed, 329 total.
- The full-suite result (6 failed, 4 skipped, 49 passed; 30 failed, 1079 passed) is the implementer's report. The 6 failing suites are the T02–T07 suites, which have no implementation yet. The orchestrator did not re-run the full suite.

## Notes for review (not blocking)

- `requireEmptyJsonBody` answers 400 with its own message, "This request does not take a body.". The existing claim and reply routes use `MESSAGES.INVALID`. The spec does not fix the 400 body, but the two messages are inconsistent.
- An unknown gateway code falls back to the `AI_UNAVAILABLE` row. This is the implementer's choice; the spec is silent on it.
- `ta-ai-shared.js` requires `ta-claims.js`, so it loads express. The implementer judged this harmless.
- T01 stays `[ ]` until independent review.
- 2026-11-09: The human chose "Commit T01, start Group 2 (Recommended)".
