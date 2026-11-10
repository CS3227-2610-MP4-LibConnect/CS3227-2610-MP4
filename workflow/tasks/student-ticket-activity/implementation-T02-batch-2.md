# Implementation handoff: T02, Batch 2

Status: **complete; ready for independent review**  
Task: `student-ticket-activity`, Batch 2  
Specification: v0.3 (approved)  
Checklist: v0.2 (approved)  
Handoff: v0.2 (approved)  
Dispatch approval: `approval-batch-2.md`

## Implementation

T02 now validates ticket path IDs and opaque reply cursors before Firestore
access, queries replies in stable `createdAt`/`replyId` order with a maximum
page size of 50, and rechecks ticket existence and ownership on each request.
A full page uses a separate one-document probe to determine whether another
page exists; the response includes `nextCursor` only when the probe finds one.
Author-account lookups run in groups of at most five. A missing owner account
is rendered as `[deleted account]` with the `STUDENT` role. Safe 400 and 503
responses and `Cache-Control: no-store` are retained.

## Acceptance criteria

- **T02 — complete.** Ownership and session checks precede reply output; each
  page re-reads and rechecks the owned ticket. Ticket and cursor validation,
  bounded ordered pagination, trusted author lookup with bounded concurrency,
  missing-owner fallback, safe error handling, and focused regression tests
  are implemented.
- Cross-owner 404, visitor/TA denial, safe storage failure, literal reply text,
  malformed ticket ID/cursor, no-cursor final page, and the 50-reply page
  boundary have focused coverage. The stable boundary uses the ordered pair
  `(createdAt, replyId)`.

## Changed files

- `src/codeclinic/server/tickets/route.js`
- `src/codeclinic/server/tickets/store.js`
- `src/codeclinic/server/tickets/validation.js`
- `src/codeclinic/test/student-ticket-activity.contract.test.js`
- `src/codeclinic/test/student-tickets.api.test.js`
- `src/codeclinic/test/student-tickets.storage.test.js`

Factual command output and outcomes are in
`logs/tasks/student-ticket-activity/implementation-T02-batch-2.md`.

## Scope notes and risks

- The initial OpenSpec CLI probe returned the repository as its root with no
  active OpenSpec changes. The approved repository adapter and source of truth
  are the versioned files under `workflow/specs/` and
  `workflow/tasks/student-ticket-activity/`; no second OpenSpec tree was
  created and no checklist/approval artifact was changed.
- The combined three-suite run has two failures in existing reply/close API
  contract tests for T03 routes, which are outside this T02-only assignment.
  The T02 contract tests pass when selected by name; API and storage suites
  pass in the combined run. This is recorded in the factual log.
- Firestore behavior was verified with focused query fakes. No production
  service or live data was accessed. Emulator integration remains in T06.
- No deviation from the approved T02 behavior. The user's dashboard edit was
  not changed.

The implementation is ready for independent review. No checklist status or
review artifact was changed.
