# Independent review: Batch 2 (T02)

Reviewed against approved specification v0.3, checklist v0.2, handoff v0.2,
assignment `assignment-batch-2.json`, and human approval `approval-batch-2.md`.
The assignment is T02 only. The reviewer is independent of the named implementer;
the shared-workspace exception is recorded in the approved manifest. The
factual commands and complete test outcomes are in
[`review-batch-2.md`](../../../logs/tasks/student-ticket-activity/review-batch-2.md).

## T02 — Owned ticket detail and thread read

**Verdict: pass.** The T02 implementation meets the reviewed API/store
acceptance criteria. The route validates decoded ticket IDs and cursors before
storage access, uses the verified session and rechecks the active Student
account, then asks the store for a ticket scoped to the authenticated owner.
The store checks ticket existence and `studentId` before reading the replies
subcollection, returns an explicit ticket projection, and queries at most 50
replies ordered by `createdAt` ascending and `replyId` ascending. Continuations
use both ordered values with `startAfter`; a separate `limit(1)` probe controls
whether a next cursor is emitted. Each continuation request re-enters the route
and repeats session/account and ticket-owner checks.

Author IDs are stripped from reply projections. Names come from the account
repository, while the owner role is derived from the verified owner ID; a
missing owner account produces `[deleted account]` and `STUDENT`. Author account
lookups run in batches of at most five. Safe errors do not expose storage error
text, and the route sets `Cache-Control: no-store`.

### Acceptance trace

- **Authentication, role, ownership, and cross-owner hiding:** route checks the
  authenticated current Student before `getOwned`; store returns `null` for
  missing or differently owned tickets before querying replies. Focused
  contract/API tests pass for visitor/TA denial and cross-owner 404.
- **Safe detail projection and plain text:** store allowlists ticket fields and
  reply fields; route removes `authorUserId` and emits trusted author objects.
  Contract test passes with literal markup in title/reply content and confirms
  author IDs are absent.
- **Bounded ordering and continuation:** Firestore query applies `limit(50)`;
  the continuation orders and resumes on `(createdAt, replyId)`; the probe uses
  `limit(1)`. Storage tests verify those operations and a full-page boundary;
  contract test verifies a cursor for a further page and none for a final page.
- **Cursor and ticket input:** ticket IDs must match the bounded allowed
  character/length pattern. Cursor length/encoding, timestamp components and
  reply ID are validated before constructing a Firestore Timestamp. API tests
  pass for an encoded slash and malformed cursor, each returning safe 400 with
  no-store.
- **Author fallback and lookup bound:** focused contract tests pass for missing
  owner-account fallback and an observed maximum of five concurrent author
  lookups across 50 replies.
- **Storage failure:** API suite and activity contract test pass with safe 503
  responses. No raw storage detail is returned.

No unapproved T02 scope change was found in the scoped route/store/validation
and test changes. The query is bounded in document count and the response uses
explicit projections. Data-value validation for legacy or manually corrupted
Firestore records was not exercised; ordinary writes are validated by the
existing ticket contract and future T03 reply contract.

## Combined T01/T02 behavior

**Verdict: pass with follow-up.** T01's `/active` route is registered before
`/:ticketId`, so the detail route does not shadow the active endpoint. The
combined focused run passed the complete API and storage suites and all T01/T02
contract cases. It had two failures in the activity contract suite, both in
T03 reply/close API cases that correctly return 404 while those later routes
are not implemented. These failures are outside this T02 assignment and must
be addressed and re-run in the approved T03 batch; they do not indicate a T01
or T02 regression.

## Findings and unresolved verification limits

- **No blocking findings.** The former Batch 1 T02 defects (malformed ticket
  IDs, missing-owner role/name, and unbounded thread response) are corrected
  for the v0.3 contract.
- **Verification remains for T06:** no Firestore emulator integration was run
  in this review. The fake-query tests verify ordering and the two-field cursor
  boundary, but do not independently prove real Firestore paging across equal
  timestamps or under concurrent reply insertion. T06 owns emulator coverage.
- **Not verified in this T02-only review:** browser rendering/accessibility and
  320-pixel layout are assigned to T05/T06; reply/close state transitions and
  writes are assigned to T03.

The scoped test commands and results are recorded in
[`review-batch-2.md`](../../../logs/tasks/student-ticket-activity/review-batch-2.md).
No review-only tests were added. No checklist status was changed and no later
batch is advanced.

## Overall conclusion

**Pass with follow-up** for the combined T01/T02 behavior: T02 passes; T01/T02
focused tests pass. The two known T03 contract failures and T06 emulator proof
remain follow-up work in their approved phases.
