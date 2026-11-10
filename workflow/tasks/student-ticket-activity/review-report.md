# Independent review: Batch 1 (T01, T02)

Reviewed specification v0.2, checklist v0.1, handoff v0.1, and approved Batch 1
assignment. The human approved T01 then T02 and the read-only Standard-edition
check; the approval record is `approval-batch-1.md`. Reviewer and implementer
are distinct. The approved manifest records the shared-workspace exception; I
inspected the exact scoped diff and left implementation files unchanged.

## T01 — Indexed active-ticket read

**Verdict: pass.** The query in `src/codeclinic/server/tickets/store.js` derives
the owner argument from the verified session at the route, filters
`studentId == owner` and `status in [OPEN, CLAIMED]` in Firestore, orders by
`updatedAt` descending and `ticketId` ascending, then applies `limit(5)` before
the read. The route rechecks the stored active Student account and emits
`Cache-Control: no-store`; caught storage errors return the safe 503 message.
The explicit summary projection omits owner and detailed ticket fields.

The Standard composite index in `src/codeclinic/firestore.indexes.json` matches
the equality/status fields and ordered fields. The local Standard Firestore
emulator executed that exact query with the configured index file against six
matching active tickets (including tied timestamps), a second Student's
active ticket, and a resolved ticket. It returned `a,b,c,d,e`: the expected
five, with timestamp descending and ID ascending within ties. This is local
synthetic evidence; no production database was accessed. Focused API/storage
tests also passed for Student access, visitor/TA/inactive denial, safe errors,
summary projection, and limit/query construction.

Coverage limitation: UI/card behavior and full production-data migration or
index deployment belong to later gates. No unresolved T01 implementation
defect found.

## T02 — Owned ticket detail and thread read

**Verdict: changes required.** Session/current-account and Student checks run
before the owner-scoped store read. `getOwned` checks ownership before reading
replies, returns an allowlisted ticket projection, and orders replies by
`createdAt` then `replyId`; the route omits `authorUserId` from the response
and uses current trusted account names where available. Focused read tests
passed for ownership hiding, denied actors, projection, reply ordering,
literal text payloads, and safe storage failure.

### Findings

1. **Medium — malformed ticket path IDs become storage failures.** At
   `src/codeclinic/server/tickets/route.js:60`, `req.params.ticketId` reaches
   the Firestore document lookup without validation. A local authenticated
   request to `/api/tickets/%2F` reproduced a Firestore invalid-document-path
   exception that the generic catch at line 80 converts to 503. R5 requires
   400 for malformed requests. Validate the decoded path ID before store access
   and add a focused route case; keep genuine storage errors at 503.

2. **Low — unavailable owner author is mislabeled TA.** The role fallback at
   `src/codeclinic/server/tickets/route.js:65-68` compares the reply author to
   `result.ticket.studentId`, but `getOwned` intentionally omits
   `studentId` from its projection (`src/codeclinic/server/tickets/store.js:13-30`).
   A local route reproduction made the current Student lookup succeed during
   authentication/ownership checks and return unavailable on the subsequent
   author lookup; the Student's reply then returned `{name:"TA",role:"TA"}`.
   R2 and the spec's unavailable-author rule require a generic correct role
   label. Determine whether the reply belongs to the authenticated owner using
   the verified session ID, or pass equivalent internal owner context without
   exposing it in the response. Add a test for the unavailable-owner lookup.

3. **Medium — reply response size has no bound.** The complete-thread query in
   `src/codeclinic/server/tickets/store.js:32-35` has no count/page limit, and
   the route resolves every author's account concurrently. R2 requires the
   complete thread while R5 requires bounded response shapes; the current
   artifacts do not define a maximum thread size or pagination contract. This
   leaves an unbounded read/response and concurrent account lookups. Reconcile
   the two requirements in the spec before choosing a cap or pagination policy.

### Criteria not verified

The account-name fallback for a missing author is only indirectly covered by
existing tests; the targeted reproduction above confirms the wrong role when
the missing author is the owner. No full end-to-end app/emulator detail read was
run. The complete-thread/unbounded-response requirement needs a specification
decision. UI detail rendering is assigned to later work.

## Combined verdict

**Changes required.** T01 passes. T02 has two API correctness defects and one
unresolved R2/R5 bounded-response conflict. The two assigned items work
together at the API/store boundary, but Batch 1 should not advance until the
T02 findings are resolved and independently reviewed.

The implementation log records two preimplementation failures outside Batch 1:
T04 dashboard UI tests failed before that UI item, and T03 reply/close contract
tests returned 404 before those routes exist. They remain later-item evidence,
not T01/T02 regressions. See `logs/tasks/student-ticket-activity/review-batch-1.md`
for exact commands, outcomes, and local emulator evidence.
