# Student ticket activity specification

Version: 0.3 (2026-11-10; human approved 50-reply blocks and deleted-account placeholder in conversation)
Task ID: `student-ticket-activity`
Approval evidence: human approved v0.2 on 2026-11-09; on 2026-11-10 the human specified `[deleted account]` for an unavailable owner author and approved loading replies in blocks of 50. This does not approve the amended checklist, handoff, implementation dispatch, deployment, or merge.

## Purpose and scope

An authenticated Student can see the five most recently updated active tickets
on the dashboard, open any owned ticket to read its details and complete reply
thread, reply while it is active, and close it without a resolution. `My Tickets`
is a protected placeholder page reached through `Load all`; listing all tickets
there is later work. Existing ticket creation and the user's removal of the old
Student dashboard landing-page sentence must remain intact.

This work does not add ticket editing, TA queue actions, resolution, notifications,
AI features, or a full My Tickets list. It does not change the C1 ticket or C2
state/reply data contract in `workflow/specs/student-tickets.md` v0.4.

## Sources and assumptions

- `Overview.md` defines Ticket, Reply, student ownership, and the Student ticket
  stories. `workflow/PLAN.md` places view, close, and reply in student tickets.
- The approved creation contract stores `tickets/{ticketId}` with `studentId`,
  details, status, and Firestore timestamps. Replies use
  `tickets/{ticketId}/replies/{replyId}` with `replyId`, `ticketId`,
  `authorUserId`, `message`, and `createdAt`.
- The approved C2 contract permits an owning Student to close `OPEN` or
  `CLAIMED` to `CLOSED`, clears `claimedByTaId` on close, treats `CLOSED` and
  `RESOLVED` as terminal, and requires a transactional status re-read.
- Assumption: a Student may reply only while their ticket is `OPEN` or
  `CLAIMED`. This follows the approved terminal-state reply rule.
- Assumption: `Load all` opens `/student/tickets`, which displays a labeled
  placeholder and a way back to the dashboard. It does not imply a full list.
- A reply shows the author's current display name, resolved through trusted
  account data at read time. If the owner author's account cannot be found,
  show `[deleted account]` as the name and retain the trusted `STUDENT` role.
  For another unavailable author, show a safe role label such as `TA`. Never
  use a client-supplied author label or expose the author ID.

## Actors and trust boundaries

- Only a current, active `STUDENT` account with a valid cookie-backed session
  may use these Student pages and APIs. The server derives the Student ID from
  the verified session and current account record on every request.
- A Student may read and mutate only their own tickets. A TA, visitor, inactive
  account, or other Student must receive no ticket data or write capability
  through these routes. Treat inaccessible ticket IDs like missing tickets.
- Browser paths, ticket IDs, request bodies, stored ticket/reply text, and API
  responses are untrusted. Only trusted server code reads or writes Firestore.
  Render text literally, without HTML interpretation.
- State-changing requests require the established CSRF token. No client role,
  ownership, status, timestamp, reply author, or claimed TA value can authorize
  or alter a write. Do not log ticket content, reply content, credentials,
  session IDs, or CSRF tokens.

## Requirements

### R1. Dashboard active tickets

- The verified Student dashboard MUST show an active-tickets section. `OPEN`
  and `CLAIMED` are active; `RESOLVED` and `CLOSED` are excluded.
- The section MUST request only tickets owned by the authenticated Student and
  show at most five, ordered by `updatedAt` descending. Equal timestamps MUST
  use a stable ticket-ID tie-breaker. Each ticket is a keyboard-accessible card
  linking to its detail route, with title, language, and concept tags (or a
  clear empty-tags representation).
- A `Load all` control MUST navigate to `/student/tickets`. The section MUST
  show distinct loading, empty, and safe error/retry states. A failed request
  MUST NOT appear as an empty list.
- `GET /api/tickets/active` MUST return only the five qualifying safe summary
  records and MUST never trust a requested Student ID or client-side filter for
  isolation. Server selection and ordering determine the result. The server
  MUST query by authenticated `studentId`, `status` in `OPEN`/`CLAIMED`, and
  descending `updatedAt` with a five-document limit. A stable ticket-ID
  tie-breaker MUST make equal timestamps deterministic. It MUST NOT fetch all
  owned tickets and sort them in application memory.
- The implementation MUST add the Firestore index configuration needed for
  that query to the repository and wire it into `firebase.json`. Index creation
  in a live project is a separate deployment action; local implementation and
  emulator verification do not authorize deployment. Confirm the target
  Firestore edition before authoring edition-specific index configuration.

### R2. Protected pages and ticket details

- `/student/tickets` and `/student/tickets/:ticketId` MUST use the existing
  Student session guard on direct entry and refresh, with sign-in redirect for
  visitors and denied access for TAs. The authenticated shared header remains
  available after verification.
- The My Tickets page MUST explicitly say the full list is coming later and
  provide dashboard navigation. It MUST NOT claim to list all tickets.
- The detail page MUST request `GET /api/tickets/:ticketId` and show the owned
  ticket's title, status, language, concept tags, creation/update times,
  expected and actual behaviour, attempted work, optional error output,
  attached file names and contents or repository reference/paths, and any
  applicable claim/resolution information. Repository references are displayed
  as data; the server MUST NOT fetch them.
- `GET /api/tickets/:ticketId` MUST return the owned ticket and the first block
  of at most 50 replies in ascending `createdAt` order with a stable reply-ID
  tie-breaker. When more replies exist, the response MUST include an opaque
  `nextCursor`; a request to the same endpoint with that cursor MUST return the
  next block and the owned ticket. The server MUST recheck the current Student
  session and ticket ownership for every block. The cursor MUST be bounded and
  validated; malformed cursor input returns a safe 400. No block may require
  fetching the entire reply collection or sorting it in application memory.
- The page MUST let the Student load further blocks of 50 until every reply is
  accessible, preserving previously loaded replies in stable order. A block
  failure MUST retain loaded replies and offer retry. Each reply MUST show
  author, localized date and time, and plain-text content in a chat-style
  layout. Student and TA messages MUST remain distinguishable without relying
  only on color. The page MUST handle no replies, loading,
  inaccessible/missing ticket, malformed response, and transient failure safely.

### R3. Student replies

- An owning Student MAY submit a nonempty plain-text reply of at most 5,000
  characters through `POST /api/tickets/:ticketId/replies` while the current
  ticket status is `OPEN` or `CLAIMED`. Surrounding whitespace is trimmed;
  internal whitespace is preserved. The exact request allowlist is `message`.
- The server MUST check the session, current account, ownership, CSRF token,
  request shape, and current status. It MUST create a reply with a server-chosen
  ID, authenticated `authorUserId`, and server-written Firestore `Timestamp`.
  It MUST update the parent ticket's `updatedAt` atomically with the reply.
  A transaction MUST re-read status and ownership so a concurrent close or
  resolve cannot leave a new reply on a terminal ticket.
- The page MUST prevent duplicate submission while pending, give accessible
  validation and success/error feedback, retain typed content on failure, and
  refresh or append the server-confirmed reply without showing unconfirmed
  success. Reply input MUST be unavailable on terminal tickets.

### R4. Close without resolution

- The detail page MUST show a warning-styled `Close Ticket` button for the
  owning Student. The button MUST be disabled when status is `CLOSED`; it MUST
  also be unavailable for `RESOLVED`. The page MUST identify the action as
  closing without a resolution and reflect confirmed status after success.
- `POST /api/tickets/:ticketId/close` MUST require the verified Student owner
  and CSRF token. In a Firestore transaction it MUST re-read the ticket and
  permit only `OPEN -> CLOSED` or `CLAIMED -> CLOSED`. It MUST set `status` to
  `CLOSED`, `claimedByTaId` to `null`, and `updatedAt` to a server-written
  Firestore `Timestamp`; `fixNote` and `resolvedAt` remain `null`. The endpoint
  MUST NOT create a resolution or allow a second close.
- A concurrent change, already closed ticket, or resolved ticket MUST not be
  overwritten. The client MUST disable the button during submission and only
  show success after the server confirms it. On conflict, it MUST refresh the
  current ticket state and show safe feedback.

### R5. API failures and presentation

- All API responses MUST use `Cache-Control: no-store` and bounded, typed
  response/request shapes. Use `401` for no valid session, `403` for wrong role
  or invalid CSRF, `404` for missing or non-owned ticket, `400` for malformed
  request, `409` for forbidden state transition, and a safe `503` for storage
  failure. The UI MUST not show raw stack traces or server HTML.
- Each ticket-detail response MUST contain one safe ticket projection and at
  most 50 safe reply projections. The server MUST limit each Firestore reply
  query before reading and bound concurrent author-account lookups. It MUST
  validate decoded ticket IDs before Firestore access; malformed IDs return a
  safe 400. A missing or non-owned valid ID still returns 404.
- No ticket or reply fields may be returned before server ownership checks.
  No browser Firestore SDK access is allowed. Ticket text, file content, and
  reply text MUST be rendered as text.
- Use the existing pale-blue/navy shared theme and header. Cards, detail
  content, chat thread, reply form, and warning action MUST support keyboard
  use, visible focus, accessible labels/status messages, and a 320 CSS-pixel
  viewport without horizontal overflow.

## Acceptance scenarios

1. Six or more owned active tickets appear on the dashboard as the latest five
   by `updatedAt`; `RESOLVED`, `CLOSED`, and other Students' tickets do not.
2. A card opens its detail page; `Load all` opens the protected placeholder.
3. Direct visits and refresh enforce Student session/role checks before content
   appears. A TA or visitor cannot read or write through Student APIs.
4. The owned detail page renders every ticket field; every reply is reachable
   through successive 50-reply blocks in stable order, with author, date,
   time, and literal plain-text content. A missing owner-author account uses
   `[deleted account]` with the Student role.
5. A valid reply on `OPEN` or `CLAIMED` is stored once with authenticated author
   and server timestamp, advances `updatedAt`, and appears in the thread.
6. Empty, oversized, forged-field, missing-CSRF, cross-owner, and terminal-state
   reply attempts write nothing and return safe responses.
7. Closing an owned `OPEN` or `CLAIMED` ticket changes it to `CLOSED` without a
   resolution, clears claim information, removes it from active cards, and
   disables the close control after confirmation.
8. Repeated close and close racing with TA state changes cannot overwrite a
   terminal state or create a second transition.
9. Storage/network failures show retryable safe feedback and no false success.
10. At 320 CSS pixels and with keyboard-only use, cards, thread, reply form,
    and close action remain reachable and readable.

## Verification matrix

| Layer | Evidence |
| --- | --- |
| Store | Indexed owner/status/time query with five-document limit and stable tie; bounded 50-reply cursor query and stable page boundaries; transactional reply and close, timestamp and C2 shape, concurrent-state rejection |
| API | Session/current-account and owner checks on every block, CSRF, typed input/cursor/path validation, bounded responses, deleted-account placeholder, safe codes, no data leak, storage failure |
| UI/routes | Guarded direct visits, dashboard cards and states, placeholder, detail rendering, ordered reply blocks with load-more/retry, reply/close states and feedback |
| Integration | Synthetic Firestore emulator flow with two Students and TA state changes; index configuration/query verification; full relevant tests and production build |
| Accessibility | Keyboard navigation, visible focus, labels/live feedback, 320 CSS-pixel inspection, literal text rendering |

Use synthetic local data and the Firestore emulator. External services and
production data are not required for verification.

## Open decisions and risks

- A full My Tickets list remains deferred. The human approved the recommendation
  to add an index on 2026-11-09. The index uses storage and adds maintenance
  work to ticket writes, while bounding dashboard document reads. The approved
  read-only check found the target `(default)` database uses Firestore STANDARD
  edition; local index configuration follows that edition. Deployment remains
  a separate human approval gate.
- The specification uses current account names for reply authors. Missing
  owner-author accounts show `[deleted account]` with the Student role;
  other missing author accounts use a safe role label. No name snapshot is
  added to reply documents.

## Amendment history

- 2026-11-10, v0.3: Human specified `[deleted account]` for a missing
  owner-author account and approved loading replies in blocks of 50. The
  previous v0.2 contract required the complete thread in one response while
  R5 required bounded responses. v0.3 keeps every reply accessible through
  bounded, ordered blocks and adds a safe missing-owner-author label. The
  previous v0.2 approval and Batch 1 review remain in task evidence; T02
  requires correction and renewed independent review.
