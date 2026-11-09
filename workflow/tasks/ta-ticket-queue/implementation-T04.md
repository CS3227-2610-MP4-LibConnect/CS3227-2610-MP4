# Implementation report: T04 Reply API

Spec: `workflow/specs/ta-ticket-queue.md` v0.1 (R5, R7 TICKET_REPLY, C2). Checklist v0.1, handoff v0.1. Branch `ta-ticket-queue-t04`, base `47fd82e`.

## Changed files
- `src/codeclinic/server/tickets/ta-replies.js` (new): `createTaRepliesRoutes(shared)` with `POST /:ticketId/replies`. Uses the shared CSRF guard; body must be exactly `{ message }` (string, trimmed 1-4000) else 400; invalid ticket ID format 404. `addReply` sets replyId, authorUserId (session), createdAt; `NOT_FOUND` gives 404, `CONFLICT` (RESOLVED/CLOSED) gives 409. After commit, awaits `notify` (TICKET_REPLY to the student) in try/catch. Returns 201 with the reply view (`authorRole` TA, `isMine` true, no user IDs).
- `src/codeclinic/server/tickets/ta-routes.js`: one require and one mount line below `void shared;`.

## Verification
- `ta-tickets.api`: 83 pass, 78 fail. No reply-specific test fails. Remaining failures: T03 claim/unclaim/resolve cases and their body-key/CSRF cases, the DETAIL_KEYS test defect, composite tests (coordinator unclaim, storage failure on every endpoint, "after resolving ... reply all 409", hostile title).
- Full suite: 865 pass, 78 fail, 4 skipped (3 failing suites: ta-tickets.api, TAQueuePage, TATicketPage).

## Deviations and risks
- None from spec. Author name comes from the session actor if present, else `accountStore.getAccount`, else "Unknown user".
- The Firestore store's `addReply` is not exercised here (no emulator tests).

## L4 tidy-up
`ta-replies.js` now reuses `toIsoString` (ta-views.js), `isPlainObject` (exported from ta-claims.js), and `TICKET_ID_PATTERN` (added to constants.js exports) instead of local copies. Check order was kept (ID 404 before body 400) because ta-claims.js checks the body first and swapping would change the status for requests with both a bad ID and bad body. Full suite: 1025 pass, 4 skipped, 0 fail.
