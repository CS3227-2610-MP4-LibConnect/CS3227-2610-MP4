# T01 implementation report: ticket create API and persistence

Status: **Complete; ready for independent review**  
Task: `student-tickets`, Batch 1, T01  
Specification: `workflow/specs/student-tickets.md` v0.3  
Checklist: `workflow/tasks/student-tickets/tasks.md` v0.2  
Handoff: `workflow/tasks/student-tickets/handoff.md` v0.2  
Assignment: `workflow/tasks/student-tickets/assignment-batch-1.json`

## Result

Implemented T01's `POST /api/tickets` contract. The route uses the established cookie session authenticator, rechecks current active account and Student role, preserves the temporary-password restriction, checks the established CSRF token, validates only the approved request fields and limits, and writes one server-owned C1 document. It returns only the created ticket ID on success and safe `400`, `401`, `403`, `413`, or `503` responses on failure. The route does not access replies, later ticket transitions, repository URLs, or Notification storage.

The route is mounted before the existing login app with a route-local 128 KiB JSON parser. Existing login and account request parsing remains behind the existing 8 KiB parser.

## Changed files

- `src/codeclinic/server/index.js`
- `src/codeclinic/server/tickets/route.js`
- `src/codeclinic/server/tickets/store.js`
- `src/codeclinic/server/tickets/validation.js`
- `src/codeclinic/test/student-tickets.api.test.js`
- `src/codeclinic/test/student-tickets.storage.test.js`

The task-scoped execution log is [implementation-T01.md](../../../logs/tasks/student-tickets/implementation-T01.md).

## Acceptance criteria

T01 is implemented against R4 and scenarios 4, 6–8, 11–12, 14–15. Tests cover active Student authorization, visitor and TA denial, CSRF, forged fields, exact C1 storage shape, Timestamp/null/empty values, normalized tags, revised language and text limits, source exclusivity, files and repository validation, malformed and oversized JSON, storage failure, literal HTML-like text, and no persisted Notification. A separate storage test confirms one document creation at `tickets/{ticketId}` and no other writes.

## Verification

Two focused test commands passed: 7 suites / 96 tests, then 2 suites / 44 tests. `git diff --check` passed. Exact commands and output summaries are in the execution log.

## Deviations and risks

- The approved handoff and assignment require Firestore `Timestamp` values. The project’s Jest resolver cannot resolve the `firebase-admin/firestore` export subpath even though Node can. The implementation imports `Timestamp` from `@google-cloud/firestore`, which is already present as a Firebase Admin runtime dependency; no package or lockfile was changed. Independent review should confirm that dependency path is acceptable for this repository's runtime contract.
- `openspec status --change student-tickets --json` reports no CLI-managed change. The repository adapter points to the approved `workflow/specs/` and `workflow/tasks/` artifacts, which were read and used; no duplicate OpenSpec tree was created.
- Approval status prose in the checklist and handoff still says the revised batch plan and dispatch await approval, while the current batch plan and assignment record the human's later approval. The current explicit approval and assignment controlled this implementation. The orchestrator should reconcile the stale prose during its normal evidence reconciliation.
- Token metrics were not exposed by the runtime. No child subagents were used.

## Subagent token usage

| Role | Assignment | Model | Input tokens | Output tokens | Total tokens | Metric source |
| --- | --- | --- | --- | --- | --- | --- |
| Implementer | student-tickets Batch 1 (T01) | unavailable | unavailable | unavailable | unavailable | runtime metrics unavailable |

T01 is ready for independent review. The checklist remains unchecked pending the orchestrator's review reconciliation; no approval or merge state was changed.

## Approved review correction (2026-11-09)

The human approved a scoped correction of the review's Unicode character-count finding and independent re-review. `validation.js` now applies its Unicode code-point counter to filename, repository URL, and aggregate repository-path limits. The file-content byte limit remains byte-based. Focused API tests now cover supplementary Unicode at and above all three character boundaries. The corrected focused suite passed: 2 suites, 45 tests. The correction is awaiting independent re-review; T01 remains unchecked. Exact command and result are appended to the [execution log](../../../logs/tasks/student-tickets/implementation-T01.md).
