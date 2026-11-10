# Analyst handoff: student-ticket-activity

Handoff version: 0.2 (2026-11-10; human approved)
Task ID: `student-ticket-activity`
Specification: `workflow/specs/student-ticket-activity.md` v0.3 (human approved)
Checklist: `workflow/tasks/student-ticket-activity/tasks.md` v0.2 (human approved)
Approval evidence: the human approved specification v0.2, checklist v0.1, and
handoff v0.1 separately on 2026-11-09, then approved specification v0.3 on
2026-11-10. Checklist v0.2 was then separately approved on 2026-11-10;
handoff v0.2 received separate approval on 2026-11-10; see
`approval-handoff-v0.2.md`. Batch 1
under the prior versions is recorded in `approval-batch-1.md`; T01 passed and
T02 requires correction. Renewed dispatch and merge are pending.

## Scope and dependencies

Deliver the authenticated Student dashboard's five active ticket cards, a
protected My Tickets placeholder, owned ticket detail/thread reads, Student
replies on active tickets, and close without resolution. Preserve existing
ticket creation and the user's uncommitted dashboard text removal. Use the
existing C1 ticket and C2 reply/state contract from
`workflow/specs/student-tickets.md` v0.4. Do not add ticket editing, TA queue,
resolution, notifications, AI, or the full My Tickets list.

For T02, return ticket replies in ordered blocks of at most 50 through a
bounded cursor. Check ownership on every block; validate ticket IDs/cursors;
resolve author names through trusted accounts. If the owner author's account
is missing, show `[deleted account]` and retain Student role. Keep the
original reply data model. T05 must let the Student load further blocks until
every reply is accessible, with retained earlier replies and retry on failure.

Before implementation, read the approved specification, this handoff, and the
checklist from disk and perform the `openspec-apply-change` preflight with the
repository's `workflow/specs/` adapter. Stop if versions or approvals differ.

## Allowed files after later gates

- `src/codeclinic/server/tickets/` for route, store, and validation work;
  `src/codeclinic/server/index.js` for server route and deep-link mounting.
- `src/codeclinic/src/StudentDashboard.tsx`, `DashboardRouteGuard.tsx`,
  `index.tsx`, new ticket components/styles under `src/codeclinic/src/tickets/`,
  and related dashboard styles for the specified UI.
- Focused tests under `src/codeclinic/test/`, local Firestore index definition
  under `src/codeclinic/`, and `src/codeclinic/firebase.json` for index wiring.
- Relevant `docs/UserGuide.md`, `docs/DeveloperGuide.md`, task evidence under
  `workflow/tasks/student-ticket-activity/`, and factual logs under
  `logs/tasks/student-ticket-activity/`.

No dependency, lockfile, CI, other deployment configuration, security-rules,
or unrelated feature changes are authorized. Index deployment is excluded
until a separate human decision. Use separate implementation and review
worktrees or branches where practical; the reviewer must inspect the exact
change independently.

## Trust, security, and behavior

The server-validated cookie session and current stored account establish
active Student role and owner. Derive all author, owner, ID, state, and time
fields on the server. Treat path IDs, request fields, ticket/reply text, files,
repository URLs, and responses as untrusted. Require CSRF for reply/close,
check ownership before reading or writing, re-read state in Firestore
transactions, and reject writes on terminal tickets. Render all content as
text. Do not log content or credentials. Only server code accesses Firestore.

## Verification and open risks

Use the spec verification matrix with synthetic data and the Firestore
emulator. Required evidence includes index-backed bounded query behavior;
cross-student and TA/visitor isolation; typed input/CSRF; transaction races;
read/reply/close UI states; focused/full tests; production build; and keyboard
and 320-pixel inspection. Record exact commands, results, changed files,
spec version, deviations, and unresolved risks per item.

The approved read-only CLI check found the target `(default)` database is
Firestore STANDARD edition; see `approval-batch-1.md`. The local emulator
verified the T01 query in independent review. Further external service access
still needs separate human approval.
The index adds storage and write-maintenance overhead. Current account names
for historical replies may be unavailable; use the specified safe fallback.

## Sources and selected skills

Sources: user requirements and approvals in conversation; `Overview.md`;
`workflow/PLAN.md`; `workflow/README.md`; approved `student-tickets` spec;
current ticket route, store, dashboard, guard, server wiring, and tests.
Selected skills: `openspec-explore` and `openspec-propose` for analyst planning
with the canonical path adapter; `openspec-apply-change` for implementation
preflight; `firebase-firestore` for index/query design after edition check;
`seedu-git-standard` only if a commit is separately approved.

## Amendment record

- 2026-11-10: The human approved specification v0.3 with 50-reply blocks and
  `[deleted account]` for a missing owner author. The prior v0.1 handoff
  referenced spec v0.2 and checklist v0.1 and was approved on 2026-11-09.
  T01 passed independent review; T02 requires correction and renewed review.
  This handoff was revised to v0.2 and separately approved on 2026-11-10.
