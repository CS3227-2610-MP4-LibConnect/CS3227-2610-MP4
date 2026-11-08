# Security review: codeclinic-rename Group 3 (T04)

Reviewer: independent `reviewer` agent. Date: 2026-11-08. Branch `codeclinic-rename-t04`, base `da3c249`.
Main report: [`review-G3.md`](review-G3.md). Log: [`logs/tasks/codeclinic-rename/review-G3.md`](../../../logs/tasks/codeclinic-rename/review-G3.md).

This is an assessment, not approval.

## Summary

No security finding. T04 removes an authenticated, read-only endpoint and its client; it adds no route, input, or data access. Attack surface shrinks.

## Checks

| Area | Result |
| --- | --- |
| Removed endpoint | `GET /api/member/catalog` is no longer registered. `server.test.js:79-81` shows 404 with no SPA shell, so no fallback serves HTML or leaks data on that path. The deleted handler was the only reader of the `books` collection; no other code reads it. |
| Authentication, session, CSRF | `server/auth/login.js` diff is limited to the removed import and the conditional `options.catalogDb` mount. `authenticateRequest`, `/api/auth/session`, `/api/auth/csrf`, logout, and login handlers are byte-identical. `login.session.test.js` and `login.credentials.test.js` pass unchanged. |
| Authorization and role checks | `DashboardRouteGuard.tsx` and `DashboardLogout.tsx` unchanged. Cross-role denial and forged client-role tests in `DashboardRoutes.integration.test.tsx` unchanged (58 → 58 `expect(`) and passing. |
| Client-supplied data | `StudentDashboard.tsx` renders `name` from the verified session as React text (escaped); no `dangerouslySetInnerHTML`. No new fetch. |
| Secrets and personal data | No credentials, session IDs, or personal data in the diff, tests, or evidence. Tests use synthetic values. |
| Seed script | Deleted script wrote only to the local emulator; removal cannot affect production data. |
| Test weakening | No security, validation, status-code, or fail-closed assertion of a surviving feature removed. The catalog endpoint's denial tests were deleted with the endpoint they covered. One non-security navbar test lost (review F1, Medium). |
| Dependencies, CI, deployment | None changed. |
| Accessibility-related R7 control | Keyboard focus outline for the student navbar preserved in `DashboardViews.css:55-59` and now asserted. |

## Residual risks

- Docs and `README.md` still describe the catalog and seed script (T05/T07). No runtime effect.
