# Student My Tickets specification

Version: 0.1 (2026-11-10; human approved in conversation)
Task ID: `student-my-tickets` (confirmed by the human on 2026-11-10)
Approval evidence: the human replied "approved" to specification v0.1, including the proposed 20-ticket page size, on 2026-11-10. This does not approve the checklist, handoff, implementation, index deployment, or merge.

## Purpose and scope

Replace the protected `/student/tickets` placeholder with a **My Tickets** page where an authenticated Student can browse every ticket they own and see each ticket's status. The initial view shows active tickets. A two-state toggle switches between active and terminal tickets. The page uses the dashboard ticket-card presentation; terminal cards have a subtly greyed surface while retaining readable text and visible focus. Add **My Tickets** to the Student navigation immediately to the right of **Create Ticket**. Preserve the dashboard link text **View all tickets** and its destination.

This task adds list reads and presentation only. It does not change ticket creation, detail, replies, edit/close actions, TA behavior, ticket data fields, state transitions, notifications, AI, or direct Firestore access from the browser. The previously approved `student-ticket-activity` v0.3 intentionally deferred this list; this new specification supersedes only that placeholder behavior once approved.

## Sources and decisions

- `Overview.md` asks for Students to view their tickets and statuses. `workflow/PLAN.md` includes ticket viewing under `student-tickets`.
- `workflow/specs/student-ticket-activity.md` v0.3 supplies the existing protected route, dashboard card, owner checks, active-status meaning, and safe list-query pattern. `workflow/specs/student-tickets.md` v0.4 supplies the four ticket statuses and shared data contract.
- The human confirmed `student-my-tickets` as the task ID and explicitly decided that the Closed view includes both `CLOSED` and TA-resolved `RESOLVED` tickets.
- For this read-only list, **Open** means `OPEN` and `CLAIMED`; **Closed** means `CLOSED` and `RESOLVED`. These are presentation groups, not new stored statuses.
- Use 20 summaries per page and a bounded, opaque cursor, following the TA queue's existing page size. The Student can load successive pages until every matching ticket is reachable.

## Actors, data, and trust boundaries

- Only an active `STUDENT` with a valid cookie-backed session may read their list. The server rechecks the stored account on each request and derives `studentId` from that verified session.
- A visitor, TA, inactive Student, or account requiring a password change cannot receive ticket data through the list API. No client-supplied student ID, role, ownership, status, or cursor may authorize a read.
- Ticket IDs, cursors, stored ticket text, and response bodies are untrusted. Render ticket content as plain text. Only trusted server code reads Firestore; the browser does not use a Firestore SDK for tickets.
- The list response contains only `ticketId`, `title`, `language`, `conceptTags`, `status`, and `updatedAt`. Do not return code, error output, reply text, owner IDs, account data, or raw Firestore documents.
- Do not log ticket content, credentials, session identifiers, or private user data. Use synthetic tickets in tests and evidence.

## Requirements

### R1. Protected My Tickets page and navigation

- Direct entry and refresh at `/student/tickets` MUST retain the existing server-verified Student route guard. A visitor goes to sign-in; a TA or otherwise ineligible account receives the existing safe denied outcome before any ticket content renders.
- The page MUST have the heading **My Tickets**. The authenticated Student header MUST show a **My Tickets** link immediately after **Create Ticket**, with `/student/tickets` as its destination and the current-page indicator on that route. The link MUST NOT appear in the TA header.
- The dashboard link to `/student/tickets` MUST remain labeled **View all tickets**. The existing dashboard card behavior and five-ticket limit remain unchanged.

### R2. Views, cards, and feedback

- The default selected view MUST be **Open**, showing `OPEN` and `CLAIMED` tickets. A keyboard-operable toggle MUST switch to **Closed**, showing `CLOSED` and `RESOLVED` tickets, and back. The selected state MUST be programmatically exposed and visually clear. Switching views MUST discard the other view's cursor and list results before loading the selected view.
- Every ticket in the selected view MUST be reachable through successive **Load more** actions. The page MUST show the current status on each card using human-readable labels: Open, Claimed, Closed, and Resolved. Cards MUST link to the existing `/student/tickets/:ticketId` detail route.
- Cards MUST use the same content order, layout, and visual treatment as the Student dashboard card: title, language and status, then concept tags or **No concept tags**. Shared rendering/styles SHOULD keep the two surfaces consistent. Closed-view cards MUST be slightly greyed compared with the regular card, without reducing text contrast, link affordance, or visible keyboard focus.
- Each view MUST distinguish initial loading, no matching tickets, request failure with retry, additional-page loading, and additional-page failure with retry. A failed request MUST NOT be presented as an empty list. Loading more MUST retain already shown cards; repeated clicks while pending MUST NOT duplicate a request. Switching views during a request MUST NOT display stale results from the previous view.
- The page MUST use the existing pale-blue/navy theme and remain readable without horizontal scrolling at 320 CSS pixels. Toggle, cards, retry, and Load more MUST support keyboard use and visible focus.

### R3. Owner-scoped, bounded list API

- `GET /api/tickets?view=open|closed&cursor=<opaque>` MUST serve the page. `view` defaults to `open` when omitted; unsupported, repeated, or malformed query values return `400`. `cursor` is optional and MUST be bounded, validated, and bound to the requested view; an invalid or mismatched cursor returns `400` before Firestore access.
- Every request MUST authenticate the cookie-backed session, recheck the current stored account as an active Student, and derive the owner ID on the server. Return `401` for no valid/current session, `403` for wrong role or required password change, and no tickets for an unauthorized actor. Do not accept a client-supplied owner ID.
- The server MUST query only the authenticated owner's documents, filter status to the selected view's two statuses, order by `updatedAt` descending with a stable ticket-ID tie-breaker, and read at most 21 matching documents to return at most 20 summaries plus an optional `nextCursor`. It MUST NOT fetch all owned tickets and filter or sort them in application memory. Each subsequent page MUST recheck identity and ownership and use the same query ordering.
- The response MUST be a typed object containing `tickets` and, only when another page exists, `nextCursor`. Each ticket MUST match the safe summary projection above. Every response, including errors, MUST carry `Cache-Control: no-store`. A Firestore failure returns a safe `503` without raw error details.
- Add the required Standard-edition Firestore composite index configuration to the existing `src/codeclinic/firestore.indexes.json`, with a test covering the exact owner/status/time/ID query shape. The existing `firebase.json` already references this file. Live index deployment is a separate external action and is not authorized by this specification.

## Acceptance scenarios

1. The Student header places My Tickets immediately after Create Ticket; the TA header does not show it. The dashboard still says View all tickets.
2. A Student with more than 20 active and more than 20 terminal tickets sees Open first, can load every active ticket, switch to Closed, and load every `CLOSED` and `RESOLVED` ticket. Each card displays its exact status and opens its detail page.
3. The card's title, metadata, tags, layout, and focus treatment match the dashboard; terminal cards are subtly greyed but remain readable and keyboard-accessible at 320 CSS pixels.
4. A visitor, TA, inactive Student, or another Student cannot obtain the owner's summaries via page or API. Supplying a forged owner ID does not change the server-derived owner.
5. Invalid view/cursor, cross-view cursor reuse, storage failure, malformed response, and network failure produce safe feedback with no ticket leak or false empty state; retry succeeds when service returns.
6. Slow page loads and rapid view switches never mix Open and Closed results or duplicate ticket cards.

## Verification matrix

| Layer | Required evidence |
| --- | --- |
| Store | Bounded owner/status query, deterministic order and cursor boundary, safe projection, index shape, no full collection read |
| API | Current-session/account/role checks, owner isolation, typed query validation, cross-view cursor rejection, no-store success/error responses, safe 503 |
| UI | Guarded direct visit, header position, preserved dashboard wording, default/toggle states, shared card, pagination, retry, stale-request handling, literal text |
| Integration | Synthetic Firestore emulator flow with two Students and all four statuses; relevant tests and production build |
| Accessibility | Keyboard toggle/cards/load-more/retry, selected-state announcement, visible focus, human 320 CSS-pixel rendered check for overflow and card contrast |

## Approval boundaries and open risks

- The human approved this specification. The checklist and handoff require separate approval; implementation batches and merge require later approvals under `workflow/README.md`.
- The 20-ticket page size and cursor strategy are approved implementation choices. Changes to the ticket data model or state machine are outside scope.
- The local emulator does not prove production indexes are deployed. Production use of the new query requires a separately approved index deployment.
- Browser image verification follows `AGENTS.md`: a human must perform the rendered 320-pixel check and report its result; screenshots are needed only if layout or contrast is in doubt.
