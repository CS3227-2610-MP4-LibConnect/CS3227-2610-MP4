# Student ticket implementation batch plan

Version: 0.3 (2026-11-12 file-picker amendment; human-approved in conversation)
Task ID: `student-tickets`
Current approved artifacts: `workflow/specs/student-tickets.md` v0.5; `workflow/tasks/student-tickets/tasks.md` v0.4; `workflow/tasks/student-tickets/handoff.md` v0.4. The human approved each separately on 2026-11-12 and then separately approved this v0.3 batch plan. Implementation dispatch remains a separate decision. The earlier v0.2 plan and T01–T05 assignments remain historical.

| Batch | Consecutive checklist items | Reason and gate |
| --- | --- | --- |
| 1 | T01 | Establish and independently review authorization, CSRF, bounded validation, and the C1 ticket document shape before the form depends on it. Split before T02 because this is the security-sensitive API and data model boundary. |
| 2 | T02, then T03 | Build the protected form against the reviewed API contract, then add the entry points and success feedback against the completed route. Implement sequentially and verify each item separately. |
| 3 | T04 | Final integration verification, guides, and evidence depend on T01–T03. |
| 6 | T06, then T07 | Replace the Create Ticket paste controls with a bounded text-file picker, then verify the unchanged API/AI boundaries and update guides. Both items touch the same create-page flow and can be independently reviewed together after sequential implementation. |

The implementer for each batch completes and verifies the first item before starting the second. A separate reviewer checks each item and combined batch behavior from a separate worktree or clean checkout. The orchestrator reconciles findings and updates checklist status only after independent review. No later batch begins while a preceding item or review is blocked. Exact assignments, allowed files, checks, and evidence paths will be recorded in one validated `assignment-batch-<n>.json` per approved dispatch.

Historical v0.2 preimplementation tests: `src/codeclinic/test/student-tickets.api.test.js` and `src/codeclinic/test/StudentTickets.test.tsx`, revised against specification v0.3. The final focused command `npm test -- --runInBand --watchAll=false --silent StudentTickets student-tickets.api` exited 1: two suites failed, 46 tests failed, one passed, 47 total. This was the expected missing-feature baseline at that stage; details and coverage gaps are in `test-coverage-report.md` and `logs/tasks/student-tickets/test-writer.md`. The log retains an earlier intermediate v0.3 run and a test-only Jest import issue that was fixed before the final run.

For Batch 6, a separate test writer added v0.5 picker cases to `src/codeclinic/test/StudentTickets.test.tsx`. The focused preimplementation run from `src/codeclinic` used `npm test -- --watchAll=false --runInBand StudentTickets.test.tsx StudentTicketHelpChat.test.tsx`: 2 suites, 27 tests, 21 passed and 6 new picker cases failed because the current UI has no picker. The complete final output is `logs/tasks/student-tickets/attachment-test-writer-run.txt`; coverage and gaps are in `attachment-test-coverage.md`. Deterministic pending-read suppression for ticket and create-page help-chat requests remains an implementation test requirement because a reader-neutral preimplementation test would impose an unapproved read API. Batch 6 implementation remains unapproved until the human approves a separate dispatch proposal.

Batch 1 integration constraint: `createLoginApp` currently installs an 8 KiB JSON parser before later mounted routes. The approved ticket contract allows 128 KiB. The implementer should mount the ticket endpoint with a route-specific 128 KiB parser in `server/index.js` ahead of the existing login app, while preserving the smaller limit for existing auth/account endpoints and independently enforcing ticket session, role, forced-password-change, and CSRF rules. This stays within the approved `server/index.js` mounting scope and new ticket modules. The reviewer must check that a valid 24 KiB file request succeeds and existing auth parser behavior remains intact.

No commit, merge, push, deploy, or external-service action is covered by this proposal.

## Revision history

- 2026-11-12: The human approved v0.3 Batch 6 for approved spec v0.5, checklist v0.4, and handoff v0.4. T06 and T07 run in order under one implementer, followed by one different independent reviewer. Prior T01–T05 batches and their approval evidence are unchanged. Dispatch remains a separate human decision.

- 2026-11-09: The human directed execution of a new, one-item T05 follow-up
  for the create-page header and language placeholder, with existing header
  order preserved. Treat T05 as Batch 5; Batch 4 remains the earlier T01
  corrective artifact. Prior batch evidence is unchanged.

- 2026-11-09: v0.1 proposed T01, T02–T03, T04 against specification v0.2; no dispatch approval was given.
- 2026-11-09: v0.2 retained consecutive item order and the T01 security split, updated the artifact versions and C1 contract, and incorporated revised preimplementation test evidence. Human approval remains pending.
- 2026-11-09: The human replied "approve" to the explicit request to approve plan v0.2 and dispatch Batch 1 T01. No later-batch dispatch, commit, or merge was approved.
