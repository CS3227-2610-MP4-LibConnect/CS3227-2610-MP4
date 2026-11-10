# Implementation T09: Firestore composite indexes

Spec: `workflow/specs/ta-ticket-queue.md` Q4 (amended 2026-11-09), R1.

Changed files:
- `src/codeclinic/firestore.indexes.json` (new): four `tickets` composite indexes, COLLECTION scope, `fieldOverrides: []`. Field order: equality fields (`status`, then `language`), then `conceptTags` `arrayConfig: CONTAINS`, then `createdAt` ASCENDING. `__name__` is implicit.
- `src/codeclinic/test/ta-tickets.indexes.test.js` (new): runs `createFirestoreTicketStore(...).listTickets` against a fake db that records `.where/.orderBy` for every status x language x concept combination, derives the required index fields, and checks exactly one index matches. A final test checks no index is unused.

Verification: new test passes; full suite 48 suites passed, 1048 tests passed, 4 skipped suites.

Risks: the emulator does not enforce indexes, so this is a static check only. `firebase.json` reference, deployment, and deploy permission remain with `environments-and-deployment`; filtered production queries stay at risk until then.

T9-1 fix: the coverage test now also asserts the final orderBy is `__name__` ascending.
