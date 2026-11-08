# Security review: codeclinic-rename Group 2 (T03, T06)

Reviewer: independent `reviewer` agent. Date: 2026-11-08. Base `befe61e`, branch `codeclinic-rename-g2` (staged, uncommitted).
Specs: role-based-dashboards v0.5, role-aware-login v0.3 R4. Main report: [`review-G2.md`](review-G2.md).

## Result

There are no Critical, High, or Medium security findings. The renames loosen no check.

## Checks

| Area | Observation | Result |
| --- | --- | --- |
| Authorization source | The dashboard guard renders a dashboard only when `/api/auth/session` returns exactly `STUDENT` or `TA` and that value equals the route's static type (`DashboardRouteGuard.tsx:48-56`). The route type comes from `index.tsx`, not from user input. Any other value, including the former `MEMBER`/`LIBRARIAN`, goes to `retry` (fail closed). | OK |
| Server enforcement | The session endpoint's allowlist (`login.js:162,165`) and stored-record validation are unchanged by this group. The guard is presentation only, as R4 states. | OK |
| Cross-role denial | The denial view shows only the verified role's own link. It reveals no account details and changes no state. | OK |
| Former routes | `server/index.js` serves the shell only at the two new paths. There is no catch-all, so the former paths return 404 with no redirect (tested). On the client, they fall through to the login page with no session request (tested). | OK |
| CSRF / logout | `DashboardLogout.tsx` logic is unchanged. Only the prop name, class names, and brand href changed. Logout tests are unchanged and pass. | OK |
| Session revalidation | Unchanged. The transition, stale-response, and 401 tests pass with the new values. | OK |
| Email canonicalization (R4) | `email.js` holds byte-identical function bodies (trim + full lowercase; sha256 over UTF-8, lowercase hex). All three callers import the same module, so registration and login cannot diverge. `login.js` re-exports the identical function objects (tested). | OK |
| Secrets / personal data | The new tests use synthetic `example.test` addresses and passwords. There are no cookies, hashes, or real data. Nothing new is logged. | OK |
| Untrusted inputs | No new input surface. The name greeting is still rendered as text, and the markup-injection test still passes. | OK |

## Residual risks

- Low: the fail-closed path for a 200 session body with a legacy role is untested on the client (review F2). The server side already rejects legacy roles.
- Low (T04): moving the focus-visible styles is an accessibility concern, not a security one (review F3).
