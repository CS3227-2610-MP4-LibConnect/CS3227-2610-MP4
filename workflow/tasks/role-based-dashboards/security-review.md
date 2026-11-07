# Specification-stage security review: role-based dashboards

Version: 0.1 (2026-11-07)
Task ID: `role-based-dashboards`
Specification reviewed: `workflow/specs/role-based-dashboards.md`, version 0.1
Status: analyst review; implementation review remains required

## Findings

1. **Role authority:** The login response may direct initial navigation, but each dashboard load must revalidate via the server session endpoint. The role in the session/account response, rather than the path or client selection, controls the displayed route. This mitigates client-side role forgery for dashboard presentation.
2. **Cross-role entry:** The specification denies rendering a mismatched dashboard and shows an access-denied view linking to the verified user's own dashboard. Any API that later serves dashboard data must repeat session and role authorization server-side; client route gating cannot secure APIs.
3. **Unauthenticated and stale sessions:** Direct load, refresh, and navigation perform session validation. 401, 503, malformed responses, and network failures have distinct handling, and all failure paths avoid dashboard content.
4. **Logout:** The flow obtains a CSRF token, sends it with the logout request, and treats logout as complete only after server confirmation or a confirmed 401. Cookie deletion or local state clearing alone is insufficient.
5. **Sensitive data:** The dashboard scope is limited to non-sensitive landing views. Credential, hash, session, cookie, and CSRF values must not appear in logs or evidence.

## Residual risks and review requirements

- A route-level UI gate protects presentation only. The implementation reviewer must confirm that no private data or consequential action is added without a server-side authorization boundary.
- Deep-link refresh support depends on serving the application shell for both routes. Hosting/server fallback changes require their own approval if deployment configuration is affected.
- Logout failures can leave the server session active. The UI must remain closed to dashboard content and must not display a success claim until server confirmation.
- This document reviews the specification only. Independent security review of the implementation and tests remains mandatory because this task changes authenticated user flows.

## Implementation-stage review reconciliation

Independent task reviewers examined the implemented login routing, session guard, role-denial view, CSRF logout, Express deep links, and synthetic tests against specification v0.1. The guard renders a dashboard only after `/api/auth/session` returns a recognized server role matching the requested route. Query strings, browser storage, and selected login role do not authorize a dashboard. The existing server session endpoint rechecks the account's active status and issued role; no new protected feature API was introduced. Logout uses the existing server CSRF and invalidation endpoints, and unconfirmed failures hide dashboard content.

Reviewers found two availability races in stale session responses (F-01 and F-02), not data or role disclosure. Both were corrected and their implementation and review-only regressions pass. The final independent verdicts for T01, T03, and T05 are pass with a low-severity browser-refresh verification follow-up; T02 and T04 passed. The implementation contains no new Firebase rule, dependency, protected data endpoint, or authorization-policy change. Detailed findings and exact checks are in `review-report.md`, `review-T01.md` through `review-T05.md`, and their factual logs. Human merge approval remains pending.

## Version 0.2 theme review

T06 changed shared frontend CSS, dashboard presentation markup, and theme tests. The independent reviewer inspected the shared stylesheet and related login, registration, guard, and logout code and ran the full suite in an isolated checkout. No authentication, role, session, CSRF, backend, dependency, or authorization-policy change was introduced by T06. Existing route and logout tests passed. The review's low-priority finding concerns brittle CSS source-text tests, not a security or production authorization defect. The synthetic browser preview did not exercise a live authenticated route; the prior browser-refresh follow-up remains documented in `review-report.md`. The human approved the merge decision on 2026-11-07; commit-message approval remains pending.

## Version 0.3 module-split review

T07 moved the two dashboard view definitions to separate TSX files and changed only the route guard's imports. The independent reviewer compared the prior combined source in an isolated snapshot, checked the separate modules and their shared logout/CSS imports, and ran the focused and full tests plus a production build. The route guard's session validation, role checks, denial behavior, and logout logic were unchanged. No new protected API, auth identifier rename, credential handling change, backend change, or authorization-policy change was introduced. T07 review passed, with a manual baseline comparison limit because prior dashboard source was untracked. The v0.2 merge decision is historical; v0.3 awaits its own human merge decision.
