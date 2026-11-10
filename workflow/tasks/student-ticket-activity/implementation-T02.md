# Implementation report: T02 — Owned ticket detail and thread read

Specification: `workflow/specs/student-ticket-activity.md` v0.2  
Checklist: `workflow/tasks/student-ticket-activity/tasks.md` v0.1  
Item result: **Complete; ready for independent review**

Implemented `GET /api/tickets/:ticketId` with session and current-account
checks, Student-only access, no-store responses, and owner-scoped lookup. The
store checks ownership before reading replies and returns an explicit ticket
projection plus the full reply collection ordered by `createdAt` ascending and
`replyId` ascending. The route resolves current author names through the trusted
account repository, returns role labels when names are missing, and omits
internal author IDs. Added the Standard composite index for deterministic reply
ordering.

Changed for T02:

- `src/codeclinic/server/tickets/store.js`
- `src/codeclinic/server/tickets/route.js`
- `src/codeclinic/firestore.indexes.json`
- `src/codeclinic/test/student-ticket-activity.contract.test.js`
- `src/codeclinic/test/student-tickets.storage.test.js`

Acceptance criteria R2 API/storage read portions: **met**. Focused tests cover
owner isolation, visitor/TA denial, safe complete projection, trusted names and
fallback, literal text payloads, ordering fields, missing/inaccessible ticket,
and safe storage failure. UI behavior in R2 remains assigned to later items.

Unresolved risks: no Firestore emulator was run. The index definition and query
chain were checked through synthetic tests and JSON parsing. Live index
deployment remains a separate approval gate. There were no T02-specific
deviations.

Factual commands and exact results: `logs/tasks/student-ticket-activity/implementation-T02.md`.
