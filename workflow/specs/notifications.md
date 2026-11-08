# Notifications specification

Version: 0.1 (2026-11-08)
Approval evidence: the human replied "approved" to version 0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.
Task ID: `notifications` (from approved `workflow/PLAN.md` v0.1)

## Purpose and scope

Give every user an in-app notifications inbox, and give ticket features one
shared server function for creating notifications.

In scope:

- The shared `notify` server module.
- The inbox API.
- The inbox UI with an unread count.

Out of scope:

- Email or push delivery.
- AI-generated notification text.
- Deciding which ticket events notify whom. That belongs to `student-tickets`,
  `ta-ticket-queue`, and the optional `session-requests`, which call `notify`.

## Sources

- `Overview.md` (approved 2026-11-08): the `Notification` entity and types
  `TICKET_CLAIMED`, `TICKET_REPLY`, `TICKET_RESOLVED`, and `SESSION_UPDATE`.
- `role-aware-login` v0.3: sessions, CSRF, and per-request status and role
  checks.

## Trust boundaries

- Notifications are created only by trusted server code, never by a client
  request.
- A user can read and mark read only notifications whose `recipientUserId`
  equals their own session `userId`.
- `message` text may include user-written ticket titles, which are untrusted.
  It is stored and shown as plain text, never as HTML.

## Requirements

### R1. Shared notify module

`server/notifications/notify.js` exports
`notify({ recipientUserId, notificationType, ticketId, message })`.

- It validates the type against the four allowed values and requires a
  non-empty `ticketId`.
- It trims `message` and caps it at 300 characters.
- It writes `notifications/{notificationId}` with `createdAt` and
  `read: false`.

Feature code MUST use this module instead of writing notifications directly.
A notification write failure MUST NOT undo or fail the ticket action that
caused it. It is recorded in a non-sensitive log line and retried once.

### R2. Inbox API

| Method and path | Purpose |
| --- | --- |
| `GET /api/notifications?cursor=` | Own notifications, newest first, 20 per page, with `nextCursor` |
| `GET /api/notifications/unread-count` | Own unread count, capped at 99 |
| `POST /api/notifications/:id/read` | Mark one own notification read |
| `POST /api/notifications/read-all` | Mark all own notifications read |

Every endpoint authenticates the session and rechecks status and role. The
`POST` endpoints require the CSRF token. For another user's notification ID,
the server returns `404`, exactly as for a missing ID, so the response does not
reveal whether the notification exists. Invalid cursors return `400`, and
storage failures return `503`.

### R3. Inbox UI

Both dashboards show a bell with the unread count in the navigation bar. The
bell opens an inbox page that:

- lists notifications as plain text, with the type, relative time, and a link
  to the related ticket when the viewer can open it;
- has **Mark all as read** and marks each item read when opened;
- shows empty, loading, and error-with-retry states;
- follows the shared theme and works at a width of 320 CSS pixels.

The unread count refreshes on page load and after inbox actions. Polling is not
required.

## Acceptance scenarios

1. `notify` with a valid input creates one unread notification. An invalid
   type or a missing `ticketId` is rejected without a write.
2. A user sees only their own notifications, newest first, across pages.
3. Marking another user's notification read returns `404` and changes nothing.
4. **Mark all as read** sets the unread count to 0.
5. A ticket title containing HTML or script text is shown literally.
6. A failed notification write does not fail the calling ticket action.
7. `POST` requests without a valid CSRF token are rejected.

## Verification matrix

| Layer | Evidence |
| --- | --- |
| Module | Validation, the 300-character cap, write shape, and failure handling |
| API | Ownership, pagination, unread count, CSRF, and status codes |
| UI | Bell count, list, empty, loading, and error states, plain-text rendering, 320-pixel layout |

## Amendments

- 2026-11-08: Drafted at the human's direction.
- 2026-11-08: The human approved version 0.1.
