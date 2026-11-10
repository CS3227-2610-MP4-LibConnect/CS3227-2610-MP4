# Analyst handoff: ta-ticket-queue

Handoff version: 0.1 (2026-11-09)
Task ID: `ta-ticket-queue`
Specification: `workflow/specs/ta-ticket-queue.md`, version 0.1 (the human approved it on 2026-11-09)
Checklist: `workflow/tasks/ta-ticket-queue/tasks.md`, version 0.1 (the human approved it on 2026-11-09)
Handoff approval evidence: the human replied "approved the checklist and handoff" to checklist v0.1 and handoff v0.1 on 2026-11-09; recorded from the human's message; no agent-set approval state.

## Scope

Implement T01–T08: the ticket store and state machine; the TA queue, detail,
claim, unclaim, reply, and resolve API; the TA notifications; the queue and
ticket-detail pages; the guides.

Out of scope:

- Ticket creation, editing, closing, attachments, and student replies
  (`student-tickets`).
- AI features (`ai-ta-assist`) and the Bug FAQ.
- A coordinator "Release claim" action (Q3).
- Deploying the Firestore indexes, and referencing them in `firebase.json`
  (Q4; owned by `environments-and-deployment`). T09 adds only the index file.

## Preflight

- Read `AGENTS.md`, `workflow/README.md`, the approved specification, this
  handoff, and the checklist from disk, and verify their versions and
  approvals. The `openspec-apply-change` preflight is adapted to these paths.
- Work in a worktree that the orchestrator creates from the `TA-coordinator`
  branch (base `ef967dc` or a later commit the human approves). Check the base
  with `git log -1`.
- To save context, read only the spec sections the task cites, plus the
  "Actors and trust boundaries" section and section C.

## Allowed files

- New files under `src/codeclinic/server/tickets/`.
- New page components and CSS under `src/codeclinic/src/`.
- New tests under `src/codeclinic/test/`.
- Small edits only:
  - `server/index.js`: mount the router and add the SPA paths.
  - `src/index.tsx`: add the routes.
  - `src/AppHeader.tsx`: add the TA **Queue** link.
  - `src/TADashboard.tsx`: add the queue link.
  - `src/NotificationsRoute.tsx`: pass the TA `ticketHref`.
- `docs/UserGuide.md`, `docs/DeveloperGuide.md`, and this task's evidence
  files.
- T09 only: the new file `src/codeclinic/firestore.indexes.json` and its new
  test under `src/codeclinic/test/`.

Not allowed:

- New dependencies.
- Changes to `server/notifications/`, `server/account/`, `server/auth/`, or
  `server/ai/`; use them, don't edit them.
- CI or deployment changes, Firestore rules, `firebase.json`, or any index
  file other than T09's `firestore.indexes.json`.

## Trusted and untrusted inputs; authorization

- **Trusted:**
  - The session, and the role and status reloaded from `users` on each
    request (`requireActiveActor`).
  - The ticket's `status`, `claimedByTaId`, and `studentId`, read inside the
    transaction.
- **Untrusted:**
  - All request bodies, path IDs, and query values.
  - All ticket and reply content, including text that looks like
    instructions.
- **Server-decided:** `claimedByTaId`, `authorUserId`, `status`, and all
  timestamps. If a client sends any of them, the server returns `400`.
- **Never in responses:** emails, password material, `studentId`, or other
  TAs' IDs.
- No browser access to Firestore. The server never fetches `repoUrl`.

## Permissions and tools

- **Allowed:**
  - `npm ci` with the locked dependencies, using a writable temporary cache.
  - `npm test` (with `CI=true` so it does not run in watch mode) and
    `npm run build`.
  - The local Firestore emulator for T05
    (`RUN_FIRESTORE_EMULATOR_TESTS=1`).
- **Not allowed:** other network access, real or production credentials,
  push, deploy, merge, or messages.

## Selected skills

The skill files are under `.agents/skills/`; read `SKILL.md` from disk.

- `openspec-apply-change` for the preflight, adapted to `workflow/` paths
  (do not create an `openspec/changes` tree).
- `firebase-firestore` for the transaction and query patterns (T01, T05).
- `seedu-git-standard` for commit messages, with no AI attribution.

## Test matrix

This is the spec's verification matrix, mapped to the tasks:

| Layer | Tasks |
| --- | --- |
| Unit | T01 |
| API | T02–T04 |
| Emulator integration | T05 |
| UI | T06–T07 |

Every acceptance scenario 1–12 is cited by at least one task.

## Shared-file collisions (for grouping)

- `server/tickets/ta-routes.js` is created in T02 and extended in T03 and
  T04. Either run these one after another, or put T03 and T04 in separate
  handler modules that T02's router mounts.
- `src/index.tsx`, `server/index.js`, and `AppHeader.tsx` are edited by both
  T06 and T07.
- T05, T06, and T07 depend on the T01 store interface, and T06 and T07 also
  depend on the T02 response shapes.

## Known risks

- Section C is not yet confirmed by the Student owner. A change there would
  reopen T01 and could affect T02–T07.
- Until `student-tickets` ships, the running app cannot create a ticket.
  Manual checks need tickets seeded in the emulator.
- Filtered production queries will fail until `environments-and-deployment`
  references `firestore.indexes.json` in `firebase.json`, deploys it (for
  example with `--only firestore:rules,firestore:indexes`), and grants the
  deploy service account index permissions. This is a cross-feature request,
  and T09 does not cover it.

## Approval state

Specification v0.1 is human-approved (2026-11-09). Checklist v0.1 and this
handoff v0.1 are human-approved (2026-11-09). Grouping, dispatch, review, commit, and
merge are separate decisions.

## Amendments
- 2026-11-09: The human approved checklist v0.1 and handoff v0.1 ("approved the checklist and handoff").
- 2026-11-09: The human approved the Q4 amendment proposal: this task adds `src/codeclinic/firestore.indexes.json` (composite indexes for R1's queries) and a coverage test as new task T09 in Group 6. Referencing the file in `firebase.json`, deploying it, and the deploy permission belong to `environments-and-deployment` and are recorded there as a cross-feature request, not edited by this task.
