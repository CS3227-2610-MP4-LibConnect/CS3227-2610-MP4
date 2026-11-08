# Role-based dashboard specification

Version: 0.5 (2026-11-08)
Approval evidence: the human replied "ok" to the explicit request to approve version 0.5, including the `/student/dashboard` and `/ta/dashboard` routes without redirects, on 2026-11-08; recorded at the human's request. Earlier, the human explicitly approved version 0.3 on 2026-11-07; version 0.2 was also human-approved, including the route and cross-role denial defaults. No agent-set approval state.
Task ID: `role-based-dashboards`

## Purpose and scope

After a successful login, send the authenticated user to a distinct dashboard for their account type. Students and TAs have separate dashboard routes. Dashboard content is limited to a basic landing view and logout control; feature-specific ticket, queue, Bug FAQ, account, notification, or AI actions remain out of scope.

This specification extends the post-login behavior excluded from `workflow/specs/role-aware-login.md` v0.3. It supersedes only that specification's R7 immediate signed-in confirmation behavior. Its login validation, credential checks, server-side session contract, rate limits, and security requirements remain in force. This specification does not authorize implementation, dependencies, Firestore rules, deployment, or external service access.

Version 0.3 adds an implementation organization requirement: define the student and TA dashboard views in separate `StudentDashboard.tsx` and `TADashboard.tsx` modules. The route guard must import those modules while preserving current session validation, role matching, denial, retry, and navigation behavior. Both modules must continue using shared `DashboardLogout` and shared dashboard theme/style resources. Do not duplicate or rename the shared theme or logout modules, and do not rename code to `auth`.

## Sources and assumptions

- `Overview.md` defines `STUDENT` and `TA` account types and their separate feature areas. `accountType` and `accountStatus` are server-controlled account fields.
- Approved `workflow/specs/role-aware-login.md` v0.3 authenticates active users, returns only the authenticated account type on success, establishes a protected server-side session, and provides session, CSRF, and logout endpoints. It expressly excludes post-login destinations.
- Historical v0.1 baseline: frontend entry routing chose `/register` or the login page, no dashboard route existed, and successful login rendered a signed-in confirmation. T01–T05 have since implemented and independently reviewed the login destination, dashboard routes, route guard, and role-specific dashboards. Version 0.2 adds presentation requirements to that implemented baseline; the browser-refresh follow-up and human merge decision remain separate.
- The server's `/api/auth/session` endpoint validates the session and rechecks that the server-side account remains active with the role held at session issuance. `/api/auth/csrf` issues a CSRF token; `/api/auth/logout` checks it and invalidates the session.
- Approved paths are `/student/dashboard` and `/ta/dashboard`. A cross-role request displays an access-denied view with a link to the user's own dashboard when the session can be verified. The human approved these defaults with version 0.1.
- Dashboard views in this task contain no student-private or TA-operational data. Any later protected feature API must independently authorize its request on the server.
- Approved `workflow/PLAN.md` v0.1 schedules this task with the other role renames, before the ticket features.
- `Overview.md` now defines the project-wide interface design convention: use the login page's visual theme, shared tokens and reusable visual classes in a common project CSS file, and reusable interface elements where structure and behavior match, while preserving page-specific layouts.

## Actors and trust boundaries

- **Visitor:** may view login and registration pages without a session.
- **Authenticated student:** may enter the student dashboard only while the server validates the active student session.
- **Authenticated TA:** may enter the TA dashboard only while the server validates the active TA session.
- Client path, browser storage, React state, and login form selection are untrusted. They do not grant a role.
- The server-side session record and the account record revalidated by the server are authoritative. The role returned by `/api/auth/session` is the trusted role for direct route entry; the successful login response's `accountType` is used only to choose the initial destination before dashboard session revalidation.
- No password, password hash, raw session ID, or CSRF token may be logged or placed in user-visible content or evidence.

## Requirements

### R1. Post-login navigation

When `POST /api/auth/login` succeeds with HTTP 200 and a valid `accountType`, the login page MUST navigate to `/student/dashboard` for `STUDENT` and `/ta/dashboard` for `TA`. It MUST stop rendering the signed-in confirmation state. An invalid or missing type, malformed success body, or unsuccessful response MUST NOT navigate to either dashboard or establish UI-authenticated state; it MUST show an appropriate non-sensitive error.

On arrival, the dashboard route MUST revalidate the cookie-backed session with `GET /api/auth/session` before rendering its dashboard content. The returned server role MUST match the route. For an active student, the session endpoint MAY additionally return the stored account name so the student dashboard can greet that student. It MUST NOT return password, hash, session material, or unrelated account fields. The UI MUST NOT rely on the login form's selected account type, URL, query parameter, browser storage, or prior in-memory state as authorization.

### R2. Separate dashboards

The student route MUST render a student-specific dashboard landing view and greet the student using the name returned by the verified server session when one is present. It MUST NOT show a placeholder name when the stored name is unavailable. The TA route MUST render a TA-specific dashboard landing view. Each MUST identify the corresponding account type and provide a logout control. A route for one role MUST NOT render the other role's dashboard.

This task adds only basic role-specific landing views. It does not authorize data access or actions from the broader feature lists in `Overview.md`.

For version 0.3, the role-specific view implementation MUST be split between `StudentDashboard.tsx` and `TADashboard.tsx`. `DashboardRouteGuard.tsx` MUST import the role-specific view from its corresponding module. This module boundary does not change the route contract or role checks.

### R3. Unauthenticated route access

When a visitor directly opens, refreshes, or revisits either dashboard route without a valid session, the client MUST request `/api/auth/session`. On HTTP 401, it MUST render no dashboard content and MUST redirect to `/` (the login route). A login return notice is not required.

If session validation returns a service failure, invalid response, or network error, the client MUST fail closed: it MUST NOT render dashboard content or infer authentication, and MUST provide a non-sensitive retry path or a login link. It MUST distinguish this condition from a confirmed logged-out HTTP 401 so users can retry after temporary service recovery.

### R4. Cross-role access

When a verified session's server-returned role does not match the requested dashboard route, the UI MUST NOT render that dashboard. It MUST render an access-denied view that identifies no account details and MUST offer navigation to the dashboard matching the verified role. It MUST NOT change the account role, session role, or authorization state to satisfy the requested route.

Route visibility is not authorization for data operations. Any protected server endpoint introduced for dashboard functionality MUST authenticate the session and enforce the required role from server-side account/session data on every request; client-only route checks MUST NOT protect server data or actions.

### R5. Logout

Each dashboard MUST provide an accessible logout control. On activation, the client MUST obtain a CSRF token from `GET /api/auth/csrf`, then submit `POST /api/auth/logout` with the cookie and token in `X-CSRF-Token`. Only after HTTP 204 confirmation may it treat logout as complete, clear in-memory account state, and navigate to `/`. The server endpoint MUST invalidate the server-side session and clear the session cookie as required by role-aware-login R6.

If logout returns 401, the server has confirmed the session is no longer authenticated; the UI MUST clear in-memory account state and navigate to `/`. If CSRF validation fails (403), the UI MUST keep the page inaccessible to protected content while offering a retryable logout error. If the service is unavailable or the request fails without a server confirmation, the UI MUST NOT claim successful logout; it MUST avoid exposing protected dashboard content and provide a retry action. Logout MUST NOT be implemented by merely deleting client state or deleting a browser cookie.

### R6. Session changes and navigation

Every direct dashboard route load, refresh, and transition from login MUST validate the current server session. A stale session, expired session, account deactivation, or server-reported role change MUST result in the corresponding denied state and no dashboard content. Client navigation history and browser storage MUST NOT bypass this check.

The existing `/api/auth/session` endpoint returns 401 for invalid or expired sessions and 503 for service failures. Implementations MUST preserve that distinction when deciding whether to redirect to login or show a retry state.

### R7. Shared visual theme and reusable interface elements

Both role dashboards MUST follow the project interface design convention in `Overview.md` and use the same visual theme as the login page. Shared design tokens and reusable visual classes MUST be maintained in one common project stylesheet, `src/libconnect-mp4/src/theme.css`, imported once from the application entry point. The shared stylesheet SHOULD define the theme values and reusable visual patterns; page-specific stylesheets MAY define each page's layout and role-specific presentation.

The login page and both dashboards MUST consume the shared theme tokens for applicable colors, typography, surfaces, controls, focus treatments, and spacing. Shared interface elements MUST be reused when their structure and behavior match; role-specific content and page layouts MUST remain appropriate to their purpose. Do not reproduce the login card layout on dashboards solely to share styling.

The dashboard presentation MUST remain readable and usable on desktop and mobile viewports, including widths down to 320 CSS pixels, without horizontal overflow. Interactive controls MUST expose a clearly visible keyboard focus state. At narrower widths, spacing and layout MUST adapt while preserving the same theme and content hierarchy.

## Acceptance scenarios

1. Given a successful login response with `STUDENT`, when login completes, the browser navigates to `/student/dashboard`; the dashboard loads only after `/api/auth/session` confirms `STUDENT`.
2. Given a successful login response with `TA`, when login completes, the browser navigates to `/ta/dashboard`; the dashboard loads only after `/api/auth/session` confirms `TA`.
3. Given a malformed login success body, unsupported account type, or denied login, when login completes, no dashboard route is entered and no authenticated UI is shown.
4. Given an unauthenticated visitor directly opens or refreshes either dashboard route, when session validation returns 401, no dashboard content appears and the visitor is sent to `/`.
5. Given an authenticated student opens the TA route, or an authenticated TA opens the student route, when session validation succeeds, the requested dashboard is not rendered and an access-denied view links to the route matching the server role.
6. Given session validation returns 503 or fails over the network, when a dashboard route loads, no dashboard content appears and the user can retry or return to login without being falsely marked logged out.
7. Given a dashboard user selects logout and logout returns 204, when the request completes, the server session is invalidated, account state is cleared, and the browser navigates to `/`; a later dashboard request is denied.
8. Given logout returns 401, when the client handles the response, it clears account state and returns to login because the session is no longer authenticated.
9. Given CSRF validation returns 403 or logout has an unconfirmed service/network failure, when the client handles the response, it does not claim logout succeeded and does not expose protected dashboard content.
10. Given a session account is deactivated or its role no longer matches the session, when a route is loaded, server session validation denies access and the dashboard does not render.
11. Given a future protected API is called with a forged client role or a client-only dashboard state, the server's authorization decision still uses authenticated server-side identity and role.
12. Given a verified student or TA session, when either dashboard is rendered at desktop or mobile width, it uses the shared login-page theme, adapts without horizontal overflow down to 320 CSS pixels, and provides visible keyboard focus on interactive controls.
13. Given a new application page is added under the project convention, when its styles are implemented, it uses the shared theme tokens and reusable visual classes from the common CSS file, reuses interface elements where structure and behavior match, and retains a layout suited to that page.

## Verification matrix

| Layer | Coverage |
| --- | --- |
| Login UI | Valid student/TA success navigates to the corresponding path; invalid response and failures do not navigate. |
| Route guard | Direct path, refresh, and client navigation validate the session; 401 redirects to login; 503/network/malformed responses fail closed with retry; mismatched verified role denies route and offers own route. |
| Dashboard UI | Distinct student/TA views in separate modules and accessible logout controls; route guard imports the corresponding module; no cross-role view rendered. |
| Shared visual theme | Common `theme.css` is imported once; login and both dashboards consume shared theme tokens; shared visual classes and interface elements are reused where structure and behavior match; dashboard styles remain page-specific where needed. Inspect both dashboards at desktop and mobile sizes down to 320 CSS pixels, verify no horizontal overflow and visible keyboard focus, and confirm the future-page convention in `Overview.md`. |
| Logout integration | CSRF retrieval, token-bearing POST, 204 invalidation and redirect; 401 cleanup; 403 and outage error handling; invalidated session cannot load dashboard. |
| Security | Client-selected role, path, query, state, and storage cannot grant role; server session endpoint rechecks active status and issued role; dashboard checks protect presentation only and all protected APIs enforce authorization server-side. |

Tests MUST use synthetic accounts and sessions. They MUST NOT contact production Firebase or contain real credentials, hashes, cookies, session identifiers, or personal data.

## Scope boundaries and unresolved risks

- The two route paths, denial view, and redirect to `/` were included in the human approval of version 0.1.
- This work does not add dashboard feature data, protected feature APIs, account settings, ticket, queue, or Bug FAQ functionality, notifications, or AI interactions.
- The task depends on the existing role-aware-login server session and logout contract. Changes to those authentication rules require an update to that specification and renewed approval.
- The current server serves a single-page frontend shell for `/register`; routing behavior for the two new paths must be coordinated with hosting/static fallback and refreshed-path behavior. This specification requires direct URLs to work but does not approve deployment configuration changes.
- Session failure must fail closed. A CSRF or service failure during logout can leave the server session active; the UI must not claim logout succeeded and should keep dashboard content inaccessible until a retry or confirmed session denial.
- Implementation dependencies, hosting rewrites, deployment changes, Firebase rules, external access, and any new protected API remain separate approval matters.
- Version 0.2 added presentational requirements only. Version 0.3 adds module separation and reference updates without changing route behavior, authorization, shared theme/logout behavior, or dashboard content. It does not add dashboard features.
- Specification versions 0.2 and 0.3 were approved by the human on 2026-11-07. Checklist and handoff v0.3, T07 grouping, and implementation-dispatch approvals are separate; specification approval alone does not authorize implementation.

## Amendments

### 2026-11-07 — approved amendment proposal

The human approved a proposal to amend this specification with dashboard styling that follows the login page's visual theme, a visual convention for future application pages, a common CSS file with shared tokens, and reusable interface elements where appropriate. The reason is to keep the application visually consistent as pages are added. Fresh specification, checklist, handoff, grouping, and implementation approvals remain pending.

### 2026-11-07 — substantive planning amendment authorized

The human authorized drafting version 0.2 to specify shared login-theme styling on both dashboards, common project CSS tokens and reusable classes, reuse of interface elements where structure and behavior match, and responsive, desktop, mobile, and visible-focus acceptance criteria linked to `Overview.md`. Version 0.2 approval remains pending.

### 2026-11-07 — substantive planning amendment authorized

The human authorized drafting version 0.3 for separate `MemberDashboard.tsx` and `LibrarianDashboard.tsx` modules, route-guard imports, and SharedTheme test file references. Preserve existing route behavior, shared `DashboardLogout`, shared theme/style resources, and completed T01–T06. Do not rename code to `auth`. Version 0.3 remains a draft pending separate specification, checklist, and handoff approvals; T07 grouping and implementation dispatch are not approved.

### 2026-11-07 — amendment record opened

The human authorized a planning amendment for separate `MemberDashboard.tsx` and `LibrarianDashboard.tsx` modules while preserving shared logout and theme, route behavior, and completed T01–T06. This dated record is appended before substantive edits; the amendment will be version 0.3 draft pending separate approvals.

### 2026-11-07 — canonical specification v0.3 approved

The human explicitly approved canonical specification version 0.3. This approval covers the specification only; checklist, handoff, grouping, implementation, commit, and merge approvals remain separate.

### 2026-11-08 — member greeting amendment

The human directed the member dashboard to greet the signed-in user by name. Version 0.4 records the minimal session response addition and member-only presentation requirement. The login response and authorization rules remain unchanged.

### 2026-11-08 — v0.5 draft: CodeClinic roles

The human directed amending this specification for the CodeClinic scope. This version renames the roles and the role-specific parts of the dashboards only. It adds no dashboard feature and changes no session, denial, logout, or theme rule.

- Terms follow the 2026-11-08 `Overview.md` amendment: Member → Student, Librarian → TA, `MEMBER` → `STUDENT`, `LIBRARIAN` → `TA`.
- Routes: `/member/dashboard` → `/student/dashboard` and `/librarian/dashboard` → `/ta/dashboard`. The former paths are removed and are not redirected.
- Modules: `MemberDashboard.tsx` → `StudentDashboard.tsx` and `LibrarianDashboard.tsx` → `TADashboard.tsx`. Shared `DashboardLogout` and `theme.css` are unchanged.
- The name greeting applies to the student dashboard.
- Out-of-scope dashboard features now name tickets, the queue, and the Bug FAQ instead of the catalog and circulation.
- Depends on approved `role-aware-login` v0.3. The Book catalog view on the member dashboard belongs to the retired `member-catalog-search` specification; removing it is a separate approved task.
- The historical amendment entries above keep their original Member and Librarian wording.

### 2026-11-08 — canonical specification v0.5 approved

The human approved version 0.5, including the new routes without redirects from the former paths. This approval covers the specification only; checklist, handoff, grouping, implementation, commit, and merge approvals remain separate.
