# Proposed implementation batches: student-my-tickets

Version: 0.1 (2026-11-10)
Approval state: human approved this plan and ordered implementation dispatch on 2026-11-10 (see `approval-batch-plan-v0.1.md`).
Approved inputs: `workflow/specs/student-my-tickets.md` v0.1, `tasks.md` v0.1, and `handoff.md` v0.1, with separate approval records in this task directory.

## Order and assignments

| Batch | Checklist items, in approved order | Reason and boundary |
| --- | --- | --- |
| 1 | T01 owner-scoped paginated list API; T02 shared card and Student navigation | T01 establishes the bounded read contract. T02 has no API dependency and can follow T01 sequentially. Independent review of both is required before Batch 2. |
| 2 | T03 My Tickets views and load states; T04 integration verification and guides | T03 depends on the API and shared card. T04 verifies the integrated feature after T03. A human rendered check at 320 CSS pixels remains a T04 criterion and cannot be marked passed without the human's observations. |

Use one implementer for each batch, completing and verifying the first item before starting the second. Use a different independent reviewer for each batch to review each item and the combined change. Do not start Batch 2 until Batch 1 has been reviewed and reconciled. The orchestrator will create and validate each assignment manifest after plan and dispatch approval. The implementer must preserve the user's uncommitted dashboard wording change and the unrelated concurrent change to `src/workflow/validate-assignment.mjs`.

## Preimplementation test evidence

The test writer added `src/codeclinic/test/student-my-tickets.contract.test.js` and `src/codeclinic/test/StudentMyTickets.test.tsx`. The focused Jest run exited 1: 2 suites failed, 16 tests failed. Current code has no list API/store method, the page is still a placeholder, and the header lacks My Tickets. Full output is in `logs/tasks/student-my-tickets/preimplementation-tests.log`; coverage and assumptions are in `test-coverage-report.md`.

The preimplementation tests cover portions of T01–T03. The implementer must add or adjust tests for the remaining approved criteria, including cross-view cursor replay, multi-owner isolation, exact index configuration, shared card parity, direct route guard, stale responses, malformed UI responses, and keyboard behavior. The test writer assumed an internal `listPage(studentId, view, cursor)` seam; the implementer may adapt that test to a different internal interface without weakening the observable contract. T04 requires synthetic emulator coverage, relevant full tests, production build, and the human rendered browser check.

## Approval and open risks

Approval of this plan would authorize scoped implementation dispatch of the ordered batches, each with a validated assignment manifest and independent review. It would not authorize live Firestore access, index deployment, commit, merge, or other external action. A local index definition alone does not make the production query usable until the index is deployed in a separately approved action. Browser layout and contrast remain unverified until the human check.
