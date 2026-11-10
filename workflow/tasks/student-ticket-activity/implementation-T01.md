# Implementation report: T01 — Indexed active-ticket read

Specification: `workflow/specs/student-ticket-activity.md` v0.2  
Checklist: `workflow/tasks/student-ticket-activity/tasks.md` v0.1  
Item result: **Complete; ready for independent review**

Implemented the authenticated `GET /api/tickets/active` endpoint and Firestore
query. The account and role are rechecked from the current stored account; the
owner ID comes from the verified session. The query filters active statuses in
Firestore, orders by `updatedAt` descending and `ticketId` ascending, and limits
to five before reading. The store returns only safe summary fields. Added the
Standard edition composite index and connected it from `firebase.json`.

Changed for T01:

- `src/codeclinic/server/tickets/store.js`
- `src/codeclinic/server/tickets/route.js`
- `src/codeclinic/firebase.json`
- `src/codeclinic/firestore.indexes.json`
- `src/codeclinic/test/student-ticket-activity.contract.test.js`
- `src/codeclinic/test/student-tickets.storage.test.js`

Acceptance criteria R1 storage/API portions: **met**. T01 query, access,
projection, index configuration, and safe error cases have focused evidence in
the linked log. The UI portion of R1 belongs to T04 and is not part of this
item.

Deviation: the required OpenSpec CLI preflight could not resolve a CLI change:
`openspec list --json` returned an existing project root and no changes;
`status` and `instructions apply` returned `change_error` for this task ID. Per
the orchestrator's resolution, implementation proceeded against the approved
canonical `workflow/specs/` and `workflow/tasks/` artifacts. No second OpenSpec
change/spec tree was created.

Unresolved risks: no Firestore emulator query was run in this item; the
composite index definition and deterministic query chain were verified by
focused synthetic tests and JSON parsing. Live index deployment remains a
separate approval gate. An initial broad name-filtered test run also selected
two unrelated preimplementation dashboard UI tests (T04); they failed because
the dashboard UI is not yet implemented. The narrowed T01 run passed.

Factual commands and exact results: `logs/tasks/student-ticket-activity/implementation-T01.md`.
