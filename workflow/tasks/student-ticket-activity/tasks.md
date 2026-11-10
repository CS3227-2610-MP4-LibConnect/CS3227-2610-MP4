# Implementation checklist: student-ticket-activity

Version: 0.2 (2026-11-10; human approved)
Specification: `workflow/specs/student-ticket-activity.md` v0.3 (human approved on 2026-11-10)
Approval evidence: human approved checklist v0.1 and handoff v0.1 on 2026-11-09, then approved the v0.3 requirement amendment and this v0.2 checklist on 2026-11-10. See `approval-checklist-v0.2.md`. Batch 1 dispatch under the prior versions is recorded in `approval-batch-1.md`.

- [x] **T01 — Indexed active-ticket read.** Add the required Firestore index
  definition and wire local index configuration; implement the authenticated,
  owner-scoped `GET /api/tickets/active` store/query/route with server-side
  `OPEN`/`CLAIMED` filtering, descending `updatedAt`, deterministic tie order,
  and five-document limit. Add focused tests for two Students, status exclusion,
  ordering/ties, limits, auth/role denial, and safe storage failure. Confirm the
  target Firestore edition before finalizing edition-specific configuration;
  obtain separate human approval before any external service access or index
  deployment. (R1, R5; scenarios 1, 3, 9.)

- [x] **T02 — Owned ticket detail and thread read.** Implement
  `GET /api/tickets/:ticketId` with session/current-account and ownership checks,
  complete safe ticket projection, ordered blocks of at most 50 replies, bounded
  validated cursors, and ownership recheck on every block. Resolve trusted author
  names and show `[deleted account]` with Student role when the owner author
  account is missing. Validate malformed ticket IDs/cursors as 400. Add store/API
  tests for cross-owner 404, TA/visitor denial, missing ticket, literal text,
  multiple blocks and stable tie boundaries, missing-author fallback, malformed
  input, bounded author lookups, and safe storage failures.
  Depends on T01's shared ticket route/auth conventions. (R2, R5; scenarios
  3–4, 9.)

- [x] **T03 — Reply and close writes.** Implement bounded
  `POST /api/tickets/:ticketId/replies` and `POST /api/tickets/:ticketId/close`
  with Student ownership, CSRF, strict allowlists, transactional status re-read,
  atomic reply/`updatedAt`, and C2 close semantics. Add focused tests for
  valid `OPEN`/`CLAIMED` writes, forged fields, other-owner attempts, blank and
  oversized replies, repeated/terminal writes, concurrency, timestamps, and
  storage failure. Depends on T02's owner-aware ticket lookup. (R3–R5;
  scenarios 5–9.)

- [x] **T04 — Dashboard cards and My Tickets placeholder.** Add the loading,
  empty, error/retry, and five-card active section, plus `Load all` navigation
  to protected `/student/tickets`. Keep the user's removal of the old dashboard
  landing-page sentence. Add route and UI tests for ordering, card details,
  navigation, session checks, and failure states. Depends on T01. (R1–R2, R5;
  scenarios 1–3, 9–10.)

- [x] **T05 — Ticket detail, chat thread, reply, and close UI.** Add protected
  `/student/tickets/:ticketId` deep link and page, complete detail rendering,
  author/date/time chat bubbles, a `Load more replies` control for ordered
  50-reply blocks with retained content and retry, reply form, warning-styled
  close control, and disabled terminal/pending states. Add UI tests for block
  boundaries/failure, deleted-account label, status changes, race/conflict
  refresh, accessible feedback, literal rendering, keyboard use, and 320-pixel
  layout. Depends on T02–T04. (R2–R5; scenarios 2–10.)

- [x] **T06 — Integration verification and guides.** Run focused and full tests,
  production build, and synthetic Firestore emulator coverage for index/query,
  ownership, multi-block reply reads with stable ties, reply writes, close races,
  and dashboard refresh. Inspect keyboard and 320-pixel layouts; update
  user/developer guides for this delivered scope.
  Record commands, results, files, and unresolved risks. Depends on T01–T05.
  (Verification matrix.)

## Approval and review boundaries

The human approved specification v0.2, checklist v0.1, and handoff v0.1
in separate conversation turns, then approved specification v0.3 and amended
checklist v0.2 in separate turns. The orchestrator proposes
ordered batches of at most two consecutive items and obtains human batch-plan
and dispatch approval. A test writer prepares relevant tests; one implementer
completes each approved batch sequentially, and a different reviewer reviews
each item and the combined change before the next batch. No passing test or
agent response advances a gate. External Firestore access, index deployment,
commit, and merge require separate human decisions.

## Amendment record

- 2026-11-10: The human approved 50-reply blocks and specified
  `[deleted account]` for an unavailable owner author. The Batch 1 review
  passed T01 and required changes to T02. The v0.1 checklist wording above
  and its original approvals remain in version history. This v0.2 checklist
  updates T02/T05/T06 against spec v0.3. The human approved this version
  separately on 2026-11-10; handoff and renewed dispatch remain pending.

### Prior v0.1 task wording affected by v0.2

> **T02 — Owned ticket detail and thread read.** Implement
> `GET /api/tickets/:ticketId` with session/current-account and ownership checks,
> complete safe ticket projection, ordered reply thread, trusted author display
> names and fallback labels. Add store/API tests for cross-owner 404, TA/visitor
> denial, missing ticket, plain-text payloads, ordering/ties, and failures.
> Depends on T01's shared ticket route/auth conventions. (R2, R5; scenarios
> 3–4, 9.)
>
> **T05 — Ticket detail, chat thread, reply, and close UI.** Add protected
> `/student/tickets/:ticketId` deep link and page, complete detail rendering,
> author/date/time chat bubbles, reply form, warning-styled close control, and
> disabled terminal/pending states. Add UI tests for status changes, race/conflict
> refresh, accessible feedback, literal rendering, keyboard use, and 320-pixel
> layout. Depends on T02–T04. (R2–R5; scenarios 2–10.)
>
> **T06 — Integration verification and guides.** Run focused and full tests,
> production build, and synthetic Firestore emulator coverage for index/query,
> ownership, replies, close races, and dashboard refresh. Inspect keyboard and
> 320-pixel layouts; update user/developer guides for this delivered scope.
> Record commands, results, files, and unresolved risks. Depends on T01–T05.
> (Verification matrix.)
