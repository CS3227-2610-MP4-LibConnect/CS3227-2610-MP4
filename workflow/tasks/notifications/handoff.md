# Analyst handoff: notifications

Handoff version: 0.1 (2026-11-08)
Task ID: `notifications`
Specification: `workflow/specs/notifications.md`, version 0.1 (human-approved 2026-11-08)
Checklist: `workflow/tasks/notifications/tasks.md`, version 0.1 (human-approved 2026-11-08)
Handoff approval evidence: the human replied "approved" to checklist v0.1 and handoff v0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

## Scope

Implement T01–T04: the `notify` module, the inbox API, the bell and inbox page, and the guides. Deciding which ticket events notify whom is out of scope; the ticket tasks call `notify`. Email or push delivery and AI text are also out of scope.

## Preflight

- Read `AGENTS.md`, `workflow/README.md`, the approved specification, this handoff, and the checklist from disk, and verify their versions and approvals.
- Work in a worktree that the orchestrator creates from `codeclinic-scope` after `codeclinic-rename` is merged. Check the base commit with `git log -1`.

## Allowed files

- New files under `src/codeclinic/server/notifications/` and new components and CSS under `src/codeclinic/src/`.
- `src/codeclinic/server/index.js` (mounting the routes only), `src/codeclinic/src/index.tsx` (route only), and the shared dashboard navigation component (adding the bell only).
- New tests under `src/codeclinic/test/`, the two guides, and this task's evidence files.

No new dependencies, no changes to other features, and no CI or deployment changes.

## Trusted and untrusted inputs; authorization

- The recipient is always the session's `userId`, never a request field.
- A notification ID from the client is untrusted, and ownership is checked on the server.
- Message text is untrusted and is rendered as text only.
- No browser access to Firestore.

## Permissions and tools

- **Allowed:** `npm ci` with the locked dependencies, using a writable temporary cache; `npm test`; and `npm run build`.
- **Not allowed:** other network access, real credentials, push, deploy, or merge.

## Selected skills

- `openspec-apply-change` for the preflight.
- `seedu-git-standard` for commit messages, with no AI attribution.

## Test matrix

See the checklist. Ownership, the `404` for other users' notifications, CSRF, pagination, the unread cap, plain-text rendering, and failure isolation all need tests.

## Known risks

- Both this task and `account-management` add navigation links to the dashboards, so the orchestrator must not run them in parallel on the same navigation file.

## Approval state

Specification v0.1 is human-approved. Checklist v0.1 and this handoff v0.1 are human-approved (2026-11-08). Grouping and dispatch are separate decisions.
