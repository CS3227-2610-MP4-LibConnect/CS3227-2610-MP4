# Analyst handoff: account management

Handoff version: 0.1 (2026-11-08)
Task ID: `account-management`
Specification: `workflow/specs/account-management.md`, version 0.1 (human-approved 2026-11-08)
Checklist: `workflow/tasks/account-management/tasks.md`, version 0.1 (human-approved 2026-11-08)
Handoff approval evidence: the human replied "approved" to checklist v0.1 and handoff v0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

## Scope

Implement T01–T07 exactly as specified: self-service account updates, TA and Coordinator account support, forced password change, the first-Coordinator bootstrap, the pages, and the guides. No changes to registration or login rules other than R7, and no AI features.

## Preflight

- Read `AGENTS.md`, `workflow/README.md`, the approved specification, this handoff, and the checklist from disk, and verify their versions and approvals.
- Work in a worktree that the orchestrator creates from `codeclinic-scope` after `codeclinic-rename` is merged. Check the base commit with `git log -1`.

## Allowed files

- New files under `src/codeclinic/server/account/`, `src/codeclinic/scripts/bootstrap-coordinator.js`, and new page components and CSS under `src/codeclinic/src/`.
- `src/codeclinic/server/index.js` (routes only), `src/codeclinic/server/auth/login.js` (R7 session limit only), `src/codeclinic/server/auth/firestore-store.js` (adding a delete-all-sessions-for-user operation only), `src/codeclinic/src/index.tsx` (routes), and the two dashboard components (navigation links).
- New tests under `src/codeclinic/test/`. Existing tests change only if a route list they assert must include the new routes.
- `docs/UserGuide.md` and `docs/DeveloperGuide.md`, plus this task's evidence files.

No new dependencies, no deployment or CI changes, and no changes to other features.

## Trusted and untrusted inputs; authorization

- **Untrusted:** every request body, query, and `:userId` path value, and all browser state.
- **Trusted:** the server session and the stored account records only.
- Target records are always loaded on the server before authorization.
- No endpoint may write `accountType`, `isManager`, `studentId`, `employeeId`, or `registrationDateTime`.
- Temporary passwords, hashes, and session IDs never appear in logs, tests, snapshots, or evidence. Tests use synthetic values.

## Permissions and tools

- **Allowed:** `npm ci` with the locked dependencies, using a writable temporary cache; `npm test`; `npm run build`; and the Firestore emulator for opt-in tests.
- **Not allowed:** other network access, real credentials, push, deploy, or merge.
- The bootstrap script is never run against a cloud project by an agent.

## Selected skills

- `openspec-apply-change` for the preflight.
- `firebase-firestore`, as a reference for transactions.
- `seedu-git-standard` for commit messages, with no AI attribution.

## Test matrix

See the checklist. Every R1 status code, the R4 authorization matrix, R5 and R6 session deletion, R7 enforcement, R8 refusals, and the UI confirmations must have tests.

## Known risks

- The email-change transaction touches the same `emailKeys` collection as registration, so a race between them must fail with `409` and never leave an orphan key.
- The R7 session limit edits shared login code, so the existing login tests must pass unchanged.

## Approval state

Specification v0.1 is human-approved. Checklist v0.1 and this handoff v0.1 are human-approved (2026-11-08). Grouping and dispatch are separate decisions.
