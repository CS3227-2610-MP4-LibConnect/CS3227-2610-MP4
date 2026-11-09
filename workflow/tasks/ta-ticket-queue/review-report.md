# Review report: ta-ticket-queue

Reviewer: independent reviewer agent (did not implement this work)
Date: 2026-11-09
Reviewed head: `bd51540` (integration branch `ta-ticket-queue`)
Review branch: `ta-ticket-queue-review` (from `bd51540`; review-only tests and reports)
Execution log: `logs/tasks/ta-ticket-queue/13-reviewer.md`
Security review: `workflow/tasks/ta-ticket-queue/security-review.md`

**Verdict: pass with follow-up.** No Critical, High, or Medium findings. Four
Low findings and one spec clarification (F1) are listed below. This report is
an assessment. It is not merge approval; the merge decision belongs to the
human.

## Inputs verified

| Artifact | Version | Approval evidence line |
| --- | --- | --- |
| `workflow/specs/ta-ticket-queue.md` | 0.1 | Present: human replied "approved, go with your proposals for Q1–Q4" (2026-11-09) |
| `workflow/tasks/ta-ticket-queue/tasks.md` | 0.1 | Present: "approved the checklist and handoff"; 5-group grouping approved |
| `workflow/tasks/ta-ticket-queue/handoff.md` | 0.1 | Present: "approved the checklist and handoff" |
| `test-coverage-report.md` | with Amendment (DETAIL_KEYS) | Amendment records human approval |

No `design.md` or `proposal.md` exists. Approved tests were committed at
`e3c03bc`, before implementation.

## Scope examined

- Complete diff `git diff e3c03bc..bd51540` (38 files): `server/tickets/*`
  (7 new modules), `server/index.js`, `src/TAQueuePage.*`,
  `src/TATicketPage.*`, `src/TADashboard.tsx`, `src/index.tsx`,
  `src/AppHeader.tsx`, `src/NotificationsRoute.tsx`, both guides, and the
  evidence files.
- Dependent code read for correctness: `server/account/guards.js`
  (`requireActiveActor`, `requireCsrf`), `server/notifications/notify.js`,
  `server/auth/login.js` (body parser, CSRF header), `src/DashboardRouteGuard.tsx`,
  `src/notifications/Notifications.tsx` (`ticketHref`).
- All changed files are within the handoff's allowed list. No new dependency,
  CI, deployment, rules, or index file. No changes to `server/account/`,
  `server/auth/`, `server/notifications/`, or `server/ai/`.

### Test changes made after `e3c03bc`

- `7ae376b` (`test/ta-tickets.api.test.js`): reorders `DETAIL_KEYS` into
  sorted order. Same key set; the comparison and every assertion are
  unchanged. Not weakened. Human-approved per the coverage-report amendment.
- `bf2d1cd` (`test/ta-ticket-queue-emulator.integration.test.js`): +3 lines
  that set seeded TA accounts `ACTIVE` (TA registrations start `INACTIVE`)
  and add a `step` label. No assertion removed or relaxed. Not weakened.

## Checks run

| Check | Result |
| --- | --- |
| Full suite at `bd51540` | 43 suites passed, 4 skipped; 988 tests passed, 4 skipped, 0 failed |
| Full suite with review-only tests | 45 passed, 4 skipped; 1007 passed, 4 skipped, 0 failed |
| Review-only tests alone | 2 suites, 19 tests passed |
| Emulator suite (`demo-codeclinic`, local emulator) | 1/1 passed; emulator shut down; port 8080 free before and after |
| `npm run build` | Compiled successfully |

Exact commands and output are in the execution log.

## Criterion traceability

Implementation locations are under `src/codeclinic/`. "API" is
`test/ta-tickets.api.test.js`; "Store" and "Trans" are the store and
transition unit tests; "Emu" is the emulator test; "Review" is the
review-only files.

| Criterion | Implementation | Tests | Status |
| --- | --- | --- | --- |
| R1 list, filters, sort, page, cursor, allow-list | `ta-routes.js` `parseListQuery`, `toListItem`; `store.js` `listTickets` | API (default, each filter, pagination, bad filter/cursor, allow-list); Store; Emu (filters on Firestore) | Met. See L3 (Firestore cursor edge) and F1 |
| R2 detail allow-list, names, replies ≤200 | `ta-views.js` `toDetailView` | API (allow-list, names/roles, 200 cap, no leak); Review (RESOLVED resolver view) | Met |
| R3 claim | `ta-claims.js`; `store.js` `claimTicket` (transaction) | API (success, 409 per state, race); Emu (race); Review (Firestore re-read) | Met. See L1 |
| R4 unclaim | same | API (holder only, other TA 409, coordinator no extra power); Review | Met |
| R5 reply | `ta-replies.js`; `store.js` `addReply` | API (201, 409 RESOLVED/CLOSED, length, keys, CSRF); Emu; Review | Met |
| R6 resolve | `ta-claims.js`; `store.js` `resolveTicket` | API (trim, 1/2000, 409, later actions 409); Emu; Review (keeps `claimedByTaId`) | Met |
| R7 notifications | `ta-claims.js` `notifyStudent`; `ta-replies.js`; `NotificationsRoute.tsx` `ticketHref` | API (one per action, failing/throwing notify); Emu (documents); TATicketPage test (inbox href) | Met. See L2 |
| R8 UI | `TAQueuePage.tsx`, `TATicketPage.tsx`, `TADashboard.tsx` (D1), `index.tsx`, `server/index.js`, `AppHeader.tsx` | TAQueuePage and TATicketPage tests; Review (look-alike hosts) | Met |
| Scenario 1 default/filters/page | as R1 | API, Emu | Met |
| Scenario 2 student 403, signed-out 401, inactive TA 401 | `ta-routes.js` `requireActiveActor` + `requireTa` | API (every endpoint, role change) | Met |
| Scenario 3 claim race | Firestore transaction in `store.js` | API (in-memory), Emu (real transaction), Review (re-read) | Met |
| Scenario 4 TA B cannot unclaim/resolve | `transitions.js` `holdsClaim` | API, Trans, Review | Met |
| Scenario 5 reply on RESOLVED/CLOSED 409 | `transitions.js` | API, Emu, Review | Met |
| Scenario 6 resolve rules, terminal | `transitions.js`, `ta-claims.js` | API, Trans | Met |
| Scenario 7 forbidden body keys 400, no write | `isEmptyBody`, `parseResolveBody`, `parseReplyBody` | API (12 keys × 4 endpoints, proto) | Met for JSON bodies. See L1 |
| Scenario 8 one notification, failing notify | as R7 | API, Emu | Met |
| Scenario 9 plain text, repoUrl rule | React text rendering; `GITHUB_URL` regex | TATicketPage, TAQueuePage, Review | Met |
| Scenario 10 no email/studentId/other TA ID | explicit allow-lists | API, Review | Met |
| Scenario 11 CSRF on every POST | `requireCsrf` on each `router.post` | API (missing, wrong, other TA's token) | Met |
| Scenario 12 injection-style text no effect | state decided only by `evaluateTransition` | API | Met |

## Findings

| ID | Severity | Location | Issue | Evidence | Recommended action |
| --- | --- | --- | --- | --- | --- |
| L1 | Low | `server/tickets/ta-claims.js` `isEmptyBody` | A claim or unclaim with a non-JSON body (for example `text/plain` or form-encoded `status=RESOLVED`) is accepted and the body ignored. The spec says client values for server-decided fields are "rejected (400), not ignored". | Probe (log step 4): `text/plain` body `{"status":"RESOLVED",...}` → `200`, ticket `CLAIMED`; form `status=RESOLVED` → `200`. The forbidden values are never used, and CSRF is still required, so there is no trust bypass. | Return `400` when a request has a non-empty body that is not parsed JSON (for example, a non-zero `Content-Length` with `req.body` undefined). Add a test. |
| L2 | Low | `ta-claims.js` `action`, `store.js` `reload` (Firestore) | After the transaction commits, the store re-reads the ticket outside the transaction. If that read fails, the client gets `503` for a write that succeeded, and the notification is not sent. | Code reading: `reload` → `getTicket` throws → `safe` → `503`; `notifyStudent` is never reached. | Accept as a residual risk, or build the response and notification from the in-transaction data plus the changes, and treat a failed re-read as non-fatal. |
| L3 | Low | `store.js` `decodeCursor`, Firestore `listTickets` | A crafted cursor with an out-of-range `createdAtMs` (for example `1e20`) or a `ticketId` containing `/` passes `decodeCursor`. The Firestore store then throws, which gives `503` instead of the spec's `400`. The in-memory store is unaffected. | Probe (log step 5): `Timestamp.fromMillis(1e20)` throws; `decodeCursor` accepts `{createdAtMs:1e20, ticketId:'a/b'}`. Generic message only; no data exposure. | In `decodeCursor`, bound `createdAtMs` to the Timestamp range and apply the ticket-ID pattern. Add a unit test. |
| L4 | Low | `server/tickets/ta-replies.js` | `toIsoString` and `TICKET_ID_PATTERN` are duplicated from `ta-views.js` and `ta-claims.js`, and the reply route checks the ID before the body while claim checks the body first. | Code reading. No behavioural defect. | Optional tidy-up: import the shared helper and pattern. |
| F1 | Low (spec clarification) | `ta-routes.js` `toListItem` vs `ta-views.js` `toDetailView` | The list sets `claimed`/`claimedByMe` only while `CLAIMED`. The detail view sets `claimedByMe` whenever `claimedByTaId` is the viewer, so the resolver of a `RESOLVED` ticket sees `claimedByMe: true` in detail but `false` in the list. | Review test "the resolver sees claimedByMe true" passes. | Both behaviours fit the spec text: R1's badge is for "claimed tickets", and R6 keeps `claimedByTaId`, which R2 reflects. No code change required. Ask the spec owner to state the intended rule in the next spec amendment. |

### Judgement on the specific focus areas

- **TA-only enforcement:** `router.use(requireActiveActor, requireTa)` runs
  before every route and sub-router. The role and status are reloaded from
  `users` on each request. A deactivated or role-changed TA gets `401` (tested).
- **CSRF:** `requireCsrf` is on each of the four `POST` routes, and the token
  is bound to the session (another TA's token fails, tested).
- **Body allow-lists:** these are exact for JSON bodies (L1 covers non-JSON
  bodies). `status`, `claimedByTaId`, `authorUserId`, and timestamps are only
  ever set by the server.
- **Transactions:** the Firestore `transition()` reads with `transaction.get`
  and decides from that read (review test with a fake Firestore). The
  emulator race test passes with a real transaction.
- **C2 table:** `transitions.js` matches C2, and `RESOLVED` and `CLOSED` are
  terminal for every event. The `close` event is modelled for
  `student-tickets`, but no endpoint here uses it.
- **Response allow-lists:** list, detail, action, and reply responses are
  built field by field. No email, `studentId`, or user ID is returned
  (tested, plus a review test).
- **Plain text and links:** all content is rendered as React text. There is
  no `dangerouslySetInnerHTML`. The `repoUrl` regex needs `https://github.com/`
  followed by a non-space path, so `github.com.evil.example`, userinfo
  (`github.com@evil`), port tricks, case variants, and `javascript:` are all
  plain text (review tests).
- **Notifications:** sent after commit, wrapped in `try`, with fixed
  templates. The title is passed as data, and `notify` caps it at 300
  characters.
- **D1 routing:** `/ta/queue` and `/ta/tickets/*` go through
  `DashboardRouteGuard accountType="TA"`. A student sees "Access denied", and
  a signed-out user is redirected to `/`. `TADashboard` renders the pages only
  after the guard is ready. The API independently returns `403` or `401`.
  I found no path for a student or signed-out user to reach the pages or the
  data.
- **D4 lazy store:** the first request loads `firebase-admin/firestore`.
  `firebase-admin` is a locked dependency, and the emulator test exercises
  this path through `createServerApp`. If the module were missing, the ticket
  endpoints would fail with `503` instead of the server failing at startup.
  Acceptable; noted in the security review.

## Review-only tests added

- `src/codeclinic/test/ta-ticket-queue.review.test.js` (11 tests):
  - The R2 view of a `RESOLVED` ticket, for the resolver and for another TA.
  - `claimedByMe` in the resolve action's response.
  - No resolver ID in the `RESOLVED` list.
  - The Firestore store with a fake database:
    - A conflict found by the in-transaction read causes no write.
    - Only server-decided fields are written.
    - A non-holder gets `CONFLICT`.
    - Resolve keeps `claimedByTaId`.
    - Replies on terminal tickets are refused.
    - Reply writes happen in one transaction.
- `src/codeclinic/test/ta-ticket-queue.review.test.tsx` (8 tests):
  - Seven look-alike or malformed `repoUrl` values render as plain text.
  - A genuine GitHub URL renders as a safe external link.

No production code or existing test was modified.

## Criteria not verified

- 320-pixel layout: checked only through the approved CSS-source tests. No
  rendered check in a real browser.
- Production Firestore behaviour with composite indexes (Q4, out of scope).
  Filtered production queries will fail until the indexes are approved and
  deployed.
- The shared contract (section C) still needs the Student owner's sign-off.

## Checklist status

No checklist task is found failing. T01–T08 remain `[ ]`. The orchestrator
updates the checklist after the human's decision.

## Re-review (2026-11-09)

Scope: `git diff 38d6f93..ef05784`. This covers fix commit `90effbe`, merge
`6f1cc68`, and `ef05784`, which removes a debug log. The R1 clarification
`1201090` (the spec amendment for F1) is checked against the code. Reviewed
head: `ef05784`; review branch: `ta-ticket-queue-review2`. Log: step 12 of
`logs/tasks/ta-ticket-queue/13-reviewer.md`.

**Updated verdict: pass with follow-up.** L1, L2, L3, and F1 are resolved as
recommended. L4 stays open by the human's choice. There is one new Low
finding (N1).

| ID | Status | Evidence |
| --- | --- | --- |
| L1 | Resolved | `isEmptyBody` in `ta-claims.js` rejects an unparsed body when `Content-Length` > 0 or `Transfer-Encoding` is set. An absent body, a zero-length body, and `{}` are still accepted; the browser's body-less `POST` sends `Content-Length: 0`. No client field is trusted: the headers only cause a rejection. Resolve and reply already rejected these bodies, and new tests cover all four routes. |
| L2 | Resolved | `transition()` builds the ticket and reply from the in-transaction read plus the written changes. The timestamps are reported as the commit-time local clock, while the stored values remain server timestamps. A failed re-read afterwards falls back to that data (`withThread`), so a committed write can no longer return `503`. Notify still runs only after a successful result. The decision is still made inside the transaction, and the emulator race passes. |
| L3 | Resolved | `decodeCursor` is shared by both stores. It bounds `createdAtMs` to the Firestore Timestamp range (years 0001–9999) and requires the ticket-ID pattern. Normal cursors still work (tests), and Firestore auto-IDs match the pattern. |
| F1 | Resolved | `isClaimedByViewer` is shared by `toListItem` and `toDetailView`, and `claimed` is still true only while `CLAIMED`. This matches amended R1 and R2 (tests). |
| L4 | Open (human decision) | Unchanged. |

New finding:

| ID | Severity | Location | Issue | Recommended action |
| --- | --- | --- | --- | --- |
| N1 | Low | `src/TAQueuePage.tsx` line 127 (unchanged) | The badge checks `claimedByMe` before `claimed`. After F1, the resolver of a `RESOLVED` ticket now sees a **Claimed by you** badge in the Resolved filter. R8 describes the badge as "for claimed tickets". | Show the badge only when `claimed` is true (`claimed && claimedByMe`), or confirm with the human that the badge is wanted on resolved tickets. Add a component test. |

Other checks:

- Test integrity: `git diff --stat c49c539..ef05784 -- src/codeclinic/test`
  shows only the new `ta-tickets.review-fixes.test.js`. No approved or
  review-only test was edited.
- Debug log: the `firestore-debug.log` committed in `90effbe` and removed
  in `ef05784` held only emulator startup lines and Java stack traces
  ("Transaction lock timeout" from the race test). It contained no
  credentials, tokens, emails, user or ticket data, or local user paths.
  The file stays in the history of `90effbe`, which is harmless.
- Results:
  - Full suite: 46 suites passed, 4 skipped; 1025 tests passed, 4 skipped,
    0 failed.
  - Emulator suite: 1/1 passed; port 8080 was free before and after.
  - `npm run build`: compiled successfully.
