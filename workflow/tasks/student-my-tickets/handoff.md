# Analyst handoff: student-my-tickets

Handoff version: 0.1 (2026-11-10)
Task ID: `student-my-tickets` (human confirmed)
Specification: `workflow/specs/student-my-tickets.md` v0.1 (human approved; `approval-spec-v0.1.md`)
Checklist: `workflow/tasks/student-my-tickets/tasks.md` v0.1 (human approved; `approval-checklist-v0.1.md`)
Handoff approval: human approved on 2026-11-10 (see `approval-handoff-v0.1.md`). Batch plan v0.1 and ordered implementation dispatch subsequently approved (see `approval-batch-plan-v0.1.md`).

## Scope, dependencies, and allowed files after later gates

Replace the existing protected My Tickets placeholder with a paginated owned-ticket list. Open is `OPEN`/`CLAIMED`; Closed is `CLOSED`/`RESOLVED`. Keep dashboard card presentation and the user's **View all tickets** link, and place My Tickets immediately to the right of Create Ticket in the Student header. Preserve the existing ticket creation/detail/reply/close and TA flows. No data-model, authorization-policy, or state-machine changes are permitted.

After batch dispatch approval, scoped work may touch `src/codeclinic/server/tickets/` route/store/validation files, `src/codeclinic/firestore.indexes.json`, Student ticket UI under `src/codeclinic/src/tickets/`, `src/codeclinic/src/AppHeader.tsx`, `src/codeclinic/src/StudentDashboard.tsx`, related shared styles, focused tests under `src/codeclinic/test/`, `docs/UserGuide.md`, `docs/DeveloperGuide.md`, task artifacts under `workflow/tasks/student-my-tickets/`, and factual logs under `logs/tasks/student-my-tickets/`. No dependency, lockfile, CI, Firebase rules, or unrelated deployment change is authorized. `firebase.json` already references the index file; do not alter or deploy it without separate approval.

Before implementing, read the approved specification, this handoff, and the checklist from disk and perform the `openspec-apply-change` preflight with the repository's `workflow/specs/` adapter. Stop if versions, approvals, or assigned scope differ. Use separate implementer and reviewer worktrees or clean checkouts where practical.

## Trust and security

The server-validated session and current stored active Student account establish identity and role on every list request. Derive owner ID on the server. Keep the Firestore query owner-scoped, status-filtered, ordered, and limited; return only the spec's safe summary projection. Validate query values and bounded view-bound cursors before Firestore access. Treat stored text and response data as plain text. A browser path, query string, ticket ID, cursor, or role claim is not authority. Do not log tickets, account information, credentials, or session material. Use synthetic data in tests.

## Verification and open risks

Use the specification's store/API/UI/integration/accessibility matrix. Test more than 20 tickets across deterministic page boundaries, four statuses, two owners, cross-view cursor reuse, account denials, safe failures, stale UI requests, and card/nav regression. Run relevant focused and full tests plus production build; record commands and results per item. The previous `student-ticket-activity` evidence identifies the existing default Firestore database as Standard edition; verify index coverage locally. The emulator does not prove production index deployment. Any live Firestore access or index deployment needs separate approval.

For visual verification, follow `AGENTS.md`: give the human the My Tickets route, 320 CSS-pixel viewport, Open/Closed toggle and keyboard steps, and conditions for overflow, muted-card readability, and visible focus. Record the human's result; leave the criterion open until then. Do not claim a browser image check based only on DOM tests.

## Sources, skills, and approvals

Sources: user requirements and decisions; `Overview.md`; `workflow/PLAN.md`; `workflow/README.md`; approved `student-tickets` and `student-ticket-activity` specs; existing route/store/index/guard/header/dashboard/card and tests. Selected skills: `openspec-explore` and `openspec-propose` for planning with the canonical path adapter, `firebase-firestore` for indexed query design, `openspec-apply-change` for implementation preflight, and `seedu-git-standard` only if a commit is separately approved. No external service or MCP source was used in the analyst phase.

Human approval evidence: task ID confirmed; Closed includes `CLOSED` and `RESOLVED`; specification v0.1, checklist v0.1, handoff v0.1, and batch plan v0.1 with ordered implementation dispatch separately approved in conversation on 2026-11-10. Index deployment, commit, and merge remain unapproved.
