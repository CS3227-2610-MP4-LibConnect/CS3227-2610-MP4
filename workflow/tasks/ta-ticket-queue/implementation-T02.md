# Implementation report: T02 Queue list and detail API

Spec: `workflow/specs/ta-ticket-queue.md` v0.1 (R1, R2). Checklist v0.1, handoff v0.1. Branch `ta-ticket-queue-t02`, base `2299906`.

## Changed files
- `src/codeclinic/server/tickets/ta-routes.js` (new): `createTaTicketsRouter({ authStore, accountStore, ticketStore, notify })`. Guards: `requireActiveActor` then a TA check (403). `GET /` (R1) and `GET /:ticketId` (R2) with explicit allow-lists, ISO timestamps, names and roles from `accountStore.getAccount`. Bad filter or cursor returns 400, a missing or malformed ID 404, any storage error 503 with a generic message.
- `src/codeclinic/server/index.js`: mounts the router at `/api/ta/tickets` with the Firestore ticket store (built lazily, see deviations) and the shared `notify`.
- Extension point for T03/T04: a marked spot in `ta-routes.js` before `/:ticketId`, with a frozen `shared` object (`requireCsrf`, `ticketStore`, `accountStore`, `notify`, `safe`, `messages`). Each later task adds one mount line there and removes the `void shared;` placeholder.

## Verification
- `ta-tickets.api`: 59 pass, 102 fail. All failures are POST-endpoint tests (claim, unclaim, resolve, replies, body keys, CSRF, injection, T03/T04), plus 2 in the access-control block that include POST endpoints (coordinator unclaim; storage failure on every endpoint), plus 1 test defect below.
- Test defect (not edited): "returns the allow-listed view with names, roles..." compares `Object.keys(body).sort()` with `DETAIL_KEYS`, which lists `replies` after `repoUrl`; sorted order puts `replies` before `repoFilePaths`, so it cannot pass for any implementation. The response keys otherwise match R2 exactly. Needs a human-approved fix of the constant.
- Full suite: 841 pass, 102 fail, 4 skipped; failing suites are `ta-tickets.api`, `TAQueuePage`, `TATicketPage` (UI suites fail to load, expected).

## Deviations and risks
- `createFirestoreTicketStore` requires `firebase-admin/firestore` at construction, which Jest cannot resolve; an eager call broke 6 existing server suites. `index.js` wraps it in a lazy store instead. T01 is unchanged.
- Unknown query keys are ignored; an over-30-character `concept` returns 400 (not specified by the spec).
- Replies from a user with no record show `authorName` "Unknown user".
