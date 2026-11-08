# Test coverage report

Task: `ui-consistency-and-feedback`

Specification/checklist/handoff: v0.1 (human-approved)

Role: test writer

## Coverage added

- **R1 / U01:** `AppHeader.test.tsx` describes role-specific destinations, Coordinator-only TAs link, active Notifications state, decorative SVG, capped unread count, semantic logout button, and restricted mode without an unread request. It expects the existing destinations (`/student/account`, `/ta/account`, `/ta/students`, `/ta/tas`). Responsive measurements, focus, hover, minimum target dimensions, and invoking logout remain U06/browser or integration checks.
- **R2 / U03:** `NotificationsRoute.test.tsx` covers verified Student/TA navigation, session-before-inbox requests, fail-closed unknown role, recoverable TA manager lookup failure with ordinary links retained and TAs hidden, header persistence after inbox failure, and no account/unread/inbox requests for unauthenticated or forced-password sessions. Mark-read persistence, logout and confirmed redirect behavior remain for implementation/integration coverage or U06 review.
- **R3 / U04:** `account-routes.test.js` now checks missing current-password code/field and no-write behavior, plus distinction between a completed mismatch comparison and attempt exhaustion while preserving status 401 and no-write assertions. Existing guards and R7 suites retain the missing/invalid session, CSRF, role, forced-password, and server wiring security assertions. The rest of the full validation code/field matrix, safe message text, byte limits, unavailable email, and malformed/unknown fields are not exhaustively asserted by this test-writer change.
- **R4 / U05:** `AccountPages.test.tsx` expects forced-password mismatch wording and checks field association; it also exercises profile mismatch copy, form scoping, field association, preserved nonsecret input, no page-load Retry, stale-error clearing after correction, and session-expired fallback with no raw response body or password-mismatch inference. Focus placement, other field codes, retry isolation, network/service/CSRF/malformed cases and support-action errors remain untested here.

## Interface assumption

The new header tests use a proposed minimal public prop shape: `accountType: 'STUDENT' | 'TA'`, optional `isManager`, `activePath`, optional `restricted`, and `onLogout`. The component should use the existing `NotificationBell` to own unread-count fetching and refresh; the tests deliberately do not add a second unread-count prop. This shape is a test seam, not an approved architectural requirement. Verified role/manager inputs are presentation data only.

## Verification

Exact commands and results are in [test-writer.log](../../../logs/tasks/ui-consistency-and-feedback/test-writer.log). React UI tests expose expected preimplementation missing-header/form behavior. The initial Supertest route/guard run hit a sandbox `listen EPERM` limitation; the orchestrator's [separate server log](../../../logs/tasks/ui-consistency-and-feedback/orchestrator-server-preparation.md) records the reruns: 2 expected failures/60 passes before splitting mismatch and exhaustion, then 3 expected failures/60 passes after splitting them. No build, browser dimensions, keyboard pass, or external service check is claimed.

## Runtime usage

Model: runtime model unavailable. Input tokens: unavailable. Output tokens: unavailable. Total tokens: unavailable. Source: runtime did not expose token metrics to this agent.
