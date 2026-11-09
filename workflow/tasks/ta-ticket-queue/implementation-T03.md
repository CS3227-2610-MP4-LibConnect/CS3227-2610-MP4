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
