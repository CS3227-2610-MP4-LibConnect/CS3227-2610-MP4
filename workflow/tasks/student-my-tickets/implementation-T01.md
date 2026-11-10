# Implementation report: T01 — Owner-scoped paginated list API

Status: **complete** for assigned T01 scope. Independent review remains pending.

## Contract and coverage

Implemented against `workflow/specs/student-my-tickets.md` v0.1 and checklist v0.1. The `GET /api/tickets` route defaults to Open, validates view/cursor inputs before storage, rechecks the cookie session and current active Student record, derives the owner from that record, denies TAs/inactive/password-change accounts, returns no-store safe summaries, and maps storage failures to a generic 503.

The Firestore store reads at most 21 documents using the authenticated owner, selected two-status group, descending `updatedAt`, and ascending `ticketId`. It returns at most 20 summaries and sets the next cursor at the twentieth result, preserving tied-time boundaries. The cursor is bounded, structurally validated, canonical base64url, versioned, and bound to its view. The Standard edition composite index matches the query fields and order.

Evidence covers both views and all four statuses; 20-item page truncation and next-boundary selection; owner equality and no full-collection read; cursor continuation and cross-view rejection before storage; forged owner parameter isolation; visitor, TA, inactive, and password-change denial; safe storage failure; no-store responses; exact index fields. A human-approved correction added a synthetic two-Student route test with distinct seeded tickets and reciprocal forged `studentId` parameters; each authenticated Student receives only their own ticket and the store is called with the server-derived owner.

## Changed files

- `src/codeclinic/server/tickets/route.js`
- `src/codeclinic/server/tickets/store.js`
- `src/codeclinic/server/tickets/validation.js`
- `src/codeclinic/server/tickets/list-cursor.js`
- `src/codeclinic/firestore.indexes.json`
- `src/codeclinic/test/student-my-tickets.contract.test.js`

## Verification

`npm test -- --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js` — **pass**, 2 suites and 28 tests. Exact captured output: [implementation-T01.md](../../../logs/tasks/student-my-tickets/implementation-T01.md).

The initial focused run failed because the test fixture used a synthetic session token shorter than the authenticator's minimum length. The fixture was corrected; the final run passed. Jest emitted the existing Node `punycode` deprecation warning.

## Human-approved review correction

The independent review requested a distinct two-Student isolation scenario. With human approval recorded in `approval-batch-1-correction.md`, added only a synthetic route test to the assigned test file; no production code changed. Each test account has its own valid session and one seeded synthetic ticket. Requests forge the other student's owner parameter; responses contain only the session owner's ticket, and assertions confirm the server passes each authenticated ID to the store.

Correction verification: `npm test -- --watchAll=false --runInBand --runTestsByPath test/student-my-tickets.contract.test.js test/student-ticket-activity.contract.test.js` — **pass**, 2 suites and 29 tests. The exact appended command output is in the linked execution log. The earlier run history, including the original fixture failure and 28-test pass, remains intact there.

## Preflight deviation and risks

The OpenSpec CLI resolved this repository root but reported no registered specs and no `student-my-tickets` change. Per the orchestrator's direction, the canonical adapter inputs (`workflow/specs/`, `workflow/tasks/`, approvals, and validated assignment manifest) were used as the apply context; no second OpenSpec tree or checklist edits were made. The batch manifest plan validation passed.

The index definition is local only; live Firestore and index deployment were not accessed or run. Production list queries depend on a separately approved deployment. No requirement or data-model deviation was made. Runtime token metrics: unavailable.
