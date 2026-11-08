# Security review: notifications N-G1 (T01, T02)

Reviewer: independent `reviewer` agent (Cursor), as part of the single Wave 1 review. Specification v0.1. Main report: [`review-N-G1.md`](review-N-G1.md).

## Result

I found no Critical or High security issues. M1 in the main report is about availability and deployment, not security.

## Checks

- **Identity.** The recipient is always `auth.session.userId` from the server session. Client-supplied owner fields are ignored (tested). Notification IDs and cursors are untrusted, so the server loads them and compares the stored `recipientUserId` before acting.
- **Enumeration.** A foreign ID, a missing ID, and a malformed ID all return the same `404` body. CSRF is checked before ownership, so a request without a token learns nothing. A foreign cursor returns the same `400` as an invalid one.
- **CSRF.** Both `POST` endpoints check the hex SHA-256 of `X-CSRF-Token` against the session's `csrfTokenHash` using `crypto.timingSafeEqual`, after a format check.
- **Session.** The inbox reuses the login authenticator through the shared `login.js` export, so the active-status and type recheck and the idle and absolute touch are identical to the auth routes. Responses set `Cache-Control: no-store`.
- **Output.** Items expose only `notificationId`, `notificationType`, `ticketId`, `message`, `createdAt`, and `read`, not `recipientUserId`. The message is stored as plain data. Plain-text rendering is N-G2's job (R3).
- **Logging.** `notify` logs only fixed strings and never the message, user ID, ticket ID, or error object. A throwing logger is contained.
- **Bounds.** Message length is capped at 300 code points. IDs are capped at 128 characters. Pages hold 20 items. The unread count reads at most 100 records. `markAllRead` updates in batches of 400.

## Residual risks

- The account-management R7 forced-password-change limiter must cover this router (AM T04).
- `notify` trusts its caller to pass the correct `recipientUserId`. Each future feature that calls it must derive the recipient from server-side ticket data.
- The Firestore adapter has not been run against the emulator.
