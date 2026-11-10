# ai-ta-assist: orchestrator reconciliation of Group 5 (2026-11-09)

## Dispatch

- The human chose "Commit log, start T08 (Recommended)".
- T08 ran in `<scratchpad>/wt/a-t08` (branch `ai-ta-assist-t08`, base `6553fb0`).

## Subagent runs

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Implementer | T08 (Group 5), run 1 | claude-sonnet-5-5 | unavailable | unavailable | 68,927 | Claude Code task notification `subagent_tokens` (9 tool uses, 89.2 s) |

The implementer reported its own counts as `unavailable`.

## Verification by the orchestrator

- The worktree changes `docs/UserGuide.md` (+40/−1) and `docs/DeveloperGuide.md` (+99/−3), plus the implementer's two evidence files.
- The orchestrator read the User Guide diff:
  - the "Concept tag" rename;
  - a new "AI help for TAs" subsection, which says AI output is advisory, gives the four R5 messages with their meanings, and carries the ai-gateway R6 warning not to paste secrets.
- The Developer Guide adds "## TA AI assist" and "### Live SoCLaaS test (opt-in)". It also corrects two stale sentences that said no AI feature was mounted or registered, a change within the allowed files.
- A grep of the added lines found only placeholders (`<your key>`, `https://<host>/v1`), and no real host, key or model name.
- Implementer-reported results:
  - full suite: Test Suites: 5 skipped, 55 passed, 55 of 60 total; Tests: 9 skipped, 1212 passed, 1221 total;
  - `npm run build` succeeded.
  The orchestrator did not re-run them; the change is docs-only.
- T08 stays `[ ]` until independent review.
- 2026-11-09: The human chose "Commit T08, start review (Recommended)".
