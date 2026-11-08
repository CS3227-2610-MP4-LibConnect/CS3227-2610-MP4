# Security review: notifications T03/T04 continuation

Date: 2026-11-08
Specification: `workflow/specs/notifications.md` v0.1
Reviewed source: frozen snapshot `/private/tmp/codeclinic-shared-review-20261108`, base `652e8ee`; exact diff `shared-continuation.diff`
Execution evidence: [`logs/tasks/notifications/review-continuation.md`](../../../logs/tasks/notifications/review-continuation.md)

## Assessment

- Notification messages are rendered as React text. The component test supplies markup-like text and confirms it remains text without creating an image element.
- The browser uses the session-authenticated notification endpoints; read actions fetch the CSRF token and send it in `X-CSRF-Token`. The focused API suite exercises authentication, own-user filtering, CSRF, missing/foreign IDs, pagination, and failures.
- The inbox route checks the session and account type before rendering. The server remains the authority; no client-provided recipient or role is introduced by the UI.
- `ticketHref` is an optional role-supplied callback and is absent from the current route. Thus the UI does not invent or expose an unverified ticket destination.
- No credentials, session IDs, private user data, or notification bodies are written to logs by the reviewed UI changes.

No new security defect was identified in this continuation. The inherited Firestore composite-index prerequisite is an availability/deployment risk documented in the prior N-G1 review and Developer Guide. It requires deployment-owner follow-up; no external service or cloud configuration was accessed.

Account authorization correctness is covered by the separately assigned account review and prior N-G1 server review, not re-certified by this UI-focused assessment.
