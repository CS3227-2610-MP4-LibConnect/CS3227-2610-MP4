# Student ticket implementation batch plan

Version: 0.2 (human-approved 2026-11-09; approval in conversation)
Task ID: `student-tickets`
Approved artifacts: `workflow/specs/student-tickets.md` v0.3; `workflow/tasks/student-tickets/tasks.md` v0.2; `workflow/tasks/student-tickets/handoff.md` v0.2. Human approvals are in separate conversation turns. The human approved this batch plan v0.2 and Batch 1 (T01) implementation dispatch in the conversation on 2026-11-09. Later batches, commit, and merge remain separate decisions.

| Batch | Consecutive checklist items | Reason and gate |
| --- | --- | --- |
| 1 | T01 | Establish and independently review authorization, CSRF, bounded validation, and the C1 ticket document shape before the form depends on it. Split before T02 because this is the security-sensitive API and data model boundary. |
| 2 | T02, then T03 | Build the protected form against the reviewed API contract, then add the entry points and success feedback against the completed route. Implement sequentially and verify each item separately. |
| 3 | T04 | Final integration verification, guides, and evidence depend on T01–T03. |

The implementer for each batch completes and verifies the first item before starting the second. A separate reviewer checks each item and combined batch behavior from a separate worktree or clean checkout. The orchestrator reconciles findings and updates checklist status only after independent review. No later batch begins while a preceding item or review is blocked. Exact assignments, allowed files, checks, and evidence paths will be recorded in one validated `assignment-batch-<n>.json` per approved dispatch.

Preimplementation tests: `src/codeclinic/test/student-tickets.api.test.js` and `src/codeclinic/test/StudentTickets.test.tsx`, revised against specification v0.3. The final focused command `npm test -- --runInBand --watchAll=false --silent StudentTickets student-tickets.api` exited 1: two suites failed, 46 tests failed, one passed, 47 total. This is the expected missing-feature baseline; details and coverage gaps are in `test-coverage-report.md` and `logs/tasks/student-tickets/test-writer.md`. The log retains an earlier intermediate v0.3 run and a test-only Jest import issue that was fixed before the final run. No production change is claimed verified yet.

Batch 1 integration constraint: `createLoginApp` currently installs an 8 KiB JSON parser before later mounted routes. The approved ticket contract allows 128 KiB. The implementer should mount the ticket endpoint with a route-specific 128 KiB parser in `server/index.js` ahead of the existing login app, while preserving the smaller limit for existing auth/account endpoints and independently enforcing ticket session, role, forced-password-change, and CSRF rules. This stays within the approved `server/index.js` mounting scope and new ticket modules. The reviewer must check that a valid 24 KiB file request succeeds and existing auth parser behavior remains intact.

No commit, merge, push, deploy, or external-service action is covered by this proposal.

## Revision history

- 2026-11-09: The human directed execution of a new, one-item T05 follow-up
  for the create-page header and language placeholder, with existing header
  order preserved. Treat T05 as Batch 5; Batch 4 remains the earlier T01
  corrective artifact. Prior batch evidence is unchanged.

- 2026-11-09: v0.1 proposed T01, T02–T03, T04 against specification v0.2; no dispatch approval was given.
- 2026-11-09: v0.2 retained consecutive item order and the T01 security split, updated the artifact versions and C1 contract, and incorporated revised preimplementation test evidence. Human approval remains pending.
- 2026-11-09: The human replied "approve" to the explicit request to approve plan v0.2 and dispatch Batch 1 T01. No later-batch dispatch, commit, or merge was approved.
