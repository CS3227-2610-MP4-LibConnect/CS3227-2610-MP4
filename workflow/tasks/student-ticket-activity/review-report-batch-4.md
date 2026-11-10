# Independent review: Batch 4 (T03 remediation)

Reviewed against specification v0.3, checklist v0.2, handoff v0.2, Batch 4
approval and assignment, Batch 3 review findings, and the Batch 4 implementation
report/log. The task's shared-workspace exception applies: prior batch changes
and the user's dashboard edit remain uncommitted, so the Batch 4-only edit was
identified against the Batch 3 finding and the assigned file scopes. Review
commands and results are recorded in
[`review-batch-4.md`](../../../logs/tasks/student-ticket-activity/review-batch-4.md).

## T03 — Reply and close writes

**Verdict: pass.** The ticket router's error middleware now sets
`Cache-Control: no-store` before returning parser-generated 413 responses for
oversized bodies and parser-generated 400 responses for malformed JSON. The
existing safe response bodies and status codes remain unchanged. This handler
is registered on the `/api/tickets` router, after the route handlers; route
level JSON parser errors are forwarded to it by Express.

The focused API test submits malformed and oversized JSON independently to
both the reply and close endpoints. For all four cases it asserts the expected
400/413 status and `no-store` header. It also verifies that no reply is written
and the ticket remains open. The focused API, contract, and storage suites pass.
Existing T03 authorization, validation, transactional write, state conflict,
timestamp, and storage failure coverage also passes in those suites.

## Combined T03/T04 behavior

**Verdict: pass with follow-up.** The combined focused API/store/contract
checks pass, and the focused dashboard/placeholder tests pass. No regression
was found in the T04 cards, loading/empty/error states, navigation, or Student
route protection. T04 remains subject to the previously recorded T06 follow-up:
production build, direct server-shell HTTP check, visual inspection at a
320-pixel viewport, and broader integration/emulator verification.

## Findings and limits

- No blocking T03 findings remain in the reviewed scope.
- No live service or emulator was contacted. Transaction behavior was verified
  by the focused local test suites; real Firestore integration remains for T06.
- Review took place in the approved shared workspace rather than a separate
  worktree. The reviewer is distinct from the implementer, and the check was
  constrained to the assigned files and Batch 3 finding; earlier changes were
  not attributed to Batch 4.
- No production source, test, checklist, assignment manifest, or approval
  record was changed by this review.

## Overall conclusion

**T03 passes; combined T03/T04 passes with the T04 verification follow-up
above.** This report does not advance checklist status or authorize another
batch, commit, merge, push, deployment, or publication.
