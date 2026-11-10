# Preimplementation test coverage: student-my-tickets

Date: 2026-11-10  
Approved inputs verified: specification v0.1, checklist v0.1, handoff v0.1. Separate human approval records verified at `approval-spec-v0.1.md`, `approval-checklist-v0.1.md`, and `approval-handoff-v0.1.md`.  
No implementation dispatch or production-code change was made.

## Tests added

- `src/codeclinic/test/student-my-tickets.contract.test.js`
  - API expectations for Open and Closed response summaries, no-store headers, default Open view, server-derived owner despite a forged `studentId` query parameter, malformed/repeated view and malformed cursor rejection before storage, TA/inactive Student denial, and safe storage-failure response.
  - Firestore query shape for both status groups: owner equality, two-status filter, `updatedAt` descending and `ticketId` ascending ordering, cursor boundary, 21-document limit, 20-item response page, and safe summary projection.
- `src/codeclinic/test/StudentMyTickets.test.tsx`
  - Default Open view, both terminal status cards, status labels, ticket detail links, page navigation order/current indicator, TA link exclusion, preserved dashboard “View all tickets” destination, load-more failure with retained cards and retry, and suppression of repeated load-more requests while pending.

## Coverage against checklist

- **T01:** Partial contract coverage for route validation, owner derivation, account gating, safe responses, status groups, bounded indexed query shape, cursor boundary, and projection. Not covered: more than 20 end-to-end API results, actual next-cursor encoding or cross-view replay, another authenticated Student, password-change denial, auth/storage failure distinctions beyond one storage case, exact Firestore index configuration, or explicit proof that no full collection read occurs beyond the asserted query-operation shape.
- **T02:** Navigation ordering/current state, Student-only visibility, and dashboard link text/destination are covered. Shared card parity, exact title/metadata/tag order, “No concept tags”, muted terminal styling, and visible focus are not covered.
- **T03:** Default selection, view switch, four status values, links, page-load failure/retry, and duplicate-request suppression are covered. Direct-route guard outcomes, empty and malformed-response states, stale response after rapid view switch, keyboard operation/focus, and 320 CSS-pixel layout are not covered.
- **T04:** No new emulator integration test was added. The existing emulator integration test exercises the prior five-item active summary and reply paging, not the new all-status 20-item list contract. Extending it before the list API/store exists would duplicate the unit contract assumptions and cannot establish emulator behavior yet. No emulator or external service was run.

## Assumptions and gaps

The specification fixes the HTTP contract and Firestore query semantics but does not prescribe the internal store method name, argument order, or cursor object. The store tests currently assume a future `listPage(studentId, view, cursor)` method returning `{ tickets, nextCursor }`, with a cursor object exposing `{ updatedAt, ticketId }`. This is a test seam assumption for the agreed behavior, not an approved internal API. The implementer may choose another internal interface while preserving these externally specified semantics; if so, the store test should be adapted without weakening the contract assertions.

The API tests currently expect the router to call that store seam with `(verifiedStudentId, view, cursor)`. They do not assert UI-specific query string encoding beyond the view request or prescribe any visual implementation details.

## Verification

Command, run from `src/codeclinic`:

```text
npm test -- --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/StudentMyTickets.test.tsx
```

Result: exit code 1; 2 suites failed, 16 tests failed. The complete command output is retained in [preimplementation-tests.log](../../../logs/tasks/student-my-tickets/preimplementation-tests.log).

Distinct current implementation gaps observed:

- The list API paths currently return 404, so expected success, validation, authorization, and safe storage-failure behaviors are not reached.
- `createFirestoreTicketStore` has no `listPage` method yet.
- `MyTicketsPage` remains the approved placeholder with no view controls, list request, cards, or pagination.
- `AppHeader` does not yet render the My Tickets navigation entry.

There was also a React Testing Library `act(...)` console warning from the existing notification bell during the header test; it did not create a separate assertion failure. The user's existing uncommitted `StudentDashboard.tsx` change was preserved. An unrelated concurrent change to `src/workflow/validate-assignment.mjs` was observed and left untouched.

## Changed files

- `src/codeclinic/test/student-my-tickets.contract.test.js`
- `src/codeclinic/test/StudentMyTickets.test.tsx`
- `workflow/tasks/student-my-tickets/test-coverage-report.md`
- `logs/tasks/student-my-tickets/preimplementation-tests.log`
