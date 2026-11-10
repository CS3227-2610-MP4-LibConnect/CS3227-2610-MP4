# Proposed amendment: bounded ticket thread pages

Date: 2026-11-10 (Asia/Singapore)
Status: human approved on 2026-11-10; incorporated into canonical specification v0.3
Current contract: `workflow/specs/student-ticket-activity.md` v0.2
Review evidence: [`review-report.md`](review-report.md)

## Reason

R2 requires `GET /api/tickets/:ticketId` to return the complete reply thread.
R5 requires bounded API responses. A ticket can currently have any number of
replies, so returning every reply in one response cannot meet both requirements.
The review also found that malformed ticket IDs map to 503 rather than 400 and
that an unavailable owner author is labeled TA. On 2026-11-10, the human
specified the exact placeholder `[deleted account]` when the owner author
account cannot be found. Both defects need tests and implementation correction.

## Proposed specification v0.3 text

In the author-label assumption and R2, replace the generic role-label fallback
for an unavailable owner author with this human-specified rule:

> If a reply's author ID is the authenticated Student owner and the author
> account cannot be found, display `[deleted account]` as the author's name.
> Retain the trusted `STUDENT` role for chat presentation. Do not expose the
> author ID or infer a TA role from an absent account. A missing non-owner
> author may keep the existing safe TA fallback.

Add a test for a missing owner author record that checks the exact placeholder
and `STUDENT` role. This requirement came directly from the human; the
pagination contract below was approved later on 2026-11-10.

Keep R2's requirement that a Student can access every reply in stable
`createdAt`/reply-ID order. Replace the single-response requirement with:

> `GET /api/tickets/:ticketId` returns the owned ticket and the first page of
> up to 50 replies in ascending `createdAt`, then reply-ID order. A `nextCursor`
> is present only when more replies exist. Passing that cursor as a query
> parameter to the same endpoint returns the next page, again with the owned
> ticket. The cursor is opaque to the client, bounded, and validated. The server
> checks the current Student session and ticket ownership on every page.
> Invalid cursor input returns a safe 400. The Student page provides a
> keyboard-accessible `Load more replies` control until all replies are
> available, without discarding earlier pages or falsely claiming the thread
> is complete. A page failure retains loaded replies and offers retry.

Clarify R5's bounded-response rule:

> Every ticket-detail response contains one safe ticket projection and at most
> 50 safe reply projections. The server bounds cursor length and shape, limits
> each Firestore reply query before reading, and bounds concurrent author
> lookups. It never fetches the entire reply collection to create a page.

Update acceptance scenario 4 to say every reply is reachable through
successive pages and remains in stable order. Add verification cases for
multiple pages, equal-timestamp boundaries, invalid/tampered cursors, owner
checks on later pages, terminal tickets, loading/retry behavior, and complete
thread access through the UI. Keep the current C2 reply data model and the
user's requested chat presentation.

## Dependent artifacts after specification approval

- Append a dated amendment record to the canonical spec, then issue v0.3 with
  the approved text above. Preserve the existing v0.2 decision history.
- Amend T02 in `tasks.md` to require bounded cursor pages, owner recheck on
  every page, malformed ID/cursor 400, and the exact `[deleted account]`
  missing-owner-author fallback. Amend T05 to require `Load more replies` and
  retry/ordering UI.
  Preserve the original task text in a dated amendment record and issue a new
  checklist version for separate human approval.
- Update `handoff.md` and `batch-plan.md` to the new versions, with separate
  human approvals required by the repository workflow. Reconcile the existing
  T02 implementation and tests against the approved change, then independently
  review T02 again. T01 remains passed; later batches remain paused.

No live Firestore index deployment, external access, commit, or merge is part
of this amendment.
