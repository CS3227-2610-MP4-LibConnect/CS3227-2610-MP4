# Analyst handoff: role-based dashboards

Handoff version: 0.3 (2026-11-07)
Task ID: `role-based-dashboards`
Specification: `workflow/specs/role-based-dashboards.md`, version 0.3 human-approved 2026-11-07 (version 0.2 and version 0.1 approvals retained)
Checklist: `workflow/tasks/role-based-dashboards/tasks.md`, version 0.3 human-approved 2026-11-07 (version 0.2 and version 0.1 approvals retained)
Handoff approval evidence: the human explicitly approved checklist v0.3 and handoff v0.3 on 2026-11-07, after separately approving canonical specification v0.3. Checklist and handoff v0.2 were also human-approved on 2026-11-07, after separately approving specification v0.2. Checklist and handoff v0.1 had also been human-approved. No agent-set approval state.

`workflow/templates/handoff.md` is absent. This handoff follows the required fields in `workflow/README.md`. Historical checklist and handoff approvals and implementation dispatches are recorded below. Canonical specification, checklist, and handoff v0.3 are human-approved. The human approved T07 alone in Group 6 and authorized its implementation dispatch on 2026-11-07.

## Version 0.3 approved scope — T07 dispatch authorized

T07 moves the member and librarian dashboard view definitions into `src/libconnect-mp4/src/MemberDashboard.tsx` and `src/libconnect-mp4/src/LibrarianDashboard.tsx`. Update `DashboardRouteGuard.tsx` imports and `src/libconnect-mp4/test/SharedTheme.test.tsx` imports and source-file references. Preserve shared `DashboardLogout.tsx`, `DashboardViews.css`, `theme.css`, route and session behavior, role denial, rendered content, shared logout behavior, and theme use. Do not rename any code to `auth`.

T07 allowed files under the approved Group 6 dispatch:

- `src/libconnect-mp4/src/DashboardViews.tsx` for removal of the role view definitions after their move.
- `src/libconnect-mp4/src/MemberDashboard.tsx` and `src/libconnect-mp4/src/LibrarianDashboard.tsx` for the separate role modules.
- `src/libconnect-mp4/src/DashboardRouteGuard.tsx` for import path updates only.
- `src/libconnect-mp4/test/SharedTheme.test.tsx` for imports and source-file reference updates only.
- T07 implementation report and factual task log, after implementation is authorized.

The human authorized the scoped T07 source and test changes on 2026-11-07. Do not change login/auth naming, route paths or behavior, dashboard content, shared logout/theme files, dependencies, build/CI/deployment configuration, or unrelated tests. Use the existing test suite and focused checks; test results cannot advance review or merge gates.

## Version 0.2 scope and acceptance

This approved handoff scopes T06 only: create a common `src/libconnect-mp4/src/theme.css` for shared project design tokens and reusable visual classes, import it once from the application entry point, and apply its applicable tokens to the login page and both dashboards. Add page-specific dashboard styles as needed. Reuse interface elements only where structure and behavior match; preserve the distinct dashboard layouts and do not copy the login card layout onto dashboards. Follow the project-wide future-page convention in `Overview.md`.

T01–T05 were implemented and independently reviewed under the approved v0.1 artifacts. Their historical approvals do not cover v0.2. The human has since separately approved specification, checklist, and handoff v0.2, including T06's planned scope, then approved T06 alone in Group 5 and its implementation dispatch on 2026-11-07. The human merge decision remains separate. Dashboard feature content and all unrelated account, catalog, loan, reservation, fine, notification, and AI operations remain outside T06.

Acceptance criteria and the verification matrix for T06 are in human-approved canonical specification version 0.2. T06 was independently reviewed and marked complete in approved Group 5. Its grouping and implementation dispatch were separately approved by the human on 2026-11-07; the human merge decision for that v0.2 scope is historical. Canonical specification, checklist, and handoff v0.3 and T07 Group 6 implementation dispatch are now human-approved.

## Version 0.1 scope and acceptance

Implement T01–T05 from the approved checklist against specification R1–R6. On successful login, navigate by the server-returned account type to `/member/dashboard` or `/librarian/dashboard`. Revalidate the cookie-backed session on every route entry and before rendering dashboard content. Deny unauthenticated visitors and cross-role routes; provide separate basic dashboard views and CSRF-protected logout with the specified 401, 403, 503, malformed-response, and network behavior. Support direct dashboard URLs and refreshes within the current application source configuration.

Acceptance criteria and test matrix are in the canonical specification. Dashboard feature content and all unrelated account, catalog, loan, reservation, fine, notification, and AI operations are excluded. The prior approved `role-aware-login` specification remains authoritative for credential, session, and server authentication behavior except that its immediate R7 confirmation UI is superseded by this approved post-login destination contract.

## Version 0.1 implementation preflight

- Human-approved specification: version 0.1 on 2026-11-07, including route and denial choices.
- Checklist and handoff: human separately approved both version 0.1 artifacts on 2026-11-07, then approved grouping and implementation dispatch. No agent or test result may advance the merge gate.
- Before implementation, the implementer must use `.agents/skills/openspec-apply-change/SKILL.md` preflight adapted to this repository's canonical `workflow/specs/` and `workflow/tasks/` layout, verify the exact approved versions from disk, and stop if any artifact is missing, stale, unapproved, contradictory, or ambiguous.
- Work should use a separate implementation branch or worktree where practical. The human approved Group 1 T01, Group 2 T02 and T04, Group 3 T03, and Group 4 T05, and authorized implementation dispatch. The human also authorized the task-grouper profile change needed to move unchanged T04 ahead of T03 under the group headings.

## Version 0.1 allowed files and roles

After grouping and implementation dispatch are approved, the implementer may change only application source and focused tests needed for T01–T05:

- Frontend source under `src/libconnect-mp4/src/`, including `LoginPage.tsx`, `index.tsx`, dashboard or route-guard components, and associated CSS.
- Express application source under `src/libconnect-mp4/server/` only as needed to serve the approved deep-link paths using the existing deployment/static setup.
- Relevant tests under `src/libconnect-mp4/test/`, including login UI, route guard, logout, deep-link, and integration tests.
- Assigned implementation report and factual log under `workflow/tasks/role-based-dashboards/` and `logs/tasks/role-based-dashboards/`.

No package manifest or lockfile, CI, hosting/deployment configuration, Firestore rules, generated output, or unrelated source is in scope. Any dependency, external hosting rewrite, deployment configuration, or schema/security policy change must stop and receive separate human approval. The orchestrator retains checklist status and handoff coordination; the implementer must not self-approve or mark review/merge gates complete.

## Version 0.2 allowed files for T06 — dispatch approved

The approved T06 implementation is limited to:

- `src/libconnect-mp4/src/theme.css` for shared design tokens and reusable visual classes, imported once from `index.tsx`.
- `src/libconnect-mp4/src/index.tsx` for the one-time common stylesheet import.
- `src/libconnect-mp4/src/LoginPage.css` and `src/libconnect-mp4/src/DashboardViews.tsx`, plus a page-specific `src/libconnect-mp4/src/DashboardViews.css` if needed, to apply shared tokens while preserving the login and role-specific layouts.
- Existing or new interface components under `src/libconnect-mp4/src/` only when their structure and behavior are genuinely shared by these pages.
- Focused tests under `src/libconnect-mp4/test/` for shared theme use, responsive styles, and visible keyboard focus.
- T06 implementation evidence and factual task logs only after implementation is authorized.

These are the approved T06 boundaries. Do not modify package manifests or lockfiles, CI, hosting/deployment configuration, Firestore rules, generated output, or unrelated features. If a dependency, external service, deployment change, or security-policy change appears necessary, stop for separate human approval.

## Trusted and untrusted inputs; authorization

- Treat browser path, query string, login type selector, React state, browser storage, and all client-supplied role/account fields as untrusted. None grants access.
- The server cookie-backed session and `/api/auth/session` response are authoritative. The backend rechecks the server-stored account status and role according to approved role-aware-login R6.
- The login response's valid account type selects the initial destination only. Dashboard content must remain withheld until `/api/auth/session` returns the role matching that route.
- A mismatch displays the approved denial view and link to the route matching the verified server role; it must not mutate session or account role.
- The dashboard UI currently contains no private feature data. Any API that provides protected data or actions must enforce identity, active status, and role in trusted server code on each request; client checks are insufficient.
- Logout must use the existing CSRF endpoint and server-side logout handler. Do not treat cookie/local-state clearing as session invalidation.
- Do not log or include in tests/evidence any real email, password, password hash, session ID, cookie, CSRF token, or private user data. Use synthetic fixtures.

## Permissions and selected skills

- Historical v0.1 grant only: after human grouping and dispatch approval, scoped source and test changes for T01–T05 within the version 0.1 allowed-file paths above, relevant local build/test commands, and creation of task evidence. That grant was used for T01–T05 and does not authorize T06 or any further implementation.
- Current v0.3 grant: human-approved Group 6 T07 dispatch permits only the T07 allowed-file changes above, relevant local focused/full tests and build, and T07 task evidence. It does not grant commit, merge, push, deployment, external-service access, or other source changes.
- Not granted: dependency changes; CI or hosting/deployment configuration; Firebase CLI, database, or external project access; Firestore rule changes; provisioning, push, deploy, merge, public actions, messages, or destructive actions.
- Selected implementation skill: `.agents/skills/openspec-apply-change/SKILL.md`, using the repository's spec path adapter. No Firebase skill is needed for this frontend/session-route work; do not access Firebase as part of the task.
- Analyst planning used `.agents/skills/openspec-explore/SKILL.md` and `.agents/skills/openspec-propose/SKILL.md`, adapted to `workflow/specs/`. No additional external sources or MCP responses were used.

## Sources and test matrix

Sources: current user request and human decisions relayed by the orchestrator; human-approved dashboard specification v0.2 and its v0.1 approval history; approved login specification v0.2; `Overview.md` with the human-approved interface design convention; `AGENTS.md`; `workflow/README.md`; `workflow/agents/analyst.toml`; existing login, server session/logout, and frontend route source/tests. `workflow/PLAN.md` and `workflow/templates/handoff.md` are absent. OpenSpec project context resolved to this repository; its capability-spec inventory is empty, so `workflow/specs/` remains canonical. No external sources or services were accessed.

Use the specification verification matrix with synthetic data:

| Layer | Required evidence |
| --- | --- |
| Login and route UI | Member/librarian destinations from valid server response; no navigation for malformed/denied responses. |
| Route guard | Direct path, refresh, session 401 redirect, 503/network/malformed retry state, mismatched-role denial, session/status/role change denial. |
| Dashboard UI | Distinct basic views; no opposite-role render; accessible logout controls. |
| Dashboard module split (T07) | Separate member and librarian TSX modules; route guard imports each role module; shared logout/styles remain; rendered and route behavior stays unchanged. |
| Shared visual theme (T06) | One common `theme.css` import; login page and both dashboards consume applicable shared tokens; reusable visual classes and interface elements are shared where structure and behavior match; dashboard layouts remain page-specific. Inspect at desktop and mobile widths down to 320 CSS pixels for no horizontal overflow, responsive spacing, and visible keyboard focus. Confirm future-page guidance remains in `Overview.md`. |
| Logout integration | CSRF retrieval and POST; 204 invalidation; 401 cleanup; 403/outage unconfirmed behavior; post-logout dashboard denial. |
| Security | Client path/role/state cannot grant access; any protected endpoint uses server-side authorization; test fixtures/evidence contain no secrets or real private data. |

## Risks and unresolved constraints

- Express/static deep-link fallback must be verified for both dashboard paths. If implementation requires external hosting rewrites or deployment configuration, stop and request separate approval.
- Logout outage may leave the server session active. The UI must not claim success and must hide protected content until retry or confirmed session denial.
- No dashboard feature APIs are included. Adding private data or consequential actions would require a server authorization design and specification approval.
- No package changes are approved; if existing tools cannot satisfy the work, stop and request dependency approval.
- Any change to approved user behavior or role/session policy returns to specification approval before code continues.
- The v0.2 specification, checklist, handoff, Group 5 placement, and T06 implementation dispatch are human-approved. The styling work remains subject to independent review and a human merge decision.
- The proposed common stylesheet is a shared token and reusable-pattern layer, not a monolithic page stylesheet. Keep page-specific layout in page-level CSS and preserve the verified role guard and logout behavior.

## Version 0.1 next gate (historical)

The human approved the grouping and implementation dispatch. Execute the groups in order, reconcile each group's evidence, arrange independent review, and present the review findings for a human merge decision.

## Current next gate — version 0.3 human merge decision

The v0.2 implementation and review history, including its human merge decision, remains historical. Canonical specification, checklist, and handoff v0.3 are human-approved. T07's test writer recorded an expected red baseline and the human approved T07 alone in Group 6, the stale task-sentence removal, and implementation dispatch on 2026-11-07. T07 passed independent review and was marked `[x]`; all seven tasks are complete. Present the combined v0.3 implementation and review for a new human merge decision. Commit remains a separate gate.

## Amendments

### 2026-11-07 — approved amendment proposal

The human approved a proposal to amend this handoff for dashboard styling that follows the login page's visual theme, a visual convention for future application pages, a common CSS file with shared tokens, and reusable interface elements where appropriate. The reason is to keep the application visually consistent as pages are added. Fresh specification, checklist, handoff, grouping, and implementation approvals remain pending.

### 2026-11-07 — substantive planning amendment authorized

The human authorized drafting handoff version 0.2 for the new styling task, including shared theme CSS/tokens, reuse of interface elements where structure and behavior match, responsive and focus verification, and an explicit pending-approval state. Fresh version 0.2 specification, checklist, handoff, grouping, and implementation approvals remain pending.

### 2026-11-07 — substantive planning amendment authorized

The human authorized handoff version 0.3 draft for T07's separate dashboard modules, route-guard imports, and SharedTheme test references. Preserve route behavior, shared logout and theme, and completed T01–T06; do not rename code to `auth`. This amendment authorizes planning-document edits only. Specification, checklist, and handoff approvals, T07 grouping, and implementation dispatch remain pending.

### 2026-11-07 — amendment record opened

The human authorized a planning amendment for T07 to split dashboard modules, update route-guard imports and SharedTheme test references, and preserve shared logout/theme and route behavior. This dated record is appended before substantive edits; handoff version 0.3 remains draft pending separate approvals. No implementation dispatch is authorized by this planning amendment.

### 2026-11-07 — canonical specification v0.3 approval recorded

The human explicitly approved canonical specification version 0.3. This does not approve checklist v0.3, handoff v0.3, T07 grouping or dispatch, implementation, commit, or merge.

### 2026-11-07 — checklist and handoff v0.3 approved

The human explicitly approved checklist v0.3 and handoff v0.3 after separately approving canonical specification v0.3. T07 remains unchecked and ungrouped. Prepare its test/grouping proposal next; this approval does not authorize grouping, implementation dispatch, implementation, commit, or merge.
