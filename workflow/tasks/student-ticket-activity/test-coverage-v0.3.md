# Preimplementation test coverage addendum v0.3

Task: `student-ticket-activity`  
Specification: v0.3 (approved)  
Checklist: v0.2 (approved)  
Handoff: v0.2 (approved)

## Coverage added or amended

- T02 storage tests now reject the prior full-thread expectation and require a
  Firestore limit of 50 before reading. A continuation case checks stable
  `createdAt`/`replyId` ordering, cursor boundary use, and a limit before read.
- T02 API cases require malformed ticket IDs and malformed cursors to return
  safe 400 responses with `Cache-Control: no-store`.
- T05 adds a two-block UI scenario that retains the previous reply and displays
  `[deleted account]` as a Student author.

The approved spec intentionally keeps cursor encoding opaque. The continuation
test uses a conceptual cursor object at the store boundary and makes no claim
about the endpoint's encoded cursor format. A further contract detail remains
open for implementation: the spec requires a `nextCursor` when additional
replies exist while limiting each reply query to at most 50; it does not state
how the store detects another page without reading an extra document. The
implementation should resolve this within those bounds or raise the ambiguity
before coding.

Bounded author-account lookup concurrency is required by R5, but no stable
injection seam exists in the current integration test fixture for observing
repository lookup concurrency. It is not asserted by these tests and should be
covered in T02 implementation verification with an injectable author lookup
or a focused route-level unit test.

## Verification

Command, rerun after the encoded-slash correction: `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-tickets.storage.test.js test/student-tickets.api.test.js test/StudentTicketActivity.test.tsx`

Result: 3 suites failed; 9 tests failed, 47 passed, 56 total. The storage
failures are the expected missing page limit and cursor query behavior. The API
cases receive 404 for encoded slash and malformed cursor where v0.3 requires
400. The UI session fixture returns status 200 with `accountType: STUDENT`, and
the shared header renders, so authentication succeeded. The first UI failure
is the missing active-tickets region; the detail deep-link route also currently
falls through to login. These are absent UI implementation paths, not a session
fixture defect, so no harness-only correction can make the tests reach the
requested pages. The new UI paging assertion remains unverified. Full output:
[`test-writer-v0.3.log`](../../../logs/tasks/student-ticket-activity/test-writer-v0.3.log).

First distinct failure: the first UI test could not find the dashboard's active
tickets region after the valid Student session/header. No production files
were changed.
