# Specification discovery log — student-tickets

Date: 2026-11-09 (Asia/Singapore)
Task ID: `student-tickets`
Artifact: `workflow/specs/student-tickets.md` v0.1 draft

## Sources inspected

- `AGENTS.md`: source-of-truth order, staged workflow, security baseline,
  approval gates, and evidence requirements.
- `Overview.md`: Student ticket story; Ticket model; user roles, ownership,
  statuses and timestamps; interface design convention.
- `workflow/README.md`: canonical spec/task paths, human-confirmed task ID
  requirement, SDD lifecycle, approval gates, and evidence conventions.
- `workflow/PLAN.md` v0.1: planned `student-tickets` scope includes create,
  edit, close, view, files, and reply; dependency is `role-based-dashboards`.
  This specification covers creation-time files or repository references and
  defers later editing, closing, viewing, and replies.
- `workflow/agents/analyst.toml`: required specification contents, allowed
  paths, and stop-at-spec-approval procedure.
- `workflow/specs/role-aware-login.md`, `role-based-dashboards.md`,
  `notifications.md`, `account-management.md`, and
  `ui-consistency-and-feedback.md`: session/CSRF patterns, dashboard route
  behavior, notification types, and established UI conventions.
- Source reviewed: `src/codeclinic/src/StudentDashboard.tsx`,
  `DashboardRouteGuard.tsx`, `AppHeader.tsx`, `DashboardLogout.tsx`,
  `index.tsx`, `DashboardViews.css`, `AppHeader.css`,
  `src/codeclinic/server/index.js`, `server/auth/login.js`, and
  `server/notifications/notify.js`.
- `openspec list --json`: project root resolves to this repository and reports
  no active OpenSpec changes. Per workflow adapter, canonical artifacts remain
  under `workflow/specs/` and `workflow/tasks/`; no second OpenSpec tree was
  created.
- Bundled `openspec-explore` and `openspec-propose` skill guidance was read.
  The repository-specific SDD adapter is authoritative for artifact paths and
  separates specification approval from checklist/handoff approval.

## Findings and decisions

- StudentDashboard currently contains only a greeting panel; the authenticated
  header has Account and Notifications actions and no ticket route exists.
- The explicit frontend route switch and Express static fallback both need a
  future protected create route. No ticket server endpoint, store, or UI exists.
- Current auth middleware derives the account from a protected cookie-backed
  session and checks active status/role. State-changing API endpoints follow
  the established CSRF contract.
- Existing Notification types are `TICKET_CLAIMED`, `TICKET_REPLY`,
  `TICKET_RESOLVED`, and `SESSION_UPDATE`; the notifications spec assigns
  ticket-event decisions to ticket features. Therefore the requested
  create-success confirmation is specified as transient client feedback after
  successful server creation, not a persisted inbox Notification.
- Ticket record ownership, initial `OPEN` state, and timestamps are server
  supplied; client authorization/state fields are untrusted.
- Creation-time source context (up to three code files or a repository
  reference and paths) is in scope. Later editing or retrieval of that context
  remains deferred; the server must not fetch repository URLs.
- Open decisions retained in the specification: request/text/file size limits,
  file and repository-reference coexistence, and who supplies concept tags.
  These affect validation and storage contracts and require resolution before
  implementation.

## Work performed

- Created the canonical specification and its task-directory copy.
- No application source, tests, dependency files, CI, deployment settings,
  checklist, or handoff were changed. No tests were run because this is a
  specification-only stage.
- Existing untracked `src/codeclinic/firebase-debug.log` and
  `src/codeclinic/firestore-debug.log` were observed and left untouched.

## Approval state

Task ID confirmed by the human through the orchestrator. Specification v0.1 is
a draft awaiting separate human approval. No checklist or handoff is created
before that approval.
