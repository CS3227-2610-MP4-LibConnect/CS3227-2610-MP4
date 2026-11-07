# Implementation checklist: role-based dashboards

Version: 0.3 (2026-11-07)
Task ID: `role-based-dashboards`
Specification: `workflow/specs/role-based-dashboards.md`, version 0.3 (human-approved 2026-11-07; version 0.2 and version 0.1 history retained)
Checklist approval evidence: the human explicitly approved checklist v0.3 and handoff v0.3 on 2026-11-07, after separately approving canonical specification v0.3. Checklist and handoff v0.2 were also human-approved on 2026-11-07, after separately approving specification v0.2. Checklist and handoff v0.1 had also been human-approved. No agent-set approval state.

Complete tasks in order. Checkboxes are implementation tracking only; completion does not approve implementation or merge. Follow the approved specification and the handoff. If implementation would change behavior, authorization policy, deployment configuration, or scope, stop and obtain the required approval before proceeding.

## Group 1

- [x] **T01 — Route successful login and validate dashboard sessions.** Replace the signed-in confirmation with navigation to the approved member or librarian route using the successful server response. On every dashboard entry, direct load, refresh, and transition, fetch `/api/auth/session` before rendering dashboard content. Redirect confirmed unauthenticated users to `/`; preserve a retry state for service, malformed-response, or network failures. Add focused tests for valid and invalid login response routing and route-guard outcomes. (Spec R1, R3, R6; scenarios 1–4, 6, 10.)

## Group 2

- [x] **T02 — Render distinct dashboards and deny cross-role routes.** Implement separate basic member and librarian landing views. Compare the requested route against the server-verified role; never render a mismatched dashboard, and show the approved access-denied view with a link to the verified role's route. Add tests proving a client-selected or URL role cannot authorize the view. (Spec R2, R4; scenarios 5, 11.)
- [x] **T04 — Support dashboard deep links and refreshes.** Ensure both approved dashboard paths serve the frontend shell in the current Express/static hosting setup, then verify direct navigation and refresh reach the route guard. Limit changes to application source. If an external hosting rewrite or deployment configuration change is needed, stop and request separate approval. (Spec R3, R6; scenarios 1, 2, 4.)

## Group 3

- [x] **T03 — Implement CSRF-protected logout on both dashboards.** Provide accessible logout controls that obtain a token from `/api/auth/csrf` and post it to `/api/auth/logout`. Navigate to `/` and clear account state only after 204 or confirmed 401. Keep protected content inaccessible and show retryable errors for CSRF, service, or unconfirmed network failures. Test successful invalidation and each failure outcome. (Spec R5, R6; scenarios 7–9.)

## Group 4

- [x] **T05 — Verify acceptance coverage and record evidence.** Run the relevant frontend, server, and integration tests using synthetic accounts and sessions; verify all R1–R6 scenarios, fail-closed behavior, role separation, CSRF logout, and no protected content on auth failures. Record exact changed files, commands, results, deviations, and unresolved risks in the implementation report and task log. (Spec verification matrix; all applicable scenarios.)

## Group 5

- [x] **T06 — Apply the shared theme to both dashboards.** Add `src/libconnect-mp4/src/theme.css` with shared project design tokens and reusable visual classes, and import it once from the application entry point. Update the login page and both dashboards to consume shared tokens where applicable; style dashboard layouts with page-specific CSS as needed, and reuse interface elements only where their structure and behavior match. Preserve role-specific content and layouts. Add focused tests for shared theme use, responsive rules, and visible keyboard focus; inspect both dashboards at desktop and mobile widths down to 320 CSS pixels, confirming no horizontal overflow. Record changed files and visual inspection evidence. (Spec R7; scenarios 12–13.)

## Group 6

- [x] **T07 — Split role dashboards into separate modules.** Move `MemberDashboard` into `src/libconnect-mp4/src/MemberDashboard.tsx` and `LibrarianDashboard` into `src/libconnect-mp4/src/LibrarianDashboard.tsx`. Update `DashboardRouteGuard.tsx` imports and `SharedTheme.test.tsx` imports and source-file references. Keep shared `DashboardLogout.tsx`, `DashboardViews.css`, and `theme.css` in place and preserve existing rendered behavior, route/session checks, role denial, shared logout, and theme use. Do not rename code to `auth`. (Spec R2 and dashboard UI verification matrix.)

## Approval boundary

The human separately approved this checklist and its accompanying handoff on 2026-11-07, then approved the Group 1–4 layout and implementation dispatch. The human subsequently authorized updating the task-grouper profile to permit dependency-safe item moves; unchanged T04 was moved ahead of T03 to represent the approved groups. A dependency, CI, deployment, hosting rewrite, external service, or Firestore rule change requires its own approval as described in the handoff and repository workflow.

Those earlier approvals apply to checklist v0.1 and T01–T05 only. Specification, checklist, and handoff v0.2 were separately human-approved on 2026-11-07. The human then approved T06 alone in Group 5 and authorized its implementation dispatch on 2026-11-07. Independent T06 review passed with a test-maintenance follow-up, so the orchestrator marked T06 complete. The human approved the merge decision for the reviewed v0.2 change on 2026-11-07; commit-message approval was pending at that historical gate. The human explicitly approved canonical specification v0.3, checklist v0.3, and handoff v0.3 on 2026-11-07. The human subsequently approved T07 alone in Group 6 after Group 5, approved removing the stale sentence “T07 is not grouped or dispatched.”, and authorized T07 implementation dispatch. T07 passed independent review and was marked `[x]`; all seven tasks are complete. No v0.2 approval advances the v0.3 human merge gate.

## Amendments

### 2026-11-07 — approved amendment proposal

The human approved a proposal to amend this checklist to cover dashboard styling that follows the login page's visual theme, a visual convention for future application pages, a common CSS file with shared tokens, and reusable interface elements where appropriate. The reason is to keep the application visually consistent as pages are added. Fresh specification, checklist, handoff, grouping, and implementation approvals remain pending.

### 2026-11-07 — substantive planning amendment authorized

The human authorized a draft checklist amendment adding a separate, unchecked styling task for the shared theme CSS and role dashboards. Existing tasks, grouping, wording, and completion states remain unchanged. Fresh specification, checklist, handoff, grouping, and implementation approvals remain pending.

### 2026-11-07 — substantive planning amendment authorized

The human authorized checklist version 0.3 with unchecked, ungrouped T07 for separate member/librarian dashboard modules and updates to route-guard imports and SharedTheme references. T01–T06 completion states and approved group placement remain unchanged. Preserve shared theme and logout, route behavior, and existing identifiers; do not rename code to `auth`. Checklist and handoff approvals, T07 grouping, and implementation dispatch remain pending.

### 2026-11-07 — amendment record opened

The human authorized a planning amendment adding unchecked T07 for splitting dashboard modules, while preserving shared logout/theme, route behavior, and completed T01–T06. This dated record is appended before substantive edits; checklist version 0.3 remains draft pending separate approvals, and T07 is to remain ungrouped pending later grouping approval.

### 2026-11-07 — canonical specification v0.3 approval recorded

The human explicitly approved canonical specification version 0.3. Checklist v0.3 and handoff v0.3 approval remain pending, as do T07 grouping and implementation dispatch, commit, and merge decisions.

### 2026-11-07 — checklist and handoff v0.3 approved

The human explicitly approved checklist v0.3 and handoff v0.3 after separately approving canonical specification v0.3. This approves the planning artifacts only. T07 remains unchecked and ungrouped; its test/grouping proposal, grouping approval, implementation dispatch, commit, and merge remain separate gates.

### 2026-11-07 — T07 grouping and implementation dispatch approved

The human explicitly approved T07 alone in Group 6 after Group 5, approved removing the stale sentence “T07 is not grouped or dispatched.” from the T07 item, and authorized T07 implementation dispatch. T07 remains unchecked pending implementation and review evidence. All other task IDs, wording, checkbox states, and prior group placements remain unchanged.
