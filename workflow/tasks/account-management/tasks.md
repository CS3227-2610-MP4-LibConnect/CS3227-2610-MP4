# Implementation checklist: account management

Version: 0.1 (2026-11-08)
Task ID: `account-management`
Specification: `workflow/specs/account-management.md`, version 0.1 (human-approved 2026-11-08)
Checklist approval evidence: the human replied "approved" to checklist v0.1 and handoff v0.1 on 2026-11-08; recorded at the human's request; no agent-set approval state.

Tasks are grouped as proposed by the task grouper on 2026-11-08 and applied under the human's standing approval. Tasks in the same group may run in parallel; groups run in order. Checkboxes are implementation tracking only; the orchestrator marks a task `[x]` only after independent review. The task starts after `codeclinic-rename` is merged. All paths are under `src/codeclinic/`.

Cross-task schedule with `notifications` (shared files `server/index.js`, `src/index.tsx`, the dashboards, `server/auth/login.js`, and the guides force this order; groups in the same wave run together): Wave 1 AM-G1 ∥ N-G1; Wave 2 AM-G2; Wave 3 AM-G3; Wave 4 N-G2; Wave 5 AM-G4; Wave 6 N-G3; Wave 7 AM-G5.

## AM-G1 — Store and guards

- [x] **T01 — Account store and shared guards.** Add `server/account/store.js` with the Firestore operations the spec needs:
  - read and list accounts by type, with pagination;
  - the transactional email change that moves `emailKeys`;
  - status and password-hash updates;
  - deleting all sessions of a user, reusing the session collection in `server/auth/firestore-store.js`.

  Add `server/account/guards.js` with middleware for an authenticated active actor, CSRF on state-changing requests, and R4 target authorization. Unit-test every function against fakes. (Spec R1, R4.)

## AM-G2 — Self-service API and bootstrap (parallel)

- [ ] **T02 — Self-service API.** Add `GET /api/account`, `PATCH /api/account/profile`, and `POST /api/account/password` (R2, R3), including:
  - the current-password checks;
  - rate-limit counting through the existing login failure counter;
  - deletion of the user's other sessions;
  - clearing `mustChangePassword`.

  Test every status code, the transaction rollback on collision, and the session effects. (Scenarios 1–4, 7, 9, 11.)

- [ ] **T05 — Bootstrap script.** Add `scripts/bootstrap-coordinator.js` with an explicit `--project`, the refusal rules, and output that does not show the full email address or any credentials. Test it against fakes, including the refusal cases. (Spec R8; scenario 10.)

## AM-G3 — Support API and forced password change (parallel)

- [ ] **T03 — Support API.** Add the list, status, and password-reset support endpoints (R1, R4–R6):
  - session deletion on deactivation and on reset;
  - the temporary password generator: 16 characters from an unambiguous alphabet, using `crypto.randomInt`;
  - `Cache-Control: no-store` on the reset response.

  Test the full authorization matrix, including that a Coordinator may act on Students and other TAs but not on themselves. (Scenarios 5, 6, 8, 9.)

- [ ] **T04 — Forced password change.** In the session check in `server/auth/login.js`, allow only the R7 endpoints while `mustChangePassword` is `true`, and return `403 PASSWORD_CHANGE_REQUIRED` otherwise. Test that it applies to every other protected route and clears after a successful change. (Spec R7; scenario 8.)

## AM-G4 — Pages

- [ ] **T06 — Account and support pages.**
  - Add an **Account** page for both roles.
  - Add a **Students** page for TAs and Coordinators, and a **TAs** page for Coordinators.
  - Deactivation and reset ask for confirmation, and the temporary password is shown once with a copy button.
  - Add the forced password-change page, and navigation links from the dashboards.
  - Use the shared theme.

  Component tests for each page, state, and confirmation. (Spec R9.)

## AM-G5 — Guides and evidence

- [ ] **T07 — Guides and evidence.**
  - Update `docs/UserGuide.md` and `docs/DeveloperGuide.md` for these features and the bootstrap procedure.
  - Run the full suite and build.
  - Record `implementation-report.md`, `security-review.md`, and the logs under `logs/tasks/account-management/`, with the token table.

## Approval boundary

Checklist v0.1 and handoff v0.1 are human-approved (2026-11-08). Grouping, dispatch, review, commit, and merge are separate human decisions.

## Amendments

- 2026-11-08: Drafted at the human's direction after the human approved specification v0.1.
- 2026-11-08: The human approved checklist v0.1 and handoff v0.1.
- 2026-11-08: The human replied "yes" to extending the standing approval to this task: the orchestrator may apply the task grouper's grouping, dispatch each group, and after an independent review with no Critical or High findings commit (SE-EDU style, no AI attribution) and merge into `codeclinic-scope`. Critical or High findings, or spec, scope, or security changes, still go to the human. No push or deployment.
- 2026-11-08: Applied the task grouper's grouping and cross-task schedule under the standing approval; whole tasks moved without wording or checkbox changes.
