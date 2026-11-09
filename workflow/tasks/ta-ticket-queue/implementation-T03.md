# Implementation report: T03 Claim, unclaim, and resolve API

Spec: `workflow/specs/ta-ticket-queue.md` v0.1 (R3, R4, R6, R7). Checklist v0.1, handoff v0.1. Branch `ta-ticket-queue-t03`, base `47fd82e`.

## Changed files
- `src/codeclinic/server/tickets/ta-claims.js` (new): `createClaimRoutes(shared)` with `POST /:ticketId/claim|unclaim|resolve`. Each uses `requireCsrf`; claim and unclaim accept an absent or empty body, resolve accepts exactly `{ fixNote }` (trimmed, 1-2000). The state change is only the store's `claimTicket`/`unclaimTicket`/`resolveTicket`; NOT_FOUND maps to 404, CONFLICT to 409. After success, claim and resolve call `notify` with the R7 templates, awaited in try/catch. Returns the R2 view.
- `src/codeclinic/server/tickets/ta-routes.js`: one require and one mount line above `void shared;`.

## Verification
- `ta-tickets.api`: 134 pass, 27 fail. Remaining failures: reply (T04) cases, the DETAIL_KEYS test defect, "storage failure ... every endpoint" and "after resolving ... reply all return 409" (both include the replies endpoint).
- Full suite: 916 pass, 27 fail, 4 skipped; failing suites are `ta-tickets.api`, `TAQueuePage`, `TATicketPage`.

## Deviations and risks
- `ta-routes.js` has a private `toDetailView` that is not shared and sets `claimedByMe` only while CLAIMED, but the resolve test expects `claimedByMe: true` on a RESOLVED ticket. So `ta-claims.js` has its own R2 view builder with `claimedByMe` = actor is the claimer. Risk: a later GET of a resolved ticket by its resolver returns `claimedByMe: false` from T02's view; the two views should be unified by the orchestrator.
- 400 body validation runs before the 404/409 checks.

## T03-fix: one shared R2 view
- New `server/tickets/ta-views.js` holds the single detail-view builder (moved from `ta-routes.js`); `ta-routes.js` and `ta-claims.js` both use it, and the duplicate in `ta-claims.js` is deleted.
- `claimedByMe` is now true whenever `claimedByTaId` is a string equal to the viewer, so GET of a resolved ticket by its resolver matches the resolve response.
- List view left unchanged: R1 does not contradict it.
- Tests: `ta-tickets` 264 pass; full suite 955 pass, 1 fail (T06 route wiring test, expected), 4 skipped; TATicketPage suite fails to load (expected).
- Suggested regression test (not added): GET of a RESOLVED ticket by its resolver returns `claimedByMe: true`.

## Review fixes (L1, L2, L3, F1)
- L1 (`ta-claims.js`): when no body was parsed (`req.body` undefined) but `Content-Length` is above 0 or `Transfer-Encoding` is set (text/plain, form), claim and unclaim return 400. No body and `{}` still succeed. Resolve and replies already return 400 for an unparsed body (they require an object with the exact key), so no change there; tests cover both.
- L2 (`store.js`): `transition()` now returns the ticket (and reply) built from the in-transaction read plus the written changes. Server timestamps are reported as the store clock time at commit (`deps.now`, default `Date.now`). For claim/unclaim/resolve a best-effort `getTicket` then supplies the real reply thread; if it throws, the in-transaction data (empty reply list) is used, so a committed write is never a 503 and `notify` still runs. `addReply` no longer re-reads.
- L3 (`store.js`): `decodeCursor` rejects `createdAtMs` outside the Firestore Timestamp range and ticket IDs not matching `^[A-Za-z0-9_-]{1,128}$`; both stores then give 400 via `INVALID_CURSOR`.
- F1 (`ta-views.js`, `ta-routes.js`): shared `isClaimedByViewer`; list `claimedByMe` follows it (including RESOLVED); `claimed` stays true only while CLAIMED.
- Tests: new `ta-tickets.review-fixes.test.js`. Full suite 1025 pass, 4 skipped, 0 fail; emulator suite passes (port 8080 free afterwards); `npm run build` succeeds.
- Not done: L4 (optional tidy-up) left as is.
