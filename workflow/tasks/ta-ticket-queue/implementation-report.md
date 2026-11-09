# Implementation report: ta-ticket-queue

Specification: `workflow/specs/ta-ticket-queue.md` v0.1 (human-approved 2026-11-09)
Checklist: `workflow/tasks/ta-ticket-queue/tasks.md` v0.1, grouping human-approved 2026-11-09
Handoff: `workflow/tasks/ta-ticket-queue/handoff.md` v0.1 (human-approved 2026-11-09)
Integration branch: local `ta-ticket-queue` (from `TA-coordinator` `3203bb1`). Nothing pushed.
Status: implementation complete. **Awaiting independent review**: no checklist item is marked `[x]` yet.

## Tasks

| Task | Group | Branch / commit | Task report | Orchestrator check |
| --- | --- | --- | --- | --- |
| T01 store and state machine | 1 | `ta-ticket-queue-t01` / `e8349e1` | `implementation-T01.md` | 103/103 target tests |
| T02 list and detail API | 2 | `ta-ticket-queue-t02` / `d9a7f27` | `implementation-T02.md` | Scope; test defect confirmed (see D2) |
| T03 claim, unclaim, resolve | 3 | `ta-ticket-queue-t03` / `8c74d73`; fix `b183aea` | `implementation-T03.md` | Merged; F1 fixed |
| T04 replies | 3 | `ta-ticket-queue-t04` / `d179fce` | `implementation-T04.md` | Merge conflict resolved by the orchestrator |
| T06 queue page | 3 | `ta-ticket-queue-t06` / `f6a7a28` | `implementation-T06.md` | Merged; D1 |
| T05 emulator tests | 4 | `ta-ticket-queue-t05` / `bf2d1cd` | `implementation-T05.md` | Test diff checked as additive |
| T07 ticket page | 4 | `ta-ticket-queue-t07` / `ded795b` | `implementation-T07.md` | Full suite 988 passed, 0 failed on `f505501` |
| T08 guides and evidence | 5 | `ta-ticket-queue-t08` / `5628e32` | `logs/tasks/ta-ticket-queue/12-implementer-T08.md` | See the final verification below |

Reconciliation details for each group, with exact commands and results:
`logs/tasks/ta-ticket-queue/04-orchestrator-stage3.md`.

## Findings, deviations, and test changes

- **F1 (fixed):** the R2 detail view was built twice, with different
  `claimedByMe` rules. It is now unified in `server/tickets/ta-views.js`
  (`b183aea`).
  - Open for review: the list view sets `claimedByMe` only while the ticket is
    `CLAIMED`.
  - Missing regression test: a resolver viewing their resolved ticket.
- **D1 (deviation):** `DashboardRouteGuard.tsx` was not an allowed file, so
  `TADashboard.tsx` renders `TAQueuePage` and `TATicketPage` by path, behind
  the TA guard. T07's edit to `TADashboard.tsx` was directed by the
  orchestrator.
- **D2 (approved test fix):** `DETAIL_KEYS` was reordered (`7ae376b`, with
  human approval). The assertions are unchanged.
- **D3 (test change):** T05 added 3 lines to the emulator test to activate the
  seeded TA account. The change is additive.
- **D4 (deviation):** `server/index.js` builds the Firestore ticket store
  lazily, because Jest cannot resolve `firebase-admin/firestore`. This matches
  `server/firestore-target.js`.
- **Orchestrator error:** T01's assignment named `.claude/skills/`, which is
  absent in worktrees. T01 ran without its skills; later assignments used
  `.agents/skills/`.

## Unresolved risks

- Shared ticket contract (spec section C): not yet confirmed by the Student
  owner.
- Production composite indexes (Q4) are not added, so filtered queries may
  fail in production.
- No ticket-creation path exists in the app until `student-tickets` ships.
- The emulator suite passes only according to the implementers' reports. The
  orchestrator has not re-run it; the reviewer must.

## Final verification

Run by implementer T08 on `f505501` + docs (`5628e32`). Commands are in
`logs/tasks/ta-ticket-queue/12-implementer-T08.md`.

- Full suite: 43 suites passed, 4 skipped; 988 tests passed, 4 skipped, 0
  failed. The orchestrator independently got the same counts on `f505501`.
- Emulator suite (`RUN_FIRESTORE_EMULATOR_TESTS=1`, `demo-codeclinic`): 1/1
  passed, as reported by T05 and T08. The first T08 attempt hung (stdin not
  redirected) and was killed. The orchestrator confirmed afterwards that no
  emulator is listening on port 8080.
- `npm run build`: compiled successfully.
- Merged integration head: `1cb8dc8`.

## Subagent token usage

Source: the `subagent_tokens` field of the Claude Code task notifications.
The subagents could not see their own counts and reported `unavailable`. The
runtime gives a total only, with no input/output split. For a resumed agent,
the figure appears to be cumulative across its runs; that is not confirmed,
so resumed runs show the reported figure.

| Role | Task/group and run | Model | Input tokens | Output tokens | Total tokens | Usage source |
| --- | --- | --- | ---: | ---: | ---: | --- |
| Task grouper | Proposal, run 1 | claude-haiku-5-5 | unavailable | unavailable | 50,676 | task notification |
| Test writer | T01–T07 tests, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 138,199 | task notification |
| Task grouper | Apply grouping, run 2 (resumed) | claude-haiku-5-5 | unavailable | unavailable | 65,636 (reported; may include run 1) | task notification |
| Implementer | T01, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 71,168 | task notification |
| Implementer | T02, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 78,941 | task notification |
| Implementer | T03, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 68,457 | task notification |
| Implementer | T04, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 55,676 | task notification |
| Implementer | T06, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 71,871 | task notification |
| Implementer | T03-fix, run 2 (resumed) | claude-sonnet-5-5 | unavailable | unavailable | 74,305 (reported; may include run 1) | task notification |
| Implementer | T05, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 54,444 | task notification |
| Implementer | T07, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 73,382 | task notification |
| Implementer | T08, run 1 | claude-sonnet-5-5 | unavailable | unavailable | 64,122 | task notification (23 tool uses, 573.3 s; stopped by the orchestrator after hand-back, with background work still open) |

An aggregate is not given, for two reasons: the totals of the resumed runs
may double-count earlier runs, and the reviewer rows are still pending.
