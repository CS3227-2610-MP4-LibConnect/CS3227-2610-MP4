# Independent review: Batch 3 (T03, T04)

Reviewed against approved specification v0.3, checklist v0.2, handoff v0.2,
assignment `assignment-batch-3.json`, and human dispatch approval
`approval-batch-3.md`. The assigned order was T03 then T04. The implementation
reports and factual review commands are linked in
[`review-batch-3.md`](../../../logs/tasks/student-ticket-activity/review-batch-3.md).
Review was performed by an agent different from the implementer. The manifest's
shared-workspace exception applies; unrelated/pre-existing workspace edits and
prior batch work were not attributed to Batch 3.

## T03 — Reply and close writes

**Verdict: changes required.** The transaction, ownership, CSRF, request
validation, state transition, atomic timestamp, and safe storage-error paths
meet the reviewed requirements. One R5 response-header gap remains: malformed
JSON and oversized request bodies fail in the route-level JSON parser before
the route handlers set `Cache-Control: no-store`. The router error handler at
[`route.js`](../../../src/codeclinic/server/tickets/route.js) lines 200–207
returns 400/413 without setting that header. The API-level requirement says all
ticket API responses use `no-store`, and the focused malformed/oversized tests
do not assert it. Set the header in this error handler (or an earlier router
middleware) and add assertions for both parser-error responses before review
can pass.

### Acceptance trace

- Reply validation allows only a trimmed, nonempty `message` within the 5,000
  character limit. Close accepts only an empty object. The request parser is
  bounded at 128 KiB and maps malformed/oversized bodies to safe 400/413 copy.
- Both writes use the shared Student-write authenticator: valid session,
  current active account, Student role, password-change guard, and CSRF check.
  The store transaction re-reads the ticket and owner before writing; absent or
  non-owned tickets map to 404, and terminal state maps to 409.
- Reply creation derives ID, author ID, and Firestore timestamps on the server;
  reply creation and parent `updatedAt` update are in one transaction. Close
  permits only active states, sets `CLOSED`, clears the claim, retains null
  resolution fields, and writes `updatedAt` transactionally.
- Focused tests cover active `OPEN`/`CLAIMED` cases, forged fields, wrong roles,
  missing CSRF, cross-owner denial, malformed and oversized input, terminal
  conflicts, simulated transaction re-read after a state change, timestamps,
  and safe storage failures. These tests pass, but the parser-error cache
  headers are unasserted.

## T04 — Dashboard cards and My Tickets placeholder

**Verdict: pass with follow-up.** The dashboard renders server-returned active
summaries in response order, validates the bounded five-item result, shows
title/language/status/tags, links each card to its ticket detail path, and
provides distinct loading, empty, and retryable error states. The dashboard
route guard verifies a Student before rendering My Tickets; visitor and TA
paths are denied. The placeholder says the full list is coming later and links
back to the dashboard. The user's dashboard sentence removal remains intact.
The server shell includes `/student/tickets` for direct visits and refresh.

Focused T04 tests passed for ordering/card fields and five-item cap, card and
Load all links, loading/empty/error-retry states, Student verification, visitor
redirect, and TA denial. Responsive styling provides wrapping and visible focus.
The implementation report records that production build, visual inspection,
and a direct HTTP shell-route check were not run; retain those checks for T06.

## Combined T03/T04 behavior

**Verdict: changes required.** No interaction regression was found between the
new dashboard/placeholder routes and the ticket API write endpoints. Combined
focused API/store/contract and T04 UI tests passed. The T03 R5 `no-store` gap
still applies to malformed/oversized write requests and blocks a combined pass.

## Findings and verification limits

- **Blocking finding for T03:** parser-level 400/413 responses omit
  `Cache-Control: no-store` (R5), at `server/tickets/route.js:201–207`.
- T04's production build, visual check at 320 CSS pixels, and direct server
  shell HTTP behavior remain unverified and are assigned to T06. The focused
  UI tests use local mocked fetch responses; no live services or emulator were
  contacted in this review.
- The tests use transaction fakes for T03. Real Firestore transaction/index
  behavior remains assigned to T06.

No production source, tests, checklist, assignment manifest, or approval record
was changed by this review. No checklist item or later batch is advanced.

## Overall conclusion

**Changes required** for the combined Batch 3 result. T04 passes with T06
verification follow-up; T03 must ensure parser-error responses are no-store
and verify those headers before it can pass.
