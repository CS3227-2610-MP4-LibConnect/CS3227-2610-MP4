# Analyst handoff: student-tickets

Handoff version: 0.4 (2026-11-12 file-picker amendment; human-approved in conversation)
Task ID: `student-tickets`
Specification: `workflow/specs/student-tickets.md` v0.5, human-approved 2026-11-12
Checklist: `workflow/tasks/student-tickets/tasks.md` v0.4, human-approved 2026-11-12
Approval state: T01–T05 are complete under earlier approvals. The human separately approved specification v0.5, checklist v0.4, and this handoff on 2026-11-12. Batch plan and dispatch require separate approvals. Commit and merge remain separate decisions.

## Current v0.4 file-picker handoff

Scope: T06–T07 only. Replace the Create Ticket page's manual code-file
filename/content controls with local file selection and removal. Keep the
existing text-only JSON `files` API, database shape, three-file cap, 24 KiB
per-file limit, 128 KiB request limit, repository-source alternative, and
Student authorization/CSRF checks. The create-page help chat must not send a
draft while a selected file is still being read. No binary attachment service,
server contract change, TA change, dependency, deployment, or external service
is in scope.

Allowed implementation paths after all approvals: `src/codeclinic/src/tickets/TicketCreatePage.tsx`, `TicketCreatePage.css`, `StudentHelpChat.tsx`, and `StudentHelpChat.css` only if needed for read-pending behavior; focused `src/codeclinic/test/StudentTickets.test.tsx`, `StudentTicketHelpChat.test.tsx`, and `StudentHelpChat.test.tsx`; `docs/UserGuide.md` and `docs/DeveloperGuide.md`; this task's reports and factual logs. Existing server validation and API tests are read/run-only unless an approved correction separately expands scope. The implementer must not alter `server/tickets/validation.js`, routes, the AI gateway, Firestore schema, package files, or other pages.

Trust boundary: browser-selected names and content are untrusted. Check byte
size and basename before reading; reject undecodable UTF-8 text. Keep content
in page memory and render metadata only as text. Never log selected content,
create object URLs, or persist it in browser storage. The server remains the
authority for size, type/shape, source exclusivity, identity, CSRF, and writes.
An asynchronous read cannot race with ticket submit or create-page help chat;
rejected selections retain earlier valid files. Preserve existing chat
history/error behavior while preventing an incomplete draft request.

Selected implementation skill: `openspec-apply-change` using the
`workflow/specs/` and `workflow/tasks/student-tickets/` path adapter in
`workflow/README.md`; the native OpenSpec tree is not the source of truth.
Use local source/tests and synthetic files only. Required checks are focused
Create Ticket and Student help-chat UI tests, existing ticket API size/auth
tests, `npm run build`, independent review of the exact diff, and the human
browser/keyboard check at `/student/tickets/new` at 320 × 640 CSS pixels.
Record the spec version, changed paths, commands/results, unresolved risks,
and human observations in task evidence. No provider call, production data,
commit, push, merge, or deployment is authorized by this handoff.

## Historical v0.3 handoff (completed work)

### Scope and preflight

Implement only the create-ticket flow in specification R1–R6. Editing, closing, lists/details, replies, TA queue, AI, Bug FAQ, persisted create notifications, and external service access are excluded. The implementation agent must read the approved specification, checklist, and this handoff from disk and use the `openspec-apply-change` preflight adapted to `workflow/specs/`. Stop if any artifact version or approval is missing or inconsistent.

### Allowed files after all gates

- New ticket server modules under `src/codeclinic/server/tickets/` and their focused tests under `src/codeclinic/test/`.
- `src/codeclinic/server/index.js` for API mounting and the create-page deep link only.
- New create-page components and styles under `src/codeclinic/src/`; `src/codeclinic/src/index.tsx`, `DashboardRouteGuard.tsx`, `StudentDashboard.tsx`, and `AppHeader.tsx` for the specified route, entry points, and feedback.
- Relevant focused tests under `src/codeclinic/test/`, `docs/UserGuide.md`, `docs/DeveloperGuide.md`, and this task's reports and logs.

No dependency, lockfile, CI, deployment, Firestore rules, or unrelated feature changes are authorized. Use a separate implementation branch or worktree where practical; the reviewer must inspect the exact diff from a separate worktree or clean checkout.

### Trust and authorization

The cookie-backed server session and current stored account determine identity, active status, and Student role. The server supplies owner, ID, state, and Firestore `Timestamp`s. Browser path, state, storage, request body, filenames, code, repository URLs/paths, and API responses are untrusted. The endpoint requires CSRF and stores a repository reference without fetching it. Render all submitted content as text. Do not log content, credentials, session IDs, or CSRF tokens. Only server code accesses `tickets/{ticketId}` or its `replies` subcollection; this task writes only the C1 `OPEN` ticket shape, not replies or later transitions.

### Permissions, sources, and selected skills

Use local source and tests, synthetic data, and the Firestore emulator. Safe checks include focused tests, `npm test`, `npm run build`, and the assignment validator after dispatch. Production Firestore, external services, sending messages, push, deploy, commit, and merge are not authorized by this handoff. Sources: `Overview.md`, `workflow/PLAN.md` v0.1, the approved ticket specification, approved role-aware login/dashboard/notification specifications, and existing implementation patterns. Selected skills: `openspec-apply-change` for implementation preflight; `seedu-git-standard` only if a commit is separately approved. The analyst used `openspec-explore` and `openspec-propose` guidance with the repository's canonical-path adapter.

### Verification and risks

Use the specification verification matrix and checklist item criteria. Required evidence includes server auth/CSRF/allowlist/size and storage cases, protected route cases, form accessibility and failure cases, entry point and success navigation cases, full tests/build, emulator integration, and keyboard/320-pixel inspection. The new C1 checks cover `files`/`repoFilePaths`, the seven fixed language values and `Other` note, five normalized tags, revised limits, C1 null/empty fields, and Firestore `Timestamp`s. Existing preimplementation tests and coverage report target v0.2 and must be revised after the amended artifacts are approved. No implementation may dispatch until revised tests, batch plan, and approvals are ready. Existing untracked Firebase debug logs are outside this task and must not enter task evidence.

## Amendments

- 2026-11-12: The human separately approved handoff v0.4 for T06–T07 against approved spec v0.5 and checklist v0.4. Narrow file-picker UI, tests, and guide scope supersedes the historical v0.3 allowlist for this amendment. This approval does not approve the batch plan or dispatch.

- 2026-11-09: T05 follow-up covers only the shared header on the verified
  Student create page and the disabled initial language placeholder. Preserve
  the human's current action order in `AppHeader.tsx`. Allowed edits are the
  route/form components, focused tests, task artifacts, and factual logs;
  server and data contract changes are excluded. The human directed execution
  in conversation. A separate reviewer must inspect the exact follow-up diff.

- 2026-11-09: Handoff v0.1 was human-approved against specification v0.2 and checklist v0.1.
- 2026-11-09: Proposed v0.2 after approval of shared-contract reconciliation v0.3. Scope and allowed files remain creation-only; data shape and verification expectations now target specification v0.3.
- 2026-11-09: The human separately approved checklist v0.2 and handoff v0.2 in the conversation after approving specification v0.3.
