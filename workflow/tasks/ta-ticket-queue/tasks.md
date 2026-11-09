# Implementation checklist: ta-ticket-queue

Version: 0.1 (2026-11-09)
Task ID: `ta-ticket-queue`
Specification: `workflow/specs/ta-ticket-queue.md`, version 0.1 (the human approved it on 2026-11-09)
Checklist approval evidence: the human replied "approved the checklist and handoff" to checklist v0.1 and handoff v0.1 on 2026-11-09; recorded from the human's message; no agent-set approval state.

The tasks are grouped below. The human approved this grouping on 2026-11-09
(5 groups, revised from the task grouper's 6-group proposal in
`grouping-proposal.md`). Checkboxes track implementation only. The orchestrator
marks a task `[x]` only after independent review. All paths are under
`src/codeclinic/`.

Until `student-tickets` exists, the tests seed tickets and replies directly
through the store module from T01. No task adds a ticket-creation endpoint.

## Group 1: Store and state machine — T01

- [x] **T01: Ticket store and state machine.** Add `server/tickets/`:
  - `constants.js`: the Q1 language list, the tag rules, and the four
    statuses.
  - `transitions.js`: a pure guard that decides whether an event is allowed,
    from the current status, the claimer, and the actor. It covers every
    from-state and event pair in C2.
  - `store.js`: a Firestore store and an in-memory store with the same
    interface. It has list (filters, cursor, 20 per page, oldest first),
    get-with-replies (up to 200), and transactional claim, unclaim, resolve,
    and add-reply. Every write sets `updatedAt` on the server.
  - Unit tests cover the full transition table, the cursor encoding and its
    rejection of bad input, and the store behaviour on the in-memory store.
  - (Spec C1, C2; scenarios 3, 4, 5, 6.)

## Group 2: Queue list and detail API — T02

- [x] **T02: Queue list and detail API.** Add `server/tickets/ta-routes.js`
  with `GET /api/ta/tickets` (R1) and `GET /api/ta/tickets/:ticketId` (R2),
  using the existing `requireActiveActor` guard and a TA-only check. Mount it
  in `server/index.js`.
  - The responses use an explicit field allow-list. Names and `authorRole`
    come from the `users` records. No email addresses, `studentId`, or other
    TAs' IDs are returned.
  - API tests cover the default `ACTIVE` filter, each filter, pagination,
    `400` for bad filters and cursors, `401`, `403` for students, `401` for
    inactive TAs, `404`, `503`, and the allow-list.
  - (Spec R1, R2; scenarios 1, 2, 10.)

## Group 3: Write API and queue page (parallel) — T03, T04, T06

Collision handling: T04 puts its reply handler in its own module (e.g. `server/tickets/ta-replies.js`) mounted by T02's router, so it does not edit the claim/resolve handlers T03 adds to `ta-routes.js`. T06 and T07 are in different groups because both edit `src/index.tsx`, `server/index.js`, and `src/AppHeader.tsx`.

- [x] **T03: Claim, unclaim, and resolve API.** Add the three R3, R4, and R6
  `POST` endpoints, each with `requireCsrf`. The bodies are strictly
  validated: empty for claim and unclaim; for resolve, `{ fixNote }` of
  1–2000 characters after trimming. Any other key returns `400`.
  - After a successful commit, claim and resolve each call `notify` (R7)
    with the fixed templates.
  - API tests cover each success path, each `409` case, forbidden body keys,
    CSRF rejection, one notification per action, a failing `notify` that does
    not fail the action, and injection-style ticket text that has no effect.
  - (Spec R3, R4, R6, R7; scenarios 4, 6, 7, 8, 11, 12.)

- [x] **T04: Reply API.** Add `POST /api/ta/tickets/:ticketId/replies` (R5)
  with `requireCsrf` and a strict `{ message }` body of 1–4000 characters
  after trimming.
  - The server sets `replyId`, `authorUserId`, and `createdAt`. It calls
    `notify` with `TICKET_REPLY` after the reply is committed.
  - API tests cover success (`201`), `409` on `RESOLVED` and `CLOSED`
    tickets, forbidden keys, CSRF, and one notification per reply.
  - (Spec R5, R7; scenarios 5, 7, 8, 11.)

- [x] **T06: Queue page.** Add the `/ta/queue` page (R8). It has status,
  language, and concept filters, **Load more**, the claimed badges, and
  empty, loading, and error-with-retry states.
  - Add the route to `src/index.tsx` behind the TA route guard, the SPA path
    to `server/index.js`, a **Queue** link in `AppHeader.tsx` (TA only), and a
    link from `TADashboard.tsx`.
  - Use `theme.css` tokens. Component tests cover the filters, pagination,
    each state, plain-text titles, and the 320-pixel layout.
  - (Spec R8; scenarios 1, 9.)

## Group 4: Emulator tests and ticket page (parallel) — T05, T07

- [x] **T05: Emulator integration tests.** Add
  `test/ta-ticket-queue-emulator.integration.test.js`. Like the existing
  emulator tests, it runs only when `RUN_FIRESTORE_EMULATOR_TESTS=1`.
  - It covers the concurrent-claim race (exactly one winner), the
    status/language/concept filter queries, and the notification documents
    written for claim, reply, and resolve.
  - (Spec C2, R1, R7; scenarios 1, 3, 8.)

- [x] **T07: Ticket detail page.** Add the `/ta/tickets/:ticketId` page (R8):
  - It shows the ticket fields, the code files in `<pre>` as plain text, and
    the reply thread.
  - It has **Claim** and **Unclaim**, the reply form, and the resolve form
    with a character count and a confirm step. The buttons shown depend on
    the ticket's state.
  - On a `409`, it refreshes the ticket and shows the stale-ticket message.
  - `repoUrl` is a link only if it matches the GitHub pattern, with
    `rel="noopener noreferrer"`.
  - Add the route and the SPA path. For TAs, pass
    `ticketHref = id => /ta/tickets/<id>` to the inbox in
    `NotificationsRoute.tsx`.
  - Component tests cover button visibility for each status, plain text for
    HTML or script content, `javascript:` and non-GitHub `repoUrl` values,
    the `409` refresh, and the 320-pixel layout.
  - (Spec R7, R8; scenarios 6, 9.)

## Group 5: Guides and evidence — T08

- [x] **T08: Guides and evidence.** Update `docs/UserGuide.md` (the TA queue
  and ticket pages) and `docs/DeveloperGuide.md` (the `server/tickets/`
  module, the shared ticket contract, and the endpoints).
  - Run the full suite, the emulator suite, and the build.
  - Write `implementation-report.md` with the Subagent token usage table, and
    the logs under `logs/tasks/ta-ticket-queue/`.

## Group 6: Production query indexes — T09

- [ ] **T09: Firestore composite indexes.** Add
  `src/codeclinic/firestore.indexes.json` with the composite indexes on
  `tickets` that the Q4 resolution lists (each ending with `createdAt`
  ascending; `conceptTags` uses `arrayConfig: CONTAINS`).
  - Add a unit test that parses the file and checks that every filter
    combination `server/tickets/store.js` can build (status alone, or with
    language and/or concept) has a matching index.
  - Do not edit `firebase.json`, CI, or deployment configuration.
  - (Spec Q4 as amended; R1.)

## Approval boundary

Checklist v0.1 and handoff v0.1 are human-approved (2026-11-09). Grouping,
dispatch, review, commit, and merge are separate human decisions.

## Amendments

- 2026-11-09: Drafted at the human's direction after the human approved
  specification v0.1.
- 2026-11-09: The human approved checklist v0.1 and handoff v0.1 ("approved the checklist and handoff").
- 2026-11-09: Applied the human-approved 5-group grouping (revised from the task grouper's 6-group proposal); whole tasks moved without wording or checkbox changes.
- 2026-11-09: After the independent review (`review-report.md`, verdict "pass with follow-up"), the orchestrator marked T05, T06, T07, and T08 `[x]`. T01 (L2, L3), T02 (F1, list view), T03 (L1), and T04 (L4) stay `[ ]` because each has a Low finding awaiting the human's decision.
- 2026-11-09: After the re-review (`review-report.md`, "Re-review" section), L1, L2, L3, and F1 are resolved, so T01, T02, and T03 are marked `[x]`. T04 stays `[ ]` (L4 left open by the human, not yet accepted as residual risk). **T06 is reopened from `[x]` to `[ ]`**: new Low finding N1 (`src/TAQueuePage.tsx:127` shows the "Claimed by you" badge on RESOLVED tickets since the F1 change).
- 2026-11-09: After the final re-check (`review-report.md`, "Final re-check": pass, no findings), N1 (`8727ef6`) and L4 (`d1b9165`) are resolved, so T04 and T06 are marked `[x]`. All eight tasks are complete.
- 2026-11-09: The human approved the Q4 amendment proposal: this task adds `src/codeclinic/firestore.indexes.json` (composite indexes for R1's queries) and a coverage test as new task T09 in Group 6. Referencing the file in `firebase.json`, deploying it, and the deploy permission belong to `environments-and-deployment` and are recorded there as a cross-feature request, not edited by this task.
