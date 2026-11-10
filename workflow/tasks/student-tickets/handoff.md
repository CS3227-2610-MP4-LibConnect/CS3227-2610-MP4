# Analyst handoff: student-tickets

Handoff version: 0.3 (2026-11-09 UI follow-up directed in conversation)
Task ID: `student-tickets`
Specification: `workflow/specs/student-tickets.md` v0.4, UI follow-up directed 2026-11-09 in the conversation
Checklist: `workflow/tasks/student-tickets/tasks.md` v0.3, T05 follow-up directed 2026-11-09 in the conversation
Approval state: T01–T04 were approved, implemented, and independently reviewed under the earlier artifact versions. The human directed execution of T05 and preservation of the current navbar button order. Commit and merge remain separate decisions.

## Scope and preflight

Implement only the create-ticket flow in specification R1–R6. Editing, closing, lists/details, replies, TA queue, AI, Bug FAQ, persisted create notifications, and external service access are excluded. The implementation agent must read the approved specification, checklist, and this handoff from disk and use the `openspec-apply-change` preflight adapted to `workflow/specs/`. Stop if any artifact version or approval is missing or inconsistent.

## Allowed files after all gates

- New ticket server modules under `src/codeclinic/server/tickets/` and their focused tests under `src/codeclinic/test/`.
- `src/codeclinic/server/index.js` for API mounting and the create-page deep link only.
- New create-page components and styles under `src/codeclinic/src/`; `src/codeclinic/src/index.tsx`, `DashboardRouteGuard.tsx`, `StudentDashboard.tsx`, and `AppHeader.tsx` for the specified route, entry points, and feedback.
- Relevant focused tests under `src/codeclinic/test/`, `docs/UserGuide.md`, `docs/DeveloperGuide.md`, and this task's reports and logs.

No dependency, lockfile, CI, deployment, Firestore rules, or unrelated feature changes are authorized. Use a separate implementation branch or worktree where practical; the reviewer must inspect the exact diff from a separate worktree or clean checkout.

## Trust and authorization

The cookie-backed server session and current stored account determine identity, active status, and Student role. The server supplies owner, ID, state, and Firestore `Timestamp`s. Browser path, state, storage, request body, filenames, code, repository URLs/paths, and API responses are untrusted. The endpoint requires CSRF and stores a repository reference without fetching it. Render all submitted content as text. Do not log content, credentials, session IDs, or CSRF tokens. Only server code accesses `tickets/{ticketId}` or its `replies` subcollection; this task writes only the C1 `OPEN` ticket shape, not replies or later transitions.

## Permissions, sources, and selected skills

Use local source and tests, synthetic data, and the Firestore emulator. Safe checks include focused tests, `npm test`, `npm run build`, and the assignment validator after dispatch. Production Firestore, external services, sending messages, push, deploy, commit, and merge are not authorized by this handoff. Sources: `Overview.md`, `workflow/PLAN.md` v0.1, the approved ticket specification, approved role-aware login/dashboard/notification specifications, and existing implementation patterns. Selected skills: `openspec-apply-change` for implementation preflight; `seedu-git-standard` only if a commit is separately approved. The analyst used `openspec-explore` and `openspec-propose` guidance with the repository's canonical-path adapter.

## Verification and risks

Use the specification verification matrix and checklist item criteria. Required evidence includes server auth/CSRF/allowlist/size and storage cases, protected route cases, form accessibility and failure cases, entry point and success navigation cases, full tests/build, emulator integration, and keyboard/320-pixel inspection. The new C1 checks cover `files`/`repoFilePaths`, the seven fixed language values and `Other` note, five normalized tags, revised limits, C1 null/empty fields, and Firestore `Timestamp`s. Existing preimplementation tests and coverage report target v0.2 and must be revised after the amended artifacts are approved. No implementation may dispatch until revised tests, batch plan, and approvals are ready. Existing untracked Firebase debug logs are outside this task and must not enter task evidence.

## Amendments

- 2026-11-09: T05 follow-up covers only the shared header on the verified
  Student create page and the disabled initial language placeholder. Preserve
  the human's current action order in `AppHeader.tsx`. Allowed edits are the
  route/form components, focused tests, task artifacts, and factual logs;
  server and data contract changes are excluded. The human directed execution
  in conversation. A separate reviewer must inspect the exact follow-up diff.

- 2026-11-09: Handoff v0.1 was human-approved against specification v0.2 and checklist v0.1.
- 2026-11-09: Proposed v0.2 after approval of shared-contract reconciliation v0.3. Scope and allowed files remain creation-only; data shape and verification expectations now target specification v0.3.
- 2026-11-09: The human separately approved checklist v0.2 and handoff v0.2 in the conversation after approving specification v0.3.
