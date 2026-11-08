# Implementation report: notifications N-G1 (T01, T02)

Status: complete, awaiting independent review. No approval is recorded or implied.

- Task: `notifications`, group N-G1 (T01 shared notify module, T02 inbox API)
- Specification: `workflow/specs/notifications.md` v0.1 (human-approved 2026-11-08), R1 and R2
- Checklist / handoff: `tasks.md` v0.1, `handoff.md` v0.1 (human-approved 2026-11-08)
- Skills: `openspec-apply-change` preflight (via the `workflow/specs/` adapter)
- Worktree / branch / base: `wt/n-g1`, `notifications-g1`; started on `522afc4`, then moved by the orchestrator onto `codeclinic-scope` `0f07599` (includes codeclinic-rename T05 cookie rename). `server/index.js` auto-merge verified: only the N-G1 imports, `configureNotify(db)`, and mount differ from the base. No commits made.
- Execution log: [`logs/tasks/notifications/implement-N-G1.md`](../../../logs/tasks/notifications/implement-N-G1.md)

## Changed files (all under `src/codeclinic/`)

| File | Change |
| --- | --- |
| `server/notifications/notify.js` | New. R1 module. |
| `server/notifications/route.js` | New. R2 router and Firestore notification store adapter. |
| `server/index.js` | Imports, `configureNotify(db)`, and one `app.use('/api/notifications', …)` mount. |
| `server/auth/login.js` | Export-only refactor (orchestrator-approved deviation, follow-up 1): `readCookie` and `authenticateRequest` were moved out of `createLoginApp` unchanged into `createSessionAuthenticator(repository, authStore, now)`, and logout's CSRF hashing into `hashSubmittedCsrf(req)`. `createLoginApp` now calls both. New exports: `SESSION_COOKIE`, `createSessionAuthenticator`, `hashSubmittedCsrf`. No behaviour change. |
| `test/notifications.notify.test.js` | New. Module tests with a fake Firestore. |
| `test/notifications.api.test.js` | New. API tests with in-memory session and notification stores. |

## Interfaces

- `notify({ recipientUserId, notificationType, ticketId, message })` resolves to `{ ok: true, notificationId }` or `{ ok: false, reason: 'INVALID_INPUT' | 'WRITE_FAILED' | 'NOT_CONFIGURED' }`. It never rejects. Also exported: `createNotify(db, { now, newId, logger })`, `configureNotify(db, options)`, `validateNotifyInput`, `NOTIFICATION_TYPES`, `MAX_MESSAGE_LENGTH`, `NOTIFICATIONS_COLLECTION`.
- Write: `notifications/{notificationId}` = `{ notificationId, recipientUserId, notificationType, ticketId, message, createdAt: Date, read: false }`, using `set` on a fixed ID so the single retry cannot duplicate.
- `createNotificationsRouter({ repository, authStore, store, now })`, `createFirestoreNotificationStore(db)`, `PAGE_SIZE` (20), `UNREAD_CAP` (99).
- Endpoints: `GET /api/notifications?cursor=` returns `200 { notifications: [{ notificationId, notificationType, ticketId, message, createdAt (ISO), read }], nextCursor }`; `GET /api/notifications/unread-count` returns `200 { unreadCount }`; `POST /api/notifications/:id/read` and `POST /api/notifications/read-all` return `204`. Errors: `401` no or invalid session (or status or role changed), `403` bad or missing `X-CSRF-Token` on POST, `404` for a missing, malformed, or other-user ID (same body), `400` for an invalid cursor, `503` on storage or session-store failure.

## Acceptance criteria

| Scenario | Status | Evidence |
| --- | --- | --- |
| 1 valid notify writes one unread; invalid type / missing `ticketId` rejected without write | Met | `notifications.notify.test.js` |
| 2 own notifications only, newest first, across pages | Met | `notifications.api.test.js` (45 items, 3 pages) |
| 3 other user's ID: `404`, unchanged | Met | `notifications.api.test.js` |
| 4 mark all read → unread count 0 (API side) | Met | `notifications.api.test.js` |
| 6 failed write does not fail caller | Met | `notifications.notify.test.js` |
| 7 POST without valid CSRF rejected | Met | `notifications.api.test.js` |

Results on `0f07599` after the follow-up fix: full suite 23 suites passed, 1 skipped (the existing emulator-gated suite), 438 tests passed, 1 skipped; new files 52 tests passed; `npm run build` compiled successfully; `grep -rn libconnect server test src` found nothing. (Initial run on `522afc4`: 16 suites, 273 tests passed, 1 skipped.)

## Deviations

- `server/auth/login.js` was edited (approved by the orchestrator in follow-up 1). An earlier draft copied the session check and the cookie name into `route.js`. After the rebase that copy used the stale name `__Host-libconnect_session` and would have rejected every session. The copy is removed: `route.js` now calls `createSessionAuthenticator` and `hashSubmittedCsrf` from `login.js`, and the API test imports `SESSION_COOKIE` from `login.js`.
- Login has no CSRF check that leaves the session in place, because logout uses `deleteSessionIfCsrfMatches`, which deletes the session. So `route.js` keeps a small comparison: `hashSubmittedCsrf(req)` against the session's stored `csrfTokenHash` with `crypto.timingSafeEqual`, the same check `firestore-store.js` performs.
- `server/index.js` also calls `configureNotify(db)` so the shared `notify` export is bound to the server's Firestore. This goes slightly beyond "mounting routes only".

## Assumptions

- Invalid `notify` input resolves to `{ ok: false, reason: 'INVALID_INPUT' }` rather than throwing, so a caller bug cannot fail a ticket action (R1).
- An empty message (after trimming) is accepted; the spec requires only a non-empty `ticketId`. `recipientUserId` and `ticketId` must be non-blank strings of at most 128 characters. The 300-character cap counts Unicode code points.
- The cursor is the last notification ID on the page. A malformed ID, an unknown ID, or another user's ID returns `400`. A route `:id` must match `[A-Za-z0-9_-]{1,128}`; otherwise the route returns `404`.
- Marking an already-read notification read returns `204` without a write.
- An authentication failure, a role change, or an inactive account returns `401` (as in `/api/auth/session`). A session store failure returns `503`.

## Risks

- The Firestore list query (`recipientUserId ==` + `orderBy createdAt desc`) needs a composite index. No index config was added, because that is deployment configuration. The adapter `createFirestoreNotificationStore` has no unit or emulator test; route tests use an in-memory store.
- `markAllRead` updates in batches of 400 without a transaction. A notification created during the call may stay unread, which is acceptable for an inbox.
- The CSRF hash comparison in `route.js` duplicates the one inside `deleteSessionIfCsrfMatches`; a shared non-destructive store method would remove this.
- The `login.js` refactor relocates code; the existing login session tests pass unchanged, but reviewers should confirm the move is behaviour-neutral.
- Malformed JSON bodies on POST are handled by the login app's error handler, which returns `400` with the login validation message.

## Amendments

- 2026-11-08: Orchestrator follow-up 1 after the rebase onto `0f07599`: replaced the copied session and CSRF logic with exports from `login.js`, removed the hard-coded cookie name, and re-ran tests and build.
