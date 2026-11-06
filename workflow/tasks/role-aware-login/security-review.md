# Security review: role-aware login T05

- **Scope:** T05 React-to-Express integration test and the current login UI/server behavior it exercises.
- **Specification:** `workflow/specs/role-aware-login.md` version 0.2.
- **Task:** `workflow/tasks/role-aware-login/tasks.md` version 0.2, T05. This is a scoped T05 review, not a replacement for separately approved rules/IAM or deployment reviews.

## Trust boundaries and authorization

The browser submits email, password, and the selected account type. The inspected Express route validates the request shape, looks up the canonical email mapping and user through the server repository, verifies the exact password, then checks server-stored active status and account type before it creates a session. The T04 endpoint suite supplies forged role, manager, status, user ID, and hash fields and confirms these do not authorize a login. T05 exercises a selected-type mismatch through the real UI and route. No client-side Firestore account lookup was found in the inspected LoginPage source.

## Sensitive data and outcomes

The accepted response contains only the account type. The cookie is `__Host-` scoped with `Secure`, `HttpOnly`, `SameSite=Lax`, `Path=/`, and no `Domain`; T05 checks these properties and checks that the synthetic session record contains only the expected minimal fields. Denials use generic 401 text, rate limits use a generic 429 response, and the synthetic repository failure returns a static retry response. T05's outage case confirms the UI does not claim success, creates no session, and emits no console output. Source inspection found no authentication log statements in the login route. No real secrets or private user data were used or recorded; existing debug log files were not opened.

## Session, CSRF, and abuse controls

T05 follows the server-issued Secure cookie through protected session, CSRF, and logout endpoints; verifies logout without CSRF is rejected; and verifies successful logout clears server state and denies reuse. Existing T04 tests and its re-review addendum provide synthetic endpoint/adapter evidence for idle and absolute expiry, status/role rechecks, and the corrected expiry/CSRF transaction paths. Both rate thresholds are exercised with an isolated store; the T05 source-limit case varies forwarded headers and confirms the direct socket identity still controls the counter.

These tests do not establish Firestore's actual durability, cross-process sharing, or SDK transaction conflict/retry behavior. Browser Firestore rules, deployed IAM, trusted-proxy policy, HTTPS deployment behavior, and routing are not validated here. Registration/email-change canonical collision prevention and existing account migration remain out-of-scope integration work. Do not infer these properties from the synthetic tests.

## Assessment

No T05-specific security defect was identified. The review verdict is **pass with follow-up** for the scoped implementation evidence. Keep the external integration limits recorded in `review-T05.md`; this assessment neither approves those separate gates nor grants merge approval.
