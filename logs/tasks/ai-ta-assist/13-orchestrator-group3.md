# ai-ta-assist: orchestrator reconciliation of Group 3 (2026-11-09)

## Dispatch

- The human chose "Commit both, start Group 3 (Recommended)".
- T04, T05, T06 and T07 ran in parallel in `<scratchpad>/wt/a-t04` … `a-t07` (branches `ai-ta-assist-t04` … `t07`), all from `f88ddf6`.

## Subagent runs

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T04 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 66,027 | Claude Code task notification `subagent_tokens` (9 tool uses, 92.1 s) |
| Implementer | T05 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 62,755 | Claude Code task notification `subagent_tokens` (7 tool uses, 70.1 s) |
| Implementer | T06 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 57,855 | Claude Code task notification `subagent_tokens` (7 tool uses, 71.7 s) |
| Implementer | T07 (Group 3), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 57,799 | Claude Code task notification `subagent_tokens` (10 tool uses, 115.3 s) |

All four implementers reported their own counts as `unavailable`.

## Verification by the orchestrator

- Each worktree touches only its allowed files and its own two evidence files.
- `ta-routes.js`: T04 and T05 each added a require and a mount line, two lines each, not the one line the checklist expected. This is needed and in scope.
- The adjacent-line conflict was resolved by hand. The insights mount comes first, after the replies mount; the draft mount follows; both come before `/:ticketId`.
- `index.js`: T04 added one require and one `registerTaAiFeatures(app.locals.aiGateway)` line after `createAiGateway`. `register` exists even when the gateway is disabled (`server/ai/gateway.js:95`).
- The orchestrator read `ta-ai-draft-route.js`:
  - authorization uses the store's `status` and `claimedByTaId` against `req.actor.userId`;
  - the gateway is read per request;
  - the reply `authorRole` comes from the author's stored account through `createUserLookup`, not from client data;
  - the gateway input has no IDs, names or `repoUrl`;
  - there are no writes.
- The orchestrator read `ta-ai-insights-route.js`:
  - the store's `ACTIVE` listing is ordered by `createdAt` ascending (`store.js:270`);
  - the route collects at most 61 tickets, so `truncated` works;
  - the cache is per router and caches only successes;
  - output goes through `cleanInsightGroups`;
  - there are no writes.
- Combined check: a detached scratch worktree at `f88ddf6` with all four diffs and the merged `ta-routes.js`, from `src/codeclinic`:
  - `CI=true npx react-scripts test --roots test --testMatch '**/test/**/*.test.*' --watchAll=false`: Test Suites: 4 skipped, 55 passed, 55 of 59 total. Tests: 4 skipped, 1212 passed, 1216 total.
  - `npx tsc --noEmit -p .`: clean.
  - `npm run build`: succeeded.

## Deviation needing a human decision

T07 renamed the queue filter label "Concept" to "Concept tag" (`TAQueuePage.tsx`, a one-word visible change). The committed `TAQueuePage.ai` test uses `getByText('Concept')` for the insights kind badge, and the old filter label also matched it. The existing tests use `getByLabelText(/concept/i)` and still pass. The alternative is a scoped test change (for example, querying inside the insights panel).

## Notes for review (not blocking)

- T04 uses its own 409 text instead of a shared message constant.
- T05 adds `truncated` to the cache key, so a 61st ticket appearing invalidates the cache.
- T06 uses `window.confirm` for the replace prompt, which the spec leaves open.
- The 320 px layout is checked only by CSS source tests, not in a browser.
- T04–T07 stay `[ ]` until independent review.

## Human decisions

- 2026-11-09: The human chose 'Accept "Concept tag" (Recommended)'. The filter-label rename is an accepted deviation.
- 2026-11-09: The human chose "Commit all 4, start Group 4 (Recommended)". T04 was committed on `ai-ta-assist-t04`. T05–T07 were committed from the combined check tree, with `ta-routes.js` resolved as above.
