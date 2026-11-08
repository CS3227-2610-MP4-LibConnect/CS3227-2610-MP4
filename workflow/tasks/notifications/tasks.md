# Implementation checklist: notifications

Version: 0.1 (2026-11-08)
Task ID: `notifications`
Specification: `workflow/specs/notifications.md`, version 0.1 (human-approved 2026-11-08)
Checklist approval evidence: the human replied "approved" to checklist v0.1 and handoff v0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

Tasks are grouped as proposed by the task grouper on 2026-11-08 and applied under the human's standing approval. Tasks in the same group may run in parallel; groups run in order. Checkboxes are implementation tracking only; the orchestrator marks a task `[x]` only after independent review. The task starts after `codeclinic-rename` is merged. All paths are under `src/codeclinic/`.

Cross-task schedule with `notifications` (shared files `server/index.js`, `src/index.tsx`, the dashboards, `server/auth/login.js`, and the guides force this order; groups in the same wave run together): Wave 1 AM-G1 ∥ N-G1; Wave 2 AM-G2; Wave 3 AM-G3; Wave 4 N-G2; Wave 5 AM-G4; Wave 6 N-G3; Wave 7 AM-G5.

## N-G1 — Notify module and inbox API (parallel)

- [x] **T01 — Shared notify module.** Add `server/notifications/notify.js` with the R1 validation, the 300-character cap, the write shape, and the single retry, with a non-sensitive log on failure that never throws to the caller. Unit-test it with a fake Firestore. (Spec R1; scenarios 1, 6.)

- [x] **T02 — Inbox API.** Add the four R2 endpoints under `server/notifications/route.js`, mounted in `server/index.js`: own-only access, a `404` for other users' IDs, cursor pagination with 20 per page, an unread count capped at 99, CSRF on the `POST` endpoints, and `503` on storage failure. Test ownership, pagination, CSRF, and every status code. (Spec R2; scenarios 2–4, 7.)

## N-G2 — Bell and inbox page

- [ ] **T03 — Bell and inbox page.** Add the bell with the unread count to both dashboards' navigation, and an inbox page with plain-text items, **Mark all as read**, per-item read on open, and empty, loading, and error-with-retry states. Use the shared theme, and test at a width of 320 CSS pixels. Component tests cover each state and plain-text rendering. (Spec R3; scenarios 4, 5.)

## N-G3 — Guides and evidence

- [ ] **T04 — Guides and evidence.** Update the User Guide and Developer Guide. Run the full suite and build. Record `implementation-report.md` and the logs under `logs/tasks/notifications/`, with the token table.

## Approval boundary

Checklist v0.1 and handoff v0.1 are human-approved (2026-11-08). Grouping, dispatch, review, commit, and merge are separate human decisions.

## Amendments

- 2026-11-08: Drafted at the human's direction after the human approved specification v0.1.
- 2026-11-08: The human approved checklist v0.1 and handoff v0.1.
- 2026-11-08: The human replied "yes" to extending the standing approval to this task: the orchestrator may apply the task grouper's grouping, dispatch each group, and after an independent review with no Critical or High findings commit (SE-EDU style, no AI attribution) and merge into `codeclinic-scope`. Critical or High findings, or spec, scope, or security changes, still go to the human. No push or deployment.
- 2026-11-08: Applied the task grouper's grouping and cross-task schedule under the standing approval; whole tasks moved without wording or checkbox changes.
