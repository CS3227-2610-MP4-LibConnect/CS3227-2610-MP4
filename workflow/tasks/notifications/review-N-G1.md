# Review report: notifications N-G1 (T01, T02)

Reviewer: independent `reviewer` agent (Cursor). This group was reviewed in a single Wave 1 review that also covered AM-G1 and ai-gateway G2, as the human approved.
Date: 2026-11-08
Specification: `workflow/specs/notifications.md` v0.1, human-approved. Checklist and handoff: v0.1, human-approved.
Diff: worktree `n-g1`, base `4498e56`, uncommitted. Modified files: `server/index.js` and `server/auth/login.js`. New files: `server/notifications/{notify,route}.js` and `test/notifications.{notify,api}.test.js`.
Security review: [`security-review-N-G1.md`](security-review-N-G1.md). Execution log: [`logs/tasks/notifications/review-N-G1.md`](../../../logs/tasks/notifications/review-N-G1.md)

## Conclusion

**Pass with follow-up.** I found no Critical or High issues. The Medium finding M1 is a deployment prerequisite, not a code defect. It needs a human decision, because adding index configuration is an ask-first change, and it must be resolved before the inbox is used against real Firestore.

## Findings

| ID | Severity | Location | Finding | Recommended action |
| --- | --- | --- | --- | --- |
| M1 | Medium | `server/notifications/route.js:50-54` | The list query filters `recipientUserId ==` and orders by `createdAt desc`, which requires a composite index. The repository has no index configuration. Without the index, Firestore returns `FAILED_PRECONDITION`, so `GET /api/notifications` always returns `503`. The Firestore adapter `createFirestoreNotificationStore` has no unit or emulator test, because route tests use an in-memory store. The implementer recorded this as a risk. | Ask the human to approve an index definition, or to add it during deployment. Add an emulator test for the adapter in N-G3 or another opt-in suite. |
| L1 | Low | `server/notifications/route.js:114` | A `401` from the inbox API does not clear the session cookie, whereas the login and account guards do. This is harmless, but inconsistent. | Optional: clear the cookie on `401`. |
| L2 | Low | `server/notifications/notify.js:23-30` | `notify` relies on being `async` to turn exceptions into rejections. If the caller passes an object whose property getters throw, `validateNotifyInput` throws, and `notify` rejects instead of resolving. All callers are internal feature code. | Optional: wrap validation in `try`/`catch` and return `INVALID_INPUT`. |
| I1 | Info | `server/index.js` | `configureNotify(db)` rebinds a module-level singleton each time `createServerApp` runs. The implementer recorded this as a deviation from "mount only". It is acceptable. | None. |
| I2 | Info | Cross-task | The inbox authenticates through `createSessionAuthenticator` directly, so the account-management R7 forced-password-change limiter (AM T04) must also be applied to `/api/notifications`. | Track in AM T04. |

## Acceptance-criteria traceability

| Criterion | Implementation | Tests | Result |
| --- | --- | --- | --- |
| R1: type allow-list, non-empty `ticketId`, trimming, 300-character cap by code point, write shape `createdAt` and `read:false` | `notify.js:14-58` | `notifications.notify.test.js` (shape, types, rejects, cap, HTML-like text) | Met |
| R1: one retry with an idempotent fixed ID; never throws; one non-sensitive log line | `notify.js:63-82` | Retry, double-failure, throwing-logger, and ticket-action tests | Met. The log lines are static strings with no user, ticket, or message data. See L2 for the edge case. |
| R2: own-only access, with `404` for another user's ID that matches the missing-ID response exactly | `route.js:157-165` | The "another user's notification returns the same 404" test | Met. An invalid ID format also returns the same `404`. |
| R2: newest first, 20 per page, `nextCursor`; an invalid or foreign cursor returns `400` | `route.js:127-145` | Pagination, exact-page, cursor, and repeated-cursor tests | Met. The cursor anchor's owner is checked server-side, and results are filtered to the owner again. |
| R2: unread count capped at 99 | `route.js:147-150` reads at most 100 records and clamps | Count and cap tests | Met |
| R2: CSRF on both `POST` endpoints | `route.js:101-106` and `115-117`; the check runs before the ownership lookup, so it reveals nothing | Missing- and invalid-token tests | Met |
| R2: storage failure returns `503`; `401` without a valid session; status and role rechecked | `guarded` (`route.js:109-122`) with the shared authenticator | Per-route `503` and `401` tests, inactive account, role change | Met |
| Mounted in `server/index.js` | `app.use('/api/notifications', …)` | `createServerApp` mount test | Met |

## Shared `server/auth/login.js` edit

The edit is byte-identical to the copy in `am-g1` (checked with `diff`). It is an extraction with no behaviour change: `readCookie`, `createSessionAuthenticator`, and `hashSubmittedCsrf` are taken unchanged from `createLoginApp`, which now calls them. The existing login tests are unedited and pass.

## Verification

- `CI=true npm test -- --watch=false`: exit 0. 23 suites passed and 1 was skipped. 438 tests passed and 1 was skipped, out of 439.
- `npm run build`: exit 0.
- `grep -rn libconnect server test src`: no matches.
- No tracked test file changed (`git diff HEAD --quiet -- src/codeclinic/test`).

No review-only tests were added. The Firestore adapter, including the index and the `select().limit()` count, is unverified against the emulator (M1).
