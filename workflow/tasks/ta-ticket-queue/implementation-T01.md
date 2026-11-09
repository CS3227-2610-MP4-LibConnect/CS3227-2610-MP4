# Implementation report: ta-ticket-queue T01 (ticket store and state machine)

Spec v0.1, checklist v0.1, handoff v0.1 (human-approved 2026-11-09). Branch `ta-ticket-queue-t01`, base `e3c03bc`.

## Changed files
- `src/codeclinic/server/tickets/constants.js` (new)
- `src/codeclinic/server/tickets/transitions.js` (new)
- `src/codeclinic/server/tickets/store.js` (new): in-memory store, Firestore store, cursor codec
- `logs/tasks/ta-ticket-queue/05-implementer-T01.md`

## Behaviour
- `evaluateTransition` implements the C2 table; unknown events, statuses, actors, and terminal states are refused.
- Both stores expose `listTickets`, `getTicket`, `claimTicket`, `unclaimTicket`, `resolveTicket`, `addReply` per the approved assumed interfaces. Success results are `{ ok: true, ticket }` (and `reply` for `addReply`); failures are `{ ok: false, reason: 'NOT_FOUND'|'CONFLICT' }`.
- List: ACTIVE default, status/language/concept filters, `createdAt` ascending with ticketId tie-break, 20 per page (fetches 21 to decide `nextCursor`), `INVALID_CURSOR` error on a bad cursor.
- Firestore store: every transition runs in `db.runTransaction`, re-reads the document, applies `evaluateTransition`, and writes `FieldValue.serverTimestamp()` for `updatedAt`, `resolvedAt`, and reply `createdAt`. Reply plus ticket `updatedAt` are written in one transaction.

## Verification
- `ta-tickets.transitions` + `ta-tickets.store`: 2 suites, 103 tests passed.
- Full suite: 40 suites passed, 4 skipped, 3 failed (782 tests passed, 4 skipped). The failures are `ta-tickets.api.test.js`, `TAQueuePage.test.tsx`, `TATicketPage.test.tsx` (modules from T02-T07 not yet present).
- Emulator tests not run (T05).

## Deviations and assumptions
- Jest's jsdom environment lacks `structuredClone`, so the in-memory store uses a small local deep-clone that preserves `Date`.
- Firestore store is untested here. Its list query orders by `createdAt` then `__name__` and uses `startAfter(Timestamp, id)`; it may need a composite index in production (Q4, out of scope). `firebase-admin/firestore` is required lazily (already a dependency).
- Invalid ticket IDs (empty, containing `/`, over 128 chars) are `NOT_FOUND` / `null` in the Firestore store.
- Skill files under `.claude/skills/` are absent from this worktree (untracked in the main checkout); Firestore transaction patterns followed from existing `server/account/store.js`.

## Unresolved risks
- Firestore store semantics are verified only by T05 on the emulator.
- `listTickets` with `status` filters and `in` plus `array-contains` combined in Firestore may need index/operator checks (`in` with `array-contains` is allowed).
