# Test coverage report: ta-ticket-queue (T01-T07)

Spec v0.1, checklist v0.1, handoff v0.1 (all human-approved 2026-11-09). Log: `logs/tasks/ta-ticket-queue/02-test-writer.md`.
State: red. Tests fail only because production modules do not exist yet. Not human-approved.

## File map (all under `src/codeclinic/test/`)

| File | Task | Covers |
| --- | --- | --- |
| `ta-tickets.transitions.test.js` | T01 | C1 constants (statuses, Q1 languages, tag rules, caps); C2 full from-state x event x actor table; terminal states |
| `ta-tickets.store.test.js` | T01 | cursor encode/decode and bad-input rejection; list (ACTIVE, status, language, concept, 20/page, oldest first, ties); get with <=200 replies; claim/unclaim/resolve/addReply success and CONFLICT/NOT_FOUND, server `updatedAt`, concurrent claim |
| `ta-tickets.api.test.js` | T02, T03, T04 | R1-R7 through the router; 401/403/404/409/400/503; allow-lists; forbidden keys; CSRF; notify templates and failure; injection |
| `ta-ticket-queue-emulator.integration.test.js` | T05 | claim race, filter queries, claim/reply/resolve notification documents (gated by `RUN_FIRESTORE_EMULATOR_TESTS=1`) |
| `TAQueuePage.test.tsx` | T06 | R8 queue page, nav/route/SPA wiring |
| `TATicketPage.test.tsx` | T07 | R8 detail page, `ticketHref` wiring |
| `helpers/ta-tickets-harness.js` | all | fixtures: in-memory users/sessions, fake notify, failure injection (not a test file) |

## Scenario coverage

| Scenario | Where |
| --- | --- |
| 1 default ACTIVE, oldest first, filters, 20/page | api (R1 describe), store list tests, emulator filters, TAQueuePage |
| 2 student 403, signed-out 401, INACTIVE TA 401 | api "access control on every endpoint" (all 6 endpoints) |
| 3 concurrent claim, one winner | store, api, emulator |
| 4 TA B cannot unclaim/resolve | transitions, store, api (unclaim, resolve) |
| 5 reply on RESOLVED/CLOSED is 409 | transitions, store, api (replies) |
| 6 resolve needs claim and 1-2000 note; later actions 409 | transitions, store, api (resolve), TATicketPage resolve form |
| 7 forbidden body keys 400, no write | api "forbidden body keys" (every endpoint, every key) |
| 8 one notification per action; failing notify harmless | api (claim, reply, resolve), emulator |
| 9 HTML/script/javascript: literal, never a script link | TAQueuePage, TATicketPage (incl. `repoUrl` rule) |
| 10 no email, studentId, other TA ID | api (allow-lists, leak scan) |
| 11 POST without CSRF is 403 | api "CSRF on every POST" |
| 12 injection text has no effect | api "injection-style ticket text" |

Verification matrix: Unit = transitions + store; API = api file; Emulator = emulator file; UI = both TSX files (320px by CSS source assertions, as existing tests do).

## Assumed interfaces (need human/implementer approval)

Server (all paths under `src/codeclinic/server/tickets/`):
- `constants.js`: `STATUSES`, `LANGUAGES` (frozen arrays), `PAGE_SIZE=20`, `MAX_REPLIES=200`, `MAX_REPLY_LENGTH=4000`, `MAX_FIX_NOTE_LENGTH=2000`, `MAX_CONCEPT_TAGS=5`, `MAX_TAG_LENGTH=30`, `isValidConceptTags(tags): boolean`.
- `transitions.js`: `evaluateTransition({ event, status, claimedByTaId, actor: { userId, accountType }, studentId }) -> { allowed: true, to } | { allowed: false }`. Events: `claim`, `unclaim`, `resolve`, `close`, `reply` (reply keeps the status). The `close` event is included because C2 lists it.
- `store.js`: `createInMemoryTicketStore({ now: () => ms, newId: () => string })`; `encodeCursor({ createdAt, ticketId })`; `decodeCursor(str) -> { createdAtMs, ticketId } | null`. Store methods (async): `listTickets({ status, language, concept, cursor }) -> { tickets, nextCursor }` (rejects with `code: 'INVALID_CURSOR'`); `getTicket(id) -> raw ticket + replies | null`; `claimTicket(id, actorId)`, `unclaimTicket(id, actorId)`, `resolveTicket(id, actorId, fixNote)`, `addReply(id, { authorUserId, message }) -> { ok: true, ticket|reply } | { ok: false, reason: 'NOT_FOUND'|'CONFLICT' }`. In-memory only: `seedTicket(ticket)`, `seedReply(ticketId, reply)`. The Firestore store (`createFirestoreTicketStore(db)`) has the same methods; the emulator test seeds raw `tickets/{id}` documents instead.
- Stored ticket `files` is `[{ name, content }]`; stored `createdAt` etc. may be `Date` or Timestamp.
- `ta-routes.js`: `createTaTicketsRouter({ authStore, accountStore, ticketStore, notify })`, mounted at `/api/ta/tickets`; it builds its guards with `createAccountGuards({ authStore, accountStore })` and reads names and roles via `accountStore.getAccount(userId) -> { name, accountType, ... }`. The router must pass `notify` an object with exactly `recipientUserId`, `notificationType`, `ticketId`, `message`.
- `createServerApp(db)` mounts the router (emulator test only).
- Response shapes: list item and detail keys are the exact R1/R2 lists; reply view keys are `replyId, message, createdAt, authorName, authorRole, isMine`; timestamps are ISO strings; list response is `{ tickets, nextCursor }`; the 201 reply response is the bare reply view; claim, unclaim, and resolve return the R2 view.

UI:
- `src/TAQueuePage.tsx` (default export, no props, `.css` file `src/TAQueuePage.css`) and `src/TATicketPage.tsx` (default export, prop `ticketId`, `src/TATicketPage.css`). They fetch `/api/ta/tickets...` directly and fetch the CSRF token from `/api/auth/csrf`, sending `X-CSRF-Token` on POSTs.
- Accessible names: filters labelled Status, Language, Concept; button "Load more"; badges "Claimed by you" / "Claimed"; Retry button; loading `role="status"`; error `role="alert"`; empty text contains "no tickets"; rows link to `/ta/tickets/<id>`. Detail: buttons "Claim", "Unclaim", "Send reply" (textarea label starts "Reply"), "Resolve..." (textarea label contains "Fix note", count text like `6 / 2000`), then a "Confirm..." button.
- `AppHeader` adds a TA-only "Queue" link to `/ta/queue`; `TADashboard` links to `/ta/queue`. `index.tsx` and `server/index.js` contain the two SPA paths (checked by source regexes, as existing tests do for CSS).
- CSS checks (320px): token use `var(--lc-color-`, a `max-width` media query, `overflow-wrap: anywhere`, no large `min-width`, and for the ticket page a `pre` rule with `overflow-x:auto` or `pre-wrap`.

## Assumptions and ambiguities (reported, not decided by the spec)

1. Status code and body for an invalid `:ticketId` format (e.g. path traversal) are unspecified; the test accepts 400 or 404.
2. Whether a duplicated query parameter, `status=` (empty), or lowercase `status=open` is `400`: assumed `400` (typed validation). The spec only says "bad filter".
3. The detail `files` element shape is not defined by the spec (Overview says name and content); `{ name, content }` assumed.
4. R2 does not say whether the detail view includes `claimed`; the exact-key test excludes it.
5. A `notify` that rejects/throws is tested as non-fatal even though `notify` never throws by contract; remove if the implementer prefers to rely on the contract.
6. Spec does not say which order the 403 student check and 404 apply for POSTs; tests only cover student on an existing ticket and TA on a missing ticket.
7. Concept filter length or pattern validation (e.g. over 30 characters) is not specified and is not tested.
8. Whether `claim` with `{}` and with no body both succeed: both assumed `200`.
9. The 409-on-reply UI refresh and the "confirm" button disabled-state behaviour are inferred from R8; the spec does not mandate the exact wording of those controls.
10. Production Firestore indexes are out of scope (Q4); the emulator test needs none.

## Amendments
- 2026-11-09: With the human's approval, `DETAIL_KEYS` in `test/ta-tickets.api.test.js` was reordered into sorted order (`replies` before `repoFilePaths`). The test compares it with sorted response keys, so the old order could never pass. The key set and the assertions are unchanged. Found by implementer T02 and confirmed by the orchestrator.
